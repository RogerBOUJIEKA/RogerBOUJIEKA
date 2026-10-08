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
const T10 = 2336 / FPS;
function S10(x, t) {
  const col = ei(t, 83.0, 83.85, 2.4);
  const cam = { bg: "dark", bgo: { navy: 0.6, glowR: 900 }, s: (1 + 0.004 * (t - 78)) * (1 - col * 0.995), blur: 4 * col, shake: shake(t, 78.0, 8, 9) };
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
  const lp = ease.out(clamp((t - 78.4) / 0.5)), flash = Math.exp(-Math.max(0, t - 83.0) * FPS / 4) * (t >= 83 ? 1 : 0);
  if (lp > 0) {
    x.fillStyle = C.red; x.fillRect(960 - 280 * lp, 500, 560 * lp, 3 + 3 * flash);
    if (flash > 0.01) glow(x, 960, 501, 420, C.hot, 0.6 * flash);
  }
  const txt = (t0, draw, b0 = 6) => { if (t < t0) return; const r = rise(t, t0, 0.22); fx(x, { blur: b0 * r, alpha: clamp((t - t0) * FPS / 3) }, (c) => draw(c, 22 * r)); };
  txt(78.5, (c) => { c.font = FONT.ui(30, 500); c.letterSpacing = "8px"; c.textAlign = "center"; c.fillStyle = C.soft; c.fillText("EXPERTISE · INNOVATION · RÉSULTATS", 964, 566); c.letterSpacing = "0px"; }, 8);
  const cf = FONT.body(38, 400);
  [["+228 70 25 65 65 · +228 79 79 02 29", 79.0, 668], ["contact@bovanngroup.com · bovanngroup.com", 79.5, 728], ["Hédzranawoé, Lomé – Togo", 80.0, 788]].forEach(([s, t0, y]) =>
    txt(t0, (c, o) => { c.font = cf; c.textAlign = "center"; c.fillStyle = C.pale; c.fillText(s, 960, y + o); }));
  txt(80.5, (c, o) => {
    const hf = FONT.ui(32, 500), hw = measure("@bovanngroup", hf), tot = 3 * 44 + 2 * 22 + 30 + hw;
    let sx = 960 - tot / 2;
    ["facebook", "instagram", "linkedin"].forEach((ic) => { icon(c, ic, sx + 22, 868 + o, 44, C.white, 1.8); sx += 66; });
    c.font = hf; c.textAlign = "left"; c.fillStyle = C.pale; c.fillText("@bovanngroup", sx + 8, 880 + o);
  });
  // the film ends on the red dot
  cam.post = (m) => {
    const a = clamp((t - 83.55) / 0.2);
    if (a <= 0) return;
    const p = beatPulse(t, 84, 84) + kf(t, [[83.9, 0], [83.95, 1, ease.out], [84.1, 0]]);
    glow(m, 960, 540, 70 + 40 * p, C.red, (0.4 + 0.3 * p) * a);
    m.fillStyle = C.red; circle(m, 960, 540, 10 * a * (1 + 0.35 * p)); m.fill();
  };
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
  { f0: 837, f1: 1076, render: todo("S5b Communication", false) },
  { f0: 1077, f1: 1316, render: todo("S5c Informatique", true) },
  { f0: 1317, f1: 1555, render: todo("S5d Formations", false) },
  { f0: 1556, f1: 1795, render: todo("S5e Management", true) },
  { f0: 1796, f1: 1975, render: S6 },
  { f0: 1976, f1: 2155, render: todo("S7 Réalisations", false) },
  { f0: 2156, f1: 2275, render: todo("S8 Promesse", true) },
  { f0: 2276, f1: 2335, render: todo("S9 CTA", false) },
  { f0: 2336, f1: 2517.99, render: S10 },
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
  initS1(); initS3(); initS4();
}
export { DUR };
