# DigiSkool Academy — Cahier des charges complet

## 1. Ton rôle

Tu as **plus de 25 ans d'expérience** dans la conception de SaaS et de plateformes utilisées par des millions de personnes. Tu es à la fois :
- **directeur produit** : tu sais ce qui rend un produit simple, rapide et rentable ;
- **directeur de création et designer UI/UX** du niveau d'Udemy, Stripe, Apple ou Airbnb, obsédé par les détails ;
- **ingénieur full-stack senior** : code propre, typé, sécurisé, prêt pour la production ;
- **expert en marketing digital et en conversion**, spécialiste de la vente de produits digitaux en Afrique francophone et anglophone, sur mobile, à des clients qui achètent peu en ligne.

Tu avances par phases, tu expliques brièvement ce que tu fais, tu ne casses jamais ce qui fonctionne déjà, et quand tu vois une meilleure solution que celle décrite, tu la proposes avant de l'appliquer.

## 2. Contexte et vision

- **Nom :** DigiSkool Academy (nom court : DigiSkool).
- **Signature :** « Apprenez. Appliquez. Avancez. » / "Learn. Apply. Grow."
- **Propriétaire :** Roger BOUJIEKA, vendeur de produits digitaux depuis 2 ans, designer graphique.
- **Type :** plateforme **personnelle**, avec **un seul vendeur**. Ce n'est **pas** une marketplace, ni un outil pour d'autres créateurs. Il y a un administrateur (Roger), éventuellement une équipe support, et des clients.
- **Produits (par priorité) :** 1. **e-books** rédigés et hébergés sur la plateforme ; 2. **formations vidéo** ; 3. **vidéos** à l'unité ; 4. templates et packs.
- **Marchés :** Afrique francophone, Afrique anglophone, diaspora, international. Clients surtout **sur téléphone**, souvent venus d'une **publicité**, parfois avec une connexion lente.
- **Langues :** français et anglais partout. **Chaque produit existe dans les deux langues**, et un achat donne accès aux deux.
- **Formats :** site web **et application** (Android, iPhone, ordinateur).

### 2.1 Inspiration : Udemy… et au-delà

Udemy pour la structure et le sérieux (cartes produit, page produit avec en-tête sombre et carte d'achat collante, programme en accordéon, avis, espace d'apprentissage). Au-delà d'Udemy : une marque personnelle forte, le Mobile Money en quelques secondes, l'accès immédiat, le bilingue, la localisation automatique des prix, l'application installable, la lecture hors ligne, la communauté WhatsApp et les promotions permanentes.

### 2.2 Ce que m'ont appris 2 ans de vente

1. Beaucoup de clients **achètent rarement en ligne**. Inscription, mot de passe, formulaires longs : **ils abandonnent**.
2. Quand l'accès au produit n'est pas immédiat et évident après le paiement, ils pensent que **c'est une arnaque** et l'écrivent **dans les commentaires de la publicité**, ce qui détruit la campagne.
3. Les questions en inbox (« comment payer ? », « je n'ai pas reçu », « c'est combien en naira ? ») font perdre du temps et des ventes.

**Donc : zéro inscription, paiement ultra simple, accès immédiat, et une plateforme qui répond aux questions avant qu'on les pose.**

### 2.3 Objectifs business

1. Une plateforme de vente **de niveau international**, avec les **paiements locaux africains**.
2. Une **grande communauté WhatsApp**, vers laquelle la plateforme renvoie partout.
3. Des **promotions permanentes** (-40 %, -45 %…), étiquettes, chronos et codes promo partout.
4. Servir les **anglophones et les francophones**, chacun dans sa langue et sa devise.
5. Produire les produits **avec l'IA**.
6. Des **campagnes publicitaires mesurables** avec des pixels fiables.
7. Une **application** sur Google Play, l'App Store et l'ordinateur.

## 3. Règles non négociables

1. **Zéro inscription.** Aucun formulaire « Créer un compte », aucun mot de passe pour les clients (section 9).
2. **Simplicité extrême.** Chaque écran est compris par quelqu'un qui achète en ligne pour la première fois : gros boutons, mots simples, icônes avec texte, **une seule action principale par écran**.
3. **Accès immédiat.** Après le paiement, le client est devant son produit, sans rien faire (section 18).
4. **Zéro question en inbox.** La plateforme explique tout avant qu'on le demande : prix dans la devise locale, comment payer, comment accéder (sections 7 et 20).
5. **Bilingue partout.** Aucun texte écrit en dur.
6. **Marque premium** : la charte `4-CHARTE-DE-MARQUE.md` s'applique sans exception.
7. **100 % responsive, fluide, installable** comme une application.
8. **Promotions réelles** : prix barré = vrai prix normal ; chrono = vraie date de fin (obligatoire pour les visiteurs européens).
9. **Preuves sociales réelles uniquement.** Une seule fausse preuve repérée suffit à faire écrire « c'est fake » sous les publicités.
10. **Sécurité** : prix recalculés côté serveur, fichiers privés, clés jamais exposées.
11. **Performance** : affichage principal en moins de 2,5 s en 4G, Lighthouse mobile ≥ 90.

## 4. Stack technique

