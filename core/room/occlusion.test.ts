// Story 1.3 (AC3, CAP-2 seed): the sampled-sightline pins over the SINGLE
// volume list — the same AABBs Epic 2's audio raycasts will ride (AD-7:
// "what blocks the ear blocks the eye"). Test-local 2D segment-vs-AABB
// (XZ-plane slab clip): the Audio Manager's real raycaster lands in Epic 2;
// what this story pins is that the authored geometry produces the designed
// occlusion — each door->backmost-side-slot sightline breaks on exactly one
// pillar, and both door->frontmost-slot roadmap sightlines stay unobstructed
// from the entry spawn. Endpoints come from the authored data itself
// (ENTRY_SPAWN, Wall Slot centres), never retyped coordinates.
import test from "node:test";
import assert from "node:assert/strict";
import { ENTRY_SPAWN, collisionVolumes } from "./collision-volumes.ts";
import { wallSlots } from "./slot-config.ts";

interface RectXZ {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Slab-clipped segment vs axis-aligned rect; a segment lying parallel to a
// slab AND inside it on that axis stays a candidate (never an early miss),
// which is the case the naive divide-by-zero version gets wrong.
function segHitsRect(ax: number, az: number, bx: number, bz: number, r: RectXZ): boolean {
  const p = [bx - ax, bz - az];
  const a = [ax, az];
  const mn = [r.minX, r.minZ];
  const mx = [r.maxX, r.maxZ];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 2; i++) {
    if (Math.abs(p[i]!) < 1e-12) {
      if (a[i]! < mn[i]! || a[i]! > mx[i]!) return false; // parallel and outside this slab
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

// The occluder set this story designed: the kind-pillar entries of the one
// list. Sampling those (not every current blocker) keeps the pins about the
// authored pillar geometry — when 1.4's shells enter the list at the slot
// centres these segments end on, only real occlusion design changes can
// move them. Epic 2's Audio Manager widens the set itself, on its own pins.
function blockers(): { id: string; rect: RectXZ }[] {
  return collisionVolumes
    .filter((v) => v.kind === "pillar")
    .map((v) => ({ id: v.id, rect: { minX: v.min.x, maxX: v.max.x, minZ: v.min.z, maxZ: v.max.z } }));
}

function blockedBy(ax: number, az: number, bx: number, bz: number): string[] {
  return blockers().filter((b) => segHitsRect(ax, az, bx, bz, b.rect)).map((b) => b.id);
}

function slotCenter(id: string): { x: number; z: number } {
  const s = wallSlots.find((c) => c.id === id);
  assert.ok(s, `slot "${id}" must exist to sample its sightline`);
  return s.center;
}

test("authored occluder set: the kind-pillar entries of the one collision list, ids pillar-1/pillar-2 (AC3)", () => {
  assert.deepEqual(
    collisionVolumes.filter((v) => v.kind === "pillar").map((v) => v.id),
    ["pillar-1", "pillar-2"],
  );
});

test("sampled sightline spawn->L0 breaks on exactly pillar-1; spawn->R0 on exactly pillar-2 (AC3, CAP-2 geometry authored by measurement)", () => {
  const l0 = slotCenter("L0"); // (-9.1, -3.5): the ray runs along the diagonal through pillar-1's centre
  assert.deepEqual(blockedBy(ENTRY_SPAWN.x, ENTRY_SPAWN.z, l0.x, l0.z), ["pillar-1"]);
  const r0 = slotCenter("R0");
  assert.deepEqual(blockedBy(ENTRY_SPAWN.x, ENTRY_SPAWN.z, r0.x, r0.z), ["pillar-2"]);
});

test("roadmap sightlines stay clear: spawn->L6 and spawn->R5 hit no occluder pillar at all (AC3, the CAP-2 success: the unfilled front stretches read from the door)", () => {
  const l6 = slotCenter("L6");
  const r5 = slotCenter("R5");
  assert.deepEqual(blockedBy(ENTRY_SPAWN.x, ENTRY_SPAWN.z, l6.x, l6.z), []);
  assert.deepEqual(blockedBy(ENTRY_SPAWN.x, ENTRY_SPAWN.z, r5.x, r5.z), []);
});

test("the ray helper itself: parallel-inside stays a hit, parallel-outside misses (helper trust \u2014 the divide-by-zero case)", () => {
  const r: RectXZ = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
  assert.equal(segHitsRect(0.5, -1, 0.5, 2, r), true, // parallel to X slabs, inside them, crossing Z
  );
  assert.equal(segHitsRect(2, -1, 2, 2, r), false, // parallel and outside on X
  );
});
