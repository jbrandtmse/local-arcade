// Story 2.1 (AD-7): the pure attract-mix law — gain and lowpass for one
// Cabinet chain per tick, computed from plain inputs with no clock, no
// DOM, and no WebAudio (the manager owns actuation). The law:
//
//   gain = ATTRACT_BASE_GAIN * profile.gain * swell * occupancyGate
//   lowpassHz = profile.lowpassHz
//
// profile comes from the APPLIED occluder kind (per-kind authored
// profiles — swapping two profiles' numbers turns the profile pins red);
// swell is the entry sequence's bleedFraction through the door beat; the
// gate is silent ONLY while a visitor sits (Patron autoplay keeps the
// attract sounding — the busy-cabinet pin). The hysteresis pair lives
// here as a pure tick: DEADBAND_M (occlusion.ts) plus DWELL_TICKS below.

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
}

export interface MixStep {
  target: MixTarget;
  dwell: DwellState;
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
 * applied key flips at DWELL consecutive matching samples — one tick of
 * disagreement resets the count, so alternating samples NEVER flip (AC:
 * attract never flaps while the listener grazes an edge). */
export function advanceDwell(key: string, dwell: DwellState): DwellState {
  if (key === dwell.appliedId) return { appliedId: dwell.appliedId, pendingId: "", pendingTicks: 0 };
  if (key === dwell.pendingId) {
    const pendingTicks = dwell.pendingTicks + 1;
    if (pendingTicks >= DWELL_TICKS) return { appliedId: key, pendingId: "", pendingTicks: 0 };
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

/** One tick of the law for one chain: advance the dwell, apply the
 * profile/swell/gate product. Pure — no actuation here. */
export function mixStep(input: MixInput): MixStep {
  const dwell = advanceDwell(sampleKeyOf(input.sampleIds), input.dwell);
  const profile = profileForApplied(dwell.appliedId, input.volumes);
  const gain = ATTRACT_BASE_GAIN * profile.gain * swellFactor(input.entry) * occupancyGate(input.occupancy);
  return { target: { gain, lowpassHz: profile.lowpassHz }, dwell };
}
