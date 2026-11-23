// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5; owners own single-author original work). Vendored as-is.
// Procedural pixel-art sprite drawing. Canvas-only module.
const GY = 300; // matches CFG.view.GROUND_Y (used only for visual anchoring)

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

export function drawBuggy(ctx, x, y, blink = false) {
  if (blink) ctx.globalAlpha = 0.45;
  const body = '#d95f2b', bodyL = '#ff8a4a', dark = '#22242c';
  // wheels
  rect(ctx, x + 3, y - 7, 8, 7, dark);
  rect(ctx, x + 23, y - 7, 8, 7, dark);
  rect(ctx, x + 5, y - 5, 4, 3, '#555a66');
  rect(ctx, x + 25, y - 5, 4, 3, '#555a66');
  // chassis
  rect(ctx, x + 2, y - 13, 30, 6, body);
  rect(ctx, x + 2, y - 13, 30, 2, bodyL);
  // body + dome
  rect(ctx, x + 8, y - 19, 16, 6, body);
  rect(ctx, x + 10, y - 23, 10, 4, '#39c4e8');
  rect(ctx, x + 10, y - 23, 10, 1, '#a8f0ff');
  // gun barrel
  rect(ctx, x + 28, y - 12, 6, 2, '#8a8f9c');
  ctx.globalAlpha = 1;
}

export function drawLifeIcon(ctx, x, y) {
  rect(ctx, x + 1, y - 4, 8, 4, '#22242c');
  rect(ctx, x, y - 8, 12, 4, '#d95f2b');
  rect(ctx, x + 3, y - 11, 5, 3, '#39c4e8');
}

