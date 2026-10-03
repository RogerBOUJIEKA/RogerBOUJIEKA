# PROMPT — Plateforme de formations en ligne « Roger BOUJIEKA »

> **Mode d'emploi :** copie tout le texte à partir de la ligne « RÔLE » ci-dessous et envoie-le à Claude Code dans un **nouveau dépôt dédié au site** (par ex. `roger-boujieka-academy`), et non dans ce dépôt de profil GitHub.
> Avant d'envoyer, remplace toutes les mentions **`[À COMPLÉTER]`** par tes vraies informations (téléphone, WhatsApp, e-mail, réseaux sociaux, prix, titres des formations…).

---

## RÔLE

Tu es un développeur full-stack senior et un designer UI/UX spécialisé dans les plateformes e-learning et le e-commerce pour le marché africain. Tu vas concevoir et développer de A à Z une plateforme web professionnelle de vente et de diffusion de formations en ligne pour **Roger BOUJIEKA**, créateur digital et entrepreneur web basé à **Douala, Cameroun**.

Travaille de façon méthodique : propose d'abord l'architecture et le plan, puis développe phase par phase, en testant chaque fonctionnalité avant de passer à la suivante. Le code doit être propre, typé, commenté là où c'est utile, sécurisé et prêt pour la production.

---

## 1. CONTEXTE DU PROJET

