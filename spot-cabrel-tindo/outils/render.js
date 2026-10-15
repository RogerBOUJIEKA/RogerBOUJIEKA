// usage: node render.js <landscape|portrait> <outdir> <start|list> <end> [step] [quality]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [fmt, out, s0, s1, stepArg, qArg] = process.argv.slice(2);
  const P = fmt === 'portrait';
  const fps = +(process.env.FPS || 30), start = +s0 || 0, end = +s1, step = +(stepArg || 1), quality = +(qArg || 93);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: P ? 2160 : 3840, height: P ? 3840 : 2160 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:8765/index.html?fmt=${P ? 'portrait' : 'landscape'}&zoom=2`);
  await page.evaluate(() => window.ready);
  const cdp = await page.context().newCDPSession(page);
  const list = s0.includes(',') ? s0.split(',').map(Number) : null;
  const frames = list || [...Array(Math.ceil((end - start) / step)).keys()].map(i => start + i * step);
  const t0 = Date.now();
  let last = null;
  const draw = t => page.evaluate(t => new Promise(r => { const n = window.renderFrame(t); requestAnimationFrame(() => requestAnimationFrame(() => r(n))); }), t);
  for (const f of frames) {
    let n = await draw(f / fps);
    if (n !== last) { await page.waitForTimeout(150); n = await draw(f / fps); await page.waitForTimeout(100); }
    last = n;
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality, optimizeForSpeed: true, fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(`${out}/f${String(f).padStart(5, '0')}.jpg`, Buffer.from(data, 'base64'));
  }
  console.log(`${fmt} ${frames[0]}-${frames[frames.length - 1]} (${frames.length}) done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await browser.close();
})();
