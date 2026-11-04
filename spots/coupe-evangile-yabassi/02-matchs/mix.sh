#!/usr/bin/env bash
# Mixage voix off + musique de fond.
# Usage : ./mix.sh voix.mp3 musique.mp3 sortie.wav [durée_en_s] [effets.wav]
# - voix compressée, éclaircie et forte (-10 LUFS)
# - musique en retrait (-27 LUFS) et baissée encore quand la voix parle (sidechain)
# - fondu d'entrée 0,5 s et de sortie 3 s sur la musique
set -euo pipefail
VOICE="$1"; MUSIC="$2"; OUT="$3"; DUR="${4:-80}"; SFX="${5:-}"
# STYLE=doux : voix douce (compression légère, pas de renfort d'aigus, niveau plus modéré)
if [ "${STYLE:-fort}" = "doux" ]; then
  VCHAIN="highpass=f=70,acompressor=threshold=-24dB:ratio=2:attack=15:release=250:makeup=2,equalizer=f=200:t=q:w=1:g=1.5,equalizer=f=6000:t=q:w=1:g=-1.5,loudnorm=I=-13:TP=-1.5:LRA=7"
  MUSIC_I=-27; GAIN=2dB; FXVOL=-5dB
else
  VCHAIN="highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=4,equalizer=f=3000:t=q:w=1.2:g=3,equalizer=f=150:t=q:w=1:g=2,loudnorm=I=-10:TP=-1:LRA=5"
  MUSIC_I=-27; GAIN=3.5dB; FXVOL=-3dB
fi
FADE_START=$(python3 -c "print(max(0, $DUR - 3))")
if [ "$VOICE" = "-" ]; then
  ffmpeg -v error -y -i "$MUSIC" -filter_complex \
    "[0:a]atrim=0:$DUR,asetpts=N/SR/TB,loudnorm=I=-30:TP=-2,afade=t=in:d=0.5,afade=t=out:st=$FADE_START:d=3[m]" \
    -map "[m]" -ar 48000 -ac 2 "$OUT"
  exit 0
fi
if [ -n "$SFX" ]; then
  SFX_IN=(-i "$SFX")
  SFX_CHAIN="[2:a]aresample=48000,volume=$FXVOL[fx]; [md][fx]amix=inputs=2:duration=first:normalize=0[bed];"
  BED="[bed]"
else
  SFX_IN=()
  SFX_CHAIN=""
  BED="[md]"
fi
ffmpeg -v error -y -i "$VOICE" -i "$MUSIC" "${SFX_IN[@]}" -filter_complex \
  "[0:a]adelay=300|300,$VCHAIN,aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=$DUR,atrim=0:$DUR,asplit=2[v][sc]; \
   [1:a]atrim=0:$DUR,asetpts=N/SR/TB,loudnorm=I=$MUSIC_I:TP=-2,aresample=48000,afade=t=in:d=0.5,afade=t=out:st=$FADE_START:d=3[m]; \
   [m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=400[md]; $SFX_CHAIN \
   $BED[v]amix=inputs=2:duration=longest:normalize=0,volume=$GAIN,alimiter=limit=0.89:attack=3:release=60:level=disabled[out]" \
  -map "[out]" -ar 48000 -ac 2 "$OUT"
