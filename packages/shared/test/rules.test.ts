import { describe, expect, it } from 'vitest';
import {
  availabilityCheckState,
  canCreateAlert,
  canViewListing,
  checkVisitEligibility,
  compareWithAgent,
  computePackPeriod,
  computeSuccessFee,
  createListingSchema,
  feedScore,
  formatListingRef,
  formatMoney,
  isExactAddressVisible,
  namesMatch,
  normalizePhone,
  parseListingRef,
  sanctionFor,
  staffCan,
  trustScore,
  waitlistSignupSchema,
  type VisitEligibilityInput,
} from '../src/index.js';

const now = new Date('2026-10-07T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe('frais de réussite', () => {
  it('reprend les exemples du document', () => {
    expect(computeSuccessFee(30_000)).toBe(3_000);
    expect(computeSuccessFee(150_000)).toBe(15_000);
    expect(computeSuccessFee(400_000)).toBe(40_000);
  });

  it('permet de passer à 12 ou 15 %', () => {
    expect(computeSuccessFee(150_000, 1_200)).toBe(18_000);
    expect(computeSuccessFee(150_000, 1_500)).toBe(22_500);
  });

  it('refuse un loyer négatif', () => {
    expect(() => computeSuccessFee(-1)).toThrow(RangeError);
  });

  it('calcule le comparatif agent / Klé', () => {
    const c = compareWithAgent(150_000, 'confort');
    expect(c).toMatchObject({ agentCommission: 150_000, packPrice: 10_000, successFee: 15_000, kleTotal: 25_000 });
    expect(c.savings).toBe(125_000);
    expect(compareWithAgent(400_000, 'premium').kleTotal).toBe(65_000);
    expect(compareWithAgent(30_000, 'essentiel').kleTotal).toBe(8_000);
  });
});

describe('identifiant de logement', () => {
  it('formate et relit KLE-CM-DLA-000123', () => {
    const ref = formatListingRef('CM', 'DLA', 123);
    expect(ref).toBe('KLE-CM-DLA-000123');
    expect(parseListingRef(ref)).toEqual({ countryCode: 'CM', cityCode: 'DLA', sequence: 123 });
    expect(parseListingRef('kle-cm-dla-000123')).not.toBeNull();
    expect(parseListingRef('KLE-CM-DLA-12')).toBeNull();
  });

  it('refuse les codes invalides', () => {
    expect(() => formatListingRef('CMR', 'DLA', 1)).toThrow();
    expect(() => formatListingRef('CM', 'DLA', 0)).toThrow();
  });
});

describe('packs', () => {
  it('démarre un premier pack tout de suite pour 30 jours', () => {
    const p = computePackPeriod('confort', now, null);
    expect(p.startsAt).toEqual(now);
    expect(p.endsAt.getTime() - now.getTime()).toBe(30 * 86_400_000);
  });

  it('prolonge le pack en cours pour un renouvellement', () => {
    const endsAt = new Date(now.getTime() + 2 * 86_400_000);
    const p = computePackPeriod('confort', now, { tier: 'confort', endsAt });
    expect(p.startsAt).toEqual(endsAt);
  });

  it('remplace immédiatement par un pack supérieur', () => {
    const endsAt = new Date(now.getTime() + 2 * 86_400_000);
    const p = computePackPeriod('premium', now, { tier: 'essentiel', endsAt });
    expect(p.startsAt).toEqual(now);
    expect(p.replacesCurrent).toBe(true);
  });

  it('limite les alertes selon le pack', () => {
    expect(canCreateAlert(null, 0)).toBe(false);
    expect(canCreateAlert('essentiel', 0)).toBe(true);
    expect(canCreateAlert('essentiel', 1)).toBe(false);
    expect(canCreateAlert('confort', 4)).toBe(true);
    expect(canCreateAlert('confort', 5)).toBe(false);
    expect(canCreateAlert('premium', 500)).toBe(true);
  });
});

