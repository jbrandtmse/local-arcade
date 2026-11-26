// Story 1.4 QA additions: independent probes over the authored stand-up
// shell that the implement pins leave open — (1) AC1 through the REAL 1.2
// resolver: a scripted walk into the B0 face presses to body-front +
// PLAYER_RADIUS, slides along the side, and the same one-list entry puts
// the shell centre-of-view (blocking + targetability served by one entry);
// (2) the collision entry equals an independent re-derivation of the body
// footprint from the slot record + shell spec (the one-geometry-source
// law, re-expressed test-local); (3) the title uppercase law at the
// painters — the authored record is already uppercase, so a dropped
// toUpperCase is otherwise invisible; (4) screen liveness, determinism
// and repaint cost driven through the REAL kernel loop: equal tick counts
// paint byte-identical op-logs, a 0-tick and a 30-tick run differ, and
// frames inside one paint step cost no repaint; (5) the coin-door pose
// law as geometric invariants (hinge fixed, exact 90 deg axis-swap, slot
// rigid on the panel) rather than the exact numbers; (6) AC5 material leg:
// every cabinet part mesh is built exactly once from the SHELL dims and
// carries only tokens.ts colours. Fakes are test-local; every runtime,
// loop and controller is built per test (hermetic, order-free).
import test from "node:test";
import assert from "node:assert/strict";
import {
  MARQUEE_CAP_M,
  SCREEN_ATTRACT_CAP_M,
  SCREEN_NEXT_CAP_M,
  SHELL,
  coinDoorPose,
  createCabinetRuntime,
  placementByVolumeId,
  placementGeometry,
  screenPaintStep,
  stepCabinetPhase,
} from "./cabinets.ts";
import { collisionVolumes } from "./collision-volumes.ts";
import { wallSlots } from "./slot-config.ts";
import { PLAYER_RADIUS, createPlayerController } from "../player.ts";
import { createKernelLoop, MS_PER_TICK } from "../loop.ts";
import type { DeviceView } from "../input/index.ts";
import { paintMarquee, paintScreen, type PaintContext, type PaintSurface } from "./surfaces.ts";
import { buildRoomScene, type Placed, type RoomScene, type Three } from "./scene.ts";
import {
  BUTTON_RED,
  CABINET_BLACK,
  CABINET_METAL,
  FACE_TINT,
  GLOW_CYAN,
  GLOW_MARQUEE,
  ROOM_BLACK,
  SIGN_CHALK,
  WALL_WARM,
  toCss,
} from "./tokens.ts";
import { math } from "../contract/index.ts";

const EPS = 1e-9;

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

function view(axes: [number, number] = [0, 0], aim: [number, number] = [0, 0], pressed = false): DeviceView {
  return {
    axes: { forward: axes[0]!, strafe: axes[1]! },
    aim: { dx: aim[0]!, dy: aim[1]! },
    interact: { down: pressed, pressed },
  };
}

// --- AC1: the real resolver consumes the derived entry ------------------------

test("QA AC1: a scripted walk into the B0 face stops flush at body-front + PLAYER_RADIUS, slides along the side, and the same entry targets the shell (Rule 1 consumer, one list serves blocking + targetability)", () => {
  const g = placementGeometry("B0");
  const vol = collisionVolumes.find((v) => v.id === "cabinet-B0");
  assert.ok(vol, "the derived entry is in the one list the controller walks on");
  // Stand 2m in front of the face, looking straight at the shell (yaw 0 ->
  // facing -Z, the wall the back-row shell stands against).
  const player = createPlayerController(collisionVolumes, { x: g.center.x, z: g.front.z + 2, yaw: 0 });
  // Walk straight in until the body stops the walk (the pressed face makes
  // the resolved position stop changing), bounded cap.
  let ticks = 0;
  let lastZ = player.state.z;
  while (ticks < 6000) {
    player.step(1, view([1, 0]));
    ticks += 1;
    if (near(player.state.z, lastZ)) break;
    lastZ = player.state.z;
  }
  assert.ok(ticks < 6000, "the walk reaches the shell well inside the cap");
  assert.ok(player.state.targetId === "cabinet-B0", `the walk acquires the shell as the centred target (got ${player.state.targetId})`);
  // Body blocking through the untouched 1.2 resolver: the front face clamps
  // the walk at max.z + PLAYER_RADIUS (the circle never enters the body).
  const flushZ = vol.max.z + PLAYER_RADIUS;
  assert.ok(near(player.state.z, flushZ), `walk pressed at the body front (${player.state.z} vs ${flushZ})`);
  assert.ok(player.state.z >= vol.max.z + PLAYER_RADIUS - EPS, "the visitor never penetrates the body box");
  // Side slide at the pressed face (the 1.3 wall-slide law, now on a cabinet).
  const x0 = player.state.x;
  for (let i = 0; i < 10; i++) player.step(1, view([0, 1]));
  assert.ok(Math.abs(player.state.x - x0) > 0.1, "strafing slides along the face");
  assert.ok(near(player.state.z, flushZ), "the slide keeps the visitor flush on the front face (no drift into or away from the body)");
});

