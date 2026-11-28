// Story 1.3 (AC7) through Story 2.0: the scene builder driven through the
// fake Three seam (the injectable-source pattern again — core/main.ts holds
// the real adapter, main-glue.test.ts pins that wiring). Pins the extrusion
// contract: one box mesh per NON-cabinet collision volume with dims read
// straight off the authored bounds (the single-geometry-source law in render
// form), Wall Panel wainscot band 0..1.0m on every wall, Room Black ceiling
// over the full envelope, carpet floor carrying the painted texture, 20
// baseplates under the empty slots, the painted Welcome Flyer as the only
// paper text surface. Story 2.0 (DW-29 rebuild): each cabinet is a
// per-cabinet local-frame GROUP (profiled side panels + core extrusion,
// front panel, side art, contact shadow, and the tilted screen / control /
// marquee / grille sub-assemblies) — the cabinet collision volume gets NO
// body-sized mesh (DW-42's deck slab and the old body box are gone). Only
// the coin-door family stays world-posed. BoxGeometry stays the only kind
// for room volumes; profiled/cylinder/sphere primitives live inside cabinet
// groups only. Emissive is legal on exactly two faces per cabinet (the
// screen + marquee, DW-23's re-derived exposure law re-pins the light
// triple); hues still arrive from lights everywhere else.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ShaderChunk } from "three";
import { AMBIENT_INTENSITY, buildRoomScene, DOOR_GLOW_INTENSITY, DOOR_GLOW_REACH, type Placed, type RoomScene, type Three } from "./scene.ts";
import { DOOR_TOP, INTERIOR, WALL_T, WALL_TOP, collisionVolumes } from "./collision-volumes.ts";
import { EMPTY_BASEPLATE, wallSlots } from "./slot-config.ts";
import { CASUAL_ALLEY, PINBALL_CORNER, SNACK_BAR, WORKSHOP, ZONE_LIGHT_DISTANCE, ZONE_LIGHT_INTENSITY, roadmap, zones } from "./zones.ts";
import { WELCOME_FLYER, signSurfaces } from "./signage.ts";
import {
  CABINET_FACE_ILLUMINANCE_CEILING,
  CABINET_FACE_ILLUMINANCE_FLOOR,
  CABINET_LIGHT_INTENSITY,
  CABINET_LIGHT_REACH,
  CABINET_LIGHT_STANDOFF_M,
  INNER_PROFILE,
  SHELL,
  SHELL_PART_MESHES,
  SIDE_PROFILE,
  cabinetAABB,
  cabinetPlacements,
  closedYaw,
  coinDoorPose,
  placementGeometry,
} from "./cabinets.ts";
import {
  HAZE_FLOOR,
  SPILL_CEILING_INSET_M,
  SPILL_FLOOR_MOUNT_M,
  SPILL_REACH_M,
  buildSpillNodes,
  glowPulse,
  hazeFactor,
} from "./atmosphere.ts";
import {
  FRONT_DOOR_AWNING,
  FRONT_DOOR_BLEED_REACH_MIN,
  FRONT_DOOR_FURNITURE_MESHES,
  FRONT_DOOR_GLASS,
  FRONT_DOOR_GLASS_REACH_MIN,
  FRONT_DOOR_HANDLE,
  FRONT_DOOR_LIGHTS,
  FRONT_DOOR_LIGHT_SPOTS,
  frontDoorOpenPose,
} from "./door.ts";
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
  GLOW_CYAN,
  GLOW_GREEN,
  GLOW_MARQUEE,
  GLOW_ORANGE,
  GLOW_PINK,
  GLOW_RED,
  GLOW_STEEL,
  GLOW_VIOLET,
  PAPER_CARD,
  ROOM_BLACK,
  SIGN_CHALK,
  STREET_GRAY,
  WALL_PANEL,
  WALL_WARM,
} from "./tokens.ts";
import { FLYER_PX_PER_M, type PaintContext, type PaintSurface } from "./surfaces.ts";

const SCENE_SRC = path.join(import.meta.dirname, "scene.ts");

// --- fakes -------------------------------------------------------------------

interface GeoRec {
  kind: "box" | "extrude" | "cylinder" | "sphere";
  // box dims; for a cylinder/sphere the fake records the bounding box
  // (w = d = 2r, h = height) so every dim law below stays uniform.
  w: number;
  h: number;
  d: number;
  points?: readonly { x: number; y: number }[];
  depth?: number;
}

interface MatRec {
  params: Record<string, unknown>;
}

// 2.0: the fake speaks the seam's GROUP tier — every node keeps its local
// position + rotation and a parent link, so world/assembly-local queries
// below run the same two-step transform three.js would.
interface NodeRec {
  kind: "mesh" | "group" | "light";
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  parent: NodeRec | null;
  geo?: GeoRec;
  mats?: MatRec[];
}

interface MeshRec extends NodeRec {
  kind: "mesh";
  geo: GeoRec;
  mat: MatRec; // first material (the fake's convenience view)
  mats: MatRec[];
  yaw: number; // == ry
}

interface LightRec {
  color: number;
  intensity: number;
  distance: number;
  x: number;
  y: number;
  z: number;
}

function fakeThree() {
  const geos: GeoRec[] = [];
  const mats: MatRec[] = [];
  const meshes: MeshRec[] = [];
  const groups: NodeRec[] = [];
  const lights: LightRec[] = [];
  const ambients: { color: number; intensity: number }[] = [];
  const textures: { source: PaintSurface }[] = [];
  const recOf = new WeakMap<object, NodeRec>();
  let textureUpdates = 0;
  const three: Three = {
    boxGeometry(w, h, d) {
      const g: GeoRec = { kind: "box", w, h, d };
      geos.push(g);
      return g;
    },
    // Story 2.0 (DW-29 rebuild): this rig must speak the EXTENDED seam —
    // the brief's "every headless fake" requirement.
    extrudeGeometry(points, depth) {
      const g: GeoRec = { kind: "extrude", w: NaN, h: NaN, d: NaN, points, depth };
      geos.push(g);
      return g;
    },
    cylinderGeometry(radiusTop, _radiusBottom, height, _radialSegments) {
      const g: GeoRec = { kind: "cylinder", w: 2 * radiusTop, h: height, d: 2 * radiusTop };
      geos.push(g);
      return g;
    },
    sphereGeometry(radius, _widthSegments, _heightSegments) {
      const g: GeoRec = { kind: "sphere", w: 2 * radius, h: 2 * radius, d: 2 * radius };
      geos.push(g);
      return g;
    },
    standardMaterial(params) {
      const m: MatRec = { params: { ...params } };
      mats.push(m);
      return m;
    },
    mesh(geometry, material) {
      const list = (Array.isArray(material) ? material : [material]) as MatRec[];
      const node: MeshRec = {
        kind: "mesh",
        x: NaN,
        y: NaN,
        z: NaN,
        rx: 0,
        ry: 0,
        parent: null,
        geo: geometry as GeoRec,
        mats: list,
        mat: list[0]!,
        yaw: 0,
      };
      meshes.push(node);
      const placed: Placed = {
        position: {
          set(x, y, z) {
            node.x = x;
            node.y = y;
            node.z = z;
          },
        },
        rotation: {
          set(x, y, z) {
            node.rx = x;
            node.ry = y;
            node.yaw = y;
            void z;
          },
        },
      };
      recOf.set(placed, node);
      return placed;
    },
    group() {
      const node: NodeRec = { kind: "group", x: NaN, y: NaN, z: NaN, rx: 0, ry: NaN, parent: null };
      groups.push(node);
      const placed = {
        position: {
          set(x: number, y: number, z: number) {
            node.x = x;
            node.y = y;
            node.z = z;
          },
        },
        // The group yaw is set BY ASSIGNMENT in scene.ts (rotation.y = yaw),
        // so the fake's rotation object WRITES the assignment into node.ry
        // (a plain y property would let the pin compare 0 against an initial
        // 0 even if the builder dropped the assignment entirely — with ry
        // starting NaN, a dropped assignment reddens the yaw pin).
        rotation: {
          set(x: number, y: number, z: number) {
            node.rx = x;
            node.ry = y;
            void z;
          },
          get y() {
            return node.ry;
          },
          set y(v: number) {
            node.ry = v;
          },
        },
        add(child: object) {
          const c = recOf.get(child);
          if (c) c.parent = node;
        },
      };
      recOf.set(placed, node);
      return placed;
    },
    pointLight(color, intensity, distance) {
      const rec: LightRec = { color, intensity, distance, x: NaN, y: NaN, z: NaN };
      lights.push(rec);
      return {
        position: {
          set(x, y, z) {
            rec.x = x;
            rec.y = y;
            rec.z = z;
          },
        },
        rotation: { set() {} },
      };
    },
    ambientLight(color, intensity) {
      ambients.push({ color, intensity });
      return { color, intensity };
    },
    canvasTexture(source) {
      const t = { source: source as PaintSurface };
      textures.push(t);
      return t;
    },
    markTextureUpdated() {
      textureUpdates += 1;
    },
  };
  return { three, geos, mats, meshes, groups, lights, ambients, textures, textureUpdateCount: () => textureUpdates };
}

// Rotate a local offset through one node's rotation (single-axis in this
// build: the groups lean about X or yaw about Y).
function rotateBy(node: NodeRec, v: { x: number; y: number; z: number }): void {
  if (node.rx !== 0) {
    const c = Math.cos(node.rx);
    const s = Math.sin(node.rx);
    const y = v.y * c - v.z * s;
    const z = v.y * s + v.z * c;
    v.y = y;
    v.z = z;
  }
  if (node.ry !== 0) {
    const c = Math.cos(node.ry);
    const s = Math.sin(node.ry);
    const x = v.x * c + v.z * s;
    const z = -v.x * s + v.z * c;
    v.x = x;
    v.z = z;
  }
}

// World position of a node through its parent chain (three's matrix law).
function world(node: NodeRec): { x: number; y: number; z: number } {
  const v = { x: node.x, y: node.y, z: node.z };
  for (let p = node.parent; p; p = p.parent) {
    rotateBy(p, v);
    v.x += p.x;
    v.y += p.y;
    v.z += p.z;
  }
  return v;
}

// Position of a node in the frame of its nearest group ancestor's ROOT
// cabinet group (the containment law's local frame).
function inGroupFrame(node: NodeRec): { x: number; y: number; z: number } {
  const v = { x: node.x, y: node.y, z: node.z };
  let p = node.parent;
  while (p && p.parent) {
    rotateBy(p, v);
    v.x += p.x;
    v.y += p.y;
    v.z += p.z;
    p = p.parent;
  }
  return v;
}

