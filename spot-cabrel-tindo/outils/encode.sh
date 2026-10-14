#!/bin/bash
# encode.sh <fmt landscape|portrait> <name>
S=/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad
fmt=$1; name=$2; F=$S/out/frames_$fmt; A=$S/out/master_main.wav; O=$S/deliver; mkdir -p $O
if [ $fmt = landscape ]; then SC=1920:1080; else SC=1080:1920; fi
# 1) 4K master (high quality)
ffmpeg -y -v error -stats -framerate 30 -i $F/f%05d.jpg -i $A -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 5.2 -tune film \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest $O/${name}_4K_MASTER.mp4
# 2) 4K light (< 95 MB, for GitHub / quick sharing)
ffmpeg -y -v error -framerate 30 -i $F/f%05d.jpg -i $A -map 0:v -map 1:a \
  -c:v libx264 -preset slow -b:v 7600k -maxrate 11000k -bufsize 16000k -pix_fmt yuv420p -profile:v high -level 5.2 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 192k -movflags +faststart -shortest $O/${name}_4K.mp4
# 3) 1080p (WhatsApp / Facebook / Instagram)
ffmpeg -y -v error -framerate 30 -i $F/f%05d.jpg -i $A -map 0:v -map 1:a \
  -vf scale=$SC:flags=lanczos -c:v libx264 -preset slow -crf 20 -maxrate 9000k -bufsize 14000k -pix_fmt yuv420p -profile:v high \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 192k -movflags +faststart -shortest $O/${name}_1080p.mp4
ls -la $O
