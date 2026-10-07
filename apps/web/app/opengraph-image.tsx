import { ImageResponse } from 'next/og';

export const alt = 'Klé — louer sans démarcheur, entre personnes vérifiées';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: 72,
          background: '#0b6e4f',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 48, fontWeight: 800 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#f2a007', display: 'flex' }} />
          Klé
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05 }}>Trouve ton logement</div>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, color: '#f2a007' }}>sans démarcheur.</div>
          <div style={{ fontSize: 34, marginTop: 28, opacity: 0.9 }}>
            Des logements en vidéo, publiés par des personnes vérifiées. Zéro frais de visite.
          </div>
        </div>
        <div style={{ fontSize: 30, opacity: 0.85 }}>Bientôt à Douala · Inscris-toi sur la liste d’attente</div>
      </div>
    ),
    size,
  );
}
