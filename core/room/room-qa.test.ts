// Story 1.3 QA additions: independent probes over the authored room deliverable
// (spec I/O & Edge-Case Matrix), written from the spec rows against the data,
// not from the implement suite's pins. Scope: boundaries the pre-QA suite left
// unobserved or half-observed — the front facade seams (wall segments <-> the
// door plug <-> street-side continuity), street-volume passability through the
// real 1.2 resolver (street-floor never blocks, street-wall bounds the strip,
// the closed door also stops an outside walk), entry-spawn clearance + wiring,
// the fill-scan order re-derived independently from the run membership, roadmap
// stretch membership, the Casual Alley kept-clean law (no slot AND no blocking
// volume inside), the aisle minima, and the sampled sightlines over the
// pillar-kind occluder subset with a test-local slab clip (Epic 2 owns the
// production raycast — AD-7). Hermetic: every test constructs its own
// controller/fakes; no shared state, no run order.
import test from "node:test";
import assert from "node:assert/strict";
import { createPlayerController, PLAYER_RADIUS } from "../player.ts";
import type { DeviceView } from "../input/index.ts";
import {
  ENTRY_SPAWN,
  INTERIOR,
  WALL_T,
  collisionVolumes,
  type CollisionVolume,
} from "./collision-volumes.ts";
import { ROADMAP_STRETCH_SLOTS, WALL_SLOT_REVISION, wallSlots, type WallSlot } from "./slot-config.ts";
import { cabinetPlacements } from "./cabinets.ts";
import { CASUAL_ALLEY, roadmap, zones } from "./zones.ts";
import { paintFlyer, type PaintContext, type PaintSurface } from "./surfaces.ts";
import { WELCOME_FLYER } from "./signage.ts";
import { CARD_INK, PAPER_CARD, toCss } from "./tokens.ts";

const EPS = 1e-9;

function vol(id: string): CollisionVolume {
  const v = collisionVolumes.find((c) => c.id === id);
  assert.ok(v, `authored volume "${id}" must exist`);
  return v;
}

function view(axes: [number, number] = [0, 0]): DeviceView {
  return {
    axes: { forward: axes[0]!, strafe: axes[1]! },
    aim: { dx: 0, dy: 0 },
    interact: { down: false, pressed: false },
  };
}

function stepN(n: number, v: DeviceView, p = createPlayerController(collisionVolumes, ENTRY_SPAWN)) {
  for (let i = 0; i < n; i++) p.step(1, v);
  return p;
}

// --- Matrix row "Door + street side": facade seams, read off the data ------

test("facade seams: the two front-wall segments plug the door exactly, and the street strip is bounded by its wall (matrix 'Door + street side')", () => {
  const door = vol("door-front");
  // No hole and no double-plug: left segment face == door face, door face ==
  // right segment face; the union covers the full front span continuously.
  assert.equal(vol("wall-front-left").max.x, door.min.x, "left segment meets the door at -0.5");
  assert.equal(door.max.x, vol("wall-front-right").min.x, "the door meets the right segment at +0.5");
  const leftOuter = vol("wall-front-left").min.x;
  const rightOuter = vol("wall-front-right").max.x;
  assert.equal(leftOuter, -(INTERIOR.width / 2 + WALL_T));
  assert.equal(rightOuter, INTERIOR.width / 2 + WALL_T);
  // Street strip: floor and far wall share exactly one seam (the strip ends
  // where the wall begins; nothing walks off the map past it).
  assert.equal(vol("street-floor").max.z, vol("street-wall").min.z, "street-floor ends at street-wall");
  assert.equal(vol("street-floor").blocksMovement, false, "street-floor is passable data");
  assert.equal(vol("street-wall").blocksMovement, true, "street-wall bounds the strip");
});

// --- Matrix row "Real consumer": entry spawn wiring + the door/street walks -

