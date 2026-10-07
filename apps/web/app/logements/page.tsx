import { formatMoney } from '@kle/shared/money';
import { HOUSING_TYPE_LABELS, HOUSING_TYPES } from '@kle/shared/listing';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { api, type City, type District, type ListingView } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Logements à louer à Douala',
  description: 'Appartements, studios et chambres à Douala, en vidéo, publiés par des bailleurs vérifiés. Sans démarcheur.',
};

type Search = Record<string, string | string[] | undefined>;

export default async function ListingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === 'string' && params[k] ? (params[k] as string) : undefined);
  let districts: District[] = [];
  let items: ListingView[] = [];
  let unavailable = false;
  try {
    const cities = await api<City[]>('/geo/cities', { revalidate: 3600 });
    const douala = cities.find((c) => c.code === 'DLA');
    if (douala) {
      districts = await api<District[]>(`/geo/cities/${douala.id}/districts`, { revalidate: 3600 });
      const query = new URLSearchParams({ cityId: douala.id, limit: '30' });
      for (const key of ['districtIds', 'type', 'maxRent'] as const) {
        const value = one(key);
        if (value) query.set(key, value);
      }
      items = (await api<{ items: ListingView[] }>(`/listings?${query}`, { revalidate: 60 })).items;
    }
  } catch {
    unavailable = true;
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Logements à Douala</h1>
        <p className="mt-2 text-muted">Publiés par des personnes vérifiées. Visite gratuite, sans démarcheur.</p>

        <form className="mt-6 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:grid-cols-4" method="get">
          <select name="districtIds" defaultValue={one('districtIds') ?? ''} className="rounded-xl border border-line px-3 py-2.5">
            <option value="">Tous les quartiers</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select name="type" defaultValue={one('type') ?? ''} className="rounded-xl border border-line px-3 py-2.5">
            <option value="">Tous les types</option>
            {HOUSING_TYPES.map((t) => (
              <option key={t} value={t}>
                {HOUSING_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select name="maxRent" defaultValue={one('maxRent') ?? ''} className="rounded-xl border border-line px-3 py-2.5">
            <option value="">Tous les budgets</option>
            {[30_000, 50_000, 75_000, 100_000, 150_000, 250_000, 400_000].map((v) => (
              <option key={v} value={v}>
                Jusqu’à {formatMoney(v)}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-brand px-4 py-2.5 font-bold text-white">Filtrer</button>
        </form>

        {unavailable ? (
          <p className="mt-10 text-center text-muted">Les annonces sont momentanément indisponibles.</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-card)] bg-white p-10 text-center ring-1 ring-line">
            <p className="text-lg font-bold">Les premières annonces arrivent bientôt.</p>
            <p className="mt-2 text-muted">Inscris-toi pour être prévenu dès qu’un logement correspond à ton budget.</p>
            <Link href="/?profil=chercheur#inscription" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-bold text-white">
              M’inscrire
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <li key={l.id}>
                <Link href={`/annonce/${l.ref}`} className="group block overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line transition hover:ring-brand">
                  <div className="relative aspect-[4/3] bg-line">
                    {l.media[0]?.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.media[0].thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold">{l.availability}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-xl font-extrabold text-brand tabular-nums">{formatMoney(l.monthlyRent)}</p>
                    <p className="font-semibold group-hover:underline">{l.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {l.district.name} {l.publisher.verified && '· ✓ Bailleur vérifié'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
