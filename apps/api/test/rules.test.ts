import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DAY, HOUR } from '../src/common/clock.js';
import { fraudSignals, listings, notifications, successFees, users } from '../src/db/schema.js';
import { JobsService } from '../src/jobs/jobs.service.js';
import { RentalsService } from '../src/rentals/rentals.service.js';
import {
  auth,
  buyPack,
  createTestApp,
  douala,
  login,
  nextPhone,
  publishedListing,
  resetDatabase,
  staffLogin,
  uploadTo,
  verifiedLandlord,
  verifiedUser,
  type Session,
  type TestContext,
} from './helpers.js';

let ctx: TestContext;
let moderator: Session;
let landlord: Session;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(() => ctx.app.close());

beforeEach(async () => {
  await resetDatabase(ctx.db);
  ctx.clock.set(new Date('2026-11-02T08:00:00Z'));
  ctx.messages.sent.length = 0;
  moderator = await staffLogin(ctx);
  landlord = await verifiedLandlord(ctx, moderator);
});

const inHours = (h: number) => new Date(ctx.clock.now().getTime() + h * HOUR);

async function kindsFor(userId: string) {
  const rows = await ctx.db.select({ kind: notifications.kind }).from(notifications).where(eq(notifications.userId, userId));
  return rows.map((r) => r.kind);
}

describe('limites de chercheur réel', () => {
  it('limite à 3 visites programmées et exige le résultat des visites passées', async () => {
    const listingsCreated = [];
    for (let i = 0; i < 4; i++) listingsCreated.push(await publishedListing(ctx, landlord, moderator, { monthlyRent: 100_000 + i }));
    ctx.clock.advance(25 * HOUR);
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await buyPack(ctx, seeker, 'essentiel');

    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await ctx
        .http()
        .post('/visit-requests')
        .set(auth(seeker.token))
        .send({ listingId: listingsCreated[i]!.id, proposedSlot: inHours(24) })
        .expect(201);
      ids.push(res.body.id);
    }
    const fourth = await ctx
      .http()
      .post('/visit-requests')
      .set(auth(seeker.token))
      .send({ listingId: listingsCreated[3]!.id, proposedSlot: inHours(24) })
      .expect(403);
    expect(fourth.body.code).toBe('too_many_scheduled');

    for (const id of ids) {
      await ctx.http().post(`/visit-requests/${id}/respond`).set(auth(landlord.token)).send({ decision: 'accept' }).expect(200);
    }
    ctx.clock.advance(30 * HOUR);
    const needOutcome = await ctx
      .http()
      .post('/visit-requests')
      .set(auth(seeker.token))
      .send({ listingId: listingsCreated[3]!.id, proposedSlot: inHours(24) })
      .expect(403);
    expect(needOutcome.body.code).toBe('outcome_required');

    for (const id of ids) {
      await ctx.http().post(`/visit-requests/${id}/outcome`).set(auth(seeker.token)).send({ outcome: 'not_interested' }).expect(200);
    }
    await ctx
      .http()
      .post('/visit-requests')
      .set(auth(seeker.token))
      .send({ listingId: listingsCreated[3]!.id, proposedSlot: inHours(24) })
      .expect(201);
  });

  it("refuse la visite et lève une alerte si le visiteur n'est pas la personne vérifiée", async () => {
    const listing = await publishedListing(ctx, landlord, moderator);
    ctx.clock.advance(25 * HOUR);
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await buyPack(ctx, seeker, 'essentiel');
    const visit = await ctx
      .http()
      .post('/visit-requests')
      .set(auth(seeker.token))
      .send({ listingId: listing.id, proposedSlot: inHours(5) })
      .expect(201);
    await ctx.http().post(`/visit-requests/${visit.body.id}/respond`).set(auth(landlord.token)).send({ decision: 'accept' }).expect(200);
    const qr = await ctx.http().get(`/visit-requests/${visit.body.id}/qr`).set(auth(seeker.token)).expect(200);
    const res = await ctx
      .http()
      .post(`/visit-requests/${visit.body.id}/validate`)
      .set(auth(landlord.token))
      .send({ qrToken: qr.body.qrToken, samePerson: false })
      .expect(200);
    expect(res.body.status).toBe('refused');
    const signals = await ctx.db.select().from(fraudSignals).where(eq(fraudSignals.userId, seeker.userId));
    expect(signals.map((s) => s.kind)).toEqual(['identity_mismatch_at_visit']);
  });

  it('signale un nom Mobile Money différent de la pièce', async () => {
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await buyPack(ctx, seeker, 'essentiel', 'BELLO Ibrahim');
    const signals = await ctx.db.select().from(fraudSignals).where(eq(fraudSignals.userId, seeker.userId));
    expect(signals.map((s) => s.kind)).toEqual(['payer_name_mismatch']);
  });
});

