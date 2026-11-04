#!/usr/bin/env python3
"""Montage du spot « Les matchs de la Coupe de l'Évangile » (Yabassi).

Style de textes inspiré de la vidéo de référence : gros mots en capitales (Montserrat ExtraBold),
lettres qui apparaissent dans le désordre devant un « fantôme » flou du mot qui se resserre,
cercle fin animé, blocs chiffre + libellé, petit logo en haut à gauche, flashs blancs.

Usage :
    python3 render.py --fonts DOSSIER_POLICES --out spot.mp4 [--jobs 4] [--draft]
    python3 render.py --fonts DOSSIER_POLICES --cues cues.json   # exporte les repères d'effets sonores
"""
import argparse
import glob
import json
import os
import random
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "images")
W, H, FPS = 1920, 1080, 30
TOTAL = 74.5

WHITE = (255, 255, 255)
ORANGE = (246, 140, 40)
GREY = (215, 215, 215)


# ---------------------------------------------------------------- utilitaires
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in_out(t):
    t = clamp(t)
    return 3 * t * t - 2 * t * t * t


def lerp(a, b, t):
    return a + (b - a) * t


FONT_FILES = {}
FONTS = {}


def font(name, size):
    key = (name, size)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(FONT_FILES[name], size)
    return FONTS[key]


GLYPHS = {}


def glyph(ch, fname, size, color, shadow=True):
    """Une lettre sur calque RGBA, avec ombre douce pour la lisibilité."""
    key = (ch, fname, size, color, shadow)
    if key in GLYPHS:
        return GLYPHS[key]
    f = font(fname, size)
    asc, desc = f.getmetrics()
    w = max(1, int(f.getlength(ch))) + 4
    pad = 14
    im = Image.new("RGBA", (w + pad * 2, asc + desc + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad, pad), ch, font=f, fill=color + (255,))
    if shadow:
        a = im.split()[3].filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.55))
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        sh.putalpha(a)
        im = Image.alpha_composite(sh, im)
    GLYPHS[key] = (im, pad)
    return GLYPHS[key]


def text_width(txt, fname, size, tracking=0):
    return font(fname, size).getlength(txt) + tracking * max(0, len(txt) - 1)


def letter_positions(txt, fname, size, tracking=0):
    f = font(fname, size)
    return [f.getlength(txt[:i]) + tracking * i for i in range(len(txt))]


def paste_alpha(base, layer, x, y, alpha=1.0):
    if alpha <= 0.003:
        return
    if alpha < 0.999:
        layer = layer.copy()
        layer.putalpha(layer.split()[3].point(lambda v: int(v * alpha)))
    base.alpha_composite(layer, (int(round(x)), int(round(y))))


WHOLE = {}


