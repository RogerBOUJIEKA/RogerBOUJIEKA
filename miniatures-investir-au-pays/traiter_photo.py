#!/usr/bin/env python3
"""Traitement photo pro des personnes, AVANT detourage (regle 7 de CHARTE.md).

    python3 traiter_photo.py photo1.jpg [photo2.jpg ...] [-o dossier] [options]

Etapes : diagnostic -> debruitage leger -> super-resolution Real-ESRGAN (si la photo est
petite ou molle) -> balance des blancs / exposition / contraste -> nettete moderee.

REGLE ABSOLUE : le visage n'est jamais modifie. Aucun modele de visage (GFPGAN, CodeFormer)
ni aucune beautification : uniquement des operations globales sur toute l'image.
Pour chaque photo, le script produit :
  <nom>_traite.png       la photo traitee, a detourer ensuite ;
  <nom>_comparaison.png  l'original et le traite cote a cote, avec un zoom sur le visage, A OUVRIR ;
et il affiche un score de ressemblance du visage (structure comparee a l'original).
"""
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

import superres

ICI = Path(__file__).parent
SEUIL_RESSEMBLANCE = 0.85


# --- diagnostic ---------------------------------------------------------------

def niveau_bruit(gris: np.ndarray) -> float:
    """Ecart-type du bruit estime (methode de Immerkaer), en niveaux sur 255."""
    k = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], np.float32)
    h, w = gris.shape
    sigma = np.abs(cv2.filter2D(gris.astype(np.float32), -1, k)).sum()
    return float(sigma * np.sqrt(0.5 * np.pi) / (6 * (w - 2) * (h - 2)))


def nettete(gris: np.ndarray) -> float:
    return float(cv2.Laplacian(gris, cv2.CV_64F).var())


# --- corrections (globales, identiques sur toute l'image) ----------------------

def _lineaire(rgb8):
    x = rgb8.astype(np.float32) / 255
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def _srgb(lin):
    x = np.clip(lin, 0, 1)
    return (np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055) * 255 + 0.5).astype(np.uint8)


def balance_des_blancs(rgb: np.ndarray, force: float = 0.85, forcee: bool = False) -> tuple[np.ndarray, str]:
    """Neutralise la dominante par des gains R/G/B (comme un pipette "gris" Photoshop).

    Les gains sont mesures sur les pixels les plus neutres de l'image (fond gris, chemise
    blanche, murs), PAS sur toute l'image : une moyenne globale tirerait la peau vers le
    bleu. Les gains multiplicatifs en lumiere lineaire inversent une vraie dominante sans
    denaturer les tons fonces (peau).
    """
    # Un fond blanc pur (studio) prouve que la photo est deja equilibree : on n'y touche pas.
    blanc_pur = (rgb.min(axis=2) >= 250).mean()
    if blanc_pur > 0.03 and not forcee:
        return rgb, f"balance des blancs : fond blanc pur ({blanc_pur:.0%}), photo deja neutre, inchangee"
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    L, chroma = lab[..., 0], np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
    utiles = (L > 40) & (rgb.max(axis=2) < 250)  # pas de pixels ecretes
    if utiles.mean() < 0.05:
        return rgb, "balance des blancs : image trop sombre ou brulee, inchangee"
    seuil = np.percentile(chroma[utiles], 8)
    neutres = utiles & (chroma <= seuil)
    # Seuls des gris VRAIMENT neutres servent de reference (une chemise bleu clair, un mur
    # beige ne sont pas des gris) : au-dela de 15, on ne corrige pas.
    # --forcer-balance (dominante vue a l'oeil) : tolere des gris franchement teintes.
    if seuil > (35 if forcee else 15) or neutres.sum() < 500:
        return rgb, f"balance des blancs : pas de zone neutre fiable (chroma min {seuil:.0f}), inchangee"
    lin = _lineaire(rgb)
    moy = lin[neutres].mean(axis=0)
    gains = moy.mean() / np.maximum(moy, 1e-4)
    gains = np.clip(1 + (gains - 1) * force, 0.6, 1.6)
    gains /= gains @ [0.2126, 0.7152, 0.0722]  # luminance conservee
    if np.abs(gains - 1).max() < 0.02:
        return rgb, "balance des blancs : deja neutre"
    return _srgb(lin * gains), f"balance des blancs : gains R{gains[0]:.2f} V{gains[1]:.2f} B{gains[2]:.2f}"


