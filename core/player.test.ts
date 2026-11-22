// Story 1.2 AC2/AC4/AC6/AC7: first-person controller pins, one per I/O
// matrix row — walk at 1.4 m/s along facing with eye height 1.60m, pitch
// clamp ±85°, diagonal speed magnitude, circle-vs-AABB blocking against
// placeholder walls/pillars/cabinet stubs with wall slide, head bob by
// distance with settle to 1.60m, center-of-view targeting (reach 2.0m,
// targetable volumes only), E-press edges once with no consumer -> no state
// change and no event, and the "Integration" row: two headless loop runs
// with identical scripted device views produce identical player transcripts.
// Tests pin volume IDS, not raw coords, wherever they can (Shared surfaces).
import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlayerController,
  EYE_HEIGHT,
  WALK_SPEED,
  PLAYER_RADIUS,
  BOB_AMPLITUDE,
  BOB_WAVELENGTH,
  BOB_SETTLE_SECONDS,
  MOUSE_SENSITIVITY,
  PITCH_LIMIT,
  TARGET_REACH,
  type PlayerController,
  type PlayerState,
} from "./player.ts";
import type { DeviceView } from "./input/index.ts";
import { createInputService } from "./input/index.ts";
import { collisionVolumes, INTERIOR, type CollisionVolume } from "./room/collision-volumes.ts";
import { createKernelLoop, MAX_CATCHUP_STEPS, MS_PER_TICK, type KernelLoop } from "./loop.ts";
import { math } from "./contract/index.ts";

function view(
  axes: [number, number] = [0, 0],
  aim: [number, number] = [0, 0],
  btn: [boolean, boolean] = [false, false],
): DeviceView {
  return {
    axes: { forward: axes[0]!, strafe: axes[1]! },
    aim: { dx: aim[0]!, dy: aim[1]! },
    interact: { down: btn[0]!, pressed: btn[1]! },
  };
}

function volById(id: string): CollisionVolume {
  const v = collisionVolumes.find((c) => c.id === id);
  assert.ok(v, `placeholder volume "${id}" must exist (1.3 keeps the id)`);
  return v;
}

function stepN(p: PlayerController, n: number, v: DeviceView): void {
  for (let i = 0; i < n; i++) p.step(1, v);
}

test("placeholder collision data: authored ids, envelope contract numbers, pure-data sanity (AC6)", () => {
  const ids = collisionVolumes.map((v) => v.id);
  assert.deepEqual(
    [...ids].sort(),
    ["cabinet-1", "cabinet-2", "cabinet-3", "pillar-1", "pillar-2", "wall-back", "wall-front", "wall-left", "wall-right"],
  );
  // Envelope: four walls close the 19m x 12.5m interior (room-layout.md).
  assert.equal(INTERIOR.width, 19);
  assert.equal(INTERIOR.depth, 12.5);
  assert.equal(volById("wall-back").max.z, -INTERIOR.depth / 2);
  assert.equal(volById("wall-front").min.z, INTERIOR.depth / 2);
  assert.equal(volById("wall-left").max.x, -INTERIOR.width / 2);
  assert.equal(volById("wall-right").min.x, INTERIOR.width / 2);
  // Blocking and targeting grammar: everything blocks; only cabinets target.
  for (const v of collisionVolumes) assert.equal(v.blocksMovement, true, v.id);
  for (const v of collisionVolumes) {
    assert.equal(v.targetable, v.kind === "cabinet", `${v.id} targetable`);
  }
  // Cabinet stubs sit at 1.40m pitch along the back wall (slot pitch).
  const c2 = volById("cabinet-2");
  const c3 = volById("cabinet-3");
  assert.ok(Math.abs(c3.min.x - c2.min.x - 1.4) < 1e-9, "slot pitch 1.40m");
  for (const v of collisionVolumes) {
    assert.ok(v.min.x < v.max.x && v.min.y < v.max.y && v.min.z < v.max.z, `${v.id} min<max`);
  }
});

