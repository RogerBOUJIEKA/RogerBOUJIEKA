// Headless render of src/index.html.
//   node scripts/render.mjs stills <dir> 60,270,500       → PNG stills at those frame numbers (29.97 fps units)
//   node scripts/render.mjs video <out.mp4> <fps> <fromSec> <toSec> [workers] [height]
//     fps 59.94 renders half frames (f = i/2); chunks of 120 frames are cached in <out>.chunks/ so a stopped render resumes.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rename, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join, resolve } from "node:path";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(ROOT)) throw 0;
    const body = await readFile(p);
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/src/index.html?render`;
const browser = await chromium.launch({ args: ["--force-color-profile=srgb", "--disable-gpu-vsync"] });
async function openPage() {
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
  page.on("pageerror", (e) => { console.error("PAGE ERROR:", e.message); process.exitCode = 1; });
  page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
  await page.goto(url);
  await page.evaluate(() => window.spot.ready);
  return page;
}
const grab = async (page, f) => Buffer.from((await page.evaluate(async (f) => { await window.spot.renderFrame(f); return document.getElementById("stage").toDataURL("image/png"); }, f)).split(",")[1], "base64");
const exists = (p) => access(p).then(() => true, () => false);

const [mode, target, a3, a4, a5, a6, a7] = process.argv.slice(2);
if (mode === "stills") {
  const page = await openPage();
  await mkdir(target, { recursive: true });
  for (const f of a3.split(",").map(Number)) await writeFile(join(target, `f${String(f).padStart(4, "0")}.png`), await grab(page, f));
  console.log("stills →", target);
} else {
  const fps = Number(a3), from = Number(a4), to = Number(a5), workers = Number(a6 || 3), height = Number(a7 || 1080);
  const step = 29.97 / fps, i0 = Math.round(from * fps), i1 = Math.round(to * fps), CH = 120;
  const dir = resolve(`${target}.chunks`);
  await mkdir(dir, { recursive: true });
  const chunks = [];
  for (let a = i0; a < i1; a += CH) chunks.push([a, Math.min(i1, a + CH)]);
  const rate = fps > 40 ? "60000/1001" : "30000/1001";
  const t0 = Date.now();
  let next = 0, done = 0;
  const worker = async () => {
    const page = await openPage();
    while (next < chunks.length) {
      const [a, b] = chunks[next++], file = join(dir, `c${String(a).padStart(6, "0")}_${b}.mp4`);
      if (await exists(file)) { done += b - a; continue; }
      const vf = height !== 1080 ? ["-vf", `scale=-2:${height}:flags=lanczos`] : [];
      const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", rate, "-i", "-", ...vf, "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", rate, file + ".tmp.mp4"], { stdio: ["pipe", "inherit", "inherit"] });
      for (let i = a; i < b; i++) {
        const png = await grab(page, i * step);
        if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
      }
      ff.stdin.end();
      await new Promise((r) => ff.on("close", r));
      await rename(file + ".tmp.mp4", file);
      done += b - a;
      console.log(`${done}/${i1 - i0} frames  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  };
  await Promise.all(Array.from({ length: workers }, worker));
  const list = chunks.map(([a, b]) => `file '${join(dir, `c${String(a).padStart(6, "0")}_${b}.mp4`)}'`).join("\n");
  await writeFile(join(dir, "list.txt"), list);
  await new Promise((r, j) => spawn("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-c", "copy", "-movflags", "+faststart", target], { stdio: "inherit" }).on("close", (c) => (c ? j(new Error("concat")) : r())));
  console.log(`done → ${target} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await browser.close();
server.close();
