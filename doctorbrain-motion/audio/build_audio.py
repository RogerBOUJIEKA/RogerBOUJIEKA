"""Bande-son du clip Doctor Brain : musique d'ambiance + effets sonores + voix off.

Tout est synthétisé ici (numpy seulement), calé sur build/cues.json exporté par
render-clip.mjs. Sortie : build/mix.wav (48 kHz, stéréo).
Usage : python3 audio/build_audio.py
"""
import json
import os
import subprocess
import wave

import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUILD = os.path.join(ROOT, 'build')
rng = np.random.default_rng(7)

meta = json.load(open(os.path.join(BUILD, 'cues.json')))
DUR = meta['dur']
N = int(DUR * SR) + SR


# ---------------------------------------------------------------- outils
def t_axis(d):
    return np.arange(int(d * SR)) / SR


def env_ad(n, a, d_curve=None):
    """Enveloppe attaque linéaire (a s) puis décroissance fournie."""
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    if d_curve is not None:
        e *= d_curve
    return e


def band(x, lo=None, hi=None, order=2):
    """Filtre passe-bande doux appliqué dans le domaine fréquentiel."""
    n = len(x)
    X = np.fft.rfft(x, n)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        g /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * g, n)


def pan(x, p):
    """p : -1 (gauche) … 1 (droite), scalaire ou tableau."""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def conv(x, ir):
    n = len(x) + len(ir) - 1
    nfft = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]


def make_ir(dur=2.2, decay=2.6, seed=1):
    r = np.random.default_rng(seed)
    t = t_axis(dur)
    irs = []
    for _ in range(2):
        noise = r.standard_normal(len(t)) * np.exp(-t * decay)
        noise = band(noise, 150, 6500)
        noise[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
        irs.append(noise / np.sqrt(np.sum(noise ** 2)))
    return irs


IR = make_ir()


def reverb(st, wet=.2):
    return np.stack([st[0] * (1 - wet) + conv(st[0], IR[0]) * wet * 3,
                     st[1] * (1 - wet) + conv(st[1], IR[1]) * wet * 3])


def tone(freq, d, partials=((1, 1),), decay=6.0, a=.003):
    t = t_axis(d)
    y = sum(amp * np.sin(2 * np.pi * freq * k * t) * np.exp(-t * decay * (1 + .6 * (k - 1)))
            for k, amp in partials)
    return y * env_ad(len(t), a)


# ---------------------------------------------------------------- effets sonores
def sfx_whoosh(d=.55, lo=300, hi=5000):
    t = t_axis(d)
    n = rng.standard_normal(len(t))
    layers = [band(n, lo * 1.0, lo * 2.2), band(n, lo * 2, hi * .5), band(n, hi * .35, hi)]
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    pos = t / d
    mix = layers[0] * (1 - pos) + layers[1] * np.sin(np.pi * pos) + layers[2] * pos ** 2
    y = norm(mix * shape, .9)
    return pan(y, np.linspace(-.7, .7, len(t)))


def sfx_swish():
    return sfx_whoosh(.26, 900, 9000) * .8


def sfx_pop():
    t = t_axis(.16)
    f = 380 + 700 * np.exp(-t * 45)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
    click = band(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t * 400) * .25
    return pan(norm(y + click, .8), 0)


def sfx_click():
    out = np.zeros(int(.12 * SR))
    for off, g, f in ((0, 1, 3200), (.055, .55, 2600)):
        t = t_axis(.04)
        y = band(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 260) * .6
        y += np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * .5
        i = int(off * SR)
        out[i:i + len(y)] += y * g
    return pan(norm(out, .7), .15)


def sfx_tick():
    t = t_axis(.06)
    y = np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 90) + np.sin(2 * np.pi * 3700 * t) * np.exp(-t * 160) * .3
    return pan(norm(y, .5), rng.uniform(-.4, .4))


def sfx_paper():
    t = t_axis(.12)
    y = band(rng.standard_normal(len(t)), 900, 5000) * np.exp(-t * 38)
    y += np.sin(2 * np.pi * 140 * t) * np.exp(-t * 60) * .4
    return pan(norm(y, .6), rng.uniform(-.5, .5))


_clock_flip = [0]


def sfx_clock():
    _clock_flip[0] ^= 1
    f = 2400 if _clock_flip[0] else 1700
    t = t_axis(.05)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 120) + band(rng.standard_normal(len(t)), 2000, 8000) * np.exp(-t * 300) * .3
    return pan(norm(y, .55), .25 if _clock_flip[0] else -.25)


BELL = ((1, 1), (2.0, .5), (2.76, .32), (5.4, .12))


def sfx_ding():
    out = np.zeros(int(1.8 * SR))
    for off, f in ((0, 1046.5), (.09, 1567.98)):
        y = tone(f, 1.6, BELL, decay=3.2)
        i = int(off * SR)
        out[i:i + len(y)] += y
    return reverb(pan(norm(out, .7), 0), .25)


def sfx_rise():
    out = np.zeros(int(1.6 * SR))
    for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
        y = tone(f, 1.2, BELL, decay=4)
        i = int(k * .075 * SR)
        out[i:i + len(y)] += y * (.7 + k * .1)
    return reverb(pan(norm(out, .7), 0), .3)


