"""Synthesized Afro-house track, 120 BPM, A minor (Am–F–C–G), 84.00 s, arranged on the spot's timeline.

python3 scripts/music.py audio/music.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve

SR = 48000
DUR = 84.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(120)


def tt(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Bus:
    def __init__(self):
        self.b = np.zeros((N + SR * 6, 2))

    def put(self, sig, t, g=1.0, pan=0.0):
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1)
        i = int(round(t * SR))
        if i < 0:
            sig, i = sig[-i:], 0
        j = min(len(self.b), i + len(sig))
        if j > i:
            self.b[i:j] += sig[: j - i] * g


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def sweep_lp(x, f_of_t, block=480):
    """Time-varying 2-pole low-pass (cutoff follows f_of_t(seconds))."""
    y = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        sos = butter(2, min(20000, f_of_t(i / SR)), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2, x.shape[1]))
        y[i:i + block], zi = sosfilt(sos, x[i:i + block], axis=0, zi=zi)
    return y


def reverb(x, secs=1.6, wet=0.3, seed=1):
    r = np.random.default_rng(seed)
    n = int(secs * SR)
    ir = r.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR / (secs / 6))[:, None]
    ir = lp(ir, 6000)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    y = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1)
    y *= np.max(np.abs(x)) / (np.max(np.abs(y)) + 1e-9)
    out = y * wet
    out[: len(x)] += x * (1 - wet)
    return out


# ---------------- instruments ----------------
def kick(g=1.0):
    u = tt(0.45)
    f = 48 + 110 * np.exp(-u / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / 0.16)
    x += 0.35 * hp(rng.standard_normal(len(u)), 2500) * np.exp(-u / 0.004)
    return np.tanh(x * 1.6) * g


def clap():
    u = tt(0.35)
    n = bp(rng.standard_normal(len(u)), 900, 3200)
    env = np.zeros(len(u))
    for k, d in enumerate((0, 0.009, 0.018)):
        m = u >= d
        env[m] += np.exp(-(u[m] - d) / (0.006 if k < 2 else 0.09))
    return n * env * 0.8


def hat(open_=True):
    u = tt(0.22 if open_ else 0.05)
    n = hp(rng.standard_normal(len(u)), 7500, 3)
    return n * np.exp(-u / (0.07 if open_ else 0.012))


def shaker(acc):
    u = tt(0.07)
    n = bp(rng.standard_normal(len(u)), 5000, 12000)
    return n * np.sin(np.pi * np.clip(u / 0.05, 0, 1)) ** 2 * (0.45 + 0.55 * acc)


def conga(freq, slap=False):
    u = tt(0.32)
    f = freq * (1 + 0.5 * np.exp(-u / 0.012))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / (0.06 if slap else 0.14))
    x += (0.6 if slap else 0.15) * bp(rng.standard_normal(len(u)), 1500, 5000) * np.exp(-u / 0.01)
    return x


def logdrum(freq, d=0.42):
    """Afro-house log drum: pitch-dropped sine + saturated 2nd/3rd harmonics."""
    u = tt(d)
    f = freq * (1 + 0.9 * np.exp(-u / 0.018))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph + 0.4) * np.exp(-u / 0.06) + 0.18 * np.sin(3 * ph) * np.exp(-u / 0.03)
    x *= np.exp(-u / (d * 0.42)) * np.minimum(1, u / 0.002)
    return np.tanh(x * 1.8) * 0.8


def saw(freq, d, detune=(0, -7, 7)):
    u = tt(d)
    x = np.zeros(len(u))
    for c in detune:
        f = freq * 2 ** (c / 1200)
        ph = (u * f + rng.random()) % 1
        x += 2 * ph - 1
    return x / len(detune)


def pad_chord(notes, d):
    u = tt(d)
    x = sum(saw(mtof(m), d) for m in notes) / len(notes)
    x = lp(x, 1400)
    env = np.minimum(1, u / 0.25) * np.minimum(1, (d - u) / 0.35)
    l = x * env
    r = np.roll(x, 240) * env
    return np.stack([l, r], 1) * 0.5


def pluck(m, d=0.42):
    u = tt(d)
    f = mtof(m)
    x = 0.6 * (2 * ((u * f) % 1) - 1) + 0.5 * np.sign(np.sin(2 * np.pi * f * u * 1.002))
    # envelope-driven low-pass: bright attack, warm decay
    x = lp(x, 5200) * np.exp(-u / 0.09) + lp(x, 1600) * np.exp(-u / 0.22) * 0.6
    return x * np.minimum(1, u / 0.003) * 0.5


def noise_riser(d, f0=400, f1=9000):
    u = tt(d)
    n = rng.standard_normal(len(u))
    out = np.zeros(len(u))
    blk = 1200
    for i in range(0, len(u), blk):
        fc = f0 * (f1 / f0) ** (i / len(u))
        out[i:i + blk] = bp(n[max(0, i - 2000):i + blk], fc / 1.6, min(fc * 1.6, 23000))[-len(out[i:i + blk]):]
    tone = np.sin(2 * np.pi * np.cumsum(220 * 4 ** (u / d)) / SR) * 0.25
    return (out * 0.8 + tone) * (u / d) ** 2


def reverse_cymbal(d):
    u = tt(d)
    n = hp(rng.standard_normal(len(u)), 4000, 3) + 0.3 * bp(rng.standard_normal(len(u)), 2000, 6000)
    return n * np.exp((u - d) / (d * 0.28))


def crash(d=2.5):
    u = tt(d)
    return hp(rng.standard_normal(len(u)), 3500, 2) * np.exp(-u / 0.7)


def drone(d):
    u = tt(d)
    x = saw(mtof(45), d, (0, -5, 6)) + 0.7 * saw(mtof(52), d, (0, -6, 5)) + 0.5 * np.sin(2 * np.pi * mtof(33) * u)
    x = lp(x, 700) * (0.85 + 0.15 * np.sin(2 * np.pi * 4 * u))
    return x * np.minimum(1, u / 1.0) * np.minimum(1, (d - u) / 0.15) * 0.5


# ---------------- arrangement ----------------
CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]  # Am F C G (voiced around C4)
ROOTS = [45, 41, 48, 43]  # A2 F2 C3 G2 (log drum one octave below)
HOOK = [  # (16th step within a 2-bar phrase, midi, length in 16ths)
    (0, 69, 2), (3, 72, 1), (4, 76, 2), (7, 74, 1), (8, 72, 2), (10, 69, 2), (12, 67, 2), (14, 69, 2),
    (16, 76, 2), (19, 74, 1), (22, 72, 2), (24, 69, 3), (29, 67, 1), (30, 72, 2),
]
S16 = BEAT / 4


def sections(t):
    """What plays at bar-start time t."""
    return dict(
        intro=t < 6, tense=6 <= t < 12, brk=12 <= t < 14, drop=14 <= t < 60, bd=60 <= t < 66,
        back=66 <= t < 72, drop2=72 <= t < 78, outro=78 <= t < 83,
    )


def build():
    drums, bass, harm, lead, fxb = Bus(), Bus(), Bus(), Bus(), Bus()
    K = kick()
    for b in range(42):
        t0 = b * 2.0
        s = sections(t0)
        if s["brk"] or t0 >= 83:
            continue
        ch = b % 4
        full = s["drop"] or s["drop2"] or s["back"]
        drums_on = not s["bd"]
        for q in range(16):  # 16ths
            t = t0 + q * S16
            if t >= 83.0:
                break
            beat = q // 4
            fill = full and any(abs(t - c) < 1.0 + 1e-6 and t < c for c in (28, 36, 44, 52, 60)) and t >= 0
            in_fill = full and any(c - 1.0 <= t < c for c in (28, 36, 44, 52, 60))
            sw = 0.012 if q % 2 else 0  # light swing on the off-16ths
            if drums_on and q % 4 == 0 and not (in_fill and q == 12 and t0 + 2 > 0 and any(abs(t0 + 2 - c) < 1e-6 for c in (28, 36, 44, 52, 60))):
                drums.put(K, t, 0.9 if not s["outro"] else 0.75)
            if drums_on and (s["tense"] or full or s["outro"]) and q in (4, 12):
                drums.put(clap(), t, 0.42, 0.05)
            if drums_on and q % 4 == 2:
                drums.put(hat(True), t + sw, 0.22 if not s["intro"] else 0.18, 0.25)
            if q % 2 == 1 or (s["bd"]):
                drums.put(shaker(1.0 if q % 4 == 2 else 0.4), t + sw, 0.12, -0.35)
            elif q % 2 == 0:
                drums.put(shaker(0.6), t, 0.1, -0.35)
            if drums_on and not s["intro"] or (s["intro"] and t > 2):
                if not s["bd"]:
                    if q in (2, 7, 10, 15):
                        drums.put(conga(330), t + sw, 0.28, 0.45)
                    if q in (4, 13):
                        drums.put(conga(215), t + sw, 0.32, -0.4)
                    if q in (6, 14) and (full or s["tense"]):
                        drums.put(conga(390, True), t + sw, 0.22, 0.5)
            if in_fill and q >= 8:  # drum fill before every pillar cut
                k = q - 8
                drums.put(conga(200 + 22 * k, k % 2 == 1), t, 0.25 + 0.03 * k, -0.6 + 0.15 * k)
            # log-drum bass
            if (full or s["tense"] or s["outro"] or (s["intro"] and t >= 1.0)) and q in (0, 3, 6, 10, 11, 14):
                note = ROOTS[ch] + (12 if q == 11 else 7 if q == 6 and ch % 2 == 0 else 0)
                if s["tense"]:
                    note = ROOTS[0]
                bass.put(logdrum(mtof(note - 12 if q in (0, 10) else note), 0.38), t, 0.75 if not s["outro"] else 0.5)
        # pads
        if s["drop"] or s["drop2"] or s["back"] or s["bd"] or s["outro"]:
            harm.put(pad_chord([n - 12 for n in CHORDS[ch]] + [CHORDS[ch][0]], 2.05), t0, 0.55 if not s["bd"] else 0.75)
        # lead hook in the drops (8 bars from 14 s, 3 bars from 72 s)
        if (14 <= t0 < 30) or (44 <= t0 < 60) or (72 <= t0 < 78):
            ph = (b % 2) * 16
            for st, m, ln in HOOK:
                if ph <= st < ph + 16:
                    tn = t0 + (st - ph) * S16
                    lead.put(pluck(m, 0.15 + ln * 0.1), tn, 0.5 if t0 < 44 or t0 >= 72 else 0.35, 0.15)
                    lead.put(pluck(m, 0.15 + ln * 0.1), tn + 3 * S16, 0.18, -0.4)  # dotted-8th echo
    # tense drone 6–12, break pad 12–14
    harm.put(drone(6.0), 6.0, 0.7)
    harm.put(pad_chord([45, 52, 57, 60, 64], 2.0), 12.0, 0.9)
    # risers / reverse cymbals
    fxb.put(noise_riser(1.9), 12.04, 0.55)
    fxb.put(reverse_cymbal(1.5), 13.94 - 1.5, 0.6)
    fxb.put(noise_riser(2.0), 64.0, 0.55)
    fxb.put(reverse_cymbal(1.0), 65.94 - 1.0, 0.5)
    fxb.put(noise_riser(2.0), 70.0, 0.6)
    fxb.put(reverse_cymbal(1.5), 71.94 - 1.5, 0.6)
    for tc in (14.0, 66.0, 72.0):
        fxb.put(crash(), tc, 0.35, 0.2)
    # final hit with long tail
    stab = np.zeros((int(SR * 0.6), 2))
    for m in (45, 57, 60, 64, 69):
        stab += pad_chord([m], 0.6) * 0.5
    hit = reverb(np.stack([kick() * 1.2, kick() * 1.2], 1)[: len(stab)] + stab[: len(kick())] if False else stab, 4.0, 0.55, 7)
    fxb.put(hit, 83.0, 0.9)
    fxb.put(np.stack([kick(1.2)] * 2, 1), 83.0, 1.0)
    fxb.put(reverb(crash(3.0), 3.0, 0.4, 9), 83.0, 0.4)

    # side-chain pump from the kick on bass/harmony
    t = np.arange(len(harm.b)) / SR
    ph = (t % BEAT) / BEAT
    pump = 1 - 0.45 * np.exp(-ph / 0.18)
    pump[(t >= 12) & (t < 14)] = 1
    pump[(t >= 60) & (t < 66)] = 1
    harm.b *= pump[:, None]
    bass.b *= (0.6 + 0.4 * pump)[:, None]

    # intro: low-pass opening 400 Hz → 2 kHz across 0–6 s
    groove = drums.b + bass.b
    head = int(6.0 * SR)
    groove[:head] = sweep_lp(groove[:head], lambda s: 400 * 5 ** (s / 6.0))
    mix = groove + harm.b * 0.8 + lead.b * 0.9 + fxb.b
    mix = mix[:N]
    mix /= np.max(np.abs(mix)) + 1e-9
    return mix * 0.89


if __name__ == "__main__":
    import wave
    out = build()
    with wave.open(sys.argv[1], "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
    print("wrote", sys.argv[1], f"{len(out) / SR:.2f} s")
