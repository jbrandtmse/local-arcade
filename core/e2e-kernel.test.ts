// QA end-to-end kernel test: the COMPOSED stack — master loop + contract
// wrapper + supervisor + seeded rng — wired exactly as core/main.ts wires the
// build-generated registry (entry.seed ?? 0 -> createGameInstance -> addInstance),
// driven on an injected fake wall clock in this Node process. Pins: a
// multi-instance run is deterministic end-to-end (AC3/AC4; AD-3/4/5), a sim
// faulting mid-run is contained while neighbours keep performing (AC5; AD-15),
// and a backgrounded-tab burst stays bounded with per-tick events intact
// (AC3/AC6; matrix rows 4,5, Integration).
// Needs: no browser and no games/ content; each test builds its own loop,
// instances, and clock, and asserts only on state it created (hermetic).
import test from "node:test";
import assert from "node:assert/strict";
import { createKernelLoop, MAX_CATCHUP_STEPS, type KernelLoop } from "./loop.ts";
import {
  createGameInstance,
  type GameInstance,
  type GameRegistryEntry,
  type SimContext,
  type SimEvent,
} from "./contract/index.ts";

interface MiniOptions {
  /** roundBreak at this tick, gameEnded at 2x this tick. */
  endAt: number;
  /** Optional beat: game-local "tickMark" event every N ticks. */
  beatEvery?: number;
  /** Sim throws inside tick() at this tick (fault fixtures). */
  throwAt?: number;
  /** Sim throws inside events() on every call (fault fixtures). */
  throwEvents?: boolean;
}

// A fixture mini-game in contract shape: gated state, injected rng rolls,
// canonical roundBreak/gameEnded events (AD-6), game-local tickMark events.
function miniSim(opts: MiniOptions) {
  return (ctx: SimContext) => {
    const state = ctx.gated({ t: 0, rolls: [] as number[] });
    let out: SimEvent[] = [];
    let threwOnce = false;
    return {
      tick() {
        if (opts.throwAt !== undefined && !threwOnce && state.t + 1 === opts.throwAt) {
          threwOnce = true;
          throw new Error(`flaky boom at ${opts.throwAt}`);
        }
        state.t += 1;
        if (state.t % 7 === 0) state.rolls.push(ctx.rng.rangeInt(1, 6));
        if (opts.beatEvery !== undefined && state.t % opts.beatEvery === 0) {
          out.push({ type: "tickMark", payload: { t: state.t } });
        }
        if (state.t === opts.endAt) out.push({ type: "roundBreak", payload: { at: opts.endAt } });
        if (state.t === opts.endAt * 2) out.push({ type: "gameEnded", payload: { at: opts.endAt * 2 } });
      },
      events() {
        if (opts.throwEvents) throw new Error("events fault");
        const pulled = out;
        out = [];
        return pulled;
      },
      snapshot() {
        return { t: state.t, rolls: state.rolls, rng: ctx.rng.getState() };
      },
    };
  };
}

// Same wiring core/main.ts performs from the registry: seed defaults to 0 and
// the instance lands on the loop under its entry id.
function wire(loop: KernelLoop, entries: GameRegistryEntry[]): Map<string, GameInstance> {
  const instances = new Map<string, GameInstance>();
  for (const entry of entries) {
    const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
    instances.set(entry.id, instance);
    loop.addInstance(entry.id, instance);
  }
  return instances;
}

interface Frame {
  tick: number;
  events: Array<{ gameId: string; event: SimEvent }>;
  hashes: Record<string, string>;
}

// Runs `frames` frames of `perFrameMs` wall each; after every frame records the
// global tick, the drained per-tick events, and each instance's wrapper hash.
function runFrames(
  loop: KernelLoop,
  instances: Map<string, GameInstance>,
  frames: number,
  perFrameMs: number,
  advance: (ms: number) => void,
): Frame[] {
  const transcript: Frame[] = [];
  for (let f = 0; f < frames; f++) {
    advance(perFrameMs);
    loop.step();
    transcript.push({
      tick: loop.tickCount,
      events: loop.drainEvents().map((r) => ({ gameId: r.gameId, event: r.event })),
      hashes: Object.fromEntries([...instances].map(([id, inst]) => [id, inst.stateHash()])),
    });
  }
  return transcript;
}

function fakeClock() {
  let ms = 0;
  return { now: () => ms, advance: (delta: number) => { ms += delta; } };
}

const ENTRIES: GameRegistryEntry[] = [
  { id: "alpha", seed: 2026, createSim: miniSim({ endAt: 40, beatEvery: 9 }) },
  { id: "beta", seed: 77, createSim: miniSim({ endAt: 30 }) },
];

