// Story 1.9 (AC1-AC3): the entry sequence law, executed headlessly. The
// phase windows are pinned at EXACT tick counts (the beat is tick-derived,
// AD-3 — a mutation that compares the stall BEFORE taking the tick, or that
// lets the beat skip to "control", reddens here). The input gate is pinned
// COMPOSED with the real seat.playerView (the spec's composition law:
// entry wraps the seat's view from outside, and the seat's own law stays
// untouched). The dolly's endpoint is pinned EXACT (the no-pop takeover).
// Wall-clock enters only as the injected source: the init check and the
// control stamp are pinned against a fake clock whose value is nothing the
// tick counts could produce (the AC3 mutation "stamp reads loop.tickCount"
// reddens). The entry system's supervisor wrapping (a throwing entry is a
// fault record core.system.entry.*, the room keeps ticking, and the stall
// law self-heals — AD-15) is pinned at the entry site itself on a real
// loop rig (the loop.test harness idiom), and main-glue pins the shipped
// addSystem call site.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ENTRY_HANDLE_TICKS,
  ENTRY_OPEN_TICKS,
  ENTRY_RAMP_TICKS,
  ENTRY_READY_FRAMES,
  ENTRY_STREET_VIEW,
  ENTRY_TIMEOUT_MS,
  ENTRY_TIMEOUT_TICKS,
  createEntrySequence,
} from "./entry.ts";
import type { DeviceView } from "./input/index.ts";
import { MS_PER_TICK, createKernelLoop } from "./loop.ts";
import { createSeatService } from "./seat.ts";
import { createPlayerController, EYE_HEIGHT } from "./player.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { cabinets } from "./room/cabinets.ts";

function rig(now: () => number = () => 0) {
  return createEntrySequence({ now, spawn: ENTRY_SPAWN, eyeHeight: EYE_HEIGHT });
}

function devView(axes: { forward: number; strafe: number }, aim: { dx: number; dy: number }, interact: { down: boolean; pressed: boolean }): DeviceView {
  return { axes, aim, interact };
}

/** Step the entry to "control" (marking frames on the way), returning the
 * tick the handover happened on. */
function runToControl(e: ReturnType<typeof createEntrySequence>): number {
  e.step(); // tick 1: boot-check -> door
  e.markFrameRendered();
  e.markFrameRendered();
  e.step(); // ready gate seen -> ready-handle
  for (let i = 0; i < ENTRY_HANDLE_TICKS; i++) e.step(); // -> open
  for (let i = 0; i < ENTRY_OPEN_TICKS; i++) e.step(); // -> control
  return e.state().tick;
}

test("boot starts in boot-check; the first beat tick opens the door phase on the street view (AC1, matrix row 'fresh boot')", () => {
  const e = rig();
  assert.equal(e.phase(), "boot-check", "init only checks the clock; the beat has not ticked yet");
  const pose0 = e.pose();
  assert.equal(pose0.z, ENTRY_STREET_VIEW.z, "pre-beat pose is the authored street view");
  assert.equal(pose0.y, EYE_HEIGHT, "the eye height never changes across the beat");
  e.step();
  assert.equal(e.phase(), "door", "the first beat tick starts the door phase");
  assert.equal(e.state().tick, 1, "the tick is taken (stall check runs AFTER the increment — off-by-order mutation reds here)");
});

test("the slow-load init check lands the workbench BEFORE the beat; the boundary is ENTRY_TIMEOUT_MS (AC4, matrix row 'slow tab')", () => {
  const slow = rig(() => ENTRY_TIMEOUT_MS);
  assert.equal(slow.phase(), "workbench", "a tab already past the ceiling at init never starts the beat");
  slow.step();
  assert.equal(slow.phase(), "workbench", "and stepping does not resurrect the beat");
  assert.equal(slow.state().tick, 0, "no beat tick was ever taken");
  const fresh = rig(() => ENTRY_TIMEOUT_MS - 1);
  assert.equal(fresh.phase(), "boot-check", "the boundary itself: one ms under opens the door phase path");
});

