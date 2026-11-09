# School Academy — Cahier des charges complet

## 1. Ton rôle

Tu es un développeur full-stack senior et un designer UI/UX spécialisé dans les boutiques de produits digitaux (e-books, formations en ligne, templates). Tu écris du code propre, typé, sécurisé et prêt pour la production. Tu avances par étapes, tu expliques brièvement ce que tu fais, et tu ne casses jamais ce qui fonctionne déjà.

## 2. Contexte du projet

- **Nom :** School Academy
- **Propriétaire :** Roger BOUJIEKA, vendeur de produits digitaux depuis 2 ans.
- **Type :** plateforme **personnelle** de vente, avec **un seul vendeur** (moi). Ce n'est **pas** une marketplace : personne d'autre ne peut s'inscrire comme vendeur ni publier de produits. Il y a un administrateur (moi) et des clients.
- **Produits vendus :**
  - E-books (PDF, EPUB)
  - Formations vidéo (modules + leçons)
  - Templates et modèles (Canva, Notion, Excel, Word, etc.)
  - Packs (plusieurs produits vendus ensemble à prix réduit)
  - Audios et autres fichiers téléchargeables
- **Public :** francophone, principalement en [PAYS] et dans la diaspora. La majorité achète **depuis un téléphone**, parfois avec une connexion lente.
- **Langue de l'interface :** français.
- **Devise principale :** [DEVISE] (ex. FCFA). Les prix s'affichent au format local, ex. « 15 000 FCFA ».
- **Objectif n°1 :** vendre automatiquement 24 h/24. Le client paie → il reçoit **immédiatement** l'accès à ses produits, sans aucune intervention manuelle de ma part.

## 3. Stack technique

- **Next.js** (App Router, dernière version stable) + **TypeScript** en mode strict
- **Tailwind CSS** + **shadcn/ui**, icônes **lucide-react**, animations légères **Framer Motion**
- **Supabase** :
  - Postgres (base de données)
  - Auth (email + mot de passe, lien magique, connexion Google)
  - Storage (bucket **public** pour les couvertures, bucket **privé** pour les fichiers vendus)
  - Row Level Security (RLS) activée sur **toutes** les tables
