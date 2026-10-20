"""Synthétise la piste d'effets sonores (whoosh, pops, clics, carillons…) à partir des
repères exportés par la scène (cues.json).

Usage : python sfx.py cues.json total_secondes out.wav
"""
import json
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
rng = np.random.default_rng(12)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def env_ar(n, a, r, curve=3.0):
    """Enveloppe attaque/relâche (a et r en fraction de la durée)."""
    x = np.linspace(0, 1, n)
    e = np.where(x < a, (x / max(a, 1e-6)) ** 1.5, np.exp(-curve * (x - a) / max(r, 1e-6)))
    return e


def bandpass_sweep(noise, f0, f1, q=1.6, shape=None):
    """Filtre passe-bande à fréquence centrale variable (filtre à variable d'état)."""
    n = len(noise)
    f = np.geomspace(f0, f1, n) if shape is None else shape
    out = np.zeros(n)
    low = band = 0.0
    damp = 1.0 / q
    for i in range(n):
        fc = 2 * np.sin(np.pi * min(f[i], SR / 6) / SR)
        high = noise[i] - low - damp * band
        band += fc * high
        low += fc * band
        out[i] = band
    return out


def pan(x, p):
    """p ∈ [-1, 1] (scalaire ou tableau) -> stéréo à puissance constante."""
    ang = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(ang), x * np.sin(ang)], axis=1)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def whoosh(d=0.6, f0=350, f1=3200, f2=700, peak_at=0.55, width=0.8):
    n = int(d * SR)
    k = int(n * peak_at)
    shape = np.concatenate([np.geomspace(f0, f1, k), np.geomspace(f1, f2, n - k)])
    x = bandpass_sweep(rng.standard_normal(n), 0, 0, q=1.3, shape=shape)
    e = np.concatenate([np.linspace(0, 1, k) ** 2.2, np.linspace(1, 0, n - k) ** 1.6])
    return pan(norm(x * e), np.linspace(-width, width, n))


def pop(f0=900, f1=240, d=0.14, click=0.25):
    t = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-t * 45)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 30)
    x[:200] += click * rng.standard_normal(200) * np.linspace(1, 0, 200)
    return pan(norm(x), 0)


def thud():
    t = t_axis(0.45)
    f = 50 + 70 * np.exp(-t * 25)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    nz = signal.lfilter(*signal.butter(2, 900 / (SR / 2)), rng.standard_normal(len(t))) * np.exp(-t * 40)
    return pan(norm(x + 0.6 * nz), 0)


def key():
    t = t_axis(0.06)
    b, a = signal.butter(2, [1800 / (SR / 2), 6500 / (SR / 2)], btype="band")
    x = signal.lfilter(b, a, rng.standard_normal(len(t))) * np.exp(-t * 260)
    x[int(0.028 * SR):] += 0.35 * x[: len(t) - int(0.028 * SR)]
    return pan(norm(x), rng.uniform(-0.3, 0.3))


def click():
    t = t_axis(0.12)
    b, a = signal.butter(2, [900 / (SR / 2), 4500 / (SR / 2)], btype="band")
    x = signal.lfilter(b, a, rng.standard_normal(len(t))) * np.exp(-t * 400)
    i = int(0.065 * SR)
    x[i:] += 0.6 * x[: len(t) - i]
    x += 0.3 * np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 120)
    return pan(norm(x), 0.1)


def toggle():
    c = click()[:, 0]
    t = t_axis(0.18)
    f = np.geomspace(650, 1300, len(t))
    blip = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * 0.6
    x = np.zeros(len(t))
    x[: len(c)] += c
    x += blip
    return pan(norm(x), 0)


def heartbeat():
    out = np.zeros(int(0.8 * SR))
    for start, amp in ((0.0, 1.0), (0.26, 0.7)):
        t = t_axis(0.22)
        f = 42 + 40 * np.exp(-t * 30)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * amp
        i = int(start * SR)
        out[i:i + len(x)] += x
    return pan(norm(out), 0)


