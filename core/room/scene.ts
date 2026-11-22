// Story 1.3 (AC7): the scene builder — the "visual extrusion" leg of the
// spine's Room-geometry row: meshes are assembled ONCE from the authored
// data (the collision volume list, slot config, zones, signage, tokens);
// render code never hardcodes room geometry (AD-3/AD-15: static authored
// scene, no motion, no tick mutation here).
//
// Three.js is injected as a small factory seam (the injectable-source
// pattern of core/input/index.ts again — Rule 2: extend, don't copy) so a
// headless fake can pin the build (mesh per volume, wainscot band, Room
// Black ceiling, token-only colours, zero emissive on wall/pillar
// materials, BoxGeometry only).
//
// Painted colours come only from the tokens: Wall Warm + Wall Panel
// wainscot band 0..1.0m, Room Black ceiling, carpet drawn from the two
// carpet hexes. No wall or pillar material carries emissive — hues arrive
// from zone/roadmap/door LIGHTS, never painted glow (DESIGN don't: "Paint
// glow on walls").

import { signSurfaces } from "./signage.ts";
import {
  CARD_INK,
  CARPET_BASE,
  CARPET_PATTERN,
  GLOW_RED,
  PAPER_CARD,
  ROOM_BLACK,
  STREET_GRAY,
  WALL_PANEL,
  WALL_WARM,
  toCss,
} from "./tokens.ts";
import type { CanvasFactory } from "./surfaces.ts";
import { paintCarpet, paintFlyer } from "./surfaces.ts";
import type { CollisionVolume } from "./collision-volumes.ts";
import { DOOR_TOP, INTERIOR, WALL_T, WALL_TOP, collisionVolumes } from "./collision-volumes.ts";
import type { ZoneLight } from "./zones.ts";
import { ZONE_LIGHT_DISTANCE, ZONE_LIGHT_INTENSITY, roadmap, zones } from "./zones.ts";
import { EMPTY_BASEPLATE, wallSlots } from "./slot-config.ts";

// --- Three seam -------------------------------------------------------------
// Method-style factories (not constructor types) so a `* as THREE` adapter
// in the entry and a headless recorder fake both satisfy this structurally.

export interface Placed {
  position: { set(x: number, y: number, z: number): void };
}

export interface Three {
  boxGeometry(width: number, height: number, depth: number): object;
  standardMaterial(params: {
    color?: number;
    map?: object;
    roughness?: number;
    emissive?: number;
  }): object;
  mesh(geometry: object, material: object): Placed;
  pointLight(color: number, intensity: number, distance: number): Placed;
  ambientLight(color: number, intensity: number): object;
  canvasTexture(source: object): object;
}

/** The scene the room is added to — the subset of three's Scene used here. */
export interface RoomScene {
  add(object: object): unknown;
}

// --- Authored scene constants (inference unless cited) ----------------------
const CEILING_T = 0.1; // ceiling slab thickness
const WAINSCOT_H = 1.0; // Wall Panel band 0..1.0m (spec Design Notes item 6)
const WAINSCOT_INSET = 0.01; // keep the band off the wall face (z-fighting)
const FLOOR_T = 0.04; // carpet slab thickness
const BASEPLATE_T = EMPTY_BASEPLATE.thickness;
const FLYER_T = 0.005; // the paper sheet, thin as paper
const AMBIENT_INTENSITY = 0.15; // very low Room-Black ambient (Design Notes 7)
const DOOR_GLOW_Y = DOOR_TOP + 0.25; // glow-red just above the door head
const DOOR_GLOW_Z = 6.15; // on the room side of the front wall face
const DOOR_GLOW_INTENSITY = 1.5; // door glow reach/intensity (inference,
const DOOR_GLOW_REACH = 4; // Design Notes 7 — tuned by eye at the smoke)

function volumeCenter(v: CollisionVolume): { x: number; y: number; z: number } {
  return {
    x: (v.min.x + v.max.x) / 2,
    y: (v.min.y + v.max.y) / 2,
    z: (v.min.z + v.max.z) / 2,
  };
}

