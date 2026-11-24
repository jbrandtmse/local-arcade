// Story 1.7 QA (AC1-AC6 + DW-2/DW-3/DW-6): the containment seam — boot
// guard (attachGameEntries), the guard decorator with quarantine + the
// stateHash-stall watcher (guardInstance), the injectFault smoke trigger,
// and the supervisor ring — executed against the REAL composed stack: real
// kernel loop, real contract wrapper behind the REAL tick gate, real
// supervisor (e2e-kernel.test.ts wiring idiom; the only fakes here are the
// faulted fixtures and the injected canvas/recorder surfaces, Rule 1). The
// I/O matrix rows run here; rows whose pins live in their own files: the
// seat/scheduler fault laws (seat/visit-arc, scheduler/scheduler-breaks)
// and the main.ts wiring (main-glue source tier). Hermetic: every rig
// builds its own loop/instances and consumes only its own state.
import test from "node:test";
import assert from "node:assert/strict";
import { createKernelLoop, MS_PER_TICK, type EventRecord } from "./loop.ts";
import { MAX_FAULT_RECORDS } from "./supervisor.ts";
import { MAX_STALL_CYCLES, attachGameEntries, guardInstance } from "./containment.ts";
import {
  createGameInstance,
  stateHashOf,
  type GameCanvasLike,
  type GameInstance,
  type GameRegistryEntry,
  type SimContext,
  type SimEvent,
  type SimFactory,
  type SimHooks,
} from "./contract/index.ts";
import {
  CABINET_PHASE_CYCLE_TICKS,
  MARQUEE_CAP_M,
  SCREEN_ATTRACT_CAP_M,
  SCREEN_PAINT_STEP_TICKS,
  SHELL,
  cabinetPlacements,
  createCabinetRuntime,
  screenPaintStep,
  stepCabinetPhase,
} from "./room/cabinets.ts";
import { SURFACE_PX_PER_M, repaintScreen, type PaintContext, type PaintSurface } from "./room/surfaces.ts";
import { createInputService } from "./input/index.ts";
import { createPlayerController } from "./player.ts";
import { createSeatService, type SeatKeyMap } from "./seat.ts";
import { createPatronScheduler } from "./patrons/scheduler.ts";
import { createFigurePresenter } from "./patrons/presenter.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { gameRegistry } from "../generated/game-registry.ts";

const MOON_KEYS: SeatKeyMap = {
  axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
  buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
};

// A fixture mini-game in contract shape (the e2e-kernel idiom) with the
// RAW hook counters the fault pins read: the guard hides its instance, so
// the only evidence that quarantine froze the sim is the factory-closure
// counters below.
interface TickFx {
  rawTicks: number;
  rawPulls: number;
  factory: SimFactory;
}

function fxSim(opts: { throwAt?: number; beatEvery?: number; writeInEvents?: boolean } = {}): TickFx {
  // The factory runs only after fx is initialized (the closure reads fx at
  // CALL time), so declaring it first and stamping it onto fx keeps the raw
  // counters the SAME object the closure mutates — external reads see every
  // hook call.
  function factory(ctx: SimContext): SimHooks {
    const state = ctx.gated({ t: 0 });
    let pending: SimEvent[] = [];
    let threw = false;
    return {
      tick() {
        fx.rawTicks += 1;
        if (opts.throwAt !== undefined && !threw && state.t + 1 === opts.throwAt) {
          threw = true;
          throw new Error(`flaky boom at ${opts.throwAt}`);
        }
        state.t += 1;
        if (opts.beatEvery !== undefined && state.t % opts.beatEvery === 0) {
          pending.push({ type: "tickMark", payload: { t: state.t } });
        }
      },
      events() {
        fx.rawPulls += 1;
        // DW-6 fixture: a sim writing gated state OUTSIDE the tick window
        // meets the wrapper's gate TypeError inside the real chain.
        if (opts.writeInEvents === true) state.t += 1;
        const pulled = pending;
        pending = [];
        return pulled;
      },
      snapshot() {
        return { t: state.t };
      },
    };
  }
  const fx: TickFx = { rawTicks: 0, rawPulls: 0, factory };
  return fx;
}

