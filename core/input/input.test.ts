// Story 1.2 AC2/AC3: the device-capture service maps physical devices onto
// the AD-7 slot grammar per tick — axis {forward,strafe}, aim {dx,dy},
// button {down,pressed}. Pins from the I/O matrix: per-tick deltas consumed
// exactly once, drag-look fallback feeds the SAME aim channel with the
// same view shape as the pointer-locked path (AD-26 replay safety), the
// buffer is cleared on visibility change, E edges exactly once per press,
// and a canvas click only (re)arms pointer lock — it never targets or
// interacts (AC4/UX-DR18). Headless by construction: the service touches
// no DOM; the host seam is the injectable pointer-lock request.
import test from "node:test";
import assert from "node:assert/strict";
import { createInputService, type DeviceView, type PointerLockHost } from "./index.ts";

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

test("pointerLocked reflects lock state for the glue/debug handle", () => {
  const { input } = harness();
  assert.equal(input.pointerLocked, false);
  input.pointerLockChanged(true);
  assert.equal(input.pointerLocked, true);
});
