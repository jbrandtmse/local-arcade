// Story 2.3 QA executable tier (the residual risk the implement stage
// flagged): the shipped frame() glow block executes at no text tier — the
// main-glue pins prove the LINES ship, not that they WRITE. This file boots
// the shipped core/main.ts boot path inside Node (real three behind a
// module-hook shim whose WebGLRenderer is a no-op stub and whose
// PointLight construction is recorded), drives the entry beat to "control"
// on a deterministic rAF pump clock, and observes the arcadeDebug.atmos-
// phere rows plus the recorded light intensities across a synthetic walk:
// near-vs-far haze ordering, the glow product law, and every pillar-bleed
// node lit from its SOURCE cabinet's numbers (hue + SPILL_INTENSITY). A
// semantic rewrite inside the pinned lines (haze scaled, pulse dropped,
// bleed mis-hued) reddens THIS tier while every text pin stays green.
// Hermeticity: this file creates its own stub globals at boot and never
// touches :5173, generated/, or any other suite's state (per-file process
// isolation under node --test).

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const SHIM_URL = new URL("./main-boot-three-shim.mjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "three" && context.parentURL !== SHIM_URL) {
      return { url: SHIM_URL, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

// --- the browser edge this process stands in for (this test's own state) ---

interface LightRec {
  intensity: number;
  distance: number;
  color: { getHex: () => number };
  position: { x: number; y: number; z: number };
}

function makeFakeCtx() {
  const ctx: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    font: "",
    textAlign: "",
    letterSpacing: "",
    lineWidth: 0,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillRect() {},
    fillText() {},
    fill() {},
    clearRect() {},
    drawImage() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    rect() {},
    arc() {},
    clip() {},
    stroke() {},
    setTransform() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    measureText(text: string) {
      const m = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font ?? ""));
      const capPx = m != null ? Number(m[1]) : 16;
      // Proportionate fake metric: narrower than every real condensed stack,
      // so the painters' FIT laws (they throw when a line is too WIDE) pass
      // as they do in the browser smoke.
      return { width: text.length * 0.45 * capPx };
    },
  };
  return ctx;
}

class FakeCanvas {
  width: number;
  height: number;
  private ctx: Record<string, unknown> | null = null;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext(kind: string) {
    if (kind !== "2d") return null;
    if (this.ctx == null) this.ctx = makeFakeCtx();
    return this.ctx;
  }
}

let rafQueue: Array<() => void> = [];
(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: () => void) => {
  rafQueue.push(cb);
  return rafQueue.length;
};
(globalThis as Record<string, unknown>).OffscreenCanvas = FakeCanvas;
(globalThis as Record<string, unknown>).document = {
  body: { appendChild() {}, removeChild() {} },
  documentElement: { addEventListener() {} },
  addEventListener() {},
  pointerLockElement: null,
  createElement: (tag: string) => ({
    tag,
    style: {},
    textContent: "",
    width: 0,
    height: 0,
    appendChild() {},
    addEventListener() {},
    setAttribute() {},
    getContext: () => null,
  }),
};
(globalThis as Record<string, unknown>).window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  addEventListener() {},
};
// No AudioContext global (the silent-graph path), no localStorage (the
// storage degrade path) -- both degrade by construction, unstubbed.

// Deterministic pump clock: +17 ms per pump > MS_PER_TICK, so each pump
// advances the accumulator one tick; the ~0.333 ms/pump residue makes every
// ~50th pump run two ticks (MAX_CATCHUP never engaged — the whole schedule
// is fixed by the fake clock, identical on every run).
let fakeMs = 0;
Object.defineProperty(globalThis, "performance", {
  value: { now: () => fakeMs },
  configurable: true,
});

function pump(count: number): void {
  for (let i = 0; i < count; i++) {
    fakeMs += 17;
    const batch = rafQueue;
    rafQueue = [];
    for (const cb of batch) cb();
  }
}

// --- boot the shipped entry (the boot catch's workbench path leaves
// window.arcadeDebug undefined -- asserted below, loudly, on any boot
// throw) ---

const mainModule = await import("./main.ts");
void mainModule;
const shim = (await import("./main-boot-three-shim.mjs")) as unknown as {
  pointLightsBuilt: LightRec[];
};
const debug = (globalThis as Record<string, any>).window.arcadeDebug;

// The boot SEEDS of the atmosphere legs are law-derived, not constants — the
// first frame overwrites the rows, so before any pump is their only window.
{
  const seed = debug.atmosphere[0]!;
  assert.equal(seed.pulseApplied, glowPulse(0), "the boot seed's pulse is glowPulse(0), not a hard-coded 1 the pulse law can never emit at phase 0 (mutation: seed pulseApplied: 1 in main.ts -> red here)");
  assert.equal(seed.hazeFactor, hazeFactor(0), "the boot seed's haze is hazeFactor(0) (mutation: seed hazeFactor: 1 -> red here)");
  assert.equal(seed.glowIntensity, CABINET_LIGHT_INTENSITY * glowPulse(0) * hazeFactor(0), "the boot seed glow is the law product composition, not a re-typed nominal");
}

