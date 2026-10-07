import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Klé — Louer sans démarcheur, entre personnes vérifiées',
    template: '%s · Klé',
  },
  description:
    'Des logements en vidéo, publiés par des personnes vérifiées. Zéro frais de visite, zéro démarcheur, bien moins cher qu’un agent. Lancement à Douala.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Klé',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b6e4f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
