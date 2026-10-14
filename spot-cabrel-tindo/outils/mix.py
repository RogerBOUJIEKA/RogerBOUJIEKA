# Audio mix for the spot: VO + gospel music bed (ducked) + choir finale + SFX -> 48k stereo master.
import numpy as np, subprocess, json, sys, os
import librosa, soundfile as sf
from timeline import *

S = '/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad'
G = S + '/gen/'
OUT = S + '/out/'
os.makedirs(OUT, exist_ok=True)
SR = 48000
N = int(DUR * SR)
VO_TAKE = sys.argv[1] if len(sys.argv) > 1 else '5TuzJOLGE1veebKYvRAE'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'main'

def load(f, mono=False):
    y, _ = librosa.load(G + f + '.mp3', sr=SR, mono=mono)
    if y.ndim == 1:
        y = np.stack([y, y])
    return y.astype(np.float32)

def db(x): return 10 ** (x / 20)

def fade(y, fin=0.005, fout=0.01):
    y = y.copy(); n = y.shape[-1]
    a = min(int(fin * SR), n); b = min(int(fout * SR), n)
    if a: y[..., :a] *= np.linspace(0, 1, a)
    if b: y[..., n - b:] *= np.linspace(1, 0, b)
    return y

def place(bus, y, t, gain_db=0.0):
    i = int(round(t * SR))
    if i >= bus.shape[1]: return
    j = min(bus.shape[1], i + y.shape[1])
    bus[:, max(i, 0):j] += y[:, max(0, -i):j - i] * db(gain_db)

def ffproc(y, af):
    """run a stereo float buffer through an ffmpeg audio filter chain"""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'pipe:0',
                        '-af', af, '-f', 'f32le', '-ar', str(SR), '-ac', '2', 'pipe:1'],
                       input=y.T.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).reshape(-1, 2).T.copy()

# ---------- VOICE ----------
vo_raw = load(VO_TAKE)
# broadcast announcer chain: rumble cut, warmth, presence, de-ess-ish, compression
VO_CHAIN = ("highpass=f=75,equalizer=f=140:t=q:w=1.0:g=2.5,equalizer=f=350:t=q:w=1.2:g=-2,"
            "equalizer=f=3200:t=q:w=1.0:g=3,equalizer=f=7500:t=q:w=2:g=-2,"
            "acompressor=threshold=-20dB:ratio=3.5:attack=8:release=120:makeup=4dB")
vo_proc = ffproc(vo_raw, VO_CHAIN)
vo_bus = np.zeros((2, N), np.float32)
vo_env_mask = np.zeros(N, np.float32)
for cid, s, e, p, txt in VO:
    clip = fade(vo_proc[:, int(s * SR):int(e * SR)], 0.004, 0.02)
    act = np.abs(clip[0]) > 0.01
    r = np.sqrt(np.mean(clip[0][act] ** 2)) if act.any() else 0.1
    clip = clip * min(db(6), db(-17.5) / max(r, 1e-4))   # clip-gain: every line at the same loudness
    if cid in ('c06',):          # "CABREL TINDO !" -> stadium echo
        tail = np.zeros((2, int(1.8 * SR)), np.float32)
        clip = np.concatenate([clip, tail], axis=1)
        clip = ffproc(clip, "aecho=0.8:0.55:260|520:0.38|0.22")
    if cid in ('c18',):          # final line -> soft hall tail
        tail = np.zeros((2, int(1.2 * SR)), np.float32)
        clip = np.concatenate([clip, tail], axis=1)
        clip = ffproc(clip, "aecho=0.85:0.5:180|360:0.22|0.12")
    if cid in ('c06', 'c18'):   # echo lowers the level: bring the dry line back to the common loudness
        n0 = int((e - s) * SR); act = np.abs(clip[0, :n0]) > 0.01
        r = np.sqrt(np.mean(clip[0, :n0][act] ** 2)) if act.any() else 0.1
        clip = clip * min(db(9), db(-17.5) / max(r, 1e-4))
    place(vo_bus, clip, p, 0)
    a = int(p * SR); b = min(N, int((p + (e - s)) * SR))
    vo_env_mask[a:b] = 1