test("walk: 1.4 m/s along facing at eye height, straight ahead (yaw 0 -> -Z)", () => {
  const p = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  stepN(p, 60, view([1, 0]));
  const s = p.state;
  assert.ok(Math.abs(s.z - (0 - WALK_SPEED)) < 1e-9, `z=${s.z}`);
  assert.ok(Math.abs(s.x - 3) < 1e-12);
  // eye height is a render-time read of EYE_HEIGHT + bob; state stays on the eye line plane
  assert.equal(EYE_HEIGHT, 1.6);
});

test("diagonal walk: input normalized before scaling -> magnitude stays 1.4 m/s", () => {
  const p = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  stepN(p, 60, view([1, 1]));
  const s = p.state;
  const dist = Math.sqrt((s.x - 3) * (s.x - 3) + (s.z - 0) * (s.z - 0));
  assert.ok(Math.abs(dist - WALK_SPEED) < 1e-9, `dist=${dist}`);
});

test("pitch clamps at \u00b185\u00b0 under violent mouse pulls; yaw turns with mouse-x", () => {
  const p = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  stepN(p, 5, view([0, 0], [0, -10000]));
  assert.equal(p.state.pitch, PITCH_LIMIT);
  stepN(p, 5, view([0, 0], [0, 10000]));
  assert.equal(p.state.pitch, -PITCH_LIMIT);
  p.step(1, view([0, 0], [-1 / MOUSE_SENSITIVITY, 0])); // yaw += exactly 1 rad
  assert.equal(p.state.yaw, 1);
});

test("wall block: stop at face minus player radius; strafing still slides", () => {
  const p = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  stepN(p, 400, view([1, 0])); // straight at the back wall
  const face = volById("wall-back").max.z;
  assert.equal(p.state.z, face + PLAYER_RADIUS);
  // pinned at the face, distance travelled is 0: the bob settles, it does not
  // oscillate in place (matrix "Head bob" — phase rides DISTANCE travelled)
  assert.equal(p.state.bobAmp, 0);
  // slide: strafe along the wall keeps z pinned, x advances
  stepN(p, 60, view([0, 1]));
  assert.equal(p.state.z, face + PLAYER_RADIUS);
  assert.ok(p.state.x > 3 + 1);
  // front wall from the other side
  const p2 = createPlayerController(collisionVolumes, { x: 0, z: 0 });
  stepN(p2, 500, view([-1, 0]));
  assert.equal(p2.state.z, volById("wall-front").min.z - PLAYER_RADIUS);
});

test("pillar and cabinet stubs block: circle pushout stops the center at face minus r", () => {
  const p = createPlayerController(collisionVolumes, { x: 4, z: 2.5 });
  stepN(p, 300, view([1, 0])); // into pillar-2
  assert.equal(p.state.z, volById("pillar-2").max.z + PLAYER_RADIUS);

  const c = createPlayerController(collisionVolumes, { x: 0, z: 3.5 });
  stepN(c, 500, view([1, 0])); // default spawn line walks into cabinet-2
  assert.equal(c.state.z, volById("cabinet-2").max.z + PLAYER_RADIUS);
});

test("head bob: amplitude holds while walking, phase rides distance, settles to 1.60m in <=0.25s", () => {
  const p = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  stepN(p, 60, view([1, 0])); // one metre of walking
  const moved = p.state;
  assert.equal(moved.bobAmp, BOB_AMPLITUDE);
  const expectedPhase = (WALK_SPEED / BOB_WAVELENGTH) * 2 * math.PI;
  assert.ok(Math.abs(moved.bobPhase - expectedPhase) < 1e-9);
  const cameraY = (s: PlayerState): number => EYE_HEIGHT + math.sin(s.bobPhase) * s.bobAmp;
  assert.notEqual(cameraY(moved), EYE_HEIGHT); // mid-stride the eye actually bobs
  // standing settles within BOB_SETTLE_SECONDS (0.25s * 60 = 15 ticks; one spare for FP)
  stepN(p, Math.ceil(BOB_SETTLE_SECONDS * 60) + 1, view());
  assert.equal(p.state.bobAmp, 0);
  assert.equal(cameraY(p.state), EYE_HEIGHT);
});