test("QA AC1: the collision entry equals an independent re-derivation of the body footprint from the slot record + shell spec (one geometry source, test-local arithmetic)", () => {
  const slot = wallSlots.find((s) => s.id === "B0")!;
  const f = { x: slot.facing.x, z: slot.facing.z };
  const r = { x: f.z, z: f.x !== 0 ? -f.x : 0 }; // up x facing (room-layout grammar)
  const halfAlong = SHELL.body.width / 2;
  const halfDepth = SHELL.body.depth / 2;
  const halfX = Math.abs(r.x) * halfAlong + Math.abs(f.x) * halfDepth;
  const halfZ = Math.abs(r.z) * halfAlong + Math.abs(f.z) * halfDepth;
  const vol = collisionVolumes.find((v) => v.id === "cabinet-B0")!;
  assert.equal(vol.kind, "cabinet", "the entry carries the cabinet kind");
  assert.ok(near(vol.min.x, slot.center.x - halfX) && near(vol.max.x, slot.center.x + halfX), "footprint spans the stand-up width on the baseplate anchor");
  assert.ok(near(vol.min.z, slot.center.z - halfZ) && near(vol.max.z, slot.center.z + halfZ), "footprint spans the body depth on the baseplate anchor");
  assert.ok(near(vol.min.y, 0) && near(vol.max.y, SHELL.body.height), "the box stands from the floor to the authored height");
  assert.equal(vol.blocksMovement, true, "blocking leg (walk probe above exercises it for real)");
  assert.equal(vol.targetable, true, "targetable leg (E rides it)");
});

// --- AC2: the uppercase law is only visible with mixed-case input -------------

