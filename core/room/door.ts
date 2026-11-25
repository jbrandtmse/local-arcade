// Story 1.9 (AC5/AC6): the front door's street-side furniture and swing
// law — the geometry half of the entry beat. The collision volume for
// "door-front" stays TRUE-blocking and extruded as ONE mesh (the movement
// law is untouched); this module adds what the STREET view sees and how the
// panel poses when the beat opens it:
//
//   - frontDoorOpenPose: the panel (and the glass sheet + handle riding
//     it, the coinDoorPose precedent where the coin slot rides the door)
//     swings ROOMWARD about a vertical hinge at x = -DOOR_HALF_W — pure
//     arithmetic plus the deterministic trig from core/contract math, so
//     the closed pose (fraction 0) is byte-identical to today's extruded
//     box and the open pose lands exactly 90deg into the room.
//   - frontDoorHandleYaw: the handle's own twist, 0 -> 18deg (mockup
//     .handle rotate 18deg), composed on top of the swing yaw by the
//     frame side.
//   - frontDoorRamp: the door-bleed + glass lights' law as the page
//     settles — both start DARK at build and widen/brighten with the
//     entry's bleedFraction (tick-derived in core/entry.ts, AD-3).
//   - the authored furniture (awning proud of the front wall's exterior
//     above the door head, glazing + handle proud of the street face) —
//     every dim derived from DOOR_T / DOOR_TOP / DOOR_HALF_W / WALL_T /
//     HALF_Z, never retype a coordinate.
//
// DOM-free like every core/room module: painting happens on injected
// canvases (paintStreetGlass), and no host interface is named.

import { math } from "../contract/index.ts";
import { DOOR_HALF_W, DOOR_T, DOOR_TOP, INTERIOR, WALL_T } from "./collision-volumes.ts";
import type { CanvasFactory, PaintSurface } from "./surfaces.ts";

const HALF_Z = INTERIOR.depth / 2; // 6.25 — derived, never retyped

// --- Hinge law ---------------------------------------------------------------
// The swing hinge is the door gap's LEFT edge (street-facing view): vertical
// line x = -DOOR_HALF_W through the panel's mid-plane z. The panel rotates
// about it into the room (-Z side), so at fraction 1 the panel lies flat
// against... the inside of the opening's left jamb region, fully clear of
// the gap — and the collision volume never moves (walking into the doorway
// still presses against the closed volume; opening the door visually while
// it still blocks is this story's accepted fiction, AC5's "blocksMovement
// stays TRUE").
export const FRONT_DOOR_HINGE_X = -DOOR_HALF_W;
export const FRONT_DOOR_HINGE_Z = HALF_Z + DOOR_T / 2;

/** Full swing is a quarter turn — roomward, never outward to the street. */
export const FRONT_DOOR_OPEN_YAW = math.HALF_PI;
/** Handle twist at full turn (mockup .handle: rotate 18deg). */
export const FRONT_DOOR_HANDLE_MAX_YAW = math.PI * (18 / 180);

export interface FrontDoorPartPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface FrontDoorPose {
  panel: FrontDoorPartPose;
  glass: FrontDoorPartPose;
  handle: FrontDoorPartPose;
}

// --- Authored street-side furniture (inference unless mockup-cited) --------
// Glazing: one square sheet in the door's upper half, proud of the panel's
// street face (+Z). Thinness derived from DOOR_T, position derived from the
// panel's outer face — no standalone numbers beyond ratios of the constants.
export const FRONT_DOOR_GLASS_T = DOOR_T / 6; // 0.02 — a quarter of the panel's quarter
export const FRONT_DOOR_GLASS = {
  width: DOOR_HALF_W,
  height: DOOR_HALF_W,
  thickness: FRONT_DOOR_GLASS_T,
  centerY: DOOR_TOP - DOOR_HALF_W, // 1.6 — mockup .glass centre height
};
export const FRONT_DOOR_GLASS_Z = FRONT_DOOR_HINGE_Z + DOOR_T / 2 + FRONT_DOOR_GLASS_T / 2;

// Handle: a small bar on the opening's free (right) edge, proud of the
// glass. Its twist is the ready-handle beat's tell (frontDoorHandleYaw).
export const FRONT_DOOR_HANDLE_T = FRONT_DOOR_GLASS_T / 2;
export const FRONT_DOOR_HANDLE = {
  width: DOOR_T / 2, // 0.06
  height: DOOR_HALF_W * 0.3, // 0.15
  thickness: FRONT_DOOR_HANDLE_T,
  centerX: DOOR_HALF_W - DOOR_T, // 0.38 — mockup .handle inset from the edge
  centerY: DOOR_TOP * (2 / 3), // 1.4 — mockup .handle height
};
export const FRONT_DOOR_HANDLE_Z =
  FRONT_DOOR_HINGE_Z + DOOR_T / 2 + FRONT_DOOR_GLASS_T + FRONT_DOOR_HANDLE_T / 2;

// Awning: a Wall Panel lintel band proud of the front wall's EXTERIOR face
// above the door head (mockup .awning) — reads from the street view.
export const FRONT_DOOR_AWNING = {
  width: 2 * (DOOR_HALF_W + WALL_T), // frames the whole opening incl. jambs
  height: WALL_T,
  depth: WALL_T,
  centerY: DOOR_TOP + WALL_T / 2, // rests on the door head
  centerZ: HALF_Z + WALL_T + WALL_T / 2, // outer half proud of the wall exterior
};

