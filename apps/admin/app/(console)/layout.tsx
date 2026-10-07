import Link from 'next/link';
import type { ReactNode } from 'react';
import { adminApi, type Me } from '@/lib/api';
import { logout } from '../login/actions';
import type { Dashboard } from './types';

const ROLE_LABELS = { moderator: 'Modérateur', supervisor: 'Superviseur', admin: 'Administrateur' } as const;

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const [me, dashboard] = await Promise.all([adminApi<Me>('/me'), adminApi<Dashboard>('/admin/dashboard')]);
  const q = dashboard.queues;
  const nav: Array<[string, string, number | null]> = [
    ['/', 'Tableau de bord', null],
    ['/kyc', 'Identités', q.kycPending],
    ['/preuves', 'Preuves', null],
    ['/annonces', 'Annonces', q.listingsPending],
    ['/signalements', 'Signalements', q.reportsOpen],
    ['/fraude', 'Contournement', q.fraudOpen],
    ['/comptes', 'Comptes', null],
    ['/liste-attente', 'Liste d’attente', dashboard.waitlist.total],
    ['/ambassadeurs', 'Ambassadeurs', null],
    ...(me.staffRole === 'admin' ? ([['/reglages', 'Réglages', null]] as Array<[string, string, null]>) : []),
  ];
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-white lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="font-extrabold">Back-office Klé</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map(([href, label, count]) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink/80 hover:bg-canvas hover:text-ink"
            >
              {label}
              {count ? <span className="rounded-full bg-gold-soft px-2 text-xs font-bold text-[#7a5200]">{count}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-line px-5 py-4 text-sm lg:block">
          <p className="font-semibold">{me.fullName ?? me.phone}</p>
          <p className="text-muted">{me.staffRole ? ROLE_LABELS[me.staffRole] : ''}</p>
          <form action={logout}>
            <button className="mt-2 text-xs font-semibold text-muted underline">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
