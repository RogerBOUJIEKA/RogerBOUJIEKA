import Link from 'next/link';
import { InfractionSelect } from '@/components/infraction-select';
import { Badge, Card, Empty, Flash, PageHeader, button, formatDate, input, type SearchParams } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { decideFraud } from '../actions';

export const metadata = { title: 'Contournement' };

const KIND_LABELS: Record<string, string> = {
  payer_name_mismatch: 'Nom Mobile Money différent de la pièce',
  frequent_device_changes: 'Changements de téléphone fréquents',
  identity_mismatch_at_visit: 'Visiteur différent de la photo vérifiée',
  visited_listings_rented_to_others: 'Logements visités puis loués à d’autres',
};

interface Signal {
  id: string;
  userId: string;
  kind: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  fullName: string | null;
  userStatus: string;
}

export default async function FraudQueue({ searchParams }: { searchParams: SearchParams }) {
  const flash = await searchParams;
  const items = await adminApi<Signal[]>('/admin/fraud-signals');
  return (
    <>
      <PageHeader title="Alertes de contournement" subtitle="Un compte = une personne. Confirme l’alerte pour appliquer une sanction, ou classe-la." />
      <Flash ok={flash.ok} error={flash.erreur} />
      {items.length === 0 ? (
        <Empty>Aucune alerte ouverte.</Empty>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold">{KIND_LABELS[s.kind] ?? s.kind}</p>
                  <p className="text-sm text-muted">
                    <Link href={`/comptes/${s.userId}`} className="font-semibold text-ink underline">
                      {s.fullName ?? 'Compte'}
                    </Link>{' '}
                    · {formatDate(s.createdAt)} · <Badge>{s.userStatus}</Badge>
                  </p>
                  {s.details && <pre className="mt-2 max-w-xl overflow-x-auto rounded-lg bg-canvas p-2 text-xs">{JSON.stringify(s.details, null, 2)}</pre>}
                </div>
                <form action={decideFraud.bind(null, s.id)} className="w-full max-w-sm space-y-2">
                  <InfractionSelect optional />
                  <input name="note" className={input} placeholder="Note interne" />
                  <div className="flex gap-2">
                    <button name="decision" value="confirm" className={button.danger}>Confirmer</button>
                    <button name="decision" value="dismiss" className={button.ghost}>Classer</button>
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
