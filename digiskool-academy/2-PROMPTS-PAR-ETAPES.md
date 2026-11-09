# DigiSkool Academy — Prompts étape par étape

Envoie ces prompts **un par un**, dans l'ordre, à l'IA qui code la plateforme.
Après chaque phase, fais les vérifications « Je vérifie » avant de passer à la suite.

> Pourquoi par étapes ? Un seul prompt géant pousse l'IA à sauter des fonctionnalités. Phase par phase, chaque partie est construite et testée correctement.

---

## Étape préalable — Préparer le projet (une seule fois)

1. Sur **github.com**, crée un dépôt **privé et vide** nommé `digiskool-academy`.
2. Ouvre **Claude Code** sur ce dépôt (application Claude, onglet Code, ou claude.ai/code).
3. Envoie ce message :

```text
Prépare le projet DigiSkool Academy, sans rien coder d'autre :
1. Récupère les fichiers du dossier digiskool-academy du dépôt
   GitHub RogerBOUJIEKA/RogerBOUJIEKA (branche main).
2. Copie 1-PROMPT-COMPLET.md, 3-PROMPTS-IA.md,
   4-CHARTE-DE-MARQUE.md, 5-MAQUETTES.md et
   6-PLAN-DE-LANCEMENT.md dans un dossier docs/.
3. Copie 7-CLAUDE.md à la racine sous le nom CLAUDE.md, et
   beta/index.html dans docs/prototype-beta.html (référence
   visuelle).
4. Crée docs/AVANCEMENT.md avec le titre « Avancement du
   projet » et la liste des 14 phases, toutes « à faire ».
5. Fais un commit « Mise en place des documents du projet »
   et pousse-le.
```

---

## Prompt 0 — Le contexte (à envoyer en premier)

```text
Je vais construire avec toi DigiSkool Academy, ma plateforme
personnelle de vente de produits digitaux (e-books, formations
vidéo, vidéos), bilingue français / anglais, pour l'Afrique
francophone, l'Afrique anglophone, la diaspora et
l'international. Mon entreprise est au Cameroun. Domaine :
digiskoolacademy.com. Site web + application (Android,
iPhone, ordinateur).

Lis en entier CLAUDE.md, puis tous les fichiers du dossier
docs/ : le cahier des charges (1-PROMPT-COMPLET.md), la charte
de marque (4-CHARTE-DE-MARQUE.md), les maquettes
(5-MAQUETTES.md), les prompts de l'IA intégrée
(3-PROMPTS-IA.md) et le plan de lancement
(6-PLAN-DE-LANCEMENT.md).

Les priorités absolues :
1. Zéro inscription, zéro mot de passe pour les clients.
2. Paiement ultra simple (3 champs maximum, MTN MoMo et
   Orange Money en quelques secondes, prix dans la devise
   du visiteur).
3. Accès immédiat au produit après le paiement.
4. Un niveau de design et de finition international.
5. Les e-books au cœur du catalogue : la meilleure
   expérience de lecture possible.

Pour l'instant, ne code rien. Je veux que tu :
1. Résumes en 15 points ce que tu as compris.
2. Proposes l'arborescence des dossiers du projet.
3. Listes les informations et les comptes qui te manquent.
4. Me dises ce que tu ferais différemment ou en plus, en
   tant qu'expert, et pourquoi.
5. Confirmes le plan en 14 phases.
6. Notes tout cela dans docs/AVANCEMENT.md.

Attends mon feu vert avant de commencer la phase 1.
```

> **Conseil Claude Code :** ouvre **une nouvelle session pour chaque phase** et commence par « Lis CLAUDE.md et docs/AVANCEMENT.md, puis : » suivi du prompt de la phase. Grâce au journal d'avancement, Claude Code reprend exactement où il s'était arrêté.

---

## Phase 1 — Fondations, bilingue et localisation

```text
Phase 1 : sections 3, 4, 6, 7 et 32 du cahier des charges.

1. Initialise le projet : Next.js + TypeScript strict +
   Tailwind + shadcn/ui + next-intl.
2. Bilingue : routes /fr et /en traduites (section 6.3),
   détection selon la langue du téléphone, bouton FR | EN
   qui garde la même page, liens courts /p/[code],
   aucun texte en dur.
3. Localisation (section 7) : pays détecté par l'IP (sans
   demander le GPS), devise automatique selon le tableau
   7.2, sélecteur de devise, convertisseur ⇄, taux mis à
   jour chaque jour + valeurs manuelles, parité FCFA/euro,
   arrondis commerciaux, prix par zone, taux figé pendant
   la visite.
4. Migration SQL Supabase complète (section 32) : tables,
   traductions, index, contraintes, RLS, triggers, fonctions
   is_admin() et has_access(), buckets.
5. Données de démonstration bilingues (section 37).
6. .env.example et premier README.
7. Tests : détection de la langue, détection du pays et de
   la devise, conversion et arrondis.
```

