// Frame engine: every pixel is a pure function of the frame number f (29.97 fps units, fractional for the 59.94 master).
export const W = 1920, H = 1080, FPS = 29.97, DUR = 88, LAST_F = 2637;
export const C = {
  night: "#000910", slate: "#28323A", navy: "#273D4E", red: "#DC0C15", hot: "#EE5328",
  page: "#F1F4FA", white: "#FFFFFF", grey: "#444444", soft: "#9AA6B2", pale: "#E5EAEE",
};

// ---------- maths ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const fr = (t) => t * FPS; // seconds → frames
export const ease = {
  lin: (u) => u,
  out: (u) => 1 - Math.pow(1 - u, 3),
  out5: (u) => 1 - Math.pow(1 - u, 5),
  in: (u) => u * u * u,
  in2: (u) => u * u,
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  back: (u) => { const c = 2.2; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
};
// Exponential ease-out: share of the distance covered (t-t0) s after a start at rate r per frame (12–19 % by default 16 %).
export const eo = (t, t0, r = 0.16) => (t <= t0 ? 0 : 1 - Math.pow(1 - r, (t - t0) * FPS));
// Speed of eo in share-of-distance per frame.
export const eoV = (t, t0, r = 0.16) => (t <= t0 ? 0 : -Math.log(1 - r) * Math.pow(1 - r, (t - t0) * FPS));
// Accelerating ease-in from t0 to t1 (power p), and its speed per frame.
export const ei = (t, t0, t1, p = 3) => Math.pow(clamp((t - t0) / (t1 - t0)), p);
export const eiV = (t, t0, t1, p = 3) => {
  const u = clamp((t - t0) / (t1 - t0));
  return u <= 0 ? 0 : (p * Math.pow(u, p - 1)) / fr(t1 - t0);
};
// Keyframe table in seconds: [[t, v, ease?], ...] – the ease on a key shapes the segment that ends on it.
export function kf(t, keys, e = ease.inout) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, ek] = keys[i];
      return v0 + (v1 - v0) * (ek || e)((t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}
// Same, keys in frames relative to an origin time.
export const kff = (t, t0, keys, e) => kf(fr(t - t0), keys, e);
// Beat pulse: 4-frame attack, 8-frame decay, peak 1. Beats every 0.5 s.
export function beatPulse(t, from = 0, to = 1e9) {
  const k = Math.round((t - 0.1) / 0.5);
  let v = 0;
  for (const kk of [k - 1, k, k + 1]) {
    const tb = kk * 0.5;
    if (tb < from - 1e-6 || tb > to + 1e-6) continue;
    const d = (t - tb) * FPS;
    if (d >= 0 && d < 4) v = Math.max(v, ease.out(d / 4));
    else if (d >= 4 && d < 12) v = Math.max(v, 1 - ease.inout((d - 4) / 8));
  }
  return v;
}

// ---------- seeded randomness (no Math.random anywhere) ----------
export function hash(i, s = 0) {
  let x = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export const hs = (i, s = 0) => hash(i, s) * 2 - 1; // signed
// Smooth seeded noise in [-1, 1] (sum of three detuned sines).
export function snoise(t, seed) {
  let v = 0;
  for (let k = 0; k < 3; k++) {
    const f = 0.6 + hash(k, seed) * 2.2 * (k + 1), p = hash(k + 7, seed) * 6.283;
    v += Math.sin(t * f * 6.283 + p) / (k + 1.6);
  }
  return v / 1.35;
}

// ---------- canvases ----------
export function canvas(w = W, h = H) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
const pool = [];
let depth = 0;
// Odd slots accumulate smear copies: float16 keeps soft, low-alpha edges from banding when averaged.
const scratch = (i) => (pool[i] ||= ((c) => (c._x = c.getContext("2d", i % 2 ? { colorType: "float16" } : {}), c))(canvas()));

// Draw with effects: o = { alpha, blur (px, round), dx, dy (directional smear vector, px), zoom: {cx, cy, amt}, rot: {cx, cy, ang}, n, box: [x,y,w,h], comp }
export function fx(ctx, o, draw) {
  const smear = Math.hypot(o.dx || 0, o.dy || 0);
  const zoom = o.zoom && Math.abs(o.zoom.amt) > 0.002 ? o.zoom : null;
  const rot = o.rot && Math.abs(o.rot.ang) > 0.002 ? o.rot : null;
  const blur = o.blur > 0.15 ? o.blur : 0;
  if (smear < 1.5 && !zoom && !rot && !blur) {
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.comp) ctx.globalCompositeOperation = o.comp;
    draw(ctx);
    ctx.restore();
    return;
  }
  const d = depth; depth += 2;
  const A = scratch(d), B = scratch(d + 1), a = A._x, b = B._x;
  a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H);
  a.save(); draw(a); a.restore();
  let src = A;
  if (smear >= 1.5 || zoom || rot) {
    const n = o.n || Math.min(48, Math.max(6, Math.round(smear / 3.5) + (zoom ? 20 : 0) + (rot ? 14 : 0)));
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, H);
    b.save();
    b.globalCompositeOperation = "lighter";
    b.globalAlpha = 1 / n;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1) - 0.5;
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.translate((o.dx || 0) * u, (o.dy || 0) * u);
      if (zoom) { const s = 1 + zoom.amt * (u + 0.5); b.translate(zoom.cx, zoom.cy); b.scale(s, s); b.translate(-zoom.cx, -zoom.cy); }
      if (rot) { b.translate(rot.cx, rot.cy); b.rotate(rot.ang * (u + 0.5) * -1); b.translate(-rot.cx, -rot.cy); }
      b.drawImage(A, 0, 0);
    }
    b.restore();
    src = B;
  }
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.comp) ctx.globalCompositeOperation = o.comp;
  if (blur) ctx.filter = `blur(${blur.toFixed(2)}px)`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  depth -= 2;
}

