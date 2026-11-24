// The contract wrapper (AD-2, AD-5, AD-8): the one sanctioned shared seam.
// The wrapper instantiates a sim factory with an injected seeded rng, the
// deterministic math module (AD-4), and the write-gated state surface, opens
// the tick window only around sim.tick() (AD-15), pulls the per-tick event
// list, and computes stateHash() itself — a game's own stateHash is lint-red
// at L0 (Epic 3); here the wrapper is the only hasher.

import { createRng, type Rng } from "./rng.ts";
import * as mathModule from "./math.ts";
import { createGate, gateDeep, toPlain } from "./freeze.ts";
import { stateHashOf } from "./hash.ts";

export interface TickInput {
  /** Declared control slots only (AD-7/AD-16): the input carries nothing else. */
  controls: Record<string, unknown>;
}

export interface SimEvent {
  type: string;
  payload: unknown;
}

/** Context the wrapper injects at instantiation — the sim never seeds itself. */
export interface SimContext {
  rng: Rng;
  /** Core deterministic math module (AD-4): the sim imports no engine transcendentals. */
  math: typeof mathModule;
  /** Create gate-checked state: every mutation goes through the tick window. */
  gated<T extends object>(state: T): T;
}

/** The verbatim sim-half hooks (AD-8; attract/autoplay/play may be absent). */
export interface SimHooks {
  tick(dt: number, input: TickInput): void;
  events(): SimEvent[];
  snapshot(): unknown;
  attract?(): void;
  autoplay?(seed: number): void;
  /** PROVISIONAL (Story 1.5): visitor-seated start (AD-23). The kernel seats
   * the visitor and hands over the seed; the sim (re)builds its play world
   * from it. The 1.6 scheduler will own WHO may sit down — the hook shape
   * itself is stable. */
  play?(seed: number): void;
}

export type SimFactory = (ctx: SimContext) => SimHooks;

/** A canvas the presentation may paint on — the narrow shape a browser
 * HTMLCanvasElement already satisfies; the kernel never inspects it beyond
 * width/height (the composite reads its size, Story 1.5). */
export interface GameCanvasLike {
  width: number;
  height: number;
  // The presentation may pass 2D-context options (the adapter asks for
  // alpha:false); a kernel canvas that ignores them is still conforming.
  getContext(kind: "2d", options?: unknown): unknown;
}

/** The presentation-half hooks (AD-2/AD-11): the kernel feeds drawFrame the
 * instance snapshot and forwards each emitted event; the presentation owns
 * its canvas and never touches loop/tick state. */
export interface PresentationHooks {
  canvas: GameCanvasLike;
  drawFrame(snapshotView: unknown): void;
  onEvent?(event: SimEvent): void;
}

/** Presentation factory: the kernel provides canvas creation (the entry's
 * sim-view size comes from the presentation itself); the presentation never
 * reaches for document.createElement. */
export type PresentationFactory = (opts: {
  makeCanvas: (width: number, height: number) => GameCanvasLike;
}) => PresentationHooks;

/** The declared control vocabulary of one game (AD-7/AD-16): the kernel maps
 * raw device input onto exactly these slots — nothing else reaches the sim. */
export interface GameControls {
  vocab: number;
  axes: string[];
  buttons: string[];
  aim: string[];
}

/** One entry of the build-generated game registry (AD-11, provisional list). */
export interface GameRegistryEntry {
  id: string;
  seed?: number;
  createSim: SimFactory;
  /** Presentation half, when the entry ships one (Story 1.5): the kernel
   * composites its canvas into the cabinet screen. */
  createPresentation?: PresentationFactory;
  /** Control vocabulary this game accepts; presence is what makes the seat
   * service route raw keys to this instance (Story 1.5). */
  controls?: GameControls;
  /** Authored event->reaction map (AD-23, Story 1.6): sim event types to
   * kernel reaction-library names. The generator embeds the parsed asset
   * (sealed build data — the mapping is never fetched at runtime), and
   * validates every value against the library (tools/gen-registry.mjs). */
  impulses?: Record<string, string>;
}

