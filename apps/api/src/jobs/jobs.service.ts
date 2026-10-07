import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AVAILABILITY_CHECK_INTERVAL_DAYS,
  AVAILABILITY_RESPONSE_HOURS,
  PACKS,
  PACK_RENEWAL_REMINDER_DAYS,
  PREMIUM_EARLY_ACCESS_HOURS,
} from '@kle/shared';
import { and, eq, gt, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm';
import { AlertsService } from '../alerts/alerts.service.js';
import { Clock, DAY, HOUR } from '../common/clock.js';
import { DB, type Database } from '../db/db.module.js';
import { listings, packs, tenancies, users, visitRequests } from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RentalsService } from '../rentals/rentals.service.js';
import { VisitsService } from '../visits/visits.service.js';

/**
 * Tâches planifiées (toutes les heures). Chaque méthode prend l'instant présent en paramètre
 * pour être testée sans attendre.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly clock: Clock,
    private readonly notifications: NotificationsService,
    private readonly alerts: AlertsService,
    private readonly visits: VisitsService,
    private readonly rentals: RentalsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async hourly(): Promise<void> {
    const now = this.clock.now();
    const steps: Array<[string, () => Promise<unknown>]> = [
      ['disponibilité', () => this.availabilityChecks(now)],
      ['alertes 24 h', () => this.publicAlerts(now)],
      ['visites expirées', () => this.visits.expireStale(now)],
      ['demandes d’avis', () => this.visits.sendReviewRequests(now)],
      ['frais de réussite', () => this.rentals.processDueFees(now)],
      ['packs', () => this.packLifecycle(now)],
      ['suspensions', () => this.endSuspensions(now)],
    ];
    for (const [name, step] of steps) {
      try {
        const result = await step();
        this.logger.log(`${name} : ${JSON.stringify(result)}`);
      } catch (error) {
        this.logger.error(`${name} : ${String(error)}`);
      }
    }
  }

  /**
   * Tous les 15 jours, Klé demande au publiant si son annonce est toujours disponible ;
   * sans réponse sous 72 h, elle est masquée.
   */
  async availabilityChecks(now: Date) {
    const due = await this.db
      .update(listings)
      .set({ availabilityCheckSentAt: now })
      .where(
        and(
          eq(listings.status, 'published'),
          isNull(listings.availabilityCheckSentAt),
          lt(listings.lastConfirmedAt, new Date(now.getTime() - AVAILABILITY_CHECK_INTERVAL_DAYS * DAY)),
        ),
      )
      .returning({ id: listings.id, ref: listings.ref, publisherId: listings.publisherId });
    for (const listing of due) {
      await this.notifications.notify({
        userId: listing.publisherId,
        kind: 'availability_check',
        title: 'Toujours disponible ?',
        body: `Ton logement ${listing.ref} est-il toujours libre ? Réponds sous 72 h, sinon l’annonce sera masquée.`,
        data: { listingId: listing.id },
        external: ['whatsapp'],
      });
    }
    const hidden = await this.db
      .update(listings)
      .set({ status: 'hidden', hiddenReason: 'unconfirmed', updatedAt: now })
      .where(
        and(
          eq(listings.status, 'published'),
          isNotNull(listings.availabilityCheckSentAt),
          lt(listings.availabilityCheckSentAt, new Date(now.getTime() - AVAILABILITY_RESPONSE_HOURS * HOUR)),
        ),
      )
      .returning({ id: listings.id, ref: listings.ref, publisherId: listings.publisherId });
    for (const listing of hidden) {
      await this.notifications.notify({
        userId: listing.publisherId,
        kind: 'listing_hidden_unconfirmed',
        title: 'Annonce masquée',
        body: `Sans réponse, ${listing.ref} a été masquée. Confirme qu’elle est disponible pour la remettre en ligne.`,
        data: { listingId: listing.id },
      });
    }
    return { asked: due.length, hidden: hidden.length };
  }

  /** Les alertes des autres packs partent une fois la fenêtre Premium de 24 h passée. */
  async publicAlerts(now: Date) {
    const ready = await this.db
      .update(listings)
      .set({ publicAlertsSentAt: now })
      .where(
        and(
          eq(listings.status, 'published'),
          isNull(listings.publicAlertsSentAt),
          lte(listings.publishedAt, new Date(now.getTime() - PREMIUM_EARLY_ACCESS_HOURS * HOUR)),
        ),
      )
      .returning();
    let notified = 0;
    for (const listing of ready) notified += await this.alerts.notifyForListing(listing, 'public');
    return { listings: ready.length, notified };
  }

  /**
   * Rappel 3 jours avant l'expiration avec un bouton de renouvellement ; à l'expiration d'un
   * Premium sans logement trouvé, 15 jours offerts.
   */
  async packLifecycle(now: Date) {
    const reminders = await this.db
      .update(packs)
      .set({ renewalReminderSentAt: now })
      .where(
        and(
          isNull(packs.renewalReminderSentAt),
          isNull(packs.endedReason),
          gt(packs.endsAt, now),
          lt(packs.endsAt, new Date(now.getTime() + PACK_RENEWAL_REMINDER_DAYS * DAY)),
        ),
      )
      .returning();
    for (const pack of reminders) {
      await this.notifications.notify({
        userId: pack.userId,
        kind: 'pack_expiring',
        title: `Ton pack ${PACKS[pack.tier].label} se termine bientôt`,
        body: 'Renouvelle-le pour continuer à contacter les bailleurs.',
        data: { packId: pack.id, tier: pack.tier },
        external: ['whatsapp'],
      });
    }

    const expiredPremium = await this.db
      .select()
      .from(packs)
      .where(
        and(
          eq(packs.tier, 'premium'),
          isNull(packs.endedReason),
          eq(packs.notFoundBonusApplied, false),
          lte(packs.endsAt, now),
          gt(packs.endsAt, new Date(now.getTime() - 2 * DAY)),
        ),
      );
    let extended = 0;
    for (const pack of expiredPremium) {
      const [found] = await this.db
        .select({ id: tenancies.id })
        .from(tenancies)
        .innerJoin(visitRequests, eq(visitRequests.id, tenancies.visitRequestId))
        .where(and(eq(visitRequests.seekerId, pack.userId), gt(tenancies.createdAt, pack.startsAt)))
        .limit(1);
      if (found) continue;
      const bonus = PACKS.premium.notFoundBonusDays;
      await this.db
        .update(packs)
        .set({
          endsAt: sql`${packs.endsAt} + make_interval(days => ${bonus})`,
          bonusDays: sql`${packs.bonusDays} + ${bonus}`,
          notFoundBonusApplied: true,
        })
        .where(eq(packs.id, pack.id));
      await this.notifications.notify({
        userId: pack.userId,
        kind: 'premium_not_found_bonus',
        title: '15 jours offerts',
        body: 'Tu n’as pas encore trouvé : ton pack Premium est prolongé de 15 jours.',
      });
      extended++;
    }
    return { reminders: reminders.length, premiumExtended: extended };
  }

  async endSuspensions(now: Date) {
    const lifted = await this.db
      .update(users)
      .set({ status: 'active', statusReason: null, suspendedUntil: null })
      .where(and(eq(users.status, 'suspended'), isNotNull(users.suspendedUntil), lte(users.suspendedUntil, now)))
      .returning({ id: users.id });
    return { lifted: lifted.length };
  }
}
