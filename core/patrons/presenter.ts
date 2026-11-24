// Story 1.6 (AD-23): the figure presenter — the kernel's reaction library
// and the Patron figure's pose state. The path is one-way: a sim event,
// the game's authored impulse mapping (embedded in the registry), THIS
// library, and main.ts re-poses the figure meshes from the state read here
// (the coin-door-pose idiom: the frame READS, the kernel poses). The
// adapter may never pose a figure — this module is the only animation
// carrier besides placement data.
//
// Figure state is kernel tick state (AD-3): react(kind, tick) starts a
// reaction at a loop-tick stamp, step(tick) advances/retires it inside the
// tick, and figureOffset() is a pure read of the pose delta — the curves
// use only tick arithmetic (no wall clock anywhere). The figure stands at
// playPoseFor(volumeId) (core/seat.ts law, reused not copied): the same
// authored play spot a seated visitor takes.

import { playPoseFor } from "../seat.ts";

/** Kernel reaction library — the only names an authored impulse mapping may
 * target (tools/gen-registry.mjs validates mapping values against the same
 * list; the presenter suite source-pins the two lists together). */
export type ReactionKind = "flinch" | "jump" | "slam";

export interface ReactionDef {
  /** Length of the reaction in ticks (AD-3: tick state, never wall time). */
  durationTicks: number;
  /** Upper-body drop amplitude, metres (torso + head ride down; legs stay). */
  crouch: number;
  /** Forward lean along the figure's facing, metres (upper body only). */
  lean: number;
  /** Whole-body parabolic hop amplitude, metres. */
  hop: number;
}

// Authored data (Design Notes 8; the sub-numbers inside the authored
// envelope are inference): flinch = 12 ticks, 0.08m crouch + a small lean
// (startle, no displacement); slam = 18 ticks, a deeper upper-body down
// arc with settle (game over); jump = 30 ticks, a 0.35m parabolic hop —
// the figure echoes the hop it watches the buggy make.
export const REACTIONS: Record<ReactionKind, ReactionDef> = {
  flinch: { durationTicks: 12, crouch: 0.08, lean: 0.05, hop: 0 },
  jump: { durationTicks: 30, crouch: 0, lean: 0, hop: 0.35 },
  slam: { durationTicks: 18, crouch: 0.22, lean: 0.1, hop: 0 },
};

/** Pose delta of the three figure parts from the idle stance, in the
 * figure's own frame: +y up, lean along the facing (main.ts rotates the
 * lean by the placement's facing like every other cabinet pose leg). */
export interface FigureOffset {
  legsY: number;
  torsoY: number;
  torsoLean: number;
  headY: number;
}

export interface FigurePresenter {
  /** Start (replace — never stack) a reaction at a loop-tick stamp. */
  react(kind: ReactionKind, tick: number): void;
  /** Advance inside the tick: elapsed grows, the reaction retires when its
   * duration is spent. Called once per tick by the patrons system. */
  step(tick: number): void;
  /** Pure read of the current pose delta (the re-pose carrier for main.ts
   * — reads only, never reads a clock). */
  figureOffset(): FigureOffset;
  /** Where the figure stands: the authored play spot (seat.ts law). */
  figurePose(volumeId: string): { x: number; z: number; yaw: number; pitch: number };
  /** Plain-data debug view (the arcadeDebug.presenter record). */
  state(): { reaction: ReactionKind | null; startTick: number; elapsedTicks: number };
}

export function createFigurePresenter(): FigurePresenter {
  let kind: ReactionKind | null = null;
  let startTick = -1;
  let elapsed = 0;

  return {
    react(next, tick) {
      if (!(next in REACTIONS)) {
        throw new Error(`presenter: "${next}" is not a kernel reaction (known: flinch, jump, slam)`);
      }
      // One reaction per mapped event: a fresh mapped event replaces the
      // live one mid-curve (Design Notes: no stacking, no queue).
      kind = next;
      startTick = tick;
      elapsed = 0;
    },
    step(tick) {
      if (kind == null) return;
      elapsed = tick - startTick;
      if (elapsed >= REACTIONS[kind].durationTicks) {
        kind = null;
        startTick = -1;
        elapsed = 0;
      }
    },
    figureOffset() {
      if (kind == null) return { legsY: 0, torsoY: 0, torsoLean: 0, headY: 0 };
      const def = REACTIONS[kind];
      // Curve shape over the reaction's ticks (AD-3 arithmetic): p walks
      // (0,1) and the envelope rises then settles back to rest — a
      // parabola 4p(1-p), peak 1 dead centre, exact 0 at both ends of the
      // span. Transcendentals would need the contract math module; the
      // parabola keeps the curve pure arithmetic.
      const p = (Math.min(elapsed, def.durationTicks - 1) + 0.5) / def.durationTicks;
      const env = 4 * p * (1 - p);
      const hop = def.hop * env;
      const crouch = def.crouch * env;
      return {
        legsY: hop,
        torsoY: hop - crouch,
        torsoLean: def.lean * env,
        headY: hop - crouch,
      };
    },
    figurePose(volumeId) {
      return playPoseFor(volumeId);
    },
    state() {
      return { reaction: kind, startTick, elapsedTicks: kind == null ? 0 : elapsed };
    },
  };
}
