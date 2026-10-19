"""Contenu de départ : formations, publications d'accueil et sources de veille.

Appliqué uniquement sur une base vide (aucune formation), puis modifiable
depuis l'administration.
"""

import secrets

from .news import DEFAULT_FEEDS

COURSES = [
    {
        "title": "Les fondamentaux de l'IA générative",
        "level": "Débutant",
        "description": "Comprendre ce que l'IA générative sait faire (et ne sait pas faire) pour l'utiliser avec confiance.",
        "lessons": [
            ("Qu'est-ce que l'IA générative ?", True, """
L'**IA générative** désigne des modèles capables de *produire* du contenu : texte, images, son, vidéo ou code.
Contrairement à un logiciel classique qui suit des règles écrites à la main, ces modèles ont appris des
régularités à partir d'immenses quantités d'exemples.

## Ce qu'elle fait bien

- Rédiger, reformuler, résumer et traduire
- Proposer des idées, des plans, des variantes
- Expliquer un sujet à différents niveaux
- Écrire et corriger du code

## Ses limites

- Elle peut **inventer** des informations avec aplomb : vérifiez toujours les faits importants.
- Elle ne connaît pas votre contexte tant que vous ne le lui donnez pas.
- Ses connaissances s'arrêtent à une date donnée, sauf si l'outil peut chercher sur le web.

> À retenir : l'IA est un excellent assistant, pas un oracle. Vous restez responsable du résultat.

**Exercice :** demandez à un assistant IA de vous expliquer votre métier comme à un enfant de 10 ans,
puis comme à un expert. Comparez les deux réponses et notez ce qui est juste ou faux.
"""),
            ("Comment fonctionne un grand modèle de langage", True, """
Un **grand modèle de langage** (LLM) prédit la suite la plus probable d'un texte, morceau par morceau.
Ces morceaux s'appellent des *tokens* : un mot courant, une partie de mot ou un signe de ponctuation.

## Les trois idées clés

1. **L'entraînement** : le modèle lit des milliards de phrases et apprend à prédire le token suivant.
2. **L'ajustement** : on lui apprend ensuite à suivre des instructions et à être utile.
3. **Le contexte** : à chaque échange, le modèle ne « voit » que la conversation en cours. Plus vos
   consignes sont claires et complètes, meilleure est la réponse.

## Pourquoi c'est important pour vous

Comprendre ce mécanisme explique la plupart des bonnes pratiques : donner du contexte, des exemples,
un format attendu, et découper les tâches complexes en étapes.

**Exercice :** posez la même question deux fois, une fois en une ligne et une fois avec trois phrases
de contexte. Observez la différence.
"""),
            ("Choisir le bon outil IA pour chaque tâche", False, """
Il existe des centaines d'outils IA. Inutile de tous les connaître : partez de vos **tâches**.

## Une méthode simple

1. Listez les tâches qui vous prennent le plus de temps chaque semaine.
2. Classez-les : écriture, analyse, création visuelle, organisation, code.
3. Pour chaque famille, testez **un** outil pendant une semaine avant d'en changer.

## Les grandes familles

- **Assistants conversationnels** : rédaction, analyse, brainstorming, code.
- **Génération d'images** : visuels pour réseaux sociaux, illustrations, maquettes.
- **Voix et vidéo** : voix off, sous-titres, montage assisté.
- **Automatisation** : relier vos applications entre elles pour supprimer les tâches répétitives.

## Les bons critères

- Confidentialité : où vont vos données ? Évitez d'y mettre des informations sensibles.
- Coût réel : abonnement, crédits, limites d'usage.
- Qualité en **français** pour vos usages.

**Exercice :** remplissez un tableau « tâche / outil testé / temps gagné » pendant 7 jours et
partagez vos résultats dans la communauté.
"""),
        ],
    },
    {
        "title": "L'art du prompt",
        "level": "Intermédiaire",
        "description": "Écrire des consignes claires et réutilisables pour obtenir des résultats fiables, du premier coup.",
        "lessons": [
            ("Anatomie d'un bon prompt", True, """
Un bon prompt ressemble à un brief donné à un collègue brillant qui ne connaît rien de votre projet.

## Les 5 ingrédients

1. **Le rôle et le contexte** : qui êtes-vous, pour qui est le résultat ?
2. **La tâche** : un verbe d'action précis (rédige, analyse, compare, résume).
3. **Les contraintes** : longueur, ton, ce qu'il faut éviter.
4. **Le format** : liste, tableau, e-mail, plan en 3 parties…
5. **Un exemple** du résultat attendu, si vous en avez un.

## Avant / après

Avant : `Écris un post LinkedIn sur l'IA.`

Après : `Je suis consultante RH et j'accompagne des PME. Rédige un post LinkedIn de 150 mots
qui explique comment l'IA peut faire gagner 2 heures par semaine sur le tri des candidatures.
Ton chaleureux et concret, une seule question à la fin pour lancer la discussion, pas d'emojis.`

**Exercice :** reprenez votre dernier prompt et réécrivez-le avec les 5 ingrédients.
"""),
            ("Techniques avancées : exemples, rôles et étapes", False, """
## Donner des exemples

Montrer 2 ou 3 exemples du résultat attendu est souvent plus efficace qu'une longue explication.
Variez-les pour que l'IA comprenne le principe sans recopier un modèle unique.

## Demander de raisonner par étapes

Pour une analyse ou un calcul, demandez : *« Réfléchis étape par étape avant de donner ta réponse
finale. »* Vous obtenez un raisonnement que vous pouvez vérifier.

## Découper les tâches

Plutôt qu'un prompt géant, enchaînez :

1. « Propose 10 idées d'articles pour mon audience. »
2. « Développe le plan de l'idée n°3. »
3. « Rédige l'introduction en suivant ce plan. »

## Faire critiquer le résultat

Demandez ensuite : *« Relis ta réponse comme un expert exigeant : quelles sont ses 3 faiblesses ?
Corrige-les. »*

**Exercice :** appliquez la méthode « découper + critiquer » à un document que vous devez produire
cette semaine.
"""),
            ("Construire sa bibliothèque de prompts", False, """
Les meilleurs utilisateurs de l'IA ne réinventent pas leurs prompts : ils les **réutilisent**.

## Le format modèle

Écrivez vos prompts avec des zones à remplir :

```
Rôle : tu es un expert en [DOMAINE].
Contexte : [SITUATION EN 2 PHRASES].
Tâche : [VERBE] un [LIVRABLE] pour [PUBLIC].
Contraintes : [LONGUEUR], ton [TON], éviter [À ÉVITER].
Format : [FORMAT].
```

## Organiser sa bibliothèque

- Un document par usage : contenu, e-mails, analyse, apprentissage.
- Un titre clair et une date pour chaque prompt.
- Notez ce qui a bien fonctionné et pourquoi.

## Partager pour progresser

Publiez vos meilleurs prompts dans la catégorie **Projets & réussites** : les retours des autres
membres sont le moyen le plus rapide de progresser.

**Exercice :** créez vos 5 premiers modèles de prompts pour vos tâches les plus fréquentes.
"""),
        ],
    },
    {
        "title": "Business & IA : automatiser et monétiser",
        "level": "Avancé",
        "description": "Gagner du temps avec l'automatisation, créer du contenu efficacement et développer un revenu complémentaire.",
        "lessons": [
            ("Automatiser ses tâches répétitives", False, """
L'automatisation consiste à relier vos outils pour que les tâches se fassent **sans vous**.

## Repérer les bons candidats

Une tâche est à automatiser si elle est :

- **répétitive** (chaque jour ou chaque semaine),
- **basée sur des règles** (si ceci, alors cela),
- **peu risquée** en cas d'erreur.

## Exemples concrets

- Un formulaire est rempli → l'IA résume la demande → un e-mail personnalisé part automatiquement.
- Une facture arrive par e-mail → elle est classée et ses montants ajoutés à un tableau.
- Un article est publié → l'IA prépare trois posts pour vos réseaux sociaux.

## La méthode

1. Décrivez le processus actuel étape par étape.
2. Identifiez le déclencheur et le résultat attendu.
3. Construisez l'automatisation avec un outil no-code et testez-la sur 10 cas réels.
4. Gardez une validation humaine sur les étapes sensibles.

**Exercice :** identifiez une tâche de plus de 30 minutes par semaine et dessinez son automatisation.
"""),
            ("Créer du contenu avec l'IA sans perdre son authenticité", False, """
L'IA accélère la création, mais votre audience vient pour **votre** regard.

## Le bon partage des rôles

- **Vous** : l'expérience, les opinions, les anecdotes, la décision finale.
- **L'IA** : la structure, les variantes, la reformulation, la déclinaison sur plusieurs formats.

## Un processus en 4 étapes

1. Enregistrez une note vocale de 5 minutes sur une idée ou une expérience.
2. Demandez à l'IA d'en tirer un plan et 3 angles possibles.
3. Rédigez (ou faites rédiger) un premier jet, puis réécrivez avec vos mots.
4. Déclinez : article → posts → newsletter → script vidéo.

## Garder votre voix

Donnez à l'IA 3 textes que vous avez écrits et demandez-lui de décrire votre style. Réutilisez
cette description dans vos prompts.

**Exercice :** transformez une de vos expériences récentes en un post et une newsletter avec ce processus.
"""),
            ("Lancer un revenu complémentaire avec l'affiliation", False, """
L'**affiliation** consiste à recommander un produit et à toucher une commission sur les ventes générées.
Chez Starling, chaque membre a son propre lien de parrainage dans l'onglet **Affiliation**.

## Pourquoi c'est un bon modèle

- Pas de produit à créer ni de service client à gérer.
- Des commissions **récurrentes** sur les abonnements : vos revenus s'additionnent mois après mois.
- Vous pouvez commencer avec une petite audience.

## Les 4 règles d'une affiliation qui marche

1. **Recommandez ce que vous utilisez vraiment** et dites ce que vous en avez retiré.
2. **Soyez transparent** : indiquez qu'il s'agit d'un lien affilié.
3. **Apportez de la valeur d'abord** : un conseil, un tutoriel, un retour d'expérience.
4. **Mesurez** : suivez visites, inscriptions et paiements dans votre tableau de bord.

## Plan d'action sur 30 jours

- Semaine 1 : partagez 3 apprentissages tirés des formations.
- Semaine 2 : publiez un tutoriel complet sur un usage de l'IA.
- Semaine 3 : racontez un résultat concret obtenu grâce à l'IA.
- Semaine 4 : faites le bilan de vos statistiques et doublez ce qui fonctionne.
"""),
        ],
    },
]

