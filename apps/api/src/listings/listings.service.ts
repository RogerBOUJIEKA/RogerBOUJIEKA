import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  LISTING_BOOST,
  formatListingRef,
  formatMoney,
  isListingRef,
  requiresPrePublicationReview,
  canViewListing,
  type CreateListingInput,
} from '@kle/shared';
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { AuthUser } from '../auth/auth.decorators.js';
import { AlertsService } from '../alerts/alerts.service.js';
import { AmbassadorsService } from '../ambassadors/ambassadors.service.js';
import { Clock } from '../common/clock.js';
import { randomToken } from '../common/crypto.js';
import { badRequest, forbidden, notFound } from '../common/errors.js';
import { CONFIG, type AppConfig } from '../config.js';
import { DB, type Database, type Tx } from '../db/db.module.js';
import { approximate, makePoint } from '../db/geo.js';
import {
  cities,
  countries,
  districts,
  favorites,
  listingMedia,
  listings,
  users,
  visitRequests,
} from '../db/schema.js';
import { KycService } from '../kyc/kyc.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PacksService } from '../packs/packs.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { ObjectStorage } from '../storage/storage.js';
import { LocalVideoProvider, VideoProvider } from '../storage/video.js';
import { ProfilesService } from '../users/profiles.service.js';
import { presentListing, type ListingRow, type ViewContext } from './listing-view.js';

const EDITABLE_STATUSES = ['draft', 'rejected', 'pending_review', 'published'] as const;