function fakeWorld(): {
  scene: RoomScene;
  objects: object[];
  factory: (w: number, h: number) => PaintSurface;
  canvasTexts: string[][];
  canvases: PaintSurface[];
  canvasArcs: { x: number; y: number; r: number }[][];
} {
  const objects: object[] = [];
  const canvasTexts: string[][] = [];
  const canvases: PaintSurface[] = [];
  const canvasArcs: { x: number; y: number; r: number }[][] = [];
  const scene: RoomScene = {
    add(o) {
      objects.push(o);
      return objects.length;
    },
  };
  const factory = (w: number, h: number): PaintSurface => {
    const texts: string[] = [];
    canvasTexts.push(texts);
    const arcs: { x: number; y: number; r: number }[] = [];
    canvasArcs.push(arcs);
    const ctx: PaintContext = {
      fillStyle: "#000000",
      font: "",
      textAlign: "",
      fillRect() {},
      fillText(text) {
        texts.push(text);
      },
      // Deterministic generous per-character estimate (0.92em of the set
      // font) - same fake-metric family as surfaces.test.ts (rework pass 1).
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
      // Story 2.0: the side-art / overlay / contact-shadow painters use the
      // transform + path legs — the needLeg guard in surfaces.ts throws on a
      // missing one, so this fake implements them (and carries no text).
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      beginPath() {},
      arc(x, y, radius) {
        arcs.push({ x, y, r: radius });
      },
      stroke() {},
      lineWidth: 0,
      createRadialGradient() {
        return { addColorStop() {} };
      },
    };
    const canvas: PaintSurface = { width: w, height: h, getContext: (kind) => (kind === "2d" ? ctx : null) };
    canvases.push(canvas);
    return canvas;
  };
  return { scene, objects, factory, canvasTexts, canvases, canvasArcs };
}

const built = (() => {
  const f = fakeThree();
  const w = fakeWorld();
  const handles = buildRoomScene(f.three, w.scene, w.factory);
  return { ...f, ...w, handles };
})();

// Story 2.3: the spill tier through the SAME fake seam — its own clean rig
// (main.ts builds it into the room's own scene; a fresh recorder keeps the
// census unambiguous). No fakeThree extension: pointLight is the tier's
// only seam primitive.
const atmo = (() => {
  const f = fakeThree();
  const w = fakeWorld();
  const nodes = buildSpillNodes(f.three, w.scene, collisionVolumes, cabinetPlacements);
  return { ...f, ...w, nodes };
})();

// Story 2.3 (AC1 ramp walk): a THIRD rig — the walk WRITES light
// intensities, so it rides its own recorded scene and leaves the shared
// `built` recorder's values at their built state for every other test
// (hermeticity: each pin creates the state it perturbs).
const walk = (() => {
  const f = fakeThree();
  const w = fakeWorld();
  const handles = buildRoomScene(f.three, w.scene, w.factory);
  return { ...f, ...w, handles };
})();

const DOT = String.fromCharCode(0xb7);

function meshForVolume(id: string): MeshRec {
  const v = collisionVolumes.find((c) => c.id === id);
  assert.ok(v, `volume "${id}" must exist`);
  const m = built.meshes.find(
    (x) =>
      x.geo.w === v.max.x - v.min.x && x.geo.h === v.max.y - v.min.y && x.geo.d === v.max.z - v.min.z &&
      x.x === (v.min.x + v.max.x) / 2 && x.z === (v.min.z + v.max.z) / 2,
  );
  assert.ok(m, `one box mesh extruded straight from "${id}" bounds`);
  return m;
}

// --- the single-geometry-source extrusion -------------------------------------

// Story 2.0 narrowing: the cabinet volumes drop out of the box-per-volume
// law — the DW-29 rebuild builds each cabinet as a profiled group assembly,
// and DW-42's deck slab / the old body box are deleted (the no-body-mesh pin
// lives in the shell-build test). Every other volume stays box-extruded.
test("one box mesh per NON-cabinet collision volume, dims read straight off the authored bounds (the single-geometry-source law in render form; 2.0 narrows cabinets out)", () => {
  const boxed = collisionVolumes.filter((v) => v.kind !== "cabinet");
  for (const v of boxed) {
    const m = meshForVolume(v.id);
    const expectedColor = v.kind === "wall" ? WALL_WARM : v.kind === "street" ? STREET_GRAY : WALL_PANEL;
    assert.equal(m.mat.params["color"], expectedColor, `${v.id} material token`);
  }
  // no volume gets a second copy and no mesh drifts off its volume
  for (const v of boxed) {
    const copies = built.meshes.filter(
      (m) =>
        m.geo.w === v.max.x - v.min.x && m.geo.h === v.max.y - v.min.y && m.geo.d === v.max.z - v.min.z &&
        m.x === (v.min.x + v.max.x) / 2 && m.z === (v.min.z + v.max.z) / 2,
    );
    assert.equal(copies.length, 1, `${v.id} extruded exactly once, on its own footprint`);
  }
});

test("walls wainscot to Wall Panel 0..1.0m; ceiling Room Black over the full envelope; floor carries the painted carpet texture (AC4/AC7 tokens only)", () => {
  const bands = built.meshes.filter((m) => m.geo.h === 1.0);
  assert.equal(bands.length, collisionVolumes.filter((v) => v.kind === "wall").length, "one wainscot band per wall volume");
  for (const b of bands) {
    assert.equal(b.mat.params["color"], WALL_PANEL);
    assert.equal(b.y, 0.5, "band spans 0..1.0m");
  }
  // Placement law per wall: every band sits inset toward its OWN wall's room
  // face (never coplanar, never buried — the z-fighting the inset exists to
  // prevent), on that wall's footprint, widened at most the along-wall 0.01.
  const halfX = INTERIOR.width / 2;
  const halfZ = INTERIOR.depth / 2;
  for (const v of collisionVolumes.filter((v) => v.kind === "wall")) {
    const n =
      v.max.x === -halfX ? { x: 1, z: 0 } :
      v.min.x === halfX ? { x: -1, z: 0 } :
      v.max.z === -halfZ ? { x: 0, z: 1 } : { x: 0, z: -1 };
    const cx = (v.min.x + v.max.x) / 2;
    const cz = (v.min.z + v.max.z) / 2;
    const band = bands.find(
      (b) => Math.abs(b.x - cx) <= (v.max.x - v.min.x) / 2 + 0.05 && Math.abs(b.z - cz) <= (v.max.z - v.min.z) / 2 + 0.05,
    );
    assert.ok(band, `wainscot band on ${v.id}`);
    const inset = (band.x - cx) * n.x + (band.z - cz) * n.z;
    assert.ok(inset > 0 && inset < 0.05, `${v.id} band inset toward the room face, not coplanar or buried`);
    assert.ok(
      band.geo.w <= v.max.x - v.min.x + 0.011 && band.geo.d <= v.max.z - v.min.z + 0.011,
      `${v.id} band stays on its wall's footprint`,
    );
  }
  const ceiling = built.meshes.find((m) => m.geo.h === 0.1);
  assert.ok(ceiling, "ceiling slab");
  assert.deepEqual([ceiling.geo.w, ceiling.geo.d], [INTERIOR.width + 2 * WALL_T, INTERIOR.depth + 2 * WALL_T]);
  assert.equal(ceiling.y, WALL_TOP + ceiling.geo.h / 2, "ceiling slab rests on the wall top, not a retyped height");
  assert.equal(ceiling.mat.params["color"], ROOM_BLACK);
  const floor = built.meshes.find((m) => m.geo.w === INTERIOR.width && m.geo.d === INTERIOR.depth);
  assert.ok(floor, "carpet floor");
  assert.equal(floor.mat.params["color"], CARPET_BASE);
  assert.ok(typeof floor.mat.params["map"] === "object", "floor material carries the painted carpet map");
});

test("empty Wall Slots get baseplate meshes (20, Wall Panel, raised), and the one Welcome Flyer is a textured mesh \u2014 never a DOM node (AC2/AC6)", () => {
  // NB: the street-floor slab shares the 0.05m thickness — filter on the
  // raised plate height too, or it would be counted as a baseplate.
  const plateY = EMPTY_BASEPLATE.raise + EMPTY_BASEPLATE.thickness / 2;
  const plates = built.meshes.filter((m) => m.geo.h === EMPTY_BASEPLATE.thickness && m.y === plateY);
  assert.equal(plates.length, wallSlots.length);
  for (const s of wallSlots) {
    const p = plates.find((m) => m.x === s.center.x && m.z === s.center.z);
    assert.ok(p, `baseplate under ${s.id}`);
    assert.equal(p.y, EMPTY_BASEPLATE.raise + EMPTY_BASEPLATE.thickness / 2);
    assert.equal(p.mat.params["color"], WALL_PANEL);
    const alongX = s.facing.x !== 0;
    assert.deepEqual([p.geo.w, p.geo.d], alongX ? [EMPTY_BASEPLATE.depth, EMPTY_BASEPLATE.alongWall] : [EMPTY_BASEPLATE.alongWall, EMPTY_BASEPLATE.depth]);
  }
  const flyer = WELCOME_FLYER;
  const f = built.meshes.find((m) => m.x === flyer.position.x && m.y === flyer.position.y && m.z === flyer.position.z);
  assert.ok(f, "the flyer is placed at its authored spot");
  assert.deepEqual([f.geo.w, f.geo.h], [flyer.width, flyer.height]);
  assert.ok(f.geo.d <= 0.01, "the sheet is paper-thin");
  assert.equal(f.mat.params["color"], PAPER_CARD);
  const map = f.mat.params["map"];
  assert.ok(typeof map === "object", "the flyer is texture-mapped");
  // the painter drew the verbatim control line onto an injected canvas
  const tex = built.textures.find((t) => t === map);
  assert.ok(tex, "the flyer texture came from an injected canvas");
  // The canvas follows the record's sheet metres at the scene tier too:
  // texture aspect == mesh aspect, no stretch (rework pass 1 contract).
  assert.deepEqual(
    [tex.source.width, tex.source.height],
    [Math.round(flyer.width * FLYER_PX_PER_M), Math.round(flyer.height * FLYER_PX_PER_M)],
    "the flyer canvas measures the record's sheet metres - mesh and texture share one aspect",
  );
  const texts = built.canvasTexts.find((list) => list.length > 0);
  assert.ok(texts && texts.length > 0, "the painter drew onto the injected canvas");
  // Verbatim, in the metric-robust form (rework pass 1 word-wrap): every
  // painted line is a substring of the authored string, and the painted
  // characters rebuild it in order (wrap points are font-dependent).
  for (const t of texts) assert.ok(flyer.text.includes(t), `painted line "${t}" is a substring of the verbatim text`);
  assert.equal(
    texts.join("").replace(/\s+/g, ""),
    flyer.text.split(` ${DOT} `).join("").replace(/\s+/g, ""),
    "painted characters are the verbatim control line in order",
  );
  assert.equal(
    built.canvasTexts.length,
    4 + 4 * cabinetPlacements.length,
    "painted canvases: carpet + flyer + the 1.9 street glazing sheet + ONE shared contact shadow, plus marquee + screen + side-art + control overlay per placement (2.0 rebuild)",
  );
});

// --- lighting: hues arrive from lights, never from emissive -------------------

