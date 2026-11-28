// Story 2.3 (AC1-AC3): the authored atmosphere tier — the visual seek rung's
// laws, DOM-free and three-free (the injected-seam idiom; the entry hands
// the real adapter exactly as scene.ts's does). Three mechanisms over ONE
// geometry source: the collision volume records — the same blockers the
// audio raycasts ride (AD-7) — read here as plain data and NEVER through
// core/audio/ (light bleed is authored around the occluder edges, the
// asymmetry epics 2.3 AC2 names by design; the source scans pin it):
//
//   - hazeFactor: the "faint dust-haze" law on the LIGHT tier — an authored
//     attenuation toward a never-zero Room-Black floor (UX-DR17: distant
//     machines dim toward Room Black but never read dead; liveness tiers
//     stay invisible, AD-27). Deliberately NOT three.js Fog: Fog would be
//     new Three-seam vocabulary, would fade the Room-Black ceiling and the
//     emissive faces uncontrolled, and would fight the DW-23 tone-curve law
//     (plan: decision 1). The haze multiplies point-light intensity only —
//     the exactly-two emissive faces per Cabinet are never distance-ramped.
//   - glowPulse: one gentle swell per attract cycle from the cabinet phase
//     counter (kernel tick state, AD-3), bounded in [GLOW_PULSE_FLOOR, 1]
//     — never black, always glowing. flashRateHz + the <= 3/sec guard is
//     the owner-fixed NFR-9 law shape; the machine probe is Story 3.7's L2.
//   - spillAnchors + buildSpillNodes: glow bleeding around an occluder's
//     far edges — a floor-sheen mount and a ceiling-bounce mount per
//     relevant edge, authored POINT LIGHTS (plan: decision 2 — not painted
//     glow sheets (UX-DR1 "all color is light-from-a-machine"), not
//     volumetric cones), created ONCE through the buildRoomScene idiom.
//     Anchors derive from the VOLUME record only — never a raycast.
//
// The tier is cabinet-mesh-independent (the DW-29 separation contract): it
// mounts from placementGeometry/slot records, the collisionVolumes records
// and the authored face constants — it names no shell profile, part list,
// or mesh, so any cabinet rebuild re-mounts it untouched. Every number is a
// labelled placeholder ("tuned by eye at the smoke" family; the finals are
// Story 3.7's authored-data pass per AD-27's Deferred row). No wall clock,
// no Date/performance identifiers (the room-scoped scan in
// atmosphere.test.ts enrols this module automatically), no core/audio
// import (the asymmetry pin).

import { math } from "../contract/index.ts";
import { CABINET_LIGHT_INTENSITY, placementGeometry, type CabinetPlacement, type Vec2XZ } from "./cabinets.ts";
import { WALL_TOP, type CollisionVolume } from "./collision-volumes.ts";
import type { Placed, RoomScene, Three } from "./scene.ts";

// --- Haze law (labelled placeholders; finals 3.7) ----------------------------
// hazeFactor(d): 1 inside the authored near radius (the doorway->machine
// pull distance reads at full nominal — the I/O matrix "Near source" leg),
// strictly decreasing beyond it, clamped at a never-zero floor so far
// machines dim toward Room Black but never read dead (UX-DR17).
/** The haze floor: the never-zero Room-Black dim ratio (labelled
 * placeholder — a floor of 0 is the falsifiable "reads dead" bug). */
export const HAZE_FLOOR = 0.25;
/** The near radius, metres: inside it the haze law stays exactly 1 (the
 * authored doorway pose to the back-row machine sits inside it — the pull
 * from the door never hazes). (labelled placeholder) */
export const HAZE_NEAR_M = 12.5;
/** Falloff coefficient, 1/metre beyond the near radius: full attenuation
 * lands ~16.7 m past HAZE_NEAR_M, and the floor clamps the tail (labelled
 * placeholder). */
export const HAZE_COEFF = 0.06;

/** Monotone non-increasing haze multiplier in [HAZE_FLOOR, 1] at camera
 * distance `distanceM` (XZ-plane, the way every room distance in this repo
 * is measured). Equals 1 inside HAZE_NEAR_M, strictly decreasing until the
 * floor clamps. */
export function hazeFactor(distanceM: number): number {
  if (!(distanceM > HAZE_NEAR_M)) return 1;
  const raw = 1 - (distanceM - HAZE_NEAR_M) * HAZE_COEFF;
  return raw < HAZE_FLOOR ? HAZE_FLOOR : raw;
}

