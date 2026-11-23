// AC4 pinning: the contract wrapper — seeded rng injection, tick(dt,input) ->
// events() protocol, mode switches, wrapper-computed stateHash(), and the
// between-tick write window (AD-2/3/4/5/6/8/15; I/O matrix rows 1,2,3).
import test from "node:test";
import assert from "node:assert/strict";
import { createGameInstance, type SimContext, type SimHooks } from "./wrapper.ts";
import { math as contractMath } from "./index.ts";
import { createRng } from "./rng.ts";

/** Fixture sim: pushes one rng roll per tick into history; plain snapshot. */
function historySim(seed: number) {
  return createGameInstance((ctx) => {
    const state = ctx.gated({ n: 0, history: [] as number[] });
    let out: Array<{ type: string; payload: unknown }> = [];
    const hooks: SimHooks = {
      tick(_dt, input) {
        state.n += 1;
        state.history.push(ctx.rng.uniform());
        if (input.controls && "fire" in input.controls) out.push({ type: "roundBreak", payload: { tick: state.n } });
      },
      events() {
        const pulled = out;
        out = [];
        return pulled;
      },
      snapshot() {
        return { n: state.n, history: state.history, rng: ctx.rng.getState() };
      },
    };
    return hooks;
  }, seed);
}

test("same seed, two independent headless runs: identical stateHash sequence and event lists", () => {
  const a = historySim(99);
  const b = historySim(99);
  let eventTotal = 0;
  for (let i = 0; i < 10; i++) {
    const controls = i % 3 === 2 ? { fire: { down: true, pressed: true } } : {};
    a.tick(1 / 60, { controls });
    b.tick(1 / 60, { controls });
    assert.equal(a.stateHash(), b.stateHash(), `tick ${i}`);
    const evsA = a.events();
    assert.deepEqual(evsA, b.events(), `events at tick ${i}`);
    eventTotal += evsA.length;
  }
  assert.ok(eventTotal > 0); // the twins compared NON-EMPTY event lists, not just empty ones
  assert.notEqual(a.stateHash(), historySim(100).stateHash());
});

test("rng cursor round-trip: snapshot carries plain numbers; restore replays exactly", () => {
  const a = historySim(555);
  for (let i = 0; i < 5; i++) a.tick(1 / 60, { controls: {} });
  const snap = a.snapshot() as { history: number[]; rng: number[] };
  assert.equal(snap.history.length, 5);
  assert.deepEqual(snap.rng.map((w) => typeof w), ["number", "number", "number", "number"]);

  // Restored run: fresh instance whose sim restores the cursor before each
  // continuation - reproduces the remaining values exactly.
  const b = createGameInstance((ctx: SimContext) => {
    const state = ctx.gated({ history: [] as number[] });
    let restored = false;
    return {
      tick() {
        if (!restored) {
          ctx.rng.restore(snap.rng);
          restored = true;
        }
        state.history.push(ctx.rng.uniform());
      },
      events: () => [],
      snapshot: () => ({ history: state.history }),
    };
  }, 0);
  for (let i = 0; i < 3; i++) b.tick(1 / 60, { controls: {} });
  const cont = (b.snapshot() as { history: number[] }).history;

  const expected: number[] = [];
  const ref = createRng(555);
  for (let i = 0; i < 5; i++) ref.uniform();
  for (let i = 0; i < 3; i++) expected.push(ref.uniform());
  assert.deepEqual(cont, expected);
});

test("dt must be exactly 1/60; input carries exactly the controls field", () => {
  const a = historySim(1);
  assert.throws(() => a.tick(1 / 50, { controls: {} }), TypeError);
  assert.throws(() => a.tick(1 / 60, { controls: {}, extra: 1 } as never), TypeError);
  assert.throws(() => a.tick(1 / 60, {} as never), TypeError);
  a.tick(1 / 60, { controls: {} }); // the legal shape ticks fine
});

