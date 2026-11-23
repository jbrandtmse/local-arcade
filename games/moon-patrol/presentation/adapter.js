// Story 1.5 (PROVISIONAL play surface), vendored from C:/git/moonpatrol
// HEAD 49c351910af742a86cf97987bc474bb4d7d8da40 src/render.js (provenance
// line in sim/world.js header). SEAM EDITS:
//  - createRenderer -> createPresentation({ makeCanvas }): the factory shape
//    the contract wrapper defines; the kernel owns canvas creation, feeds
//    drawFrame the instance snapshot, and forwards emitted events.
//  - NO wall clock: every vendored wall-clock site reads the kernel
//    clock carried in the snapshot (world.t while playing, attractT in
//    attract) — the liveness law (AD-3/AD-15): motion is tick state, render
//    only READS. Deterministic given the same snapshot sequence.
//  - Visual particles moved here from the sim (the burst fx seam edit):
//    a 'burst' event spawns them with a seeded game-local rng (visuals are
//    not sim state, but they stay reproducible), advanced by snapshot-clock
//    deltas, drawn over the world.
//  - The PAUSED panel is gone: the seat's control vocabulary has no pause
//    button this story.
//  - Legend arrows authored via \u2190 / \u2192 escapes (Rule 14: non-ASCII
//    in string literals only as escapes).
// The vendored law stands: reading world state only, never mutating it.

import { CFG, themeFor } from '../sim/config.js';
import * as S from './sprites.js';
import { mulberry32 } from '../sim/rng.js';

const { W, H, GROUND_Y: GY, HUD_TOP, HUD_BOTTOM } = CFG.view;
const PAR_FAR = 0.15, PAR_MID = 0.4, PAR_STARS = 0.05;

function hashF(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function ridge(ctx, camX, par, base, amp, color, seedOff, craggy = false) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GY);
  for (let sx = 0; sx <= W; sx += 4) {
    const x = camX * par + sx + seedOff;
    let y = base + amp * Math.sin(x * 0.004) + amp * 0.55 * Math.sin(x * 0.011 + 3) + amp * 0.3 * Math.sin(x * 0.027 + 1);
    if (craggy) y += 6 * Math.sin(x * 0.15);
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W, GY);
  ctx.closePath();
  ctx.fill();
}

