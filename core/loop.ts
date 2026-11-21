// Core master loop (AD-3): one global fixed 60Hz tick, decoupled from
// render. The kernel owns the clock: wall time only feeds an accumulator;
// sim time IS the tick count. A backgrounded tab resumes with at most
// MAX_CATCHUP_STEPS ticks and the leftover delta dropped. Every kernel->sim
// call goes through the supervisor (AD-15). In-tick order is fixed:
// sim ticks -> event dispatch (AD-23), scheduler/input routing is 1.6.

import { createSupervisor, type FaultEntry, type Supervisor } from "./supervisor.ts";
import type { GameInstance, SimEvent, TickInput } from "./contract/index.ts";

/** dt handed to every sim, in tick units. */
export const TICK_DT = 1 / 60;
/** Wall milliseconds represented by one tick. */
export const MS_PER_TICK = 1000 / 60;
/** Ceiling on ticks processed per frame after a wall-clock gap. */
export const MAX_CATCHUP_STEPS = 5;

export interface LoopConfig {
  /** Injected wall clock (performance.now in the browser, a fake in tests). */
  now: () => number;
  /** Frame pump used by start() (requestAnimationFrame in the browser). */
  schedule?: (cb: () => void) => void;
  maxCatchupSteps?: number;
  onFault?: (entry: FaultEntry) => void;
}

interface Registered {
  id: string;
  instance: GameInstance;
  input: TickInput;
}

export interface EventRecord {
  gameId: string;
  tick: number;
  event: SimEvent;
}

export interface KernelLoop {
  addInstance(id: string, instance: GameInstance, input?: TickInput): void;
  /** Advance the clock by one frame; returns the number of ticks run. */
  step(): number;
  /** Pump step() via config.schedule (the render loop stays separate). */
  start(): void;
  /** Pull and clear the queued per-tick events (AD-6 channel). */
  drainEvents(): EventRecord[];
  /** Sim time: exactly the number of global ticks executed. */
  readonly tickCount: number;
  readonly supervisor: Supervisor;
}

export function createKernelLoop(config: LoopConfig): KernelLoop {
  const maxCatchupSteps = config.maxCatchupSteps ?? MAX_CATCHUP_STEPS;
  const supervisor = createSupervisor(config.onFault);
  const registered: Registered[] = [];
  const eventQueue: EventRecord[] = [];
  let lastWall = config.now();
  let accumulator = 0;
  let tickCount = 0;

  function runGlobalTick(): void {
    tickCount += 1;
    for (const reg of registered) {
      supervisor.invoke({
        tick: tickCount,
        gameId: reg.id,
        hook: "tick",
        call: () => reg.instance.tick(TICK_DT, reg.input),
      });
    }
    for (const reg of registered) {
      const result = supervisor.invoke({
        tick: tickCount,
        gameId: reg.id,
        hook: "events",
        call: () => reg.instance.events(),
      });
      if (result.ok && Array.isArray(result.value)) {
        for (const event of result.value as SimEvent[]) {
          eventQueue.push({ gameId: reg.id, tick: tickCount, event });
        }
      }
    }
  }

  function stepOnce(): number {
    const wall = config.now();
    let delta = wall - lastWall;
    lastWall = wall;
    if (delta < 0) delta = 0;
    accumulator += delta;
    let ticks = 0;
    while (accumulator >= MS_PER_TICK) {
      if (ticks >= maxCatchupSteps) {
        accumulator = 0; // resume semantics: leftover wall delta is dropped
        break;
      }
      runGlobalTick();
      accumulator -= MS_PER_TICK;
      ticks += 1;
    }
    return ticks;
  }

  return {
    addInstance(id, instance, input) {
      registered.push({ id, instance, input: input ?? { controls: {} } });
    },
    step: stepOnce,
    start(): void {
      if (!config.schedule) {
        throw new TypeError("loop.start() requires a schedule pump (rAF in the browser)");
      }
      const pump = (): void => {
        stepOnce();
        config.schedule!(pump);
      };
      config.schedule(pump);
    },
    drainEvents() {
      const drained = eventQueue.slice();
      eventQueue.length = 0;
      return drained;
    },
    get tickCount() {
      return tickCount;
    },
    supervisor,
  };
}
