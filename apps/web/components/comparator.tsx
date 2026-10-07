'use client';

import { compareWithAgent } from '@kle/shared/fees';
import { formatMoney } from '@kle/shared/money';
import { useState } from 'react';

type Tier = 'essentiel' | 'confort' | 'premium';

const PRESETS = [30_000, 75_000, 150_000, 400_000];
const TIER_LABELS: Record<Tier, string> = { essentiel: 'Essentiel', confort: 'Confort', premium: 'Premium' };

/** Comparatif affiché sous le loyer : agent (un mois + visites) contre Klé (pack + 10 %). */
export function Comparator() {
  const [rent, setRent] = useState(150_000);
  const [tier, setTier] = useState<Tier>('confort');
  const c = compareWithAgent(rent, tier);

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-sm ring-1 ring-line sm:p-7">
      <label className="block text-sm font-semibold" htmlFor="rent">
        Loyer mensuel du logement
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="rent"
          type="range"
          min={20_000}
          max={500_000}
          step={5_000}
          value={rent}
          onChange={(e) => setRent(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <span className="w-32 shrink-0 text-right font-bold tabular-nums">{formatMoney(rent)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setRent(p)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${rent === p ? 'bg-ink text-white ring-ink' : 'bg-paper ring-line'}`}
          >
            {formatMoney(p)}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2 text-xs">
        {(Object.keys(TIER_LABELS) as Tier[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={`flex-1 rounded-xl px-2 py-2 font-semibold ring-1 ${tier === t ? 'bg-brand-soft text-brand-dark ring-brand' : 'ring-line'}`}
          >
            Pack {TIER_LABELS[t]}
          </button>
        ))}
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-paper p-4">
          <dt className="text-sm font-semibold text-muted">Avec un agent</dt>
          <dd className="mt-1 text-2xl font-extrabold tabular-nums">{formatMoney(c.agentCommission)}</dd>
          <dd className="text-sm text-muted">+ frais de visite à chaque logement</dd>
        </div>
        <div className="rounded-2xl bg-brand p-4 text-white">
          <dt className="text-sm font-semibold text-white/80">Avec Klé</dt>
          <dd className="mt-1 text-2xl font-extrabold tabular-nums">{formatMoney(c.kleTotal)}</dd>
          <dd className="text-sm text-white/80">
            pack {formatMoney(c.packPrice)} + {formatMoney(c.successFee)} si tu obtiens le logement
          </dd>
        </div>
      </dl>
      {c.savings > 0 && (
        <p className="mt-4 text-center text-sm font-semibold text-brand-dark">
          Tu gardes {formatMoney(c.savings)} dans ta poche, et zéro frais de visite.
        </p>
      )}
    </div>
  );
}
