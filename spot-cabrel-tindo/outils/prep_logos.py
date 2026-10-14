from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad'
A=S+'/spot/assets/'
sheet=Image.open(S+'/gen/YZ1uT6SL9mqz2i5H7Lqk.png').convert('RGB')
arr=np.array(sheet).astype(int)
nonwhite=(arr.min(axis=2)<215)
def segs(mask_cols, mingap=40, minlen=30):
    out=[];start=None;gap=0
    for i,v in enumerate(mask_cols):
        if v:
            if start is None: start=i
            gap=0; end=i
        elif start is not None:
            gap+=1
            if gap>mingap: 
                if end-start>minlen: out.append((start,end))
                start=None
    if start is not None and end-start>minlen: out.append((start,end))
    return out
# strip area (orig y 0..230 => 0..920), skip top teal line (first ~40px)
strip=nonwhite[60:900]
cols=strip.sum(axis=0)>3
cs=segs(cols)
print('strip segments',cs)
names=['ambassade','institut','dschang','univ']
for n,(x0,x1) in zip(names,cs):
    sub=strip[:,x0:x1+1]; rows=np.where(sub.sum(axis=1)>2)[0]
    y0,y1=rows[0]+60,rows[-1]+60
    pad=24
    im=sheet.crop((max(0,x0-pad),max(0,y0-pad),x1+pad,y1+pad)); im.save(A+f'logo_{n}.png'); print(n,im.size)
# AFC: area y 960..1600
afc=nonwhite[960:1600]
ys,xs=np.where(afc)
# keep reddish only
reg=arr[960:1600]
red=(reg[...,0]>150)&(reg[...,1]<120)&(reg[...,2]<120)
ys,xs=np.where(red)
x0,x1,y0,y1=xs.min(),xs.max(),ys.min()+960,ys.max()+960
pad=30
afcim=sheet.crop((x0-pad,y0-pad,x1+pad,y1+pad)); afcim.save(A+'logo_afc.png'); print('afc',afcim.size)
# AFC transparent (red on alpha) for use on any bg
a=np.array(afcim).astype(float)
alpha=np.clip((255-a[...,1])/ (255-60),0,1)  # green channel low where red
rgba=np.zeros(a.shape[:2]+(4,),np.uint8); rgba[...,0]=226; rgba[...,1]=20; rgba[...,2]=30; rgba[...,3]=(alpha*255).astype(np.uint8)
Image.fromarray(rgba).save(A+'logo_afc_red.png')
rgba[...,0:3]=255; Image.fromarray(rgba).save(A+'logo_afc_white.png')
# Boujieka
for v in ['white','dark']:
    im=Image.open(S+f'/src/logo_boujieka_{v}.png').convert('RGBA')
    im=im.crop(im.getbbox()); im.save(A+f'boujieka_{v}.png'); 
    al=np.array(im)[...,3]
    cols=al.sum(axis=0)>0
    sg=segs(cols,mingap=8,minlen=10)
    print(v,im.size,'segs',sg[:3])
