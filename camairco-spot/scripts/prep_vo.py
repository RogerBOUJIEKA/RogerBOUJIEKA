"""Tighten the ElevenLabs take so the voiceover fits a 15 s spot.

Cuts happen inside detected silences only, then a gentle time-stretch is applied.
Writes audio/vo.wav and prints the segment timings used by the animation.
"""
import json, subprocess, sys
import numpy as np

SR = 48000
SRC, OUT = sys.argv[1], sys.argv[2]
TEMPO = 1.07
LEAD = 0.22  # seconds of silence before the first word

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", SRC, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).copy()

# (start, end, label) in the original take; boundaries sit inside silences
segs = [(0.00, 2.86, "Au départ de Douala, Yaoundé et Garoua…"),
        (3.16, 5.32, "Camair-Co vous ouvre le ciel d'Afrique."),
        (5.54, 8.99, "Libreville, Cotonou, Brazzaville, N'Djamena…"),
        (9.38, 13.00, "Voyagez en confiance, portés par l'hospitalité camerounaise."),
        (13.23, 14.04, "Camair-Co."),
        (14.34, 15.66, "L'étoile du Cameroun.")]
gaps = [0.22, 0.20, 0.26, 0.24, 0.26]

def fade(a, n=240):
    a = a.copy(); r = np.linspace(0, 1, n, dtype=np.float32)
    a[:n] *= r; a[-n:] *= r[::-1]; return a

parts, timeline, t = [], [], 0.0
for i, (s, e, label) in enumerate(segs):
    chunk = fade(x[int(s * SR):int(e * SR)])
    parts.append(chunk)
    timeline.append({"label": label, "start": t, "end": t + len(chunk) / SR})
    t += len(chunk) / SR
    if i < len(gaps):
        parts.append(np.zeros(int(gaps[i] * SR), np.float32)); t += gaps[i]
y = np.concatenate(parts)

tmp = OUT + ".tmp.f32"
y.astype(np.float32).tofile(tmp)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                "-af", f"atempo={TEMPO},adelay={int(LEAD*1000)}", "-ar", str(SR), OUT], check=True)
for seg in timeline:
    seg["start"] = round(LEAD + seg["start"] / TEMPO, 3); seg["end"] = round(LEAD + seg["end"] / TEMPO, 3)
print(json.dumps(timeline, ensure_ascii=False, indent=1))
