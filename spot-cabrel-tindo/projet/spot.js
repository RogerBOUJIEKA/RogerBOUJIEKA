/* Cabrel Tindo – "Père riche / Père pauvre" – deterministic motion-design spot.
   window.renderFrame(t) draws the frame at time t (seconds). ?fmt=portrait for 9:16. */
(function () {
  const Q = new URLSearchParams(location.search);
  const P = Q.get('fmt') === 'portrait';
  const W = P ? 1080 : 1920, H = P ? 1920 : 1080;
  const ZOOM = +(Q.get('zoom') || 1);
  const DPR = (window.devicePixelRatio || 1) * ZOOM;
  const TL = window.TL;
  const $ = (s, r = document) => r.querySelector(s);
  const stage = $('#stage');
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  if (ZOOM !== 1) stage.style.zoom = ZOOM;
  const A = 'assets/';

  // ---------------------------------------------------------------- helpers
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    lin: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
    outQuint: t => 1 - Math.pow(1 - t, 5),
    back: (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    back2: t => E.back(t, 2.6),
    elastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1,
  };
  const pr = (t, t0, d, e = E.out) => e(clamp((t - t0) / d));
  // window helper: fade in at a, out at b
  const win = (t, a, b, fi = .25, fo = .25) => Math.min(pr(t, a, fi, E.lin), 1 - pr(t, b - fo, fo, E.lin));

  function S(el, o) {
    let tr = '';
    if (o.persp) tr += `perspective(${o.persp}px) `;
    if (o.x != null || o.y != null) tr += `translate(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px) `;
    if (o.rx) tr += `rotateX(${o.rx.toFixed(2)}deg) `;
    if (o.ry) tr += `rotateY(${o.ry.toFixed(2)}deg) `;
    if (o.r) tr += `rotate(${o.r.toFixed(3)}deg) `;
    if (o.s != null) tr += `scale(${o.s.toFixed(4)}) `;
    if (o.sx != null || o.sy != null) tr += `scale(${(o.sx ?? 1).toFixed(4)},${(o.sy ?? 1).toFixed(4)}) `;
    el.style.transform = tr;
    if (o.o != null) el.style.opacity = clamp(o.o).toFixed(3);
  }
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  const spl = s => [...s].map(c => `<span class="l">${c === ' ' ? ' ' : c}</span>`).join('');
  const words = s => s.split(' ').map(w => `<span class="l">${w}</span>`).join('<span class="l"> </span>');

  // seeded RNG
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // word-time lookup on the VO timeline
  const WT = TL.words; // [start, end, text]
  function wt(key, after = 0) {
    const k = key.toLowerCase();
    for (const w of WT) if (w[0] >= after - 0.01 && w[2].toLowerCase().includes(k)) return w[0];
    console.warn('word not found', key, after); return after;
  }

  // letter animation for a container of .l spans
  function letters(c, t, t0, stagger, dur, f, ease = E.back) {
    const ls = c.querySelectorAll('.l');
    ls.forEach((l, i) => { const p = ease(clamp((t - t0 - i * stagger) / dur)); f(l, p, i, ls.length); });
  }
  const popL = (dy = 60, s0 = .4) => (l, p) => S(l, { y: (1 - p) * dy, s: lerp(s0, 1, p), o: clamp(p * 3) });
  const fadeUp = (dy = 30) => (l, p) => S(l, { y: (1 - p) * dy, o: p });

  // ---------------------------------------------------------------- assets
  const IMG = {
    stage: A + `stage_${P ? 'P' : 'L'}.jpg`, stageB: A + `stage_${P ? 'P' : 'L'}_blur.jpg`,
    city: A + `city_${P ? 'P' : 'L'}.jpg`, cityB: A + `city_${P ? 'P' : 'L'}_blur.jpg`,
    slum: A + `slum_${P ? 'P' : 'L'}.jpg`, slumB: A + `slum_${P ? 'P' : 'L'}_blur.jpg`,
  };
  const bg = {
    stage: $('#bgStage'), stageB: $('#bgStageB'), city: $('#bgCity'), slum: $('#bgSlum'),
    cityB: $('#bgCityB'), slumB: $('#bgSlumB'),
  };
  for (const k in bg) {
    bg[k].src = IMG[k];
    Object.assign(bg[k].style, { width: W * 1.1 + 'px', height: H * 1.1 + 'px', left: -W * .05 + 'px', top: -H * .05 + 'px' });
  }
  const splitL = $('#splitL'), splitR = $('#splitR');
  for (const [d, src] of [[splitL, IMG.city], [splitR, IMG.slum]]) {
    const im = d.querySelector('img'); im.src = src; im.style.opacity = 1;
    Object.assign(im.style, { width: W * 1.1 + 'px', height: H * 1.1 + 'px', left: -W * .05 + 'px', top: -H * .05 + 'px' });
  }
  const cab = $('#cab'), cabWrap = $('#cabWrap'), cabGlow = $('#cabGlow'), cutLine = $('#cutLine');
  cab.src = A + 'cab.png';
  const corner = $('#corner'); corner.querySelector('img').src = A + 'logo_afc.png';
  Object.assign(corner.style, { height: (P ? 96 : 84) + 'px', right: (P ? 40 : 40) + 'px', top: (P ? 44 : 36) + 'px' });
  const tint = $('#tint'), bgGrad = $('#bgGrad'), rays = $('#rays'), swoosh = $('#swoosh');
  const beams = [...document.querySelectorAll('.beam')];
  const flash = $('#flash'), fadeEl = $('#fade'), vign = $('#vign'), grain = $('#grain');
  const wipeA = $('#wipeA'), wipeB = $('#wipeB');
  const world = $('#world');
  const capBox = $('#caption'), capSpan = capBox.querySelector('span');
  const scenesEl = $('#scenes');

  // swoosh paths per format
  if (P) {
    swoosh.setAttribute('viewBox', '0 0 1080 1920');
    $('#sw1').setAttribute('d', 'M-60,1250 C 200,1050 520,1460 760,1180 S 1000,980 1140,1080');
    $('#sw2').setAttribute('d', 'M-60,520 C 240,330 520,700 780,470 S 1020,320 1140,380');
    $('#sw3').setAttribute('d', 'M-40,1760 C 300,1640 560,1880 860,1720 S 1040,1660 1140,1690');
  }
  const swPaths = [...swoosh.querySelectorAll('path')];
  const swLen = [];

  // grain tile
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const d = x.createImageData(256, 256); const r = rng(7);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); grain.style.backgroundImage = `url(${c.toDataURL()})`; grain.style.backgroundSize = '256px 256px';
  })();

  // fx canvas
  const fx = $('#fx'); fx.width = W * DPR; fx.height = H * DPR; fx.style.width = W + 'px'; fx.style.height = H + 'px';
  const ctx = fx.getContext('2d');

  // ---------------------------------------------------------------- shared components
  function sticker(kind, size) {
    const e = el(`<div class="sticker ${kind}" style="font-size:${size}px"><span class="pere">père</span><span class="big">${kind === 'rich' ? 'RICHE' : 'PAUVRE'}</span></div>`);
    return e;
  }
  const TIERS = {
    classique: { name: 'CLASSIQUE', price: '1 000F', c1: '#F0372B', c2: '#A8140E', tc: '#E3261D' },
    vip: { name: 'VIP', price: '3 000F', c1: '#2BA8EA', c2: '#0B5E9E', tc: '#1593D6' },
    vvip: { name: 'VVIP', price: '5 000F', c1: '#F7C04A', c2: '#C8860F', tc: '#E3A21E' },
  };
  function ticket(tier) {
    const T = TIERS[tier];
    const rows = ['classique', 'vip', 'vvip'].map(k => `<div class="pr ${k === tier ? 'on' : ''}" style="--tc:${TIERS[k].tc};color:${k === tier ? '#fff' : TIERS[k].tc}"><small>${TIERS[k].name}</small><b>${TIERS[k].price}</b></div>`).join('');
    const e = el(`<div class="ticket">
      <div class="body">
        <div class="t-art">
          <img class="ta" src="${A}t_city.jpg"><img class="ta r" src="${A}t_slum.jpg"><div class="shade"></div>
          <img class="tcab" src="${A}cab_small.png">
          <div class="tsk"></div>
          <div class="tname"><b>CABREL TINDO</b><i>EN SPECTACLE</i></div>
        </div>
        <div class="t-info">
          <img class="tafc" src="${A}logo_afc.png">
          <div class="row">
            <div class="t-date" style="background:linear-gradient(170deg,${T.c1},${T.c2})"><div class="d1">DIM</div><div class="d2">25</div><div class="d3">OCT.</div><div class="d4">2026</div><div class="d5">17H00</div></div>
            <div class="t-pass" style="border-color:${T.tc}"><div class="ph" style="color:${T.tc}">PASS</div>${rows}</div>
          </div>
          <div class="tlogos"><img src="${A}logo_ambassade.png"><img src="${A}logo_institut.png"><img src="${A}logo_dschang.png"><img src="${A}logo_univ.png"></div>
        </div>
        <div class="t-stub" style="background:linear-gradient(170deg,${T.c1},${T.c2})"><div class="vt"><div class="a">TICKETS</div><div class="b">${T.price.replace('F', ' F')}</div><div class="c">${T.name}</div></div><div class="shine"></div></div>
      </div>
      <div class="t-perf"></div>
    </div>`);
    const sk = e.querySelector('.tsk');
    const s1 = sticker('rich', 58), s2 = sticker('poor', 58);
    Object.assign(s1.style, { left: '34px', top: '52px', transform: 'rotate(-3deg)' });
    Object.assign(s2.style, { right: '34px', top: '52px', transform: 'rotate(3deg)' });
    sk.appendChild(s1); sk.appendChild(s2);
    return e;
  }
  function bar(cells, w, h) { // cells: [{w, top, main, cls}]
    const b = el(`<div class="bar" style="width:${w}px;height:${h}px"></div>`);
    cells.forEach((c, i) => {
      if (i) b.appendChild(el('<div class="div"></div>'));
      b.appendChild(el(`<div class="cell" style="width:${c.w}px"><div style="font:800 ${c.ts}px Montserrat;letter-spacing:.3em;color:${c.tc};padding-left:.3em">${c.top}</div><div style="font:400 ${c.ms}px/1.05 Anton;color:${c.mc};text-align:center">${c.main}</div></div>`));
    });
    return b;
  }
  const phoneSVG = (c = '#FF6A13') => `<svg viewBox="0 0 100 100" width="100%" height="100%"><path fill="${c}" d="M30 14c3-2 7-1 9 2l7 11c2 3 1 7-2 9l-5 4c3 8 9 15 17 19l4-5c2-3 6-4 9-2l11 7c3 2 4 6 2 9l-4 6c-3 4-8 6-13 5C40 74 26 60 21 35c-1-5 1-10 5-13z"/></svg>`;
  const pinSVG = `<svg viewBox="0 0 100 120" width="100%" height="100%"><path fill="#fff" d="M50 4C28 4 12 20 12 41c0 28 38 72 38 72s38-44 38-72C88 20 72 4 50 4z"/><circle cx="50" cy="41" r="15" fill="#1593D6"/></svg>`;
  const spoonSVG = `<svg viewBox="0 0 200 520" width="100%" height="100%"><defs><linearGradient id="gs" x1="0" x2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".45" stop-color="#F5B325"/><stop offset="1" stop-color="#B9770A"/></linearGradient></defs><ellipse cx="100" cy="110" rx="78" ry="104" fill="url(#gs)"/><ellipse cx="88" cy="92" rx="34" ry="56" fill="#fff" opacity=".45"/><path d="M86 200 L114 200 L124 500 Q100 520 76 500 Z" fill="url(#gs)"/></svg>`;

  // ---------------------------------------------------------------- scenes
  const SC = {};
  function scene(name, html) { const e = el(`<div class="sc" id="sc_${name}">${html}</div>`); scenesEl.appendChild(e); SC[name] = { el: e }; return e; }
  const q = (sc, s) => SC[sc].el.querySelector(s);

  // 1 INTRO
  scene('intro', `
    <div class="ctr" id="i1"><span class="anton white sh" style="font-size:${P ? 150 : 200}px;letter-spacing:.04em">${spl('MESDAMES')}</span></div>
    <div class="ctr" id="i2"><span class="anton gradOr" style="font-size:${P ? 104 : 136}px;letter-spacing:.03em">${spl('ET MESSIEURS...')}</span></div>
    <div class="ctr" id="i3"><span class="mont white" style="font-weight:800;font-size:${P ? 32 : 44}px;letter-spacing:.34em;padding-left:.34em">${words('CHERS AMIS DE DSCHANG')}</span></div>
    <div class="ctr" id="i4"><span class="kaushan gradGold" style="font-size:${P ? 84 : 104}px;padding:0 .2em">et d'ailleurs !</span></div>`);
  Object.assign(q('intro', '#i1').style, { top: (P ? 640 : 250) + 'px' });
  Object.assign(q('intro', '#i2').style, { top: (P ? 800 : 455) + 'px' });
  Object.assign(q('intro', '#i3').style, { top: (P ? 965 : 640) + 'px' });
  Object.assign(q('intro', '#i4').style, { top: (P ? 1030 : 712) + 'px' });

  // 2 RICH
  scene('rich', `<div id="rs"></div><div class="abs" id="spoon" style="width:${P ? 90 : 120}px;height:${P ? 234 : 312}px">${spoonSVG}</div>`);
  const richSt = sticker('rich', P ? 220 : 300); q('rich', '#rs').appendChild(richSt);
  Object.assign(richSt.style, P ? { left: '50%', top: '210px', marginLeft: '-330px' } : { left: '120px', top: '250px' });
  Object.assign(q('rich', '#spoon').style, P ? { left: '70px', top: '380px' } : { left: '1010px', top: '120px' });

  // 3 POOR
  scene('poor', `<div id="ps"></div>
     <div class="abs kaushan gradGold" id="ha1" style="font-size:${P ? 96 : 110}px">Ha ha !</div>
     <div class="abs kaushan gradGold" id="ha2" style="font-size:${P ? 76 : 84}px">Ha !</div>
     <div class="abs kaushan gradGold" id="ha3" style="font-size:${P ? 86 : 96}px">Hi hi !</div>`);
  const poorSt = sticker('poor', P ? 220 : 250); q('poor', '#ps').appendChild(poorSt);
  Object.assign(poorSt.style, P ? { left: '50%', top: '210px', marginLeft: '-380px' } : { right: '110px', top: '270px' });
  const HA = P ? [[620, 760], [120, 980], [690, 1180]] : [[1180, 120], [1640, 720], [880, 640]];
  ['#ha1', '#ha2', '#ha3'].forEach((s, i) => Object.assign(q('poor', s).style, { left: HA[i][0] + 'px', top: HA[i][1] + 'px' }));

  // 4 SPLIT
  scene('split', `<div id="sps"></div>
     <div class="abs kaushan white sh" id="spou" style="font-size:${P ? 90 : 110}px">ou</div>
     <div class="abs anton gradGold sh" id="spq" style="font-size:${P ? 330 : 420}px">?</div>
     <div class="abs" id="spdiv" style="width:8px;height:${H * 1.3}px;top:${-H * .15}px;background:linear-gradient(180deg,#fff0,#fff 20%,#FFD873 50%,#fff 80%,#fff0);box-shadow:0 0 24px 8px rgba(255,210,120,.85)"></div>`);
  const spR = sticker('rich', P ? 140 : 170), spP = sticker('poor', P ? 140 : 170);
  q('split', '#sps').appendChild(spR); q('split', '#sps').appendChild(spP);
  Object.assign(spR.style, P ? { left: '60px', top: '150px' } : { left: '90px', top: '120px' });
  Object.assign(spP.style, P ? { right: '60px', top: '380px' } : { right: '90px', top: '120px' });
  Object.assign(q('split', '#spou').style, P ? { left: '120px', top: '330px' } : { left: '200px', top: '330px' });
  Object.assign(q('split', '#spq').style, P ? { left: '760px', top: '560px' } : { left: '1500px', top: '360px' });

  // 5 PRESENTS
  scene('presents', `
    <div id="pg1">
      <div class="ctr"><div id="afcCard" style="display:inline-block;background:#fff;border-radius:28px;padding:${P ? 26 : 30}px ${P ? 44 : 54}px;box-shadow:0 20px 60px rgba(0,0,0,.5)"><img src="${A}logo_afc.png" style="height:${P ? 150 : 170}px;display:block"></div></div>
      <div class="ctr mont white" id="pa1" style="font-weight:800;font-size:${P ? 30 : 40}px;letter-spacing:.24em;padding-left:.24em">${words('ALLIANCE FRANCO-CAMEROUNAISE')}</div>
      <div class="ctr mont white" id="pa2" style="font-weight:800;font-size:${P ? 30 : 40}px;letter-spacing:.24em;padding-left:.24em">${words('DE DSCHANG')}</div>
      <div class="ctr bebas gradGold" id="pa3" style="font-size:${P ? 72 : 86}px;letter-spacing:.6em;padding-left:.6em">${spl('PRÉSENTE')}</div>
    </div>
    <div id="pg2">
      <div class="ctr mont white" id="pb1" style="font-weight:800;font-size:${P ? 40 : 56}px;letter-spacing:.2em;padding-left:.2em">${words('LE PHÉNOMÈNE DE')}</div>
      <div class="ctr anton gradGold sh" id="pb2" style="font-size:${P ? 170 : 210}px;letter-spacing:.02em">${spl("L'HUMOUR")}</div>
      <div class="ctr anton gradOr sh" id="pb3" style="font-size:${P ? 230 : 270}px;letter-spacing:.03em">${spl('GOSPEL')}</div>
    </div>`);
  const PT = P ? { card: 560, a1: 840, a2: 892, a3: 975, b1: 640, b2: 720, b3: 900 } : { card: 170, a1: 470, a2: 528, a3: 620, b1: 250, b2: 330, b3: 545 };
  q('presents', '#afcCard').parentElement.style.top = PT.card + 'px';
  ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'].forEach(k => q('presents', '#p' + k).style.top = PT[k] + 'px');

  // 6 TITLE
  const nameShadow = 'text-shadow:0 5px 0 #FF8F1F,0 10px 0 #FF6A13,0 15px 0 #D9480F,0 30px 50px rgba(0,0,0,.55)';
  scene('title', `
    <div id="ts"></div>
    <div class="ctr archivo white" id="tn1" style="font-size:${P ? 176 : 250}px;${nameShadow}">CABREL</div>
    <div class="ctr archivo white" id="tn2" style="font-size:${P ? 176 : 250}px;${nameShadow}">TINDO</div>
    <div class="ctr mont white" id="tn3" style="font-weight:700;font-size:${P ? 36 : 46}px;letter-spacing:.7em;padding-left:.7em;text-shadow:0 4px 20px rgba(0,0,0,.7)">${spl('EN SPECTACLE')}</div>`);
  const tR = sticker('rich', P ? 120 : 150), tP = sticker('poor', P ? 120 : 150);
  q('title', '#ts').appendChild(tR); q('title', '#ts').appendChild(tP);
  Object.assign(tR.style, P ? { left: '70px', top: '120px' } : { left: '90px', top: '90px' });
  Object.assign(tP.style, P ? { right: '70px', top: '120px' } : { right: '90px', top: '90px' });
  const TN = P ? [1215, 1380, 1590] : [575, 790, 1000];
  ['#tn1', '#tn2', '#tn3'].forEach((s, i) => q('title', s).style.top = TN[i] + 'px');

  // 7 JOY
  const jAlign = P ? 'center' : 'left';
  scene('joy', `
    <div class="abs" id="jcol" style="left:${P ? 0 : 120}px;width:${P ? W : 1000}px;text-align:${jAlign}">
      <div class="mont white" id="j1" style="font-weight:800;font-size:${P ? 46 : 56}px;letter-spacing:.14em">${words('UNE SOIRÉE POUR')}</div>
      <div class="anton gradOr sh" id="j2" style="font-size:${P ? 300 : 330}px;letter-spacing:.03em;margin-top:-6px">${spl('RIRE')}</div>
      <div class="anton white sh" id="j3" style="font-size:${P ? 132 : 150}px;letter-spacing:.03em;margin-top:-10px">${words('AUX ÉCLATS')}</div>
      <div class="mont white" id="j4" style="font-weight:800;font-size:${P ? 44 : 52}px;letter-spacing:.12em;margin-top:34px">${words('& CÉLÉBRER LA VIE')}</div>
      <div class="kaushan gradGold" id="j5" style="font-size:${P ? 112 : 128}px;margin-top:-4px;padding-right:.2em">dans la joie !</div>
    </div>
    <div class="abs kaushan gradGold" id="jh1" style="font-size:${P ? 90 : 100}px">Ha ha ha !</div>
    <div class="abs kaushan gradGold" id="jh2" style="font-size:${P ? 72 : 80}px">Hi hi !</div>`);
  q('joy', '#jcol').style.top = (P ? 150 : 175) + 'px';
  const JH = P ? [[640, 1060], [90, 1300]] : [[1200, 110], [1600, 470]];
  ['#jh1', '#jh2'].forEach((s, i) => Object.assign(q('joy', s).style, { left: JH[i][0] + 'px', top: JH[i][1] + 'px' }));

  // 8 DATE
  const clockSVG = `<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="44" fill="none" stroke="#1593D6" stroke-width="8"/>${[...Array(12)].map((_, i) => `<line x1="50" y1="12" x2="50" y2="${i % 3 ? 17 : 20}" stroke="#0A2C52" stroke-width="${i % 3 ? 2.5 : 4}" transform="rotate(${i * 30} 50 50)"/>`).join('')}<line id="hh" x1="50" y1="50" x2="50" y2="30" stroke="#061A33" stroke-width="7" stroke-linecap="round"/><line id="mh" x1="50" y1="50" x2="50" y2="20" stroke="#FF6A13" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="50" r="5" fill="#061A33"/></svg>`;
  scene('date', `
    <div class="ctr bebas white" id="d0" style="font-size:${P ? 104 : 116}px;letter-spacing:.28em;padding-left:.28em">${spl('RENDEZ-VOUS')}</div>
    <div class="abs" id="d0l" style="height:6px;background:linear-gradient(90deg,#FF6A13,#F5B325);border-radius:3px"></div>
    <div class="card orange" id="c1">
      <div class="lab white" id="c1a">DIMANCHE</div>
      <div class="huge white" id="c1b" style="font-size:${P ? 250 : 300}px;text-shadow:0 14px 30px rgba(0,0,0,.25)">25</div>
      <div class="sub white" id="c1c" style="font-size:${P ? 76 : 86}px">OCTOBRE 2026</div>
    </div>
    <div class="card white" id="c2">
      <div id="clock" style="width:${P ? 120 : 150}px;height:${P ? 120 : 150}px;margin-bottom:${P ? 6 : 18}px">${clockSVG}</div>
      <div class="huge" id="c2b" style="font-size:${P ? 170 : 200}px;color:#1593D6">17H00</div>
      <div class="lab" id="c2c" style="color:#061A33;font-size:${P ? 38 : 40}px">PRÉCISES</div>
    </div>
    <div class="card blue" id="c3">
      <div id="pin" style="width:${P ? 64 : 110}px;height:${P ? 76 : 132}px;margin-bottom:${P ? 2 : 14}px">${pinSVG}</div>
      <div class="lab white" id="c3a">SALLE</div>
      <div class="huge white" id="c3b" style="font-size:${P ? 98 : 112}px;text-align:center;line-height:.95">MANU<br>DIBANGO</div>
      <div class="sub white" id="c3c" style="font-size:${P ? 44 : 54}px;letter-spacing:.3em;margin-top:${P ? 4 : 8}px;padding-left:.3em">DSCHANG</div>
    </div>`);
  {
    const cw = P ? 900 : 490, ch = P ? 430 : 590, gap = P ? 40 : 55, top = P ? 390 : 300;
    ['#c1', '#c2', '#c3'].forEach((s, i) => {
      const c = q('date', s);
      Object.assign(c.style, { width: cw + 'px', height: ch + 'px' });
      if (P) Object.assign(c.style, { left: (W - cw) / 2 + 'px', top: top + i * (ch + gap) + 'px' });
      else Object.assign(c.style, { left: (W - 3 * cw - 2 * gap) / 2 + i * (cw + gap) + 'px', top: top + 'px' });
    });
    q('date', '#d0').style.top = (P ? 215 : 120) + 'px';
    Object.assign(q('date', '#d0l').style, { top: (P ? 336 : 248) + 'px', left: W / 2 - 220 + 'px', width: '440px' });
  }

  // 9 TICKETS
  scene('tickets', `
    <div class="ctr" id="kh"><span class="anton gradWhite sh" style="font-size:${P ? 150 : 150}px;letter-spacing:.03em">${spl('TICKETS')}</span>${P ? '<br>' : '<span style="display:inline-block;width:34px"></span>'}<span class="bebas" style="color:#FFD9B8;font-size:${P ? 104 : 112}px;letter-spacing:.2em" id="kh2">${spl('DISPONIBLES')}</span></div>
    <div id="tk"></div>`);
  q('tickets', '#kh').style.top = (P ? 120 : 40) + 'px';
  const TK = {};
  for (const k of ['classique', 'vip', 'vvip']) { TK[k] = ticket(k); q('tickets', '#tk').appendChild(TK[k]); }

  // 10 PHONE
  scene('phone', `
    <div class="abs" id="ph_rot" style="left:${W / 2 - 1.6 * Math.max(W, H)}px;top:${H / 2 - 1.6 * Math.max(W, H)}px;width:${3.2 * Math.max(W, H)}px;height:${3.2 * Math.max(W, H)}px;background:repeating-conic-gradient(rgba(255,255,255,.07) 0 6deg,rgba(255,255,255,0) 6deg 14deg)"></div>
    <div class="abs" id="ph_icon" style="width:190px;height:190px;border-radius:50%;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.3);padding:42px">${phoneSVG()}</div>
    <div class="abs" id="ring1" style="width:190px;height:190px;border-radius:50%;border:5px solid #fff"></div>
    <div class="abs" id="ring2" style="width:190px;height:190px;border-radius:50%;border:5px solid #fff"></div>
    <div class="ctr bebas white" id="ph_t1" style="font-size:${P ? 96 : 104}px;letter-spacing:.3em;padding-left:.3em">${spl('RÉSERVATIONS')}</div>
    <div class="ctr bebas" id="ph_t2" style="font-size:${P ? 96 : 104}px;letter-spacing:.3em;padding-left:.3em;color:#061A33">${spl('JE RÉPÈTE !')}</div>
    <div class="ctr" id="ph_num">
      <span class="mont white g" id="g0" style="font-weight:800;font-size:${P ? 96 : 96}px;vertical-align:${P ? 'baseline' : '18%'}">+237</span>${P ? '<br>' : '<span style="display:inline-block;width:34px"></span>'}<span class="anton white g" id="g1">652</span><span class="sp"></span><span class="anton white g" id="g2">43</span><span class="sp"></span><span class="anton white g" id="g3">67</span><span class="sp"></span><span class="anton white g" id="g4">99</span>
    </div>
    <div class="ctr" id="ph_pill"><span class="mont" style="display:inline-block;background:#fff;color:#E5560B;font-weight:800;font-size:${P ? 40 : 46}px;letter-spacing:.06em;padding:20px 46px;border-radius:999px;box-shadow:0 16px 40px rgba(0,0,0,.25)">RÉSERVE TON BILLET MAINTENANT</span></div>`);
  {
    const gs = P ? 196 : 250;
    SC.phone.el.querySelectorAll('.anton.g').forEach(g => { g.style.fontSize = gs + 'px'; g.style.display = 'inline-block'; g.style.textShadow = '0 14px 36px rgba(0,0,0,.25)'; });
    SC.phone.el.querySelectorAll('.sp').forEach(g => { g.style.display = 'inline-block'; g.style.width = (P ? 34 : 44) + 'px'; });
    q('phone', '#g0').style.display = 'inline-block';
    const ic = P ? [W / 2 - 95, 330] : [W / 2 - 95, 70];
    ['#ph_icon', '#ring1', '#ring2'].forEach(s => Object.assign(q('phone', s).style, { left: ic[0] + 'px', top: ic[1] + 'px' }));
    q('phone', '#ph_t1').style.top = (P ? 600 : 300) + 'px';
    q('phone', '#ph_t2').style.top = (P ? 600 : 300) + 'px';
    q('phone', '#ph_num').style.top = (P ? 760 : 410) + 'px';
    q('phone', '#ph_num').style.lineHeight = P ? '1.3' : '1';
    q('phone', '#ph_pill').style.top = (P ? 1270 : 760) + 'px';
  }

  // 11 PARTNERS
  scene('partners', `
    <div class="ctr mont" id="pt0" style="font-weight:800;font-size:${P ? 44 : 50}px;letter-spacing:.3em;padding-left:.3em;color:#061A33">${words('AVEC LE SOUTIEN DE')}</div>
    <div class="abs" id="pt0l" style="height:6px;background:linear-gradient(90deg,#1593D6,#FF6A13);border-radius:3px"></div>
    <div id="plogos"></div>`);
  const PL = ['ambassade', 'institut', 'dschang', 'univ', 'afc'].map(n => { const i = document.createElement('img'); i.src = A + `logo_${n}.png`; i.className = 'abs'; q('partners', '#plogos').appendChild(i); return i; });
  q('partners', '#pt0').style.top = (P ? 420 : 250) + 'px';
  Object.assign(q('partners', '#pt0l').style, { top: (P ? 498 : 335) + 'px', left: W / 2 - 200 + 'px', width: '400px' });

  // 12 TOGETHER
  scene('together', `
    <div class="ctr kaushan gradGold" id="g_1" style="font-size:${P ? 96 : 100}px">Alors,</div>
    <div class="ctr anton white sh" id="g_2" style="font-size:${P ? 150 : 190}px;letter-spacing:.03em">${words('NE VIENS PAS')}</div>
    <div class="ctr anton gradOr sh" id="g_3" style="font-size:${P ? 250 : 300}px;letter-spacing:.03em">${spl('SEUL(E) !')}</div>
    <div class="ctr mont white" id="g_4" style="font-weight:800;font-size:${P ? 52 : 64}px;letter-spacing:.12em;text-shadow:0 6px 24px rgba(0,0,0,.6)">${words('VIENS EN FAMILLE,')}</div>
    <div class="ctr kaushan gradGold" id="g_5" style="font-size:${P ? 100 : 118}px">viens avec tes amis !</div>`);
  const GT = P ? [400, 520, 690, 1020, 1110] : [95, 200, 380, 720, 810];
  ['#g_1', '#g_2', '#g_3', '#g_4', '#g_5'].forEach((s, i) => q('together', s).style.top = GT[i] + 'px');

  // 13 FINAL
  scene('final', `
    <div id="f_st" class="abs" style="display:flex;gap:${P ? 26 : 34}px"></div>
    <div class="abs archivo white" id="f_name" style="font-size:${P ? 104 : 104}px;white-space:nowrap;${nameShadow.replace(/5px 0|10px 0|15px 0/g, m => m.replace(/\d+px/, n => Math.round(parseInt(n) * .55) + 'px'))}">CABREL TINDO</div>
    <div class="abs mont white" id="f_es" style="font-weight:700;font-size:${P ? 30 : 32}px;letter-spacing:.66em;white-space:nowrap">EN SPECTACLE</div>
    <div id="f_bar"></div><div id="f_pills"></div>
    <div class="abs" id="f_ph" style="display:flex;align-items:center;gap:22px">
      <div style="width:${P ? 96 : 104}px;height:${P ? 96 : 104}px;border-radius:50%;background:#FF6A13;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.3)">${phoneSVG('#fff')}</div>
      <div><div class="anton white" style="font-size:${P ? 80 : 84}px;line-height:1;letter-spacing:.01em">+237 652 43 67 99</div><div class="mont white" style="font-weight:600;font-size:${P ? 28 : 28}px;letter-spacing:.06em;margin-top:6px;opacity:.92">Réserve ton billet maintenant</div></div>
    </div>
    <div id="f_logos"></div>`);
  const fst = q('final', '#f_st'); const fR = sticker('rich', P ? 104 : 112), fP = sticker('poor', P ? 104 : 112);
  [fR, fP].forEach(s => { s.style.position = 'relative'; fst.appendChild(s); });
  const FL = P ? { x: 50, w: 980 } : { x: 860, w: 1000 };
  const fBar = bar([
    { w: FL.w * .36, top: 'DIMANCHE', ts: 20, tc: '#FF6A13', main: '25 OCT. 2026', ms: P ? 58 : 60, mc: '#061A33' },
    { w: FL.w * .24, top: 'HEURE', ts: 20, tc: '#FF6A13', main: '17H00', ms: P ? 58 : 60, mc: '#1593D6' },
    { w: FL.w * .40 - 6, top: 'LIEU', ts: 20, tc: '#FF6A13', main: 'SALLE MANU<br>DIBANGO', ms: P ? 44 : 44, mc: '#061A33' },
  ], FL.w, 150);
  q('final', '#f_bar').appendChild(fBar);
  const pills = ['classique', 'vip', 'vvip'].map(k => {
    const T = TIERS[k]; const pw = (FL.w - 2 * 24) / 3;
    const e = el(`<div class="pill" style="width:${pw}px;height:${P ? 128 : 136}px;background:linear-gradient(170deg,${T.c1},${T.c2})"><small>${T.name}</small><b>${T.price}</b></div>`);
    q('final', '#f_pills').appendChild(e); return e;
  });
  const fLogoBar = el(`<div class="logobar" style="width:${FL.w}px;height:${P ? 116 : 112}px">${['ambassade', 'institut', 'dschang', 'univ', 'afc'].map(n => `<img src="${A}logo_${n}.png" style="height:${n === 'institut' ? (P ? 64 : 62) : (P ? 82 : 80)}px">`).join('')}</div>`);
  q('final', '#f_logos').appendChild(fLogoBar);
  {
    const L = P ? { st: [0, 60], name: 236, es: 356, bar: 1290, pills: 1466, ph: 1622, logos: 1772 } : { st: [FL.x, 64], name: 250, es: 372, bar: 440, pills: 618, ph: 790, logos: 932 };
    Object.assign(fst.style, P ? { left: '0', width: W + 'px', justifyContent: 'center', top: L.st[1] + 'px' } : { left: L.st[0] + 'px', top: L.st[1] + 'px' });
    const fn = q('final', '#f_name'), fe = q('final', '#f_es');
    Object.assign(fn.style, { left: (P ? 0 : FL.x) + 'px', top: L.name + 'px' }); if (P) { fn.style.width = W + 'px'; fn.style.textAlign = 'center'; }
    Object.assign(fe.style, { left: (P ? 0 : FL.x + 4) + 'px', top: L.es + 'px' }); if (P) { fe.style.width = W + 'px'; fe.style.textAlign = 'center'; fe.style.paddingLeft = '.66em'; }
    Object.assign(fBar.style, { left: FL.x + 'px', top: L.bar + 'px' });
    pills.forEach((p, i) => Object.assign(p.style, { left: FL.x + i * ((FL.w - 48) / 3 + 24) + 'px', top: L.pills + 'px' }));
    const fph = q('final', '#f_ph'); Object.assign(fph.style, { left: (P ? FL.x + 40 : FL.x) + 'px', top: L.ph + 'px' });
    Object.assign(fLogoBar.style, { left: FL.x + 'px', top: L.logos + 'px' });
  }

  // 14 AGENCY – animated signature: the dove (Holy Spirit) flies in, lands in the B, then takes off again
  const LW_ = P ? 860 : 1000, LH_ = LW_ * 680 / 2366;
  const LGX = (W - LW_) / 2, LGY = (H - LH_) / 2 + (P ? 0 : 10);
  const WING = 'M262,120 C252,84 230,52 196,30 C186,24 174,20 160,18 C170,30 176,40 178,46 C164,34 146,28 126,28 C138,40 148,52 152,60 C136,52 116,50 98,54 C114,64 128,74 136,82 C120,80 104,84 90,90 C110,100 132,106 152,110 C140,112 128,116 118,122 C160,128 210,130 250,130 Z';
  const FEATH = 'M254,116 C230,80 206,54 182,40 M248,120 C214,90 184,66 156,56 M244,124 C204,104 170,92 140,86 M240,126 C200,118 168,114 140,114';
  const BODY = 'M360,104 C356,92 344,80 326,78 C308,76 294,86 286,100 C278,114 262,124 238,132 C206,142 168,146 132,150 L70,156 C96,170 130,178 168,180 C214,182 262,174 296,152 C312,142 324,128 334,118 C344,112 354,110 360,104 Z';
  const TAIL = 'M140,152 L44,136 L58,150 L30,157 L58,166 L36,181 L80,176 L150,170 Z';
  const doveSVG = id => `<svg id="${id}" class="abs" viewBox="0 0 400 300" width="300" height="225" style="overflow:visible;left:0;top:0;transform-origin:187px 96px">
      <g class="wb"><path d="${WING}" fill="#cfd8e3"/></g>
      <path d="${TAIL}" fill="#eef3f8"/><path d="${BODY}" fill="#ffffff"/>
      <path d="M357,99 L376,105 L357,110 Z" fill="#c9a49a"/><circle cx="331" cy="94" r="5.2" fill="#E00000"/><circle cx="332.6" cy="92.6" r="1.6" fill="#fff"/>
      <g class="wf"><path d="${WING}" fill="#ffffff"/><path d="${FEATH}" stroke="#d9e2ec" stroke-width="3" fill="none" stroke-linecap="round"/></g></svg>`;
  const LETTERS = window.LOGO_LETTERS || [];
  const SIG = TL.sig;
  const SD = SIG.in - 88.0;            // the signature was designed starting at 88.0
  const CTA = (TL.vo.find(v => v[0] === 'c19') || [0, 75.7])[1];
  scene('agency', `
    <div class="ctr mont" id="ag0" style="font-weight:600;font-size:${P ? 28 : 28}px;letter-spacing:.6em;padding-left:.6em;color:#d4d4dc">${spl('UNE RÉALISATION DE')}</div>
    <div class="abs" id="agring" style="width:400px;height:400px;border-radius:50%;border:6px solid rgba(255,255,255,.9);box-shadow:0 0 40px 10px rgba(255,40,40,.55),inset 0 0 30px rgba(255,255,255,.6)"></div>
    <div class="abs" id="agring2" style="width:400px;height:400px;border-radius:50%;border:5px solid rgba(255,255,255,.85);box-shadow:0 0 40px 10px rgba(255,40,40,.5)"></div>
    <div class="abs" id="aglogo" style="left:${LGX}px;top:${LGY}px;width:${LW_}px;height:${LH_}px">
      <img src="${A}bj_white_mark.png" id="agm" class="abs" style="left:0;top:0;width:100%;height:100%;transform-origin:9% 50%">
      <img src="${A}bj_birdglow.png" id="agglow" class="abs" style="left:0;top:0;width:100%;height:100%;opacity:0;filter:drop-shadow(0 0 10px #fff) drop-shadow(0 0 26px rgba(255,255,255,.8))">
      ${LETTERS.map(L => `<img src="${A}bjl_${L.n}.png" class="abs bjl" data-n="${L.n}" style="left:${(L.x * 100).toFixed(3)}%;top:${(L.y * 100).toFixed(3)}%;width:${(L.w * 100).toFixed(3)}%;height:${(L.h * 100).toFixed(3)}%;transform-origin:50% 100%">`).join('')}
      <div id="agshine" class="abs" style="left:0;top:0;width:100%;height:100%;-webkit-mask:url(${A}boujieka_white.png) 0 0/100% 100% no-repeat;mask:url(${A}boujieka_white.png) 0 0/100% 100% no-repeat"><div id="agband" style="position:absolute;top:-20%;height:140%;width:22%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.95),rgba(255,255,255,0));transform:skewX(-20deg)"></div></div>
    </div>
    ${doveSVG('dove1')}${doveSVG('dove2')}`);
  q('agency', '#ag0').style.top = (LGY - (P ? 100 : 105)) + 'px';
  const DOVE_T = { x: LGX + LW_ * .085, y: LGY + LH_ * .5 };   // the B / dove of the logo
  const doves = [q('agency', '#dove1'), q('agency', '#dove2')];
  doves.forEach(d => d.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,.95)) drop-shadow(0 0 26px rgba(255,255,255,.55)) drop-shadow(0 0 40px rgba(255,40,40,.45))');
  function flap(svg, t, f, amp = 1) {
    const ph = t * f * Math.PI * 2, k = .5 - .5 * Math.cos(ph);
    const th = lerp(18, -72, k) * amp, sy = lerp(1, .55, Math.sin(k * Math.PI));
    const tf = (a, s2) => `translate(262 120) rotate(${a.toFixed(2)}) scale(1 ${s2.toFixed(3)}) translate(-262 -120)`;
    svg.querySelector('.wf').setAttribute('transform', tf(th, sy));
    svg.querySelector('.wb').setAttribute('transform', tf(th * .85 + 10, sy * .9));
  }
  const bez = (p0, p1, p2, u) => [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]];
  const ARR = { a: [-260, H + 180], c: P ? [W * .05, H * .62] : [W * .12, H * .30], b: [DOVE_T.x, DOVE_T.y], t0: SIG.arrive0, d: SIG.land1 - SIG.arrive0 };
  // loop: take off from the B, fly over the word, swing round the end and pass back over the letters, land on the B
  const LOOP = (P ? [[SIG.take - SD, 183, 960], [92.3, 300, 700], [92.75, 600, 560], [93.05, 900, 640], [93.3, 990, 900], [93.9, 300, 925], [94.15, 175, 780], [SIG.land2 - SD, 183, 960]]
    : [[SIG.take - SD, DOVE_T.x, DOVE_T.y], [92.3, 700, 300], [92.75, 1150, 230], [93.05, 1560, 330], [93.3, 1600, 520], [93.9, 760, 505], [94.15, 560, 380], [SIG.land2 - SD, DOVE_T.x, DOVE_T.y]]).map(([a, x, y]) => [a + SD, x, y]);
  function crPoint(t) {
    const L = LOOP; if (t <= L[0][0]) return [L[0][1], L[0][2]]; if (t >= L[L.length - 1][0]) return [L[L.length - 1][1], L[L.length - 1][2]];
    let i = 0; while (t > L[i + 1][0]) i++;
    const p0 = L[Math.max(0, i - 1)], p1 = L[i], p2 = L[i + 1], p3 = L[Math.min(L.length - 1, i + 2)];
    const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
    const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
    return [f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
  }
  let TRAIL = [];

  // gradient text: move the gradient onto each animated letter, shadow via filter
  document.querySelectorAll('.gradOr,.gradBl,.gradGold,.gradWhite').forEach(e => {
    const cls = [...e.classList].filter(c => c.startsWith('grad'));
    const hadSh = e.classList.contains('sh');
    if (hadSh) { e.classList.remove('sh'); e.style.filter = 'drop-shadow(0 10px 6px rgba(0,0,0,.22)) drop-shadow(0 22px 30px rgba(0,0,0,.45))'; }
    const ls = e.querySelectorAll('.l');
    if (ls.length) { e.classList.remove(...cls); ls.forEach(l => l.classList.add(...cls)); }
  });

  // ---------------------------------------------------------------- global element drivers
  let cabAR = 0.816;
  function placeCab({ cx, bottom, h, x = 0, y = 0, s = 1, r = 0, o = 1, clip = null, line = 0, lineX = .6, blur = 0 }) {
    const w = h * cabAR;
    Object.assign(cabWrap.style, { left: (cx - w / 2) + 'px', top: (bottom - h) + 'px', width: w + 'px', height: h + 'px' });
    S(cabWrap, { x, y, s, r, o });
    cab.style.clipPath = clip || 'none';
    cutLine.style.opacity = line; cutLine.style.left = (SPT * 100) + '%'; cutLine.style.top = (HEAD.y1 * 100) + '%'; cutLine.style.height = ((1 - HEAD.y1) * 100 + 2) + '%';
    cutLine.style.transformOrigin = '50% 0'; cutLine.style.transform = `rotate(${(Math.atan2((SPT - SPB) * w, (1 - HEAD.y1) * h) * 180 / Math.PI).toFixed(3)}deg)`;
  }
  // clip polygons in image-normalised coords (head box + one half); split runs along the tie edge
  const HEAD = { x0: .37, x1: .67, y1: .30 };
  const SPT = .63, SPB = .57; // split x at y=HEAD.y1 and at bottom
  const pc = v => (v * 100).toFixed(2) + '%';
  const CLIP_RICH = `polygon(0 0, ${pc(HEAD.x1)} 0, ${pc(HEAD.x1)} ${pc(HEAD.y1)}, ${pc(SPT)} ${pc(HEAD.y1)}, ${pc(SPB)} 100%, 0 100%)`;
  const CLIP_POOR = `polygon(${pc(HEAD.x0)} 0, 100% 0, 100% 100%, ${pc(SPB)} 100%, ${pc(SPT)} ${pc(HEAD.y1)}, ${pc(HEAD.x0)} ${pc(HEAD.y1)})`;
  const SPLITX = SPT;

  function glow(cx, cy, r, o, col) {
    Object.assign(cabGlow.style, { left: cx - r + 'px', top: cy - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px', opacity: o });
    if (col) cabGlow.style.background = col;
  }
  function showBg(k, o, s = 1, x = 0, y = 0) { S(bg[k], { x, y, s, o }); }
  function setTint(css, o) { tint.style.background = css; tint.style.opacity = o; }
  function setGrad(css, o = 1) { bgGrad.style.background = css; bgGrad.style.opacity = o; }
  function setRays(o, t, mode = 0) {
    rays.style.opacity = o;
    const sw = Math.sin(t * .9), sw2 = Math.sin(t * .7 + 1.3);
    const cfg = P ? [[-6, 38 + sw * 6], [-48, -34 + sw2 * 7], [52, 30 - sw * 6], [8, -30 - sw2 * 7]] : [[-12, 30 + sw * 7], [-30, -26 + sw2 * 8], [42, 24 - sw * 7], [12, -22 - sw2 * 8]];
    beams.forEach((b, i) => { b.style.left = (P ? 33 : 33) + cfg[i][0] + '%'; S(b, { r: cfg[i][1], o: mode ? (i < 2 ? .9 : .7) : (i < 2 ? .8 : 0) }); });
  }
  function swooshDraw(t, t0, o = .85, color = '#fff') {
    swoosh.style.opacity = o;
    swPaths.forEach((p, i) => {
      if (!swLen[i]) swLen[i] = p.getTotalLength();
      const L = swLen[i]; const k = pr(t, t0 + i * .18, 1.1, E.io);
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L * (1 - k); p.style.stroke = color;
    });
  }
  function cornerLogo(o) { corner.style.opacity = o; }
  // captions (karaoke)
  let capKey = null;
  function caption(t, t0, t1, key) {
    if (capKey !== key) {
      capKey = key;
      const ws = WT.filter(w => w[0] >= t0 && w[0] < t1 && !/^[!?:.…]+$/.test(w[2]) && !/^(and|with)$/.test(w[2]));
      capSpan.innerHTML = ws.map(w => `<span class="w" data-t="${w[0]}">${w[2].replace('Tchang', 'Dschang').replace(/\.\.\.$/, '…')}</span>`).join(' ');
      capBox.dataset.ws = '1';
    }
    capSpan.querySelectorAll('.w').forEach(s => { const on = t >= +s.dataset.t; s.classList.toggle('on', on); s.classList.toggle('hot', on && t < +s.dataset.t + .35); });
    capBox.style.top = (P ? H - 300 : H - 140) + 'px';
    capSpan.style.fontSize = (P ? 40 : 38) + 'px'; capSpan.style.maxWidth = (P ? 960 : 1700) + 'px';
    const o = win(t, t0 - .1, t1, .25, .2);
    S(capBox, { y: (1 - pr(t, t0 - .1, .35)) * 30, o });
  }

  // ---------------------------------------------------------------- particles
  const R = rng(1234);
  const DUST = [...Array(110)].map(() => ({ x: R() * W, y: R() * H, r: .8 + R() * 3.6, sp: 8 + R() * 30, ph: R() * 6.3, a: .15 + R() * .5, f: .3 + R() * .8 }));
  const CONF_COL = ['#FF6A13', '#FF8F1F', '#1593D6', '#5CC8FF', '#F5B325', '#FFFFFF', '#E3261D'];
  function mkBurst(t0, x, y, n, seed, spd = 1) {
    const r = rng(seed);
    return { t0, list: [...Array(n)].map(() => { const a = -Math.PI / 2 + (r() - .5) * Math.PI * 1.25; const v = (500 + r() * 1300) * spd; return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 10 + r() * 14, h: 6 + r() * 8, c: CONF_COL[(r() * CONF_COL.length) | 0], sp: 4 + r() * 10, ph: r() * 6, rot: r() * 360, k: 1.6 + r() * 1.2 }; }) };
  }
  const CONF = [mkBurst(20.32, W / 2, P ? H * .45 : H * .55, 260, 11), mkBurst(66.05, W / 2, P ? H * .55 : H * .7, 160, 12, .9), mkBurst(74.15, P ? W / 2 : 1360, P ? H * .4 : H * .5, 200, 13, .95), mkBurst(84.6, P ? W / 2 : 1360, P ? H * .42 : H * .55, 150, 14, .85)];
  function mkSpark(t0, x, y, n, rad, seed) { const r = rng(seed); return { t0, list: [...Array(n)].map(() => ({ x: x + (r() - .5) * rad * 2, y: y + (r() - .5) * rad * 1.4, s: 10 + r() * 26, d: r() * .9, l: .5 + r() * .6 })) }; }
  const SPARK = [
    mkSpark(7.35, P ? 885 : 1070, P ? 240 : 270, 18, P ? 110 : 140, 21),
    mkSpark(22.4, W / 2, P ? 600 : 420, 22, P ? 380 : 700, 22),
    mkSpark(43.7, W / 2, H / 2, 26, P ? 420 : 640, 23),
    mkSpark(45.9, P ? W / 2 : W / 2 + 520, P ? H / 2 : H / 2 + 60, 16, 200, 24),
    mkSpark(73.75, P ? W / 2 : 1360, P ? 1550 : 700, 24, P ? 460 : 520, 25), mkSpark(84.58, P ? W / 2 : 1250, P ? 300 : 310, 22, P ? 420 : 460, 29),
    mkSpark(TL.sig.land1, P ? 183 : 545, P ? 960 : 550, 22, 160, 26), mkSpark(TL.sig.agency0, W / 2, H / 2, 24, P ? 420 : 520, 27), mkSpark(TL.sig.land2, P ? 183 : 545, P ? 960 : 550, 26, 180, 28),
  ];
  function drawFx(t, dust) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    if (dust > 0) {
      for (const d of DUST) {
        const y = ((d.y - t * d.sp) % (H + 40) + H + 40) % (H + 40) - 20, x = d.x + Math.sin(t * d.f + d.ph) * 18;
        ctx.globalAlpha = d.a * dust * (.6 + .4 * Math.sin(t * 2 * d.f + d.ph));
        ctx.fillStyle = '#FFE2B8'; ctx.beginPath(); ctx.arc(x, y, d.r, 0, 6.283); ctx.fill();
        ctx.globalAlpha *= .25; ctx.beginPath(); ctx.arc(x, y, d.r * 3, 0, 6.283); ctx.fill();
      }
    }
    for (const b of CONF) {
      const lt = t - b.t0; if (lt < 0 || lt > 4.2) continue;
      const fade = 1 - clamp((lt - 3.2) / 1);
      for (const p of b.list) {
        const e = (1 - Math.exp(-p.k * lt)) / p.k, g = 900;
        const x = p.x + p.vx * e + Math.sin(lt * p.sp * .5 + p.ph) * 22;
        const y = p.y + (p.vy + g / p.k) * e - g * lt / p.k;
        if (y > H + 40) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate((p.rot + lt * p.sp * 40) * Math.PI / 180);
        ctx.scale(1, Math.cos(lt * p.sp + p.ph)); ctx.globalAlpha = fade; ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
    }
    for (const b of SPARK) {
      for (const s of b.list) {
        const lt = (t - b.t0 - s.d) / s.l; if (lt < 0 || lt > 1) continue;
        const k = Math.sin(lt * Math.PI), sz = s.s * k;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(lt * .8); ctx.globalAlpha = k;
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, sz); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,225,140,.85)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = gr; ctx.beginPath();
        ctx.moveTo(0, -sz); ctx.quadraticCurveTo(0, 0, sz, 0); ctx.quadraticCurveTo(0, 0, 0, sz); ctx.quadraticCurveTo(0, 0, -sz, 0); ctx.quadraticCurveTo(0, 0, 0, -sz); ctx.fill();
        ctx.globalAlpha = k * .5; ctx.beginPath(); ctx.arc(0, 0, sz * .35, 0, 6.283); ctx.fill(); ctx.restore();
      }
    }
    if (TRAIL.length > 1) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [col, wm, am] of [['255,40,40', 2.4, .3], ['255,170,170', 1.2, .5], ['255,255,255', .5, .95]]) {
        for (let i = 0; i < TRAIL.length - 1; i += 5) {
          const seg = TRAIL.slice(i, i + 6); if (seg.length < 2) break;
          ctx.globalAlpha = seg[0][2] * am; ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = seg[0][3] * wm;
          ctx.beginPath(); ctx.moveTo(seg[0][0], seg[0][1]); for (const [x, y] of seg.slice(1)) ctx.lineTo(x, y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- camera
  const SHAKES = [[10.63, .35, 9], [20.3, .5, 16], [31.25, .2, 5], [39.72, .2, 6], [41.84, .2, 6], [45.85, .3, 10], [63.8, .35, 10], [67.55, .3, 7], [84.6, .3, 6], [TL.sig.land1, .25, 5], [TL.sig.land2, .25, 4]];
  const BEATS = TL.beats;
  function camera(t, sceneName) {
    let x = 0, y = 0, r = 0;
    for (const [t0, d, a] of SHAKES) {
      const lt = t - t0; if (lt < 0 || lt > d) continue;
      const k = (1 - lt / d) * a; x += Math.sin(lt * 83) * k; y += Math.cos(lt * 71) * k * .8; r += Math.sin(lt * 57) * k * .03;
    }
    let s = 1;
    if (t > 20.6 && sceneName !== 'agency' && sceneName !== 'partners') {
      let last = -9; for (const b of BEATS) { if (b <= t) last = b; else break; }
      s += .0065 * Math.exp(-(t - last) * 9);
    }
    S(world, { x, y, r, s });
  }

  // ---------------------------------------------------------------- transitions (wipes)
  const CUTS = [4.75, 9.0, 12.75, 15.0, 25.35, 29.85, 36.55, 47.35, 57.85, 62.65, 67.55];
  function wipes(t) {
    const bw = W * 1.45; wipeA.style.width = bw + 'px'; wipeB.style.width = bw + 'px';
    let shown = false;
    CUTS.forEach((c, i) => {
      const d = .56, lt = (t - (c - d / 2)) / d;
      if (lt < 0 || lt > 1.12) return;
      shown = true;
      const a = E.io(clamp(lt)), b = E.io(clamp(lt - .12));
      const flip = i % 2 ? -1 : 1;
      const xa = lerp(-bw - W * .3, W + W * .3, a), xb = lerp(-bw - W * .3, W + W * .3, b);
      const ma = flip > 0 ? xa : W - xa - bw, mb = flip > 0 ? xb : W - xb - bw;
      const A1 = i % 2 ? wipeB : wipeA, B1 = i % 2 ? wipeA : wipeB;
      A1.style.transform = `translateX(${ma}px) skewX(${-18 * flip}deg)`; A1.style.opacity = 1;
      B1.style.transform = `translateX(${mb}px) skewX(${-18 * flip}deg)`; B1.style.opacity = 1;
    });
    if (!shown) { wipeA.style.opacity = 0; wipeB.style.opacity = 0; }
  }

  // ---------------------------------------------------------------- per-scene update
  const U = {};
  U.intro = (t) => {
    const e = SC.intro.el;
    showBg('stageB', pr(t, 0, 1.4, E.io), lerp(1.16, 1.06, pr(t, 0, 4.75, E.out)));
    setTint('radial-gradient(ellipse at 50% 45%,rgba(6,26,51,.25),rgba(0,0,0,.85))', 1 - pr(t, .2, 1.6) * .35);
    setRays(pr(t, .3, 1.2) * .85, t);
    letters(q('intro', '#i1'), t, .78, .045, .55, popL(70, .3));
    letters(q('intro', '#i2'), t, 1.2, .03, .5, popL(50, .5));
    const w3 = q('intro', '#i3').querySelectorAll('.l');
    const tw = [wt('chers', 2), wt('chers', 2), wt('amis', 2), wt('amis', 2), wt('de', 2.7), wt('de', 2.7), wt('Tchang', 2.8)];
    w3.forEach((l, i) => { const p = pr(t, tw[i] - .05, .4, E.back); S(l, { y: (1 - p) * 26, o: clamp(p * 2) }); });
    const p4 = pr(t, wt('ailleurs', 3) - .15, .55, E.back2); S(q('intro', '#i4'), { s: lerp(.4, 1, p4), o: clamp(p4 * 2), r: lerp(-8, -3, p4) });
    const out = pr(t, 4.35, .4, E.in); S(e, { s: 1 + out * .18, o: 1 - out });
    return { dust: .9, corner: 0 };
  };
  U.rich = (t) => {
    const lt = t - 4.75;
    showBg('city', 1, lerp(1.05, 1.12, pr(t, 4.75, 4.3, E.lin)), lerp(0, P ? -20 : -40, pr(t, 4.75, 4.3, E.lin)));
    setTint(P ? 'linear-gradient(180deg,rgba(6,26,51,.55),rgba(6,26,51,0) 30%,rgba(6,26,51,0) 60%,rgba(6,26,51,.7))' : 'linear-gradient(90deg,rgba(6,26,51,.75),rgba(6,26,51,.15) 55%,rgba(6,26,51,0)),linear-gradient(0deg,rgba(255,140,40,.25),rgba(0,0,0,0) 40%)', 1);
    const pin = pr(t, 4.82, .7, E.outQuint);
    const cx = P ? W / 2 + 70 : 1360, h = P ? 1240 : 1060;
    placeCab({ cx, bottom: H + 14, h, x: (1 - pin) * (P ? 600 : 700), s: lerp(1.04, 1, pr(t, 4.82, 4)), o: clamp(pin * 3), clip: CLIP_RICH, line: pr(t, 5.3, .4), lineX: SPLITX });
    glow(cx - (P ? 60 : 80), H - h * .55, h * .62, .55 * pin, 'radial-gradient(closest-side,rgba(255,210,120,.7),rgba(255,140,40,.25) 50%,rgba(255,120,30,0))');
    const ps = pr(t, 5.0, .6, E.back2); S(richSt, { s: lerp(.3, 1, ps), r: lerp(-14, -3, ps), o: clamp(ps * 2), y: Math.sin(lt * 1.6) * 6 });
    const sp = pr(t, wt('cuillère', 7) - .1, .6, E.back2); S(q('rich', '#spoon'), { s: lerp(0, 1, sp), r: lerp(-60, 18, sp) + Math.sin(lt * 3) * 4, o: clamp(sp * 3) });
    caption(t, 4.95, 8.9, 'c02');
    return { dust: .35, corner: 1 };
  };
  U.poor = (t) => {
    const lt = t - 9;
    showBg('slum', 1, lerp(1.05, 1.12, pr(t, 9, 3.8, E.lin)), lerp(0, P ? 20 : 40, pr(t, 9, 3.8, E.lin)));
    setTint(P ? 'linear-gradient(180deg,rgba(6,26,51,.55),rgba(6,26,51,0) 30%,rgba(6,26,51,0) 60%,rgba(6,26,51,.7))' : 'linear-gradient(270deg,rgba(6,26,51,.78),rgba(6,26,51,.15) 55%,rgba(6,26,51,0)),linear-gradient(0deg,rgba(20,90,160,.25),rgba(0,0,0,0) 40%)', 1);
    const pin = pr(t, 9.05, .7, E.outQuint);
    const cx = P ? W / 2 - 60 : 520, h = P ? 1240 : 1060;
    placeCab({ cx, bottom: H + 14, h, x: -(1 - pin) * (P ? 600 : 700), s: lerp(1.04, 1, pr(t, 9.05, 3.6)), o: clamp(pin * 3), clip: CLIP_POOR, line: pr(t, 9.5, .4), lineX: SPLITX });
    glow(cx + 60, H - h * .55, h * .6, .4 * pin, 'radial-gradient(closest-side,rgba(140,200,255,.55),rgba(40,120,200,.2) 50%,rgba(20,90,160,0))');
    const ps = pr(t, 9.25, .6, E.back2); S(poorSt, { s: lerp(.3, 1, ps), r: lerp(14, 3, ps), o: clamp(ps * 2), y: Math.sin(lt * 1.6) * 6 });
    const tm = wt('machette', 9.5);
    ['#ha1', '#ha2', '#ha3'].forEach((s, i) => {
      const p = pr(t, 11.6 + i * .28, .45, E.back2); const out = pr(t, 12.35 + i * .05, .3, E.in);
      S(q('poor', s), { s: lerp(.2, 1, p) * (1 + .06 * Math.sin((t - 11.6) * 18 + i)), r: (i - 1) * 12 + Math.sin(t * 9 + i) * 6, o: clamp(p * 2) * (1 - out) });
    });
    caption(t, 9.2, 12.4, 'c03');
    return { dust: .25, corner: 1 };
  };
  U.split = (t) => {
    const lt = t - 12.75, k = pr(t, 12.78, .5, E.outQuint);
    const sx = P ? .62 : .58, ex = P ? .38 : .42; // diagonal top/bottom x
    const off = (1 - k) * .6;
    splitL.style.opacity = 1; splitR.style.opacity = 1;
    splitL.style.clipPath = `polygon(0 0,${(sx - off) * 100}% 0,${(ex - off) * 100}% 100%,0 100%)`;
    splitR.style.clipPath = `polygon(${(sx + off) * 100}% 0,100% 0,100% 100%,${(ex + off) * 100}% 100%)`;
    S(splitL.querySelector('img'), { s: lerp(1.1, 1.04, pr(t, 12.75, 2.3)), x: -40 * k });
    S(splitR.querySelector('img'), { s: lerp(1.1, 1.04, pr(t, 12.75, 2.3)), x: 40 * k });
    const dv = q('split', '#spdiv'); dv.style.left = (W * (sx + ex) / 2 - 4) + 'px';
    S(dv, { r: Math.atan2(W * (sx - ex), H) * -180 / Math.PI * -1, o: k, sy: k });
    setTint('linear-gradient(0deg,rgba(6,26,51,.65),rgba(6,26,51,0) 45%),linear-gradient(180deg,rgba(6,26,51,.55),rgba(6,26,51,0) 35%)', 1);
    const ci = pr(t, 12.85, .6, E.back);
    placeCab({ cx: W / 2, bottom: H + 14, h: P ? 1300 : 1000, s: lerp(.86, 1, ci), o: clamp(ci * 3) });
    glow(W / 2, H - (P ? 700 : 560), P ? 760 : 620, .5 * ci, 'radial-gradient(closest-side,rgba(255,255,255,.55),rgba(255,200,140,.2) 55%,rgba(255,180,120,0))');
    const a = pr(t, wt('riche', 12.9) - .3, .5, E.back2), b = pr(t, wt('ou', 13.5) - .05, .4, E.back2), c = pr(t, wt('pauvre', 13.9) - .25, .5, E.back2), d = pr(t, 14.35, .5, E.elastic);
    S(spR, { s: lerp(.3, 1, a), r: lerp(-16, -4, a), o: clamp(a * 2) });
    S(q('split', '#spou'), { s: lerp(.2, 1, b), o: clamp(b * 2) });
    S(spP, { s: lerp(.3, 1, c), r: lerp(16, 4, c), o: clamp(c * 2) });
    S(q('split', '#spq'), { s: lerp(.1, 1, d), r: lerp(-40, 12, d) + Math.sin(lt * 4) * 3, o: clamp(d * 3) });
    return { dust: .2, corner: 1 };
  };
  U.presents = (t) => {
    showBg('stageB', 1, lerp(1.06, 1.16, pr(t, 15, 5.25, E.io)));
    setTint('radial-gradient(ellipse at 50% 40%,rgba(6,26,51,.35),rgba(0,0,0,.88))', 1);
    setRays(.75 + .25 * pr(t, 19.2, .8), t * 1.3);
    const g1 = SC.presents.el.querySelector('#pg1'), g2 = SC.presents.el.querySelector('#pg2');
    const c = pr(t, 15.18, .6, E.back);
    S(q('presents', '#afcCard'), { s: lerp(.5, 1, c), o: clamp(c * 2), ry: (1 - c) * 50, persp: 1400 });
    const a1 = q('presents', '#pa1').querySelectorAll('.l');
    a1.forEach((l, i) => { const p = pr(t, 15.3 + i * .14, .45, E.back); S(l, { y: (1 - p) * 30, o: clamp(p * 2) }); });
    q('presents', '#pa2').querySelectorAll('.l').forEach((l, i) => { const p = pr(t, wt('de', 16.3) - .05 + i * .1, .45, E.back); S(l, { y: (1 - p) * 30, o: clamp(p * 2) }); });
    letters(q('presents', '#pa3'), t, wt('présente', 16.9) - .05, .06, .45, popL(30, .6));
    const g1o = pr(t, 17.95, .3, E.in); S(g1, { y: -g1o * 80, s: 1 - g1o * .15, o: 1 - g1o });
    q('presents', '#pb1').querySelectorAll('.l').forEach((l, i) => { const p = pr(t, wt('le', 18) - .05 + i * .07, .4, E.back); S(l, { y: (1 - p) * 30, o: clamp(p * 2) }); });
    letters(q('presents', '#pb2'), t, wt('humour', 18.7) - .12, .045, .5, popL(80, .3));
    letters(q('presents', '#pb3'), t, wt('gospel', 19) - .1, .05, .55, (l, p, i) => S(l, { y: (1 - p) * 120, s: lerp(.2, 1, p), r: (1 - p) * (i % 2 ? 20 : -20), o: clamp(p * 3) }));
    const z = pr(t, 19.75, .5, E.inExpo);
    S(g2, { s: 1 + z * .5, o: 1 - pr(t, 20.0, .22, E.lin) });
    fadeEl.style.opacity = pr(t, 19.9, .3, E.in) * .85;
    return { dust: 1, corner: 0 };
  };
  U.title = (t) => {
    const lt = t - 20.25;
    flash.style.opacity = 1 - pr(t, 20.25, .55, E.out);
    showBg('stage', 1, lerp(1.14, 1.05, pr(t, 20.25, 5, E.out)));
    setTint(P ? 'linear-gradient(0deg,rgba(6,26,51,.85),rgba(6,26,51,.2) 35%,rgba(6,26,51,0) 60%,rgba(6,26,51,.4))' : 'linear-gradient(0deg,rgba(6,26,51,.8),rgba(6,26,51,.1) 45%,rgba(6,26,51,0) 70%,rgba(6,26,51,.35))', 1);
    setRays(.9, t * 1.6, 1);
    const ci = pr(t, 20.27, .7, E.back2);
    const h = P ? 1110 : 1060, bottom = P ? 1390 : H + 20;
    placeCab({ cx: W / 2, bottom, h, s: lerp(1.35, 1, ci) * (1 + .03 * pr(t, 21, 4.3, E.lin)), o: clamp(ci * 4) });
    glow(W / 2, bottom - h * .55, h * .7, .9 * ci, 'radial-gradient(closest-side,rgba(255,220,160,.85),rgba(255,140,40,.35) 50%,rgba(255,120,30,0))');
    const n1 = pr(t, 20.32, .42, E.outExpo), n2 = pr(t, 20.42, .42, E.outExpo);
    const breathe = 1 + .025 * pr(t, 20.8, 4.5, E.lin);
    S(q('title', '#tn1'), { x: -(1 - n1) * W * 1.1, s: breathe, o: clamp(n1 * 3) });
    S(q('title', '#tn2'), { x: (1 - n2) * W * 1.1, s: breathe, o: clamp(n2 * 3) });
    letters(q('title', '#tn3'), t, wt('spectacle', 22.3) - .2, .035, .4, fadeUp(24));
    const a = pr(t, wt('riche', 23.3) - .2, .5, E.back2), b = pr(t, wt('pauvre', 24) - .2, .5, E.back2);
    S(tR, { s: lerp(.3, 1, a), r: lerp(-18, -4, a) + Math.sin(lt * 2) * 1.5, o: clamp(a * 2) });
    S(tP, { s: lerp(.3, 1, b), r: lerp(18, 4, b) - Math.sin(lt * 2) * 1.5, o: clamp(b * 2) });
    return { dust: .7, corner: 0 };
  };
  U.joy = (t) => {
    const lt = t - 25.35;
    showBg('stageB', 1, lerp(1.05, 1.12, pr(t, 25.35, 4.5, E.lin)));
    setTint(P ? 'linear-gradient(180deg,rgba(6,26,51,.8),rgba(6,26,51,.35) 45%,rgba(6,26,51,0) 70%)' : 'linear-gradient(90deg,rgba(6,26,51,.88),rgba(6,26,51,.4) 50%,rgba(6,26,51,0) 75%)', 1);
    setRays(.55, t);
    const ci = pr(t, 25.4, .8, E.outQuint);
    const h = P ? 2050 : 1950;
    placeCab({ cx: P ? W / 2 + 40 : 1440, bottom: P ? H + h * .5 : H + h * .56, h, x: (1 - ci) * (P ? 0 : 300), y: (1 - ci) * (P ? 300 : 0), s: 1 + .05 * pr(t, 25.4, 4.4, E.lin), o: clamp(ci * 3) });
    glow(P ? W / 2 : 1440, P ? 1300 : 420, P ? 700 : 620, .6 * ci, 'radial-gradient(closest-side,rgba(255,210,140,.6),rgba(255,140,40,.2) 55%,rgba(255,120,30,0))');
    q('joy', '#j1').querySelectorAll('.l').forEach((l, i) => { const p = pr(t, wt('soirée', 25.4) - .25 + i * .08, .45, E.back); S(l, { y: (1 - p) * 30, o: clamp(p * 2) }); });
    letters(q('joy', '#j2'), t, wt('rire', 26) - .1, .06, .5, (l, p, i) => S(l, { y: (1 - p) * 140 + Math.sin((t - 26.4) * 14 + i * 1.3) * 10 * p, r: Math.sin((t - 26.4) * 11 + i) * 5 * p, s: lerp(.2, 1, p), o: clamp(p * 3) }));
    q('joy', '#j3').querySelectorAll('.l').forEach((l, i) => { const p = pr(t, wt('aux', 26.5) - .08 + i * .12, .45, E.back2); S(l, { y: (1 - p) * 40, s: lerp(.5, 1, p), o: clamp(p * 2) }); });
    q('joy', '#j4').querySelectorAll('.l').forEach((l, i) => { const p = pr(t, wt('et', 27.3) - .05 + i * .1, .45, E.back); S(l, { y: (1 - p) * 30, o: clamp(p * 2) }); });
    const p5 = pr(t, wt('joie', 28.2) - .35, .6, E.back2); S(q('joy', '#j5'), { s: lerp(.4, 1, p5), r: lerp(-10, -3, p5), o: clamp(p5 * 2) });
    ['#jh1', '#jh2'].forEach((s, i) => {
      const p = pr(t, 26.7 + i * .5, .45, E.back2), out = pr(t, 28.6 + i * .2, .4, E.in);
      S(q('joy', s), { s: lerp(.2, 1, p) * (1 + .05 * Math.sin(t * 16 + i)), r: (i ? 12 : -10) + Math.sin(t * 8 + i) * 5, o: clamp(p * 2) * (1 - out) });
    });
    return { dust: .6, corner: 1 };
  };
  U.date = (t) => {
    setGrad('radial-gradient(ellipse at 50% 30%,#0E3D6E 0%,#061A33 70%,#030C19 100%)', 1);
    showBg('stageB', .18, 1.1);
    swooshDraw(t, 29.9, .5);
    letters(q('date', '#d0'), t, wt('rendez', 30) - .15, .04, .45, popL(40, .5));
    S(q('date', '#d0l'), { sx: pr(t, 30.5, .6, E.outQuint), o: 1 });
    const cards = ['#c1', '#c2', '#c3'], tt = [wt('dimanche', 30.5) - .25, wt('à', 33) - .1, wt('salle', 34.3) - .25];
    cards.forEach((s, i) => {
      const p = pr(t, tt[i], .7, E.back);
      S(q('date', s), { persp: 1600, ry: (1 - p) * (P ? 0 : 75), rx: (1 - p) * (P ? 70 : 0), s: lerp(.7, 1, p), y: (1 - p) * 60 + Math.sin((t - tt[i]) * 1.4) * 4 * p, o: clamp(p * 2.5) });
    });
    const p1a = pr(t, wt('dimanche', 30.5) - .05, .4, E.back); S(q('date', '#c1a'), { y: (1 - p1a) * 20, o: p1a });
    const p1b = pr(t, wt('vingt-cinq', 31) - .08, .5, E.back2); S(q('date', '#c1b'), { s: lerp(1.8, 1, p1b), o: clamp(p1b * 3) });
    const p1c = pr(t, wt('octobre', 31.4) - .05, .4, E.back); S(q('date', '#c1c'), { y: (1 - p1c) * 20, o: p1c });
    const p2b = pr(t, wt('dix-sept', 33) - .08, .5, E.back2); S(q('date', '#c2b'), { s: lerp(1.8, 1, p2b), o: clamp(p2b * 3) });
    const p2c = pr(t, wt('précises', 33.6) - .05, .4, E.back); S(q('date', '#c2c'), { y: (1 - p2c) * 20, o: p2c });
    const hr = pr(t, 33.2, 1.0, E.outQuint);
    q('date', '#hh').setAttribute('transform', `rotate(${lerp(0, 150, hr)} 50 50)`);
    q('date', '#mh').setAttribute('transform', `rotate(${lerp(-360, 0, hr)} 50 50)`);
    const pn = pr(t, wt('salle', 34.3) - .1, .6, E.elastic); S(q('date', '#pin'), { y: (1 - pn) * -60, o: clamp(pn * 3) });
    const p3b = pr(t, wt('manu', 34.8) - .08, .5, E.back2); S(q('date', '#c3b'), { s: lerp(1.6, 1, p3b), o: clamp(p3b * 3) });
    const p3c = pr(t, wt('dibango', 35) + .2, .4, E.back); S(q('date', '#c3c'), { y: (1 - p3c) * 20, o: p3c });
    return { dust: .3, corner: 1 };
  };
  // tickets choreography
  const TKC = P ? { c: [W / 2, H / 2 + 60], cs: .67, slot: { vvip: [W / 2, 640], vip: [W / 2, 1035], classique: [W / 2, 1430] }, ss: .64, sr: 0 }
    : { c: [W / 2, H / 2 + 70], cs: 1.0, slot: { vvip: [W / 2 - 130, 400], vip: [W / 2, 590], classique: [W / 2 + 130, 780] }, ss: .7, sr: -4 };
  const TKT = { classique: [38.7, wt('mille', 39.5), 40.5], vip: [40.8, wt('trois', 41.6), 42.7], vvip: [43.0, wt('cinq', 45.6), 46.35] };
  const ZO = { classique: 1, vip: 2, vvip: 3 };
  U.tickets = (t) => {
    setGrad('radial-gradient(ellipse at 50% 55%,#1A8AD0 0%,#0B5E9E 45%,#061A33 100%)', 1);
    showBg('stageB', .12, 1.1);
    swooshDraw(t, 36.6, .55);
    letters(q('tickets', '#kh'), t, wt('tickets', 36.8) - .15, .035, .45, popL(50, .4));
    const hh = pr(t, 38.45, .5, E.io);
    S(q('tickets', '#kh'), { s: lerp(1, P ? .8 : .72, hh), y: lerp(P ? 60 : 160, P ? -10 : -6, pr(t, 36.6, .01)) * (1 - hh) + (P ? -10 : -6) * hh });
    for (const k of ['classique', 'vip', 'vvip']) {
      const e = TK[k], [tin, tpr, tslot] = TKT[k];
      const pin = pr(t, tin, .7, E.outQuint), ps = pr(t, tslot, .55, E.io);
      if (t < tin) { e.style.opacity = 0; continue; }
      const cx = lerp(TKC.c[0], TKC.slot[k][0], ps), cy = lerp(TKC.c[1], TKC.slot[k][1], ps);
      const sc = lerp(TKC.cs, TKC.ss, ps);
      const x = cx - 750 + (1 - pin) * W * .9, y = cy - 260 + (1 - pin) * (P ? 200 : 260);
      const presenting = t >= tin && t < tslot + .3;
      e.style.zIndex = presenting ? 10 : ZO[k];
      // price punch
      const pp = pr(t, tpr - .05, .25, E.out) * (1 - pr(t, tpr + .25, .35, E.io));
      const float = Math.sin((t - tin) * 1.3 + ZO[k]) * 6;
      S(e, { persp: 2200, x, y: y + float, ry: (1 - pin) * -70, r: lerp(P ? -2 : -5, TKC.sr, ps) + (1 - pin) * 12, s: sc * (1 + pp * .04), o: clamp(pin * 3) });
      // dim others while one is presenting
      let dim = 1;
      for (const k2 of ['classique', 'vip', 'vvip']) if (k2 !== k) { const [a, , b] = TKT[k2]; if (t > a && t < b + .2 && t > TKT[k][2] + .3) dim = .55; }
      e.style.filter = dim < 1 ? 'drop-shadow(0 30px 40px rgba(0,0,0,.45)) brightness(.6)' : '';
      const sh = e.querySelector('.shine'); const shk = pr(t, tpr, .6, E.io); sh.style.left = lerp(-150, 220, shk) + '%';
      const stub = e.querySelector('.t-stub .vt .b'); S(stub, { s: 1 + pp * .18 });
    }
    return { dust: .25, corner: 1 };
  };
  U.phone = (t) => {
    const lt = t - 47.35;
    setGrad('radial-gradient(ellipse at 50% 40%,#FF9A35 0%,#FF6A13 45%,#C93F08 100%)', 1);
    S(q('phone', '#ph_rot'), { r: lt * 6, o: 1 });
    const ip = pr(t, 47.4, .6, E.back2); const ring = Math.sin(lt * 38) * 8 * (Math.sin(lt * 3.1) > .2 ? 1 : 0);
    S(q('phone', '#ph_icon'), { s: lerp(.2, 1, ip), r: ring * ip, o: clamp(ip * 3) });
    [['#ring1', 0], ['#ring2', .6]].forEach(([s, d]) => { const k = ((lt + d) % 1.2) / 1.2; S(q('phone', s), { s: 1 + k * 1.1, o: (1 - k) * .7 * ip }); });
    const r1 = pr(t, wt('réservations', 47.4) - .1, .4, E.lin), rep = pr(t, wt('répète', 52.9) - .25, .3, E.lin);
    letters(q('phone', '#ph_t1'), t, wt('réservations', 47.4) - .15, .03, .4, (l, p) => S(l, { y: (1 - p) * 30 - rep * 40, o: clamp(p * 2) * (1 - rep) }));
    letters(q('phone', '#ph_t2'), t, wt('répète', 52.9) - .25, .035, .4, popL(40, .4));
    const g0 = pr(t, wt('six', 48.6) - .35, .45, E.back);
    S(q('phone', '#g0'), { y: (1 - g0) * 30, o: clamp(g0 * 2) });
    const T1 = [wt('six', 48.6), wt('quarante-trois', 49.5), wt('soixante-sept', 50.3), wt('quatre-vingt', 51)];
    const T2 = [wt('six', 53.5), wt('quarante-trois', 54.5), wt('soixante-sept', 55.3), wt('quatre-vingt', 56)];
    ['#g1', '#g2', '#g3', '#g4'].forEach((s, i) => {
      const p = pr(t, T1[i] - .06, .5, E.back2);
      const hp = pr(t, T2[i] - .06, .18, E.out) * (1 - pr(t, T2[i] + .3, .4, E.io));
      const g = q('phone', s);
      S(g, { y: (1 - p) * 90 - hp * 18, s: lerp(.3, 1, p) * (1 + hp * .14), o: clamp(p * 3) });
      g.style.color = hp > .05 ? `rgb(${lerp(255, 6, hp)},${lerp(255, 26, hp)},${lerp(255, 51, hp)})` : '#fff';
    });
    const pl = pr(t, 51.95, .55, E.back2); S(q('phone', '#ph_pill'), { s: lerp(.5, 1, pl) * (1 + .02 * Math.sin(lt * 5)), o: clamp(pl * 2) });
    return { dust: 0, corner: 1 };
  };
  U.partners = (t) => {
    setGrad('radial-gradient(ellipse at 50% 45%,#FFFFFF 0%,#F4F9FD 55%,#DDEBF6 100%)', 1);
    swooshDraw(t, 57.9, .35, '#1593D6');
    vign.style.opacity = .35;
    q('partners', '#pt0').querySelectorAll('.l').forEach((l, i) => { const p = pr(t, wt('avec', 57.9) - .1 + i * .07, .45, E.back); S(l, { y: (1 - p) * 30, o: clamp(p * 2) }); });
    S(q('partners', '#pt0l'), { sx: pr(t, 58.5, .6, E.outQuint), o: 1 });
    // layout logos (computed every frame - cheap)
    const hs = P ? [210, 165, 230, 230, 165] : [250, 180, 265, 265, 180];
    const ws = PL.map((im, i) => hs[i] * (im.naturalWidth / im.naturalHeight || 1));
    const T = [wt("l'ambassade", 58.5) - .1, wt("l'institut", 60) - .1, 61.25, 61.5, 61.75];
    const pos = [];
    if (P) {
      const r1 = [0, 1], r2 = [2, 3, 4], gap = 60;
      const tw1 = ws[0] + ws[1] + gap; let x = (W - tw1) / 2; r1.forEach(i => { pos[i] = [x, 760 - hs[i] / 2]; x += ws[i] + gap; });
      const tw2 = ws[2] + ws[3] + ws[4] + 2 * gap * .7; x = (W - tw2) / 2; r2.forEach(i => { pos[i] = [x, 1080 - hs[i] / 2]; x += ws[i] + gap * .7; });
    } else {
      const gap = 80, tw = ws.reduce((a, b) => a + b, 0) + gap * 4; let x = (W - tw) / 2;
      ws.forEach((w, i) => { pos[i] = [x, 640 - hs[i] / 2]; x += w + gap; });
    }
    PL.forEach((im, i) => {
      Object.assign(im.style, { left: pos[i][0] + 'px', top: pos[i][1] + 'px', height: hs[i] + 'px', width: ws[i] + 'px' });
      const p = pr(t, T[i], .55, E.back2); S(im, { y: (1 - p) * 50, s: lerp(.4, 1, p), o: clamp(p * 2) });
    });
    return { dust: 0, corner: 0 };
  };
  U.together = (t) => {
    const lt = t - 62.65;
    showBg('stage', 1, lerp(1.06, 1.13, pr(t, 62.65, 4.9, E.lin)));
    setTint('linear-gradient(180deg,rgba(6,26,51,.82),rgba(6,26,51,.55) 50%,rgba(6,26,51,.75))', 1);
    setRays(.7, t * 1.2, 1);
    const p1 = pr(t, wt('alors', 62.7) - .15, .5, E.back2); S(q('together', '#g_1'), { s: lerp(.3, 1, p1), r: lerp(-10, -4, p1), o: clamp(p1 * 2) });
    q('together', '#g_2').querySelectorAll('.l').forEach((l, i) => { const ti = [wt('ne', 63.2), 0, wt('viens', 63.3), 0, wt('pas', 63.5)][i] || 63.4; const p = pr(t, ti - .08, .4, E.back2); S(l, { y: (1 - p) * 70, s: lerp(.4, 1, p), o: clamp(p * 2) }); });
    letters(q('together', '#g_3'), t, wt('seul', 63.6) - .12, .04, .45, (l, p, i) => S(l, { y: (1 - p) * 140, s: lerp(.2, 1, p), r: (1 - p) * (i % 2 ? 25 : -25) + Math.sin((t - 63.8) * 20 + i) * 2.5 * p * (1 - pr(t, 64.4, .6)), o: clamp(p * 3) }));
    q('together', '#g_4').querySelectorAll('.l').forEach((l, i) => { const ti = [wt('viens', 64.3), 0, wt('en', 64.5), 0, wt('famille', 64.6)][i] || 64.5; const p = pr(t, ti - .08, .4, E.back); S(l, { y: (1 - p) * 40, o: clamp(p * 2) }); });
    const p5 = pr(t, wt('viens', 65.1) - .1, .6, E.back2); S(q('together', '#g_5'), { s: lerp(.4, 1, p5), r: lerp(8, -2, p5), o: clamp(p5 * 2) });
    return { dust: .7, corner: 1 };
  };
  U.final = (t) => {
    const lt = t - 67.55;
    showBg('stageB', 1, lerp(1.08, 1.03, pr(t, 67.55, 13, E.out)));
    setGrad('linear-gradient(0deg,rgba(0,0,0,0),rgba(0,0,0,0))', 0);
    setTint(P ? 'linear-gradient(180deg,rgba(6,26,51,.88),rgba(6,26,51,.55) 30%,rgba(6,26,51,.25) 50%,rgba(6,26,51,.92) 66%,#061A33)' : 'linear-gradient(90deg,rgba(6,26,51,.35),rgba(6,26,51,.55) 40%,rgba(6,26,51,.94) 52%,#061A33)', 1);
    swooshDraw(t, 67.7, .32);
    setRays(.5, t, 0);
    const ci = pr(t, 67.6, .8, E.outQuint);
    const h = P ? 900 : 1040, cx = P ? W / 2 : 450, bottom = P ? 1330 : H + 16;
    placeCab({ cx, bottom, h, x: (1 - ci) * (P ? 0 : -500), y: (1 - ci) * (P ? 200 : 0), s: (1 + .02 * Math.sin(lt * .8)) * lerp(1.06, 1, ci), o: clamp(ci * 3) });
    glow(cx, bottom - h * .55, h * .62, .8 * ci, 'radial-gradient(closest-side,rgba(255,210,140,.75),rgba(255,140,40,.3) 50%,rgba(255,120,30,0))');
    const sa = pr(t, 67.75, .5, E.back2), sb = pr(t, 67.95, .5, E.back2);
    S(fR, { s: lerp(.3, 1, sa), r: lerp(-14, -3, sa), o: clamp(sa * 2) }); S(fP, { s: lerp(.3, 1, sb), r: lerp(14, 3, sb), o: clamp(sb * 2) });
    const n = pr(t, wt('cabrel', 67.6) - .1, .5, E.outExpo); S(q('final', '#f_name'), { x: (1 - n) * (P ? 0 : 160), y: (1 - n) * (P ? 40 : 0), o: clamp(n * 2) });
    const es = pr(t, wt('spectacle', 68.7) - .2, .5, E.out); S(q('final', '#f_es'), { y: (1 - es) * 20, o: es });
    const bp = pr(t, wt('dimanche', 69.6) - .2, .55, E.back); S(fBar, { y: (1 - bp) * 60, s: lerp(.9, 1, bp), o: clamp(bp * 2) });
    const cells = fBar.querySelectorAll('.cell'); const ct = [wt('dimanche', 69.6) - .1, wt('octobre', 70.3) + .15, wt('salle', 71) - .1];
    cells.forEach((c, i) => { const p = pr(t, ct[i], .4, E.back); S(c, { y: (1 - p) * 20, o: p }); });
    pills.forEach((p, i) => { const k = pr(t, wt('soyez', 72.4) - .2 + i * .12, .5, E.back2); S(p, { y: (1 - k) * 50, s: lerp(.6, 1, k), o: clamp(k * 2) }); });
    const php = pr(t, 73.05, .5, E.back); S(q('final', '#f_ph'), { x: (1 - php) * 60, o: php });
    const lg = pr(t, wt('nombreux', 73.4) - .1, .5, E.back);
    const pulse = (t0, d = .5, a = .045) => a * Math.sin(Math.PI * clamp((t - t0) / d));
    const HIT = 84.6, hit = a => pulse(HIT - .03, .45, a);          // final chord of the music
    S(fLogoBar, { y: (1 - lg) * 40, o: lg, s: 1 + pulse(82.1) + hit(.03) });
    const fph = q('final', '#f_ph'), dimEls = [fBar, ...pills, fLogoBar, q('final', '#f_name'), q('final', '#f_es'), fst];
    fph.style.filter = ''; dimEls.forEach(e => e.style.filter = '');
    if (t > 75) {
      // end tag "Réservations au 652 43 67 99": the phone line takes the focus, the rest dims a little
      const tR = wt('réservations', CTA - .1);
      const hl = pr(t, tR - .25, .4, E.out) * (1 - pr(t, CTA + 4.95, .5, E.io));
      const NUMS = [wt('six', tR), wt('quarante-trois', tR), wt('soixante-sept', tR), wt('quatre-vingt', tR)];
      const np = NUMS.reduce((a, n) => a + pulse(n - .04, .32, .035), 0);
      S(fBar, { y: 0, s: 1 + pulse(83.3) + hit(.035), o: 1 });
      pills.forEach((p, i) => S(p, { y: 0, s: 1 + pulse(81.1 + i * .28, .5, .08) + hit(.05), o: 1 }));
      S(fph, { x: 0, o: 1, s: 1 + .07 * hl + np + hit(.04) });
      S(fph.firstElementChild, { r: Math.sin(t * 38) * 9 * hl * (Math.sin(t * 3.1) > 0 ? 1 : .15) });
      if (hl > .01) {
        fph.style.filter = `drop-shadow(0 0 ${(28 * hl).toFixed(1)}px rgba(255,150,50,${(.95 * hl).toFixed(2)}))`;
        dimEls.forEach(e => e.style.filter = `brightness(${lerp(1, .55, hl).toFixed(3)})`);
      }
      S(fR, { s: 1 + pulse(82.6, .5, .08) + hit(.06), r: -3 + 6 * pulse(82.6, .5, 1), o: 1 }); S(fP, { s: 1 + pulse(82.9, .5, .08) + hit(.06), r: 3 - 6 * pulse(82.9, .5, 1), o: 1 });
    }
    fadeEl.style.opacity = pr(t, TL.scenes.final[1] - .55, .55, E.io);
    return { dust: .5, corner: 0 };
  };
  function doveAt(path, t, e) {
    const u = e(clamp((t - path.t0) / path.d));
    const p = bez(path.a, path.c, path.b, u), p2 = bez(path.a, path.c, path.b, Math.min(1, u + .02));
    return { p, u, ang: Math.atan2(p2[1] - p[1], p2[0] - p[0]) * 180 / Math.PI };
  }
  function placeDove(d, x, y, dx, dy, sc, o) {
    const left = dx < 0; let ang = Math.atan2(dy, Math.abs(dx) + 1e-6) * 180 / Math.PI;
    d.style.left = (x - 187) + 'px'; d.style.top = (y - 96) + 'px';
    S(d, { r: ang * .55 * (left ? -1 : 1), sx: left ? -sc : sc, sy: sc, o });
  }
  const bjl = [...SC.agency.el.querySelectorAll('.bjl')];
  const ORDER_L = ['o', 'u', 'j', 'i', 'e', 'k', 'a'];
  U.agency = (t) => {
    setGrad('radial-gradient(ellipse at 50% 52%,#3A0A0E 0%,#14070A 45%,#050507 100%)', 1);
    setRays(.26 + .18 * pr(t, SIG.land1, .6), t * .6, 0);
    vign.style.opacity = 1;
    fadeEl.style.opacity = Math.max(1 - pr(t, SIG.in, .4, E.lin), pr(t, SIG.out0, DUR() - SIG.out0 - .05, E.io));
    TRAIL = [];
    const [d1, d2] = doves;
    // 1) the dove (Holy Spirit) flies in and lands on the B
    if (t < SIG.land1 + .2) {
      const st = doveAt(ARR, t, E.out);
      const p2 = doveAt(ARR, t + .02, E.out);
      const sc = lerp(P ? .8 : .9, P ? .9 : 1.0, st.u) * (1 - .45 * pr(t, SIG.land1 - .12, .25));
      const o = clamp((t - ARR.t0) * 6) * (1 - pr(t, SIG.land1 - .05, .18, E.lin));
      placeDove(d1, st.p[0], st.p[1], p2.p[0] - st.p[0], p2.p[1] - st.p[1], sc, o);
      flap(d1, t, lerp(5.2, 2.2, st.u), 1 - .35 * st.u);
      for (let k = 9; k < 70; k++) { const tt = t - k * .011; if (tt < ARR.t0) break; const q2 = doveAt(ARR, tt, E.out); TRAIL.push([q2.p[0], q2.p[1], (1 - k / 70) * o, 11 * (1 - k / 70) + 1]); }
    } else d1.style.opacity = 0;
    // 2) landing: the B appears, flash ring, the dove inside the B glows
    const m = pr(t, SIG.land1 - .08, .55, E.back2);
    const pulse2 = pr(t, SIG.land2 - .05, .2) * (1 - pr(t, SIG.land2 + .15, .5));
    S(q('agency', '#agm'), { s: lerp(1.35, 1, m) * (1 + .07 * pulse2), o: clamp(m * 3) });
    const ring = (el, t0) => { const rg = pr(t, t0 - .05, .7, E.out); el.style.left = (DOVE_T.x - 200) + 'px'; el.style.top = (DOVE_T.y - 200) + 'px'; S(el, { s: lerp(.1, 2.6, rg), o: (1 - rg) * clamp((t - t0 + .05) * 20) }); };
    ring(q('agency', '#agring'), SIG.land1); ring(q('agency', '#agring2'), SIG.land2);
    const glowA = pr(t, SIG.land1 - .05, .15) * (1 - pr(t, SIG.land1 + .15, .6));
    const glowB = pr(t, SIG.take - .35, .3) * (1 - pr(t, SIG.take + .05, .5));        // the dove lights up and leaves the B
    const glowC = pr(t, SIG.land2 - .05, .15) * (1 - pr(t, SIG.land2 + .2, .7));
    q('agency', '#agglow').style.opacity = Math.max(glowA, glowB, glowC).toFixed(3);
    // 3) letters dance in one by one
    const dx2 = doves[1]; let dovePos = null;
    if (t >= SIG.take - .05 && t <= SIG.land2 + .1) dovePos = crPoint(t);
    bjl.forEach(img => {
      const n = img.dataset.n;
      const L = LETTERS.find(z => z.n === n); const lx = LGX + (L.x + L.w / 2) * LW_;
      let tin, kind;
      if (n.startsWith('ag_')) { tin = SIG.agency0 + ['ag_a', 'ag_g', 'ag_e', 'ag_n', 'ag_c', 'ag_y'].indexOf(n) * SIG.astep; kind = 'ag'; }
      else if (n.endsWith('dot')) { tin = SIG.letters0 + ORDER_L.indexOf(n[0]) * SIG.lstep + .22; kind = 'dot'; }
      else { tin = SIG.letters0 + ORDER_L.indexOf(n) * SIG.lstep; kind = 'l'; }
      const k = ORDER_L.indexOf(n.replace('dot', '').replace('ag_', '')) ;
      const idle = Math.sin((t - tin) * 3.2 + (k >= 0 ? k : 3) * .8) * 2.5 * pr(t, tin + .7, .5);
      // fly-over: the letters hop as the dove passes over them
      let hop = 0;
      if (dovePos && t > 93.2 + SD && t < 94.0 + SD) hop = Math.exp(-Math.pow((dovePos[0] - lx) / (P ? 55 : 70), 2));
      // landing: joyful wave
      const wave = Math.sin(Math.PI * clamp((t - SIG.land2 - .05 - (k >= 0 ? k : 3) * .045) / .35));
      if (kind === 'l') {
        const p = clamp((t - tin) / .7);
        const yv = (1 - E.elastic(p)) * -170, rv = (1 - E.out(clamp(p * 1.4))) * (k % 2 ? 28 : -28);
        const sq = Math.exp(-Math.pow((p - .22) / .07, 2));     // squash on impact
        S(img, { y: yv + idle - hop * 28 - wave * 18, r: rv + hop * (k % 2 ? 6 : -6), sx: 1 + sq * .14, sy: 1 - sq * .16, o: clamp(p * 6) });
      } else if (kind === 'dot') {
        const p = E.back2(clamp((t - tin) / .4));
        S(img, { y: (1 - p) * -60 + idle * 1.5 - hop * 40 - wave * 26, s: lerp(0, 1, p), r: (1 - p) * 180, o: clamp(p * 4) });
      } else {
        const p = E.back(clamp((t - tin) / .45));
        S(img, { y: (1 - p) * 50 - wave * 10, s: lerp(.6, 1, p), o: clamp(p * 3) });
      }
    });
    letters(q('agency', '#ag0'), t, SIG.letters0 + .35, .03, .4, fadeUp(14));
    q('agency', '#agband').style.left = lerp(-30, 130, pr(t, SIG.shine, 1.0, E.io)) + '%';
    S(q('agency', '#aglogo'), { s: 1 + .025 * pr(t, SIG.land1, 6, E.lin) });
    // 4) the dove leaves the B, loops over the word and comes back to land on the B
    if (dovePos) {
      const pB = crPoint(t + .02);
      const takeP = pr(t, SIG.take - .05, .25), landP = pr(t, SIG.land2 - .15, .2);
      const sc = (P ? .78 : .9) * lerp(.55, 1, takeP) * (1 - .45 * landP);
      const o = takeP * (1 - pr(t, SIG.land2 - .05, .15, E.lin));
      placeDove(dx2, dovePos[0], dovePos[1], pB[0] - dovePos[0], pB[1] - dovePos[1], sc, o);
      flap(dx2, t, 4.8, 1);
      for (let k = 8; k < 70; k++) { const tt = t - k * .011; if (tt < SIG.take) break; const q2 = crPoint(tt); TRAIL.push([q2[0], q2[1], (1 - k / 70) * o, 11 * (1 - k / 70) + 1]); }
    } else dx2.style.opacity = 0;
    return { dust: .35, corner: 0 };
  };

  // ---------------------------------------------------------------- main render
  function DUR() { return TL.dur; }
  const ORDER = Object.keys(TL.scenes);
  let current = null;
  window.renderFrame = function (tv) {
    const t = tv * (TL.speed || 1);   // video time -> story time (the whole spot plays 7 % faster)
    // reset globals
    for (const k in bg) bg[k].style.opacity = 0;
    splitL.style.opacity = 0; splitR.style.opacity = 0;
    tint.style.opacity = 0; bgGrad.style.opacity = 0; rays.style.opacity = 0; swoosh.style.opacity = 0;
    cabWrap.style.opacity = 0; cabGlow.style.opacity = 0; cutLine.style.opacity = 0;
    flash.style.opacity = 0; fadeEl.style.opacity = 0; vign.style.opacity = 1; capBox.style.opacity = 0;
    TRAIL = [];
    let name = ORDER[ORDER.length - 1];
    for (const n of ORDER) { const [a, b] = TL.scenes[n]; if (t >= a && t < b) { name = n; break; } }
    if (current !== name) { if (current) SC[current].el.style.display = 'none'; SC[name].el.style.display = 'block'; current = name; }
    const r = U[name](t) || {};
    cornerLogo(r.corner ?? 0);
    drawFx(t, r.dust ?? 0);
    camera(t, name);
    wipes(t);
    grain.style.backgroundPosition = `${(Math.sin(t * 91.7) * 1000) | 0}px ${(Math.cos(t * 77.3) * 1000) | 0}px`;
    return name;
  };

  window.ready = (async () => {
    await document.fonts.ready;
    const imgs = [...document.images];
    await Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => { }) : Promise.resolve()));
    cabAR = cab.naturalWidth / cab.naturalHeight || cabAR;
    window.renderFrame(0);
    return true;
  })();
})();