def sfx_beep():
    t = t_axis(.14)
    y = np.sin(2 * np.pi * 988 * t) * np.minimum(1, np.minimum(t / .008, (.14 - t) / .03))
    return pan(norm(y, .45), 0)


def sfx_flip():
    a = sfx_whoosh(.18, 1200, 8000) * .7
    b = sfx_paper()
    out = np.zeros((2, int(.35 * SR)))
    out[:, :a.shape[1]] += a
    i = int(.13 * SR)
    out[:, i:i + b.shape[1]] += b * 1.2
    return out


def sfx_shimmer():
    d = 1.4
    out = np.zeros((2, int(d * SR)))
    for _ in range(26):
        f = rng.uniform(2600, 7800)
        st = rng.uniform(0, .5)
        y = tone(f, .9, ((1, 1),), decay=rng.uniform(4, 8), a=.01) * rng.uniform(.2, .6)
        i = int(st * SR)
        out[:, i:i + len(y)] += pan(y, rng.uniform(-.9, .9))
    return reverb(norm(out, .45), .45)


def sfx_riser(d=1.2):
    t = t_axis(d)
    n = rng.standard_normal(len(t))
    y = band(n, 800, 9000) * (t / d) ** 2.2
    f = 300 + 900 * (t / d) ** 2
    y += np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 2 * .25
    y[-int(.03 * SR):] *= np.linspace(1, 0, int(.03 * SR))
    return reverb(pan(norm(y, .6), np.linspace(-.3, .3, len(t))), .3)


def sfx_swell():
    d = .9
    t = t_axis(d)
    y = band(rng.standard_normal(len(t)), 400, 6000) * (t / d) ** 2.5
    y[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
    return reverb(pan(norm(y, .5), 0), .4)


def sfx_impact():
    t = t_axis(1.6)
    f = 46 + 70 * np.exp(-t * 9)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.8)
    y += band(rng.standard_normal(len(t)), 60, 900) * np.exp(-t * 14) * .35
    y += tone(523.25, 1.6, BELL, decay=2.5) * .12
    return reverb(pan(norm(y, .9), 0), .3)


BUILDERS = {
    'whoosh': sfx_whoosh, 'swish': sfx_swish, 'pop': sfx_pop, 'click': sfx_click, 'tick': sfx_tick,
    'paper': sfx_paper, 'clock': sfx_clock, 'ding': sfx_ding, 'rise': sfx_rise, 'beep': sfx_beep,
    'flip': sfx_flip, 'shimmer': sfx_shimmer, 'riser': lambda: sfx_riser(1.2), 'riserS': lambda: sfx_riser(.55),
    'swell': sfx_swell, 'impact': sfx_impact,
}
# les montées démarrent avant leur repère pour culminer sur la transition
PRE = {'riser': .55, 'riserS': .3, 'swell': .75}


def place(bus, x, t, g=1.0):
    i = max(0, int(t * SR))
    n = min(x.shape[1], bus.shape[1] - i)
    if n > 0:
        bus[:, i:i + n] += x[:, :n] * g


sfx = np.zeros((2, N))
for t, kind, g in meta['cues']:
    x = BUILDERS[kind]()
    place(sfx, x, t - PRE.get(kind, 0), g)

# ---------------------------------------------------------------- musique
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# Fmaj7 – Cmaj7/E – Am7 – Gsus2 (2 mesures chacun)
CHORDS = [
    ([53, 60, 64, 69], 41), ([52, 59, 64, 67], 36), ([57, 60, 64, 67], 45), ([55, 62, 67, 69], 43),
]
ARP = [[65, 69, 72, 76], [64, 67, 71, 76], [64, 67, 69, 72], [62, 67, 69, 74]]


def soft_saw(f, d, a=1.2, r=1.6):
    t = t_axis(d + r)
    y = np.zeros(len(t))
    for det in (-.12, 0, .12):
        ff = f * 2 ** (det / 12 * .5)
        ph = rng.uniform(0, 6.28)
        for k in range(1, 7):
            y += np.sin(2 * np.pi * ff * k * t + ph * k) / k ** 1.6
    e = np.clip(t / a, 0, 1) * np.where(t < d, 1, np.exp(-(t - d) * 3 / r))
    return y * e / 3


def pluck(f, d=.55):
    t = t_axis(d)
    y = (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8)) * np.exp(-t * 7)
    return y * env_ad(len(t), .004)


def kick():
    t = t_axis(.35)
    f = 48 + 80 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def shaker():
    t = t_axis(.07)
    return band(rng.standard_normal(len(t)), 5000, 12000) * np.exp(-t * 60)


pad = np.zeros((2, N))
arp = np.zeros((2, N))
bass = np.zeros(N)
drums = np.zeros((2, N))


def lvl(t, pts):
    """interpolation linéaire d'une courbe de niveau [(t, v), …]"""
    xs, vs = zip(*pts)
    return float(np.interp(t, xs, vs))