test("point lights = 4 zone identity + 2 roadmap amber + 1 door glow + 2 per cabinet shell (marquee spill + screen halo) + the 1.9 street-side door pair (bleed + glass); hues are glow-anchor tokens only; one token-coloured Room Black fill ambient (1.3 AC4, 1.4, 1.9)", () => {
  assert.equal(built.lights.length, 7 + FRONT_DOOR_LIGHTS + 2 * cabinetPlacements.length);
  const zoneLights = [PINBALL_CORNER, WORKSHOP, SNACK_BAR, CASUAL_ALLEY].flatMap((z) => [z.light]);
  for (const zl of zoneLights) {
    const l = built.lights.find((x) => x.x === zl.x && x.y === zl.y && x.z === zl.z);
    assert.ok(l, `zone light at (${zl.x},${zl.z})`);
    assert.equal(l.color, zl.hue);
    assert.equal(l.intensity, ZONE_LIGHT_INTENSITY);
    assert.equal(l.distance, ZONE_LIGHT_DISTANCE);
  }
  // Fill law: the authored intensity/reach sit above the 3.0 / 8m
  // placeholder floor that reads near-black at the 6m vantages — reverting
  // the authored pair reddens here without touching the hue/id/position
  // guards above.
  assert.ok(ZONE_LIGHT_INTENSITY > 3, "zone/amber intensity is above the 3.0 placeholder floor");
  assert.ok(ZONE_LIGHT_DISTANCE > 8, "zone/amber reach is above the 8m placeholder floor");
  for (const rl of roadmap.lights) {
    const l = built.lights.find((x) => x.x === rl.x && x.y === rl.y && x.z === rl.z);
    assert.ok(l, `roadmap light at (${rl.x},${rl.z})`);
    assert.equal(l.color, GLOW_MARQUEE);
    assert.equal(l.intensity, ZONE_LIGHT_INTENSITY, "roadmap amber carries the authored fill intensity");
    assert.equal(l.distance, ZONE_LIGHT_DISTANCE, "roadmap amber carries the authored fill reach");
  }
  const door = built.lights.find((l) => l.color === GLOW_RED);
  assert.ok(door, "door glow light");
  assert.ok(door.y > DOOR_TOP, "door glow sits above the door head");
  assert.equal(door.x, 0, "door glow centred on the door gap");
  assert.ok(door.z < INTERIOR.depth / 2, "door glow hangs on the room side of the front wall face, not in the street");
  assert.equal(door.intensity, DOOR_GLOW_INTENSITY, "door glow carries the authored intensity");
  assert.equal(door.distance, DOOR_GLOW_REACH, "door glow carries the authored reach");
  assert.ok(DOOR_GLOW_INTENSITY > 1.5, "door glow intensity is above the 1.5 placeholder floor");
  assert.ok(DOOR_GLOW_REACH > 4, "door glow reach is above the 4m placeholder floor");
  assert.equal(built.ambients.length, 1);
  assert.equal(built.ambients[0]!.color, ROOM_BLACK);
  // The builder hangs exactly the authored fill (this pin derives from the
  // exported constant — it moves with a re-tune and never weakens): the
  // fill sits above the 0.15 near-no-op floor and stays a lift, not a
  // flood, so the dark the glow sits against stays dark.
  assert.equal(built.ambients[0]!.intensity, AMBIENT_INTENSITY, "ambient carries the authored fill value");
  assert.ok(built.ambients[0]!.intensity > 0.15, "ambient is above the 0.15 near-no-op floor");
  assert.ok(built.ambients[0]!.intensity <= 1, "ambient is a fill, not a flood (the dark identity stays)");
  const glowAnchors = [GLOW_MARQUEE, GLOW_PINK, GLOW_CYAN, GLOW_GREEN, GLOW_VIOLET, GLOW_ORANGE, GLOW_RED, GLOW_STEEL];
  for (const l of built.lights) assert.ok(glowAnchors.includes(l.color), `light hue ${l.color.toString(16)} is a DESIGN glow anchor`);
});

// Story 2.0 narrowing of the 1.3 "zero emissive anywhere" law: the DW-29
// rebuild makes the screen and marquee faces self-lit (emissive maps) —
// exactly two per cabinet, nothing else. The "paint glow on walls" DESIGN
// don't stands: no wall, floor, ceiling or furniture material glows.
test("emissive on exactly two faces per cabinet (the live screen + the marquee), both FACE_TINT maps on a black base; nothing else in the build glows (2.0 contract change 5; the DESIGN don't holds for every other surface)", () => {
  const glow = built.mats.filter((m) => "emissive" in m.params);
  assert.equal(glow.length, 2 * cabinetPlacements.length, "exactly two emissive materials per placement");
  const intensities = new Set<number>();
  for (const m of glow) {
    assert.equal(m.params["emissive"], FACE_TINT, "the emissive hue is the FACE_TINT token (hues ride the emissiveMap)");
    assert.ok(typeof m.params["emissiveMap"] === "object", "the glow is a painted map, never a flat flood");
    assert.equal(m.params["color"], 0, "the base colour is black \u2014 only the map lights the face (0 is the brief's 0x000000)");
    intensities.add(Number(m.params["emissiveIntensity"]));
  }
  assert.deepEqual([...intensities].sort(), [1.0, 1.2], "the two faces carry exactly the brief's 1.0 (screen) and 1.2 (marquee) intensities");
  const src = readFileSync(SCENE_SRC, "utf8");
  const emCount = src.match(/emissive:/g)?.length ?? 0;
  assert.equal(emCount, 2, "scene.ts sets emissive on exactly two materials (screenMat + marqueeMat)");
});

// Story 2.0 narrowing of the 1.3 "BoxGeometry only" law: the rebuilt shell
// asks the seam for profile extrusions + joystick primitives — legal ONLY
// inside cabinet groups. The room itself stays box-built, and the old
// curved-primitive bans stay (no Circle/Plane/Cone anywhere).
test("room volumes stay box-built; every profiled/cylinder/sphere primitive lives inside a cabinet group; no Circle/Plane/Cone primitive anywhere (2.0 seam extension stays contained)", () => {
  const src = readFileSync(SCENE_SRC, "utf8");
  for (const banned of ["CircleGeometry", "PlaneGeometry", "ConeGeometry"]) {
    assert.ok(!src.includes(banned), `scene.ts must not use ${banned}`);
  }
  const insideGroup = (m: MeshRec): boolean => {
    for (let p = m.parent; p; p = p.parent) if (p.kind === "group") return true;
    return false;
  };
  for (const m of built.meshes) {
    if (m.geo.kind !== "box") assert.ok(insideGroup(m), `${m.geo.kind} primitive "${JSON.stringify([m.geo.w, m.geo.h, m.geo.d])}" sits outside any cabinet group \u2014 room geometry stays box-built`);
  }
  // Section 7: every shared geometry is created EXACTLY ONCE, outside the
  // placement loop — 2 profile extrusions + 5 cylinders + 1 sphere.
  const extrudes = built.geos.filter((g) => g.kind === "extrude");
  assert.equal(extrudes.length, 2, "exactly two profile extrusions (side panel + core)");
  assert.ok(extrudes.some((g) => g.points === SIDE_PROFILE), "the side-panel extrusion runs on the authored SIDE_PROFILE");
  assert.ok(extrudes.some((g) => g.points === INNER_PROFILE), "the core extrusion runs on the authored INNER_PROFILE");
  assert.equal(built.geos.filter((g) => g.kind === "cylinder").length, 5, "five cylinder primitives (washer, shaft, button, ring, start)");
  assert.equal(built.geos.filter((g) => g.kind === "sphere").length, 1, "one sphere (the joystick ball)");
  assert.ok(built.geos.filter((g) => g.kind === "box").length >= collisionVolumes.filter((v) => v.kind !== "cabinet").length, "the room's box geos stay built from the volumes");
});

test("static authored scene: the build emits exactly one mesh per NON-cabinet volume + wainscot + ceiling + floor + baseplates + flyer + SHELL_PART_MESHES per placement (formula, never a magic count), and touches no clock (AD-3/AD-15)", () => {
  const expectedMeshes =
    collisionVolumes.filter((v) => v.kind !== "cabinet").length +
    collisionVolumes.filter((v) => v.kind === "wall").length +
    2 + // ceiling + floor
    wallSlots.length +
    signSurfaces.length +
    SHELL_PART_MESHES * cabinetPlacements.length +
    FRONT_DOOR_FURNITURE_MESHES; // 1.9: awning + glazing + handle
  assert.equal(built.meshes.length, expectedMeshes, "mesh count derives from the authored data");
  // 2.0: 24 of the 28 shell parts live INSIDE the per-cabinet group; only
  // the coin-door family (4) is world-mounted. The scene graph adds the
  // world meshes, one group per placement, the lights and the ambient.
  const groupChildren = (SHELL_PART_MESHES - 4) * cabinetPlacements.length;
  assert.equal(
    built.objects.length,
    expectedMeshes - groupChildren + cabinetPlacements.length + built.lights.length + built.ambients.length,
    "the scene graph holds world meshes + one group per placement + lights + ambient only \u2014 no hidden nodes",
  );
  const src = readFileSync(SCENE_SRC, "utf8");
  for (const banned of ["Date.now", "performance.now", "Math.random", "requestAnimationFrame"]) {
    assert.ok(!src.includes(banned), `scene.ts must not use ${banned}`);
  }
});

// --- Story 1.4/2.0: the stand-up shells --------------------------------------

// The constant-IS-the-value drift pin (the marquee-cap idiom): the derived
// standoff pin below cannot see its own constant move. Re-pinned 0.30 ->
// 0.45 with the rework-iteration-1 exposure retune (the 0.30m hang put the
// light inside its own face's hot spot — the failed smoke).
test("the cabinet light standoff constant IS 0.45m (both cabinet glow lights hang this far in front of the face plane)", () => {
  assert.equal(CABINET_LIGHT_STANDOFF_M, 0.45, "0.45m standoff, the intensity/reach pair's sibling");
});

