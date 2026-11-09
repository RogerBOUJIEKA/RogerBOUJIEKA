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

Pour l'instant, ne code rien. Je veux que tu :
1. Résumes en 15 points ce que tu as compris.
2. Proposes l'arborescence des dossiers du projet.
3. Listes les informations qui te manquent.
4. Confirmes le plan en 11 phases.

Attends mon feu vert avant de commencer la phase 1.
```

---

## Phase 1 — Fondations et bilingue

```text
Phase 1 : fondations et bilingue. Sections 3, 4, 5 et 21
du cahier des charges.

1. Initialise le projet : Next.js + TypeScript strict + Tailwind
   + shadcn/ui + next-intl.
2. Bilingue complet :
   - routes /fr et /en avec les URLs traduites (section 5.3) ;
   - détection automatique selon la langue du téléphone
     (Accept-Language) : français → /fr, anglais → /en,
     autre langue → langue par défaut ;
   - bouton FR | EN dans le header qui garde la même page
     et mémorise le choix (cookie 1 an, prioritaire) ;
   - liens courts /p/[code] sans langue qui redirigent
     vers la bonne langue ;
   - fichiers messages/fr.json et messages/en.json,
     aucun texte en dur.
3. Migration SQL Supabase complète (section 21) : tables,
   tables de traduction, index, contraintes, RLS, triggers,
   fonctions is_admin() et has_access(), buckets.
4. Authentification (email + mot de passe, lien magique,
   Google, mot de passe oublié), dans les deux langues.
   Middleware : /[locale]/compte pour les connectés,
   /admin pour l'admin.
5. Données de démonstration bilingues (section 26).
6. .env.example, premier README, et explique-moi comment
   me donner le rôle admin.
7. Tests : détection de la langue (FR, EN, autre, cookie).
```

**Je vérifie :**
- [ ] Mon téléphone est en français → le site s'ouvre en français.
- [ ] Je passe mon téléphone en anglais (ou j'utilise un navigateur en anglais) → le site s'ouvre en anglais.
- [ ] Le bouton FR | EN change la langue et reste sur la même page.
- [ ] Je peux créer un compte, me connecter, et accéder à `/admin` après la commande SQL.

---

## Phase 2 — Identité visuelle et couvertures automatiques

```text
Phase 2 : identité visuelle DigiSkool et couvertures.
Sections 7 et 8 du cahier des charges.

1. Thème complet : couleurs, polices Poppins et Inter,
   mode sombre, composants de base (boutons, cartes, badges,
   étiquettes promo, compte à rebours, bandeau de confiance,
   logos de paiement).
2. Logo provisoire DigiSkool Academy (SVG).
3. Header (avec FR | EN, devise, panier, bouton
   « Rejoindre la communauté ») et footer complets,
   bouton support WhatsApp flottant.
4. Générateur de couvertures automatiques :
   - un seul modèle de design pour tous les produits,
     seule la couleur change (palette de 12 couleurs) ;
   - titre FR sur la couverture FR, titre EN sur la EN ;
   - formats 3:4, 1:1, 16:9, 9:16 et Open Graph ;
   - régénération quand le titre ou la couleur change ;
   - effet livre 3D en CSS pour les e-books.
5. Génère les couvertures des produits de démonstration
   et montre-les-moi côte à côte.
```

**Je vérifie :**
- [ ] Toutes les couvertures ont le même design, avec des couleurs différentes.
- [ ] La couverture anglaise affiche bien le titre en anglais.
- [ ] Le site a l'air professionnel sur mon téléphone.

---

## Phase 3 — Boutique publique

```text
Phase 3 : boutique publique bilingue. Section 9
du cahier des charges (sauf 9.5 et 9.6).

1. Page d'accueil complète (section 9.2).
2. Boutique, pages E-books, Formations, Vidéos, Promotions,
   Nouveautés : filtres, tri, recherche instantanée.
3. Cartes produit avec prix barré, étiquettes promo
   et mini compte à rebours.
4. Page produit complète (section 9.4) : bloc prix,
   mention « Version française + English version incluses »,
   programme, extrait gratuit, FAQ, avis, barre d'achat
   collante sur mobile.
5. Détection du pays et sélecteur de devise, prix convertis
   avec les règles d'arrondi (section 6.1).
6. Pages À propos, Contact, FAQ, 404, dans les deux langues.
7. SEO : métadonnées par langue, hreflang, Open Graph,
   JSON-LD, sitemap.xml, robots.txt.

