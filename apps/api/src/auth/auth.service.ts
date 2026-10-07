import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, count, desc, eq, gte, isNull, ne } from 'drizzle-orm';
import { Clock, DAY, HOUR } from '../common/clock.js';
import { hmac, randomCode, randomDigits, safeEqual, verifyTotp } from '../common/crypto.js';
import { forbidden } from '../common/errors.js';
import { CONFIG, type AppConfig } from '../config.js';
import { DB, type Database } from '../db/db.module.js';
import { devices, fraudSignals, otpCodes, users } from '../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { isBannedIdentity } from '../users/identity.js';
import type { AuthUser, JwtPayload } from './auth.decorators.js';

const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;
const DEVICE_CHANGES_ALERT = 3;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly jwt: JwtService,
    private readonly clock: Clock,
    private readonly notifications: NotificationsService,
  ) {}

  /** Envoie un code de connexion par WhatsApp ou SMS. Un numéro = un compte. */
  async requestOtp(phone: string, channel: 'sms' | 'whatsapp') {
    const now = this.clock.now();
    if (await isBannedIdentity(this.db, this.config.APP_SECRET, 'phone', phone)) {
      throw forbidden('account_banned', 'Ce numéro ne peut plus utiliser Klé.');
    }
    const [recent] = await this.db
      .select({ n: count() })
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, new Date(now.getTime() - HOUR))));
    if ((recent?.n ?? 0) >= OTP_MAX_PER_HOUR) {
      throw forbidden('otp_rate_limited', 'Trop de codes demandés. Réessaie dans une heure.');
    }

    const code = randomDigits(6);
    await this.db.insert(otpCodes).values({
      phone,
      channel,
      codeHash: this.hashCode(phone, code),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      createdAt: now,
    });
    await this.notifications.dispatch(
      { channel, to: phone, text: `Ton code Klé : ${code}. Ne le partage avec personne.`, otpCode: code },
      { immediate: true },
    );

    const echo = this.config.OTP_DEV_ECHO && this.config.NODE_ENV !== 'production';
    return { sent: true, channel, expiresInSeconds: OTP_TTL_MS / 1000, ...(echo ? { devCode: code } : {}) };
  }

  async verifyOtp(input: { phone: string; code: string; deviceId: string; deviceName?: string }) {
    const now = this.clock.now();
    const [otp] = await this.db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, input.phone), isNull(otpCodes.consumedAt), gte(otpCodes.expiresAt, now)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    const invalid = new UnauthorizedException({ code: 'invalid_otp', message: 'Code incorrect ou expiré.' });
    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw invalid;
    if (!safeEqual(otp.codeHash, this.hashCode(input.phone, input.code))) {
      await this.db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
      throw invalid;
    }
    await this.db.update(otpCodes).set({ consumedAt: now }).where(eq(otpCodes.id, otp.id));

    const { user, isNew } = await this.findOrCreateUser(input.phone, now);
    if (user.status === 'banned') throw forbidden('account_banned', 'Ce compte a été banni.');
    const deviceChanged = await this.bindDevice(user, input.deviceId, input.deviceName, now);
    await this.db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id));

    const payload: JwtPayload = { sub: user.id, did: input.deviceId };
    return {
      accessToken: await this.jwt.signAsync(payload, { expiresIn: '30d' }),
      isNewUser: isNew,
      deviceChanged,
      requiresMfa: user.staffRole !== null,
    };
  }

  /** Double authentification de l'équipe : code TOTP de l'application d'authentification. */
  async verifyStaffMfa(user: AuthUser, code: string) {
    const [row] = await this.db
      .select({ totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, user.id));
    if (!user.staffRole || !row?.totpSecret || !verifyTotp(row.totpSecret, code, this.clock.now().getTime())) {
      throw new UnauthorizedException({ code: 'invalid_mfa', message: 'Code de double authentification incorrect.' });
    }
    const payload: JwtPayload = { sub: user.id, did: user.deviceId, mfa: true };
    return { accessToken: await this.jwt.signAsync(payload, { expiresIn: '12h' }) };
  }

  private hashCode(phone: string, code: string): string {
    return hmac(this.config.APP_SECRET, `otp:${phone}:${code}`);
  }

  private async findOrCreateUser(phone: string, now: Date) {
    const [existing] = await this.db.select().from(users).where(eq(users.phone, phone));
    if (existing) return { user: existing, isNew: false };
    for (let attempt = 0; attempt < 5; attempt++) {
      const [created] = await this.db
        .insert(users)
        .values({ phone, referralCode: randomCode(), createdAt: now })
        .onConflictDoNothing()
        .returning();
      if (created) return { user: created, isNew: true };
      const [raced] = await this.db.select().from(users).where(eq(users.phone, phone));
      if (raced) return { user: raced, isNew: false };
    }
    throw new Error('Impossible de créer le compte.');
  }

  /**
   * Un seul téléphone autorisé par compte. Un changement de téléphone d'un compte vérifié
   * le gèle jusqu'à un nouveau selfie ; des changements fréquents déclenchent une alerte.
   */
  private async bindDevice(
    user: typeof users.$inferSelect,
    deviceId: string,
    name: string | undefined,
    now: Date,
  ): Promise<boolean> {
    const active = await this.db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, user.id), isNull(devices.revokedAt)));
    if (active.some((d) => d.deviceId === deviceId)) return false;

    await this.db.transaction(async (tx) => {
      await tx
        .update(devices)
        .set({ revokedAt: now })
        .where(and(eq(devices.userId, user.id), isNull(devices.revokedAt), ne(devices.deviceId, deviceId)));
      await tx
        .insert(devices)
        .values({ userId: user.id, deviceId, name, createdAt: now })
        .onConflictDoUpdate({
          target: [devices.userId, devices.deviceId],
          set: { revokedAt: null, name, lastSelfieCheckAt: null, selfieCheckKey: null },
        });
    });
    if (active.length === 0) return false;

    if (user.kycStatus === 'approved' && user.status === 'active' && !user.staffRole) {
      await this.db
        .update(users)
        .set({ status: 'frozen', statusReason: 'new_device' })
        .where(eq(users.id, user.id));
    }
    const [changes] = await this.db
      .select({ n: count() })
      .from(devices)
      .where(and(eq(devices.userId, user.id), gte(devices.createdAt, new Date(now.getTime() - 90 * DAY))));
    if ((changes?.n ?? 0) > DEVICE_CHANGES_ALERT) {
      await this.db.insert(fraudSignals).values({
        userId: user.id,
        kind: 'frequent_device_changes',
        details: { devicesIn90Days: changes?.n },
      });
    }
    return true;
  }
}