export function drawRock(ctx, o) {
  const { x, h } = { x: o.x, h: o.h };
  const w = o.w, y = GY - h;
  ctx.fillStyle = o.half ? '#7d766b' : '#8f887b';
  ctx.beginPath();
  if (o.size === 2 && !o.half) {
    ctx.moveTo(x, GY); ctx.lineTo(x + 6, y + 6); ctx.lineTo(x + 11, y);
    ctx.lineTo(x + 16, y + 8); ctx.lineTo(x + 22, y + 2); ctx.lineTo(x + w, y + 8); ctx.lineTo(x + w, GY);
  } else {
    ctx.moveTo(x, GY); ctx.lineTo(x + 3, y + 3); ctx.lineTo(x + w * 0.45, y);
    ctx.lineTo(x + w * 0.75, y + h * 0.35); ctx.lineTo(x + w, GY);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a89f8f';
  ctx.fillRect(Math.round(x + w * 0.3), Math.round(y + 2), 3, 2);
}

export function drawMine(ctx, m) {
  const y = GY - m.h;
  ctx.fillStyle = '#c8c8d0';
  ctx.beginPath(); ctx.arc(m.x + 7, GY - 6, 6, Math.PI, 0); ctx.fill();
  rect(ctx, m.x + 5, GY - 12, 4, 4, '#e8e8f0');
  rect(ctx, m.x + 1, y, 2, 3, '#e8e8f0');
  rect(ctx, m.x + 12, y, 2, 3, '#e8e8f0');
}

export function drawBoulder(ctx, o) {
  const cx = o.x + o.r ?? o.x + 13, r = 13;
  ctx.fillStyle = '#777063';
  ctx.beginPath(); ctx.arc(o.x + r, GY - r, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#928a7a';
  ctx.beginPath(); ctx.arc(o.x + r - 4, GY - r - 4, 5, 0, Math.PI * 2); ctx.fill();
}

export function drawPlant(ctx, o) {
  const baseY = GY + 16;
  rect(ctx, o.x + o.w / 2 - 2, baseY - o.h, 4, o.h, '#2e8f5b');
  ctx.fillStyle = '#39c07a';
  ctx.beginPath(); ctx.arc(o.x + o.w / 2, baseY - o.h, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b6f0c8';
  ctx.beginPath(); ctx.arc(o.x + o.w / 2 - 2, baseY - o.h - 2, 3, 0, Math.PI * 2); ctx.fill();
}

export function drawTank(ctx, o) {
  const y = GY - o.h;
  rect(ctx, o.x, GY - 8, o.w, 8, '#3c4636');
  ctx.fillStyle = '#556248';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(o.x + 6 + i * 10, GY - 3, 3, 0, 7); ctx.fill(); }
  rect(ctx, o.x + 8, y, 22, 9, '#4a5741');
  rect(ctx, o.x, y + 2, 10, 3, '#556248'); // barrel faces left
  rect(ctx, o.x + 14, y - 3, 8, 3, '#556248');
}

export function drawUfo(ctx, e) {
  const x = e.x, y = e.y;
  const body = e.type === 'crater' ? '#c86adf' : e.type === 'rammer' ? '#df6a6a' : '#6adf8a';
  const dark = '#173222';
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(x, y, e.w / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8f4ff';
  ctx.beginPath(); ctx.ellipse(x, y - 4, e.w / 5, 5, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = dark;
  const spin = Math.floor(e.spin * 4) % 4;
  for (let i = 0; i < 4; i++) {
    const on = (i + spin) % 4 < 2;
    ctx.fillStyle = on ? '#ffe66a' : '#3a3a2a';
    ctx.fillRect(Math.round(x - e.w / 2 + 5 + i * 7), Math.round(y + 2), 3, 2);
  }
}

export function drawLander(ctx, e) {
  const x = e.x, y = e.y;
  ctx.fillStyle = '#c9b98f';
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 6); ctx.lineTo(x - 6, y - 8); ctx.lineTo(x + 6, y - 8); ctx.lineTo(x + 10, y + 6);
  ctx.closePath(); ctx.fill();
  rect(ctx, x - 4, y - 3, 8, 5, '#39506e');
  ctx.strokeStyle = '#8a8f9c'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 6); ctx.lineTo(x - 12, y + 12);
  ctx.moveTo(x + 8, y + 6); ctx.lineTo(x + 12, y + 12);
  ctx.stroke();
  ctx.fillStyle = '#ff5f5f';
  ctx.beginPath(); ctx.arc(x, y + 8, 2, 0, 7); ctx.fill();
}

export function drawHover(ctx, e) {
  const y = GY - e.h;
  ctx.fillStyle = '#6a7ad9';
  ctx.beginPath();
  ctx.moveTo(e.x - e.w / 2, y + 12); ctx.lineTo(e.x - e.w / 2 + 6, y + 2); ctx.lineTo(e.x + e.w / 2 - 4, y);
  ctx.lineTo(e.x + e.w / 2, y + 12); ctx.closePath(); ctx.fill();
  rect(ctx, e.x - 6, y + 3, 8, 4, '#39c4e8');
  ctx.fillStyle = '#ffe66a';
  ctx.fillRect(Math.round(e.x + e.w / 2 - 2), Math.round(y + 4), 3, 3);
}

export function drawBulletFwd(ctx, b) { rect(ctx, b.x, b.y, b.w, b.h, '#ffe66a'); }
export function drawBulletUp(ctx, b) { rect(ctx, b.x, b.y, b.w, b.h, '#7ee0ff'); }
export function drawBomb(ctx, bo) {
  ctx.fillStyle = '#ff7a5f';
  ctx.beginPath(); ctx.arc(bo.x, bo.y + bo.r, bo.r, 0, 7); ctx.fill();
}
export function drawShell(ctx, s) { rect(ctx, s.x, s.y, s.w, s.h, '#ff9f5f'); }

export function drawGateMarker(ctx, screenX, letterIdx, major, passed) {
  if (screenX < 20 || screenX > 620) return;
  const L = String.fromCharCode(65 + letterIdx);
  const col = passed ? '#3f7f4f' : major ? '#ffcf4e' : '#6a86c9';
  ctx.globalAlpha = 0.9;
  if (major) {
    rect(ctx, screenX, GY - 46, 14, 46, col);
    rect(ctx, screenX, GY - 46, 14, 4, '#ffffff');
    ctx.fillStyle = '#101018';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(L, screenX + 7, GY - 26);
  } else {
    rect(ctx, screenX, GY - 22, 2, 22, col);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
