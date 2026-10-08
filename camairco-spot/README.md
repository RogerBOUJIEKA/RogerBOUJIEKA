# Camair-Co — spot motion design 15 s

Spot publicitaire en français pour Camair-Co, 1920×1080, 30 i/s, 15 s, voix off féminine douce.

**Vidéo finale :** [`out/camairco-spot-15s.mp4`](out/camairco-spot-15s.mp4)

## Voix off

> Au départ de Douala, Yaoundé et Garoua… Camair-Co vous ouvre le ciel d'Afrique.
> Libreville, Cotonou, Brazzaville, N'Djamena… Voyagez en confiance, portés par
> l'hospitalité camerounaise. Camair-Co. L'étoile du Cameroun.

Voix : ElevenLabs « Cassandra – narration chaleureuse » (eleven_multilingual_v2). Musique : ElevenLabs Music, instrumentale.

## Découpage

| Temps | Scène | Animation |
|---|---|---|
| 0,0 – 2,9 s | L'étoile | L'étoile du drapeau se trace, s'embrase, puis se pose sur Douala. Le contour du Cameroun se dessine, les villes DLA / NSI / GOU s'affichent comme un tableau des départs. |
| 2,9 – 5,0 s | Le ciel d'Afrique | Travelling arrière jusqu'à l'espace : globe 3D, avion avec traînées, « LE CIEL D'AFRIQUE ». |
| 5,0 – 8,5 s | Les routes | Retour vers l'Afrique centrale et de l'Ouest. Des arcs de vol partent de Douala vers LBV, COO, BZV, NDJ, BGF et PNR, avec un tableau à volets synchronisé sur chaque ville citée. |
| 8,5 – 10,0 s | Embarquement | Volet aux couleurs du drapeau, puis la carte d'embarquement se construit et reçoit le tampon « Bon voyage ». |
| 10,0 – 12,3 s | Hospitalité | Le hublot s'ouvre, le store se lève sur un coucher de soleil au-dessus des nuages, avec l'aile aux couleurs nationales. |
| 12,3 – 15,0 s | Signature | Plongée dans le soleil, qui devient l'étoile. Logotype CAMAIR-CO, « L'étoile du Cameroun » et www.camair-co.cm. |

Les sources sur les destinations et la couleur sont la presse 2025-2026 (Investir au Cameroun), Wikipédia et Airhex pour la palette du logo. Le site camair-co.cm n'était pas accessible depuis l'environnement de production. Le logotype est une composition typographique ; on peut le remplacer par le logo officiel dans `sceneE()` de `src/spot.js`.

## Structure

```
src/index.html, src/spot.js   animation canvas (chaque image = fonction pure du temps)
src/geo.js                    contours des pays (world-atlas / Natural Earth)
scripts/prep_vo.py            resserre la voix off pour tenir en 15 s
scripts/sfx.py                design sonore synthétisé (whooshes, impacts, volets, carillon)
scripts/mix.sh                mixage voix + musique (ducking) + effets, master −16 LUFS
scripts/render.mjs            rendu image par image (Chromium headless) avec flou de mouvement
audio/                        prises voix/musique brutes et pistes préparées
```

## Reproduire

```bash
npm install
node scripts/build_geo.mjs
python3 scripts/prep_vo.py audio/raw/vo1.mp3 audio/vo.wav
python3 scripts/sfx.py audio/sfx.wav
./scripts/mix.sh audio/mix.wav
node scripts/render.mjs video out/video.mp4 30 5
ffmpeg -i out/video.mp4 -i audio/mix.wav -c:v copy -c:a aac -b:a 256k -shortest out/camairco-spot-15s.mp4
```

Aperçu en direct : servir le dossier (`npx http-server .`) puis ouvrir `src/index.html`.
