// Story 1.6 QA (AC1/AC2/AC3/AC4/AC5): the Patron scheduler end to end on
// the REAL surface — real kernel loop, real wrapper instance built from the
// build-generated registry, real seat service, real input + player, and the
// REAL placements (B0 busy:true is room data, never a hand-typed id). The
// I/O matrix rows as executed tests: busy start after the authored dwell
// (derived seed, liveness, figure active, twin determinism), reaction
// causality on a real autoplay run (1:1 with the embedded mapping, unmapped
// events silent, state never outlives the authored duration), wait/un-wait/
// take-over at the break, walk-away (presence fails, autoplay re-offers that
// same break on the NEXT derived seed, the claim persists and is honoured at
// a later break without a re-press), the chair law (game over under a seated
// Visitor -> attract in place, Enter restarts seat-local, figure never
// returns to an occupied chair), stand + re-arm after the dwell, the
// track()/busyFor validation laws, and the AC3 NEXT-at-the-cap pin on the
// busy B0 composite. seat.test.ts rig idiom: fake clock + one tick per step.
import test from "node:test";
import assert from "node:assert/strict";
import { createKernelLoop, MS_PER_TICK, type EventRecord } from "../loop.ts";
import { createInputService, type InputService } from "../input/index.ts";
import { createPlayerController, MOUSE_SENSITIVITY, TARGET_REACH, type PlayerController } from "../player.ts";
import { createSeatService, playPoseFor, type BusyGate, type SeatKeyMap } from "../seat.ts";
import { ATTRACT_DWELL_TICKS, createPatronScheduler, derivedSeed, type PatronScheduler } from "./scheduler.ts";
import { REACTIONS, createFigurePresenter, type FigurePresenter, type ReactionKind } from "./presenter.ts";
import { createGameInstance, math, type GameInstance, type TickInput } from "../contract/index.ts";
import { ENTRY_SPAWN, collisionVolumes } from "../room/collision-volumes.ts";
import { SCREEN_NEXT_CAP_M, SHELL, cabinetPlacements, createCabinetRuntime, placementGeometry, type CabinetRuntime } from "../room/cabinets.ts";
import { SCREEN_EDGE_RATIO, SURFACE_PX_PER_M, compositeScreen, type PaintContext, type PaintSurface } from "../room/surfaces.ts";
import { gameRegistry } from "../../generated/game-registry.ts";

const ENTRY = gameRegistry.find((e) => e.id === "moon-patrol")!;
const IMPULSES = ENTRY.impulses!; // the authored mapping embedded at build (AC2's data side)

const MOON_KEYS: SeatKeyMap = {
  axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
  buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
};

interface Visit {
  loop: ReturnType<typeof createKernelLoop>;
  player: PlayerController;
  input: InputService;
  seat: ReturnType<typeof createSeatService>;
  sched: PatronScheduler;
  presenter: FigurePresenter;
  instance: GameInstance;
  cabinets: CabinetRuntime;
  seen: EventRecord[]; // every record the patrons system drained (causality's data side)
  clock: { ms: number };
  tick(): void;
  key(code: string, down: boolean): void;
  b0(): ReturnType<PatronScheduler["state"]>["cabinets"][number];
}

