// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5 port; provenance line in the world.js header). SEAM EDIT ONLY:
// import paths point at this sim folder (+ helpers.js wraps createWorld to
// inject the math harness). These pins bind the VENDORED physics — the
// jump/crash/fuel/lives law the vendored suite tuned — unchanged.

import test from 'node:test';
import assert from 'node:assert/strict';
import { sandboxWorld, drive, CFG, createWorld, step } from './helpers.js';
import { jumpReach } from './world.js';

// min horizontal travel to cross a gap: take off and land with at most
// (fallOverlap - 2) of overlap on each lip.
export const clearNeed = (width) => width + CFG.buggy.w - 2 * (CFG.buggy.fallOverlap - 2);

test('max crater is clearable at the minimum (cruise) speed', () => {
  const reach = jumpReach(CFG.buggy.slow);
  const need = clearNeed(CFG.crater.largeMax) + 4;
  assert.ok(reach >= need, `jump reach ${reach} must clear ${need}`);
});

test('running into a crater kills the buggy', () => {
  const w = sandboxWorld();
  w.craters.push({ type: 'crater', x1: w.buggy.x + 60, x2: w.buggy.x + 90, width: 30, large: false, scored: false });
  drive(w, 1.5, {}); // no input: keeps cruising at slow speed
  assert.equal(w.mode, 'dying');
  assert.equal(w.deathReason, 'crater');
});

test('jumping clears a crater at cruise speed', () => {
  const w = sandboxWorld();
  const x1 = w.buggy.x + 20;
  w.craters.push({ type: 'crater', x1, x2: x1 + 48, width: 48, large: true, scored: false });
  drive(w, 2.5, { jump: true }); // bunny-hop from the start
  assert.equal(w.mode, 'running');
  assert.ok(w.buggy.x > x1 + 48);
});

test('max-size craters across the course are jumpable (generated)', () => {
  const w = createWorld({ seed: 77 });
  for (const c of w.craters) {
    assert.ok(jumpReach(CFG.buggy.slow) >= clearNeed(c.width) + 4, `crater at ${c.x1} width ${c.width} unclearable`);
  }
});

test('jump physics: apex is under the UFO flight ceiling', () => {
  const apex = (CFG.buggy.jumpV ** 2) / (2 * CFG.buggy.grav);
  assert.ok(CFG.view.GROUND_Y - apex > CFG.ufo.hoverYMax, 'buggy can never touch a UFO by jumping');
});

test('fuel drains with time and driving fast, kills when empty', () => {
  const w = sandboxWorld();
  drive(w, 10, {});
  const drainedSlow = CFG.fuel.max - w.fuel;
  const w2 = sandboxWorld();
  drive(w2, 10, { right: true });
  assert.ok(w2.fuel < w.fuel, 'fast driving burns more fuel');
  assert.ok(drainedSlow > 5);
  const w3 = sandboxWorld();
  w3.fuel = 1;
  drive(w3, 3, {});
  assert.equal(w3.mode, 'dying');
  assert.equal(w3.deathReason, 'fuel');
  assert.equal(w3.lives, CFG.startLives - 1);
});

test('lives: three deaths end the game', () => {
  const w = sandboxWorld({});
  const DT = 1 / 120;
  for (let i = 0; i < 3; i++) {
    w.buggy.invuln = 0;
    w.craters = [{ type: 'crater', x1: w.buggy.x + 5, x2: w.buggy.x + 60, width: 55, large: true, scored: false }];
    for (let k = 0; k < 600 && w.mode === 'running'; k++) step(w, DT, {});
    assert.equal(w.mode, 'dying', `death ${i + 1} should occur`);
    for (let k = 0; k < 400 && w.mode === 'dying'; k++) step(w, DT, {});
    if (i < 2) {
      assert.equal(w.mode, 'running', 'should respawn');
      assert.ok(w.buggy.invuln > 0, 'invulnerable after respawn');
    }
  }
  assert.equal(w.mode, 'gameover');
});

test('deterministic simulation for identical inputs', () => {
  const mk = () => { const w = createWorld({ seed: 5150 }); w.buggy.invuln = 0; return w; };
  const a = mk(), b = mk();
  drive(a, 20, { right: true });
  drive(b, 20, { right: true });
  assert.equal(a.buggy.x, b.buggy.x);
  assert.equal(a.score, b.score);
  assert.equal(a.lives, b.lives);
  assert.equal(a.letter, b.letter);
});
