// Story 1.4 (AC1-AC4): the ONE authored stand-up shell — Moon Patrol's, in
// slot B0, the composition _bmad-output/planning-artifacts/ux-designs/
// ux-local-arcade-2026-11-20/mockups/cabinet-close-up.html draws — as
// authored data beside its siblings (slot-config.ts, zones.ts): the shell spec, one
// placement record (a room-data record, NOT a Layout System fill — AD-10),
// the coin-door state + toggle + pose law, the attract-phase state + step +
// paint-step law, and the exported pin constants. The screen is alive by
// kernel phase, never by wall clock (AD-3/AD-15): state mutates only when
// the "cabinets" kernel system steps it inside the tick; render only READS.
// collision-volumes.ts derives the "cabinet-B0" entry FROM these placements
// (one geometry source); this module never imports that list — the direction
// stays acyclic. Numbers that are not contract values are (inference),
// "tuned by eye at the smoke" (1.3 precedent).

import { math } from "../contract/index.ts";
import { GLOW_CYAN, GLOW_MARQUEE } from "./tokens.ts";
import { wallSlots } from "./slot-config.ts";

// --- Shell spec (hard-cornered boxes only; mockup rounded.cabinet 0px) -----
// Body footprint 0.60m x 0.60m is room-layout's stand-up contract; the rest
// (inference from the mockup's stacked composition within that width):
// body height 1.80m, marquee face 0.58 x 0.50 at y 1.55 (the face widened
// toward the 0.60m body width per the spec's residual-risk lever), screen
// face 0.44 x 0.52 at y 1.05 (grown taller than the first reading so the
// 0.18m-next-minimum NEXT row and the attract band stack without overlap),
// coin door 0.26 x 0.30 at y 0.58, coin slot detail ON the door's upper
// face (the mockup nests .slot inside .coindoor, ~20% below the door top).
export interface CabinetShellSpec {
  body: { width: number; depth: number; height: number };
  marquee: { width: number; height: number; depth: number; centerY: number };
  bezel: { width: number; height: number; depth: number; centerY: number };
  screen: { width: number; height: number; centerY: number };
  coinDoor: { width: number; height: number; thickness: number; centerY: number };
  coinSlot: { width: number; height: number; thickness: number; centerY: number };
}

export const SHELL: CabinetShellSpec = {
  body: { width: 0.6, depth: 0.6, height: 1.8 },
  marquee: { width: 0.58, height: 0.5, depth: 0.06, centerY: 1.55 },
  bezel: { width: 0.48, height: 0.56, depth: 0.04, centerY: 1.05 },
  screen: { width: 0.44, height: 0.52, centerY: 1.05 },
  coinDoor: { width: 0.26, height: 0.3, thickness: 0.02, centerY: 0.58 },
  // Slot centre y 0.67: the mockup's .slot sits ~20% below the .coindoor
  // top edge (26 of 128 door px) — on the door face, inside the door's
  // 0.43..0.73 span and clear of the bezel bottom at 0.77. (inference.)
  coinSlot: { width: 0.1, height: 0.02, thickness: 0.006, centerY: 0.67 },
};

/** The scene extrudes these part meshes per shell, on top of the body box
 * the volume-list extrusion already provides (marquee bar, marquee face,
 * screen bezel, screen face, coin-door panel, coin-slot detail). The scene
 * mesh-count pin derives from this number — formula, never magic. */
export const SHELL_PART_MESHES = 6;

// --- Placement (this story authors a placement RECORD; AD-10 keeps the
// Layout System's fill function Epic 3's) -------------------------------------

export interface ScreenZones {
  /** Attract zone: the game title, painted with the phase-shifted scan band. */
  attract: string;
  /** Steady NEXT signal at the 0.18m authored minimum. */
  next: string;
  /** Score rows — honestly empty until scores exist (Story 1.8; CAP-8
   * "no fake strangers": the zone renders nothing until filled). */
  score: readonly string[];
}

