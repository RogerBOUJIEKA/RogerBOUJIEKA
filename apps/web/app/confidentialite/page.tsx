import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = {
  title: 'Données personnelles',
  description: 'Comment Klé protège tes données personnelles, conformément à la loi camerounaise n° 2024/017.',
};

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-extrabold tracking-tight">Tes données personnelles</h1>
        <p className="mt-3 text-muted">
          Cette page résume nos engagements pendant la phase de lancement. La politique de confidentialité complète sera
          publiée avec l’application.
        </p>
        <div className="mt-8 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold">Ce que nous collectons</h2>
            <p className="mt-2">
              Sur la liste d’attente : ton nom, ton numéro de téléphone, ton quartier, ton budget ou tes logements, et tes
              réponses facultatives à nos questions. Rien d’autre.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Pourquoi</h2>
            <p className="mt-2">
              Pour te prévenir du lancement de Klé, notamment sur WhatsApp, et pour concevoir un service qui répond à tes
              besoins. Nous ne vendons ni ne louons tes données.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Tes droits</h2>
            <p className="mt-2">
              Conformément à la loi n° 2024/017 relative à la protection des données à caractère personnel au Cameroun, tu
              peux à tout moment demander l’accès à tes données, leur correction ou leur suppression
              {WHATSAPP ? (
                <>
                  {' '}
                  en nous écrivant sur{' '}
                  <a className="underline" href={`https://wa.me/${WHATSAPP}`}>
                    WhatsApp
                  </a>
                </>
              ) : null}
              .
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Dans l’application</h2>
            <p className="mt-2">
              Les pièces d’identité et les selfies sont chiffrés, stockés à part et jamais publiés. Seuls nos modérateurs les
              consultent, par des liens temporaires, et chaque consultation est enregistrée.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
