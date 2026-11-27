// Story 2.1 (AC: the mix law + the no-flap hysteresis): pure-law tests
// with literal values — the law is total and clock-free, so every pin is
// an exact multiply of the authored profile numbers (all chosen
// binary-friendly for strictEqual).
import test from "node:test";
import assert from "node:assert/strict";
import { collisionVolumes, type CollisionVolume } from "../room/collision-volumes.ts";
import {
  ATTRACT_BASE_GAIN,
  DWELL_TICKS,
  INITIAL_DWELL,
  OCCLUSION_PROFILES,
  OPEN_PROFILE,
  advanceDwell,
  mixStep,
  profileForApplied,
  sampleKeyOf,
  type DwellState,
} from "./mix.ts";

function entryAt(phase: "boot-check" | "door" | "ready-handle" | "open" | "control", bleedFraction: number) {
  return { phase, bleedFraction };
}

test("profile numbers are authored placeholders, pairwise distinct (the swap pin)", () => {
  const values = [OCCLUSION_PROFILES.wall, OCCLUSION_PROFILES.pillar, OCCLUSION_PROFILES.door, OPEN_PROFILE];
  const gains = values.map((p) => p.gain);
  assert.equal(new Set(gains).size, gains.length, "gains distinct \u2014 a wall/door swap turns a pin red");
  const hz = values.map((p) => p.lowpassHz);
  assert.equal(new Set(hz).size, hz.length, "lowpasses distinct \u2014 a wall/door swap turns a pin red");
});

test("sampleKeyOf: nearest id wins, empty sample means line-of-sound", () => {
  assert.equal(sampleKeyOf(["wall-front-left", "pillar-1"]), "wall-front-left");
  assert.equal(sampleKeyOf([]), "");
});

test("dwell: the applied class flips only on the DWELL-th consecutive matching sample", () => {
  assert.equal(DWELL_TICKS, 30);
  let dwell: DwellState = INITIAL_DWELL;
  for (let i = 0; i < DWELL_TICKS - 1; i++) dwell = advanceDwell("door-front", dwell);
  assert.equal(dwell.appliedId, "", "29 consecutive samples are not enough");
  assert.equal(dwell.pendingTicks, DWELL_TICKS - 1);
  dwell = advanceDwell("door-front", dwell);
  assert.equal(dwell.appliedId, "door-front", "the 30th consecutive sample flips it");
  assert.equal(dwell.pendingTicks, 0);

  // Removing the dwell (or setting it to 1) flips on the first sample and
  // this pin goes red.
  assert.equal(advanceDwell("door-front", INITIAL_DWELL).appliedId, "");
});

test("dwell: alternating samples NEVER flip \u2014 the attract never flaps at an edge", () => {
  let dwell: DwellState = INITIAL_DWELL;
  for (let i = 0; i < 201; i++) dwell = advanceDwell(i % 2 === 0 ? "wall-front-right" : "", dwell);
  assert.equal(dwell.appliedId, "", "flapping samples never apply a profile");
  // Ends on a wall sample: the candidate exists but never counts past 1 —
  // every intervening open sample resets it.
  assert.deepEqual(dwell, { appliedId: "", pendingId: "wall-front-right", pendingTicks: 1 });
});

test("dwell: an applied class releases only after its own full dwell back to open", () => {
  let dwell: DwellState = INITIAL_DWELL;
  for (let i = 0; i < DWELL_TICKS; i++) dwell = advanceDwell("pillar-1", dwell);
  assert.equal(dwell.appliedId, "pillar-1");
  for (let i = 0; i < DWELL_TICKS - 1; i++) dwell = advanceDwell("", dwell);
  assert.equal(dwell.appliedId, "pillar-1");
  dwell = advanceDwell("", dwell);
  assert.equal(dwell.appliedId, "");
});

test("profileForApplied maps the applied volume id through its authored kind", () => {
  assert.equal(profileForApplied(""), OPEN_PROFILE);
  assert.equal(profileForApplied("wall-front-left"), OCCLUSION_PROFILES.wall);
  assert.equal(profileForApplied("door-front"), OCCLUSION_PROFILES.door);
  assert.equal(profileForApplied("pillar-2"), OCCLUSION_PROFILES.pillar);
  // Defensive totality: a non-occluder id (the raycaster cannot return
  // one, but the law stays total) reads as open.
  const street = collisionVolumes.find((v) => v.kind === "street");
  assert.ok(street !== undefined);
  assert.equal(profileForApplied(street.id), OPEN_PROFILE);
});

test("mix law literals: base x profile x swell x gate, exact", () => {
  // Street listener behind the closed door, mid-ramp of the entry beat:
  // 0.5 base * 0.5 door * 0.5 bleed = 0.125, door colouration.
  let dwell: DwellState = INITIAL_DWELL;
  for (let i = 0; i < DWELL_TICKS; i++) {
    dwell = mixStep({ entry: entryAt("door", 0.5), occupancy: "attract", sampleIds: ["door-front"], dwell }).dwell;
  }
  const step = mixStep({ entry: entryAt("door", 0.5), occupancy: "attract", sampleIds: ["door-front"], dwell });
  assert.equal(step.target.gain, 0.125);
  assert.equal(step.target.lowpassHz, 1500);

  // Open room, in control: base gain, wide open.
  const open = mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: [], dwell: INITIAL_DWELL });
  assert.equal(open.target.gain, ATTRACT_BASE_GAIN);
  assert.equal(open.target.lowpassHz, OPEN_PROFILE.lowpassHz);

  // Pillar occlusion behind the door ramp: pillar profile is what applies
  // once the dwell lands (nearest-first id keys, kind profiles apply).
  let pdwell: DwellState = INITIAL_DWELL;
  for (let i = 0; i < DWELL_TICKS; i++) {
    pdwell = mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: ["pillar-1"], dwell: pdwell }).dwell;
  }
  assert.equal(mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: ["pillar-1"], dwell: pdwell }).target.gain, 0.5 * OCCLUSION_PROFILES.pillar.gain);
  assert.equal(mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: ["pillar-1"], dwell: pdwell }).target.lowpassHz, OCCLUSION_PROFILES.pillar.lowpassHz);
});

