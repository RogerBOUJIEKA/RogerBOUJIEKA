#!/usr/bin/env node
// Generateur de miniatures "Investir Au Pays" — applique CHARTE.md, rend des PNG 1280x720.
//
// Usage : node generer.mjs config.json
// Le JSON contient "sortie", un bloc "base" (commun) et une liste "variantes"
// (chaque variante surcharge la base). Voir README.md pour tous les champs.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const W = 1280, H = 720;
const JAUNE = '#FFE01B', ROUGE = '#E10600';

// --- utilitaires --------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// {texte} dans une ligne blanche => texte en jaune (symboles, ex : {≠}).
// Anton dessine « ≠ » comme « = » : on trace la barre oblique en CSS.
const balisage = (s) => esc(s.toUpperCase())
  .replace(/\{([^}]*)\}/g, '<span class="sym">$1</span>')
  .replace(/≠/g, '<span class="diff">=</span>');

const url = (p, base) => pathToFileURL(path.resolve(base, p)).href;

function chromiumPath() {
  for (const p of [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium']) {
    if (p && fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return undefined; // Playwright prend son navigateur par defaut
}

// --- construction de la page ------------------------------------------------

function construireHTML(c, base) {
  const duo = c.personnes.length === 2;
  const jaune = c.jaune ?? 2; // numero de la ligne dans le bandeau jaune
  const lignes = [c.ligne1, c.ligne2].map((t, i) =>
    i + 1 === jaune
      ? `<div class="ligne"><span class="bandeau">${esc(t.toUpperCase()).replace(/[{}]/g, '')}</span></div>`
      : `<div class="ligne"><span class="blanc">${balisage(t)}</span></div>`);

  // Fond : une photo, ou deux moities (avant / apres).
  const flou = c.flou ?? 3, lum = c.luminosite ?? 0.62, sat = c.saturation ?? 1.3;
  const filtre = `filter: blur(${flou}px) brightness(${lum}) saturate(${sat});`;
  const fond = c.fond_avant
    ? `<div class="fond" style="${filtre} right:50%; background-image:url('${url(c.fond_avant, base)}')"></div>
       <div class="fond" style="${filtre} left:50%; background-image:url('${url(c.fond_apres, base)}')"></div>
       <div class="couture"></div>`
    : `<div class="fond" style="${filtre} background-image:url('${url(c.fond, base)}')"></div>`;

  // Personnes : solo => a droite ~45 % ; duo => invite a gauche, Philippe a droite.
  let pers = c.personnes;
  if (duo) pers = [...pers].sort((a, b) => (a.role === 'invite' ? -1 : 0) - (b.role === 'invite' ? -1 : 0));
  const zones = duo
    ? [{ left: 0, width: 0.46, haut: 0.68 }, { left: 0.54, width: 0.46, haut: 0.68 }]
    : [{ left: 0.50, width: 0.50, haut: 1.0 }];
  const personnes = pers.map((p, i) => {
    const z = zones[i];
    const ech = p.echelle ?? 1;
    const h = H * z.haut * ech;
    const style = [
      `left:${W * z.left + (p.decalage_x ?? 0)}px`, `width:${W * z.width}px`,
      `height:${h}px`, `bottom:${-(p.decalage_y ?? 0)}px`,
      p.miroir ? 'transform:scaleX(-1)' : '',
    ].join(';');
    return `<img class="personne" style="${style}" src="${url(p.photo, base)}">`;
  }).join('\n');

  // Accents optionnels.
  let accents = '';
  if (c.etiquette) {
    const e = typeof c.etiquette === 'string' ? { texte: c.etiquette } : c.etiquette;
    accents += `<div class="etiquette" style="left:${e.x ?? 40}px; top:${e.y ?? 40}px">${esc((e.texte ?? 'AVANT').toUpperCase())}</div>`;
  }
  if (c.signature) {
    const s = typeof c.signature === 'object' ? c.signature : {};
    const nom = s.texte ?? c.invite;
    const pos = s.x != null ? `left:${s.x}px` : duo ? 'left:60px' : 'right:60px';
    accents += `<div class="signature" style="${pos}; bottom:${s.y ?? 22}px">${esc(nom)}</div>`;
  }
  if (c.fleche) accents += fleche(c.fleche);

  const textePos = duo
    ? 'left:40px; right:40px; top:22px; align-items:center; text-align:center;'
    : 'left:44px; width:680px; top:0; bottom:0; justify-content:center; align-items:flex-start;';
  const degrade = duo
    ? 'linear-gradient(180deg, rgba(0,0,0,.88) 0%, rgba(0,0,0,.55) 32%, rgba(0,0,0,0) 58%), linear-gradient(0deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 30%)'
    : 'linear-gradient(90deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.72) 32%, rgba(0,0,0,.3) 55%, rgba(0,0,0,0) 72%), linear-gradient(0deg, rgba(0,0,0,.75) 0%, rgba(0,0,0,0) 34%)';

  const fontes = path.join(ICI, 'fonts');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Mrs+Saint+Delafield&display=block" rel="stylesheet">
<style>
@font-face { font-family:'AntonLocal'; src:url('${url('Anton.ttf', fontes)}'); }
@font-face { font-family:'BebasLocal'; src:url('${url('BebasNeue.ttf', fontes)}'); }
@font-face { font-family:'SignatureLocal'; src:url('${url('MrsSaintDelafield.ttf', fontes)}'); }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; overflow:hidden; background:#000; }
#m { position:relative; width:${W}px; height:${H}px; overflow:hidden; }
.fond { position:absolute; inset:0; background-size:cover; background-position:center; transform:scale(1.06); }
.couture { position:absolute; top:0; bottom:0; left:calc(50% - 3px); width:6px; background:#000; }
.degrade { position:absolute; inset:0; background:${degrade}; }
.personne { position:absolute; object-fit:contain; object-position:bottom center;
  filter: drop-shadow(0 0 18px rgba(0,0,0,.65)) drop-shadow(8px 10px 14px rgba(0,0,0,.5)) contrast(1.06) saturate(1.12); }
#texte { position:absolute; display:flex; flex-direction:column; gap:14px; z-index:5; }
.ligne { white-space:nowrap; line-height:1; font-family:${c.police === 'bebas' ? "'BebasLocal','Bebas Neue'" : "'AntonLocal','Anton'"}; }
.blanc, .bandeau { width:max-content; }
.blanc { color:#fff; display:inline-block;
  text-shadow: 5px 6px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 22px rgba(0,0,0,.9), 8px 12px 18px rgba(0,0,0,.85); }
.blanc .sym { color:${JAUNE}; }
.diff { position:relative; display:inline-block; }
.diff::after { content:''; position:absolute; left:50%; top:22%; width:.09em; height:62%; background:currentColor;
  transform:translateX(-50%) rotate(28deg); box-shadow:3px 4px 0 #000; }
.bandeau { display:inline-block; background:${JAUNE}; color:#000; padding:.06em .14em .02em;
  box-shadow: 6px 8px 0 rgba(0,0,0,.55); }
.etiquette { position:absolute; z-index:6; background:${ROUGE}; color:#fff; font-family:'AntonLocal','Anton';
  font-size:40px; line-height:1; padding:8px 16px 6px; box-shadow:4px 5px 0 rgba(0,0,0,.6); }
.signature { position:absolute; z-index:6; color:#fff; font-family:'SignatureLocal','Mrs Saint Delafield';
  font-size:${c.taille_signature ?? 70}px; line-height:1; text-shadow:0 0 10px rgba(0,0,0,.9), 2px 3px 4px #000; }
svg.fleche { position:absolute; inset:0; z-index:7; filter:drop-shadow(3px 4px 4px rgba(0,0,0,.7)); }
</style></head><body><div id="m">
${fond}
<div class="degrade"></div>
${personnes}
<div id="texte" style="${textePos}">${lignes.join('')}</div>
${accents}
</div>
<script>
// Ajuste chaque ligne a la largeur de la zone (texte enorme), puis l'ensemble a la hauteur.
window.ajuster = () => {
  const t = document.getElementById('texte');
  const largeur = ${duo ? W - 80 : 680}, hauteurMax = ${duo ? 250 : 600}, max = ${duo ? 140 : 210};
  const spans = [...t.querySelectorAll('.ligne > span')];
  for (const s of spans) {
    s.parentElement.style.fontSize = '100px';
    const k = largeur / s.getBoundingClientRect().width;
    s.parentElement.style.fontSize = Math.min(max, 100 * k) + 'px';
  }
  const h = spans.at(-1).getBoundingClientRect().bottom - spans[0].getBoundingClientRect().top;
  if (h > hauteurMax) for (const s of spans) s.parentElement.style.fontSize = parseFloat(s.parentElement.style.fontSize) * hauteurMax / h + 'px';
};
</script></body></html>`;
}

// Fleche rouge courbe : { de:[x,y], vers:[x,y], courbure: -0.4..0.4 }
function fleche({ de, vers, courbure = 0.3, epaisseur = 16 }) {
  const [x1, y1] = de, [x2, y2] = vers;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  const cx = mx - dy * courbure, cy = my + dx * courbure; // point de controle perpendiculaire
  // tangente en fin de courbe => orientation de la pointe
  const tx = x2 - cx, ty = y2 - cy, n = Math.hypot(tx, ty) || 1, ux = tx / n, uy = ty / n;
  const L = epaisseur * 3, l = epaisseur * 2.1;
  const bx = x2 - ux * L, by = y2 - uy * L;
  const pts = `${x2},${y2} ${bx - uy * l},${by + ux * l} ${bx + uy * l},${by - ux * l}`;
  const d = `M${x1},${y1} Q${cx},${cy} ${bx + ux * 4},${by + uy * 4}`;
  return `<svg class="fleche" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <path d="${d}" fill="none" stroke="#fff" stroke-width="${epaisseur + 8}" stroke-linecap="round"/>
  <polygon points="${pts}" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${ROUGE}" stroke-width="${epaisseur}" stroke-linecap="round"/>
  <polygon points="${pts}" fill="${ROUGE}"/></svg>`;
}

// --- planche contact (apercu de toutes les variantes) -----------------------

async function planche(page, fichiers, dest) {
  const imgs = fichiers.map((f) => `<figure><img src="${pathToFileURL(f).href}"><figcaption>${esc(path.basename(f))}</figcaption></figure>`).join('');
  await page.setViewportSize({ width: 1300, height: 400 });
  await page.setContent(`<style>body{margin:0;padding:16px;background:#222;font:16px sans-serif;color:#eee;display:grid;grid-template-columns:1fr 1fr;gap:16px}
    img{width:100%;display:block}figure{margin:0}figcaption{padding-top:4px}</style>${imgs}`);
  await page.waitForLoadState('load');
  await page.screenshot({ path: dest, fullPage: true });
}

// --- principal ---------------------------------------------------------------

async function main() {
  const cfgPath = process.argv[2];
  if (!cfgPath) { console.error('Usage : node generer.mjs config.json'); process.exit(1); }
  const base = path.dirname(path.resolve(cfgPath));
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const sortie = path.resolve(base, cfg.sortie ?? 'sorties');
  fs.mkdirSync(sortie, { recursive: true });
  const variantes = cfg.variantes?.length ? cfg.variantes : [{}];

  const navigateur = await chromium.launch({ executablePath: chromiumPath() });
  const page = await navigateur.newPage({ viewport: { width: W, height: H } });
  const fichiers = [];
  try {
    for (const [i, v] of variantes.entries()) {
      const c = { ...cfg.base, ...v };
      if (!c.ligne1 || !c.ligne2) throw new Error(`variante ${i + 1} : ligne1 et ligne2 obligatoires`);
      if (!c.fond && !(c.fond_avant && c.fond_apres)) throw new Error(`variante ${i + 1} : fond (ou fond_avant + fond_apres) obligatoire`);
      if (!c.personnes?.length || c.personnes.length > 2) throw new Error(`variante ${i + 1} : 1 ou 2 personnes`);

      const tmp = path.join(sortie, `.${i}.tmp.html`);
      fs.writeFileSync(tmp, construireHTML(c, base));
      await page.setViewportSize({ width: W, height: H });
      await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
      await page.evaluate(() => Promise.all(['AntonLocal', 'BebasLocal', 'SignatureLocal']
        .map((f) => document.fonts.load(`100px ${f}`, 'AZ≠'))));
      await page.evaluate(() => window.ajuster());
      const dest = path.join(sortie, `${v.nom ?? `variante-${i + 1}`}.png`);
      await page.locator('#m').screenshot({ path: dest });
      if (!process.env.GARDER_HTML) fs.unlinkSync(tmp);
      fichiers.push(dest);
      console.log(dest);
    }
    if (fichiers.length > 1) {
      const dest = path.join(sortie, '_planche.png');
      await planche(page, fichiers, dest);
      console.log(dest);
    }
  } finally {
    await navigateur.close();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
