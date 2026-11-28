// Story 2.3 (AC1-AC4, AC7): the atmosphere tier's own suite — every I/O-
// matrix row as literal pins over the AUTHORED geometry (ENTRY_SPAWN, the
// farthest authored corner, the pillar AABBs, the slot centres — never
// retyped coordinates). The law tier needs no seam fake (pure functions);
// the builder census runs in scene.test.ts and the real-three Box3 tier in
// cabinets.test.ts verification 9. The sightline fixture is a TEST-LOCAL
// copy of occlusion.test.ts's slab-clip segHitsRect — copied, never
// imported: importing it would weld the visual tier to the audio tier's
// neighbourhood and red its own asymmetry pin (the copy IS the point).
// Determinism twin mirrors budget.test.ts:152-166; the no-wall-clock scan
// mirrors manager.test.ts's readdir idiom scoped to core/room/ (a hand-
// listed file set would silently stop covering when a new source lands).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ENTRY_SPAWN, INTERIOR, WALL_TOP, collisionVolumes } from "./collision-volumes.ts";
import { CABINET_LIGHT_INTENSITY, CABINET_PHASE_CYCLE_TICKS, cabinetPlacements, placementGeometry } from "./cabinets.ts";
import {
  FLASH_RATE_CEILING_PER_SEC,
  GLOW_PULSE_FLOOR,
  GLOW_PULSE_PERIOD_TICKS,
  HAZE_COEFF,
  HAZE_FLOOR,
  HAZE_NEAR_M,
  SPILL_CEILING_INSET_M,
  SPILL_FLOOR_MOUNT_M,
  SPILL_OFFSET_M,
  SPILL_REACH_M,
  SPILL_INTENSITY,
  flashRateCompliant,
  flashRateHz,
  glowPulse,
  hazeFactor,
  spillAnchors,
  spillMountY,
} from "./atmosphere.ts";

const ROOM_DIR = import.meta.dirname;

// --- test-local sightline idiom (copied from occlusion.test.ts, not
// imported — the visual tier never reaches the audio mechanism, and this
// suite pins that about itself too) ------------------------------------------

interface RectXZ {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Slab-clipped segment vs axis-aligned rect (XZ plane), byte-mirroring the
// occlusion.test.ts function so "where sight is broken" means the same
// geometry in both suites without sharing an import.
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

function blockers(): { id: string; rect: RectXZ }[] {
  return collisionVolumes
    .filter((v) => v.kind === "pillar")
    .map((v) => ({ id: v.id, rect: { minX: v.min.x, maxX: v.max.x, minZ: v.min.z, maxZ: v.max.z } }));
}

function blockedBy(ax: number, az: number, bx: number, bz: number): string[] {
  return blockers().filter((b) => segHitsRect(ax, az, bx, bz, b.rect)).map((b) => b.id);
}

function dist(x1: number, z1: number, x2: number, z2: number): number {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1));
}

// --- labelled placeholders pinned literally (3.7 owns the finals) ------------

