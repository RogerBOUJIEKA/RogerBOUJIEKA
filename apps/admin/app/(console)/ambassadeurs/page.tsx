import { Badge, Card, Empty, Flash, PageHeader, button, formatDate, formatXaf, input, type SearchParams } from '@/components/ui';
import { adminApi, type Me } from '@/lib/api';
import { createAmbassador, markRewardPaid } from '../actions';

export const metadata = { title: 'Ambassadeurs' };

interface Ambassador {
  id: string;
  code: string;
  active: boolean;
  bonusPerLandlord: number;
  fullName: string | null;
  phone: string;
  landlords: number;
  rewardsDue: number;
  rewardsPaid: number;
}

interface Reward {
  id: string;
  ambassadorId: string;
  landlordId: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default async function AmbassadorsPage({ searchParams }: { searchParams: SearchParams }) {
  const flash = await searchParams;
  const [me, ambassadors, rewards] = await Promise.all([
    adminApi<Me>('/me'),
    adminApi<Ambassador[]>('/admin/ambassadors'),
    adminApi<Reward[]>('/admin/ambassador-rewards?status=due'),
  ]);
  const codeBy = new Map(ambassadors.map((a) => [a.id, a.code]));
  return (
    <>
      <PageHeader
        title="Ambassadeurs terrain"
        subtitle="Ils inscrivent des bailleurs avec leur code ; prime par bailleur validé avec au moins une annonce publiée."
      />
      <Flash ok={flash.ok} error={flash.erreur} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {ambassadors.length === 0 ? (
            <Empty>Aucun ambassadeur pour l’instant.</Empty>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="p-3">Ambassadeur</th>
                    <th className="p-3">Code</th>
                    <th className="p-3 text-right">Bailleurs</th>
                    <th className="p-3 text-right">À payer</th>
                    <th className="p-3 text-right">Payé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ambassadors.map((a) => (
                    <tr key={a.id}>
                      <td className="p-3">
                        <p className="font-semibold">{a.fullName ?? '—'}</p>
                        <p className="text-xs text-muted">{a.phone}</p>
                      </td>
                      <td className="p-3">
                        <Badge tone={a.active ? 'green' : 'neutral'}>{a.code}</Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums">{a.landlords}</td>
                      <td className="p-3 text-right tabular-nums">{formatXaf(a.rewardsDue)}</td>
                      <td className="p-3 text-right tabular-nums">{formatXaf(a.rewardsPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h2 className="mt-6 font-bold">Primes à verser</h2>
          {rewards.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aucune prime en attente.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm ring-1 ring-line">
                  <span>
                    {codeBy.get(r.ambassadorId)} · {formatXaf(r.amount)} · {formatDate(r.createdAt)}
                  </span>
                  {me.staffRole !== 'moderator' && (
                    <form action={markRewardPaid.bind(null, r.id)}>
                      <button className={button.ghost}>Marquer payée</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {me.staffRole === 'admin' && (
          <Card>
            <h2 className="font-bold">Nouvel ambassadeur</h2>
            <p className="mt-1 text-sm text-muted">La personne crée d’abord son compte dans l’appli ; copie son identifiant depuis sa fiche.</p>
            <form action={createAmbassador} className="mt-3 space-y-2">
              <input name="userId" required className={input} placeholder="Identifiant du compte" />
              <input name="code" className={`${input} uppercase`} placeholder="Code (facultatif, ex. AKWA21)" />
              <input name="bonusPerLandlord" inputMode="numeric" className={input} placeholder="Prime par bailleur (défaut 1 000 FCFA)" />
              <button className={button.primary}>Créer</button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
