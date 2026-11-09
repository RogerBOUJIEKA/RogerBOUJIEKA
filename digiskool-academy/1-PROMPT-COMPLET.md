# DigiSkool Academy — Cahier des charges complet

## 1. Ton rôle

Tu es à la fois :
- un **développeur full-stack senior** qui écrit du code propre, typé, sécurisé et prêt pour la production ;
- un **designer UI/UX** du niveau d'Udemy, Stripe ou Apple, obsédé par les détails ;
- un **expert en marketing digital et en conversion** (CRO), spécialiste de la vente de produits digitaux en Afrique francophone et anglophone.

Tu sais ce qui fait acheter un visiteur arrivé d'une publicité Facebook ou TikTok sur son téléphone, et tu supprimes tout ce qui le fait abandonner. Tu avances par phases, tu expliques brièvement ce que tu fais, et tu ne casses jamais ce qui fonctionne déjà.

## 2. Contexte et vision

- **Nom :** DigiSkool Academy
- **Propriétaire :** Roger BOUJIEKA, vendeur de produits digitaux depuis 2 ans, designer graphique.
- **Type :** plateforme **personnelle**, avec **un seul vendeur** (moi). Ce n'est **pas** une marketplace. Il y a un administrateur (moi), éventuellement des membres de l'équipe support, et des clients.
- **Produits (par ordre de priorité) :**
  1. **E-books** rédigés et hébergés directement sur la plateforme (lecture en ligne + téléchargement PDF)
  2. **Formations vidéo** (modules + leçons)
  3. **Vidéos** à l'unité (masterclass, tutoriels)
  4. Templates et packs
- **Marchés :** Afrique francophone, Afrique anglophone, Europe et reste du monde. Les clients achètent surtout **depuis un téléphone**, souvent depuis une publicité, parfois avec une connexion lente.
- **Langues :** **français et anglais**, partout. **Chaque produit existe en version française et anglaise**, et un achat donne accès aux deux.

### Inspiration : Udemy… et au-delà

Inspire-toi d'**Udemy** pour la structure et le sérieux : cartes produit, page produit (en-tête sombre, carte d'achat collante, « Ce que vous allez apprendre », programme en accordéon, avis avec répartition des étoiles, auteur), espace d'apprentissage.

Puis va **au-delà** :
- une **marque personnelle forte** (un seul auteur : Roger) ;
- pensé d'abord pour le **téléphone** et pour des clients qui achètent peu en ligne ;
- **paiements Mobile Money** en quelques secondes ;
- **accès immédiat** au produit après le paiement ;
- **bilingue** FR / EN ;
- **promotions permanentes** et **communauté WhatsApp** au cœur de la stratégie.

### Ce que m'ont appris 2 ans de vente

1. Beaucoup de clients découvrent le produit via une publicité, sur leur téléphone, et **achètent rarement en ligne**. Si le paiement demande trop d'informations ou d'étapes, **ils abandonnent**.
2. Sur les plateformes que j'ai utilisées, après le paiement, le client n'avait pas directement accès à son produit : message à valider, fenêtre à fermer, produit à chercher. Résultat : il pense que **c'est une arnaque** et l'écrit **dans les commentaires de la publicité**, ce qui détruit la campagne.
3. Donc : **paiement ultra simple** et **accès immédiat et évident** sont les deux priorités absolues de cette plateforme.

### Objectifs business

1. Une plateforme de vente **professionnelle**, avec les **moyens de paiement locaux africains**.
2. Faire grandir une **grande communauté WhatsApp**, vers laquelle la plateforme renvoie partout.
3. Des **promotions en permanence** (-40 %, -45 %…), avec des étiquettes, des comptes à rebours et des codes promo partout.
4. Servir les **anglophones et les francophones**.
5. Produire les produits **avec l'IA** (e-book, version anglaise, couverture, page de vente).
6. Des **campagnes publicitaires mesurables** : pixels connectés et fiables.

## 3. Règles non négociables

1. **Simplicité extrême.** Chaque écran doit être compris par quelqu'un qui achète en ligne pour la première fois : gros boutons, mots simples, icônes accompagnées de texte, **une seule action principale par écran**, aucun jargon.
2. **Accès immédiat.** Après le paiement, le client est **automatiquement connecté** et devant son produit en un clic : pas de mot de passe, pas d'email à valider, rien à chercher, rien à fermer.
3. **Bilingue partout.** Aucun texte écrit en dur : tout passe par les fichiers de traduction ou les champs FR/EN de la base.
4. **100 % responsive et fluide**, de 360 px à 1920 px, pensé d'abord pour le téléphone.
5. **Design premium** dans les moindres détails (section 7).
6. **Promotions réelles.** Le prix barré est le vrai prix normal ; le compte à rebours affiche la vraie date de fin (jamais de minuteur qui se relance tout seul). C'est une question de confiance, et c'est obligatoire pour les visiteurs européens.
7. **Preuves sociales réelles uniquement.** Ventes, avis, achats récents et visiteurs en direct viennent de vraies données. Une seule fausse preuve découverte suffit à faire écrire « c'est fake » sous les publicités.
8. **Sécurité.** Prix recalculés côté serveur, fichiers privés, clés secrètes jamais exposées au navigateur.
9. **Performance.** Affichage principal en moins de 2,5 s en 4G, score Lighthouse mobile ≥ 90.

## 4. Stack technique

