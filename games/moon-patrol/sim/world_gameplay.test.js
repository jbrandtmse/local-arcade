// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5 port; provenance line in the world.js header). SEAM EDIT ONLY:
// import paths point at this sim folder (+ helpers.js wraps createWorld to
// inject the math harness). The shoot/score/checkpoint/enemy gameplay law is
// pinned verbatim except ONE seam-consistent fixture edit: up.hits now keys
// on a numeric oid (world.js header), so the up-missile multi-hit fixture
// below stamps oids on its hand-pushed enemies — in real play the spawns
// carry them. The law being pinned (one volley pierces the whole stack) is
// unchanged.

import test from 'node:test';
import assert from 'node:assert/strict';
import { sandboxWorld, drive, driveUntilNotRunning, CFG, createWorld, step } from './helpers.js';
import { scoreFor } from './config.js';

test('forward shot destroys a small rock for table score', () => {
  const w = sandboxWorld();
  const r = { type: 'rock', size: 0, x: w.buggy.x + 150, w: 16, h: 13, hp: 1 };
  w.ground.push(r);
  drive(w, 2, { right: true, fire: true });
  assert.equal(w.ground.length, 0);
  assert.equal(w.score, scoreFor(0, 'rockSmall'));
});

test('double rock: two hits with intermediate score, half-destroyed state', () => {
  const w = sandboxWorld();
  const s = CFG.rock.sizes[2];
  const r = { type: 'rock', size: 2, x: w.buggy.x + 250, w: s.w, h: s.h, hp: s.hp };
  w.ground.push(r);
  drive(w, 2.5, { fire: true }); // fireCd 0.55: two volleys inside 2.5s
  assert.equal(w.ground.length, 0);
  assert.equal(w.score, scoreFor(0, 'rockBigHit') + scoreFor(0, 'rockBigKill'));
});

test('mines cannot be shot and are fatal on the ground', () => {
  const w = sandboxWorld();
  const field = {
    type: 'minefield', x1: w.buggy.x + 100, x2: w.buggy.x + 300,
    mines: [{ type: 'mine', x: w.buggy.x + 200, w: 15, h: 12 }],
  };
  w.ground.push(field);
  drive(w, 3, { fire: true });
  assert.equal(w.ground.length, 1, 'mine survives gunfire');
  assert.equal(w.mode, 'dying');
  assert.equal(w.deathReason, 'mine');
});

// Story 1.6 (DW-25): the vendored respawn pad-clear predicate read
// o.x + o.w for EVERY ground item; minefields (and craters-as-ground items)
// carry x1/x2, so the expression was NaN and NaN never filters — a minefield
// sitting on the landing pad survived respawn and killed the freshly
// respawned buggy the moment its invulnerability lapsed. Fixed upstream
// first (working tree), then re-vendored: the span idiom createCrater uses.
test('DW-25: respawn clears a minefield on the landing pad; the old rock/crater legs still filter; off-pad fields survive', () => {
  const w = sandboxWorld();
  const x0 = w.buggy.x;
  const onPad = { type: 'minefield', x1: x0 + 30, x2: x0 + 130, mines: [{ type: 'mine', x: x0 + 40, w: 15, h: 12 }] };
  const far = { type: 'minefield', x1: x0 + 900, x2: x0 + 1000, mines: [{ type: 'mine', x: x0 + 950, w: 15, h: 12 }] };
  w.ground.push(onPad, far, { type: 'rock', size: 0, x: x0 + 200, w: 16, h: 13, hp: 1 });
  w.craters.push({ type: 'crater', x1: x0 + 60, x2: x0 + 90, width: 30, large: false, scored: false });
  // die on the mine ahead of the buggy (rock/crater sit further along)
  driveUntilNotRunning(w, 4, { right: true });
  assert.equal(w.mode, 'dying');
  assert.equal(w.deathReason, 'mine');
  const xDeath = w.buggy.x; // the pad is computed from the death position
  // drive one beat past the respawn delay: mode flips back to running
  drive(w, CFG.buggy.respawnDelay + 0.05, {});
  assert.equal(w.mode, 'running', 'respawn happened (the buggy is back on the pad)');
  const padHit = (a, b) => b > xDeath - 80 && a < xDeath + 240;
  assert.ok(
    !w.ground.some(o => o.type === 'minefield' && padHit(o.x1, o.x2)),
    'DW-25: no minefield remains anywhere on the respawn pad',
  );
  assert.ok(w.ground.includes(far), 'minefields clear of the pad are never filtered (no over-clear)');
  assert.equal(w.ground.filter(o => o.type === 'rock').length, 0, 'the rock on the pad still filters (unchanged leg)');
  assert.equal(w.craters.length, 0, 'the crater on the pad still filters (unchanged leg)');
  assert.equal(w.buggy.y, CFG.view.GROUND_Y, 'the buggy stands on a cleared pad');
});