// --- Attract glow pulse (labelled placeholders; finals 3.7) ------------------
// One gentle swell per attract cycle: the multiplier completes exactly one
// cycle over TWO GLOW_PULSE_PERIOD_TICKS, and the authored placeholder ties
// 2 * GLOW_PULSE_PERIOD_TICKS to CABINET_PHASE_CYCLE_TICKS (240) — pinned
// literally in atmosphere.test.ts, so the "exactly one gentle cycle per
// phase cycle" law is visible in the constants and not only in the curve.
// The pulse applies to every lit Cabinet identically, independent of
// occupancy (both standard models always glowing, always performing).
/** The pulse floor (labelled placeholder — a floor of 0 is the falsifiable
 * "goes black mid-swell" bug; the machine keeps glowing, AD-27). */
export const GLOW_PULSE_FLOOR = 0.7;
/** Pulse period in ticks (labelled placeholder; half an attract cycle =>
 * one swell per cycle, 0.5 Hz by the flash-rate law — well under the
 * owner-fixed ceiling). */
export const GLOW_PULSE_PERIOD_TICKS = 120;
/** The owner-fixed flash ceiling, flashes per second per authored element
 * (NFR-9 — stated in the PRD/epics, used as given, never re-derived; the
 * machine probe across all authored elements is Story 3.7's L2 tier). */
export const FLASH_RATE_CEILING_PER_SEC = 3;

/** Flash rate, per second, of a periodic effect with `periodTicks` at the
 * fixed 60 Hz kernel rate (AD-3: tick time, never wall time). */
export function flashRateHz(periodTicks: number): number {
  return 60 / periodTicks;
}

/** The NFR-9 law shape: an authored periodic glow effect must not flash
 * faster than the owner-fixed ceiling. */
export function flashRateCompliant(periodTicks: number): boolean {
  return flashRateHz(periodTicks) <= FLASH_RATE_CEILING_PER_SEC;
}

/**
 * The attract glow-pulse multiplier at cabinet phase `phaseStep` (the
 * runtime's phase counter, ticks — pure tick state, AD-3/AD-15). One
 * gentle swell per attract cycle: floor at phase 0, peak 1 at half the
 * cycle, back to the floor at the cycle end; never black (the multiplier
 * stays in [GLOW_PULSE_FLOOR, 1], never 0). Deterministic: identical
 * inputs replay identically (the twin pin mirrors budget.test.ts).
 */
export function glowPulse(phaseStep: number): number {
  const cycle = 2 * GLOW_PULSE_PERIOD_TICKS;
  const t = ((phaseStep % cycle) + cycle) % cycle;
  const swell = 0.5 - 0.5 * math.cos((math.PI * t) / GLOW_PULSE_PERIOD_TICKS);
  const m = GLOW_PULSE_FLOOR + (1 - GLOW_PULSE_FLOOR) * swell;
  return Math.min(1, Math.max(GLOW_PULSE_FLOOR, m));
}

// --- Pillar spill anchors (labelled placeholders; finals 3.7) ----------------
// Anchors derive from the VOLUME record ONLY (no raycast, no core/audio —
// the visual mechanism authors around the same blocker geometry on purpose).
// Per relevant edge (the AABB face on the side away from the source along
// each axis), two mounts: a low grazing floor mount (reads as a sheen on
// the carpet it lights) and a ceiling-hung mount (reads as bounce). The
// era-true read rides hue + mount — point lights only.
/** How far past the occluder face the anchor sits, metres (labelled
 * placeholder; the falsifiable sign-flip bug is an anchor INSIDE the AABB). */
export const SPILL_OFFSET_M = 0.4;
/** Floor-sheen mount height, metres above the floor (labelled placeholder). */
export const SPILL_FLOOR_MOUNT_M = 0.12;
/** Ceiling-bounce mount inset below the wall top, metres — the mount height
 * derives from the authored WALL_TOP, never a retyped 3.0 (labelled
 * placeholder). */
export const SPILL_CEILING_INSET_M = 0.2;
/** Reach of each bleed point light, metres (labelled placeholder). */
export const SPILL_REACH_M = 5;
/** Nominal intensity of a bleed node — derived from the cabinet light
 * nominal the haze multiplies, never retyped (labelled placeholder; 3.7
 * may re-tune it beside the cabinet pair). */