PAD_LV = [(0, .55), (6, .7), (12, .8), (16, 1), (79.5, 1), (80.4, .5), (81, 1.1), (88, 1)]
ARP_LV = [(0, 0), (11.8, 0), (12.6, .55), (16, .8), (20, 1), (79.4, 1), (80.2, 0), (81.5, .6), (86, .4)]
BASS_LV = [(0, 0), (15.8, 0), (16.6, .9), (79.4, .9), (80.0, 0), (81, .7), (88, .5)]
KICK_LV = [(0, 0), (20.2, 0), (20.6, .8), (79.2, .8), (79.6, 0)]
SHK_LV = [(0, 0), (26.0, 0), (26.6, .5), (79.2, .5), (79.6, 0)]

nbars = int(DUR / BAR) + 2
for b in range(nbars):
    t0 = b * BAR
    chord, root = CHORDS[(b // 2) % 4]
    if b % 2 == 0:
        for k, m in enumerate(chord):
            y = soft_saw(midi(m), BAR * 2, a=1.4, r=1.8) * lvl(t0, PAD_LV)
            place(pad, pan(y, (-.5, -.15, .15, .5)[k]), t0, .9)
    for s in range(8):  # croches
        ts = t0 + s * BEAT / 2
        if ts > DUR:
            break
        notes = ARP[(b // 2) % 4]
        m = notes[[0, 1, 2, 3, 2, 1, 3, 2][s]] + (12 if s == 6 and b % 4 == 3 else 0)
        g = lvl(ts, ARP_LV) * (1 if s % 2 == 0 else .7)
        if g > 0:
            place(arp, pan(pluck(midi(m)), (-.45, .45)[s % 2]), ts, g * .5)
        gs = lvl(ts, SHK_LV)
        if gs > 0:
            place(drums, pan(shaker(), .3), ts + .012, gs * (.5 if s % 2 else .25))
    for s in (0, 2):
        ts = t0 + s * BEAT
        gk = lvl(ts, KICK_LV)
        if gk > 0:
            place(drums, pan(kick(), 0), ts, gk * .9)
    gb = lvl(t0, BASS_LV)
    if gb > 0:
        for s in (0, 3, 4, 7):
            tb = t0 + s * BEAT / 2 * (1 if s < 4 else 1)
            t = t_axis(BEAT * .9)
            y = np.sin(2 * np.pi * midi(root) * t) * np.exp(-t * 2.2) * env_ad(len(t), .01)
            i = int(tb * SR)
            n = min(len(y), N - i)
            bass[i:i + n] += y[:n] * gb * (.9 if s in (0, 4) else .55)

# accord final tenu (outro)
for k, m in enumerate([53, 60, 64, 69, 72]):
    y = soft_saw(midi(m), 6.5, a=1.0, r=2.5)
    place(pad, pan(y, (-.6, -.3, 0, .3, .6)[k]), 81.0, .55)

pad = np.stack([band(pad[0], 80, 2600), band(pad[1], 80, 2600)])
arp = np.stack([band(arp[0], 200, 6000), band(arp[1], 200, 6000)])
music = reverb(pad * .55 + arp * .55, .35) + pan(band(bass, 30, 400), 0) * .5 + drums * .55
music = norm(music, .9)

# ---------------------------------------------------------------- voix off
vo = np.zeros(N)
vo_mask = np.zeros(N)
for t, k in meta['vo']:
    path = os.path.join(HERE, 'vo', f'vo{k:02d}.mp3')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).astype(np.float64)
    i = int(t * SR)
    n = min(len(y), N - i)
    vo[i:i + n] += y[:n]
    vo_mask[i:i + n] = 1
# voix : légère présence + douceur (coupe-bas, atténue la dureté)
vo = band(vo, 80, 11000)
vo = norm(vo, .9)

# ducking : la musique baisse sous la voix (attaque 0.15 s, relâchement 0.5 s)
k = int(.5 * SR)
cs = np.concatenate([[0], np.cumsum(vo_mask)])
idx = np.arange(N)
smooth = (cs[np.clip(idx + k // 2, 0, N)] - cs[np.clip(idx - k // 2, 0, N)]) / k
duck = 1 - .5 * np.clip(smooth * 1.6, 0, 1)

# ---------------------------------------------------------------- mix
mix = music * .30 * duck + sfx * .28 + pan(vo, 0) * 1.0
fade = np.ones(N)
fi, fo = int(.3 * SR), int(1.8 * SR)
fade[:fi] = np.linspace(0, 1, fi)
end = int(DUR * SR)
fade[end - fo:end] = np.linspace(1, 0, fo)
fade[end:] = 0
mix = mix * fade
mix = mix[:, :end]
# limiteur doux
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = norm(mix, .95)

out = os.path.join(BUILD, 'mix.wav')
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
# pistes séparées (utile pour un remontage)
for name, bus in (('music', music * .30 * duck), ('sfx', sfx * .28), ('vo', pan(vo, 0))):
    b = np.clip(bus[:, :end], -1, 1)
    with wave.open(os.path.join(BUILD, f'stem-{name}.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((b.T * 32767).astype(np.int16).tobytes())
print('OK', out, f'{DUR}s')