// One full rig exactly as core/main.ts wires it (patrons system draining
// once per tick BETWEEN cabinets and seat; the seat receives the forwarded
// records; the scheduler tracks busy B0 off the REAL placements).
function rig(seedFn: () => number, faultedFor?: (gameId: string) => boolean): Visit {
  const cabinets = createCabinetRuntime();
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const instance = createGameInstance(ENTRY.createSim, ENTRY.seed ?? 0);
  const tickInput: TickInput = { controls: {} };
  loop.addInstance(ENTRY.id, instance, tickInput);
  const input = createInputService({ requestPointerLock: () => {} });
  input.pointerLockChanged(true);
  const presenter = createFigurePresenter();
  const busyGate: BusyGate = {
    busyFor: (volumeId) => scheduler.busyFor(volumeId),
    toggleWait: (volumeId) => scheduler.toggleWait(volumeId),
  };
  const seat = createSeatService({ player, cabinets, busy: busyGate, seedFn });
  seat.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance,
    input: tickInput,
    controls: ENTRY.controls!,
    keys: MOON_KEYS,
  });
  player.registerInteractable("cabinet-B0", (id) => seat.handleInteract(id));
  // 1.7 tier: the containment predicate is injected scheduler-side only —
  // the seat's faulted law is pinned in seat/visit-arc suites.
  const scheduler = createPatronScheduler({ seat, player, presenter, faultedFor });
  scheduler.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance,
    seed: ENTRY.seed!,
    impulses: IMPULSES,
  });
  const seen: EventRecord[] = [];
  loop.addSystem("player", () => player.step(1, seat.playerView(input.takeView())));
  let patronsRecords: EventRecord[] = [];
  loop.addSystem("patrons", () => {
    patronsRecords = loop.drainEvents();
    seen.push(...patronsRecords);
    presenter.step(loop.tickCount);
    scheduler.dispatch(patronsRecords, loop.tickCount);
  });
  loop.addSystem("seat", () => seat.step(input.takeCodeView(), patronsRecords));
  return {
    loop,
    player,
    input,
    seat,
    sched: scheduler,
    presenter,
    instance,
    cabinets,
    seen,
    clock,
    tick() {
      // Rig-idiom deviation from seat.test.ts (labelled honest): the
      // 1.0001 multiplier is a per-step SURPLUS of ~1.7 ms — fine across
      // 1.5's ~6k-step rigs, but it banks a second tick around step 10k,
      // and this suite runs full autoplay legs (up to ~30k steps). An
      // additive 0.0002 ms epsilon keeps every step at exactly one tick:
      // elapsed never drops below a tick length through float drift, and
      // the accumulator stays under a whole tick past 80k steps.
      clock.ms += MS_PER_TICK + 0.0002;
      assert.equal(loop.step(), 1, "exactly one global tick per frame at the tick rate");
    },
    key(code, down) {
      input.key(code, down);
    },
    b0() {
      return scheduler.state().cabinets.find((c) => c.volumeId === "cabinet-B0")!;
    },
  };
}

// Walk into center-of-view of B0, then CREEP in to a metre inside the
// presence radius before settling: the creep parks the stance well inside
// the body-box reach law, and the collision body stops it short of the
// face; 30 settle ticks then zero the bob (the pose-identity law binds on
// a settled pose).
function creepToB0(v: Visit): void {
  assert.ok(v.player.state.targetId === "cabinet-B0", `walk reached B0 (target=${v.player.state.targetId})`);
  v.key("KeyW", true);
  let guard = 0;
  while (distToFront(v) > TARGET_REACH - 0.2 && guard < 1200) {
    v.tick();
    guard += 1;
  }
  v.key("KeyW", false);
  assert.ok(distToFront(v) <= TARGET_REACH - 0.2, `creep closed the presence gap (dist=${distToFront(v).toFixed(2)})`);
  for (let i = 0; i < 30; i++) v.tick();
}

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
  creepToB0(v);
  return v;
}

function poseOf(p: PlayerController): { x: number; z: number; yaw: number; pitch: number } {
  const s = p.state;
  return { x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch };
}

function distToFront(v: Visit): number {
  const f = placementGeometry("B0").front;
  const s = v.player.state;
  return Math.sqrt((s.x - f.x) ** 2 + (s.z - f.z) ** 2);
}

function pressE(v: Visit): void {
  v.key("KeyE", true);
  v.tick();
  v.key("KeyE", false);
}

// Tick until the Patron is on the machine (the dwell may or may not have
// elapsed during the walk — the law holds either way).
function waitPatron(v: Visit, cap = 2000): void {
  let guard = 0;
  while (!v.sched.figureActive("cabinet-B0") && guard < cap) {
    v.tick();
    guard += 1;
  }
  assert.ok(v.sched.figureActive("cabinet-B0"), "the Patron took the machine within the cap");
}

// --- AC1: busy IS the autoplay hook ------------------------------------------