pump(1);
let guard = 0;
while (debug != null && debug.entry.phase() !== "control" && guard < 3000) {
  pump(1);
  guard++;
}

import { CABINET_LIGHT_INTENSITY, CABINET_LIGHT_REACH, cabinetPlacements, placementGeometry } from "./room/cabinets.ts";
import { collisionVolumes, INTERIOR } from "./room/collision-volumes.ts";
import {
  HAZE_FLOOR,
  HAZE_NEAR_M,
  SPILL_INTENSITY,
  glowPulse,
  hazeFactor,
  spillAnchors,
  spillMountY,
} from "./room/atmosphere.ts";

const placement = cabinetPlacements[0]!;
const center = placementGeometry(placement.slotId).center;
const pillars = collisionVolumes.filter((v) => v.kind === "pillar");
const expectedBleed = cabinetPlacements.flatMap((p) =>
  pillars.flatMap((v) => spillAnchors(placementGeometry(p.slotId).center, v)),
);

function rowFor(volumeId: string) {
  const rows: Array<Record<string, number | string>> = debug.atmosphere;
  const row = rows.find((r) => r.volumeId === volumeId);
  assert.ok(row, `arcadeDebug.atmosphere carries a row for ${volumeId}`);
  return row as Record<string, number>;
}

function bleedLights(): LightRec[] {
  // buildSpillNodes runs AFTER buildRoomScene at boot (main.ts call or-
  // der) -- the last expectedBleed.length recorded PointLights are the
  // bleed tier, immune to the frame-side distance writes on other lights.
  return shim.pointLightsBuilt.slice(-expectedBleed.length);
}

function pairLights(): LightRec[] {
  return shim.pointLightsBuilt.filter((l) => l.distance === CABINET_LIGHT_REACH);
}

test("Story 2.3 boot tier (AC1/AC3): the shipped boot reaches entry phase control headless, and the shipped frame() glow block WRITES the arcadeDebug rows by its own law product at the spawn pose -- distance is the XZ Euclidean to the placement centre, haze is hazeFactor of it (the Near row at 1 inside HAZE_NEAR_M), glowIntensity is exactly CABINET_LIGHT_INTENSITY x pulseApplied x hazeFactor, pulseApplied is glowPulse of the cabinet phase counter, and the built halo/spill pair plus every bleed node settle to the row's numbers", () => {
  assert.ok(debug, "the shipped boot reached arcadeDebug (a boot throw lands on the workbench and leaves it undefined)");
  assert.equal(debug.entry.phase(), "control", "the entry beat completes on the deterministic pump clock -- no browser, no rAF, no :5173");
  assert.equal(debug.atmosphere.length, cabinetPlacements.length, "one atmosphere row per lit cabinet");

  pump(1); // the frame re-writes the rows from this exact pose
  const state = debug.player.state;
  const row = rowFor(placement.volumeId);
  assert.equal(row.volumeId, placement.volumeId);
  const expectedDistance = Math.sqrt(
    (state.x - center.x) * (state.x - center.x) + (state.z - center.z) * (state.z - center.z),
  );
  assert.equal(row.distanceM, expectedDistance, "the frame measures the camera pose (the spawn pose at control) to the placement centre, XZ Euclidean");
  assert.equal(row.hazeFactor, hazeFactor(row.distanceM), "the row's haze IS hazeFactor of the row's distance (mutation: scale haze in frame() -> red here while every main-glue substring pin stays green)");
  assert.equal(row.hazeFactor, 1, "the door-to-machine spawn distance sits inside HAZE_NEAR_M -- the I/O matrix Near row reads haze exactly 1");
  assert.ok(row.distanceM < HAZE_NEAR_M);
  const phase = debug.cabinets.phase;
  assert.equal(
    row.pulseApplied, glowPulse(phase),
    "pulseApplied is glowPulse of the kernel phase counter at frame time — the boot registers the tick chain (loop.start()) BEFORE frame()'s own rAF leg, and the pump drains each rAF batch in registration order, so the frame reads this pump's phase; a stale-read rewrite (phase - 1) reds here",
  );
  assert.equal(row.glowIntensity, CABINET_LIGHT_INTENSITY * row.pulseApplied * row.hazeFactor, "the shipped glow product law, bit-exact (mutation: drop pulseApplied from the product -> red here)");
  assert.ok(row.pulseApplied >= 0.7 && row.pulseApplied <= 1, "the pulse stays in [floor, 1] at the executable tier -- never black (AD-27)");

  const pair = pairLights();
  assert.equal(pair.length, 2 * cabinetPlacements.length, "the recorded rig graph holds the built halo/spill pair per cabinet (reach-distinguished at construction)");
  for (const light of pair) {
    assert.equal(light.intensity, row.glowIntensity, "the frame writes the row's glow onto the pair -- a handle the frame never reaches ships dark (the inert-tier bug this story exists to fix)");
  }
  assert.ok(pair.every((l) => l.intensity > 0), "lit, not dark, once frame() has run");
});

