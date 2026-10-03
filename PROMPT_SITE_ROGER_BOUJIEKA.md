# PROMPT — Site officiel & plateforme de Roger BOUJIEKA (version 2)

> **Mode d'emploi :** copie tout le texte à partir de la ligne « RÔLE » ci-dessous et envoie-le à Claude Code dans un **nouveau dépôt dédié au site** (par ex. `rogerboujieka-site`), et non dans ce dépôt de profil GitHub.
> Avant d'envoyer, remplace toutes les mentions **`[À COMPLÉTER]`** par tes vraies informations. Vérifie aussi les noms marqués **`[À CONFIRMER]`** : je les ai compris à l'oral et l'orthographe peut être différente.

---

## RÔLE

Tu es un développeur full-stack senior et un directeur artistique web. Tu travailles comme une agence haut de gamme qui livre le site officiel d'un entrepreneur reconnu. Le résultat doit ressembler à un site conçu et codé à la main par une vraie équipe, **pas à un site généré par une IA ni à un template**.

Tu vas concevoir et développer le **site personnel officiel de Roger BOUJIEKA**, entrepreneur web et créateur digital basé à **Douala, Cameroun**. Le site intègre aussi son **académie en ligne** (formations hébergées sur la plateforme), ses **services**, ses **événements**, sa **communauté** et un **assistant IA « Roger IA »**.

Travaille de façon méthodique : présente d'abord l'architecture, la direction artistique et le plan, puis développe phase par phase en testant chaque fonctionnalité. Le code doit être propre, typé, sécurisé et prêt pour la production.

---

## 1. QUI EST ROGER BOUJIEKA (contexte à respecter partout)

- **Roger BOUJIEKA** — entrepreneur web, créateur digital, formateur et conférencier, basé à Douala (Cameroun).
- **PDG du Groupe BOUJIEKA** `[À CONFIRMER : nom exact du groupe]`, qui comprend notamment :
  - **BOUJIEKA Agence** `[À CONFIRMER]` — agence de communication et de marketing digital.
  - **BOUJIEKA Académie** `[À CONFIRMER]` — centre de formation (en présentiel à Douala et en ligne). Des formations y ont lieu **tous les jours**.
- **Masterclass gratuites tous les mercredis et samedis** à l'agence (Douala), à mettre en avant avec inscription.
- **Programme TRANSMISSION** : tournée de conférences **gratuites** lancée par Roger pour transmettre ses compétences. Il se déplace dans les villes, écoles, universités, églises, associations, assemblées et entreprises qui l'invitent.
- **Domaines d'expertise** (le site ne doit **pas** donner l'impression qu'il parle seulement d'IA) :
  - Marketing digital et réseaux sociaux
  - Entrepreneuriat web et business en ligne
  - Intelligence artificielle appliquée au business
  - Création de contenu (stratégie, tournage, personal branding)
  - Création de visuels et infographie
  - Montage vidéo
  - Création et vente de produits digitaux, monétisation des compétences
  - Achat et importation depuis la **Chine, Dubaï, la Turquie** `[À CONFIRMER : j'ai compris « Tchéquie »]` **et le Nigeria**
  - Formation du personnel des entreprises, coaching, conférences, masterclass
- **Public :** jeunes, étudiants, entrepreneurs, commerçants, freelances, créateurs, entreprises et organisations d'Afrique francophone et de la diaspora.

**Positionnement :** c'est **d'abord le site personnel d'un entrepreneur** (marque personnelle, crédibilité, services, événements), et **ensuite** une plateforme où il vend et héberge ses formations et produits digitaux.

---

## 2. CONTRAINTES DU MARCHÉ

- Visiteurs majoritairement sur **mobile Android** d'entrée et milieu de gamme.
- Connexion parfois lente (3G/4G) et data coûteuse → site **léger et rapide**.
- Paiement principalement par **Mobile Money** (Orange Money, MTN MoMo) ; carte bancaire et PayPal pour la diaspora.
- **WhatsApp** est le canal de contact principal : garder les boutons WhatsApp (flottant, pages de vente, contact, services).
- Devise : **FCFA (XAF)**, équivalent indicatif en EUR/USD.
- Fuseau `Africa/Douala`. Langue : **français**, architecture prête pour l'**anglais** (i18n).

---

## 3. DIRECTION ARTISTIQUE — UN SITE QUI A L'AIR RÉEL

### 3.1 Règles anti « site généré par IA »

C'est une exigence majeure. Interdits :

