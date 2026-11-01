"""Cut one voice-over recording (e.g. the IziVoice MP3) into vo/<id>.wav, one file per line of lines.json.

Cuts are placed in the silences of the recording. Among all silences, it picks the
N-1 that best match where each line should end, estimated from the text length.
usage: python3 split_voice.py voice.mp3
then:  python3 build_timeline.py clips
"""
import json, os, re, subprocess, sys

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
lines = json.load(open(f"{D}/tools/lines.json"))
os.makedirs(f"{D}/vo", exist_ok=True)

dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]))
log = subprocess.run(["ffmpeg", "-i", src, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
sil = [(s, e) for s, e in zip(starts, ends) if e > 0.3 and s < dur - 0.3]
# keep the longest pauses first: sentence breaks are longer than commas
need = len(lines) - 1
for gate in (0.3, 0.25, 0.2, 0.15, 0.0):
    long_sil = [x for x in sil if x[1] - x[0] >= gate]
    if len(long_sil) >= need: break
sil = long_sil
speech_start = ends[0] if starts and starts[0] < 0.05 else 0.0
speech_end = starts[-1] if starts and len(starts) > len(ends) else dur

# expected end of each line, proportional to text length
w = [len(l[1]) for l in lines]
tot = sum(w); acc = 0; expect = []
for x in w[:-1]:
    acc += x; expect.append(speech_start + (speech_end - speech_start) * acc / tot)

n, m = len(expect), len(sil)
if m < n:
    sys.exit(f"Only {m} pauses found for {n + 1} lines: add short pauses between sentences in the recording.")
mid = [(s + e) / 2 for s, e in sil]
# DP: choose an increasing subset of silences to match the expected cut points
INF = 1e18; ALPHA = 2.0
cost = [[INF] * m for _ in range(n)]; back = [[-1] * m for _ in range(n)]
for j in range(m):
    cost[0][j] = (mid[j] - expect[0]) ** 2 - ALPHA * (sil[j][1] - sil[j][0])
for i in range(1, n):
    best, bj = INF, -1
    for j in range(m):
        if j > 0 and cost[i - 1][j - 1] < best:
            best, bj = cost[i - 1][j - 1], j - 1
        if bj >= 0:
            cost[i][j] = best + (mid[j] - expect[i]) ** 2 - ALPHA * (sil[j][1] - sil[j][0])
            back[i][j] = bj
j = min(range(m), key=lambda j: cost[n - 1][j]); picks = []
for i in range(n - 1, -1, -1):
    picks.append(j); j = back[i][j]
picks.reverse()

bounds = [speech_start] + [x for p in picks for x in (sil[p][0], sil[p][1])] + [speech_end]
for i, l in enumerate(lines):
    a, b = bounds[2 * i], bounds[2 * i + 1]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, a - 0.03):.3f}", "-to", f"{b + 0.06:.3f}", "-i", src,
                    "-af", "afade=t=in:d=0.02", "-ar", "44100", "-ac", "1", f"{D}/vo/{l[0]}.wav"], check=True)
    print(f"{l[0]:5s} {a:6.2f}-{b:6.2f}  {l[1]}")
