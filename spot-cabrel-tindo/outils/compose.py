# Original gospel praise & worship score for the spot, composed note by note on the spot timeline.
# Rendered with the GeneralUser GS soundfont (free for commercial music production).
# E major, 112 BPM on the story timeline (x1.07 in the delivered video: ~120 BPM).
# Events are written on the story timeline T and rendered at t = T / SPEED, so the music stays locked to the picture. Worship intro -> praise drop on "CABREL TINDO" -> groove -> breakdown -> big
# praise finale -> heavenly signature (one celesta note per dancing letter of the logo).
import numpy as np, tinysoundfont, soundfile as sf, json, os
from pedalboard import Pedalboard, Reverb, Compressor, HighpassFilter, LowpassFilter, Gain, Limiter, LowShelfFilter, HighShelfFilter
from timeline import *

S = '/tmp/claude-0/-home-user-RogerBOUJIEKA/c7701e2d-3148-5165-859c-7f006b4aaef1/scratchpad'
SF2 = S + '/music/package/GeneralUser.sf2'
SR = 48000
BPM = 112.0
BEAT = 60 / BPM
BAR = 4 * BEAT
T0 = DROP_T                      # downbeat of bar 0 = the drop on "CABREL"
END = DUR
def tb(bar, beat=0.0): return T0 + bar * BAR + beat * BEAT

PC = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
Q = {'maj': (0, 4, 7), 'add9': (0, 4, 7, 14), 'maj7': (0, 4, 7, 11), 'maj9': (0, 4, 7, 11, 14), 'm7': (0, 3, 7, 10),
     'm9': (0, 3, 7, 10, 14), 'sus4': (0, 5, 7), '7': (0, 4, 7, 10), '7sus': (0, 5, 7, 10), 'm': (0, 3, 7)}

def chord(sym):
    """'E:add9/G#' -> (root pc, intervals, bass pc)"""
    s, bass = (sym.split('/') + [None])[:2]
    r, q = s.split(':')
    return PC[r], Q[q], PC[bass] if bass else PC[r]

def in_range(pc, lo, hi):
    out = [n for n in range(lo, hi + 1) if n % 12 == pc % 12]
    return out