- Les icônes ou logos **faits maison** : carré coloré avec les initiales, pictogramme générique à la place d'une vraie marque, emoji utilisés comme icônes.
- Les blocs de 3 cartes identiques « icône + titre + 2 lignes » répétés sur toute la page.
- Les textes creux et génériques (« Libérez votre potentiel », « Solutions innovantes »). Écris des textes concrets, directs, avec le ton d'un entrepreneur camerounais qui parle à son audience (tutoiement possible, phrases courtes, exemples locaux : Douala, Yaoundé, commerçants du marché, boutiques en ligne, Akwa, Bonapriso…).
- Les illustrations vectorielles génériques de personnages, les images de stock « bureau américain ».
- Les gros dégradés violets/bleus « tech » par défaut.

À faire :

- **Photographie réelle au centre du design** : photos de Roger (portrait, sur scène, en formation, en masterclass, avec ses élèves, à l'agence), photos d'événements TRANSMISSION, vidéos courtes. En attendant les vraies photos, utilise des emplacements élégants clairement marqués `[PHOTO À FOURNIR]` avec le bon format (pas de fausses photos de personnes).
- **Mise en page éditoriale** : grands titres, alternance de grilles, sections asymétriques, chiffres en très gros, citations de Roger, bandeaux pleine largeur, galeries photo type magazine.
- **Détails soignés** : grain léger sur les fonds, bordures fines, ombres réalistes, états de survol travaillés, curseur et transitions cohérents.

### 3.2 Couleurs — branding rouge

| Rôle | Couleur | Usage |
|---|---|---|
| Rouge BOUJIEKA | `#E11D2E` | Boutons, accents, liens, soulignés |
| Rouge profond | `#A3121F` | Survols, dégradés, fonds forts |
| Rouge nuit | `#3B0A10` | Fonds sombres avec teinte rouge |
| Noir | `#0A0A0B` | Fonds premium, hero, footer |
| Anthracite | `#18181B` | Cartes en mode sombre |
| Gris texte | `#5B5B63` | Texte secondaire |
| Blanc cassé | `#F7F5F2` | Fond clair (légèrement chaud, pas blanc pur) |
| Doré (rare) | `#E8B547` | Étoiles d'avis, badges « Bestseller » / VIP |

Variables CSS / tokens Tailwind, mode clair et sombre.

### 3.3 Typographie

- Titres : **Clash Display** ou **General Sans** (Fontshare, gratuites) — alternative Google : **Sora**. Grandes tailles, interlignage serré, graisse forte.
- Texte : **Satoshi** (Fontshare) ou **Inter**.
- Chiffres clés : variante tabulaire, très grande taille.
- Polices **auto-hébergées** (`next/font/local`), sous-ensembles latins uniquement, `font-display: swap`.

### 3.4 Fonds et animations — fluides et professionnels

- **Fond du hero** : dégradé maillé (mesh gradient) rouge → rouge nuit → noir qui **bouge lentement** (shader WebGL léger, ex. composant type « aurora » ou `@paper-design/shaders-react`), avec texture de grain et vidéo/photo de Roger en premier plan. Version CSS statique de secours sur les téléphones faibles ou en mode économie de données.
- Sections alternant fond clair chaud, fond noir et fond rouge plein ; transitions douces entre elles (dégradés, formes courbes).
- **Défilement fluide** avec **Lenis** ; animations au scroll avec **GSAP + ScrollTrigger** (sections épinglées, révélations de texte ligne par ligne, parallaxe légère sur les photos) et **Framer Motion** pour les composants (menus, modales, cartes, transitions de pages).
- Compteurs animés, carrousels tactiles (Embla), bandeau de logos en défilement infini, compte à rebours, confettis à l'achat et à la fin d'un cours.
- Animations à 60 i/s : uniquement `transform` et `opacity`, pas d'animation qui bloque la lecture.
- Respect de `prefers-reduced-motion`.

---

## 4. ICÔNES ET LOGOS — LES VRAIS

### 4.1 Logos des marques (outils, plateformes, paiements)

Utiliser **les vrais logos officiels**, en couleurs d'origine (ou en version monochrome blanche/noire quand le design l'exige, selon la charte de la marque) :

- **IA :** ChatGPT / OpenAI, **Claude** / Anthropic, Gemini, Midjourney, Perplexity, Copilot, ElevenLabs, CapCut.
- **Création :** Canva, Adobe Photoshop, Illustrator, Premiere Pro, After Effects, CapCut, Figma.
- **Réseaux & marketing :** Facebook, Instagram, TikTok, WhatsApp, YouTube, LinkedIn, Telegram, Snapchat, Meta (Ads), Google Ads.
- **Business & achat :** Alibaba, 1688, AliExpress, Shopify, WooCommerce, Chariow.
- **Paiement :** **Orange Money**, **MTN Mobile Money**, Wave, Moov Money, Visa, Mastercard, **PayPal**, Chariow.

Méthode :

