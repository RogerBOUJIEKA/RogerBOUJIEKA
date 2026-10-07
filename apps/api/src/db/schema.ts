/**
 * Modèle de données Klé (PostgreSQL + PostGIS).
 * Les noms de colonnes sont convertis en snake_case par Drizzle (`casing: 'snake_case'`).
 */
import {
  ACCOUNT_STATUSES,
  HOUSING_TYPES,
  ID_DOCUMENT_TYPES,
  INFRACTIONS,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  PACK_TIERS,
  PROOF_TYPES,
  REPORT_REASONS,
  STAFF_ROLES,
  VISIT_OUTCOMES,
  VISIT_STATUSES,
  WAITLIST_ROLES,
  type Amenities,
  type PackTier,
  type UserRole,
} from '@kle/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  date,
  geometry,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const ts = () => timestamp({ withTimezone: true });
const point = () => geometry({ type: 'point', mode: 'xy', srid: 4326 });

// ─── Énumérations ────────────────────────────────────────────────────────────

export const accountStatusEnum = pgEnum('account_status', ACCOUNT_STATUSES);
export const staffRoleEnum = pgEnum('staff_role', STAFF_ROLES);
export const kycStatusEnum = pgEnum('kyc_status', ['none', 'pending', 'approved', 'rejected']);
export const decisionStatusEnum = pgEnum('decision_status', ['pending', 'approved', 'rejected']);
export const idDocumentTypeEnum = pgEnum('id_document_type', ID_DOCUMENT_TYPES);
export const proofTypeEnum = pgEnum('proof_type', PROOF_TYPES);
export const proofRoleEnum = pgEnum('proof_role', ['landlord', 'outgoing_tenant']);
export const housingTypeEnum = pgEnum('housing_type', HOUSING_TYPES);
export const listingCategoryEnum = pgEnum('listing_category', LISTING_CATEGORIES);
export const listingStatusEnum = pgEnum('listing_status', LISTING_STATUSES);
export const mediaKindEnum = pgEnum('media_kind', ['video', 'photo']);
export const mediaStatusEnum = pgEnum('media_status', ['uploading', 'processing', 'ready', 'failed']);
export const packTierEnum = pgEnum('pack_tier', PACK_TIERS);
export const paymentPurposeEnum = pgEnum('payment_purpose', ['pack', 'success_fee', 'boost']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'refunded',
]);
export const mobileOperatorEnum = pgEnum('mobile_operator', ['mtn', 'orange']);
export const visitStatusEnum = pgEnum('visit_status', VISIT_STATUSES);
export const visitOutcomeEnum = pgEnum('visit_outcome', VISIT_OUTCOMES);
export const tenancyStatusEnum = pgEnum('tenancy_status', ['pending_fee', 'active', 'ended']);
export const successFeeStatusEnum = pgEnum('success_fee_status', [
  'pending',
  'paid',
  'overdue',
  'waived',
]);
export const reportTargetEnum = pgEnum('report_target', ['listing', 'user']);
export const reportReasonEnum = pgEnum('report_reason', REPORT_REASONS);
export const reportStatusEnum = pgEnum('report_status', ['open', 'resolved', 'dismissed']);
export const infractionEnum = pgEnum('infraction', INFRACTIONS);
export const sanctionKindEnum = pgEnum('sanction_kind', [
  'warning',
  'listing_hidden',
  'suspension',
  'permanent_ban',
  'blocked_until_paid',
  'fees_due_and_suspension',
]);
export const fraudStatusEnum = pgEnum('fraud_status', ['open', 'dismissed', 'confirmed']);
export const waitlistRoleEnum = pgEnum('waitlist_role', WAITLIST_ROLES);

// ─── Géographie ──────────────────────────────────────────────────────────────

export const countries = pgTable('countries', {
  code: char({ length: 2 }).primaryKey(),
  name: text().notNull(),
  currency: char({ length: 3 }).notNull(),
  dialCode: text().notNull(),
  active: boolean().notNull().default(false),
  packPrices: jsonb().$type<Record<PackTier, number>>().notNull(),
  /** Frais de réussite en points de base (1 000 = 10 %). */
  successFeeBps: integer().notNull().default(1_000),
  createdAt: createdAt(),
});