Priorité : rendu parfait et rapide sur mobile.
Les boutons d'achat peuvent rester inactifs (phase 5).
```

**Je vérifie :**
- [ ] Je passe de FR à EN sur une page produit : je reste sur le même produit, traduit.
- [ ] Quand je partage un lien produit sur WhatsApp, la couverture et le titre apparaissent.
- [ ] Les prix s'affichent dans la bonne devise.
- [ ] Le site est rapide sur mon téléphone en 4G.

---

## Phase 4 — Promotions, popups et communauté

```text
Phase 4 : moteur de promotions, popups et communauté.
Sections 10, 11 et 12 du cahier des charges.

1. Moteur de promotions : campagnes (pourcentage ou montant,
   portée, dates, application automatique ou par code,
   textes FR/EN, style d'étiquette, priorité, cumul).
   Le calcul du prix final se fait côté serveur, dans une
   seule fonction testée.
2. Affichage partout : barre promo en haut avec compte à
   rebours et code à copier, étiquettes sur les cartes,
   prix barré + économie, page Promotions.
3. Codes promo avec canal, liens ?promo=CODE (mémorisés
   7 jours), QR codes.
4. Promotions récurrentes programmées (ex. chaque vendredi).
5. Historique des prix (price_history).
6. Popups : nouveauté, offre spéciale, invitation communauté,
   notifications d'achats récents (vraies commandes
   uniquement), avec les règles communes de la section 11
   (un seul popup par session, jamais pendant le paiement).
7. Communauté : bouton partout, page /communaute, liens FR/EN
   selon la langue, comptage des clics.
8. Tests : calcul des prix avec promotions, priorités,
   codes promo, devises et arrondis.

Règle absolue : les comptes à rebours affichent la vraie date
de fin de l'offre, et le prix barré est le vrai prix normal.
```

**Je vérifie :**
- [ ] J'active une promo -45 % sur toutes les formations : les étiquettes, la barre et les prix changent partout.
- [ ] Le compte à rebours affiche la vraie fin de l'offre, et la promo disparaît toute seule à la fin.
- [ ] Un lien `?promo=CODE` applique bien le code au panier.
- [ ] Je ne vois jamais deux popups dans la même visite.

---

## Phase 5 — Paiements multi-pays et livraison

```text
Phase 5 : panier, checkout, paiements et livraison.
Sections 6, 9.5, 9.6, 15 et 20 du cahier des charges.

1. Panier, checkout sans compte obligatoire (compte créé
   automatiquement + lien magique), order bump, code promo,
   consentement WhatsApp facultatif.
2. Couche PaymentProvider + [FOURNISSEUR_PRINCIPAL] et
   [FOURNISSEUR_SECONDAIRE] en mode test : Mobile Money
   et carte.
3. Routage par pays (quels moyens de paiement s'affichent
   pour quel pays), logos de paiement du pays.
4. Webhook sécurisé : signature, re-vérification auprès du
   fournisseur, contrôle montant + devise, idempotence.
5. Commande payée → accès aux deux versions de chaque produit
   (et de chaque produit d'un pack) → email de livraison
   dans la langue du client → notification admin.
6. Pages succès / en attente / échec, tâche de rattrapage
   (Vercel Cron), paiement manuel avec validation admin.
7. Emails React Email bilingues (section 20, points 1 à 3
   et 8).
8. Tests : signature invalide, webhook reçu deux fois,
   montant ou devise incorrects.

Ne fais JAMAIS confiance aux prix envoyés par le navigateur.
```

**Je vérifie :**
- [ ] Un achat test en Mobile Money va jusqu'au bout et je reçois l'email.
- [ ] Un achat test par carte fonctionne aussi.
- [ ] Le client a accès à la version FR **et** à la version EN.
- [ ] Je reçois la notification de vente.
- [ ] Les tests automatisés passent (demande à l'IA de te montrer le résultat).

---

## Phase 6 — Espace client : liseuse et lecteur vidéo

```text
Phase 6 : espace client. Sections 13, 14 et 15
du cahier des charges.

1. /compte : tableau de bord, bibliothèque (boutons Lire /
   Regarder et Télécharger pour chaque langue), commandes
   avec reçu PDF, certificats, profil.
2. Génération du PDF professionnel de chaque e-book par
   langue (couverture, sommaire cliquable, en-têtes et pieds
   de page DigiSkool, numéros de page) + nombre de pages réel.
3. Liseuse d'e-books : sommaire, progression, reprise
   automatique, bascule FR ⇄ EN sur le même chapitre, taille
   du texte, thèmes clair / sépia / sombre, plein écran,
   marque-pages, filigrane discret.
4. Lecteur vidéo (Bunny Stream, jetons signés) : modules,
   leçons, progression, reprise à la seconde, vitesse,
   sous-titres FR/EN, version FR/EN de la vidéo, filigrane
   dynamique, « Marquer comme terminé », « Leçon suivante ».
5. Téléchargements sécurisés (URL signée 60 s, limite par
   produit et par langue, filigrane PDF nom + email),
   uniquement si le téléchargement est activé pour ce produit
   ou cette leçon.
6. Certificat de fin de formation (PDF, FR ou EN).
7. Avis clients (acheteurs uniquement).
8. Tests : accès refusé aux chapitres, leçons et
   téléchargements sans achat ou si désactivé.
```

**Je vérifie :**
- [ ] Je lis un e-book sur mon téléphone, je ferme, je reviens : je reprends au même endroit.
- [ ] Je bascule de FR à EN dans la liseuse : je reste sur le même chapitre.
- [ ] Le PDF téléchargé est beau et contient mon nom et mon email en bas de page.
- [ ] Quand je désactive le téléchargement d'une formation, le bouton disparaît et le lien direct est refusé.
- [ ] Avec un compte qui n'a rien acheté, je ne peux rien lire ni télécharger, même en tapant l'adresse.

---

## Phase 7 — Back-office admin

```text
Phase 7 : back-office /admin. Section 18 du cahier des
charges, points 1, 2, 4 à 12, 14 à 17 (les points 3 et 13
seront faits aux phases 8 et 9 : prévois leur emplacement).

Le back-office doit être entièrement utilisable depuis mon
téléphone : je gère ma boutique depuis mon mobile.

Points importants :
- Tableau de bord avec ventes par pays, langue, moyen de
  paiement, code promo, campagne et source.
- Produits avec édition FR et EN côte à côte et indicateur
  « version complète ».
- Éditeur d'e-book (chapitres, sections, aperçu liseuse
  et PDF).