test("every atmosphere tunable is a labelled placeholder pinned LITERALLY, and the pulse placeholder ties one swell to the authored attract cycle (AD-27 Deferred row; mutation: a silent re-tune reddens here, 3.7's pass moves constant AND pin together)", () => {
  assert.equal(HAZE_FLOOR, 0.25, "haze floor (never-zero Room-Black dim ratio — 0 would be the reads-dead bug)");
  assert.equal(HAZE_NEAR_M, 12.5, "near radius, m: the doorway->back-row pull distance stays un-hazed inside it");
  assert.equal(HAZE_COEFF, 0.06, "falloff coefficient, 1/m beyond the near radius");
  assert.equal(GLOW_PULSE_FLOOR, 0.7, "pulse floor (never black — always glowing)");
  assert.equal(GLOW_PULSE_PERIOD_TICKS, 120, "pulse period, ticks (0.5 Hz by the flash law)");
  assert.equal(FLASH_RATE_CEILING_PER_SEC, 3, "the OWNER-FIXED NFR-9 ceiling — a law shape used as given, not a placeholder");
  assert.equal(SPILL_OFFSET_M, 0.4, "spill anchor offset past the occluder face, m");
  assert.equal(SPILL_FLOOR_MOUNT_M, 0.12, "floor-sheen mount height, m");
  assert.equal(SPILL_CEILING_INSET_M, 0.2, "ceiling-bounce mount inset below WALL_TOP, m");
  assert.equal(SPILL_REACH_M, 5, "bleed point-light reach, m");
  assert.equal(SPILL_INTENSITY, CABINET_LIGHT_INTENSITY, "the bleed nominal DERIVES the cabinet light nominal — never retyped (one nominal the haze multiplies)");
  // I/O matrix "Attract pulse": exactly one gentle cycle per phase cycle —
  // visible in the constants, not only in the curve.
  assert.equal(2 * GLOW_PULSE_PERIOD_TICKS, CABINET_PHASE_CYCLE_TICKS, "two pulse periods = one attract phase cycle (240): one gentle swell per cycle");
});

// --- haze law: near / far / monotone / floor legs ------------------------------

test("haze near leg: 1 EXACTLY at the authored doorway pose (ENTRY_SPAWN -> B0 is inside HAZE_NEAR_M — the pull from the door never hazes), and at literal distances on both sides of the plateau edge", () => {
  const b0 = placementGeometry("B0").center;
  const doorDistance = dist(ENTRY_SPAWN.x, ENTRY_SPAWN.z, b0.x, b0.z);
  assert.ok(doorDistance < HAZE_NEAR_M, "the authored doorway->B0 distance (~12.2 m) sits inside the near plateau — the authored constant and the authored room agree (mutation: shrink HAZE_NEAR_M and the door's pull reddens here)");
  assert.equal(hazeFactor(doorDistance), 1, "near source: haze EXACTLY 1 — halo/spill sit at nominal x pulse at the door (I/O matrix Near row)");
  const nominalPulsed = CABINET_LIGHT_INTENSITY * glowPulse(GLOW_PULSE_PERIOD_TICKS);
  assert.equal(nominalPulsed * hazeFactor(doorDistance), CABINET_LIGHT_INTENSITY, "and at the pulse peak (phase 120) the shipped nominal lands EXACTLY at nominal x pulse (literal)");
  assert.equal(hazeFactor(0), 1, "standing at the body: full nominal");
  assert.equal(hazeFactor(HAZE_NEAR_M), 1, "on the plateau edge: still exactly 1 (inclusive)");
  assert.equal(hazeFactor(HAZE_NEAR_M + 0.5), 1 - 0.5 * HAZE_COEFF, "half a metre past: attenuated by the authored coefficient (literal)");
});

test("haze far leg: the farthest authored corner (room diagonal ~22.7 m, 2.2's authored figure) hazes strictly below near yet never below the never-zero floor; the clamp tail equals the floor EXACTLY (UX-DR17: dim toward Room Black, never read dead)", () => {
  const b0 = placementGeometry("B0").center;
  const far = { x: INTERIOR.width / 2, z: INTERIOR.depth / 2 };
  const diagonal = Math.sqrt(INTERIOR.width * INTERIOR.width + INTERIOR.depth * INTERIOR.depth);
  assert.ok(Math.abs(diagonal - 22.74) < 0.01, `the authored room diagonal is the 2.2 figure (~22.7 m, got ${diagonal.toFixed(3)})`);
  const farDistance = dist(far.x, far.z, b0.x, b0.z);
  const farHaze = hazeFactor(farDistance);
  assert.ok(farHaze < 1, "far corner strictly below the near leg");
  assert.ok(farHaze >= HAZE_FLOOR, "and at or above the floor");
  assert.ok(farHaze > 0, "NEVER 0 — this is the falsifiable reads-dead bug (UX-DR17)");
  // A camera farther than the room can ever place one still clamps at the
  // floor exactly: the law can never underflow into negative light.
  assert.equal(hazeFactor(HAZE_NEAR_M + (1 - HAZE_FLOOR) / HAZE_COEFF), HAZE_FLOOR, "exactly at the clamp knee: the floor EXACTLY");
  assert.equal(hazeFactor(1000), HAZE_FLOOR, "a kilometre out: still the floor, never negative, never zero");
});

