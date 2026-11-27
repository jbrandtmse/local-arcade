// Story 2.1 (AC: the mix law + the no-flap hysteresis) + Story 2.2 (the
// proximity ladder + the seated focus mix): pure-law tests with literal
// values — the law is total and clock-free, so every pin is an exact
// multiply of the authored placeholder numbers (all chosen binary-friendly
// for strictEqual). 2.1's pins are byte-preserved (their expectations, and
// their call sites only gained the new REQUIRED 2.2 inputs as neutral
// defaults: distanceM 0 / nearestOtherM Infinity / focus none / ladder
// initial / awake + inBudget true — neutral multipliers keep every 2.1
// literal exactly what it asserted).
import test from "node:test";
import assert from "node:assert/strict";
import { ENTRY_SPAWN, collisionVolumes, type CollisionVolume } from "../room/collision-volumes.ts";
import { wallSlots } from "../room/slot-config.ts";
import type { Occupancy } from "../patrons/scheduler.ts";
import {
  ATTRACT_BASE_GAIN,
  DWELL_TICKS,
  FOCUS_DUCK,
  INITIAL_DWELL,
  INITIAL_LADDER_DWELL,
  LADDER_DWELL_TICKS,
  LADDER_FAR_DUCK,
  OCCLUSION_PROFILES,
  OPEN_PROFILE,
  PROXIMITY_BAND_M,
  advanceDwell,
  focusMultiplierFor,
  ladderMultiplierFor,
  ladderSampleKey,
  mixStep,
  profileForApplied,
  sampleKeyOf,
  type DwellState,
  type MixInput,
  type MixStep,
} from "./mix.ts";

function entryAt(phase: "boot-check" | "door" | "ready-handle" | "open" | "control" | "workbench", bleedFraction: number) {
  return { phase, bleedFraction };
}

// Neutral Story 2.2 inputs at new call sites: a lone clear chain, no focus,
// inside the budget — every multiplier reads 1 and audible stays true, so
// the pure 2.1 products stay exact at the new sites too.
function law(over: Partial<MixInput>): MixStep {
  return mixStep({
    entry: over.entry ?? entryAt("control", 1),
    occupancy: over.occupancy ?? "attract",
    sampleIds: over.sampleIds ?? [],
    dwell: over.dwell ?? INITIAL_DWELL,
    distanceM: over.distanceM ?? 0,
    nearestOtherM: over.nearestOtherM ?? Infinity,
    focus: over.focus ?? "none",
    ladderDwell: over.ladderDwell ?? INITIAL_LADDER_DWELL,
    awake: over.awake ?? true,
    inBudget: over.inBudget ?? true,
    ...(over.volumes !== undefined ? { volumes: over.volumes } : {}),
  });
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
    dwell = mixStep({
      entry: entryAt("door", 0.5),
      occupancy: "attract",
      sampleIds: ["door-front"],
      dwell,
      distanceM: 0,
      nearestOtherM: Infinity,
      focus: "none",
      ladderDwell: INITIAL_LADDER_DWELL,
      awake: true,
      inBudget: true,
    }).dwell;
  }
  const step = mixStep({
    entry: entryAt("door", 0.5),
    occupancy: "attract",
    sampleIds: ["door-front"],
    dwell,
    distanceM: 0,
    nearestOtherM: Infinity,
    focus: "none",
    ladderDwell: INITIAL_LADDER_DWELL,
    awake: true,
    inBudget: true,
  });
  assert.equal(step.target.gain, 0.125);
  assert.equal(step.target.lowpassHz, 1500);

  // Open room, in control: base gain, wide open.
  const open = mixStep({
    entry: entryAt("control", 1),
    occupancy: "attract",
    sampleIds: [],
    dwell: INITIAL_DWELL,
    distanceM: 0,
    nearestOtherM: Infinity,
    focus: "none",
    ladderDwell: INITIAL_LADDER_DWELL,
    awake: true,
    inBudget: true,
  });
  assert.equal(open.target.gain, ATTRACT_BASE_GAIN);
  assert.equal(open.target.lowpassHz, OPEN_PROFILE.lowpassHz);

  // Pillar occlusion behind the door ramp: pillar profile is what applies
  // once the dwell lands (nearest-first id keys, kind profiles apply).
  let pdwell: DwellState = INITIAL_DWELL;
  for (let i = 0; i < DWELL_TICKS; i++) {
    pdwell = mixStep({
      entry: entryAt("control", 1),
      occupancy: "attract",
      sampleIds: ["pillar-1"],
      dwell: pdwell,
      distanceM: 0,
      nearestOtherM: Infinity,
      focus: "none",
      ladderDwell: INITIAL_LADDER_DWELL,
      awake: true,
      inBudget: true,
    }).dwell;
  }
  assert.equal(
    mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: ["pillar-1"], dwell: pdwell, distanceM: 0, nearestOtherM: Infinity, focus: "none", ladderDwell: INITIAL_LADDER_DWELL, awake: true, inBudget: true }).target.gain,
    0.5 * OCCLUSION_PROFILES.pillar.gain,
  );
  assert.equal(
    mixStep({ entry: entryAt("control", 1), occupancy: "attract", sampleIds: ["pillar-1"], dwell: pdwell, distanceM: 0, nearestOtherM: Infinity, focus: "none", ladderDwell: INITIAL_LADDER_DWELL, awake: true, inBudget: true }).target.lowpassHz,
    OCCLUSION_PROFILES.pillar.lowpassHz,
  );
});

