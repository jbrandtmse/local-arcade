// Story 1.3 (AC7): the scene builder — the "visual extrusion" leg of the
// spine's Room-geometry row: meshes are assembled ONCE from the authored
// data (the collision volume list, slot config, zones, signage, tokens);
// render code never hardcodes room geometry (AD-3/AD-15: static authored
// scene, no motion, no tick mutation here). Story 1.4 extends it: the
// stand-up shells' parts + glow lights are built from the placement
// records, and the builder RETURNS door/screen handles so the entry can
// pose and repaint them from state every frame (the builder itself still
// never reads state or ticks).
//
// Three.js is injected as a small factory seam (the injectable-source
// pattern of core/input/index.ts again — Rule 2: extend, don't copy) so a
// headless fake can pin the build (mesh per NON-cabinet volume, wainscot
// band, Room Black ceiling, token-only colours, emissive on exactly the two
// per-cabinet faces, box geometry for the room and profiled extrusions +
// primitives only inside cabinet groups — Story 2.0's narrowings).
//
// Painted colours come only from the tokens: Wall Warm + Wall Panel
// wainscot band 0..1.0m, Room Black ceiling, carpet drawn from the two
// carpet hexes. No wall or pillar material carries emissive — hues arrive
// from zone/roadmap/door LIGHTS, never painted glow (DESIGN don't: "Paint
// glow on walls").

import { math } from "../contract/index.ts";
import { signSurfaces } from "./signage.ts";
import {
  BUTTON_RED,
  BUTTON_WHITE,
  BUTTON_YELLOW,
  CABINET_BLACK,
  CABINET_METAL,
  CABINET_MOLDING,
  CARD_INK,
  CARPET_BASE,
  CARPET_PATTERN,
  FACE_TINT,
  GLASS_DARK,
  GLASS_DIM,
  GLOW_MARQUEE,
  GLOW_RED,
  PAPER_CARD,
  ROOM_BLACK,
  SIGN_CHALK,
  STREET_GRAY,
  WALL_PANEL,
  WALL_WARM,
  toCss,
} from "./tokens.ts";
import type { CanvasFactory, PaintSurface } from "./surfaces.ts";
import {
  paintCarpet,
  paintContactShadow,
  paintControlOverlay,
  paintFlyer,
  paintMarquee,
  paintScreen,
  paintSideArt,
  type OverlayRing,
} from "./surfaces.ts";
import type { CollisionVolume } from "./collision-volumes.ts";
import { DOOR_TOP, INTERIOR, WALL_T, WALL_TOP, collisionVolumes } from "./collision-volumes.ts";
import type { ZoneLight } from "./zones.ts";
import { ZONE_LIGHT_DISTANCE, ZONE_LIGHT_INTENSITY, roadmap, zones } from "./zones.ts";
import { EMPTY_BASEPLATE, wallSlots } from "./slot-config.ts";
import {
  CABINET_LIGHT_INTENSITY,
  CABINET_LIGHT_REACH,
  CABINET_LIGHT_STANDOFF_M,
  INNER_PROFILE,
  MARQUEE_CAP_M,
  SIDE_PROFILE,
  SHELL,
  SCREEN_ATTRACT_CAP_M,
  SCREEN_NEXT_CAP_M,
  cabinetPlacements,
  closedYaw,
  coinDoorPose,
  placementGeometry,
  type ProfilePoint,
} from "./cabinets.ts";
// Story 1.9: the street-side front-door furniture + swing law (door.ts).
import {
  FRONT_DOOR_AWNING,
  FRONT_DOOR_BLEED_REACH_MIN,
  FRONT_DOOR_GLASS,
  FRONT_DOOR_GLASS_REACH_MIN,
  FRONT_DOOR_HANDLE,
  FRONT_DOOR_LIGHT_SPOTS,
  frontDoorOpenPose,
  paintStreetGlass,
} from "./door.ts";

// --- Three seam -------------------------------------------------------------
// Method-style factories (not constructor types) so a `* as THREE` adapter
// in the entry and a headless recorder fake both satisfy this structurally.
// 1.4 extends (never replaces) the seam: Placed gains rotation (the coin
// door swings), Three gains markTextureUpdated (the live screen repaints
// into its existing canvas; the entry flips the texture's needsUpdate).

