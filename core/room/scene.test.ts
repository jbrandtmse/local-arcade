// Story 1.3 (AC7): the scene builder driven through the fake Three seam (the
// injectable-source pattern again — core/main.ts holds the real adapter,
// main-glue.test.ts pins that wiring). Pins the extrusion contract: one box
// mesh per collision volume with dims read straight off the authored bounds
// (the single-geometry-source law in render form), Wall Panel wainscot band
// 0..1.0m on every wall, Room Black ceiling over the full envelope, carpet
// floor carrying the painted texture, 20 baseplates under the empty slots,
// the painted Welcome Flyer as the only text mesh, zone/roadmap/door glow as
// LIGHTS only, and zero emissive on any material ("paint glow on walls" is a
// DESIGN don't — hues arrive from lights). BoxGeometry is the only geometry
// kind the seam can even ask for.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildRoomScene, type Placed, type RoomScene, type Three } from "./scene.ts";
import { DOOR_TOP, INTERIOR, WALL_T, WALL_TOP, collisionVolumes } from "./collision-volumes.ts";
import { EMPTY_BASEPLATE, wallSlots } from "./slot-config.ts";
import { CASUAL_ALLEY, PINBALL_CORNER, SNACK_BAR, WORKSHOP, ZONE_LIGHT_DISTANCE, ZONE_LIGHT_INTENSITY, roadmap, zones } from "./zones.ts";
import { WELCOME_FLYER } from "./signage.ts";
import {
  CARD_INK,
  CARPET_BASE,
  CARPET_PATTERN,
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
  STREET_GRAY,
  WALL_PANEL,
  WALL_WARM,
} from "./tokens.ts";
import type { PaintContext, PaintSurface } from "./surfaces.ts";

const SCENE_SRC = path.join(import.meta.dirname, "scene.ts");

// --- fakes -------------------------------------------------------------------

interface GeoRec {
  w: number;
  h: number;
  d: number;
}

interface MatRec {
  params: Record<string, unknown>;
}