# ducking envelope (attack 60ms, release 350ms)
def smooth(mask, att, rel):
    out = np.zeros_like(mask); g = 0.0
    a = 1 - np.exp(-1 / (att * SR)); r = 1 - np.exp(-1 / (rel * SR))
    # vectorised-ish via chunks of 48 samples
    step = 48
    for k in range(0, len(mask), step):
        m = mask[k]
        g += (m - g) * (1 - (1 - (a if m > g else r)) ** step)
        out[k:k + step] = g
    return out
duck = smooth(vo_env_mask, 0.06, 0.35)

# ---------- MUSIC: original gospel score, composed on the spot timeline ----------
music, _ = librosa.load(S + '/music/gospel_score.wav', sr=SR, mono=False)
mus_bus = np.zeros((2, N), np.float32); mus_bus[:, :min(N, music.shape[1])] = music[:, :N]
ch_bus = np.zeros((2, N), np.float32)

# music-bed gain automation: lower in intro under VO, ducked under VO, full in gaps
bed_gain = np.ones(N, np.float32)
bed = (mus_bus + ch_bus)
# base levels
base = np.full(N, db(-5), np.float32)
t = np.arange(N) / SR
base[t < DROP_T] = db(+2)                         # worship intro
base[(t > 67.4) & (t < 74.3)] = db(-8)
base[(t > 15.0) & (t < 20.15)] = db(-1.5)          # build-up under 'L'Alliance... vous présente'            # last VO line over the finale: keep the voice on top
duck_amt = db(-6)
g = base * (1 - duck * (1 - duck_amt))
# let the drop + title breathe
g[(t > 20.1) & (t < 20.3)] = np.maximum(g[(t > 20.1) & (t < 20.3)], db(-3))
# final choir up after last VO line, then fade to end
fin = (t > 74.2)
g[fin] = np.minimum(1.0, g[fin] * 1.0)
g[t > SIG['in'] - .2] = db(-2)                      # signature: score in the foreground
g[t > SIG['out0']] *= np.clip((DUR - t[t > SIG['out0']]) / (DUR - SIG['out0']), 0, 1)
bed *= g[None, :]

# ---------- SFX ----------
sfx_bus = np.zeros((2, N), np.float32)
SFX = {
    'boom': 'UX73iMnG4pF9sfPnEHud', 'boom2': 'YzXeOFD0slUev0uqqqXp',
    'whoosh': '8QfgN0Zsj9eWIeY5GGPf', 'whoosh2': 'oXFXEBF446ZebvLEQnlr',
    'laugh': 'BG0rIUSGzkrCyzREh4Su', 'laugh2': 'ZgZ4x9KtipGpTKWvRd4T',
    'cheer': 'LBM999FMTfArVoMFckP3', 'cheer2': 'HqTszoceje86F1HKncEI',
    'riser': 'q20xLdHpplXWJTeibuwW', 'cash': 'QkfSErViMoeMpRh2eY4K',
    'ticket': 'myTeKpiSzkpsfqBXSnaG', 'ticket2': 'HTJVwuIItL0T0ZC8T1vb',
    'murmur': 'qgtObZROy89NYo6rMCdQ', 'drum': 'rlo6WZVug5aVQaW1MVYo',
    'drum2': '4XGmLfkA3tdIlzmO0049', 'slam': 'OINjou0X0IA2EzdfYgs3',
    'shimmer': 'b6IG31b7mXgwAdFUVssJ', 'shimmer2': 'ZCxPI3LgNUs0RqbSZEF0',
    'wings': 'pI9ukr5SzxUuUppDagEm', 'wings2': 'RH72LroT53BjOe78nVVa', 'heaven': '0Is8M2iFRpr3lWdzUXRO',
}
cache = {}
def sfx(name, t0, gain=-6, dur=None, fout=0.3):
    if name not in cache: cache[name] = load(SFX[name])
    y = cache[name]
    if dur: y = y[:, :int(dur * SR)]
    place(sfx_bus, fade(y, 0.003, fout), t0, gain)

