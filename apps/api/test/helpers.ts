import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { Clock } from '../src/common/clock.js';
import { totpCode } from '../src/common/crypto.js';
import { loadConfig } from '../src/config.js';
import { DB, type Database } from '../src/db/db.module.js';
import { cities, districts } from '../src/db/schema.js';
import { seedReferenceData, seedStaff } from '../src/db/seed.js';
import { LogMessageSender, MessageSender } from '../src/notifications/channels.js';

export interface TestContext {
  app: INestApplication;
  db: Database;
  clock: Clock;
  messages: LogMessageSender;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestContext> {
  const config = loadConfig();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true, logger: ['error'] });
  configureApp(app, config);
  await app.init();
  const db = app.get<Database>(DB);
  return {
    app,
    db,
    clock: app.get(Clock),
    messages: app.get(MessageSender) as LogMessageSender,
    http: () => request(app.getHttpServer()),
  };
}

/** Vide les tables entre deux fichiers de test puis recharge les données de référence. */
export async function resetDatabase(db: Database): Promise<void> {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public' and tablename <> 'spatial_ref_sys'`,
  );
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  if (tables) await db.execute(sql.raw(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`));
  await seedReferenceData(db);
}

let phoneCounter = 10_000_000;
export function nextPhone(): string {
  phoneCounter += 1;
  return `+2376${String(phoneCounter).padStart(8, '0')}`;
}

/** Connexion complète par OTP : renvoie le jeton et l'identifiant du compte. */
export async function login(
  ctx: TestContext,
  phone = nextPhone(),
  deviceId = `device-${phone}`,
): Promise<{ token: string; userId: string; phone: string; deviceId: string }> {
  await ctx.http().post('/auth/otp/request').send({ phone, channel: 'whatsapp' }).expect(200);
  const code = ctx.messages.lastTo(phone)?.otpCode;
  const res = await ctx.http().post('/auth/otp/verify').send({ phone, code, deviceId }).expect(200);
  const me = await ctx.http().get('/me').set('Authorization', `Bearer ${res.body.accessToken}`);
  return { token: res.body.accessToken as string, userId: me.body.id as string, phone, deviceId };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ─── Parcours métier réutilisables ───────────────────────────────────────────

export type Session = Awaited<ReturnType<typeof login>>;

/** Compte de l'équipe connecté avec double authentification. */
export async function staffLogin(ctx: TestContext, role: 'moderator' | 'supervisor' | 'admin' = 'moderator') {
  const phone = nextPhone();
  const { secret } = await seedStaff(ctx.db, phone, role);
  const session = await login(ctx, phone);
  const res = await ctx
    .http()
    .post('/auth/mfa')
    .set(auth(session.token))
    .send({ code: totpCode(secret, ctx.clock.now().getTime()) })
    .expect(200);
  return { ...session, token: res.body.accessToken as string };
}

/** Envoie un fichier vers le stockage local via le lien signé renvoyé par l'API. */
export async function uploadTo(ctx: TestContext, url: string, contentType = 'image/jpeg') {
  const { pathname, search } = new URL(url);
  await ctx.http().put(`${pathname}${search}`).set('Content-Type', contentType).send(Buffer.from('fake-image-bytes')).expect(200);
}

async function privateUpload(ctx: TestContext, s: Session, purpose: 'kyc' | 'proof' | 'selfie_check') {
  const res = await ctx.http().post('/uploads').set(auth(s.token)).send({ purpose, contentType: 'image/jpeg' }).expect(201);
  await uploadTo(ctx, res.body.url);
  return res.body.key as string;
}

export async function onboard(ctx: TestContext, s: Session, fullName: string, roles: string[]) {
  await ctx
    .http()
    .post('/me/onboarding')
    .set(auth(s.token))
    .send({ fullName, roles, acceptCharter: true, acceptPrivacy: true })
    .expect(201);
}

/** Inscription complète : profil, pièce + selfie, validation par un modérateur. */
export async function verifiedUser(
  ctx: TestContext,
  moderator: Session,
  fullName: string,
  roles: string[],
  documentNumber = `CM${Math.floor(Math.random() * 1e9)}`,
) {
  const s = await login(ctx);
  await onboard(ctx, s, fullName, roles);
  const front = await privateUpload(ctx, s, 'kyc');
  const selfie = await privateUpload(ctx, s, 'kyc');
  await ctx
    .http()
    .post('/kyc')
    .set(auth(s.token))
    .send({ documentType: 'cni', documentFrontKey: front, selfieKey: selfie, fullName })
    .expect(201);
  const queue = await ctx.http().get('/admin/kyc').set(auth(moderator.token)).expect(200);
  const item = queue.body.find((k: { userId: string }) => k.userId === s.userId);
  await ctx
    .http()
    .post(`/admin/kyc/${item.id}/decision`)
    .set(auth(moderator.token))
    .send({ approve: true, documentNumber })
    .expect(200);
  return s;
}

export async function verifiedLandlord(ctx: TestContext, moderator: Session, fullName = 'Paul Ekambi') {
  const s = await verifiedUser(ctx, moderator, fullName, ['landlord']);
  const key = await privateUpload(ctx, s, 'proof');
  await ctx
    .http()
    .post('/kyc/proofs')
    .set(auth(s.token))
    .send({ role: 'landlord', proofType: 'utility_bill', fileKeys: [key], honorDeclaration: true })
    .expect(201);
  const proofs = await ctx.http().get('/admin/proofs').set(auth(moderator.token)).expect(200);
  const proof = proofs.body.find((p: { userId: string }) => p.userId === s.userId);
  await ctx.http().post(`/admin/proofs/${proof.id}/decision`).set(auth(moderator.token)).send({ approve: true }).expect(200);
  return s;
}

export async function douala(ctx: TestContext) {
  const [city] = await ctx.db.select().from(cities).where(eq(cities.code, 'DLA'));
  const all = await ctx.db.select().from(districts).where(eq(districts.cityId, city!.id));
  const akwa = all.find((d) => d.slug === 'akwa')!;
  const bonapriso = all.find((d) => d.slug === 'bonapriso')!;
  return { city: city!, akwa, bonapriso };
}

export function listingInput(place: { cityId: string; districtId: string }, overrides: Record<string, unknown> = {}) {
  return {
    type: 'appartement',
    monthlyRent: 150_000,
    advanceMonths: 3,
    deposit: 150_000,
    cityId: place.cityId,
    districtId: place.districtId,
    exactAddress: 'Rue Joss, immeuble bleu, 2e étage, porte gauche',
    latitude: 4.0511,
    longitude: 9.7008,
    availableFrom: null,
    amenities: {
      logement: { bedrooms: 2, livingRooms: 1, shower: 'interne', toilet: 'interne', kitchen: 'interne', furnished: true },
      batiment: { floor: 2, guardian: true, gate: true, fence: true, parking: true, yard: false, elevator: false },
      acces: { roadDistance: 'moins_100m', carAccessible: true, rainySeasonPassable: true },
      eauElectricite: { electricityMeter: 'individuel', waterMeter: 'individuel', waterSource: 'eau_courante', generator: false },
      confort: { airConditioning: true, waterHeater: true, balcony: true, wardrobes: true, tiles: true, ceiling: true },
      conditions: { acceptedProfiles: ['couple', 'famille'], petsAllowed: false },
    },
    ...overrides,
  };
}

/** Crée une annonce avec une photo et l'envoie en modération. */
export async function submittedListing(ctx: TestContext, landlord: Session, overrides: Record<string, unknown> = {}) {
  const { city, akwa } = await douala(ctx);
  const created = await ctx
    .http()
    .post('/listings')
    .set(auth(landlord.token))
    .send(listingInput({ cityId: city.id, districtId: akwa.id }, overrides))
    .expect(201);
  const id = created.body.id as string;
  const media = await ctx
    .http()
    .post(`/listings/${id}/media`)
    .set(auth(landlord.token))
    .send({ kind: 'photo', contentType: 'image/jpeg', capturedInApp: true })
    .expect(201);
  await uploadTo(ctx, media.body.upload.url);
  await ctx.http().post(`/listings/${id}/media/${media.body.mediaId}/complete`).set(auth(landlord.token)).expect(200);
  const submitted = await ctx.http().post(`/listings/${id}/submit`).set(auth(landlord.token)).expect(200);
  return submitted.body as { id: string; ref: string; status: string };
}

export async function publishedListing(ctx: TestContext, landlord: Session, moderator: Session, overrides: Record<string, unknown> = {}) {
  const listing = await submittedListing(ctx, landlord, overrides);
  if (listing.status === 'pending_review') {
    await ctx.http().post(`/admin/listings/${listing.id}/decision`).set(auth(moderator.token)).send({ approve: true }).expect(200);
  }
  return listing;
}

/** Achète un pack et simule la validation Mobile Money. */
export async function buyPack(ctx: TestContext, s: Session, tier: 'essentiel' | 'confort' | 'premium', payerName?: string) {
  const res = await ctx
    .http()
    .post('/packs/purchase')
    .set(auth(s.token))
    .send({ tier, operator: 'mtn', payerPhone: s.phone })
    .expect(201);
  await ctx
    .http()
    .post(`/payments/${res.body.paymentId}/simulate`)
    .set(auth(s.token))
    .send({ status: 'succeeded', payerName })
    .expect(200);
  return res.body.paymentId as string;
}
