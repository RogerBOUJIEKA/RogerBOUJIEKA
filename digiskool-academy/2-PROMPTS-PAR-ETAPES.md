# DigiSkool Academy — Prompts étape par étape

Envoie ces prompts **un par un**, dans l'ordre, à l'IA qui code la plateforme.
Après chaque phase, fais les vérifications « Je vérifie » avant de passer à la suite.

> Pourquoi par étapes ? Un seul prompt géant pousse l'IA à sauter des fonctionnalités. Phase par phase, chaque partie est construite et testée correctement.

---

## Prompt 0 — Le contexte (à envoyer en premier)

```text
Je vais construire avec toi DigiSkool Academy, ma plateforme
personnelle de vente de produits digitaux (e-books, formations
vidéo, vidéos), bilingue français / anglais, pour l'Afrique
francophone, l'Afrique anglophone et l'international.

Voici le cahier des charges complet :

[COLLE ICI TOUT LE CONTENU DU FICHIER 1-PROMPT-COMPLET.md]

Les deux priorités absolues :
1. Un paiement ultra simple (3 champs maximum, Mobile Money
   en quelques secondes).
2. Un accès immédiat au produit après le paiement, sans
   mot de passe, sans rien à chercher.

Pour l'instant, ne code rien. Je veux que tu :
1. Résumes en 15 points ce que tu as compris.
2. Proposes l'arborescence des dossiers du projet.
3. Listes les informations qui te manquent.
4. Confirmes le plan en 12 phases.

Attends mon feu vert avant de commencer la phase 1.
```

---

## Phase 1 — Fondations et bilingue

```text
Phase 1 : fondations et bilingue. Sections 3, 4, 5 et 28
du cahier des charges.

1. Initialise le projet : Next.js + TypeScript strict + Tailwind
   + shadcn/ui + next-intl.
2. Bilingue complet :
   - routes /fr et /en avec les URLs traduites (section 5.3) ;
   - détection selon la langue du téléphone : français → /fr,
     anglais → /en, autre langue → langue par défaut ;
   - bouton FR | EN qui garde la même page et mémorise le
     choix (cookie 1 an, prioritaire) ;
   - liens courts /p/[code] qui redirigent vers la bonne
     langue ;
   - messages/fr.json et messages/en.json, aucun texte en dur.
3. Migration SQL Supabase complète (section 28) : tables,
   traductions, index, contraintes, RLS, triggers, fonctions
   is_admin() et has_access(), buckets.
4. Authentification sans mot de passe : numéro WhatsApp + code
   (Send SMS Hook de Supabase, envoi par WhatsApp avec SMS de
   secours), email + lien magique, Google. Mot de passe
   facultatif. Middleware : /compte pour les connectés,
   /admin pour l'admin.
5. Données de démonstration bilingues (section 33).
6. .env.example, premier README, et comment me donner
   le rôle admin.
7. Tests : détection de la langue (FR, EN, autre, cookie).
```

**Je vérifie :**
- [ ] Mon téléphone est en français → le site s'ouvre en français.
- [ ] Un navigateur en anglais → le site s'ouvre en anglais.
- [ ] Le bouton FR | EN change la langue en restant sur la même page.
- [ ] Je me connecte avec mon numéro WhatsApp et le code reçu.

---

## Phase 2 — Design system et couvertures

```text
Phase 2 : design system et couvertures. Sections 7 et 8
du cahier des charges.

C'est la phase la plus importante pour l'image de la marque.
Je suis designer graphique : je veux un niveau Udemy / Stripe,
soigné dans les moindres détails.

1. Tokens de design : couleurs (section 7.3, clair et sombre),
   typographies Plus Jakarta Sans + Inter avec next/font,
   échelle typographique, espacements, rayons, ombres.
2. Tous les composants de la section 7.5, dans tous leurs
   états (normal, survol, appui, désactivé, chargement,
   erreur), avec les animations de la section 7.6.
3. Header ordinateur et mobile, barre de navigation du bas
   sur mobile, footer, bouton flottant WhatsApp, bloc
   WhatsApp support + communauté (section 16).
4. Logo provisoire DigiSkool Academy (SVG).
5. Page /admin/design qui présente tout le design system.
6. Générateur de couvertures (section 8) : même modèle pour
   tous les produits, seule la couleur change, FR et EN,
   tous les formats, effet livre 3D.
7. Montre-moi les couvertures des produits de démonstration
   côte à côte.
```

