import Link from 'next/link';
import { Wordmark } from './logo';

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Klé, accueil">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          <Link href="/#comment" className="hover:text-ink">
            Comment ça marche
          </Link>
          <Link href="/#bailleurs" className="hover:text-ink">
            Bailleurs
          </Link>
          <Link href="/#prix" className="hover:text-ink">
            Prix
          </Link>
          <Link href="/logements" className="hover:text-ink">
            Logements
          </Link>
          <Link href="/charte" className="hover:text-ink">
            Charte
          </Link>
        </nav>
        <Link
          href="/#inscription"
          className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          S’inscrire
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted sm:grid-cols-3">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs">
            Louer sans démarcheur ni arnaque, entre personnes vérifiées. Lancement à Douala, puis dans toute l’Afrique
            francophone.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-ink">Klé</p>
          <Link href="/charte" className="block hover:text-ink">
            La charte
          </Link>
          <Link href="/confidentialite" className="block hover:text-ink">
            Données personnelles
          </Link>
          <Link href="/logements" className="block hover:text-ink">
            Logements à Douala
          </Link>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-ink">Nous écrire</p>
          {WHATSAPP ? (
            <a href={`https://wa.me/${WHATSAPP}`} className="block hover:text-ink">
              WhatsApp
            </a>
          ) : (
            <p>WhatsApp : bientôt</p>
          )}
          <p>Douala, Cameroun</p>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">© {new Date().getFullYear()} Klé</p>
    </footer>
  );
}
