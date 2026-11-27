// Story 2.2 (AD-7/AD-27): the channel budget as a pure tick function —
// literal pins for every I/O-matrix row. Every awake leg is separately
// discriminated (a target that wakes ONLY on the seated leg, ONLY on the
// near leg, ONLY on the frustum cone), the cull and the nearest-N cut are
// literal, the inBudget ⊆ awake interlock is read over a mixed room, and
// the whole decision is pinned as a determinism twin. Numbers are the
// shipped placeholders — 3.7's finals move the constants and these pins
// move with them by construction where they reference the symbol, by
// literal where they pin the shipped value (mutation notes inline).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { math } from "../contract/index.ts";
import { INTERIOR } from "../room/collision-volumes.ts";
import {
  AWAKE_FRUSTUM_COS_MIN,
  CULL_RADIUS_M,
  NEAR_RADIUS_M,
  NEAREST_N,
  computeBudget,
  type BudgetListener,
  type BudgetTarget,
} from "./budget.ts";

// The default ear for the pins: the movement-plane origin looking down -Z
// (player.ts's yaw-0 convention).
const AT_ORIGIN_FACING_BACK: BudgetListener = { x: 0, z: 0, yaw: 0 };

const REPO = path.resolve(import.meta.dirname, "..", "..");

function target(volumeId: string, x: number, z: number, visitorOccupied = false): BudgetTarget {
  return { volumeId, x, z, visitorOccupied };
}

test("the budget constants are authored placeholders, pinned literally (3.7 owns the finals; AD-27 Deferred row)", () => {
  assert.equal(NEAR_RADIUS_M, 6, "near-radius leg, metres");
  assert.equal(AWAKE_FRUSTUM_COS_MIN, 0.5, "frustum cone cosine threshold (~\u00b160\u00b0 half-angle)");
  assert.equal(CULL_RADIUS_M, 25, "distance-cull radius, metres");
  assert.equal(NEAREST_N, 4, "nearest-N inside the awake set");
  // Design Notes 5: the shipped cull sits past the room's diagonal, so
  // "tuned in" ships as the FOCUS_DUCK floor, not as budget silence, in
  // today's one-Cabinet room (the no-cull-today manager pin rides this).
  const diagonal = Math.sqrt(INTERIOR.width * INTERIOR.width + INTERIOR.depth * INTERIOR.depth);
  assert.ok(CULL_RADIUS_M > diagonal, "CULL_RADIUS_M exceeds the ~22.7 m room diagonal: nothing in today's room is budget-silent");
});

test("seated beyond the near radius stays awake (leg discriminated) \u2014 and the same empty spot never wakes", () => {
  const decision = computeBudget(AT_ORIGIN_FACING_BACK, [
    target("cabinet-seated-behind", 0, 10, true), // dist 10 > NEAR, cos -1 < cone, but a visitor sits
    target("cabinet-empty-behind", 0, 10, false), // identical geometry, nobody sits
  ]);
  assert.deepEqual(decision.awakeIds, ["cabinet-seated-behind"], "exactly the seated leg wakes it (mutation: drop the visitorOccupied leg \u2014 red here)");
  assert.deepEqual(decision.inBudgetIds, ["cabinet-seated-behind"], "and it keeps a budget slot: audible \u21d2 awake holds with room to spare");
});

test("near-radius leg boundary, from both sides (inclusive inside)", () => {
  // Behind the listener, so ONLY the near leg can wake these.
  const decision = computeBudget(AT_ORIGIN_FACING_BACK, [
    target("cabinet-on-edge", 0, NEAR_RADIUS_M, false), // dist === NEAR exactly (axis-aligned: exact FP)
    target("cabinet-outside", 0, NEAR_RADIUS_M + 0.5, false),
  ]);
  assert.deepEqual(decision.awakeIds, ["cabinet-on-edge"], "at the radius: awake; half a metre past: asleep (mutation: strict < instead of <= reds the on-edge leg)");
});