def whole_text(txt, fname, size, color, tracking=0):
    key = (txt, fname, size, color, tracking)
    if key not in WHOLE:
        tw = int(text_width(txt, fname, size, tracking)) + 8
        f = font(fname, size)
        asc, desc = f.getmetrics()
        im = Image.new("RGBA", (tw, asc + desc + 8), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for ch, x in zip(txt, letter_positions(txt, fname, size, tracking)):
            d.text((x + 4, 4), ch, font=f, fill=color + (255,))
        WHOLE[key] = im
    return WHOLE[key]


# ---------------------------------------------------------------- animation des mots
def scramble(L, txt, x, y, lt, dur, size=130, fname="m800", color=WHITE, tracking=2, delay=0.0,
             ghost=True, spread=0.4, exit_=True):
    """Lettres qui apparaissent dans le désordre + fantôme flou qui se resserre.
    (x, y) = coin haut-gauche de la ligne. Renvoie la largeur du texte."""
    t = lt - delay
    tw = text_width(txt, fname, size, tracking)
    if t <= 0:
        return tw
    rnd = random.Random(txt + str(size))
    order = [rnd.uniform(0, spread) for _ in txt]
    outs = [rnd.uniform(0, 0.22) for _ in txt]
    if ghost and t < 0.7:
        p = ease_out(t / 0.7)
        g = whole_text(txt, fname, size, color, tracking)
        s = lerp(1.65, 1.0, p)
        gw, gh = int(g.width * s), int(g.height * s)
        gi = g.resize((gw, gh), Image.BILINEAR).filter(ImageFilter.GaussianBlur(lerp(10, 2, p)))
        cx, cy = x + g.width / 2, y + g.height / 2
        paste_alpha(L, gi, cx - gw / 2, cy - gh / 2, alpha=0.38 * (1 - p))
    xs = letter_positions(txt, fname, size, tracking)
    for ch, lx, o, out in zip(txt, xs, order, outs):
        if ch == " ":
            continue
        a = clamp((t - o) / 0.09)
        if exit_ and dur:
            a *= 1 - clamp((lt - (dur - 0.28 + out * 0.8)) / 0.06)
        if a <= 0:
            continue
        im, pad = glyph(ch, fname, size, color)
        paste_alpha(L, im, x + lx - pad + 4, y - pad + 4, alpha=a)
    return tw


def ring(L, cx, cy, r, lt, dur, delay=0.0, alpha=0.55):
    t = lt - delay
    if t <= 0:
        return
    p = ease_out(t / 0.8)
    out = 1 - ease_in_out((lt - (dur - 0.3)) / 0.3)
    a = alpha * p * out
    if a <= 0:
        return
    sweep = 300 * p
    start = -90 + t * 25
    ImageDraw.Draw(L).arc((cx - r, cy - r, cx + r, cy + r), start, start + sweep,
                          fill=WHITE + (int(255 * a),), width=2)


def small(L, txt, x, y, lt, dur, size=30, fname="m500", color=WHITE, delay=0.25, tracking=0, align="left"):
    if lt - delay <= 0:
        return
    if align == "center":
        x = x - text_width(txt, fname, size, tracking) / 2
    scramble(L, txt, x, y, lt, dur, size, fname, color, tracking, delay, ghost=False, spread=0.3)


# ---------------------------------------------------------------- mises en page (style référence)
def T_word(main, sup=None, sub=None, size=140, ring_on=False, line2=None, line2_color=ORANGE, y=None):
    """Mot central : petite ligne au-dessus (sup), gros mot, petite ligne en dessous (sub)."""
    def f(L, lt, dur):
        tw = text_width(main, "m800", size, 2)
        x = W / 2 - tw / 2
        yy = y if y is not None else H / 2 - size * 0.62
        if ring_on:
            ring(L, W / 2, yy + size * 0.62, size * 1.35, lt, dur)
        if sup:
            small(L, sup, x + 6, yy - 34, lt, dur, size=30, fname="m500", color=GREY, delay=0.15)
        scramble(L, main, x, yy, lt, dur, size)
        ny = yy + size * 1.18
        if line2:
            s2 = int(size * 0.62)
            tw2 = text_width(line2, "m800", s2, 2)
            scramble(L, line2, W / 2 - tw2 / 2, ny, lt, dur, s2, color=line2_color, delay=0.2)
            ny += size * 0.8
        if sub:
            small(L, sub, x + 6, ny + 4, lt, dur, size=26, fname="m600", color=WHITE, delay=0.35, tracking=3)
    return f


def T_corner(num, l1, l2, label=None):
    """Bloc bas-gauche : gros chiffre + deux lignes (ex. « 18 | Vendredi / DÉCEMBRE »)."""
    def f(L, lt, dur):
        x0, y0 = 110, 740
        nw = scramble(L, num, x0, y0, lt, dur, 190, ghost=True)
        xl = x0 + nw + 30
        small(L, l1, xl, y0 + 40, lt, dur, size=34, fname="m500", color=GREY, delay=0.2)
        scramble(L, l2, xl, y0 + 82, lt, dur, 64, delay=0.3, ghost=False)
        if label:
            p = ease_out((lt - 0.5) / 0.6) * (1 - ease_in_out((lt - (dur - 0.3)) / 0.3))
            if p > 0:
                d = ImageDraw.Draw(L)
                lw = 620 * p
                d.line((x0, y0 + 232, x0 + lw, y0 + 232), fill=(255, 255, 255, int(150 * p)), width=2)
                d.line((x0, y0 + 232, x0 + min(lw, 70), y0 + 232), fill=ORANGE + (int(255 * p),), width=4)
            small(L, label, x0, y0 + 246, lt, dur, size=20, fname="m600", color=WHITE, delay=0.6, tracking=6)
    return f


def T_end(L, lt, dur):
    # calé sur la voix : « La Coupe de l'Évangile » (0 s), « chaque samedi » (1,8 s), stade (4,5 s), gloire (7,4 s)
    t1 = "LA COUPE DE L'ÉVANGILE"
    tw = text_width(t1, "m800", 110, 2)
    scramble(L, t1, W / 2 - tw / 2, 230, lt, None, 110, delay=0.05, exit_=False)
    t2 = "CHAQUE SAMEDI DÈS LE 5 DÉCEMBRE"
    tw = text_width(t2, "m800", 64, 2)
    scramble(L, t2, W / 2 - tw / 2, 375, lt, None, 64, color=ORANGE, delay=1.65, exit_=False)
    small(L, "Match 1 : 14h – 16h   ·   Match 2 : 16h – 18h", W / 2, 470, lt, None, size=34, fname="m600",
          color=WHITE, delay=2.4, align="center")
    p = ease_out((lt - 4.3) / 0.8)
    if p > 0:
        d = ImageDraw.Draw(L)
        d.line((W / 2 - 420 * p, 545, W / 2 + 420 * p, 545), fill=(255, 255, 255, int(120 * p)), width=2)
        d.line((W / 2 - 40 * p, 544, W / 2 + 40 * p, 544), fill=ORANGE + (255,), width=4)
    d1 = "STADE DU LYCÉE BILINGUE DE YABASSI"
    tw = text_width(d1, "m800", 54, 2)
    scramble(L, d1, W / 2 - tw / 2, 575, lt, None, 54, delay=4.36, ghost=False, exit_=False)
    small(L, "Grande finale : samedi 19 décembre 2026", W / 2, 665, lt, None, size=36, fname="m600", color=GREY,
          delay=5.3, align="center")
    t3 = "TOUT POUR LA GLOIRE DE JÉSUS"
    tw = text_width(t3, "m800", 50, 6)
    scramble(L, t3, W / 2 - tw / 2, 820, lt, None, 50, color=ORANGE, tracking=6, delay=7.24, exit_=False)


def watermark(L, T):
    """Petit logo en haut à gauche."""
    a = clamp((T - 4.5) / 0.5) * (1 - clamp((T - 62.1) / 0.5))
    if a <= 0:
        return
    ImageDraw.Draw(L).ellipse((58, 58, 68, 68), fill=ORANGE + (int(255 * a),))
    paste_alpha(L, whole_text("COUPE DE L'ÉVANGILE", "m800", 22, WHITE, 4), 78, 49, a * 0.9)
    paste_alpha(L, whole_text("Yabassi · Les matchs · Chaque samedi", "m500", 17, GREY, 1), 78, 80, a * 0.75)


# ---------------------------------------------------------------- images
SRC = {}


def src(name):
    if name not in SRC:
        p = glob.glob(os.path.join(IMG, name + "*.jpg"))[0]
        im = Image.open(p).convert("RGB")
        scale = max(2400 / im.width, 1350 / im.height)
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        SRC[name] = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    return SRC[name]


def frame_from(name, t, z0=1.0, z1=1.12, fx=0.5, fy=0.5, dx=0.0, dy=0.0):
    if name is None:
        return Image.new("RGB", (W, H), (6, 6, 8))
    im = src(name)
    iw, ih = im.size
    z = lerp(z0, z1, ease_in_out(t) * 0.5 + t * 0.5)
    cw = min(iw, ih * W / H) / z
    ch = cw * H / W
    cx = clamp(fx + dx * t, 0, 1) * iw
    cy = clamp(fy + dy * t, 0, 1) * ih
    x0 = clamp(cx - cw / 2, 0, iw - cw)
    y0 = clamp(cy - ch / 2, 0, ih - ch)
    return im.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))