test("busy start (Rule 1 integration): past the authored dwell the real instance enters autoplay on a derived seed, liveness advances, the figure is active, and two rigs on the same derived seed replay identically", () => {
  const v = rig(() => 4242);
  assert.equal(v.instance.mode(), "attract", "boots attract-idle");
  assert.equal(v.sched.figureActive("cabinet-B0"), false, "no Patron during the dwell");
  assert.deepEqual(
    { ...v.b0(), queue: [] },
    { volumeId: "cabinet-B0", gameId: "moon-patrol", occupancy: "attract", runCount: 0, lastSeed: -1, queue: [], rearmTick: ATTRACT_DWELL_TICKS },
    "the debug view opens attract-idle with the dwell re-arm stamped",
  );
  for (let i = 0; i < ATTRACT_DWELL_TICKS - 1; i++) v.tick();
  assert.equal(v.loop.tickCount, ATTRACT_DWELL_TICKS - 1, "exactly the dwell minus one tick elapsed");
  assert.equal(v.instance.mode(), "attract", "still idle one tick before the dwell closes");
  v.tick();
  assert.equal(v.instance.mode(), "autoplay", "the dwell closes: the REAL autoplay hook took over — busy is the hook, not an animation");
  assert.equal(v.sched.figureActive("cabinet-B0"), true, "the figure stands at the machine");
  assert.equal(v.b0().occupancy, "patron-autoplay");
  assert.equal(v.b0().runCount, 1);
  assert.equal(v.b0().lastSeed, derivedSeed(ENTRY.seed!, 0), "the run seed is the derived one, not the attract seed");
  assert.notEqual(v.b0().lastSeed, ENTRY.seed, "derived != authored (AD-4)");
  const h0 = v.instance.stateHash();
  for (let i = 0; i < 720; i++) v.tick();
  assert.notEqual(v.instance.stateHash(), h0, "stateHash advances across 720 ticks (AD-5 liveness)");
  assert.equal(v.instance.mode(), "autoplay", "still the same run inside the 720 window");

  // AC5's determinism half on the scheduler's own derived seed: a twin rig
  // on the same seed replays bit-identical.
  const twin = rig(() => 4242);
  for (let i = 0; i < ATTRACT_DWELL_TICKS + 720; i++) twin.tick();
  assert.equal(twin.instance.mode(), "autoplay", "the twin launched on the same schedule");
  assert.equal(twin.instance.stateHash(), v.instance.stateHash(), "same derived seed -> bit-identical state (the scheduler's seeding is reproducible)");
});

// --- AC2: reactions 1:1 with the embedded mapping -----------------------------

test("reaction causality on a real autoplay run: exactly one reaction starts per tick, iff that tick drained a mapped event, with the mapping's kind; unmapped events start nothing; live state never outlives the authored duration", () => {
  const v = rig(() => 4242);
  const starts: { tick: number; kind: ReactionKind }[] = [];
  const endedIn = (type: string): boolean => v.seen.some((r) => r.event.type === type);
  let ended = false;
  for (let i = 0; i < 30000 && !ended; i++) {
    v.tick();
    const s = v.presenter.state();
    if (s.reaction != null) {
      assert.ok(s.elapsedTicks < REACTIONS[s.reaction].durationTicks, "live reaction never reaches its authored duration (no canned loop)");
      if (s.startTick === v.loop.tickCount) starts.push({ tick: s.startTick, kind: s.reaction });
    }
    ended = endedIn("gameEnded");
  }
  assert.ok(ended, "the autoplay run reached its canonical end state inside the bound");

  // Every drained record for this game, by tick (the data side of AD-23).
  const recsAt = new Map<number, EventRecord[]>();
  for (const r of v.seen) {
    if (!recsAt.has(r.tick)) recsAt.set(r.tick, []);
    recsAt.get(r.tick)!.push(r);
  }
  const mappedAt = new Map<number, string>(); // tick -> reaction of the LAST mapped record that tick
  for (const [tick, recs] of recsAt) {
    for (const r of recs) {
      const kind = IMPULSES[r.event.type];
      if (kind != null) mappedAt.set(tick, kind); // replacement semantics: last one owns
    }
  }

  // The start-tick set IS the mapped-tick set: unmapped-only ticks start
  // nothing, mapped ticks start exactly one reaction (mutation "react to
  // every event" explodes the unmapped half).
  assert.deepEqual(
    starts.map((s) => s.tick).sort((a, b) => a - b),
    [...mappedAt.keys()].sort((a, b) => a - b),
    "one reaction iff a mapped event drained that tick — unmapped events (fire/land/...) produce nothing",
  );
  for (const s of starts) assert.equal(s.kind, mappedAt.get(s.tick), `tick ${s.tick}: the reaction kind is the mapping's, not the event's name`);

  // Visible evidence the mapping's whole vocabulary ran: jump hopped, a
  // hazard/explosion flinched, game over slammed.
  const kinds = new Set(starts.map((s) => s.kind));
  assert.ok(kinds.has("jump"), "the AI's hop emitted the mapped jump reaction");
  assert.ok(v.seen.some((r) => r.event.type === "explode" || r.event.type === "hit"), "the run drained an explode/hit event");
  assert.ok(kinds.has("flinch"), "and it started the mapped flinch");
  const over = [...v.seen].reverse().find((r) => r.event.type === "gameover");
  assert.ok(over, "the raw gameover rode the end pair (the slam key is live)");
  assert.ok(starts.some((s) => s.tick === over.tick && s.kind === "slam"), "gameover slammed on its own tick");
});

