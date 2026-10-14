// Rend clip.html en vidéo muette + exporte la liste des repères audio.
// Usage : NODE_PATH=$(npm root -g) node render-clip.mjs youtube|short [sortie.mp4] [début] [fin]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');
const fmt = process.argv[2] || 'youtube';
const short = fmt === 'short';
const out = process.argv[3] || path.join(here, 'build', `video-${fmt}.mp4`);
const fps = 30;
const [W, H] = short ? [1080, 1920] : [1920, 1080];

fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('file://' + path.join(here, 'clip.html') + '?render' + (short ? '&fmt=short' : ''), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const meta = await page.evaluate(() => ({ cues: window.CUES, vo: window.VO, dur: window.DUR }));
fs.writeFileSync(path.join(here, 'build', 'cues.json'), JSON.stringify(meta));
const t0 = +(process.argv[4] || 0), t1 = +(process.argv[5] || meta.dur);

const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round((t1 - t0) * fps);
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.renderFrame(t), t0 + i / fps);
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 300 === 0) console.log(`${fmt}: ${i}/${frames}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('OK', out);