// The injected canvas seam attachGameEntries hands presentation factories.
const fakeCanvas: (width: number, height: number) => GameCanvasLike = (width, height) => ({
  width,
  height,
  getContext: (kind: "2d") => (kind === "2d" ? {} : null),
});

// seat/scheduler rig idiom: fake clock + exactly one global tick per step.
function ticking(loop: ReturnType<typeof createKernelLoop>, clock: { ms: number }): () => void {
  return () => {
    clock.ms += MS_PER_TICK + 0.0002;
    assert.equal(loop.step(), 1, "exactly one global tick per frame at the tick rate");
  };
}

// --- boot guard (DW-2, matrix rows 1-2) -------------------------------------

test("boot guard: [good, broken, good] entries attach the survivors, the broken entry registers NOTHING, boot never rethrows, and one fault lands under hook \"boot\" stamped at sim time (AC3, DW-2)", () => {
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const a = fxSim();
  const b = fxSim();
  let presCalls = 0;
  const entries: GameRegistryEntry[] = [
    { id: "good-a", seed: 11, createSim: a.factory },
    {
      id: "broken",
      seed: 3,
      createSim: () => {
        throw new Error("sim factory boom");
      },
      createPresentation: () => {
        presCalls += 1;
        return { canvas: fakeCanvas(4, 4), drawFrame(): void {} };
      },
    },
    { id: "good-b", seed: 13, createSim: b.factory },
  ];
  const attached = attachGameEntries(entries, loop, loop.supervisor, fakeCanvas);
  // The boot survived (AC3: attach never rethrows — mutation "unguarded
  // createGameInstance call" makes this whole test die on the step).
  assert.equal(loop.supervisor.faults.length, 1, "exactly one fault record from boot");
  const fault = loop.supervisor.faults[0]!;
  assert.equal(fault.hook, "boot");
  assert.equal(fault.errorId, "broken.boot#1");
  assert.equal(fault.tick, 0, "boot faults stamp the loop's tick at attach time (0 before start) — sim time, never wall clock (AD-3)");
  assert.equal(fault.message, "sim factory boom");
  // The broken entry registers nothing — no instance, no kernel input, no
  // presentation half, and its presentation factory was never even called
  // (a sim-less entry cannot present).
  assert.equal(attached.instances.has("broken"), false);
  assert.equal(attached.instanceInputs.has("broken"), false);
  assert.equal(attached.presentations.has("broken"), false);
  assert.equal(presCalls, 0, "a faulted sim half never creates its presentation half");
  // The survivors attach guarded and tick every global tick.
  assert.deepEqual([...attached.instances.keys()], ["good-a", "good-b"]);
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 12; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(loop.tickCount, 12);
  assert.equal(a.rawTicks, 12, "survivor A ticks every global tick under its guard");
  assert.equal(b.rawTicks, 12, "survivor B likewise — boot continued past the broken entry");
  // The containment posture the room consumes: faultedFor true only for the
  // dead entry (face gate -> fallback painter; seat law -> coin-door only).
  assert.equal(attached.containment.faultedFor("broken"), true);
  assert.equal(attached.containment.faultedFor("good-a"), false);
  assert.equal(attached.containment.faultedFor("good-b"), false);
});

test("throwing presentation factory: the sim half keeps ticking, the face registers no presentation, and boot survives with one fault under hook \"boot\" (matrix row 2)", () => {
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const fx = fxSim();
  const entries: GameRegistryEntry[] = [
    {
      id: "bad-pres",
      seed: 5,
      createSim: fx.factory,
      createPresentation: () => {
        throw new Error("presentation factory boom");
      },
    },
  ];
  const attached = attachGameEntries(entries, loop, loop.supervisor, fakeCanvas);
  assert.equal(loop.supervisor.faults.length, 1);
  assert.equal(loop.supervisor.faults[0]?.hook, "boot");
  assert.equal(loop.supervisor.faults[0]?.errorId, "bad-pres.boot#1");
  assert.equal(loop.supervisor.faults[0]?.message, "presentation factory boom");
  assert.equal(attached.presentations.has("bad-pres"), false, "the face has no presentation half — main.ts's presentations.has gate puts it on the fallback painter");
  assert.equal(attached.instances.has("bad-pres"), true, "the sim half survives its presentation half's fault");
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 10; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(fx.rawTicks, 10, "the sim half keeps ticking untouched by the presentation fault");
  assert.equal(attached.containment.faultedFor("bad-pres"), false, "a presentation-side boot fault never quarantines the sim half (the halves fault independently)");
  assert.equal(loop.supervisor.faults.length, 1, "and it adds nothing past the boot record");
});

