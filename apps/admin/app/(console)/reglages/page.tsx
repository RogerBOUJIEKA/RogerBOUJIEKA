import { redirect } from 'next/navigation';
import { Badge, Card, Flash, PageHeader, button, formatDate, input } from '@/components/ui';
import { adminApi, type Me } from '@/lib/api';
import { createStaff, openCity, updateCountry } from '../actions';

export const metadata = { title: 'Réglages' };

interface Country {
  code: string;
  name: string;
  currency: string;
  active: boolean;
  packPrices: { essentiel: number; confort: number; premium: number };
  successFeeBps: number;
}
interface City {
  id: string;
  countryCode: string;
  code: string;
  name: string;
  active: boolean;
}
interface AuditEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  actorName: string | null;
  actorPhone: string | null;
}

/** Réservé à l'administrateur : prix, pays et villes, comptes de l'équipe, journal d'audit. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; totp?: string }> }) {
  const flash = await searchParams;
  const me = await adminApi<Me>('/me');
  if (me.staffRole !== 'admin') redirect('/');
  const [countries, cities, audit] = await Promise.all([
    adminApi<Country[]>('/admin/countries'),
    adminApi<City[]>('/admin/cities'),
    adminApi<AuditEntry[]>('/admin/audit-logs'),
  ]);
  const cm = countries.find((c) => c.code === 'CM');
  return (
    <>
      <PageHeader title="Réglages" subtitle="Ouvrir une ville ou un pays est un réglage, pas un nouveau développement." />
      <Flash ok={flash.ok} error={flash.erreur} />
      {flash.totp && (
        <p className="mb-4 break-all rounded-lg bg-gold-soft p-3 font-mono text-xs">{flash.totp}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {cm && (
          <Card>
            <h2 className="font-bold">Prix au Cameroun ({cm.currency})</h2>
            <form action={updateCountry.bind(null, 'CM')} className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {(['essentiel', 'confort', 'premium'] as const).map((tier) => (
                <label key={tier} className="block">
                  <span className="mb-1 block font-medium capitalize">Pack {tier}</span>
                  <input name={tier} defaultValue={cm.packPrices[tier]} inputMode="numeric" className={input} />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block font-medium">Frais de réussite (%)</span>
                <input name="successFeePercent" defaultValue={cm.successFeeBps / 100} inputMode="decimal" className={input} />
              </label>
              <div className="col-span-2">
                <button className={button.primary}>Enregistrer</button>
                <p className="mt-2 text-xs text-muted">Démarrer à 10 % ; passer à 12 ou 15 % si le taux de paiement est bon.</p>
              </div>
            </form>
          </Card>
        )}
        <Card>
          <h2 className="font-bold">Villes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {cities.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>
                  {c.name} <span className="text-muted">({c.countryCode}-{c.code})</span>
                </span>
                {c.active ? (
                  <Badge tone="green">Ouverte</Badge>
                ) : (
                  <form action={openCity.bind(null, c.id)}>
                    <button className={button.ghost}>Ouvrir</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-bold">Ajouter un membre de l’équipe</h2>
          <form action={createStaff} className="mt-3 space-y-2">
            <input name="phone" required className={input} placeholder="+237 6XX XX XX XX" />
            <select name="role" className={input} defaultValue="moderator">
              <option value="moderator">Modérateur — valide ou refuse</option>
              <option value="supervisor">Superviseur — suspend, bannit, rembourse</option>
              <option value="admin">Administrateur — prix, pays, équipe</option>
            </select>
            <button className={button.primary}>Créer le compte</button>
          </form>
        </Card>
        <Card>
          <h2 className="font-bold">Journal d’audit</h2>
          <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-xs">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 border-b border-line py-1">
                <span>
                  <strong>{a.action}</strong> {a.targetType ? `· ${a.targetType}` : ''}
                </span>
                <span className="shrink-0 text-muted">
                  {a.actorName ?? a.actorPhone ?? 'système'} · {formatDate(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