test("a pending sample does not act early: applied stays OPEN through the dwell", () => {
  const step = mixStep({
    entry: entryAt("control", 1),
    occupancy: "attract",
    sampleIds: ["wall-back"],
    dwell: INITIAL_DWELL,
    distanceM: 0,
    nearestOtherM: Infinity,
    focus: "none",
    ladderDwell: INITIAL_LADDER_DWELL,
    awake: true,
    inBudget: true,
  });
  assert.equal(step.target.gain, ATTRACT_BASE_GAIN);
  assert.equal(step.target.lowpassHz, OPEN_PROFILE.lowpassHz);
  assert.equal(step.dwell.pendingId, "wall-back");
});

test("swell: the entry beat's bleedFraction IS the swell; control is full level", () => {
  assert.equal(law({ entry: entryAt("boot-check", 0) }).target.gain, 0);
  assert.equal(law({ entry: entryAt("door", 0.25) }).target.gain, 0.125);
  assert.equal(law({ entry: entryAt("ready-handle", 0.75) }).target.gain, 0.375);
  assert.equal(law({ entry: entryAt("open", 1) }).target.gain, 0.5);
  // control: even a stale low bleedFraction cannot duck the room.
  assert.equal(law({ entry: entryAt("control", 0.25) }).target.gain, ATTRACT_BASE_GAIN);
  // workbench (the failNow handover): the beat is over, so a stale partial
  // bleed can never duck the attract on the workbench page either.
  assert.equal(law({ entry: entryAt("workbench", 0.25) }).target.gain, ATTRACT_BASE_GAIN, "control/workbench are both outside SWEEP_PHASES: full level (mutation: add workbench to SWEEP_PHASES and a failNow from the door beat freezes the workbench attract at the stale bleed \u2014 red here)");
});

test("occupancy gate: silent ONLY while a visitor sits; a busy cabinet keeps playing", () => {
  const seated = law({ occupancy: "visitor-seated" });
  assert.equal(seated.target.gain, 0);
  assert.equal(seated.target.lowpassHz, OPEN_PROFILE.lowpassHz, "the gate is gain-only \u2014 no colour change, no start/stop");

  const autoplay = law({ occupancy: "patron-autoplay" });
  assert.equal(autoplay.target.gain, ATTRACT_BASE_GAIN, "the busy cabinet's attract keeps sounding (idle-only gate goes red here)");

  const attract = law({ occupancy: "attract" });
  assert.equal(attract.target.gain, ATTRACT_BASE_GAIN);
});

test("a wall profile occlusion and a door profile occlusion land different numbers (swap pin)", () => {
  const wallApplied = law({ dwell: { appliedId: "wall-back", pendingId: "", pendingTicks: 0 } });
  const doorApplied = law({ dwell: { appliedId: "door-front", pendingId: "", pendingTicks: 0 } });
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
  const step = law({
    sampleIds: ["fake-wall"],
    dwell: { appliedId: "fake-wall", pendingId: "", pendingTicks: 0 },
    volumes: [fake],
  });
  assert.equal(step.target.gain, ATTRACT_BASE_GAIN * OCCLUSION_PROFILES.wall.gain);
  assert.equal(step.target.lowpassHz, OCCLUSION_PROFILES.wall.lowpassHz);
});

// --- Story 2.2: the proximity ladder ----------------------------------------

test("ladder constants are authored placeholders with the pinned numbers (3.7 owns the finals)", () => {
  assert.equal(PROXIMITY_BAND_M, 0.25, "spatial dead-band around the nearest, metres");
  assert.equal(LADDER_FAR_DUCK, 0.25, "the low rung's level multiplier");
  assert.equal(LADDER_DWELL_TICKS, 15, "the ladder's temporal leg, ticks");
  assert.notEqual(LADDER_DWELL_TICKS, DWELL_TICKS, "one dwell machine, two tunable clocks (Design Notes 2): a shared-constant refactor goes red here");
});

