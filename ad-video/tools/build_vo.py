import json, subprocess, os, sys
S=sys.argv[1]; V=f"{S}/voices/vits-piper-fr_FR-tom-medium"; O=f"{S}/vo2"; os.makedirs(O,exist_ok=True)
# id, text, gap_before, scene, min_scene_dur
clips=[
("c01","Une simple capture d'écran.",0.45,"capture",0),
("c02","Une affiche.",0.22,"affiche",0),
("c03","Ou juste le lien d'un site.",0.18,"lien",0),
("c04","Quelques instructions à l'intelligence artificielle...",0.25,"prompt",0),
("c05","Et ça devient une publicité animée.",0.3,"pub",0),
("c05b","Professionnelle.",0.12,None,0),
("c06","Un spot pour un restaurant.",0.35,"resto",3.2),
("c07","Pour une agence de location de voitures.",0.2,"loc",3.4),
("c08","Pour l'immobilier.",0.2,"immo",3.1),
("c09a","Une salle de sport,",0.2,"grid",0),
("c09b","une boutique,",0.05,None,0),
("c09c","une application...",0.05,None,0),
("c09d","N'importe quel service.",0.15,None,0),
("c10a","Tout ça, je l'ai créé moi-même.",0.4,"wall",0),
("c10b","Sans caméra.",0.18,"sans",0),
("c10c","Sans tournage.",0.08,None,0),
("c10d","Sans équipe.",0.08,None,0),
("c11","Et toi aussi, tu peux le faire.",0.4,"toi",0),
("c12","J'ai préparé une formation complète, pas à pas, dans les moindres détails.",0.3,"formation",0),
("c13a","Pour te montrer comment transformer une capture, une affiche, ou un simple lien,",0.25,"modules",0),
("c13b","en spot publicitaire et en motion design. De A à Z.",0.05,None,0),
("c14","Clique sur le lien, et profite de la promotion maintenant.",0.35,"cta",0),
]
TAIL=1.9; LS=float(os.environ.get("LS","0.88"))
t=0; out={"clips":{},"scenes":[]}; last_scene=None
for cid,text,gap,scene,mind in clips:
    w=f"{O}/{cid}.wav"
    subprocess.run(["python3","-m","piper","-m",f"{V}/fr_FR-tom-medium.onnx","-c",f"{V}/fr_FR-tom-medium.onnx.json","--length-scale",str(LS),"--sentence-silence","0.12","-f",w+".raw.wav"],input=text.encode(),capture_output=True,check=True)
    # trim silence edges, deepen: pitch down, formant shifted
    subprocess.run(["ffmpeg","-v","error","-y","-i",w+".raw.wav","-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,rubberband=pitch=0.9:formant=preserved:pitchq=quality","-ar","44100",w],check=True)
    d=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",w]))
    s=t+gap
    if scene:
        if last_scene and last_scene["min"]:
            s=max(s,last_scene["start"]+last_scene["min"]+0.2)
        st=0 if not out["scenes"] else round(s-0.2,3)
        last_scene={"id":scene,"start":st,"min":mind}; out["scenes"].append(last_scene)
    out["clips"][cid]={"s":round(s,3),"e":round(s+d,3),"text":text}
    t=s+d
out["duration"]=round(t+TAIL,3)
for i,sc in enumerate(out["scenes"]):
    sc["end"]=out["scenes"][i+1]["start"] if i+1<len(out["scenes"]) else out["duration"]
json.dump(out,open(f"{S}/timeline.json","w"),indent=1,ensure_ascii=False)
for sc in out["scenes"]: print(f'{sc["id"]:10s} {sc["start"]:6.2f} {sc["end"]:6.2f}')
print("DURATION",out["duration"])