test("a pending sample does not act early: applied stays OPEN through the dwell", () => {
  const step = mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: ["wall-back"], dwell: INITIAL_DWELL });
  assert.equal(step.target.gain, ATTRACT_BASE_GAIN);
  assert.equal(step.target.lowpassHz, OPEN_PROFILE.lowpassHz);
  assert.equal(step.dwell.pendingId, "wall-back");
});

test("swell: the entry beat's bleedFraction IS the swell; control is full level", () => {
  assert.equal(mixStep({ entry: entryAt("boot-check", 0), occupancy: "attract", sampleIds: [], dwell: INITIAL_DWELL }).target.gain, 0);
  assert.equal(mixStep({ entry: entryAt("door", 0.25), occupancy: "attract", sampleIds: [], dwell: INITIAL_DWELL }).target.gain, 0.125);
  assert.equal(mixStep({ entry: entryAt("ready-handle", 0.75), occupancy: "attract", sampleIds: [], dwell: INITIAL_DWELL }).target.gain, 0.375);
  assert.equal(mixStep({ entry: entryAt("open", 1), occupancy: "attract", sampleIds: [], dwell: INITIAL_DWELL }).target.gain, 0.5);
  // control: even a stale low bleedFraction cannot duck the room.
  assert.equal(mixStep({ entry: entryAt("control", 0.25), occupancy: "attract", sampleIds: [], dwell: INITIAL_DWELL }).target.gain, ATTRACT_BASE_GAIN);
});

test("occupancy gate: silent ONLY while a visitor sits; a busy cabinet keeps playing", () => {
  const seated = mixStep({ entry: entryAt("control", 1), occupancy: "visitor-seated", sampleIds: [], dwell: INITIAL_DWELL });
  assert.equal(seated.target.gain, 0);
  assert.equal(seated.target.lowpassHz, OPEN_PROFILE.lowpassHz, "the gate is gain-only \u2014 no colour change, no start/stop");

  const autoplay = mixStep({ entry: entryAt("control", 1), occupancy: "patron-autoplay", sampleIds: [], dwell: INITIAL_DWELL });
  assert.equal(autoplay.target.gain, ATTRACT_BASE_GAIN, "the busy cabinet's attract keeps sounding (idle-only gate goes red here)");

  const attract = mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: [], dwell: INITIAL_DWELL });
  assert.equal(attract.target.gain, ATTRACT_BASE_GAIN);
});

test("a wall profile occlusion and a door profile occlusion land different numbers (swap pin)", () => {
  const wallApplied = mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: [], dwell: { appliedId: "wall-back", pendingId: "", pendingTicks: 0 } });
  const doorApplied = mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: [], dwell: { appliedId: "door-front", pendingId: "", pendingTicks: 0 } });
  assert.equal(wallApplied.target.gain, ATTRACT_BASE_GAIN * OCCLUSION_PROFILES.wall.gain);
  assert.equal(doorApplied.target.gain, ATTRACT_BASE_GAIN * OCCLUSION_PROFILES.door.gain);
  assert.notEqual(wallApplied.target.gain, doorApplied.target.gain);
  assert.notEqual(wallApplied.target.lowpassHz, doorApplied.target.lowpassHz);
});

test("the profile lookup reads the INJECTED volume list, not the module singleton", () => {
  // A caller-threaded list (the same slice the raycast was handed): the
  // kind profile must follow THAT list, not a copy baked into the law.
  const fake: CollisionVolume = {
    id: "fake-wall",
    min: { x: 0, y: 0, z: 0 },
    max: { x: 1, y: 3, z: 0.2 },
    blocksMovement: true,
    targetable: false,
    kind: "wall",
  };
  assert.equal(profileForApplied("fake-wall", [fake]), OCCLUSION_PROFILES.wall);
  // The module singleton does NOT know fake-wall: without the injection
  // the same id reads open, so this pin goes red if the lookup reverts to
  // the baked list (mutation: drop the volumes wire in mixStep).
  assert.notEqual(profileForApplied("fake-wall", collisionVolumes), profileForApplied("fake-wall", [fake]));
  const step = mixStep({
    entry: entryAt("control", 1),
    occupancy: "attract",
    sampleIds: ["fake-wall"],
    dwell: { appliedId: "fake-wall", pendingId: "", pendingTicks: 0 },
    volumes: [fake],
  });
  assert.equal(step.target.gain, ATTRACT_BASE_GAIN * OCCLUSION_PROFILES.wall.gain);
  assert.equal(step.target.lowpassHz, OCCLUSION_PROFILES.wall.lowpassHz);
});