// ---------- shapes ----------
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
export function glow(ctx, x, y, r, color, a) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.35, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- type ----------
export const FONT = {
  head: (s, w = 800) => `${w} ${s}px Raleway`,
  body: (s, w = 400) => `${w} ${s}px Roboto`,
  ui: (s, w = 600) => `${w} ${s}px Inter`,
  mono: (s) => `400 ${s}px "Roboto Mono"`,
};
const mctx = canvas(8, 8).getContext("2d");
export function measure(text, font, ls = 0) {
  mctx.font = font;
  mctx.letterSpacing = `${ls}px`;
  return mctx.measureText(text).width;
}
// Largest size ≤ size so the text fits maxW.
export function fit(text, fontFn, size, maxW, ls = 0) {
  const w = measure(text, fontFn(size), ls);
  return w <= maxW ? size : Math.floor((size * maxW) / w);
}
// Rich line: segs = [[text, color], ...]; returns total width. align: left|center|right.
export function rich(ctx, segs, x, y, font, align = "left", ls = 0) {
  ctx.font = font;
  ctx.letterSpacing = `${ls}px`;
  ctx.textAlign = "left";
  const ws = segs.map(([s]) => ctx.measureText(s).width), tot = ws.reduce((a, b) => a + b, 0);
  let cx = align === "center" ? x - tot / 2 : align === "right" ? x - tot : x;
  segs.forEach(([s, col], i) => { ctx.fillStyle = col; ctx.fillText(s, cx, y); cx += ws[i]; });
  return tot;
}
export function wrap(text, font, maxW) {
  const words = text.split(" "), lines = [];
  let cur = "";
  for (const w of words) {
    const tryL = cur ? cur + " " + w : w;
    if (measure(tryL, font) > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- backgrounds (screen space, drawn by the engine) ----------
let grainTiles = [];
export function initGrain() {
  grainTiles = [0, 1, 2, 3].map((k) => {
    const c = canvas(256, 256), x = c.getContext("2d"), im = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const v = hash(i, 91 + k), g = v > 0.5 ? 255 : 0;
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = g;
      im.data[i * 4 + 3] = Math.abs(v - 0.5) * 2 * 34;
    }
    x.putImageData(im, 0, 0);
    return c;
  });
}
export function grain(ctx, f, amt = 1) {
  const k = Math.round(f * 2), tile = grainTiles[((k % 4) + 4) % 4];
  const ox = Math.round(hash(k, 3) * 256), oy = Math.round(hash(k, 4) * 256);
  ctx.save();
  ctx.globalAlpha = 0.55 * amt;
  const p = ctx.createPattern(tile, "repeat");
  p.setTransform(new DOMMatrix().translate(ox, oy));
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
export function darkBG(ctx, o = {}) {
  ctx.fillStyle = o.base || C.night;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2 + (o.gx || 0), cy = H / 2 + (o.gy || 0);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.glowR || 1000);
  g.addColorStop(0, rgba(C.navy, o.navy ?? 0.75));
  g.addColorStop(1, rgba(C.navy, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (o.red) glow(ctx, cx, cy, o.redR || 900, C.red, o.red);
}
// Light page with a navy dot grid (6 %, 40 px) scrolled by the camera offset (parallax).
export function lightBG(ctx, ox = 0, oy = 0, s = 1) {
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, W, H);
  const sp = 40 * s, x0 = (((W / 2 + ox) % sp) + sp) % sp, y0 = (((H / 2 + oy) % sp) + sp) % sp;
  ctx.fillStyle = rgba(C.navy, 0.06);
  const r = 1.8 * Math.max(0.6, Math.sqrt(s));
  ctx.beginPath();
  for (let y = y0 - sp; y < H + sp; y += sp)
    for (let x = x0 - sp; x < W + sp; x += sp) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); }
  ctx.fill();
}

// Speed streaks for whips: 6–10 thin seeded lines (white and red) travelling along dir.
export function streaks(ctx, dir, amt, seed) {
  if (amt <= 0) return;
  const [dx, dy] = dir, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const n = 6 + Math.round(hash(seed, 5) * 4);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const across = hs(i, seed) * (Math.abs(ux) > Math.abs(uy) ? H / 2 : W / 2) * 0.95;
    const along = hs(i + 40, seed) * 900 + amt * 1400 * (hash(i + 9, seed) + 0.5);
    const len = 220 + hash(i + 3, seed) * 700;
    const cx = W / 2 + ux * along - uy * across, cy = H / 2 + uy * along + ux * across;
    ctx.strokeStyle = i % 3 === 1 ? rgba(C.red, 0.85 * Math.sin(Math.PI * amt)) : rgba(C.white, 0.75 * Math.sin(Math.PI * amt));
    ctx.lineWidth = 1 + hash(i + 11, seed) * 2;
    ctx.beginPath();
    ctx.moveTo(cx - ux * len / 2, cy - uy * len / 2);
    ctx.lineTo(cx + ux * len / 2, cy + uy * len / 2);
    ctx.stroke();
  }
  ctx.restore();
}
// 2-frame micro shake (±8 px, decaying) after an impact at t0.
export function shake(t, t0, amp = 8, seed = 1) {
  const d = (t - t0) * FPS;
  if (d < 0 || d > 2.6) return [0, 0];
  const e = amp * (1 - d / 2.6);
  return [e * Math.sin(d * 5.1 + seed) * (hash(seed, 1) > 0.5 ? 1 : -1), e * Math.cos(d * 4.3 + seed * 2)];
}
