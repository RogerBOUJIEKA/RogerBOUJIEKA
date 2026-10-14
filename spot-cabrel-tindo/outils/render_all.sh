#!/bin/bash
S=/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad
cd $S/tools
for fmt in landscape portrait; do
  out=$S/out/frames_$fmt; mkdir -p $out
  N=2820; K=4; per=$((N/K))
  for i in $(seq 0 $((K-1))); do
    a=$((i*per)); b=$(( i==K-1 ? N : (i+1)*per ))
    node render.js $fmt $out $a $b 1 93 > $S/out/log_${fmt}_$i.txt 2>&1 &
  done
  wait
  echo "$fmt frames: $(ls $out | wc -l)"
done
echo ALLDONE