// Light spots (street side): the bleed pools at the door BASE — light from
// the room spilling out onto the street — and the glass light just off the
// glazing. Positions authored once here; scene.ts places, main.ts ramps.
export const FRONT_DOOR_LIGHT_SPOTS = {
  bleed: { x: 0, y: DOOR_T, z: HALF_Z + WALL_T + DOOR_T },
  glass: { x: 0, y: FRONT_DOOR_GLASS.centerY, z: HALF_Z + WALL_T },
};

/** Count formulas the scene pins adjust by — nothing else adds meshes or
 * lights on the door's street side. */
export const FRONT_DOOR_FURNITURE_MESHES = 3; // awning + glass + handle
export const FRONT_DOOR_LIGHTS = 2; // bleed + glass

// Ramp reach/intensity (inference, by-eye-tuned lighting family like the
// door glow's): dark at 0, widen + brighten to these maxima as the page
// settles. Exported so the pins derive from the authored values.
export const FRONT_DOOR_BLEED_MAX_INTENSITY = 6;
export const FRONT_DOOR_BLEED_REACH_MIN = 0.5;
export const FRONT_DOOR_BLEED_REACH_MAX = 3;
export const FRONT_DOOR_GLASS_MAX_INTENSITY = 1.5;
export const FRONT_DOOR_GLASS_REACH_MIN = 0.5;
export const FRONT_DOOR_GLASS_REACH_MAX = 2;

export interface DoorLightRamp {
  intensity: number;
  distance: number;
}

function clampUnit(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Swing pose at `fraction` (0 = closed = today's extruded box, byte-
 * identical; 1 = flat open in the room). The glass sheet and handle ride
 * the panel with it (the coinDoorPose precedent: one hinge law for the
 * assembly). The handle's own 0..18deg twist is NOT folded in here — the
 * frame side composes frontDoorHandleYaw on top of this part's yaw.
 */
export function frontDoorOpenPose(fraction: number): FrontDoorPose {
  const yaw = clampUnit(fraction) * FRONT_DOOR_OPEN_YAW;
  // Deterministic trig only (AD-4's contract-math law for anything pose-derived).
  const cos = math.cos(yaw);
  const sin = math.sin(yaw);
  const swing = (px: number, pz: number): { x: number; z: number } => ({
    x: FRONT_DOOR_HINGE_X + (px - FRONT_DOOR_HINGE_X) * cos + (pz - FRONT_DOOR_HINGE_Z) * sin,
    z: FRONT_DOOR_HINGE_Z - (px - FRONT_DOOR_HINGE_X) * sin + (pz - FRONT_DOOR_HINGE_Z) * cos,
  });
  const panel = swing(0, FRONT_DOOR_HINGE_Z);
  const glass = swing(0, FRONT_DOOR_GLASS_Z);
  const handle = swing(FRONT_DOOR_HANDLE.centerX, FRONT_DOOR_HANDLE_Z);
  return {
    panel: { x: panel.x, y: DOOR_TOP / 2, z: panel.z, yaw },
    glass: { x: glass.x, y: FRONT_DOOR_GLASS.centerY, z: glass.z, yaw },
    handle: { x: handle.x, y: FRONT_DOOR_HANDLE.centerY, z: handle.z, yaw },
  };
}

/** The ready-handle tell: 0 -> FRONT_DOOR_HANDLE_MAX_YAW (18deg). */
export function frontDoorHandleYaw(fraction: number): number {
  return clampUnit(fraction) * FRONT_DOOR_HANDLE_MAX_YAW;
}

/**
 * The settle ramp for the two street-side lights: both start DARK
 * (intensity 0 at progress 0 — AC5's "both start dark") and brighten while
 * their reach widens. Monotone in both components over 0..1; clamped
 * outside. The bleed is the louder of the pair (it IS the room running
 * behind the glass); the glass light is a sheen on the glazing.
 */
export function frontDoorRamp(progress: number): { bleed: DoorLightRamp; glass: DoorLightRamp } {
  const p = clampUnit(progress);
  return {
    bleed: {
      intensity: FRONT_DOOR_BLEED_MAX_INTENSITY * p,
      distance: FRONT_DOOR_BLEED_REACH_MIN + (FRONT_DOOR_BLEED_REACH_MAX - FRONT_DOOR_BLEED_REACH_MIN) * p,
    },
    glass: {
      intensity: FRONT_DOOR_GLASS_MAX_INTENSITY * p,
      distance: FRONT_DOOR_GLASS_REACH_MIN + (FRONT_DOOR_GLASS_REACH_MAX - FRONT_DOOR_GLASS_REACH_MIN) * p,
    },
  };
}

// --- Painted glazing ---------------------------------------------------------
const GLASS_PX_PER_M = 1000; // same sheet density as the flyer law

/**
 * Paint the glazing sheet: the mockup's two-tone glass (GLASS_DARK upper,
 * GLASS_DIM lower) as hard bands — no gradient, no arcs (the hard-corners-
 * only law carries into paint). Colours arrive as css from the caller
 * (Rule 14: tokens -> toCss at the call site), so this painter names no
 * hex and no host interface.
 */
export function paintStreetGlass(makeCanvas: CanvasFactory, darkCss: string, dimCss: string): PaintSurface {
  const canvas = makeCanvas(
    Math.round(FRONT_DOOR_GLASS.width * GLASS_PX_PER_M),
    Math.round(FRONT_DOOR_GLASS.height * GLASS_PX_PER_M),
  );
  const ctx = canvas.getContext("2d");
  if (ctx == null) throw new Error("paint surface has no 2d context");
  ctx.fillStyle = darkCss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dimCss;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
  return canvas;
}
