'use client';

import { useActionState } from 'react';
import { loginStep, type LoginState } from './actions';

const field = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginStep, { step: 'phone' });
  return (
    <form action={action} className="space-y-4">
      {state.step === 'phone' && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Numéro de téléphone</span>
          <input name="phone" type="tel" required autoFocus className={field} placeholder="+237 6XX XX XX XX" />
        </label>
      )}
      {state.step === 'code' && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Code reçu sur WhatsApp</span>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className={field} />
          {state.devCode && <span className="mt-1 block text-xs text-muted">Développement : code {state.devCode}</span>}
        </label>
      )}
      {state.step === 'mfa' && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Code de l’application d’authentification</span>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className={field} />
        </label>
      )}
      {state.error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? 'Vérification…' : state.step === 'phone' ? 'Recevoir un code' : 'Valider'}
      </button>
    </form>
  );
}
