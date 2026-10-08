// Bovann Group — 84 s spot. renderFrame(f) draws frame f (29.97 fps units; halves for the 59.94 master) as a pure function.
import {
  W, H, FPS, DUR, C, clamp, lerp, fr, ease, eo, eoV, ei, eiV, kf, kff, beatPulse, hash, hs, snoise,
  canvas, fx, rr, circle, glow, rgba, FONT, measure, fit, rich, wrap, initGrain, grain, darkBG, lightBG, streaks, shake,
} from "./engine.js";
import { icon } from "./icons.js";

const M = document.getElementById("stage");
const mx = M.getContext("2d");
const L = canvas(), lx = L.getContext("2d");
let LOGO = null; // official logo image (assets/logo.png|svg), never redrawn

// ---------- logo ----------
function logoBox(maxW, maxH) {
  const ar = LOGO ? LOGO.naturalWidth / LOGO.naturalHeight : 2.2;
  let w = maxW, h = w / ar;
  if (h > maxH) { h = maxH; w = h * ar; }
  return [w, h];
}
// Draws the official logo centred on (cx, cy). Without the file: a clearly marked placeholder slot.
function drawLogo(ctx, cx, cy, maxW, maxH, dark = false) {
  const [w, h] = logoBox(maxW, maxH);
  if (LOGO) { ctx.drawImage(LOGO, cx - w / 2, cy - h / 2, w, h); return [w, h]; }
  ctx.save();
  rr(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(28, h * 0.2));
  ctx.fillStyle = dark ? rgba(C.white, 0.06) : rgba(C.navy, 0.04);
  ctx.fill();
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark ? rgba(C.pale, 0.7) : rgba(C.navy, 0.55);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  const s = Math.min(fit("LOGO OFFICIEL BOVANN GROUP", (z) => FONT.ui(z, 600), 40, w * 0.86), h * 0.16);
  ctx.font = FONT.ui(s, 600);
  ctx.fillStyle = dark ? C.pale : C.navy;
  ctx.fillText("LOGO OFFICIEL BOVANN GROUP", cx, cy - s * 0.1);
  ctx.font = FONT.ui(s * 0.62, 500);
  ctx.fillStyle = dark ? C.soft : C.soft;
  ctx.fillText("emplacement — fichier en attente", cx, cy + s * 0.95);
  ctx.restore();
  return [w, h];
}

// ---------- shared pieces ----------
const B = (k) => k * 0.5; // beat k → seconds
const pop = (t, t0) => kff(t, t0, [[0, 0.55], [3, 1.08, ease.out], [5, 1, ease.inout]]); // 5-frame overshoot
const rise = (t, t0, r = 0.2) => 1 - eo(t, t0, r);

function glassRect(ctx, x, y, w, h, r, o = {}) {
  ctx.save();
  ctx.shadowColor = rgba(C.navy, o.shadow ?? 0.14);
  ctx.shadowBlur = o.sb ?? 34;
  ctx.shadowOffsetY = o.sy ?? 14;
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = rgba(C.white, o.a ?? 0.66);
  ctx.fill();
  ctx.restore();
  ctx.save();
  rr(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, rgba(C.white, 0.55));
  g.addColorStop(1, rgba(C.white, 0.05));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba(C.white, 0.95);
  ctx.stroke();
  rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(C.pale, o.edge ?? 0.9);
  ctx.stroke();
  ctx.restore();
}

// =====================================================================================
// S1 HOOK f0–177, dark
// =====================================================================================
const Q = [[0.5, "UNE IDÉE ?"], [1.5, "UN PROJET ?"], [2.5, "UN ÉVÈNEMENT ?"], [3.5, "UNE MARQUE À LANCER ?"], [4.5, "UNE ÉQUIPE À FORMER ?"]];
const S1Y = 470; // question baseline
let S1SIZE = [], SHARDS = [];
function initS1() {
  S1SIZE = Q.map(([, s]) => fit(s, FONT.head, 130, 1500));
  // Particles sampled from the last question's pixels.
  const c = canvas(), x = c.getContext("2d");
  x.font = FONT.head(S1SIZE[4]);
  x.textAlign = "center";
  x.fillStyle = "#fff";
  x.fillText(Q[4][1], 960, S1Y);
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 250; y < 560; y += 5) for (let xx = 100; xx < 1820; xx += 5) if (d[(y * W + xx) * 4 + 3] > 140) pts.push([xx, y]);
  SHARDS = pts.filter((_, i) => hash(i, 77) < Math.min(1, 1100 / pts.length));
}
function shardPos(i, t) {
  const [x0, y0] = SHARDS[i], u = clamp((t - 5.5) / 0.44);
  const a = hash(i, 1) * 6.283, burst = 18 + hash(i, 2) * 70, d0 = hash(i, 3) * 0.22;
  const bx = x0 + Math.cos(a) * burst * ease.out(clamp(u * 3.5)), by = y0 + Math.sin(a) * burst * ease.out(clamp(u * 3.5)) - 20 * ease.out(clamp(u * 3));
  const p = Math.pow(clamp((u - d0) / (1 - d0)), 2.2);
  const sw = (hash(i, 4) > 0.5 ? 1 : -1) * 0.9 * p * (1 - p);
  const dx = bx - 960, dy = by - 540, k = 1 - p;
  return [960 + (dx * Math.cos(sw) - dy * Math.sin(sw)) * k, 540 + (dx * Math.sin(sw) + dy * Math.cos(sw)) * k, p];
}
function S1(x, t) {
  const cam = { bg: "dark", s: 1 + 0.12 * Math.pow(t / 5.94, 1.7), shake: shake(t, 0, 8, 3) };
  const cx = 960, cy = 540;
  // red line growing out of the dot, collapsing back into it at the end
  const half = 380 * kf(t, [[0.3, 0], [1.2, 1, ease.out5]]) * (1 - ei(t, 5.5, 5.9, 2));
  if (half > 0.5) {
    const g = x.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, rgba(C.red, 0)); g.addColorStop(0.12, C.red); g.addColorStop(0.88, C.red); g.addColorStop(1, rgba(C.red, 0));
    x.fillStyle = g;
    x.fillRect(cx - half, cy - 1.5, 2 * half, 3);
  }
  // questions
  Q.forEach(([q, s], i) => {
    const next = i < 4 ? Q[i + 1][0] : 99;
    if (t < q || t >= next) return;
    const lf = (t - q) * FPS;
    let y = S1Y + 50 * (1 - eo(t, q, 0.38)), dy = 24 * (1 - clamp(lf / 4)), a = clamp(lf / 2.5);
    const ex = clamp((t - (next - 4 / FPS)) * FPS / 4);
    if (ex > 0) { y -= 90 * ex * ex; dy = 36 * ex; a *= 1 - Math.pow(ex, 1.4); }
    if (i === 4 && t >= 5.5) a *= 1 - clamp((t - 5.5) * FPS / 3);
    if (a <= 0.01) return;
    fx(x, { dy, alpha: a, box: [0, 200, W, 400] }, (c) => {
      c.font = FONT.head(S1SIZE[i]);
      c.textAlign = "center";
      c.fillStyle = C.white;
      c.fillText(s, cx, y);
    });
  });
  // shatter → sucked into the dot
  if (t >= 5.5) {
    x.save();
    x.lineCap = "round";
    for (let i = 0; i < SHARDS.length; i++) {
      const [px, py, p] = shardPos(i, t), [qx, qy] = shardPos(i, t - 1 / FPS);
      const h = hash(i, 9);
      x.strokeStyle = h < 0.12 ? C.white : h < 0.3 ? C.hot : C.red;
      x.globalAlpha = 1 - p * 0.5;
      x.lineWidth = 3.2 * (1 - p * 0.6);
      x.beginPath(); x.moveTo(qx, qy); x.lineTo(px + 0.01, py); x.stroke();
    }
    x.restore();
  }
  // the dot: bloom on f0, pulse on every beat, swells as it swallows the particles
  const p = beatPulse(t, 0, 5.5), bloom = Math.exp(-t * FPS / 6);
  const r = 10 * (1 + 0.35 * p) * (1 + 0.5 * ei(t, 5.55, 5.94, 2));
  glow(x, cx, cy, 1100, C.hot, 0.55 * bloom);
  glow(x, cx, cy, 380, C.red, 0.7 * bloom);
  glow(x, cx, cy, 70 + 50 * p, C.red, 0.45 + 0.35 * p);
  x.fillStyle = C.red; circle(x, cx, cy, r); x.fill();
  x.fillStyle = rgba(C.white, 0.9 * bloom); circle(x, cx, cy, r * 0.55); x.fill();
  if (t > 5.94 - 3 / FPS) cam.streak = { dir: [1, 0], amt: clamp((t - (5.94 - 3 / FPS)) * FPS / 3), seed: 11 };
  return cam;
}

// =====================================================================================
// S2 PROBLEM f178–357, light, handheld
// =====================================================================================
const CARDS = [
  { label: "Prestataire évènementiel", ic: "spotlight", x: 410, y: 440, r: -7, from: [-1350, -250], t: 6.0 },
  { label: "Agence de com", ic: "megaphone", x: 1510, y: 410, r: 6, from: [1300, -380], t: 6.5 },
  { label: "Développeur web", ic: "code", x: 960, y: 535, r: -3, from: [80, -1150], t: 7.0 },
  { label: "Formateur", ic: "cap", x: 560, y: 815, r: 5, from: [-700, 900], t: 7.5 },
  { label: "Consultant", ic: "briefcase", x: 1370, y: 805, r: -6, from: [950, 850], t: 8.0 },
];
const TANGLE = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 1], [4, 0], [2, 3], [1, 4], [0, 3]];
const HEAD2 = [[8.0, "5 PRESTATAIRES.", C.navy], [9.0, "5 INTERLOCUTEURS.", C.navy], [10.0, "5 DÉLAIS.", C.navy], [11.0, "ZÉRO COHÉRENCE.", C.red]];
function cardState(c, t) {
  const e = eo(t, c.t, 0.17), v = eoV(t, c.t, 0.17);
  return { x: c.x + c.from[0] * (1 - e), y: c.y + c.from[1] * (1 - e), r: (c.r + 24 * (1 - e) * Math.sign(c.from[0] || 1)) * Math.PI / 180, vx: c.from[0] * v, vy: c.from[1] * v };
}
function drawProblemCard(x, c, i, t) {
  const w = 380, h = 240;
  glassRect(x, -w / 2, -h / 2, w, h, 32);
  // line icon
  x.fillStyle = rgba(C.navy, 0.07); circle(x, -w / 2 + 62, -h / 2 + 62, 36); x.fill();
  icon(x, c.ic, -w / 2 + 62, -h / 2 + 62, 40, C.navy, 1.9);
  // phone that keeps ringing
  const ring = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7);
  x.save();
  x.translate(w / 2 - 52, -h / 2 + 50);
  x.rotate(0.32 * Math.sin(t * FPS * 1.9 + i) * ring);
  icon(x, "phone", 0, 0, 34, C.navy, 2);
  x.restore();
  x.fillStyle = C.red; circle(x, w / 2 - 34, -h / 2 + 34, 6 + 2 * ring); x.fill();
  x.strokeStyle = rgba(C.navy, 0.35 * ring); x.lineWidth = 2;
  x.beginPath(); x.arc(w / 2 - 52, -h / 2 + 50, 26, -0.9, -0.2); x.stroke();
  // label
  const fs = fit(c.label, (s) => FONT.ui(s, 600), 30, w - 56);
  x.font = FONT.ui(fs, 600); x.textAlign = "left"; x.fillStyle = C.navy;
  x.fillText(c.label, -w / 2 + 28, h / 2 - 40);
  x.fillStyle = rgba(C.navy, 0.12); x.fillRect(-w / 2 + 28, h / 2 - 24, 60, 4);
}
function S2(x, t) {
  const wf = ei(t, 11.5, 11.94, 3);
  const cam = {
    bg: "light",
    x: snoise(t * 1.4, 11) * 7 - 2700 * wf, y: snoise(t * 1.2, 12) * 6, r: snoise(t * 0.9, 13) * 0.004,
    s: 1.02 + 0.01 * snoise(t * 0.5, 14),
    dx: -Math.min(260, 2700 * eiV(t, 11.5, 11.94, 3)),
  };
  if (t > 11.94 - 4 / FPS) cam.streak = { dir: [-1, 0], amt: clamp((t - (11.94 - 4 / FPS)) * FPS / 4), seed: 22 };
  const st = CARDS.map((c) => cardState(c, t));
  // tangled dashed lines
  x.save();
  x.setLineDash([10, 12]);
  x.lineDashOffset = -t * 90;
  x.lineWidth = 2;
  TANGLE.forEach(([a, b], k) => {
    const ta = Math.max(CARDS[a].t, CARDS[b].t) + 0.25;
    const al = clamp((t - ta) / 0.4) * 0.42;
    if (al <= 0) return;
    const A = st[a], Bs = st[b], mxp = (A.x + Bs.x) / 2, myp = (A.y + Bs.y) / 2;
    const nx = -(Bs.y - A.y), ny = Bs.x - A.x, nl = Math.hypot(nx, ny) || 1;
    const o1 = hs(k, 5) * 320 + snoise(t * 0.8, k + 30) * 60, o2 = hs(k, 6) * 280 + snoise(t * 0.7, k + 50) * 60;
    x.strokeStyle = rgba(k % 4 === 0 ? C.red : C.navy, al);
    x.beginPath();
    x.moveTo(A.x, A.y);
    x.bezierCurveTo(lerp(A.x, mxp, 0.5) + nx / nl * o1, lerp(A.y, myp, 0.5) + ny / nl * o1, lerp(mxp, Bs.x, 0.5) - nx / nl * o2, lerp(myp, Bs.y, 0.5) - ny / nl * o2, Bs.x, Bs.y);
    x.stroke();
  });
  x.restore();
  // spinning clock
  if (t >= 7.4) {
    const s = pop(t, 7.4);
    x.save(); x.translate(960, 845); x.scale(s, s);
    x.fillStyle = rgba(C.white, 0.8); circle(x, 0, 0, 58); x.fill();
    x.strokeStyle = C.navy; x.lineWidth = 4; circle(x, 0, 0, 58); x.stroke();
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; x.lineWidth = 2; x.beginPath(); x.moveTo(Math.cos(a) * 48, Math.sin(a) * 48); x.lineTo(Math.cos(a) * 53, Math.sin(a) * 53); x.stroke(); }
    const am = t * 6.283 * 2.6, ah = t * 6.283 * 0.22;
    x.lineCap = "round";
    x.strokeStyle = C.red; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(am) * 42, -Math.cos(am) * 42); x.stroke();
    x.strokeStyle = C.navy; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(ah) * 26, -Math.cos(ah) * 26); x.stroke();
    // motion arc behind the minute hand
    x.strokeStyle = rgba(C.red, 0.25); x.lineWidth = 10; x.beginPath(); x.arc(0, 0, 36, am - Math.PI / 2 - 1.2, am - Math.PI / 2); x.stroke();
    x.fillStyle = C.navy; circle(x, 0, 0, 6); x.fill();
    x.restore();
  }
  // cards
  CARDS.forEach((c, i) => {
    if (t < c.t) return;
    const s = st[i], sm = Math.min(150, Math.hypot(s.vx, s.vy) * 0.9), ang = Math.atan2(s.vy, s.vx);
    const tx = 9.0 + 0.5 * i, sq = t >= tx ? kff(t, tx, [[0, 0.9], [1.5, 1.03, ease.out], [3, 1, ease.inout]]) : 1;
    fx(x, { dx: Math.cos(ang) * sm, dy: Math.sin(ang) * sm }, (cc) => {
      cc.translate(s.x, s.y); cc.rotate(s.r); cc.scale(1 / sq ** 0.3, sq);
      drawProblemCard(cc, c, i, t);
      if (t >= tx) { cc.fillStyle = rgba(C.page, 0.35 * clamp((t - tx) * FPS / 3)); rr(cc, -190, -120, 380, 240, 32); cc.fill(); }
    });
    // red × stamp, 3-frame squash
    if (t >= tx) {
      const lf = (t - tx) * FPS;
      const sx = kf(lf, [[0, 1.9], [1.5, 1.25, ease.out], [3, 1, ease.inout]]), sy = kf(lf, [[0, 1.9], [1.5, 0.72, ease.out], [3, 1, ease.inout]]);
      x.save();
      x.translate(s.x, s.y); x.rotate(s.r - 0.14); x.scale(sx, sy);
      x.globalAlpha = clamp(lf / 1.2);
      x.lineCap = "round"; x.strokeStyle = C.red; x.lineWidth = 22;
      x.shadowColor = rgba(C.red, 0.35); x.shadowBlur = 18;
      x.beginPath(); x.moveTo(-62, -62); x.lineTo(62, 62); x.moveTo(62, -62); x.lineTo(-62, 62); x.stroke();
      x.restore();
    }
  });
  // headline
  HEAD2.forEach(([h0, s, col], i) => {
    const next = i < 3 ? HEAD2[i + 1][0] : 99;
    if (t < h0 || t >= next) return;
    const lf = (t - h0) * FPS;
    const sc = kf(lf, [[0, 1.25], [5, 1, ease.out]]);
    let y = 180 - 26 * (1 - eo(t, h0, 0.3)), a = clamp(lf / 2), dy = 18 * (1 - clamp(lf / 4));
    const ex = clamp((t - (next - 3 / FPS)) * FPS / 3);
    if (ex > 0) { y -= 50 * ex * ex; dy = 26 * ex; a *= 1 - ex; }
    const fs = fit(s, FONT.head, 80, 1700);
    fx(x, { alpha: a, dy, box: [0, 40, W, 220] }, (c) => {
      c.translate(960, y - 28); c.scale(sc, sc);
      c.font = FONT.head(fs); c.textAlign = "center"; c.fillStyle = col; c.fillText(s, 0, 28);
    });
  });
  return cam;
}