export const cities = pgTable(
  'cities',
  {
    id: id(),
    countryCode: char({ length: 2 })
      .notNull()
      .references(() => countries.code),
    code: char({ length: 3 }).notNull(),
    name: text().notNull(),
    active: boolean().notNull().default(false),
    /** Compteur des identifiants d'annonces (KLE-CM-DLA-000123). */
    listingSeq: integer().notNull().default(0),
    centroid: point(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.countryCode, t.code)],
);

export const districts = pgTable(
  'districts',
  {
    id: id(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    name: text().notNull(),
    slug: text().notNull(),
    centroid: point(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.cityId, t.slug)],
);

// ─── Comptes ─────────────────────────────────────────────────────────────────

export const ambassadors = pgTable('ambassadors', {
  id: id(),
  userId: uuid().notNull().unique(),
  code: text().notNull().unique(),
  active: boolean().notNull().default(true),
  /** Prime par bailleur validé avec au moins une annonce. */
  bonusPerLandlord: integer().notNull().default(1_000),
  createdAt: createdAt(),
});

export const users = pgTable(
  'users',
  {
    id: id(),
    /** Format E.164. Un numéro = un compte. */
    phone: text().notNull().unique(),
    fullName: text(),
    roles: text().array().$type<UserRole[]>().notNull().default(sql`'{}'::text[]`),
    staffRole: staffRoleEnum(),
    status: accountStatusEnum().notNull().default('active'),
    statusReason: text(),
    suspendedUntil: ts(),
    kycStatus: kycStatusEnum().notNull().default('none'),
    verifiedAt: ts(),
    /** Photo vérifiée (recadrage du selfie), montrée au bailleur lors d'une demande. */
    verifiedPhotoKey: text(),
    preferredCityId: uuid().references(() => cities.id),
    budgetMax: integer(),
    preferredDistrictIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    referralCode: text().notNull().unique(),
    referredById: uuid(),
    /** Jours offerts (parrainage, Garantie Klé) en attente d'un pack auquel s'ajouter. */
    bonusDaysCredit: integer().notNull().default(0),
    ambassadorId: uuid().references(() => ambassadors.id),
    charterVersion: text(),
    charterAcceptedAt: ts(),
    privacyAcceptedAt: ts(),
    /** Secret TOTP de la double authentification, obligatoire pour l'équipe. */
    totpSecret: text(),
    lastLoginAt: ts(),
    createdAt: createdAt(),
    deletedAt: ts(),
  },
  (t) => [index().on(t.status), index().on(t.kycStatus)],
);

export const devices = pgTable(
  'devices',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    deviceId: text().notNull(),
    name: text(),
    /** Nouveau selfie à chaque changement de téléphone. */
    selfieCheckKey: text(),
    lastSelfieCheckAt: ts(),
    revokedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.userId, t.deviceId)],
);

export const otpCodes = pgTable(
  'otp_codes',
  {
    id: id(),
    phone: text().notNull(),
    codeHash: text().notNull(),
    channel: text().notNull(),
    attempts: smallint().notNull().default(0),
    expiresAt: ts().notNull(),
    consumedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.phone, t.createdAt)],
);

export const kycVerifications = pgTable(
  'kyc_verifications',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    documentType: idDocumentTypeEnum().notNull(),
    documentFrontKey: text().notNull(),
    documentBackKey: text(),
    selfieKey: text().notNull(),
    declaredName: text().notNull(),
    /** Numéro de la pièce, saisi par le modérateur : sert au bannissement par pièce. */
    documentNumber: text(),
    status: decisionStatusEnum().notNull().default('pending'),
    reason: text(),
    moderatorId: uuid().references(() => users.id),
    decidedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.userId)],
);

export const ownershipProofs = pgTable(
  'ownership_proofs',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    role: proofRoleEnum().notNull(),
    proofType: proofTypeEnum().notNull(),
    fileKeys: text().array().notNull(),
    honorDeclaredAt: ts().notNull(),
    status: decisionStatusEnum().notNull().default('pending'),
    reason: text(),
    moderatorId: uuid().references(() => users.id),
    decidedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.userId)],
);

// ─── Annonces ────────────────────────────────────────────────────────────────

export interface ComingSoonDetails {
  departureDate: string;
  reason?: string;
  landlordConditions?: string;
  handoverAmount: number;
  landlordInformed: true;
}