export interface CabinetPlacement {
  /** Collision-volume id (also the interact registry key). */
  volumeId: string;
  /** Wall Slot this shell stands on (referenced by id; slot config stays
   * UNCHANGED — the baseplate under B0 remains as the anchor). */
  slotId: string;
  /** Marquee lettering: the game-title record ONLY (AD-24) — the mockup's
   * string on this exact composition; inventory names Moon Patrol the first
   * v1 machine Story 1.5 seats here. */
  title: string;
  screenZones: ScreenZones;
  /** The cabinet's own glow family (screen + halo; the mockup marks its
   * attract title and halo as this game's family). */
  hue: number;
  /** Marquee lettering/spill hue — DESIGN's token name IS the fiction:
   * marquees are amber. */
  marqueeHue: number;
}

export const cabinetPlacements: readonly CabinetPlacement[] = [
  {
    volumeId: "cabinet-B0",
    slotId: "B0",
    title: "MOON PATROL",
    screenZones: { attract: "MOON PATROL", next: "NEXT", score: [] },
    hue: GLOW_CYAN,
    marqueeHue: GLOW_MARQUEE,
  },
];

// --- Placement geometry (derived from the slot record — coord-free) ---------

export interface Vec2XZ {
  x: number;
  z: number;
}

export interface PlacementGeometry {
  /** Body footprint centre on the authored baseplate anchor. */
  center: Vec2XZ;
  /** Wall/room normal the front faces (from the slot record). */
  facing: Vec2XZ;
  /** The horizontal direction a visitor facing the front sees as "right"
   * (up x facing): the coin-door panel's width axis, and where the closed
   * panel extends from its left-edge hinge. */
  right: Vec2XZ;
  /** Body front-plane centre (the face the parts mount on). */
  front: Vec2XZ;
}

export function placementGeometry(slotId: string): PlacementGeometry {
  const slot = wallSlots.find((s) => s.id === slotId);
  if (slot == null) throw new Error(`cabinet placement: wall slot "${slotId}" does not exist`);
  const f = { x: slot.facing.x, z: slot.facing.z };
  // up x facing — axis-aligned for authored runs (-0 normalized away so
  // exact-equality pins and downstream pose math stay FP-hygienic).
  const r = { x: f.z, z: f.x === 0 ? 0 : -f.x };
  const depth = SHELL.body.depth / 2;
  return {
    center: { x: slot.center.x, z: slot.center.z },
    facing: f,
    right: r,
    front: { x: slot.center.x + f.x * depth, z: slot.center.z + f.z * depth },
  };
}

export function placementByVolumeId(volumeId: string): CabinetPlacement {
  const p = cabinetPlacements.find((c) => c.volumeId === volumeId);
  if (p == null) throw new Error(`no cabinet placement with volume id "${volumeId}"`);
  return p;
}

/** The shell's collision AABB, derived from the placement record — the
 * body box the volume list registers AND the scene extrudes (the one-
 * geometry-source law: blocking, targetability, occlusion, and extrusion
 * all read this entry). */
export function cabinetAABB(
  placement: CabinetPlacement,
): { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } {
  const g = placementGeometry(placement.slotId);
  const halfAlong = SHELL.body.width / 2;
  const halfDepth = SHELL.body.depth / 2;
  const halfX = Math.abs(g.right.x) * halfAlong + Math.abs(g.facing.x) * halfDepth;
  const halfZ = Math.abs(g.right.z) * halfAlong + Math.abs(g.facing.z) * halfDepth;
  return {
    min: { x: g.center.x - halfX, y: 0, z: g.center.z - halfZ },
    max: { x: g.center.x + halfX, y: SHELL.body.height, z: g.center.z + halfZ },
  };
}

// --- Coin-door state + toggle + pose law (AD-25: the fixture owns its
// interaction state; it mutates only inside the tick — the E handler runs
// from player.step, itself a kernel system) -----------------------------------

export interface CabinetRuntime {
  /** Attract phase counter, ticks mod CABINET_PHASE_CYCLE_TICKS. */
  phase: number;
  /** Open/closed per cabinet volume id (mockup "coin door ajar"). */
  coinDoors: Record<string, boolean>;
}

export function createCabinetRuntime(): CabinetRuntime {
  const coinDoors: Record<string, boolean> = {};
  for (const p of cabinetPlacements) coinDoors[p.volumeId] = false;
  return { phase: 0, coinDoors };
}

/** The default runtime the browser entry wires (tests build their own with
 * createCabinetRuntime — hermetic, order-free). */
