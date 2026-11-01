#!/bin/bash
# Final audio mix: deep voice-over chain + ducked music + SFX, normalized to -14 LUFS.
# usage: mix.sh <workdir containing vo_raw.wav music.wav sfx.wav>
cd "$1"
VCH="highpass=f=75,equalizer=f=140:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=7000:t=q:w=2:g=-2,acompressor=threshold=-24dB:ratio=4:attack=5:release=80:makeup=6,aecho=0.8:0.5:35|60:0.1|0.06,aformat=channel_layouts=stereo"
ffmpeg -v error -y -i vo_raw.wav -i music.wav -i sfx.wav -filter_complex "[0]$VCH,asplit=2[v][vsc];[1][vsc]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[m];[v][m][2]amix=inputs=3:weights=1 0.3 0.45:normalize=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1:LRA=9" -ar 48000 mix.wav
