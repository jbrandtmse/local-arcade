// Story 1.6 (AD-23): the Patron scheduler — the kernel half of "one busy
// machine, a Patron actually plays". Per busy placement (the flag is room
// data on the placement record — the scheduler reads placements, never
// hand-typed ids) it owns the occupancy cycle: attract -> patron-autoplay
// -> visitor-seated, the wait queue, and the arbitration that runs when a
// canonical break (gameEnded / roundBreak) drains: a PRESENT waiting
// visitor takes over through the seat (presence beats queue head), nobody
// present restarts autoplay at that same break on a new derived seed — a
// busy machine never withholds.
//
// Impulse stage (Design Notes 6-7): every drained record also passes
// through here; a record whose event type the game's authored mapping
// (embedded in the registry entry) names starts that reaction on the
// presenter, same tick. Canonical breaks skip the impulse stage; unmapped
// events do nothing.
//
// Direction law: this module depends only on core (loop event records,
// player presence, placement geometry) and the registry data handed in at
// track(). The seat is reached through the injected SeatHandover interface
// (single direction scheduler -> seat); the seat reaches back only through
// the injected BusyGate predicates it is handed (seat.ts), realized in
// main.ts as deferred closures.

import type { EventRecord } from "../loop.ts";
import type { GameInstance } from "../contract/index.ts";
import { TARGET_REACH, type PlayerController } from "../player.ts";
import {
  cabinetAABB,
  cabinetPlacements,
  type CabinetPlacement,
} from "../room/cabinets.ts";
import type { FigurePresenter, ReactionKind } from "./presenter.ts";

/** Occupancy of a busy cabinet (the debug-visible cycle). */
export type Occupancy = "attract" | "patron-autoplay" | "visitor-seated";

/** Authored attract dwell (Design Notes 4, inference): 600 ticks = 10 s.
 * The SAME dwell gates the first autoplay after boot and every re-arm
 * after a Visitor stands. */
export const ATTRACT_DWELL_TICKS = 600;

// Derived-seed arithmetic (AD-4: deterministic scheduler state, never the
// kernel's fresh-roll path). The mod-2^32 mixing mirrors the design-note
// expression `(entry.seed + salt + runCount * MIX) >>> 0` with 32-bit
// operations (Math.imul keeps the product exact — plain multiplication
// would lose precision past 2^53). SALT makes run 0 differ from the
// attract seed; MIX is odd, so consecutive runs can never collide.
const SEED_SALT = 0x5bf03635;
const SEED_MIX = 0x9e3779b1;

export function derivedSeed(entrySeed: number, runCount: number): number {
  return (Math.imul(entrySeed, 1) + SEED_SALT + Math.imul(runCount, SEED_MIX)) >>> 0;
}

/** What the scheduler needs FROM the seat (one direction only): the
 * physical handover (play-pose teleport, kernel-fresh play, door state)
 * and the truth about who is in the chair. SeatService satisfies this
 * structurally. */
export interface SeatHandover {
  /** Sit the standing Visitor down at this cabinet (seat-side law: save
   * pose, teleport to the play pose, instance.play(kernelSeed)). */
  takeOver(volumeId: string): boolean;
  /** Is the seat currently occupied at this volume? */
  seatedAt(volumeId: string): boolean;
}

export interface SchedulerTrackEntry {
  volumeId: string;
  gameId: string;
  instance: GameInstance;
  /** The registry entry's AUTHORED seed — derived run seeds come off it. */
  seed: number;
  /** The authored event->reaction map embedded in the registry entry. */
  impulses: Readonly<Record<string, string>>;
}

export interface SchedulerCabinetView {
  volumeId: string;
  gameId: string;
  occupancy: Occupancy;
  runCount: number;
  lastSeed: number;
  queue: number[];
  rearmTick: number;
}

