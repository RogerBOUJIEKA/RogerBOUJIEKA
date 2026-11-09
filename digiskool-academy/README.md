# DigiSkool Academy — Kit de prompts

> **Apprenez. Appliquez. Avancez.** — *Learn. Apply. Grow.*

Kit complet pour faire construire par une IA **DigiSkool Academy**, la plateforme personnelle de Roger BOUJIEKA pour vendre ses e-books, formations vidéo et vidéos. Elle prend Udemy comme modèle et va plus loin :

- **marque premium** de niveau international (charte complète : logo, couleurs, polices, animations, ton) ;
- **zéro inscription, zéro mot de passe** : le client accède à ses produits avec son numéro WhatsApp ;
- **prix automatiquement dans la devise du pays** du visiteur, avec un convertisseur ;
- **paiement ultra simple** (3 champs, Mobile Money en quelques secondes) et **accès immédiat** après le paiement ;
- **application** installable sur Android, iPhone et ordinateur, publiable sur Google Play et l'App Store, avec **lecture hors ligne** et **notifications** ;
- **bilingue français / anglais**, chaque produit livré dans les deux langues ;
- **page produit qui convertit**, **promotions permanentes**, **communauté WhatsApp**, **e-books créés par l'IA**, **pixels publicitaires** fiables.

## Ce que contient le dossier

| Fichier | À quoi il sert |
|---|---|
| [1-PROMPT-COMPLET.md](1-PROMPT-COMPLET.md) | Le cahier des charges complet (38 sections). |
| [2-PROMPTS-PAR-ETAPES.md](2-PROMPTS-PAR-ETAPES.md) | Les prompts à envoyer un par un (contexte + 14 phases), avec ce que tu dois vérifier après chaque phase. |
| [3-PROMPTS-IA.md](3-PROMPTS-IA.md) | Les instructions des 10 fonctions IA de la plateforme. |
| [4-CHARTE-DE-MARQUE.md](4-CHARTE-DE-MARQUE.md) | La charte de marque : essence, slogans, personas, ton, logo, couleurs, polices, motif, animations, déclinaisons. Elle sert aussi pour tes réseaux sociaux et tes publicités. |

## Tes demandes → où c'est

