"""Synthesise the spot's sound design (whooshes, impacts, flaps, chimes) to audio/sfx.wav.

Every event is placed on the same timeline as the animation (src/spot.js, object T).
"""
import sys
import numpy as np
from scipy.signal import stft, istft, fftconvolve, butter, sosfilt

SR, DUR = 48000, 15.0
N = int(SR * DUR)
rs = np.random.default_rng(2026)
mix = np.zeros((N, 2))


def put(sig, t, gain=1.0, pan=0.0):
    """Add mono or stereo `sig` at time t (s); pan in [-1, 1] (equal power)."""
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1)
    i = int(t * SR)
    j = min(N, i + len(sig))
    if j > i:
        mix[i:j] += sig[: j - i] * gain


def tt(d):
    return np.arange(int(d * SR)) / SR


def band_noise(d, fc, bw_oct, env):
    """Noise whose band centre follows fc(t) (Hz) with log-gaussian width; env(t) amplitude."""
    n = int(d * SR)
    _, _, Z = stft(rs.standard_normal(n), SR, nperseg=1024)
    f = np.fft.rfftfreq(1024, 1 / SR)[:, None] + 1
    times = np.linspace(0, d, Z.shape[1])[None, :]
    Z *= np.exp(-0.5 * (np.log2(f / fc(times)) / bw_oct) ** 2)
    _, x = istft(Z, SR, nperseg=1024)
    x = x[:n]
    x /= np.max(np.abs(x)) + 1e-9
    return x * env(tt(d))[: len(x)]


def reverb(x, secs=1.2, wet=0.25):
    ir = rs.standard_normal(int(secs * SR)) * np.exp(-np.arange(int(secs * SR)) / SR / (secs / 5))
    ir = sosfilt(butter(2, 5000, "low", fs=SR, output="sos"), ir)
    y = fftconvolve(x, ir)[: len(x) + len(ir) - 1]
    y /= np.max(np.abs(y)) + 1e-9
    out = np.zeros(len(y)); out[: len(x)] += x * (1 - wet)
    return out + y * wet * np.max(np.abs(x))


def whoosh(d, f0, f1, peak=0.6, bw=0.9, curve=2.0):
    fc = lambda u: f0 * (f1 / f0) ** (u / d)
    env = lambda u: np.where(u < peak * d, (u / (peak * d)) ** curve, np.exp(-(u - peak * d) / (0.18 * d)))
    return band_noise(d, fc, bw, env)


def impact(f0=70, f1=38, d=1.4):
    u = tt(d)
    f = f1 + (f0 - f1) * np.exp(-u / 0.09)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / 0.45)
    hit = sosfilt(butter(2, 2500, "low", fs=SR, output="sos"), rs.standard_normal(len(u))) * np.exp(-u / 0.04)
    return reverb(sub * 0.9 + hit * 0.5, 1.6, 0.3)


def shimmer(d=1.2, n=16, lo=2500, hi=9000, seed=0):
    r = np.random.default_rng(seed); u = tt(d); x = np.zeros(len(u))
    for _ in range(n):
        t0, f, k = r.uniform(0, d * 0.5), r.uniform(lo, hi), r.uniform(0.15, 0.5)
        m = u >= t0
        x[m] += np.sin(2 * np.pi * f * (u[m] - t0)) * np.exp(-(u[m] - t0) / k) * r.uniform(0.3, 1)
    x *= np.minimum(1, u / 0.02)
    return reverb(x / (np.max(np.abs(x)) + 1e-9), 1.0, 0.35)


def click(f=2600, d=0.03, decay=0.006):
    u = tt(d)
    x = sosfilt(butter(2, [f * 0.5, f * 1.6], "band", fs=SR, output="sos"), rs.standard_normal(len(u))) * np.exp(-u / decay)
    return x / (np.max(np.abs(x)) + 1e-9)


def ding(freqs=(1318.5, 1975.5), d=0.9, decay=0.25):
    u = tt(d)
    x = sum(np.sin(2 * np.pi * f * u) * a for f, a in zip(freqs, (1, 0.45)))
    x *= np.exp(-u / decay) * np.minimum(1, u / 0.004)
    return reverb(x / 1.45, 0.9, 0.3)


def zip_up(d=0.28, f0=500, f1=1700):
    u = tt(d); f = f0 * (f1 / f0) ** (u / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * u / d) ** 2
    return x * 0.6 + whoosh(d, 2000, 6000, 0.7, 0.6) * 0.4


def chime():
    u = tt(1.8)
    def bell(f):
        x = sum(np.sin(2 * np.pi * f * k * u) * a * np.exp(-u / (0.9 / k)) for k, a in ((1, 1), (2, 0.35), (3.01, 0.15)))
        return x * np.minimum(1, u / 0.003)
    x = bell(659.25); y = bell(523.25)
    out = np.zeros(int(2.4 * SR)); out[: len(x)] += x; o = int(0.42 * SR); out[o:o + len(y)] += y
    return reverb(out / 2.2, 1.4, 0.35)


def stamp():
    u = tt(0.5)
    f = 50 + 70 * np.exp(-u / 0.03)
    thud = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / 0.09)
    slap = sosfilt(butter(2, [400, 2500], "band", fs=SR, output="sos"), rs.standard_normal(len(u))) * np.exp(-u / 0.025)
    return reverb(thud + slap * 0.6, 0.6, 0.2)


def ratchet(d=0.45):
    u = tt(d); rate = 38 + 40 * (u / d)
    pulse = (np.sin(2 * np.pi * np.cumsum(rate) / SR) > 0.6).astype(float)
    x = sosfilt(butter(2, [1500, 6000], "band", fs=SR, output="sos"), rs.standard_normal(len(u))) * pulse
    return x * np.sin(np.pi * u / d) ** 0.5 / (np.max(np.abs(x)) + 1e-9)


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
jet = band_noise(2.3, lambda u: 700 * (1 + 4 * np.exp(-((u - 1.15) / 0.6) ** 2)), 1.3, lambda u: np.exp(-((u - 1.15) / 0.62) ** 2))
pan = np.linspace(-0.85, 0.85, len(jet)); a = (pan + 1) * np.pi / 4
put(np.stack([jet * np.cos(a), jet * np.sin(a)], 1), 3.1, 0.3)
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

peak = np.max(np.abs(mix))
mix *= 0.5 / peak  # headroom; final balance happens in the mix stage
out = sys.argv[1] if len(sys.argv) > 1 else "audio/sfx.wav"
import wave
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
print("wrote", out, "peak before norm", round(float(peak), 3))