// --- AC4: wait, take over, controls afterwards --------------------------------

test("wait at the busy machine, un-wait, re-wait; at the break the PRESENT waiting Visitor takes over (kernel-fresh play, play-pose teleport, figure lifts off, claim cleared) and the declared slots drive the buggy", () => {
  let visitorSeeds = 0;
  const v = walkToB0(() => {
    visitorSeeds += 1;
    return 4242;
  });
  assert.ok(distToFront(v) <= TARGET_REACH, "the visitor stands within TARGET_REACH of the placement front");
  waitPatron(v);
  assert.equal(v.instance.mode(), "autoplay", "the Patron owns the machine");

  pressE(v);
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], true, "first E still opens the coin door (1.4 law intact)");

  const poseBefore = poseOf(v.player);
  pressE(v); // would-sit -> WAIT
  assert.deepEqual(poseOf(v.player), poseBefore, "the wait press leaves the visitor standing, pose byte-identical");
  assert.equal(v.seat.state().seated, false, "no sit at a busy cabinet");
  assert.equal(v.b0().queue.length, 1, "the claim joined the queue");
  assert.equal(v.instance.mode(), "autoplay", "the Patron keeps playing");
  assert.equal(v.sched.figureActive("cabinet-B0"), true, "the figure stays at the machine");
  const h0 = v.instance.stateHash();
  for (let i = 0; i < 20; i++) v.tick();
  assert.notEqual(v.instance.stateHash(), h0, "the queued wait never pauses the run");

  pressE(v); // third E un-waits
  assert.equal(v.b0().queue.length, 0, "un-waited");

  pressE(v); // queue again for the handover
  assert.equal(v.b0().queue.length, 1, "waiting again for this break");

  let guard = 0;
  while (v.b0().occupancy === "patron-autoplay" && guard < 30000) {
    v.tick();
    guard += 1;
  }
  assert.equal(v.b0().occupancy, "visitor-seated", "the break handover ran on the present claim");
  assert.equal(v.instance.mode(), "play", "kernel-fresh play through the seat (the wrapper resolved the seed)");
  assert.deepEqual(poseOf(v.player), playPoseFor("cabinet-B0"), "teleported to the authored play pose");
  assert.equal(v.seat.state().seated, true, "the seat owns the chair now");
  assert.equal(v.sched.figureActive("cabinet-B0"), false, "the figure lifts off for the visitor");
  assert.deepEqual(v.b0().queue, [], "claims are cleaned up on handover");
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], true, "the coin door stayed open through the handover");
  assert.equal(visitorSeeds, 1, "exactly one kernel-fresh seed was consumed (visitor play keeps the fresh-roll role, AD-4)");

  // Declared-slot controls drive the buggy afterwards (matrix row).
  v.key("KeyD", true);
  for (let i = 0; i < 60; i++) v.tick();
  v.key("KeyD", false);
  const buggy = (v.instance.snapshot() as { world: { buggy: { speed: number } } }).world.buggy;
  assert.ok(Math.abs(buggy.speed - 190) < 1e-6, "KeyD reached the declared move slot: the buggy hit the fast cap");
});

// --- AC4 + AC5: walk-away, persistence, presence-before-queue, restart -------