export const listings = pgTable(
  'listings',
  {
    id: id(),
    ref: text().notNull().unique(),
    publisherId: uuid()
      .notNull()
      .references(() => users.id),
    category: listingCategoryEnum().notNull().default('rental'),
    status: listingStatusEnum().notNull().default('draft'),
    type: housingTypeEnum().notNull(),
    title: text(),
    monthlyRent: integer().notNull(),
    advanceMonths: smallint().notNull(),
    deposit: integer().notNull(),
    currency: char({ length: 3 }).notNull(),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    districtId: uuid()
      .notNull()
      .references(() => districts.id),
    /** Jamais publiée : donnée au chercheur après acceptation de la visite. */
    exactAddress: text().notNull(),
    location: point().notNull(),
    /** Position approximative affichée sur la carte. */
    approxLocation: point().notNull(),
    amenities: jsonb().$type<Amenities>().notNull(),
    availableFrom: date({ mode: 'date' }),
    comingSoon: jsonb().$type<ComingSoonDetails>(),
    publishedAt: ts(),
    /** Publication directe (compte de confiance) : contrôle après coup. */
    needsPostReview: boolean().notNull().default(false),
    reviewedById: uuid().references(() => users.id),
    reviewedAt: ts(),
    rejectionReason: text(),
    lastConfirmedAt: ts(),
    availabilityCheckSentAt: ts(),
    takenAt: ts(),
    /** Pourquoi l'annonce est masquée : `unconfirmed` (pas de réponse sous 72 h) ou `sanction`. */
    hiddenReason: text(),
    /** Alertes envoyées aux non-Premium une fois la fenêtre de 24 h passée. */
    publicAlertsSentAt: ts(),
    boostedUntil: ts(),
    validatedVisits: integer().notNull().default(0),
    viewsCount: integer().notNull().default(0),
    sharesCount: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [
    index().on(t.status, t.cityId, t.publishedAt),
    index().on(t.publisherId),
    index().on(t.districtId),
    index().using('gist', t.approxLocation),
  ],
);

export const listingMedia = pgTable(
  'listing_media',
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    kind: mediaKindEnum().notNull(),
    /** Service vidéo : cloudflare_stream, mux, bunny… ; `local` en développement. */
    provider: text().notNull(),
    providerAssetId: text().notNull(),
    playbackUrl: text(),
    thumbnailUrl: text(),
    status: mediaStatusEnum().notNull().default('uploading'),
    /** Filmé dans l'appli : date et position enregistrées automatiquement. */
    capturedInApp: boolean().notNull().default(false),
    capturedAt: ts(),
    captureLocation: point(),
    durationSeconds: integer(),
    position: smallint().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.listingId, t.position)],
);

// ─── Packs et paiements ──────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    purpose: paymentPurposeEnum().notNull(),
    /** Pack demandé, frais de réussite ou annonce boostée, selon `purpose`. */
    packTier: packTierEnum(),
    successFeeId: uuid(),
    listingId: uuid(),
    amount: integer().notNull(),
    currency: char({ length: 3 }).notNull(),
    operator: mobileOperatorEnum().notNull(),
    payerPhone: text().notNull(),
    /** Nom du compte Mobile Money renvoyé par l'agrégateur. */
    payerName: text(),
    provider: text().notNull(),
    providerReference: text().notNull().unique(),
    status: paymentStatusEnum().notNull().default('pending'),
    metadata: jsonb().$type<Record<string, unknown>>(),
    paidAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.status)],
);

export const packs = pgTable(
  'packs',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    tier: packTierEnum().notNull(),
    countryCode: char({ length: 2 }).notNull(),
    price: integer().notNull(),
    startsAt: ts().notNull(),
    endsAt: ts().notNull(),
    visitRequestsTotal: integer().notNull(),
    visitRequestsUsed: integer().notNull().default(0),
    /** Jours offerts : parrainage, Garantie Klé, « pas trouvé en 30 jours ». */
    bonusDays: integer().notNull().default(0),
    notFoundBonusApplied: boolean().notNull().default(false),
    /** `found` : le pack s'arrête dès que l'abonné a trouvé ; `superseded` : remplacé. */
    endedReason: text(),
    paymentId: uuid().references(() => payments.id),
    renewalReminderSentAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.endsAt)],
);

// ─── Contacts et visites ─────────────────────────────────────────────────────

