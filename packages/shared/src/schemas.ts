import { z } from 'zod';
import { HOUSING_TYPES } from './listing.js';
import { PACK_TIERS } from './packs.js';
import { USER_ROLES } from './roles.js';
import { normalizePhone } from './geo.js';
import { VISIT_OUTCOMES } from './visits.js';

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Numéro de téléphone invalide.' });
      return z.NEVER;
    }
    return normalized;
  });

/** Connexion par code OTP plutôt que par mot de passe. */
export const requestOtpSchema = z.object({
  phone: phoneSchema,
  channel: z.enum(['sms', 'whatsapp']).default('whatsapp'),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Le code contient 6 chiffres.'),
  /** Identifiant stable du téléphone : un seul téléphone autorisé par compte. */
  deviceId: z.string().min(8).max(128),
  deviceName: z.string().max(120).optional(),
});

export const completeProfileSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  roles: z.array(z.enum(USER_ROLES)).min(1),
  ambassadorCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,12}$/)
    .optional(),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,12}$/)
    .optional(),
  /** Consentement explicite et acceptation de la charte : cases non pré-cochées. */
  acceptCharter: z.literal(true),
  acceptPrivacy: z.literal(true),
});

export const purchasePackSchema = z.object({
  tier: z.enum(PACK_TIERS),
  operator: z.enum(['mtn', 'orange']),
  payerPhone: phoneSchema,
});

export const createAlertSchema = z.object({
  cityId: z.uuid(),
  districtIds: z.array(z.uuid()).max(10).default([]),
  type: z.enum(HOUSING_TYPES).optional(),
  minRent: z.number().int().min(0).optional(),
  maxRent: z.number().int().min(0),
  moveInDate: z.coerce.date().optional(),
});
export type CreateAlertInput = z.infer<typeof createAlertSchema>;

export const respondVisitSchema = z.object({
  decision: z.enum(['accept', 'refuse']),
  /** Le bailleur peut proposer un autre créneau en acceptant. */
  slot: z.coerce.date().optional(),
  reason: z.string().trim().max(300).optional(),
});

export const validateVisitSchema = z.object({
  qrToken: z.string().min(16).max(256),
});

export const visitOutcomeSchema = z.object({
  outcome: z.enum(VISIT_OUTCOMES),
});

/**
 * Le bailleur marque son logement « Loué » et choisit le locataire parmi les personnes
 * qui l'ont contacté via Klé, ou indique une personne hors Klé.
 */
export const confirmRentalSchema = z.discriminatedUnion('tenant', [
  z.object({
    tenant: z.literal('kle_contact'),
    visitRequestId: z.uuid(),
    monthlyRent: z.number().int().min(1_000).optional(),
  }),
  z.object({
    tenant: z.literal('outside'),
    /** Si la personne est venue par un membre Klé, le bailleur l'indique dans la liste de ses visiteurs. */
    referredByVisitRequestId: z.uuid().optional(),
  }),
]);
export type ConfirmRentalInput = z.infer<typeof confirmRentalSchema>;

export const createReviewSchema = z.object({
  visitRequestId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** Avis de quartier : eau, électricité, sécurité, inondations, état des routes. */
export const districtReviewSchema = z.object({
  districtId: z.uuid(),
  water: z.number().int().min(1).max(5),
  electricity: z.number().int().min(1).max(5),
  security: z.number().int().min(1).max(5),
  flooding: z.number().int().min(1).max(5),
  roads: z.number().int().min(1).max(5),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