test("entry spawn: inside the envelope, clear of every blocker by more than the player radius, yaw 0 faces the room, and walking W from it moves into the room", () => {
  const p = createPlayerController(collisionVolumes, ENTRY_SPAWN); // exactly main.ts's wiring
  assert.deepEqual({ x: p.state.x, z: p.state.z, yaw: p.state.yaw }, { ...ENTRY_SPAWN });
  assert.ok(
    Math.abs(ENTRY_SPAWN.x) < INTERIOR.width / 2 && ENTRY_SPAWN.z < INTERIOR.depth / 2,
    "inside the interior envelope",
  );
  for (const v of collisionVolumes) {
    if (!v.blocksMovement) continue;
    const dx = Math.max(v.min.x - ENTRY_SPAWN.x, ENTRY_SPAWN.x - v.max.x, 0);
    const dz = Math.max(v.min.z - ENTRY_SPAWN.z, ENTRY_SPAWN.z - v.max.z, 0);
    assert.ok(Math.hypot(dx, dz) > PLAYER_RADIUS, `${v.id} must clear the spawn by more than the radius`);
  }
  const walked = stepN(60, view([1, 0])); // W: -Z toward the back wall
  assert.ok(walked.state.z < ENTRY_SPAWN.z - 1.0, "yaw 0 faces the room (W walks in, not into the street)");
});

// Story 2.4 moved pin (was: "closed door from inside AND from outside...
// never through" — both faces pressed the player at door-front's faces).
// The walk-out exit supersedes that law: the gap is passable BOTH ways;
// what bounds a visitor now is street-wall outward and the room's own
// blockers inward. The walk probe proves the DATA flip on the real
// resolver, from both sides.
test("walk-out door from inside AND from outside: the real resolver carries the visitor through the 1.0m gap both ways — street-wall bounds the outward walk, the room's back wall bounds the return (Story 2.4; 1.x pinned the opposite)", () => {
  const door = vol("door-front");
  const inside = stepN(100, view([-1, 0])); // S from the entry spawn: +Z through the gap
  assert.ok(inside.state.z > door.max.z, `walked through: z=${inside.state.z} > ${door.max.z}`);
  assert.equal(inside.state.x, ENTRY_SPAWN.x, "the gap is centred on the spawn: no lateral drift");
  stepN(300, view([-1, 0]), inside); // keep walking: the strip ends at street-wall
  assert.equal(inside.state.z, vol("street-wall").min.z - PLAYER_RADIUS, "outward walk bounded by street-wall, not the door");

  const outside = createPlayerController(collisionVolumes, { x: 0, z: 7.0 });
  stepN(60, view([1, 0]), outside); // W: -Z through the street face into the room
  assert.ok(outside.state.z < door.min.z, `walked back in: z=${outside.state.z} < ${door.min.z}`);
  stepN(600, view([1, 0]), outside); // all the way up the main aisle (x=0 is pillar- and cabinet-clear)
  assert.equal(outside.state.z, vol("wall-back").max.z + PLAYER_RADIUS, "inward walk bounded by the room, not the door");
});

test("street passability: street-floor never blocks (walk its full depth, cross it sideways), while street-wall bounds the strip (matrix 'Door + street side')", () => {
  const p = createPlayerController(collisionVolumes, { x: 0, z: 7.0 }); // street-floor interior
  for (let i = 0; i < 60; i++) p.step(1, view([0, 1])); // strafe +X across the strip
  assert.ok(Math.abs(p.state.x - 1.4) < 1e-9, `x=${p.state.x} (one metre at walk speed, unblocked)`);
  assert.equal(p.state.z, 7.0, "the floor slab never blocks on the other axis");
  const q = createPlayerController(collisionVolumes, { x: 0, z: 7.0 });
  for (let i = 0; i < 100; i++) q.step(1, view([-1, 0])); // S: +Z to the far wall
  assert.ok(Math.abs(q.state.z - (vol("street-wall").min.z - PLAYER_RADIUS)) < EPS, `bounded stop z=${q.state.z}`);
});

// --- Matrix row "Slot config": independent re-derivation --------------------

test("fill-scan order re-derived from the runs (back row left->right, then side runs back->front alternating L/R with the exhausted side skipped)", () => {
  assert.equal(WALL_SLOT_REVISION, "wallslots-r1-2026-11-21");
  assert.equal(wallSlots.length, 20);
  assert.equal(new Set(wallSlots.map((s) => s.id)).size, 20, "ids unique");
  const back = wallSlots.filter((s) => s.wall === "back").sort((a, b) => a.center.x - b.center.x).map((s) => s.id);
  const left = wallSlots.filter((s) => s.wall === "left").sort((a, b) => a.center.z - b.center.z).map((s) => s.id);
  const right = wallSlots.filter((s) => s.wall === "right").sort((a, b) => a.center.z - b.center.z).map((s) => s.id);
  assert.equal(back.length, 7);
  assert.equal(left.length, 7);
  assert.equal(right.length, 6);
  // The scan order the spec states, derived from run membership rather than
  // copied as a literal: B0..B6, then alternate L/R skipping the exhausted run.
  const expected = [...back];
  for (let k = 0; k < left.length; k++) {
    if (k < left.length) expected.push(left[k]!);
    if (k < right.length) expected.push(right[k]!);
  }
  const actual = [...wallSlots].sort((a, b) => a.index - b.index).map((s) => s.id);
  assert.deepEqual(actual, expected, "index order matches the authored scan sequence");
});

