# School Academy — Kit de prompts

Kit complet pour faire construire par une IA **School Academy**, la plateforme personnelle de Roger BOUJIEKA pour vendre ses produits digitaux : e-books, formations vidéo, templates et packs.

Un seul vendeur (toi), des clients, un paiement Mobile Money + carte, et une livraison automatique 24 h/24.

## Ce que contient le dossier

| Fichier | À quoi il sert |
|---|---|
| [1-PROMPT-COMPLET.md](1-PROMPT-COMPLET.md) | Le cahier des charges complet de la plateforme. C'est la base de tout. |
| [2-PROMPTS-PAR-ETAPES.md](2-PROMPTS-PAR-ETAPES.md) | Les prompts à envoyer un par un (contexte + 8 phases), avec ce que tu dois vérifier après chaque phase. |
| [3-PROMPT-ASSISTANT-IA.md](3-PROMPT-ASSISTANT-IA.md) | Les instructions des deux IA intégrées au site : l'assistant de vente et l'assistant de rédaction. |

## Comment l'utiliser

1. **Remplis la fiche ci-dessous**, puis remplace chaque `[CROCHET]` dans les 3 fichiers par ta valeur.
2. **Choisis ton outil :**
   - **Claude Code** ou **Cursor** : code complet, contrôle total. Recommandé pour une boutique qui encaisse de l'argent.
   - **Lovable** ou **Bolt** : plus rapide si tu ne codes pas. Le prompt prévoit déjà l'adaptation (React + Vite + Supabase).
3. **Envoie le Prompt 0** (dans `2-PROMPTS-PAR-ETAPES.md`) en collant tout le contenu de `1-PROMPT-COMPLET.md`.
4. **Envoie ensuite les phases 1 à 8, une par une.** Fais les vérifications de chaque phase avant de passer à la suivante.

> Astuce mobile : sur GitHub, ouvre le fichier puis appuie sur **Raw** pour tout sélectionner et copier facilement.

## Fiche à personnaliser

| Variable | Exemple | Ta valeur |
|---|---|---|
| `[PAYS]` | Cameroun, Côte d'Ivoire, Sénégal… | |
| `[DEVISE]` | FCFA (XAF en Afrique centrale, XOF en Afrique de l'Ouest) | |
| `[FOURNISSEUR_PAIEMENT]` | NotchPay, CinetPay, Fapshi, Flutterwave… (vérifie lequel couvre ton pays et ton type d'entreprise) | |
| `[MOYENS_PAIEMENT]` | MTN Mobile Money, Orange Money, Wave, carte bancaire | |
| `[WHATSAPP]` | +XXX XX XX XX XX | |
| `[EMAIL_CONTACT]` | contact@ton-domaine.com | |
| `[DOMAINE]` | ton-domaine.com | |
| `[RÉSEAUX]` | liens Facebook, Instagram, TikTok, YouTube | |
| `[LEAD_MAGNET]` | titre de ton e-book gratuit | |
| `[REMBOURSEMENT]` | ex. « Satisfait ou remboursé pendant 7 jours » | |
| Couleurs | bleu nuit `#0B1F3A` + or `#F5B700` (modifiables dans la section 4) | |

## Services à prévoir

| Service | Rôle | Coût |
|---|---|---|
| Supabase | Base de données, comptes, fichiers | Gratuit pour démarrer, puis offre payante quand ça grandit |
| Vercel | Hébergement du site | Plan **Pro** nécessaire : le plan gratuit n'autorise pas l'usage commercial |
| Resend | Emails automatiques | Gratuit pour un petit volume |
| Fournisseur de paiement | Mobile Money + carte | Commission sur chaque vente |
| Bunny Stream | Vidéos des formations (protégées) | Quelques dollars par mois selon le volume |
| API Claude (Anthropic) | Assistant de vente + rédaction | Payé à l'usage |
| Nom de domaine | ton-domaine.com | Environ 10 à 20 $ par an |

Vérifie les tarifs actuels sur le site de chaque service avant de t'abonner.

**Modèle d'IA :** le prompt utilise `claude-opus-5-5`, le plus capable. Si tu veux réduire le coût de l'assistant de vente, tu peux mettre `claude-haiku-5-5` (beaucoup moins cher) dans la variable `ANTHROPIC_MODEL`. C'est ton choix : teste les deux sur quelques questions de clients avant de décider.