function drawStars(ctx, camX, alpha, t) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 90; i++) {
    const sx = (hashF(i) * 2000 - camX * PAR_STARS) % W;
    const x = sx < 0 ? sx + W : sx;
    const y = HUD_TOP + hashF(i + 500) * 200;
    // seam edit: kernel-clock twinkle (was the wall clock / 700)
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(hashF(i + 900) * 10 + t * 1000 / 700 + i));
    ctx.fillStyle = `rgba(230,238,255,${0.35 + 0.5 * tw})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, camX, theme, t) {
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, theme.sky[0]);
  g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GY);
  drawStars(ctx, camX, theme.stars, t);
  // moon
  const mx = 500 - (camX * 0.02) % (W + 200);
  ctx.fillStyle = '#e8e6dc';
  ctx.beginPath(); ctx.arc(mx < -80 ? mx + W + 160 : mx, 86, 26, 0, 7); ctx.fill();
  ctx.fillStyle = '#c8c5b8';
  ctx.beginPath(); ctx.arc(mx < -80 ? mx + W + 160 : mx - 8, 80, 6, 0, 7);
  ctx.arc(mx < -80 ? mx + W + 160 : mx + 7, 94, 4, 0, 7); ctx.fill();
  ridge(ctx, camX, PAR_FAR, 208, 22, theme.mount, 0, true);
  ridge(ctx, camX, PAR_FAR, 224, 14, theme.mountLit, 777, false);
  ridge(ctx, camX, PAR_MID, 272, 12, theme.hill, 1337, false);
  ridge(ctx, camX, PAR_MID, 288, 7, theme.hillLit, 2999, true);
}

function drawGround(ctx, camX, theme, craters) {
  // base band
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, GY, W, H - GY);
  // craters (gaps)
  for (const c of craters) {
    const x1 = c.x1 - camX, x2 = c.x2 - camX;
    if (x2 < -20 || x1 > W + 20) continue;
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(x1, GY, x2 - x1, H - GY);
    ctx.fillStyle = theme.groundDark;
    ctx.fillRect(x1, GY, 3, H - GY);
    ctx.fillRect(x2 - 3, GY, 3, H - GY);
    ctx.fillStyle = '#1d2130';
    ctx.fillRect(x1 + 3, GY + 6, x2 - x1 - 6, 3);
  }
  // top edge line + texture, skipping gaps
  const spans = [];
  let cur = 0;
  const sorted = craters.map(c => [c.x1, c.x2]).sort((a, b) => a[0] - b[0]);
  for (const [a, b] of sorted) { if (a > cur) spans.push([cur, a]); cur = Math.max(cur, b); }
  spans.push([cur, Infinity]);
  for (const [a, b] of spans) {
    const sx = Math.max(0, a - camX), ex = Math.min(W, b - camX);
    if (ex <= sx) continue;
    ctx.fillStyle = '#c9ccd8';
    ctx.fillRect(sx, GY, ex - sx, 2);
    for (let wx = Math.floor((camX + sx) / 23) * 23; wx < camX + ex; wx += 23) {
      const px = wx - camX;
      if (px < sx || px > ex - 2) continue;
      ctx.fillStyle = theme.groundDark;
      ctx.fillRect(px, GY + 8 + hashF(wx) * 26, 2, 1);
      ctx.fillRect(px + 7, GY + 14 + hashF(wx + 1) * 20, 1, 1);
    }
  }
}

function drawHud(ctx, w, hi, clockT) {
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, W, HUD_TOP);
  ctx.fillRect(0, HUD_BOTTOM, W, H - HUD_BOTTOM);
  ctx.textAlign = 'left';
  ctx.font = '9px monospace';
  ctx.fillStyle = '#8fa3c8';
  ctx.fillText('1UP', 8, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(w.score).padStart(6, '0'), 8, 24);
  ctx.fillStyle = '#8fa3c8';
  ctx.fillText('HI-SCORE', 8, 36);
  ctx.fillStyle = '#ffd24e';
  ctx.fillText(String(Math.max(hi, w.score)).padStart(6, '0'), 62, 36);

  // title + A-Z course map
  ctx.fillStyle = '#d8e2ff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MOON PATROL', W / 2, 10);
  ctx.font = '8px monospace';
  const mapX = W / 2 - 26 * 8 / 2;
  for (let i = 0; i < 26; i++) {
    const L = String.fromCharCode(65 + i);
    const major = CFG.majors.includes(i);
    const done = w.letter >= i;
    ctx.fillStyle = done ? '#3f9f5f' : major ? '#ffcf4e' : '#5a6c8c';
    ctx.fillText(L, mapX + i * 8 + 4, 24);
    if (major && !done) { ctx.fillStyle = '#ffcf4e'; ctx.fillRect(mapX + i * 8 + 2, 27, 5, 1); }
  }
  if (w.letter >= 0 && w.letter < 25) {
    const frac = (w.buggy.x / CFG.sectionLen - w.letter);
    ctx.fillStyle = '#7ee0ff';
    ctx.fillRect(mapX + (w.letter + frac) * 8, 29, 3, 2);
  }

  // fuel gauge (seam edit: kernel-clock flash, was the wall clock / 200)
  const f = w.fuel / CFG.fuel.max;
  ctx.textAlign = 'right';
  ctx.fillStyle = (w.fuel < 20 && Math.floor(clockT * 1000 / 200) % 2) ? '#ff5f5f' : '#8fa3c8';
  ctx.fillText('FUEL', W - 8, 12);
  ctx.fillStyle = '#22242c';
  ctx.fillRect(W - 78, 16, 70, 8);
  ctx.fillStyle = f > 0.5 ? '#4ed97a' : f > 0.2 ? '#ffd24e' : '#ff5f5f';
  ctx.fillRect(W - 77, 17, 68 * f, 6);

  // warning lights (seam edit: kernel-clock pulse, was the wall clock / 180)
  const lamps = [
    ['SAUCER', w.warnings.saucer],
    ['MINE', w.warnings.mine],
    ['BEHIND', w.warnings.behind],
  ];
  lamps.forEach(([label, on], i) => {
    const x = W - 200 + i * 34;
    ctx.fillStyle = on && Math.floor(clockT * 1000 / 180) % 2 ? '#ff4a4a' : '#2a2e3a';
    ctx.beginPath(); ctx.arc(x, 20, 6, 0, 7); ctx.fill();
    ctx.fillStyle = on ? '#ffd24e' : '#4a5568';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, 33);
  });

  // bottom bar: lives + letter + course label
  ctx.textAlign = 'left';
  for (let i = 0; i < Math.min(8, Math.max(0, w.lives)); i++) S.drawLifeIcon(ctx, 8 + i * 16, 359);
  ctx.fillStyle = '#1a2438';
  ctx.fillRect(160, 346, 40, 12);
  ctx.fillStyle = '#7ee0ff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(w.letter >= 0 ? String.fromCharCode(65 + w.letter) : '-', 176, 358);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8fa3c8';
  ctx.font = '8px monospace';
  ctx.fillText(w.courseIndex > 0 ? 'CHAMPION COURSE' : 'BEGINNER COURSE', W / 2, 358);
  ctx.textAlign = 'right';
  const theme = themeFor(w.courseIndex, w.stage);
  ctx.fillStyle = '#5a6c8c';
  ctx.fillText(`${theme.name} STAGE ${w.stage + 1}`, W - 8, 358);
  ctx.textAlign = 'left';

  // banner
  if (w.banner) {
    ctx.textAlign = 'center';
    const msg = w.banner.text;
    ctx.font = 'bold 12px monospace';
    const tw = ctx.measureText(msg).width + 24;
    ctx.fillStyle = 'rgba(8,10,20,0.85)';
    ctx.fillRect(W / 2 - tw / 2, 120, tw, 26);
    ctx.strokeStyle = '#ffd24e';
    ctx.strokeRect(W / 2 - tw / 2, 120, tw, 26);
    ctx.fillStyle = '#ffd24e';
    ctx.fillText(msg, W / 2, 137);
    ctx.textAlign = 'left';
  }
}

function drawWorldEntities(ctx, w, cam) {
  for (const o of w.ground) {
    const sx = (o.type === 'minefield' ? o.x1 : o.x) - cam;
    if (sx < -80 || sx > W + 80) continue;
    if (o.type === 'rock') { const oo = { ...o, x: o.x - cam }; S.drawRock(ctx, oo); }
    else if (o.type === 'minefield') { const f = { ...o, mines: o.mines.map(m => ({ ...m, x: m.x - cam })) }; f.mines.forEach(m => S.drawMine(ctx, m)); }
    else if (o.type === 'boulder') { const oo = { ...o, x: o.x - cam }; S.drawBoulder(ctx, oo); }
    else if (o.type === 'tank') { const oo = { ...o, x: o.x - cam }; S.drawTank(ctx, oo); }
    else if (o.type === 'plant') { const oo = { ...o, x: o.x - cam }; S.drawPlant(ctx, oo); }
  }
  for (const g of w.course.gates) {
    const sx = g.x - cam;
    if (sx < -40 || sx > W + 40) continue;
    S.drawGateMarker(ctx, sx, g.letter, g.major, w.buggy.x >= g.x);
  }
  for (const e of w.enemies) {
    const sx = e.x - cam;
    if (sx < -80 || sx > W + 80) continue;
    if (e.kind === 'ufo') S.drawUfo(ctx, { ...e, x: sx });
    else if (e.kind === 'lander') S.drawLander(ctx, { ...e, x: sx });
    else if (e.kind === 'hover') S.drawHover(ctx, { ...e, x: sx });
  }
  for (const bo of w.bombs) S.drawBomb(ctx, { ...bo, x: bo.x - cam });
  for (const s of w.shells) S.drawShell(ctx, { ...s, x: s.x - cam });
  if (w.buggy.fwd) S.drawBulletFwd(ctx, { ...w.buggy.fwd, x: w.buggy.fwd.x - cam });
  if (w.buggy.up) S.drawBulletUp(ctx, { ...w.buggy.up, x: w.buggy.up.x - cam });
}

function panel(ctx, lines, color) {
  ctx.fillStyle = 'rgba(4,6,12,0.75)';
  ctx.fillRect(W / 2 - 190, 130, 380, 100);
  ctx.strokeStyle = color;
  ctx.strokeRect(W / 2 - 190, 130, 380, 100);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(lines[0], W / 2, 162);
  ctx.fillStyle = '#d8e2ff';
  ctx.font = '11px monospace';
  lines.slice(1).forEach((l, i) => ctx.fillText(l, W / 2, 186 + i * 16));
  ctx.textAlign = 'left';
}

export function createPresentation({ makeCanvas }) {
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  // presentation-own state: the cabinet's attract high score (updated from
  // the emitted gameEnded event — deterministic, never sim state) and its
  // visual particles (the burst fx seam edit's other half).
  let hi = 0;
  const burstRng = mulberry32(1); // fixed seed: visuals reproducible
  let particles = [];
  let lastClock = null; // snapshot-clock tracking for particle dt

  function advanceParticles(dt) {
    if (!(dt > 0)) return;
    for (const p of particles) {
      p.ttl -= dt;
      if (p.ttl <= 0) continue;
      p.vy += 300 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    particles = particles.filter((p) => p.ttl > 0);
  }

  function drawParticles(ctx, cam) {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.ttl * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cam, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  return {
    canvas,

    onEvent(event) {
      if (event.type === 'burst') {
        const { x, y, n, color } = event.payload;
        // the vendored burst law, now presentation-side and seeded
        for (let i = 0; i < n; i++) {
          const a = burstRng() * Math.PI * 2; // Math.PI is data, not a transcendental call
          const sp = 40 + burstRng() * 120;
          particles.push({
            x, y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
            ttl: 0.5 + burstRng() * 0.4,
            color,
          });
        }
        return;
      }
      if (event.type === 'gameEnded') {
        hi = Math.max(hi, Number(event.payload.score) || 0);
      }
    },

    drawFrame(view) {
      if (view.mode === 'attract') {
        const t = view.attractT;
        const dt = lastClock === null ? 0 : t - lastClock;
        lastClock = t;
        advanceParticles(dt);
        const theme = themeFor(0, Math.floor(t / 12) % CFG.themes.length);
        drawBackground(ctx, t * 30, theme, t);
        drawGround(ctx, t * 30, theme, []);
        drawParticles(ctx, 0);
        ctx.fillStyle = 'rgba(4,6,12,0.55)';
        ctx.fillRect(0, 60, W, 240);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#d95f2b';
        ctx.font = 'bold 34px monospace';
        ctx.fillText('MOON PATROL', W / 2, 108);
        ctx.fillStyle = '#8fa3c8';
        ctx.font = '10px monospace';
        ctx.fillText('A CLONE OF THE 1980 IREM ARCADE CLASSIC', W / 2, 128);
        ctx.fillStyle = '#d8e2ff';
        ctx.font = '11px monospace';
        const lines = [
          '\u2190 \u2192 or A D ... CONTROL SPEED (NEVER STOPS)',
          'Z or J ....... FIRE (FORWARD + UP MISSILES)',
          'X or K ....... JUMP',
          'ENTER ......... START',
        ];
        lines.forEach((l, i) => ctx.fillText(l, W / 2, 158 + i * 16));
        ctx.fillStyle = '#ffd24e';
        ctx.font = '12px monospace';
        ctx.fillText('DRIVE A - Z. SHOOT THE SAUCERS.', W / 2, 232);
        ctx.fillText('NEVER LET A LANDER LAND. NEVER RUN DRY.', W / 2, 248);
        if (Math.floor(t * 2) % 2) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('PRESS ENTER', W / 2, 280);
        }
        ctx.fillStyle = '#ffd24e';
        ctx.font = '10px monospace';
        ctx.fillText(`HI-SCORE ${String(hi).padStart(6, '0')}`, W / 2, 310);
        ctx.textAlign = 'left';
        return;
      }

      const w = view.world;
      const cam = Math.max(0, w.buggy.x - 230);
      const dt = lastClock === null ? 0 : w.t - lastClock;
      lastClock = w.t;
      advanceParticles(dt);
      const theme = themeFor(w.courseIndex, w.stage);
      drawBackground(ctx, cam, theme, w.t);
      drawGround(ctx, cam, theme, w.craters);
      drawWorldEntities(ctx, w, cam);
      drawParticles(ctx, cam);
      // seam edit: invuln blink on the kernel clock (was the wall clock / 120)
      if (w.mode === 'running' && w.buggy.invuln <= 0 || w.mode === 'running' && Math.floor(w.t * 1000 / 120) % 2) {
        S.drawBuggy(ctx, w.buggy.x - cam, w.buggy.y, false);
      }
      drawHud(ctx, w, hi, w.t);
      if (w.mode === 'cleared' && w.clear) {
        panel(ctx, [
          'COURSE COMPLETE!',
          `TIME ${w.clear.time.toFixed(0)}s  BONUS +${w.clear.bonus}`,
          w.courseIndex === 0 ? 'CHAMPION COURSE NEXT...' : 'SAME COURSE AGAIN - HARDER!',
        ], '#4ed97a');
      }
      if (w.mode === 'gameover') {
        panel(ctx, ['GAME OVER', `SCORE ${w.score}`, 'PRESS ENTER'], '#ff5f5f');
      }
      // (no PAUSED panel: the 1.5 seat vocabulary has no pause button)
    },
  };
}
