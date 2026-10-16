// (server: python3 -m http.server 8766 in projet/)  node render_snap.js <outdir> : renders both filter variants at 2160x4680 (transparent) + previews
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 2340 }, deviceScaleFactor: 2 });
  for (const v of ['cabrel', 'sansphoto']) {
    for (const prev of [0, 1]) {
      await p.goto(`http://127.0.0.1:8766/filtre_snapchat.html?v=${v}${prev ? '&preview=1' : ''}`);
      const fs = await p.evaluate(() => window.ready);
      await p.waitForTimeout(300);
      await p.screenshot({ path: `${out}/${v}${prev ? '_preview' : ''}.png`, omitBackground: !prev, fullPage: false });
      console.log(v, prev, 'name font', fs);
    }
  }
  await b.close();
})();
