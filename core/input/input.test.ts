// Story 1.2 AC2/AC3: the device-capture service maps physical devices onto
// the AD-7 slot grammar per tick — axis {forward,strafe}, aim {dx,dy},
// button {down,pressed}. Pins from the I/O matrix: per-tick deltas consumed
// exactly once, drag-look fallback feeds the SAME aim channel with the
// same view shape as the pointer-locked path (AD-26 replay safety), the
// buffer is cleared on visibility change, E edges exactly once per press,
// and a canvas click only (re)arms pointer lock — it never targets or
// interacts (AC4/UX-DR18). Headless by construction: the service touches
// no DOM; the host seam is the injectable pointer-lock request. Story 2.4
// adds the tuning-slice pins: a rebound movement table (Interact stays KeyE),
// the "arrows"/"drag" look sources writing the SAME aim channel with no
// pointer-lock request, and the sensitivity multiplier landing once per take
// — all through the injected getters; defaults stay byte-identical to 1.2.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ARROW_LOOK_PX_PER_TICK,
  createInputService,
  DEFAULT_BINDING_TABLE,
  type DeviceView,
  type InputTuning,
  type PointerLockHost,
} from "./index.ts";

function harness(): {
  input: ReturnType<typeof createInputService>;
  lockRequests: number[];
} {
  const lockRequests: number[] = [];
  let seq = 0;
  const host: PointerLockHost = { requestPointerLock: () => { lockRequests.push(seq++); } };
  return { input: createInputService(host), lockRequests };
}

const idle: DeviceView = {
  axes: { forward: 0, strafe: 0 },
  aim: { dx: 0, dy: 0 },
  interact: { down: false, pressed: false },
};

test("WASD maps to axis levels in {-1,0,1}; opposing keys cancel", () => {
  const { input } = harness();
  input.key("KeyW", true);
  assert.deepEqual(input.takeView().axes, { forward: 1, strafe: 0 });
  input.key("KeyS", true);
  assert.deepEqual(input.takeView().axes, { forward: 0, strafe: 0 }); // W+S cancel
  input.key("KeyS", false);
  input.key("KeyA", true);
  input.key("KeyD", true);
  assert.deepEqual(input.takeView().axes, { forward: 1, strafe: 0 });
  input.key("KeyD", false);
  assert.deepEqual(input.takeView().axes, { forward: 1, strafe: -1 });
  input.key("KeyW", false);
  input.key("KeyA", false);
  assert.deepEqual(input.takeView(), idle);
});

test("pointer-locked aim: mouse-move deltas accumulate and are consumed once per tick", () => {
  const { input } = harness();
  input.pointerLockChanged(true);
  input.mouseMove(30, -10);
  input.mouseMove(12, 4);
  const v = input.takeView();
  assert.deepEqual(v.aim, { dx: 42, dy: -6 }); // accumulated between ticks
  assert.deepEqual(input.takeView().aim, { dx: 0, dy: 0 }); // consumed exactly once
});

test("unlocked without drag: mouse moves feed nothing (no accidental look)", () => {
  const { input } = harness();
  input.mouseMove(50, 50);
  assert.deepEqual(input.takeView().aim, { dx: 0, dy: 0 });
});

test("drag-look fallback: button-down drag feeds the same aim channel as locked look", () => {
  const { input } = harness();
  input.mouseDown(0);
  input.mouseMove(15, 7);
  input.mouseUp(0);
  const dragged = input.takeView();
  assert.deepEqual(dragged.aim, { dx: 15, dy: 7 });
  input.mouseMove(99, 99); // released -> no further aim
  assert.deepEqual(input.takeView().aim, { dx: 0, dy: 0 });

  // AC3: the recorded view shape is identical to the locked path's.
  const locked = harness().input;
  locked.pointerLockChanged(true);
  locked.mouseMove(15, 7);
  assert.deepEqual(Object.keys(dragged), Object.keys(idle));
  assert.deepEqual(Object.keys(dragged.aim), Object.keys(idle.aim));
  assert.deepEqual(Object.keys(dragged.axes), Object.keys(idle.axes));
  assert.deepEqual(Object.keys(dragged.interact), Object.keys(idle.interact));
  const lockedView = locked.takeView();
  assert.deepEqual(Object.keys(lockedView), Object.keys(dragged));
  assert.deepEqual(lockedView.aim, dragged.aim); // same channel, same shape, same values
});

test("losing pointer lock mid-drag ends the drag state; WASD unaffected", () => {
  const { input } = harness();
  input.key("KeyW", true);
  input.mouseDown(0);
  input.pointerLockChanged(false); // Esc/lock release
  input.mouseMove(20, 20);
  const v = input.takeView();
  assert.deepEqual(v.aim, { dx: 0, dy: 0 }); // drag cancelled with the lock
  assert.equal(v.axes.forward, 1); // walking keeps working through the fallback
});

