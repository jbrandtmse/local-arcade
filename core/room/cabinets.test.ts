// Story 1.4 pins: the ONE authored stand-up shell (Moon Patrol's, slot B0)
// as data — the placement record, the volume entry DERIVED from it (one
// geometry source), the placement geometry read off the slot record, the
// coin-door state + toggle + exact closed/open pose law (axis-swap math, no
// trig FP), the attract-phase + paint-step determinism laws, the marquee/
// screen painter fit laws on the fake-measure idiom (cap never shrinks; the
// pre-authorized letter-spacing floor does the tightening; too-long titles
// die loudly), scan-band liveness (equal steps paint identical pixels, +30
// ticks drifts the band), repaint-into-the-same-canvas, and the Rule-1
// integration row: scripted walk from ENTRY_SPAWN -> target cabinet-B0 -> E
// flips the coin door the SAME tick, closed again, two runs identical.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CABINET_PHASE_CYCLE_TICKS,
  MARQUEE_CAP_M,
  MARQUEE_LETTER_SPACING_EM_FLOOR,
  SCREEN_ATTRACT_CAP_M,
  SHELL,
  SHELL_PART_MESHES,
  SCREEN_PAINT_STEP_TICKS,
  cabinetAABB,
  cabinetPlacements,
  coinDoorOpen,
  coinDoorPose,
  createCabinetRuntime,
  placementByVolumeId,
  placementGeometry,
  screenPaintStep,
  stepCabinetPhase,
  toggleCoinDoor,
  type CabinetRuntime,
} from "./cabinets.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./collision-volumes.ts";
import { wallSlots } from "./slot-config.ts";
import { GLOW_CYAN, GLOW_MARQUEE } from "./tokens.ts";
import { createGameInstance, math, type TickInput } from "../contract/index.ts";
import { createKernelLoop } from "../loop.ts";
import { createSeatService, type SeatKeyMap } from "../seat.ts";
import { MOUSE_SENSITIVITY, createPlayerController } from "../player.ts";
import type { DeviceView } from "../input/index.ts";
import { gameRegistry } from "../../generated/game-registry.ts";
import {
  MARQUEE_LINE_PITCH_RATIO,
  MARQUEE_MARGIN_PX,
  SCREEN_BAND_WIDTH_RATIO,
  SCREEN_EDGE_RATIO,
  SCREEN_SCAN_AREA_PX,
  SCREEN_SCAN_DRIFT_PX,
  SCREEN_SCAN_PITCH_PX,
  SCREEN_SCAN_ROWS,
  SCREEN_SCAN_THICK_PX,
  SURFACE_PX_PER_M,
  compositeScreen,
  paintMarquee,
  paintScreen,
  repaintScreen,
  type PaintContext,
  type PaintSurface,
} from "./surfaces.ts";

const EPS = 1e-12;

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

// --- the placement record + the derived volume entry -------------------------

test("exactly one placement record: Moon Patrol's shell in slot B0 with title + screen zones and the mockup's hue families (AC1)", () => {
  assert.equal(cabinetPlacements.length, 1, "this story authors exactly one shell");
  const p = cabinetPlacements[0]!;
  assert.equal(p.volumeId, "cabinet-B0");
  assert.equal(p.slotId, "B0");
  assert.equal(p.title, "MOON PATROL"); // the mockup's marquee lettering; title record ONLY (AD-24)
  assert.deepEqual(p.screenZones, { attract: "MOON PATROL", next: "NEXT", score: [] });
  assert.ok(p.screenZones.score.length === 0, "the score zone is honestly empty until scores exist (1.8)");
  assert.equal(p.hue, GLOW_CYAN, "attract title + halo carry the machine's glow family (mockup .attract)");
  assert.equal(p.marqueeHue, GLOW_MARQUEE, "marquee + NEXT carry DESIGN's amber (the token name is the fiction)");
  assert.ok(wallSlots.some((s) => s.id === p.slotId), "the shell stands on an authored Wall Slot; slot config stays unchanged");
  assert.equal(SHELL_PART_MESHES, 6, "six part meshes per shell (bar, face, bezel, screen, door, slot)");
});

test("the collision list derives its cabinet entry from the placement record — exact AABB, kind grammar, never hand-copied (AC1, one geometry source)", () => {
  const p = cabinetPlacements[0]!;
  const entries = collisionVolumes.filter((v) => v.kind === "cabinet");
  assert.equal(entries.length, cabinetPlacements.length, "one entry per placement, no extras");
  const v = collisionVolumes.find((c) => c.id === p.volumeId);
  assert.ok(v, "the placement's volumeId is IN the one list");
  const box = cabinetAABB(p);
  assert.deepEqual(v.min, box.min, "the entry's min is the placement's derived AABB");
  assert.deepEqual(v.max, box.max, "the entry's max is the placement's derived AABB");
  assert.ok(near(v.min.x, -4.5) && near(v.max.x, -3.9), "half the 0.60m body width off the B0 centre line");
  assert.ok(near(v.min.z, -6.15) && near(v.max.z, -5.55), "body depth stands from the wall line to the front face");
  assert.ok(near(v.min.y, 0) && near(v.max.y, SHELL.body.height), "stand-up height from the floor");
  assert.equal(v.blocksMovement, true, "the cabinet body blocks movement (the 1.2 resolver, no new code)");
  assert.equal(v.targetable, true, "and is targetable — the E-openable coin door rides that leg");
  assert.throws(() => placementByVolumeId("cabinet-B7"), /no cabinet placement/);
});

