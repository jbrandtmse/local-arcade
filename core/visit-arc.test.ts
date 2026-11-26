// Story 1.5 QA end-to-end arc (AC3/AC4/AC5): one visitor's WHOLE visit on
// the scripted module surface — the surface the console smoke drives: the
// real kernel loop, real input service, real player controller, real seat
// service, and a real wrapper instance built from the build-generated
// registry. The single path the story's unit-tier tests each cover only a
// leg of, start to finish: walk in, E opens the coin door, E sits (seeded
// play in place), the run dies mid-seat, the machine flips back to attract
// ALIVE while the visitor keeps the chair, Enter restarts on a fresh
// kernel seed, E stands (pose restored exactly, door closed, attract), the
// cycle then RE-ARMS on the same visit — open, sit, play again, stand —
// and only then do the room controls resume. Hermetic: every rig builds
// its own world and consumes only its own state; run-order free.
//
// Story 1.7 tier: the rig takes an optional faultedFor predicate (seat
// injection only here — the quarantine tier is pinned in containment.test.ts
// and seat.test.ts); the arc pin below adds the mid-visit fault release.

import test from "node:test";
import assert from "node:assert/strict";
import { createKernelLoop, MS_PER_TICK, type EventRecord } from "./loop.ts";
import { createInputService, type InputService } from "./input/index.ts";
import { createPlayerController, MOUSE_SENSITIVITY, type PlayerController } from "./player.ts";
import { createSeatService, SEAT_EVENT_WINDOW, playPoseFor, type BusyGate, type SeatKeyMap } from "./seat.ts";
import { createPatronScheduler } from "./patrons/scheduler.ts";
import { createFigurePresenter } from "./patrons/presenter.ts";
import { createGameInstance, type GameInstance, type TickInput } from "./contract/index.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { createCabinetRuntime, placementGeometry, type CabinetRuntime } from "./room/cabinets.ts";
import { gameRegistry } from "../generated/game-registry.ts";

const MOON_KEYS: SeatKeyMap = {
  axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
  buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
};

interface Visit {
  loop: ReturnType<typeof createKernelLoop>;
  player: PlayerController;
  input: InputService;
  seat: ReturnType<typeof createSeatService>;
  instance: GameInstance;
  cabinets: CabinetRuntime;
  clock: { ms: number };
  tick(): void;
  key(code: string, down: boolean): void;
}

// One full rig, wired as core/main.ts wires it (registry entry through the
// wrapper, kernel-owned TickInput, player + patrons + seat systems on the
// loop). Story 1.6 rig move: the patrons system drains once per tick and
// forwards the records into seat.step(codes, records). The scheduler
// tracks nothing in this suite — the 1.5 visit arc keeps running on the
// tracked NOT-busy wiring (direct sit, seat-side flip); busy B0 is pinned
// in patrons/scheduler.test.ts.
function rig(seedFn: () => number, faultedFor?: (gameId: string) => boolean): Visit {
  const cabinets = createCabinetRuntime();
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
  const tickInput: TickInput = { controls: {} };
  loop.addInstance(entry.id, instance, tickInput);
  const input = createInputService({ requestPointerLock: () => {} });
  input.pointerLockChanged(true);
  const presenter = createFigurePresenter();
  const busyGate: BusyGate = {
    busyFor: (volumeId) => scheduler.busyFor(volumeId),
    toggleWait: (volumeId) => scheduler.toggleWait(volumeId),
  };
  const seat = createSeatService({ player, cabinets, busy: busyGate, faultedFor, seedFn });
  seat.track({
    volumeId: "cabinet-B0",
    gameId: entry.id,
    instance,
    input: tickInput,
    controls: entry.controls!,
    keys: MOON_KEYS,
  });
  player.registerInteractable("cabinet-B0", (id) => seat.handleInteract(id));
  const scheduler = createPatronScheduler({ seat, player, presenter });
  loop.addSystem("player", () => player.step(1, seat.playerView(input.takeView())));
  let patronsRecords: EventRecord[] = [];
  loop.addSystem("patrons", () => {
    patronsRecords = loop.drainEvents();
    presenter.step(loop.tickCount);
    scheduler.dispatch(patronsRecords, loop.tickCount);
  });
  loop.addSystem("seat", () => seat.step(input.takeCodeView(), patronsRecords));
  return {
    loop,
    player,
    input,
    seat,
    instance,
    cabinets,
    clock,
    tick() {
      clock.ms += MS_PER_TICK * 1.0001; // one global tick per scripted step
      assert.equal(loop.step(), 1, "exactly one global tick per frame at the tick rate");
    },
    key(code, down) {
      input.key(code, down);
    },
  };
}

