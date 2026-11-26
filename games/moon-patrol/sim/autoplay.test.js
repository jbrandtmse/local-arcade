// Story 1.6 (AC1/AC5): the autoplay AI's contract, driven through the REAL
// wrapper — the same surface the kernel scheduler uses on a busy cabinet.
// Three pins: the end-state bound (every fixed stub seed reaches the
// canonical break inside the measured ceiling, with >=2x headroom over the
// measurement), twin determinism (the same seed replays bit-identically),
// and the banned-API line the AI may never cross (belt for ci/lint-bans,
// which scans this file's subject with zero exemptions).
//
// The bound is a MEASURED identity: measured at implement time over the
// fixed seed list below (worst end tick 13648, seed 8, gameEnded), pinned
// here at 30000 — 2.2x headroom. If the AI or the physics change, this pin
// moves deliberately, not silently.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGameInstance } from '../../../core/contract/index.ts';
import { gameRegistry } from '../../../generated/game-registry.ts';

const BOUND_TICKS = 30000; // measured 13648 max + >=2x headroom (header)
const STUB_SEEDS = [1, 5, 8, 42, 777];

function runToBreak(seed) {
  const entry = gameRegistry.find((e) => e.id === 'moon-patrol');
  assert.ok(entry, 'the registry carries the moon-patrol entry (these pins bind to it by id, never by list position)');
  const g = createGameInstance(entry.createSim, seed);
  g.autoplay(seed);
  let end = null; // { tick, type, drained }
  for (let t = 0; t < BOUND_TICKS + 1000 && end === null; t++) {
    assert.equal(g.mode(), 'autoplay', 'a busy run stays autoplay until the break');
    g.tick(1 / 60, { controls: {} }); // the AI ignores the kernel input object
    const drained = g.events();
    for (const e of drained) {
      if (e.type === 'gameEnded' || e.type === 'roundBreak') end = { tick: t, type: e.type, drained };
    }
  }
  return { g, end };
}

test(`autoplay end state: every fixed stub seed reaches the canonical break within ${BOUND_TICKS} ticks, with the end pair in drain order`, () => {
  for (const seed of STUB_SEEDS) {
    const { g, end } = runToBreak(seed);
    assert.ok(end !== null, `seed ${seed} reaches gameEnded or roundBreak inside the ceiling`);
    assert.ok(end.tick <= BOUND_TICKS, `seed ${seed} broke at ${end.tick} <= ${BOUND_TICKS}`);
    assert.ok(end.tick * 2 <= BOUND_TICKS, `seed ${seed}: every stub run stays under half the ceiling (the >=2x-headroom law is asserted, not just header prose)`);
    if (end.type === 'gameEnded') {
      const gi = end.drained.findIndex((e) => e.type === 'gameEnded');
      assert.equal(end.drained[gi - 1].type, 'scoreSubmitted', 'the 1.5 pair order survives (scoreSubmitted first)');
      assert.equal(end.drained[gi - 2].type, 'gameover', 'the raw gameover cue rides the same drain for the slam reaction (mapping key)');
    }
    const w = g.snapshot().world;
    assert.ok(w.score > 0 || end.type === 'roundBreak', `seed ${seed} actually played (score ${w.score})`);
  }
});

test('autoplay is twin-deterministic: same seed replays the same break tick and the identical final hash', () => {
  for (const seed of [5, 42, 777]) {
    const a = runToBreak(seed);
    const b = runToBreak(seed);
    assert.equal(b.end.tick, a.end.tick, `twin seed ${seed}: same break tick`);
    assert.equal(b.end.type, a.end.type, 'twin seed: same break kind');
    assert.equal(b.g.stateHash(), a.g.stateHash(), 'twin seed: final stateHash is the replay witness');
  }
});

test('the autoplay AI never crosses the banned-API line (belt for the zero-exemption lint gate)', () => {
  const src = readFileSync(new URL('./autoplay.js', import.meta.url), 'utf8');
  const banned = [
    /Math\s*\.\s*random/,
    /Date\s*\.\s*now|new\s+Date/,
    /performance\s*\.\s*now/,
    /Math\s*\.\s*(sin|cos|tan|asin|acos|atan2|pow|exp|log)\b/,
  ];
  for (const re of banned) {
    assert.ok(!re.test(src), `autoplay.js must never mention ${re} (sim purity; ci/lint-bans enforces the same set)`);
  }
  const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of imports) {
    assert.ok(spec.startsWith('./'), `autoplay.js imports only its own sim tree (AD-2): ${spec}`);
  }
});
