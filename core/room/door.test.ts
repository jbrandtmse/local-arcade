// Story 1.9 (AC5/AC6): the front-door street law, executed headlessly.
// Byte-continuity pin: the CLOSED swing pose (fraction 0) is the placement
// today's extruded door-front box already has — the beat must not nudge the
// door when it starts (the same 1e-12 idiom the 1.4 closed-pose pins use).
// The open pose lands exactly on the hinge: deterministic trig through
// core/contract math, so fraction 1 is bit-exact at the jamb, not an
// epsilon away. Ramps: both street lights start DARK and widen/brighten
// monotonically. Every furniture dim derives from the door constants — the
// pins recompute from the same constants, never retype numbers (the one-
// geometry-source law pointed back at the pins).
import test from "node:test";
import assert from "node:assert/strict";
import {
  FRONT_DOOR_AWNING,
  FRONT_DOOR_BLEED_MAX_INTENSITY,
  FRONT_DOOR_BLEED_REACH_MAX,
  FRONT_DOOR_BLEED_REACH_MIN,
  FRONT_DOOR_GLASS,
  FRONT_DOOR_GLASS_MAX_INTENSITY,
  FRONT_DOOR_GLASS_REACH_MAX,
  FRONT_DOOR_GLASS_REACH_MIN,
  FRONT_DOOR_GLASS_T,
  FRONT_DOOR_GLASS_Z,
  FRONT_DOOR_HANDLE,
  FRONT_DOOR_HANDLE_MAX_YAW,
  FRONT_DOOR_HANDLE_T,
  FRONT_DOOR_HANDLE_Z,
  FRONT_DOOR_HINGE_X,
  FRONT_DOOR_HINGE_Z,
  FRONT_DOOR_LIGHT_SPOTS,
  frontDoorHandleYaw,
  frontDoorOpenPose,
  frontDoorRamp,
  paintStreetGlass,
} from "./door.ts";
import { DOOR_HALF_W, DOOR_T, DOOR_TOP, INTERIOR, WALL_T, collisionVolumes } from "./collision-volumes.ts";
import { math } from "../contract/index.ts";
import type { PaintContext, PaintSurface } from "./surfaces.ts";

const HALF_Z = INTERIOR.depth / 2;

function doorVolumeCenter(): { x: number; y: number; z: number } {
  const v = collisionVolumes.find((c) => c.id === "door-front");
  assert.ok(v, "the door-front volume exists");
  return { x: (v.min.x + v.max.x) / 2, y: (v.min.y + v.max.y) / 2, z: (v.min.z + v.max.z) / 2 };
}

test("closed pose == today's extruded box: fraction 0 sits on the volume centre, yaw 0 (byte-continuity, AC5)", () => {
  const pose = frontDoorOpenPose(0);
  const c = doorVolumeCenter();
  assert.ok(
    Math.abs(pose.panel.x - c.x) < 1e-12 && Math.abs(pose.panel.y - c.y) < 1e-12 && Math.abs(pose.panel.z - c.z) < 1e-12,
    "the closed panel pose IS the extrusion's placement — the beat starts without nudging the door",
  );
  assert.equal(pose.panel.yaw, 0, "closed yaw exactly 0");
  assert.ok(Math.abs(FRONT_DOOR_HINGE_Z - c.z) < 1e-12, "the hinge line runs through the panel's mid-plane");
  assert.equal(FRONT_DOOR_HINGE_X, -DOOR_HALF_W, "the hinge is the gap's left edge, from DOOR_HALF_W alone");
  // Assembly placement law, derived from the constants:
  const panelFaceZ = HALF_Z + DOOR_T; // the panel volume's street face
  assert.ok(Math.abs(FRONT_DOOR_GLASS_Z - (panelFaceZ + FRONT_DOOR_GLASS_T / 2)) < 1e-12, "the glazing sheet sits exactly half its thickness proud of the panel's street face");
  assert.ok(FRONT_DOOR_HANDLE_Z > FRONT_DOOR_GLASS_Z + FRONT_DOOR_GLASS_T / 2, "the handle sits proud of the glazing it hangs on");
  assert.ok(FRONT_DOOR_HANDLE.centerY > 0 && FRONT_DOOR_HANDLE.centerY < DOOR_TOP, "the handle sits within the door's height");
  assert.ok(Math.abs(FRONT_DOOR_AWNING.centerY - (DOOR_TOP + WALL_T / 2)) < 1e-12, "the awning rests on the door head");
  assert.ok(FRONT_DOOR_AWNING.centerZ > HALF_Z + WALL_T, "the awning sits proud of the front wall's exterior face");
});