// --- guard quarantine (AC1, matrix row 3) ------------------------------------

test("guard quarantines at the first sim-side fault: exactly one record under that gameId, its raw hooks frozen, neighbours and the loop keep performing, and post-quarantine reads stay total (AC1, AD-15, DW-3)", () => {
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const flaky = fxSim({ throwAt: 4 });
  const steady = fxSim();
  const attached = attachGameEntries(
    [
      { id: "flaky", seed: 5, createSim: flaky.factory },
      { id: "steady", seed: 31, createSim: steady.factory },
    ],
    loop,
    loop.supervisor,
    fakeCanvas,
  );
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 40; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(loop.tickCount, 40, "the room never crashed (AD-15)");
  const faults = loop.supervisor.faults;
  assert.equal(faults.length, 1, "exactly ONE record — the quarantine stops the 60x/s hammering at the first fault");
  assert.equal(faults[0]?.errorId, "flaky.tick#1");
  assert.equal(faults[0]?.hook, "tick");
  assert.equal(faults[0]?.tick, 4, "the record stamps the sim-time tick the fault landed on (AD-3)");
  assert.equal(flaky.rawTicks, 4, "raw hooks frozen: the faulting call was its LAST (mutation: a guard that re-invokes the sim after the fault goes red here)");
  assert.equal(steady.rawTicks, 40, "the neighbour kept performing every tick");
  assert.equal((attached.instances.get("steady")!.snapshot() as { t: number }).t, 40, "and its wrapper-visible state advanced");
  assert.equal(attached.containment.faultedFor("flaky"), true);
  assert.equal(attached.containment.faultedFor("steady"), false);
  const quarantined = attached.instances.get("flaky")!;
  assert.deepEqual(quarantined.snapshot(), {}, "post-quarantine snapshot is the safe total value");
  assert.equal(quarantined.stateHash(), stateHashOf({}), "post-quarantine stateHash is the wrapper hash of {} (computed once, Design Notes 8)");
  assert.deepEqual(quarantined.events(), [], "post-quarantine events is empty — the loop's queue stays clean");
  assert.equal(flaky.rawPulls, 3, "the events LEG is frozen too — raw pulls stop at the faulting tick (3 pulls land before it; a guard that kept pulling through would climb to 40)");
});

// --- DW-6: out-of-tick write through the REAL gate (matrix row 4) ------------

test("out-of-tick write chain (DW-6): a sim writing gated state inside events() meets the REAL tick gate — the TypeError travels wrapper -> guard -> supervisor and lands as exactly ONE fault under that gameId (hook \"events\"), then the quarantine holds; no caller-side catch anywhere", () => {
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const chain = fxSim({ writeInEvents: true });
  const neighbour = fxSim();
  const attached = attachGameEntries(
    [
      { id: "chain", seed: 2, createSim: chain.factory },
      { id: "neighbour", seed: 8, createSim: neighbour.factory },
    ],
    loop,
    loop.supervisor,
    fakeCanvas,
  );
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 20; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(loop.tickCount, 20, "the loop survived the out-of-tick write");
  const faults = loop.supervisor.faults;
  assert.equal(faults.length, 1, "the gate throw lands ONCE (mutation: opening the wrapper gate permanently reds this — no gate fault appears at all)");
  assert.equal(faults[0]?.errorId, "chain.events#1", "attributed to the gameId, not the caller");
  assert.equal(faults[0]?.hook, "events");
  assert.match(faults[0]?.message as string, /outside the tick window/, "the fault record carries the gate's own AD-15 TypeError");
  assert.equal(chain.rawPulls, 1, "the guarded chain's raw hooks frozen after the chain fault");
  assert.equal(chain.rawTicks, 1, "and its tick stopped too — quarantine binds the whole sim half");
  assert.equal(neighbour.rawTicks, 20, "the neighbour kept performing");
  assert.equal(attached.containment.faultedFor("chain"), true);
});