**Je vérifie :**
- [ ] La page `/admin/design` est belle et cohérente, en clair et en sombre.
- [ ] Toutes les couvertures ont le même design, avec des couleurs différentes.
- [ ] Les boutons sont grands et faciles à toucher sur mon téléphone.

---

## Phase 3 — Boutique publique

```text
Phase 3 : boutique publique, inspirée d'Udemy et en mieux.
Sections 9 et 30 du cahier des charges.

1. Header complet (recherche avec suggestions instantanées,
   méga-menu, FR | EN, devise, panier, Mes produits,
   Communauté) et barre de navigation du bas sur mobile.
2. Accueil complet (section 9.2) : bannières, hero, catégories,
   carrousels, témoignages, Roger, communauté, lead magnet.
3. Cartes produit (section 9.4), avec la fenêtre d'aperçu
   au survol sur ordinateur.
4. Boutique, E-books, Formations, Vidéos, Promotions,
   Nouveautés : filtres (tiroir sur mobile), tri, recherche.
5. Pays et devise détectés, prix convertis et arrondis
   (section 6.1).
6. Pages À propos, Contact, FAQ, Comment payer, 404.
7. SEO (section 30).

Priorité : fluide et rapide sur un petit téléphone Android.
```

**Je vérifie :**
- [ ] L'accueil donne envie et fait professionnel sur mon téléphone.
- [ ] La recherche propose des résultats pendant que je tape.
- [ ] Les prix s'affichent dans la bonne devise.
- [ ] Quand je partage un lien produit sur WhatsApp, la couverture et le titre apparaissent.

---

## Phase 4 — Page produit, aperçus et preuves sociales

```text
Phase 4 : la page produit qui convertit. Sections 10, 11
et 12 du cahier des charges.

1. Page produit mobile exactement dans l'ordre de la
   section 10.1, puis les sections 10.3 et 10.4.
2. Version ordinateur façon Udemy (section 10.2) : en-tête
   sombre et carte d'achat collante.
3. Barre d'achat collante sur mobile (section 10.5) et
   micro-détails (section 10.6), dont « Accéder à mon produit »
   si le client possède déjà le produit.
4. Aperçus (section 11) :
   - e-book : « Feuilleter », premières pages lisibles,
     pages suivantes floutées générées côté serveur (le vrai
     texte n'est jamais envoyé) ;
   - formation : vidéo de présentation, programme complet,
     leçons gratuites lisibles sans compte, écran d'achat
     à la fin de l'aperçu.
5. Preuves sociales (section 12) : ventes (dont ventes
   antérieures), note et répartition, avis vérifiés,
   témoignages (captures, vidéos), badges automatiques,
   « Dernière vente il y a… », visiteurs en direct (réels,
   Supabase Realtime, au-dessus d'un seuil).
6. Tests : le texte des pages verrouillées n'est jamais
   envoyé au navigateur.

Tout doit être réel : aucun chiffre, avis ou notification
inventé.
```

**Je vérifie :**
- [ ] Sur mon téléphone, je vois le prix, la réduction, le chrono et le bouton « Acheter » sans faire défiler.
- [ ] Je feuillette un e-book : les premières pages sont lisibles, les suivantes floutées.
- [ ] Je regarde une leçon gratuite sans créer de compte.
- [ ] Le nombre de ventes et les avis s'affichent correctement.

---

## Phase 5 — Promotions, popups et communauté

```text
Phase 5 : promotions, popups et communauté. Sections 16,
17, 18 et 19 du cahier des charges.

1. Moteur de promotions (section 17) : campagnes, modèles
   en un clic, récurrences, prix de lancement limité,
   priorités, cumul. Calcul du prix final côté serveur,
   dans une seule fonction testée.
2. Affichage partout : barre en haut avec chrono et code
   à copier, étiquettes, prix barré + économie, page
   Promotions.
3. Codes promo avec canal, liens ?promo=CODE (mémorisés
   7 jours), QR codes.
4. Historique des prix.
5. Popups de la section 18 avec toutes les règles communes
   (un seul par visite, jamais sur le checkout, le succès,
   la liseuse ou le lecteur).
6. Communauté : bouton partout, bouton flottant (communauté
   en premier, support en second), page /communaute, liens
   FR/EN, clics comptés.
7. Tests : calcul des prix (promotions, priorités, codes,
   devises, arrondis).

Règle absolue : chronos réels, prix barrés réels.
```

