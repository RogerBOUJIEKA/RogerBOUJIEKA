import { Card, PageHeader, Stat, formatXaf } from '@/components/ui';
import { adminApi } from '@/lib/api';
import type { Dashboard } from './types';

export const metadata = { title: 'Tableau de bord' };

function Goal({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          <strong className="text-ink">{value}</strong> / {goal}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const d = await adminApi<Dashboard>('/admin/dashboard');
  const revenue = (d.revenueThisMonth.pack ?? 0) + (d.revenueThisMonth.success_fee ?? 0) + (d.revenueThisMonth.boost ?? 0);
  const i = d.indicators;
  const fmt = (v: number | null, suffix = '') => (v === null ? '—' : `${v.toLocaleString('fr-FR')}${suffix}`);
  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Chiffres en direct. Les délais cibles : identités 24 h, annonces 12 h, signalements 48 h." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Inscriptions du jour" value={d.today.signups} hint={`${d.today.kycDecided} vérifications traitées aujourd’hui`} />
        <Stat
          label="Identités en attente"
          value={d.queues.kycPending}
          hint={d.queues.oldestKycHours !== null ? `La plus ancienne attend depuis ${d.queues.oldestKycHours} h` : 'File vide'}
        />
        <Stat label="Revenu du mois" value={formatXaf(revenue)} hint={`Packs ${formatXaf(d.revenueThisMonth.pack ?? 0)} · frais ${formatXaf(d.revenueThisMonth.success_fee ?? 0)}`} />
        <Stat label="Packs actifs" value={(d.activePacks.essentiel ?? 0) + (d.activePacks.confort ?? 0) + (d.activePacks.premium ?? 0)} hint={`Essentiel ${d.activePacks.essentiel ?? 0} · Confort ${d.activePacks.confort ?? 0} · Premium ${d.activePacks.premium ?? 0}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <h2 className="font-bold">Indicateurs clés</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-line">
              {[
                ['Annonces vérifiées actives', fmt(i.activeListings), 'L’offre est-elle suffisante ?'],
                ['Délai moyen de validation d’identité', fmt(i.averageKycHours, ' h'), 'L’inscription est-elle fluide ?'],
                ['Contacts par annonce (30 j)', fmt(i.contactsPerListing30d), 'Les annonces attirent-elles ?'],
                ['Logements déclarés « Pris » via Klé (30 j)', fmt(i.rentedViaKle30d), 'La plateforme fait-elle louer ?'],
                ['Signalements pour 100 annonces (30 j)', fmt(i.reportsPer100Listings30d), 'La confiance tient-elle ?'],
                ['Part des frais de réussite réglés', fmt(i.successFeePaymentRate, ' %'), 'Le modèle tient-il ?'],
                ['Partages WhatsApp par annonce', fmt(i.whatsappSharesPerListing), 'L’effet viral fonctionne-t-il ?'],
                ['Visites validées par QR code (30 j)', `${fmt(i.validatedVisits30d)} / ${fmt(i.visitRequests30d)} demandes`, 'Les visites ont-elles lieu ?'],
              ].map(([label, value, question]) => (
                <tr key={label}>
                  <td className="py-2 pr-3">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted">{question}</p>
                  </td>
                  <td className="py-2 text-right font-bold tabular-nums">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Le taux visiteur → abonné se mesure dans PostHog (parcours dans l’appli).</p>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Phase 0 — objectifs de passage en V1</h2>
            <div className="mt-4 space-y-4">
              <Goal label="Inscrits en liste d’attente" value={d.waitlist.total} goal={d.waitlist.goals.waitlistSignups} />
              <Goal label="Bailleurs prêts à publier" value={d.waitlist.byRole.landlord ?? 0} goal={d.waitlist.goals.landlordsReady} />
              <Goal label="Enquête chercheurs" value={d.waitlist.byRole.seeker ?? 0} goal={d.waitlist.goals.survey.seeker ?? 50} />
              <Goal label="Enquête sortants" value={d.waitlist.byRole.outgoing_tenant ?? 0} goal={d.waitlist.goals.survey.outgoing_tenant ?? 10} />
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">Annonces actives par ville</h2>
            {d.activeListingsByCity.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {d.activeListingsByCity.map((c) => (
                  <li key={c.city} className="flex justify-between">
                    <span>{c.city}</span>
                    <strong className="tabular-nums">{c.n}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Aucune annonce en ligne.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
