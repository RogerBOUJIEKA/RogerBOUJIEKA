"""Sound design for the 88 s cut, on the same timeline as long/src/long.js (object L)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
from sfxlib import Mix, whoosh, impact, shimmer, click, ding, zip_up, chime, stamp, ratchet, jet_flyby  # noqa: E402

m = Mix(88.0)
put = m.put


def ticks(t0, t1, n, gain=0.1, f=2400, pan=0.0, ease=1.0):
    """n clicks spread over [t0, t1]; ease > 1 spaces them out towards the end (deceleration)."""
    for k in range(n):
        put(click(f, 0.02, 0.004), t0 + (t1 - t0) * (k / max(1, n - 1)) ** ease, gain, pan)


# SC1 · l'étoile
put(whoosh(1.9, 300, 6000, 0.97, 1.2, 3.0), 0.05, 0.28)
put(shimmer(1.2, 10, seed=3), 0.5, 0.08)
put(impact(80, 40), 1.95, 0.75)
put(shimmer(1.6, 24, seed=1), 1.95, 0.2)
put(whoosh(1.0, 400, 7000, 0.92, 1.1, 3.0), 5.95, 0.4)
put(impact(60, 32, 1.4), 6.95, 0.4)
# SC2 · depuis 2011
ticks(7.55, 8.75, 22, 0.08, 2600, 0.0, 1.8)
put(ding((1568, 2349), 0.8, 0.2), 8.95, 0.1)
ticks(10.12, 11.4, 28, 0.05, 3200, -0.2)
put(whoosh(0.5, 1500, 5000, 0.5, 0.7), 11.5, 0.15)
put(whoosh(0.45, 900, 4000, 0.6, 0.8), 12.35, 0.2)
for t0, pan in ((13.25, -0.6), (14.08, 0.0), (15.15, 0.6)):
    put(whoosh(0.7, 3000, 6000, 0.4, 0.5), t0, 0.08, pan)
    put(ding((1760, 2637), 0.6, 0.15), t0 + 0.15, 0.07, pan)
put(whoosh(0.8, 5000, 800, 0.6, 0.9), 16.2, 0.35, 0.4)
put(impact(70, 40, 1.0), 16.95, 0.3)
# SC3 · réseau national
for t0 in (18.18, 19.14, 21.17, 21.95, 22.86):
    ticks(t0, t0 + 0.21, 4, 0.13, 2400, -0.5)
    put(ding((1760, 2637), 0.6, 0.12), t0 + 0.05, 0.07, 0.3)
for t0 in (19.04, 20.55, 21.33, 22.31):
    put(zip_up(), t0, 0.07, 0.3)
put(whoosh(1.0, 250, 4500, 0.62, 1.0, 2.2), 23.95, 0.5)
put(impact(55, 30, 1.2), 24.85, 0.25)
# SC4 · le ciel d'Afrique + routes
put(jet_flyby(2.8), 25.9, 0.3)
ticks(27.02, 27.5, 9, 0.05, 3000, -0.6)
put(whoosh(0.85, 5000, 400, 0.55, 0.9), 29.5, 0.38)
for t0 in (30.06, 31.14, 32.15, 33.17, 34.38, 35.45):
    for cell in range(3):
        ticks(t0 + cell * 0.06, t0 + cell * 0.06 + 0.255, 4, 0.12, 1800 + 300 * cell, -0.6 + cell * 0.1)
    put(zip_up(), t0, 0.06, 0.3)
    put(ding(), t0 + 0.5, 0.1, 0.35)
for k, f in enumerate((900, 1300, 1800)):
    put(whoosh(0.35, f * 3, f, 0.4, 0.7), 36.45 + k * 0.06, 0.3, -0.6 + k * 0.6)
# SC5 · flotte (blueprint)
put(whoosh(1.6, 2500, 4500, 0.5, 0.4, 1.0), 38.0, 0.07, -0.3)
put(whoosh(1.6, 2500, 4500, 0.5, 0.4, 1.0), 40.5, 0.07, 0.3)
put(whoosh(0.6, 1200, 3500, 0.5, 0.8), 40.25, 0.15)
put(whoosh(0.9, 2000, 5000, 0.6, 0.5, 1.2), 43.15, 0.1)
for k in range(4):
    put(ding((1200, 1800), 0.9, 0.35), 43.3 + k * 0.6, 0.05, 0)
put(impact(70, 40, 1.0), 44.45, 0.3)
put(ding((1318.5, 1975.5), 1.0, 0.3), 44.5, 0.12)
put(whoosh(0.8, 300, 3000, 0.7, 0.9, 2.0), 46.6, 0.3)
# SC6 · Star Miles
put(whoosh(0.6, 4000, 900, 0.45, 0.8), 47.7, 0.28, 0.2)
put(shimmer(0.8, 10, 4000, 10000, seed=5), 48.3, 0.1)
for k in range(3):
    put(zip_up(0.35, 700, 1900), 51.32 + k * 0.55, 0.08, -0.5)
ticks(51.35, 53.45, 30, 0.04, 3400, 0.1, 1.4)
put(ding((2093, 3136), 1.2, 0.4), 53.5, 0.13)
put(shimmer(0.8, 12, seed=8), 53.5, 0.1)
for t0, pan in ((54.01, -0.5), (54.97, 0.0), (56.29, 0.5)):
    put(whoosh(0.35, 3000, 1200, 0.4, 0.6), t0 - 0.08, 0.12, pan)
    put(ding((1568, 2349), 0.5, 0.12), t0 + 0.1, 0.08, pan)
put(whoosh(0.5, 900, 3000, 0.5, 0.7), 58.6, 0.22)
put(whoosh(0.7, 400, 6000, 0.85, 1.0, 2.5), 59.0, 0.3)
# SC7 · cabine (music breakdown: keep it soft)
put(chime(), 59.85, 0.11, 0.25)
put(whoosh(0.8, 2500, 4500, 0.5, 0.4, 1.0), 60.8, 0.05, -0.3)
put(whoosh(0.8, 2500, 4500, 0.5, 0.4, 1.0), 61.75, 0.05, 0.3)
put(whoosh(0.4, 1500, 600, 0.4, 0.7), 62.55, 0.12, -0.4)
put(ratchet(), 63.08, 0.1, 0.45)
for t0 in (66.21, 67.18, 68.2):
    put(ding((1760, 2637), 0.6, 0.15), t0, 0.06, -0.3)
put(whoosh(0.55, 600, 6000, 0.55, 0.8, 1.5), 69.25, 0.4, 0.6)
# SC8 · réservation
put(whoosh(0.6, 3000, 800, 0.4, 0.8), 69.9, 0.22, 0.4)
ticks(70.9, 71.8, 18, 0.05, 3600, 0.4)
put(click(1800, 0.03, 0.006), 71.42, 0.12, 0.4)
put(click(1600, 0.04, 0.008), 71.86, 0.16, 0.4)
put(whoosh(0.45, 1200, 3500, 0.5, 0.7), 72.2, 0.15, 0.4)
put(ding((1318.5, 1975.5, ), 1.0, 0.3), 72.6, 0.13, 0.4)
ticks(72.43, 73.95, 12, 0.07, 2800, -0.4)
roar = whoosh(3.4, 180, 1400, 0.75, 1.4, 1.5)
put(roar, 75.2, 0.35)
put(whoosh(0.9, 300, 9000, 0.92, 1.2, 3.0), 78.5, 0.45)
put(impact(75, 36, 2.6), 79.42, 0.75)
put(shimmer(2.2, 32, seed=7), 79.42, 0.25)
# SC9 · signature
put(shimmer(1.0, 14, 4000, 11000, seed=9), 84.4, 0.15)

m.save(sys.argv[1] if len(sys.argv) > 1 else "audio/sfx.wav")
