// Story 1.3 pins (AC1-AC6): the authored Arcade Room data — the collision
// volume list (ids, envelope faces, closed door in the gap, street beyond),
// the Wall Slot config (20 slots at exact 1.40m pitch under a revision id,
// fill-scan indices, roadmap stretch, zone disjointness), the four fixed
// zones with DESIGN.md-exact hues and authored lights (plus roadmap amber),
// the single Welcome Flyer, and the aisle probe set (main aisle, pillar gaps,
// per-slot approach clearances — values recorded from this run; the binding
// minimums are the room-layout contract).
import test from "node:test";
import assert from "node:assert/strict";
import {
  ENTRY_SPAWN,
  INTERIOR,
  WALL_T,
  collisionVolumes,
  type CollisionVolume,
} from "./collision-volumes.ts";
import { PLAYER_RADIUS } from "../player.ts";
import {
  EMPTY_BASEPLATE,
  ROADMAP_STRETCH_SLOTS,
  SLOT_PITCH,
  WALL_SLOT_REVISION,
  wallSlots,
  type WallSlot,
} from "./slot-config.ts";
import { CASUAL_ALLEY, PINBALL_CORNER, SNACK_BAR, WORKSHOP, ZONE_LIGHT_Y, roadmap, zones, type Zone } from "./zones.ts";
import { signSurfaces } from "./signage.ts";
import {
  GLOW_GREEN,
  GLOW_MARQUEE,
  GLOW_ORANGE,
  GLOW_STEEL,
  GLOW_VIOLET,
  PAPER_CARD,
  ROOM_BLACK,
} from "./tokens.ts";

const EPS = 1e-9;

function vol(id: string): CollisionVolume {
  const v = collisionVolumes.find((c) => c.id === id);
  assert.ok(v, `authored volume "${id}" must exist`);
  return v;
}

function slot(id: string): WallSlot {
  const s = wallSlots.find((c) => c.id === id);
  assert.ok(s, `wall slot "${id}" must exist`);
  return s;
}

// --- AC1: the authored room shell -------------------------------------------

test("authored id set, envelope faces, closed door in the bottom-center gap, street beyond the front wall (AC1)", () => {
  const ids = collisionVolumes.map((v) => v.id);
  assert.deepEqual(
    [...ids].sort(),
    [
      "door-front",
      "pillar-1",
      "pillar-2",
      "street-floor",
      "street-wall",
      "wall-back",
      "wall-front-left",
      "wall-front-right",
      "wall-left",
      "wall-right",
    ],
  );
  // Envelope: walls close the 19m x 12.5m interior (room-layout.md contract).
  assert.equal(INTERIOR.width, 19);
  assert.equal(INTERIOR.depth, 12.5);
  assert.equal(vol("wall-back").max.z, -INTERIOR.depth / 2);
  assert.equal(vol("wall-left").max.x, -INTERIOR.width / 2);
  assert.equal(vol("wall-right").min.x, INTERIOR.width / 2);
  // wall-front split into two segments leaving the door gap (matrix row).
  assert.equal(vol("wall-front-left").min.z, INTERIOR.depth / 2);
  assert.equal(vol("wall-front-left").max.z, INTERIOR.depth / 2 + WALL_T);
  assert.equal(vol("wall-front-left").min.x, -(INTERIOR.width / 2 + WALL_T));
  assert.equal(vol("wall-front-left").max.x, -0.5);
  assert.equal(vol("wall-front-right").min.x, 0.5);
  assert.equal(vol("wall-front-right").max.x, INTERIOR.width / 2 + WALL_T);
  // Door closed in the gap, blocking.
  const door = vol("door-front");
  assert.equal(door.kind, "door");
  assert.equal(door.min.x, -0.5);
  assert.equal(door.max.x, 0.5);
  assert.equal(door.min.z, INTERIOR.depth / 2);
  assert.ok(Math.abs(door.max.z - (INTERIOR.depth / 2 + 0.12)) < EPS, "0.12m panel");
  assert.equal(door.min.y, 0);
  assert.equal(door.max.y, 2.1);
  assert.equal(door.blocksMovement, true);
  assert.equal(door.targetable, false);
  // Street side beyond the front wall.
  const floor = vol("street-floor");
  assert.equal(floor.kind, "street");
  assert.equal(floor.min.x, -4);
  assert.equal(floor.max.x, 4);
  assert.equal(floor.min.z, 6.5);
  assert.equal(floor.max.z, 8.25);
  assert.equal(floor.blocksMovement, false);
  const sw = vol("street-wall");
  assert.equal(sw.min.z, 8.25);
  assert.equal(sw.max.z, 8.5);
  assert.equal(sw.blocksMovement, true);
});

