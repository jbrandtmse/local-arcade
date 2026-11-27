// Story 2.1 (AC: single-ray occlusion over the ONE volume list): pins
// re-derived from the authored data itself (the one volume list, Wall Slot
// geometry, street/spawn anchors) — no retyped coordinates. Per Design
// Notes this suite re-derives segment-vs-AABB expectations on its own and
// never imports the Story 1.3 sibling helper (unification lands at 3.7).
import test from "node:test";
import assert from "node:assert/strict";
import { ENTRY_SPAWN, WALL_TOP, collisionVolumes } from "../room/collision-volumes.ts";
import { ENTRY_STREET_VIEW } from "../entry.ts";
import { EYE_HEIGHT } from "../player.ts";
import { placementGeometry } from "../room/cabinets.ts";
import { DEADBAND_M, OCCLUDER_KINDS, occlusionIds, type RayPoint } from "./occlusion.ts";

// Test-local probe height: the ray endpoints need SOME y inside the wall
// extent; the exact speaker height is the manager's concern, pinned there.
const PROBE_Y = 1.5;

function volumeById(id: string): (typeof collisionVolumes)[number] {
  const v = collisionVolumes.find((x) => x.id === id);
  assert.ok(v !== undefined, `authored volume ${id} exists`);
  return v;
}

function centerOf(id: string): RayPoint {
  const v = volumeById(id);
  return { x: (v.min.x + v.max.x) / 2, y: (v.min.y + v.max.y) / 2, z: (v.min.z + v.max.z) / 2 };
}

test("the occluder kind set is wall + pillar + door \u2014 cabinet and street never occlude", () => {
  assert.deepEqual([...OCCLUDER_KINDS], ["wall", "pillar", "door"]);

  // cabinet-B0 sits on the spawn -> B0 speaker segment: an unfiltered
  // clip would report it; the kind filter must not.
  const b0 = placementGeometry("B0").center;
  const cabinetVolume = volumeById("cabinet-B0");
  assert.equal(cabinetVolume.kind, "cabinet");
  assert.deepEqual(occlusionIds({ x: ENTRY_SPAWN.x, y: PROBE_Y, z: ENTRY_SPAWN.z }, { x: b0.x, y: PROBE_Y, z: b0.z }), []);
  // fed the cabinet volume directly: still filtered out by kind.
  assert.deepEqual(
    occlusionIds({ x: b0.x, y: PROBE_Y, z: b0.z - 3 }, { x: b0.x, y: PROBE_Y, z: b0.z + 3 }, [cabinetVolume]),
    [],
  );
  // same law for every authored street volume:
  const streetVolumes = collisionVolumes.filter((v) => v.kind === "street");
  assert.ok(streetVolumes.length > 0, "the authored list carries street volumes");
  for (const v of streetVolumes) {
    assert.deepEqual(occlusionIds({ x: v.min.x - 1, y: PROBE_Y, z: v.min.z - 1 }, { x: v.max.x + 1, y: PROBE_Y, z: v.max.z + 1 }, [v]), []);
  }
});

test("a listener behind a pillar hears it: the ray along the pillar->B0 axis breaks on exactly pillar-1", () => {
  // Authored mirror of the 1.3 sampled-sightline law: sit on the line
  // through pillar-1's centre and the B0 speaker, pushed behind the
  // pillar — the segment crosses pillar-1 dead centre and nothing else.
  const b0 = placementGeometry("B0").center;
  const p1 = centerOf("pillar-1");
  const behind: RayPoint = {
    x: p1.x + (p1.x - b0.x) * 0.25,
    y: PROBE_Y,
    z: p1.z + (p1.z - b0.z) * 0.25,
  };
  assert.deepEqual(occlusionIds(behind, { x: b0.x, y: PROBE_Y, z: b0.z }), ["pillar-1"]);
});

test("hits are ordered by entry distance, nearest first", () => {
  // From the street, straight INTO pillar-1's centre: the front wall
  // segment crosses first, the pillar second.
  const p1 = centerOf("pillar-1");
  const outside: RayPoint = { x: p1.x, y: PROBE_Y, z: p1.z + 6 };
  assert.deepEqual(occlusionIds(outside, p1), ["wall-front-left", "pillar-1"]);
});

test("dead-band: a ray grazing a face boundary within DEADBAND_M reads clear", () => {
  // A vertical-plane ray at x just inside pillar-2's UNSHRUNK slab but
  // outside the dead-band-shrunk one (inside margin = half the dead-band)
  // must miss — the spatial half of the no-flap law. At DEADBAND_M = 0 the
  // coordinate lands on the slab edge, the parallel-inside rule fires,
  // and this pin goes red.
  const p2 = volumeById("pillar-2");
  const grazeX = p2.min.x + DEADBAND_M / 2;
  assert.ok(grazeX >= p2.min.x && grazeX < p2.min.x + DEADBAND_M);
  assert.deepEqual(
    occlusionIds({ x: grazeX, y: PROBE_Y, z: p2.min.z - 2 }, { x: grazeX, y: PROBE_Y, z: p2.max.z + 2 }),
    [],
  );
});

test("dead-band invariant: every authored occluder stays fat under the shrink (the general clamp is 3.7's pass; this pin catches the drift NOW)", () => {
  // segEntryT shrinks EVERY axis by DEADBAND_M on each side: a volume
  // whose authored extent is thinner than 2x DEADBAND_M on any axis would
  // have its slab inverted (min > max) and silently stop occluding. The
  // thinnest authored leg is the door's z-depth: raising DEADBAND_M past
  // half of it reds this pin naming the volume (mutation: 0.05 -> 0.07;
  // 0.06 floats a hair past the door's 0.120 extent and squeaks through).
  for (const v of collisionVolumes) {
    if (!OCCLUDER_KINDS.includes(v.kind)) continue;
    const legs = [
      ["x", v.max.x - v.min.x],
      ["y", v.max.y - v.min.y],
      ["z", v.max.z - v.min.z],
    ] as const;
    for (const [axis, extent] of legs) {
      assert.ok(
        2 * DEADBAND_M < extent,
        `${v.id}: ${axis} extent ${String(extent)} must stay strictly wider than 2x DEADBAND_M (${String(2 * DEADBAND_M)}) or the shrunk slab inverts`,
      );
    }
  }
});

test("Y is a full clip axis: a ray over the top of a pillar clears it", () => {
  // Centred on pillar-2 in x/z but 1cm under WALL_TOP — above the shrunk
  // box's top. Removing the Y slab (2D-only clip) or the dead-band shrunk
  // extent both turn this pin red.
  const p2 = centerOf("pillar-2");
  const overTop: RayPoint = { x: p2.x, y: WALL_TOP - 0.01, z: p2.z - 2 };
  assert.deepEqual(
    occlusionIds(overTop, { x: p2.x, y: WALL_TOP - 0.01, z: p2.z + 2 }),
    [],
  );
});

test("the closed front door occludes the street listener: exactly door-front on the street->B0 sight", () => {
  // ENTRY_STREET_VIEW is where the entry beat stands before control: the
  // attract must already be muffled there, and ONLY by the door panel
  // (the wall segments miss, the pillars miss).
  const b0 = placementGeometry("B0").center;
  const street: RayPoint = { x: ENTRY_STREET_VIEW.x, y: EYE_HEIGHT, z: ENTRY_STREET_VIEW.z };
  assert.deepEqual(occlusionIds(street, { x: b0.x, y: PROBE_Y, z: b0.z }), ["door-front"]);
});