**Je vérifie :**
- [ ] Mon téléphone en français → site en français ; un navigateur en anglais → site en anglais.
- [ ] Depuis le Cameroun, je vois les prix en FCFA ; avec un VPN au Nigeria, en naira ; en France, en euros.
- [ ] Le convertisseur ⇄ m'affiche le prix dans d'autres devises.
- [ ] Je peux changer la devise en haut de la page et le choix est mémorisé.

---

## Phase 2 — Marque et design system

```text
Phase 2 : section 5 et section 11 du cahier des charges,
et toute la charte de marque.

C'est la phase qui fait la différence entre un site amateur
et un produit international. Je suis designer graphique :
je veux le niveau d'Udemy, Stripe ou Apple, dans les
moindres détails.

1. Jetons de design : une seule source (JSON) → variables
   CSS clair/sombre → thème Tailwind + export Figma.
2. Polices Plus Jakarta Sans + Inter (next/font), hiérarchie
   de la charte (section 5.2), typographie française
   automatique.
3. Logo « Chapeau-Pixel » en SVG (toutes les versions),
   icônes d'application, favicon, motif « Trame DigiSkool »,
   dégradé « Aube digitale ».
4. Tous les composants de la section 5.2 du cahier des
   charges, dans tous leurs états, avec les animations
   signature de la charte (section 8).
5. Éléments signature (charte, section 9) : bloc prix,
   étiquettes, chrono, badge FR + EN, réassurance,
   carte WhatsApp.
6. Pages /admin/design et /admin/marque.
7. Générateur de couvertures automatiques (section 11) et
   couvertures des produits de démonstration, côte à côte.
8. Police de lecture Literata pour les e-books (charte 5.3).
9. Respecte l'ordre et la hiérarchie des maquettes
   5-MAQUETTES.md pour tous les écrans.
```

**Je vérifie :**
- [ ] `/admin/design` et `/admin/marque` sont beaux et cohérents, en clair et en sombre.
- [ ] Le logo, l'icône et le motif me plaisent (sinon je donne mes corrections de designer).
- [ ] Toutes les couvertures ont le même design, avec des couleurs différentes.
- [ ] J'importe les jetons dans Figma.

---

## Phase 3 — Connexion sans inscription et application installable

```text
Phase 3 : section 9 et sections 10.1, 10.2 et 10.8 du
cahier des charges.

1. Aucune inscription, aucun mot de passe client. Bouton
   « Mes produits » au lieu de « Connexion ».
2. Accès par numéro WhatsApp + code à 6 chiffres (Send SMS
   Hook de Supabase Auth, WhatsApp puis SMS de secours),
   remplissage automatique du code, grandes cases.
3. Options discrètes : Google, lien par email.
4. Session de 1 an, limite d'appareils, écran « Déconnecter
   un autre appareil ? ».
5. Connexion admin séparée : email + mot de passe + double
   authentification.
6. PWA : manifeste, icônes, écran de démarrage animé,
   service worker, page hors ligne, mise à jour automatique.
7. Bouton et page /app « Installer l'application » avec
   détection de l'appareil et guide illustré pour iPhone,
   bannière d'installation discrète.
8. Barre d'onglets en bas sur mobile, transitions,
   tirer pour actualiser.
9. Tests : code correct, incorrect, expiré, limite d'essais.
```

**Je vérifie :**
- [ ] Je ne vois nulle part « S'inscrire » ni « mot de passe ».
- [ ] « Mes produits » → mon numéro → le code arrive sur WhatsApp → je suis connecté.
- [ ] J'installe l'application sur mon Android, sur un iPhone et sur mon ordinateur.
- [ ] L'application s'ouvre avec l'animation du logo, sans barre d'adresse.

---

## Phase 4 — Boutique publique

