# Camair-Co — spots motion design

Deux films publicitaires en français pour Camair-Co, en 1920×1080 à 30 i/s, avec une voix off féminine douce :

| Version | Fichier | Sources |
|---|---|---|
| **1 min 28 s** | [`long/out/camairco-spot-88s.mp4`](long/out/camairco-spot-88s.mp4) | `long/` |
| **15 s** | [`out/camairco-spot-15s.mp4`](out/camairco-spot-15s.mp4) | `src/`, `audio/` |

Voix : ElevenLabs « Cassandra – narration chaleureuse » (eleven_multilingual_v2). Musique : ElevenLabs Music, instrumentale et vérifiée sans chant. Design sonore : synthétisé (`scripts/sfxlib.py`).

## Version 1 min 28 s

> Au cœur de l'Afrique, une étoile veille sur notre ciel…
> Depuis deux mille onze, Camair-Co, la compagnie aérienne nationale, rapproche les villes, les familles… et les rêves.
> Au départ de Douala et de Yaoundé, envolez-vous vers Garoua, Maroua et Ngaoundéré.
> Et au-delà des frontières, Camair-Co vous ouvre le ciel d'Afrique : Libreville, Cotonou, Brazzaville, Pointe-Noire, N'Djamena, Bangui.
> À bord de nos Boeing 737 et Dash 8 Q400, une priorité : votre sécurité.
> Avec Star Miles, notre programme de fidélité, chaque voyage vous rapporte des miles : billets, surclassements, bagages supplémentaires.
> En classe Affaires comme en Économique, laissez-vous porter par l'hospitalité camerounaise… un sourire, une attention, à chaque instant.
> Réservez en quelques clics sur camair-co.cm.
> Camair-Co. L'étoile du Cameroun.

| Temps | Scène | Animation |
|---|---|---|
| 0 – 7 s | L'étoile | L'étoile du drapeau se trace au-dessus de la courbure de la Terre, s'embrase, puis plonge vers la caméra. |
| 7 – 16 s | Depuis 2011 | Compteur 2011 façon odomètre, logotype, « compagnie aérienne nationale », puis les villes, les familles et les rêves en pictogrammes tracés. |
| 16 – 24 s | Réseau national | L'étoile se pose sur Douala. Le contour du Cameroun se dessine, avec le tableau des départs DLA / NSI et les arcs vers GOU, MVR et NGE. |
| 24 – 36 s | Ciel d'Afrique | Travelling arrière jusqu'au globe, avion en traînées, puis carte des routes régionales avec un tableau à volets synchronisé sur chaque ville. |
| 36 – 47 s | Flotte | Volet tricolore, puis plans « blueprint » tracés du Boeing 737 et du Dash 8 Q400 (hélice animée), et bouclier « Votre sécurité ». |
| 47 – 60 s | Star Miles | Carte de fidélité en 3D, avions qui créditent des miles (compteur jusqu'à 30 000, passage Green → Silver), tuiles billets / surclassements / bagages. |
| 60 – 69 s | Hospitalité | Sièges Affaires et Économique, hublot dont le store se lève sur un coucher de soleil, « un sourire, une attention, à chaque instant ». Ce passage tombe sur la partie calme de la musique. |
| 69 – 79 s | Réservation | Écran de réservation sur mobile (saisie, tap, confirmation et QR code), puis décollage au-dessus des nuages jusqu'au soleil. |
| 79 – 88 s | Signature | Flash sur le dernier coup de la musique, puis CAMAIR-CO, « L'étoile du Cameroun » et www.camair-co.cm. |

## Version 15 s

Il s'agit d'un condensé : l'étoile, Douala / Yaoundé / Garoua, le ciel d'Afrique, les routes régionales, la carte d'embarquement, le hublot et la signature.

## Sources d'information

Le site camair-co.cm n'était pas accessible depuis l'environnement de production (proxy réseau). Les informations viennent donc de sources publiques :

- la presse 2025-2026 (Investir au Cameroun, Ecomatin, Jeune Afrique) pour le réseau, le Boeing 737-800, les Q400 et la reprise régionale ;
- Wikipédia pour la création en 2006, le premier vol du 28 mars 2011 et le hub de Douala ;
- les pages Star Miles indexées du site officiel, pour les paliers Green et Silver (30 000 miles) ;
- Airhex pour la palette du logo.

Le logotype à l'écran est une composition typographique ; on peut le remplacer par le logo officiel dans `sceneE()` (`src/spot.js`) et `sc9()` (`long/src/long.js`).

## Structure

```
src/spot.js, src/index.html        15 s — animation canvas (chaque image = fonction pure du temps)
long/src/long.js, long/src/index.html  88 s — même moteur, 9 scènes
long/src/timing.js                 minutage mot à mot de la voix (généré)
src/geo.js                         contours des pays (world-atlas / Natural Earth)
scripts/render.mjs                 rendu image par image (Chromium headless), flou de mouvement adaptatif, workers parallèles
scripts/sfxlib.py                  synthèse sonore partagée
scripts/prep_vo.py, sfx.py, mix.sh            audio du 15 s
long/scripts/place_vo.py, sfx_long.py, mix_long.sh  audio du 88 s
```

## Reproduire

```bash
npm install && node scripts/build_geo.mjs
# 88 s
(cd long && python3 scripts/place_vo.py && python3 scripts/sfx_long.py audio/sfx.wav && ./scripts/mix_long.sh audio/mix.wav)
node scripts/render.mjs video long/src/index.html long/out/video.mp4 30 3
ffmpeg -i long/out/video.mp4 -i long/audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k long/out/camairco-spot-88s.mp4
# 15 s
python3 scripts/prep_vo.py audio/raw/vo1.mp3 audio/vo.wav && python3 scripts/sfx.py audio/sfx.wav && ./scripts/mix.sh audio/mix.wav
node scripts/render.mjs video src/index.html out/video.mp4 30 3
ffmpeg -i out/video.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k out/camairco-spot-15s.mp4
```

Aperçu en direct : servir le dossier (`npx http-server .`) puis ouvrir `src/index.html` ou `long/src/index.html`.
