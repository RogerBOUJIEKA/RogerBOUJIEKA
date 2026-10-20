"""Compose la musique du spot (MIDI) calée sur la timeline, puis la rend avec FluidSynth.

Usage : python compose_music.py timeline.json out.mid
Les sections suivent la grille de 72 BPM ancrée sur la révélation du logo (grid0).
"""
import json
import random
import sys

import mido

random.seed(4)

TL = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
BPM = TL["bpm"]
BEAT = 60.0 / BPM
BAR = 4 * BEAT
TOTAL = TL["total"]
K0 = TL["grid0"] - 9 * BAR          # mesure 0 (la révélation tombe sur la mesure 9)
TPB = 480


def bar(k, beat=0.0):
    return K0 + k * BAR + beat * BEAT


# ------------------------------------------------------------------ harmonie
CH = {
    "D": (38, [57, 62, 66, 69]), "D/F#": (42, [57, 62, 66, 69]), "Dadd9": (38, [57, 62, 64, 66, 69]),
    "A": (33, [57, 61, 64, 69]), "A/C#": (37, [57, 61, 64, 69]), "Asus": (33, [57, 62, 64, 69]),
    "Bm": (35, [54, 59, 62, 66]), "G": (31, [55, 59, 62, 67]), "Gmaj7": (31, [55, 59, 62, 66]),
    "Em": (40, [52, 59, 64, 67]), "F#sus": (30, [54, 59, 61, 66]), "F#": (30, [54, 58, 61, 66]),
}
# (mesure, accord, durée en temps) — 4 temps = une mesure
PROG = [
    (0, "D", 4), (1, "A/C#", 4), (2, "Bm", 4), (3, "G", 4), (4, "D/F#", 2), (4.5, "G", 2),
    (5, "Bm", 4), (6, "Em", 4), (7, "F#sus", 2), (7.5, "F#", 2),
    (8, "Gmaj7", 4),
    (9, "D", 4), (10, "A", 4), (11, "Bm", 4), (12, "G", 4),
    (13, "G", 4), (14, "D/F#", 4), (15, "Em", 4), (16, "A", 4), (17, "Bm", 4), (18, "G", 4),
    (19, "Em", 2), (19.5, "Asus", 1), (19.75, "A", 1),
    (20, "D", 4), (21, "G", 4), (22, "Bm", 2), (22.5, "A", 2),
    (23, "G", 4), (24, "Asus", 2), (24.5, "A", 2),
    (25, "Dadd9", 6),
]

# ------------------------------------------------------------------ pistes
PROGRAMS = {0: 0, 1: 48, 2: 89, 3: 52, 4: 8, 5: 43, 6: 47, 7: 119, 8: 9, 10: 42}
NAMES = {0: "piano", 1: "strings", 2: "pad", 3: "choir", 4: "celesta", 5: "bass", 6: "timpani", 7: "revcym", 8: "glock", 9: "drums", 10: "cello"}
EV = []  # (temps_s, ordre, canal, message)


def note(ch, t, dur, pitch, vel):
    vel = max(1, min(127, int(vel + random.uniform(-4, 4))))
    t = max(0.0, t + random.uniform(-0.006, 0.006)) if ch in (0, 4, 8) else max(0.0, t)
    EV.append((t, 1, ch, mido.Message("note_on", channel=ch, note=pitch, velocity=vel)))
    EV.append((t + dur, 0, ch, mido.Message("note_off", channel=ch, note=pitch, velocity=0)))


def cc(ch, t, ctrl, val):
    EV.append((max(0.0, t), 0, ch, mido.Message("control_change", channel=ch, control=ctrl, value=int(max(0, min(127, val))))))


def ramp(ch, t0, t1, v0, v1, ctrl=11, steps=24):
    for i in range(steps + 1):
        cc(ch, t0 + (t1 - t0) * i / steps, ctrl, v0 + (v1 - v0) * i / steps)


for ch, prog in PROGRAMS.items():
    EV.append((0, -1, ch, mido.Message("program_change", channel=ch, program=prog)))
    cc(ch, 0, 7, 100)
    cc(ch, 0, 91, 70 if ch not in (5, 6) else 40)
    cc(ch, 0, 93, 20)
cc(9, 0, 91, 50)