export interface PatronScheduler {
  track(entry: SchedulerTrackEntry): void;
  /** The patrons system's per-tick body: impulse stage + break arbitration
   * + dwell/re-arm law. `tick` is the loop's tickCount. */
  dispatch(records: readonly EventRecord[], tick: number): void;
  /** Seat-side BusyGate leg: is this volume a tracked busy cabinet? */
  busyFor(volumeId: string): boolean;
  /** Seat-side BusyGate leg: the second E joins the queue; a third E
   * un-waits (the claim persists across breaks until honoured). */
  toggleWait(volumeId: string): void;
  /** main.ts leg: the figure exists only while the Patron drives. */
  figureActive(volumeId: string): boolean;
  /** Plain-data debug view (the arcadeDebug.scheduler record). */
  state(): { tick: number; cabinets: SchedulerCabinetView[] };
}

interface CabinetRunState {
  volumeId: string;
  gameId: string;
  instance: GameInstance;
  seed: number;
  impulses: Readonly<Record<string, string>>;
  occupancy: Occupancy;
  runCount: number;
  lastSeed: number;
  /** Tick at which the next autoplay launch is allowed (boot: the dwell
   * from tick 0; after a stand: standTick + dwell). */
  rearmTick: number;
  /** The wait queue — at M0 at most one Visitor claim, kept as a list.
   * Claims store the claiming tick: plain, debug-visible, ordered. The
   * list container survives growth; per-claim Visitor identity is what
   * the multi-claimant crowd will additionally need, not the container. */
  queue: number[];
  /** The body-box footprint (x/z only) presence measures against — the
   * same AABB the targeting ray tests, so the two "at the machine" laws
   * share one geometry source (the cabinetAABB one-geometry law). */
  reach: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export function createPatronScheduler(opts: {
  /** Real placement data by default (busy is read off the record); tests
   * may inject a variant list — the flag, never an id list, is the law. */
  placements?: readonly CabinetPlacement[];
  seat: SeatHandover;
  player: PlayerController;
  presenter: FigurePresenter;
}): PatronScheduler {
  const placements = opts.placements ?? cabinetPlacements;
  const states = new Map<string, CabinetRunState>();
  const byGame = new Map<string, CabinetRunState>();
  let tickSeen = 0;

  function launch(st: CabinetRunState): void {
    st.lastSeed = derivedSeed(st.seed, st.runCount);
    st.runCount += 1;
    st.instance.autoplay(st.lastSeed);
    st.occupancy = "patron-autoplay";
  }

  // Presence law (Design Notes 5, TARGET_REACH reused not copied): the
  // waiting Visitor must stand within TARGET_REACH of the cabinet's body
  // box — the same AABB the center-of-view targeting ray measures against.
  // One geometry source for both "at the machine" readings: any stance
  // that could press E at all is present without moving, and walking away
  // past TARGET_REACH fails presence at the break (the walk-away law).
  function present(st: CabinetRunState): boolean {
    const p = opts.player.state;
    const nx = Math.min(Math.max(p.x, st.reach.minX), st.reach.maxX);
    const nz = Math.min(Math.max(p.z, st.reach.minZ), st.reach.maxZ);
    const dx = p.x - nx;
    const dz = p.z - nz;
    return Math.sqrt(dx * dx + dz * dz) <= TARGET_REACH;
  }

  return {
    track(entry) {
      if (states.has(entry.volumeId)) {
        throw new Error(`scheduler: cabinet "${entry.volumeId}" already tracked`);
      }
      const placement = placements.find((c) => c.volumeId === entry.volumeId);
      if (placement == null) {
        throw new Error(`scheduler: no placement for volume "${entry.volumeId}" (the scheduler reads placements, never hand-typed ids)`);
      }
      if (placement.busy !== true) {
        throw new Error(`scheduler: cabinet "${entry.volumeId}" is not busy — a not-busy cabinet stays seat-side (1.5 law)`);
      }
      if (byGame.has(entry.gameId)) {
        throw new Error(`scheduler: game "${entry.gameId}" already tracked`);
      }
      if (!Number.isInteger(entry.seed)) {
        throw new Error(`scheduler: busy cabinet "${entry.volumeId}" needs the registry entry's authored seed (derived runs come off it)`);
      }
      const box = cabinetAABB(placement);
      const st: CabinetRunState = {
        volumeId: entry.volumeId,
        gameId: entry.gameId,
        instance: entry.instance,
        seed: entry.seed,
        impulses: entry.impulses,
        occupancy: "attract", // the instance boots in attract; the dwell gates the first launch
        runCount: 0,
        lastSeed: -1,
        rearmTick: ATTRACT_DWELL_TICKS,
        queue: [],
        reach: { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z },
      };
      states.set(st.volumeId, st);
      byGame.set(st.gameId, st);
    },

    dispatch(records, tick) {
      tickSeen = tick;

      // --- impulse stage + canonical-break arbitration -------------------
      for (const rec of records) {
        const st = byGame.get(rec.gameId);
        if (st == null) continue; // an untracked game's records are nobody's business here
        if (rec.event.type === "gameEnded" || rec.event.type === "roundBreak") {
          if (st.occupancy === "patron-autoplay") {
            // Arbitration order (Design Notes 12): PRESENCE beats queue head —
            // the queue stays a list, and the claim is honoured iff the
            // Visitor stands at the machine right now.
            if (st.queue.length > 0 && present(st)) {
              if (opts.seat.takeOver(st.volumeId)) {
                st.occupancy = "visitor-seated";
                st.queue.length = 0; // claims are cleaned up on handover
              } else {
                // The seat refused (a Visitor already sits elsewhere): the
                // machine never goes dark — restart autoplay at this break.
                launch(st);
              }
            } else {
              launch(st);
            }
          } else if (st.occupancy === "visitor-seated" && rec.event.type === "gameEnded") {
            // Chair law, scheduler-side for busy cabinets (1.5 law moved):
            // game over returns the machine to attract IN PLACE — the
            // Visitor stays seated, Enter restarts seat-local (seat.ts).
            st.instance.attract();
          }
          // occupancy "attract" + a break record: nothing to arbitrate.
          continue;
        }
        // Game-local event: the mapping decides (AD-23 impulse path).
        const reaction = st.impulses[rec.event.type];
        if (reaction != null) opts.presenter.react(reaction as ReactionKind, rec.tick);
      }

      // --- occupancy tick law: dwell launches + the stand observation ----
      for (const st of states.values()) {
        if (st.occupancy === "attract") {
          if (tick >= st.rearmTick && !opts.seat.seatedAt(st.volumeId)) launch(st);
        } else if (st.occupancy === "visitor-seated" && !opts.seat.seatedAt(st.volumeId)) {
          // The stand law itself is seat-side; the scheduler observes the
          // empty chair and re-arms after the authored dwell (the Patron
          // never reclaims a seated chair — the seat.seatedAt gate above).
          st.occupancy = "attract";
          st.rearmTick = tick + ATTRACT_DWELL_TICKS;
          st.queue.length = 0;
        }
      }
    },

    busyFor(volumeId) {
      return states.has(volumeId);
    },

    toggleWait(volumeId) {
      const st = states.get(volumeId);
      if (st == null) throw new Error(`scheduler: toggleWait on untracked cabinet "${volumeId}"`);
      if (st.queue.length > 0) st.queue.length = 0; // un-wait
      else st.queue.push(tickSeen); // join the queue (pose untouched, Patron keeps playing)
    },

    figureActive(volumeId) {
      const st = states.get(volumeId);
      return st != null && st.occupancy === "patron-autoplay";
    },

    state() {
      return {
        tick: tickSeen,
        cabinets: [...states.values()].map((st) => ({
          volumeId: st.volumeId,
          gameId: st.gameId,
          occupancy: st.occupancy,
          runCount: st.runCount,
          lastSeed: st.lastSeed,
          queue: st.queue.slice(),
          rearmTick: st.rearmTick,
        })),
      };
    },
  };
}
