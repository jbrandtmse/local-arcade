// Story 1.5 pins for the seat service (kept honest through Story 1.6 —
// see "Shared surfaces" in the 1.6 spec), run through the REAL kernel
// loop, input service, player controller, cabinet runtime, registry
// entry, and wrapper (the I/O matrix's Rule-1 rows): the E-law cycle
// (open -> sit -> stand) on the scripted walk from ENTRY_SPAWN; the
// KeyA/KeyD speed law reaching the sim through the seat's slot mapping;
// seated look/walk zeroed while E still routes (targeting holds B0 from
// the play pose); the stand pose identity and the never-sat transcript
// identity; the seed roles (kernel seedFn reaches the wrapper play path;
// the attract seed is the registry entry's number); game over while
// seated flips the machine to attract in place and Enter restarts on a
// fresh seed; standing neutralizes the kernel TickInput's declared slots;
// past SEAT_EVENT_WINDOW the exposed record holds exactly the last 32,
// in order.
//
// Story 1.6 rig move (the sanctioned one): the rigs now wire a patrons
// system that drains the loop's queue ONCE per tick and forwards the
// records into seat.step(codes, records) — the seat's exclusive drain
// from 1.5 moved. These rigs carry the tracked NOT-BUSY wiring: the
// scheduler is created but tracks nothing (no busy placement is tracked
// here), so every 1.5 law keeps its meaning — direct sit on E #2 and the
// seat-side gameEnded flip. The real busy B0 (placement busy: true) and
// the scheduler-owned flip are pinned in patrons/scheduler.test.ts.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createKernelLoop, MS_PER_TICK, type EventRecord } from "./loop.ts";
import { createInputService, type InputService } from "./input/index.ts";
import { createPlayerController, EYE_HEIGHT, MOUSE_SENSITIVITY, type PlayerController } from "./player.ts";
import { createSeatService, PLAY_STANDOFF_M, SEAT_EVENT_WINDOW, playPoseFor, type BusyGate, type SeatKeyMap } from "./seat.ts";
import { createPatronScheduler } from "./patrons/scheduler.ts";
import { createFigurePresenter } from "./patrons/presenter.ts";
import { createGameInstance, type GameInstance, type TickInput } from "./contract/index.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { createCabinetRuntime, placementGeometry, SHELL, type CabinetRuntime } from "./room/cabinets.ts";
import { gameRegistry } from "../generated/game-registry.ts";

const MOON_KEYS: SeatKeyMap = {
  axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
  buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
};

const EPS = 1e-9;

interface Visit {
  loop: ReturnType<typeof createKernelLoop>;
  player: PlayerController;
  input: InputService;
  seat: ReturnType<typeof createSeatService>;
  instance: GameInstance;
  cabinets: CabinetRuntime;
  /** The kernel-owned TickInput the loop hands the instance (the seat's
   * mapping target — exposed for the standing-neutralization pin). */
  tickInput: TickInput;
  clock: { ms: number };
  tick(): void;
  key(code: string, down: boolean): void;
}

// One full rig, wired exactly as core/main.ts wires it: the registry entry's
// sim half through the wrapper, a kernel-owned TickInput the seat writes,
// the player + seat systems on the loop, pointer-locked aim.
function rig(seedFn: () => number): Visit {
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
  // 1.6 rig wiring mirrors main.ts: presenter + scheduler beside the seat,
  // each side seeing only its injected slice (BusyGate closures resolve the
  // mutual reference at call time). The scheduler tracks NOTHING here —
  // this suite is the tracked-not-busy machine; busy B0 lives in
  // patrons/scheduler.test.ts.
  const presenter = createFigurePresenter();
  const busyGate: BusyGate = {
    busyFor: (volumeId) => scheduler.busyFor(volumeId),
    toggleWait: (volumeId) => scheduler.toggleWait(volumeId),
  };
  const seat = createSeatService({ player, cabinets, busy: busyGate, seedFn });
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
  // Story 1.6 wiring (registration order = AD-23 phase order): the patrons
  // system drains ONCE per tick and forwards; the scheduler tracks nothing
  // in this suite (not-busy wiring), so dispatch is inert and every 1.5
  // law below keeps its meaning.
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
    tickInput,
    clock,
    tick() {
      // A hair above the tick length: the accumulator residual never crosses
      // a second tick inside these run lengths (max ~2160 steps -> +0.36 ms),
      // and it never underruns one either (the 0.1% margin swamps FP drift)
      // -> exactly one global tick per scripted step.
      clock.ms += MS_PER_TICK * 1.0001;
      assert.equal(loop.step(), 1, "exactly one global tick per frame at the tick rate");
    },
    key(code, down) {
      input.key(code, down);
    },
  };
}

