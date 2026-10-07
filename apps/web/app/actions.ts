'use server';

import { waitlistSignupSchema, type WaitlistRole } from '@kle/shared';
import { api, ApiError } from '@/lib/api';

export type WaitlistState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fields?: Record<string, string> }
  | { status: 'success'; position: number; role: WaitlistRole; firstName: string };

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};
const int = (form: FormData, key: string) => {
  const value = text(form, key)?.replace(/[\s .]/g, '');
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
};
const yesNo = (form: FormData, key: string) => {
  const value = text(form, key);
  return value === 'oui' ? true : value === 'non' ? false : undefined;
};

/** Inscription à la liste d'attente : validée ici avec le schéma partagé, puis envoyée à l'API. */
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const role = text(form, 'role') as WaitlistRole | undefined;
  const survey =
    role === 'seeker'
      ? {
          paidVisitFees: yesNo(form, 'paidVisitFees'),
          lastAgentCommission: int(form, 'lastAgentCommission'),
          scammedBefore: yesNo(form, 'scammedBefore'),
          preferredPack: text(form, 'preferredPack'),
          moveInMonth: text(form, 'moveInMonth'),
        }
      : role === 'landlord'
        ? {
            vacantUnits: int(form, 'vacantUnits'),
            currentChannel: text(form, 'currentChannel'),
            canFilmVideo: yesNo(form, 'canFilmVideo'),
            isManager: yesNo(form, 'isManager'),
          }
        : {
            departureMonth: text(form, 'departureMonth'),
            landlordAgrees: yesNo(form, 'landlordAgrees'),
          };
  const cleanSurvey = Object.fromEntries(Object.entries(survey).filter(([, v]) => v !== undefined));

  const candidate = {
    role,
    fullName: text(form, 'fullName'),
    phone: text(form, 'phone') ?? '',
    whatsapp: form.get('whatsapp') !== 'non',
    city: 'Douala',
    district: text(form, 'district'),
    budgetMax: role === 'seeker' ? int(form, 'budgetMax') : undefined,
    ambassadorCode: text(form, 'ambassadorCode'),
    survey: Object.keys(cleanSurvey).length ? cleanSurvey : undefined,
    source: text(form, 'source'),
    consent: form.get('consent') === 'on',
  };

  const parsed = waitlistSignupSchema.safeParse(candidate);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fields[key] ??= key === 'role' ? 'Choisis ton profil.' : issue.message;
    }
    return { status: 'error', message: 'Vérifie les champs en rouge.', fields };
  }

  try {
    const result = await api<{ position: number }>('/waitlist', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    return {
      status: 'success',
      position: result.position,
      role: parsed.data.role,
      firstName: parsed.data.fullName.split(/\s+/)[0] ?? '',
    };
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Une erreur est survenue. Réessaie dans un instant.';
    return { status: 'error', message };
  }
}