// DW-23 re-derivation (Story 2.0, measurement not guessing): the rebuild
// moved both proud offsets, so the 2.0/0.5 bound pair was re-derived by
// running three 0.187's exact ACESFilmicToneMapping maths headless:
// color *= toneMappingExposure / 0.6 (1.0 -> x1.667), the ACES in/out
// matrices are gray-preserving (row sums 1), and the fit is the rational
// RRTAndODTFit: a = v(v+0.0245786) - 0.000090537, b = v(0.983729v +
// 0.4329510) + 0.238081, result a/b (fit's numerator goes black below
// x = 0.00221 pre-tonemap). Measured anchors: fit(1.0/0.6) = 0.763 (the
// screen face at intensity 1.0), fit(1.2/0.6) = 0.804 (the marquee at 1.2),
// fit(2.0/0.6) = 0.888 — the old law's near-corner peak rendered ABOVE both
// emissive faces (the failed smoke's white-hot marquee). The new pair
// encodes the screen-brightest law: CEILING 1.18 = the pre-tonemap value
// that maps to 0.80 output, so no lit point out-shines the brightest
// emissive sheet; FLOOR 0.17 = pre-tonemap 0.20 output, below which a face
// reads dead. The built-equality pins in the shell-build test move WITH the
// geometry; the IS-value pins here are the drift cures (the CR-A1/A2 idiom
// — a derived inequality alone cannot see its own constants move). The
// proud literals below are the shell-build test's EXACT face-position pins
// read as front-plane offsets behind the body front (negative = recessed).
test("cabinet glow exposure law (DW-23, re-measured under ACES): each light's own contribution on both painted faces sits inside the 1.18 blow-out ceiling and above the 0.17 dead-face floor", () => {
  const faces = [
    // marquee face front: group-local z 0.2525 + 0.005/2 = 0.255, i.e.
    // 0.045 BEHIND the body front plane (0.30); screen face front: 0.01 +
    // cos(0.1707)(0.0055 + 0.0015) = 0.0169, i.e. 0.2831 behind.
    { name: "marquee", proud: -0.045, w: SHELL.marquee.width, h: SHELL.marquee.height },
    { name: "screen", proud: -0.2831, w: SHELL.screen.width, h: SHELL.screen.height },
  ];
  // The inequalities first: a blown-out re-tune reddens HERE, at the
  // exposure law, not merely at the drift pins below. Measured with these
  // prouds: marquee peak 1.02 / far corner 0.66; screen peak 0.47 / far
  // corner 0.35 — the 0.25 candela pair stays inside the measured band at
  // the rebuilt geometry (kept, not re-guessed: both faces sit INSIDE the
  // front plane now, so the prouds only lengthen every distance).
  for (const f of faces) {
    const dNear = CABINET_LIGHT_STANDOFF_M - f.proud;
    const eNear = CABINET_LIGHT_INTENSITY / (dNear * dNear);
    assert.ok(
      eNear <= CABINET_FACE_ILLUMINANCE_CEILING,
      `"${f.name}" face peak own-illuminance ${eNear.toFixed(2)} exceeds the ${CABINET_FACE_ILLUMINANCE_CEILING} blow-out ceiling (white-hot face — the failed smoke)`,
    );
    const dFar = Math.sqrt(dNear * dNear + (f.w / 2) * (f.w / 2) + (f.h / 2) * (f.h / 2));
    // N.L at the far corner: the face normal runs along the facing, so the
    // incidence factor is the depth ratio dNear/dFar (three's cosine term).
    const eFar = (CABINET_LIGHT_INTENSITY * (dNear / dFar)) / (dFar * dFar);
    assert.ok(
      eFar >= CABINET_FACE_ILLUMINANCE_FLOOR,
      `"${f.name}" face far-corner own-illuminance ${eFar.toFixed(2)} is under the ${CABINET_FACE_ILLUMINANCE_FLOOR} dead-face floor (a dark face is a Dead Machine by law)`,
    );
  }
  // IS-value drift pins last: the inequalities above read their constants,
  // so a raised ceiling or re-inflated candela value that keeps the
  // inequality green (a moved ceiling) still reddens here.
  assert.equal(CABINET_LIGHT_INTENSITY, 0.25, "the cabinet glow candela value IS the authored 0.25 (drift pin, kept per the DW-23 measurement)");
  assert.equal(CABINET_LIGHT_REACH, 4, "the cabinet glow reach constant IS 4 (drift pin — the spill-range cutoff; the face law is cutoff-independent at these depths)");
  assert.equal(CABINET_FACE_ILLUMINANCE_CEILING, 1.18, "the face-illuminance ceiling constant IS 1.18 \u2014 the measured pre-tonemap value that maps to 0.80 output (screen-brightest law, DW-23)");
  assert.equal(CABINET_FACE_ILLUMINANCE_FLOOR, 0.17, "the face-illuminance floor constant IS 0.17 \u2014 the measured pre-tonemap value that maps to 0.20 output (DW-23)");
});

// Story 2.0 QA (DW-23 substrate, made executable): the measured table the
// exposure law's literals come from (screen sheet 1.0 -> 0.763, marquee
// sheet 1.2 -> 0.804, the old bound's peak 2.0 -> 0.888, ceiling inverse
// 1.18 -> 0.80, floor inverse 0.17 -> 0.20) is re-evaluated against the
// ACES fit constants as three 0.187.0 SHIPS them, parsed straight out of
// the ShaderChunk source — never retyped here. If a three upgrade moves the
// curve, reddens the parse, or breaks the gray-preservation premise, this
// test fails and forces the DW-23 re-derivation Story 2.3 rides on, instead
// of leaving comments describing a dead curve. Anchor tolerances absorb
// only the 3-decimal rounding of the table, not a curve shift.
test("DW-23 substrate is executable: three's shipped ACES fit maps the exposure law's constants as the measured table (QA)", () => {
  const glsl = ShaderChunk.tonemapping_pars_fragment;
  const fa = glsl.match(/vec3 a = v \* \( v \+ ([\d.]+) \) - ([\d.eE-]+);/);
  const fb = glsl.match(/vec3 b = v \* \( ([\d.]+) \* v \+ ([\d.]+) \) \+ ([\d.]+);/);
  const ex = glsl.match(/color \*= toneMappingExposure \/ ([\d.]+);/);
  assert.ok(fa && fb && ex, "three's shipped ACES fit is still parseable (a re-formatted tone-mapping source reds HERE and forces re-derivation — never silently)");
  const [A, B, C, D, E, DIV] = [fa[1], fa[2], fb[1], fb[2], fb[3], ex[1]].map(Number);
  assert.equal(DIV, 0.6, "the exposure scale is the /0.6 factor the table was measured with");
  // The scalar-illuminance shortcut is legal only because the ACES in/out
  // matrices are gray-preserving — check the premise from the SHIPPED
  // matrices (column sums = 1 per component), not from prose.
  const columns = (name: string): number[][] => {
    const m = glsl.match(new RegExp(`${name} = mat3\\(([\\s\\S]*?)\\);`));
    assert.ok(m, `three ships ${name}`);
    const cols = [...m[1]!.matchAll(/vec3\(\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\)/g)].map((c) => [Number(c[1]), Number(c[2]), Number(c[3])]);
    assert.equal(cols.length, 3, `${name} is three columns`);
    return cols;
  };
  for (const name of ["ACESInputMat", "ACESOutputMat"]) {
    for (const comp of [0, 1, 2]) {
      const sum = columns(name).reduce((s, col) => s + col[comp]!, 0);
      assert.ok(Math.abs(sum - 1) < 2e-4, `${name} preserves gray on component ${String(comp)} (column sum ${String(sum)} — the scalar fit premise the exposure table rests on)`);
    }
  }
  const aces = (x: number): number => {
    const v = x / DIV;
    return (v * (v + A) - B) / (v * (C * v + D) + E);
  };
  assert.ok(Math.abs(aces(1.0) - 0.763) < 1e-3, `the screen sheet at intensity 1.0 tone-maps to 0.763 (got ${aces(1.0).toFixed(4)})`);
  assert.ok(Math.abs(aces(1.2) - 0.804) < 1e-3, `the marquee sheet at 1.2 tone-maps to 0.804 — the machine's brightest face (got ${aces(1.2).toFixed(4)})`);
  assert.ok(Math.abs(aces(2.0) - 0.888) < 1e-3, `the pre-2.0 bound's peak 2.0 tone-maps to 0.888, above both sheets — why the old ceiling failed the smoke (got ${aces(2.0).toFixed(4)})`);
  assert.ok(Math.abs(aces(CABINET_FACE_ILLUMINANCE_CEILING) - 0.8) < 5e-3, `the pinned ceiling ${String(CABINET_FACE_ILLUMINANCE_CEILING)} IS the measured pre-tonemap value mapping to 0.80 output (got ${aces(CABINET_FACE_ILLUMINANCE_CEILING).toFixed(4)})`);
  assert.ok(Math.abs(aces(CABINET_FACE_ILLUMINANCE_FLOOR) - 0.2) < 5e-3, `the pinned floor ${String(CABINET_FACE_ILLUMINANCE_FLOOR)} IS the measured pre-tonemap value mapping to 0.20 output — below it a face reads dead (got ${aces(CABINET_FACE_ILLUMINANCE_FLOOR).toFixed(4)})`);
});

function rootMeshByDims(w: number, h: number, d: number): MeshRec {
  const found = built.meshes.filter((m) => m.parent === null && m.geo.w === w && m.geo.h === h && m.geo.d === d);
  assert.equal(found.length, 1, `exactly one world mesh with dims ${w}x${h}x${d}`);
  return found[0]!;
}