describe('charte et sanctions', () => {
  it("bannit pour argent demandé avant la visite : il faut un superviseur, et le numéro ne peut plus revenir", async () => {
    const listing = await publishedListing(ctx, landlord, moderator);
    ctx.clock.advance(25 * HOUR);
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    const report = await ctx
      .http()
      .post('/reports')
      .set(auth(seeker.token))
      .send({ targetType: 'listing', targetId: listing.id, reason: 'money_before_visit', details: 'Il demande 10 000 FCFA de frais de visite.' })
      .expect(201);
    await ctx
      .http()
      .post('/reports')
      .set(auth(seeker.token))
      .send({ targetType: 'listing', targetId: listing.id, reason: 'money_before_visit' })
      .expect(409);

    const queue = await ctx.http().get('/admin/reports').set(auth(moderator.token)).expect(200);
    expect(queue.body[0]).toMatchObject({ id: report.body.id, listingRef: listing.ref, targetName: 'Paul Ekambi' });

    const denied = await ctx
      .http()
      .post(`/admin/reports/${report.body.id}/decision`)
      .set(auth(moderator.token))
      .send({ action: 'sanction' })
      .expect(403);
    expect(denied.body.code).toBe('supervisor_required');

    const supervisor = await staffLogin(ctx, 'supervisor');
    const decided = await ctx
      .http()
      .post(`/admin/reports/${report.body.id}/decision`)
      .set(auth(supervisor.token))
      .send({ action: 'sanction', note: 'Capture WhatsApp fournie.' })
      .expect(200);
    expect(decided.body.sanction).toMatchObject({ kind: 'permanent_ban', infraction: 'money_before_visit' });

    await ctx.http().get('/me').set(auth(landlord.token)).expect(403);
    await ctx.http().get(`/listings/${listing.ref}`).expect(404);
    const otp = await ctx.http().post('/auth/otp/request').send({ phone: landlord.phone }).expect(403);
    expect(otp.body.code).toBe('account_banned');
  });

  it("refuse une pièce d'identité déjà bannie", async () => {
    const supervisor = await staffLogin(ctx, 'supervisor');
    const cheater = await verifiedUser(ctx, moderator, 'Faux Nom', ['seeker'], 'CM-999-BAN');
    await ctx
      .http()
      .post(`/admin/users/${cheater.userId}/sanctions`)
      .set(auth(supervisor.token))
      .send({ infraction: 'fake_document' })
      .expect(201);
    const again = await login(ctx);
    const front = await ctx.http().post('/uploads').set(auth(again.token)).send({ purpose: 'kyc', contentType: 'image/jpeg' }).expect(201);
    await uploadTo(ctx, front.body.url);
    await ctx
      .http()
      .post('/kyc')
      .set(auth(again.token))
      .send({ documentType: 'cni', documentFrontKey: front.body.key, selfieKey: front.body.key, fullName: 'Autre Nom' })
      .expect(201);
    const queue = await ctx.http().get('/admin/kyc').set(auth(moderator.token)).expect(200);
    const item = queue.body.find((k: { userId: string }) => k.userId === again.userId);
    const res = await ctx
      .http()
      .post(`/admin/kyc/${item.id}/decision`)
      .set(auth(moderator.token))
      .send({ approve: true, documentNumber: 'cm 999 ban' })
      .expect(200);
    expect(res.body.status).toBe('rejected');
    const [user] = await ctx.db.select().from(users).where(eq(users.id, again.userId));
    expect(user!.status).toBe('banned');
  });

  it('prolonge le pack des chercheurs de 30 jours quand une annonce vérifiée se révèle fausse', async () => {
    const listing = await publishedListing(ctx, landlord, moderator);
    ctx.clock.advance(25 * HOUR);
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await buyPack(ctx, seeker, 'confort');
    const before = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    await ctx.http().post('/visit-requests').set(auth(seeker.token)).send({ listingId: listing.id, proposedSlot: inHours(24) }).expect(201);
    const supervisor = await staffLogin(ctx, 'supervisor');
    await ctx
      .http()
      .post(`/admin/users/${landlord.userId}/sanctions`)
      .set(auth(supervisor.token))
      .send({ infraction: 'fake_listing', listingId: listing.id })
      .expect(201);
    const after = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    const extendedBy = new Date(after.body.activePack.endsAt).getTime() - new Date(before.body.activePack.endsAt).getTime();
    expect(extendedBy).toBe(30 * DAY);
  });

  it('avertit puis suspend 30 jours pour un prix différent, et lève la suspension à échéance', async () => {
    const supervisor = await staffLogin(ctx, 'supervisor');
    const first = await ctx
      .http()
      .post(`/admin/users/${landlord.userId}/sanctions`)
      .set(auth(moderator.token))
      .send({ infraction: 'price_mismatch' })
      .expect(201);
    expect(first.body.kind).toBe('warning');
    await ctx.http().post(`/admin/users/${landlord.userId}/sanctions`).set(auth(moderator.token)).send({ infraction: 'price_mismatch' }).expect(403);
    const second = await ctx
      .http()
      .post(`/admin/users/${landlord.userId}/sanctions`)
      .set(auth(supervisor.token))
      .send({ infraction: 'price_mismatch' })
      .expect(201);
    expect(second.body.kind).toBe('suspension');
    const me = await ctx.http().get('/me').set(auth(landlord.token)).expect(200);
    expect(me.body.status).toBe('suspended');

    await ctx.app.get(JobsService).endSuspensions(new Date(ctx.clock.now().getTime() + 31 * DAY));
    const later = await ctx.http().get('/me').set(auth(landlord.token)).expect(200);
    expect(later.body.status).toBe('active');
  });
});