test('jump clears a minefield', () => {
  const w = sandboxWorld();
  // mines placed between bunny-hop landing spots (landings are deterministic: x0 + k*jump-reach)
  const field = {
    type: 'minefield', x1: w.buggy.x + 15, x2: w.buggy.x + 340,
    mines: [125, 200, 260].map(d => ({ type: 'mine', x: w.buggy.x + d, w: 15, h: 12 })),
  };
  w.ground.push(field);
  drive(w, 3, { jump: true });
  assert.equal(w.mode, 'running');
});

test('checkpoint gates: minor refuels, major evaluates time + changes stage', () => {
  const w = createWorld({ seed: 31 });
  w.ground = [];
  w.craters = [];
  w.nextEvent = w.course.events.length;
  w.fuel = 10;
  const gMinor = w.course.gates[0];
  w.buggy.x = gMinor.x - 20;
  w.buggy.invuln = 0;
  drive(w, 0.5, { right: true });
  assert.equal(w.letter, 0);
  assert.ok(Math.abs(w.fuel - (10 + CFG.fuel.minorRefill)) < 1, 'minor checkpoint refuels'); // minus drain during drive
  assert.equal(w.stage, 0);

  const gMajor = w.course.gates[CFG.majors[0]];
  w.buggy.x = gMajor.x - 20;
  w.fuel = 10;
  drive(w, 0.5, { right: true });
  assert.equal(w.stage, 1);
  assert.ok(w.fuel > 99, 'major checkpoint refuels fully');
  assert.ok(w.score >= CFG.score.segmentBase[0], 'segment bonus paid');
  assert.ok(w.banner && w.banner.text.includes('BONUS'));
});

test('slow segment gets no time bonus but still advances stage', () => {
  const w = createWorld({ seed: 31 });
  w.ground = []; w.craters = [];
  w.nextEvent = w.course.events.length;
  w.segStartT = -200; // segment already 200s old
  w.buggy.x = w.course.gates[CFG.majors[0]].x - 10;
  w.buggy.invuln = 0;
  drive(w, 0.5, { right: true });
  assert.equal(w.stage, 1);
  assert.equal(w.score, 0);
});

test('course completion pays clear bonus and reaches done', () => {
  const w = createWorld({ seed: 5 });
  w.ground = []; w.craters = [];
  w.nextEvent = w.course.events.length;
  w.nextGate = w.course.gates.length; // skip checkpoint processing
  w.buggy.x = w.course.endX - 10;
  w.buggy.invuln = 0;
  drive(w, 1, { right: true });
  assert.equal(w.mode, 'cleared');
  assert.ok(w.clear.bonus >= CFG.score.courseBonus);
  for (let i = 0; i < 700 && !w.done; i++) step(w, 1 / 120, {});
  assert.ok(w.done);
});

test('extra lives awarded once at each threshold', () => {
  const w = sandboxWorld();
  w.score = CFG.extraLives[0] - 10;
  const r = { type: 'rock', size: 0, x: w.buggy.x + 150, w: 16, h: 13, hp: 1 };
  w.ground.push(r);
  const livesBefore = w.lives;
  drive(w, 2, { fire: true });
  assert.equal(w.lives, livesBefore + 1);
  assert.equal(w.extraLifeIdx, 1);
  drive(w, 2, { fire: true }); // no more rocks; no double-award
  assert.equal(w.lives, livesBefore + 1);
});

