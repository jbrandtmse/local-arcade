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
// Story 2.0 (DW-29 rebuild): the marquee letters the title on ONE line at
// the 0.09 m cap (contract change 4); the screen's 0.18 m NEXT cap lives in
// its own SCREEN_NEXT_CAP_M constant; and the brief's eight verification
// tests run against REAL three geometry at the foot of this file (the
// local-frame containment, the exact side-panel bbox, the two tilts, the
// setback, the emissive pair, the no-body-mesh law, the triangle budget).
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildRoomScene, type RoomScene, type Three } from "./scene.ts";
import {
  CABINET_PHASE_CYCLE_TICKS,
  MARQUEE_CAP_M,
  MARQUEE_LETTER_SPACING_EM_FLOOR,
  SCREEN_ATTRACT_CAP_M,
  SCREEN_NEXT_CAP_M,
  SHELL,
  SHELL_PART_MESHES,
  SIDE_PROFILE,
  SCREEN_PAINT_STEP_TICKS,
  cabinetAABB,
  cabinetPlacements,
  closedYaw,
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
import { ENTRY_SPAWN, WALL_TOP, collisionVolumes } from "./collision-volumes.ts";
import { SPILL_CEILING_INSET_M, SPILL_FLOOR_MOUNT_M, SPILL_OFFSET_M, buildSpillNodes } from "./atmosphere.ts";
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
  paintContactShadow,
  paintControlOverlay,
  paintMarquee,
  paintScreen,
  paintSideArt,
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
  assert.equal(SHELL_PART_MESHES, 28, "28 part meshes per shell (2.0 rebuild: 3 profiled structural meshes, front panel, 2 side-art decals, contact shadow, bezel + live face, overlay + 8 joystick/button/start hardware pieces, marquee face + 2 retainers, 3 grille slats, coin-door frame + reject, and the 2 world-posed coin-door parts \u2014 24 in the group + 4 world)");
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

// Story 2.0 review patch: the brief's three art painters must be OBSERVED,
// not just executed — DW-29 is exactly the realism class a rig full of
// no-op legs lets through. This recorder keeps every fill, arc, transform
// count and gradient stop the painters produce.
function artRecorder(): {
  factory: (w: number, h: number) => PaintSurface;
  sizes: [number, number][];
  rects: { style: string; x: number; y: number; w: number; h: number }[];
  arcs: { x: number; y: number; r: number }[];
  legs: { save: number; restore: number; rotate: number[]; beginPath: number; stroke: number };
  gradStops: [number, string][] | null;
  strokeStyleAtStroke: string | null;
  lineWidthAtStroke: number | null;
} {
  const sizes: [number, number][] = [];
  const rects: { style: string; x: number; y: number; w: number; h: number }[] = [];
  const arcs: { x: number; y: number; r: number }[] = [];
  const legs = { save: 0, restore: 0, rotate: [] as number[], beginPath: 0, stroke: 0 };
  let gradStops: [number, string][] | null = null;
  let strokeStyleAtStroke: string | null = null;
  let lineWidthAtStroke: number | null = null;
  const factory = (width: number, height: number): PaintSurface => {
    sizes.push([width, height]);
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      fillRect(x: number, y: number, w: number, h: number) {
        rects.push({ style: String(ctx.fillStyle), x, y, w, h });
      },
      save() { legs.save++; },
      restore() { legs.restore++; },
      translate() {},
      rotate(a: number) { legs.rotate.push(a); },
      beginPath() { legs.beginPath++; },
      arc(x: number, y: number, r: number) { arcs.push({ x, y, r }); },
      stroke() { legs.stroke++; strokeStyleAtStroke = String(ctx.strokeStyle); lineWidthAtStroke = ctx.lineWidth; },
      createRadialGradient() {
        const stops: [number, string][] = [];
        gradStops = stops;
        return { addColorStop(offset: number, color: string) { stops.push([offset, String(color)]); } };
      },
    } as unknown as PaintContext;
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  return {
    factory, sizes, rects, arcs, legs,
    get gradStops() { return gradStops; },
    get strokeStyleAtStroke() { return strokeStyleAtStroke; },
    get lineWidthAtStroke() { return lineWidthAtStroke; },
  };
}

const CAP_PX = Math.round(MARQUEE_CAP_M * SURFACE_PX_PER_M);
const NEXT_PX = Math.round(SCREEN_NEXT_CAP_M * SURFACE_PX_PER_M);

// The derived cap pins above read the constant itself, so these equalities
// are the only pins against silent drift of the contract values. Story 2.0
// splits the pair: the marquee cap moves to the brief's 0.09m one-line
// floor, the screen's NEXT cap keeps DESIGN's 0.18m minimum by name.
test("the cap constants ARE the contract values: marquee 0.09m (2.0 brief) and screen NEXT 0.18m (AC2)", () => {
  assert.equal(MARQUEE_CAP_M, 0.09, "the 2.0 brief (UX-DR2/UX-DR6): the marquee cap floor on the 0.15 m bar is 0.09 m");
  assert.equal(SCREEN_NEXT_CAP_M, 0.18, "DESIGN typography frontmatter: the screen NEXT cap floor 0.18 m (byte-unchanged by 2.0)");
});

test("closedYaw is the exact yaw law for all four axis-aligned facings and dies on a non-axis facing (2.0 one-source yaw: group placement and the coin-door pose share it)", () => {
  assert.equal(closedYaw({ x: 0, z: 1 }), 0, "back-slot facing yaws 0");
  assert.equal(closedYaw({ x: 1, z: 0 }), Math.PI / 2, "right-wall facing yaws +pi/2");
  assert.equal(closedYaw({ x: 0, z: -1 }), Math.PI, "street-facing yaw pi");
  assert.equal(closedYaw({ x: -1, z: 0 }), -Math.PI / 2, "left-wall facing yaws -pi/2");
  assert.throws(() => closedYaw({ x: 1, z: 1 }), /axis-aligned/, "a non-axis facing is authored-slot grammar broken, never guessed");
});

test("paintSideArt paints the brief's flank art: full ground fill, three diagonal stripes of DIFFERENT widths in the hue pair, one tilted square in the machine hue (brief 4; the DW-29 realism class now has a tripwire)", () => {
  const r = artRecorder();
  const surface = paintSideArt(r.factory, "#gr", "#hue", "#mq", 0.5, 0.7);
  assert.ok(surface.width === 500 && surface.height === 700, "the decal surface is 0.50 x 0.70 m at 1000 px/m");
  assert.equal(r.rects.length, 5, "ground + three stripes + one tilted square, nothing more");
  assert.deepEqual(r.rects[0], { style: "#gr", x: 0, y: 0, w: 500, h: 700 }, "the ground fills the whole panel in the darkened side colour");
  const stripe = (i: number) => r.rects[1 + i]!;
  assert.deepEqual([stripe(0).style, stripe(1).style, stripe(2).style], ["#mq", "#hue", "#mq"], "the stripes alternate marquee hue, machine hue, marquee hue (placement hue families)");
  const stripeH = [stripe(0).h, stripe(1).h, stripe(2).h];
  assert.deepEqual(stripeH, [42, 91, 35], "three stripes of DIFFERENT widths: the authored 0.06 / 0.13 / 0.05 fractions of the 700 px panel");
  assert.ok(stripe(0).w === 1500 && stripe(1).w === 1500 && stripe(2).w === 1500, "each stripe sweeps the whole panel width (one diagonal sweep, 3 x 500 px)");
  const square = r.rects[4]!;
  assert.equal(square.style, "#hue", "the large simple shape rides in the machine hue");
  assert.equal(square.w, 210, "the tilted square is the authored 0.3-of-height side (210 px)");
  assert.equal(square.h, 210, "square, not smeared");
  assert.deepEqual(r.legs.rotate, [0.6, -0.5], "exactly the two authored fixed diagonals, deterministic");
  assert.deepEqual([r.legs.save, r.legs.restore], [2, 2], "transform scopes balance");
});

test("paintControlOverlay paints the dark ground, the four-rect border in the marquee hue, and one stroked ring per control position at the scaled centre (overlay one-source law)", () => {
  const r = artRecorder();
  const rings = [
    { x: -0.13, y: 0, r: 0.035 },
    { x: 0.07, y: 0, r: 0.03 },
    { x: 0.13, y: 0, r: 0.03 },
    { x: 0, y: -0.06, r: 0.025 },
  ];
  paintControlOverlay(r.factory, "#gr", "#bd", rings, 0.562, 0.19);
  assert.deepEqual(r.sizes[0], [562, 190], "the overlay canvas is 0.562 x 0.19 m at 1000 px/m");
  assert.deepEqual(r.rects[0], { style: "#gr", x: 0, y: 0, w: 562, h: 190 }, "dark ground first, the whole sheet");
  const borders = r.rects.slice(1);
  assert.equal(borders.length, 4, "the border is the four-edge rectangle idiom (stroke-free where it can)");
  for (const b of borders) assert.equal(b.style, "#bd", "the border rides the placement marquee hue");
  assert.equal(r.arcs.length, rings.length, "one ring per control position (the scene's CONTROL_RINGS is the one source)");
  for (let i = 0; i < rings.length; i++) {
    const want = { x: 562 / 2 + rings[i]!.x * 1000, y: 190 / 2 + rings[i]!.y * 1000, r: rings[i]!.r * 1000 };
    assert.ok(Math.abs(r.arcs[i]!.x - want.x) < 1e-9 && Math.abs(r.arcs[i]!.y - want.y) < 1e-9 && Math.abs(r.arcs[i]!.r - want.r) < 1e-9, `ring ${String(i)} sits at its metres-scaled centre`);
  }
  assert.deepEqual([r.legs.beginPath, r.legs.stroke], [rings.length, rings.length], "every ring is begun, arc'd and stroked");
  assert.equal(r.strokeStyleAtStroke, "#bd", "the rings stroke in the border hue");
  assert.equal(r.lineWidthAtStroke, 3, "the ring line is the authored 3 px");
});

test("paintContactShadow paints the grounding pool: square sheet, one radial gradient holding ink to 0.55 then fully transparent at the rim (brief 4f alpha law)", () => {
  const r = artRecorder();
  paintContactShadow(r.factory, "#ink", 0.6);
  assert.deepEqual(r.sizes[0], [600, 600], "the shadow sheet is the 0.6 m square at 1000 px/m");
  assert.deepEqual(r.rects.length, 1, "exactly one fill: the gradient over the whole sheet");
  assert.equal(r.rects[0]!.w, 600, "the fill spans the sheet width");
  assert.equal(r.rects[0]!.h, 600, "the fill spans the sheet height");
  assert.deepEqual(r.gradStops, [[0, "#ink"], [0.55, "#ink"], [1, "transparent"]], "ink holds to 0.55, then fades to fully transparent at the rim (the material carries the transparency)");
});

test("the three art painters die loudly on a missing paint-context leg (needLeg guard; the no-drawImage sibling's idiom)", () => {
  const legless = (width: number, height: number): PaintSurface => {
    const ctx = { fillStyle: "", fillRect() {} } as unknown as PaintContext;
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  assert.throws(() => paintSideArt(legless, "#a", "#b", "#c", 0.5, 0.7), /paintSideArt: paint context has no save/);
  assert.throws(() => paintControlOverlay(legless, "#a", "#b", [], 0.562, 0.19), /paintControlOverlay: paint context has no beginPath/);
  assert.throws(() => paintContactShadow(legless, "#a", 0.6), /paintContactShadow: paint context has no createRadialGradient/);
});

test("marquee painter: the title on ONE line at the 0.09m CONTRACT cap, tightened only by the pre-authorized letter-spacing floor, never shrunk (AC2, 2.0 contract change 4)", () => {
  const f = fakePainter();
  const p = cabinetPlacements[0]!;
  paintMarquee(f.factory, p.title, "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height);
  assert.deepEqual(f.sizes[0], [Math.round(SHELL.marquee.width * SURFACE_PX_PER_M), Math.round(SHELL.marquee.height * SURFACE_PX_PER_M)], "canvas follows the bar metres (mesh aspect == texture aspect)");
  assert.deepEqual(f.texts.map((t) => t.text), ["MOON PATROL"], "one line carrying the whole uppercased title record \u2014 stacked words are gone (contract change 4)");
  for (const t of f.texts) {
    assert.ok(t.style === "#ffc46b", "lettering uses the injected marquee-hue colour");
    assert.equal(t.fontPx, CAP_PX, "the line paints AT the cap-floor font size (never shrunk to fit)");
    assert.ok(t.w >= CAP_PX, "cap height stays at the 0.09 m floor (never shrunk)");
    // The fit law (one-line form): whatever spacing was set sits inside
    // [floor, 0], and the SPACED width (natural + gaps x ls x cap) fits the
    // usable canvas width — the throw law, not a clip.
    assert.ok(t.lsEm <= 0 && t.lsEm >= MARQUEE_LETTER_SPACING_EM_FLOOR, `letter-spacing ${t.lsEm}em within the pre-authorized floor`);
    const spaced = t.w + (t.text.length - 1) * t.lsEm * CAP_PX;
    assert.ok(spaced <= f.sizes[0]![0] - 2 * MARQUEE_MARGIN_PX + 1e-9, `spaced line "${t.text}" (${spaced}px) fits the bar minus margins`);
  }
  assert.ok(f.rects.length === 1 && f.rects[0]!.style === "#15110e", "the ground is the injected background colour");
});

test("marquee/screen fit laws die loudly: a one-line title that needs spacing past the floor, an empty title, and a cap taller than the face all throw instead of clipping (AC2, paintFlyer sibling; 2.0 one-line form)", () => {
  const f = fakePainter();
  assert.throws(
    () => paintMarquee(f.factory, "SUPERMONSTERMASH", "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height),
    /past the .*floor/,
    "a 16-char title at the 0.09 m cap cannot fit the 0.56 m bar even at the floor",
  );
  assert.throws(
    () => paintMarquee(f.factory, "MOON PATROL STAR", "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height),
    /past the .*floor/,
    "three words joined to one line: the width law, not the old stack-height law, is what kills it now",
  );
  assert.throws(() => paintMarquee(f.factory, "   ", "#15110e", "#ffc46b", MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height), /no words/);
  assert.throws(
    () => paintMarquee(f.factory, "MOON PATROL", "#15110e", "#ffc46b", 0.2, SHELL.marquee.width, SHELL.marquee.height),
    /does not fit the .*face/,
    "a cap above the face height is a cap bug and dies loudly \u2014 the cap is never shrunk to fit the face",
  );
});

test("screen painter: attract block, scan band, NEXT at the 0.18m minimum; the band drift is a pure function of the paint step (equal steps identical, +3 steps shifted), score zone renders nothing while empty (AC5)", () => {
  const f = fakePainter();
  const p = cabinetPlacements[0]!;
  paintScreen(f.factory, p.screenZones, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height);
  assert.deepEqual(f.sizes[0], [Math.round(SHELL.screen.width * SURFACE_PX_PER_M), Math.round(SHELL.screen.height * SURFACE_PX_PER_M)], "screen canvas at the face metres");
  assert.deepEqual(f.texts.map((t) => t.text), ["MOON", "PATROL", "NEXT"], "attract words then NEXT — the score zone paints nothing while empty");
  const nextText = f.texts.find((t) => t.text === "NEXT")!;
  assert.ok(nextText.style === "#ffc46b", "NEXT carries the marquee-amber family (mockup .next)");
  assert.equal(nextText.fontPx, NEXT_PX, "NEXT paints AT the 0.18m authored minimum font size");
  assert.ok(nextText.w >= NEXT_PX, "NEXT paints at the 0.18m authored minimum");
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
    paintScreen(g2.factory, p.screenZones, step, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height);
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
    paintScreen(g.factory, p.screenZones, step, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height);
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
  paintScreen(f.factory, zones, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height);
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
  const nextTop = faceHpx - edge - Math.round(SCREEN_NEXT_CAP_M * SURFACE_PX_PER_M);
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
    paintScreen(g.factory, zones, step, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height);
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
    () => paintScreen(g.factory, { ...p.screenZones, score: [...rows, "CCC 1"] }, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height),
    /score row 2 collides with the NEXT row/,
    "the row/NEXT collision guard is the enforcement behind the table's cap — cap bugs surface, they do not clip (mutation: relax this throw and a 3-row table paints over NEXT)",
  );
});

test("repaint rewrites the SAME canvas — a live screen never grows a second canvas (and the texture-update marker rides that identity in main.ts) (AC5)", () => {
  const f = fakePainter();
  const p = cabinetPlacements[0]!;
  const s = paintScreen(f.factory, p.screenZones, 0, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height);
  assert.equal(f.sizes.length, 1, "one canvas from the factory");
  repaintScreen(s, p.screenZones, 3, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.height);
  repaintScreen(s, p.screenZones, 6, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.height);
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
  compositeScreen(surface, p.screenZones, game, "#15110e", "#ffc46b", SCREEN_NEXT_CAP_M, SHELL.screen.height);
  const w = surface.width;
  const h = surface.height;
  const pxPerM = h / SHELL.screen.height;
  const edge = Math.round(h * SCREEN_EDGE_RATIO);
  const nextCap = Math.round(SCREEN_NEXT_CAP_M * pxPerM);
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
    () => compositeScreen(bare, p.screenZones, { width: 640, height: 360 }, "#15110e", "#ffc46b", SCREEN_NEXT_CAP_M, SHELL.screen.height),
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

// --- Story 2.0, brief section 8: the eight verification tests ---------------
// The brief demands these run against REAL three geometry — the headless
// scene.test.ts fakes pin the mount arithmetic; only real ExtrudeGeometry /
// SphereGeometry / Box3 can prove the local-frame containment band, the
// exact side-panel bbox, the two tilt laws, the screen setback, the
// emissive-pair count, the no-body-mesh law and the triangle budget. The
// adapter below mirrors the forwards main.ts's real adapter (its exact
// strings are pinned byte-identically in main-glue.test.ts); the CANVASES
// stay fake — headless, deterministic, zero DOM.

function buildThree(): Three {
  return {
    boxGeometry: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    extrudeGeometry: (points, depth) => {
      const shape = new THREE.Shape();
      shape.moveTo(points[0]!.x, points[0]!.y);
      for (const pt of points.slice(1)) shape.lineTo(pt.x, pt.y);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    },
    cylinderGeometry: (radiusTop, radiusBottom, height, radialSegments) => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    sphereGeometry: (radius, widthSegments, heightSegments) => new THREE.SphereGeometry(radius, widthSegments, heightSegments),
    standardMaterial: (params) => new THREE.MeshStandardMaterial(params as THREE.MeshStandardMaterialParameters),
    mesh: (geometry, material) => new THREE.Mesh(geometry as THREE.BufferGeometry, material as THREE.Material | THREE.Material[]),
    group: () => new THREE.Group(),
    pointLight: (color, intensity, distance) => new THREE.PointLight(color, intensity, distance),
    ambientLight: (color, intensity) => new THREE.AmbientLight(color, intensity),
    canvasTexture: (source) => new THREE.CanvasTexture(source as CanvasImageSource),
    markTextureUpdated: () => {},
  };
}

// fakePainter's recorders plus the Story-2.0 transform/path legs the art
// painters demand (surfaces.ts needLeg throws loudly on a missing one).
function richPainterFactory(): (w: number, h: number) => PaintSurface {
  return (width, height) => {
    const ctx: PaintContext = {
      fillStyle: "",
      font: "",
      textAlign: "",
      letterSpacing: "",
      fillRect() {},
      fillText() {},
      drawImage() {},
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      beginPath() {},
      arc() {},
      stroke() {},
      lineWidth: 0,
      createRadialGradient() {
        return { addColorStop() {} };
      },
    };
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
}

const world3d = (() => {
  const scene = new THREE.Scene();
  buildRoomScene(buildThree(), scene as unknown as RoomScene, richPainterFactory());
  scene.updateMatrixWorld(true);
  return scene;
})();

const cabinetGroups = world3d.children.filter((c): c is THREE.Group => (c as THREE.Group).isGroup);

function descendantMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
  });
  return out;
}

// A mesh's geometry bounding box expressed in the GROUP's local frame
// (brief: "in the cabinet's LOCAL frame") — group^-1 x meshWorld.
function groupBox3(group: THREE.Object3D, mesh: THREE.Mesh): THREE.Box3 {
  mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox!;
  const m = new THREE.Matrix4().multiplyMatrices(
    new THREE.Matrix4().copy(group.matrixWorld).invert(),
    mesh.matrixWorld,
  );
  const box = new THREE.Box3();
  for (const x of [bb.min.x, bb.max.x]) {
    for (const y of [bb.min.y, bb.max.y]) {
      for (const z of [bb.min.z, bb.max.z]) {
        box.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(m));
      }
    }
  }
  return box;
}

test("verification 1 (brief 8): the bbox of EVERY child of a cabinet group lies inside x +/-0.302 m, y 0.00-1.80 m, z +/-0.30 m in the cabinet's local frame \u2014 the 1.20 m aisle law holds at eye scale as it does at collision", () => {
  assert.equal(cabinetGroups.length, cabinetPlacements.length, "one group per placement (the law's subject exists)");
  for (const grp of cabinetGroups) {
    const kids = descendantMeshes(grp);
    // The coin-door family (panel, slot, frame, reject) is the brief's ONE
    // exception — it stays world-posed, so it is not a child to begin with.
    assert.equal(kids.length, SHELL_PART_MESHES - 4, "24 group children; the 4 coin-door-family meshes are world-mounted");
    // 1e-6, NOT 1e-9: real three stores every geometry vertex in a
    // Float32Array, so the authored 0.3 profile coordinate arrives as
    // 0.30000001192 (float32 half-ulp at metre scale ~1.2e-8). 1e-6 is still
    // 4 orders below the smallest meaningful geometry change (a 1 mm slip
    // reddens here) while clearing the storage floor.
    for (const m of kids) {
      const box = groupBox3(grp, m);
      assert.ok(box.min.x >= -0.302 - 1e-6 && box.max.x <= 0.302 + 1e-6, `lateral extent ${box.min.x}..${box.max.x} stays inside the 0.302 m band (side art included: it rides AT the 0.302 outer limit)`);
      assert.ok(box.min.y >= -1e-6 && box.max.y <= 1.8 + 1e-6, `height extent ${box.min.y}..${box.max.y} stays between floor and body top`);
      assert.ok(box.min.z >= -0.3 - 1e-6 && box.max.z <= 0.3 + 1e-6, `depth extent ${box.min.z}..${box.max.z} stays inside the body depth band`);
    }
  }
});

test("verification 2 (brief 8): each profiled side panel's local bbox is EXACTLY 0.019 x 1.800 x 0.600 m \u2014 the extrude + -90 deg rotation law lands the plywood true", () => {
  for (const grp of cabinetGroups) {
    const panels = descendantMeshes(grp).filter(
      (m) => (m.geometry as THREE.ExtrudeGeometry).parameters?.options?.depth === 0.019,
    );
    assert.equal(panels.length, 2, "two side-panel extrusions (depth 0.019)");
    for (const p of panels) {
      const box = groupBox3(grp, p);
      const sx = box.max.x - box.min.x;
      const sy = box.max.y - box.min.y;
      const sz = box.max.z - box.min.z;
      // "EXACTLY" means exactly as three can hold it: vertices are float32
      // (the 0.019 depth and the ±0.3 profile extremes each carry up to one
      // float32 ulp of quantization, ~2e-8 across a difference), while the
      // cos(-90 deg) rotation residue itself is only ~1e-17. Tol 1e-6 clears
      // the storage floor; a 0.001 m substitution would still fail.
      assert.ok(Math.abs(sx - 0.019) < 1e-6 && Math.abs(sy - 1.8) < 1e-6 && Math.abs(sz - 0.6) < 1e-6, `side panel bbox ${sx.toFixed(4)} x ${sy.toFixed(4)} x ${sz.toFixed(4)} (tol 1e-6 \u2014 float32 vertex storage is the floor, the cos(-90 deg) residue is ~1e-17)`);
    }
  }
});

test("verification 3 (brief 8): the screen face's top-centre sits BEHIND its bottom-centre along +Z in the group frame \u2014 the 9.8 deg lean reads as a lean-back, not a lean-forward", () => {
  for (const grp of cabinetGroups) {
    const face = descendantMeshes(grp).find((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      // NOT just emissiveIntensity — every standard material defaults to
      // 1.0 with BLACK emissive; the law is a non-zero emissive hue at
      // exactly the screen's 1.0 intensity.
      return mat.emissive && mat.emissive.getHex() !== 0 && mat.emissiveIntensity === 1.0;
    });
    assert.ok(face, "the screen face (emissive FACE_TINT at intensity 1.0) is found by its material law");
    const toGroup = new THREE.Matrix4().multiplyMatrices(
      new THREE.Matrix4().copy(grp.matrixWorld).invert(),
      face.matrixWorld,
    );
    const top = new THREE.Vector3(0, SHELL.screen.height / 2, 0.0015).applyMatrix4(toGroup);
    const bottom = new THREE.Vector3(0, -SHELL.screen.height / 2, 0.0015).applyMatrix4(toGroup);
    assert.ok(top.z < bottom.z, `screen top z ${top.z} must sit behind bottom z ${bottom.z} (lean-back law)`);
    assert.ok(bottom.z - top.z >= 0.08, `the lean spans ${(bottom.z - top.z).toFixed(3)} m of depth across the 0.52 m face \u2014 a shallow fake lean reddens here`);
  }
});

test("verification 4 (brief 8): the control panel's front edge sits LOWER than its rear edge in the group frame \u2014 the 21 deg tilt faces the standing player", () => {
  for (const grp of cabinetGroups) {
    const overlay = descendantMeshes(grp).find((m) => {
      const g = m.geometry as THREE.BoxGeometry;
      return g.parameters?.width === 0.562 && g.parameters?.depth === 0.19;
    });
    assert.ok(overlay, "the control overlay (0.562 x 0.19) is found");
    const toGroup = new THREE.Matrix4().multiplyMatrices(
      new THREE.Matrix4().copy(grp.matrixWorld).invert(),
      overlay.matrixWorld,
    );
    const front = new THREE.Vector3(0, 0, 0.095).applyMatrix4(toGroup);
    const rear = new THREE.Vector3(0, 0, -0.095).applyMatrix4(toGroup);
    assert.ok(front.y < rear.y, `control front y ${front.y} must sit below rear y ${rear.y} (lean-front-down law)`);
    assert.ok(rear.y - front.y >= 0.06, `the tilt drops the front edge ${(rear.y - front.y).toFixed(3)} m below the rear`);
  }
});

test("verification 5 (brief 8): the screen face's centre sits at least 0.04 m BEHIND the side-panel edge at the same height \u2014 the screen reads recessed into the body, never pasted on its face", () => {
  for (const grp of cabinetGroups) {
    const face = descendantMeshes(grp).find((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      return mat.emissive && mat.emissive.getHex() !== 0 && mat.emissiveIntensity === 1.0;
    });
    assert.ok(face);
    const centre = new THREE.Vector3(0, 0, 0).applyMatrix4(
      new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(grp.matrixWorld).invert(), face.matrixWorld),
    );
    // The side-panel silhouette at the face height: the SIDE_PROFILE segment
    // bracketing y = screen centerY (the control-rear -> opening-top slope —
    // derived from the authored profile, never retyped).
    const cy = SHELL.screen.centerY;
    let edgeZ = NaN;
    for (let i = 0; i < SIDE_PROFILE.length; i++) {
      const a = SIDE_PROFILE[i]!;
      const b = SIDE_PROFILE[(i + 1) % SIDE_PROFILE.length]!;
      if (a.y <= cy && cy <= b.y) {
        edgeZ = a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x);
        break;
      }
    }
    assert.ok(!Number.isNaN(edgeZ), "the profile segment bracketing the face height exists");
    assert.ok(edgeZ - centre.z >= 0.04, `screen centre z ${centre.z.toFixed(4)} vs side edge z ${edgeZ.toFixed(4)}: recess ${(edgeZ - centre.z).toFixed(4)} m >= 0.04`);
  }
});

test("verification 6 (brief 8): exactly two materials per cabinet carry a non-zero emissive colour \u2014 the screen face and the marquee face; no other surface glows", () => {
  for (const grp of cabinetGroups) {
    const glow = new Set<THREE.Material>();
    for (const m of descendantMeshes(grp)) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        if ((mat as THREE.MeshStandardMaterial).emissive && (mat as THREE.MeshStandardMaterial).emissive.getHex() !== 0) glow.add(mat);
      }
    }
    assert.equal(glow.size, 2, "exactly the screen + marquee emissive materials per cabinet");
  }
});