describe('tâches planifiées', () => {
  it('demande la disponibilité tous les 15 jours et masque sans réponse sous 72 h', async () => {
    const listing = await publishedListing(ctx, landlord, moderator);
    const jobs = ctx.app.get(JobsService);
    expect(await jobs.availabilityChecks(new Date(ctx.clock.now().getTime() + 10 * DAY))).toEqual({ asked: 0, hidden: 0 });
    expect(await jobs.availabilityChecks(new Date(ctx.clock.now().getTime() + 16 * DAY))).toEqual({ asked: 1, hidden: 0 });
    expect(await kindsFor(landlord.userId)).toContain('availability_check');
    expect(await jobs.availabilityChecks(new Date(ctx.clock.now().getTime() + 16 * DAY + 73 * HOUR))).toEqual({ asked: 0, hidden: 1 });
    const [row] = await ctx.db.select().from(listings).where(eq(listings.id, listing.id));
    expect(row).toMatchObject({ status: 'hidden', hiddenReason: 'unconfirmed' });

    await ctx.http().post(`/listings/${listing.id}/still-available`).set(auth(landlord.token)).expect(200);
    const [back] = await ctx.db.select().from(listings).where(eq(listings.id, listing.id));
    expect(back!.status).toBe('published');
  });

  it("bloque le compte après 30 jours de frais impayés, et le débloque au paiement", async () => {
    const listing = await publishedListing(ctx, landlord, moderator);
    ctx.clock.advance(25 * HOUR);
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await buyPack(ctx, seeker, 'premium');
    const visit = await ctx.http().post('/visit-requests').set(auth(seeker.token)).send({ listingId: listing.id, proposedSlot: inHours(5) }).expect(201);
    await ctx.http().post(`/visit-requests/${visit.body.id}/respond`).set(auth(landlord.token)).send({ decision: 'accept' }).expect(200);
    await ctx.http().post(`/listings/${listing.id}/rented`).set(auth(landlord.token)).send({ tenant: 'kle_contact', visitRequestId: visit.body.id, monthlyRent: 140_000 }).expect(201);

    const rentals = ctx.app.get(RentalsService);
    const d16 = new Date(ctx.clock.now().getTime() + 16 * DAY);
    expect(await rentals.processDueFees(d16)).toEqual({ overdue: 1, blocked: 0 });
    const d31 = new Date(ctx.clock.now().getTime() + 31 * DAY);
    expect(await rentals.processDueFees(d31)).toEqual({ overdue: 0, blocked: 1 });
    const blocked = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    expect(blocked.body.status).toBe('blocked_unpaid');

    const [fee] = await ctx.db.select().from(successFees).where(eq(successFees.payerId, seeker.userId));
    expect(fee!.amount).toBe(14_000);
    const pay = await ctx.http().post(`/success-fees/${fee!.id}/pay`).set(auth(seeker.token)).send({ operator: 'mtn', payerPhone: seeker.phone }).expect(201);
    await ctx.http().post(`/payments/${pay.body.paymentId}/simulate`).set(auth(seeker.token)).send({ status: 'succeeded' }).expect(200);
    const unblocked = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    expect(unblocked.body.status).toBe('active');
  });

  it('prévient le Premium tout de suite, les autres packs 24 h plus tard', async () => {
    const { city } = await douala(ctx);
    const premium = await verifiedUser(ctx, moderator, 'Grace Premium', ['seeker']);
    const confort = await verifiedUser(ctx, moderator, 'Luc Confort', ['seeker']);
    await buyPack(ctx, premium, 'premium');
    await buyPack(ctx, confort, 'confort');
    for (const s of [premium, confort]) {
      await ctx.http().post('/alerts').set(auth(s.token)).send({ cityId: city.id, maxRent: 200_000 }).expect(201);
    }
    await publishedListing(ctx, landlord, moderator);
    expect(await kindsFor(premium.userId)).toContain('alert_match');
    expect(await kindsFor(confort.userId)).not.toContain('alert_match');
    expect(ctx.messages.sent.some((m) => m.to === premium.phone && m.channel === 'whatsapp')).toBe(true);

    const jobs = ctx.app.get(JobsService);
    expect(await jobs.publicAlerts(new Date(ctx.clock.now().getTime() + 25 * HOUR))).toEqual({ listings: 1, notified: 1 });
    expect(await kindsFor(confort.userId)).toContain('alert_match');
  });

  it("limite le nombre d'alertes selon le pack", async () => {
    const { city } = await douala(ctx);
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await ctx.http().post('/alerts').set(auth(seeker.token)).send({ cityId: city.id, maxRent: 100_000 }).expect(403);
    await buyPack(ctx, seeker, 'essentiel');
    await ctx.http().post('/alerts').set(auth(seeker.token)).send({ cityId: city.id, maxRent: 100_000 }).expect(201);
    const second = await ctx.http().post('/alerts').set(auth(seeker.token)).send({ cityId: city.id, maxRent: 120_000 }).expect(403);
    expect(second.body.code).toBe('alert_limit_reached');
  });

  it('offre 15 jours au Premium qui n’a pas trouvé en 30 jours', async () => {
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await buyPack(ctx, seeker, 'premium');
    const jobs = ctx.app.get(JobsService);
    const reminder = await jobs.packLifecycle(new Date(ctx.clock.now().getTime() + 28 * DAY));
    expect(reminder.reminders).toBe(1);
    const expiry = await jobs.packLifecycle(new Date(ctx.clock.now().getTime() + 30 * DAY + HOUR));
    expect(expiry.premiumExtended).toBe(1);
    ctx.clock.advance(31 * DAY);
    const me = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    expect(me.body.activePack).toMatchObject({ tier: 'premium' });
  });
});

