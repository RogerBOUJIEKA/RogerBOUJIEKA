# Spot 1 — Soirée de louange et de guérison

- `script.md` : texte de la voix off et découpage plan par plan
- `images/` : photos fournies (louange, préau du lycée, pont de Yabassi)
- `render.py` : montage automatique (1920x1080, 30 i/s)
- `audio/musique-fond.mp3` : musique de fond fournie
- `audio/voix-off.mp3` : voix off « Annonceur Croisade » (IziVoice)
- `mix.sh` : mixage voix + musique (musique à -30 LUFS, baissée sous la voix)
- `export/` : spot final en 720p (la version 1080p fait 107 Mo, hors dépôt)

## Rendu

Polices (Fontsource, via npm) : `npm pack @fontsource/anton @fontsource/montserrat @fontsource/playfair-display`, puis extraire les archives dans un dossier.

```
python3 render.py --fonts DOSSIER_POLICES --out spot.mp4 --jobs 4 [--audio mix.wav] [--draft]
```

`--draft` produit un aperçu en 960x540.
