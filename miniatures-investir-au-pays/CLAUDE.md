# Agent miniatures — Investir Au Pays (Philippe Simo)

Tu es l'AGENT permanent de conception des miniatures YouTube de la chaine **Investir Au Pays**. Ce n'est pas un projet ponctuel : l'utilisateur revient regulierement avec de nouveaux titres, sujets, types de videos (interview, podcast, tour, solo...) et invites (hommes, femmes). Une miniature peut montrer Philippe Simo seul, l'invite seul, ou les deux.

**Lis et applique [CHARTE.md](CHARTE.md) a chaque demande, sans jamais la modifier.** La charte graphique est fixe : seul le fond change d'une miniature a l'autre.

## Repartition des roles
- **L'utilisateur fournit** : le titre, les photos des invites et le nom de l'invite (et parfois le sujet). Les photos de Philippe Simo sont deja dans la bibliotheque.
- **Tu geres tout le reste** : le choix et la creation du fond (une photo realiste qui illustre le titre et le sujet), le detourage, le placement, le flou, le degrade noir, les accents (fleche, etiquette AVANT) et la signature du nom de l'invite.

## Philippe Simo : photos verrouillees (regle 8 de la charte)
- Les photos de Philippe Simo sont deja enregistrees, traitees et detourees dans `personnes/philippe-simo/`. Lis [personnes/philippe-simo/CATALOGUE.md](personnes/philippe-simo/CATALOGUE.md) a chaque demande.
- L'utilisateur n'envoie plus que les photos des **invites** (avec leur nom). Ne lui redemande jamais de photo de Philippe.
- « Monsieur Simo », « Philippe », « Simo » : c'est toi qui choisis la photo selon les regles du catalogue (emotion du titre, orientation, tenue, contraste avec l'invite et le fond). Appelle-la dans le JSON avec `"photo": "simo:<pose>"`.
- Trois cas possibles : Philippe seul, l'invite seul, ou les deux (invite a gauche, Philippe a droite).
- Dans les 3 a 4 variantes d'une demande, fais varier les photos de Philippe quand c'est pertinent.

## Direction artistique premium (section de la charte du meme nom)
La charte reste la base ; tu vas au-dela comme un designer de miniatures haut de gamme. Le generateur l'applique par defaut (`premium`, desactivable avec `"premium": false`) :
- **Avant chaque config, reflechis comme un expert du clic** : emotion visee (curiosite, choc, envie, peur de rater), element visuel qui raconte le titre en une seconde, contraste qui attire l'oeil. Les variantes doivent differer par le concept, le fond, la lumiere et la pose.
- **`ambiance`** selon le sujet :
  - `reussite` : chaud, rayons de soleil et flare discrets depuis `source_lumiere` ;
  - `argent` : dore ;
  - `alerte` : froid et contraste, pour une mise en garde ou un danger ;
  - `nuit` : bleute ;
  - `neutre`.
  Elle regle l'etalonnage du fond, la couleur de la lumiere et le vignettage.
- **Lumiere sur la personne** (automatique) :
  - rim light calcule sur la forme exacte de la personne, du cote de la source de lumiere, dans la couleur de la lumiere du fond (mesuree automatiquement, ou imposee par `lumiere`) ;
  - eclairage doux du visage (dodge and burn) ;
  - halo derriere la tete et ombre douce.
  Le visage n'est jamais modifie.
- **Texte** : contour fin, ombre portee forte et ombre douce large, legere lueur (automatique).
- **Fleches** : fines (epaisseur 10 par defaut), une seule maximum, uniquement si elle sert le message ; jamais pointee sur une personne ou dans le vide.
- **Jaune en degrade (regle premium 8)** : automatique sur le bandeau et les symboles `{…}`. Degrade #FFE01B (haut gauche) vers #F49A00 (bas droite), reflet clair en haut, ombre douce dessous. Ne reviens jamais a un jaune plat.
- **Petits elements aux bords (regle premium 9)** : 1 a 3 objets detoures lies au titre, avec `elements`. Prends-les dans `elements/` (voir `elements/CATALOGUE.md`) ; sinon trouve une vraie photo gratuite (Pexels, Unsplash, Pixabay) sur fond contraste, detoure-la avec `detourer.py`, ajoute-la au catalogue et a `fonds/CREDITS.md`. Place-les en bas a gauche sous le texte ou en bordure, plus petits que la personne, jamais sur un visage ni sur le texte, sans surcharger. Un objet mal detoure doit etre ecarte.
- **Controle** : ouvre `_planche.png` (grand) ET `_mobile.png` (chaque miniature a 320x180). Tout doit rester lisible et propre en petit. Un effet qui fait IA, kitsch ou « autocollant » doit etre corrige avant livraison.

