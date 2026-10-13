#!/usr/bin/env python3
"""Cree des images de REMPLACEMENT pour tester le generateur (pas de vraies photos).

- images/ville.jpg, images/chantier.jpg, images/immeuble.jpg : fonds
- images/philippe.jpg, images/invite.jpg : silhouettes "photo studio" a detourer
"""
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).parent / "images"
OUT.mkdir(exist_ok=True)
W, H = 1600, 900
random.seed(7)


def ciel(haut, bas):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(haut[i] * (1 - t) + bas[i] * t) for i in range(3)))
    return img, d


def ville():
    img, d = ciel((20, 40, 110), (250, 140, 60))
    for _ in range(38):
        bw, bh = random.randint(70, 180), random.randint(200, 720)
        x = random.randint(-50, W)
        col = random.choice([(35, 35, 50), (55, 50, 60), (70, 60, 55), (30, 45, 60)])
        d.rectangle([x, H - bh, x + bw, H], fill=col)
        for wy in range(H - bh + 15, H - 10, 26):
            for wx in range(x + 10, x + bw - 12, 22):
                if random.random() < 0.55:
                    d.rectangle([wx, wy, wx + 10, wy + 14], fill=(255, 210, 120))
    d.rectangle([0, H - 60, W, H], fill=(25, 25, 25))
    img.save(OUT / "ville.jpg", quality=92)


def chantier():
    img, d = ciel((120, 170, 220), (230, 210, 170))
    d.rectangle([0, H - 180, W, H], fill=(150, 110, 70))  # terre
    for k in range(4):  # poteaux beton + parpaings
        x0 = 250 + k * 300
        d.rectangle([x0, 330, x0 + 40, H - 160], fill=(150, 150, 145))
        for y in range(H - 160, 430, -40):
            d.rectangle([x0 + 40, y - 36, x0 + 300 if k < 3 else x0 + 40, y], outline=(110, 110, 105), fill=(175, 172, 165))
    for x in range(200, 1300, 60):  # echafaudage
        d.line([(x, 300), (x, H - 160)], fill=(90, 70, 40), width=6)
    d.line([(1350, 80), (1350, H - 180)], fill=(240, 180, 0), width=22)  # grue
    d.line([(900, 90), (1580, 90)], fill=(240, 180, 0), width=18)
    d.line([(1100, 90), (1100, 380)], fill=(40, 40, 40), width=3)
    img.save(OUT / "chantier.jpg", quality=92)


def immeuble():
    img, d = ciel((40, 110, 210), (170, 210, 245))
    d.rectangle([0, H - 120, W, H], fill=(60, 120, 50))
    d.rectangle([350, 120, 1250, H - 110], fill=(235, 230, 220))
    for y in range(150, H - 150, 70):
        for x in range(390, 1220, 90):
            d.rectangle([x, y, x + 60, y + 48], fill=(70, 130, 180))
        d.rectangle([350, y + 52, 1250, y + 60], fill=(200, 195, 185))
    for x in (250, 1350, 1470):  # palmiers
        d.line([(x, H - 110), (x + 10, 520)], fill=(110, 80, 50), width=14)
        d.ellipse([x - 70, 470, x + 90, 560], fill=(40, 140, 60))
    img.save(OUT / "immeuble.jpg", quality=92)


def personne(nom, costume, chemise, peau):
    img = Image.new("RGB", (1000, 1200), (205, 205, 200))
    d = ImageDraw.Draw(img)
    d.ellipse([90, 700, 910, 1500], fill=costume)  # epaules / buste
    d.polygon([(500, 720), (420, 760), (500, 1200), (580, 760)], fill=chemise)
    d.rectangle([440, 560, 560, 760], fill=peau)  # cou
    d.ellipse([340, 220, 660, 640], fill=peau)  # tete
    d.chord([340, 200, 660, 470], 180, 360, fill=(25, 20, 18))  # cheveux
    d.ellipse([405, 400, 445, 425], fill=(30, 20, 15))
    d.ellipse([555, 400, 595, 425], fill=(30, 20, 15))
    d.arc([430, 470, 570, 560], 20, 160, fill=(90, 40, 30), width=8)
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    img.save(OUT / f"{nom}.jpg", quality=92)


ville()
chantier()
immeuble()
personne("philippe", (20, 30, 60), (240, 240, 240), (120, 80, 55))
personne("invite", (110, 20, 25), (250, 250, 250), (95, 62, 42))
print("images de remplacement creees dans", OUT)
