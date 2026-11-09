# DigiSkool Academy — instructions permanentes pour Claude Code

> **À copier à la racine du projet sous le nom `CLAUDE.md`.** Claude Code lit ce fichier automatiquement au début de chaque session : il garde le cap d'une phase à l'autre.

## Le projet

DigiSkool Academy (`https://www.digiskoolacademy.com`) est la plateforme **personnelle** de Roger BOUJIEKA (entreprise au Cameroun) pour vendre ses e-books, formations vidéo et vidéos, en **français et en anglais**, à l'Afrique francophone, l'Afrique anglophone, la diaspora et l'international. Site web + application installable.

## Documents de référence (dossier `docs/`)

| Fichier | Contenu | Quand le lire |
|---|---|---|
| `docs/1-PROMPT-COMPLET.md` | Cahier des charges (38 sections) | **Au début de chaque phase**, sections concernées |
| `docs/4-CHARTE-DE-MARQUE.md` | Charte de marque | Pour tout ce qui est visible |
| `docs/5-MAQUETTES.md` | Maquettes des écrans clés | Pour chaque écran concerné |
| `docs/3-PROMPTS-IA.md` | Prompts de l'IA intégrée | Phases IA |
| `docs/6-PLAN-DE-LANCEMENT.md` | Stratégie commerciale | Pour comprendre le « pourquoi » |
| `docs/prototype-beta.html` | Prototype cliquable validé par Roger | Référence visuelle : le rendu final doit être au moins aussi soigné |
| `docs/AVANCEMENT.md` | Journal d'avancement (à tenir à jour) | **Au début de chaque session** |

En cas de doute, le cahier des charges fait foi ; la charte fait foi pour tout ce qui est visuel.

## Règles absolues

1. **Zéro inscription, zéro mot de passe** pour les clients : accès par numéro WhatsApp + code.
2. **Paiement en 3 champs maximum** ; **accès immédiat** au produit après le paiement, sans rien à fermer ni chercher.
3. **Bilingue partout** : aucun texte en dur, tout passe par `messages/fr.json`, `messages/en.json` ou les champs FR/EN de la base.
4. **Prix dans la devise du visiteur**, toujours **recalculés côté serveur** ; montant débité affiché si la devise diffère.
5. **Preuves sociales, chronos, valeurs et promotions réels uniquement.** Jamais de chiffre, d'avis, de notification ou de minuteur inventé.
6. **Charte de marque appliquée sans exception** (couleurs, polices, composants, animations, ton).
7. **Mobile d'abord** : tout est vérifié sur un écran de 360 px avant d'être considéré comme terminé.
8. **Sécurité** : RLS sur toutes les tables, fichiers privés, aucune clé secrète côté navigateur, `.env.local` jamais commité.
9. **Ne jamais casser ce qui fonctionne** : lancer les tests avant de dire qu'une phase est terminée.

## Configuration de départ

- Pays par défaut **Cameroun** (+237), devise de base **XAF (FCFA)**, fuseau admin **Africa/Douala**.
- Paiements : **NotchPay** (principal : MTN MoMo, Orange Money, carte) et **Flutterwave** (secondaire : cartes internationales, autres pays), derrière la couche `PaymentProvider`. Toujours en **mode test** tant que Roger n'a pas demandé le passage en réel.
- Hébergement : Vercel (fonctions à Paris, `cdg1`), Supabase en Europe.
- Modèle IA : `claude-opus-5-5` (variable `ANTHROPIC_MODEL`).

## Méthode de travail pour chaque phase

1. Relis `docs/AVANCEMENT.md`, puis les sections du cahier des charges citées dans le prompt de la phase.
2. Propose un **plan court** (fichiers, base de données, risques) et attends la validation de Roger.
3. Code par petites étapes, en respectant les maquettes et la charte.
4. Lance les vérifications : types, lint, tests, et une capture d'écran à 360 px des écrans modifiés.
5. Mets à jour `docs/AVANCEMENT.md` : ce qui est fait, ce qui reste, les décisions prises, les points à vérifier par Roger.
6. Fais un **commit** clair par étape terminée (en français, ex. « Phase 7 : écran d'attente Mobile Money »).
7. Termine par un résumé simple pour Roger : ce qui marche, **comment le tester sur son téléphone**, ce qu'il doit fournir (clés, textes, photos).

## Conventions de code

- Next.js (App Router) + TypeScript strict, Tailwind + shadcn/ui, next-intl, Supabase, Zod.
- Code, noms et commentaires en anglais ; textes visibles uniquement dans les fichiers de traduction.
- Jetons de design comme seule source des couleurs, tailles et animations (aucune valeur codée en dur).
- Composants réutilisables, pas de duplication ; logique de prix et d'accès centralisée et testée.
- Commandes du projet (à créer en phase 1 puis à garder à jour ici) : `dev`, `build`, `typecheck`, `lint`, `test`, `e2e`.

## Communication avec Roger

- En **français**, avec des mots simples : Roger est designer graphique et entrepreneur, pas développeur.
- Résultat d'abord, puis comment tester, puis ce dont tu as besoin de lui.
- Si tu vois une meilleure solution que celle du cahier des charges, propose-la avant de l'appliquer.