// --- the stateHash-stall watcher (AC4) ----------------------------------------

function stubGame(hash: () => string, raw: { ticks: number }): GameInstance {
  return {
    tick() {
      raw.ticks += 1;
    },
    events: () => [],
    snapshot: () => ({}),
    stateHash: hash,
    attract() {},
    autoplay() {},
    play() {},
    mode: () => "attract" as const,
  };
}

test("stall watcher: a frozen-hash sim faults at exactly the Nth cycle boundary with ONE synthesized fault (hook \"stall\"), then the same quarantine posture; an advancing-hash sim never trips it; the threshold is the seam's parameters", () => {
  const boundary = MAX_STALL_CYCLES * CABINET_PHASE_CYCLE_TICKS;

  // The faulted half: samples at 240/480/720, synthesis at 720.
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const raw = { ticks: 0 };
  const guard = guardInstance(stubGame(() => "frozen", raw), loop.supervisor, "dead", {
    tickCount: () => loop.tickCount,
  });
  loop.addInstance("dead", guard.instance);
  const step1 = ticking(loop, clock);
  for (let i = 0; i < boundary - 1; i++) step1();
  assert.equal(loop.supervisor.faults.length, 0, `nothing faults before the ${boundary}-tick threshold closes (mutation: a watcher that skips the stall synthesis keeps THIS green and the fault pins below red)`);
  step1();
  assert.equal(loop.tickCount, boundary);
  const faults = loop.supervisor.faults;
  assert.equal(faults.length, 1, "the stall synthesizes exactly ONE fault");
  assert.equal(faults[0]?.hook, "stall");
  assert.equal(faults[0]?.errorId, "dead.stall#1");
  assert.equal(faults[0]?.tick, boundary, "the stall record stamps sim time at the cycle boundary (AD-3: the watcher counts guarded ticks, never wall clock)");
  assert.match(faults[0]?.message as string, new RegExp(`stateHash unchanged for ${MAX_STALL_CYCLES} attract cycles \\(${boundary} ticks\\)`));
  assert.equal(guard.faulted(), true, "the stall lands in the same quarantine + fallback posture as a real fault");
  assert.equal(raw.ticks, boundary, "raw hooks frozen at the boundary");
  for (let i = 0; i < 120; i++) step1();
  assert.equal(loop.supervisor.faults.length, 1, "watcher and guard both stop calling a quarantined game (no repeated stall records — DW-3)");
  assert.equal(raw.ticks, boundary, "and its raw hooks stay frozen");

  // The advancing half: every sample differs — 3 cycles + a crossing, zero faults.
  const clock2 = { ms: 0 };
  const loop2 = createKernelLoop({ now: () => clock2.ms });
  let sample = 0;
  const liveRaw = { ticks: 0 };
  const guard2 = guardInstance(stubGame(() => `h${(sample += 1)}`, liveRaw), loop2.supervisor, "alive", {
    tickCount: () => loop2.tickCount,
  });
  loop2.addInstance("alive", guard2.instance);
  const step2 = ticking(loop2, clock2);
  for (let i = 0; i < boundary + 80; i++) step2();
  assert.equal(loop2.supervisor.faults.length, 0, "a live game's hash advances every cycle — the watcher never touches it");
  assert.equal(guard2.faulted(), false);
  assert.equal(liveRaw.ticks, boundary + 80, "it kept its full tick cadence throughout");

  // The threshold is the seam's own parameters, not one hard-coded site: a
  // small cycleTicks/stallCycles guard trips proportionally.
  const clock3 = { ms: 0 };
  const loop3 = createKernelLoop({ now: () => clock3.ms });
  const raw3 = { ticks: 0 };
  const guard3 = guardInstance(stubGame(() => "frozen", raw3), loop3.supervisor, "small", {
    tickCount: () => loop3.tickCount,
    cycleTicks: 4,
    stallCycles: 2,
  });
  loop3.addInstance("small", guard3.instance);
  const step3 = ticking(loop3, clock3);
  for (let i = 0; i < 7; i++) step3();
  assert.equal(loop3.supervisor.faults.length, 0, "one cycle short of the threshold: no fault");
  step3();
  assert.equal(loop3.supervisor.faults.length, 1);
  assert.equal(loop3.supervisor.faults[0]?.hook, "stall");
  assert.equal(loop3.supervisor.faults[0]?.tick, 8, "the synthesis lands exactly at stallCycles * cycleTicks guarded ticks");
});

