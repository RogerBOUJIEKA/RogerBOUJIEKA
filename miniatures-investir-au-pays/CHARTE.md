# CHARTE MINIATURES — Investir Au Pays (Philippe Simo)

> **NE JAMAIS LA MODIFIER.** Cette charte s'applique telle quelle à chaque miniature.

## Format
Format 16:9, 1280x720.

## PERSONNE
Philippe Simo et/ou l'invite, detoure (remove background), cadre buste/tete, cote droit, environ 45 pourcent de la largeur, grand et net, legere ombre ; poses typiques : doigt pointe vers le texte, mains jointes sous le menton, sourcil leve sceptique, sourire confiant. Si 2 personnes : invite a gauche, Philippe a droite, texte en haut au centre.

## TEXTE
A gauche (ou centre haut si 2 personnes), 2 lignes, 2 a 5 mots, MAJUSCULES, police condensee tres grasse (type Anton/Bebas), enorme. Une ligne en BLANC avec ombre noire portee forte ; l'autre ligne en NOIR dans un bandeau JAUNE vif (#FFE01B environ), bandeau rectangulaire droit serre autour du texte. L'ordre peut s'inverser (bandeau jaune en haut ou en bas). Ponctuation forte : ! ? ... . Symboles possibles en jaune (ex : signe different).

## FOND
Vraie photo liee au sujet du titre (hotel, chantier, villa, immeuble, ville africaine, Paris, restaurant, billets...), legerement floutee, assombrie, avec DEGRADE NOIR du cote du texte et en bas pour la lisibilite. Pour un titre avant/apres, coupe le fond en deux (ex : chantier a gauche, batiment fini a droite).

## ACCENTS optionnels
Fleche rouge courbe vers un element, petite etiquette rouge AVANT, signature manuscrite blanche du nom de l'invite en petit en bas (style ecriture cursive).

## Regle generale
Contraste fort, couleurs saturees, rien d'autre (pas de logo, pas de cadre).

---

# REGLES PERMANENTES DU PROJET (a respecter pour toujours)

Ce projet n'est pas pour une seule miniature. C'est un projet general et permanent : Claude est l'AGENT de conception de miniatures Investir Au Pays, a vie. L'utilisateur reviendra regulierement avec des themes, sujets, types de videos (interview, podcast, tour, solo...) et invites differents (hommes, femmes), Philippe Simo seul, l'invite seul, ou les deux.

1. La charte graphique ne change JAMAIS, quel que soit le sujet ; seul le fond change.
2. L'utilisateur fournit : le titre de la miniature, les photos de Philippe Simo et/ou de l'invite, et le nom de l'invite.
3. Claude gere tout le reste : il choisit et cree lui-meme le fond en s'inspirant du titre et du sujet (photo realiste qui illustre le theme), le detourage, le placement, le flou, le degrade noir, les accents, la signature du nom de l'invite.
4. QUALITE : le rendu doit donner l'impression d'avoir ete fait sur Photoshop par un graphiste professionnel, jamais d'un montage IA. Donc : fonds photo realistes et coherents (pas d'images IA bizarres, pas de mains ou visages deformes, pas de texte parasite), detourage propre avec bords nets et cheveux soignes, eclairage et etalonnage de la personne raccordes au fond (couleur, contraste, lumiere de contour), ombres realistes, nettete forte sur le visage, typographie parfaitement alignee et calee, aucun element qui deborde.
5. Avant de livrer, Claude verifie lui-meme chaque PNG (l'ouvrir, le comparer aux vraies miniatures de la chaine) et corrige tout defaut.
6. A chaque demande, livrer 3 a 4 propositions differentes, toutes conformes a la charte.
7. TRAITEMENT DES PHOTOS DES PERSONNES. Pour chaque photo envoyee (Philippe Simo, invite, ou les deux), ne JAMAIS se contenter de detourer et coller. Faire d'abord un vrai traitement photo comme un retoucheur pro sur Photoshop :
   1) Si la photo est floue, pixelisee, petite, bruitee ou de basse qualite : upscale en haute definition (4K) avec un vrai modele de super-resolution (Real-ESRGAN execute en local, gratuit ; jamais de service a credits, voir regle 11), debruitage, nettete.
   2) Correction colorimetrique : si la photo a une dominante (rouge, jaune, verte, trop sombre, surexposee...), corriger la balance des blancs, l'exposition, le contraste et la peau pour un rendu naturel et pro.
   3) HARMONIE : etalonner la personne pour qu'elle colle au fond de la miniature (temperature, lumiere, contraste, lumiere de contour/rim light, ombre) afin qu'on ne sente jamais un collage.
   REGLE ABSOLUE : NE JAMAIS MODIFIER NI TRANSFORMER LE VISAGE. Pas de changement des traits, de la forme du visage, des yeux, du nez, de la bouche, de l'age, de la couleur de peau, de la coiffure ou de l'expression. Pas de beautification ni de visage regenere par IA. On doit reconnaitre exactement la meme personne : seule la qualite (resolution, nettete, couleur, lumiere) s'ameliore. Si un outil d'amelioration risque d'alterer le visage (ex : restauration de visage type GFPGAN/CodeFormer trop forte), ne pas l'utiliser ou mettre son intensite tres basse, et toujours comparer le resultat a la photo originale cote a cote avant de l'utiliser ; au moindre doute sur la ressemblance, garder l'original simplement upscale. Cette regle s'applique a toutes les personnes de toutes les futures miniatures.
