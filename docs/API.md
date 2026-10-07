# API Klé — référence pour l'appli mobile

Base : `https://api.<domaine>` (en local `http://localhost:3001`). Corps et réponses en JSON.
Les schémas de validation sont dans `packages/shared/src` : l'appli Flutter doit appliquer
les mêmes règles (mêmes champs, mêmes limites).

## Conventions

- **Authentification** : en-tête `Authorization: Bearer <accessToken>`. Le jeton est lié au
  téléphone (`deviceId`) : une connexion sur un autre téléphone révoque l'ancien.
- **Erreurs** : `{ "code": "pack_required", "message": "Choisis un pack pour contacter les bailleurs." }`.
  Le `message` est prêt à afficher ; le `code` sert à choisir l'écran (ex. `pack_required` →
  écran des packs, `kyc_required` → vérification d'identité). Validation : `code: "validation_error"`
  avec `issues: [{ path, message }]`.
- **Montants** : entiers en FCFA. **Dates** : ISO 8601. **Pagination** : `cursor` / `nextCursor`.
- Routes marquées 🌐 : accessibles sans compte (le jeton est quand même lu s'il est envoyé).

## Connexion et compte

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST 🌐 | `/auth/otp/request` | `{ phone, channel: "whatsapp" \| "sms" }` → envoie un code à 6 chiffres (5 par heure maximum) |
| POST 🌐 | `/auth/otp/verify` | `{ phone, code, deviceId, deviceName? }` → `{ accessToken, isNewUser, deviceChanged }` |
| GET | `/me` | Profil, rôles, statut, vérification, pack actif, frais impayés, code de parrainage |
| POST | `/me/onboarding` | `{ fullName, roles[], ambassadorCode?, referralCode?, acceptCharter: true, acceptPrivacy: true }` |
| PATCH | `/me` | Préférences du fil : `{ cityId?, budgetMax?, districtIds?, roles? }` |
| DELETE | `/me` | Suppression et anonymisation du compte (refusée si des frais sont impayés) |
| GET 🌐 | `/users/:id` | Profil public : badge, note, annonces, logements loués, ancienneté, avis |
| GET | `/notifications` · POST `/notifications/read` | Boîte de notifications de l'appli |

Statuts de compte : `active`, `frozen` (nouveau téléphone : envoyer un selfie de contrôle),
`blocked_unpaid` (frais de réussite impayés), `suspended`, `banned`.

## Vérification d'identité

1. `POST /uploads` `{ purpose: "kyc" | "proof" | "selfie_check", contentType }` → `{ key, url, method: "PUT", headers }`.
2. Envoyer le fichier directement à `url` (PUT, avec `headers`).
3. Déclarer les clés :

| Méthode | Route | Corps |
| --- | --- | --- |
| POST | `/kyc` | `{ documentType: "cni" \| "passport" \| "driving_license" \| "voter_card", documentFrontKey, documentBackKey?, selfieKey, fullName }` |
| POST | `/kyc/proofs` | `{ role: "landlord" \| "outgoing_tenant", proofType, fileKeys[], honorDeclaration: true }` |
| POST | `/kyc/selfie-check` | `{ selfieKey }` — dégèle un compte après changement de téléphone |
| GET | `/kyc` | État du dossier et des preuves |

## Géographie

`GET 🌐 /geo/countries`, `GET 🌐 /geo/cities?country=CM`, `GET 🌐 /geo/cities/:id/districts`.

## Fil, Explorer, fiche logement

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET 🌐 | `/feed?cityId&budgetMax&districtIds&cursor&limit` | Fil « Pour toi » (préférences du compte par défaut) |
| GET 🌐 | `/listings?cityId&districtIds&type&minRent&maxRent&furnished&availableBefore&bbox=ouest,sud,est,nord&cursor` | Explorer : filtres et carte (`approxLocation` de chaque annonce) |
| GET 🌐 | `/listings/:idOrRef` | Fiche (par identifiant ou `KLE-CM-DLA-000123`) avec `comparison`, `publisher`, `amenities` |
| POST 🌐 | `/listings/:id/share` | Compte le partage → `{ url, whatsappUrl }` |
| PUT · DELETE | `/listings/:id/favorite` | Favoris ; `GET /me/favorites` |

Codes à gérer sur la fiche : `premium_early_access` (annonce de moins de 24 h, réservée au
Premium) et `coming_soon_reserved` (« Bientôt disponible », packs Confort et Premium).

Mode économie de données : les vidéos Cloudflare Stream sont en HLS ; l'appli choisit la basse
qualité sur réseau mobile et ne précharge que la vidéo suivante.

## Publier (bailleur, sortant)

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST | `/listings` | Écrans 2 à 4 : informations, cases à cocher (`amenities`), disponibilité ; `category: "coming_soon"` + `comingSoon` pour un sortant |
| POST | `/listings/:id/media` | Écran 1 : `{ kind: "video" \| "photo", contentType, capturedInApp, capturedAt?, latitude?, longitude? }` → lien d'envoi direct (la vidéo ne passe pas par l'API) |
| POST | `/listings/:id/media/:mediaId/complete` | Fin d'envoi |
| POST | `/listings/:id/submit` | Envoi en modération (ou publication directe après 3 annonces validées) |
| PATCH | `/listings/:id` | Modification |
| POST | `/listings/:id/still-available` | Réponse à « Toujours disponible ? » (tous les 15 jours) |
| GET | `/listings/:id/contacts` | Personnes ayant contacté via Klé |
| POST | `/listings/:id/rented` | « Loué » : `{ tenant: "kle_contact", visitRequestId, monthlyRent? }` ou `{ tenant: "outside", referredByVisitRequestId? }` |
| DELETE | `/listings/:id` | Retrait |
| POST | `/listings/:id/boost` | Boost 1 000 FCFA / 7 jours : `{ operator: "mtn" \| "orange", payerPhone }` |
| GET | `/listings/mine` | Mes annonces avec statistiques |

