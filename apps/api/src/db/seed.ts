import { COUNTRIES, DEFAULT_PACK_PRICES } from '@kle/shared';
import { and, eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { generateTotpSecret, randomCode, totpUri } from '../common/crypto.js';
import { createDatabase, type Database } from './db.module.js';
import { makePoint } from './geo.js';
import { cities, countries, districts, users } from './schema.js';

interface CitySeed {
  code: string;
  name: string;
  active: boolean;
  center: [number, number];
  /** Quartiers et centre approximatif [latitude, longitude] — à affiner sur le terrain. */
  districts: Array<[string, number, number]>;
}

/** La V1 se lance à Douala ; Yaoundé et Bafoussam s'ouvrent en V2 par simple activation. */
const CAMEROON_CITIES: CitySeed[] = [
  {
    code: 'DLA',
    name: 'Douala',
    active: true,
    center: [4.0511, 9.7085],
    districts: [
      ['Akwa', 4.0511, 9.7008],
      ['Akwa Nord', 4.064, 9.717],
      ['Bonanjo', 4.0436, 9.6894],
      ['Bonapriso', 4.0328, 9.6942],
      ['Bali', 4.0395, 9.702],
      ['Deïdo', 4.0631, 9.7058],
      ['Bonabéri', 4.074, 9.662],
      ['New Bell', 4.038, 9.712],
      ['Bessengue', 4.048, 9.716],
      ['Bépanda', 4.056, 9.727],
      ['Ndokotti', 4.045, 9.738],
      ['Ndogbong', 4.056, 9.748],
      ['Cité des Palmiers', 4.063, 9.748],
      ['Makepe', 4.07, 9.754],
      ['Bonamoussadi', 4.09, 9.747],
      ['Kotto', 4.078, 9.765],
      ['Logpom', 4.082, 9.76],
      ['Logbessou', 4.097, 9.772],
      ['Yassa', 4.009, 9.801],
      ['Japoma', 3.995, 9.815],
    ],
  },
  { code: 'YAO', name: 'Yaoundé', active: false, center: [3.848, 11.5021], districts: [] },
  { code: 'BFS', name: 'Bafoussam', active: false, center: [5.4781, 10.4176], districts: [] },
];

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Pays, villes et quartiers. Idempotent : peut être relancé sans doublon. */
export async function seedReferenceData(db: Database): Promise<void> {
  for (const country of Object.values(COUNTRIES)) {
    await db
      .insert(countries)
      .values({
        code: country.code,
        name: country.name,
        currency: country.currency,
        dialCode: country.dialCode,
        active: country.code === 'CM',
        packPrices: DEFAULT_PACK_PRICES,
      })
      .onConflictDoNothing();
  }
  for (const city of CAMEROON_CITIES) {
    await db
      .insert(cities)
      .values({
        countryCode: 'CM',
        code: city.code,
        name: city.name,
        active: city.active,
        centroid: makePoint(city.center[1], city.center[0]),
      })
      .onConflictDoNothing();
    const [row] = await db
      .select({ id: cities.id })
      .from(cities)
      .where(and(eq(cities.countryCode, 'CM'), eq(cities.code, city.code)));
    for (const [name, lat, lng] of city.districts) {
      await db
        .insert(districts)
        .values({ cityId: row!.id, name, slug: slugify(name), centroid: makePoint(lng, lat) })
        .onConflictDoNothing();
    }
  }
}

/** Crée (ou promeut) un compte de l'équipe et affiche le lien de double authentification. */
export async function seedStaff(db: Database, phone: string, role: 'moderator' | 'supervisor' | 'admin') {
  const secret = generateTotpSecret();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
  if (existing) {
    await db.update(users).set({ staffRole: role, totpSecret: secret }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      phone,
      staffRole: role,
      totpSecret: secret,
      referralCode: randomCode(),
      fullName: 'Équipe Klé',
    });
  }
  return { secret, uri: totpUri(secret, phone) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgres://kle:kle@localhost:5432/kle',
  });
  const db = createDatabase(pool);
  (async () => {
    await seedReferenceData(db);
    console.log('Pays, villes et quartiers chargés.');
    const adminPhone = process.env.SEED_ADMIN_PHONE;
    if (adminPhone) {
      const { uri } = await seedStaff(db, adminPhone, 'admin');
      console.log(`Administrateur ${adminPhone} créé. Ajoute ce lien dans ton application d'authentification :`);
      console.log(uri);
    }
  })()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
