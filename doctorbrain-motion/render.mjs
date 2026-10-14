// Rend index.html image par image en MP4 (1920x1080, 30 i/s).
// Usage : NODE_PATH=$(npm root -g) node render.mjs [sortie.mp4] [fps] [début] [fin]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
// playwright local (npm i playwright) ou global (NODE_PATH=$(npm root -g))
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || path.join(here, 'doctorbrain-motion.mp4');
const fps = +(process.argv[3] || 30);
const t0 = +(process.argv[4] || 0);
const t1 = +(process.argv[5] || 32);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + path.join(here, 'index.html') + '?render', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const frames = Math.round((t1 - t0) * fps);
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.renderFrame(t), t0 + i / fps);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`frame ${i}/${frames}\n`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('OK ->', out);
