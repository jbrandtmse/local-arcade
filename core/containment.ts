// Story 1.7 (AD-15): the containment seam — one module, three parts.
//
// 1. attachGameEntries — the boot body MOVED out of core/main.ts: every
//    factory call (createSim, createPresentation) goes through
//    supervisor.invoke under hook "boot" (DW-2: one throwing factory never
//    kills the page; the surviving entries attach, the broken one registers
//    no instance/presentation).
// 2. guardInstance — a decorator over the untouched contract wrapper's
//    GameInstance (AD-8 hooks verbatim): every kernel→sim call passes
//    through supervisor.invoke under that gameId, and the FIRST sim-side
//    fault quarantines the game — afterwards tick/attract/autoplay/play
//    no-op, events() returns [], snapshot() returns {}, stateHash() the
//    wrapper hash of {} (computed once). Quarantine is why the fault ring
//    stays honest (DW-3): a broken sim stops being hammered 60x/s.
//    Presentation (draw) faults flip ONLY that face in main.ts — the two
//    halves fault independently; the guard never sees a draw fault.
// 3. The stateHash-stall watcher lives inside the guard: every `cycleTicks`
//    (= CABINET_PHASE_CYCLE_TICKS, the one attract-cycle source in the
//    codebase) guarded-tick calls it samples the wrapper stateHash; N
//    consecutive equal samples (= MAX_STALL_CYCLES, labelled placeholder —
//    the spine defers the real numbers to M2/Epic 3) synthesize ONE fault
//    via supervisor.invoke under hook "stall" and quarantine (the dev
//    dead-machine predicate, FR-17 L1 precursor / CAP-7). The watcher
//    counts guarded ticks — sim time, never wall clock (AD-3) — and stops
//    once faulted.
//
// injectFault is the arcadeDebug smoke trigger: it records a real fault
// through the same chain (hook "inject"), so the lead's browser smoke
// exercises the exact same law path as a real fault — console-only, zero
// UI (UX-DR18, AD-24). Quarantine is permanent this story: a second
// injectFault adds no second fault.
//
// Fault records stamp loop.tickCount — every guard site pulls the tick from
// the injected tickCount closure, never wall clock (AD-3). Boot faults stamp
// the loop's tick at attach time (0 before start). core/loop.ts is UNCHANGED
// (the Never): the loop's own fault tolerance for RAW instances and its
// fault-family pins stay loop-level truth; quarantine lives in this guard.
// This module imports core/contract, core/supervisor, and the room's
// attract-cycle constant — no loop import (the loop is handed in as a
// narrow structural sink KernelLoop satisfies).

import {
  createGameInstance,
  stateHashOf,
  type GameCanvasLike,
  type GameInstance,
  type GameRegistryEntry,
  type PresentationHooks,
  type SimEvent,
  type TickInput,
} from "./contract/index.ts";
import { type HookName, type Supervisor } from "./supervisor.ts";
import { CABINET_PHASE_CYCLE_TICKS } from "./room/cabinets.ts";

/** Dev-surface stall threshold — LABELLED PLACEHOLDER (like
 * MAX_FAULT_RECORDS: the spine keeps numeric thresholds Deferred; the AC
 * itself mandates a placeholder N here). Consecutive equal stateHash
 * samples before the watcher synthesizes its "stall" fault. */
export const MAX_STALL_CYCLES = 3;

/** The loop slice the seam needs — the real KernelLoop satisfies this
 * structurally; keeping it narrow means containment never imports (or
 * depends on) core/loop.ts. */
export interface ContainmentLoopSink {
  addInstance(id: string, instance: GameInstance, input?: TickInput): void;
  readonly tickCount: number;
}

export interface GuardOptions {
  /** Sim-time source for fault records: the loop's tickCount, read at CALL
   * time (deferred-closure idiom, like 1.6's BusyGate — AD-3). */
  tickCount: () => number;
  /** Attract cycle the watcher samples on (default: CABINET_PHASE_CYCLE_TICKS). */
  cycleTicks?: number;
  /** Stall threshold (default: MAX_STALL_CYCLES placeholder). */
  stallCycles?: number;
}

export interface GameGuard {
  /** The decorated instance — register THIS with the loop/seat/scheduler. */
  readonly instance: GameInstance;
  /** True from the first sim-side fault (or synthesized stall) onward. */
  faulted(): boolean;
  /** arcadeDebug smoke trigger: records one real fault under hook "inject"
   * and quarantines (same law path as a real fault). No-op once faulted —
   * a second inject adds no second fault. */
  injectFault(message?: string): void;
}

/** Decorate a wrapper GameInstance with per-game attribution + quarantine
 * (Rule 2: a decorator over the existing interface, not a reimplementation
 * — the AD-8 hooks pass through verbatim, contract semantics unchanged). */