// Walk the visitor into center-of-view of B0 (the real resolver, real
// targeting), then settle 30 idle ticks so the bob eases out (Design Notes:
// the pose-identity law binds on a settled pose). Returns the visit rig.
function walkToB0(seedFn: () => number = () => 4242): Visit {
  const v = rig(seedFn);
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
  for (let i = 0; i < 30; i++) v.tick(); // settle
  return v;
}

function poseOf(p: PlayerController): { x: number; z: number; yaw: number; pitch: number } {
  const s = p.state;
  return { x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch };
}

test("the registry entry carries the authored attract seed and the declared control vocab (AC5)", () => {
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  assert.equal(typeof entry.seed, "number", "the entry authors a fixed attract seed (Design Notes: authored number)");
  assert.ok(entry.seed! >= 0 && Number.isInteger(entry.seed!), "the seed is a non-negative integer");
  assert.deepEqual(entry.controls, { vocab: 1, axes: ["move"], buttons: ["start", "jump", "fire"], aim: [] });
  // Source pin: the seed (and the vocab) come from the AUTHORED list the
  // generator consumes — generated/ is derived, so an equal-looking pair of
  // hand-moved numbers cannot hide here.
  const list = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, "..", "tools", "registry-list.json"), "utf8"),
  ) as Array<{ id: string; seed?: number; controls?: unknown }>;
  const authored = list.find((e) => e.id === "moon-patrol")!;
  assert.equal(entry.seed, authored.seed, "the attract seed IS the authored list's number");
  assert.deepEqual(entry.controls, authored.controls, "the control vocab IS the authored list's block");
});

test("wrong dt and bad input grammar die at the wrapper for this sim too (AC2)", () => {
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
  assert.throws(() => instance.tick(1 / 30, { controls: {} }), /1\/60/);
  assert.throws(
    () => instance.tick(1 / 60, { controls: {}, extra: 1 } as unknown as TickInput),
    /exactly one field/,
  );
});