test("occluder pillars: authored ids, centers (+-3.5, 2.1), 0.5m squares, and they are the occluder entries of the one list (AC3)", () => {
  for (const id of ["pillar-1", "pillar-2"] as const) {
    const p = vol(id);
    assert.equal(p.kind, "pillar");
    assert.equal(p.blocksMovement, true);
    const cx = (p.min.x + p.max.x) / 2;
    const cz = (p.min.z + p.max.z) / 2;
    assert.ok(Math.abs(Math.abs(cx) - 3.5) < EPS, `${id} center x`);
    assert.ok(Math.abs(cz - 2.1) < EPS, `${id} center z`);
    assert.ok(Math.abs((p.max.x - p.min.x) / 2 - 0.25) < EPS, `${id} half x`);
    assert.ok(Math.abs((p.max.z - p.min.z) / 2 - 0.25) < EPS, `${id} half z`);
  }
  // The occluder set is the pillar-kind entries of the single volume list
  // (AD-7: one geometry for audio raycasts and sightlines).
  const occluders = collisionVolumes.filter((v) => v.kind === "pillar").map((v) => v.id);
  assert.deepEqual(occluders, ["pillar-1", "pillar-2"]);
});

test("authored grammar: min<max everywhere; all block except the street floor; nothing targetable until 1.4's shells; entry spawn just inside the door", () => {
  for (const v of collisionVolumes) {
    assert.ok(v.min.x < v.max.x && v.min.y < v.max.y && v.min.z < v.max.z, `${v.id} min<max`);
    assert.equal(v.targetable, false, `${v.id} targetable`);
    const expected = v.id === "street-floor" ? false : true;
    assert.equal(v.blocksMovement, expected, `${v.id} blocksMovement`);
  }
  assert.deepEqual({ ...ENTRY_SPAWN }, { x: 0, z: 5.6, yaw: 0 });
  // Spawn must be inside the envelope, clear of every blocking volume by
  // more than the player radius.
  const half = INTERIOR.width / 2;
  const halfZ = INTERIOR.depth / 2;
  assert.ok(Math.abs(ENTRY_SPAWN.x) < half && ENTRY_SPAWN.z < halfZ, "inside envelope");
  for (const v of collisionVolumes) {
    if (!v.blocksMovement) continue;
    const dx = Math.max(v.min.x - ENTRY_SPAWN.x, ENTRY_SPAWN.x - v.max.x, 0);
    const dz = Math.max(v.min.z - ENTRY_SPAWN.z, ENTRY_SPAWN.z - v.max.z, 0);
    assert.ok(Math.sqrt(dx * dx + dz * dz) > PLAYER_RADIUS, `${v.id} clears spawn`);
  }
});

// --- AC2: Wall Slot config ---------------------------------------------------

test("slot config: revision id, 20 slots, back->front alternating index order, roadmap stretch (AC2)", () => {
  assert.equal(WALL_SLOT_REVISION, "wallslots-r1-2026-11-21");
  assert.equal(wallSlots.length, 20);
  const byIndex = [...wallSlots].sort((a, b) => a.index - b.index).map((s) => s.id);
  assert.deepEqual(byIndex, [
    "B0", "B1", "B2", "B3", "B4", "B5", "B6", // back row left->right first
    "L0", "R0", "L1", "R1", "L2", "R2", "L3", "R3", "L4", "R4", "L5", "R5", "L6", // then L/R alternating
  ]);
  assert.equal(new Set(wallSlots.map((s) => s.index)).size, 20);
  assert.equal(new Set(wallSlots.map((s) => s.id)).size, 20);
  assert.deepEqual([...ROADMAP_STRETCH_SLOTS], ["L4", "L5", "L6", "R3", "R4", "R5"]);
  for (const id of ROADMAP_STRETCH_SLOTS) assert.ok(wallSlots.some((s) => s.id === id));
});

