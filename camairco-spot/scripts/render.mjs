// Render the spot with headless Chromium.
//   node scripts/render.mjs stills <dir> 0.3,1.2,...   → PNG stills (no motion blur) for review
//   node scripts/render.mjs video <out.mp4> [fps] [samples]  → H.264 video, sub-frame motion blur
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join, resolve } from "node:path";
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
const url = `http://127.0.0.1:${server.address().port}/src/index.html?render`;

const browser = await chromium.launch({ args: ["--disable-gpu-vsync", "--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.error("PAGE ERROR:", e.message); process.exitCode = 1; });
page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await page.goto(url);
await page.evaluate(() => window.spot.ready);

const grab = async (t, samples, shutter) => {
  const data = await page.evaluate(([t, s, sh]) => { window.spot.renderFrame(t, s, sh); return document.getElementById("stage").toDataURL("image/png"); }, [t, samples, shutter]);
  return Buffer.from(data.split(",")[1], "base64");
};

const [mode, target, arg2, arg3] = process.argv.slice(2);
if (mode === "stills") {
  await mkdir(target, { recursive: true });
  for (const t of arg2.split(",").map(Number)) {
    const t0 = Date.now();
    await writeFile(join(target, `f_${t.toFixed(2).padStart(5, "0")}.png`), await grab(t, 1, 0));
    console.log(`t=${t} ${Date.now() - t0}ms`);
  }
} else if (mode === "video") {
  const fps = Number(arg2 || 30), samples = Number(arg3 || 5), shutter = 0.5 / fps; // 180° shutter
  const frames = Math.round(15 * fps);
  const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart", target], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const png = await grab(i / fps, samples, shutter);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 30 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${target}`);
}
await browser.close();
server.close();