def section_of(k):
    if k < 5: return "intro"
    if k < 8: return "doubt"
    if k < 9: return "breath"
    if k < 13: return "reveal"
    if k < 20: return "build"
    if k < 22: return "climax"
    if k < 25: return "cta"
    return "end"


# ------------------------------------------------------------------ écriture par accord
for i, (k, name, beats) in enumerate(PROG):
    t0, dur = bar(k), beats * BEAT
    bass, up = CH[name]
    sec = section_of(k)
    # nappes : cordes + pad
    if sec != "breath":
        sv = {"intro": 52, "doubt": 50, "reveal": 66, "build": 72, "climax": 92, "cta": 70, "end": 78}[sec]
        for p in up:
            note(1, t0, dur * 0.98, p, sv)
        if sec in ("climax", "end"):
            for p in up[-2:]:
                note(1, t0, dur * 0.98, p + 12, sv - 10)
    pv = {"intro": 50, "doubt": 48, "breath": 46, "reveal": 58, "build": 60, "climax": 70, "cta": 58, "end": 62}[sec]
    for p in up[:3]:
        note(2, t0, dur * 0.99, p - 12 if sec == "doubt" else p, pv)
    # basse / violoncelle
    if sec not in ("breath", "intro") or k >= 2:
        note(5, t0, dur * 0.95, bass + 12 if bass < 33 else bass, {"intro": 46, "doubt": 56, "reveal": 64, "build": 70, "climax": 84, "cta": 66, "end": 70}.get(sec, 50))
        note(10, t0, dur * 0.95, bass + 12, {"intro": 40, "doubt": 54, "reveal": 56, "build": 62, "climax": 76, "cta": 58, "end": 62}.get(sec, 45))
    # chœur
    if (sec == "build" and k >= 15) or sec in ("climax", "end"):
        for p in up[1:]:
            note(3, t0, dur * 0.98, p, 60 if sec == "build" else 80)
    # piano
    lo = bass + 12 if bass + 12 >= 40 else bass + 24
    arp = [lo, up[0], up[1], up[2], up[3] if len(up) > 3 else up[2] + 12]
    if sec == "intro":
        pat = [arp[0], arp[1], arp[2], arp[3]] * 2
        for j in range(int(beats)):
            note(0, t0 + j * BEAT, BEAT * 1.6, pat[j % 4] + (12 if j % 4 == 3 else 0), 44 + (8 if j == 0 else 0))
    elif sec == "doubt":
        note(0, t0, dur, lo - 12 if lo - 12 >= 28 else lo, 46)
        note(0, t0, dur, up[0], 40)
        note(0, t0 + 2 * BEAT, BEAT * 2, up[2] + 12, 34)
    elif sec == "breath":
        pass
    else:
        seq = [arp[0], arp[1], arp[2], arp[3], arp[4] + 12 if sec == "climax" else arp[4], arp[3], arp[2], arp[1]]
        base = {"reveal": 52, "build": 56, "climax": 64, "cta": 52, "end": 50}[sec]
        n8 = int(beats * 2) if sec != "end" else 4
        for j in range(n8):
            accent = 10 if j % 4 == 0 else 0
            note(0, t0 + j * BEAT / 2, BEAT * 0.9, seq[j % 8], base + accent)
            if sec == "climax" and j % 2 == 0:
                note(0, t0 + j * BEAT / 2, BEAT * 0.9, seq[j % 8] - 12, base - 6)

# ------------------------------------------------------------------ mélodie (célesta / cordes)
MEL_A = [  # sur D – A – Bm – G
    (0, 0, 1, 78), (0, 1, 0.5, 76), (0, 1.5, 0.5, 74), (0, 2, 2, 69),
    (1, 0, 1, 76), (1, 1, 0.5, 78), (1, 1.5, 0.5, 76), (1, 2, 2, 73),
    (2, 0, 1, 74), (2, 1, 0.5, 73), (2, 1.5, 0.5, 71), (2, 2, 2, 66),
    (3, 0, 1, 67), (3, 1, 1, 69), (3, 2, 1, 71), (3, 3, 1, 74),
]
for (b, bt, d, p) in MEL_A:            # révélation : célesta
    note(4, bar(9 + b, bt), d * BEAT * 0.95, p + 12, 62)
for (b, bt, d, p) in MEL_A:            # construction : célesta + glock plus discret
    note(4, bar(13 + b, bt), d * BEAT * 0.95, p + 12, 54)