export const cabinets: CabinetRuntime = createCabinetRuntime();

export function toggleCoinDoor(runtime: CabinetRuntime, volumeId: string): void {
  if (!(volumeId in runtime.coinDoors)) {
    throw new Error(`toggleCoinDoor: no cabinet volume "${volumeId}" (register handlers per placement)`);
  }
  runtime.coinDoors[volumeId] = !runtime.coinDoors[volumeId];
}

export function coinDoorOpen(runtime: CabinetRuntime, volumeId: string): boolean {
  return runtime.coinDoors[volumeId] === true;
}

/** Pose of one shell's coin-door panel AND the coin-slot detail riding it,
 * given open/closed. Closed: flush with the body front, panel centre on the
 * front plane. Open: swung 90 deg OUT about the panel's left vertical hinge
 * — deterministic position+rotation math, no trig FP: the 90 deg rotation is
 * the exact axis swap (x,z) -> (-z,x). */
export interface CabinetPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface DoorPose {
  panel: CabinetPose;
  slot: CabinetPose;
}

/** Closed yaw for an axis-aligned facing: the panel's local +X maps to the
 * visitor-right direction, its local +Z to the facing. */
function closedYaw(facing: Vec2XZ): number {
  if (facing.x === 0 && facing.z === 1) return 0;
  if (facing.x === 1 && facing.z === 0) return math.HALF_PI;
  if (facing.x === 0 && facing.z === -1) return math.PI;
  if (facing.x === -1 && facing.z === 0) return -math.HALF_PI;
  throw new Error("closedYaw: cabinet facings are axis-aligned authored slots");
}

export function coinDoorPose(volumeId: string, open: boolean): DoorPose {
  const placement = placementByVolumeId(volumeId);
  const g = placementGeometry(placement.slotId);
  const door = SHELL.coinDoor;
  const slot = SHELL.coinSlot;
  const yaw0 = closedYaw(g.facing);
  // Closed panel centre: on the front plane, half-thickness proud of it.
  const panelX = g.front.x + g.facing.x * (door.thickness / 2);
  const panelZ = g.front.z + g.facing.z * (door.thickness / 2);
  const slotX = g.front.x + g.facing.x * (door.thickness + slot.thickness / 2);
  const slotZ = g.front.z + g.facing.z * (door.thickness + slot.thickness / 2);
  // The panel's LEFT vertical hinge (a visitor facing the front sees left):
  // the panel centre pulled half the panel width along -right.
  const hingeX = panelX - g.right.x * (door.width / 2);
  const hingeZ = panelZ - g.right.z * (door.width / 2);
  const swing = (px: number, pz: number): { x: number; z: number } => {
    if (!open) return { x: px, z: pz };
    // Rotate about the hinge by -90 deg about Y: (dx,dz) -> (-dz,dx).
    return { x: hingeX - (pz - hingeZ), z: hingeZ + (px - hingeX) };
  };
  const panelSwung = swing(panelX, panelZ);
  const slotSwung = swing(slotX, slotZ);
  const yaw = open ? yaw0 - math.HALF_PI : yaw0;
  return {
    panel: { x: panelSwung.x, y: door.centerY, z: panelSwung.z, yaw },
    slot: { x: slotSwung.x, y: slot.centerY, z: slotSwung.z, yaw },
  };
}

// --- Attract phase + paint-step law (liveness law: motion is kernel-tick
// state; the screen repaints only when its paint step changes) ----------------

/** Phase cycle length, ticks: ~4 s at 60 Hz (inference — a slow CRT drift;
 * the <=3/sec flash ceiling binds Epic 3, calm now: NEXT never flashes). */
export const CABINET_PHASE_CYCLE_TICKS = 240;

/** Ticks per screen paint step: the repaint cadence floor (inference) — the
 * scan band drifts one step every this many ticks, so equal tick counts
 * always land on the same paint step (determinism), and 30 ticks is three
 * steps (a dead screen fails the matrix's liveness row). */
export const SCREEN_PAINT_STEP_TICKS = 10;

export function stepCabinetPhase(runtime: CabinetRuntime, ticks: number): void {
  runtime.phase = (runtime.phase + ticks) % CABINET_PHASE_CYCLE_TICKS;
}

