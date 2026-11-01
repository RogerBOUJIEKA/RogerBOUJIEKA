// Vibe Motion ad (v2) — built on Roger's real past works. window.seek(t) renders time t and resolves when all frames are decoded.
(() => {
const P = new URLSearchParams(location.search);
const V = P.get('v') === '1';
document.documentElement.className = V ? 'V' : 'H';
const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const TL = window.TL, CL = TL.clips, A = window.ART, CLIPS = window.CLIPS;

// ---------- helpers
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const k = (t, a, d) => cl((t - a) / d);
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  o3: x => 1 - Math.pow(1 - x, 3), o5: x => 1 - Math.pow(1 - x, 5),
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c = 1.9, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
};
function S(el, o) {
  if (!el) return;
  let tr = '';
  if (o.persp) tr += `perspective(${o.persp}px) `;
  tr += `translate(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px)`;
  if (o.rx) tr += ` rotateX(${o.rx}deg)`;
  if (o.ry) tr += ` rotateY(${o.ry}deg)`;
  if (o.r) tr += ` rotate(${o.r}deg)`;
  if (o.s !== undefined) tr += ` scale(${o.s})`;
  el.style.transform = tr;
  if (o.o !== undefined) el.style.opacity = cl(o.o);
  if (o.b !== undefined) el.style.filter = o.b > 0.2 ? `blur(${o.b.toFixed(1)}px)` : 'none';
}
const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const q = (r, s) => r.querySelector(s);
const qa = (r, s) => [...r.querySelectorAll(s)];
function reveal(el, t, at, d = .5) { const p = E.o5(k(t, at, d)); S(el, { y: (1 - p) * 130, o: k(t, at, .12) }); }
function pop(el, t, at, d = .5, extra = {}) { const p = k(t, at, d); S(el, Object.assign({ s: .4 + .6 * E.back(p), o: k(t, at, .12) }, extra)); }
function slam(el, t, at, d = .35) { const p = k(t, at, d); S(el, { s: lerp(2.2, 1, E.o5(p)), o: k(t, at, .08), b: (1 - p) * 18 }); }
const at = (id, f = 0) => CL[id].s + (CL[id].e - CL[id].s) * f;

// ---------- real footage (frame sequences, 30 fps, looped)
let pending = [];
const clip = (id, cls = '', style = '') => `<img class="clip ${cls}" data-clip="${id}" style="${style}" alt="">`;
function setClip(img, lt, id) {
  id = id || img.dataset.clip; const n = CLIPS[id];
  let f = Math.floor(Math.max(0, lt) * 30) % n + 1;
  const src = `frames/${id}/${String(f).padStart(4, '0')}.jpg`;
  if (img.getAttribute('src') !== src) { img.setAttribute('src', src); pending.push(img.decode().catch(() => {})); }
}
const screen = (inner, w, extra = '') => `<div class="screen r16" style="width:${w}px;${extra}">${inner}</div>`;
const still = (src) => `<img src="img/${src}" alt="">`;

// ---------- scenes
const scenesRoot = document.getElementById('scenes');
const SC = {}; TL.scenes.forEach(s => SC[s.id] = s);
const defs = [];
function scene(id, html, upd) {
  const root = h(`<div class="scene" id="sc-${id}">${html}</div>`);
  scenesRoot.appendChild(root);
  defs.push({ id, root, s: SC[id].start, e: SC[id].end, upd });
  return root;
}

// 1. CAPTURE
{
  const w = V ? 900 : 860;
  const r = scene('capture', `
    <div class="txt"><div class="kick line"><span class="in">Une simple</span></div>
      <div class="big shadow"><span class="line"><span class="in">CAPTURE</span></span><span class="line"><span class="in"><span class="hl">D'ÉCRAN…</span></span></span></div></div>
    <div class="vis"><div class="cz" style="position:relative">${screen(still('capture_doctor.jpg'), w)}
      <div class="shot abs" style="inset:-36px;opacity:0">${A.shot()}</div></div></div>`, (t, lt) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .15); reveal(ins[1], lt, .25); reveal(ins[2], lt, .4);
    const p = E.o5(k(lt, 0, .8));
    S(q(r, '.cz'), { persp: 1800, y: (1 - p) * 600, r: (1 - p) * 8, ry: V ? 0 : -14 + lt * 4, rx: V ? 10 - lt * 3 : 4, s: .95 + lt * .03 });
    const sp = k(lt, .8, .35);
    S(q(r, '.shot'), { s: lerp(1.25, 1, E.o5(sp)), o: sp > 0 ? 1 - k(lt, 1.45, .3) : 0 });
    q(r, '.shot svg').style.cssText = 'width:100%;height:100%';
  });
}
// 2. AFFICHE
{
  const w = V ? 900 : 860;
  const r = scene('affiche', `
    <div class="txt"><div class="big shadow"><span class="line"><span class="in">UNE</span></span><span class="line"><span class="in"><span class="hlb">AFFICHE.</span></span></span></div></div>
    <div class="vis"><div class="pz">${screen(still('affiche_cabrel.jpg'), w)}</div></div>`, (t, lt) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .02, .35); reveal(ins[1], lt, .1, .35);
    const p = k(lt, 0, .3);
    const shake = lt > .3 && lt < .55 ? Math.sin(lt * 90) * 8 * (1 - k(lt, .3, .25)) : 0;
    S(q(r, '.pz'), { s: lerp(1.6, 1, E.o5(p)) + lt * .03, r: lerp(-10, -3, E.o5(p)), o: k(lt, 0, .1), x: shake, y: shake * .6, b: (1 - p) * 10 });
  });
}
// 3. LIEN
{
  const bw = V ? 960 : 900;
  const r = scene('lien', `
    <div class="txt"><div class="kick line"><span class="in">Ou juste</span></div>
      <div class="big shadow"><span class="line"><span class="in">LE LIEN</span></span><span class="line"><span class="in"><span class="hl">D'UN SITE.</span></span></span></div></div>
    <div class="vis"><div class="bz" style="position:relative">
      <div class="browser" style="width:${bw}px;font-size:${bw / 52}px">
        <div class="bar"><i class="dot" style="background:#ff5f57"></i><i class="dot" style="background:#febc2e"></i><i class="dot" style="background:#28c840"></i>
          <div class="url"><span style="opacity:.45;margin-right:.4em">🔒</span><span class="typed"></span><span class="caret"></span></div></div>
        <div class="page" style="aspect-ratio:16/9">${still('site_agapeo.jpg').replace('alt', 'class="full" alt')}</div></div>
      <div class="cursor">${A.cursor()}</div></div></div>`, (t, lt) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .1); reveal(ins[1], lt, .2); reveal(ins[2], lt, .35);
    const url = 'agapeo.love'; const n = Math.floor(cl((lt - .25) / .6) * url.length);
    q(r, '.typed').textContent = url.slice(0, n);
    q(r, '.caret').style.opacity = (Math.floor(lt * 4) % 2 || n < url.length) ? 1 : 0;
    const p = E.o5(k(lt, 0, .6));
    S(q(r, '.bz'), { persp: 1800, x: V ? 0 : (1 - p) * 300, y: V ? (1 - p) * 400 : 0, ry: V ? 0 : -10 + lt * 3, rx: V ? 8 - lt * 2 : 0, o: p, s: .96 + lt * .02 });
    const pg = k(lt, .95, .4);
    S(q(r, '.page'), { o: .1 + .9 * E.o3(pg), y: (1 - E.o3(pg)) * 30 });
    const cp = E.io(k(lt, .2, .7));
    S(q(r, '.cursor'), { x: lerp(bw * .9, bw * .4, cp), y: lerp(bw * .5, bw * .03, cp), s: lt > .9 && lt < 1.05 ? .85 : 1, o: k(lt, .2, .1) });
  });
}
// 4. PROMPT
{
  const promptTxt = 'Transforme ces visuels en spot publicitaire animé de 15 secondes. Style premium, rythme dynamique, texte percutant.';
  const thumbs = [['capture_doctor.jpg', 'capture.png'], ['affiche_cabrel.jpg', 'affiche.jpg'], ['site_agapeo.jpg', 'agapeo.love']];
  const r = scene('prompt', `
    <div class="txt"><div class="kick line"><span class="in">Quelques instructions à</span></div>
      <div class="big shadow" style="font-size:${V ? 150 : 170}px"><span class="line"><span class="in">L'<span class="hl">IA</span></span></span></div></div>
    <div class="vis"><div class="prompt">
      <div class="ph"><div class="ai">${A.spark()}</div>Assistant IA · Motion</div>
      <div class="att">${thumbs.map(([s, l]) => `<div><img src="img/${s}" class="full" alt=""><small>${l}</small></div>`).join('')}</div>
      <div class="inp"><span class="pt"></span><span class="caret"></span></div>
      <div class="foot"><span class="gen">Prêt</span><div class="prog"><i></i></div><div class="send">↑</div></div>
    </div></div>`, (t, lt, d) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .1); reveal(ins[1], lt, .2);
    const p = E.o5(k(lt, 0, .6));
    S(q(r, '.prompt'), { persp: 1800, y: (1 - p) * 300, rx: (1 - p) * 20, o: p, s: 1 + lt * .012 });
    qa(r, '.att>div').forEach((e, i) => pop(e, lt, .25 + i * .1, .45));
    const n = Math.floor(cl((lt - .5) / 1.5) * promptTxt.length);
    q(r, '.pt').textContent = promptTxt.slice(0, n);
    q(r, '.caret').style.opacity = (n < promptTxt.length || Math.floor(lt * 4) % 2) ? 1 : 0;
    const sp = k(lt, 2.05, .15);
    S(q(r, '.send'), { s: sp > 0 && sp < 1 ? .85 : 1 });
    const g = k(lt, 2.15, d - 2.35);
    q(r, '.prog i').style.width = (E.io(g) * 100) + '%';
    q(r, '.gen').textContent = g <= 0 ? 'Prêt' : g < 1 ? `Génération du spot… ${Math.floor(g * 100)}%` : 'Spot prêt ✓';
  });
}
// 5. PUB ANIMÉE — rapid real-footage montage
{
  const seq = ['cabrel_a', 'camair_a', 'volta', 'mboa', 'doctor_a', 'kwiva', 'agapeo_b', 'snapia', 'cabrel_c', 'camair_b'];
  const r = scene('pub', `
    ${clip(seq[0], 'full mont')}
    <div class="abs" style="inset:0;background:radial-gradient(ellipse at center,rgba(6,10,40,.78) 0%,rgba(6,10,40,.55) 50%,rgba(6,10,40,.25) 100%)"></div>
    <div class="abs center" style="inset:0;flex-direction:column;text-align:center">
      <div class="big shadow" style="font-size:${V ? 140 : 170}px"><div class="w1">UNE PUB</div><div class="w2" style="margin-top:12px"><span class="hl">ANIMÉE</span></div></div>
      <div class="w3 mid shadow" style="margin-top:40px;font-size:${V ? 64 : 72}px;letter-spacing:.06em">PROFESSIONNELLE.</div>
    </div>`, (t, lt) => {
    const step = .42, i = Math.floor(lt / step) % seq.length;
    const img = q(r, '.mont'); setClip(img, lt % step + .6, seq[i]);
    S(img, { s: 1.08 - (lt % step) * .12 });
    const aw = at('c05', .62);
    slam(q(r, '.w1'), t, SC.pub.start + .05);
    slam(q(r, '.w2'), t, aw);
    const p3 = k(t, CL.c05b.s - .05, .5);
    S(q(r, '.w3'), { o: p3, y: (1 - E.o5(p3)) * 40 });
    q(r, '.w3').style.letterSpacing = lerp(.4, .06, E.o5(p3)) + 'em';
    const sh = (x, a) => x > a && x < a + .3 ? Math.sin((x - a) * 80) * 14 * (1 - (x - a) / .3) : 0;
    const s = sh(t, SC.pub.start + .05) + sh(t, aw);
    q(r, '.center').style.transform = `translate(${s}px,${s * .5}px)`;
  });
}
// 6-7. SHOWCASE (big screen + label + brand chip)
function showcase(id, clipId, label, brand) {
  const cw = V ? 980 : 1360;
  const cx = (W - cw) / 2, cy = V ? 560 : 230;
  const r = scene(id, `
    <div class="slabel"><div class="mid shadow" style="font-size:${V ? 76 : 80}px"><span class="line" style="display:inline-block"><span class="in">${label}</span></span></div></div>
    <div class="sp abs" style="left:${cx}px;top:${cy}px">${screen(clip(clipId, 'full'), cw)}
      <div class="chip" style="left:30px;bottom:-26px"><span class="dot"></span>${brand}</div></div>`, (t, lt) => {
    reveal(q(r, '.in'), lt, .05, .45);
    const pc = k(lt, .1, .6);
    S(q(r, '.sp'), { persp: 2200, s: lerp(.7, 1, E.o5(pc)) * (1 + lt * .015), o: k(lt, .1, .15), rx: (1 - E.o5(pc)) * 25 + (V ? 0 : 3), ry: V ? 0 : Math.sin(lt * .8) * 2.5, b: (1 - pc) * 8 });
    pop(q(r, '.chip'), lt, .55, .45);
    setClip(q(r, '.clip'), lt);
  });
}
showcase('spectacle', 'cabrel_a', 'SPOT <span class="hl">SPECTACLE</span>', 'Cabrel Tindo · Humour gospel');
showcase('aerien', 'camair_a', 'SPOT <span class="hl">' + (V ? 'AÉRIEN' : 'COMPAGNIE AÉRIENNE') + '</span>', 'Camair-Co · Spot 1 min 28');
// 8. APPS — appli / boutique / lancement produit
{
  const items = [['doctor_a', 'APPLI MOBILE', 'Doctor Brain', 'c08a'], ['mboa', 'E-COMMERCE', 'Mboa Market', 'c08b'], ['volta', 'LANCEMENT PRODUIT', 'Volta · Énergie pure', 'c08c']];
  const cw = V ? 840 : 580;
  const pos = V ? [[120, 300], [120, 820], [120, 1340]] : [[60, 380], [670, 380], [1280, 380]];
  const r = scene('apps', items.map(([c, l, b], i) => `
    <div class="gc abs" style="left:${pos[i][0]}px;top:${pos[i][1]}px">${screen(clip(c, 'full'), cw)}
      <div class="btag" style="left:24px;top:-26px;z-index:30;background:#ff6a1a;color:#fff">${l}</div>
      <div class="chip" style="right:20px;bottom:-24px;font-size:22px">${b}</div></div>`).join(''), (t, lt) => {
    qa(r, '.gc').forEach((e, i) => {
      const a = CL[items[i][3]].s - .12, p = k(t, a, .5);
      const next = i < 2 ? CL[items[i + 1][3]].s - .12 : 1e9;
      const act = t >= a && t < next ? 1 : 0;
      S(e, { persp: 1600, s: lerp(.5, 1, E.o5(p)) * (act ? 1.06 : .97), y: (1 - E.o5(p)) * 160, rx: (1 - E.o5(p)) * 30, o: k(t, a, .12) * (act || t < a ? 1 : .75) });
      e.style.zIndex = act ? 5 : 1;
      setClip(q(e, '.clip'), t - a);
      pop(q(e, '.chip'), t, a + .35, .4);
    });
  });
}
// 9. GRID — n'importe quel service
const all = ['cabrel_a', 'camair_a', 'doctor_a', 'mboa', 'volta', 'kwiva', 'snapia', 'agapeo_b', 'bovann', 'camair_b', 'cabrel_b', 'agapeo_a', 'doctor_b', 'cabrel_c', 'camair_c'];
function wall(cls, cols, rows, tw, shift) {
  let s = `<div class="${cls} abs" style="left:50%;top:50%;width:${cols * (tw + 36)}px;height:${rows * (tw * .5625 + 36)}px;margin-left:${-cols * (tw + 36) / 2}px;margin-top:${-rows * (tw * .5625 + 36) / 2}px;transform-style:preserve-3d">`;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const c = all[(x + y * 3 + shift) % all.length];
    s += `<div class="abs" style="left:${x * (tw + 36) + (y % 2) * tw / 2}px;top:${y * (tw * .5625 + 36)}px">${screen(clip(c, 'full'), tw)}</div>`;
  }
  return s + '</div>';
}
{
  const pills = ['Restaurant', 'Immobilier', 'Location auto', 'Hôtel', 'Salon de beauté', 'Clinique', 'Événementiel', 'Église', 'École', 'Boutique'];
  const r = scene('grid', `
    <div class="abs" style="inset:0;perspective:1500px">${wall('wl', 5, 5, 560, 0)}</div>
    <div class="dim abs" style="inset:0;background:radial-gradient(ellipse at center,rgba(5,8,32,.88) 0%,rgba(5,8,32,.6) 55%,rgba(5,8,32,.25) 100%)"></div>
    ${pills.map(p => `<div class="tagp">${p}</div>`).join('')}
    <div class="abs center" style="inset:0;flex-direction:column;text-align:center"><div class="big shadow" style="font-size:${V ? 108 : 140}px"><div class="g1">N'IMPORTE</div><div class="g2">QUEL <span class="hl">SERVICE.</span></div></div></div>`, (t, lt, d) => {
    const p = E.io(k(lt, 0, d));
    q(r, '.wl').style.transform = `rotateX(28deg) rotateZ(-12deg) translate(${lerp(-60, 60, p)}px,${lerp(120, -120, p)}px) scale(${lerp(1.35, 1.1, p)})`;
    qa(r, '.wl .clip').forEach((im, i) => setClip(im, lt + i * .37));
    const tb = at('c09', .62);
    slam(q(r, '.g1'), t, tb); slam(q(r, '.g2'), t, tb + .22);
    qa(r, '.tagp').forEach((e, i) => {
      const a = i / pills.length * Math.PI * 2 + .3, rx = V ? 400 : 760, ry = V ? 640 : 380;
      const pi = E.o5(k(t, SC.grid.start + .2 + i * .13, .6));
      const x = W / 2 + Math.cos(a) * rx * lerp(.3, 1, pi) - 110, y = H / 2 + Math.sin(a) * ry * lerp(.3, 1, pi) - 30 + Math.sin(t * 2 + i) * 8;
      e.style.left = '0'; e.style.top = '0';
      S(e, { x, y, o: k(t, SC.grid.start + .2 + i * .13, .2) * .95, s: .6 + .4 * pi });
    });
  });
}
// 10. MOI — Roger
const rogerImg = (hgt, extra = '') => `<img class="roger" src="img/roger.webp" style="height:${hgt}px;${extra}" alt="">`;
{
  const rh = V ? 1050 : 1000;
  const r = scene('moi', `
    <div class="abs" style="inset:0;perspective:1600px;opacity:.55">${wall('wl2', 5, 5, 520, 4)}</div>
    <div class="abs" style="inset:0;background:linear-gradient(${V ? '180deg' : '90deg'},rgba(6,10,40,.92) 0%,rgba(6,10,40,.7) 45%,rgba(6,10,40,.2) 100%)"></div>
    <div class="halo" style="${V ? 'left:90px;top:900px;width:900px;height:900px' : 'left:1050px;top:120px;width:900px;height:900px'}"></div>
    <div class="rg abs" style="${V ? `left:${(W - rh) / 2}px;bottom:0` : 'right:40px;bottom:0'}">${rogerImg(rh)}</div>
    <div class="abs" style="${V ? 'left:60px;right:60px;top:180px;text-align:center' : 'left:150px;top:0;bottom:0;width:900px;display:flex;flex-direction:column;justify-content:center'}">
      <div class="kick line" style="font-size:54px"><span class="in">Tout ça,</span></div>
      <div class="big shadow" style="font-size:${V ? 104 : 124}px"><span class="line"><span class="in">JE L'AI RÉALISÉ</span></span><span class="line"><span class="in"><span class="hl">MOI-MÊME.</span></span></span></div>
      <div class="nm" style="margin-top:30px;display:inline-flex;align-items:center;gap:16px;font-family:Inter;font-weight:700;font-size:30px"><span style="width:14px;height:14px;border-radius:50%;background:#35e07a"></span>Roger Boujieka · Motion designer IA</div>
    </div>`, (t, lt, d) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .15); reveal(ins[1], lt, .3); reveal(ins[2], t, at('c10a', .6));
    const p = E.io(k(lt, 0, d));
    q(r, '.wl2').style.transform = `rotateX(22deg) rotateZ(8deg) scale(${lerp(1.3, 1.05, p)})`;
    qa(r, '.wl2 .clip').forEach((im, i) => setClip(im, lt + i * .41));
    const pr = E.o5(k(lt, .1, .8));
    S(q(r, '.rg'), { y: (1 - pr) * 300, o: k(lt, .1, .2), s: 1 + lt * .015 });
    S(q(r, '.halo'), { s: .8 + .2 * pr + .03 * Math.sin(lt * 2), o: pr });
    pop(q(r, '.nm'), lt, .9, .5);
  });
}
// 11. SANS
{
  const items = [['camera', 'CAMÉRA', 'c10b'], ['clap', 'TOURNAGE', 'c10c'], ['team', 'ÉQUIPE', 'c10d']];
  const r = scene('sans', `
    <div class="abs center" style="inset:0;flex-direction:column"><div>
    ${items.map(([ic, w]) => `<div class="sansrow"><div class="ic">${A[ic]()}<i class="x"></i></div><div class="mid shadow" style="font-size:${V ? 84 : 104}px">SANS <span class="gtxt">${w}</span></div></div>`).join('')}
    </div></div>`, (t) => {
    qa(r, '.sansrow').forEach((e, i) => {
      const a = CL[items[i][2]].s - .08; const p = k(t, a, .45);
      S(e, { x: (1 - E.o5(p)) * -160, o: k(t, a, .12), b: (1 - p) * 8 });
      q(e, '.x').style.transform = `rotate(-45deg) scaleX(${E.o3(k(t, a + .3, .3))})`;
    });
  });
}
// 12. TOI AUSSI
{
  const r = scene('toi', `
    <div class="warp abs" style="inset:0">${Array.from({ length: 44 }, () => '<i style="position:absolute;left:50%;top:50%;height:4px;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,0),#ffd2a0)"></i>').join('')}</div>
    <div class="abs center" style="inset:0;flex-direction:column;text-align:center"><div class="zz">
      <div class="mid line" style="font-size:${V ? 80 : 96}px"><span class="in">ET TOI AUSSI,</span></div>
      <div class="big shadow" style="font-size:${V ? 116 : 150}px"><span class="line"><span class="in">TU PEUX LE</span></span><span class="line"><span class="in"><span class="hl" style="font-size:1.25em">FAIRE.</span></span></span></div></div></div>`, (t, lt, d) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .1); reveal(ins[1], t, at('c11', .45)); reveal(ins[2], t, at('c11', .75));
    S(q(r, '.zz'), { s: 1 + lt * .06 });
    qa(r, '.warp i').forEach((e, i) => {
      const a = i * 2.39996, sp = ((lt * (.5 + (i % 7) * .08) + i * .173) % 1);
      e.style.width = (40 + sp * 260) + 'px';
      e.style.transform = `rotate(${a}rad) translateX(${sp * Math.max(W, H) * .8}px)`;
      e.style.opacity = (Math.sin(sp * Math.PI) * k(lt, 0, d)).toFixed(2);
    });
  });
}
// 13. MASTERCLASS VIBE MOTION
const bullets = ['Pas à pas, dans les moindres détails', 'Capture, affiche, lien → spot pub', 'De zéro à tes premiers clients'];
const bulletsHTML = (fs) => bullets.map(b => `<div class="bl" style="display:flex;align-items:center;gap:16px;font-family:Inter;font-weight:700;font-size:${fs}px;margin:12px 0"><span style="width:44px;height:44px;border-radius:50%;background:#35e07a;display:flex;align-items:center;justify-content:center;flex:none"><span style="width:26px;height:26px">${A.check()}</span></span>${b}</div>`).join('');
const titleHTML = (fsz, center) => `<div class="kick ktag" style="color:#ffb020;font-weight:800;letter-spacing:.25em;font-size:30px">MASTERCLASS</div>
  <div class="big shadow" style="font-size:${fsz}px;line-height:.92"><div class="t-a">VIBE</div><div class="t-b gtxt">MOTION</div></div>
  <div class="sub2" style="font-family:Inter;font-weight:600;font-size:30px;opacity:.85;margin-top:16px">Montage vidéo &amp; motion design avec l'IA</div>`;
{
  const rh = V ? 860 : 980;
  const html = V ? `
    <div class="halo" style="left:140px;top:560px;width:800px;height:800px"></div>
    <div class="rg abs" style="left:${(W - rh) / 2}px;top:520px">${rogerImg(rh)}</div>
    <div class="fl1 abs" style="left:40px;top:640px">${screen(clip('cabrel_a', 'full'), 360)}</div>
    <div class="fl2 abs" style="right:40px;top:1000px">${screen(clip('camair_a', 'full'), 360)}</div>
    <div class="abs" style="left:60px;right:60px;top:150px;text-align:center;display:flex;flex-direction:column;align-items:center">${titleHTML(150)}</div>
    <div class="abs glass" style="left:70px;right:70px;top:1400px;border-radius:30px;padding:26px 36px">${bulletsHTML(34)}</div>`
    : `<div class="halo" style="left:1060px;top:80px;width:900px;height:900px"></div>
    <div class="rg abs" style="left:1000px;bottom:0">${rogerImg(rh)}</div>
    <div class="fl1 abs" style="left:1560px;top:700px">${screen(clip('cabrel_a', 'full'), 360)}</div>
    <div class="fl2 abs" style="left:880px;top:640px">${screen(clip('camair_a', 'full'), 340)}</div>
    <div class="txt" style="width:820px">${titleHTML(170)}<div style="margin-top:30px">${bulletsHTML(34)}</div></div>`;
  const r = scene('masterclass', html, (t, lt) => {
    pop(q(r, '.ktag'), lt, 0, .4);
    slam(q(r, '.t-a'), lt, .05); slam(q(r, '.t-b'), lt, .2);
    const s2 = k(lt, .5, .5); S(q(r, '.sub2'), { o: s2, y: (1 - E.o5(s2)) * 20 });
    const pr = E.o5(k(lt, .2, .8));
    S(q(r, '.rg'), { y: (1 - pr) * 300, o: k(lt, .2, .2), s: 1 + lt * .012 });
    S(q(r, '.halo'), { s: .8 + .2 * pr + .03 * Math.sin(lt * 2), o: pr });
    [['.fl1', .7, -6], ['.fl2', .9, 5]].forEach(([c, a, rr]) => { const p = k(lt, a, .5); S(q(r, c), { s: .5 + .5 * E.back(p), o: k(lt, a, .1), r: rr, y: Math.sin(lt * 1.5 + a * 4) * 12 }); setClip(q(r, c + ' .clip'), lt); });
    qa(r, '.bl').forEach((e, i) => { const p = k(lt, 1.0 + i * .35, .5); S(e, { x: (1 - E.o5(p)) * -80, o: p }); });
  });
}
// 14. MODULES — capture / affiche / lien → spot
{
  const rows = [['capture_doctor.jpg', 'doctor_a', "Une capture d'écran", at('c13a', .3)], ['affiche_cabrel.jpg', 'cabrel_a', 'Une affiche', at('c13a', .5)], ['site_agapeo.jpg', 'agapeo_b', 'Un simple lien', at('c13a', .72)]];
  const tw = V ? 300 : 300;
  const r = scene('modules', `
    <div class="abs" style="left:0;right:0;top:${V ? 230 : 60}px;text-align:center">
      <div class="kick line" style="color:#ffb020;font-weight:800;letter-spacing:.2em;font-size:30px"><span class="in">DANS LA MASTERCLASS</span></div>
      <div class="mid shadow" style="font-size:${V ? 64 : 76}px"><span class="line"><span class="in">TU APPRENDS À <span class="hl">TRANSFORMER</span></span></span></div></div>
    <div class="abs" style="left:${V ? 60 : 260}px;right:${V ? 60 : 260}px;top:${V ? 470 : 250}px">
    ${rows.map(([s, c, l]) => `<div class="mrow" style="padding:16px 22px;gap:24px;font-size:${V ? 30 : 36}px">
      <div class="screen r16" style="width:${tw}px;flex:none">${still(s).replace('alt', 'class="full" alt')}</div>
      <span class="ar" style="font-size:54px">→</span>
      <div class="screen r16" style="width:${tw}px;flex:none">${clip(c, 'full')}</div>
      <div style="display:flex;flex-direction:column;gap:6px">${V ? '' : `<span>${l}</span><span style="color:#ffd27a">→ un spot pub animé</span>`}</div>
      <div class="ok">${A.check()}</div></div>`).join('')}
    </div>
    <div class="stamp abs" style="${V ? 'left:0;right:0;top:1460px' : 'right:60px;bottom:30px'};text-align:center"><div class="big" style="display:inline-block;font-size:${V ? 150 : 110}px;transform:rotate(-8deg)"><span class="hl" style="padding:.06em .25em">DE A À Z</span></div></div>`, (t, lt) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .05); reveal(ins[1], lt, .15);
    qa(r, '.mrow').forEach((e, i) => {
      const a = rows[i][3] - .15, p = k(t, a, .5);
      S(e, { x: (1 - E.o5(p)) * 220, o: k(t, a, .15), b: (1 - p) * 6 });
      setClip(q(e, '.clip'), t - a);
      pop(q(e, '.ok'), t, a + .35, .4);
    });
    slam(q(r, '.stamp'), t, CL.c13b.s - .05, .3);
  });
}
// 15. CTA
{
  const rh = V ? 820 : 1000;
  const r = scene('cta', `
    <div class="halo" style="${V ? 'left:140px;top:120px;width:800px;height:800px' : 'left:-40px;top:80px;width:900px;height:900px'}"></div>
    <div class="rg abs" style="${V ? `left:${(W - rh) / 2}px;top:100px` : 'left:-20px;bottom:0'}">${rogerImg(rh)}</div>
    <div class="abs center" style="${V ? 'left:0;right:0;top:900px;bottom:120px' : 'left:820px;right:40px;top:0;bottom:0'};flex-direction:column;text-align:center">
      ${titleHTML(V ? 150 : 160)}
      <div class="bwrap" style="position:relative;margin-top:${V ? 60 : 50}px"><div class="btn">J'accède à la masterclass <span style="font-size:1.1em">→</span></div>
        <div class="promo" style="right:-70px;top:-58px">PROMO EN COURS</div><div class="ripple"></div></div>
      <div class="cap" style="margin-top:34px;font-family:Inter;font-weight:600;font-size:${V ? 32 : 30}px;opacity:.9">Clique sur le lien · rogerboujieka.com</div>
      <img src="img/logo_boujieka_agency.png" class="lg" style="height:56px;margin-top:34px;opacity:.9" alt="">
    </div>
    <div class="cursor" style="left:0;top:0">${A.cursor()}</div>`, (t, lt) => {
    pop(q(r, '.ktag'), lt, 0, .4);
    slam(q(r, '.t-a'), lt, .05); slam(q(r, '.t-b'), lt, .2);
    const s2 = k(lt, .4, .5); S(q(r, '.sub2'), { o: s2, y: (1 - E.o5(s2)) * 20 });
    const pr = E.o5(k(lt, 0, .8));
    S(q(r, '.rg'), { y: (1 - pr) * 200, o: k(lt, 0, .2), s: 1 + lt * .01 });
    S(q(r, '.halo'), { s: .85 + .15 * pr + .03 * Math.sin(lt * 2), o: pr });
    const bwp = q(r, '.bwrap'), click = 1.75;
    const press = lt > click && lt < click + .15 ? .93 : 1;
    pop(bwp, lt, .6, .6); if (lt > 1.2) S(bwp, { s: press * (1 + .025 * Math.sin((lt - 1.2) * 6)) });
    pop(q(r, '.promo'), lt, .95, .5, { r: -8 });
    if (lt > 1.5) S(q(r, '.promo'), { r: -8, s: 1 + .06 * Math.abs(Math.sin(lt * 3.2)) });
    const cp = k(lt, 1.6, .6); S(q(r, '.cap'), { o: cp, y: (1 - E.o5(cp)) * 20 });
    S(q(r, '.lg'), { o: .9 * k(lt, 2.0, .5) });
    const br = bwp.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
    const bx = br.left - st.left + br.width * .62, by = br.top - st.top + br.height * .55;
    const mp = E.io(k(lt, .9, .8));
    S(q(r, '.cursor'), { x: lerp(W + 50, bx, mp), y: lerp(H * .9, by, mp), o: k(lt, .9, .1), s: lt > click && lt < click + .15 ? .82 : 1 });
    const rp = k(lt, click, .6), rip = q(r, '.ripple');
    rip.style.left = (br.width * .62 - 20) + 'px'; rip.style.top = (br.height * .55 - 20) + 'px';
    S(rip, { s: 1 + rp * 9, o: rp > 0 && rp < 1 ? 1 - rp : 0 });
  });
}