```text
Phase 4 : sections 12 et 34 du cahier des charges.

1. Header complet (recherche instantanée + Ctrl+K,
   méga-menu, FR | EN, devise ⇄, favoris, notifications,
   panier, Mes produits, Communauté).
2. Accueil complet (section 12.2), dont « Comment ça marche »
   en 3 étapes.
3. Cartes produit (section 12.4) avec aperçu au survol.
4. Boutique, catégories, Promotions, Nouveautés : filtres,
   tri, recherche.
5. Pages À propos, Contact, FAQ, Parrainage, Vérification de
   certificat, 404, hors ligne, maintenance.
6. SEO (section 34).
```

**Je vérifie :**
- [ ] L'accueil fait « produit international » sur mon téléphone.
- [ ] La recherche propose des résultats pendant que je tape.
- [ ] Un lien produit partagé sur WhatsApp affiche la couverture et le titre.

---

## Phase 5 — Page produit, aperçus et preuves sociales

```text
Phase 5 : sections 13, 14 et 15 du cahier des charges.

1. Page produit mobile dans l'ordre exact de la section
   13.1, puis 13.3 et 13.4, conforme aux maquettes 3 et 4.
   Onglets collants (13.7), spécificités e-book (13.8),
   bloc « Valeur de l'offre » (13.9), spécificités
   formation (13.10), questions des lecteurs (13.11).
2. Version ordinateur façon Udemy (13.2).
3. Barre d'achat collante (13.5) et micro-détails (13.6).
4. Aperçus (section 14) : feuilleter l'e-book avec pages
   floutées générées côté serveur ; leçons gratuites sans
   connexion ; écran d'achat en fin d'aperçu.
5. Preuves sociales (section 15) : ventes (dont antérieures),
   étoiles, avis vérifiés, témoignages, badges, achats
   récents et visiteurs en direct réels, certificats
   vérifiables.
6. Test : le texte des pages verrouillées n'est jamais
   envoyé au navigateur.

Tout doit être réel : aucun chiffre, avis ou notification
inventé.
```

**Je vérifie :**
- [ ] Sans faire défiler, je vois le prix dans ma devise, la réduction, le chrono et « Acheter maintenant ».
- [ ] Je feuillette un e-book : premières pages lisibles, suite floutée.
- [ ] Je regarde une leçon gratuite sans être connecté.
- [ ] Je vois « Aperçu de l'intérieur », le sommaire avec le temps de lecture, et le bloc « Valeur de l'offre ».

---

## Phase 6 — Promotions, popups, notifications et communauté

```text
Phase 6 : sections 19, 21, 22, 23, 24.9 et 31.2 du cahier
des charges.

1. Moteur de promotions (section 21) : campagnes, modèles
   en un clic, récurrences, prix de lancement, priorités,
   calcul du prix final côté serveur dans une seule
   fonction testée, affichage partout dans la devise
   du visiteur.
2. Codes promo, liens ?promo=CODE, QR codes, historique
   des prix.
3. Système complet de popups (section 22) : les 14 modèles,
   les 3 familles, le ciblage (dont la source publicitaire),
   les règles de confort, le design, le gestionnaire central,
   les tests A/B et les statistiques. Calendrier
   promotionnel et produit de la semaine (21.7).
4. Bloc WhatsApp (section 19) dans toutes ses variantes et
   bouton flottant (communauté en premier).
5. Communauté (23.1) et parrainage (23.2) avec anti-fraude.
6. Listes d'attente « Bientôt disponible » (24.9) et
   alertes prix sur les favoris.
7. Séquences automatiques (31.2) avec leurs règles (1 message
   par jour maximum, arrêt à l'achat, STOP, pas de message
   entre 21 h et 8 h).
8. Tests : calcul des prix, parrainage, gestionnaire de
   popups (jamais deux fenêtres dans la même visite).
```

**Je vérifie :**
- [ ] « Flash 24 h -45 % sur toutes les formations » en 2 clics : tout change sur le site.
- [ ] La promo disparaît toute seule à la fin du chrono.
- [ ] Je ne vois jamais deux popups dans la même visite.
- [ ] Le bouton flottant propose d'abord la communauté.
- [ ] Mon lien de parrainage donne -10 % à un ami.
- [ ] Je vois des notifications discrètes (nouveauté, achat récent) espacées, jamais sur la page de paiement.
- [ ] Je viens d'un lien publicitaire pour un e-book : le popup me montre cet e-book, pas un autre.
- [ ] Je m'inscris sur la liste d'attente d'un produit et je reçois le message à sa sortie.

---

## Phase 7 — Checkout express, paiements et accès immédiat

