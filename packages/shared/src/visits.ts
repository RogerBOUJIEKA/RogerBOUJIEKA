import { z } from 'zod';
import type { AccountStatus } from './roles.js';

/** 3 visites programmées maximum en même temps. */
export const MAX_SCHEDULED_VISITS = 3;

/** L'adresse exacte disparaît du téléphone du chercheur après la visite. */
export const ADDRESS_VISIBLE_AFTER_SLOT_HOURS = 6;

/** La demande d'avis part 7 jours après le contact, vers les deux parties. */
export const REVIEW_REQUEST_DELAY_DAYS = 7;

export const VISIT_STATUSES = [
  'pending', // en attente de réponse du bailleur
  'accepted',
  'refused',
  'cancelled',
  'validated', // QR code scanné par le bailleur sur place
  'expired', // le créneau est passé sans réponse
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const VISIT_OUTCOMES = ['interested', 'not_interested', 'no_show', 'rented'] as const;
export type VisitOutcome = (typeof VISIT_OUTCOMES)[number];

export const createVisitRequestSchema = z.object({
  listingId: z.uuid(),
  proposedSlot: z.coerce.date(),
  message: z.string().trim().max(500).optional(),
});
export type CreateVisitRequestInput = z.infer<typeof createVisitRequestSchema>;

export interface VisitEligibilityInput {
  accountStatus: AccountStatus;
  kycApproved: boolean;
  hasActivePack: boolean;
  requestsRemaining: number;
  /** Visites en attente ou acceptées dont le créneau n'est pas encore passé. */
  scheduledVisits: number;
  /** Visites passées dont le chercheur n'a pas encore donné le résultat. */
  visitsAwaitingOutcome: number;
  isOwnListing: boolean;
  alreadyRequested: boolean;
  listingVisible: boolean;
}

export type VisitIneligibility =
  | 'account_not_active'
  | 'kyc_required'
  | 'pack_required'
  | 'no_requests_left'
  | 'too_many_scheduled'
  | 'outcome_required'
  | 'own_listing'
  | 'already_requested'
  | 'listing_unavailable';

export const VISIT_INELIGIBILITY_MESSAGES: Record<VisitIneligibility, string> = {
  account_not_active: 'Ton compte ne peut pas demander de visite pour le moment.',
  kyc_required: 'Termine la vérification de ton identité pour contacter les bailleurs.',
  pack_required: 'Choisis un pack pour contacter les bailleurs.',
  no_requests_left: 'Tu as utilisé toutes les demandes de ton pack.',
  too_many_scheduled: `Tu as déjà ${MAX_SCHEDULED_VISITS} visites programmées. Termine-en une avant d’en demander une autre.`,
  outcome_required: 'Dis-nous comment s’est passée ta dernière visite avant d’en demander une nouvelle.',
  own_listing: 'Tu ne peux pas demander à visiter ta propre annonce.',
  already_requested: 'Tu as déjà une demande en cours pour ce logement.',
  listing_unavailable: 'Ce logement n’est plus disponible.',
};

/** Limites de chercheur réel : empêchent un abonné de servir d'intermédiaire à ses amis. */
export function checkVisitEligibility(
  input: VisitEligibilityInput,
): { ok: true } | { ok: false; reason: VisitIneligibility; message: string } {
  const fail = (reason: VisitIneligibility) => ({
    ok: false as const,
    reason,
    message: VISIT_INELIGIBILITY_MESSAGES[reason],
  });
  if (input.accountStatus !== 'active') return fail('account_not_active');
  if (!input.listingVisible) return fail('listing_unavailable');
  if (input.isOwnListing) return fail('own_listing');
  if (!input.kycApproved) return fail('kyc_required');
  if (!input.hasActivePack) return fail('pack_required');
  if (input.alreadyRequested) return fail('already_requested');
  if (input.requestsRemaining <= 0) return fail('no_requests_left');
  if (input.scheduledVisits >= MAX_SCHEDULED_VISITS) return fail('too_many_scheduled');
  if (input.visitsAwaitingOutcome > 0) return fail('outcome_required');
  return { ok: true };
}

/**
 * L'adresse exacte s'affiche seulement après acceptation, sur le téléphone du chercheur,
 * et disparaît après la visite.
 */
export function isExactAddressVisible(
  status: VisitStatus,
  slot: Date,
  now: Date,
): boolean {
  if (status !== 'accepted') return false;
  return now.getTime() <= slot.getTime() + ADDRESS_VISIBLE_AFTER_SLOT_HOURS * 3_600_000;
}