// =====================================================================================
// S3 THE TURN f358–417, light break
// =====================================================================================
let S3L = null;
function initS3() {
  const segs = [["Et si", C.navy, 0], [" ", C.navy, 0], ["un seul", C.navy, 1], [" ", C.navy, 1], ["partenaire", C.navy, 2], [" ", C.navy, 2], ["faisait ", C.navy, 3], ["tout", C.red, 3], [" ?", C.navy, 3]];
  const full = segs.map((s) => s[0]).join("");
  const size = fit(full, (s) => FONT.head(s, 700), 96, 1640);
  const font = FONT.head(size, 700);
  const ws = segs.map(([s]) => measure(s, font)), tot = ws.reduce((a, b) => a + b, 0);
  let cx = 960 - tot / 2;
  const items = segs.map(([s, col, k], i) => { const it = { s, col, k, x: cx }; cx += ws[i]; return it; });
  // locate the question mark's dot
  const qx = items[8].x + measure(" ", font), base = 540 + size * 0.36;
  const c = canvas(400, 400), g = c.getContext("2d");
  g.font = font; g.fillStyle = "#000"; g.fillText("?", 100, 300);
  const d = g.getImageData(0, 0, 400, 400).data;
  let bottom = -1;
  for (let y = 399; y >= 0 && bottom < 0; y--) for (let xx = 0; xx < 400; xx++) if (d[(y * 400 + xx) * 4 + 3] > 100) { bottom = y; break; }
  let top = bottom;
  for (let y = bottom; y >= 0; y--) { let any = false; for (let xx = 0; xx < 400; xx++) if (d[(y * 400 + xx) * 4 + 3] > 100) { any = true; break; } if (!any) break; top = y; }
  let sx = 0, n = 0;
  for (let y = top; y <= bottom; y++) for (let xx = 0; xx < 400; xx++) if (d[(y * 400 + xx) * 4 + 3] > 100) { sx += xx; n++; }
  S3L = { items, font, size, base, dot: [qx + sx / n - 100, base + (top + bottom) / 2 - 300], dotR: (bottom - top) / 2 + 1 };
}
function S3(x, t) {
  const [dxp, dyp] = S3L.dot;
  const cam = { bg: "light", px: dxp, py: dyp, s: 1 + 0.08 * ei(t, 11.95, 13.94, 2.2) };
  const exp = ei(t, 13.65, 13.94, 2.6);
  if (exp > 0) cam.zoom = { cx: 960 + (dxp - 960), cy: dyp, amt: 0.35 * Math.sin(Math.PI * clamp((t - 13.65) / 0.3)) };
  S3L.items.forEach((it) => {
    const tk = 12.0 + 0.5 * it.k;
    if (t < tk || !it.s.trim()) return;
    const lf = (t - tk) * FPS;
    const y = S3L.base + 36 * (1 - eo(t, tk, 0.3));
    fx(x, { alpha: clamp(lf / 3), dy: 22 * (1 - clamp(lf / 5)), box: [0, 380, W, 320] }, (c) => {
      c.font = S3L.font; c.textAlign = "left"; c.fillStyle = it.col; c.fillText(it.s, it.x, y);
    });
  });
  // the dot of "?" turns red and swallows the frame
  if (t >= 13.6) {
    const r = S3L.dotR * 1.12 + 2500 * exp;
    if (exp < 0.05) glow(x, dxp, dyp, 40 + 400 * exp, C.red, 0.35);
    x.fillStyle = C.red; circle(x, dxp, dyp, r); x.fill();
  }
  if (t > 13.94 - 3 / FPS) cam.flash = [C.red, 0.4 * clamp((t - (13.94 - 3 / FPS)) * FPS / 3)];
  return cam;
}

// =====================================================================================
// S4 DROP + LOGO f418–596, light
// =====================================================================================
const T4 = 418 / FPS;
const SIG = [["EXPERTISE.", C.navy], ["INNOVATION.", C.navy], ["RÉSULTATS.", C.red]];
const SERV = ["Évènementiel", "Communication", "Informatique", "Formations", "Management"];
let S4L = null;
function initS4() {
  const gap = 38;
  let size = 80;
  const tot = (s) => SIG.reduce((a, [w]) => a + measure(w, FONT.head(s)), 0) + gap * 2;
  while (tot(size) > 1500) size--;
  let cx = 960 - tot(size) / 2;
  const sig = SIG.map(([w, col]) => { const ww = measure(w, FONT.head(size)); const it = { w, col, x: cx, ww }; cx += ww + gap; return it; });
  const sf = FONT.ui(34, 600), dot = "  ·  ";
  const sw = SERV.map((s) => measure(s, sf)), dw = measure(dot, sf), stot = sw.reduce((a, b) => a + b, 0) + dw * 4;
  let sx = 960 - stot / 2;
  const serv = SERV.map((s, i) => { const it = { s, x: sx, w: sw[i] }; sx += sw[i] + dw; return it; });
  S4L = { sig, size, serv, sf, dw };
}
function S4(x, t) {
  const wf = ei(t, 19.5, 19.94, 3);
  const cam = {
    bg: "light", s: 1 + 0.03 * clamp((t - 14.6) / 5), shake: shake(t, 14.0, 8, 5),
    x: -2700 * wf, dx: -Math.min(240, 12 + 2700 * eiV(t, 19.5, 19.94, 3)) * (t > 19.5 ? 1 : 0),
  };
  if (t > 19.94 - 4 / FPS) cam.streak = { dir: [-1, 0], amt: clamp((t - (19.94 - 4 / FPS)) * FPS / 4), seed: 44 };
  const lf = (t - T4) * FPS;
  // shockwave ring
  if (lf < 12) {
    const u = lf / 12;
    x.strokeStyle = C.red; x.lineWidth = 48 * (1 - u);
    circle(x, 960, 540, 120 + 1080 * ease.out(u)); x.stroke();
  }
  // logo slam
  const ls = kf(lf, [[0, 1.6], [6, 0.96, ease.out], [12, 1, ease.inout]]);
  const ly = 540 - 215 * eo(t, 14.6, 0.15);
  fx(x, { zoom: { cx: 960, cy: ly, amt: 0.55 * (1 - clamp(lf / 3)) }, n: 20 }, (c) => {
    c.translate(960, ly); c.scale(ls, ls); drawLogo(c, 0, 0, 760, 340);
  });
  // signature, one word per beat
  const by = 655;
  S4L.sig.forEach((it, k) => {
    const tk = 15.0 + 0.5 * k;
    if (t < tk) return;
    const f = (t - tk) * FPS, sc = kf(f, [[0, 1.15], [6, 1, ease.out]]);
    x.save();
    x.globalAlpha = clamp(f / 2);
    x.translate(it.x + it.ww / 2, by - S4L.size * 0.35); x.scale(sc, sc);
    x.font = FONT.head(S4L.size); x.textAlign = "center"; x.fillStyle = it.col;
    x.fillText(it.w, 0, S4L.size * 0.35);
    x.restore();
    // red underline sweeping left → right, handed over to the next word
    const inn = ease.out(clamp(f / 6)), out = k < 2 ? ease.inout(clamp((t - (tk + 0.5)) * FPS / 6)) : 0;
    const a = it.x + it.ww * out, b = it.x + it.ww * inn;
    if (b > a + 0.5) { x.fillStyle = C.red; x.fillRect(a, by + 18, b - a, 6); }
  });
  // positioning line
  if (t >= 16.5) {
    const r = rise(t, 16.5);
    fx(x, { blur: 8 * r, alpha: clamp((t - 16.5) * FPS / 4), box: [0, 690, W, 90] }, (c) => {
      c.font = FONT.body(42, 500); c.textAlign = "center"; c.fillStyle = C.grey;
      c.fillText("Votre partenaire pluridisciplinaire, à Lomé.", 960, 742 + 30 * r);
    });
  }
  // five pillars, each lighting red on its beat
  if (t >= 17.0) {
    const r = rise(t, 17.0);
    x.save();
    x.globalAlpha = clamp((t - 17) * FPS / 4);
    x.font = S4L.sf; x.textAlign = "left";
    const y = 832 + 26 * r;
    S4L.serv.forEach((it, k) => {
      const tk = 17.0 + 0.5 * k, hot = t >= tk ? (k === 4 ? 1 : 1 - ease.inout(clamp((t - tk - 0.2) / 0.35))) : 0;
      x.fillStyle = hot > 0.5 ? C.red : C.navy;
      if (t >= tk && t < tk + 0.2) { const s = kff(t, tk, [[0, 1.12], [5, 1, ease.out]]); x.save(); x.translate(it.x + it.w / 2, y - 12); x.scale(s, s); x.fillText(it.s, -it.w / 2, 12); x.restore(); }
      else x.fillText(it.s, it.x, y);
      if (k < 4) { x.fillStyle = C.soft; x.fillText("  ·  ", it.x + it.w, y); }
    });
    x.restore();
  }
  return cam;
}

// =====================================================================================
// S5 PILLARS — shared grammar
// =====================================================================================
const CW = 1500, CH = 760, CX = 210, CY = 52;
const CC = canvas(CW, CH), cc = CC.getContext("2d");
const BC = canvas(188, 95), bc = BC.getContext("2d");
const TM = canvas(CW, CH), tm = TM.getContext("2d");
function frost() { bc.filter = "blur(1.5px)"; bc.clearRect(0, 0, 188, 95); bc.drawImage(CC, 0, 0, 188, 95); bc.filter = "none"; }
function frostClip(ctx, path, a) { ctx.save(); path(); ctx.clip(); ctx.drawImage(BC, 0, 0, CW, CH); ctx.fillStyle = rgba(C.white, a); ctx.fillRect(0, 0, CW, CH); ctx.restore(); }