// 2.0 rewrite of the 1.4 shell-build test: the shell is a group assembly,
// not a body box with stuck-on bars. Every part pins its EXACT group-local
// mount (the exposure law's proud literals read these), the emissive faces
// replace the old painted-face materials, and the coin-door family keeps
// its byte-identical world pose law.
test("2.0 shell build: profiled side panels + core, front panel, tilted screen sub-group (bezel + emissive live face), tilted control panel with joystick + buttons + start, one-line emissive marquee under black retainers, three grille slats, coin-door family CLOSED world-space + metal frame + red reject button, two glow lights at the authored standoff, handles handed back (2.0 brief 1-5, 1.4 AC1/AC4/AC5 legs kept)", () => {
  for (const p of cabinetPlacements) {
    const g = placementGeometry(p.slotId);
    const yaw = closedYaw(g.facing);
    const group = built.groups.find((gr) => gr.x === g.center.x && gr.z === g.center.z);
    assert.ok(group, "one per-cabinet local-frame group at the slot centre, base on the floor");
    assert.equal(group.y, 0, "the group base sits on the floor (local +Y up, brief section 1)");
    assert.ok(Math.abs(group.ry - yaw) < 1e-12, "the group yaw IS closedYaw(facing) \u2014 the same yaw law the coin-door pose uses");
    const kids = built.meshes.filter((m) => m.parent === group);
    const subs = built.groups.filter((gr) => gr.parent === group);
    assert.equal(subs.length, 3, "screen + control + grille sub-groups");
    const kidsByDims = (w: number, h: number, d: number): MeshRec[] => kids.filter((m) => m.geo.kind === "box" && m.geo.w === w && m.geo.h === h && m.geo.d === d);
    const one = (w: number, h: number, d: number): MeshRec => {
      const f = kidsByDims(w, h, d);
      assert.equal(f.length, 1, `exactly one group child with dims ${w}x${h}x${d}`);
      return f[0]!;
    };

    // DW-42 / rebuild: the body-sized box and the 1.10 deck slab are GONE —
    // the volume gets no mesh anywhere in the build.
    assert.ok(
      built.meshes.every((m) => !(m.geo.w === SHELL.body.width && m.geo.h === SHELL.body.height && m.geo.d === SHELL.body.depth)),
      "no mesh carries the body dims \u2014 the cabinet volume is assembled, not extruded (DW-42)",
    );

    // Profiled structure: two side panels + core, each a profile extrusion
    // rotated -90 deg about Y (the brief's structural-mesh table).
    const sidePanels = kids.filter((m) => m.geo.points === SIDE_PROFILE);
    assert.equal(sidePanels.length, 2, "two SIDE_PROFILE side panels");
    for (const sp of sidePanels) assert.ok(Math.abs(sp.ry + Math.PI / 2) < 1e-12, "side panel rotated -90 deg about Y");
    const core = kids.find((m) => m.geo.points === INNER_PROFILE);
    assert.ok(core, "the INNER_PROFILE core extrusion is built");
    assert.ok(sidePanels.every((sp) => sp.mats.length === 2), "side panels carry the caps+edge material pair (colour face + black T-molding ring)");
    for (const sp of sidePanels) {
      assert.equal(sp.mats[1]!.params["color"], CABINET_MOLDING, "the edge walls ARE the black T-molding token (0x0c0c0d)");
      assert.equal(sp.mats[0]!.params["color"], 0x204659, "the extrusion caps ARE the darkened placement hue — 0.35 of GLOW_CYAN, pinned as the once-measured literal 0x204659 (never re-derived)");
    }

    // Front panel: its face lands exactly on the plane the coin-door family
    // mounts on (local z 0.30 = the body front plane).
    const front = one(0.562, 0.8, 0.02);
    assert.ok(Math.abs(front.x) < 1e-12 && Math.abs(front.y - 0.5) < 1e-12 && Math.abs(front.z - 0.29) < 1e-12, "front panel centred low on the body's front");
    assert.ok(Math.abs(front.z + front.geo.d / 2 - SHELL.body.depth / 2) < 1e-12, "the front panel face sits exactly on the body front plane (the coin-door mount plane)");
    assert.equal(front.mat.params["color"], CABINET_BLACK, "front panel is the black vinyl body");

    // Side art decals: one shared texture both sides, 0.001 proud of the
    // side panels.
    const arts = kidsByDims(0.002, 0.7, 0.5);
    assert.equal(arts.length, 2, "one side-art decal per flank");
    for (const a of arts) assert.ok(typeof a.mat.params["map"] === "object" && a.mat.params["color"] === FACE_TINT, "side art is a painted FACE_TINT sheet");
    assert.ok(Math.abs(Math.abs(arts[0]!.x) - 0.301) < 1e-12 && Math.abs(arts[1]!.x - arts[0]!.x) > 0.6, "the decals ride at +/-0.301");

    // Contact shadow: ONE shared sheet at the 0.6 m DW-29-shrunk extent.
    const shadow = one(0.6, 0.002, 0.6);
    assert.ok(Math.abs(shadow.y - 0.022) < 1e-12 && Math.abs(shadow.x) < 1e-12 && Math.abs(shadow.z) < 1e-12, "the contact shadow hugs the floor under the body centre");
    assert.equal(shadow.mat.params["transparent"], true, "the shadow sheet is transparent + depthWrite off (a painted pool, not geometry)");
    // QA (Story 2.0): the depthWrite half of that message was never asserted
    // — with depthWrite on, the sheet occludes the carpet it paints on.
    assert.equal(shadow.mat.params["depthWrite"], false, "the shadow sheet writes no depth (brief 4f: transparent + depthWrite false — it must not hide what it grounds)");

    // 4a screen sub-assembly: the group carries the -9.8 deg lean.
    const screenGroup = subs.find((sg) => Math.abs(sg.rx + 0.1707) < 1e-12);
    assert.ok(screenGroup, "the screen sub-group carries the authored lean rx -0.1707");
    assert.ok(Math.abs(screenGroup.y - SHELL.screen.centerY) < 1e-12 && Math.abs(screenGroup.z - 0.01) < 1e-12 && Math.abs(screenGroup.x) < 1e-12, "screen group at (0, screen.centerY, 0.01)");
    const bezelMesh = built.meshes.find((m) => m.parent === screenGroup && m.geo.w === SHELL.bezel.width && m.geo.h === SHELL.bezel.height);
    assert.ok(bezelMesh && Math.abs(bezelMesh.z - 0.002) < 1e-12, "the bezel rides the sub-group at z 0.002");
    assert.equal(bezelMesh.mat.params["color"], CABINET_BLACK, "screen bezel is low-roughness black (mockup .screen border family)");
    const screenFace = built.meshes.find((m) => m.parent === screenGroup && m.geo.w === SHELL.screen.width && m.geo.h === SHELL.screen.height && m.geo.d === 0.003);
    assert.ok(screenFace && Math.abs(screenFace.z - 0.0055) < 1e-12, "the live face rides in FRONT of the bezel at z 0.0055");
    assert.equal(screenFace.mat.params["emissive"], FACE_TINT, "the live screen is an emissive FACE_TINT map (2.0 contract change 5)");
    assert.equal(screenFace.mat.params["emissiveIntensity"], 1.0, "the screen face carries the brief's 1.0 intensity");
    // Exact proud law (the exposure law's -0.2831 literal reads this):
    const sProud = (world(screenFace).x - g.front.x) * g.facing.x + (world(screenFace).z - g.front.z) * g.facing.z;
    assert.ok(Math.abs(sProud - (0.01 + Math.cos(0.1707) * 0.0055 - SHELL.body.depth / 2)) < 1e-12, "the screen face CENTRE sits exactly 0.01 + cos(lean)*0.0055 forward \u2014 0.2846 m behind the body front plane; the 0.003-thick face's FRONT edge (locator-pinned at m.geo.d === 0.003) carries the exposure law's 0.2831 m figure");

    // 4b control sub-assembly: +21 deg lean, overlay + full hardware.
    const controlGroup = subs.find((cg) => Math.abs(cg.rx - 0.3709) < 1e-12);
    assert.ok(controlGroup, "the control sub-group carries the +0.3709 lean");
    assert.ok(Math.abs(controlGroup.y - 0.9375) < 1e-12 && Math.abs(controlGroup.z - 0.2075) < 1e-12, "control group at (0, 0.9375, 0.2075)");
    const overlay = built.meshes.find((m) => m.parent === controlGroup && m.geo.w === 0.562 && m.geo.d === 0.19);
    assert.ok(overlay && Math.abs(overlay.y - 0.0015) < 1e-12, "the control overlay rides just above the plank");
    assert.ok(typeof overlay.mat.params["map"] === "object", "the overlay is a painted FACE_TINT sheet");
    assert.ok(built.meshes.some((m) => m.parent === controlGroup && m.geo.kind === "sphere" && m.geo.h === 0.034), "the joystick ball is the sphere primitive");
    const cyls = built.meshes.filter((m) => m.parent === controlGroup && m.geo.kind === "cylinder");
    assert.equal(cyls.length, 7, "washer + shaft + two button rings + two buttons + start = 7 cylinders");
    assert.ok(cyls.some((m) => m.geo.h === 0.055 && m.mat.params["color"] === CABINET_METAL), "the joystick shaft is black metal");
    assert.ok(cyls.some((m) => m.geo.h === 0.008 && m.mat.params["color"] === BUTTON_RED), "play button 1 is BUTTON_RED");
    assert.ok(cyls.some((m) => m.geo.h === 0.008 && m.mat.params["color"] === BUTTON_YELLOW), "play button 2 is BUTTON_YELLOW");
    assert.ok(cyls.some((m) => m.geo.h === 0.006 && m.mat.params["color"] === BUTTON_WHITE), "the start button is BUTTON_WHITE");
    // One-source law (scene.ts's CONTROL_RINGS comment: "the same control
    // positions the hardware mounts at"): the overlay's PRINTED target
    // rings must sit under the hardware this sub-assembly mounts. The
    // shipped CONTROL_RINGS run through the build's own paintControlOverlay
    // call here — a drift on either side (ring moved, hardware moved)
    // reddens this pin.
    const overlaySrc = (overlay.mat.params["map"] as { source: PaintSurface }).source;
    assert.deepEqual(
      [overlaySrc.width, overlaySrc.height],
      [562, 190],
      "the overlay canvas measures the 0.562 x 0.19 m plank at 1000 px/m",
    );
    const ringArcs = built.canvasArcs[built.canvases.indexOf(overlaySrc)]!;
    assert.equal(ringArcs.length, 4, "one printed ring per control position");
    const mountPts = new Map<string, { x: number; z: number }>();
    for (const m of cyls) mountPts.set(`${m.x.toFixed(4)}|${m.z.toFixed(4)}`, { x: m.x, z: m.z });
    assert.equal(mountPts.size, 4, "the seven cylinders ride exactly four control positions");
    for (const pt of mountPts.values()) {
      assert.ok(
        ringArcs.some((a) => Math.abs(a.x - (562 / 2 + pt.x * 1000)) < 1e-9 && Math.abs(a.y - (190 / 2 + pt.z * 1000)) < 1e-9),
        `a printed ring centre sits under the hardware at (${String(pt.x)}, ${String(pt.z)})`,
      );
    }

    // 4c marquee: the emissive one-liner + two black retainers, exact
    // mounts (the exposure law's -0.045 literal reads these).
    const marquee = one(0.562, SHELL.marquee.height, SHELL.marquee.depth);
    assert.ok(Math.abs(marquee.y - SHELL.marquee.centerY) < 1e-12 && Math.abs(marquee.z - 0.2525) < 1e-12 && Math.abs(marquee.x) < 1e-12, "marquee face at local (0, 1.7125, 0.2525)");
    assert.equal(marquee.mat.params["emissive"], FACE_TINT, "the marquee is the second emissive FACE_TINT map");
    assert.equal(marquee.mat.params["emissiveIntensity"], 1.2, "the marquee carries the brief's 1.2 intensity");
    const marqueeTex = marquee.mat.params["emissiveMap"] as { source: PaintSurface };
    assert.deepEqual(
      [marqueeTex.source.width, marqueeTex.source.height],
      [Math.round(SHELL.marquee.width * 1000), Math.round(SHELL.marquee.height * 1000)],
      "the marquee canvas measures the face metres at 1000 px/m",
    );
    const marqueeTexts = built.canvasTexts.find((t) => t.length === 1 && t[0] === p.title.toUpperCase());
    assert.ok(marqueeTexts, "2.0 contract change 4: the marquee letters the WHOLE title on ONE line (stacked words are gone)");
    const retainers = kidsByDims(0.562, 0.01, 0.008);
    assert.equal(retainers.length, 2, "two black retainer strips frame the marquee");
    for (const r of retainers) assert.equal(r.mat.params["color"], CABINET_BLACK, "the retainers are black");
    const retainerTops = retainers.map((r) => Math.abs(r.y)).sort((a, b) => a - b);
    assert.ok(Math.abs(retainerTops[0]! - 1.6325) < 1e-12 && Math.abs(retainerTops[1]! - 1.7925) < 1e-12, "the retainers sit exactly under and over the face");
    assert.ok(retainerTops[1]! + 0.005 <= SHELL.body.height, "the top retainer (1.7975) stays under the 1.80 m body top \u2014 the profile's marquee overhang carries it");

    // 4d grille: three slats on the sloped sub-group.
    const grilleGroup = subs.find((gg) => Math.abs(gg.rx + Math.atan2(0.06, 0.29)) < 1e-12);
    assert.ok(grilleGroup, "the grille sub-group leans along the speaker panel underside");
    const slats = built.meshes.filter((m) => m.parent === grilleGroup && m.geo.w === 0.2 && m.geo.d === 0.012);
    assert.equal(slats.length, 3, "three grille slats");

    // Coin-door family, WORLD-space (the brief's one exception): byte-
    // identical 1.4 pose law for panel + slot, new frame + reject beside.
    const pose = coinDoorPose(p.volumeId, false);
    const panel = rootMeshByDims(SHELL.coinDoor.width, SHELL.coinDoor.height, SHELL.coinDoor.thickness);
    assert.equal(panel.mat.params["color"], WALL_WARM, "coin door is Wall Warm (mockup .coindoor bg)");
    assert.ok(Math.abs(panel.x - pose.panel.x) < 1e-12 && Math.abs(panel.y - pose.panel.y) < 1e-12 && Math.abs(panel.z - pose.panel.z) < 1e-12, "door panel at the closed-pose centre");
    assert.equal(panel.yaw, pose.panel.yaw, "door panel carries the closed yaw from the pose law");
    const slotMesh = rootMeshByDims(SHELL.coinSlot.width, SHELL.coinSlot.height, SHELL.coinSlot.thickness);
    assert.equal(slotMesh.mat.params["color"], SIGN_CHALK, "coin slot is Sign Chalk (mockup .slot bg)");
    assert.ok(Math.abs(slotMesh.x - pose.slot.x) < 1e-12 && Math.abs(slotMesh.z - pose.slot.z) < 1e-12, "coin slot at the closed-pose centre");
    const frame = rootMeshByDims(0.3, 0.34, 0.004);
    assert.equal(frame.mat.params["color"], CABINET_METAL, "the coin-door frame is black metal (brief 4e)");
    assert.ok(Math.abs(frame.x - (g.front.x + g.facing.x * 0.002)) < 1e-12 && Math.abs(frame.z - (g.front.z + g.facing.z * 0.002)) < 1e-12, "the frame sits 0.002 proud of the front panel face");
    assert.ok(Math.abs(frame.y - SHELL.coinDoor.centerY) < 1e-12, "the frame is centred on the coin door");
    const reject = rootMeshByDims(0.03, 0.04, 0.004);
    assert.equal(reject.mat.params["color"], BUTTON_RED, "the reject button reads as a lit red dot (button-red token, never emissive)");
    assert.ok(Math.abs(reject.y - SHELL.coinSlot.centerY) < 1e-12, "the reject rides beside the coin slot");

    // Two glow lights: marquee spill + screen halo, placement hues,
    // authored cabinet intensity/reach, exactly the standoff in front.
    const spill = built.lights.find((l) => l.color === p.marqueeHue && l.y === SHELL.marquee.centerY);
    assert.ok(spill, "marquee spill light in the marquee family");
    const halo = built.lights.find((l) => l.color === p.hue && l.y === SHELL.screen.centerY);
    assert.ok(halo, "screen halo in the machine's family");
    for (const l of [spill, halo]) {
      assert.equal(l.intensity, CABINET_LIGHT_INTENSITY);
      assert.equal(l.distance, CABINET_LIGHT_REACH);
      const lp = (l.x - g.front.x) * g.facing.x + (l.z - g.front.z) * g.facing.z;
      assert.ok(Math.abs(lp - CABINET_LIGHT_STANDOFF_M) < 1e-12, "cabinet lights hang exactly the authored standoff in front of the face");
    }
    // Centring law: the exposure model puts each light's nearest point
    // directly under it; the lateral centring stays EXACT, and the screen
    // face's lean lifts its centre exactly 0.0055*sin(0.1707) (0.9 mm)
    // above the halo axis — pinned to the lean, not to a 1 mm window
    // (the rebuild pass's 1e-3 window let a lean shift of up to a
    // millimetre pass silently).
    const lat = (q: { x: number; z: number }): number => (q.x - g.front.x) * g.right.x + (q.z - g.front.z) * g.right.z;
    const mWorld = world(marquee);
    const sWorld = world(screenFace);
    assert.ok(Math.abs(lat(mWorld) - lat(spill)) < 1e-12 && Math.abs(mWorld.y - spill.y) < 1e-12, "the marquee face sits centred under its spill light (the exposure law's nearest-point + symmetric-corner model)");
    assert.ok(Math.abs(lat(sWorld) - lat(halo)) < 1e-12 && Math.abs(sWorld.y - (halo.y + 0.0055 * Math.sin(0.1707))) < 1e-12, "the screen face sits centred under its halo light, exactly the lean's lift (0.0055*sin(0.1707)) above the halo axis");

    // Handles the entry animates every frame.
    const door = built.handles.doors.find((d) => d.id === p.volumeId);
    const screen = built.handles.screens.find((s) => s.id === p.volumeId);
    assert.ok(door && screen, "door + screen handles returned for the placement");
    assert.equal(screen.canvas.width, Math.round(SHELL.screen.width * 1000), "screen canvas aspect == face metres (1000 px/m)");
    // The repaint marks the handle's texture; it only reaches the visible
    // face if the face's EMISSIVE map IS that texture AND that texture's
    // source IS the handle's canvas — object identity, not parallel
    // structures (2.0: the map rides emissiveMap, the face is self-lit).
    const faceMap = screenFace.mat.params["emissiveMap"] as { source?: unknown };
    assert.ok(faceMap === screen.texture, "the screen face's emissiveMap IS the returned handle's texture (a repaint marks that texture and this face shows it)");
    assert.ok(faceMap.source === screen.canvas, "and that texture's source is the handle's canvas (one canvas, one texture, one face)");
    assert.ok(built.canvasTexts.some((t) => t.includes(p.screenZones.next.toUpperCase())), "the screen canvas is lettered with the NEXT zone at build (step 0)");
    assert.ok(built.textureUpdateCount() === 0, "the BUILD itself never marks textures updated (repaint is frame-side)");
  }
});

