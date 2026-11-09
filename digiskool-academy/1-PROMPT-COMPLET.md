# DigiSkool Academy — Cahier des charges complet

## 1. Ton rôle

Tu es un développeur full-stack senior, un designer UI/UX et un expert e-commerce spécialisé dans la vente de produits digitaux (e-books, vidéos, formations en ligne) sur les marchés africains, francophones et anglophones.

Tu écris du code propre, typé, sécurisé et prêt pour la production. Tu avances par phases, tu expliques brièvement ce que tu fais, et tu ne casses jamais ce qui fonctionne déjà. Chaque détail compte : ce site doit avoir le niveau des meilleures plateformes professionnelles.

## 2. Contexte et vision

- **Nom :** DigiSkool Academy
- **Propriétaire :** Roger BOUJIEKA, vendeur de produits digitaux depuis 2 ans.
- **Type :** plateforme **personnelle**, avec **un seul vendeur** (moi). Ce n'est **pas** une marketplace : personne d'autre ne peut vendre. Il y a un administrateur (moi), éventuellement des membres de mon équipe support, et des clients.
- **Produits (par ordre de priorité) :**
  1. **E-books** rédigés et hébergés directement sur la plateforme (lecture en ligne + téléchargement PDF)
  2. **Formations vidéo** (modules + leçons)
  3. **Vidéos** à l'unité (masterclass, tutoriels)
  4. Templates et packs (plusieurs produits vendus ensemble)
- **Marchés :** Afrique francophone, Afrique anglophone, Europe et reste du monde. Les clients achètent surtout **depuis un téléphone**, parfois avec une connexion lente.
- **Langues :** **français et anglais**, partout : interface, produits, emails, factures, assistant IA.
- **Chaque produit existe en deux versions : française et anglaise.** Un client qui achète un produit reçoit automatiquement **les deux versions**.

### Objectifs business (dans cet ordre)

1. Lancer une plateforme de vente **professionnelle**, avec les **moyens de paiement locaux africains**.
2. Faire grandir une **grande communauté WhatsApp** : la plateforme y renvoie partout.
3. Faire **des promotions en permanence** sur tous les produits (réductions de 40 %, 45 %…, codes promo diffusés partout), clairement affichées sur le site avec des étiquettes professionnelles.
4. Servir les **anglophones et les francophones** avec une plateforme 100 % bilingue.
5. Produire les produits **avec l'IA** : je donne les informations et la stratégie, l'IA crée l'e-book (nombre de pages demandé), sa version anglaise, sa couverture et sa page de vente complète.

## 3. Règles non négociables

1. **Bilingue partout.** Aucun texte écrit en dur dans le code : tout passe par les fichiers de traduction ou par les champs FR/EN de la base de données.
2. **Mobile-first.** Chaque écran est d'abord pensé pour un téléphone.
3. **Vente automatique 24 h/24.** Le client paie → il a immédiatement accès à ses produits, dans les deux langues, sans intervention manuelle.
4. **Promotions visibles et crédibles.** Les réductions s'affichent partout (étiquettes, bannière, compte à rebours), mais elles sont **réelles** : le prix barré est le vrai prix normal, et le compte à rebours affiche la vraie date de fin de l'offre (jamais de minuteur qui se relance tout seul). C'est une question de confiance, et c'est obligatoire pour les visiteurs européens.
5. **Sécurité.** Prix toujours recalculés côté serveur, fichiers privés, clés secrètes jamais exposées au navigateur.
6. **Performance.** Score Lighthouse mobile ≥ 90 sur les pages publiques.

## 4. Stack technique

- **Next.js** (App Router, dernière version stable) + **TypeScript** strict
- **Tailwind CSS** + **shadcn/ui**, icônes **lucide-react**, animations **Framer Motion** (légères)
- **next-intl** pour le bilingue (routes `/fr` et `/en`, chemins traduits)
- **Supabase** : Postgres, Auth (email + mot de passe, lien magique, Google), Storage (bucket **public** pour les images, buckets **privés** pour les PDF et fichiers vendus), Row Level Security sur **toutes** les tables, Supabase Vault pour les jetons secrets saisis dans l'admin
- **Paiement :** plusieurs fournisseurs derrière une couche `PaymentProvider` (voir section 6)
- **Vidéo :** Bunny Stream (lecture protégée par jetons signés, sous-titres, téléchargement MP4 activable)
- **Tâches longues (génération IA, PDF) :** Inngest ou Trigger.dev (file d'attente, reprise en cas d'échec, suivi de progression)
- **IA :** API Claude d'Anthropic via le SDK officiel `@anthropic-ai/sdk`, côté serveur uniquement
- **PDF :** `@react-pdf/renderer` pour générer les e-books mis en page, `pdf-lib` pour le filigrane personnalisé au téléchargement
- **Images générées (couvertures, visuels promo) :** `@vercel/og` (Satori)
- **Emails :** Resend + React Email
- **Éditeur riche (admin) :** Tiptap — **Validation :** Zod — **Formulaires :** React Hook Form
- **Limitation de requêtes :** Upstash Redis
- **Hébergement :** Vercel (plan Pro, usage commercial), domaine [DOMAINE]

> Si l'outil impose une autre stack (ex. Lovable : React + Vite + Supabase), garde exactement la même architecture fonctionnelle et place toute la logique sensible (paiement, webhooks, téléchargements, IA, pixels côté serveur) dans des **Supabase Edge Functions**.

## 5. Plateforme bilingue FR / EN

### 5.1 Détection automatique de la langue

- À la **première visite**, la langue est choisie automatiquement selon la **langue du téléphone ou du navigateur** (en-tête `Accept-Language`) :
  - téléphone en français → site en **français** ;
  - téléphone en anglais → site en **anglais** ;
  - toute autre langue → site en **[LANGUE_PAR_DEFAUT]** (anglais conseillé pour l'international ; réglable dans l'admin).
- Le middleware redirige `/` vers `/fr` ou `/en` selon cette règle.
- **Liens partagés sans langue** (ex. `[DOMAINE]/p/ebook-vente`, utilisés dans la communauté WhatsApp) : redirection automatique vers la bonne langue selon le téléphone du visiteur.
- Si un visiteur ouvre un lien dans une langue différente de celle de son téléphone, on respecte le lien, mais on affiche un petit bandeau discret : « This page is also available in English → Switch » (une seule fois).

### 5.2 Bouton de langue