## Packs et paiements

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET 🌐 | `/packs?country=CM` | Catalogue et prix du pays |
| POST | `/packs/purchase` | `{ tier, operator, payerPhone }` → `{ paymentId, instructions }` (validation sur le téléphone) |
| GET | `/payments/:id` | À interroger toutes les 3 s jusqu'à `succeeded` ou `failed` |
| GET | `/packs/me` | Pack actif et historique |
| GET | `/success-fees` · POST `/success-fees/:id/pay` | Factures de frais de réussite et paiement |

## Visites, messages, avis, signalements

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST | `/visit-requests` | `{ listingId, proposedSlot, message? }` (pack, identité vérifiée, 3 visites programmées maximum) |
| GET | `/visit-requests?as=seeker\|landlord` | Mes demandes (le bailleur voit nom et photo vérifiés, jamais le numéro) |
| GET | `/visit-requests/:id` | Détail ; `exactAddress` seulement pour le chercheur, après acceptation |
| POST | `/visit-requests/:id/respond` | Bailleur : `{ decision: "accept" \| "refuse", slot?, reason? }` |
| GET | `/visit-requests/:id/qr` | Chercheur : jeton à afficher en QR code |
| POST | `/visit-requests/scan` | Bailleur : `{ qrToken }` → photo vérifiée du visiteur |
| POST | `/visit-requests/:id/validate` | Bailleur : `{ qrToken, samePerson }` |
| POST | `/visit-requests/:id/outcome` | Chercheur : `{ outcome: "interested" \| "not_interested" \| "no_show" }` |
| POST | `/visit-requests/:id/cancel` | Annulation |
| GET | `/conversations` · `/conversations/:id/messages` | Messagerie (numéros jamais exposés) |
| POST | `/conversations/:id/messages` · `/conversations/:id/calls` | Message ; journal d'un appel `{ durationSeconds }` |
| POST | `/reviews` | `{ visitRequestId, rating 1–5, comment? }` après un contact accepté |
| POST | `/reports` | `{ targetType: "listing" \| "user", targetId, reason, details? }` |
| GET · POST · DELETE | `/alerts` | Alertes de recherche (nombre selon le pack) |

## Développement

`POST /payments/:id/simulate` `{ status: "succeeded" \| "failed", payerName? }` valide un
paiement simulé (`PAYMENT_PROVIDER=fake`, jamais en production).