- **Next.js** (App Router, dernière version stable) + **TypeScript** strict
- **Tailwind CSS** + **shadcn/ui** (Drawer, Carousel, Command…), icônes **lucide-react**, animations **Framer Motion**, animations illustrées **Lottie** (format dotLottie, léger)
- **next-intl** (routes `/fr` et `/en`, chemins traduits)
- **PWA :** Serwist (service worker), manifeste, notifications **Web Push** (clés VAPID)
- **Applications des stores :** Bubblewrap ou PWABuilder (Google Play, Microsoft Store), **Capacitor** (App Store)
- **Supabase** : Postgres, Auth (connexion par numéro WhatsApp + code, Google, lien magique ; MFA pour l'admin), Storage (bucket public pour les images, buckets privés pour les fichiers vendus), **Realtime**, Row Level Security sur **toutes** les tables, Vault pour les jetons secrets
- **libphonenumber-js** : indicatif automatique, format, détection de l'opérateur
- **Taux de change :** API de taux de change mise à jour chaque jour + valeurs modifiables dans l'admin
- **Paiement :** plusieurs fournisseurs derrière une couche `PaymentProvider`
- **WhatsApp Business Platform (Cloud API)** pour les accès, codes et confirmations ; **SMS de secours** (ex. Africa's Talking, Twilio)
- **Vidéo :** Bunny Stream (jetons signés, sous-titres, téléchargement MP4 activable)
- **Tâches de fond :** Inngest ou Trigger.dev
- **IA :** API Claude d'Anthropic, SDK officiel `@anthropic-ai/sdk`, côté serveur uniquement
- **PDF :** `@react-pdf/renderer` (e-books), `pdf-lib` (filigrane)
- **Images générées :** `@vercel/og` (Satori) et `sharp`
- **Emails :** Resend + React Email
- **Anti-robots :** Cloudflare Turnstile, invisible
- **Éditeur riche (admin) :** Tiptap — **Validation :** Zod — **Formulaires :** React Hook Form
- **Limitation de requêtes :** Upstash Redis — **Erreurs :** Sentry — **Disponibilité :** surveillance externe (ex. Better Stack)
- **Hébergement :** Vercel (plan Pro), domaine [DOMAINE]

> Si l'outil impose une autre stack (ex. Lovable : React + Vite + Supabase), garde exactement la même architecture fonctionnelle et place toute la logique sensible dans des **Supabase Edge Functions**.

## 5. Marque et design system

**La charte `4-CHARTE-DE-MARQUE.md` est la référence** : nom, voix, logo, couleurs, typographies, motif, illustrations, photos, animations, éléments signature. Ce qui suit est sa mise en œuvre technique.

### 5.1 Jetons de design

- Une seule source de vérité : fichier de jetons (JSON) → variables CSS (clair et sombre) → thème Tailwind. Export JSON compatible Figma (Tokens Studio).
- Couleurs, typographies (Plus Jakarta Sans + Inter via `next/font`), échelle typographique, espacements (grille 4 / 8 px), rayons (12 px boutons et champs, 16–20 px cartes, pilules), ombres (2 niveaux), courbes et durées d'animation.

### 5.2 Composants

Chaque composant dans tous ses états (normal, survol, appui, focus, désactivé, chargement, erreur, succès), en clair et en sombre :
- Boutons : primaire Or (achat), secondaire Nuit, contour, discret, WhatsApp. **Hauteur minimale 48 px**, 56 px pour « Acheter » et « Payer ».
- Bloc prix, étiquettes promo, badges, étoiles, compte à rebours, badge « FR + EN », ligne de réassurance, carte WhatsApp (éléments signature de la charte, section 9).
- Cartes produit, carrousels, accordéons, onglets, tiroirs mobiles, fenêtres, toasts, squelettes, états vides illustrés, barres et anneaux de progression, champ numéro de téléphone avec drapeau, champ code à 6 chiffres, sélecteur de devise, sélecteur de langue.
- Formulaires : libellé toujours visible, grands champs, clavier adapté (numérique pour le téléphone et le code), erreurs sous le champ en langage simple.

### 5.3 Typographie française automatique

Utilitaire qui insère les espaces insécables avant « : ; ! ? » et dans les guillemets « », et qui empêche un prix ou une devise d'être coupé en fin de ligne (« 9 900 FCFA » toujours sur une ligne).

### 5.4 Responsive et fluidité

- Points de rupture : 360 / 640 / 768 / 1024 / 1280 / 1536 px. Testé sur petit Android (360 × 640), iPhone (390 × 844), tablette, ordinateur.
- Aucun défilement horizontal, zones tactiles ≥ 44 px, encoches d'iPhone prises en compte, éléments collants qui ne cachent jamais le contenu.
- Navigation quasi instantanée : préchargement des liens, transitions de page, interface optimiste.
- `prefers-reduced-motion` respecté. **Mode données faibles** (en-tête `Save-Data` ou connexion lente) : animations réduites, pas de lecture automatique des vidéos, images plus légères.

### 5.5 Accessibilité et lisibilité pour tous

Contraste AA, focus visible, navigation au clavier, textes alternatifs, popups accessibles (Échap, focus). Option « texte plus grand » dans le menu. Icônes toujours accompagnées d'un texte pour les actions importantes.

### 5.6 Pages de référence

- `/admin/design` : tous les composants dans tous leurs états.
- `/admin/marque` : la charte en ligne avec les fichiers à télécharger (section 11 de la charte).

## 6. Plateforme bilingue FR / EN

### 6.1 Détection automatique de la langue

- Première visite : langue du **téléphone ou du navigateur** (`Accept-Language`) : français → **français** ; anglais → **anglais** ; autre → **[LANGUE_PAR_DEFAUT]** (réglable).
- `/` redirige vers `/fr` ou `/en`. **Liens courts sans langue** (`[DOMAINE]/p/...`) : redirection selon le téléphone.
- Lien ouvert dans une autre langue que celle du téléphone : on respecte le lien, avec un bandeau discret « This page is also available in English → Switch » (une fois).

### 6.2 Bouton de langue

**FR | EN** toujours visible (header, menu, footer, application). Bascule **sur la même page**, choix mémorisé (cookie 1 an, et profil du client), prioritaire sur la détection.

### 6.3 URLs traduites

| Français | Anglais |
|---|---|
| `/fr` | `/en` |
| `/fr/boutique` | `/en/shop` |
| `/fr/ebooks` | `/en/ebooks` |
| `/fr/formations` | `/en/courses` |
| `/fr/videos` | `/en/videos` |
| `/fr/promotions` | `/en/deals` |
| `/fr/nouveautes` | `/en/new` |
| `/fr/communaute` | `/en/community` |
| `/fr/produits/[slug-fr]` | `/en/products/[slug-en]` |
| `/fr/offre/[slug-fr]` | `/en/offer/[slug-en]` |
| `/fr/panier` | `/en/cart` |
| `/fr/paiement` | `/en/checkout` |
| `/fr/mes-produits` | `/en/my-products` |
| `/fr/acces` | `/en/access` |
| `/fr/aide` | `/en/help` |
| `/fr/app` | `/en/app` |
| `/fr/parrainage` | `/en/referral` |
| `/fr/certificat/[code]` | `/en/certificate/[code]` |

Le back-office `/admin` est en français.

### 6.4 Ce qui est traduit

Interface (`messages/fr.json`, `messages/en.json`), tous les contenus de la base, emails, WhatsApp, SMS, notifications push, reçus, certificats, centre d'aide, assistant IA, pages légales. Formats localisés (`Intl`). SEO : `hreflang`, `canonical`, sitemap.

### 6.5 Règle de publication

Un produit ne peut pas être publié sans version française **et** anglaise complètes.

## 7. Localisation automatique : pays, devises et convertisseur

Objectif : chaque visiteur voit **immédiatement les prix dans sa devise**, sans rien demander.

### 7.1 Détection du pays

- À la première visite, le pays est détecté par l'**adresse IP** (en-tête `x-vercel-ip-country`), **sans demander la localisation GPS** (une demande d'autorisation fait peur et fait fuir).
- Au checkout, l'**indicatif du numéro WhatsApp** confirme le pays : il ajuste les moyens de paiement proposés.
- Le choix manuel du visiteur est mémorisé et toujours prioritaire.

### 7.2 Devise affichée automatiquement

| Pays | Devise |
|---|---|
| Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale | XAF (FCFA) |
| Côte d'Ivoire, Sénégal, Bénin, Togo, Burkina Faso, Mali, Niger, Guinée-Bissau | XOF (FCFA) |
| Nigeria | NGN (₦) |
| Ghana | GHS (GH₵) |
| Kenya | KES (KSh) |
| Afrique du Sud | ZAR (R) |
| Ouganda, Rwanda, Tanzanie | UGX, RWF, TZS |
| Guinée, RDC, Maroc | GNF, CDF (ou USD), MAD |
| Zone euro | EUR (€) |
| Royaume-Uni, Suisse, Canada | GBP, CHF, CAD |
| États-Unis et autres pays | USD ($) |

Liste et correspondances modifiables dans l'admin.

### 7.3 Sélecteur de devise dans le header

- Icône de devise en haut (ex. « 🇨🇲 XAF ▾ ») sur ordinateur, mobile et application.
- Un clic ouvre une fenêtre : « Détecté automatiquement : Cameroun », recherche, liste des devises avec drapeaux. Choix mémorisé.

### 7.4 Convertisseur sur les prix

- Petite icône **⇄** à côté de chaque prix (page produit, panier, checkout).
- Un toucher affiche le prix dans **la devise du visiteur** et dans 3 autres devises courantes (EUR, USD, FCFA ou naira), avec « Taux du jour, à titre indicatif ».
- Exemple : un Camerounais qui vit en France voit les prix en euros, et peut voir instantanément l'équivalent en FCFA.

### 7.5 Montant payé toujours clair

Si le moyen de paiement débite dans une autre devise que celle affichée (ex. carte débitée en USD), le checkout affiche exactement : « **Montant débité : 15,00 USD** (≈ 9 900 FCFA) ». Jamais de surprise.

### 7.6 Taux et arrondis

- Taux mis à jour **automatiquement chaque jour** ; l'admin peut fixer un taux à la main.
- XAF et XOF : parité fixe avec l'euro (1 € = 655,957 FCFA).
- Arrondis « commerciaux » par devise : FCFA → « 4 900 », naira → « ₦7 500 », USD/EUR → « 9,99 ».
- Les prix ne bougent pas pendant la visite (taux figé pour la session).

### 7.7 Prix régionaux (recommandé)

L'admin peut fixer **un prix par zone** (Afrique centrale, Afrique de l'Ouest, Nigeria, Afrique de l'Est, Europe, International), comme Udemy adapte ses prix au pouvoir d'achat. À défaut, conversion automatique du prix de base [DEVISE_DE_BASE].

## 8. Paiements locaux

### 8.1 Moyens de paiement

- **Afrique francophone :** MTN Mobile Money, Orange Money, Moov Money, Wave, Airtel Money, carte bancaire.
- **Afrique anglophone :** carte, Mobile Money (MTN MoMo, M-Pesa…), virement, USSD.
- **International :** carte bancaire, Apple Pay / Google Pay si le fournisseur les propose.
- Fournisseurs : **[FOURNISSEUR_PRINCIPAL]** et **[FOURNISSEUR_SECONDAIRE]** (ex. CinetPay, NotchPay, FedaPay, Fapshi ; Paystack, Flutterwave). Préférer ceux qui envoient la **demande de paiement directement sur le téléphone** du client.
- **Routage par pays** dans l'admin : quels fournisseurs et moyens s'affichent, dans quel ordre.
- **Paiement manuel** (dépôt + référence) : **désactivé par défaut**, il casse l'accès immédiat.

### 8.2 Déroulé sécurisé

1. Le serveur crée la commande `pending` en **recalculant les prix depuis la base** (promotion, code, devise, taux figé).
2. Le client valide (demande sur son téléphone, page du fournisseur, formulaire carte).
3. **Webhook** → signature vérifiée → statut re-vérifié auprès du fournisseur → **montant et devise** contrôlés → commande `paid` → droits d'accès → **accès immédiat** (section 18) → messages d'accès → `Purchase` vers les pixels → notification admin.
4. **Idempotence** (table `webhook_events`).
5. **Rattrapage** (Vercel Cron) : toutes les 2 min pendant 30 min, puis toutes les 10 min jusqu'à 24 h.
6. Mode test et mode réel séparés. **3-D Secure** obligatoire pour les cartes, limites anti-fraude (tentatives répétées, cartes multiples).

## 9. Connexion sans inscription : l'accès par numéro

Une plateforme personnelle n'a pas besoin d'un système d'inscription comme les plateformes pour créateurs : il fait fuir les clients. **Le client n'a jamais l'impression de « créer un compte ».**

### 9.1 Principes

- **Aucun bouton « S'inscrire », aucun formulaire de création de compte, aucun mot de passe** pour les clients.
- On visite, on feuillette, on remplit son panier **sans être connecté**.
- Le compte est **créé automatiquement et invisiblement** au premier achat (ou à l'inscription au lead magnet), à partir du **numéro WhatsApp**.
- Dans le header, le bouton s'appelle **« Mes produits »**, pas « Connexion ».

### 9.2 Retrouver ses produits (sur un nouvel appareil)

1. « Mes produits » → **« Entrez votre numéro WhatsApp »** (drapeau et indicatif pré-remplis).
2. Un **code à 6 chiffres** arrive sur WhatsApp (SMS en secours, après 30 s) via le « Send SMS Hook » de Supabase Auth.
3. Le code se remplit **automatiquement** quand c'est possible (`autocomplete="one-time-code"`, lecture du SMS sur Android) ; sinon, 6 grandes cases avec passage automatique.
4. C'est fait : le client voit ses produits.

### 9.3 Autres options (discrètes, sous le champ numéro)

- « Continuer avec Google » (un seul geste).
- « Recevoir un lien par email » (pour ceux qui n'utilisent pas WhatsApp, par exemple en Europe).

### 9.4 Rester connecté

- Session de **1 an** sur l'appareil (et dans l'application) : on ne redemande presque jamais le code.
- Nombre d'appareils connectés simultanément limité (réglable, ex. 3), pour limiter le partage de compte. Au-delà : « Déconnecter un autre appareil ? ».

### 9.5 Administrateur

Connexion séparée pour `/admin` : email + mot de passe + **double authentification** (application d'authentification). Rôle `support` avec droits limités.

## 10. Application : Android, iPhone et ordinateur

Une seule base de code (la plateforme web) devient une application installable partout.

### 10.1 Application installable (PWA) — dès le lancement

- Manifeste : nom « DigiSkool Academy », nom court « DigiSkool », icônes (dont masquables), couleur de thème Nuit, mode plein écran sans barre d'adresse, raccourcis (« Mes produits », « Promotions », « Communauté »).
- Écran de démarrage avec l'animation du logo (charte, section 8.3).
- Service worker : coque de l'application en cache, page hors ligne soignée, mises à jour automatiques avec le message « Nouvelle version disponible — Mettre à jour ».
- Installable sur **Android** (Chrome), **iPhone** (Safari, « Sur l'écran d'accueil »), **ordinateur** (Chrome, Edge).

### 10.2 Bouton « Installer l'application »

- Dans le menu, le footer, l'espace client, et sur la page de succès après un achat (« Retrouvez votre produit en un geste »).
- Page **`/app`** qui détecte l'appareil :
  - Android : bouton d'installation directe (ou lien Google Play une fois publiée) ;
  - iPhone : guide illustré en 3 étapes (« Partager » → « Sur l'écran d'accueil » → « Ajouter »), ou lien App Store une fois publiée ;
  - ordinateur : bouton d'installation.
- Bannière discrète d'installation (une fois tous les 14 jours, jamais pendant le paiement).

### 10.3 Lecture hors ligne

- Dans l'application, bouton « **Disponible hors ligne** » sur chaque e-book et chaque leçon (si le téléchargement est autorisé pour les vidéos).
- Le contenu est stocké dans l'application, lisible **uniquement dans l'application**, avec vérification du droit d'accès à chaque reconnexion (au moins tous les 30 jours).
- La progression se synchronise au retour de la connexion.
- Gestion de l'espace utilisé (« 120 Mo utilisés — Libérer de l'espace »).

### 10.4 Notifications push

- Autorisation demandée **au bon moment**, jamais à la première visite : après un achat, ou quand le visiteur clique « Me prévenir des promos ».
- Types : nouveau produit, promo flash, rappel d'apprentissage (« Vous en étiez à la leçon 4 »), suivi de commande.
- Envoyées depuis l'admin (section 29) avec ciblage (langue, pays, acheteurs d'un produit, non-acheteurs), programmation et statistiques.
- Fonctionnent sur Android, ordinateur et iPhone (application installée sur l'écran d'accueil, iOS 16.4 et plus).

### 10.5 Google Play (Android)

- Publication de la PWA en **Trusted Web Activity** (Bubblewrap ou PWABuilder), nom de paquet [ANDROID_PACKAGE], Digital Asset Links, fiche du store FR et EN.
- **Règle des stores :** Google Play impose en général son propre système de paiement (avec commission) pour la vente de contenus numériques **à l'intérieur** de l'application. La version Google Play est donc une **application « Mes produits »** : connexion par numéro, bibliothèque, liseuse, lecteur vidéo, hors ligne, notifications, communauté, aide. **Les achats se font sur le site.** Dans cette version, les boutons et liens d'achat sont masqués (détection de l'application).
- Liens des messages WhatsApp et emails : ils ouvrent directement l'application si elle est installée (App Links).
- Règles à revérifier au moment de la publication : elles évoluent et varient selon les pays.

