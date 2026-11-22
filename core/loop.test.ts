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

test("non-array events() return surfaces as a supervisor fault, not a silent drop", () => {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  loop.addInstance("bad-return", {
    tick: () => {},
    events: () => null as never,
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  });
  for (let i = 0; i < 3; i++) {
    wall += 17;
    assert.doesNotThrow(() => loop.step());
  }
  assert.equal(loop.tickCount, 3); // the loop stayed alive
  assert.equal(loop.supervisor.faults.length, 3); // one fault per tick, not silence
  assert.equal(loop.supervisor.faults[0]?.hook, "events");
  assert.match(loop.supervisor.faults[0]?.message as string, /must return an array/);
  assert.deepEqual(loop.drainEvents(), []); // nothing queued from a broken events()
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

test("the start() pump re-arms after a throw outside the supervisor-wrapped calls", () => {
  let wall = 0;
  let pending: (() => void) | undefined;
  let clockCalls = 0;
  const loop = createKernelLoop({
    now: () => {
      clockCalls += 1;
      if (clockCalls === 2) throw new Error("clock glitch");
      wall += 17;
      return wall;
    },
    schedule: (cb) => {
      pending = cb;
    },
  });
  loop.addInstance("stub", {
    tick: () => {},
    events: () => [],
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  });
  loop.start();
  assert.ok(pending, "start() arms the first frame");
  for (let i = 0; i < 4; i++) {
    const cb = pending as () => void;
    pending = undefined;
    try {
      cb(); // frame 2's clock glitch spreads to the scheduler host...
    } catch {
      /* ...but the pump must have re-armed before it did */
    }
    assert.ok(pending, `frame ${i}: pump re-armed despite the throw`);
  }
  assert.equal(loop.tickCount, 3); // frames 1, 3, 4 ticked; the clock fault cost one frame, not the clock
});

test("addSystem: a kernel system runs exactly once per global tick, after instance sites", () => {
  const order: string[] = [];
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  loop.addInstance("sim-a", {
    tick: () => {
      order.push("tick");
    },
    events: () => {
      order.push("events");
      return [];
    },
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  });
  let runs = 0;
  loop.addSystem("player", () => {
    runs += 1;
    order.push("system");
  });
  for (let i = 0; i < 4; i++) {
    wall += 17;
    loop.step();
  }
  assert.equal(runs, loop.tickCount);
  assert.deepEqual(order, ["tick", "events", "system", "tick", "events", "system", "tick", "events", "system", "tick", "events", "system"]);
});

test("addSystem: a throwing system is supervisor-logged; the tick, the loop and neighbours keep running (AD-15)", () => {
  let wall = 0;
  const logged: string[] = [];
  const loop = createKernelLoop({ now: () => wall, onFault: (e) => logged.push(`${e.tick}/${e.errorId}`) });
  const simTicks: number[] = [];
  loop.addInstance("steady", {
    tick: () => {
      simTicks.push(1);
    },
    events: () => [],
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  });
  let goodRuns = 0;
  loop.addSystem("bad", () => {
    throw new Error("system boom");
  });
  loop.addSystem("good", () => {
    goodRuns += 1;
  });
  for (let i = 0; i < 3; i++) {
    wall += 17;
    assert.doesNotThrow(() => loop.step()); // the room never crashes
  }
  assert.equal(loop.tickCount, 3);
  assert.equal(simTicks.length, 3); // the instance sites kept ticking
  assert.equal(goodRuns, 3); // and the neighbouring system kept running
  assert.equal(loop.supervisor.faults.length, 3); // one fault per tick, not silence
  assert.equal(loop.supervisor.faults[0]?.hook, "tick");
  assert.deepEqual(logged, ["1/core.system.bad.tick#1", "2/core.system.bad.tick#2", "3/core.system.bad.tick#3"]);
});

test("addSystem: backgrounded-tab resume bounds kernel systems to MAX_CATCHUP_STEPS like instances", () => {
  const h = harness();
  let runs = 0;
  h.loop.addSystem("player", () => {
    runs += 1;
  });
  h.advance(17);
  h.loop.step();
  h.advance(10_000); // 10 s wall gap
  const ran = h.loop.step();
  assert.ok(ran <= MAX_CATCHUP_STEPS);
  assert.equal(runs, 1 + ran); // system ran exactly the catch-up ticks, then a clean resume
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