test("the ready gate holds the door phase until ENTRY_READY_FRAMES frames rendered; handle then open then control in exact tick windows (AC1/AC2)", () => {
  const e = rig();
  e.step(); // -> door
  for (let i = 0; i < 10; i++) {
    e.step();
    assert.equal(e.phase(), "door", `no frames rendered: the door phase holds (tick ${e.state().tick})`);
  }
  assert.equal(e.state().bleedFraction, Math.min(1, e.state().tick / ENTRY_RAMP_TICKS), "the bleed ramps off the beat tick while the page settles");
  e.markFrameRendered();
  e.step();
  assert.equal(e.phase(), "door", `${ENTRY_READY_FRAMES - 1} rendered frame(s) is not enough — the gate is ENTRY_READY_FRAMES`);
  e.markFrameRendered();
  const readyAt = e.state().tick;
  e.step();
  assert.equal(e.phase(), "ready-handle", "the gate opens on the first tick after the frames are in");
  for (let i = 1; i < ENTRY_HANDLE_TICKS; i++) {
    e.step();
    assert.equal(e.phase(), "ready-handle", `the handle is mid-turn (tick ${e.state().tick - readyAt} of ${ENTRY_HANDLE_TICKS})`);
  }
  e.step();
  assert.equal(e.phase(), "open", "handle complete at exactly ENTRY_HANDLE_TICKS ticks -> open");
  assert.equal(e.state().handleFraction, 1, "the handle fraction completes exactly at the window end");
  assert.equal(e.state().openFraction, 0, "the open leg starts at 0 on its transition tick");
  for (let i = 1; i < ENTRY_OPEN_TICKS; i++) {
    e.step();
    assert.equal(e.phase(), "open", `the dolly is mid-swing (tick ${i} of ${ENTRY_OPEN_TICKS})`);
  }
  e.step();
  assert.equal(e.phase(), "control", "dolly complete at exactly ENTRY_OPEN_TICKS ticks -> control");
  assert.ok(e.state().open, "state().open flips with the dolly");
});

test("the stall law: ENTRY_TIMEOUT_TICKS beat ticks with ZERO rendered frames lands the workbench on the exact tick; one rendered frame cancels it (AC4, matrix 'asset timeout')", () => {
  const e = rig();
  for (let i = 0; i < ENTRY_TIMEOUT_TICKS - 1; i++) e.step();
  assert.equal(e.phase(), "door", "not yet: the stall lands on the 5400th beat tick, not before");
  e.step();
  assert.equal(e.phase(), "workbench", "the ENTRY_TIMEOUT_TICKS-th tick with no rendered frame self-heals to the workbench");
  // Counterfactual: any rendered frame cancels the stall law (the gate may
  // still be waiting, but a visible page is not a stalled page).
  const lit = rig();
  for (let i = 0; i < ENTRY_TIMEOUT_TICKS; i++) {
    lit.step();
    if (i === 0) lit.markFrameRendered();
  }
  assert.notEqual(lit.phase(), "workbench", "a stalled-but-rendered page is not the timeout path");
});

test("the dolly is a pure lerp street-view -> spawn and ENDS EXACTLY on the spawn pose — the takeover costs no pop (AC1)", () => {
  const e = rig();
  runToControl(e);
  assert.deepEqual(
    e.pose(),
    { x: ENTRY_SPAWN.x, y: EYE_HEIGHT, z: ENTRY_SPAWN.z, yaw: 0, pitch: 0 },
    "at control the pose IS the player's ENTRY_SPAWN pose at EYE_HEIGHT, bit-exact",
  );
  // Mid-open: recompute the lerp with the same arithmetic the module uses —
  // exact equality, and monotone toward the spawn on every step.
  const m = rig();
  m.step();
  m.markFrameRendered();
  m.markFrameRendered();
  m.step(); // ready-handle
  for (let i = 0; i < ENTRY_HANDLE_TICKS; i++) m.step(); // -> open, openFraction 0
  assert.deepEqual(
    m.pose(),
    { x: ENTRY_STREET_VIEW.x, y: EYE_HEIGHT, z: ENTRY_STREET_VIEW.z, yaw: 0, pitch: 0 },
    "the open leg starts exactly on the street view (no jump at the transition)",
  );
  let prevZ = m.pose().z;
  for (let i = 1; i <= ENTRY_OPEN_TICKS; i++) {
    m.step();
    const p = m.pose();
    const f = Math.min(1, i / ENTRY_OPEN_TICKS);
    const z = f >= 1 ? ENTRY_SPAWN.z : ENTRY_STREET_VIEW.z + (ENTRY_SPAWN.z - ENTRY_STREET_VIEW.z) * f;
    assert.equal(p.z, z, `open tick ${i}: the dolly z is the lerp, computed the same way`);
    assert.ok(p.z <= prevZ, "the dolly runs street -> spawn monotonically");
    prevZ = p.z;
  }
  assert.equal(m.pose().z, ENTRY_SPAWN.z, "and lands on ENTRY_SPAWN.z exactly (the mutation 'dolly end uses STREET_VIEW z' reds here)");
});

