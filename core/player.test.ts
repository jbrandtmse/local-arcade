// Story 1.2 AC2/AC4/AC6/AC7 pins, moved onto the authored 1.3 room per
// story 1.2's pre-authorization ("Story 1.3 rewrites that data and the
// tests that pin placeholder positions move with it"): walk at 1.4 m/s
// along facing with eye height 1.60m, pitch clamp ±85°, diagonal speed
// magnitude, circle-vs-AABB blocking against the AUTHORED walls/pillars/
// door with wall slide, head bob by distance with settle to 1.60m,
// center-of-view targeting against test-local targetable fixtures
// (targeting is controller behaviour — these pins stay fixture-driven; the
// authored room carries 1.4's one shell, pinned in core/room/cabinets.test.ts), E-press edges once with no consumer -> no state change and
// no event, and the "Integration" row: two headless loop runs with
// identical scripted device views produce identical player transcripts.
// Tests pin volume IDS, not raw coords, wherever they can (Shared surfaces).
// Data-shape pins for the authored room itself live in core/room/room.test.ts.
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
import { collisionVolumes, ENTRY_SPAWN, type CollisionVolume } from "./room/collision-volumes.ts";
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
  assert.ok(v, `authored volume "${id}" must exist`);
  return v;
}

function stepN(p: PlayerController, n: number, v: DeviceView): void {
  for (let i = 0; i < n; i++) p.step(1, v);
}

// Test-local targetable fixture (Code Map: targeting is controller behaviour
// — pass a synthetic volume list to the injectable constructor; the authored
// room now carries 1.4's cabinet-B0, but these controller pins stay
// self-contained on fixtures).
function fixtureCabinet(id: string, faceZ: number): CollisionVolume {
  return {
    id,
    min: { x: -0.35, y: 0, z: faceZ - 0.6 },
    max: { x: 0.35, y: 1.8, z: faceZ },
    blocksMovement: true,
    targetable: true,
    kind: "cabinet",
  };
}

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
  // DW-24 narrowing (Story 2.0): accumulation past pi reads back modulo the
  // wrap law — 4 rad of accumulation is 4 - 2 pi (the range boundary
  // arithmetic is the design law, not the subject's constants).
  stepN(p, 3, view([0, 0], [-1 / MOUSE_SENSITIVITY, 0]));
  assert.ok(Math.abs(p.state.yaw - (4 - 2 * Math.PI)) < 1e-9, `4 accumulated rad read back wrapped: ${String(p.state.yaw)}`);
});

// DW-24 reproduction (Story 2.0), written BEFORE the fix per the ledger's
// "repro unconfirmed": continuous mouse-x drives cumulative yaw far beyond
// one full turn (magnitude past 8 pi) while pitch holds the +/-85 deg clamp.
// Expected values are literals: the canonical range is the design law's
// [-pi, pi), the clamp is the authored 85 deg, and the wrap read-backs come
// from arithmetic on the step count and pi (the range boundary), never from
// MOUSE_SENSITIVITY, PITCH_LIMIT, or the fix's wrap constant.
test("DW-24: continuous yaw past one full turn at the pitch clamp holds the canonical range and the view basis (reproduction-first)", () => {
  const p = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  // Input-side drive only: one step turns exactly 2*pi rad. 12 steps ->
  // cumulative yaw of 24*pi rad, comfortably past the reported 8*pi.
  const fullTurn = (2 * Math.PI) / MOUSE_SENSITIVITY;
  for (let i = 0; i < 12; i++) {
    p.step(1, view([0, 0], [-fullTurn, -10000]));
    assert.ok(
      p.state.yaw >= -Math.PI && p.state.yaw < Math.PI,
      `yaw ${String(p.state.yaw)} left the canonical [-pi, pi) range at step ${String(i + 1)}`,
    );
  }
  // Pitch holds its authored clamp (85 deg, the design-law literal) through
  // every one of those steps — never exceeds it, never flips the floor into
  // the ceiling.
  assert.ok(Math.abs(p.state.pitch - (85 * Math.PI) / 180) < 1e-12, `pitch ${String(p.state.pitch)} is not the 85 deg clamp`);
  // 12 whole turns are the identity orientation: the wrapped yaw sits on 0,
  // and the view basis ((-sin yaw, -cos yaw) is the camera's look direction
  // on the yaw axis) matches the unwrapped 24*pi orientation within float
  // tolerance.
  assert.ok(Math.abs(p.state.yaw) < 1e-9, `yaw after 12 whole turns should read 0, got ${String(p.state.yaw)}`);
  assert.ok(
    Math.abs(-Math.sin(p.state.yaw) - -Math.sin(24 * Math.PI)) < 1e-9 &&
      Math.abs(-Math.cos(p.state.yaw) - -Math.cos(24 * Math.PI)) < 1e-9,
    "the wrapped orientation matches the unwrapped 24*pi orientation (the view basis never flips)",
  );
  // Half-turn steps pin a non-trivial wrap read-back: from the identity,
  // odd half-turns land on the -pi boundary of the canonical range (a +pi
  // orientation wraps to -pi), even ones return to 0.
  const halfTurn = Math.PI / MOUSE_SENSITIVITY;
  for (let k = 1; k <= 5; k++) {
    p.step(1, view([0, 0], [-halfTurn, -10000]));
    assert.ok(
      p.state.yaw >= -Math.PI && p.state.yaw < Math.PI,
      `yaw ${String(p.state.yaw)} left the canonical range at half-turn step ${String(k)}`,
    );
    const target = k % 2 === 1 ? -Math.PI : 0;
    assert.ok(Math.abs(p.state.yaw - target) < 1e-9, `after ${String(k)} half-turns yaw reads ${String(p.state.yaw)}, expected ${String(target)}`);
  }
  // Five half-turns = 5*pi: the look direction must match that orientation
  // (reversed from home) at the wrapped value.
  assert.ok(
    Math.abs(-Math.sin(p.state.yaw) - -Math.sin(5 * Math.PI)) < 1e-9 &&
      Math.abs(-Math.cos(p.state.yaw) - -Math.cos(5 * Math.PI)) < 1e-9,
    "the wrapped orientation matches the unwrapped 5*pi orientation",
  );
  assert.ok(Math.abs(p.state.pitch - (85 * Math.PI) / 180) < 1e-12, "pitch is still pinned at the 85 deg clamp at the end");
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
  // Story 2.4 moved pin (was: "presses against the closed door, never
  // through it", asserting z == door-front.min.z - PLAYER_RADIUS): the
  // door now passes — walking through the gap lands the visitor on the
  // street strip, and the far street-wall is what stops them. This is the
  // movement half of the walk-out exit (the crossing detector that OPENS
  // the settings panel lives in the glue, pinned at the boot tier).
  const p2 = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  stepN(p2, 100, view([-1, 0])); // S held: +Z through the door gap
  assert.ok(p2.state.z > volById("door-front").max.z, "walked past the door plane onto the street");
  stepN(p2, 400, view([-1, 0])); // keep walking: the street-wall bounds the strip
  assert.equal(p2.state.z, volById("street-wall").min.z - PLAYER_RADIUS);
  assert.equal(p2.state.x, ENTRY_SPAWN.x, "the 1.0m gap is centred on the spawn: x never moves");
});