test("Story 2.3 boot tier (AC2/AC3): the synthetic walk -- teleport to the far interior corner, and the shipped frame() carries the haze gradient there: distance strictly larger, haze strictly below 1 yet at or above the never-zero floor (never reads dead, UX-DR17), and all eight pillar-bleed nodes (built dark at boot) lit from their SOURCE cabinet's numbers -- hue is the placement's marquee family, intensity is exactly SPILL_INTENSITY x pulseApplied x hazeFactor of the row", () => {
  // Snapshot the live row's numbers BEFORE the walk (rowFor hands back the
  // live leg object -- holding it across the walk would alias, not record).
  const nearDistance = rowFor(placement.volumeId).distanceM;
  const nearHaze = rowFor(placement.volumeId).hazeFactor;
  assert.equal(nearHaze, 1, "the walk starts at the spawn pose, inside the plateau");
  const halfX = INTERIOR.width / 2 - 0.5;
  const halfZ = INTERIOR.depth / 2 - 0.5;
  const corners = [
    { x: -halfX, z: -halfZ },
    { x: halfX, z: -halfZ },
    { x: -halfX, z: halfZ },
    { x: halfX, z: halfZ },
  ];
  const far = corners.reduce((best, c) =>
    Math.hypot(c.x - center.x, c.z - center.z) > Math.hypot(best.x - center.x, best.z - center.z) ? c : best,
  );
  // The walk rides the public player.teleport debug seam: if the seam's pose
  // contract moves this tier re-pins with it (DW-55 books its pitch-default
  // fix for Story 3.2).
  debug.player.teleport({ x: far.x, z: far.z, yaw: 0, pitch: 0 });
  pump(2);
  const row = rowFor(placement.volumeId);
  assert.ok(row.distanceM > nearDistance, "the walk is strictly farther from the source than the spawn pose");
  assert.ok(row.distanceM > HAZE_NEAR_M, `the far corner sits past the haze knee (${row.distanceM.toFixed(2)} m > ${HAZE_NEAR_M} m) on the authored room`);
  assert.ok(row.hazeFactor < 1, "haze strictly below 1 at the far pose -- the shipped frame() applies the gradient, not just ships the lines");
  assert.ok(row.hazeFactor >= HAZE_FLOOR && row.hazeFactor > 0, "never-zero at the executable tier: distant machines dim toward Room Black but never read dead (UX-DR17)");
  assert.equal(row.hazeFactor, hazeFactor(row.distanceM), "the far row is still the law over the walked distance (mutation: half the frame metric -> the far pose lands inside the plateau -> red here)");
  assert.equal(row.glowIntensity, CABINET_LIGHT_INTENSITY * row.pulseApplied * row.hazeFactor, "the product law holds at the far pose too");

  assert.equal(expectedBleed.length, 2 * pillars.length * 2, "the authored spill formula: 1 placement x 2 pillars x 2 relevant edges x 2 mounts");
  const bleed = bleedLights();
  assert.equal(bleed.length, expectedBleed.length, "the recorded boot rig graph holds every built bleed node");
  for (const a of expectedBleed) {
    const match = bleed.find((l) => Math.abs(l.position.x - a.x) < 1e-12 && Math.abs(l.position.z - a.z) < 1e-12 && Math.abs(l.position.y - spillMountY(a.mount)) < 1e-12);
    assert.ok(match, `a boot-built bleed node sits at the authored ${a.mount} anchor (${a.x}, ${a.z}) -- the frame ramps nodes that exist where the law mounts them`);
  }
  for (const light of bleed) {
    assert.equal(light.color.getHex(), placement.marqueeHue, "the bleed node is lit in its SOURCE cabinet's marquee family (mutation: hue the tier to p.hue in buildSpillNodes -> red here)");
    assert.equal(light.intensity, SPILL_INTENSITY * row.pulseApplied * row.hazeFactor, "the frame writes the source row's spill glow -- built dark at boot, lit from the SOURCE cabinet's numbers (AC2: the gradient carries into the pillar blind spots)");
    assert.ok(light.intensity > 0, "the bleed tier is not inert at the executable tier");
  }
});
