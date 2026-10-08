/* Camair-Co — spot motion design 1 min 28 s (1920×1080).
 * Same engine as the 15 s cut (../src/spot.js): every frame is a pure function of time t,
 * rendered live for preview or frame-by-frame (with sub-frame motion blur) for export. */
"use strict";
(() => {
  const W = 1920, H = 1080, DUR = 88, TAU = Math.PI * 2;
  const stage = document.getElementById("stage");
  const out = stage.getContext("2d");
  const buf = document.createElement("canvas");
  buf.width = W; buf.height = H;
  const ctx = buf.getContext("2d");

  // ───────────────────────── palette & type ─────────────────────────
  const C = {
    night: "#020c07", land: "#0f3324", africa: "#185239", border: "rgba(170,255,205,0.2)",
    green: "#12925a", greenD: "#0a5c37", greenL: "#47d98f", red: "#d3202f", gold: "#f9b71c", goldL: "#ffd970",
    cream: "#f4eee1", creamD: "#e6dcc6", ink: "#0a3b25", white: "#ffffff",
  };
  const MONT = '"Montserrat"', PLAY = '"Playfair Display"', MONO = '"JetBrains Mono"';

  // ───────────────────────── math helpers ─────────────────────────
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpLog = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    outCubic: (x) => 1 - (1 - x) ** 3,
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
    outQuart: (x) => 1 - (1 - x) ** 4,
    inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2),
    outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
    inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
    outBack: (x, s = 1.7) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function rng(seed) {
    return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function scramble(text, k, seed, t) {
    const n = text.length, done = Math.floor(k * n);
    let s = "";
    for (let i = 0; i < n; i++) {
      const ch = text[i];
      if (i < done || ch === " " || ch === "." || ch === "-" || ch === "·") s += ch;
      else if (i < done + 4 && k > 0) s += GLYPHS[Math.floor(hash(seed + i * 7.3 + Math.floor(t * 30)) * GLYPHS.length)];
      else s += "";
    }
    return s;
  }

  // ───────────────────────── drawing helpers ─────────────────────────
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function starPath(c, x, y, r, rot = -Math.PI / 2, inner = 0.382) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * Math.PI) / 5, rad = i % 2 ? r * inner : r;
      i ? c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  function starPoints(x, y, r, rot = -Math.PI / 2, inner = 0.382) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = rot + (i * Math.PI) / 5, rad = i % 2 ? r * inner : r; pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]); }
    return pts;
  }
  // partial polyline (for line-draw "trace" reveals)
  function tracePolyline(c, pts, k) {
    if (k <= 0 || pts.length < 2) return;
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let left = total * k;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const d = seg[i - 1];
      if (d <= left) { c.lineTo(pts[i][0], pts[i][1]); left -= d; }
      else { const f = left / d; c.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left = 0; }
    }
    c.stroke();
  }
  // Per-letter text with kerning-aware positions; `each(i, n)` returns {dx, dy, alpha, scale, rot, fill}.
  function letters(c, text, x, y, o) {
    c.font = o.font; c.textAlign = "left"; c.textBaseline = "alphabetic";
    const sp = o.spacing || 0, n = text.length, xs = [];
    for (let i = 0; i <= n; i++) xs.push(c.measureText(text.slice(0, i)).width + i * sp);
    const total = xs[n] - sp;
    const x0 = o.align === "center" ? x - total / 2 : o.align === "right" ? x - total : x;
    for (let i = 0; i < n; i++) {
      const ch = text[i]; if (ch === " ") continue;
      const st = o.each ? o.each(i, n) : {};
      const a = st.alpha === undefined ? 1 : st.alpha; if (a <= 0.001) continue;
      const wch = xs[i + 1] - xs[i] - sp;
      c.save(); c.globalAlpha *= a;
      c.translate(x0 + xs[i] + wch / 2 + (st.dx || 0), y + (st.dy || 0));
      if (st.rot) c.rotate(st.rot);
      if (st.scale !== undefined) c.scale(st.scale, st.scaleY === undefined ? st.scale : st.scaleY);
      c.fillStyle = st.fill || o.fill || "#fff"; c.textAlign = "center"; c.fillText(ch, 0, 0);
      c.restore();
    }
    return { x0, total };
  }
  function textWidth(c, text, font, sp = 0) { c.font = font; return c.measureText(text).width + sp * text.length; }
  // line that slides up from behind a mask
  function maskLine(c, k, x, y, h, w, draw) {
    if (k <= 0) return;
    c.save(); c.beginPath(); c.rect(x - 40, y - h, w + 80, h * 1.32); c.clip();
    c.translate(0, (1 - k) * h * 1.15); draw(); c.restore();
  }
  function glowDot(c, x, y, r, col, a = 1) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, "0)")); // fade to the same hue, not to black
    c.save(); c.globalAlpha *= a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
  }
  function ring(c, x, y, r, w, col, a) {
    if (a <= 0 || r <= 0) return;
    c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.restore();
  }

  // airliner, top view, nose towards +x, ~100 units long
  const PLANE = new Path2D("M50 0C50-2.6 47-4.2 42-4.4L12-4.4-10-44-17-44-5-4.4-34-4-44-16-49-16-45-3-50-1.2-50 1.2-45 3-49 16-44 16-34 4-5 4.4-17 44-10 44 12 4.4 42 4.4C47 4.2 50 2.6 50 0Z");
  const ENGINES = new Path2D("M3 -19.5h11a1.8 1.8 0 0 1 0 3.6H3zM3 15.9h11a1.8 1.8 0 0 1 0 3.6H3z");
  function plane(c, x, y, ang, s, col = "#fff", shadow = 0) {
    c.save(); c.translate(x, y);
    if (shadow) { c.save(); c.translate(shadow * 0.6, shadow); c.rotate(ang); c.scale(s, s); c.fillStyle = "rgba(0,0,0,0.35)"; c.fill(PLANE); c.restore(); }
    c.rotate(ang); c.scale(s, s); c.fillStyle = col; c.fill(PLANE); c.fill(ENGINES); c.restore();
  }

  // ───────────────────────── globe ─────────────────────────
  const AFRICA = new Set("012 024 072 108 120 132 140 148 174 178 180 204 226 231 232 262 266 270 288 324 384 404 426 430 434 450 454 466 478 480 504 508 516 562 566 624 646 678 686 690 694 706 710 716 728 729 732 748 768 788 800 818 834 854 894".split(" "));
  const NEAR = new Set(["120", "566", "148", "140", "178", "266", "226", "562"]);
  const proj = d3.geoOrthographic().clipAngle(90).precision(0.35);
  const gpath = d3.geoPath(proj, ctx);
  const graticule = d3.geoGraticule10();
  const CMR = GEO.n10.features.find((f) => f.id === "120");
  const cmrRing = (() => { // largest ring of Cameroon's outline
    const polys = CMR.geometry.type === "Polygon" ? [CMR.geometry.coordinates] : CMR.geometry.coordinates;
    return polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
  })();

  function setCam(c) { proj.rotate([-c.lon, -c.lat]).scale(c.R).translate([c.cx, c.cy]).clipExtent([[-30, -30], [W + 30, H + 30]]); }
  const P = (ll) => proj(ll);

  const STARS = (() => { const r = rng(7); return Array.from({ length: 520 }, () => ({ x: r() * W, y: r() * H, s: r() ** 3 * 2.2 + 0.4, ph: r() * TAU, sp: 1 + r() * 3 })); })();

  function drawWorld(t) {
    const c = camAt(t); setCam(c);
    const space = clamp((2200 - c.R) / 1500);
    ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H);
    // nebula + stars
    if (space > 0) {
      ctx.save(); ctx.globalAlpha = space;
      glowDot(ctx, 420, 260, 700, "rgba(18,146,90,0.16)"); glowDot(ctx, 1700, 900, 600, "rgba(249,183,28,0.07)");
      for (const s of STARS) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        const px = s.x - (t - 3) * 6 * s.s; // gentle parallax drift
        ctx.globalAlpha = space * tw * 0.9; ctx.fillStyle = "#fff";
        ctx.fillRect(((px % W) + W) % W, s.y, s.s, s.s);
      }
      ctx.restore();
    }
    // atmosphere
    if (c.R < 3200) {
      const g = ctx.createRadialGradient(c.cx, c.cy, c.R * 0.92, c.cx, c.cy, c.R * 1.3);
      g.addColorStop(0, "rgba(71,217,143,0.45)"); g.addColorStop(0.18, "rgba(71,217,143,0.16)"); g.addColorStop(1, "rgba(71,217,143,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.cx, c.cy, c.R * 1.3, 0, TAU); ctx.fill();
    }
    // ocean sphere
    const og = ctx.createRadialGradient(c.cx - c.R * 0.35, c.cy - c.R * 0.45, c.R * 0.05, c.cx, c.cy, c.R);
    og.addColorStop(0, "#0c3424"); og.addColorStop(1, "#03130c");
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(c.cx, c.cy, c.R, 0, TAU); ctx.fill();
    // graticule
    ctx.beginPath(); gpath(graticule); ctx.strokeStyle = "rgba(160,255,200,0.06)"; ctx.lineWidth = 1; ctx.stroke();
    // land
    const hi = c.R > 2800;
    const feats = c.R < 1100 ? GEO.w110.features : GEO.w50.features;
    const cmrGrad = ctx.createLinearGradient(0, c.cy - c.R * 0.12, 0, c.cy + c.R * 0.12);
    cmrGrad.addColorStop(0, "#17a866"); cmrGrad.addColorStop(1, "#0b6a40");
    const fillOf = (id) => (id === "120" ? cmrGrad : AFRICA.has(id) ? C.africa : C.land);
    ctx.lineJoin = "round";
    const drawSet = (list, skipNear) => {
      for (const f of list) {
        if (skipNear && NEAR.has(f.id)) continue;
        ctx.beginPath(); gpath(f); ctx.fillStyle = fillOf(f.id); ctx.fill();
        ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();
      }
    };
    drawSet(feats, hi);
    if (hi) drawSet(GEO.n10.features, false);
    // Cameroon glow edge
    ctx.beginPath(); gpath(hi ? CMR : feats.find((f) => f.id === "120") || CMR);
    ctx.strokeStyle = "rgba(255,217,112,0.55)"; ctx.lineWidth = hi ? 2 : 1.4; ctx.stroke();
    // shading for the "space" look
    if (space > 0) {
      const sh = ctx.createRadialGradient(c.cx - c.R * 0.4, c.cy - c.R * 0.4, c.R * 0.15, c.cx, c.cy, c.R * 1.02);
      sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(0.75, "rgba(0,0,0,0.25)"); sh.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.save(); ctx.globalAlpha = space; ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(c.cx, c.cy, c.R, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(140,255,200,0.35)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
    return c;
  }

  // great-circle route projected, bowed upward a little (flight-map look)
  function routePts(a, b, n = 48, bow = 0.2) {
    const interp = d3.geoInterpolate(a, b), pts = [];
    for (let i = 0; i <= n; i++) pts.push(P(interp(i / n)));
    const [x0, y0] = pts[0], [x1, y1] = pts[n];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    let nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    return pts.map(([x, y], i) => { const s = Math.sin((Math.PI * i) / n) * len * bow; return [x + nx * s, y + ny * s]; });
  }
  function drawRoute(pts, k, col, width, withPlane, ahead = 0.18) {
    const n = pts.length - 1, head = k * n;
    // faint dotted "planned" route ahead of the head
    if (ahead > 0 && k < 1) {
      ctx.save(); ctx.setLineDash([2, 9]); ctx.lineCap = "round"; ctx.strokeStyle = `rgba(255,255,255,${ahead})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(...pts[Math.floor(head)]); for (let i = Math.ceil(head); i <= n; i++) ctx.lineTo(...pts[i]); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.lineCap = "round";
    for (let i = 1; i <= Math.ceil(head); i++) {
      const f = Math.min(1, head - (i - 1));
      const a = pts[i - 1], b = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      ctx.globalAlpha = 0.35 + 0.65 * (i / Math.max(1, head)) ** 2;
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    }
    ctx.restore();
    if (k > 0 && k < 1) {
      const i = Math.min(n - 1, Math.floor(head)), f = head - i;
      const x = lerp(pts[i][0], pts[i + 1][0], f), y = lerp(pts[i][1], pts[i + 1][1], f);
      glowDot(ctx, x, y, 26, "rgba(255,217,112,0.9)");
      if (withPlane) plane(ctx, x, y, Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]), 0.34, "#fff", 6);
    }
  }
  function pin(x, y, t0, t, col = C.gold, size = 9) {
    const k = prog(t, t0, t0 + 0.35); if (k <= 0) return;
    for (let j = 0; j < 2; j++) { const q = prog(t, t0 + j * 0.18, t0 + j * 0.18 + 1.1); ring(ctx, x, y, 8 + q * 46, 2, col, (1 - q) * 0.9); }
    glowDot(ctx, x, y, 30, "rgba(249,183,28,0.45)", k);
    ctx.save(); ctx.translate(x, y); ctx.scale(E.outBack(k, 3), E.outBack(k, 3));
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, size * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, size, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function mapLabel(x, y, code, name, dir, t0, t) {
    const k = prog(t, t0, t0 + 0.45); if (k <= 0) return;
    const e = E.outBack(k, 2.2);
    ctx.save();
    ctx.font = `700 22px ${MONO}`; const wc = ctx.measureText(code).width;
    ctx.font = `800 22px ${MONT}`; const wn = ctx.measureText(name).width;
    const w = wc + wn + 46, h = 42;
    if (dir === 0) { ctx.translate(x, y - 30); ctx.scale(e, e); ctx.translate(-w / 2, -h); }
    else { ctx.translate(dir < 0 ? x - 24 : x + 24, y); ctx.scale(e, e); ctx.translate(dir < 0 ? -w : 0, -h / 2); }
    ctx.globalAlpha = clamp(k * 2);
    rr(ctx, 0, 0, w, h, 8); ctx.fillStyle = "rgba(3,20,12,0.82)"; ctx.fill();
    ctx.strokeStyle = "rgba(249,183,28,0.55)"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = C.gold; ctx.fillRect(0, 0, 5, h);
    ctx.font = `700 22px ${MONO}`; ctx.fillStyle = C.gold; ctx.fillText(scramble(code, prog(t, t0, t0 + 0.3), x, t), 16, 29);
    ctx.font = `800 22px ${MONT}`; ctx.fillStyle = "#fff"; ctx.fillText(name.slice(0, Math.ceil(name.length * prog(t, t0 + 0.05, t0 + 0.4))), 28 + wc, 29);
    ctx.restore();
  }

  // ───────────────────────── split-flap ─────────────────────────
  function flapHalf(x, y, w, h, ch, top, sy, shade, font, col) {
    const mid = y + h / 2;
    ctx.save();
    ctx.translate(0, mid); ctx.scale(1, sy); ctx.translate(0, -mid);
    ctx.beginPath(); ctx.rect(x, top ? y : mid, w, h / 2); ctx.clip();
    rr(ctx, x, y, w, h, 14);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#14382a"); g.addColorStop(0.5, "#0b2a1d"); g.addColorStop(0.5001, "#0e3123"); g.addColorStop(1, "#08221a");
    ctx.fillStyle = g; ctx.fill();
    ctx.font = font; ctx.fillStyle = col; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ch, x + w / 2, mid + h * 0.03);
    if (shade > 0) { ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  function flapCell(x, y, w, h, seq, t0, t, font, col) {
    // seq: list of chars to roll through; each flip lasts `d`
    const d = 0.085, s = Math.floor((t - t0) / d), f = (t - t0) / d - s;
    let from, to, k;
    if (t < t0) { from = to = seq[0]; k = 1; } else if (s >= seq.length - 1) { from = to = seq[seq.length - 1]; k = 1; } else { from = seq[s]; to = seq[s + 1]; k = f; }
    flapHalf(x, y, w, h, k > 0 ? to : from, true, 1, 0, font, col);
    flapHalf(x, y, w, h, k < 1 ? from : to, false, 1, 0, font, col);
    if (k > 0 && k < 1) {
      if (k < 0.5) flapHalf(x, y, w, h, from, true, 1 - k * 2, k * 0.9, font, col);
      else flapHalf(x, y, w, h, to, false, (k - 0.5) * 2, (1 - k) * 0.9, font, col);
    }
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
    ctx.fillStyle = "#020c07"; ctx.fillRect(x - 3, y + h / 2 - 6, 6, 12); ctx.fillRect(x + w - 3, y + h / 2 - 6, 6, 12);
  }
  function flapSeq(prev, next, salt) {
    const seq = [prev];
    for (let j = 0; j < 3; j++) seq.push(GLYPHS[Math.floor(hash(salt + j * 3.1) * 26)]);
    seq.push(next); return seq;
  }


  // ───────────────────────── long-cut timeline ─────────────────────────
  // Word onsets come from src/timing.js (scripts/place_vo.py); music crashes at ~21.4, 40.8, 59.6, 69.5, 79.4 s.
  const L = {
    trace: 0.5, ignite: 1.95, au: 2.30, etoile: 3.63, ciel: 5.25, zoom: 6.25, iris: 6.9,
    depuis: 7.47, year: 7.94, camair: 8.98, compagnie: 10.12, nationale: 11.56, rapproche: 12.69,
    villes: 13.38, familles: 14.21, reves: 15.28, s2out: 16.2,
    au3: 17.33, douala: 18.18, yaounde: 19.14, envolez: 20.16, garoua: 21.17, maroua: 21.95, ngaoundere: 22.86, pull: 24.0,
    audela: 25.31, frontieres: 26.10, camair2: 27.02, vous: 28.11, ciel2: 28.86, afrique: 29.18, push: 29.55,
    lbv: 30.06, coo: 31.14, bzv: 32.15, pnr: 33.17, ndj: 34.38, bgf: 35.45, wipe: 36.45,
    bord: 37.96, boeing: 38.72, dash: 40.62, q400: 41.82, priorite: 43.26, votre: 44.45, securite: 44.91, s5out: 46.6,
    star: 48.04, programme: 49.63, chaque: 51.32, miles: 52.98, billets: 54.01, surclass: 54.97, bagages: 56.29, s6out: 58.6,
    classe: 60.42, affaires: 61.0, eco: 61.96, laissez: 62.78, hosp: 63.96, cam: 64.83, sourire: 66.21, attention: 67.18, instant: 68.2, s7out: 69.3,
    reservez: 70.66, quelques: 71.42, clics: 71.83, sur: 72.2, url: 72.43, cm: 73.83, takeoff: 75.2, dive: 78.55,
    logo: 79.46, etoile2: 80.75, cameroun: 81.94, urlEnd: 82.9, shimmer: 84.4, fade: 87.1,
  };
  const BEAT = 0.6036, BEAT0 = 0.52;
  const beatPulse = (t) => { const k = ((t - BEAT0) / BEAT) % 1; return k < 0 ? 0 : Math.exp(-k * 6); };

  const CITY = {
    DLA: { name: "DOUALA", ll: [9.7, 4.05] }, NSI: { name: "YAOUNDÉ", ll: [11.52, 3.87] },
    GOU: { name: "GAROUA", ll: [13.4, 9.3] }, MVR: { name: "MAROUA", ll: [14.32, 10.59] }, NGE: { name: "NGAOUNDÉRÉ", ll: [13.56, 7.36] },
    LBV: { name: "LIBREVILLE", ll: [9.45, 0.39], dir: -1 }, COO: { name: "COTONOU", ll: [2.42, 6.37], dir: 0 },
    BZV: { name: "BRAZZAVILLE", ll: [15.28, -4.27], dir: 1 }, PNR: { name: "POINTE-NOIRE", ll: [11.86, -4.78], dir: -1 },
    NDJ: { name: "N’DJAMENA", ll: [15.04, 12.11], dir: 1 }, BGF: { name: "BANGUI", ll: [18.56, 4.36], dir: 1 },
  };

  function camAt(t) {
    if (t < 17.3) { const e = E.outCubic(prog(t, 16.3, 17.3)); return { R: lerpLog(5600, 4300, e), lon: 12.6, lat: 7.2, cx: 1250, cy: 540 }; }
    if (t < L.pull) { const e = prog(t, 17.3, L.pull); return { R: lerp(4300, 4600, e), lon: lerp(12.6, 12.9, e), lat: 7.2, cx: 1250, cy: 540 }; }
    if (t < L.pull + 0.9) { const e = E.inOutQuart(prog(t, L.pull, L.pull + 0.9)); return { R: lerpLog(4600, 430, e), lon: lerp(12.9, 16, e), lat: lerp(7.2, 6, e), cx: lerp(1250, 1300, e), cy: lerp(540, 560, e) }; }
    if (t < L.push) { const e = prog(t, L.pull + 0.9, L.push); return { R: lerp(430, 455, e), lon: lerp(16, 20, e), lat: 6, cx: 1300, cy: 560 }; }
    if (t < L.push + 0.8) { const e = E.inOutCubic(prog(t, L.push, L.push + 0.8)); return { R: lerpLog(455, 2150, e), lon: lerp(20, 10, e), lat: lerp(6, 3.6, e), cx: lerp(1300, 1330, e), cy: lerp(560, 540, e) }; }
    const e = prog(t, L.push + 0.8, 37);
    return { R: lerp(2150, 2350, e), lon: lerp(10, 10.4, e), lat: 3.6, cx: 1330, cy: 540 };
  }

  // word-by-word caption reveal for one VO sentence
  function caption(text, x, y, font, fill, t0s, t, align = "left") {
    const words = text.split(" ");
    ctx.font = font; let cx = x;
    const total = ctx.measureText(text).width, sp = ctx.measureText(" ").width;
    if (align === "center") cx = x - total / 2;
    words.forEach((w, i) => {
      const k = E.outCubic(prog(t, t0s[i] - 0.05, t0s[i] + 0.35)), ww = ctx.measureText(w).width;
      if (k > 0) { ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = fill; ctx.fillText(w, cx, y + (1 - k) * 26); ctx.restore(); }
      cx += ww + sp;
    });
  }
  function wipeBands(t, t0, d = 0.42) {
    const edge = lerp(-SKEW, W + 3 * WIPE_W + SKEW, E.inOutCubic(prog(t, t0, t0 + d)));
    return { edge, behind: () => { bandPath(-W, edge - 3 * WIPE_W); }, draw: () => [C.green, C.red, C.gold].forEach((col, i) => { bandPath(edge - (i + 1) * WIPE_W, edge - i * WIPE_W + 2); ctx.fillStyle = col; ctx.fill(); }) };
  }
  const WIPE_W = 300, SKEW = 260;
  function bandPath(x0, x1) { ctx.beginPath(); ctx.moveTo(x0 + SKEW, 0); ctx.lineTo(x1 + SKEW, 0); ctx.lineTo(x1 - SKEW * 0.2, H); ctx.lineTo(x0 - SKEW * 0.2, H); ctx.closePath(); }
  function bez(p0, p1, p2, p3, u) { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; }
  // polyline builder from a tiny path language: ["M",x,y] ["L",x,y] ["C",x1,y1,x2,y2,x,y] ["Z"]
  function poly(cmds) {
    const pts = []; let cur = [0, 0], first = null;
    for (const c of cmds) {
      if (c[0] === "M") { cur = [c[1], c[2]]; first = cur; pts.push(cur); }
      else if (c[0] === "L") { cur = [c[1], c[2]]; pts.push(cur); }
      else if (c[0] === "C") { const p0 = cur; for (let i = 1; i <= 14; i++) pts.push(bez(p0, [c[1], c[2]], [c[3], c[4]], [c[5], c[6]], i / 14)); cur = [c[5], c[6]]; }
      else if (c[0] === "Z") pts.push(first);
    }
    return pts;
  }
  const xf = (pts, x, y, s) => pts.map(([a, b]) => [x + a * s, y + b * s]);
  function fillPoly(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
  const circlePts = (cx, cy, r, a0 = -Math.PI / 2, a1 = a0 + TAU, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];

  // ───────────────────────── SC1 · l'étoile ─────────────────────────
  const NIGHT_STARS = STARS;
  function sc1(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#010507"); g.addColorStop(1, "#04170e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const reveal = prog(t, 0.0, 2.2);
    for (const s of NIGHT_STARS) { ctx.globalAlpha = reveal * (0.4 + 0.5 * Math.sin(t * s.sp + s.ph)) ** 2; ctx.fillStyle = "#fff"; ctx.fillRect(s.x, s.y * 0.85, s.s, s.s); }
    ctx.globalAlpha = 1;
    // planet limb rising at the bottom
    const lift = E.outCubic(prog(t, 0.2, 5.5)) * 120;
    ctx.save(); const cy = 2650 - lift;
    const atm = ctx.createRadialGradient(960, cy, 1880, 960, cy, 2120); atm.addColorStop(0, "rgba(71,217,143,0.5)"); atm.addColorStop(0.3, "rgba(71,217,143,0.12)"); atm.addColorStop(1, "rgba(71,217,143,0)");
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(960, cy, 2120, 0, TAU); ctx.fill();
    const pl = ctx.createLinearGradient(0, cy - 1900, 0, cy - 1600); pl.addColorStop(0, "#0b3a26"); pl.addColorStop(1, "#020c07");
    ctx.fillStyle = pl; ctx.beginPath(); ctx.arc(960, cy, 1900, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(160,255,205,0.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(960, cy, 1900, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
    ctx.restore();
    // the star
    const z = E.inExpo(prog(t, L.zoom, L.iris + 0.05));
    const sx = 960, sy = lerp(400, 540, E.inOutCubic(prog(t, 5.8, L.iris))), sr = 120 * Math.exp(z * Math.log(32));
    const rot = -Math.PI / 2 + (1 - E.outExpo(prog(t, L.trace, 2.1))) * 1.1 + z * 0.8;
    const ra = prog(t, 1.5, 1.95) * (1 - 0.6 * prog(t, 2.6, 4));
    if (ra > 0) {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.12); ctx.globalAlpha = ra * 0.45;
      for (let i = 0; i < 20; i++) { ctx.rotate(TAU / 20); const rg = ctx.createLinearGradient(0, 0, 0, -1000); rg.addColorStop(0, "rgba(255,217,112,0.7)"); rg.addColorStop(1, "rgba(255,217,112,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(0, -900 - 400 * hash(i)); ctx.fill(); }
      ctx.restore();
    }
    glowDot(ctx, sx, sy, sr * 3.4, "rgba(249,183,28,0.5)", prog(t, 1.8, 2.0) * (0.85 + 0.15 * beatPulse(t)));
    if (t < 2.05) { ctx.strokeStyle = C.goldL; ctx.lineWidth = 5; ctx.lineJoin = "miter"; tracePolyline(ctx, starPoints(sx, sy, sr, rot), E.inOutCubic(prog(t, L.trace, 1.9))); }
    const fill = prog(t, 1.88, 1.98);
    if (fill > 0) { starPath(ctx, sx, sy, sr * lerp(1.25, 1, E.outBack(fill)), rot); ctx.fillStyle = C.gold; ctx.fill(); }
    const sw = prog(t, L.ignite, L.ignite + 0.8);
    if (sw > 0 && sw < 1) { ring(ctx, sx, sy, 60 + E.outCubic(sw) * 760, 24 * (1 - sw), "#ffe9a8", 1 - sw); ring(ctx, sx, sy, 30 + E.outCubic(sw) * 460, 3, "#fff", 1 - sw); }
    // VO captions
    const cap = 1 - prog(t, 5.9, 6.3);
    if (cap > 0) {
      ctx.save(); ctx.globalAlpha = cap;
      caption("Au cœur de l’Afrique,", 960, 770, `600 italic 64px ${PLAY}`, "#fff", [2.30, 2.56, 2.85, 2.98], t, "center");
      caption("une étoile veille sur notre ciel", 960, 860, `700 italic 76px ${PLAY}`, C.goldL, [3.63, 3.87, 4.30, 4.63, 4.88, 5.25], t, "center");
      ctx.restore();
    }
  }

  // ───────────────────────── SC2 · depuis 2011 ─────────────────────────
  function odometer(digits, cx, y, font, t0, t) {
    ctx.font = font; const dw = ctx.measureText("0").width * 1.02, h = parseInt(font.split(" ")[1]) * 0.86;
    const x0 = cx - (digits.length * dw) / 2;
    digits.split("").forEach((d, i) => {
      const target = +d + 10 * (3 + i), v = lerp(0, target, E.outExpo(prog(t, t0 + i * 0.09, t0 + 1.1 + i * 0.09))), base = Math.floor(v), f = v - base;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + i * dw - 4, y - h - 6, dw + 8, h + 30); ctx.clip();
      ctx.textAlign = "center"; ctx.fillStyle = "#fff";
      ctx.fillText(String(base % 10), x0 + i * dw + dw / 2, y + f * (h + 30));
      ctx.fillText(String((base + 1) % 10), x0 + i * dw + dw / 2, y + (f - 1) * (h + 30));
      ctx.restore();
    });
  }
  function iconCity(x, y, k) {
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.lineJoin = "round";
    const B = [[-130, 70, 50], [-75, 130, 44], [-25, 175, 52], [33, 110, 46], [85, 150, 40], [130, 90, 36]];
    B.forEach(([bx, bh, bw], i) => tracePolyline(ctx, rectPts(x + bx - bw / 2, y + 90 - bh, bw, bh), prog(k, i * 0.08, 0.5 + i * 0.08)));
    ctx.fillStyle = C.goldL; B.forEach(([bx, bh, bw], i) => { for (let r = 0; r < bh / 34 - 1; r++) if (prog(k, 0.6 + i * 0.05, 0.8 + i * 0.05) > hash(i * 9 + r)) ctx.fillRect(x + bx - 8, y + 90 - bh + 20 + r * 30, 16, 10); });
    ctx.strokeStyle = C.gold; tracePolyline(ctx, [[x - 180, y + 92], [x + 180, y + 92]], prog(k, 0, 0.4));
    ctx.restore();
  }
  function iconFamily(x, y, k) {
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.lineCap = "round";
    const P3 = [[-80, 0, 34], [50, 4, 30], [-12, 40, 22]];
    P3.forEach(([px, py, r], i) => {
      const kk = prog(k, i * 0.15, 0.6 + i * 0.15);
      tracePolyline(ctx, circlePts(x + px, y - 40 + py, r), kk);
      tracePolyline(ctx, circlePts(x + px, y + 60 + py + r * 1.6, r * 2.1, Math.PI * 1.05, Math.PI * 1.95, 30), kk);
    });
    // heart
    const hk = E.outBack(prog(k, 0.7, 1), 2.5);
    if (hk > 0) { ctx.save(); ctx.translate(x + 120, y - 90); ctx.scale(hk, hk); ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-26, -6, -14, -26, 0, -12); ctx.bezierCurveTo(14, -26, 26, -6, 0, 14); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function iconDream(x, y, k, t) {
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    tracePolyline(ctx, starPoints(x, y - 10, 80, -Math.PI / 2 + 0.1), prog(k, 0, 0.6));
    const fk = prog(k, 0.55, 0.8); if (fk > 0) { starPath(ctx, x, y - 10, 80, -Math.PI / 2 + 0.1); ctx.fillStyle = `rgba(249,183,28,${fk})`; ctx.fill(); }
    ctx.setLineDash([3, 10]); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2.5;
    tracePolyline(ctx, circlePts(x, y - 10, 140, Math.PI * 0.85, Math.PI * 2.15, 50), prog(k, 0.2, 0.8)); ctx.setLineDash([]);
    const pa = lerp(Math.PI * 0.85, Math.PI * 2.15, E.inOutCubic(prog(k, 0.3, 1)) * 0.92 + 0.04 * Math.sin(t));
    if (prog(k, 0.3, 1) > 0) plane(ctx, x + Math.cos(pa) * 140, y - 10 + Math.sin(pa) * 140, pa + Math.PI / 2, 0.55, "#fff");
    ctx.restore();
  }
  function sc2(t) {
    const g = ctx.createRadialGradient(960, 480, 60, 960, 540, 1250); g.addColorStop(0, "#0e4d31"); g.addColorStop(0.6, "#062a1b"); g.addColorStop(1, "#020d07");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.07; starPath(ctx, 960, 560, 1000 + (t - 7) * 20, -Math.PI / 2 + (t - 7) * 0.03); ctx.strokeStyle = C.goldL; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    // part 1: year
    const up = E.inCubic(prog(t, 12.35, 12.85));
    if (up < 1) {
      ctx.save(); ctx.globalAlpha = 1 - up; ctx.translate(0, -up * 260);
      ctx.font = `500 30px ${MONO}`; ctx.letterSpacing = "18px"; ctx.textAlign = "center"; ctx.fillStyle = C.gold;
      ctx.fillText(scramble("DEPUIS", prog(t, L.depuis, L.depuis + 0.4), 3, t), 969, 270); ctx.letterSpacing = "0px"; ctx.textAlign = "left";
      odometer("2011", 960, 600, `900 340px ${MONT}`, L.depuis + 0.05, t);
      maskLine(ctx, E.outExpo(prog(t, L.camair - 0.05, L.camair + 0.45)), 560, 735, 80, 800, () => {
        const w = textWidth(ctx, "CAMAIR-CO", `900 70px ${MONT}`, 10);
        starPath(ctx, 960 - w / 2 - 34, 708, 20); ctx.fillStyle = C.gold; ctx.fill();
        ctx.font = `900 70px ${MONT}`; ctx.letterSpacing = "10px"; ctx.fillStyle = "#fff"; ctx.fillText("CAMAIR-CO", 960 - w / 2 + 6, 735); ctx.letterSpacing = "0px";
      });
      const ck = prog(t, L.compagnie, L.compagnie + 1.3);
      ctx.font = `500 30px ${MONO}`; ctx.letterSpacing = "9px"; ctx.textAlign = "center"; ctx.fillStyle = C.goldL;
      ctx.fillText("COMPAGNIE AÉRIENNE NATIONALE".slice(0, Math.ceil(28 * ck)), 964, 815); ctx.letterSpacing = "0px"; ctx.textAlign = "left";
      const bk = E.outExpo(prog(t, L.nationale, L.nationale + 0.6)); if (bk > 0) { const bw = 640 * bk; [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(960 - bw / 2 + (i * bw) / 3, 848, bw / 3 + 0.5, 7); }); }
      ctx.restore();
    }
    // part 2: villes · familles · rêves
    const cols = [[420, "LES VILLES", L.villes, iconCity], [960, "LES FAMILLES", L.familles, iconFamily], [1500, "ET LES RÊVES", L.reves, iconDream]];
    const out2 = E.inCubic(prog(t, L.s2out, L.s2out + 0.45));
    cols.forEach(([x, label, t0, icon], i) => {
      const k = prog(t, t0 - 0.15, t0 + 0.9); if (k <= 0) return;
      ctx.save();
      if (i < 2) { ctx.globalAlpha = 1 - out2; ctx.translate(0, out2 * 120); }
      if (i < 2 || t < L.s2out) icon(x, 470, k, t);
      ctx.globalAlpha *= i === 2 ? 1 - out2 : 1;
      maskLine(ctx, E.outExpo(prog(t, t0 - 0.05, t0 + 0.45)), x - 260, 720, 66, 520, () => { ctx.font = `900 58px ${MONT}`; ctx.textAlign = "center"; ctx.fillStyle = i === 2 ? C.goldL : "#fff"; ctx.fillText(label, x, 720); ctx.textAlign = "left"; });
      ctx.restore();
    });
  }

  // ───────────────────────── SC3 · réseau national ─────────────────────────
  function sc3(t) {
    const dla = P(CITY.DLA.ll), nsi = P(CITY.NSI.ll);
    const veil = 1 - E.outCubic(prog(t, 16.35, 17.0));
    if (veil > 0) { ctx.fillStyle = `rgba(2,12,7,${veil})`; ctx.fillRect(0, 0, W, H); }
    const ex = (i) => E.inCubic(prog(t, L.pull - 0.1 + i * 0.05, L.pull + 0.25 + i * 0.05));
    const lg = ctx.createLinearGradient(0, 0, 1000, 0); lg.addColorStop(0, "rgba(2,12,7,0.9)"); lg.addColorStop(1, "rgba(2,12,7,0)");
    ctx.save(); ctx.globalAlpha = 1 - ex(0); ctx.fillStyle = lg; ctx.fillRect(0, 0, 1000, H); ctx.restore();
    // Cameroon outline trace
    const kt = E.inOutCubic(prog(t, 16.9, 18.2));
    if (kt > 0 && t < L.pull + 0.4) { ctx.save(); ctx.globalAlpha = 1 - prog(t, L.pull, L.pull + 0.3); ctx.strokeStyle = C.goldL; ctx.lineWidth = 3.2; ctx.lineJoin = "round"; ctx.shadowColor = "rgba(249,183,28,0.8)"; ctx.shadowBlur = 14; tracePolyline(ctx, cmrRing.map(P), kt); ctx.restore(); }
    // routes
    const fade = 1 - prog(t, L.pull + 0.1, L.pull + 0.45);
    if (fade > 0) {
      ctx.save(); ctx.globalAlpha = fade;
      const R3 = [["DLA", "NSI", L.yaounde - 0.1, 0.45, 0.35], ["DLA", "GOU", L.garoua - 0.62, 0.62, 0.2], ["NSI", "MVR", L.maroua - 0.62, 0.62, 0.2], ["NSI", "NGE", L.ngaoundere - 0.55, 0.55, 0.28]];
      for (const [a, b, t0, d, bow] of R3) if (t > t0) drawRoute(routePts(CITY[a].ll, CITY[b].ll, 40, bow), E.inOutCubic(prog(t, t0, t0 + d)), C.goldL, 3, b !== "NSI", 0.22);
      pin(nsi[0], nsi[1], L.yaounde + 0.3, t);
      for (const [c, t0] of [["GOU", L.garoua], ["MVR", L.maroua], ["NGE", L.ngaoundere]]) { const q = P(CITY[c].ll); pin(q[0], q[1], t0, t); const k = prog(t, t0 + 0.05, t0 + 0.35); if (k > 0) { ctx.save(); ctx.globalAlpha *= k; ctx.font = `700 24px ${MONO}`; ctx.fillStyle = "#fff"; ctx.fillText(c, q[0] + 24, q[1] + 8); ctx.restore(); } }
      ctx.font = `700 24px ${MONO}`; ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.fillText("DLA", dla[0] - 36, dla[1] + 8); ctx.fillText("NSI", nsi[0] - 24, nsi[1] + 34); ctx.textAlign = "left";
      // hub star
      const hq = ((t - 16) % 1.2) / 1.2; ring(ctx, dla[0], dla[1], 22 + hq * 50, 2, C.gold, 1 - hq);
      ctx.restore();
    }
    // left board
    ctx.save();
    const lab = (s, y, t0, i) => { ctx.save(); ctx.globalAlpha = (1 - ex(i)) * prog(t, t0, t0 + 0.1); ctx.font = `500 26px ${MONO}`; ctx.letterSpacing = "10px"; ctx.fillStyle = C.gold; ctx.fillText(scramble(s, prog(t, t0, t0 + 0.45), y, t), 150 - ex(i) * 300, y); ctx.restore(); };
    lab("AU DÉPART DE", 268, L.au3, 0); lab("VERS", 530, L.envolez, 2);
    const rows = [["DLA", "DOUALA", L.douala, 340, 1], ["NSI", "YAOUNDÉ", L.yaounde, 440, 1], ["GOU", "GAROUA", L.garoua, 610, 3], ["MVR", "MAROUA", L.maroua, 710, 4], ["NGE", "NGAOUNDÉRÉ", L.ngaoundere, 810, 5]];
    ctx.save(); ctx.globalAlpha = 1 - ex(0); ctx.fillStyle = C.gold; ctx.fillRect(118, 240, 3, lerp(0, 600, E.outCubic(prog(t, L.au3, L.ngaoundere + 0.4)))); ctx.restore();
    rows.forEach(([code, name, t0, y, ei], i) => {
      const k = E.outExpo(prog(t, t0 - 0.06, t0 + 0.45)); if (k <= 0) return;
      const ext = ex(ei); ctx.save(); ctx.globalAlpha = 1 - ext; ctx.translate(-ext * 500, 0);
      const bk = E.outBack(prog(t, t0 - 0.08, t0 + 0.3), 2.5);
      ctx.save(); ctx.translate(200, y - 26); ctx.scale(bk, bk); rr(ctx, -50, -26, 100, 52, 8); ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = "rgba(249,183,28,0.12)"; ctx.fill();
      ctx.font = `700 30px ${MONO}`; ctx.fillStyle = C.gold; ctx.textAlign = "center"; ctx.fillText(scramble(code, prog(t, t0, t0 + 0.35), i * 9, t), 0, 11); ctx.restore();
      maskLine(ctx, k, 275, y, 76, 700, () => letters(ctx, name, 275, y, { font: `900 72px ${MONT}`, spacing: 2, fill: i < 2 ? "#fff" : C.goldL, each: (j) => ({ dy: (1 - E.outExpo(prog(t, t0 + j * 0.025, t0 + 0.4 + j * 0.025))) * 30 }) }));
      ctx.restore();
    });
    ctx.restore();
  }

  // ───────────────────────── SC4 · ciel d'Afrique + routes régionales ─────────────────────────
  const ROUTES = [["LBV", L.lbv, 0.55], ["COO", L.coo, 0.6], ["BZV", L.bzv, 0.55], ["PNR", L.pnr, 0.5], ["NDJ", L.ndj, 0.55], ["BGF", L.bgf, 0.5]];
  const FLAPS = [["DLA", 0], ["LBV", L.lbv], ["COO", L.coo], ["BZV", L.bzv], ["PNR", L.pnr], ["NDJ", L.ndj], ["BGF", L.bgf]];
  function sc4(t) {
    // space typography
    if (t > 24.6 && t < 30.2) {
      const P0 = [480, 1150], P1 = [960, 760], P2 = [1500, 300], P3 = [2250, 140];
      const u = E.inOutCubic(prog(t, 26.0, 28.6));
      if (u > 0 && u < 1) {
        const tail = Math.max(0, u - 0.28); ctx.save(); ctx.lineCap = "round";
        for (const off of [-1, 1]) { let prev = null; for (let i = 0; i <= 40; i++) { const uu = lerp(tail, u, i / 40), pt = bez(P0, P1, P2, P3, uu), nx = bez(P0, P1, P2, P3, Math.min(1, uu + 0.001)), a = Math.atan2(nx[1] - pt[1], nx[0] - pt[0]), sc = lerp(1, 1.6, uu);
          const q = [pt[0] + Math.cos(a + Math.PI / 2) * off * 20 * sc - Math.cos(a) * 18 * sc, pt[1] + Math.sin(a + Math.PI / 2) * off * 20 * sc - Math.sin(a) * 18 * sc];
          if (prev) { ctx.globalAlpha = (i / 40) ** 1.5 * 0.75; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 + 5 * (1 - i / 40); ctx.beginPath(); ctx.moveTo(...prev); ctx.lineTo(...q); ctx.stroke(); } prev = q; } }
        ctx.restore();
        const pt = bez(P0, P1, P2, P3, u), nx = bez(P0, P1, P2, P3, Math.min(1, u + 0.002));
        plane(ctx, pt[0], pt[1], Math.atan2(nx[1] - pt[1], nx[0] - pt[0]), lerp(1.15, 1.8, u), "#fff", 26);
      }
      const k1 = prog(t, L.audela - 0.05, L.audela + 0.4), o1 = E.inCubic(prog(t, 26.75, 27.05));
      if (k1 > 0 && o1 < 1) {
        ctx.save(); ctx.globalAlpha = 1 - o1; ctx.translate(0, -o1 * 60);
        caption("Et au-delà", 150, 500, `700 italic 110px ${PLAY}`, "#fff", [L.audela, 25.51], t);
        caption("des frontières,", 150, 630, `700 italic 110px ${PLAY}`, C.goldL, [25.95, L.frontieres], t);
        ctx.restore();
      }
      const ex = (i) => E.inCubic(prog(t, L.push - 0.12 + i * 0.04, L.push + 0.13 + i * 0.04));
      const k0 = prog(t, L.camair2, L.camair2 + 0.5);
      if (k0 > 0) { ctx.save(); ctx.globalAlpha = 1 - ex(0); ctx.translate(-ex(0) * 400, 0); starPath(ctx, 166, 318, 15 * E.outBack(prog(t, L.camair2, L.camair2 + 0.3), 3)); ctx.fillStyle = C.gold; ctx.fill(); ctx.font = `700 30px ${MONO}`; ctx.letterSpacing = "12px"; ctx.fillStyle = C.gold; ctx.fillText(scramble("CAMAIR-CO", k0, 11, t), 196, 329); ctx.letterSpacing = "0px"; ctx.restore(); }
      ctx.save(); ctx.globalAlpha = 1 - ex(1); ctx.translate(-ex(1) * 600, 0);
      maskLine(ctx, E.outExpo(prog(t, L.vous - 0.08, L.vous + 0.45)), 150, 450, 92, 600, () => { ctx.font = `600 italic 84px ${PLAY}`; ctx.fillStyle = "#fff"; ctx.fillText("vous ouvre", 150, 450); });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 1 - ex(2); ctx.translate(-ex(2) * 800, 0);
      letters(ctx, "LE CIEL", 146, 630, { font: `900 172px ${MONT}`, spacing: 4, fill: "#fff", each: (i) => { const k = prog(t, L.ciel2 - 0.06 + i * 0.04, L.ciel2 + 0.38 + i * 0.04); return { alpha: clamp(k * 3), dy: (1 - E.outBack(k, 2)) * -140, rot: (1 - E.outCubic(k)) * -0.25 }; } });
      ctx.restore();
      const ka = prog(t, L.afrique - 0.04, L.afrique + 0.5);
      if (ka > 0) {
        ctx.save(); ctx.globalAlpha = 1 - ex(3); ctx.translate(-ex(3) * 1000, 0);
        const wa = textWidth(ctx, "D’AFRIQUE", `900 160px ${MONT}`, 4), edge = 146 + E.inOutCubic(ka) * (wa + 60);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 640, edge, 220); ctx.clip();
        const g = ctx.createLinearGradient(146, 680, 146 + wa, 800); g.addColorStop(0, C.goldL); g.addColorStop(0.55, C.gold); g.addColorStop(1, "#f08a1c");
        ctx.font = `900 160px ${MONT}`; ctx.letterSpacing = "4px"; ctx.fillStyle = g; ctx.fillText("D’AFRIQUE", 146, 805); ctx.letterSpacing = "0px"; ctx.restore();
        if (ka < 1) { const lg = ctx.createLinearGradient(edge - 60, 0, edge + 6, 0); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(255,250,230,0.95)"); ctx.fillStyle = lg; ctx.fillRect(edge - 60, 650, 66, 190); }
        ctx.restore();
      }
    }
    if (t < L.push - 0.1) return;
    // route map
    const inK = E.outCubic(prog(t, L.push + 0.15, L.push + 0.6));
    const lg = ctx.createLinearGradient(0, 0, 900, 0); lg.addColorStop(0, "rgba(2,12,7,0.92)"); lg.addColorStop(1, "rgba(2,12,7,0)");
    ctx.save(); ctx.globalAlpha = inK; ctx.fillStyle = lg; ctx.fillRect(0, 0, 900, H); ctx.restore();
    const dla = P(CITY.DLA.ll);
    for (const [code, t0, d] of ROUTES) {
      if (t < t0) continue;
      const k = E.inOutCubic(prog(t, t0, t0 + d)), dest = CITY[code], q = P(dest.ll);
      drawRoute(routePts(CITY.DLA.ll, dest.ll, 48, 0.18), k, C.goldL, 3, true, 0.22);
      pin(q[0], q[1], t0 + d - 0.05, t); mapLabel(q[0], q[1], code, dest.name, dest.dir, t0 + d - 0.02, t);
    }
    for (const c of ["NSI", "GOU", "MVR", "NGE"]) { const q = P(CITY[c].ll); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, TAU); ctx.fill(); }
    const hq = ((t - 5) % 1.2) / 1.2; ring(ctx, dla[0], dla[1], 18 + hq * 46, 2, C.gold, 1 - hq);
    glowDot(ctx, dla[0], dla[1], 46, "rgba(249,183,28,0.5)");
    starPath(ctx, dla[0], dla[1], 17, -Math.PI / 2 + Math.sin(t * 2) * 0.1); ctx.fillStyle = C.gold; ctx.fill();
    ctx.save(); ctx.globalAlpha = inK * 0.5; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    for (const [x, y, sx, sy] of [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * 44); ctx.lineTo(x, y); ctx.lineTo(x + sx * 44, y); ctx.stroke(); }
    const curF = FLAPS.filter((f) => t >= f[1]).pop(), ll = CITY[curF[0]].ll;
    ctx.font = `500 18px ${MONO}`; ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.letterSpacing = "4px";
    ctx.fillText(scramble(`${Math.abs(ll[1]).toFixed(2)}°${ll[1] >= 0 ? "N" : "S"}  ${ll[0].toFixed(2)}°E`, prog(t, curF[1], curF[1] + 0.4), 5, t), W - 80, 92);
    ctx.textAlign = "left"; ctx.fillText("QC · RÉSEAU RÉGIONAL", 80, H - 76); ctx.letterSpacing = "0px"; ctx.restore();
    ctx.save(); ctx.globalAlpha = inK; ctx.translate((1 - inK) * -120, 0);
    ctx.font = `500 24px ${MONO}`; ctx.letterSpacing = "6px"; ctx.fillStyle = C.gold;
    ctx.fillText(scramble("VOLS AU DÉPART DE DOUALA", prog(t, L.push + 0.15, L.push + 0.7), 21, t), 140, 262); ctx.letterSpacing = "0px";
    const idx = FLAPS.indexOf(curF), prev = idx > 0 ? FLAPS[idx - 1][0] : "DLA";
    for (let i = 0; i < 3; i++) { const seq = idx > 0 ? flapSeq(prev[i], curF[0][i], curF[1] * 10 + i) : [curF[0][i]]; flapCell(140 + i * 164, 296, 150, 196, seq, curF[1] + i * 0.06, t, `700 150px ${MONO}`, i === 1 ? C.goldL : "#fff"); }
    const name = CITY[curF[0]].name, k = E.outExpo(prog(t, curF[1], curF[1] + 0.45)), prevName = idx > 0 ? CITY[prev].name : "";
    ctx.save(); ctx.beginPath(); ctx.rect(120, 520, 780, 110); ctx.clip();
    if (prevName && k < 1) { ctx.save(); ctx.font = `900 72px ${MONT}`; ctx.fillStyle = "#fff"; ctx.globalAlpha *= 1 - k; ctx.fillText(prevName, 140, 606 - k * 100); ctx.restore(); }
    letters(ctx, name, 140, 606 + (1 - k) * 100, { font: `900 72px ${MONT}`, spacing: 1, fill: "#fff" });
    ctx.restore();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = t >= FLAPS[i + 1][1] ? C.gold : "rgba(255,255,255,0.18)"; ctx.fillRect(140 + i * 46, 660, 36, 5); }
    ctx.restore();
  }

  // ───────────────────────── SC5 · flotte (blueprint) ─────────────────────────
  const B737 = [
    poly([["M", 40, -24], ["L", 150, -50], ["L", 860, -50], ["C", 935, -50, 985, -24, 1000, 6], ["C", 988, 32, 955, 46, 895, 50], ["L", 170, 50], ["C", 110, 47, 62, 22, 40, -24], ["Z"]]),
    poly([["M", 178, -50], ["L", 92, -222], ["L", 44, -222], ["L", 68, -36]]),
    poly([["M", 30, -12], ["L", 150, -16], ["L", 120, -2], ["L", 22, 2], ["Z"]]),
    poly([["M", 420, 36], ["L", 590, 36], ["L", 512, 58], ["L", 330, 64], ["Z"]]),
    poly([["M", 470, 56], ["L", 600, 56], ["C", 615, 56, 618, 98, 600, 98], ["L", 480, 98], ["C", 455, 98, 455, 56, 470, 56], ["Z"]]),
    poly([["M", 905, -30], ["L", 948, -30], ["L", 962, -16], ["L", 912, -16], ["Z"]]),
  ];
  const Q400 = [
    poly([["M", 36, -10], ["L", 130, -46], ["L", 880, -46], ["C", 940, -46, 982, -24, 1000, 4], ["C", 988, 28, 958, 42, 900, 44], ["L", 150, 44], ["C", 96, 42, 58, 22, 36, -10], ["Z"]]),
    poly([["M", 175, -46], ["L", 78, -232], ["L", 30, -232], ["L", 56, -26]]),
    poly([["M", 6, -238], ["L", 140, -238], ["L", 118, -226], ["L", 12, -226], ["Z"]]),
    poly([["M", 420, -46], ["L", 610, -46], ["L", 596, -60], ["L", 432, -60], ["Z"]]),
    poly([["M", 520, -60], ["L", 668, -60], ["C", 690, -60, 690, -18, 668, -18], ["L", 540, -18], ["C", 515, -20, 505, -60, 520, -60], ["Z"]]),
    poly([["M", 908, -28], ["L", 950, -28], ["L", 964, -14], ["L", 914, -14], ["Z"]]),
  ];
  function aircraft(parts, x, y, s, k, fillA, col, windows, prop, t) {
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (fillA > 0) { ctx.fillStyle = `rgba(110,255,190,${0.1 * fillA})`; fillPoly(xf(parts[0], x, y, s)); }
    parts.forEach((p, i) => { ctx.strokeStyle = col; ctx.lineWidth = i ? 2 : 2.6; tracePolyline(ctx, xf(p, x, y, s), prog(k, i * 0.07, 0.62 + i * 0.07)); });
    const wk = prog(k, 0.55, 0.95);
    if (wk > 0) { ctx.fillStyle = col; const [w0, w1, wy, gap] = windows; for (let wx = w0; wx < w0 + (w1 - w0) * wk; wx += gap) { rr(ctx, x + wx * s - 3, y + wy * s - 5, 6, 10, 3); ctx.fill(); } }
    if (prop && k > 0.6) {
      const px = x + 672 * s, py = y - 39 * s, R = 95 * s, a = prog(k, 0.6, 0.9);
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(px, py, 7 * s, R, 0, 0, TAU); ctx.globalAlpha = a * 0.25; ctx.stroke(); ctx.globalAlpha = a;
      for (let b = 0; b < 6; b++) { const th = t * 22 + (b * TAU) / 6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(th) * 6 * s, py - Math.cos(th) * R); ctx.stroke(); }
    }
    ctx.restore();
  }
  function dimLine(x0, x1, y, k, label) {
    if (k <= 0) return;
    ctx.save(); ctx.strokeStyle = "rgba(200,255,230,0.55)"; ctx.fillStyle = "rgba(200,255,230,0.75)"; ctx.lineWidth = 1.5;
    const xm = (x0 + x1) / 2, h = ((x1 - x0) / 2) * E.outCubic(k);
    ctx.beginPath(); ctx.moveTo(xm - h, y); ctx.lineTo(xm + h, y); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(xm + s * h, y - 12); ctx.lineTo(xm + s * h, y + 12); ctx.stroke(); }
    ctx.font = `500 18px ${MONO}`; ctx.letterSpacing = "5px"; ctx.textAlign = "center"; ctx.globalAlpha = prog(k, 0.6, 1); ctx.fillStyle = "#04211a"; const tw = ctx.measureText(label).width + 30; ctx.fillRect(xm - tw / 2, y - 14, tw, 28); ctx.fillStyle = "rgba(200,255,230,0.85)"; ctx.fillText(label, xm + 3, y + 6);
    ctx.textAlign = "left"; ctx.letterSpacing = "0px"; ctx.restore();
  }
  const SHIELD = poly([["M", 0, -130], ["C", 50, -100, 95, -100, 120, -104], ["L", 120, 0], ["C", 120, 85, 62, 135, 0, 165], ["C", -62, 135, -120, 85, -120, 0], ["L", -120, -104], ["C", -95, -100, -50, -100, 0, -130], ["Z"]]);
  function sc5(t) {
    const g = ctx.createRadialGradient(960, 540, 100, 960, 540, 1200); g.addColorStop(0, "#0a3a2c"); g.addColorStop(1, "#03190f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const off = (t * 12) % 40;
    ctx.fillStyle = "rgba(150,255,210,0.05)"; for (let x = -off; x < W; x += 40) ctx.fillRect(x, 0, 1, H); for (let y = -off; y < H; y += 40) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = "rgba(150,255,210,0.09)"; for (let x = -off; x < W; x += 200) ctx.fillRect(x, 0, 2, H); for (let y = -off; y < H; y += 200) ctx.fillRect(0, y, W, 2);
    ctx.save(); ctx.font = `500 18px ${MONO}`; ctx.letterSpacing = "5px"; ctx.fillStyle = "rgba(200,255,230,0.55)";
    ctx.fillText(scramble("CAMAIR-CO · FLOTTE", prog(t, 37.0, 37.6), 31, t), 80, 92); ctx.textAlign = "right"; ctx.fillText(`PLANCHE ${t < L.priorite ? "01" : "02"} · QC`, W - 80, 92);
    ctx.fillText("ÉCHELLE LIBRE", W - 80, H - 76); ctx.textAlign = "left"; ctx.letterSpacing = "0px"; ctx.restore();
    const line = "#c9ffe6";
    const shrink = E.inOutCubic(prog(t, L.dash - 0.35, L.dash + 0.25));
    const dimAll = E.inOutCubic(prog(t, L.priorite - 0.2, L.priorite + 0.4));
    // Boeing 737
    const k1 = prog(t, L.bord, L.bord + 1.7);
    if (k1 > 0) {
      const s = lerp(1.2, 0.74, shrink), x = lerp(360, 160, shrink), y = lerp(600, 420, shrink);
      ctx.save(); ctx.globalAlpha = 1 - 0.93 * dimAll;
      aircraft(B737, x, y, s, k1, prog(t, L.bord + 1.4, L.bord + 2.0), line, [210, 840, -18, 19], false, t);
      dimLine(x, x + 1000 * s, y + 130 * s, prog(t, L.bord + 0.9, L.bord + 1.5) * (1 - shrink), "MOYEN-COURRIER · JET");
      const lk = prog(t, L.boeing - 0.05, L.boeing + 0.5);
      const fs = Math.round(lerp(110, 64, shrink)), bw = textWidth(ctx, "BOEING 737", `900 ${fs}px ${MONT}`, 4);
      letters(ctx, "BOEING 737", lerp(960 - bw / 2, 160, shrink), lerp(300, 205, shrink), { font: `900 ${fs}px ${MONT}`, spacing: 4, fill: "#fff", each: (i) => { const kk = prog(lk, i * 0.06, 0.5 + i * 0.06); return { alpha: kk, dy: (1 - E.outCubic(kk)) * 30 }; } });
      ctx.restore();
    }
    // Dash 8 Q400
    const k2 = prog(t, L.dash - 0.1, L.dash + 1.6);
    if (k2 > 0) {
      ctx.save(); ctx.globalAlpha = 1 - 0.93 * dimAll;
      aircraft(Q400, 960, 800, 0.74, k2, prog(t, L.dash + 1.3, L.dash + 1.9), line, [190, 840, -10, 23], true, t);
      const lk = prog(t, L.dash, L.q400 + 0.5);
      letters(ctx, "DASH 8 Q400", 960, 610, { font: `900 64px ${MONT}`, spacing: 4, fill: C.goldL, each: (i) => { const kk = prog(lk, i * 0.05, 0.4 + i * 0.05); return { alpha: kk, dy: (1 - E.outCubic(kk)) * 30 }; } });
      const tk = prog(t, L.q400, L.q400 + 0.6); ctx.font = `500 20px ${MONO}`; ctx.letterSpacing = "5px"; ctx.fillStyle = "rgba(200,255,230,0.8)"; ctx.fillText("TURBOPROPULSEUR · RÉGIONAL".slice(0, Math.ceil(26 * tk)), 964, 650); ctx.letterSpacing = "0px";
      const tk2 = prog(t, L.dash + 0.2, L.dash + 0.8); ctx.fillText("JET · MOYEN-COURRIER".slice(0, Math.ceil(20 * tk2)), 164, 245);
      ctx.restore();
    }
    // safety
    if (t > L.priorite - 0.3) {
      const sx = 960, sy = 470, sk = prog(t, L.priorite - 0.1, L.priorite + 0.8);
      ctx.save(); ctx.globalAlpha = clamp(dimAll * 2) * (1 - prog(t, L.s5out, L.s5out + 0.3));
      ctx.fillStyle = "rgba(3,25,15,0.55)"; ctx.fillRect(0, 0, W, H);
      for (let j = 0; j < 3; j++) { const q = ((t - L.priorite + j * 0.6) % 1.8) / 1.8; if (t > L.priorite) ring(ctx, sx, sy, 170 + q * 330, 2, line, (1 - q) * 0.6); }
      ctx.strokeStyle = C.goldL; ctx.lineWidth = 6; ctx.lineJoin = "round"; tracePolyline(ctx, xf(SHIELD, sx, sy, 1.15), E.inOutCubic(sk));
      const fk = prog(t, L.priorite + 0.6, L.priorite + 1.0); if (fk > 0) { ctx.fillStyle = `rgba(249,183,28,${0.18 * fk})`; fillPoly(xf(SHIELD, sx, sy, 1.15)); }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 14; ctx.lineCap = "round"; tracePolyline(ctx, [[sx - 52, sy + 8], [sx - 12, sy + 50], [sx + 62, sy - 40]], E.outCubic(prog(t, L.votre, L.votre + 0.45)));
      ctx.font = `500 26px ${MONO}`; ctx.letterSpacing = "12px"; ctx.textAlign = "center"; ctx.fillStyle = C.gold; ctx.fillText(scramble("UNE PRIORITÉ", prog(t, L.priorite, L.priorite + 0.5), 41, t), 966, 250);
      ctx.letterSpacing = "0px"; ctx.textAlign = "left";
      letters(ctx, "VOTRE SÉCURITÉ", 960, 790, { font: `900 104px ${MONT}`, spacing: 4, align: "center", fill: "#fff", each: (i, n) => { const kk = prog(t, L.votre + Math.abs(i - n / 2) * 0.03, L.votre + 0.45 + Math.abs(i - n / 2) * 0.03); return { alpha: kk, scale: lerp(1.6, 1, E.outCubic(kk)) }; } });
      ctx.restore();
    }
  }

  // ───────────────────────── SC6 · Star Miles ─────────────────────────
  const fmtMiles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  function milesCard(t, x, y, s, flip, backCream) {
    const cw = 780, ch = 480;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * Math.abs(flip), s); ctx.rotate(Math.sin(t * 0.8) * 0.012);
    ctx.save(); ctx.translate(14, 30); rr(ctx, -cw / 2, -ch / 2, cw, ch, 34); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill(); ctx.restore();
    rr(ctx, -cw / 2, -ch / 2, cw, ch, 34); ctx.save(); ctx.clip();
    if (flip < 0 || backCream) { ctx.fillStyle = C.cream; ctx.fillRect(-cw / 2, -ch / 2, cw, ch); ctx.globalAlpha = 0.08; starPath(ctx, 0, 0, 180); ctx.fillStyle = C.ink; ctx.fill(); ctx.restore(); ctx.restore(); return; }
    const g = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2); g.addColorStop(0, "#14915a"); g.addColorStop(0.55, "#0a5133"); g.addColorStop(1, "#04291a");
    ctx.fillStyle = g; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.globalAlpha = 0.12; starPath(ctx, 250, 40, 330, -Math.PI / 2 + 0.2); ctx.fillStyle = C.goldL; ctx.fill(); ctx.globalAlpha = 1;
    [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(-cw / 2, ch / 2 - 18 + i * 6, cw, 6); });
    // sheen
    const shx = lerp(-900, 900, prog(t, L.star + 0.2, L.star + 1.2)); const sg = ctx.createLinearGradient(shx - 140, 0, shx + 140, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,255,255,0.22)"); sg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = sg; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    starPath(ctx, -cw / 2 + 64, -ch / 2 + 70, 26); ctx.fillStyle = C.gold; ctx.fill();
    ctx.font = `900 50px ${MONT}`; ctx.letterSpacing = "6px"; ctx.fillStyle = "#fff"; ctx.fillText("STAR MILES", -cw / 2 + 104, -ch / 2 + 88); ctx.letterSpacing = "0px";
    ctx.font = `700 18px ${MONO}`; ctx.letterSpacing = "5px"; ctx.fillStyle = C.goldL; ctx.textAlign = "right"; ctx.fillText("CAMAIR-CO", cw / 2 - 40, -ch / 2 + 82); ctx.textAlign = "left";
    // chip
    rr(ctx, -cw / 2 + 50, -40, 90, 66, 10); const cg = ctx.createLinearGradient(-cw / 2 + 50, -40, -cw / 2 + 140, 26); cg.addColorStop(0, "#ffe7a0"); cg.addColorStop(1, "#c8901a"); ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = "rgba(90,60,0,0.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-cw / 2 + 95, -40); ctx.lineTo(-cw / 2 + 95, 26); ctx.moveTo(-cw / 2 + 50, -7); ctx.lineTo(-cw / 2 + 140, -7); ctx.stroke();
    ctx.font = `500 16px ${MONO}`; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillText("MEMBRE", -cw / 2 + 170, -16); ctx.font = `800 40px ${MONT}`; ctx.fillStyle = "#fff"; ctx.fillText("VOUS", -cw / 2 + 170, 26);
    // miles counter + tier
    const miles = 30000 * E.inOutCubic(prog(t, L.chaque, L.miles + 0.5));
    ctx.font = `500 16px ${MONO}`; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.letterSpacing = "4px"; ctx.fillText("MILES", -cw / 2 + 50, ch / 2 - 110); ctx.letterSpacing = "0px";
    ctx.font = `700 64px ${MONO}`; ctx.fillStyle = C.goldL; ctx.fillText(fmtMiles(miles), -cw / 2 + 50, ch / 2 - 48);
    const silver = miles >= 29999, tk = silver ? E.outBack(prog(t, L.miles + 0.5, L.miles + 0.9), 3) : 1;
    ctx.save(); ctx.translate(cw / 2 - 130, ch / 2 - 74); ctx.scale(tk, tk);
    rr(ctx, -90, -30, 180, 60, 30); const tg = ctx.createLinearGradient(-90, -30, 90, 30);
    if (silver) { tg.addColorStop(0, "#f4f6f8"); tg.addColorStop(1, "#9aa4ad"); } else { tg.addColorStop(0, "#3ccf86"); tg.addColorStop(1, "#128a52"); }
    ctx.fillStyle = tg; ctx.fill(); ctx.font = `800 26px ${MONT}`; ctx.letterSpacing = "4px"; ctx.textAlign = "center"; ctx.fillStyle = silver ? "#1d2a33" : "#fff"; ctx.fillText(silver ? "SILVER" : "GREEN", 2, 10); ctx.textAlign = "left"; ctx.letterSpacing = "0px";
    ctx.restore();
    ctx.restore();
  }
  function rewardTile(x, y, k, label, icon) {
    if (k <= 0) return;
    const e = E.outBack(k, 1.6);
    ctx.save(); ctx.translate(x, y + (1 - e) * 160); ctx.globalAlpha *= clamp(k * 2);
    rr(ctx, -220, -80, 440, 160, 24); ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fill(); ctx.strokeStyle = "rgba(255,217,112,0.55)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.translate(-140, 0); ctx.strokeStyle = C.goldL; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round"; icon(prog(k, 0.2, 1)); ctx.restore();
    ctx.font = `900 25px ${MONT}`; ctx.fillStyle = "#fff"; const lines = label.split("\n");
    lines.forEach((l, i) => ctx.fillText(l, -66, 9 - (lines.length - 1) * 16 + i * 32));
    ctx.restore();
  }
  const icTicket = (k) => { tracePolyline(ctx, [[-50, -30], [50, -30], [50, -10], [42, -2], [50, 6], [50, 30], [-50, 30], [-50, 6], [-42, -2], [-50, -10], [-50, -30]], k); ctx.setLineDash([4, 6]); tracePolyline(ctx, [[18, -30], [18, 30]], prog(k, 0.6, 1)); ctx.setLineDash([]); };
  const icSeat = (k) => { tracePolyline(ctx, [[-30, -40], [-18, 10], [30, 10], [30, 28], [-24, 28]], k); tracePolyline(ctx, [[-40, 40], [40, 40]], prog(k, 0.3, 0.8)); ctx.fillStyle = C.goldL; const a = prog(k, 0.5, 1); if (a > 0) { ctx.beginPath(); ctx.moveTo(42, -10 - a * 30); ctx.lineTo(58, 8 - a * 30); ctx.lineTo(26, 8 - a * 30); ctx.closePath(); ctx.fill(); } };
  const icBag = (k) => { tracePolyline(ctx, rectPts(-40, -26, 80, 64), k); tracePolyline(ctx, [[-16, -26], [-16, -42], [16, -42], [16, -26]], prog(k, 0.4, 0.8)); tracePolyline(ctx, [[-14, -26], [-14, 38]], prog(k, 0.6, 1)); tracePolyline(ctx, [[14, -26], [14, 38]], prog(k, 0.6, 1)); };
  function sc6(t) {
    const g = ctx.createRadialGradient(960, 420, 80, 960, 540, 1300); g.addColorStop(0, "#0f5236"); g.addColorStop(0.6, "#06281a"); g.addColorStop(1, "#010a06");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = rng(11);
    for (let i = 0; i < 70; i++) { const x = r() * W, y = ((r() * H - (t - 47) * (14 + r() * 40)) % H + H) % H, s = 1 + r() * 2.4; ctx.fillStyle = `rgba(255,217,112,${0.12 + 0.3 * r()})`; ctx.fillRect(x, y, s, s); }
    // card: 3D flip-in, rises for the rewards, flips to cream and fills the frame at the end
    const inK = prog(t, L.star - 0.3, L.star + 0.5), up = E.inOutCubic(prog(t, L.billets - 0.45, L.billets));
    const outK = prog(t, L.s6out, L.s6out + 1.2);
    let flip = Math.cos(lerp(1.4, 0, E.outCubic(inK))), s = lerp(0.7, 1, E.outBack(inK, 1.2)), x = 960, y = lerp(500, 330, up);
    if (outK > 0) { flip = Math.cos(Math.PI * E.inOutCubic(prog(outK, 0, 0.45))); s = lerp(1 - 0.25 * up, 6, E.inExpo(prog(outK, 0.35, 1))); y = lerp(y, 540, E.inOutCubic(prog(outK, 0.3, 0.8))); }
    if (inK > 0) {
      if (t > L.chaque && t < L.miles + 0.6) for (let p = 0; p < 3; p++) { const pk = prog(t, L.chaque + p * 0.55, L.chaque + 0.75 + p * 0.55); if (pk > 0 && pk < 1) { const px = lerp(-100, x - 260, E.inCubic(pk)), py = y + 20 + (p - 1) * 70 - Math.sin(pk * Math.PI) * 40; plane(ctx, px, py, 0, 0.75, "#fff", 10); ctx.save(); ctx.globalAlpha = 1 - pk; ctx.font = `700 26px ${MONO}`; ctx.fillStyle = C.goldL; ctx.fillText("+ MILES", px - 60, py - 34); ctx.restore(); } }
      milesCard(t, x, y, up > 0 && outK === 0 ? lerp(1, 0.75, up) * s : s, flip, false);
    }
    // labels
    const lk = prog(t, L.programme - 0.1, L.programme + 1.2), lo = 1 - prog(t, L.billets - 0.5, L.billets - 0.2);
    if (lk > 0 && lo > 0) { ctx.save(); ctx.globalAlpha = lo; ctx.font = `500 28px ${MONO}`; ctx.letterSpacing = "10px"; ctx.textAlign = "center"; ctx.fillStyle = C.goldL; ctx.fillText("PROGRAMME DE FIDÉLITÉ".slice(0, Math.ceil(21 * lk)), 966, 850); ctx.restore(); }
    const tilesOut = E.inCubic(prog(t, L.s6out - 0.2, L.s6out + 0.3));
    ctx.save(); ctx.globalAlpha = 1 - tilesOut; ctx.translate(0, tilesOut * 200);
    rewardTile(480, 800, prog(t, L.billets - 0.1, L.billets + 0.5), "BILLETS", icTicket);
    rewardTile(960, 800, prog(t, L.surclass - 0.1, L.surclass + 0.5), "SURCLASSEMENTS", icSeat);
    rewardTile(1440, 800, prog(t, L.bagages - 0.1, L.bagages + 0.5), "BAGAGES\nSUPPLÉMENTAIRES", icBag);
    ctx.restore();
    if (outK > 0.55) { ctx.fillStyle = C.cream; ctx.globalAlpha = E.inCubic(prog(outK, 0.75, 1)); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  // ───────────────────────── SC7 · cabine & hospitalité ─────────────────────────
  const CLOUDS = (() => {
    const r = rng(99), layers = [];
    for (let L = 0; L < 3; L++) {
      const list = [];
      for (let i = 0; i < 9; i++) { const puffs = []; const n = 5 + Math.floor(r() * 6); for (let j = 0; j < n; j++) puffs.push([r() * 160 - 80, r() * 30 - 15, 26 + r() * 46]); list.push({ x: i * 170 + r() * 80, y: r() * 60, puffs }); }
      layers.push(list);
    }
    return layers;
  })();
  const WIN = { x: 1490, y: 560, w: 430, h: 600, r: 190 };
  const SUN = { x: WIN.x + 20, y: WIN.y + 40 };
  function windowShape(c, grow = 0) { rr(c, WIN.x - WIN.w / 2 - grow, WIN.y - WIN.h / 2 - grow, WIN.w + grow * 2, WIN.h + grow * 2, WIN.r + grow); }
  function sky(t) {
    const top = WIN.y - WIN.h / 2 - 60, bot = WIN.y + WIN.h / 2 + 60;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, "#14304f"); g.addColorStop(0.42, "#d9733a"); g.addColorStop(0.6, "#ffc46b"); g.addColorStop(0.75, "#ffe2b0"); g.addColorStop(1, "#f6b47a");
    ctx.fillStyle = g; ctx.fillRect(WIN.x - 400, top - 400, 800, bot - top + 800);
    glowDot(ctx, SUN.x, SUN.y, 380, "rgba(255,214,120,0.75)"); glowDot(ctx, SUN.x, SUN.y, 120, "rgba(255,250,225,1)");
    ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, 34, 0, TAU); ctx.fill();
    const speeds = [26, 70, 160], tints = ["rgba(250,196,150,0.75)", "rgba(255,226,196,0.9)", "rgba(255,244,232,1)"], ys = [WIN.y + 90, WIN.y + 165, WIN.y + 250];
    CLOUDS.forEach((layer, L) => {
      for (const cl of layer) {
        const span = 9 * 170, x = ((cl.x - t * speeds[L]) % span + span) % span - 300 + WIN.x - 400;
        ctx.fillStyle = tints[L];
        for (const [dx, dy, r] of cl.puffs) { ctx.beginPath(); ctx.arc(x + dx, ys[L] + cl.y + dy, r * (0.7 + L * 0.35), 0, TAU); ctx.fill(); }
      }
    });
    // wing
    const bob = Math.sin(t * 2.3) * 4, L = WIN.x - WIN.w / 2, B = WIN.y + WIN.h / 2;
    ctx.save(); ctx.translate(0, bob);
    const wg = ctx.createLinearGradient(L, B, WIN.x + 160, WIN.y + 120); wg.addColorStop(0, "#1e2731"); wg.addColorStop(1, "#56616e");
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(L - 80, B + 40); ctx.lineTo(L - 80, B - 150); ctx.lineTo(WIN.x + 170, WIN.y + 118); ctx.lineTo(WIN.x + 190, WIN.y + 138); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,210,150,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L - 80, B - 150); ctx.lineTo(WIN.x + 170, WIN.y + 118); ctx.stroke();
    // winglet with flag stripes
    ctx.translate(WIN.x + 170, WIN.y + 118);
    const fins = [C.green, C.red, C.gold];
    fins.forEach((col, i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(i * 7, -i * 1.2); ctx.lineTo(18 + i * 7, -62 - i); ctx.lineTo(25 + i * 7, -60 - i); ctx.lineTo(7 + i * 7, 2 - i * 1.2); ctx.closePath(); ctx.fill(); });
    ctx.restore();
  }
  function cabinBg() {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#f7f2e7"); g.addColorStop(1, "#ece3d1");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(10,59,37,0.07)";
    for (let y = 40; y < H; y += 44) for (let x = 40 + ((y / 44) % 2) * 22; x < W; x += 44) ctx.fillRect(x, y, 3, 3);
    [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(0, H - 18 + i * 6, W, 6); });
  }
  function seat(x, y, s, k, wide, accent) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = "round"; ctx.lineCap = "round";
    const back = wide ? [[-60, 70], [-110, -170], [-60, -190], [-10, 40]] : [[-40, 70], [-72, -160], [-32, -170], [0, 50]];
    const cush = wide ? rectPts(-70, 40, 190, 50) : rectPts(-48, 40, 130, 44);
    const fillA = prog(k, 0.6, 1);
    if (fillA > 0) { ctx.globalAlpha = fillA; ctx.fillStyle = C.ink; fillPoly(back); fillPoly(cush); ctx.fillStyle = accent; fillPoly(wide ? [[-104, -150], [-64, -176], [-58, -150], [-98, -128]] : [[-68, -140], [-38, -154], [-34, -134], [-64, -122]]); ctx.globalAlpha = 1; }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
    tracePolyline(ctx, [...back, back[0]], prog(k, 0, 0.6)); tracePolyline(ctx, cush, prog(k, 0.15, 0.7));
    tracePolyline(ctx, [[wide ? 20 : 10, 90], [wide ? 0 : -5, 160], [wide ? -60 : -45, 160]], prog(k, 0.3, 0.8)); tracePolyline(ctx, [[wide ? 20 : 10, 90], [wide ? 60 : 50, 160]], prog(k, 0.3, 0.8));
    if (wide) tracePolyline(ctx, [[-20, 20], [110, 20], [110, 34]], prog(k, 0.4, 0.9));
    ctx.restore();
  }
  function sc7(t) {
    cabinBg();
    // classes
    const so = E.inCubic(prog(t, L.laissez - 0.25, L.laissez + 0.25));
    if (so < 1) {
      ctx.save(); ctx.globalAlpha = 1 - so; ctx.translate(-so * 500, 0);
      seat(640, 560, 1.15, prog(t, L.affaires - 0.25, L.affaires + 0.6), true, C.gold);
      seat(1290, 570, 1.15, prog(t, L.eco - 0.25, L.eco + 0.6), false, C.red);
      maskLine(ctx, E.outExpo(prog(t, L.affaires - 0.05, L.affaires + 0.4)), 440, 840, 60, 440, () => { ctx.font = `900 54px ${MONT}`; ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.fillText("AFFAIRES", 640, 840); ctx.textAlign = "left"; });
      maskLine(ctx, E.outExpo(prog(t, L.eco - 0.05, L.eco + 0.4)), 1060, 840, 60, 460, () => { ctx.font = `900 54px ${MONT}`; ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.fillText("ÉCONOMIQUE", 1290, 840); ctx.textAlign = "left"; });
      const ck = prog(t, L.classe - 0.1, L.classe + 0.35); ctx.font = `500 24px ${MONO}`; ctx.letterSpacing = "12px"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(10,59,37,0.7)"; ctx.fillText("CLASSE".slice(0, Math.ceil(6 * ck)), 972, 230); ctx.textAlign = "left"; ctx.letterSpacing = "0px";
      ctx.font = `600 italic 60px ${PLAY}`; ctx.fillStyle = C.red; ctx.textAlign = "center"; ctx.globalAlpha *= prog(t, 61.52, 61.9); ctx.fillText("comme", 965, 560); ctx.textAlign = "left";
      ctx.restore();
    }
    if (t < L.laissez - 0.2) return;
    // window
    const wk = prog(t, L.laissez - 0.1, L.laissez + 0.3), ws = E.outBack(wk, 1.6), blind = E.inOutCubic(prog(t, L.laissez + 0.3, L.laissez + 0.9));
    if (blind > 0) { const sg = ctx.createLinearGradient(WIN.x, WIN.y, 300, 1000); sg.addColorStop(0, `rgba(255,190,100,${0.28 * blind})`); sg.addColorStop(1, "rgba(255,190,100,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(WIN.x - WIN.w / 2, WIN.y - WIN.h / 2 + 60); ctx.lineTo(WIN.x - WIN.w / 2, WIN.y + WIN.h / 2); ctx.lineTo(500, H); ctx.lineTo(0, H); ctx.lineTo(0, 700); ctx.closePath(); ctx.fill(); }
    if (wk > 0) {
      ctx.save(); ctx.translate(WIN.x, WIN.y); ctx.scale(ws, ws); ctx.translate(-WIN.x, -WIN.y);
      windowShape(ctx, 46); const bg = ctx.createLinearGradient(WIN.x - 300, WIN.y - 400, WIN.x + 300, WIN.y + 400); bg.addColorStop(0, "#fffaf0"); bg.addColorStop(1, "#d7ccb5"); ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = "rgba(120,100,60,0.35)"; ctx.lineWidth = 2; ctx.stroke();
      windowShape(ctx, 14); ctx.fillStyle = "#cfc3aa"; ctx.fill();
      ctx.save(); windowShape(ctx); ctx.clip(); sky(t);
      const top = WIN.y - WIN.h / 2, bh = WIN.h * (1 - blind);
      if (bh > 1) { const bgd = ctx.createLinearGradient(0, top, 0, top + bh); bgd.addColorStop(0, "#efe8d9"); bgd.addColorStop(1, "#e2d8c3"); ctx.fillStyle = bgd; ctx.fillRect(WIN.x - WIN.w / 2, top, WIN.w, bh); ctx.fillStyle = "rgba(0,0,0,0.05)"; for (let yy = top + 30; yy < top + bh; yy += 30) ctx.fillRect(WIN.x - WIN.w / 2, yy, WIN.w, 2); ctx.fillStyle = "#b9ab8f"; rr(ctx, WIN.x - 40, top + bh - 22, 80, 14, 7); ctx.fill(); }
      const gl = ctx.createLinearGradient(WIN.x - WIN.w / 2, top, WIN.x + WIN.w / 2, top + WIN.h); gl.addColorStop(0.2, "rgba(255,255,255,0)"); gl.addColorStop(0.32, "rgba(255,255,255,0.18)"); gl.addColorStop(0.38, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(WIN.x - WIN.w / 2, top, WIN.w, WIN.h);
      ctx.restore(); ctx.restore();
    }
    if (blind > 0) { const r = rng(17); for (let i = 0; i < 40; i++) { const x = r() * 1100 + 100, y = ((r() * H - t * (8 + r() * 20)) % H + H) % H, s = 1 + r() * 2.5; ctx.fillStyle = `rgba(255,200,120,${0.5 * blind * (0.4 + 0.6 * Math.sin(t * 2 + i))})`; ctx.fillRect(x, y, s, s); } }
    maskLine(ctx, E.outExpo(prog(t, L.laissez, L.laissez + 0.45)), 150, 360, 80, 700, () => { ctx.font = `600 italic 60px ${PLAY}`; ctx.fillStyle = C.ink; ctx.fillText("laissez-vous porter par", 146, 360); });
    letters(ctx, "l’hospitalité", 130, 540, { font: `700 italic 150px ${PLAY}`, fill: C.ink, each: (i) => { const k = prog(t, L.hosp - 0.04 + i * 0.03, L.hosp + 0.4 + i * 0.03); return { alpha: clamp(k * 2.5), dy: (1 - E.outCubic(k)) * 60, rot: (1 - E.outCubic(k)) * 0.35 }; } });
    letters(ctx, "CAMEROUNAISE", 140, 680, { font: `900 100px ${MONT}`, spacing: 6, fill: C.red, each: (i, n) => { const k = prog(t, L.cam - 0.06 + (n - 1 - i) * 0.02, L.cam + 0.3 + (n - 1 - i) * 0.02); return { alpha: clamp(k * 3), dx: (1 - E.outExpo(k)) * 120 }; } });
    const u = E.outExpo(prog(t, L.cam + 0.15, L.cam + 0.7)); if (u > 0) [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(146, 712 + i * 7, 780 * u, 7); });
    // un sourire · une attention · à chaque instant
    const items = [["UN SOURIRE", L.sourire, (k) => tracePolyline(ctx, circlePts(0, -4, 22, Math.PI * 0.15, Math.PI * 0.85, 20), k)],
      ["UNE ATTENTION", L.attention, (k) => { const a = E.outBack(k, 2.5); ctx.save(); ctx.scale(a, a); ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-26, -6, -14, -26, 0, -12); ctx.bezierCurveTo(14, -26, 26, -6, 0, 14); ctx.fill(); ctx.restore(); }],
      ["À CHAQUE INSTANT", L.instant, (k) => { tracePolyline(ctx, circlePts(0, 0, 22), k); tracePolyline(ctx, [[0, 0], [0, -14]], prog(k, 0.5, 1)); tracePolyline(ctx, [[0, 0], [10, 6]], prog(k, 0.6, 1)); }]];
    let ix = 150;
    items.forEach(([label, t0, ic]) => {
      const k = prog(t, t0 - 0.1, t0 + 0.45);
      ctx.font = `700 22px ${MONO}`; ctx.letterSpacing = "4px"; const w = ctx.measureText(label).width; ctx.letterSpacing = "0px";
      if (k > 0) {
        ctx.save(); ctx.globalAlpha = clamp(k * 2); ctx.translate(ix + 26, 830); ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ic(k); ctx.restore();
        ctx.save(); ctx.globalAlpha = clamp(k * 2); ctx.font = `700 22px ${MONO}`; ctx.letterSpacing = "4px"; ctx.fillStyle = C.ink; ctx.fillText(label, ix + 62, 838 + (1 - E.outCubic(k)) * 16); ctx.restore();
      }
      ix += w + 62 + 56;
    });
  }

  // ───────────────────────── SC8 · réservation ─────────────────────────
  function phoneUI(t, px, py, s) {
    const pw = 430, ph = 880;
    ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.rotate(Math.sin(t * 0.7) * 0.01);
    ctx.save(); ctx.translate(26, 40); rr(ctx, -pw / 2, -ph / 2, pw, ph, 66); ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill(); ctx.restore();
    rr(ctx, -pw / 2, -ph / 2, pw, ph, 66); ctx.fillStyle = "#0b100e"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; ctx.stroke();
    const sw = pw - 30, sh = ph - 30, sx = -sw / 2, sy = -sh / 2;
    rr(ctx, sx, sy, sw, sh, 52); ctx.save(); ctx.clip();
    ctx.fillStyle = "#f7f3ea"; ctx.fillRect(sx, sy, sw, sh);
    // url bar
    rr(ctx, sx + 24, sy + 56, sw - 48, 46, 23); ctx.fillStyle = "#e7e0d2"; ctx.fill();
    ctx.font = `500 20px ${MONO}`; ctx.fillStyle = "#4a5a51"; ctx.textAlign = "center"; ctx.fillText("camair-co.cm", 8, sy + 86); ctx.textAlign = "left";
    ctx.strokeStyle = "#4a5a51"; ctx.lineWidth = 2; rr(ctx, -82, sy + 72, 12, 10, 2); ctx.stroke(); ctx.beginPath(); ctx.arc(-76, sy + 72, 4.5, Math.PI, 0); ctx.stroke();
    const swap = E.inOutCubic(prog(t, L.sur, L.sur + 0.45));
    // page 1: booking form
    ctx.save(); ctx.translate(-swap * sw, 0);
    ctx.fillStyle = C.ink; ctx.fillRect(sx, sy + 122, sw, 120);
    starPath(ctx, sx + 46, sy + 182, 14); ctx.fillStyle = C.gold; ctx.fill();
    ctx.font = `900 26px ${MONT}`; ctx.fillStyle = "#fff"; ctx.letterSpacing = "3px"; ctx.fillText("CAMAIR-CO", sx + 70, sy + 192); ctx.letterSpacing = "0px";
    ctx.font = `800 34px ${MONT}`; ctx.fillStyle = C.ink; ctx.fillText("Réserver un vol", sx + 30, sy + 300);
    const fields = [["DE", "Douala · DLA", L.reservez + 0.1], ["À", "Libreville · LBV", L.quelques], ["DÉPART", "Aller simple", L.quelques + 0.25], ["PASSAGERS", "1 adulte", L.quelques + 0.4]];
    fields.forEach(([lab, val, t0], i) => {
      const fy = sy + 340 + i * 98;
      rr(ctx, sx + 26, fy, sw - 52, 82, 16); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = t > t0 && t < t0 + 0.35 ? C.green : "#ddd3c0"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `500 15px ${MONO}`; ctx.letterSpacing = "3px"; ctx.fillStyle = "rgba(10,59,37,0.55)"; ctx.fillText(lab, sx + 46, fy + 30); ctx.letterSpacing = "0px";
      const tk = prog(t, t0, t0 + 0.3); ctx.font = `700 26px ${MONT}`; ctx.fillStyle = C.ink; ctx.fillText(val.slice(0, Math.ceil(val.length * tk)), sx + 46, fy + 64);
    });
    const press = prog(t, L.clics + 0.05, L.clics + 0.3), bs = 1 - 0.06 * Math.sin(Math.PI * press);
    ctx.save(); ctx.translate(0, sy + 790); ctx.scale(bs, bs); rr(ctx, -sw / 2 + 26, -38, sw - 52, 76, 38); ctx.fillStyle = C.red; ctx.fill();
    ctx.font = `900 26px ${MONT}`; ctx.letterSpacing = "4px"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText("RECHERCHER", 4, 10); ctx.textAlign = "left"; ctx.letterSpacing = "0px"; ctx.restore();
    ctx.restore();
    // page 2: confirmation + QR
    if (swap > 0) {
      ctx.save(); ctx.translate((1 - swap) * sw, 0);
      ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(0, sy + 230, 62, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 10; ctx.lineCap = "round"; tracePolyline(ctx, [[-26, sy + 232], [-6, sy + 254], [30, sy + 210]], E.outCubic(prog(t, L.sur + 0.35, L.sur + 0.7)));
      ctx.font = `800 28px ${MONT}`; ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.fillText("Réservation confirmée", 0, sy + 350);
      ctx.font = `900 54px ${MONT}`; ctx.fillText("DLA  →  LBV", 0, sy + 430); ctx.textAlign = "left";
      const qk = prog(t, L.sur + 0.5, L.url + 1.0), r = rng(77), n = 21, cs = 12, q0x = -n * cs / 2, q0y = sy + 480;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = r(); const finder = (i < 7 && j < 7) || (i > n - 8 && j < 7) || (i < 7 && j > n - 8); const on = finder ? (i % 6 === 0 || j % 6 === 0 || (i % 6 > 1 && i % 6 < 5 && j % 6 > 1 && j % 6 < 5)) && !(i > 6 && i < n - 7) : v > 0.52; if (on && hash(i * 31 + j) < qk * 1.2) { ctx.fillStyle = C.ink; ctx.fillRect(q0x + i * cs, q0y + j * cs, cs - 1, cs - 1); } }
      ctx.font = `600 italic 30px ${PLAY}`; ctx.fillStyle = C.red; ctx.textAlign = "center"; ctx.globalAlpha = prog(t, L.cm, L.cm + 0.4); ctx.fillText("Bon voyage !", 0, sy + 790); ctx.textAlign = "left"; ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
    // notch
    rr(ctx, -70, -ph / 2 + 22, 140, 30, 15); ctx.fillStyle = "#0b100e"; ctx.fill();
    ctx.restore();
  }
  function tap(x, y, t0, t) { const k = prog(t, t0, t0 + 0.5); if (k <= 0 || k >= 1) return; ring(ctx, x, y, 18 + k * 50, 3, "#fff", (1 - k) * 0.9); ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill(); }
  function sc8(t) {
    const skyK = E.inOutCubic(prog(t, L.takeoff + 0.2, L.takeoff + 1.6));
    const g = ctx.createRadialGradient(1300, 500, 60, 960, 540, 1300); g.addColorStop(0, "#127a4a"); g.addColorStop(0.6, "#06301f"); g.addColorStop(1, "#021009");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = rng(23);
    for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, rad = 40 + r() * 140, a = 0.05 + r() * 0.08; glowDot(ctx, x + Math.sin(t * 0.3 + i) * 30, y + Math.cos(t * 0.25 + i) * 20, rad, i % 3 ? `rgba(71,217,143,${a})` : `rgba(249,183,28,${a})`); }
    // sunset sky for the take-off
    if (skyK > 0) {
      ctx.save(); ctx.globalAlpha = skyK;
      const sg = ctx.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, "#14304f"); sg.addColorStop(0.5, "#d9733a"); sg.addColorStop(0.72, "#ffc46b"); sg.addColorStop(1, "#ffe2b0");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      const sunY = lerp(820, 540, E.outCubic(prog(t, L.takeoff + 0.5, L.dive)));
      glowDot(ctx, 960, sunY, 700, "rgba(255,214,120,0.75)"); glowDot(ctx, 960, sunY, 220, "rgba(255,250,225,1)"); ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.arc(960, sunY, 70, 0, TAU); ctx.fill();
      // clouds rushing down (climb)
      const cr = rng(5);
      for (let i = 0; i < 18; i++) {
        const lay = i % 3, sp = [260, 560, 1000][lay], x = cr() * (W + 600) - 300, y = ((cr() * (H + 900) + (t - L.takeoff) * sp) % (H + 900)) - 450, rad = [140, 220, 340][lay] * (0.7 + 0.6 * cr());
        const tint = [[250, 196, 150, 0.35], [255, 226, 200, 0.5], [255, 244, 234, 0.65]][lay];
        for (let p = 0; p < 6; p++) {
          const px = x + (p - 2.5) * rad * 0.45, py = y + Math.sin(p * 2.1 + i) * rad * 0.18, pr = rad * (0.45 + 0.2 * Math.sin(p * 1.7 + i));
          const cg = ctx.createRadialGradient(px, py, 0, px, py, pr); cg.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},${tint[3]})`); cg.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},0)`);
          ctx.fillStyle = cg; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
      }
      ctx.restore();
    }
    // left typography
    const lo = E.inCubic(prog(t, L.takeoff - 0.1, L.takeoff + 0.35));
    ctx.save(); ctx.globalAlpha = 1 - lo; ctx.translate(-lo * 300, 0);
    letters(ctx, "Réservez", 140, 410, { font: `900 150px ${MONT}`, fill: "#fff", each: (i) => { const k = prog(t, L.reservez - 0.05 + i * 0.035, L.reservez + 0.35 + i * 0.035); return { alpha: clamp(k * 2), dy: (1 - E.outBack(k, 1.8)) * 90 }; } });
    maskLine(ctx, E.outExpo(prog(t, L.quelques - 0.1, L.quelques + 0.4)), 150, 540, 110, 760, () => { ctx.font = `700 italic 100px ${PLAY}`; ctx.fillStyle = C.goldL; ctx.fillText("en quelques clics", 146, 540); });
    const uk = prog(t, L.url, L.cm + 0.5), url = "camair-co.cm", shown = url.slice(0, Math.ceil(url.length * uk));
    if (uk > 0) {
      ctx.font = `700 70px ${MONO}`; ctx.fillStyle = "#fff"; ctx.fillText(shown, 150, 690);
      const cw = ctx.measureText(shown).width; if (Math.floor(t * 2.5) % 2 === 0 || uk < 1) { ctx.fillStyle = C.gold; ctx.fillRect(160 + cw, 632, 6, 66); }
      ctx.fillStyle = C.gold; ctx.fillRect(150, 718, ctx.measureText(url).width * E.outExpo(prog(t, L.cm, L.cm + 0.6)), 5);
    }
    ctx.font = `500 22px ${MONO}`; ctx.letterSpacing = "6px"; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillText("RÉSERVATION EN LIGNE".slice(0, Math.ceil(20 * prog(t, L.cm + 0.2, L.cm + 0.9))), 150, 790); ctx.letterSpacing = "0px";
    ctx.restore();
    // phone
    const pin_ = E.outBack(prog(t, 69.85, 70.6), 1.3), pout = E.inCubic(prog(t, L.takeoff - 0.1, L.takeoff + 0.45));
    if (pout < 1) {
      const px = 1380, py = lerp(1500, 545, pin_) + pout * 1100;
      phoneUI(t, px, py, 1);
      tap(px - 30, py - 440 + 340 + 98 + 40, L.quelques, t); tap(px, py - 440 + 15 + 790, L.clics + 0.02, t);
    }
    // take-off plane + boarding banner
    const pk = prog(t, L.takeoff + 0.1, L.dive + 0.4);
    if (pk > 0) {
      const p0 = [1380, 900], p1 = [1300, 600], p2 = [1000, 620], p3 = [960, lerp(820, 540, E.outCubic(prog(t, L.takeoff + 0.5, L.dive)))];
      const u = E.inOutCubic(pk), pt = bez(p0, p1, p2, p3, u), nx = bez(p0, p1, p2, p3, Math.min(1, u + 0.01)), sc = lerp(2.4, 0.3, E.inCubic(pk));
      ctx.save(); ctx.lineCap = "round"; for (let i = 0; i < 30; i++) { const a = bez(p0, p1, p2, p3, Math.max(0, u - 0.25 + i * 0.008)); ctx.globalAlpha = (i / 30) * 0.6; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(a[0], a[1], lerp(2, 10, i / 30) * sc, 0, TAU); ctx.fill(); } ctx.restore();
      plane(ctx, pt[0], pt[1], Math.atan2(nx[1] - pt[1], nx[0] - pt[0]), sc, "#fff", 20 * sc);
    }
    const bk = prog(t, L.takeoff + 0.5, L.takeoff + 1.2) * (1 - prog(t, L.dive - 0.2, L.dive + 0.2));
    if (bk > 0) {
      ctx.save(); ctx.globalAlpha = bk; ctx.fillStyle = "rgba(4,25,15,0.85)"; rr(ctx, 560, 120, 800, 70, 12); ctx.fill();
      ctx.font = `700 30px ${MONO}`; ctx.letterSpacing = "8px"; ctx.textAlign = "center"; ctx.fillStyle = Math.floor(t * 3) % 2 ? C.goldL : "#fff";
      ctx.fillText(scramble("EMBARQUEMENT IMMÉDIAT", prog(t, L.takeoff + 0.5, L.takeoff + 1.3), 88, t), 966, 166); ctx.textAlign = "left"; ctx.letterSpacing = "0px"; ctx.restore();
    }
  }

  // ───────────────────────── SC9 · signature ─────────────────────────
  const wm = document.createElement("canvas"); wm.width = 1400; wm.height = 260; const wctx = wm.getContext("2d");
  function sc9(t) {
    const g = ctx.createRadialGradient(960, 470, 50, 960, 540, 1250); g.addColorStop(0, "#0d4a30"); g.addColorStop(0.55, "#06281a"); g.addColorStop(1, "#010a06");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.06; starPath(ctx, 960, 560, 900 + (t - 79) * 30, -Math.PI / 2 + (t - 79) * 0.05); ctx.strokeStyle = C.goldL; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    const mk = E.inOutCubic(prog(t, L.logo - 0.05, L.logo + 0.55));
    const sx = 960, sy = lerp(540, 300, mk), sr = lerp(120, 58, mk);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.25); ctx.globalAlpha = 0.22;
    for (let i = 0; i < 24; i++) { ctx.rotate(TAU / 24); const rg = ctx.createLinearGradient(0, 0, 0, -1100); rg.addColorStop(0, "rgba(255,217,112,0.55)"); rg.addColorStop(1, "rgba(255,217,112,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(0, -1100); ctx.fill(); }
    ctx.restore();
    const r = rng(3);
    for (let i = 0; i < 90; i++) { const x = r() * W, y = ((r() * H - (t - 79) * (20 + r() * 50)) % H + H) % H, s = 1 + r() * 2.6; ctx.fillStyle = `rgba(255,217,112,${0.15 + 0.35 * r()})`; ctx.fillRect(x, y, s, s); }
    glowDot(ctx, sx, sy, sr * 4, "rgba(249,183,28,0.45)");
    starPath(ctx, sx, sy, sr, -Math.PI / 2 + (1 - E.outBack(prog(t, 79.3, 79.9), 1.5)) * 1.2); ctx.fillStyle = C.gold; ctx.fill();
    const sw = prog(t, L.logo, L.logo + 0.6); if (sw > 0 && sw < 1) ring(ctx, sx, sy, 80 + E.outCubic(sw) * 650, 18 * (1 - sw), "#ffe9a8", 1 - sw);
    wctx.clearRect(0, 0, wm.width, wm.height);
    const wy = 190;
    letters(wctx, "CAMAIR-CO", 700, wy, { font: `900 156px ${MONT}`, spacing: 14, align: "center", fill: "#fff", each: (i) => { const k = prog(t, L.logo + 0.05 + i * 0.035, L.logo + 0.5 + i * 0.035); return { alpha: clamp(k * 2.5), dy: (1 - E.outExpo(k)) * 120, fill: i === 6 ? C.gold : "#fff" }; } });
    const shk = prog(t, L.shimmer, L.shimmer + 0.7);
    if (shk > 0 && shk < 1) { wctx.save(); wctx.globalCompositeOperation = "source-atop"; const x = lerp(-300, 1700, E.inOutCubic(shk)); const sg = wctx.createLinearGradient(x - 160, 0, x + 160, 260); sg.addColorStop(0, "rgba(255,230,160,0)"); sg.addColorStop(0.5, "rgba(255,236,170,0.95)"); sg.addColorStop(1, "rgba(255,230,160,0)"); wctx.fillStyle = sg; wctx.fillRect(0, 0, 1400, 260); wctx.restore(); }
    ctx.drawImage(wm, 960 - 700, 600 - wy);
    const bk = E.outExpo(prog(t, L.logo + 0.45, L.logo + 1.0)); if (bk > 0) { const bw = 600 * bk; [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(960 - bw / 2 + (i * bw) / 3, 650, bw / 3 + 0.5, 7); }); }
    letters(ctx, "L’étoile du Cameroun", 960, 770, { font: `700 italic 84px ${PLAY}`, align: "center", fill: C.goldL, each: (i) => { const k = prog(t, L.etoile2 - 0.08 + i * 0.03, L.etoile2 + 0.4 + i * 0.03); return { alpha: k, dy: (1 - E.outCubic(k)) * 26 }; } });
    const uk = prog(t, L.urlEnd, L.urlEnd + 0.6);
    if (uk > 0) { ctx.font = `500 30px ${MONO}`; ctx.letterSpacing = "6px"; ctx.textAlign = "center"; ctx.fillStyle = `rgba(255,255,255,${0.85 * clamp(uk * 2)})`; ctx.fillText(scramble("www.camair-co.cm", uk, 77, t), 960, 880); ctx.textAlign = "left"; ctx.letterSpacing = "0px"; }
  }

  // ───────────────────────── composition ─────────────────────────
  const grain = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const im = g.createImageData(256, 256); const r = rng(1); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return c; })();
  const grainPat = ctx.createPattern(grain, "repeat");
  function post(t, light) {
    const v = ctx.createRadialGradient(960, 540, 520, 960, 540, 1200);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, light ? "rgba(70,50,20,0.22)" : "rgba(0,0,0,0.45)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const f1 = t > L.ignite - 0.05 ? Math.max(0, 1 - (t - L.ignite) / 0.4) * prog(t, L.ignite - 0.06, L.ignite) : 0;
    if (f1 > 0) { ctx.save(); ctx.globalCompositeOperation = "screen"; const rg = ctx.createRadialGradient(960, 400, 0, 960, 400, 1300); rg.addColorStop(0, `rgba(255,225,150,${f1 * 0.7})`); rg.addColorStop(1, "rgba(255,225,150,0)"); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const f2 = prog(t, 79.15, 79.38) * (1 - prog(t, 79.38, 79.8));
    if (f2 > 0) { ctx.fillStyle = `rgba(255,244,214,${f2 * 0.95})`; ctx.fillRect(0, 0, W, H); }
    ctx.save(); ctx.globalAlpha = light ? 0.05 : 0.07; ctx.globalCompositeOperation = "overlay";
    const ox = Math.floor(hash(Math.floor(t * 30)) * 256), oy = Math.floor(hash(Math.floor(t * 30) + 9) * 256);
    ctx.translate(-ox, -oy); ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
    const fo = prog(t, L.fade, DUR - 0.05); if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
  }
  function shakeAt(t) {
    let s = 0;
    for (const [t0, a] of [[L.ignite, 9], [L.logo, 7]]) { const k = prog(t, t0, t0 + 0.35); if (k > 0 && k < 1) s += a * (1 - k) ** 2; }
    return [Math.sin(t * 83) * s, Math.cos(t * 71) * s];
  }
  function render(t) {
    t = clamp(t, 0, DUR);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const [shx, shy] = shakeAt(t); ctx.translate(shx, shy);
    let light = false;
    if (t < L.iris + 0.6) {
      ctx.save(); sc1(t); ctx.restore();
      if (t > L.iris) { const k = E.inOutCubic(prog(t, L.iris, L.iris + 0.55)); ctx.save(); ctx.beginPath(); ctx.arc(960, 540, k * 1150, 0, TAU); ctx.clip(); sc2(t); ctx.restore(); }
    } else if (t < 16.2) sc2(t);
    if (t >= 16.2 && t < L.wipe + 0.45) {
      drawWorld(t); if (t < L.pull + 0.6) sc3(t); if (t > L.pull + 0.4) sc4(t);
      // SC2 dissolves over the map while its "dream" star lands on Douala
      if (t < 16.75) { ctx.save(); ctx.globalAlpha = 1 - E.inOutCubic(prog(t, 16.2, 16.75)); sc2(t); ctx.restore(); }
      const d = P(CITY.DLA.ll);
      if (t < 17.0) { const k = E.inOutExpo(prog(t, L.s2out, 16.95)), x = lerp(1500, d[0], k), y = lerp(460, d[1], k); glowDot(ctx, x, y, 90, "rgba(249,183,28,0.5)"); starPath(ctx, x, y, lerp(80, 20, k), -Math.PI / 2 + 0.1 + k * 1.3); ctx.fillStyle = C.gold; ctx.fill(); }
      else if (t < L.pull + 0.5) { ctx.save(); ctx.globalAlpha = 1 - prog(t, L.pull + 0.1, L.pull + 0.4); glowDot(ctx, d[0], d[1], 46, "rgba(249,183,28,0.5)"); starPath(ctx, d[0], d[1], 20, -Math.PI / 2 + Math.sin(t * 2) * 0.1); ctx.fillStyle = C.gold; ctx.fill(); ctx.restore(); }
    }
    if (t >= L.wipe && t < L.s5out + 1.2) {
      const wb = wipeBands(t, L.wipe), inWipe = t < L.wipe + 0.45;
      ctx.save(); if (inWipe) { wb.behind(); ctx.clip(); } sc5(t); ctx.restore();
      if (inWipe) wb.draw();
    }
    if (t >= L.s5out + 0.05 && t < L.s6out + 1.25) {
      const k = E.inOutCubic(prog(t, L.s5out + 0.05, L.s5out + 0.75));
      ctx.save(); if (k < 1) { ctx.beginPath(); ctx.arc(960, 470, k * 1200, 0, TAU); ctx.clip(); } sc6(t); ctx.restore();
      if (k > 0 && k < 1) ring(ctx, 960, 470, k * 1200, 8, C.goldL, 1 - k);
    }
    if (t >= L.s6out + 1.2 && t < L.s7out + 0.8) {
      const k = E.inCubic(prog(t, L.s7out, L.s7out + 0.7));
      ctx.save(); ctx.translate(-k * W, 0); sc7(t); ctx.restore(); light = k < 0.5;
      if (k > 0) { ctx.save(); ctx.translate(W - k * W, 0); sc8(t); ctx.restore(); }
    } else if (t >= L.s7out + 0.8 && t < 79.5) {
      const dk = prog(t, L.dive, 79.4);
      ctx.save();
      if (dk > 0) { const z = Math.exp(E.inCubic(dk) * Math.log(14)); ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-960, -540); }
      sc8(t); ctx.restore();
    }
    if (t >= 79.38) sc9(t);
    post(t, light);
    ctx.restore();
  }

  // sub-frame count per output frame: more samples where the camera moves fast
  const FAST = [[1.8, 2.5], [6.1, 7.6], [12.3, 13.0], [16.1, 17.4], [23.9, 25.1], [29.4, 30.6], [36.4, 37.0], [40.2, 40.9], [46.6, 47.5], [58.6, 59.9], [62.5, 63.2], [69.2, 70.8], [72.1, 72.8], [75.0, 79.9]];
  const MID = [[26.0, 28.8], [47.5, 49.0], [51.2, 53.6]];
  const samplesAt = (t) => (FAST.some(([a, b]) => t >= a && t <= b) ? 10 : MID.some(([a, b]) => t >= a && t <= b) ? 5 : 3);

  function renderFrame(t, samples = 1, shutter = 1 / 60) {
    if (samples <= 1) { render(t); out.globalAlpha = 1; out.drawImage(buf, 0, 0); return; }
    for (let k = 0; k < samples; k++) {
      render(t + (k / (samples - 1) - 0.5) * shutter);
      out.globalAlpha = 1 / (k + 1); out.drawImage(buf, 0, 0);
    }
    out.globalAlpha = 1;
  }

  const fontsReady = Promise.all([
    `900 40px ${MONT}`, `800 40px ${MONT}`, `600 40px ${MONT}`, `700 italic 40px ${PLAY}`, `600 italic 40px ${PLAY}`, `500 40px ${MONO}`, `700 40px ${MONO}`,
  ].map((f) => document.fonts.load(f, "AÉÀ’é"))).then(() => document.fonts.ready);

  window.spot = { DUR, L, ready: fontsReady, renderFrame, samplesAt };

  // ───────────────────────── live preview ─────────────────────────
  if (new URLSearchParams(location.search).has("render")) { document.body.classList.add("render"); return; }
  const audio = document.getElementById("audio"), btn = document.getElementById("play"), scrub = document.getElementById("scrub"), label = document.getElementById("time");
  scrub.max = DUR;
  let playing = false, t0 = 0, start = 0;
  const now = () => (audio.readyState >= 2 && !audio.error ? audio.currentTime : t0 + (performance.now() - start) / 1000);
  function tick() {
    const t = playing ? now() : +scrub.value;
    if (playing && t >= DUR) { playing = false; btn.textContent = "Lecture"; audio.pause(); }
    renderFrame(Math.min(t, DUR)); scrub.value = t; label.textContent = `${Math.min(t, DUR).toFixed(2)} s`;
    if (playing) requestAnimationFrame(tick);
  }
  btn.onclick = () => {
    playing = !playing; btn.textContent = playing ? "Pause" : "Lecture";
    if (playing) { if (+scrub.value >= DUR - 0.01) scrub.value = 0; t0 = +scrub.value; start = performance.now(); audio.currentTime = t0; audio.play().catch(() => {}); requestAnimationFrame(tick); }
    else audio.pause();
  };
  scrub.oninput = () => { if (!playing) tick(); };
  fontsReady.then(() => tick());
})();
