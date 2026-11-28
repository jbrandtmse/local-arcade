// Story 1.3 (AC1/AC3): the authored Arcade Room AABB list — the 1.2
// placeholder data rewritten IN PLACE (spine Conventions row "Room geometry
// & collision"): this one list is the single source for movement blocking,
// the occluder collider set for Epic 2's Audio Manager raycasts (AD-7:
// "what blocks the ear blocks the eye"), and visual extrusion (scene.ts).
// Collision/render code never hardcodes geometry; the resolver (1.2,
// untouched) is code, these volumes are data.
//
// Contract numbers from room-layout.md (that file wins over the floor plan):
// interior 19m x 12.5m, slot pitch 1.40m, aisles never <1.20m. Front door
// bottom-center, closed and blocking (the open beat is 1.9); street-side
// geometry beyond it. The two occluder pillars are authored by measurement,
// NOT plan pixels (spec Design Notes item 2, inference): both sampled
// door->backmost-side-slot sightlines break on exactly one pillar, both
// door->frontmost-slot roadmap sightlines stay clear (the CAP-2 success),
// and every pillar->cabinet-box gap is >=5m.
//
// Coordinates: X across the room, Z from the front door (+Z) to the back
// wall (-Z), Y up. Collision resolves in the XZ plane; Y extents serve the
// render/occluder reuse. Wall thickness 0.25 and wall height 3.0 are
// (inference); the interior envelope is contract.

import { cabinetAABB, cabinetPlacements } from "./cabinets.ts";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// "cabinet" entries are 1.4's authored stand-up shells (core/room/cabinets.ts
// placement records, derived below): blocking, targetable, and the body box
// the scene extrudes all come from these list entries — the one-source law
// in geometry form (blocking + Epic 2 occlusion + render never diverge).
export type VolumeKind = "wall" | "pillar" | "door" | "street" | "cabinet";

export interface CollisionVolume {
  id: string;
  min: Vec3;
  max: Vec3;
  blocksMovement: boolean;
  targetable: boolean;
  kind: VolumeKind;
}

/** Interior envelope contract dimensions (room-layout.md). */
export const INTERIOR = { width: 19, depth: 12.5 } as const;

// Authored entry spawn: just inside the front door, facing the back wall
// (spec Design Notes item 9; the 1.2 controller default spawn stays for
// tests). yaw 0 looks toward -Z.
export const ENTRY_SPAWN = { x: 0, z: 5.6, yaw: 0 } as const;

const HALF_X = INTERIOR.width / 2; // 9.5
const HALF_Z = INTERIOR.depth / 2; // 6.25
/** Wall thickness, metres — (inference); scene.ts reads it, never retypes. */
export const WALL_T = 0.25;
/** Wall height, metres — (inference, spec Design Notes item 6); scene.ts
 * rests the ceiling on it, never retypes it. */
export const WALL_TOP = 3.0;
/** Door panel thickness, metres — (inference, Design Notes item 6); pins
 * derive from it, never retype it. */
export const DOOR_T = 0.12;
/** Door head height (inference, Design Notes item 6); the door glow sits
 * above it, never retyped. */
export const DOOR_TOP = 2.1;
/** Half-width of the 1.0m bottom-center door gap — (inference, Design Notes
 * item 6); pins derive from it, never retype it. */
export const DOOR_HALF_W = 0.5;