test("frustum leg in/out from the authored facing basis (yaw 0 looks -Z; no camera/aspect input)", () => {
  const decision = computeBudget(AT_ORIGIN_FACING_BACK, [
    target("cabinet-cone-in", 6, -8), // dist 10 > NEAR; cos = 8/10 = 0.8 >= 0.5
    target("cabinet-cone-out-behind", 6, 8), // cos = -0.8
    target("cabinet-cone-out-wide", 9, -4), // ahead but wide: cos = 4/sqrt(97) ~= 0.406 < 0.5
  ]);
  assert.deepEqual(decision.awakeIds, ["cabinet-cone-in"], "only the in-cone chain wakes (mutation: AWAKE_FRUSTUM_COS_MIN -> 0 wakes the wide one \u2014 red here; a bare forward test (cos > 0) also wakes it)");
  // The facing basis actually rides yaw: turn 90 deg left (yaw +pi/2 faces
  // -X) and the -Z cone leg flips legs.
  const turned = computeBudget({ x: 0, z: 0, yaw: math.PI / 2 }, [
    target("cabinet-left-in", -6, -8), // now in-cone (cos ~ 0.6)
    target("cabinet-ahead-out", 0, -10), // straight -Z: dead-ahead of the OLD facing, out of the turned cone
  ]);
  assert.deepEqual(turned.awakeIds, ["cabinet-left-in"], "yaw feeds the cone (mutation: ignore yaw \u2014 red here)");
});

// Code review (Story 2.2 pass 2): the Code Map prescribes budget.ts's
// facing basis as a MIRROR of player.ts's — the basis is a closure inside
// the controller (player.ts:96), not an export, so the two sites cannot
// share code. Without a cross-check the mirror drifts silently in the
// shipped room: every cone pin above exercises budget.ts's OWN basis, so
// a sign flip on either side stays green at the unit tier and only the
// real room would notice. Pin both source forms (the AD-3 readdir pin's
// source-text tier).
test("the facing-basis mirror is pinned at the source level: budget.ts's fx/fz carry player.ts's signs (yaw 0 -> -Z both sides)", () => {
  const player = readFileSync(path.join(REPO, "core", "player.ts"), "utf8");
  const budget = readFileSync(path.join(REPO, "core", "audio", "budget.ts"), "utf8");
  assert.match(player, /const s = math\.sin\(yaw\);/, "player.ts basis: s = sin(yaw)");
  assert.match(player, /const c = math\.cos\(yaw\);/, "player.ts basis: c = cos(yaw)");
  assert.match(player, /fx: -s, fz: -c/, "player.ts: fx = -sin(yaw), fz = -cos(yaw) (yaw 0 looks -Z)");
  assert.match(budget, /fx = -math\.sin\(listener\.yaw\);/, "budget.ts mirrors fx with the same sign (mutation: flip this sign — red here AND the turned-cone leg above, which no unit pin can see diverge from player.ts otherwise)");
  assert.match(budget, /fz = -math\.cos\(listener\.yaw\);/, "budget.ts mirrors fz with the same sign (mutation: flip either sign and the shipped cone diverges from the walk with no unit-tier red — this pin is the guard)");
});

test("cull beyond CULL_RADIUS_M: awake but NOT in budget (gain-only silence at the law tier); the radius itself is kept", () => {
  const decision = computeBudget(AT_ORIGIN_FACING_BACK, [
    target("cabinet-far-ahead", 0, -30), // cos 1 -> awake; dist 30 > CULL
    target("cabinet-cull-edge", 0, -CULL_RADIUS_M), // exactly on the radius (axis-aligned: exact FP)
  ]);
  assert.deepEqual(decision.awakeIds, ["cabinet-far-ahead", "cabinet-cull-edge"], "distance does not decide awake");
  assert.deepEqual(decision.inBudgetIds, ["cabinet-cull-edge"], "on the radius the chain keeps its slot, 30 m out it does not (mutation: the cull's <= -> < reds this edge leg; CULL_RADIUS_M -> 0 reds the no-cull-today manager pin)");
});