```text
Phase 7 : la phase la plus importante pour les ventes.
Sections 8, 17, 18 et 31 du cahier des charges.

1. Checkout express (section 17.1) : 3 champs maximum,
   pré-remplissage pour les clients connus, opérateur
   détecté depuis le numéro, montant débité affiché si la
   devise diffère, un seul bouton « Payer », aide
   contextuelle, erreurs simples, réessayer sans ressaisir.
2. PaymentProvider + NotchPay (principal : MTN MoMo et
   Orange Money avec demande directe sur le téléphone,
   carte) et Flutterwave (secondaire : cartes
   internationales, autres pays) en mode test, routage
   par pays (section 8.3),
   3-D Secure, limites anti-fraude.
3. Écran d'attente Mobile Money (17.2) : statut en direct,
   guide audio, instructions par opérateur, bandeau
   d'incident.
4. Webhook sécurisé et idempotent, rattrapage automatique.
5. Accès immédiat (section 18) : connexion automatique, page
   de succès, ouverture directe, bandeau si la page a été
   fermée, « Retrouver mon achat », accès non ouverts.
6. Messages WhatsApp / SMS / email (section 31).
7. Entonnoir du checkout, relance des paniers abandonnés.
8. Produits gratuits : seulement nom + numéro, sans paiement,
   accès immédiat.
9. Respecte les maquettes 6, 7, 8 et 13.
10. Tests : webhook (signature, doublon, montant/devise),
    connexion automatique (jeton à usage unique).

Mesure : sur un écran de 360 px, de la page produit au
produit ouvert en moins de 60 secondes et 3 champs maximum.
```

**Je vérifie (avec mon propre téléphone) :**
- [ ] De la page produit au produit ouvert : moins d'une minute, sans mot de passe.
- [ ] Après le paiement, je suis directement devant mon produit.
- [ ] Le lien d'accès arrive sur WhatsApp en quelques secondes.
- [ ] Je ferme la page pendant le paiement, je reviens : « Accéder à mon produit » s'affiche.
- [ ] En cas de solde insuffisant, le message est clair et je réessaie sans tout retaper.

---

## Phase 8 — Espace client et expérience d'apprentissage

```text
Phase 8 : sections 24, 25 et 26 du cahier des charges.

1. « Mes produits » : produits achetés en premier,
   bibliothèque FR/EN, commandes, certificats, favoris,
   parrainage, profil, appareils.
2. PDF professionnels (modèle de la charte), images
   d'aperçu.
3. Liseuse complète (section 25.2, maquette 10) : réglages
   Aa, Literata, pages ou défilement, surlignage et notes,
   recherche, partage de citation en image, exercices
   cochables, bascule FR ⇄ EN, fins de chapitre et de livre,
   mini-guide.
3 bis. Lecteur audio (25.3) et collections d'e-books (24.3).
4. Lecteur vidéo Bunny Stream (reprise, vitesse,
   sous-titres, version FR/EN, filigrane).
5. Téléchargements sécurisés (URL signée, limite,
   filigrane PDF).
6. Motivation : séries, badges, anneau de progression,
   rappels, certificat vérifiable.
7. Recommandations en fin de produit, « Offrir »,
   avis clients.
8. Tests : accès refusé sans achat ou si désactivé.
```

**Je vérifie :**
- [ ] Je reprends ma lecture au bon endroit, sur mon téléphone puis sur mon ordinateur.
- [ ] La bascule FR ⇄ EN garde le même chapitre.
- [ ] Le PDF est beau et porte mon nom en bas de page.
- [ ] Mon certificat a un QR code qui ouvre une page de vérification.
- [ ] Je surligne une phrase, j'ajoute une note, et je partage une citation en image sur mon statut WhatsApp.
- [ ] J'écoute un chapitre en version audio, écran verrouillé, dans l'application.

---

## Phase 9 — Centre d'aide et assistant IA

```text
Phase 9 : sections 20, 28.1 et 28.2 du cahier des charges.

1. Centre d'aide /aide et /en/help : recherche, articles
   illustrés, vidéos courtes, guides audio, les 11 articles
   indispensables (section 20), en FR et EN.
2. Aide contextuelle dans le checkout et l'écran d'attente.
3. Coach DigiSkool (prompt n° 1 de 3-PROMPTS-IA.md) :
   langue et devise du visiteur, catalogue, promos, FAQ,
   articles d'aide et instructions de paiement du pays
   injectés, streaming, limites, lien WhatsApp.
4. Statistiques : articles lus, recherches sans résultat.
```

