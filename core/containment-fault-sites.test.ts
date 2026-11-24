// Story 1.7 QA (AC1/AC4/AC5): the fault SITES the implement suite never
// drove. Its pins fault the sim inside tick() (guarded + gate chain), in
// events() (DW-6), at the boot factories, and via injectFault - but a sim
// hook that throws at any OTHER wrapped site has never been executed:
// (a) the watcher's own stateHash sample, (b) the scheduler's dwell launch
// reaching autoplay() through the guarded boot seam (the Rule 1 consumer
// integration: attach seam + guard + real loop + real scheduler composed),
// and (c) snapshot(), a site nothing on the tick path calls. The law these
// pins: EVERY kernel->sim site is supervisor-attributed and its FIRST
// fault quarantines the sim half; quarantine also freezes those sites' raw
// hooks and keeps the post-quarantine reads total. Needs: nothing beyond
// its own rigs (real loop/supervisor/guard/scheduler, faulted fixtures as
// the only fakes); hermetic, run-order free. The quarantine law itself,
// the boot guard, the stall predicate, and the seat/scheduler fault laws
// are pinned in containment/scheduler/seat suites - no re-pinning here.
import test from "node:test";
import assert from "node:assert/strict";
import { createKernelLoop, MS_PER_TICK } from "./loop.ts";
import { guardInstance, attachGameEntries, type GameGuard } from "./containment.ts";
import {
  stateHashOf,
  type GameCanvasLike,
  type GameInstance,
  type GameRegistryEntry,
  type SimContext,
  type SimHooks,
} from "./contract/index.ts";
import {
  ATTRACT_DWELL_TICKS,
  createPatronScheduler,
  derivedSeed,
  type SeatHandover,
} from "./patrons/scheduler.ts";
import { createFigurePresenter } from "./patrons/presenter.ts";
import { createPlayerController } from "./player.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { CABINET_PHASE_CYCLE_TICKS } from "./room/cabinets.ts";
import { gameRegistry } from "../generated/game-registry.ts";

const fakeCanvas: (width: number, height: number) => GameCanvasLike = (width, height) => ({
  width,
  height,
  getContext: (kind: "2d") => (kind === "2d" ? {} : null),
});

function ticking(loop: ReturnType<typeof createKernelLoop>, clock: { ms: number }): () => void {
  return () => {
    clock.ms += MS_PER_TICK + 0.0002;
    assert.equal(loop.step(), 1, "exactly one global tick per frame at the tick rate");
  };
}

// A raw GameInstance (the guard's own input shape - the watcher-stub idiom
// from containment.test.ts) with per-hook raw call counters: the guard
// hides its instance, so the closure counters are the only evidence that
// a site's raw hook froze.
function hookBoom(throwOn: "stateHash" | "snapshot"): {
  raw: { ticks: number; hashCalls: number; snapCalls: number };
  instance: GameInstance;
} {
  const raw = { ticks: 0, hashCalls: 0, snapCalls: 0 };
  const instance: GameInstance = {
    tick() {
      raw.ticks += 1;
    },
    events: () => [],
    snapshot: () => {
      raw.snapCalls += 1;
      if (throwOn === "snapshot") throw new Error(`${throwOn} boom`);
      return { t: raw.ticks };
    },
    stateHash: () => {
      raw.hashCalls += 1;
      if (throwOn === "stateHash") throw new Error(`${throwOn} boom`);
      return `h${raw.ticks}`;
    },
    attract() {},
    autoplay() {},
    play() {},
    mode: () => "attract" as const,
  };
  return { raw, instance };
}

// --- site (a): the watcher's own stateHash sample ----------------------------

