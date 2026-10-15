import json, importlib
import timeline; importlib.reload(timeline)
from timeline import *
S='/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad'
W=json.load(open(S+'/spot/words.json'))
# end tag c19 reuses the c14 recording: copy its words onto the final poster
c14=[v for v in VO if v[0]=='c14'][0]; c19=[v for v in VO if v[0]=='c19'][0]
off=c19[3]-c14[3]
W=sorted(W+[[round(a+off,3),round(b+off,3),x] for a,b,x in W if c14[3]<=a<c14[3]+(c14[2]-c14[1])], key=lambda w:w[0])
beats=json.load(open(S+'/music/beats.json'))['beats']
beats=[b for b in beats if b>=DROP_T-0.01]
tl={'dur':DUR,'speed':SPEED,'out':OUT_DUR,'fps':FPS,'scenes':SCENES,'words':W,'beats':beats,'sig':SIG,'vo':[[c,p,p+(e-s),t] for c,s,e,p,t in VO]}
letters=json.load(open(S+'/spot/logo_letters.json'))
open(S+'/spot/timeline.js','w').write('window.TL='+json.dumps(tl,ensure_ascii=False)+';\nwindow.LOGO_LETTERS='+json.dumps(letters)+';\n')
print('dur',DUR,'beats',len(beats),beats[:3],'sig',SIG['land2'])