export const visitRequests = pgTable(
  'visit_requests',
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id),
    seekerId: uuid()
      .notNull()
      .references(() => users.id),
    landlordId: uuid()
      .notNull()
      .references(() => users.id),
    packId: uuid().references(() => packs.id),
    proposedSlot: ts().notNull(),
    slot: ts(),
    message: text(),
    status: visitStatusEnum().notNull().default('pending'),
    /** Mise en avant chez le bailleur selon le pack (badge « Chercheur sérieux », en haut). */
    highlight: text().notNull().default('none'),
    refusalReason: text(),
    respondedAt: ts(),
    validatedAt: ts(),
    outcome: visitOutcomeEnum(),
    outcomeAt: ts(),
    reviewRequestSentAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.seekerId, t.status),
    index().on(t.listingId, t.status),
    index().on(t.landlordId, t.status),
  ],
);

export const conversations = pgTable('conversations', {
  id: id(),
  visitRequestId: uuid()
    .notNull()
    .unique()
    .references(() => visitRequests.id),
  seekerId: uuid()
    .notNull()
    .references(() => users.id),
  landlordId: uuid()
    .notNull()
    .references(() => users.id),
  lastMessageAt: ts(),
  createdAt: createdAt(),
});

export const messages = pgTable(
  'messages',
  {
    id: id(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid()
      .notNull()
      .references(() => users.id),
    /** `text` ou `call` (journal des appels passés dans l'appli). */
    kind: text().notNull().default('text'),
    body: text(),
    callDurationSeconds: integer(),
    readAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.conversationId, t.createdAt)],
);

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] })],
);

export const alerts = pgTable(
  'alerts',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    cityId: uuid()
      .notNull()
      .references(() => cities.id),
    districtIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    type: housingTypeEnum(),
    minRent: integer(),
    maxRent: integer().notNull(),
    moveInDate: date({ mode: 'date' }),
    active: boolean().notNull().default(true),
    lastNotifiedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.cityId, t.active)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    kind: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    data: jsonb().$type<Record<string, unknown>>(),
    channels: text().array().notNull().default(sql`'{in_app}'::text[]`),
    readAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

// ─── Location et frais de réussite ───────────────────────────────────────────

export const tenancies = pgTable(
  'tenancies',
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id),
    landlordId: uuid()
      .notNull()
      .references(() => users.id),
    tenantId: uuid().references(() => users.id),
    visitRequestId: uuid().references(() => visitRequests.id),
    monthlyRent: integer().notNull(),
    startDate: date({ mode: 'date' }).notNull(),
    endDate: date({ mode: 'date' }),
    status: tenancyStatusEnum().notNull().default('pending_fee'),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.landlordId), index().on(t.tenantId)],
);

export const successFees = pgTable(
  'success_fees',
  {
    id: id(),
    tenancyId: uuid()
      .notNull()
      .references(() => tenancies.id),
    visitRequestId: uuid()
      .notNull()
      .unique()
      .references(() => visitRequests.id),
    listingId: uuid()
      .notNull()
      .references(() => listings.id),
    payerId: uuid()
      .notNull()
      .references(() => users.id),
    landlordId: uuid()
      .notNull()
      .references(() => users.id),
    monthlyRent: integer().notNull(),
    feeBps: integer().notNull(),
    amount: integer().notNull(),
    currency: char({ length: 3 }).notNull(),
    dueAt: ts().notNull(),
    status: successFeeStatusEnum().notNull().default('pending'),
    paymentId: uuid().references(() => payments.id),
    paidAt: ts(),
    blockedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.payerId, t.status), index().on(t.status, t.dueAt)],
);

/** Espace Location (V2) : loyers saisis par le bailleur et quittances PDF. */
export const rentRecords = pgTable('rent_records', {
  id: id(),
  tenancyId: uuid()
    .notNull()
    .references(() => tenancies.id),
  periodMonth: date({ mode: 'date' }).notNull(),
  amount: integer().notNull(),
  paidOn: date({ mode: 'date' }),
  method: text(),
  receiptKey: text(),
  createdAt: createdAt(),
});

/** Espace Location (V2) : factures d'eau et d'électricité, montant et part de chacun. */
export const utilityBills = pgTable('utility_bills', {
  id: id(),
  tenancyId: uuid()
    .notNull()
    .references(() => tenancies.id),
  kind: text().notNull(),
  periodMonth: date({ mode: 'date' }).notNull(),
  totalAmount: integer().notNull(),
  tenantShare: integer().notNull(),
  paidAt: ts(),
  createdAt: createdAt(),
});

