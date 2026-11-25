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
import { paintCarpet, paintFlyer, paintMarquee, paintScreen } from "./surfaces.ts";
import type { CollisionVolume } from "./collision-volumes.ts";
import { DOOR_TOP, INTERIOR, WALL_T, WALL_TOP, collisionVolumes } from "./collision-volumes.ts";
import type { ZoneLight } from "./zones.ts";
import { ZONE_LIGHT_DISTANCE, ZONE_LIGHT_INTENSITY, roadmap, zones } from "./zones.ts";
import { EMPTY_BASEPLATE, wallSlots } from "./slot-config.ts";
import {
  CABINET_LIGHT_INTENSITY,
  CABINET_LIGHT_REACH,
  CABINET_LIGHT_STANDOFF_M,
  MARQUEE_CAP_M,
  SHELL,
  SCREEN_ATTRACT_CAP_M,
  cabinetPlacements,
  coinDoorPose,
  placementGeometry,
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

// Painted faces (marquee + screen) are thin as paper — the FLYER_T
// sibling; exported so the test pins derive from it, never retype (the
// one-geometry-source law in the pins' direction).
export const FACE_T = 0.005;

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

export interface RoomHandles {
  screens: ScreenHandle[];
  doors: DoorHandle[];
  frontDoor: FrontDoorHandle;
}

/**
 * Build the room into `scene`: one box mesh per collision volume extruded
 * straight from its bounds, walls wainscotted, ceiling/floor/pillars/door/
 * street in token colours, empty-slot baseplates, the Welcome Flyer painted
 * onto an injected canvas, the authored stand-up shells' parts + glow
 * lights, the provisional zone/roadmap/door glow lighting, and the 1.9
 * street-side front-door furniture (awning, glazing, handle) with its two
 * dark street lights. Returns the coin-door, screen, and front-door
 * handles the frame side animates.
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
  let frontDoorPanel: Placed | null = null;
  for (const v of collisionVolumes) {
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

  // Story 1.4: the authored stand-up shells (cabinets.ts placements). The
  // body box already stands from the volume-list extrusion above (kind
  // "cabinet" takes the Wall Panel material — the mockup's cabinet body);
  // this loop adds SHELL_PART_MESHES part meshes per shell (1.4's six +
  // 1.10 DW-29's five contour mounts) and the two glow lights, every coord
  // derived from the placement record — never retyped (one-geometry-source
  // law). The coin door poses start CLOSED; the frame side re-poses from
  // coinDoorPose every frame.
  const screens: ScreenHandle[] = [];
  const doors: DoorHandle[] = [];
  const marqueeBarMat = THREE.standardMaterial({ color: ROOM_BLACK, roughness: 1 });
  const bezelMat = THREE.standardMaterial({ color: CARD_INK, roughness: 0.9 });
  const doorMat = THREE.standardMaterial({ color: WALL_WARM, roughness: 0.85 }); // mockup .coindoor bg
  const slotMat = THREE.standardMaterial({ color: SIGN_CHALK, roughness: 0.6 }); // mockup .slot bg
  // 1.10 DW-29 contour materials — tokens.ts tokens only (the hue-home guard):
  // the deck slab and side wings share the body's Wall Panel woodwork, the
  // kick plate and hood lip share the bezel's Card Ink.
  const deckMat = THREE.standardMaterial({ color: WALL_PANEL, roughness: 0.85 });
  const kickMat = THREE.standardMaterial({ color: CARD_INK, roughness: 0.9 });
  const hoodMat = THREE.standardMaterial({ color: CARD_INK, roughness: 0.9 });
  const wingMat = THREE.standardMaterial({ color: WALL_PANEL, roughness: 0.85 });
  for (const p of cabinetPlacements) {
    const g = placementGeometry(p.slotId);
    const facesX = g.facing.x !== 0;
    // Width runs along visitor-right, depth along the facing — derived from
    // the facing axis, no per-slot coord branches.
    const dims = (width: number, depth: number): { x: number; z: number } =>
      facesX ? { x: depth, z: width } : { x: width, z: depth };
    const mount = (
      width: number,
      height: number,
      depth: number,
      centerY: number,
      proudOffset: number,
      material: object,
    ): Placed => {
      const d = dims(width, depth);
      return addBox(
        THREE,
        scene,
        material,
        d.x,
        height,
        d.z,
        g.front.x + g.facing.x * proudOffset,
        centerY,
        g.front.z + g.facing.z * proudOffset,
      );
    };

    // Marquee: Room Black bar proud of the front face, its painted sheet
    // (room-black ground, marquee-amber title at the MARQUEE_CAP_M floor)
    // on the bar's outer face — the mockup's "marquee bg room-black,
    // lettering glow-marquee".
    const marquee = SHELL.marquee;
    mount(marquee.width, marquee.height, marquee.depth, marquee.centerY, marquee.depth / 2, marqueeBarMat);
    const marqueeMat = THREE.standardMaterial({
      color: FACE_TINT,
      map: THREE.canvasTexture(
        paintMarquee(
          makeCanvas,
          p.title,
          toCss(ROOM_BLACK),
          toCss(p.marqueeHue),
          MARQUEE_CAP_M,
          marquee.width,
          marquee.height,
        ),
      ),
      roughness: 0.95,
    });
    mount(marquee.width, marquee.height, FACE_T, marquee.centerY, marquee.depth + FACE_T / 2, marqueeMat);

    // Screen: Card Ink bezel frame, then the live face (attract + scan in
    // the machine's hue, NEXT in marquee amber — the mockup's .attract /
    // .next colours). Painted at step 0; the frame side repaints.
    const bezel = SHELL.bezel;
    mount(bezel.width, bezel.height, bezel.depth, bezel.centerY, bezel.depth / 2, bezelMat);
    const screenCanvas = paintScreen(
      makeCanvas,
      p.screenZones,
      0,
      toCss(ROOM_BLACK),
      toCss(p.hue),
      toCss(p.marqueeHue),
      SCREEN_ATTRACT_CAP_M,
      MARQUEE_CAP_M,
      SHELL.screen.width,
      SHELL.screen.height,
    );
    const screenTexture = THREE.canvasTexture(screenCanvas);
    const screenMat = THREE.standardMaterial({ color: FACE_TINT, map: screenTexture, roughness: 1 });
    mount(
      SHELL.screen.width,
      SHELL.screen.height,
      FACE_T,
      SHELL.screen.centerY,
      bezel.depth + FACE_T / 2,
      screenMat,
    );
    screens.push({ id: p.volumeId, canvas: screenCanvas, texture: screenTexture });

    // Coin door + the coin-slot detail riding it, posed CLOSED at build.
    const pose = coinDoorPose(p.volumeId, false);
    const apply = (placed: Placed, one: { x: number; y: number; z: number; yaw: number }): void => {
      placed.position.set(one.x, one.y, one.z);
      placed.rotation.set(0, one.yaw, 0);
    };
    const door = SHELL.coinDoor;
    const panel = THREE.mesh(
      THREE.boxGeometry(door.width, door.height, door.thickness),
      doorMat,
    );
    apply(panel, pose.panel);
    scene.add(panel);
    const slot = SHELL.coinSlot;
    const slotMesh = THREE.mesh(
      THREE.boxGeometry(slot.width, slot.height, slot.thickness),
      slotMat,
    );
    apply(slotMesh, pose.slot);
    scene.add(slotMesh);
    doors.push({ id: p.volumeId, mesh: panel, slot: slotMesh });

    // Story 1.10 (DW-29): the upright contours. The deck slab and the hood
    // lip sit at their record's `proud` face offset from the body front
    // plane (box centre at proud - depth/2); the kick plate rides the body
    // centre line (its face offset derives from the SHELL depth difference);
    // the two side wings ride the body sides at lateralOffset. Dims come
    // only from the SHELL record (one-geometry-source law) — every part
    // within 0.06m of the body AABB sides (scene.test's contour pins).
    const deck = SHELL.deck;
    mount(deck.width, deck.height, deck.depth, deck.centerY, deck.proud - deck.depth / 2, deckMat);
    const kick = SHELL.kick;
    mount(kick.width, kick.height, kick.depth, kick.centerY, -SHELL.body.depth / 2, kickMat);
    const hood = SHELL.hood;
    mount(hood.width, hood.height, hood.depth, hood.centerY, hood.proud - hood.depth / 2, hoodMat);
    const wings = SHELL.sidePanels;
    const wingD = dims(wings.thickness, wings.depth);
    for (const side of [-1, 1]) {
      addBox(
        THREE,
        scene,
        wingMat,
        wingD.x,
        wings.height,
        wingD.z,
        g.center.x + g.right.x * wings.lateralOffset * side,
        wings.centerY,
        g.center.z + g.right.z * wings.lateralOffset * side,
      );
    }

    // Cabinet glow: marquee spill in the marquee family + screen halo in
    // the machine's family, in front of the face at each part's height
    // (hues from LIGHTS, never painted glow — 1.3's identity law).
    const spill = THREE.pointLight(p.marqueeHue, CABINET_LIGHT_INTENSITY, CABINET_LIGHT_REACH);
    spill.position.set(g.front.x + g.facing.x * CABINET_LIGHT_STANDOFF_M, marquee.centerY, g.front.z + g.facing.z * CABINET_LIGHT_STANDOFF_M);
    scene.add(spill);
    const halo = THREE.pointLight(p.hue, CABINET_LIGHT_INTENSITY, CABINET_LIGHT_REACH);
    halo.position.set(g.front.x + g.facing.x * CABINET_LIGHT_STANDOFF_M, SHELL.screen.centerY, g.front.z + g.facing.z * CABINET_LIGHT_STANDOFF_M);
    scene.add(halo);
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

  return { screens, doors, frontDoor: { panel: frontDoorPanel, glass, handle, bleedLight, glassLight } };
}