test("AC4 E-law cycle on the real rig: open, sit (play mode, play pose, targeting held), speed keys reach the sim, seated look/walk are dead, stand restores the exact pose + closed door + attract; post-stand transcript equals the never-sat run (I/O matrix Rule-1 seat rows)", () => {
  const v = walkToB0();

  // stand-and-target snapshot: the pre-sit pose, settled.
  const preSit = v.player.snapshot();
  assert.equal(preSit.bobAmp, 0, "the settle wait zeroed the bob (pose identity binds on a settled pose)");

  // E #1: opens the coin door, same tick (1.4 law intact).
  v.key("KeyE", true);
  v.tick();
  v.key("KeyE", false);
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], true, "first E opens");

  // E #2: sits. Wrapper holds play; visitor teleported to the authored
  // play pose; targeting still resolves B0 from the chair.
  v.key("KeyE", true);
  v.tick();
  v.key("KeyE", false);
  assert.equal(v.instance.mode(), "play", "second E sits: the kernel handed the stub seed to play");
  const playPose = poseOf(v.player);
  const authored = playPoseFor("cabinet-B0");
  assert.deepEqual(playPose, authored, "the visitor stands on the seat service's play pose");
  assert.ok(Math.abs(authored.x - -4.2) < 1e-6 && Math.abs(authored.z - -4.75) < 1e-6, "B0 play pose: 0.80m in front of the front plane");
  assert.equal(authored.yaw, 0, "B0 faces +Z -> yaw 0 looks back at the screen");
  assert.ok(
    Math.abs(authored.pitch - Math.atan2(SHELL.screen.centerY - EYE_HEIGHT, PLAY_STANDOFF_M)) < EPS,
    "pitch reads down at the screen-face centre from the eye line",
  );
  assert.equal(v.player.state.targetId, "cabinet-B0", "E still routes from the chair (targeting holds)");

  // speed law through the seat mapping: KeyD winds the buggy up to fast,
  // KeyA drops it back to slow (the vendored buggy never reverses - the
  // legend says "NEVER STOPS"; "moves left" reads as dropping speed and
  // falling behind the twin that kept KeyD held - Design Notes).
  v.key("KeyD", true);
  for (let i = 0; i < 60; i++) v.tick();
  const fastSnap = v.instance.snapshot() as { world: { buggy: { speed: number; x: number } } };
  assert.ok(Math.abs(fastSnap.world.buggy.speed - 190) < 1e-6, "KeyD held reaches the declared 'move' axis: fast 190");
  v.key("KeyD", false);
  v.key("KeyA", true);
  const xAtSwitch = fastSnap.world.buggy.x;
  for (let i = 0; i < 30; i++) v.tick();
  const slowSnap = v.instance.snapshot() as { world: { buggy: { speed: number; x: number } } };
  assert.ok(Math.abs(slowSnap.world.buggy.speed - 100) < 1e-6, "KeyA reaches the sim: speed drops back to slow 100");
  // the free-run twin covers (190+100)/2 * 0.5 s = 72.5 px in the window;
  // the KeyA run decelerates immediately, so it lands short of that mark.
  assert.ok(slowSnap.world.buggy.x < xAtSwitch + 72.5, "the KeyA window left the buggy behind the no-KeyA free run (the seat's mapping moves it left)");
  v.key("KeyA", false);
  v.key("KeyD", false);

  // seated law: look and walk are dead while seated.
  const beforeFrozen = v.player.snapshot();
  v.input.mouseMove(400, -300);
  v.key("KeyW", true);
  for (let i = 0; i < 20; i++) v.tick();
  v.key("KeyW", false);
  assert.deepEqual(v.player.snapshot(), beforeFrozen, "seated: mouse-look and walking change nothing");

  // E #3: stands. Pose fields back exactly, door closed, attract in place;
  // the visitor keeps the chair (no auto-eject).
  v.key("KeyE", true);
  v.tick();
  v.key("KeyE", false);
  assert.deepEqual(v.player.snapshot(), preSit, "standing restores the pre-sit player snapshot exactly");
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], false, "standing closes the coin door");
  assert.equal(v.instance.mode(), "attract", "the machine returns to attract in place");

  // post-stand transcript: identical to a run that never sat, from the same
  // settled state, through the same device inputs (the 60-tick strafe).
  const afterStand: unknown[] = [];
  v.key("KeyD", true);
  for (let i = 0; i < 60; i++) {
    v.tick();
    afterStand.push(v.player.snapshot());
  }
  v.key("KeyD", false);

  const v2 = walkToB0();
  const idleTicks =
    1 + // E open
    1 + // E sit
    60 + // KeyD speed window
    30 + // KeyA speed window
    20; // seated frozen-look window
  for (let i = 0; i < idleTicks; i++) v2.tick();
  const neverSat: unknown[] = [];
  v2.key("KeyD", true);
  for (let i = 0; i < 60; i++) {
    v2.tick();
    neverSat.push(v2.player.snapshot());
  }
  v2.key("KeyD", false);
  assert.deepEqual(afterStand, neverSat, "post-stand the player replays bit-identically to the never-sat run");
});