def exposition_contraste(rgb: np.ndarray, boite) -> tuple[np.ndarray, str]:
    """Points noir/blanc doux sur l'image, puis exposition reglee sur le VISAGE (pas sur le fond)."""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[..., 0]
    p05, p995 = np.percentile(L, [0.5, 99.5])
    bas, haut = p05 * 0.5, 255 - (255 - p995) * 0.5
    L = np.clip((L - p05) / max(p995 - p05, 1) * (haut - bas) + bas, 0, 255)
    x, y, w, h = boite
    zone, chroma = L[y:y + h, x:x + w], np.hypot(*(lab[y:y + h, x:x + w, i] - 128 for i in (1, 2)))
    peau = (chroma > 10) & (zone > 25) & (zone < 250)  # exclut fond gris et cheveux noirs
    if peau.mean() < 0.05:
        lab[..., 0] = L
        out = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
        return out, f"exposition : niveaux {p05:.0f}-{p995:.0f} etires (doux), peau non reperee : pas de gamma"
    visage = np.median(zone[peau]) / 255
    # On ne fait que rattraper un visage SUREXPOSE. On n'eclaircit jamais une peau foncee :
    # ce serait changer la couleur de peau. Une photo sous-exposee est deja rattrapee par les
    # niveaux ci-dessus (points noir/blanc).
    cible = min(visage, 0.72)
    gamma = 1.0
    if abs(cible - visage) > 0.01:
        gamma = float(np.clip(np.log(cible) / np.log(max(visage, 1e-3)), 0.7, 1.4))
        gamma = 1 + (gamma - 1) * 0.6
        L = 255 * (L / 255) ** gamma
    lab[..., 0] = L
    out = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
    return out, f"exposition : niveaux {p05:.0f}-{p995:.0f} etires (doux), peau du visage a {visage:.0%}, gamma {gamma:.2f}"


