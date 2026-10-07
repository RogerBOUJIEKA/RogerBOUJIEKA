import type { ListingCategory } from './listing.js';
import { PACKS, type PackTier } from './packs.js';

/** Fenêtre pendant laquelle le Premium voit seul les nouvelles annonces. */
export const PREMIUM_EARLY_ACCESS_HOURS = 24;

export interface ListingVisibilityInput {
  category: ListingCategory;
  publishedAt: Date;
  /** Pack actif du visiteur ; `null` pour un visiteur sans pack ou non inscrit. */
  viewerTier: PackTier | null;
  viewerIsPublisher?: boolean;
  now: Date;
}

/**
 * Tout le monde regarde les annonces gratuitement, sauf :
 * - les nouvelles annonces, montrées au Premium 24 h avant tout le monde ;
 * - les annonces « Bientôt disponible », réservées au Confort et au Premium (le Premium en premier).
 */
export function canViewListing(input: ListingVisibilityInput): boolean {
  if (input.viewerIsPublisher) return true;
  const ageHours = (input.now.getTime() - input.publishedAt.getTime()) / 3_600_000;
  const premium = input.viewerTier === 'premium';
  const pastEarlyWindow = premium || ageHours >= PREMIUM_EARLY_ACCESS_HOURS;

  if (input.category === 'coming_soon') {
    const access = input.viewerTier ? PACKS[input.viewerTier].comingSoon : 'none';
    if (access === 'none') return false;
    return access === 'first' || pastEarlyWindow;
  }
  return pastEarlyWindow;
}

/** Date à partir de laquelle une annonce est visible par tous (hors « Bientôt disponible »). */
export function publicVisibilityDate(publishedAt: Date): Date {
  return new Date(publishedAt.getTime() + PREMIUM_EARLY_ACCESS_HOURS * 3_600_000);
}
