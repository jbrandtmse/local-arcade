// Story 2.1 (AD-7), extended by Story 2.2 (FR-3/CAP-3/AD-7): the pure
// attract-mix law — gain and lowpass for one Cabinet chain per tick,
// computed from plain inputs with no clock, no DOM, and no WebAudio (the
// manager owns actuation, measures distances, and decides budget flags —
// the law never sees the listener pose). The law:
//
//   gain = ATTRACT_BASE_GAIN * profile.gain * swell * occupancyGate
//          * ladderMultiplier * focusMultiplier      (0 unless audible)
//   lowpassHz = profile.lowpassHz
//   audible = awake && inBudget                       (budget from budget.ts)
//
// profile comes from the APPLIED occluder kind (per-kind authored
// profiles — swapping two profiles' numbers turns the profile pins red);
// swell is the entry sequence's bleedFraction through the door beat; the
// gate is silent ONLY while a visitor sits (Patron autoplay keeps the
// attract sounding — the busy-cabinet pin). Two hysteresis pairs live
// here as pure ticks, one machine each way (advanceDwell): occlusion's
// DEADBAND_M (occlusion.ts) + DWELL_TICKS, and the proximity ladder's
// PROXIMITY_BAND_M dead-band + LADDER_DWELL_TICKS (CAP-3: a listener at a
// tie boundary never flips the mix per tick). The focus layer is a pure
// multiplier read off the scheduler's settled occupancy: self full, every
// other cabinet ducked to the FOCUS_DUCK floor, none neutral (AD-7's
// seated "tuned in"). Every ladder/focus number is a labelled placeholder
// pending 3.7's authored finals.

import { collisionVolumes, type CollisionVolume } from "../room/collision-volumes.ts";
import type { EntryPhase, EntryState } from "../entry.ts";
import type { Occupancy } from "../patrons/scheduler.ts";

/** One occlusion colour: level + colouration. */
export interface OcclusionProfile {
  gain: number;
  lowpassHz: number;
}

// Per-kind authored profiles — placeholder numbers pending 3.7's sound
// pass (the spine pins the SHAPE: occluder kind -> gain + lowpass). All
// binary-friendly so law tests pin exact literals.
export const OCCLUSION_PROFILES: Record<"wall" | "pillar" | "door", OcclusionProfile> = {
  wall: { gain: 0.125, lowpassHz: 420 },
  pillar: { gain: 0.375, lowpassHz: 900 },
  door: { gain: 0.5, lowpassHz: 1500 },
};

/** Line-of-sound: full level, wide open. */
export const OPEN_PROFILE: OcclusionProfile = { gain: 1, lowpassHz: 12000 };

/** Master attract level (placeholder, 3.7 finals): the ceiling every
 * cabinet shares before profile, swell, and gate multiply it. */
export const ATTRACT_BASE_GAIN = 0.5;

/** Temporal half of the hysteresis pair: an applied occluder class flips
 * only after DWELL consecutive tick samples agree on a different one.
 * Placeholder pending 3.7; the flap pin goes red if this is removed or
 * set to 1. */
export const DWELL_TICKS = 30;

/** The per-chain hysteresis memory: which occluder id ("" = open) is
 * APPLIED, plus the candidate pending its dwell count. Immutable records —
 * the manager stores the returned one. */
export interface DwellState {
  appliedId: string;
  pendingId: string;
  pendingTicks: number;
}

export const INITIAL_DWELL: DwellState = { appliedId: "", pendingId: "", pendingTicks: 0 };

// --- Story 2.2: the proximity ladder + the seated focus layer -------------

/** Spatial half of the ladder's hysteresis pair, metres (CAP-3): a chain
 * within this much of the nearest chain still samples "clear" — a listener
 * standing on a tie boundary never flips the mix per tick. Placeholder
 * pending 3.7; the tie-band pin goes red at 0. */
export const PROXIMITY_BAND_M = 0.25;

/** Temporal half of the ladder's hysteresis pair: an applied ladder tier
 * flips only after this many consecutive tick samples agree on the other
 * one. A separate constant from DWELL_TICKS so 3.7 can tune the ladder and
 * the occlusion timing apart (same machine, two key spaces — Design
 * Notes 2). Placeholder pending 3.7. */
export const LADDER_DWELL_TICKS = 15;

/** The "low" rung's level multiplier: every chain outside the band around
 * the nearest lands LADDER_FAR_DUCK x its own profile product (FR-3: at
 * the doorway only the nearest machines read clearly). Placeholder,
 * binary-friendly for exact literal pins; the low-tier and doorway-ordering
 * pins go red at 1. */
