// AC3 pinning: the master loop is one global fixed 1/60 tick decoupled from
// render; a long wall gap advances at most MAX_CATCHUP_STEPS, the leftover
// delta is dropped, resume is clean, and sim time = tick count (AD-3).
import test from "node:test";
import assert from "node:assert/strict";
import { createKernelLoop, MS_PER_TICK, MAX_CATCHUP_STEPS, TICK_DT, type KernelLoop } from "./loop.ts";
import type { GameInstance } from "./contract/index.ts";

interface Harness {
  loop: KernelLoop;
  advance: (ms: number) => void;
  dts: number[];
  inputs: Array<Record<string, unknown>>;
  sim: GameInstance & { simTicks: number };
}

function harness(): Harness {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  const dts: number[] = [];
  const inputs: Array<Record<string, unknown>> = [];
  const sim: GameInstance & { simTicks: number } = {
    simTicks: 0,
    tick(dt, input) {
      dts.push(dt);
      inputs.push(input as unknown as Record<string, unknown>);
      sim.simTicks += 1;
    },
    events: () => [],
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  };
  loop.addInstance("stub", sim, { controls: { axis: 0.5 } });
  return { loop, advance: (ms) => { wall += ms; }, dts, inputs, sim };
}

test("normal cadence: exactly one fixed 1/60 tick per step, dt constant", () => {
  const h = harness();
  for (let i = 0; i < 10; i++) {
    h.advance(17); // integer-ms frames keep the accumulator FP-free
    assert.equal(h.loop.step(), 1, `frame ${i}`);
  }
  assert.equal(h.loop.tickCount, 10);
  assert.equal(h.dts.length, 10);
  for (const dt of h.dts) assert.equal(dt, TICK_DT); // every sim sees exactly 1/60
  for (const input of h.inputs) assert.deepEqual(input, { controls: { axis: 0.5 } });
});

test("sub-frame wall time accumulates: ticks follow wall, not frames", () => {
  const h = harness();
  for (let i = 0; i < 10; i++) {
    h.advance(10); // 100 ms total wall over 10 frames
    h.loop.step();
  }
  assert.equal(h.loop.tickCount, 5); // 100 ms / (1000/60) = 5 full ticks
});

test("backgrounded-tab resume: 10s gap -> MAX_CATCHUP_STEPS ticks, leftover dropped, clean resume", () => {
  const h = harness();
  h.advance(17);
  h.loop.step();
  h.advance(10_000); // 10 s wall gap
  const ran = h.loop.step();
  assert.equal(ran, MAX_CATCHUP_STEPS); // at most 5 ticks that frame
  assert.equal(h.loop.tickCount, 1 + MAX_CATCHUP_STEPS);
  // leftover delta dropped: the next ordinary frame runs exactly one tick, not a backlog
  h.advance(17);
  assert.equal(h.loop.step(), 1);
  assert.equal(h.loop.tickCount, 2 + MAX_CATCHUP_STEPS);
});

test("start() without a schedule pump throws TypeError", () => {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  assert.throws(() => loop.start(), TypeError);
});

test("start() pumps step() through the injected schedule and re-arms each frame", () => {
  let wall = 0;
  let pending: (() => void) | undefined;
  const loop = createKernelLoop({
    now: () => wall,
    schedule: (cb) => {
      pending = cb;
    },
  });
  const dts: number[] = [];
  loop.addInstance("stub", {
    tick(dt) {
      dts.push(dt);
    },
    events: () => [],
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  });
  loop.start();
  assert.ok(pending, "start() arms the first frame");
  for (let i = 0; i < 10; i++) {
    wall += 17;
    const cb = pending as () => void;
    pending = undefined;
    cb();
    assert.ok(pending, `frame ${i}: pump re-armed the schedule`);
  }
  assert.equal(loop.tickCount, 10);
  assert.equal(dts.length, 10);
  for (const dt of dts) assert.equal(dt, TICK_DT);
});

test("sim time = tick count: sim's own tick count always equals loop.tickCount", () => {
  const h = harness();
  let stepsSum = 0;
  for (const ms of [MS_PER_TICK, MS_PER_TICK * 0.3, MS_PER_TICK * 0.7, MS_PER_TICK * 3.9, MS_PER_TICK, 90_000, MS_PER_TICK]) {
    h.advance(ms);
    stepsSum += h.loop.step();
  }
  assert.equal(h.loop.tickCount, stepsSum);
  assert.equal(h.sim.simTicks, h.loop.tickCount);
  assert.equal(h.dts.length, h.loop.tickCount);
});
