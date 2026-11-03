#!/usr/bin/env python3
"""Montage du spot « Soirée de louange et de guérison » (Coupe de l'Évangile, Yabassi).

Rend une vidéo 1920x1080 à 30 i/s à partir des photos du dossier images/,
avec titres animés, étalonnage chaud, poussière dorée, halos de lumière et grain.

Usage :
    python3 render.py --fonts DOSSIER_POLICES --out spot.mp4 [--audio mix.wav] [--draft]

Les polices attendues (Fontsource, via npm) : Anton, Montserrat, Playfair Display.
"""
import argparse
import glob
import math
import os
import random
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "images")
W, H, FPS = 1920, 1080, 30

GOLD = (242, 181, 68)
EMBER = (255, 106, 26)
WHITE = (255, 255, 255)
CREAM = (255, 240, 214)


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


FONTS = {}


def font(name, size):
    key = (name, size)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(FONT_FILES[name], size)
    return FONTS[key]


TEXT_CACHE = {}


def text_img(txt, fname, size, color=WHITE, tracking=0, glow=0, glow_color=None):
    """Rend un texte sur un calque RGBA ajusté, avec interlettrage et halo optionnels."""
    key = (txt, fname, size, color, tracking, glow, glow_color)
    if key in TEXT_CACHE:
        return TEXT_CACHE[key]
    f = font(fname, size)
    asc, desc = f.getmetrics()
    if tracking:
        widths = [f.getlength(c) for c in txt]
        tw = int(sum(widths) + tracking * (len(txt) - 1)) + 4
    else:
        tw = int(f.getlength(txt)) + 4
    pad = glow * 3 + 4
    im = Image.new("RGBA", (tw + pad * 2, asc + desc + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if tracking:
        x = pad
        for c, w_ in zip(txt, widths):
            d.text((x, pad), c, font=f, fill=color + (255,))
            x += w_ + tracking
    else:
        d.text((pad, pad), txt, font=f, fill=color + (255,))
    if glow:
        a = im.split()[3].filter(ImageFilter.GaussianBlur(glow))
        gc = glow_color or color
        g = Image.new("RGBA", im.size, gc + (0,))
        g.putalpha(a.point(lambda v: min(255, int(v * 1.6))))
        im = Image.alpha_composite(g, im)
    TEXT_CACHE[key] = im
    return im


def paste_alpha(base, layer, x, y, alpha=1.0):
    if alpha <= 0.003:
        return
    if alpha < 0.999:
        layer = layer.copy()
        layer.putalpha(layer.split()[3].point(lambda v: int(v * alpha)))
    base.alpha_composite(layer, (int(x), int(y)))


def reveal(base, layer, cx, y, p, align="center", rise=1.0, alpha_mult=1.0):
    """Révélation par masque : le texte monte depuis une fente invisible."""
    if p <= 0:
        return
    e = ease_out(p)
    w, h = layer.size
    x = cx - w / 2 if align == "center" else cx
    off = int((1 - e) * h * rise)
    visible = layer.crop((0, 0, w, h - off)) if off > 0 else layer
    if visible.size[1] <= 0:
        return
    paste_alpha(base, visible, x, y + off, alpha=clamp(e * 1.4) * alpha_mult)


def fade_text(base, layer, cx, y, p, out=0.0, dy=30, align="center"):
    e = ease_out(p) * (1 - ease_in_out(out))
    w, h = layer.size
    x = cx - w / 2 if align == "center" else cx
    paste_alpha(base, layer, x, y + (1 - ease_out(p)) * dy, alpha=e)


# ---------------------------------------------------------------- images
SRC = {}


def src(name):
    if name not in SRC:
        p = glob.glob(os.path.join(IMG, name + "*.jpg"))[0]
        im = Image.open(p).convert("RGB")
        # agrandissement unique de qualité + légère accentuation
        scale = max(2400 / im.width, 1350 / im.height)
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        SRC[name] = im
    return SRC[name]


def frame_from(name, t, z0=1.0, z1=1.12, fx=0.5, fy=0.5, dx=0.0, dy=0.0):
    """Ken Burns : zoom de z0 à z1, centré sur (fx, fy) avec dérive (dx, dy)."""
    im = src(name)
    iw, ih = im.size
    z = lerp(z0, z1, ease_in_out(t) * 0.6 + t * 0.4)
    base_w = min(iw, ih * W / H)
    cw = base_w / z
    ch = cw * H / W
    cx = clamp(fx + dx * t, 0, 1) * iw
    cy = clamp(fy + dy * t, 0, 1) * ih
    x0 = clamp(cx - cw / 2, 0, iw - cw)
    y0 = clamp(cy - ch / 2, 0, ih - ch)
    return im.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))


