"""Assemble la voix off sur la timeline, puis mixe voix + musique + effets.

Usage : python mix.py timeline.json vo_dir music_raw.wav sfx.wav out_dir
Produit out_dir/voix.wav, out_dir/musique.wav, out_dir/mix.wav (48 kHz stéréo, -14 LUFS).
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(m[-1])


def gain_to(path, target, out):
    g = target - lufs(path)
    run(["ffmpeg", "-v", "error", "-y", "-i", path, "-af", f"volume={g:.2f}dB", "-c:a", "pcm_f32le", out])


def main(tl_path, vo_dir, music_raw, sfx, out_dir):
    tl = json.load(open(tl_path))
    total = tl["total"]
    n = int(total * SR)
    os.makedirs(out_dir, exist_ok=True)

    # ---------------- voix : placement des segments
    vo = np.zeros(n)
    for s in tl["segments"]:
        x, sr = sf.read(os.path.join(vo_dir, s["id"] + ".wav"))
        x = signal.resample_poly(x, SR, sr)
        fade = int(0.012 * SR)
        x[:fade] *= np.linspace(0, 1, fade)
        x[-fade:] *= np.linspace(1, 0, fade)
        i = int(s["start"] * SR)
        vo[i:i + len(x)] += x[: n - i]
    # petite réverbération de pièce pour adoucir la voix
    rng = np.random.default_rng(3)
    ir_t = np.arange(int(0.6 * SR)) / SR
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 9)
    ir = signal.lfilter(*signal.butter(1, 5000 / (SR / 2)), ir)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = signal.fftconvolve(vo, ir)[:n]
    vo_st = np.stack([vo + 0.10 * wet, vo + 0.10 * np.roll(wet, 240)], axis=1)
    raw_vo = os.path.join(out_dir, "voix_brute.wav")
    sf.write(raw_vo, vo_st.astype(np.float32), SR)

    # égalisation chaleureuse + compression douce
    eq_vo = os.path.join(out_dir, "voix_eq.wav")
    run(["ffmpeg", "-v", "error", "-y", "-i", raw_vo, "-af",
         "highpass=f=75,equalizer=f=220:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.2:g=2,equalizer=f=7500:t=q:w=1.5:g=-2.5,"
         "acompressor=threshold=-20dB:ratio=3:attack=8:release=180:makeup=2",
         "-c:a", "pcm_f32le", eq_vo])
    voix = os.path.join(out_dir, "voix.wav")
    gain_to(eq_vo, -16.0, voix)

    # ---------------- musique : coupe à 89 s, fondu final, niveau
    mus_cut = os.path.join(out_dir, "musique_cut.wav")
    run(["ffmpeg", "-v", "error", "-y", "-i", music_raw, "-af",
         f"atrim=0:{total},afade=t=in:st=0:d=0.6,afade=t=out:st={total - 1.4}:d=1.4,"
         "equalizer=f=300:t=q:w=1:g=-1.5,equalizer=f=2800:t=q:w=1:g=-2",
         "-ar", str(SR), "-c:a", "pcm_f32le", mus_cut])
    musique = os.path.join(out_dir, "musique.wav")
    gain_to(mus_cut, -22.0, musique)

    effets = os.path.join(out_dir, "effets.wav")
    gain_to(sfx, -25.0, effets)

    # ---------------- mixage : la musique s'efface sous la voix (ducking)
    mix = os.path.join(out_dir, "mix_pre.wav")
    run(["ffmpeg", "-v", "error", "-y", "-i", voix, "-i", musique, "-i", effets, "-filter_complex",
         "[0:a]asplit=2[v][vk];"
         "[1:a][vk]sidechaincompress=threshold=0.03:ratio=3.5:attack=25:release=450:makeup=1[m];"
         "[v][m][2:a]amix=inputs=3:normalize=0,alimiter=limit=0.89:level=false[out]",
         "-map", "[out]", "-c:a", "pcm_f32le", mix])
    final = os.path.join(out_dir, "mix.wav")
    run(["ffmpeg", "-v", "error", "-y", "-i", mix, "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
         "-ar", str(SR), "-c:a", "pcm_s16le", final])
    print(f"voix {lufs(voix):.1f} | musique {lufs(musique):.1f} | effets {lufs(effets):.1f} | mix {lufs(final):.1f} LUFS")


if __name__ == "__main__":
    main(*sys.argv[1:6])