test("open pose is bit-exact on the hinge: fraction 1 puts the panel flat against the jamb, yaw = 90 degrees, and the parts ride the panel (AC5)", () => {
  const pose = frontDoorOpenPose(1);
  // math.cos(HALF_PI) is exactly -0 and math.sin(HALF_PI) exactly 1, so
  // these are exact equalities, not tolerances (the deterministic-math law
  // making an exact geometry pin possible):
  assert.equal(pose.panel.yaw, math.HALF_PI, "a full quarter-turn roomward");
  assert.equal(pose.panel.x, FRONT_DOOR_HINGE_X, "panel centre lands ON the hinge x");
  assert.equal(pose.panel.z, FRONT_DOOR_HINGE_Z - DOOR_HALF_W, "and DOOR_HALF_W into the room — flat open, gap clear");
  // The glass and handle rode the same hinge law (their closed offsets
  // rotate into the swing):
  for (const [part, closedX, closedZ] of [
    ["glass", 0, FRONT_DOOR_GLASS_Z] as const,
    ["handle", FRONT_DOOR_HANDLE.centerX, FRONT_DOOR_HANDLE_Z] as const,
  ]) {
    const p = pose[part];
    assert.equal(p.x, FRONT_DOOR_HINGE_X + (closedZ - FRONT_DOOR_HINGE_Z), `${part}: its street offset swung to the room side, exactly`);
    assert.equal(p.z, FRONT_DOOR_HINGE_Z - (closedX - FRONT_DOOR_HINGE_X), `${part}: its along-door offset swung roomward, exactly`);
    assert.equal(p.yaw, math.HALF_PI, `${part} carries the same swing yaw`);
  }
  // Swing direction: roomward only — every open-pose part sits at z <= the
  // closed panel's street face (the mutation "swing outward to the street"
  // would put them at z > HALF_Z + DOOR_T).
  const faceZ = HALF_Z + DOOR_T;
  for (const p of [pose.panel, pose.glass, pose.handle]) assert.ok(p.z <= faceZ, "nothing swings out to the street");
});

test("the handle twist is its own law: 0 -> exactly 18 degrees, monotone, clamped (AC5's ready-handle tell)", () => {
  assert.equal(frontDoorHandleYaw(0), 0, "closed at rest");
  assert.equal(frontDoorHandleYaw(1), math.PI * (18 / 180), "the mockup's 18deg, from math.PI — the drift pin on FRONT_DOOR_HANDLE_MAX_YAW");
  assert.equal(FRONT_DOOR_HANDLE_MAX_YAW, math.PI * (18 / 180), "the exported constant IS 18 degrees (drift pin)");
  let prev = -1;
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const y = frontDoorHandleYaw(f);
    assert.ok(y >= prev, "monotone through the turn");
    prev = y;
  }
  assert.equal(frontDoorHandleYaw(-0.5), 0, "clamped below");
  assert.equal(frontDoorHandleYaw(3), FRONT_DOOR_HANDLE_MAX_YAW, "clamped above");
});

test("the settle ramp starts BOTH lights dark and widens + brightens them monotonically to the authored maxima (AC5 'both start dark')", () => {
  const at0 = frontDoorRamp(0);
  assert.equal(at0.bleed.intensity, 0, "the bleed light is literally dark at progress 0");
  assert.equal(at0.glass.intensity, 0, "the glass light too");
  assert.ok(at0.bleed.distance > 0 && at0.glass.distance > 0, "reach stays positive (three lights need it)");
  const at1 = frontDoorRamp(1);
  assert.equal(at1.bleed.intensity, FRONT_DOOR_BLEED_MAX_INTENSITY, "the bleed reaches its authored max");
  assert.equal(at1.glass.intensity, FRONT_DOOR_GLASS_MAX_INTENSITY, "the glass sheen reaches its authored max");
  assert.equal(at1.bleed.distance, FRONT_DOOR_BLEED_REACH_MAX, "the bleed pool widens to its authored max reach");
  assert.equal(at1.glass.distance, FRONT_DOOR_GLASS_REACH_MAX, "and the sheen to its own");
  assert.ok(FRONT_DOOR_BLEED_MAX_INTENSITY > FRONT_DOOR_GLASS_MAX_INTENSITY, "the bleed (the room running behind the door) is the louder of the pair");
  let pBleed = -1;
  let pGlass = -1;
  let pBleedD = -1;
  let pGlassD = -1;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const r = frontDoorRamp(t);
    assert.ok(r.bleed.intensity >= pBleed && r.glass.intensity >= pGlass, `intensities monotone at ${t}`);
    assert.ok(r.bleed.distance >= pBleedD && r.glass.distance >= pGlassD, `reaches monotone at ${t}`);
    pBleed = r.bleed.intensity;
    pGlass = r.glass.intensity;
    pBleedD = r.bleed.distance;
    pGlassD = r.glass.distance;
  }
  assert.deepEqual(frontDoorRamp(-2), frontDoorRamp(0), "clamped below");
  assert.deepEqual(frontDoorRamp(9), frontDoorRamp(1), "clamped above");
});

