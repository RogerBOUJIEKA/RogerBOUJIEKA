import { Inject, Injectable } from '@nestjs/common';
import {
  PACKS,
  VISIT_CHARTER_REMINDER,
  canViewListing,
  checkVisitEligibility,
  isExactAddressVisible,
  type CreateVisitRequestInput,
  type VisitOutcome,
} from '@kle/shared';
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { Clock, DAY, HOUR } from '../common/clock.js';
import { hmac, safeEqual } from '../common/crypto.js';
import { badRequest, forbidden, notFound } from '../common/errors.js';
import { CONFIG, type AppConfig } from '../config.js';
import { DB, type Database } from '../db/db.module.js';
import {
  conversations,
  districts,
  fraudSignals,
  listingMedia,
  listings,
  messages,
  packs,
  users,
  visitRequests,
} from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PacksService } from '../packs/packs.service.js';
import { ObjectStorage } from '../storage/storage.js';
import { displayName, ProfilesService } from '../users/profiles.service.js';

const HIGHLIGHT_ORDER = sql`case ${visitRequests.highlight} when 'top' then 0 when 'serious_badge' then 1 else 2 end`;
/** Délai après le créneau au-delà duquel le chercheur doit dire comment s'est passée la visite. */
const OUTCOME_GRACE_MS = 2 * HOUR;

type Visit = typeof visitRequests.$inferSelect;