| Ta demande | Où |
|---|---|
| Branding professionnel, meilleures polices et couleurs | Charte de marque (tout le fichier) + section 5 |
| Plateforme bien animée, fluide | Charte section 8 + sections 5.4 et 10.8 |
| Pas d'inscription classique | Section 9 |
| Devise automatique selon le pays + convertisseur | Section 7 |
| Application Play Store, iPhone, PC | Section 10 |
| Éviter les questions en inbox | Sections 7, 17, 20 (centre d'aide) et 28 (assistant IA) |
| Paiement facile | Sections 8 et 17 |
| Accès immédiat (fini « c'est fake ») | Section 18 |
| Inspiration Udemy, page produit qui convainc | Sections 12, 13, 14, 15 |
| Numéro WhatsApp + bouton qui mène à la communauté | Sections 19 et 23 |
| Promotions permanentes, popups, chronos | Sections 21 et 22 |
| Produits en FR et EN, lecture en ligne et téléchargement | Sections 24 et 25 |
| E-books créés avec l'IA | Section 27 |
| Pixels qui fonctionnent | Sections 16 et 30 |

## Mes ajouts d'expert

Ce que j'ai ajouté à ta vision, parce que les meilleures plateformes le font et que c'est décisif en Afrique :

1. **Charte de marque complète** : signature « Apprenez. Appliquez. Avancez. », logo « Chapeau-Pixel » (le savoir rencontre le digital), motif « Trame DigiSkool » inspiré des textiles africains, couleurs nommées (Nuit DigiSkool, Or Soleil, Rouge Promo, Vert Communauté), duo de polices Plus Jakarta Sans + Inter, animations signature, jetons de design importables dans Figma.
2. **Centre d'aide avec vidéos et guides audio** (section 20) : beaucoup de clients préfèrent écouter ou regarder plutôt que lire. Il répond aux questions avant qu'elles arrivent dans ton inbox.
3. **Guide audio sur l'écran de paiement** et **bandeau d'incident opérateur** (« Orange Money a des lenteurs, utilisez MTN MoMo »).
4. **Lecture hors ligne** dans l'application : les données mobiles coûtent cher, c'est un énorme argument de vente.
5. **Notifications push** : chaque promo peut atteindre directement le téléphone des clients, en plus de la communauté.
6. **Parrainage** (section 23.2) : le bouche-à-oreille est le premier canal de vente en Afrique ; chaque client devient un vendeur.
7. **Prix par zone** (section 7.7), comme Udemy : un prix adapté au pouvoir d'achat de chaque région.
8. **Motivation des apprenants** : séries, badges, rappels, **certificats vérifiables** par QR code. Un client qui termine son produit rachète.
9. **Supervision** (section 35) : tu es alerté si les paiements ou les messages WhatsApp ont un problème, avant que les clients ne se plaignent.
10. **Pass DigiSkool** (section 24.7) : accès à tout le catalogue pendant 12 mois, à lancer quand le catalogue sera plus grand.

## Mes corrections d'expert

Des points de ta vision que j'ai ajustés pour éviter des problèmes :

1. **Applications des stores.** Google Play et l'App Store imposent en général **leur propre système de paiement** (avec une commission importante, et sans Mobile Money) pour vendre du contenu numérique **dans** l'application. La solution des grandes plateformes : l'application des stores sert à **accéder à ses produits** (lecture, vidéos, hors ligne, notifications), et **les achats se font sur le site**. L'application installable directement depuis le site (PWA), elle, peut tout faire, y compris acheter avec Mobile Money.
2. **Localisation sans GPS.** Le pays est détecté automatiquement sans demander l'autorisation de localisation : cette demande fait peur et fait fuir.
3. **Montant débité toujours affiché.** Si un paiement par carte est débité dans une autre devise, le client le voit avant de payer. Sinon : réclamations.
4. **Deux numéros WhatsApp** : un pour les messages automatiques, un pour ton support humain.
5. **Fiscalité.** Vendre des produits numériques à l'étranger peut entraîner des taxes dans le pays du client (par exemple la TVA en Europe). La plateforme est prête, mais **fais valider par un comptable**.
6. **Preuves et promos réelles.** Je ne lâche rien sur ce point : c'est exactement ce qui protège tes publicités des commentaires « c'est fake ».

## Comment l'utiliser

1. **Remplis la fiche ci-dessous**, puis remplace chaque `[CROCHET]` dans les fichiers par ta valeur.
2. **Choisis ton outil :**
   - **Claude Code** ou **Cursor** (recommandé pour un projet de cette taille). Astuce : copie `1-PROMPT-COMPLET.md` et `4-CHARTE-DE-MARQUE.md` dans ton projet (dossier `docs/`) et demande à l'IA de les relire au début de chaque phase.
   - **Lovable** ou **Bolt** : si l'outil a un espace « Knowledge », colles-y les deux fichiers.
3. **Envoie le Prompt 0**, puis **les phases 1 à 14, une par une**, en faisant les vérifications de chaque phase.

> Astuce mobile : sur GitHub, ouvre le fichier puis appuie sur **Raw** pour tout sélectionner et copier facilement.

## Fiche à personnaliser

| Variable | Exemple | Ta valeur |
|---|---|---|
| `[DOMAINE]` | digiskool-academy.com (vérifie qu'il est libre) | |
| `[LANGUE_PAR_DEFAUT]` | anglais (téléphones ni en français ni en anglais) | |
| `[DEVISE_DE_BASE]` | FCFA (XAF) ou USD | |
| `[FOURNISSEUR_PRINCIPAL]` | Afrique francophone : CinetPay, NotchPay, FedaPay, Fapshi… | |
| `[FOURNISSEUR_SECONDAIRE]` | Afrique anglophone + cartes : Paystack, Flutterwave… | |
| `[WHATSAPP_SUPPORT]` | numéro du service client, affiché en clair | |
| `[LIEN_COMMUNAUTE_FR]` | lien de la communauté francophone | |
| `[LIEN_COMMUNAUTE_EN]` | lien de la communauté anglophone (ou le même) | |
| `[ANDROID_PACKAGE]` | com.digiskool.academy | |
| `[RÉSEAUX]` | liens Facebook, Instagram, TikTok, YouTube | |
| `[LEAD_MAGNET]` | titre de ton e-book gratuit | |
| `[REMBOURSEMENT]` | ex. « Satisfait ou remboursé pendant 7 jours » | |

Pour les paiements, vérifie quels fournisseurs acceptent une entreprise enregistrée dans ton pays, quels pays et moyens ils couvrent, et s'ils envoient la **demande de paiement directement sur le téléphone** du client.

## Services à prévoir

| Service | Rôle | Coût |
|---|---|---|
| Supabase | Base de données, accès, fichiers | Gratuit pour démarrer, puis offre payante |
| Vercel | Hébergement | Plan **Pro** (le plan gratuit n'autorise pas l'usage commercial) |
| Fournisseurs de paiement | Mobile Money + carte | Commission par vente |
| WhatsApp Business Platform (Meta) | Accès, codes et confirmations automatiques | Payé par message, selon le pays ; numéro dédié et vérification de l'entreprise |
| Service SMS (ex. Africa's Talking, Twilio) | Secours | Payé par SMS |
| API de taux de change | Conversion automatique des prix | Gratuit ou quelques dollars par mois |
| Bunny Stream | Vidéos protégées | Faible, selon le volume |
| API Claude (Anthropic) | E-books, traductions, pages de vente, assistant | À l'usage ; quelques dollars pour un e-book de 50 pages FR + EN |
| Inngest ou Trigger.dev | Tâches longues | Gratuit pour démarrer |
| Resend | Emails | Gratuit pour un petit volume |
| Compte développeur Google Play | Publier l'application Android | Frais d'inscription unique |
| Compte développeur Apple | Publier l'application iPhone | Abonnement annuel |
| Nom de domaine | ton-domaine.com | Environ 10 à 20 $ par an |

Vérifie les tarifs actuels avant de t'abonner. **À lancer dès maintenant, car c'est long :** la vérification de ton entreprise chez Meta (WhatsApp Business) et les comptes développeur Google Play et Apple.

**Modèle d'IA :** `claude-opus-5-5`, le plus capable, partout. Pour réduire le coût de l'assistant de vente, tu peux mettre `claude-haiku-5-5` (beaucoup moins cher) dans `ANTHROPIC_CHAT_MODEL`. C'est ton choix : teste les deux sur quelques questions de clients.

## Trois conseils avant de lancer

1. **Saisis tes vraies ventes des 2 dernières années** (champ « ventes antérieures ») et **importe tes vrais témoignages WhatsApp** : tu auras des preuves sociales réelles dès le premier jour.
2. **Fais tourner les promos** (flash 24 h le vendredi, e-books le week-end, -30 % au lancement d'un produit) plutôt que tout laisser à -45 % : sinon -45 % devient le prix normal.
3. **Teste avec un vrai client « non connecté »** : demande à un proche qui n'achète jamais en ligne d'acheter seul sur son téléphone pendant que tu observes sans l'aider. Chaque hésitation est une vente perdue à corriger.
