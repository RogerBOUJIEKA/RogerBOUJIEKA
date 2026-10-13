"""Super-resolution Real-ESRGAN (modele officiel realesr-general-x4v3) sans PyTorch.

Les poids officiels (.pth) sont lus directement, le reseau SRVGGNetCompact est
reconstruit en ONNX une fois (mis en cache), puis execute avec onnxruntime, par tuiles.

Aucun modele de visage (GFPGAN, CodeFormer...) n'est utilise : le reseau agrandit
l'image entiere de facon uniforme, sans regenerer ni modifier les traits.
"""
import collections
import pickle
import urllib.request
import zipfile
from pathlib import Path

import numpy as np

CACHE = Path.home() / ".cache" / "miniatures"
BASE_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/"
# Modele general + variante "wdn" (garde la texture) : melange des poids comme l'option
# --denoise_strength de Real-ESRGAN (0 = texture/grain conserves, 1 = lissage maximal).
MODELES = ("realesr-general-x4v3.pth", "realesr-general-wdn-x4v3.pth")
ECHELLE = 4
_DTYPES = {"FloatStorage": np.float32, "HalfStorage": np.float16, "DoubleStorage": np.float64}
_STOCKAGES = {n: type(n, (), {}) for n in _DTYPES}


def charger_pth(chemin: Path) -> dict:
    """Lit un state_dict PyTorch (format zip) en tableaux numpy, sans executer de code."""
    z = zipfile.ZipFile(chemin)
    racine = z.namelist()[0].split("/")[0]

    def tenseur(stockage, decalage, taille, pas, *_):
        octets = stockage.itemsize
        return np.lib.stride_tricks.as_strided(
            stockage[decalage:], shape=taille, strides=[s * octets for s in pas]).copy()

    class Lecteur(pickle.Unpickler):
        def find_class(self, module, nom):
            if (module, nom) == ("torch._utils", "_rebuild_tensor_v2"):
                return tenseur
            if module == "torch" and nom in _STOCKAGES:
                return _STOCKAGES[nom]
            if (module, nom) == ("collections", "OrderedDict"):
                return collections.OrderedDict
            raise pickle.UnpicklingError(f"classe refusee : {module}.{nom}")

        def persistent_load(self, pid):
            _, type_stockage, cle, _lieu, _n = pid
            return np.frombuffer(z.read(f"{racine}/data/{cle}"), dtype=_DTYPES[type_stockage.__name__])

    with z.open(f"{racine}/data.pkl") as f:
        donnees = Lecteur(f).load()
    return donnees.get("params", donnees.get("params_ema", donnees))


def construire_onnx(poids: dict, dest: Path) -> None:
    """SRVGGNetCompact : [conv, PReLU] x N, conv finale, pixel shuffle x4, + image agrandie (plus proche voisin)."""
    import onnx
    from onnx import TensorProto, helper, numpy_helper

    noeuds, inits = [], []
    indices = sorted({int(k.split(".")[1]) for k in poids})
    courant = "entree"
    for i in indices:
        w = poids[f"body.{i}.weight"]
        sortie = f"b{i}"
        if w.ndim == 4:
            inits += [numpy_helper.from_array(w, f"w{i}"), numpy_helper.from_array(poids[f"body.{i}.bias"], f"c{i}")]
            noeuds.append(helper.make_node("Conv", [courant, f"w{i}", f"c{i}"], [sortie], pads=[1, 1, 1, 1]))
        else:
            inits.append(numpy_helper.from_array(w.reshape(-1, 1, 1), f"w{i}"))
            noeuds.append(helper.make_node("PRelu", [courant, f"w{i}"], [sortie]))
        courant = sortie
    noeuds.append(helper.make_node("DepthToSpace", [courant], ["ps"], blocksize=ECHELLE, mode="CRD"))
    inits.append(numpy_helper.from_array(np.array([1, 1, ECHELLE, ECHELLE], np.float32), "echelles"))
    noeuds.append(helper.make_node("Resize", ["entree", "", "echelles"], ["base"], mode="nearest"))
    noeuds.append(helper.make_node("Add", ["ps", "base"], ["sortie"]))
    graphe = helper.make_graph(
        noeuds, "srvgg",
        [helper.make_tensor_value_info("entree", TensorProto.FLOAT, [1, 3, None, None])],
        [helper.make_tensor_value_info("sortie", TensorProto.FLOAT, [1, 3, None, None])], inits)
    modele = helper.make_model(graphe, opset_imports=[helper.make_opsetid("", 17)], ir_version=8)
    onnx.checker.check_model(modele)
    onnx.save(modele, dest)


def session(lissage: float = 0.5):
    import onnxruntime as ort

    CACHE.mkdir(parents=True, exist_ok=True)
    onx = CACHE / f"realesr-general-x4v3-lissage{lissage:.2f}.onnx"
    if not onx.exists():
        poids = []
        for nom in MODELES:
            pth = CACHE / nom
            if not pth.exists():
                urllib.request.urlretrieve(BASE_URL + nom, pth)
            poids.append(charger_pth(pth))
        general, wdn = poids
        melange = {k: lissage * general[k] + (1 - lissage) * wdn[k] for k in general}
        construire_onnx(melange, onx)
    return ort.InferenceSession(str(onx), providers=["CPUExecutionProvider"])


def agrandir(rgb: np.ndarray, sess=None, tuile: int = 256, marge: int = 12) -> np.ndarray:
    """rgb uint8 HxWx3 -> uint8 (4H)x(4W)x3, traite par tuiles avec recouvrement."""
    sess = sess or session()
    x = rgb.astype(np.float32).transpose(2, 0, 1)[None] / 255.0
    _, _, h, w = x.shape
    out = np.zeros((3, h * ECHELLE, w * ECHELLE), np.float32)
    for y0 in range(0, h, tuile):
        for x0 in range(0, w, tuile):
            y1, x1 = min(y0 + tuile, h), min(x0 + tuile, w)
            py0, px0 = max(y0 - marge, 0), max(x0 - marge, 0)
            py1, px1 = min(y1 + marge, h), min(x1 + marge, w)
            r = sess.run(None, {"entree": x[:, :, py0:py1, px0:px1]})[0][0]
            oy, ox = (y0 - py0) * ECHELLE, (x0 - px0) * ECHELLE
            out[:, y0 * ECHELLE:y1 * ECHELLE, x0 * ECHELLE:x1 * ECHELLE] = \
                r[:, oy:oy + (y1 - y0) * ECHELLE, ox:ox + (x1 - x0) * ECHELLE]
    return (np.clip(out, 0, 1).transpose(1, 2, 0) * 255 + 0.5).astype(np.uint8)