function fakeRecorder() {
  const texts: string[] = [];
  const factory = (width: number, height: number): PaintSurface => {
    const ctx: PaintContext = {
      fillStyle: "",
      font: "",
      textAlign: "",
      fillRect() {},
      fillText(t) {
        texts.push(t);
      },
      // 0.92em condensed advance — the deterministic fake-metric family.
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
    };
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  return { factory, texts };
}

test("QA AC2: marquee and attract/NEXT lettering is uppercased by the painters, not by the authored record (a mixed-case record still prints the title's words, capitals only)", () => {
  const f = fakeRecorder();
  paintMarquee(f.factory, "Moon Patrol", toCss(ROOM_BLACK), toCss(GLOW_MARQUEE), MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height);
  assert.deepEqual(f.texts, ["MOON PATROL"], "a lowercase record still letters the title uppercased \u2014 on ONE line (Story 2.0 contract change 4: the words join, never stack)");
  const f2 = fakeRecorder();
  paintMarquee(f2.factory, "  moon   PATROL ", toCss(ROOM_BLACK), toCss(GLOW_MARQUEE), MARQUEE_CAP_M, SHELL.marquee.width, SHELL.marquee.height);
  assert.deepEqual(f2.texts, ["MOON PATROL"], "whitespace runs collapse to single spaces, never blank segments");
  const f3 = fakeRecorder();
  paintScreen(
    f3.factory,
    { attract: "moon patrol", next: "next", score: [] },
    0,
    toCss(ROOM_BLACK),
    toCss(GLOW_CYAN),
    toCss(GLOW_MARQUEE),
    SCREEN_ATTRACT_CAP_M,
    SCREEN_NEXT_CAP_M,
    SHELL.screen.width,
    SHELL.screen.height,
  );
  assert.deepEqual(f3.texts, ["MOON", "PATROL", "NEXT"], "the screen zone words uppercase too (attract + NEXT \u2014 the SCREEN painter still stacks attract words; only the marquee went one-line)");
});

// --- AC3: liveness law driven through the REAL kernel loop ---------------------

/** Paint one full screen at `step` into a fresh fake canvas and return its
 * complete op transcript (every fillRect/fillText in call order). */
function screenOps(step: number): string {
  const ops: string[] = [];
  const p = placementByVolumeId("cabinet-B0");
  const factory = (width: number, height: number): PaintSurface => {
    const ctx: PaintContext = {
      fillStyle: "",
      font: "",
      textAlign: "",
      fillRect(x, y, w, h) {
        ops.push(`rect ${String(ctx.fillStyle)} ${x} ${y} ${w} ${h}`);
      },
      fillText(t, x, y) {
        ops.push(`text ${String(ctx.fillStyle)} ${t} ${x} ${y}`);
      },
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
    };
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  paintScreen(
    factory,
    p.screenZones,
    step,
    toCss(ROOM_BLACK),
    toCss(p.hue),
    toCss(p.marqueeHue),
    SCREEN_ATTRACT_CAP_M,
    SCREEN_NEXT_CAP_M,
    SHELL.screen.width,
    SHELL.screen.height,
  );
  return ops.join("\n");
}

/** Run `ticks` real kernel ticks with the cabinets system wired exactly as
 * main.ts wires it, plus a frame-sim system that repaints (full op-log)
 * only when the paint step changes — the entry's repaint law. */
function runCabinetLoop(ticks: number): { logs: string[]; steps: number[]; phase: number; frames: number } {
  const rt = createCabinetRuntime();
  let nowCalls = 0;
  const loop = createKernelLoop({
    // A generous wall delta; maxCatchupSteps caps the run at exactly
    // `ticks` global ticks (the loop drops the leftover on the cap).
    now: () => {
      nowCalls += 1;
      return nowCalls === 1 ? 0 : (ticks + 4) * MS_PER_TICK;
    },
    maxCatchupSteps: ticks,
  });
  loop.addSystem("cabinets", () => stepCabinetPhase(rt, 1));
  const logs: string[] = [];
  const steps: number[] = [];
  let frames = 0;
  let lastStep = -1;
  const gate = (): void => {
    frames += 1;
    const s = screenPaintStep(rt);
    if (s !== lastStep) {
      lastStep = s;
      steps.push(s);
      logs.push(screenOps(s));
    }
  };
  loop.addSystem("frameSim", gate);
  loop.step();
  gate(); // the frame that reads the settled state (matrix: "N ticks then paint transcript")
  return { logs, steps, phase: rt.phase, frames };
}

test("QA AC3: through the real kernel loop — 30 ticks cycle the phase, the paint-step gate repaints exactly on step changes, two equal-tick runs paint byte-identical op-logs, and the 30-tick transcript differs from the 0-tick one (matrix rows: determinism, liveness, repaint cost)", () => {
  const a = runCabinetLoop(0);
  const b = runCabinetLoop(30);
  const b2 = runCabinetLoop(30);
  assert.equal(b.phase, 30, "the cabinets kernel system advanced the phase exactly with the ticks");
  assert.equal(b.logs.length, 4, "30 ticks visit paint steps 0..3 — four repaints, not thirty");
  assert.deepEqual(b.steps, [0, 1, 2, 3], "the repaint gate fires only on paint-step change");
  assert.equal(b.frames, 31, "31 frame reads cost 4 repaints — the other 27 frames repaint nothing");
  assert.deepEqual(b2.logs, b.logs, "two fresh 30-tick runs paint byte-identical op-log SEQUENCES — every repaint, not just the final one");
  assert.notEqual(a.logs[0], b.logs[b.logs.length - 1], "the 30-tick screen differs from the 0-tick screen (the scan band moved — a dead screen fails)");
  assert.ok(b.logs.every((l) => l.length > 0), "every transcript is a real painted screen (two empty runs compared would be no evidence)");
});

// --- AC4: the pose law as geometric invariants --------------------------------

test("QA AC4: the coin-door pose law keeps its visitor-left hinge fixed, rotates the panel's width axis by an exact 90 deg out, and rides the coin slot rigidly along (deterministic position+rotation, independent of the exact numbers)", () => {
  const closed = coinDoorPose("cabinet-B0", false);
  const open = coinDoorPose("cabinet-B0", true);
  const g = placementGeometry("B0");
  const halfW = SHELL.coinDoor.width / 2;
  // The hinge, derived INDEPENDENTLY of the pose law: the front plane at
  // half the door thickness proud, pulled half the panel width along
  // -right — authored slot + shell records only (a hinge re-derived from
  // the pose under test would be a tautology).
  const hx = g.front.x + g.facing.x * (SHELL.coinDoor.thickness / 2) - g.right.x * halfW;
  const hz = g.front.z + g.facing.z * (SHELL.coinDoor.thickness / 2) - g.right.z * halfW;
  const dcx = closed.panel.x - hx;
  const dcz = closed.panel.z - hz;
  const dox = open.panel.x - hx;
  const doz = open.panel.z - hz;
  assert.ok(near(dcx, g.right.x * halfW) && near(dcz, g.right.z * halfW), "closed panel extends half its width from the visitor-left hinge");
  assert.ok(near(dox, -dcz) && near(doz, dcx), "open pose is the exact axis swap about the SAME hinge point (no trig drift)");
  assert.ok(near(Math.hypot(dox, doz), halfW), "the panel width lever is preserved by the swing");
  assert.ok(near(open.panel.yaw - closed.panel.yaw, -math.HALF_PI), "open yaw is closed yaw minus 90 deg");
  // The coin slot rides the panel rigidly: its offset from the panel centre
  // rotates by the same law.
  const scx = closed.slot.x - closed.panel.x;
  const scz = closed.slot.z - closed.panel.z;
  const sox = open.slot.x - open.panel.x;
  const soz = open.slot.z - open.panel.z;
  assert.ok(near(sox, -scz) && near(soz, scx), "the coin slot keeps its place on the swinging panel");
  // Pure function: same inputs, identical pose.
  assert.deepEqual(coinDoorPose("cabinet-B0", true), open);
});

// --- AC5: the scene materializes every part once, in token colours ------------

// Story 2.0 (DW-29 rebuild): the fake speaks the EXTENDED seam (profile
// extrusion, cylinders, sphere, group, material arrays) — the brief's
// "every headless fake" requirement — and the PaintContext grows the legs
// the new painters need (the needLeg guard in surfaces.ts dies loudly on a
// missing one, so this fake must implement them, not stub them away).
test("QA AC5: the built scene carries every rebuilt SHELL part at its authored dims in tokens.ts colours, NO mesh for the cabinet volume (DW-42's body box is gone), and the two faces carry emissive while no other cabinet material does (material leg of the token law; the demonstrated raw-hex class was a light)", () => {
  interface MatRec {
    params: Record<string, unknown>;
  }
  const meshes: { geo: { w?: number; h?: number; d?: number }; mat: MatRec }[] = [];
  const three: Three = {
    boxGeometry(w, h, d) {
      return { w, h, d };
    },
    extrudeGeometry(points, depth) {
      return { points, depth };
    },
    cylinderGeometry(radiusTop, radiusBottom, height, radialSegments) {
      return { radiusTop, radiusBottom, height, radialSegments };
    },
    sphereGeometry(radius, widthSegments, heightSegments) {
      return { radius, widthSegments, heightSegments };
    },
    standardMaterial(params) {
      return { params };
    },
    mesh(geometry, material) {
      const geo = geometry as { w?: number; h?: number; d?: number };
      const mat = (Array.isArray(material) ? material[0] : material) as MatRec;
      const rec = { geo, mat };
      meshes.push(rec);
      const placed: Placed = {
        position: { set() {} },
        rotation: { set() {} },
      };
      return placed;
    },
    group() {
      return {
        position: { set() {} },
        rotation: { set() {}, y: 0 },
        add() {},
      };
    },
    pointLight() {
      return { position: { set() {} }, rotation: { set() {} } };
    },
    ambientLight() {
      return {};
    },
    canvasTexture(source) {
      return { source };
    },
    markTextureUpdated() {},
  };
  const scene: RoomScene = { add() {} };
  const factory = (width: number, height: number): PaintSurface => {
    const ctx: PaintContext = {
      fillStyle: "",
      font: "",
      textAlign: "",
      fillRect() {},
      fillText() {},
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
  buildRoomScene(three, scene, factory);

  // Box-dimension parts of the rebuilt shell (Story 2.0 numbers): every
  // count is the brief's assembly table, every colour the token NAME.
  const parts: { label: string; geo: { w: number; h: number; d: number }; count: number; color: number }[] = [
    { label: "front panel", geo: { w: 0.562, h: 0.8, d: 0.02 }, count: 1, color: CABINET_BLACK },
    { label: "side-art decal", geo: { w: 0.002, h: 0.7, d: 0.5 }, count: 2, color: FACE_TINT },
    { label: "contact shadow", geo: { w: 0.6, h: 0.002, d: 0.6 }, count: 1, color: undefined as unknown as number },
    { label: "screen bezel", geo: { w: SHELL.bezel.width, h: SHELL.bezel.height, d: SHELL.bezel.depth }, count: 1, color: CABINET_BLACK },
    { label: "screen face", geo: { w: SHELL.screen.width, h: SHELL.screen.height, d: 0.003 }, count: 1, color: 0 },
    { label: "control overlay", geo: { w: 0.562, h: 0.003, d: 0.19 }, count: 1, color: FACE_TINT },
    { label: "marquee face", geo: { w: 0.562, h: SHELL.marquee.height, d: SHELL.marquee.depth }, count: 1, color: 0 },
    { label: "marquee retainer", geo: { w: 0.562, h: 0.01, d: 0.008 }, count: 2, color: CABINET_BLACK },
    { label: "grille slat", geo: { w: 0.2, h: 0.004, d: 0.012 }, count: 3, color: CABINET_BLACK },
    { label: "coin-door frame", geo: { w: 0.3, h: 0.34, d: 0.004 }, count: 1, color: CABINET_METAL },
    { label: "coin-reject button", geo: { w: 0.03, h: 0.04, d: 0.004 }, count: 1, color: BUTTON_RED },
    { label: "coin-door panel", geo: { w: SHELL.coinDoor.width, h: SHELL.coinDoor.height, d: SHELL.coinDoor.thickness }, count: 1, color: WALL_WARM },
    { label: "coin-slot detail", geo: { w: SHELL.coinSlot.width, h: SHELL.coinSlot.height, d: SHELL.coinSlot.thickness }, count: 1, color: SIGN_CHALK },
  ];
  for (const part of parts) {
    const hits = meshes.filter(
      (m) => near(m.geo.w ?? NaN, part.geo.w) && near(m.geo.h ?? NaN, part.geo.h) && near(m.geo.d ?? NaN, part.geo.d),
    );
    assert.equal(hits.length, part.count, `exactly ${part.count} mesh(es) carry the "${part.label}" dims`);
    for (const hit of hits) {
      assert.equal(
        hit.mat.params["color"],
        part.color,
        // The message builds eagerly, so the contact shadow's `undefined`
        // colour sentinel (its material rides on the map alone — no colour
        // param at all) must survive the template too.
        `"${part.label}" must carry ${part.color === undefined ? "NO colour param at all (the contact shadow rides on its map alone)" : part.color === 0 ? "the brief's black, written as the number 0" : `the token 0x${part.color.toString(16)}`} (got ${String(hit.mat.params["color"])}) \u2014 AC5: part colours come from tokens.ts`,
      );
    }
  }

  // DW-42 + contract change 2: the 1.10 body box is GONE — no mesh carries
  // the volume's full 0.60x0.60x1.80 dims, and no mesh carries the deleted
  // contour records' dims (deck/kick/hood/wings left no part behind).
  const bodySized = meshes.filter(
    (m) => near(m.geo.w ?? NaN, SHELL.body.width) && near(m.geo.h ?? NaN, SHELL.body.height) && near(m.geo.d ?? NaN, SHELL.body.depth),
  );
  assert.equal(bodySized.length, 0, "no mesh is extruded from the cabinet collision volume (kind cabinet is data, not decor)");

  // Contract change 3: emissive lives on exactly the two faces — the screen
  // (intensity 1.0) and the marquee (1.2) — and on no other built material.
  const emissive = meshes.filter((m) => "emissive" in m.mat.params);
  assert.equal(emissive.length, 2, "exactly two cabinet-part materials carry emissive (screen face + marquee face)");
  for (const m of emissive) {
    assert.equal(m.mat.params["emissive"], FACE_TINT, "the emissive hue is the FACE_TINT token");
    assert.ok(typeof m.mat.params["emissiveMap"] === "object", "the emissive rides the painted map");
  }
  const intensities = emissive.map((m) => m.mat.params["emissiveIntensity"]).sort();
  assert.deepEqual(intensities, [1.0, 1.2], "the face intensities are the brief's 1.0 (screen) / 1.2 (marquee)");
});