test("deterministic twin run: two independent composed runs produce identical transcripts", () => {
  const clockA = fakeClock();
  const loopA = createKernelLoop({ now: clockA.now });
  const instA = wire(loopA, ENTRIES);
  const runA = runFrames(loopA, instA, 80, 17, clockA.advance);

  const clockB = fakeClock();
  const loopB = createKernelLoop({ now: clockB.now });
  const instB = wire(loopB, ENTRIES);
  const runB = runFrames(loopB, instB, 80, 17, clockB.advance);

  assert.equal(loopA.tickCount, loopB.tickCount);
  assert.ok(loopA.tickCount >= 80); // both runs cleared the fixture end state
  assert.deepEqual(runA, runB); // identical event lists AND stateHash sequences
  const eventTotal = runA.reduce((n, f) => n + f.events.length, 0);
  assert.ok(eventTotal > 0, "twins compared NON-EMPTY transcripts (canonical roundBreak/gameEnded/tickMark)");
  assert.notEqual(runA[0]!.hashes["alpha"], runA[79]!.hashes["alpha"], "alpha state actually advanced");
  assert.notEqual(runA[79]!.hashes["alpha"], runA[79]!.hashes["beta"], "different games/seeds hash differently");

  // A different seed for alpha diverges somewhere — the determinism is seed-bound.
  const clockC = fakeClock();
  const loopC = createKernelLoop({ now: clockC.now });
  const instC = wire(loopC, [{ ...ENTRIES[0]!, seed: 99 }, ENTRIES[1]!]);
  const runC = runFrames(loopC, instC, 80, 17, clockC.advance);
  const alphaDiverged = runA.some((f, i) => f.hashes["alpha"] !== runC[i]!.hashes["alpha"]);
  assert.ok(alphaDiverged, "seed change must alter the hash sequence");
});

test("sim throws inside tick() mid-run: logged as {tick, errorId}, neighbours and its own events keep flowing", () => {
  const clock = fakeClock();
  const logged: string[] = [];
  const loop = createKernelLoop({ now: clock.now, onFault: (e) => logged.push(`${e.tick}/${e.errorId}`) });
  const instances = wire(loop, [
    { id: "flaky", seed: 5, createSim: miniSim({ endAt: 25, throwAt: 60 }) },
    { id: "steady", seed: 31, createSim: miniSim({ endAt: 50 }) },
  ]);
  const transcript = runFrames(loop, instances, 120, 17, clock.advance);

  assert.ok(loop.tickCount >= 120); // the room never crashed (AD-15)
  assert.deepEqual(logged, ["60/flaky.tick#1"]); // exactly one fault, at the right global tick
  assert.equal(loop.supervisor.faults[0]?.message, "flaky boom at 60");
  const canonical = transcript.flatMap((f) => f.events).filter((e) => e.gameId === "steady");
  assert.deepEqual(canonical.map((e) => e.event.type), ["roundBreak", "gameEnded"]); // at t=50 and t=100
  assert.ok(canonical[1]!.event.type === "gameEnded"); // steady performed past the fault tick
  const flaky = instances.get("flaky")!;
  // every global tick drove its tick site once; the faulting call was not an increment
  assert.equal((flaky.snapshot() as { t: number }).t, loop.tickCount - 1);
  assert.notEqual(transcript[0]!.hashes["steady"], transcript[119]!.hashes["steady"], "steady kept advancing after the fault");
});

test("sim throws inside events() every tick: contained per call site, loop and neighbours alive", () => {
  const clock = fakeClock();
  const loop = createKernelLoop({ now: clock.now });
  const instances = wire(loop, [
    { id: "bad-events", seed: 1, createSim: miniSim({ endAt: 10, throwEvents: true }) },
    { id: "steady", seed: 31, createSim: miniSim({ endAt: 1000, beatEvery: 5 }) },
  ]);
  const transcript = runFrames(loop, instances, 30, 17, clock.advance);

  assert.equal(loop.tickCount, 30); // every step survived the throwing events site
  assert.equal(loop.supervisor.faults.length, 30); // one fault per tick at the events site
  assert.equal(loop.supervisor.faults[0]?.errorId, "bad-events.events#1");
  assert.equal(loop.supervisor.faults[29]?.errorId, "bad-events.events#30");
  assert.equal(loop.supervisor.faults[0]?.hook, "events");
  const steadyEvents = transcript.flatMap((f) => f.events).filter((e) => e.gameId === "steady");
  assert.equal(steadyEvents.length, 6); // beats at t=5,10,15,20,25,30 despite the faulting neighbour
  assert.equal(steadyEvents[0]!.event.type, "tickMark");
});

test("backgrounded-tab burst with instances live: bounded catch-up, per-tick events kept, clean resume", () => {
  const clock = fakeClock();
  const loop = createKernelLoop({ now: clock.now });
  const instances = wire(loop, [
    { id: "steady", seed: 8, createSim: miniSim({ endAt: 1000, beatEvery: 5 }) },
  ]);
  runFrames(loop, instances, 10, 17, clock.advance); // 10 normal frames
  assert.equal(loop.tickCount, 10);

  clock.advance(5000); // 5 s wall gap
  const burst = loop.step(); // one frame must run at most MAX_CATCHUP_STEPS
  assert.equal(burst, MAX_CATCHUP_STEPS);
  assert.equal(loop.tickCount, 15); // sim time = tick count after the burst
  const kept = loop.drainEvents();
  assert.deepEqual(
    kept.map((r) => ({ id: r.gameId, tick: r.tick, type: r.event.type })),
    [{ id: "steady", tick: 15, type: "tickMark" }],
  ); // the only beat in ticks 11..15 is t=15, tagged with its own tick and game

  const resume = runFrames(loop, instances, 1, 17, clock.advance); // leftover delta dropped
  assert.equal(loop.tickCount, 16); // one ordinary tick, no 290-tick backlog
  assert.deepEqual(resume[0]!.events, []); // no beat at t=16
});