test("the street light spots sit on the STREET side of the front wall (the bleed pools at the door base; the sheen off the glazing)", () => {
  assert.ok(FRONT_DOOR_LIGHT_SPOTS.bleed.z > HALF_Z + WALL_T, "the bleed pool sits outside the wall's exterior face");
  assert.ok(FRONT_DOOR_LIGHT_SPOTS.bleed.y < DOOR_TOP / 2, "low at the door base");
  assert.equal(FRONT_DOOR_LIGHT_SPOTS.glass.y, FRONT_DOOR_GLASS.centerY, "the sheen light rides the glazing's height");
});

test("paintStreetGlass: the mockup's two-tone glazing painted in hard bands on an injected canvas — no text, no gradients (AC6 tokens only at the call site)", () => {
  const rects: { style: string; x: number; y: number; w: number; h: number }[] = [];
  const texts: string[] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textAlign: "",
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ style: ctx.fillStyle, x, y, w, h });
    },
    fillText(t: string) {
      texts.push(t);
    },
    measureText(t: string) {
      return { width: t.length };
    },
  } satisfies PaintContext;
  const surface: PaintSurface = { width: 0, height: 0, getContext: (kind) => (kind === "2d" ? ctx : null) };
  const made: PaintSurface[] = [];
  const painted = paintStreetGlass((w, h) => {
    made.push({ width: w, height: h, getContext: (kind) => (kind === "2d" ? ctx : null) });
    return made[0]!;
  }, "#3a2c20", "#2a2018");
  assert.equal(made.length, 1, "exactly one injected canvas");
  assert.equal(painted, made[0], "and the painter returns it");
  assert.ok(painted.width > 0 && painted.height === painted.width, "the sheet canvas follows the square glazing (1000 px/m family)");
  assert.equal(texts.length, 0, "the glazing carries no text (in-world, not signage)");
  assert.equal(rects.length, 2, "two hard bands, no gradients");
  assert.deepEqual([rects[0]!.style, rects[0]!.x, rects[0]!.y], ["#3a2c20", 0, 0], "the GLASS_DARK band covers the sheet first");
  assert.equal(rects[1]!.style, "#2a2018", "the GLASS_DIM band is the lower half (mockup .glass gradient read as hard bands)");
  assert.ok(rects[1]!.y >= painted.height / 2 - 1e-9 && rects[1]!.y + rects[1]!.h <= painted.height + 1e-9, "the dim band sits in the lower half");
});

test("furniture dims derive from the door constants, never retyped numbers (one-geometry-source law in the pins' direction)", () => {
  assert.equal(FRONT_DOOR_GLASS.width, DOOR_HALF_W);
  assert.equal(FRONT_DOOR_GLASS.height, DOOR_HALF_W);
  assert.equal(FRONT_DOOR_GLASS.centerY, DOOR_TOP - DOOR_HALF_W);
  assert.equal(FRONT_DOOR_HANDLE.centerX, DOOR_HALF_W - DOOR_T);
  assert.equal(FRONT_DOOR_HANDLE.centerY, DOOR_TOP * (2 / 3));
  assert.equal(FRONT_DOOR_AWNING.width, 2 * (DOOR_HALF_W + WALL_T));
  assert.equal(FRONT_DOOR_AWNING.depth, WALL_T);
  assert.equal(FRONT_DOOR_GLASS_T, DOOR_T / 6);
  assert.equal(FRONT_DOOR_HANDLE_T, FRONT_DOOR_GLASS_T / 2);
});