LUTS = {}


def grade(im, sat=0.85, bright=0.85, warm=0.0, bw=False):
    if bw:
        im = ImageEnhance.Color(im).enhance(0.0)
    elif sat != 1.0:
        im = ImageEnhance.Color(im).enhance(sat)
    key = (bright, warm)
    if key not in LUTS:
        x = np.arange(256) / 255
        c = 255 * (0.5 + 0.5 * np.tanh((x - 0.5) * 2.0) / np.tanh(1.0))
        gains = (1 + 0.06 * warm, 1 + 0.02 * warm, 1 - 0.06 * warm)
        LUTS[key] = sum([list(np.clip(c * g * bright, 0, 255).astype(int)) for g in gains], [])
    return im.point(LUTS[key])


rng = np.random.default_rng(7)
GRAIN = [rng.normal(0, 3.5, (H, W, 1)).astype(np.float32) for _ in range(4)]
_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIGNETTE = (1 - 0.6 * np.clip((((_xx - W / 2) / (W * 0.6)) ** 2 + ((_yy - H / 2) / (H * 0.6)) ** 2), 0, 1) ** 1.4)[..., None]
del _yy, _xx
BANDS = {}


def band(yc, strength):
    key = (yc, strength)
    if key not in BANDS:
        y = np.arange(H, dtype=np.float32)
        BANDS[key] = (1 - strength * np.exp(-((y - yc) / 300) ** 2))[:, None, None]
    return BANDS[key]