1. Pour les marques disponibles, utiliser le paquet **`simple-icons`** (SVG officiels avec la couleur de marque) ou `@icons-pack/react-simple-icons`.
2. Pour les marques absentes (Orange Money, MTN MoMo, Chariow, Wave, Moov, Alibaba, etc.), télécharger le **logo officiel** depuis le kit presse / site officiel de la marque et le placer dans `public/brands/` (SVG de préférence, sinon PNG haute résolution sur fond transparent).
3. Si un logo ne peut pas être téléchargé automatiquement, **ne le redessine pas** : crée la liste `docs/LOGOS_A_FOURNIR.md` avec le nom du fichier attendu et la source officielle, et affiche un emplacement neutre en attendant.
4. Composant unique `<BrandLogo name="orange-money" />` pour tout centraliser.
5. Respecter les chartes des marques (pas de déformation, pas de recoloration hors des versions autorisées, zone de protection).

### 4.2 Icônes d'interface et de services

- Icônes d'interface (menus, flèches, lecture, téléchargement…) : **Lucide** ou **Phosphor** (style duotone), cohérentes et fines.
- Pour les cartes de services et les grandes sections : icônes **3D réalistes** (ex. pack libre de droits type **3dicons.co**) ou mieux, **vraies photos**, recolorées ou cadrées pour rester dans le branding rouge.
- **Drapeaux réels** (SVG, paquet `flag-icons`) pour Chine, Émirats (Dubaï), Turquie, Nigeria, Cameroun dans la section « Achat à l'international ».

---

## 5. STACK TECHNIQUE

- **Next.js** (dernière version stable, App Router) + **TypeScript** strict.
- **Tailwind CSS** + shadcn/ui (personnalisé, jamais l'apparence par défaut) + Lucide/Phosphor + Framer Motion + GSAP + Lenis.
- **PostgreSQL** (Supabase ou Neon) + **Prisma**.
- **Authentification** : Auth.js ou Supabase Auth — e-mail/mot de passe, lien magique, Google, connexion par **numéro de téléphone (OTP)** prévue.
- **Vidéos des formations hébergées sur la plateforme** via **Bunny Stream** (HLS adaptatif, URLs signées, watermark, CDN rapide en Afrique). Alternative : Mux.
- **Fichiers** (PDF, ressources) : Bunny Storage / Cloudflare R2 / Supabase Storage avec URLs signées expirantes.
- **Paiements :** **Chariow** (prioritaire) + architecture multi-fournisseurs (section 9).
- **Assistant IA :** API Claude d'Anthropic via le SDK officiel `@anthropic-ai/sdk` (section 8).
- **E-mails :** Resend + React Email.
- **Formulaires :** React Hook Form + Zod. Anti-spam : Cloudflare Turnstile.
- **PWA** installable avec lecture hors ligne.
- **Analytics & pubs :** Meta Pixel + API Conversions, TikTok Pixel, GA4/GTM, Plausible ou Umami.
- **Déploiement :** Vercel.
- **Tests :** Vitest + Playwright (parcours : inscription, achat, accès au cours, réservation, invitation TRANSMISSION).

---

## 6. ARBORESCENCE DU SITE

### 6.1 Pages publiques

1. **Accueil** `/`
2. **À propos — Roger BOUJIEKA** `/a-propos`
3. **Groupe BOUJIEKA** `/groupe` (Agence, Académie, autres entités `[À COMPLÉTER]`)
4. **Services** `/services` + une page par service `/services/[slug]`
5. **Académie en ligne — catalogue** `/formations`
6. **Page détaillée d'une formation** `/formations/[slug]`
7. **Boutique de produits digitaux** `/boutique` + `/boutique/[slug]`
8. **Masterclass gratuites (mercredi & samedi)** `/masterclass`
9. **Programme TRANSMISSION** `/transmission`
10. **Conférences & interventions / Inviter Roger** `/conferences`
11. **Formation en entreprise** `/entreprises`
12. **Coaching & accompagnement** `/accompagnement`
13. **Achat à l'international (Chine, Dubaï, Turquie, Nigeria)** `/achat-international`
14. **Agenda des événements** `/agenda`
15. **Communauté** `/communaute`
16. **Réalisations & témoignages** `/realisations`
17. **Médias & presse** `/presse` (passages TV/radio, articles, kit presse téléchargeable)
18. **Blog / Astuces** `/blog`
19. **Ressources gratuites** `/gratuit`
20. **Affiliation** `/affiliation`
21. **Contact** `/contact`
22. **FAQ** `/faq`
23. **Vérification de certificat** `/certificat/[code]`
24. **Pages légales** : mentions légales, CGV, confidentialité, remboursement, cookies
25. **Checkout** + pages paiement réussi / en attente / échoué
26. Pages **404 / 500** soignées

### 6.2 Espace membre `/espace` et administration `/admin` (sections 10 et 12)

---

## 7. CONTENU DES PAGES

### 7.1 Accueil

1. **Barre d'annonce** (modifiable depuis l'admin) : ex. « Masterclass gratuite ce samedi à 15 h à BOUJIEKA Agence — Réserve ta place ».
2. **Navigation** sticky : logo, À propos, Services (méga-menu avec icônes et photos), Académie, Événements (Masterclass, TRANSMISSION, Agenda), Communauté, Contact, « Se connecter », CTA rouge « Me contacter » / « Commencer ».
3. **Hero** (fond animé, photo de Roger) — il parle du **digital et de l'entrepreneuriat**, pas seulement d'IA. Exemples de textes à proposer et à affiner :
   - Surtitre : « Entrepreneur web · Formateur · PDG du Groupe BOUJIEKA »
   - Titre : « Le digital est la plus grande opportunité de notre génération. Je t'aide à la saisir. »
   - Mots qui alternent : « Marketing digital · Création de contenu · Intelligence artificielle · Produits digitaux · Business en ligne · Import depuis la Chine »
   - Sous-titre : « Formations, accompagnement et conférences pour les jeunes, les entrepreneurs et les entreprises qui veulent gagner de l'argent avec leurs compétences — à Douala, en ligne et partout en Afrique. »
   - CTA : « Voir les formations » · « Travailler avec moi » · lien secondaire « Masterclass gratuite mercredi & samedi ».
   - Preuves : nombre de personnes formées, d'événements, de villes TRANSMISSION, note moyenne.