test("a throwing stateHash quarantines at the watcher's OWN sample site: one record under hook \"stateHash\" (not \"tick\", not \"stall\") at the cycle boundary, the watcher stops without synthesizing a stall, and the frozen hash never gets sampled again (AC1/AC4)", () => {
  const boundary = CABINET_PHASE_CYCLE_TICKS;
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const { raw, instance } = hookBoom("stateHash");
  const guard: GameGuard = guardInstance(instance, loop.supervisor, "hashboom", {
    tickCount: () => loop.tickCount,
  });
  loop.addInstance("hashboom", guard.instance);
  const step1 = ticking(loop, clock);
  for (let i = 0; i < boundary - 1; i++) step1();
  assert.equal(loop.supervisor.faults.length, 0, "the hash is only sampled at the cycle boundary - nothing before it");
  assert.equal(raw.hashCalls, 0);
  step1(); // guarded tick #240 samples the hash: the sim's throw lands HERE
  const faults = loop.supervisor.faults;
  assert.equal(faults.length, 1, "the throw reaches the supervisor through the guard, once");
  assert.equal(faults[0]?.errorId, "hashboom.stateHash#1", "attributed to the SIM-HOOK site (mutation: the watcher sampling instance.stateHash() unguarded lands this under hook \"tick\" via the loop and reds this)");
  assert.equal(faults[0]?.hook, "stateHash");
  assert.equal(faults[0]?.tick, boundary, "stamped at the guarded-tick boundary (AD-3)");
  assert.equal(faults[0]?.message, "stateHash boom", "the sim's own throw, not a synthesized stall record");
  assert.equal(guard.faulted(), true, "a stateHash fault quarantines like a tick fault - the watcher's own site is not exempt");
  assert.equal(raw.ticks, boundary, "raw hooks frozen at the boundary tick");
  assert.equal(raw.hashCalls, 1, "the watcher stops sampling a quarantined game (no second sample, and no stall synthesis follows the quarantine)");
  for (let i = 0; i < 600; i++) step1();
  assert.equal(loop.tickCount, boundary + 600, "the room keeps ticking past the fault");
  assert.equal(loop.supervisor.faults.length, 1, "no stall record, no repeated stateHash record - one fault, bounded (DW-3)");
  assert.equal(raw.ticks, boundary, "raw hooks stay frozen across the whole run");
  assert.equal(guard.instance.stateHash(), stateHashOf({}), "the post-quarantine hash read is the safe total value without touching the sim");
  assert.equal(raw.hashCalls, 1, "and it stays that way: the raw hash hook never runs again");
});

// --- site (b): the scheduler's dwell launch through the guarded boot seam ----

test("composed integration (Rule 1, AC5): the scheduler's dwell launch through the boot-seam guard faults in autoplay() - one record under hook \"autoplay\", the Patron lifts off the NEXT dispatch (occupancy attract, figure off, queue void), and across 480 further ticks the launch gate never relaunches the quarantined cabinet while the loop keeps ticking", () => {
  const ENTRY = gameRegistry.find((e) => e.id === "moon-patrol")!;
  // A registry-shaped entry whose autoplay hook is the dead machine: the
  // kernel's OWN launch site is where the first fault lands (the inject
  // fixture reaches an already-healthy instance; this drives the law from
  // the scheduler's launch through the guard's autoplay site).
  const autoplayCalls: number[] = [];
  function autoplayBoom(ctx: SimContext): SimHooks {
    const state = ctx.gated({ t: 0 });
    return {
      tick() {
        state.t += 1;
      },
      events: () => [],
      snapshot: () => ({ t: state.t }),
      autoplay(seed: number) {
        autoplayCalls.push(seed);
        throw new Error("autoplay boom");
      },
    };
  }
  const entry: GameRegistryEntry = { ...ENTRY, createSim: autoplayBoom, createPresentation: undefined };

  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const attached = attachGameEntries([entry], loop, loop.supervisor, fakeCanvas);
  const instance = attached.instances.get(ENTRY.id)!;
  // scheduler-breaks.test.ts idiom: the scheduler faces the seat only
  // through the SeatHandover seam (the sit/stand law is pinned in seat.ts
  // suites); here the chair is never taken.
  const seat: SeatHandover = { takeOver: () => false, seatedAt: () => false };
  const scheduler = createPatronScheduler({
    seat,
    player: createPlayerController(collisionVolumes, ENTRY_SPAWN),
    presenter: createFigurePresenter(),
    faultedFor: (gameId) => attached.containment.faultedFor(gameId),
  });
  scheduler.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance,
    seed: entry.seed!,
    impulses: entry.impulses!,
  });
  loop.addSystem("patrons", () => {
    scheduler.dispatch(loop.drainEvents(), loop.tickCount);
  });
  const b0 = () => scheduler.state().cabinets.find((c) => c.volumeId === "cabinet-B0")!;

  const step1 = ticking(loop, clock);
  for (let i = 0; i < ATTRACT_DWELL_TICKS - 1; i++) step1();
  assert.equal(loop.supervisor.faults.length, 0, "healthy until the dwell closes");
  assert.equal(b0().occupancy, "attract", "the dwell gates the first launch (1.6 law intact through the guard)");
  assert.equal(autoplayCalls.length, 0);

  step1(); // tick 600: the dwell dispatch launches -> guarded autoplay throws
  const faults = loop.supervisor.faults;
  assert.equal(faults.length, 1, "the launch-site fault lands as ONE supervisor record");
  assert.equal(faults[0]?.errorId, `${ENTRY.id}.autoplay#1`, "attributed to the gameId + autoplay hook (AD-26 shape)");
  assert.equal(faults[0]?.hook, "autoplay");
  assert.equal(faults[0]?.tick, ATTRACT_DWELL_TICKS, "stamped at the launch tick (AD-3)");
  assert.equal(autoplayCalls.length, 1, "the raw autoplay hook ran exactly once");
  assert.equal(attached.containment.faultedFor(ENTRY.id), true, "the scheduler's own predicate now sees the quarantine");
  assert.equal(b0().occupancy, "patron-autoplay", "the launch completed its bookkeeping past the swallowed throw - the posture the lift law undoes next tick");
  assert.equal(scheduler.figureActive("cabinet-B0"), true, "and the figure is momentarily up until the lift");

  step1(); // the next dispatch lifts the Patron off the dead machine
  assert.equal(b0().occupancy, "attract", "faulted + patron-autoplay -> attract on the next dispatch (AC5)");
  assert.equal(scheduler.figureActive("cabinet-B0"), false, "the figure follows via figureActive");
  assert.deepEqual(b0().queue, []);

  for (let i = 0; i < 480; i++) step1();
  assert.equal(loop.tickCount, ATTRACT_DWELL_TICKS + 1 + 480, "the room keeps ticking with the cabinet quarantined");
  assert.equal(loop.supervisor.faults.length, 1, "no relaunch, no repeated autoplay faults over the whole run (DW-3)");
  assert.equal(autoplayCalls.length, 1, "the raw autoplay hook was never called again (the guard short-circuits re-launches - the scheduler-side bookkeeping below is what the missing gate would expose)");
  assert.equal(b0().occupancy, "attract", "the Cabinet keeps its attract posture for as long as the fault stands (mutation: deleting the launch gate in scheduler.ts re-launches every dwell dispatch - this and the runCount/lastSeed pins below go red)");
  assert.equal(b0().runCount, 1, "no further autoplay run is consumed");
  assert.equal(b0().lastSeed, derivedSeed(entry.seed!, 0), "no further derived seed is spent");
});