test("roadmap stretch membership: exactly the front stretches of both side runs, and the amber lights sit at the matrix-stated overhead positions", () => {
  assert.deepEqual(new Set(ROADMAP_STRETCH_SLOTS), new Set(["L4", "L5", "L6", "R3", "R4", "R5"]));
  assert.equal(ROADMAP_STRETCH_SLOTS.length, 6);
  for (const id of ROADMAP_STRETCH_SLOTS) {
    const s = wallSlots.find((w) => w.id === id);
    assert.ok(s, `stretch slot ${id} exists`);
    assert.notEqual(s.wall, "back", "the roadmap stretches are the SIDE runs, not the back row");
    assert.ok(s.center.z > 0, `stretch slot ${id} is in the front half`);
  }
  assert.deepEqual(
    roadmap.lights.map((l) => [l.x, l.z]),
    [
      [-8.6, 3.5],
      [8.6, 2.8],
    ],
    "amber lights over the front stretches (matrix 'Zones + hues')",
  );
  for (const light of roadmap.lights) {
    for (const zone of [CASUAL_ALLEY, ...zones.filter((z) => z.id === "snack-bar")]) {
      const inside =
        light.x >= zone.rect.minX && light.x <= zone.rect.maxX &&
        light.z >= zone.rect.minZ && light.z <= zone.rect.maxZ;
      assert.ok(!inside, `roadmap light (${light.x},${light.z}) must stay outside ${zone.id}`);
    }
  }
});

// --- Matrix rows "Zones + hues" / "Slot config": Casual Alley kept clean ----

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

function overlaps(a: Rect, b: Rect): boolean {
  return a.maxX > b.minX && a.minX < b.maxX && a.maxZ > b.minZ && a.minZ < b.maxZ;
}

function volRect(v: CollisionVolume): Rect {
  return { minX: v.min.x, maxX: v.max.x, minZ: v.min.z, maxZ: v.max.z };
}

test("Casual Alley kept-clean law holds BOTH ways: no slot footprint and no blocking volume lies inside the rect (matrix 'Zones + hues', AC4)", () => {
  const alley = CASUAL_ALLEY.rect;
  assert.ok(alley.minX > -INTERIOR.width / 2 && alley.maxX < INTERIOR.width / 2, "rect inside the envelope");
  assert.ok(alley.minZ > -INTERIOR.depth / 2 && alley.maxZ < INTERIOR.depth / 2, "rect inside the envelope");
  for (const s of wallSlots) {
    assert.ok(!overlaps(slotRect(s), alley), `slot ${s.id} must not stand in Casual Alley`);
  }
  for (const v of collisionVolumes) {
    if (!v.blocksMovement) continue;
    assert.ok(!overlaps(volRect(v), alley), `${v.id} must not block inside Casual Alley`);
  }
});

// --- Matrix row "Aisle measurement": probes against contract minima ---------

function segSegDist(
  ax: number, az: number, bx: number, bz: number,
  cx: number, cz: number, dx: number, dz: number,
): number {
  const cross = (ox: number, oz: number, px: number, pz: number, qx: number, qz: number): number =>
    (px - ox) * (qz - oz) - (pz - oz) * (qx - ox);
  const d1 = cross(cx, cz, dx, dz, ax, az);
  const d2 = cross(cx, cz, dx, dz, bx, bz);
  const d3 = cross(ax, az, bx, bz, cx, cz);
  const d4 = cross(ax, az, bx, bz, dx, dz);
  if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)) return 0;
  const pseg = (px: number, pz: number, sx: number, sz: number, tx: number, tz: number): number => {
    const stx = tx - sx;
    const stz = tz - sz;
    const L2 = stx * stx + stz * stz;
    const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - sx) * stx + (pz - sz) * stz) / L2));
    return Math.hypot(px - (sx + stx * t), pz - (sz + stz * t));
  };
  return Math.min(
    pseg(cx, cz, ax, az, bx, bz),
    pseg(dx, dz, ax, az, bx, bz),
    pseg(ax, az, cx, cz, dx, dz),
    pseg(bx, bz, cx, cz, dx, dz),
  );
}