export function guardInstance(
  instance: GameInstance,
  supervisor: Supervisor,
  gameId: string,
  opts: GuardOptions,
): GameGuard {
  const cycleTicks = opts.cycleTicks ?? CABINET_PHASE_CYCLE_TICKS;
  const stallCycles = opts.stallCycles ?? MAX_STALL_CYCLES;
  // Post-quarantine safe reads (Design Notes 8): the face never composites
  // from a quarantined instance anyway — {} + its wrapper hash computed
  // ONCE keep every consumer total.
  const emptyHash = stateHashOf({});
  let faulted = false;
  let guardedTicks = 0;
  let lastHash: string | null = null;
  let equalSamples = 0;

  /** One supervisor-wrapped kernel→sim call under this gameId. A fault
   * lands as exactly one record and sets the quarantine; the call site
   * gets the safe (quarantined) value instead. */
  function live<R>(hook: HookName, call: () => R, whenFaulted: R): R {
    if (faulted) return whenFaulted;
    const result = supervisor.invoke({ tick: opts.tickCount(), gameId, hook, call });
    if (!result.ok) faulted = true;
    return result.ok ? (result.value as R) : whenFaulted;
  }

  const guarded: GameInstance = {
    tick(dt, input) {
      if (faulted) return; // DW-3: the hammering stops at the first fault
      live<void>("tick", () => instance.tick(dt, input), undefined);
      if (faulted) return;
      guardedTicks += 1;
      if (guardedTicks % cycleTicks !== 0) return;
      // AC4: the dev dead-machine predicate — an attract cycle whose
      // wrapper stateHash equals the previous cycle's is one stall sample.
      const hash = live<string>("stateHash", () => instance.stateHash(), emptyHash);
      if (faulted) return; // a throwing snapshot quarantines; the watcher stops
      equalSamples = lastHash !== null && hash === lastHash ? equalSamples + 1 : 1;
      lastHash = hash;
      if (equalSamples < stallCycles) return;
      supervisor.invoke({
        tick: opts.tickCount(),
        gameId,
        hook: "stall",
        call: () => {
          throw new Error(
            `stateHash unchanged for ${stallCycles} attract cycles (${stallCycles * cycleTicks} ticks) — dead machine (AD-15)`,
          );
        },
      });
      faulted = true; // same quarantine + fallback posture as a real fault
    },
    events: () => live<SimEvent[]>("events", () => instance.events(), []),
    snapshot: () => live<unknown>("snapshot", () => instance.snapshot(), {}),
    stateHash: () => (faulted ? emptyHash : live<string>("stateHash", () => instance.stateHash(), emptyHash)),
    attract: () => live<void>("attract", () => instance.attract(), undefined),
    autoplay: (seed) => live<void>("autoplay", () => instance.autoplay(seed), undefined),
    play: (seed) => live<void>("play", () => instance.play(seed), undefined),
    mode: () => instance.mode(), // pure read of wrapper mode state — no sim call
  };

  return {
    instance: guarded,
    faulted: () => faulted,
    injectFault(message = `injected fault (${gameId})`) {
      if (faulted) return; // quarantine already holds — no second record
      supervisor.invoke({
        tick: opts.tickCount(),
        gameId,
        hook: "inject",
        call: () => {
          throw new Error(message);
        },
      });
      faulted = true;
    },
  };
}

/** The per-room containment handle (main.ts's arcadeDebug.containment):
 * reads the per-game quarantine for the scheduler/seat laws and the frame
 * face gate, and carries the injectFault smoke trigger. */
export interface Containment {
  faultedFor(gameId: string): boolean;
  injectFault(gameId: string, message?: string): void;
}

export interface AttachResult {
  containment: Containment;
  /** Guarded instances, keyed by entry id (absent for a boot-faulted sim). */
  instances: Map<string, GameInstance>;
  /** The kernel-owned TickInput per attached instance (seat writes mapped
   * controls into these; main.ts hands them to the loop). */
  instanceInputs: Map<string, TickInput>;
  /** Presentation halves that made it through their boot guard. */
  presentations: Map<string, PresentationHooks>;
}

/** The boot body, moved out of main.ts (Rule 2: one call site remains).
 * Every factory runs under hook "boot"; a fault leaves the entry
 * unattached — the 1.5 track gates already degrade untracked cabinets, and
 * faultedFor keeps the face on the 1.4 fallback painter + coin-door law.
 * A throwing sim factory means the presentation half is not created either
 * (the entry registers no instance/presentation); a throwing presentation
 * factory keeps the sim ticking with the fallback face (matrix rows 1-2).
 * attach never rethrows (AC3). */
export function attachGameEntries(
  entries: readonly GameRegistryEntry[],
  loop: ContainmentLoopSink,
  supervisor: Supervisor,
  makeCanvas: (width: number, height: number) => GameCanvasLike,
): AttachResult {
  const instances = new Map<string, GameInstance>();
  const instanceInputs = new Map<string, TickInput>();
  const presentations = new Map<string, PresentationHooks>();
  const guards = new Map<string, GameGuard>();
  const bootFaulted = new Set<string>();

  for (const entry of entries) {
    const simResult = supervisor.invoke({
      tick: loop.tickCount,
      gameId: entry.id,
      hook: "boot",
      call: () => createGameInstance(entry.createSim, entry.seed ?? 0),
    });
    if (!simResult.ok) {
      // One fault under hook "boot", the entry registers nothing, and the
      // boot itself continues (DW-2 — the page still opens).
      bootFaulted.add(entry.id);
      continue;
    }
    const guard = guardInstance(simResult.value as GameInstance, supervisor, entry.id, {
      tickCount: () => loop.tickCount,
    });
    guards.set(entry.id, guard);
    const tickInput: TickInput = { controls: {} };
    instances.set(entry.id, guard.instance);
    instanceInputs.set(entry.id, tickInput);
    loop.addInstance(entry.id, guard.instance, tickInput);
    if (entry.createPresentation != null) {
      supervisor.invoke({
        tick: loop.tickCount,
        gameId: entry.id,
        hook: "boot",
        call: () => {
          presentations.set(entry.id, entry.createPresentation!({ makeCanvas }));
        },
      });
    }
  }

  return {
    containment: {
      faultedFor: (gameId) => guards.get(gameId)?.faulted() === true || bootFaulted.has(gameId),
      injectFault: (gameId, message) => guards.get(gameId)?.injectFault(message),
    },
    instances,
    instanceInputs,
    presentations,
  };
}
