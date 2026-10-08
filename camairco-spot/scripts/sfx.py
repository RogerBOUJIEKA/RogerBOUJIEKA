"""Sound design for the 15 s cut, on the same timeline as src/spot.js (object T)."""
import sys
from sfxlib import Mix, whoosh, impact, shimmer, click, ding, zip_up, chime, stamp, ratchet, jet_flyby

m = Mix(15.0)
put = m.put

# ── timeline (seconds), mirrors T in src/spot.js ──
# intro: riser into the star flash, impact, sparkles, star flight
put(whoosh(0.46, 400, 7000, 0.95, 1.1, 3.0), 0.0, 0.35)
put(impact(80, 40), 0.42, 0.75)
put(shimmer(1.4, 22, seed=1), 0.42, 0.22)
put(whoosh(0.6, 3000, 700, 0.35, 0.8), 0.52, 0.28, -0.2)
# departures list: badge clicks + a soft pop per city
for t0 in (0.914, 1.479, 2.39):
    for k in range(4):
        put(click(2200 + 400 * k), t0 + k * 0.07, 0.16, -0.5)
    put(ding((1760, 2637), 0.6, 0.12), t0 + 0.05, 0.08, -0.3)
put(zip_up(0.45, 300, 900), 1.479, 0.10, 0.2); put(zip_up(0.6, 300, 900), 2.35, 0.10, 0.3)
# pull back to space
put(whoosh(0.9, 250, 4500, 0.62, 1.0, 2.2), 2.78, 0.5)
put(impact(55, 30, 1.2), 3.55, 0.25)
# jet fly-by (left → right)
put(jet_flyby(), 3.1, 0.3)
# push into the route map
put(whoosh(0.8, 5000, 400, 0.55, 0.9), 4.95, 0.38)
# routes: flap clatter, launch zip, arrival ding
for t0 in (5.345, 6.159, 6.908, 7.896):
    for cell in range(3):
        for k in range(4):
            put(click(1800 + 300 * cell, 0.025, 0.005), t0 + cell * 0.06 + k * 0.085, 0.14, -0.6 + cell * 0.1)
for t0, d in ((5.395, 0.55), (6.189, 0.6), (6.928, 0.55), (7.916, 0.55), (8.2, 0.4), (8.3, 0.4)):
    put(zip_up(), t0, 0.07, 0.3)
    put(ding(), t0 + d - 0.05, 0.11, 0.35)
# tri-colour wipe
for k, f in enumerate((900, 1300, 1800)):
    put(whoosh(0.35, f * 3, f, 0.4, 0.7), 8.5 + k * 0.06, 0.3, -0.6 + k * 0.6)
# boarding pass: swish in, stamp, swish out
put(whoosh(0.5, 4000, 900, 0.45, 0.8), 8.66, 0.28, 0.5)
put(stamp(), 9.71, 0.6, 0.35)
put(whoosh(0.4, 900, 5000, 0.6, 0.8), 9.95, 0.3, 0.6)
# cabin: chime, blind
put(chime(), 10.02, 0.12, 0.25)
put(ratchet(), 10.18, 0.12, 0.45)
# dive into the sun → logo hit (lands with the music hit at 12.38)
put(whoosh(0.5, 300, 9000, 0.92, 1.2, 3.0), 11.9, 0.4)
put(impact(75, 36, 2.2), 12.36, 0.7)
put(shimmer(2.0, 30, seed=7), 12.36, 0.25)
put(shimmer(0.9, 14, 4000, 11000, seed=9), 14.15, 0.16)

m.save(sys.argv[1] if len(sys.argv) > 1 else "audio/sfx.wav")