export function screenPaintStep(runtime: CabinetRuntime): number {
  return Math.floor(runtime.phase / SCREEN_PAINT_STEP_TICKS);
}

// --- Pin constants (the scene/test pins derive from these, never retype) ----

/** Marquee cap height, metres — CONTRACT floor (DESIGN typography front-
 * matter: "cap height 0.18m on the marquee bar; legible to ~15m"; the cap
 * is never shrunk below it — a title that cannot fit at the floor throws
 * loudly, the paintFlyer fit-law sibling). */
export const MARQUEE_CAP_M = 0.18;

/** Negative letter-spacing the marquee/screen fit law may tighten a line by,
 * in ems of the cap height — (inference; the spec's residual-risk note
 * pre-authorised this lever, and it was pulled in stage: at the 1.3 fake-
 * measure idiom's ~0.92em condensed advance, a 6-char word on the <=0.60m
 * body-width bar at the 0.18m floor needs ~ -0.486em, so the first reading
 * of -0.25em cannot close the gap. The 0.18m cap itself is NOT a lever.) */
export const MARQUEE_LETTER_SPACING_EM_FLOOR = -0.5;

/** Attract-zone title cap, metres — (inference; the mockup's attract title
 * sits smaller than the marquee caps; the 0.18m floor binds the marquee
 * and the NEXT row, which paints at MARQUEE_CAP_M). */
export const SCREEN_ATTRACT_CAP_M = 0.08;

/** Cabinet point lights in three's physical candela units: marquee spill
 * amber + screen halo cyan, hues from the placement record. Each hangs on
 * its face's centre axis 0.45m out (marquee face 0.58m, screen face 0.44m
 * — both FACE_TINT on the 0.60m body), so the candela law binds: a
 * light's own contribution at a face point is INTENSITY / d². The first
 * reading reused the door-glow candela scale (15 cd at 0.30m = ~266
 * own-contribution on the face) and washed both painted faces white at
 * the smoke. This triple keeps each light's OWN contribution inside the
 * CABINET_FACE_ILLUMINANCE_CEILING / _FLOOR bounds below; summed scene
 * exposure (this pair + the sibling glow light + the 1.3 zone fill) is
 * the lead's smoke adjudication, as every brightness reading in this home
 * always has been.
 * (inference — candela-law derived at rework; "tuned by eye at the smoke"
 * binds at the lead's re-smoke.) */
export const CABINET_LIGHT_INTENSITY = 0.25;
export const CABINET_LIGHT_REACH = 4;

/** How far in front of the body front plane both cabinet glow lights hang,
 * metres along the facing (inference — the "tuned by eye at the smoke"
 * sibling of the intensity/reach pair; scene pins derive from it). 0.30m
 * failed the rework smoke — the light sat inside its own face's hot spot;
 * 0.45m spreads the inverse-square falloff across the face. Spill
 * containment is the intensity/reach pair's job — this hang reaches
 * slightly farther into the room, by design. */
export const CABINET_LIGHT_STANDOFF_M = 0.45;

/** Own-glow exposure bounds for the cabinet lights — each light's own
 * contribution at the painted face under the candela law (own-contribution
 * = INTENSITY / d², times the N·L incidence factor off-axis). The scene
 * pin checks the point directly under each light against the ceiling and
 * that face's far corner (cosined) against the floor, for the marquee and
 * the screen face each — the authored pair's incremental budget, NOT the
 * summed scene exposure (the sibling glow light and the 1.3 zone fill ride
 * on top; totals are the smoke's call). Ceiling 2: painted faces are
 * FACE_TINT (white) carrying token-hued maps — the 266 reading clipped the
 * lettering to white at the failed smoke; 2 leaves headroom above the
 * authored peak for the pair sum and the fill. Floor 0.5: own-glow under
 * it is invisible on its own, and a face that reads dark is a Dead
 * Machine by law. (inference — the by-eye pair this retune pins so CI
 * sees a blown-out or dead re-tune, not just the lead's smoke.) */
export const CABINET_FACE_ILLUMINANCE_CEILING = 2;
export const CABINET_FACE_ILLUMINANCE_FLOOR = 0.5;