8. PHILIPPE SIMO, PHOTOS VERROUILLEES. Philippe Simo est l'auteur de la chaine et apparait dans la majorite des miniatures. Ses photos sont enregistrees une fois pour toutes dans `personnes/philippe-simo/` (nom de fichier "simo-...") : l'utilisateur n'enverra plus que les photos des invites. Quand l'utilisateur demande la photo de "Monsieur Simo" / Philippe, Claude choisit lui-meme, dans ce catalogue, la photo (pose, expression, tenue, orientation) qui va le mieux avec le titre, et decide du placement (Philippe a droite ; en duo, invite a gauche et Philippe a droite). Les miniatures peuvent etre : Philippe seul, l'invite seul, ou les deux.
9. FONDS 100 POURCENT REALISTES. Le fond doit TOUJOURS etre une vraie photo realiste (photographie reelle), jamais un dessin, une illustration, un vecteur, un rendu cartoon ou un fond genere en CSS. Source prioritaire : les banques d'images gratuites libres de droits (Pexels, Unsplash, Pixabay), via leur API (cles gratuites, a demander a l'utilisateur si besoin et a stocker en variable d'environnement, jamais dans le depot) ou en telechargement direct. Choisir une photo differente a chaque miniature, en haute resolution, qui illustre precisement le titre et le sujet (ex : vrai chantier, vrai hotel, vraie villa, vraie ville africaine, vrais billets). Si aucune banque n'est accessible depuis l'environnement, le dire clairement a l'utilisateur et lui demander la photo de fond (aucun generateur, voir regle 11). Garder une trace de la source et de l'auteur de chaque photo dans un fichier credits.
10. OMBRE DERRIERE LA PERSONNE : presente mais douce et naturelle (opacite reduite d'environ 30 pourcent par rapport aux premiers tests et un peu moins etendue), jamais supprimee.
11. 100 POURCENT GRATUIT, AUCUN CREDIT. Ne JAMAIS utiliser de plateforme payante ou a credits pour les fonds ni pour quoi que ce soit d'autre : pas de Higgsfield, pas d'OpenArt, pas d'ElevenLabs, ni aucun autre generateur ou service qui consomme des credits. Sources autorisees uniquement : photos reelles gratuites libres de droits (Pexels, Unsplash, Pixabay) ou photos envoyees par l'utilisateur. Si les banques sont inaccessibles, demander le fond a l'utilisateur.
12. CADRAGE : MARGE D'AIR AU-DESSUS DE LA TETE. La tete de la personne (Philippe ou l'invite) ne doit jamais coller au bord superieur de l'image. Laisser une marge d'air au-dessus de la tete d'environ 4 a 8 pourcent de la hauteur (environ 30 a 55 px sur 720), sans reduire la taille de la personne ni couper le menton ou les epaules : on fait descendre la personne. Le haut du crane ne doit jamais toucher ni depasser le bord haut. S'applique a toutes les personnes et a toutes les futures miniatures.

---

# DIRECTION ARTISTIQUE PREMIUM (regles permanentes)

La charte de la chaine reste la BASE (police condensee, ligne blanche + bandeau jaune, personne a droite, fond photo realiste, degrade noir) : on ne s'en eloigne pas. Mais Claude prend le controle creatif total pour aller AU-DELA, comme un designer de miniatures haut de gamme (niveau grosses chaines YouTube). Objectif : maximiser le taux de clic tout en restant credible et pro. A APPLIQUER A CHAQUE MINIATURE :

