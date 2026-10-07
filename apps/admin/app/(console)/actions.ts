'use server';

import { redirect } from 'next/navigation';
import { ApiError, adminApi, post } from '@/lib/api';

/** Exécute une décision puis revient sur la file avec un message de confirmation ou d'erreur. */
async function decide(back: string, okMessage: string, run: () => Promise<unknown>): Promise<never> {
  let target: string;
  try {
    await run();
    target = `${back}?ok=${encodeURIComponent(okMessage)}`;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    target = `${back}?erreur=${encodeURIComponent(error.message)}`;
  }
  redirect(target);
}

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
};

export async function decideKyc(id: string, form: FormData) {
  const approve = form.get('decision') === 'approve';
  await decide('/kyc', approve ? 'Identité validée.' : 'Dossier refusé.', () =>
    post(`/admin/kyc/${id}/decision`, { approve, reason: text(form, 'reason'), documentNumber: text(form, 'documentNumber') }),
  );
}

export async function decideProof(id: string, form: FormData) {
  const approve = form.get('decision') === 'approve';
  await decide('/preuves', approve ? 'Preuve validée.' : 'Preuve refusée.', () =>
    post(`/admin/proofs/${id}/decision`, { approve, reason: text(form, 'reason') }),
  );
}

export async function decideListing(id: string, form: FormData) {
  const approve = form.get('decision') === 'approve';
  await decide('/annonces', approve ? 'Annonce publiée.' : 'Annonce refusée.', () =>
    post(`/admin/listings/${id}/decision`, { approve, reason: text(form, 'reason') }),
  );
}

export async function decideReport(id: string, form: FormData) {
  const action = form.get('action') === 'dismiss' ? 'dismiss' : 'sanction';
  await decide('/signalements', action === 'dismiss' ? 'Signalement classé.' : 'Sanction appliquée.', () =>
    post(
      `/admin/reports/${id}/decision`,
      action === 'dismiss' ? { action } : { action, infraction: text(form, 'infraction'), note: text(form, 'note') },
    ),
  );
}

export async function decideFraud(id: string, form: FormData) {
  const confirm = form.get('decision') === 'confirm';
  await decide('/fraude', confirm ? 'Alerte confirmée.' : 'Alerte classée.', () =>
    post(`/admin/fraud-signals/${id}/decision`, { confirm, infraction: text(form, 'infraction'), note: text(form, 'note') }),
  );
}

export async function sanctionUser(id: string, form: FormData) {
  await decide(`/comptes/${id}`, 'Sanction appliquée.', () =>
    post(`/admin/users/${id}/sanctions`, { infraction: text(form, 'infraction'), note: text(form, 'note') }),
  );
}

export async function reactivateUser(id: string, form: FormData) {
  await decide(`/comptes/${id}`, 'Compte réactivé.', () => post(`/admin/users/${id}/reactivate`, { note: text(form, 'note') }));
}

export async function refundPayment(userId: string, paymentId: string, form: FormData) {
  await decide(`/comptes/${userId}`, 'Remboursement enregistré.', () =>
    post(`/admin/payments/${paymentId}/refund`, { note: text(form, 'note') }),
  );
}

export async function createAmbassador(form: FormData) {
  const bonus = text(form, 'bonusPerLandlord');
  await decide('/ambassadeurs', 'Ambassadeur créé.', () =>
    post('/admin/ambassadors', {
      userId: text(form, 'userId'),
      code: text(form, 'code'),
      bonusPerLandlord: bonus ? Number(bonus) : undefined,
    }),
  );
}

export async function markRewardPaid(id: string) {
  await decide('/ambassadeurs', 'Prime marquée payée.', () => post(`/admin/ambassador-rewards/${id}/paid`, {}));
}

export async function updateCountry(code: string, form: FormData) {
  const n = (k: string) => Number(text(form, k)?.replace(/\s/g, ''));
  await decide('/reglages', 'Prix mis à jour.', () =>
    adminApi(`/admin/countries/${code}`, {
      method: 'PATCH',
      body: JSON.stringify({
        packPrices: { essentiel: n('essentiel'), confort: n('confort'), premium: n('premium') },
        successFeeBps: Math.round(Number(text(form, 'successFeePercent')?.replace(',', '.')) * 100),
      }),
    }),
  );
}

export async function openCity(id: string) {
  await decide('/reglages', 'Ville ouverte.', () => post(`/admin/cities/${id}/open`, {}));
}

export async function createStaff(form: FormData) {
  let target = '/reglages';
  try {
    const res = await post<{ totpUri: string }>('/admin/staff', { phone: text(form, 'phone'), role: text(form, 'role') });
    target = `/reglages?ok=${encodeURIComponent('Compte créé. Ajoute ce lien dans l’application d’authentification de la personne :')}&totp=${encodeURIComponent(res.totpUri)}`;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    target = `/reglages?erreur=${encodeURIComponent(error.message)}`;
  }
  redirect(target);
}
