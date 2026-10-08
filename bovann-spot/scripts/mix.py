"""Place the voice lines, duck the music −6 dB under the voice, mix with the SFX, loudness −14 LUFS / −1 dBTP.
python3 scripts/mix.py audio/raw/vo_d.mp3 audio/mix.wav"""
import sys, subprocess, json, re, wave
import numpy as np
from scipy.signal import butter, sosfilt
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from split_vo import load, split

SR = 48000
N = int(84.0 * SR)
# Start time of each line inside its scene window (s).
STARTS = [0.45, 6.3, 12.1, 14.35, 20.4, 28.4, 36.4, 44.4, 52.4, 62.8, 68.9, 72.25, 76.3]
WINDOW_END = [6, 12, 14, 20, 28, 36, 44, 52, 60, 66, 72, 76, 84]


def wav(p):
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
        return x.reshape(-1, w.getnchannels())


x = load(sys.argv[1])
segs, _ = split(x)
vo = np.zeros(N)
for k, ((a, b), t0) in enumerate(zip(segs, STARTS)):
    seg = x[max(0, int((a - 0.04) * SR)): int((b + 0.12) * SR)].copy()
    seg[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    seg[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    end = t0 + len(seg) / SR
    assert end <= WINDOW_END[k] + 0.05, f"line {k} ends at {end:.2f} > {WINDOW_END[k]}"
    i = int(t0 * SR)
    vo[i:i + len(seg)] += seg[: N - i]
    print(f"line {k:2d}  {t0:6.2f} → {end:6.2f}")
# light polish: high-pass rumble, gentle presence
vo = sosfilt(butter(2, 90, "high", fs=SR, output="sos"), vo)
vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.7

music, sfx = wav("audio/music.wav")[:N], wav("audio/sfx.wav")[:N]
# side-chain duck: −6 dB while the voice speaks (40 ms attack, 250 ms release)
env = np.abs(vo)
hop = 480
frames = env[: len(env) // hop * hop].reshape(-1, hop).max(1) > 0.02
g = np.where(frames, 10 ** (-6 / 20), 1.0)
sm = np.empty_like(g); cur = 1.0
for i, v in enumerate(g):
    k = 1 - np.exp(-1 / (4 if v < cur else 25))
    cur += (v - cur) * k; sm[i] = cur
duck = np.repeat(sm, hop); duck = np.pad(duck, (0, N - len(duck)), constant_values=1)
mix = music * 0.62 * duck[:, None] + sfx * 0.85 + np.stack([vo, vo], 1) * 1.0
fade = int(0.06 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
pre = sys.argv[2].replace(".wav", "_pre.wav")
with wave.open(pre, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix * 0.7, -1, 1) * 32767).astype("<i2").tobytes())

# two-pass loudnorm
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
mtr = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r, re.S).group(0))
af = ("loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:"
      "measured_thresh={input_thresh}:offset={target_offset}").format(**mtr)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af", af + ",aresample=48000", "-t", "84", "-c:a", "pcm_s16le", sys.argv[2]], check=True)
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", sys.argv[2], "-af", "loudnorm=I=-14:TP=-1:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
chk = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r, re.S).group(0))
print(f"final: {chk['input_i']} LUFS, true peak {chk['input_tp']} dBTP")