test("targeting: center-of-view within reach sets targetId; turning/moving off clears to null", () => {
  const p = createPlayerController(collisionVolumes, { x: 0, z: 3.5 });
  stepN(p, 1, view());
  assert.equal(p.state.targetId, null); // ~9m away, past reach
  p.state.z = -3.6; // scripted: just outside 2.0m of the cabinet-2 face
  stepN(p, 1, view());
  assert.equal(p.state.targetId, null);
  assert.ok(TARGET_REACH === 2.0);
  p.state.z = -3.6 - 0.2; // step in: 1.85m from the face, inside reach
  stepN(p, 1, view());
  assert.equal(p.state.targetId, "cabinet-2");
  // turn 180° via the aim channel — center of view no longer aims at it
  p.step(1, view([0, 0], [-math.PI / MOUSE_SENSITIVITY, 0]));
  assert.ok(Math.abs(Math.abs(p.state.yaw) - math.PI) < 1e-6);
  assert.equal(p.state.targetId, null);
});

test("targeting ignores non-targetable volumes: a wall at point-blank never sets targetId", () => {
  const p = createPlayerController(collisionVolumes, { x: -8.0, z: 0, yaw: math.PI / 2 });
  stepN(p, 1, view()); // facing -X at the left wall, 1.5m < reach, but kind=wall
  assert.equal(p.state.targetId, null);
});

test("E press with a target and no registered handler: no state change, no event, no fault (AC4)", () => {
  const p = createPlayerController(collisionVolumes, { x: 0, z: 3.5 });
  stepN(p, 400, view([1, 0])); // walk to the cabinet and target it
  assert.equal(p.state.targetId, "cabinet-2");
  stepN(p, 20, view()); // stand still: bob settles, phase freezes -> state is static
  assert.equal(p.state.bobAmp, 0);
  const before = p.snapshot();
  p.step(1, view([0, 0], [0, 0], [true, true])); // press edges this tick
  assert.deepEqual(p.snapshot(), before); // nothing changes without a handler
  p.step(1, view([0, 0], [0, 0], [true, false])); // hold = no repeat effect
  assert.deepEqual(p.snapshot(), before);
  // press with no target is a no-op too
  const p2 = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  const b2 = p2.snapshot();
  p2.step(1, view([0, 0], [0, 0], [true, true]));
  assert.deepEqual(p2.snapshot(), b2);
});

test("E press with a registered handler fires exactly on the press edge, once", () => {
  const p = createPlayerController(collisionVolumes, { x: 0, z: 3.5 });
  const seen: string[] = [];
  p.registerInteractable("cabinet-2", (id) => seen.push(id));
  stepN(p, 400, view([1, 0]));
  assert.equal(p.state.targetId, "cabinet-2");
  p.step(1, view([0, 0], [0, 0], [true, true]));
  p.step(1, view([0, 0], [0, 0], [true, false]));
  p.step(1, view([0, 0], [0, 0], [true, false]));
  assert.deepEqual(seen, ["cabinet-2"]); // once, on the edge tick
});

// --- Integration (Rule 1): real input service, real loop, real volumes ----

interface Session {
  loop: KernelLoop;
  transcript: PlayerState[];
  faults: number;
  events: number;
}

