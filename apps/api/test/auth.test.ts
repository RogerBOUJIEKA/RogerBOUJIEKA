import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createTestApp, login, nextPhone, resetDatabase, type TestContext } from './helpers.js';

describe('connexion par code OTP', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.db);
  });
  afterAll(() => ctx.app.close());

  it('crée un compte à la première connexion', async () => {
    const phone = nextPhone();
    await ctx.http().post('/auth/otp/request').send({ phone: phone.replace('+237', '') }).expect(200);
    const code = ctx.messages.lastTo(phone)?.otpCode;
    expect(code).toMatch(/^\d{6}$/);
    const res = await ctx.http().post('/auth/otp/verify').send({ phone, code, deviceId: 'phone-A-123' }).expect(200);
    expect(res.body.isNewUser).toBe(true);
    const me = await ctx.http().get('/me').set(auth(res.body.accessToken)).expect(200);
    expect(me.body).toMatchObject({ phone, status: 'active', kycStatus: 'none', onboarded: false });
    expect(me.body.referralCode).toMatch(/^[A-Z0-9]{7}$/);
  });

  it('refuse un mauvais code et bloque après 5 essais', async () => {
    const phone = nextPhone();
    await ctx.http().post('/auth/otp/request').send({ phone }).expect(200);
    const code = ctx.messages.lastTo(phone)!.otpCode!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await ctx.http().post('/auth/otp/verify').send({ phone, code: wrong, deviceId: 'device-xyz-1' }).expect(401);
    }
    await ctx.http().post('/auth/otp/verify').send({ phone, code, deviceId: 'device-xyz-1' }).expect(401);
  });

  it('exige un jeton pour les routes privées', async () => {
    await ctx.http().get('/me').expect(401);
    await ctx.http().get('/me').set(auth('nimporte.quoi.jwt')).expect(401);
  });

  it("révoque l'ancien téléphone quand on se connecte sur un nouveau", async () => {
    const first = await login(ctx);
    const second = await login(ctx, first.phone, 'another-device-99');
    await ctx.http().get('/me').set(auth(first.token)).expect(401);
    await ctx.http().get('/me').set(auth(second.token)).expect(200);
  });

  it("enregistre la charte et les rôles à la fin de l'inscription", async () => {
    const user = await login(ctx);
    await ctx
      .http()
      .post('/me/onboarding')
      .set(auth(user.token))
      .send({ fullName: 'Jean Mbarga', roles: ['seeker'], acceptCharter: false, acceptPrivacy: true })
      .expect(400);
    const res = await ctx
      .http()
      .post('/me/onboarding')
      .set(auth(user.token))
      .send({ fullName: 'Jean Mbarga', roles: ['seeker'], acceptCharter: true, acceptPrivacy: true })
      .expect(201);
    expect(res.body).toMatchObject({ fullName: 'Jean Mbarga', roles: ['seeker'], onboarded: true });
  });

  it('affiche le catalogue des packs', async () => {
    const res = await ctx.http().get('/packs').expect(200);
    expect(res.body.successFeePercent).toBe(10);
    expect(res.body.packs.map((p: { tier: string; price: number }) => [p.tier, p.price])).toEqual([
      ['essentiel', 5000],
      ['confort', 10000],
      ['premium', 25000],
    ]);
  });
});
