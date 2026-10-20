# Agapeo — spot publicitaire 1:29

Spot de motion design (89 s) pour **Agapeo**, plateforme chrétienne dédiée à l'amour et aux relations.
Style inspiré des vidéos de référence : textes animés, cartes 3D en verre, curseur qui clique,
dégradés pastel, rayons de lumière, beaucoup d'effets sonores.

| Fichier | Format |
| --- | --- |
| `output/Agapeo_spot_16x9.mp4` | 1920×1080, 30 i/s — YouTube, Facebook, TV |
| `output/Agapeo_spot_9x16.mp4` | 1080×1920, 30 i/s — Reels, TikTok, Stories, Status |

## Script de la voix off (voix féminine douce, tutoiement)

| Temps | Voix off | À l'écran |
| --- | --- | --- |
| 0:00 | *(musique)* | « Et si l'amour commençait par la foi ? » |
| 0:03 | Depuis longtemps… tu pries pour rencontrer la bonne personne. | Carte « Ma prière » qui s'écrit toute seule |
| 0:08 | Quelqu'un qui partage ta foi… tes valeurs… et ton envie de construire quelque chose de vrai. | Cartes « ta foi », « tes valeurs », « quelque chose de vrai » → un cœur qui bat |
| 0:17 | Mais entre les relations superficielles, les déceptions et les histoires sans lendemain… il est facile de perdre espoir. | Le cœur se brise, cartes sombres qui s'empilent puis tombent |
| 0:26 | Alors, respire… et découvre Agapéo. | Une lumière qui respire → explosion de rayons, logo Agapeo |
| 0:33 | Agapè… c'est l'amour inconditionnel. L'amour qui est patient, plein de bonté. L'amour tel que Dieu nous l'enseigne. | « Agapè » (ἀγάπη), verset 1 Corinthiens 13:4, colombe |
| 0:44 | Agapéo, c'est la plateforme chrétienne dédiée à l'amour et aux relations. Un lieu pensé pour celles et ceux qui veulent aimer selon le cœur de Dieu. | Navigateur qui tape « agapeo.love », clic sur « Découvrir » |
| 0:55 | Ici, la foi est au centre. Les valeurs comptent. Et chaque relation se construit dans le respect, la sincérité… et la prière. | Carrousel de 5 cartes : foi, valeurs, respect, sincérité, prière |
| 1:07 | Parce que tu mérites un amour qui t'élève. Un amour qui dure. Un amour béni. | Climax : typographie animée, symbole infini, « béni » doré |
| 1:15 | Ta plus belle histoire commence peut-être aujourd'hui. | Interrupteur qui s'allume avec un cœur |
| 1:19 | Rejoins Agapéo dès aujourd'hui. | Bouton « Rejoindre Agapeo » cliqué → agapeo.love |
| 1:23 | Agapéo. L'amour… selon le cœur de Dieu. | Carton final : logo, slogan, adresse du site |

Le texte de la voix off est dans `tools/voix_off.json` (une ligne par segment, avec la pause qui suit).

## À valider avec Agapeo

- **Logo** : le logo (cœur blanc avec une croix sur fond rose-corail) est une proposition provisoire.
  Envoyez le vrai logo pour le remplacer (`logoSVG()` dans `scene/app.js`).
- **Slogan** « L'amour, selon le cœur de Dieu » : proposition, à remplacer par le slogan officiel s'il existe.
- **Contenu du site** : le site agapeo.love n'était pas accessible depuis l'environnement de production.
  Le texte reste volontairement général (aucune fonctionnalité, aucun prix, aucun chiffre inventé).
  La page du site montrée dans le navigateur est une illustration, pas une capture du vrai site.
- **Voix** : la voix off actuelle est générée localement avec Kokoro (voix française `ff_siwis`, open source).
  Le compte ElevenLabs n'avait plus de crédits. Avec environ 1 000 crédits ElevenLabs, la voix « Virginie »
  (plus naturelle) peut remplacer la voix actuelle sans rien changer d'autre.

## Comment c'est fabriqué

```
tools/voix_off.json  ──► tools/tts_lines.py (Kokoro)  ──► segments de voix + durées
                                                           │
tools/build_timeline.py  ◄─────────────────────────────────┘
        │  scene/timeline.json (placement des phrases, grille musicale 72 BPM)
        ├──► scene/ (HTML/CSS/JS, rendu image par image)  ──► tools/render.mjs ──► vidéo muette + audio/cues.json
        ├──► tools/compose_music.py (MIDI) ──► FluidSynth + MuseScore General ──► musique
        └──► tools/sfx.py (synthèse des effets à partir de cues.json)
tools/mix.py : voix + musique (ducking sous la voix) + effets ──► mix -14 LUFS ──► ffmpeg ──► MP4
```

### Reconstruire

Prérequis : Python 3 (`kokoro-onnx`, `soundfile`, `scipy`, `mido`), Node 22 + Playwright/Chromium,
ffmpeg, fluidsynth, soundfont `musescore-general-soundfont-lossless`, modèles Kokoro
(`kokoro-v1.0.onnx`, `voices-v1.0.bin`).

```bash
cd tools
python tts_lines.py <modeles_kokoro> voix_off.json <vo_dir> 0.8
python build_timeline.py voix_off.json <vo_dir>/durations.json ../scene/timeline.json
node render.mjs --cues ../audio/cues.json
python sfx.py ../audio/cues.json 89 <tmp>/sfx.wav
python compose_music.py ../scene/timeline.json <tmp>/music.mid
fluidsynth -ni -F <tmp>/music_raw.wav -r 48000 -g 0.45 /usr/share/sounds/sf2/MuseScore_General_Full.sf2 <tmp>/music.mid
python mix.py ../scene/timeline.json <vo_dir> <tmp>/music_raw.wav <tmp>/sfx.wav ../audio
node render.mjs --w 1920 --h 1080 --out <tmp>/video.mp4
ffmpeg -i <tmp>/video.mp4 -i ../audio/mix.wav -c:v copy -c:a aac -b:a 256k -shortest ../output/Agapeo_spot_16x9.mp4
```

Pour prévisualiser l'animation dans un navigateur : servir le dossier `scene/` puis ouvrir
`index.html?play` (ou `index.html?w=1080&h=1920&play` pour le format vertical).
