import { CHARTER_RULES } from '@kle/shared/charter';
import { formatMoney } from '@kle/shared/money';
import { PACKS, PACK_TIERS, DEFAULT_PACK_PRICES } from '@kle/shared/packs';
import { Comparator } from '@/components/comparator';
import { PhoneMockup } from '@/components/phone-mockup';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { api, type City, type District, type WaitlistStats } from '@/lib/api';
import { WaitlistForm } from './waitlist-form';

const FALLBACK_DISTRICTS = ['Akwa', 'Bonamoussadi', 'Bonapriso', 'Bonabéri', 'Deïdo', 'Kotto', 'Logbessou', 'Makepe', 'Ndokotti'];

async function loadDistricts(): Promise<string[]> {
  try {
    const cities = await api<City[]>('/geo/cities', { revalidate: 3600 });
    const douala = cities.find((c) => c.code === 'DLA');
    if (!douala) return FALLBACK_DISTRICTS;
    const districts = await api<District[]>(`/geo/cities/${douala.id}/districts`, { revalidate: 3600 });
    return districts.map((d) => d.name);
  } catch {
    return FALLBACK_DISTRICTS;
  }
}

async function loadStats(): Promise<WaitlistStats | null> {
  try {
    return await api<WaitlistStats>('/waitlist/stats', { revalidate: 60 });
  } catch {
    return null;
  }
}

/** En dessous, le compteur d'inscrits dessert plus qu'il ne rassure : on ne l'affiche pas. */
const SOCIAL_PROOF_MIN = 50;