describe('« Bientôt disponible »', () => {
  it('réserve les annonces des sortants aux packs Confort et Premium', async () => {
    const outgoing = await verifiedUser(ctx, moderator, 'Sandrine Sortante', ['outgoing_tenant']);
    const proof = await ctx.http().post('/uploads').set(auth(outgoing.token)).send({ purpose: 'proof', contentType: 'application/pdf' }).expect(201);
    await uploadTo(ctx, proof.body.url, 'application/pdf');
    await ctx
      .http()
      .post('/kyc/proofs')
      .set(auth(outgoing.token))
      .send({ role: 'outgoing_tenant', proofType: 'property_title', fileKeys: [proof.body.key], honorDeclaration: true })
      .expect(400);
    await ctx
      .http()
      .post('/kyc/proofs')
      .set(auth(outgoing.token))
      .send({ role: 'outgoing_tenant', proofType: 'lease_or_rent_receipt', fileKeys: [proof.body.key], honorDeclaration: true })
      .expect(201);
    const proofs = await ctx.http().get('/admin/proofs').set(auth(moderator.token)).expect(200);
    await ctx.http().post(`/admin/proofs/${proofs.body[0].id}/decision`).set(auth(moderator.token)).send({ approve: true }).expect(200);

    const listing = await publishedListing(ctx, outgoing, moderator, {
      category: 'coming_soon',
      comingSoon: { departureDate: '2026-12-15', handoverAmount: 50_000, landlordInformed: true },
    });
    ctx.clock.advance(25 * HOUR);
    const essentiel = await verifiedUser(ctx, moderator, 'Eric Essentiel', ['seeker']);
    await buyPack(ctx, essentiel, 'essentiel');
    const confort = await verifiedUser(ctx, moderator, 'Luc Confort', ['seeker']);
    await buyPack(ctx, confort, 'confort');

    await ctx.http().get(`/listings/${listing.ref}`).expect(403);
    const denied = await ctx.http().get(`/listings/${listing.ref}`).set(auth(essentiel.token)).expect(403);
    expect(denied.body.code).toBe('coming_soon_reserved');
    const view = await ctx.http().get(`/listings/${listing.ref}`).set(auth(confort.token)).expect(200);
    expect(view.body).toMatchObject({ availability: 'Bientôt disponible', badges: ['verified', 'coming_soon'] });
    expect(view.body.comingSoon.warning).toContain('Rencontrez le bailleur');
  });
});

