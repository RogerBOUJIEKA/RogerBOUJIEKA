#!/usr/bin/env bash
# Mix voice-over + music bed (ducked under the voice) + sound design, master to -16 LUFS / -1.5 dBTP.
set -euo pipefail
cd "$(dirname "$0")/.."
VO=audio/vo.wav; MUSIC=audio/raw/music1.mp3; SFX=audio/sfx.wav; OUT=${1:-audio/mix.wav}
# Music starts 0.68 s into the track so its final hit lands on the logo (12.37 s).
GRAPH="
[0:a]highpass=f=90,equalizer=f=220:t=q:w=1.2:g=-1.5,equalizer=f=3800:t=q:w=1.0:g=2.5,acompressor=threshold=-24dB:ratio=3:attack=4:release=90:makeup=3,volume=5.5dB,aformat=channel_layouts=stereo,apad=whole_dur=15,asplit=2[vo][key];
[1:a]atrim=start=0.68,asetpts=PTS-STARTPTS,afade=t=in:d=0.12,apad=whole_dur=15,volume=-3dB[mus];
[mus][key]sidechaincompress=threshold=0.06:ratio=2.5:attack=25:release=350:makeup=1[duck];
[2:a]volume=-1dB,apad=whole_dur=15[fx];
[vo][duck][fx]amix=inputs=3:normalize=0:duration=longest,atrim=0:15"
ffmpeg -v error -y -i "$VO" -i "$MUSIC" -i "$SFX" -filter_complex "$GRAPH" -ar 48000 -c:a pcm_f32le audio/premix.wav
# two-pass loudness normalisation
STATS=$(ffmpeg -hide_banner -nostats -i audio/premix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$STATS" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i audio/premix.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,afade=t=out:st=14.85:d=0.15" -ar 48000 -c:a pcm_s24le "$OUT"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true:framelog=quiet -f null - 2>&1 | grep -E "^\s+(I|Peak|LRA):"