test("the real Moon Patrol attract instance never trips the watcher (AC4's live half): its wrapper stateHash advances every attract cycle and the watcher records zero faults over 3 cycles + a boundary", () => {
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
  const guard = guardInstance(instance, loop.supervisor, entry.id, { tickCount: () => loop.tickCount });
  loop.addInstance(entry.id, guard.instance);
  const step1 = ticking(loop, clock);
  const hashes: string[] = [];
  for (let tick = 1; tick <= 3 * CABINET_PHASE_CYCLE_TICKS + 1; tick++) {
    step1();
    loop.drainEvents();
    if (tick % CABINET_PHASE_CYCLE_TICKS === 0) hashes.push(guard.instance.stateHash());
  }
  assert.equal(loop.supervisor.faults.length, 0, "a healthy shipped game records NOTHING at the watcher — quarantine is not a false positive (AC4)");
  assert.equal(guard.faulted(), false);
  assert.equal(hashes.length, 3);
  assert.notEqual(hashes[0], hashes[1], "cycle 1 -> cycle 2 moved the wrapper hash");
  assert.notEqual(hashes[1], hashes[2], "cycle 2 -> cycle 3 moved it again");
  assert.notEqual(hashes[0], hashes[2], "pairwise: no two cycle samples coincide");
});

// --- draw-vs-sim independence (matrix row: a throwing drawFrame) --------------

test("a draw-leg fault flips only that face: one record under hook \"draw\" attributed to the gameId, the guard never quarantines, and the sim half keeps its full cadence (the halves fault independently)", () => {
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const fx = fxSim();
  const attached = attachGameEntries([{ id: "shown", seed: 9, createSim: fx.factory }], loop, loop.supervisor, fakeCanvas);
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 5; i++) {
    step1();
    loop.drainEvents();
  }
  const draw = loop.supervisor.invoke({
    tick: loop.tickCount,
    gameId: "shown",
    hook: "draw",
    call: () => {
      throw new Error("draw boom");
    },
  });
  assert.equal(draw.ok, false);
  assert.equal(draw.fault?.errorId, "shown.draw#1", "the render-side fault is attributed to the game, like every other record");
  assert.equal(draw.fault?.hook, "draw");
  assert.equal(attached.containment.faultedFor("shown"), false, "the guard never sees a draw fault — quarantine binds the sim half only");
  for (let i = 0; i < 10; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(fx.rawTicks, 15, "the sim half kept its 60Hz cadence straight through its face's draw fault");
  assert.equal(loop.supervisor.faults.length, 1, "one record per faulted draw call — the shipped per-face flip that keeps it from recurring every frame is pinned in main-glue.test.ts");
});

// --- injectFault: the smoke trigger rides the real law path -------------------

