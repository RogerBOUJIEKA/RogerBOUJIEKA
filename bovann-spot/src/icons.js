// Line icons drawn as paths in a 24-unit box (stroke-based, round caps). icon(ctx, name, cx, cy, size, color, lw)
const P = {
  spotlight(c) { // stage light with beam
    c.moveTo(6, 4); c.lineTo(12, 4); c.lineTo(13.5, 9); c.lineTo(4.5, 9); c.closePath();
    c.moveTo(9, 9); c.lineTo(9, 11);
    c.moveTo(5, 13); c.lineTo(2, 21); c.moveTo(13, 13); c.lineTo(17, 21); c.moveTo(1.5, 21); c.lineTo(22, 21);
    c.moveTo(16, 4); c.lineTo(19, 2.5); c.moveTo(16.5, 7); c.lineTo(20.5, 7);
  },
  megaphone(c) {
    c.moveTo(3, 10); c.lineTo(3, 14); c.lineTo(7, 14); c.lineTo(16, 19); c.lineTo(16, 5); c.lineTo(7, 10); c.closePath();
    c.moveTo(7, 14); c.lineTo(8.5, 20); c.lineTo(11, 20); c.lineTo(10, 15.5);
    c.moveTo(19, 9); c.quadraticCurveTo(21, 12, 19, 15);
  },
  code(c) { c.moveTo(8, 6); c.lineTo(2.5, 12); c.lineTo(8, 18); c.moveTo(16, 6); c.lineTo(21.5, 12); c.lineTo(16, 18); c.moveTo(13.5, 4.5); c.lineTo(10.5, 19.5); },
  cap(c) {
    c.moveTo(1.5, 9.5); c.lineTo(12, 4.5); c.lineTo(22.5, 9.5); c.lineTo(12, 14.5); c.closePath();
    c.moveTo(6, 11.7); c.lineTo(6, 17); c.quadraticCurveTo(12, 21, 18, 17); c.lineTo(18, 11.7);
    c.moveTo(21, 10.3); c.lineTo(21, 16);
  },
  network(c) {
    c.rect(9, 2.5, 6, 5); c.rect(2, 16.5, 6, 5); c.rect(16, 16.5, 6, 5);
    c.moveTo(12, 7.5); c.lineTo(12, 12); c.moveTo(5, 16.5); c.lineTo(5, 12); c.lineTo(19, 12); c.lineTo(19, 16.5);
  },
  phone(c) {
    c.moveTo(6.5, 3); c.lineTo(9.5, 3); c.lineTo(11, 7.5); c.lineTo(8.5, 9.2); c.quadraticCurveTo(10.5, 13.5, 14.8, 15.5);
    c.lineTo(16.5, 13); c.lineTo(21, 14.5); c.lineTo(21, 17.5); c.quadraticCurveTo(20.5, 21, 17, 21); c.quadraticCurveTo(4, 19.5, 3, 7); c.quadraticCurveTo(3, 3.3, 6.5, 3); c.closePath();
  },
  clock(c) { c.arc(12, 12, 9.5, 0, 6.2832); c.moveTo(12, 6.5); c.lineTo(12, 12); c.lineTo(16, 14); },
  calendar(c) { c.rect(3, 5, 18, 16); c.moveTo(3, 10); c.lineTo(21, 10); c.moveTo(8, 3); c.lineTo(8, 7); c.moveTo(16, 3); c.lineTo(16, 7); c.moveTo(11, 15); c.lineTo(13, 15); },
  users(c) {
    c.moveTo(12.5, 8); c.arc(9, 8, 3.5, 0, 6.2832); c.moveTo(2.5, 20); c.quadraticCurveTo(3, 13.5, 9, 13.5); c.quadraticCurveTo(15, 13.5, 15.5, 20);
    c.moveTo(15.5, 5); c.quadraticCurveTo(19, 5.5, 18.5, 9); c.quadraticCurveTo(18, 11, 16, 11.3); c.moveTo(18, 14); c.quadraticCurveTo(21.5, 15, 21.5, 20);
  },
  briefcase(c) { c.rect(2.5, 7, 19, 13); c.moveTo(8.5, 7); c.lineTo(8.5, 4); c.lineTo(15.5, 4); c.lineTo(15.5, 7); c.moveTo(2.5, 12.5); c.lineTo(21.5, 12.5); c.moveTo(12, 11); c.lineTo(12, 14); },
  chart(c) { c.moveTo(3, 3); c.lineTo(3, 21); c.lineTo(21, 21); c.moveTo(6.5, 16); c.lineTo(10.5, 11); c.lineTo(14, 14); c.lineTo(20, 6.5); c.moveTo(16, 6.5); c.lineTo(20, 6.5); c.lineTo(20, 10.5); },
  check(c) { c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19.5, 7); },
  heart(c) { c.moveTo(12, 20); c.bezierCurveTo(2, 13.5, 2, 5, 7.5, 5); c.bezierCurveTo(10, 5, 11.4, 6.8, 12, 8); c.bezierCurveTo(12.6, 6.8, 14, 5, 16.5, 5); c.bezierCurveTo(22, 5, 22, 13.5, 12, 20); c.closePath(); },
  bell(c) { c.moveTo(5, 17); c.lineTo(5, 11); c.quadraticCurveTo(5, 4.5, 12, 4.5); c.quadraticCurveTo(19, 4.5, 19, 11); c.lineTo(19, 17); c.lineTo(20.5, 18.5); c.lineTo(3.5, 18.5); c.lineTo(5, 17); c.moveTo(10, 21); c.lineTo(14, 21); c.moveTo(12, 2.5); c.lineTo(12, 4.5); },
  globe(c) { c.arc(12, 12, 9.5, 0, 6.2832); c.moveTo(2.5, 12); c.lineTo(21.5, 12); c.moveTo(12, 2.5); c.bezierCurveTo(7, 7, 7, 17, 12, 21.5); c.moveTo(12, 2.5); c.bezierCurveTo(17, 7, 17, 17, 12, 21.5); },
  shield(c) { c.moveTo(12, 2.5); c.lineTo(20, 5.5); c.lineTo(20, 11.5); c.quadraticCurveTo(19.5, 18, 12, 21.5); c.quadraticCurveTo(4.5, 18, 4, 11.5); c.lineTo(4, 5.5); c.closePath(); c.moveTo(8.5, 12); c.lineTo(11, 14.5); c.lineTo(15.5, 9.5); },
  mobile(c) { c.rect(6.5, 2.5, 11, 19); c.moveTo(10.5, 18.5); c.lineTo(13.5, 18.5); },
  laptop(c) { c.rect(4.5, 4.5, 15, 10.5); c.moveTo(2, 19); c.lineTo(22, 19); c.lineTo(20.5, 15); c.lineTo(3.5, 15); c.closePath(); },
  screens(c) { c.rect(2.5, 4, 14, 10); c.moveTo(6.5, 18); c.lineTo(12.5, 18); c.moveTo(9.5, 14); c.lineTo(9.5, 18); c.rect(15.5, 9, 6, 11); },
  gear(c) {
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; c.moveTo(12 + Math.cos(a) * 7, 12 + Math.sin(a) * 7); c.lineTo(12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10); }
    c.moveTo(19, 12); c.arc(12, 12, 7, 0, 6.2832); c.moveTo(15, 12); c.arc(12, 12, 3, 0, 6.2832);
  },
  target(c) { c.arc(12, 12, 9.5, 0, 6.2832); c.moveTo(17.5, 12); c.arc(12, 12, 5.5, 0, 6.2832); c.moveTo(13.5, 12); c.arc(12, 12, 1.5, 0, 6.2832); },
  sparkle(c) { c.moveTo(12, 2.5); c.quadraticCurveTo(13, 11, 21.5, 12); c.quadraticCurveTo(13, 13, 12, 21.5); c.quadraticCurveTo(11, 13, 2.5, 12); c.quadraticCurveTo(11, 11, 12, 2.5); c.closePath(); },
  camera(c) { c.rect(2.5, 7, 13, 11); c.moveTo(15.5, 10.5); c.lineTo(21.5, 7); c.lineTo(21.5, 18); c.lineTo(15.5, 14.5); },
  book(c) { c.moveTo(12, 6); c.quadraticCurveTo(7, 3.5, 2.5, 5); c.lineTo(2.5, 19); c.quadraticCurveTo(7, 17.5, 12, 20); c.quadraticCurveTo(17, 17.5, 21.5, 19); c.lineTo(21.5, 5); c.quadraticCurveTo(17, 3.5, 12, 6); c.lineTo(12, 20); },
  tools(c) { c.moveTo(4, 20); c.lineTo(13, 11); c.moveTo(13, 11); c.arc(16.5, 7.5, 4.5, 2.36, 0.6, false); c.moveTo(14.5, 15); c.lineTo(20, 20.5); c.moveTo(3.5, 4); c.lineTo(9.5, 10); },
  leader(c) { c.moveTo(15, 8); c.arc(12, 8, 3, 0, 6.2832); c.moveTo(5, 21); c.quadraticCurveTo(5.5, 13.5, 12, 13.5); c.quadraticCurveTo(18.5, 13.5, 19, 21); c.moveTo(12, 1); c.lineTo(12.8, 2.6); c.lineTo(14.4, 2.8); c.lineTo(13.2, 3.9); },
  structure(c) { c.rect(9, 2.5, 6, 4.5); c.rect(2, 17, 5.5, 4.5); c.rect(9.25, 17, 5.5, 4.5); c.rect(16.5, 17, 5.5, 4.5); c.moveTo(12, 7); c.lineTo(12, 17); c.moveTo(4.75, 17); c.lineTo(4.75, 12); c.lineTo(19.25, 12); c.lineTo(19.25, 17); },
  compass(c) { c.arc(12, 12, 9.5, 0, 6.2832); c.moveTo(15.5, 8.5); c.lineTo(13.2, 13.2); c.lineTo(8.5, 15.5); c.lineTo(10.8, 10.8); c.closePath(); },
  facebook(c) { c.rect(3, 3, 18, 18); c.moveTo(15.5, 7.5); c.lineTo(13.8, 7.5); c.quadraticCurveTo(12, 7.5, 12, 9.5); c.lineTo(12, 21); c.moveTo(9.5, 12); c.lineTo(15, 12); },
  instagram(c) { c.moveTo(16.5, 12); c.arc(12, 12, 4.5, 0, 6.2832); c.moveTo(17.6, 6.4); c.arc(17.1, 6.9, 0.5, 0, 6.2832); },
  linkedin(c) { c.rect(3, 3, 18, 18); c.moveTo(7.5, 10.5); c.lineTo(7.5, 17); c.moveTo(7.5, 7.2); c.lineTo(7.5, 7.4); c.moveTo(11, 17); c.lineTo(11, 10.5); c.moveTo(11, 13); c.quadraticCurveTo(11.5, 10.5, 14, 10.5); c.quadraticCurveTo(16.5, 10.5, 16.5, 13); c.lineTo(16.5, 17); },
  ticket(c) { c.moveTo(3, 6); c.lineTo(21, 6); c.lineTo(21, 10); c.arc(21, 12, 2, -Math.PI / 2, Math.PI / 2, true); c.lineTo(21, 18); c.lineTo(3, 18); c.lineTo(3, 14); c.arc(3, 12, 2, Math.PI / 2, -Math.PI / 2, true); c.closePath(); c.moveTo(15, 6); c.lineTo(15, 18); },
  palette(c) { c.moveTo(12, 3); c.bezierCurveTo(4, 3, 2, 10, 3.5, 14.5); c.bezierCurveTo(5, 19, 10, 21, 12.5, 20.5); c.bezierCurveTo(14.5, 20, 13, 17, 15, 16); c.bezierCurveTo(17, 15, 21, 17, 21, 12); c.bezierCurveTo(21, 6.5, 17, 3, 12, 3); c.moveTo(8.5, 9); c.arc(8, 9, 0.5, 0, 6.2832); c.moveTo(13, 7); c.arc(12.5, 7, 0.5, 0, 6.2832); c.moveTo(17.5, 10); c.arc(17, 10, 0.5, 0, 6.2832); },
  layers(c) { c.moveTo(12, 3); c.lineTo(21.5, 8); c.lineTo(12, 13); c.lineTo(2.5, 8); c.closePath(); c.moveTo(2.5, 12); c.lineTo(12, 17); c.lineTo(21.5, 12); c.moveTo(2.5, 16); c.lineTo(12, 21); c.lineTo(21.5, 16); },
};
export function icon(ctx, name, cx, cy, size, color, lw = 1.8) {
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  ctx.beginPath();
  P[name](ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  if (name === "instagram") { ctx.beginPath(); const r = 4.5; const x = 3, y = 3, w = 18; ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + w, r); ctx.arcTo(x + w, y + w, x, y + w, r); ctx.arcTo(x, y + w, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.stroke(); }
  ctx.restore();
}
export const ICONS = Object.keys(P);