test("haze monotone falloff: non-increasing across a swept authored axis, and STRICTLY decreasing across the whole live range until the floor clamps", () => {
  let prev = Number.POSITIVE_INFINITY;
  let strictLegs = 0;
  for (let d = 0; d <= 30; d += 0.25) {
    const h = hazeFactor(d);
    assert.ok(h <= prev, `non-increasing at d=${d}`);
    if (h < prev && h > HAZE_FLOOR) strictLegs += 1;
    prev = h;
  }
  assert.ok(strictLegs > 40, "the strictly-decreasing run before the clamp spans most of the sweep (~28 m of gradient between plateau and floor) — mutation: a constant law reddens here");
  // The whole live room lives inside (plateau, floor): every authored corner
  // distance reads a DIFFERENT haze until the floor — the gradient never
  // goes flat where the player can stand.
  const cornerDistances = [
    { x: -INTERIOR.width / 2, z: -INTERIOR.depth / 2 },
    { x: INTERIOR.width / 2, z: -INTERIOR.depth / 2 },
    { x: INTERIOR.width / 2, z: INTERIOR.depth / 2 },
    { x: -INTERIOR.width / 2, z: INTERIOR.depth / 2 },
  ];
  const b0 = placementGeometry("B0").center;
  const hazes = cornerDistances.map((c) => hazeFactor(dist(c.x, c.z, b0.x, b0.z)));
  const sorted = [...hazes].sort((a, b) => a - b);
  assert.equal(sorted[0], hazes[2], "the far (front-right, ~18.3 m) corner reads the DIMMIEST from B0 — ordering follows distance");
  assert.ok(hazes[2] < hazes[1] && hazes[1] < hazes[3] && hazes[3] < hazes[0], "corner dimming follows corner distance EXACTLY: front-right (18.3 m) < back-right (13.7 m) < front-left (13.2 m) < back-left (5.3 m, un-hazed plateau)");
  for (const h of hazes) assert.ok(h > HAZE_FLOOR, "every authored corner sits ABOVE the clamp inside today's room — the corner-to-corner gradient is real, not floor-pinned");
});

// --- spill anchors (from the VOLUME record only) ------------------------------