test("canvas click: its only effect is (re)requesting pointer lock \u2014 no targeting, no interact", () => {
  const { input, lockRequests } = harness();
  input.key("KeyW", true);
  input.canvasClick();
  input.canvasClick(); // lock release re-arms on next click, silently
  assert.equal(lockRequests.length, 2);
  const v = input.takeView();
  assert.deepEqual(v.interact, { down: false, pressed: false }); // click is not the interact verb
  assert.deepEqual(v.axes, { forward: 1, strafe: 0 }); // and never moves input otherwise
});

test("E button: level held, pressed edges exactly once per physical press", () => {
  const { input } = harness();
  input.key("KeyE", true);
  assert.deepEqual(input.takeView().interact, { down: true, pressed: true });
  assert.deepEqual(input.takeView().interact, { down: true, pressed: false }); // held = level only
  assert.deepEqual(input.takeView().interact, { down: true, pressed: false });
  input.key("KeyE", false);
  assert.deepEqual(input.takeView().interact, { down: false, pressed: false });
  input.key("KeyE", true); // new press edges again, once
  assert.deepEqual(input.takeView().interact, { down: true, pressed: true });
});

test("auto-repeat keydowns of a held key never re-arm the pressed edge (AC4 once-per-press)", () => {
  const { input } = harness();
  input.key("KeyE", true);
  assert.deepEqual(input.takeView().interact, { down: true, pressed: true }); // the fresh press edges
  input.key("KeyE", true); // OS auto-repeat while held
  input.key("KeyE", true);
  assert.deepEqual(input.takeView().interact, { down: true, pressed: false }); // repeat is level-only
  input.key("KeyE", false);
  input.key("KeyE", true); // a real new press edges again
  assert.deepEqual(input.takeView().interact, { down: true, pressed: true });
});

test("E press-and-release between two ticks still edges exactly once (replay-safe latch)", () => {
  const { input } = harness();
  input.key("KeyE", true);
  input.key("KeyE", false);
  assert.deepEqual(input.takeView().interact, { down: false, pressed: true });
  assert.deepEqual(input.takeView().interact, { down: false, pressed: false });
});

test("visibility change clears the whole device buffer (no look/walk burst on resume)", () => {
  const { input } = harness();
  input.pointerLockChanged(true);
  input.key("KeyW", true);
  input.key("KeyE", true);
  input.mouseMove(500, 500); // would teleport the look on resume if kept
  input.visibilityChanged(); // tab hidden or shown
  const v = input.takeView();
  assert.deepEqual(v, idle); // keys dropped, aim dropped, E level/edge dropped
});

test("pointerLocked reflects lock state (QA/debug surface; the glue compares document.pointerLockElement itself)", () => {
  const { input } = harness();
  assert.equal(input.pointerLocked, false);
  input.pointerLockChanged(true);
  assert.equal(input.pointerLocked, true);
});

// --- Story 2.4: the tuning slice -------------------------------------------
// The glue closes the getters over core/settings.ts rows, so every pin here
// drives behavior through a getter, never a rebuild. Absent tuning = the
// shipped defaults, and every 1.2 pin above must stay green unchanged.

function tuned(tuning: InputTuning): {
  input: ReturnType<typeof createInputService>;
  lockRequests: number[];
} {
  const lockRequests: number[] = [];
  const host: PointerLockHost = { requestPointerLock: () => { lockRequests.push(1); } };
  return { input: createInputService(host, tuning), lockRequests };
}

test("Story 2.4 default table pins the shipped WASD codes — four movement verbs only, E never joins the table", () => {
  assert.deepEqual(DEFAULT_BINDING_TABLE, {
    forward: "KeyW",
    back: "KeyS",
    left: "KeyA",
    right: "KeyD",
  });
});

test("Story 2.4 remap: the four verbs follow the table — rebound KeyQ walks, old KeyW idles; Interact stays KeyE (mockup: 'Interact stays E this release.')", () => {
  const { input } = tuned({
    bindingTable: () => ({ forward: "KeyQ", back: "KeyZ", left: "KeyV", right: "KeyB" }),
  });
  input.key("KeyW", true);
  input.key("KeyD", true);
  assert.deepEqual(input.takeView().axes, idle.axes, "the old WASD codes idle once rebound");
  input.key("KeyW", false);
  input.key("KeyD", false);
  input.key("KeyQ", true);
  assert.deepEqual(input.takeView().axes, { forward: 1, strafe: 0 });
  input.key("KeyB", true);
  assert.deepEqual(input.takeView().axes, { forward: 1, strafe: 1 });
  input.key("KeyB", false);
  input.key("KeyQ", false);
  input.key("KeyZ", true);
  assert.deepEqual(input.takeView().axes, { forward: -1, strafe: 0 });
  input.key("KeyZ", false);
  input.key("KeyV", true);
  assert.deepEqual(input.takeView().axes, { forward: 0, strafe: -1 });
  input.key("KeyV", false);
  const v = input.takeView();
  input.key("KeyE", true);
  const w = input.takeView();
  assert.equal(w.interact.down, true, "the button never moves with the table");
  assert.equal(w.interact.pressed, true);
  assert.deepEqual(v.axes, idle.axes);
});

