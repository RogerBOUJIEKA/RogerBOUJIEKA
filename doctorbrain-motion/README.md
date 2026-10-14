# Doctor Brain — Motion design (32 s, 1920×1080, 30 i/s)

Vidéo promo de [doctorbrain.fr](https://doctorbrain.fr), plateforme de révision de la médecine.
Le style reprend la vidéo de référence : fond clair « glassmorphism » avec des halos bleus qui dérivent, une typographie qui apparaît floutée mot à mot et sort en flou de mouvement, une UI animée avec curseur et clics, des transitions par zoom flouté et un outro néon sur fond noir.

| Temps | Scène |
|---|---|
| 0–4 s | Accroche : « Tu cherches » → « une vraie méthode pour » → « Réviser la médecine » |
| 4–7 s | Le téléphone et l'app arrivent en 3D avec des icônes médicales flottantes (cerveau, stéthoscope, gélule, livre) |
| 7–9,5 s | Anneaux concentriques et pastille « Bienvenue sur Doctor Brain » |
| 9,5–11 s | Révélation du logo : le tracé se dessine, puis le slogan « Réviser la médecine avec méthode » |
| 11–17 s | Barre de recherche avec saisie animée et clic, puis « Que veux-tu réviser ? » avec les 6 modules (Leçons méd., Quiz du jour, Cas cliniques, Anglais médical, Campus, Blog) |
| 17–19,5 s | « Révise à ton rythme » / « Progresse chaque jour » |
| 19,5–23 s | Quiz du jour : clic sur la bonne réponse (choc anaphylactique → adrénaline IM), puis « +10 pts » |
| 23–25 s | Notifications : série de jours, classement, nouveau cas clinique |
| 25–27,5 s | Écran de progression avec objectif hebdo, barres par spécialité et classement |
| 27,5–32 s | Outro néon : logo, slogan, CTA « Commence à réviser dès aujourd'hui » et doctorbrain.fr |

## Fichiers
- `index.html` : l'animation. Ouvrez-la dans un navigateur pour la lire, avec pause et barre de défilement. Chaque image est calculée à partir du temps `t`, donc le rendu est reproductible.
- `render.mjs` : exporte la vidéo en MP4 avec Playwright et ffmpeg : `NODE_PATH=$(npm root -g) node render.mjs [sortie.mp4] [fps] [début] [fin]`
- `doctorbrain-motion.mp4` : le rendu final (sans audio).

## À personnaliser
- **Couleurs** : variables CSS `:root` en haut de `index.html` (`--blue2`, `--cyan`, `--violet`…).
- **Logo** : le pictogramme cerveau + tracé ECG est provisoire (entrée `IC.logo`). Remplacez-le par le SVG officiel.
- **Textes** : modifiables directement dans le HTML. Un mot entre `*astérisques*` reçoit le dégradé de couleur.
