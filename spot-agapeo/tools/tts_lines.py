import sys, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
models, lines_path, out, speed = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
k = Kokoro(models + "/kokoro-v1.0.onnx", models + "/voices-v1.0.bin")
res = {}
for lid, text, _gap in json.load(open(lines_path)):
    s, sr = k.create(text, voice="ff_siwis", speed=speed, lang="fr-fr")
    s = np.asarray(s, dtype=np.float32)
    # trim leading/trailing silence
    a = np.abs(s); thr = 0.01 * a.max()
    idx = np.where(a > thr)[0]
    s = s[max(0, idx[0] - int(0.03*sr)): min(len(s), idx[-1] + int(0.12*sr))]
    sf.write(f"{out}/{lid}.wav", s, sr)
    res[lid] = round(len(s)/sr, 3)
    print(lid, res[lid])
json.dump(res, open(out + "/durations.json", "w"), indent=1)
print("total", round(sum(res.values()), 2))
