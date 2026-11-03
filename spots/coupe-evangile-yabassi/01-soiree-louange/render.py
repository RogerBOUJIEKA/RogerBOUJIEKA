#!/usr/bin/env python3
"""Montage du spot « Soirée de louange et de guérison » (Coupe de l'Évangile, Yabassi).

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
TOTAL = 88.0

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
    # calé sur la voix : « La Coupe de l'Évangile » (0 s), « Soirée… » (1,9 s), date (4,4 s), gloire (10,9 s)
    small(L, "La Coupe de l'Évangile", W / 2, 250, lt, None, size=38, fname="m500", color=GREY, delay=0.1,
          align="center")
    t1 = "SOIRÉE DE LOUANGE"
    tw = text_width(t1, "m800", 120, 2)
    scramble(L, t1, W / 2 - tw / 2, 310, lt, None, 120, delay=1.9, exit_=False)
    t2 = "& DE GUÉRISON"
    tw = text_width(t2, "m800", 84, 2)
    scramble(L, t2, W / 2 - tw / 2, 455, lt, None, 84, color=ORANGE, delay=2.2, exit_=False)
    small(L, "« La Parole de Dieu : une source de vie et de guérison »", W / 2, 580, lt, None, size=30,
          fname="m500", color=GREY, delay=2.9, align="center")
    p = ease_out((lt - 4.2) / 0.8)
    if p > 0:
        d = ImageDraw.Draw(L)
        d.line((W / 2 - 420 * p, 645, W / 2 + 420 * p, 645), fill=(255, 255, 255, int(120 * p)), width=2)
        d.line((W / 2 - 40 * p, 644, W / 2 + 40 * p, 644), fill=ORANGE + (255,), width=4)
    d1 = "VENDREDI 18 DÉCEMBRE 2026  ·  DÈS 18H30"
    tw = text_width(d1, "m800", 50, 2)
    scramble(L, d1, W / 2 - tw / 2, 670, lt, None, 50, delay=4.4, ghost=False, exit_=False)
    small(L, "Préau du Lycée bilingue de Yabassi", W / 2, 745, lt, None, size=34, fname="m600", color=WHITE,
          delay=5.6, align="center")
    t3 = "TOUT POUR LA GLOIRE DE JÉSUS"
    tw = text_width(t3, "m800", 46, 6)
    scramble(L, t3, W / 2 - tw / 2, 860, lt, None, 46, color=ORANGE, tracking=6, delay=11.2, exit_=False)


def watermark(L, T):
    """Petit logo en haut à gauche."""
    a = clamp((T - 3.6) / 0.5) * (1 - clamp((T - 71.6) / 0.5))
    if a <= 0:
        return
    ImageDraw.Draw(L).ellipse((58, 58, 68, 68), fill=ORANGE + (int(255 * a),))
    paste_alpha(L, whole_text("COUPE DE L'ÉVANGILE", "m800", 22, WHITE, 4), 78, 49, a * 0.9)
    paste_alpha(L, whole_text("Yabassi · Soirée de louange & de guérison", "m500", 17, GREY, 1), 78, 80, a * 0.75)


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


# Recalage sur la voix « Voix Louange Femme » : temps de l'ancienne voix -> temps de la nouvelle
KNOTS = [(0, 0), (1.9, 1.9), (3.6, 3.6), (7.0, 7.0), (10.2, 9.8), (15.2, 15.3), (17.0, 17.3), (18.8, 19.4),
         (20.8, 21.6), (23.6, 24.4), (26.4, 27.3), (30.0, 30.6), (31.3, 31.9), (34.0, 34.6), (35.8, 36.5),
         (38.5, 39.2), (42.0, 42.7), (45.8, 46.4), (49.6, 50.0), (53.1, 53.3), (55.9, 56.6), (58.6, 59.6),
         (61.9, 63.1), (65.6, 66.6), (69.5, 70.5), (71.2, 72.1), (73.2, 74.1), (75.6, 76.5), (82.0, 83.1),
         (87.0, 88.0)]


def R(t):
    for (a0, b0), (a1, b1) in zip(KNOTS, KNOTS[1:]):
        if t <= a1:
            return round(b0 + (t - a0) * (b1 - b0) / (a1 - a0), 3)
    return t + (KNOTS[-1][1] - KNOTS[-1][0])


def K(name, z0=1.0, z1=1.12, fx=0.5, fy=0.5, dx=0.0, dy=0.0):
    return (name, dict(z0=z0, z1=z1, fx=fx, fy=fy, dx=dx, dy=dy))


def build_timeline():
    """Plans calés sur la voix off « Annonceur Croisade » (1 min 24)."""
    SHOTS.clear()
    CUES.clear()
    # A. Accroche — « Yabassi, Dieu a une parole pour toi. »
    shot(0.0, 1.9, K("13", 1.0, 1.15, 0.45), T_word("YABASSI", size=190, ring_on=True), gr=dict(bright=0.8))
    shot(1.9, 3.6, K("11", 1.05, 1.2, 0.5, 0.4), T_word("PAROLE", sup="Dieu a une", sub="POUR TOI", size=170),
         flash=True)
    # B. Titre et thème
    shot(3.6, 7.0, [K("05", 1.0, 1.12, 0.45, 0.45), K("09", 1.1, 1.2, 0.4)],
         T_word("LA COUPE DE L'ÉVANGILE", sup="Dans le cadre de", size=120))
    shot(7.0, 10.2, [K("03", 1.0, 1.1, 0.5, 0.4), K("04", 1.05, 1.15, 0.5, 0.4)],
         T_word("SOIRÉE DE LOUANGE", line2="& DE GUÉRISON", size=130), flash=True)
    shot(10.2, 15.2, [K("09", 1.1, 1.25, 0.45, dx=0.05), K("10", 1.05, 1.15, 0.45, 0.4), K("06", 1.1, 1.2)],
         T_word("LA PAROLE DE DIEU", sup="Thème", sub="UNE SOURCE DE VIE ET DE GUÉRISON", size=130))
    # C. Émotion
    shot(15.2, 17.0, K("07", 1.05, 1.2, 0.55, 0.55), T_word("MALADIE", size=170), gr=dict(bw=True, bright=0.8))
    shot(17.0, 18.8, K("08", 1.1, 1.25, 0.55, 0.55), T_word("DÉCOURAGEMENT", size=150), gr=dict(sat=0.3, bright=0.75))
    shot(18.8, 20.8, K("01", 1.15, 1.3, 0.52, 0.4), T_word("FARDEAU", sup="Un", sub="TROP LOURD À PORTER", size=170),
         gr=dict(sat=0.4, bright=0.75))
    shot(20.8, 23.6, K("10", 1.05, 1.2, 0.4, 0.4), T_word("POUR TOI", sup="Cette soirée est", size=180, ring_on=True),
         flash=True)
    shot(23.6, 26.4, [K("02", 1.2, 1.05, 0.45), K("07", 1.3, 1.4, 0.4, 0.5)],
         T_word("LES CHAÎNES TOMBENT", size=130), gr=dict(bright=0.8))
    shot(26.4, 30.0, [K("06", 1.05, 1.18, 0.5, 0.45), K("11", 1.2, 1.3, 0.45, 0.35)],
         T_word("LA VIE RENAÎT", sub="LES CŒURS SONT RESTAURÉS", size=160))
    CUES.append(dict(t=30.0, type="riser", dur=3.0, gain=-10, end_at=True))
    # D. Infos
    shot(30.0, 31.3, (None, {}), T_word("RENDEZ-VOUS", size=120, ring_on=True), sfx=None)
    CUES.append(dict(t=30.0, type="boom", gain=-4))
    shot(31.3, 34.0, K("12", 1.0, 1.1, 0.5, 0.5, dx=0.04),
         T_corner("18", "Vendredi", "DÉCEMBRE", "SOIRÉE DE LOUANGE & DE GUÉRISON"), gr=dict(bright=0.6), flash=True,
         scrim=(880, 0.55))
    shot(34.0, 35.8, K("14", 1.05, 1.2, 0.4, 0.6), T_corner("18H30", "À partir de", "VENDREDI SOIR"),
         gr=dict(bright=0.6), scrim=(880, 0.55))
    shot(35.8, 38.5, K("12", 1.25, 1.1, 0.6, 0.4),
         T_word("PRÉAU DU LYCÉE BILINGUE", sub="DE YABASSI", size=110), gr=dict(bright=0.55), scrim=(540, 0.5))
    # E. Programme
    shot(38.5, 42.0, [K("04", 1.0, 1.12, 0.5, 0.4), K("11", 1.1, 1.2, 0.5, 0.35)],
         T_word("LOUANGE", sub="QUI ÉLÈVE LES CŒURS", size=170), flash=True)
    shot(42.0, 45.8, [K("05", 1.6, 1.8, 0.22, 0.38), K("05", 1.1, 1.2, 0.5, 0.5)],
         T_word("ENSEIGNEMENT", sub="DE LA PAROLE QUI TRANSFORME LES VIES", size=160))
    shot(45.8, 49.6, [K("02", 1.0, 1.15, 0.45), K("08", 1.1, 1.2, 0.5, 0.5)],
         T_word("GUÉRISON", sub="POUR LE CORPS ET L'ÂME", size=170))
    shot(49.6, 53.1, [K("06", 1.3, 1.15, 0.5), K("10", 1.1, 1.25, 0.4, 0.4)],
         T_word("RESTAURATION", sub="POUR LES FAMILLES", size=160))
    # F. Communion
    shot(53.1, 55.9, [K("09", 1.0, 1.1), K("04", 1.2, 1.3, 0.6, 0.5)], T_word("TOUS ENSEMBLE", size=150))
    shot(55.9, 58.6, [K("11", 1.2, 1.05, 0.45, 0.4), K("03", 1.0, 1.1, 0.5, 0.4)],
         T_word("CHANTER · PRIER · CÉLÉBRER", size=110))
    # G. Moment intime
    shot(58.6, 61.9, K("01", 1.5, 1.7, 0.52, 0.35), T_word("TON HISTOIRE", sup="Ce soir-là,", sub="PEUT CHANGER", size=160),
         gr=dict(bright=0.75), flash=True)
    # H. Appel
    shot(61.9, 65.6, [K("04", 1.3, 1.15, 0.4), K("09", 1.2, 1.3, 0.5, 0.45)],
         T_word("VIENS !", sup="Ne reste pas seul.", size=210, ring_on=True), flash=True)
    shot(65.6, 69.5, [K("09", 1.2, 1.35, 0.6, 0.45), K("06", 1.1, 1.2, 0.5, 0.45), K("10", 1.2, 1.3, 0.4, 0.4)],
         T_word("AMÈNE TA FAMILLE", sub="TES AMIS · TES VOISINS", size=140))
    CUES.append(dict(t=71.2, type="riser", dur=2.2, gain=-11, end_at=True))
    shot(69.5, 71.2, K("11", 1.0, 1.12, 0.5, 0.35), T_word("JÉSUS T'ATTEND", size=160), flash=True)
    # I. Carton final
    shot(71.2, 87.0, K("13", 1.1, 1.25, 0.5, 0.5), T_end, gr=dict(bright=0.35, sat=0.7), flash=True,
         scrim=None, sfx=None)
    CUES.append(dict(t=71.2, type="subdrop", gain=-4))
    CUES.append(dict(t=73.2, type="whoosh", gain=-6))
    CUES.append(dict(t=75.5, type="whoosh", gain=-7))
    CUES.append(dict(t=75.6, type="ticks", gain=-10))
    CUES.append(dict(t=82.0, type="shimmer", gain=2))
    for sh in SHOTS:
        sh["t0"], sh["t1"] = R(sh["t0"]), (TOTAL if sh["t1"] >= 87 else R(sh["t1"]))
    for c in CUES:
        c["t"] = R(c["t"])


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