// A scripted 400-frame session driven through the REAL device service and
// the REAL loop pump: W held toward the back-wall cabinets, a click-granted
// pointer lock (aim deltas flow from there on), a 10s wall-clock pump gap
// (models the loop's catch-up bound only — the device-buffer half of the
// "Backgrounded tab resume" row is the visibility clear at f=390 here plus
// the input suite's buffer-clear pin), a canvas click while locked (changes
// nothing observable), a stop once the cabinet is in center-of-view reach (target
// set), a look off center in place (target clears), a re-center (target
// re-arms), an E press with the cabinet centered (no consumer this story),
// and a visibility clear. Identical scripted device events must yield
// identical observable player transcripts.
function scriptedSession(): Session {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  const input = createInputService({ requestPointerLock: () => {} });
  const player = createPlayerController(collisionVolumes);
  loop.addSystem("player", () => player.step(1, input.takeView()));
  const transcript: PlayerState[] = [];
  let events = 0;
  for (let f = 0; f < 400; f++) {
    if (f === 0) input.key("KeyW", true); // walk the -Z line at x=0
    if (f === 60) input.pointerLockChanged(true); // lock granted: aim deltas now flow
    if (f === 200) wall += 10_000; // 10s pump gap: catch-up bound only, no visibility event here
    if (f === 300) input.canvasClick(); // click changes nothing observable
    if (f === 310) input.key("KeyW", false); // stop in place once the cabinet is in reach
    if (f === 320) input.mouseMove(150, 0); // look 0.375 rad off center — target clears
    if (f === 355) input.mouseMove(-150, 0); // center it again — target re-arms
    if (f === 360) input.key("KeyE", true); // E press, cabinet centered (no consumer this story)
    if (f === 361) input.key("KeyE", false);
    if (f === 390) input.visibilityChanged(); // buffer clear: look/walk inputs drop
    loop.step();
    transcript.push(player.snapshot());
    events += loop.drainEvents().length;
    wall += MS_PER_TICK;
  }
  return { loop, transcript, faults: loop.supervisor.faults.length, events };
}

test("Integration: two headless loop runs, identical scripted device views -> identical transcripts (AC6)", () => {
  const a = scriptedSession();
  const b = scriptedSession();
  assert.deepEqual(a.transcript, b.transcript); // replay-safe, device-agnostic
  assert.ok(a.loop.tickCount > 400);
  // the transcript is non-trivial: the visitor walked, and the targeting
  // lifecycle is actually driven — set in reach, cleared by the scripted
  // look-off, re-armed by the scripted re-center
  const first = a.transcript[0]!;
  const last = a.transcript[a.transcript.length - 1]!;
  assert.notDeepEqual(first, last);
  const firstSet = a.transcript.findIndex((s) => s.targetId === "cabinet-2");
  assert.ok(firstSet >= 0, "target appears once the cabinet enters center-of-view reach");
  const cleared = a.transcript.findIndex((s, i) => i > firstSet && s.targetId === null);
  assert.ok(cleared > firstSet, "the scripted look-off clears the target");
  const rearmed = a.transcript.findIndex((s, i) => i > cleared && s.targetId === "cabinet-2");
  assert.ok(rearmed > cleared, "the scripted re-center re-arms it");
  assert.equal(a.faults, 0);
  assert.equal(a.events, 0); // E press has no consumer this story: no events
});

test("Backgrounded-tab resume: player advances at most MAX_CATCHUP_STEPS ticks in the burst frame", () => {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  const input = createInputService({ requestPointerLock: () => {} });
  const player = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  let steps = 0;
  loop.addSystem("player", () => {
    steps += 1;
    player.step(1, view([1, 0]));
  });
  for (let f = 0; f < 5; f++) {
    wall += 17; // integer-ms frames keep the accumulator FP-free (loop.test pattern)
    loop.step();
  }
  assert.equal(steps, loop.tickCount);
  wall += 10_000; // 10 s hidden-tab gap
  const ran = loop.step();
  assert.ok(ran >= 1 && ran <= MAX_CATCHUP_STEPS);
  assert.equal(steps, loop.tickCount); // the player advanced exactly the catch-up ticks, no more
  wall += 17;
  assert.equal(loop.step(), 1); // clean resume, leftover delta dropped
});