function drawCard(P, t) {
  const lt = t - P.T;
  cc.setTransform(1, 0, 0, 1, 0, 0);
  cc.clearRect(0, 0, CW, CH);
  P.art(cc, t, lt);
  frost();
  // pill "0X / 05"
  if (lt > 0.25) {
    const s = pop(t, P.T + 0.25), txt = `${P.n} / 05`;
    cc.save(); cc.translate(48, 48); cc.scale(s, s);
    cc.font = FONT.ui(28, 600);
    const w = measure(txt, FONT.ui(28, 600), 2) + 52;
    frostClip(cc, () => rr(cc, 0, 0, w, 58, 29), P.dark ? 0.32 : 0.6);
    rr(cc, 0, 0, w, 58, 29); cc.strokeStyle = rgba(C.white, 0.85); cc.lineWidth = 1.5; cc.stroke();
    cc.letterSpacing = "2px"; cc.fillStyle = P.dark ? C.white : C.navy; cc.textAlign = "left";
    cc.fillText(txt, 26, 39);
    cc.fillStyle = C.red; circle(cc, w - 2, 0, 0); cc.fill();
    cc.restore();
    cc.letterSpacing = "0px";
  }
  // chips on the right
  const cf = FONT.ui(34, 600);
  let cy = 112;
  P.chips.forEach(([ic, label], k) => {
    const tk = P.T + 2 + 0.5 * k;
    const lines = wrap(label, cf, 500), w = Math.min(640, Math.max(...lines.map((l) => measure(l, cf))) + 112), h = 40 + lines.length * 42;
    const x0 = CW - 48 - w;
    if (t >= tk) {
      const s = pop(t, tk);
      cc.save();
      cc.translate(x0 + w, cy + h / 2); cc.scale(s, s); cc.translate(-w, -h / 2);
      cc.globalAlpha = clamp((t - tk) * FPS / 2);
      cc.save(); cc.shadowColor = rgba(C.night, P.dark ? 0.4 : 0.14); cc.shadowBlur = 30; cc.shadowOffsetY = 10; rr(cc, 0, 0, w, h, 26); cc.fillStyle = rgba(C.white, 0.01); cc.fill(); cc.restore();
      cc.save(); rr(cc, 0, 0, w, h, 26); cc.clip(); cc.drawImage(BC, -x0 - 0, -cy, CW, CH); cc.fillStyle = rgba(C.white, 0.8); cc.fillRect(0, 0, w, h); cc.restore();
      rr(cc, 0, 0, w, h, 26); cc.strokeStyle = rgba(C.white, 1); cc.lineWidth = 1.5; cc.stroke();
      cc.fillStyle = rgba(C.red, 0.1); circle(cc, 50, h / 2, 26); cc.fill();
      icon(cc, ic, 50, h / 2, 32, C.red, 2);
      cc.font = cf; cc.fillStyle = C.navy; cc.textAlign = "left";
      lines.forEach((l, j) => cc.fillText(l, 90, h / 2 - (lines.length - 1) * 21 + j * 42 + 12));
      cc.restore();
    }
    cy += h + 16;
  });
  // giant frosted title along the bottom edge, cut by the card
  const size = fit(P.title, FONT.head, 400, CW * 0.88), tr = rise(t, P.T + 0.15, 0.14);
  const by = CH + size * 0.07 + size * 0.8 * tr;
  tm.setTransform(1, 0, 0, 1, 0, 0);
  tm.globalCompositeOperation = "source-over";
  tm.clearRect(0, 0, CW, CH);
  tm.font = FONT.head(size); tm.textAlign = "center"; tm.fillStyle = "#fff";
  tm.fillText(P.title, CW / 2, by);
  tm.globalCompositeOperation = "source-in";
  tm.drawImage(BC, 0, 0, CW, CH);
  tm.globalCompositeOperation = "source-atop";
  const sheen = tm.createLinearGradient(0, by - size * 0.75, 0, by);
  sheen.addColorStop(0, rgba(C.white, P.dark ? 0.62 : 0.72));
  sheen.addColorStop(1, rgba(C.white, P.dark ? 0.26 : 0.42));
  tm.fillStyle = sheen;
  tm.fillRect(0, 0, CW, CH);
  tm.globalCompositeOperation = "source-over";
  cc.drawImage(TM, 0, 0);
  cc.font = FONT.head(size); cc.textAlign = "center"; cc.lineWidth = 1.6; cc.strokeStyle = rgba(C.white, 0.7);
  cc.strokeText(P.title, CW / 2, by);
}
function pillar(x, t, P) {
  drawCard(P, t);
  const e = P.enter(t), ex = P.exit(t);
  const ox = e.x + ex.x, oy = e.y + ex.y;
  fx(x, { dx: e.dx + ex.dx, dy: e.dy + ex.dy }, (c) => {
    c.translate(CX + ox, CY + oy);
    c.save(); c.shadowColor = rgba(C.night, P.dark ? 0.6 : 0.2); c.shadowBlur = 60; c.shadowOffsetY = 24; rr(c, 0, 0, CW, CH, 56); c.fillStyle = P.dark ? C.night : C.white; c.fill(); c.restore();
    c.save(); rr(c, 0, 0, CW, CH, 56); c.clip(); c.drawImage(CC, 0, 0); c.restore();
    rr(c, 0.5, 0.5, CW - 1, CH - 1, 56); c.strokeStyle = rgba(P.dark ? C.white : C.pale, P.dark ? 0.14 : 1); c.lineWidth = 1.5; c.stroke();
  });
  // benefit line
  if (P.benefit && t >= P.T + 5) {
    const r = rise(t, P.T + 5, 0.2);
    const full = P.benefit.map((s) => s[0]).join(""), size = fit(full, FONT.head, 68, 1720);
    fx(x, { blur: 10 * r, alpha: clamp((t - P.T - 5) * FPS / 3) }, (c) => {
      c.translate(ox, oy);
      rich(c, P.benefit.map(([s, col]) => [s, col === "red" ? C.red : P.dark ? C.white : C.navy]), 960, 962 + 34 * r, FONT.head(size), "center");
    });
  }
}
const enterFrom = (T0, vx, vy, r = 0.16) => (t) => {
  const e = 1 - eo(t, T0, r), v = eoV(t, T0, r), cap = (d) => Math.sign(d) * Math.min(150, Math.abs(d));
  return { x: vx * e, y: vy * e, dx: cap(-vx * v), dy: cap(-vy * v) };
};
const exitTo = (t0, t1, vx, vy) => (t) => {
  const u = ei(t, t0, t1, 3), v = eiV(t, t0, t1, 3), cap = (d) => Math.sign(d) * Math.min(220, Math.abs(d));
  return { x: vx * u, y: vy * u, dx: cap(vx * v), dy: cap(vy * v) };
};

// ---------- S5a ÉVÈNEMENTIEL (dark stage) ----------
function artEvent(c, t, lt) {
  const g = c.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, C.night); g.addColorStop(0.62, C.navy); g.addColorStop(1, C.slate);
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  glow(c, 750, 720, 700, C.red, 0.22 + 0.1 * beatPulse(t));
  // LED frame
  const fx0 = 370, fy0 = 120, fw = 760, fh = 400;
  c.fillStyle = C.night; c.fillRect(fx0, fy0, fw, fh);
  const sg = c.createRadialGradient(750, 320, 10, 750, 320, 420);
  sg.addColorStop(0, rgba(C.red, 0.35 + 0.25 * beatPulse(t))); sg.addColorStop(1, rgba(C.navy, 0.2));
  c.fillStyle = sg; c.fillRect(fx0, fy0, fw, fh);
  c.lineWidth = 3;
  for (let k = 0; k < 4; k++) { // rings pulsing out of the screen centre
    const ph = ((lt * 0.9 + k * 0.25) % 1 + 1) % 1;
    c.strokeStyle = rgba(C.white, 0.35 * (1 - ph)); circle(c, 750, 320, 20 + ph * 260); c.stroke();
  }
  const per = 2 * (fw + fh), n = Math.round(per / 16);
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per, px, py;
    if (d < fw) { px = fx0 + d; py = fy0; } else if ((d -= fw) < fh) { px = fx0 + fw; py = fy0 + d; } else if ((d -= fh) < fw) { px = fx0 + fw - d; py = fy0 + fh; } else { d -= fw; px = fx0; py = fy0 + fh - d; }
    const b = 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(i * 0.45 - t * 11), 3);
    c.fillStyle = i % 2 ? rgba(C.red, b) : rgba(C.white, b * 0.9);
    circle(c, px, py, 3.2); c.fill();
  }
  // haze
  for (let k = 0; k < 3; k++) glow(c, 300 + k * 450 + 80 * Math.sin(t * 0.4 + k), 380 + 40 * Math.cos(t * 0.3 + k), 420, C.white, 0.05);
  // four sweeping beams, re-aimed on every beat
  c.save();
  c.globalCompositeOperation = "lighter";
  [[230, C.white], [560, C.red], [940, C.white], [1270, C.red]].forEach(([sx, col], i) => {
    const kb = (t - 0.1) / 0.5, k0 = Math.round(kb - 0.5), u = ease.inout(clamp(kb - k0));
    const aim = (k) => 0.5 * Math.PI + 0.42 * hs(k, i + 3) + (sx < 750 ? 0.12 : -0.12);
    const a = lerp(aim(k0), aim(k0 + 1), u), sp = 0.12, len = 1000;
    const bg2 = c.createLinearGradient(sx, -20, sx + Math.cos(a) * len, -20 + Math.sin(a) * len);
    bg2.addColorStop(0, rgba(col, 0.55)); bg2.addColorStop(1, rgba(col, 0));
    c.fillStyle = bg2;
    c.beginPath(); c.moveTo(sx - 8, -20); c.lineTo(sx + Math.cos(a - sp) * len, -20 + Math.sin(a - sp) * len); c.lineTo(sx + Math.cos(a + sp) * len, -20 + Math.sin(a + sp) * len); c.lineTo(sx + 8, -20); c.fill();
    glow(c, sx, 0, 70, col, 0.7);
  });
  c.restore();
  // confetti burst at T+1 (90 seeded particles)
  if (lt >= 1) {
    const tau = (lt - 1) * FPS;
    for (let i = 0; i < 90; i++) {
      const a = -Math.PI / 2 + hs(i, 31) * 1.25, sp = 14 + hash(i, 32) * 20;
      const k = 0.045, dr = (1 - Math.exp(-k * tau)) / k;
      const px = 750 + Math.cos(a) * sp * dr + Math.sin(tau * 0.18 + i) * 10 * clamp(tau / 20);
      const py = 330 + Math.sin(a) * sp * dr + 0.22 * tau * tau * 0.5 * Math.exp(-tau / 160) + 1.1 * tau * clamp(tau / 40);
      if (py > CH + 30) continue;
      const h = hash(i, 33), col = h < 0.5 ? C.red : h < 0.85 ? C.white : C.pale;
      c.save(); c.translate(px, py); c.rotate(tau * (0.1 + hash(i, 34) * 0.25) + i);
      c.scale(1, Math.cos(tau * 0.2 + i));
      c.fillStyle = col; c.globalAlpha = 1 - clamp((lt - 5.5) / 1.5); c.fillRect(-5, -8, 10, 16);
      c.restore();
    }
  }
  // crowd silhouettes, hands up on the beat
  const p = beatPulse(t);
  c.fillStyle = C.night;
  for (let i = 0; i < 28; i++) {
    const hx = 20 + i * 54 + hs(i, 41) * 14, hy = 690 + hash(i, 42) * 30 - (hash(i, 43) > 0.6 ? 8 * p : 0), hr = 22 + hash(i, 44) * 8;
    circle(c, hx, hy, hr); c.fill();
    c.beginPath(); c.ellipse(hx, hy + hr + 46, hr * 2.1, 52, 0, Math.PI, 0); c.lineTo(hx + hr * 2.1, CH); c.lineTo(hx - hr * 2.1, CH); c.fill();
    if (hash(i, 45) > 0.62) {
      c.save(); c.strokeStyle = C.night; c.lineWidth = 12; c.lineCap = "round";
      const up = 70 + 26 * p * hash(i, 46);
      c.beginPath(); c.moveTo(hx + hr, hy + hr + 20); c.lineTo(hx + hr + 22, hy - up); c.stroke(); c.restore();
    }
  }
}
const P1 = {
  T: 20, n: "01", dark: true, title: "ÉVÈNEMENTIEL", art: artEvent,
  chips: [["target", "Conception clé en main"], ["spotlight", "Scénographie, technique & logistique"], ["sparkle", "Expériences immersives & digitales"], ["camera", "Couverture médiatique : mariages, conférences, séminaires, soirées"]],
  benefit: [["DES MOMENTS QUI ", 0], ["MARQUENT", "red"], [" LES ESPRITS.", 0]],
  enter: enterFrom(597 / FPS, 1700, 0), exit: exitTo(27.5, 27.94, 0, -1500),
};
function S5a(x, t) {
  const ex = ei(t, 27.5, 27.94, 3);
  const cam = { bg: "dark", s: 1 + 0.015 * (t - 20) / 8, y: -0 * ex };
  pillar(x, t, P1);
  if (t > 27.94 - 4 / FPS) cam.streak = { dir: [0, -1], amt: clamp((t - (27.94 - 4 / FPS)) * FPS / 4), seed: 55 };
  return cam;
}