test("injectFault is the same law path as a real fault: one record under hook \"inject\", quarantine follows, a second inject adds nothing, an unknown id no-ops, and the quarantined reads stay total (console smoke trigger, AD-24)", () => {
  const entry = { ...gameRegistry.find((e) => e.id === "moon-patrol")!, createPresentation: undefined };
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const attached = attachGameEntries([entry], loop, loop.supervisor, fakeCanvas);
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 6; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(loop.supervisor.faults.length, 0, "healthy before the trigger");
  assert.equal(attached.containment.faultedFor(entry.id), false);
  attached.instances.get(entry.id)!.autoplay(7);
  assert.equal(attached.instances.get(entry.id)!.mode(), "autoplay", "the trigger fires at a NON-attract mode so the no-relaunch pin below can fail");
  attached.containment.injectFault(entry.id, "smoke: dead machine");
  assert.equal(loop.supervisor.faults.length, 1);
  assert.equal(loop.supervisor.faults[0]?.hook, "inject");
  assert.equal(loop.supervisor.faults[0]?.errorId, `${entry.id}.inject#1`);
  assert.equal(loop.supervisor.faults[0]?.message, "smoke: dead machine");
  assert.equal(attached.containment.faultedFor(entry.id), true, "the trigger reaches the SAME faultedFor the seat/scheduler/frame laws read");
  attached.containment.injectFault(entry.id, "second smoke");
  assert.equal(loop.supervisor.faults.length, 1, "quarantine is permanent this story: a second inject adds no second fault");
  attached.containment.injectFault("no-such-game");
  assert.equal(loop.supervisor.faults.length, 1, "injectFault on an unattached id is a no-op, not a throw");
  const q = attached.instances.get(entry.id)!;
  assert.deepEqual(q.snapshot(), {}, "the quarantined instance reads total (a face gate never composites from it anyway)");
  assert.equal(q.stateHash(), stateHashOf({}));
  assert.equal(q.mode(), "autoplay", "mode() stays a pure read — the frozen instance never relaunches to attract (a guard that relaunches after quarantine flips this red)");
  for (let i = 0; i < 20; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(loop.tickCount, 26, "the room keeps running with the game quarantined");
  assert.equal(loop.supervisor.faults.length, 1);
});

// --- DW-3: the long broken run stays bounded ---------------------------------

test("long broken run stays bounded: the quarantined game contributes exactly ONE record, the fault ring keeps the newest MAX_FAULT_RECORDS and counts the rest in droppedFaults, and the errorId counter keeps rising gap-free (DW-3, AD-26)", () => {
  const logged: string[] = [];
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms, onFault: (e) => logged.push(e.errorId) });
  const dead = fxSim({ throwAt: 2 });
  const attached = attachGameEntries(
    [
      { id: "quarantined", seed: 4, createSim: dead.factory },
      { id: "silent", seed: 6, createSim: fxSim().factory },
    ],
    loop,
    loop.supervisor,
    fakeCanvas,
  );
  loop.addSystem("noisy", () => {
    throw new Error("always-throwing system");
  });
  const step1 = ticking(loop, clock);
  for (let i = 0; i < 600; i++) {
    step1();
    loop.drainEvents();
  }
  assert.equal(loop.tickCount, 600, "the room survived the whole broken run");
  assert.equal(attached.containment.faultedFor("quarantined"), true);
  assert.equal(logged.length, 601, "every fault (1 game + 600 system) reached its onFault consumer, even the ring-dropped ones");
  assert.equal(logged.filter((id) => id.startsWith("quarantined.")).length, 1, "the quarantined game speaks exactly once in the whole run (DW-3: quarantine is why the ring stays honest)");
  const ring = loop.supervisor.faults;
  assert.equal(ring.length, MAX_FAULT_RECORDS, "the ring never grows past the cap (mutation: dropping the ring trim leaves 601 records here)");
  assert.equal(loop.supervisor.droppedFaults, 601 - MAX_FAULT_RECORDS, "the overflow is counted, never silently lost");
  assert.equal(ring[0]?.errorId, `core.system.noisy.tick#${601 - MAX_FAULT_RECORDS + 1}`, "the ring keeps the MOST RECENT records");
  assert.equal(ring[ring.length - 1]?.errorId, "core.system.noisy.tick#601", "the errorId counter never caps — ids stay deterministic and gap-free (AD-26 fault-match basis)");
});

// --- the 1.6 drain law survives the new boot wiring ---------------------------