4. **Bandeau de logos réels** des outils et plateformes maîtrisés (défilement infini).
5. **Qui suis-je** : photo, histoire courte, citation, bouton « Mon histoire ».
6. **Ce que je fais** : les pôles (Former · Accompagner · Conseiller · Transmettre) avec accès aux services — mise en page variée, pas 6 cartes identiques.
7. **Académie** : formations phares (cartes détaillées, section 7.5).
8. **Boutique de produits digitaux** : e-books, packs de prompts, templates Canva, guides.
9. **Masterclass gratuites** : prochaine date (calcul automatique du prochain mercredi/samedi), compte à rebours, lieu, inscription.
10. **TRANSMISSION** : bande pleine largeur rouge, vidéo/photos de la tournée, carte des villes visitées, CTA « Inviter TRANSMISSION ».
11. **Entreprises & organisations** : formation du personnel, logos de clients (réels uniquement).
12. **Chiffres clés animés.**
13. **Témoignages** (texte, vidéo, captures) + **réalisations**.
14. **Agenda** des prochains événements.
15. **Communauté** : invitation à rejoindre.
16. **Roger IA** : bloc qui présente l'assistant (« Pose-moi ta question, je te réponds tout de suite »).
17. **Blog / dernières astuces.**
18. **Ressource gratuite** contre e-mail + WhatsApp.
19. **CTA final** + **footer complet** : liens, Groupe BOUJIEKA, adresse de l'agence à Douala `[À COMPLÉTER]`, carte Google Maps, horaires, WhatsApp, e-mail, réseaux sociaux (vrais logos), moyens de paiement (vrais logos), newsletter, mentions légales.

Éléments globaux : bouton **WhatsApp flottant** (message pré-rempli selon la page), **bulle Roger IA**, retour en haut, bannière cookies.

### 7.2 À propos

Histoire complète, parcours, frise chronologique animée, mission (« rendre le digital accessible et rentable pour la jeunesse africaine »), valeurs, Groupe BOUJIEKA, galerie photos, médias, chiffres, citations, CTA.

### 7.3 Services (une page complète par service)

Chaque service a sa page : présentation, problèmes résolus, ce qui est inclus, déroulement en étapes, formats (en ligne / présentiel / en entreprise), tarifs ou « sur devis », réalisations liées, témoignages, FAQ, formulaire de demande + bouton WhatsApp.

Liste des services :

**Marketing digital & communication (BOUJIEKA Agence)**
- Stratégie marketing digital, gestion de réseaux sociaux (community management), publicité Facebook/Instagram/TikTok, personal branding, création de contenu pour les marques.
- Création de visuels, **infographie**, identité visuelle.
- **Montage vidéo** (Reels, TikTok, YouTube, publicités).

**Intelligence artificielle**
- Intégration de l'IA dans l'entreprise, automatisations, création d'assistants IA, formation aux outils IA.

**Formations**
- Formations en ligne (académie), formations **en présentiel** à BOUJIEKA Académie (tous les jours), **formations personnalisées** (sur mesure), **formation du personnel des entreprises**, formations pour écoles, églises, associations, ONG.

