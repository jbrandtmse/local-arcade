// Story 1.3 (AC2): the authored Wall Slot config — 20 pre-declared, evenly
// spaced slots under a revision id (AD-10). Pure data: the Layout System
// (Epic 3) reads `index` as its fill scan order (back->front, alternating
// L/R after the back row, skip-when-exhausted implemented there) and this
// module's first consumer is Story 1.4 (stand-up shells into slots). Slots
// are deliberately NOT collision volumes: empty slots are walkable roadmap
// (Design Notes: separate from the volume list on purpose).
//
// Contract: slot pitch exactly 1.40m (room-layout.md). Run extents are
// authored from the plan's wall proportions (inference, spec Design Notes
// item 1): back row 7 slots x -4.2..4.2, left run 7 slots z -3.5..4.9,
// right run 6 slots z -3.5..3.5 (the front stop keeps clear of the future
// Snack Bar counter at z >= 4.5). Slot center sits 0.40m off the wall face
// with a 0.70 (along wall) x 0.60 (depth) footprint; the 0.70 along-wall
// width keeps 0.70m clearance between adjacent filled slots (inference,
// Design Notes item 3 — room-layout's ~0.60m footprint is approximate;
// the 1.40 pitch is the exact contract).

export interface SlotCenter {
  x: number;
  z: number;
}

/** Room-facing normal of the wall the slot stands against (XZ plane). */
export interface SlotFacing {
  x: number;
  z: number;
}

export interface WallSlot {
  id: string;
  /** Which wall run the slot belongs to. */
  wall: "back" | "left" | "right";
  /** Fill scan order (AD-10): B0..B6 left->right, then L0,R0,L1,R1,...
   * (the alternation governs the side runs; L6 lands last because the
   * right run exhausts first — the Layout System skips exhausted sides). */
  index: number;
  center: SlotCenter;
  facing: SlotFacing;
  /** Footprint: alongWall is the width along the wall, depth sticks out. */
  footprint: { alongWall: number; depth: number };
}

export const WALL_SLOT_REVISION = "wallslots-r1-2026-11-21";

/** Contract pitch, metres (room-layout.md). */
export const SLOT_PITCH = 1.4;

const BACK: SlotFacing = { x: 0, z: 1 };
const LEFT: SlotFacing = { x: 1, z: 0 };
const RIGHT: SlotFacing = { x: -1, z: 0 };

function slot(
  id: string,
  wall: WallSlot["wall"],
  index: number,
  x: number,
  z: number,
  facing: SlotFacing,
): WallSlot {
  return { id, wall, index, center: { x, z }, facing, footprint: { alongWall: 0.7, depth: 0.6 } };
}

// Authored centres (literal data, not computed): 1.40m consecutive pitch
// within each run.
export const wallSlots: readonly WallSlot[] = [
  // Back row B0..B6, left->right, centre 0.40m off the back wall face.
  slot("B0", "back", 0, -4.2, -5.85, BACK),
  slot("B1", "back", 1, -2.8, -5.85, BACK),
  slot("B2", "back", 2, -1.4, -5.85, BACK),
  slot("B3", "back", 3, 0, -5.85, BACK),
  slot("B4", "back", 4, 1.4, -5.85, BACK),
  slot("B5", "back", 5, 2.8, -5.85, BACK),
  slot("B6", "back", 6, 4.2, -5.85, BACK),
  // Left run L0..L6, back->front.
  slot("L0", "left", 7, -9.1, -3.5, LEFT),
  slot("L1", "left", 9, -9.1, -2.1, LEFT),
  slot("L2", "left", 11, -9.1, -0.7, LEFT),
  slot("L3", "left", 13, -9.1, 0.7, LEFT),
  slot("L4", "left", 15, -9.1, 2.1, LEFT),
  slot("L5", "left", 17, -9.1, 3.5, LEFT),
  slot("L6", "left", 19, -9.1, 4.9, LEFT),
  // Right run R0..R5, back->front.
  slot("R0", "right", 8, 9.1, -3.5, RIGHT),
  slot("R1", "right", 10, 9.1, -2.1, RIGHT),
  slot("R2", "right", 12, 9.1, -0.7, RIGHT),
  slot("R3", "right", 14, 9.1, 0.7, RIGHT),
  slot("R4", "right", 16, 9.1, 2.1, RIGHT),
  slot("R5", "right", 18, 9.1, 3.5, RIGHT),
];

/** The unfilled front stretches that read as the roadmap (CAP-2 seed):
 * amber-lit, visible unobstructed from the entry spawn. */
export const ROADMAP_STRETCH_SLOTS = ["L4", "L5", "L6", "R3", "R4", "R5"] as const;

/** Empty-slot baseplate: Wall Panel, 0.70 x 0.62, raised 0.02 off the
 * carpet — the "same visual language" anchor 1.4's shell sits on
 * (inference, spec Design Notes item 3). */
export const EMPTY_BASEPLATE = {
  alongWall: 0.7,
  depth: 0.62,
  raise: 0.02,
  thickness: 0.05,
} as const;
