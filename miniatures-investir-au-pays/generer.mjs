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
// Jaune premium : degrade du jaune charte (clair, haut gauche) vers un jaune-orange profond (bas droite).
const DEGRADE_JAUNE = 'linear-gradient(155deg, #FFE01B 0%, #FFD514 38%, #FBBC08 72%, #F49A00 100%)';

// --- utilitaires --------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// {texte} dans une ligne blanche => texte en jaune (symboles, ex : {≠}).
// Anton dessine « ≠ » comme « = » : on trace la barre oblique en CSS.
// MAJUSCULES partout, sauf les passages entre [crochets] gardes tels quels (ex : 1 500 F/[m²]).
const maj = (s) => s.split(/(\[[^\]]*\])/).map((x) => (x.startsWith('[') ? x.slice(1, -1) : x.toUpperCase())).join('');
const balisage = (s) => esc(maj(s))
  .replace(/\{([^}]*)\}/g, '<span class="sym">$1</span>')
  .replace(/≠/g, '<span class="diff">=</span>');

const url = (p, base) => pathToFileURL(path.resolve(base, p)).href;

function chromiumPath() {
  for (const p of [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium']) {
    if (p && fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return undefined; // Playwright prend son navigateur par defaut
}

// --- direction artistique premium -------------------------------------------
// Ambiance selon l'emotion du titre : etalonnage du fond, couleur de la lumiere (rim light,
// halo), rayons/flare discrets, vignettage. Toujours subtil et realiste, jamais kitsch.
const AMBIANCES = {
  reussite: { teinte: 'rgba(255,170,60,.42)', lumiere: '#ffd18a', rayons: true, vignette: 0.45 },
  argent:   { teinte: 'rgba(255,196,40,.40)', lumiere: '#ffd36e', rayons: false, vignette: 0.5 },
  alerte:   { teinte: 'rgba(30,110,255,.38)', lumiere: '#9fd2ff', rayons: false, vignette: 0.65, contraste: 1.18 },
  nuit:     { teinte: 'rgba(40,80,255,.35)', lumiere: '#86b8ff', rayons: false, vignette: 0.55 },
  neutre:   { teinte: null, lumiere: null, rayons: false, vignette: 0.4 },
};

// --- construction de la page ------------------------------------------------

function construireHTML(c, base) {
  const duo = c.personnes.length === 2;
  const jaune = c.jaune ?? 2; // numero de la ligne dans le bandeau jaune
  const lignes = [c.ligne1, c.ligne2].map((t, i) =>
    i + 1 === jaune
      ? `<div class="ligne"><span class="bandeau">${esc(maj(t)).replace(/[{}]/g, '')}</span></div>`
      : `<div class="ligne"><span class="blanc" data-t="${esc(maj(t)).replace(/[{}]/g, '')}"><span class="chrome">${balisage(t)}</span></span></div>`);

  // Fond : une photo, ou deux moities (avant / apres).
  // Fond reconnaissable : legerement floute et assombri ; le degrade noir assure la lisibilite du texte.
  // vif : couleurs plus saturees et plus de contraste (fond et personnes), toujours dans la charte.
  const amb = AMBIANCES[c.ambiance ?? 'neutre'] ?? AMBIANCES.neutre;
  const flou = c.flou ?? 3, lum = c.luminosite ?? (c.vif ? 0.88 : 0.78), sat = c.saturation ?? (c.vif ? 1.55 : 1.25);
  const contraste = amb.contraste ?? (c.vif ? 1.12 : 1);
  const filtre = `filter: blur(${flou}px) brightness(${lum}) saturate(${sat}) contrast(${contraste}); background-position:${c.fond_position ?? 'center'};`;
  // Rayons de soleil + flare discrets depuis une source (coin haut cote personne par defaut).
  const [sx, sy] = c.source_lumiere ?? [1080, -40];
  const effetsFond = [
    amb.teinte ? `<div class="etal" style="background:${amb.teinte}"></div>` : '',
    (c.rayons ?? amb.rayons) ? `<div class="rayons" style="background:repeating-conic-gradient(from 0deg at ${sx}px ${sy}px,
        rgba(255,226,170,0) 0deg, rgba(255,226,170,.34) 1.6deg, rgba(255,226,170,0) 4.5deg);
        -webkit-mask-image:radial-gradient(circle at ${sx}px ${sy}px, #000 0%, transparent 75%);
        mask-image:radial-gradient(circle at ${sx}px ${sy}px, #000 0%, transparent 75%)"></div>
      <div class="flare" style="background:radial-gradient(circle at ${sx}px ${sy}px, rgba(255,236,190,.55), rgba(255,200,120,.12) 18%, transparent 40%),
        radial-gradient(circle at ${sx - (sx - 640) * 0.55}px ${sy + (360 - sy) * 0.55}px, rgba(255,230,180,.10) 0, rgba(255,230,180,.10) 28px, transparent 30px),
        radial-gradient(circle at ${sx - (sx - 640) * 0.8}px ${sy + (360 - sy) * 0.8}px, rgba(180,220,255,.08) 0, rgba(180,220,255,.08) 16px, transparent 18px)"></div>` : '',
  ].join('');
  const fond = c.fond_avant
    ? `<div class="fond" style="${filtre} right:50%; background-image:url('${url(c.fond_avant, base)}')"></div>
       <div class="fond" style="${filtre} left:50%; background-image:url('${url(c.fond_apres, base)}')"></div>
       <div class="couture"></div>`
    : `<div class="fond" style="${filtre} background-image:url('${url(c.fond, base)}')"></div>`;
  const lumiere = c.lumiere ?? amb.lumiere; // null => couleur mesuree dans le fond (window.harmoniser)

  // Personnes : solo => a droite ~45 % ; duo => invite a gauche, Philippe a droite.
  let pers = c.personnes;
  if (duo) pers = [...pers].sort((a, b) => (a.role === 'invite' ? -1 : 0) - (b.role === 'invite' ? -1 : 0));
  const zones = duo
    ? [{ left: 0, width: 0.46, haut: 0.68 }, { left: 0.54, width: 0.46, haut: 0.68 }]
    : [{ left: 0.50, width: 0.50, haut: 1.0 }];
  const personnes = pers.map((p, i) => {
    const z = zones[i];
    const ech = p.echelle ?? 1;
    // recadrage r (0-1) : zoom 1/r ancre en bas au centre ; seul le haut du sujet (fraction r) reste visible.
    const r = p.recadrage ?? 1;
    const h = H * z.haut * ech / r;
    const cadre = [
      `left:${W * (z.left + z.width / 2) - W * z.width / r / 2 + (p.decalage_x ?? 0)}px`, `width:${W * z.width / r}px`,
      `height:${h}px`, `bottom:${-(p.decalage_y ?? 0) - h * (1 - r)}px`,
      p.miroir ? 'transform:scaleX(-1)' : '',
    ].join(';');
    const src = url(photoPersonne(p.photo), base);
    // Harmonie : calque de la couleur du fond, en lumiere tamisee, ecrete sur la personne
    // (couleur mesuree dans la page, derriere la personne). 0 = desactive.
    const harmonie = p.harmonie ?? c.harmonie ?? 0.35;
    const calque = harmonie > 0
      ? `<div class="harmonie" data-p="${i}" data-zone="${z.left},${z.width}" style="${cadre};opacity:${harmonie};
          -webkit-mask-image:url('${src}');mask-image:url('${src}')"></div>`
      : '';
    const pv = c.vif ? { ...p, etalonnage: { contraste: 1.12, saturation: 1.22, ...p.etalonnage } } : p;
    // Rim light : liseré de lumiere sur les bords (visage, epaules, crane), calcule a partir de la
    // forme exacte de la personne : image - image decalee. Cote fort = cote de la source de lumiere.
    const premium = c.premium !== false;
    const rim = (dx, dy, op) => `<div class="rim" data-p="${i}" style="${cadre};opacity:${op};
        -webkit-mask-image:url('${src}'),url('${src}'); mask-image:url('${src}'),url('${src}');
        -webkit-mask-position:bottom center, calc(50% + ${dx}px) calc(100% + ${dy}px);
        mask-position:bottom center, calc(50% + ${dx}px) calc(100% + ${dy}px);
        -webkit-mask-composite:source-out; mask-composite:subtract"></div>`;
    // image - image decalee vers la droite => liseré sur le bord gauche. Source a gauche => sens 1.
    const sens = (sx < W * (z.left + z.width / 2)) ? 1 : -1;
    const lumieres = premium ? rim(3 * sens, 2.5, 0.5) + rim(-2 * sens, 2, 0.18) +
      `<div class="visage" data-p="${i}" style="${cadre};-webkit-mask-image:url('${src}');mask-image:url('${src}')"></div>` : '';
    // Halo : lumiere coloree derriere la tete (eclairage de studio), en mode ecran.
    const couleurHalo = p.halo ?? c.halo ?? (premium ? 'auto' : null);
    const halo = couleurHalo
      ? `<div class="halo" data-p="${i}" style="left:${W * (z.left + z.width / 2) + (p.decalage_x ?? 0) - 380}px; top:${H * (1 - z.haut) - 140}px;
          background:radial-gradient(closest-side, ${couleurHalo === 'auto' ? 'var(--halo)' : couleurHalo}, transparent)"></div>`
      : '';
    return `${halo}<img class="personne" data-p="${i}" style="${cadre};filter:${filtrePersonne(pv)}" src="${src}">${calque}${lumieres}`;
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
  // Petits elements detoures aux bords (billets, pieces, cles...) : plus petits que la personne,
  // jamais sur le visage ni sur le texte. Ombre de contact douce + lumiere raccordee a l'ambiance.
  // Elements en 3 plans (references studio) :
  //  - arriere : derriere la personne, petit, flou de profondeur ;
  //  - milieu  : net, avec ombre portee et lumiere de la scene ;
  //  - avant   : premier plan, grand, flou, coupe par le bord du cadre.
  // Perspective 3D (rx, ry), rotation, flou de mouvement directionnel (mouvement: force en px,
  // dans l'axe de l'objet). Un element moche est pire que pas d'element.
  const plans = { arriere: '', milieu: '', avant: '' };
  let defs = '';
  (c.elements ?? []).forEach((e, k) => {
    const plan = e.plan ?? 'milieu';
    const flou = e.flou ?? { arriere: 3, milieu: 0, avant: 7 }[plan];
    const [rx, ry] = e.perspective ?? [0, 0];
    let mb = '';
    if (e.mouvement) { defs += `<filter id="mb${k}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${e.mouvement} 0"/></filter>`; mb = `url(#mb${k}) `; }
    const lum = { arriere: 'brightness(.8)', milieu: 'brightness(1.02)', avant: 'brightness(.88)' }[plan];
    const ombre = plan === 'milieu' ? ' drop-shadow(0 16px 16px rgba(0,0,0,.55)) drop-shadow(0 3px 4px rgba(0,0,0,.45))' : plan === 'arriere' ? ' drop-shadow(0 8px 10px rgba(0,0,0,.45))' : '';
    plans[plan] += `<img class="element ${plan}" src="${url(e.img, base)}" style="left:${e.x}px; top:${e.y}px; width:${e.largeur ?? 220}px;
      transform:perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${e.rotation ?? 0}deg)${e.miroir ? ' scaleX(-1)' : ''};
      filter:${mb}${flou ? `blur(${flou}px) ` : ''}${lum} saturate(1.12) contrast(1.06)${ombre}">`;
  });
  accents += plans.avant;

  // Bokeh / particules lumineuses discretes (couleur de la lumiere), en arriere-plan.
  let bokeh = '';
  if (c.bokeh) {
    let g = 7; const rnd = () => ((g = (g * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < (c.bokeh === true ? 18 : c.bokeh); k++) {
      const r = 6 + rnd() * 22, x = 420 + rnd() * 860, y = rnd() * 640;
      bokeh += `<div class="bokeh" style="left:${x}px; top:${y}px; width:${2 * r}px; height:${2 * r}px; opacity:${0.12 + rnd() * 0.3}; filter:blur(${1 + rnd() * 4}px)"></div>`;
    }
  }

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
#m { position:relative; width:${W}px; height:${H}px; overflow:hidden; --lumiere:${lumiere ?? '#ffe2b0'}; --halo:rgba(255,220,160,.55); }
.etal, .rayons, .flare, .vignette { position:absolute; inset:0; pointer-events:none; }
.etal { mix-blend-mode:soft-light; }
.rayons { mix-blend-mode:screen; filter:blur(5px); opacity:.8; }
.flare { mix-blend-mode:screen; }
.vignette { z-index:4; }
.element { position:absolute; }
.rim { position:absolute; pointer-events:none; background:var(--lumiere); mix-blend-mode:screen; filter:blur(1.6px);
  -webkit-mask-size:contain, contain; mask-size:contain, contain; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
.visage { position:absolute; pointer-events:none; mix-blend-mode:soft-light;
  -webkit-mask-size:contain; mask-size:contain; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
  -webkit-mask-position:bottom center; mask-position:bottom center; }
.fond { position:absolute; inset:0; background-size:cover; background-position:center; transform:scale(1.06); }
.couture { position:absolute; top:0; bottom:0; left:calc(50% - 3px); width:6px; background:#000; }
.degrade { position:absolute; inset:0; background:${degrade}; }
.personne { position:absolute; object-fit:contain; object-position:bottom center; }
.halo { position:absolute; width:760px; height:760px; mix-blend-mode:screen; opacity:.85; pointer-events:none; transform:scale(1.35); }
.bokeh { position:absolute; border-radius:50%; background:radial-gradient(circle, var(--lumiere) 0%, rgba(255,255,255,0) 70%); mix-blend-mode:screen; pointer-events:none; }
.element.avant { z-index:6; }
.element.milieu { z-index:3; }
.harmonie { position:absolute; mix-blend-mode:soft-light; pointer-events:none;
  -webkit-mask-size:contain; mask-size:contain; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
  -webkit-mask-position:bottom center; mask-position:bottom center; }
#texte { position:absolute; display:flex; flex-direction:column; gap:14px; z-index:5; }
.ligne { white-space:nowrap; line-height:1; font-family:${c.police === 'bebas' ? "'BebasLocal','Bebas Neue'" : "'AntonLocal','Anton'"}; }
.blanc, .bandeau { width:max-content; }
.blanc { display:inline-block; position:relative; isolation:isolate; }
/* Ligne blanche premium : chrome metallique (blanc -> argent -> blanc) au-dessus d'une extrusion 3D. */
.chrome { position:relative; background:linear-gradient(180deg, #ffffff 0%, #f7f7f7 42%, #cfd2d7 54%, #ffffff 78%, #ececec 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  -webkit-text-stroke:.03em #0b0b0b; paint-order:stroke fill; }
.blanc::before { content:attr(data-t); position:absolute; left:0; top:0; z-index:-1; color:#1d1d1d; -webkit-text-stroke:.03em #000;
  text-shadow: .008em .008em 0 #2b2b2b, .016em .016em 0 #262626, .024em .024em 0 #202020, .032em .032em 0 #1a1a1a,
    .04em .042em 0 #000, 0 .07em .16em rgba(0,0,0,.85), 0 0 .3em rgba(0,0,0,.5); }
.blanc .sym { background:${DEGRADE_JAUNE}; -webkit-background-clip:text; background-clip:text; color:transparent; }
.diff { position:relative; display:inline-block; }
.diff::after { content:''; position:absolute; left:50%; top:22%; width:.09em; height:62%; background:#F7A600;
  transform:translateX(-50%) rotate(28deg); box-shadow:3px 4px 0 #000; }
.bandeau { display:inline-block; background:${DEGRADE_JAUNE}; color:#000; padding:.06em .14em .02em; position:relative;
  text-shadow: 0 .02em 0 rgba(255,255,255,.35);
  box-shadow: inset 0 3px 0 rgba(255,255,255,.55), inset 0 -3px 0 rgba(150,70,0,.25), inset 3px 0 0 rgba(255,255,255,.18),
    0 .045em 0 #B86A00, 0 .07em .03em rgba(0,0,0,.45), 0 16px 34px rgba(0,0,0,.55), 0 0 26px rgba(255,200,30,.18); }
.bandeau::before { content:''; position:absolute; left:0; right:0; top:0; height:38%;
  background:linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0)); pointer-events:none; }
.etiquette { position:absolute; z-index:6; background:${ROUGE}; color:#fff; font-family:'AntonLocal','Anton';
  font-size:40px; line-height:1; padding:8px 16px 6px; box-shadow:4px 5px 0 rgba(0,0,0,.6); }
.signature { position:absolute; z-index:6; color:#fff; font-family:'SignatureLocal','Mrs Saint Delafield';
  font-size:${c.taille_signature ?? 70}px; line-height:1; text-shadow:0 0 10px rgba(0,0,0,.9), 2px 3px 4px #000; }
svg.fleche { position:absolute; inset:0; z-index:7; filter:drop-shadow(2px 3px 3px rgba(0,0,0,.55)); }
</style></head><body><div id="m">
${fond}
${effetsFond}
${bokeh}
<div class="degrade"></div>
${plans.arriere}
${personnes}
${plans.milieu}
<svg width="0" height="0" style="position:absolute">${defs}</svg>
<div class="vignette" style="background:radial-gradient(ellipse 75% 85% at 62% 45%, transparent 55%, rgba(0,0,0,${amb.vignette}) 100%)"></div>
<div id="texte" style="${textePos}">${lignes.join('')}</div>
${accents}
</div>
<script>
// Ajuste chaque ligne a la largeur de la zone (texte enorme), puis l'ensemble a la hauteur.
// Couleur moyenne du fond derriere chaque personne -> calque d'harmonie (sature un peu).
window.harmoniser = async () => {
  const fonds = [...document.querySelectorAll('.fond')];
  const c = document.createElement('canvas'); c.width = ${W / 10}; c.height = ${H / 10};
  const ctx = c.getContext('2d');
  for (const f of fonds) {
    const img = new Image();
    img.src = getComputedStyle(f).backgroundImage.slice(5, -2);
    await img.decode();
    const r = f.getBoundingClientRect();
    // reproduit background-size: cover dans la zone du fond
    const k = Math.max(r.width / img.width, r.height / img.height);
    const w = img.width * k, h = img.height * k;
    ctx.drawImage(img, (r.left + (r.width - w) / 2) / 10, (r.top + (r.height - h) / 2) / 10, w / 10, h / 10);
  }
  // Couleur de la source de lumiere : moyenne des 8 % de pixels les plus lumineux du fond.
  {
    const px = ctx.getImageData(0, 0, c.width, c.height).data, lums = [];
    for (let i = 0; i < px.length; i += 4) lums.push([0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2], i]);
    lums.sort((a, b) => b[0] - a[0]);
    let R = 0, V = 0, B = 0; const n = Math.max(1, Math.floor(lums.length * 0.08));
    for (const [, i] of lums.slice(0, n)) { R += px[i]; V += px[i + 1]; B += px[i + 2]; }
    [R, V, B] = [R / n, V / n, B / n];
    const mx = Math.max(R, V, B, 1), m = (R + V + B) / 3;
    const t = (x) => Math.round(Math.min(255, 255 * (m + (x - m) * 1.8) / mx));
    const m_ = document.getElementById('m');
    if (!${JSON.stringify(Boolean(lumiere))}) m_.style.setProperty('--lumiere', 'rgb(' + t(R) + ',' + t(V) + ',' + t(B) + ')');
    const L = getComputedStyle(m_).getPropertyValue('--lumiere').trim();
    m_.style.setProperty('--halo', L.startsWith('#')
      ? L + '88' : L.replace('rgb(', 'rgba(').replace(')', ',.55)'));
  }
  for (const d of document.querySelectorAll('.harmonie')) {
    const [g, l] = d.dataset.zone.split(',').map(Number);
    const px = ctx.getImageData(Math.round(g * c.width), 0, Math.max(1, Math.round(l * c.width)), c.height).data;
    let R = 0, V = 0, B = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) { R += px[i]; V += px[i + 1]; B += px[i + 2]; n++; }
    [R, V, B] = [R / n, V / n, B / n];
    const m = (R + V + B) / 3, sat = 1.6;
    const t = (x) => Math.round(Math.min(255, Math.max(0, m + (x - m) * sat)));
    d.style.background = 'rgb(' + t(R) + ',' + t(V) + ',' + t(B) + ')';
  }
};

// Marge d'air au-dessus de la tete (regle 12) : le haut du crane (haut du detourage, recadre au
// plus pres du sujet) doit etre a au moins ~4-8 % du bord haut. Sinon on descend la personne,
// sans changer sa taille.
window.placer = async () => {
  // Trop haut (< 30 px) : on descend. Seul a l'image et trop bas (> 58 px, 8 %) : on remonte.
  // En duo, les tetes restent sous le texte place en haut.
  const marge = ${c.marge_haut ?? 45}, minimum = 30, maximum = ${duo ? 'Infinity' : 58};
  const hautTete = (img) => {
    const r = img.getBoundingClientRect();
    const hRendu = Math.min(r.height, r.width * img.naturalHeight / img.naturalWidth);
    return r.bottom - hRendu - document.getElementById('m').getBoundingClientRect().top;
  };
  const marges = [];
  for (const img of document.querySelectorAll('img.personne')) {
    await img.decode();
    const haut = hautTete(img);
    if (haut >= minimum && haut <= maximum) { marges.push(Math.round(haut)); continue; }
    let d = marge - haut;
    // On ne remonte jamais au point de decoller le bas du sujet du bord bas (buste « flottant ») :
    // pour un detourage large, agrandir plutot avec "recadrage".
    if (d < 0) {
      const bas = img.getBoundingClientRect().bottom - document.getElementById('m').getBoundingClientRect().top;
      d = Math.max(d, Math.min(0, ${H} - bas));
    }
    for (const el of document.querySelectorAll('[data-p="' + img.dataset.p + '"]')) {
      if (el.classList.contains('halo')) el.style.top = (parseFloat(el.style.top) + d) + 'px';
      else el.style.bottom = (parseFloat(el.style.bottom) - d) + 'px';
    }
    marges.push(Math.round(hautTete(img)));
  }
  // Eclairage doux du visage (dodge & burn) : on repere la tete dans le detourage (premieres
  // lignes opaques) et on eclaire legerement le visage, en assombrissant un peu le bas du buste.
  for (const v of document.querySelectorAll('.visage')) {
    const img = document.querySelector('img.personne[data-p="' + v.dataset.p + '"]');
    const cw = 160, ch = Math.round(cw * img.naturalHeight / img.naturalWidth);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const x = cv.getContext('2d'); x.drawImage(img, 0, 0, cw, ch);
    const a = x.getImageData(0, 0, cw, ch).data;
    let y0 = 0; while (y0 < ch && ![...Array(cw).keys()].some((i) => a[(y0 * cw + i) * 4 + 3] > 128)) y0++;
    let sx = 0, n = 0;
    for (let y = y0; y < Math.min(ch, y0 + ch * 0.12); y++) for (let i = 0; i < cw; i++) if (a[(y * cw + i) * 4 + 3] > 128) { sx += i; n++; }
    const r = v.getBoundingClientRect();
    const hR = Math.min(r.height, r.width * img.naturalHeight / img.naturalWidth), wR = hR * img.naturalWidth / img.naturalHeight;
    const gx = (r.width - wR) / 2 + (n ? sx / n / cw : 0.5) * wR, gy = (r.height - hR) + (y0 / ch + 0.12) * hR;
    v.style.background = 'radial-gradient(ellipse ' + (0.1 * hR) + 'px ' + (0.12 * hR) + 'px at ' + gx + 'px ' + gy + 'px, rgba(255,244,228,.6), rgba(255,244,228,0) 100%),' +
      'linear-gradient(180deg, rgba(0,0,0,0) ' + (gy + 0.25 * hR) + 'px, rgba(0,0,0,.35) ' + r.height + 'px)';
  }
  return marges;
};

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

// "simo:<pose>" => photo verrouillee de Philippe Simo (personnes/philippe-simo/simo-<pose>.png).
function photoPersonne(photo) {
  const m = /^simo:(.+)$/.exec(photo);
  if (!m) return photo;
  const f = path.join(ICI, 'personnes', 'philippe-simo', `simo-${m[1].replace(/^simo-/, '')}.png`);
  if (!fs.existsSync(f)) throw new Error(`photo de Philippe Simo inconnue : ${photo} (voir personnes/philippe-simo/CATALOGUE.md)`);
  return f;
}

// Raccord personne / fond : etalonnage { luminosite, contraste, saturation, teinte (deg), sepia },
// lumiere_contour : couleur du liseré lumineux (ex "#ffd9a0" pour un coucher de soleil), puis ombres.
function filtrePersonne(p) {
  const e = p.etalonnage ?? {};
  const f = [
    `brightness(${e.luminosite ?? 1})`, `contrast(${e.contraste ?? 1.06})`, `saturate(${e.saturation ?? 1.12})`,
    e.teinte ? `hue-rotate(${e.teinte}deg)` : '', e.sepia ? `sepia(${e.sepia})` : '',
  ];
  if (p.lumiere_contour) f.push(`drop-shadow(0 0 1.5px ${p.lumiere_contour})`, `drop-shadow(0 0 5px ${p.lumiere_contour}aa)`);
  // Ombre douce et naturelle (regle 10) : presente, jamais supprimee.
  f.push('drop-shadow(0 0 14px rgba(0,0,0,.45))', 'drop-shadow(6px 8px 11px rgba(0,0,0,.35))');
  return f.filter(Boolean).join(' ');
}

// Fleche rouge courbe : { de:[x,y], vers:[x,y], courbure: -0.4..0.4 }
function fleche({ de, vers, courbure = 0.3, epaisseur = 10 }) {
  const [x1, y1] = de, [x2, y2] = vers;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  const cx = mx - dy * courbure, cy = my + dx * courbure; // point de controle perpendiculaire
  // tangente en fin de courbe => orientation de la pointe
  const tx = x2 - cx, ty = y2 - cy, n = Math.hypot(tx, ty) || 1, ux = tx / n, uy = ty / n;
  const L = epaisseur * 3.2, l = epaisseur * 2.1;
  const bx = x2 - ux * L, by = y2 - uy * L;
  const pts = `${x2},${y2} ${bx - uy * l},${by + ux * l} ${bx + uy * l},${by - ux * l}`;
  const d = `M${x1},${y1} Q${cx},${cy} ${bx + ux * 4},${by + uy * 4}`;
  return `<svg class="fleche" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <path d="${d}" fill="none" stroke="#fff" stroke-width="${epaisseur + 5}" stroke-linecap="round"/>
  <polygon points="${pts}" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
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
  // Controle mobile : chaque miniature a 320x180 (taille d'affichage sur telephone).
  const petits = fichiers.map((f) => `<img src="${pathToFileURL(f).href}">`).join('');
  await page.setContent(`<style>body{margin:0;padding:12px;background:#0f0f0f;display:flex;flex-wrap:wrap;gap:12px;width:1020px}
    img{width:320px;height:180px;display:block;border-radius:8px}</style>${petits}`);
  await page.waitForLoadState('load');
  await page.screenshot({ path: dest.replace('_planche', '_mobile'), fullPage: true });
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

  // Lecture des pixels du fond (harmonie) depuis des fichiers locaux.
  const navigateur = await chromium.launch({ executablePath: chromiumPath(), args: ['--allow-file-access-from-files'] });
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
      await page.evaluate(() => window.harmoniser());
      const marges = await page.evaluate(() => window.placer());
      await page.evaluate(() => window.ajuster());
      const dest = path.join(sortie, `${v.nom ?? `variante-${i + 1}`}.png`);
      await page.locator('#m').screenshot({ path: dest });
      if (!process.env.GARDER_HTML) fs.unlinkSync(tmp);
      fichiers.push(dest);
      console.log(`${dest}  (air au-dessus de la tete : ${marges.join(', ')} px)`);
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