test("walk away: presence fails at the break, autoplay re-offers THAT same break on the next derived seed (run N and N+1 differ), the absent claim persists, and a later break honours it without a re-press", () => {
  let visitorSeeds = 0;
  const v = walkToB0(() => {
    visitorSeeds += 1;
    return 77;
  });
  waitPatron(v);
  const seed0 = v.b0().lastSeed;
  assert.equal(seed0, derivedSeed(ENTRY.seed!, 0));

  pressE(v); // door
  pressE(v); // wait
  assert.equal(v.b0().queue.length, 1);

  // Walk out of reach (KeyS backs away, yaw untouched).
  v.key("KeyS", true);
  for (let i = 0; i < 150; i++) v.tick();
  v.key("KeyS", false);
  assert.ok(distToFront(v) > TARGET_REACH, `the visitor left the presence radius (dist=${distToFront(v).toFixed(2)} > ${TARGET_REACH})`);

  let guard = 0;
  while (v.b0().runCount === 1 && guard < 30000) {
    v.tick();
    guard += 1;
  }
  assert.equal(v.b0().runCount, 2, "busy never withholds: the break re-offered as autoplay");
  assert.equal(v.b0().occupancy, "patron-autoplay", "no handover while absent");
  assert.equal(v.seat.state().seated, false, "the absent claim was not honored");
  assert.equal(v.b0().queue.length, 1, "the claim persists across the break (until un-waited or honored)");
  const seed1 = v.b0().lastSeed;
  assert.equal(seed1, derivedSeed(ENTRY.seed!, 1), "the same-break restart took the next derived seed");
  assert.notEqual(seed1, seed0, "run N and run N+1 seeds differ");
  assert.notEqual(derivedSeed(ENTRY.seed!, 0), derivedSeed(ENTRY.seed!, 1), "the derived arithmetic itself keys on runCount (mutation red here)");
  assert.equal(v.sched.figureActive("cabinet-B0"), true, "the Patron (run 2) stands again");

  // Walk back; the NEXT break honours the persisted claim with no re-press.
  v.key("KeyW", true);
  guard = 0;
  while (v.player.state.targetId === null && guard < 6000) {
    v.tick();
    guard += 1;
  }
  v.key("KeyW", false);
  creepToB0(v); // back inside the presence radius, settled
  guard = 0;
  while (v.b0().occupancy === "patron-autoplay" && guard < 30000) {
    v.tick();
    guard += 1;
  }
  assert.equal(v.b0().occupancy, "visitor-seated", "presence beats the wait: the persisted claim was honored at this break");
  assert.equal(v.instance.mode(), "play");
  assert.equal(v.b0().runCount, 2, "the handover consumed no extra autoplay run");
  assert.deepEqual(v.b0().queue, [], "queue cleaned on handover");
  assert.equal(visitorSeeds, 1, "exactly one fresh seed across the whole wait-then-honor path");
});

test("presence reaches the targeting law: a Visitor claiming from an off-axis stance inside TARGET_REACH of the body box but outside the front-point radius is honored at the break (no creep)", () => {
  let visitorSeeds = 0;
  const v = walkToB0(() => {
    visitorSeeds += 1;
    return 77;
  });
  waitPatron(v);

  // Off-axis stance: 1.5 m out along the facing and 1.5 m along the
  // slot's right — inside TARGET_REACH of the body box (the AABB the
  // center-of-view targeting ray tests), strictly OUTSIDE TARGET_REACH of
  // the front point. yaw faces the box centre, pitch level: the sight-ray
  // must target B0 from the stance (the E the Visitor presses there is
  // exactly the E the real player can press).
  const g = placementGeometry("B0");
  const box = collisionVolumes.find((c) => c.id === "cabinet-B0")!;
  const px = g.front.x + g.facing.x * 1.5 + g.right.x * 1.5;
  const pz = g.front.z + g.facing.z * 1.5 + g.right.z * 1.5;
  const dx = (box.min.x + box.max.x) / 2 - px;
  const dz = (box.min.z + box.max.z) / 2 - pz;
  v.player.teleport({ x: px, z: pz, yaw: math.atan2(-dx, -dz), pitch: 0 });
  assert.ok(distToFront(v) > TARGET_REACH, `the stance is outside the front-point radius (dist=${distToFront(v).toFixed(2)} > ${TARGET_REACH}) — the old point-distance reading fails here`);
  const nx = Math.min(Math.max(px, box.min.x), box.max.x);
  const nz = Math.min(Math.max(pz, box.min.z), box.max.z);
  assert.ok(Math.sqrt((px - nx) * (px - nx) + (pz - nz) * (pz - nz)) <= TARGET_REACH, "the stance is inside TARGET_REACH of the body box (the targeting geometry)");

  v.tick();
  assert.equal(v.player.state.targetId, "cabinet-B0", "E reaches from this stance: B0 is the center-of-view target");
  pressE(v); // door opens
  pressE(v); // wait: the claim comes from the uncrept, off-axis stance
  assert.equal(v.b0().queue.length, 1, "the claim is in the queue");

  let guard = 0;
  while (v.b0().occupancy === "patron-autoplay" && guard < 30000) {
    v.tick();
    guard += 1;
  }
  assert.equal(v.b0().occupancy, "visitor-seated", "the break honours the claim: presence covers every stance E itself reaches");
  assert.equal(v.seat.state().seated, true, "the Visitor is seated");
  assert.equal(v.instance.mode(), "play", "the run continues through the seat");
  assert.equal(v.b0().queue.length, 0, "queue cleaned on handover");
  assert.equal(visitorSeeds, 1, "exactly one fresh seed consumed");
});