- **Next.js** (App Router, dernière version stable) + **TypeScript** strict
- **Tailwind CSS** + **shadcn/ui** (dont Drawer pour les tiroirs mobiles et Carousel pour les carrousels), icônes **lucide-react**, animations **Framer Motion**
- **next-intl** (routes `/fr` et `/en`, chemins traduits)
- **Supabase** : Postgres, Auth (sans mot de passe : numéro WhatsApp + code, lien magique ; email + mot de passe en option ; Google), Storage (bucket **public** pour les images, buckets **privés** pour les PDF et fichiers vendus), **Realtime** (statut de paiement en direct, visiteurs en direct), Row Level Security sur **toutes** les tables, Vault pour les jetons secrets saisis dans l'admin
- **libphonenumber-js** : indicatif du pays automatique, format des numéros, détection de l'opérateur
- **Paiement :** plusieurs fournisseurs derrière une couche `PaymentProvider` (section 6)
- **WhatsApp Business Platform (Cloud API de Meta)** : envoi automatique des accès, codes de connexion et confirmations sur WhatsApp ; **SMS de secours** (ex. Africa's Talking, Twilio)
- **Vidéo :** Bunny Stream (lecture protégée par jetons signés, sous-titres, téléchargement MP4 activable)
- **Tâches longues :** Inngest ou Trigger.dev (génération IA, PDF, messages)
- **IA :** API Claude d'Anthropic via le SDK officiel `@anthropic-ai/sdk`, côté serveur uniquement
- **PDF :** `@react-pdf/renderer` (e-books mis en page), `pdf-lib` (filigrane au téléchargement)
- **Images générées** (couvertures, visuels promo, aperçus floutés) : `@vercel/og` (Satori) et `sharp`
- **Emails :** Resend + React Email
- **Anti-robots :** Cloudflare Turnstile, invisible, déclenché seulement en cas de comportement suspect
- **Éditeur riche (admin) :** Tiptap — **Validation :** Zod — **Formulaires :** React Hook Form
- **Limitation de requêtes :** Upstash Redis
- **Hébergement :** Vercel (plan Pro), domaine [DOMAINE]

> Si l'outil impose une autre stack (ex. Lovable : React + Vite + Supabase), garde exactement la même architecture fonctionnelle et place toute la logique sensible (paiement, webhooks, accès, téléchargements, IA, messages WhatsApp, pixels côté serveur) dans des **Supabase Edge Functions**.

## 5. Plateforme bilingue FR / EN

### 5.1 Détection automatique de la langue

- À la **première visite**, la langue est choisie selon la **langue du téléphone ou du navigateur** (en-tête `Accept-Language`) :
  - téléphone en français → site en **français** ;
  - téléphone en anglais → site en **anglais** ;
  - autre langue → **[LANGUE_PAR_DEFAUT]** (réglable dans l'admin).
- Le middleware redirige `/` vers `/fr` ou `/en`.
- **Liens partagés sans langue** (ex. `[DOMAINE]/p/ebook-vente`, utilisés dans la communauté et les publicités) : redirection vers la bonne langue selon le téléphone du visiteur.
- Si un visiteur ouvre un lien dans une langue différente de celle de son téléphone, on respecte le lien, avec un petit bandeau discret « This page is also available in English → Switch » (une seule fois).

### 5.2 Bouton de langue

- Bouton **FR | EN** toujours visible dans le header, aussi dans le menu mobile et le footer.
- Un clic bascule **sur la même page** dans l'autre langue et mémorise le choix (cookie 1 an), prioritaire sur la détection automatique. La langue est aussi enregistrée dans le profil du client.

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
| `/fr/offre/[slug-fr]` (page publicitaire) | `/en/offer/[slug-en]` |
| `/fr/panier` | `/en/cart` |
| `/fr/paiement` | `/en/checkout` |
| `/fr/acces` (retrouver mon achat) | `/en/access` |
| `/fr/comment-payer` | `/en/how-to-pay` |
| `/fr/compte` | `/en/account` |

Le back-office `/admin` est en français uniquement.

### 5.4 Ce qui est traduit

- Toute l'interface (`messages/fr.json`, `messages/en.json`).
- Tous les contenus de la base : produits, chapitres, leçons, catégories, FAQ, bannières, popups, étiquettes promo, pages de vente, pages légales.
- Emails, messages WhatsApp et SMS, reçus PDF, certificats : dans la langue du client.
- Assistant IA : répond dans la langue du visiteur.
- Formats localisés (`Intl.NumberFormat`, dates) : « 15 000 FCFA » en français, « 15,000 FCFA » en anglais.
- SEO : `hreflang`, `canonical`, sitemap dans les deux langues.

### 5.5 Règle de publication

Un produit ne peut pas être publié tant que sa version française **et** sa version anglaise ne sont pas complètes. L'admin voit clairement ce qui manque.

## 6. Pays, devises et paiements locaux

### 6.1 Pays et devise

- Pays détecté (en-tête `x-vercel-ip-country`) → devise, indicatif téléphonique et moyens de paiement proposés automatiquement. Le visiteur peut changer de devise.
- Devises : **XAF, XOF** (FCFA), **NGN, GHS, KES**, **USD, EUR**, extensible.
- Prix de base par produit en [DEVISE_DE_BASE]. Autres devises : prix fixé à la main, ou conversion avec un **taux modifiable dans l'admin** et des **règles d'arrondi** par devise (FCFA → « 4 900 » ; USD/EUR → « 9,99 »).
- **Aucun frais surprise :** le prix affiché sur la page produit est exactement le prix payé.

### 6.2 Moyens de paiement

- **Afrique francophone :** MTN Mobile Money, Orange Money, Moov Money, Wave, Airtel Money, carte bancaire.
- **Afrique anglophone :** carte, Mobile Money (MTN MoMo, M-Pesa…), virement, USSD.
- **International :** carte bancaire (Visa, Mastercard), Apple Pay / Google Pay si le fournisseur les propose.
- Fournisseurs : **[FOURNISSEUR_PRINCIPAL]** et **[FOURNISSEUR_SECONDAIRE]** (exemples : CinetPay, NotchPay, FedaPay, Fapshi pour l'Afrique francophone ; Paystack, Flutterwave pour l'Afrique anglophone et les cartes).
- **Routage par pays :** l'admin choisit quels fournisseurs et moyens de paiement s'affichent pour chaque pays, et dans quel ordre.
- **Paiement manuel** (dépôt Mobile Money + référence, validé par l'admin) : option **désactivée par défaut**, car elle casse l'accès immédiat. Si elle est activée, délai de validation annoncé clairement.

### 6.3 Déroulé sécurisé d'un paiement

1. Le serveur crée la commande `pending` en **recalculant les prix depuis la base** (promotion et code promo appliqués côté serveur).
2. Le client valide le paiement (demande Mobile Money sur son téléphone, page du fournisseur, ou formulaire carte).
3. **Webhook** du fournisseur → vérification de la signature → re-vérification du statut via l'API du fournisseur → contrôle du **montant et de la devise** → commande `paid` → **droits d'accès** créés → **accès immédiat** (section 15) → messages d'accès WhatsApp / SMS / email → événement `Purchase` vers les pixels → notification de vente à l'admin.
4. Traitement **idempotent** (table `webhook_events`) : jamais deux accès ni deux messages pour un même paiement.
5. **Rattrapage automatique** (Vercel Cron, toutes les 2 min pendant 30 min, puis toutes les 10 min jusqu'à 24 h) : vérification des commandes `pending` auprès du fournisseur.
6. Clés en variables d'environnement ; mode test et mode réel séparés.

## 7. Design system

### 7.1 Direction artistique

- **Premium, chaleureux, africain moderne, digne de confiance.** La clarté d'Udemy, la finition de Stripe et d'Apple, l'énergie des marques africaines modernes.
- En-têtes de pages produit et sections fortes sur fond **bleu nuit**, touches d'**or** ; contenus sur fond clair ; beaucoup d'espace.
- **Photos réelles** de Roger et d'apprenants africains. Pas de photos de banque d'images génériques.
- Livrable : une page `/admin/design` qui présente tout le design system (couleurs, typographies, composants dans tous leurs états), en clair et en sombre.

### 7.2 Typographies

- **Titres : Plus Jakarta Sans** (700–800) : moderne, géométrique, premium, très lisible sur mobile.
- **Texte et interface : Inter** (400–600) : conçue pour les écrans, parfaite en petite taille.
- **Prix et chiffres :** Plus Jakarta Sans, **chiffres tabulaires** (les comptes à rebours ne « sautent » pas).
- Échelle (mobile → ordinateur) : H1 32 → 48 px, H2 24 → 36 px, H3 20 → 24 px, texte 16 px (jamais moins de 14 px). Interligne 1,6 pour le texte, 1,2 pour les titres.
- Chargement avec `next/font` (aucun décalage d'affichage), accents français complets.

### 7.3 Couleurs (variables, mode clair et sombre)

| Rôle | Couleurs |
|---|---|
| Marque — bleu nuit | 950 `#071427` · 900 `#0B1F3A` · 800 `#12294D` · 700 `#16325C` · 500 `#2A5BA8` · 100 `#E6EEF9` |
| Accent — or | 600 `#D99E00` · 500 `#F5B700` · 400 `#FFC933` · 100 `#FFF6D6` |
| **Bouton d'achat** | fond or `#F5B700`, texte bleu nuit `#0B1F3A`, survol `#FFC933` |
| Promotion (étiquettes, chronos) | rouge `#E11D48`, fond `#FFE4E9` |
| Succès / Info / Avertissement / Erreur | `#16A34A` / `#2563EB` / `#F59E0B` / `#DC2626` |
| WhatsApp | icône et accents `#25D366`, bouton `#128C7E` texte blanc, fond de carte `#E9FBF0` |
| Neutres | slate 50 `#F8FAFC` → 900 `#0F172A`, bordures `#E2E8F0` |

- Règle **60 / 30 / 10** : 60 % de neutres clairs, 30 % de bleu nuit, 10 % d'or et de rouge pour ce qui doit attirer l'œil.
- **Une seule couleur pour les actions d'achat** (l'or) : le client sait toujours où cliquer.
- Contraste AA partout, vérifié.

### 7.4 Espacements, formes, ombres

- Grille de 4 / 8 px. Conteneur max 1280 px. Marges latérales 16 px sur mobile.
- Rayons : 12 px (boutons, champs), 16–20 px (cartes), pilule (étiquettes, badges).
- Deux niveaux d'ombres douces, bordures fines.

### 7.5 Composants

- Boutons : primaire (or), secondaire (bleu nuit), contour, discret, WhatsApp. **Hauteur minimale 48 px** sur mobile (56 px pour « Acheter » et « Payer »).
- Étiquettes promo (« -45 % », « OFFRE 24 H »), badges (Best-seller, Nouveau, Populaire, Mis à jour), étoiles, compte à rebours, barres de progression.
- Cartes produit, accordéons, onglets, tiroirs mobiles (bottom sheets), toasts, skeletons, états vides illustrés, bandeau de confiance, logos de paiement, carte WhatsApp (section 16).
- Champs de formulaire grands et clairs, libellé toujours visible, message d'erreur sous le champ en langage simple.

### 7.6 Animations et fluidité

- Durées 150–250 ms, courbes douces. Cartes qui se soulèvent au survol, boutons qui s'enfoncent au toucher, transitions de page discrètes, chiffres du compte à rebours animés, célébration discrète au paiement réussi.
- Préchargement des pages au survol et à l'apparition des liens : navigation quasi instantanée.
- Respect de `prefers-reduced-motion`. **Mode données faibles** (en-tête `Save-Data` ou connexion lente) : animations et lecture automatique des vidéos désactivées, images plus légères.

### 7.7 Icônes et images

- Icônes lucide (trait 1,75), toujours accompagnées d'un texte pour les actions importantes.
- Drapeaux pour les pays (indicatif téléphonique), texte « FR | EN » pour les langues.
- Images WebP/AVIF avec aperçu flou pendant le chargement.

### 7.8 Responsive

- Points de rupture : 360 / 640 / 768 / 1024 / 1280 / 1536 px.
- Testé sur petit Android (360 × 640), iPhone (390 × 844), tablette, ordinateur.
- Aucun défilement horizontal, zones tactiles ≥ 44 px, éléments collants qui ne cachent jamais le contenu, prise en compte des encoches d'iPhone.
- Mode sombre complet.

## 8. Couvertures automatiques (miniatures au même design)

Toutes les miniatures suivent **le même modèle**, seule la **couleur** change : le client reconnaît la « collection DigiSkool » au premier coup d'œil.

- **Modèle unique :**
  - fond dans la couleur du produit, dégradé et motif géométrique discret identiques sur toutes les couvertures ;
  - en haut : logo DigiSkool Academy + type (« E-BOOK », « FORMATION VIDÉO », « VIDÉO » / « VIDEO COURSE »…) ;
  - au centre : titre en grand (Plus Jakarta Sans, blanc, extra-gras), sous-titre ;
  - en bas : icône du thème, badge de langue **FR** / **EN**, « Roger BOUJIEKA ».
- **Palette de 12 couleurs :** indigo `#4338CA`, émeraude `#059669`, cramoisi `#BE123C`, ambre `#D97706`, sarcelle `#0D9488`, violet `#7C3AED`, bleu ciel `#0284C7`, orange `#EA580C`, rose `#DB2777`, ardoise `#334155`, vert lime `#65A30D`, bleu marine `#1E3A8A`. Couleur proposée automatiquement (différente des derniers produits), modifiable.
- Générée automatiquement **en FR et en EN**, régénérée quand le titre ou la couleur change.
- **Formats :** carte boutique (3:4), carré 1:1, 16:9, 9:16 (statut WhatsApp, TikTok, stories), Open Graph 1200 × 630. Tous téléchargeables depuis l'admin pour les publicités.
- **Effet livre 3D** (CSS) pour les e-books sur la page produit.
- Les étiquettes de promotion ne sont **pas** incrustées dans l'image : le site les affiche par-dessus.

## 9. Pages publiques

### 9.1 Header et navigation

- **Barre de promotion** tout en haut quand une promo est active (section 17.4).
- **Ordinateur :** logo, menu Catégories (méga-menu), **grande barre de recherche** au centre avec suggestions instantanées (produits, catégories), FR | EN, devise, favoris, panier, « Mes produits » ou « Connexion », bouton **« Communauté »** (vert).
- **Mobile :** logo, recherche, panier, menu (tiroir avec tout le reste et le bouton communauté).
- **Barre de navigation en bas sur mobile**, comme une application : Accueil, Boutique, Recherche, Mes produits, Communauté. Masquée sur la page produit (remplacée par la barre d'achat), le checkout et la liseuse.
- Lien **« Retrouver mon achat »** toujours accessible (menu, footer, bloc WhatsApp).

### 9.2 Accueil (Udemy, en mieux)

1. **Bannières** défilantes gérées dans l'admin (FR/EN), avec compte à rebours si promo.
2. **Hero** : promesse forte, recherche, preuves (apprenants, note moyenne, nombre de produits — vraies données), boutons « Voir les formations » et « Rejoindre la communauté ».
3. **Pastilles de catégories** défilantes.
4. **Carrousels** : Offres du moment, Meilleures ventes, Nouveautés, E-books, Formations vidéo, « Reprendre » (si connecté), « Récemment consultés ».
5. **Pourquoi DigiSkool** : accès immédiat, FR + EN inclus, paiement Mobile Money, accès à vie, communauté.
6. Chiffres clés animés (vraies données).
7. **Témoignages** (texte, captures, vidéos — section 12).
8. **Roger** : photo, histoire, mission.
9. **Communauté WhatsApp** (avantages + bouton).
10. **Lead magnet** : e-book gratuit « [LEAD_MAGNET] » contre numéro WhatsApp ou email.
11. FAQ, footer complet (liens, réseaux [RÉSEAUX], pages légales, logos de paiement, « Retrouver mon achat », « Comment payer »).

### 9.3 Boutique, catégories, Promotions, Nouveautés

- Filtres (type, catégorie, prix, en promotion, note) dans un tiroir sur mobile, pastilles des filtres actifs, tri (populaires, récents, prix, plus grosse réduction, mieux notés), résultats instantanés, bouton « Voir plus ».
- Page **Promotions** : tous les produits en réduction, triés par réduction.
- Page **Nouveautés** : derniers produits publiés.

### 9.4 Carte produit (le détail qui vend)

- Couverture avec **étiquette promo** en haut à gauche et **badge** (Best-seller, Nouveau…) en haut à droite.
- Titre (2 lignes max), « Roger BOUJIEKA ».
- ★ 4,8 (312) · **2 431 ventes**.
- Infos clés : « 120 pages » ou « 8 modules · 5 h », « FR + EN ».
- **Prix promo** en grand + prix barré ; mini compte à rebours si l'offre finit dans moins de 48 h.
- Cœur « favori ». Toute la carte est cliquable.
- **Sur ordinateur, au survol** (comme Udemy) : fenêtre avec « Ce que vous allez apprendre » (3 points), date de mise à jour, bouton « Ajouter au panier ».

### 9.5 Autres pages

À propos, Contact, FAQ, Communauté, Blog (phase 2), **Retrouver mon achat** (section 15.6), **Comment payer** (tutoriel illustré + courte vidéo pour chaque moyen de paiement), pages légales (Mentions légales, CGV, Confidentialité, Remboursement, Cookies), page 404 personnalisée.

## 10. Page produit qui convertit

Objectif : qu'un visiteur venu d'une publicité comprenne en 5 secondes ce qu'il obtient, ait confiance, et achète en un clic.

### 10.1 Haut de page sur mobile (visible sans faire défiler)

1. Média : couverture en **livre 3D** (e-book) ou **vidéo de présentation** (formation) avec bouton ▶ « Aperçu gratuit ».
2. Badges : Best-seller / Nouveau / Mis à jour en [mois].
3. Titre + sous-titre (la promesse).
4. ★ 4,8 (312 avis) · 2 431 ventes · par Roger BOUJIEKA.
5. **Bloc prix** : prix promo en très grand, prix barré, étiquette « -45 % », « Vous économisez 8 100 FCFA », **compte à rebours** « L'offre se termine dans 05 h 12 min 33 s ».
6. Bouton **« Acheter maintenant »** (or, pleine largeur, 56 px) ; « Ajouter au panier » en secondaire ; lien « Offrir ce produit ».
7. Ligne de réassurance : 🔒 Paiement sécurisé · ⚡ Accès immédiat · 🇫🇷🇬🇧 FR + EN inclus.
8. Logos des moyens de paiement du pays du visiteur.
9. Carte WhatsApp compacte « Une question ? » (section 16).

### 10.2 Version ordinateur (inspirée d'Udemy)

- **En-tête sombre** bleu nuit pleine largeur : fil d'Ariane, titre, sous-titre, badges, note, ventes, auteur, langues (FR + EN), date de mise à jour.
- **Carte d'achat collante** à droite : média, prix, chrono, boutons, « Ce produit comprend », garantie, code promo, partage.
- Contenu à gauche.

### 10.3 « Ce produit comprend »

Liste avec icônes : nombre de pages / modules / leçons / heures de vidéo · versions française et anglaise · lecture en ligne · téléchargement PDF ou vidéo (si activé) · accès à vie · mises à jour gratuites · certificat (formations) · sur téléphone, tablette et ordinateur · accès à la communauté.

### 10.4 Sections, dans cet ordre

1. **Ce que vous allez apprendre** : encadré avec coches (2 colonnes sur ordinateur).
2. **Aperçu gratuit** (section 11).
3. **Programme / sommaire** : résumé « 12 chapitres · 120 pages » ou « 8 modules · 46 leçons · 5 h 20 », accordéon, bouton « Tout développer », leçons gratuites avec bouton « Aperçu », les autres avec cadenas et durée.
4. **Pour qui / pour qui ce n'est pas.**
5. **Description**, repliée avec « Lire la suite ».
6. **Bonus** (s'il y en a), avec leur valeur réelle.
7. **Preuves sociales** (section 12).
8. **L'auteur** : photo, parcours, nombre d'apprenants et de produits.
9. **Garantie** : badge + texte ([REMBOURSEMENT]).
10. **FAQ** (dont : comment payer, comment j'accède au produit, FR + EN, téléchargement).
11. **Souvent achetés ensemble** : pack avec économie, ajout en un clic.
12. **Les clients ont aussi acheté.**
13. **Appel à l'action final** : récapitulatif du prix, chrono, bouton.
14. **Bloc communauté WhatsApp.**

### 10.5 Barre d'achat collante (mobile)

Apparaît quand le bouton principal sort de l'écran : miniature, prix promo + barré, mini-chrono, bouton « Acheter ». Ne cache jamais le contenu.

### 10.6 Micro-détails qui font vendre

- Économie affichée en montant et en pourcentage ; prix psychologiques.
- « Payez avec MTN MoMo, Orange Money, Wave… » sous le prix (selon le pays).
- « Dernière vente il y a 2 h » (réel).
- « 12 personnes consultent ce produit » (réel, Supabase Realtime, affiché seulement au-dessus d'un seuil réglable).
- Offre de lancement limitée **réelle** : « Plus que 23 exemplaires au prix de lancement » (compteur réel, réglé par l'admin).
- Comparaison « pack » contre « achat séparé ».
- Si le client possède déjà le produit, le bouton devient **« Accéder à mon produit »**.
- Partage WhatsApp en un clic (lien court + image Open Graph).

## 11. Aperçus gratuits

### 11.1 E-book : feuilleter et pages floutées

- Bouton **« Feuilleter l'e-book »** : visionneuse de pages (glisser sur mobile, flèches sur ordinateur), en FR ou EN.
- Les **[3] premières pages** sont lisibles (nombre réglable, ou pages choisies par l'admin : sommaire, introduction…).
- Les pages suivantes s'affichent **floutées**, avec un cadenas et le message « Débloquez les 120 pages — 9 900 FCFA » + bouton d'achat.
- **Sécurité :** les pages floutées sont des **images basse résolution générées côté serveur**. Le vrai texte des pages verrouillées n'est **jamais** envoyé au navigateur : impossible de le lire en inspectant la page.
- Sommaire complet visible (il prouve la richesse du contenu).

### 11.2 Formation vidéo : leçons débloquées

- **Vidéo de présentation** en haut de page.
- Programme complet visible : nombre de modules et de leçons, durée de chaque leçon, ressources incluses.
- L'admin choisit **1 à 3 leçons en aperçu gratuit** (introduction, bonus, leçon non essentielle), lisibles dans une fenêtre, **sans compte**.
- Les autres : cadenas + durée + « Disponible après l'achat ».
- À la fin d'un aperçu : écran « Vous avez aimé ? Débloquez les 46 leçons » + prix + chrono + bouton d'achat.

### 11.3 Vidéo à l'unité

Extrait des 60 premières secondes (réglable), puis écran d'achat.

## 12. Preuves sociales et confiance

- **Nombre de ventes :** ventes réelles sur la plateforme **+ ventes antérieures** saisies par l'admin (ventes réellement réalisées avant le lancement, sur les plateformes utilisées depuis 2 ans). Affiché à partir d'un seuil réglable ; masquable par produit.
- **Note moyenne + répartition des étoiles** (5★ → 1★) + nombre d'avis.
- **Avis clients :** prénom, pays (drapeau), date, note, texte, badge **« Achat vérifié »**, photo facultative ; filtres par note ; bouton « Utile ».
- **Collecte automatique des avis :** message WhatsApp ou email 3 jours après l'achat d'un e-book, ou à 50 % d'une formation, avec un lien pour noter en 2 clics.
- **Témoignages importés :** captures de vraies conversations WhatsApp (numéros masqués), vidéos de témoignages, avis réels des plateformes précédentes (avec date et source).
- **Achats récents** (popup discret, section 18) et **visiteurs en direct** : données réelles uniquement.
- **Badges automatiques :** Best-seller (top ventes sur 30 jours), Populaire, Nouveau, Mis à jour.
- **Chiffres globaux** sur l'accueil : apprenants, pays, avis.
- **Signaux de confiance :** garantie, logos de paiement, vraie photo de Roger, numéro WhatsApp visible, email, liens vers les réseaux sociaux, pages légales accessibles, « Vu dans » (seulement si réel).
- **Interdit :** faux avis, faux compteurs, fausses notifications.

## 13. Pages de vente pour les publicités

- Chaque produit a automatiquement une **page de vente longue** pour les publicités : `/fr/offre/[slug]` et `/en/offer/[slug]`.
- **Sans menu de navigation** (aucune distraction) : logo, FR | EN, chrono, bouton WhatsApp.
- Structure : accroche + visuel ou vidéo → problème → solution → présentation du produit → contenu → aperçu (feuilleter ou leçons gratuites) → bénéfices → preuves sociales → auteur → bonus → offre (prix barré, économie, chrono) → garantie → FAQ. **Bouton d'achat répété toutes les 2 à 3 sections** + barre collante.
- Textes générés par le Studio IA en FR + EN, modifiables section par section ; chaque section peut être activée ou masquée.
- Achat directement sur la page : le checkout express s'ouvre sans quitter la page.
- Tests A/B (titre, visuel, prix affiché) avec statistiques de conversion : phase 2.
- Liens prêts à copier pour Meta et TikTok avec paramètres UTM (section 26.6).

## 14. Checkout express (paiement facile)

Objectif : **payer en moins de 60 secondes**, même pour quelqu'un qui achète en ligne pour la première fois.

### 14.1 Le formulaire : le strict nécessaire

- **Une seule page** (un tiroir qui s'ouvre depuis la page produit sur mobile). Pas de compte à créer, pas de mot de passe.
- **3 champs maximum :**
  1. **Nom complet**
  2. **Numéro WhatsApp** : drapeau et indicatif du pays pré-remplis, format automatique, numéro vérifié.
  3. **Email : facultatif**, « recommandé pour recevoir une copie », avec correction des fautes courantes (« gmial.com » → « gmail.com ? »). Si un fournisseur de paiement exige un email et que le client n'en a pas donné, utiliser une adresse technique de la boutique.
- **Informations mémorisées sur l'appareil** pour les achats suivants (paiement en un geste), avec un lien « Ce n'est pas moi ».
- **Récapitulatif en haut :** miniature, titre, « FR + EN inclus », prix promo, prix barré, économie, chrono.
- **Code promo replié** (« Vous avez un code promo ? ») ; appliqué automatiquement s'il vient d'un lien.
- **Un seul order bump** : case visuelle « Ajouter [produit complémentaire] pour seulement X ».
- **Moyens de paiement :** grandes tuiles avec logos, **uniquement ceux du pays** ; opérateur **pré-sélectionné selon le numéro** (numéro MTN → MTN MoMo) ; numéro de paiement pré-rempli avec le numéro WhatsApp, modifiable.
- **Un seul bouton :** « Payer 9 900 FCFA » (or, 56 px, cadenas).
- **Sous le bouton :** « 🔒 Paiement sécurisé · ⚡ Accès immédiat après paiement · Garantie [REMBOURSEMENT] » + logos.
- **Carte WhatsApp « Un souci pour payer ? »** (section 16).
- **Conditions :** la phrase « En payant, vous acceptez les CGV » (avec lien) remplace la case à cocher. **Exception :** pour les visiteurs de l'Union européenne, case obligatoire « Je demande l'accès immédiat et renonce à mon droit de rétractation ».
- **Pas de captcha visible** (Turnstile invisible, seulement en cas de suspicion).
- **Erreurs en langage simple**, FR/EN, traduites depuis les codes des fournisseurs : « Solde insuffisant : rechargez votre compte Mobile Money puis réessayez. » En cas d'échec, **réessayer sans rien ressaisir**, ou changer de moyen de paiement en un clic.

### 14.2 Mobile Money : l'écran d'attente

- Juste après « Payer » : illustration animée d'un téléphone et un message clair : « 📱 Regardez votre téléphone : une demande de paiement de 9 900 FCFA va s'afficher. Tapez votre code secret Mobile Money pour confirmer. »
- Étapes numérotées avec icônes.
- **Statut en direct** (Realtime + vérification toutes les 3 s) : dès que c'est payé, **redirection automatique vers le produit** (section 15).
- Compte à rebours de validité de la demande. Lien « Je n'ai pas reçu la demande » → instructions **propres à l'opérateur et au pays** (ex. code USSD pour valider les paiements en attente), configurées dans l'admin, + « Renvoyer la demande » + « Changer de moyen de paiement ».
- Moyens par redirection ou QR code (ex. Wave) : bouton d'ouverture de l'application sur mobile, QR code sur ordinateur.
- Carte WhatsApp support visible.

### 14.3 Carte bancaire

Formulaire du fournisseur intégré (ou redirection), 3-D Secure, Apple Pay / Google Pay si disponibles. Retour automatique sur la page d'accès.

### 14.4 Mesure et relance

- **Entonnoir du checkout** dans l'admin : ouverture → champs remplis → moyen choisi → paiement lancé → payé, pour voir où les clients abandonnent.
- **Relance des paniers abandonnés** par WhatsApp et email (section 27), avec une mention sous le champ : « Nous pouvons vous recontacter au sujet de cette commande. »

## 15. Accès immédiat après paiement

Objectif : **moins de 5 secondes après la confirmation du paiement, le client est devant son produit, sans rien faire.** Plus jamais « c'est fake » dans les commentaires.

### 15.1 Connexion automatique

- Au début du checkout, le serveur crée (ou retrouve, par numéro WhatsApp ou email) le compte du client et pose un **cookie sécurisé lié à la commande**.
- Dès que le paiement est confirmé, la page de succès **ouvre automatiquement la session** du client (cookie + commande payée, jeton à usage unique). **Aucun mot de passe, aucun email à valider, aucun code.**

### 15.2 Page « Paiement réussi »

- Grand ✅ + « **Paiement réussi ! Votre produit est prêt.** » + célébration discrète.
- Juste en dessous, la carte du produit acheté avec un **énorme bouton** : « **Lire maintenant** » (e-book), « **Commencer la formation** » ou « **Regarder la vidéo** ». Boutons « English version » / « Version française » et « Télécharger » (si activé).
- « Votre accès a aussi été envoyé sur votre WhatsApp (+237 6•• •• •• 12) et par email. »
- Ensuite seulement : carte WhatsApp (communauté + support), offre complémentaire discrète.
- **Aucun popup, aucun message par-dessus, rien à fermer.**

### 15.3 Ouverture directe

Un clic → la liseuse s'ouvre au chapitre 1, ou le lecteur à la leçon 1. À la première ouverture, un mini-guide de 3 écrans (« Glissez pour tourner les pages », « Changez de langue ici », « Téléchargez ici »), facile à passer.

### 15.4 Messages d'accès automatiques

- **WhatsApp** (modèle de message validé par Meta) : « Merci [prénom] ! Votre achat [produit] est confirmé ✅ Accédez-y ici : [lien]. Besoin d'aide ? Répondez à ce message. »
- **SMS** de secours si le message WhatsApp n'est pas délivré.
- **Email** si le client en a donné un.
- Le lien ouvre directement le produit, client connecté. Lien personnel valable 30 jours ; ensuite, nouveau lien via « Retrouver mon achat ».

### 15.5 Si le client a fermé la page pendant le paiement

- En revenant sur le site (même téléphone), bandeau vert : « ✅ Votre paiement pour [produit] est confirmé — **Accéder à mon produit** ».
- Les messages WhatsApp / SMS / email arrivent de toute façon.

### 15.6 Page « Retrouver mon achat » (`/acces`)

Le client saisit son numéro WhatsApp (ou son email) → reçoit un **code à 6 chiffres** par WhatsApp (SMS ou email en secours) → accède à tous ses produits. Lien visible dans le menu, le footer et le bloc WhatsApp.

### 15.7 Connexion toujours facile

- Connexion par **numéro WhatsApp + code** (via le « Send SMS Hook » de Supabase Auth, qui envoie le code par WhatsApp avec SMS de secours) ou par **email + lien magique**. Mot de passe facultatif.
- Bouton **« Mes produits »** toujours visible quand le client est connecté ; ses produits achetés en premier dans son espace.
- Nombre d'appareils connectés simultanément limité (réglable, ex. 3) pour limiter le partage de compte.

### 15.8 Surveillance

- Tableau **« Accès non ouverts »** dans l'admin : commandes payées dont le produit n'a pas été ouvert après 30 minutes.
- Relance automatique WhatsApp avec le lien, et alerte à l'admin pour contacter le client.

## 16. Bloc WhatsApp : support + communauté

Un composant réutilisable, soigné, reconnaissable :

- **Design :** carte arrondie, fond vert très clair `#E9FBF0`, fine bordure verte, icône WhatsApp officielle.
- **Ligne 1 — support :** « Besoin d'aide ? Écrivez-nous sur WhatsApp » + **numéro affiché en clair** [WHATSAPP_SUPPORT]. Un clic ouvre la conversation avec un message pré-rempli (produit et numéro de commande s'il existe).
- **Ligne 2 — communauté :** bouton vert principal **« Rejoindre la communauté DigiSkool »** (lien FR ou EN selon la langue) + « Promos exclusives jusqu'à -45 % annoncées ici en premier ».
- **Variantes selon l'endroit :**
  - page produit : compacte, « Une question ? » ;
  - checkout et écran d'attente Mobile Money : « Un souci pour payer ? » ;
  - page de succès : après le bouton d'accès au produit, la communauté passe en avant ;
  - espace client, « Retrouver mon achat », footer, emails et messages.
- **Bouton flottant** sur tout le site (sauf checkout et liseuse) : ouvre un petit panneau avec **en premier** « 👥 Rejoindre la communauté » (gros bouton), puis « 💬 Contacter le support ».
- Chaque clic est mesuré : `Contact` (support) et `JoinCommunity` (communauté), section 26.

## 17. Moteur de promotions

Objectif : lancer **en 2 clics** une promotion sur tout ou partie du catalogue, affichée automatiquement partout.

### 17.1 Campagnes

Chaque campagne a :
- un nom interne ;
- une réduction : **pourcentage** (ex. 45 %) ou **montant fixe** ;
- une portée : **tous les produits**, un type (formations, e-books…), une catégorie, ou une liste de produits ;
- une date de début et de fin (**utilisée par le compte à rebours**) ;
- application **automatique** ou via un **code promo** ;
- textes FR et EN : étiquette (« -45 % », « OFFRE 24 H » / « 24H DEAL »), bannière, popup ;
- style d'étiquette (rouge promo, or, noir « Black Friday »…) ;
- options d'affichage : barre en haut, popup, compte à rebours, page Promotions ;
- priorité (la meilleure réduction s'applique ; pas de cumul sauf autorisation).

### 17.2 Modèles en un clic

- « Flash 24 h : -45 % sur toutes les formations »
- « Week-end : -40 % sur tous les e-books »
- « Lancement : -30 % pendant 48 h sur un nouveau produit »
- « Promo générale : -40 % sur tout le site »
- « Code communauté : -45 % pendant 24 h, réservé à la communauté WhatsApp »

### 17.3 Promotions récurrentes et offres spéciales

- Règles programmées (ex. « chaque vendredi de 00 h à 23 h 59 : -45 % sur les formations ») ; à chaque déclenchement, l'admin reçoit le **message WhatsApp prêt à copier** (FR + EN).
- **Prix de lancement** pour les N premiers acheteurs (compteur réel).
- **Offre de bienvenue** pour la première commande (option).

### 17.4 Affichage sur le site

- **Barre en haut** (collante, fermable) : « 🔥 -45 % sur toutes les formations — se termine dans 12:04:55 — Code DIGI45 [Copier] ».
- **Étiquettes** sur les cartes et la page produit, **prix barré** + économie, **compte à rebours** réel (jours, heures, minutes, secondes).
- **Popup promo** (section 18), **page Promotions**.

### 17.5 Codes promo partout

- Codes illimités : réduction (ou liée à une campagne), dates, utilisations maximales, limite par client, produits concernés, **canal** (communauté WhatsApp, TikTok, Facebook, Instagram, influenceur, email, flyer…).
- **Liens promo** qui appliquent le code : `[DOMAINE]/p/ebook-vente?promo=VIP45` (mémorisé 7 jours).
- **QR code** pour chaque code (flyers, affiches, statuts).
- **Générateur d'annonces :** l'IA rédige l'annonce pour la communauté en FR et EN (lien court, code, vraie date de fin), avec boutons « Copier FR », « Copier EN », « Partager sur WhatsApp », et le **visuel promo** (9:16 et 1:1) avec la couverture et l'étiquette.
- Statistiques : ventes et chiffre d'affaires par code, par campagne, par canal.

### 17.6 Historique des prix

Chaque changement de prix est enregistré (`price_history`) : le prix barré est toujours le prix normal réel, et le prix de référence légal peut être affiché si nécessaire (règle européenne des 30 jours).

## 18. Popups, notifications et nouveautés

Professionnels et discrets, jamais envahissants :

- **Bienvenue** (1re visite, après 10 s ou à mi-page) : « Rejoignez la communauté VIP : codes promo exclusifs jusqu'à -45 % » → bouton communauté, ou e-book gratuit.
- **Offre spéciale** (campagne active) : réduction, chrono, code à copier. Une fois par campagne et par visiteur ; sur ordinateur, aussi quand la souris quitte la page.
- **Nouveauté** (produit publié depuis moins de 7 jours, réglable) : carte élégante en bas de l'écran avec couverture, badge « Nouveau », titre, « Découvrir ». Une fois par produit et par visiteur.
- **Hésitation** (page produit, 45 s sans action) : petit encart « Une question avant d'acheter ? » → WhatsApp ou FAQ ; ou un code réel si une campagne « hésitation » est active.
- **Panier abandonné** (au retour du visiteur) : « Votre panier vous attend — l'offre se termine dans 02:14:10 ».
- **Achats récents** (option) : « Un client du Cameroun vient d'acheter [produit] ». **Vraies commandes uniquement**, sans nom complet.
- **Règles communes :**
  - **un seul popup par visite**, priorité : offre spéciale > nouveauté > bienvenue ;
  - **jamais** sur le checkout, l'écran d'attente, la page de succès, la liseuse ou le lecteur ;
  - ne cache jamais le bouton d'achat sur mobile ;
  - délai réglable, bouton fermer bien visible, choix mémorisé ;
  - aucun décalage de mise en page ;
  - tout se règle dans l'admin.

## 19. Communauté WhatsApp

- Liens configurables : **communauté FR** [LIEN_COMMUNAUTE_FR], **communauté EN** [LIEN_COMMUNAUTE_EN] (ou un seul lien), chaîne WhatsApp et groupe Telegram en option. Le site affiche le lien de la langue du visiteur.
- Présence : header, menu mobile, barre du bas, accueil, page produit, page de succès, espace client, bouton flottant, emails, messages, footer.
- Page `/communaute` : avantages (promos exclusives, nouveautés en avant-première, entraide, lives), bouton d'accès.
- Clics comptés (statistiques admin + événement `JoinCommunity`).
- Numéros WhatsApp collectés avec consentement exportables en CSV.

## 20. Produits bilingues et formats

### 20.1 Règle des deux versions

Chaque produit a une version **française** et une version **anglaise** (titre, description, contenu, couverture, aperçu). **Un achat = accès aux deux**, automatiquement.

### 20.2 E-books hébergés sur la plateforme

- Contenu structuré stocké dans la base : **chapitres → sections** (texte riche, encadrés « À retenir », listes, tableaux, citations, images, exercices, checklists), en FR et EN.
- Créé avec le **Studio IA** (section 23), écrit ou importé dans l'éditeur.
- À la publication, génération automatique : **PDF professionnel** par langue (couverture, page de titre, sommaire cliquable, en-têtes et pieds de page DigiSkool, numéros de page), nombre réel de pages, **images d'aperçu** (pages lisibles + pages floutées, section 11.1). EPUB en phase 2.
- Options par e-book : **lecture en ligne** et **téléchargement** activables séparément.

### 20.3 Formations vidéo

- Modules → leçons. Chaque leçon : **vidéo FR** et/ou **vidéo EN**, **sous-titres FR et EN**, texte, pièces jointes, quiz (phase 2).
- Si une seule vidéo existe, les sous-titres de l'autre langue sont proposés.
- **Téléchargement des vidéos activable** par formation et par leçon.
- Certificat de fin de formation (PDF, FR ou EN).

### 20.4 Vidéos à l'unité

Lecteur en ligne, sous-titres FR/EN, téléchargement activable.

### 20.5 Templates et packs

Templates téléchargeables (une version par langue si besoin). Packs à prix réduit, donnant accès à chaque produit inclus.

### 20.6 Offrir un produit

Option « Offrir » : l'acheteur saisit le nom et le numéro WhatsApp (ou l'email) du destinataire et un message ; le destinataire reçoit son accès directement.

## 21. Espace client

- **Accueil de l'espace :** produits achetés **en premier**, en grand, avec « Reprendre ma lecture » / « Reprendre ma formation » ; puis promo en cours, nouveautés, bouton communauté.
- **Ma bibliothèque :** pour chaque produit et chaque langue, **Lire / Regarder** et **Télécharger** (si activé).
- **Liseuse d'e-books** (`/compte/lire/[slug]`) : sommaire, progression, reprise automatique, **bascule FR ⇄ EN sur le même chapitre**, taille du texte, thèmes clair / sépia / sombre, plein écran, marque-pages (surlignage et notes en phase 2), chargement chapitre par chapitre, filigrane discret (nom et numéro ou email du lecteur).
- **Lecteur vidéo** (`/compte/formations/[slug]`) : modules et leçons, progression, « Marquer comme terminé », « Leçon suivante », reprise à la seconde, vitesse, qualité, sous-titres FR/EN, version FR/EN de la vidéo, téléchargement si activé, filigrane dynamique discret.
- **Mes commandes** (reçus PDF), **Mes certificats**, **Favoris**.
- **Profil :** nom, numéro WhatsApp, email, pays, langue, devise, mot de passe facultatif, préférences de notifications, appareils connectés.

## 22. Livraison sécurisée et anti-piratage

- Fichiers dans des buckets **privés**, jamais d'URL publique permanente.
- Téléchargement via une route serveur : connexion + droit d'accès + téléchargement activé + limite (réglable, ex. 10 par produit et par langue) → **URL signée de 60 secondes** → téléchargement enregistré.
- **Filigrane PDF** personnalisé au téléchargement (nom + numéro ou email de l'acheteur sur chaque page).
- Contenu des e-books envoyé au navigateur **seulement** aux clients qui y ont droit (ou pour les pages d'aperçu).
- Vidéos Bunny Stream protégées par jetons signés, domaine autorisé uniquement.

## 23. Studio IA (création automatique des produits)

Je donne les informations et la stratégie, l'IA fabrique le produit complet. Je relis et je valide toujours avant publication.

### 23.1 Création d'un e-book

1. **Brief :** sujet, public cible, problème résolu, promesse, **nombre de pages**, niveau, ton, **stratégie** (produit d'appel, principal, premium, lead magnet) et prix visé, langue de rédaction (FR ou EN), notes et documents (.pdf, .docx, .md, .txt), contexte et exemples à privilégier (Afrique, Mobile Money, réalités locales).
2. **Plan :** 3 titres + plan détaillé (chapitres, sections, pages par chapitre). Je modifie et je valide.
3. **Rédaction** chapitre par chapitre, en tâche de fond, avec progression. Longueur respectée : 1 page ≈ 300 mots (réglable dans l'admin).
4. **Traduction** complète dans l'autre langue, naturelle, même structure.
5. **Contrôle qualité :** cohérence, répétitions, longueur, informations à vérifier.
6. **Relecture** dans l'éditeur ; régénération d'un chapitre ou d'une section avec une consigne.
7. **Tout le reste, généré en FR et EN :** couverture, page produit, **page de vente publicitaire** (section 13), « Ce que vous allez apprendre », FAQ, bonus suggérés, SEO, pages d'aperçu, **prix suggéré**, posts réseaux sociaux, annonce pour la communauté.
8. **Aperçu → Publier** (ou programmer). La publication déclenche le popup « Nouveauté ».

### 23.2 Formation vidéo ou vidéo

Je charge les vidéos + un brief → transcription (fonction de l'hébergeur vidéo si disponible, sinon API de reconnaissance vocale) → **sous-titres FR et EN** → structure (modules, leçons, résumés, leçons d'aperçu conseillées) → page produit et page publicitaire FR/EN, couverture, prix suggéré, annonces → support PDF en option → relecture → publication.

### 23.3 Import de contenu existant

Pour les contenus préparés ailleurs (par exemple avec Claude dans son application ou son extension) : coller le texte ou importer un fichier → découpage en chapitres → traduction → couverture → pages de vente. Format d'import Markdown documenté dans le README.

### 23.4 Technique

Tâches de fond avec reprise en cas d'échec et notification à la fin ; **estimation du coût** avant génération, coût réel enregistré, **budget IA mensuel** ; prompts dans `3-PROMPTS-IA.md`, stockés dans des fichiers dédiés du code. Règles techniques : section 24.3.

## 24. Assistant de vente IA

### 24.1 Coach DigiSkool

- Widget de chat dans la langue du visiteur (ouvert depuis le bouton flottant ou la page produit).
- Recommande le bon produit (lien, prix actuel, promo en cours), répond à la FAQ (paiement, accès, deux versions, remboursement), explique **comment payer étape par étape**, invite à rejoindre la communauté.
- Contexte injecté depuis la base : catalogue publié, prix dans la devise du visiteur, promotions actives, FAQ, instructions de paiement du pays.
- Ne doit **jamais** inventer de produit, de prix, de réduction ou de promesse.
- Problème de commande ou de paiement → support WhatsApp.
- Limites : 20 messages par visiteur et par heure, 1 000 caractères par message.

### 24.2 Assistant de rédaction (admin)

Boutons IA partout dans l'admin : générer ou améliorer, traduire FR ⇄ EN, SEO, FAQ, posts, emails, messages WhatsApp. Résultat toujours en brouillon modifiable.

### 24.3 Règles techniques IA

- SDK officiel `@anthropic-ai/sdk`, **côté serveur uniquement**, clé `ANTHROPIC_API_KEY`.
- Modèle : `claude-opus-5-5` (`ANTHROPIC_MODEL`) ; modèle du chat réglable séparément (`ANTHROPIC_CHAT_MODEL`).
- Chat en **streaming**, `output_config.effort` sur `"low"` ; rédaction d'e-books en streaming avec `output_config.effort` sur `"high"`.
- **Sorties structurées** (`output_config.format` + schéma JSON) pour les plans, pages de vente et annonces.
- Prompt système, brief et plan **en premier** dans chaque requête (cache de prompt).
- Pas de paramètres obsolètes (`temperature`, `budget_tokens`).
- Repli automatique côté serveur en cas de refus (`fallbacks: "default"` avec la bêta `server-side-fallback-2026-07-01`), vérification de `stop_reason`, nouvelles tentatives sur 429 / 5xx / réseau, message de repli poli.
- Tokens, coût, durée et produit enregistrés pour chaque appel (`ai_jobs`).

## 25. Back-office administrateur `/admin`

Accès réservé au rôle `admin` (et `support` avec droits limités), vérifié **côté serveur**. **Entièrement utilisable depuis un téléphone.**

1. **Tableau de bord :** chiffre d'affaires (jour, 7 j, 30 j, total), ventes, panier moyen, taux de conversion, **entonnoir du checkout**, ventes par pays, langue, moyen de paiement, code promo, campagne et source (UTM), **accès non ouverts**, clics communauté, nouveaux abonnés, top produits, dernières commandes, coût IA du mois.
2. **Produits :** création et édition **FR et EN côte à côte** (« Traduire avec l'IA »), couleur de couverture, prix (par devise si besoin), **ventes antérieures**, options lecture / téléchargement / aperçu (pages lisibles, leçons gratuites), bonus, badges, offre de lancement limitée, statut brouillon / programmé / publié / archivé, indicateur « FR / EN complet », aperçu.
3. **Studio IA** (section 23).
4. **Éditeur d'e-book :** chapitres et sections (glisser-déposer), FR / EN, régénération d'une partie, aperçu liseuse, PDF et pages floutées.
5. **Formations et vidéos :** modules et leçons (glisser-déposer), vidéos FR/EN, sous-titres, pièces jointes, leçons d'aperçu, téléchargement activable.
6. **Pages de vente publicitaires :** sections modifiables FR/EN, activables, aperçu.
7. **Packs.**
8. **Promotions :** campagnes, modèles en un clic, récurrences, codes, liens, QR codes, générateur d'annonces et de visuels, statistiques.
9. **Popups et bannières :** réglages de la section 18, bannières de l'accueil, aperçu.
10. **Commandes :** filtres, détail, renvoyer l'accès (WhatsApp / SMS / email), rembourser (retire l'accès), valider un paiement manuel, offrir un produit.
11. **Clients :** recherche, historique, donner / retirer un accès, appareils connectés, export CSV.
12. **Avis et témoignages :** modération, import (captures, vidéos, avis des plateformes précédentes).
13. **Abonnés et communauté :** emails et numéros WhatsApp (avec consentement), source, langue, pays, export CSV.
14. **Pixels et suivi** (section 26).
15. **Paiements :** fournisseurs, routage par pays, devises, taux, arrondis, **instructions de paiement par opérateur et par pays** (étapes, code USSD, vidéo d'aide), messages d'erreur, paiement manuel.
16. **Messages :** modèles WhatsApp / SMS / email FR et EN, journal des envois.
17. **Paramètres :** identité, langue par défaut, liens communauté FR/EN, numéros WhatsApp, réseaux sociaux, limite de téléchargements et d'appareils, seuils d'affichage (ventes, visiteurs en direct), mots par page, budget IA.
18. **Équipe :** membres support avec droits limités.
19. **Journal d'activité :** connexions admin, téléchargements, webhooks, événements pixels, messages envoyés, générations IA.
20. **Design system** (`/admin/design`, section 7.1).

## 26. Pixels, suivi et publicité

Tout se règle **depuis l'admin** (page « Pixels et suivi »), sans toucher au code ni redéployer. Jetons secrets chiffrés (Supabase Vault), jamais envoyés au navigateur.

### 26.1 Outils pris en charge

| Outil | Navigateur | Serveur |
|---|---|---|
| Meta (Facebook / Instagram) | Pixel | API Conversions (jeton + code de test) |
| TikTok | Pixel | Events API (jeton) |
| Google Analytics 4 | gtag | Measurement Protocol |
| Google Ads | Conversions (ID + libellé d'achat), conversions améliorées | — |
| Google Tag Manager | Conteneur (option) | — |
| Snapchat | Pixel | Conversions API (option) |
| Pinterest, X (Twitter), LinkedIn | Balises (option) | — |
| Microsoft Clarity | Cartes de chaleur, enregistrements de sessions (option) | — |

Plus : champs de **vérification de domaine** (Meta, Google Search Console, TikTok, Pinterest).

### 26.2 Événements suivis

`PageView`, `ViewContent`, `Search`, `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase` (valeur après réduction, devise, identifiants produits identiques à ceux du flux catalogue, langue), `Lead` (lead magnet), `CompleteRegistration`, `Contact` (support WhatsApp), `JoinCommunity` (événement personnalisé).

### 26.3 Fiabilité

- `Purchase` envoyé **côté serveur** à la confirmation du paiement **et** côté navigateur sur la page de succès, avec le **même `event_id`** : pas de doublon, et l'achat est compté même avec un bloqueur de publicités ou sur iPhone.
- **Correspondance avancée** côté serveur : numéro (format international) et email **hachés** (SHA-256), prénom, nom, pays, ville, identifiant client haché, IP, navigateur, cookies `_fbp` / `_fbc`, `ttclid`.
- Capture de `fbclid`, `ttclid`, `gclid` et des **UTM** (premier et dernier contact, 30 jours), enregistrés avec la commande.
- **Devise de reporting** réglable (ex. USD) : si la plateforme publicitaire n'accepte pas la devise locale, la valeur est convertie.
- **Flux catalogue produits** (CSV/XML) par langue pour les publicités dynamiques Meta et TikTok.

### 26.4 Guide de connexion intégré

Dans l'admin, pour chaque outil, un guide pas à pas en français : où trouver l'identifiant du pixel, comment créer le jeton de l'API serveur, comment vérifier le domaine, où trouver le code de test.

### 26.5 Page « Santé du suivi »

- **Pastille verte / orange / rouge** par outil : identifiant valide, dernier événement reçu, erreurs de l'API.
- Pourcentage d'événements avec numéro / email (qualité de la correspondance).
- Bouton **« Simuler un parcours d'achat test »** : envoie `PageView` → `ViewContent` → `AddToCart` → `InitiateCheckout` → `Purchase` en mode test, visibles dans les outils de test de Meta et TikTok.
- Liste des derniers événements envoyés, avec leur statut.

### 26.6 Liens pour les publicités

- **Générateur de liens** : produit ou page publicitaire + UTM + code promo facultatif → lien court prêt à coller.
- **Paramètres d'URL prêts à copier :**
  - Meta : `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`
  - TikTok : `utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_term=__AID_NAME__&utm_content=__CID_NAME__`
- Rapport des ventes par campagne, ensemble de publicités et publicité.

### 26.7 Consentement

Bannière cookies FR/EN (accepter / refuser / personnaliser). Mode réglable dans l'admin : consentement obligatoire avant chargement des pixels (obligatoire pour les visiteurs européens) ; Google Consent Mode v2.

## 27. Emails, WhatsApp et SMS

Tous en FR et EN (langue du client), courts, avec un seul bouton ou lien.

**WhatsApp** (modèles validés par Meta, SMS en secours) :
1. **Accès au produit** (immédiatement après le paiement).
2. Code de connexion (« Retrouver mon achat »).
3. Paiement en attente / échoué, avec lien pour réessayer.
4. Panier abandonné (1 h après, avec la promo en cours s'il y en a une).
5. Demande d'avis (J+3 ou à 50 % d'une formation).
6. Relance « accès non ouvert » (30 min après le paiement).
7. Nouveautés et promotions : **uniquement** pour les clients qui ont accepté de les recevoir.

**Email :** bienvenue, confirmation + accès aux deux versions + invitation communauté, paiement en attente / échoué, lead magnet, panier abandonné, nouveau produit (aux abonnés), réinitialisation du mot de passe.

**Notifications admin :** chaque vente, accès non ouvert, paiement manuel à valider, génération IA terminée, promo récurrente déclenchée (email ; WhatsApp ou Telegram en option).

Modèle du message d'accès :
- FR : « Merci {{prénom}} ! ✅ Votre achat *{{produit}}* est confirmé. Accédez-y ici (versions FR + EN) : {{lien}} — Besoin d'aide ? Répondez à ce message. »
- EN : « Thank you {{first_name}}! ✅ Your purchase *{{product}}* is confirmed. Access it here (FR + EN versions): {{link}} — Need help? Just reply to this message. »

## 28. Modèle de données (Postgres / Supabase)

Montants en **entiers** dans la plus petite unité de la devise. Chaque table : `id uuid`, `created_at`, `updated_at` si modifiable. Champs traduits dans des tables `*_translations` avec `locale` (`fr` | `en`).

**Utilisateurs**
- `profiles` : `id` (= `auth.users.id`), `full_name`, `phone` (format international, unique), `email` (facultatif), `whatsapp_optin`, `country`, `preferred_locale`, `preferred_currency`, `role` (`customer` | `support` | `admin`).
- `user_devices` : `user_id`, `device_hash`, `last_seen_at`.

**Catalogue**
- `categories` + `category_translations` (`name`, `slug`, `description`).
- `products` : `type` (`ebook` | `course` | `video` | `template` | `bundle`), `category_id`, `base_price`, `base_currency`, `cover_color`, `status` (`draft` | `scheduled` | `published` | `archived`), `published_at`, `content_updated_at`, `is_featured`, `reading_enabled`, `download_enabled`, `preview_pages` (int[]), `preview_seconds`, `target_pages`, `words_per_page`, `duration_minutes`, `historical_sales`, `show_sales_count`, `launch_limit`, `sales_count`, `rating_avg`, `rating_count`.
- `product_translations` : `product_id`, `locale`, `title`, `slug` (unique par langue), `subtitle`, `short_description`, `description`, `benefits` (text[]), `learning_outcomes` (text[]), `target_audience`, `not_for`, `faq` (jsonb), `seo_title`, `seo_description`, `cover_url`, `cover_variants` (jsonb), `pdf_path`, `page_count`, `preview_images` (jsonb : pages lisibles et floutées), `is_complete`.
- `product_bonuses` + `product_bonus_translations` (`title`, `description`, `value`).
- `product_prices` : `product_id`, `currency`, `price`.
- `price_history` : `product_id`, `currency`, `price`, `effective_from`.
- `bundle_items` : `bundle_id`, `product_id`.
- `landing_pages` : `product_id`, `locale`, `sections` (jsonb), `is_active`.
- `short_links` : `code`, `target_path`, `promo_code`, `utm` (jsonb), `clicks`.
- `banners` + `banner_translations`.

**E-books**
- `ebook_chapters` : `product_id`, `position`, `page_budget`.
- `ebook_chapter_translations` : `chapter_id`, `locale`, `title`, `content` (jsonb Tiptap), `word_count`, `is_free_preview`.

**Formations et vidéos**
- `course_modules` + `course_module_translations`.
- `course_lessons` : `module_id`, `position`, `video_fr_id`, `video_en_id`, `duration_seconds`, `is_free_preview`, `download_enabled`.
- `course_lesson_translations` : `lesson_id`, `locale`, `title`, `summary`, `content`, `subtitles_path`, `transcript`, `attachments` (jsonb).

**Progression**
- `reading_progress`, `bookmarks`, `lesson_progress`, `certificates` (comme décrit en sections 20 et 21).

**Ventes et accès**
- `checkout_sessions` : `token_hash`, `user_id`, `order_id`, `expires_at`, `used_at`.
- `checkout_events` : `checkout_session_id`, `step`, `created_at` (entonnoir).
- `orders` : `order_number` (ex. `DS-2026-000123`), `user_id`, `full_name`, `phone`, `email`, `country`, `locale`, `currency`, `status` (`pending` | `awaiting_validation` | `paid` | `failed` | `refunded` | `cancelled`), `subtotal`, `discount_amount`, `total`, `coupon_id`, `campaign_id`, `payment_provider`, `payment_method`, `provider_reference`, `provider_payload`, `failure_code`, `utm_first`, `utm_last`, `click_ids` (jsonb), `is_gift`, `paid_at`, `first_access_at`.
- `order_items` : `order_id`, `product_id`, `product_title`, `unit_price`, `discount`, `is_order_bump`.
- `gifts` : `order_id`, `recipient_name`, `recipient_phone`, `recipient_email`, `message`, `claimed_at`.
- `entitlements` : `user_id`, `product_id`, `order_id`, `source` (`purchase` | `gift` | `manual`), `first_opened_at`, `revoked_at`. Unique (`user_id`, `product_id`). **Accès aux deux langues.**
- `access_links` : `token_hash`, `user_id`, `channel`, `expires_at`, `last_used_at`.
- `download_counts` : `user_id`, `product_id`, `locale`, `count`.
- `webhook_events` : `provider`, `event_id` (unique), `payload`, `processed_at`.

**Promotions**
- `promotions` + `promotion_translations` (comme section 17.1, plus `recurrence`, `launch_limit`).
- `coupons` : `code`, `promotion_id`, `discount_type`, `value`, `channel`, `max_uses`, `used_count`, `per_customer_limit`, `product_ids`, `starts_at`, `ends_at`, `is_active`.
- `announcements` + `announcement_translations` (popups, section 18).

**Preuves sociales et marketing**
- `reviews` : `product_id`, `user_id`, `rating`, `comment`, `locale`, `photo_path`, `helpful_count`, `is_verified`, `source` (`platform` | `imported`), `is_approved`.
- `testimonials` : `type` (`text` | `screenshot` | `video`), `product_id`, `author_name`, `country`, `content`, `media_path`, `source`, `testimonial_date`, `locale`, `is_published`.
- `wishlists` : `user_id`, `product_id`.
- `subscribers` : `email`, `whatsapp`, `full_name`, `source`, `locale`, `country`, `consent_email`, `consent_whatsapp`, `unsubscribed_at`.
- `community_clicks`, `tracking_settings`, `tracking_events`.

**Messages**
- `message_templates` : `channel` (`whatsapp` | `sms` | `email`), `key`, `locale`, `content`, `provider_template_name`.
- `message_logs` : `channel`, `template_key`, `recipient`, `order_id`, `status`, `provider_message_id`, `error`.

**Paiement**
- `payment_routes` : `country`, `provider`, `methods`, `position`, `is_active`.
- `payment_instructions` : `country`, `method`, `locale`, `steps` (jsonb), `ussd_code`, `help_video_url`.
- `exchange_rates` : `currency`, `rate_from_base`, `rounding_rule`, `updated_at`.

**IA et configuration**
- `ai_briefs`, `ai_jobs` (types : `outline`, `chapter`, `translation`, `quality`, `product_page`, `landing_page`, `cover`, `course_page`, `subtitles`, `promo_message`, `import`).
- `settings`, `activity_logs`.

**RLS**
- Un client ne voit que son profil, ses commandes, ses accès, sa progression, ses favoris, ses certificats.
- Le public lit les produits publiés et leurs traductions, catégories, avis et témoignages publiés, promotions, popups et bannières actifs, pages publicitaires actives.
- Contenu des chapitres et leçons payants : lisible uniquement avec un droit d'accès, ou s'il est marqué en aperçu gratuit.
- Seul l'admin écrit dans le catalogue et les réglages ; le rôle `support` a des droits limités. Fonctions `is_admin()` et `has_access(product_id)`.
- Écritures liées au paiement et aux accès uniquement côté serveur.

## 29. Sécurité et conformité

- RLS testée sur toutes les tables.
- `/admin` protégé par middleware **et** vérification du rôle côté serveur ; double authentification pour l'admin.
- Jetons d'accès (checkout, liens, codes) : aléatoires, stockés hachés, à durée limitée, à usage unique quand c'est prévu.
- Validation Zod côté serveur, contenu riche nettoyé (XSS).
- Limitation des requêtes : connexion et codes, checkout, codes promo (anti-essais en masse), chat IA, formulaires.
- En-têtes de sécurité (CSP compatible avec les pixels, HSTS…).
- Aucune clé secrète côté navigateur.
- Sauvegardes Supabase ; suivi des erreurs avec Sentry.
- Pages légales FR et EN ; consentements cookies, WhatsApp et email ; désinscription possible depuis chaque message marketing.

## 30. SEO

- Métadonnées par page et par langue, `hreflang`, `canonical`, `sitemap.xml`, `robots.txt`.
- JSON-LD : `Product` (offre en cours, note), `Course`, `Book`, `Organization`, `FAQPage`, `BreadcrumbList`.
- Images Open Graph par produit et par langue (beau rendu sur WhatsApp et Facebook).
- Pages publicitaires (`/offre`) exclues de l'indexation.

## 31. Performance et qualité

- Lighthouse mobile ≥ 90 ; LCP < 2,5 s, INP < 200 ms, CLS < 0,1 en 4G, **pixels actifs**.
- Rendu statique / ISR pour les pages publiques, revalidé à chaque modification dans l'admin.
- Pixels et scripts tiers chargés sans bloquer l'affichage.
- Skeletons, états vides et messages d'erreur soignés dans les deux langues.
- PWA (installable sur l'écran d'accueil) : phase 2.

## 32. Variables d'environnement (`.env.example`)

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

WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
SMS_PROVIDER=
SMS_API_KEY=
SMS_SENDER_ID=

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

Identifiants de pixels, liens de communauté et numéros WhatsApp affichés : réglés dans l'admin.

## 33. Livrables attendus

- Code complet, arborescence claire.
- Migrations SQL Supabase : tables, index, contraintes, RLS, triggers, fonctions, buckets.
- Fichiers de traduction `fr.json` et `en.json` complets.
- Page `/admin/design` (design system).
- Données de démonstration **bilingues** : 3 catégories, 3 e-books (avec chapitres et aperçus), 2 formations (avec leçons gratuites), 1 vidéo, 1 pack, 1 campagne à -45 %, 2 codes promo, avis et témoignages de démonstration clairement marqués « démo » (à supprimer avant le lancement).
- `.env.example` et `README.md` (installation, configuration de chaque service, déploiement, rôle admin, format d'import Markdown, validation des modèles WhatsApp chez Meta).
- **Tests automatisés** au minimum :
  - webhook de paiement (signature invalide, webhook reçu deux fois, montant ou devise incorrects) ;
  - calcul des prix (promotions, priorités, codes, devises, arrondis) ;
  - connexion automatique après paiement (jeton à usage unique, refusé si commande non payée) ;
  - « Retrouver mon achat » (code correct, incorrect, expiré, limite d'essais) ;
  - accès refusé aux chapitres, leçons et téléchargements sans achat ou si désactivé ;
  - aperçu e-book : le texte des pages verrouillées n'est jamais envoyé ;
  - détection de la langue.
- **Tests de bout en bout** (Playwright), en FR et en EN, sur un écran de 360 px : publicité → page produit → checkout → paiement test → produit ouvert. **Objectif : moins de 60 secondes et au maximum 3 champs à remplir.**

## 34. Méthode de travail

Travaille **phase par phase**, dans cet ordre :

1. Fondations et bilingue
2. Design system et couvertures
3. Boutique publique
4. Page produit, aperçus et preuves sociales
5. Promotions, popups et communauté
6. Checkout express, paiements et accès immédiat
7. Espace client : liseuse et lecteur vidéo
8. Back-office admin
9. Studio IA
10. Pixels et pages publicitaires
11. Assistant de vente IA, messages marketing et pages légales
12. Tests, sécurité et mise en ligne

À la fin de chaque phase : résume ce qui est fait, ce qui reste, et **comment je peux tester moi-même**. Si une information manque, choisis l'option la plus simple et la plus sûre, puis signale-le. Composants réutilisables, pas de duplication, commentaires courts et utiles.
