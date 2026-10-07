import { HOUSING_TYPE_LABELS, type HousingType } from '@kle/shared';
import { Badge, Card, Empty, Flash, PageHeader, Sla, button, formatXaf, input, type SearchParams } from '@/components/ui';
import { adminApi } from '@/lib/api';
import { decideListing } from '../actions';
import type { QueueItem } from '../types';

export const metadata = { title: 'Annonces' };

interface ListingItem extends QueueItem {
  ref: string;
  status: string;
  postReview: boolean;
  category: 'rental' | 'coming_soon';
  type: HousingType;
  monthlyRent: number;
  advanceMonths: number;
  deposit: number;
  exactAddress: string;
  districtName: string;
  publisherName: string | null;
  districtMedianRent: number | null;
  suspiciouslyCheap: boolean;
  media: Array<{ id: string; kind: 'video' | 'photo'; status: string; playbackUrl: string | null; capturedInApp: boolean; capturedAt: string | null }>;
}

export default async function ListingsQueue({ searchParams }: { searchParams: SearchParams }) {
  const flash = await searchParams;
  const items = await adminApi<ListingItem[]>('/admin/listings');
  return (
    <>
      <PageHeader
        title="Annonces à contrôler"
        subtitle="Nouveaux comptes : relecture avant publication (12 h). Après 3 annonces validées : publication directe, contrôle après coup."
      />
      <Flash ok={flash.ok} error={flash.erreur} />
      {items.length === 0 ? (
        <Empty>Aucune annonce en attente.</Empty>
      ) : (
        <div className="space-y-4">
          {items.map((l) => (
            <Card key={l.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">
                    {HOUSING_TYPE_LABELS[l.type]} · {l.districtName}{' '}
                    <span className="font-mono text-xs text-muted">{l.ref}</span>
                  </p>
                  <p className="text-sm text-muted">Publiée par {l.publisherName ?? '—'} · adresse : {l.exactAddress}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {l.postReview ? <Badge tone="gold">Déjà en ligne — contrôle après coup</Badge> : <Badge>Avant publication</Badge>}
                    {l.category === 'coming_soon' && <Badge tone="gold">Bientôt disponible</Badge>}
                    {l.suspiciouslyCheap && <Badge tone="red">Loyer très inférieur à la médiane du quartier</Badge>}
                  </div>
                </div>
                <Sla dueAt={l.dueAt} overdue={l.overdue} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
                <div className="flex gap-2 overflow-x-auto">
                  {l.media.map((m) =>
                    m.playbackUrl ? (
                      m.kind === 'video' ? (
                        <video key={m.id} src={m.playbackUrl} controls preload="none" className="h-48 rounded-lg bg-canvas" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={m.id} src={m.playbackUrl} alt="" className="h-48 rounded-lg bg-canvas object-cover" />
                      )
                    ) : (
                      <div key={m.id} className="grid h-48 w-28 place-items-center rounded-lg bg-canvas text-xs text-muted">
                        {m.status}
                      </div>
                    ),
                  )}
                  {l.media.length === 0 && <p className="text-sm text-muted">Aucun média.</p>}
                </div>
                <div className="text-sm">
                  <p>
                    Loyer <strong>{formatXaf(l.monthlyRent)}</strong> · avance {l.advanceMonths} mois · caution {formatXaf(l.deposit)}
                  </p>
                  <p className="text-muted">Médiane du quartier pour ce type : {formatXaf(l.districtMedianRent)}</p>
                  <p className="mt-1 text-muted">
                    Médias filmés dans l’appli : {l.media.filter((m) => m.capturedInApp).length} / {l.media.length}
                  </p>
                  <form action={decideListing.bind(null, l.id)} className="mt-4 flex flex-wrap items-end gap-2">
                    <select name="reason" className={`${input} max-w-64`} defaultValue="">
                      <option value="">Motif si refus…</option>
                      <option>Vidéo floue ou trop courte</option>
                      <option>Prix incohérent</option>
                      <option>Informations contradictoires</option>
                      <option>Vidéo qui ne montre pas le logement</option>
                      <option>Doublon d’une autre annonce</option>
                    </select>
                    <button name="decision" value="approve" className={button.primary}>
                      {l.postReview ? 'Conforme' : 'Publier'}
                    </button>
                    <button name="decision" value="reject" className={button.danger}>
                      {l.postReview ? 'Masquer' : 'Refuser'}
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