test("Story 2.4 look source 'arrows': held arrows write ±ARROW_LOOK_PX_PER_TICK into the SAME aim channel per take (consumed once), axes stay 0, and no canvas click ever requests pointer lock", () => {
  const { input, lockRequests } = tuned({ lookSource: () => "arrows" });
  input.canvasClick();
  assert.equal(lockRequests.length, 0, "arrows mode never requests the lock (matrix row)");
  input.key("ArrowLeft", true);
  assert.equal(input.takeView().aim.dx, -ARROW_LOOK_PX_PER_TICK, "held arrow produces each take");
  assert.equal(input.takeView().aim.dx, -ARROW_LOOK_PX_PER_TICK, "consumed once per take");
  assert.deepEqual(input.takeView().axes, idle.axes, "arrows look, never walk");
  input.key("ArrowUp", true);
  assert.deepEqual(input.takeView().aim, { dx: -ARROW_LOOK_PX_PER_TICK, dy: -ARROW_LOOK_PX_PER_TICK }, "same {dx,dy} channel, mouse signs");
  input.key("ArrowLeft", false);
  input.key("ArrowUp", false);
  assert.deepEqual(input.takeView().aim, idle.aim, "released arrows stop writing");
  const plain = harness().input;
  plain.key("ArrowRight", true);
  assert.deepEqual(plain.takeView().aim, idle.aim, "mouse mode ignores arrows — a stray arrow never teleports the look");
});

test("Story 2.4 look source 'drag': the canvas click never requests the lock — the drag IS the source, feeding the same aim channel lock-free", () => {
  const { input, lockRequests } = tuned({ lookSource: () => "drag" });
  input.canvasClick();
  assert.equal(lockRequests.length, 0, "drag source asks for no lock (UX-DR18 silence intact)");
  input.mouseDown(0);
  input.mouseMove(7, -3);
  input.mouseUp(0);
  assert.deepEqual(input.takeView().aim, { dx: 7, dy: -3 }, "drag-look lands with zero locks granted");
});

test("Story 2.4 review law (the page owns the keyboard while it is up): lookEnabled false gates the LOOK channel — arrows stop producing, a pending delta is consumed but never emitted — while MOVEMENT axes stay live (crossing back closes the panel, AC7)", () => {
  const { input } = tuned({ lookSource: () => "arrows", lookEnabled: () => false });
  input.key("ArrowLeft", true);
  input.key("KeyW", true);
  const gated = input.takeView();
  assert.deepEqual(gated.aim, idle.aim, "gated arrows produce NOTHING (mutation: delete the lookEnabled gate -> red here)");
  assert.equal(gated.axes.forward, 1, "movement stays live under the gate — the walk-back law still closes the panel");
  input.key("ArrowLeft", false);
  input.key("KeyW", false);
  // The accumulate-then-gate flip: consumed exactly once, never emitted,
  // never remembered (no backlog when the gate re-opens).
  let on = true;
  const { input: flippy } = tuned({ lookEnabled: () => on });
  flippy.pointerLockChanged(true);
  flippy.mouseMove(40, 10);
  assert.deepEqual(flippy.takeView().aim, { dx: 40, dy: 10 }, "enabled: the delta emits normally");
  flippy.mouseMove(40, 10);
  on = false;
  assert.deepEqual(flippy.takeView().aim, idle.aim, "gated mid-cycle: the pending delta is consumed, NOT emitted");
  assert.deepEqual(flippy.takeView().aim, idle.aim, "and nothing carries into the next view");
  on = true;
  flippy.mouseMove(3, 0);
  assert.deepEqual(flippy.takeView().aim, { dx: 3, dy: 0 }, "re-enabled: the fresh delta only — no backlog");
});

test("Story 2.4 aim multiplier (sensitivity value/50): lands ONCE on the consumed channel; live getter — no rebuild; default 1.0 keeps 1.2 deltas byte-identical", () => {
  let mult = 1;
  const { input } = tuned({ aimMultiplier: () => mult });
  input.pointerLockChanged(true);
  input.mouseMove(50, -20);
  assert.deepEqual(input.takeView().aim, { dx: 50, dy: -20 }, "1.0 default unchanged");
  mult = 2;
  input.mouseMove(50, -20);
  assert.deepEqual(input.takeView().aim, { dx: 100, dy: -40 }, "the live getter lands on the NEXT take");
  assert.deepEqual(input.takeView().aim, idle.aim, "multiplied exactly once — the raw accumulator is consumed");
});