test("placement geometry derives from the slot record (coord-free): center, facing, visitor-right, and the front plane (AC1)", () => {
  const slot = wallSlots.find((s) => s.id === "B0")!;
  const g = placementGeometry("B0");
  assert.deepEqual(g.center, { x: slot.center.x, z: slot.center.z });
  assert.deepEqual(g.facing, { x: slot.facing.x, z: slot.facing.z });
  assert.deepEqual(g.right, { x: 1, z: 0 }, "facing +Z -> visitor right is +X (up x facing)");
  assert.ok(near(g.front.x, slot.center.x) && near(g.front.z, slot.center.z + SHELL.body.depth / 2), "front plane at half body depth");
  assert.ok(near(g.front.z, -5.55), "B0 front plane z (the face every part mounts on)");
  assert.throws(() => placementGeometry("Z9"), /does not exist/);
});

// --- coin-door state + pose law ----------------------------------------------

test("runtime: every placement starts with its coin door closed; the toggle flips it; an unknown volume id dies loudly (AC3)", () => {
  const rt = createCabinetRuntime();
  for (const p of cabinetPlacements) {
    assert.equal(coinDoorOpen(rt, p.volumeId), false, `${p.volumeId} starts closed`);
    toggleCoinDoor(rt, p.volumeId);
    assert.equal(coinDoorOpen(rt, p.volumeId), true, "E toggles open");
    toggleCoinDoor(rt, p.volumeId);
    assert.equal(coinDoorOpen(rt, p.volumeId), false, "E toggles closed again");
  }
  assert.throws(() => toggleCoinDoor(rt, "cabinet-B7"), /no cabinet volume/);
  // Hermeticity: mutating one runtime must leave every other untouched —
  // an object-identity check alone would pass even if they shared state.
  const other = createCabinetRuntime();
  rt.phase = 5;
  toggleCoinDoor(rt, cabinetPlacements[0]!.volumeId);
  assert.equal(other.phase, 0, "a fresh runtime's phase is its own (hermetic, order-free)");
  assert.equal(coinDoorOpen(other, cabinetPlacements[0]!.volumeId), false, "a fresh runtime's coin door is its own");
});

test("the coin-door pose law is exact, deterministic axis-swap math: closed flush on the front face, open swung 90 deg out about the visitor-left hinge (AC3)", () => {
  // Closed: panel centred half its thickness proud of the front plane.
  const closed = coinDoorPose("cabinet-B0", false);
  assert.ok(near(closed.panel.x, -4.2) && near(closed.panel.y, SHELL.coinDoor.centerY) && near(closed.panel.z, -5.54), `closed panel ${JSON.stringify(closed.panel)}`);
  assert.ok(near(closed.panel.yaw, 0), "B0 faces +Z -> closed yaw 0");
  // The coin slot rides the door (it is the mockup's .coindoor .slot): closed
  // proud of the panel, and it swings with it.
  assert.ok(near(closed.slot.x, -4.2) && near(closed.slot.y, SHELL.coinSlot.centerY) && near(closed.slot.z, -5.55 + SHELL.coinDoor.thickness + SHELL.coinSlot.thickness / 2), "slot sits on the panel face");
  // Open: 90 deg about the panel's visitor-left hinge (-4.33, -5.54): the
  // exact swap (dx,dz) -> (-dz,dx), no trig.
  const open = coinDoorPose("cabinet-B0", true);
  assert.ok(near(open.panel.x, -4.33) && near(open.panel.y, SHELL.coinDoor.centerY) && near(open.panel.z, -5.41), `open panel ${JSON.stringify(open.panel)}`);
  assert.ok(near(open.panel.yaw, -math.HALF_PI), "open yaw = closed yaw - 90 deg");
  assert.ok(near(open.slot.x, -4.343) && near(open.slot.z, -5.41), "the slot swung to its open pose with the panel");
  // Determinism: the law is a pure function of (volumeId, open).
  assert.deepEqual(coinDoorPose("cabinet-B0", true), open);
});

// --- attract phase + paint-step laws -----------------------------------------