# timeline of sound design (T seconds)
sfx('murmur', 0.0, -27, dur=5.2, fout=1.5)
sfx('boom', 0.45, -15)
sfx('whoosh', 4.55, -10)
sfx('shimmer', 7.4, -16)                 # "cuillère en or"
sfx('whoosh2', 8.80, -10)
sfx('slam', 10.60, -12)                  # "machette"
sfx('laugh', 11.55, -12, dur=3.6, fout=1.2)
sfx('whoosh', 12.65, -11)
sfx('drum', 14.70, -11)
sfx('riser', 15.25, -13)
sfx('boom2', 20.30, -9)                  # DROP / CABREL TINDO
sfx('cheer', 20.30, -14, dur=4.5, fout=1.5)
sfx('shimmer2', 22.20, -15)
sfx('whoosh2', 25.25, -11)
sfx('laugh2', 26.50, -12, dur=3.2, fout=1.2)   # "rire aux éclats"
sfx('drum2', 29.70, -11)
sfx('slam', 31.25, -15); sfx('slam', 33.30, -15); sfx('slam', 34.60, -15)
sfx('whoosh', 36.45, -10)
sfx('ticket', 38.70, -9); sfx('slam', 39.70, -11); sfx('cash', 39.95, -12)
sfx('ticket2', 40.80, -9); sfx('slam', 41.85, -11); sfx('cash', 42.10, -12)
sfx('ticket', 43.00, -9); sfx('slam', 45.85, -9); sfx('cash', 46.10, -11); sfx('shimmer', 45.9, -16)
sfx('drum', 47.20, -11)
for tt in (48.83, 49.91, 50.67, 51.37):
    sfx('slam', tt, -17)
sfx('whoosh2', 52.75, -13)
for tt in (53.76, 54.80, 55.60, 56.30):
    sfx('slam', tt, -17)
sfx('whoosh', 57.80, -11)
sfx('whoosh2', 62.55, -11)
sfx('laugh', 65.95, -11, dur=3.0, fout=1.0)
sfx('cheer2', 66.30, -14, dur=3.0, fout=1.0)
sfx('boom', 67.50, -15, dur=2.5, fout=1.0)
sfx('heaven', SIG['in'] + .05, -12, fout=1.2)                       # signature: heavenly swell
sfx('wings', SIG['arrive0'], -7)                                       # the dove flies in
sfx('shimmer2', SIG['land1'] - .05, -11); sfx('boom2', SIG['land1'], -17, dur=2.5, fout=1.0)   # lands on the B
sfx('shimmer', SIG['shine'], -18)                                      # shine on the logo
sfx('wings2', SIG['take'] - .05, -6)                                   # takes off again
sfx('whoosh2', SIG['flyover0'] - .1, -15)                              # flies over the letters
sfx('wings', SIG['land2'] - .9, -9)                                    # comes back
sfx('shimmer2', SIG['land2'] - .05, -10); sfx('boom', SIG['land2'], -18, dur=2.5, fout=1.0)

# ---------- MASTER ----------
mix = vo_bus * db(0) + bed + sfx_bus
mix[:, -int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
pre = OUT + f'mix_pre_{TAG}.wav'
sf.write(pre, mix.T, SR, subtype='FLOAT')
master = OUT + f'master_{TAG}.wav'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', pre, '-af',
                'loudnorm=I=-14:TP=-1.2:LRA=9:print_format=summary,alimiter=limit=0.89:level=false',
                '-ar', str(SR), '-c:a', 'pcm_s24le', master], check=True)
# stems for the client
sf.write(OUT + f'stem_voice_{TAG}.wav', vo_bus.T, SR, subtype='PCM_24')
sf.write(OUT + f'stem_music_{TAG}.wav', bed.T, SR, subtype='PCM_24')
sf.write(OUT + f'stem_sfx_{TAG}.wav', sfx_bus.T, SR, subtype='PCM_24')
print('master ->', master)

# version without music (voice + sound design) so a licensed song can be laid in by the editor
nm = vo_bus + sfx_bus
pre2 = OUT + f'mix_pre_nomusic_{TAG}.wav'
sf.write(pre2, nm.T, SR, subtype='FLOAT')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', pre2, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=false',
                '-ar', str(SR), '-c:a', 'pcm_s24le', OUT + f'master_nomusic_{TAG}.wav'], check=True)
