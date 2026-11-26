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

// --- Shell spec (Story 2.0 rebuild — the owner brief's stand-up silhouette) --
// Body footprint 0.60m x 0.60m x 1.80m is the room-layout stand-up contract
// and stays untouched: cabinetAABB/collisionVolumes keep serving movement,
// targetability and occlusion from the plain box. The VISUAL is authored
// shell data: two profiled side panels + a core extrusion + box assemblies
// assembled by core/room/scene.ts in a per-cabinet local-frame group
// (cabinet-kind volumes are never extruded — the spine's conventions row,
// amended 2026-11-26). The DW-29 contour records (deck/kick/hood/sidePanels)
// are deleted — the profiled panels carry the contour now, and the deck
// slab's 0.06m proud-of-coin-door overlap (DW-42) is gone with it.
export interface CabinetShellSpec {
  body: { width: number; depth: number; height: number };
  /** Marquee face sheet: the wide short strip inside the 1.80m body, centred
   * y 1.7125 (brief section 4c — the old box rode above the body at 2.12m).
   * `depth` is the sheet thickness; the retainer strips are scene geometry. */
  marquee: { width: number; height: number; depth: number; centerY: number };
  /** Screen glass + black surround in the screen sub-group (brief 4a). */
  bezel: { width: number; height: number; depth: number; centerY: number };
  /** Screen face: width/height byte-identical (0.44 x 0.52 — the brief's
   * do-not-touch list); centerY 1.28 follows the sub-group. core/seat.ts
   * reads centerY for the seated pitch — it follows automatically. */
  screen: { width: number; height: number; centerY: number };
  coinDoor: { width: number; height: number; thickness: number; centerY: number };
  coinSlot: { width: number; height: number; thickness: number; centerY: number };
}

export const SHELL: CabinetShellSpec = {
  body: { width: 0.6, depth: 0.6, height: 1.8 },
  // Brief section 4c: width 0.56, height 0.15, centerY 1.7125; the face
  // sheet is 0.005 deep (the scene mounts it at z 0.2525 under the profile's
  // marquee overhang).
  marquee: { width: 0.56, height: 0.15, depth: 0.005, centerY: 1.7125 },
  // Brief 4a: bezel 0.562 x 0.585 x 0.004 in the screen sub-group centred
  // y 1.28 (the sub-group carries the lean).
  bezel: { width: 0.562, height: 0.585, depth: 0.004, centerY: 1.28 },
  screen: { width: 0.44, height: 0.52, centerY: 1.28 },
  coinDoor: { width: 0.26, height: 0.3, thickness: 0.02, centerY: 0.58 },
  // Slot centre y 0.67: the mockup's .slot sits ~20% below the .coindoor
  // top edge (26 of 128 door px) — on the door face, on the 0.80m front
  // panel's face plane z 0.30 (the brief's front panel keeps the exact
  // plane coinDoorPose already mounts on). (inference, unchanged.)
  coinSlot: { width: 0.1, height: 0.02, thickness: 0.006, centerY: 0.67 },
};

// --- The two authored profiles (brief section 2, byte-for-byte) ---------------
// Each point is (z, y) in the cabinet's LOCAL frame: z is depth (front is
// positive), y is height; polygons close back to their first point. The
// scene maps profile z onto the extrusion Shape's x and profile y onto its
// y, then rotates the mesh -90 deg about Y (brief section 3).

export interface ProfilePoint {
  x: number;
  y: number;
}

/** The plywood side-panel outline: toe-kick recess, sloped control panel,
 * screen opening, marquee overhang, back-top chamfer (11 points). */
export const SIDE_PROFILE: readonly ProfilePoint[] = [
  { x: -0.3, y: 0.0 }, // 0 back, floor
  { x: 0.24, y: 0.0 }, // 1 toe-kick, floor
  { x: 0.24, y: 0.1 }, // 2 top of toe-kick recess
  { x: 0.3, y: 0.1 }, // 3 front panel starts
  { x: 0.3, y: 0.9 }, // 4 front lip of control panel
  { x: 0.12, y: 0.97 }, // 5 rear of control panel
  { x: 0.02, y: 1.57 }, // 6 top of screen opening
  { x: 0.26, y: 1.63 }, // 7 marquee overhang, bottom front
  { x: 0.26, y: 1.8 }, // 8 marquee, top front
  { x: -0.18, y: 1.8 }, // 9 top, toward the back
  { x: -0.3, y: 1.66 }, // 10 back top chamfer
];

