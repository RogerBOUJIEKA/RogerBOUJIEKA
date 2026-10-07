import Link from 'next/link';
import { REPORT_REASON_LABELS, REPORT_REASON_TO_INFRACTION, type ReportReason } from '@kle/shared';
import { InfractionSelect } from '@/components/infraction-select';
import { Badge, Card, Empty, Flash, PageHeader, Sla, button, formatDate, input, type SearchParams } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { decideReport } from '../actions';
import type { QueueItem } from '../types';

export const metadata = { title: 'Signalements' };

interface ReportItem extends QueueItem {
  reason: ReportReason;
  details: string | null;
  targetType: 'listing' | 'user';
  targetUserId: string;
  reporterId: string;
  listingRef: string | null;
  targetName: string | null;
  contacts: Array<{ visitRequestId: string; status: string; slot: string | null; validatedAt: string | null; messages: number }>;
  previousSanctions: Array<{ infraction: string; kind: string; createdAt: string }>;
}

export default async function ReportsQueue({ searchParams }: { searchParams: SearchParams }) {
  const flash = await searchParams;
  const items = await adminApi<ReportItem[]>('/admin/reports');
  return (
    <>
      <PageHeader
        title="Signalements"
        subtitle="Lis l’historique des contacts, écoute les deux parties, puis applique la sanction de la charte. Délai cible : 48 h."
      />
      <Flash ok={flash.ok} error={flash.erreur} />
      {items.length === 0 ? (
        <Empty>Aucun signalement ouvert.</Empty>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{REPORT_REASON_LABELS[r.reason]}</p>
                  <p className="text-sm text-muted">
                    Contre{' '}
                    <Link href={`/comptes/${r.targetUserId}`} className="font-semibold text-ink underline">
                      {r.targetName ?? 'compte'}
                    </Link>
                    {r.listingRef && <> · annonce <span className="font-mono">{r.listingRef}</span></>} · reçu le {formatDate(r.createdAt)}
                  </p>
                  {r.details && <p className="mt-2 rounded-lg bg-canvas p-3 text-sm">« {r.details} »</p>}
                </div>
                <Sla dueAt={r.dueAt} overdue={r.overdue} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="text-sm">
                  <p className="font-semibold">Contacts entre les deux parties</p>
                  {r.contacts.length ? (
                    <ul className="mt-1 space-y-1 text-muted">
                      {r.contacts.map((c) => (
                        <li key={c.visitRequestId}>
                          Demande {c.status} · créneau {formatDate(c.slot)} · {c.validatedAt ? 'visite validée par QR' : 'pas de visite validée'} ·{' '}
                          {c.messages} message(s)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-muted">Aucun contact enregistré.</p>
                  )}
                  <p className="mt-3 font-semibold">Sanctions précédentes</p>
                  {r.previousSanctions.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.previousSanctions.map((s) => (
                        <Badge key={s.createdAt} tone="red">
                          {s.kind} · {formatDate(s.createdAt)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-muted">Aucune.</p>
                  )}
                </div>
                <form action={decideReport.bind(null, r.id)} className="space-y-2">
                  <InfractionSelect defaultValue={REPORT_REASON_TO_INFRACTION[r.reason]} />
                  <textarea name="note" rows={2} className={input} placeholder="Note interne (preuves, échanges)…" />
                  <div className="flex gap-2">
                    <button name="action" value="sanction" className={button.danger}>Appliquer la sanction</button>
                    <button name="action" value="dismiss" className={button.ghost}>Classer sans suite</button>
                  </div>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
