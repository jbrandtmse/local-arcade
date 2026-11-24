// Core fault supervisor (AD-15): wraps every kernel -> sim call site. A
// faulted game is logged as a Dead-Machine defect {tick, errorId} but the
// loop keeps ticking — the room never crashes. Deterministic errorId so a
// fault marker can be matched across replays (AD-26 fault sealing basis).

// Story 1.7 widens the union with the containment-site hooks: "play" (the
// wrapper's visitor-seated mode switch, called through the guarded
// instance), "boot" (registry attach — factory faults land here, DW-2),
// "draw" (the render-side draw/composite legs), "stall" (the dev
// dead-machine predicate synthesizes its fault here), and "inject"
// (arcadeDebug.containment.injectFault smoke trigger — the lead's
// console exercises the SAME law path as a real fault).
export type HookName =
  | "tick"
  | "events"
  | "snapshot"
  | "stateHash"
  | "attract"
  | "autoplay"
  | "play"
  | "boot"
  | "draw"
  | "stall"
  | "inject";

/** Dev-surface ring cap for the fault record list — a LABELLED PLACEHOLDER
 * (the spine keeps numeric thresholds Deferred to M2/Epic 3, DW-3). The
 * list is the future fault-marker basis (AD-26), so it is bounded from the
 * start: the most recent MAX_FAULT_RECORDS are kept, the rest counted in
 * `droppedFaults`. The errorId counter never caps — ids stay deterministic
 * and gap-free across replays (AD-26 fault-match basis). */
export const MAX_FAULT_RECORDS = 64;

export interface FaultEntry {
  tick: number;
  errorId: string;
  hook: HookName;
  message: string;
}

export interface CallSite {
  tick: number;
  gameId: string;
  hook: HookName;
  call: () => unknown;
}

export interface Invocation {
  ok: boolean;
  value?: unknown;
  fault?: FaultEntry;
}

export interface Supervisor {
  /** Run one kernel call site; faults are caught, logged, never rethrown. */
  invoke(site: CallSite): Invocation;
  /** The most recent MAX_FAULT_RECORDS faults (DW-3 ring: a long broken
   * run can never grow this list past the cap). */
  readonly faults: readonly FaultEntry[];
  /** How many fault records the ring has already dropped (every dropped
   * record still fired its onFault consumer and got a unique errorId). */
  readonly droppedFaults: number;
}

export function createSupervisor(onFault?: (entry: FaultEntry) => void): Supervisor {
  const faults: FaultEntry[] = [];
  let counter = 0;
  let dropped = 0;

  return {
    invoke({ tick, gameId, hook, call }): Invocation {
      try {
        return { ok: true, value: call() };
      } catch (err) {
        counter += 1;
        const entry: FaultEntry = {
          tick,
          errorId: `${gameId}.${hook}#${counter}`,
          hook,
          message: err instanceof Error ? err.message : String(err),
        };
        // The SEAT_EVENT_WINDOW push/shift idiom (seat.ts): the ring keeps
        // the most recent records, the overflow is counted, never kept.
        faults.push(entry);
        if (faults.length > MAX_FAULT_RECORDS) {
          faults.shift();
          dropped += 1;
        }
        // A crashing fault consumer must not take the room down either —
        // containment is the supervisor's whole point (AD-15).
        try {
          onFault?.(entry);
        } catch {
          /* the fault record already exists; the consumer is broken, not the room */
        }
        return { ok: false, fault: entry };
      }
    },
    get faults() {
      return faults;
    },
    get droppedFaults() {
      return dropped;
    },
  };
}