- Formations et vidéos (vidéos FR/EN, sous-titres,
  téléchargement activable).
- Promotions : modèles en un clic (« Flash 24 h -45 % sur
  toutes les formations »…), codes, liens, QR codes,
  statistiques.
- Popups et bannières avec aperçu.
- Commandes (rembourser, valider un paiement manuel,
  offrir un produit), clients, abonnés et communauté
  avec export CSV.
- Paiements (routage par pays, devises, taux, arrondis),
  paramètres, équipe support, journal d'activité.
```

**Je vérifie :**
- [ ] Je lance « Flash 24 h -45 % sur toutes les formations » en 2 clics depuis mon téléphone.
- [ ] Je modifie un produit en FR et en EN depuis mon téléphone.
- [ ] J'offre un produit à une adresse email : la personne reçoit l'accès.
- [ ] Rembourser une commande retire bien l'accès.
- [ ] L'export CSV s'ouvre dans Excel ou Google Sheets.

---

## Phase 8 — Studio IA

```text
Phase 8 : Studio IA. Sections 16 et 17.3 du cahier des
charges.

Voici les prompts système à utiliser :

[COLLE ICI TOUT LE CONTENU DU FICHIER 3-PROMPTS-IA.md]

1. Création d'un e-book : brief (dont nombre de pages et
   stratégie) → 3 titres + plan détaillé à valider →
   rédaction chapitre par chapitre en tâche de fond avec
   progression → traduction complète dans l'autre langue →
   contrôle qualité → relecture et régénération d'une
   partie avec consigne → couverture, page de vente FR/EN,
   extrait, prix suggéré, posts réseaux sociaux, message
   WhatsApp → aperçu → publier ou programmer.
2. Création d'une formation vidéo ou d'une vidéo :
   transcription, sous-titres FR/EN, structure, page de
   vente, support PDF en option.
3. Import d'un contenu existant (.md, .docx, .pdf, .txt
   ou texte collé) → découpage → traduction → page de vente.
4. Tâches de fond (Inngest ou Trigger.dev) avec reprise
   en cas d'échec et notification à la fin.
5. Estimation du coût avant génération, coût réel enregistré,
   budget IA mensuel.
6. Boutons IA dans tout l'admin (traduire, améliorer,
   SEO, FAQ, posts, message WhatsApp).
7. Générateur de message promo pour la communauté
   (FR + EN, lien court, code, date de fin) et de visuel
   promo 9:16 et 1:1.
```

**Je vérifie :**
- [ ] Je demande un e-book de 30 pages : le plan me convient, la rédaction se fait toute seule et le PDF fait environ 30 pages.
- [ ] La version anglaise est complète et naturelle.
- [ ] La page de vente est générée en FR et en EN, avec la couverture.
- [ ] Je régénère un chapitre avec une consigne et seul ce chapitre change.
- [ ] Le coût de la génération s'affiche.

---

## Phase 9 — Pixels et suivi publicitaire

```text
Phase 9 : pixels et suivi. Section 19 du cahier des charges.

1. Page admin « Pixels et suivi » : Meta (pixel + API
   Conversions), TikTok (pixel + Events API), GA4, Google Ads,
   Google Tag Manager, Snapchat, Pinterest, X, LinkedIn,
   Microsoft Clarity, vérifications de domaine.
   Tout se règle dans l'admin, sans redéployer. Jetons
   secrets chiffrés (Supabase Vault).
