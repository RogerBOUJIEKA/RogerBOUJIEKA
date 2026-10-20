// Rend la scène HTML image par image avec Chromium (Playwright) et encode en MP4.
//
//   node render.mjs --w 1920 --h 1080 --out ../output/video_16x9.mp4 [--workers 4] [--fps 30]
//   node render.mjs --w 1920 --h 1080 --stills 3.5,31.2,70 --outdir /tmp/stills
//   node render.mjs --w 1920 --h 1080 --cues cues.json
import { createRequire } from 'module';
import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalRoot, 'playwright'));

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const W = +(args.w || 1920), H = +(args.h || 1080), FPS = +(args.fps || 30);
const here = path.dirname(fileURLToPath(import.meta.url));
const sceneDir = path.resolve(here, '../scene');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(sceneDir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!p.startsWith(sceneDir) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?w=${W}&h=${H}`;

const browser = await chromium.launch({ args: ['--disable-web-security', '--font-render-hinting=none', '--disable-lcd-text'] });

async function openPage() {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}

async function frame(page, t, type = 'png') {
  await page.evaluate(tt => window.renderFrame(tt), t);
  return page.screenshot({ type, clip: { x: 0, y: 0, width: W, height: H } });
}

if (args.cues) {
  const page = await openPage();
  const cues = await page.evaluate(() => window.CUES);
  fs.writeFileSync(args.cues, JSON.stringify(cues, null, 1));
  console.log(`${cues.length} cues -> ${args.cues}`);
} else if (args.stills) {
  const page = await openPage();
  fs.mkdirSync(args.outdir, { recursive: true });
  for (const t of String(args.stills).split(',').map(Number)) {
    const buf = await frame(page, t, 'jpeg');
    const f = path.join(args.outdir, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
    fs.writeFileSync(f, buf);
  }
  console.log('stills ok');
} else if (args.out) {
  const total = await (await openPage()).evaluate(() => window.TOTAL);
  const nFrames = Math.round(total * FPS);
  const workers = +(args.workers || 4);
  const chunk = Math.ceil(nFrames / workers);
  const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(args.out)), '.chunks-'));
  const started = Date.now();
  let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const a = k * chunk, b = Math.min(nFrames, a + chunk);
    if (a >= b) return;
    const page = await openPage();
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', path.join(tmp, `c${k}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = a; i < b; i++) {
      const buf = await frame(page, i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 150 === 0) console.log(`${done}/${nFrames} frames (${((Date.now() - started) / 1000).toFixed(0)} s)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }));
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, Array.from({ length: workers }, (_, k) => `file 'c${k}.mp4'`).filter((_, k) => k * chunk < nFrames).join('\n'));
  execSync(`ffmpeg -v error -y -f concat -safe 0 -i "${list}" -c copy "${args.out}"`);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`video ok: ${args.out} (${nFrames} frames, ${((Date.now() - started) / 1000).toFixed(0)} s)`);
}

await browser.close();
server.close();