def voicing(sym, lo, hi, n=4):
    r, iv, _ = chord(sym)
    notes = []
    for i in iv:
        c = in_range(r + i, lo, hi)
        if c: notes.append(c[len(c) // 2] if len(c) > 1 else c[0])
    notes = sorted(set(notes))
    return notes[:n] if len(notes) > n else notes

def bassnote(sym, lo=33, hi=45):
    _, _, b = chord(sym)
    return in_range(b, lo, hi)[0]

# ------------------------------------------------------------------ events
EV = {k: [] for k in ['piano', 'rhodes', 'pad', 'oohs', 'bass', 'drums', 'brass', 'fx']}
def note(stem, t, n, vel, dur, ch=0):
    if t >= END or dur <= 0: return
    vel = int(max(1, min(127, vel)))
    EV[stem].append((t, 1, ch, n, vel)); EV[stem].append((min(t + dur, END - .01), 0, ch, n, 0))
def cc(stem, t, ch, ctl, val): EV[stem].append((t, 2, ch, ctl, int(max(0, min(127, val)))))
def ramp(stem, ch, ctl, t0, t1, v0, v1, steps=24):
    for i in range(steps + 1):
        cc(stem, t0 + (t1 - t0) * i / steps, ch, ctl, v0 + (v1 - v0) * i / steps)

# drum map (GM)
K, SN, CL, HH, OH, CR, RD, TL, TM, TH, TB, TAM = 36, 38, 39, 42, 46, 49, 51, 45, 47, 50, 41, 54
def dr(t, n, v, d=.12): note('drums', t, n, v, d, ch=9)

INTRO = ['E:add9', 'C#:m7', 'A:maj9', 'B:sus4', 'E:maj/G#', 'A:add9', 'F#:m7', 'B:7sus']
MAIN = ['E:add9', 'E:maj/G#', 'A:add9', 'B:sus4']
ALT = ['C#:m7', 'A:maj7', 'F#:m7', 'B:7']
GROOVE = MAIN + MAIN + ALT + MAIN + ['B:sus4']        # bars 0..16
BREAK = ['A:add9', 'B:sus4']                          # bars 17..18
BUILD = ['C#:m7', 'B:maj/D#']                         # bars 19..20
FINALE = ['A:add9', 'B:sus4', 'G#:m7', 'C#:m7', 'F#:m7', 'B:7', 'E:add9', 'A:add9', 'B:7sus']   # bars 21..29
PROG = {}
for i, c in enumerate(INTRO): PROG[i - 8] = c
for i, c in enumerate(GROOVE): PROG[i] = c
for i, c in enumerate(BREAK): PROG[17 + i] = c
for i, c in enumerate(BUILD): PROG[19 + i] = c
for i, c in enumerate(FINALE): PROG[21 + i] = c
PROG[30] = 'E:add9'

# ---- pre-intro ambience (under "Mesdames et messieurs")
for n in voicing('E:add9', 52, 71): note('pad', .25, n, 52, tb(-8) - .25 + .3)
ramp('pad', 0, 11, .25, 2.6, 20, 92)
for n in [52, 59, 64]: note('oohs', 1.2, n, 46, tb(-8) - 1.2 + .2)

# ---- worship intro: piano arpeggios, pads growing, riser into the drop
for b in range(-8, 0):
    c = PROG[b]; t = tb(b)
    vel = 52 + (b + 8) * 5
    note('piano', t, bassnote(c, 28, 40), vel + 6, BAR * .98)
    note('piano', t, bassnote(c, 28, 40) + 12, vel - 6, BAR * .98)
    rh = voicing(c, 59, 79, 5)
    pat = [0, 1, 2, 3, 2, 1, 2, 3] if len(rh) >= 4 else [0, 1, 2, 1, 2, 1, 2, 1]
    for k, idx in enumerate(pat):
        note('piano', t + k * BEAT / 2, rh[idx % len(rh)], vel - 8 + (8 if k in (0, 4) else 0), BEAT * 1.6)
    if b == -2 or b == -1:   # rhythmic lift before the drop
        for k in range(4): note('piano', t + k * BEAT, rh[-1] + 12, vel - 10, BEAT * .5)
    if b >= -6:
        for n in voicing(c, 52, 72): note('pad', t, n, 58 + (b + 6) * 5, BAR * 1.02)
    if b >= -4:
        for n in voicing(c, 55, 70, 3): note('oohs', t, n, 54 + (b + 4) * 6, BAR * 1.02)
cc('piano', 0, 0, 64, 127)
# timpani + snare roll + cymbal swell into the drop
for k in range(16): note('fx', tb(-2) + k * BEAT / 4 + BAR, 40, 30 + k * 5, .2, ch=1)
for k in range(32): dr(tb(-1) + k * BEAT / 8, SN, 22 + k * 3, .06)
for k in range(8): dr(tb(-1, 2) + k * BEAT / 4, CR if k == 0 else RD, 30 + k * 9, .3)
dr(tb(-1, 3.5), TH, 100); dr(tb(-1, 3.75), TM, 105)

# ---- praise groove (bars 0..16), gospel drums, bass, piano comping, rhodes, strings
def groove_bar(b, energy=1.0, fill=False, crash=False):
    c = PROG[b]; t = tb(b); s16 = BEAT / 4
    nxt = PROG.get(b + 1, c)
    # drums
    if crash: dr(t, CR, 112, 1.5)
    for i in [0, 6, 8, 11]: dr(t + i * s16, K, (112 if i in (0, 8) else 92) * energy)
    for i in [4, 12]: dr(t + i * s16, SN, 108 * energy); dr(t + i * s16, CL, 96 * energy)
    for i in [7, 15]: dr(t + i * s16, SN, 34 * energy, .05)
    for i in range(0, 16, 2): dr(t + i * s16, HH, (84 if i % 4 == 0 else 58) * energy, .05)
    if b % 2 == 1: dr(t + 14 * s16, OH, 70 * energy, .2)
    if energy > 1.02:
        for i in range(2, 16, 4): dr(t + i * s16, TAM, 60, .1)
    if fill:
        for j, n in enumerate([TH, TH, TM, TM, TL, TL, TB, TB]): dr(t + (8 + j) * s16 + 4 * s16, n, 80 + j * 4, .1)
    # bass (8ths, gospel walk to the next chord)
    rb = bassnote(c); nb = bassnote(nxt)
    pat = [rb, None, rb, rb + 7, rb + 12, None, rb, nb - 1 if nb - 1 != rb else rb + 2]
    for k, n in enumerate(pat):
        if n is not None: note('bass', t + k * BEAT / 2, n, 100 if k == 0 else 86, BEAT * .45)
    # piano gospel comping: syncopated stabs
    rh = voicing(c, 62, 81, 4); lh = bassnote(c, 40, 52)
    for i, v in [(0, 92), (3, 78), (6, 84), (10, 80), (12, 70), (14, 82)]:
        for n in rh: note('piano', t + i * s16, n, v * energy, s16 * 1.6)
        if i in (0, 6, 12): note('piano', t + i * s16, lh, v * energy - 10, s16 * 1.8)
    if b % 2 == 1:   # pentatonic run up on beat 4
        run = [76, 78, 80, 83, 85, 88]
        for j, n in enumerate(run[:4]): note('piano', t + (12 + j) * s16, n, 66, s16)
    # rhodes warmth + strings
    for n in voicing(c, 55, 74): note('rhodes', t, n, 52 * energy, BAR * .95)
    for n in voicing(c, 52, 72): note('pad', t, n, 60 * energy, BAR * 1.02)
    for n in voicing(c, 57, 72, 3): note('oohs', t, n, 50 * energy, BAR * 1.02)

for b in range(0, 17):
    groove_bar(b, energy=1.0, fill=(b % 4 == 3), crash=(b in (0, 8, 12)))
# drop hit
for n in voicing('E:add9', 55, 79, 5): note('brass', tb(0), n, 112, BEAT * 1.4)
dr(tb(0), CR, 120, 2.0); note('fx', tb(0), 40, 110, .8, ch=1)
for n in voicing('E:add9', 55, 70, 3): note('oohs', tb(0), n, 80, BAR * 2)
# brass stabs on the ticket prices (quantised to the 16th grid)
def q16(t): k = round((t - T0) / (BEAT / 4)); return T0 + k * BEAT / 4
for tp in PRICE_T:
    tq = q16(tp)
    for n in voicing('B:maj', 58, 77, 4): note('brass', tq, n, 104, BEAT * .4)
for b in (4, 8, 12, 16):
    for n in voicing(PROG[b], 58, 77, 4): note('brass', tb(b, 3.5), n, 92, BEAT * .3)

# ---- catchy hook (piano octaves + rhodes, brass answers): the melody people remember
HOOK = [  # (beat offset within a 2-bar phrase, MIDI note, length in beats)
    (0, 71, .5), (.5, 76, .5), (1.5, 78, .5), (2, 80, .75), (3, 78, .5), (3.5, 76, .5),
    (4.5, 73, .5), (5, 76, .5), (6, 71, 1.25), (7.5, 68, .5)]
ANSWER = [(6.5, 83, .25), (6.75, 80, .25), (7, 83, .5)]
def hook(b0, nb, vel, brass=0):
    for ph in range(0, nb, 2):
        t = tb(b0 + ph)
        for off, n, ln in HOOK:
            note('piano', t + off * BEAT, n, vel, ln * BEAT * .9); note('piano', t + off * BEAT, n + 12, vel - 14, ln * BEAT * .9)
            note('rhodes', t + off * BEAT, n, vel - 6, ln * BEAT)
        if brass:
            for off, n, ln in ANSWER:
                for d in (0, -4, -7): note('brass', t + off * BEAT, n + d - 12, brass, ln * BEAT * .9)
hook(0, 8, 74, 84)        # drop -> title / joy / date
hook(8, 4, 60, 70)        # tickets (voice busy -> softer)
hook(12, 4, 58, 0)        # phone
hook(21, 4, 52, 0)        # finale under the last lines (soft, the voice leads)
hook(25, 2, 86, 100)      # finale after "nombreux !": full hook
hook(27, 2, 60, 0)        # under the end tag "Réservations au ..." (voice on top)
# intro heartbeat + rising arpeggio to pull the viewer in
for b in range(-4, 0):
    for i in range(4): dr(tb(b, i), K, 52 + (b + 4) * 9 + (8 if i == 0 else 0), .2)
    up = voicing(PROG[b], 64, 88, 5)
    for i in range(8): note('fx', tb(b, i * .5), up[i % len(up)] + (12 if i >= 4 else 0), 46 + (b + 4) * 7, BEAT * .45, ch=4)
note('fx', tb(0), 28, 120, 1.5, ch=1)     # extra low hit on the drop

# ---- breakdown (partners): piano, rhodes, pads, soft hats
for b in (17, 18):
    c = PROG[b]; t = tb(b)
    for n in voicing(c, 60, 79, 4): note('piano', t, n, 70, BEAT * 1.9); note('piano', t + 2 * BEAT, n, 62, BEAT * 1.9)
    note('piano', t, bassnote(c, 28, 40), 74, BAR); note('bass', t, bassnote(c), 80, BAR * .95)
    for n in voicing(c, 55, 74): note('rhodes', t, n, 50, BAR * .95)
    for n in voicing(c, 52, 72): note('pad', t, n, 66, BAR * 1.02)
    for n in voicing(c, 55, 70, 3): note('oohs', t, n, 58, BAR * 1.02)
    for i in range(8): dr(t + i * BEAT / 2, HH, 46 + (i % 2) * -10, .05)
    dr(t, K, 80)
# ---- build (together)
for j, b in enumerate((19, 20)):
    c = PROG[b]; t = tb(b)
    for i in range(4): dr(t + i * BEAT, K, 96 + j * 8)
    div = 2 if b == 19 else 4
    for i in range(4 * div): dr(t + i * BEAT / div, SN, 44 + i * (40 / (4 * div)) + j * 26, .05)
    for i in range(8): dr(t + i * BEAT / 2, HH, 70, .05)
    for i in range(4): note('bass', t + i * BEAT, bassnote(c), 92, BEAT * .9)
    for n in voicing(c, 62, 81, 4):
        for i in range(4): note('piano', t + i * BEAT, n, 74 + j * 10, BEAT * .8)
    for n in voicing(c, 52, 72): note('pad', t, n, 70 + j * 10, BAR * 1.02)
    for n in voicing(c, 55, 72, 3): note('oohs', t, n, 66 + j * 10, BAR * 1.02)
for k in range(8): dr(tb(20, 2) + k * BEAT / 4, CR if k == 0 else RD, 40 + k * 8, .3)

# ---- finale (bars 21..29): full praise, choir, brass
for b in range(21, 30):
    groove_bar(b, energy=1.08, fill=(b in (24, 29)), crash=(b in (21, 25, 28)))
    c = PROG[b]; t = tb(b)
    for n in voicing(c, 55, 74, 4): note('oohs', t, n, 68, BAR * 1.02)
    for n in voicing(c, 64, 84, 4): note('pad', t, n, 70, BAR * 1.02)
    if b % 2 == 1 and b != 27:
        for n in voicing(c, 58, 79, 4): note('brass', t, n, 100, BEAT * .9); note('brass', t + 2.5 * BEAT, n, 92, BEAT * .4)
# final chord (bar 30) on the poster, ringing into the signature
t = tb(30); c = 'E:add9'
for n in voicing(c, 60, 84, 5): note('piano', t, n, 104, 3.0); note('brass', t, n, 108, 1.6)
note('piano', t, 28, 100, 3.0); note('piano', t, 40, 96, 3.0); note('bass', t, 40, 104, 2.0)
for n in voicing(c, 52, 76, 5): note('pad', t, n, 88, 2.8)
for n in voicing(c, 55, 74, 4): note('oohs', t, n, 92, 2.4)
dr(t, CR, 124, 3.0); dr(t, K, 120); note('fx', t, 40, 120, 1.5, ch=1)
ramp('pad', 0, 11, t + .8, t + 2.4, 127, 30); ramp('oohs', 0, 11, t + .6, t + 2.2, 127, 25)
ramp('pad', 0, 11, SIG['in'] + .1, SIG['in'] + 1.5, 30, 110); ramp('oohs', 0, 11, SIG['in'] + .2, SIG['in'] + 1.6, 25, 100)

# ---- heavenly signature
sig_end = END - .3
for n in [52, 59, 64, 66, 68, 71]: note('pad', SIG['in'] + .1, n, 62, sig_end - SIG['in'] - .1)
for n in [59, 64, 68]: note('oohs', SIG['in'] + .3, n, 56, sig_end - SIG['in'] - .3)
ramp('pad', 0, 11, END - 1.6, END - .2, 110, 0); ramp('oohs', 0, 11, END - 1.6, END - .2, 100, 0)
HARP_UP = [52, 56, 59, 61, 64, 66, 68, 71, 73, 76, 78, 80, 83, 85, 88]
def harp_gliss(t0, d, vel=70):
    for i, n in enumerate(HARP_UP): note('fx', t0 + d * i / len(HARP_UP), n, vel + i, 1.6, ch=2)
harp_gliss(SIG['arrive0'] + .1, SIG['land1'] - SIG['arrive0'] - .25)
for land in (SIG['land1'], SIG['land2']):
    for n in [64, 68, 71, 76]: note('piano', land, n, 96, 2.4)
    note('piano', land, 40, 90, 2.4); note('fx', land, 88, 100, 2.0, ch=3); note('fx', land, 83, 90, 2.0, ch=3)
    dr(land, CR, 70, 2.5)
CEL = [76, 78, 80, 83, 85, 88, 90]               # one celesta note per letter "o u j i e k a"
for i, n in enumerate(CEL): note('fx', SIG['letters0'] + i * SIG['lstep'], n, 92, .9, ch=4)
AG = [83, 85, 88, 90, 92, 95]                    # "a g e n c y"
for i, n in enumerate(AG): note('fx', SIG['agency0'] + i * SIG['astep'], n, 76, .8, ch=4)
harp_gliss(SIG['take'], .8, 64)
for i, n in enumerate(reversed(CEL)): note('fx', SIG['flyover0'] + i * SIG['flystep'], n, 70, .8, ch=4)
for n in [52, 56, 59, 64, 68, 71, 76]: note('pad', SIG['land2'], n, 82, END - SIG['land2'] - .3)

# ------------------------------------------------------------------ render
PROGRAMS = {
    'piano': {0: (0, 0, False)}, 'rhodes': {0: (0, 4, False)}, 'pad': {0: (0, 49, False)},
    'oohs': {0: (0, 53, False)}, 'bass': {0: (0, 33, False)}, 'drums': {9: (128, 8, True)},
    'brass': {0: (0, 61, False)}, 'fx': {1: (0, 47, False), 2: (0, 46, False), 3: (0, 9, False), 4: (0, 8, False)},
}
def render(stem):
    s = tinysoundfont.Synth(samplerate=SR, gain=-4); sid = s.sfload(SF2)
    for ch, (bank, prog, d) in PROGRAMS[stem].items(): s.program_select(ch, sid, bank, prog, is_drums=d)
    if stem == 'piano': s.control_change(0, 64, 0)
    ev = sorted(EV[stem], key=lambda e: (e[0], e[1]))
    total = int(OUT_DUR * SR); cur = 0; chunks = []
    for t, kind, ch, a, b in ev:
        n = int(t / SPEED * SR) - cur
        if n > 0: chunks.append(np.frombuffer(s.generate(n), dtype=np.float32).copy()); cur += n
        if kind == 1: s.noteon(ch, a, b)
        elif kind == 0: s.noteoff(ch, a)
        else: s.control_change(ch, a, b)
    if total > cur: chunks.append(np.frombuffer(s.generate(total - cur), dtype=np.float32).copy())
    return np.concatenate(chunks).reshape(-1, 2).T

FX = {
    'piano': Pedalboard([HighpassFilter(60), Compressor(-18, 2.5, 10, 120), Reverb(room_size=.45, wet_level=.18, dry_level=.9, width=1)]),
    'rhodes': Pedalboard([HighpassFilter(120), LowpassFilter(6000), Reverb(room_size=.5, wet_level=.2, dry_level=.8)]),
    'pad': Pedalboard([HighpassFilter(150), Reverb(room_size=.85, wet_level=.35, dry_level=.75, width=1)]),
    'oohs': Pedalboard([HighpassFilter(180), Reverb(room_size=.85, wet_level=.38, dry_level=.75, width=1)]),
    'bass': Pedalboard([HighpassFilter(35), LowpassFilter(3500), Compressor(-16, 4, 5, 80), Gain(2)]),
    'drums': Pedalboard([HighpassFilter(30), Compressor(-14, 3, 3, 60), Reverb(room_size=.25, wet_level=.08, dry_level=.95)]),
    'brass': Pedalboard([HighpassFilter(110), Compressor(-16, 2.5, 5, 100), Reverb(room_size=.6, wet_level=.22, dry_level=.85)]),
    'fx': Pedalboard([HighpassFilter(60), Reverb(room_size=.9, wet_level=.42, dry_level=.7, width=1)]),
}
GAIN = {'piano': -5.5, 'rhodes': 1, 'pad': 5, 'oohs': 0, 'bass': 2.5, 'drums': 2, 'brass': -3, 'fx': -3}
os.makedirs(S + '/music/stems', exist_ok=True)
mix = None
for stem in EV:
    if not EV[stem]: continue
    y = render(stem)
    y = FX[stem](y, SR) * (10 ** (GAIN[stem] / 20))
    sf.write(S + f'/music/stems/{stem}.wav', y.T, SR, subtype='FLOAT')
    mix = y if mix is None else mix + y
    print(stem, 'peak %.2f' % np.abs(y).max())
master = Pedalboard([LowShelfFilter(90, 1.5), HighShelfFilter(9000, 1.5), Compressor(-14, 2, 15, 150), Limiter(-1.0)])
mix = master(mix / max(1e-6, np.abs(mix).max()) * .7, SR)
sf.write(S + '/music/gospel_score.wav', mix.T, SR, subtype='FLOAT')
grid = [round(T0 + k * BEAT, 4) for k in range(-16, 200) if 0 <= T0 + k * BEAT < SIG['in']]
json.dump({'beats': grid}, open(S + '/music/beats.json', 'w'))
print('score', mix.shape[1] / SR, 's')
