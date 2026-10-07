import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { seedStaff } from '../src/db/seed.js';
import { createTestApp, nextPhone, resetDatabase, type TestContext } from './helpers.js';

describe('phase 0 : mode liste d’attente', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp({ LAUNCH_PHASE: 'waitlist' });
    await resetDatabase(ctx.db);
  });
  afterAll(() => ctx.app.close());

  it('laisse ouvertes la liste d’attente et la lecture publique', async () => {
    await ctx.http().get('/health').expect(200);
    await ctx.http().get('/waitlist/stats').expect(200);
    await ctx.http().post('/waitlist').send({ role: 'seeker', fullName: 'Ali Moussa', phone: nextPhone(), consent: true }).expect(200);
    await ctx.http().get('/packs').expect(200);
    await ctx.http().get('/feed').expect(200);
  });

  it('ferme le reste de l’API et refuse les comptes publics', async () => {
    const closed = await ctx.http().post('/visit-requests').send({}).expect(403);
    expect(closed.body.code).toBe('not_launched');
    await ctx.http().post('/uploads').send({}).expect(403);
    await ctx.http().post('/payments/webhooks/notchpay').send({}).expect(403);
    const otp = await ctx.http().post('/auth/otp/request').send({ phone: nextPhone() }).expect(403);
    expect(otp.body.code).toBe('not_launched');
  });

  it("laisse l'équipe se connecter pour suivre les inscriptions", async () => {
    const phone = nextPhone();
    await seedStaff(ctx.db, phone, 'admin');
    await ctx.http().post('/auth/otp/request').send({ phone }).expect(200);
  });

  it('n’exige les services de la V1 en production qu’une fois la V1 lancée', () => {
    const secrets = {
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(40),
      APP_SECRET: 'y'.repeat(40),
    };
    expect(() => loadConfig({ ...secrets, LAUNCH_PHASE: 'waitlist' })).not.toThrow();
    expect(() => loadConfig({ ...secrets, LAUNCH_PHASE: 'v1' })).toThrow(/PAYMENT_PROVIDER/);
    expect(() => loadConfig({ NODE_ENV: 'production', LAUNCH_PHASE: 'waitlist' })).toThrow(/JWT_SECRET/);
  });
});