function segRectDist(ax: number, az: number, bx: number, bz: number, r: Rect): number {
  const inside = ax >= r.minX && ax <= r.maxX && az >= r.minZ && az <= r.maxZ;
  if (inside) return 0;
  const edges: [number, number, number, number][] = [
    [r.minX, r.minZ, r.maxX, r.minZ],
    [r.maxX, r.minZ, r.maxX, r.maxZ],
    [r.maxX, r.maxZ, r.minX, r.maxZ],
    [r.minX, r.maxZ, r.minX, r.minZ],
  ];
  let best = Infinity;
  for (const [ex1, ez1, ex2, ez2] of edges) best = Math.min(best, segSegDist(ax, az, bx, bz, ex1, ez1, ex2, ez2));
  return best;
}

function rectGap(a: Rect, b: Rect): number {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
  return Math.hypot(dx, dz);
}

test("aisle probes: main aisle and corridor depths clear the 1.20m contract, pillar->cabinet-box stays >=5m, and every per-slot approach clears EVERY blocker by >=0.70m (values recorded)", () => {
  // Main aisle between opposing side-run faces (matrix: 17.60m).
  const lFace = wallSlots.find((s) => s.id === "L3")!.center.x + 0.6 / 2;
  const rFace = wallSlots.find((s) => s.id === "R3")!.center.x - 0.6 / 2;
  assert.ok(rFace - lFace >= 1.2, `main aisle ${rFace - lFace} >= the 1.20m circulation contract`);

  // Pillar <-> slot-box (cabinet footprint) minimum (matrix: 5.05m recorded).
  let pillarSlotMin = Infinity;
  for (const pid of ["pillar-1", "pillar-2"]) {
    for (const s of wallSlots) pillarSlotMin = Math.min(pillarSlotMin, rectGap(volRect(vol(pid)), slotRect(s)));
  }
  assert.ok(pillarSlotMin >= 5.0, `recorded pillar->slot min ${pillarSlotMin} >= 5.0m`);

  // Per-slot approach: corridor point -> slot face, clearing every blocker.
  // 1.4 twist: on a filled slot the shell IS the face, so the segment ends
  // at the visitor's standing point 0.8m (inference — arm's reach off the
  // face) in front of it and the shell itself joins the probe like every
  // other blocker (no skip).
  for (const s of wallSlots) {
    let faceX = s.center.x + s.facing.x * (s.footprint.depth / 2);
    let faceZ = s.center.z + s.facing.z * (s.footprint.depth / 2);
    if (cabinetPlacements.some((p) => p.slotId === s.id)) {
      faceX += s.facing.x * 0.8;
      faceZ += s.facing.z * 0.8;
    }
    const corridorX = s.wall === "back" ? s.center.x : s.facing.x > 0 ? -4.5 : 4.5;
    const corridorZ = s.wall === "back" ? -1.25 : s.center.z;
    for (const v of collisionVolumes) {
      if (!v.blocksMovement) continue;
      const d = segRectDist(corridorX, corridorZ, faceX, faceZ, volRect(v));
      assert.ok(d >= 0.7 - EPS, `${s.id} approach vs ${v.id}: ${d} must be >= 0.70m`);
    }
  }
});

// --- Matrix rows "Sampled sightline left/right" + "Roadmap visible from entry"

