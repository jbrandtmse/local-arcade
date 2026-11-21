// AC5 pinning: the supervisor catches faults at kernel call sites, logs
// {tick, errorId}, and the loop keeps running (AD-15; I/O matrix rows 3,4).
import test from "node:test";
import assert from "node:assert/strict";
import { createSupervisor } from "./supervisor.ts";
import { createKernelLoop, type KernelLoop } from "./loop.ts";
import type { GameInstance } from "./contract/index.ts";

test("unit: faults are caught, logged, never rethrown; ok path returns the value", () => {
  const logged: Array<{ tick: number; errorId: string }> = [];
  const sup = createSupervisor((e) => logged.push({ tick: e.tick, errorId: e.errorId }));
  const ok = sup.invoke({ tick: 1, gameId: "g1", hook: "tick", call: () => 42 });
  assert.equal(ok.ok, true);
  assert.equal(ok.value, 42);
  const bad = sup.invoke({ tick: 3, gameId: "g1", hook: "tick", call: () => { throw new Error("boom"); } });
  assert.equal(bad.ok, false);
  assert.equal(bad.fault?.tick, 3);
  assert.equal(bad.fault?.errorId, "g1.tick#1");
  assert.equal(bad.fault?.message, "boom");
  assert.deepEqual(logged, [{ tick: 3, errorId: "g1.tick#1" }]);
  assert.equal(sup.faults.length, 1);
  // errorId counter keeps rising deterministically
  sup.invoke({ tick: 4, gameId: "g1", hook: "events", call: () => { throw new Error("later"); } });
  assert.equal(sup.faults[1]?.errorId, "g1.events#2");
});

function flakySim(): GameInstance & { ticks: number } {
  const sim: GameInstance & { ticks: number } = {
    ticks: 0,
    tick(dt) {
      sim.ticks += 1;
      if (sim.ticks === 3) throw new Error("sim exploded mid-tick");
    },
    events: () => [],
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  };
  return sim;
}

function brokenEventsSim(): GameInstance {
  return {
    tick: () => {},
    events: () => {
      throw new Error("events fault");
    },
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  };
}

test("throwing sim inside tick(): supervisor logs {tick, errorId}, loop keeps ticking", () => {
  let wall = 0;
  const loop: KernelLoop = createKernelLoop({ now: () => wall });
  const throwy = flakySim();
  let steadyTicks = 0;
  loop.addInstance("throwy", throwy);
  loop.addInstance("steady", {
    tick: () => {
      steadyTicks += 1;
    },
    events: () => [],
    snapshot: () => ({}),
    stateHash: () => "0".repeat(16),
    attract: () => {},
    autoplay: () => {},
    mode: () => "attract" as const,
  });

  for (let i = 0; i < 5; i++) {
    wall += 17;
    loop.step(); // must not throw
  }
  assert.equal(loop.tickCount, 5); // loop survived the fault
  assert.equal(throwy.ticks, 5); // its tick site kept being driven
  assert.equal(steadyTicks, 5); // the neighbour kept performing
  assert.equal(loop.supervisor.faults.length, 1);
  assert.equal(loop.supervisor.faults[0]?.tick, 3);
  assert.equal(loop.supervisor.faults[0]?.errorId, "throwy.tick#1");
  assert.match(loop.supervisor.faults[0]?.message as string, /sim exploded/);
});

test("events() call site is also wrapped: a fault there is logged, loop alive", () => {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  loop.addInstance("bad-events", brokenEventsSim());
  for (let i = 0; i < 3; i++) {
    wall += 17;
    assert.doesNotThrow(() => loop.step());
  }
  assert.equal(loop.tickCount, 3);
  assert.equal(loop.supervisor.faults.length, 3);
  assert.equal(loop.supervisor.faults[0]?.errorId, "bad-events.events#1");
});