test("INITIAL_LADDER_DWELL starts applied 'clear': the room opens with no pinned nearest", () => {
  assert.equal(INITIAL_LADDER_DWELL.appliedId, "clear");
  const step = law({});
  assert.equal(step.ladderDwell.appliedId, "clear");
});

test("a lone chain always samples clear: nearestOtherM = Infinity means no competitor", () => {
  assert.equal(ladderSampleKey(1000, Infinity), "clear");
  assert.equal(ladderSampleKey(Infinity, Infinity), "clear");
  let ladderDwell: DwellState = INITIAL_LADDER_DWELL;
  for (let i = 0; i < LADDER_DWELL_TICKS + 5; i++) {
    ladderDwell = law({ distanceM: 1000, nearestOtherM: Infinity, ladderDwell }).ladderDwell;
  }
  assert.equal(ladderDwell.appliedId, "clear", "the single placed Cabinet is never ladder-ducked behind a phantom (mutation: treat Infinity as low \u2014 red here)");
  assert.equal(law({ distanceM: 1000, nearestOtherM: Infinity }).target.gain, ATTRACT_BASE_GAIN);
});

test("PROXIMITY_BAND_M dead-band: within band of the nearest still samples 'clear' (mutation: band -> 0 goes red)", () => {
  assert.equal(ladderSampleKey(4.25, 4), "clear", "exactly on the band edge: still clear");
  assert.equal(ladderSampleKey(4.3, 4), "low", "beyond the band: low");
  assert.equal(ladderSampleKey(4, 4.25), "clear", "the nearer-than-nearest case stays clear");
  assert.equal(ladderMultiplierFor("clear"), 1);
  assert.equal(ladderMultiplierFor("low"), LADDER_FAR_DUCK);
});

test("ladder dwell: the applied tier flips only on the LADDER_DWELL_TICKS-th consecutive sample", () => {
  let ladderDwell: DwellState = INITIAL_LADDER_DWELL;
  for (let i = 0; i < LADDER_DWELL_TICKS - 1; i++) {
    ladderDwell = law({ distanceM: 10, nearestOtherM: 5, ladderDwell }).ladderDwell;
  }
  assert.equal(ladderDwell.appliedId, "clear", "14 consecutive low samples are not enough");
  assert.equal(ladderDwell.pendingTicks, LADDER_DWELL_TICKS - 1);
  ladderDwell = law({ distanceM: 10, nearestOtherM: 5, ladderDwell }).ladderDwell;
  assert.equal(ladderDwell.appliedId, "low", "the 15th consecutive sample applies the low rung");
  // Delete the dwell usage (applied flips on the first sample) and this
  // pin plus the flap pin go red.
  assert.equal(law({ distanceM: 10, nearestOtherM: 5 }).ladderDwell.appliedId, "clear", "one sample never applies");
});

test("ladder boundary flapping: alternating nearest samples never flip the applied tier (CAP-3)", () => {
  // distanceM 5 against a nearest-other that alternates 4.9 (inside the
  // band: clear) and 4.0 (outside: low) — the sample key flips every tick.
  // The pin counts APPLIED-tier transitions across the whole sweep, not
  // just the end snapshot: a deleted dwell oscillates per tick and lands
  // on the expected value by accident, so transitions are the falsifiable
  // surface (CAP-3: the applied tier never flips).
  const sweep = (start: DwellState, ticks: number): { end: DwellState; flips: number } => {
    let dwell = start;
    let flips = 0;
    for (let i = 0; i < ticks; i++) {
      const next = law({ distanceM: 5, nearestOtherM: i % 2 === 0 ? 4.9 : 4, ladderDwell: dwell }).ladderDwell;
      if (next.appliedId !== dwell.appliedId) flips++;
      dwell = next;
    }
    return { end: dwell, flips };
  };
  // 201 and 200: each sweep ends on a sample that matches its APPLIED tier,
  // so the candidate never carries a stray pending count into the snapshot
  // (same never-flip truth, clean memory read).
  const fromClear = sweep(INITIAL_LADDER_DWELL, 201);
  assert.equal(fromClear.flips, 0, "no applied-tier transition in 201 alternating samples (mutation: delete the ladder dwell — the tier oscillates: red here)");
  assert.deepEqual(fromClear.end, { appliedId: "clear", pendingId: "", pendingTicks: 0 }, "the dwell holds the applied tier forever under flapping samples");
  // Mirror: applied starts "low" — flapping never releases it either.
  const fromLow = sweep({ appliedId: "low", pendingId: "", pendingTicks: 0 }, 200);
  assert.equal(fromLow.flips, 0, "no release transition either: a low-applied chain at a tie boundary never flips per tick");
  assert.deepEqual(fromLow.end, { appliedId: "low", pendingId: "", pendingTicks: 0 }, "and the held state stays pinned at low");
});