test("the seat consumes the patrons system's forwarded drain: the record keeps the canonical pair order (scoreSubmitted before gameEnded) (AC5)", async () => {
  // seed 8 full throttle dies inside the cap (the index.test gameover run);
  // stub seed 8 sits, KeyD full throttle, watch the machine flip to attract
  // in place, the visitor stays seated, and Enter restarts on a NEW seed.
  const stubs = [8, 5150];
  let stubCalls = 0;
  const v = walkToB0(() => stubs[stubCalls++]);
  // The executed sink leg (main.ts routes every drained record through
  // setEventSink to the presentation half): install a recorder BEFORE the
  // run so the death's event pair must pass through the sink path too.
  const sunk: { gameId: string; type: string; payload: unknown }[] = [];
  v.seat.setEventSink((rec) => sunk.push({ gameId: rec.gameId, type: rec.event.type, payload: rec.event.payload }));
  v.key("KeyE", true); v.tick(); v.key("KeyE", false); // open
  v.key("KeyE", true); v.tick(); v.key("KeyE", false); // sit on stub 8
  assert.equal(stubCalls, 1, "sitting consumed exactly one kernel seed");
  v.key("KeyD", true);
  let deathTick = -1;
  for (let i = 0; i < 4000 && deathTick < 0; i++) {
    v.tick();
    if (v.instance.mode() === "attract") deathTick = v.loop.tickCount;
  }
  assert.ok(deathTick > 0, "the run reaches game over inside the cap");
  assert.equal(v.instance.mode(), "attract", "the seat flipped the machine to attract on the drain");
  assert.ok(v.seat.state().seated, "game over does not eject the visitor (no auto-eject, Design Notes)");
  assert.deepEqual(poseOf(v.player), playPoseFor("cabinet-B0"), "the visitor is still in the chair");
  const drained = v.seat.state().events;
  const endIdx = drained.findIndex((r) => r.event.type === "gameEnded");
  assert.ok(endIdx >= 1, "the drained window carries the game over");
  assert.equal(drained[endIdx - 1]!.event.type, "scoreSubmitted", "scoreSubmitted drains directly before gameEnded");
  assert.deepEqual(drained[endIdx]!.event.payload, drained[endIdx - 1]!.event.payload, "both carry the same score");
  // Executed sink leg (the main.ts sink wiring, not just its source pin):
  // the same pair passed through setEventSink, in order, each record
  // carrying the game id the sink routes by.
  const sunkEnd = sunk.findIndex((r) => r.type === "gameEnded");
  assert.ok(sunkEnd >= 1, "the event sink saw the game over too");
  assert.equal(sunk[sunkEnd - 1]!.type, "scoreSubmitted", "the sink path keeps scoreSubmitted directly before gameEnded");
  assert.deepEqual(sunk[sunkEnd - 1]!.payload, drained[endIdx - 1]!.event.payload, "the sunk record carries the same score payload");
  for (const r of sunk) assert.equal(r.gameId, "moon-patrol", "every sunk record carries its game id (the sink routes by it)");
  // The in-place attract flip stays ALIVE: the state hash keeps advancing
  // after the flip (a mode flip that froze the sim state would pass the
  // mode()==="attract" pin but die here).
  const hashAfterFlip = v.instance.stateHash();
  v.tick();
  v.tick();
  assert.notEqual(v.instance.stateHash(), hashAfterFlip, "attract keeps ticking after the in-place flip (hash advances)");
  // Enter restarts on the NEXT stub seed; fresh play, still seated.
  v.key("KeyD", false);
  v.key("Enter", true);
  v.tick();
  v.key("Enter", false);
  assert.equal(stubCalls, 2, "the Enter edge pulled a fresh kernel seed");
  assert.equal(v.instance.mode(), "play", "Enter at attract restarts the seated visitor");
  // the restarted world differs from the dead run's corpse: the seed handed
  // over actually rebuilt it (fresh spawn x, no gameover mode).
  const fresh = v.instance.snapshot() as { mode: string; world: { mode: string; buggy: { x: number } } };
  assert.equal(fresh.mode, "play", "the instance holds play again");
  assert.notEqual(fresh.world.mode, "gameover", "the vendored world rebuilt under the new seed");
  assert.equal(fresh.world.buggy.x, 40, "the fresh world starts at the authored spawn x");
});

test("the seed roles: the seedFn value reaches play untouched (transcript identity vs direct play(stubSeed)); two stubs diverge, one stub replays bit-identical", () => {
  const sitRun = (seed: number) => {
    const v = walkToB0(() => seed);
    v.key("KeyE", true); v.tick(); v.key("KeyE", false); // open
    v.key("KeyE", true); v.tick(); v.key("KeyE", false); // sit
    v.key("KeyD", true);
    for (let i = 0; i < 40; i++) v.tick();
    v.key("KeyD", false);
    return v.instance.snapshot();
  };
  const a = sitRun(777);
  const b = sitRun(777);
  const c = sitRun(778);
  assert.deepEqual(b, a, "same stub seed -> bit-identical play transcripts");
  assert.notDeepEqual(c, a, "different stub seeds diverge - the seed reached the world generator (terrain/enemies differ; buggy kinematics alone stay seed-identical at 40 ticks)");

  // direct control: play(stubSeed) + wrapper ticks replaying the exact
  // mapped-input sequence the seat wrote (first play tick still carries the
  // zero mapping from the sit tick, then KeyD held - 40 play ticks total,
  // exactly like the sit run's ticks S+1..S+40).
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  const twin = createGameInstance(entry.createSim, entry.seed ?? 0);
  twin.play(777);
  twin.tick(1 / 60, { controls: { axes: { move: 0 }, buttons: { start: { down: false, pressed: false }, jump: { down: false, pressed: false }, fire: { down: false, pressed: false } } } });
  for (let i = 0; i < 39; i++) {
    twin.tick(1 / 60, { controls: { axes: { move: 1 }, buttons: { start: { down: false, pressed: false }, jump: { down: false, pressed: false }, fire: { down: false, pressed: false } } } });
  }
  assert.deepEqual(twin.snapshot(), a, "the seat-sit transcript equals direct play(777) + the same mapped inputs");
});