/** Espace Location (V2) : pannes signalées et suivi. */
export const maintenanceRequests = pgTable('maintenance_requests', {
  id: id(),
  tenancyId: uuid()
    .notNull()
    .references(() => tenancies.id),
  reportedById: uuid()
    .notNull()
    .references(() => users.id),
  description: text().notNull(),
  photoKeys: text().array().notNull().default(sql`'{}'::text[]`),
  status: text().notNull().default('open'),
  resolvedAt: ts(),
  createdAt: createdAt(),
});

// ─── Réputation ──────────────────────────────────────────────────────────────

/** Avis sur une personne : possible seulement après un contact enregistré. */
export const reviews = pgTable(
  'reviews',
  {
    id: id(),
    visitRequestId: uuid()
      .notNull()
      .references(() => visitRequests.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    subjectId: uuid()
      .notNull()
      .references(() => users.id),
    rating: smallint().notNull(),
    comment: text(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.visitRequestId, t.authorId), index().on(t.subjectId)],
);

export const districtReviews = pgTable(
  'district_reviews',
  {
    id: id(),
    districtId: uuid()
      .notNull()
      .references(() => districts.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    water: smallint().notNull(),
    electricity: smallint().notNull(),
    security: smallint().notNull(),
    flooding: smallint().notNull(),
    roads: smallint().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.districtId, t.authorId)],
);

// ─── Signalements, sanctions, fraude ─────────────────────────────────────────

export const reports = pgTable(
  'reports',
  {
    id: id(),
    reporterId: uuid()
      .notNull()
      .references(() => users.id),
    targetType: reportTargetEnum().notNull(),
    targetListingId: uuid().references(() => listings.id),
    /** Pour un signalement d'annonce, le publiant ; pour un profil, la personne signalée. */
    targetUserId: uuid()
      .notNull()
      .references(() => users.id),
    reason: reportReasonEnum().notNull(),
    details: text(),
    status: reportStatusEnum().notNull().default('open'),
    infraction: infractionEnum(),
    decisionNote: text(),
    moderatorId: uuid().references(() => users.id),
    resolvedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.targetUserId)],
);

export const sanctions = pgTable(
  'sanctions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    listingId: uuid().references(() => listings.id),
    reportId: uuid().references(() => reports.id),
    infraction: infractionEnum().notNull(),
    kind: sanctionKindEnum().notNull(),
    endsAt: ts(),
    authoritiesOnRequest: boolean().notNull().default(false),
    note: text(),
    decidedById: uuid().references(() => users.id),
    liftedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.infraction)],
);

/** Un compte banni l'est par numéro et par pièce d'identité (empreintes, pas de valeur en clair). */
export const bannedIdentities = pgTable(
  'banned_identities',
  {
    id: id(),
    kind: text().notNull(),
    valueHash: text().notNull(),
    sanctionId: uuid().references(() => sanctions.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.kind, t.valueHash)],
);

export const fraudSignals = pgTable(
  'fraud_signals',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    kind: text().notNull(),
    details: jsonb().$type<Record<string, unknown>>(),
    status: fraudStatusEnum().notNull().default('open'),
    decidedById: uuid().references(() => users.id),
    decidedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.userId)],
);

export const ambassadorRewards = pgTable(
  'ambassador_rewards',
  {
    id: id(),
    ambassadorId: uuid()
      .notNull()
      .references(() => ambassadors.id),
    landlordId: uuid()
      .notNull()
      .unique()
      .references(() => users.id),
    amount: integer().notNull(),
    status: text().notNull().default('due'),
    paidAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.ambassadorId)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorId: uuid().references(() => users.id),
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt), index().on(t.actorId)],
);

// ─── Phase 0 ─────────────────────────────────────────────────────────────────

export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: id(),
    role: waitlistRoleEnum().notNull(),
    fullName: text().notNull(),
    phone: text().notNull(),
    whatsapp: boolean().notNull().default(true),
    city: text().notNull(),
    district: text(),
    budgetMax: integer(),
    ambassadorCode: text(),
    survey: jsonb().$type<Record<string, unknown>>(),
    source: text(),
    consentAt: ts().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.phone, t.role), index().on(t.createdAt)],
);
