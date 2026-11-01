// Renders frames [a,b) of the ad to an mp4 segment by piping screenshots into ffmpeg.
const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const [,, dir, v, a, b, out, fps] = process.argv;
  const W = v === '1' ? 1080 : 1920, H = v === '1' ? 1920 : 1080, F = +fps;
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: W, height: H } });
  await p.goto(`file://${dir}/index.html?v=${v}`); await p.evaluate(() => window.READY);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = +a; i < +b; i++) {
    await p.evaluate(t => window.seek(t), i / F);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await br.close();
})();
