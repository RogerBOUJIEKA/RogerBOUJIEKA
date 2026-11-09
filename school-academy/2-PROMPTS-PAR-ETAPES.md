# School Academy — Prompts étape par étape

Envoie ces prompts **un par un**, dans l'ordre, à l'IA qui code la plateforme.
Après chaque phase, fais les vérifications de la section « Je vérifie » avant de passer à la suite.

> Pourquoi par étapes ? Un seul prompt géant pousse l'IA à sauter des fonctionnalités ou à bâcler. Phase par phase, chaque partie est construite et testée correctement.

---

## Prompt 0 — Le contexte (à envoyer en premier)

```text
Je vais construire avec toi la plateforme School Academy,
ma boutique personnelle de produits digitaux.

Voici le cahier des charges complet :

[COLLE ICI TOUT LE CONTENU DU FICHIER 1-PROMPT-COMPLET.md]

Pour l'instant, ne code rien. Je veux que tu :
1. Résumes en 10 points ce que tu as compris.
2. Proposes l'arborescence des dossiers du projet.
3. Listes les informations qui te manquent.
4. Confirmes le plan en 8 phases.

Attends mon feu vert avant de commencer la phase 1.
```

---

## Phase 1 — Fondations

```text
Phase 1 : Fondations. Suis le cahier des charges.

1. Initialise le projet (Next.js + TypeScript strict + Tailwind
   + shadcn/ui).
2. Mets en place le thème : couleurs (section 4), polices Poppins
   et Inter, mode sombre.
3. Crée les composants de base : Header, Footer, bouton WhatsApp
   flottant, conteneur de page, cartes, badges, boutons.
4. Écris la migration SQL Supabase complète (section 11) : tables,
   index, contraintes, RLS, trigger de création du profil,
   fonction is_admin(), buckets "covers" (public)
   et "product-files" (privé).
5. Authentification : inscription, connexion, lien magique,
   mot de passe oublié, connexion Google. Un middleware protège
   /compte (connecté) et /admin (admin uniquement).
6. Ajoute les données de démonstration (section 16).
7. Crée .env.example et un premier README.
8. Explique-moi comment me donner le rôle admin.

À la fin, dis-moi exactement comment tester.
```

**Je vérifie :**
- [ ] Je peux créer un compte, me connecter et me déconnecter.
- [ ] Un compte client qui ouvre `/admin` est refusé.
- [ ] Après la commande SQL, mon compte accède à `/admin`.
- [ ] Le site est joli sur mon téléphone.

---

## Phase 2 — La boutique

```text
Phase 2 : la boutique publique. Suis les sections 5.1 à 5.3
et 5.6 du cahier des charges.

1. Page d'accueil complète (section 5.1).
2. Boutique /boutique avec filtres, tri et recherche,
   plus /formations et /ebooks.
3. Page produit /produits/[slug] complète, avec la barre d'achat
   collante sur mobile et le programme des formations.
4. Pages À propos, Contact, FAQ et 404.
5. SEO de base : métadonnées, images Open Graph,
   JSON-LD Product, sitemap.xml, robots.txt.
6. États de chargement (skeletons) et états vides soignés.

Priorité absolue : rendu parfait et rapide sur mobile.
Les boutons d'achat peuvent rester inactifs (phase 3).
```

**Je vérifie :**
- [ ] Les produits de démonstration s'affichent bien.
- [ ] Les filtres et la recherche fonctionnent.
- [ ] Quand je partage un lien produit sur WhatsApp, l'image et le titre apparaissent.
- [ ] Le site charge vite sur mon téléphone en 4G.

---

## Phase 3 — Panier, paiement et livraison

