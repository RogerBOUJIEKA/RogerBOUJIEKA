import { CHARTER_SANCTIONS, type Infraction } from '@kle/shared';
import { InfractionSelect } from '@/components/infraction-select';
import { Badge, Card, Flash, PageHeader, button, formatDate, formatXaf, input } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { reactivateUser, refundPayment, sanctionUser } from '../../actions';

export const metadata = { title: 'Fiche compte' };

interface Detail {
  user: {
    id: string;
    phone: string;
    fullName: string | null;
    roles: string[];
    status: string;
    statusReason: string | null;
    suspendedUntil: string | null;
    kycStatus: string;
    createdAt: string;
    bonusDaysCredit: number;
  };
  packs: Array<{ id: string; tier: string; startsAt: string; endsAt: string; visitRequestsUsed: number; visitRequestsTotal: number; endedReason: string | null }>;
  payments: Array<{ id: string; purpose: string; amount: number; status: string; operator: string; payerName: string | null; createdAt: string }>;
  sanctions: Array<{ id: string; infraction: Infraction; kind: string; endsAt: string | null; createdAt: string; note: string | null }>;
  fraudSignals: Array<{ id: string; kind: string; status: string; createdAt: string }>;
  devices: Array<{ id: string; name: string | null; createdAt: string; revokedAt: string | null }>;
  listings: Array<{ id: string; ref: string; status: string; monthlyRent: number }>;
  visitRequests: Record<string, number>;
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const d = await adminApi<Detail>(`/admin/users/${id}`);
  const u = d.user;
  return (
    <>
      <PageHeader title={u.fullName ?? 'Sans nom'} subtitle={`${u.phone} · inscrit le ${formatDate(u.createdAt)} · ${u.roles.join(', ') || 'aucun profil'}`} />
      <Flash ok={flash.ok} error={flash.erreur} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={u.status === 'active' ? 'green' : 'red'}>
          {u.status}
          {u.statusReason ? ` · ${u.statusReason}` : ''}
          {u.suspendedUntil ? ` · jusqu’au ${formatDate(u.suspendedUntil)}` : ''}
        </Badge>
        <Badge tone={u.kycStatus === 'approved' ? 'green' : 'neutral'}>Identité : {u.kycStatus}</Badge>
        {u.bonusDaysCredit > 0 && <Badge tone="gold">{u.bonusDaysCredit} jours offerts en attente</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Sanctionner selon la charte</h2>
          <form action={sanctionUser.bind(null, id)} className="mt-3 space-y-2">
            <InfractionSelect />
            <input name="note" className={input} placeholder="Motif et preuves (note interne)" />
            <button className={button.danger}>Appliquer l’étape suivante de la charte</button>
          </form>
          {u.status !== 'active' && u.status !== 'banned' && (
            <form action={reactivateUser.bind(null, id)} className="mt-4 flex gap-2 border-t border-line pt-4">
              <input name="note" required minLength={3} className={input} placeholder="Raison de la réactivation" />
              <button className={button.ghost}>Réactiver</button>
            </form>
          )}
        </Card>
        <Card>
          <h2 className="font-bold">Historique des sanctions</h2>
          {d.sanctions.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {d.sanctions.map((s) => (
                <li key={s.id}>
                  <Badge tone="red">{s.kind}</Badge> {CHARTER_SANCTIONS[s.infraction]?.label} · {formatDate(s.createdAt)}
                  {s.note && <p className="text-muted">{s.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Aucune sanction.</p>
          )}
          <h2 className="mt-4 font-bold">Alertes</h2>
          <p className="mt-1 text-sm text-muted">
            {d.fraudSignals.length ? d.fraudSignals.map((f) => `${f.kind} (${f.status})`).join(', ') : 'Aucune.'}
          </p>
        </Card>
        <Card>
          <h2 className="font-bold">Packs</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {d.packs.map((p) => (
              <li key={p.id}>
                <strong className="capitalize">{p.tier}</strong> · {formatDate(p.startsAt)} → {formatDate(p.endsAt)} · {p.visitRequestsUsed}/{p.visitRequestsTotal} demandes
                {p.endedReason ? ` · ${p.endedReason}` : ''}
              </li>
            ))}
            {!d.packs.length && <li className="text-muted">Aucun pack.</li>}
          </ul>
          <p className="mt-3 text-sm text-muted">
            Demandes de visite : {Object.entries(d.visitRequests).map(([k, v]) => `${k} ${v}`).join(', ') || 'aucune'}
          </p>
        </Card>
        <Card>
          <h2 className="font-bold">Paiements</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {d.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {p.purpose} · {formatXaf(p.amount)} · {p.operator.toUpperCase()} · {p.payerName ?? '—'} · <Badge>{p.status}</Badge>
                </span>
                {p.status === 'succeeded' && (
                  <form action={refundPayment.bind(null, id, p.id)} className="flex gap-1">
                    <input name="note" required minLength={3} className={`${input} w-40`} placeholder="Motif" />
                    <button className={button.ghost}>Rembourser</button>
                  </form>
                )}
              </li>
            ))}
            {!d.payments.length && <li className="text-muted">Aucun paiement.</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="font-bold">Annonces</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {d.listings.map((l) => (
              <li key={l.id}>
                <span className="font-mono">{l.ref}</span> · {formatXaf(l.monthlyRent)} · <Badge>{l.status}</Badge>
              </li>
            ))}
            {!d.listings.length && <li className="text-muted">Aucune annonce.</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="font-bold">Téléphones</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {d.devices.map((dv) => (
              <li key={dv.id}>
                {dv.name ?? 'Téléphone'} · ajouté le {formatDate(dv.createdAt)} {dv.revokedAt ? `· retiré le ${formatDate(dv.revokedAt)}` : '· actif'}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
