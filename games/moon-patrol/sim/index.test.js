// Story 1.5 (Design Notes: added inside the Code Map's games/moon-patrol/
// sim/*.test.js glob): pins the SIM HALF's contract behavior — attract-clock
// liveness, the play(seed) rebuild, snapshot plainness + rng cursor, the
// gameover event pair (scoreSubmitted before gameEnded, same tick), and the
// course-clear roundBreak observed through the real wrapper with a
// deterministic replay.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameInstance } from "../../../core/contract/index.ts";
import { createSim } from './index.js';
import { sandboxWorld, drive, CFG } from './helpers.js';

const NOIN = { controls: { axes: {}, buttons: {} } };

test('attract liveness: the attract clock advances on kernel ticks', () => {
  const g = createGameInstance(createSim, 7);
  assert.equal(g.mode(), 'attract');
  const snap0 = g.snapshot();
  assert.equal(snap0.mode, 'attract');
  assert.equal(snap0.attractT, 0);
  let prevHash = g.stateHash();
  for (let t = 0; t < 20; t++) {
    g.tick(1 / 60, NOIN);
    const h = g.stateHash();
    assert.notEqual(h, prevHash, `tick ${t}: attract tick must advance the state hash`);
    prevHash = h;
  }
  const snap = g.snapshot();
  assert.ok(Math.abs(snap.attractT - 20 / 60) < 1e-9, 'attractT counts kernel ticks, not wall clock');

  // same length, same seed -> same attract state (liveness is deterministic)
  const g2 = createGameInstance(createSim, 7);
  for (let t = 0; t < 20; t++) g2.tick(1 / 60, NOIN);
  assert.deepEqual(g2.snapshot(), snap);
});

test('play(seed) rebuilds from the kernel seed; same seed replays identically', () => {
  const seq = (g, seed) => {
    g.play(seed);
    for (let t = 0; t < 600; t++) {
      g.tick(1 / 60, {
        controls: {
          axes: { move: 1 },
          buttons: { fire: { down: true }, jump: { down: t % 30 < 3 } },
        },
      });
      g.events(); // drain like the loop does
    }
    return g.snapshot();
  };
  const a = createGameInstance(createSim, 1);
  const b = createGameInstance(createSim, 1);
  const snapA = seq(a, 42);
  const snapB = seq(b, 42);

  assert.equal(snapA.mode, 'play');
  assert.equal(typeof snapA.world.rngCursor, 'number', 'the world rng cursor must be plain in the snapshot (AD-4)');
  assert.deepEqual(snapB, snapA, 'same seed + same inputs -> identical world state');
  assert.equal(a.stateHash(), b.stateHash());

  // the seed reaches the vendored world generator: a different seed diverges
  const c = createGameInstance(createSim, 1);
  const snapC = seq(c, 43);
  assert.notEqual(c.stateHash(), a.stateHash(), 'the handed-over seed must reach the world rng');

  // JSON round-trip: every live snapshot field is plain data
  assert.deepEqual(JSON.parse(JSON.stringify(snapA)), snapA, 'snapshot must survive JSON round-trip (toPlain-able)');
  assert.ok(Array.isArray(snapA.kernelRng) && snapA.kernelRng.length === 4, 'the kernel rng cursor travels too');
});

