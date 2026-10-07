'use client';

import { startTransition, useActionState, useState } from 'react';
import { joinWaitlist, type WaitlistState } from './actions';

type Role = 'seeker' | 'landlord' | 'outgoing_tenant';

const ROLES: Array<{ value: Role; label: string; hint: string }> = [
  { value: 'seeker', label: 'Je cherche un logement', hint: 'Chambre, studio, appartement…' },
  { value: 'landlord', label: 'J’ai un logement à louer', hint: 'Propriétaire ou gérant' },
  { value: 'outgoing_tenant', label: 'Je quitte mon logement', hint: 'Bientôt disponible' },
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function WaitlistForm({
  districts,
  initialRole,
  ambassadorCode,
  source,
}: {
  districts: string[];
  initialRole?: Role;
  ambassadorCode?: string;
  source?: string;
}) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: 'idle' });
  const [role, setRole] = useState<Role | undefined>(initialRole);

  if (state.status === 'success') return <Success state={state} />;
  const errors = state.status === 'error' ? (state.fields ?? {}) : {};

  return (
    <form
      action={action}
      // Envoi manuel : React ne vide pas le formulaire, la personne garde sa saisie en cas d'erreur.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-6"
      noValidate
    >
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-ink">Tu es…</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`cursor-pointer rounded-2xl border-2 p-3 transition ${
                role === r.value ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand/40'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="sr-only"
              />
              <span className="block text-sm font-bold">{r.label}</span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.role} />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ton nom" error={errors.fullName}>
          <input name="fullName" autoComplete="name" required className={input(errors.fullName)} placeholder="Ex. Marie Ngono" />
        </Field>
        <Field label="Ton numéro WhatsApp" error={errors.phone}>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            className={input(errors.phone)}
            placeholder="6XX XX XX XX"
          />
        </Field>
        <Field label={role === 'landlord' ? 'Quartier de ton logement' : 'Quartier'} error={errors.district}>
          <select name="district" className={input(errors.district)} defaultValue="">
            <option value="">— Choisir —</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
            <option>Autre quartier</option>
          </select>
        </Field>
        {role === 'seeker' && (
          <Field label="Budget maximum par mois (FCFA)" error={errors.budgetMax}>
            <input name="budgetMax" inputMode="numeric" className={input(errors.budgetMax)} placeholder="Ex. 75 000" />
          </Field>
        )}
        {role === 'landlord' && (
          <Field label="Combien de logements libres en ce moment ?">
            <input name="vacantUnits" inputMode="numeric" className={input()} placeholder="Ex. 2" />
          </Field>
        )}
        {role === 'outgoing_tenant' && (
          <Field label="Mois de ton départ">
            <input name="departureMonth" type="month" className={input()} />
          </Field>
        )}
      </div>

      {role && (
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="mb-3 text-sm font-semibold">Trois questions rapides (facultatif) — elles nous aident à construire Klé avec toi.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {role === 'seeker' && (
              <>
                <YesNo name="paidVisitFees" label="As-tu déjà payé des frais de visite ?" />
                <YesNo name="scammedBefore" label="T’es-tu déjà fait arnaquer en cherchant ?" />
                <Field label="Combien as-tu payé à un agent la dernière fois ? (FCFA)">
                  <input name="lastAgentCommission" inputMode="numeric" className={input()} placeholder="Ex. 50 000" />
                </Field>
                <Field label="Quel pack te tenterait ?">
                  <select name="preferredPack" className={input()} defaultValue="">
                    <option value="">— Je ne sais pas —</option>
                    <option value="essentiel">Essentiel · 5 000 FCFA</option>
                    <option value="confort">Confort · 10 000 FCFA</option>
                    <option value="premium">Premium · 25 000 FCFA</option>
                    <option value="aucun">Aucun</option>
                  </select>
                </Field>
                <Field label="Quand veux-tu emménager ?">
                  <input name="moveInMonth" type="month" className={input()} />
                </Field>
              </>
            )}
            {role === 'landlord' && (
              <>
                <Field label="Comment trouves-tu tes locataires aujourd’hui ?">
                  <select name="currentChannel" className={input()} defaultValue="">
                    <option value="">— Choisir —</option>
                    <option value="agent">Par un agent ou démarcheur</option>
                    <option value="bouche_a_oreille">Bouche-à-oreille</option>
                    <option value="facebook">Facebook</option>
                    <option value="whatsapp">Groupes WhatsApp</option>
                    <option value="pancarte">Pancarte « À louer »</option>
                    <option value="autre">Autre</option>
                  </select>
                </Field>
                <YesNo name="canFilmVideo" label="Peux-tu filmer ton logement avec ton téléphone ?" />
                <YesNo name="isManager" label="Gères-tu le logement pour quelqu’un d’autre ?" />
              </>
            )}
            {role === 'outgoing_tenant' && (
              <YesNo name="landlordAgrees" label="Ton bailleur est-il d’accord pour que tu présentes le logement ?" />
            )}
          </div>
        </div>
      )}

      <details className="text-sm" open={!!ambassadorCode}>
        <summary className="cursor-pointer text-muted">Un ambassadeur Klé t’a parlé de nous ?</summary>
        <div className="mt-2 max-w-xs">
          <Field label="Code ambassadeur" error={errors.ambassadorCode}>
            <input
              name="ambassadorCode"
              defaultValue={ambassadorCode}
              className={`${input(errors.ambassadorCode)} uppercase`}
              placeholder="Ex. AKWA21"
            />
          </Field>
        </div>
      </details>

      <input type="hidden" name="source" value={source ?? ''} />

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-brand" />
          <span>
            J’accepte que Klé garde mon nom, mon numéro et mes réponses pour me prévenir du lancement sur WhatsApp et
            améliorer le service. Je peux demander leur suppression à tout moment.{' '}
            <a href="/confidentialite" className="underline">
              Données personnelles
            </a>
          </span>
        </label>
        <FieldError message={errors.consent} />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:opacity-60 sm:w-auto"
      >
        {pending ? 'Inscription…' : 'Je m’inscris sur la liste d’attente'}
      </button>
    </form>
  );
}