// Story 2.0 QA: the brief's material law for the metal parts ("roughness
// 0.4, metalness 0.3. Do not go above 0.3; there is no environment map and
// higher metalness renders black") had no pin — a re-tune could send every
// metal part pitch black with the whole suite green.
test("no material in the build asks metalness above the brief's 0.3 ceiling; the metal parts ride exactly 0.3 (QA)", () => {
  let metalMats = 0;
  for (const m of built.mats) {
    const v = Number(m.params["metalness"] ?? 0);
    assert.ok(v <= 0.3, `a material carries metalness ${String(v)} — with no env map above 0.3 renders black (brief section 5)`);
    if (m.params["color"] === CABINET_METAL) {
      metalMats += 1;
      assert.equal(v, 0.3, "the metal parts (shaft, coin-door frame) ride the authored 0.3 exactly");
    }
  }
  assert.ok(metalMats >= 1, "the metal material exists (joystick shaft + coin-door frame share it)");
});

// Story 2.0 (DW-29 law, re-expressed for the rebuild): the DW-29 contour
// law's old numbers (deck slab, 0.06m body-AABB wings) die with the parts —
// the rebuilt shell instead holds the 0.095m overhang band (x +/-0.302,
// z +/-0.30 around the group frame, the collision AABB widened by the brief
// section 2's one exception) and the two sub-assemblies' tilts lean the way
// the brief demands. The exact per-part world bounding-box containment runs
// against REAL three geometry in cabinets.test.ts (the brief's verification
// test 1) — here the fake pins the mounts and the tilt consequences.
test("2.0 shell containment band + tilt law: every boxed group child stays inside x +/-0.302, y 0..1.80, z +/-0.30; the screen face leans back and the control panel leans front-down; the cabinet-B0 collision AABB stays byte-identical (DW-29 rebuild)", () => {
  for (const p of cabinetPlacements) {
    const g = placementGeometry(p.slotId);
    const group = built.groups.find((gr) => gr.x === g.center.x && gr.z === g.center.z);
    assert.ok(group, "the cabinet group exists");
    const tol = 1e-9;

    // Band law on boxed children (the profiled panels' exact bbox law
    // lives in cabinets.test.ts against real geometry). The half-extents
    // must carry the WHOLE rotation chain between the mesh and the cabinet
    // group — the control panel's boxes ride a 21 deg lean.
    const inCabinet = (m: MeshRec): boolean => {
      for (let q: NodeRec | null = m.parent; q; q = q.parent) if (q === group) return true;
      return false;
    };
    const rotM = (n: NodeRec): number[][] => {
      const cx = Math.cos(n.rx), sx = Math.sin(n.rx);
      const cy = Math.cos(n.ry), sy = Math.sin(n.ry);
      // Ry * Rx — matches rotateBy()'s apply-Rx-then-Ry law above.
      return [[cy, sx * sy, cx * sy], [0, cx, -sx], [-sy, sx * cy, cx * cy]];
    };
    const mul = (A: number[][], B: number[][]): number[][] =>
      A.map((row, i) => B.map((_col, j) => row.reduce((s, v, k) => s + v * B[k]![j], 0)));
    for (const m of built.meshes.filter(inCabinet)) {
      if (Number.isNaN(m.geo.w)) continue; // extrude: the real-three test covers it
      let M = rotM(m);
      for (let q = m.parent; q && q !== group; q = q.parent) M = mul(rotM(q), M);
      const loc = inGroupFrame(m);
      const hx = m.geo.w / 2, hy = m.geo.h / 2, hz = m.geo.d / 2;
      const halfX = Math.abs(M[0]![0]!) * hx + Math.abs(M[0]![1]!) * hy + Math.abs(M[0]![2]!) * hz;
      const halfY = Math.abs(M[1]![0]!) * hx + Math.abs(M[1]![1]!) * hy + Math.abs(M[1]![2]!) * hz;
      const halfZ = Math.abs(M[2]![0]!) * hx + Math.abs(M[2]![1]!) * hy + Math.abs(M[2]![2]!) * hz;
      assert.ok(Math.abs(loc.x) + halfX <= 0.302 + tol, `${m.geo.kind} ${m.geo.w}x${m.geo.h}x${m.geo.d} stays inside the 0.302 m lateral band (the 1.20 m aisle law's eye-scale twin)`);
      assert.ok(Math.abs(loc.z) + halfZ <= 0.3 + tol, `${m.geo.kind} ${m.geo.w}x${m.geo.h}x${m.geo.d} stays inside the 0.30 m depth band`);
      assert.ok(loc.y - halfY >= -tol && loc.y + halfY <= 1.8 + tol, `${m.geo.kind} ${m.geo.w}x${m.geo.h}x${m.geo.d} stays between floor and body top`);
    }

    // Tilt laws, read off the pinned sub-group rotations (the brief's
    // "lean back / lean front-down" claims):
    const screenGroup = built.groups.find((sg) => sg.parent === group && Math.abs(sg.rx + 0.1707) < 1e-12);
    assert.ok(screenGroup, "screen sub-group");
    const zTop = screenGroup.z + Math.sin(screenGroup.rx) * (SHELL.screen.height / 2);
    const zBottom = screenGroup.z - Math.sin(screenGroup.rx) * (SHELL.screen.height / 2);
    assert.ok(zTop < zBottom, "the screen face's TOP edge sits behind its bottom edge along +Z (the lean-back law)");
    assert.ok(zBottom - zTop >= 0.08, `the lean spans ${zBottom - zTop} m of depth across the 0.52 m face`);
    const controlGroup = built.groups.find((cg) => cg.parent === group && Math.abs(cg.rx - 0.3709) < 1e-12);
    assert.ok(controlGroup, "control sub-group");
    const yFront = controlGroup.y - Math.sin(controlGroup.rx) * 0.095;
    const yRear = controlGroup.y + Math.sin(controlGroup.rx) * 0.095;
    assert.ok(yFront < yRear, "the control panel's FRONT edge sits lower than its rear (the lean-front-down law)");
    assert.ok(yRear - yFront >= 0.06, `the control tilt drops the front edge ${yRear - yFront} m below the rear`);

    // The collision-law proof (kept from 1.10): the volume entry is still
    // byte-for-byte the untouched cabinetAABB derivation — the rebuilt
    // shell is decor, never a new invisible wall.
    const volume = collisionVolumes.find((v) => v.id === p.volumeId);
    assert.ok(volume, `volume "${p.volumeId}" is still registered`);
    const aabb = cabinetAABB(p);
    assert.ok(
      volume.min.x === aabb.min.x && volume.min.y === aabb.min.y && volume.min.z === aabb.min.z &&
      volume.max.x === aabb.max.x && volume.max.y === aabb.max.y && volume.max.z === aabb.max.z,
      "the cabinet-B0 collision AABB is byte-identical to the untouched cabinetAABB derivation",
    );
  }
});