def crack():
    t = t_axis(0.6)
    out = np.zeros(len(t))
    for _ in range(14):
        i = int(rng.uniform(0, 0.25) * SR)
        L = int(0.012 * SR)
        b, a = signal.butter(2, rng.uniform(2500, 7000) / (SR / 2), btype="high")
        burst = signal.lfilter(b, a, rng.standard_normal(L)) * np.exp(-np.arange(L) / (0.003 * SR))
        out[i:i + L] += burst * rng.uniform(0.3, 1)
    th = thud()[:, 0]
    out[: len(th)] += 0.7 * th
    return pan(norm(out), 0)


def riser(d):
    t = t_axis(d)
    n = len(t)
    x = bandpass_sweep(rng.standard_normal(n), 300, 6000, q=2.0)
    f = np.geomspace(180, 1600, n)
    tone = sum(np.sin(2 * np.pi * np.cumsum(f * m) / SR) / m for m in (1, 1.5, 2))
    e = (t / d) ** 2.6
    return pan(norm((x + 0.35 * tone) * e), np.sin(t * 9) * 0.3)


def impact(soft=False):
    d = 2.2 if not soft else 1.4
    t = t_axis(d)
    f = 38 + 70 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.2 if not soft else 3.5))
    nz = signal.lfilter(*signal.butter(2, 2500 / (SR / 2)), rng.standard_normal(len(t))) * np.exp(-t * 7)
    hiss = signal.lfilter(*signal.butter(2, 5000 / (SR / 2), btype="high"), rng.standard_normal(len(t))) * np.exp(-t * 3) * 0.25
    x = boom + 0.5 * nz + hiss
    st = pan(norm(x), 0)
    st[:, 1] = np.roll(st[:, 1], 300)  # léger élargissement
    return st


def bell(freq, d, decay=2.5, bright=1.0):
    t = t_axis(d)
    x = np.zeros(len(t))
    for ratio, amp, dk in ((1, 1, 1), (2.0, 0.45, 1.6), (2.76, 0.35 * bright, 2.2), (5.4, 0.18 * bright, 3.5), (8.93, 0.08 * bright, 5)):
        x += amp * np.sin(2 * np.pi * freq * ratio * t + rng.uniform(0, 6)) * np.exp(-t * decay * dk)
    x *= np.minimum(1, t / 0.002)
    return x


def shimmer():
    d = 2.2
    out = np.zeros((int(d * SR), 2))
    notes = [1174.7, 1480.0, 1760.0, 2349.3, 2960.0, 3520.0]
    for i, f in enumerate(notes):
        b = bell(f, d - i * 0.05, decay=2.2, bright=0.7) * (0.8 - i * 0.07)
        s = pan(b, -0.6 + i * 0.24)
        k = int(i * 0.05 * SR)
        out[k:k + len(s)] += s
    return out / (np.max(np.abs(out)) + 1e-9) * 0.9


def sparkle():
    d = 1.4
    out = np.zeros((int(d * SR), 2))
    for _ in range(11):
        f = rng.uniform(2600, 6200)
        b = bell(f, 0.6, decay=7, bright=0.4) * rng.uniform(0.3, 1)
        k = int(rng.uniform(0, 0.7) * SR)
        out[k:k + len(b)] += pan(b, rng.uniform(-0.8, 0.8))
    return out / (np.max(np.abs(out)) + 1e-9) * 0.9


def chime():
    d = 4.0
    out = np.zeros((int(d * SR), 2))
    for i, f in enumerate((587.3, 880.0, 1174.7, 1480.0, 1760.0)):
        b = bell(f, d, decay=0.9, bright=0.8) * (1 - i * 0.1)
        out += pan(b, -0.4 + i * 0.2)
    return out / (np.max(np.abs(out)) + 1e-9) * 0.9


def flutter():
    d = 0.9
    out = np.zeros(int(d * SR))
    b, a = signal.butter(2, [350 / (SR / 2), 1800 / (SR / 2)], btype="band")
    for i in range(7):
        L = int(0.07 * SR)
        x = signal.lfilter(b, a, rng.standard_normal(L)) * np.hanning(L)
        k = int(i * 0.11 * SR)
        out[k:k + L] += x * (1 - i * 0.1)
    return pan(norm(out), np.linspace(-0.5, 0.5, len(out)))


