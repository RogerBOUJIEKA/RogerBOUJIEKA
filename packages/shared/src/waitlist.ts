import { z } from 'zod';
import { normalizePhone } from './geo.js';

/**
 * Phase 0 — validation : page d'attente et enquête auprès des chercheurs, bailleurs et sortants.
 * Objectif de passage en V1 : 300 inscrits en liste d'attente et 50 bailleurs prêts à publier.
 */
export const PHASE0_GOALS = {
  waitlistSignups: 300,
  landlordsReady: 50,
  survey: { seeker: 50, landlord: 20, outgoing_tenant: 10 },
} as const;

export const WAITLIST_ROLES = ['seeker', 'landlord', 'outgoing_tenant'] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

export const WAITLIST_ROLE_LABELS: Record<WaitlistRole, string> = {
  seeker: 'Je cherche un logement',
  landlord: 'J’ai un logement à louer',
  outgoing_tenant: 'Je quitte mon logement',
};

const phone = z
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

/** Questions d'enquête, propres à chaque profil, posées avec l'inscription. */
export const seekerSurveySchema = z.object({
  paidVisitFees: z.boolean().optional(),
  /** Commission payée à un agent la dernière fois, en FCFA. */
  lastAgentCommission: z.number().int().min(0).max(10_000_000).optional(),
  scammedBefore: z.boolean().optional(),
  preferredPack: z.enum(['essentiel', 'confort', 'premium', 'aucun']).optional(),
  moveInMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const landlordSurveySchema = z.object({
  vacantUnits: z.number().int().min(0).max(500).optional(),
  currentChannel: z
    .enum(['agent', 'bouche_a_oreille', 'facebook', 'whatsapp', 'pancarte', 'autre'])
    .optional(),
  /** Le bailleur peut-il filmer son logement lui-même ? */
  canFilmVideo: z.boolean().optional(),
  isManager: z.boolean().optional(),
});

export const outgoingSurveySchema = z.object({
  departureMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  landlordAgrees: z.boolean().optional(),
});

/** Toutes les questions sont facultatives ; seules celles du profil choisi sont affichées. */
export const surveySchema = seekerSurveySchema
  .extend(landlordSurveySchema.shape)
  .extend(outgoingSurveySchema.shape)
  .strict();

export const waitlistSignupSchema = z
  .object({
    role: z.enum(WAITLIST_ROLES),
    fullName: z.string().trim().min(2, 'Indique ton nom.').max(120),
    phone,
    whatsapp: z.boolean().default(true),
    city: z.string().trim().min(2).max(80).default('Douala'),
    district: z.string().trim().max(80).optional(),
    budgetMax: z.number().int().min(0).max(10_000_000).optional(),
    ambassadorCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{4,12}$/, 'Code ambassadeur invalide.')
      .optional(),
    survey: surveySchema.optional(),
    source: z.string().trim().max(80).optional(),
    /** Consentement explicite (loi n° 2024/017) : case non pré-cochée. */
    consent: z.literal(true, { error: 'Ton accord est nécessaire pour t’inscrire.' }),
  })
  .strict();
export type WaitlistSignupInput = z.input<typeof waitlistSignupSchema>;
export type WaitlistSignup = z.output<typeof waitlistSignupSchema>;
