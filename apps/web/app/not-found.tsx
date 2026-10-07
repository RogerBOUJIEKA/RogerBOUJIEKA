import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-5xl">🔑</p>
        <h1 className="mt-4 text-3xl font-extrabold">Cette page n’existe pas</h1>
        <p className="mt-3 text-muted">L’annonce a peut-être été retirée ou louée.</p>
        <Link href="/logements" className="mt-8 inline-block rounded-full bg-brand px-6 py-3 font-bold text-white">
          Voir les logements
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