export const SPILL_INTENSITY = CABINET_LIGHT_INTENSITY;

export type SpillMount = "floor" | "ceiling";

export interface SpillAnchor {
  x: number;
  z: number;
  mount: SpillMount;
}

/** Mount height, metres, for one spill mount kind. */
export function spillMountY(mount: SpillMount): number {
  return mount === "floor" ? SPILL_FLOOR_MOUNT_M : WALL_TOP - SPILL_CEILING_INSET_M;
}

/**
 * The spill anchors around `occluderVolume` for a machine at
 * `sourceCenter`: for each AABB face on the side away from the source
 * (each axis where the source is not exactly aligned with the volume
 * centre), a floor mount and a ceiling mount, each sitting exactly
 * SPILL_OFFSET_M outside the AABB past that face, face-centred on the
 * other axis. An exactly-aligned source gets no anchor on that axis (the
 * bleed would be symmetric — authored sources never align exactly).
 * Count: two mounts per relevant edge — a formula over the record, never
 * a magic number.
 */
export function spillAnchors(sourceCenter: Vec2XZ, occluderVolume: CollisionVolume): SpillAnchor[] {
  const v = occluderVolume;
  const cx = (v.min.x + v.max.x) / 2;
  const cz = (v.min.z + v.max.z) / 2;
  const faces: Vec2XZ[] = [];
  if (sourceCenter.x < cx) faces.push({ x: v.max.x + SPILL_OFFSET_M, z: cz });
  else if (sourceCenter.x > cx) faces.push({ x: v.min.x - SPILL_OFFSET_M, z: cz });
  if (sourceCenter.z < cz) faces.push({ x: cx, z: v.max.z + SPILL_OFFSET_M });
  else if (sourceCenter.z > cz) faces.push({ x: cx, z: v.min.z - SPILL_OFFSET_M });
  const anchors: SpillAnchor[] = [];
  for (const f of faces) {
    anchors.push({ x: f.x, z: f.z, mount: "floor" });
    anchors.push({ x: f.x, z: f.z, mount: "ceiling" });
  }
  return anchors;
}

export interface SpillNodeHandle {
  /** The SOURCE cabinet's volume id — the frame ramps each node from its
   * source machine's numbers, carrying the gradient into the blind spots. */
  volumeId: string;
  mount: SpillMount;
  light: Placed;
}

/**
 * Build the spill tier ONCE into `scene` (the buildRoomScene idiom — static
 * authored nodes; the frame side only WRITES their intensity from tick
 * state). Sources are the placement records (read via placementGeometry —
 * cabinet-mesh-independent), occluders are the volume records with kind
 * "pillar" (the authored blocker pair the sightline/audio law names; the
 * room-growth call for wider occluder sets is Story 3.7's, per the
 * frontmatter deferred item). Every node is BUILT DARK: the frame's glow
 * ramp lights them (the frontDoor street-pair posture).
 */
export function buildSpillNodes(
  THREE: Three,
  scene: RoomScene,
  volumes: readonly CollisionVolume[],
  placements: readonly CabinetPlacement[],
): SpillNodeHandle[] {
  const nodes: SpillNodeHandle[] = [];
  for (const p of placements) {
    const g = placementGeometry(p.slotId);
    for (const v of volumes) {
      if (v.kind !== "pillar") continue;
      for (const a of spillAnchors(g.center, v)) {
        const light = THREE.pointLight(p.marqueeHue, 0, SPILL_REACH_M); // BUILT DARK
        light.position.set(a.x, spillMountY(a.mount), a.z);
        scene.add(light);
        nodes.push({ volumeId: p.volumeId, mount: a.mount, light });
      }
    }
  }
  return nodes;
}

/**
 * The console-smoke read-back row for one cabinet (the arcadeDebug
 * .atmosphere leg — plain data, zero UI, UX-DR18/AD-24; the lead's smoke
 * walk reads the gradient's NUMBERS, while the by-sight visual read stays
 * the deferred browser tier). The frame WRITES these rows from tick state
 * every frame; the boot-time row is the identity stand.
 */
export interface AtmosphereDebug {
  volumeId: string;
  distanceM: number;
  hazeFactor: number;
  pulseApplied: number;
  glowIntensity: number;
}
