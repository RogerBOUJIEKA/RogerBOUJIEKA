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