// =====================================================================================
// S6 INTEGRATED APPROACH f1796–1975, light
// =====================================================================================
const SQ = [[C.red, "spotlight", C.white], [C.navy, "megaphone", C.white], [C.slate, "code", C.white], [C.hot, "cap", C.white], [C.white, "network", C.navy]];
const LC = [560, 540];
function sqPos(k, t) {
  const u = clamp((t - 59.93) / (61.5 - 59.93)), e = 1 - Math.pow(1 - u, 3);
  const snap = -(2 * Math.PI / 5) * ease.inout(clamp((t - 65.5) / 0.22));
  const a = -Math.PI / 2 + k * 2 * Math.PI / 5 + (1 - e) * 3 * Math.PI + snap;
  const r = 320 + (1 - e) * 760;
  return [LC[0] + Math.cos(a) * r, LC[1] + Math.sin(a) * r, (1 - e) * -3 * Math.PI, e];
}
function S6(x, t) {
  const push = ei(t, 65.6, 65.94, 3);
  const cam = { bg: "light", s: (1 + 0.012 * (t - 60)) * (1 + 11 * push), px: LC[0], py: LC[1], x: 4 * (t - 63) };
  cam.zoom = push > 0.001 ? { cx: 960 + (LC[0] - 960) * 0, cy: 540, amt: 0.3 * push } : null;
  if (push > 0) { cam.zoom = { cx: LC[0], cy: LC[1], amt: 0.4 * push }; cam.flash = [C.white, ei(t, 65.7, 65.94, 1.6)]; }
  // connections
  const lineP = (k) => ease.out(clamp((t - 62.0 - k * 0.12) / 0.45));
  for (let k = 0; k < 5; k++) {
    const p = lineP(k);
    if (p <= 0) continue;
    const [sx, sy] = sqPos(k, t), a = Math.atan2(sy - LC[1], sx - LC[0]);
    const x0 = LC[0] + Math.cos(a) * 150, y0 = LC[1] + Math.sin(a) * 150, x1 = lerp(x0, sx - Math.cos(a) * 74, p), y1 = lerp(y0, sy - Math.sin(a) * 74, p);
    x.strokeStyle = C.red; x.lineWidth = 2.5; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    if (p >= 1) {
      const q = (((t - 63.0) * 0.9 + k * 0.2) % 1 + 1) % 1, px = lerp(x0, x1, q), py = lerp(y0, y1, q);
      glow(x, px, py, 26, C.hot, 0.8 * Math.sin(Math.PI * q));
      x.fillStyle = rgba(C.white, Math.sin(Math.PI * q)); circle(x, px, py, 3.5); x.fill();
    }
  }
  // pentagon edges
  const pe = ease.inout(clamp((t - 62.6) / 0.5));
  if (pe > 0) {
    x.strokeStyle = rgba(C.red, 0.35); x.lineWidth = 2; x.setLineDash([6, 8]);
    for (let k = 0; k < 5; k++) {
      const [ax, ay] = sqPos(k, t), [bx2, by2] = sqPos((k + 1) % 5, t);
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(lerp(ax, bx2, pe), lerp(ay, by2, pe)); x.stroke();
    }
    x.setLineDash([]);
  }
  // logo disc
  x.save(); x.shadowColor = rgba(C.navy, 0.22); x.shadowBlur = 50; x.shadowOffsetY = 18;
  x.fillStyle = C.white; circle(x, LC[0], LC[1], 140); x.fill(); x.restore();
  x.strokeStyle = C.pale; x.lineWidth = 1; circle(x, LC[0], LC[1], 140); x.stroke();
  drawLogo(x, LC[0], LC[1], 210, 130);
  // five squares spinning in counter-clockwise, locking at 61.5 s
  const angV = (() => { const [, , , e1] = sqPos(0, t), [, , , e0] = sqPos(0, t - 1 / FPS); return (e1 - e0) * 3 * Math.PI; })();
  const snapV = (2 * Math.PI / 5) * (ease.inout(clamp((t - 65.5) / 0.22)) - ease.inout(clamp((t - 1 / FPS - 65.5) / 0.22)));
  fx(x, { rot: { cx: LC[0], cy: LC[1], ang: -(angV * 0.9) + snapV * 1.6 } }, (c) => {
    SQ.forEach(([col, ic, icol], k) => {
      const [sx, sy, rot] = sqPos(k, t), lock = t >= 61.5 ? kff(t, 61.5, [[0, 1.14], [5, 1, ease.out]]) : 1;
      c.save(); c.translate(sx, sy); c.rotate(rot); c.scale(lock, lock);
      c.shadowColor = rgba(C.navy, col === C.white ? 0.16 : 0.25); c.shadowBlur = 26; c.shadowOffsetY = 10;
      rr(c, -64, -64, 128, 128, 34); c.fillStyle = col; c.fill();
      c.shadowColor = "transparent";
      if (col === C.white) { rr(c, -64, -64, 128, 128, 34); c.strokeStyle = C.pale; c.lineWidth = 1; c.stroke(); }
      if (col === C.hot || col === C.red) { const g = c.createLinearGradient(-64, -64, 64, 64); g.addColorStop(0, rgba(C.hot, 0.5)); g.addColorStop(1, rgba(C.red, 0)); rr(c, -64, -64, 128, 128, 34); c.fillStyle = g; c.fill(); }
      icon(c, ic, 0, 0, 62, icol, 2);
      c.restore();
    });
  });
  // right column
  const X0 = 1000, MW = 840;
  const line = (t0, draw) => { if (t < t0) return; const r = rise(t, t0, 0.2); fx(x, { blur: 8 * r, alpha: clamp((t - t0) * FPS / 3) }, (c) => draw(c, 30 * r)); };
  line(62.0, (c, o) => { const s = fit("UNE APPROCHE INTÉGRÉE.", FONT.head, 64, MW); c.font = FONT.head(s); c.fillStyle = C.navy; c.textAlign = "left"; c.fillText("UNE APPROCHE INTÉGRÉE.", X0, 330 + o); c.fillStyle = C.red; c.fillRect(X0, 360 + o, 80, 6); });
  const bf = FONT.body(36, 500);
  line(63.0, (c, o) => { c.font = bf; c.fillStyle = C.grey; c.textAlign = "left"; wrap("Un évènement devient une opportunité de communication.", bf, MW).forEach((l, j) => c.fillText(l, X0, 440 + o + j * 48)); });
  line(64.0, (c, o) => { c.font = bf; c.fillStyle = C.grey; c.textAlign = "left"; wrap("Une formation s'appuie sur des outils innovants.", bf, MW).forEach((l, j) => c.fillText(l, X0, 560 + o + j * 48)); });
  line(65.0, (c, o) => {
    const s = fit("1 SEUL PARTENAIRE.", FONT.head, 72, MW);
    rich(c, [["5 EXPERTISES.", C.navy]], X0, 720 + o, FONT.head(s));
    rich(c, [["1 SEUL", C.red], [" PARTENAIRE.", C.navy]], X0, 720 + s * 1.2 + o, FONT.head(s));
  });
  return cam;
}

// =====================================================================================
// S10 END CARD f2336–2517, black
// =====================================================================================
const T10 = 2396 / FPS;
function S10(x, t) {
  const col = ei(t, 87.0, 87.85, 2.4);
  const cam = { bg: "dark", bgo: { navy: 0.6, glowR: 900 }, s: (1 + 0.004 * (t - 80)) * (1 - col * 0.995), blur: 4 * col, shake: shake(t, 80.0, 8, 9) };
  const lf = (t - T10) * FPS;
  // logo: zoom smear 2.2 → 1 in 10 frames, then a slow drift
  const ls = lf < 10 ? kf(lf, [[0, 2.2], [10, 1, ease.out5]]) : 1 + 0.0015 * (lf - 10) * (1 - 0.35 * clamp((lf - 10) / 140));
  const ly = 330;
  glow(x, 960, ly, 760, C.red, 0.16);
  glow(x, 960, ly, 280, C.red, 0.22);
  fx(x, { zoom: { cx: 960, cy: ly, amt: 1.1 * (1 - clamp(lf / 10)) }, n: 25, alpha: clamp(lf / 2) }, (c) => {
    c.translate(960, ly); c.scale(ls, ls); drawLogo(c, 0, 0, 640, 240, true);
  });
  // red line drawing outward
  const lp = ease.out(clamp((t - 80.4) / 0.5)), flash = Math.exp(-Math.max(0, t - 87.0) * FPS / 4) * (t >= 87 ? 1 : 0);
  if (lp > 0) {
    x.fillStyle = C.red; x.fillRect(960 - 280 * lp, 500, 560 * lp, 3 + 3 * flash);
    if (flash > 0.01) glow(x, 960, 501, 420, C.hot, 0.6 * flash);
  }
  const txt = (t0, draw, b0 = 6) => { if (t < t0) return; const r = rise(t, t0, 0.22); fx(x, { blur: b0 * r, alpha: clamp((t - t0) * FPS / 3) }, (c) => draw(c, 22 * r)); };
  txt(80.5, (c) => { c.font = FONT.ui(30, 500); c.letterSpacing = "8px"; c.textAlign = "center"; c.fillStyle = C.soft; c.fillText("EXPERTISE · INNOVATION · RÉSULTATS", 964, 566); c.letterSpacing = "0px"; }, 8);
  const cf = FONT.body(38, 400);
  [["+228 70 25 65 65 · +228 79 79 02 29", 81.0, 668], ["contact@bovanngroup.com · bovanngroup.com", 81.5, 728], ["Hédzranawoé, Lomé – Togo", 82.0, 788]].forEach(([s, t0, y]) =>
    txt(t0, (c, o) => { c.font = cf; c.textAlign = "center"; c.fillStyle = C.pale; c.fillText(s, 960, y + o); }));
  txt(82.5, (c, o) => {
    const hf = FONT.ui(32, 500), hw = measure("@bovanngroup", hf), tot = 3 * 44 + 2 * 22 + 30 + hw;
    let sx = 960 - tot / 2;
    ["facebook", "instagram", "linkedin"].forEach((ic) => { icon(c, ic, sx + 22, 868 + o, 44, C.white, 1.8); sx += 66; });
    c.font = hf; c.textAlign = "left"; c.fillStyle = C.pale; c.fillText("@bovanngroup", sx + 8, 880 + o);
  });
  // the film ends on the red dot
  cam.post = (m) => {
    const a = clamp((t - 87.55) / 0.2);
    if (a <= 0) return;
    const p = beatPulse(t, 88, 88) + kf(t, [[87.9, 0], [87.95, 1, ease.out], [88.1, 0]]);
    glow(m, 960, 540, 70 + 40 * p, C.red, (0.4 + 0.3 * p) * a);
    m.fillStyle = C.red; circle(m, 960, 540, 10 * a * (1 + 0.35 * p)); m.fill();
  };
  return cam;
}

// =====================================================================================
// Shared: macOS arrow cursor (black fill, white outline, soft shadow), reused in S5c and S9
// =====================================================================================
function cursor(x, cx, cy, s = 1, rot = 0) {
  x.save();
  x.translate(cx, cy); x.rotate(rot); x.scale(2.1 * s, 2.1 * s);
  x.beginPath();
  x.moveTo(0, 0); x.lineTo(0, 17); x.lineTo(4.2, 13.2); x.lineTo(7, 19.6); x.lineTo(9.6, 18.5); x.lineTo(6.9, 12.3); x.lineTo(12.2, 12.3); x.closePath();
  x.shadowColor = rgba(C.night, 0.4); x.shadowBlur = 8; x.shadowOffsetY = 3;
  x.fillStyle = C.night; x.fill();
  x.shadowColor = "transparent";
  x.lineWidth = 1.3; x.lineJoin = "round"; x.strokeStyle = C.white; x.stroke();
  x.restore();
}
function ripple(x, cx, cy, t, t0, R = 90, col = C.white) {
  const u = clamp((t - t0) / 0.45);
  if (u <= 0 || u >= 1) return;
  x.strokeStyle = rgba(col, 0.8 * (1 - u)); x.lineWidth = 6 * (1 - u) + 1;
  circle(x, cx, cy, 10 + R * ease.out(u)); x.stroke();
}