# ---------------------------------------------------------------- timeline
SHOTS = []
CUES = []


def shot(t0, t1, imgs, text=None, gr=None, flash=False, scrim=(540, 0.35), sfx="whoosh"):
    """imgs : liste de (image, réglages) ; l'image change à intervalles réguliers (coupes rapides)."""
    if isinstance(imgs, tuple):
        imgs = [imgs]
    SHOTS.append(dict(t0=t0, t1=t1, imgs=imgs, text=text, gr=gr or {}, flash=flash, scrim=scrim))
    if flash:
        CUES.append(dict(t=t0, type="impact", gain=-3))
    if text and sfx:
        CUES.append(dict(t=max(0, t0 - 0.12), type=sfx, gain=-5))
        CUES.append(dict(t=t0 + 0.05, type="ticks", gain=-10))
    seg = (t1 - t0) / len(imgs)
    for k in range(1, len(imgs)):
        CUES.append(dict(t=t0 + seg * k - 0.05, type="swish", gain=-10))


def K(name, z0=1.0, z1=1.12, fx=0.5, fy=0.5, dx=0.0, dy=0.0):
    return (name, dict(z0=z0, z1=z1, fx=fx, fy=fy, dx=dx, dy=dy))


# Moments où la voix prononce chaque mot clé (secondes dans le fichier de voix, vérifiés par transcription
# et par détection des syllabes). La voix est décalée de +0,3 s au mixage : on ouvre chaque plan 0,2 s après le mot.
WORDS = dict(yabassi=0.31, ballon=1.27, coupe=4.34, date=6.89, stade=10.0, equipes=12.74, samedi=17.05,
             match1=19.93, match2=22.57, avant=25.49, meditation=27.96, dieu=29.90, jeu=32.39, passion=33.63,
             fairplay=35.02, joie=36.44, rdv=40.53, grande=41.53, date19=42.50, programme=45.87, jeux=49.39,
             manege=50.42, prix=52.88, supporters=55.59, venez=59.44, fin=62.39, gloire=69.83)


def w(name):
    return round(WORDS[name] + 0.2, 2)


