// Motion design ad — deterministic, frame-accurate timeline. window.seek(t) renders time t.
(() => {
const P = new URLSearchParams(location.search);
const V = P.get('v') === '1';
document.documentElement.className = V ? 'V' : 'H';
const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const TL = window.TL, CL = TL.clips;
const A = window.ART;

// ---------- helpers
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const k = (t, a, d) => cl((t - a) / d);
const E = {
  o3: x => 1 - Math.pow(1 - x, 3),
  o5: x => 1 - Math.pow(1 - x, 5),
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c = 1.9, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  el: x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * 2 * Math.PI / 3) + 1,
};
const lerp = (a, b, p) => a + (b - a) * p;
function S(el, o) {
  if (!el) return;
  let tr = '';
  if (o.persp) tr += `perspective(${o.persp}px) `;
  tr += `translate(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px)`;
  if (o.rx) tr += ` rotateX(${o.rx}deg)`;
  if (o.ry) tr += ` rotateY(${o.ry}deg)`;
  if (o.r) tr += ` rotate(${o.r}deg)`;
  if (o.s !== undefined) tr += ` scale(${o.s})`;
  if (o.sx !== undefined) tr += ` scaleX(${o.sx})`;
  el.style.transform = tr;
  if (o.o !== undefined) el.style.opacity = cl(o.o);
  if (o.b !== undefined) el.style.filter = o.b > 0.2 ? `blur(${o.b.toFixed(1)}px)` : 'none';
}
const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const q = (r, s) => r.querySelector(s);
const qa = (r, s) => [...r.querySelectorAll(s)];
// slide-up text reveal for .line > .in
function reveal(el, t, at, d = .5) { const p = E.o5(k(t, at, d)); S(el, { y: (1 - p) * 130, o: k(t, at, .12) }); }
function pop(el, t, at, d = .5, extra = {}) { const p = k(t, at, d); S(el, Object.assign({ s: .4 + .6 * E.back(p), o: k(t, at, .12) }, extra)); }
function slam(el, t, at, d = .35) { const p = k(t, at, d); S(el, { s: lerp(2.2, 1, E.o5(p)), o: k(t, at, .08), b: (1 - p) * 18 }); }
const mid = (id) => (CL[id].s + CL[id].e) / 2;

// ---------- spot (mini ad) factory
const ui = (len) => `<div class="rec"><i></i>PUB · ${len}s</div><div class="ui"><span class="tc">0:00</span><div class="pb"><i></i></div><span>HD</span></div>`;
function phoneScreen(kind) {
  if (kind === 'pay') return `
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,#0b1240,#132a8a);color:#fff;padding:18% 8% 0;font-family:Inter">
   <div style="font-size:.8em;opacity:.6">Solde disponible</div>
   <div style="font-family:'Inter Display';font-weight:900;font-size:2.2em;margin:.1em 0 .4em">125 000 F</div>
   <div style="display:flex;gap:6%;align-items:flex-end;height:22%">${[40,65,50,85,60,95,75].map((v,i)=>`<i style="flex:1;height:${v}%;border-radius:.3em;background:${i==5?'#ff6a1a':'rgba(255,255,255,.25)'}"></i>`).join('')}</div>
   <div style="display:flex;gap:6%;margin-top:10%"><b style="flex:1;text-align:center;background:#ff6a1a;border-radius:.8em;padding:.6em 0;font-size:.85em">Envoyer</b><b style="flex:1;text-align:center;background:rgba(255,255,255,.15);border-radius:.8em;padding:.6em 0;font-size:.85em">Recevoir</b></div>
   ${['Mama Ngo · +15 000','Facture eau · −8 500','Ventes · +42 000'].map(x=>`<div style="margin-top:7%;font-size:.75em;display:flex;justify-content:space-between;opacity:.85"><span>${x.split(' · ')[0]}</span><b>${x.split(' · ')[1]}</b></div>`).join('')}
  </div>`;
  if (kind === 'moveo') return `
  <div style="position:absolute;inset:0;background:#f3f5fb;padding:18% 7% 0;font-family:Inter;color:#111">
   <div style="font-family:'Inter Display';font-weight:900;font-size:1.4em;letter-spacing:.06em">MOVEO</div>
   <div style="font-size:.7em;opacity:.5">Location de voitures · Douala</div>
   <div style="margin-top:8%;border-radius:1em;background:linear-gradient(180deg,#1d3fb0,#2f6bff);height:26%;position:relative;overflow:hidden"><div style="position:absolute;width:96%;left:2%;bottom:6%">${A.car('mv')}</div></div>
   <div style="margin-top:6%;font-weight:800">Berline confort</div>
   <div style="font-size:.75em;opacity:.55">Climatisée · 5 places · Auto</div>
   <div style="margin-top:6%;display:flex;justify-content:space-between;align-items:center"><b style="color:#e8340f">25 000 F/j</b><b style="background:#111;color:#fff;border-radius:99px;padding:.4em 1em;font-size:.8em">Réserver</b></div>
   <div style="margin-top:8%;height:12%;border-radius:1em;background:#e4e8f3"></div>
  </div>`;
  // restaurant app
  return `<div class="app">
    <div class="top"><div><div class="loc">Douala · Akwa</div><div class="name">Braise &amp; Co</div></div><div class="av"></div></div>
    <div class="hero"><span style="font-size:.7em;opacity:.85">Menu du jour</span><b>SMASH<br>BURGER</b><span class="tag">−20 %</span>${A.burger('ap')}</div>
    <div class="chips"><span class="on">Burgers</span><span>Grillades</span><span>Boissons</span></div>
    <div class="row"><i style="background:linear-gradient(135deg,#ffb020,#ff6a1a)"></i><div><b>Smash Burger</b><small>Double steak, cheddar</small></div><em>3 500 F</em></div>
    <div class="row"><i style="background:linear-gradient(135deg,#ff6a1a,#c2310e)"></i><div><b>Poulet DG</b><small>Plantains, légumes</small></div><em>5 000 F</em></div>
    <div class="row"><i style="background:linear-gradient(135deg,#4fbf3a,#1f7a2a)"></i><div><b>Ndolé royal</b><small>Crevettes, miondo</small></div><em>4 500 F</em></div>
  </div>`;
}
const phone = (w, kind, wcss, fcss) => `<div class="phone" style="width:${wcss || w + 'px'};font-size:${fcss || w / 22 + 'px'}"><div class="scr">${phoneScreen(kind)}</div><div class="notch"></div></div>`;
const poster = (w) => `<div class="poster" style="width:${w}px;font-size:${w / 15}px">
  <div class="pk">BRAISE &amp; CO</div><div class="pt">Week-end<br><span>gourmand</span></div>
  <div class="pp"><b>−30%</b>sur tout</div>${A.burger('po' + w)}
  <div class="pf"><span>Sam. &amp; Dim.</span><span>Akwa · Douala</span></div></div>`;
const browser = (w, typed = 'kasaprestige.cm') => `<div class="browser" style="width:${w}px;font-size:${w / 52}px">
  <div class="bar"><i class="dot" style="background:#ff5f57"></i><i class="dot" style="background:#febc2e"></i><i class="dot" style="background:#28c840"></i>
   <div class="url"><span style="opacity:.45;margin-right:.4em">🔒</span><span class="typed">${typed}</span><span class="caret"></span></div></div>
  <div class="page"><div class="site-nav"><b>KASA PRESTIGE</b><div><span>Acheter</span><span>Louer</span><span>Contact</span></div></div>
   <div class="site-hero"><div class="l"><b>La maison<br>de vos rêves.</b><p>Villas et appartements haut de gamme à Yaoundé et Douala.</p><i>Voir les biens →</i></div>
   <div class="r">${A.villa('bw' + w)}</div></div></div></div>`;

const SPOTS = {
  resto: { len: 15, html: () => `
    <div class="abs" style="inset:0;background:radial-gradient(circle at 70% 55%,#ff8a2a 0%,#d2380e 38%,#3a0b03 82%)"></div>
    <div class="abs rays" style="left:70%;top:55%;width:150%;aspect-ratio:1;margin:-75% 0 0 -75%;background:repeating-conic-gradient(rgba(255,220,150,.13) 0 7deg,transparent 7deg 18deg);border-radius:50%"></div>
    <div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(30,6,2,.75),rgba(30,6,2,0) 55%)"></div>
    <div class="logo" data-a="up,0.05">BRAISE <span style="color:#ffc23a">&amp;</span> CO</div>
    <div class="t1" data-a="left,0.25" style="left:5%;top:22%;font-size:10.5em">SMASH</div>
    <div class="t1" data-a="left,0.4" style="left:5%;top:41%;font-size:10.5em;color:#ffc23a">BURGER</div>
    <div class="sub" data-a="up,0.75" style="left:5.3%;top:63%">Le goût qui fait parler.</div>
    <div class="pill" data-a="pop,1.0" style="left:5%;top:73%;background:#fff;color:#c2310e">🛵 Livraison en 30 min</div>
    <div class="abs prod" data-a="drop,0.15" data-float="1" style="left:47%;top:16%;width:46%">${A.burger('rs' + Math.random().toString(36).slice(2, 6))}</div>
    <div class="abs" data-a="pop,1.25" data-r="12" style="right:4%;top:9%;width:16%;aspect-ratio:1;border-radius:50%;background:#ffc23a;color:#5a1004;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;line-height:1;z-index:12;box-shadow:0 1em 2em rgba(0,0,0,.35)"><small style="font-size:1.5em">seulement</small><b style="font-size:3.4em">3 500</b><small style="font-size:1.7em">FCFA</small></div>
    <div class="embers">${Array.from({ length: 18 }, (_, i) => `<i style="position:absolute;width:.6em;height:.6em;border-radius:50%;background:#ffd27a;left:${(i * 37) % 100}%;opacity:.7;filter:blur(.08em)"></i>`).join('')}</div>`,
    extra(el, u, fs) {
      S(q(el, '.rays'), { r: u * 14 });
      qa(el, '.embers i').forEach((e, i) => { const y = ((u * (0.18 + (i % 5) * .03) + i * .137) % 1); e.style.top = (100 - y * 110) + '%'; e.style.opacity = (Math.sin(y * Math.PI) * .8).toFixed(2); });
    } },
  loc: { len: 20, html: () => `
    <div class="abs" style="inset:0;background:linear-gradient(180deg,#071040 0%,#1d3fb0 48%,#ff7a3a 88%,#ffb05a 100%)"></div>
    <div class="abs" style="left:62%;top:52%;width:22%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#ffe2a0,#ff8a3a 60%,rgba(255,138,58,0) 72%)"></div>
    <div class="abs sky" style="left:0;bottom:17%;width:200%;height:30%;background:
      linear-gradient(0deg,#0a1033 0 100%) 0 100%/6% 70% repeat-x,
      linear-gradient(0deg,#0d1640 0 100%) 3% 100%/4% 95% repeat-x,
      linear-gradient(0deg,#0a1033 0 100%) 5% 100%/3% 50% repeat-x;opacity:.95"></div>
    <div class="abs road" style="left:0;right:0;bottom:0;height:19%;background:linear-gradient(180deg,#1a1c26,#0c0d13)"></div>
    <div class="abs dash" style="left:0;width:200%;bottom:8%;height:1.6%;background:repeating-linear-gradient(90deg,#ffd27a 0 6%,transparent 6% 12%)"></div>
    <div class="abs speed" style="left:0;right:0;bottom:24%;height:20%;background:repeating-linear-gradient(180deg,rgba(255,255,255,.5) 0 .2em,transparent .2em 2.4em);mask-image:linear-gradient(90deg,transparent,#000 30%,transparent 60%);-webkit-mask-image:linear-gradient(90deg,transparent,#000 30%,transparent 60%);opacity:0"></div>
    <div class="logo" data-a="up,0.05">MOVEO<span style="color:#ffb020">.</span></div>
    <div class="t1" data-a="left,0.3" style="left:5%;top:20%;font-size:8.6em">LOUEZ</div>
    <div class="t1" data-a="left,0.45" style="left:5%;top:36%;font-size:8.6em;color:#ffb020">EN 1 CLIC</div>
    <div class="pill" data-a="pop,0.9" style="left:5%;top:55%;background:#ff6a1a;color:#fff">dès 25 000 F / jour</div>
    <div class="sub" data-a="up,1.15" style="left:5.3%;top:66%;font-size:1.9em">Climatisé · Assuré · Dispo 24h/24</div>
    <div class="abs car" style="left:40%;bottom:6%;width:56%;z-index:8">${A.car('lc' + Math.random().toString(36).slice(2, 6))}</div>`,
    extra(el, u, fs) {
      const p = E.o5(k(u, .1, 1.2)); const x = (1 - p) * -95 * fs;
      S(q(el, '.car'), { x, y: Math.sin(u * 30) * .08 * fs * (1 - p * .7) });
      const ang = u * 900 + (1 - p) * 0;
      qa(el, '.wheel').forEach(w => w.style.transform = `rotate(${ang}deg)`);
      q(el, '.dash').style.transform = `translateX(${-((u * 70 * fs) % (12 * fs))}px)`;
      q(el, '.sky').style.transform = `translateX(${-(u * 6 * fs)}px)`;
      q(el, '.speed').style.opacity = ((1 - p) * .9 + .15).toFixed(2);
    } },
  immo: { len: 20, html: () => `
    <div class="abs" style="inset:0;background:linear-gradient(180deg,#24165e 0%,#8a3a8a 38%,#ff7a4a 72%,#ffc27a 100%)"></div>
    <div class="abs" style="left:66%;top:30%;width:16%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff0c0,#ffb05a 55%,rgba(255,176,90,0) 72%)"></div>
    <div class="abs kb" style="left:38%;right:-8%;bottom:-2%;transform-origin:60% 100%">${A.villa('im' + Math.random().toString(36).slice(2, 6))}</div>
    <div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(20,10,50,.85),rgba(20,10,50,.35) 45%,rgba(20,10,50,0) 65%)"></div>
    <div class="logo" data-a="up,0.05" style="font-size:2em">KASA <span style="color:#ffb020">PRESTIGE</span></div>
    <div class="t1" data-a="left,0.3" style="left:5%;top:20%;font-size:8.6em">VILLA</div>
    <div class="t1" data-a="left,0.45" style="left:5%;top:36%;font-size:8.6em;color:#ffb020">MODERNE</div>
    <div class="sub" data-a="up,0.75" style="left:5.3%;top:54%;font-size:2.1em">À vendre · Bastos, Yaoundé</div>
    <div class="pill" data-a="pop,1.0" style="left:5%;top:64%;background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.35)">4 ch · 3 sdb · Piscine</div>
    <div class="pill" data-a="pop,1.3" style="left:5%;top:76%;background:#fff;color:#24165e">Visite virtuelle →</div>`,
    extra(el, u, fs) { S(q(el, '.kb'), { s: 1.14 - .1 * E.o3(k(u, 0, 4)), x: -u * .6 * fs }); } },
  sport: { len: 15, html: () => `
    <div class="abs" style="inset:0;background:radial-gradient(circle at 70% 50%,#ff3b2f 0%,#7a0d08 45%,#0c0a10 85%)"></div>
    <div class="abs" style="left:58%;top:12%;width:34%;aspect-ratio:1;border-radius:50%;border:1.2em solid rgba(255,255,255,.08)"></div>
    <div class="logo" data-a="up,0.05">IRON<span style="color:#ff3b2f">FIT</span></div>
    <div class="t1" data-a="left,0.2" style="left:5%;top:22%;font-size:11em">−50%</div>
    <div class="t1" data-a="left,0.35" style="left:5%;top:45%;font-size:5.6em;color:#ffb020">SUR L'INSCRIPTION</div>
    <div class="sub" data-a="up,0.6" style="left:5.3%;top:62%">Ta meilleure version commence ici.</div>
    <div class="pill" data-a="pop,0.8" style="left:5%;top:74%;background:#fff;color:#c2190e">Coaching offert</div>
    <div class="abs prod" data-a="pop,0.25" data-float="1" data-r="-14" style="left:52%;top:28%;width:44%">${A.dumbbell()}</div>`,
    extra() {} },
  store: { len: 15, html: () => `
    <div class="abs" style="inset:0;background:linear-gradient(135deg,#3a1acf 0%,#7b2bff 45%,#ff4d8d 100%)"></div>
    <div class="abs" style="left:56%;top:-10%;width:60%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.28),rgba(255,255,255,0) 65%)"></div>
    <div class="logo" data-a="up,0.05">NOVA<span style="color:#ffd27a"> STORE</span></div>
    <div class="t1" data-a="left,0.2" style="left:5%;top:24%;font-size:7.6em">NOUVELLE</div>
    <div class="t1" data-a="left,0.35" style="left:5%;top:39%;font-size:7.6em;color:#ffd27a">COLLECTION</div>
    <div class="sub" data-a="up,0.6" style="left:5.3%;top:58%">En boutique &amp; en ligne</div>
    <div class="pill" data-a="pop,0.8" style="left:5%;top:70%;background:#fff;color:#5b2bff">Livraison gratuite</div>
    <div class="abs prod" data-a="drop,0.2" data-float="1" data-r="8" style="left:64%;top:16%;width:28%">${A.bag()}</div>`,
    extra() {} },
  app: { len: 15, html: () => `
    <div class="abs" style="inset:0;background:linear-gradient(135deg,#081243 0%,#1d3fb0 50%,#18b89a 100%)"></div>
    <div class="logo" data-a="up,0.05">PAYLY<span style="color:#35e07a">●</span></div>
    <div class="t1" data-a="left,0.2" style="left:5%;top:22%;font-size:7.6em">TON ARGENT,</div>
    <div class="t1" data-a="left,0.35" style="left:5%;top:38%;font-size:7.6em;color:#35e07a">SIMPLIFIÉ.</div>
    <div class="sub" data-a="up,0.6" style="left:5.3%;top:57%">Paiements · Transferts · Épargne</div>
    <div class="pill" data-a="pop,0.8" style="left:5%;top:69%;background:#35e07a;color:#062a14">Télécharge l'appli</div>
    <div class="abs prod" data-a="up,0.25" data-float="1" data-r="8" style="left:70%;top:10%;width:20%">${phone(200, 'pay', '100%', '.92em')}</div>`,
    extra() {} },
};
function mkSpot(type, w) {
  const def = SPOTS[type];
  const el = h(`<div class="spot" style="width:${w}px;font-size:${w / 100}px">${def.html()}${ui(def.len)}</div>`);
  const fs = w / 100;
  const items = qa(el, '[data-a]').map(e => { const [fx, at] = e.dataset.a.split(','); return { e, fx, at: +at, r: +(e.dataset.r || 0), fl: !!e.dataset.float }; });
  const pb = q(el, '.pb i'), tc = q(el, '.tc');
  function upd(u) {
    for (const it of items) {
      const p = k(u, it.at, .6); let o = { o: k(u, it.at, .15), r: it.r };
      if (it.fx === 'left') o.x = -(1 - E.o5(p)) * 40 * fs;
      if (it.fx === 'up') o.y = (1 - E.o5(p)) * 8 * fs;
      if (it.fx === 'pop') { o.s = .3 + .7 * E.back(p); o.r = it.r * E.back(p); }
      if (it.fx === 'drop') { o.y = -(1 - E.back(p)) * 50 * fs; o.r = it.r - 14 * (1 - p); }
      if (it.fl) { o.y = (o.y || 0) + Math.sin(u * 2.4) * 1.2 * fs; o.r += Math.sin(u * 1.7) * 2; }
      S(it.e, o);
    }
    def.extra(el, u, fs);
    pb.style.width = Math.min(100, u / def.len * 100 * 1.6) + '%';
    tc.textContent = '0:0' + Math.min(9, Math.floor(u));
  }
  return { el, upd };
}
function thumb(type, w) { const s = mkSpot(type, w); s.upd(4.2); return s.el; }

// ---------- scene builders
const scenesRoot = document.getElementById('scenes');
const SC = {};
TL.scenes.forEach(s => SC[s.id] = s);
const defs = [];
function scene(id, html, upd) {
  const root = h(`<div class="scene" id="sc-${id}">${html}</div>`);
  scenesRoot.appendChild(root);
  defs.push({ id, root, s: SC[id].start, e: SC[id].end, upd });
  return root;
}

// 1. CAPTURE
{
  const pw = V ? 470 : 400;
  const r = scene('capture', `
    <div class="txt"><div class="kick line"><span class="in">Une simple</span></div>
      <div class="big shadow"><span class="line"><span class="in">CAPTURE</span></span><span class="line"><span class="in"><span class="hl">D'ÉCRAN…</span></span></span></div></div>
    <div class="vis"><div class="ph" style="position:relative">${phone(pw, 'resto')}
      <div class="shot abs" style="inset:-40px;opacity:0">${A.shot()}</div></div></div>`, (t, lt) => {
    const ins = qa(r, '.in');
    reveal(ins[0], lt, .15); reveal(ins[1], lt, .25); reveal(ins[2], lt, .4);
    const p = E.o5(k(lt, 0, .8));
    S(q(r, '.ph'), { persp: 1600, y: (1 - p) * 700, r: (1 - p) * 14 + Math.sin(lt * 1.3) * 1.5, ry: -12 + lt * 4, rx: 4 });
    const sp = k(lt, .85, .35);
    S(q(r, '.shot'), { s: lerp(1.3, 1, E.o5(sp)), o: sp > 0 ? 1 - k(lt, 1.45, .3) : 0 });
    q(r, '.shot svg').style.cssText = 'width:100%;height:100%';
  });
}
// 2. AFFICHE
{
  const pw = V ? 470 : 440;
  const r = scene('affiche', `
    <div class="txt"><div class="big shadow"><span class="line"><span class="in">UNE</span></span><span class="line"><span class="in"><span class="hlb">AFFICHE.</span></span></span></div></div>
    <div class="vis"><div class="pz">${poster(pw)}</div></div>`, (t, lt) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .02, .35); reveal(ins[1], lt, .1, .35);
    const p = k(lt, 0, .3);
    const shake = lt > .3 && lt < .55 ? Math.sin(lt * 90) * 8 * (1 - k(lt, .3, .25)) : 0;
    S(q(r, '.pz'), { s: lerp(1.7, 1, E.o5(p)) + lt * .03, r: lerp(-14, -4, E.o5(p)), o: k(lt, 0, .1), x: shake, y: shake * .6, b: (1 - p) * 10 });
  });
}
// 3. LIEN
{
  const bw = V ? 960 : 900;
  const r = scene('lien', `
    <div class="txt"><div class="kick line"><span class="in">Ou juste</span></div>
      <div class="big shadow"><span class="line"><span class="in">LE LIEN</span></span><span class="line"><span class="in"><span class="hl">D'UN SITE.</span></span></span></div></div>
    <div class="vis"><div class="bz" style="position:relative">${browser(bw, '')}
      <div class="cursor">${A.cursor()}</div></div></div>`, (t, lt) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .1); reveal(ins[1], lt, .2); reveal(ins[2], lt, .35);
    const url = 'kasaprestige.cm'; const n = Math.floor(cl((lt - .25) / .7) * url.length);
    q(r, '.typed').textContent = url.slice(0, n);
    q(r, '.caret').style.opacity = (Math.floor(lt * 4) % 2 || n < url.length) ? 1 : 0;
    const p = E.o5(k(lt, 0, .6));
    S(q(r, '.bz'), { persp: 1800, x: (1 - p) * 300 * (V ? 0 : 1), y: (1 - p) * (V ? 400 : 0), ry: V ? 0 : -10 + lt * 3, rx: V ? 8 - lt * 2 : 0, o: p, s: .96 + lt * .02 });
    const pg = k(lt, 1.0, .4);
    S(q(r, '.page'), { o: .15 + .85 * E.o3(pg), y: (1 - E.o3(pg)) * 30 });
    const cp = E.io(k(lt, .2, .7));
    S(q(r, '.cursor'), { x: lerp(bw * .9, bw * .42, cp), y: lerp(bw * .5, bw * .03, cp), s: lt > .95 && lt < 1.1 ? .85 : 1, o: k(lt, .2, .1) });
  });
}
// 4. PROMPT
{
  const promptTxt = 'Crée un spot publicitaire animé de 15 secondes à partir de ces visuels. Style premium, dégradé orange et bleu, texte percutant.';
  const r = scene('prompt', `
    <div class="txt"><div class="kick line"><span class="in">Quelques instructions à</span></div>
      <div class="big shadow" style="font-size:${V ? 150 : 170}px"><span class="line"><span class="in">L'<span class="hl">IA</span></span></span></div>
      <div class="kick line" style="margin-top:14px;opacity:.7"><span class="in">intelligence artificielle</span></div></div>
    <div class="vis"><div class="prompt">
      <div class="ph"><div class="ai">${A.spark()}</div>Assistant IA · Motion</div>
      <div class="att">
        <div style="background:linear-gradient(135deg,#6e1404,#ff5a1a)"><div style="position:absolute;inset:14px 30%;opacity:.9">${A.poster()}</div><small>affiche.jpg</small></div>
        <div style="background:linear-gradient(135deg,#0b1240,#2f6bff)"><div style="position:absolute;inset:14px 30%;opacity:.9">${A.app()}</div><small>capture.png</small></div>
        <div style="background:linear-gradient(135deg,#3a1acf,#ff4d8d)"><div style="position:absolute;inset:14px 30%;opacity:.9">${A.link()}</div><small>kasaprestige.cm</small></div>
      </div>
      <div class="inp"><span class="pt"></span><span class="caret"></span></div>
      <div class="foot"><span class="gen">Prêt</span><div class="prog"><i></i></div><div class="send">↑</div></div>
    </div></div>`, (t, lt, d) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .1); reveal(ins[1], lt, .2); reveal(ins[2], lt, .35);
    const p = E.o5(k(lt, 0, .6));
    S(q(r, '.prompt'), { persp: 1800, y: (1 - p) * 300, rx: (1 - p) * 20, o: p, s: 1 + lt * .012 });
    qa(r, '.att>div').forEach((e, i) => pop(e, lt, .25 + i * .1, .45));
    const n = Math.floor(cl((lt - .5) / 1.5) * promptTxt.length);
    q(r, '.pt').textContent = promptTxt.slice(0, n);
    q(r, '.caret').style.opacity = (n < promptTxt.length || Math.floor(lt * 4) % 2) ? 1 : 0;
    const sp = k(lt, 2.05, .15);
    S(q(r, '.send'), { s: sp > 0 && sp < 1 ? .85 : 1 + .06 * Math.sin(lt * 8) * (lt < 2.05 ? 1 : 0) });
    const g = k(lt, 2.15, d - 2.35);
    q(r, '.prog i').style.width = (E.io(g) * 100) + '%';
    q(r, '.gen').textContent = g <= 0 ? 'Prêt' : g < 1 ? `Génération du spot… ${Math.floor(g * 100)}%` : 'Spot prêt ✓';
  });
}
// wall of thumbnails (used by PUB + WALL)
const order = ['resto', 'loc', 'immo', 'sport', 'store', 'app'];
function wallHTML(cls, cols, rows, tw) {
  let s = `<div class="${cls} abs" style="left:50%;top:50%;width:${cols * (tw + 40)}px;margin-left:${-cols * (tw + 40) / 2}px;margin-top:${-rows * (tw * .5625 + 40) / 2}px;transform-style:preserve-3d">`;
  s += '</div>'; return s;
}
function fillWall(el, cols, rows, tw, shift = 0) {
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const tp = order[(x + y * 2 + shift) % order.length];
    const t = thumb(tp, tw); t.style.position = 'absolute'; t.style.left = (x * (tw + 40) + (y % 2) * (tw / 2)) + 'px'; t.style.top = (y * (tw * .5625 + 40)) + 'px';
    el.appendChild(t);
  }
}
// 5. PUB ANIMÉE
{
  const r = scene('pub', `
    <div class="abs" style="inset:0;perspective:1400px">${wallHTML('wall', 6, 6, 520)}</div>
    <div class="abs" style="inset:0;background:radial-gradient(ellipse at center,rgba(6,10,40,.85) 0%,rgba(6,10,40,.55) 45%,rgba(6,10,40,.1) 80%)"></div>
    <div class="abs center" style="inset:0;flex-direction:column;text-align:center">
      <div class="big shadow" style="font-size:${V ? 140 : 170}px"><div class="w1">UNE PUB</div><div class="w2" style="margin-top:12px"><span class="hl">ANIMÉE</span></div></div>
      <div class="w3 mid" style="margin-top:40px;font-size:${V ? 64 : 72}px;letter-spacing:.06em">PROFESSIONNELLE.</div>
    </div>`, (t, lt) => {
    const wall = q(r, '.wall');
    S(wall, { rx: 32, r: -14, y: -lt * 120 + 200, x: lt * 60, s: lerp(1.6, 1.15, E.o3(k(lt, 0, 1.2))) });
    wall.style.transform = `rotateX(32deg) rotateZ(-14deg) translate(${lt * 60}px,${200 - lt * 120}px) scale(${lerp(1.6, 1.15, E.o3(k(lt, 0, 1.2)))})`;
    const c5 = CL.c05, aw = c5.s + (c5.e - c5.s) * .62;
    slam(q(r, '.w1'), t, SC.pub.start + .05);
    slam(q(r, '.w2'), t, aw);
    const p3 = k(t, CL.c05b.s - .05, .5);
    S(q(r, '.w3'), { o: p3, y: (1 - E.o5(p3)) * 40 });
    q(r, '.w3').style.letterSpacing = lerp(.4, .06, E.o5(p3)) + 'em';
    // impact shake
    const sh = (x, at) => x > at && x < at + .3 ? Math.sin((x - at) * 80) * 14 * (1 - (x - at) / .3) : 0;
    const s = sh(t, SC.pub.start + .05) + sh(t, aw);
    q(r, '.center').style.transform = `translate(${s}px,${s * .5}px)`;
  });
  fillWall(q(r, '.wall'), 6, 6, 520);
}
// 6-8. SPOT SCENES
function spotScene(id, type, label, beforeHTML, beforeTag, bw) {
  const cw = V ? 980 : 1180;
  const cx = V ? (W - cw) / 2 : 600, cy = V ? 560 : 250;
  const bx = V ? (W - bw) / 2 : 110, by = V ? 1230 : 420;
  const sp = mkSpot(type, cw);
  const r = scene(id, `
    <div class="slabel"><div class="mid shadow" style="font-size:${V ? 84 : 80}px"><span class="line" style="display:inline-block"><span class="in">SPOT <span class="hl">${label}</span></span></span></div></div>
    <div class="bf abs" style="left:${bx}px;top:${by}px;width:${bw}px">${beforeHTML}
      <div class="btag" style="left:50%;${V ? 'bottom:-64px' : 'top:-62px'};transform:translateX(-50%)">${beforeTag}</div></div>
    <div class="arrow ar" style="${V ? `left:${W / 2 - 22}px;top:${by - 120}px` : `left:${bx + bw + 30}px;top:${by + 60}px`}">${V ? '↑' : '→'}</div>
    <div class="sp abs" style="left:${cx}px;top:${cy}px;width:${cw}px;height:${cw * .5625}px"></div>`, (t, lt, d) => {
    reveal(q(r, '.in'), lt, .05, .45);
    const pb = E.o5(k(lt, 0, .5));
    S(q(r, '.bf'), { x: V ? 0 : (1 - pb) * -400, y: V ? (1 - pb) * 400 : 0, r: V ? -3 : -4, o: pb });
    const pa = k(lt, .3, .3);
    S(q(r, '.ar'), { o: pa, x: V ? 0 : Math.sin(lt * 6) * 8, y: V ? Math.sin(lt * 6) * -8 : 0 });
    const pc = k(lt, .35, .6);
    S(q(r, '.sp'), { persp: 2000, s: lerp(.55, 1, E.o5(pc)) * (1 + lt * .012), o: k(lt, .35, .15), ry: V ? 0 : (1 - E.o5(pc)) * -25 + Math.sin(lt * .8) * 2, rx: V ? (1 - E.o5(pc)) * 20 : 2, b: (1 - pc) * 10 });
    sp.upd(Math.max(0, lt - .4));
  });
  q(r, '.sp').appendChild(sp.el);
  return r;
}
{
  const pwv = V ? 300 : 330;
  spotScene('resto', 'resto', 'RESTAURANT', poster(pwv), 'Avant : une affiche', pwv);
  const php = V ? 230 : 250;
  spotScene('loc', 'loc', V ? 'LOCATION AUTO' : 'LOCATION AUTO', phone(php, 'moveo'), "Avant : une capture d'écran", php);
  const brw = V ? 640 : 380;
  spotScene('immo', 'immo', 'IMMOBILIER', browser(brw), 'Avant : un simple lien', brw);
}
// 9. GRID — sport / boutique / app → n'importe quel service
{
  const cw = V ? 820 : 560;
  const pos = V ? [[130, 300], [130, 800], [130, 1300]] : [[80, 330], [680, 330], [1280, 330]];
  const labels = ['SALLE DE SPORT', 'BOUTIQUE', 'APPLICATION'];
  const types = ['sport', 'store', 'app'];
  const spots = types.map(tp => mkSpot(tp, cw));
  const pills = ['Restaurant', 'Hôtel', 'Salon de beauté', 'Clinique', 'Événementiel', 'Auto-école', 'Formation', 'Immobilier', 'Agence de voyage', 'E-commerce'];
  const r = scene('grid', `
    ${types.map((tp, i) => `<div class="gc abs" style="left:${pos[i][0]}px;top:${pos[i][1]}px;width:${cw}px;height:${cw * .5625}px"><div class="btag" style="left:24px;top:-26px;z-index:30;background:#ff6a1a;color:#fff">${labels[i]}</div></div>`).join('')}
    <div class="dim abs" style="inset:0;background:rgba(5,8,32,.72);opacity:0"></div>
    ${pills.map(p => `<div class="tagp">${p}</div>`).join('')}
    <div class="abs center gt" style="inset:0;flex-direction:column;text-align:center"><div class="big shadow" style="font-size:${V ? 108 : 140}px"><div class="g1">N'IMPORTE</div><div class="g2">QUEL <span class="hl">SERVICE.</span></div></div></div>`, (t, lt) => {
    const at = [CL.c09a.s - .1, CL.c09b.s - .05, CL.c09c.s - .05];
    const tb = CL.c09d.s - .1;
    const pb = E.o3(k(t, tb, .45));
    qa(r, '.gc').forEach((e, i) => {
      const p = k(t, at[i], .5);
      S(e, { persp: 1600, s: lerp(.5, 1, E.o5(p)) * lerp(1, .82, pb), y: (1 - E.o5(p)) * 160, rx: (1 - E.o5(p)) * 30, o: k(t, at[i], .12), b: pb * 5 });
      spots[i].upd(Math.max(0, t - at[i]));
    });
    q(r, '.dim').style.opacity = pb;
    slam(q(r, '.g1'), t, tb); slam(q(r, '.g2'), t, tb + .25);
    qa(r, '.tagp').forEach((e, i) => {
      const a = i / pills.length * Math.PI * 2 + .3, rx = V ? 400 : 760, ry = V ? 640 : 380;
      const p = E.o5(k(t, tb + .3 + i * .05, .6));
      const x = W / 2 + Math.cos(a) * rx * lerp(.3, 1, p) - 110, y = H / 2 + Math.sin(a) * ry * lerp(.3, 1, p) - 30 + Math.sin(t * 2 + i) * 8;
      e.style.left = '0'; e.style.top = '0';
      S(e, { x, y, o: k(t, tb + .3 + i * .05, .2) * .95, s: .6 + .4 * p });
    });
  });
  types.forEach((tp, i) => qa(r, '.gc')[i].appendChild(spots[i].el));
}
// 10. WALL — tout ça, je l'ai créé moi-même
{
  const r = scene('wall', `
    <div class="abs" style="inset:0;perspective:1600px">${wallHTML('wall2', 7, 7, 500)}</div>
    <div class="abs" style="inset:0;background:radial-gradient(ellipse at center,rgba(6,10,40,.88) 0%,rgba(6,10,40,.6) 50%,rgba(6,10,40,.15) 85%)"></div>
    <div class="abs center" style="inset:0;flex-direction:column;text-align:center">
      <div class="kick line" style="font-size:54px"><span class="in">Tout ça,</span></div>
      <div class="big shadow" style="font-size:${V ? 112 : 136}px"><span class="line"><span class="in">JE L'AI CRÉÉ</span></span><span class="line"><span class="in"><span class="hl">MOI-MÊME.</span></span></span></div></div>`, (t, lt, d) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .15); reveal(ins[1], lt, .35); reveal(ins[2], t, CL.c10a.s + (CL.c10a.e - CL.c10a.s) * .55);
    const p = E.io(k(lt, 0, d));
    q(r, '.wall2').style.transform = `rotateX(${lerp(10, 26, p)}deg) rotateZ(${lerp(6, -6, p)}deg) scale(${lerp(1.5, .78, p)}) translate(${lerp(-80, 80, p)}px,0)`;
  });
  fillWall(q(r, '.wall2'), 7, 7, 500, 3);
}
// 11. SANS
{
  const items = [['camera', 'CAMÉRA', 'c10b'], ['clap', 'TOURNAGE', 'c10c'], ['team', 'ÉQUIPE', 'c10d']];
  const r = scene('sans', `
    <div class="abs center" style="inset:0;flex-direction:column"><div>
    ${items.map(([ic, w]) => `<div class="sansrow"><div class="ic">${A[ic]()}<i class="x"></i></div><div class="mid shadow" style="font-size:${V ? 84 : 104}px">SANS <span class="gtxt">${w}</span></div></div>`).join('')}
    </div></div>`, (t, lt) => {
    qa(r, '.sansrow').forEach((e, i) => {
      const at = CL[items[i][2]].s - .08; const p = k(t, at, .45);
      S(e, { x: (1 - E.o5(p)) * -160, o: k(t, at, .12), b: (1 - p) * 8 });
      const xp = E.o3(k(t, at + .3, .3));
      q(e, '.x').style.transform = `rotate(-45deg) scaleX(${xp})`;
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
    const ins = qa(r, '.in'); reveal(ins[0], lt, .1); reveal(ins[1], t, CL.c11.s + .5); reveal(ins[2], t, CL.c11.s + 1.1);
    S(q(r, '.zz'), { s: 1 + lt * .06 });
    qa(r, '.warp i').forEach((e, i) => {
      const a = i * 2.39996, sp = ((lt * (.5 + (i % 7) * .08) + i * .173) % 1);
      const rad = sp * Math.max(W, H) * .8;
      e.style.width = (40 + sp * 260) + 'px';
      e.style.transform = `rotate(${a}rad) translateX(${rad}px)`;
      e.style.opacity = (Math.sin(sp * Math.PI) * k(lt, 0, d)).toFixed(2);
    });
  });
}
// 13. FORMATION
const bullets = ['Méthode pas à pas', 'Dans les moindres détails', 'Projets concrets de A à Z'];
const bulletsHTML = bullets.map(b => `<div class="bl" style="display:flex;align-items:center;gap:16px;font-family:Inter;font-weight:700;font-size:${V ? 36 : 34}px;margin:10px 0"><span style="width:44px;height:44px;border-radius:50%;background:#35e07a;display:flex;align-items:center;justify-content:center;flex:none"><span style="width:26px;height:26px">${A.check()}</span></span>${b}</div>`).join('');
const titleHTML = (fsz) => `<div class="kick" style="color:#ffb020;font-weight:800;letter-spacing:.25em;font-size:30px">LA FORMATION</div>
  <div class="big shadow" style="font-size:${fsz}px;line-height:.92"><div class="t-a">MOTION</div><div class="t-b">DESIGN</div><div class="t-c gtxt">AVEC L'IA</div></div>`;
{
  const lw = V ? 900 : 860;
  const sp = mkSpot('resto', lw * .956 * .66 * .94);
  const laptop = `<div class="laptop" style="width:${lw}px;font-size:${lw / 52}px"><div class="lid"><div class="lscr">
     <div class="course-side"><div style="font-family:'Inter Display';font-weight:900;font-size:1.2em;margin-bottom:.8em">Modules</div>
     ${['01 · Les bases de l\'IA', '02 · Capture → Spot', '03 · Affiche → Pub', '04 · Lien → Motion', '05 · Export &amp; vente'].map((m, i) => `<div class="cs ${i == 1 ? 'on' : ''}">${i < 1 ? '✓' : '▸'} ${m}</div>`).join('')}</div>
     <div class="course-main"><div class="vid"></div><div style="margin-top:.8em;font-weight:800;font-size:1.15em">Module 02 · Transformer une capture en spot</div><div style="opacity:.5;font-size:.85em;margin-top:.3em">Leçon 3 / 12 · Animation du produit</div>
      <div style="margin-top:.8em;height:.5em;border-radius:9px;background:rgba(255,255,255,.12)"><i style="display:block;height:100%;width:38%;border-radius:9px;background:linear-gradient(90deg,#ffb020,#ff6a1a)"></i></div></div>
     </div></div><div class="base"></div></div>`;
  const author = `<div class="au" style="display:inline-flex;align-items:center;gap:14px;margin-top:22px;font-family:Inter;font-weight:600;font-size:28px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:10px 24px 10px 10px"><span style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#ff7a1a,#2f6bff);display:flex;align-items:center;justify-content:center;font-weight:900">RB</span>avec Roger Boujieka</div>`;
  const html = V ? `
    <div class="abs" style="left:60px;right:60px;top:150px;text-align:center;display:flex;flex-direction:column;align-items:center">${titleHTML(126)}</div>
    <div class="lp abs" style="left:${(W - lw) / 2}px;top:820px">${laptop}</div>
    <div class="abs" style="left:150px;right:100px;top:1430px">${bulletsHTML}<div style="text-align:center">${author}</div></div>`
    : `<div class="txt" style="width:780px">${titleHTML(140)}<div style="margin-top:26px">${bulletsHTML}</div>${author}</div>
    <div class="lp abs" style="left:980px;top:${(H - lw * .66) / 2 - 10}px">${laptop}</div>`;
  const r = scene('formation', html, (t, lt) => {
    slam(q(r, '.t-a'), lt, .02); slam(q(r, '.t-b'), lt, .14); slam(q(r, '.t-c'), lt, .3);
    pop(q(r, '.kick'), lt, 0, .4);
    const pl = k(lt, .4, .8);
    S(q(r, '.lp'), { persp: 2000, x: V ? 0 : (1 - E.o5(pl)) * 500, y: V ? (1 - E.o5(pl)) * 500 : 0, ry: V ? 0 : lerp(-35, -8, E.o5(pl)) + lt * 1.2, rx: V ? lerp(30, 6, E.o5(pl)) : 4, o: k(lt, .4, .2) });
    qa(r, '.bl').forEach((e, i) => { const p = k(lt, 1.1 + i * .3, .5); S(e, { x: (1 - E.o5(p)) * -80, o: p }); });
    pop(q(r, '.au'), lt, 2.2, .5);
    sp.upd(lt);
  });
  q(r, '.vid').appendChild(sp.el); sp.el.style.position = 'absolute'; sp.el.style.borderRadius = '10px';
}
// 14. MODULES
{
  const rows = [
    ['shot', '#2f6bff', "Une capture d'écran", 'un spot pub', CL.c13a.s + (CL.c13a.e - CL.c13a.s) * .45],
    ['poster', '#ff6a1a', 'Une affiche', 'une pub animée', CL.c13a.s + (CL.c13a.e - CL.c13a.s) * .62],
    ['link', '#7b2bff', 'Un lien de site', 'un motion design', CL.c13a.s + (CL.c13a.e - CL.c13a.s) * .86],
    ['app', '#18b89a', 'Une appli', 'une vidéo tuto', CL.c13b.s + .1],
    ['spark', '#ff3b2f', 'Et bien d\'autres…', '', CL.c13b.s + (CL.c13b.e - CL.c13b.s) * .45],
  ];
  const rw = V ? 960 : 1180;
  const r = scene('modules', `
    <div class="abs" style="left:0;right:0;top:${V ? 230 : 70}px;text-align:center">
      <div class="kick line" style="color:#ffb020;font-weight:800;letter-spacing:.2em;font-size:30px"><span class="in">DANS LA FORMATION</span></div>
      <div class="mid shadow" style="font-size:${V ? 70 : 78}px"><span class="line"><span class="in">TU APPRENDS À <span class="hl">TRANSFORMER</span></span></span></div></div>
    <div class="abs" style="left:${(W - rw) / 2}px;width:${rw}px;top:${V ? 520 : 290}px;font-size:${V ? 34 : 36}px">
    ${rows.map(([ic, c, a, b]) => `<div class="mrow" style="font-size:inherit"><div class="mi" style="background:${c}">${A[ic]()}</div><span>${a}</span>${b ? `<span class="ar">→</span><span style="color:#ffd27a">${b}</span>` : ''}<div class="ok">${A.check()}</div></div>`).join('')}
    </div>
    <div class="stamp abs" style="${V ? 'left:0;right:0;top:1330px' : 'right:70px;bottom:40px'};text-align:center"><div class="big" style="display:inline-block;font-size:${V ? 150 : 120}px;transform:rotate(-8deg)"><span class="hl" style="padding:.06em .25em">DE A À Z</span></div></div>`, (t, lt) => {
    const ins = qa(r, '.in'); reveal(ins[0], lt, .05); reveal(ins[1], lt, .15);
    qa(r, '.mrow').forEach((e, i) => {
      const at = rows[i][4] - .15, p = k(t, at, .5);
      S(e, { x: (1 - E.o5(p)) * 220, o: k(t, at, .15), b: (1 - p) * 6 });
      pop(q(e, '.ok'), t, at + .35, .4);
    });
    slam(q(r, '.stamp'), t, CL.c13b.e - 1.05, .3);
  });
}
// 15. CTA
{
  const tw = V ? 420 : 460;
  const fl = V ? [[-60, 90, -8], [690, 120, 9], [-80, 1600, 7], [700, 1580, -10]] : [[-80, 60, -10], [1560, 70, 10], [-60, 780, 8], [1540, 800, -8]];
  const r = scene('cta', `
    ${fl.map((f, i) => `<div class="fl abs" style="left:${f[0]}px;top:${f[1]}px;width:${tw}px;opacity:.5">${''}</div>`).join('')}
    <div class="abs center" style="inset:0;flex-direction:column;text-align:center">
      ${titleHTML(V ? 140 : 150).replace('<div class="t-a">MOTION</div><div class="t-b">DESIGN</div>', '<div class="t-a">MOTION DESIGN</div>')}
      <div class="tag mid" style="font-size:${V ? 36 : 40}px;letter-spacing:.08em;margin-top:26px;opacity:.95">APPRENDS. CRÉE. <span style="color:#ffb020">VENDS TES SPOTS.</span></div>
      <div class="bwrap" style="position:relative;margin-top:${V ? 70 : 50}px"><div class="btn">J'accède à la formation <span style="font-size:1.1em">→</span></div>
        <div class="promo" style="right:-110px;top:-62px">PRIX PROMO</div><div class="ripple"></div></div>
      <div class="cap" style="margin-top:36px;font-family:Inter;font-weight:600;font-size:${V ? 32 : 30}px;opacity:.85">Clique sur le lien et profite de la promotion</div>
    </div>
    <div class="cursor" style="left:0;top:0">${A.cursor()}</div>`, (t, lt) => {
    pop(q(r, '.kick'), lt, .0, .4);
    slam(q(r, '.t-a'), lt, .05); slam(q(r, '.t-c'), lt, .2);
    const tg = k(lt, .45, .5); S(q(r, '.tag'), { o: tg, y: (1 - E.o5(tg)) * 30 });
    const bwp = q(r, '.bwrap');
    const click = 1.75;
    const press = lt > click && lt < click + .15 ? .93 : 1;
    pop(bwp, lt, .6, .6); if (lt > 1.2) S(bwp, { s: press * (1 + .025 * Math.sin((lt - 1.2) * 6)) });
    pop(q(r, '.promo'), lt, .95, .5, { r: -8 });
    if (lt > 1.5) S(q(r, '.promo'), { r: -8, s: 1 + .06 * Math.abs(Math.sin(lt * 3.2)) });
    const cp = k(lt, 1.6, .6); S(q(r, '.cap'), { o: cp, y: (1 - E.o5(cp)) * 20 });
    // cursor to button
    const br = bwp.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
    const bx = br.left - st.left + br.width * .62, by = br.top - st.top + br.height * .55;
    const mp = E.io(k(lt, .9, .8));
    S(q(r, '.cursor'), { x: lerp(W + 50, bx, mp), y: lerp(H * .9, by, mp), o: k(lt, .9, .1), s: lt > click && lt < click + .15 ? .82 : 1 });
    const rp = k(lt, click, .6), rip = q(r, '.ripple');
    rip.style.left = (br.width * .62 - 20) + 'px'; rip.style.top = (br.height * .55 - 20) + 'px';
    S(rip, { s: 1 + rp * 9, o: rp > 0 && rp < 1 ? 1 - rp : 0 });
    qa(r, '.fl').forEach((e, i) => S(e, { r: fl[i][2] + Math.sin(lt + i) * 2, y: Math.sin(lt * 1.2 + i * 2) * 14, o: .55 * k(lt, .2 + i * .1, .4), b: 2 }));
  });
  qa(r, '.fl').forEach((e, i) => e.appendChild(thumb(order[i], tw)));
}

// ---------- background + transitions
const bg = { b1: q(document, '.b1'), b2: q(document, '.b2'), b3: q(document, '.b3'), or: document.getElementById('bgOrange'), grid: q(document, '.grid-lines') };
const streak = document.getElementById('streak'), flash = document.getElementById('flash');
function background(t) {
  S(bg.b1, { x: (V ? -500 : -300) + Math.sin(t * .23) * 200, y: (V ? 1100 : 300) + Math.cos(t * .19) * 160 });
  S(bg.b2, { x: (V ? 300 : 1100) + Math.cos(t * .21) * 220, y: (V ? -300 : -400) + Math.sin(t * .17) * 160 });
  S(bg.b3, { x: (V ? 100 : 500) + Math.sin(t * .31) * 260, y: (V ? 700 : 400) + Math.sin(t * .27) * 200, o: .35 + .25 * Math.sin(t * .5) });
  const a = SC.affiche; const o = k(t, a.start - .05, .1) * (1 - k(t, a.end - .1, .2));
  bg.or.style.opacity = o;
  S(bg.grid, { x: -(t * 20) % 80, y: -(t * 12) % 80 });
  // whip streak at each cut
  let st = 0, sx = -600;
  for (const s of TL.scenes) { const p = (t - (s.start - .15)) / .4; if (p > 0 && p < 1 && s.start > 0) { st = Math.sin(p * Math.PI); sx = lerp(-500, W + 300, p); } }
  streak.style.opacity = st * .9; streak.style.transform = `translateX(${sx}px) rotate(18deg)`;
  // white flash on the big drops
  let f = 0;
  for (const id of ['pub', 'formation']) { const d = t - SC[id].start; if (d > -.06 && d < .35) f = Math.max(f, d < 0 ? (d + .06) / .06 : 1 - d / .35); }
  { const d = t; if (d < .25) f = Math.max(f, 1 - d / .25); }
  flash.style.opacity = f * .85;
}
window.seek = function (t) {
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
};
window.DURATION = TL.duration;
window.READY = document.fonts.ready.then(() => { window.seek(0); return true; });
})();