**Je vérifie :**
- [ ] J'active « Flash 24 h -45 % sur toutes les formations » : étiquettes, barre et prix changent partout.
- [ ] La promo disparaît toute seule à la fin du chrono.
- [ ] Un lien `?promo=CODE` applique bien le code.
- [ ] Je ne vois jamais deux popups dans la même visite.
- [ ] Le bouton flottant propose d'abord la communauté.

---

## Phase 6 — Checkout express, paiements et accès immédiat

```text
Phase 6 : la phase la plus importante pour les ventes.
Sections 6, 14, 15 et 27 du cahier des charges.

1. Checkout express (section 14.1) : une page ou un tiroir,
   3 champs maximum (nom, WhatsApp, email facultatif),
   informations mémorisées, code promo replié, un order bump,
   moyens de paiement du pays, opérateur détecté depuis le
   numéro, un seul bouton « Payer », réassurance, carte
   WhatsApp « Un souci pour payer ? », erreurs en langage
   simple, réessayer sans rien ressaisir.
2. PaymentProvider + [FOURNISSEUR_PRINCIPAL] et
   [FOURNISSEUR_SECONDAIRE] en mode test, routage par pays.
3. Écran d'attente Mobile Money (section 14.2) avec statut
   en direct, instructions par opérateur et par pays,
   « Renvoyer la demande ».
4. Webhook sécurisé et idempotent, rattrapage automatique.
5. Accès immédiat (section 15) : connexion automatique après
   paiement, page de succès avec le gros bouton « Lire
   maintenant / Commencer la formation », ouverture directe,
   bandeau si la page a été fermée, page « Retrouver mon
   achat » avec code WhatsApp, surveillance des accès non
   ouverts.
6. Messages d'accès automatiques WhatsApp (Cloud API) + SMS
   de secours + email (section 27).
7. Entonnoir du checkout et relance des paniers abandonnés.
8. Tests : webhook (signature, doublon, montant/devise),
   connexion automatique (jeton à usage unique), « Retrouver
   mon achat » (code correct, incorrect, expiré).

Mesure : sur un écran de 360 px, de la page produit au
produit ouvert, moins de 60 secondes et 3 champs maximum.
```

**Je vérifie (avec mon propre téléphone) :**
- [ ] De la page produit au produit ouvert : moins d'une minute, sans mot de passe.
- [ ] Après le paiement, je suis directement devant mon produit, sans rien fermer ni chercher.
- [ ] Je reçois le lien d'accès sur WhatsApp en quelques secondes.
- [ ] Je ferme la page pendant le paiement, je reviens : le bandeau « Accéder à mon produit » s'affiche.
- [ ] Sur un autre téléphone, « Retrouver mon achat » avec mon numéro me donne accès.
- [ ] En cas de solde insuffisant, le message est clair et je peux réessayer sans tout retaper.

---

## Phase 7 — Espace client : liseuse et lecteur vidéo

```text
Phase 7 : espace client. Sections 20, 21 et 22 du cahier
des charges.

1. Espace client : produits achetés en premier, bibliothèque
   (Lire / Regarder / Télécharger pour chaque langue),
   commandes et reçus, certificats, favoris, profil,
   appareils connectés.
2. PDF professionnels générés par langue + nombre de pages
   réel + images d'aperçu.
3. Liseuse : sommaire, progression, reprise automatique,
   bascule FR ⇄ EN sur le même chapitre, taille du texte,
   thèmes, plein écran, marque-pages, filigrane,
   mini-guide à la première ouverture.
4. Lecteur vidéo Bunny Stream : progression, reprise,
   vitesse, sous-titres FR/EN, version FR/EN, filigrane,
   téléchargement si activé.
5. Téléchargements sécurisés (URL signée 60 s, limite,
   filigrane PDF).
6. Option « Offrir un produit » (section 20.6).
7. Avis clients (acheteurs uniquement) et demande d'avis
   automatique.
8. Tests : accès refusé sans achat ou si désactivé.
```

**Je vérifie :**
- [ ] Je lis un e-book, je ferme, je reviens : je reprends au même endroit.
- [ ] Je bascule de FR à EN dans la liseuse : je reste sur le même chapitre.
- [ ] Le PDF téléchargé est beau et porte mon nom en bas de page.
- [ ] Quand je désactive le téléchargement d'une formation, le bouton disparaît et le lien direct est refusé.

---

## Phase 8 — Back-office admin