/** The solid core between the side panels; it sits slightly behind the side
 * panel edges so the sides stand proud and the screen is recessed (12
 * points). */
export const INNER_PROFILE: readonly ProfilePoint[] = [
  { x: -0.29, y: 0.0 }, // 0 back, floor
  { x: 0.23, y: 0.0 }, // 1 kick board, floor
  { x: 0.23, y: 0.1 }, // 2 top of kick board
  { x: 0.28, y: 0.1 }, // 3 front panel starts
  { x: 0.28, y: 0.895 }, // 4 front lip of control panel
  { x: 0.115, y: 0.965 }, // 5 rear of control panel
  { x: 0.06, y: 0.99 }, // 6 bottom of screen recess
  { x: -0.04, y: 1.57 }, // 7 top of screen recess
  { x: 0.25, y: 1.63 }, // 8 speaker panel meets marquee
  { x: 0.25, y: 1.795 }, // 9 marquee, top front
  { x: -0.18, y: 1.795 }, // 10 top
  { x: -0.29, y: 1.66 }, // 11 back top chamfer
];

// --- Part list (Story 2.0: SHELL_PART_MESHES is COMPUTED, never typed) -------
// Every cabinet part mesh per placement, in build order: the three profiled
// structural meshes, the front panel, the two side-art decals, the contact
// shadow, the screen sub-group, the control-panel sub-group (overlay +
// joystick + two play buttons with rings + start button), the marquee face
// and retainers, the three grille slats, then the two coin-door parts that
// stay WORLD-space posed meshes (the brief's one exception to the group)
// and the frame + reject button mounted beside them. The scene mesh-count formula
// multiplies this count by the placements — formula, never magic.
export const SHELL_PART_LABELS: readonly string[] = [
  "side-panel-left",
  "side-panel-right",
  "core",
  "front-panel",
  "side-art-left",
  "side-art-right",
  "contact-shadow",
  "screen-bezel",
  "screen-face",
  "control-overlay",
  "joystick-washer",
  "joystick-shaft",
  "joystick-ball",
  "play-button-1-ring",
  "play-button-1",
  "play-button-2-ring",
  "play-button-2",
  "start-button",
  "marquee-face",
  "marquee-retainer-lower",
  "marquee-retainer-upper",
  "grille-slat-1",
  "grille-slat-2",
  "grille-slat-3",
  "coin-door-panel",
  "coin-slot",
  "coin-door-frame",
  "coin-reject-button",
];

export const SHELL_PART_MESHES = SHELL_PART_LABELS.length;

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
  /** Story 1.5: the registry gameId this shell is wired to (a room-data
   * link, authored — no manifest, no ledger). Absent means a plain 1.4
   * cabinet: E toggles the coin door and nothing is seated. */
  gameId?: string;
  /** Story 1.6 (AD-23): a busy machine runs autoplay when nobody claims
   * it — the second E joins the queue instead of sitting. Room data, not
   * hand-typed scheduler ids: the scheduler reads THIS flag off the
   * placement (the occupancy law keys on placements, never on game ids). */
  busy?: boolean;
}