test("events are plain data {type,payload}; non-plain payloads are rejected", () => {
  const a = historySim(3);
  a.tick(1 / 60, { controls: { fire: { down: true, pressed: true } } });
  const evs = a.events();
  assert.equal(evs.length, 1);
  assert.equal(evs[0]!.type, "roundBreak");
  assert.deepEqual(evs[0]!.payload, { tick: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(evs[0])), evs[0]); // verbatim plain data
  assert.deepEqual(a.events(), []); // queue drained per protocol

  const bad = createGameInstance(() => ({
    tick: () => {},
    events: () => [{ type: "x", payload: { fn: () => 0 } }],
    snapshot: () => ({}),
  }));
  bad.tick(1 / 60, { controls: {} });
  assert.throws(() => bad.events(), TypeError);
});

test("out-of-tick write through a held state ref throws TypeError", () => {
  let stolen: { x: number } | undefined;
  const a = createGameInstance((ctx) => {
    const state = ctx.gated({ x: 0 });
    stolen = state;
    return { tick: () => { state.x += 1; }, events: () => [], snapshot: () => ({ x: state.x }) };
  }, 7);
  a.tick(1 / 60, { controls: {} });
  assert.throws(() => {
    (stolen as { x: number }).x = 99;
  }, TypeError);
  assert.deepEqual(a.snapshot(), { x: 1 }); // the failed write changed nothing
});

test("the gated() seam clones: a held RAW original cannot write into sim state (AD-15)", () => {
  const raw = { x: 0, inner: { y: 0 } };
  const a = createGameInstance((ctx) => {
    const state = ctx.gated(raw);
    return {
      tick: () => {
        state.x += 1;
      },
      events: () => [],
      snapshot: () => ({ x: state.x, inner: state.inner }),
    };
  }, 1);
  a.tick(1 / 60, { controls: {} });
  raw.x = 99; // legal JS, but aliases nothing in the gated tree anymore
  raw.inner.y = 7;
  assert.deepEqual(a.snapshot(), { x: 1, inner: { y: 0 } });
});

test("gate-closed call sites: state writes inside events()/attract()/autoplay() throw (AD-15)", () => {
  const a = createGameInstance((ctx) => {
    const state = ctx.gated({ n: 0 });
    return {
      tick: () => {
        state.n += 1;
      },
      events() {
        state.n += 1; // mutating during events() is out-of-tick mutation
        return [];
      },
      snapshot: () => ({ n: state.n }),
    };
  }, 1);
  a.tick(1 / 60, { controls: {} });
  assert.throws(() => a.events(), /outside the tick window/);

  const b = createGameInstance((ctx) => {
    const state = ctx.gated({ n: 0 });
    return {
      tick: () => {
        state.n += 1;
      },
      events: () => [],
      snapshot: () => ({ n: state.n }),
      attract: () => {
        state.n = 99;
      },
      autoplay: () => {
        state.n = 123;
      },
    };
  }, 1);
  b.tick(1 / 60, { controls: {} });
  assert.throws(() => b.attract(), TypeError);
  assert.throws(() => b.autoplay(5), TypeError);
  assert.equal(b.mode(), "attract"); // autoplay threw before the mode flip
  assert.deepEqual(b.snapshot(), { n: 1 }); // no gate-closed call site moved state
});

test("mode switches: attract() and autoplay(seed) are kernel-driven one-shots", () => {
  let attractCalls = 0;
  let receivedSeed = Number.NaN;
  let lastDraw = Number.NaN;
  const a = createGameInstance((ctx) => ({
    tick: () => {
      lastDraw = ctx.rng.uniform();
    },
    events: () => [],
    snapshot: () => ({}),
    attract: () => {
      attractCalls += 1;
    },
    autoplay: (seed: number) => {
      receivedSeed = seed;
    },
  }), 1);
  assert.equal(a.mode(), "attract");
  a.attract();
  assert.equal(attractCalls, 1);
  assert.equal(a.mode(), "attract");
  a.autoplay(4242);
  assert.equal(receivedSeed, 4242);
  assert.equal(a.mode(), "autoplay");
  a.tick(1 / 60, { controls: {} });
  assert.equal(lastDraw, createRng(4242).uniform()); // autoplay re-seeded the instance rng
});