**Je vérifie :**
- [ ] Je cherche « payer orange money » : le bon article s'affiche avec sa vidéo.
- [ ] Je demande au Coach « C'est combien en naira ? » : il répond avec le bon prix.
- [ ] Je lui demande une réduction inventée : il refuse poliment.

---

## Phase 10 — Back-office admin

```text
Phase 10 : section 29 du cahier des charges (les points 3
et 19 seront faits aux phases 11 et 12 : prévois leur
emplacement).

Je gère ma boutique depuis mon téléphone : tout doit être
parfaitement utilisable sur mobile, et l'admin installable
comme application.

Points importants : tableau de bord complet (entonnoir,
accès non ouverts, ventes par pays et devise), produits
FR/EN et prix par zone, éditeur d'e-book, formations, pages
publicitaires, promotions en un clic, calendrier
promotionnel, popups (modèles, ciblage, statistiques),
notifications push, séquences, listes d'attente, collections,
versions audio, questions des lecteurs,
commandes (renvoyer l'accès en un clic), clients, avis et
témoignages, aide, paiements (taux, zones, instructions,
bandeau d'incident), messages, application, paramètres,
équipe, journal.
```

**Je vérifie :**
- [ ] Je lance une promo et j'envoie la notification push en quelques gestes depuis mon téléphone.
- [ ] Je renvoie l'accès d'un client par WhatsApp en un clic.
- [ ] Je modifie un taux de change et les prix se mettent à jour.
- [ ] L'entonnoir me montre où les clients abandonnent.

---

## Phase 11 — Studio IA

```text
Phase 11 : sections 27 et 28.3 du cahier des charges.

Voici les prompts système à utiliser :

[COLLE ICI TOUT LE CONTENU DU FICHIER 3-PROMPTS-IA.md]

1. E-book : brief → plan → rédaction en tâche de fond →
   traduction → contrôle qualité → relecture → couverture,
   page produit, page publicitaire, bonus, aperçus, prix par
   zone, annonces, notification push → publication.
2. Formation et vidéo : transcription, sous-titres FR/EN,
   structure, pages de vente.
3. Import de contenu existant.
4. Estimation du coût, coût réel, budget mensuel.
5. Boutons IA dans tout l'admin.
6. Version audio des e-books (27.4) avec adaptation à l'oral
   et option de voix de Roger.
7. Bonus automatiques (27.5), mises à jour d'e-books (27.6),
   contenus marketing (27.7), brouillons de réponses aux avis
   et questions.
```

**Je vérifie :**
- [ ] Un e-book de 30 pages demandé fait environ 30 pages, en FR et en EN.
- [ ] La page produit et la page publicitaire sont générées dans les deux langues.
- [ ] Je régénère un chapitre : seul ce chapitre change.
- [ ] La version audio est agréable à écouter, et les noms propres sont bien prononcés.
- [ ] Le cahier d'exercices, la fiche mémo, les citations en image et les scripts vidéo sont générés.

---

## Phase 12 — Pixels et pages publicitaires

```text
Phase 12 : sections 16 et 30 du cahier des charges.

1. Pages publicitaires /offre/[slug] (section 16).
2. Page admin « Pixels et suivi » (30.1), réglée sans
   redéployer, jetons chiffrés.
3. Événements (30.2) ; Purchase serveur ET navigateur avec
   le même event_id ; correspondance avancée ; UTM et
   identifiants de clic ; devise de reporting ; flux
   catalogue.
4. Guide de connexion (30.4) et « Santé du suivi » avec
   simulation d'un achat test (30.5).
5. Générateur de liens et paramètres UTM Meta / TikTok
   (30.6), rapport par publicité.
6. Bannière cookies + Google Consent Mode v2.
```

**Je vérifie :**
- [ ] Mon pixel Meta est connecté grâce au guide, pastille verte.
- [ ] « Simuler un parcours d'achat test » apparaît dans les outils de test de Meta et TikTok.
- [ ] Un achat test n'est compté qu'une fois.
- [ ] Le rapport m'indique de quelle publicité vient chaque vente.

---

## Phase 13 — Application : hors ligne, notifications push et stores

