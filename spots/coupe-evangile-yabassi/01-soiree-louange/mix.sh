#!/usr/bin/env bash
# Mixage voix off + musique de fond.
# Usage : ./mix.sh voix.mp3 musique.mp3 sortie.wav [durée_en_s]
# - voix normalisée à -16 LUFS (standard réseaux sociaux)
# - musique très en retrait (-30 LUFS) et baissée encore quand la voix parle (sidechain)
# - fondu d'entrée 0,5 s et de sortie 3 s sur la musique
set -euo pipefail
VOICE="$1"; MUSIC="$2"; OUT="$3"; DUR="${4:-80}"
FADE_START=$(python3 -c "print(max(0, $DUR - 3))")
if [ "$VOICE" = "-" ]; then
  ffmpeg -v error -y -i "$MUSIC" -filter_complex \
    "[0:a]atrim=0:$DUR,asetpts=N/SR/TB,loudnorm=I=-30:TP=-2,afade=t=in:d=0.5,afade=t=out:st=$FADE_START:d=3[m]" \
    -map "[m]" -ar 48000 -ac 2 "$OUT"
  exit 0
fi
ffmpeg -v error -y -i "$VOICE" -i "$MUSIC" -filter_complex \
  "[0:a]adelay=300|300,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=$DUR,atrim=0:$DUR,asplit=2[v][sc]; \
   [1:a]atrim=0:$DUR,asetpts=N/SR/TB,loudnorm=I=-30:TP=-2,aresample=48000,afade=t=in:d=0.5,afade=t=out:st=$FADE_START:d=3[m]; \
   [m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=400[md]; \
   [md][v]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.89[out]" \
  -map "[out]" -ar 48000 -ac 2 "$OUT"