def build_timeline():
    """Plans calés mot par mot sur la voix off des matchs (« Annonceur Croisade », 1 min 12)."""
    SHOTS.clear()
    CUES.clear()
    shot(0.0, w("ballon"), K("13", 1.0, 1.15, 0.45), T_word("YABASSI", size=190, ring_on=True), gr=dict(bright=0.8))
    shot(w("ballon"), w("coupe"), K("f1", 1.0, 1.15, 0.5, 0.55),
         T_word("POUR LA GLOIRE DE DIEU", sup="Le ballon va rouler", size=120), flash=True)
    shot(w("coupe"), w("date"), K("f4", 1.05, 1.2, 0.5, 0.5),
         T_word("LA COUPE DE L'ÉVANGILE", sub="EST LANCÉE !", size=120, ring_on=True), flash=True)
    shot(w("date"), w("stade"), K("f2", 1.0, 1.12, 0.5, 0.35),
         T_corner("05", "À partir du samedi", "DÉCEMBRE", "CHAQUE SAMEDI · 2026"), scrim=(880, 0.55))
    shot(w("stade"), w("equipes"), K("f3", 1.0, 1.15, 0.5, 0.5),
         T_word("STADE DU LYCÉE BILINGUE", sub="DE YABASSI", size=110), gr=dict(bright=0.7))
    shot(w("equipes"), w("samedi"), [K("f1", 1.4, 1.6, 0.5, 0.6), K("f2", 1.6, 1.8, 0.55, 0.3)],
         T_word("LES MEILLEURES ÉQUIPES", sub="S'AFFRONTENT", size=120))
    shot(w("samedi"), w("match1"), (None, {}), T_word("2 MATCHS", sup="Chaque samedi", size=170, ring_on=True), sfx=None)
    CUES.append(dict(t=w("samedi"), type="boom", gain=-6))
    shot(w("match1"), w("match2"), K("f4", 1.0, 1.15, 0.45, 0.5), T_corner("14H", "Match 1", "JUSQU'À 16H", "PREMIER MATCH"),
         flash=True, scrim=(880, 0.55))
    shot(w("match2"), w("avant"), K("f1", 1.2, 1.35, 0.4, 0.6), T_corner("16H", "Match 2", "JUSQU'À 18H", "DEUXIÈME MATCH"),
         flash=True, scrim=(880, 0.55))
    shot(w("avant"), w("meditation"), K("f3", 1.1, 1.2, 0.5, 0.55), T_word("AVANT CHAQUE MATCH", size=120),
         gr=dict(bright=0.7))
    shot(w("meditation"), w("dieu"), K("08", 1.1, 1.25, 0.55, 0.55), T_word("MÉDITATION & PRIÈRE", size=120),
         gr=dict(sat=0.6, bright=0.8))
    shot(w("dieu"), w("jeu"), K("f2", 1.0, 1.1, 0.5, 0.5), T_word("DIEU AU CENTRE", sub="DU TERRAIN", size=150))
    CUES.append(dict(t=w("jeu"), type="riser", dur=2.0, gain=-12, end_at=True))
    shot(w("jeu"), w("passion"), K("f1", 1.5, 1.7, 0.45, 0.55), T_word("JEU", size=230), flash=True)
    shot(w("passion"), w("fairplay"), K("f4", 1.3, 1.45, 0.6, 0.5), T_word("PASSION", size=210), flash=True)
    shot(w("fairplay"), w("joie"), K("f2", 1.4, 1.6, 0.5, 0.3), T_word("FAIR-PLAY", size=200), flash=True)
    shot(w("joie"), w("rdv"), [K("06", 1.05, 1.18, 0.5, 0.45), K("11", 1.1, 1.2, 0.5, 0.35)],
         T_word("LA JOIE DE L'ÉVANGILE", sup="Et surtout…", size=120), flash=True)
    shot(w("rdv"), w("date19"), (None, {}), T_word("GRANDE FINALE", sup="Rendez-vous pour la", size=150, ring_on=True),
         sfx=None)
    CUES.append(dict(t=w("grande"), type="riser", dur=2.0, gain=-11, end_at=True))
    CUES.append(dict(t=w("grande"), type="boom", gain=-4))
    shot(w("date19"), w("programme"), K("f1", 1.0, 1.12, 0.5, 0.5), T_corner("19", "Samedi", "DÉCEMBRE", "GRANDE FINALE · 2026"),
         flash=True, scrim=(880, 0.55))
    shot(w("programme"), w("jeux"), K("05", 1.6, 1.8, 0.22, 0.38), T_word("ENSEIGNEMENT", sup="Au programme", size=150),
         flash=True)
    shot(w("jeux"), w("manege"), K("f4", 1.1, 1.2, 0.5, 0.5), T_word("JEUX", size=210))
    shot(w("manege"), w("prix"), K("09", 1.1, 1.2, 0.5, 0.5), T_word("MANÈGE", sub="POUR LES ENFANTS", size=190))
    shot(w("prix"), w("supporters"), K("f1", 1.3, 1.4, 0.5, 0.5), T_word("REMISE DES PRIX", sub="AUX VAINQUEURS", size=140))
    shot(w("supporters"), w("venez"), K("f1", 1.6, 1.8, 0.5, 0.75),
         T_word("SUPPORTERS", sub="FAMILLES · JEUNES · ANCIENS", size=170), flash=True)
    shot(w("venez"), w("fin"), K("09", 1.0, 1.1, 0.5, 0.5),
         T_word("VENEZ NOMBREUX", sub="ENCOURAGER VOS ÉQUIPES", size=150), flash=True)
    CUES.append(dict(t=w("fin"), type="riser", dur=2.0, gain=-11, end_at=True))
    shot(w("fin"), TOTAL, K("f2", 1.05, 1.18, 0.5, 0.4), T_end, gr=dict(bright=0.35, sat=0.75), flash=True, scrim=None, sfx=None)
    CUES.append(dict(t=w("fin"), type="subdrop", gain=-4))
    CUES.append(dict(t=w("fin") + 1.85, type="whoosh", gain=-6))
    CUES.append(dict(t=w("fin") + 4.56, type="whoosh", gain=-7))
    CUES.append(dict(t=w("gloire"), type="shimmer", gain=2))


