# Philippe Simo — photos verrouillées

Philippe Simo est l'auteur de la chaîne. Ses photos sont **fournies une fois pour toutes** : l'utilisateur n'enverra plus que les photos des invités.
Quand l'utilisateur dit « Monsieur Simo », « Philippe » ou « utilise la photo de Simo », **choisis toi-même** la photo de ce catalogue qui convient au titre.

Les photos ont déjà reçu le traitement de la règle 7 (Real-ESRGAN avec garde de fidélité, aucune correction couleur car les photos studio étaient déjà neutres, ressemblance 0,94 à 0,996) et sont détourées.
- Les originaux sont dans `originaux/` : ne jamais les modifier.
- Dans le JSON, on les appelle `"photo": "simo:<pose>"`.

| Appel JSON | Pose / expression | Tenue | Orientation | Pour quels titres |
|---|---|---|---|---|
| `simo:poing-sourire-chemise-bleue` | poing levé près du visage, grand sourire confiant, regard caméra | chemise bleu denim col mao | corps tourné vers la **gauche de l'image** (vers le texte) : idéal à droite | victoire, motivation, « c'est possible », gains, réussite, bonnes nouvelles |
| `simo:bras-croises-col-roule-noir` | bras croisés, grand sourire, posture d'expert | col roulé noir, montre | de face | expertise, autorité, « je vous explique », réussite, conseils de pro |
| `simo:sourire-mains-hanches-chemise-bleue` | mains sur les hanches, grand sourire, très ouvert | chemise bleu denim col mao | de face, cadrage large : utiliser `"recadrage": 0.55` | positif, accueil, « bienvenue », succès, ton léger |
| `simo:mains-jointes-menton-chemise-blanche` | mains jointes sous le menton, léger sourire, regard posé | chemise blanche, montre | de face, symétrique | analyse, sérieux, « la vérité sur… », interview, podcast, réflexion |
| `simo:doigt-pointe-sceptique-gilet-bleu` | doigt pointé, sourcil levé **sceptique**, tête inclinée | gilet bleu ciel, chemise blanche | pointe vers la **droite de l'image** | mise en garde, « attention », arnaque, erreur, « vous vous trompez » |

## Règles de choix (appliquées automatiquement)
1. **Émotion du titre**, d'abord :
   - **positif, réussite** : `poing-sourire`, `bras-croises` ou `sourire-mains-hanches` ;
   - **analytique, sérieux** : `mains-jointes-menton` ;
   - **mise en garde, scepticisme** : `doigt-pointe-sceptique`, sinon `mains-jointes-menton`.
2. **Placement** : seul, Philippe est à droite (texte à gauche) ; en duo, il est à droite et l'invité à gauche (charte). Préfère une pose tournée vers la gauche de l'image (`poing-sourire`) ou de face. Un regard ou un geste ne doit jamais partir hors de l'image.
3. **`doigt-pointe-sceptique` pointe vers la droite**, c'est-à-dire hors de l'image quand Philippe est à droite.
   - Pour qu'il pointe le texte, il faudrait inverser la photo (`"miroir": true`). Cela inverse le visage gauche-droite : **ne pas le faire sans l'accord de l'utilisateur** (règle 7 : visage jamais transformé).
   - Sans miroir, n'utilise cette pose que si elle reste cohérente (par exemple, elle pointe un élément du fond placé à droite).
4. **Tenue et contraste** :
   - Varie les tenues d'une miniature à l'autre, et dans les 3 à 4 variantes d'une même demande.
   - Si l'invité porte du bleu, préfère `bras-croises-col-roule-noir` ou `mains-jointes-menton-chemise-blanche`.
   - Le col roulé noir sur un fond sombre demande `lumiere_contour` pour détacher la silhouette.
5. Cadrage buste/tête « grand et net » : utilise `recadrage` (0,6 à 0,8) quand le corps prend trop de place.
