import json, numpy as np, soundfile as sf, sys
from scipy import signal
S=sys.argv[1]; T=json.load(open(f"{S}/timeline.json")); SR=44100
D=T["duration"]; N=int((D+0.5)*SR)
rng=np.random.default_rng(7)
sc={s["id"]:s for s in T["scenes"]}; C=T["clips"]
def sos(kind,f,order=2): return signal.butter(order,f,kind,fs=SR,output='sos')
def filt(x,kind,f,order=2): return signal.sosfilt(sos(kind,f,order),x)
def add(buf,x,t,g=1.0):
    i=int(t*SR); 
    if i>=len(buf): return
    x=x[:len(buf)-i]; buf[i:i+len(x)]+=x*g
def env(n,a,d): 
    t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/d)
# ---------- instruments
def kick():
    n=int(.45*SR); t=np.arange(n)/SR
    f=45+110*np.exp(-t/0.035); ph=2*np.pi*np.cumsum(f)/SR
    k=np.sin(ph)*np.exp(-t/0.16); k+=0.25*filt(rng.standard_normal(n),'highpass',2000)*np.exp(-t/0.004)
    return np.tanh(1.6*k)
def clap():
    n=int(.3*SR); x=filt(rng.standard_normal(n),'bandpass',[900,2600]); t=np.arange(n)/SR
    e=np.exp(-t/0.06); 
    for o in (0,.011,.022): e+=np.where(t>=o,np.exp(-(t-o)/0.008),0)*0.6
    return x*e*0.5
def hat(open_=False):
    n=int((.25 if open_ else .06)*SR); t=np.arange(n)/SR
    return filt(rng.standard_normal(n),'highpass',7500)*np.exp(-t/(0.07 if open_ else 0.015))*0.35
def mtof(m): return 440*2**((m-69)/12)
def saw(f,n,det=0):
    t=np.arange(n)/SR; ph=(f*t+rng.random())%1; return 2*ph-1
def supersaw(f,n,v=5,spread=0.012):
    return sum(saw(f*(1+spread*(i-(v-1)/2)/((v-1)/2)),n) for i in range(v))/v
# chords: Am F C G (A minor), MIDI
prog=[[57,60,64],[53,57,60],[48,52,55,60],[55,59,62]]; roots=[45,41,48,43]
BEAT=0.5; BAR=2.0
L=np.zeros(N); R=np.zeros(N)
drums=np.zeros(N); bass=np.zeros(N); pads=np.zeros(N); arp=np.zeros(N); fx=np.zeros(N)
drop1=sc["pub"]["start"]; brk=sc["wall"]["start"]; drop2=sc["formation"]["start"]; end=sc["cta"]["start"]+3.2
K=kick(); CL=clap()
def grid(a,b,anchor):
    k=np.ceil((a-anchor)/BEAT-1e-6); t=anchor+k*BEAT
    while t<b-1e-6: yield t, int(round((t-anchor)/BEAT)); t+=BEAT
# intro pulse (soft kick on 1 & filtered hats)
for t,i in grid(0.0,drop1,drop1):
    if i%2==0: add(drums,filt(K,'lowpass',300),t,0.45)
    add(drums,hat(),t+BEAT/2,0.5)
# full sections
for a,b in ((drop1,brk),(drop2,end)):
    for t,i in grid(a,b,a):
        add(drums,K,t,0.9)
        if i%2==1: add(drums,CL,t,0.7)
        add(drums,hat(),t+BEAT/2,0.8); add(drums,hat(),t+BEAT/4,0.35); add(drums,hat(),t+3*BEAT/4,0.35)
        if i%8==7: add(drums,hat(True),t+BEAT/2,0.6)
# breakdown: claps only light, toi -> snare roll riser
roll_a=sc["toi"]["start"]; 
for k in range(64):
    tt=roll_a+(drop2-roll_a)*(1-(1-k/64)**1.6)
    if tt<drop2-0.05: add(drums,CL,tt,0.15+0.45*k/64)
# bass + pads + arp over whole song (chord grid anchored at drop1)
def chord_at(t): return int(np.floor((t-drop1)/BAR))%4
t0=drop1-np.ceil(drop1/BAR)*BAR
t=t0
while t<end+BAR:
    c=chord_at(t+1e-3); n=int(BAR*SR)
    p=sum(supersaw(mtof(m),n) for m in prog[c])/len(prog[c])
    a=max(t,0); seg=p[int((a-t)*SR):]
    add(pads,seg,a,0.5)
    # bass: offbeat 8ths in full sections
    for j in range(4):
        bt=t+j*BEAT+BEAT/2
        full=(drop1<=bt<brk) or (drop2<=bt<end)
        nb=int(0.22*SR); tb=np.arange(nb)/SR
        f=mtof(roots[c]); b=np.sin(2*np.pi*f*tb)+0.35*np.sin(4*np.pi*f*tb)
        b*=np.minimum(1,tb/0.005)*np.exp(-tb/0.18)
        if full and bt>=0: add(bass,np.tanh(1.5*b),bt,0.55)
        if (brk<=bt<drop2) and j==0 and bt>=0:
            nl=int(1.9*SR); tl=np.arange(nl)/SR
            add(bass,np.sin(2*np.pi*f*tl)*np.exp(-tl/1.2)*np.minimum(1,tl/.05),t,0.5)
    # arp 16ths
    tones=prog[c]+[prog[c][0]+12,prog[c][1]+12]
    for j in range(16):
        at=t+j*BEAT/2/2*1
        if at<0: continue
        m=tones[[0,2,4,1,3,2,4,0][j%8]%len(tones)]+12
        na=int(0.18*SR); ta=np.arange(na)/SR
        x=saw(mtof(m),na)*np.exp(-ta/0.07)
        add(arp,x,at,0.18)
    t+=BAR