describe('téléphone et compte', () => {
  it('gèle un compte vérifié qui change de téléphone jusqu’au nouveau selfie', async () => {
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    const relogged = await login(ctx, seeker.phone, 'nouveau-telephone-1');
    const me = await ctx.http().get('/me').set(auth(relogged.token)).expect(200);
    expect(me.body).toMatchObject({ status: 'frozen', statusReason: 'new_device' });
    const upload = await ctx.http().post('/uploads').set(auth(relogged.token)).send({ purpose: 'selfie_check', contentType: 'image/jpeg' }).expect(201);
    await uploadTo(ctx, upload.body.url);
    await ctx.http().post('/kyc/selfie-check').set(auth(relogged.token)).send({ selfieKey: upload.body.key }).expect(201);
    const after = await ctx.http().get('/me').set(auth(relogged.token)).expect(200);
    expect(after.body.status).toBe('active');
  });

  it("refuse une clé de fichier qui n'appartient pas au compte", async () => {
    const a = await login(ctx);
    const b = await login(ctx);
    const upload = await ctx.http().post('/uploads').set(auth(a.token)).send({ purpose: 'kyc', contentType: 'image/jpeg' }).expect(201);
    const res = await ctx
      .http()
      .post('/kyc')
      .set(auth(b.token))
      .send({ documentType: 'cni', documentFrontKey: upload.body.key, selfieKey: upload.body.key, fullName: 'Voleur De Clé' })
      .expect(400);
    expect(res.body.code).toBe('invalid_file');
  });

  it('supprime et anonymise un compte à la demande', async () => {
    const seeker = await verifiedUser(ctx, moderator, 'Eric Tchoua', ['seeker']);
    await ctx.http().delete('/me').set(auth(seeker.token)).expect(200);
    await ctx.http().get('/me').set(auth(seeker.token)).expect(401);
    const [row] = await ctx.db.select().from(users).where(eq(users.id, seeker.userId));
    expect(row).toMatchObject({ fullName: null, phone: `deleted:${seeker.userId}` });
  });
});

describe("phase 0 : liste d'attente", () => {
  it('inscrit, met à jour sans doublon et exporte en CSV', async () => {
    const phone = nextPhone();
    const body = {
      role: 'landlord',
      fullName: 'Jeanne Bailleur',
      phone,
      district: 'Makepe',
      consent: true,
      survey: { vacantUnits: 4, canFilmVideo: true, currentChannel: 'agent' },
      source: 'tiktok',
    };
    const first = await ctx.http().post('/waitlist').send(body).expect(200);
    expect(first.body).toEqual({ ok: true, position: 1 });
    await ctx.http().post('/waitlist').send({ ...body, district: 'Kotto' }).expect(200);
    await ctx.http().post('/waitlist').send({ ...body, consent: false }).expect(400);
    await ctx.http().post('/waitlist').send({ role: 'seeker', fullName: 'Ali', phone: nextPhone(), consent: true, budgetMax: 80_000 }).expect(200);

    const stats = await ctx.http().get('/waitlist/stats').expect(200);
    expect(stats.body).toMatchObject({ total: 2, byRole: { landlord: 1, seeker: 1 }, goals: { waitlistSignups: 300, landlordsReady: 50 } });

    const csv = await ctx.http().get('/admin/waitlist.csv').set(auth(moderator.token)).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Jeanne Bailleur');
    expect(csv.text).toContain('Kotto');
  });
});