def swell():
    d = 1.8
    t = t_axis(d)
    x = sum(np.sin(2 * np.pi * f * t) for f in (293.7, 440, 587.3, 740))
    nz = bandpass_sweep(rng.standard_normal(len(t)), 800, 2600, q=2)
    e = np.sin(np.pi * t / d) ** 2
    return pan(norm((x * 0.25 + nz * 0.6) * e), 0)


GEN = {
    "whoosh": lambda c: whoosh(0.6),
    "whooshLong": lambda c: whoosh(1.0, 250, 2600, 400, 0.6),
    "whooshUp": lambda c: whoosh(0.8, 300, 5200, 4500, 0.85),
    "whooshDown": lambda c: whoosh(0.9, 4200, 3800, 180, 0.15),
    "swish": lambda c: whoosh(0.32, 1200, 6000, 2500, 0.5, 0.4),
    "pop": lambda c: pop(),
    "popSoft": lambda c: pop(620, 200, 0.16, 0.1),
    "thud": lambda c: thud(),
    "key": lambda c: key(),
    "click": lambda c: click(),
    "toggle": lambda c: toggle(),
    "heartbeat": lambda c: heartbeat(),
    "crack": lambda c: crack(),
    "riser": lambda c: riser(c.get("dur", 2.0)),
    "impact": lambda c: impact(),
    "impactSoft": lambda c: impact(True),
    "shimmer": lambda c: shimmer(),
    "sparkle": lambda c: sparkle(),
    "chime": lambda c: chime(),
    "flutter": lambda c: flutter(),
    "swell": lambda c: swell(),
}
# niveau relatif de chaque famille (les clics de clavier restent discrets)
LEVEL = {"key": 0.32, "click": 0.6, "toggle": 0.6, "pop": 0.55, "popSoft": 0.5, "thud": 0.7, "heartbeat": 0.9,
         "whoosh": 0.42, "whooshLong": 0.45, "whooshUp": 0.42, "whooshDown": 0.45, "swish": 0.35, "crack": 0.6,
         "riser": 0.55, "impact": 0.95, "impactSoft": 0.7, "shimmer": 0.38, "sparkle": 0.3, "chime": 0.45,
         "flutter": 0.4, "swell": 0.35}


def main(cues_path, total, out):
    cues = json.load(open(cues_path))
    n = int(float(total) * SR) + SR * 4
    mix = np.zeros((n, 2))
    for c in cues:
        x = GEN[c["type"]](c) * LEVEL[c["type"]] * c.get("gain", 1)
        i = int(c["t"] * SR)
        if c["type"] == "riser":  # la montée se termine exactement sur la révélation
            i = int((c["t"] + c.get("dur", 2.0)) * SR) - len(x)
        i = max(0, i)
        mix[i:i + len(x)] += x[: n - i]
    # petite réverbération commune (réponse impulsionnelle synthétique)
    ir_t = t_axis(1.3)
    ir = rng.standard_normal((len(ir_t), 2)) * np.exp(-ir_t * 4.5)[:, None]
    ir[:, 0] = signal.lfilter(*signal.butter(1, 6000 / (SR / 2)), ir[:, 0])
    ir[:, 1] = signal.lfilter(*signal.butter(1, 6000 / (SR / 2)), ir[:, 1])
    ir /= np.sqrt(np.sum(ir ** 2, axis=0))
    wet = np.stack([signal.fftconvolve(mix[:, ch], ir[:, ch])[:n] for ch in range(2)], axis=1)
    mix = mix + 0.22 * wet
    mix = mix[: int(float(total) * SR)]
    peak = np.max(np.abs(mix))
    if peak > 0.98:
        mix *= 0.98 / peak
    sf.write(out, mix.astype(np.float32), SR)
    print(f"{len(cues)} effets, crête {20 * np.log10(peak + 1e-9):.1f} dBFS -> {out}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