WELCOME = """Bienvenue dans **Starling**, la communauté francophone pour apprendre l'IA ensemble.

Pour bien démarrer :

1. Présentez-vous en commentaire : qui êtes-vous, que voulez-vous accomplir avec l'IA ?
2. Commencez la formation **Les fondamentaux de l'IA générative** (les premières leçons sont gratuites).
3. Partagez vos découvertes dans **Veille IA** et vos questions dans **Questions**.

Et n'oubliez pas : votre lien de parrainage vous attend dans l'onglet **Affiliation**."""


def seed(starling):
    """Ajoute le contenu de départ si la base ne contient aucune formation."""
    if starling.list_courses():
        return False
    for course in COURSES:
        course_id = starling.add_course(course["title"], course["description"], course["level"])
        for title, is_free, content in course["lessons"]:
            starling.add_lesson(course_id, title, content.strip(), is_free=is_free)
    team = starling.register("Équipe Starling", "equipe@starling.invalid", secrets.token_urlsafe(24))
    starling.create_post(team["id"], "discussions", "Bienvenue dans Starling ! Commencez ici 👋",
                         WELCOME, pinned=True)
    starling.create_post(team["id"], "questions", "Quelle tâche aimeriez-vous confier à l'IA ?",
                         "Dites-nous en commentaire la tâche qui vous prend le plus de temps chaque "
                         "semaine : nous en ferons des tutoriels.")
    for name, url in DEFAULT_FEEDS:
        starling.add_feed(name, url)
    return True