// QA continuity (1.10 idiom, re-pinned by Story 2.0's brief): every derived
// pin reads the shell records, so a nudge moves pin and subject together —
// these ARE-value pins are the drift cure for the record set. Story 2.0
// RE-PINS the raised marquee + the new screen/bezel records (the brief's
// numbers); the untouched body / coin-door / coin-slot records keep their
// HEAD values, and the B0 collision volume stays at the exact HEAD box.
test("2.0 QA continuity: the rebuilt shell records ARE the brief's values; the untouched records and the B0 collision AABB stay at HEAD (drift pins)", () => {
  assert.equal(SHELL.body.width, 0.6, "body width IS 0.60m — room-layout's stand-up contract");
  assert.equal(SHELL.body.depth, 0.6, "body depth IS 0.60m (the AABB x/z pins ride it)");
  assert.equal(SHELL.body.height, 1.8, "body height IS 1.80m (the AABB y-max rides it)");
  assert.equal(SHELL.marquee.width, 0.56, "the marquee FACE width IS 0.56 (2.0 brief: the face sits under the profile's 0.56 m marquee shelf, not wider than the body)")
  assert.equal(SHELL.marquee.height, 0.15, "the marquee FACE height IS 0.15 (the one-line 0.09 m cap lettering needs one 15 cm bar, not the old 0.50 m monster)");
  assert.equal(SHELL.marquee.centerY, 1.7125, "the marquee IS centred at 1.7125 (the profile's 1.795/1.63 marquee shelf; the 1.7975 retainer-top pin rides it)");
  assert.equal(SHELL.marquee.depth, 0.005, "the marquee face thickness IS 0.005 (the -0.045 exposure proud literal reads it)");
  assert.equal(SHELL.screen.width, 0.44, "the screen face width IS 0.44");
  assert.equal(SHELL.screen.height, 0.52, "the screen face height IS 0.52");
  assert.equal(SHELL.screen.centerY, 1.28, "the screen centerY IS 1.28 (2.0 brief: the eye line of the standing player; the halo/handle pins ride it)");
  assert.equal(SHELL.bezel.width, 0.562, "the bezel width IS 0.562 (the 0.002 lip around the 0.44 face reads the 0.562 body-front family)");
  assert.equal(SHELL.bezel.height, 0.585, "the bezel height IS 0.585");
  assert.equal(SHELL.bezel.depth, 0.004, "the bezel depth IS 0.004 \u2014 the proud offset the screen exposure law reads");
  assert.equal(SHELL.bezel.centerY, 1.28, "the bezel centerY IS 1.28");
  assert.equal(SHELL.coinDoor.width, 0.26, "the coin door width IS 0.26");
  assert.equal(SHELL.coinDoor.height, 0.3, "the coin door height IS 0.30");
  assert.equal(SHELL.coinDoor.thickness, 0.02, "the coin door thickness IS 0.02");
  assert.equal(SHELL.coinDoor.centerY, 0.58, "the coin door centerY IS 0.58");
  assert.equal(SHELL.coinSlot.width, 0.1, "the coin slot detail width IS 0.10");
  assert.equal(SHELL.coinSlot.height, 0.02, "the coin slot detail height IS 0.02");
  assert.equal(SHELL.coinSlot.thickness, 0.006, "the coin slot detail thickness IS 0.006");
  assert.equal(SHELL.coinSlot.centerY, 0.67, "the coin slot detail centerY IS 0.67");

  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const p = cabinetPlacements[0]!;
  const v = collisionVolumes.find((c) => c.id === p.volumeId);
  assert.ok(v, `volume "${p.volumeId}" is registered`);
  assert.ok(
    near(v.min.x, -4.5) && near(v.max.x, -3.9) &&
    near(v.min.y, 0) && near(v.max.y, 1.8) &&
    near(v.min.z, -6.15) && near(v.max.z, -5.55),
    `the cabinet-B0 collision AABB IS the exact HEAD box 0.60x0.60x1.80 at B0 (${JSON.stringify({ min: v.min, max: v.max })}) \u2014 the rebuild is decor, not a new invisible wall`,
  );
});

// zone token sanity (the same hues the scene builder lights with)
test("scene lighting hues match the authored zone hues (no drift between zones.ts identity and the lights the builder hangs)", () => {
  const hues = new Set(zones.map((z) => z.hue));
  for (const zl of built.lights) {
    if (hues.has(zl.color)) continue; // a zone identity light
    assert.ok(
      [GLOW_MARQUEE, GLOW_RED, GLOW_CYAN].includes(zl.color),
      "the rest are roadmap amber / door glow / cabinet spill + halo (placements' hues)",
    );
  }
  assert.equal(CASUAL_ALLEY.hue, GLOW_GREEN);
  assert.equal(CARPET_PATTERN, 0x3e3046);
  assert.equal(CARD_INK, 0x2a241c);
});

// --- Story 1.9: the street-side front-door furniture + lights ---------------

test("1.9 street composition: the door-front extrusion becomes the poseable panel (one mesh per volume preserved), the awning/glass/handle build from door.ts dims at the CLOSED pose in token-only materials, and the two street lights are BUILT DARK on the street side (AC5/AC6)", () => {
  const closed = frontDoorOpenPose(0);
  const fd = built.handles.frontDoor;
  assert.ok(fd, "the front-door assembly is returned for the frame side to pose and ramp");

  // One mesh per volume: the panel IS the door-front extrusion, not a copy.
  const doorV = collisionVolumes.find((v) => v.id === "door-front");
  assert.ok(doorV);
  const panels = built.meshes.filter(
    (m) =>
      m.geo.w === doorV!.max.x - doorV!.min.x &&
      m.geo.h === doorV!.max.y - doorV!.min.y &&
      m.geo.d === doorV!.max.z - doorV!.min.z,
  );
  assert.equal(panels.length, 1, "the beat makes the extrusion handle-tracked, never duplicates it");
  const panelMesh = panels[0]!;
  assert.equal(panelMesh.mat.params["color"], WALL_PANEL, "the panel keeps the volume extrusion's material");
  assert.ok(
    Math.abs(panelMesh.x - closed.panel.x) < 1e-12 && Math.abs(panelMesh.y - closed.panel.y) < 1e-12 && Math.abs(panelMesh.z - closed.panel.z) < 1e-12,
    "the extruded box's placement IS the closed swing pose (byte-continuity: the frame's first re-pose moves nothing)",
  );

  // Awning: Wall Panel, proud of the front wall's exterior above the head.
  const awning = rootMeshByDims(FRONT_DOOR_AWNING.width, FRONT_DOOR_AWNING.height, FRONT_DOOR_AWNING.depth);
  assert.equal(awning.mat.params["color"], WALL_PANEL, "awning material is the WALL_PANEL token by name (mutation: a literal hex reds the hue-home guard below AND this pin)");
  assert.equal(awning.x, 0);
  assert.equal(awning.y, FRONT_DOOR_AWNING.centerY);
  assert.ok(awning.y > DOOR_TOP, "above the door head");
  assert.ok(awning.z > INTERIOR.depth / 2 + WALL_T, "proud of the front wall's exterior face (street side)");

  // Glazing: painted two-tone sheet on the panel's street face, closed pose.
  const glass = rootMeshByDims(FRONT_DOOR_GLASS.width, FRONT_DOOR_GLASS.height, FRONT_DOOR_GLASS.thickness);
  assert.equal(glass.mat.params["color"], FACE_TINT, "painted map carries the hues; the material stays the neutral tint (1.3's identity law from the street too)");
  assert.ok(typeof glass.mat.params["map"] === "object", "the glazing is texture-mapped, never emissive");
  assert.ok(
    Math.abs(glass.x - closed.glass.x) < 1e-12 && Math.abs(glass.y - closed.glass.y) < 1e-12 && Math.abs(glass.z - closed.glass.z) < 1e-12,
    "the glazing builds at the closed pose from door.ts",
  );
  assert.ok(glass.z > INTERIOR.depth / 2, "on the street face of the wall");

  // Handle: Sign Chalk on the free edge, closed pose.
  const handle = rootMeshByDims(FRONT_DOOR_HANDLE.width, FRONT_DOOR_HANDLE.height, FRONT_DOOR_HANDLE.thickness);
  assert.equal(handle.mat.params["color"], SIGN_CHALK, "handle in the Sign Chalk family (mockup .handle)");
  assert.ok(
    Math.abs(handle.x - closed.handle.x) < 1e-12 && Math.abs(handle.z - closed.handle.z) < 1e-12,
    "the handle builds at the closed pose from door.ts",
  );

  // The street pair: GLOW_MARQUEE hues, intensity ZERO at build.
  const bleed = built.lights.find(
    (l) => l.x === FRONT_DOOR_LIGHT_SPOTS.bleed.x && l.y === FRONT_DOOR_LIGHT_SPOTS.bleed.y && l.z === FRONT_DOOR_LIGHT_SPOTS.bleed.z,
  );
  assert.ok(bleed, "the door-bleed pool sits at the door base on the street side");
  assert.ok(bleed.z > INTERIOR.depth / 2 + WALL_T, "outside the front wall (the room spilling onto the street)");
  assert.equal(bleed.color, GLOW_MARQUEE);
  assert.equal(bleed.intensity, 0, "BUILT DARK — the entry's bleedFraction ramps it as the page settles (AC5 'both start dark')");
  assert.equal(bleed.distance, FRONT_DOOR_BLEED_REACH_MIN);
  const sheen = built.lights.find(
    (l) => l.x === FRONT_DOOR_LIGHT_SPOTS.glass.x && l.y === FRONT_DOOR_LIGHT_SPOTS.glass.y && l.z === FRONT_DOOR_LIGHT_SPOTS.glass.z,
  );
  assert.ok(sheen, "the glass sheen light rides the glazing height");
  assert.equal(sheen.color, GLOW_MARQUEE);
  assert.equal(sheen.intensity, 0, "also BUILT DARK");
  assert.equal(sheen.distance, FRONT_DOOR_GLASS_REACH_MIN);
});