test("doorway ordering: at the ENTRY_SPAWN pose only the nearest back-row chain reads full ladder level; the rest land LADDER_FAR_DUCK x their product (authored Wall Slots derive the distances)", () => {
  // Distances derived from the authored Wall Slot records vs the doorway
  // pose — never retyped coordinates (slot-config B0/B1/B3 back row).
  const planarTo = (slotId: string): number => {
    const slot = wallSlots.find((s) => s.id === slotId);
    assert.ok(slot !== undefined, "authored back-row slot exists");
    const dx = slot.center.x - ENTRY_SPAWN.x;
    const dz = slot.center.z - ENTRY_SPAWN.z;
    return Math.sqrt(dx * dx + dz * dz);
  };
  const d0 = planarTo("B0");
  const d1 = planarTo("B1");
  const d3 = planarTo("B3");
  assert.ok(d3 < d1 && d1 < d0, "fixture: B3 nearest to the doorway, B0 farthest");
  assert.ok(d1 - d3 > PROXIMITY_BAND_M && d0 - d1 > PROXIMITY_BAND_M, "the authored slot pitch clears the dead-band: both non-nearest chains fall outside it (mutation: widen the band past the pitch and the ordering pins go red)");

  const nearestOther = (d: number): number => Math.min(...[d0, d1, d3].filter((x) => x !== d));
  const settle = (d: number): MixStep => {
    let ladderDwell: DwellState = INITIAL_LADDER_DWELL;
    let step: MixStep | undefined;
    for (let i = 0; i < LADDER_DWELL_TICKS + 5; i++) {
      step = law({ distanceM: d, nearestOtherM: nearestOther(d), ladderDwell });
      ladderDwell = step.ladderDwell;
    }
    return step!;
  };
  const s0 = settle(d0);
  const s1 = settle(d1);
  const s3 = settle(d3);
  assert.equal(s3.ladderDwell.appliedId, "clear");
  assert.equal(s1.ladderDwell.appliedId, "low");
  assert.equal(s0.ladderDwell.appliedId, "low");
  // Exactly the nearest reads at full ladder level; every other lands
  // LADDER_FAR_DUCK x its profile product — literal.
  assert.equal(s3.target.gain, ATTRACT_BASE_GAIN, "the nearest chain: full level (0.5)");
  assert.equal(s1.target.gain, ATTRACT_BASE_GAIN * LADDER_FAR_DUCK, "0.5 x 0.25 = 0.125 far rung");
  assert.equal(s0.target.gain, ATTRACT_BASE_GAIN * LADDER_FAR_DUCK);
  assert.equal(s3.target.gain, 0.5, "literal");
  assert.equal(s1.target.gain, 0.125, "literal");
  assert.ok(s3.target.gain > s1.target.gain && s1.target.gain === s0.target.gain);
});

test("approach swell: the approached chain applies 'clear' exactly LADDER_DWELL_TICKS after its sample turns clear, then reads strictly above every other chain", () => {
  // Synthetic approach: chain X closes from 9 m to 0.5 m in 0.25 m steps
  // (dyadic, exact), chain Y sits at 5 m. X's sample flips clear when it
  // enters Y + the band (t=15, exactly on the edge); Y's flips low when X
  // passes under Y - band margin (t=18). X starts applied "low".
  const dX = (t: number): number => 9 - t * 0.25;
  const dY = 5;
  let xl: DwellState = { appliedId: "low", pendingId: "", pendingTicks: 0 };
  let yl: DwellState = INITIAL_LADDER_DWELL;
  let xFlips = 0;
  let yFlips = 0;
  let xStep: MixStep | undefined;
  let yStep: MixStep | undefined;
  for (let t = 0; t <= 34; t++) {
    xStep = law({ distanceM: dX(t), nearestOtherM: dY, ladderDwell: xl });
    if (xStep.ladderDwell.appliedId !== xl.appliedId) xFlips += 1;
    xl = xStep.ladderDwell;
    yStep = law({ distanceM: dY, nearestOtherM: dX(t), ladderDwell: yl });
    if (yStep.ladderDwell.appliedId !== yl.appliedId) yFlips += 1;
    yl = yStep.ladderDwell;
    if (t === 28) assert.equal(xl.appliedId, "low", "14 consecutive clear samples: the applied tier holds \u2014 the swell lands one tick later, on the dwell count");
  }
  assert.equal(xl.appliedId, "clear", "the 15th consecutive clear sample applies the clear rung");
  assert.equal(yl.appliedId, "low", "Y fell to the far rung behind the arriving machine");
  assert.equal(xFlips, 1, "exactly one applied flip for the approached chain");
  assert.equal(yFlips, 1, "exactly one applied flip for the outraced chain");
  // FR-3 "swells above the rest": its gain strictly exceeds every other.
  assert.equal(xStep!.target.gain, ATTRACT_BASE_GAIN, "0.5 full level");
  assert.equal(yStep!.target.gain, ATTRACT_BASE_GAIN * LADDER_FAR_DUCK, "0.125 far rung");
  assert.ok(xStep!.target.gain > yStep!.target.gain, "the approached chain reads above the rest");
});

