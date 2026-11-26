// Story 1.9 QA: two matrix rows the implement and review-pass suites left
// without an executed module-tier witness. (1) "Hidden tab during the beat"
// was labelled-by-reasoning: here the LAW half is run — a wall-clock gap far
// past the whole 90s budget delivers zero steps and neither advances nor
// times out a mid-dolly beat (the timeout is tick-counted, AD-3); on resume
// the windows complete at their exact tick counts and the control stamp
// reads the resumed clock. The "rAF pauses the pump" half stays the lead's
// page-tier smoke (DW-12). (2) "Game-instance boot fault (1.7 no-regress)"
// was carried only by 1.7's pins staying green: here a REAL attachGameEntries
// fault (a factory throwing under hook "boot") shares one real loop with the
// entry beat and a fresh cabinet runtime — one contained boot record, no
// instance attached, the healthy instance ticked every beat tick, the
// cabinet phase advancing behind the door, and the beat reaching control on
// the exact tick. Needs only core modules; every rig is built and dropped
// inside its own test.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ENTRY_HANDLE_TICKS,
  ENTRY_OPEN_TICKS,
  ENTRY_TIMEOUT_MS,
  createEntrySequence,
} from "./entry.ts";
import { createKernelLoop } from "./loop.ts";
import { attachGameEntries } from "./containment.ts";
import type { GameRegistryEntry } from "./contract/index.ts";
import { createCabinetRuntime, stepCabinetPhase } from "./room/cabinets.ts";
import { ENTRY_SPAWN } from "./room/collision-volumes.ts";
import { EYE_HEIGHT } from "./player.ts";

test("hidden-tab witness (law tier, AD-3): a wall-clock gap far past the whole budget moves nothing and times nothing out mid-dolly; on resume the window completes at its exact tick count and the stamp reads the resumed clock (matrix 'Hidden tab during the beat')", () => {
  let wall = 1_000; // under ENTRY_TIMEOUT_MS: the init check passes
  const e = createEntrySequence({ now: () => wall, spawn: ENTRY_SPAWN, eyeHeight: EYE_HEIGHT });
  e.step(); // tick 1: door
  e.markFrameRendered();
  e.markFrameRendered();
  e.step(); // tick 2: the ready gate opens
  for (let i = 0; i < ENTRY_HANDLE_TICKS; i++) e.step(); // -> open on the handle window's end
  for (let i = 0; i < ENTRY_OPEN_TICKS / 2; i++) e.step(); // mid-dolly, openFraction 0.5
  assert.equal(e.phase(), "open", "mid-beat when the tab hides");
  assert.equal(e.state().openFraction, 0.5, "half-way down the dolly");
  const frozen = e.state();
  const frozenPose = e.pose();
  // The hidden tab: rAF pauses, so the pump delivers ZERO steps while the
  // wall clock runs four times the entire UX-DR16 budget. Nothing may move
  // and nothing may time out on wall-clock alone — a wall-based in-run
  // timeout reddens on the resume steps below (the counterfactual mutation).
  wall += ENTRY_TIMEOUT_MS * 4;
  assert.deepEqual(e.state(), frozen, "zero steps across the gap: zero movement, and the tick-counted timeout never fires on a clock reading");
  assert.deepEqual(e.pose(), frozenPose, "the camera pose stays frozen mid-dolly across the whole gap");
  for (let i = 0; i < ENTRY_OPEN_TICKS / 2 - 1; i++) e.step();
  assert.equal(e.phase(), "open", "resumed: the dolly is one tick short of home — the pause cost fiction time, not progress");
  e.step();
  assert.equal(e.phase(), "control", "the window completes at its exact tick count after the gap");
  assert.equal(e.state().timeToPlayableMs, wall, "AC3's measurement is the real clock — it includes the hidden gap the beat law never felt (device-layer, labelled)");
  assert.equal(e.state().bleedFraction, 1, "the ramp rides the same resumed ticks and reaches full");
  assert.deepEqual(e.pose(), { x: ENTRY_SPAWN.x, y: EYE_HEIGHT, z: ENTRY_SPAWN.z, yaw: 0, pitch: 0 }, "the takeover lands exactly on the spawn pose after the gap too (no pop)");
});

