import Link from 'next/link';
import { ID_DOCUMENT_LABELS } from '@kle/shared';
import { Badge, Card, PageHeader, button, formatDate, input } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { decideKyc } from '../../actions';

export const metadata = { title: 'Dossier d’identité' };

interface KycDetail {
  id: string;
  status: string;
  declaredName: string;
  documentType: keyof typeof ID_DOCUMENT_LABELS;
  createdAt: string;
  user: { id: string; phone: string; roles: string[]; createdAt: string };
  documents: { front: string; back: string | null; selfie: string };
  mobileMoneyNames: string[];
  history: Array<{ status: string; reason: string | null; createdAt: string }>;
}

/** Chaque ouverture de ce dossier est journalisée : les liens vers les pièces expirent en 5 minutes. */
export default async function KycDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = await adminApi<KycDetail>(`/admin/kyc/${id}`);
  const action = decideKyc.bind(null, id);
  return (
    <>
      <PageHeader
        title={k.declaredName}
        subtitle={`${ID_DOCUMENT_LABELS[k.documentType]} · reçu le ${formatDate(k.createdAt)} · ${k.user.phone}`}
        actions={<Link href="/kyc" className={button.ghost}>Retour à la file</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ['Recto', k.documents.front],
          ['Verso', k.documents.back],
          ['Selfie avec la pièce', k.documents.selfie],
        ].map(([label, url]) => (
          <Card key={label} className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={label ?? ''} className="aspect-[4/3] w-full rounded-lg bg-canvas object-contain" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-lg bg-canvas text-sm text-muted">Non fourni</div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <h2 className="font-bold">À comparer</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted">Nom déclaré</dt>
              <dd className="font-semibold">{k.declaredName}</dd>
            </div>
            <div>
              <dt className="text-muted">Noms des comptes Mobile Money qui ont payé</dt>
              <dd className="font-semibold">{k.mobileMoneyNames.length ? k.mobileMoneyNames.join(', ') : 'Aucun paiement'}</dd>
            </div>
            <div>
              <dt className="text-muted">Historique</dt>
              <dd className="mt-1 space-y-1">
                {k.history.map((h) => (
                  <p key={h.createdAt}>
                    <Badge tone={h.status === 'approved' ? 'green' : h.status === 'rejected' ? 'red' : 'gold'}>
                      {h.status === 'approved' ? 'Validé' : h.status === 'rejected' ? 'Refusé' : 'En attente'}
                    </Badge>{' '}
                    {formatDate(h.createdAt)} {h.reason ? `— ${h.reason}` : ''}
                  </p>
                ))}
              </dd>
            </div>
          </dl>
        </Card>
        {k.status === 'pending' ? (
          <Card>
            <h2 className="font-bold">Décision</h2>
            <form action={action} className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Numéro de la pièce (sert au bannissement par pièce)</span>
                <input name="documentNumber" className={input} placeholder="Ex. 123456789" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Motif du refus</span>
                <select name="reason" className={input} defaultValue="">
                  <option value="">—</option>
                  <option>Photo floue ou illisible</option>
                  <option>Le selfie ne correspond pas à la pièce</option>
                  <option>Pièce expirée</option>
                  <option>Nom différent de celui du compte Mobile Money</option>
                  <option>Document suspect</option>
                </select>
              </label>
              <div className="flex gap-2">
                <button name="decision" value="approve" className={button.primary}>Valider l’identité</button>
                <button name="decision" value="reject" className={button.danger}>Refuser</button>
              </div>
            </form>
          </Card>
        ) : (
          <Card>Dossier déjà traité.</Card>
        )}
      </div>
    </>
  );
}