// =====================================================================================
// S5b COMMUNICATION (light)
// =====================================================================================
function post(c, x, y, w, h, s) {
  c.fillStyle = hash(s, 1) > 0.5 ? C.red : C.navy; circle(c, x + 16, y + 16, 14); c.fill();
  c.fillStyle = C.pale; rr(c, x + 38, y + 7, w * 0.45, 9, 4.5); c.fill(); rr(c, x + 38, y + 21, w * 0.28, 7, 3.5); c.fill();
  const iy = y + 40, ih = h * 0.6;
  rr(c, x, iy, w, ih, 16);
  const v = Math.round(hash(s, 2) * 3) % 3;
  const g = c.createLinearGradient(x, iy, x + w, iy + ih);
  if (v === 0) { g.addColorStop(0, C.red); g.addColorStop(1, C.hot); }
  else if (v === 1) { g.addColorStop(0, C.navy); g.addColorStop(1, C.slate); }
  else { g.addColorStop(0, C.pale); g.addColorStop(1, C.white); }
  c.fillStyle = g; c.fill();
  c.save(); rr(c, x, iy, w, ih, 16); c.clip();
  c.fillStyle = rgba(C.white, v === 2 ? 0 : 0.18); circle(c, x + w * 0.75, iy + ih * 0.3, ih * 0.45); c.fill();
  c.fillStyle = v === 2 ? C.red : rgba(C.white, 0.9); circle(c, x + w * 0.3, iy + ih * 0.55, ih * 0.14); c.fill();
  c.strokeStyle = rgba(v === 2 ? C.navy : C.white, 0.5); c.lineWidth = 4;
  c.beginPath(); c.moveTo(x, iy + ih * 0.85); c.bezierCurveTo(x + w * 0.3, iy + ih * 0.6, x + w * 0.6, iy + ih * 1.05, x + w, iy + ih * 0.7); c.stroke();
  c.restore();
  const ay = iy + ih + 22;
  icon(c, "heart", x + 14, ay, 22, C.red, 2.2); icon(c, "bell", x + 48, ay, 20, C.navy, 2);
  c.fillStyle = C.pale; rr(c, x, ay + 20, w * 0.8, 8, 4); c.fill(); rr(c, x, ay + 34, w * 0.5, 8, 4); c.fill();
}
function phone(c, cx, cy, w, h, rot, lt, seed, light = true) {
  c.save(); c.translate(cx, cy); c.rotate(rot);
  c.save(); c.shadowColor = rgba(C.navy, 0.3); c.shadowBlur = 50; c.shadowOffsetY = 26;
  rr(c, -w / 2, -h / 2, w, h, w * 0.17); c.fillStyle = C.navy; c.fill(); c.restore();
  const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, C.slate); g.addColorStop(0.5, C.navy); g.addColorStop(1, C.night);
  rr(c, -w / 2, -h / 2, w, h, w * 0.17); c.fillStyle = g; c.fill();
  const b = 9;
  c.save(); rr(c, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, w * 0.14); c.clip();
  c.fillStyle = light ? C.white : C.night; c.fillRect(-w / 2, -h / 2, w, h);
  const ph = h * 0.66, off = ((lt * 34 + seed * 97) % ph + ph) % ph;
  for (let k = -1; k < 3; k++) post(c, -w / 2 + b + 12, -h / 2 + 44 + k * ph - off, w - 2 * b - 24, ph - 20, seed * 7 + k + Math.round((lt * 34 + seed * 97 - off) / ph) * 3);
  c.restore();
  rr(c, -w * 0.16, -h / 2 + b + 7, w * 0.32, 15, 7.5); c.fillStyle = C.night; c.fill();
  rr(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, w * 0.17); c.strokeStyle = rgba(C.white, 0.25); c.lineWidth = 1.5; c.stroke();
  c.restore();
}
const PH2 = [[250, 440, 196, 400, -0.13, 1], [700, 440, 196, 400, 0.13, 2], [475, 400, 250, 510, 0, 3]];
function artCom(c, t, lt) {
  const g = c.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, C.white); g.addColorStop(1, C.page);
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  glow(c, 640, 140, 520, C.hot, 0.16); glow(c, 120, 640, 520, C.navy, 0.1); glow(c, 1150, 520, 600, C.red, 0.08);
  // reach curve (no numbers), drawn from T+1
  const rp = ease.inout(clamp((lt - 1) / 2.5));
  if (rp > 0) {
    const P = (u) => { const a = [40, 640], b1 = [300, 640], b2 = [480, 260], d = [800, 170]; const v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * b1[0] + 3 * v * u * u * b2[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b1[1] + 3 * v * u * u * b2[1] + u * u * u * d[1]]; };
    c.beginPath(); c.moveTo(40, 700);
    for (let i = 0; i <= 60; i++) { const [px, py] = P(rp * i / 60); c.lineTo(px, py); }
    const [ex, ey] = P(rp); c.lineTo(ex, 700); c.closePath();
    const fg = c.createLinearGradient(0, 170, 0, 700); fg.addColorStop(0, rgba(C.red, 0.2)); fg.addColorStop(1, rgba(C.red, 0)); c.fillStyle = fg; c.fill();
    c.beginPath(); for (let i = 0; i <= 60; i++) { const [px, py] = P(rp * i / 60); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.strokeStyle = C.red; c.lineWidth = 6; c.lineCap = "round"; c.stroke();
    glow(c, ex, ey, 60, C.hot, 0.7); c.fillStyle = C.white; circle(c, ex, ey, 8); c.fill(); c.strokeStyle = C.red; c.lineWidth = 4; circle(c, ex, ey, 8); c.stroke();
  }
  // megaphone with concentric waves
  c.save(); c.shadowColor = rgba(C.navy, 0.2); c.shadowBlur = 24; c.shadowOffsetY = 8;
  c.fillStyle = C.white; circle(c, 88, 180, 40); c.fill(); c.restore();
  icon(c, "megaphone", 88, 180, 44, C.red, 2.2);
  for (let k = 0; k < 4; k++) {
    const ph = (((lt - 0.1) / 0.5 + k / 4) % 1 + 1) % 1;
    c.strokeStyle = rgba(C.red, 0.5 * (1 - ph)); c.lineWidth = 3;
    c.beginPath(); c.arc(100, 180, 44 + ph * 130, -1.1, -0.1); c.stroke();
  }
  PH2.forEach(([px, py, w, h, r, s]) => phone(c, px, py + 10 * Math.sin(t * 1.3 + s), w, h, r + 0.01 * Math.sin(t * 0.9 + s), lt, s));
  // hearts and notification bubbles popping on beats
  for (let k = 0; k < 13; k++) {
    const tb = 1 + 0.5 * k;
    if (lt < tb || lt > tb + 1.3) continue;
    const ph = PH2[k % 3], u = lt - tb, a = 1 - clamp((u - 0.8) / 0.5);
    if (k % 2 === 0) {
      const s = pop(t, t - u) * (0.8 + 0.4 * hash(k, 3));
      const hx = ph[0] + hs(k, 4) * 70, hy = ph[1] - 120 - 170 * eo(t, t - u, 0.09);
      c.save(); c.globalAlpha = a; c.translate(hx, hy); c.scale(s, s);
      c.fillStyle = C.white; c.shadowColor = rgba(C.red, 0.35); c.shadowBlur = 18; circle(c, 0, 0, 30); c.fill(); c.shadowColor = "transparent";
      c.beginPath(); c.save(); c.translate(-14, -13); c.scale(28 / 24, 28 / 24); c.moveTo(12, 20); c.bezierCurveTo(2, 13.5, 2, 5, 7.5, 5); c.bezierCurveTo(10, 5, 11.4, 6.8, 12, 8); c.bezierCurveTo(12.6, 6.8, 14, 5, 16.5, 5); c.bezierCurveTo(22, 5, 22, 13.5, 12, 20); c.restore();
      c.fillStyle = C.red; c.fill(); c.restore();
    } else {
      const s = pop(t, t - u);
      const bx = ph[0] + (k % 4 === 1 ? 60 : -150), by = ph[1] - ph[3] / 2 + 30 + 20 * (1 - eo(t, t - u, 0.25));
      c.save(); c.globalAlpha = a; c.translate(bx, by); c.scale(s, s);
      c.shadowColor = rgba(C.navy, 0.25); c.shadowBlur = 20; c.shadowOffsetY = 8; rr(c, 0, 0, 170, 54, 27); c.fillStyle = rgba(C.white, 0.96); c.fill(); c.shadowColor = "transparent";
      c.fillStyle = C.red; circle(c, 27, 27, 17); c.fill(); icon(c, "bell", 27, 27, 20, C.white, 2.2);
      c.fillStyle = C.pale; rr(c, 54, 16, 92, 9, 4.5); c.fill(); rr(c, 54, 31, 60, 8, 4); c.fill();
      c.restore();
    }
  }
}
const P2 = {
  T: 28, n: "02", dark: false, title: "COMMUNICATION", art: artCom,
  chips: [["layers", "Stratégie omnicanale"], ["briefcase", "Communication d'entreprise & d'évènements"], ["camera", "Production artistique & audiovisuelle"], ["users", "Management de carrières : artistes & influenceurs"]],
  benefit: [["AMPLIFIEZ VOTRE ", 0], ["VISIBILITÉ", "red"], [".", 0]],
  enter: enterFrom(837 / FPS, 0, 1500), exit: () => ({ x: 0, y: 0, dx: 0, dy: 0 }),
};
function S5b(x, t) {
  const dive = ei(t, 35.5, 35.94, 3);
  const px = CX + 475, py = CY + 400;
  const cam = { bg: "light", px, py, s: (1 + 0.015 * (t - 28) / 8) * (1 + 3.4 * dive) };
  if (dive > 0) cam.zoom = { cx: 960 + (px - 960) * 1, cy: py, amt: 0.4 * dive };
  pillar(x, t, P2);
  return cam;
}

// =====================================================================================
// S5c INFORMATIQUE (dark editor + light UI)
// =====================================================================================
const CODE = [
  ["<", "section", " class=", "\"hero\"", ">"],
  ["  <", "h1", ">", "Votre projet en ligne", "</h1>"],
  ["  <", "a", " href=", "\"/rendez-vous\"", ">"],
  ["    Prenez rendez-vous", "", "", "", "</a>"],
  ["</", "section", ">", "", ""],
  [".hero ", "{", " display: ", "grid", "; }"],
  [".btn ", "{", " background: ", "#DC0C15", "; }"],
  ["@media ", "(", "max-width: ", "768px", ") {"],
  ["  .hero ", "{", " padding: ", "24px", "; }"],
  ["}", "", "", "", ""],
  ["const ", "app", " = ", "createApp", "();"],
  ["app.", "deploy", "({ ", "secure: true", " });"],
];
const CODE_COL = [C.soft, C.hot, C.pale, C.white, C.soft];
function snapIn(c, t, t0, cx, cy, draw) {
  if (t < t0) return;
  const s = kff(t, t0, [[0, 0.8], [3, 1.06, ease.out], [5, 1, ease.inout]]);
  c.save(); c.globalAlpha *= clamp((t - t0) * FPS / 2); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy); draw(); c.restore();
}
function artIT(c, t, lt) {
  const T = 36;
  const g = c.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, C.night); g.addColorStop(0.6, C.navy); g.addColorStop(1, C.slate);
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  c.strokeStyle = rgba(C.white, 0.04); c.lineWidth = 1;
  for (let gx = 0; gx < CW; gx += 48) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, CH); c.stroke(); }
  for (let gy = 0; gy < CH; gy += 48) { c.beginPath(); c.moveTo(0, gy); c.lineTo(CW, gy); c.stroke(); }
  glow(c, 560, 300, 520, C.red, 0.16);
  // browser window
  const bx = 250, by = 128, bw = 560, bh = 390;
  c.save(); c.shadowColor = rgba(C.night, 0.55); c.shadowBlur = 50; c.shadowOffsetY = 24; rr(c, bx, by, bw, bh, 18); c.fillStyle = C.white; c.fill(); c.restore();
  c.save(); rr(c, bx, by, bw, bh, 18); c.clip();
  c.fillStyle = C.pale; c.fillRect(bx, by, bw, 38);
  [C.red, C.soft, C.soft].forEach((col, i) => { c.fillStyle = col; circle(c, bx + 22 + i * 20, by + 19, 6); c.fill(); });
  c.fillStyle = C.white; rr(c, bx + 100, by + 9, bw - 200, 20, 10); c.fill();
  icon(c, "shield", bx + 116, by + 19, 13, C.navy, 2.2);
  c.fillStyle = C.soft; rr(c, bx + 130, by + 15, 120, 8, 4); c.fill();
  const IN = (k) => T + 0.5 * k;
  snapIn(c, t, IN(1), bx + bw / 2, by + 60, () => { c.fillStyle = C.navy; c.fillRect(bx, by + 38, bw, 42); c.fillStyle = C.red; circle(c, bx + 28, by + 59, 9); c.fill(); c.fillStyle = rgba(C.white, 0.7); for (let i = 0; i < 4; i++) { rr(c, bx + bw - 250 + i * 58, by + 55, 44, 8, 4); c.fill(); } });
  snapIn(c, t, IN(2), bx + bw / 2, by + 150, () => {
    const hg = c.createLinearGradient(bx, by + 80, bx + bw, by + 220); hg.addColorStop(0, C.navy); hg.addColorStop(1, C.slate);
    c.fillStyle = hg; c.fillRect(bx, by + 80, bw, 140);
    glow(c, bx + bw * 0.8, by + 150, 160, C.red, 0.5);
    c.fillStyle = C.white; rr(c, bx + 30, by + 112, 250, 18, 9); c.fill(); rr(c, bx + 30, by + 140, 180, 14, 7); c.fill();
    c.fillStyle = C.red; rr(c, bx + 30, by + 170, 120, 32, 16); c.fill();
  });
  for (let k = 0; k < 3; k++) snapIn(c, t, IN(3 + k), bx + 30 + k * 172 + 76, by + 290, () => {
    const cx0 = bx + 30 + k * 172;
    c.save(); c.shadowColor = rgba(C.navy, 0.15); c.shadowBlur = 16; c.shadowOffsetY = 6; rr(c, cx0, by + 238, 152, 128, 14); c.fillStyle = C.white; c.fill(); c.restore();
    rr(c, cx0, by + 238, 152, 64, 14); c.fillStyle = [C.red, C.navy, C.hot][k]; c.fill(); c.fillRect(cx0, by + 280, 152, 22);
    c.fillStyle = C.pale; rr(c, cx0 + 14, by + 316, 110, 9, 4.5); c.fill(); rr(c, cx0 + 14, by + 332, 70, 8, 4); c.fill();
  });
  c.restore();
  // toolbar + "Publier"
  const pb = [bx + bw - 150, by - 64, 150, 48];
  c.fillStyle = rgba(C.white, 0.1); rr(c, bx, by - 70, bw, 60, 18); c.fill();
  c.fillStyle = rgba(C.white, 0.5); for (let i = 0; i < 3; i++) { rr(c, bx + 20 + i * 70, by - 46, 50, 10, 5); c.fill(); }
  const clickT = T + 4.5, sq = lt >= 4.5 ? kff(t, clickT, [[0, 0.94], [3, 1.03, ease.out], [6, 1, ease.inout]]) : 1;
  c.save(); c.translate(pb[0] + pb[2] / 2, pb[1] + pb[3] / 2); c.scale(sq, sq);
  glow(c, 0, 0, 120, C.red, 0.35 + 0.25 * (lt >= 4.5 ? Math.exp(-(lt - 4.5) * 3) : 0));
  rr(c, -pb[2] / 2, -pb[3] / 2, pb[2], pb[3], 24); c.fillStyle = C.red; c.fill();
  c.font = FONT.ui(22, 600); c.textAlign = "center"; c.fillStyle = C.white;
  if (lt < 4.6) c.fillText("Publier", 0, 8);
  else { c.save(); const s = pop(t, T + 4.6); c.scale(s, s); icon(c, "check", -44, 0, 24, C.white, 3); c.restore(); c.fillText("Publier", 14, 8); }
  c.restore();
  ripple(c, pb[0] + pb[2] / 2, pb[1] + pb[3] / 2, t, clickT, 110);
  // phone build
  const fx0 = 690, fy0 = 250, fw = 172, fh = 340;
  c.save(); c.shadowColor = rgba(C.night, 0.6); c.shadowBlur = 40; c.shadowOffsetY = 20; rr(c, fx0, fy0, fw, fh, 30); c.fillStyle = C.night; c.fill(); c.restore();
  c.save(); rr(c, fx0 + 7, fy0 + 7, fw - 14, fh - 14, 24); c.clip(); c.fillStyle = C.white; c.fillRect(fx0, fy0, fw, fh);
  snapIn(c, t, IN(1.5), fx0 + fw / 2, fy0 + 40, () => { c.fillStyle = C.navy; c.fillRect(fx0, fy0, fw, 54); c.fillStyle = C.red; circle(c, fx0 + 26, fy0 + 36, 7); c.fill(); });
  snapIn(c, t, IN(2.5), fx0 + fw / 2, fy0 + 110, () => { c.fillStyle = C.slate; c.fillRect(fx0, fy0 + 54, fw, 100); c.fillStyle = C.white; rr(c, fx0 + 16, fy0 + 78, 110, 12, 6); c.fill(); c.fillStyle = C.red; rr(c, fx0 + 16, fy0 + 112, 70, 22, 11); c.fill(); });
  for (let k = 0; k < 2; k++) snapIn(c, t, IN(3.5 + k), fx0 + fw / 2, fy0 + 200 + k * 76, () => { c.fillStyle = C.pale; rr(c, fx0 + 14, fy0 + 166 + k * 76, fw - 28, 64, 12); c.fill(); c.fillStyle = [C.red, C.navy][k]; rr(c, fx0 + 24, fy0 + 176 + k * 76, 44, 44, 10); c.fill(); });
  c.restore();
  rr(c, fx0 + fw / 2 - 26, fy0 + 14, 52, 10, 5); c.fillStyle = C.night; c.fill();
  // code panel typing ~1 char/frame
  const cx0 = 40, cy0 = 330, cw = 380, chh = 330;
  c.save(); c.shadowColor = rgba(C.night, 0.6); c.shadowBlur = 40; c.shadowOffsetY = 18; rr(c, cx0, cy0, cw, chh, 18); c.fillStyle = rgba(C.night, 0.94); c.fill(); c.restore();
  rr(c, cx0, cy0, cw, chh, 18); c.strokeStyle = rgba(C.white, 0.12); c.lineWidth = 1.5; c.stroke();
  [C.red, C.soft, C.soft].forEach((col, i) => { c.fillStyle = col; circle(c, cx0 + 20 + i * 18, cy0 + 20, 5); c.fill(); });
  let chars = Math.max(0, (lt - 0.3) * FPS);
  c.font = FONT.mono(15); c.textAlign = "left";
  let ly = cy0 + 56, lastX = cx0 + 44, lastY = ly;
  CODE.forEach((parts, li) => {
    if (chars <= 0) return;
    c.fillStyle = rgba(C.soft, 0.5); c.fillText(String(li + 1).padStart(2, " "), cx0 + 12, ly);
    let xx = cx0 + 44;
    parts.forEach((p, pi) => {
      if (!p || chars <= 0) return;
      const n = Math.min(p.length, Math.floor(chars));
      const s = p.slice(0, n);
      c.fillStyle = CODE_COL[pi]; c.fillText(s, xx, ly);
      xx += c.measureText(s).width; chars -= p.length;
      lastX = xx; lastY = ly;
    });
    ly += 22;
  });
  if (Math.sin(lt * 12) > -0.2) { c.fillStyle = C.red; c.fillRect(lastX + 2, lastY - 13, 2, 17); }
  // cursor glides to "Publier" and clicks at T+4.5
  if (lt > 3.4) {
    const e = eo(t, T + 3.5, 0.13);
    const kx = lerp(980, pb[0] + pb[2] * 0.55, e), ky = lerp(720, pb[1] + pb[3] * 0.6, e);
    const cs = lt >= 4.5 ? kff(t, T + 4.5, [[0, 0.85], [3, 1, ease.out]]) : 1;
    cursor(c, kx, ky, cs);
  }
}
const P3 = {
  T: 36, n: "03", dark: true, title: "INFORMATIQUE", art: artIT,
  chips: [["globe", "Sites web professionnels"], ["code", "Applications web sur mesure"], ["mobile", "Applications mobiles Android & iOS"], ["shield", "Sécurisés, optimisés pour tous les écrans"]],
  benefit: [["VOTRE ", 0], ["SUCCÈS", "red"], [" EN LIGNE COMMENCE ICI.", 0]],
  enter: () => ({ x: 0, y: 0, dx: 0, dy: 0 }), exit: exitTo(43.5, 43.94, 1700, 0),
};
function S5c(x, t) {
  const t0 = 1077 / FPS, e = 1 - eo(t, t0, 0.16);
  const px = CX + 530, py = CY + 320;
  const cam = { bg: "dark", px, py, s: 1 + 1.2 * e + 0.012 * (t - 36) / 8, zoom: { cx: px, cy: py, amt: -0.3 * e } };
  pillar(x, t, P3);
  if (t > 43.94 - 4 / FPS) cam.streak = { dir: [1, 0], amt: clamp((t - (43.94 - 4 / FPS)) * FPS / 4), seed: 66 };
  return cam;
}