test("spill anchors: outside every pillar AABB at exactly SPILL_OFFSET_M on the FAR side from the source, face-centred on the other axis; floor + ceiling mounts per relevant edge; aligned source gets no anchor on that axis; count is the formula over the records; mount heights derive from WALL_TOP", () => {
  const pillars = collisionVolumes.filter((v) => v.kind === "pillar");
  // The matrix's "both sources" leg: the authored placement PLUS the
  // synthetic B1 at an authored slot id (the 2.2 injected-placement idiom).
  const sources = [
    ...cabinetPlacements.map((p) => ({ id: p.volumeId, center: placementGeometry(p.slotId).center })),
    { id: "B1-synthetic", center: placementGeometry("B1").center },
  ];
  for (const src of sources) {
    for (const v of pillars) {
      const anchors = spillAnchors(src.center, v);
      const cx = (v.min.x + v.max.x) / 2;
      const cz = (v.min.z + v.max.z) / 2;
      const relevantEdges = (src.center.x === cx ? 0 : 1) + (src.center.z === cz ? 0 : 1);
      assert.equal(anchors.length, 2 * relevantEdges, `two mounts (floor + ceiling) per relevant edge for ${src.id} around ${v.id} — the count is the formula over the record`);
      for (const a of anchors) {
        assert.ok(
          a.x < v.min.x || a.x > v.max.x || a.z < v.min.z || a.z > v.max.z,
          `anchor (${a.x}, ${a.z}) sits OUTSIDE ${v.id}'s AABB (an anchor inside the blocker is the sign-flip bug)`,
        );
        const pastXMax = Math.abs(a.x - (v.max.x + SPILL_OFFSET_M)) < 1e-12;
        const pastXMin = Math.abs(a.x - (v.min.x - SPILL_OFFSET_M)) < 1e-12;
        const pastZMax = Math.abs(a.z - (v.max.z + SPILL_OFFSET_M)) < 1e-12;
        const pastZMin = Math.abs(a.z - (v.min.z - SPILL_OFFSET_M)) < 1e-12;
        assert.ok(pastXMax || pastXMin || pastZMax || pastZMin, `anchor (${a.x}, ${a.z}) sits exactly SPILL_OFFSET_M past a face`);
        // Far side from the source: the offset points AWAY from the source.
        if (pastXMax) assert.ok(src.center.x < cx, "the +X face anchors because the source is on the -X side (far side from source)");
        if (pastXMin) assert.ok(src.center.x > cx, "and vice versa for -X");
        if (pastZMax) assert.ok(src.center.z < cz, "the +Z face anchors because the source is on the -Z side");
        if (pastZMin) assert.ok(src.center.z > cz, "and vice versa for -Z");
        // Face-centred on the other axis.
        if (pastXMax || pastXMin) assert.ok(Math.abs(a.z - cz) < 1e-12, "x-offset anchors are centred on the face along Z");
        else assert.ok(Math.abs(a.x - cx) < 1e-12, "z-offset anchors are centred on the face along X");
        assert.ok(a.mount === "floor" || a.mount === "ceiling", "the mount kind is one of the two authored mounts");
      }
      const mounts = new Set(anchors.map((a) => a.mount));
      assert.ok(mounts.has("floor") && mounts.has("ceiling"), "every relevant edge carries BOTH the floor-sheen and the ceiling-bounce mount");
    }
  }
  // The exactly-aligned source: no anchor on the aligned axis (the bleed
  // would be symmetric — discriminated leg, mutation: an unconditional
  // push on the aligned axis reds this).
  const v0 = pillars[0]!;
  const aligned = spillAnchors({ x: (v0.min.x + v0.max.x) / 2, z: (v0.min.z + v0.max.z) / 2 }, v0);
  assert.equal(aligned.length, 0, "a source exactly at the volume centre gets no anchors at all");
  const halfAligned = spillAnchors({ x: (v0.min.x + v0.max.x) / 2, z: -100 }, v0);
  assert.equal(halfAligned.length, 2, "aligned on X, unaligned on Z: exactly one face pair (the aligned axis contributes nothing)");
  assert.ok(halfAligned.every((a) => Math.abs(a.x - (v0.min.x + v0.max.x) / 2) < 1e-12), "and it is the Z-face anchor, face-centred on X");
  // Mount heights ride the authored WALL_TOP, never a retyped 3.0.
  assert.equal(spillMountY("floor"), SPILL_FLOOR_MOUNT_M, "floor mount height is the labelled constant");
  assert.equal(spillMountY("ceiling"), WALL_TOP - SPILL_CEILING_INSET_M, "ceiling mount DERIVES the authored WALL_TOP");
});

// --- blind-spot gradient (AC2/AC3): the ordering survives the sightline break

