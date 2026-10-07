import { WAITLIST_ROLE_LABELS, type WaitlistRole } from '@kle/shared';
import { Badge, Empty, PageHeader, button, formatDate, formatXaf } from '@/components/ui';
import { adminApi } from '@/lib/api';

export const metadata = { title: 'Liste d’attente' };

interface Entry {
  id: string;
  role: WaitlistRole;
  fullName: string;
  phone: string;
  whatsapp: boolean;
  district: string | null;
  budgetMax: number | null;
  ambassadorCode: string | null;
  survey: Record<string, unknown> | null;
  source: string | null;
  createdAt: string;
}

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const entries = await adminApi<Entry[]>(`/admin/waitlist${role ? `?role=${role}` : ''}`);
  const filters: Array<[string | undefined, string]> = [[undefined, 'Tous'], ['seeker', 'Chercheurs'], ['landlord', 'Bailleurs'], ['outgoing_tenant', 'Sortants']];
  return (
    <>
      <PageHeader
        title="Liste d’attente — phase 0"
        subtitle="Inscriptions et réponses à l’enquête. Rappelle les bailleurs sur WhatsApp pour préparer leurs annonces."
        actions={
          <a href="/export/liste-attente" className={button.primary}>
            Exporter en CSV
          </a>
        }
      />
      <div className="mb-4 flex gap-2">
        {filters.map(([value, label]) => (
          <a key={label} href={value ? `?role=${value}` : '?'} className={`${button.ghost} ${role === value ? 'bg-white ring-brand' : ''}`}>
            {label}
          </a>
        ))}
      </div>
      {entries.length === 0 ? (
        <Empty>Aucune inscription pour l’instant.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-3">Nom</th>
                <th className="p-3">Profil</th>
                <th className="p-3">Quartier</th>
                <th className="p-3">Budget</th>
                <th className="p-3">Enquête</th>
                <th className="p-3">Source</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="p-3">
                    <p className="font-semibold">{e.fullName}</p>
                    <a href={`https://wa.me/${e.phone.replace('+', '')}`} className="text-xs text-brand underline">
                      {e.phone}
                    </a>
                  </td>
                  <td className="p-3">
                    <Badge tone={e.role === 'landlord' ? 'green' : e.role === 'outgoing_tenant' ? 'gold' : 'neutral'}>
                      {WAITLIST_ROLE_LABELS[e.role]}
                    </Badge>
                  </td>
                  <td className="p-3">{e.district ?? '—'}</td>
                  <td className="p-3">{e.budgetMax ? formatXaf(e.budgetMax) : '—'}</td>
                  <td className="p-3 text-xs text-muted">
                    {e.survey ? Object.entries(e.survey).map(([k, v]) => `${k} : ${String(v)}`).join(' · ') : '—'}
                  </td>
                  <td className="p-3 text-xs">{[e.source, e.ambassadorCode && `code ${e.ambassadorCode}`].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="p-3 text-xs text-muted">{formatDate(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
