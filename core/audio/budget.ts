// Story 2.2 (AD-7/AD-27): the pure channel budget — the audio-side awake
// predicate plus the nearest-N selection. The Manager measures and calls
// this; the gain law never sees the listener pose (mix.ts receives this
// decision as plain awake/inBudget booleans). AD-27's kernel wake-set (loop
// tiering, sleeping sims) is NOT this module — when the perf story lands it
// reuses/extends this predicate instead of re-deriving it (spec Design
// Notes 3, the hand-off record).
//
// awake = visitor-occupied  ∪  planar distance within NEAR_RADIUS_M  ∪
// inside the authored frustum cone (cos(bearing, facing) >=
// AWAKE_FRUSTUM_COS_MIN). The facing basis mirrors player.ts's basis (yaw 0
// looks toward -Z); the test is a forward cosine — no inverse trig — and it
// takes no camera/aspect input (the render layer never reaches the tick), so
// it is pure and deterministic; the basis rides the Core deterministic math
// module (AD-4) so a replay recomputes it bit-identically.
//
// budget = awake ∩ planar distance within CULL_RADIUS_M, then the first
// NEAREST_N by (distance asc, volumeId asc tie-break — the occlusion.ts idiom).
// Computing the budget FROM the awake list (never beside it) is the
// structural form of the AD-27 interlock: audible ⇒ awake.
//
// Candidates are placed Chains, not sounding chains: a Cabinet whose attract
// carries no recipe still wakes and still holds a ladder/budget seat. Whether
// such a machine should be excluded is an authored-data call (Story 3.7's
// finals own it); the law keys on placement until then.
//
// Every number below is a labelled placeholder — Story 3.7 owns the finals
// (AD-27's Deferred row). Pure: no clock, no DOM, no WebAudio; the AD-3
// readdir scan in manager.test.ts enrols this file automatically.

import { math } from "../contract/index.ts";

/** Near-radius leg of the awake set, metres — a Cabinet this close to the
 * ear is awake even behind the listener (the ear turns, the room does not).
 * Placeholder pending 3.7. */
export const NEAR_RADIUS_M = 6;

/** Frustum leg: the minimum cosine between the facing basis and the
 * listener->target bearing — an authored cone (~±60° half-angle), NOT the
 * renderer's camera FOV (main.ts's 60° vertical is aspect-dependent, a
 * render-layer value; spec Design Notes 4). Placeholder pending 3.7. */
export const AWAKE_FRUSTUM_COS_MIN = 0.5;

/** Distance-cull radius, metres — beyond it a chain is budget-silent (gain
 * 0, the loop source keeps running). Placeholder pending 3.7; the shipped
 * value sits past the room's ~22.7 m diagonal, so nothing in today's
 * one-Cabinet room is culled (spec Design Notes 5). */
export const CULL_RADIUS_M = 25;

/** Nearest-N: how many awake, un-culled chains may sound, by distance with
 * the volumeId tie-break for stability. Placeholder pending 3.7. */
export const NEAREST_N = 4;

/** The ear this budget is computed for: the planar pose + facing the
 * Manager measured from its own ear() handover. */
export interface BudgetListener {
  x: number;
  z: number;
  yaw: number;
}

/** One chain's candidate: the chain's authored speaker point (x/z only —
 * the budget is a movement-plane predicate) plus the scheduler-owned truth
 * of whether a visitor sits there (the Manager passes it; it never derives
 * it from a pose). */
export interface BudgetTarget {
  volumeId: string;
  x: number;
  z: number;
  visitorOccupied: boolean;
}

export interface BudgetDecision {
  /** Input order — the candidate set, before the cull and the NEAREST_N
   * truncation. The Manager projects it to per-chain booleans; the
   * interlock read lives in the suite, not in a debug surface. */
  awakeIds: string[];
  /** Sorted by (distance asc, volumeId asc), truncated at NEAREST_N. */
  inBudgetIds: string[];
}

/** One tick's channel budget, pure over tick state (AD-27): the awake set
 * first, the cull + nearest-N selection computed FROM it. */
export function computeBudget(listener: BudgetListener, targets: readonly BudgetTarget[]): BudgetDecision {
  // Facing basis mirrors player.ts (yaw 0 -> -Z, positive yaw turns left).
  const fx = -math.sin(listener.yaw);
  const fz = -math.cos(listener.yaw);
  const awake: Array<{ volumeId: string; dist: number }> = [];
  for (const t of targets) {
    const dx = t.x - listener.x;
    const dz = t.z - listener.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    // Forward cosine only (no acos/atan2): dist 0 means the target sits at
    // the ear — bearing undefined, treat as in-cone (the near leg fires too).
    const cosBearing = dist === 0 ? 1 : (dx * fx + dz * fz) / dist;
    if (t.visitorOccupied || dist <= NEAR_RADIUS_M || cosBearing >= AWAKE_FRUSTUM_COS_MIN) {
      awake.push({ volumeId: t.volumeId, dist });
    }
  }
  // Budget FROM the awake list: audible ⇒ awake holds by construction
  // (AD-27 — a sleeping machine can never win a budget slot).
  const cullable = awake.filter((a) => a.dist <= CULL_RADIUS_M);
  cullable.sort((a, b) => a.dist - b.dist || (a.volumeId < b.volumeId ? -1 : a.volumeId > b.volumeId ? 1 : 0));
  return {
    awakeIds: awake.map((a) => a.volumeId),
    inBudgetIds: cullable.slice(0, NEAREST_N).map((a) => a.volumeId),
  };
}