test("slot geometry: centers on the wall line, footprint 0.70x0.60, facing the room, consecutive pitch exactly 1.40m, all inside the envelope (AC2)", () => {
  assert.equal(SLOT_PITCH, 1.4);
  const runs: Record<string, WallSlot[]> = { back: [], left: [], right: [] };
  for (const s of wallSlots) runs[s.wall]!.push(s);
  // Back row: x -4.2..4.2 at z -5.85, facing +Z; side runs at x = +-9.10.
  for (const s of runs.back!) assert.ok(Math.abs(s.center.z - -5.85) < EPS);
  for (const s of runs.left!) assert.ok(Math.abs(s.center.x - -9.1) < EPS);
  for (const s of runs.right!) assert.ok(Math.abs(s.center.x - 9.1) < EPS);
  assert.equal(runs.back!.length, 7);
  assert.equal(runs.left!.length, 7);
  assert.equal(runs.right!.length, 6);
  for (const s of wallSlots) {
    assert.deepEqual(s.footprint, { alongWall: 0.7, depth: 0.6 });
  }
  assert.deepEqual(slot("B3").facing, { x: 0, z: 1 });
  assert.deepEqual(slot("L0").facing, { x: 1, z: 0 });
  assert.deepEqual(slot("R0").facing, { x: -1, z: 0 });
  // Consecutive in-run spacing == 1.40 exactly (authored numbers; FP
  // representation tolerance like the existing pitch pins in player.test).
  for (const run of Object.values(runs)) {
    run.sort((a, b) => (a.wall === "back" ? a.center.x - b.center.x : a.center.z - b.center.z));
    for (let i = 1; i < run.length; i++) {
      const prev = run[i - 1]!;
      const cur = run[i]!;
      const gap = cur.wall === "back" ? cur.center.x - prev.center.x : cur.center.z - prev.center.z;
      assert.ok(Math.abs(gap - SLOT_PITCH) < 1e-9, `${prev.id}->${cur.id} gap ${gap}`);
    }
  }
  // Inside the interior envelope (slot boxes sit off the wall face).
  const halfX = INTERIOR.width / 2;
  const halfZ = INTERIOR.depth / 2;
  for (const s of wallSlots) {
    const halfAlong = s.footprint.alongWall / 2;
    const halfDepth = s.footprint.depth / 2;
    const alongX = s.facing.x !== 0;
    const minX = alongX ? s.center.x - halfDepth : s.center.x - halfAlong;
    const maxX = alongX ? s.center.x + halfDepth : s.center.x + halfAlong;
    const minZ = alongX ? s.center.z - halfAlong : s.center.z - halfDepth;
    const maxZ = alongX ? s.center.z + halfAlong : s.center.z + halfDepth;
    assert.ok(minX > -halfX && maxX < halfX, `${s.id} x in envelope`);
    assert.ok(minZ > -halfZ && maxZ < halfZ, `${s.id} z in envelope`);
  }
});

test("no slot lies inside any zone rect (zones and slots are separate authored architecture, AD-10/AD-25)", () => {
  for (const s of wallSlots) {
    const alongX = s.facing.x !== 0;
    const halfAlong = s.footprint.alongWall / 2;
    const halfDepth = s.footprint.depth / 2;
    const minX = alongX ? s.center.x - halfDepth : s.center.x - halfAlong;
    const maxX = alongX ? s.center.x + halfDepth : s.center.x + halfAlong;
    const minZ = alongX ? s.center.z - halfAlong : s.center.z - halfDepth;
    const maxZ = alongX ? s.center.z + halfAlong : s.center.z + halfDepth;
    for (const zone of zones) {
      const overlap =
        maxX > zone.rect.minX && minX < zone.rect.maxX && maxZ > zone.rect.minZ && minZ < zone.rect.maxZ;
      assert.ok(!overlap, `${s.id} must not intrude into ${zone.id}`);
    }
  }
});

// --- AC4: zones --------------------------------------------------------------

