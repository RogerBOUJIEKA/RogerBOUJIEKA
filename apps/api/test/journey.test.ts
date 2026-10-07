import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HOUR } from '../src/common/clock.js';
import {
  auth,
  buyPack,
  createTestApp,
  douala,
  login,
  onboard,
  publishedListing,
  resetDatabase,
  staffLogin,
  submittedListing,
  verifiedLandlord,
  verifiedUser,
  type Session,
  type TestContext,
} from './helpers.js';

/**
 * Parcours complet de la V1 : bailleur vérifié, annonce modérée, chercheur avec pack,
 * demande de visite, QR code, location confirmée et frais de réussite réglés.
 */
describe('parcours de location de bout en bout', () => {
  let ctx: TestContext;
  let moderator: Session;
  let landlord: Session;
  let seeker: Session;
  let listing: { id: string; ref: string };
  let visitId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.db);
    ctx.clock.set(new Date('2026-11-02T08:00:00Z'));
    moderator = await staffLogin(ctx);
  });
  afterAll(() => ctx.app.close());

  it('refuse le back-office sans double authentification', async () => {
    const user = await login(ctx);
    await ctx.http().get('/admin/dashboard').set(auth(user.token)).expect(403);
    await ctx.http().get('/admin/dashboard').set(auth(moderator.token)).expect(200);
  });

  it('vérifie le bailleur et sa preuve de propriété', async () => {
    landlord = await verifiedLandlord(ctx, moderator, 'Paul Ekambi');
    const me = await ctx.http().get('/me').set(auth(landlord.token)).expect(200);
    expect(me.body).toMatchObject({ kycStatus: 'approved', fullName: 'Paul Ekambi', badges: ['verified'] });
    const kyc = await ctx.http().get('/kyc').set(auth(landlord.token)).expect(200);
    expect(kyc.body.proofs[0]).toMatchObject({ role: 'landlord', status: 'approved' });
  });

  it('relit la première annonce avant publication', async () => {
    const submitted = await submittedListing(ctx, landlord);
    expect(submitted.status).toBe('pending_review');
    expect(submitted.ref).toBe('KLE-CM-DLA-000001');
    await ctx.http().get(`/listings/${submitted.ref}`).expect(404);

    const queue = await ctx.http().get('/admin/listings').set(auth(moderator.token)).expect(200);
    expect(queue.body).toHaveLength(1);
    expect(queue.body[0]).toMatchObject({ ref: submitted.ref, overdue: false, exactAddress: expect.any(String) });

    await ctx.http().post(`/admin/listings/${submitted.id}/decision`).set(auth(moderator.token)).send({ approve: true }).expect(200);
    listing = submitted;
  });

  it("montre l'annonce au Premium d'abord, puis à tout le monde après 24 h", async () => {
    await ctx.http().get(`/listings/${listing.ref}`).expect(403);
    const feedBefore = await ctx.http().get('/feed').expect(200);
    expect(feedBefore.body.items).toHaveLength(0);

    ctx.clock.advance(25 * HOUR);
    const view = await ctx.http().get(`/listings/${listing.ref}`).expect(200);
    expect(view.body).toMatchObject({
      ref: 'KLE-CM-DLA-000001',
      availability: 'Disponible',
      title: 'Appartement meublé à Akwa',
      monthlyRent: 150_000,
      district: { name: 'Akwa' },
      publisher: { displayName: 'Paul E.', verified: true },
      comparison: { agentCommission: 150_000, packPrice: 10_000, successFee: 15_000, kleTotal: 25_000 },
      shareUrl: 'http://localhost:3000/annonce/KLE-CM-DLA-000001',
    });
    expect(JSON.stringify(view.body)).not.toContain('Rue Joss');
    expect(view.body.approxLocation.latitude).not.toBe(4.0511);

    const feed = await ctx.http().get('/feed').expect(200);
    expect(feed.body.items.map((i: { ref: string }) => i.ref)).toEqual([listing.ref]);

    const { akwa } = await douala(ctx);
    const search = await ctx.http().get(`/listings?districtIds=${akwa.id}&maxRent=200000&bbox=9.6,3.9,9.9,4.2`).expect(200);
    expect(search.body.items).toHaveLength(1);
    const tooCheap = await ctx.http().get('/listings?maxRent=100000').expect(200);
    expect(tooCheap.body.items).toHaveLength(0);
  });

  it('demande un pack avant de contacter un bailleur', async () => {
    seeker = await verifiedUser(ctx, moderator, 'Marie Ngono', ['seeker']);
    const res = await ctx
      .http()
      .post('/visit-requests')
      .set(auth(seeker.token))
      .send({ listingId: listing.id, proposedSlot: new Date(ctx.clock.now().getTime() + 48 * HOUR) })
      .expect(403);
    expect(res.body.code).toBe('pack_required');
  });

  it('active le pack Confort après paiement Mobile Money', async () => {
    await buyPack(ctx, seeker, 'confort', 'NGONO Marie');
    const me = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    expect(me.body.activePack).toMatchObject({ tier: 'confort', visitRequestsLeft: 30 });
    const dashboard = await ctx.http().get('/admin/dashboard').set(auth(moderator.token)).expect(200);
    expect(dashboard.body.activePacks).toEqual({ confort: 1 });
    expect(dashboard.body.revenueThisMonth).toEqual({ pack: 10_000 });
    expect(dashboard.body.queues.fraudOpen).toBe(0);
  });

  it("demande une visite, que le bailleur accepte ; l'adresse n'apparaît qu'ensuite", async () => {
    const slot = new Date(ctx.clock.now().getTime() + 48 * HOUR);
    const created = await ctx
      .http()
      .post('/visit-requests')
      .set(auth(seeker.token))
      .send({ listingId: listing.id, proposedSlot: slot, message: 'Bonjour, je suis disponible samedi.' })
      .expect(201);
    visitId = created.body.id;
    expect(created.body.charterReminder).toContain('Ne payez rien');

    const before = await ctx.http().get(`/visit-requests/${visitId}`).set(auth(seeker.token)).expect(200);
    expect(before.body.exactAddress).toBeNull();

    const forLandlord = await ctx.http().get('/visit-requests?as=landlord').set(auth(landlord.token)).expect(200);
    expect(forLandlord.body[0]).toMatchObject({
      id: visitId,
      highlight: 'serious_badge',
      counterpart: { name: 'Marie Ngono', verified: true },
    });
    expect(forLandlord.body[0].counterpart.photoUrl).toContain('/storage/local?token=');
    expect(JSON.stringify(forLandlord.body)).not.toContain(seeker.phone);

    await ctx.http().post(`/visit-requests/${visitId}/respond`).set(auth(landlord.token)).send({ decision: 'accept' }).expect(200);
    const after = await ctx.http().get(`/visit-requests/${visitId}`).set(auth(seeker.token)).expect(200);
    expect(after.body.exactAddress).toBe('Rue Joss, immeuble bleu, 2e étage, porte gauche');

    const me = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    expect(me.body.activePack.visitRequestsLeft).toBe(29);
  });

  it("échange des messages sans jamais montrer les numéros", async () => {
    const convs = await ctx.http().get('/conversations').set(auth(landlord.token)).expect(200);
    expect(convs.body[0]).toMatchObject({ listingRef: listing.ref, unread: 1, counterpart: { name: 'Marie N.' } });
    ctx.clock.advance(60_000);
    await ctx.http().post(`/conversations/${convs.body[0].id}/messages`).set(auth(landlord.token)).send({ body: 'Parfait, à samedi.' }).expect(201);
    const msgs = await ctx.http().get(`/conversations/${convs.body[0].id}/messages`).set(auth(seeker.token)).expect(200);
    expect(msgs.body.map((m: { body: string }) => m.body)).toEqual(['Bonjour, je suis disponible samedi.', 'Parfait, à samedi.']);
  });

  it('valide la visite sur place avec le QR code', async () => {
    ctx.clock.advance(48 * HOUR);
    const qr = await ctx.http().get(`/visit-requests/${visitId}/qr`).set(auth(seeker.token)).expect(200);
    await ctx.http().post('/visit-requests/scan').set(auth(seeker.token)).send({ qrToken: qr.body.qrToken }).expect(404);
    const scan = await ctx.http().post('/visit-requests/scan').set(auth(landlord.token)).send({ qrToken: qr.body.qrToken }).expect(200);
    expect(scan.body.seeker.fullName).toBe('Marie Ngono');
    await ctx
      .http()
      .post(`/visit-requests/${visitId}/validate`)
      .set(auth(landlord.token))
      .send({ qrToken: `${qr.body.qrToken.slice(0, -2)}xx`, samePerson: true })
      .expect(403);
    await ctx
      .http()
      .post(`/visit-requests/${visitId}/validate`)
      .set(auth(landlord.token))
      .send({ qrToken: qr.body.qrToken, samePerson: true })
      .expect(200);
    const view = await ctx.http().get(`/listings/${listing.id}`).expect(200);
    expect(view.body.validatedVisits).toBe(1);
  });

  it('confirme la location et facture 10 % du loyer au locataire', async () => {
    const contacts = await ctx.http().get(`/listings/${listing.id}/contacts`).set(auth(landlord.token)).expect(200);
    expect(contacts.body).toHaveLength(1);
    const res = await ctx
      .http()
      .post(`/listings/${listing.id}/rented`)
      .set(auth(landlord.token))
      .send({ tenant: 'kle_contact', visitRequestId: visitId })
      .expect(201);
    expect(res.body.successFee).toMatchObject({ amount: 15_000, feeBps: 1_000, status: 'pending' });

    const view = await ctx.http().get(`/listings/${listing.id}`).expect(200);
    expect(view.body.availability).toBe('Pris');
    const me = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    expect(me.body.activePack).toBeNull();
    expect(me.body.unpaidSuccessFees).toHaveLength(1);
  });

  it('règle les frais de réussite : locataire en règle', async () => {
    const fees = await ctx.http().get('/success-fees').set(auth(seeker.token)).expect(200);
    const pay = await ctx
      .http()
      .post(`/success-fees/${fees.body[0].id}/pay`)
      .set(auth(seeker.token))
      .send({ operator: 'orange', payerPhone: seeker.phone })
      .expect(201);
    expect(pay.body.instructions).toContain('Orange Money');
    await ctx.http().post(`/payments/${pay.body.paymentId}/simulate`).set(auth(seeker.token)).send({ status: 'succeeded' }).expect(200);
    const me = await ctx.http().get('/me').set(auth(seeker.token)).expect(200);
    expect(me.body.badges).toContain('tenant_in_good_standing');
    expect(me.body.unpaidSuccessFees).toHaveLength(0);
    const dashboard = await ctx.http().get('/admin/dashboard').set(auth(moderator.token)).expect(200);
    expect(dashboard.body.indicators.successFeePaymentRate).toBe(100);
    expect(dashboard.body.indicators.rentedViaKle30d).toBe(1);
  });

  it("note le bailleur après le contact, une seule fois", async () => {
    await ctx.http().post('/reviews').set(auth(seeker.token)).send({ visitRequestId: visitId, rating: 5, comment: 'Bailleur sérieux.' }).expect(201);
    await ctx.http().post('/reviews').set(auth(seeker.token)).send({ visitRequestId: visitId, rating: 4 }).expect(409);
    const profile = await ctx.http().get(`/users/${landlord.userId}`).expect(200);
    expect(profile.body).toMatchObject({ displayName: 'Paul E.', averageRating: 5, reviewsCount: 1, rentedCount: 1, badges: ['verified'] });
  });

  it('publie directement après trois annonces validées', async () => {
    const second = await submittedListing(ctx, landlord, { monthlyRent: 80_000 });
    expect(second.status).toBe('pending_review');
    await ctx.http().post(`/admin/listings/${second.id}/decision`).set(auth(moderator.token)).send({ approve: false, reason: 'Vidéo floue' }).expect(200);
    const third = await publishedListing(ctx, landlord, moderator, { monthlyRent: 90_000 });
    const fourth = await publishedListing(ctx, landlord, moderator, { monthlyRent: 95_000 });
    expect([third, fourth].every((l) => l.status === 'pending_review')).toBe(true);
    const fifth = await submittedListing(ctx, landlord, { monthlyRent: 99_000 });
    expect(fifth.status).toBe('published');
    const queue = await ctx.http().get('/admin/listings').set(auth(moderator.token)).expect(200);
    expect(queue.body.find((q: { id: string }) => q.id === fifth.id)).toMatchObject({ postReview: true });
  });
});

describe('onboarding sans pièce', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.db);
  });
  afterAll(() => ctx.app.close());

  it("empêche de publier sans profil bailleur ni vérification", async () => {
    const s = await login(ctx);
    await onboard(ctx, s, 'Alain Fotso', ['seeker']);
    const { city, akwa } = await douala(ctx);
    const res = await ctx
      .http()
      .post('/listings')
      .set(auth(s.token))
      .send({ type: 'studio', monthlyRent: 50_000, advanceMonths: 2, deposit: 0, cityId: city.id, districtId: akwa.id })
      .expect(400);
    expect(res.body.code).toBe('validation_error');
  });
});