@Injectable()
export class ListingsService implements OnModuleInit {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly kyc: KycService,
    private readonly packs: PacksService,
    private readonly payments: PaymentsService,
    private readonly profiles: ProfilesService,
    private readonly alerts: AlertsService,
    private readonly ambassadors: AmbassadorsService,
    private readonly notifications: NotificationsService,
    private readonly storage: ObjectStorage,
    private readonly video: VideoProvider,
  ) {}

  onModuleInit(): void {
    this.payments.onSucceeded('boost', async (payment, tx) => {
      const now = this.clock.now();
      await tx
        .update(listings)
        .set({
          boostedUntil: sql`greatest(coalesce(${listings.boostedUntil}, ${now}), ${now}) + make_interval(days => ${LISTING_BOOST.days})`,
        })
        .where(eq(listings.id, payment.listingId!));
    });
  }

  // ─── Publication (4 écrans) ────────────────────────────────────────────────

  async create(user: AuthUser, input: CreateListingInput) {
    this.assertCanPublish(user, input.category);
    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      const { city } = await this.resolvePlace(tx, input.cityId, input.districtId);
      const [seq] = await tx
        .update(cities)
        .set({ listingSeq: sql`${cities.listingSeq} + 1` })
        .where(eq(cities.id, city.id))
        .returning({ seq: cities.listingSeq });
      const ref = formatListingRef(city.countryCode, city.code, seq!.seq);
      const approx = approximate(input.longitude, input.latitude, ref);
      const [country] = await tx.select().from(countries).where(eq(countries.code, city.countryCode));
      const [created] = await tx
        .insert(listings)
        .values({
          ref,
          publisherId: user.id,
          category: input.category,
          type: input.type,
          title: input.title,
          monthlyRent: input.monthlyRent,
          advanceMonths: input.advanceMonths,
          deposit: input.deposit,
          currency: country!.currency,
          cityId: city.id,
          districtId: input.districtId,
          exactAddress: input.exactAddress,
          location: makePoint(input.longitude, input.latitude),
          approxLocation: makePoint(approx.longitude, approx.latitude),
          amenities: input.amenities,
          availableFrom: input.availableFrom,
          comingSoon: input.comingSoon
            ? { ...input.comingSoon, departureDate: input.comingSoon.departureDate.toISOString().slice(0, 10) }
            : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return this.ownerView(created!, tx);
    });
  }

  async update(user: AuthUser, id: string, input: Partial<CreateListingInput>) {
    const listing = await this.getOwned(user.id, id);
    if (!(EDITABLE_STATUSES as readonly string[]).includes(listing.status)) {
      throw forbidden('not_editable', 'Cette annonce ne peut plus être modifiée.');
    }
    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      if (input.cityId || input.districtId) {
        await this.resolvePlace(tx, input.cityId ?? listing.cityId, input.districtId ?? listing.districtId);
      }
      const patch: PgUpdateSetSource<typeof listings> = {
        ...(input.type ? { type: input.type } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.monthlyRent ? { monthlyRent: input.monthlyRent } : {}),
        ...(input.advanceMonths !== undefined ? { advanceMonths: input.advanceMonths } : {}),
        ...(input.deposit !== undefined ? { deposit: input.deposit } : {}),
        ...(input.districtId ? { districtId: input.districtId } : {}),
        ...(input.exactAddress ? { exactAddress: input.exactAddress } : {}),
        ...(input.amenities ? { amenities: input.amenities } : {}),
        ...(input.availableFrom !== undefined ? { availableFrom: input.availableFrom } : {}),
        updatedAt: now,
      };
      if (input.latitude !== undefined && input.longitude !== undefined) {
        const approx = approximate(input.longitude, input.latitude, listing.ref);
        patch.location = makePoint(input.longitude, input.latitude);
        patch.approxLocation = makePoint(approx.longitude, approx.latitude);
      }
      if (listing.status === 'published') {
        // Une annonce publiée modifiée est recontrôlée : avant (nouveau compte) ou après coup.
        const approved = await this.approvedListingsCount(user.id, tx);
        if (requiresPrePublicationReview(approved)) patch.status = 'pending_review';
        else patch.needsPostReview = true;
      }
      const [updated] = await tx.update(listings).set(patch).where(eq(listings.id, id)).returning();
      return this.ownerView(updated!, tx);
    });
  }

  /** Écran 1 : vidéo et photos, filmées dans l'appli (date et position enregistrées) ou importées. */
  async createMediaUpload(
    user: AuthUser,
    listingId: string,
    input: {
      kind: 'video' | 'photo';
      contentType: string;
      capturedInApp: boolean;
      capturedAt?: Date;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const listing = await this.getOwned(user.id, listingId);
    const [existing] = await this.db.select({ n: count() }).from(listingMedia).where(eq(listingMedia.listingId, listing.id));
    if ((existing?.n ?? 0) >= 12) throw badRequest('too_many_media', '12 vidéos et photos maximum par annonce.');
    let upload;
    let provider: string;
    let assetId: string;
    if (input.kind === 'video') {
      const video = await this.video.createDirectUpload({ listingId });
      upload = { url: video.uploadUrl, method: video.method, headers: video.headers };
      provider = video.provider;
      assetId = video.assetId;
    } else {
      const ext = input.contentType === 'image/png' ? 'png' : input.contentType === 'image/webp' ? 'webp' : 'jpg';
      const key = `listings/${listingId}/${randomToken(9).toLowerCase().replace(/[^a-z0-9]/g, '')}.${ext}`;
      const target = await this.storage.createUpload('public', key, input.contentType);
      upload = { url: target.url, method: target.method, headers: target.headers };
      provider = 'storage';
      assetId = key;
    }
    const [media] = await this.db
      .insert(listingMedia)
      .values({
        listingId,
        kind: input.kind,
        provider,
        providerAssetId: assetId,
        capturedInApp: input.capturedInApp,
        capturedAt: input.capturedAt,
        captureLocation:
          input.latitude !== undefined && input.longitude !== undefined
            ? makePoint(input.longitude, input.latitude)
            : undefined,
        position: existing?.n ?? 0,
        createdAt: this.clock.now(),
      })
      .returning();
    return { mediaId: media!.id, upload };
  }

  /** L'appli signale la fin de l'envoi. Les vidéos d'un service externe attendent son webhook. */
  async completeMedia(user: AuthUser, listingId: string, mediaId: string) {
    await this.getOwned(user.id, listingId);
    const [media] = await this.db
      .select()
      .from(listingMedia)
      .where(and(eq(listingMedia.id, mediaId), eq(listingMedia.listingId, listingId)));
    if (!media) throw notFound('Média introuvable.');
    if (media.provider === 'storage' || media.provider === 'local') {
      const url =
        media.provider === 'local' && this.video instanceof LocalVideoProvider
          ? this.video.playbackUrl(media.providerAssetId)
          : this.storage.publicUrl(media.providerAssetId);
      await this.db
        .update(listingMedia)
        .set({ status: 'ready', playbackUrl: url, thumbnailUrl: media.kind === 'photo' ? url : null })
        .where(eq(listingMedia.id, mediaId));
    } else {
      await this.db.update(listingMedia).set({ status: 'processing' }).where(eq(listingMedia.id, mediaId));
    }
    return this.ownerView(await this.getOwned(user.id, listingId));
  }

  async removeMedia(user: AuthUser, listingId: string, mediaId: string) {
    await this.getOwned(user.id, listingId);
    await this.db
      .delete(listingMedia)
      .where(and(eq(listingMedia.id, mediaId), eq(listingMedia.listingId, listingId)));
    return { removed: true };
  }

  /** Webhook du service vidéo : la vidéo est prête en plusieurs qualités, avec une miniature. */
  async markVideoReady(provider: string, assetId: string, data: { playbackUrl: string; thumbnailUrl?: string; durationSeconds?: number } | null) {
    await this.db
      .update(listingMedia)
      .set(
        data
          ? {
              status: 'ready',
              playbackUrl: data.playbackUrl,
              thumbnailUrl: data.thumbnailUrl,
              durationSeconds: data.durationSeconds ? Math.round(data.durationSeconds) : null,
            }
          : { status: 'failed' },
      )
      .where(and(eq(listingMedia.provider, provider), eq(listingMedia.providerAssetId, assetId)));
  }

  /**
   * Envoi en modération. Les annonces d'un nouveau compte sont relues avant publication ;
   * après 3 annonces validées, la publication devient directe, avec contrôle après coup.
   */
  async submit(user: AuthUser, id: string) {
    const listing = await this.getOwned(user.id, id);
    if (!['draft', 'rejected'].includes(listing.status)) {
      throw forbidden('already_submitted', 'Cette annonce est déjà envoyée.');
    }
    this.assertCanPublish(user, listing.category);
    if (user.kycStatus !== 'approved') {
      throw forbidden('kyc_required', 'Ton identité doit être vérifiée avant de publier.');
    }
    const proofRole = listing.category === 'coming_soon' ? 'outgoing_tenant' : 'landlord';
    if (!(await this.kyc.hasApprovedProof(user.id, proofRole))) {
      throw forbidden(
        'proof_required',
        proofRole === 'landlord'
          ? 'Ajoute une preuve de propriété ou de gestion pour publier.'
          : 'Ajoute ta quittance de loyer ou ton bail pour publier.',
      );
    }
    const [ready] = await this.db
      .select({ n: count() })
      .from(listingMedia)
      .where(and(eq(listingMedia.listingId, id), inArray(listingMedia.status, ['ready', 'processing'])));
    if (!ready?.n) throw forbidden('media_required', 'Ajoute au moins une vidéo ou une photo du logement.');

    return this.db.transaction(async (tx) => {
      const approved = await this.approvedListingsCount(user.id, tx);
      if (requiresPrePublicationReview(approved)) {
        const [updated] = await tx
          .update(listings)
          .set({ status: 'pending_review', rejectionReason: null, updatedAt: this.clock.now() })
          .where(eq(listings.id, id))
          .returning();
        return this.ownerView(updated!, tx);
      }
      const published = await this.publish(listing, tx, { postReview: true });
      return this.ownerView(published, tx);
    });
  }

  /** Mise en ligne : alertes Premium immédiates, prime ambassadeur éventuelle. */
  async publish(listing: ListingRow, tx: Tx, options: { postReview?: boolean; reviewerId?: string } = {}) {
    const now = this.clock.now();
    const [published] = await tx
      .update(listings)
      .set({
        status: 'published',
        publishedAt: listing.publishedAt ?? now,
        lastConfirmedAt: now,
        availabilityCheckSentAt: null,
        hiddenReason: null,
        needsPostReview: options.postReview ?? false,
        rejectionReason: null,
        ...(options.reviewerId ? { reviewedById: options.reviewerId, reviewedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(listings.id, listing.id))
      .returning();
    if (!listing.publishedAt) await this.alerts.notifyForListing(published!, 'early', tx);
    await this.ambassadors.maybeReward(listing.publisherId, tx);
    return published!;
  }

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async viewContext(viewer?: AuthUser): Promise<ViewContext> {
    const [country] = await this.db.select().from(countries).where(eq(countries.code, 'CM'));
    const pack = viewer ? await this.packs.getActivePack(viewer.id) : null;
    return {
      now: this.clock.now(),
      webUrl: this.config.WEB_URL,
      viewerTier: pack?.tier ?? null,
      packPrices: country!.packPrices,
      successFeeBps: country!.successFeeBps,
    };
  }

  /** Construit les fiches publiques (médias, quartier, profil du publiant) en quelques requêtes. */
  async present(rows: ListingRow[], ctx: ViewContext, viewer?: AuthUser) {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [media, places, publishers, favs, stats] = await Promise.all([
      this.db.select().from(listingMedia).where(inArray(listingMedia.listingId, ids)).orderBy(asc(listingMedia.position)),
      this.db
        .select({ districtId: districts.id, districtName: districts.name, cityId: cities.id, cityName: cities.name })
        .from(districts)
        .innerJoin(cities, eq(cities.id, districts.cityId))
        .where(inArray(districts.id, [...new Set(rows.map((r) => r.districtId))])),
      this.db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, [...new Set(rows.map((r) => r.publisherId))])),
      viewer
        ? this.db
            .select({ listingId: favorites.listingId })
            .from(favorites)
            .where(and(eq(favorites.userId, viewer.id), inArray(favorites.listingId, ids)))
        : Promise.resolve([]),
      this.profiles.statsFor(rows.map((r) => r.publisherId)),
    ]);
    const placeBy = new Map(places.map((p) => [p.districtId, p]));
    const publisherBy = new Map(publishers.map((p) => [p.id, p]));
    const favSet = new Set(favs.map((f) => f.listingId));
    return rows.map((row) => {
      const place = placeBy.get(row.districtId)!;
      return presentListing(
        row,
        {
          city: { id: place.cityId, name: place.cityName },
          district: { id: place.districtId, name: place.districtName },
          media: media.filter((m) => m.listingId === row.id),
          publisher: {
            id: row.publisherId,
            fullName: publisherBy.get(row.publisherId)?.fullName ?? null,
            stats: stats.get(row.publisherId),
          },
          isFavorite: favSet.has(row.id),
        },
        ctx,
      );
    });
  }

  /** Fiche logement : par identifiant ou par référence (KLE-CM-DLA-000123). */
  async getPublic(idOrRef: string, viewer?: AuthUser) {
    const condition = isListingRef(idOrRef)
      ? eq(listings.ref, idOrRef.toUpperCase())
      : /^[0-9a-f-]{36}$/i.test(idOrRef)
        ? eq(listings.id, idOrRef)
        : null;
    if (!condition) throw notFound('Annonce introuvable.');
    const [row] = await this.db.select().from(listings).where(condition);
    if (!row) throw notFound('Annonce introuvable.');
    const isOwner = viewer?.id === row.publisherId;
    const isStaff = !!viewer?.staffRole;
    const ctx = await this.viewContext(viewer);
    if (!isOwner && !isStaff) {
      if (!['published', 'taken'].includes(row.status) || !row.publishedAt) throw notFound('Annonce introuvable.');
      const visible = canViewListing({
        category: row.category,
        publishedAt: row.publishedAt,
        viewerTier: ctx.viewerTier,
        now: ctx.now,
      });
      if (!visible) {
        throw forbidden(
          row.category === 'coming_soon' ? 'coming_soon_reserved' : 'premium_early_access',
          row.category === 'coming_soon'
            ? 'Les logements « Bientôt disponible » sont réservés aux packs Confort et Premium.'
            : 'Cette annonce est réservée au pack Premium pendant 24 h.',
        );
      }
      void this.db
        .update(listings)
        .set({ viewsCount: sql`${listings.viewsCount} + 1` })
        .where(eq(listings.id, row.id))
        .catch(() => undefined);
    }
    const [view] = await this.present([row], ctx, viewer);
    return isOwner ? { ...view!, owner: await this.ownerExtras(row) } : view!;
  }

  async mine(userId: string) {
    const rows = await this.db
      .select()
      .from(listings)
      .where(eq(listings.publisherId, userId))
      .orderBy(desc(listings.createdAt));
    return Promise.all(rows.map((r) => this.ownerView(r)));
  }

  // ─── Cycle de vie ──────────────────────────────────────────────────────────

  /** Réponse à la question « Toujours disponible ? » envoyée tous les 15 jours. */
  async confirmAvailable(user: AuthUser, id: string) {
    const listing = await this.getOwned(user.id, id);
    const now = this.clock.now();
    if (listing.status === 'hidden' && listing.hiddenReason !== 'unconfirmed') {
      throw forbidden('hidden_by_moderation', 'Cette annonce a été masquée par la modération.');
    }
    if (!['published', 'hidden'].includes(listing.status)) {
      throw forbidden('not_published', 'Cette annonce n’est pas en ligne.');
    }
    const [updated] = await this.db
      .update(listings)
      .set({ status: 'published', hiddenReason: null, lastConfirmedAt: now, availabilityCheckSentAt: null, updatedAt: now })
      .where(eq(listings.id, id))
      .returning();
    return this.ownerView(updated!);
  }

  /**
   * Retrait par le publiant. Une annonce retirée sans être marquée « Louée » déclenche une
   * question au bailleur, avec la liste des personnes qui l'ont contacté via Klé.
   */
  async remove(user: AuthUser, id: string) {
    const listing = await this.getOwned(user.id, id);
    if (listing.status === 'removed') return { removed: true };
    const now = this.clock.now();
    await this.db.update(listings).set({ status: 'removed', updatedAt: now }).where(eq(listings.id, id));
    const [contacts] = await this.db
      .select({ n: count() })
      .from(visitRequests)
      .where(and(eq(visitRequests.listingId, id), inArray(visitRequests.status, ['accepted', 'validated'])));
    if (listing.status === 'published' && (contacts?.n ?? 0) > 0) {
      await this.notifications.notify({
        userId: user.id,
        kind: 'removed_listing_question',
        title: 'As-tu loué ce logement ?',
        body: `Tu as retiré l’annonce ${listing.ref}. Si tu l’as louée à une personne rencontrée via Klé, indique-la pour que l’annonce soit marquée « Louée ».`,
        data: { listingId: id },
      });
    }
    return { removed: true };
  }

  async setFavorite(user: AuthUser, id: string, favorite: boolean) {
    if (favorite) {
      const [listing] = await this.db.select({ id: listings.id }).from(listings).where(eq(listings.id, id));
      if (!listing) throw notFound('Annonce introuvable.');
      await this.db.insert(favorites).values({ userId: user.id, listingId: id }).onConflictDoNothing();
    } else {
      await this.db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.listingId, id)));
    }
    return { favorite };
  }

  async favorites(viewer: AuthUser) {
    const rows = await this.db
      .select({ listing: listings })
      .from(favorites)
      .innerJoin(listings, eq(listings.id, favorites.listingId))
      .where(and(eq(favorites.userId, viewer.id), inArray(listings.status, ['published', 'taken'])))
      .orderBy(desc(favorites.createdAt));
    return this.present(rows.map((r) => r.listing), await this.viewContext(viewer), viewer);
  }

  /** Partage WhatsApp : le lien ouvre la page web de l'annonce, sans installer l'appli. */
  async share(id: string) {
    const [row] = await this.db
      .update(listings)
      .set({ sharesCount: sql`${listings.sharesCount} + 1` })
      .where(and(eq(listings.id, id), inArray(listings.status, ['published', 'taken'])))
      .returning({ ref: listings.ref, monthlyRent: listings.monthlyRent });
    if (!row) throw notFound('Annonce introuvable.');
    const url = `${this.config.WEB_URL}/annonce/${row.ref}`;
    const text = `Regarde ce logement sur Klé : ${formatMoney(row.monthlyRent)} / mois, publié par une personne vérifiée. ${url}`;
    return { url, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}` };
  }

  /** Boost optionnel : 1 000 FCFA pour 7 jours en tête du fil du quartier. */
  async boost(user: AuthUser, id: string, input: { operator: 'mtn' | 'orange'; payerPhone: string }) {
    const listing = await this.getOwned(user.id, id);
    if (listing.status !== 'published') throw forbidden('not_published', 'Seule une annonce en ligne peut être boostée.');
    return this.payments.initiate({
      userId: user.id,
      purpose: 'boost',
      listingId: id,
      amount: LISTING_BOOST.price,
      currency: listing.currency,
      operator: input.operator,
      payerPhone: input.payerPhone,
      description: `Boost 7 jours — annonce ${listing.ref}`,
    });
  }

  // ─── Outils ────────────────────────────────────────────────────────────────

  async getOwned(userId: string, id: string): Promise<ListingRow> {
    const [row] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.publisherId, userId)));
    if (!row) throw notFound('Annonce introuvable.');
    return row;
  }

  private assertCanPublish(user: AuthUser, category: 'rental' | 'coming_soon') {
    if (user.status !== 'active') {
      throw forbidden('account_not_active', 'Ton compte ne peut pas publier pour le moment.');
    }
    const role = category === 'coming_soon' ? 'outgoing_tenant' : 'landlord';
    if (!user.roles.includes(role)) {
      throw forbidden(
        'role_required',
        category === 'coming_soon'
          ? 'Seul un locataire sortant peut publier « Bientôt disponible ».'
          : 'Active le profil bailleur pour publier un logement.',
      );
    }
  }

  private async resolvePlace(tx: Tx, cityId: string, districtId: string) {
    const [place] = await tx
      .select({ city: cities, districtCityId: districts.cityId })
      .from(districts)
      .innerJoin(cities, eq(cities.id, districts.cityId))
      .where(eq(districts.id, districtId));
    if (!place || place.city.id !== cityId) throw badRequest('invalid_district', 'Quartier inconnu pour cette ville.');
    if (!place.city.active) throw forbidden('city_not_open', `Klé n’est pas encore ouvert à ${place.city.name}.`);
    return { city: place.city };
  }

  private async approvedListingsCount(userId: string, tx: Tx) {
    const [row] = await tx
      .select({ n: count() })
      .from(listings)
      .where(and(eq(listings.publisherId, userId), isNotNull(listings.reviewedAt), isNull(listings.rejectionReason)));
    return row?.n ?? 0;
  }

  private async ownerExtras(row: ListingRow) {
    const [requests] = await this.db
      .select({ n: count() })
      .from(visitRequests)
      .where(eq(visitRequests.listingId, row.id));
    const media = await this.db.select().from(listingMedia).where(eq(listingMedia.listingId, row.id));
    return {
      exactAddress: row.exactAddress,
      location: { latitude: row.location.y, longitude: row.location.x },
      rejectionReason: row.rejectionReason,
      hiddenReason: row.hiddenReason,
      needsPostReview: row.needsPostReview,
      lastConfirmedAt: row.lastConfirmedAt,
      availabilityCheckPending: !!row.availabilityCheckSentAt,
      boostedUntil: row.boostedUntil,
      stats: { views: row.viewsCount, shares: row.sharesCount, visitRequests: requests?.n ?? 0, validatedVisits: row.validatedVisits },
      media: media.map((m) => ({ id: m.id, kind: m.kind, status: m.status, playbackUrl: m.playbackUrl })),
    };
  }

  private async ownerView(row: ListingRow, tx: Tx = this.db) {
    const [place] = await tx
      .select({ districtName: districts.name, cityName: cities.name })
      .from(districts)
      .innerJoin(cities, eq(cities.id, districts.cityId))
      .where(eq(districts.id, row.districtId));
    return {
      id: row.id,
      ref: row.ref,
      category: row.category,
      status: row.status,
      type: row.type,
      title: row.title,
      monthlyRent: row.monthlyRent,
      advanceMonths: row.advanceMonths,
      deposit: row.deposit,
      currency: row.currency,
      cityId: row.cityId,
      cityName: place?.cityName,
      districtId: row.districtId,
      districtName: place?.districtName,
      amenities: row.amenities,
      availableFrom: row.availableFrom,
      comingSoon: row.comingSoon,
      publishedAt: row.publishedAt,
      boostedUntil: row.boostedUntil,
      shareUrl: `${this.config.WEB_URL}/annonce/${row.ref}`,
      owner: await this.ownerExtras(row),
    };
  }
}
