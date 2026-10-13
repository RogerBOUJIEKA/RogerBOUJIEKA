#!/usr/bin/env python3
"""Detoure une ou plusieurs photos (suppression du fond) pour les miniatures.

Usage :
    python3 detourer.py photo1.jpg [photo2.jpg ...] [-o dossier] [--buste 0.6] [--modele isnet-general-use]

Sortie : <nom>_detoure.png (fond transparent, recadre au plus pres du sujet).
--buste F : ne garde que la fraction F superieure du sujet (cadrage buste/tete).
"""
import argparse
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import new_session, remove


def detourer(src: Path, dest_dir: Path, session, buste: float | None) -> Path:
    img = Image.open(src).convert("RGB")
    out = remove(img, session=session, post_process_mask=True)

    # Adoucit legerement le bord du masque pour eviter l'effet "decoupe ciseaux".
    alpha = out.getchannel("A").filter(ImageFilter.GaussianBlur(0.8))
    alpha = alpha.point(lambda a: 0 if a < 12 else a)
    out.putalpha(alpha)

    bbox = alpha.getbbox()
    if bbox:
        out = out.crop(bbox)
    if buste:
        out = out.crop((0, 0, out.width, max(1, int(out.height * buste))))
        bbox = out.getchannel("A").getbbox()
        if bbox:
            out = out.crop(bbox)

    dest = dest_dir / f"{src.stem}_detoure.png"
    out.save(dest)
    return dest


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("photos", nargs="+", type=Path)
    p.add_argument("-o", "--sortie", type=Path, help="dossier de sortie (defaut : a cote de la photo)")
    p.add_argument("--buste", type=float, help="fraction superieure du sujet a garder, ex 0.6")
    p.add_argument("--modele", default="isnet-general-use",
                   help="modele rembg (isnet-general-use, u2net_human_seg, birefnet-portrait...)")
    args = p.parse_args()

    session = new_session(args.modele)
    for photo in args.photos:
        dest_dir = args.sortie or photo.parent
        dest_dir.mkdir(parents=True, exist_ok=True)
        print(detourer(photo, dest_dir, session, args.buste))


if __name__ == "__main__":
    main()
