"""Builds vo/<id>.wav clips + timeline.json.
mode 'piper': guide voice synthesized locally (timing only).
mode 'clips': use existing vo/<id>.wav files (e.g. cut from the IziVoice MP3)."""
import json, subprocess, os, sys
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mode=sys.argv[1]; voice_dir=sys.argv[2] if len(sys.argv)>2 else None
lines=json.load(open(f"{D}/tools/lines.json")); O=f"{D}/vo"; os.makedirs(O,exist_ok=True)
TAIL=2.0; t=0; out={"clips":{},"scenes":[]}; last=None
for cid,text,gap,scene,mind in lines:
    w=f"{O}/{cid}.wav"
    if mode=="piper":
        V=voice_dir
        subprocess.run(["python3","-m","piper","-m",f"{V}/fr_FR-tom-medium.onnx","-c",f"{V}/fr_FR-tom-medium.onnx.json","--length-scale","0.88","--sentence-silence","0.12","-f",w+".raw.wav"],input=text.encode(),capture_output=True,check=True)
        subprocess.run(["ffmpeg","-v","error","-y","-i",w+".raw.wav","-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse","-ar","44100",w],check=True)
        os.remove(w+".raw.wav")
    d=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",w]))
    s=t+gap
    if scene:
        if last and last["min"]: s=max(s,last["start"]+last["min"]+0.2)
        st=0 if not out["scenes"] else round(s-0.2,3)
        last={"id":scene,"start":st,"min":mind}; out["scenes"].append(last)
    out["clips"][cid]={"s":round(s,3),"e":round(s+d,3),"text":text}
    t=s+d
out["duration"]=round(t+TAIL,3)
for i,sc in enumerate(out["scenes"]):
    sc["end"]=out["scenes"][i+1]["start"] if i+1<len(out["scenes"]) else out["duration"]
json.dump(out,open(f"{D}/timeline.json","w"),indent=1,ensure_ascii=False)
open(f"{D}/timeline.js","w").write("window.TL="+json.dumps(out,ensure_ascii=False)+";")
for sc in out["scenes"]: print(f'{sc["id"]:12s} {sc["start"]:6.2f} {sc["end"]:6.2f}')
print("DURATION",out["duration"])
