import { Inject, Injectable } from '@nestjs/common';
import { MODERATION_SLA_HOURS, PHASE0_GOALS, type Infraction, type PackTier } from '@kle/shared';
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, or, sql, sum } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.decorators.js';
import { AmbassadorsService } from '../ambassadors/ambassadors.service.js';
import { AuditService } from '../common/audit.service.js';
import { Clock, DAY, HOUR } from '../common/clock.js';
import { badRequest, conflict, notFound } from '../common/errors.js';
import { CONFIG, type AppConfig } from '../config.js';
import { DB, type Database } from '../db/db.module.js';
import { seedStaff } from '../db/seed.js';
import {
  auditLogs,
  cities,
  countries,
  devices,
  districts,
  fraudSignals,
  kycVerifications,
  listingMedia,
  listings,
  messages,
  conversations,
  ownershipProofs,
  packs,
  payments,
  reports,
  sanctions,
  successFees,
  tenancies,
  users,
  visitRequests,
  waitlistEntries,
} from '../db/schema.js';
import { ListingsService } from '../listings/listings.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ReportsService } from '../reports/reports.service.js';
import { ObjectStorage } from '../storage/storage.js';
import { isBannedIdentity } from '../users/identity.js';

/** Fuseau du Cameroun (UTC+1, sans heure d'été) pour les compteurs « du jour » et « du mois ». */
const WAT_OFFSET = HOUR;

function startOfDay(now: Date): Date {
  const local = now.getTime() + WAT_OFFSET;
  return new Date(Math.floor(local / DAY) * DAY - WAT_OFFSET);
}

function startOfMonth(now: Date): Date {
  const local = new Date(now.getTime() + WAT_OFFSET);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - WAT_OFFSET);
}

