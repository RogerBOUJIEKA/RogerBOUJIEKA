import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  SUCCESS_FEE_BLOCK_AFTER_DAYS,
  SUCCESS_FEE_DUE_DAYS,
  addDays,
  computeSuccessFee,
  formatMoney,
  type ConfirmRentalInput,
} from '@kle/shared';
import { and, count, desc, eq, inArray, isNotNull, isNull, lt, ne, sql } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { Clock } from '../common/clock.js';
import { badRequest, forbidden, notFound } from '../common/errors.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import {
  countries,
  cities,
  fraudSignals,
  listings,
  packs,
  sanctions,
  successFees,
  tenancies,
  users,
  visitRequests,
} from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PacksService } from '../packs/packs.service.js';
import { PaymentsService } from '../payments/payments.service.js';

/** Au-delà de ce nombre de logements visités puis loués à d'autres, une alerte de contournement est levée. */
const RENTED_TO_OTHERS_ALERT = 2;

/**
 * Comment Klé est payé sans être sur le terrain : le bailleur marque « Loué » et choisit le
 * locataire parmi les personnes qui l'ont contacté via Klé ; le locataire reçoit la facture.
 * Klé n'est jamais garant ni collecteur des frais pour le bailleur.
 */
@Injectable()
export class RentalsService implements OnModuleInit {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly clock: Clock,
    private readonly packs: PacksService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.payments.onSucceeded('success_fee', (payment, tx) => this.markFeePaid(payment.successFeeId!, payment.id, tx));
  }

  /** Personnes qui ont contacté le bailleur via Klé pour ce logement (à choisir comme locataire). */
  async contacts(user: AuthUser, listingId: string) {
    await this.getOwnedListing(user.id, listingId);
    return this.db
      .select({
        visitRequestId: visitRequests.id,
        seekerId: visitRequests.seekerId,
        fullName: users.fullName,
        status: visitRequests.status,
        slot: visitRequests.slot,
      })
      .from(visitRequests)
      .innerJoin(users, eq(users.id, visitRequests.seekerId))
      .where(and(eq(visitRequests.listingId, listingId), inArray(visitRequests.status, ['accepted', 'validated'])))
      .orderBy(desc(visitRequests.createdAt));
  }

  async confirmRental(user: AuthUser, listingId: string, input: ConfirmRentalInput) {
    const listing = await this.getOwnedListing(user.id, listingId);
    if (!['published', 'hidden', 'removed'].includes(listing.status)) {
      throw forbidden('not_rentable', 'Ce logement ne peut pas être marqué « Loué ».');
    }
    const now = this.clock.now();
    const feeVisitId = input.tenant === 'kle_contact' ? input.visitRequestId : input.referredByVisitRequestId;

    return this.db.transaction(async (tx) => {
      let feeVisit: typeof visitRequests.$inferSelect | undefined;
      if (feeVisitId) {
        [feeVisit] = await tx
          .select()
          .from(visitRequests)
          .where(
            and(
              eq(visitRequests.id, feeVisitId),
              eq(visitRequests.listingId, listingId),
              inArray(visitRequests.status, ['accepted', 'validated']),
            ),
          );
        if (!feeVisit) throw badRequest('unknown_contact', 'Choisis une personne qui t’a contacté via Klé pour ce logement.');
      }
      const rent = input.tenant === 'kle_contact' ? (input.monthlyRent ?? listing.monthlyRent) : listing.monthlyRent;
      const [tenancy] = await tx
        .insert(tenancies)
        .values({
          listingId,
          landlordId: user.id,
          tenantId: input.tenant === 'kle_contact' ? feeVisit!.seekerId : null,
          visitRequestId: feeVisit?.id,
          monthlyRent: rent,
          startDate: now,
          status: feeVisit ? 'pending_fee' : 'active',
          createdAt: now,
        })
        .returning();

      let fee: typeof successFees.$inferSelect | undefined;
      if (feeVisit) {
        const [city] = await tx.select({ countryCode: cities.countryCode }).from(cities).where(eq(cities.id, listing.cityId));
        const [country] = await tx.select().from(countries).where(eq(countries.code, city!.countryCode));
        [fee] = await tx
          .insert(successFees)
          .values({
            tenancyId: tenancy!.id,
            visitRequestId: feeVisit.id,
            listingId,
            payerId: feeVisit.seekerId,
            landlordId: user.id,
            monthlyRent: rent,
            feeBps: country!.successFeeBps,
            amount: computeSuccessFee(rent, country!.successFeeBps),
            currency: listing.currency,
            dueAt: addDays(now, SUCCESS_FEE_DUE_DAYS),
            createdAt: now,
          })
          .returning();
        await tx.update(visitRequests).set({ outcome: 'rented', outcomeAt: now }).where(eq(visitRequests.id, feeVisit.id));
        // Le pack s'arrête dès que l'abonné a trouvé.
        await this.packs.endBecauseFound(feeVisit.seekerId, tx);
        await this.notifications.notify(
          {
            userId: feeVisit.seekerId,
            kind: 'success_fee_invoice',
            title: 'Félicitations pour ton logement !',
            body: `Frais de réussite Klé : ${formatMoney(fee!.amount)}, à régler par Mobile Money sous ${SUCCESS_FEE_DUE_DAYS} jours.`,
            data: { successFeeId: fee!.id },
            external: ['whatsapp'],
          },
          tx,
        );
      }

      await tx.update(listings).set({ status: 'taken', takenAt: now, updatedAt: now }).where(eq(listings.id, listingId));

      // Les autres demandes en cours sont closes ; celles restées sans réponse sont rendues au pack.
      const others = await tx
        .update(visitRequests)
        .set({ status: 'cancelled', respondedAt: now })
        .where(
          and(
            eq(visitRequests.listingId, listingId),
            inArray(visitRequests.status, ['pending', 'accepted']),
            feeVisit ? ne(visitRequests.id, feeVisit.id) : undefined,
          ),
        )
        .returning();
      for (const other of others) {
        // Sans créneau fixé, le bailleur n'avait pas encore répondu : la demande est rendue.
        if (other.packId && !other.slot) {
          await tx
            .update(packs)
            .set({ visitRequestsUsed: sql`greatest(${packs.visitRequestsUsed} - 1, 0)` })
            .where(eq(packs.id, other.packId));
        }
        await this.notifications.notify(
          {
            userId: other.seekerId,
            kind: 'listing_taken',
            title: 'Logement loué',
            body: `Le logement ${listing.ref} vient d’être loué. D’autres t’attendent sur le fil.`,
            data: { listingId },
          },
          tx,
        );
      }

      if (input.tenant === 'outside' && !feeVisit) await this.detectRentedToOthers(listingId, tx);
      return { tenancyId: tenancy!.id, successFee: fee ?? null, status: 'taken' };
    });
  }

  /** Alerte si plusieurs logements visités par un même compte sont loués à d'autres. */
  private async detectRentedToOthers(listingId: string, tx: Tx) {
    const visitors = await tx
      .selectDistinct({ seekerId: visitRequests.seekerId })
      .from(visitRequests)
      .where(and(eq(visitRequests.listingId, listingId), eq(visitRequests.status, 'validated')));
    for (const { seekerId } of visitors) {
      const [row] = await tx
        .select({ n: count() })
        .from(visitRequests)
        .innerJoin(tenancies, eq(tenancies.listingId, visitRequests.listingId))
        .where(
          and(
            eq(visitRequests.seekerId, seekerId),
            eq(visitRequests.status, 'validated'),
            isNull(tenancies.tenantId),
            isNull(tenancies.visitRequestId),
          ),
        );
      if ((row?.n ?? 0) >= RENTED_TO_OTHERS_ALERT) {
        await tx.insert(fraudSignals).values({
          userId: seekerId,
          kind: 'visited_listings_rented_to_others',
          details: { count: row!.n, lastListingId: listingId },
        });
      }
    }
  }

  async myFees(userId: string) {
    return this.db
      .select({
        id: successFees.id,
        amount: successFees.amount,
        currency: successFees.currency,
        monthlyRent: successFees.monthlyRent,
        status: successFees.status,
        dueAt: successFees.dueAt,
        paidAt: successFees.paidAt,
        listingRef: listings.ref,
      })
      .from(successFees)
      .innerJoin(listings, eq(listings.id, successFees.listingId))
      .where(eq(successFees.payerId, userId))
      .orderBy(desc(successFees.createdAt));
  }

  async payFee(user: AuthUser, feeId: string, input: { operator: 'mtn' | 'orange'; payerPhone: string }) {
    const [fee] = await this.db
      .select()
      .from(successFees)
      .where(and(eq(successFees.id, feeId), eq(successFees.payerId, user.id)));
    if (!fee) throw notFound('Facture introuvable.');
    if (!['pending', 'overdue'].includes(fee.status)) throw forbidden('already_paid', 'Cette facture est déjà réglée.');
    return this.payments.initiate({
      userId: user.id,
      purpose: 'success_fee',
      successFeeId: fee.id,
      amount: fee.amount,
      currency: fee.currency,
      operator: input.operator,
      payerPhone: input.payerPhone,
      description: 'Frais de réussite Klé',
    });
  }

  /** Une fois payée, le profil affiche « Locataire en règle » et le compte est débloqué. */
  private async markFeePaid(feeId: string, paymentId: string, tx: Tx) {
    const now = this.clock.now();
    const [fee] = await tx
      .update(successFees)
      .set({ status: 'paid', paidAt: now, paymentId })
      .where(eq(successFees.id, feeId))
      .returning();
    if (!fee) return;
    await tx.update(tenancies).set({ status: 'active' }).where(eq(tenancies.id, fee.tenancyId));
    const [stillUnpaid] = await tx
      .select({ n: count() })
      .from(successFees)
      .where(and(eq(successFees.payerId, fee.payerId), eq(successFees.status, 'overdue'), isNotNull(successFees.blockedAt)));
    if (!stillUnpaid?.n) {
      await tx
        .update(users)
        .set({ status: 'active', statusReason: null })
        .where(and(eq(users.id, fee.payerId), eq(users.status, 'blocked_unpaid')));
      await tx
        .update(sanctions)
        .set({ liftedAt: now })
        .where(and(eq(sanctions.userId, fee.payerId), eq(sanctions.kind, 'blocked_until_paid'), isNull(sanctions.liftedAt)));
    }
    await this.notifications.notify(
      { userId: fee.landlordId, kind: 'tenant_in_good_standing', title: 'Locataire en règle', body: 'Ton locataire a réglé ses frais Klé.' },
      tx,
    );
  }

  /**
   * Échéances : facture en retard après 15 jours ; compte bloqué (contacts et Espace Location)
   * après 30 jours sans paiement, jusqu'au règlement.
   */
  async processDueFees(now = this.clock.now()) {
    const overdue = await this.db
      .update(successFees)
      .set({ status: 'overdue' })
      .where(and(eq(successFees.status, 'pending'), lt(successFees.dueAt, now)))
      .returning();
    for (const fee of overdue) {
      await this.notifications.notify({
        userId: fee.payerId,
        kind: 'success_fee_overdue',
        title: 'Frais de réussite en retard',
        body: `Règle ${formatMoney(fee.amount)} pour éviter le blocage de ton compte.`,
        data: { successFeeId: fee.id },
        external: ['whatsapp'],
      });
    }
    const toBlock = await this.db
      .update(successFees)
      .set({ blockedAt: now })
      .where(
        and(
          eq(successFees.status, 'overdue'),
          isNull(successFees.blockedAt),
          lt(successFees.createdAt, addDays(now, -SUCCESS_FEE_BLOCK_AFTER_DAYS)),
        ),
      )
      .returning();
    for (const fee of toBlock) {
      await this.db
        .update(users)
        .set({ status: 'blocked_unpaid', statusReason: 'success_fee_unpaid' })
        .where(and(eq(users.id, fee.payerId), eq(users.status, 'active')));
      await this.db.insert(sanctions).values({
        userId: fee.payerId,
        infraction: 'success_fee_unpaid',
        kind: 'blocked_until_paid',
        note: `Frais ${fee.id} non réglés après ${SUCCESS_FEE_BLOCK_AFTER_DAYS} jours.`,
        createdAt: now,
      });
    }
    return { overdue: overdue.length, blocked: toBlock.length };
  }

  private async getOwnedListing(userId: string, id: string) {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.publisherId, userId)));
    if (!listing) throw notFound('Annonce introuvable.');
    return listing;
  }
}