test("the shipped boot wiring drains once per tick (1.6 closure regression): attachGameEntries + a patrons-system drain over 600 ticks keep the loop's event queue empty between systems while the beats keep arriving", () => {
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const entry = { ...gameRegistry.find((e) => e.id === "moon-patrol")!, createPresentation: undefined };
  const attached = attachGameEntries(
    [{ id: "beats", seed: 5, createSim: fxSim({ beatEvery: 5 }).factory }, entry],
    loop,
    loop.supervisor,
    fakeCanvas,
  );
  let drained = 0;
  loop.addSystem("patrons", () => {
    drained += loop.drainEvents().length; // the patrons system's drain leg, once per tick
  });
  const step1 = ticking(loop, clock);
  for (let tick = 1; tick <= 600; tick++) {
    step1();
    assert.deepEqual(loop.drainEvents(), [], `the queue is empty after the patrons system every tick (tick ${loop.tickCount})`);
  }
  assert.ok(drained >= 120, `the mini's beats (every 5 ticks) rode the channel — the drain is not vacuously empty (got ${drained})`);
  assert.equal(loop.supervisor.faults.length, 0);
  assert.equal(attached.containment.faultedFor(entry.id), false);
});

// --- healthy-boot regression on the real wiring (AC6) -------------------------

test("healthy regression on the guarded boot wiring: attach + seat + scheduler on the real registry run 3 attract cycles with ZERO faults — the dwell launch reaches the GUARDED autoplay and the wrapper hash advances every cycle (AC6)", () => {
  const entry = { ...gameRegistry.find((e) => e.id === "moon-patrol")!, createPresentation: undefined };
  const cabinets = createCabinetRuntime();
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const attached = attachGameEntries([entry], loop, loop.supervisor, fakeCanvas);
  const instance = attached.instances.get(entry.id)!;
  const tickInput = attached.instanceInputs.get(entry.id)!;
  const input = createInputService({ requestPointerLock: () => {} });
  input.pointerLockChanged(true);
  const presenter = createFigurePresenter();
  // main.ts's wiring shape, fault predicates included: both see only the
  // deferred containment read (BusyGate idiom).
  const seat = createSeatService({
    player,
    cabinets,
    busy: {
      busyFor: (volumeId) => scheduler.busyFor(volumeId),
      toggleWait: (volumeId) => scheduler.toggleWait(volumeId),
    },
    faultedFor: (gameId) => attached.containment.faultedFor(gameId),
  });
  seat.track({
    volumeId: "cabinet-B0",
    gameId: entry.id,
    instance,
    input: tickInput,
    controls: entry.controls!,
    keys: MOON_KEYS,
  });
  player.registerInteractable("cabinet-B0", (id) => seat.handleInteract(id));
  const scheduler = createPatronScheduler({
    seat,
    player,
    presenter,
    faultedFor: (gameId) => attached.containment.faultedFor(gameId),
  });
  scheduler.track({
    volumeId: "cabinet-B0",
    gameId: entry.id,
    instance,
    seed: entry.seed!,
    impulses: entry.impulses!,
  });
  // AD-23 registration order (player, cabinets-less here, patrons, seat).
  loop.addSystem("player", () => player.step(1, seat.playerView(input.takeView())));
  const patronsRecords: EventRecord[] = [];
  loop.addSystem("patrons", () => {
    const drained = loop.drainEvents();
    patronsRecords.length = 0;
    patronsRecords.push(...drained);
    presenter.step(loop.tickCount);
    scheduler.dispatch(patronsRecords, loop.tickCount);
  });
  loop.addSystem("seat", () => seat.step(input.takeCodeView(), patronsRecords));
  const step1 = ticking(loop, clock);
  const hashes: string[] = [];
  for (let tick = 1; tick <= 3 * CABINET_PHASE_CYCLE_TICKS + 1; tick++) {
    step1();
    if (tick % CABINET_PHASE_CYCLE_TICKS === 0) hashes.push(instance.stateHash());
  }
  assert.equal(loop.supervisor.faults.length, 0, "a healthy guarded run records NOTHING — no stall, no quarantine, no boot faults (AC6)");
  assert.equal(attached.containment.faultedFor(entry.id), false);
  const busy = scheduler.state().cabinets.find((c) => c.volumeId === "cabinet-B0")!;
  assert.equal(busy.occupancy, "patron-autoplay", "the dwell launch ran THROUGH the guard (autoplay is a supervisor-wrapped hook now)");
  assert.equal(busy.runCount, 1);
  assert.equal(instance.mode(), "autoplay");
  assert.equal(scheduler.figureActive("cabinet-B0"), true, "the Patron stands at the machine the whole healthy run");
  assert.equal(hashes.length, 3);
  assert.notEqual(hashes[0], hashes[1], "every instance's wrapper hash advances per attract cycle (also across the launch)");
  assert.notEqual(hashes[1], hashes[2]);
  assert.equal(seat.state().seated, false, "and the seat law stayed on the healthy path (visitor never walked up)");
});