- Bouton **FR | EN** toujours visible en haut (header), aussi dans le menu mobile et le footer.
- Un clic bascule **sur la même page** dans l'autre langue (même produit, même étape) et mémorise le choix dans un cookie pendant 1 an. Ce choix manuel a toujours priorité sur la détection automatique.
- La langue préférée est aussi enregistrée dans le profil du client connecté.

### 5.3 URLs traduites

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
| `/fr/panier` | `/en/cart` |
| `/fr/paiement` | `/en/checkout` |
| `/fr/compte` | `/en/account` |

Le back-office `/admin` est en français uniquement.

### 5.4 Ce qui est traduit

- Toute l'interface (fichiers `messages/fr.json` et `messages/en.json`).
- Tous les contenus de la base : produits, chapitres d'e-book, leçons, catégories, FAQ, bannières, popups, étiquettes promo, pages légales.
- Emails, reçus PDF, certificats, notifications : envoyés dans la langue du client.
- Assistant IA : répond dans la langue du visiteur.
- Formats localisés : dates, nombres et prix (`Intl.NumberFormat`), ex. « 15 000 FCFA » en français, « 15,000 FCFA » en anglais.
- SEO : balises `hreflang`, `canonical`, sitemap avec les deux langues.

### 5.5 Règle de publication

Un produit ne peut pas être publié tant que sa version française **et** sa version anglaise ne sont pas complètes (titre, description, contenu, couverture). L'admin voit clairement ce qui manque.

## 6. Pays, devises et paiements locaux

### 6.1 Pays et devise

- Le pays du visiteur est détecté (en-tête `x-vercel-ip-country`) pour proposer automatiquement la bonne devise et les bons moyens de paiement. Le visiteur peut changer de devise (sélecteur dans le header ou le footer).
- Devises prévues : **XAF, XOF** (FCFA), **NGN, GHS, KES**, **USD, EUR**, extensible.
- Prix de base fixé par produit dans [DEVISE_DE_BASE]. Pour les autres devises : soit un prix fixé à la main par l'admin, soit une conversion automatique avec un **taux modifiable dans l'admin** et des **règles d'arrondi** par devise (ex. FCFA → arrondi à la centaine, « 4 900 » ; USD/EUR → « 9,99 »).

### 6.2 Moyens de paiement

- **Afrique francophone :** MTN Mobile Money, Orange Money, Moov Money, Wave, Airtel Money, carte bancaire.
- **Afrique anglophone :** carte, Mobile Money (MTN MoMo, M-Pesa…), virement, USSD.
- **International :** carte bancaire (Visa, Mastercard).
- Fournisseurs : **[FOURNISSEUR_PRINCIPAL]** et **[FOURNISSEUR_SECONDAIRE]** (exemples : CinetPay, NotchPay, FedaPay, Fapshi pour l'Afrique francophone ; Paystack, Flutterwave pour l'Afrique anglophone et les cartes).
- **Routage par pays :** l'admin choisit quel fournisseur et quels moyens de paiement s'affichent pour chaque pays, et dans quel ordre.
- Le checkout affiche les **logos des moyens de paiement du pays** du visiteur (inspire confiance).
- **Paiement manuel (option activable) :** le client envoie l'argent par Mobile Money au numéro indiqué, saisit la référence de transaction ; la commande passe en « en attente de validation » et l'admin la valide en un clic, ce qui déclenche la livraison.

### 6.3 Déroulé sécurisé d'un paiement

1. Le serveur crée la commande `pending` en **recalculant les prix depuis la base** (promo et code promo appliqués côté serveur). On ne fait jamais confiance aux prix envoyés par le navigateur.
2. Le client est redirigé vers le fournisseur (ou reçoit la demande de validation Mobile Money sur son téléphone).
3. Le **webhook** du fournisseur arrive → vérification de la signature → re-vérification du statut via l'API du fournisseur → contrôle du **montant et de la devise** → commande `paid` → création des **droits d'accès** → email de livraison → événement `Purchase` envoyé aux pixels (section 19) → notification de vente à l'admin.
4. Traitement **idempotent** : un webhook reçu deux fois ne crée ni deux accès ni deux emails (table `webhook_events`).
5. **Rattrapage automatique** (Vercel Cron, toutes les 10 min) : vérification des commandes `pending` de moins de 24 h auprès du fournisseur.
6. Toutes les clés en variables d'environnement ; mode test et mode réel séparés.

## 7. Identité visuelle DigiSkool Academy