interface MeshRec {
  geo: GeoRec;
  mat: MatRec;
  x: number;
  y: number;
  z: number;
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
  const lights: LightRec[] = [];
  const ambients: { color: number; intensity: number }[] = [];
  const textures: { source: PaintSurface }[] = [];
  const three: Three = {
    boxGeometry(w, h, d) {
      const g: GeoRec = { w, h, d };
      geos.push(g);
      return g;
    },
    standardMaterial(params) {
      const m: MatRec = { params: { ...params } };
      mats.push(m);
      return m;
    },
    mesh(geometry, material) {
      const rec: MeshRec = { geo: geometry as GeoRec, mat: material as MatRec, x: NaN, y: NaN, z: NaN };
      meshes.push(rec);
      const placed: Placed = {
        position: {
          set(x, y, z) {
            rec.x = x;
            rec.y = y;
            rec.z = z;
          },
        },
      };
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
  };
  return { three, geos, mats, meshes, lights, ambients, textures };
}

function fakeWorld(): {
  scene: RoomScene;
  objects: object[];
  factory: (w: number, h: number) => PaintSurface;
  canvasTexts: string[][];
} {
  const objects: object[] = [];
  const canvasTexts: string[][] = [];
  const scene: RoomScene = {
    add(o) {
      objects.push(o);
      return objects.length;
    },
  };
  const factory = (w: number, h: number): PaintSurface => {
    const texts: string[] = [];
    canvasTexts.push(texts);
    const ctx: PaintContext = {
      fillStyle: "#000000",
      font: "",
      textAlign: "",
      fillRect() {},
      fillText(text) {
        texts.push(text);
      },
      // Deterministic generous per-character estimate (0.92em of the set
      // font) - same fake-metric family as surfaces.test.ts (rework 1).
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
    };
    return { width: w, height: h, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  return { scene, objects, factory, canvasTexts };
}

const built = (() => {
  const f = fakeThree();
  const w = fakeWorld();
  buildRoomScene(f.three, w.scene, w.factory);
  return { ...f, ...w };
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

test("one box mesh per collision volume, dims read straight off the authored bounds (the single-geometry-source law in render form)", () => {
  for (const v of collisionVolumes) {
    const m = meshForVolume(v.id);
    const expectedColor = v.kind === "wall" ? WALL_WARM : v.kind === "street" ? STREET_GRAY : WALL_PANEL;
    assert.equal(m.mat.params["color"], expectedColor, `${v.id} material token`);
  }
  // no volume gets a second copy and no mesh drifts off its volume
  for (const v of collisionVolumes) {
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
  assert.equal(built.canvasTexts.length, 2, "exactly two painted canvases: carpet + flyer");
});

// --- lighting: hues arrive from lights, never from emissive -------------------

test("point lights = 4 zone identity + 2 roadmap amber + 1 door glow (7 total); hues are glow-anchor tokens only; one low Room Black ambient (AC4)", () => {
  assert.equal(built.lights.length, 7);
  const zoneLights = [PINBALL_CORNER, WORKSHOP, SNACK_BAR, CASUAL_ALLEY].flatMap((z) => [z.light]);
  for (const zl of zoneLights) {
    const l = built.lights.find((x) => x.x === zl.x && x.y === zl.y && x.z === zl.z);
    assert.ok(l, `zone light at (${zl.x},${zl.z})`);
    assert.equal(l.color, zl.hue);
    assert.equal(l.intensity, ZONE_LIGHT_INTENSITY);
    assert.equal(l.distance, ZONE_LIGHT_DISTANCE);
  }
  for (const rl of roadmap.lights) {
    const l = built.lights.find((x) => x.x === rl.x && x.y === rl.y && x.z === rl.z);
    assert.ok(l, `roadmap light at (${rl.x},${rl.z})`);
    assert.equal(l.color, GLOW_MARQUEE);
  }
  const door = built.lights.find((l) => l.color === GLOW_RED);
  assert.ok(door, "door glow light");
  assert.ok(door.y > DOOR_TOP, "door glow sits above the door head");
  assert.equal(door.x, 0, "door glow centred on the door gap");
  assert.ok(door.z < INTERIOR.depth / 2, "door glow hangs on the room side of the front wall face, not in the street");
  assert.equal(built.ambients.length, 1);
  assert.equal(built.ambients[0]!.color, ROOM_BLACK);
  assert.ok(built.ambients[0]!.intensity <= 0.2, "ambient is very low (the dark the glow sits against)");
  const glowAnchors = [GLOW_MARQUEE, GLOW_PINK, GLOW_CYAN, GLOW_GREEN, GLOW_VIOLET, GLOW_ORANGE, GLOW_RED, GLOW_STEEL];
  for (const l of built.lights) assert.ok(glowAnchors.includes(l.color), `light hue ${l.color.toString(16)} is a DESIGN glow anchor`);
});

test("zero emissive anywhere: no material params carry it at build, and the scene source never sets it (DESIGN don't: paint glow on walls)", () => {
  for (const m of built.mats) {
    assert.ok(!("emissive" in m.params), `material ${JSON.stringify(Object.keys(m.params))} carries no emissive`);
  }
  const src = readFileSync(SCENE_SRC, "utf8");
  assert.ok(!src.includes("emissive:"), "scene.ts assigns emissive nowhere");
});

test("BoxGeometry only: the seam offers no other geometry kind, and the scene source names no curved primitive (hard-corners-only carries into render)", () => {
  const src = readFileSync(SCENE_SRC, "utf8");
  for (const banned of ["CylinderGeometry", "SphereGeometry", "CircleGeometry", "PlaneGeometry", "ConeGeometry"]) {
    assert.ok(!src.includes(banned), `scene.ts must not use ${banned}`);
  }
  // the headless build itself: every geometry the builder ever asked for
  // came from the box seam (the fake only implements that one).
  assert.ok(built.geos.length >= collisionVolumes.length);
});

test("static authored scene: the build emits exactly 38 meshes (10 volumes + 5 wainscot bands + ceiling + floor + 20 baseplates + flyer) and touches no clock (AD-3/AD-15)", () => {
  assert.equal(built.meshes.length, 38);
  assert.equal(built.objects.length, 38 + built.lights.length + built.ambients.length);
  const src = readFileSync(SCENE_SRC, "utf8");
  for (const banned of ["Date.now", "performance.now", "Math.random", "requestAnimationFrame"]) {
    assert.ok(!src.includes(banned), `scene.ts must not use ${banned}`);
  }
});

// zone token sanity (the same hues the scene builder lights with)
test("scene lighting hues match the authored zone hues (no drift between zones.ts identity and the lights the builder hangs)", () => {
  const hues = new Set(zones.map((z) => z.hue));
  for (const zl of built.lights) {
    if (hues.has(zl.color)) continue; // a zone identity light
    assert.ok([GLOW_MARQUEE, GLOW_RED].includes(zl.color), "the rest are roadmap amber / door glow");
  }
  assert.equal(CASUAL_ALLEY.hue, GLOW_GREEN);
  assert.equal(CARPET_PATTERN, 0x3e3046);
  assert.equal(CARD_INK, 0x2a241c);
});
