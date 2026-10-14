# Doctor Brain — Clip de présentation (1 min 28)

Clip promo de [doctorbrain.fr](https://doctorbrain.fr), la plateforme de révision de la médecine, livré en deux formats :

| Fichier | Format | Usage |
|---|---|---|
| `doctorbrain-youtube.mp4` | 1920×1080, 16:9, 30 i/s, 88 s | YouTube, site, LinkedIn |
| `doctorbrain-short.mp4` | 1080×1920, 9:16, 30 i/s, 88 s | YouTube Shorts, Reels, TikTok |
| `doctorbrain.srt` | Sous-titres de la voix off | À importer sur YouTube |

Son : voix off féminine française très douce (ElevenLabs, voix « Mila »), musique d'ambiance originale, effets sonores calés à l'image près (clics, apparitions, transitions, bonne réponse, roue, ECG…). Mixage normalisé à −14 LUFS et −1,5 dBTP.

## Déroulé
| Temps | Scène | Voix off |
|---|---|---|
| 0–12 s | Accroche : cours éparpillés, fiches empilées, horloge | « Réviser la médecine… c'est parfois avoir l'impression de se perdre. Des cours partout… » |
| 12–16 s | « Et si tu révisais, enfin… avec méthode ? » | idem |
| 16–20 s | Anneaux « Bienvenue sur Doctor Brain », puis le logo | « Bienvenue sur Doctor Brain. » |
| 20–26 s | Téléphone avec l'appli et ses 8 modules | « La plateforme pensée pour réviser la médecine, pas à pas, au même endroit. » |
| 26–33 s | 01 · Leçons méd. : spécialités, puis leçon structurée | « Les leçons médicales… structurées par spécialité. » |
| 33–43 s | 02 · Quiz du jour : cycle de 10 jours, 5 QCM, bonne réponse, classement | « …cinq QCM, sur un cycle de dix jours… tu grimpes au classement. » |
| 43–50 s | 03 · Cas cliniques : 5 étapes, du motif à la prise en charge (ECG animé) | « …étape par étape, du premier symptôme jusqu'à la prise en charge. » |
| 50–56 s | 04 · Syndromes : cartes, et la carte du syndrome néphrotique se retourne | « …retenir les grands tableaux cliniques. » |
| 56–62 s | 05 · Anglais médical : flashcard FR→EN, vocabulaire | « …des leçons et des quiz quotidiens. » |
| 62–68 s | 06 · Campus : ressources, bibliothèque par année, formations | « …une bibliothèque organisée par année, et les formations. » |
| 68–75 s | 07 · Brain Wheel : la roue tourne et lance la session | « Lance la Brain Wheel… et démarre ta session de révision. » |
| 75–80 s | 08 · Blog : articles | « …des articles utiles pour apprendre… et progresser. » |
| 80–88 s | Outro néon : logo, slogan, CTA, doctorbrain.fr | « Doctor Brain. Réviser la médecine… avec méthode. Rendez-vous sur doctorbrain.fr. » |

## Refaire le rendu
```bash
export NODE_PATH=$(npm root -g)
node render-clip.mjs youtube        # -> build/video-youtube.mp4 + build/cues.json
node render-clip.mjs short          # -> build/video-short.mp4
python3 audio/build_audio.py        # -> build/mix.wav (+ pistes séparées voix / musique / effets)
python3 audio/subtitles.py          # -> build/doctorbrain.srt
# puis assembler image + son (normalisation loudnorm -14 LUFS), voir l'historique du dépôt
```
- `clip.html` : l'animation complète. Ouvrez-la dans un navigateur pour la prévisualiser (le lien en bas bascule entre 16:9 et 9:16). Chaque image est calculée à partir du temps, et les repères sonores (`CUES`) sont définis dans le même fichier, donc image et son restent synchronisés.
- `audio/vo/` : les 14 phrases de voix off. `audio/build_audio.py` synthétise la musique et les effets, puis mixe le tout avec ducking sous la voix.
- `index.html` / `doctorbrain-motion.mp4` : la première version de 32 s.

## À valider avant diffusion
Le site n'était pas accessible depuis l'environnement de production. Les **modules et leurs descriptions** viennent du site (via les moteurs de recherche), mais le **logo, les couleurs et les écrans d'interface sont des recréations stylisées**. Les prénoms, scores, titres d'articles et contenus de cas sont illustratifs. Pour coller à la charte, remplacez `IC.logo` et les variables `:root` dans `clip.html`, puis relancez le rendu.