test("playerView gates axes/aim/interact until 'control', composed OUTSIDE the real seat.playerView (AC1, matrix 'input gated during door phase')", () => {
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const seat = createSeatService({ player, cabinets });
  const raw = devView({ forward: 1, strafe: -1 }, { dx: 12, dy: -3 }, { down: true, pressed: true });
  const e = rig();
  e.step(); // door
  const duringDoor = e.playerView(seat.playerView(raw));
  assert.deepEqual(duringDoor, devView({ forward: 0, strafe: 0 }, { dx: 0, dy: 0 }, { down: false, pressed: false }), "during the door phase the visitor owns nothing");
  e.markFrameRendered();
  e.markFrameRendered();
  e.step(); // ready-handle
  e.playerView(seat.playerView(raw));
  for (let i = 0; i < ENTRY_HANDLE_TICKS; i++) e.step();
  assert.equal(e.phase(), "open");
  const duringOpen = e.playerView(seat.playerView(raw));
  assert.deepEqual(duringOpen, devView({ forward: 0, strafe: 0 }, { dx: 0, dy: 0 }, { down: false, pressed: false }), "the open phase is STILL gated (mutation 'passthrough during open' reds here)");
  for (let i = 0; i < ENTRY_OPEN_TICKS; i++) e.step();
  assert.equal(e.phase(), "control");
  const seated = seat.playerView(raw); // seat unseated: identity — the seat law is untouched
  assert.deepEqual(e.playerView(seated), seated, "at control the view passes through untouched — the seat's law composed under it");
});

test("timeToPlayableMs is the injected wall clock stamped ONCE at control — never a tick count (AC3)", () => {
  let stamp = 0;
  const e = rig(() => (stamp = 12_345)); // a value no tick count can produce
  assert.equal(e.state().timeToPlayableMs, null, "not playable yet: no measurement");
  const controlTick = runToControl(e);
  assert.equal(e.state().timeToPlayableMs, 12_345, "the stamp reads the injected clock (mutation 'stamp reads loop.tickCount' reds — the tick count is nowhere near this)");
  e.step();
  e.step();
  assert.equal(e.state().timeToPlayableMs, 12_345, "stamped exactly once — the beat is over");
  assert.ok(controlTick > 0 && controlTick < 12_345, "sanity: the tick count and the clock value are different quantities");
});

test("failNow drops to workbench from EVERY phase — control included, the console trigger the smoke uses after takeover; state() is plain data (matrix 'manual fail', Rule: debug snapshots)", () => {
  const e = rig();
  e.step();
  e.failNow();
  assert.equal(e.phase(), "workbench", "the console trigger drives the same phase the law drives");
  e.step();
  assert.equal(e.state().phase, "workbench", "terminal: stepping stays there");
  const e2 = rig();
  runToControl(e2);
  e2.failNow();
  assert.equal(e2.phase(), "workbench", "from CONTROL too: the lead's smoke calls failNow() only after state() shows phase control (Verification's manual check), so the trigger is NOT gated behind the beat's terminal law (mutation: gate failNow behind terminal(phase) and this pin reds — the smoke could never drive the swap on a real page)");
  const s = e2.state();
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s, "state() survives a JSON round-trip — plain data, no internals");
  for (const v of Object.values(s)) assert.notEqual(typeof v, "function", "no live interface leaks through state()");
});

test("control and workbench are terminal: the beat clock stops, the pose stays at spawn (no post-beat drift)", () => {
  const e = rig();
  const controlTick = runToControl(e);
  for (let i = 0; i < 10; i++) e.step();
  assert.equal(e.state().tick, controlTick, "no tick advances past control");
  assert.deepEqual(e.pose(), { x: ENTRY_SPAWN.x, y: EYE_HEIGHT, z: ENTRY_SPAWN.z, yaw: 0, pitch: 0 }, "the pose stays the spawn pose (frame's player-read branch takes over cleanly)");
});