export interface Placed {
  position: { set(x: number, y: number, z: number): void };
  rotation: { set(x: number, y: number, z: number): void };
  /** Story 1.9 (inference): point lights carry animatable intensity/reach
   * (the frame ramps the door bleed + glass from entry state). Optional —
   * meshes never set it; the seam's light factories return objects that
   * do. */
  intensity?: number;
  distance?: number;
}

/** Story 2.0: a cabinet group is a Placed that also takes children — the
 * per-cabinet local-frame node the brief's assemblies hang under. Its
 * rotation.y is set by assignment (group.rotation.y = closedYaw(facing)). */
export interface Grouped {
  position: { set(x: number, y: number, z: number): void };
  rotation: { set(x: number, y: number, z: number): void; y: number };
  add(child: object): unknown;
}

export interface Three {
  boxGeometry(width: number, height: number, depth: number): object;
  /** Story 2.0 (brief step 1): a Shape through these profile points,
   * extruded `depth` along +Z, no bevel — the profiled side/core panels. */
  extrudeGeometry(points: readonly ProfilePoint[], depth: number): object;
  cylinderGeometry(radiusTop: number, radiusBottom: number, height: number, radialSegments: number): object;
  sphereGeometry(radius: number, widthSegments: number, heightSegments: number): object;
  standardMaterial(params: {
    color?: number;
    map?: object;
    roughness?: number;
    emissive?: number;
    emissiveMap?: object;
    emissiveIntensity?: number;
    metalness?: number;
    transparent?: boolean;
    depthWrite?: boolean;
  }): object;
  /** Story 2.0: material may be an ARRAY — ExtrudeGeometry carries two
   * groups (0 = cap faces, 1 = edge walls). */
  mesh(geometry: object, material: object | readonly object[]): Placed;
  group(): Grouped;
  pointLight(color: number, intensity: number, distance: number): Placed;
  ambientLight(color: number, intensity: number): object;
  canvasTexture(source: object): object;
  markTextureUpdated(texture: object): void;
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
// Room-Black ambient fill (Design Notes item 7 — "tuned by eye at the
// smoke"): a floor-lift above the near-no-op 0.15 floor, not the room's
// fill — Room Black is a dark token by design; the zone/amber pools carry
// the light. Colour stays the Room Black token (the identity guard) and
// the fill stays a lift, never a flood, so the dark the glow sits against
// stays dark. Exported so the scene pins derive from the authored value,
// never retype it.
export const AMBIENT_INTENSITY = 0.6;
const DOOR_GLOW_Y = DOOR_TOP + 0.25; // glow-red just above the door head
const DOOR_GLOW_Z = 6.15; // on the room side of the front wall face
// Door glow reach/intensity (inference, Design Notes item 7 — the same
// by-eye-tuned lighting family): scaled with the room's candela-scale light
// law so the glow-red identity anchor reads at 6m; it is an accent above
// the door head, not one of the fill pools. Exported so the scene pins
// derive from the authored values, never retype them.
export const DOOR_GLOW_INTENSITY = 15;
export const DOOR_GLOW_REACH = 8;

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

// --- Story 2.0 cabinet assembly constants (brief numbers, single source) ----
/** Contact-shadow sheet width/depth, metres. The brief's 4f says 0.80 m,
 * but the brief's own verification test 1 bounds every group child at
 * z +/-0.30 — an 0.80 m sheet contradicts it. Smallest value that still
 * fully covers the 0.60 m footprint: 0.60 m (the band would allow up to
 * 0.604; the footprint is the floor; the gradient fades to transparent
 * well before the edge, so the grounding still reads). Listed in the
 * story report as a smallest-number overlap adjustment. */
const CONTACT_SHADOW_M = 0.6;
/** Grille slat slope: the tilt of the INNER_PROFILE underside between
 * profile points 7 (-0.04, 1.57) and 8 (0.25, 1.63) — DERIVED from the
 * authored profile (one-geometry-source law; an edit to those points
 * moves the slats with the panel, never silently off it). */
const GRILLE_SLOPE = math.atan2(
  INNER_PROFILE[8]!.y - INNER_PROFILE[7]!.y,
  INNER_PROFILE[8]!.x - INNER_PROFILE[7]!.x,
);
/** Control rings painted on the overlay (OverlayRing.y runs along the
 * overlay's local z) — the same control positions the hardware mounts at
 * (one source for hardware placement). */
const CONTROL_RINGS: readonly OverlayRing[] = [
  { x: -0.13, y: 0, r: 0.03 },
  { x: 0.07, y: 0, r: 0.02 },
  { x: 0.13, y: 0, r: 0.02 },
  { x: 0, y: -0.06, r: 0.016 },
];

/** Darken a token hex to a fraction of its brightness, channelwise
 * (brief 5: "the placement's hue darkened to about 35% brightness"). */
function darkenHex(hex: number, factor: number): number {
  const channel = (shift: number): number => Math.min(255, Math.round(((hex >> shift) & 0xff) * factor));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
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

/** Handles buildRoomScene hands the entry so the frame side can pose the
 * coin doors and repaint the live screens (1.4). Screens carry their canvas
 * and texture so a repaint mutates the SAME texture the material samples. */
export interface ScreenHandle {
  id: string;
  canvas: PaintSurface;
  texture: object;
}

export interface DoorHandle {
  id: string;
  /** The swinging panel; the coin-slot detail rides it (same hinge law,
   * so its pose is read from the same source — the Code Map's one `door`
   * handle became this pair; see the story report). */
  mesh: Placed;
  slot: Placed;
}

/** Story 1.9: the front door's handle-tracked assembly. The panel is the
 * door-front volume's own extrusion (one mesh per volume preserved — the
 * beat makes it handle-tracked, never duplicated); glass + handle ride it
 * under the same hinge law (door.ts), and the two street lights start dark
 * for the frame side to ramp. */
export interface FrontDoorHandle {
  panel: Placed;
  glass: Placed;
  handle: Placed;
  bleedLight: Placed;
  glassLight: Placed;
}

/** Story 2.3 (AC1): the per-cabinet glow pair's handles — the SAME two
 * point lights the build hangs on the face mounts — so the frame side can
 * ramp their intensity from kernel tick state (the frontDoorRamp idiom,
 * AD-3/AD-15). The builder still never reads state: these are handles, not
 * behaviour, and the pair stays exactly the two lights 2.0 pinned. */
export interface CabinetLightHandle {
  volumeId: string;
  /** The screen-family halo (hue from placement.hue). */
  halo: Placed;
  /** The marquee-family spill (hue from placement.marqueeHue). */
  spill: Placed;
}

export interface RoomHandles {
  screens: ScreenHandle[];
  doors: DoorHandle[];
  /** Story 2.3: one handle per placement, in placement order. */
  cabinetLights: CabinetLightHandle[];
  frontDoor: FrontDoorHandle;
}

/**
 * Build the room into `scene`: one box mesh per collision volume extruded
 * straight from its bounds, walls wainscotted, ceiling/floor/pillars/door/
 * street in token colours, empty-slot baseplates, the Welcome Flyer painted
 * onto an injected canvas, the authored stand-up shells' parts + glow
 * lights, the provisional zone/roadmap/door glow lighting, and the 1.9
 * street-side front-door furniture (awning, glazing, handle) with its two
 * dark street lights. Returns the coin-door, screen, cabinet-light, and
 * front-door handles the frame side animates.
 */
export function buildRoomScene(
  THREE: Three,
  scene: RoomScene,
  makeCanvas: CanvasFactory,
): RoomHandles {
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
  // single-geometry-source law in render form. Story 1.9: the door-front
  // extrusion is captured (not duplicated) so the beat can pose it.
  // Story 2.0 (contract change 2): kind "cabinet" volumes are never drawn —
  // the entry stays in the list for collision/targeting/occlusion, and the
  // Cabinet's visual is the authored shell group below.
  let frontDoorPanel: Placed | null = null;
  for (const v of collisionVolumes) {
    if (v.kind === "cabinet") continue;
    const c = volumeCenter(v);
    const w = v.max.x - v.min.x;
    const h = v.max.y - v.min.y;
    const d = v.max.z - v.min.z;
    const mat = v.kind === "wall" ? wallMat : v.kind === "street" ? streetMat : panelMat;
    const box = addBox(THREE, scene, mat, w, h, d, c.x, c.y, c.z);
    if (v.kind === "door") frontDoorPanel = box; // exactly one door volume in the list

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
  // never a DOM node (AD-24 room-sign whitelist, AC6). The painter takes the
  // sheet metres from the record, so the canvas aspect matches the mesh
  // aspect exactly - no texture stretch (rework pass 1).
  for (const surface of signSurfaces) {
    const paper = THREE.canvasTexture(
      paintFlyer(
        makeCanvas,
        surface.text,
        toCss(surface.stockHex),
        toCss(CARD_INK),
        surface.capHeight,
        surface.width,
        surface.height,
      ),
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

  // Story 1.4/2.0: the authored stand-up shells (cabinets.ts placements).
  // Story 2.0 rebuild per the owner brief: each Cabinet is a per-cabinet
  // local-frame GROUP (+Y up, +Z the facing) placed at the slot centre with
  // group.rotation.y = closedYaw(facing) — the same yaw law the coin-door
  // pose uses. The group holds the profiled side panels + core extrusion,
  // the front panel, side-art decals, the contact shadow, and the screen /
  // control-panel / marquee / grille sub-assemblies (brief sections 1-4).
  // Only the coin-door family (panel, slot, frame, reject button) stays
  // WORLD-space: the door and slot are posed by coinDoorPose exactly as
  // before (the brief's one exception), and the frame + lit reject button
  // mount beside them on the same front-plane law. Every coord derives
  // from the placement record or the brief's authored numbers — never a
  // per-slot branch (one-geometry-source law). Coin doors start CLOSED;
  // the frame side re-poses from coinDoorPose every frame.
  const screens: ScreenHandle[] = [];
  const doors: DoorHandle[] = [];
  const cabinetLights: CabinetLightHandle[] = [];

  // Brief section 7: every geometry and every non-textured material is
  // created ONCE, outside the placements loop, and reused for every
  // cabinet. Only the screen / marquee / side-art / overlay textures (and
  // the materials that sample them) are per-cabinet.
  const sidePanelGeo = THREE.extrudeGeometry(SIDE_PROFILE, 0.019);
  const coreGeo = THREE.extrudeGeometry(INNER_PROFILE, 0.562);
  const frontPanelGeo = THREE.boxGeometry(0.562, 0.8, 0.02);
  const sideArtGeo = THREE.boxGeometry(0.002, 0.7, 0.5);
  const shadowGeo = THREE.boxGeometry(CONTACT_SHADOW_M, 0.002, CONTACT_SHADOW_M);
  const bezelGeo = THREE.boxGeometry(SHELL.bezel.width, SHELL.bezel.height, SHELL.bezel.depth);
  const screenFaceGeo = THREE.boxGeometry(SHELL.screen.width, SHELL.screen.height, 0.003);
  const overlayGeo = THREE.boxGeometry(0.562, 0.003, 0.19);
  const marqueeFaceGeo = THREE.boxGeometry(0.562, SHELL.marquee.height, SHELL.marquee.depth);
  const retainerGeo = THREE.boxGeometry(0.562, 0.01, 0.008);
  const grilleGeo = THREE.boxGeometry(0.2, 0.004, 0.012);
  const coinFrameGeo = THREE.boxGeometry(0.3, 0.34, 0.004);
  const rejectGeo = THREE.boxGeometry(0.03, 0.04, 0.004);
  const washerGeo = THREE.cylinderGeometry(0.022, 0.022, 0.002, 16);
  const shaftGeo = THREE.cylinderGeometry(0.005, 0.005, 0.055, 8);
  const buttonGeo = THREE.cylinderGeometry(0.014, 0.014, 0.008, 16);
  const buttonRingGeo = THREE.cylinderGeometry(0.018, 0.018, 0.003, 16);
  const startGeo = THREE.cylinderGeometry(0.01, 0.01, 0.006, 12);
  const ballGeo = THREE.sphereGeometry(0.017, 12, 8);
  const doorGeo = THREE.boxGeometry(SHELL.coinDoor.width, SHELL.coinDoor.height, SHELL.coinDoor.thickness);
  const slotGeo = THREE.boxGeometry(SHELL.coinSlot.width, SHELL.coinSlot.height, SHELL.coinSlot.thickness);

  const vinylMat = THREE.standardMaterial({ color: CABINET_BLACK, roughness: 0.8 });
  const moldingMat = THREE.standardMaterial({ color: CABINET_MOLDING, roughness: 0.8 });
  const bezelMat = THREE.standardMaterial({ color: CABINET_BLACK, roughness: 0.25 });
  // metalness stays at 0.3: no env map in this room, higher renders black
  // (brief section 5).
  const metalMat = THREE.standardMaterial({ color: CABINET_METAL, roughness: 0.4, metalness: 0.3 });
  const buttonRedMat = THREE.standardMaterial({ color: BUTTON_RED, roughness: 0.35 });
  const buttonYellowMat = THREE.standardMaterial({ color: BUTTON_YELLOW, roughness: 0.35 });
  const buttonWhiteMat = THREE.standardMaterial({ color: BUTTON_WHITE, roughness: 0.35 });
  const doorMat = THREE.standardMaterial({ color: WALL_WARM, roughness: 0.85 }); // mockup .coindoor bg (kept)
  const slotMat = THREE.standardMaterial({ color: SIGN_CHALK, roughness: 0.6 }); // mockup .slot bg (kept)
  // One shared contact-shadow sheet for every cabinet (per-cabinet
  // textures are only screen/marquee/side-art/overlay — brief section 7).
  const shadowMat = THREE.standardMaterial({
    map: THREE.canvasTexture(paintContactShadow(makeCanvas, toCss(CABINET_BLACK), CONTACT_SHADOW_M)),
    transparent: true,
    depthWrite: false,
    roughness: 1,
  });

  for (const p of cabinetPlacements) {
    const g = placementGeometry(p.slotId);
    const yaw = closedYaw(g.facing);

    const group = THREE.group();
    group.position.set(g.center.x, 0, g.center.z);
    group.rotation.y = yaw;
    scene.add(group);

    // Local-frame mount helpers (group-relative coords only).
    const mount = (
      geo: object,
      material: object | readonly object[],
      x: number,
      y: number,
      z: number,
      rx = 0,
      ry = 0,
    ): Placed => {
      const m = THREE.mesh(geo, material);
      m.position.set(x, y, z);
      if (rx !== 0 || ry !== 0) m.rotation.set(rx, ry, 0);
      group.add(m);
      return m;
    };
    const sub = (parent: Grouped, geo: object, material: object, x: number, y: number, z: number): Placed => {
      const m = THREE.mesh(geo, material);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };

    // Side-panel colour: the placement's hue darkened to ~35% brightness
    // (brief 5); its art/overlay share the darkened ground.
    const sideColour = darkenHex(p.hue, 0.35);
    const sideColourMat = THREE.standardMaterial({ color: sideColour, roughness: 0.7 });

    // Section 3: profiled structure. A Shape drawn in XY extrudes along
    // +Z; mapping profile z onto shape x and rotating -90 deg about Y puts
    // the shape's x along local +Z with the extrusion running toward -x —
    // the brief's structural-mesh table. Material arrays: index 0 caps,
    // index 1 the edge walls (the black T-molding ring).
    const sideMats = [sideColourMat, moldingMat] as const;
    mount(sidePanelGeo, sideMats, -0.281, 0, 0, 0, -math.HALF_PI);
    mount(sidePanelGeo, sideMats, 0.3, 0, 0, 0, -math.HALF_PI);
    mount(coreGeo, [vinylMat, vinylMat] as const, 0.281, 0, 0, 0, -math.HALF_PI);
    // Front panel: its face lands exactly on the plane coinDoorPose
    // mounts the coin door on (local z 0.30 = the body front plane).
    mount(frontPanelGeo, vinylMat, 0, 0.5, 0.29);

    // Side-art decals (brief paintSideArt): one canvas per cabinet, the
    // same texture on both sides, proud of the side panels by 0.001.
    const artMat = THREE.standardMaterial({
      color: FACE_TINT,
      map: THREE.canvasTexture(
        paintSideArt(makeCanvas, toCss(sideColour), toCss(p.hue), toCss(p.marqueeHue), 0.5, 0.7),
      ),
      roughness: 0.8,
    });
    mount(sideArtGeo, artMat, -0.301, 0.5, -0.02);
    mount(sideArtGeo, artMat, 0.301, 0.5, -0.02);

    // 4f contact shadow (grounds the cabinet on the carpet).
    mount(shadowGeo, shadowMat, 0, 0.022, 0);

    // 4a screen assembly: the sub-group carries the lean (-9.8 deg about
    // X — top edge further back than the bottom, verified by scene tests).
    const screenGroup = THREE.group();
    screenGroup.position.set(0, SHELL.screen.centerY, 0.01);
    screenGroup.rotation.set(-0.1707, 0, 0);
    group.add(screenGroup);
    sub(screenGroup, bezelGeo, bezelMat, 0, 0, 0.002);
    const screenCanvas = paintScreen(
      makeCanvas,
      p.screenZones,
      0,
      toCss(ROOM_BLACK),
      toCss(p.hue),
      toCss(p.marqueeHue),
      SCREEN_ATTRACT_CAP_M,
      SCREEN_NEXT_CAP_M,
      SHELL.screen.width,
      SHELL.screen.height,
    );
    const screenTexture = THREE.canvasTexture(screenCanvas);
    // Emissive face #1 (of exactly two per cabinet): the face glows by
    // itself; room lights no longer wash it out (brief 5). color 0 is the
    // brief's 0x000000 — written as a number so no hex literal leaves
    // tokens.ts (contract change 5).
    const screenMat = THREE.standardMaterial({
      color: 0,
      emissive: FACE_TINT,
      emissiveMap: screenTexture,
      emissiveIntensity: 1.0,
      roughness: 0.3,
    });
    sub(screenGroup, screenFaceGeo, screenMat, 0, 0, 0.0055);
    screens.push({ id: p.volumeId, canvas: screenCanvas, texture: screenTexture });

    // 4b control panel assembly: +21 deg about X, front edge lower than
    // the rear (verified by scene tests), hardware on the overlay.
    const controlGroup = THREE.group();
    controlGroup.position.set(0, 0.9375, 0.2075);
    controlGroup.rotation.set(0.3709, 0, 0);
    group.add(controlGroup);
    const overlayMat = THREE.standardMaterial({
      color: FACE_TINT,
      map: THREE.canvasTexture(
        paintControlOverlay(makeCanvas, toCss(sideColour), toCss(p.marqueeHue), CONTROL_RINGS, 0.562, 0.19),
      ),
      roughness: 0.8,
    });
    sub(controlGroup, overlayGeo, overlayMat, 0, 0.0015, 0);
    sub(controlGroup, washerGeo, vinylMat, -0.13, 0.004, 0);
    sub(controlGroup, shaftGeo, metalMat, -0.13, 0.03, 0);
    sub(controlGroup, ballGeo, buttonRedMat, -0.13, 0.065, 0);
    sub(controlGroup, buttonRingGeo, vinylMat, 0.07, 0.0045, 0);
    sub(controlGroup, buttonGeo, buttonRedMat, 0.07, 0.007, 0);
    sub(controlGroup, buttonRingGeo, vinylMat, 0.13, 0.0045, 0);
    sub(controlGroup, buttonGeo, buttonYellowMat, 0.13, 0.007, 0);
    sub(controlGroup, startGeo, buttonWhiteMat, 0, 0.006, -0.06);

    // 4c marquee: the emissive face #2 + two black retainer strips, under
    // the profile's marquee overhang (one line at the 0.09 m cap).
    const marqueeTexture = THREE.canvasTexture(
      paintMarquee(
        makeCanvas,
        p.title,
        toCss(ROOM_BLACK),
        toCss(p.marqueeHue),
        MARQUEE_CAP_M,
        SHELL.marquee.width,
        SHELL.marquee.height,
      ),
    );
    const marqueeMat = THREE.standardMaterial({
      color: 0,
      emissive: FACE_TINT,
      emissiveMap: marqueeTexture,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    mount(marqueeFaceGeo, marqueeMat, 0, SHELL.marquee.centerY, 0.2525);
    mount(retainerGeo, vinylMat, 0, 1.6325, 0.254);
    mount(retainerGeo, vinylMat, 0, 1.7925, 0.254);

    // 4d speaker grille: three slats on the sloped underside between
    // INNER_PROFILE points 7 and 8 (decorative, purely).
    const grilleGroup = THREE.group();
    grilleGroup.position.set(0, 1.592, 0.105);
    grilleGroup.rotation.set(-GRILLE_SLOPE, 0, 0);
    group.add(grilleGroup);
    for (const offset of [-0.03, 0, 0.03]) sub(grilleGroup, grilleGeo, vinylMat, 0, 0, offset);

    // Coin-door family, WORLD-space (the brief's one exception to the
    // group): door + slot posed by coinDoorPose (byte-identical law,
    // start CLOSED), then 4e's frame box just proud of the front panel
    // and the lit reject button beside the slot.
    const pose = coinDoorPose(p.volumeId, false);
    const apply = (placed: Placed, one: { x: number; y: number; z: number; yaw: number }): void => {
      placed.position.set(one.x, one.y, one.z);
      placed.rotation.set(0, one.yaw, 0);
    };
    const panel = THREE.mesh(doorGeo, doorMat);
    apply(panel, pose.panel);
    scene.add(panel);
    const slotMesh = THREE.mesh(slotGeo, slotMat);
    apply(slotMesh, pose.slot);
    scene.add(slotMesh);
    doors.push({ id: p.volumeId, mesh: panel, slot: slotMesh });
    // Frame centre 0.002 proud of the body front plane (local z 0.302),
    // centred on the door; the reject button 0.006 proud beside the slot
    // (local x 0.09). Both read the same facing/right frame as the pose.
    const frameX = g.front.x + g.facing.x * 0.002;
    const frameZ = g.front.z + g.facing.z * 0.002;
    const frame = THREE.mesh(coinFrameGeo, metalMat);
    frame.position.set(frameX, SHELL.coinDoor.centerY, frameZ);
    frame.rotation.set(0, yaw, 0);
    scene.add(frame);
    const reject = THREE.mesh(rejectGeo, buttonRedMat);
    reject.position.set(
      frameX + g.facing.x * 0.004 + g.right.x * 0.09,
      SHELL.coinSlot.centerY,
      frameZ + g.facing.z * 0.004 + g.right.z * 0.09,
    );
    reject.rotation.set(0, yaw, 0);
    scene.add(reject);

    // Cabinet glow: marquee spill in the marquee family + screen halo in
    // the machine's family, at each face's height, CABINET_LIGHT_STANDOFF_M
    // in front of the body front plane (hues from LIGHTS, never painted
    // glow — 1.3's identity law; both lights stay per the brief).
    const spill = THREE.pointLight(p.marqueeHue, CABINET_LIGHT_INTENSITY, CABINET_LIGHT_REACH);
    spill.position.set(g.front.x + g.facing.x * CABINET_LIGHT_STANDOFF_M, SHELL.marquee.centerY, g.front.z + g.facing.z * CABINET_LIGHT_STANDOFF_M);
    scene.add(spill);
    const halo = THREE.pointLight(p.hue, CABINET_LIGHT_INTENSITY, CABINET_LIGHT_REACH);
    halo.position.set(g.front.x + g.facing.x * CABINET_LIGHT_STANDOFF_M, SHELL.screen.centerY, g.front.z + g.facing.z * CABINET_LIGHT_STANDOFF_M);
    scene.add(halo);
    // Story 2.3 (AC1): hand the pair out as handles — the frame's glow
    // ramp (haze x pulse, atmosphere.ts laws) writes their intensity from
    // tick state. No new light is created here: the census stays exactly
    // two point lights per Cabinet (the scene.test count formulas).
    cabinetLights.push({ volumeId: p.volumeId, halo, spill });
  }

  // Story 1.9: the street-side front-door furniture. The awning (Wall
  // Panel, mockup .awning) sits proud of the front wall's EXTERIOR above
  // the door head; the glazing sheet and handle sit proud of the panel's
  // street face (+Z) and start at their CLOSED pose — the frame side
  // re-poses them with the panel every frame from entry state (door.ts
  // hinge law). The glazing is a painted two-tone sheet in the mockup's
  // glass tokens (never emissive — the street view obeys 1.3's identity
  // law). The two street lights — the GLOW_MARQUEE bleed pool at the door
  // base plus a glass sheen light — are BUILT DARK; the entry's
  // bleedFraction ramps them as the page settles (AC5).
  if (frontDoorPanel == null) throw new Error("buildRoomScene: the volume list has no door to pose");
  const place = (placed: Placed, one: { x: number; y: number; z: number; yaw: number }): void => {
    placed.position.set(one.x, one.y, one.z);
    placed.rotation.set(0, one.yaw, 0);
  };
  const closed = frontDoorOpenPose(0);
  addBox(
    THREE,
    scene,
    panelMat,
    FRONT_DOOR_AWNING.width,
    FRONT_DOOR_AWNING.height,
    FRONT_DOOR_AWNING.depth,
    0,
    FRONT_DOOR_AWNING.centerY,
    FRONT_DOOR_AWNING.centerZ,
  );
  const glassMat = THREE.standardMaterial({
    color: FACE_TINT,
    map: THREE.canvasTexture(paintStreetGlass(makeCanvas, toCss(GLASS_DARK), toCss(GLASS_DIM))),
    roughness: 1,
  });
  const glass = THREE.mesh(
    THREE.boxGeometry(FRONT_DOOR_GLASS.width, FRONT_DOOR_GLASS.height, FRONT_DOOR_GLASS.thickness),
    glassMat,
  );
  place(glass, closed.glass);
  scene.add(glass);
  const handleMat = THREE.standardMaterial({ color: SIGN_CHALK, roughness: 0.6 }); // mockup .handle
  const handle = THREE.mesh(
    THREE.boxGeometry(FRONT_DOOR_HANDLE.width, FRONT_DOOR_HANDLE.height, FRONT_DOOR_HANDLE.thickness),
    handleMat,
  );
  place(handle, closed.handle);
  scene.add(handle);
  const bleedLight = THREE.pointLight(GLOW_MARQUEE, 0, FRONT_DOOR_BLEED_REACH_MIN); // starts dark
  bleedLight.position.set(
    FRONT_DOOR_LIGHT_SPOTS.bleed.x,
    FRONT_DOOR_LIGHT_SPOTS.bleed.y,
    FRONT_DOOR_LIGHT_SPOTS.bleed.z,
  );
  scene.add(bleedLight);
  const glassLight = THREE.pointLight(GLOW_MARQUEE, 0, FRONT_DOOR_GLASS_REACH_MIN); // starts dark
  glassLight.position.set(
    FRONT_DOOR_LIGHT_SPOTS.glass.x,
    FRONT_DOOR_LIGHT_SPOTS.glass.y,
    FRONT_DOOR_LIGHT_SPOTS.glass.z,
  );
  scene.add(glassLight);

  // Provisional identity lighting: hues from lights, never painted glow
  // (spec Design Notes item 7 — "readable at 6m" is the lead's smoke check).
  for (const zone of zones) addLight(THREE, scene, zone.light);
  for (const light of roadmap.lights) addLight(THREE, scene, light);
  const doorGlow = THREE.pointLight(GLOW_RED, DOOR_GLOW_INTENSITY, DOOR_GLOW_REACH);
  doorGlow.position.set(0, DOOR_GLOW_Y, DOOR_GLOW_Z);
  scene.add(doorGlow);
  scene.add(THREE.ambientLight(ROOM_BLACK, AMBIENT_INTENSITY));

  return { screens, doors, cabinetLights, frontDoor: { panel: frontDoorPanel, glass, handle, bleedLight, glassLight } };
}