function addBox(
  THREE: Three,
  scene: RoomScene,
  material: object,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): Placed {
  const m = THREE.mesh(THREE.boxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}

function addLight(THREE: Three, scene: RoomScene, light: ZoneLight): void {
  const pl = THREE.pointLight(light.hue, ZONE_LIGHT_INTENSITY, ZONE_LIGHT_DISTANCE);
  pl.position.set(light.x, light.y, light.z);
  scene.add(pl);
}

/** Room-facing unit normal for a wall volume, read off the interior
 * envelope bounds — no wall-coord literals. */
function inwardNormal(v: CollisionVolume): { x: number; z: number } {
  const halfX = INTERIOR.width / 2;
  const halfZ = INTERIOR.depth / 2;
  if (v.max.x === -halfX) return { x: 1, z: 0 }; // left wall faces +X
  if (v.min.x === halfX) return { x: -1, z: 0 }; // right wall faces -X
  if (v.max.z === -halfZ) return { x: 0, z: 1 }; // back wall faces +Z
  if (v.min.z === halfZ) return { x: 0, z: -1 }; // front-wall segments face into the room (-Z)
  throw new Error("inwardNormal: wall volume sits on no named interior face");
}

/**
 * Build the room into `scene`: one box mesh per collision volume extruded
 * straight from its bounds, walls wainscotted, ceiling/floor/pillars/door/
 * street in token colours, empty-slot baseplates, the Welcome Flyer painted
 * onto an injected canvas, and the provisional zone/roadmap/door glow
 * lighting.
 */
export function buildRoomScene(THREE: Three, scene: RoomScene, makeCanvas: CanvasFactory): void {
  const wallMat = THREE.standardMaterial({ color: WALL_WARM, roughness: 0.92 });
  const panelMat = THREE.standardMaterial({ color: WALL_PANEL, roughness: 0.85 });
  const ceilingMat = THREE.standardMaterial({ color: ROOM_BLACK, roughness: 1 });
  const streetMat = THREE.standardMaterial({ color: STREET_GRAY, roughness: 1 });

  const carpetCanvas = paintCarpet(makeCanvas, toCss(CARPET_BASE), toCss(CARPET_PATTERN));
  const floorMat = THREE.standardMaterial({
    color: CARPET_BASE,
    map: THREE.canvasTexture(carpetCanvas),
    roughness: 1,
  });

  // One box mesh per volume, dims straight from the authored bounds — the
  // single-geometry-source law in render form.
  for (const v of collisionVolumes) {
    const c = volumeCenter(v);
    const w = v.max.x - v.min.x;
    const h = v.max.y - v.min.y;
    const d = v.max.z - v.min.z;
    const mat = v.kind === "wall" ? wallMat : v.kind === "street" ? streetMat : panelMat;
    addBox(THREE, scene, mat, w, h, d, c.x, c.y, c.z);

    if (v.kind === "wall") {
      // Wainscot: a Wall Panel band 0..1.0m inset 0.01 from the room face.
      // The along-wall 0.01 widening closes the corner seams but never
      // crosses the door gap: front-wall bands widen away from the opening
      // (1.9's door-open beat needs the gap clear at low height).
      const n = inwardNormal(v);
      // A FRONT segment straddling the gap centre (a future lintel) must not
      // widen at all — Math.sign(c.x) alone would leave the band crossing the
      // opening on both sides. Back-wall bands straddle the centre legitimately
      // and keep their corner-closing widening.
      const dw = n.x !== 0 || (n.z < 0 && Math.abs(c.x) < w / 2) ? 0 : 0.01;
      const dd = n.z !== 0 ? 0 : 0.01;
      const away = n.x !== 0 ? 0 : Math.sign(c.x); // front segments: off the gap
      addBox(
        THREE,
        scene,
        panelMat,
        w + dw,
        WAINSCOT_H,
        d + dd,
        c.x + n.x * WAINSCOT_INSET + away * (dw / 2),
        WAINSCOT_H / 2,
        c.z + n.z * WAINSCOT_INSET,
      );
    }
  }

  // Ceiling: Room Black over the full envelope (the dark the glow sits
  // against; unlit wall height reads as the same token).
  addBox(
    THREE,
    scene,
    ceilingMat,
    INTERIOR.width + 2 * WALL_T,
    CEILING_T,
    INTERIOR.depth + 2 * WALL_T,
    0,
    WALL_TOP + CEILING_T / 2,
    0,
  );

  // Carpet floor from the two carpet tokens (base colour + painted pattern).
  addBox(THREE, scene, floorMat, INTERIOR.width, FLOOR_T, INTERIOR.depth, 0, -FLOOR_T / 2, 0);

  // Empty Wall Slots read in the same visual language as filled ones:
  // Wall Panel baseplates 0.70 x 0.62 raised 0.02 (Design Notes item 3),
  // centred on the authored slot centre, depth running along the facing.
  for (const s of wallSlots) {
    const alongX = s.facing.x !== 0; // a run facing ±X runs along Z
    addBox(
      THREE,
      scene,
      panelMat,
      alongX ? EMPTY_BASEPLATE.depth : EMPTY_BASEPLATE.alongWall,
      BASEPLATE_T,
      alongX ? EMPTY_BASEPLATE.alongWall : EMPTY_BASEPLATE.depth,
      s.center.x,
      EMPTY_BASEPLATE.raise + BASEPLATE_T / 2,
      s.center.z,
    );
  }

  // The one Welcome Flyer: painted on an injected canvas, texture-mapped,
  // never a DOM node (AD-24 room-sign whitelist, AC6).
  for (const surface of signSurfaces) {
    const paper = THREE.canvasTexture(
      paintFlyer(makeCanvas, surface.text, toCss(surface.stockHex), toCss(CARD_INK), surface.capHeight),
    );
    const flyerMat = THREE.standardMaterial({ color: PAPER_CARD, map: paper, roughness: 0.95 });
    const facesX = surface.facing.x !== 0;
    const facesZ = surface.facing.z !== 0; // faces ±Z -> width runs along X
    if (facesX === facesZ) throw new Error("a sign surface faces exactly one axis");
    addBox(
      THREE,
      scene,
      flyerMat,
      facesZ ? surface.width : FLYER_T,
      surface.height,
      facesZ ? FLYER_T : surface.width,
      surface.position.x,
      surface.position.y,
      surface.position.z,
    );
  }

  // Provisional identity lighting: hues from lights, never painted glow
  // (spec Design Notes item 7 — "readable at 6m" is the lead's smoke check).
  for (const zone of zones) addLight(THREE, scene, zone.light);
  for (const light of roadmap.lights) addLight(THREE, scene, light);
  const doorGlow = THREE.pointLight(GLOW_RED, DOOR_GLOW_INTENSITY, DOOR_GLOW_REACH);
  doorGlow.position.set(0, DOOR_GLOW_Y, DOOR_GLOW_Z);
  scene.add(doorGlow);
  scene.add(THREE.ambientLight(ROOM_BLACK, AMBIENT_INTENSITY));
}