// =====================================================================================
// S5d FORMATIONS (light)
// =====================================================================================
const TRACKS = [["Parcours d'initiation", C.red, ["book", "tools", "users", "check"]], ["Parcours de spécialisation", C.navy, ["target", "gear", "leader", "check"]]];
function prog(lt, lag = 0) {
  let p = 0;
  for (let k = 0; k < 8; k++) p += ease.out(clamp((lt - 0.5 - 0.5 * k - lag) * FPS / 6)) / 8;
  return lag ? Math.min(p, prog(lt)) : p;
}
function artForm(c, t, lt) {
  const g = c.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, C.white); g.addColorStop(1, C.page);
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  glow(c, 300, 120, 600, C.hot, 0.1); glow(c, 900, 700, 600, C.navy, 0.08);
  TRACKS.forEach(([label, col, ics], i) => {
    const y = 210 + i * 175, x0 = 70, x1 = 770, p = prog(lt, 0);
    c.font = FONT.ui(30, 600); c.textAlign = "left"; c.fillStyle = C.navy; c.fillText(label, x0, y - 44);
    c.fillStyle = rgba(C.navy, 0.08); rr(c, x0, y - 9, x1 - x0, 18, 9); c.fill();
    if (p > 0) {
      const pg = c.createLinearGradient(x0, 0, x1, 0);
      if (col === C.red) { pg.addColorStop(0, C.hot); pg.addColorStop(1, C.red); } else { pg.addColorStop(0, C.slate); pg.addColorStop(1, C.navy); }
      c.fillStyle = pg; rr(c, x0, y - 9, (x1 - x0) * p, 18, 9); c.fill();
      glow(c, x0 + (x1 - x0) * p, y, 40, col, 0.4);
    }
    ics.forEach((ic, k) => {
      const nx = x0 + (x1 - x0) * (k + 1) / 4 - (k === 3 ? 22 : 0), on = p >= (k + 1) / 4 - 0.001;
      const s = on ? pop(t, 44 + 0.5 + 0.5 * (2 * k + 1)) : 1;
      c.save(); c.translate(nx, y); c.scale(s, s);
      c.shadowColor = rgba(C.navy, 0.2); c.shadowBlur = 14; c.shadowOffsetY = 5;
      c.fillStyle = on ? col : C.white; circle(c, 0, 0, 26); c.fill(); c.shadowColor = "transparent";
      if (!on) { c.strokeStyle = C.pale; c.lineWidth = 2; circle(c, 0, 0, 26); c.stroke(); }
      icon(c, ic, 0, 0, 26, on ? C.white : C.soft, 2.2);
      c.restore();
    });
    // learners moving along the track
    for (let a = 0; a < 3; a++) {
      const ax = x0 + 20 + Math.max(0, (x1 - x0 - 60) * p - a * 46), bob = 4 * Math.abs(Math.sin(t * 7 + a + i));
      const ac = [C.navy, C.red, C.slate][(a + i) % 3];
      c.fillStyle = ac; circle(c, ax, y - 40 - bob, 9); c.fill();
      c.beginPath(); c.ellipse(ax, y - 18 - bob, 13, 10, 0, Math.PI, 0); c.fill();
    }
  });
  // certificate slides in at T+4.5, red seal stamps at T+4.9
  if (lt > 4.5) {
    const e = eo(t, 44 + 4.5, 0.17), cx = 420 + 500 * (1 - e), cy = 488 + 60 * (1 - e);
    c.save(); c.translate(cx, cy); c.rotate(-0.04 + 0.2 * (1 - e));
    c.shadowColor = rgba(C.navy, 0.25); c.shadowBlur = 40; c.shadowOffsetY = 18;
    rr(c, -210, -110, 420, 220, 18); c.fillStyle = C.white; c.fill(); c.shadowColor = "transparent";
    c.strokeStyle = C.pale; c.lineWidth = 2; rr(c, -196, -96, 392, 192, 12); c.stroke();
    c.strokeStyle = rgba(C.red, 0.5); c.lineWidth = 1; rr(c, -188, -88, 376, 176, 9); c.stroke();
    icon(c, "cap", 0, -54, 44, C.navy, 2.2);
    c.fillStyle = C.navy; rr(c, -110, -14, 220, 14, 7); c.fill();
    c.fillStyle = C.pale; rr(c, -140, 14, 280, 9, 4.5); c.fill(); rr(c, -100, 32, 200, 9, 4.5); c.fill();
    c.fillStyle = C.soft; rr(c, -170, 66, 100, 4, 2); c.fill();
    if (lt > 4.9) {
      const lf = (lt - 4.9) * FPS, s = kf(lf, [[0, 1.9], [2, 0.86, ease.out], [5, 1, ease.inout]]);
      c.save(); c.translate(140, 52); c.rotate(-0.25); c.scale(s, s); c.globalAlpha = clamp(lf / 1.5);
      c.shadowColor = rgba(C.red, 0.4); c.shadowBlur = 20;
      c.beginPath(); for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, r = i % 2 ? 40 : 46; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
      c.fillStyle = C.red; c.fill(); c.shadowColor = "transparent";
      c.strokeStyle = rgba(C.white, 0.7); c.lineWidth = 2; circle(c, 0, 0, 32); c.stroke();
      icon(c, "check", 0, 0, 34, C.white, 3);
      c.restore();
    }
    c.restore();
  }
}
const P4 = {
  T: 44, n: "04", dark: false, title: "FORMATIONS", art: artForm,
  chips: [["book", "Initiation : des bases solides"], ["target", "Spécialisation : l'expertise métier"], ["users", "Formateurs expérimentés et passionnés"], ["tools", "Pratique & outils modernes"]],
  benefit: [["TRANSFORMEZ VOS COMPÉTENCES EN ", 0], ["ATOUTS", "red"], [".", 0]],
  enter: enterFrom(1317 / FPS, -1700, 0), exit: exitTo(51.5, 51.94, 0, -1500),
};
function S5d(x, t) {
  const ex = ei(t, 51.5, 51.94, 2);
  const cam = { bg: "light", s: 1 + 0.015 * (t - 44) / 8, r: -0.03 * ex };
  pillar(x, t, P4);
  if (t > 51.94 - 4 / FPS) cam.streak = { dir: [0, -1], amt: clamp((t - (51.94 - 4 / FPS)) * FPS / 4), seed: 77 };
  return cam;
}

// =====================================================================================
// S5e MANAGEMENT (dark navy)
// =====================================================================================
const ORG = [[390, 140, -1, 0.5], [180, 300, 0, 1.0], [390, 300, 0, 1.0], [600, 300, 0, 1.0], [110, 450, 1, 1.5], [250, 450, 1, 1.5], [330, 450, 2, 2.0], [450, 450, 2, 2.0], [530, 450, 3, 2.0], [670, 450, 3, 1.5]];
function artMgmt(c, t, lt) {
  const g = c.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, C.navy); g.addColorStop(1, C.night);
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  c.fillStyle = rgba(C.white, 0.05);
  for (let y = 20; y < CH; y += 32) for (let xx = 20; xx < CW; xx += 32) { c.fillRect(xx, y, 2, 2); }
  glow(c, 390, 140, 420, C.red, 0.18 + 0.1 * beatPulse(t));
  // rising curve with arrow, from T+2.5
  const rp = ease.inout(clamp((lt - 2.5) / 1.5));
  if (rp > 0) {
    const pts = []; for (let i = 0; i <= 60; i++) { const u = rp * i / 60; pts.push([60 + 720 * u, 640 - 150 * u - 60 * Math.sin(u * Math.PI * 3) * (1 - u) * 0.5 - 40 * u * u]); }
    c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.strokeStyle = C.red; c.lineWidth = 6; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
    const [ax, ay] = pts[60], [bx2, by2] = pts[57], a = Math.atan2(ay - by2, ax - bx2);
    c.save(); c.translate(ax, ay); c.rotate(a); c.fillStyle = C.red; c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -12); c.lineTo(-10, 12); c.closePath(); c.fill(); c.restore();
    glow(c, ax, ay, 70, C.hot, 0.5);
  }
  // connectors
  ORG.forEach(([nx, ny, par, tn], i) => {
    if (par < 0) return;
    const [px, py] = ORG[par], d = ease.inout(clamp((lt - tn + 0.1) / 0.35));
    if (d <= 0) return;
    const midY = (py + ny) / 2, L1 = midY - py, L2 = Math.abs(nx - px), L3 = ny - midY, tot = L1 + L2 + L3;
    let rem = d * tot;
    c.strokeStyle = rgba(C.white, 0.55); c.lineWidth = 2.5; c.beginPath(); c.moveTo(px, py + 28);
    const seg = (x2, y2, len) => { const u = clamp(rem / len); rem -= len; return u; };
    let u = seg(px, midY, L1); c.lineTo(px, lerp(py + 28, midY, u));
    if (u >= 1) { u = seg(nx, midY, L2); c.lineTo(lerp(px, nx, u), midY); if (u >= 1) { u = seg(nx, ny, L3); c.lineTo(nx, lerp(midY, ny - 24, u)); } }
    c.stroke();
  });
  ORG.forEach(([nx, ny, par, tn], i) => {
    if (lt < tn) return;
    const s = pop(t, 52 + tn), top = par < 0;
    c.save(); c.translate(nx, ny); c.scale(s, s);
    if (top) { const p = beatPulse(t); glow(c, 0, 0, 90 + 40 * p, C.red, 0.6); c.strokeStyle = rgba(C.red, 0.5 * (1 - p)); c.lineWidth = 3; circle(c, 0, 0, 36 + 24 * p); c.stroke(); }
    c.shadowColor = rgba(C.night, 0.5); c.shadowBlur = 18; c.shadowOffsetY = 6;
    c.fillStyle = top ? C.red : par === 0 ? C.slate : C.navy; circle(c, 0, 0, top ? 30 : 24); c.fill(); c.shadowColor = "transparent";
    c.strokeStyle = rgba(C.white, top ? 0.9 : 0.4); c.lineWidth = 2; circle(c, 0, 0, top ? 30 : 24); c.stroke();
    icon(c, top ? "leader" : "users", 0, 0, top ? 30 : 24, C.white, 2);
    c.restore();
  });
}
const P5 = {
  T: 52, n: "05", dark: true, title: "MANAGEMENT", art: artMgmt,
  chips: [["structure", "Optimisation des structures"], ["leader", "Développement du leadership"], ["compass", "Accompagnement stratégique"]],
  benefit: null, enter: enterFrom(1556 / FPS, 0, 1500), exit: () => ({ x: 0, y: 0, dx: 0, dy: 0 }),
};
function S5e(x, t) {
  const col = ei(t, 59.5, 59.94, 2.5);
  const cam = { bg: "dark", s: (1 + 0.015 * (t - 52) / 8) * (1 - 0.8 * col), blur: 12 * col };
  pillar(x, t, P5);
  [["COMPRENDRE AVANT D'AGIR.", 57.0], ["ANTICIPER PLUTÔT QUE SUBIR.", 57.5], ["MESURER POUR PROGRESSER.", 58.0]].forEach(([s, t0], i) => {
    if (t < t0) return;
    const r = rise(t, t0, 0.22);
    fx(x, { blur: 8 * r, alpha: clamp((t - t0) * FPS / 3) }, (c) => {
      c.font = FONT.head(52, 700); c.textAlign = "center"; c.fillStyle = C.white; c.fillText(s, 960, 884 + i * 64 + 26 * r);
    });
  });
  if (col > 0) cam.post = (m) => {
    const u = ei(t, 59.6, 59.94, 2);
    SQ.forEach(([colr, ic, icol], k) => {
      const a = -Math.PI / 2 + k * 2 * Math.PI / 5 + 0.6 * u, r = 20 + 1050 * u, s = 0.35 + 0.65 * clamp(u * 2);
      m.save(); m.globalAlpha = clamp(col * 3); m.translate(960 + Math.cos(a) * r, 540 + Math.sin(a) * r); m.rotate(u * 3); m.scale(s, s);
      rr(m, -64, -64, 128, 128, 34); m.fillStyle = colr; m.fill();
      if (colr === C.white) { m.strokeStyle = C.pale; m.lineWidth = 1; m.stroke(); }
      icon(m, ic, 0, 0, 62, icol, 2); m.restore();
    });
  };
  return cam;
}

