/* Camair-Co — spot motion design 15 s (1920×1080).
 * Every frame is a pure function of time t, so the same code drives the live
 * preview and the frame-by-frame export (with sub-frame motion blur). */
"use strict";
(() => {
  const W = 1920, H = 1080, DUR = 15, TAU = Math.PI * 2;
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

  // VO word timings on the final (tightened) voice track, in seconds.
  const T = {
    depart: 0.22, douala: 0.914, yaounde: 1.479, garoua: 2.39,
    pull: 2.84, camair: 3.099, vous: 3.788, ciel: 4.075, afrique: 4.345,
    push: 5.0, lbv: 5.345, coo: 6.159, bzv: 6.908, ndj: 7.896, bgf: 8.2, pnr: 8.3,
    wipe: 8.5, voyagez: 8.793, confiance: 9.418, stamp: 9.72, cardOut: 9.98, portes: 10.135,
    hosp: 10.634, cam: 11.393, dive: 11.93, logo: 12.373, etoile: 13.443, url: 13.95,
  };

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
    g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
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

  const CITY = {
    DLA: { name: "DOUALA", ll: [9.7, 4.05] }, NSI: { name: "YAOUNDÉ", ll: [11.52, 3.87] }, GOU: { name: "GAROUA", ll: [13.4, 9.3] },
    LBV: { name: "LIBREVILLE", ll: [9.45, 0.39], dir: -1 }, COO: { name: "COTONOU", ll: [2.42, 6.37], dir: 0 },
    BZV: { name: "BRAZZAVILLE", ll: [15.28, -4.27], dir: 1 }, NDJ: { name: "N’DJAMENA", ll: [15.04, 12.11], dir: 1 },
    BGF: { name: "BANGUI", ll: [18.56, 4.36], dir: 1 }, PNR: { name: "POINTE-NOIRE", ll: [11.86, -4.78], dir: -1 },
  };

  function camAt(t) {
    if (t < 0.55) return { R: 5600, lon: 12.2, lat: 6.9, cx: 1250, cy: 540 };
    if (t < 1.15) { const e = E.outCubic(prog(t, 0.55, 1.15)); return { R: lerpLog(5600, 4300, e), lon: 12.2, lat: 6.9, cx: 1250, cy: 540 }; }
    if (t < T.pull) { const e = prog(t, 1.15, T.pull); return { R: lerp(4300, 4560, e), lon: lerp(12.2, 12.45, e), lat: 6.9, cx: 1250, cy: 540 }; }
    if (t < 3.62) { const e = E.inOutQuart(prog(t, T.pull, 3.62)); return { R: lerpLog(4560, 430, e), lon: lerp(12.45, 16, e), lat: lerp(6.9, 6, e), cx: lerp(1250, 1300, e), cy: lerp(540, 560, e) }; }
    if (t < T.push) { const e = prog(t, 3.62, T.push); return { R: lerp(430, 452, e), lon: lerp(16, 19, e), lat: 6, cx: 1300, cy: 560 }; }
    if (t < 5.8) { const e = E.inOutCubic(prog(t, T.push, 5.8)); return { R: lerpLog(452, 2150, e), lon: lerp(19, 10.0, e), lat: lerp(6, 3.6, e), cx: lerp(1300, 1330, e), cy: lerp(560, 540, e) }; }
    const e = prog(t, 5.8, 9);
    return { R: lerp(2150, 2300, e), lon: lerp(10.0, 10.3, e), lat: 3.6, cx: 1330, cy: 540 };
  }
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

  // ───────────────────────── scene A: star + Cameroon ─────────────────────────
  function sceneA(t, cam) {
    if (t > 3.5) return;
    const dla = P(CITY.DLA.ll), nsi = P(CITY.NSI.ll), gou = P(CITY.GOU.ll);
    // reveal veil over the map while the star is alone
    const veil = 1 - E.outCubic(prog(t, 0.5, 1.05));
    if (veil > 0) { ctx.fillStyle = `rgba(2,12,7,${veil})`; ctx.fillRect(0, 0, W, H); }
    // legibility gradient (left)
    const lg = ctx.createLinearGradient(0, 0, 1000, 0); lg.addColorStop(0, "rgba(2,12,7,0.9)"); lg.addColorStop(1, "rgba(2,12,7,0)");
    ctx.save(); ctx.globalAlpha = 1 - prog(t, T.pull, T.pull + 0.4); ctx.fillStyle = lg; ctx.fillRect(0, 0, 1000, H); ctx.restore();

    // Cameroon outline trace
    const kt = E.inOutCubic(prog(t, 0.62, 1.7));
    if (kt > 0 && t < 3.3) {
      const pts = cmrRing.map(P);
      ctx.save(); ctx.globalAlpha = 1 - prog(t, T.pull, T.pull + 0.3);
      ctx.strokeStyle = C.goldL; ctx.lineWidth = 3.2; ctx.lineJoin = "round"; ctx.shadowColor = "rgba(249,183,28,0.8)"; ctx.shadowBlur = 14;
      tracePolyline(ctx, pts, kt); ctx.restore();
    }
    // domestic routes
    if (t > T.yaounde) { ctx.save(); ctx.globalAlpha = 1 - prog(t, T.pull + 0.2, T.pull + 0.5); drawRoute(routePts(CITY.DLA.ll, CITY.NSI.ll, 24, 0.35), E.inOutCubic(prog(t, T.yaounde, T.yaounde + 0.45)), C.goldL, 3, false, 0); ctx.restore(); }
    if (t > T.garoua) { ctx.save(); ctx.globalAlpha = 1 - prog(t, T.pull + 0.2, T.pull + 0.5); drawRoute(routePts(CITY.DLA.ll, CITY.GOU.ll, 40, 0.22), E.inOutCubic(prog(t, T.garoua - 0.05, T.garoua + 0.55)), C.goldL, 3, true, 0.25); ctx.restore(); }
    if (t < T.pull + 0.5) {
      ctx.save(); ctx.globalAlpha = 1 - prog(t, T.pull + 0.1, T.pull + 0.5);
      pin(nsi[0], nsi[1], T.yaounde + 0.35, t); pin(gou[0], gou[1], T.garoua + 0.5, t);
      const cityTag = (x, y, s, t0, dx) => { const k = prog(t, t0, t0 + 0.3); if (!k) return; ctx.save(); ctx.font = `700 24px ${MONO}`; ctx.fillStyle = "#fff"; ctx.globalAlpha *= k; ctx.textAlign = dx < 0 ? "right" : "left"; ctx.fillText(s, x + dx, y + 8); ctx.restore(); };
      cityTag(nsi[0], nsi[1], "NSI", T.yaounde + 0.45, 26); cityTag(gou[0], gou[1], "GOU", T.garoua + 0.6, 26); cityTag(dla[0], dla[1], "DLA", 1.15, -38);
      ctx.restore();
    }

    // the star: trace → flash → flies to Douala
    const sx = lerp(960, dla[0], E.inOutExpo(prog(t, 0.55, 1.08))), sy = lerp(540, dla[1], E.inOutExpo(prog(t, 0.55, 1.08)));
    const sr = lerp(170, 20, E.inOutExpo(prog(t, 0.55, 1.08)));
    const rot = -Math.PI / 2 + (1 - E.outExpo(prog(t, 0, 0.6))) * 0.9;
    const starA = 1 - prog(t, T.pull + 0.25, T.pull + 0.55);
    if (starA > 0) {
      ctx.save(); ctx.globalAlpha = starA;
      // rays
      const ra = prog(t, 0.15, 0.45) * (1 - prog(t, 0.6, 1.0));
      if (ra > 0) {
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.6); ctx.globalAlpha *= ra * 0.5;
        for (let i = 0; i < 18; i++) { ctx.rotate(TAU / 18); const g = ctx.createLinearGradient(0, 0, 0, -900); g.addColorStop(0, "rgba(255,217,112,0.7)"); g.addColorStop(1, "rgba(255,217,112,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(0, -900 - 300 * hash(i)); ctx.fill(); }
        ctx.restore();
      }
      glowDot(ctx, sx, sy, sr * 3.2, "rgba(249,183,28,0.55)", prog(t, 0.3, 0.45));
      const tk = E.inOutCubic(prog(t, 0.0, 0.42));
      if (t < 0.46) { ctx.strokeStyle = C.goldL; ctx.lineWidth = 6; ctx.lineJoin = "miter"; tracePolyline(ctx, starPoints(sx, sy, sr, rot), tk); }
      const fill = prog(t, 0.38, 0.46);
      if (fill > 0) { starPath(ctx, sx, sy, sr * lerp(1.25, 1, E.outBack(fill)), rot); ctx.fillStyle = C.gold; ctx.globalAlpha = starA * fill; ctx.fill(); }
      ctx.restore();
      // shockwave + sparks
      const sw = prog(t, 0.42, 1.0);
      if (sw > 0 && sw < 1) { ring(ctx, 960, 540, 60 + E.outCubic(sw) * 700, 26 * (1 - sw), "#ffe9a8", (1 - sw) * 0.9); ring(ctx, 960, 540, 30 + E.outCubic(sw) * 420, 3, "#fff", (1 - sw)); }
      const sp = prog(t, 0.42, 1.25);
      if (sp > 0 && sp < 1) {
        const r = rng(42); ctx.save(); ctx.lineCap = "round";
        for (let i = 0; i < 70; i++) {
          const a = r() * TAU, v = 300 + r() * 900, life = 0.5 + r() * 0.5; const k = clamp(sp / life); if (k >= 1) { r(); continue; }
          const d = v * E.outCubic(k) * 0.8, x = 960 + Math.cos(a) * d, y = 540 + Math.sin(a) * d + 120 * k * k;
          ctx.strokeStyle = r() > 0.3 ? C.goldL : "#fff"; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 26 * (1 - k), y - Math.sin(a) * 26 * (1 - k)); ctx.stroke();
        }
        ctx.restore();
      }
      if (t > 1.0) { // hub pulse
        const q = ((t - 1.0) % 1.2) / 1.2; ring(ctx, dla[0], dla[1], 22 + q * 50, 2, C.gold, (1 - q) * starA);
      }
    }

    // left typography: departures list
    const exitK = (i) => E.inCubic(prog(t, T.pull + i * 0.05, T.pull + 0.35 + i * 0.05));
    ctx.save();
    const lab = scramble("AU DÉPART DE", prog(t, T.depart, T.depart + 0.5), 3, t);
    ctx.globalAlpha = (1 - exitK(0)) * prog(t, T.depart, T.depart + 0.1);
    ctx.font = `500 28px ${MONO}`; ctx.letterSpacing = "10px"; ctx.fillStyle = C.gold; ctx.fillText(lab, 150 - exitK(0) * 300, 330); ctx.letterSpacing = "0px";
    ctx.restore();
    const rows = [["DLA", "DOUALA", T.douala], ["NSI", "YAOUNDÉ", T.yaounde], ["GOU", "GAROUA", T.garoua]];
    const lineK = E.outCubic(prog(t, T.douala - 0.1, T.garoua + 0.4));
    ctx.save(); ctx.globalAlpha = 1 - exitK(0); ctx.fillStyle = C.gold; ctx.fillRect(118, 300, 3, lerp(0, 470, lineK)); ctx.restore();
    rows.forEach(([code, name, t0], i) => {
      const y = 470 + i * 140, k = E.outExpo(prog(t, t0 - 0.06, t0 + 0.45));
      if (k <= 0) return;
      const next = rows[i + 1] ? rows[i + 1][2] : 99;
      const dim = 1 - 0.62 * prog(t, next - 0.05, next + 0.25);
      const ex = exitK(i + 1);
      ctx.save(); ctx.globalAlpha = dim * (1 - ex); ctx.translate(-ex * 500, 0);
      // badge
      const bk = E.outBack(prog(t, t0 - 0.08, t0 + 0.3), 2.5);
      ctx.save(); ctx.translate(205, y - 34); ctx.scale(bk, bk);
      rr(ctx, -55, -30, 110, 60, 8); ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = "rgba(249,183,28,0.12)"; ctx.fill();
      ctx.font = `700 34px ${MONO}`; ctx.fillStyle = C.gold; ctx.textAlign = "center"; ctx.fillText(scramble(code, prog(t, t0, t0 + 0.35), i * 9, t), 0, 12); ctx.restore();
      maskLine(ctx, k, 290, y, 100, 700, () => {
        letters(ctx, name, 290, y, { font: `900 96px ${MONT}`, spacing: 2, fill: "#fff", each: (j) => ({ dy: (1 - E.outExpo(prog(t, t0 + j * 0.025, t0 + 0.4 + j * 0.025))) * 40 }) });
      });
      ctx.restore();
    });
  }

  // ───────────────────────── scene B: space / "le ciel d'Afrique" ─────────────────────────
  function bez(p0, p1, p2, p3, u) { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; }
  function sceneB(t) {
    if (t < 2.95 || t > 5.6) return;
    // plane crossing with contrails
    const P0 = [520, 1150], P1 = [980, 780], P2 = [1500, 300], P3 = [2200, 160];
    const u = E.inOutCubic(prog(t, 3.2, 5.3));
    if (u > 0 && u < 1) {
      const tail = Math.max(0, u - 0.28);
      ctx.save(); ctx.lineCap = "round";
      for (const off of [-1, 1]) {
        let prev = null;
        for (let i = 0; i <= 40; i++) {
          const uu = lerp(tail, u, i / 40), pt = bez(P0, P1, P2, P3, uu), nx = bez(P0, P1, P2, P3, Math.min(1, uu + 0.001));
          const a = Math.atan2(nx[1] - pt[1], nx[0] - pt[0]), sc = lerp(1.0, 1.6, uu);
          const q = [pt[0] + Math.cos(a + Math.PI / 2) * off * 20 * sc - Math.cos(a) * 18 * sc, pt[1] + Math.sin(a + Math.PI / 2) * off * 20 * sc - Math.sin(a) * 18 * sc];
          if (prev) { ctx.globalAlpha = (i / 40) ** 1.5 * 0.75; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 + 5 * (1 - i / 40); ctx.beginPath(); ctx.moveTo(...prev); ctx.lineTo(...q); ctx.stroke(); }
          prev = q;
        }
      }
      ctx.restore();
      const pt = bez(P0, P1, P2, P3, u), nx = bez(P0, P1, P2, P3, Math.min(1, u + 0.002));
      plane(ctx, pt[0], pt[1], Math.atan2(nx[1] - pt[1], nx[0] - pt[0]), lerp(1.15, 1.8, u), "#fff", 26);
      glowDot(ctx, pt[0], pt[1], 90, "rgba(255,255,255,0.12)");
    }
    const ex = (i) => E.inCubic(prog(t, 4.92 + i * 0.04, 5.17 + i * 0.04));
    // label with star
    const k0 = prog(t, T.camair, T.camair + 0.5);
    if (k0 > 0) {
      ctx.save(); ctx.globalAlpha = (1 - ex(0)); ctx.translate(-ex(0) * 400, 0);
      starPath(ctx, 166, 318, 15 * E.outBack(prog(t, T.camair, T.camair + 0.3), 3)); ctx.fillStyle = C.gold; ctx.fill();
      ctx.font = `700 30px ${MONO}`; ctx.letterSpacing = "12px"; ctx.fillStyle = C.gold; ctx.fillText(scramble("CAMAIR-CO", k0, 11, t), 196, 329); ctx.letterSpacing = "0px";
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = 1 - ex(1); ctx.translate(-ex(1) * 600, 0);
    maskLine(ctx, E.outExpo(prog(t, T.vous - 0.08, T.vous + 0.45)), 150, 450, 92, 600, () => { ctx.font = `600 italic 84px ${PLAY}`; ctx.fillStyle = "#fff"; ctx.fillText("vous ouvre", 150, 450); });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 1 - ex(2); ctx.translate(-ex(2) * 800, 0);
    letters(ctx, "LE CIEL", 146, 630, { font: `900 172px ${MONT}`, spacing: 4, fill: "#fff", each: (i) => { const k = prog(t, T.ciel - 0.06 + i * 0.04, T.ciel + 0.38 + i * 0.04); return { alpha: clamp(k * 3), dy: (1 - E.outBack(k, 2)) * -140, rot: (1 - E.outCubic(k)) * -0.25 }; } });
    ctx.restore();
    const ka = prog(t, T.afrique - 0.04, T.afrique + 0.5);
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

  // ───────────────────────── scene C: regional routes ─────────────────────────
  const ROUTES = [["LBV", T.lbv + 0.05, 0.55], ["COO", T.coo + 0.03, 0.6], ["BZV", T.bzv + 0.02, 0.55], ["NDJ", T.ndj + 0.02, 0.55], ["BGF", T.bgf, 0.4], ["PNR", T.pnr, 0.4]];
  const FLAPS = [["DLA", 0], ["LBV", T.lbv], ["COO", T.coo], ["BZV", T.bzv], ["NDJ", T.ndj]];
  function sceneC(t) {
    if (t < 5.0 || t > 9.0) return;
    const inK = E.outCubic(prog(t, 5.15, 5.6));
    // legibility gradient
    const lg = ctx.createLinearGradient(0, 0, 900, 0); lg.addColorStop(0, "rgba(2,12,7,0.92)"); lg.addColorStop(1, "rgba(2,12,7,0)");
    ctx.save(); ctx.globalAlpha = inK; ctx.fillStyle = lg; ctx.fillRect(0, 0, 900, H); ctx.restore();
    const dla = P(CITY.DLA.ll);
    // routes
    for (const [code, t0, d] of ROUTES) {
      if (t < t0) continue;
      const k = E.inOutCubic(prog(t, t0, t0 + d)), dest = CITY[code], q = P(dest.ll);
      drawRoute(routePts(CITY.DLA.ll, dest.ll, 48, 0.18), k, C.goldL, 3, true, 0.22);
      pin(q[0], q[1], t0 + d - 0.05, t);
      mapLabel(q[0], q[1], code, dest.name, dest.dir, t0 + d - 0.02, t);
    }
    // domestic dots + hub star
    for (const c of ["NSI", "GOU"]) { const q = P(CITY[c].ll); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, TAU); ctx.fill(); }
    const hq = ((t - 5) % 1.2) / 1.2; ring(ctx, dla[0], dla[1], 18 + hq * 46, 2, C.gold, 1 - hq);
    glowDot(ctx, dla[0], dla[1], 46, "rgba(249,183,28,0.5)");
    starPath(ctx, dla[0], dla[1], 17, -Math.PI / 2 + Math.sin(t * 2) * 0.1); ctx.fillStyle = C.gold; ctx.fill();
    // HUD corners
    ctx.save(); ctx.globalAlpha = inK * 0.5; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    for (const [x, y, sx, sy] of [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * 44); ctx.lineTo(x, y); ctx.lineTo(x + sx * 44, y); ctx.stroke(); }
    ctx.font = `500 18px ${MONO}`; ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.letterSpacing = "4px";
    const cur = FLAPS.filter((f) => t >= f[1]).pop()[0], ll = CITY[cur].ll;
    ctx.fillText(scramble(`${Math.abs(ll[1]).toFixed(2)}°${ll[1] >= 0 ? "N" : "S"}  ${ll[0].toFixed(2)}°E`, prog(t, FLAPS.filter((f) => t >= f[1]).pop()[1], FLAPS.filter((f) => t >= f[1]).pop()[1] + 0.4), 5, t), W - 80, 92);
    ctx.textAlign = "left"; ctx.fillText("QC · ROUTES", 80, H - 76); ctx.letterSpacing = "0px"; ctx.restore();

    // left panel: split-flap board
    ctx.save(); ctx.globalAlpha = inK; ctx.translate((1 - inK) * -120, 0);
    ctx.font = `500 24px ${MONO}`; ctx.letterSpacing = "6px"; ctx.fillStyle = C.gold;
    ctx.fillText(scramble("VOLS AU DÉPART DE DOUALA", prog(t, 5.15, 5.7), 21, t), 140, 262); ctx.letterSpacing = "0px";
    const cur2 = FLAPS.filter((f) => t >= f[1]).pop(), idx = FLAPS.indexOf(cur2), prev = idx > 0 ? FLAPS[idx - 1][0] : "DLA";
    for (let i = 0; i < 3; i++) {
      const seq = idx > 0 ? flapSeq(prev[i], cur2[0][i], cur2[1] * 10 + i) : [cur2[0][i]];
      flapCell(140 + i * 164, 296, 150, 196, seq, cur2[1] + i * 0.06, t, `700 150px ${MONO}`, i === 1 ? C.goldL : "#fff");
    }
    // city name swap
    const name = CITY[cur2[0]].name, k = E.outExpo(prog(t, cur2[1], cur2[1] + 0.45));
    const prevName = idx > 0 ? CITY[prev].name : "";
    ctx.save(); ctx.beginPath(); ctx.rect(120, 520, 760, 110); ctx.clip();
    if (prevName && k < 1) { ctx.font = `900 76px ${MONT}`; ctx.fillStyle = "#fff"; ctx.globalAlpha *= 1 - k; ctx.fillText(prevName, 140, 608 - k * 100); ctx.globalAlpha /= Math.max(0.001, 1 - k); }
    letters(ctx, name, 140, 608 + (1 - k) * 100, { font: `900 76px ${MONT}`, spacing: 1, fill: "#fff" });
    ctx.restore();
    // progress pips (one per announced city)
    for (let i = 0; i < 4; i++) { const on = t >= FLAPS[i + 1][1]; ctx.fillStyle = on ? C.gold : "rgba(255,255,255,0.18)"; ctx.fillRect(140 + i * 46, 660, 36, 5); }
    ctx.restore();
  }

  // ───────────────────────── tri-colour wipe ─────────────────────────
  const WIPE_W = 300, SKEW = 260;
  function wipeEdge(t) { return lerp(-SKEW, W + 3 * WIPE_W + SKEW, E.inOutCubic(prog(t, T.wipe, T.wipe + 0.42))); }
  function bandPath(x0, x1) { ctx.beginPath(); ctx.moveTo(x0 + SKEW, 0); ctx.lineTo(x1 + SKEW, 0); ctx.lineTo(x1 - SKEW * 0.2, H); ctx.lineTo(x0 - SKEW * 0.2, H); ctx.closePath(); }

  // ───────────────────────── scene D: cabin (boarding pass, window) ─────────────────────────
  const CLOUDS = (() => {
    const r = rng(99), layers = [];
    for (let L = 0; L < 3; L++) {
      const list = [];
      for (let i = 0; i < 9; i++) { const puffs = []; const n = 5 + Math.floor(r() * 6); for (let j = 0; j < n; j++) puffs.push([r() * 160 - 80, r() * 30 - 15, 26 + r() * 46]); list.push({ x: i * 170 + r() * 80, y: r() * 60, puffs }); }
      layers.push(list);
    }
    return layers;
  })();
  const WIN = { x: 1390, y: 560, w: 430, h: 600, r: 190 };
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
  function cabinWall(t) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#f7f2e7"); g.addColorStop(1, "#ece3d1");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // subtle dotted grid
    ctx.fillStyle = "rgba(10,59,37,0.07)";
    for (let y = 40; y < H; y += 44) for (let x = 40 + ((y / 44) % 2) * 22; x < W; x += 44) ctx.fillRect(x, y, 3, 3);
    // flag stripe at the bottom
    const k = E.outExpo(prog(t, T.wipe + 0.3, T.wipe + 1.1));
    [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(0, H - 18 + i * 6, W * k, 6); });
  }
  function boardingPass(t) {
    const k = prog(t, T.voyagez - 0.15, T.voyagez + 0.55); if (k <= 0) return;
    const out = E.inCubic(prog(t, T.cardOut, T.cardOut + 0.3));
    if (out >= 1) return;
    const e = E.outBack(k, 1.4);
    const cx = lerp(1900, 1350, e) + out * 1100, cy = lerp(760, 560, e) - out * 700;
    const rot = lerp(0.5, -0.06, e) + out * 0.6, flip = Math.cos(lerp(1.25, 0, E.outCubic(k)));
    const cw = 820, ch = 380;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(flip, 1);
    // stamp shake
    const shake = (1 - prog(t, T.stamp, T.stamp + 0.25)) * (t > T.stamp ? 1 : 0);
    ctx.translate(Math.sin(t * 90) * 5 * shake, Math.cos(t * 77) * 5 * shake);
    // shadow
    ctx.save(); ctx.translate(18, 34); rr(ctx, -cw / 2, -ch / 2, cw, ch, 26); ctx.fillStyle = "rgba(10,40,25,0.18)"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(8, 14); rr(ctx, -cw / 2, -ch / 2, cw, ch, 26); ctx.fillStyle = "rgba(10,40,25,0.12)"; ctx.fill(); ctx.restore();
    // card body with notch cut-outs
    const stubX = cw / 2 - 210;
    ctx.save(); rr(ctx, -cw / 2, -ch / 2, cw, ch, 26);
    ctx.moveTo(stubX + 17, -ch / 2); ctx.arc(stubX + 1, -ch / 2, 16, 0, TAU); ctx.moveTo(stubX + 17, ch / 2); ctx.arc(stubX + 1, ch / 2, 16, 0, TAU);
    ctx.clip("evenodd");
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.fillStyle = C.ink; ctx.fillRect(-cw / 2, -ch / 2, cw, 78);
    [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(-cw / 2, -ch / 2 + 78 + i * 5, cw, 5); });
    starPath(ctx, -cw / 2 + 46, -ch / 2 + 39, 15); ctx.fillStyle = C.gold; ctx.fill();
    ctx.font = `900 30px ${MONT}`; ctx.letterSpacing = "3px"; ctx.fillStyle = "#fff"; ctx.fillText("CAMAIR-CO", -cw / 2 + 72, -ch / 2 + 50);
    ctx.font = `500 16px ${MONO}`; ctx.letterSpacing = "4px"; ctx.fillStyle = C.gold; ctx.textAlign = "right"; ctx.fillText("CARTE D’EMBARQUEMENT", cw / 2 - 30, -ch / 2 + 47); ctx.textAlign = "left"; ctx.letterSpacing = "0px";
    // perforation
    ctx.fillStyle = "rgba(10,59,37,0.25)"; for (let y = -ch / 2 + 100; y < ch / 2 - 12; y += 16) ctx.fillRect(stubX, y, 2, 8);
    ctx.restore();
    // fields
    const f = (i) => E.outCubic(prog(t, T.voyagez + 0.12 + i * 0.07, T.voyagez + 0.5 + i * 0.07));
    const field = (i, x, y, lab, val, size = 46, mono = false, col = C.ink) => {
      const a = f(i); if (a <= 0) return;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 14);
      ctx.font = `500 14px ${MONO}`; ctx.letterSpacing = "3px"; ctx.fillStyle = "rgba(10,59,37,0.55)"; ctx.fillText(lab, x, y); ctx.letterSpacing = "0px";
      ctx.font = mono ? `700 ${size}px ${MONO}` : `900 ${size}px ${MONT}`; ctx.fillStyle = col; ctx.fillText(val, x, y + size + 4); ctx.restore();
    };
    const x0 = -cw / 2 + 40;
    field(0, x0, -40, "DE", "DLA", 86);
    ctx.save(); ctx.globalAlpha *= f(1); ctx.font = `600 20px ${MONT}`; ctx.fillStyle = "rgba(10,59,37,0.7)"; ctx.fillText("Douala", x0, 82); ctx.restore();
    // plane between codes
    if (f(1) > 0) {
      const pk = E.inOutCubic(prog(t, T.voyagez + 0.25, T.voyagez + 0.9));
      ctx.save(); ctx.strokeStyle = "rgba(10,59,37,0.3)"; ctx.setLineDash([4, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 205, 16); ctx.lineTo(x0 + 205 + 120 * pk, 16); ctx.stroke(); ctx.restore();
      plane(ctx, x0 + 205 + 120 * pk, 16, 0, 0.42, C.red);
    }
    // destination code — split-flap style roll ending on LBV
    if (f(2) > 0) {
      ctx.save(); ctx.globalAlpha *= f(2);
      ctx.font = `500 14px ${MONO}`; ctx.letterSpacing = "3px"; ctx.fillStyle = "rgba(10,59,37,0.55)"; ctx.fillText("À", x0 + 360, -40); ctx.letterSpacing = "0px";
      const codes = ["NDJ", "BZV", "COO", "BGF", "LBV"], ci = Math.min(codes.length - 1, Math.floor(prog(t, T.voyagez + 0.2, T.confiance + 0.1) * codes.length));
      ctx.font = `900 86px ${MONT}`; ctx.fillStyle = C.ink; ctx.fillText(codes[ci], x0 + 360, 50);
      ctx.font = `600 20px ${MONT}`; ctx.fillStyle = "rgba(10,59,37,0.7)"; ctx.fillText(ci === codes.length - 1 ? "Libreville" : "…", x0 + 360, 82); ctx.restore();
    }
    field(3, x0, 112, "PASSAGER", "VOUS", 30);
    field(4, x0 + 200, 112, "VOL", "QC", 30, true);
    field(5, x0 + 330, 112, "SIÈGE", "1A", 30, true, C.red);
    // barcode on stub
    const bk = prog(t, T.voyagez + 0.3, T.voyagez + 0.9);
    if (bk > 0) {
      const r = rng(5); let x = stubX + 34;
      ctx.fillStyle = C.ink;
      while (x < cw / 2 - 30) { const w = 2 + Math.floor(r() * 4); if (x < stubX + 34 + (cw / 2 - 64 - stubX) * bk) ctx.fillRect(x, -60, w, 150); x += w + 2 + Math.floor(r() * 4); }
      ctx.font = `700 22px ${MONO}`; ctx.fillStyle = C.ink; ctx.globalAlpha = bk; ctx.fillText("DLA→LBV", stubX + 34, -82); ctx.globalAlpha = 1;
    }
    // stamp
    const sk = prog(t, T.stamp - 0.08, T.stamp + 0.04);
    if (sk > 0) {
      ctx.save(); ctx.translate(292, 58); ctx.rotate(-0.22); const s = lerp(2.0, 0.78, E.inCubic(sk)); ctx.scale(s, s); ctx.globalAlpha = clamp(sk * 1.5) * 0.92;
      ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 92, 0, TAU); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 80, 0, TAU); ctx.stroke();
      ctx.fillStyle = C.red; ctx.textAlign = "center"; ctx.font = `900 30px ${MONT}`; ctx.fillText("BON", 0, -4); ctx.fillText("VOYAGE", 0, 30);
      starPath(ctx, 0, -44, 12); ctx.fill(); ctx.textAlign = "left"; ctx.restore();
    }
    ctx.restore();
  }
  function sceneD(t) {
    cabinWall(t);
    // headline "Voyagez en confiance"
    const out1 = E.inCubic(prog(t, T.cardOut - 0.04, T.cardOut + 0.24));
    if (out1 < 1) {
      ctx.save(); ctx.globalAlpha = 1 - out1; ctx.translate(0, -out1 * 160);
      letters(ctx, "Voyagez", 140, 470, { font: `900 150px ${MONT}`, spacing: 0, fill: C.ink, each: (i) => { const k = prog(t, T.voyagez - 0.05 + i * 0.035, T.voyagez + 0.35 + i * 0.035); return { alpha: clamp(k * 2), dy: (1 - E.outBack(k, 1.8)) * 90, scale: lerp(0.6, 1, E.outBack(k, 2)) }; } });
      maskLine(ctx, E.outExpo(prog(t, T.confiance - 0.1, T.confiance + 0.4)), 150, 610, 130, 760, () => { ctx.font = `700 italic 124px ${PLAY}`; ctx.fillStyle = C.red; ctx.fillText("en confiance", 146, 608); });
      const tk = prog(t, T.confiance + 0.05, T.confiance + 0.38);
      ctx.font = `500 22px ${MONO}`; ctx.letterSpacing = "6px"; ctx.fillStyle = "rgba(10,59,37,0.75)";
      ctx.fillText("SÉCURITÉ · CONFORT · SÉRÉNITÉ".slice(0, Math.ceil(29 * tk)), 150, 690); ctx.letterSpacing = "0px";
      ctx.restore();
    }
    boardingPass(t);
    if (t < T.cardOut) return;
    // window
    const wk = prog(t, T.cardOut + 0.04, T.cardOut + 0.42);
    if (wk <= 0) return;
    const ws = E.outBack(wk, 1.6);
    // light shaft on the wall
    const blind = E.inOutCubic(prog(t, T.portes + 0.05, T.portes + 0.55));
    if (blind > 0) {
      const sg = ctx.createLinearGradient(WIN.x, WIN.y, 300, 1000); sg.addColorStop(0, `rgba(255,190,100,${0.28 * blind})`); sg.addColorStop(1, "rgba(255,190,100,0)");
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(WIN.x - WIN.w / 2, WIN.y - WIN.h / 2 + 60); ctx.lineTo(WIN.x - WIN.w / 2, WIN.y + WIN.h / 2); ctx.lineTo(500, H); ctx.lineTo(0, H); ctx.lineTo(0, 700); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.translate(WIN.x, WIN.y); ctx.scale(ws, ws); ctx.translate(-WIN.x, -WIN.y);
    // bezel
    windowShape(ctx, 46); const bg = ctx.createLinearGradient(WIN.x - 300, WIN.y - 400, WIN.x + 300, WIN.y + 400); bg.addColorStop(0, "#fffaf0"); bg.addColorStop(1, "#d7ccb5"); ctx.fillStyle = bg; ctx.fill();
    windowShape(ctx, 46); ctx.strokeStyle = "rgba(120,100,60,0.35)"; ctx.lineWidth = 2; ctx.stroke();
    windowShape(ctx, 14); ctx.fillStyle = "#cfc3aa"; ctx.fill();
    // sky
    ctx.save(); windowShape(ctx); ctx.clip(); sky(t);
    // blind
    const top = WIN.y - WIN.h / 2, bh = WIN.h * (1 - blind);
    if (bh > 1) {
      const bgd = ctx.createLinearGradient(0, top, 0, top + bh); bgd.addColorStop(0, "#efe8d9"); bgd.addColorStop(1, "#e2d8c3");
      ctx.fillStyle = bgd; ctx.fillRect(WIN.x - WIN.w / 2, top, WIN.w, bh);
      ctx.fillStyle = "rgba(0,0,0,0.05)"; for (let y = top + 30; y < top + bh; y += 30) ctx.fillRect(WIN.x - WIN.w / 2, y, WIN.w, 2);
      ctx.fillStyle = "#b9ab8f"; rr(ctx, WIN.x - 40, top + bh - 22, 80, 14, 7); ctx.fill();
    }
    // glass sheen
    const gl = ctx.createLinearGradient(WIN.x - WIN.w / 2, top, WIN.x + WIN.w / 2, top + WIN.h); gl.addColorStop(0.2, "rgba(255,255,255,0)"); gl.addColorStop(0.32, "rgba(255,255,255,0.18)"); gl.addColorStop(0.38, "rgba(255,255,255,0)");
    ctx.fillStyle = gl; ctx.fillRect(WIN.x - WIN.w / 2, top, WIN.w, WIN.h);
    ctx.restore();
    ctx.restore();
    // dust motes in the light
    if (blind > 0) {
      const r = rng(17);
      for (let i = 0; i < 40; i++) { const x = r() * 1100 + 100, y = ((r() * H - t * (8 + r() * 20)) % H + H) % H, s = 1 + r() * 2.5; ctx.fillStyle = `rgba(255,200,120,${0.5 * blind * (0.4 + 0.6 * Math.sin(t * 2 + i))})`; ctx.fillRect(x, y, s, s); }
    }
    // headline 2
    const ink = C.ink;
    maskLine(ctx, E.outExpo(prog(t, T.portes, T.portes + 0.45)), 150, 400, 80, 600, () => { ctx.font = `600 italic 64px ${PLAY}`; ctx.fillStyle = ink; ctx.fillText("portés par", 146, 400); });
    letters(ctx, "l’hospitalité", 130, 580, { font: `700 italic 150px ${PLAY}`, fill: ink, each: (i) => { const k = prog(t, T.hosp - 0.04 + i * 0.03, T.hosp + 0.4 + i * 0.03); return { alpha: clamp(k * 2.5), dy: (1 - E.outCubic(k)) * 60, rot: (1 - E.outCubic(k)) * 0.35 }; } });
    const ck = prog(t, T.cam - 0.06, T.cam + 0.45);
    letters(ctx, "CAMEROUNAISE", 140, 720, { font: `900 100px ${MONT}`, spacing: 6, fill: C.red, each: (i, n) => { const k = prog(t, T.cam - 0.06 + (n - 1 - i) * 0.02, T.cam + 0.3 + (n - 1 - i) * 0.02); return { alpha: clamp(k * 3), dx: (1 - E.outExpo(k)) * 120, scale: 1 }; } });
    if (ck > 0) { const u = E.outExpo(prog(t, T.cam + 0.15, T.cam + 0.7)); [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(146, 752 + i * 7, 780 * u, 7); }); }
    const bk = prog(t, T.cam + 0.3, T.cam + 0.75);
    if (bk > 0) { ctx.font = `500 24px ${MONO}`; ctx.letterSpacing = "8px"; ctx.fillStyle = "rgba(10,59,37,0.75)"; ctx.fillText("BIENVENUE À BORD".slice(0, Math.ceil(16 * bk)), 150, 840); ctx.letterSpacing = "0px"; }
  }

  // ───────────────────────── scene E: end card ─────────────────────────
  const wm = document.createElement("canvas"); wm.width = 1400; wm.height = 260; const wctx = wm.getContext("2d");
  function sceneE(t) {
    const g = ctx.createRadialGradient(960, 470, 50, 960, 540, 1250); g.addColorStop(0, "#0d4a30"); g.addColorStop(0.55, "#06281a"); g.addColorStop(1, "#010a06");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // giant ghost star
    ctx.save(); ctx.globalAlpha = 0.06; starPath(ctx, 960, 560, 900 + (t - 12) * 30, -Math.PI / 2 + (t - 12) * 0.05); ctx.strokeStyle = C.goldL; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    // rays
    const mk = E.inOutCubic(prog(t, 12.4, 12.95));
    const sx = 960, sy = lerp(540, 300, mk), sr = lerp(120, 58, mk);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.25); ctx.globalAlpha = 0.22;
    for (let i = 0; i < 24; i++) { ctx.rotate(TAU / 24); const rg = ctx.createLinearGradient(0, 0, 0, -1100); rg.addColorStop(0, "rgba(255,217,112,0.55)"); rg.addColorStop(1, "rgba(255,217,112,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(0, -1100); ctx.fill(); }
    ctx.restore();
    // drifting gold dust
    const r = rng(3);
    for (let i = 0; i < 90; i++) { const x = r() * W, y = ((r() * H - (t - 12) * (20 + r() * 50)) % H + H) % H, s = 1 + r() * 2.6; ctx.fillStyle = `rgba(255,217,112,${0.15 + 0.35 * r()})`; ctx.fillRect(x, y, s, s); }
    // star
    glowDot(ctx, sx, sy, sr * 4, "rgba(249,183,28,0.45)");
    starPath(ctx, sx, sy, sr, -Math.PI / 2 + (1 - E.outBack(prog(t, 12.33, 12.9), 1.5)) * 1.2); ctx.fillStyle = C.gold; ctx.fill();
    const sw = prog(t, T.logo, T.logo + 0.6); if (sw > 0 && sw < 1) ring(ctx, sx, sy, 80 + E.outCubic(sw) * 650, 18 * (1 - sw), "#ffe9a8", 1 - sw);
    // wordmark (drawn offscreen for the shimmer pass)
    wctx.clearRect(0, 0, wm.width, wm.height);
    const wy = 190;
    letters(wctx, "CAMAIR-CO", 700, wy, { font: `900 156px ${MONT}`, spacing: 14, align: "center", fill: "#fff", each: (i) => {
      const k = prog(t, T.logo + 0.05 + i * 0.035, T.logo + 0.5 + i * 0.035);
      return { alpha: clamp(k * 2.5), dy: (1 - E.outExpo(k)) * 120, fill: i === 6 ? C.gold : "#fff" }; } });
    const shk = prog(t, 14.15, 14.75);
    if (shk > 0 && shk < 1) {
      wctx.save(); wctx.globalCompositeOperation = "source-atop";
      const x = lerp(-300, 1700, E.inOutCubic(shk)); const sg = wctx.createLinearGradient(x - 160, 0, x + 160, 260);
      sg.addColorStop(0, "rgba(255,230,160,0)"); sg.addColorStop(0.5, "rgba(255,236,170,0.95)"); sg.addColorStop(1, "rgba(255,230,160,0)");
      wctx.fillStyle = sg; wctx.fillRect(0, 0, 1400, 260); wctx.restore();
    }
    ctx.drawImage(wm, 960 - 700, 600 - wy);
    // tri-colour bar
    const bk = E.outExpo(prog(t, T.logo + 0.45, T.logo + 1.0));
    if (bk > 0) { const bw = 600 * bk; [C.green, C.red, C.gold].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(960 - bw / 2 + (i * bw) / 3, 650, bw / 3 + 0.5, 7); }); }
    // tagline
    letters(ctx, "L’étoile du Cameroun", 960, 770, { font: `700 italic 84px ${PLAY}`, align: "center", fill: C.goldL, each: (i) => { const k = prog(t, T.etoile - 0.08 + i * 0.022, T.etoile + 0.4 + i * 0.022); return { alpha: k, dy: (1 - E.outCubic(k)) * 26 }; } });
    // url
    const uk = prog(t, T.url, T.url + 0.5);
    if (uk > 0) { ctx.font = `500 30px ${MONO}`; ctx.letterSpacing = "6px"; ctx.textAlign = "center"; ctx.fillStyle = `rgba(255,255,255,${0.8 * clamp(uk * 2)})`; ctx.fillText(scramble("www.camair-co.cm", uk, 77, t), 960, 880); ctx.textAlign = "left"; ctx.letterSpacing = "0px"; }
  }

  // ───────────────────────── post ─────────────────────────
  const grain = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const im = g.createImageData(256, 256); const r = rng(1); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return c; })();
  const grainPat = ctx.createPattern(grain, "repeat");
  function post(t, light) {
    // vignette
    const v = ctx.createRadialGradient(960, 540, 520, 960, 540, 1200);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, light ? "rgba(70,50,20,0.22)" : "rgba(0,0,0,0.45)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // flashes
    const f1 = t > 0.4 ? Math.max(0, 1 - (t - 0.4) / 0.35) * prog(t, 0.36, 0.42) : 0;
    const f2 = prog(t, 12.18, 12.35) * (1 - prog(t, 12.35, 12.75));
    if (f1 > 0) { ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = `rgba(255,205,110,${f1 * 0.42})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (f2 > 0) { ctx.fillStyle = `rgba(255,244,214,${f2 * 0.92})`; ctx.fillRect(0, 0, W, H); }
    // film grain
    ctx.save(); ctx.globalAlpha = light ? 0.05 : 0.07; ctx.globalCompositeOperation = "overlay";
    const ox = Math.floor(hash(Math.floor(t * 30)) * 256), oy = Math.floor(hash(Math.floor(t * 30) + 9) * 256);
    ctx.translate(-ox, -oy); ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
  }

  // ───────────────────────── composition ─────────────────────────
  function shakeAt(t) {
    let s = 0;
    for (const [t0, a] of [[0.42, 9], [T.stamp, 0], [T.logo, 7]]) { const k = prog(t, t0, t0 + 0.35); if (k > 0 && k < 1) s += a * (1 - k) ** 2; }
    return [Math.sin(t * 83) * s, Math.cos(t * 71) * s];
  }
  function render(t) {
    t = clamp(t, 0, DUR);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const [sx, sy] = shakeAt(t); ctx.translate(sx, sy);
    let light = false;
    if (t < T.wipe + 0.45) {
      const cam = drawWorld(t); sceneA(t, cam); sceneB(t); sceneC(t);
    }
    if (t >= T.wipe && t < T.logo - 0.05) {
      const edge = wipeEdge(t), inWipe = t < T.wipe + 0.45;
      ctx.save();
      if (inWipe) { bandPath(-W, edge - 3 * WIPE_W); ctx.clip(); }
      // dive into the window towards the sun
      const dk = prog(t, T.dive, T.logo - 0.02);
      if (dk > 0) {
        const z = Math.exp(E.inCubic(dk) * Math.log(18)), m = E.inOutCubic(dk);
        ctx.translate(lerp(SUN.x, 960, m), lerp(SUN.y, 540, m)); ctx.scale(z, z); ctx.translate(-SUN.x, -SUN.y);
      }
      sceneD(t); light = dk < 0.5;
      ctx.restore();
      if (inWipe) {
        const cols = [C.green, C.red, C.gold];
        cols.forEach((col, i) => { bandPath(edge - (i + 1) * WIPE_W, edge - i * WIPE_W + 2); ctx.fillStyle = col; ctx.fill(); });
      }
    }
    if (t >= T.logo - 0.05) sceneE(t);
    post(t, light);
    ctx.restore();
  }

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

  window.spot = { DUR, T, ready: fontsReady, renderFrame };

  // ───────────────────────── live preview ─────────────────────────
  if (new URLSearchParams(location.search).has("render")) { document.body.classList.add("render"); return; }
  const audio = document.getElementById("audio"), btn = document.getElementById("play"), scrub = document.getElementById("scrub"), label = document.getElementById("time");
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