describe('visibilité des annonces', () => {
  it('montre les nouvelles annonces au Premium 24 h avant tout le monde', () => {
    const fresh = { category: 'rental' as const, publishedAt: hoursAgo(2), now };
    expect(canViewListing({ ...fresh, viewerTier: 'premium' })).toBe(true);
    expect(canViewListing({ ...fresh, viewerTier: 'confort' })).toBe(false);
    expect(canViewListing({ ...fresh, viewerTier: null })).toBe(false);
    expect(canViewListing({ ...fresh, viewerTier: null, viewerIsPublisher: true })).toBe(true);
    expect(canViewListing({ ...fresh, publishedAt: hoursAgo(25), viewerTier: null })).toBe(true);
  });

  it('réserve « Bientôt disponible » au Confort et au Premium, le Premium en premier', () => {
    const soon = { category: 'coming_soon' as const, now };
    expect(canViewListing({ ...soon, publishedAt: hoursAgo(100), viewerTier: null })).toBe(false);
    expect(canViewListing({ ...soon, publishedAt: hoursAgo(100), viewerTier: 'essentiel' })).toBe(false);
    expect(canViewListing({ ...soon, publishedAt: hoursAgo(100), viewerTier: 'confort' })).toBe(true);
    expect(canViewListing({ ...soon, publishedAt: hoursAgo(1), viewerTier: 'confort' })).toBe(false);
    expect(canViewListing({ ...soon, publishedAt: hoursAgo(1), viewerTier: 'premium' })).toBe(true);
  });
});

describe('demande de visite', () => {
  const ok: VisitEligibilityInput = {
    accountStatus: 'active',
    kycApproved: true,
    hasActivePack: true,
    requestsRemaining: 5,
    scheduledVisits: 0,
    visitsAwaitingOutcome: 0,
    isOwnListing: false,
    alreadyRequested: false,
    listingVisible: true,
  };

  it('accepte un chercheur vérifié avec un pack', () => {
    expect(checkVisitEligibility(ok)).toEqual({ ok: true });
  });

  it.each([
    [{ hasActivePack: false }, 'pack_required'],
    [{ kycApproved: false }, 'kyc_required'],
    [{ requestsRemaining: 0 }, 'no_requests_left'],
    [{ scheduledVisits: 3 }, 'too_many_scheduled'],
    [{ visitsAwaitingOutcome: 1 }, 'outcome_required'],
    [{ isOwnListing: true }, 'own_listing'],
    [{ accountStatus: 'frozen' as const }, 'account_not_active'],
    [{ listingVisible: false }, 'listing_unavailable'],
  ])('refuse %o (%s)', (patch, reason) => {
    const result = checkVisitEligibility({ ...ok, ...patch });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(reason);
  });

  it("n'affiche l'adresse qu'après acceptation et jusqu'à peu après la visite", () => {
    const slot = hoursAgo(-24);
    expect(isExactAddressVisible('pending', slot, now)).toBe(false);
    expect(isExactAddressVisible('accepted', slot, now)).toBe(true);
    expect(isExactAddressVisible('accepted', hoursAgo(7), now)).toBe(false);
    expect(isExactAddressVisible('validated', slot, now)).toBe(false);
  });
});

describe('charte et sanctions', () => {
  it('applique les échelles du tableau', () => {
    expect(sanctionFor('listing_taken_not_updated', 0).kind).toBe('warning');
    expect(sanctionFor('listing_taken_not_updated', 1).kind).toBe('listing_hidden');
    expect(sanctionFor('price_mismatch', 1)).toEqual({ kind: 'suspension', days: 30 });
    expect(sanctionFor('money_before_visit', 0).kind).toBe('permanent_ban');
    expect(sanctionFor('fake_listing', 0).authoritiesOnRequest).toBe(true);
    expect(sanctionFor('account_sharing', 0)).toEqual({ kind: 'suspension', days: 30 });
    expect(sanctionFor('account_sharing', 5).kind).toBe('permanent_ban');
  });

  it('hiérarchise les droits du back-office', () => {
    expect(staffCan('moderator', 'moderator')).toBe(true);
    expect(staffCan('moderator', 'supervisor')).toBe(false);
    expect(staffCan('admin', 'supervisor')).toBe(true);
    expect(staffCan(null, 'moderator')).toBe(false);
  });
});

describe('disponibilité', () => {
  const day = 86_400_000;
  it('demande une confirmation tous les 15 jours puis masque après 72 h', () => {
    const confirmed = new Date(now.getTime() - 10 * day);
    expect(availabilityCheckState(confirmed, null, now)).toBe('fresh');
    const old = new Date(now.getTime() - 16 * day);
    expect(availabilityCheckState(old, null, now)).toBe('due');
    expect(availabilityCheckState(old, hoursAgo(10), now)).toBe('awaiting_answer');
    expect(availabilityCheckState(old, hoursAgo(73), now)).toBe('expired');
  });
});

