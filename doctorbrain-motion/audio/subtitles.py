"""Génère les sous-titres SRT de la voix off (build/doctorbrain.srt)."""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
TXT = [
    "Réviser la médecine… c'est parfois avoir l'impression de se perdre.",
    "Des cours partout. Des fiches qui s'empilent. Et jamais assez de temps.",
    "Et si tu révisais, enfin… avec méthode ?",
    "Bienvenue sur Doctor Brain.",
    "La plateforme pensée pour réviser la médecine, pas à pas, au même endroit.",
    "Les leçons médicales rassemblent les notions essentielles, structurées par spécialité.",
    "Chaque jour, le Quiz du jour te propose cinq QCM, sur un cycle de dix jours.|Tu suis ta progression… et tu grimpes au classement.",
    "Avec les cas cliniques, tu avances étape par étape,|du premier symptôme jusqu'à la prise en charge.",
    "La section Syndromes t'aide à retenir les grands tableaux cliniques.",
    "Et l'anglais médical devient un réflexe, grâce à des leçons et des quiz quotidiens.",
    "Sur le Campus, retrouve les ressources,|une bibliothèque organisée par année, et les formations.",
    "Tu ne sais pas par où commencer ?|Lance la Brain Wheel… et démarre ta session de révision.",
    "Et sur le blog, des articles utiles pour apprendre… et progresser.",
    "Doctor Brain. Réviser la médecine… avec méthode.|Rendez-vous sur doctorbrain.fr",
]
meta = json.load(open(os.path.join(HERE, '..', 'build', 'cues.json')))
def ts(x):
    h, r = divmod(x, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"
out, n = [], 1
for (t, k), txt in zip(meta['vo'], TXT):
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                              os.path.join(HERE, 'vo', f'vo{k:02d}.mp3')], capture_output=True, text=True).stdout)
    parts = txt.split('|')
    total = sum(len(p) for p in parts)
    a = t
    for p in parts:
        b = a + d * len(p) / total
        out.append(f"{n}\n{ts(a)} --> {ts(b)}\n{p}\n"); n += 1; a = b
open(os.path.join(HERE, '..', 'build', 'doctorbrain.srt'), 'w').write('\n'.join(out))
print('OK', n - 1, 'sous-titres')
