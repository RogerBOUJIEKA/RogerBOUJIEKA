# DigiSkool Academy — Kit de prompts

Kit complet pour faire construire par une IA **DigiSkool Academy**, la plateforme personnelle de Roger BOUJIEKA pour vendre ses produits digitaux (e-books, formations vidéo, vidéos). Inspirée d'Udemy, et pensée pour aller plus loin :

- **paiement ultra simple** : 3 champs maximum, Mobile Money en quelques secondes ;
- **accès immédiat** au produit après le paiement, sans mot de passe ni rien à chercher (fini les « c'est fake » sous les publicités) ;
- **page produit qui convertit** : aperçu flouté des e-books, leçons gratuites, preuves sociales réelles, chronos, étiquettes promo ;
- **design premium** dans les moindres détails, 100 % responsive ;
- **bilingue français / anglais**, chaque produit livré dans les deux langues ;
- **promotions permanentes** et **communauté WhatsApp** au cœur de la stratégie ;
- **e-books créés par l'IA** ;
- **pixels publicitaires** fiables, réglés depuis l'admin.

## Ce que contient le dossier

| Fichier | À quoi il sert |
|---|---|
| [1-PROMPT-COMPLET.md](1-PROMPT-COMPLET.md) | Le cahier des charges complet (34 sections). C'est la base de tout. |
| [2-PROMPTS-PAR-ETAPES.md](2-PROMPTS-PAR-ETAPES.md) | Les prompts à envoyer un par un (contexte + 12 phases), avec ce que tu dois vérifier après chaque phase. |
| [3-PROMPTS-IA.md](3-PROMPTS-IA.md) | Les instructions des 10 fonctions IA de la plateforme : assistant de vente, création d'e-books, traduction, pages de vente, annonces WhatsApp. |

## Tes demandes → où c'est dans le cahier des charges

| Ta demande | Sections |
|---|---|
| Plateforme professionnelle, bien designée, polices et couleurs soignées | 7 (design system) et 8 (couvertures au même design) |
| Inspiration Udemy, et au-delà | 2, 9 (boutique), 10 (page produit) |
| Page produit qui convainc : prix, réductions, chronos, ventes | 10 |
| Aperçu flouté des e-books, leçons débloquées | 11 |
| Preuves sociales | 12 |
| Paiement facile, sans complications | 14 |
| Accès immédiat après le paiement | 15 |
| Numéro WhatsApp + bouton qui mène d'abord à la communauté | 16 et 19 |
| Promotions permanentes, codes promo partout | 17 |
| Popups de réduction et de nouveautés | 18 |
| Plateforme anglais / français automatique | 5 |
| Chaque produit en FR et EN, lecture en ligne et téléchargement | 20 et 21 |
| E-books créés avec l'IA | 23 |
| Pixels connectés qui fonctionnent vraiment | 13 (pages pour les publicités) et 26 |

## Comment l'utiliser

1. **Remplis la fiche ci-dessous**, puis remplace chaque `[CROCHET]` dans les 3 fichiers par ta valeur.
2. **Choisis ton outil :**
   - **Claude Code** ou **Cursor** (recommandé : la plateforme est grande et encaisse de l'argent). Astuce : copie `1-PROMPT-COMPLET.md` dans ton projet sous `docs/cahier-des-charges.md` et dis à l'IA de le relire au début de chaque phase.
   - **Lovable** ou **Bolt** : plus rapide si tu ne codes pas. Si l'outil a un espace « Knowledge » ou « instructions du projet », colles-y le cahier des charges.
3. **Envoie le Prompt 0**, puis **les phases 1 à 12, une par une**. Fais les vérifications de chaque phase avant de passer à la suivante.

> Astuce mobile : sur GitHub, ouvre le fichier puis appuie sur **Raw** pour tout sélectionner et copier facilement.

## Fiche à personnaliser

| Variable | Exemple | Ta valeur |
|---|---|---|
| `[DOMAINE]` | digiskool-academy.com (vérifie qu'il est libre) | |
| `[LANGUE_PAR_DEFAUT]` | anglais (pour les téléphones ni en français ni en anglais) | |
| `[DEVISE_DE_BASE]` | FCFA (XAF) ou USD | |
| `[FOURNISSEUR_PRINCIPAL]` | Afrique francophone : CinetPay, NotchPay, FedaPay, Fapshi… | |
| `[FOURNISSEUR_SECONDAIRE]` | Afrique anglophone + cartes : Paystack, Flutterwave… | |
| `[WHATSAPP_SUPPORT]` | numéro du service client, affiché en clair | |
| `[LIEN_COMMUNAUTE_FR]` | lien d'invitation de la communauté francophone | |
| `[LIEN_COMMUNAUTE_EN]` | lien de la communauté anglophone (ou le même lien) | |
| `[RÉSEAUX]` | liens Facebook, Instagram, TikTok, YouTube | |
| `[LEAD_MAGNET]` | titre de ton e-book gratuit | |
| `[REMBOURSEMENT]` | ex. « Satisfait ou remboursé pendant 7 jours » | |

Pour les fournisseurs de paiement : vérifie lesquels acceptent une entreprise enregistrée dans ton pays, quels pays et quels moyens de paiement ils couvrent, et s'ils permettent la **demande de paiement directe sur le téléphone** (le client tape juste son code secret). C'est ce qui rend le paiement le plus simple.

## Services à prévoir

| Service | Rôle | Coût |
|---|---|---|
| Supabase | Base de données, comptes, fichiers | Gratuit pour démarrer, puis offre payante |
| Vercel | Hébergement | Plan **Pro** nécessaire (le plan gratuit n'autorise pas l'usage commercial) |
| Fournisseurs de paiement | Mobile Money + carte | Commission sur chaque vente |
| WhatsApp Business Platform (Meta) | Envoi automatique des accès et des codes sur WhatsApp | Payé par message, tarif selon le pays ; demande un numéro dédié et la vérification de l'entreprise chez Meta |
| Service SMS (ex. Africa's Talking, Twilio) | Secours si WhatsApp ne passe pas | Payé par SMS |
| Bunny Stream | Vidéos protégées | Faible, selon le volume regardé |
| API Claude (Anthropic) | Création d'e-books, traductions, pages de vente, assistant | Payé à l'usage ; ordre de grandeur : quelques dollars pour un e-book de 50 pages en FR + EN |
| Inngest ou Trigger.dev | Tâches longues | Gratuit pour démarrer |
| Resend | Emails | Gratuit pour un petit volume |
| Nom de domaine | ton-domaine.com | Environ 10 à 20 $ par an |

Vérifie les tarifs actuels sur le site de chaque service avant de t'abonner. Lance la **vérification de ton entreprise chez Meta** (WhatsApp Business) dès maintenant : elle peut prendre du temps.

**Modèle d'IA :** le prompt utilise `claude-opus-5-5`, le plus capable, pour tout. Pour réduire le coût de l'assistant de vente (le chat des visiteurs), tu peux mettre `claude-haiku-5-5`, beaucoup moins cher, dans `ANTHROPIC_CHAT_MODEL`. C'est ton choix : teste les deux sur quelques questions de clients avant de décider.

## Trois conseils d'expert

1. **Garde des promos et des preuves réelles.** Le cahier des charges impose des prix barrés réels, des chronos réels et des preuves sociales réelles. Une seule fausse preuve repérée par un client suffit à faire écrire « c'est fake » sous tes publicités, exactement ce que tu veux éviter. Pour avoir des chiffres dès le lancement, saisis tes **vraies ventes des 2 dernières années** (champ « ventes antérieures ») et importe tes **vrais témoignages WhatsApp**.
2. **Fais tourner les promos** plutôt que tout réduire en permanence : flash 24 h sur les formations le vendredi, e-books le week-end, -30 % au lancement d'un produit. Si tout est à -45 % tout le temps, -45 % devient le prix normal, et ta communauté perd l'envie de guetter tes annonces.
3. **Teste le parcours d'achat avec un vrai client « non connecté ».** Avant de lancer une campagne, demande à un proche qui n'achète jamais en ligne d'acheter seul, sur son téléphone, pendant que tu observes sans l'aider. Chaque hésitation que tu vois est une vente perdue à corriger.
