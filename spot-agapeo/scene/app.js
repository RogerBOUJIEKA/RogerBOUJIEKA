'use strict';
/*
 * Agapeo – spot 1:29. Moteur d'animation déterministe : renderFrame(t) dessine
 * l'image à l'instant t (secondes). Chaque scène enregistre aussi ses effets
 * sonores via cue(), récupérés par le script de rendu pour la piste SFX.
 */

const params = new URLSearchParams(location.search);
const W = +(params.get('w') || 1920);
const H = +(params.get('h') || 1080);
const LAND = W >= H;
const L = (land, port) => (LAND ? land : port);

// ---------------------------------------------------------------- maths
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const E = {
  lin: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackSoft: t => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const P = (t, t0, d, e = E.lin) => e(clamp((t - t0) / d));
const bump = p => Math.sin(Math.PI * clamp(p));

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mixRGB = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ---------------------------------------------------------------- SFX cues
const CUES = [];
function cue(t, type, gain = 1, extra = {}) { CUES.push(Object.assign({ t: +t.toFixed(3), type, gain }, extra)); }

// ---------------------------------------------------------------- DOM helpers
const stage = document.getElementById('stage');
stage.style.width = W + 'px';
stage.style.height = H + 'px';
const scenesRoot = document.getElementById('scenes');

function mk(parent, cls = '', html = '', style = {}) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  if (html) d.innerHTML = html;
  Object.assign(d.style, style);
  parent.appendChild(d);
  return d;
}
const el = (parent, cls, html, style) => mk(parent, 'el ' + (cls || ''), html, style);

function tf(e, o) {
  const x = o.x || 0, y = o.y || 0, s = o.s ?? 1, sx = o.sx ?? s, sy = o.sy ?? s, ax = o.ax ?? 0.5;
  let t = `translate(${-ax * 100}%,-50%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  if (o.rx || o.ry) t += ` perspective(${o.persp || 1600}px) rotateX(${(o.rx || 0).toFixed(2)}deg) rotateY(${(o.ry || 0).toFixed(2)}deg)`;
  if (o.r) t += ` rotate(${o.r.toFixed(2)}deg)`;
  t += ` scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  e.style.transform = t;
  const op = clamp(o.o ?? 1);
  e.style.opacity = op.toFixed(3);
  e.style.visibility = op <= 0.002 ? 'hidden' : 'visible';
  const b = o.blur || 0;
  e.style.filter = b > 0.15 ? `blur(${b.toFixed(1)}px)` : 'none';
}
function sub(e, o) { // transformation locale d'un enfant
  const x = o.x || 0, y = o.y || 0, s = o.s ?? 1;
  e.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${(o.r || 0).toFixed(2)}deg) scale(${s.toFixed(4)})`;
  const op = clamp(o.o ?? 1);
  e.style.opacity = op.toFixed(3);
  const b = o.blur || 0;
  e.style.filter = b > 0.15 ? `blur(${b.toFixed(1)}px)` : 'none';
}
function rootFx(root, o) {
  const s = o.s ?? 1;
  root.style.transform = `translate3d(${(o.x || 0).toFixed(1)}px,${(o.y || 0).toFixed(1)}px,0) scale(${s.toFixed(4)})`;
  root.style.opacity = clamp(o.o ?? 1).toFixed(3);
  const b = o.blur || 0;
  root.style.filter = b > 0.15 ? `blur(${b.toFixed(1)}px)` : 'none';
}

const GRAD_LINES = [];
function splitLine(parent, text, by, cls, style, spanCls) {
  const line = el(parent, 'nowrap ' + (cls || ''), '', style);
  const parts = by === 'char' ? [...text] : text.split(' ');
  const spans = parts.map((w, i) => {
    const s = document.createElement('span');
    s.className = 'word' + (spanCls ? ' ' + spanCls : '');
    s.textContent = by === 'char' ? (w === ' ' ? ' ' : w) : w + (i < parts.length - 1 ? ' ' : '');
    line.appendChild(s);
    return s;
  });
  const obj = { line, spans };
  if (spanCls && /grad-text|gold-text|beni-text|grad-deep/.test(spanCls)) GRAD_LINES.push(obj);
  return obj;
}
const words = (p, text, cls, style, spanCls) => splitLine(p, text, 'word', cls, style, spanCls);
const letters = (p, text, cls, style, spanCls) => splitLine(p, text, 'char', cls, style, spanCls);

function fixGradients() {
  // les scènes sont masquées (display:none) hors de leur fenêtre : on les affiche le temps de mesurer
  for (const s of SCENES) s.root.style.display = 'block';
  for (const g of GRAD_LINES) {
    const w = g.line.offsetWidth;
    for (const s of g.spans) {
      s.style.backgroundSize = `${w}px 100%`;
      s.style.backgroundPosition = `${-s.offsetLeft}px 0`;
    }
  }
}

// Animation d'apparition/disparition mot à mot (ou lettre à lettre)
function animSpans(obj, t, tin, stagger, tout = null, o = {}) {
  const dur = o.dur ?? 0.55, dy = o.dy ?? 38, dx = o.dx ?? 0, blur = o.blur ?? 14;
  const outDur = o.outDur ?? 0.45, outStag = o.outStagger ?? 0.025, outDy = o.outDy ?? -26;
  const s0 = o.s0 ?? 0.92, ease = o.ease || E.outCubic;
  obj.spans.forEach((s, i) => {
    const pi = P(t, tin + i * stagger, dur, ease);
    const po = tout == null ? 0 : P(t, tout + i * outStag, outDur, E.inCubic);
    sub(s, {
      x: (1 - pi) * dx,
      y: (1 - pi) * dy + po * outDy,
      s: lerp(s0, 1, pi) * (1 + po * (o.outS ?? 0)),
      o: Math.min(1, pi * 1.4) * (1 - po),
      blur: (1 - pi) * blur + po * (o.outBlur ?? 12),
    });
  });
}

// Mise en mouvement de type « typing » (texte révélé caractère par caractère)
function typeInto(span, full, t, t0, t1) {
  const n = Math.round(full.length * P(t, t0, t1 - t0));
  span.textContent = full.slice(0, n);
  return n;
}
function typingCues(full, t0, t1, gain = 0.35) {
  const r = rng(full.length * 97);
  for (let i = 0; i < full.length; i++) {
    if (full[i] === ' ' || (i % 2 === 1 && r() < 0.6)) continue;
    cue(t0 + (t1 - t0) * (i + 1) / full.length - 0.01, 'key', gain * (0.75 + 0.5 * r()));
  }
}

// ---------------------------------------------------------------- graphiques
let LOGO_ID = 0;
function logoSVG() {
  const id = 'lg' + (LOGO_ID++);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff4f8b"/><stop offset="0.55" stop-color="#ff7a6b"/><stop offset="1" stop-color="#ffb35c"/>
    </linearGradient>
    <radialGradient id="${id}b" cx="0.28" cy="0.18" r="0.85">
      <stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.65" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${id}a)"/>
  <rect width="200" height="200" fill="url(#${id}b)"/>
  <path d="M100 162 C 46 128, 26 84, 52 60 C 72 42, 94 52, 100 70 C 106 52, 128 42, 148 60 C 174 84, 154 128, 100 162 Z" fill="#fff"/>
  <rect x="94" y="78" width="12" height="56" rx="3" fill="url(#${id}a)"/>
  <rect x="80" y="93" width="40" height="12" rx="3" fill="url(#${id}a)"/>
  <path d="M154 30 L158 44 L172 48 L158 52 L154 66 L150 52 L136 48 L150 44 Z" fill="#fff3c9"/>
</svg>`;
}
let CROSS_ID = 0;
function crossSVG() {
  const id = 'cg' + (CROSS_ID++);
  return `<svg viewBox="0 0 100 100" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffe9ad"/><stop offset="0.45" stop-color="#f2b544"/><stop offset="1" stop-color="#c47a22"/></linearGradient></defs>
  <rect x="40" y="6" width="20" height="88" rx="6" fill="url(#${id})"/>
  <rect x="18" y="27" width="64" height="20" rx="6" fill="url(#${id})"/>
  <rect x="44" y="10" width="5" height="80" rx="2.5" fill="#fff" opacity="0.5"/>
  <rect x="22" y="31" width="56" height="4" rx="2" fill="#fff" opacity="0.4"/>
</svg>`;
}
const icon = e => (e === 'cross' ? crossSVG() : e);
function appIcon(parent, size, extraCls = '') {
  return el(parent, 'app-icon ' + extraCls, logoSVG(), { width: size + 'px', height: size + 'px' });
}

