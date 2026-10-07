import {
  HOUSING_TYPE_LABELS,
  compareWithAgent,
  displayAvailability,
  type PackTier,
} from '@kle/shared';
import type { cities, districts, listingMedia, listings } from '../db/schema.js';
import { displayName, type ProfileStats } from '../users/profiles.service.js';

export type ListingRow = typeof listings.$inferSelect;
export type MediaRow = typeof listingMedia.$inferSelect;

const FEMININE = new Set(['chambre', 'maison', 'villa']);

export function listingTitle(type: ListingRow['type'], furnished: boolean, districtName: string): string {
  const furnishedLabel = furnished ? (FEMININE.has(type) ? ' meublée' : ' meublé') : '';
  return `${HOUSING_TYPE_LABELS[type]}${furnishedLabel} à ${districtName}`;
}

export interface ViewContext {
  now: Date;
  webUrl: string;
  viewerTier: PackTier | null;
  packPrices: Record<PackTier, number>;
  successFeeBps: number;
}

/** Fiche publique : jamais d'adresse exacte ni de position précise. */
export function presentListing(
  row: ListingRow,
  extra: {
    city: Pick<typeof cities.$inferSelect, 'id' | 'name'>;
    district: Pick<typeof districts.$inferSelect, 'id' | 'name'>;
    media: MediaRow[];
    publisher: { id: string; fullName: string | null; stats?: ProfileStats };
    isFavorite?: boolean;
  },
  ctx: ViewContext,
) {
  const stats = extra.publisher.stats;
  return {
    id: row.id,
    ref: row.ref,
    category: row.category,
    status: row.status,
    availability: displayAvailability(row.status, row.category, row.availableFrom, ctx.now),
    type: row.type,
    title: row.title ?? listingTitle(row.type, row.amenities.logement.furnished, extra.district.name),
    monthlyRent: row.monthlyRent,
    advanceMonths: row.advanceMonths,
    deposit: row.deposit,
    currency: row.currency,
    city: extra.city,
    district: extra.district,
    approxLocation: { latitude: row.approxLocation.y, longitude: row.approxLocation.x },
    amenities: row.amenities,
    availableFrom: row.availableFrom,
    comingSoon: row.comingSoon
      ? {
          ...row.comingSoon,
          warning: 'Rencontrez le bailleur avant de verser quoi que ce soit au sortant.',
        }
      : null,
    media: extra.media
      .filter((m) => m.status === 'ready')
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        kind: m.kind,
        playbackUrl: m.playbackUrl,
        thumbnailUrl: m.thumbnailUrl,
        durationSeconds: m.durationSeconds,
        capturedInApp: m.capturedInApp,
      })),
    publisher: {
      id: extra.publisher.id,
      displayName: displayName(extra.publisher.fullName),
      verified: stats?.verified ?? false,
      averageRating: stats?.averageRating ?? null,
      reviewsCount: stats?.reviewsCount ?? 0,
      listingsCount: stats?.listingsCount ?? 0,
      rentedCount: stats?.rentedCount ?? 0,
      memberSince: stats?.memberSince ?? null,
      trustedLandlord: stats?.trustedLandlord ?? false,
    },
    /** « Agent : 150 000 FCFA + visites. Klé : ton pack + 15 000 FCFA. » */
    comparison: compareWithAgent(
      row.monthlyRent,
      ctx.viewerTier ?? 'confort',
      ctx.packPrices,
      ctx.successFeeBps,
    ),
    badges: [
      ...(stats?.verified ? ['verified'] : []),
      ...(row.category === 'coming_soon' ? ['coming_soon'] : []),
    ],
    validatedVisits: row.validatedVisits,
    boosted: !!row.boostedUntil && row.boostedUntil > ctx.now,
    publishedAt: row.publishedAt,
    shareUrl: `${ctx.webUrl}/annonce/${row.ref}`,
    isFavorite: extra.isFavorite ?? false,
  };
}

export type ListingView = ReturnType<typeof presentListing>;
