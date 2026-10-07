# Klé — guide technique

Klé met en relation des chercheurs de logement, des bailleurs et des locataires sortants, tous
identifiés, pour louer sans démarcheur ni arnaque. Ce dépôt contient la phase 0 (page d'attente)
et le socle de la V1 décrits dans le document « Klé — Structure du SaaS ».

- [Plan de lancement](LANCEMENT.md) : ce qui est prêt, ce qu'il reste à faire, dans l'ordre.
- [Référence de l'API](API.md) : pour le développeur de l'appli Flutter.

## Contenu du dépôt

| Dossier | Rôle | Technologie |
| --- | --- | --- |
| `packages/shared` | Règles métier du document : packs, frais de réussite, charte et sanctions, visibilité Premium, limites de visites, disponibilité, schémas de validation | TypeScript, Zod |
| `apps/api` | L'API unique : comptes, vérification, annonces, fil, packs, paiements, visites, locations, modération | NestJS, PostgreSQL + PostGIS (Drizzle), Redis + BullMQ |
| `apps/web` | Site public : page d'attente avec enquête, pages d'annonces partagées sur WhatsApp, logements, charte | Next.js |
| `apps/admin` | Back-office de l'équipe : files de modération, sanctions, tableau de bord, liste d'attente | Next.js |
| `deploy` | Déploiement sur un serveur avec HTTPS automatique et sauvegardes chiffrées | Docker Compose, Caddy |

L'appli mobile Flutter n'est pas encore écrite : elle parlera à la même API (voir [API.md](API.md)).

## Démarrer en local

Prérequis : Node.js 22, pnpm 10, Docker (ou PostgreSQL 16 + PostGIS et Redis installés).

```sh
pnpm install
docker compose up -d                  # PostgreSQL + PostGIS et Redis
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
pnpm build                            # compile le paquet partagé, l'API et les deux sites
pnpm db:migrate                       # crée les tables
SEED_ADMIN_PHONE=+2376XXXXXXXX pnpm db:seed   # pays, villes, quartiers + premier administrateur
pnpm --filter @kle/api db:demo        # (facultatif) quatre annonces de démonstration

pnpm dev:api     # http://localhost:3001
pnpm dev:web     # http://localhost:3000
pnpm dev:admin   # http://localhost:3002
```

`db:seed` affiche un lien `otpauth://` : ajoute-le dans une application d'authentification
(Google Authenticator, Authy…) pour la double authentification du back-office. En
développement, le code de connexion reçu « sur WhatsApp » s'affiche dans les journaux de l'API
et sur l'écran de connexion (`OTP_DEV_ECHO=true`).

## Tests

```sh
pnpm test        # 34 tests des règles partagées + 41 tests de bout en bout de l'API
pnpm typecheck
```

Les tests de l'API tournent contre une vraie base PostGIS (`kle_test`, recréée à chaque
lancement). Ils couvrent notamment le parcours complet : bailleur vérifié → annonce modérée →
chercheur avec pack → demande de visite → QR code → location confirmée → frais de réussite
payés → avis ; ainsi que les règles de protection (3 visites maximum, bannissement par numéro
et par pièce, Garantie Klé, masquage sans réponse sous 72 h, blocage après 30 jours d'impayé…).

## Choix techniques

Ce sont ceux du document, avec trois précisions :

- **Drizzle** plutôt qu'un autre ORM : il gère nativement les colonnes PostGIS et ne télécharge
  aucun binaire. Les migrations sont dans `apps/api/drizzle` (`pnpm --filter @kle/api db:generate`
  après une modification de `src/db/schema.ts`).
- **Validation partagée** : les mêmes schémas Zod (`@kle/shared`) valident les formulaires du
  site et les requêtes de l'API ; le site et l'appli affichent donc les mêmes messages d'erreur.
- **Services externes interchangeables** : paiement (`PAYMENT_PROVIDER` : simulateur ou Notch
  Pay), messages (`NOTIFY_DRIVER` : journaux ou WhatsApp Business), fichiers (`STORAGE_DRIVER` :
  disque ou S3 compatible), vidéo (`VIDEO_PROVIDER` : disque ou Cloudflare Stream). Campay, Mux ou
  Bunny Stream s'ajoutent en écrivant une seule classe.

### Sécurité et données personnelles

- Connexion par code à usage unique, jamais par mot de passe ; un seul téléphone autorisé par
  compte ; double authentification obligatoire pour l'équipe.
- Pièces d'identité, selfies et preuves dans un espace privé séparé des médias publics, lus
  uniquement par liens temporaires de 5 minutes ; chaque consultation est journalisée.
- Adresse exacte jamais publiée : elle n'apparaît que sur le téléphone du chercheur, après
  acceptation de la visite, et disparaît après le créneau. Le numéro du bailleur n'est jamais
  affiché : messages par l'appli.
- Bannissement par empreinte (HMAC) du numéro et du numéro de pièce : on peut reconnaître un
  banni sans conserver ces valeurs en clair.
- Droit à l'effacement (`DELETE /me`) : compte anonymisé, pièces supprimées du stockage.
- Consentement explicite à l'inscription (cases non pré-cochées), version de la charte enregistrée.

## Correspondance avec le périmètre de la V1

| Élément du document | État |
| --- | --- |
| Inscription OTP, vérification d'identité manuelle, preuve bailleur et sortant, un téléphone par compte | API + back-office |
| Fil vidéo vertical (ordre ville, budget, quartiers, fraîcheur, confiance) | API ; écran à faire dans l'appli |
| Fiche logement avec comparatif, pages web partageables | API + site |
| Explorer : carte et filtres (zone visible, quartier, type, budget, date) | API + page « Logements » ; carte à faire dans l'appli |
| Publication en 4 écrans + « Bientôt disponible » | API ; écrans à faire dans l'appli |
| Packs Essentiel, Confort, Premium par Mobile Money | API (Notch Pay à valider avec un compte marchand) |
| Demande de visite, messages, adresse après accord, QR code, confirmation de location, frais de réussite | API |
| Alertes, avis, signalements | API |
| Confirmation de disponibilité tous les 15 jours | Tâche planifiée |
| Back-office : files, sanctions, codes ambassadeurs, tableau de bord | Back-office |
| Appels dans l'appli (WebRTC) | Journal des appels prêt ; signalisation à faire avec l'appli |
| Notifications push (Firebase), SMS | Interface prête ; fournisseurs à brancher |

Prévu en V2 dans le document et déjà présent dans le modèle de données : Espace Location
(loyers, factures, pannes), avis de quartier, badge « Bailleur de confiance » (calculé).