@Injectable()
export class VisitsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly packs: PacksService,
    private readonly notifications: NotificationsService,
    private readonly storage: ObjectStorage,
    private readonly profiles: ProfilesService,
  ) {}

  /**
   * Demande de visite dans l'appli, avec un créneau proposé. Elle décompte une demande du pack,
   * sert de preuve en cas de signalement et rattache les frais de réussite au bon compte.
   */
  async create(user: AuthUser, input: CreateVisitRequestInput) {
    const now = this.clock.now();
    const slot = input.proposedSlot;
    if (slot.getTime() < now.getTime() + HOUR || slot.getTime() > now.getTime() + 30 * DAY) {
      throw badRequest('invalid_slot', 'Propose un créneau entre dans une heure et dans 30 jours.');
    }
    return this.db.transaction(async (tx) => {
      const [listing] = await tx.select().from(listings).where(eq(listings.id, input.listingId));
      if (!listing) throw notFound('Annonce introuvable.');
      // Verrou sur le pack : deux demandes simultanées ne peuvent pas dépasser le quota.
      const active = await this.packs.getActivePack(user.id, tx);
      const [lockedPack] = active ? await tx.select().from(packs).where(eq(packs.id, active.id)).for('update') : [];

      const mine = await tx
        .select()
        .from(visitRequests)
        .where(and(eq(visitRequests.seekerId, user.id), inArray(visitRequests.status, ['pending', 'accepted', 'validated'])));
      const slotOf = (v: Visit) => (v.slot ?? v.proposedSlot).getTime();
      const scheduled = mine.filter((v) => ['pending', 'accepted'].includes(v.status) && slotOf(v) > now.getTime());
      const awaitingOutcome = mine.filter(
        (v) =>
          ['accepted', 'validated'].includes(v.status) &&
          !v.outcome &&
          slotOf(v) + OUTCOME_GRACE_MS < now.getTime(),
      );

      const eligibility = checkVisitEligibility({
        accountStatus: user.status,
        kycApproved: user.kycStatus === 'approved',
        hasActivePack: !!lockedPack,
        requestsRemaining: lockedPack ? lockedPack.visitRequestsTotal - lockedPack.visitRequestsUsed : 0,
        scheduledVisits: scheduled.length,
        visitsAwaitingOutcome: awaitingOutcome.length,
        isOwnListing: listing.publisherId === user.id,
        alreadyRequested: mine.some((v) => v.listingId === listing.id),
        listingVisible:
          listing.status === 'published' &&
          !!listing.publishedAt &&
          canViewListing({
            category: listing.category,
            publishedAt: listing.publishedAt,
            viewerTier: lockedPack?.tier ?? null,
            now,
          }),
      });
      if (!eligibility.ok) throw forbidden(eligibility.reason, eligibility.message);

      const [visit] = await tx
        .insert(visitRequests)
        .values({
          listingId: listing.id,
          seekerId: user.id,
          landlordId: listing.publisherId,
          packId: lockedPack!.id,
          proposedSlot: slot,
          message: input.message,
          highlight: PACKS[lockedPack!.tier].landlordHighlight,
          createdAt: now,
        })
        .returning();
      await tx
        .update(packs)
        .set({ visitRequestsUsed: sql`${packs.visitRequestsUsed} + 1` })
        .where(eq(packs.id, lockedPack!.id));
      const [conversation] = await tx
        .insert(conversations)
        .values({ visitRequestId: visit!.id, seekerId: user.id, landlordId: listing.publisherId, createdAt: now })
        .returning();
      if (input.message) {
        await tx.insert(messages).values({ conversationId: conversation!.id, senderId: user.id, body: input.message, createdAt: now });
        await tx.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversation!.id));
      }
      await this.notifications.notify(
        {
          userId: listing.publisherId,
          kind: 'visit_requested',
          title: 'Nouvelle demande de visite',
          body: `${user.fullName ?? 'Un chercheur vérifié'} souhaite visiter ${listing.ref}. Accepte ou refuse dans l’appli.`,
          data: { visitRequestId: visit!.id, listingId: listing.id },
          external: ['whatsapp'],
        },
        tx,
      );
      return { ...visit!, conversationId: conversation!.id, charterReminder: VISIT_CHARTER_REMINDER };
    });
  }

  async list(user: AuthUser, as: 'seeker' | 'landlord') {
    const column = as === 'seeker' ? visitRequests.seekerId : visitRequests.landlordId;
    const rows = await this.db
      .select({ visit: visitRequests, listing: listings, districtName: districts.name, conversationId: conversations.id })
      .from(visitRequests)
      .innerJoin(listings, eq(listings.id, visitRequests.listingId))
      .innerJoin(districts, eq(districts.id, listings.districtId))
      .leftJoin(conversations, eq(conversations.visitRequestId, visitRequests.id))
      .where(eq(column, user.id))
      .orderBy(...(as === 'landlord' ? [HIGHLIGHT_ORDER, desc(visitRequests.createdAt)] : [desc(visitRequests.createdAt)]))
      .limit(200);
    const counterpartIds = rows.map((r) => (as === 'seeker' ? r.visit.landlordId : r.visit.seekerId));
    const people = counterpartIds.length
      ? await this.db
          .select({ id: users.id, fullName: users.fullName, verifiedPhotoKey: users.verifiedPhotoKey })
          .from(users)
          .where(inArray(users.id, counterpartIds))
      : [];
    const peopleBy = new Map(people.map((p) => [p.id, p]));
    const stats = await this.profiles.statsFor(counterpartIds);
    const thumbs = rows.length
      ? await this.db
          .selectDistinctOn([listingMedia.listingId], { listingId: listingMedia.listingId, url: listingMedia.thumbnailUrl })
          .from(listingMedia)
          .where(and(inArray(listingMedia.listingId, rows.map((r) => r.listing.id)), eq(listingMedia.status, 'ready')))
          .orderBy(listingMedia.listingId, asc(listingMedia.position))
      : [];
    const thumbBy = new Map(thumbs.map((t) => [t.listingId, t.url]));
    const now = this.clock.now();
    return Promise.all(
      rows.map(async ({ visit, listing, districtName, conversationId }) => {
        const otherId = as === 'seeker' ? visit.landlordId : visit.seekerId;
        const other = peopleBy.get(otherId);
        return {
          id: visit.id,
          status: visit.status,
          proposedSlot: visit.proposedSlot,
          slot: visit.slot,
          outcome: visit.outcome,
          highlight: visit.highlight,
          createdAt: visit.createdAt,
          conversationId,
          listing: {
            id: listing.id,
            ref: listing.ref,
            type: listing.type,
            monthlyRent: listing.monthlyRent,
            districtName,
            thumbnailUrl: thumbBy.get(listing.id) ?? null,
          },
          exactAddress:
            as === 'seeker' && isExactAddressVisible(visit.status, visit.slot ?? visit.proposedSlot, now)
              ? listing.exactAddress
              : null,
          // Le bailleur voit le nom et la photo vérifiés du chercheur ; jamais son numéro.
          counterpart: {
            id: otherId,
            name: as === 'landlord' ? (other?.fullName ?? 'Chercheur vérifié') : displayName(other?.fullName ?? null),
            photoUrl:
              as === 'landlord' && other?.verifiedPhotoKey
                ? await this.storage.createDownloadUrl(other.verifiedPhotoKey, 600)
                : null,
            averageRating: stats.get(otherId)?.averageRating ?? null,
            verified: stats.get(otherId)?.verified ?? false,
          },
        };
      }),
    );
  }

  async respond(user: AuthUser, id: string, input: { decision: 'accept' | 'refuse'; slot?: Date; reason?: string }) {
    const visit = await this.getAs(user.id, id, 'landlord');
    if (visit.status !== 'pending') throw forbidden('not_pending', 'Cette demande a déjà reçu une réponse.');
    const now = this.clock.now();
    if (input.decision === 'refuse') {
      await this.db
        .update(visitRequests)
        .set({ status: 'refused', refusalReason: input.reason, respondedAt: now })
        .where(eq(visitRequests.id, id));
      await this.notifications.notify({
        userId: visit.seekerId,
        kind: 'visit_refused',
        title: 'Visite refusée',
        body: 'Le bailleur ne peut pas te recevoir pour ce logement. Continue ta recherche sur le fil.',
        data: { visitRequestId: id },
      });
      return { status: 'refused' };
    }
    const slot = input.slot ?? visit.proposedSlot;
    if (slot.getTime() < now.getTime()) throw badRequest('invalid_slot', 'Le créneau est déjà passé : propose-en un autre.');
    await this.db
      .update(visitRequests)
      .set({ status: 'accepted', slot, respondedAt: now })
      .where(eq(visitRequests.id, id));
    await this.notifications.notify({
      userId: visit.seekerId,
      kind: 'visit_accepted',
      title: 'Visite acceptée',
      body: `Rendez-vous le ${slot.toLocaleString('fr-FR', { timeZone: 'Africa/Douala', dateStyle: 'full', timeStyle: 'short' })}. L’adresse exacte est dans l’appli. ${VISIT_CHARTER_REMINDER}`,
      data: { visitRequestId: id },
      external: ['whatsapp'],
    });
    return { status: 'accepted', slot };
  }

  async get(user: AuthUser, id: string) {
    const [visit] = await this.db
      .select()
      .from(visitRequests)
      .where(and(eq(visitRequests.id, id), or(eq(visitRequests.seekerId, user.id), eq(visitRequests.landlordId, user.id))));
    if (!visit) throw notFound('Demande introuvable.');
    const [listing] = await this.db.select().from(listings).where(eq(listings.id, visit.listingId));
    const isSeeker = visit.seekerId === user.id;
    return {
      ...visit,
      listingRef: listing!.ref,
      exactAddress:
        isSeeker && isExactAddressVisible(visit.status, visit.slot ?? visit.proposedSlot, this.clock.now())
          ? listing!.exactAddress
          : null,
      exactLocation:
        isSeeker && isExactAddressVisible(visit.status, visit.slot ?? visit.proposedSlot, this.clock.now())
          ? { latitude: listing!.location.y, longitude: listing!.location.x }
          : null,
      charterReminder: VISIT_CHARTER_REMINDER,
    };
  }

  /** QR code de visite, montré sur place par le chercheur. */
  async qrCode(user: AuthUser, id: string) {
    const visit = await this.getAs(user.id, id, 'seeker');
    if (visit.status !== 'accepted') throw forbidden('not_accepted', 'Le QR code est disponible une fois la visite acceptée.');
    return { qrToken: this.qrToken(id) };
  }

  /** Le bailleur scanne le QR code et voit la photo vérifiée du visiteur. */
  async scan(user: AuthUser, qrToken: string) {
    const visit = await this.visitFromToken(user.id, qrToken);
    const [seeker] = await this.db
      .select({ fullName: users.fullName, verifiedPhotoKey: users.verifiedPhotoKey })
      .from(users)
      .where(eq(users.id, visit.seekerId));
    return {
      visitRequestId: visit.id,
      slot: visit.slot,
      seeker: {
        fullName: seeker?.fullName,
        photoUrl: seeker?.verifiedPhotoKey ? await this.storage.createDownloadUrl(seeker.verifiedPhotoKey, 600) : null,
      },
      question: 'La personne devant toi est-elle bien celle de la photo ? Si ce n’est pas la même personne, refuse.',
    };
  }

  /**
   * Visite validée par QR code : l'annonce monte dans le fil. Si ce n'est pas la même personne,
   * la visite est refusée et le compte du chercheur signalé.
   */
  async validate(user: AuthUser, id: string, input: { qrToken: string; samePerson: boolean }) {
    const visit = await this.visitFromToken(user.id, input.qrToken);
    if (visit.id !== id) throw forbidden('invalid_qr', 'QR code invalide pour cette visite.');
    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      if (!input.samePerson) {
        await tx
          .update(visitRequests)
          .set({ status: 'refused', refusalReason: 'identity_mismatch', respondedAt: now })
          .where(eq(visitRequests.id, id));
        await tx.insert(fraudSignals).values({
          userId: visit.seekerId,
          kind: 'identity_mismatch_at_visit',
          details: { visitRequestId: id, listingId: visit.listingId },
        });
        return { status: 'refused' };
      }
      await tx.update(visitRequests).set({ status: 'validated', validatedAt: now }).where(eq(visitRequests.id, id));
      await tx
        .update(listings)
        .set({ validatedVisits: sql`${listings.validatedVisits} + 1` })
        .where(eq(listings.id, visit.listingId));
      return { status: 'validated' };
    });
  }

  async recordOutcome(user: AuthUser, id: string, outcome: VisitOutcome) {
    const visit = await this.getAs(user.id, id, 'seeker');
    if (!['accepted', 'validated'].includes(visit.status)) {
      throw forbidden('no_visit', 'Aucune visite à commenter pour cette demande.');
    }
    if (outcome === 'rented') throw badRequest('rented_by_landlord', 'C’est le bailleur qui confirme la location.');
    await this.db
      .update(visitRequests)
      .set({ outcome, outcomeAt: this.clock.now() })
      .where(eq(visitRequests.id, id));
    return { outcome };
  }

  async cancel(user: AuthUser, id: string) {
    const [visit] = await this.db
      .select()
      .from(visitRequests)
      .where(and(eq(visitRequests.id, id), or(eq(visitRequests.seekerId, user.id), eq(visitRequests.landlordId, user.id))));
    if (!visit) throw notFound('Demande introuvable.');
    if (!['pending', 'accepted'].includes(visit.status)) throw forbidden('not_cancellable', 'Cette visite ne peut plus être annulée.');
    await this.db.update(visitRequests).set({ status: 'cancelled', respondedAt: this.clock.now() }).where(eq(visitRequests.id, id));
    await this.notifications.notify({
      userId: user.id === visit.seekerId ? visit.landlordId : visit.seekerId,
      kind: 'visit_cancelled',
      title: 'Visite annulée',
      body: 'La visite prévue a été annulée.',
      data: { visitRequestId: id },
    });
    return { status: 'cancelled' };
  }

  /** Demandes restées sans réponse après le créneau : expirées, et la demande est rendue au pack. */
  async expireStale(now = this.clock.now()) {
    const stale = await this.db
      .update(visitRequests)
      .set({ status: 'expired' })
      .where(and(eq(visitRequests.status, 'pending'), lt(visitRequests.proposedSlot, now)))
      .returning({ packId: visitRequests.packId });
    for (const { packId } of stale) {
      if (packId) {
        await this.db
          .update(packs)
          .set({ visitRequestsUsed: sql`greatest(${packs.visitRequestsUsed} - 1, 0)` })
          .where(eq(packs.id, packId));
      }
    }
    return stale.length;
  }

  /** La demande d'avis part 7 jours après le contact, vers les deux parties. */
  async sendReviewRequests(now = this.clock.now()) {
    const due = await this.db
      .update(visitRequests)
      .set({ reviewRequestSentAt: now })
      .where(
        and(
          inArray(visitRequests.status, ['accepted', 'validated']),
          isNull(visitRequests.reviewRequestSentAt),
          lt(visitRequests.createdAt, new Date(now.getTime() - 7 * DAY)),
        ),
      )
      .returning();
    for (const visit of due) {
      for (const userId of [visit.seekerId, visit.landlordId]) {
        await this.notifications.notify({
          userId,
          kind: 'review_request',
          title: 'Donne ton avis',
          body: 'Comment s’est passé ton échange via Klé ? Ton avis aide toute la communauté.',
          data: { visitRequestId: visit.id },
        });
      }
    }
    return due.length;
  }

  private qrToken(visitId: string): string {
    return `${visitId}.${hmac(this.config.APP_SECRET, `visit-qr:${visitId}`)}`;
  }

  private async visitFromToken(landlordId: string, token: string): Promise<Visit> {
    const [visitId, signature] = token.split('.');
    if (!visitId || !signature || !safeEqual(this.qrToken(visitId), token)) {
      throw forbidden('invalid_qr', 'QR code invalide.');
    }
    const visit = await this.getAs(landlordId, visitId, 'landlord');
    if (visit.status !== 'accepted') throw forbidden('invalid_qr', 'Cette visite n’est pas en attente de validation.');
    return visit;
  }

  private async getAs(userId: string, id: string, as: 'seeker' | 'landlord'): Promise<Visit> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Demande introuvable.');
    const column = as === 'seeker' ? visitRequests.seekerId : visitRequests.landlordId;
    const [visit] = await this.db.select().from(visitRequests).where(and(eq(visitRequests.id, id), eq(column, userId)));
    if (!visit) throw notFound('Demande introuvable.');
    return visit;
  }
}