2. Événements de la section 19.2, dont JoinCommunity.
3. Purchase envoyé côté serveur (webhook) ET navigateur
   avec le même event_id (pas de doublon).
4. Correspondance avancée (email et téléphone hachés),
   capture fbclid / ttclid / gclid / _fbp / _fbc et UTM
   (premier et dernier contact) enregistrés avec la commande.
5. Flux catalogue produits par langue (Meta, TikTok).
6. Bannière cookies FR/EN + Google Consent Mode v2.
7. Page de test : derniers événements, statut par
   destination, bouton « Envoyer un événement test ».
```

**Je vérifie :**
- [ ] Mon pixel Meta reçoit les événements (outil « Tester les événements » de Meta).
- [ ] Un achat test apparaît une seule fois dans Meta (pas de doublon).
- [ ] Mon pixel TikTok reçoit les événements.
- [ ] Le tableau de bord admin montre bien la source (UTM) de mes ventes test.

---

## Phase 10 — Assistant de vente IA, marketing et pages légales

```text
Phase 10 : assistant IA, marketing et conformité.
Sections 9.2, 9.7, 17.1, 20 et 22 du cahier des charges.

1. Widget « Coach DigiSkool » (prompt dans 3-PROMPTS-IA.md) :
   langue du visiteur, catalogue + prix dans sa devise +
   promos actives + FAQ injectés depuis la base, streaming,
   limites, lien support WhatsApp.
2. Lead magnet : formulaire email (+ WhatsApp facultatif
   avec consentement) → envoi automatique de l'e-book
   gratuit → abonné enregistré.
3. Relance de panier abandonné (1 h après), email
   « nouveau produit » envoyé depuis l'admin.
4. Pages légales FR et EN : mentions légales, CGV,
   confidentialité, remboursement, cookies. Rédige des
   modèles adaptés à la vente de produits digitaux en
   Afrique et en Europe, avec des [CROCHETS] là où je dois
   compléter.
5. Blog simple bilingue géré depuis l'admin.
```

**Je vérifie :**
- [ ] Je demande au Coach « Quel produit pour débuter ? » en français puis en anglais : il recommande un vrai produit avec le bon prix.
- [ ] Je lui demande une réduction inventée : il refuse poliment.
- [ ] Je m'inscris au lead magnet et je reçois l'e-book.
- [ ] Je fais relire les pages légales par un professionnel avant le lancement.

---

## Phase 11 — Tests, sécurité et mise en ligne

```text
Phase 11 : finalisation et mise en ligne.

1. Audit de sécurité : RLS de chaque table, aucune clé
   secrète côté navigateur, en-têtes de sécurité (CSP
   compatible avec les pixels), limitation des requêtes,
   validation des entrées. Corrige ce qui manque.
2. Tests de bout en bout (Playwright), en FR et en EN :
   visite → promo → produit → paiement test → email →
   lecture en ligne → téléchargement.
3. Performance : Lighthouse mobile ≥ 90 sur l'accueil,
   la boutique et une page produit, avec les pixels actifs.
4. Accessibilité : contrastes, clavier, popups accessibles.
5. Guide de mise en ligne pas à pas :
   - Vercel + domaine [DOMAINE] ;
   - DNS email Resend (SPF, DKIM, DMARC) pour éviter le spam ;
   - clés de paiement en mode réel + URL des webhooks ;
   - Bunny Stream (domaine autorisé) ;
   - Inngest en production ;
   - sauvegardes Supabase, Sentry.
6. README final à jour.
```

**Je vérifie avant le lancement :**
- [ ] J'achète un vrai produit à petit prix avec mon téléphone et mon compte Mobile Money.
- [ ] Un ami anglophone achète depuis son téléphone en anglais : tout est en anglais, de la boutique à l'email.
- [ ] L'email de livraison arrive dans la boîte principale (pas en spam).
- [ ] Le site fonctionne sur un vieux téléphone Android.
- [ ] Mes pixels reçoivent l'achat.
- [ ] Les pages légales sont complétées et relues.
- [ ] Les liens de la communauté WhatsApp FR et EN fonctionnent.

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
Elle doit fonctionner en français et en anglais.
Avant de coder, propose-moi un plan court : fichiers touchés,
changements de base de données, risques pour l'existant.
Attends mon accord avant de commencer.
```

**Pour améliorer le design d'une page :**

```text
La page [nom de la page] ne me plaît pas : [ce qui ne va pas].
Améliore-la en restant dans l'identité DigiSkool Academy
(bleu nuit + or, rouge promo, Poppins / Inter, style premium),
en priorité sur mobile, dans les deux langues.
Ne change pas la logique.
```
