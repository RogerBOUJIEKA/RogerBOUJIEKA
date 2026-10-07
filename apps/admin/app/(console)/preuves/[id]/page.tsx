import Link from 'next/link';
import { PROOF_LABELS, type ProofType } from '@kle/shared';
import { Card, PageHeader, button, formatDate, input } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { decideProof } from '../../actions';

export const metadata = { title: 'Preuve' };

interface ProofDetail {
  id: string;
  role: 'landlord' | 'outgoing_tenant';
  proofType: ProofType;
  status: string;
  createdAt: string;
  honorDeclaredAt: string;
  files: string[];
}

export default async function ProofDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await adminApi<ProofDetail>(`/admin/proofs/${id}`);
  return (
    <>
      <PageHeader
        title={PROOF_LABELS[p.proofType]}
        subtitle={`${p.role === 'landlord' ? 'Bailleur' : 'Sortant'} · reçue le ${formatDate(p.createdAt)} · déclaration sur l’honneur signée`}
        actions={<Link href="/preuves" className={button.ghost}>Retour à la file</Link>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {p.files.map((url, i) => (
          <Card key={url} className="p-3">
            <p className="mb-2 text-xs font-semibold text-muted">Fichier {i + 1}</p>
            <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand underline">
              Ouvrir le document (lien valable 5 minutes)
            </a>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="mt-2 max-h-96 w-full rounded-lg bg-canvas object-contain" />
          </Card>
        ))}
      </div>
      {p.status === 'pending' && (
        <Card className="mt-4">
          <form action={decideProof.bind(null, id)} className="flex flex-wrap items-end gap-3">
            <label className="min-w-64 flex-1 text-sm">
              <span className="mb-1 block font-medium">Motif du refus</span>
              <select name="reason" className={input} defaultValue="">
                <option value="">—</option>
                <option>Document illisible</option>
                <option>Le nom ne correspond pas à l’identité</option>
                <option>Document trop ancien</option>
                <option>Procuration incomplète</option>
                <option>Document suspect</option>
              </select>
            </label>
            <button name="decision" value="approve" className={button.primary}>Valider la preuve</button>
            <button name="decision" value="reject" className={button.danger}>Refuser</button>
          </form>
        </Card>
      )}
    </>
  );
}
