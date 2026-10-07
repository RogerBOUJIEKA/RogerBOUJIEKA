import { Inject, Injectable } from '@nestjs/common';
import {
  PACKS,
  canCreateAlert,
  formatMoney,
  type CreateAlertInput,
  type PackTier,
} from '@kle/shared';
import { and, count, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { Clock } from '../common/clock.js';
import { forbidden, notFound } from '../common/errors.js';
import { CONFIG, type AppConfig } from '../config.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { alerts, districts, listings, packs, users } from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PacksService } from '../packs/packs.service.js';

type Listing = typeof listings.$inferSelect;

/**
 * Alertes : chaque nouvelle annonce correspondante déclenche une notification dans l'appli ;
 * selon le pack, elle arrive aussi sur WhatsApp. Le Premium est prévenu 24 h avant les autres.
 */
@Injectable()
export class AlertsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly packs: PacksService,
    private readonly notifications: NotificationsService,
    private readonly clock: Clock,
  ) {}

  async list(userId: string) {
    return this.db.select().from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.active, true)));
  }

  async create(user: AuthUser, input: CreateAlertInput) {
    const pack = await this.packs.getActivePack(user.id);
    const [existing] = await this.db
      .select({ n: count() })
      .from(alerts)
      .where(and(eq(alerts.userId, user.id), eq(alerts.active, true)));
    if (!canCreateAlert(pack?.tier ?? null, existing?.n ?? 0)) {
      throw forbidden(
        pack ? 'alert_limit_reached' : 'pack_required',
        pack
          ? `Ton pack ${PACKS[pack.tier].label} permet ${PACKS[pack.tier].maxAlerts} alerte(s). Passe au pack supérieur pour en ajouter.`
          : 'Choisis un pack pour créer une alerte.',
      );
    }
    const [created] = await this.db
      .insert(alerts)
      .values({ ...input, userId: user.id, createdAt: this.clock.now() })
      .returning();
    return created;
  }

  async remove(userId: string, id: string) {
    const [updated] = await this.db
      .update(alerts)
      .set({ active: false })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning({ id: alerts.id });
    if (!updated) throw notFound('Alerte introuvable.');
    return { removed: true };
  }

  /**
   * `early` : à la publication, seuls les Premium (annonces et « Bientôt disponible »).
   * `public` : 24 h plus tard, les autres packs qui ont accès à l'annonce.
   */
  async notifyForListing(listing: Listing, audience: 'early' | 'public', tx: Tx = this.db) {
    const now = this.clock.now();
    const tiers: PackTier[] =
      audience === 'early'
        ? ['premium']
        : listing.category === 'coming_soon'
          ? ['confort']
          : ['essentiel', 'confort'];
    const matches = await tx
      .selectDistinctOn([alerts.userId], { alertId: alerts.id, userId: alerts.userId, tier: packs.tier })
      .from(alerts)
      .innerJoin(users, eq(users.id, alerts.userId))
      .innerJoin(
        packs,
        and(eq(packs.userId, alerts.userId), lte(packs.startsAt, now), gt(packs.endsAt, now), isNull(packs.endedReason)),
      )
      .where(
        and(
          eq(alerts.active, true),
          eq(alerts.cityId, listing.cityId),
          sql`${alerts.maxRent} >= ${listing.monthlyRent}`,
          sql`(${alerts.minRent} is null or ${alerts.minRent} <= ${listing.monthlyRent})`,
          sql`(${alerts.type} is null or ${alerts.type} = ${listing.type})`,
          sql`(cardinality(${alerts.districtIds}) = 0 or ${listing.districtId} = any(${alerts.districtIds}))`,
          inArray(packs.tier, tiers),
          eq(users.status, 'active'),
          sql`${alerts.userId} <> ${listing.publisherId}`,
        ),
      );
    if (!matches.length) return 0;
    const [district] = await tx.select({ name: districts.name }).from(districts).where(eq(districts.id, listing.districtId));
    for (const match of matches) {
      const channels = PACKS[match.tier].alertChannels.filter((c) => c !== 'in_app') as Array<'whatsapp'>;
      await this.notifications.notify(
        {
          userId: match.userId,
          kind: 'alert_match',
          title: listing.category === 'coming_soon' ? 'Bientôt disponible près de chez toi' : 'Nouveau logement pour toi',
          body: `${district?.name ?? ''} · ${formatMoney(listing.monthlyRent)} / mois · ${this.config.WEB_URL}/annonce/${listing.ref}`,
          data: { listingId: listing.id, ref: listing.ref },
          external: channels,
        },
        tx,
      );
      await tx.update(alerts).set({ lastNotifiedAt: now }).where(eq(alerts.id, match.alertId));
    }
    return matches.length;
  }
}
