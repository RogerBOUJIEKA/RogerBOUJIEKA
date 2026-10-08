"""Synthesized sound design for the 84 s spot, placed on the brief's timestamps.
python3 scripts/sfx.py audio/sfx.wav"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from sfxlib import Mix, SR, tt, band_noise, reverb, whoosh, impact, shimmer, click, ding, zip_up, chime, stamp

rs = np.random.default_rng(84)
m = Mix(88.0)


def pan_sweep(sig, p0, p1):
    a = (np.linspace(p0, p1, len(sig)) + 1) * np.pi / 4
    return np.stack([sig * np.cos(a), sig * np.sin(a)], 1)


def cut_whoosh(t_peak, p0=0.0, p1=0.0, d=0.55, g=0.55):
    w = whoosh(d, 300, 5000, 0.8, 0.9, 2.2)
    m.put(pan_sweep(w, p0, p1), t_peak - 0.8 * d, g)


def tick_whoosh(t):
    m.put(whoosh(0.22, 1200, 6000, 0.55, 0.7, 1.6), t - 0.12, 0.25)
    m.put(click(3200, 0.03, 0.004), t, 0.35)


def pop(t, g=0.3, f=900):
    u = tt(0.12)
    x = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-u / 0.01))) / SR) * np.exp(-u / 0.03)
    m.put(x, t, g, rs.uniform(-0.3, 0.3))


def blip(t, f=1400, g=0.18, pan=0.0):
    u = tt(0.16)
    x = (np.sin(2 * np.pi * f * u) + 0.4 * np.sin(2 * np.pi * f * 1.5 * u)) * ((u % 0.08) < 0.05) * np.exp(-u / 0.12)
    m.put(x, t, g, pan)


def ping(t, g=0.16, pan=0.0):
    m.put(ding((1760, 2637), 0.5, 0.12), t, g, pan)


def sub_drop(t, f0=60, f1=35, d=0.6, g=0.9):
    u = tt(d + 0.6)
    f = f1 + (f0 - f1) * np.clip(1 - u / d, 0, 1)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-np.maximum(0, u - d * 0.5) / 0.35) * np.minimum(1, u / 0.005)
    m.put(np.tanh(x * 1.4), t, g)


def hit(t, g=0.6, f=110):
    u = tt(0.5)
    body = np.sin(2 * np.pi * np.cumsum(f * (1 + np.exp(-u / 0.02))) / SR) * np.exp(-u / 0.12)
    snap = sosfilt(butter(2, [800, 5000], "band", fs=SR, output="sos"), rs.standard_normal(len(u))) * np.exp(-u / 0.02)
    m.put(reverb(body + 0.7 * snap, 0.8, 0.25), t, g)


def pluck_note(t, freq, g=0.2, pan=0.0):
    u = tt(0.5)
    x = (np.sin(2 * np.pi * freq * u) + 0.3 * np.sin(4 * np.pi * freq * u)) * np.exp(-u / 0.12) * np.minimum(1, u / 0.002)
    m.put(reverb(x, 0.6, 0.2), t, g, pan)


def crowd(t, d, g):
    u = tt(d)
    x = np.zeros(len(u))
    for k in range(14):
        fc = rs.uniform(350, 1400)
        v = band_noise(d, lambda s, fc=fc: fc * (1 + 0.1 * np.sin(s * rs.uniform(2, 5))), 0.35, lambda s: 0.5 + 0.5 * np.sin(s * rs.uniform(3, 7) + k) ** 2)
        x += v
    x *= np.minimum(1, u / (d * 0.45)) * np.minimum(1, (d - u) / (d * 0.3))
    m.put(np.stack([x, np.roll(x, 900)], 1), t, g)


def keytick(t, g=0.07):
    m.put(click(rs.uniform(3000, 4500), 0.02, 0.003), t, g, rs.uniform(-0.4, 0.4))


def rising_tone(t, d, f0, f1, g):
    u = tt(d)
    f = f0 * (f1 / f0) ** (u / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * u / d) ** 0.5
    m.put(x, t, g)


def zap(t, g=0.08, pan=0.0):
    u = tt(0.25)
    f = 2400 * np.exp(-u / 0.05) + 200
    m.put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / 0.07), t, g, pan)


def reverse_suck(t_end, d=0.45, g=0.4):
    w = whoosh(d, 6000, 300, 0.98, 0.9, 3.0)
    m.put(w, t_end - d, g)


# ---------- S1 hook ----------
m.put(impact(75, 34, 1.6), 0.0, 0.9)
sub_drop(0.0, 55, 32, 0.8, 0.7)
for t in (0.5, 1.5, 2.5, 3.5, 4.5):
    tick_whoosh(t)
reverse_suck(5.94)

# ---------- S2 problem ----------
for k, t in enumerate((6.0, 6.5, 7.0, 7.5, 8.0)):
    m.put(whoosh(0.3, 400, 3000, 0.85, 0.8), t - 0.24, 0.3, [-0.7, 0.7, 0, -0.5, 0.5][k])
    for r in range(3):
        blip(t + 0.05 + r * 0.17, 1350 + 120 * k, 0.12, [-0.7, 0.7, 0, -0.5, 0.5][k])
for t in np.arange(6.75, 11.5, 0.75):
    ping(t + rs.uniform(-0.05, 0.05), 0.09, rs.uniform(-0.7, 0.7))
for t in np.arange(8.0, 11.5, 0.125):
    m.put(click(5200 if int(round(t * 8)) % 2 else 3800, 0.02, 0.003), t, 0.11, 0.1)
for t in (9.0, 9.5, 10.0, 10.5, 11.0):
    m.put(stamp(), t, 0.55)

# ---------- S3 turn ----------
for t in (12.0, 12.5, 13.0, 13.5):
    m.put(click(2200, 0.04, 0.008), t, 0.2)
    pluck_note(t, 880, 0.06)

# ---------- S4 drop + logo ----------
m.put(impact(80, 32, 2.2), 14.0, 1.0)
sub_drop(14.0, 60, 35, 0.6, 1.0)
m.put(whoosh(0.9, 200, 7000, 0.12, 1.1, 1.0), 13.98, 0.45)
for t in (15.0, 15.5, 16.0):
    hit(t, 0.45 + 0.1 * (t == 16.0))
for k, t in enumerate((17.0, 17.5, 18.0, 18.5, 19.0)):
    pluck_note(t, 440 * 2 ** ((0, 3, 5, 7, 10)[k] / 12), 0.16, -0.5 + 0.25 * k)

# ---------- cut whooshes, panned with the motion ----------
for t, p0, p1 in ((5.94, -0.3, 0.6), (11.95, 0.7, -0.7), (13.95, 0, 0), (19.92, 0.7, -0.7), (27.93, 0, 0), (35.94, 0, 0),
                  (43.94, -0.7, 0.7), (51.92, 0, 0), (59.93, 0, 0), (65.93, 0, 0), (71.94, 0, 0), (75.94, 0, 0), (79.94, 0, 0)):
    cut_whoosh(t, p0, p1)

# ---------- pillar beds (quiet) ----------
crowd(20.0, 3.4, 0.09)
m.put(stamp(), 21.0, 0.15); m.put(shimmer(1.2, 22, seed=3), 21.0, 0.12)
for t in np.arange(20.0, 28.0, 0.5):
    zap(t, 0.04, rs.uniform(-0.6, 0.6))
for t in np.arange(29.0, 31.0, 0.25):
    pop(t, 0.08, rs.uniform(700, 1300))
m.put(whoosh(1.0, 200, 900, 0.3, 0.6), 29.0, 0.1)
for t in np.arange(38.0, 40.5, 0.035):
    keytick(t + rs.uniform(-0.005, 0.005), 0.045)
for t in (37.0, 37.5, 38.0, 38.5, 39.0, 39.5):
    m.put(click(1800, 0.04, 0.01), t, 0.08)
m.put(click(2600, 0.05, 0.008), 40.5, 0.25); m.put(chime(), 40.55, 0.18)
rising_tone(46.0, 2.0, 300, 900, 0.06)
m.put(stamp(), 48.5, 0.3); m.put(ding((1046.5, 1568), 1.4, 0.4), 48.55, 0.15)
for t in np.arange(53.0, 56.5, 0.5):
    m.put(ding((2093, 3136), 0.35, 0.06), t, 0.08, rs.uniform(-0.5, 0.5))
for t in (57.0, 57.5, 58.0):
    hit(t, 0.45, 80)

# ---------- chips (soft UI pops) and benefit hits ----------
for T in (20, 28, 36, 44, 52):
    for k in range(3 if T == 52 else 4):
        pop(T + 2 + 0.5 * k, 0.12, 1000 + 150 * k)
    if T != 52:
        hit(T + 5, 0.4)
for t in (57.0,):
    pass  # philosophy lines carry the deep hits above

# ---------- S6 integrated ----------
m.put(pan_sweep(whoosh(1.5, 300, 2500, 0.6, 0.8), 0.6, -0.6), 60.0, 0.3)
for k in range(5):
    m.put(click(3000 + 300 * k, 0.03, 0.004), 61.5 + k * 0.018, 0.2, -0.6 + 0.3 * k)
for k in range(5):
    m.put(zip_up(0.3, 600 + 80 * k, 2000), 62.0 + 0.12 * k, 0.12, -0.5 + 0.25 * k)
m.put(shimmer(1.6, 18, seed=6), 62.5, 0.12)

# ---------- S7 proof ----------
m.put(whoosh(3.0, 200, 3000, 0.8, 1.0, 1.4), 66.0, 0.22)
for k, t in enumerate((69.0, 69.5, 70.0, 70.5)):
    m.put(whoosh(0.25, 800, 5000, 0.5, 0.7), t - 0.1, 0.25, -0.6 + 0.4 * k)

# ---------- S8 promise ----------
m.put(impact(78, 33, 1.8), 72.0, 0.9)
sub_drop(72.0, 58, 34, 0.5, 0.8)
for k, t in enumerate((72.0, 72.5, 73.0, 73.5)):
    s = hit if k < 3 else None
    if k < 3:
        hit(t, 0.45)
    else:
        m.put(reverb(np.concatenate([impact(100, 45, 0.8)]), 1.8, 0.35), t, 0.6)
    m.put(pan_sweep(whoosh(0.25, 600, 4000, 0.9, 0.7), 0.8, 0.0), t - 0.2, 0.25)
m.put(zip_up(0.4, 400, 1800), 74.0, 0.15)

# ---------- S9 CTA ----------
u = tt(0.25)
m.put(np.sin(2 * np.pi * np.cumsum(500 + 500 * np.minimum(1, u / 0.08)) / SR) * np.exp(-u / 0.08), 76.5, 0.15)
m.put(click(2400, 0.05, 0.01), 77.0, 0.3)
m.put(chime(), 77.05, 0.22)

# ---------- S10 end (80–88 s) ----------
m.put(impact(70, 34, 1.6), 80.0, 0.7)
m.put(shimmer(2.0, 24, seed=10), 80.0, 0.18)
m.put(zip_up(0.5, 300, 2000), 80.4, 0.15)
for t in (81.0, 81.5, 82.0, 82.5):
    m.put(click(2800, 0.03, 0.005), t, 0.1)
m.put(impact(70, 30, 2.5), 87.0, 0.8)
m.put(shimmer(1.0, 12, seed=11), 87.0, 0.12)

m.save(sys.argv[1], 0.6)