test('lander touching down ends the game (home-port rule)', () => {
  const w = sandboxWorld();
  w.enemies.push({ kind: 'lander', x: w.buggy.x + 100, y: 60, w: 26, h: 24, hp: 1, alarmT: 0 });
  const fallT = (CFG.view.GROUND_Y - 12 - 60) / CFG.lander.sink + 0.5;
  drive(w, fallT, {}); // runs until touchdown triggers the death sequence
  assert.ok(w.lives <= 0, 'lander touchdown zeroes the run');
  drive(w, fallT + 4, {}); // let the death sequence resolve
  assert.equal(w.mode, 'gameover');
});

test('lander can be shot down', () => {
  const w = sandboxWorld();
  // placed directly above the buggy's up-missile line: the first volley hits it
  w.enemies.push({ kind: 'lander', x: w.buggy.x + CFG.buggy.w / 2, y: 120, w: 26, h: 24, hp: 1, alarmT: 0 });
  drive(w, 2, { fire: true });
  assert.equal(w.enemies.length, 0);
  assert.equal(w.mode, 'running');
  assert.ok(w.score >= scoreFor(0, 'lander'));
});

test('crater-UFO bombs create new craters', () => {
  const w = sandboxWorld();
  w.enemies.push({
    kind: 'ufo', type: 'crater', x: w.buggy.x + 120, y: 90, w: 36, h: 14,
    vx: -20, baseY: 90, phase: 0, bombT: 0.2, diveT: 99, diving: false, diveT2: 0,
    hp: 1, group: null, spin: 0,
  });
  drive(w, 4, {});
  assert.ok(w.craters.length >= 1, 'bomb created a crater');
  const c = w.craters[0];
  const reach = (2 * CFG.buggy.jumpV / CFG.buggy.grav) * CFG.buggy.slow;
  assert.ok(reach >= c.width + CFG.buggy.w - 2 * (CFG.buggy.fallOverlap - 2) + 4, 'created crater must be jumpable');
});

test('warning lights activate from lookahead and stay off otherwise', () => {
  const w = createWorld({ seed: 11 });
  w.buggy.invuln = 0;
  // clear generated events, install known ones
  w.course.events = [{ type: 'ufo', ufoType: 'bomber', x: w.buggy.x + 400 }];
  w.nextEvent = 0;
  step(w, 1 / 120, {});
  assert.equal(w.warnings.saucer, true);
  w.course.events = [];
  step(w, 1 / 120, {});
  assert.equal(w.warnings.saucer, false);

  w.ground.push({ type: 'minefield', x1: w.buggy.x + 400, x2: w.buggy.x + 600, mines: [] });
  step(w, 1 / 120, {});
  assert.equal(w.warnings.mine, true);

  w.ground = [];
  w.course.events = [{ type: 'hover', x: w.buggy.x + 500 }];
  w.nextEvent = 0;
  step(w, 1 / 120, {});
  assert.equal(w.warnings.behind, true);
});

test('rear hover charges and kills a grounded buggy', () => {
  const w = sandboxWorld();
  w.enemies.push({ kind: 'hover', x: w.buggy.x - 200, y: CFG.view.GROUND_Y, w: 44, h: 13, state: 'stalk', timer: 0.5, vx: 0, hp: 1 });
  driveUntilNotRunning(w, 4, { left: true }); // hold slow so it catches up
  assert.equal(w.mode, 'dying');
  assert.equal(w.deathReason, 'hover');
});

test('a charging hover can jump over a hopping buggy and then parks, shootable', () => {
  const w = sandboxWorld();
  w.enemies.push({ kind: 'hover', x: w.buggy.x + 180, y: CFG.view.GROUND_Y, w: 44, h: 13, state: 'idle', timer: 0, vx: 0, hp: 1 });
  drive(w, 2, { fire: true });
  assert.equal(w.enemies.length, 0, 'parked hover shot by forward cannon');
  assert.ok(CFG.score.rearCar.includes(w.score), 'rear-car bonus paid');
});

