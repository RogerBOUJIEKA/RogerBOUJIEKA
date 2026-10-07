import Link from 'next/link';
import { PROOF_LABELS, type ProofType } from '@kle/shared';
import { Badge, Empty, Flash, PageHeader, Sla, formatDate, type SearchParams } from '@/components/ui';
import { adminApi } from '@/lib/api';
import type { QueueItem } from '../types';

export const metadata = { title: 'Preuves' };

interface ProofItem extends QueueItem {
  userId: string;
  role: 'landlord' | 'outgoing_tenant';
  proofType: ProofType;
  fullName: string | null;
  kycStatus: string;
}

export default async function ProofsQueue({ searchParams }: { searchParams: SearchParams }) {
  const flash = await searchParams;
  const items = await adminApi<ProofItem[]>('/admin/proofs');
  return (
    <>
      <PageHeader title="Preuves de propriété et d’occupation" subtitle="Une seule preuve par bailleur ou sortant. Jamais publiée." />
      <Flash ok={flash.ok} error={flash.erreur} />
      {items.length === 0 ? (
        <Empty>Aucune preuve en attente.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <Link key={p.id} href={`/preuves/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-line hover:ring-brand">
              <div>
                <p className="font-semibold">
                  {p.fullName ?? 'Sans nom'} <Badge>{p.role === 'landlord' ? 'Bailleur' : 'Sortant'}</Badge>{' '}
                  {p.kycStatus !== 'approved' && <Badge tone="gold">Identité non validée</Badge>}
                </p>
                <p className="text-sm text-muted">
                  {PROOF_LABELS[p.proofType]} · {formatDate(p.createdAt)}
                </p>
              </div>
              <Sla dueAt={p.dueAt} overdue={p.overdue} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