```text
Phase 8 : back-office /admin. Section 25 du cahier des
charges (les points 3 et 14 seront faits aux phases 9
et 10 : prévois leur emplacement).

Je gère ma boutique depuis mon téléphone : tout doit être
parfaitement utilisable sur mobile.

Points importants :
- Tableau de bord avec entonnoir du checkout, accès non
  ouverts, ventes par pays, langue, moyen de paiement,
  code promo, campagne et source.
- Produits FR / EN côte à côte, ventes antérieures, aperçus,
  bonus, badges, offre de lancement.
- Éditeur d'e-book, formations, pages de vente
  publicitaires, packs.
- Promotions en un clic, popups, bannières.
- Commandes (renvoyer l'accès, rembourser, offrir), clients,
  avis et témoignages (import), abonnés.
- Paiements (routage, devises, instructions par opérateur),
  modèles de messages, paramètres, équipe, journal.
```

**Je vérifie :**
- [ ] Je lance une promo -45 % en 2 clics depuis mon téléphone.
- [ ] Je renvoie l'accès d'un client par WhatsApp en un clic.
- [ ] J'importe une capture de témoignage WhatsApp et elle s'affiche sur la page produit.
- [ ] L'entonnoir me montre à quelle étape les clients abandonnent.

---

## Phase 9 — Studio IA

```text
Phase 9 : Studio IA. Sections 23 et 24.3 du cahier des
charges.

Voici les prompts système à utiliser :

[COLLE ICI TOUT LE CONTENU DU FICHIER 3-PROMPTS-IA.md]

1. Création d'un e-book : brief → plan à valider → rédaction
   en tâche de fond → traduction → contrôle qualité →
   relecture et régénération ciblée → couverture, page
   produit, page de vente publicitaire, bonus, aperçus,
   prix suggéré, annonces → aperçu → publication.
2. Formation vidéo et vidéo : transcription, sous-titres
   FR/EN, structure, pages de vente, support PDF en option.
3. Import de contenu existant.
4. Tâches de fond avec reprise et notification.
5. Estimation du coût, coût réel, budget mensuel.
6. Boutons IA dans tout l'admin.
7. Générateur d'annonces communauté et de visuels promo.
```

**Je vérifie :**
- [ ] Je demande un e-book de 30 pages : le PDF fait environ 30 pages, en FR et en EN.
- [ ] La page produit et la page de vente sont générées automatiquement dans les deux langues.
- [ ] Je régénère un chapitre avec une consigne : seul ce chapitre change.
- [ ] Le coût de la génération s'affiche.

---

## Phase 10 — Pixels et pages publicitaires

```text
Phase 10 : publicité. Sections 13 et 26 du cahier des
charges.

1. Pages de vente publicitaires /offre/[slug] (section 13) :
   sans menu, sections modifiables, bouton d'achat répété,
   checkout express sans quitter la page, exclues de
   l'indexation.
2. Page admin « Pixels et suivi » : tous les outils de la
   section 26.1, réglés dans l'admin sans redéployer,
   jetons chiffrés.
3. Événements de la section 26.2 ; Purchase côté serveur
   ET navigateur avec le même event_id ; correspondance
   avancée ; UTM et identifiants de clic ; devise de
   reporting ; flux catalogue.
4. Guide de connexion intégré pour chaque outil (26.4).
5. Page « Santé du suivi » avec pastilles et simulation
   d'un parcours d'achat test (26.5).
6. Générateur de liens et paramètres UTM prêts à copier
   pour Meta et TikTok (26.6), rapport par campagne.
7. Bannière cookies FR/EN + Google Consent Mode v2.
```

**Je vérifie :**
- [ ] J'ai connecté mon pixel Meta en suivant le guide de l'admin, et la pastille est verte.
- [ ] « Simuler un parcours d'achat test » fait apparaître les événements dans l'outil de test de Meta et de TikTok.
- [ ] Un achat test n'est compté qu'une seule fois dans Meta.
- [ ] Le rapport m'indique de quelle publicité vient chaque vente test.

---

## Phase 11 — Assistant IA, messages marketing et pages légales