```text
Phase 13 : sections 10.3 à 10.7 du cahier des charges.

1. Lecture hors ligne dans l'application (licences,
   vérification du droit d'accès, synchronisation de la
   progression, gestion de l'espace).
2. Notifications push (Web Push) : autorisation au bon
   moment, types, envoi depuis l'admin avec ciblage et
   statistiques, fonctionnement sur Android, ordinateur
   et iPhone (application installée).
3. Paquet Google Play (Trusted Web Activity) : nom de
   paquet com.digiskoolacademy.app, Digital Asset Links, App Links,
   version « Mes produits » sans achats intégrés, fiche du
   store FR et EN.
4. Paquet iPhone avec Capacitor : notifications natives,
   hors ligne, Face ID / empreinte, sans achats intégrés.
5. Microsoft Store via PWABuilder (option).
6. Guide de publication pas à pas pour chaque store, avec
   les règles de paiement à vérifier au moment de publier.
```

**Je vérifie :**
- [ ] Je télécharge un e-book hors ligne, je coupe internet : je peux le lire dans l'application.
- [ ] Je reçois une notification de promo sur mon téléphone.
- [ ] La version Google Play s'installe et ouvre mes produits sans bouton d'achat.

---

## Phase 14 — Sécurité, conformité, tests et mise en ligne

```text
Phase 14 : sections 33, 35 et 37 du cahier des charges.

1. Audit de sécurité complet, corrections.
2. Conformité : pages légales FR/EN (modèles avec des
   [CROCHETS] à compléter), consentements, export et
   suppression des données, factures, préparation fiscale
   (pays, montants hors taxes et taxes).
3. Supervision et alertes (section 35), sauvegardes testées.
4. Tests de bout en bout Playwright, FR et EN, 360 px :
   publicité → produit ouvert en moins de 60 secondes.
5. Performance avec pixels actifs (Lighthouse ≥ 90,
   LCP < 2,5 s, INP < 200 ms, CLS < 0,1), accessibilité.
6. Suppression des données de démonstration.
7. Guide de mise en ligne : Vercel + digiskoolacademy.com (www), DNS email
   (SPF, DKIM, DMARC), WhatsApp Business Platform
   (vérification, modèles), SMS, paiements en mode réel +
   webhooks, Bunny, Inngest, taux de change, sauvegardes,
   Sentry, surveillance.
8. README final.
```

**Je vérifie avant le lancement :**
- [ ] J'achète un vrai produit à petit prix avec mon Mobile Money : produit ouvert en moins d'une minute.
- [ ] Un proche qui n'achète jamais en ligne réussit seul, sans aide.
- [ ] Un ami anglophone au Nigeria voit les prix en naira et tout en anglais, jusqu'au message WhatsApp.
- [ ] Mes pixels Meta et TikTok reçoivent l'achat, une seule fois.
- [ ] Le site est fluide sur un vieux téléphone Android.
- [ ] Les pages légales sont complétées et relues par un professionnel, et un comptable a validé la fiscalité.
- [ ] Les données de démonstration ont été supprimées.

---

## Prompts de secours

**Quand quelque chose ne marche pas :**

```text
Il y a un problème : [décris ce que tu fais, ce que tu attends,
et ce qui se passe à la place].
Langue : [FR / EN]. Devise : [ex. XAF]. Appareil : [téléphone /
ordinateur / application].
Voici le message d'erreur : [colle l'erreur].

1. Explique-moi la cause en termes simples.
2. Corrige-la sans casser le reste.
3. Liste les fichiers modifiés.
4. Dis-moi comment vérifier que c'est réglé.
```

**Pour ajouter une fonctionnalité :**

```text
Je veux ajouter : [fonctionnalité].
Elle doit fonctionner en français et en anglais, dans toutes
les devises, sur le site et dans l'application, et rester
simple pour un client qui achète rarement en ligne.
Avant de coder, propose-moi un plan court : fichiers touchés,
changements de base de données, risques pour l'existant.
Attends mon accord.
```

**Pour améliorer le design d'une page :**

```text
La page [nom] ne me plaît pas : [ce qui ne va pas].
Améliore-la en respectant strictement la charte de marque
(4-CHARTE-DE-MARQUE.md), en priorité sur mobile, en clair et
en sombre, dans les deux langues. Ne change pas la logique.
```

**Pour améliorer les ventes d'une page :**

```text
Analyse la page [nom] comme un expert en conversion qui vend
des produits digitaux en Afrique sur mobile.
Liste les 5 changements qui augmenteraient le plus les ventes,
du plus important au moins important, en restant honnête
(pas de fausses preuves ni de fausses urgences).
Attends mon accord avant de les appliquer.
```
