import { formatMoney } from '@kle/shared/money';
import { ImageResponse } from 'next/og';
import { api, type ListingView } from '@/lib/api';

export const alt = 'Annonce Klé';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Aperçu affiché par WhatsApp quand le lien de l'annonce est partagé. */
export default async function Image({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  let listing: ListingView | null = null;
  try {
    listing = await api<ListingView>(`/listings/${encodeURIComponent(ref)}`, { revalidate: 300 });
  } catch {
    listing = null;
  }
  const photo = listing?.media.find((m) => m.thumbnailUrl?.match(/\.(jpe?g|png)$/i))?.thumbnailUrl;
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0b6e4f', color: 'white', fontFamily: 'sans-serif' }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={472} height={630} style={{ objectFit: 'cover', width: 472, height: 630 }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 40, fontWeight: 800 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f2a007', display: 'flex' }} />
            Klé
          </div>
          {listing ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 76, fontWeight: 800, color: '#f2a007' }}>{formatMoney(listing.monthlyRent)}</div>
              <div style={{ fontSize: 30, opacity: 0.85 }}>par mois</div>
              <div style={{ fontSize: 46, fontWeight: 700, marginTop: 24 }}>{listing.title}</div>
              <div style={{ fontSize: 30, opacity: 0.85, marginTop: 8 }}>{`${listing.district.name}, ${listing.city.name}`}</div>
            </div>
          ) : (
            <div style={{ fontSize: 56, fontWeight: 800 }}>Logement réservé aux abonnés</div>
          )}
          <div style={{ display: 'flex', gap: 16, fontSize: 26 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 20px', borderRadius: 999 }}>Publié par une personne vérifiée</div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 20px', borderRadius: 999 }}>Visite gratuite</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
