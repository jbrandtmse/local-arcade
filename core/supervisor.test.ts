// AC5 pinning: the supervisor catches faults at kernel call sites, logs
// {tick, errorId}, and the loop keeps running (AD-15; I/O matrix rows 3,4).
import test from "node:test";
import assert from "node:assert/strict";
import { createSupervisor, MAX_FAULT_RECORDS } from "./supervisor.ts";
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

test("a throwing onFault consumer is contained: the fault is recorded, invoke still returns", () => {
  const sup = createSupervisor(() => {
    throw new Error("fault consumer down");
  });
  const bad = sup.invoke({ tick: 2, gameId: "g1", hook: "tick", call: () => { throw new Error("sim"); } });
  assert.equal(bad.ok, false);
  assert.equal(bad.fault?.message, "sim"); // the sim fault survives the consumer crash
  assert.equal(bad.fault?.errorId, "g1.tick#1");
  assert.equal(sup.faults.length, 1);
  const ok = sup.invoke({ tick: 3, gameId: "g1", hook: "tick", call: () => 7 });
  assert.equal(ok.value, 7); // and the call sites keep working afterwards
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

// Story 1.7 (DW-3): the ring cap keeps the fault list honest across a long
// broken run — bounded size, most-recent kept, overflow counted, counter
// gap-free (the future fault-marker basis, AD-26).
test("the fault ring caps at MAX_FAULT_RECORDS: 200 faults leave the newest 64 in the list, count the rest in droppedFaults, and the errorId counter keeps rising gap-free (DW-3)", () => {
  const sup = createSupervisor();
  for (let i = 1; i <= 200; i++) {
    sup.invoke({ tick: i, gameId: "g1", hook: "tick", call: () => { throw new Error(`boom ${i}`); } });
  }
  assert.equal(sup.faults.length, MAX_FAULT_RECORDS, "the list never grows past the cap (mutation: dropping the ring trim leaves all 200 here)");
  assert.equal(sup.faults[0]?.errorId, `g1.tick#${200 - MAX_FAULT_RECORDS + 1}`, "the ring keeps the MOST RECENT records (the SEAT_EVENT_WINDOW shift law)");
  assert.equal(sup.faults[MAX_FAULT_RECORDS - 1]?.errorId, "g1.tick#200", "the newest fault is at the ring's tail");
  assert.equal(sup.droppedFaults, 200 - MAX_FAULT_RECORDS, "the overflow is counted, never silently lost");
});