const ROLE_FROM_PARAM = { chercheur: 'seeker', bailleur: 'landlord', sortant: 'outgoing_tenant' } as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined);
  const profil = one('profil') as keyof typeof ROLE_FROM_PARAM | undefined;
  const [districts, stats] = await Promise.all([loadDistricts(), loadStats()]);

  return (
    <>
      <SiteHeader />
      <main>
        {/* ─── Accroche ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-[#7a5200]">
                <span className="h-2 w-2 rounded-full bg-gold" /> Bientôt à Douala
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Trouve ton logement <span className="text-brand">sans démarcheur</span>, ni arnaque.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted">
                Des logements en vidéo, publiés par des personnes vérifiées. Zéro frais de visite, zéro démarcheur, bien
                moins cher qu’un agent.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/?profil=chercheur#inscription"
                  className="rounded-full bg-brand px-6 py-4 text-center font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
                >
                  Je cherche un logement
                </a>
                <a
                  href="/?profil=bailleur#inscription"
                  className="rounded-full bg-white px-6 py-4 text-center font-bold text-ink ring-1 ring-line transition hover:ring-brand"
                >
                  J’ai un logement à louer
                </a>
              </div>
              {stats && stats.total >= SOCIAL_PROOF_MIN && (
                <p className="mt-6 text-sm text-muted">
                  <strong className="text-ink">{stats.total.toLocaleString('fr-FR')}</strong> personnes déjà inscrites,
                  dont <strong className="text-ink">{stats.byRole.landlord.toLocaleString('fr-FR')}</strong> bailleurs.
                </p>
              )}
            </div>
            <PhoneMockup />
          </div>
        </section>

        {/* ─── Le problème ──────────────────────────────────────────────── */}
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Chercher un logement ne devrait pas coûter un mois de loyer.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Faux agents', 'Des inconnus « présentent » des maisons qui ne leur appartiennent pas.'],
                ['Frais de visite', 'Encaissés d’avance… et parfois sans visite.'],
                ['« Déjà pris »', 'Tu te déplaces pour découvrir que le logement est loué depuis longtemps.'],
                ['Prix gonflés', 'Chaque intermédiaire ajoute sa part sur le loyer.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                  <p className="font-bold text-gold">{title}</p>
                  <p className="mt-2 text-sm text-white/75">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Les trois verrous ────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Le principe de Klé</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Tout le monde est identifié, donc tout le monde est responsable.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              [
                'Chaque compte est une vraie personne',
                'Téléphone confirmé, pièce d’identité et selfie. Les bailleurs prouvent qu’ils possèdent ou gèrent le logement.',
              ],
              [
                'Chaque annonce est modérée',
                'Vidéos filmées sur place, prix vérifié. Un logement loué est marqué « Pris », et la disponibilité est confirmée tous les 15 jours.',
              ],
              [
                'Chaque abus est sanctionné',
                'Argent demandé avant la visite ou fausse annonce : bannissement définitif, par numéro et par pièce d’identité.',
              ],
            ].map(([title, text], i) => (
              <div key={title} className="rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-line">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft font-extrabold text-brand">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Comment ça marche ────────────────────────────────────────── */}
        <section id="comment" className="scroll-mt-20 bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-brand">Pour les chercheurs</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Comment ça marche</h2>
              <ol className="mt-8 space-y-6">
                {[
                  ['Regarde les logements en vidéo', 'Fais défiler le fil comme sur TikTok, filtré sur ton quartier et ton budget. Regarder ne coûte rien.'],
                  ['Choisis ton pack et demande une visite', 'Tu proposes un créneau dans l’appli. Le bailleur voit ton nom et ta photo vérifiés.'],
                  ['Visite gratuite, adresse révélée', 'L’adresse exacte s’affiche après accord du bailleur. Sur place, tu montres ton QR code de visite.'],
                  ['Tu paies seulement si tu obtiens le logement', '10 % d’un mois de loyer, au lieu d’un mois entier chez un agent.'],
                ].map(([title, text], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold font-extrabold text-ink">{i + 1}</span>
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="mt-1 text-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:pt-16">
              <Comparator />
              <p className="mt-3 text-center text-xs text-muted">
                Montants en FCFA. Le montant exact des frais s’affiche sur chaque annonce, avant l’achat du pack.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Bailleurs et sortants ────────────────────────────────────── */}
        <section id="bailleurs" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-[var(--radius-card)] bg-brand p-8 text-white">
              <p className="text-sm font-bold uppercase tracking-wider text-gold">Pour les bailleurs</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Publier est gratuit. Pour toujours.</h2>
              <ul className="mt-6 space-y-3 text-white/90">
                {[
                  'Publication illimitée en 4 écrans : tu filmes, tu coches, c’est en ligne.',
                  'Des locataires vérifiés : nom, photo et pièce contrôlés avant chaque visite.',
                  'Ton numéro n’est jamais affiché : messages et appels passent par l’appli.',
                  'Fini les démarcheurs qui encaissent sur ton dos ; tu restes maître de ta location.',
                  'Statistiques de ton annonce, puis l’Espace Location pour suivre loyers et quittances (bientôt).',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1 text-gold">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/?profil=bailleur#inscription"
                className="mt-8 inline-block rounded-full bg-gold px-6 py-3 font-bold text-ink transition hover:bg-white"
              >
                Inscrire mon logement
              </a>
            </div>
            <div className="rounded-[var(--radius-card)] bg-gold-soft p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-[#7a5200]">Tu quittes ton logement ?</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Publie-le dans « Bientôt disponible »</h2>
              <p className="mt-4 text-[#4a3a1a]">
                Aide ton bailleur à trouver ton successeur avant ton départ. Avec son accord, tu présentes le logement aux
                chercheurs vérifiés des packs Confort et Premium.
              </p>
              <p className="mt-4 rounded-xl bg-white/70 p-3 text-sm font-medium">
                Règle Klé : le chercheur rencontre le bailleur avant de verser quoi que ce soit au sortant.
              </p>
              <a href="/?profil=sortant#inscription" className="mt-6 inline-block font-bold text-[#7a5200] underline">
                Je quitte mon logement
              </a>
            </div>
          </div>
        </section>

        {/* ─── Packs ────────────────────────────────────────────────────── */}
        <section id="prix" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="text-sm font-bold uppercase tracking-wider text-brand">Prix pour les chercheurs</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Regarder est libre. Un pack pour contacter, 10 % si tu obtiens le logement.
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {PACK_TIERS.map((tier) => {
                const pack = PACKS[tier];
                const features = [
                  `${pack.visitRequests} demandes de visite`,
                  pack.maxAlerts === null
                    ? 'Alertes illimitées, instantanées sur WhatsApp'
                    : `${pack.maxAlerts} alerte${pack.maxAlerts > 1 ? 's' : ''}${pack.alertChannels.includes('whatsapp') ? ', appli + WhatsApp' : ' dans l’appli'}`,
                  ...(pack.comingSoon !== 'none' ? [`« Bientôt disponible »${pack.comingSoon === 'first' ? ', en premier' : ''}`] : []),
                  ...(pack.earlyAccessHours ? ['Nouvelles annonces 24 h avant tout le monde'] : []),
                  ...(pack.landlordHighlight === 'serious_badge' ? ['Badge « Chercheur sérieux » chez le bailleur'] : []),
                  ...(pack.landlordHighlight === 'top' ? ['Ta demande affichée en haut chez le bailleur'] : []),
                  ...(pack.weeklyAdvisor ? ['Sélection hebdomadaire par un conseiller WhatsApp'] : []),
                  ...(pack.notFoundBonusDays ? [`Pas trouvé en 30 jours : ${pack.notFoundBonusDays} jours offerts`] : []),
                ];
                return (
                  <div
                    key={tier}
                    className={`relative flex flex-col rounded-[var(--radius-card)] p-6 ${
                      pack.recommended ? 'bg-ink text-white shadow-xl md:-translate-y-3' : 'bg-paper ring-1 ring-line'
                    }`}
                  >
                    {pack.recommended && (
                      <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-xs font-bold text-ink">
                        Le plus choisi
                      </span>
                    )}
                    <p className="text-lg font-bold">{pack.label}</p>
                    <p className={`mt-1 text-sm ${pack.recommended ? 'text-white/70' : 'text-muted'}`}>{pack.tagline}</p>
                    <p className="mt-5 text-3xl font-extrabold tabular-nums">{formatMoney(DEFAULT_PACK_PRICES[tier])}</p>
                    <p className={`text-sm ${pack.recommended ? 'text-white/70' : 'text-muted'}`}>pour 30 jours</p>
                    <ul className="mt-5 space-y-2 text-sm">
                      {features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <span className={pack.recommended ? 'text-gold' : 'text-brand'}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-8 text-sm text-muted">
              Garantie Klé : si une annonce vérifiée se révèle fausse, ton pack est prolongé de 30 jours gratuitement.
              Parrainage : 7 jours offerts pour chaque ami qui prend un pack.
            </p>
          </div>
        </section>

        {/* ─── Charte ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-brand">La charte Klé</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Cinq règles, acceptées par tous à l’inscription.</h2>
              <a href="/charte" className="mt-4 inline-block font-semibold text-brand underline">
                Voir les sanctions
              </a>
            </div>
            <ol className="grid gap-3">
              {CHARTER_RULES.map((rule, i) => (
                <li key={rule} className="flex items-start gap-4 rounded-2xl bg-white p-4 ring-1 ring-line">
                  <span className="text-2xl font-extrabold text-gold">{i + 1}</span>
                  <span className="pt-1 font-medium">{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── Inscription ──────────────────────────────────────────────── */}
        <section id="inscription" className="scroll-mt-20 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-brand">Liste d’attente</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Sois parmi les premiers à Douala.</h2>
              <p className="mt-4 text-muted">
                Laisse ton numéro WhatsApp : on te prévient à l’ouverture. Les bailleurs inscrits maintenant publient
                dès le premier jour, avec l’aide de nos ambassadeurs sur le terrain.
              </p>
              {stats && stats.total >= SOCIAL_PROOF_MIN && (
                <Progress
                  label="Inscrits"
                  value={stats.total}
                  goal={stats.goals.waitlistSignups}
                  secondary={`${stats.byRole.landlord} / ${stats.goals.landlordsReady} bailleurs prêts à publier`}
                />
              )}
            </div>
            <div className="rounded-[var(--radius-card)] bg-paper p-5 ring-1 ring-line sm:p-8">
              <WaitlistForm
                districts={districts}
                initialRole={profil ? ROLE_FROM_PARAM[profil] : undefined}
                ambassadorCode={one('code')?.toUpperCase()}
                source={one('source') ?? one('utm_source')}
              />
            </div>
          </div>
        </section>

        {/* ─── Questions ────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-3xl font-extrabold tracking-tight">Questions fréquentes</h2>
          <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] bg-white ring-1 ring-line">
            {[
              [
                'Qu’est-ce qui est gratuit ?',
                'Regarder les annonces et visiter les logements. Pour les bailleurs, tout est gratuit : publication illimitée, statistiques, et bientôt l’Espace Location. Les chercheurs prennent un pack pour contacter les bailleurs, puis paient 10 % d’un mois de loyer seulement s’ils obtiennent un logement grâce à Klé.',
              ],
              [
                'Comment Klé vérifie les personnes ?',
                'Chaque compte confirme son numéro, envoie sa pièce d’identité et un selfie, contrôlés par notre équipe en moins de 24 h. Les bailleurs ajoutent une preuve : facture d’eau ou d’électricité, reçu d’impôt foncier, bail ou titre foncier. Ces documents ne sont jamais publiés.',
              ],
              [
                'Et si on me demande de l’argent avant la visite ?',
                'Ne paie rien et signale-le dans l’appli : c’est interdit par la charte et puni d’un bannissement définitif. Klé n’encaisse jamais de loyer ni de caution : tu les règles directement au bailleur, après avoir vu le logement.',
              ],
              [
                'Que deviennent mes données ?',
                'Klé applique la loi camerounaise n° 2024/017 sur les données personnelles : consentement explicite, collecte limitée, et droit d’accès, de correction et de suppression à tout moment.',
              ],
              [
                'Quand Klé ouvre-t-il ?',
                'Douala d’abord, puis Yaoundé, Bafoussam et les autres villes du Cameroun, avant l’Afrique francophone. Inscris-toi pour être prévenu en premier.',
              ],
            ].map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  {q}
                  <span className="text-brand transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Progress({ label, value, goal, secondary }: { label: string; value: number; goal: number; secondary: string }) {
  const percent = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div className="mt-8 rounded-2xl bg-paper p-5 ring-1 ring-line">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-muted">
          <strong className="text-ink">{value.toLocaleString('fr-FR')}</strong> / {goal.toLocaleString('fr-FR')}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">{secondary}</p>
    </div>
  );
}