test("verification 7 (brief 8): NO mesh in the built scene carries the body-sized box (0.6 x 1.8 x 0.6) \u2014 the cabinet volume is assembled from the profiles, and its collision entry keeps the old bounds untouched (DW-42: the body box and the deck slab are gone)", () => {
  let bodySized = 0;
  world3d.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry as THREE.BoxGeometry;
    if (g.type === "BoxGeometry" && g.parameters?.width === 0.6 && g.parameters?.height === 1.8 && g.parameters?.depth === 0.6) bodySized += 1;
  });
  assert.equal(bodySized, 0, "no body-sized mesh anywhere in the scene");
  const p = cabinetPlacements[0]!;
  const v = collisionVolumes.find((c) => c.id === p.volumeId)!;
  assert.ok(near(v.min.y, 0) && near(v.max.y, 1.8) && near(v.max.x - v.min.x, 0.6) && near(v.max.z - v.min.z, 0.6), "the collision volume still carries the 0.60 x 1.80 x 0.60 bounds (decor changed; walls didn't)");
});

test("verification 8 (brief 8): the whole cabinet \u2014 group children plus the world-posed coin-door family \u2014 stays inside the 1500-triangle budget, with real margin", () => {
  const triCount = (m: THREE.Mesh): number => {
    const idx = m.geometry.getIndex();
    if (idx) return idx.count / 3;
    return (m.geometry.getAttribute("position").count ?? 0) / 3;
  };
  for (const p of cabinetPlacements) {
    assert.equal(cabinetGroups.length, 1, "single-placement build: the one group is the subject");
    const grp = cabinetGroups[0]!;
    let tris = descendantMeshes(grp).reduce((s, m) => s + triCount(m), 0);
    // the four world-mounted coin-door-family meshes for this placement
    const g = placementGeometry(p.slotId);
    for (const child of world3d.children) {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) continue;
      const d = mesh.geometry as THREE.BoxGeometry;
      const dims = d.parameters;
      const nearThisCabinet = Math.abs(mesh.position.x - g.center.x) < 0.4 && Math.abs(mesh.position.z - g.center.z) < 0.4;
      const isCoin =
        (dims?.width === SHELL.coinDoor.width && dims?.height === SHELL.coinDoor.height) ||
        (dims?.width === SHELL.coinSlot.width && dims?.height === SHELL.coinSlot.height) ||
        (dims?.width === 0.3 && dims?.height === 0.34) ||
        (dims?.width === 0.03 && dims?.height === 0.04);
      if (isCoin && nearThisCabinet) tris += triCount(mesh);
    }
    // The margin is pinned, not just claimed: the built cabinet measured
    // 928 triangles (three 0.187.0, exact primitive counts), so a re-tune
    // that silently inflates primitives toward the 1500 budget reddens here.
    assert.ok(tris > 0 && tris < 1200, `the whole cabinet draws ${tris} triangles \u2014 inside the brief's 1500 budget with real margin (measured 928, pinned under 1200)`);
  }
});