describe('téléphone', () => {
  it('normalise les numéros camerounais', () => {
    expect(normalizePhone('699 12 34 56')).toBe('+237699123456');
    expect(normalizePhone('+237 6 99 12 34 56')).toBe('+237699123456');
    expect(normalizePhone('00237699123456')).toBe('+237699123456');
    expect(normalizePhone('237699123456')).toBe('+237699123456');
    expect(normalizePhone('599123456')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });

  it('accepte les autres pays configurés', () => {
    expect(normalizePhone('+2250701020304')).toBe('+2250701020304');
    expect(normalizePhone('+22890123456')).toBe('+22890123456');
  });
});

describe('noms Mobile Money', () => {
  it("compare le nom du payeur à celui de la pièce", () => {
    expect(namesMatch('NGONO Marie Claire', 'Marie-Claire Ngono')).toBe(true);
    expect(namesMatch('Éric TCHOUA', 'eric tchoua')).toBe(true);
    expect(namesMatch('Paul Biya', 'Samuel Etoo')).toBe(false);
  });
});

describe('fil vidéo', () => {
  const base = {
    cityId: 'dla',
    districtId: 'akwa',
    monthlyRent: 100_000,
    publishedAt: hoursAgo(30),
    publisherTrust: 0.5,
    validatedVisits: 0,
    boostedUntil: null,
  };
  it('favorise la ville, le budget, les quartiers et les boosts', () => {
    const prefs = { cityId: 'dla', budgetMax: 120_000, districtIds: ['akwa'] };
    const s = feedScore(base, prefs, now);
    expect(feedScore({ ...base, cityId: 'yao' }, prefs, now)).toBeLessThan(s);
    expect(feedScore({ ...base, monthlyRent: 200_000 }, prefs, now)).toBeLessThan(s);
    expect(feedScore({ ...base, districtId: 'bali' }, prefs, now)).toBeLessThan(s);
    expect(feedScore({ ...base, boostedUntil: hoursAgo(-48) }, prefs, now)).toBeGreaterThan(s);
    expect(feedScore({ ...base, validatedVisits: 3 }, prefs, now)).toBeGreaterThan(s);
  });

  it('borne le score de confiance entre 0 et 1', () => {
    expect(trustScore({ averageRating: 5, reviewsCount: 20, accountAgeDays: 400, confirmedRentals: 10, sanctions: 0 })).toBe(1);
    expect(trustScore({ averageRating: 1, reviewsCount: 20, accountAgeDays: 0, confirmedRentals: 0, sanctions: 4 })).toBe(0);
  });
});

describe('schémas', () => {
  it("valide une inscription à la liste d'attente", () => {
    const parsed = waitlistSignupSchema.parse({
      role: 'landlord',
      fullName: 'Jean Mbarga',
      phone: '6 99 12 34 56',
      consent: true,
      survey: { vacantUnits: 3, canFilmVideo: true },
    });
    expect(parsed.phone).toBe('+237699123456');
    expect(parsed.city).toBe('Douala');
    expect(parsed.survey).toEqual({ vacantUnits: 3, canFilmVideo: true });
  });

  it('exige le consentement explicite', () => {
    const r = waitlistSignupSchema.safeParse({ role: 'seeker', fullName: 'A B', phone: '699123456', consent: false });
    expect(r.success).toBe(false);
  });

  it('exige les champs du sortant pour « Bientôt disponible »', () => {
    const listing = {
      type: 'studio',
      monthlyRent: 60_000,
      advanceMonths: 3,
      deposit: 60_000,
      cityId: '0b6f3c9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f',
      districtId: '1b6f3c9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f',
      exactAddress: 'Rue des Palmiers, Akwa',
      latitude: 4.05,
      longitude: 9.7,
      availableFrom: null,
      category: 'coming_soon',
      amenities: {
        logement: { bedrooms: 1, livingRooms: 1, shower: 'interne', toilet: 'interne', kitchen: 'interne', furnished: false },
        batiment: { floor: 1, guardian: true, gate: true, fence: true, parking: false, yard: false, elevator: false },
        acces: { roadDistance: 'moins_100m', carAccessible: true, rainySeasonPassable: true },
        eauElectricite: { electricityMeter: 'individuel', waterMeter: 'individuel', waterSource: 'eau_courante', generator: false },
        confort: { airConditioning: false, waterHeater: true, balcony: false, wardrobes: true, tiles: true, ceiling: true },
        conditions: { acceptedProfiles: ['etudiant', 'couple'], petsAllowed: false },
      },
    };
    expect(createListingSchema.safeParse(listing).success).toBe(false);
    const ok = createListingSchema.safeParse({
      ...listing,
      comingSoon: { departureDate: '2026-12-01', landlordInformed: true },
    });
    expect(ok.success).toBe(true);
  });

  it('formate les montants en FCFA', () => {
    expect(formatMoney(150_000)).toBe('150 000 FCFA');
  });
});
