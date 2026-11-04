#!/usr/bin/env python3
"""Spot « Les matchs de la Coupe de l'Évangile » — version 2, style « Plastic Transitions ».

Transitions par feuille de plastique froissé (générée procéduralement : plis, reflets, réfraction),
titres larges (Unbounded) rouges ou blancs tapés lettre par lettre, sous-titre dans un cadre rouge arrondi,
barre rouge en bas, carré rouge, pastille blanche, étalonnage froid.

Même minutage que la version 1 (calé sur la voix off des matchs).

Usage :
    python3 render_v2.py --fonts DOSSIER_POLICES --out spot.mp4 [--jobs 4] [--draft]
    python3 render_v2.py --fonts DOSSIER_POLICES --cues cues.json
"""
import argparse
import glob
import json
import os
import subprocess
import sys

import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as R  # réutilise polices, chargement d'images, Ken Burns, grain, vignette  # noqa: E402

W, H, FPS = R.W, R.H, R.FPS
TOTAL = 74.5
RED = (236, 32, 42)
WHITE = (255, 255, 255)
clamp, ease_out, ease_in_out, lerp = R.clamp, R.ease_out, R.ease_in_out, R.lerp


# ---------------------------------------------------------------- feuille de plastique
def make_plastic(seed, w=W * 2, h=H):
    rng = np.random.default_rng(seed)
    s = 2  # calcul à demi-résolution puis agrandissement
    hh, ww = h // s, w // s
    ys, xs = np.mgrid[0:hh, 0:ww].astype(np.float32)
    # ondulations douces de la feuille (bruit basse fréquence)
    coarse = rng.standard_normal((hh // 60 + 3, ww // 60 + 3)).astype(np.float32)
    height = np.asarray(Image.fromarray(coarse).resize((ww, hh), Image.BICUBIC), np.float32) * 18
    # plis : arêtes de longueur finie, surtout diagonales
    for k in range(70):
        th = rng.normal(np.pi * 0.28, 0.45) if rng.random() < 0.7 else rng.uniform(0, np.pi)
        cx, cy = rng.uniform(0, ww), rng.uniform(0, hh)
        d = np.cos(th) * (xs - cx) + np.sin(th) * (ys - cy)
        along = -np.sin(th) * (xs - cx) + np.cos(th) * (ys - cy)
        length = rng.uniform(60, 420)
        win = np.exp(-(along / length) ** 2)
        amp = rng.uniform(0.15, 0.6) * rng.choice([-1, 1])
        height += amp * np.minimum(np.abs(d), 160) * win
    height = ndimage.gaussian_filter(height, 1.2)
    gy, gx = np.gradient(height)
    n = np.sqrt(gx ** 2 + gy ** 2 + 1)
    nx, ny, nz = -gx / n, -gy / n, 1 / n
    hx, hy, hz = -0.35, -0.45, 1.75
    hn = np.sqrt(hx * hx + hy * hy + hz * hz)
    ndoth = np.clip((nx * hx + ny * hy + nz * hz) / hn, 0, 1)
    sheen = ndoth ** 18 * 0.55 + ndoth ** 120 * 0.9  # reflets larges + éclats vifs
    lap = np.abs(np.gradient(gx, axis=1) + np.gradient(gy, axis=0))
    ridges = np.clip(lap / (np.percentile(lap, 99.5) + 1e-6), 0, 1) ** 2 * 0.3
    hl = np.clip(sheen + ridges, 0, 1)
    hl = np.asarray(Image.fromarray((hl * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
                    .filter(ImageFilter.GaussianBlur(1.0)), np.float32) / 255

    def up(g):
        g8 = np.clip(g * 25, -127, 127).astype(np.int8).view(np.uint8)
        return np.asarray(Image.fromarray(g8).resize((w, h), Image.BILINEAR), np.uint8).view(np.int8).astype(np.int16)

    edge = rng.standard_normal(10)
    edge = np.interp(np.arange(h), np.linspace(0, h, 10), edge) * 70
    edge = np.convolve(edge, np.ones(61) / 61, mode="same")
    return dict(hl=hl, dx=up(gx), dy=up(gy), edge=edge.astype(np.int32))


PLASTIC = {}


def plastic(seed):
    if seed not in PLASTIC:
        PLASTIC[seed] = make_plastic(seed)
    return PLASTIC[seed]


_YY, _XX = np.mgrid[0:H, 0:W]
EDGE_MASK = np.clip((((_XX - W / 2) / (W * 0.5)) ** 2 + ((_YY - H / 2) / (H * 0.5)) ** 2) - 0.35, 0, 1).astype(np.float32)


def apply_plastic(a, p, offset, strength=1.0, refract=True, edges_only=False):
    """Superpose la feuille (décalée de `offset` px) sur l'image a (float HxWx3)."""
    pw = p["hl"].shape[1]
    x0 = int(offset)
    # zone couverte de l'écran : colonnes x telles que 0 <= x - x0 + edge(y) < pw
    lx = _XX - x0 + p["edge"][:, None]
    cover = (lx >= 0) & (lx < pw)
    if not cover.any():
        return a
    lxc = np.clip(lx, 0, pw - 1)
    hl = np.where(cover, p["hl"][_YY, lxc], 0)
    ddx = np.where(cover, p["dx"][_YY, lxc], 0)
    ddy = np.where(cover, p["dy"][_YY, lxc], 0)
    if refract:
        sx = np.clip(_XX + ddx, 0, W - 1)
        sy = np.clip(_YY + ddy, 0, H - 1)
        out = a[sy, sx]
    else:
        out = a
    out = np.where(cover[..., None], out * (1 - 0.12 * strength) + 22 * strength, out)
    rim = np.exp(-((lx.astype(np.float32)) / 6.0) ** 2) + np.exp(-((lx.astype(np.float32) - pw) / 6.0) ** 2)
    hl = np.clip(hl + rim * 0.5, 0, 1) * strength
    if edges_only:
        hl = hl * EDGE_MASK
    return out * (1 - hl[..., None] * 0.6) + hl[..., None] * 255 * 0.95


# ---------------------------------------------------------------- textes
def typewriter(L, lines, cx, y, lt, dur, size, color, delay=0.25, step=0.035, exit_=True, line_gap=1.02,
               fname="u800", tracking=0):
    """Lignes centrées, lettres qui apparaissent de gauche à droite. Renvoie le bas du bloc."""
    t = lt - delay
    k = 0
    yy = y
    out = 1.0
    if exit_ and dur:
        out = 1 - ease_in_out((lt - (dur - 0.3)) / 0.25)
    for ln in lines:
        tw = R.text_width(ln, fname, size, tracking)
        x = cx - tw / 2
        for ch, lx in zip(ln, R.letter_positions(ln, fname, size, tracking)):
            if ch != " ":
                a = clamp((t - k * step) / 0.09) * out
                if a > 0:
                    im, pad = R.glyph(ch, fname, size, color)
                    R.paste_alpha(L, im, x + lx - pad + 4, yy - pad + 4, alpha=a)
            k += 1
        yy += size * line_gap
    return yy


def pill(L, txt, cx, y, lt, dur, delay=0.6, size=34, exit_=True):
    t = lt - delay
    if t <= 0:
        return
    p = ease_out(t / 0.45)
    if exit_ and dur:
        p *= 1 - ease_in_out((lt - (dur - 0.3)) / 0.25)
    if p <= 0:
        return
    tw = R.text_width(txt, "m500", size)
    bw, bh = tw + 56, size + 30
    w = bw * (0.6 + 0.4 * p)
    d = ImageDraw.Draw(L)
    d.rounded_rectangle((cx - w / 2, y, cx + w / 2, y + bh), radius=12, outline=RED + (int(255 * p),), width=3)
    im = R.whole_text(txt, "m500", size, WHITE)
    R.paste_alpha(L, im, cx - im.width / 2, y + (bh - im.height) / 2 + 2, alpha=p)


def hud(L, T, title_card):
    d = ImageDraw.Draw(L)
    im = R.whole_text("- Coupe de l'Évangile", "m700", 24, WHITE)
    R.paste_alpha(L, im, W - im.width - 70, 40, 0.95)
    im2 = R.whole_text("Yabassi 2026", "playi", 30, WHITE)
    R.paste_alpha(L, im2, 60, 34, 0.8)
    if title_card:
        d.rectangle((0, H - 16, W, H), fill=RED + (255,))
        d.rectangle((W - 140, H - 140, W - 72, H - 72), outline=RED + (255,), width=12)
    else:
        cx, cy = W - 100, H / 2
        d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=WHITE + (235,))
        d.polygon([(cx - 8, cy - 12), (cx - 8, cy + 12), (cx + 13, cy)], fill=(20, 20, 20, 255))


def T_white(lines, sub=None, size=118):
    def f(L, lt, dur):
        h = size * 1.02 * len(lines)
        y = H / 2 - h / 2 - (40 if sub else 0)
        yb = typewriter(L, lines, W / 2, y, lt, dur, size, WHITE)
        if sub:
            pill(L, sub, W / 2, yb + 20, lt, dur, delay=0.25 + 0.035 * sum(len(s) for s in lines))
    f.title_card = False
    return f


def T_red(lines, sub=None, size=150):
    def f(L, lt, dur):
        h = size * 1.02 * len(lines)
        y = H / 2 - h / 2 - 30
        yb = typewriter(L, lines, W / 2, y, lt, dur, size, RED)
        if sub:
            pill(L, sub, W / 2, yb + 24, lt, dur, delay=0.25 + 0.035 * sum(len(s) for s in lines))
    f.title_card = True
    return f


def T_end(L, lt, dur):
    # calé sur la voix : « La Coupe de l'Évangile » (0 s), « chaque samedi » (1,8 s), stade (4,5 s), gloire (7,4 s)
    yb = typewriter(L, ["LA COUPE DE", "L'ÉVANGILE"], W / 2, 170, lt, None, 130, RED, delay=0.1, exit_=False)
    pill(L, "Chaque samedi dès le 5 décembre  ·  14h – 18h", W / 2, yb + 18, lt, None, delay=1.8, exit_=False)
    typewriter(L, ["STADE DU LYCÉE BILINGUE DE YABASSI"], W / 2, yb + 130, lt, None, 46, WHITE, delay=4.5,
               step=0.02, exit_=False)
    typewriter(L, ["GRANDE FINALE : SAMEDI 19 DÉCEMBRE 2026"], W / 2, yb + 200, lt, None, 34, WHITE, delay=5.3,
               step=0.015, exit_=False, fname="m600")
    typewriter(L, ["TOUT POUR LA GLOIRE DE JÉSUS"], W / 2, yb + 290, lt, None, 56, RED, delay=7.4, step=0.03,
               exit_=False)


T_end.title_card = True


# ---------------------------------------------------------------- timeline
SHOTS = []
CUES = []
K = R.K


def shot(t0, t1, img, text, plastic_in=True, gr=None):
    SHOTS.append(dict(t0=t0, t1=t1, img=img, text=text, plastic=plastic_in, gr=gr or {}))
    if plastic_in and t0 > 0:
        CUES.append(dict(t=t0 - 0.4, type="crinkle", gain=-6))
        CUES.append(dict(t=t0 - 0.35, type="whoosh", gain=-9))
    elif t0 > 0:
        CUES.append(dict(t=t0 - 0.05, type="swish", gain=-7))
    if getattr(text, "title_card", False):
        CUES.append(dict(t=t0 + 0.2, type="impact", gain=-5))
    CUES.append(dict(t=t0 + 0.25, type="ticks", gain=-11))


def build_timeline():
    SHOTS.clear()
    CUES.clear()
    shot(0.0, 1.6, K("13", 1.0, 1.15, 0.45), T_red(["YABASSI"], "Coupe de l'Évangile  ·  Les matchs", 190),
         plastic_in=False)
    shot(1.6, 4.3, K("f1", 1.0, 1.15, 0.5, 0.55), T_white(["LE BALLON VA ROULER", "POUR LA GLOIRE DE DIEU"], size=92))
    shot(4.3, 6.9, K("f4", 1.05, 1.2, 0.5, 0.5), T_red(["LA COUPE DE", "L'ÉVANGILE"], "est lancée !"))
    shot(6.9, 10.3, K("f2", 1.0, 1.12, 0.5, 0.35), T_white(["DÈS LE SAMEDI", "5 DÉCEMBRE"], "Chaque samedi  ·  2026"))
    shot(10.3, 13.6, K("f3", 1.0, 1.15, 0.5, 0.5), T_white(["STADE DU LYCÉE", "BILINGUE"], "Yabassi"))
    shot(13.6, 17.0, K("f1", 1.4, 1.6, 0.5, 0.6), T_white(["LES MEILLEURES", "ÉQUIPES"], "s'affrontent"))
    shot(17.0, 19.9, K("f4", 1.2, 1.35, 0.55, 0.5), T_red(["2 MATCHS"], "chaque samedi", 190))
    shot(19.9, 25.5, K("f4", 1.0, 1.15, 0.45, 0.5), T_white(["MATCH 1"], "14h – 16h", 150))
    shot(25.5, 29.9, K("f1", 1.2, 1.35, 0.4, 0.6), T_white(["MATCH 2"], "16h – 18h", 150))
    shot(29.9, 32.3, K("f3", 1.1, 1.2, 0.5, 0.55), T_white(["AVANT CHAQUE", "MATCH"]))
    shot(32.3, 35.0, K("08", 1.1, 1.25, 0.55, 0.55), T_white(["MÉDITATION", "& PRIÈRE"]))
    shot(35.0, 37.6, K("f2", 1.0, 1.1, 0.5, 0.5), T_white(["DIEU AU CENTRE", "DU TERRAIN"]))
    CUES.append(dict(t=37.6, type="riser", dur=2.0, gain=-12, end_at=True))
    shot(37.6, 38.7, K("f1", 1.5, 1.7, 0.45, 0.55), T_white(["JEU"], size=200))
    shot(38.7, 39.8, K("f4", 1.3, 1.45, 0.6, 0.5), T_white(["PASSION"], size=180), plastic_in=False)
    shot(39.8, 42.4, K("f2", 1.4, 1.6, 0.5, 0.3), T_white(["FAIR-PLAY"], size=180), plastic_in=False)
    shot(42.4, 45.9, K("06", 1.05, 1.18, 0.5, 0.45), T_white(["LA JOIE DE", "L'ÉVANGILE"], "et surtout…"))
    CUES.append(dict(t=45.9, type="riser", dur=2.0, gain=-11, end_at=True))
    CUES.append(dict(t=45.9, type="boom", gain=-4))
    shot(45.9, 49.4, K("f1", 1.0, 1.12, 0.5, 0.5), T_red(["GRANDE", "FINALE"], "Samedi 19 décembre 2026", 170))
    shot(49.4, 52.9, K("f3", 1.05, 1.18, 0.5, 0.5), T_white(["SAMEDI", "19 DÉCEMBRE"]))
    shot(52.9, 54.8, K("05", 1.6, 1.8, 0.22, 0.38), T_white(["ENSEIGNEMENT"], "au programme", 120))
    shot(54.8, 56.0, K("f4", 1.1, 1.2, 0.5, 0.5), T_white(["JEUX"], size=200), plastic_in=False)
    shot(56.0, 57.0, K("09", 1.1, 1.2, 0.5, 0.5), T_white(["MANÈGE"], "pour les enfants", 170), plastic_in=False)
    shot(57.0, 57.8, K("f1", 1.3, 1.4, 0.5, 0.5), T_white(["REMISE", "DES PRIX"], size=130), plastic_in=False)
    shot(57.8, 62.4, K("f1", 1.6, 1.8, 0.5, 0.75), T_white(["VENEZ", "NOMBREUX"], "Supporters  ·  familles  ·  jeunes  ·  anciens", 150))
    CUES.append(dict(t=62.4, type="riser", dur=2.0, gain=-11, end_at=True))
    shot(62.4, TOTAL, K("f2", 1.05, 1.18, 0.5, 0.4), T_end, gr=dict(bright=0.4))
    CUES.append(dict(t=62.4, type="subdrop", gain=-4))
    CUES.append(dict(t=69.8, type="shimmer", gain=2))


def cool_grade(img, bright=0.82):
    a = np.asarray(R.grade(img, sat=0.8, bright=bright), np.float32)
    lum = a.mean(axis=2, keepdims=True) / 255
    teal = np.array([-14, 6, 12], np.float32) * (1 - lum) ** 1.5  # ombres bleu-vert
    a = a * np.array([0.93, 1.0, 1.04], np.float32) + teal
    return a


# ---------------------------------------------------------------- rendu
PT = 0.75  # durée d'une transition plastique


def render(out, draft=False, start=0.0, end=None):
    build_timeline()
    end = end or TOTAL
    scale = 0.5 if draft else 1.0
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-vf", f"scale={int(W * scale)}:{int(H * scale)}:flags=lanczos",
           "-c:v", "libx264", "-preset", "veryfast" if draft else "medium", "-crf", "26" if draft else "20",
           "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    deco = plastic(99)  # reflets plastique discrets sur les bords des cartes titre
    for n in range(int(start * FPS), int(end * FPS)):
        T = n / FPS
        i = next(k for k, s in enumerate(SHOTS) if s["t0"] <= T < s["t1"] or k == len(SHOTS) - 1)
        s = SHOTS[i]
        # transition plastique : la feuille couvre l'écran autour de la coupe (t0 du plan suivant)
        nxt = SHOTS[i + 1] if i + 1 < len(SHOTS) else None
        trans = None
        cut = None
        if s["plastic"] and s["t0"] > 0 and T - s["t0"] < PT / 2:
            cut = s["t0"]
            trans = 0.5 + (T - cut) / PT
        elif nxt and nxt["plastic"] and nxt["t0"] - T < PT / 2:
            cut = nxt["t0"]
            trans = 0.5 - (cut - T) / PT
        dur = s["t1"] - s["t0"]
        lt = T - s["t0"]
        name, kb = s["img"]
        img = R.frame_from(name, clamp(lt / dur), **kb)
        a = cool_grade(img, **s["gr"])
        a = a * R.VIGNETTE
        if s["text"]:
            a = a * R.band(540, 0.4)
        if trans is not None:
            p = plastic(int(round(cut * 10)) % 5)
            pw = p["hl"].shape[1]
            e = ease_in_out(trans)
            offset = lerp(W, -pw, e)  # la feuille entre par la droite et sort par la gauche
            a = apply_plastic(a, p, offset)
        elif getattr(s["text"], "title_card", False):
            a = apply_plastic(a, deco, -W * 0.5 + 40 * np.sin(T * 0.3), strength=0.5, refract=False, edges_only=True)
        a += R.GRAIN[n % len(R.GRAIN)]
        if T < 0.6:  # ouverture : sortie du noir
            a *= ease_in_out(T / 0.6)
        frame = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        if s["text"]:
            s["text"](L, lt, dur)
        hud(L, T, getattr(s["text"], "title_card", False))
        frame.alpha_composite(L)
        if T > TOTAL - 1.0:
            frame = Image.blend(frame, Image.new("RGBA", (W, H), (0, 0, 0, 255)), clamp((T - (TOTAL - 1.0)) / 1.0))
        proc.stdin.write(frame.convert("RGB").tobytes())
    proc.stdin.close()
    proc.wait()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--out", default="spot_v2.mp4")
    ap.add_argument("--draft", action="store_true")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float)
    ap.add_argument("--jobs", type=int, default=1)
    ap.add_argument("--cues")
    args = ap.parse_args()

    def ff(pattern):
        return glob.glob(os.path.join(args.fonts, "**", pattern), recursive=True)[0]

    R.FONT_FILES.update({
        "u800": ff("unbounded-latin-800-normal.woff"),
        "m700": ff("montserrat-latin-700-normal.woff"),
        "m600": ff("montserrat-latin-600-normal.woff"),
        "m500": ff("montserrat-latin-500-normal.woff"),
        "m800": ff("montserrat-latin-800-normal.woff"),
        "playi": ff("playfair-display-latin-400-italic.woff"),
    })
    if args.cues:
        build_timeline()
        json.dump(CUES, open(args.cues, "w"), indent=1)
    elif args.jobs > 1:
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