// ---------- background + transitions
const bg = { b1: q(document, '.b1'), b2: q(document, '.b2'), b3: q(document, '.b3'), or: document.getElementById('bgOrange'), grid: q(document, '.grid-lines') };
const streak = document.getElementById('streak'), flash = document.getElementById('flash');
function background(t) {
  S(bg.b1, { x: (V ? -500 : -300) + Math.sin(t * .23) * 200, y: (V ? 1100 : 300) + Math.cos(t * .19) * 160 });
  S(bg.b2, { x: (V ? 300 : 1100) + Math.cos(t * .21) * 220, y: (V ? -300 : -400) + Math.sin(t * .17) * 160 });
  S(bg.b3, { x: (V ? 100 : 500) + Math.sin(t * .31) * 260, y: (V ? 700 : 400) + Math.sin(t * .27) * 200, o: .35 + .25 * Math.sin(t * .5) });
  const a = SC.affiche; bg.or.style.opacity = k(t, a.start - .05, .1) * (1 - k(t, a.end - .1, .2));
  S(bg.grid, { x: -(t * 20) % 80, y: -(t * 12) % 80 });
  let st = 0, sx = -600;
  for (const s of TL.scenes) { const p = (t - (s.start - .15)) / .4; if (p > 0 && p < 1 && s.start > 0) { st = Math.sin(p * Math.PI); sx = lerp(-500, W + 300, p); } }
  streak.style.opacity = st * .9; streak.style.transform = `translateX(${sx}px) rotate(18deg)`;
  let f = 0;
  for (const id of ['pub', 'masterclass']) { const d = t - SC[id].start; if (d > -.06 && d < .35) f = Math.max(f, d < 0 ? (d + .06) / .06 : 1 - d / .35); }
  if (t < .25) f = Math.max(f, 1 - t / .25);
  flash.style.opacity = f * .85;
}
window.seek = function (t) {
  pending = [];
  background(t);
  for (const d of defs) {
    const on = t >= d.s && t < d.e;
    d.root.style.display = on ? 'block' : 'none';
    if (!on) continue;
    const lt = t - d.s, dur = d.e - d.s;
    const pin = d.s === 0 ? 1 : k(lt, 0, .3), pout = k(t, d.e - .2, .2);
    const sc = (1.07 - .07 * E.o3(pin)) * (1 - .05 * E.o3(pout)) * (1 + .025 * lt / dur);
    S(d.root, { s: sc, o: Math.min(1, pin * 2.5) * (1 - pout), b: (1 - pin) * 10 + pout * 10 });
    d.upd(t, lt, dur);
  }
  return Promise.all(pending);
};
window.DURATION = TL.duration;
window.READY = document.fonts.ready.then(async () => { await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); await window.seek(0); return true; });
})();