/** Kernel-owned instance modes; "play" (visitor-seated, AD-23) is set by the
 * seat service through instance.play(seed) — Story 1.5 opened that seam. */
export type InstanceMode = "attract" | "autoplay" | "play";

export interface GameInstance {
  tick(dt: number, input: TickInput): void;
  events(): SimEvent[];
  snapshot(): unknown;
  /** Wrapper-computed over snapshot() (AD-5). */
  stateHash(): string;
  attract(): void;
  autoplay(seed: number): void;
  play(seed: number): void;
  mode(): InstanceMode;
}

// Per-tick immutable view of the kernel's input: the sim receives a deep-
// frozen plain clone, so a write back into controls throws TypeError instead
// of silently persisting into the next tick (AD-16: input is kernel-owned).
function deepFreezePlain(value: unknown): unknown {
  if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) deepFreezePlain(v);
    Object.freeze(value);
  }
  return value;
}

export function createGameInstance(createSim: SimFactory, seed: number): GameInstance {
  const gate = createGate();
  const rng = createRng(seed);
  const sim = createSim({
    rng,
    math: mathModule,
    // Clone at the seam: the sim's own raw reference must not alias the gated
    // target, or out-of-window writes through it would bypass the gate (AD-15).
    gated: <T extends object>(state: T): T => gateDeep(structuredClone(state), gate),
  });
  let mode: InstanceMode = "attract";

  // AD-15: the tick window opens ONLY around sim.tick(). events(), snapshot(),
  // attract() and autoplay() run gate-closed — pulling events or switching
  // modes is never a mutation opportunity ("no sim-state mutation outside
  // tick()", spine AD-15; docs/game-authoring.md keeps setup rng-free too).
  function kernelWindow<R>(call: () => R): R {
    gate.open();
    try {
      return call();
    } finally {
      gate.close();
    }
  }

  function validateEvents(): SimEvent[] {
    const raw = sim.events();
    if (!Array.isArray(raw)) throw new TypeError("events() must return an array of {type, payload}");
    return raw.map((ev) => {
      if (typeof ev !== "object" || ev === null) throw new TypeError("event must be a plain object");
      if (typeof ev.type !== "string" || ev.type === "") throw new TypeError("event.type must be a non-empty string");
      return { type: ev.type, payload: toPlain(ev.payload) };
    });
  }

  function takeSnapshot(): unknown {
    return toPlain(sim.snapshot()); // reads are always legal; no window needed
  }

  return {
    tick(dt, input) {
      if (dt !== 1 / 60) {
        throw new TypeError(`tick dt must be exactly 1/60 tick units, got ${String(dt)}`);
      }
      if (
        typeof input !== "object" ||
        input === null ||
        Object.keys(input).length !== 1 ||
        typeof input.controls !== "object" ||
        input.controls === null
      ) {
        throw new TypeError("tick input must carry exactly one field: controls");
      }
      kernelWindow(() => sim.tick(dt, deepFreezePlain(structuredClone(input)) as TickInput));
    },
    events() {
      // Gate stays closed: pulling events is never a mutation window (AD-15);
      // a sim that mutates state inside events() gets the gate TypeError.
      return validateEvents();
    },
    snapshot() {
      return takeSnapshot();
    },
    stateHash() {
      return stateHashOf(takeSnapshot());
    },
    attract() {
      sim.attract?.(); // gate-closed: a mode switch may not mutate sim state (AD-15)
      mode = "attract";
    },
    autoplay(seed: number) {
      // The kernel resolves the seed; autoplay re-seeds the instance rng so
      // the run is reproducible without the sim ever choosing its seed.
      // (rng state is the kernel's, not gated sim state.)
      rng.reseed(seed);
      sim.autoplay?.(seed);
      mode = "autoplay";
    },
    play(seed: number) {
      // Same seed law as autoplay (Story 1.5, AD-23): the kernel seats the
      // visitor and hands the seed over; gate-closed like every non-tick call.
      rng.reseed(seed);
      sim.play?.(seed);
      mode = "play";
    },
    mode() {
      return mode;
    },
  };
}
