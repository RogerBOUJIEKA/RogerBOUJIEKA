#!/usr/bin/env bash
# Mix the 88 s cut: voice-over + music bed (ducked under the voice) + sound design, master to -16 LUFS / -1.5 dBTP.
set -euo pipefail
cd "$(dirname "$0")/.."
VO=audio/vo.wav; MUSIC=audio/raw/music_long1.mp3; SFX=audio/sfx.wav; OUT=${1:-audio/mix.wav}
GRAPH="
[0:a]highpass=f=90,equalizer=f=220:t=q:w=1.2:g=-1.5,equalizer=f=3800:t=q:w=1.0:g=2.5,acompressor=threshold=-24dB:ratio=3:attack=4:release=90:makeup=3,volume=5.5dB,aformat=channel_layouts=stereo,apad=whole_dur=88,asplit=2[vo][key];
[1:a]apad=whole_dur=88,volume=-5dB,volume=enable='between(t,70.3,75.3)':volume=-3.5dB[mus];
[mus][key]sidechaincompress=threshold=0.06:ratio=2.5:attack=25:release=400:makeup=1[duck];
[2:a]volume=-1dB,apad=whole_dur=88[fx];
[vo][duck][fx]amix=inputs=3:normalize=0:duration=longest,atrim=0:88"
ffmpeg -v error -y -i "$VO" -i "$MUSIC" -i "$SFX" -filter_complex "$GRAPH" -ar 48000 -c:a pcm_f32le audio/premix.wav
STATS=$(ffmpeg -hide_banner -nostats -i audio/premix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$STATS" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i audio/premix.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,afade=t=out:st=87.4:d=0.6" -ar 48000 -c:a pcm_s24le "$OUT"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true:framelog=quiet -f null - 2>&1 | grep -E "^\s+(I|Peak|LRA):"