export const cabinetPlacements: readonly CabinetPlacement[] = [
  {
    volumeId: "cabinet-B0",
    slotId: "B0",
    title: "MOON PATROL",
    screenZones: { attract: "MOON PATROL", next: "NEXT", score: [] },
    hue: GLOW_CYAN,
    marqueeHue: GLOW_MARQUEE,
    gameId: "moon-patrol",
    busy: true, // Story 1.6: the one busy machine — a Patron actually plays
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
 * visitor-right direction, its local +Z to the facing. Story 2.0 exports it
 * so the scene places the cabinet group with the SAME yaw law the coin-door
 * pose uses — one source, never duplicated. */
export function closedYaw(facing: Vec2XZ): number {
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

/** Marquee cap height, metres — Story 2.0 (UX-DR2/UX-DR6): ONE line at
 * 0.09m, emissive-lit from the in-body marquee face centred 1.71m, legible
 * to ~8m lit. The cap is never shrunk below it — a title that cannot fit
 * one line at the spacing floor throws loudly (the paintFlyer fit-law
 * sibling). The on-screen NEXT row has its own constant below (AD-28's
 * 0.18m floor survives untouched). */
export const MARQUEE_CAP_M = 0.09;

/** On-screen NEXT-row cap height, metres — AD-28's authored 0.18m minimum,
 * split out of the shared marquee constant by Story 2.0's contract change
 * so the one-line 0.09m marquee law never moves the NEXT floor. */
export const SCREEN_NEXT_CAP_M = 0.18;

/** Negative letter-spacing the marquee/screen fit law may tighten a line by,
 * in ems of the cap height — (inference; the spec's residual-risk note
 * pre-authorised this lever, and it was pulled in stage: at the 1.3 fake-
 * measure idiom's ~0.92em condensed advance, a 6-char word on the <=0.60m
 * body-width bar needs ~ -0.486em, so the first reading of -0.25em cannot
 * close the gap. The cap itself is NOT a lever — the 0.09m marquee floor and
 * the 0.18m NEXT floor are.) */
export const MARQUEE_LETTER_SPACING_EM_FLOOR = -0.5;

/** Attract-zone title cap, metres — (inference; the mockup's attract title
 * sits smaller than the marquee caps; the 0.18m floor binds the NEXT row,
 * which paints at SCREEN_NEXT_CAP_M). */
export const SCREEN_ATTRACT_CAP_M = 0.08;

/** Cabinet point lights in three's physical candela units: marquee spill
 * amber + screen halo cyan, hues from the placement record. Each hangs on
 * its face's centre axis 0.45m out (marquee face 0.56m, screen face 0.44m
 * — both emissive sheets on the 0.60m body), so the candela law binds: a
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
 * contribution at its face under the candela law (own-contribution =
 * INTENSITY / d², times the N·L incidence factor off-axis). The scene
 * pin checks the point directly under each light against the ceiling and
 * that face's far corner (cosined) against the floor, for the marquee and
 * the screen face each — the authored pair's incremental budget, NOT the
 * summed scene exposure (totals stay the smoke's call).
 *
 * Story 2.0 (DW-23): re-derived under ACES by measurement, not guessing.
 * three 0.187.0 maps linear light through ACESFilmicToneMapping
 * (exposure 1.0): color * 1/0.6, ACESInputMat, RRTAndODTFit
 * (v(v+0.0245786)-0.000090537) / (v(0.983729v+0.4329510)+0.238081),
 * ACESOutputMat, saturate — both matrices are gray-preserving (row sums
 * 1), so a grey evaluates as the scalar curve fit(x/0.6). Measured values:
 * foot x < 0.00221 -> 0; aces(0.17) ~= 0.20; aces(0.25) ~= 0.27;
 * aces(1.02) ~= 0.77; aces(0.66) ~= 0.66; aces(0.47) ~= 0.52;
 * aces(0.32) ~= 0.33; aces(1.18) ~= 0.80; aces(2.0) ~= 0.89.
 * Ceiling 1.18 = aces⁻¹(0.80): the screen face's own emissive sheet
 * (emissiveIntensity 1.0) tone-maps to 0.763, the marquee's (1.2) to
 * 0.804 — a lit point above 0.80 would out-shine the faces the machine
 * exists to show, so the ceiling ENCODES the brightest-sheet law that
 * scene.test.ts pins: no cabinet light's own contribution may out-shine
 * the BRIGHTEST emissive sheet — the brief's fixed 1.2 marquee tone-maps
 * to 0.804 and is the machine's brightest face, while the 1.0 screen at
 * 0.763 stays the face the machine exists to show.
 * The old ceiling 2 tone-mapped to 0.8875 — above both emissive faces
 * (the blown-out reading the old law let pass pre-ACES).
 * Floor 0.17 = aces⁻¹(0.20): own-glow that tone-maps under 0.20 is a dark
 * face, a Dead Machine by law (pre-ACES 0.5 clipped straight to 1.0, so
 * the old floor measured a quantity the frame no longer shows).
 * The authored triple (INTENSITY 0.25 / REACH 4 / standoff 0.45) sits
 * inside the band at the rebuilt geometry — own-peak 1.02 (marquee) and
 * 0.47 (screen), far corners 0.66 / 0.35 — so no re-tune was needed;
 * REACH 4 keeps the spill local (the face law is cutoff-independent at
 * these depths; at d = 4 m the cutoff zeroes the falloff).
 * (DW-23 re-derivation 2026-11-26 — measured over three 0.187.0's own
 * tonemapping_pars_fragment; by-eye binding stays at the lead's smoke.) */
export const CABINET_FACE_ILLUMINANCE_CEILING = 1.18;
export const CABINET_FACE_ILLUMINANCE_FLOOR = 0.17;