def fidelite(orig: np.ndarray, sr: np.ndarray) -> np.ndarray:
    """Garantit que les traits ne bougent pas : formes et volumes (basses frequences) pris
    sur l'ORIGINAL agrandi classiquement ; Real-ESRGAN n'apporte que le detail fin.
    Un artefact qui deformerait un oeil, une bouche ou un contour est ainsi elimine."""
    H, W = sr.shape[:2]
    base = cv2.resize(orig, (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    srf = sr.astype(np.float32)
    s = 0.6 * W / orig.shape[1]  # ~0.6 pixel de l'original
    detail = np.clip(srf - cv2.GaussianBlur(srf, (0, 0), s), -40, 40)
    return np.clip(cv2.GaussianBlur(base, (0, 0), s) + detail, 0, 255).astype(np.uint8)


def accentuer(rgb: np.ndarray, quantite: float, rayon: float) -> np.ndarray:
    """Masque flou sur la luminance uniquement (pas de halo colore)."""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    flou = cv2.GaussianBlur(lab[..., 0], (0, 0), rayon)
    lab[..., 0] = np.clip(lab[..., 0] + quantite * (lab[..., 0] - flou), 0, 255)
    return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB)


# --- controle de ressemblance ------------------------------------------------

def detecter_visage(rgb: np.ndarray):
    """Boite (x, y, w, h) autour du visage. Sans detecteur disponible : zone tete d'un portrait."""
    h, w = rgb.shape[:2]
    if hasattr(cv2, "CascadeClassifier"):
        gris = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        m = max(30, min(gris.shape) // 12)
        visages = cascade.detectMultiScale(gris, 1.1, 5, minSize=(m, m))
        if len(visages):
            x, y, bw, bh = max(visages, key=lambda r: r[2] * r[3])
            # Cadre elargi (front, cheveux, menton).
            return max(0, x - bw // 3), max(0, y - bh // 2), bw + 2 * (bw // 3), bh + bh // 2 + bh // 3
    return w // 4, h // 20, w // 2, int(h * 0.5)


def ssim(a: np.ndarray, b: np.ndarray) -> float:
    a, b = a.astype(np.float64), b.astype(np.float64)
    # On compare la STRUCTURE (traits) : moyenne et contraste sont normalises, car la
    # correction de couleur/exposition est voulue.
    a, b = (a - a.mean()) / (a.std() + 1e-6), (b - b.mean()) / (b.std() + 1e-6)
    c = 1e-4
    flou = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)
    ma, mb = flou(a), flou(b)
    va, vb, cov = flou(a * a) - ma ** 2, flou(b * b) - mb ** 2, flou(a * b) - ma * mb
    return float(((2 * ma * mb + c) * (2 * cov + c) / ((ma ** 2 + mb ** 2 + c) * (va + vb + c))).mean())


def ressemblance(orig: np.ndarray, traite: np.ndarray, boite) -> float:
    """Score structurel du visage : traite ramene a la taille d'origine vs original."""
    h, w = orig.shape[:2]
    reduit = cv2.resize(traite, (w, h), interpolation=cv2.INTER_AREA)
    x, y, bw, bh = boite
    # Echelle des traits (visage ramene a 96 px de large, legerement floute) : on compare la
    # forme des yeux, du nez, de la bouche et du contour, pas le grain ou les artefacts JPEG.
    t = (96, max(8, round(96 * bh / bw)))
    g = lambda im: cv2.GaussianBlur(cv2.resize(cv2.cvtColor(im[y:y + bh, x:x + bw], cv2.COLOR_RGB2GRAY),
                                               t, interpolation=cv2.INTER_AREA), (0, 0), 1.0)
    return ssim(g(orig), g(reduit))


def comparaison(orig: np.ndarray, traite: np.ndarray, boite, score: float, dest: Path) -> None:
    H = 900
    redim = lambda im, h: Image.fromarray(im).resize((round(im.shape[1] * h / im.shape[0]), h), Image.LANCZOS)
    a, b = redim(orig, H), redim(traite, H)
    lignes = [(a, b)]
    if boite:
        x, y, w, h = boite
        k = traite.shape[0] / orig.shape[0]
        za = Image.fromarray(orig[y:y + h, x:x + w]).resize((H, round(H * h / w)), Image.LANCZOS)
        tb = traite[round(y * k):round((y + h) * k), round(x * k):round((x + w) * k)]
        zb = Image.fromarray(tb).resize(za.size, Image.LANCZOS)
        lignes.append((za, zb))
    largeur = max(p.width + q.width for p, q in lignes) + 30
    hauteur = sum(max(p.height, q.height) for p, q in lignes) + 60 * len(lignes)
    toile = Image.new("RGB", (largeur, hauteur), (30, 30, 30))
    d = ImageDraw.Draw(toile)
    try:
        police = ImageFont.truetype(str(ICI / "fonts" / "Anton.ttf"), 34)
    except OSError:
        police = ImageFont.load_default()
    y = 0
    for i, (p, q) in enumerate(lignes):
        zoom = " (zoom visage)" if i else ""
        d.text((10, y + 10), f"ORIGINAL{zoom}", fill="white", font=police)
        d.text((p.width + 40, y + 10), f"TRAITE{zoom} - ressemblance {score:.3f}", fill="white", font=police)
        toile.paste(p, (0, y + 60))
        toile.paste(q, (p.width + 30, y + 60))
        y += max(p.height, q.height) + 60
    toile.save(dest, quality=90)


# --- principal ----------------------------------------------------------------

def traiter(src: Path, dest_dir: Path, args, sess) -> None:
    orig = np.array(ImageOps.exif_transpose(Image.open(src)).convert("RGB"))
    h, w = orig.shape[:2]
    gris = cv2.cvtColor(orig, cv2.COLOR_RGB2GRAY)
    bruit, net = niveau_bruit(gris), nettete(gris)
    print(f"\n{src.name} : {w}x{h}, bruit {bruit:.1f}, nettete {net:.0f}")

    img = orig
    if not args.upscale_seul:
        h_deb = args.debruitage if args.debruitage is not None else float(np.clip((bruit - 2) * 1.5, 0, 7))
        if h_deb > 0:
            img = cv2.fastNlMeansDenoisingColored(img, None, h_deb, h_deb, 7, 21)
            print(f"  debruitage : intensite {h_deb:.1f}")

    if max(h, w) < args.cible or args.force_upscale:
        img = fidelite(img, superres.agrandir(img, sess))
        cible = min(args.cible, max(img.shape[:2]))
        k = cible / max(img.shape[:2])
        if k < 1:
            img = cv2.resize(img, (round(img.shape[1] * k), round(img.shape[0] * k)), interpolation=cv2.INTER_AREA)
        print(f"  super-resolution Real-ESRGAN x4 (avec garde de fidelite des traits) -> {img.shape[1]}x{img.shape[0]}")
    else:
        print("  resolution suffisante, pas d'upscale")

    boite = detecter_visage(orig)
    k = img.shape[0] / h
    boite_img = tuple(round(v * k) for v in boite)
    if not args.upscale_seul and not args.sans_couleur:
        img, msg1 = balance_des_blancs(img, forcee=args.forcer_balance)
        img, msg2 = exposition_contraste(img, boite_img)
        print(f"  {msg1}\n  {msg2}")
    if not args.upscale_seul:
        # Nettete moderee : la super-resolution a deja redonne du detail, on evite tout halo.
        img = accentuer(img, 0.35, max(0.8, max(img.shape[:2]) / 3000))
        print("  nettete : masque flou leger sur la luminance")

    score = ressemblance(orig, img, boite)
    alerte = "" if score >= SEUIL_RESSEMBLANCE else "  <-- A VERIFIER : relancer avec --sans-couleur ou --upscale-seul"
    print(f"  ressemblance du visage : {score:.3f}{alerte}")

    dest = dest_dir / f"{src.stem}_traite.png"
    Image.fromarray(img).save(dest)
    comparaison(orig, img, boite, score, dest_dir / f"{src.stem}_comparaison.png")
    print(f"  -> {dest}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("photos", nargs="+", type=Path)
    p.add_argument("-o", "--sortie", type=Path, help="dossier de sortie (defaut : a cote de la photo)")
    p.add_argument("--cible", type=int, default=3840, help="plus grand cote vise apres upscale (defaut 3840 = 4K)")
    p.add_argument("--force-upscale", action="store_true", help="upscale meme si la photo est deja grande")
    p.add_argument("--debruitage", type=float, help="intensite 0-10 (defaut : automatique selon le bruit mesure)")
    p.add_argument("--lissage", type=float, default=0.5,
                   help="lissage Real-ESRGAN 0-1 (0 = garde le grain naturel, 1 = lisse ; defaut 0.5)")
    p.add_argument("--forcer-balance", action="store_true",
                   help="dominante forte vue a l'oeil : corrige meme si les gris de reference sont tres teintes")
    p.add_argument("--sans-couleur", action="store_true", help="pas de correction de couleur/exposition")
    p.add_argument("--upscale-seul", action="store_true", help="uniquement la super-resolution, rien d'autre")
    args = p.parse_args()

    sess = superres.session(args.lissage)
    for photo in args.photos:
        dest_dir = args.sortie or photo.parent
        dest_dir.mkdir(parents=True, exist_ok=True)
        traiter(photo, dest_dir, args, sess)


if __name__ == "__main__":
    main()