- **Paiement :** [FOURNISSEUR_PAIEMENT], derrière une couche d'abstraction `PaymentProvider` (pour pouvoir changer de fournisseur sans tout réécrire)
- **Emails transactionnels :** Resend + React Email
- **IA :** API Claude d'Anthropic via le SDK officiel `@anthropic-ai/sdk`, appelée **uniquement côté serveur**
- **Validation :** Zod — **Formulaires :** React Hook Form — **Éditeur riche (admin) :** Tiptap
- **PDF :** `pdf-lib` (filigrane des e-books, reçus)
- **Hébergement :** Vercel (plan Pro, car le site est commercial), domaine [DOMAINE]
- **Analytics :** Vercel Analytics + Meta Pixel + Google Analytics 4 (activés seulement si les variables d'environnement sont renseignées)

> Si l'outil utilisé impose une autre stack (par exemple Lovable : React + Vite + Supabase), garde exactement la même architecture fonctionnelle et place toute la logique sensible (paiement, webhooks, téléchargements, IA) dans des **Supabase Edge Functions**.

## 4. Identité visuelle

- **Style :** moderne, premium, éducatif. Le site doit inspirer **confiance** (on achète du savoir).
- **Couleurs** (en variables CSS, modifiables facilement) :
  - Primaire : bleu nuit `#0B1F3A`
  - Accent : or `#F5B700`
  - Fond : `#F8FAFC` — Texte : `#0F172A` — Succès : `#16A34A` — Erreur : `#DC2626`
- **Typographies :** Poppins (titres), Inter (texte).
- Mode clair par défaut + mode sombre.
- **Mobile-first**, coins arrondis (`rounded-2xl`), ombres douces, beaucoup d'espace blanc.
- **Logo provisoire :** texte « School Academy » + icône de chapeau de diplômé.
- **Accessibilité :** contraste AA, navigation au clavier, textes alternatifs sur les images.
- **Performance :** score Lighthouse mobile ≥ 90, images optimisées (`next/image`, WebP), chargement différé, aucune librairie lourde inutile.

## 5. Pages publiques

### 5.1 Accueil `/`

- **Header :** logo, menu (Boutique, Formations, E-books, À propos, Blog, Contact), recherche, icône panier avec compteur, bouton « Connexion » / « Mon espace ».
- **Hero :** titre accrocheur, sous-titre, 2 boutons (« Découvrir la boutique » et « Recevoir l'e-book gratuit »), visuel de type mockup.
- **Bandeau de confiance :** nombre de clients, paiement sécurisé, accès immédiat, support WhatsApp.
- Produits phares, catégories, nouveautés.
- Section « Pourquoi School Academy » (3 à 4 bénéfices).
- Section « Qui suis-je » : photo, parcours de Roger, 2 ans d'expérience.
- Témoignages (avis clients approuvés).
- **Lead magnet :** formulaire email pour recevoir l'e-book gratuit « [LEAD_MAGNET] ».
- FAQ en accordéon.
- **Footer :** liens, réseaux sociaux ([RÉSEAUX]), pages légales, logos des moyens de paiement acceptés, inscription newsletter.
- **Bouton WhatsApp flottant** vers [WHATSAPP] avec message pré-rempli.

### 5.2 Boutique `/boutique`

- Grille de cartes produit : couverture, type, titre, note moyenne, prix, prix barré, badges (« Promo », « Nouveau », « Best-seller »).
- Filtres : catégorie, type de produit, fourchette de prix.
- Tri : populaires, récents, prix croissant/décroissant.
- Recherche instantanée, pagination ou chargement infini.
- Pages raccourcis : `/formations` et `/ebooks` (boutique pré-filtrée).

### 5.3 Page produit `/produits/[slug]`

- Galerie (couverture + aperçus), titre, sous-titre, note moyenne, prix et prix barré.
- Compte à rebours si une offre limitée est active.
- Boutons **« Acheter maintenant »** (va directement au paiement) et « Ajouter au panier ».
- Description riche, bloc « Ce que vous allez apprendre », public cible, format, nombre de pages ou durée totale.
- **Pour les formations :** programme complet (modules et leçons), avec certaines leçons gratuites visibles en aperçu.
- **Extrait gratuit** téléchargeable contre une adresse email (l'email rejoint la liste des abonnés).
- Garantie / politique de remboursement, FAQ du produit, avis clients, produits liés.
- **Barre d'achat collante** en bas de l'écran sur mobile.
- Boutons de partage (WhatsApp, Facebook, copier le lien).
- SEO : métadonnées dynamiques, image Open Graph, données structurées JSON-LD `Product`.

### 5.4 Panier `/panier` et paiement `/checkout`

- Panier conservé dans le navigateur, et synchronisé avec le compte si le client est connecté.
- Champ **code promo**.
- **Order bump :** une case à cocher « Ajouter [produit complémentaire] pour seulement X » sur la page de paiement.
- **Achat sans créer de compte :** le client donne nom, email et téléphone. Un compte est créé automatiquement et un lien magique de connexion lui est envoyé.
- Choix du moyen de paiement : [MOYENS_PAIEMENT].
- Récapitulatif clair, case à cocher d'acceptation des CGV.

### 5.5 Après le paiement

- `/paiement/succes` : vérifie le statut **côté serveur** (jamais sur la seule foi de l'URL), affiche les produits débloqués avec les boutons « Télécharger » / « Accéder », puis une offre complémentaire (upsell).
- `/paiement/en-attente` : pour le Mobile Money (« Validez le paiement sur votre téléphone »), avec vérification automatique du statut toutes les quelques secondes.
- `/paiement/echec` : message clair + bouton « Réessayer ».

### 5.6 Autres pages

- À propos, Contact (formulaire + WhatsApp + email [EMAIL_CONTACT]), FAQ générale.
- Blog (articles pour le SEO) — phase 2.
- **Pages légales :** Mentions légales, CGV, Politique de confidentialité, Politique de remboursement ([REMBOURSEMENT]), Politique cookies.
- Page 404 personnalisée avec lien vers la boutique.

## 6. Espace client `/compte`

- **Tableau de bord :** produits achetés, bouton « Reprendre ma formation ».
- **Ma bibliothèque :** chaque produit acheté avec le bouton « Télécharger » ou « Accéder ».
- **Lecteur de formation** `/compte/formations/[slug]` :
  - Barre latérale avec modules et leçons (repliable sur mobile)
  - Lecteur vidéo, contenu texte, pièces jointes
  - Bouton « Marquer comme terminé », barre de progression, bouton « Leçon suivante »
  - Certificat de fin de formation en PDF (phase 2)
- **Mes commandes :** historique + reçu PDF téléchargeable.
- **Profil :** nom, email, téléphone, mot de passe, préférences de notifications.

## 7. Back-office administrateur `/admin`

Accès réservé au rôle `admin`, vérifié **côté serveur** à chaque requête. Le back-office doit être **parfaitement utilisable depuis un téléphone**.

1. **Tableau de bord :** chiffre d'affaires (aujourd'hui, 7 jours, 30 jours, total), nombre de ventes, panier moyen, taux de conversion, nouveaux clients, nouveaux abonnés, graphique des ventes, top produits, dernières commandes.
2. **Produits :** créer, modifier, dupliquer, archiver. Upload de la couverture (public) et des fichiers vendus (privés), extrait gratuit, statut brouillon / publié / archivé, mise en avant, aperçu avant publication. Boutons IA « Générer la description » et « Générer le SEO ».
3. **Formations :** gestion des modules et des leçons avec glisser-déposer pour l'ordre, vidéo (Bunny Stream recommandé, ou Vimeo), contenu texte, pièces jointes, option « leçon gratuite en aperçu ».
4. **Packs :** composer un pack à partir de produits existants, avec un prix réduit.
5. **Commandes :** liste filtrable (statut, date, produit, moyen de paiement), détail, renvoyer l'email d'accès, marquer comme remboursée (ce qui retire l'accès), **valider un paiement manuel**, **offrir un produit** à une adresse email.
6. **Clients :** liste, recherche, historique d'achats, donner ou retirer un accès, export CSV.
7. **Codes promo :** pourcentage ou montant fixe, date de début et de fin, nombre maximal d'utilisations, limite par client, produits concernés.
8. **Avis :** modération (approuver / refuser).
9. **Abonnés :** liste des emails avec leur source (lead magnet, extrait, achat), export CSV. Campagnes email simples et relance des paniers abandonnés : phase 2.
10. **Paramètres :** infos de la boutique, logo, couleurs, réseaux sociaux, numéro WhatsApp, textes des emails, limite de téléchargements, moyens de paiement activés.
11. **Journal d'activité :** téléchargements, connexions admin, webhooks de paiement reçus.

## 8. Paiement (partie critique)

- Interface `PaymentProvider` avec au minimum :
  - `createCheckout(order)` → URL de paiement ou instructions
  - `verifyWebhook(request)` → événement vérifié
  - `getPaymentStatus(reference)` → statut réel auprès du fournisseur
- Implémentation principale : **[FOURNISSEUR_PAIEMENT]**, avec Mobile Money et carte bancaire. Prévoir le mode test (sandbox) et le mode réel via variables d'environnement.
- **Déroulé d'un achat :**
  1. Le serveur crée une commande `pending` en **recalculant les prix depuis la base de données** (ne jamais faire confiance aux prix envoyés par le navigateur), en appliquant le code promo côté serveur.
  2. Le client est redirigé vers la page de paiement du fournisseur.
  3. Le fournisseur appelle notre **webhook** → on vérifie la signature → on re-vérifie le statut via l'API du fournisseur → on vérifie que **le montant et la devise** correspondent à la commande → la commande passe en `paid` → on crée les **droits d'accès** → on envoie l'email de livraison.
  4. Traitement **idempotent** : si le même webhook arrive deux fois, on ne crée pas deux accès et on n'envoie pas deux emails (table `webhook_events`).
- **Rattrapage automatique :** une tâche planifiée (Vercel Cron) vérifie toutes les 10 minutes les commandes `pending` de moins de 24 h auprès du fournisseur, au cas où un webhook serait perdu.
- **Paiement manuel (option activable) :** le client envoie l'argent directement par Mobile Money et saisit la référence de transaction ; la commande passe en `awaiting_validation` et je la valide en un clic depuis l'admin, ce qui déclenche la livraison.
- Toutes les clés secrètes en variables d'environnement, jamais dans le code ni côté navigateur.

## 9. Livraison sécurisée des produits

- Les fichiers vendus sont dans un bucket Supabase **privé**. Aucune URL publique permanente.
- Téléchargement via une route serveur `/api/download/[productId]/[fileId]` qui :
  1. vérifie que l'utilisateur est connecté et possède un droit d'accès actif à ce produit ;
  2. vérifie la limite de téléchargements (configurable, ex. 10 par produit ; l'admin peut la réinitialiser) ;
  3. génère une **URL signée valable 60 secondes** ;
  4. enregistre le téléchargement dans `download_logs`.
- **Filigrane sur les PDF :** nom + email de l'acheteur ajoutés en bas de chaque page au moment du téléchargement (`pdf-lib`), pour décourager le partage.
- **Vidéos :** hébergées avec protection (Bunny Stream avec jetons signés recommandé). Jamais d'URL de vidéo brute publique.
- **Email de livraison immédiat :** remerciement, récapitulatif, bouton « Accéder à ma bibliothèque », lien magique de connexion.

## 10. Fonctionnalités IA

### 10.1 Assistant de vente « Coach School Academy » (widget de chat sur le site)

- Répond en français aux questions sur les produits, recommande le produit adapté au besoin du visiteur avec le lien vers sa page, répond à la FAQ (paiement, accès, remboursement).
- Contexte fourni à chaque conversation : la liste des produits **publiés** (titre, type, prix, lien, résumé, public cible), la FAQ et les promotions actives, lus depuis la base de données.
- Ne doit **jamais** inventer de produit, de prix, de promotion ou de promesse de résultat.
- Pour un problème de commande, de paiement ou une demande de remboursement : il oriente vers WhatsApp.
- Limites : 20 messages par visiteur et par heure, longueur maximale des messages, aucune donnée sensible demandée ni stockée.
- Le prompt système est fourni dans le fichier `3-PROMPT-ASSISTANT-IA.md` ; place-le dans un fichier dédié du code pour que je puisse le modifier facilement.

### 10.2 Assistant de rédaction (admin)

- Génère ou améliore : description produit, titres accrocheurs, liste « Ce que vous allez apprendre », FAQ produit, titre et description SEO, posts réseaux sociaux (Facebook, Instagram, TikTok, statut WhatsApp), email de lancement.
- Le résultat est toujours proposé en **brouillon** : je relis et valide avant publication.

### 10.3 Règles techniques IA

- SDK officiel `@anthropic-ai/sdk`, appels **uniquement côté serveur** (route API ou Edge Function). Clé dans `ANTHROPIC_API_KEY`, jamais exposée au navigateur.
- Modèle : `claude-opus-5-5`, configurable via la variable `ANTHROPIC_MODEL`.
- Réponses en **streaming** pour le chat.
- Ne pas envoyer de paramètres obsolètes (`temperature`, `budget_tokens`) ; pour le chat, régler `output_config.effort` sur `"low"` afin d'avoir des réponses rapides.
- Mettre le prompt système et le catalogue **en premier** dans la requête (contenu stable) pour profiter du cache de prompt.
- Vérifier `stop_reason` avant d'afficher la réponse, et gérer les erreurs (429, 5xx, réseau) avec un message de repli poli : « Je rencontre un souci technique, écrivez-nous sur WhatsApp ».

## 11. Modèle de données (Postgres / Supabase)

Montants stockés en **entiers**, dans la plus petite unité de la devise (FCFA : unités ; EUR : centimes). Toutes les tables ont `id uuid` par défaut, `created_at`, et `updated_at` si elles sont modifiables.

- **profiles** : `id` (= `auth.users.id`), `full_name`, `email`, `phone`, `role` (`customer` | `admin`, défaut `customer`), `avatar_url`. Créé automatiquement par trigger à l'inscription.
- **categories** : `name`, `slug` (unique), `description`, `position`.
- **products** : `title`, `slug` (unique), `subtitle`, `type` (`ebook` | `course` | `template` | `bundle` | `audio` | `other`), `category_id`, `short_description`, `description` (JSON Tiptap ou HTML nettoyé), `benefits` (text[]), `target_audience`, `cover_url`, `gallery` (text[]), `preview_file_path`, `price`, `compare_at_price`, `currency`, `status` (`draft` | `published` | `archived`), `is_featured`, `pages_count`, `duration_minutes`, `format`, `offer_ends_at`, `seo_title`, `seo_description`, `sales_count`.
- **product_files** : `product_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `position`.
- **bundle_items** : `bundle_id`, `product_id` (clé primaire composée).
- **course_modules** : `product_id`, `title`, `position`.
- **course_lessons** : `module_id`, `title`, `content`, `video_provider`, `video_id`, `duration_seconds`, `is_free_preview`, `attachments` (jsonb), `position`.
- **lesson_progress** : `user_id`, `lesson_id`, `completed_at` (clé primaire `user_id` + `lesson_id`).
- **orders** : `order_number` (lisible, ex. `SA-2026-000123`), `user_id`, `email`, `full_name`, `phone`, `status` (`pending` | `awaiting_validation` | `paid` | `failed` | `refunded` | `cancelled`), `subtotal`, `discount_amount`, `total`, `currency`, `coupon_id`, `payment_provider`, `payment_method`, `provider_reference`, `provider_payload` (jsonb), `paid_at`.
- **order_items** : `order_id`, `product_id`, `product_title` (copie au moment de l'achat), `unit_price`, `is_order_bump`.
- **entitlements** (droits d'accès) : `user_id`, `product_id`, `order_id` (vide si offert), `source` (`purchase` | `gift` | `manual`), `download_count`, `revoked_at`. Unique (`user_id`, `product_id`). L'achat d'un pack crée un droit pour chaque produit du pack.
- **coupons** : `code` (unique, en majuscules), `type` (`percent` | `fixed`), `value`, `min_amount`, `max_uses`, `used_count`, `per_customer_limit`, `product_ids` (uuid[], vide = tous les produits), `starts_at`, `expires_at`, `is_active`.
- **reviews** : `product_id`, `user_id`, `rating` (1 à 5), `comment`, `is_approved`. Seul un acheteur du produit peut laisser un avis, une seule fois.
- **subscribers** : `email` (unique), `full_name`, `source`, `consent`, `unsubscribed_at`.
- **download_logs** : `user_id`, `product_id`, `file_id`, `ip`, `user_agent`.
- **webhook_events** : `provider`, `event_id` (unique), `payload`, `processed_at`.
- **settings** : `key` (unique), `value` (jsonb).

**RLS :**
- Un client ne lit que son profil, ses commandes, ses droits d'accès et sa progression.
- Tout le monde peut lire les produits `published`, les catégories et les avis approuvés.
- Seul l'admin écrit dans les tables du catalogue. Une fonction SQL `is_admin()` sert dans les règles.
- Les écritures liées au paiement (commandes payées, droits d'accès) se font uniquement côté serveur avec la clé de service.

## 12. Emails transactionnels (Resend + React Email)

Aux couleurs de School Academy, lisibles sur mobile :

1. Bienvenue + lien magique de connexion
2. Confirmation de commande + accès aux produits
3. Paiement en attente / paiement échoué (avec lien pour réessayer)
4. Envoi de l'e-book gratuit (lead magnet)
5. Réinitialisation du mot de passe
6. **Notification à l'admin à chaque vente** (email ; Telegram en option)

## 13. Sécurité et conformité

- RLS sur toutes les tables, testée.
- Routes `/admin` protégées par middleware **et** vérification du rôle côté serveur.
- Validation Zod de toutes les entrées, côté serveur.
- Limitation du nombre de requêtes (connexion, checkout, chat IA, formulaires) — Upstash Redis ou table dédiée.
- En-têtes de sécurité (CSP, HSTS, X-Frame-Options, etc.).
- Aucune clé secrète côté navigateur (seules les variables `NEXT_PUBLIC_*` y sont autorisées).
- Bannière cookies : les pixels publicitaires ne se chargent qu'après consentement.
- Sauvegardes Supabase activées. Suivi des erreurs avec Sentry (optionnel).

## 14. SEO et marketing

- Métadonnées par page, `sitemap.xml`, `robots.txt`, URLs propres en français.
- Données structurées JSON-LD : `Product`, `Organization`, `FAQPage`, `BreadcrumbList`.
- Images Open Graph pour un beau rendu quand un lien est partagé sur WhatsApp et Facebook.
- Événements e-commerce Meta Pixel et GA4 : `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`.
- Programme d'affiliation : phase 2.

## 15. Variables d'environnement (`.env.example`)

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_PROVIDER=
PAYMENT_MODE=test
PAYMENT_PUBLIC_KEY=
PAYMENT_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_NOTIFICATION_EMAIL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-opus-5-5
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_TOKEN_KEY=
NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=
```

## 16. Livrables attendus

- Code complet avec une arborescence claire.
- Migrations SQL Supabase : tables, index, contraintes, RLS, triggers, buckets de stockage.
- Données de démonstration : 3 catégories, 3 e-books, 2 formations, 1 pack, 1 code promo.
- Fichier `.env.example`.
- `README.md` : installation, configuration (Supabase, paiement, Resend, Claude, Bunny), déploiement sur Vercel, et **comment me donner le rôle admin**.
- Tests automatisés au minimum pour :
  - le webhook de paiement (signature invalide, webhook reçu deux fois, montant incorrect) ;
  - la route de téléchargement (refus sans achat, refus au-delà de la limite) ;
  - le calcul des prix et des codes promo.

## 17. Méthode de travail

- Travaille **phase par phase**, dans cet ordre :
  1. Fondations (projet, design, base de données, authentification, rôles)
  2. Boutique (accueil, catalogue, page produit, SEO de base)
  3. Panier, paiement et livraison par email
  4. Espace client (bibliothèque, téléchargements sécurisés, lecteur de formation)
  5. Back-office admin
  6. Fonctionnalités IA
  7. Marketing et pages légales
  8. Tests, sécurité et mise en ligne
- À la fin de chaque phase : résume ce qui est fait, ce qui reste, et **comment je peux tester moi-même**.
- Si une information manque, choisis l'option la plus simple et la plus sûre, puis signale-le.
- Composants réutilisables, pas de duplication, commentaires courts et utiles.
