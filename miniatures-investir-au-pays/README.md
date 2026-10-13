# Miniatures — Investir Au Pays

Générateur de miniatures YouTube pour la chaîne **Investir Au Pays** (Philippe Simo).
Chaque miniature applique **[CHARTE.md](CHARTE.md)**, qui ne se modifie jamais.

## Installation

```bash
cd miniatures-investir-au-pays
npm install                       # Playwright (Chromium)
pip install "rembg[cpu]"          # détourage
npm test                          # images de remplacement -> détourage -> 4 miniatures de test
```

Si Chromium n'est pas trouvé automatiquement : `CHROMIUM_PATH=/chemin/vers/chromium`, ou `npx playwright install chromium`.

## Flux pour une nouvelle miniature

1. **Détourer** les photos (fond transparent, recadré au plus près) :
   ```bash
   python3 detourer.py philippe.jpg invite.jpg -o projets/ma-video/ [--buste 0.6]
   ```
   `--buste 0.6` ne garde que les 60 % du haut du sujet (cadrage buste/tête).
   `--modele birefnet-portrait` donne un détourage plus fin des cheveux, mais il est plus lent.
2. **Choisir les fonds** : de vraies photos liées au sujet. Le flou, l'assombrissement et le dégradé noir sont appliqués automatiquement.
3. **Écrire un JSON** (voir `exemples/test.json`) avec 3 ou 4 variantes, puis :
   ```bash
   node generer.mjs projets/ma-video/config.json
   ```
   On obtient un PNG 1280x720 par variante, plus `_planche.png`, qui montre toutes les variantes côte à côte.

## Champs du JSON

`base` contient les réglages communs. Chaque élément de `variantes` les surcharge. Les chemins sont relatifs au fichier JSON.

| Champ | Rôle |
|---|---|
| `nom` | nom du fichier PNG de la variante |
| `ligne1`, `ligne2` | les 2 lignes du titre (mises en MAJUSCULES automatiquement) |
| `jaune` | `1` ou `2` : numéro de la ligne placée dans le bandeau jaune (2 par défaut) |
| `{…}` dans la ligne blanche | met ce passage en jaune, par exemple `"{≠} investissement"` |
| `fond` | photo de fond |
| `fond_avant`, `fond_apres` | fond coupé en deux pour un titre avant/après (remplace `fond`) |
| `personnes` | 1 ou 2 éléments `{ photo, role: "philippe" \| "invite", miroir, echelle, decalage_x, decalage_y }` |
| `invite` | nom de l'invité, utilisé par la signature |
| `signature` | `true`, ou `{ texte, x, y }` : signature manuscrite blanche en bas |
| `etiquette` | `"AVANT"`, ou `{ texte, x, y }` : petite étiquette rouge |
| `fleche` | `{ de: [x,y], vers: [x,y], courbure: 0.3, epaisseur: 16 }` : flèche rouge courbe |
| `police` | `"anton"` (par défaut) ou `"bebas"` |
| `flou`, `luminosite`, `saturation` | réglages fins du fond (par défaut : 3, 0.62 et 1.3) |

Placement automatique, conforme à la charte :
- **1 personne** : la personne est à droite (environ 45 % de la largeur) et le texte à gauche, avec un dégradé noir à gauche et en bas.
- **2 personnes** : l'invité est à gauche, Philippe à droite, et le texte en haut au centre, avec un dégradé noir en haut et en bas.
- La taille du texte s'ajuste automatiquement pour remplir la zone de texte.

`miroir: true` retourne la photo horizontalement, par exemple pour que le doigt pointe vers le texte.

## Polices

Anton, Bebas Neue et Mrs Saint Delafield (signature) viennent de Google Fonts (licence OFL). Elles sont aussi copiées dans `fonts/`, ce qui garantit un rendu identique hors ligne. Les polices locales sont utilisées en priorité car elles sont complètes : la version allégée servie par Google ne contient pas « ≠ ».
