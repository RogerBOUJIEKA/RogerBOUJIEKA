const { chromium } = require('playwright');
(async () => {
  const [,, dir, out, v, ...times] = process.argv;
  const W = v === '1' ? 1080 : 1920, H = v === '1' ? 1920 : 1080;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.goto(`file://${dir}/index.html?v=${v}`); await p.evaluate(() => window.READY);
  for (const t of times) { await p.evaluate(t => window.seek(+t), t); await p.screenshot({ path: `${out}/${v}_${t}.jpg`, quality: 80, type: 'jpeg' }); }
  await b.close();
})();