export const collisionVolumes: readonly CollisionVolume[] = [
  // Wall boxes closing the 19m x 12.5m interior envelope. wall-front is
  // replaced by two segments leaving the bottom-center door gap.
  {
    id: "wall-back",
    min: { x: -(HALF_X + WALL_T), y: 0, z: -(HALF_Z + WALL_T) },
    max: { x: HALF_X + WALL_T, y: WALL_TOP, z: -HALF_Z },
    blocksMovement: true,
    targetable: false,
    kind: "wall",
  },
  {
    id: "wall-front-left",
    min: { x: -(HALF_X + WALL_T), y: 0, z: HALF_Z },
    max: { x: -DOOR_HALF_W, y: WALL_TOP, z: HALF_Z + WALL_T },
    blocksMovement: true,
    targetable: false,
    kind: "wall",
  },
  {
    id: "wall-front-right",
    min: { x: DOOR_HALF_W, y: 0, z: HALF_Z },
    max: { x: HALF_X + WALL_T, y: WALL_TOP, z: HALF_Z + WALL_T },
    blocksMovement: true,
    targetable: false,
    kind: "wall",
  },
  {
    id: "wall-left",
    min: { x: -(HALF_X + WALL_T), y: 0, z: -HALF_Z },
    max: { x: -HALF_X, y: WALL_TOP, z: HALF_Z },
    blocksMovement: true,
    targetable: false,
    kind: "wall",
  },
  {
    id: "wall-right",
    min: { x: HALF_X, y: 0, z: -HALF_Z },
    max: { x: HALF_X + WALL_T, y: WALL_TOP, z: HALF_Z },
    blocksMovement: true,
    targetable: false,
    kind: "wall",
  },
  // The street-side door. Story 2.4 (Design Notes item 2): the walk-out
  // exit — the panel volume stays authored (it still draws the door and
  // the door glow anchors to it) but no longer blocks movement: crossing
  // it outward opens the settings panel (the crossing detector is core/
  // main.ts's pose dead-band read; the street-wall bounds the strip).
  {
    id: "door-front",
    min: { x: -DOOR_HALF_W, y: 0, z: HALF_Z },
    max: { x: DOOR_HALF_W, y: DOOR_TOP, z: HALF_Z + DOOR_T },
    blocksMovement: false, // open to walking through (Story 2.4; was closed in 1.x)
    targetable: false,
    kind: "door",
  },
  // Two occluder pillars, 0.5m squares centered (±3.5, 2.1) — ids kept from
  // 1.2. This set serves sight now (sampled sightlines break on exactly one
  // pillar) and Epic 2 audio raycasts later (AD-7).
  {
    id: "pillar-1",
    min: { x: -3.75, y: 0, z: 1.85 },
    max: { x: -3.25, y: WALL_TOP, z: 2.35 },
    blocksMovement: true,
    targetable: false,
    kind: "pillar",
  },
  {
    id: "pillar-2",
    min: { x: 3.25, y: 0, z: 1.85 },
    max: { x: 3.75, y: WALL_TOP, z: 2.35 },
    blocksMovement: true,
    targetable: false,
    kind: "pillar",
  },
  // Street side beyond the front wall (spec Design Notes item 6): the floor
  // is walkable-looking but not yet walkable — the load beat is 1.9 — and a
  // far wall bounds the strip. Volumes outside the room envelope use kind
  // "street".
  {
    id: "street-floor",
    min: { x: -4, y: 0, z: 6.5 },
    max: { x: 4, y: 0.05, z: 8.25 },
    blocksMovement: false, // visible geometry; not a blocker
    targetable: false,
    kind: "street",
  },
  {
    id: "street-wall",
    min: { x: -4, y: 0, z: 8.25 },
    max: { x: 4, y: WALL_TOP, z: 8.5 },
    blocksMovement: true,
    targetable: false,
    kind: "street",
  },
  // Story 1.4: the authored stand-up shells — one entry per placement record
  // (core/room/cabinets.ts), AABB derived from the record, never hand-copied.
  // Standing on their Wall Slot baseplates; blocking + targetable per the
  // volume-kind grammar (the E-openable coin door rides the targetable leg).
  ...cabinetPlacements.map((p) => {
    const box = cabinetAABB(p);
    return {
      id: p.volumeId,
      min: box.min,
      max: box.max,
      blocksMovement: true,
      targetable: true,
      kind: "cabinet" as const,
    };
  }),
];