/**
 * Back-office : l'équipe travaille à distance depuis un seul outil web, organisé en files
 * d'attente. Chaque action est journalisée.
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly audit: AuditService,
    private readonly storage: ObjectStorage,
    private readonly notifications: NotificationsService,
    private readonly listings: ListingsService,
    private readonly reports: ReportsService,
    private readonly ambassadors: AmbassadorsService,
  ) {}

  // ─── Tableau de bord ───────────────────────────────────────────────────────

  async dashboard() {
    const now = this.clock.now();
    const today = startOfDay(now);
    const month = startOfMonth(now);
    const last30 = new Date(now.getTime() - 30 * DAY);
    const one = async <T>(query: Promise<T[]>) => (await query)[0];

    const [
      signupsToday,
      kycDecidedToday,
      kycPending,
      oldestKyc,
      packsByTier,
      revenue,
      listingsByCity,
      visits30,
      validated30,
      rentedViaKle,
      openReports,
      openFraud,
      pendingListings,
      fees,
      kycDelay,
      waitlist,
      sharesAndListings,
      reports30,
    ] = await Promise.all([
      one(this.db.select({ n: count() }).from(users).where(gte(users.createdAt, today))),
      one(this.db.select({ n: count() }).from(kycVerifications).where(gte(kycVerifications.decidedAt, today))),
      one(this.db.select({ n: count() }).from(kycVerifications).where(eq(kycVerifications.status, 'pending'))),
      one(
        this.db
          .select({ createdAt: kycVerifications.createdAt })
          .from(kycVerifications)
          .where(eq(kycVerifications.status, 'pending'))
          .orderBy(asc(kycVerifications.createdAt))
          .limit(1),
      ),
      this.db
        .select({ tier: packs.tier, n: count() })
        .from(packs)
        .where(and(sql`${packs.startsAt} <= ${now}`, sql`${packs.endsAt} > ${now}`, sql`${packs.endedReason} is null`))
        .groupBy(packs.tier),
      this.db
        .select({ purpose: payments.purpose, total: sum(payments.amount) })
        .from(payments)
        .where(and(eq(payments.status, 'succeeded'), gte(payments.paidAt, month)))
        .groupBy(payments.purpose),
      this.db
        .select({ city: cities.name, n: count() })
        .from(listings)
        .innerJoin(cities, eq(cities.id, listings.cityId))
        .where(eq(listings.status, 'published'))
        .groupBy(cities.name),
      one(this.db.select({ n: count() }).from(visitRequests).where(gte(visitRequests.createdAt, last30))),
      one(this.db.select({ n: count() }).from(visitRequests).where(gte(visitRequests.validatedAt, last30))),
      one(this.db.select({ n: count() }).from(tenancies).where(and(isNotNull(tenancies.visitRequestId), gte(tenancies.createdAt, last30)))),
      one(this.db.select({ n: count() }).from(reports).where(eq(reports.status, 'open'))),
      one(this.db.select({ n: count() }).from(fraudSignals).where(eq(fraudSignals.status, 'open'))),
      one(this.db.select({ n: count() }).from(listings).where(or(eq(listings.status, 'pending_review'), and(eq(listings.status, 'published'), eq(listings.needsPostReview, true))))),
      this.db.select({ status: successFees.status, n: count(), total: sum(successFees.amount) }).from(successFees).groupBy(successFees.status),
      one(
        this.db
          .select({ hours: sql<number>`avg(extract(epoch from (${kycVerifications.decidedAt} - ${kycVerifications.createdAt})) / 3600)` })
          .from(kycVerifications)
          .where(gte(kycVerifications.decidedAt, last30)),
      ),
      this.db.select({ role: waitlistEntries.role, n: count() }).from(waitlistEntries).groupBy(waitlistEntries.role),
      one(
        this.db
          .select({ shares: sum(listings.sharesCount), n: count() })
          .from(listings)
          .where(inArray(listings.status, ['published', 'taken'])),
      ),
      one(this.db.select({ n: count() }).from(reports).where(gte(reports.createdAt, last30))),
    ]);

    const feeBy = Object.fromEntries(fees.map((f) => [f.status, { n: f.n, total: Number(f.total ?? 0) }]));
    const paidFees = feeBy.paid?.n ?? 0;
    const dueFees = paidFees + (feeBy.overdue?.n ?? 0);
    const activeListings = listingsByCity.reduce((s, r) => s + r.n, 0);
    const waitlistBy = Object.fromEntries(waitlist.map((w) => [w.role, w.n])) as Record<string, number>;
    return {
      today: { signups: signupsToday?.n ?? 0, kycDecided: kycDecidedToday?.n ?? 0 },
      queues: {
        kycPending: kycPending?.n ?? 0,
        oldestKycHours: oldestKyc ? Math.round((now.getTime() - oldestKyc.createdAt.getTime()) / HOUR) : null,
        listingsPending: pendingListings?.n ?? 0,
        reportsOpen: openReports?.n ?? 0,
        fraudOpen: openFraud?.n ?? 0,
      },
      activePacks: Object.fromEntries(packsByTier.map((p) => [p.tier, p.n])) as Partial<Record<PackTier, number>>,
      revenueThisMonth: Object.fromEntries(revenue.map((r) => [r.purpose, Number(r.total ?? 0)])),
      activeListingsByCity: listingsByCity,
      indicators: {
        activeListings,
        averageKycHours: kycDelay?.hours ? Math.round(Number(kycDelay.hours) * 10) / 10 : null,
        visitRequests30d: visits30?.n ?? 0,
        validatedVisits30d: validated30?.n ?? 0,
        contactsPerListing30d: activeListings ? Math.round(((visits30?.n ?? 0) / activeListings) * 10) / 10 : null,
        rentedViaKle30d: rentedViaKle?.n ?? 0,
        reportsPer100Listings30d: activeListings ? Math.round(((reports30?.n ?? 0) / activeListings) * 1000) / 10 : null,
        whatsappSharesPerListing: sharesAndListings?.n
          ? Math.round((Number(sharesAndListings.shares ?? 0) / sharesAndListings.n) * 10) / 10
          : null,
        successFeePaymentRate: dueFees ? Math.round((paidFees / dueFees) * 100) : null,
      },
      successFees: feeBy,
      waitlist: {
        total: Object.values(waitlistBy).reduce((s, n) => s + n, 0),
        byRole: waitlistBy,
        goals: PHASE0_GOALS,
      },
    };
  }

  // ─── Vérifications d'identité (24 h) ───────────────────────────────────────

  async kycQueue() {
    const rows = await this.db
      .select({
        id: kycVerifications.id,
        userId: kycVerifications.userId,
        declaredName: kycVerifications.declaredName,
        documentType: kycVerifications.documentType,
        createdAt: kycVerifications.createdAt,
        phone: users.phone,
        roles: users.roles,
      })
      .from(kycVerifications)
      .innerJoin(users, eq(users.id, kycVerifications.userId))
      .where(eq(kycVerifications.status, 'pending'))
      .orderBy(asc(kycVerifications.createdAt));
    return rows.map((r) => this.withSla(r, MODERATION_SLA_HOURS.kyc));
  }

  /** Dossier complet : liens temporaires vers la pièce et le selfie ; chaque consultation est journalisée. */
  async kycDetail(staff: AuthUser, id: string) {
    const [kyc] = await this.db.select().from(kycVerifications).where(eq(kycVerifications.id, id));
    if (!kyc) throw notFound('Dossier introuvable.');
    await this.audit.log({ actorId: staff.id, action: 'kyc.documents_viewed', targetType: 'kyc', targetId: id });
    const [user] = await this.db.select().from(users).where(eq(users.id, kyc.userId));
    const payerNames = await this.db
      .selectDistinct({ payerName: payments.payerName })
      .from(payments)
      .where(and(eq(payments.userId, kyc.userId), isNotNull(payments.payerName)));
    const history = await this.db
      .select({ status: kycVerifications.status, reason: kycVerifications.reason, createdAt: kycVerifications.createdAt })
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, kyc.userId))
      .orderBy(desc(kycVerifications.createdAt));
    return {
      ...kyc,
      user: { id: user!.id, phone: user!.phone, roles: user!.roles, createdAt: user!.createdAt },
      documents: {
        front: await this.storage.createDownloadUrl(kyc.documentFrontKey),
        back: kyc.documentBackKey ? await this.storage.createDownloadUrl(kyc.documentBackKey) : null,
        selfie: await this.storage.createDownloadUrl(kyc.selfieKey),
      },
      mobileMoneyNames: payerNames.map((p) => p.payerName),
      history,
    };
  }

  async decideKyc(staff: AuthUser, id: string, input: { approve: boolean; reason?: string; documentNumber?: string }) {
    const [kyc] = await this.db.select().from(kycVerifications).where(eq(kycVerifications.id, id));
    if (!kyc) throw notFound('Dossier introuvable.');
    if (kyc.status !== 'pending') throw conflict('already_decided', 'Ce dossier est déjà traité.');
    if (!input.approve && !input.reason) throw badRequest('reason_required', 'Indique le motif du refus.');
    const now = this.clock.now();

    // Une pièce déjà bannie ne peut pas ouvrir un nouveau compte.
    if (input.approve && input.documentNumber && (await isBannedIdentity(this.db, this.config.APP_SECRET, 'id_document', input.documentNumber))) {
      input = { approve: false, reason: 'Pièce d’identité liée à un compte banni.', documentNumber: input.documentNumber };
      await this.db.update(users).set({ status: 'banned', statusReason: 'banned_identity' }).where(eq(users.id, kyc.userId));
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(kycVerifications)
        .set({
          status: input.approve ? 'approved' : 'rejected',
          reason: input.reason,
          documentNumber: input.documentNumber,
          moderatorId: staff.id,
          decidedAt: now,
        })
        .where(eq(kycVerifications.id, id));
      await tx
        .update(users)
        .set(
          input.approve
            ? { kycStatus: 'approved', verifiedAt: now, verifiedPhotoKey: kyc.selfieKey, fullName: kyc.declaredName }
            : { kycStatus: 'rejected' },
        )
        .where(eq(users.id, kyc.userId));
      await this.audit.log(
        { actorId: staff.id, action: input.approve ? 'kyc.approved' : 'kyc.rejected', targetType: 'kyc', targetId: id, metadata: { reason: input.reason } },
        tx,
      );
      await this.notifications.notify(
        {
          userId: kyc.userId,
          kind: input.approve ? 'kyc_approved' : 'kyc_rejected',
          title: input.approve ? 'Identité vérifiée' : 'Vérification refusée',
          body: input.approve
            ? 'Ton badge Vérifié est actif. Tu peux maintenant contacter les bailleurs ou publier.'
            : `Motif : ${input.reason}. Tu peux renvoyer ton dossier.`,
          external: ['whatsapp'],
        },
        tx,
      );
    });
    return { status: input.approve ? 'approved' : 'rejected' };
  }

  // ─── Preuves de propriété, de gestion ou d'occupation ─────────────────────

  async proofsQueue() {
    const rows = await this.db
      .select({
        id: ownershipProofs.id,
        userId: ownershipProofs.userId,
        role: ownershipProofs.role,
        proofType: ownershipProofs.proofType,
        createdAt: ownershipProofs.createdAt,
        fullName: users.fullName,
        kycStatus: users.kycStatus,
      })
      .from(ownershipProofs)
      .innerJoin(users, eq(users.id, ownershipProofs.userId))
      .where(eq(ownershipProofs.status, 'pending'))
      .orderBy(asc(ownershipProofs.createdAt));
    return rows.map((r) => this.withSla(r, MODERATION_SLA_HOURS.kyc));
  }

  async proofDetail(staff: AuthUser, id: string) {
    const [proof] = await this.db.select().from(ownershipProofs).where(eq(ownershipProofs.id, id));
    if (!proof) throw notFound('Preuve introuvable.');
    await this.audit.log({ actorId: staff.id, action: 'proof.documents_viewed', targetType: 'proof', targetId: id });
    return { ...proof, files: await Promise.all(proof.fileKeys.map((k) => this.storage.createDownloadUrl(k))) };
  }

  async decideProof(staff: AuthUser, id: string, input: { approve: boolean; reason?: string }) {
    const [proof] = await this.db.select().from(ownershipProofs).where(eq(ownershipProofs.id, id));
    if (!proof) throw notFound('Preuve introuvable.');
    if (proof.status !== 'pending') throw conflict('already_decided', 'Cette preuve est déjà traitée.');
    if (!input.approve && !input.reason) throw badRequest('reason_required', 'Indique le motif du refus.');
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(ownershipProofs)
        .set({ status: input.approve ? 'approved' : 'rejected', reason: input.reason, moderatorId: staff.id, decidedAt: now })
        .where(eq(ownershipProofs.id, id));
      await this.audit.log({ actorId: staff.id, action: input.approve ? 'proof.approved' : 'proof.rejected', targetType: 'proof', targetId: id }, tx);
      if (input.approve) await this.ambassadors.maybeReward(proof.userId, tx);
      await this.notifications.notify(
        {
          userId: proof.userId,
          kind: input.approve ? 'proof_approved' : 'proof_rejected',
          title: input.approve ? 'Preuve validée' : 'Preuve refusée',
          body: input.approve ? 'Tu peux publier tes logements.' : `Motif : ${input.reason}.`,
        },
        tx,
      );
    });
    return { status: input.approve ? 'approved' : 'rejected' };
  }

  // ─── Annonces (12 h) ───────────────────────────────────────────────────────

  async listingsQueue() {
    const rows = await this.db
      .select({
        listing: listings,
        districtName: districts.name,
        publisherName: users.fullName,
        districtMedianRent: sql<number | null>`(
          select percentile_cont(0.5) within group (order by l2.monthly_rent)
          from ${listings} l2
          where l2.district_id = ${listings.districtId} and l2.type = ${listings.type}
            and l2.status in ('published', 'taken') and l2.id <> ${listings.id}
        )`,
      })
      .from(listings)
      .innerJoin(districts, eq(districts.id, listings.districtId))
      .innerJoin(users, eq(users.id, listings.publisherId))
      .where(or(eq(listings.status, 'pending_review'), and(eq(listings.status, 'published'), eq(listings.needsPostReview, true))))
      .orderBy(asc(listings.updatedAt));
    const media = rows.length
      ? await this.db
          .select()
          .from(listingMedia)
          .where(inArray(listingMedia.listingId, rows.map((r) => r.listing.id)))
          .orderBy(asc(listingMedia.position))
      : [];
    return rows.map(({ listing, districtName, publisherName, districtMedianRent }) => ({
      ...this.withSla(
        {
          id: listing.id,
          ref: listing.ref,
          status: listing.status,
          postReview: listing.status === 'published',
          category: listing.category,
          type: listing.type,
          monthlyRent: listing.monthlyRent,
          advanceMonths: listing.advanceMonths,
          deposit: listing.deposit,
          amenities: listing.amenities,
          comingSoon: listing.comingSoon,
          exactAddress: listing.exactAddress,
          districtName,
          publisherId: listing.publisherId,
          publisherName,
          createdAt: listing.updatedAt,
        },
        MODERATION_SLA_HOURS.listing,
      ),
      districtMedianRent: districtMedianRent === null ? null : Math.round(Number(districtMedianRent)),
      // Loyer très inférieur à la médiane du quartier : l'appât classique.
      suspiciouslyCheap: districtMedianRent !== null && listing.monthlyRent < Number(districtMedianRent) * 0.5,
      media: media
        .filter((m) => m.listingId === listing.id)
        .map((m) => ({ id: m.id, kind: m.kind, status: m.status, playbackUrl: m.playbackUrl, capturedInApp: m.capturedInApp, capturedAt: m.capturedAt })),
    }));
  }

  async decideListing(staff: AuthUser, id: string, input: { approve: boolean; reason?: string }) {
    const [listing] = await this.db.select().from(listings).where(eq(listings.id, id));
    if (!listing) throw notFound('Annonce introuvable.');
    const postReview = listing.status === 'published' && listing.needsPostReview;
    if (listing.status !== 'pending_review' && !postReview) throw conflict('already_decided', 'Cette annonce est déjà traitée.');
    if (!input.approve && !input.reason) throw badRequest('reason_required', 'Indique le motif du refus.');
    const now = this.clock.now();
    await this.db.transaction(async (tx) => {
      if (input.approve) {
        if (postReview) {
          await tx
            .update(listings)
            .set({ needsPostReview: false, reviewedById: staff.id, reviewedAt: now })
            .where(eq(listings.id, id));
        } else {
          await this.listings.publish(listing, tx, { reviewerId: staff.id });
        }
      } else {
        await tx
          .update(listings)
          .set({
            status: postReview ? 'hidden' : 'rejected',
            hiddenReason: postReview ? 'sanction' : null,
            rejectionReason: input.reason,
            needsPostReview: false,
            reviewedById: staff.id,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(listings.id, id));
      }
      await this.audit.log(
        { actorId: staff.id, action: input.approve ? 'listing.approved' : 'listing.rejected', targetType: 'listing', targetId: id, metadata: { reason: input.reason, postReview } },
        tx,
      );
      await this.notifications.notify(
        {
          userId: listing.publisherId,
          kind: input.approve ? 'listing_published' : 'listing_rejected',
          title: input.approve ? 'Annonce publiée' : 'Annonce refusée',
          body: input.approve
            ? `Ton annonce ${listing.ref} est en ligne. Pense à la marquer « Pris » dès qu’elle est louée.`
            : `Ton annonce ${listing.ref} n’a pas été acceptée. Motif : ${input.reason}.`,
          external: ['whatsapp'],
        },
        tx,
      );
    });
    return { status: input.approve ? 'published' : postReview ? 'hidden' : 'rejected' };
  }

  // ─── Signalements (48 h) ───────────────────────────────────────────────────

  async reportsQueue() {
    const rows = await this.db
      .select({
        id: reports.id,
        reason: reports.reason,
        details: reports.details,
        targetType: reports.targetType,
        targetListingId: reports.targetListingId,
        targetUserId: reports.targetUserId,
        reporterId: reports.reporterId,
        createdAt: reports.createdAt,
        listingRef: listings.ref,
        targetName: users.fullName,
      })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.targetUserId))
      .leftJoin(listings, eq(listings.id, reports.targetListingId))
      .where(eq(reports.status, 'open'))
      .orderBy(asc(reports.createdAt));
    return Promise.all(
      rows.map(async (r) => ({
        ...this.withSla(r, MODERATION_SLA_HOURS.report),
        // Historique des contacts entre les deux parties, pour écouter chacune.
        contacts: await this.db
          .select({
            visitRequestId: visitRequests.id,
            status: visitRequests.status,
            slot: visitRequests.slot,
            validatedAt: visitRequests.validatedAt,
            messages: sql<number>`(select count(*)::int from ${messages} m join ${conversations} c on c.id = m.conversation_id where c.visit_request_id = "visit_requests"."id")`,
          })
          .from(visitRequests)
          .where(
            or(
              and(eq(visitRequests.seekerId, r.reporterId), eq(visitRequests.landlordId, r.targetUserId)),
              and(eq(visitRequests.seekerId, r.targetUserId), eq(visitRequests.landlordId, r.reporterId)),
            ),
          ),
        previousSanctions: await this.db
          .select({ infraction: sanctions.infraction, kind: sanctions.kind, createdAt: sanctions.createdAt })
          .from(sanctions)
          .where(eq(sanctions.userId, r.targetUserId)),
      })),
    );
  }

  decideReport(staff: AuthUser, id: string, input: { action: 'dismiss' } | { action: 'sanction'; infraction?: Infraction; note?: string }) {
    return this.reports.decide(staff, id, input);
  }

  // ─── Alertes de contournement ──────────────────────────────────────────────

  async fraudQueue() {
    return this.db
      .select({
        id: fraudSignals.id,
        userId: fraudSignals.userId,
        kind: fraudSignals.kind,
        details: fraudSignals.details,
        createdAt: fraudSignals.createdAt,
        fullName: users.fullName,
        userStatus: users.status,
      })
      .from(fraudSignals)
      .innerJoin(users, eq(users.id, fraudSignals.userId))
      .where(eq(fraudSignals.status, 'open'))
      .orderBy(asc(fraudSignals.createdAt));
  }

  async decideFraud(staff: AuthUser, id: string, input: { confirm: boolean; infraction?: Infraction; note?: string }) {
    const [signal] = await this.db.select().from(fraudSignals).where(eq(fraudSignals.id, id));
    if (!signal) throw notFound('Alerte introuvable.');
    if (signal.status !== 'open') throw conflict('already_decided', 'Cette alerte est déjà traitée.');
    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      await tx
        .update(fraudSignals)
        .set({ status: input.confirm ? 'confirmed' : 'dismissed', decidedById: staff.id, decidedAt: now })
        .where(eq(fraudSignals.id, id));
      let sanction = null;
      if (input.confirm && input.infraction) {
        sanction = await this.reports.applySanction(staff, { userId: signal.userId, infraction: input.infraction, note: input.note }, tx);
      }
      await this.audit.log({ actorId: staff.id, action: input.confirm ? 'fraud.confirmed' : 'fraud.dismissed', targetType: 'fraud_signal', targetId: id }, tx);
      return { status: input.confirm ? 'confirmed' : 'dismissed', sanction };
    });
  }

  // ─── Comptes ───────────────────────────────────────────────────────────────

  async searchUsers(q: string) {
    const term = q.trim();
    if (term.length < 3) return [];
    const digits = term.replace(/\D/g, '');
    return this.db
      .select({
        id: users.id,
        phone: users.phone,
        fullName: users.fullName,
        roles: users.roles,
        status: users.status,
        kycStatus: users.kycStatus,
        staffRole: users.staffRole,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(or(ilike(users.fullName, `%${term}%`), digits.length >= 6 ? ilike(users.phone, `%${digits}%`) : undefined))
      .limit(50);
  }

  async userDetail(staff: AuthUser, id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) throw notFound('Compte introuvable.');
    await this.audit.log({ actorId: staff.id, action: 'user.viewed', targetType: 'user', targetId: id });
    const { totpSecret: _secret, ...safe } = user;
    const [userPacks, userPayments, userSanctions, userSignals, userDevices, userListings, visitsCount] = await Promise.all([
      this.db.select().from(packs).where(eq(packs.userId, id)).orderBy(desc(packs.startsAt)),
      this.db.select().from(payments).where(eq(payments.userId, id)).orderBy(desc(payments.createdAt)).limit(50),
      this.db.select().from(sanctions).where(eq(sanctions.userId, id)).orderBy(desc(sanctions.createdAt)),
      this.db.select().from(fraudSignals).where(eq(fraudSignals.userId, id)).orderBy(desc(fraudSignals.createdAt)),
      this.db.select().from(devices).where(eq(devices.userId, id)).orderBy(desc(devices.createdAt)),
      this.db
        .select({ id: listings.id, ref: listings.ref, status: listings.status, monthlyRent: listings.monthlyRent })
        .from(listings)
        .where(eq(listings.publisherId, id)),
      this.db.select({ status: visitRequests.status, n: count() }).from(visitRequests).where(eq(visitRequests.seekerId, id)).groupBy(visitRequests.status),
    ]);
    return {
      user: safe,
      packs: userPacks,
      payments: userPayments,
      sanctions: userSanctions,
      fraudSignals: userSignals,
      devices: userDevices,
      listings: userListings,
      visitRequests: Object.fromEntries(visitsCount.map((v) => [v.status, v.n])),
    };
  }

  async sanctionUser(staff: AuthUser, id: string, input: { infraction: Infraction; note?: string; listingId?: string }) {
    return this.db.transaction((tx) =>
      this.reports.applySanction(staff, { userId: id, infraction: input.infraction, note: input.note, listingId: input.listingId }, tx),
    );
  }

  /** Levée d'une suspension ou d'un gel (superviseur). */
  async reactivateUser(staff: AuthUser, id: string, note?: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) throw notFound('Compte introuvable.');
    if (user.status === 'banned') throw conflict('banned', 'Un bannissement est définitif.');
    await this.db
      .update(users)
      .set({ status: 'active', statusReason: null, suspendedUntil: null })
      .where(eq(users.id, id));
    await this.audit.log({ actorId: staff.id, action: 'user.reactivated', targetType: 'user', targetId: id, metadata: { note } });
    return { status: 'active' };
  }

  /** Remboursement (superviseur) : le virement retour se fait chez l'agrégateur, on trace la décision. */
  async refundPayment(staff: AuthUser, id: string, note: string) {
    const [payment] = await this.db
      .update(payments)
      .set({ status: 'refunded' })
      .where(and(eq(payments.id, id), eq(payments.status, 'succeeded')))
      .returning();
    if (!payment) throw notFound('Paiement introuvable ou non remboursable.');
    if (payment.purpose === 'pack') {
      await this.db
        .update(packs)
        .set({ endsAt: this.clock.now(), endedReason: 'refunded' })
        .where(eq(packs.paymentId, id));
    }
    await this.audit.log({ actorId: staff.id, action: 'payment.refunded', targetType: 'payment', targetId: id, metadata: { note } });
    return payment;
  }

  // ─── Phase 0, configuration, équipe ────────────────────────────────────────

  async waitlist(role?: string) {
    return this.db
      .select()
      .from(waitlistEntries)
      .where(role ? sql`${waitlistEntries.role} = ${role}` : undefined)
      .orderBy(desc(waitlistEntries.createdAt))
      .limit(5_000);
  }

  async waitlistCsv(staff: AuthUser): Promise<string> {
    const rows = await this.waitlist();
    await this.audit.log({ actorId: staff.id, action: 'waitlist.exported', metadata: { rows: rows.length } });
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['date', 'profil', 'nom', 'telephone', 'whatsapp', 'ville', 'quartier', 'budget_max', 'code_ambassadeur', 'source', 'enquete'];
    const lines = rows.map((r) =>
      [r.createdAt.toISOString(), r.role, r.fullName, r.phone, r.whatsapp ? 'oui' : 'non', r.city, r.district, r.budgetMax, r.ambassadorCode, r.source, r.survey]
        .map(escape)
        .join(';'),
    );
    return [header.join(';'), ...lines].join('\n');
  }

  async countries() {
    return this.db.select().from(countries).orderBy(asc(countries.code));
  }

  async updateCountry(staff: AuthUser, code: string, input: { active?: boolean; packPrices?: Record<PackTier, number>; successFeeBps?: number }) {
    const [updated] = await this.db.update(countries).set(input).where(eq(countries.code, code.toUpperCase())).returning();
    if (!updated) throw notFound('Pays introuvable.');
    await this.audit.log({ actorId: staff.id, action: 'country.updated', targetType: 'country', targetId: code, metadata: input });
    return updated;
  }

  async setCityActive(staff: AuthUser, id: string, active: boolean) {
    const [updated] = await this.db.update(cities).set({ active }).where(eq(cities.id, id)).returning();
    if (!updated) throw notFound('Ville introuvable.');
    await this.audit.log({ actorId: staff.id, action: active ? 'city.opened' : 'city.closed', targetType: 'city', targetId: id });
    return updated;
  }

  async allCities() {
    return this.db
      .select({ id: cities.id, countryCode: cities.countryCode, code: cities.code, name: cities.name, active: cities.active })
      .from(cities)
      .orderBy(asc(cities.countryCode), asc(cities.name));
  }

  async createStaff(staff: AuthUser, phone: string, role: 'moderator' | 'supervisor' | 'admin') {
    const result = await seedStaff(this.db, phone, role);
    await this.audit.log({ actorId: staff.id, action: 'staff.created', targetType: 'user', metadata: { phone, role } });
    return { phone, role, totpUri: result.uri };
  }

  async auditLogs(limit = 200) {
    return this.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorName: users.fullName,
        actorPhone: users.phone,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  private withSla<T extends { createdAt: Date }>(row: T, hours: number) {
    const dueAt = new Date(row.createdAt.getTime() + hours * HOUR);
    return { ...row, dueAt, overdue: dueAt < this.clock.now() };
  }
}