pads=filt(pads,'lowpass',2200,4)
# filter intro pads / arp darker: crossfade with lowpassed versions
def sweep_mix(x,cut_lo,a,b):
    lo=filt(x,'lowpass',cut_lo,4); w=np.zeros(N)
    tt=np.arange(N)/SR; w=np.clip((tt-a)/(b-a),0,1); return lo*(1-w)+x*w
arp=filt(arp,'lowpass',5000,2)
arp=sweep_mix(arp,700,drop1-1.5,drop1)
pads=sweep_mix(pads,600,drop1-2,drop1)
tt=np.arange(N)/SR
# kill arp in breakdown partially, keep pads; master fade-out
arp*=np.where((tt>brk)&(tt<drop2-1.0),0.35,1.0)
# sidechain pump on pads/bass from kicks in full sections
pump=np.ones(N)
for a,b in ((drop1,brk),(drop2,end)):
    for t,i in grid(a,b,a):
        i0=int(t*SR); n=int(0.3*SR); e=1-0.55*np.exp(-np.arange(n)/SR/0.09)
        pump[i0:i0+n]=np.minimum(pump[i0:i0+n],e[:max(0,min(n,N-i0))])
pads*=pump; arp*=pump
# ---------- FX: risers, impacts, whooshes, clicks
def riser(dur):
    n=int(dur*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); out=np.zeros(n)
    hop=1024
    for k in range(0,n,hop):
        f=400+7000*(k/n)**2; seg=x[k:k+hop]
        out[k:k+hop]=filt(np.concatenate([np.zeros(256),seg]),'bandpass',[f*0.7,min(f*1.4,20000)])[256:]
    tone=np.sin(2*np.pi*np.cumsum(200+600*(t/dur)**2)/SR)*0.25
    return (out+tone)*(t/dur)**2*0.7
def impact():
    n=int(2.5*SR); t=np.arange(n)/SR
    boom=np.sin(2*np.pi*np.cumsum(30+70*np.exp(-t/0.08))/SR)*np.exp(-t/0.7)
    crash=filt(rng.standard_normal(n),'highpass',3000)*np.exp(-t/0.5)*0.25
    return np.tanh(1.5*boom)*0.9+crash
def whoosh(dur=0.45):
    n=int(dur*SR); t=np.arange(n)/SR; x=rng.standard_normal(n); out=np.zeros(n); hop=512
    for k in range(0,n,hop):
        p=k/n; f=300+3500*np.sin(np.pi*p)
        seg=x[k:k+hop]; out[k:k+hop]=filt(np.concatenate([np.zeros(128),seg]),'bandpass',[f*0.6,f*1.6])[128:]
    return out*np.sin(np.pi*t/dur)**2*0.5
def click():
    n=int(0.03*SR); t=np.arange(n)/SR
    return filt(rng.standard_normal(n),'bandpass',[2000,6000])*np.exp(-t/0.004)*0.5
def pop():
    n=int(0.12*SR); t=np.arange(n)/SR
    return np.sin(2*np.pi*np.cumsum(900-500*t/0.12)/SR)*np.exp(-t/0.03)*0.4
add(fx,riser(2.0),drop1-2.0,0.8); add(fx,impact(),drop1,1.0)
add(fx,riser(drop2-roll_a),roll_a,0.8); add(fx,impact(),drop2,1.0)
add(fx,impact(),0.0,0.6); add(fx,impact(),sc["cta"]["start"],0.7)
for s in T["scenes"][1:]:
    if s["id"] not in ("pub","formation","cta"): add(fx,whoosh(),s["start"]-0.22,0.9)
# typing during prompt scene
p0=sc["prompt"]["start"]+0.5
for k in range(26): add(fx,click(),p0+k*0.075+rng.random()*0.02,0.6)
for cid in ("c09a","c09b","c09c","c09d","c10b","c10c","c10d","c13a","c13b"): add(fx,pop(),C[cid]["s"],0.6)
# ---------- mix music bus
music=drums*0.8+bass*0.75+pads*0.33+arp*0.45
fade=np.clip((end+1.5-tt)/1.5,0,1)
music*=fade; 
# stereo: pads/arp widened with small delay
d=int(0.012*SR)
mL=music+np.roll(arp,d)*0.1; mR=music+np.roll(pads,d)*0.08
fx=fx*0.8
sf.write(f"{S}/music.wav",np.stack([mL,mR],1)*0.6,SR)
sf.write(f"{S}/sfx.wav",np.stack([fx,fx],1)*0.6,SR)
# voice track
vo=np.zeros(N)
for cid,c in C.items():
    x,sr=sf.read(f"{S}/vo2/{cid}.wav"); 
    if x.ndim>1: x=x.mean(1)
    add(vo,x,c["s"])
sf.write(f"{S}/vo_raw.wav",vo,SR)
print("ok",D)