MEL_C = [  # sur D – G – Bm/A (climax), cordes aiguës + piano
    (0, 0, 2, 81), (0, 2, 1, 78), (0, 3, 1, 76),
    (1, 0, 3, 74), (1, 3, 1, 71),
    (2, 0, 2, 78), (2, 2, 2, 76),
]
for (b, bt, d, p) in MEL_C:
    note(1, bar(20 + b, bt), d * BEAT * 0.98, p, 96)
    note(4, bar(20 + b, bt), d * BEAT * 0.9, p + 12, 70)
MEL_E = [(0, 0, 2, 74), (0, 2, 2, 71), (1, 0, 2, 73), (1, 2, 2, 76)]  # G – A avant la résolution
for (b, bt, d, p) in MEL_E:
    note(4, bar(23 + b, bt), d * BEAT * 0.95, p + 12, 58)
for j, p in enumerate([86, 90, 93, 98]):  # résolution finale : glockenspiel
    note(8, bar(25, j * 0.5), BEAT * 3, p, 60 - j * 4)
note(0, bar(25, 2), BEAT * 4, 86, 52)    # dernière note de piano, qui résonne
note(0, bar(25, 2), BEAT * 4, 74, 46)

# ------------------------------------------------------------------ percussions
for k in range(10, 20):                # battement de cœur (grosse caisse douce)
    for bt in (0, 2):
        note(9, bar(k, bt), 0.2, 36, 50 if k < 13 else 58)
for k in range(15, 20):
    for j in range(8):
        note(9, bar(k, j / 2), 0.1, 42, 26 + (8 if j % 2 == 0 else 0))
for k in (20, 21):
    for bt in (0, 2):
        note(9, bar(k, bt), 0.2, 36, 76)
    for j in range(8):
        note(9, bar(k, j / 2), 0.1, 42, 34 + (10 if j % 2 == 0 else 0))
for k in (9, 20, 25):                  # cymbales aux temps forts
    note(9, bar(k), 3.0, 49, 92 if k != 25 else 70)
    note(6, bar(k), 1.5, 38, 104 if k != 25 else 80)
for k in (13, 21, 23):
    note(9, bar(k), 2.0, 49, 60)
for k in range(10, 13):                # timbales sur chaque mesure
    note(6, bar(k), 1.0, 38 if k != 11 else 35, 64)
for j in range(16):                    # roulement de timbales avant le climax
    note(6, bar(19, 2 + j / 8), 0.12, 33, 40 + j * 4)
for k, t_end in ((8, bar(9)), (19, bar(20)), (24, bar(25))):  # cymbales inversées (montées)
    note(7, t_end - 2.4, 2.38, 60, 92)
for j in range(4):                     # glockenspiel aux débuts de mesure (construction)
    note(8, bar(16 + j), BEAT * 2, 93 if j % 2 == 0 else 90, 46)

# ------------------------------------------------------------------ automation de volume (expression)
for ch in (0, 1, 2, 3, 4, 5, 10):
    cc(ch, 0, 11, 70)
ramp(2, 0, bar(0), 0, 90)
ramp(1, bar(0), bar(4), 60, 95)
ramp(0, bar(7), bar(8.5), 100, 60)
ramp(2, bar(8), bar(9) - 0.1, 70, 110)
ramp(1, bar(8), bar(9) - 0.1, 50, 100)
cc(0, bar(9), 11, 100)
ramp(1, bar(13), bar(20), 95, 115)
ramp(3, bar(15), bar(20), 70, 105)
ramp(0, bar(22), bar(22.5), 110, 90)
for ch in (0, 1, 2, 3, 4, 5, 8, 10):
    ramp(ch, TOTAL - 1.3, TOTAL - 0.05, 110, 0)

# ------------------------------------------------------------------ export
mid = mido.MidiFile(ticks_per_beat=TPB)
track = mido.MidiTrack()
mid.tracks.append(track)
track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(BPM), time=0))
EV.sort(key=lambda e: (e[0], e[1]))
last = 0
for t, _, ch, msg in EV:
    tick = int(round(t / BEAT * TPB))
    msg.time = max(0, tick - last)
    last = tick if tick > last else last
    track.append(msg)
mid.save(OUT)
print(f"{len(EV)} évènements, {len(PROG)} accords -> {OUT}")