test("blind-spot gradient: at an aisle point BEHIND pillar-2 where the occlusion.test.ts sightline idiom says B0's direct sight is broken, the two machines' spill-glow intensities order by source distance EXACTLY as on open floor — the proximity gradient survives where sound is occluded (AC2/AC3; B1 is the synthetic second placement on an authored slot id, the manager.test.ts twoPlacements idiom)", () => {
  const g0 = placementGeometry("B0").center;
  const g1 = placementGeometry("B1").center; // authored slot id, unoccupied — the synthetic second source
  const pillar2 = collisionVolumes.find((v) => v.id === "pillar-2")!;
  // The ear: front-right aisle, behind pillar-2 from B0's side.
  const ear = { x: 7.0, z: 5.5 };
  assert.ok(Math.abs(ear.x) < INTERIOR.width / 2 && Math.abs(ear.z) < INTERIOR.depth / 2, "the ear is inside the authored room");
  assert.deepEqual(blockedBy(ear.x, ear.z, g0.x, g0.z), ["pillar-2"], "the ear's direct SIGHT of B0 breaks on exactly pillar-2 — this is the blind spot where the audio occludes (the sightline idiom, test-local)");
  assert.deepEqual(blockedBy(ear.x, ear.z, g1.x, g1.z), [], "the near machine is in plain sight from there — only the far one is occluded (the discriminated leg)");
  // Open-floor control point: both sightlines clear, same side of the pillar.
  const open = { x: 8.0, z: 5.5 };
  assert.deepEqual(blockedBy(open.x, open.z, g0.x, g0.z), [], "control: B0 in clear sight on the open floor");
  assert.deepEqual(blockedBy(open.x, open.z, g1.x, g1.z), [], "control: B1 too");
  // Spill-glow intensities: every bleed node rides its SOURCE cabinet's
  // nominal x pulse x haze (the main.ts wiring — pinned at the source in
  // main-glue); the ear compares two sources' glows through the pillar.
  const glowAt = (px: number, pz: number, sx: number, sz: number): number =>
    SPILL_INTENSITY * glowPulse(0) * hazeFactor(dist(px, pz, sx, sz));
  // Both legs strictly inside the sloped region (not the plateau, not the
  // floor) — otherwise an ordering pin would be vacuous.
  const earHaze0 = hazeFactor(dist(ear.x, ear.z, g0.x, g0.z));
  const earHaze1 = hazeFactor(dist(ear.x, ear.z, g1.x, g1.z));
  const openHaze0 = hazeFactor(dist(open.x, open.z, g0.x, g0.z));
  const openHaze1 = hazeFactor(dist(open.x, open.z, g1.x, g1.z));
  for (const h of [earHaze0, earHaze1, openHaze0, openHaze1]) {
    assert.ok(h < 1 && h > HAZE_FLOOR, "every fixture distance sits strictly in the hazed, un-clamped region — the ordering below is the law's gradient, not a plateau tie");
  }
  const earOrder = glowAt(ear.x, ear.z, g1.x, g1.z) > glowAt(ear.x, ear.z, g0.x, g0.z);
  const openOrder = glowAt(open.x, open.z, g1.x, g1.z) > glowAt(open.x, open.z, g0.x, g0.z);
  assert.ok(earOrder, "behind the pillar the NEARER machine (B1) glows strictly brighter — the gradient is felt where sound is occluded");
  assert.equal(earOrder, openOrder, "the ordering IDENTICAL to the open-floor control (AC3: the same gradient shape on both sides of the blocker)");
  // The bleed nodes themselves: both sources mount a node on pillar-2's
  // +Z face (the side the ear stands behind) — the tier physically puts
  // light into the shadow the occluder casts.
  const a0 = spillAnchors(g0, pillar2).filter((a) => a.z > pillar2.max.z);
  const a1 = spillAnchors(g1, pillar2).filter((a) => a.z > pillar2.max.z);
  assert.ok(a0.length >= 1 && a1.length >= 1, "both cabinets bleed onto the ear's side of pillar-2");
  assert.ok(a0.every((a) => ear.z > a.z), "the ear stands past the +Z bleed mounts (in the geometric shadow, lit by authored spill)");
});

// --- glow pulse + the owner-fixed flash law -----------------------------------

