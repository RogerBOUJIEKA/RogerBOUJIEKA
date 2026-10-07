import type { Amount } from './money.js';

export const PACK_TIERS = ['essentiel', 'confort', 'premium'] as const;
export type PackTier = (typeof PACK_TIERS)[number];

export type AlertChannel = 'in_app' | 'whatsapp';

export interface PackDefinition {
  tier: PackTier;
  label: string;
  /** Phrase de vente affichée sur l'écran des packs. */
  tagline: string;
  durationDays: number;
  /** Demandes de visite incluses sur la durée du pack. */
  visitRequests: number;
  /** Nombre d'alertes de recherche ; `null` = illimitées. */
  maxAlerts: number | null;
  alertChannels: AlertChannel[];
  /** Alertes WhatsApp envoyées immédiatement (Premium) plutôt qu'en résumé. */
  instantAlerts: boolean;
  /** Accès aux annonces « Bientôt disponible ». */
  comingSoon: 'none' | 'yes' | 'first';
  /** Le Premium voit les nouvelles annonces 24 h avant tout le monde. */
  earlyAccessHours: number;
  /** Mise en avant de la demande chez le bailleur. */
  landlordHighlight: 'none' | 'serious_badge' | 'top';
  weeklyAdvisor: boolean;
  /** Jours offerts si rien n'est trouvé pendant la durée du pack. */
  notFoundBonusDays: number;
  /** Mis en avant comme « le plus choisi ». */
  recommended: boolean;
}

export const PACKS: Record<PackTier, PackDefinition> = {
  essentiel: {
    tier: 'essentiel',
    label: 'Essentiel',
    tagline: 'Commence ta recherche sans agent.',
    durationDays: 30,
    visitRequests: 10,
    maxAlerts: 1,
    alertChannels: ['in_app'],
    instantAlerts: false,
    comingSoon: 'none',
    earlyAccessHours: 0,
    landlordHighlight: 'none',
    weeklyAdvisor: false,
    notFoundBonusDays: 0,
    recommended: false,
  },
  confort: {
    tier: 'confort',
    label: 'Confort',
    tagline: 'Sois prévenu avant les autres.',
    durationDays: 30,
    visitRequests: 30,
    maxAlerts: 5,
    alertChannels: ['in_app', 'whatsapp'],
    instantAlerts: false,
    comingSoon: 'yes',
    earlyAccessHours: 0,
    landlordHighlight: 'serious_badge',
    weeklyAdvisor: false,
    notFoundBonusDays: 0,
    recommended: true,
  },
  premium: {
    tier: 'premium',
    label: 'Premium',
    tagline: 'Les meilleures maisons, 24 h avant tout le monde.',
    durationDays: 30,
    visitRequests: 60,
    maxAlerts: null,
    alertChannels: ['in_app', 'whatsapp'],
    instantAlerts: true,
    comingSoon: 'first',
    earlyAccessHours: 24,
    landlordHighlight: 'top',
    weeklyAdvisor: true,
    notFoundBonusDays: 15,
    recommended: false,
  },
};

/** Prix par défaut au Cameroun ; chaque pays peut les surcharger dans sa configuration. */
export const DEFAULT_PACK_PRICES: Record<PackTier, Amount> = {
  essentiel: 5_000,
  confort: 10_000,
  premium: 25_000,
};

const TIER_RANK: Record<PackTier, number> = { essentiel: 1, confort: 2, premium: 3 };

export function compareTiers(a: PackTier, b: PackTier): number {
  return TIER_RANK[a] - TIER_RANK[b];
}

/** Rappel de renouvellement envoyé 3 jours avant l'expiration. */
export const PACK_RENEWAL_REMINDER_DAYS = 3;

/** Parrainage : 7 jours offerts au parrain pour chaque ami qui achète un pack. */
export const REFERRAL_BONUS_DAYS = 7;

/** Garantie Klé : pack prolongé de 30 jours si une annonce vérifiée se révèle fausse. */
export const FAKE_LISTING_GUARANTEE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export interface ActivePackSummary {
  tier: PackTier;
  endsAt: Date;
}

/**
 * Période d'un pack acheté. Un pack de niveau supérieur démarre tout de suite et remplace
 * l'actuel ; sinon il prolonge le pack en cours (renouvellement).
 */
export function computePackPeriod(
  tier: PackTier,
  now: Date,
  current: ActivePackSummary | null,
): { startsAt: Date; endsAt: Date; replacesCurrent: boolean } {
  const duration = PACKS[tier].durationDays;
  if (!current || current.endsAt <= now || compareTiers(tier, current.tier) > 0) {
    return { startsAt: now, endsAt: addDays(now, duration), replacesCurrent: !!current };
  }
  return {
    startsAt: current.endsAt,
    endsAt: addDays(current.endsAt, duration),
    replacesCurrent: false,
  };
}

export function canCreateAlert(tier: PackTier | null, existingAlerts: number): boolean {
  if (!tier) return false;
  const max = PACKS[tier].maxAlerts;
  return max === null || existingAlerts < max;
}