test("rank >= NEAREST_N is out of budget (nearest-first, literal cut)", () => {
  const targets = [
    target("rank-6th", 0, -12),
    target("rank-4th", 0, -8),
    target("rank-5th", 0, -10),
    target("rank-1st", 0, -2),
    target("rank-3rd", 0, -6),
    target("rank-2nd", 0, -4),
  ];
  const decision = computeBudget(AT_ORIGIN_FACING_BACK, targets);
  assert.equal(decision.awakeIds.length, 6, "all six awake (near legs + the -Z cone)");
  assert.deepEqual(decision.inBudgetIds, ["rank-1st", "rank-2nd", "rank-3rd", "rank-4th"], "exactly the nearest NEAREST_N by distance; the 5th and 6th are budget-silent");
});

test("volumeId tie-break is stable and decides the cut (same distance -> id asc, the occlusion.ts idiom)", () => {
  const decision = computeBudget(AT_ORIGIN_FACING_BACK, [
    target("cabinet-a", 0, -10),
    target("cabinet-z", 0, -10), // tie with a
    target("cabinet-m", 0, -12),
    target("cabinet-q", 0, -14), // tie at the NEAREST_N cut line...
    target("cabinet-b", 0, -14), // ...with b ahead of it by id
  ]);
  assert.deepEqual(decision.inBudgetIds, ["cabinet-a", "cabinet-z", "cabinet-m", "cabinet-b"], "the 14 m tie cuts by id: cabinet-b in, cabinet-q out (mutation: drop the tie-break \u2014 insertion order would admit cabinet-q here)");
});

test("interlock over a mixed room: inBudget \u2286 awake, and the seated-beyond-near chain is in both (AD-27 audible \u21d2 awake)", () => {
  const targets = [
    target("mixed-far-behind", 3, 9), // dist ~9.49, cos ~-0.948, empty -> asleep entirely
    target("mixed-seated-behind", -5, 12, true), // seated leg only -> awake, inside cull + rank
    target("mixed-near-behind", 0, 5), // near leg only (cos negative)
    target("mixed-cone-far", 6, -8), // cone leg only (dist 10)
    target("mixed-culled-far", 0, -26), // cone awake, beyond CULL -> budget-silent
  ];
  const decision = computeBudget(AT_ORIGIN_FACING_BACK, targets);
  assert.deepEqual(decision.awakeIds, ["mixed-seated-behind", "mixed-near-behind", "mixed-cone-far", "mixed-culled-far"]);
  for (const id of decision.inBudgetIds) {
    assert.ok(decision.awakeIds.includes(id), `inBudget \u2286 awake: ${id}`);
  }
  assert.ok(decision.inBudgetIds.includes("mixed-seated-behind"), "a visitor-seated chain stays audible even beyond the near radius (it is never the one you tune out)");
  assert.ok(!decision.inBudgetIds.includes("mixed-culled-far"), "awake but culled: budget silence exists INSIDE the awake set, never outside it");
  assert.ok(!decision.awakeIds.includes("mixed-far-behind"));
});

test("determinism twin: the same tick inputs replayed twice decide identically (and the input array is not mutated)", () => {
  const targets = [
    target("twin-a", 4, -7, true),
    target("twin-b", -3, -9),
    target("twin-c", 2, 3),
    target("twin-d", 8, -8),
  ];
  const before = JSON.stringify(targets);
  const one = computeBudget({ x: 1, z: 2, yaw: 0.4 }, targets);
  const two = computeBudget({ x: 1, z: 2, yaw: 0.4 }, targets);
  assert.deepEqual(one, two, "identical mix decisions byte-identical");
  assert.deepEqual(one.awakeIds, two.awakeIds);
  assert.deepEqual(one.inBudgetIds, two.inBudgetIds);
  assert.equal(JSON.stringify(targets), before, "the budget reads its targets, never rewrites them");
});

test("an empty room budgets empty (totality)", () => {
  assert.deepEqual(computeBudget(AT_ORIGIN_FACING_BACK, []), { awakeIds: [], inBudgetIds: [] });
});