test("attract pulse: over one full phase cycle the multiplier stays in [GLOW_PULSE_FLOOR, 1], never 0, swells gently (rise then one fall), peaks at 1 EXACTLY at half the cycle, starts at the floor EXACTLY, and repeats every phase cycle — exactly ONE gentle cycle (I/O matrix Attract-pulse row)", () => {
  const values: number[] = [];
  for (let phase = 0; phase < CABINET_PHASE_CYCLE_TICKS; phase++) {
    const v = glowPulse(phase);
    assert.ok(v >= GLOW_PULSE_FLOOR && v <= 1, `phase ${phase}: inside [floor, 1]`);
    assert.notEqual(v, 0, "never black — always glowing (AD-27: liveness tiers invisible, machines stay lit)");
    values.push(v);
  }
  assert.equal(values[0], GLOW_PULSE_FLOOR, "cycle start sits at the floor EXACTLY");
  assert.equal(values[GLOW_PULSE_PERIOD_TICKS], 1, "half a cycle up (phase 120): the peak 1 EXACTLY");
  let peaks = 0;
  for (let i = 1; i < CABINET_PHASE_CYCLE_TICKS - 1; i++) {
    if (values[i]! > values[i - 1]! && values[i]! >= values[i + 1]!) peaks += 1;
  }
  assert.equal(peaks, 1, "exactly one local maximum over the cycle — one gentle swell, not a flutter (the AC5 pin)");
  for (let i = 1; i <= GLOW_PULSE_PERIOD_TICKS; i++) assert.ok(values[i]! >= values[i - 1]!, `rise leg: non-decreasing to the peak (phase ${i})`);
  for (let i = GLOW_PULSE_PERIOD_TICKS + 1; i < CABINET_PHASE_CYCLE_TICKS; i++) assert.ok(values[i]! <= values[i - 1]!, `fall leg: non-increasing back to the floor (phase ${i})`);
  assert.equal(glowPulse(CABINET_PHASE_CYCLE_TICKS), glowPulse(0), "the multiplier repeats on the phase cycle (the runtime's phase counter already wraps mod 240)");
  assert.equal(glowPulse(-1), glowPulse(CABINET_PHASE_CYCLE_TICKS - 1), "negative inputs wrap (the pure law never depends on a sign convention)");
});

test("flash-rate law shape (NFR-9, owner-fixed, used as given): the authored pulse is 0.5 Hz, inside the 3/sec ceiling; the guard DISCRIMINATES — a 15-tick flicker fails it (the L2 machine probe lands 3.7)", () => {
  assert.equal(flashRateHz(GLOW_PULSE_PERIOD_TICKS), 0.5, "0.5 Hz — 60/120 literal (the I/O matrix law-shape pin)");
  assert.equal(flashRateHz(GLOW_PULSE_PERIOD_TICKS) <= FLASH_RATE_CEILING_PER_SEC, true, "inside the owner-fixed ceiling");
  assert.equal(flashRateCompliant(GLOW_PULSE_PERIOD_TICKS), true, "the authored pulse complies");
  assert.equal(flashRateHz(15), 4, "a 15-tick period would be 4/sec");
  assert.equal(flashRateCompliant(15), false, "and the guard rejects it (mutation: a pulse period under 20 ticks reddens here, not at the smoke)");
});

// --- determinism twin (mirrors budget.test.ts:152-166) ------------------------

test("determinism twin: the same phase inputs replayed twice give the identical multiplier sequence, and the volume/placement records are read, never rewritten", () => {
  const phases = [0, 7, 63, 120, 121, 239, 240, 999];
  const before = JSON.stringify({ volumes: collisionVolumes, placements: cabinetPlacements });
  const one = phases.map((p) => glowPulse(p));
  const two = phases.map((p) => glowPulse(p));
  assert.deepEqual(one, two, "identical inputs replay byte-identical (a replay reproduces the identical glow, AD-3)");
  const anchorsOne = cabinetPlacements.flatMap((p) => spillAnchors(placementGeometry(p.slotId).center, collisionVolumes.find((v) => v.id === "pillar-1")!));
  const anchorsTwo = cabinetPlacements.flatMap((p) => spillAnchors(placementGeometry(p.slotId).center, collisionVolumes.find((v) => v.id === "pillar-1")!));
  assert.deepEqual(anchorsOne, anchorsTwo, "anchors replay identically too");
  assert.equal(JSON.stringify({ volumes: collisionVolumes, placements: cabinetPlacements }), before, "the tier reads the authored records, never touches them (AD-23 posture)");
});