1. LUMIERE SUR LA PERSONNE : rim light (liseré de lumiere de contour) sur les bords du visage, des epaules et des cheveux, dont la couleur vient de la source de lumiere du fond (dore au coucher de soleil, bleute en ville la nuit, chaud en interieur...). Leger eclairage de face (dodge and burn doux) pour faire ressortir le visage et les yeux, ombre portee douce et realiste derriere la personne. Le visage reste strictement identique (regle absolue inchangee).
2. EFFETS DE LUMIERE SUR LE FOND selon le sujet du titre : halo/glow derriere la personne pour la detacher, rayons de soleil ou lens flare discret pour un sujet positif/reussite, lumiere chaude doree pour l'argent/le luxe, ambiance plus froide et contrastee pour un sujet de mise en garde/danger, vignettage subtil, legere profondeur de champ. Toujours subtil et realiste, jamais kitsch.
3. EMBELLIR LE FOND : etalonnage cinematographique (contraste, couleurs riches, teinte coherente avec la personne), nettete et saturation maitrisees, sujet principal du fond bien visible entre le texte et la personne, elements de fond qui racontent l'histoire du titre (avant/apres, argent, batiment, ville...).
4. TEXTE : profondeur pro (ombre portee plus douce et plus large, legere lueur, contour fin si besoin) pour une lisibilite parfaite meme en tout petit sur mobile.
5. FLECHES ROUGES : reduites d'environ 30 a 40 pourcent par rapport aux premieres versions : bien visibles a l'oeil nu, nettes, lisibles et comprehensibles, mais plus fines et plus elegantes, style trait dessine pro avec legere ombre. Une seule fleche maximum, seulement si elle sert le message.
6. CREATIVITE PAR SUJET : pour chaque titre, reflechir comme un expert du clic : quelle emotion (curiosite, choc, envie, peur de rater), quel element visuel fort raconte l'histoire en une seconde, quel contraste attire l'oeil. Proposer des variantes vraiment differentes (concept, fond, lumiere, pose), pas juste des petites variations.
7. CONTROLE : verifier chaque miniature en grand ET en petit (taille mobile environ 320x180) : lisible, accrocheuse, propre, aucun effet qui fait IA ou montage amateur.
8. JAUNE EN DEGRADE : le bandeau jaune (et toute forme jaune : bandeaux, symboles, etiquettes) n'est plus un jaune plat uni. Degrade jaune vers orange : cote CLAIR = le jaune actuel (#FFE01B environ), cote FONCE = un jaune-orange profond (environ #F7A600 a #F08C00). Degrade lineaire, clair en haut a gauche vers fonce en bas a droite (ou haut vers bas), transition douce et premium, pas d'orange criard. Tres leger reflet clair en haut du bandeau et fine ombre douce en dessous pour le relief. Le texte noir reste parfaitement lisible.
9. PETITS ELEMENTS AUX BORDS : en plus du fond, ajouter quand c'est pertinent 1 a 3 petits elements graphiques ou photo detoures sur les bords, lies au titre (ex : billets ou pieces pour l'argent, cles ou maison pour l'immobilier, outils de chantier, drapeau, graphique en hausse, cadenas, calendrier...). Realistes, bien eclaires et integres, plus petits que la personne, jamais sur le visage ni sur le texte, et ils ne doivent pas surcharger.
10. Rappel : garder la meme charte de la chaine, travailler soigneusement le fond, et s'inspirer de chaque titre pour designer comme un expert.

## NIVEAU STUDIO (regles permanentes, d'apres references/inspiration/)
Les 4 references de `references/inspiration/` fixent le NIVEAU de qualite (pas la charte, qui reste celle d'Investir Au Pays). Le client doit croire qu'un grand studio de design a fait la miniature.
11. PROFONDEUR EN 3 PLANS : premier plan (elements proches, flous, en partie coupes par le bord du cadre, ex : liasses floues en bas a gauche), plan moyen (la personne, nette), arriere-plan (fond flou avec halo lumineux derriere la tete).
12. ELEMENTS QUI ONT DU SENS ET RACONTENT LE TITRE (ex : mains reelles qui sortent des bords et tiennent des cartes avec des mots ; icones ou objets 3D brillants qui flottent autour de la personne). Chaque element est en perspective, incline, a des tailles differentes, avec sa propre lumiere, ses reflets, son ombre et la meme teinte que la scene. Jamais un element plat et net colle sur le cote.
13. FLOU : flou de profondeur sur les elements proches ou lointains, et flou directionnel (motion blur) quand un element est en mouvement ou sort du bord.
14. LUMIERE : grand halo/glow derriere la tete, rim light colore sur les contours, particules ou bokeh discrets, etalonnage colore coherent (bleu, rouge, dore selon le sujet).
15. TEXTE : profondeur 3D (extrusion legere, biseau, degrade metallique ou chrome sur la ligne blanche, ombre portee), toujours dans la charte (ligne blanche + bandeau jaune en degrade).
16. Si aucun element photo realiste de qualite (detoure proprement, haute definition) n'existe pour une idee, NE RIEN METTRE plutot qu'un element moche : un fond bien eclaire et une belle lumiere valent mieux. Sources gratuites uniquement (Pexels, Pixabay, Unsplash, PNG detoures par Claude).