test("phase + paint-step: the cycle wraps at the authored tick count, the step is phase/STEP, and equal tick counts land on equal steps (AC5 determinism)", () => {
  const a = createCabinetRuntime();
  for (let i = 0; i < 250; i++) stepCabinetPhase(a, 1);
  assert.equal(a.phase, 250 % CABINET_PHASE_CYCLE_TICKS, "phase mod cycle");
  const b = createCabinetRuntime();
  stepCabinetPhase(b, 30); // one 30-tick step
  assert.equal(screenPaintStep(b), 30 / SCREEN_PAINT_STEP_TICKS, "30 ticks is 3 paint steps (a dead screen fails the liveness row)");
  // Two FRESH runtimes stepped the same 30 ticks, one tick at a time: equal
  // tick counts from equal state must paint equal step transcripts.
  const c = createCabinetRuntime();
  const e = createCabinetRuntime();
  const transcriptC: number[] = [];
  const transcriptE: number[] = [];
  for (let i = 0; i < 30; i++) {
    stepCabinetPhase(c, 1);
    stepCabinetPhase(e, 1);
    transcriptC.push(screenPaintStep(c));
    transcriptE.push(screenPaintStep(e));
  }
  assert.deepEqual(transcriptC, transcriptE, "equal tick counts paint equal step transcripts");
  assert.equal(screenPaintStep(c), screenPaintStep(b), "30x1 ticks lands where 1x30 ticks lands (step equality)");
  // The liveness row: 30 more ticks on the same runtime moves the paint.
  const stepBefore = screenPaintStep(c);
  stepCabinetPhase(c, 30);
  assert.notEqual(screenPaintStep(c), stepBefore, "+30 ticks changes the paint step (the liveness row)");
  // The 250-tick runtime keeps cycling mod the cycle: 250+30 = 280 -> phase 40.
  stepCabinetPhase(a, 30);
  assert.equal(screenPaintStep(a), 40 / SCREEN_PAINT_STEP_TICKS, "phase stays mod the cycle past the wrap");
  // A full cycle returns the phase (and every step) to its start.
  const d = createCabinetRuntime();
  stepCabinetPhase(d, CABINET_PHASE_CYCLE_TICKS);
  assert.equal(d.phase, 0, "the cycle wraps");
  assert.ok(CABINET_PHASE_CYCLE_TICKS % SCREEN_PAINT_STEP_TICKS === 0, "steps tile the cycle evenly (no ragged last step)");
});

// --- painter fakes (the 1.3 fake-measure idiom, letterSpacing-aware) ---------