### 10.6 App Store (iPhone)

- Même principe d'**application « Mes produits »** sans achat intégré, empaquetée avec **Capacitor**, avec des fonctions natives (notifications, téléchargements hors ligne, déverrouillage par Face ID / empreinte) : Apple refuse les simples sites emballés.
- En attendant sa publication : la PWA sur iPhone avec le guide d'installation.

### 10.7 Ordinateur

PWA installable sur Windows et Mac (Chrome, Edge). Publication possible sur le **Microsoft Store** via PWABuilder (règles de paiement à vérifier).

### 10.8 Expérience « application »

Barre d'onglets en bas, transitions fluides, tirer pour actualiser, retour arrière cohérent, aucune barre d'adresse, chargement instantané au deuxième lancement.

## 11. Couvertures automatiques (miniatures au même design)

- **Modèle unique** (charte) : fond dans la couleur du produit avec dégradé et **trame DigiSkool** ; en haut le logo + le type (« E-BOOK », « FORMATION VIDÉO »…) ; au centre le titre (Plus Jakarta Sans 800, blanc) et le sous-titre ; en bas l'icône du thème, le badge **FR** / **EN** et « Roger BOUJIEKA ».
- **Palette de 12 couleurs :** indigo `#4338CA`, émeraude `#059669`, cramoisi `#BE123C`, ambre `#D97706`, sarcelle `#0D9488`, violet `#7C3AED`, bleu ciel `#0284C7`, orange `#EA580C`, rose `#DB2777`, ardoise `#334155`, vert lime `#65A30D`, bleu marine `#1E3A8A`. Proposée automatiquement (différente des derniers produits), modifiable.
- Générée **en FR et en EN**, régénérée quand le titre ou la couleur change.
- **Formats :** 3:4 (boutique), 1:1, 16:9, 9:16 (statuts, stories), Open Graph 1200 × 630. Téléchargeables depuis l'admin.
- **Effet livre 3D** pour les e-books sur la page produit.
- Les étiquettes promo sont affichées par le site, **jamais incrustées** dans l'image.

## 12. Pages publiques et navigation

### 12.1 Header

- **Barre de promotion** tout en haut quand une promo est active (section 21.4).
- **Ordinateur :** logo, Catégories (méga-menu), **grande recherche** au centre (suggestions instantanées ; raccourci clavier `Ctrl + K`), FR | EN, **devise ⇄**, favoris, cloche de notifications, panier, **« Mes produits »**, bouton **« Communauté »** (vert).
- **Mobile :** logo, recherche, devise, panier, menu (tiroir avec le reste, bouton communauté, « Installer l'application »).
- **Barre d'onglets en bas sur mobile** : Accueil, Boutique, Recherche, Mes produits, Communauté. Masquée sur la page produit (remplacée par la barre d'achat), le checkout et la liseuse.

### 12.2 Accueil (Udemy, en mieux)

