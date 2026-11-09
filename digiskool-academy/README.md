# DigiSkool Academy — Kit de prompts

Kit complet pour faire construire par une IA **DigiSkool Academy**, la plateforme personnelle de Roger BOUJIEKA pour vendre ses produits digitaux (e-books, formations vidéo, vidéos) :

- 100 % **bilingue français / anglais**, avec détection automatique de la langue du téléphone ;
- chaque produit livré en **version française + version anglaise** ;
- **paiements locaux africains** (Mobile Money) + carte bancaire ;
- **promotions permanentes** affichées partout, **communauté WhatsApp** mise en avant ;
- **e-books créés par l'IA** et lisibles directement sur la plateforme ;
- **pixels publicitaires** (Meta, TikTok, Google…) configurables depuis l'admin.

## Ce que contient le dossier

| Fichier | À quoi il sert |
|---|---|
| [1-PROMPT-COMPLET.md](1-PROMPT-COMPLET.md) | Le cahier des charges complet de la plateforme. C'est la base de tout. |
| [2-PROMPTS-PAR-ETAPES.md](2-PROMPTS-PAR-ETAPES.md) | Les prompts à envoyer un par un (contexte + 11 phases), avec ce que tu dois vérifier après chaque phase. |
| [3-PROMPTS-IA.md](3-PROMPTS-IA.md) | Les instructions de toutes les IA intégrées à la plateforme : assistant de vente, création d'e-books, traduction, pages de vente, messages promo WhatsApp. |

## Ton plan en 5 points → où c'est dans le kit

| Ton objectif | Dans le cahier des charges |
|---|---|
| 01 — Lancer la plateforme | Tout le kit, phases 1 à 11 |
| 02 — Grande communauté WhatsApp | Section 12 (bouton partout, liens FR/EN, statistiques) + section 10.5 (messages WhatsApp générés par l'IA) |
| 03 — Promotions permanentes et codes promo partout | Sections 10 et 11 (campagnes en 2 clics, promos récurrentes, étiquettes, comptes à rebours, liens promo, QR codes, popups) |
| 04 — Plateforme anglais / français | Section 5 (détection automatique + bouton FR / EN) |
| 05 — Chaque produit en FR et EN | Sections 13 et 16 (deux versions, traduction automatique par l'IA, liseuse et téléchargement dans les deux langues) |

## Comment l'utiliser

1. **Remplis la fiche ci-dessous**, puis remplace chaque `[CROCHET]` dans les 3 fichiers par ta valeur.
2. **Choisis ton outil :**
   - **Claude Code** ou **Cursor** (recommandé : la plateforme est grande et encaisse de l'argent). Astuce : copie `1-PROMPT-COMPLET.md` dans ton projet sous `docs/cahier-des-charges.md` et dis à l'IA de le lire au début de chaque phase.
   - **Lovable** ou **Bolt** : plus rapide si tu ne codes pas. Si l'outil a un espace « Knowledge » ou « instructions du projet », colles-y le cahier des charges.
3. **Envoie le Prompt 0**, puis **les phases 1 à 11, une par une**. Fais les vérifications de chaque phase avant de passer à la suivante.

> Astuce mobile : sur GitHub, ouvre le fichier puis appuie sur **Raw** pour tout sélectionner et copier facilement.

## Fiche à personnaliser

| Variable | Exemple | Ta valeur |
|---|---|---|
| `[DOMAINE]` | digiskool-academy.com (vérifie qu'il est libre) | |
| `[LANGUE_PAR_DEFAUT]` | anglais (pour les visiteurs dont le téléphone n'est ni en français ni en anglais) | |
| `[DEVISE_DE_BASE]` | FCFA (XAF) ou USD | |
| `[FOURNISSEUR_PRINCIPAL]` | Afrique francophone : CinetPay, NotchPay, FedaPay, Fapshi… | |
| `[FOURNISSEUR_SECONDAIRE]` | Afrique anglophone + cartes : Paystack, Flutterwave… | |
| `[WHATSAPP_SUPPORT]` | numéro du service client | |
| `[LIEN_COMMUNAUTE_FR]` | lien d'invitation de la communauté francophone | |
| `[LIEN_COMMUNAUTE_EN]` | lien de la communauté anglophone (ou le même lien) | |
| `[EMAIL_CONTACT]` | contact@ton-domaine.com | |
| `[RÉSEAUX]` | liens Facebook, Instagram, TikTok, YouTube | |
| `[LEAD_MAGNET]` | titre de ton e-book gratuit | |
| `[REMBOURSEMENT]` | ex. « Satisfait ou remboursé pendant 7 jours » | |

Pour les fournisseurs de paiement : vérifie lesquels acceptent une entreprise enregistrée dans ton pays, et quels pays et moyens de paiement ils couvrent. Le cahier des charges permet d'en brancher deux et de choisir lequel s'affiche pour chaque pays.

## Services à prévoir

| Service | Rôle | Coût |
|---|---|---|
| Supabase | Base de données, comptes, fichiers | Gratuit pour démarrer, puis offre payante quand ça grandit |
| Vercel | Hébergement du site | Plan **Pro** nécessaire (le plan gratuit n'autorise pas l'usage commercial) |
| Fournisseurs de paiement | Mobile Money + carte | Commission sur chaque vente |
| Bunny Stream | Vidéos protégées | Faible, selon le volume de vidéos regardées |
| API Claude (Anthropic) | Création d'e-books, traductions, assistant de vente | Payé à l'usage ; ordre de grandeur : quelques dollars pour un e-book de 50 pages en FR + EN |
| Inngest ou Trigger.dev | Tâches longues (génération IA, PDF) | Gratuit pour démarrer |
| Resend | Emails automatiques | Gratuit pour un petit volume |
| Nom de domaine | ton-domaine.com | Environ 10 à 20 $ par an |

Vérifie les tarifs actuels sur le site de chaque service avant de t'abonner.

**Modèle d'IA :** le prompt utilise `claude-opus-5-5`, le plus capable, pour tout. Si tu veux réduire le coût de l'assistant de vente (le chat utilisé par les visiteurs), tu peux mettre `claude-haiku-5-5`, beaucoup moins cher, dans la variable `ANTHROPIC_CHAT_MODEL`. C'est ton choix : teste les deux sur quelques questions de clients avant de décider.

## Deux conseils pour tes promotions

1. **Garde des promos réelles.** Le cahier des charges impose que le prix barré soit le vrai prix normal et que le compte à rebours affiche la vraie fin de l'offre. Un minuteur qui se relance tout seul fait perdre la confiance des clients, et c'est interdit pour les visiteurs européens.
2. **Fais tourner les promos plutôt que tout réduire tout le temps.** Par exemple : flash 24 h sur les formations le vendredi, e-books le week-end, lancement d'un nouveau produit à -30 %. Si tout est à -45 % en permanence, les clients considèrent -45 % comme le prix normal, et ta communauté perd l'envie de guetter les annonces.
