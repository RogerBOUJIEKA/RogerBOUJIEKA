# Shared timeline: VO clip cut points (take 1, John Mala) and placements on the spot (seconds).
import json

DUR = 96.5
FPS = 30
MUSIC_OFFSET = 3.81      # music drop (16.567 s) lands on "CABREL" (20.38)
CHOIR_SWITCH_T = 74.10   # (legacy)
DROP_T = 20.33           # downbeat of the praise drop, on "CABREL"
PRICE_T = [39.71, 41.83, 45.84]   # "mille", "trois", "cinq" -> brass stabs
# animated signature (Boujieka Agency): dove arrives, letters dance, dove leaves and comes back
SIG = {'in': 88.0, 'arrive0': 88.3, 'land1': 89.8, 'letters0': 89.95, 'lstep': .09,
       'agency0': 90.6, 'astep': .06, 'shine': 91.2, 'take': 91.9, 'flyover0': 93.42, 'flystep': .083,
       'land2': 94.4, 'out0': 95.6}

# (id, src_start, src_end, place_T, text)
VO = [
    ("c01", 0.00, 3.97, 0.55, "Mesdames et messieurs... chers amis de Dschang et d'ailleurs !"),
    ("c02", 3.97, 8.01, 4.75, "Dans la vie, il y a ceux qui naissent avec une cuillère en or dans la bouche..."),
    ("c03", 8.01, 10.76, 9.00, "... et ceux qui naissent avec une machette dans la main !"),
    ("c04", 10.76, 12.88, 12.85, "Père riche... ou père pauvre ?"),
    ("c05", 12.88, 17.87, 15.10, "L'Alliance Franco-Camerounaise de Dschang vous présente... le phénomène de l'humour gospel..."),
    ("c06", 17.87, 19.32, 20.25, "CABREL TINDO !"),
    ("c07", 19.32, 22.10, 22.25, "En spectacle : Père riche, Père pauvre !"),
    ("c08", 22.10, 25.86, 25.45, "Une soirée pour rire aux éclats... et célébrer la vie dans la joie !"),
    ("c09", 25.86, 31.81, 29.95, "Rendez-vous le dimanche 25 octobre 2026, à 17 heures précises, salle Manu Dibango !"),
    ("c10", 31.81, 33.50, 36.65, "Les tickets sont disponibles !"),
    ("c11", 33.50, 35.18, 38.75, "Pass Classique : mille francs."),
    ("c12", 35.18, 36.97, 40.85, "Pass VIP : trois mille francs."),
    ("c13", 36.97, 40.62, 43.05, "Et pour les grands patrons... le Pass VVIP : cinq mille francs !"),
    ("c14", 40.62, 45.49, 47.45, "Réservations au : 652 43 67 99."),
    ("c15", 45.49, 49.96, 52.85, "Je répète : 652 43 67 99 !"),
    ("c16", 49.96, 54.25, 57.95, "Avec le soutien de l'Ambassade de France au Cameroun et de l'Institut Français du Cameroun."),
    ("c17", 54.25, 57.78, 62.75, "Alors, ne viens pas seul ! Viens en famille, viens avec tes amis !"),
    ("c18", 57.78, 64.29, 67.65, "Cabrel Tindo, en spectacle. Dimanche 25 octobre, salle Manu Dibango. Soyez-y... nombreux !"),
]

# Scene boundaries (T)
SCENES = {
    "intro":    (0.0, 4.75),
    "rich":     (4.75, 9.0),
    "poor":     (9.0, 12.75),
    "split":    (12.75, 15.0),
    "presents": (15.0, 20.25),
    "title":    (20.25, 25.35),
    "joy":      (25.35, 29.85),
    "date":     (29.85, 36.55),
    "tickets":  (36.55, 47.35),
    "phone":    (47.35, 57.85),
    "partners": (57.85, 62.65),
    "together": (62.65, 67.55),
    "final":    (67.55, 88.0),
    "agency":   (88.0, 96.5),
}

def vo_map(src_t):
    """map a source time of take 1 to spot time T"""
    for cid, s, e, p, _ in VO:
        if s <= src_t < e:
            return p + (src_t - s)
    return None

def word_times(words_json):
    w = [x for x in json.load(open(words_json))['words'] if x['type'] == 'word']
    out = []
    for x in w:
        t = x['text']
        if t.startswith('[') or t.endswith(']'):
            continue
        T = vo_map(x['start'])
        if T is not None:
            out.append((round(T, 3), round(vo_map(x['end']) or T, 3), t))
    return out