// --- Story 2.2: the seated focus mix ----------------------------------------

test("focus three-way: self/none keep full level, every other chain ducks to the authored floor", () => {
  assert.equal(FOCUS_DUCK, 0.0625, "the near-silent floor multiplier, literal placeholder");
  assert.equal(focusMultiplierFor("self"), 1);
  assert.equal(focusMultiplierFor("none"), 1);
  assert.equal(focusMultiplierFor("other"), FOCUS_DUCK);
  const other = law({ focus: "other" });
  assert.equal(other.target.gain, ATTRACT_BASE_GAIN * FOCUS_DUCK);
  assert.equal(other.target.gain, 0.03125, "the floor product, literal");
  // focus "self" with a non-seated occupancy (synthetic: seat detection is
  // the manager's, wired off exactly "visitor-seated") proves the self
  // multiplier itself never silences.
  const selfBusy = law({ focus: "self", occupancy: "patron-autoplay" });
  assert.equal(selfBusy.target.gain, ATTRACT_BASE_GAIN, "the focused chain's multiplier is FULL (mutation: seat detection wired wrong \u2014 all chains 'other' \u2014 the composition pin goes red)");
  const none = law({ focus: "none" });
  assert.equal(none.target.gain, ATTRACT_BASE_GAIN, "nobody seated: neutral everywhere (FOCUS_DUCK -> 1 cannot red a neutral pin \u2014 the floor pins above carry it)");
});

test("seated composition (Design Notes 1): the focused chain's multiplier stays FULL while 2.1's seated gate keeps its attract silent \u2014 neither law may silently erase the other", () => {
  const seatedSelf = law({ occupancy: "visitor-seated", focus: "self" });
  assert.equal(seatedSelf.target.gain, 0, "2.1's occupancyGate keeps the seated attract loop silent while a visitor sits");
  assert.equal(seatedSelf.audible, true, "gate silence is not budget silence: the chain stays awake/in-budget, only the gain reads 0");
  assert.equal(focusMultiplierFor("self"), 1, "the multiplier contract is FULL: the machine's own audio rides this full level (attract returns on stand; play-mode audio arrives with the game-initiated request surface)");
  const otherChain = law({ occupancy: "attract", focus: "other" });
  assert.equal(otherChain.target.gain, ATTRACT_BASE_GAIN * FOCUS_DUCK, "the ducking law is fully live for every non-focus cabinet while a visitor sits");
});

// --- Story 2.2: the channel-budget gate -------------------------------------

test("audible = awake && inBudget: outside either is gain 0 \u2014 colour stays the applied profile, no start/stop churn", () => {
  const asleep = law({ awake: false, inBudget: true });
  assert.equal(asleep.audible, false);
  assert.equal(asleep.target.gain, 0);
  assert.equal(asleep.target.lowpassHz, OPEN_PROFILE.lowpassHz, "budget silence is gain-only: no colour change (mutation: colour a culled chain \u2014 red here)");

  const culled = law({ awake: true, inBudget: false });
  assert.equal(culled.audible, false);
  assert.equal(culled.target.gain, 0);

  const out = law({ awake: false, inBudget: false });
  assert.equal(out.audible, false);
  assert.equal(out.target.gain, 0);

  const inside = law({ awake: true, inBudget: true });
  assert.equal(inside.audible, true);
  assert.equal(inside.target.gain, ATTRACT_BASE_GAIN);
  // The budget multipliers never touch the 2.1 product when inside (the
  // whole room would otherwise land at 0.5 x 0.25 x 0.0625 by accident):
  assert.equal(inside.target.gain, law({}).target.gain);
  // NEAREST_N -> 0 / CULL_RADIUS_M -> 0 lands here at the law tier:
  // inBudget false is what a zero-budget fixture would feed.
});