test("four fixed zones with DESIGN.md-exact hues; Casual Alley kept clean; lights inside their rects at ceiling height (AC4)", () => {
  assert.deepEqual(zones.map((z) => z.id), ["pinball-corner", "workshop", "snack-bar", "casual-alley"]);
  const hueByZone: Record<string, number> = Object.fromEntries(zones.map((z) => [z.id, z.hue]));
  assert.equal(hueByZone["pinball-corner"], GLOW_VIOLET);
  assert.equal(hueByZone["workshop"], GLOW_STEEL);
  assert.equal(hueByZone["snack-bar"], GLOW_ORANGE);
  assert.equal(hueByZone["casual-alley"], GLOW_GREEN);
  // Hex values equal the DESIGN.md glow anchors exactly (Rule 14 check:
  // 0x57E6A3 / 0xB07CFF / 0xFF9A5C / 0x7FB0C9 upper-case spellings).
  assert.equal(GLOW_GREEN, 0x57e6a3);
  assert.equal(GLOW_VIOLET, 0xb07cff);
  assert.equal(GLOW_ORANGE, 0xff9a5c);
  assert.equal(GLOW_STEEL, 0x7fb0c9);
  assert.equal(ROOM_BLACK, 0x15110e);
  assert.equal(PAPER_CARD, 0xf2e8d4);
  // Casual Alley rect (matrix row) — kept clean: no slot (pin above) and no
  // blocking volume inside.
  assert.deepEqual(CASUAL_ALLEY.rect, { minX: 4.5, maxX: 8.0, minZ: 1.2, maxZ: 3.0 });
  for (const v of collisionVolumes) {
    if (!v.blocksMovement) continue;
    const overlap =
      v.max.x > CASUAL_ALLEY.rect.minX && v.min.x < CASUAL_ALLEY.rect.maxX &&
      v.max.z > CASUAL_ALLEY.rect.minZ && v.min.z < CASUAL_ALLEY.rect.maxZ;
    assert.ok(!overlap, `${v.id} must not block inside Casual Alley`);
  }
  // Lights: inside/at their rect, ceiling height, hue matches the zone.
  for (const z of zones) {
    assert.ok(z.light.x >= z.rect.minX && z.light.x <= z.rect.maxX, `${z.id} light x`);
    assert.ok(z.light.z >= z.rect.minZ && z.light.z <= z.rect.maxZ, `${z.id} light z`);
    assert.equal(z.light.y, ZONE_LIGHT_Y);
    assert.equal(z.light.hue, z.hue);
  }
  // Back-corner rects (floor-plan conversions, Design Notes item 4).
  assert.deepEqual(PINBALL_CORNER.rect, { minX: -9.5, maxX: -5.0, minZ: -6.25, maxZ: -3.9 });
  assert.deepEqual(WORKSHOP.rect, { minX: 5.5, maxX: 9.5, minZ: -6.25, maxZ: -4.0 });
  assert.deepEqual(SNACK_BAR.rect, { minX: 5.5, maxX: 9.5, minZ: 4.5, maxZ: 6.25 });
});

test("roadmap: amber glow-marquee over the front stretches, hues never crossing into Snack Bar or Casual Alley (AC2/AC4)", () => {
  assert.equal(roadmap.hue, GLOW_MARQUEE);
  assert.equal(roadmap.lights.length, 2);
  for (const light of roadmap.lights) {
    assert.equal(light.hue, GLOW_MARQUEE);
    assert.equal(light.y, ZONE_LIGHT_Y);
    // Outside the two front zones so hues do not cross zones.
    for (const zone of [SNACK_BAR, CASUAL_ALLEY] as Zone[]) {
      const inside =
        light.x >= zone.rect.minX && light.x <= zone.rect.maxX &&
        light.z >= zone.rect.minZ && light.z <= zone.rect.maxZ;
      assert.ok(!inside, `roadmap light (${light.x},${light.z}) inside ${zone.id}`);
    }
  }
  const zs = roadmap.lights.map((l) => `${l.x},${l.z}`);
  assert.deepEqual(zs, ["-8.6,3.5", "8.6,2.8"]);
  // Stretched slots are the roadmap ones, and they sit outside the zones.
  for (const id of ROADMAP_STRETCH_SLOTS) {
    const s = slot(id);
    for (const zone of zones) {
      const inside =
        s.center.x >= zone.rect.minX && s.center.x <= zone.rect.maxX &&
        s.center.z >= zone.rect.minZ && s.center.z <= zone.rect.maxZ;
      assert.ok(!inside, `roadmap slot ${id} inside ${zone.id}`);
    }
  }
});

