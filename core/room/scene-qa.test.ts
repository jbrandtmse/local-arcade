// Story 1.3 QA additions: probes over the scene builder through its injected
// Three seam, targeting boundaries the pre-QA scene suite left unpinned —
// (1) the ceiling slab covering the full envelope must carry the Room Black
// token specifically (AC7: "ceiling Room Black"), not just be a slab; (2) the
// front-wall wainscot bands must never reach into the door opening (1.9's
// door-open beat swings through that gap at low height — the review pass
// tightened this and no probe held it); (3) the only text the built scene
// ever paints onto any canvas is exactly the Welcome Flyer record's verbatim
// string (AD-24 one-surface law at build time). Fake seam + fake canvases are
// test-local (the scene's contract is the seam, not three itself).
import test from "node:test";
import assert from "node:assert/strict";
import { buildRoomScene, type Placed, type RoomScene, type Three } from "./scene.ts";
import { DOOR_HALF_W, INTERIOR, WALL_T, WALL_TOP } from "./collision-volumes.ts";
import { signSurfaces, WELCOME_FLYER } from "./signage.ts";
import { zones } from "./zones.ts";
import { GLOW_MARQUEE, GLOW_RED, ROOM_BLACK } from "./tokens.ts";
import type { PaintContext, PaintSurface } from "./surfaces.ts";

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
  x: number;
  y: number;
  z: number;
}

function fakeThree() {
  const meshes: MeshRec[] = [];
  const lights: LightRec[] = [];
  let ambients = 0;
  const three: Three = {
    boxGeometry(w, h, d) {
      return { w, h, d } satisfies GeoRec;
    },
    standardMaterial(params) {
      return { params: { ...params } } satisfies MatRec;
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
    pointLight(color) {
      const rec: LightRec = { color, x: NaN, y: NaN, z: NaN };
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
    ambientLight() {
      ambients += 1;
      return {};
    },
    canvasTexture(source) {
      return { source };
    },
  };
  return { three, meshes, lights, ambientCount: () => ambients };
}

const built = (() => {
  const f = fakeThree();
  const canvasTexts: string[][] = [];
  const scene: RoomScene = { add() {} };
  const factory = (width: number, height: number): PaintSurface => {
    const texts: string[] = [];
    canvasTexts.push(texts);
    const ctx: PaintContext = {
      fillStyle: "",
      font: "",
      textAlign: "",
      fillRect() {},
      fillText(t) {
        texts.push(t);
      },
      // Deterministic generous per-character estimate (0.92em of the set
      // font) - same fake-metric family as surfaces.test.ts (rework pass 1).
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
    };
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  buildRoomScene(f.three, scene, factory);
  return { ...f, canvasTexts };
})();

// --- AC7: the ceiling is Room Black, token-derived, resting on the walls ----

test("the envelope-covering ceiling slab carries the Room Black token and rests above the wall top (AC7 'ceiling Room Black')", () => {
  const ceilings = built.meshes.filter(
    (m) => m.geo.w === INTERIOR.width + 2 * WALL_T && m.geo.d === INTERIOR.depth + 2 * WALL_T,
  );
  assert.equal(ceilings.length, 1, "exactly one slab spans the full envelope (walls are narrower)");
  const c = ceilings[0]!;
  assert.equal(c.mat.params["color"], ROOM_BLACK, "ceiling colour is the Room Black token, not a wall token");
  assert.ok(c.y > WALL_TOP, "the slab sits above the wall tops, not inside the room");
});

// --- AC7: wainscot bands never cross the door opening -----------------------

test("front-wall wainscot bands stop at the door faces: nothing intrudes into the door opening at low height (1.9's swing clearance)", () => {
  const doorOpeningMinX = -DOOR_HALF_W;
  const doorOpeningMaxX = DOOR_HALF_W;
  const frontBands = built.meshes.filter((m) => m.geo.h === 1.0 && m.z > INTERIOR.depth / 2 - 0.05);
  assert.equal(frontBands.length, 2, "one wainscot band on each front-wall segment");
  for (const b of frontBands) {
    const bandMinX = b.x - b.geo.w / 2;
    const bandMaxX = b.x + b.geo.w / 2;
    const intrudes = bandMaxX > doorOpeningMinX + 1e-9 && bandMinX < doorOpeningMaxX - 1e-9;
    assert.ok(!intrudes, `front wainscot band [${bandMinX}, ${bandMaxX}] must not reach into the door opening`);
  }
});

// --- AC6/AD-24 at build time: the only painted text is the flyer record -----

test("build-time one-surface law: across every injected canvas the only painted text is the Welcome Flyer's verbatim string", () => {
  const DOT = String.fromCharCode(0xb7);
  const withText = built.canvasTexts.filter((t) => t.length > 0);
  assert.equal(withText.length, 1, "exactly one canvas carries text (the carpet canvas carries none)");
  // Verbatim in the metric-robust form (rework pass 1 word-wrap moved the
  // split points): substring membership + character order, nothing invented.
  const painted = withText[0]!;
  for (const t of painted) assert.ok(WELCOME_FLYER.text.includes(t), `painted line "${t}" is a substring of the verbatim string`);
  assert.equal(
    painted.join("").replace(/\s+/g, ""),
    WELCOME_FLYER.text.split(` ${DOT} `).join("").replace(/\s+/g, ""),
    "painted characters rebuild the verbatim string in order",
  );
  assert.equal(signSurfaces.length, 1, "the signage whitelist still holds exactly one surface");
});

// --- AC4 consumption: the builder lights zones + roadmap from authored data --

test("the scene consumes the authored lighting: one point light per zone + roadmap light, hues drawn only from the zone tokens, amber, and door glow (AC4 lights-consumed leg)", () => {
  const zoneHues = new Set(zones.map((z) => z.hue));
  for (const z of zones) {
    const l = built.lights.find((x) => x.x === z.light.x && x.y === z.light.y && x.z === z.light.z);
    assert.ok(l, `authored ${z.id} light position is built`);
    assert.equal(l.color, z.hue);
  }
  for (const l of built.lights) {
    assert.ok(
      zoneHues.has(l.color) || l.color === GLOW_MARQUEE || l.color === GLOW_RED,
      `light hue ${l.color.toString(16)} is a zone token, roadmap amber, or door glow`,
    );
  }
  assert.equal(built.lights.length, zones.length + 2 + 1, "4 zone + 2 amber + 1 door glow point lights");
  assert.equal(built.ambientCount(), 1);
});
