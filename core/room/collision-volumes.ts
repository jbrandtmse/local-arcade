// Story 1.2 (AC6): authored placeholder collision volumes — the first
// occupant of core/room. Pure data, no logic. The player resolver
// (core/player.ts) reads this list; Story 1.3 replaces/extends the entries
// in place, and the occluder collider set and visual geometry (1.3, Epic 2
// audio) reuse the same list shape — one authored AABB list serves collision
// now and occluder/render geometry later.
//
// Contract numbers from room-layout.md: interior ~19m x 12.5m, Wall Slot
// pitch ~1.40m, stand-up footprint ~0.60m, eye height 1.60m, aisles >=1.20m.
// The two pillar stubs and the three cabinet stubs' exact positions are
// placeholder (spec Design Notes item 3, inference) — tests pin ids, not
// raw coords, so 1.3's rewrite moves the data without rework.
//
// Coordinates: X across the room, Z from the front door (+Z) to the back
// wall (-Z), Y up. Collision resolves in the XZ plane; the Y extents exist
// for the future render/occluder reuse.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type VolumeKind = "wall" | "pillar" | "cabinet";

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

const HALF_X = INTERIOR.width / 2; // 9.5
const HALF_Z = INTERIOR.depth / 2; // 6.25
const WALL_T = 0.25; // placeholder thickness; visual extrusion is 1.3's job
const WALL_TOP = 3; // placeholder height; real wall art is 1.3's job

// Wall Slot pitch 1.40m along the back wall; ~0.60m stand-up footprint depth.
const CABINET_PITCH = 1.4;
const CABINET_W = 0.75;
const CABINET_D = 0.6;
const CABINET_H = 1.8;

function cabinetStub(id: string, center: number): CollisionVolume {
  return {
    id,
    min: { x: center - CABINET_W / 2, y: 0, z: -HALF_Z },
    max: { x: center + CABINET_W / 2, y: CABINET_H, z: -HALF_Z + CABINET_D },
    blocksMovement: true,
    targetable: true, // E-targeting (UX-DR18): the coin door's consumer is 1.4
    kind: "cabinet",
  };
}

export const collisionVolumes: readonly CollisionVolume[] = [
  // Four wall boxes closing the 19m x 12.5m interior envelope.
  {
    id: "wall-back",
    min: { x: -(HALF_X + WALL_T), y: 0, z: -(HALF_Z + WALL_T) },
    max: { x: HALF_X + WALL_T, y: WALL_TOP, z: -HALF_Z },
    blocksMovement: true,
    targetable: false,
    kind: "wall",
  },
  {
    id: "wall-front",
    min: { x: -(HALF_X + WALL_T), y: 0, z: HALF_Z },
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
  // Two occluder-pillar stubs break sightlines on purpose (room-layout.md);
  // positions placeholder (inference), ids stable for 1.3.
  {
    id: "pillar-1",
    min: { x: -4.2, y: 0, z: -1.2 },
    max: { x: -3.8, y: WALL_TOP, z: -0.8 },
    blocksMovement: true,
    targetable: false,
    kind: "pillar",
  },
  {
    id: "pillar-2",
    min: { x: 3.8, y: 0, z: 0.8 },
    max: { x: 4.2, y: WALL_TOP, z: 1.2 },
    blocksMovement: true,
    targetable: false,
    kind: "pillar",
  },
  // Three cabinet stubs at 1.40m pitch along the back wall, kept clear of
  // the Pinball Corner (back-left) and Workshop (back-right) zones.
  cabinetStub("cabinet-1", -CABINET_PITCH),
  cabinetStub("cabinet-2", 0),
  cabinetStub("cabinet-3", CABINET_PITCH),
];