- **Positionnement :** académie digitale africaine, moderne, premium, ambitieuse. Le site doit inspirer **confiance et sérieux**, tout en donnant envie d'acheter maintenant.
- **Logo provisoire :** « Digi**Skool** » en gras + « ACADEMY » en petites capitales espacées, avec une icône de chapeau de diplômé stylisé intégrant un élément digital (pixel ou curseur).
- **Couleurs** (variables CSS, modifiables dans l'admin) :
  - Primaire : bleu nuit `#0B1F3A`
  - Accent : or `#F5B700`
  - Promotion : rouge corail `#E11D48` (étiquettes de réduction, comptes à rebours)
  - Succès : `#16A34A` — Fond : `#F8FAFC` — Texte : `#0F172A`
- **Typographies :** Poppins (titres), Inter (texte).
- Mode clair par défaut + mode sombre.
- Coins arrondis (`rounded-2xl`), ombres douces, beaucoup d'espace, photos et mockups de qualité.
- **Éléments professionnels :** badges de confiance (paiement sécurisé, accès immédiat, accès à vie, support WhatsApp), logos des moyens de paiement, avis clients, nombre d'apprenants, garantie.
- **Accessibilité :** contraste AA, navigation clavier, textes alternatifs, popups accessibles (touche Échap, focus).

## 8. Couvertures automatiques (miniatures au même design)

Toutes les miniatures de la boutique suivent **le même modèle de design**, seule la **couleur** change selon le produit. Le client reconnaît la « collection DigiSkool » au premier coup d'œil.

- **Modèle unique :**
  - fond dans la couleur du produit, avec un dégradé et un motif géométrique discret identique sur toutes les couvertures ;
  - en haut : logo DigiSkool Academy + étiquette du type (« E-BOOK », « FORMATION VIDÉO », « VIDÉO » / « VIDEO COURSE »…) ;
  - au centre : titre en grand (Poppins, blanc, gras), sous-titre ;
  - en bas : icône ou illustration du thème, badge de langue **FR** / **EN**, « Roger BOUJIEKA ».
- **Palette de 12 couleurs professionnelles** au choix pour chaque produit : indigo `#4338CA`, émeraude `#059669`, cramoisi `#BE123C`, ambre `#D97706`, sarcelle `#0D9488`, violet `#7C3AED`, bleu ciel `#0284C7`, orange `#EA580C`, rose `#DB2777`, ardoise `#334155`, vert lime `#65A30D`, bleu marine `#1E3A8A`. Couleur proposée automatiquement (différente des derniers produits publiés), modifiable.
- **Générée automatiquement** dans les deux langues (titre FR sur la couverture FR, titre EN sur la couverture EN), et régénérée quand le titre ou la couleur change.
- **Formats générés :** carte boutique (3:4), carré 1:1 (réseaux sociaux), 16:9 (vidéos), 9:16 (statut WhatsApp, TikTok, stories), image de partage Open Graph 1200 × 630. Tous téléchargeables depuis l'admin pour mes publicités.
- **Effet livre 3D** (CSS) pour les e-books sur la page produit.
- Les étiquettes de promotion (« -45 % ») ne sont **pas** incrustées dans l'image : elles sont affichées par le site par-dessus, pour pouvoir changer à chaque promo.

## 9. Pages publiques

### 9.1 Header (sur toutes les pages)

- Barre de promotion en haut quand une promo est active (section 10.4).
- Logo, menu (E-books, Formations, Vidéos, Promotions, Nouveautés, À propos), recherche, sélecteur **FR | EN**, sélecteur de devise, panier, « Connexion » / « Mon espace ».
- **Bouton « Rejoindre la communauté »** bien visible (icône WhatsApp, couleur verte), section 12.

### 9.2 Accueil

- **Hero** : titre fort, sous-titre, boutons « Voir les formations » et « Rejoindre la communauté », mockup de produits.
- Bandeau de confiance (apprenants, paiement local sécurisé, accès immédiat, FR + EN inclus).
- **Offres du moment** (produits en promotion, avec comptes à rebours).
- **Nouveautés**, **meilleures ventes**, e-books, formations vidéo.
- « Chaque produit en français ET en anglais » : bloc qui explique ce bonus unique.
- « Qui suis-je » : photo et parcours de Roger.
- Témoignages (vrais avis approuvés).
- Section communauté WhatsApp (avantages + bouton).
- Lead magnet : e-book gratuit « [LEAD_MAGNET] » contre email (+ numéro WhatsApp facultatif avec consentement).
- FAQ, footer complet (liens, réseaux [RÉSEAUX], pages légales, logos de paiement, newsletter).

### 9.3 Boutique, catégories, Promotions, Nouveautés

- Grille de cartes produit : couverture, type, titre, note, prix, **prix barré**, **étiquettes** (« -45 % », « Offre 24 h », « Nouveau », « Best-seller »), mini compte à rebours si l'offre se termine dans moins de 48 h.
- Filtres (type, catégorie, prix, en promotion), tri (populaires, récents, prix, plus grosse réduction), recherche instantanée.
- Page **Promotions** : tous les produits en réduction, triés par réduction.
- Page **Nouveautés** : derniers produits publiés.

### 9.4 Page produit

- Galerie (couverture, effet livre 3D pour les e-books, aperçus des pages ou extrait vidéo).
- Titre, sous-titre, note, nombre d'apprenants.
- **Bloc prix** : prix promo en grand, prix barré, « Économisez 7 000 FCFA (-45 %) », compte à rebours réel, code promo à copier si l'offre en demande un.
- Mention « ✅ Version française + English version incluses ».
- Boutons « Acheter maintenant » (checkout direct) et « Ajouter au panier ». **Barre d'achat collante** sur mobile.
- Description, « Ce que vous allez apprendre », pour qui, format (nombre de pages, durée, nombre de leçons), lecture en ligne et/ou téléchargement.
- Programme détaillé (chapitres de l'e-book ou modules et leçons de la formation, avec leçons/chapitres gratuits en aperçu).
- Extrait gratuit contre email.
- Garantie / remboursement ([REMBOURSEMENT]), FAQ du produit, avis, produits liés, offre de pack.
- Bouton « Rejoindre la communauté pour recevoir les prochaines promos ».
- Partage (WhatsApp, Facebook, copier le lien court).
- SEO : métadonnées par langue, Open Graph, JSON-LD `Product` avec l'offre en cours.

### 9.5 Panier et checkout

- Panier conservé dans le navigateur, synchronisé si connecté.
- Code promo (appliqué automatiquement s'il vient d'un lien `?promo=CODE`).
- **Order bump** : case « Ajouter [produit complémentaire] pour X ».
- Achat **sans compte obligatoire** : nom, email, téléphone/WhatsApp, pays. Compte créé automatiquement + lien magique.
- Case facultative (non cochée par défaut) : « Recevoir les promos et nouveautés sur WhatsApp ».
- Moyens de paiement du pays, récapitulatif, case CGV.

### 9.6 Après le paiement

- `/paiement/succes` : statut vérifié **côté serveur**, produits débloqués avec boutons « Lire en ligne » / « Télécharger » en FR et EN, invitation à rejoindre la communauté, offre complémentaire (upsell).
- `/paiement/en-attente` (validation Mobile Money sur le téléphone, vérification automatique) et `/paiement/echec` (bouton « Réessayer »).

### 9.7 Autres pages

À propos, Contact (formulaire + WhatsApp support [WHATSAPP_SUPPORT] + email [EMAIL_CONTACT]), FAQ, page Communauté, Blog (phase 2), pages légales (Mentions légales, CGV, Confidentialité, Remboursement, Cookies), page 404 personnalisée.

## 10. Moteur de promotions

Objectif : pouvoir lancer **en 2 clics** une promotion sur tout ou partie du catalogue, et qu'elle s'affiche automatiquement partout sur le site.

### 10.1 Campagnes de promotion

Chaque campagne a :
- un nom interne (ex. « Flash 24 h formations ») ;
- une réduction : **pourcentage** (ex. 45 %) ou **montant fixe** ;
- une portée : **tous les produits**, un type (toutes les formations, tous les e-books), une catégorie, ou une liste de produits ;
- une date de début et de fin (**le compte à rebours affiché utilise cette date**) ;
- application **automatique** (aucun code nécessaire) **ou** via un code promo ;
- les textes en FR et EN : étiquette (ex. « -45 % », « OFFRE 24 H » / « 24H DEAL »), texte de la bannière, texte du popup ;
- le style de l'étiquette (rouge promo, or, noir « Black Friday »…) ;
- options d'affichage : bannière en haut, popup, compte à rebours, page Promotions ;
- une priorité (si deux campagnes touchent le même produit, la meilleure réduction s'applique ; pas de cumul sauf si l'admin l'autorise).

### 10.2 Modèles en un clic

Boutons de lancement rapide dans l'admin :
- « Flash 24 h : -45 % sur toutes les formations »
- « Week-end : -40 % sur tous les e-books »
- « Lancement d'un nouveau produit : -30 % pendant 48 h »
- « Promo générale : -40 % sur tout le site »

Chaque modèle est modifiable avant de lancer.

### 10.3 Promotions récurrentes automatiques

Règles programmées, ex. « chaque vendredi de 00 h à 23 h 59 : -45 % sur toutes les formations ». À chaque déclenchement, l'admin reçoit une notification avec le **message WhatsApp prêt à copier** (FR + EN).

### 10.4 Affichage sur le site

- **Barre en haut de page** (collante, fermable) : « 🔥 -45 % sur toutes les formations — se termine dans 12:04:55 — Code DIGI45 [Copier] ».
- **Étiquettes** sur les cartes produit et la page produit.
- **Prix barré** + économie en montant et en pourcentage.
- **Compte à rebours** réel (jours, heures, minutes, secondes).
- **Popup promo** (section 11).
- **Page Promotions** dédiée.

### 10.5 Codes promo « partout »

- Codes illimités, chacun avec : réduction (ou lié à une campagne), dates, nombre maximal d'utilisations, limite par client, produits concernés, **canal** (WhatsApp, TikTok, Facebook, Instagram, influenceur, email, flyer…) pour savoir d'où viennent les ventes.
- **Liens promo** qui appliquent le code automatiquement : `[DOMAINE]/p/ebook-vente?promo=WHATSAPP45` (code mémorisé 7 jours).
- **QR code** généré pour chaque code (flyers, affiches, statuts).
- **Générateur de message** : pour une campagne ou un code, l'IA rédige l'annonce pour la communauté WhatsApp en FR et en EN (avec lien court, code, date de fin), avec boutons « Copier FR », « Copier EN », « Partager sur WhatsApp ». Génère aussi le **visuel promo** (9:16 et 1:1) avec la couverture du produit et l'étiquette de réduction.
- Statistiques : ventes et chiffre d'affaires par code, par campagne, par canal.

### 10.6 Historique des prix

Chaque changement de prix est enregistré (`price_history`). Le prix barré affiché est toujours le prix normal réel ; l'historique permet d'afficher le prix de référence légal si nécessaire (règle européenne des 30 jours).

## 11. Popups, notifications et nouveautés

Popups **professionnels et discrets**, jamais envahissants :

- **Popup « Nouveauté »** : quand un produit est publié depuis moins de 7 jours (réglable), une carte élégante apparaît (en bas à gauche sur ordinateur, en bas de l'écran sur mobile) : couverture miniature, badge « Nouveau » / « New », titre, bouton « Découvrir ». Affichée une seule fois par produit et par visiteur.
- **Popup « Offre spéciale »** : quand une campagne est active, fenêtre centrée avec la réduction, le compte à rebours et le code à copier. Une fois par campagne et par visiteur ; sur ordinateur, peut aussi s'afficher quand la souris quitte la page.
- **Invitation à la communauté** : après la 2e page vue ou 40 secondes, si le visiteur n'a pas encore cliqué sur le bouton communauté. Au maximum une fois tous les 7 jours.
- **Notifications d'achats récents** (option activable) : « Un client du Cameroun vient d'acheter [produit] ». **Uniquement basées sur de vraies commandes**, jamais inventées, sans nom complet.
- **Règles communes :**
  - **un seul popup par session**, priorité : offre spéciale > nouveauté > communauté ;
  - jamais pendant le panier, le checkout ou dans l'espace client ;
  - délai réglable avant affichage, bouton fermer bien visible, choix mémorisé ;
  - aucun décalage de mise en page (pas de dégradation des performances) ;
  - tout est réglable dans l'admin (activer, délai, fréquence, pages concernées).

## 12. Communauté WhatsApp

- Liens configurables dans l'admin : **communauté FR** [LIEN_COMMUNAUTE_FR], **communauté EN** [LIEN_COMMUNAUTE_EN] (ou un seul lien), et en option une chaîne WhatsApp et un groupe Telegram. Le site affiche le lien qui correspond à la langue du visiteur.
- Bouton « Rejoindre la communauté » : dans le header, le menu mobile, l'accueil, les pages produit, la page de succès après paiement, l'espace client, les emails et le footer.
- Page `/communaute` : avantages (promos exclusives, nouveautés en avant-première, entraide, lives), bouton d'accès.
- Le **bouton support WhatsApp** (service client [WHATSAPP_SUPPORT]) est distinct du bouton communauté.
- Chaque clic sur « Rejoindre la communauté » est compté (statistique admin + événement `JoinCommunity` envoyé aux pixels).
- Les numéros WhatsApp collectés avec consentement (checkout, lead magnet) sont exportables en CSV pour mes listes de diffusion.

## 13. Produits bilingues et formats

### 13.1 Règle des deux versions

- Chaque produit a une **version française** et une **version anglaise** : titre, description, contenu, couverture, extrait.
- **Un achat = accès aux deux versions**, automatiquement. Dans la bibliothèque du client, chaque produit affiche « Version française » et « English version ».

### 13.2 E-books hébergés sur la plateforme

- Un e-book est un contenu structuré stocké dans la base : **chapitres → sections** (texte riche, titres, encadrés « À retenir », listes, tableaux, citations, images, exercices, checklists), en FR et en EN.
- Il est créé avec le **Studio IA** (section 16) ou écrit/importé dans l'éditeur de l'admin.
- À la publication, la plateforme génère automatiquement :
  - un **PDF professionnel** par langue : couverture, page de titre, sommaire cliquable, en-têtes et pieds de page aux couleurs DigiSkool, numéros de page, mise en page soignée ;
  - le nombre réel de pages (affiché sur la page produit) ;
  - l'extrait gratuit (premier chapitre, réglable) ;
  - EPUB (option, phase 2).
- Options par e-book (réglables par l'admin) : **lecture en ligne** activée/désactivée, **téléchargement** activé/désactivé.

### 13.3 Formations vidéo

- Modules → leçons. Chaque leçon peut avoir : une **vidéo FR** et/ou une **vidéo EN**, des **sous-titres FR et EN**, un texte, des pièces jointes (PDF, fichiers), un quiz (phase 2).
- Si une leçon n'a qu'une vidéo, les sous-titres de l'autre langue sont proposés (le Studio IA peut les traduire).
- **Téléchargement des vidéos activable ou désactivable** par formation et par leçon.
- Certificat de fin de formation en PDF, dans la langue choisie.

### 13.4 Vidéos à l'unité

Même logique qu'une leçon unique : lecteur en ligne, sous-titres FR/EN, téléchargement activable.

### 13.5 Templates et packs

- Templates : fichiers téléchargeables (une version par langue si nécessaire).
- Packs : regroupent plusieurs produits à prix réduit ; l'achat donne accès à chaque produit du pack.

## 14. Espace client

- **Tableau de bord** : « Reprendre ma lecture », « Reprendre ma formation », nouveautés, promo en cours, bouton communauté.
- **Ma bibliothèque** : chaque produit acheté, avec pour chaque langue les boutons **Lire / Regarder** et **Télécharger** (si activé).
- **Liseuse d'e-books** (`/compte/lire/[slug]`) :
  - sommaire, barre de progression, reprise automatique là où le lecteur s'était arrêté ;
  - **bascule FR ⇄ EN** en gardant le même chapitre ;
  - taille du texte, thème clair / sépia / sombre, mode plein écran ;
  - marque-pages (surlignage et notes en phase 2) ;
  - fluide sur téléphone, chargement chapitre par chapitre ;
  - filigrane discret avec le nom et l'email du lecteur.
- **Lecteur vidéo** (`/compte/formations/[slug]`) :
  - liste des modules et leçons, progression, « Marquer comme terminé », « Leçon suivante » ;
  - reprise à la seconde près, vitesse de lecture, qualité, sous-titres FR/EN, choix de la version FR/EN de la vidéo si elle existe ;
  - bouton de téléchargement seulement si l'admin l'a activé ;
  - filigrane dynamique discret (email de l'acheteur) sur la vidéo.
- **Mes commandes** : historique + reçu PDF (dans la langue du client).
- **Mes certificats**.
- **Profil** : nom, email, téléphone/WhatsApp, pays, langue préférée, devise, mot de passe, préférences de notifications.

## 15. Livraison sécurisée et anti-piratage

- PDF et fichiers dans des buckets **privés**, jamais d'URL publique permanente.
- Téléchargement via une route serveur qui vérifie la connexion + le droit d'accès + que le téléchargement est activé pour ce produit + la limite de téléchargements (réglable, ex. 10 par produit et par langue), puis génère une **URL signée valable 60 secondes** et enregistre le téléchargement.
- **Filigrane PDF** personnalisé au téléchargement (nom + email de l'acheteur sur chaque page) avec `pdf-lib`, à partir du PDF de base généré à la publication.
- Le contenu des e-books n'est envoyé au navigateur qu'aux clients qui y ont droit (jamais dans le HTML public).
- Vidéos Bunny Stream protégées par jetons signés, domaine autorisé uniquement.
- Email de livraison immédiat, dans la langue du client, avec les liens vers les deux versions.

## 16. Studio IA (création automatique des produits)

Le cœur de la production : je donne les informations et la stratégie, l'IA fabrique le produit complet. Je garde toujours la main pour relire et valider avant publication.

### 16.1 Création d'un e-book

1. **Brief** (formulaire) :
   - sujet, public cible, problème résolu, promesse ;
   - **nombre de pages souhaité** ;
   - niveau (débutant, intermédiaire, avancé), ton (motivant, expert, pédagogique…) ;
   - **stratégie** : produit d'appel, produit principal, produit premium, lead magnet gratuit…, et prix visé ;
   - langue de rédaction principale (FR ou EN) ;
   - informations, notes, plan ou documents à utiliser (texte collé ou fichiers .pdf, .docx, .md, .txt) ;
   - exemples et contexte à privilégier (ex. Afrique, Mobile Money, réalités locales).
2. **Plan** : l'IA propose 3 titres, puis un plan détaillé (chapitres, sections, nombre de pages par chapitre). Je modifie et je valide.
3. **Rédaction** chapitre par chapitre, en tâche de fond, avec barre de progression. Longueur respectée : 1 page ≈ 300 mots (réglable dans l'admin).
4. **Traduction** complète dans l'autre langue : naturelle, adaptée culturellement, pas mot à mot, même structure.
5. **Contrôle qualité automatique** : cohérence, répétitions, longueur par rapport à l'objectif, informations à vérifier signalées.
6. **Relecture** dans l'éditeur : je peux modifier le texte ou demander de régénérer un chapitre ou une section avec une consigne (« plus d'exemples », « plus court », « plus concret »).
7. **Génération automatique de tout le reste, en FR et EN :**
   - couverture (section 8) ;
   - page de vente complète : titre, sous-titre, description, bénéfices, « ce que vous allez apprendre », public cible, FAQ, SEO ;
   - extrait gratuit ;
   - **prix suggéré** et stratégie de promotion selon la stratégie choisie ;
   - posts réseaux sociaux et message d'annonce pour la communauté WhatsApp.
8. **Aperçu** de la page produit et de l'e-book → **Publier** (ou programmer la publication). La publication déclenche le popup « Nouveauté ».

### 16.2 Création d'une formation vidéo ou d'une vidéo

1. Je charge mes vidéos (ou leurs liens Bunny Stream) + un brief et mes notes.
2. Transcription de chaque vidéo (fonction de transcription de l'hébergeur vidéo si disponible, sinon une API de reconnaissance vocale), puis **sous-titres FR et EN** générés et traduits par l'IA.
3. L'IA propose la structure (modules, leçons, titres, résumés) et génère la page de vente complète en FR et EN, la couverture, la FAQ, le SEO, le prix suggéré et les messages promo.
4. En option : un **support PDF** (résumé de la formation) généré à partir des transcriptions, en FR et EN.
5. Relecture, aperçu, publication.

### 16.3 Import de contenu existant

Pour les contenus que je prépare ailleurs (par exemple avec Claude dans son application ou son extension) : je colle le texte ou j'importe un fichier (.md, .docx, .pdf, .txt). L'IA le découpe en chapitres et sections, le traduit dans l'autre langue, et génère la couverture et la page de vente. Format d'import Markdown documenté dans le README.

### 16.4 Technique

- Les générations longues tournent en **tâches de fond** (Inngest / Trigger.dev), reprennent en cas d'échec, et me notifient à la fin (email + notification dans l'admin).
- **Estimation du coût** affichée avant de lancer une génération, coût réel enregistré après, et **budget IA mensuel** réglable (blocage au-delà).
- Prompts système fournis dans `3-PROMPTS-IA.md`, stockés dans des fichiers dédiés du code pour que je puisse les modifier.
- Règles techniques IA : section 17.3.

## 17. Assistant de vente IA « Coach DigiSkool »

### 17.1 Fonctionnement

- Widget de chat sur le site public, dans la langue du visiteur.
- Recommande le bon produit selon le besoin (lien, prix actuel, promo en cours), répond à la FAQ (paiement, accès, deux versions, remboursement), invite à rejoindre la communauté.
- Contexte injecté depuis la base à chaque conversation : catalogue publié, prix dans la devise du visiteur, promotions actives, FAQ.
- Ne doit **jamais** inventer de produit, de prix, de réduction ou de promesse de résultat.
- Problème de commande ou de paiement → renvoi vers le support WhatsApp.
- Limites : 20 messages par visiteur et par heure, 1 000 caractères par message.

### 17.2 Assistant de rédaction (admin)

Boutons IA partout dans l'admin : générer ou améliorer une description, traduire FR ⇄ EN, générer le SEO, une FAQ, des posts réseaux sociaux, un email, un message WhatsApp. Le résultat arrive toujours en brouillon modifiable.

### 17.3 Règles techniques IA

- SDK officiel `@anthropic-ai/sdk`, appels **côté serveur uniquement**, clé dans `ANTHROPIC_API_KEY`.
- Modèle : `claude-opus-5-5`, configurable via `ANTHROPIC_MODEL` (un modèle différent peut être choisi pour le chat via `ANTHROPIC_CHAT_MODEL`).
- Chat en **streaming**, `output_config.effort` sur `"low"` pour la rapidité ; rédaction d'e-books avec `output_config.effort` sur `"high"` et en streaming (réponses longues).
- **Sorties structurées** (`output_config.format` avec schéma JSON) pour les plans, pages produit et messages promo.
- Mettre le prompt système, le brief et le plan **en premier** dans chaque requête (contenu stable) pour profiter du cache de prompt lors de la rédaction chapitre par chapitre.
- Ne pas envoyer de paramètres obsolètes (`temperature`, `budget_tokens`).
- Activer le repli automatique côté serveur en cas de refus du modèle (paramètre `fallbacks: "default"` avec la bêta `server-side-fallback-2026-07-01`), vérifier `stop_reason` avant d'utiliser la réponse, et gérer les erreurs (429, 5xx, réseau) avec nouvelle tentative et message de repli poli.
- Enregistrer pour chaque appel : tokens consommés, coût estimé, durée, produit concerné (table `ai_jobs`).

## 18. Back-office administrateur `/admin`

Accès réservé au rôle `admin` (et `support` avec droits limités : commandes, clients, avis), vérifié **côté serveur**. **Entièrement utilisable depuis un téléphone.**

1. **Tableau de bord** : chiffre d'affaires (jour, 7 j, 30 j, total, par devise convertie), ventes, panier moyen, taux de conversion, ventes par **pays**, **langue**, **moyen de paiement**, **code promo**, **campagne** et **source** (UTM), clics communauté, nouveaux abonnés, top produits, dernières commandes, coût IA du mois.
2. **Produits** : liste, création, édition **FR et EN côte à côte** avec bouton « Traduire avec l'IA », couleur de couverture, prix (par devise si besoin), options lecture/téléchargement, statut brouillon / programmé / publié / archivé, mise en avant, duplication, aperçu, indicateur « version FR / EN complète ».
3. **Studio IA** : créer un e-book, une formation, une vidéo, importer un contenu (section 16), suivre les générations en cours.
4. **Éditeur d'e-book** : chapitres et sections (glisser-déposer), édition FR / EN, régénération d'une partie, aperçu liseuse et aperçu PDF.
5. **Formations et vidéos** : modules et leçons (glisser-déposer), vidéos FR/EN, sous-titres, pièces jointes, aperçu gratuit, téléchargement activable.
6. **Packs**.
7. **Promotions** : campagnes, modèles en un clic, promotions récurrentes, codes promo, liens promo, QR codes, générateur de messages WhatsApp et de visuels, statistiques (section 10).
8. **Popups et bannières** : réglages de la section 11, aperçu.
9. **Commandes** : filtres, détail, renvoyer l'email d'accès, rembourser (retire l'accès), **valider un paiement manuel**, **offrir un produit** à une adresse email.
10. **Clients** : recherche, historique d'achats, donner / retirer un accès, export CSV.
11. **Abonnés et communauté** : emails et numéros WhatsApp (avec consentement), source, langue, pays, export CSV ; statistiques de clics communauté.
12. **Avis** : modération.
13. **Pixels et suivi** : section 19.
14. **Paiements** : fournisseurs, routage par pays, devises, taux de change, arrondis, paiement manuel.
15. **Paramètres** : identité (logo, couleurs), langue par défaut, liens communauté FR/EN, numéros WhatsApp, réseaux sociaux, emails, limite de téléchargements, mots par page, budget IA.
16. **Équipe** : inviter un membre support avec droits limités.
17. **Journal d'activité** : connexions admin, téléchargements, webhooks reçus, événements envoyés aux pixels, générations IA.

## 19. Pixels, suivi et publicité

Tout se configure **depuis l'admin** (page « Pixels et suivi »), sans toucher au code ni redéployer. Les jetons secrets sont chiffrés (Supabase Vault) et jamais envoyés au navigateur.

### 19.1 Outils pris en charge

| Outil | Navigateur | Serveur |
|---|---|---|
| Meta (Facebook / Instagram) | Pixel | API Conversions (jeton d'accès + code de test) |
| TikTok | Pixel | Events API (jeton d'accès) |
| Google Analytics 4 | gtag | Measurement Protocol |
| Google Ads | Suivi des conversions (ID + libellé d'achat), conversions améliorées | — |
| Google Tag Manager | Conteneur (option, pour gérer d'autres balises) | — |
| Snapchat | Pixel | Conversions API (option) |
| Pinterest, X (Twitter), LinkedIn | Balises (option) | — |
| Microsoft Clarity | Cartes de chaleur et enregistrements de sessions (option) | — |

Plus : champs de **vérification de domaine** (Meta, Google Search Console, TikTok, Pinterest).

### 19.2 Événements suivis

`PageView`, `ViewContent`, `Search`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase` (valeur, devise, identifiants produits, langue), `Lead` (lead magnet, extrait gratuit), `CompleteRegistration`, `Contact` (clic support WhatsApp), `JoinCommunity` (clic communauté, événement personnalisé).

### 19.3 Fiabilité du suivi

- `Purchase` est envoyé **côté serveur** à la confirmation du paiement (webhook), et côté navigateur sur la page de succès, avec le **même `event_id`** pour éviter les doublons.
- Correspondance avancée : email et téléphone **hachés** (SHA-256) envoyés aux API serveur.
- Capture et conservation de `fbclid`, `ttclid`, `gclid`, cookies `_fbp` / `_fbc` et des paramètres **UTM** (premier et dernier contact, 30 jours), enregistrés avec la commande.
- **Flux catalogue produits** (CSV/XML) par langue pour les publicités dynamiques Meta et TikTok.
- Page de **test** dans l'admin : derniers événements envoyés, statut de chaque destination, bouton « Envoyer un événement test ».

### 19.4 Consentement

Bannière cookies (accepter / refuser / personnaliser), en FR et EN. Mode réglable dans l'admin : consentement obligatoire avant le chargement des pixels (recommandé, et obligatoire pour les visiteurs européens) ; Google Consent Mode v2.

## 20. Emails et notifications

Tous en FR et EN (langue du client), aux couleurs DigiSkool, lisibles sur mobile :

1. Bienvenue + lien magique de connexion
2. Confirmation de commande + accès aux deux versions + invitation communauté
3. Paiement en attente / échoué (lien pour réessayer)
4. Lead magnet (e-book gratuit)
5. Relance de panier abandonné (1 h après un checkout non payé, avec le code promo en cours s'il y en a un)
6. Nouveau produit disponible (aux abonnés, envoyé manuellement depuis l'admin)
7. Réinitialisation du mot de passe
8. **Notifications admin** : chaque vente, paiement manuel à valider, génération IA terminée, promo récurrente déclenchée (email ; Telegram en option)

## 21. Modèle de données (Postgres / Supabase)

Montants en **entiers** dans la plus petite unité de la devise (FCFA : unités ; USD/EUR : centimes). Chaque table : `id uuid`, `created_at`, `updated_at` si modifiable. Les champs traduits sont dans des tables `*_translations` avec `locale` (`fr` | `en`).

**Utilisateurs**
- `profiles` : `id` (= `auth.users.id`), `full_name`, `email`, `phone`, `whatsapp_optin`, `country`, `preferred_locale`, `preferred_currency`, `role` (`customer` | `support` | `admin`).

**Catalogue**
- `categories` + `category_translations` (`name`, `slug`, `description`).
- `products` : `type` (`ebook` | `course` | `video` | `template` | `bundle`), `category_id`, `base_price`, `base_currency`, `cover_color`, `status` (`draft` | `scheduled` | `published` | `archived`), `published_at`, `is_featured`, `reading_enabled`, `download_enabled`, `target_pages`, `words_per_page`, `duration_minutes`, `sales_count`, `rating_avg`, `rating_count`.
- `product_translations` : `product_id`, `locale`, `title`, `slug` (unique par langue), `subtitle`, `short_description`, `description`, `benefits` (text[]), `learning_outcomes` (text[]), `target_audience`, `faq` (jsonb), `seo_title`, `seo_description`, `cover_url`, `cover_variants` (jsonb : 3:4, 1:1, 16:9, 9:16, OG), `pdf_path`, `page_count`, `preview_path`, `is_complete`.
- `product_prices` : `product_id`, `currency`, `price` (prix fixé à la main, prioritaire sur la conversion).
- `price_history` : `product_id`, `currency`, `price`, `effective_from`.
- `bundle_items` : `bundle_id`, `product_id`.
- `short_links` : `code` (unique), `product_id` ou `target_path`, `promo_code`, `utm` (jsonb), `clicks`.

**E-books**
- `ebook_chapters` : `product_id`, `position`, `page_budget`.
- `ebook_chapter_translations` : `chapter_id`, `locale`, `title`, `content` (jsonb Tiptap), `word_count`, `is_free_preview`.

**Formations et vidéos**
- `course_modules` + `course_module_translations` (`title`).
- `course_lessons` : `module_id`, `position`, `video_fr_id`, `video_en_id`, `duration_seconds`, `is_free_preview`, `download_enabled`.
- `course_lesson_translations` : `lesson_id`, `locale`, `title`, `summary`, `content`, `subtitles_path`, `transcript`, `attachments` (jsonb).

**Progression**
- `reading_progress` : `user_id`, `product_id`, `locale`, `chapter_id`, `position_percent`.
- `bookmarks` : `user_id`, `chapter_id`, `locale`, `position`, `note`.
- `lesson_progress` : `user_id`, `lesson_id`, `seconds_watched`, `completed_at`.
- `certificates` : `user_id`, `product_id`, `locale`, `pdf_path`, `issued_at`.

**Ventes**
- `orders` : `order_number` (ex. `DS-2026-000123`), `user_id`, `email`, `full_name`, `phone`, `country`, `locale`, `currency`, `status` (`pending` | `awaiting_validation` | `paid` | `failed` | `refunded` | `cancelled`), `subtotal`, `discount_amount`, `total`, `coupon_id`, `campaign_id`, `payment_provider`, `payment_method`, `provider_reference`, `provider_payload` (jsonb), `utm_first` (jsonb), `utm_last` (jsonb), `click_ids` (jsonb : fbclid, ttclid, gclid, fbp, fbc), `paid_at`.
- `order_items` : `order_id`, `product_id`, `product_title`, `unit_price`, `discount`, `is_order_bump`.
- `entitlements` : `user_id`, `product_id`, `order_id`, `source` (`purchase` | `gift` | `manual`), `revoked_at`. Unique (`user_id`, `product_id`). **Donne accès aux deux langues.**
- `download_counts` : `user_id`, `product_id`, `locale`, `count`.
- `webhook_events` : `provider`, `event_id` (unique), `payload`, `processed_at`.

**Promotions**
- `promotions` : `name`, `discount_type` (`percent` | `fixed`), `value`, `scope` (`all` | `type` | `category` | `products`), `scope_values` (jsonb), `starts_at`, `ends_at`, `auto_apply`, `badge_style`, `show_banner`, `show_popup`, `show_countdown`, `priority`, `stackable`, `recurrence` (jsonb, ex. « chaque vendredi »), `is_active`.
- `promotion_translations` : `promotion_id`, `locale`, `badge_text`, `banner_text`, `popup_title`, `popup_text`.
- `coupons` : `code` (unique, majuscules), `promotion_id` (option), `discount_type`, `value`, `channel`, `max_uses`, `used_count`, `per_customer_limit`, `product_ids`, `starts_at`, `ends_at`, `is_active`.
- `announcements` (popups et bandeaux) : `type` (`new_product` | `promo` | `community` | `custom`), `product_id`, `promotion_id`, `display_rules` (jsonb : pages, délai, fréquence), `starts_at`, `ends_at`, `is_active` + `announcement_translations`.

**Marketing**
- `subscribers` : `email`, `whatsapp`, `full_name`, `source`, `locale`, `country`, `consent_email`, `consent_whatsapp`, `unsubscribed_at`.
- `community_clicks` : `locale`, `page`, `country`, `utm` (jsonb).
- `reviews` : `product_id`, `user_id`, `rating` (1–5), `comment`, `locale`, `is_approved` (un avis par acheteur et par produit).
- `tracking_settings` : identifiants publics des pixels (les jetons secrets sont dans Supabase Vault).
- `tracking_events` : `event_name`, `event_id`, `order_id`, `destination`, `status`, `response`.

**IA**
- `ai_briefs` : `product_id`, `brief` (jsonb), `source_files` (text[]).
- `ai_jobs` : `type` (`outline` | `chapter` | `translation` | `product_page` | `cover` | `course_page` | `subtitles` | `promo_message` | `import`), `product_id`, `status` (`queued` | `running` | `done` | `failed`), `progress`, `input`, `output`, `input_tokens`, `output_tokens`, `cost_estimate`, `error`.

**Configuration**
- `settings` : `key`, `value` (jsonb).
- `exchange_rates` : `currency`, `rate_from_base`, `rounding_rule`, `updated_at`.
- `payment_routes` : `country`, `provider`, `methods` (text[]), `position`, `is_active`.
- `activity_logs` : `actor_id`, `action`, `details` (jsonb).

**RLS**
- Un client ne voit que son profil, ses commandes, ses accès, sa progression, ses certificats.
- Le public lit les produits publiés, leurs traductions, les catégories, les avis approuvés, les promotions et popups actifs.
- Le contenu des chapitres et des leçons payants n'est lisible qu'avec un droit d'accès (ou si la partie est marquée en aperçu gratuit).
- Seul l'admin écrit dans le catalogue et les réglages ; le rôle `support` a des droits limités. Fonctions SQL `is_admin()` et `has_access(product_id)`.
- Les écritures liées au paiement se font uniquement côté serveur.

## 22. Sécurité et conformité

- RLS sur toutes les tables, testée.
- `/admin` protégé par middleware **et** vérification du rôle côté serveur ; double authentification recommandée pour l'admin.
- Validation Zod de toutes les entrées côté serveur ; protection contre les injections et le XSS (contenu riche nettoyé).
- Limitation des requêtes : connexion, checkout, codes promo (anti-essais en masse), chat IA, formulaires.
- En-têtes de sécurité (CSP compatible avec les pixels, HSTS, X-Frame-Options…).
- Aucune clé secrète côté navigateur (seules les variables `NEXT_PUBLIC_*`).
- Sauvegardes Supabase activées ; suivi des erreurs avec Sentry.
- Pages légales en FR et EN ; consentement cookies ; consentement explicite pour WhatsApp et email marketing ; lien de désinscription dans chaque email.

## 23. SEO

- Métadonnées par page et par langue, `hreflang`, `canonical`, `sitemap.xml` (deux langues), `robots.txt`.
- JSON-LD : `Product` (avec l'offre en cours), `Course`, `Book`, `Organization`, `FAQPage`, `BreadcrumbList`.
- Images Open Graph par produit et par langue (beau rendu quand un lien est partagé sur WhatsApp).
- Liens courts lisibles pour le partage (`[DOMAINE]/p/...`).

## 24. Performance et qualité

- Lighthouse mobile ≥ 90 (accueil, boutique, page produit).
- Images optimisées (`next/image`, WebP/AVIF), polices optimisées, pixels chargés sans bloquer l'affichage.
- Pages publiques en rendu statique / ISR, revalidées à chaque modification dans l'admin.
- États de chargement (skeletons), états vides et messages d'erreur soignés, dans les deux langues.
- PWA (installable sur l'écran d'accueil du téléphone) : phase 2.

## 25. Variables d'environnement (`.env.example`)

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

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
SENTRY_DSN=
```

Les identifiants de pixels, liens de communauté et numéros WhatsApp se règlent dans l'admin (pas dans les variables d'environnement).

## 26. Livrables attendus

- Code complet avec une arborescence claire.
- Migrations SQL Supabase : tables, index, contraintes, RLS, triggers, fonctions, buckets.
- Fichiers de traduction `fr.json` et `en.json` complets.
- Données de démonstration **bilingues** : 3 catégories, 3 e-books (avec chapitres), 2 formations vidéo, 1 vidéo, 1 pack, 1 campagne promo active à -45 %, 2 codes promo.
- `.env.example`.
- `README.md` : installation, configuration (Supabase, paiements, Bunny, Resend, Claude, Inngest), déploiement Vercel, comment me donner le rôle admin, format d'import Markdown des e-books.
- Tests automatisés au minimum pour :
  - webhook de paiement (signature invalide, webhook reçu deux fois, montant ou devise incorrects) ;
  - calcul des prix (promotions, priorités, codes promo, devises, arrondis) ;
  - route de téléchargement (refus sans achat, refus si téléchargement désactivé, limite atteinte) ;
  - détection de la langue (FR, EN, autre langue, cookie de choix manuel) ;
  - accès aux contenus payants (chapitres, leçons) sans achat.
- Tests de bout en bout (Playwright) du parcours d'achat complet, en FR et en EN.

## 27. Méthode de travail

Travaille **phase par phase**, dans cet ordre :

1. Fondations et bilingue
2. Identité visuelle et générateur de couvertures
3. Boutique publique
4. Promotions, popups et communauté
5. Paiements multi-pays et livraison
6. Espace client : liseuse et lecteur vidéo
7. Back-office admin
8. Studio IA
9. Pixels et suivi publicitaire
10. Assistant de vente IA, marketing et pages légales
11. Tests, sécurité et mise en ligne

À la fin de chaque phase : résume ce qui est fait, ce qui reste, et **comment je peux tester moi-même**. Si une information manque, choisis l'option la plus simple et la plus sûre, puis signale-le. Composants réutilisables, pas de duplication, commentaires courts et utiles.