test("attract lives on the real loop: 3x720 ticks advance the state hash every block, and the attract state carries the registry entry's seed (AC3/AC5)", () => {
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  let ms = 0;
  const loop = createKernelLoop({ now: () => ms });
  const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
  loop.addInstance(entry.id, instance);
  const hashes: string[] = [];
  for (let block = 0; block < 3; block++) {
    for (let i = 0; i < 720; i++) {
      ms += MS_PER_TICK;
      loop.step();
    }
    loop.drainEvents(); // keep the queue from growing; the seat-less rig drains here
    hashes.push(instance.stateHash());
  }
  assert.notEqual(hashes[0], hashes[1], "720 attract ticks moved the state hash (liveness through the real loop)");
  assert.notEqual(hashes[1], hashes[2], "and the next 720 moved it again");
  assert.notEqual(hashes[0], hashes[2], "pairwise: no two block snapshots coincide (rules out an oscillating two-state attract)");
  assert.equal(loop.tickCount, 2160, "the loop ran every scripted tick");

  // seed role at attract: the entry's number seeds the instance rng and the
  // snapshot cursor carries it - a twin with the entry's seed replays to the
  // identical snapshot, and a different number is a different state.
  const stepTwin = (g: GameInstance) => {
    for (let i = 0; i < 2160; i++) g.tick(1 / 60, { controls: {} });
    return g.snapshot();
  };
  const twin = stepTwin(createGameInstance(entry.createSim, entry.seed ?? 0));
  assert.deepEqual(twin, instance.snapshot(), "same entry seed -> identical attract snapshots (loop path == wrapper path)");
  const other = stepTwin(createGameInstance(entry.createSim, (entry.seed ?? 0) + 1));
  assert.notDeepEqual(other, instance.snapshot(), "the attract seed IS the registry entry's number (the kernelRng cursor carries it)");
});

test("standing neutralizes the kernel TickInput: the last seated mapping never outlives the chair (AC4 E-law state restore)", () => {
  const v = walkToB0();
  v.key("KeyE", true); v.tick(); v.key("KeyE", false); // open
  v.key("KeyE", true); v.tick(); v.key("KeyE", false); // sit
  const buttonIdle = {
    start: { down: false, pressed: false },
    jump: { down: false, pressed: false },
    fire: { down: false, pressed: false },
  };
  v.key("KeyD", true);
  for (let i = 0; i < 5; i++) v.tick();
  assert.deepEqual(
    v.tickInput.controls,
    { axes: { move: 1 }, buttons: buttonIdle },
    "the seated mapping is live on the kernel input object the loop hands the sim",
  );
  v.key("KeyD", false);
  v.key("KeyE", true); v.tick(); v.key("KeyE", false); // stand
  const neutral = { axes: { move: 0 }, buttons: buttonIdle };
  assert.deepEqual(v.tickInput.controls, neutral, "standing zeroes every declared slot on the kernel input object");
  for (let i = 0; i < 10; i++) v.tick();
  assert.deepEqual(v.tickInput.controls, neutral, "standing attract ticks never write input back from the empty chair");
});

test("the seat's debug event record caps at SEAT_EVENT_WINDOW: past that many drains it holds exactly the last 32, in drain order (AC5 record bound)", () => {
  const v = walkToB0(() => 8);
  const all: EventRecord[] = [];
  v.seat.setEventSink((rec) => all.push(rec));
  v.key("KeyE", true); v.tick(); v.key("KeyE", false); // open
  v.key("KeyE", true); v.tick(); v.key("KeyE", false); // sit on seed 8
  v.key("KeyD", true);
  v.key("KeyZ", true); // held fire: ~1 volley / 0.55s + tank volleys drain 'fire' records past the window
  for (let i = 0; i < 2500 && all.length < SEAT_EVENT_WINDOW + 1; i++) v.tick();
  v.key("KeyD", false);
  v.key("KeyZ", false);
  assert.ok(all.length > SEAT_EVENT_WINDOW, `the run drains more records than the window (${all.length})`);
  const shown = v.seat.state().events;
  assert.equal(shown.length, SEAT_EVENT_WINDOW, "the record is exactly the cap once the run exceeds it (the shift branch is exercised)");
  assert.deepEqual(shown, all.slice(-SEAT_EVENT_WINDOW), "the window holds the LAST 32 drained records, in drain order");
});