// Walk into center-of-view of B0, settle 30 idle ticks (the sit/stand
// pose-identity law binds on a settled pose).
function walkToB0(seedFn: () => number, faultedFor?: (gameId: string) => boolean): Visit {
  const v = rig(seedFn, faultedFor);
  const g = placementGeometry("B0");
  const want = Math.atan2(-(g.center.x - ENTRY_SPAWN.x), -(g.center.z - ENTRY_SPAWN.z));
  v.input.mouseMove((ENTRY_SPAWN.yaw - want) / MOUSE_SENSITIVITY, 0);
  v.tick();
  v.key("KeyW", true);
  let guard = 0;
  while (v.player.state.targetId === null && guard < 6000) {
    v.tick();
    guard += 1;
  }
  v.key("KeyW", false);
  assert.ok(v.player.state.targetId === "cabinet-B0", `walk reached B0 (target=${v.player.state.targetId})`);
  for (let i = 0; i < 30; i++) v.tick();
  return v;
}

function poseOf(p: PlayerController): { x: number; z: number; yaw: number; pitch: number } {
  const s = p.state;
  return { x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch };
}

// One E press that lands inside the tick (down, one step, up).
function pressE(v: Visit): void {
  v.key("KeyE", true);
  v.tick();
  v.key("KeyE", false);
}