test("the bleed/glass ramp rides the GLOBAL beat tick through ready AND open, reaching full before control — never frozen at the transitions (AC1 'widening bleed' + the smoke law 'bleed+glass reach full'; review pass 1: the phase-local freeze reds here)", () => {
  const e = rig();
  e.step(); // -> door
  const atDoor = e.state().bleedFraction;
  e.markFrameRendered();
  e.markFrameRendered();
  e.step(); // -> ready-handle
  const atReady = e.state().bleedFraction;
  assert.equal(atReady, Math.min(1, e.state().tick / ENTRY_RAMP_TICKS), "the ready entry still rides the global tick (not a phase-local clock)");
  e.step();
  assert.ok(e.state().bleedFraction > atReady, "the ramp keeps widening through the ready wait");
  for (let i = 0; i < ENTRY_HANDLE_TICKS; i++) e.step(); // -> open
  assert.equal(e.phase(), "open");
  const atOpen = e.state().bleedFraction;
  assert.ok(atOpen > atReady, "the ramp does NOT freeze at the open transition (the reviewed defect froze it mid-ramp on healthy loads)");
  e.step();
  const midOpen = e.state().bleedFraction;
  assert.ok(midOpen >= atOpen && midOpen <= 1, "it keeps riding (clamped at 1) through the dolly");
  for (let i = 0; i < ENTRY_OPEN_TICKS; i++) e.step(); // -> control
  assert.equal(e.phase(), "control");
  assert.equal(e.state().bleedFraction, 1, "a healthy beat ENDS with bleed+glass at FULL (the smoke law: they reach full)");
  e.step();
  assert.equal(e.state().bleedFraction, 1, "and hold at full once control takes over");
});

test("the two halves of the timeout law stay one ~90s budget (drift guard: ENTRY_TIMEOUT_MS vs ENTRY_TIMEOUT_TICKS x the loop's tick rate)", () => {
  assert.equal(Math.round(ENTRY_TIMEOUT_TICKS * MS_PER_TICK), ENTRY_TIMEOUT_MS, "the init wall-check ceiling and the tick-counted stall ceiling describe the same UX-DR16 budget — change one constant and this reds");
});

test("a throwing entry system is contained: fault record core.system.entry.*, the loop keeps ticking, and the tick-counted stall law self-heals to the workbench (AC5, matrix 'entry system throws'; real loop rig, loop.test idiom)", () => {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  const e = rig();
  let throwNext = false;
  // The throw sits INSIDE the system call, after entry.step took its beat
  // tick — the module's documented ordering (tick first, throw-able legs
  // after), so the beat clock keeps counting even when every call faults.
  loop.addSystem("entry", () => {
    e.step();
    if (throwNext) throw new Error("entry step fault");
  });
  throwNext = true;
  wall += 17;
  assert.doesNotThrow(() => loop.step(), "the room never crashes (loop.test law, now proven at the entry site)");
  assert.equal(loop.tickCount, 1);
  assert.equal(loop.supervisor.faults.length, 1, "the throw is one fault record, not silence");
  assert.match(loop.supervisor.faults[0]!.errorId, /^core\.system\.entry\.tick#/, "the record is attributed to the entry system by the loop's wrap law");
  assert.equal(e.state().tick, 1, "the beat tick taken before the throw survives (self-heal ordering)");
  assert.equal(e.phase(), "door", "one thrown tick does not end the beat");
  // Self-heal: every call faults AFTER taking its tick — the loop never
  // crashes and the stall law lands the workbench on the 5400th beat tick.
  while (loop.tickCount < ENTRY_TIMEOUT_TICKS - 1) {
    wall += 17;
    assert.doesNotThrow(() => loop.step());
  }
  assert.equal(e.state().tick, loop.tickCount, "the beat clock rides the loop's through every fault");
  assert.equal(e.phase(), "door", "the stall lands on the 5400th beat tick, not before");
  wall += 17;
  assert.doesNotThrow(() => loop.step());
  assert.ok(loop.tickCount >= ENTRY_TIMEOUT_TICKS);
  assert.equal(e.phase(), "workbench", "a permanently throwing entry self-heals through the tick-counted stall law — no half-door, the room never crashes");
});
