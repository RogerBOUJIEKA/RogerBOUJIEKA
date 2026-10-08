"""Split a full voice-over take into its 13 lines.
Every pause ≥ 0.18 s is a candidate cut; dynamic programming picks the 12 cuts whose segment lengths best match
each line's share of the text (character count), so pauses inside a line ("Une idée. Un projet.") are not mistaken for line ends.
python3 scripts/split_vo.py audio/raw/vo_d.mp3 [--write audio/raw/lines]"""
import sys, subprocess, json, os
import numpy as np
SR = 48000
LINES = [
    "Une idée. Un projet. Un évènement. Une marque à lancer…",
    "Mais cinq prestataires, cinq interlocuteurs… et zéro cohérence.",
    "Et si un seul partenaire faisait tout ?",
    "Bovann Group. Expertise, innovation, résultats.",
    "Évènementiel : des expériences qui marquent les esprits.",
    "Communication : votre visibilité amplifiée sur tous vos canaux.",
    "Informatique : sites web, applications web et mobiles sur mesure.",
    "Formations : de l'initiation à la spécialisation.",
    "Management : comprendre avant d'agir, anticiper plutôt que subir.",
    "Cinq expertises. Un seul partenaire.",
    "Ils nous font confiance.",
    "Transformons vos idées en succès tangibles.",
    "Prenez rendez-vous dès aujourd'hui. Bovann Group, à Lomé.",
]
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def pauses(x, hop=480):
    e = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same"))[::hop]
    thr = max(0.006, np.percentile(e, 95) * 0.035)
    v = e > thr
    first, last = int(np.argmax(v)), len(v) - int(np.argmax(v[::-1]))
    gaps, i = [], first
    while i < last:
        if not v[i]:
            j = i
            while j < last and not v[j]: j += 1
            if j - i >= 18: gaps.append((i * hop / SR, j * hop / SR))
            i = j
        else: i += 1
    return first * hop / SR, last * hop / SR, gaps
def split(x):
    t0, t1, gaps = pauses(x)
    w = np.array([len(l) for l in LINES], float)
    speech = (t1 - t0) - sum(b - a for a, b in gaps) * 0.5
    exp = w / w.sum() * speech
    G = len(gaps)
    # dp[k][g]: best cost having ended line k at gap g (g = -1 is the start)
    INF = 1e18
    starts = [t0] + [b for a, b in gaps]
    ends = [a for a, b in gaps] + [t1]
    gl = [b - a for a, b in gaps]
    dp = np.full((13, G + 1), INF); bk = np.zeros((13, G + 1), int)
    def cost(k, s, e, gi):
        d = ends[e] - starts[s]
        c = ((d - exp[k]) / exp[k]) ** 2
        if gi is not None: c -= 0.6 * min(gl[gi], 1.2)  # prefer long pauses as line ends
        return c
    for e in range(G + 1):  # line 0 from start
        dp[0][e] = cost(0, 0, e, e if e < G else None)
    for k in range(1, 13):
        for e in range(k, G + 1):
            for s in range(k - 1, e):
                c = dp[k - 1][s] + cost(k, s + 1, e, e if e < G else None)
                if c < dp[k][e]: dp[k][e], bk[k][e] = c, s
    segs, e = [], G
    for k in range(12, -1, -1):
        s = bk[k][e] if k else -1
        segs.append((starts[s + 1], ends[e]))
        e = s
    return segs[::-1], dp[12][G]
if __name__ == "__main__":
    x = load(sys.argv[1])
    segs, c = split(x)
    print(os.path.basename(sys.argv[1]), " ".join(f"{b - a:.2f}" for a, b in segs), f" cost {c:.2f}")
    if "--write" in sys.argv:
        out = sys.argv[sys.argv.index("--write") + 1]; os.makedirs(out, exist_ok=True)
        for k, (a, b) in enumerate(segs):
            np.save(f"{out}/line{k:02d}.npy", x[max(0, int((a - 0.04) * SR)): int((b + 0.1) * SR)])
        json.dump(segs, open(f"{out}/segs.json", "w"))