1. **Bannières** défilantes (FR/EN), avec chrono si promo.
2. **Hero** (dégradé Aube digitale + trame) : promesse, recherche, preuves réelles (apprenants, note, produits), boutons « Voir les formations » et « Rejoindre la communauté ».
3. Pastilles de catégories.
4. Carrousels : Offres du moment, Meilleures ventes, Nouveautés, E-books, Formations vidéo, « Reprendre » (si connecté), « Récemment consultés », « Recommandé pour vous ».
5. **Pourquoi DigiSkool** (icônes bicolores de la charte) : accès immédiat, FR + EN, Mobile Money, prix dans votre devise, hors ligne, accès à vie, communauté.
6. **« Comment ça marche » en 3 étapes** : Choisissez → Payez avec Mobile Money ou carte → Accédez immédiatement.
7. Chiffres clés animés (réels), témoignages, Roger, communauté, application, lead magnet « [LEAD_MAGNET] », FAQ, footer complet (réseaux [RÉSEAUX], pages légales, logos de paiement, « Retrouver mon achat », « Aide », « Installer l'application »).

### 12.3 Boutique, catégories, Promotions, Nouveautés

Filtres (tiroir sur mobile), pastilles des filtres actifs, tri (populaires, récents, prix, plus grosse réduction, mieux notés), résultats instantanés, « Voir plus ». Pages Promotions et Nouveautés.

### 12.4 Carte produit

Couverture + étiquette promo + badge ; titre (2 lignes) ; « Roger BOUJIEKA » ; ★ 4,8 (312) · 2 431 ventes ; « 120 pages » ou « 8 modules · 5 h » ; « FR + EN » ; prix promo + prix barré (dans la devise du visiteur) ; mini-chrono si l'offre finit dans moins de 48 h ; cœur favori. **Au survol sur ordinateur** : fenêtre avec 3 points « Ce que vous allez apprendre », date de mise à jour, « Ajouter au panier ».

### 12.5 Autres pages

À propos, Contact, FAQ, Communauté, **Aide** (section 20), **Retrouver mon achat**, **Installer l'application**, **Parrainage**, **Vérification de certificat**, Blog (phase 2), pages légales, 404, hors ligne, maintenance.

## 13. Page produit qui convertit

Objectif : en 5 secondes, le visiteur comprend ce qu'il obtient, a confiance, et achète en un clic.

### 13.1 Haut de page sur mobile (sans faire défiler)

1. Média : **livre 3D** (e-book) ou **vidéo de présentation** avec ▶ « Aperçu gratuit ».
2. Badges : Best-seller / Nouveau / Mis à jour en [mois].
3. Titre + sous-titre (la promesse).
4. ★ 4,8 (312 avis) · 2 431 ventes · par Roger BOUJIEKA.
5. **Bloc prix** (charte) : prix promo dans la devise du visiteur + icône ⇄, prix barré, « -45 % », « Vous économisez … », **chrono** réel.
6. **« Acheter maintenant »** (Or, pleine largeur, 56 px) ; « Ajouter au panier » ; « Offrir ce produit ».
7. Réassurance : 🔒 Paiement sécurisé · ⚡ Accès immédiat · FR + EN inclus.
8. Logos des moyens de paiement du pays.
9. Carte WhatsApp compacte « Une question ? ».

### 13.2 Version ordinateur

En-tête sombre (Aube digitale) avec fil d'Ariane, titre, sous-titre, badges, note, ventes, auteur, langues, date de mise à jour ; **carte d'achat collante** à droite (média, prix, chrono, boutons, « Ce produit comprend », garantie, code promo, partage).

### 13.3 « Ce produit comprend »

Pages / modules / leçons / heures · versions FR et EN · lecture en ligne · **lecture hors ligne dans l'application** · téléchargement (si activé) · accès à vie · mises à jour gratuites · certificat (formations) · téléphone, tablette, ordinateur · communauté.

### 13.4 Sections, dans cet ordre

1. Ce que vous allez apprendre (encadré, coches).
2. Aperçu gratuit (section 14).
3. Programme / sommaire (résumé chiffré, accordéon, « Tout développer », leçons gratuites « Aperçu », cadenas sur les autres).
4. Pour qui / pour qui ce n'est pas.
5. Description (« Lire la suite »).
6. Bonus (valeur réelle).
7. Preuves sociales (section 15).
8. L'auteur.
9. Garantie ([REMBOURSEMENT]).
10. **« Comment ça marche »** : 3 étapes illustrées (choisir, payer, accéder).
11. FAQ (dont : comment payer, comment accéder, FR + EN, hors ligne, devise).
12. Souvent achetés ensemble (pack, ajout en un clic).
13. Les clients ont aussi acheté.
14. Appel à l'action final (prix + chrono + bouton).
15. Bloc communauté WhatsApp.

### 13.5 Barre d'achat collante (mobile)

Quand le bouton principal sort de l'écran : miniature, prix, mini-chrono, « Acheter ». Ne cache jamais le contenu.

### 13.6 Micro-détails qui font vendre

- Économie en montant et en pourcentage, prix psychologiques.
- « Payez avec MTN MoMo, Orange Money, Wave… » sous le prix (selon le pays).
- « Dernière vente il y a 2 h » et « 12 personnes consultent ce produit » (réels, au-dessus d'un seuil).
- Offre de lancement limitée **réelle** (« Plus que 23 exemplaires au prix de lancement »).
- Pack contre achat séparé.
- Produit déjà acheté → bouton **« Accéder à mon produit »**.
- Partage WhatsApp en un geste.

## 14. Aperçus gratuits

### 14.1 E-book : feuilleter et pages floutées

- **« Feuilleter l'e-book »** (glisser sur mobile, flèches sur ordinateur), en FR ou EN.
- Les [3] premières pages lisibles (ou pages choisies par l'admin).
- Pages suivantes **floutées** avec cadenas et « Débloquez les 120 pages — [prix] » + bouton.
- **Sécurité :** pages floutées = **images basse résolution générées côté serveur**. Le vrai texte n'est jamais envoyé au navigateur.
- Sommaire complet visible.

### 14.2 Formation vidéo : leçons débloquées

- Vidéo de présentation ; programme complet (modules, leçons, durées, ressources).
- **1 à 3 leçons gratuites** choisies par l'admin, lisibles **sans être connecté**.
- Autres leçons : cadenas + durée + « Disponible après l'achat ».
- Fin d'un aperçu : « Vous avez aimé ? Débloquez les 46 leçons » + prix + chrono + bouton.

### 14.3 Vidéo à l'unité

60 premières secondes (réglable), puis écran d'achat.

## 15. Preuves sociales et confiance

- **Ventes :** réelles + **ventes antérieures** saisies par l'admin (vraies ventes avant le lancement). Seuil d'affichage réglable, masquable par produit.
- **Note + répartition des étoiles + nombre d'avis.**
- **Avis :** prénom, pays (drapeau), date, note, texte, **« Achat vérifié »**, photo facultative, filtres, « Utile ».
- **Collecte automatique** : message WhatsApp ou email à J+3 (e-book) ou à 50 % (formation), notation en 2 clics.
- **Témoignages :** captures WhatsApp (numéros masqués), vidéos, avis réels des plateformes précédentes (date et source).
- **Achats récents et visiteurs en direct :** réels uniquement.
- **Badges automatiques :** Best-seller (top 30 jours), Populaire, Nouveau, Mis à jour.
- **Certificats vérifiables** (QR code → page publique de vérification) : preuve partageable sur LinkedIn.
- **Signaux de confiance :** garantie, logos de paiement, photo réelle de Roger, numéro WhatsApp visible, réseaux sociaux, pages légales, informations de l'entreprise, « Vu dans » (si réel).
- **Interdit :** faux avis, faux compteurs, fausses notifications.

## 16. Pages de vente pour les publicités

- Page longue automatique par produit : `/fr/offre/[slug]`, `/en/offer/[slug]`.
- **Sans menu** : logo, FR | EN, devise, chrono, bouton WhatsApp.
- Structure : accroche → problème → solution → produit → contenu → aperçu → bénéfices → preuves → auteur → bonus → offre → garantie → « Comment ça marche » → FAQ. **Bouton d'achat toutes les 2 à 3 sections** + barre collante.
- Textes générés par le Studio IA (FR + EN), modifiables et activables section par section.
- Checkout express **sans quitter la page**.
- Tests A/B (titre, visuel, prix affiché) : phase 2.
- Exclues de l'indexation. Liens UTM prêts à copier (section 30.6).

## 17. Checkout express

Objectif : **payer en moins de 60 secondes**, même pour un premier achat en ligne.

### 17.1 Le strict nécessaire

- **Une page** (tiroir depuis la page produit sur mobile). Pas d'inscription, pas de mot de passe.
- **3 champs maximum :**
  1. **Nom complet**
  2. **Numéro WhatsApp** (drapeau et indicatif pré-remplis, format automatique, vérification)
  3. **Email facultatif** (« recommandé pour recevoir une copie »), avec correction des fautes courantes (« gmial.com » → « gmail.com ? »). Si le fournisseur exige un email, utiliser une adresse technique de la boutique.
- Client déjà connu sur cet appareil : **tout est pré-rempli**, paiement en un geste (lien « Ce n'est pas moi »).
- **Récapitulatif** : miniature, titre, « FR + EN inclus », prix dans la devise du visiteur, prix barré, économie, chrono.
- **Code promo replié** ; appliqué automatiquement s'il vient d'un lien.
- **Un seul order bump.**
- **Moyens de paiement du pays** en grandes tuiles avec logos ; **opérateur pré-sélectionné selon le numéro** ; numéro de paiement pré-rempli, modifiable.
- **Montant débité affiché** si la devise de paiement diffère (section 7.5).
- **Un seul bouton :** « Payer 9 900 FCFA » (Or, 56 px, cadenas).
- **Sous le bouton :** réassurance + logos + carte WhatsApp « Un souci pour payer ? » + lien **« Comment payer ? (vidéo 30 s) »**.
- **Conditions :** phrase « En payant, vous acceptez les CGV ». Pour les visiteurs de l'UE : case « Je demande l'accès immédiat et renonce à mon droit de rétractation ».
- Pas de captcha visible. Erreurs en langage simple (codes des fournisseurs traduits FR/EN), **réessayer sans rien ressaisir**, changer de moyen en un clic.

### 17.2 Mobile Money : l'écran d'attente

- Illustration animée d'un téléphone : « 📱 Regardez votre téléphone : une demande de paiement de 9 900 FCFA va s'afficher. Tapez votre code secret Mobile Money pour confirmer. »
- Bouton **« Écouter les instructions »** (guide audio de 30 s, FR/EN) pour ceux qui préfèrent écouter.
- Étapes numérotées, **statut en direct** (Realtime + vérification toutes les 3 s), **redirection automatique vers le produit** dès que c'est payé.
- Chrono de validité ; « Je n'ai pas reçu la demande » → instructions **de l'opérateur et du pays** (ex. code USSD), « Renvoyer la demande », « Changer de moyen de paiement ».
- Moyens par redirection ou QR code (ex. Wave) : ouverture de l'application sur mobile, QR code sur ordinateur.
- **Bandeau d'incident** : si un opérateur a des lenteurs, l'admin affiche « Orange Money rencontre des lenteurs : utilisez MTN MoMo ou la carte ».

### 17.3 Carte bancaire

Formulaire du fournisseur intégré (ou redirection), 3-D Secure, Apple Pay / Google Pay si disponibles, retour automatique sur l'accès.

### 17.4 Mesure et relance

Entonnoir du checkout dans l'admin (ouverture → champs → moyen → paiement lancé → payé). Relance des paniers abandonnés par WhatsApp et email, avec la mention « Nous pouvons vous recontacter au sujet de cette commande ».

## 18. Accès immédiat après paiement

Objectif : **moins de 5 secondes après la confirmation, le client est devant son produit, sans rien faire.**

### 18.1 Connexion automatique

Au début du checkout, le compte est créé ou retrouvé (par numéro WhatsApp) et un **cookie sécurisé lié à la commande** est posé. Dès le paiement confirmé, la page de succès **ouvre la session** (cookie + commande payée, jeton à usage unique). Aucun mot de passe, aucun email à valider, aucun code.

### 18.2 Page « Paiement réussi »

- Grand ✅ + « **Paiement réussi ! Votre produit est prêt.** » + célébration dorée (charte).
- **Énorme bouton** « Lire maintenant » / « Commencer la formation » / « Regarder la vidéo » ; « English version » / « Version française » ; « Télécharger » (si activé).
- « Votre accès a aussi été envoyé sur votre WhatsApp (+237 6•• •• •• 12). »
- Ensuite : « Installer l'application pour retrouver votre produit en un geste », carte WhatsApp (communauté + support), offre complémentaire discrète.
- **Aucun popup, rien à fermer.**

### 18.3 Ouverture directe

Un clic → liseuse au chapitre 1 ou lecteur à la leçon 1. Mini-guide de 3 écrans à la première ouverture, facile à passer.

### 18.4 Messages d'accès automatiques

WhatsApp (modèle validé par Meta), SMS de secours, email si fourni (textes en section 31). Lien personnel qui ouvre le produit, client connecté, valable 30 jours (puis « Retrouver mon achat »). Ouvre l'application si elle est installée.

### 18.5 Page fermée pendant le paiement

En revenant (même appareil) : bandeau vert « ✅ Votre paiement pour [produit] est confirmé — **Accéder à mon produit** ». Les messages arrivent de toute façon.

### 18.6 « Retrouver mon achat » (`/acces`)

Numéro WhatsApp → code à 6 chiffres → tous ses produits (même parcours que la section 9.2). Lien visible partout (menu, footer, bloc WhatsApp, aide).

### 18.7 Surveillance

Tableau **« Accès non ouverts »** (payé mais produit non ouvert après 30 min) : relance WhatsApp automatique avec le lien + alerte admin.

## 19. Bloc WhatsApp : support + communauté

- **Design (charte) :** carte arrondie fond vert 50, bordure verte, icône officielle.
- **Support :** « Besoin d'aide ? Écrivez-nous sur WhatsApp » + **numéro en clair** [WHATSAPP_SUPPORT], message pré-rempli (produit, numéro de commande).
- **Communauté :** bouton vert **« Rejoindre la communauté DigiSkool »** (lien FR ou EN) + « Promos exclusives jusqu'à -45 % annoncées ici en premier ».
- **Variantes :** page produit (« Une question ? »), checkout et attente Mobile Money (« Un souci pour payer ? »), succès (communauté en avant, après l'accès au produit), espace client, aide, footer, emails.
- **Bouton flottant** (sauf checkout, liseuse, lecteur) : panneau avec **en premier** « 👥 Rejoindre la communauté », puis « 💬 Contacter le support ».
- **Conseil d'expert :** utiliser **deux numéros** : un pour les messages automatiques (API WhatsApp) et un pour le support humain (application WhatsApp Business). Le support reste joignable normalement depuis un téléphone.
- Clics mesurés : `Contact` et `JoinCommunity`.

## 20. Centre d'aide « zéro question en inbox »

- **`/aide`** (`/en/help`) : recherche, articles courts illustrés, **vidéos de 30 à 60 s** et **guides audio** FR/EN.
- Articles indispensables : Comment payer (un article par opérateur et par pays) · Je n'ai pas reçu la demande de paiement · J'ai payé, où est mon produit ? · Retrouver mon achat · Installer l'application · Lire hors ligne · Télécharger · Changer de langue · Voir les prix dans ma devise · Remboursement · Offrir un produit.
- **Aide contextuelle :** petites icônes « ? » dans le checkout et l'écran d'attente qui ouvrent le bon article dans un tiroir, sans quitter la page.
- L'**assistant IA** (section 28) répond à partir de ces articles.
- WhatsApp support en dernier recours, avec le contexte pré-rempli.
- Statistiques : articles les plus lus, recherches sans résultat (pour savoir quoi ajouter).

## 21. Moteur de promotions

### 21.1 Campagnes

Nom ; réduction en **pourcentage** ou **montant fixe** ; portée (**tout**, un type, une catégorie, des produits) ; dates de début et de fin (**utilisées par le chrono**) ; application **automatique** ou par **code** ; textes FR/EN (étiquette, bannière, popup, notification push) ; style d'étiquette ; options d'affichage ; priorité (la meilleure réduction s'applique, pas de cumul sauf autorisation).

### 21.2 Modèles en un clic

« Flash 24 h : -45 % sur toutes les formations » · « Week-end : -40 % sur les e-books » · « Lancement : -30 % pendant 48 h » · « Promo générale : -40 % sur tout » · « Code communauté : -45 % pendant 24 h ».

### 21.3 Récurrences et offres spéciales

Promotions programmées (ex. chaque vendredi), avec annonce WhatsApp prête à copier et notification push prête à envoyer. Prix de lancement pour les N premiers (compteur réel). Offre de bienvenue (option).

### 21.4 Affichage

Barre en haut (« 🔥 -45 % sur toutes les formations — se termine dans 12:04:55 — Code DIGI45 [Copier] »), étiquettes, prix barré + économie, chrono réel, popup, page Promotions — **dans la devise du visiteur**.

### 21.5 Codes promo partout

Codes avec canal (communauté, TikTok, Facebook, Instagram, influenceur, email, flyer) ; liens `?promo=CODE` (mémorisés 7 jours) ; QR codes ; **générateur d'annonces** IA (FR + EN, lien court, code, vraie date de fin, boutons « Copier » et « Partager sur WhatsApp ») + **visuel promo** 9:16 et 1:1 ; statistiques par code, campagne et canal.

### 21.6 Historique des prix

`price_history` : prix barré toujours réel, prix de référence légal affichable (règle européenne des 30 jours).

## 22. Popups, notifications et nouveautés

- **Bienvenue** (1re visite) : « Rejoignez la communauté VIP : codes promo jusqu'à -45 % ».
- **Offre spéciale** (campagne active), une fois par campagne ; sur ordinateur, aussi quand la souris quitte la page.
- **Nouveauté** (produit de moins de 7 jours) : carte élégante en bas de l'écran, une fois par produit.
- **Hésitation** (45 s sans action sur une page produit) : « Une question avant d'acheter ? » → aide ou WhatsApp.
- **Panier abandonné** (au retour) : « Votre panier vous attend ».
- **Achats récents** (option) : vraies commandes uniquement.
- **Centre de notifications** (cloche) : promos, nouveautés, commandes, rappels, avec pastille du nombre de non lus.
- **Règles :** un seul popup par visite (priorité : offre > nouveauté > bienvenue) ; jamais sur le checkout, l'attente, le succès, la liseuse, le lecteur ; ne cache jamais le bouton d'achat ; tout réglable dans l'admin.

## 23. Communauté WhatsApp et parrainage

### 23.1 Communauté

- Liens **FR** [LIEN_COMMUNAUTE_FR] et **EN** [LIEN_COMMUNAUTE_EN], selon la langue. **Conseil d'expert :** une **chaîne WhatsApp** pour les annonces (idéale pour une grande audience) + une **communauté** pour les échanges.
- Présente partout (header, barre du bas, accueil, produit, succès, espace client, bouton flottant, emails, footer). Page `/communaute`.
- Clics comptés ; numéros collectés avec consentement exportables.

### 23.2 Parrainage (recommandé : le bouche-à-oreille est le premier canal en Afrique)

- Chaque client a un **lien de parrainage** et un bouton « Partager sur WhatsApp » avec un message prêt.
- Le filleul reçoit **-10 %** sur son premier achat ; le parrain reçoit un **code de -20 %** (ou un crédit) après l'achat payé du filleul. Montants réglables.
- Anti-fraude : même numéro, même appareil, auto-parrainage refusés.
- Page `/parrainage` et suivi dans l'espace client (« 3 amis ont acheté grâce à vous »).
- **Programme d'affiliation** pour influenceurs (commission, paiement Mobile Money manuel) : phase 2.

## 24. Produits bilingues et formats

### 24.1 Deux versions

Chaque produit en **français** et en **anglais** (titre, description, contenu, couverture, aperçu). **Un achat = les deux versions.**

### 24.2 E-books hébergés sur la plateforme

Chapitres → sections (texte riche, encadrés « À retenir », listes, tableaux, images, exercices, checklists), en FR et EN. Créés avec le Studio IA, écrits ou importés. À la publication : **PDF professionnel** par langue (modèle de la charte), nombre réel de pages, images d'aperçu. Lecture en ligne et téléchargement activables séparément. EPUB : phase 2.

### 24.3 Formations vidéo

Modules → leçons : vidéo FR et/ou EN, sous-titres FR et EN, texte, pièces jointes, quiz (phase 2). Téléchargement activable par formation et par leçon. Certificat vérifiable.

### 24.4 Vidéos à l'unité

Lecteur, sous-titres FR/EN, téléchargement activable.

### 24.5 Templates et packs

Templates téléchargeables ; packs à prix réduit.

### 24.6 Offrir un produit

Nom et numéro WhatsApp (ou email) du destinataire + message : il reçoit l'accès directement.

### 24.7 Pass DigiSkool (suggestion pour plus tard)

Accès à **tout le catalogue pendant 12 mois** pour un paiement unique (le Mobile Money se prête mal aux abonnements automatiques). Excellent pour augmenter le panier moyen quand le catalogue dépasse une dizaine de produits.

## 25. Espace client et expérience d'apprentissage

- **Accueil « Mes produits » :** produits achetés **en premier**, en grand, avec « Reprendre » ; puis promo, nouveautés, communauté, parrainage.
- **Bibliothèque :** pour chaque produit et chaque langue : Lire / Regarder, Télécharger (si activé), Disponible hors ligne (application).
- **Liseuse :** sommaire, progression, reprise automatique, **bascule FR ⇄ EN sur le même chapitre**, taille du texte, thèmes clair / sépia / sombre, plein écran, marque-pages (surlignage et notes en phase 2), filigrane discret.
- **Lecteur vidéo :** progression, reprise à la seconde, vitesse, qualité, sous-titres FR/EN, version FR/EN, téléchargement si activé, filigrane dynamique.
- **Motivation (inspiré des meilleures applications d'apprentissage) :** série de jours d'apprentissage, badges (premier chapitre, première formation terminée…), anneau de progression, rappels d'apprentissage par notification ou WhatsApp (si accepté), **certificat vérifiable** à partager.
- **Recommandations** à la fin d'un produit (« Prochaine étape : … ») avec un code réservé aux clients.
- Commandes et reçus, certificats, favoris, parrainage, profil (nom, numéro, email, pays, langue, devise, notifications, appareils connectés).

## 26. Livraison sécurisée et anti-piratage

- Buckets **privés**, jamais d'URL publique permanente.
- Téléchargement via route serveur : connexion + droit + téléchargement activé + limite (ex. 10 par produit et par langue) → **URL signée 60 s** → enregistré.
- **Filigrane PDF** (nom + numéro ou email sur chaque page).
- Contenu des e-books envoyé seulement aux ayants droit (ou pour les pages d'aperçu).
- Contenu hors ligne lisible uniquement dans l'application.
- Vidéos Bunny Stream à jetons signés, domaine autorisé uniquement.

## 27. Studio IA

### 27.1 E-book

1. **Brief :** sujet, public, problème, promesse, **nombre de pages**, niveau, ton, **stratégie** (produit d'appel, principal, premium, lead magnet) et prix visé, langue de rédaction, notes et documents, contexte africain à privilégier.
2. **Plan :** 3 titres + plan détaillé à valider.
3. **Rédaction** chapitre par chapitre (tâche de fond, progression), 1 page ≈ 300 mots (réglable).
4. **Traduction** complète et naturelle.
5. **Contrôle qualité.**
6. **Relecture** et régénération ciblée avec consigne.
7. **Génération en FR et EN :** couverture, page produit, page publicitaire, « Ce que vous allez apprendre », FAQ, bonus suggérés, SEO, aperçus, **prix suggéré par zone**, posts réseaux sociaux, annonce communauté, **notification push**.
8. **Aperçu → Publier** (ou programmer) ; déclenche le popup « Nouveauté ».

### 27.2 Formation vidéo ou vidéo

Vidéos + brief → transcription → sous-titres FR et EN → structure (modules, leçons, leçons d'aperçu conseillées) → pages de vente FR/EN, couverture, prix, annonces → support PDF en option → relecture → publication.

### 27.3 Import de contenu existant

Contenus préparés ailleurs (ex. avec Claude dans son application ou son extension) : texte collé ou fichier (.md, .docx, .pdf, .txt) → découpage → traduction → couverture → pages de vente. Format Markdown documenté dans le README.

### 27.4 Technique

Tâches de fond avec reprise et notification ; estimation du coût, coût réel, budget mensuel ; prompts de `3-PROMPTS-IA.md` dans des fichiers dédiés. Règles : section 28.3.

## 28. Assistant de vente IA

### 28.1 Coach DigiSkool

Chat dans la langue du visiteur : recommande le bon produit (prix **dans sa devise**, promo en cours), répond à partir de la FAQ et du **centre d'aide**, explique **comment payer étape par étape** selon son pays, rappelle l'accès immédiat, invite à la communauté. Ne doit jamais inventer de produit, de prix, de réduction ou de promesse. Problème de commande → support WhatsApp. Limites : 20 messages par heure, 1 000 caractères.

### 28.2 Assistant de rédaction (admin)

Boutons IA partout : générer, améliorer, traduire, SEO, FAQ, posts, emails, messages WhatsApp, notifications push, articles d'aide. Toujours en brouillon.

### 28.3 Règles techniques IA

- SDK `@anthropic-ai/sdk`, **côté serveur uniquement**, `ANTHROPIC_API_KEY`.
- Modèle `claude-opus-5-5` (`ANTHROPIC_MODEL`), modèle du chat réglable (`ANTHROPIC_CHAT_MODEL`).
- Chat en streaming, `output_config.effort` sur `"low"` ; rédaction en streaming, `"high"`.
- Sorties structurées (`output_config.format` + schéma JSON) pour plans, pages et annonces.
- Contenu stable en premier (cache de prompt). Pas de `temperature` ni de `budget_tokens`.
- Repli automatique en cas de refus (`fallbacks: "default"`, bêta `server-side-fallback-2026-07-01`), vérification de `stop_reason`, nouvelles tentatives, message de repli.
- Tokens, coût, durée enregistrés (`ai_jobs`).

## 29. Back-office administrateur `/admin`

Rôle `admin` (et `support` limité), vérifié côté serveur, double authentification. **Entièrement utilisable depuis un téléphone**, installable comme application.

1. **Tableau de bord :** chiffre d'affaires (jour, 7 j, 30 j, total, converti dans la devise de base), ventes, panier moyen, conversion, **entonnoir du checkout**, **accès non ouverts**, ventes par pays, devise, langue, moyen de paiement, code, campagne, source (UTM), installations de l'application, abonnés aux notifications, clics communauté, parrainages, top produits, coût IA.
2. **Produits :** FR et EN côte à côte (« Traduire avec l'IA »), couleur de couverture, prix de base et **prix par zone**, ventes antérieures, lecture / téléchargement / aperçus, bonus, badges, offre de lancement, statut, indicateur « FR / EN complet ».
3. **Studio IA.**
4. **Éditeur d'e-book** (chapitres, FR / EN, régénération, aperçus liseuse, PDF et pages floutées).
5. **Formations et vidéos.**
6. **Pages publicitaires.**
7. **Packs.**
8. **Promotions** (campagnes, modèles, récurrences, codes, liens, QR codes, annonces, visuels, statistiques).
9. **Popups, bannières, centre de notifications.**
10. **Notifications push :** rédaction FR/EN (avec l'IA), ciblage, programmation, statistiques d'ouverture.
11. **Commandes :** renvoyer l'accès (WhatsApp / SMS / email), rembourser (retire l'accès), valider un paiement manuel, offrir.
12. **Clients :** historique, accès, appareils connectés, export CSV.
13. **Avis et témoignages** (modération, import).
14. **Abonnés, communauté et parrainage.**
15. **Centre d'aide :** articles FR/EN, vidéos, guides audio, statistiques.
16. **Pixels et suivi** (section 30).
17. **Paiements :** fournisseurs, routage par pays, **devises, taux, arrondis, zones de prix**, instructions par opérateur et par pays, messages d'erreur, **bandeau d'incident opérateur**, paiement manuel.
18. **Messages :** modèles WhatsApp / SMS / email FR et EN, journal des envois.
19. **Application :** version, liens des stores, bannière d'installation, statistiques.
20. **Paramètres :** langue par défaut, liens communauté, numéros WhatsApp, réseaux, limites (téléchargements, appareils), seuils d'affichage, mots par page, budget IA.
21. **Équipe, journal d'activité.**
22. **Design** (`/admin/design`) et **Marque** (`/admin/marque`).

## 30. Pixels, suivi et publicité

Tout se règle **dans l'admin**, sans redéployer. Jetons secrets chiffrés (Vault).

### 30.1 Outils

| Outil | Navigateur | Serveur |
|---|---|---|
| Meta (Facebook / Instagram) | Pixel | API Conversions (jeton + code de test) |
| TikTok | Pixel | Events API |
| Google Analytics 4 | gtag | Measurement Protocol |
| Google Ads | Conversions, conversions améliorées | — |
| Google Tag Manager | Conteneur (option) | — |
| Snapchat | Pixel | Conversions API (option) |
| Pinterest, X, LinkedIn | Balises (option) | — |
| Microsoft Clarity | Cartes de chaleur, sessions (option) | — |

Plus : vérification de domaine (Meta, Google, TikTok, Pinterest).

### 30.2 Événements

`PageView`, `ViewContent`, `Search`, `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase` (valeur après réduction, devise, identifiants identiques au flux catalogue, langue), `Lead`, `CompleteRegistration`, `Contact`, `JoinCommunity`, `InstallApp`.

### 30.3 Fiabilité

- `Purchase` côté **serveur** (webhook) **et** navigateur, **même `event_id`** : pas de doublon, achat compté même avec un bloqueur ou sur iPhone.
- Correspondance avancée côté serveur : numéro (format international) et email **hachés**, prénom, nom, pays, ville, identifiant client haché, IP, navigateur, `_fbp` / `_fbc`, `ttclid`.
- Capture de `fbclid`, `ttclid`, `gclid` et des UTM (premier et dernier contact, 30 jours).
- **Devise de reporting** (ex. USD) si la plateforme publicitaire n'accepte pas la devise locale.
- Flux catalogue par langue (Meta, TikTok).

### 30.4 Guide de connexion intégré

Pas à pas en français pour chaque outil : identifiant du pixel, jeton serveur, vérification du domaine, code de test.

### 30.5 « Santé du suivi »

Pastille verte / orange / rouge par outil ; qualité de la correspondance ; bouton **« Simuler un parcours d'achat test »** ; derniers événements et leur statut.

### 30.6 Liens pour les publicités

- Générateur : produit ou page publicitaire + UTM + code promo → lien court.
- Paramètres prêts à copier :
  - Meta : `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`
  - TikTok : `utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_term=__AID_NAME__&utm_content=__CID_NAME__`
- Rapport par campagne, ensemble de publicités, publicité.

### 30.7 Consentement

Bannière cookies FR/EN ; consentement obligatoire avant les pixels (réglable, obligatoire pour l'UE) ; Google Consent Mode v2.

## 31. Emails, WhatsApp, SMS et notifications push

**WhatsApp** (modèles validés par Meta, SMS en secours) : accès au produit · code « Mes produits » · paiement en attente / échoué · panier abandonné · demande d'avis · accès non ouvert · rappel d'apprentissage (si accepté) · parrainage réussi · promos et nouveautés (**uniquement** avec consentement).

**Email :** bienvenue, confirmation + accès + communauté, paiement en attente / échoué, lead magnet, panier abandonné, nouveau produit (abonnés).

**Push :** nouveautés, promos flash, rappels, commandes (section 10.4).

**Admin :** chaque vente, accès non ouvert, paiement manuel, génération IA terminée, promo récurrente, incidents (section 35).

Modèle du message d'accès :
- FR : « Merci {{prénom}} ! ✅ Votre achat *{{produit}}* est confirmé. Accédez-y ici (versions FR + EN) : {{lien}} — Besoin d'aide ? Répondez à ce message. »
- EN : « Thank you {{first_name}}! ✅ Your purchase *{{product}}* is confirmed. Access it here (FR + EN versions): {{link}} — Need help? Just reply to this message. »

## 32. Modèle de données (Postgres / Supabase)

Montants en **entiers** (plus petite unité). Chaque table : `id uuid`, `created_at`, `updated_at` si modifiable. Champs traduits dans des tables `*_translations` (`locale` : `fr` | `en`).

**Utilisateurs**
- `profiles` : `id`, `full_name`, `phone` (international, unique), `email` (facultatif), `whatsapp_optin`, `push_optin`, `country`, `preferred_locale`, `preferred_currency`, `referral_code`, `role` (`customer` | `support` | `admin`).
- `user_devices` : `user_id`, `device_hash`, `platform`, `last_seen_at`.
- `push_subscriptions` : `user_id` (facultatif), `endpoint`, `keys`, `locale`, `country`, `platform`.
- `notifications` : `user_id`, `type`, `title`, `body`, `url`, `read_at` + traductions.

**Localisation**
- `country_settings` : `country`, `currency`, `price_zone`, `default_locale`, `phone_prefix`.
- `exchange_rates` : `currency`, `rate_from_base`, `rounding_rule`, `source`, `is_manual`, `updated_at`.
- `price_zones` : `code`, `name`, `currency`.

**Catalogue**
- `categories` + `category_translations`.
- `products` : `type`, `category_id`, `base_price`, `base_currency`, `cover_color`, `status`, `published_at`, `content_updated_at`, `is_featured`, `reading_enabled`, `download_enabled`, `offline_enabled`, `preview_pages`, `preview_seconds`, `target_pages`, `words_per_page`, `duration_minutes`, `historical_sales`, `show_sales_count`, `launch_limit`, `sales_count`, `rating_avg`, `rating_count`.
- `product_translations` : `title`, `slug`, `subtitle`, `short_description`, `description`, `benefits`, `learning_outcomes`, `target_audience`, `not_for`, `faq`, `seo_title`, `seo_description`, `cover_url`, `cover_variants`, `pdf_path`, `page_count`, `preview_images`, `is_complete`.
- `product_prices` : `product_id`, `price_zone` ou `currency`, `price`.
- `price_history`, `product_bonuses` (+ traductions), `bundle_items`, `landing_pages`, `short_links`, `banners` (+ traductions).

**E-books, formations, progression**
- `ebook_chapters` + `ebook_chapter_translations` ; `course_modules` + traductions ; `course_lessons` + `course_lesson_translations`.
- `reading_progress`, `bookmarks`, `lesson_progress`, `learning_streaks`, `user_badges`, `certificates` (`verification_code` unique).

**Ventes et accès**
- `checkout_sessions`, `checkout_events`.
- `orders` : `order_number` (`DS-2026-000123`), `user_id`, `full_name`, `phone`, `email`, `country`, `locale`, `display_currency`, `charge_currency`, `exchange_rate`, `status`, `subtotal`, `discount_amount`, `total`, `tax_amount`, `coupon_id`, `campaign_id`, `referral_id`, `payment_provider`, `payment_method`, `provider_reference`, `provider_payload`, `failure_code`, `utm_first`, `utm_last`, `click_ids`, `is_gift`, `paid_at`, `first_access_at`.
- `order_items`, `gifts`, `entitlements` (accès aux deux langues), `access_links`, `download_counts`, `offline_licenses` (`user_id`, `product_id`, `device_hash`, `expires_at`), `webhook_events`.

**Promotions et croissance**
- `promotions` + traductions, `coupons`, `announcements` + traductions.
- `referrals` : `referrer_id`, `referred_user_id`, `order_id`, `reward_coupon_id`, `status`.

**Preuves sociales et marketing**
- `reviews`, `testimonials`, `wishlists`, `subscribers`, `community_clicks`, `tracking_settings`, `tracking_events`.

**Aide**
- `help_articles` + `help_article_translations` (`title`, `body`, `video_url`, `audio_url`), `help_searches` (`query`, `locale`, `results_count`).

**Messages, paiement, IA, configuration**
- `message_templates`, `message_logs`.
- `payment_routes`, `payment_instructions` (`country`, `method`, `locale`, `steps`, `ussd_code`, `help_video_url`, `audio_url`), `operator_status` (`country`, `method`, `status`, `message`).
- `ai_briefs`, `ai_jobs`.
- `app_installs` (`platform`, `source`), `settings`, `activity_logs`.

**RLS**
- Un client ne voit que ses propres données.
- Public : produits publiés et traductions, catégories, avis et témoignages publiés, promotions, popups, bannières, pages publicitaires, articles d'aide, page de vérification de certificat (informations minimales).
- Contenu payant lisible uniquement avec un droit d'accès (ou en aperçu gratuit).
- Seul l'admin écrit dans le catalogue et les réglages ; `support` limité. Fonctions `is_admin()` et `has_access(product_id)`.
- Paiements, accès et licences : écritures côté serveur uniquement.

## 33. Sécurité, conformité et fiscalité

- RLS testée partout ; `/admin` protégé (middleware + rôle + double authentification).
- Jetons (checkout, liens, codes, licences hors ligne) : aléatoires, stockés hachés, à durée limitée.
- Validation Zod, contenu riche nettoyé, limitation des requêtes (codes, checkout, codes promo, chat, formulaires), en-têtes de sécurité (CSP compatible pixels, HSTS).
- Aucune clé secrète côté navigateur.
- Pages légales FR/EN ; consentements (cookies, WhatsApp, email, push) ; désinscription depuis chaque message marketing.
- **Données personnelles :** respect du RGPD pour l'Europe et des lois nationales africaines de protection des données ; export et suppression des données sur demande.
- **Fiscalité (à valider avec un comptable) :** la vente de produits numériques à des particuliers à l'étranger peut entraîner des taxes dans le pays du client (ex. TVA européenne via le guichet unique OSS, taxes sur les services numériques dans certains pays africains). La plateforme enregistre le pays du client, les montants hors taxes et taxes, et peut afficher les prix taxes comprises par zone.
- **Factures** conformes générées automatiquement (numérotation continue, informations de l'entreprise).

## 34. SEO

Métadonnées par page et par langue, `hreflang`, `canonical`, sitemap, `robots.txt` ; JSON-LD `Product` (offre, note), `Course`, `Book`, `Organization`, `FAQPage`, `BreadcrumbList` ; images Open Graph par produit et par langue ; pages `/offre` exclues de l'indexation ; articles d'aide indexés (ils attirent des visiteurs).

## 35. Performance, fiabilité et supervision

- Lighthouse mobile ≥ 90 ; LCP < 2,5 s, INP < 200 ms, CLS < 0,1 en 4G, **pixels actifs**.
- Rendu statique / ISR, revalidé à chaque modification ; scripts tiers non bloquants ; CDN pour images et vidéos.
- **Supervision :** surveillance de disponibilité ; alertes à l'admin (WhatsApp ou email) si : webhooks de paiement en échec, taux d'échec d'un opérateur anormal, messages WhatsApp non délivrés, erreurs serveur en hausse, site indisponible.
- Sauvegardes quotidiennes Supabase, testées. Sentry pour les erreurs.
- Mode maintenance avec page soignée.

## 36. Variables d'environnement (`.env.example`)

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYMENT_MODE=test
PAYMENT_PRIMARY_PROVIDER=
PAYMENT_PRIMARY_PUBLIC_KEY=
PAYMENT_PRIMARY_SECRET_KEY=
PAYMENT_PRIMARY_WEBHOOK_SECRET=
PAYMENT_SECONDARY_PROVIDER=
PAYMENT_SECONDARY_PUBLIC_KEY=
PAYMENT_SECONDARY_SECRET_KEY=
PAYMENT_SECONDARY_WEBHOOK_SECRET=

EXCHANGE_RATES_API_KEY=

WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
SMS_PROVIDER=
SMS_API_KEY=
SMS_SENDER_ID=

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
ANDROID_PACKAGE_NAME=
ANDROID_SHA256_CERT_FINGERPRINTS=

BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
BUNNY_STREAM_TOKEN_KEY=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-opus-5-5
ANTHROPIC_CHAT_MODEL=claude-opus-5-5
AI_MONTHLY_BUDGET_USD=

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

RESEND_API_KEY=
EMAIL_FROM=
ADMIN_NOTIFICATION_EMAIL=

NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
SENTRY_DSN=
```

Identifiants de pixels, liens de communauté et numéros affichés : réglés dans l'admin.

## 37. Livrables attendus

- Code complet, arborescence claire ; migrations SQL (tables, index, RLS, triggers, fonctions, buckets) ; `fr.json` et `en.json` complets.
- Jetons de design (JSON + CSS + Tailwind), logo et icônes en SVG, pages `/admin/design` et `/admin/marque`.
- PWA complète (manifeste, icônes, écrans de démarrage, service worker, hors ligne, push).
- Paquets Google Play (TWA) et iPhone (Capacitor) avec guide de publication.
- Données de démonstration bilingues (3 catégories, 3 e-books, 2 formations, 1 vidéo, 1 pack, 1 campagne -45 %, 2 codes, 10 articles d'aide, avis et témoignages marqués « démo »).
- `.env.example` et `README.md` (installation, chaque service, déploiement, rôle admin, import Markdown, validation des modèles WhatsApp, publication sur les stores).
- **Tests automatisés :** webhook (signature, doublon, montant/devise) ; calcul des prix (promos, codes, devises, taux, arrondis, zones) ; détection du pays et de la devise ; connexion automatique après paiement ; code « Mes produits » (correct, incorrect, expiré, limite d'essais) ; accès refusé sans achat ; texte des pages verrouillées jamais envoyé ; licences hors ligne ; parrainage (anti-fraude) ; détection de la langue.
- **Tests de bout en bout** (Playwright), FR et EN, écran de 360 px : publicité → page produit → checkout → paiement test → produit ouvert, **en moins de 60 secondes et 3 champs maximum**.

## 38. Méthode de travail

Travaille **phase par phase** :

1. Fondations, bilingue et localisation
2. Marque et design system
3. Connexion sans inscription et application installable
4. Boutique publique
5. Page produit, aperçus et preuves sociales
6. Promotions, popups, notifications et communauté
7. Checkout express, paiements et accès immédiat
8. Espace client et expérience d'apprentissage
9. Centre d'aide et assistant IA
10. Back-office admin
11. Studio IA
12. Pixels et pages publicitaires
13. Application : hors ligne, notifications push et stores
14. Sécurité, conformité, tests et mise en ligne

À la fin de chaque phase : ce qui est fait, ce qui reste, **comment je teste moi-même**. Si une information manque, choisis l'option la plus simple et la plus sûre, puis signale-le. Si tu vois une meilleure solution, propose-la avant de l'appliquer.
