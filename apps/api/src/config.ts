import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /**
   * `waitlist` (phase 0) : seules la liste d'attente, la lecture publique et l'équipe sont ouvertes ;
   * paiements, WhatsApp et stockage S3 ne sont pas encore nécessaires. `v1` : tout est ouvert.
   */
  LAUNCH_PHASE: z.enum(['waitlist', 'v1']).default('v1'),
  PORT: z.coerce.number().int().default(3001),
  DATABASE_URL: z.string().default('postgres://kle:kle@localhost:5432/kle'),
  /** Sans Redis, les notifications partent directement au lieu de passer par la file BullMQ. */
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).default('dev-only-secret-change-me-dev-only-secret'),
  /** Clé HMAC pour les codes OTP, les QR codes de visite et les empreintes d'identité. */
  APP_SECRET: z.string().min(32).default('dev-only-app-secret-change-me-dev-only-app'),
  PUBLIC_API_URL: z.string().default('http://localhost:3001'),
  WEB_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3002'),
  /** Renvoie le code OTP dans la réponse (développement uniquement, jamais en production). */
  OTP_DEV_ECHO: bool.default(false),
  JOBS_ENABLED: bool.default(true),

  PAYMENT_PROVIDER: z.enum(['fake', 'notchpay']).default('fake'),
  NOTCHPAY_PUBLIC_KEY: z.string().optional(),
  NOTCHPAY_PRIVATE_KEY: z.string().optional(),
  NOTCHPAY_WEBHOOK_HASH: z.string().optional(),

  NOTIFY_DRIVER: z.enum(['log', 'live']).default('log'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_OTP_TEMPLATE: z.string().default('kle_otp'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_PRIVATE_BUCKET: z.string().optional(),
  S3_PUBLIC_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  VIDEO_PROVIDER: z.enum(['local', 'cloudflare']).default('local'),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_STREAM_TOKEN: z.string().optional(),
  CLOUDFLARE_STREAM_WEBHOOK_SECRET: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = envSchema.parse(env);
  if (config.NODE_ENV === 'production') {
    const problems: string[] = [];
    if (config.JWT_SECRET.startsWith('dev-only')) problems.push('JWT_SECRET');
    if (config.APP_SECRET.startsWith('dev-only')) problems.push('APP_SECRET');
    if (config.OTP_DEV_ECHO) problems.push('OTP_DEV_ECHO doit être false');
    if (config.LAUNCH_PHASE === 'v1') {
      if (config.PAYMENT_PROVIDER === 'fake') problems.push('PAYMENT_PROVIDER');
      if (config.NOTIFY_DRIVER === 'log') problems.push('NOTIFY_DRIVER');
      if (config.STORAGE_DRIVER === 'local') problems.push('STORAGE_DRIVER');
    }
    if (problems.length) {
      throw new Error(`Configuration de production incomplète : ${problems.join(', ')}`);
    }
  }
  return config;
}

export const CONFIG = Symbol('CONFIG');