// --- AC5: aisle probes -------------------------------------------------------

// 2D rect helpers (measurement only; production geometry stays in the data).
interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function slotRect(s: WallSlot): Rect {
  const alongX = s.facing.x !== 0;
  const halfAlong = s.footprint.alongWall / 2;
  const halfDepth = s.footprint.depth / 2;
  return {
    minX: alongX ? s.center.x - halfDepth : s.center.x - halfAlong,
    maxX: alongX ? s.center.x + halfDepth : s.center.x + halfAlong,
    minZ: alongX ? s.center.z - halfAlong : s.center.z - halfDepth,
    maxZ: alongX ? s.center.z + halfAlong : s.center.z + halfDepth,
  };
}

function rectGap(a: Rect, b: Rect): number {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
  return Math.hypot(dx, dz);
}

function volRect(v: CollisionVolume): Rect {
  return { minX: v.min.x, maxX: v.max.x, minZ: v.min.z, maxZ: v.max.z };
}

// Distance from the segment (ax,az)->(bx,bz) to a rect (exact: segment to
// rect boundary/interior).
function segRectDist(ax: number, az: number, bx: number, bz: number, r: Rect): number {
  let best = Infinity;
  const edges: [number, number, number, number][] = [
    [r.minX, r.minZ, r.maxX, r.minZ],
    [r.maxX, r.minZ, r.maxX, r.maxZ],
    [r.maxX, r.maxZ, r.minX, r.maxZ],
    [r.minX, r.maxZ, r.minX, r.minZ],
  ];
  const inside = ax >= r.minX && ax <= r.maxX && az >= r.minZ && az <= r.maxZ;
  if (inside) return 0;
  for (const [ex1, ez1, ex2, ez2] of edges) best = Math.min(best, segSeg(ax, az, bx, bz, ex1, ez1, ex2, ez2));
  return best;
}

function segSeg(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): number {
  // point-to-segment distance, measured per side then crossed over
  const pseg = (px: number, pz: number, sx: number, sz: number, tx: number, tz: number): number => {
    const stx = tx - sx;
    const stz = tz - sz;
    const L2 = stx * stx + stz * stz;
    const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - sx) * stx + (pz - sz) * stz) / L2));
    return Math.hypot(px - (sx + stx * t), pz - (sz + stz * t));
  };
  if (segIntersect(ax, az, bx, bz, cx, cz, dx, dz)) return 0;
  return Math.min(pseg(cx, cz, ax, az, bx, bz), pseg(dx, dz, ax, az, bx, bz), pseg(ax, az, cx, cz, dx, dz), pseg(bx, bz, cx, cz, dx, dz));
}

