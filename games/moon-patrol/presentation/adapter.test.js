// Story 1.5 pins for the presentation half: drawFrame is a deterministic
// function of the snapshot sequence (op-log equality), the attract screen
// lives off the attract clock (cycle + parallax differ at 720-tick steps),
// the vendored attract title block renders, the PRESS ENTER blink law is
// observed honestly on the kernel clock, burst/gameEnded events drive the
// presentation-own particles and high score, and the adapter source stays
// free of wall clocks and DOM (the liveness + hermetic-presentation law).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGameInstance } from "../../../core/contract/index.ts";
import { createSim } from '../sim/index.js';
import { createPresentation } from './adapter.js';

// a recording fake 2D context: method calls append canonical op strings.
function makeRecordingAdapter() {
  const ops = [];
  const rec = (name) => (...args) => {
    ops.push(`${name}(${args.map((a) => (typeof a === 'number' ? String(a) : JSON.stringify(a))).join(',')})`);
  };
  const ctx = {
    fillRect: rec('fillRect'),
    strokeRect: rec('strokeRect'),
    fillText: rec('fillText'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    closePath: rec('closePath'),
    fill: rec('fill'),
    arc: rec('arc'),
    measureText: (s) => ({ width: s.length * 6 }),
    createLinearGradient: (...a) => {
      ops.push(`grad(${a.join(',')})`);
      return { addColorStop: (o, c) => ops.push(`stop(${o},${JSON.stringify(c)})`) };
    },
  };
  const makeCanvas = (width, height) => ({
    width,
    height,
    getContext: (kind) => {
      assert.equal(kind, '2d');
      return ctx;
    },
  });
  const pres = createPresentation({ makeCanvas });
  return { pres, ops };
}

function frameLogs(pres, ops, views) {
  const logs = [];
  for (const v of views) {
    const before = ops.length;
    pres.drawFrame(v);
    logs.push(ops.slice(before).join(';'));
  }
  return logs;
}

test('drawFrame is a pure function of the snapshot sequence (op-log determinism)', () => {
  const playSnapshots = (seed) => {
    const g = createGameInstance(createSim, seed);
    g.play(seed);
    const views = [g.snapshot()];
    for (let t = 1; t <= 600; t++) {
      g.tick(1 / 60, { controls: { axes: { move: 1 }, buttons: { fire: { down: t % 3 < 2 } } } });
      g.events(); // drain like the main loop does
      views.push(g.snapshot());
    }
    return views;
  };
  const a = makeRecordingAdapter();
  const b = makeRecordingAdapter();
  const views = playSnapshots(8);
  const logsA = frameLogs(a.pres, a.ops, views);
  const logsB = frameLogs(b.pres, b.ops, views);
  assert.deepEqual(logsB, logsA, 'identical snapshot sequence -> identical draw ops');
  assert.notEqual(logsA[0], logsA[600], 'tick 0 and tick 600 must paint differently (liveness)');

  // the play HUD carries the game identity: title in every play frame
  assert.ok(logsA[0].includes('"MOON PATROL"'), 'play HUD shows the title');
});

test('attract screen lives off the attract clock, not the wall clock', () => {
  const g = createGameInstance(createSim, 7);
  const views = [];
  for (let block = 0; block < 3; block++) {
    if (block === 0) views.push(g.snapshot());
    for (let t = 0; t < 720; t++) g.tick(1 / 60, { controls: { axes: {}, buttons: {} } });
    views.push(g.snapshot());
  }
  const a = makeRecordingAdapter();
  const logs = frameLogs(a.pres, a.ops, views);
  assert.notEqual(logs[0], logs[1], '720 attract ticks (theme cycle + parallax) change the paint');
  assert.notEqual(logs[1], logs[2], 'and keep changing on the next 720');
  for (const log of logs) {
    assert.ok(log.includes('"MOON PATROL"'), 'attract title paints');
    assert.ok(log.includes('"A CLONE OF THE 1980 IREM ARCADE CLASSIC"'), 'attract tagline paints');
  }
});

test('PRESS ENTER blinks on the kernel attract clock (honest phase pin)', () => {
  const g = createGameInstance(createSim, 7);
  const a = makeRecordingAdapter();
  // blink law floor(2t)%2, t accumulated on the tick clock: OFF at t=0,
  // ON at tick 40 (t ~= 0.667), OFF at tick 70 (t ~= 1.167). (Design Notes:
  // the exact half-second tick accumulates to just under 0.5 in float, so
  // the blink window pins off-center, honestly.)
  const l0 = frameLogs(a.pres, a.ops, [g.snapshot()])[0];
  for (let t = 0; t < 40; t++) g.tick(1 / 60, { controls: { axes: {}, buttons: {} } });
  const lOn = frameLogs(a.pres, a.ops, [g.snapshot()])[0];
  assert.ok(!l0.includes('"PRESS ENTER"'), 'blink phase floor(2t)%2 is OFF at t=0');
  assert.ok(lOn.includes('"PRESS ENTER"'), 'ON mid-window (the vendored blink law)');
  for (let t = 0; t < 30; t++) g.tick(1 / 60, { controls: { axes: {}, buttons: {} } });
  const lOff = frameLogs(a.pres, a.ops, [g.snapshot()])[0];
  assert.ok(!lOff.includes('"PRESS ENTER"'), 'and OFF again in the next even window');
});

test('burst events paint presentation particles; gameEnded raises the attract high score', () => {
  const g = createGameInstance(createSim, 7);
  const a = makeRecordingAdapter();
  const base = frameLogs(a.pres, a.ops, [g.snapshot()])[0];
  a.pres.onEvent({ type: 'burst', payload: { x: 100, y: 200, n: 12, color: '#c9c2b4' } });
  const withBurst = frameLogs(a.pres, a.ops, [g.snapshot()])[0];
  // particles are drawn as 3x3 rects; the burst color rides in fillStyle,
  // which the recorder does not log -- so count the extra 3x3 rects instead
  const rect3 = (log) => log.split(';').filter((op) => op.endsWith(',3,3)')).length;
  assert.ok(rect3(withBurst) > rect3(base), 'a burst paints extra particle rects');

  a.pres.onEvent({ type: 'gameEnded', payload: { score: 48100 } });
  const hiLog = frameLogs(a.pres, a.ops, [g.snapshot()])[0];
  assert.ok(hiLog.includes('"HI-SCORE 048100"'), 'the cabinet high score follows the emitted game over');
});

test('adapter source is free of wall clocks and DOM', () => {
  const src = readFileSync(new URL('./adapter.js', import.meta.url), 'utf8');
  for (const banned of ['performance', 'document', 'window', 'localStorage', 'Date.now', 'Math.random', 'createElement', 'requestAnimationFrame']) {
    assert.ok(!src.includes(banned), `adapter must not mention ${banned}`);
  }
  assert.ok(src.includes("'\\u2190'") || src.includes('\\u2190'), 'legend arrows stay authored as escape sequences');
});
