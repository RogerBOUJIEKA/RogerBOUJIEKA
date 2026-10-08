import subprocess, sys, numpy as np
SR = 22050
raw = subprocess.run(["ffmpeg","-v","error","-i",sys.argv[1],"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True,check=True).stdout
x = np.frombuffer(raw, np.float32)
hop, win = 256, 1024
frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop] * np.hanning(win)
S = np.abs(np.fft.rfft(frames, axis=1))
logS = np.log1p(10*S)
flux = np.maximum(0, np.diff(logS, axis=0)).sum(1)
flux = (flux - flux.mean())/flux.std()
fps = SR/hop
# tempo via autocorrelation
ac = np.correlate(flux, flux, 'full')[len(flux)-1:]
lags = np.arange(len(ac))/fps
mask = (lags > 60/180) & (lags < 60/70)
best = lags[mask][np.argmax(ac[mask])]
print("tempo ~ %.1f BPM (period %.3f s)" % (60/best, best))
# beat phase: maximise sum of flux on grid
period = best*fps
phases = np.linspace(0, period, 64, endpoint=False)
scores = [flux[np.round(np.arange(p, len(flux)-1, period)).astype(int)].sum() for p in phases]
ph = phases[int(np.argmax(scores))]/fps
print("beat phase %.3f s" % ph)
print("beats:", " ".join("%.2f" % b for b in np.arange(ph, 15, best)))
# strongest onsets
idx = np.argsort(flux)[::-1]
picked=[]
for i in idx:
    if all(abs(i-j) > fps*0.25 for j in picked): picked.append(i)
    if len(picked) >= 18: break
print("strong onsets:", " ".join("%.2f(%.1f)" % (i/fps, flux[i]) for i in sorted(picked)))
# RMS envelope per 0.5s
rms = [np.sqrt(np.mean(x[int(t*SR):int((t+0.5)*SR)]**2)) for t in np.arange(0, 15, 0.5)]
print("rms dB per 0.5s:", " ".join("%.0f" % (20*np.log10(r+1e-9)) for r in rms))
