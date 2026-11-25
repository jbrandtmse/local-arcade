// Story 1.3 (AC7): the scene builder driven through the fake Three seam (the
// injectable-source pattern again — core/main.ts holds the real adapter,
// main-glue.test.ts pins that wiring). Pins the extrusion contract: one box
// mesh per collision volume with dims read straight off the authored bounds
// (the single-geometry-source law in render form), Wall Panel wainscot band
// 0..1.0m on every wall, Room Black ceiling over the full envelope, carpet
// floor carrying the painted texture, 20 baseplates under the empty slots,
// the painted Welcome Flyer as the only paper text surface, 1.4's cabinet
// shells (part meshes from the shell spec, closed-pose doors, returned
// handles), zone/roadmap/door glow as LIGHTS only, and zero emissive on any
// material ("paint glow on walls" is a DESIGN don't — hues arrive from
// lights; the live screens stay painted maps too). BoxGeometry is the only
// geometry kind the seam can even ask for.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { AMBIENT_INTENSITY, buildRoomScene, DOOR_GLOW_INTENSITY, DOOR_GLOW_REACH, FACE_T, type Placed, type RoomScene, type Three } from "./scene.ts";
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
  SHELL,
  SHELL_PART_MESHES,
  cabinetAABB,
  cabinetPlacements,
  coinDoorPose,
  placementGeometry,
} from "./cabinets.ts";
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
  yaw: number; // 1.4: the coin-door panels carry a rotation; all else stays 0
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
  let textureUpdates = 0;
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
      const rec: MeshRec = { geo: geometry as GeoRec, mat: material as MatRec, x: NaN, y: NaN, z: NaN, yaw: NaN };
      meshes.push(rec);
      const placed: Placed = {
        position: {
          set(x, y, z) {
            rec.x = x;
            rec.y = y;
            rec.z = z;
          },
        },
        rotation: {
          set(x, y, z) {
            rec.yaw = y;
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
  return { three, geos, mats, meshes, lights, ambients, textures, textureUpdateCount: () => textureUpdates };
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
      // font) - same fake-metric family as surfaces.test.ts (rework pass 1).
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
    3 + 2 * cabinetPlacements.length,
    "painted canvases: carpet + flyer + the 1.9 street glazing sheet + one marquee + one screen per placement",
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

test("static authored scene: the build emits exactly one mesh per volume + wainscot + ceiling + floor + baseplates + flyer + SHELL_PART_MESHES per placement (formula, never a magic count), and touches no clock (AD-3/AD-15)", () => {
  const expectedMeshes =
    collisionVolumes.length +
    collisionVolumes.filter((v) => v.kind === "wall").length +
    2 + // ceiling + floor
    wallSlots.length +
    signSurfaces.length +
    SHELL_PART_MESHES * cabinetPlacements.length +
    FRONT_DOOR_FURNITURE_MESHES; // 1.9: awning + glazing + handle
  assert.equal(built.meshes.length, expectedMeshes, "mesh count derives from the authored data");
  assert.equal(
    built.objects.length,
    expectedMeshes + built.lights.length + built.ambients.length,
    "the scene graph holds meshes + lights + ambient only — no hidden nodes",
  );
  const src = readFileSync(SCENE_SRC, "utf8");
  for (const banned of ["Date.now", "performance.now", "Math.random", "requestAnimationFrame"]) {
    assert.ok(!src.includes(banned), `scene.ts must not use ${banned}`);
  }
});

// --- Story 1.4: the stand-up shells' extrusion + returned handles -----------

// The constant-IS-the-value drift pin (the marquee-cap idiom): the derived
// standoff pin below cannot see its own constant move. Re-pinned 0.30 ->
// 0.45 with the rework-iteration-1 exposure retune (the 0.30m hang put the
// light inside its own face's hot spot — the failed smoke).
test("the cabinet light standoff constant IS 0.45m (both cabinet glow lights hang this far in front of the face plane)", () => {
  assert.equal(CABINET_LIGHT_STANDOFF_M, 0.45, "0.45m standoff, the intensity/reach pair's sibling");
});

// Rework iteration 1 (failed smoke, AC2/AC3 exposure legs): 15 cd hanging
// 0.30m off a FACE_TINT face put ~266 own-contribution on both painted
// faces — white-hot marquee, white-rectangle screen. Three's physical
// point lights attenuate as INTENSITY / d^2 (times N.L off-axis), so the
// authored light triple has to keep each light's OWN contribution on each
// painted face inside these bounds — the pair sum and the 1.3 zone fill
// ride on top, and summed scene exposure is the lead's smoke call. The
// built-equality pins in the 1.4 shell-build test move WITH the constants
// (they cannot see a re-tune); the IS-value pins here are the drift cures
// (the CR-A1/A2 idiom — a derived inequality alone cannot see its own
// constants move). The proud offsets come from the shell-build test's
// exact face-position pins: each face sits at exactly SHELL depth +
// FACE_T/2 proud, so each face's nearest point sits directly under its
// light at standoff - proud, and its far corner is that depth plus the
// half-width/half-height diagonal (cosined by dNear/dFar, three's N.L).
test("cabinet glow exposure law: each light's own contribution on both painted faces sits inside the blow-out ceiling and above the dead-face floor (rework smoke AC2/AC3 exposure legs)", () => {
  const faces = [
    { name: "marquee", proud: SHELL.marquee.depth + FACE_T / 2, w: SHELL.marquee.width, h: SHELL.marquee.height },
    { name: "screen", proud: SHELL.bezel.depth + FACE_T / 2, w: SHELL.screen.width, h: SHELL.screen.height },
  ];
  // The inequalities first: a blown-out re-tune reddens HERE, at the
  // exposure law, not merely at the drift pins below.
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
  assert.equal(CABINET_LIGHT_INTENSITY, 0.25, "the cabinet glow candela value IS the authored 0.25 (drift pin)");
  assert.equal(CABINET_LIGHT_REACH, 4, "the cabinet glow reach constant IS 4 (drift pin — the spill-range cutoff; the face law is cutoff-independent at these depths)");
  assert.equal(CABINET_FACE_ILLUMINANCE_CEILING, 2, "the face-illuminance ceiling constant IS 2 (drift pin)");
  assert.equal(CABINET_FACE_ILLUMINANCE_FLOOR, 0.5, "the face-illuminance floor constant IS 0.5 (drift pin)");
});

function meshByDims(w: number, h: number, d: number): MeshRec {
  const found = built.meshes.filter((m) => m.geo.w === w && m.geo.h === h && m.geo.d === d);
  assert.equal(found.length, 1, `exactly one mesh with dims ${w}x${h}x${d}`);
  return found[0]!;
}

test("1.4 shell build: marquee bar + painted face, bezel + live screen face, coin-door panel + coin-slot detail posed CLOSED by the pose law, two glow lights per shell in the placement hues, and door/screen handles handed back (1.4 AC1/AC4/AC5)", () => {
  for (const p of cabinetPlacements) {
    const g = placementGeometry(p.slotId);
    // Materials follow the close-up mockup: marquee bg Room Black, screen
    // bezel Card Ink, coin door Wall Warm, coin slot Sign Chalk.
    const bar = meshByDims(SHELL.marquee.width, SHELL.marquee.height, SHELL.marquee.depth);
    assert.equal(bar.mat.params["color"], ROOM_BLACK, "marquee bar is Room Black (mockup .marquee bg)");
    assert.equal(bar.y, SHELL.marquee.centerY);
    const faces = built.meshes.filter((m) => m.geo.w === SHELL.marquee.width && m.geo.h === SHELL.marquee.height && m.geo.d === FACE_T);
    assert.equal(faces.length, 1, "exactly one thin painted face on the marquee bar");
    const face = faces[0]!;
    assert.equal(face.mat.params["color"], FACE_TINT, "painted face carries the neutral tint (hues come from the map)");
    assert.ok(typeof face.mat.params["map"] === "object", "marquee face is texture-mapped");
    const proud = (face.x - g.front.x) * g.facing.x + (face.z - g.front.z) * g.facing.z;
    // EXACT, not a window: the exposure law reads this offset, so the
    // built face must sit where that law says it sits (a mount nudge that
    // puts the face inside the light's hot spot reddens HERE).
    assert.ok(Math.abs(proud - (SHELL.marquee.depth + FACE_T / 2)) < 1e-12, "marquee face sits exactly marquee.depth + FACE_T/2 proud of the body front along the facing");
    const marqueeTexts = built.canvasTexts.find((t) => t.length === p.title.toUpperCase().split(/\s+/).length && t.every((s) => p.title.toUpperCase().includes(s)));
    assert.ok(marqueeTexts, "a canvas carries the marquee title lines");
    assert.deepEqual(marqueeTexts, p.title.toUpperCase().split(/\s+/), "marquee lettering is exactly the title record's words, uppercased");
    const bezel = meshByDims(SHELL.bezel.width, SHELL.bezel.height, SHELL.bezel.depth);
    assert.equal(bezel.mat.params["color"], CARD_INK, "screen bezel is Card Ink (mockup .screen border)");
    const screenFaces = built.meshes.filter((m) => m.geo.w === SHELL.screen.width && m.geo.h === SHELL.screen.height && m.geo.d === FACE_T);
    assert.equal(screenFaces.length, 1, "exactly one thin live face inside the bezel");
    const screenFace = screenFaces[0]!;
    assert.ok(typeof screenFace.mat.params["map"] === "object", "the screen face is texture-mapped (painted, not emissive)");
    assert.ok(!("emissive" in screenFace.mat.params), "the live screen carries NO emissive — hues come from its lights");
    // Same exact proud law as the marquee face — the exposure law reads
    // this offset for the screen's dNear; the proud was previously pinned
    // nowhere, so a mount nudge could re-blow the screen face with CI green.
    const sProud = (screenFace.x - g.front.x) * g.facing.x + (screenFace.z - g.front.z) * g.facing.z;
    assert.ok(Math.abs(sProud - (SHELL.bezel.depth + FACE_T / 2)) < 1e-12, "screen face sits exactly bezel.depth + FACE_T/2 proud of the body front along the facing");

    // Coin door + slot: built at the CLOSED pose, numbers from the pose law.
    const pose = coinDoorPose(p.volumeId, false);
    const panel = meshByDims(SHELL.coinDoor.width, SHELL.coinDoor.height, SHELL.coinDoor.thickness);
    assert.equal(panel.mat.params["color"], WALL_WARM, "coin door is Wall Warm (mockup .coindoor bg)");
    assert.ok(Math.abs(panel.x - pose.panel.x) < 1e-12 && Math.abs(panel.y - pose.panel.y) < 1e-12 && Math.abs(panel.z - pose.panel.z) < 1e-12, "door panel at the closed-pose centre");
    assert.equal(panel.yaw, pose.panel.yaw, "door panel carries the closed yaw from the pose law");
    const slotMesh = meshByDims(SHELL.coinSlot.width, SHELL.coinSlot.height, SHELL.coinSlot.thickness);
    assert.equal(slotMesh.mat.params["color"], SIGN_CHALK, "coin slot is Sign Chalk (mockup .slot bg)");
    assert.ok(Math.abs(slotMesh.x - pose.slot.x) < 1e-12 && Math.abs(slotMesh.z - pose.slot.z) < 1e-12, "coin slot at the closed-pose centre");

    // Two glow lights: marquee spill + screen halo, placement hues,
    // authored cabinet intensity/reach.
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
    // directly under it and takes symmetric half-width/half-height far
    // corners, so each built glow light must share its painted face's
    // centre on BOTH axes the proud/standoff pins leave open — lateral
    // (visitor-right) and height. A drift on either re-deads the face's
    // far side with the law's constants untouched.
    const lat = (q: { x: number; z: number }): number => (q.x - g.front.x) * g.right.x + (q.z - g.front.z) * g.right.z;
    assert.ok(Math.abs(lat(face) - lat(spill)) < 1e-12 && Math.abs(face.y - spill.y) < 1e-12, "the marquee face sits centred under its spill light (the exposure law's nearest-point + symmetric-corner model)");
    assert.ok(Math.abs(lat(screenFace) - lat(halo)) < 1e-12 && Math.abs(screenFace.y - halo.y) < 1e-12, "the screen face sits centred under its halo light (same law)");

    // Handles the entry animates every frame.
    const door = built.handles.doors.find((d) => d.id === p.volumeId);
    const screen = built.handles.screens.find((s) => s.id === p.volumeId);
    assert.ok(door && screen, "door + screen handles returned for the placement");
    assert.equal(screen.canvas.width, Math.round(SHELL.screen.width * 1000), "screen canvas aspect == face metres (1000 px/m)");
    // The repaint marks the handle's texture; it only reaches the visible
    // face if the face's map IS that texture AND that texture's source IS
    // the handle's canvas — object identity, not parallel structures.
    const faceMap = screenFace.mat.params["map"] as { source?: unknown };
    assert.ok(faceMap === screen.texture, "the screen face's map IS the returned handle's texture (a repaint marks that texture and this face shows it)");
    assert.ok(faceMap.source === screen.canvas, "and that texture's source is the handle's canvas (one canvas, one texture, one face)");
    assert.ok(built.canvasTexts.some((t) => t.includes(p.screenZones.next.toUpperCase())), "the screen canvas is lettered with the NEXT zone at build (step 0)");
    assert.ok(built.textureUpdateCount() === 0, "the BUILD itself never marks textures updated (repaint is frame-side)");
  }
});

// Story 1.10 (DW-29, AC4): the upright-cabinet contour law. The five new
// SHELL parts build at the record's dims in token-only materials, every
// horizontal extent inside 0.06m of the body AABB sides (the >=1.20m aisle
// law holds at eye scale as it does at collision), and the cabinet-B0
// collision volume stays byte-identical to the untouched cabinetAABB
// derivation — movement, targetability, and the future occlusion all read
// that one entry. The mesh-count formula test above absorbs the new parts
// through SHELL_PART_MESHES (11); the painted-canvas and point-light count
// pins above stay byte-unchanged because this story adds neither.
test("1.10 DW-29 upright contours: deck slab, kick plate, screen hood, and two side wings at SHELL dims in token-only materials within the 0.06m body-AABB law; the cabinet-B0 collision AABB byte-identical (AC4)", () => {
  for (const p of cabinetPlacements) {
    const g = placementGeometry(p.slotId);
    const lat = (x: number, z: number): number => (x - g.center.x) * g.right.x + (z - g.center.z) * g.right.z;
    const along = (x: number, z: number): number => (x - g.center.x) * g.facing.x + (z - g.center.z) * g.facing.z;

    // Control-deck slab: Wall Panel woodwork, its face exactly deck.proud
    // proud of the body front; its top edge meets the screen face bottom
    // (0.79) without ever covering the painted NEXT row.
    const deck = meshByDims(SHELL.deck.width, SHELL.deck.height, SHELL.deck.depth);
    assert.equal(deck.mat.params["color"], WALL_PANEL, "the deck slab is Wall Panel (body woodwork, token only)");
    assert.equal(deck.y, SHELL.deck.centerY);
    assert.ok(
      Math.abs(along(deck.x, deck.z) - SHELL.body.depth / 2 + SHELL.deck.depth / 2 - SHELL.deck.proud) < 1e-12,
      "deck face sits exactly SHELL.deck.proud proud of the body front plane",
    );
    assert.ok(
      Math.abs(deck.y + SHELL.deck.height / 2 - (SHELL.screen.centerY - SHELL.screen.height / 2)) < 1e-12,
      "the deck top meets the screen face's bottom edge exactly (the NEXT row stays uncovered)",
    );

    // Kick plate: Card Ink, body-centred — its front protrusion derives
    // from the SHELL depth difference, and it stays clear of the B0
    // baseplate faces (no coplanar z-fighting).
    const kick = meshByDims(SHELL.kick.width, SHELL.kick.height, SHELL.kick.depth);
    assert.equal(kick.mat.params["color"], CARD_INK, "the kick plate is Card Ink (bezel family, token only)");
    assert.ok(Math.abs(kick.y - SHELL.kick.centerY) < 1e-12, "kick centred on its record height, bottom at the floor");
    assert.ok(Math.abs(along(kick.x, kick.z)) < 1e-12, "the kick plate is body-centred");
    assert.ok(SHELL.kick.depth / 2 < SHELL.body.depth / 2, "kick depth stays inside the body faces (baseplate coplanarity avoided)");
    assert.ok(SHELL.kick.width > SHELL.body.width, "the kick plate stands outside the body sides — a body-interior plate would render inside the opaque volume box and show nothing");

    // Screen hood lip: Card Ink, exactly hood.proud proud, riding above the
    // screen face (the 1.4 face and its proud pin above stay byte-unchanged).
    const hood = meshByDims(SHELL.hood.width, SHELL.hood.height, SHELL.hood.depth);
    assert.equal(hood.mat.params["color"], CARD_INK, "the hood lip is Card Ink (bezel family, token only)");
    assert.equal(hood.y, SHELL.hood.centerY);
    assert.ok(hood.y - SHELL.hood.height / 2 > SHELL.screen.centerY + SHELL.screen.height / 2, "the hood rides clear above the screen face");
    assert.ok(
      Math.abs(along(hood.x, hood.z) - SHELL.body.depth / 2 + SHELL.hood.depth / 2 - SHELL.hood.proud) < 1e-12,
      "hood face sits exactly SHELL.hood.proud proud of the body front plane",
    );

    // Side wings: two Wall Panel wings at the record's lateral offsets,
    // symmetric about the body centre line.
    const wings = built.meshes.filter(
      (m) => m.geo.w === SHELL.sidePanels.thickness && m.geo.h === SHELL.sidePanels.height && m.geo.d === SHELL.sidePanels.depth,
    );
    assert.equal(wings.length, 2, "two side wings per shell");
    for (const w of wings) assert.equal(w.mat.params["color"], WALL_PANEL, "wings are Wall Panel (body woodwork, token only)");
    assert.equal(wings[0]!.y, SHELL.sidePanels.centerY);
    assert.equal(wings[1]!.y, SHELL.sidePanels.centerY);
    const wingOffsets = wings.map((m) => lat(m.x, m.z)).sort((a, b) => a - b);
    assert.ok(Math.abs(wingOffsets[0] + SHELL.sidePanels.lateralOffset) < 1e-12, "the left wing sits at -lateralOffset");
    assert.ok(Math.abs(wingOffsets[1] - SHELL.sidePanels.lateralOffset) < 1e-12, "the right wing sits at +lateralOffset");

    // The 0.06m AABB law: every new part's horizontal extent (lateral and
    // along-facings, boxes are axis-aligned) stays within 0.06m of the body
    // AABB sides.
    const halfW = SHELL.body.width / 2;
    const halfD = SHELL.body.depth / 2;
    const lawTol = 0.06 + 1e-9;
    for (const m of [deck, kick, hood, ...wings]) {
      const latHalf = (m.geo.w / 2) * Math.abs(g.right.x) + (m.geo.d / 2) * Math.abs(g.right.z);
      const alongHalf = (m.geo.w / 2) * Math.abs(g.facing.x) + (m.geo.d / 2) * Math.abs(g.facing.z);
      assert.ok(Math.abs(lat(m.x, m.z)) + latHalf <= halfW + lawTol, `contour part ${m.geo.w}x${m.geo.h}x${m.geo.d} lateral extent within 0.06m of the body AABB`);
      assert.ok(Math.abs(along(m.x, m.z)) + alongHalf <= halfD + lawTol, `contour part ${m.geo.w}x${m.geo.h}x${m.geo.d} along-facings extent within 0.06m of the body AABB`);
    }

    // The collision-law proof: the cabinet volume entry is still byte-for-
    // byte the untouched cabinetAABB derivation — the contours are decor,
    // never a new invisible wall.
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
  const awning = meshByDims(FRONT_DOOR_AWNING.width, FRONT_DOOR_AWNING.height, FRONT_DOOR_AWNING.depth);
  assert.equal(awning.mat.params["color"], WALL_PANEL, "awning material is the WALL_PANEL token by name (mutation: a literal hex reds the hue-home guard below AND this pin)");
  assert.equal(awning.x, 0);
  assert.equal(awning.y, FRONT_DOOR_AWNING.centerY);
  assert.ok(awning.y > DOOR_TOP, "above the door head");
  assert.ok(awning.z > INTERIOR.depth / 2 + WALL_T, "proud of the front wall's exterior face (street side)");

  // Glazing: painted two-tone sheet on the panel's street face, closed pose.
  const glass = meshByDims(FRONT_DOOR_GLASS.width, FRONT_DOOR_GLASS.height, FRONT_DOOR_GLASS.thickness);
  assert.equal(glass.mat.params["color"], FACE_TINT, "painted map carries the hues; the material stays the neutral tint (1.3's identity law from the street too)");
  assert.ok(typeof glass.mat.params["map"] === "object", "the glazing is texture-mapped, never emissive");
  assert.ok(
    Math.abs(glass.x - closed.glass.x) < 1e-12 && Math.abs(glass.y - closed.glass.y) < 1e-12 && Math.abs(glass.z - closed.glass.z) < 1e-12,
    "the glazing builds at the closed pose from door.ts",
  );
  assert.ok(glass.z > INTERIOR.depth / 2, "on the street face of the wall");

  // Handle: Sign Chalk on the free edge, closed pose.
  const handle = meshByDims(FRONT_DOOR_HANDLE.width, FRONT_DOOR_HANDLE.height, FRONT_DOOR_HANDLE.thickness);
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
// -focus and the glass pair included). scene.ts, workbench.ts, door.ts and
// every other core module reference the NAME and derive css via toCss.
test("token hue home: every hex literal exported by tokens.ts appears in NO other core non-test source (AC6; mutation: an awning literal hex in scene.ts reddens here)", () => {
  const tokensSrc = readFileSync(path.join(import.meta.dirname, "tokens.ts"), "utf8");
  const hexes = [...tokensSrc.matchAll(/0x[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
  assert.ok(hexes.length >= 22, `the full token set exists to scan (found ${hexes.length})`);
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
