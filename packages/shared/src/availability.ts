/**
 * Tous les 15 jours, Klé demande au publiant si son annonce est toujours disponible ;
 * sans réponse sous 72 h, elle est masquée. Fini le « c'est déjà pris ».
 */
export const AVAILABILITY_CHECK_INTERVAL_DAYS = 15;
export const AVAILABILITY_RESPONSE_HOURS = 72;

export type AvailabilityCheckState = 'fresh' | 'due' | 'awaiting_answer' | 'expired';

export function availabilityCheckState(
  lastConfirmedAt: Date,
  checkSentAt: Date | null,
  now: Date,
): AvailabilityCheckState {
  const dueAt = lastConfirmedAt.getTime() + AVAILABILITY_CHECK_INTERVAL_DAYS * 86_400_000;
  if (checkSentAt && checkSentAt.getTime() >= lastConfirmedAt.getTime()) {
    const deadline = checkSentAt.getTime() + AVAILABILITY_RESPONSE_HOURS * 3_600_000;
    return now.getTime() > deadline ? 'expired' : 'awaiting_answer';
  }
  return now.getTime() >= dueAt ? 'due' : 'fresh';
}