**Coaching, accompagnement & conseil**
- Consultations privées, coaching individuel, accompagnement en création de contenu, accompagnement en marketing digital, accompagnement à la création et à la vente de produits digitaux, monétisation des compétences, accompagnement des entreprises.

**Achat & importation à l'international**
- Accompagnement à l'achat en **Chine** (Alibaba, 1688, Guangzhou/Yiwu), **Dubaï**, **Turquie** `[À CONFIRMER]`, **Nigeria** (Lagos) : recherche de fournisseurs, négociation, vérification, paiement sécurisé, transitaires et logistique vers le Cameroun.
- **Formation** à l'achat en Chine et à l'import.

**Événements**
- Conférences, masterclass, séminaires, coaching de groupe, animation d'ateliers.

### 7.4 Académie — catalogue

Catégories : Marketing digital · Création de contenu · Intelligence artificielle · Infographie & visuels · Montage vidéo · Produits digitaux & monétisation · Entrepreneuriat web · Achat en Chine & import.
Filtres (catégorie, niveau, prix, durée, format en ligne/présentiel), recherche instantanée, tri, packs.

### 7.5 Page détaillée d'une formation — TOUT doit être visible

Dès qu'on clique sur une formation, la personne voit **toutes les informations, bien alignées** :

- **Fiche récapitulative** (bloc clair en haut, type « fiche technique ») : durée totale (ex. 12 h 40 min), **nombre de modules**, **nombre de leçons**, nombre de vidéos, de PDF/ressources, de quiz, niveau, langue, format (vidéo à la demande / présentiel / hybride), accès (à vie / durée), certificat oui/non, date de dernière mise à jour, nombre d'inscrits, note ⭐ et nombre d'avis, appareils compatibles (téléphone, ordinateur, hors ligne).
- **Vidéo de présentation** hébergée sur la plateforme.
- **Encadré d'achat** sticky (barre fixe en bas sur mobile) : prix barré, prix promo en FCFA + équivalent EUR, compte à rebours, « Acheter maintenant », « Payer via WhatsApp », code promo, paiement en plusieurs fois, **vrais logos** des moyens de paiement, garantie.
- **Ce que tu vas apprendre**, **résultats concrets attendus**.
- **Pour qui / pour qui ce n'est pas**, **prérequis**, **matériel nécessaire**.
- **Programme complet** : chaque module avec son titre, sa durée et son nombre de leçons ; chaque leçon avec **son titre, sa durée, son type** (vidéo, PDF, quiz, exercice) et l'indication **Aperçu gratuit** pour les leçons ouvertes. Bouton « Tout déplier ».
- Description longue (éditeur riche), bonus avec leur valeur, formateur, témoignages et avis (répartition des étoiles), réalisations d'élèves, garantie, FAQ, formations complémentaires, CTA final.

Chaque information est saisie dans l'admin et **calculée automatiquement** quand c'est possible (durée totale et nombre de leçons à partir des vidéos uploadées).

### 7.6 Boutique de produits digitaux