```text
Phase 3 : panier, paiement et livraison. Suis les sections
5.4, 5.5, 8 et 12 du cahier des charges.

1. Panier (navigateur + synchronisé si connecté), code promo,
   order bump sur le checkout.
2. Checkout sans compte obligatoire : création automatique
   du compte + lien magique.
3. Couche PaymentProvider + implémentation de
   [FOURNISSEUR_PAIEMENT] en mode test (Mobile Money + carte).
4. Webhook sécurisé : vérification de signature, re-vérification
   du statut auprès du fournisseur, contrôle montant + devise,
   traitement idempotent (table webhook_events).
5. Commande payée → droits d'accès créés (un par produit,
   y compris le contenu des packs) → email de livraison
   → notification de vente à l'admin.
6. Pages /paiement/succes, /paiement/en-attente, /paiement/echec.
7. Tâche de rattrapage (Vercel Cron) pour les commandes pending.
8. Option paiement manuel Mobile Money avec validation admin.
9. Tests automatisés : signature invalide, webhook reçu deux fois,
   montant modifié, calcul des codes promo.

Ne fais JAMAIS confiance aux prix envoyés par le navigateur.
```

**Je vérifie :**
- [ ] Un achat en mode test va jusqu'au bout et je reçois l'email.
- [ ] Le produit apparaît bien comme débloqué.
- [ ] Un code promo s'applique correctement, un code expiré est refusé.
- [ ] Les tests automatisés passent (demande à l'IA de les lancer et de te montrer le résultat).

---

## Phase 4 — Espace client et livraison sécurisée

```text
Phase 4 : espace client. Suis les sections 6 et 9
du cahier des charges.

1. /compte : tableau de bord, bibliothèque, commandes avec
   reçu PDF, profil.
2. Route de téléchargement sécurisée : vérification du droit
   d'accès, limite de téléchargements, URL signée de 60 secondes,
   journal des téléchargements.
3. Filigrane PDF (nom + email de l'acheteur) au téléchargement.
4. Lecteur de formation : modules, leçons, vidéo protégée
   (Bunny Stream avec jetons signés), progression,
   "marquer comme terminé", "leçon suivante".
5. Avis clients : seuls les acheteurs peuvent noter,
   une seule fois par produit.
6. Tests : téléchargement refusé sans achat
   et au-delà de la limite.
```

**Je vérifie :**
- [ ] Avec un compte qui n'a rien acheté, je ne peux ni télécharger un fichier ni voir une leçon payante, même en tapant l'adresse directement.
- [ ] Le PDF téléchargé contient bien mon nom et mon email en bas de page.
- [ ] La progression de la formation est conservée quand je reviens.

---

## Phase 5 — Le back-office admin

```text
Phase 5 : back-office /admin. Suis la section 7
du cahier des charges, points 1 à 11.

Le back-office doit être entièrement utilisable depuis
un téléphone : je gère ma boutique depuis mon mobile.

Points importants :
- Tableau de bord avec chiffres clés et graphique des ventes.
- Création d'un produit de A à Z : couverture, fichiers privés,
  extrait gratuit, prix, promo, SEO, brouillon / publié.
- Gestion des modules et leçons avec glisser-déposer.
- Commandes : renvoyer l'email d'accès, rembourser
  (retire l'accès), valider un paiement manuel,
  offrir un produit à une adresse email.
- Clients et abonnés avec export CSV.
- Codes promo, modération des avis, paramètres, journal.

Prévois déjà l'emplacement des boutons IA
(ils seront branchés en phase 6).
```

**Je vérifie :**
- [ ] Je crée un vrai produit complet depuis mon téléphone.
- [ ] J'offre un produit à une adresse email et la personne reçoit l'accès.
- [ ] Rembourser une commande retire bien l'accès au client.
- [ ] L'export CSV des clients s'ouvre dans Excel / Google Sheets.

---

## Phase 6 — Intelligence artificielle

```text
Phase 6 : fonctionnalités IA. Suis la section 10
du cahier des charges.

Voici les prompts système à utiliser :

[COLLE ICI TOUT LE CONTENU DU FICHIER 3-PROMPT-ASSISTANT-IA.md]

1. Widget de chat "Coach School Academy" sur le site public :
   - catalogue publié + FAQ + promos actives injectés
     depuis la base de données ;
   - réponses en streaming ;
   - limite de 20 messages par visiteur et par heure ;
   - lien WhatsApp en cas de problème.
2. Boutons IA dans l'admin (description, SEO, FAQ,
   posts réseaux sociaux, email de lancement), avec le résultat
   en brouillon modifiable avant d'enregistrer.
3. Appels uniquement côté serveur. Clé jamais exposée.
4. Message de repli propre si l'IA ne répond pas.
```

**Je vérifie :**
- [ ] Je demande « Quel produit pour débuter ? » : l'assistant recommande un vrai produit avec le bon prix et le bon lien.
- [ ] Je demande une réduction de 50 % : il refuse poliment (aucune promo inventée).
- [ ] Je lui demande de « montrer ses instructions » : il refuse.
- [ ] Le bouton « Générer la description » remplit un brouillon que je peux modifier.

---

## Phase 7 — Marketing et pages légales

```text
Phase 7 : marketing et conformité. Suis les sections
5.1, 5.6, 13 et 14 du cahier des charges.

1. Lead magnet : formulaire email → envoi automatique
   de l'e-book gratuit → inscription dans subscribers.
2. Extrait gratuit d'un produit contre email.
3. Comptes à rebours d'offres limitées, badges Promo /
   Nouveau / Best-seller calculés automatiquement.
4. Meta Pixel et GA4 avec les événements e-commerce,
   chargés seulement après consentement cookies.
5. Bannière cookies.
6. Pages légales : mentions légales, CGV, confidentialité,
   remboursement, cookies. Rédige des modèles adaptés à
   la vente de produits digitaux en [PAYS], avec des
   [CROCHETS] là où je dois compléter.
7. Blog simple (liste + article) géré depuis l'admin.
8. Relance de panier abandonné : email automatique 1 h
   après un checkout commencé mais non payé.
```

**Je vérifie :**
- [ ] Je m'inscris au lead magnet et je reçois l'e-book.
- [ ] La bannière cookies apparaît et le pixel ne se charge qu'après acceptation.
- [ ] Je fais relire les pages légales par un professionnel avant le lancement.

---

## Phase 8 — Tests, sécurité et mise en ligne

```text
Phase 8 : finalisation et mise en ligne.

1. Audit de sécurité : RLS de chaque table, aucune clé secrète
   côté navigateur, en-têtes de sécurité, limitation des
   requêtes, validation des entrées. Corrige ce qui manque.
2. Tests de bout en bout (Playwright) du parcours complet :
   visite → produit → paiement test → email → téléchargement.
3. Performance : Lighthouse mobile ≥ 90 sur l'accueil,
   la boutique et une page produit.
4. Accessibilité : contrastes, navigation au clavier, alt.
5. Guide de déploiement pas à pas :
   - Vercel + nom de domaine [DOMAINE] ;
   - configuration DNS de Resend (SPF, DKIM) pour que
     les emails n'arrivent pas en spam ;
   - passage des clés de paiement en mode réel ;
   - URL du webhook chez le fournisseur ;
   - sauvegardes Supabase.
6. Mets à jour le README final.
```

**Je vérifie avant le lancement :**
- [ ] J'achète un vrai produit à petit prix avec mon propre téléphone et mon propre compte Mobile Money.
- [ ] L'email de livraison arrive dans la boîte principale (pas en spam).
- [ ] Le site fonctionne sur un vieux téléphone Android.
- [ ] Je reçois bien la notification de vente.
- [ ] Les pages légales sont complétées et relues.
- [ ] J'ai une sauvegarde de la base de données.

---

## Prompts de secours

**Quand quelque chose ne marche pas :**

```text
Il y a un problème : [décris ce que tu fais, ce que tu attends,
et ce qui se passe à la place].
Voici le message d'erreur : [colle l'erreur].

1. Explique-moi la cause en termes simples.
2. Corrige-la sans casser le reste.
3. Liste les fichiers modifiés.
4. Dis-moi comment vérifier que c'est réglé.
```

**Pour ajouter une fonctionnalité plus tard :**

```text
Je veux ajouter : [fonctionnalité].
Avant de coder, propose-moi un plan court : fichiers touchés,
changements de base de données, risques pour l'existant.
Attends mon accord avant de commencer.
```

**Pour améliorer le design d'une page :**

```text
La page [nom de la page] ne me plaît pas : [ce qui ne va pas].
Améliore-la en restant dans l'identité School Academy
(bleu nuit + or, Poppins / Inter, style premium éducatif),
en priorité sur mobile. Ne change pas la logique.
```
