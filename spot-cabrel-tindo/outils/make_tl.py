import json, importlib
import timeline; importlib.reload(timeline)
from timeline import *
S='/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad'
W=json.load(open(S+'/spot/words.json'))
beats=json.load(open(S+'/music/beats.json'))['beats']
beats=[b for b in beats if b>=DROP_T-0.01]
tl={'dur':DUR,'fps':FPS,'scenes':SCENES,'words':W,'beats':beats,'sig':SIG,'vo':[[c,p,p+(e-s),t] for c,s,e,p,t in VO]}
letters=json.load(open(S+'/spot/logo_letters.json'))
open(S+'/spot/timeline.js','w').write('window.TL='+json.dumps(tl,ensure_ascii=False)+';\nwindow.LOGO_LETTERS='+json.dumps(letters)+';\n')
print('dur',DUR,'beats',len(beats),beats[:3],'sig',SIG['land2'])
