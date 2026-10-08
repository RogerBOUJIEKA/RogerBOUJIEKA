# Bovann Group — spot motion design 1 min 28 s

Film publicitaire en français pour **Bovann Group** (Lomé, Togo), 1920×1080, master à 59,94 i/s, avec voix off féminine douce (ElevenLabs « Sophie », eleven_multilingual_v2), musique Afro-house synthétisée (120 BPM, la mineur) et design sonore synthétisé.

Fichier final : `out/bovann-group-spot-88s.mp4`

## Déroulé

| Temps | Scène |
|---|---|
| 0 – 6 s | Accroche (sombre) : le point rouge, « UNE IDÉE ? » → « UNE ÉQUIPE À FORMER ? », éclatement en particules |
| 6 – 12 s | Le problème (clair) : 5 prestataires, 5 interlocuteurs, 5 délais, zéro cohérence |
| 12 – 14 s | La bascule : « Et si un seul partenaire faisait tout ? », le point du « ? » envahit l'écran |
| 14 – 20 s | Drop + logo : EXPERTISE. INNOVATION. RÉSULTATS. et les cinq pôles |
| 20 – 60 s | Les cinq pôles : Évènementiel, Communication, Informatique, Formations, Management |
| 60 – 66 s | Approche intégrée : pentagone autour du logo, « 5 EXPERTISES. 1 SEUL PARTENAIRE. » |
| 66 – 72 s | Preuves : mosaïque « NOS RÉALISATIONS », « ILS NOUS FONT CONFIANCE » |
| 72 – 76 s | Promesse : TRANSFORMONS VOS IDÉES EN SUCCÈS TANGIBLES. |
| 76 – 80 s | Appel à l'action : « Prenez rendez-vous » |
| 80 – 88 s | Carte de fin : signature, contacts, réseaux, le point rouge final |

## Logo

Le site bovanngroup.com n'était pas accessible depuis l'environnement de production. Le logo officiel n'a donc pas été redessiné : un emplacement marqué le remplace. Déposer `assets/logo.png` (PNG transparent) ou `assets/logo.svg`, puis relancer le rendu : il est inséré automatiquement dans toutes les scènes.

## Reproduire

```bash
npm install
python3 scripts/music.py audio/music.wav
python3 scripts/sfx.py audio/sfx.wav
python3 scripts/mix.py audio/raw/vo_d.mp3 audio/mix.wav
node scripts/render.mjs stills stills 60,270,500            # images clés
node scripts/render.mjs video out/master_v.mp4 59.94 0 88 4  # rendu reprenable par blocs
ffmpeg -i out/master_v.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart out/bovann-group-spot-88s.mp4
```

Aperçu interactif : `npx http-server .` puis ouvrir `src/index.html` (curseur de frame).

## Structure

```
src/engine.js   moteur : easing, tables de clés, hash déterministe, flous directionnels, grain, grille de points
src/icons.js    icônes au trait
src/spot.js     les scènes (chaque image = fonction pure du numéro de frame)
scripts/        musique, effets, mixage, découpe de la voix, rendu Playwright
```
