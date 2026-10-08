// Render a spot page with headless Chromium.
//   node scripts/render.mjs stills <page> <dir> 0.3,1.2,...     → PNG stills (no motion blur) for review
//   node scripts/render.mjs video <page> <out.mp4> [fps] [workers] → H.264 video with sub-frame motion blur
// <page> is relative to the project root, e.g. src/index.html (15 s) or long/src/index.html (88 s).
// The page exposes window.spot = { DUR, ready, renderFrame(t, samples, shutter), samplesAt?(t) }.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join, resolve, dirname } from "node:path";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".m4a": "audio/mp4", ".css": "text/css" };
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(ROOT)) throw new Error("outside root");
    const body = await readFile(p);
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));

const [mode, pagePath, target, arg3, arg4] = process.argv.slice(2);
const url = `http://127.0.0.1:${server.address().port}/${pagePath}?render`;
const browser = await chromium.launch({ args: ["--disable-gpu-vsync", "--force-color-profile=srgb"] });

async function openPage() {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.error("PAGE ERROR:", e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.evaluate(() => window.spot.ready);
  return page;
}
const grab = async (page, t, samples, shutter) => {
  const data = await page.evaluate(([t, s, sh]) => {
    const n = s === "auto" ? (window.spot.samplesAt ? window.spot.samplesAt(t) : 5) : s;
    window.spot.renderFrame(t, n, sh);
    return document.getElementById("stage").toDataURL("image/png");
  }, [t, samples, shutter]);
  return Buffer.from(data.split(",")[1], "base64");
};

if (mode === "stills") {
  const page = await openPage();
  await mkdir(target, { recursive: true });
  for (const t of arg3.split(",").map(Number)) {
    await writeFile(join(target, `f_${t.toFixed(2).padStart(5, "0")}.png`), await grab(page, t, 1, 0));
  }
  console.log(`stills → ${target}`);
} else if (mode === "video") {
  const fps = Number(arg3 || 30), workers = Number(arg4 || 3), shutter = 0.5 / fps; // 180° shutter
  const probe = await openPage();
  const frames = Math.round((await probe.evaluate(() => window.spot.DUR)) * fps);
  await probe.context().close();
  const tmp = join(dirname(resolve(target)), `.chunks-${Date.now()}`);
  await mkdir(tmp, { recursive: true });
  const t0 = Date.now(), per = Math.ceil(frames / workers);
  let done = 0;
  const encode = async (w) => {
    const page = await openPage(), a = w * per, b = Math.min(frames, a + per), file = join(tmp, `chunk${w}.mp4`);
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", file], { stdio: ["pipe", "inherit", "inherit"] });
    for (let i = a; i < b; i++) {
      const png = await grab(page, i / fps, "auto", shutter);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
      if (++done % 60 === 0) console.log(`${done}/${frames} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    return file;
  };
  const files = await Promise.all(Array.from({ length: workers }, (_, w) => encode(w)));
  await writeFile(join(tmp, "list.txt"), files.map((f) => `file '${f}'`).join("\n"));
  await new Promise((r, j) => spawn("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(tmp, "list.txt"), "-c", "copy", "-movflags", "+faststart", target], { stdio: "inherit" }).on("close", (c) => (c ? j(new Error("concat failed")) : r())));
  await rm(tmp, { recursive: true });
  console.log(`done: ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${target}`);
}
await browser.close();
server.close();