test("authored room, real consumer (Rule 1): scripted W from the entry spawn stops at the wall-back face minus the player radius", () => {
  const p = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  assert.deepEqual({ x: p.state.x, z: p.state.z, yaw: p.state.yaw }, ENTRY_SPAWN);
  stepN(p, 500, view([1, 0])); // straight to the back wall at x=0
  assert.equal(p.state.z, volById("wall-back").max.z + PLAYER_RADIUS);
  assert.equal(p.state.x, ENTRY_SPAWN.x);
});

test("authored pillars block and slide: circle pushout stops at the face minus r; a diagonal into pillar-1 stops on one axis and keeps sliding (matrix Real-consumer row)", () => {
  const p = createPlayerController(collisionVolumes, { x: 3.9, z: 3.2 });
  stepN(p, 300, view([1, 0])); // -Z into pillar-2's south face
  assert.equal(p.state.z, volById("pillar-2").max.z + PLAYER_RADIUS);

  // diagonal: blocked on X against pillar-1's west face, Z keeps sliding
  const d = createPlayerController(collisionVolumes, { x: -5.0, z: 0.8 });
  stepN(d, 100, view([-1, 1])); // normalized (+X, +Z) toward the pillar face
  assert.equal(d.state.x, volById("pillar-1").min.x - PLAYER_RADIUS);
  assert.ok(d.state.z > volById("pillar-1").min.z - PLAYER_RADIUS, "slid along the face");
  assert.ok(d.state.z < volById("pillar-1").max.z + PLAYER_RADIUS, "still mid-face");
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

test("Story 2.4 effective bob: step's optional amplitude is the ONLY bob scalar the hold and the decay read — preset off (0) walks with a still eye, preset low holds half, and the settle law is the SAME law scaled (UX-DR20 supersedes 1.2's fixed ±0.04 first-visit default)", () => {
  // "off" comfort preset: amplitude 0 — phase may ride distance but the eye
  // never leaves 1.60m.
  const off = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  for (let i = 0; i < 60; i++) off.step(1, view([1, 0]), 0);
  assert.equal(off.state.bobAmp, 0, "a walked metre with amplitude 0 holds 0 (mutation: hold BOB_AMPLITUDE regardless -> red here)");
  assert.equal(EYE_HEIGHT + math.sin(off.state.bobPhase) * off.state.bobAmp, EYE_HEIGHT);
  assert.ok(off.state.bobPhase > 0, "the phase law still runs (the resolver zeroes the amplitude, not the law)");

  // "low" preset: half, held while walking AND settled with the same scale.
  const low = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  const half = BOB_AMPLITUDE / 2;
  for (let i = 0; i < 60; i++) low.step(1, view([1, 0]), half);
  assert.equal(low.state.bobAmp, half);
  for (let i = 0; i <= Math.ceil(BOB_SETTLE_SECONDS * 60); i++) low.step(1, view(), half);
  assert.equal(low.state.bobAmp, 0, "decay reaches 0 inside the same 0.25s (decay scales with the effective amplitude)");

  // The mid-walk preset SWITCH (review law): a zero effective amplitude
  // settles INSTANTLY — the same decay law scaled to zero decays by zero and
  // would strand a bob-offset eye until the next walked step.
  const switched = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  for (let i = 0; i < 10; i++) switched.step(1, view([1, 0]), half);
  assert.ok(switched.state.bobAmp > 0, "mid-stride under the low preset the eye is off the eye line");
  switched.step(1, view(), 0); // stand still and switch the preset to full
  assert.equal(switched.state.bobAmp, 0, "the zero-amplitude step settles at once (mutation: drop the bobAmplitude<=0 leg -> red here)");
  assert.equal(EYE_HEIGHT + math.sin(switched.state.bobPhase) * switched.state.bobAmp, EYE_HEIGHT, "the eye is exactly at EYE_HEIGHT on the very next read");

  // The default arity is byte-identical to 1.2: no third arg -> BOB_AMPLITUDE.
  const dflt = createPlayerController(collisionVolumes, { x: 3, z: 0 });
  stepN(dflt, 60, view([1, 0]));
  assert.equal(dflt.state.bobAmp, BOB_AMPLITUDE);
});

// Targeting pins run against a test-local targetable fixture (Code Map:
// targeting is controller behaviour — the authored room's targetable set is
// the one 1.4 shell, pinned where the shells are authored; these pins stay
// fixture-driven).
test("targeting: center-of-view within reach sets targetId; turning/moving off clears to null", () => {
  const p = createPlayerController([fixtureCabinet("qa-cabinet", -4.0)], { x: 0, z: -1.9 });
  stepN(p, 1, view());
  assert.equal(p.state.targetId, null); // 2.1m to the face, past reach
  assert.ok(TARGET_REACH === 2.0);
  p.state.z = -3.6; // 0.4m from the face, inside reach
  stepN(p, 1, view());
  assert.equal(p.state.targetId, "qa-cabinet");
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
  const p = createPlayerController([fixtureCabinet("qa-cabinet", -4.0)], { x: 0, z: -1.9 });
  stepN(p, 400, view([1, 0])); // walk to the cabinet face and target it
  assert.equal(p.state.targetId, "qa-cabinet");
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
  const p = createPlayerController([fixtureCabinet("qa-cabinet", -4.0)], { x: 0, z: -1.9 });
  const seen: string[] = [];
  p.registerInteractable("qa-cabinet", (id) => seen.push(id));
  stepN(p, 400, view([1, 0]));
  assert.equal(p.state.targetId, "qa-cabinet");
  p.step(1, view([0, 0], [0, 0], [true, true]));
  p.step(1, view([0, 0], [0, 0], [true, false]));
  p.step(1, view([0, 0], [0, 0], [true, false]));
  assert.deepEqual(seen, ["qa-cabinet"]); // once, on the edge tick
});

// --- Integration (Rule 1): real input service, real loop, real volumes ----

interface Session {
  loop: KernelLoop;
  transcript: PlayerState[];
  faults: number;
  events: number;
}

// A scripted 400-frame session driven through the REAL device service and
// the REAL loop pump over the REAL authored volumes (plus the one fixture
// shell): W held down the -Z line, a click-granted
// pointer lock (aim deltas flow from there on), a 10s wall-clock pump gap
// (models the loop's catch-up bound only — the device-buffer half of the
// "Backgrounded tab resume" row is the visibility clear at f=390 here plus
// the input suite's buffer-clear pin), a canvas click while locked (changes
// nothing observable), a stop once the cabinet is in center-of-view reach (target
// set), a look off center in place (target clears), a re-center (target
// re-arms), an E press with the cabinet centered (no consumer this story),
// and a visibility clear. Identical scripted device events must yield
// identical observable player transcripts.
// The real authored volume list plus one test-local targetable shell
// (targeting is controller behaviour; the scripted session drives the x=0
// line against its own fixture so its transcripts never depend on where
// the authored room's shells stand).
const sessionVolumes: CollisionVolume[] = [...collisionVolumes, fixtureCabinet("qa-shell", -4.95)];

function scriptedSession(): Session {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  const input = createInputService({ requestPointerLock: () => {} });
  const player = createPlayerController(sessionVolumes);
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
  const firstSet = a.transcript.findIndex((s) => s.targetId === "qa-shell");
  assert.ok(firstSet >= 0, "target appears once the shell enters center-of-view reach");
  const cleared = a.transcript.findIndex((s, i) => i > firstSet && s.targetId === null);
  assert.ok(cleared > firstSet, "the scripted look-off clears the target");
  const rearmed = a.transcript.findIndex((s, i) => i > cleared && s.targetId === "qa-shell");
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
