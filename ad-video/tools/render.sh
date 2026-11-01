#!/bin/bash
# usage: render.sh <v:0|1> <outfile>
S=${WORK:?set WORK to a work dir}; D=$(cd "$(dirname "$0")/.." && pwd)
v=$1; out=$2; FPS=30; N=$(python3 -c "import json,math;print(math.ceil(json.load(open('$D/timeline.json'))['duration']*$FPS))"); J=4
mkdir -p $S/seg$v; rm -f $S/seg$v/*; step=$(( (N+J-1)/J ))
for ((i=0;i<J;i++)); do a=$((i*step)); b=$(( a+step<N ? a+step : N )); (node $D/tools/render.js $D $v $a $b $S/seg$v/p$i.mp4 $FPS) & done; wait
for ((i=0;i<J;i++)); do echo "file '$S/seg$v/p$i.mp4'"; done > $S/seg$v/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $S/seg$v/list.txt -i $S/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart $out