// --- AC4: the chair law for busy cabinets (scheduler-owned flip) --------------

test("seated Visitor's game over: the scheduler flips the busy machine to attract IN PLACE (seat-side flip suppressed), Enter restarts seat-local on a fresh seed, then stand closes the door and the scheduler re-arms after the authored dwell — never reclaiming an occupied chair", () => {
  let visitorSeeds = 0;
  const v = walkToB0(() => {
    visitorSeeds += 1;
    return 4242;
  });
  waitPatron(v);
  const standing = v.player.snapshot();
  pressE(v); // door
  pressE(v); // wait
  let guard = 0;
  while (v.b0().occupancy === "patron-autoplay" && guard < 30000) {
    v.tick();
    guard += 1;
  }
  assert.equal(v.instance.mode(), "play", "took over");

  // Die mid-seat: no input, the vendored never-stops law walks the buggy
  // into its hazard.
  guard = 0;
  while (v.instance.mode() === "play" && guard < 12000) {
    v.tick();
    guard += 1;
  }
  assert.ok(guard < 12000, "the seated free run reached game over inside the cap");
  assert.equal(v.instance.mode(), "attract", "attract resumes UNDER the seated visitor (the scheduler owns the busy flip)");
  assert.equal(v.b0().occupancy, "visitor-seated", "occupancy stays with the visitor");
  assert.equal(v.seat.state().seated, true, "no auto-eject (1.5 chair law)");
  assert.deepEqual(poseOf(v.player), playPoseFor("cabinet-B0"), "still in the chair");
  assert.equal(v.sched.figureActive("cabinet-B0"), false, "the Patron never reclaims a seated chair");
  const h0 = v.instance.stateHash();
  for (let i = 0; i < 120; i++) v.tick();
  assert.notEqual(v.instance.stateHash(), h0, "attract stays alive in place while the visitor sits");
  assert.equal(v.sched.figureActive("cabinet-B0"), false, "and still no figure over an occupied chair after 120 ticks");

  v.key("Enter", true);
  v.tick();
  v.key("Enter", false);
  assert.equal(v.instance.mode(), "play", "Enter restarts seat-local");
  assert.equal(visitorSeeds, 2, "on a fresh kernel seed (seat-local, not derived)");

  pressE(v); // stand
  assert.deepEqual(v.player.snapshot(), standing, "stand restores the standing pose exactly");
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], false, "stand closes the coin door");
  assert.equal(v.b0().occupancy, "attract", "the scheduler observed the empty chair");
  assert.equal(v.b0().rearmTick, v.loop.tickCount + ATTRACT_DWELL_TICKS, "re-arm stamped one authored dwell out");
  assert.deepEqual(v.b0().queue, [], "claims cleaned up on handover, nothing re-queued on stand");

  for (let i = 0; i < ATTRACT_DWELL_TICKS - 1; i++) v.tick();
  assert.equal(v.instance.mode(), "attract", "the dwell gates the re-arm exactly like the boot");
  v.tick();
  assert.equal(v.instance.mode(), "autoplay", "the Patron returned after the dwell");
  assert.equal(v.sched.figureActive("cabinet-B0"), true);
  assert.equal(v.b0().runCount, 2, "the second autoplay run");
  assert.equal(v.b0().lastSeed, derivedSeed(ENTRY.seed!, 1), "on the next derived seed, not a fresh roll");
});

// --- scheduler data laws: validation + the busy flag as placement data -------