test("verification 9 (Story 2.3 AC2, real three): every built pillar-bleed node sits OUTSIDE each authored pillar AABB in matrixWorld space, at exactly SPILL_OFFSET_M past one far face (face-centred on the other axis) and at the labelled mount heights \u2014 no cabinet internals touched", () => {
  const spillScene = new THREE.Scene();
  const nodes = buildSpillNodes(buildThree(), spillScene as unknown as RoomScene, collisionVolumes, cabinetPlacements);
  spillScene.updateMatrixWorld(true);
  const pillars = collisionVolumes.filter((v) => v.kind === "pillar");
  assert.equal(pillars.map((v) => v.id).join(","), "pillar-1,pillar-2", "the authored blocker pair the anchors derive from");
  assert.ok(nodes.length > 0, "the tier builds nodes for the authored pillar pair");
  for (const n of nodes) {
    const light = n.light as unknown as THREE.PointLight;
    assert.ok(light.isPointLight, "the node handle wraps a REAL THREE.PointLight \u2014 pointLight is the tier's only seam vocabulary");
    assert.equal(light.intensity, 0, "BUILT DARK in real three too \u2014 the frame's glow ramp lights it from tick state");
    const pos = new THREE.Vector3();
    light.getWorldPosition(pos);
    for (const v of pillars) {
      const box = new THREE.Box3(
        new THREE.Vector3(v.min.x, v.min.y, v.min.z),
        new THREE.Vector3(v.max.x, v.max.y, v.max.z),
      );
      assert.ok(!box.containsPoint(pos), `the "${n.mount}" node at (${pos.x}, ${pos.y}, ${pos.z}) sits OUTSIDE ${v.id}'s AABB \u2014 an anchor INSIDE the blocker is the falsifiable sign-flip bug`);
    }
    let anchored = false;
    for (const v of pillars) {
      const cx = (v.min.x + v.max.x) / 2;
      const cz = (v.min.z + v.max.z) / 2;
      anchored =
        anchored ||
        ((near(pos.x, v.max.x + SPILL_OFFSET_M) || near(pos.x, v.min.x - SPILL_OFFSET_M)) && near(pos.z, cz)) ||
        ((near(pos.z, v.max.z + SPILL_OFFSET_M) || near(pos.z, v.min.z - SPILL_OFFSET_M)) && near(pos.x, cx));
    }
    assert.ok(anchored, `the "${n.mount}" node sits exactly SPILL_OFFSET_M (${SPILL_OFFSET_M} m) past one pillar face, face-centred on the other axis \u2014 proved via matrixWorld, the same tier that proves the shell containment`);
    assert.ok(
      near(pos.y, SPILL_FLOOR_MOUNT_M) || near(pos.y, WALL_TOP - SPILL_CEILING_INSET_M),
      "the mount height is the labelled floor-sheen or ceiling-bounce level",
    );
  }
});