```text
Phase 11 : sections 24.1, 24.2, 27 et 29 du cahier des
charges.

1. Coach DigiSkool (prompt n° 1 de 3-PROMPTS-IA.md) :
   langue du visiteur, catalogue + prix + promos + FAQ +
   instructions de paiement injectés, streaming, limites,
   lien WhatsApp.
2. Tous les messages de la section 27 (WhatsApp, SMS,
   email) en FR et EN, avec les textes des modèles WhatsApp
   à faire valider par Meta.
3. Lead magnet (numéro WhatsApp ou email → e-book gratuit).
4. Pages légales FR et EN : mentions légales, CGV,
   confidentialité, remboursement, cookies, adaptées à la
   vente de produits digitaux en Afrique et en Europe, avec
   des [CROCHETS] là où je dois compléter.
5. Blog simple bilingue.
```

**Je vérifie :**
- [ ] Je demande au Coach « Comment payer avec Orange Money ? » : il explique clairement, étape par étape.
- [ ] Je lui demande une réduction inventée : il refuse poliment.
- [ ] Je m'inscris au lead magnet et je reçois l'e-book.
- [ ] Je fais relire les pages légales par un professionnel avant le lancement.

---

## Phase 12 — Tests, sécurité et mise en ligne

```text
Phase 12 : finalisation et mise en ligne. Sections 29,
31 et 33 du cahier des charges.

1. Audit de sécurité complet. Corrige ce qui manque.
2. Tests de bout en bout Playwright, FR et EN, écran 360 px :
   publicité → page produit → checkout → paiement test →
   produit ouvert, en moins de 60 secondes.
3. Performance avec les pixels actifs : Lighthouse mobile
   ≥ 90, LCP < 2,5 s, INP < 200 ms, CLS < 0,1.
4. Accessibilité : contrastes, clavier, popups.
5. Supprime les avis et témoignages de démonstration.
6. Guide de mise en ligne pas à pas :
   - Vercel + domaine [DOMAINE] ;
   - DNS email Resend (SPF, DKIM, DMARC) ;
   - WhatsApp Business Platform : numéro, vérification de
     l'entreprise, validation des modèles de messages ;
   - SMS de secours ;
   - clés de paiement en mode réel + URL des webhooks ;
   - Bunny Stream, Inngest, sauvegardes Supabase, Sentry.
7. README final.
```

**Je vérifie avant le lancement :**
- [ ] J'achète un vrai produit à petit prix avec mon téléphone et mon compte Mobile Money : je suis devant le produit en moins d'une minute.
- [ ] Un proche qui n'achète jamais en ligne arrive à payer seul, sans aide.
- [ ] Un ami anglophone achète depuis son téléphone en anglais : tout est en anglais, jusqu'au message WhatsApp.
- [ ] Le message d'accès WhatsApp arrive en quelques secondes.
- [ ] Mes pixels Meta et TikTok reçoivent l'achat, une seule fois.
- [ ] Le site est fluide sur un vieux téléphone Android.
- [ ] Les pages légales sont complétées et relues.
- [ ] Les liens de la communauté FR et EN fonctionnent.
- [ ] Les avis de démonstration ont été supprimés.

---

## Prompts de secours

**Quand quelque chose ne marche pas :**

```text
Il y a un problème : [décris ce que tu fais, ce que tu attends,
et ce qui se passe à la place].
Langue du site : [FR / EN]. Appareil : [téléphone / ordinateur].
Voici le message d'erreur : [colle l'erreur].

1. Explique-moi la cause en termes simples.
2. Corrige-la sans casser le reste.
3. Liste les fichiers modifiés.
4. Dis-moi comment vérifier que c'est réglé.
```

**Pour ajouter une fonctionnalité plus tard :**

```text
Je veux ajouter : [fonctionnalité].
Elle doit fonctionner en français et en anglais, et rester
simple pour un client qui achète rarement en ligne.
Avant de coder, propose-moi un plan court : fichiers touchés,
changements de base de données, risques pour l'existant.
Attends mon accord avant de commencer.
```

**Pour améliorer le design d'une page :**

```text
La page [nom de la page] ne me plaît pas : [ce qui ne va pas].
Améliore-la en respectant le design system DigiSkool
(section 7 : bleu nuit + or, rouge promo, Plus Jakarta Sans
+ Inter, style premium), en priorité sur mobile, dans les deux
langues. Ne change pas la logique.
```

**Pour améliorer les ventes d'une page :**

```text
Analyse la page [nom de la page] comme un expert en conversion
qui vend des produits digitaux en Afrique sur mobile.
Liste les 5 changements qui augmenteraient le plus les ventes,
du plus important au moins important, en restant honnête
(pas de fausses preuves ni de fausses urgences).
Attends mon accord avant de les appliquer.
```
