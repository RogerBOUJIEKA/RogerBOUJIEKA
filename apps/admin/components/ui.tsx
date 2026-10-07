import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white p-5 ring-1 ring-line ${className}`}>{children}</div>;
}

const TONES = {
  neutral: 'bg-canvas text-ink ring-line',
  green: 'bg-brand-soft text-brand-dark ring-brand/20',
  gold: 'bg-gold-soft text-[#7a5200] ring-gold/30',
  red: 'bg-danger-soft text-danger ring-danger/20',
} as const;

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Délai cible de la file : en retard en rouge. */
export function Sla({ dueAt, overdue }: { dueAt: string; overdue: boolean }) {
  const hours = Math.round((new Date(dueAt).getTime() - Date.now()) / 3_600_000);
  return overdue ? (
    <Badge tone="red">En retard de {Math.abs(hours)} h</Badge>
  ) : (
    <Badge tone={hours <= 3 ? 'gold' : 'green'}>Reste {hours} h</Badge>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-muted">{children}</div>;
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>;
  if (ok) return <p className="mb-4 rounded-lg bg-brand-soft px-4 py-3 text-sm font-medium text-brand-dark">{ok}</p>;
  return null;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export const button = {
  primary: 'rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark',
  danger: 'rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:opacity-90',
  ghost: 'rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-line hover:bg-canvas',
};

export const input = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { timeZone: 'Africa/Douala', dateStyle: 'short', timeStyle: 'short' });
}

export function formatXaf(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

export type SearchParams = Promise<Record<string, string | undefined>>;
