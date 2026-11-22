// Story 1.2 QA additions: pins for implemented-surface behaviours the
// controller/input/loop suites leave unobserved — X-axis circle-vs-AABB
// pushout (left/right walls block and slide), the targeting ray's pitch
// term, aim-delta consumption through the real loop (the delta lands on
// exactly one tick view), and the determinism seam: player/input derive
// from core/contract math and never touch wall-clock or engine-variable
// intrinsics (AC7 engine-identity construction). Hermetic: every test
// builds its own controller/service/loop; no shared state, no run order.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createPlayerController,
  MOUSE_SENSITIVITY,
  PLAYER_RADIUS,
  type PlayerController,
} from "./player.ts";
import { createInputService, type DeviceView } from "./input/index.ts";
import { collisionVolumes, type CollisionVolume } from "./room/collision-volumes.ts";
import { createKernelLoop, type KernelLoop } from "./loop.ts";

const REPO = path.resolve(import.meta.dirname, "..");

function mv(
  axes: [number, number] = [0, 0],
  aim: [number, number] = [0, 0],
): DeviceView {
  return {
    axes: { forward: axes[0]!, strafe: axes[1]! },
    aim: { dx: aim[0]!, dy: aim[1]! },
    interact: { down: false, pressed: false },
  };
}

function volById(id: string): CollisionVolume {
  const v = collisionVolumes.find((c) => c.id === id);
  assert.ok(v, `volume "${id}" must exist (1.3 keeps the id)`);
  return v;
}

function stepN(p: PlayerController, n: number, v: DeviceView): void {
  for (let i = 0; i < n; i++) p.step(1, v);
}

test("side walls block: X-face clamp stops the center at face minus radius; walking on keeps sliding (AC6)", () => {
  const p = createPlayerController(collisionVolumes, { x: 0, z: 0 });
  stepN(p, 600, mv([0, 1])); // D held: +X into wall-right
  assert.equal(p.state.x, volById("wall-right").min.x - PLAYER_RADIUS);
  assert.equal(p.state.z, 0); // pure strafing never drifts on the other axis
  stepN(p, 60, mv([1, 0])); // walk along the wall's inside face: slides, x pinned
  assert.equal(p.state.x, volById("wall-right").min.x - PLAYER_RADIUS);
  assert.ok(p.state.z < 0);
  // the other side: wall-left
  const q = createPlayerController(collisionVolumes, { x: 0, z: 0 });
  stepN(q, 600, mv([0, -1])); // A held: -X into wall-left
  assert.equal(q.state.x, volById("wall-left").max.x + PLAYER_RADIUS);
});

// Targeting is controller behaviour — run against a test-local targetable
// fixture (the authored room has no cabinets until 1.4's shells).
test("targeting respects pitch: looking steeply up past the cabinet top clears the target (AC4)", () => {
  const fixture: CollisionVolume = {
    id: "qa-cabinet",
    min: { x: -0.35, y: 0, z: -4.6 },
    max: { x: 0.35, y: 1.8, z: -4.0 },
    blocksMovement: true,
    targetable: true,
    kind: "cabinet",
  };
  const p = createPlayerController([fixture], { x: 0, z: -1.9 });
  stepN(p, 400, mv([1, 0])); // walk to the cabinet face, centered
  assert.equal(p.state.targetId, "qa-cabinet");
  p.step(1, mv([0, 0], [0, -0.8 / MOUSE_SENSITIVITY])); // pitch rises to +0.8 rad
  assert.ok(Math.abs(p.state.pitch - 0.8) < 1e-9);
  assert.equal(p.state.targetId, null); // the center of view clears the 1.8m top
});

test("aim deltas land exactly once through the real loop: the next tick sees zero, not a carry (AC2)", () => {
  let wall = 0;
  const loop: KernelLoop = createKernelLoop({ now: () => wall });
  const input = createInputService({ requestPointerLock: () => {} });
  const player = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  loop.addSystem("player", () => player.step(1, input.takeView()));
  let runs = 0;
  loop.addSystem("count", () => {
    runs += 1;
  });
  wall += 17;
  loop.step(); // tick 1: idle device view
  input.pointerLockChanged(true);
  input.mouseMove(40, 0); // one burst lands between two ticks
  wall += 17;
  loop.step(); // tick 2: the accumulated delta is consumed...
  const yawAfter = player.state.yaw;
  assert.ok(Math.abs(yawAfter + 40 * MOUSE_SENSITIVITY) < 1e-12, `yaw=${yawAfter}`);
  wall += 17;
  loop.step(); // tick 3: ...nothing carries into the next view
  assert.equal(player.state.yaw, yawAfter);
  assert.equal(runs, 3);
});

test("determinism seam (AC7): player and input derive from contract math, never wall-clock or engine-variable intrinsics", () => {
  const playerSrc = readFileSync(path.join(REPO, "core", "player.ts"), "utf8");
  assert.match(playerSrc, /from "\.\/contract\/index\.ts"/, "player imports the contract math module");
  for (const banned of ["Math.sin(", "Math.cos(", "Math.tan(", "Math.atan", "Math.PI", "Date.now", "performance.now", "Math.random"]) {
    assert.ok(!playerSrc.includes(banned), `core/player.ts must not use ${banned}`);
  }
  const inputSrc = readFileSync(path.join(REPO, "core", "input", "index.ts"), "utf8");
  for (const banned of ["Date.now", "performance.now", "Math.random", "Math.sin(", "Math.cos("]) {
    assert.ok(!inputSrc.includes(banned), `core/input/index.ts must not use ${banned}`);
  }
});
