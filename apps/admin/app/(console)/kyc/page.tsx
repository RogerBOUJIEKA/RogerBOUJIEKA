import Link from 'next/link';
import { ID_DOCUMENT_LABELS, ROLE_LABELS } from '@kle/shared';
import { Badge, Empty, Flash, PageHeader, Sla, formatDate, type SearchParams } from '@/components/ui';
import { adminApi } from '@/lib/api';
import type { QueueItem } from '../types';

export const metadata = { title: 'Identités' };

interface KycItem extends QueueItem {
  userId: string;
  declaredName: string;
  documentType: keyof typeof ID_DOCUMENT_LABELS;
  phone: string;
  roles: Array<keyof typeof ROLE_LABELS>;
}

export default async function KycQueue({ searchParams }: { searchParams: SearchParams }) {
  const flash = await searchParams;
  const items = await adminApi<KycItem[]>('/admin/kyc');
  return (
    <>
      <PageHeader title="Vérifications d’identité" subtitle="Compare la pièce, le selfie et le nom Mobile Money ; valide ou refuse avec un motif. Délai cible : 24 h." />
      <Flash ok={flash.ok} error={flash.erreur} />
      {items.length === 0 ? (
        <Empty>Aucun dossier en attente.</Empty>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-3">Nom déclaré</th>
                <th className="p-3">Pièce</th>
                <th className="p-3">Profils</th>
                <th className="p-3">Reçu le</th>
                <th className="p-3">Délai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((k) => (
                <tr key={k.id} className="hover:bg-canvas/60">
                  <td className="p-3 font-semibold">
                    <Link href={`/kyc/${k.id}`} className="underline-offset-2 hover:underline">
                      {k.declaredName}
                    </Link>
                  </td>
                  <td className="p-3">{ID_DOCUMENT_LABELS[k.documentType]}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {k.roles.map((r) => (
                        <Badge key={r}>{ROLE_LABELS[r]}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-muted">{formatDate(k.createdAt)}</td>
                  <td className="p-3">
                    <Sla dueAt={k.dueAt} overdue={k.overdue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
