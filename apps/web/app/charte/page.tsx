import { CHARTER_RULES, CHARTER_SANCTIONS, INFRACTIONS, type SanctionStep } from '@kle/shared/charter';
import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = {
  title: 'La charte Klé',
  description: 'Les cinq règles acceptées par tous les membres de Klé, et les sanctions en cas d’abus.',
};

function describe(step: SanctionStep): string {
  switch (step.kind) {
    case 'warning':
      return 'Avertissement';
    case 'listing_hidden':
      return 'Annonce masquée';
    case 'suspension':
      return `Suspension de ${step.days} jours`;
    case 'permanent_ban':
      return step.authoritiesOnRequest
        ? 'Bannissement définitif + données transmises aux autorités sur réquisition'
        : 'Bannissement définitif';
    case 'blocked_until_paid':
      return 'Compte bloqué jusqu’au règlement';
    case 'fees_due_and_suspension':
      return 'Frais de réussite dus pour chaque logement + suspension';
  }
}

export default function CharterPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">Acceptée à l’inscription</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">La charte Klé</h1>
        <ol className="mt-8 space-y-3">
          {CHARTER_RULES.map((rule, i) => (
            <li key={rule} className="flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-line">
              <span className="text-2xl font-extrabold text-gold">{i + 1}</span>
              <span className="pt-1 font-medium">{rule}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-2xl font-extrabold">Sanctions</h2>
        <p className="mt-2 text-muted">
          Un modérateur traite chaque signalement sous 48 h, après avoir lu l’historique des contacts et écouté les deux
          parties. Une sanction répétée passe à l’étape suivante.
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-muted">
              <tr>
                <th className="p-3 font-semibold">Infraction</th>
                <th className="p-3 font-semibold">Sanction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {INFRACTIONS.filter((i) => CHARTER_SANCTIONS[i].defined).map((infraction) => (
                <tr key={infraction}>
                  <td className="p-3 font-medium">{CHARTER_SANCTIONS[infraction].label}</td>
                  <td className="p-3">{CHARTER_SANCTIONS[infraction].ladder.map(describe).join(', puis ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted">
          Un compte banni l’est par numéro, par pièce d’identité et par visage, dans tous les pays. Le pack en cours n’est
          pas remboursé.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
