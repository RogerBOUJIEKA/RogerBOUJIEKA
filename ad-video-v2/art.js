// Vector illustrations used in the ad (all hand-built, no external assets).
window.ART = {
  burger: (id = 'b') => `
<svg viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="${id}bun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc06a"/><stop offset=".55" stop-color="#e8862c"/><stop offset="1" stop-color="#b85a14"/></linearGradient>
  <linearGradient id="${id}bot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0a04a"/><stop offset="1" stop-color="#a24c10"/></linearGradient>
  <linearGradient id="${id}pat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3418"/><stop offset=".5" stop-color="#4a200c"/><stop offset="1" stop-color="#2c1206"/></linearGradient>
  <linearGradient id="${id}ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset="1" stop-color="#ff9d14"/></linearGradient>
  <radialGradient id="${id}hl" cx=".35" cy=".25" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
 </defs>
 <ellipse cx="200" cy="335" rx="165" ry="18" fill="#000" opacity=".35"/>
 <path d="M48 270 Q48 318 200 322 Q352 318 352 270 Z" fill="url(#${id}bot)"/>
 <path d="M40 236 Q200 262 360 236 L362 262 Q200 290 38 262 Z" fill="url(#${id}pat)"/>
 <path d="M44 216 Q200 238 356 216 Q362 246 350 252 Q200 276 50 252 Q38 246 44 216Z" fill="url(#${id}pat)"/>
 <g fill="#3a1606" opacity=".6"><circle cx="110" cy="244" r="3"/><circle cx="180" cy="252" r="2.5"/><circle cx="260" cy="248" r="3"/><circle cx="310" cy="240" r="2"/></g>
 <path d="M42 206 L358 206 L352 222 L322 250 L300 224 L262 256 L240 226 L196 262 L170 226 L128 254 L110 224 L72 246 L58 220 Z" fill="url(#${id}ch)"/>
 <path d="M40 196 q20 -14 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 l4 16 q-22 12 -44 0 t-40 0 t-40 0 t-40 0 t-40 0 t-40 0 t-40 0 t-40 0 z" fill="#4fbf3a"/>
 <path d="M40 196 q20 -14 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#8ae35f" stroke-width="4"/>
 <ellipse cx="140" cy="190" rx="58" ry="12" fill="#e5322d"/><ellipse cx="262" cy="190" rx="58" ry="12" fill="#e5322d"/>
 <path d="M44 186 Q40 70 200 58 Q360 70 356 186 Q200 206 44 186Z" fill="url(#${id}bun)"/>
 <path d="M44 186 Q40 70 200 58 Q360 70 356 186 Q200 206 44 186Z" fill="url(#${id}hl)"/>
 <g fill="#fff3d6">
  <ellipse cx="150" cy="100" rx="7" ry="3.5" transform="rotate(-20 150 100)"/><ellipse cx="200" cy="86" rx="7" ry="3.5"/>
  <ellipse cx="250" cy="102" rx="7" ry="3.5" transform="rotate(25 250 102)"/><ellipse cx="120" cy="135" rx="7" ry="3.5" transform="rotate(-35 120 135)"/>
  <ellipse cx="180" cy="125" rx="7" ry="3.5" transform="rotate(10 180 125)"/><ellipse cx="230" cy="135" rx="7" ry="3.5" transform="rotate(-10 230 135)"/>
  <ellipse cx="290" cy="128" rx="7" ry="3.5" transform="rotate(30 290 128)"/><ellipse cx="320" cy="160" rx="6" ry="3" transform="rotate(40 320 160)"/>
  <ellipse cx="88" cy="166" rx="6" ry="3" transform="rotate(-40 88 166)"/><ellipse cx="200" cy="160" rx="7" ry="3.5"/>
 </g>
</svg>`,

  car: (id = 'c', body = ['#ff7a2a', '#e8340f', '#9c1d06']) => `
<svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="${id}bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${body[0]}"/><stop offset=".55" stop-color="${body[1]}"/><stop offset="1" stop-color="${body[2]}"/></linearGradient>
  <linearGradient id="${id}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fd2ff"/><stop offset=".5" stop-color="#1d3f8f"/><stop offset="1" stop-color="#0a1640"/></linearGradient>
  <radialGradient id="${id}rim"><stop offset="0" stop-color="#f4f6fb"/><stop offset=".7" stop-color="#9aa3b5"/><stop offset="1" stop-color="#5a6274"/></radialGradient>
  <radialGradient id="${id}hd" cx="1" cy=".5" r="1"><stop offset="0" stop-color="#fff9d0" stop-opacity=".9"/><stop offset="1" stop-color="#fff9d0" stop-opacity="0"/></radialGradient>
 </defs>
 <ellipse cx="320" cy="214" rx="285" ry="16" fill="#000" opacity=".45"/>
 <path d="M30 160 Q28 118 70 108 L170 96 Q220 52 300 44 L420 44 Q470 46 520 92 L590 104 Q622 112 620 150 L618 172 Q616 184 600 186 L40 186 Q30 184 30 172Z" fill="url(#${id}bd)"/>
 <path d="M190 98 Q232 60 300 56 L360 56 L360 98Z" fill="url(#${id}gl)"/>
 <path d="M372 56 L420 56 Q462 60 500 98 L372 98Z" fill="url(#${id}gl)"/>
 <path d="M70 122 L600 118" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
 <path d="M60 112 Q200 100 330 104" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>
 <rect x="585" y="122" width="30" height="14" rx="6" fill="#fff6c8"/>
 <ellipse cx="660" cy="130" rx="80" ry="22" fill="url(#${id}hd)"/>
 <rect x="32" y="126" width="22" height="12" rx="5" fill="#ff2a2a"/>
 <rect x="380" y="128" width="26" height="5" rx="2.5" fill="#fff" opacity=".6"/>
 <rect x="240" y="128" width="26" height="5" rx="2.5" fill="#fff" opacity=".6"/>
 <g class="wheel" style="transform-origin:150px 186px"><circle cx="150" cy="186" r="40" fill="#14161c"/><circle cx="150" cy="186" r="26" fill="url(#${id}rim)"/>
  <g stroke="#4a5162" stroke-width="5"><line x1="150" y1="162" x2="150" y2="210"/><line x1="126" y1="186" x2="174" y2="186"/><line x1="133" y1="169" x2="167" y2="203"/><line x1="167" y1="169" x2="133" y2="203"/></g><circle cx="150" cy="186" r="7" fill="#2a2f3a"/></g>
 <g class="wheel" style="transform-origin:500px 186px"><circle cx="500" cy="186" r="40" fill="#14161c"/><circle cx="500" cy="186" r="26" fill="url(#${id}rim)"/>
  <g stroke="#4a5162" stroke-width="5"><line x1="500" y1="162" x2="500" y2="210"/><line x1="476" y1="186" x2="524" y2="186"/><line x1="483" y1="169" x2="517" y2="203"/><line x1="517" y1="169" x2="483" y2="203"/></g><circle cx="500" cy="186" r="7" fill="#2a2f3a"/></g>
</svg>`,

  villa: (id = 'v') => `
<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3e1ea"/></linearGradient>
  <linearGradient id="${id}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".6" stop-color="#ffb347"/><stop offset="1" stop-color="#e2731d"/></linearGradient>
  <linearGradient id="${id}gl2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3f86"/><stop offset="1" stop-color="#0e1640"/></linearGradient>
  <linearGradient id="${id}wd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a4a22"/><stop offset="1" stop-color="#5a2c12"/></linearGradient>
  <linearGradient id="${id}pool" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe7ff"/><stop offset="1" stop-color="#1b8fd6"/></linearGradient>
  <linearGradient id="${id}gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d7a3a"/><stop offset="1" stop-color="#1f4520"/></linearGradient>
 </defs>
 <rect x="0" y="320" width="640" height="80" fill="url(#${id}gr)"/>
 <rect x="40" y="300" width="560" height="26" fill="#d9d4cf"/>
 <rect x="120" y="150" width="400" height="152" fill="url(#${id}w)"/>
 <rect x="100" y="140" width="440" height="14" fill="#f4f2f8"/>
 <rect x="140" y="170" width="160" height="128" fill="url(#${id}gl)"/>
 <g stroke="#2b2b33" stroke-width="4"><line x1="193" y1="170" x2="193" y2="298"/><line x1="246" y1="170" x2="246" y2="298"/></g>
 <rect x="320" y="170" width="60" height="128" fill="url(#${id}wd)"/>
 <rect x="400" y="170" width="100" height="128" fill="url(#${id}gl2)"/>
 <rect x="400" y="170" width="100" height="128" fill="url(#${id}gl)" opacity=".55"/>
 <rect x="230" y="60" width="270" height="82" fill="url(#${id}w)"/>
 <rect x="210" y="50" width="310" height="12" fill="#f4f2f8"/>
 <rect x="250" y="76" width="140" height="56" fill="url(#${id}gl)"/>
 <rect x="410" y="76" width="70" height="56" fill="url(#${id}wd)"/>
 <line x1="320" y1="76" x2="320" y2="132" stroke="#2b2b33" stroke-width="4"/>
 <path d="M60 340 L400 340 L380 372 L40 372Z" fill="url(#${id}pool)"/>
 <path d="M90 352 q20 -6 40 0 t40 0 M200 360 q20 -6 40 0 t40 0" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none"/>
 <g transform="translate(570 320)"><path d="M0 0 Q6 -90 -4 -170" stroke="#5a3a1c" stroke-width="10" fill="none"/>
  <g fill="#2f8a3a"><path d="M-4 -170 q-60 -10 -90 30 q50 -26 90 -30z"/><path d="M-4 -170 q60 -14 94 24 q-50 -20 -94 -24z"/><path d="M-4 -170 q-30 -40 -80 -40 q46 14 80 40z"/><path d="M-4 -170 q34 -44 84 -36 q-48 10 -84 36z"/></g></g>
 <g fill="#2e6b2e"><circle cx="70" cy="300" r="26"/><circle cx="100" cy="306" r="20"/><circle cx="540" cy="306" r="18"/></g>
</svg>`,

  dumbbell: () => `
<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="dbm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b5f6b"/><stop offset=".5" stop-color="#1c1e24"/><stop offset="1" stop-color="#3a3d47"/></linearGradient>
 <linearGradient id="dbh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ecf2"/><stop offset="1" stop-color="#8b92a3"/></linearGradient></defs>
 <rect x="120" y="88" width="160" height="24" rx="6" fill="url(#dbh)"/>
 <rect x="60" y="30" width="50" height="140" rx="12" fill="url(#dbm)"/><rect x="20" y="50" width="44" height="100" rx="10" fill="url(#dbm)"/>
 <rect x="290" y="30" width="50" height="140" rx="12" fill="url(#dbm)"/><rect x="336" y="50" width="44" height="100" rx="10" fill="url(#dbm)"/>
 <rect x="68" y="40" width="8" height="120" rx="4" fill="#ff5a1f"/><rect x="324" y="40" width="8" height="120" rx="4" fill="#ff5a1f"/>
</svg>`,

  bag: () => `
<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="bgp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e0ff"/></linearGradient>
 <linearGradient id="bgs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfc6f5"/><stop offset="1" stop-color="#b3a6ee"/></linearGradient></defs>
 <path d="M100 110 Q100 40 150 40 Q200 40 200 110" stroke="#1a1440" stroke-width="12" fill="none"/>
 <path d="M50 100 L250 100 L270 320 L30 320Z" fill="url(#bgp)"/>
 <path d="M250 100 L270 320 L240 320 L230 100Z" fill="url(#bgs)"/>
 <text x="140" y="230" text-anchor="middle" font-family="Inter Display" font-weight="900" font-size="46" fill="#5b2bff">NOVA</text>
 <rect x="80" y="246" width="120" height="8" rx="4" fill="#ff4d8d"/>
</svg>`,

  camera: () => `<svg viewBox="0 0 100 100"><rect x="12" y="30" width="76" height="52" rx="10" fill="none" stroke="#fff" stroke-width="7"/><path d="M34 30 l6 -10 h20 l6 10" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><circle cx="50" cy="56" r="14" fill="none" stroke="#fff" stroke-width="7"/></svg>`,
  clap: () => `<svg viewBox="0 0 100 100"><rect x="14" y="40" width="72" height="46" rx="6" fill="none" stroke="#fff" stroke-width="7"/><path d="M14 40 L80 22 L84 34 L18 52" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M34 35 l8 10 M54 30 l8 10" stroke="#fff" stroke-width="6"/></svg>`,
  team: () => `<svg viewBox="0 0 100 100"><circle cx="36" cy="38" r="12" fill="none" stroke="#fff" stroke-width="7"/><circle cx="68" cy="40" r="10" fill="none" stroke="#fff" stroke-width="7"/><path d="M14 80 q2 -22 22 -22 q20 0 22 22 M58 80 q0 -18 12 -20 q16 0 18 20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`,
  shot: () => `<svg viewBox="0 0 100 100"><path d="M14 34 V20 a6 6 0 0 1 6 -6 H34 M66 14 H80 a6 6 0 0 1 6 6 V34 M86 66 V80 a6 6 0 0 1 -6 6 H66 M34 86 H20 a6 6 0 0 1 -6 -6 V66" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>`,
  poster: () => `<svg viewBox="0 0 100 100"><rect x="24" y="12" width="52" height="76" rx="6" fill="none" stroke="#fff" stroke-width="7"/><path d="M34 30 h32 M34 44 h22" stroke="#fff" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="66" r="9" fill="#fff"/></svg>`,
  link: () => `<svg viewBox="0 0 100 100"><path d="M44 58 a14 14 0 0 0 20 0 l14 -14 a14 14 0 0 0 -20 -20 l-6 6 M56 42 a14 14 0 0 0 -20 0 l-14 14 a14 14 0 0 0 20 20 l6 -6" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>`,
  app: () => `<svg viewBox="0 0 100 100"><rect x="28" y="8" width="44" height="84" rx="9" fill="none" stroke="#fff" stroke-width="7"/><path d="M44 80 h12" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`,
  play: () => `<svg viewBox="0 0 100 100"><rect x="8" y="18" width="84" height="64" rx="12" fill="none" stroke="#fff" stroke-width="7"/><path d="M42 36 L64 50 L42 64Z" fill="#fff"/></svg>`,
  spark: () => `<svg viewBox="0 0 100 100"><path d="M50 6 C54 36 64 46 94 50 C64 54 54 64 50 94 C46 64 36 54 6 50 C36 46 46 36 50 6Z" fill="#fff"/></svg>`,
  check: () => `<svg viewBox="0 0 100 100"><path d="M22 52 L42 72 L80 30" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cursor: () => `<svg viewBox="0 0 100 100"><path d="M20 8 L20 80 L38 64 L52 94 L64 88 L50 58 L74 58Z" fill="#fff" stroke="#111" stroke-width="5" stroke-linejoin="round"/></svg>`,
};