// =====================================================================================
// S7 PROOF f1976–2155, light
// =====================================================================================
const PORT = [["Site institutionnel", "site"], ["Landing page", "landing"], ["CV digital", "cv"], ["Panneau grand format", "billboard"], ["Signalétique", "sign"], ["Roll-up premium", "rollup"],
  ["Badges personnalisés", "badge"], ["Tasse d'entreprise", "mug"], ["T-shirt corporatif", "tshirt"], ["Casquette brandée", "cap"], ["Montre gravée", "watch"], ["Goodies", "goodies"]];
const TW = 340, TH = 250;
let TILES = [];
function tileArt(c, kind, w, h) {
  const cx = w / 2, cy = h / 2 - 18;
  const fillR = (x, y, ww, hh, r, col) => { rr(c, x, y, ww, hh, r); c.fillStyle = col; c.fill(); };
  c.lineJoin = "round"; c.lineCap = "round";
  switch (kind) {
    case "site": fillR(cx - 120, cy - 70, 240, 150, 10, C.white); fillR(cx - 120, cy - 70, 240, 22, 10, C.navy); fillR(cx - 106, cy - 36, 120, 12, 6, C.navy); fillR(cx - 106, cy - 16, 80, 9, 4.5, C.soft); fillR(cx - 106, cy + 6, 60, 22, 11, C.red);
      fillR(cx + 30, cy - 38, 76, 72, 8, C.pale); [0, 1, 2].forEach((i) => fillR(cx - 106 + i * 74, cy + 42, 64, 28, 6, C.pale)); break;
    case "landing": fillR(cx - 60, cy - 80, 120, 170, 10, C.white); fillR(cx - 60, cy - 80, 120, 70, 10, C.red); fillR(cx - 44, cy - 56, 70, 10, 5, C.white); fillR(cx - 44, cy - 38, 50, 8, 4, rgba(C.white, 0.7)); fillR(cx - 44, cy + 2, 88, 8, 4, C.pale); fillR(cx - 44, cy + 16, 60, 8, 4, C.pale); fillR(cx - 30, cy + 44, 60, 24, 12, C.navy); break;
    case "cv": fillR(cx - 60, cy - 80, 120, 170, 18, C.navy); fillR(cx - 52, cy - 72, 104, 154, 12, C.white); c.fillStyle = C.red; circle(c, cx, cy - 36, 22); c.fill(); fillR(cx - 36, cy - 4, 72, 10, 5, C.navy); fillR(cx - 28, cy + 12, 56, 7, 3.5, C.soft); [0, 1, 2].forEach((i) => fillR(cx - 38, cy + 32 + i * 14, 76 - i * 12, 7, 3.5, C.pale)); break;
    case "billboard": fillR(cx - 130, cy - 70, 260, 120, 6, C.navy); fillR(cx - 122, cy - 62, 244, 104, 4, C.red); c.fillStyle = rgba(C.white, 0.9); circle(c, cx + 70, cy - 10, 30); c.fill(); fillR(cx - 100, cy - 30, 120, 14, 7, C.white); fillR(cx - 100, cy - 8, 80, 10, 5, rgba(C.white, 0.7)); fillR(cx - 70, cy + 50, 10, 46, 2, C.slate); fillR(cx + 60, cy + 50, 10, 46, 2, C.slate); break;
    case "sign": fillR(cx - 6, cy - 70, 12, 170, 3, C.slate); c.fillStyle = C.navy; c.beginPath(); c.moveTo(cx - 100, cy - 60); c.lineTo(cx + 70, cy - 60); c.lineTo(cx + 100, cy - 35); c.lineTo(cx + 70, cy - 10); c.lineTo(cx - 100, cy - 10); c.closePath(); c.fill(); fillR(cx - 84, cy - 42, 90, 12, 6, C.white);
      c.fillStyle = C.red; c.beginPath(); c.moveTo(cx + 100, cy + 4); c.lineTo(cx - 70, cy + 4); c.lineTo(cx - 100, cy + 29); c.lineTo(cx - 70, cy + 54); c.lineTo(cx + 100, cy + 54); c.closePath(); c.fill(); fillR(cx - 50, cy + 22, 90, 12, 6, C.white); break;
    case "rollup": fillR(cx - 50, cy - 86, 100, 172, 4, C.white); c.strokeStyle = C.pale; c.lineWidth = 2; rr(c, cx - 50, cy - 86, 100, 172, 4); c.stroke(); fillR(cx - 50, cy - 86, 100, 70, 4, C.navy); c.fillStyle = C.red; circle(c, cx, cy - 50, 16); c.fill(); fillR(cx - 34, cy - 4, 68, 10, 5, C.navy); fillR(cx - 26, cy + 14, 52, 7, 3.5, C.soft); fillR(cx - 34, cy + 44, 68, 26, 6, C.red); fillR(cx - 64, cy + 86, 128, 12, 6, C.slate); break;
    case "badge": c.strokeStyle = C.red; c.lineWidth = 8; c.beginPath(); c.moveTo(cx - 40, cy - 100); c.lineTo(cx, cy - 46); c.lineTo(cx + 40, cy - 100); c.stroke(); fillR(cx - 58, cy - 50, 116, 150, 14, C.white); c.strokeStyle = C.pale; c.lineWidth = 2; rr(c, cx - 58, cy - 50, 116, 150, 14); c.stroke(); fillR(cx - 58, cy - 50, 116, 40, 14, C.navy); c.fillStyle = C.pale; circle(c, cx, cy + 14, 22); c.fill(); fillR(cx - 36, cy + 48, 72, 10, 5, C.navy); fillR(cx - 26, cy + 66, 52, 7, 3.5, C.soft); break;
    case "mug": fillR(cx - 60, cy - 60, 110, 130, 14, C.white); c.strokeStyle = C.pale; c.lineWidth = 2; rr(c, cx - 60, cy - 60, 110, 130, 14); c.stroke(); c.strokeStyle = C.white; c.lineWidth = 14; c.beginPath(); c.arc(cx + 54, cy + 4, 26, -1.3, 1.3); c.stroke(); c.strokeStyle = C.pale; c.lineWidth = 2; c.beginPath(); c.arc(cx + 54, cy + 4, 33, -1.2, 1.2); c.stroke();
      c.fillStyle = C.red; circle(c, cx - 5, cy + 4, 24); c.fill(); fillR(cx - 60, cy - 60, 110, 12, 6, C.navy); break;
    case "tshirt": c.fillStyle = C.navy; c.beginPath(); c.moveTo(cx - 30, cy - 76); c.quadraticCurveTo(cx, cy - 60, cx + 30, cy - 76); c.lineTo(cx + 92, cy - 50); c.lineTo(cx + 72, cy - 10); c.lineTo(cx + 54, cy - 20); c.lineTo(cx + 54, cy + 86); c.lineTo(cx - 54, cy + 86); c.lineTo(cx - 54, cy - 20); c.lineTo(cx - 72, cy - 10); c.lineTo(cx - 92, cy - 50); c.closePath(); c.fill(); c.fillStyle = C.red; circle(c, cx, cy - 18, 16); c.fill(); fillR(cx - 26, cy + 8, 52, 8, 4, rgba(C.white, 0.8)); break;
    case "cap": c.fillStyle = C.red; c.beginPath(); c.moveTo(cx - 80, cy + 20); c.bezierCurveTo(cx - 80, cy - 70, cx + 70, cy - 70, cx + 70, cy + 20); c.closePath(); c.fill(); c.fillStyle = C.navy; c.beginPath(); c.moveTo(cx + 40, cy + 20); c.quadraticCurveTo(cx + 120, cy + 16, cx + 126, cy + 36); c.lineTo(cx - 80, cy + 36); c.lineTo(cx - 80, cy + 20); c.closePath(); c.fill(); c.fillStyle = C.white; circle(c, cx - 6, cy - 14, 16); c.fill(); c.fillStyle = C.red; circle(c, cx - 6, cy - 14, 6); c.fill(); break;
    case "watch": fillR(cx - 26, cy - 96, 52, 192, 12, C.slate); c.fillStyle = C.navy; circle(c, cx, cy, 56); c.fill(); c.fillStyle = C.white; circle(c, cx, cy, 46); c.fill(); c.strokeStyle = C.navy; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 30); c.moveTo(cx, cy); c.lineTo(cx + 20, cy + 8); c.stroke(); c.fillStyle = C.red; circle(c, cx, cy, 5); c.fill(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.fillStyle = C.soft; circle(c, cx + Math.cos(a) * 38, cy + Math.sin(a) * 38, 2); c.fill(); } break;
    case "goodies": fillR(cx - 110, cy - 50, 90, 120, 8, C.navy); fillR(cx - 100, cy - 40, 6, 100, 3, C.red); c.save(); c.translate(cx + 10, cy + 10); c.rotate(-0.5); fillR(-8, -70, 16, 140, 8, C.red); fillR(-8, -70, 16, 30, 8, C.slate); c.restore();
      c.fillStyle = C.white; c.beginPath(); c.moveTo(cx + 40, cy - 30); c.lineTo(cx + 120, cy - 30); c.lineTo(cx + 112, cy + 70); c.lineTo(cx + 48, cy + 70); c.closePath(); c.fill(); c.strokeStyle = C.pale; c.lineWidth = 2; c.stroke(); c.strokeStyle = C.navy; c.lineWidth = 4; c.beginPath(); c.arc(cx + 80, cy - 30, 22, Math.PI, 0); c.stroke(); c.fillStyle = C.red; circle(c, cx + 80, cy + 18, 12); c.fill(); break;
  }
}
function initS7() {
  TILES = PORT.map(([label, kind], i) => {
    const cv = canvas(TW + 60, TH + 60), c = cv.getContext("2d");
    c.translate(30, 30);
    c.save(); c.shadowColor = rgba(C.navy, 0.18); c.shadowBlur = 26; c.shadowOffsetY = 10; rr(c, 0, 0, TW, TH, 26); c.fillStyle = C.white; c.fill(); c.restore();
    c.save(); rr(c, 0, 0, TW, TH, 26); c.clip();
    const g = c.createLinearGradient(0, 0, TW, TH);
    const bgs = [[C.page, C.pale], [C.pale, C.white], [C.white, C.page]][i % 3];
    g.addColorStop(0, bgs[0]); g.addColorStop(1, bgs[1]); c.fillStyle = g; c.fillRect(0, 0, TW, TH);
    glow(c, TW * 0.8, TH * 0.2, 160, i % 2 ? C.red : C.navy, 0.08);
    tileArt(c, kind, TW, TH);
    c.restore();
    rr(c, 0.5, 0.5, TW - 1, TH - 1, 26); c.strokeStyle = C.pale; c.lineWidth = 1; c.stroke();
    // label chip
    c.font = FONT.ui(24, 600);
    const lw = c.measureText(label).width + 36;
    c.save(); c.shadowColor = rgba(C.navy, 0.15); c.shadowBlur = 12; c.shadowOffsetY = 4; rr(c, 14, TH - 54, lw, 40, 20); c.fillStyle = rgba(C.white, 0.95); c.fill(); c.restore();
    c.fillStyle = C.red; circle(c, 30, TH - 34, 4); c.fill();
    c.fillStyle = C.navy; c.textAlign = "left"; c.fillText(label, 42, TH - 26);
    return cv;
  });
}
const TESTI = [["Be-Cosmétique", "Site e-commerce & visibilité renforcée"], ["ABIBA", "Site vitrine, nouveaux contacts réguliers"], ["LadyBoss", "Image de marque structurée"], ["SHE", "Communication du « Cabaret de Noël »"]];
function S7(x, t) {
  const t0 = 1976 / FPS;
  const cam = { bg: "light", s: 1 + 0.02 * (t - 66) / 6 };
  // white flash out of S6
  cam.flash = [C.white, 1 - eo(t, t0, 0.3)];
  const tau = Math.max(0, t - 65.9), off = 260 * tau + (1400 / 27) * Math.pow(Math.min(tau, 3), 3) + (tau > 3 ? 1400 * (tau - 3) * 0.6 : 0);
  const dim = ease.inout(clamp((t - 68.75) / 0.3));
  x.save();
  x.translate(960, 540); x.rotate(-8 * Math.PI / 180);
  [[0.58, 0.45, 0.5, 3], [0.78, 0.7, 0.75, 7], [1.0, 1.0, 1.0, 11]].forEach(([sc, al, sp, seed], li) => {
    const pw = (TW + 40) * sc, phh = (TH + 40) * sc, o = off * sp;
    const cols = Math.ceil(2600 / pw) + 2, rows = Math.ceil(1700 / phh) + 2;
    const c0 = Math.floor(o / pw);
    x.globalAlpha = al;
    for (let r = 0; r < rows; r++) {
      const ry = -850 + r * phh + (li === 1 ? phh * 0.5 : 0) - ((o * 0.35) % phh);
      const rowShift = (r % 2) * pw * 0.5;
      for (let cc = -1; cc < cols; cc++) {
        const ci = c0 + cc;
        const px = -1300 + ci * pw - o + rowShift;
        const k = Math.round(hash(ci * 31 + r * 7 + Math.floor(((o * 0.35) / phh)) * 13, seed) * 1000) % 12;
        x.drawImage(TILES[k], px - 30 * sc, ry - 30 * sc, (TW + 60) * sc, (TH + 60) * sc);
      }
    }
  });
  x.restore();
  x.globalAlpha = 1;
  // title
  if (t < 69.0) {
    const ex = ei(t, 68.7, 68.95, 2), s = kf(t, [[66.0, 1.12], [66.3, 1, ease.out]]);
    fx(x, { alpha: clamp((t - 66.0) * FPS / 3) * (1 - ex), dy: -40 * ex }, (c) => {
      const bg = c.createLinearGradient(0, 430, 0, 650); bg.addColorStop(0, rgba(C.white, 0)); bg.addColorStop(0.25, rgba(C.white, 0.9)); bg.addColorStop(0.75, rgba(C.white, 0.9)); bg.addColorStop(1, rgba(C.white, 0));
      c.fillStyle = bg; c.fillRect(0, 430, W, 220);
      c.translate(960, 540 - 60 * ex); c.scale(s, s);
      c.font = FONT.head(90); c.textAlign = "center"; c.fillStyle = C.navy; c.fillText("NOS RÉALISATIONS", 0, 32);
      c.fillStyle = C.red; c.fillRect(-60, 62, 120, 7);
    });
  }
  // testimonials
  if (dim > 0) { x.fillStyle = rgba(C.page, 0.86 * dim); x.fillRect(0, 0, W, H); }
  const blast = ei(t, 71.5, 71.94, 3), bv = eiV(t, 71.5, 71.94, 3);
  if (t >= 68.9) {
    fx(x, { alpha: clamp((t - 68.9) * FPS / 3), dy: -900 * blast }, (c) => {
      c.font = FONT.head(64); c.textAlign = "center"; c.fillStyle = C.navy; c.fillText("ILS NOUS FONT CONFIANCE", 960, 250 + 30 * rise(t, 68.9));
      c.fillStyle = C.red; c.fillRect(920, 278, 80, 6);
    });
  }
  TESTI.forEach(([name, line], i) => {
    const tk = 69.0 + 0.5 * i;
    if (t < tk) return;
    const cx = i % 2 ? 1350 : 570, cy = i < 2 ? 420 : 650, w = 740, h = 190;
    const flip = ease.out(clamp((t - tk) * FPS / 9)), dir = [cx - 960, cy - 540], dl = Math.hypot(...dir);
    const ox = dir[0] / dl * 1500 * blast, oy = dir[1] / dl * 1500 * blast, sm = Math.min(200, 1500 * bv);
    fx(x, { dx: dir[0] / dl * sm, dy: dir[1] / dl * sm }, (c) => {
      c.translate(cx + ox, cy + oy); c.scale(Math.max(0.001, flip), 1); c.transform(1, 0.12 * (1 - flip), 0, 1, 0, 0);
      glassRect(c, -w / 2, -h / 2, w, h, 30, { a: 0.8 });
      c.font = FONT.head(110); c.fillStyle = C.red; c.textAlign = "left"; c.fillText("“", -w / 2 + 28, 40);
      c.font = FONT.ui(38, 600); c.fillStyle = C.navy; c.fillText(name, -w / 2 + 110, -12);
      const lf = fit(line, (s) => FONT.body(s, 400), 30, w - 150);
      c.font = FONT.body(lf, 400); c.fillStyle = C.grey; c.fillText(line, -w / 2 + 110, 40);
      c.fillStyle = C.red; for (let k = 0; k < 5; k++) { circle(c, -w / 2 + 116 + k * 18, 70, 4); c.fill(); }
    });
  });
  if (t > 71.94 - 4 / FPS) cam.streak = { dir: [1, 0.2], amt: clamp((t - (71.94 - 4 / FPS)) * FPS / 4), seed: 88 };
  return cam;
}

