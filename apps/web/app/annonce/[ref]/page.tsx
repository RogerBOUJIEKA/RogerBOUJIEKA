import { formatMoney } from '@kle/shared/money';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { AmenitiesList } from '@/components/amenities';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { api, ApiError, type ListingView } from '@/lib/api';

type Result = { listing: ListingView } | { restricted: 'premium_early_access' | 'coming_soon_reserved'; message: string };

/** Une seule requête par rendu, partagée entre les métadonnées et la page. */
const loadListing = cache(async (ref: string): Promise<Result> => {
  try {
    return { listing: await api<ListingView>(`/listings/${encodeURIComponent(ref)}`, { revalidate: 60 }) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return { restricted: error.code as 'premium_early_access' | 'coming_soon_reserved', message: error.message };
    }
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params;
  const result = await loadListing(ref);
  if (!('listing' in result)) return { title: 'Annonce réservée', robots: { index: false } };
  const l = result.listing;
  const title = `${l.title} · ${formatMoney(l.monthlyRent)} / mois`;
  const description = `${l.district.name}, ${l.city.name}. Publié par une personne vérifiée sur Klé. Visite gratuite, sans démarcheur.`;
  return {
    title,
    description,
    alternates: { canonical: `/annonce/${l.ref}` },
    openGraph: { title, description, url: `/annonce/${l.ref}`, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const result = await loadListing(ref);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {'listing' in result ? <Listing l={result.listing} /> : <Restricted message={result.message} />}
      </main>
      <SiteFooter />
    </>
  );
}

function Listing({ l }: { l: ListingView }) {
  const cover = l.media[0];
  const shareText = encodeURIComponent(`${l.title} · ${formatMoney(l.monthlyRent)} / mois, sur Klé : ${l.shareUrl}`);
  const taken = l.availability === 'Pris';
  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div>
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink shadow-xl">
          {cover?.kind === 'video' && cover.playbackUrl ? (
            <video
              src={cover.playbackUrl}
              poster={cover.thumbnailUrl ?? undefined}
              controls
              playsInline
              preload="none"
              className="aspect-[9/16] w-full object-cover"
            />
          ) : cover?.playbackUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.playbackUrl} alt={l.title} className="aspect-[9/16] w-full object-cover" />
          ) : (
            <div className="grid aspect-[9/16] place-items-center text-white/60">Vidéo bientôt disponible</div>
          )}
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${
              taken ? 'bg-ink text-white' : l.availability === 'Disponible' ? 'bg-brand text-white' : 'bg-gold text-ink'
            }`}
          >
            {l.availability}
          </span>
        </div>
        {l.media.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {l.media.slice(1, 5).map((m) =>
              m.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.id} src={m.thumbnailUrl} alt="" className="aspect-square rounded-xl object-cover" />
              ) : (
                <div key={m.id} className="aspect-square rounded-xl bg-line" />
              ),
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-muted">
          {l.district.name} · {l.city.name} · <span className="font-mono text-xs">{l.ref}</span>
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{l.title}</h1>
        <p className="mt-3 text-4xl font-extrabold text-brand tabular-nums">
          {formatMoney(l.monthlyRent)} <span className="text-base font-semibold text-muted">/ mois</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          Avance : {l.advanceMonths} mois · Caution : {l.deposit ? formatMoney(l.deposit) : 'aucune'}
        </p>

        <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Avec un agent</p>
            <p className="mt-1 font-bold tabular-nums">{formatMoney(l.comparison.agentCommission)} + visites</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Avec Klé</p>
            <p className="mt-1 font-bold tabular-nums">ton pack + {formatMoney(l.comparison.successFee)}</p>
          </div>
        </div>

        {l.comingSoon && (
          <div className="mt-4 rounded-2xl bg-gold-soft p-4 text-sm">
            <p className="font-bold">Bientôt disponible — départ prévu le {new Date(l.comingSoon.departureDate).toLocaleDateString('fr-FR')}</p>
            {l.comingSoon.handoverAmount > 0 && <p className="mt-1">Relève demandée par le sortant : {formatMoney(l.comingSoon.handoverAmount)}</p>}
            <p className="mt-2 font-semibold text-[#7a5200]">{l.comingSoon.warning}</p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft text-lg font-extrabold text-brand">
            {l.publisher.displayName.slice(0, 1)}
          </span>
          <div className="text-sm">
            <p className="font-bold">
              {l.publisher.displayName}{' '}
              {l.publisher.verified && <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs text-white">✓ Vérifié</span>}
            </p>
            <p className="text-muted">
              {l.publisher.averageRating !== null ? `★ ${l.publisher.averageRating} (${l.publisher.reviewsCount} avis) · ` : ''}
              {[
                l.publisher.rentedCount > 0
                  ? `${l.publisher.rentedCount} logement${l.publisher.rentedCount > 1 ? 's' : ''} loué${l.publisher.rentedCount > 1 ? 's' : ''} via Klé`
                  : null,
                l.publisher.memberSince
                  ? `membre depuis ${new Date(l.publisher.memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {!taken && (
            <a
              href="/?profil=chercheur#inscription"
              className="rounded-full bg-brand px-6 py-3 text-center font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-dark"
            >
              Contacter sur Klé
            </a>
          )}
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white px-6 py-3 text-center font-bold ring-1 ring-line hover:ring-brand"
          >
            Partager sur WhatsApp
          </a>
        </div>
        <p className="mt-3 text-xs text-muted">
          Visite gratuite. Ne payez rien avant d’avoir vu le logement et rencontré le bailleur. L’adresse exacte est donnée
          dans l’appli après acceptation de la visite.
        </p>

        <h2 className="mt-10 text-xl font-extrabold">Ce que le bailleur a coché</h2>
        <div className="mt-4">
          <AmenitiesList a={l.amenities} />
        </div>
        {l.validatedVisits > 0 && (
          <p className="mt-4 text-sm text-muted">
            {l.validatedVisits} visite{l.validatedVisits > 1 ? 's' : ''} validée{l.validatedVisits > 1 ? 's' : ''} par QR code.
          </p>
        )}
      </div>
    </article>
  );
}

function Restricted({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-[var(--radius-card)] bg-white p-8 text-center ring-1 ring-line">
      <p className="text-4xl">🔑</p>
      <h1 className="mt-4 text-2xl font-extrabold">Annonce réservée</h1>
      <p className="mt-3 text-muted">{message}</p>
      <a href="/#prix" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-bold text-white">
        Voir les packs
      </a>
    </div>
  );
}