function segIntersect(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): boolean {
  const cross = (ox: number, oz: number, px: number, pz: number, qx: number, qz: number): number =>
    (px - ox) * (qz - oz) - (pz - oz) * (qx - ox);
  const d1 = cross(cx, cz, dx, dz, ax, az);
  const d2 = cross(cx, cz, dx, dz, bx, bz);
  const d3 = cross(ax, az, bx, bz, cx, cz);
  const d4 = cross(ax, az, bx, bz, dx, dz);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

test("aisle probes (AC5): main aisle 17.60m and every corridor depth >= the contract 1.20m; pillar->slot-box >=5.0m (recorded 5.05m); per-slot approach clears every blocker by >=0.70m (authored approach clearance, not the aisle contract)", () => {
  // Main aisle between the opposing side-run slot faces.
  const lFace = slot("L3").center.x + 0.6 / 2;
  const rFace = slot("R3").center.x - 0.6 / 2;
  const mainAisle = rFace - lFace;
  assert.ok(Math.abs(mainAisle - 17.6) < 1e-9, `recorded main aisle ${mainAisle}`);
  assert.ok(mainAisle >= 1.2);

  // Pillar <-> cabinet-box (slot footprint) minimum gap.
  let pillarSlotMin = Infinity;
  for (const pid of ["pillar-1", "pillar-2"]) {
    for (const s of wallSlots) pillarSlotMin = Math.min(pillarSlotMin, rectGap(volRect(vol(pid)), slotRect(s)));
  }
  assert.ok(Math.abs(pillarSlotMin - 5.05) < 1e-9, `recorded pillar->slot min ${pillarSlotMin}`);
  assert.ok(pillarSlotMin >= 5.0);

  // Pillar <-> zone-rect minimum (matrix records 0.75m: pillar-2 vs Casual
  // Alley — a freestanding column vs an empty kept-clean rect, not a
  // circulation pinch).
  let pillarZoneMin = Infinity;
  for (const pid of ["pillar-1", "pillar-2"]) {
    for (const z of zones) pillarZoneMin = Math.min(pillarZoneMin, rectGap(volRect(vol(pid)), z.rect));
  }
  assert.ok(Math.abs(pillarZoneMin - 0.75) < 1e-9, `recorded pillar->zone min ${pillarZoneMin}`);

  // Per-slot approach: from the corridor line (x = +-4.5 at the slot's z for
  // the side runs; z = -1.25 ahead of each back-row face) to the slot face;
  // every blocking volume clears the segment by >= 0.70m.
  for (const s of wallSlots) {
    let cx: number;
    let cz: number;
    let fx: number;
    let fz: number;
    if (s.wall === "back") {
      cx = s.center.x;
      cz = -1.25;
      fx = s.center.x;
      fz = s.center.z + 0.6 / 2;
    } else {
      cx = s.facing.x > 0 ? -4.5 : 4.5;
      cz = s.center.z;
      fx = s.center.x + s.facing.x * (0.6 / 2);
      fz = s.center.z;
    }
    for (const v of collisionVolumes) {
      if (!v.blocksMovement) continue;
      const d = segRectDist(cx, cz, fx, fz, volRect(v));
      assert.ok(d >= 0.7 - EPS, `${s.id} approach vs ${v.id}: ${d}`);
    }
  }
  // And the slot approach point itself clears its own wall by >= 1.20m of
  // circulation in front of the slot (corridor depth beyond the face).
  for (const s of wallSlots) {
    const r = slotRect(s);
    const corridor = s.wall === "back" ? -1.25 : s.facing.x > 0 ? -4.5 : 4.5;
    const depth = s.wall === "back"
      ? corridor - r.maxZ
      : s.facing.x > 0
        ? corridor - r.maxX
        : r.minX - corridor;
    assert.ok(depth >= 1.2, `${s.id} corridor depth ${depth}`);
  }
});

// --- AC6: signage ------------------------------------------------------------

test("exactly one authored text surface: the Welcome Flyer, verbatim string with U+00B7 middots, paper-card stock beside the door gap, cap >= 60mm (AC6)", () => {
  assert.equal(signSurfaces.length, 1);
  const f = signSurfaces[0]!;
  assert.equal(f.id, "welcome-flyer");
  assert.equal(f.kind, "room-sign");
  assert.equal(f.stock, "paper-card");
  assert.equal(f.stockHex, PAPER_CARD);
  // Verbatim control line; U+00B7 built by code point to keep this test ASCII
  // (the source module writes the · as a \u escape, Rule 14).
  const dot = String.fromCharCode(0xb7);
  assert.equal(f.text, `MOVE: W A S D ${dot} LOOK: MOUSE ${dot} DO: E`);
  assert.deepEqual(f.position, { x: 1.15, y: 1.45, z: 6.24 });
  assert.deepEqual(f.facing, { x: 0, z: -1 });
  // Beside the gap measured edge-to-edge: the sheet's near edge clears the
  // door volume's face (centre-only would still allow an overlap).
  assert.ok(f.position.x - f.width / 2 >= vol("door-front").max.x, "beside the door gap (sheet edge clear of the opening)");
  assert.ok(f.capHeight >= 0.06, "room-sign floor: cap >= 60mm");
  assert.equal(f.capHeight, 0.06);
});

test("empty-slot baseplate numbers are authored data (1.4 placement anchor)", () => {
  assert.deepEqual({ ...EMPTY_BASEPLATE }, { alongWall: 0.7, depth: 0.62, raise: 0.02, thickness: 0.05 });
});
