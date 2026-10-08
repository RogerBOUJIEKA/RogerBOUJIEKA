"""Sound-design synthesis shared by the 15 s and 88 s cuts: whooshes, impacts, flaps, chimes.

`Mix(duration)` holds a stereo buffer; `put(sig, t, gain, pan)` places an event; `save(path)` writes 16-bit WAV.
"""
import numpy as np
from scipy.signal import stft, istft, fftconvolve, butter, sosfilt

SR = 48000
rs = np.random.default_rng(2026)


class Mix:
    def __init__(self, dur):
        self.n = int(SR * dur)
        self.buf = np.zeros((self.n, 2))

    def put(self, sig, t, gain=1.0, pan=0.0):
        """Add mono or stereo `sig` at time t (s); pan in [-1, 1] (equal power)."""
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1)
        i = int(t * SR)
        j = min(self.n, i + len(sig))
        if j > i:
            self.buf[i:j] += sig[: j - i] * gain

    def save(self, path, headroom=0.5):
        import wave
        peak = np.max(np.abs(self.buf))
        out = self.buf * (headroom / peak)  # final balance happens in the mix stage
        with wave.open(path, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
        print("wrote", path, "peak before norm", round(float(peak), 3))


def jet_flyby(d=2.3):
    """Band-limited roar panned left → right, peaking mid-way."""
    jet = band_noise(d, lambda u: 700 * (1 + 4 * np.exp(-((u - d / 2) / 0.6) ** 2)), 1.3, lambda u: np.exp(-((u - d / 2) / 0.62) ** 2))
    a = (np.linspace(-0.85, 0.85, len(jet)) + 1) * np.pi / 4
    return np.stack([jet * np.cos(a), jet * np.sin(a)], 1)


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