// --- AC5's paint half: the fallback face keeps moving -------------------------
// This pins the REUSED 1.4 painter's liveness law (the AC5 paint-half claim)
// against the real cabinets runtime + real repaintScreen: a face routed to
// this painter never freezes. The shipped gate that routes a faulted face
// into it lives in core/main.ts frame() and is pinned in main-glue.test.ts
// (the 1.7 containment-wiring tier), together with the paint-step args —
// the painter code itself is the shipped 1.4 one, not a replica.

test("the fallback face keeps moving across 720 ticks (AC5's paint half): the cabinets phase law advances the paint step and repaintScreen's frames change at every step — no dead look, deterministic per step", () => {
  const ops: string[] = [];
  const ctx: PaintContext = {
    fillStyle: "",
    font: "",
    textAlign: "",
    letterSpacing: "",
    fillRect(x, y, w, h) {
      ops.push(`${String(ctx.fillStyle)}|${x},${y},${w},${h}`);
    },
    fillText(text, x, y) {
      ops.push(`text:${text},${x},${y}`);
    },
    measureText(t) {
      const m = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font));
      return { width: t.length * 0.92 * Number(m?.[1] ?? 0) };
    },
  };
  const surface: PaintSurface = {
    width: Math.round(SHELL.screen.width * SURFACE_PX_PER_M),
    height: Math.round(SHELL.screen.height * SURFACE_PX_PER_M),
    getContext: (kind) => (kind === "2d" ? ctx : null),
  };
  const p = cabinetPlacements[0]!;
  const runtime = createCabinetRuntime();
  const bandFrames: number[][] = [];
  let lastPaintStep = -1;
  for (let tick = 0; tick < 720; tick++) {
    // main.ts's fallback legs for a faulted face, headless: the cabinets
    // system advances the phase IN the tick, and the paint-step gate
    // repaints the face at the new step (the 1.4 liveness law, reused).
    stepCabinetPhase(runtime, 1);
    const paintStep = screenPaintStep(runtime);
    if (paintStep !== lastPaintStep) {
      lastPaintStep = paintStep;
      ops.length = 0;
      repaintScreen(surface, p.screenZones, paintStep, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.height);
      bandFrames.push(ops.filter((o) => o.startsWith("#5bc8ff|")).map((o) => Number(o.split("|")[1]!.split(",")[1])));
    }
  }
  assert.equal(bandFrames.length, 1 + 720 / SCREEN_PAINT_STEP_TICKS, "the gate opened at the first step (0) and once per paint step after — three full phase cycles of repaints across 720 ticks");
  for (let i = 1; i < bandFrames.length; i++) {
    assert.notDeepEqual(bandFrames[i], bandFrames[i - 1], `sampled frame ${i} differs from frame ${i - 1} — the fallback repaint keeps advancing, across the cycle wraps too (the face never freezes into a dead loop)`);
  }
  const cycleFrames = CABINET_PHASE_CYCLE_TICKS / SCREEN_PAINT_STEP_TICKS;
  assert.deepEqual(bandFrames[0], bandFrames[cycleFrames], "the same paint step paints the identical frame (tick-derived determinism, not wall-clock jitter)");
});