test("the busy flag is placement data, and track()/toggleWait die loudly on authoring gaps (duplicate, unknown volume, not-busy, per-game uniqueness, non-integer seed)", () => {
  assert.deepEqual(
    cabinetPlacements.filter((p) => p.busy === true).map((p) => p.volumeId),
    ["cabinet-B0"],
    "exactly one busy placement in the authored room, and it is B0 (AC1's given)",
  );

  const seat = createSeatService({ player: createPlayerController(collisionVolumes, ENTRY_SPAWN), cabinets: createCabinetRuntime() });
  const make = (placements?: readonly (typeof cabinetPlacements)[number][]) =>
    createPatronScheduler({ placements, seat, player: createPlayerController(collisionVolumes, ENTRY_SPAWN), presenter: createFigurePresenter() });
  const base = { volumeId: "cabinet-B0", gameId: ENTRY.id, instance: createGameInstance(ENTRY.createSim, ENTRY.seed ?? 0), seed: ENTRY.seed!, impulses: IMPULSES };

  const s1 = make();
  assert.equal(s1.busyFor("cabinet-B0"), false, "untracked before track (seat would sit: 1.5 law)");
  s1.track(base);
  assert.equal(s1.busyFor("cabinet-B0"), true, "tracked busy: the seat's E-law flips to wait");
  assert.equal(s1.busyFor("cabinet-B7"), false, "never tracked, never busy");
  assert.throws(() => s1.track(base), /already tracked/, "one run state per volume");
  const s2 = make();
  assert.throws(() => s2.track({ ...base, volumeId: "cabinet-B7" }), /no placement/, "the scheduler reads placements, never hand-typed ids");
  const s3 = make(cabinetPlacements.map((p) => ({ ...p, busy: false })));
  assert.throws(() => s3.track(base), /not busy/, "a not-busy placement stays seat-side (1.5 law)");
  const s4 = make();
  assert.throws(() => s4.track({ ...base, seed: 12.5 }), /authored seed/, "derived runs need the integer entry seed");
  const s5 = make([
    { ...cabinetPlacements[0]!, busy: true, volumeId: "cabinet-B9" },
    { ...cabinetPlacements[0]!, busy: true, volumeId: "cabinet-B9c" },
  ]);
  s5.track({ ...base, volumeId: "cabinet-B9" });
  assert.throws(() => s5.track({ ...base, volumeId: "cabinet-B9c" }), /already tracked/, "one run state per game (the by-game map)");
  assert.throws(() => make().toggleWait("cabinet-B0"), /untracked/, "the seat can only toggle a tracked queue");
});

// --- impulse-stage scope laws (pinned scheduler laws, per the module header) --

test("impulse scope: mapped canonical breaks never fire the reaction library (breaks are arbitrated, not animated), and an untracked game's records are inert here", () => {
  const seat = createSeatService({ player: createPlayerController(collisionVolumes, ENTRY_SPAWN), cabinets: createCabinetRuntime() });
  const presenter = createFigurePresenter();
  const sched = createPatronScheduler({ seat, player: createPlayerController(collisionVolumes, ENTRY_SPAWN), presenter });
  // A deliberately adversarial mapping: canonical breaks MAPPED to reactions.
  // The record kind, not the mapping, decides the impulse stage's scope.
  sched.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance: createGameInstance(ENTRY.createSim, ENTRY.seed ?? 0),
    seed: ENTRY.seed!,
    impulses: { gameEnded: "slam", roundBreak: "flinch", jump: "jump" },
  });
  sched.dispatch(
    [
      { tick: 10, gameId: "untracked-game", event: { type: "jump", payload: {} } },
      { tick: 10, gameId: ENTRY.id, event: { type: "gameEnded", payload: {} } },
    ],
    10,
  );
  assert.equal(presenter.state().reaction, null, "the untracked game's record changes nothing, and the mapped canonical break skipped the impulse stage");
  sched.dispatch([{ tick: 11, gameId: ENTRY.id, event: { type: "roundBreak", payload: {} } }], 11);
  assert.equal(presenter.state().reaction, null, "roundBreak skips the impulse stage too");
  sched.dispatch([{ tick: 12, gameId: ENTRY.id, event: { type: "jump", payload: {} } }], 12);
  assert.equal(presenter.state().reaction, "jump", "the stage is alive — the two skips are the record kind, not a dead mapping");
});

// --- AC3: NEXT stays Core-lettered at the 0.18 m cap over the busy frame -----