// AC6's single-home law, generalized to every token: a hex literal may live
// in tokens.ts ONLY (the 1.9 mockup family --ui-surface/-text/-border/
// -focus and the glass pair included, plus the 2.0 cabinet/btn pair).
// scene.ts, workbench.ts, door.ts and every other core module reference the
// NAME and derive css via toCss.
test("token hue home: every hex literal exported by tokens.ts appears in NO other core non-test source (AC6; mutation: a cabinet-hex literal in scene.ts reddens here)", () => {
  const tokensSrc = readFileSync(path.join(import.meta.dirname, "tokens.ts"), "utf8");
  const hexes = [...tokensSrc.matchAll(/0x[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
  assert.ok(hexes.length >= 28, `the full token set exists to scan (found ${hexes.length}) \u2014 the 2.0 cabinet pair + button trio raised the floor 22 -> 28`);
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walk(full));
      else if (ent.name.endsWith(".ts") && !ent.name.endsWith(".test.ts")) out.push(full);
    }
    return out;
  };
  const coreDir = path.join(import.meta.dirname, "..");
  for (const file of walk(coreDir)) {
    if (path.basename(file) === "tokens.ts") continue;
    const src = readFileSync(file, "utf8");
    for (const hex of hexes) {
      // Hex-run boundaries: a token hex inside a longer hex literal (a hash
      // constant's 0xff... mask, say) is NOT this token home. Case-insensitive:
      // a duplicated 0xEDEDED is the same hue as 0xededed, letter case does
      // not buy a second home.
      const re = new RegExp(`(?<![0-9a-fA-F])${hex}(?![0-9a-fA-F])`, "i");
      assert.ok(!re.test(src), `${path.relative(coreDir, file)} carries the token hex ${hex} as a literal — its single home is tokens.ts (reference the token by name, derive css via toCss)`);
    }
  }
});

// --- Story 2.3: the atmosphere tier through the same fake seam ----------------

test("Story 2.3 (AC2/AC6): the spill tier emits exactly the FORMULA count of bare point lights over the volume records — zero meshes, zero materials, zero emissive nodes; every node BUILT DARK, in its source cabinet's marquee family, at SPILL_REACH_M, mounted at the labelled floor/ceiling heights, OUTSIDE every pillar AABB, scene.add'd exactly once", () => {
  const pillars = collisionVolumes.filter((v) => v.kind === "pillar");
  assert.equal(pillars.length, 2, "the authored blocker pair the tier authors around");
  let expected = 0;
  for (const p of cabinetPlacements) {
    const g = placementGeometry(p.slotId);
    for (const v of pillars) {
      const cx = (v.min.x + v.max.x) / 2;
      const cz = (v.min.z + v.max.z) / 2;
      const relevantEdges = (g.center.x === cx ? 0 : 1) + (g.center.z === cz ? 0 : 1);
      expected += 2 * relevantEdges; // floor sheen + ceiling bounce per relevant edge
    }
  }
  assert.equal(expected, 8, "the authored shape: 1 placement x 2 pillars x 2 relevant edges x 2 mounts — the formula's INPUT pinned, so drift in the authored data reddens the formula leg too");
  assert.equal(atmo.nodes.length, expected, "node count IS the formula over the volume records (the scene-build count idiom, never a magic number)");
  const expectedIds: string[] = [];
  for (const p of cabinetPlacements) {
    const pg = placementGeometry(p.slotId);
    for (const v of pillars) {
      const vcx = (v.min.x + v.max.x) / 2;
      const vcz = (v.min.z + v.max.z) / 2;
      const edges = (pg.center.x === vcx ? 0 : 1) + (pg.center.z === vcz ? 0 : 1);
      for (let i = 0; i < 2 * edges; i++) expectedIds.push(p.volumeId);
    }
  }
  assert.deepEqual(atmo.nodes.map((n) => n.volumeId), expectedIds, "every node carries its SOURCE cabinet's volumeId in build order — the key the frame-side rig pairing rides (mutation: key nodes by slotId in buildSpillNodes and boot throws over the mismatch with every law suite green — this census reddens here)");
  assert.equal(atmo.lights.length, expected, "one seam pointLight per node — no other node kind (no painted glow sheets, no cone geometry)");
  assert.equal(atmo.objects.length, expected, "every node scene.add'd exactly once — an unattached light never renders (the buildRoomScene attach idiom)");
  assert.equal(atmo.meshes.length, 0, "the tier adds no meshes");
  assert.equal(atmo.geos.length, 0);
  assert.equal(atmo.mats.length, 0, "no materials at all: the atmosphere tier contributes ZERO emissive/painted-glow nodes — the 2.0 emissive census stays exactly 2 per Cabinet, byte-preserved (AC6)");
  const marqueeHues = new Set(cabinetPlacements.map((p) => p.marqueeHue));
  for (const l of atmo.lights) {
    assert.ok(marqueeHues.has(l.color), `the bleed rides the source cabinet's marquee family (${l.color.toString(16)}) — light-from-a-machine, no new hue to home (UX-DR1)`);
    assert.equal(l.intensity, 0, "BUILT DARK — the frame's glow ramp lights them from tick state (the frontDoor street-pair posture)");
    assert.equal(l.distance, SPILL_REACH_M, "the authored reach");
    assert.ok(l.y === SPILL_FLOOR_MOUNT_M || l.y === WALL_TOP - SPILL_CEILING_INSET_M, "mount height is the labelled floor-sheen or ceiling-bounce mount (ceiling derives from WALL_TOP, never a retyped 3.0)");
  }
  assert.equal(atmo.lights.filter((l) => l.y === SPILL_FLOOR_MOUNT_M).length, expected / 2, "every relevant edge carries BOTH mounts: half floor sheen, half ceiling bounce");
  for (const l of atmo.lights) {
    for (const v of pillars) {
      const inside = l.x > v.min.x && l.x < v.max.x && l.z > v.min.z && l.z < v.max.z;
      assert.ok(!inside, `the ${String(l.y)}-high node at (${l.x}, ${l.z}) sits OUTSIDE ${v.id} — an anchor INSIDE the blocker is the falsifiable sign-flip bug`);
    }
  }
});

// Consumer Integration pin (spec Tasks line 4): the handles are observable
// end to end — same objects the build put in the recorded graph, settled by
// the frame's law formula (the shipped call sites are main-glue's 2.3 pins;
// the real-three adapter identity is cabinets.test.ts's tier).
test("Story 2.3 (AC1, consumer Integration): handles.cabinetLights names each placement's built halo/spill pair IN the recorded graph, and the frame law settles their intensities by camera pose — the authored far corner settles them strictly below nominal yet NEVER 0 (distant machines dim toward Room Black, never read dead, UX-DR17), and a scripted camera walk toward B0 raises the recorded values monotonically", () => {
  assert.equal(walk.handles.cabinetLights.length, cabinetPlacements.length, "one cabinetLights handle per placement");
  assert.deepEqual(walk.handles.cabinetLights.map((c) => c.volumeId), cabinetPlacements.map((p) => p.volumeId), "handles key by the authored volume ids, placement order");
  for (const cl of walk.handles.cabinetLights) {
    assert.ok(walk.objects.includes(cl.halo) && walk.objects.includes(cl.spill), `the ${cl.volumeId} pair are nodes OF the recorded scene graph (the frame can only ramp lights that are IN the graph)`);
    assert.notStrictEqual(cl.halo, cl.spill, "halo and spill stay the two distinct 2.0-built lights — the handles expose them, no third light appears");
  }
  const p = cabinetPlacements[0]!;
  const pair = walk.handles.cabinetLights.find((c) => c.volumeId === p.volumeId)!;
  const center = placementGeometry(p.slotId).center;
  // The frame's glow law, applied through the handles exactly as the
  // shipped glow block does: nominal x pulse x haze (pose from tick state).
  const settle = (x: number, z: number): { halo: number; spill: number } => {
    const glow = CABINET_LIGHT_INTENSITY * glowPulse(0) * hazeFactor(Math.sqrt((x - center.x) * (x - center.x) + (z - center.z) * (z - center.z)));
    pair.halo.intensity = glow;
    pair.spill.intensity = glow;
    return { halo: pair.halo.intensity!, spill: pair.spill.intensity! };
  };
  const far = { x: INTERIOR.width / 2, z: INTERIOR.depth / 2 }; // the authored farthest corner
  const atFar = settle(far.x, far.z);
  assert.ok(atFar.halo > 0 && atFar.spill > 0, "the far corner settles NEVER 0 — dim toward Room Black, never READ dead (UX-DR17)");
  const nominalPulsed = CABINET_LIGHT_INTENSITY * glowPulse(0);
  assert.ok(atFar.halo < nominalPulsed, "far strictly below nominal x pulse (the haze pulled the glow down — the AC1 far leg in the graph)");
  assert.ok(atFar.halo >= nominalPulsed * HAZE_FLOOR, "and no lower than nominal x pulse x HAZE_FLOOR (the law's never-zero floor, not a fade to black)");
  const atBody = settle(center.x, center.z);
  assert.equal(atBody.halo, nominalPulsed, "at the authored body the pair sit at nominal x pulse EXACTLY (haze is 1 inside HAZE_NEAR_M — the I/O matrix Near-source leg in the graph)");
  let prev = atFar.halo;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = far.x + ((center.x - far.x) * i) / steps;
    const z = far.z + ((center.z - far.z) * i) / steps;
    const v = settle(x, z).halo;
    assert.ok(v >= prev, `walk step ${i} toward B0 RAISES the recorded halo intensity (non-decreasing; the shipped frame() produces exactly this read in the recorded graph)`);
    prev = v;
  }
  assert.ok(prev > atFar.halo, "and strictly so across the walk — the proximity gradient is a real ramp, not a flat line");
});
