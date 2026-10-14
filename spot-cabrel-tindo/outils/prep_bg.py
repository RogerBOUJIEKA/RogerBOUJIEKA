from PIL import Image, ImageFilter, ImageEnhance
import numpy as np, os
S='/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad'
G=S+'/gen/'; A=S+'/spot/assets/'
def grade(im, contrast=1.08, sat=1.08, bright=1.0):
    im=ImageEnhance.Contrast(im).enhance(contrast)
    im=ImageEnhance.Color(im).enhance(sat)
    if bright!=1: im=ImageEnhance.Brightness(im).enhance(bright)
    return im
def cover(im, W, H, cx=0.5, cy=0.5):
    w,h=im.size; s=max(W/w,H/h); nw,nh=int(w*s+0.5),int(h*s+0.5)
    im=im.resize((nw,nh),Image.LANCZOS)
    x=int((nw-W)*cx); y=int((nh-H)*cy)
    return im.crop((x,y,x+W,y+H))
jobs={
 'city':('OEpEy68nya0r1byQ157Q.png',0.42),
 'slum':('BUTxslhHbGEB4FxEdxYz.png',0.5),
 'stage':('dmCgKUvphbpbJn9JaqpQ.png',0.5),
}
LW,LH=4224,2376   # landscape 1.1x of 3840x2160
PW,PH=2376,4224
for k,(f,cx) in jobs.items():
    src=Image.open(G+f).convert('RGB')
    L=grade(cover(src,LW,LH,0.5,0.5)); L.save(A+f'{k}_L.jpg',quality=90)
    L.filter(ImageFilter.GaussianBlur(18)).save(A+f'{k}_L_blur.jpg',quality=88)
    if k=='stage':
        srcp=Image.open(G+'cbuF7Ir0QoqiAizdNB3E.png').convert('RGB'); P=grade(cover(srcp,PW,PH))
    else:
        P=grade(cover(src,PW,PH,cx,0.5))
    P.save(A+f'{k}_P.jpg',quality=90)
    P.filter(ImageFilter.GaussianBlur(18)).save(A+f'{k}_P_blur.jpg',quality=88)
    print(k,'ok')