test("play(seed) re-arms the instance rng exactly like autoplay (Story 1.5 provisional seam, AC4)", () => {
  // The seat hands a visitor start over through play(seed); if the wrapper
  // skipped rng.reseed here, the sim would keep the OLD rng stream and the
  // "same seed, same run" law would silently differ between autoplay and play.
  let lastDraw = Number.NaN;
  let receivedSeed = Number.NaN;
  const a = createGameInstance((ctx) => ({
    tick: () => {
      lastDraw = ctx.rng.uniform();
    },
    events: () => [],
    snapshot: () => ({}),
    play: (seed: number) => {
      receivedSeed = seed;
    },
  }), 1);
  a.tick(1 / 60, { controls: {} });
  const stale = lastDraw;
  a.play(31337);
  assert.equal(receivedSeed, 31337);
  assert.equal(a.mode(), "play");
  a.tick(1 / 60, { controls: {} });
  assert.notEqual(lastDraw, stale, "the play seed re-arms the instance rng");
  assert.equal(lastDraw, createRng(31337).uniform(), "the draw stream restarts at the handed-over seed");
});

test("ctx.math seam: the wrapper injects the Core math module at instantiation (AD-4)", () => {
  // The sim never imports core/contract (spine diagram: no SIM→CONTRACT edge);
  // ctx.math is the sanctioned channel for the deterministic transcendentals.
  const a = createGameInstance((ctx) => {
    const state = ctx.gated({ s: 0 });
    return {
      tick: () => {
        state.s = ctx.math.sin(0.5);
      },
      events: () => [],
      snapshot: () => ({ s: state.s }),
    };
  }, 1);
  a.tick(1 / 60, { controls: {} });
  assert.equal((a.snapshot() as { s: number }).s, 0.479425538604203); // same golden math.test.ts pins
  assert.equal(contractMath.sin(0.5), 0.479425538604203); // and it is the same module the goldens pin
});

test("the per-tick input view is frozen: a write back into controls throws (AD-16 kernel-owned input)", () => {
  const a = createGameInstance(() => ({
    tick(_dt, input) {
      (input.controls as { axis: number }).axis = 99; // the sim may not write kernel-owned input
    },
    events: () => [],
    snapshot: () => ({}),
  }), 1);
  const kernelInput = { controls: { axis: 0.5 } };
  assert.throws(() => a.tick(1 / 60, kernelInput), TypeError);
  assert.deepEqual(kernelInput, { controls: { axis: 0.5 } }); // the clone insulated the kernel's object
  let secondAxis = Number.NaN;
  const b = createGameInstance(() => ({
    tick(_dt, input) {
      secondAxis = input.controls.axis as number;
    },
    events: () => [],
    snapshot: () => ({}),
  }), 1);
  b.tick(1 / 60, kernelInput);
  b.tick(1 / 60, kernelInput); // the same kernel object is legal twice: fresh view per tick
  assert.equal(secondAxis, 0.5);
});

test("stateHash() is wrapper-computed, never the game's own value", () => {
  const a = createGameInstance(() => ({
    tick: () => {},
    events: () => [],
    snapshot: () => ({ v: 1 }),
    // A game trying to hand-roll its hash is ignored by the wrapper (lint-red per AD-5).
    stateHash: () => "deadbeefdeadbeef",
  } as never));
  assert.match(a.stateHash(), /^[0-9a-f]{16}$/);
  assert.notEqual(a.stateHash(), "deadbeefdeadbeef");
});