const CURSOR_SVG = `<svg viewBox="0 0 30 42" width="60" height="84" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 10px rgba(30,10,30,0.35))">
<path d="M3 3 L3 33 L11 26 L16.5 38.5 L22 36 L16.5 24 L27 24 Z" fill="#ffffff" stroke="#24121f" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

function makeCursor(root, keys, clicks) {
  const c = el(root, '', CURSOR_SVG, { width: '60px', height: '84px', zIndex: 50 });
  const ripple = el(root, '', '', { width: '120px', height: '120px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.95)', zIndex: 49, boxShadow: '0 0 30px rgba(255,79,139,0.5)' });
  for (const ct of clicks) cue(ct, 'click', 0.8);
  return t => {
    let x = keys[0][1], y = keys[0][2];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, x0, y0] = keys[i], [t1, x1, y1] = keys[i + 1];
      if (t >= t0) { const p = P(t, t0, t1 - t0, E.inOutCubic); x = lerp(x0, x1, p); y = lerp(y0, y1, p); }
    }
    const tIn = keys[0][0], tOut = keys[keys.length - 1][0] + 0.9;
    const o = P(t, tIn - 0.25, 0.25) * (1 - P(t, tOut, 0.3));
    let s = 1, ro = 0, rs = 0.2;
    for (const ct of clicks) {
      s -= 0.16 * bump(P(t, ct - 0.06, 0.22));
      const pr = P(t, ct, 0.5, E.outCubic);
      if (t >= ct && t < ct + 0.5) { ro = 1 - pr; rs = 0.2 + pr * 0.9; }
    }
    tf(c, { x: x + 30 - 6, y: y + 42 - 6, s, o });
    tf(ripple, { x, y, s: rs, o: ro * o });
  };
}

// ---------------------------------------------------------------- particules
const fx = document.getElementById('fx');
const fxFront = document.getElementById('fx-front');
fx.width = fxFront.width = W;
fx.height = fxFront.height = H;
const ctxB = fx.getContext('2d');
const ctxF = fxFront.getContext('2d');

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + 0.35 * s);
  ctx.bezierCurveTo(x - 0.55 * s, y - 0.05 * s, x - 0.5 * s, y - 0.6 * s, x - 0.15 * s, y - 0.55 * s);
  ctx.bezierCurveTo(x - 0.05 * s, y - 0.53 * s, x, y - 0.42 * s, x, y - 0.32 * s);
  ctx.bezierCurveTo(x, y - 0.42 * s, x + 0.05 * s, y - 0.53 * s, x + 0.15 * s, y - 0.55 * s);
  ctx.bezierCurveTo(x + 0.5 * s, y - 0.6 * s, x + 0.55 * s, y - 0.05 * s, x, y + 0.35 * s);
  ctx.closePath();
}
function starPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.closePath();
}

const BOKEH = (() => {
  const r = rng(7), arr = [];
  for (let i = 0; i < 54; i++) arr.push({ x: r(), y: r(), z: r(), sp: 0.4 + r(), ph: r() * 6.28, sz: 4 + r() * 22 });
  return arr;
})();
const SPARK = (() => {
  const r = rng(11), arr = [];
  for (let i = 0; i < 34; i++) arr.push({ x: r(), y: r(), ph: r() * 6.28, f: 0.6 + r() * 1.6, sz: 5 + r() * 9, dr: r() });
  return arr;
})();

const BURSTS = [];
function burst(t0, x, y, o = {}) {
  const r = rng(Math.round(t0 * 1000) + 3);
  const n = o.n || 36, parts = [];
  const cols = o.colors || ['#ff4f8b', '#ff8a5c', '#f2b544', '#ffffff', '#c3adff'];
  for (let i = 0; i < n; i++) {
    const a = (o.angle ?? -Math.PI / 2) + (r() - 0.5) * (o.spread ?? Math.PI * 2);
    const v = (o.speed || 900) * (0.35 + 0.65 * r());
    parts.push({
      vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: r() * 6.28, vr: (r() - 0.5) * 6,
      sz: (o.size || 26) * (0.5 + r()), col: cols[Math.floor(r() * cols.length)],
      kind: o.kind === 'mixed' ? (r() < 0.55 ? 'heart' : 'star') : (o.kind || 'heart'),
      life: (o.life || 1.6) * (0.7 + 0.5 * r()),
    });
  }
  BURSTS.push({ t0, x, y, parts, g: o.gravity ?? 260, drag: o.drag ?? 2.6 });
}
const RISERS = [];
function riseEmitter(t0, t1, o = {}) {
  const r = rng(Math.round(t0 * 100) + 17), parts = [];
  const n = o.n || 60;
  for (let i = 0; i < n; i++) {
    parts.push({ tb: t0 + (t1 - t0) * r(), x: (r() - 0.5) * (o.width || W * 0.9), sp: 300 + r() * 500, sz: 6 + r() * 14, ph: r() * 6, col: (o.colors || ['#ffffff', '#ffe2a3', '#ffc2d8'])[Math.floor(r() * 3)] });
  }
  RISERS.push({ parts, life: o.life || 1.8 });
}

function drawParticles(t, pal) {
  ctxB.clearRect(0, 0, W, H);
  ctxF.clearRect(0, 0, W, H);
  // bokeh
  for (const b of BOKEH) {
    const y = ((b.y * (H + 200) - t * 18 * b.sp) % (H + 200) + (H + 200)) % (H + 200) - 100;
    const x = b.x * W + Math.sin(t * 0.3 * b.sp + b.ph) * 40;
    const a = pal.partA * (0.25 + 0.35 * b.z) * (0.6 + 0.4 * Math.sin(t * 1.3 + b.ph));
    if (a <= 0.01) continue;
    const g = ctxB.createRadialGradient(x, y, 0, x, y, b.sz * 2);
    g.addColorStop(0, rgba(pal.part, a));
    g.addColorStop(1, rgba(pal.part, 0));
    ctxB.fillStyle = g;
    ctxB.beginPath();
    ctxB.arc(x, y, b.sz * 2, 0, 6.283);
    ctxB.fill();
  }
  // étincelles
  for (const s of SPARK) {
    const tw = Math.pow(Math.max(0, Math.sin(t * s.f + s.ph)), 6);
    const a = pal.partA * tw;
    if (a < 0.02) continue;
    const x = s.x * W, y = ((s.y * H - t * 6 * s.dr) % H + H) % H;
    ctxB.fillStyle = rgba(pal.part, a);
    starPath(ctxB, x, y, s.sz * (0.6 + 0.6 * tw));
    ctxB.fill();
  }
  // explosions de cœurs / étoiles
  for (const b of BURSTS) {
    const tau = t - b.t0;
    if (tau < 0 || tau > 3.5) continue;
    for (const p of b.parts) {
      if (tau > p.life) continue;
      const k = b.drag, f = (1 - Math.exp(-k * tau)) / k;
      const x = W / 2 + b.x + p.vx * f;
      const y = H / 2 + b.y + p.vy * f + 0.5 * b.g * tau * tau;
      const a = (1 - P(tau, p.life * 0.55, p.life * 0.45)) * P(tau, 0, 0.06);
      ctxF.save();
      ctxF.globalAlpha = a;
      ctxF.translate(x, y);
      ctxF.rotate(p.rot + p.vr * tau);
      ctxF.fillStyle = p.col;
      if (p.kind === 'heart') heartPath(ctxF, 0, 0, p.sz); else starPath(ctxF, 0, 0, p.sz * 0.55);
      ctxF.fill();
      ctxF.restore();
    }
  }
  // particules montantes
  for (const R of RISERS) {
    for (const p of R.parts) {
      const tau = t - p.tb;
      if (tau < 0 || tau > R.life) continue;
      const x = W / 2 + p.x + Math.sin(tau * 3 + p.ph) * 18;
      const y = H + 40 - p.sp * tau;
      const a = bump(tau / R.life);
      ctxF.fillStyle = p.col;
      ctxF.globalAlpha = a;
      starPath(ctxF, x, y, p.sz * 0.6);
      ctxF.fill();
      ctxF.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------- fond animé
const PAL = {
  night: { base: '#140a17', c: ['#4a1747', '#24164d', '#5a1f33', '#2d1030'], part: [255, 214, 150], partA: 0.6, vig: 0.55 },
  dawn: { base: '#fff1ea', c: ['#ffc2a6', '#ff9fc6', '#ffdca0', '#e6caff'], part: [255, 255, 255], partA: 0.75, vig: 0.08 },
  grey: { base: '#16181f', c: ['#2c3242', '#3b2f3c', '#232731', '#353b4b'], part: [190, 195, 210], partA: 0.3, vig: 0.5 },
  black: { base: '#050307', c: ['#160b14', '#0d0b18', '#180b10', '#0a0710'], part: [255, 220, 170], partA: 0.25, vig: 0.6 },
  pastel: { base: '#fff4f7', c: ['#ff9cc2', '#ffbb92', '#c3adff', '#9fd8ff'], part: [255, 255, 255], partA: 0.85, vig: 0.05 },
  gold: { base: '#fff6e6', c: ['#ffd27a', '#ffb3c7', '#ffe2a8', '#f3b0ff'], part: [255, 244, 210], partA: 0.9, vig: 0.05 },
};
let PAL_KEYS = [];
function palAt(t) {
  let a = PAL_KEYS[0], b = PAL_KEYS[0];
  for (let i = 0; i < PAL_KEYS.length; i++) {
    if (PAL_KEYS[i][0] <= t) { a = PAL_KEYS[i]; b = PAL_KEYS[Math.min(i + 1, PAL_KEYS.length - 1)]; }
  }
  const p = a === b || b[0] === a[0] ? 0 : E.inOutSine(clamp((t - a[0]) / (b[0] - a[0])));
  const A = PAL[a[1]], B = PAL[b[1]];
  return {
    base: mixRGB(hex(A.base), hex(B.base), p),
    c: A.c.map((c, i) => mixRGB(hex(c), hex(B.c[i]), p)),
    part: mixRGB(A.part, B.part, p),
    partA: lerp(A.partA, B.partA, p),
    vig: lerp(A.vig, B.vig, p),
  };
}
const bgEl = document.getElementById('bg');
const vigEl = document.getElementById('vignette');
function drawBg(t, pal) {
  const R = Math.max(W, H) * 0.62;
  const layers = pal.c.map((c, i) => {
    const x = W * (0.5 + 0.36 * Math.cos(0.13 * t * (1 + i * 0.21) + i * 1.9));
    const y = H * (0.5 + 0.34 * Math.sin(0.11 * t * (1 + i * 0.27) + i * 2.6));
    return `radial-gradient(circle ${R.toFixed(0)}px at ${x.toFixed(0)}px ${y.toFixed(0)}px, ${rgba(c, 0.95)} 0%, ${rgba(c, 0)} 70%)`;
  });
  bgEl.style.background = layers.join(',') + ',' + rgba(pal.base, 1);
  vigEl.style.background = `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(10,0,10,${pal.vig.toFixed(3)}) 100%)`;
}

// ---------------------------------------------------------------- scènes
const SCENES = [];
function addScene(t0, t1, build) {
  const root = mk(scenesRoot, 'scene');
  const update = build(root);
  SCENES.push({ t0, t1, root, update });
}
const LAYOUT_HOOKS = [];

let TL, seg, A, Z, R, BEAT, snapBeat;
const FLASHES = [];
const flash = (t0, peak = 1, dur = 0.7, rise = 0.06) => FLASHES.push({ t0, peak, dur, rise });

function buildScenes() {
  seg = id => TL.segments.find(s => s.id === id);
  A = id => seg(id).start;
  Z = id => seg(id).end;
  R = TL.reveal;
  BEAT = 60 / TL.bpm;
  snapBeat = t => TL.grid0 + Math.round((t - TL.grid0) / BEAT) * BEAT;

  const FLASH9 = snapBeat(A('L15') - 0.85);
  const FLASH10 = A('L18') - 0.45;

  PAL_KEYS = [
    [0, 'night'], [3.15, 'night'], [3.95, 'dawn'], [A('L03') - 0.05, 'dawn'], [A('L03') + 0.75, 'grey'],
    [Z('L04') - 0.4, 'grey'], [Z('L04') + 0.6, 'black'], [R - 0.01, 'black'], [R, 'pastel'],
    [FLASH9 - 0.02, 'pastel'], [FLASH9, 'gold'], [FLASH10 - 0.02, 'gold'], [FLASH10, 'pastel'], [TL.total, 'pastel'],
  ];

  // ---------- éléments globaux : rayons de lumière + filigrane
  const glob = mk(scenesRoot, 'scene');
  glob.style.display = 'block';
  const raysSize = Math.max(W, H) * 2.2;
  const rays = el(glob, '', '', {
    width: raysSize + 'px', height: raysSize + 'px', borderRadius: '50%',
    background: 'conic-gradient(from 0deg, #ff8fb8, #ffd27a, #9fd8ff, #c3adff, #ff9a6b, #ffe08a, #8fc8ff, #ff8fb8)',
    maskImage: 'repeating-conic-gradient(#000 0deg 5deg, transparent 5deg 14deg), radial-gradient(circle, #000 0%, rgba(0,0,0,0.85) 18%, transparent 55%)',
    maskComposite: 'intersect',
    WebkitMaskImage: 'repeating-conic-gradient(#000 0deg 5deg, transparent 5deg 14deg), radial-gradient(circle, #000 0%, rgba(0,0,0,0.85) 18%, transparent 55%)',
    WebkitMaskComposite: 'source-in',
  });
  const godSize = Math.max(W, H) * 2.0;
  const god = el(glob, '', '', {
    width: godSize + 'px', height: godSize + 'px', borderRadius: '50%',
    background: 'repeating-conic-gradient(from 0deg, rgba(255,246,222,0.95) 0deg 4deg, rgba(255,246,222,0) 4deg 11deg)',
    maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 25%, transparent 52%)',
    WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 25%, transparent 52%)',
  });
  const wm = mk(glob, '', '', { position: 'absolute', left: L(56, 50) + 'px', top: L(44, 70) + 'px', display: 'flex', alignItems: 'center', gap: '14px' });
  const wmIcon = mk(wm, 'app-icon', logoSVG(), { width: '58px', height: '58px', boxShadow: '0 8px 20px rgba(255,79,139,0.3)' });
  wmIcon.style.borderRadius = '16px';
  mk(wm, 'wordmark', 'Agapeo', { fontSize: '34px' });

  const globalUpdate = t => {
    const oR = Math.max(
      P(t, R, 0.25) * (1 - P(t, R + 1.5, 1.0)) * 0.95,
      P(t, A('L17') - 0.1, 0.7) * (1 - P(t, FLASH10 - 0.5, 0.45)) * 0.45,
      P(t, A('L20') - 0.5, 0.9) * 0.38,
    );
    tf(rays, { s: lerp(0.55, 1.15, P(t, R, 2.2, E.outCubic)), r: t * 7, o: oR });
    const oG = Math.max(
      P(t, A('L09') - 0.4, 0.8) * (1 - P(t, A('L10') - 0.9, 0.6)) * 0.6,
      P(t, A('L17') - 0.2, 0.6) * (1 - P(t, FLASH10 - 0.5, 0.45)) * 0.9,
    );
    tf(god, { y: -H / 2 - godSize * 0.08, r: Math.sin(t * 0.4) * 6, o: oG });
    const oW = P(t, A('L10') - 0.4, 0.6) * (1 - P(t, A('L19') + 1.2, 0.5));
    wm.style.opacity = (oW * 0.92).toFixed(3);
  };
  SCENES.push({ t0: 0, t1: TL.total + 1, root: glob, update: globalUpdate });

  // ======================================================= S1 — ouverture
  addScene(0, 3.95, root => {
    const l1 = words(root, "Et si l'amour", 'serif', { fontSize: L(96, 92) + 'px', fontStyle: 'italic', fontWeight: 500, color: '#fff1e6' });
    const l2txt = LAND ? ['commençait par la foi ?'] : ['commençait', 'par la foi ?'];
    const l2 = l2txt.map(s => words(root, s, 'serif', { fontSize: L(116, 104) + 'px', fontWeight: 600 }, 'gold-text'));
    cue(0.25, 'shimmer', 0.45);
    cue(1.15, 'sparkle', 0.35);
    cue(3.05, 'whoosh', 0.7);
    return t => {
      tf(l1.line, { y: L(-80, -150) });
      animSpans(l1, t, 0.35, 0.2, null, { dy: 30 });
      l2.forEach((l, i) => { tf(l.line, { y: L(60, -10 + i * 125) }); animSpans(l, t, 1.15 + i * 0.35, 0.16, null, { dy: 40 }); });
      const po = P(t, 3.05, 0.75, E.inCubic);
      rootFx(root, { s: 1 + 0.35 * po, blur: 22 * po, o: 1 - po });
    };
  });

  // ======================================================= S2 — la prière
  addScene(3.5, 9.4, root => {
    const head = words(root, 'Depuis longtemps…', 'serif', { fontSize: L(104, 96) + 'px', fontStyle: 'italic', fontWeight: 500, color: '#3a1236' });
    const card = el(root, 'card', `
      <div style="display:flex;align-items:center;gap:20px">
        <div class="tile" style="width:84px;height:84px;border-radius:24px;background:linear-gradient(145deg,#ffe2ec,#ffd2bd)"><span class="emoji" style="font-size:48px">🙏</span></div>
        <div><div style="font:600 32px var(--sans);color:#3a1236">Ma prière</div>
        <div style="font:400 23px var(--sans);color:#a07f97;margin-top:6px">Chaque soir, depuis longtemps</div></div>
      </div>
      <div class="serif" style="font-style:italic;font-weight:500;font-size:${L(54, 52)}px;color:#3a1236;margin-top:34px;line-height:1.28;min-height:140px"><span class="typed"></span><span class="caret" style="height:${L(54, 52)}px"></span></div>`,
      { width: L(1060, 920) + 'px', padding: '46px 58px 54px' });
    const typed = card.querySelector('.typed'), caret = card.querySelector('.caret');
    const prayer = 'Seigneur, guide-moi vers la bonne personne…';
    const tt0 = A('L01b') + 0.1, tt1 = Z('L01b') + 0.3;
    typingCues(prayer, tt0, tt1, 0.32);
    const hands = el(root, 'emoji', '🕯️', { fontSize: L(120, 110) + 'px', filter: 'drop-shadow(0 20px 30px rgba(80,20,60,0.25))' });
    cue(A('L01b') - 0.25, 'whoosh', 0.45);
    cue(A('L01b') + 0.2, 'popSoft', 0.5);
    cue(8.62, 'whoosh', 0.7);
    return t => {
      const up = P(t, A('L01b') - 0.35, 0.7, E.inOutCubic);
      tf(head.line, { y: lerp(0, L(-310, -560), up), s: lerp(1, 0.72, up) });
      animSpans(head, t, A('L01a'), 0.2, 8.5, { dy: 40 });
      const pin = P(t, A('L01b') - 0.3, 0.85, E.outCubic);
      const pout = P(t, 8.62, 0.6, E.inCubic);
      const cy = L(70, 40);
      tf(card, { x: -L(1500, 1300) * pout, y: cy + (1 - pin) * 420 + Math.sin(t * 1.4) * 5, rx: (1 - pin) * 35, ry: pout * 35, s: lerp(0.9, 1, pin), o: pin, blur: (1 - pin) * 14 + pout * 18 });
      typeInto(typed, prayer, t, tt0, tt1);
      const typing = t >= tt0 && t <= tt1;
      caret.style.opacity = typing || Math.floor(t * 2.4) % 2 === 0 ? 1 : 0;
      const ph = P(t, A('L01b') + 0.15, 0.7, E.outBack);
      tf(hands, { x: L(470, 390) - L(1500, 1300) * pout, y: cy - L(190, 230) + Math.sin(t * 1.8) * 10, s: ph, r: -8 + Math.sin(t * 1.2) * 4, o: Math.min(1, ph * 2) * (1 - pout), blur: pout * 16 });
    };
  });

  // ======================================================= S3 — partager la foi
  addScene(8.75, 18.6, root => {
    const title = words(root, 'Quelqu’un qui partage…', 'serif', { fontSize: L(84, 80) + 'px', fontStyle: 'italic', fontWeight: 500, color: '#3a1236' });
    const data = [
      { e: 'cross', label: 'ta foi', t: A('L02a') + 1.15, bg: 'linear-gradient(145deg,#ffe3ec,#ffc9da)' },
      { e: '🕊️', label: 'tes valeurs', t: A('L02b') + 0.05, bg: 'linear-gradient(145deg,#efe9ff,#d9cfff)' },
      { e: '💞', label: 'quelque chose de vrai', t: A('L02c') + 1.95, bg: 'linear-gradient(145deg,#ffeedd,#ffd2b3)' },
    ];
    const cards = data.map(d => {
      const c = el(root, 'card', LAND
        ? `<div style="display:flex;flex-direction:column;align-items:center;gap:26px;text-align:center">
             <div class="tile" style="width:150px;height:150px;background:${d.bg}"><span class="emoji ic" style="font-size:92px;display:inline-block">${icon(d.e)}</span></div>
             <div class="serif" style="font-weight:600;font-size:46px;color:#3a1236;line-height:1.1">${d.label}</div></div>`
        : `<div style="display:flex;align-items:center;gap:34px">
             <div class="tile" style="width:150px;height:150px;flex:none;background:${d.bg}"><span class="emoji ic" style="font-size:92px;display:inline-block">${icon(d.e)}</span></div>
             <div class="serif" style="font-weight:600;font-size:52px;color:#3a1236;line-height:1.1">${d.label}</div></div>`,
        { width: L(430, 820) + 'px', padding: L('46px 34px 50px', '36px 44px') });
      cue(d.t - 0.05, 'pop', 0.75);
      return c;
    });
    const M = Z('L02c') - 0.25;
    const heart = el(root, 'emoji', '❤️', { fontSize: '190px' });
    const broken = el(root, 'emoji', '💔', { fontSize: '190px' });
    const B = A('L03') - 0.05;
    cue(M - 0.05, 'whoosh', 0.5);
    cue(M + 0.75, 'heartbeat', 0.9);
    cue(B, 'crack', 0.9);
    const pos = LAND ? [[-530, 70], [0, 70], [530, 70]] : [[0, -300], [0, 80], [0, 460]];
    return t => {
      tf(title.line, { y: L(-330, -650) });
      animSpans(title, t, A('L02a') - 0.05, 0.12, M - 0.15, { dy: 36 });
      cards.forEach((c, i) => {
        const d = data[i];
        const pin = P(t, d.t, 0.75, E.outCubic), pb = P(t, d.t, 0.75, E.outBack);
        const pm = P(t, M + i * 0.05, 0.55, E.inCubic);
        const [x, y] = pos[i];
        tf(c, {
          x: lerp(x, 0, pm), y: lerp(y, L(40, 80), pm) + (1 - pin) * 150 + Math.sin(t * 1.6 + i * 1.3) * 7,
          rx: (1 - pin) * 40, ry: L((i - 1) * -6, 0) * (1 - pm), s: lerp(0.7, 1, pb) * lerp(1, 0.25, pm),
          o: Math.min(1, pin * 1.5) * (1 - pm), blur: (1 - pin) * 14 + pm * 6,
        });
        const ic = c.querySelector('.ic');
        ic.style.transform = `scale(${(1 + 0.22 * bump(P(t, d.t + 0.15, 0.45))).toFixed(3)}) rotate(${(Math.sin(t * 2 + i) * 4).toFixed(2)}deg)`;
      });
      const hy = L(40, 80);
      const pin = P(t, M + 0.25, 0.55, E.outBack);
      const beat = 0.16 * bump(P(t, M + 0.75, 0.2)) + 0.12 * bump(P(t, M + 1.0, 0.2)) + 0.1 * bump(P(t, M + 1.55, 0.2));
      const pBreak = P(t, B, 0.12);
      const shake = t > B && t < B + 0.4 ? Math.sin(t * 95) * 10 * (1 - P(t, B, 0.4)) : 0;
      tf(heart, { x: shake, y: hy, s: pin * (1 + beat), o: Math.min(1, pin * 2) * (1 - pBreak) });
      const pf = P(t, B + 0.35, 0.8, E.inCubic);
      tf(broken, { x: shake, y: hy + pf * 160, s: 1 + beat * 0.2, r: pf * 12, o: pBreak * (1 - pf), blur: pf * 8 });
      broken.style.filter = (pf * 8 > 0.15 ? `blur(${(pf * 8).toFixed(1)}px) ` : '') + `grayscale(${P(t, B + 0.1, 0.5).toFixed(2)})`;
    };
  });

  // ======================================================= S4 — les déceptions
  addScene(A('L03') + 0.3, Z('L04') + 1.4, root => {
    const data = [
      { e: '🎭', title: 'Relations superficielles', sub: 'Des apparences, sans profondeur.', t: A('L03') + 1.15 },
      { e: '💔', title: 'Déceptions', sub: 'Des promesses qui s’effacent.', t: A('L03') + 3.05 },
      { e: '⏳', title: 'Histoires sans lendemain', sub: 'Des relations qui ne durent pas.', t: A('L03') + 4.25 },
      { e: '🌧️', title: 'Perte d’espoir', sub: '« Est-ce que ça existe vraiment ? »', t: A('L04') + 0.2 },
    ];
    const lay = LAND
      ? [[-170, -225, -4], [-55, -75, 3], [60, 75, -2.5], [175, 225, 3.5]]
      : [[-25, -420, -4], [25, -140, 3], [-20, 140, -2.5], [25, 420, 3.5]];
    const cards = data.map(d => {
      const c = el(root, 'card dark', `
        <div style="display:flex;align-items:center;gap:30px">
          <div class="tile" style="width:110px;height:110px;flex:none;border-radius:28px;background:linear-gradient(145deg,#4a5064,#353a4a);box-shadow:inset 0 2px 0 rgba(255,255,255,0.12)"><span class="emoji" style="font-size:64px;filter:saturate(0.55)">${d.e}</span></div>
          <div style="flex:1"><div style="font:600 40px var(--sans);color:#f1f1f6">${d.title}</div>
          <div style="font:400 26px var(--sans);color:#a3a7b6;margin-top:8px">${d.sub}</div></div>
          <div class="pill" style="width:52px;height:52px;flex:none;background:#ff4d5e;color:#fff;font:700 28px var(--sans);box-shadow:0 0 24px rgba(255,77,94,0.6)">✕</div>
        </div>`, { width: L(860, 920) + 'px', padding: '30px 34px' });
      cue(d.t - 0.15, 'whoosh', 0.4);
      cue(d.t + 0.38, 'thud', 0.75);
      return c;
    });
    const F = Z('L04') - 0.55;
    cue(F - 0.05, 'whooshDown', 0.65);
    return t => {
      cards.forEach((c, i) => {
        const d = data[i], [x, y, r] = lay[i];
        const pin = P(t, d.t, 0.6, E.outCubic), pb = P(t, d.t, 0.6, E.outBackSoft);
        const tf0 = F + (3 - i) * 0.09, tau = Math.max(0, t - tf0);
        const fallY = 0.5 * 3200 * tau * tau, fo = P(t, tf0 + 0.15, 0.35);
        tf(c, {
          x: x + Math.sin(t * 0.8 + i) * 4, y: lerp(y - 700, y, pb) + fallY, r: r + (1 - pin) * 16 + tau * (i % 2 ? 50 : -50),
          s: lerp(1.08, 1, pin), o: Math.min(1, pin * 1.6) * (1 - fo), blur: (1 - pin) * 12 + fo * 6,
        });
      });
    };
  });

  // ======================================================= S5 — respire + révélation
  addScene(Z('L04') + 0.4, A('L07a') + 0.4, root => {
    const glow = el(root, '', '', { width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, #fffaf2 0%, #ffe2b0 35%, rgba(255,190,120,0.35) 60%, rgba(255,190,120,0) 72%)', boxShadow: '0 0 80px 30px rgba(255,200,140,0.35)' });
    const t1 = words(root, 'Alors, respire…', '', { font: `300 ${L(46, 48)}px var(--sans)`, letterSpacing: '0.32em', color: 'rgba(255,238,224,0.95)' });
    const t2 = words(root, 'et découvre…', '', { font: `300 ${L(46, 48)}px var(--sans)`, letterSpacing: '0.32em', color: 'rgba(255,238,224,0.95)' });
    const lock = el(root, '', '', { display: 'flex', flexDirection: L('row', 'column'), alignItems: 'center', gap: L('46px', '40px') });
    const icon = mk(lock, 'app-icon', logoSVG(), { width: L(230, 260) + 'px', height: L(230, 260) + 'px', flex: 'none' });
    const wmk = letters(lock, 'Agapeo', 'wordmark', { position: 'relative', left: 0, top: 0, transform: 'none', fontSize: L(176, 170) + 'px' });
    wmk.line.className = 'wordmark nowrap';
    const url = el(root, 'pill', 'agapeo.love', { font: `600 ${L(32, 34)}px var(--sans)`, color: '#ff4f8b', background: 'rgba(255,255,255,0.8)', padding: '14px 34px', letterSpacing: '0.06em', boxShadow: '0 12px 30px rgba(255,79,139,0.18)' });
    cue(A('L06') - 0.35, 'riser', 0.9, { dur: R - (A('L06') - 0.35) });
    cue(R, 'impact', 1.0);
    cue(R + 0.02, 'shimmer', 0.8);
    cue(R + 0.45, 'sparkle', 0.6);
    cue(A('L07a') - 0.5, 'whoosh', 0.55);
    flash(R, 1, 0.85, 0.08);
    burst(R + 0.05, 0, L(-10, -60), { n: 56, kind: 'mixed', speed: 1500, size: 30, life: 1.9, gravity: 180 });
    const OUT = A('L07a') - 0.5;
    return t => {
      const pin = P(t, Z('L04') + 0.75, 0.8, E.outCubic);
      const inh = P(t, A('L05') - 0.1, 1.4, E.inOutSine), exh = P(t, Z('L05') + 0.05, 0.9, E.inOutSine);
      const grow = P(t, A('L06'), R - A('L06'), E.inCubic);
      const s = pin * (1 + 0.9 * inh - 0.5 * exh + 4.5 * grow);
      tf(glow, { y: L(-30, -60), s, o: pin * (1 - P(t, R, 0.05)) });
      tf(t1.line, { y: L(150, 170) }); animSpans(t1, t, A('L05') - 0.05, 0.25, Z('L05') + 0.45, { dy: 12, dur: 0.8, blur: 10 });
      tf(t2.line, { y: L(150, 170) }); animSpans(t2, t, A('L06') + 0.05, 0.2, R - 0.45, { dy: 12, dur: 0.7, blur: 10 });
      const pi = P(t, R, 0.75, E.outBack), po = P(t, OUT, 0.5, E.inCubic);
      tf(lock, { y: L(-10, -60), s: 1 + 0.12 * po, o: 1 - po, blur: po * 18 });
      sub(icon, { s: pi, r: (1 - pi) * -25, o: P(t, R, 0.12) });
      wmk.spans.forEach((s2, i) => {
        const p = P(t, R + 0.35 + i * 0.06, 0.5, E.outCubic);
        sub(s2, { x: (1 - p) * 40, o: p, blur: (1 - p) * 16 });
      });
      const pu = P(t, R + 0.9, 0.5, E.outBack);
      tf(url, { y: L(210, 300), s: pu, o: Math.min(1, pu * 2) * (1 - po), blur: po * 12 });
    };
  });

  // ======================================================= S6 — Agapè
  addScene(A('L07a') - 0.55, A('L10') - 0.1, root => {
    const greek = letters(root, 'ἀγάπη', 'serif', { fontSize: L(58, 56) + 'px', fontStyle: 'italic', color: '#c8902e', letterSpacing: '0.12em' });
    const word = letters(root, 'Agapè', 'serif', { fontSize: L(220, 200) + 'px', fontWeight: 600, lineHeight: 1.1 }, 'grad-text');
    const pill = el(root, 'pill', '', { background: 'rgba(255,255,255,0.8)', padding: '20px 46px', boxShadow: '0 14px 40px rgba(255,79,139,0.18)' });
    const def = words(pill, 'l’amour inconditionnel', '', { position: 'relative', left: 0, top: 0, transform: 'none', font: `500 ${L(46, 46)}px var(--sans)`, color: '#3a1236' });
    const verse = el(root, 'card', `
      <div style="display:flex;align-items:center;gap:40px">
        <div class="tile" style="width:120px;height:120px;flex:none;background:linear-gradient(145deg,#fff1d6,#ffd9a8)"><span class="emoji" style="font-size:72px">📖</span></div>
        <div><div class="vtxt serif" style="font-style:italic;font-weight:500;font-size:${L(54, 50)}px;color:#3a1236;line-height:1.3"></div>
        <div class="vref" style="font:600 26px var(--sans);letter-spacing:0.16em;color:#ff4f8b;margin-top:18px">1 CORINTHIENS 13:4</div></div>
      </div>`, { width: L(1320, 960) + 'px', padding: L('50px 64px', '46px 50px') });
    const vtxt = verse.querySelector('.vtxt'), vref = verse.querySelector('.vref');
    const vw = { line: vtxt, spans: [] };
    '« L’amour est patient, il est plein de bonté. »'.split(' ').forEach((w, i, arr) => {
      const s = document.createElement('span'); s.className = 'word'; s.textContent = w + (i < arr.length - 1 ? ' ' : ''); vtxt.appendChild(s); vw.spans.push(s);
    });
    const la = words(root, 'L’amour tel que', '', { font: `500 ${L(66, 64)}px var(--sans)`, color: '#3a1236' });
    const lbTxt = LAND ? ['Dieu nous l’enseigne.'] : ['Dieu nous', 'l’enseigne.'];
    const lb = lbTxt.map(s => words(root, s, 'serif', { fontSize: L(124, 112) + 'px', fontStyle: 'italic', fontWeight: 600 }, 'beni-text'));
    const dove = el(root, 'emoji', '🕊️', { fontSize: L(150, 140) + 'px', filter: 'drop-shadow(0 18px 24px rgba(80,40,60,0.25))' });
    const V = A('L08') - 0.35, D = A('L09') - 0.3, OUT = A('L10') - 0.8;
    cue(A('L07a') - 0.3, 'shimmer', 0.55);
    cue(A('L07b') - 0.1, 'popSoft', 0.5);
    cue(V, 'whooshUp', 0.5);
    cue(V + 0.2, 'whoosh', 0.45);
    cue(Z('L08') - 0.3, 'sparkle', 0.4);
    cue(D, 'whoosh', 0.45);
    cue(A('L09') + 0.3, 'flutter', 0.55);
    cue(A('L09') + 1.25, 'flutter', 0.45);
    cue(A('L09') + 0.1, 'swell', 0.55);
    cue(OUT, 'whoosh', 0.7);
    const vStag = (Z('L08') - A('L08') - 0.5) / vw.spans.length;
    return t => {
      const up = P(t, V, 0.75, E.inOutCubic), gone = P(t, D, 0.5, E.inCubic);
      const gy = lerp(0, L(-270, -420), up), gs = lerp(1, 0.6, up);
      tf(word.line, { y: gy + 10 * gs, s: gs, o: 1 - gone, blur: gone * 14 });
      animSpans(word, t, A('L07a') - 0.4, 0.07, null, { dy: 40, blur: 18 });
      tf(greek.line, { y: gy - L(160, 150) * gs, s: gs, o: 1 - gone });
      animSpans(greek, t, A('L07a') + 0.15, 0.07, null, { dy: 14 });
      const pp = P(t, A('L07b') - 0.15, 0.6, E.outBack), ppo = P(t, V, 0.4, E.inCubic);
      tf(pill, { y: L(175, 170), s: pp * (1 - 0.1 * ppo), o: Math.min(1, pp * 2) * (1 - ppo), blur: ppo * 10 });
      animSpans(def, t, A('L07b') + 0.2, 0.13, null, { dy: 16 });
      const pv = P(t, V + 0.15, 0.8, E.outCubic);
      tf(verse, { y: L(110, 120) + (1 - pv) * 400 - gone * 80, rx: (1 - pv) * 30, s: lerp(0.92, 1, pv), o: pv * (1 - gone), blur: (1 - pv) * 12 + gone * 14 });
      animSpans(vw, t, A('L08') + 0.05, vStag, null, { dy: 18, dur: 0.5 });
      vref.style.opacity = P(t, Z('L08') - 0.3, 0.4).toFixed(3);
      tf(la.line, { y: L(-90, -230) });
      animSpans(la, t, A('L09') - 0.05, 0.12, OUT, { dy: 28 });
      lb.forEach((l, i) => { tf(l.line, { y: L(50, -90 + i * 130) }); animSpans(l, t, A('L09') + 0.65 + i * 0.25, 0.14, OUT + 0.05, { dy: 36 }); });
      const pd = P(t, A('L09') + 0.05, OUT + 0.6 - A('L09'), E.inOutSine);
      const ds = 1 + 0.07 * Math.sin(t * 16);
      tf(dove, { x: lerp(-W / 2 - 250, W / 2 + 250, pd), y: L(-360, -680) + Math.sin(pd * 9) * 34, r: Math.sin(pd * 9 + 1) * -6, sx: -ds, sy: ds, o: P(t, A('L09'), 0.2) });
      const po = P(t, OUT, 0.65, E.inCubic);
      rootFx(root, { s: 1 + 0.2 * po, blur: 18 * po, o: 1 - po });
    };
  });

  // ======================================================= S7 — la plateforme
  addScene(A('L10') - 0.75, A('L12') - 0.1, root => {
    const bx = L(380, 0), by = L(40, 300);
    const browser = el(root, 'card browser', `
      <div class="bar"><div class="dot" style="background:#ff5f57"></div><div class="dot" style="background:#febc2e"></div><div class="dot" style="background:#28c840"></div>
        <div class="url">🔒&nbsp;<span class="u"></span><span class="caret" style="height:26px"></span></div></div>
      <div class="load"></div>
      <div class="page" style="padding:${L('64px 60px 70px', '80px 56px 90px')};display:flex;flex-direction:column;align-items:center;text-align:center;position:relative">
        <div class="pb" style="display:flex;align-items:center;gap:20px"><div class="app-icon" style="width:96px;height:96px;border-radius:26px">${logoSVG()}</div><div class="wordmark" style="font-size:66px">Agapeo</div></div>
        <div class="pb" style="font:500 25px var(--sans);letter-spacing:0.06em;color:#a06f92;margin-top:26px">PLATEFORME CHRÉTIENNE · AMOUR &amp; RELATIONS</div>
        <div class="pb serif" style="font-weight:600;font-size:${L(52, 58)}px;color:#3a1236;line-height:1.15;margin-top:24px;max-width:${L(860, 840)}px">L’amour, selon le cœur de Dieu</div>
        <div class="pb btn bbtn" style="width:300px;height:86px;font-size:31px;margin-top:38px;position:relative">Découvrir</div>
        <div class="emoji" style="position:absolute;left:52px;top:58px;font-size:46px;opacity:0.85">💗</div>
        <div class="emoji" style="position:absolute;right:58px;top:150px;font-size:40px;opacity:0.8">✨</div>
        <div class="emoji" style="position:absolute;left:84px;bottom:76px;font-size:38px;opacity:0.8">🕊️</div>
      </div>`, { width: L(980, 960) + 'px' });
    const u = browser.querySelector('.u'), caret = browser.querySelector('.caret'), load = browser.querySelector('.load');
    const pbs = [...browser.querySelectorAll('.pb')], bbtn = browser.querySelector('.bbtn');
    const ut0 = A('L10') - 0.05, ut1 = A('L10') + 0.85;
    typingCues('agapeo.love', ut0, ut1, 0.35);
    cue(A('L10') - 0.7, 'whooshUp', 0.55);
    cue(ut1 + 0.15, 'key', 0.6);
    cue(A('L10') + 1.55, 'popSoft', 0.55);
    const ax = L(0, 0.5), cx = L(-850, 0);
    const cap1 = [
      words(root, 'La plateforme', '', { font: `700 ${L(74, 70)}px var(--sans)`, color: '#3a1236' }),
      words(root, 'chrétienne', 'serif', { fontSize: L(112, 108) + 'px', fontStyle: 'italic', fontWeight: 600 }, 'grad-text'),
      words(root, LAND ? 'dédiée à l’amour et aux relations.' : 'dédiée à l’amour', '', { font: `500 ${L(42, 46)}px var(--sans)`, color: '#6b3a62' }),
    ];
    if (!LAND) cap1.push(words(root, 'et aux relations.', '', { font: '500 46px var(--sans)', color: '#6b3a62' }));
    const cap1Y = LAND ? [-150, -30, 90] : [-700, -590, -480, -420];
    const cap1T = [A('L10') + 1.05, A('L10') + 1.85, A('L10') + 2.6, A('L10') + 3.2];
    const cap2 = [
      words(root, 'Un lieu pensé pour', '', { font: `600 ${L(58, 56)}px var(--sans)`, color: '#3a1236' }),
      words(root, 'celles et ceux qui', '', { font: `600 ${L(58, 56)}px var(--sans)`, color: '#3a1236' }),
      words(root, 'veulent aimer selon', '', { font: `600 ${L(58, 56)}px var(--sans)`, color: '#3a1236' }),
      words(root, 'le cœur de Dieu.', 'serif', { fontSize: L(88, 84) + 'px', fontStyle: 'italic', fontWeight: 600 }, 'beni-text'),
    ];
    const cap2Y = LAND ? [-190, -110, -30, 75] : [-730, -660, -590, -490];
    const cap2T = [A('L11'), A('L11') + 2.0, A('L11') + 2.75, A('L11') + 3.5];
    const OUT = A('L12') - 0.8;
    const click = A('L11') + 3.0;
    let btnPos = [bx, by + 200];
    LAYOUT_HOOKS.push(() => {
      renderFrame(click - 0.5);
      const r = bbtn.getBoundingClientRect(), s = stage.getBoundingClientRect();
      btnPos = [r.left + r.width / 2 - s.left - W / 2, r.top + r.height / 2 - s.top - H / 2];
      ckeys[1][1] = btnPos[0] + 10;
      ckeys[1][2] = btnPos[1] + 8;
      burst(click + 0.05, btnPos[0], btnPos[1], { n: 34, kind: 'heart', speed: 1100, size: 26, life: 1.5, gravity: 120, colors: ['#ff4f8b', '#ff8a5c', '#ffb3c7', '#f2b544'] });
    });
    cue(click + 0.05, 'pop', 0.7);
    cue(OUT, 'whooshLong', 0.75);
    const ckeys = [[A('L11') + 1.5, L(820, 470), L(520, 900)], [click - 0.12, 0, 0]];
    const cursor = makeCursor(root, ckeys, [click]);
    return t => {
      const pin = P(t, A('L10') - 0.6, 0.95, E.outCubic), po = P(t, OUT, 0.7, E.inCubic);
      tf(browser, { x: bx, y: by + (1 - pin) * 700, rx: (1 - pin) * 30, ry: L(-12, 0) * (1 - po), s: 1 + po * 1.3, o: pin * (1 - po), blur: po * 22 });
      typeInto(u, 'agapeo.love', t, ut0, ut1);
      caret.style.opacity = t < ut1 + 0.2 && (t < ut0 || t > ut1 ? Math.floor(t * 2.4) % 2 === 0 : true) ? 1 : 0;
      const pl = P(t, ut1 + 0.2, 0.55, E.inOutCubic);
      load.style.width = (pl * 100).toFixed(1) + '%';
      load.style.opacity = (1 - P(t, ut1 + 0.8, 0.3)).toFixed(3);
      pbs.forEach((b, i) => { const p = P(t, A('L10') + 1.45 + i * 0.12, 0.55, E.outCubic); sub(b, { y: (1 - p) * 30, o: p, blur: (1 - p) * 8 }); });
      const press = 1 - 0.07 * bump(P(t, click - 0.03, 0.25));
      bbtn.style.transform = `scale(${press.toFixed(3)})`;
      cap1.forEach((l, i) => { tf(l.line, { x: cx, y: cap1Y[i], ax }); animSpans(l, t, cap1T[i], 0.09, A('L11') - 0.4, { dy: 30 }); });
      cap2.forEach((l, i) => { tf(l.line, { x: cx, y: cap2Y[i], ax }); animSpans(l, t, cap2T[i], 0.1, OUT - 0.05, { dy: 30 }); });
      cursor(t);
    };
  });

  // ======================================================= S8 — les valeurs
  const FAN = FLASH9 - 1.1;
  addScene(A('L12') - 0.9, FLASH9 + 0.4, root => {
    const data = [
      { e: 'cross', title: 'La foi au centre', sub: 'Dieu au cœur de chaque relation.', bg: 'linear-gradient(160deg,#ffe3ec,#ffc6d9)', t: A('L12') - 0.1 },
      { e: '🕊️', title: 'Des valeurs qui comptent', sub: 'Partager l’essentiel.', bg: 'linear-gradient(160deg,#f0eaff,#d6caff)', t: A('L13') - 0.1 },
      { e: '🤝', title: 'Le respect', sub: 'Aimer avec douceur et honneur.', bg: 'linear-gradient(160deg,#ffefdf,#ffd2ae)', t: Z('L14a') - 0.8 },
      { e: '💌', title: 'La sincérité', sub: 'Des cœurs vrais, sans faux-semblants.', bg: 'linear-gradient(160deg,#ffe6ea,#ffc0cb)', t: A('L14b') - 0.05 },
      { e: '🙏', title: 'La prière', sub: 'Construire à deux, avec Dieu.', bg: 'linear-gradient(160deg,#e4f2ff,#c4e1ff)', t: A('L14c') - 0.05 },
    ];
    const cw = L(420, 600), chTop = L(300, 420);
    const cards = data.map(d => el(root, 'card', `
      <div class="top" style="height:${chTop}px;border-radius:30px;margin:14px;background:${d.bg};display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 0 rgba(255,255,255,0.7)">
        <span class="emoji ic" style="font-size:${L(150, 190)}px;display:inline-block;filter:drop-shadow(0 18px 24px rgba(80,20,60,0.22))">${icon(d.e)}</span></div>
      <div style="padding:${L('18px 30px 40px', '24px 40px 54px')};text-align:center">
        <div class="serif" style="font-weight:600;font-size:${L(42, 54)}px;color:#3a1236;line-height:1.12">${d.title}</div>
        <div style="font:400 ${L(25, 32)}px var(--sans);color:#8a6481;margin-top:14px;line-height:1.35">${d.sub}</div></div>`,
      { width: cw + 'px', padding: '0' }));
    const sp = L(470, 650);
    const ENTER = A('L12') - 0.85;
    data.forEach((d, i) => {
      if (i > 0) cue(d.t - 0.25, 'whoosh', 0.45);
      cue(d.t + 0.1, 'pop', 0.6);
    });
    cue(ENTER, 'whooshUp', 0.5);
    cue(FAN, 'swish', 0.6);
    cue(FLASH9 - 0.35, 'whooshUp', 0.8);
    return t => {
      let p = 0;
      for (let i = 1; i < data.length; i++) p += P(t, data[i].t - 0.25, 0.6, E.inOutCubic);
      const pf = P(t, FAN, 0.6, E.outBack), pfo = P(t, FLASH9 - 0.35, 0.45, E.inCubic);
      cards.forEach((c, i) => {
        const d = i - p, ad = Math.abs(d);
        const pin = P(t, ENTER + i * 0.08, 0.8, E.outCubic);
        const fanX = (i - 2) * L(150, 110), fanY = Math.abs(i - 2) * 40, fanR = (i - 2) * 11;
        const x = lerp(d * sp, fanX, pf), y = lerp(L(40, 120), L(40, 120) + fanY, pf) + (1 - pin) * 600 - pfo * 1400;
        const s = lerp(1 - 0.17 * Math.min(ad, 1.5), 0.8, pf);
        tf(c, {
          x, y, r: lerp(0, fanR, pf), ry: lerp(-clamp(d, -1.5, 1.5) * 26, 0, pf), rx: (1 - pin) * 40,
          s, o: pin * lerp(1 - 0.3 * Math.min(ad, 2.2), 1, pf), blur: lerp(Math.max(0, ad - 0.7) * 4, 0, pf) + (1 - pin) * 12 + pfo * 10,
        });
        c.style.zIndex = String(100 - Math.round(ad * 10));
        const ic = c.querySelector('.ic');
        ic.style.transform = `scale(${(1 + 0.25 * bump(P(t, data[i].t + 0.05, 0.5))).toFixed(3)}) translateY(${(Math.sin(t * 2.2 + i) * 6).toFixed(1)}px)`;
      });
    };
  });

  // ======================================================= S9 — tu mérites
  flash(FLASH9, 0.75, 0.65, 0.12);
  addScene(FLASH9 - 0.05, FLASH10 + 0.1, root => {
    const l1 = words(root, 'Tu mérites', '', { font: `800 ${L(120, 112)}px var(--sans)`, color: '#3a1236', letterSpacing: '-0.02em' });
    const l2 = letters(root, LAND ? 'un amour qui t’élève' : 'un amour qui t’élève', 'serif', { fontSize: L(128, 96) + 'px', fontStyle: 'italic', fontWeight: 600 }, 'grad-text');
    const l3 = words(root, 'un amour qui dure', 'serif', { fontSize: L(128, 100) + 'px', fontStyle: 'italic', fontWeight: 600, color: '#3a1236' });
    const infW = L(980, 900);
    const inf = el(root, '', `<svg viewBox="0 0 400 180" width="${infW}" height="${infW * 0.45}">
      <defs><linearGradient id="infg" x1="0" x2="1"><stop offset="0" stop-color="#ff4f8b"/><stop offset="0.5" stop-color="#f2b544"/><stop offset="1" stop-color="#ff8a5c"/></linearGradient></defs>
      <path id="infp" d="M200 90 C 160 30, 70 20, 60 90 C 70 160, 160 150, 200 90 C 240 30, 330 20, 340 90 C 330 160, 240 150, 200 90 Z" fill="none" stroke="url(#infg)" stroke-width="7" stroke-linecap="round"/></svg>`);
    const infPath = inf.querySelector('path');
    const infLen = 860;
    infPath.style.strokeDasharray = infLen;
    const l4 = words(root, 'un amour', '', { font: `500 ${L(60, 58)}px var(--sans)`, color: '#6b3a62', letterSpacing: '0.04em' });
    const beniWrap = el(root, '', '', { filter: 'none' });
    const halo = el(root, '', '', { width: L(1100, 1000) + 'px', height: L(620, 620) + 'px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0.5) 45%, rgba(255,255,255,0) 100%)' });
    root.insertBefore(halo, beniWrap);
    const beni = letters(beniWrap, 'béni', 'script', { position: 'relative', left: 0, top: 0, transform: 'none', fontSize: L(330, 300) + 'px', lineHeight: 1.2, padding: '0 40px' }, 'beni-text');
    beni.line.style.filter = 'drop-shadow(0 6px 10px rgba(120,60,0,0.35)) drop-shadow(0 0 30px rgba(255,190,90,0.7))';
    const O1 = A('L16') - 0.35, O2 = A('L17') - 0.3;
    riseEmitter(A('L15') + 1.1, A('L15') + 3.0, { n: 70, life: 2.0 });
    burst(A('L17') + 0.3, 0, L(20, 20), { n: 60, kind: 'star', speed: 1300, size: 26, life: 2.1, gravity: 60, colors: ['#ffe3a3', '#f2b544', '#ffffff', '#ffd27a'] });
    cue(A('L15') + 0.35, 'whoosh', 0.55);
    cue(A('L15') + 1.2, 'whooshUp', 0.6);
    cue(O1, 'whoosh', 0.45);
    cue(A('L16') + 0.05, 'shimmer', 0.55);
    cue(O2, 'whoosh', 0.45);
    cue(A('L17') + 0.25, 'chime', 0.9);
    cue(A('L17') + 0.35, 'sparkle', 0.7);
    cue(FLASH10 - 0.55, 'whooshLong', 0.6);
    return t => {
      const p1 = P(t, O1, 0.45, E.inCubic);
      tf(l1.line, { y: L(-110, -150) - p1 * 140, o: 1 - p1, blur: p1 * 14 });
      animSpans(l1, t, A('L15') + 0.3, 0.14, null, { dy: 50, s0: 1.25, blur: 20 });
      tf(l2.line, { y: L(50, 0) - p1 * 140, o: 1 - p1, blur: p1 * 14 });
      animSpans(l2, t, A('L15') + 1.2, 0.035, null, { dy: 110, dur: 0.7, blur: 12, s0: 0.8 });
      const p2 = P(t, O2, 0.45, E.inCubic);
      tf(l3.line, { y: L(0, 0), o: 1 - p2, blur: p2 * 14, s: 1 + p2 * 0.1 });
      animSpans(l3, t, A('L16') - 0.15, 0.12, null, { dy: 34 });
      infPath.style.strokeDashoffset = (infLen * (1 - P(t, A('L16') - 0.25, 1.3, E.inOutCubic))).toFixed(1);
      tf(inf, { y: L(10, 10), o: 0.6 * P(t, A('L16') - 0.25, 0.3) * (1 - p2), s: 1 + 0.03 * Math.sin(t * 2) });
      tf(l4.line, { y: L(-170, -190) });
      animSpans(l4, t, A('L17') - 0.2, 0.12, FLASH10 - 0.4, { dy: 24 });
      tf(beniWrap, { y: L(40, 40) });
      tf(halo, { y: L(0, 0), s: 0.8 + 0.2 * P(t, A('L17') - 0.2, 0.8, E.outCubic), o: P(t, A('L17') - 0.2, 0.6) * (1 - P(t, FLASH10 - 0.4, 0.4)) });
      animSpans(beni, t, A('L17') + 0.15, 0.09, FLASH10 - 0.35, { dy: 0, s0: 1.4, blur: 22, dur: 0.7 });
      const pz = P(t, FLASH10 - 0.6, 0.6, E.inCubic);
      rootFx(root, { s: 1 + 0.15 * pz });
    };
  });

  // ======================================================= S10 — ta plus belle histoire
  flash(FLASH10, 0.9, 0.7, 0.1);
  addScene(FLASH10 - 0.05, A('L19') + 0.2, root => {
    const l1 = words(root, 'Ta plus belle histoire', 'serif', { fontSize: L(96, 88) + 'px', fontWeight: 600, color: '#3a1236' });
    const l2txt = LAND ? ['commence peut-être aujourd’hui.'] : ['commence peut-être', 'aujourd’hui.'];
    const l2 = l2txt.map(s => words(root, s, 'serif', { fontSize: L(86, 84) + 'px', fontStyle: 'italic', fontWeight: 600 }, 'grad-text'));
    const tog = el(root, '', `
      <div class="trk" style="position:absolute;inset:0;border-radius:70px;background:#ddd4dc;box-shadow:inset 0 4px 10px rgba(0,0,0,0.12)"></div>
      <div class="on" style="position:absolute;inset:0;border-radius:70px;background:linear-gradient(100deg,#ff4f8b,#ff8a5c);box-shadow:0 14px 40px rgba(255,79,139,0.45)"></div>
      <div class="knob" style="position:absolute;top:12px;left:12px;width:116px;height:116px;border-radius:50%;background:#fff;box-shadow:0 8px 20px rgba(60,10,40,0.25);display:flex;align-items:center;justify-content:center">
        <span class="emoji hk" style="font-size:58px">❤️</span></div>`, { width: '256px', height: '140px' });
    const on = tog.querySelector('.on'), knob = tog.querySelector('.knob'), hk = tog.querySelector('.hk');
    const TC = A('L18') + 1.55;
    const ty = L(40, 20);
    burst(TC + 0.08, 60, ty, { n: 34, kind: 'heart', speed: 1100, size: 24, life: 1.5, gravity: 120 });
    cue(A('L18') + 0.95, 'popSoft', 0.6);
    cue(TC + 0.03, 'toggle', 0.9);
    cue(TC + 0.12, 'sparkle', 0.6);
    cue(Z('L18') + 0.3, 'whoosh', 0.6);
    const cursor = makeCursor(root, [[A('L18') + 0.7, L(620, 400), L(420, 700)], [TC - 0.12, 30, ty + 12]], [TC]);
    const OUT = Z('L18') + 0.3;
    return t => {
      tf(l1.line, { y: L(-170, -260) });
      animSpans(l1, t, A('L18') + 0.02, 0.14, OUT, { dy: 36 });
      l2.forEach((l, i) => { tf(l.line, { y: L(230, 240 + i * 105) }); animSpans(l, t, TC + 0.15 + i * 0.3, 0.13, OUT + 0.05, { dy: 36 }); });
      const pa = P(t, A('L18') + 0.9, 0.55, E.outBack), po = P(t, OUT, 0.45, E.inCubic);
      tf(tog, { y: ty, s: pa * (1 - 0.06 * bump(P(t, TC - 0.03, 0.25))), o: Math.min(1, pa * 2) * (1 - po), blur: po * 14 });
      const pk = P(t, TC + 0.02, 0.35, E.outBack);
      knob.style.transform = `translateX(${(pk * 116).toFixed(1)}px)`;
      on.style.opacity = P(t, TC, 0.3).toFixed(3);
      hk.style.opacity = P(t, TC + 0.05, 0.25).toFixed(3);
      hk.style.transform = `scale(${(0.5 + 0.5 * P(t, TC + 0.05, 0.4, E.outBack)).toFixed(3)})`;
      cursor(t);
    };
  });

  // ======================================================= S11 — appel à l'action (persiste jusqu'à la fin)
  addScene(A('L19') - 0.3, TL.total + 0.1, root => {
    const btn = el(root, 'btn', `<span class="l1" style="position:absolute">Rejoindre Agapeo&nbsp;&nbsp;→</span><span class="l2" style="position:absolute;opacity:0">agapeo.love</span><div class="shine"></div>`,
      { width: L(780, 820) + 'px', height: L(150, 156) + 'px', font: `700 ${L(56, 56)}px var(--sans)`, letterSpacing: '0.01em' });
    const l1 = btn.querySelector('.l1'), l2 = btn.querySelector('.l2'), shine = btn.querySelector('.shine');
    const CL = A('L19') + 1.05;
    burst(CL + 0.05, 0, 0, { n: 40, kind: 'mixed', speed: 1300, size: 26, life: 1.6, gravity: 140 });
    cue(A('L19') - 0.15, 'popSoft', 0.7);
    cue(A('L19') + 0.45, 'shimmer', 0.4);
    cue(CL + 0.05, 'pop', 0.7);
    const cursor = makeCursor(root, [[A('L19') + 0.15, L(640, 420), L(400, 760)], [CL - 0.12, 40, 18]], [CL]);
    const MV = A('L20') - 0.6;
    return t => {
      const pin = P(t, A('L19') - 0.15, 0.6, E.outBack);
      const pm = P(t, MV, 0.8, E.inOutCubic);
      const press = 1 - 0.06 * bump(P(t, CL - 0.03, 0.25));
      const wFull = L(780, 820), wSmall = L(560, 600);
      btn.style.width = lerp(wFull, wSmall, P(t, CL + 0.15, 0.45, E.inOutCubic)).toFixed(1) + 'px';
      const push = 1 + 0.035 * P(t, A('L20'), TL.total - A('L20'));
      tf(btn, { y: lerp(0, L(300, 470), pm) * push, s: pin * press * lerp(1, 0.78, pm) * push, o: Math.min(1, pin * 2) });
      const sw = P(t, CL + 0.2, 0.3);
      l1.style.opacity = (1 - sw).toFixed(3);
      l2.style.opacity = sw.toFixed(3);
      const s1 = P(t, A('L19') + 0.45, 0.6), s2 = P(t, Z('L21') + 0.3, 0.7);
      shine.style.left = (-40 + 180 * (s1 < 1 ? s1 : s2)).toFixed(1) + '%';
      cursor(t);
    };
  });

  // ======================================================= S12 — carton final
  addScene(A('L20') - 0.7, TL.total + 0.1, root => {
    const halo = el(root, '', '', { width: L(1500, 1100) + 'px', height: L(900, 1300) + 'px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.8), rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%)' });
    const icon = appIcon(root, L(210, 250));
    const wmk = letters(root, 'Agapeo', 'wordmark', { fontSize: L(150, 150) + 'px' });
    const tag = words(root, 'L’amour, selon le cœur de Dieu', 'serif', { fontSize: L(62, 58) + 'px', fontStyle: 'italic', fontWeight: 600 }, 'grad-deep');
    const shine = mk(icon, 'shine', '', { left: '-60%' });
    burst(A('L20') - 0.1, 0, L(-190, -330), { n: 46, kind: 'mixed', speed: 1200, size: 28, life: 1.9, gravity: 120 });
    cue(A('L20') - 0.2, 'impactSoft', 0.8);
    cue(A('L20') - 0.15, 'shimmer', 0.7);
    cue(A('L21') + 0.1, 'sparkle', 0.45);
    cue(Z('L21') + 0.35, 'sparkle', 0.55);
    return t => {
      const push = 1 + 0.035 * P(t, A('L20'), TL.total - A('L20'));
      const pi = P(t, A('L20') - 0.2, 0.7, E.outBack);
      tf(halo, { y: L(20, -60), s: push, o: P(t, A('L20') - 0.5, 0.8) });
      tf(icon, { y: L(-200, -380) * push, s: pi * push, r: (1 - pi) * -20, o: P(t, A('L20') - 0.2, 0.12) });
      shine.style.left = (-60 + 220 * P(t, Z('L21') + 0.3, 0.7, E.inOutCubic)).toFixed(1) + '%';
      tf(wmk.line, { y: L(-10, -110) * push, s: push });
      wmk.spans.forEach((s, i) => { const p = P(t, A('L20') + 0.05 + i * 0.05, 0.5, E.outCubic); sub(s, { y: (1 - p) * 30, o: p, blur: (1 - p) * 14 }); });
      tf(tag.line, { y: L(135, 60) * push, s: push });
      animSpans(tag, t, A('L21') - 0.05, 0.13, null, { dy: 26 });
    };
  });
}

// ---------------------------------------------------------------- rendu
const flashEl = document.getElementById('flash');
function renderFrame(t) {
  const pal = palAt(t);
  drawBg(t, pal);
  drawParticles(t, pal);
  for (const s of SCENES) {
    const vis = t >= s.t0 && t < s.t1;
    s.root.style.display = vis ? 'block' : 'none';
    if (vis) s.update(t);
  }
  let f = 0;
  for (const F of FLASHES) f = Math.max(f, F.peak * P(t, F.t0 - F.rise, F.rise) * (1 - P(t, F.t0, F.dur, E.outCubic)));
  flashEl.style.opacity = f.toFixed(3);
}

async function init() {
  TL = await (await fetch('timeline.json')).json();
  buildScenes();
  await document.fonts.ready;
  // force le chargement de chaque police utilisée
  await Promise.all([
    "500 40px 'Playfair Display'", "600 40px 'Playfair Display'", "italic 500 40px 'Playfair Display'",
    "italic 600 40px 'Playfair Display'", "400 40px 'Great Vibes'", "40px 'Noto Color Emoji'",
  ].map(f => document.fonts.load(f, 'Agapè ✝️🕊️')));
  fixGradients();
  for (const h of LAYOUT_HOOKS) h();
  CUES.sort((a, b) => a.t - b.t);
  window.CUES = CUES;
  window.renderFrame = renderFrame;
  window.TOTAL = TL.total;
  renderFrame(0);
  window.READY = true;
  if (params.has('play')) {
    const t0 = performance.now() - (+params.get('play') || 0) * 1000;
    const loop = () => { renderFrame(((performance.now() - t0) / 1000) % TL.total); requestAnimationFrame(loop); };
    loop();
  }
}
init();