interface RectRec {
  style: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TextRec {
  text: string;
  x: number;
  y: number;
  w: number; // natural width AT THE SET FONT (measureText ignores letterSpacing by design)
  fontPx: number; // the px size in the font string at fillText time (the cap-never-shrinks pin reads this, not the width proxy)
  lsEm: number; // the spacing the painter set for this line
  style: string;
}

function fontPxOf(font: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  if (!m) throw new Error("fake painter: font string carries no px size");
  return Number(m[1]);
}

interface DrawRec {
  src: unknown;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

function fakePainter() {
  const sizes: [number, number][] = [];
  const rects: RectRec[] = [];
  const texts: TextRec[] = [];
  const draws: DrawRec[] = [];
  const factory = (width: number, height: number): PaintSurface => {
    sizes.push([width, height]);
    const ctx: PaintContext = {
      fillStyle: "",
      font: "",
      textAlign: "",
      letterSpacing: "",
      fillRect(x, y, w, h) {
        rects.push({ style: String(ctx.fillStyle), x, y, w, h });
      },
      drawImage(source, dx, dy, dw, dh) {
        draws.push({ src: source, dx, dy, dw, dh });
      },
      fillText(text, x, y) {
        texts.push({
          text,
          x,
          y,
          w: ctx.measureText(text).width,
          fontPx: fontPxOf(ctx.font),
          lsEm: parseFloat(String(ctx.letterSpacing).replace("em", "")),
          style: String(ctx.fillStyle),
        });
      },
      // 0.92em condensed advance — the deterministic fake metric shared with
      // surfaces.test.ts / scene.test.ts (rework pass 1 idiom).
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
    };
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  return { factory, sizes, rects, texts, draws, reset: () => { rects.length = 0; texts.length = 0; draws.length = 0; } };
}

const CAP_PX = Math.round(MARQUEE_CAP_M * SURFACE_PX_PER_M);

// The derived cap pins above read the constant itself, so this equality is
// the only pin against silent drift of the DESIGN contract value.
test("the marquee cap constant IS the 0.18m contract value (AC2)", () => {
  assert.equal(MARQUEE_CAP_M, 0.18, "DESIGN typography frontmatter: marquee cap floor 0.18m");
});

test("marquee painter: exactly the title's words stacked at the 0.18m CONTRACT cap, tightened only by the pre-authorized letter-spacing floor, never shrunk (AC2)", () => {
  const f = fakePainter();
  const p = cabinetPlacements[0]!;
  paintMarquee(f.factory, p.title, "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height);
  assert.deepEqual(f.sizes[0], [Math.round(SHELL.marquee.width * SURFACE_PX_PER_M), Math.round(SHELL.marquee.height * SURFACE_PX_PER_M)], "canvas follows the bar metres (mesh aspect == texture aspect)");
  assert.deepEqual(f.texts.map((t) => t.text), ["MOON", "PATROL"], "lettering is exactly the title record's words");
  for (const t of f.texts) {
    assert.ok(t.style === "#ffc46b", "lettering uses the injected marquee-hue colour");
    assert.equal(t.fontPx, CAP_PX, "the line paints AT the cap-floor font size (never shrunk to fit)");
    assert.ok(t.w >= CAP_PX, "cap height stays at the 0.18m floor (never shrunk)");
    // The fit law: whatever spacing was set sits inside [floor, 0], and the
    // SPACED width (natural + gaps x ls x cap) fits the usable canvas width.
    assert.ok(t.lsEm <= 0 && t.lsEm >= MARQUEE_LETTER_SPACING_EM_FLOOR, `letter-spacing ${t.lsEm}em within the pre-authorized floor`);
    const spaced = t.w + (t.text.length - 1) * t.lsEm * CAP_PX;
    assert.ok(spaced <= f.sizes[0]![0] - 2 * MARQUEE_MARGIN_PX + 1e-9, `spaced line "${t.text}" (${spaced}px) fits the bar minus margins`);
  }
  assert.ok(f.rects.length === 1 && f.rects[0]!.style === "#15110e", "the ground is the injected background colour");
});

test("marquee/screen fit laws die loudly: an over-long title past the spacing floor, an empty title, and an over-tall stack all throw instead of clipping (AC2, paintFlyer sibling)", () => {
  const f = fakePainter();
  assert.throws(
    () => paintMarquee(f.factory, "SUPERMONSTERMASH", "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height),
    /past the .*floor/,
    "a 16-char word at the 0.18m cap cannot fit the body-width bar even at the floor",
  );
  assert.throws(() => paintMarquee(f.factory, "   ", "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height), /no words/);
  assert.throws(() => paintMarquee(f.factory, "MOON PATROL STAR", "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height), /do not fit the/);
});

test("screen painter: attract block, scan band, NEXT at the 0.18m minimum; the band drift is a pure function of the paint step (equal steps identical, +3 steps shifted), score zone renders nothing while empty (AC5)", () => {
  const f = fakePainter();
  const p = cabinetPlacements[0]!;
  paintScreen(f.factory, p.screenZones, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.width, SHELL.screen.height);
  assert.deepEqual(f.sizes[0], [Math.round(SHELL.screen.width * SURFACE_PX_PER_M), Math.round(SHELL.screen.height * SURFACE_PX_PER_M)], "screen canvas at the face metres");
  assert.deepEqual(f.texts.map((t) => t.text), ["MOON", "PATROL", "NEXT"], "attract words then NEXT — the score zone paints nothing while empty");
  const nextText = f.texts.find((t) => t.text === "NEXT")!;
  assert.ok(nextText.style === "#ffc46b", "NEXT carries the marquee-amber family (mockup .next)");
  assert.equal(nextText.fontPx, CAP_PX, "NEXT paints AT the 0.18m authored minimum font size");
  assert.ok(nextText.w >= CAP_PX, "NEXT paints at the 0.18m authored minimum");
  const attractPx = Math.round(SCREEN_ATTRACT_CAP_M * SURFACE_PX_PER_M);
  for (const t of f.texts.filter((t2) => t2.text !== "NEXT")) {
    assert.equal(t.fontPx, attractPx, "attract words paint AT the authored attract cap");
  }
  // The constant-IS-the-value drift pins (the marquee-cap/CARPET_PATTERN
  // idiom): a derived pin alone cannot see its own constant move.
  assert.equal(SCREEN_EDGE_RATIO, 0.02, "the screen edge inset IS the 2% of face height the painter and pins share");
  assert.equal(SCREEN_BAND_WIDTH_RATIO, 0.4, "the scan band IS 0.4 of the face width (mockup detail, centered)");
  const faceHpx = Math.round(SHELL.screen.height * SURFACE_PX_PER_M);
  assert.ok(nextText.y === faceHpx - Math.round(faceHpx * SCREEN_EDGE_RATIO), "NEXT sits on its bottom band baseline");
  // Steady-text law: across paint steps the lettered rows (text AND
  // baseline) are identical — only the scan band moves. A step-dependent
  // text placement fails this while the band pins below stay green.
  const textsAtStep = (step: number): { text: string; y: number }[] => {
    const g2 = fakePainter();
    paintScreen(g2.factory, p.screenZones, step, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.width, SHELL.screen.height);
    return g2.texts.map((t2) => ({ text: t2.text, y: t2.y }));
  };
  assert.deepEqual(textsAtStep(24), textsAtStep(0), "the cycle-wrap step 24 letters identically to step 0 (steady attract law)");
  assert.deepEqual(textsAtStep(7), textsAtStep(13), "attract rows and NEXT never move between paint steps (only the band drifts)");
  // The scan band: SCREEN_SCAN_ROWS lines in the attract hue at the scan pitch.
  const band = f.rects.filter((r) => r.style === "#5bc8ff");
  assert.equal(band.length, SCREEN_SCAN_ROWS, "the band is exactly the authored row count");
  const faceWpx = Math.round(SHELL.screen.width * SURFACE_PX_PER_M);
  for (const r of band) assert.equal(r.w, Math.round(faceWpx * SCREEN_BAND_WIDTH_RATIO), "band rows carry the authored band width");
  const bandAtStep = (step: number): number[] => {
    const g = fakePainter();
    paintScreen(g.factory, p.screenZones, step, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.width, SHELL.screen.height);
    return g.rects.filter((r) => r.style === "#5bc8ff").map((r) => r.y);
  };
  assert.deepEqual(bandAtStep(3), bandAtStep(3), "equal steps paint pixel-identical bands (determinism)");
  assert.equal(bandAtStep(3)[0]! - bandAtStep(0)[0]!, 3 * SCREEN_SCAN_DRIFT_PX, "paint step 3 has drifted the band three drift units (liveness)");
  for (let k = 1; k < band.length; k++) assert.equal(band[k]!.y - band[k - 1]!.y, SCREEN_SCAN_PITCH_PX, "band rows at the authored pitch");
  // Drift law (the AREA/DRIFT pin): across a full cycle the band never
  // snaps backward, and the wrap continues the sawtooth (the step at the
  // cycle edge paints the same first-row y as step 0).
  const cycleSteps = CABINET_PHASE_CYCLE_TICKS / SCREEN_PAINT_STEP_TICKS;
  const firstRowYs: number[] = [];
  for (let k = 0; k <= cycleSteps; k++) firstRowYs.push(bandAtStep(k)[0]!);
  for (let k = 1; k < cycleSteps; k++) {
    assert.ok(firstRowYs[k]! > firstRowYs[k - 1]!, `step ${k}: band row ${firstRowYs[k]} must advance past ${firstRowYs[k - 1]} (no backward snap)`);
  }
  assert.equal(firstRowYs[cycleSteps]!, firstRowYs[0]!, "the cycle wrap continues the drift (paint step 24 == step 0)");
});

// Story 1.8 (AD-28, the 2026-11-24 unattended ruling — measured against THIS
// painter with authored B0 data): with score rows present the fallback face
// YIELDS — the attract title block is not painted, the scan band rises to the
// top margin, and the rows paint at the measured baselines 177/309. The
// authored B0 face fits exactly 2 rows; the 3rd collides with the NEXT floor
// and the throw stays the loud guard for cap bugs (the Core table's cap 2 —
// SCORE_ROW_CAP — is what keeps it unreachable by law). The empty-zone path
// above is the 1.4 law untouched: byte-identical branches, pins unedited.
test("AD-28: score rows present -> the attract block yields, the scan band lives at the top margin, rows sit at the measured baselines 177/309, and the 3rd row collides with NEXT loudly", () => {
  const p = cabinetPlacements[0]!;
  assert.ok(p.screenZones.attract.length > 0, "B0 authors an attract zone — the yield branch is the one under test (an empty attract zone would paint nothing either way)");
  const rows = ["AAA 12345", "BBB 6789"];
  const zones = { ...p.screenZones, score: rows };
  const f = fakePainter();
  paintScreen(f.factory, zones, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.width, SHELL.screen.height);
  assert.deepEqual(f.texts.map((t) => t.text), [...rows, p.screenZones.next.toUpperCase()], "rows then NEXT — no MOON/PATROL: the attract title block yields to the table (mutation: keep painting attract over rows and this reds)");

  const faceHpx = Math.round(SHELL.screen.height * SURFACE_PX_PER_M);
  const edge = Math.round(faceHpx * SCREEN_EDGE_RATIO);
  const attractCap = Math.round(SCREEN_ATTRACT_CAP_M * SURFACE_PX_PER_M);
  const attractPitch = Math.round(attractCap * MARQUEE_LINE_PITCH_RATIO);
  const scanTop = edge; // the band rose to the top margin (AD-28)
  const baselineOf = (i: number): number => scanTop + SCREEN_SCAN_AREA_PX + edge + i * attractPitch + attractCap;
  const rowTexts = f.texts.filter((t) => rows.includes(t.text));
  assert.deepEqual(rowTexts.map((t) => t.y), [baselineOf(0), baselineOf(1)], "row baselines follow the yielded layout formula (derived from the painter's own constants)");
  assert.deepEqual(rowTexts.map((t) => t.y), [177, 309], "the ruling's MEASURED baselines on the B0 face — 177/309");
  const nextTop = faceHpx - edge - Math.round(MARQUEE_CAP_M * SURFACE_PX_PER_M);
  assert.ok(baselineOf(1) <= nextTop, "row 1 clears the NEXT cap block");
  assert.ok(baselineOf(2) > nextTop, "the 3rd baseline would collide with the 0.18m NEXT floor — the measured cap-2 fit law");
  for (const t of rowTexts) {
    assert.equal(t.fontPx, attractCap, "rows paint at the authored attract cap (the yield buys room, not a shrink)");
  }

  // The scan band stays LIVE after the yield: SCREEN_SCAN_ROWS rects rising to
  // the top margin (step 0 sits at scanTop), at the authored thickness/pitch.
  const band = f.rects.filter((r) => r.style === "#5bc8ff");
  assert.equal(band.length, SCREEN_SCAN_ROWS, "the band keeps painting when the attract block yields (the face keeps breathing behind the table)");
  assert.deepEqual(band.map((r) => r.y), Array.from({ length: SCREEN_SCAN_ROWS }, (_, k) => scanTop + k * SCREEN_SCAN_PITCH_PX), "at step 0 the band sits at the top margin (mutation: keep it under the un-painted attract block and this reds)");
  for (const r of band) assert.equal(r.h, SCREEN_SCAN_THICK_PX, "band thickness unchanged by the yield");

  // Steady law for the yielded face: the lettered rows (text AND baseline)
  // are identical across paint steps — only the band drifts.
  const atStep = (step: number): { texts: { text: string; y: number }[]; bandY: number[] } => {
    const g = fakePainter();
    paintScreen(g.factory, zones, step, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.width, SHELL.screen.height);
    return {
      texts: g.texts.map((t) => ({ text: t.text, y: t.y })),
      bandY: g.rects.filter((r) => r.style === "#5bc8ff").map((r) => r.y),
    };
  };
  assert.deepEqual(atStep(24).texts, atStep(0).texts, "rows + NEXT letter identically at the cycle wrap (no attract word ever re-appears behind the table)");
  assert.deepEqual(atStep(7).texts, atStep(13).texts, "the rows never move between paint steps (only the band drifts)");
  assert.equal(atStep(3).bandY[0]! - atStep(0).bandY[0]!, 3 * SCREEN_SCAN_DRIFT_PX, "the band drifts inside its risen area (liveness law intact under the yield)");

  // The collision throw stays the loud guard: a cap bug (3 rows) dies loudly
  // on the 3rd row, exactly where the fit law measured it.
  const g = fakePainter();
  assert.throws(
    () => paintScreen(g.factory, { ...p.screenZones, score: [...rows, "CCC 1"] }, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.width, SHELL.screen.height),
    /score row 2 collides with the NEXT row/,
    "the row/NEXT collision guard is the enforcement behind the table's cap — cap bugs surface, they do not clip (mutation: relax this throw and a 3-row table paints over NEXT)",
  );
});

test("repaint rewrites the SAME canvas — a live screen never grows a second canvas (and the texture-update marker rides that identity in main.ts) (AC5)", () => {
  const f = fakePainter();
  const p = cabinetPlacements[0]!;
  const s = paintScreen(f.factory, p.screenZones, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.width, SHELL.screen.height);
  assert.equal(f.sizes.length, 1, "one canvas from the factory");
  repaintScreen(s, p.screenZones, 3, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.height);
  repaintScreen(s, p.screenZones, 6, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, MARQUEE_CAP_M, SHELL.screen.height);
  assert.equal(f.sizes.length, 1, "repaints never call the factory again");
  assert.ok(f.rects.length >= 1 + SCREEN_SCAN_ROWS * 2, "the canvas was repainted at the new steps");
});

// Story 1.5 composite law (AC5): the game frame letterboxes into the area
// between the edge inset and the NEXT row — uniform min-fit scale, centered,
// equal bars — and the Core still letters the NEXT zone. Every expected
// number derives from the SAME constants compositeScreen reads (no retyped
// pixels the law could drift under).
test("compositeScreen: game frame letterboxed (min-fit, centered, equal bars, aspect intact), NEXT still painted at the cap over the injected background (AC5)", () => {
  const p = cabinetPlacements[0]!;
  const f = fakePainter();
  const game = { width: 640, height: 360 }; // the moon-patrol sim-view size: wide, width-bound fit
  const surface = f.factory(
    Math.round(SHELL.screen.width * SURFACE_PX_PER_M),
    Math.round(SHELL.screen.height * SURFACE_PX_PER_M),
  );
  compositeScreen(surface, p.screenZones, game, "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.screen.height);
  const w = surface.width;
  const h = surface.height;
  const pxPerM = h / SHELL.screen.height;
  const edge = Math.round(h * SCREEN_EDGE_RATIO);
  const nextCap = Math.round(MARQUEE_CAP_M * pxPerM);
  const nextBaseline = h - edge;
  const areaW = w - 2 * edge;
  const areaH = nextBaseline - nextCap - edge;
  const scale = Math.min(areaW / game.width, areaH / game.height);
  const dw = Math.round(game.width * scale);
  const dh = Math.round(game.height * scale);
  assert.equal(f.draws.length, 1, "exactly one blit per composite");
  const d = f.draws[0]!;
  assert.equal(d.src, game, "the blit source IS the game's own presentation canvas");
  assert.equal(d.dw, dw, "blit width from the min-fit law (Math.min flip is red here)");
  assert.equal(d.dh, dh, "blit height from the SAME uniform scale");
  assert.equal(d.dx, edge + Math.round((areaW - dw) / 2), "centered horizontally in the letterbox area");
  assert.equal(d.dy, edge + Math.round((areaH - dh) / 2), "centered vertically in the letterbox area");
  assert.equal(dw, areaW, "a wide frame is width-bound: it fills the area exactly side-to-side");
  assert.ok(dh < areaH, "letterbox bars remain above and below the frame");
  assert.equal(d.dy - edge, nextBaseline - nextCap - (d.dy + dh), "top and bottom bars are equal (the centering law)");
  assert.ok(Math.abs(d.dw * game.height - d.dh * game.width) <= game.width, "uniform scale keeps the frame's aspect intact within rounding");
  assert.ok(f.rects[0] && f.rects[0].style === "#15110e" && f.rects[0].w === w && f.rects[0].h === h, "the injected background fills the whole face before the blit (the bars show through)");
  const next = f.texts.filter((t) => t.text === p.screenZones.next.toUpperCase());
  assert.equal(next.length, 1, "composite letters exactly the NEXT zone (the score zone stays honest-empty until 1.8)");
  assert.equal(next[0]!.y, nextBaseline, "NEXT sits on the same bottom-band baseline drawScreen uses");
  assert.equal(next[0]!.fontPx, nextCap, "NEXT paints at the 0.18m cap on the composite path too");
  assert.ok(next[0]!.style === "#ffc46b", "NEXT carries the injected marquee hue");
});

test("compositeScreen dies loudly when the injected context has no drawImage (the cheap recorder fakes stay valid for the fallback painters only)", () => {
  const p = cabinetPlacements[0]!;
  const bare: PaintSurface = {
    width: 440,
    height: 520,
    getContext: (kind) =>
      kind === "2d"
        ? { fillStyle: "", font: "", textAlign: "", fillRect() {}, fillText() {}, measureText: () => ({ width: 0 }) }
        : null,
  };
  assert.throws(
    () => compositeScreen(bare, p.screenZones, { width: 640, height: 360 }, "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.screen.height),
    /no drawImage/,
  );
});

// --- Rule 1: the real consumer, end to end ------------------------------------

function view(axes: [number, number] = [0, 0], aim: [number, number] = [0, 0], btn: [boolean, boolean] = [false, false]): DeviceView {
  return {
    axes: { forward: axes[0]!, strafe: axes[1]! },
    aim: { dx: aim[0]!, dy: aim[1]! },
    interact: { down: btn[0]!, pressed: btn[1]! },
  };
}

// The whole visit (Story 1.5 law): spawn at ENTRY_SPAWN, aim at B0 through
// the mouse channel, walk until the shell is centred (bounded at 6000 ticks),
// settle (bob eases out — the sit/stand pose law needs a settled pose), then
// the E cycle on the GAME cabinet through the REAL seat service + the REAL
// registry instance: E opens the coin door, E sits (wrapper flips to play on
// the stub seed, visitor teleported to the play pose, targeting still resolves
// B0 from the chair), E stands (pose fields back exactly, door closed, the
// machine back in attract). Off-centre E stays a no-op. The cabinets phase
// steps alongside each player step — the same call order main.ts wires as
// loop systems (player, cabinets), with the seat-routed interact registry
// registered exactly as main.ts does; the loop's own system registry is
// pinned in main-glue.test.ts's source pins, not re-run here.
const MOON_KEYS: SeatKeyMap = {
  axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
  buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
};

function visitSession(): {
  transcriptEnd: ReturnType<ReturnType<typeof createPlayerController>["snapshot"]>;
  doors: Record<string, boolean>;
  phase: number;
  walkTicks: number;
  ticksAtOpen: number;
  modeAfterSit: string;
  playPoseAfterSit: { x: number; z: number; yaw: number; pitch: number };
} {
  const rt: CabinetRuntime = createCabinetRuntime();
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  // the REAL registry entry + wrapper instance, wired exactly as main.ts:
  // kernel-owned TickInput, seat service over (player, runtime). Story
  // 1.6: the seat no longer takes the loop (the patrons system drains and
  // forwards); this session never steps the loop's systems, so no patrons
  // rig is needed — the E-law and the stand-restore pins are synchronous.
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  assert.ok(entry.controls, "the registry entry declares its control vocab (the seat mapping needs it)");
  const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
  const tickInput: TickInput = { controls: {} };
  const loop = createKernelLoop({ now: () => 0 });
  loop.addInstance(entry.id, instance, tickInput);
  const seat = createSeatService({ player, cabinets: rt, seedFn: () => 4242 });
  seat.track({ volumeId: "cabinet-B0", gameId: entry.id, instance, input: tickInput, controls: entry.controls, keys: MOON_KEYS });
  player.registerInteractable("cabinet-B0", (id) => seat.handleInteract(id));
  // aim at the shell's body centre through the MOUSE channel (no state pokes):
  // the controller's facing is (-sin yaw, -cos yaw), so yaw = atan2(-dx, -dz)
  // for the spawn->centre direction, all read off the authored records.
  const g = placementGeometry(cabinetPlacements[0]!.slotId);
  const want = Math.atan2(-(g.center.x - ENTRY_SPAWN.x), -(g.center.z - ENTRY_SPAWN.z));
  const dx = (ENTRY_SPAWN.yaw - want) / MOUSE_SENSITIVITY;
  player.step(1, view([0, 0], [dx, 0]));
  let walkTicks = 0;
  while (player.state.targetId === null && walkTicks < 6000) {
    player.step(1, view([1, 0]));
    stepCabinetPhase(rt, 1);
    walkTicks += 1;
  }
  assert.ok(player.state.targetId === "cabinet-B0", `the shell entered center-of-view (target=${player.state.targetId}) after ${walkTicks} ticks`);
  assert.ok(walkTicks < 6000, "the bounded walk reaches the shell well inside the cap");
  // settle wait (Design Notes: the sit/stand pose-identity law binds on a
  // settled pose): bob amplitude eases out while standing still.
  for (let i = 0; i < 30; i++) {
    player.step(1, view());
    stepCabinetPhase(rt, 1);
  }
  const preSit = { x: player.state.x, z: player.state.z, yaw: player.state.yaw, pitch: player.state.pitch };
  // E opens the coin door THE SAME tick the press lands (handler runs inside
  // player.step, itself a kernel system — AD-15; 1.4 law intact for first press).
  player.step(1, view([0, 0], [0, 0], [true, true]));
  stepCabinetPhase(rt, 1);
  const ticksAtOpen = rt.phase;
  assert.equal(coinDoorOpen(rt, "cabinet-B0"), true, "one E press opens, inside the tick");
  // second E sits: play mode on the stub seed, visitor on the authored play pose.
  player.step(1, view([0, 0], [0, 0], [true, true]));
  const modeAfterSit = instance.mode();
  assert.equal(modeAfterSit, "play", "the second E sits: the wrapper holds play mode with the kernel's stub seed");
  const playPoseAfterSit = { x: player.state.x, z: player.state.z, yaw: player.state.yaw, pitch: player.state.pitch };
  assert.ok(near(playPoseAfterSit.x, -4.2) && near(playPoseAfterSit.z, -4.75), `play pose stands 0.80m in front of the B0 front plane (${JSON.stringify(playPoseAfterSit)})`);
  assert.equal(player.state.targetId, "cabinet-B0", "targeting still resolves the cabinet from the play pose (E routes from the chair)");
  // third E stands: pose restored exactly, door closed, attract in place.
  player.step(1, view([0, 0], [0, 0], [true, true]));
  assert.deepEqual({ x: player.state.x, z: player.state.z, yaw: player.state.yaw, pitch: player.state.pitch }, preSit, "standing restores the pre-sit pose fields exactly");
  assert.equal(coinDoorOpen(rt, "cabinet-B0"), false, "standing closes the coin door");
  assert.equal(instance.mode(), "attract", "the machine returns to attract in place");
  // turn away: no target, E is a silent no-op (the door stays closed).
  player.step(1, view([0, 0], [(2 * Math.PI) / MOUSE_SENSITIVITY / 4, 0]));
  assert.equal(player.state.targetId, null, "a quarter turn drops the target");
  player.step(1, view([0, 0], [0, 0], [true, true]));
  assert.equal(coinDoorOpen(rt, "cabinet-B0"), false, "E with no target changes nothing");
  return {
    transcriptEnd: player.snapshot(),
    doors: { ...rt.coinDoors },
    phase: rt.phase,
    walkTicks,
    ticksAtOpen,
    modeAfterSit,
    playPoseAfterSit,
  };
}

test("Rule 1 integration: scripted visit on the REAL volumes + REAL controller + REAL registry entry — walk to cabinet-B0, E opens the door, E sits (play mode, play pose, targeting held), E stands (pose restored exactly, door closed, attract), off-centre E is a no-op, and two runs are bit-identical (AC4, 1.5 law)", () => {
  const a = visitSession();
  const b = visitSession();
  assert.deepEqual(a.transcriptEnd, b.transcriptEnd, "identical scripted devices -> identical player transcripts");
  assert.deepEqual(a.doors, b.doors, "identical door state");
  assert.equal(a.phase, b.phase, "identical cabinet phase (walk + settle + presses of the system)");
  assert.equal(a.walkTicks, b.walkTicks);
  assert.equal(a.ticksAtOpen, b.ticksAtOpen);
  assert.equal(a.modeAfterSit, "play");
  assert.deepEqual(a.playPoseAfterSit, b.playPoseAfterSit, "the authored play pose is exact and deterministic");
});