test("AC3: on busy B0's composite the game frame blits under the Core NEXT row, still lettered at the 0.18 m authored minimum (compositeScreen untouched by the busy wiring)", () => {
  const p = cabinetPlacements.find((c) => c.busy === true)!;
  // Story 2.0 cap split (AD-28 survives verbatim): the NEXT floor travels
  // to its own SCREEN_NEXT_CAP_M constant; the marquee cap became 0.09 one
  // line. The 0.18 m DESIGN minimum itself is untouched.
  assert.ok(Math.abs(SCREEN_NEXT_CAP_M - 0.18) < 1e-12, "NEXT's authored minimum is 0.18 m (DESIGN contract)");
  const texts: { text: string; y: number; fontPx: number; style: string }[] = [];
  const draws: unknown[] = [];
  const ctx: PaintContext = {
    fillStyle: "",
    font: "",
    textAlign: "",
    letterSpacing: "",
    fillRect() {},
    drawImage(source) {
      draws.push(source);
    },
    fillText(text, _x, y) {
      const m = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font));
      texts.push({ text, y, fontPx: m ? Number(m[1]) : NaN, style: String(ctx.fillStyle) });
    },
    measureText(t) {
      const m = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font));
      return { width: t.length * 0.92 * Number(m![1]) };
    },
  };
  const surface: PaintSurface = {
    width: Math.round(SHELL.screen.width * SURFACE_PX_PER_M),
    height: Math.round(SHELL.screen.height * SURFACE_PX_PER_M),
    getContext: (kind) => (kind === "2d" ? ctx : null),
  };
  const game = { width: 640, height: 360 }; // the live game canvas stand-in
  compositeScreen(surface, p.screenZones, game, "#15110e", "#ffc46b", SCREEN_NEXT_CAP_M, SHELL.screen.height);
  assert.equal(draws.length, 1, "the busy machine's live frame composites under the Core row");
  const next = texts.filter((t) => t.text === p.screenZones.next.toUpperCase());
  assert.equal(next.length, 1, "the Core still letters exactly the NEXT zone over the busy frame");
  const pxPerM = surface.height / SHELL.screen.height;
  assert.equal(next[0]!.fontPx, Math.round(SCREEN_NEXT_CAP_M * pxPerM), "NEXT paints at the 0.18 m cap on the busy screen (the fit law untouched \u2014 mutation dropping the NEXT fillText is red here)");
  assert.equal(next[0]!.y, surface.height - Math.round(surface.height * SCREEN_EDGE_RATIO), "NEXT sits on the bottom-band baseline");
  assert.equal(next[0]!.style, "#ffc46b", "the injected marquee hue, as always");
});

// --- Story 1.7 (AC5): the faulted laws at the busy cabinet --------------------------------

test("1.7 a fault lands during Patron autoplay: the figure lifts off the SAME dispatch that sees it (occupancy -> attract, queue voided, figure gone), and neither the dwell re-arm nor a break relaunch ever fires while faulted — busy-never-withholds becomes fallback performance, not a relaunch into a dead sim", () => {
  let broken = false;
  const v = walkToB0(() => 4242, (gameId) => broken && gameId === "moon-patrol");
  waitPatron(v); // a real autoplay run is live (runCount 1, figure active)
  pressE(v); // the door leg is intact at a busy cabinet
  assert.equal(v.cabinets.coinDoors["cabinet-B0"], true, "the first E opens the door (busy law)");
  pressE(v); // the second E joins the queue (never a sit at a busy cabinet)
  assert.equal(v.b0().queue.length, 1, "the Visitor's claim sits in the queue before the fault");
  assert.ok(v.sched.figureActive("cabinet-B0"), "the Patron holds the machine before the fault");
  const seedsBefore = v.b0().lastSeed;
  const runBefore = v.b0().runCount;

  broken = true;
  v.tick(); // one dispatch sees the fault (systems run after the instance phase)
  assert.equal(v.b0().occupancy, "attract", "the fault is that machine's last break: the Patron is off the machine this same tick");
  assert.deepEqual(v.b0().queue, [], "the queue is voided with the faulted game (no handover can ever be honoured on it)");
  assert.equal(v.sched.figureActive("cabinet-B0"), false, "the figure follows occupancy — the frame reads figureActive, no separate figure change");
  assert.equal(v.b0().runCount, runBefore, "no new autoplay run was consumed on the fault tick");

  for (let i = 0; i < 720; i++) v.tick();
  assert.equal(v.b0().runCount, runBefore, "720 more ticks and the dwell re-arm gate never fires while faulted — no relaunch");
  assert.equal(v.b0().occupancy, "attract", "the Cabinet keeps its fallback face for as long as the fault stands");
  assert.equal(v.b0().lastSeed, seedsBefore, "no new derived seed is consumed either (the launch gate precedes the seed arithmetic)");
});
