// Story 2.1 (AD-7): single-ray occlusion sampling for the Core Audio
// Manager — "what blocks the ear blocks the eye" (Design Notes item 1).
// The raycaster consumes the ONE authored collisionVolumes list and
// kind-filters to the occluder set: wall, pillar, door. Cabinet and street
// volumes never occlude (a Cabinet must not silence its own attract; the
// street is open sky, not a collider for ears). Pure geometry: no clock,
// no DOM, no WebAudio. Story 1.3's sibling 2D segment-vs-rect helper in
// core/room/occlusion.test.ts re-derives the same slab clip for the
// movement plane; unification lands with the 3.7 visual pass (Design
// Notes: this suite re-derives expectations from authored data, it never
// imports that sibling).

import { collisionVolumes, type CollisionVolume, type VolumeKind } from "../room/collision-volumes.ts";

/** A point in room space for the ray endpoints (metres, same axes as the
 * collision volumes). */
export interface RayPoint {
  x: number;
  y: number;
  z: number;
}

/** Kinds an attract ray may die on (Story 2.1; the street/cabinet exclusion
 * is the AC pin — removing a kind here turns the occluder-set test red). */
export const OCCLUDER_KINDS: readonly VolumeKind[] = ["wall", "pillar", "door"];

/** Dead-band, metres — a box is shrunk by this before the clip, so a ray
 * grazing a face boundary reads as clear (the hysteresis pair's spatial
 * leg; the temporal leg is DWELL_TICKS in mix.ts). Placeholder pending
 * 3.7's authored audio pass; the grazing pin goes red at 0. */
export const DEADBAND_M = 0.05;

// Parallel-axis test threshold — the sibling 2D clip uses the same 1e-12
// discipline: an axis-aligned ray exactly on a slab is inside iff the
// constant coordinate lies within the slab.
const PARALLEL_EPS = 1e-12;

/** Clip one axis slab against the segment parameter window [t0, t1];
 * false means the segment misses the box entirely. */
function clipAxis(lo: number, hi: number, a: number, b: number, bounds: { t0: number; t1: number }): boolean {
  const d = b - a;
  if (Math.abs(d) < PARALLEL_EPS) return a >= lo && a <= hi;
  let ta = (lo - a) / d;
  let tb = (hi - a) / d;
  if (ta > tb) {
    const swap = ta;
    ta = tb;
    tb = swap;
  }
  if (ta > bounds.t0) bounds.t0 = ta;
  if (tb < bounds.t1) bounds.t1 = tb;
  return bounds.t0 <= bounds.t1;
}

/** Entry parameter t of the segment (from -> to) into the dead-band-shrunk
 * box, or null on a miss. Y is a full clip axis: a ray passing ABOVE or
 * BELOW the volume clears it (under-door and over-pillar hearing). */
function segEntryT(v: CollisionVolume, from: RayPoint, to: RayPoint): number | null {
  const bounds = { t0: 0, t1: 1 };
  if (!clipAxis(v.min.x + DEADBAND_M, v.max.x - DEADBAND_M, from.x, to.x, bounds)) return null;
  if (!clipAxis(v.min.y + DEADBAND_M, v.max.y - DEADBAND_M, from.y, to.y, bounds)) return null;
  if (!clipAxis(v.min.z + DEADBAND_M, v.max.z - DEADBAND_M, from.z, to.z, bounds)) return null;
  return bounds.t0;
}

/** The occluder ids between two points, ordered by entry distance (nearest
 * first — the mix law keys its hysteresis on the FIRST id). Empty means
 * line-of-sound. Ids are stable volume ids, so the key survives even
 * though the same-kind profile is what the law ultimately applies. */
export function occlusionIds(
  from: RayPoint,
  to: RayPoint,
  volumes: readonly CollisionVolume[] = collisionVolumes,
): string[] {
  const hits: Array<{ id: string; t: number }> = [];
  for (const v of volumes) {
    if (!OCCLUDER_KINDS.includes(v.kind)) continue;
    const t = segEntryT(v, from, to);
    if (t !== null) hits.push({ id: v.id, t });
  }
  hits.sort((p, q) => p.t - q.t || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  return hits.map((h) => h.id);
}
