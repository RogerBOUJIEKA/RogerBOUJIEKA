import { LoginForm } from './login-form';

export const metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expire?: string }> }) {
  const { expire } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <p className="text-lg font-extrabold">Back-office Klé</p>
        </div>
        <p className="mt-2 text-sm text-muted">Réservé à l’équipe. Double authentification obligatoire.</p>
        {expire && <p className="mt-4 rounded-lg bg-gold-soft px-3 py-2 text-sm">Ta session a expiré, reconnecte-toi.</p>}
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