// =====================================================================================
// S8 PROMISE f2156–2275, dark — second drop
// =====================================================================================
const PROM = [["TRANSFORMONS", C.white, 72.0], ["VOS IDÉES", C.white, 72.5], ["EN SUCCÈS", C.white, 73.0], ["TANGIBLES.", C.red, 73.5]];
function S8(x, t) {
  const up = ei(t, 75.5, 75.94, 3);
  const cam = { bg: "dark", bgo: { red: 0.32, redR: 1000, navy: 0.6 }, s: 1 + 0.05 * (t - 71.94) / 4, shake: shake(t, 72.0, 8, 13), y: 1500 * up, dy: Math.min(240, 1500 * eiV(t, 75.5, 75.94, 3)) };
  if (t > 75.94 - 4 / FPS) cam.streak = { dir: [0, 1], amt: clamp((t - (75.94 - 4 / FPS)) * FPS / 4), seed: 99 };
  const size = 160;
  PROM.forEach(([s, col, tk], i) => {
    if (t < tk) return;
    const lf = (t - tk) * FPS;
    let nudge = 0;
    for (let j = i + 1; j < 4; j++) nudge += 16 * ease.out(clamp((t - PROM[j][2]) * FPS / 5));
    const y = 300 + 180 * i + 16 * (3 - i) - nudge;
    const xo = 1500 * (1 - eo(t, tk, 0.4));
    const sm = 48 * (1 - clamp(lf / 5));
    fx(x, { dx: -sm, alpha: clamp(lf / 1.5) }, (c) => {
      c.font = FONT.head(size); c.textAlign = "left"; c.fillStyle = col;
      if (i === 3) { c.shadowColor = rgba(C.red, 0.5); c.shadowBlur = 40; }
      c.fillText(s, 180 + xo, y);
    });
    if (i === 3 && t >= 74.0) {
      const w = measure(s, FONT.head(size)), p = ease.out(clamp((t - 74.0) / 0.4));
      x.fillStyle = C.red; x.fillRect(180, y + 34, w * p, 12);
      glow(x, 180 + w * p, y + 40, 60, C.hot, 0.6 * (1 - clamp((t - 74.4) / 0.3)));
    }
  });
  return cam;
}

// =====================================================================================
// S9 CTA f2276–2395 (76–80 s), light
// =====================================================================================
const BG9 = canvas(240, 135), bg9 = BG9.getContext("2d");
function S9(x, t) {
  const t0 = 2276 / FPS, out = ei(t, 79.5, 79.94, 2);
  const cam = { bg: "light", s: (1 + 0.012 * (t - 76)) * (1 + 0.06 * out), blur: out > 0 ? 1 + 7 * out : 0 };
  // soft brand shapes behind the glass
  const shapes = (c, k) => {
    glow(c, (560 + 60 * Math.sin(t * 0.8)) * k, (330 + 30 * Math.cos(t * 0.7)) * k, 420 * k, C.red, 0.55);
    glow(c, (1400 + 50 * Math.cos(t * 0.6)) * k, (760 + 40 * Math.sin(t * 0.9)) * k, 480 * k, C.navy, 0.45);
    glow(c, (1250) * k, (300) * k, 260 * k, C.hot, 0.35);
  };
  shapes(x, 1);
  bg9.clearRect(0, 0, 240, 135); bg9.fillStyle = C.page; bg9.fillRect(0, 0, 240, 135); shapes(bg9, 0.125);
  const e = eo(t, t0, 0.15), cy = 540 + 700 * (1 - e), w = 1120, h = 600;
  const vel = 700 * eoV(t, t0, 0.15);
  fx(x, { dy: -Math.min(140, vel) }, (c) => {
    c.save(); c.shadowColor = rgba(C.navy, 0.22); c.shadowBlur = 80; c.shadowOffsetY = 30; rr(c, 960 - w / 2, cy - h / 2, w, h, 48); c.fillStyle = rgba(C.white, 0.2); c.fill(); c.restore();
    c.save(); rr(c, 960 - w / 2, cy - h / 2, w, h, 48); c.clip(); c.filter = "blur(4px)"; c.drawImage(BG9, 0, 0, W, H); c.filter = "none"; c.fillStyle = rgba(C.white, 0.62); c.fillRect(0, 0, W, H); c.restore();
    rr(c, 960 - w / 2, cy - h / 2, w, h, 48); c.strokeStyle = rgba(C.white, 0.95); c.lineWidth = 2; c.stroke();
    c.font = FONT.head(68, 700); c.textAlign = "center"; c.fillStyle = C.navy; c.fillText("Parlons de votre projet.", 960, cy - 120);
    // button
    const hover = t >= 76.5 ? ease.out(clamp((t - 76.5) / 0.2)) : 0;
    const sq = t >= 77.0 ? kff(t, 77.0, [[0, 0.94], [3, 1.03, ease.out], [6, 1, ease.inout]]) : 1;
    const by = cy + 20;
    c.save(); c.translate(960, by); c.scale(sq * (1 + 0.03 * hover), sq * (1 + 0.03 * hover));
    glow(c, 0, 10, 420, C.red, 0.3 + 0.15 * hover + 0.1 * Math.sin(t * 4));
    c.shadowColor = rgba(C.red, 0.45); c.shadowBlur = 40; c.shadowOffsetY = 14;
    rr(c, -300, -64, 600, 128, 64);
    const bgr = c.createLinearGradient(-300, -64, 300, 64); bgr.addColorStop(0, C.hot); bgr.addColorStop(0.35, C.red); bgr.addColorStop(1, C.red);
    c.fillStyle = bgr; c.fill(); c.shadowColor = "transparent";
    rr(c, -298, -62, 596, 60, 60); c.fillStyle = rgba(C.white, 0.1); c.fill();
    c.font = FONT.ui(46, 600); c.fillStyle = C.white; c.textAlign = "center";
    if (t >= 77.08) { const s = pop(t, 77.08); c.save(); c.translate(-236, 0); c.scale(s, s); c.fillStyle = C.white; circle(c, 0, 0, 24); c.fill(); icon(c, "check", 0, 0, 30, C.red, 3.2); c.restore(); c.fillText("Prenez rendez-vous", 22, 16); }
    else c.fillText("Prenez rendez-vous", 0, 16);
    c.restore();
    ripple(c, 960, by, t, 77.0, 380, C.red);
    c.font = FONT.body(28, 400); c.fillStyle = C.grey; c.fillText("bovanngroup.com/rendez-vous", 960, cy + 170);
    const ul = ease.out(clamp((t - 77.5) / 0.4)), uw = measure("bovanngroup.com/rendez-vous", FONT.body(28, 400));
    if (ul > 0) { c.fillStyle = C.red; c.fillRect(960 - uw / 2, cy + 182, uw * ul, 3); }
    // cursor
    if (t >= 76.2) {
      const ce = eo(t, 76.2, 0.14), kx = lerp(1700, 1010, ce), ky = lerp(1000, by + 18, ce);
      const cs = (1 + 0.4 * hover) * (t >= 77.0 ? kff(t, 77.0, [[0, 0.85], [3, 1, ease.out]]) : 1);
      cursor(c, kx + 12 * Math.sin(t * 1.4) * clamp(t - 77.3), ky, cs);
    }
  });
  return cam;
}

// ---------- not built yet ----------
const todo = (name, dark) => (x, t) => {
  x.font = FONT.ui(40, 600); x.textAlign = "center"; x.fillStyle = dark ? C.soft : C.navy;
  x.fillText(`${name} — en construction`, 960 + 30 * Math.sin(t), 540);
  return { bg: dark ? "dark" : "light" };
};

// =====================================================================================
const SHOTS = [
  { f0: 0, f1: 177, render: S1 },
  { f0: 178, f1: 357, render: S2 },
  { f0: 358, f1: 417, render: S3 },
  { f0: 418, f1: 596, render: S4 },
  { f0: 597, f1: 836, render: S5a },
  { f0: 837, f1: 1076, render: S5b },
  { f0: 1077, f1: 1316, render: S5c },
  { f0: 1317, f1: 1555, render: S5d },
  { f0: 1556, f1: 1795, render: S5e },
  { f0: 1796, f1: 1975, render: S6 },
  { f0: 1976, f1: 2155, render: S7 },
  { f0: 2156, f1: 2275, render: S8 },
  { f0: 2276, f1: 2395, render: S9 },
  { f0: 2396, f1: 2637.99, render: S10 },
];

export function renderFrame(f) {
  const t = f / FPS;
  let shot = SHOTS[0];
  for (const s of SHOTS) if (f >= s.f0) shot = s;
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.clearRect(0, 0, W, H);
  lx.save();
  const cam = Object.assign({ x: 0, y: 0, s: 1, r: 0, px: W / 2, py: H / 2 }, shot.render(lx, t, f));
  lx.restore();
  const [sx, sy] = cam.shake || [0, 0];
  mx.setTransform(1, 0, 0, 1, 0, 0);
  mx.filter = "none";
  mx.globalAlpha = 1;
  if (cam.bg === "dark") darkBG(mx, cam.bgo || {});
  else lightBG(mx, (cam.x + sx) * 0.6, (cam.y + sy) * 0.6, Math.max(0.5, Math.pow(cam.s, 0.6)));
  fx(mx, { dx: cam.dx, dy: cam.dy, zoom: cam.zoom, blur: cam.blur }, (c) => {
    c.translate(cam.px + cam.x + sx, cam.py + cam.y + sy); c.rotate(cam.r); c.scale(cam.s, cam.s); c.translate(-cam.px, -cam.py);
    c.drawImage(L, 0, 0);
  });
  if (cam.streak && cam.streak.amt > 0) streaks(mx, cam.streak.dir, cam.streak.amt, cam.streak.seed);
  if (cam.post) cam.post(mx);
  if (cam.flash && cam.flash[1] > 0) { mx.fillStyle = rgba(cam.flash[0], cam.flash[1]); mx.fillRect(0, 0, W, H); }
  if (cam.bg === "dark") grain(mx, f);
}

export async function init() {
  initGrain();
  for (const src of ["../assets/logo.png", "../assets/logo.svg"]) {
    try {
      const r = await fetch(src);
      if (!r.ok) continue;
      const img = new Image();
      img.src = URL.createObjectURL(await r.blob());
      await img.decode();
      LOGO = img;
      break;
    } catch {}
  }
  initS1(); initS3(); initS4(); initS7();
}
export { DUR };