test("the whole visit arc in one run: walk in, open, sit, play, die seated, attract resumes alive, Enter restarts fresh, stand restores and closes, the cycle re-arms for a second sit, then the room controls resume (AC3/AC4/AC5 end to end)", () => {
  // Stub seeds in sit order: first sit, Enter restart, second sit. Seed 8
  // full throttle reaches game over inside the 4000-tick cap (the proven
  // death recipe); each sit/restart consumes the next seed in order.
  const stubs = [8, 5150, 77];
  let stubCalls = 0;
  const v = walkToB0(() => stubs[stubCalls++] ?? 999);

  const preSit = v.player.snapshot();
  assert.equal(preSit.bobAmp, 0, "the settle wait zeroed the bob (pose identity binds on a settled pose)");

  // 1) First E opens the coin door (1.4 law intact).
  pressE(v);
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], true, "first E opens the coin door");

  // 2) Second E sits: seeded play run in place, visitor on the play pose,
  // the debug record names the seated visitor and the game.
  pressE(v);
  assert.equal(stubCalls, 1, "sitting consumed exactly one kernel seed");
  assert.equal(v.instance.mode(), "play", "second E sits: the kernel handed the stub seed to play");
  assert.deepEqual(poseOf(v.player), playPoseFor("cabinet-B0"), "the visitor is on the authored play pose");
  const seated = v.seat.state();
  assert.ok(seated.seated && seated.gameId === "moon-patrol", "the arcadeDebug.seat record shows the seated visitor and its game");

  // 3) Play to death: full throttle until the machine flips to attract.
  v.key("KeyD", true);
  let flippedTick = -1;
  for (let i = 0; i < 4000 && flippedTick < 0; i++) {
    v.tick();
    if (v.instance.mode() === "attract") flippedTick = v.loop.tickCount;
  }
  v.key("KeyD", false);
  assert.ok(flippedTick > 0, "the run reaches game over inside the cap");
  assert.ok(v.seat.state().seated, "game over never ejects the visitor (no auto-eject law)");
  assert.deepEqual(poseOf(v.player), playPoseFor("cabinet-B0"), "still in the chair at game over");

  // The canonical pair drained in order, plain data, one score.
  const drained = v.seat.state().events;
  const endIdx = drained.findIndex((r) => r.event.type === "gameEnded");
  assert.ok(endIdx >= 1, "the drained window carries the game over");
  assert.equal(drained[endIdx - 1]!.event.type, "scoreSubmitted", "scoreSubmitted drains directly before gameEnded");
  assert.deepEqual(drained[endIdx]!.event.payload, drained[endIdx - 1]!.event.payload, "both records carry the same score");
  for (const r of [drained[endIdx - 1]!, drained[endIdx]!]) {
    assert.deepEqual(JSON.parse(JSON.stringify(r.event.payload)), r.event.payload, "event payloads are plain data (JSON round-trip identity)");
  }
  for (const r of drained) assert.equal(r.gameId, "moon-patrol", "every drained record carries its game id");

  // 4) The flipped machine is ALIVE: attract advances while the visitor
  // sits (the mid-visit liveness half of the 3x720 row).
  const h0 = v.instance.stateHash();
  for (let i = 0; i < 120; i++) v.tick();
  assert.notEqual(v.instance.stateHash(), h0, "attract keeps living in place after the flip (state hash advances over 120 ticks)");

  // 5) Enter restarts on the NEXT fresh seed, still seated.
  v.key("Enter", true);
  v.tick();
  v.key("Enter", false);
  assert.equal(stubCalls, 2, "the Enter edge pulled a fresh kernel seed");
  assert.equal(v.instance.mode(), "play", "Enter at attract restarts the seated visitor");
  const fresh = v.instance.snapshot() as { mode: string; world: { mode: string; buggy: { x: number } } };
  assert.equal(fresh.mode, "play", "the instance holds play again");
  assert.notEqual(fresh.world.mode, "gameover", "the vendored world rebuilt under the new seed");
  assert.equal(fresh.world.buggy.x, 40, "the fresh course starts at the authored spawn x");

  // 6) E stands back into the room: pose restored exactly, door closed,
  // machine in attract (AC4's stand half after a full death cycle).
  pressE(v);
  assert.deepEqual(v.player.snapshot(), preSit, "standing restores the pre-sit player snapshot exactly");
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], false, "standing closes the coin door");
  assert.equal(v.instance.mode(), "attract", "the machine stands back into attract");

  // 7) The cycle re-arms on the same visit: E opens again, E sits on the
  // third seed — the 1.4 door law survives a whole death-and-restart cycle.
  pressE(v);
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], true, "E opens the door again after the full cycle");
  pressE(v);
  assert.equal(stubCalls, 3, "the second sit pulled the third fresh seed");
  assert.equal(v.instance.mode(), "play", "the cabinet takes a second visitor run");

  // 8) Stand a second time: restore law holds on the repeat cycle too.
  pressE(v);
  assert.deepEqual(v.player.snapshot(), preSit, "the second stand restores the pose exactly as well");
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], false, "and closes the door again");

  // 9) Room controls resume — the seated view-zeroing ended with the chair.
  v.key("KeyW", true);
  for (let i = 0; i < 20; i++) v.tick();
  v.key("KeyW", false);
  assert.notDeepEqual(v.player.snapshot(), preSit, "on foot again the visitor walks (seated zeroing does not outlive the sit)");

  // 10) The debug event record stays bounded across the whole visit.
  assert.ok(v.seat.state().events.length <= SEAT_EVENT_WINDOW, "the exposed arcadeDebug.seat event record is bounded, not a leak");
});

test("1.7 a fault lands mid-visit: the seated Visitor is released by the stand law the same tick the faultedFor predicate flips (pose restored, door closed), and every later E at this Cabinet is the plain coin-door toggle — never a re-sit (AC5)", () => {
  let broken = false;
  const v = walkToB0(() => 4242, (gameId) => broken && gameId === "moon-patrol");
  const preSit = v.player.snapshot();
  pressE(v); // open
  pressE(v); // sit (healthy)
  assert.ok(v.seat.state().seated, "the fault lands mid-seat");
  assert.equal(v.instance.mode(), "play", "the seated run is live before the fault");

  broken = true;
  v.tick(); // systems run after the instance phase — the release lands THIS tick
  assert.equal(v.seat.state().seated, false, "the fault is that machine's last break: released without an E press");
  assert.deepEqual(v.player.snapshot(), preSit, "the stand law restored the saved standing pose exactly");
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], false, "and closed the coin door");
  assert.equal(v.instance.mode(), "attract", "the stand law returned the machine to attract (unguarded rig — the quarantine no-op is pinned in seat/containment tests)");

  // The rest of the visit at this Cabinet is the fallback face's E-law:
  // the plain 1.4 toggle, twice over, never a sit.
  pressE(v);
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], true, "E opens the door (the fallback law is intact)");
  pressE(v);
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], false, "E closes — a second press never sits at a faulted Cabinet");
  assert.equal(v.seat.state().seated, false, "the Visitor stays out of the chair while the fault stands");
});