test('tanks shoot shells that are lethal', () => {
  const w = sandboxWorld();
  w.ground.push({ type: 'tank', x: w.buggy.x + 240, w: 42, h: 24, hp: 2, shellT: 0.1 });
  let sawShell = false;
  for (let i = 0; i < 300 && w.mode === 'running'; i++) {
    step(w, 1 / 120, { left: true });
    if (w.shells.length > 0) sawShell = true;
  }
  assert.ok(sawShell, 'tank fired');
  assert.equal(w.mode, 'dying');
});

test('bombs from bombers are lethal and shootable', () => {
  const w = sandboxWorld();
  w.enemies.push({
    kind: 'ufo', type: 'bomber', x: w.buggy.x + 40, y: 100, w: 36, h: 14,
    vx: -10, baseY: 100, phase: 0, bombT: 0.2, diveT: 99, diving: false, diveT2: 0,
    hp: 1, group: null, spin: 0,
  });
  drive(w, 1.4, {});
  const w2 = sandboxWorld();
  w2.enemies.push({
    kind: 'ufo', type: 'bomber', x: w2.buggy.x + CFG.buggy.w / 2, y: 100, w: 36, h: 14,
    vx: -10, baseY: 100, phase: 0, bombT: 0.2, diveT: 99, diving: false, diveT2: 0,
    hp: 1, group: null, spin: 0,
  });
  drive(w2, 3, { fire: true });
  assert.equal(w2.enemies.length, 0, 'ufo shot down by up-missile');
});

test('formation of UFOs pays formation bonus when all destroyed', () => {
  const w = sandboxWorld();
  const gid = 1;
  const grpRef = { id: 1, n: 3, alive: 3 };
  // parked in a column directly above the up-missile line: one volley pierces all
  for (let i = 0; i < 3; i++) {
    w.enemies.push({
      kind: 'ufo', type: 'bomber', x: w.buggy.x + CFG.buggy.w / 2, y: 90 + i * 40, w: 36, h: 14,
      oid: 11 + i, // seam-consistent: up.hits keys on oid now (header note)
      vx: 0, baseY: 90 + i * 40, phase: i, bombT: 9, diveT: 99, diving: false, diveT2: 0,
      hp: 1, group: gid, grpRef, spin: 0,
    });
  }
  drive(w, 1, { fire: true });
  assert.equal(w.enemies.length, 0);
  assert.ok(w.score >= CFG.score.formation[0], 'formation bonus paid');
  assert.ok(w.score >= 3 * scoreFor(0, 'ufo') + CFG.score.formation[0]);
});

test('full smoke run: a course can be driven to the end without cheating', () => {
  const w = createWorld({ seed: 8 });
  let jumps = 0;
  const dt = 1 / 120;
  for (let i = 0; i < 90 * 120 && w.mode !== 'gameover' && w.mode !== 'cleared'; i++) {
    // crude AI: shoot blockers; hunt landers with the up-missile; jump gaps/blockers
    const in2 = w.buggy.x + w.buggy.speed * 0.75 + 20;
    const center = w.buggy.x + CFG.buggy.w / 2;
    const danger = w.craters.some(c => in2 + 30 > c.x1 && w.buggy.x < c.x2) ||
      w.ground.some(o => o.type !== 'plant' && o.type !== 'minefield' && o.x > w.buggy.x && o.x < in2 + 30) ||
      w.ground.some(o => o.type === 'minefield' && o.mines.some(m => m.x > w.buggy.x && m.x < in2 + 30));
    const lander = w.enemies.find(e => e.kind === 'lander');
    const fire = lander ? Math.abs(lander.x - center) < 15 : true;
    const input = { right: true, fire, jump: danger && w.buggy.onGround };
    if (input.jump) jumps++;
    step(w, dt, input);
  }
  assert.ok(jumps > 0);
  if (w.mode !== 'cleared') {
    // deaths are acceptable for a crude AI, but it must have progressed meaningfully
    assert.ok(w.letter >= 5, `AI only reached letter ${w.letter}`);
  }
});