export const LADDER_FAR_DUCK = 0.25;

/** The seated focus floor (AD-7 "tuned in"): while a visitor sits, every
 * non-focus cabinet's chain multiplies to this near-silent authored level.
 * The focused chain's multiplier stays FULL (1) — 2.1's occupancyGate is
 * what keeps that cabinet's own attract silent while it sits (Design
 * Notes 1's composition). Placeholder pending 3.7; the collapse and
 * floor-literal pins go red at 1. */
export const FOCUS_DUCK = 0.0625;

/** Which side of the seated focus layer this chain is on, derived by the
 * manager from the scheduler's SETTLED occupancy only (AD-23): "self" = a
 * visitor sits at this Cabinet (exactly "visitor-seated" — "patron-
 * autoplay" never arms focus), "other" = someone sits elsewhere, "none" =
 * nobody sits (neutral). */
export type FocusLayer = "self" | "other" | "none";

/** The ladder's key space, distinct from occlusion's volume-id keys so a
 * wiring slip between the two dwell machines cannot typecheck (Design
 * Notes 2: one machine, two key spaces). */
export type LadderTier = "clear" | "low";

/** The per-chain ladder hysteresis memory — the same DwellState machine on
 * the LadderTier key space. The room opens with no pinned nearest: applied
 * starts "clear", no candidate pending. */
export const INITIAL_LADDER_DWELL: DwellState = { appliedId: "clear", pendingId: "", pendingTicks: 0 };

/** The ladder's sample key: "clear" iff this chain sits within
 * PROXIMITY_BAND_M of the nearest chain. A lone chain (nearestOtherM =
 * Infinity) always samples "clear" — nothing to duck behind. */
export function ladderSampleKey(distanceM: number, nearestOtherM: number): LadderTier {
  return distanceM <= nearestOtherM + PROXIMITY_BAND_M ? "clear" : "low";
}

/** The applied-tier level: the clear rung is full, everything else ducks
 * to LADDER_FAR_DUCK. The caller passes a ladder dwell's appliedId — that
 * memory holds only LadderTier keys by construction. */
export function ladderMultiplierFor(applied: LadderTier): number {
  return applied === "clear" ? 1 : LADDER_FAR_DUCK;
}

/** The focus level: the seated cabinet's own chain stays FULL, every other
 * chain ducks to FOCUS_DUCK, and no seated visitor means neutral. */
export function focusMultiplierFor(focus: FocusLayer): number {
  return focus === "other" ? FOCUS_DUCK : 1;
}

export interface MixTarget {
  gain: number;
  lowpassHz: number;
}

export interface MixInput {
  /** Only these two fields of the entry state feed the law. */
  entry: Pick<EntryState, "phase" | "bleedFraction">;
  occupancy: Occupancy;
  /** This tick's occlusion sample (nearest-first ids; [] = line-of-sound). */
  sampleIds: readonly string[];
  dwell: DwellState;
  /** The volume list the sample's ids come from — the raycast's own list
   * (the manager injects its seam's volumes; default: the one authored
   * list). The profile lookup must read THIS list, never a module-level
   * map, or an injected rig's ids silently resolve to OPEN. */
  volumes?: readonly CollisionVolume[];
  /** This chain's planar (x/z) distance, metres, measured by the manager
   * from its ear() to the chain's authored speaker point (Story 2.2 — the
   * law sees the number, never the pose). */
  distanceM: number;
  /** Planar distance to the NEAREST OTHER chain (Infinity when this is the
   * only chain — the lone chain always samples "clear"). */
  nearestOtherM: number;
  /** Seated-focus side, from the scheduler's settled occupancy (AD-23). */
  focus: FocusLayer;
  /** This chain's ladder hysteresis memory (the same advanceDwell
   * machine, keyed on "clear"/"low"). */
  ladderDwell: DwellState;
  /** Channel-budget flags from budget.ts (AD-27: budget lives inside the
   * awake set, so inBudget implies awake at the source). */
  awake: boolean;
  inBudget: boolean;
}

export interface MixStep {
  target: MixTarget;
  dwell: DwellState;
  /** The advanced ladder memory — the manager stores the returned one. */
  ladderDwell: DwellState;
  /** awake && inBudget — the gain-only silence flag (the loop source keeps
   * running; budget never starts or stops a chain). */
  audible: boolean;
}