// --- site (c): snapshot(), a site nothing on the tick path calls -------------

test("a throwing snapshot() quarantines at its own site: one record under hook \"snapshot\", the loop-driven tick hooks freeze from that call, and the post-quarantine snapshot read returns the safe {} without touching the sim (AC1: every wrapped hook, not just the tick-path ones)", () => {
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const { raw, instance } = hookBoom("snapshot");
  const guard = guardInstance(instance, loop.supervisor, "snapboom", {
    tickCount: () => loop.tickCount,
  });
  loop.addInstance("snapboom", guard.instance);
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 10; i++) step1();
  assert.equal(raw.ticks, 10, "healthy ticks first");
  assert.equal(loop.supervisor.faults.length, 0);

  guard.instance.snapshot(); // the site fires: the throw lands here and is contained
  const faults = loop.supervisor.faults;
  assert.equal(faults.length, 1, "the snapshot throw is contained at the call - it never reaches the caller (mutation: the guard's snapshot leg calling instance.snapshot() directly makes this line throw out of the test red)");
  assert.equal(faults[0]?.errorId, "snapboom.snapshot#1");
  assert.equal(faults[0]?.hook, "snapshot");
  assert.equal(faults[0]?.tick, 10, "stamped at the current loop tick (AD-3)");
  assert.equal(guard.faulted(), true, "a non-tick-site fault quarantines the whole sim half");

  for (let i = 0; i < 50; i++) step1();
  assert.equal(loop.tickCount, 60, "the room kept ticking");
  assert.equal(raw.ticks, 10, "the tick hooks froze at the snapshot fault - quarantine binds the sim half from any site");
  assert.equal(loop.supervisor.faults.length, 1, "one record for one fault");
  assert.deepEqual(guard.instance.snapshot(), {}, "the post-quarantine read is the safe total value");
  assert.equal(raw.snapCalls, 1, "the raw snapshot hook never runs again");
});
