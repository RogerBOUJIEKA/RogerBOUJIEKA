import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  PACKS,
  PACK_TIERS,
  REFERRAL_BONUS_DAYS,
  addDays,
  computePackPeriod,
  namesMatch,
  type PackTier,
} from '@kle/shared';
import { and, count, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { Clock } from '../common/clock.js';
import { forbidden, notFound } from '../common/errors.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { countries, fraudSignals, kycVerifications, packs, users } from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PaymentsService, type Payment } from '../payments/payments.service.js';

export type Pack = typeof packs.$inferSelect;

@Injectable()
export class PacksService implements OnModuleInit {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.payments.onSucceeded('pack', (payment, tx) => this.activate(payment, tx));
  }

  /** Écran des packs : prix du pays et avantages. Le Confort est affiché comme « le plus choisi ». */
  async catalog(countryCode = 'CM') {
    const [country] = await this.db.select().from(countries).where(eq(countries.code, countryCode));
    if (!country) throw notFound('Pays inconnu.');
    return {
      country: country.code,
      currency: country.currency,
      successFeePercent: country.successFeeBps / 100,
      packs: PACK_TIERS.map((tier) => ({ ...PACKS[tier], price: country.packPrices[tier] })),
    };
  }

  async getActivePack(userId: string, tx: Tx = this.db): Promise<Pack | null> {
    const now = this.clock.now();
    const [pack] = await tx
      .select()
      .from(packs)
      .where(
        and(eq(packs.userId, userId), lte(packs.startsAt, now), gt(packs.endsAt, now), isNull(packs.endedReason)),
      )
      .orderBy(desc(packs.startsAt))
      .limit(1);
    return pack ?? null;
  }

  async history(userId: string) {
    return this.db.select().from(packs).where(eq(packs.userId, userId)).orderBy(desc(packs.startsAt));
  }

  async purchase(user: AuthUser, input: { tier: PackTier; operator: 'mtn' | 'orange'; payerPhone: string }) {
    if (user.status !== 'active') {
      throw forbidden('account_not_active', 'Ton compte ne peut pas acheter de pack pour le moment.');
    }
    if (user.kycStatus === 'none' || user.kycStatus === 'rejected') {
      throw forbidden('kyc_required', 'Vérifie ton identité avant de choisir un pack.');
    }
    const catalog = await this.catalog('CM');
    const price = catalog.packs.find((p) => p.tier === input.tier)!.price;
    return this.payments.initiate({
      userId: user.id,
      purpose: 'pack',
      packTier: input.tier,
      amount: price,
      currency: catalog.currency,
      operator: input.operator,
      payerPhone: input.payerPhone,
      description: `Pack ${PACKS[input.tier].label} Klé — 30 jours`,
    });
  }

  /** Paiement confirmé : le pack démarre (ou prolonge le pack en cours). */
  private async activate(payment: Payment, tx: Tx): Promise<void> {
    const tier = payment.packTier!;
    const now = this.clock.now();
    const current = await this.getActivePack(payment.userId, tx);
    const period = computePackPeriod(tier, now, current);
    if (current && period.replacesCurrent) {
      await tx.update(packs).set({ endsAt: now, endedReason: 'superseded' }).where(eq(packs.id, current.id));
    }
    const [user] = await tx.select().from(users).where(eq(users.id, payment.userId)).for('update');
    const credit = user!.bonusDaysCredit;
    const [previousPacks] = await tx.select({ n: count() }).from(packs).where(eq(packs.userId, payment.userId));
    await tx.insert(packs).values({
      userId: payment.userId,
      tier,
      countryCode: 'CM',
      price: payment.amount,
      startsAt: period.startsAt,
      endsAt: addDays(period.endsAt, credit),
      bonusDays: credit,
      visitRequestsTotal: PACKS[tier].visitRequests,
      paymentId: payment.id,
      createdAt: now,
    });
    if (credit) await tx.update(users).set({ bonusDaysCredit: 0 }).where(eq(users.id, payment.userId));

    // Le nom du compte Mobile Money est comparé à celui de la pièce d'identité.
    const [kyc] = await tx
      .select({ declaredName: kycVerifications.declaredName })
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, payment.userId))
      .orderBy(desc(kycVerifications.createdAt))
      .limit(1);
    if (payment.payerName && kyc && !namesMatch(payment.payerName, kyc.declaredName)) {
      await tx.insert(fraudSignals).values({
        userId: payment.userId,
        kind: 'payer_name_mismatch',
        details: { payerName: payment.payerName, declaredName: kyc.declaredName, paymentId: payment.id },
      });
    }

    // Parrainage : 7 jours offerts au parrain pour chaque ami qui achète un pack.
    if (user!.referredById && (previousPacks?.n ?? 0) === 0) {
      await this.grantDays(user!.referredById, REFERRAL_BONUS_DAYS, tx);
      await this.notifications.notify(
        {
          userId: user!.referredById,
          kind: 'referral_bonus',
          title: '7 jours offerts',
          body: 'Un ami que tu as invité vient de prendre un pack. Merci !',
        },
        tx,
      );
    }
    await this.notifications.notify(
      {
        userId: payment.userId,
        kind: 'pack_activated',
        title: `Pack ${PACKS[tier].label} activé`,
        body: `Tu peux contacter jusqu’à ${PACKS[tier].visitRequests} bailleurs. Visite gratuite : ne paie rien avant d’avoir vu le logement.`,
      },
      tx,
    );
  }

  /** Ajoute des jours au pack actif, ou les garde en crédit pour le prochain pack. */
  async grantDays(userId: string, days: number, tx: Tx = this.db): Promise<void> {
    const active = await this.getActivePack(userId, tx);
    if (active) {
      await tx
        .update(packs)
        .set({
          endsAt: sql`${packs.endsAt} + make_interval(days => ${days})`,
          bonusDays: sql`${packs.bonusDays} + ${days}`,
        })
        .where(eq(packs.id, active.id));
    } else {
      await tx
        .update(users)
        .set({ bonusDaysCredit: sql`${users.bonusDaysCredit} + ${days}` })
        .where(eq(users.id, userId));
    }
  }

  /** Le pack s'arrête dès que l'abonné a trouvé un logement. */
  async endBecauseFound(userId: string, tx: Tx = this.db): Promise<void> {
    const active = await this.getActivePack(userId, tx);
    if (active) {
      await tx
        .update(packs)
        .set({ endsAt: this.clock.now(), endedReason: 'found' })
        .where(eq(packs.id, active.id));
    }
  }
}