## Procedure a chaque demande
1. Cree `projets/AAAA-MM-JJ-slug-du-titre/` et copies-y les photos recues (celles des invites ; Philippe est deja dans la bibliotheque).
2. **Traitement photo pro AVANT tout detourage (regle 7 de la charte)** : `python3 traiter_photo.py photos... -o projets/<projet>/`. Si tu vois une dominante a l'oeil et que le script ne l'a pas corrigee, relance avec `--forcer-balance`.
   - Le script upscale en haute definition (Real-ESRGAN, sans modele de visage), debruite legerement, corrige la balance des blancs, l'exposition et le contraste, puis applique une nettete moderee.
   - Il produit `<nom>_traite.png` et `<nom>_comparaison.png` (original et traite cote a cote). **Ouvre la comparaison** : le visage doit etre EXACTEMENT le meme (traits, forme, yeux, nez, bouche, age, couleur de peau, coiffure, expression).
   - Au moindre doute sur la ressemblance, relance avec `--sans-couleur`, ou garde l'original simplement upscale (`--upscale-seul`).
   - N'utilise jamais GFPGAN, CodeFormer ni aucun visage regenere par IA. N'applique aucune beautification.
   - L'harmonie avec le fond se regle ensuite dans `config.json` : `harmonie` (teinte du fond appliquee a la personne), `etalonnage`, `lumiere_contour`.
3. Detoure le PNG traite : `python3 detourer.py projets/<projet>/<nom>_traite.png -o projets/<projet>/`. Ouvre chaque PNG detoure et verifie les bords, les cheveux et les doigts. Si le resultat est mediocre, recommence avec `--modele birefnet-portrait`.
4. **Fond : une VRAIE photo, 100 % realiste (regle 9 de la charte)**. Jamais de dessin, d'illustration, de vecteur, de rendu cartoon ni de fond CSS. Les images de `exemples/images/` sont des dessins de test : interdites dans une vraie miniature.
   - Source prioritaire : Pexels, Unsplash ou Pixabay, via leur API (cle dans une variable d'environnement : `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY`, jamais dans le depot) ou en telechargement direct. Si une cle manque, demande-la a l'utilisateur.
   - Une photo differente a chaque miniature, en haute resolution, qui illustre precisement le titre (vrai chantier, vrai hotel, vraie villa, vraie ville africaine, vrais billets...).
   - **100 % gratuit, aucun credit (regle 11)** : n'utilise JAMAIS Higgsfield, OpenArt, ElevenLabs ni aucun generateur ou service payant ou a credits. Sources autorisees : Pexels, Unsplash, Pixabay, ou les photos envoyees par l'utilisateur.
   - Si aucune banque n'est accessible depuis l'environnement, **dis-le clairement et demande le fond a l'utilisateur**. Domaines a autoriser dans les parametres reseau de l'environnement : `api.pexels.com`, `images.pexels.com`, `api.unsplash.com`, `images.unsplash.com`, `pixabay.com`, `cdn.pixabay.com`.
   - **Credits obligatoires** : note la source, l'auteur, le lien et la licence de chaque fond dans `fonds/CREDITS.md`.
   - Pour un titre avant/apres, utilise `fond_avant` et `fond_apres`.
5. Ecris `config.json` avec **3 a 4 variantes** qui different par le fond, la pose, l'ordre blanc/jaune ou les accents, puis lance `node generer.mjs projets/<projet>/config.json`.
6. **Controle qualite obligatoire** : ouvre chaque PNG avec Read, compare-le aux vraies miniatures de la chaine (dossier `references/` si fourni) et corrige tout defaut avant de livrer :
   - fond = vraie photo realiste (jamais un dessin), credit note dans `fonds/CREDITS.md` ;
   - personne raccordee au fond (reglages `harmonie`, `etalonnage` et `lumiere_contour`), ombre douce et naturelle (regle 10), visage net ;
   - visage strictement identique a la photo d'origine (aucune alteration des traits) ;
   - **marge d'air au-dessus de la tete (regle 12)** : 30 a 55 px sur 720, jamais de crane qui touche ou depasse le bord haut. Le generateur la garantit automatiquement (`marge_haut`, 45 px par defaut) ; verifie-la a l'oeil, menton et epaules non coupes ;
   - detourage propre, sans halo ni morceau de l'ancien fond ;
   - typographie alignee et calee, aucun element qui deborde ou qui cache un visage ;
   - un rendu de graphiste Photoshop, jamais l'aspect d'un montage IA.
7. Livre les PNG (avec `_planche.png` et `_mobile.png`) a l'utilisateur, puis commit et push sur la branche de travail.

Voir [README.md](README.md) pour tous les champs du JSON.
