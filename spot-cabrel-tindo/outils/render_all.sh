#!/bin/bash
# v2: 1:29 at 60 fps -> 5340 frames per format, 4 Chromium workers
S=/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad
cd $S/tools
export FPS=60
for fmt in ${FMTS:-landscape portrait}; do
  out=$S/out/frames60_$fmt; mkdir -p $out
  N=5340; K=4; per=$((N/K))
  for i in $(seq 0 $((K-1))); do
    a=$((i*per)); b=$(( i==K-1 ? N : (i+1)*per ))
    node render.js $fmt $out $a $b 1 93 > $S/out/log60_${fmt}_$i.txt 2>&1 &
  done
  wait
  echo "$fmt frames: $(ls $out | wc -l)"
done
echo ALLDONE