function Success({ state }: { state: Extract<WaitlistState, { status: 'success' }> }) {
  const invite = encodeURIComponent(
    `Je me suis inscrit sur Klé : des logements en vidéo à Douala, publiés par des personnes vérifiées, sans démarcheur. Inscris-toi aussi : ${SITE_URL}`,
  );
  const message =
    state.role === 'seeker'
      ? 'On te prévient sur WhatsApp dès l’ouverture à Douala, avec les premiers logements en vidéo.'
      : state.role === 'landlord'
        ? 'Un membre de l’équipe te contacte sur WhatsApp pour publier ton logement gratuitement dès l’ouverture.'
        : 'On te prévient dès que tu peux publier ton logement dans « Bientôt disponible ».';
  return (
    <div className="rounded-3xl bg-brand p-6 text-white sm:p-8" role="status">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold">Inscription confirmée</p>
      <p className="mt-2 text-2xl font-extrabold">Merci {state.firstName}, tu es le n° {state.position} !</p>
      <p className="mt-3 text-white/85">{message}</p>
      <a
        href={`https://wa.me/?text=${invite}`}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-brand"
      >
        Inviter mes amis sur WhatsApp
      </a>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="mt-1 block text-xs font-medium text-danger">{message}</span> : null;
}

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="flex gap-2">
        {['oui', 'non'].map((v) => (
          <label key={v} className="flex-1">
            <input type="radio" name={name} value={v} className="peer sr-only" />
            <span className="block cursor-pointer rounded-xl border border-line bg-white px-3 py-2 text-center text-sm capitalize peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
              {v}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function input(error?: string) {
  return `w-full rounded-xl border bg-white px-3 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${
    error ? 'border-danger' : 'border-line'
  }`;
}
