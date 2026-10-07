# Plan de lancement de Klé

Le document fixe l'ordre : **phase 0 (validation, 4 semaines) → V1 à Douala (≈ 3 mois) → V2
autres villes du Cameroun → V3 Afrique francophone**. Chaque phase ne s'ouvre que si la
précédente atteint son objectif.

## Phase 0 — maintenant

Objectif de passage : **300 inscrits en liste d'attente et 50 bailleurs prêts à publier**, plus
l'enquête (50 chercheurs, 20 bailleurs, 10 sortants).

### Ce qui est prêt

- Page d'attente en français, pensée pour les téléphones, avec l'enquête intégrée au formulaire
  (questions différentes pour chercheurs, bailleurs et sortants) et le consentement explicite.
- Back-office : suivi des inscriptions par rapport aux objectifs, réponses à l'enquête, export
  CSV, lien WhatsApp direct vers chaque inscrit.
- Mode `LAUNCH_PHASE=waitlist` : seule la liste d'attente est ouverte au public ; paiements,
  WhatsApp Business et stockage S3 ne sont pas encore nécessaires.

### À faire avant de mettre en ligne

1. **Décider de l'hébergement avec un juriste.** La liste d'attente collecte déjà des données
   personnelles (noms, numéros). La loi n° 2024/017 impose soit un hébergement au Cameroun, soit
   une autorisation préalable de l'autorité de protection des données pour héberger à
   l'étranger. Le déploiement fourni (`deploy/`) fonctionne sur n'importe quel serveur Linux,
   y compris chez un hébergeur camerounais.
2. **Valider le nom.** « Klé » est un nom de travail : vérifier le nom de domaine, les comptes
   réseaux sociaux et l'enregistrement à l'OAPI.
3. **Acheter le domaine** et créer trois entrées DNS vers le serveur : le site (`kle.example`),
   l'API (`api.kle.example`) et le back-office (`equipe.kle.example`).
4. **Déployer** (sur le serveur, avec Docker installé) :

   ```sh
   git clone <dépôt> /opt/kle && cd /opt/kle/deploy
   cp .env.example .env        # remplir domaines et secrets (openssl rand -base64 48)
   docker compose up -d --build
   docker compose exec -e SEED_ADMIN_PHONE=+2376XXXXXXXX api node dist/db/seed.js
   ```

   La dernière commande crée ton compte administrateur et affiche un lien `otpauth://` à
   ajouter dans une application d'authentification. Pour te connecter au back-office pendant
   la phase 0, le code de connexion s'affiche dans `docker compose logs api` (aucun SMS ni
   WhatsApp n'est encore branché).
5. **Planifier la sauvegarde chiffrée** : `deploy/backup.sh` (voir l'en-tête du fichier).

### Pendant les 4 semaines

- **Liens de campagne** : ajoute `?source=` pour savoir d'où viennent les inscrits
  (`https://kle.example/?source=tiktok`, `?source=flyer-akwa`). Pour les bailleurs :
  `?profil=bailleur` ; pour les sortants : `?profil=sortant`.
- **Ambassadeurs terrain** : donne à chacun un code et un lien
  `https://kle.example/?profil=bailleur&code=AKWA21` ; le code est enregistré avec
  l'inscription et servira à calculer les primes à l'ouverture.
- **Vidéos TikTok** : l'aperçu WhatsApp et l'image de partage du site sont générés
  automatiquement.
- **Suivi** : le tableau de bord du back-office affiche la progression vers 300 et 50.
- Les objectifs de passage sont des seuils de départ : ajuste-les avec les chiffres réels.

## V1 — Douala

L'API, le site et le back-office couvrent déjà le périmètre de la V1 (voir le tableau dans
[README.md](README.md)). Il reste :

### Équipe

- **Associé technique** (indispensable selon le document) pour reprendre ce code, et un
  **développeur Flutter** pour l'appli Android puis iOS : les écrans s'appuient sur l'API
  décrite dans [API.md](API.md).
- 1 à 2 modérateurs à temps partiel : comptes créés depuis Réglages, avec double authentification.

### Comptes et contrats à ouvrir

| Service | Pourquoi | Réglage |
| --- | --- | --- |
| Notch Pay (ou Campay, à comparer) | Packs, frais de réussite et boosts par MTN MoMo et Orange Money | `PAYMENT_PROVIDER=notchpay`, clés et secret du webhook `https://api.<domaine>/payments/webhooks/notchpay`. L'adaptateur suit la documentation publique : à valider avec un compte de test. |
| WhatsApp Business (Cloud API de Meta) | Codes de connexion et notifications | `NOTIFY_DRIVER=live`. Faire approuver un modèle d'authentification `kle_otp` en français, puis des modèles pour chaque notification envoyée hors d'une conversation en cours (visite acceptée, alerte, facture). |
| Fournisseur SMS | Codes de connexion de secours | À brancher dans `apps/api/src/notifications/channels.ts` |
| Stockage S3 (Cloudflare R2, Scaleway, OVH…) | Pièces d'identité (bucket privé chiffré) et photos (bucket public) | `STORAGE_DRIVER=s3` + variables `S3_*` |
| Cloudflare Stream (ou Mux, Bunny à comparer) | Compression des vidéos, qualités 240p à 720p, miniatures | `VIDEO_PROVIDER=cloudflare` + webhook `https://api.<domaine>/media/webhooks/cloudflare` |
| Firebase Cloud Messaging | Notifications push de l'appli | À brancher avec l'appli |
| Sentry, PostHog | Erreurs et parcours (taux visiteur → abonné) | À brancher |

Puis passer `LAUNCH_PHASE=v1` : la configuration de production refuse de démarrer tant que
paiement, messages et stockage ne sont pas réellement branchés.

### Juridique (liste « Avant le lancement » du document)

- [ ] Créer la société (forme OHADA : SARL ou SAS).
- [ ] Rédiger les CGU, la charte et la politique de confidentialité (le site contient une
      version courte à faire valider : `apps/web/app/confidentialite`).
- [ ] Se mettre en conformité avec la loi n° 2024/017 et trancher l'hébergement.
- [ ] Faire valider par le juriste que les frais de réussite, présentés comme frais de service
      de la plateforme, ne font pas de Klé un intermédiaire immobilier soumis à agrément.
- [ ] Déposer la marque à l'OAPI.
- [ ] Signer avec l'agrégateur de paiement.
- [ ] Signer un pacte d'associés avec le développeur : parts, engagements, propriété du code.

### Points du document laissés ouverts (valeurs provisoires dans le code)

- **Comportement abusif** : motif de signalement sans sanction écrite dans la charte. Échelle
  provisoire : avertissement, puis suspension de 30 jours, puis bannissement
  (`packages/shared/src/charter.ts`).
- **Logement obtenu pour un tiers** : la durée de la suspension n'est pas fixée ; 30 jours par
  défaut.
- **Frais de réussite** : 10 % au départ, modifiable depuis le back-office (Réglages) sans
  redéploiement.
- **Quartiers de Douala** : 20 quartiers avec un centre approximatif, à compléter et affiner
  sur le terrain (`apps/api/src/db/seed.ts`).