/** The hysteresis key for a sample: the NEAREST occluder id, "" when the
 * ray is clear. A same-kind wall behind another wall changes the key but
 * the applied profile stays this kind — acceptable at 1.3 geometry (the
 * single-ray law is the contract here, Design Notes). */
export function sampleKeyOf(sampleIds: readonly string[]): string {
  return sampleIds[0] ?? "";
}

/** The dwell law: a sample matching the applied key clears the candidate;
 * a matching candidate counts up; a new candidate starts at 1. The
 * applied key flips at `dwellTicks` consecutive matching samples (default
 * DWELL_TICKS; the Story 2.2 ladder passes LADDER_DWELL_TICKS — one
 * machine, two key spaces, timing tuned apart) — one tick of
 * disagreement resets the count, so alternating samples NEVER flip (AC:
 * attract never flaps while the listener grazes an edge). Keys are opaque
 * strings: occlusion ids for the occlusion dwell, "clear"/"low" for the
 * ladder. */
export function advanceDwell(key: string, dwell: DwellState, dwellTicks: number = DWELL_TICKS): DwellState {
  if (key === dwell.appliedId) return { appliedId: dwell.appliedId, pendingId: "", pendingTicks: 0 };
  if (key === dwell.pendingId) {
    const pendingTicks = dwell.pendingTicks + 1;
    if (pendingTicks >= dwellTicks) return { appliedId: key, pendingId: "", pendingTicks: 0 };
    return { appliedId: dwell.appliedId, pendingId: key, pendingTicks };
  }
  return { appliedId: dwell.appliedId, pendingId: key, pendingTicks: 1 };
}

/** The profile for an applied occluder id: its kind's authored profile,
 * or OPEN when the id is empty or names a non-occluder kind (defensive —
 * the raycaster cannot return one, but the law stays pure and total).
 * Resolved from the CALLER's volume list (the raycast's own list — the
 * one-source law at the seam, not a module-captured map). */
export function profileForApplied(
  appliedId: string,
  volumes: readonly CollisionVolume[] = collisionVolumes,
): OcclusionProfile {
  for (const v of volumes) {
    if (v.id !== appliedId) continue;
    if (v.kind === "wall" || v.kind === "pillar" || v.kind === "door") return OCCLUSION_PROFILES[v.kind];
    return OPEN_PROFILE;
  }
  return OPEN_PROFILE;
}

// The door beat phases: the attract swells IN as the door opens (the
// entry sequence's bleedFraction IS the swell — one clock, Design Notes).
// boot-check included: bleedFraction is 0 there, so the room is silent
// until the beat actually starts bleeding. control/workbench: full level.
const SWEEP_PHASES: readonly EntryPhase[] = ["boot-check", "door", "ready-handle", "open"];

function swellFactor(entry: Pick<EntryState, "phase" | "bleedFraction">): number {
  return SWEEP_PHASES.includes(entry.phase) ? entry.bleedFraction : 1;
}

/** Gain law only — never source start/stop (AC): the looping chain runs
 * through every occupancy; only the multiplier changes. Silent ONLY while
 * a visitor sits at this Cabinet; Patron autoplay keeps the attract
 * sounding (the busy-cabinet pin). */
function occupancyGate(occupancy: Occupancy): number {
  return occupancy === "visitor-seated" ? 0 : 1;
}

/** One tick of the law for one chain: advance both dwell machines
 * (occlusion + ladder), apply the profile/swell/gate/ladder/focus product.
 * Silence is gain-only: an inaudible chain (outside the channel budget)
 * reads gain 0 while its looping source keeps running and its colour stays
 * the applied profile — no start/stop churn, no colour change (2.1's
 * gain-only law, widened to the budget). Pure — no actuation here. */
export function mixStep(input: MixInput): MixStep {
  const dwell = advanceDwell(sampleKeyOf(input.sampleIds), input.dwell);
  const profile = profileForApplied(dwell.appliedId, input.volumes);
  const ladderDwell = advanceDwell(
    ladderSampleKey(input.distanceM, input.nearestOtherM),
    input.ladderDwell,
    LADDER_DWELL_TICKS,
  );
  const audible = input.awake && input.inBudget;
  const gain = audible
    ? ATTRACT_BASE_GAIN *
      profile.gain *
      swellFactor(input.entry) *
      occupancyGate(input.occupancy) *
      ladderMultiplierFor(ladderDwell.appliedId as LadderTier) *
      focusMultiplierFor(input.focus)
    : 0;
  return { target: { gain, lowpassHz: profile.lowpassHz }, dwell, ladderDwell, audible };
}
