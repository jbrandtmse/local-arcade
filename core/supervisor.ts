// Core fault supervisor (AD-15): wraps every kernel -> sim call site. A
// faulted game is logged as a Dead-Machine defect {tick, errorId} but the
// loop keeps ticking — the room never crashes. Deterministic errorId so a
// fault marker can be matched across replays (AD-26 fault sealing basis).

export type HookName = "tick" | "events" | "snapshot" | "stateHash" | "attract" | "autoplay";

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
  readonly faults: readonly FaultEntry[];
}

export function createSupervisor(onFault?: (entry: FaultEntry) => void): Supervisor {
  const faults: FaultEntry[] = [];
  let counter = 0;

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
        faults.push(entry);
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
  };
}
