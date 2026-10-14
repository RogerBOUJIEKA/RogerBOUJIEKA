# Spot publicitaire : CABREL TINDO en spectacle, « Père riche / Père pauvre »

Spot 100 % animé (motion design), durée **1 min 28 s (88 s)**, en **4K**, livré en deux formats :

| Format | Résolution | Usage |
|---|---|---|
| YouTube / TV / écrans | 3840 × 2160 (16:9), 30 i/s | YouTube, Facebook, écrans géants |
| Short / Reels / TikTok / Statut | 2160 × 3840 (9:16), 30 i/s | YouTube Shorts, Instagram, TikTok, WhatsApp |

Infos du spectacle reprises de l'affiche : **dimanche 25 octobre 2026, 17h00, Salle Manu Dibango**.
Pass Classique 1 000 F, VIP 3 000 F, VVIP 5 000 F. Réservations : **+237 652 43 67 99**.
Organisation : AFC Dschang. Avec le soutien de l'Ambassade de France au Cameroun et de l'Institut Français du Cameroun.
Signature de fin : **Boujieka Agency**.

> Le nom utilisé est **CABREL TINDO**, celui qui figure sur les affiches.

## Fichiers

```
videos/
  Spot_CabrelTindo_YouTube_4K.mp4      16:9 en 4K (version allégée, < 100 Mo)
  Spot_CabrelTindo_YouTube_1080p.mp4   16:9 en 1080p (Facebook / WhatsApp)
  Spot_CabrelTindo_Short_4K.mp4        9:16 en 4K
  Spot_CabrelTindo_Short_1080p.mp4     9:16 en 1080p
images/
  cabrel_tindo_retouche_4K.jpg         photo retouchée et étalonnée (texte de l'affiche retiré)
  cabrel_tindo_detoure_4K.png          même photo détourée (fond transparent)
  decor_*.jpg                          décors 4K (ville du père riche, quartier du père pauvre, salle)
  miniature_youtube.jpg                miniature 1280×720
audio/
  mix_final_88s.flac / .mp3            mix final (−14 LUFS, niveau YouTube et réseaux sociaux)
  stem_voice / stem_music / stem_sfx   pistes séparées (voix, musique, bruitages)
  voix_off_brute_*.mp3                 prise retenue (John Mala) + prise alternative (Frédéric Nyobè)
  musique_gospel_originale_90s.mp3     fond musical gospel original
  choeur_gospel_alleluia_24s.mp3       chœur gospel « Alléluia » du final
projet/                                projet d'animation (HTML/CSS/JS), modifiable
outils/                                scripts : mixage audio, rendu image par image, encodage
```

## Découpage du spot

| Temps | Scène | Voix off |
|---|---|---|
| 0:00 | Ouverture, salle de spectacle | « Mesdames et messieurs… chers amis de Dschang et d'ailleurs ! » |
| 0:05 | Père riche (ville, costume) | « …ceux qui naissent avec une cuillère en or dans la bouche… » |
| 0:09 | Père pauvre (quartier) + rires du public | « …et ceux qui naissent avec une machette dans la main ! » |
| 0:13 | Écran partagé riche/pauvre | « Père riche… ou père pauvre ? » |
| 0:15 | AFC Dschang présente | « …le phénomène de l'humour gospel… » |
| 0:20 | Drop musical, titre CABREL TINDO + confettis | « CABREL TINDO ! » (avec écho), « En spectacle : Père riche, Père pauvre ! » |
| 0:25 | « Rire aux éclats » | « Une soirée pour rire aux éclats… et célébrer la vie dans la joie ! » |
| 0:30 | Date, heure, salle (3 cartes alignées) | « Rendez-vous le dimanche 25 octobre 2026… » |
| 0:36 | Tickets Classique / VIP / VVIP | prix annoncés un par un |
| 0:47 | Réservations | numéro annoncé deux fois (« Je répète ») |
| 0:58 | Partenaires | « Avec le soutien de… » |
| 1:03 | « Ne viens pas seul(e) ! » | « Viens en famille, viens avec tes amis ! » |
| 1:08 | Affiche finale animée + chœur gospel | rappel nom, date, salle : « Soyez-y… nombreux ! » |
| 1:21 | Signature **Boujieka Agency** | (chœur, fin) |

Les sous-titres, les chiffres et les prix apparaissent au mot près, calés sur la voix off. Les animations suivent aussi le tempo de la musique (112 BPM).

## Musique

Les chansons de David Okit, Jonathan Gambela ou Dena Mwana sont protégées par le droit d'auteur.
Les mettre dans un spot diffusé sur YouTube ou Facebook entraîne en général un blocage, une démonétisation ou une réclamation.
Le fond sonore est donc une **musique gospel originale**, composée pour le spot dans l'esprit de la louange congolaise et d'Afrique centrale
(guitares rumba et sebene, orgue Hammond, claps, chœur « Alléluia »). Elle est libre d'usage pour cette campagne.
Si vous obtenez une licence pour un titre de ces artistes, remplacez `stem_music` dans le mix (voir `outils/mix.py`).

## Modifier et refaire le rendu

1. Lancer un serveur local dans `projet/` : `python3 -m http.server 8765`
2. Prévisualiser : `http://127.0.0.1:8765/index.html?fmt=landscape` ou `?fmt=portrait`, puis `renderFrame(t)` dans la console.
3. Rendu image par image en 4K : `outils/render_all.sh` (Playwright + Chromium).
4. Audio : `python3 outils/mix.py` ; encodage : `outils/encode.sh landscape Spot_CabrelTindo_YouTube`.

---
Réalisation : **Boujieka Agency**
