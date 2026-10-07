/**
 * Données de démonstration pour le développement : un bailleur vérifié et quelques annonces
 * illustrées, visibles par tous. Refuse de s'exécuter en production.
 */
import { formatListingRef, type Amenities } from '@kle/shared';
import { and, eq, sql } from 'drizzle-orm';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { randomCode } from '../common/crypto.js';
import { createDatabase } from './db.module.js';
import { approximate, makePoint } from './geo.js';
import { cities, districts, listingMedia, listings, ownershipProofs, users } from './schema.js';
import { seedReferenceData } from './seed.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Les données de démonstration sont interdites en production.');
  process.exit(1);
}

const API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:3001';
const STORAGE = resolve(process.env.STORAGE_LOCAL_DIR ?? './storage');

const base: Amenities = {
  logement: { bedrooms: 1, livingRooms: 1, shower: 'interne', toilet: 'interne', kitchen: 'interne', furnished: false },
  batiment: { floor: 1, guardian: true, gate: true, fence: true, parking: false, yard: false, elevator: false },
  acces: { roadDistance: 'moins_100m', carAccessible: true, rainySeasonPassable: true },
  eauElectricite: { electricityMeter: 'individuel', waterMeter: 'individuel', waterSource: 'eau_courante', generator: false },
  confort: { airConditioning: false, waterHeater: true, balcony: false, wardrobes: true, tiles: true, ceiling: true },
  conditions: { acceptedProfiles: ['couple', 'personne_seule'], petsAllowed: false },
};

const DEMO = [
  { district: 'bonamoussadi', type: 'appartement', rent: 120_000, wall: '#d9c7a7', sofa: '#3f6b5a', amenities: { logement: { ...base.logement, bedrooms: 2, furnished: true }, confort: { ...base.confort, airConditioning: true, balcony: true } } },
  { district: 'akwa', type: 'studio', rent: 75_000, wall: '#c9d6df', sofa: '#8a4f3d', amenities: { batiment: { ...base.batiment, floor: 3, elevator: true } } },
  { district: 'makepe', type: 'chambre', rent: 30_000, wall: '#e6d5b8', sofa: '#5b6b8c', amenities: { logement: { ...base.logement, bedrooms: 1, livingRooms: 0, shower: 'externe', toilet: 'externe', kitchen: 'aucune' }, conditions: { acceptedProfiles: ['etudiant'], petsAllowed: false } } },
  { district: 'bonapriso', type: 'villa', rent: 400_000, wall: '#efe6d8', sofa: '#2f4858', amenities: { logement: { ...base.logement, bedrooms: 4, livingRooms: 2, furnished: true }, batiment: { ...base.batiment, floor: 0, parking: true, yard: true }, eauElectricite: { ...base.eauElectricite, waterSource: 'les_deux', generator: true }, confort: { ...base.confort, airConditioning: true, balcony: true }, conditions: { acceptedProfiles: ['famille'], petsAllowed: true } } },
] as const;

/** Illustration vectorielle d'une pièce (pas de vraie photo en développement). */
function roomSvg(wall: string, sofa: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1600">
  <rect width="900" height="1600" fill="${wall}"/>
  <rect x="140" y="260" width="380" height="420" rx="16" fill="#cfe6f5" stroke="#fff" stroke-width="22"/>
  <line x1="330" y1="260" x2="330" y2="680" stroke="#fff" stroke-width="14"/>
  <rect x="600" y="300" width="160" height="230" rx="10" fill="#fff" opacity=".55"/>
  <rect y="1040" width="900" height="560" fill="#b98d5f"/>
  <rect y="1040" width="900" height="18" fill="#8d6744"/>
  <rect x="120" y="840" width="660" height="230" rx="40" fill="${sofa}"/>
  <rect x="160" y="760" width="580" height="140" rx="36" fill="${sofa}" opacity=".85"/>
  <rect x="300" y="1180" width="300" height="40" rx="12" fill="#6b4a2f"/>
  <circle cx="720" cy="180" r="60" fill="#fff4cf"/>
</svg>`;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://kle:kle@localhost:5432/kle' });
  const db = createDatabase(pool);
  await seedReferenceData(db);
  const [city] = await db.select().from(cities).where(and(eq(cities.countryCode, 'CM'), eq(cities.code, 'DLA')));
  const now = new Date();
  const publishedAt = new Date(now.getTime() - 3 * 86_400_000);

  const phone = '+237699000111';
  let [landlord] = await db.select().from(users).where(eq(users.phone, phone));
  if (!landlord) {
    [landlord] = await db
      .insert(users)
      .values({
        phone,
        fullName: 'Paul Ekambi',
        roles: ['landlord'],
        kycStatus: 'approved',
        verifiedAt: now,
        referralCode: randomCode(),
        charterAcceptedAt: now,
        privacyAcceptedAt: now,
        createdAt: new Date(now.getTime() - 120 * 86_400_000),
      })
      .returning();
    await db.insert(ownershipProofs).values({
      userId: landlord!.id,
      role: 'landlord',
      proofType: 'utility_bill',
      fileKeys: ['private/proofs/demo/facture.pdf'],
      honorDeclaredAt: now,
      status: 'approved',
      decidedAt: now,
    });
  }

  const created: string[] = [];
  for (const demo of DEMO) {
    const [district] = await db
      .select()
      .from(districts)
      .where(and(eq(districts.cityId, city!.id), eq(districts.slug, demo.district)));
    const [seq] = await db
      .update(cities)
      .set({ listingSeq: sql`${cities.listingSeq} + 1` })
      .where(eq(cities.id, city!.id))
      .returning({ seq: cities.listingSeq });
    const ref = formatListingRef('CM', 'DLA', seq!.seq);
    const lat = district!.centroid!.y;
    const lng = district!.centroid!.x;
    const approx = approximate(lng, lat, ref);
    const [listing] = await db
      .insert(listings)
      .values({
        ref,
        publisherId: landlord!.id,
        status: 'published',
        type: demo.type,
        monthlyRent: demo.rent,
        advanceMonths: demo.rent > 200_000 ? 6 : 3,
        deposit: demo.rent,
        currency: 'XAF',
        cityId: city!.id,
        districtId: district!.id,
        exactAddress: `Adresse de démonstration, ${district!.name}`,
        location: makePoint(lng, lat),
        approxLocation: makePoint(approx.longitude, approx.latitude),
        amenities: { ...base, ...demo.amenities } as Amenities,
        publishedAt,
        lastConfirmedAt: now,
        reviewedAt: publishedAt,
        publicAlertsSentAt: now,
        validatedVisits: Math.floor(Math.random() * 4),
        createdAt: publishedAt,
      })
      .returning();
    const key = `listings/${listing!.id}/demo.svg`;
    await mkdir(join(STORAGE, 'public', 'listings', listing!.id), { recursive: true });
    await writeFile(join(STORAGE, 'public', key), roomSvg(demo.wall, demo.sofa));
    const url = `${API_URL}/media/${key}`;
    await db.insert(listingMedia).values({
      listingId: listing!.id,
      kind: 'photo',
      provider: 'storage',
      providerAssetId: key,
      playbackUrl: url,
      thumbnailUrl: url,
      status: 'ready',
      capturedInApp: true,
    });
    created.push(ref);
  }
  console.log(`Annonces de démonstration publiées : ${created.join(', ')}`);
  await pool.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