# ---------------------------------------------------------------- rendu
def render(out, draft=False, start=0.0, end=None):
    build_timeline()
    end = end or TOTAL
    scale = 0.5 if draft else 1.0
    ow, oh = int(W * scale), int(H * scale)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-vf", f"scale={ow}:{oh}:flags=lanczos", "-c:v", "libx264",
           "-preset", "veryfast" if draft else "medium", "-crf", "26" if draft else "20",
           "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    XF = 0.22
    for n in range(int(start * FPS), int(end * FPS)):
        T = n / FPS
        i = next(k for k, s in enumerate(SHOTS) if s["t0"] <= T < s["t1"] or k == len(SHOTS) - 1)
        s = SHOTS[i]

        def base_for(sh, Tt):
            dur = sh["t1"] - sh["t0"]
            lt = Tt - sh["t0"]
            seg = dur / len(sh["imgs"])
            k = min(len(sh["imgs"]) - 1, int(lt / seg))
            name, kb = sh["imgs"][k]
            img = frame_from(name, clamp((lt - k * seg) / seg), **kb)
            return np.asarray(grade(img, **sh["gr"]), dtype=np.float32), lt, dur, k, seg

        a, lt, dur, k, seg = base_for(s, T)
        if i > 0 and lt < XF and not s["flash"]:
            pa = base_for(SHOTS[i - 1], T)[0]
            e = ease_in_out(lt / XF)
            a = pa * (1 - e) + a * e
        a = a * VIGNETTE
        if s["text"] and s["scrim"]:
            a = a * band(*s["scrim"])
        if s["flash"] and lt < 0.3:
            fl = (1 - lt / 0.3) ** 2
            a = a * (1 - fl) + fl * 255
        elif k > 0 and (lt - k * seg) < 0.06:  # micro-flash sur les coupes internes
            a = a * 0.8 + 50
        a += GRAIN[n % len(GRAIN)]
        frame = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        if s["text"]:
            s["text"](L, lt, dur)
        watermark(L, T)
        frame.alpha_composite(L)
        if T > TOTAL - 1.0:
            frame = Image.blend(frame, Image.new("RGBA", (W, H), (0, 0, 0, 255)), clamp((T - (TOTAL - 1.0)) / 1.0))
        proc.stdin.write(frame.convert("RGB").tobytes())
    proc.stdin.close()
    proc.wait()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--out", default="spot.mp4")
    ap.add_argument("--draft", action="store_true")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float)
    ap.add_argument("--jobs", type=int, default=1)
    ap.add_argument("--cues")
    args = ap.parse_args()

    def ff(pattern):
        return glob.glob(os.path.join(args.fonts, "**", pattern), recursive=True)[0]

    FONT_FILES.update({
        "m800": ff("montserrat-latin-800-normal.woff"),
        "m600": ff("montserrat-latin-600-normal.woff"),
        "m500": ff("montserrat-latin-500-normal.woff"),
    })
    if args.cues:
        build_timeline()
        json.dump(CUES, open(args.cues, "w"), indent=1)
    elif args.jobs > 1:
        import sys
        end = args.end or TOTAL
        edges = [round((args.start + (end - args.start) * k / args.jobs) * FPS) / FPS for k in range(args.jobs + 1)]
        parts = [f"{args.out}.part{k}.mp4" for k in range(args.jobs)]
        base = [sys.executable, os.path.abspath(__file__), "--fonts", args.fonts] + (["--draft"] if args.draft else [])
        procs = [subprocess.Popen(base + ["--out", parts[k], "--start", str(edges[k]), "--end", str(edges[k + 1])])
                 for k in range(args.jobs)]
        assert all(p.wait() == 0 for p in procs)
        lst = args.out + ".txt"
        with open(lst, "w") as fh:
            fh.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
        subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                               "-c", "copy", "-movflags", "+faststart", args.out])
        for p in parts + [lst]:
            os.remove(p)
    else:
        render(args.out, args.draft, args.start, args.end)
