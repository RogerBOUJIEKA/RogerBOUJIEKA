# Spot pub — Formation Motion Design avec l'IA

Vidéo publicitaire de 49 s, en deux formats :

- `output/spot_youtube_16x9.mp4` : YouTube, 1920×1080
- `output/spot_short_9x16.mp4` : Shorts, Reels et TikTok, 1080×1920

Toutes les illustrations (burger, voiture, villa, appli, affiche, site web), la musique et les effets sonores sont créés par code. Aucune image ni musique externe n'est utilisée.

## Script voix off

| # | Scène | Texte |
|---|-------|-------|
| 1 | Hook | Une simple capture d'écran. Une affiche. Ou juste le lien d'un site. |
| 2 | IA | Quelques instructions à l'intelligence artificielle… |
| 3 | Révélation | Et ça devient une publicité animée. Professionnelle. |
| 4 | Réalisations | Un spot pour un restaurant. Pour une agence de location de voitures. Pour l'immobilier. |
| 5 | Autres services | Une salle de sport, une boutique, une application… N'importe quel service. |
| 6 | Preuve | Tout ça, je l'ai créé moi-même. Sans caméra. Sans tournage. Sans équipe. |
| 7 | Bascule | Et toi aussi, tu peux le faire. |
| 8 | Offre | J'ai préparé une formation complète, pas à pas, dans les moindres détails. Pour te montrer comment transformer une capture, une affiche, ou un simple lien, en spot publicitaire et en motion design. De A à Z. |
| 9 | Appel à l'action | Clique sur le lien, et profite de la promotion maintenant. |

## Modifier et refaire le rendu

- **Texte et timing de la voix** : `tools/build_vo.py`. Ce script génère `timeline.json` ; ensuite, régénérer `timeline.js` avec `echo "window.TL=$(cat timeline.json);" > timeline.js`.
- **Visuels et animations** : `scenes.js`, `style.css` et `art.js`. Ouvrir `index.html?v=0` (YouTube) ou `index.html?v=1` (Short) dans Chrome, puis appeler `seek(t)` dans la console pour voir l'image à la seconde `t`.
- **Musique et effets sonores** : `tools/build_audio.py`, puis `tools/mix.sh`.
- **Rendu vidéo** : `WORK=/chemin/travail tools/render.sh 0 sortie.mp4` pour le format 16:9, `1` pour le 9:16. Nécessite Playwright (Chromium) et ffmpeg.

La voix est la voix française « Tom » de Piper (synthèse vocale), rendue plus grave. Pour une voix encore plus naturelle, remplace `vo_raw.wav` par un enregistrement réel calé sur `timeline.json`.
