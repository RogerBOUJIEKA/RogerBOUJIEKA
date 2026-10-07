import { z } from 'zod';

/** La charte, acceptée à l'inscription. */
export const CHARTER_RULES = [
  'La visite est gratuite : aucun frais de visite ni de déplacement.',
  'Aucun paiement avant d’avoir vu le logement et rencontré le bailleur.',
  'Le prix affiché est le vrai prix.',
  'Un logement loué est marqué « Pris » sous 48 h.',
  'Un sortant ne cède son logement qu’avec l’accord de son bailleur.',
] as const;

/** Version de la charte et des CGU acceptée ; à incrémenter à chaque modification du texte. */
export const CHARTER_VERSION = '2026-10';

export const VISIT_CHARTER_REMINDER = 'Visite gratuite. Ne payez rien avant d’avoir vu le logement.';

export const INFRACTIONS = [
  'listing_taken_not_updated',
  'price_mismatch',
  'money_before_visit',
  'fake_listing',
  'fake_document',
  'success_fee_unpaid',
  'account_sharing',
  'undeclared_third_party',
  'abusive_behavior',
] as const;
export type Infraction = (typeof INFRACTIONS)[number];

export type SanctionKind =
  | 'warning'
  | 'listing_hidden'
  | 'suspension'
  | 'permanent_ban'
  | 'blocked_until_paid'
  | 'fees_due_and_suspension';

export interface SanctionStep {
  kind: SanctionKind;
  /** Durée pour une suspension, en jours. */
  days?: number;
  /** Données transmises aux autorités sur réquisition. */
  authoritiesOnRequest?: boolean;
}

export interface InfractionRule {
  label: string;
  /** Échelle de sanctions : la n-ième infraction applique la n-ième étape (la dernière se répète). */
  ladder: SanctionStep[];
  /** `false` si la sanction de la charte n'est pas encore écrite et doit être confirmée. */
  defined: boolean;
}

export const CHARTER_SANCTIONS: Record<Infraction, InfractionRule> = {
  listing_taken_not_updated: {
    label: 'Annonce déjà prise non mise à jour',
    ladder: [{ kind: 'warning' }, { kind: 'listing_hidden' }],
    defined: true,
  },
  price_mismatch: {
    label: 'Prix réel différent de l’annonce',
    ladder: [{ kind: 'warning' }, { kind: 'suspension', days: 30 }],
    defined: true,
  },
  money_before_visit: {
    label: 'Argent demandé avant la visite',
    ladder: [{ kind: 'permanent_ban' }],
    defined: true,
  },
  fake_listing: {
    label: 'Fausse annonce ou logement inexistant',
    ladder: [{ kind: 'permanent_ban', authoritiesOnRequest: true }],
    defined: true,
  },
  fake_document: {
    label: 'Faux document ou fausse preuve',
    ladder: [{ kind: 'permanent_ban', authoritiesOnRequest: true }],
    defined: true,
  },
  success_fee_unpaid: {
    label: 'Frais de réussite non réglés après 30 jours',
    ladder: [{ kind: 'blocked_until_paid' }],
    defined: true,
  },
  account_sharing: {
    label: 'Partage de compte',
    ladder: [{ kind: 'suspension', days: 30 }, { kind: 'permanent_ban' }],
    defined: true,
  },
  undeclared_third_party: {
    label: 'Logement obtenu pour un tiers sans le déclarer',
    // La charte ne fixe pas la durée : 30 jours par défaut, à confirmer.
    ladder: [{ kind: 'fees_due_and_suspension', days: 30 }],
    defined: true,
  },
  abusive_behavior: {
    label: 'Comportement abusif',
    // Motif de signalement sans sanction écrite dans la charte : échelle provisoire.
    ladder: [{ kind: 'warning' }, { kind: 'suspension', days: 30 }, { kind: 'permanent_ban' }],
    defined: false,
  },
};

/** Sanction à appliquer compte tenu du nombre d'infractions du même type déjà sanctionnées. */
export function sanctionFor(infraction: Infraction, previousOccurrences: number): SanctionStep {
  const { ladder } = CHARTER_SANCTIONS[infraction];
  return ladder[Math.min(previousOccurrences, ladder.length - 1)]!;
}

/** Motifs proposés sur le bouton « Signaler » de chaque annonce et de chaque profil. */
export const REPORT_REASONS = [
  'fake_listing',
  'money_before_visit',
  'already_taken',
  'price_mismatch',
  'abusive_behavior',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  fake_listing: 'Fausse annonce',
  money_before_visit: 'Argent demandé avant la visite',
  already_taken: 'Logement déjà pris',
  price_mismatch: 'Prix différent de l’annonce',
  abusive_behavior: 'Comportement abusif',
};

export const REPORT_REASON_TO_INFRACTION: Record<ReportReason, Infraction> = {
  fake_listing: 'fake_listing',
  money_before_visit: 'money_before_visit',
  already_taken: 'listing_taken_not_updated',
  price_mismatch: 'price_mismatch',
  abusive_behavior: 'abusive_behavior',
};

export const createReportSchema = z.object({
  targetType: z.enum(['listing', 'user']),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(2000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;