interface RectXZ {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function segHitsRect(ax: number, az: number, bx: number, bz: number, r: RectXZ): boolean {
  const p = [bx - ax, bz - az];
  const a = [ax, az];
  const mn = [r.minX, r.minZ];
  const mx = [r.maxX, r.maxZ];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 2; i++) {
    if (Math.abs(p[i]!) < 1e-12) {
      if (a[i]! < mn[i]! || a[i]! > mx[i]!) return false;
      continue;
    }
    let ta = (mn[i]! - a[i]!) / p[i]!;
    let tb = (mx[i]! - a[i]!) / p[i]!;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

function occludersHit(ax: number, az: number, bx: number, bz: number): string[] {
  return collisionVolumes
    .filter((v) => v.kind === "pillar")
    .filter((v) => segHitsRect(ax, az, bx, bz, volRect(v)))
    .map((v) => v.id);
}

function center(id: string): { x: number; z: number } {
  const s = wallSlots.find((w) => w.id === id);
  assert.ok(s, `slot "${id}" must exist`);
  return s.center;
}

test("sampled sightlines from the entry spawn: backmost side slots break on exactly one pillar each, frontmost stretches break on nothing (matrix 'Sampled sightline' + 'Roadmap visible')", () => {
  const l0 = center("L0");
  const r0 = center("R0");
  assert.deepEqual(occludersHit(ENTRY_SPAWN.x, ENTRY_SPAWN.z, l0.x, l0.z), ["pillar-1"]);
  assert.deepEqual(occludersHit(ENTRY_SPAWN.x, ENTRY_SPAWN.z, r0.x, r0.z), ["pillar-2"]);
  const l6 = center("L6");
  const r5 = center("R5");
  assert.deepEqual(occludersHit(ENTRY_SPAWN.x, ENTRY_SPAWN.z, l6.x, l6.z), [], "roadmap stretch L6 visible");
  assert.deepEqual(occludersHit(ENTRY_SPAWN.x, ENTRY_SPAWN.z, r5.x, r5.z), [], "roadmap stretch R5 visible");
  // 1.4: the stand-up shells joined the ONE list — the roadmap stretch
  // sightlines from the entry spawn must read clear of THEM too. A shell
  // is not an authored occluder this story (Epic 2 decides that set), but
  // a cabinet blocking the doorway roadmap view would be a layout defect.
  for (const v of collisionVolumes.filter((c) => c.kind === "cabinet")) {
    assert.ok(!segHitsRect(ENTRY_SPAWN.x, ENTRY_SPAWN.z, l6.x, l6.z, volRect(v)), `${v.id} must not block spawn->L6`);
    assert.ok(!segHitsRect(ENTRY_SPAWN.x, ENTRY_SPAWN.z, r5.x, r5.z, volRect(v)), `${v.id} must not block spawn->R5`);
  }
  // The occluder subset is the pillar-kind entries of the ONE list Epic 2 will
  // raycast — and every occluder blocks movement too ("what blocks the ear
  // blocks the eye", AD-7).
  for (const v of collisionVolumes.filter((c) => c.kind === "pillar")) {
    assert.equal(v.blocksMovement, true, `${v.id} occludes sight AND blocks movement`);
  }
});

// --- Matrix row "Welcome Flyer": the painter prints ONLY what is injected ---

test("paintFlyer prints only the injected string, split on the middot separator - it invents no copy and touches no other canvas (Rule 14 sentinel probe)", () => {
  const texts: string[] = [];
  const styles: string[] = [];
  let canvases = 0;
  const ctx: PaintContext = {
    fillStyle: "",
    font: "",
    textAlign: "",
    fillRect() {
      styles.push(ctx.fillStyle);
    },
    fillText(text) {
      texts.push(text);
      styles.push(ctx.fillStyle);
    },
    // Deterministic generous per-character estimate (0.92em of the set
    // font) - the same fake-metric family as surfaces.test.ts (rework pass 1).
    measureText(text) {
      const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
      if (!m) throw new Error("fake measureText: font string carries no px size");
      return { width: text.length * 0.92 * Number(m[1]) };
    },
  };
  const factory = (width: number, height: number): PaintSurface => {
    canvases += 1;
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  const DOT = String.fromCharCode(0xb7);
  const sentinel = `ALPHA ${DOT} BETA ${DOT} GAMMA`;
  paintFlyer(factory, sentinel, toCss(PAPER_CARD), toCss(CARD_INK), 0.06, WELCOME_FLYER.width, WELCOME_FLYER.height);
  assert.equal(canvases, 1, "the painter takes exactly one canvas from the factory");
  assert.deepEqual(texts, ["ALPHA", "BETA", "GAMMA"], "printed lines = the injected string split on ' middot ' - nothing else");
  assert.deepEqual(new Set(styles), new Set([toCss(PAPER_CARD), toCss(CARD_INK)]), "only the two injected colours are ever used");
});