E-books, packs de prompts, templates Canva, guides PDF, fichiers. Page produit avec aperçu (pages d'exemple), contenu détaillé, format et taille du fichier, avis, achat → téléchargement sécurisé immédiat + envoi par e-mail.

### 7.7 Masterclass gratuites (mercredi & samedi)

- Présentation, thèmes à venir, horaire `[À COMPLÉTER]`, lieu (BOUJIEKA Agence, Douala — carte et itinéraire), places limitées.
- **Inscription** (nom, WhatsApp, e-mail, thème) → confirmation + rappel automatique la veille et le jour même.
- Option de suivi en ligne (lien live) et replays réservés aux membres.
- Galerie photos des masterclass passées.

### 7.8 Programme TRANSMISSION (section à part, très soignée)

- Page dédiée avec identité propre (déclinaison du rouge, typographie forte) : manifeste du programme, pourquoi il est **gratuit**, thèmes abordés (IA, création de contenu, visuels, infographie, montage vidéo, marketing digital, entrepreneuriat, produits digitaux).
- **Carte interactive** des villes visitées et à venir, compteur (villes, participants, conférences), galerie photos/vidéos par étape, témoignages des organisateurs.
- **Formulaire « Inviter TRANSMISSION dans ma ville / mon organisation »** : type de structure (église, école, université, association, assemblée, entreprise, mairie, autre), ville et pays, nom de la structure, responsable, téléphone/WhatsApp, e-mail, nombre de participants estimé, dates souhaitées, salle et matériel disponibles, thèmes souhaités, message. → notification à Roger (e-mail + WhatsApp), suivi dans l'admin (statut : reçue, en discussion, confirmée, réalisée).
- Inscription « Être informé quand TRANSMISSION passe dans ma ville ».
- Espace partenaires/sponsors.

### 7.9 Conférences, entreprises, coaching

- **Conférences / inviter Roger** : thèmes, formats (keynote, atelier, panel), vidéos d'interventions, kit presse, formulaire de demande.
- **Entreprises** : formation du personnel (catalogue de modules, durée, en intra-entreprise ou à l'académie), formation sur mesure, demande de devis.
- **Coaching & accompagnement** : formules (consultation privée, coaching mensuel, accompagnement VIP sur candidature), tableau comparatif, **réservation** (Cal.com, fuseau Douala) avec paiement avant confirmation, formulaire de candidature.

### 7.10 Achat à l'international

Pays avec vrais drapeaux, étapes du processus, ce qui est inclus, tarifs/commission, délais, transport vers Douala, témoignages de clients, FAQ, formulaire de demande (produit recherché, quantité, budget, pays), lien vers la formation « Acheter en Chine ».

### 7.11 Communauté, réalisations, blog, affiliation, contact

- **Communauté** : gratuite (chaîne WhatsApp, Telegram, Facebook) + **espace privé** dans la plateforme (fil d'actualité, astuces de Roger, espaces thématiques, questions-réponses, victoires des membres, lives et replays, badges, modération) + **abonnement VIP** payant.
- **Réalisations & témoignages** : études de cas, mur de témoignages, vidéos, captures, soumission par les élèves avec validation.
- **Blog** : astuces, SEO, partage WhatsApp.
- **Affiliation** : lien unique, commissions, retraits Mobile Money.
- **Contact** : formulaire avec choix du motif (formation, service, entreprise, conférence, TRANSMISSION, achat international, presse, autre), WhatsApp, e-mail, adresse, carte, horaires.

---

## 8. ASSISTANT IA « ROGER IA »

Un assistant conversationnel disponible sur tout le site (bulle en bas à droite, aux couleurs de la marque, avec photo/avatar de Roger) et en page plein écran `/roger-ia`.

- **Rôle :** renseigner les visiteurs automatiquement, 24 h/24 : formations (contenu, prix, durée, nombre de leçons), services, masterclass (prochaine date, lieu), TRANSMISSION (comment inviter), accompagnement, achat en Chine, paiement Mobile Money, accès au compte, problèmes techniques simples.
- **Technologie :** API Claude d'Anthropic avec le SDK officiel `@anthropic-ai/sdk`, appel **uniquement côté serveur** (route API), réponse en **streaming**, clé `ANTHROPIC_API_KEY` en variable d'environnement. Utilise un modèle Claude récent et économique adapté au chat (consulte la documentation Anthropic pour l'identifiant à jour) et active le **prompt caching** sur le prompt système.
- **Connaissances :** le prompt système est construit **automatiquement depuis la base de données** (formations, prix, services, agenda, FAQ, infos de contact) pour que l'assistant soit toujours à jour. Ajoute des **outils (tool use)** : `rechercher_formations`, `prochaine_masterclass`, `details_service`, `creer_lead` (enregistre nom + WhatsApp + besoin), `inscription_masterclass`.
- **Personnalité :** parle comme Roger : chaleureux, direct, motivant, en français simple (répond en anglais si on lui écrit en anglais). Ne promet jamais de revenus garantis, n'invente pas de prix ni de dates : si l'info n'existe pas, il propose de **continuer sur WhatsApp** avec l'équipe (bouton avec résumé de la conversation pré-rempli).
- **Conversion :** propose les bonnes formations avec cartes cliquables, bouton d'achat, inscription aux masterclass, prise de rendez-vous.
- **Pour les membres connectés :** connaît leurs formations et leur progression, aide à retrouver une leçon.
- **Admin :** historique des conversations, leads générés, questions fréquentes sans réponse (pour améliorer la FAQ), activation/désactivation, message d'accueil modifiable, limite de messages par visiteur et rate limiting pour maîtriser les coûts.

---

## 9. PAIEMENTS — CHARIOW + MOBILE MONEY

- **Chariow** prioritaire. **Lis la documentation officielle de l'API Chariow avant de coder** (authentification, création de paiement, webhooks, statuts, mode test) et implémente exactement selon cette doc ; si un point est ambigu, demande-moi au lieu d'inventer.
- Moyens affichés (avec **vrais logos**) : Orange Money, MTN Mobile Money, Wave, Moov Money, Visa, Mastercard, PayPal (diaspora).
- Flux : commande `PENDING` → paiement Chariow côté serveur → page « Valide le paiement sur ton téléphone » avec vérification automatique → **webhook signé** → commande `PAID` → **accès immédiat** → e-mail + reçu PDF + message WhatsApp. Idempotence des webhooks (table `WebhookEvent`).
- Création automatique du compte à l'achat.
- Couche d'abstraction `PaymentProvider` pour ajouter **NotchPay**, **Campay**, **CinetPay**, **Flutterwave**, **Stripe**, **PayPal**.
- Codes promo, paiement en plusieurs fois, bundles, order bump, upsell, relance panier abandonné (e-mail + WhatsApp), **paiement manuel de secours** validé dans l'admin, factures PDF, remboursements.
- Paiement aussi pour : coaching, consultations, places payantes d'événements, abonnement VIP, produits digitaux, acomptes de services.

---

## 10. ESPACE MEMBRE & LECTEUR DE COURS (formations hébergées sur la plateforme)

- Tableau de bord : mes formations et progression, « Reprendre », produits achetés, prochains événements et rendez-vous, annonces, certificats, factures, affiliation, profil.
- **Lecteur** : HLS adaptatif (360p → 1080p), choix de qualité, vitesse, sous-titres, reprise automatique, **mode économie de données / audio seul**, sommaire latéral, leçon suivante automatique, onglets description / ressources / notes / questions-commentaires / quiz, « Marquer comme terminée », **watermark dynamique** (nom + téléphone).
- **Hors ligne sur téléphone** : via la **PWA** (téléchargement chiffré dans l'application, lecture sans internet, gestion de l'espace, revalidation de licence tous les 30 jours) ; option par formation de téléchargement MP4 via URL signée avec watermark et nombre de téléchargements limité ; PDF avec watermark.
- Sécurité : accès vérifié côté serveur, URLs expirantes, 2 appareils max par compte, détection de partage.
- **Certificats** PDF (design rouge/noir, signature de Roger, QR code vérifiable).

---

## 11. AUTOMATISATIONS & NOTIFICATIONS

E-mails (bienvenue, achat, accès, reçu, échec de paiement, relance panier, rappel masterclass, rappel rendez-vous, nouvelle leçon, certificat, invitation TRANSMISSION reçue/confirmée), WhatsApp (liens pré-remplis partout + architecture prête pour l'**API WhatsApp Business Cloud**), notifications push PWA, newsletter (export / Brevo / Systeme.io), webhooks sortants Make/Zapier.

---

## 12. ADMINISTRATION `/admin`

Tout se gère **sans toucher au code** :

- Tableau de bord : CA (jour/semaine/mois), ventes, inscrits, conversion, top formations, leads, demandes en attente.
- **Formations** : création/édition/duplication, constructeur modules/leçons en glisser-déposer, **upload vidéo direct** avec progression, ressources, quiz, calcul automatique durée/nombre de leçons, aperçu de la page, drip, options de téléchargement, certificat, programmation.
- **Produits digitaux**, **services** (pages, tarifs), **événements** (masterclass récurrentes mercredi/samedi, conférences, agenda, inscrits, présence, export de liste).
- **TRANSMISSION** : demandes d'invitation avec statuts, villes, galerie, compteurs.
- **Demandes** : devis entreprises, conférences, achat international, candidatures coaching, contact — avec statut et notes.
- Commandes, clients, codes promo, témoignages, réalisations, blog, communauté (modération), affiliés, **Roger IA** (conversations, leads, réglages), contenus du site (textes de l'accueil, barre d'annonce, chiffres, liens, numéro WhatsApp), paramètres de paiement et de tracking, rôles (Super-admin, Admin, Support, Modérateur), journal d'activité.

---

## 13. MODÈLE DE DONNÉES (indicatif)

`User`, `Profile`, `Role`, `Device`, `Course`, `Category`, `Module`, `Lesson`, `Resource`, `Quiz`, `Question`, `Enrollment`, `LessonProgress`, `Note`, `LessonComment`, `Certificate`, `DigitalProduct`, `Bundle`, `Service`, `ServiceRequest`, `Event` (avec récurrence), `EventRegistration`, `TransmissionCity`, `TransmissionInvitation`, `CoachingOffer`, `CoachingApplication`, `Booking`, `SourcingRequest` (achat international), `QuoteRequest`, `Order`, `OrderItem`, `Payment`, `Installment`, `Coupon`, `Refund`, `Invoice`, `Review`, `Testimonial`, `Showcase`, `PressItem`, `BlogPost`, `LeadMagnet`, `Subscriber`, `Lead`, `ChatConversation`, `ChatMessage`, `CommunitySpace`, `CommunityPost`, `CommunityComment`, `Reaction`, `Membership`, `Affiliate`, `Referral`, `Commission`, `Payout`, `Notification`, `SiteSetting`, `AuditLog`, `WebhookEvent`.

Migrations + **seed** réaliste : formations exemples (ex. « Marketing digital de A à Z », « Créer du contenu qui vend », « L'IA pour entrepreneurs », « Vendre des produits digitaux », « Acheter en Chine sans se faire arnaquer », « Montage vidéo sur CapCut »), services, prochaines masterclass, une étape TRANSMISSION — tout contenu fictif clairement marqué « exemple à remplacer ».

---

## 14. SÉCURITÉ, PERFORMANCE, SEO

- Validation Zod côté serveur, CSP/HSTS, rate limiting (auth, paiement, formulaires, Roger IA), webhooks signés, mots de passe hachés, 2FA admin, sauvegardes, conformité à la loi camerounaise sur les données personnelles et bonnes pratiques RGPD, pages légales (éditeur : Roger BOUJIEKA / Groupe BOUJIEKA, Douala, `[NIU / RCCM À COMPLÉTER]`).
- Mobile-first (tests à 360 px), **Lighthouse mobile ≥ 90**, images AVIF/WebP, animations lourdes désactivées sur appareils faibles, fonctionne en 3G.
- SEO : métadonnées dynamiques, **images de partage générées pour chaque formation/événement** (important pour WhatsApp et Facebook), sitemap, données structurées (Person, Organization, Course, Product, Event, Review, FAQ, Article, LocalBusiness), SEO local (Douala, Cameroun, Afrique francophone).

---

## 15. INFORMATIONS À INTÉGRER

- Nom : **Roger BOUJIEKA** — PDG du **Groupe BOUJIEKA** `[À CONFIRMER]`
- Agence : **BOUJIEKA Agence** `[À CONFIRMER]` — adresse à Douala `[À COMPLÉTER]`
- Académie : **BOUJIEKA Académie** `[À CONFIRMER]`
- Masterclass gratuites : **mercredi et samedi**, horaire `[À COMPLÉTER]`
- Téléphone / WhatsApp : `[À COMPLÉTER — +237 6XX XX XX XX]`
- E-mail : `[À COMPLÉTER]` — Domaine : `[À COMPLÉTER]`
- Réseaux : Facebook, Instagram, TikTok, YouTube, LinkedIn, chaîne WhatsApp, Telegram `[À COMPLÉTER]`
- Photos, vidéos, logo de Roger et du Groupe : `[À FOURNIR]`
- Formations, prix, services et tarifs : `[À COMPLÉTER]`

Tout est centralisé dans `config/site.ts` et dans les paramètres de l'admin.

---

## 16. PLAN PAR PHASES

**Phase 1 — Lancement (priorité) :**
Direction artistique complète, accueil, à propos, services (pages), académie (catalogue + page détaillée), masterclass (inscription), TRANSMISSION (page + formulaire d'invitation), contact, FAQ, pages légales ; authentification, espace membre, lecteur de cours (Bunny) ; paiement **Chariow** + paiement manuel ; admin (formations, commandes, clients, demandes, événements, coupons, témoignages) ; **Roger IA** version de base ; e-mails essentiels ; SEO + pixels ; déploiement.

**Phase 2 :** boutique produits digitaux, PWA + hors ligne, certificats, quiz, avis, réalisations, blog, presse, entreprises & conférences, achat international, coaching avec réservation, relances, paiements en plusieurs fois, Roger IA avec outils.

**Phase 3 :** communauté complète + VIP, affiliation, notifications push, API WhatsApp Business, version anglaise, fournisseurs de paiement additionnels.

---

## 17. LIVRABLES

1. Code source complet et documenté.
2. `README.md` en français : installation, `.env.example`, lancement, migrations/seed, déploiement Vercel, configuration Chariow, Bunny, Resend, Anthropic, domaine.
3. `docs/GUIDE_ADMIN.md` : ajouter une formation, uploader une vidéo, créer un événement, traiter une invitation TRANSMISSION, valider un paiement manuel, régler Roger IA…
4. `docs/LOGOS_A_FOURNIR.md` et `docs/PHOTOS_A_FOURNIR.md` (liste précise avec formats et dimensions).
5. Tests des parcours critiques.
6. Checklist de mise en production.

---

## 18. MÉTHODE DE TRAVAIL

- Commence par me présenter : la direction artistique (palette, typographies, 2–3 principes de mise en page, exemple de hero décrit), l'arborescence, le schéma de données et le plan de la Phase 1. Ensuite, développe.
- Commits réguliers et clairs.
- Ne me pose des questions que si c'est indispensable (API Chariow, prix, informations manquantes) ; sinon, fais des choix professionnels et signale-les.
- À la fin de chaque phase : récapitulatif de ce qui est fait, de ce qui reste, et de ce que je dois fournir ou configurer.

**Objectif final :** le site officiel d'un entrepreneur africain reconnu — crédible, vivant, rapide, avec de vrais logos et de vraies photos — qui présente Roger BOUJIEKA, ses services, ses événements et le programme TRANSMISSION, vend et héberge ses formations, et convertit chaque visiteur en élève, client ou partenaire.
