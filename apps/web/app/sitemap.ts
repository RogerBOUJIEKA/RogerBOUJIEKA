import type { MetadataRoute } from 'next';
import { api, type City, type ListingView } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const revalidate = 3600;

/** Pages d'annonces trouvées sur Google. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = ['', '/logements', '/charte', '/confidentialite'].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'weekly',
  }));
  try {
    const cities = await api<City[]>('/geo/cities', { revalidate: 3600 });
    for (const city of cities) {
      const { items } = await api<{ items: ListingView[] }>(`/listings?cityId=${city.id}&limit=50`, { revalidate: 3600 });
      for (const l of items) {
        pages.push({ url: `${SITE_URL}/annonce/${l.ref}`, lastModified: l.publishedAt ?? undefined, changeFrequency: 'daily' });
      }
    }
  } catch {
    // L'API est indisponible : le plan du site reste limité aux pages fixes.
  }
  return pages;
}
