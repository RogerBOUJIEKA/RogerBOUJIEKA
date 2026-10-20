"""Place les segments de voix off sur la timeline du spot (89 s) et
aligne les moments forts sur la grille musicale (72 BPM).

Usage : python build_timeline.py voix_off.json durations.json timeline.json
"""
import json
import math
import sys

TOTAL = 89.0
BPM = 72
BEAT = 60.0 / BPM
BAR = 4 * BEAT
INTRO = 3.6          # titre d'ouverture avant la première phrase
GAP_SCALE = 1.05     # respiration supplémentaire entre les phrases
REVEAL_DELAY = 0.30  # le logo éclate juste après « découvre Agapéo »

# Segments dont le début doit tomber sur une demi-mesure (changement de section musicale)
BAR_ANCHORS = {"L10", "L15", "L18"}


def main(lines_path, durations_path, out_path):
    lines = json.load(open(lines_path))
    durations = json.load(open(durations_path))

    t = INTRO
    segs = []
    grid0 = None
    for lid, text, gap in lines:
        if grid0 is not None and lid in BAR_ANCHORS:
            k = math.ceil((t - grid0) / (BAR / 2) - 1e-6)
            t = grid0 + k * BAR / 2
        dur = durations[lid]
        segs.append({"id": lid, "text": text, "start": round(t, 3), "end": round(t + dur, 3)})
        t += dur
        if lid == "L06":
            grid0 = t + REVEAL_DELAY  # première mesure de la grille = révélation du logo
        t += gap * GAP_SCALE

    by_id = {s["id"]: s for s in segs}
    timeline = {
        "total": TOTAL,
        "bpm": BPM,
        "bar": BAR,
        "grid0": round(grid0, 3),
        "reveal": round(grid0, 3),
        "segments": segs,
        "cues": {
            "climax": by_id["L15"]["start"],
            "switch": by_id["L18"]["start"],
            "cta": by_id["L19"]["start"],
            "endcard": by_id["L20"]["start"],
        },
    }
    json.dump(timeline, open(out_path, "w"), indent=1, ensure_ascii=False)
    last = segs[-1]["end"]
    print(f"grid0={grid0:.2f}  last VO end={last:.2f}  tail={TOTAL - last:.2f}s")
    for s in segs:
        print(f'{s["id"]:5s} {s["start"]:6.2f} -> {s["end"]:6.2f}  {s["text"]}')


if __name__ == "__main__":
    main(*sys.argv[1:4])
