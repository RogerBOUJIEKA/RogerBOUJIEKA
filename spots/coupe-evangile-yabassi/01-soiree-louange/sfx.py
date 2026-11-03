#!/usr/bin/env python3
"""Effets sonores de bande-annonce synthétisés (libres de droits) et piste d'effets.

Usage :
    python3 sfx.py cues.json duree_s sortie.wav

cues.json : liste de {"t": secondes, "type": nom, "gain": dB (optionnel), "dur": s (optionnel)}
Types : whoosh, swish, impact, boom, riser, subdrop, ticks, shimmer, reverse
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(11)


def noise(d):
    return rng.standard_normal(int(d * SR))


def env_ar(n, a, peak_pos=None, curve=2.0):
    """Enveloppe attaque/relâche ; peak_pos en fraction."""
    t = np.linspace(0, 1, n)
    p = peak_pos if peak_pos is not None else a
    up = np.clip(t / max(p, 1e-4), 0, 1) ** curve
    down = np.clip((1 - t) / max(1 - p, 1e-4), 0, 1) ** curve
    return np.where(t < p, up, down)


def sweep_filter(x, f0, f1, q=1.2, kind="bp", blocks=64):
    """Filtre dont la fréquence glisse de f0 à f1 (traitement par blocs)."""
    out = np.zeros_like(x)
    n = len(x)
    edges = np.linspace(0, n, blocks + 1).astype(int)
    zi = None
    for i in range(blocks):
        f = f0 * (f1 / f0) ** (i / (blocks - 1))
        f = min(f, SR / 2 * 0.9)
        if kind == "bp":
            bw = f / q
            lo, hi = max(20, f - bw / 2), min(SR / 2 * 0.95, f + bw / 2)
            sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        else:
            sos = signal.butter(2, f, btype=kind, fs=SR, output="sos")
        if zi is None or zi.shape[0] != sos.shape[0]:
            zi = np.zeros((sos.shape[0], 2))
        out[edges[i]:edges[i + 1]], zi = signal.sosfilt(sos, x[edges[i]:edges[i + 1]], zi=zi)
    return out


def reverb(x, length=1.6, mix=0.3, damp=4000):
    n = int(length * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = signal.sosfilt(signal.butter(1, damp, "low", fs=SR, output="sos"), ir)
    ir /= np.abs(ir).sum() ** 0.5 * 8
    wet = signal.fftconvolve(x, ir)
    wet = np.pad(wet, (0, max(0, len(x) + n - len(wet))))[: len(x) + n]
    dry = np.concatenate([x, np.zeros(n)])
    return dry * (1 - mix) + wet * mix


def stereo(x, pan_from=0.0, pan_to=0.0, width=0.0):
    n = len(x)
    p = np.linspace(pan_from, pan_to, n)
    l = x * np.cos((p + 1) * np.pi / 4)
    r = x * np.sin((p + 1) * np.pi / 4)
    if width:
        d = int(0.012 * SR)
        r = np.concatenate([np.zeros(d), r])[:n] * (1 - width) + r * width
    return np.stack([l, r], 1)


def norm(x, peak=0.9):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


# ----------------------------------------------------------------- effets
def whoosh(dur=0.7):
    x = noise(dur)
    x = sweep_filter(x, 250, 4500, q=1.5)
    x2 = sweep_filter(noise(dur), 4500, 600, q=2)
    n = len(x)
    e = env_ar(n, 0.55, curve=2.2)
    y = (np.concatenate([x[: n // 2], x2[n // 2:]])) * e
    return norm(stereo(reverb(y, 0.8, 0.25), -0.6, 0.6, width=0.5), 0.8)


def swish(dur=0.32):
    y = sweep_filter(noise(dur), 1500, 7000, q=2.5) * env_ar(int(dur * SR), 0.4, curve=1.6)
    return norm(stereo(y, 0.4, -0.4, 0.4), 0.55)


def impact(dur=1.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 25)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    click = signal.sosfilt(signal.butter(2, 2500, "low", fs=SR, output="sos"), noise(dur)) * np.exp(-t * 40)
    crack = signal.sosfilt(signal.butter(2, 3000, "high", fs=SR, output="sos"), noise(dur)) * np.exp(-t * 18) * 0.35
    y = np.tanh((body * 1.4 + click * 0.8 + crack) * 1.6)
    return norm(stereo(reverb(y, 2.2, 0.35, 3000), 0, 0, 0.6), 0.95)


def boom(dur=3.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 38 + 70 * np.exp(-t * 12)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)
    hit = signal.sosfilt(signal.butter(2, 1800, "low", fs=SR, output="sos"), noise(dur)) * np.exp(-t * 25)
    y = np.tanh((body * 1.6 + hit) * 1.5)
    return norm(stereo(reverb(y, 3.0, 0.4, 2000), 0, 0, 0.7), 0.95)


def subdrop(dur=2.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 30 + 70 * np.exp(-t * 2.2)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.5) * np.clip(t / 0.01, 0, 1)
    return norm(stereo(np.tanh(y * 1.3)), 0.9)


def riser(dur=3.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = sweep_filter(noise(dur), 300, 9000, q=1.2)
    f = 180 * (1200 / 180) ** (t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    trem = 0.7 + 0.3 * np.sin(2 * np.pi * (4 + 14 * t / dur) * t)
    e = (t / dur) ** 2.4
    y = (nz + tone) * e * trem
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return norm(stereo(y, 0, 0, 0.6), 0.75)


def reverse(dur=1.2):
    n = int(dur * SR)
    x = signal.sosfilt(signal.butter(2, 3000, "high", fs=SR, output="sos"), noise(dur))
    y = x * np.linspace(0, 1, n) ** 3
    y[-int(0.005 * SR):] *= np.linspace(1, 0, int(0.005 * SR))
    return norm(stereo(y, 0, 0, 0.8), 0.6)


def shimmer(dur=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = signal.sosfilt(signal.butter(2, 5000, "high", fs=SR, output="sos"), noise(dur)) * np.exp(-t * 4)
    bells = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (3 + k)) for k, f in enumerate([1760, 2637, 3520]))
    y = x * 0.5 + bells * 0.15
    return norm(stereo(reverb(y, 1.5, 0.4), 0, 0, 0.7), 0.5)


def ticks(dur=0.45, count=7):
    """Petits clics numériques pour l'apparition des lettres."""
    n = int(dur * SR)
    y = np.zeros(n)
    times = np.sort(rng.uniform(0, dur * 0.8, count))
    for k, tt in enumerate(times):
        i = int(tt * SR)
        m = int(0.012 * SR)
        f = rng.uniform(2500, 6000)
        tk = np.sin(2 * np.pi * f * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.002 * SR))
        y[i:i + m] += tk[: n - i] * rng.uniform(0.5, 1)
    return norm(stereo(y, 0, 0, 0.5), 0.35)


FX = dict(whoosh=whoosh, swish=swish, impact=impact, boom=boom, subdrop=subdrop,
          riser=riser, reverse=reverse, shimmer=shimmer, ticks=ticks)


def build(cues, total, out):
    track = np.zeros((int(total * SR) + SR * 4, 2))
    for c in cues:
        fn = FX[c["type"]]
        x = fn(c["dur"]) if "dur" in c else fn()
        g = 10 ** (c.get("gain", 0) / 20)
        start = c["t"] - (x.shape[0] / SR if c.get("end_at") else 0)
        i = int(max(0, start) * SR)
        if start < 0:
            x = x[int(-start * SR):]
        track[i:i + len(x)] += x[: len(track) - i] * g
    track = track[: int(total * SR)]
    track = np.tanh(track * 0.9) / 0.9
    pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    cues = json.load(open(sys.argv[1]))
    build(cues, float(sys.argv[2]), sys.argv[3])