LUTS = {}


def grade(im, sat=1.0, bright=1.0, warm=0.0, bw=False):
    if bw:
        im = ImageEnhance.Color(im).enhance(0.0)
    elif sat != 1.0:
        im = ImageEnhance.Color(im).enhance(sat)
    key = (bright, warm)
    if key not in LUTS:
        x = np.arange(256) / 255
        # contraste filmique doux
        c = 255 * (0.5 + 0.5 * np.tanh((x - 0.5) * 2.1) / np.tanh(1.05))
        gains = (1 + 0.10 * warm, 1 + 0.03 * warm, 1 - 0.10 * warm)
        LUTS[key] = sum([list(np.clip(c * g * bright, 0, 255).astype(int)) for g in gains], [])
    return im.point(LUTS[key])


# ---------------------------------------------------------------- effets
rng = np.random.default_rng(7)
GRAIN = [rng.normal(0, 7, (H, W, 1)).astype(np.float32) for _ in range(4)]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIGNETTE = (1 - 0.55 * np.clip((((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2), 0, 1) ** 1.3)[..., None]
del yy, xx
_ly, _lx = np.mgrid[-H:H, -W:W].astype(np.float32)
LEAK_SPRITE = {}


def leak_sprite(radius):
    if radius not in LEAK_SPRITE:
        LEAK_SPRITE[radius] = np.exp(-((_lx ** 2 + _ly ** 2) / radius ** 2) * 2.2)
    return LEAK_SPRITE[radius]


def leak(t, strength, cx, cy, color=EMBER, radius=900):
    """Halo de lumière (light leak) additif, découpé dans un sprite précalculé."""
    sp = leak_sprite(radius)
    x0 = int(clamp(W - cx, 0, W))
    y0 = int(clamp(H - cy, 0, H))
    m = sp[y0:y0 + H, x0:x0 + W]
    return (m * strength)[..., None] * np.array(color, np.float32)[None, None, :]


random.seed(3)
PARTICLES = [
    (random.random() * W, random.random() * H, random.uniform(0.3, 1.0), random.uniform(-12, 12),
     random.uniform(-40, -12), random.uniform(0, 6.28))
    for _ in range(70)
]
DOT = {}


def dot(r):
    if r not in DOT:
        s = r * 6
        im = Image.new("L", (s, s), 0)
        ImageDraw.Draw(im).ellipse((s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r), fill=255)
        im = im.filter(ImageFilter.GaussianBlur(r * 0.9))
        g = Image.new("RGBA", (s, s), GOLD + (0,))
        g.putalpha(im)
        DOT[r] = g
    return DOT[r]


def particles(layer, T, amount):
    if amount <= 0:
        return
    for (x, y, depth, vx, vy, ph) in PARTICLES:
        px = (x + vx * T * depth + 20 * math.sin(T * 0.7 + ph)) % W
        py = (y + vy * T * depth) % H
        r = int(2 + depth * 4)
        a = amount * (0.35 + 0.65 * (0.5 + 0.5 * math.sin(T * 2 + ph))) * depth
        paste_alpha(layer, dot(r), px - r * 3, py - r * 3, alpha=a)


def gold_line(layer, cx, y, width, p, thick=3):
    w = int(width * ease_out(p))
    if w > 2:
        ImageDraw.Draw(layer).rectangle((cx - w / 2, y, cx + w / 2, y + thick), fill=GOLD + (255,))


# ---------------------------------------------------------------- plans
# Chaque plan : (début, fin, image, réglages ken burns, étalonnage, fonction de texte)
SHOTS = []


def shot(t0, t1, img, kb=None, gr=None, text=None, flash_in=False, scrim=(540, 0.3)):
    SHOTS.append(dict(t0=t0, t1=t1, img=img, kb=kb or {}, gr=gr or {}, text=text, flash_in=flash_in, scrim=scrim))


BANDS = {}


def band(yc, strength):
    """Bande sombre horizontale derrière les textes pour la lisibilité."""
    key = (yc, strength)
    if key not in BANDS:
        y = np.arange(H, dtype=np.float32)
        BANDS[key] = (1 - strength * np.exp(-((y - yc) / 260) ** 2))[:, None, None]
    return BANDS[key]


def T_kicker_title(kicker, title, title_size=150, title_color=WHITE, y=420, sub=None, sub_font="playi"):
    def f(L, lt, dur):
        k = text_img(kicker, "mont7", 40, GOLD, tracking=10, glow=6, glow_color=(0, 0, 0))
        reveal(L, k, W / 2, y - 70, (lt - 0.15) / 0.5)
        tl = text_img(title, "anton", title_size, title_color, tracking=4, glow=10, glow_color=(0, 0, 0))
        reveal(L, tl, W / 2, y, (lt - 0.3) / 0.55)
        gold_line(L, W / 2, y + tl.size[1] + 6, 260, (lt - 0.6) / 0.6)
        if sub:
            s = text_img(sub, sub_font, 56, CREAM)
            fade_text(L, s, W / 2, y + tl.size[1] + 40, (lt - 0.8) / 0.6)
    return f


def T_big_word(word, sub=None, size=210, y=380):
    def f(L, lt, dur):
        # interlettrage qui se resserre
        tr = int(lerp(60, 14, ease_out(lt / 1.2)))
        tl = text_img(word, "anton", size, WHITE, tracking=tr, glow=14, glow_color=(0, 0, 0))
        fade_text(L, tl, W / 2, y, lt / 0.4, dy=0)
        if sub:
            s = text_img(sub, "playi", 60, GOLD)
            fade_text(L, s, W / 2, y + tl.size[1] + 10, (lt - 0.5) / 0.5)
    return f


def T_serif(lines, y=430, size=86, color=CREAM, stagger=0.45):
    def f(L, lt, dur):
        cy = y
        for i, ln in enumerate(lines):
            im = text_img(ln, "playi", size, color, glow=10, glow_color=(0, 0, 0))
            reveal(L, im, W / 2, cy, (lt - 0.2 - i * stagger) / 0.6)
            cy += int(size * 1.25)
    return f


def T_question(word):
    def f(L, lt, dur):
        im = text_img(word, "playi", 120, WHITE, glow=12, glow_color=(0, 0, 0))
        reveal(L, im, W / 2, 440, (lt - 0.1) / 0.5)
    return f


def T_programme(word, sub, idx):
    def f(L, lt, dur):
        n = text_img(f"0{idx}", "anton", 120, GOLD)
        fade_text(L, n, 150, 640, lt / 0.4, align="left", dy=0)
        tl = text_img(word, "anton", 150, WHITE, tracking=6, glow=10, glow_color=(0, 0, 0))
        reveal(L, tl, 320, 620, (lt - 0.15) / 0.5, align="left")
        s = text_img(sub, "playi", 58, CREAM, glow=8, glow_color=(0, 0, 0))
        fade_text(L, s, 330, 620 + tl.size[1] - 6, (lt - 0.5) / 0.5, align="left", dy=15)
        d = ImageDraw.Draw(L)
        h = int(200 * ease_out((lt - 0.1) / 0.5))
        if h > 0:
            d.rectangle((290, 640, 294, 640 + h), fill=GOLD + (255,))
    return f


def T_date(L, lt, dur):
    big = text_img("18", "anton", 330, GOLD, glow=16, glow_color=(0, 0, 0))
    reveal(L, big, 560, 300, lt / 0.5, align="left")
    a = text_img("VENDREDI", "anton", 110, WHITE, tracking=6)
    b = text_img("DÉCEMBRE 2026", "mont7", 54, CREAM, tracking=8)
    x = 560 + big.size[1] * 0.0 + big.size[0] + 10
    reveal(L, a, x, 360, (lt - 0.25) / 0.5, align="left")
    reveal(L, b, x + 6, 500, (lt - 0.45) / 0.5, align="left")
    k = text_img("RENDEZ-VOUS LE", "mont7", 40, GOLD, tracking=10, glow=6, glow_color=(0, 0, 0))
    reveal(L, k, W / 2, 250, (lt - 0.05) / 0.5)


def T_end(L, lt, dur):
    # apparitions calées sur la voix : « La Coupe de l'Évangile » (0 s), « Soirée… » (1,9 s),
    # date et lieu (4,4 s), « Tout pour la gloire de Jésus » (10,9 s)
    k = text_img("LA COUPE DE L'ÉVANGILE", "mont7", 40, GOLD, tracking=12, glow=6, glow_color=(0, 0, 0))
    reveal(L, k, W / 2, 150, (lt - 0.1) / 0.5)
    t1 = text_img("SOIRÉE DE LOUANGE", "anton", 140, WHITE, tracking=4, glow=12, glow_color=(0, 0, 0))
    reveal(L, t1, W / 2, 210, (lt - 1.9) / 0.5)
    t2 = text_img("& DE GUÉRISON", "anton", 110, GOLD, tracking=6, glow=12, glow_color=(0, 0, 0))
    reveal(L, t2, W / 2, 400, (lt - 2.3) / 0.5)
    th = text_img("« La Parole de Dieu : une source de vie et de guérison »", "playi", 50, CREAM)
    fade_text(L, th, W / 2, 570, (lt - 2.9) / 0.6)
    gold_line(L, W / 2, 665, 900, (lt - 3.4) / 0.8, thick=2)
    items = [("VEN. 18 DÉC. 2026", "Date"), ("DÈS 18H30", "Heure"), ("PRÉAU DU LYCÉE BILINGUE", "Yabassi")]
    xs = [W / 2 - 560, W / 2, W / 2 + 560]
    for i, ((v, lab), x) in enumerate(zip(items, xs)):
        a = text_img(lab.upper(), "mont7", 26, GOLD, tracking=8)
        b = text_img(v, "anton", 60, WHITE, tracking=2)
        p = (lt - 4.4 - i * 0.9) / 0.5
        fade_text(L, a, x, 700, p)
        fade_text(L, b, x, 740, p)
    f = text_img("Tout pour la gloire de Jésus !", "playi", 64, GOLD, glow=8, glow_color=(0, 0, 0))
    fade_text(L, f, W / 2, 890, (lt - 10.9) / 0.8)


def build_timeline():
    """Plans calés sur la voix off « Annonceur Croisade » (1 min 24)."""
    # A. Accroche — « Yabassi, Dieu a une parole pour toi. » (0,4 → 3,4)
    shot(0.0, 1.9, "13", dict(z0=1.0, z1=1.15, fx=0.45, fy=0.5), dict(warm=0.6, bright=0.85),
         T_big_word("YABASSI", size=230, y=360))
    shot(1.9, 3.6, "11", dict(z0=1.05, z1=1.2, fx=0.5, fy=0.4), dict(warm=0.4),
         T_serif(["Dieu a une parole", "pour toi."], y=640, size=96, stagger=0.3), flash_in=True, scrim=(720, 0.4))
    # B. Titre et thème (3,4 → 15,1)
    shot(3.6, 7.0, "05", dict(z0=1.0, z1=1.15, fx=0.45, fy=0.45), dict(warm=0.3, bright=0.8),
         T_kicker_title("DANS LE CADRE DE", "LA COUPE DE L'ÉVANGILE", 140))
    shot(7.0, 10.2, "03", dict(z0=1.0, z1=1.12, fx=0.5, fy=0.4), dict(bright=0.75),
         T_kicker_title("GRANDE SOIRÉE", "LOUANGE & GUÉRISON", 150), flash_in=True)
    shot(10.2, 15.2, "09", dict(z0=1.1, z1=1.25, fx=0.45, fy=0.5, dx=0.05), dict(warm=0.4, bright=0.7),
         T_serif(["« La Parole de Dieu :", "une source de vie et de guérison »"], y=400, size=84))
    # C. Émotion (15,1 → 30,0)
    shot(15.2, 17.0, "07", dict(z0=1.05, z1=1.2, fx=0.55, fy=0.55), dict(bw=True, bright=0.85), T_question("La maladie ?"))
    shot(17.0, 18.8, "08", dict(z0=1.1, z1=1.25, fx=0.55, fy=0.55), dict(sat=0.25, bright=0.8), T_question("Le découragement ?"))
    shot(18.8, 20.8, "01", dict(z0=1.15, z1=1.3, fx=0.52, fy=0.4), dict(sat=0.4, bright=0.8), T_question("Un fardeau trop lourd ?"))
    shot(20.8, 23.6, "10", dict(z0=1.05, z1=1.2, fx=0.4, fy=0.4), dict(warm=0.5),
         T_serif(["Cette soirée est pour toi."], y=760, size=90), flash_in=True)
    shot(23.6, 26.4, "02", dict(z0=1.2, z1=1.05, fx=0.45, fy=0.5), dict(warm=0.3, bright=0.85),
         T_big_word("LES CHAÎNES TOMBENT", size=150, y=420))
    shot(26.4, 30.0, "06", dict(z0=1.05, z1=1.18, fx=0.5, fy=0.45), dict(warm=0.6),
         T_big_word("LA VIE RENAÎT", size=170, y=720))
    # D. Infos (30,0 → 38,4)
    shot(30.0, 34.0, "12", dict(z0=1.0, z1=1.12, fx=0.5, fy=0.5, dx=0.04), dict(warm=0.4, bright=0.55), T_date,
         flash_in=True, scrim=(450, 0.55))
    shot(34.0, 35.8, "14", dict(z0=1.05, z1=1.2, fx=0.4, fy=0.6), dict(warm=0.4, bright=0.6),
         T_kicker_title("À PARTIR DE", "18H30", 260, GOLD, y=330), scrim=(450, 0.55))
    shot(35.8, 38.5, "12", dict(z0=1.25, z1=1.1, fx=0.6, fy=0.4), dict(warm=0.4, bright=0.55),
         T_kicker_title("YABASSI", "PRÉAU DU LYCÉE BILINGUE", 130, y=420), scrim=(450, 0.55))
    # E. Programme (38,4 → 53,1)
    shot(38.5, 42.0, "04", dict(z0=1.0, z1=1.15, fx=0.5, fy=0.4), dict(warm=0.3, bright=0.85),
         T_programme("LOUANGE", "qui élève les cœurs", 1), flash_in=True, scrim=(720, 0.45))
    shot(42.0, 45.8, "05", dict(z0=1.6, z1=1.8, fx=0.22, fy=0.38), dict(warm=0.3, bright=0.85),
         T_programme("ENSEIGNEMENT", "de la Parole qui transforme les vies", 2), scrim=(720, 0.45))
    shot(45.8, 49.6, "02", dict(z0=1.0, z1=1.15, fx=0.45, fy=0.5), dict(bright=0.85),
         T_programme("GUÉRISON", "pour le corps et l'âme", 3), scrim=(720, 0.45))
    shot(49.6, 53.1, "06", dict(z0=1.3, z1=1.15, fx=0.5, fy=0.5), dict(warm=0.4, bright=0.85),
         T_programme("RESTAURATION", "pour les familles", 4), scrim=(720, 0.45))
    # F. Communion (53,1 → 58,6)
    shot(53.1, 55.9, "09", dict(z0=1.0, z1=1.1, fx=0.5, fy=0.5), dict(warm=0.4, bright=0.8),
         T_big_word("CHANTER · PRIER", size=150, y=420))
    shot(55.9, 58.6, "11", dict(z0=1.2, z1=1.05, fx=0.45, fy=0.4), dict(warm=0.4, bright=0.8),
         T_big_word("CÉLÉBRER", size=210, y=400))
    # G. Moment intime (58,6 → 61,9)
    shot(58.6, 61.9, "01", dict(z0=1.5, z1=1.7, fx=0.52, fy=0.35), dict(warm=0.6, bright=0.75),
         T_serif(["Ce soir-là,", "ton histoire peut changer."], y=640, size=90, stagger=0.6), scrim=(720, 0.45))
    # H. Appel (61,9 → 71,2)
    shot(61.9, 65.6, "04", dict(z0=1.3, z1=1.15, fx=0.4, fy=0.5), dict(warm=0.4, bright=0.75),
         T_kicker_title("ALORS NE RESTE PAS SEUL", "VIENS !", 230, y=360), flash_in=True)
    shot(65.6, 69.5, "09", dict(z0=1.2, z1=1.35, fx=0.6, fy=0.45), dict(warm=0.5, bright=0.75),
         T_serif(["Amène ta famille,", "tes amis, tes voisins."], y=420, size=92, stagger=0.9))
    shot(69.5, 71.2, "11", dict(z0=1.0, z1=1.12, fx=0.5, fy=0.35), dict(warm=0.5, bright=0.8),
         T_big_word("JÉSUS T'ATTEND !", size=190, y=400), flash_in=True)
    # I. Carton final (71,2 → 87,0)
    shot(71.2, 87.0, "05", dict(z0=1.1, z1=1.22, fx=0.5, fy=0.5), dict(warm=0.5, bright=0.3, sat=0.7), T_end, flash_in=True)


def render(out, audio=None, draft=False, start=0.0, end=None):
    build_timeline()
    total = SHOTS[-1]["t1"]
    end = end or total
    scale = 0.5 if draft else 1.0
    ow, oh = int(W * scale), int(H * scale)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-"]
    if audio:
        cmd += ["-ss", str(start), "-i", audio]
    cmd += ["-vf", f"scale={ow}:{oh}:flags=lanczos", "-c:v", "libx264", "-preset", "veryfast" if draft else "medium",
            "-crf", "26" if draft else "21", "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    if audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += [out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    XF = 0.35  # durée des fondus
    n0, n1 = int(start * FPS), int(end * FPS)
    for n in range(n0, n1):
        T = n / FPS
        i = next(k for k, s in enumerate(SHOTS) if s["t0"] <= T < s["t1"] or k == len(SHOTS) - 1)
        s = SHOTS[i]

        def layer_for(sh, Tt):
            dur = sh["t1"] - sh["t0"]
            lt = Tt - sh["t0"]
            img = frame_from(sh["img"], clamp(lt / dur), **sh["kb"])
            a = np.asarray(grade(img, **sh["gr"]), dtype=np.float32)
            return a, lt, dur

        a, lt, dur = layer_for(s, T)
        # fondu enchaîné avec le plan précédent
        if i > 0 and lt < XF and not s["flash_in"]:
            pa, _, _ = layer_for(SHOTS[i - 1], T)
            k = ease_in_out(lt / XF)
            a = pa * (1 - k) + a * k
        a = a * VIGNETTE
        if s["text"] and s["scrim"]:
            a = a * band(*s["scrim"])
        # halos de lumière
        a = a + leak(T, 0.22 + 0.1 * math.sin(T * 0.9), W * (0.15 + 0.1 * math.sin(T * 0.3)), H * 0.1)
        a = a + leak(T, 0.16, W * (0.9 + 0.05 * math.cos(T * 0.4)), H * 0.95, GOLD, 800)
        # flash blanc-or à l'entrée des plans marqués
        if s["flash_in"] and lt < 0.4:
            fl = (1 - lt / 0.4) ** 2
            a = a * (1 - fl * 0.3) + fl * np.array([255, 225, 170], np.float32) * 0.9
        # grain
        a += GRAIN[n % len(GRAIN)]
        frame = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
        particles(frame, T, 0.9 if T >= 71.2 else 0.55)
        if s["text"]:
            # sortie du texte : fondu sur les 0,25 dernières secondes
            L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            s["text"](L, lt, dur)
            out_a = 1 - ease_in_out((lt - (dur - 0.25)) / 0.25) if i < len(SHOTS) - 1 else 1
            paste_alpha(frame, L, 0, 0, alpha=out_a)
        # fondu au noir final
        if T > total - 0.8:
            frame = Image.blend(frame, Image.new("RGBA", (W, H), (0, 0, 0, 255)), clamp((T - (total - 0.8)) / 0.8))
        proc.stdin.write(frame.convert("RGB").tobytes())
    proc.stdin.close()
    proc.wait()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--out", default="spot.mp4")
    ap.add_argument("--audio")
    ap.add_argument("--draft", action="store_true")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float)
    ap.add_argument("--jobs", type=int, default=1)
    args = ap.parse_args()

    def ff(pattern):
        return glob.glob(os.path.join(args.fonts, "**", pattern), recursive=True)[0]

    FONT_FILES = {
        "anton": ff("anton-latin-400-normal.woff"),
        "mont7": ff("montserrat-latin-700-normal.woff"),
        "playi": ff("playfair-display-latin-400-italic.woff"),
    }
    if args.jobs > 1:
        import concurrent.futures as cf
        import sys
        build_timeline()
        end = args.end or SHOTS[-1]["t1"]
        SHOTS.clear()
        edges = [args.start + (end - args.start) * k / args.jobs for k in range(args.jobs + 1)]
        edges = [round(e * FPS) / FPS for e in edges]
        parts = [f"{args.out}.part{k}.mp4" for k in range(args.jobs)]
        base = [sys.executable, os.path.abspath(__file__), "--fonts", args.fonts] + (["--draft"] if args.draft else [])
        procs = [subprocess.Popen(base + ["--out", parts[k], "--start", str(edges[k]), "--end", str(edges[k + 1])])
                 for k in range(args.jobs)]
        assert all(p.wait() == 0 for p in procs)
        lst = args.out + ".txt"
        with open(lst, "w") as fh:
            fh.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst]
        if args.audio:
            cmd += ["-i", args.audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
        cmd += ["-c:v", "copy", "-movflags", "+faststart", args.out]
        subprocess.check_call(cmd)
        for p in parts + [lst]:
            os.remove(p)
    else:
        render(args.out, args.audio, args.draft, args.start, args.end)
