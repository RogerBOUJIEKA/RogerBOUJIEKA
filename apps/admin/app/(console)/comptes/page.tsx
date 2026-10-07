import Link from 'next/link';
import { Badge, Empty, PageHeader, button, formatDate, input } from '@/components/ui';
import { adminApi } from '@/lib/api';

export const metadata = { title: 'Comptes' };

interface UserRow {
  id: string;
  phone: string;
  fullName: string | null;
  roles: string[];
  status: string;
  kycStatus: string;
  staffRole: string | null;
  createdAt: string;
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const users = q.trim().length >= 3 ? await adminApi<UserRow[]>(`/admin/users?q=${encodeURIComponent(q)}`) : [];
  return (
    <>
      <PageHeader title="Comptes" subtitle="Recherche par nom ou par numéro (au moins 3 caractères). Chaque consultation de fiche est journalisée." />
      <form className="mb-4 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} className={input} placeholder="Nom ou numéro de téléphone" autoFocus />
        <button className={button.primary}>Rechercher</button>
      </form>
      {q && users.length === 0 ? (
        <Empty>Aucun compte trouvé.</Empty>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Link key={u.id} href={`/comptes/${u.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-line hover:ring-brand">
              <div>
                <p className="font-semibold">{u.fullName ?? 'Sans nom'}</p>
                <p className="text-sm text-muted">
                  {u.phone} · inscrit le {formatDate(u.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {u.staffRole && <Badge tone="gold">Équipe : {u.staffRole}</Badge>}
                <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge>
                <Badge tone={u.kycStatus === 'approved' ? 'green' : 'neutral'}>Identité : {u.kycStatus}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
