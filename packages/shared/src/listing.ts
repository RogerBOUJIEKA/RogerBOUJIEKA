import { z } from 'zod';

export const HOUSING_TYPES = ['chambre', 'studio', 'appartement', 'maison', 'villa', 'duplex'] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  chambre: 'Chambre',
  studio: 'Studio',
  appartement: 'Appartement',
  maison: 'Maison',
  villa: 'Villa',
  duplex: 'Duplex',
};

/** `rental` : logement à louer. `coming_soon` : annonce d'un sortant (« Bientôt disponible »). */
export const LISTING_CATEGORIES = ['rental', 'coming_soon'] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const LISTING_STATUSES = [
  'draft',
  'pending_review', // relue avant publication (nouveaux comptes)
  'published',
  'rejected',
  'taken', // « Pris »
  'hidden', // masquée faute de confirmation de disponibilité, ou sanction
  'removed', // retirée par le publiant
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Statut affiché sur la fiche : Disponible, Bientôt disponible ou Pris. */
export function displayAvailability(
  status: ListingStatus,
  category: ListingCategory,
  availableFrom: Date | null,
  now: Date,
): 'Disponible' | 'Bientôt disponible' | 'Pris' {
  if (status === 'taken') return 'Pris';
  if (category === 'coming_soon') return 'Bientôt disponible';
  if (availableFrom && availableFrom > now) return 'Bientôt disponible';
  return 'Disponible';
}

const placement = z.enum(['interne', 'externe']);

/**
 * Détails à cocher par le bailleur : il ne rédige rien, il coche ce qui existe.
 * Tout est visible par le chercheur avant même de contacter.
 */
export const amenitiesSchema = z.object({
  logement: z.object({
    bedrooms: z.number().int().min(0).max(20),
    livingRooms: z.number().int().min(0).max(10),
    shower: placement,
    toilet: placement,
    kitchen: z.enum(['interne', 'externe', 'aucune']),
    furnished: z.boolean(),
  }),
  batiment: z.object({
    /** 0 = rez-de-chaussée. */
    floor: z.number().int().min(0).max(50),
    guardian: z.boolean(),
    gate: z.boolean(),
    fence: z.boolean(),
    parking: z.boolean(),
    yard: z.boolean(),
    elevator: z.boolean(),
  }),
  acces: z.object({
    roadDistance: z.enum(['bord_de_route', 'moins_100m', '100_500m', 'plus_500m']),
    carAccessible: z.boolean(),
    rainySeasonPassable: z.boolean(),
  }),
  eauElectricite: z.object({
    electricityMeter: z.enum(['individuel', 'partage']),
    waterMeter: z.enum(['individuel', 'partage']),
    waterSource: z.enum(['eau_courante', 'forage', 'les_deux']),
    generator: z.boolean(),
  }),
  confort: z.object({
    airConditioning: z.boolean(),
    waterHeater: z.boolean(),
    balcony: z.boolean(),
    wardrobes: z.boolean(),
    tiles: z.boolean(),
    ceiling: z.boolean(),
  }),
  conditions: z.object({
    acceptedProfiles: z.array(z.enum(['etudiant', 'couple', 'famille', 'personne_seule'])).min(1),
    petsAllowed: z.boolean(),
  }),
});
export type Amenities = z.infer<typeof amenitiesSchema>;

export const ROAD_DISTANCE_LABELS: Record<Amenities['acces']['roadDistance'], string> = {
  bord_de_route: 'Bord de route',
  moins_100m: 'Moins de 100 m de la route',
  '100_500m': 'De 100 à 500 m de la route',
  plus_500m: 'Plus de 500 m de la route',
};

export function floorLabel(floor: number): string {
  if (floor === 0) return 'Rez-de-chaussée';
  return floor === 1 ? '1er étage' : `${floor}e étage`;
}

const money = z.number().int().min(0).max(100_000_000);

/** Écran 2 — Informations. */
export const listingInfoSchema = z.object({
  type: z.enum(HOUSING_TYPES),
  monthlyRent: money.min(1_000),
  advanceMonths: z.number().int().min(0).max(24),
  deposit: money,
  cityId: z.uuid(),
  districtId: z.uuid(),
  /** Adresse exacte : jamais publiée, révélée au chercheur après acceptation de la visite. */
  exactAddress: z.string().trim().min(5).max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Écran 4 — Disponibilité : immédiate ou à une date. */
export const listingAvailabilitySchema = z.object({
  availableFrom: z.coerce.date().nullable(),
});

/** Champs en plus pour un sortant (« Bientôt disponible »). */
export const comingSoonSchema = z.object({
  departureDate: z.coerce.date(),
  reason: z.string().trim().max(300).optional(),
  landlordConditions: z.string().trim().max(1000).optional(),
  /** Contrepartie demandée par le sortant (la « relève »), en FCFA. */
  handoverAmount: money.default(0),
  landlordInformed: z.literal(true, {
    error: 'Le sortant doit confirmer que son bailleur est informé.',
  }),
});

export const createListingSchema = listingInfoSchema
  .extend({
    category: z.enum(LISTING_CATEGORIES).default('rental'),
    amenities: amenitiesSchema,
    title: z.string().trim().max(120).optional(),
    comingSoon: comingSoonSchema.optional(),
    ...listingAvailabilitySchema.shape,
  })
  .refine((v) => v.category !== 'coming_soon' || v.comingSoon !== undefined, {
    message: 'Une annonce « Bientôt disponible » demande la date de départ et l’accord du bailleur.',
    path: ['comingSoon'],
  });
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const listingSearchSchema = z.object({
  cityId: z.uuid().optional(),
  districtIds: z
    .union([z.uuid(), z.array(z.uuid())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  type: z.enum(HOUSING_TYPES).optional(),
  minRent: z.coerce.number().int().min(0).optional(),
  maxRent: z.coerce.number().int().min(0).optional(),
  availableBefore: z.coerce.date().optional(),
  furnished: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  /** Zone visible de la carte : ouest,sud,est,nord. */
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/)
    .transform((v) => v.split(',').map(Number) as [number, number, number, number])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListingSearchInput = z.infer<typeof listingSearchSchema>;

/** Annonces d'un nouveau compte relues avant publication ; publication directe après 3 annonces validées. */
export const AUTO_PUBLISH_AFTER_APPROVED_LISTINGS = 3;

export function requiresPrePublicationReview(approvedListingsCount: number): boolean {
  return approvedListingsCount < AUTO_PUBLISH_AFTER_APPROVED_LISTINGS;
}
