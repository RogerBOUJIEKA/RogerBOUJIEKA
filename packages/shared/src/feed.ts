/**
 * Ordre du fil en V1 : ville, budget, quartiers préférés, annonces récentes,
 * score de confiance du publiant. (En V2 : personnalisation selon les vidéos regardées.)
 */
export interface FeedCandidate {
  cityId: string;
  districtId: string;
  monthlyRent: number;
  publishedAt: Date;
  /** Score de confiance du publiant, entre 0 et 1. */
  publisherTrust: number;
  /** Visites validées par QR code : elles font monter l'annonce. */
  validatedVisits: number;
  boostedUntil: Date | null;
}

export interface FeedPreferences {
  cityId?: string;
  budgetMax?: number;
  districtIds?: string[];
}

export function feedScore(c: FeedCandidate, prefs: FeedPreferences, now: Date): number {
  let score = 0;
  if (prefs.cityId) score += c.cityId === prefs.cityId ? 50 : -50;
  if (prefs.budgetMax) {
    if (c.monthlyRent <= prefs.budgetMax) score += 30;
    else if (c.monthlyRent <= prefs.budgetMax * 1.15) score += 10;
    else score -= 20;
  }
  if (prefs.districtIds?.includes(c.districtId)) score += 20;

  const ageDays = Math.max(0, (now.getTime() - c.publishedAt.getTime()) / 86_400_000);
  score += 25 * Math.exp(-ageDays / 7);
  score += 15 * Math.min(1, Math.max(0, c.publisherTrust));

  // Les annonces avec visites validées montent ; sans visite validée, elles descendent.
  score += 2 * Math.min(c.validatedVisits, 5);
  if (c.validatedVisits === 0 && ageDays > 14) score -= 5;

  if (c.boostedUntil && c.boostedUntil > now) score += 40;
  return score;
}

export interface TrustInput {
  averageRating: number | null;
  reviewsCount: number;
  accountAgeDays: number;
  confirmedRentals: number;
  sanctions: number;
}

/** Score de confiance d'un publiant (0 à 1) : note, ancienneté, locations confirmées, sanctions. */
export function trustScore(t: TrustInput): number {
  const rating = t.averageRating && t.reviewsCount > 0 ? (t.averageRating - 1) / 4 : 0.5;
  const ratingWeight = Math.min(1, t.reviewsCount / 5);
  const ratingPart = 0.5 * (ratingWeight * rating + (1 - ratingWeight) * 0.5);
  const seniority = 0.2 * Math.min(1, t.accountAgeDays / 180);
  const rentals = 0.3 * Math.min(1, t.confirmedRentals / 5);
  const penalty = 0.25 * t.sanctions;
  return Math.max(0, Math.min(1, ratingPart + seniority + rentals - penalty));
}

/** Badge « Bailleur de confiance » (V2) : au moins 5 locations confirmées et aucune sanction. */
export function isTrustedLandlord(confirmedRentals: number, sanctions: number): boolean {
  return confirmedRentals >= 5 && sanctions === 0;
}

/** Boost d'annonce optionnel : 1 000 FCFA pour 7 jours en tête du fil du quartier. */
export const LISTING_BOOST = { price: 1_000, days: 7 } as const;