test('burst fx surfaces as a burst event with plain payload', () => {
  const g = createGameInstance(createSim, 8);
  g.play(8);
  const seen = [];
  for (let t = 0; t < 900; t++) {
    g.tick(1 / 60, { controls: { axes: { move: 1 }, buttons: { fire: { down: true } } } });
    seen.push(...g.events());
  }
  const burst = seen.find((e) => e.type === 'burst');
  assert.ok(burst, 'destroying ground objects emits a burst event for the presentation');
  assert.ok(Number.isFinite(burst.payload.x) && Number.isFinite(burst.payload.y), 'burst payload is finite numbers');
  assert.ok(Number.isInteger(burst.payload.n) && /^#[0-9a-f]{6}$/.test(burst.payload.color), 'burst n + css color');
  assert.ok(seen.some((e) => e.type === 'fire'), 'the vendored sound fx ride along as zero-payload events');
});

test('gameover drains scoreSubmitted then gameEnded, same tick', () => {
  const g = createGameInstance(createSim, 8);
  g.play(8);
  let found = null;
  for (let t = 0; t < 40000 && found === null; t++) {
    g.tick(1 / 60, { controls: { axes: { move: 1 }, buttons: {} } }); // full throttle, no jump: crash until the lives run out
    const evs = g.events();
    const gi = evs.findIndex((e) => e.type === 'gameEnded');
    if (gi >= 0) found = { t, evs, gi };
  }
  assert.ok(found, 'the crash run reaches game over');
  const { evs, gi } = found;
  assert.ok(gi >= 1, 'scoreSubmitted comes out before gameEnded in the same drain');
  assert.equal(evs[gi - 1].type, 'scoreSubmitted');
  assert.equal(typeof evs[gi - 1].payload.score, 'number');
  assert.deepEqual(evs[gi].payload, evs[gi - 1].payload, 'both carry the same score');

  // after game over the world stays frozen: no further events, hash still moves (attract? no: mode play)
  const before = g.stateHash();
  g.tick(1 / 60, { controls: { axes: { move: 1 }, buttons: {} } });
  assert.deepEqual(g.events(), [], 'a dead world emits nothing');
  assert.equal(g.stateHash(), before, 'and it mutates nothing');
});

// ---- the clear pin: a deterministic policy drives the sim to roundBreak ----
// (Design Notes: the vendored 1/120 smoke AI asserts letter>=5, not a clear,
// and cannot clear at the kernel's 1/60 decision cadence; this landing-safety
// planner can — seed 5 clears, and the same planner replayed through the real
// wrapper reproduces the clear at the identical tick.)

const B = CFG.buggy;
const reach = (speed) => (2 * B.jumpV / B.grav) * speed;

function landSafe(w, speed) {
  const la = w.buggy.x + reach(speed);
  const lb = la + B.w;
  for (const c of w.craters) {
    const ov = Math.min(lb, c.x2) - Math.max(la, c.x1);
    if (ov > 8) return false;
  }
  for (const o of w.ground) {
    if (o.type === 'plant' || o.type === 'crater') continue;
    if (o.type === 'minefield') {
      for (const m of o.mines) if (lb > m.x + 3 && la < m.x + m.w - 3) return false;
      continue;
    }
    if (lb > o.x && la < o.x + o.w) return false;
  }
  for (const e of w.enemies) {
    if (e.kind === 'hover' && lb > e.x - e.w / 2 && la < e.x + e.w / 2) return false;
  }
  return true;
}

function decide(w) {
  const front = w.buggy.x + B.w;
  const center = w.buggy.x + B.w / 2;
  let fire = false;
  let jump = false;
  let move = 1;

  const lander = w.enemies.find((e) => e.kind === 'lander');
  const hover = w.enemies.find((e) => e.kind === 'hover');

  if (lander) {
    if (Math.abs(lander.x - center) <= 12) fire = true; // narrow aligned window; keep the up-missile pipeline clear
  } else {
    fire = true;
  }

  if (!w.buggy.onGround) {
    if (!landSafe(w, w.buggy.speed)) move = -1; // air brake
    return { move, fire, jump: false };
  }

  if (hover) {
    if (hover.x > front && hover.x - front < reach(w.buggy.speed) * 0.45) jump = true;
    else if (hover.x < front && hover.x > w.buggy.x - 40) jump = true;
  }
  for (const bo of w.bombs) {
    if (bo.x > front && bo.x - front < reach(w.buggy.speed) * 0.55) jump = true;
  }
  for (const s of w.shells) {
    if (s.x > front && s.x - front < 90) jump = true;
  }
  for (const c of w.craters) {
    if (c.x1 > front && c.x1 - front < reach(w.buggy.speed) * 0.45) jump = true;
  }
  for (const o of w.ground) {
    if (o.type === 'minefield') {
      for (const m of o.mines) {
        if (m.x > front && m.x - front < reach(w.buggy.speed) * 0.42) jump = true;
      }
      continue;
    }
    if (o.type === 'plant' || o.type === 'crater') continue;
    if (o.x + o.w >= front && o.x - front < reach(w.buggy.speed) * 0.42) jump = true;
  }

  if (jump && !landSafe(w, w.buggy.speed)) {
    const imminent = w.craters.some((c) => c.x1 <= front + 12 && c.x2 > front) ||
      w.ground.some((o) => o.type !== 'plant' && o.type !== 'crater' && o.type !== 'minefield' && o.x + o.w > front && o.x <= front + 12);
    if (!imminent) jump = false;
    move = -1;
  }
  return { move, fire, jump };
}

test('course clear pays roundBreak through the wrapper, at the pinned tick', () => {
  const SEED = 5;
  const CLEAR_TICK = 15302; // pinned replay identity (Design Notes)
  const CONT_TICK = 15572; // clear + 270 ttl ticks: the pinned continuation tick
  const g = createGameInstance(createSim, SEED);
  g.play(SEED);
  let breakTick = -1;
  for (let t = 0; t < 16000 && breakTick < 0; t++) {
    const w = g.snapshot().world;
    const u = decide(w);
    g.tick(1 / 60, {
      controls: { axes: { move: u.move }, buttons: { fire: { down: u.fire }, jump: { down: u.jump } } },
    });
    for (const e of g.events()) {
      if (e.type === 'roundBreak') breakTick = t;
      assert.notEqual(e.type, 'gameEnded', 'the pinned policy must not die before the clear');
    }
  }
  assert.equal(breakTick, CLEAR_TICK, 'roundBreak must land on the pinned deterministic tick');
  assert.equal(g.snapshot().world.score, 48100, 'clear score pinned as the determinism witness');

  // Champion continuation (matrix "Course clear" row): the vendored rule in
  // src/main.js:67-76 — re-homed in the sim wrapper because AC1 discards the
  // main.js layer. The clear panel runs its ttl, then the same run continues
  // on the champion course (courseIndex 1) carrying score/lives/extraLifeIdx.
  const livesAtBreak = g.snapshot().world.lives;
  const extraAtBreak = g.snapshot().world.extraLifeIdx;
  let contTick = -1;
  for (let t = CLEAR_TICK + 1; t < CLEAR_TICK + 400 && contTick < 0; t++) {
    const u = decide(g.snapshot().world);
    g.tick(1 / 60, {
      controls: { axes: { move: u.move }, buttons: { fire: { down: u.fire }, jump: { down: u.jump } } },
    });
    for (const e of g.events()) {
      assert.notEqual(e.type, 'gameEnded', 'the pinned policy survives the continuation window');
    }
    const after = g.snapshot().world;
    if (after.courseIndex === 1 && after.mode === 'running') contTick = t;
  }
  assert.equal(contTick, CONT_TICK, 'the continuation must land on the pinned deterministic tick');
  const champ = g.snapshot().world;
  assert.equal(champ.courseIndex, 1, 'Beginner -> Champion (vendored law)');
  assert.equal(champ.score, 48100, 'score carries across the continuation');
  assert.equal(champ.lives, livesAtBreak, 'lives carry across the continuation');
  assert.equal(champ.extraLifeIdx, extraAtBreak, 'extra-life progress carries across');
  assert.equal(champ.buggy.x, 40, 'the champion course starts from the fresh spawn');
});

test('live world stays snapshot-plain (numeric up.hits, grpRef diamonds clone)', () => {
  const w = sandboxWorld();
  const grpRef = { id: 1, n: 3, alive: 3 };
  for (let i = 0; i < 3; i++) {
    w.enemies.push({
      kind: 'ufo', type: 'bomber', x: w.buggy.x + CFG.buggy.w / 2, y: 90 + i * 40, w: 36, h: 14,
      oid: 11 + i,
      vx: 0, baseY: 90 + i * 40, phase: i, bombT: 9, diveT: 99, diving: false, diveT2: 0,
      hp: 1, group: 1, grpRef, spin: 0,
    });
  }
  // drive until the volley has hits recorded, then inspect BEFORE the shot expires
  let up = null;
  for (let i = 0; i < 120 && !(up && up.hits.length >= 3); i++) {
    drive(w, 0.5 / 120, { fire: true });
    up = w.buggy.up;
  }
  assert.ok(up && up.hits.length >= 3, 'one volley pierced the stacked formation');
  assert.ok(up.hits.every((h) => Number.isInteger(h)), 'up.hits stays a numeric oid array, never object refs');

  // the snapshot projection (drop the harness fields) must survive a clone
  const { rng, math, ...rest } = w;
  const clone = structuredClone(rest);
  assert.deepEqual(JSON.parse(JSON.stringify(clone)), clone, 'with a live up.hits and grpRef, the plain projection stays JSON-plain');
  assert.equal(typeof rng.getState(), 'number', 'the world cursor is readable for the snapshot');
});