test("boot fault x beat (AC5, matrix 'Game-instance boot fault (1.7 no-regress)'): a factory throwing under hook \"boot\" is one contained boot record with no instance attached, and the SAME loop runs the whole entry beat to control with the healthy instance ticked every tick and the cabinet phase advancing behind the door", () => {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  let healthyTicks = 0;
  const entries: GameRegistryEntry[] = [
    {
      id: "qa-boot-faulted",
      seed: 3,
      createSim: () => {
        throw new Error("qa: factory throws under boot");
      },
    },
    {
      id: "qa-healthy",
      seed: 5,
      createSim: () => ({
        tick: () => {
          healthyTicks += 1;
        },
        events: () => [],
        snapshot: () => ({}),
      }),
    },
  ];
  const { containment, instances } = attachGameEntries(entries, loop, loop.supervisor, () => {
    throw new Error("qa: no presentation half authored");
  });
  assert.ok(containment.faultedFor("qa-boot-faulted"), "the boot-faulted game is faultedFor (the face gate + seat/scheduler degrade law)");
  assert.ok(!instances.has("qa-boot-faulted"), "the broken entry registers NO instance (DW-2: the page still opens around it)");
  assert.ok(!containment.faultedFor("qa-healthy"), "the neighbour attaches untouched — halves and entries fault independently");
  assert.equal(loop.supervisor.faults.filter((f) => f.hook === "boot").length, 1, "the throwing factory is exactly ONE boot fault record, not a cascade");
  assert.match(loop.supervisor.faults[0]!.errorId, /^qa-boot-faulted\.boot#1$/, "the record is attributed to the game under the boot hook (1.7's law, proven beside the beat)");

  const e = createEntrySequence({ now: () => wall, spawn: ENTRY_SPAWN, eyeHeight: EYE_HEIGHT });
  const cab = createCabinetRuntime(); // fresh runtime: this test creates the state it asserts on
  loop.addSystem("entry", () => e.step());
  loop.addSystem("cabinets", () => stepCabinetPhase(cab, 1));
  for (let i = 1; i <= 50; i++) {
    wall += 17;
    assert.doesNotThrow(() => loop.step(), "the room never crashes next to a boot-faulted entry (AD-15)");
    if (i <= 2) e.markFrameRendered(); // the frame stamp: rendered frames ride the tick
  }
  assert.equal(e.phase(), "ready-handle", "mid-beat while the boot fault stands recorded and contained");
  assert.equal(healthyTicks, 50, "the healthy instance ticks on EVERY beat tick — the room keeps running behind the closed door (the bleed's light source)");
  assert.equal(cab.phase, 50, "the cabinet attract phase advances through the beat, tick-counted like the beat itself");
  while (e.phase() !== "control" && loop.tickCount < 1_000) {
    wall += 17;
    assert.doesNotThrow(() => loop.step());
  }
  // Frames marked on ticks 1-2: ready on tick 3, handle ends on 63, the
  // 150-tick dolly ends on 213 — the beat law is byte-identical to the
  // healthy-room windows pinned in core/entry.test.ts.
  assert.equal(e.phase(), "control", "the beat is UNAFFECTED by the boot fault: it opens the door and takes over (the matrix row's claim, now executed)");
  assert.equal(loop.tickCount, 213, "the whole room loop ran exactly the beat's tick count to takeover");
  assert.equal(e.state().tick, 213, "the beat clock rode the loop's throughout");
  assert.equal(healthyTicks, 213, "and the healthy sim never missed a tick on the way");
  // 209 step() calls carry 213 fixed ticks (the accumulator banks the
  // 17-16.667 ms residue), so the takeover stamp is the clock value of the
  // final call — exactly what the injected source was when control landed.
  assert.equal(e.state().timeToPlayableMs, wall, "the measurement stamped at takeover reads the loop's own wall source");
  assert.deepEqual(e.pose(), { x: ENTRY_SPAWN.x, y: EYE_HEIGHT, z: ENTRY_SPAWN.z, yaw: 0, pitch: 0 }, "the takeover pose is exact even beside a faulted entry");
  assert.equal(loop.supervisor.faults.length, 1, "still exactly the one boot record — the beat and the room added no faults of their own");
});