- **Propriétaire :** Roger BOUJIEKA — créateur de contenu, formateur et entrepreneur web.
- **Localisation :** Douala, Cameroun (fuseau horaire `Africa/Douala`, UTC+1).
- **Domaines d'expertise :** Intelligence Artificielle (IA) et Marketing Digital.
- **Objectif principal :** vendre des formations en ligne, les diffuser de façon sécurisée (streaming + téléchargement pour visionnage hors ligne sur téléphone), proposer des accompagnements personnalisés et animer une communauté.
- **Échéance :** lancement des premières formations **la semaine prochaine** → la **Phase 1 (MVP)** doit être fonctionnelle et déployable en priorité.
- **Public cible :** entrepreneurs, étudiants, freelances, commerçants, créateurs de contenu et professionnels d'Afrique francophone (Cameroun, Côte d'Ivoire, Sénégal, Gabon, Congo, etc.) et de la diaspora.
- **Contraintes du marché :**
  - Majorité des visiteurs sur **mobile** (Android d'entrée et milieu de gamme).
  - Connexion internet parfois lente ou instable (3G/4G) et data coûteuse → le site doit être **très léger et rapide**.
  - Paiement principalement par **Mobile Money** (Orange Money, MTN Mobile Money) ; la carte bancaire est secondaire.
  - **WhatsApp** est le canal de communication principal.
  - Devise principale : **Franc CFA (XAF / FCFA)**. Afficher aussi un équivalent indicatif en EUR/USD pour la diaspora.
  - Langue principale : **français**. Prévoir l'architecture pour l'**anglais** (Cameroun bilingue) via i18n.

---

## 2. IDENTITÉ VISUELLE & DESIGN

### 2.1 Charte graphique — dominante ROUGE

Couleur signature : **le rouge**. Le rendu doit être premium, moderne, sobre et professionnel (inspiration : Netflix, Apple, Stripe, Linear, Webflow — pas un rendu « template gratuit »).

Palette proposée (à définir en variables CSS / tokens Tailwind pour pouvoir l'ajuster facilement) :

| Rôle | Couleur | Usage |
|---|---|---|
| Rouge principal | `#E11D2E` | Boutons d'action, liens, éléments clés |
| Rouge profond | `#9F1220` | Survol, dégradés, fonds de sections fortes |
| Rouge clair | `#FFE4E6` | Badges, fonds légers, surlignages |
| Noir profond | `#0A0A0B` | Fonds sombres, sections premium, hero |
| Anthracite | `#1C1C1F` | Cartes en mode sombre |
| Gris texte | `#52525B` | Texte secondaire |
| Blanc cassé | `#FAFAFA` | Fond clair principal |
| Accent doré (optionnel, avec parcimonie) | `#F5B700` | Badges « Bestseller », étoiles d'avis, offres premium |

- **Modes clair et sombre** avec bascule, respectant la préférence système. Les sections « hero » et « offre premium » peuvent être en noir + rouge dans les deux modes.
- **Typographies :** titres en `Poppins` ou `Sora` (gras, impactants) ; texte courant en `Inter`. Chargées via `next/font` (auto-hébergées, pas de requête externe bloquante).
- **Style :** coins arrondis (12–20 px), ombres douces, dégradés rouge → rouge profond, effets « glassmorphism » légers sur la navigation, grilles aérées, beaucoup d'espace blanc, icônes cohérentes (Lucide).
- **Logo :** prévoir un emplacement pour le logo `[À COMPLÉTER]` ; en attendant, générer un logotype texte « Roger BOUJIEKA » (ou monogramme « RB ») en SVG, rouge et noir.
- **Accessibilité :** contrastes WCAG AA minimum, navigation clavier, attributs `alt`, `aria-*`, tailles tactiles ≥ 44 px.

### 2.2 Animations & dynamisme

Le site doit être **vivant et animé**, sans jamais sacrifier la performance :

- **Framer Motion** pour les transitions de pages, apparitions au scroll (fade/slide), effets de survol des cartes (élévation, zoom léger de l'image), menus et modales.
- **Hero animé** : titre avec effet de texte qui s'écrit ou mots qui alternent (« Maîtrise l'IA », « Vends en ligne », « Automatise ton business »…), dégradé rouge animé ou particules légères en arrière-plan.
- **Compteurs animés** (nombre d'apprenants, de formations, d'heures de contenu, de pays touchés).
- **Carrousels / sliders** fluides et tactiles pour les témoignages, les réalisations et les formations (Embla Carousel).
- **Marquee** (défilement infini) des logos de partenaires / médias / outils (ChatGPT, Claude, Canva, Meta Ads, etc.).
- **Micro-interactions** : boutons avec effet de pulsation sur les CTA principaux, barre de progression animée, confettis à la fin d'un cours ou après un achat réussi.
- **Skeleton loaders** pendant les chargements.
- **Compte à rebours** pour les offres de lancement et promotions.
- **Notifications de preuve sociale** discrètes (« Aïcha de Yaoundé vient de rejoindre la formation… ») — basées sur de vrais achats uniquement, désactivables depuis l'admin.
- Respecter `prefers-reduced-motion` : animations réduites si l'utilisateur le demande.

---

## 3. STACK TECHNIQUE

Choisis la stack suivante (ou justifie toute alternative) :

- **Framework :** Next.js (dernière version stable, App Router) + **TypeScript** strict.
- **UI :** Tailwind CSS + shadcn/ui + Lucide Icons + Framer Motion.
- **Base de données :** PostgreSQL (via **Supabase** ou Neon) avec **Prisma** ou Drizzle ORM.
- **Authentification :** Auth.js (NextAuth) ou Supabase Auth — connexion par e-mail + mot de passe, **lien magique**, **Google**, et **connexion par numéro de téléphone (OTP SMS/WhatsApp)** prévue dans l'architecture.
- **Hébergement vidéo sécurisé :** **Bunny Stream** (recommandé : économique, CDN rapide en Afrique, HLS adaptatif, URLs signées, protection anti-téléchargement, watermark) — alternative : Mux.
- **Stockage fichiers (PDF, ressources, images) :** Supabase Storage, Cloudflare R2 ou Bunny Storage avec **URLs signées à durée limitée**.
- **Paiements :** **Chariow** (prioritaire) + architecture multi-fournisseurs (voir section 6).
- **E-mails transactionnels :** Resend + React Email (templates aux couleurs de la marque).
- **Formulaires & validation :** React Hook Form + Zod.
- **PWA :** application installable sur téléphone (manifest, service worker, icônes, écran de démarrage rouge) avec lecture hors ligne (voir section 5.4).
- **Déploiement :** Vercel (frontend + API) ; base de données Supabase/Neon.
- **Analytics :** Plausible ou Umami + **Meta Pixel** et **Google Analytics 4 / Google Tag Manager** (indispensables pour les publicités Facebook/Instagram/TikTok), **TikTok Pixel**.
- **Qualité :** ESLint, Prettier, tests (Vitest pour la logique, Playwright pour les parcours critiques : inscription, achat, accès au cours).

---

## 4. STRUCTURE DU SITE (ARBORESCENCE)

### 4.1 Pages publiques

1. **Accueil** (`/`)
2. **Catalogue des formations** (`/formations`)
3. **Page de vente d'une formation** (`/formations/[slug]`) — la page la plus importante
4. **Accompagnement / Coaching** (`/accompagnement`)
5. **Communauté** (`/communaute`)
6. **Réalisations & Témoignages** (`/realisations`)
7. **À propos de Roger** (`/a-propos`)
8. **Blog / Ressources gratuites** (`/blog`, `/blog/[slug]`) — astuces IA & marketing, optimisé SEO
9. **Ressources gratuites / Lead magnets** (`/gratuit`) — ex. « Guide des 50 prompts IA pour vendre en ligne » contre e-mail + WhatsApp
10. **Programme d'affiliation** (`/affiliation`)
11. **Contact** (`/contact`)
12. **FAQ** (`/faq`)
13. **Vérification de certificat** (`/certificat/[code]`)
14. **Pages légales :** Mentions légales, CGV, Politique de confidentialité, Politique de remboursement, Politique cookies
15. **Panier / Checkout** (`/checkout`) + pages **Paiement réussi / en attente / échoué**
16. **Pages d'erreur** 404 et 500 personnalisées, aux couleurs de la marque

### 4.2 Espace membre (`/espace`)

- Tableau de bord, mes formations, lecteur de cours, téléchargements, certificats, factures, communauté, mes rendez-vous d'accompagnement, parrainage/affiliation, profil & paramètres.

### 4.3 Espace administrateur (`/admin`) — réservé à Roger (et futurs collaborateurs)

- Gestion des formations, ventes, clients, coupons, témoignages, réalisations, blog, communauté, accompagnements, affiliés, e-mails, paramètres. (Détails section 8.)

---

## 5. DÉTAIL DES PAGES ET FONCTIONNALITÉS

### 5.1 Page d'accueil

Sections dans cet ordre (toutes animées au scroll) :

1. **Barre d'annonce** en haut (rouge, fermable) : « 🚀 Lancement : -40 % sur toutes les formations jusqu'au [date] » avec compte à rebours. Modifiable depuis l'admin.
2. **Navigation** sticky, transparente puis floutée au scroll : logo, Formations, Accompagnement, Communauté, Réalisations, Blog, À propos, bouton « Se connecter », bouton CTA rouge « Commencer maintenant ». Menu burger animé sur mobile.
3. **Hero** : titre fort (ex. « Maîtrise l'Intelligence Artificielle et le Marketing Digital pour développer ton business en Afrique »), sous-titre, 2 CTA (« Découvrir les formations » / « Rejoindre la communauté »), photo ou vidéo de Roger avec cadre rouge, badges de confiance (« +[X] apprenants », note moyenne ⭐, « Paiement Mobile Money sécurisé »).
4. **Bandeau logos** des outils enseignés / médias (marquee).
5. **Chiffres clés animés.**
6. **Problème → Solution** : les douleurs de l'audience (« Tu postes mais tu ne vends pas ? », « L'IA te paraît compliquée ? ») et comment les formations les résolvent.
7. **Formations phares** : cartes (image, titre, niveau, durée, nombre de leçons, note, prix barré + prix promo en FCFA, badge « Nouveau » / « Bestseller »), bouton « Voir la formation ».
8. **Pourquoi se former avec Roger** : 4–6 arguments avec icônes (méthode pratique, contenu adapté au contexte africain, accès à vie, support WhatsApp, certificat, communauté).
9. **Comment ça marche** : 3–4 étapes animées (Choisis → Paie par Mobile Money → Accède immédiatement → Applique et obtiens des résultats).
10. **Témoignages** : carrousel texte + témoignages **vidéo** + captures d'écran de résultats (WhatsApp, ventes…).
11. **Réalisations** : aperçu de projets / résultats d'élèves, lien vers la page dédiée.
12. **Accompagnement** : présentation des offres de coaching avec CTA.
13. **Communauté** : bloc d'appel à rejoindre (gratuite et/ou VIP).
14. **À propos de Roger** : photo, mini-bio, parcours, valeurs, liens réseaux sociaux.
15. **Lead magnet** : ressource gratuite contre e-mail + numéro WhatsApp.
16. **FAQ** (accordéon animé).
17. **CTA final** pleine largeur rouge/noir.
18. **Footer** complet : liens, contacts (Douala, Cameroun), WhatsApp, réseaux sociaux (Facebook, Instagram, TikTok, YouTube, LinkedIn, Telegram), moyens de paiement acceptés (logos Orange Money, MTN MoMo, Visa/Mastercard), inscription newsletter, liens légaux, © Roger BOUJIEKA.

**Éléments globaux :** bouton **WhatsApp flottant** (avec message pré-rempli), bouton « retour en haut », bannière cookies conforme.

### 5.2 Catalogue des formations

- Grille responsive de cartes animées.
- **Filtres** : catégorie (IA, Marketing Digital, Business en ligne, Réseaux sociaux, Copywriting, Automatisation…), niveau (Débutant / Intermédiaire / Avancé), prix (gratuit / payant), durée, format.
- **Recherche instantanée** et **tri** (populaires, récentes, prix, mieux notées).
- **Packs / Bundles** : plusieurs formations à prix réduit.
- Pagination ou chargement progressif.

### 5.3 Page de vente d'une formation (dynamique, générée depuis l'admin)

Chaque formation créée dans l'admin génère automatiquement une page de vente complète et persuasive :

1. **En-tête** : titre, sous-titre/promesse, catégorie, niveau, note ⭐ et nombre d'avis, nombre d'inscrits, date de mise à jour, langue.
2. **Vidéo de présentation** (trailer) ou image de couverture.
3. **Encadré d'achat sticky** (à droite sur desktop, barre fixe en bas sur mobile) : prix barré, prix promo en FCFA (+ équivalent EUR), compte à rebours de l'offre, bouton « Acheter maintenant » (rouge, pulsant), bouton « Payer via WhatsApp », champ code promo, ce qui est inclus (heures de vidéo, nombre de leçons, ressources téléchargeables, accès à vie, certificat, accès communauté, mises à jour gratuites), badges de paiement sécurisé et garantie.
4. **Ce que tu vas apprendre** : liste de bénéfices avec coches rouges.
5. **Pour qui est cette formation / pour qui elle n'est PAS.**
6. **Prérequis.**
7. **Programme détaillé** : modules → leçons (accordéon), durée de chaque leçon, icône de type (vidéo, PDF, quiz, audio), leçons en **aperçu gratuit** lisibles sans achat.
8. **Description longue** riche (éditeur de texte riche dans l'admin : titres, gras, listes, images, vidéos intégrées).
9. **Bonus inclus** (templates, prompts, fichiers Canva, groupes privés…), avec valeur affichée.
10. **Le formateur** : présentation de Roger.
11. **Témoignages et avis** spécifiques à la formation (texte, vidéo, captures de résultats) + note globale avec répartition des étoiles.
12. **Réalisations d'élèves** liées à la formation.
13. **Garantie** : politique de satisfaction/remboursement (paramétrable, ex. 7 jours).
14. **FAQ de la formation.**
15. **Offres complémentaires** : upsell (accompagnement), bundle, formations similaires.
16. **CTA final** avec rappel du prix et du compte à rebours.

Paramètres par formation : prix normal, prix promo, date de fin de promo, **paiement en plusieurs fois** (ex. 2 ou 3 versements), formation gratuite, places limitées, statut (brouillon / publiée / bientôt disponible avec liste d'attente / archivée), date de publication programmée, **contenu distillé au fil du temps (drip)**, SEO (titre, description, image de partage), pixel/événements de conversion.

### 5.4 Espace apprenant & lecteur de cours

- **Tableau de bord** : formations achetées avec progression (%), « Reprendre là où je me suis arrêté », recommandations, annonces de Roger.
- **Lecteur de cours** :
  - Lecteur vidéo HLS adaptatif (qualité automatique selon la connexion : 360p / 480p / 720p / 1080p), choix manuel de la qualité, vitesse de lecture (0,75× à 2×), sous-titres, mode plein écran, reprise automatique à la dernière position.
  - **Mode économie de données** : qualité basse par défaut, option audio uniquement.
  - Sommaire latéral des modules/leçons avec cases de progression, leçon suivante automatique.
  - Onglets sous la vidéo : description, ressources téléchargeables (PDF, templates, fichiers), **notes personnelles**, **questions/commentaires** par leçon (Roger peut répondre), quiz.
  - Bouton « Marquer comme terminée », barre de progression globale, confettis à 100 %.
  - **Watermark dynamique** sur la vidéo (nom/e-mail/téléphone de l'acheteur) pour dissuader le piratage.
- **Téléchargement pour visionnage hors ligne sur téléphone** (exigence importante) :
  - **Option A (recommandée, sécurisée)** : via la **PWA installée**, bouton « Télécharger pour regarder hors ligne » sur chaque leçon/module ; la vidéo est stockée dans le stockage de l'application (IndexedDB / Cache API), chiffrée, lisible uniquement dans l'application, avec gestion de l'espace utilisé et suppression des téléchargements. Expiration et revalidation périodique de la licence (ex. reconnexion obligatoire tous les 30 jours).
  - **Option B (paramétrable par formation dans l'admin)** : téléchargement direct du fichier MP4 en qualité compressée via **URL signée à durée limitée**, avec watermark incrusté et **limite du nombre de téléchargements** par utilisateur.
  - Ressources PDF téléchargeables avec watermark au nom de l'acheteur.
- **Sécurité de l'accès** : contenu accessible uniquement aux acheteurs, URLs signées expirantes, limitation du nombre d'appareils/sessions simultanées par compte (ex. 2 appareils), détection de partage de compte.
- **Certificats** : génération automatique d'un certificat PDF (design rouge/noir, nom de l'apprenant, formation, date, signature de Roger, **QR code** et code unique vérifiable sur `/certificat/[code]`) quand la formation est terminée (+ quiz final réussi si activé). Partageable sur LinkedIn.
- **Mes achats / factures** : historique, reçus PDF téléchargeables.
- **Profil** : photo, nom, téléphone, pays, ville, mot de passe, préférences de notification, appareils connectés.

### 5.5 Accompagnement / Coaching

- Présentation des formules, par exemple (à paramétrer dans l'admin) :
  - **Session stratégique individuelle** (1 h, visio) — `[PRIX À COMPLÉTER]` FCFA
  - **Accompagnement mensuel** (4 sessions + support WhatsApp) — `[PRIX À COMPLÉTER]` FCFA
  - **Mentorat VIP / Done-with-you** (sur candidature) — `[PRIX À COMPLÉTER]` FCFA
  - **Formation en entreprise / conférences** (sur devis)
- Tableau comparatif des formules, témoignages de clients accompagnés, FAQ.
- **Prise de rendez-vous** intégrée (Cal.com ou Calendly, fuseau `Africa/Douala`), paiement avant confirmation.
- **Formulaire de candidature** pour les offres premium (objectifs, activité, budget), notifié à Roger par e-mail et WhatsApp.
- Espace « Mes rendez-vous » dans l'espace membre (lien visio Google Meet/Zoom, rappels automatiques).

### 5.6 Communauté

- **Communauté gratuite** : accès aux astuces, posts et lives ; liens vers la chaîne WhatsApp, le groupe Telegram et/ou la page Facebook `[À COMPLÉTER]`.
- **Communauté privée intégrée à la plateforme** (pour les membres/acheteurs, et option **abonnement VIP mensuel** payant) :
  - Fil d'actualité avec publications de Roger (astuces IA, marketing, opportunités), épinglées en haut.
  - Espaces/catégories : Annonces, Astuces IA, Marketing Digital, Questions-Réponses, Victoires des membres, Opportunités.
  - Publications des membres avec texte, images, liens ; commentaires, réactions, mentions.
  - **Lives et replays** (lien YouTube/Zoom + replay intégré), calendrier des événements.
  - Profils des membres, badges (Nouveau, Actif, Top contributeur, Certifié), classement/gamification par points.
  - Modération : signalement, suppression, bannissement depuis l'admin.
  - Notifications (in-app, e-mail, push PWA).
- Possibilité de restreindre certains espaces aux acheteurs d'une formation précise ou aux abonnés VIP.

### 5.7 Réalisations & Témoignages

- **Témoignages** : texte, vidéo, captures d'écran ; nom, photo, ville/pays, formation suivie, résultat obtenu ; filtrables par formation.
- **Réalisations / études de cas** : projets de Roger et de ses élèves (sites, campagnes, chiffres, avant/après) en galerie animée avec page détaillée.
- **Mur d'amour** (wall of love) en grille masonry.
- Formulaire permettant aux élèves de **soumettre un témoignage** (validé par l'admin avant publication).
- Ajout de données structurées (Schema.org Review / AggregateRating) pour le SEO.

### 5.8 À propos

Histoire de Roger, parcours, mission (« démocratiser l'IA et le marketing digital en Afrique »), valeurs, chiffres, apparitions médias, photos, frise chronologique animée, CTA.

### 5.9 Blog & ressources gratuites

Articles (catégories, tags, temps de lecture, partage social, articles liés, CTA vers formations), lead magnets téléchargeables contre e-mail + WhatsApp, optimisation SEO (sitemap, métadonnées, Open Graph, données structurées Article).

### 5.10 Affiliation / Parrainage

- Chaque membre peut devenir affilié : lien unique, cookie de suivi (30 jours paramétrable), commission en % paramétrable par formation.
- Tableau de bord affilié : clics, ventes, commissions, retraits.
- Demande de retrait par **Mobile Money** (Orange Money / MTN MoMo) validée manuellement par l'admin.

### 5.11 Contact

Formulaire (nom, e-mail, WhatsApp, objet, message) + anti-spam (Cloudflare Turnstile), boutons WhatsApp / e-mail / appel, localisation Douala, horaires, liens réseaux sociaux.

---

## 6. PAIEMENTS — CHARIOW + MOBILE MONEY AFRICAIN

### 6.1 Intégration Chariow (prioritaire)

- Intégrer **Chariow** comme moyen de paiement principal. **Avant de coder, consulte la documentation officielle de l'API Chariow** (endpoints, authentification, création de paiement/checkout, webhooks, statuts, environnement de test) et implémente exactement selon cette documentation. Si un point de l'API est ambigu, signale-le-moi plutôt que de l'inventer.
- Moyens de paiement à exposer selon ce que Chariow supporte : **Orange Money, MTN Mobile Money**, autres mobile money d'Afrique de l'Ouest et Centrale (Wave, Moov Money, Airtel Money…), **cartes Visa/Mastercard**.
- Clés API stockées uniquement dans les **variables d'environnement** (`CHARIOW_API_KEY`, `CHARIOW_WEBHOOK_SECRET`, etc.), jamais dans le code ni côté client.
- Flux complet :
  1. L'utilisateur clique « Acheter » → création d'une **commande** en base (statut `PENDING`) → appel API Chariow côté serveur pour initier le paiement → redirection vers la page de paiement / affichage de l'instruction Mobile Money (validation sur le téléphone).
  2. Page « Paiement en attente » avec vérification automatique du statut (polling) et message clair (« Valide le paiement sur ton téléphone en composant… »).
  3. **Webhook** Chariow → vérification de la signature → mise à jour de la commande (`PAID` / `FAILED` / `CANCELLED`) → **accès accordé automatiquement** à la formation.
  4. Idempotence : un même webhook reçu plusieurs fois ne crée jamais de double accès ni de double commission.
  5. Envoi automatique de l'e-mail de confirmation + reçu PDF + message WhatsApp de bienvenue (si intégration WhatsApp activée).
- Création automatique d'un compte à l'achat si l'acheteur n'en a pas (e-mail + lien magique pour définir son mot de passe).

### 6.2 Architecture multi-fournisseurs

- Crée une **couche d'abstraction** `PaymentProvider` (interface commune : `createPayment`, `verifyPayment`, `handleWebhook`, `refund`) afin de pouvoir ajouter ou basculer facilement vers d'autres agrégateurs africains en secours : **NotchPay** et **Campay** (camerounais), **CinetPay**, **Flutterwave**, et **Stripe/PayPal** pour la diaspora.
- Activation/désactivation de chaque fournisseur depuis l'admin.

### 6.3 Fonctionnalités commerciales

- Prix en **FCFA (XAF)**, affichage formaté (`25 000 FCFA`), conversion indicative EUR/USD.
- **Codes promo** (pourcentage ou montant fixe, date d'expiration, nombre d'utilisations max, limité à certaines formations).
- **Paiement en plusieurs fois** (accès progressif ou complet selon paramètre, relances automatiques des échéances).
- **Bundles**, **order bump** au checkout (ex. « Ajoute le pack de 100 prompts pour 5 000 FCFA »), **upsell** après achat.
- **Relance de panier abandonné** (e-mail + WhatsApp) après 1 h et 24 h.
- **Paiement manuel de secours** : l'utilisateur peut payer via WhatsApp/transfert Mobile Money ; l'admin valide manuellement la commande pour débloquer l'accès.
- Factures/reçus PDF numérotés automatiquement.
- Remboursements gérés depuis l'admin (révocation de l'accès).

---

## 7. AUTOMATISATIONS, E-MAILS & NOTIFICATIONS

- E-mails (templates React Email aux couleurs de la marque) : bienvenue, confirmation d'achat, accès à la formation, reçu, paiement échoué, relance panier, rappel de rendez-vous, nouvelle leçon publiée, certificat obtenu, réinitialisation de mot de passe, newsletter.
- **WhatsApp** : boutons de contact avec messages pré-remplis partout ; architecture prête pour l'**API WhatsApp Business (Cloud API)** pour les notifications automatiques (confirmation d'achat, rappels).
- **Notifications push** via la PWA.
- **Newsletter** : collecte des e-mails et numéros WhatsApp, export CSV, intégration prévue avec Brevo / Systeme.io / MailerLite.
- **Webhooks sortants** optionnels (Make / Zapier) à chaque vente pour brancher d'autres outils.

---

## 8. TABLEAU DE BORD ADMINISTRATEUR (`/admin`)

Interface simple et intuitive pour que Roger puisse **ajouter des formations en continu sans toucher au code** :

- **Vue d'ensemble** : chiffre d'affaires (jour / semaine / mois), nombre de ventes, nouveaux inscrits, taux de conversion, formations les plus vendues, graphiques animés, dernières commandes.
- **Formations** : créer / modifier / dupliquer / archiver ; constructeur de programme par **glisser-déposer** (modules et leçons) ; **upload vidéo direct** vers Bunny Stream avec barre de progression ; ajout de PDF, fichiers, quiz ; éditeur riche pour la description ; gestion des bonus, FAQ, prérequis ; prévisualisation de la page de vente avant publication ; options drip, téléchargement autorisé ou non, certificat.
- **Produits digitaux simples** (e-books, packs de prompts, templates) vendus en téléchargement direct, en plus des formations.
- **Commandes** : liste filtrable, détails, statut, validation manuelle d'un paiement Mobile Money, remboursement, export CSV/Excel.
- **Clients / apprenants** : fiches, formations, progression, historique, accorder/retirer un accès manuellement, envoyer un message.
- **Codes promo, bundles, upsells.**
- **Témoignages & réalisations** : ajout, modération des soumissions, mise en avant.
- **Blog** : éditeur d'articles, catégories, SEO.
- **Communauté** : publications, épinglage, modération, gestion des espaces.
- **Accompagnement** : formules, candidatures reçues, rendez-vous.
- **Affiliés** : commissions, demandes de retrait, validation des paiements.
- **Contenu du site** : textes de la page d'accueil, barre d'annonce, FAQ, chiffres clés, liens réseaux sociaux, numéro WhatsApp — **modifiables sans code**.
- **Paramètres** : fournisseurs de paiement, devises, e-mails, pixels de tracking, politique de remboursement.
- **Rôles** : Super-admin (Roger), Admin, Support, Modérateur communauté.
- **Journal d'activité** (audit log) des actions sensibles.

---

## 9. MODÈLE DE DONNÉES (indicatif)

Concevoir le schéma relationnel incluant au minimum : `User`, `Profile`, `Role`, `Session/Device`, `Course`, `Category`, `Module`, `Lesson`, `Resource`, `Quiz`, `Question`, `Enrollment`, `LessonProgress`, `Note`, `LessonComment`, `Certificate`, `Product` (produits digitaux), `Bundle`, `Order`, `OrderItem`, `Payment`, `PaymentProvider`, `Installment`, `Coupon`, `Refund`, `Invoice`, `Review`, `Testimonial`, `Showcase` (réalisations), `BlogPost`, `LeadMagnet`, `Subscriber`, `CoachingOffer`, `CoachingApplication`, `Booking`, `CommunitySpace`, `CommunityPost`, `CommunityComment`, `Reaction`, `Membership` (abonnement VIP), `Affiliate`, `Referral`, `Commission`, `Payout`, `Notification`, `SiteSetting`, `AuditLog`, `WebhookEvent` (pour l'idempotence).

Fournis les migrations et un **script de seed** avec des données de démonstration réalistes (3 formations exemples : « IA pour entrepreneurs africains », « Marketing digital & Facebook Ads », « Vendre en ligne avec ChatGPT et Canva », témoignages fictifs clairement marqués comme exemples à remplacer).

---

## 10. SÉCURITÉ & CONFORMITÉ

- Validation de toutes les entrées côté serveur (Zod), protection CSRF/XSS, en-têtes de sécurité (CSP, HSTS), limitation de débit (rate limiting) sur l'authentification, le paiement et le contact.
- Vérification de signature de **tous** les webhooks de paiement.
- Mots de passe hachés (Argon2/bcrypt), sessions sécurisées, 2FA optionnelle pour l'admin.
- Contenu payant protégé par contrôle d'accès côté serveur + URLs signées expirantes.
- Sauvegardes automatiques de la base de données.
- Conformité à la **réglementation camerounaise sur la protection des données personnelles** et bonnes pratiques RGPD (diaspora) : consentement cookies, politique de confidentialité, droit d'accès/suppression des données, export des données.
- Pages légales rédigées en français (modèles à faire relire), mentionnant l'éditeur : Roger BOUJIEKA, Douala, Cameroun, `[NIU / RCCM À COMPLÉTER]`.

---

## 11. PERFORMANCE, SEO & MOBILE

- **Mobile-first** absolu ; tests sur petits écrans (360 px).
- Objectif **Lighthouse ≥ 90** (Performance, Accessibilité, SEO, Bonnes pratiques) sur mobile.
- Images optimisées (`next/image`, AVIF/WebP, lazy loading), polices auto-hébergées, code splitting, pas de bibliothèques lourdes inutiles, rendu serveur/statique pour les pages publiques.
- Fonctionne correctement en **3G** : chargement progressif, skeletons, mode économie de données.
- SEO : métadonnées dynamiques par page, Open Graph & Twitter Cards (belle image de partage générée dynamiquement pour chaque formation — important pour le partage sur WhatsApp et Facebook), `sitemap.xml`, `robots.txt`, URLs propres, données structurées (Course, Product, Review, FAQ, Organization, Person, Article), SEO local (Douala, Cameroun, Afrique francophone).

---

## 12. INFORMATIONS À INTÉGRER (placeholders)

- Nom : **Roger BOUJIEKA**
- Ville : **Douala, Cameroun**
- Téléphone / WhatsApp : `[À COMPLÉTER — format +237 6XX XX XX XX]`
- E-mail professionnel : `[À COMPLÉTER]`
- Nom de domaine : `[À COMPLÉTER — ex. rogerboujieka.com]`
- Réseaux sociaux : Facebook `[À COMPLÉTER]`, Instagram `[À COMPLÉTER]`, TikTok `[À COMPLÉTER]`, YouTube `[À COMPLÉTER]`, LinkedIn `[À COMPLÉTER]`, chaîne WhatsApp / Telegram `[À COMPLÉTER]`
- Photos professionnelles de Roger, logo, vidéos de présentation : `[À FOURNIR]` (utiliser des placeholders élégants en attendant)
- Liste des formations, prix et contenus : `[À COMPLÉTER]`

Centralise toutes ces informations dans un fichier de configuration unique (`config/site.ts`) et/ou dans les paramètres de l'admin pour pouvoir les modifier facilement.

---

## 13. PLAN DE DÉVELOPPEMENT PAR PHASES

**Phase 1 — MVP de lancement (priorité absolue, à livrer en premier) :**
- Design system rouge/noir, layout, navigation, footer, bouton WhatsApp flottant.
- Accueil complet animé, catalogue, page de vente dynamique, à propos, contact, FAQ, pages légales.
- Authentification + espace membre + lecteur de cours (streaming Bunny, progression).
- Paiement **Chariow** (Mobile Money + carte) avec webhook et accès automatique + paiement manuel de secours.
- Admin : création de formations (modules, leçons, upload vidéo), commandes, clients, codes promo, témoignages.
- E-mails transactionnels essentiels, SEO de base, Meta Pixel, déploiement en production.

**Phase 2 :**
- PWA installable + téléchargement hors ligne sécurisé, certificats, quiz, avis, réalisations, blog, lead magnets, relance panier, paiement en plusieurs fois, bundles/upsells.

**Phase 3 :**
- Communauté intégrée complète, abonnement VIP, accompagnement avec réservation et paiement, affiliation avec retraits Mobile Money, notifications push, API WhatsApp Business, version anglaise, fournisseurs de paiement additionnels.

---

## 14. LIVRABLES ATTENDUS

1. Code source complet, organisé, typé et documenté dans ce dépôt.
2. `README.md` en français expliquant : installation, variables d'environnement (`.env.example` complet), lancement en local, migrations/seed, déploiement sur Vercel, configuration de Chariow, Bunny Stream, Resend et du domaine.
3. **Guide d'utilisation de l'admin** en français pour Roger (`docs/GUIDE_ADMIN.md`) : comment ajouter une formation, uploader des vidéos, créer un code promo, valider un paiement manuel, publier un témoignage, etc.
4. Tests des parcours critiques (inscription → achat → accès au cours).
5. Checklist de mise en production (domaine, HTTPS, clés de paiement en mode live, webhooks, sauvegardes, pixels).

---

## 15. MÉTHODE DE TRAVAIL

- Commence par me présenter : l'architecture, l'arborescence des dossiers, le schéma de base de données et le plan de la Phase 1. Puis développe.
- Avance par étapes, commite régulièrement avec des messages clairs.
- Pose-moi des questions uniquement quand une information est vraiment indispensable (ex. détails de l'API Chariow, prix) ; sinon, fais des choix professionnels raisonnables et signale-les.
- Chaque composant doit être réutilisable, responsive et animé avec soin.
- À la fin de chaque phase, donne-moi un récapitulatif de ce qui est fait, de ce qui reste et de ce que je dois configurer moi-même (comptes, clés API, contenus).

**Objectif final :** une plateforme e-learning premium, rapide, sécurisée et rentable, digne des meilleures plateformes internationales, mais pensée pour l'Afrique et le Cameroun — qui donne envie d'acheter dès la première visite et permet à Roger BOUJIEKA de publier et vendre de nouvelles formations en toute autonomie.
