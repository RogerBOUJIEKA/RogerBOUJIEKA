#!/bin/bash
# encode.sh <landscape|portrait> <name> : v2 deliverables (1:29, 60 fps) from the 4K frames + master audio
S=/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad
fmt=$1; name=$2; F=$S/out/frames60_$fmt; A=$S/out/master_main.wav; O=$S/deliver; mkdir -p $O $S/send
if [ $fmt = landscape ]; then SC=1920:1080; else SC=1080:1920; fi
IN="-framerate 60 -i $F/f%05d.jpg -i $A -map 0:v -map 1:a"
COL="-pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -g 120"
# 1) 4K 60 fps (< 100 MB) for YouTube / TikTok / big screens
ffmpeg -y -v error $IN -c:v libx264 -preset slow -b:v 7800k -maxrate 11000k -bufsize 16000k -profile:v high -level 5.2 $COL \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest $O/${name}_4K.mp4
# 2) 1080p 60 fps for Facebook / WhatsApp / Instagram
ffmpeg -y -v error $IN -vf scale=$SC:flags=lanczos -c:v libx264 -preset slow -crf 20 -maxrate 9000k -bufsize 14000k -profile:v high -level 4.2 $COL \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest $O/${name}_1080p.mp4
# 3) 1080p 60 fps copy under the 30 MB chat limit (2-pass)
P=$S/send/pass_$name
ffmpeg -y -v error $IN -vf scale=$SC:flags=lanczos -c:v libx264 -preset slow -b:v 2450k -pass 1 -passlogfile $P $COL -an -f mp4 /dev/null
ffmpeg -y -v error $IN -vf scale=$SC:flags=lanczos -c:v libx264 -preset slow -b:v 2450k -maxrate 5000k -bufsize 7000k -pass 2 -passlogfile $P \
  -profile:v high -level 4.2 $COL -c:a aac -b:a 128k -ar 48000 -movflags +faststart -shortest $S/send/${name}_1080p_envoi.mp4
rm -f ${P}*
ls -la $O/${name}_* $S/send/${name}_*