// --- the two source scans (AC4 asymmetry, AC7 clock) ---------------------------

test("AD-3: no wall-clock identifiers in ANY core/room source — readdir-scanned, atmosphere.ts enrolled automatically (mirrors the manager.test.ts scan; mutation: plant Date.now() in atmosphere.ts and THIS pin reddens, AC7)", () => {
  const files = readdirSync(ROOM_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .sort();
  assert.ok(files.includes("atmosphere.ts") && files.length >= 9, `the enumeration sees the real sources (${files.length}) — the new atmosphere.ts is enrolled by construction, not by hand (the manager.test.ts:928 idiom)`);
  for (const file of files) {
    const src = readFileSync(path.join(ROOM_DIR, file), "utf8")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const banned of [/\bDate\b/, /\bperformance\b/, /Math\.random/]) {
      assert.ok(!banned.test(src), `${file} carries no wall-clock identifier ${String(banned)} (glow derives solely from tick state + authored records)`);
    }
    for (const host of [/AudioContext/, /webkitAudioContext/, /OfflineAudioContext/, /\bdocument\b/, /\bwindow\b/]) {
      assert.ok(!host.test(src), `${file} names no host interface/DOM surface ${String(host)} (the room tier stays headless, fake-seam testable)`);
    }
    const clockReads = src.match(/currentTime/g) ?? [];
    assert.equal(clockReads.length, 0, `${file}: the room law path never sees time`);
  }
});

test("AC4 asymmetry by construction: atmosphere.ts imports NOTHING from core/audio (no occlusion raycast, no occlusion module, no three import, no hex literal hue), and main.ts's atmosphere wiring adds no audio import — the visual tier is authored around the SAME blocker records, never folded into the audio mechanism", () => {
  const strip = (s: string): string => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const atmoSrc = strip(readFileSync(path.join(ROOM_DIR, "atmosphere.ts"), "utf8"));
  for (const banned of ["../audio/", "core/audio", "occlusion", "occlusionIds", "OCCLUDER_KINDS", "segHitsRect", "raycast", "Panner"]) {
    assert.ok(!atmoSrc.includes(banned), `atmosphere.ts names no ${banned} surface — one geometry source, two mechanisms (AC2 asymmetry by design)`);
  }
  assert.ok(!/from\s+"three"/.test(atmoSrc), 'atmosphere.ts imports no "three" (the injected-seam idiom — fakeThree needs no extension)');
  assert.ok(!/0x[0-9a-fA-F]{6}/.test(atmoSrc), "no hex literal anywhere: the tier reuses the placement's marquee hue — no new hue needs a tokens.ts home (hue-home guard stays green, UX-DR1)");
  // The main.ts side of the same law: the atmosphere import block names no
  // audio surface, and the file's core/audio imports stay the ONE 2.1
  // manager (the wiring adds none).
  const mainSrc = readFileSync(path.join(ROOM_DIR, "..", "main.ts"), "utf8");
  const atmoImport = mainSrc.match(/import \{[^}]*\} from "\.\/room\/atmosphere\.ts";/);
  assert.ok(atmoImport, "main.ts imports the tier at the device edge");
  assert.ok(!/audio|occlusion/i.test(atmoImport[0]!), "the atmosphere import statement itself names no audio/occlusion surface");
  assert.equal((mainSrc.match(/from "\.\/audio\/[^"]+"/g) ?? []).length, 1, 'main.ts imports exactly ONE core/audio module (2.1\'s manager) — the 2.3 wiring adds none');
});
