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
// Story 2.4 extends this tier (the spec's named executable consumer tier):
// the fake-global set gains matchMedia (the first-visit seed port), a Map-
// backed localStorage (the settings store — the return-visit leg needs it;
// the port-THROW degrade leg lives in settings.test.ts, where no such
// global exists), a recording createElement whose elements keep attrs/
// style/listeners so panel commits can be FIRED, an exitPointerLock
// recorder, and a location stub for the #settings hook. The new pins read
// each consumer at its own tier: audio master gain, the live camera's fov,
// the shipped input table/aim multiplier through dispatched key + drag
// events, the tempo cadence off the loop, the walk-out panel/queue-cost
// law, the deep-link second boot, and the settings-vs-stateHash identity
// row across two boots of the same seeded instance.
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

// The 2.4 element recorder: attrs, inline style, listeners (FIRED by the
// panel-commit pins), text/value/checked — the census settings-ui.test.ts
// checks at the fake-doc tier is EXECUTED here against the real module.
class FakeUiElement {
  tag: string;
  attrs = new Map<string, string>();
  listeners = new Map<string, Array<(ev?: unknown) => void>>();
  children: FakeUiElement[] = [];
  style: Record<string, string> = {};
  textContent = "";
  value = "";
  checked = false;
  width = 0;
  height = 0;
  constructor(tag: string) {
    this.tag = tag;
  }
  setAttribute(k: string, v: string): void {
    this.attrs.set(k, v);
  }
  getAttribute(k: string): string | null {
    return this.attrs.get(k) ?? null;
  }
  appendChild(n: FakeUiElement): FakeUiElement {
    this.children.push(n);
    return n;
  }
  removeChild(n: FakeUiElement): FakeUiElement {
    const i = this.children.indexOf(n);
    if (i >= 0) this.children.splice(i, 1);
    return n;
  }
  addEventListener(t: string, h: (ev?: unknown) => void): void {
    const arr = this.listeners.get(t) ?? [];
    arr.push(h);
    this.listeners.set(t, arr);
  }
  getContext(): null {
    return null; // workbench's canvas path only; the room paints on OffscreenCanvas
  }
  fire(t: string, ev?: unknown): void {
    for (const h of this.listeners.get(t) ?? []) h(ev);
  }
}

function collectTree(el: FakeUiElement): FakeUiElement[] {
  return el.children.flatMap((c) => [c, ...collectTree(c)]);
}

const bodyAppended: FakeUiElement[] = [];
const bodyRemoved: FakeUiElement[] = [];
let exitPointerLockCalls = 0;
const matchMediaQueries: string[] = [];

let rafQueue: Array<() => void> = [];
let pumpsRun = 0;
(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: () => void) => {
  rafQueue.push(cb);
  return rafQueue.length;
};
(globalThis as Record<string, unknown>).OffscreenCanvas = FakeCanvas;
// The 2.4 device-edge stubs: the reduced-motion seed port (never matches —
// the no-signal first visit seeds `low`), a Map-backed device store (the
// settings + identity persistence legs), and a location stub for the
// #settings hook. The port-THROW degrade posture is settings.test.ts /
// storage.test.ts territory (no localStorage global there at all).
(globalThis as Record<string, unknown>).matchMedia = (q: string) => {
  matchMediaQueries.push(q);
  return { matches: false, media: q, addEventListener() {} };
};
const storeMap = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => storeMap.get(k) ?? null,
  setItem: (k: string, v: string) => {
    storeMap.set(k, v);
  },
};
(globalThis as Record<string, unknown>).location = { hash: "" };
(globalThis as Record<string, unknown>).document = {
  body: {
    appendChild: (n: FakeUiElement) => {
      bodyAppended.push(n);
      return n;
    },
    removeChild: (n: FakeUiElement) => {
      bodyRemoved.push(n);
      return n;
    },
  },
  documentElement: { addEventListener() {} },
  addEventListener() {},
  pointerLockElement: null,
  createElement: (tag: string) => new FakeUiElement(tag),
  exitPointerLock: () => {
    exitPointerLockCalls += 1;
  },
};
const windowListeners = new Map<string, Array<(ev?: unknown) => void>>();
(globalThis as Record<string, unknown>).window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  addEventListener: (t: string, h: (ev?: unknown) => void) => {
    const arr = windowListeners.get(t) ?? [];
    arr.push(h);
    windowListeners.set(t, arr);
  },
  removeEventListener: (t: string, h: (ev?: unknown) => void) => {
    const arr = windowListeners.get(t) ?? [];
    const i = arr.indexOf(h);
    if (i >= 0) arr.splice(i, 1);
  },
};
function fireWindow(type: string, ev: unknown): void {
  for (const h of windowListeners.get(type) ?? []) h(ev);
}
// No AudioContext global (the silent-graph path) -- it degrades by
// construction, unstubbed.

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
    pumpsRun += 1;
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
  camerasBuilt: Array<{ fov: number }>;
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

import { CABINET_LIGHT_INTENSITY, CABINET_LIGHT_REACH, CABINET_PHASE_CYCLE_TICKS, cabinetPlacements, placementGeometry } from "./room/cabinets.ts";
import { collisionVolumes, ENTRY_SPAWN, INTERIOR } from "./room/collision-volumes.ts";
import { SETTINGS_KEY, type SettingsRows } from "./settings.ts";
import { BOB_AMPLITUDE } from "./player.ts";
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

// --- Story 2.4 boot tier: settings ride every consumer at the executable
// tier (the spec's named consumer leg). The 2.3 tests above ran the room to
// control already; this block boots ONCE MORE only for the deep-link and
// identity legs. All of it is this file's own stub state: no :5173, no
// browser, no other suite. ---

const isPanel = (n: FakeUiElement): boolean => n.attrs?.get("data-panel") === "settings";
const panelCount = (list: FakeUiElement[]): number => list.filter(isPanel).length;

test("Story 2.4 boot tier (AC4/AC2): first visit boots the preset ON at the seeded value, the rows reach every consumer AT boot (master gain 1.0, camera CONSTRUCTED at FOV 60, vignette appended hidden), and the seed port is the local matchMedia read consulted exactly once", () => {
  assert.equal(debug.settings.state().stored, false, "first visit: seeded, NOT persisted until the first change (AC4 persist-on-change law, executed)");
  assert.equal(debug.settings.state().degraded, false, "the fake device store keeps the layer healthy (the port-throw degrade leg is settings.test.ts, where no localStorage global exists)");
  assert.equal(debug.settings.rows().preset, "low", "no OS reduced-motion signal -> seed `low` -> half bob (UX-DR20, executed at the consumer tier)");
  assert.deepEqual(matchMediaQueries, ["(prefers-reduced-motion: reduce)"], "the seed port is the LOCAL matchMedia read, consulted exactly ONCE at boot (AD-18: the bundle stays sealed)");
  assert.equal(debug.audio.state().masterGain, 1, "master 100 -> gain 1.0 at boot: 2.1's graph byte-identity, executed");
  assert.equal(shim.camerasBuilt[0]!.fov, 60, "the shipped camera is CONSTRUCTED at the row's FOV (the eager settings-before-camera boot order, executed — a default-boot room is byte-identical to 2.3)");
  const overlay = bodyAppended.find((n) => n.attrs?.get("data-overlay") === "vignette");
  assert.ok(overlay, "the vignette overlay exists at boot (created once by settings-ui)");
  assert.equal(overlay!.style.display, "none", "off by default (matrix vignette-off row)");
  assert.equal(overlay!.children.length, 0, "zero children");
  assert.equal(overlay!.textContent, "", "zero text");
  assert.equal(overlay!.listeners.size, 0, "zero listeners — pointer-events:none decoration, never interactive");
});

test("Story 2.4 boot tier (AC2): rows ride LIVE getters into the shipped consumers — a rebound table moves the walk to KeyQ (KeyW idles), the walk's bob amplitude is the low-preset half, and sensitivity 100 doubles the drag-look delta with no service rebuild", () => {
  debug.player.teleport({ x: 0, z: 0, yaw: 0, pitch: 0 });
  pump(1);
  debug.settings.commit({ binding: { forward: "KeyQ", back: "KeyS", left: "KeyA", right: "KeyD" } });
  const z0 = debug.player.state.z;
  fireWindow("keydown", { code: "KeyW", repeat: false });
  pump(4);
  assert.equal(debug.player.state.z, z0, "KeyW idles once rebound — the SHIPPED takeView maps through the settings table (replay currency unchanged)");
  fireWindow("keydown", { code: "KeyQ", repeat: false });
  pump(4);
  assert.ok(debug.player.state.z < z0, "KeyQ walks deeper into the room through the shipped chain (yaw 0 faces -Z, the three.js convention — interior is smaller z; a text-tier pin cannot show this)");
  assert.equal(debug.player.state.bobAmp, BOB_AMPLITUDE / 2, "the low preset's effective bob amplitude lands on player.step (UX-DR20 supersedes the 1.2 ±0.04 default)");
  fireWindow("keyup", { code: "KeyQ" });
  // The aim multiplier through the shipped drag path (silent fallback, no
  // lock granted: pointerLockElement stayed null the whole time).
  const yaw0 = debug.player.state.yaw;
  fireWindow("mousedown", { button: 0 });
  fireWindow("mousemove", { movementX: 20, movementY: 0 });
  fireWindow("mouseup", { button: 0 });
  pump(1);
  const d1 = debug.player.state.yaw - yaw0;
  assert.notEqual(d1, 0, "drag-look reaches yaw through the shipped input service at multiplier 1.0 (sens 50 = 1.0 identity)");
  debug.settings.commit({ sensitivity: 100 });
  const yaw1 = debug.player.state.yaw;
  fireWindow("mousedown", { button: 0 });
  fireWindow("mousemove", { movementX: 20, movementY: 0 });
  fireWindow("mouseup", { button: 0 });
  pump(1);
  // Tolerance, not equality: the law is yaw -= (dx * m) * MOUSE_SENSITIVITY,
  // so the 2x lands as fl(40*0.0025) while 2*d1 is 2*fl(20*0.0025) — 1 ulp
  // apart in binary. (20*2)*0.0025 would re-derive the expression instead.
  assert.ok(Math.abs(debug.player.state.yaw - yaw1 - 2 * d1) < 1e-12, "sensitivity 100 = exactly 2x the same physical delta (to float representation), landing through the LIVE getter (no rebuild — AD-7)");
  // Matrix "Look-source arrows", executed tier: panel down, source arrows —
  // a held arrow writes the SAME aim channel into yaw through the shipped
  // takeView (one channel, three producers; AD-26 replay shape unchanged).
  debug.settings.commit({ sensitivity: 50 });
  debug.settings.commit({ lookSource: "arrows" });
  const yaw2 = debug.player.state.yaw;
  fireWindow("keydown", { code: "ArrowLeft", repeat: false });
  pump(1);
  fireWindow("keyup", { code: "ArrowLeft" });
  assert.notEqual(debug.player.state.yaw, yaw2, "arrows mode turns the camera through the shipped chain (the arrow producer is real at the boot tier, not just the unit tier)");
});

// The pump clock adds one EXTRA loop tick every 50th pump (17 ms/pump over
// 1000/60 ms/tick: ticks = floor(1.02 * pump), doubling at pump %50 == 0).
// Cadence windows sit just after a boundary so exactly 8 single-tick pumps
// fall before the next double.
function alignCadence(): void {
  while (pumpsRun % 50 > 41) pump(1);
}

test("Story 2.4 boot tier (AC5): the calm row wraps the shipped tempo call site — +1 phase per loop tick at calm off, +1 per TWO ticks after the commit, pulse consumers keep running (liveness invisible, never dark)", () => {
  alignCadence();
  // The phase counter runs mod CABINET_PHASE_CYCLE_TICKS (cabinets.ts law) —
  // the window delta is read through the wrap so the pin holds at any phase
  // offset (the deltas 8 and 4 are far below the cycle; no aliasing).
  const dphase = (from: number): number => (debug.cabinets.phase - from + CABINET_PHASE_CYCLE_TICKS) % CABINET_PHASE_CYCLE_TICKS;
  const p0 = debug.cabinets.phase;
  pump(8);
  assert.equal(dphase(p0), 8, "calm off: the 1.4/2.3 cadence byte-unchanged (one phase tick per loop tick, exactly 8 loop ticks in the aligned window)");
  debug.settings.commit({ calmCabinets: true });
  alignCadence();
  const p1 = debug.cabinets.phase;
  pump(8);
  assert.equal(dphase(p1), 4, "calm ON: one phase tick per TWO loop ticks — the falsifier (a wrap advancing every tick) is red RIGHT HERE, executed off the loop record, not the text");
  assert.ok(debug.atmosphere[0]!.pulseApplied >= 0.7, "the pulse/glow consumers keep running on the slowed phase (AD-27 liveness)");
});

test("Story 2.4 boot tier (AC7): the literal walk-out — crossing the door plane outward mounts the same-document panel and releases the lock SILENTLY, the scheduler/seat see the visitor absent (the absence laws ARE the queue cost), and the panel's own slider/switch commits land on the LIVE camera, graph, and overlay", () => {
  const locks0 = exitPointerLockCalls;
  debug.player.teleport({ x: 0, z: 7, yaw: 0, pitch: 0 }); // past the street edge, inside the door gap
  let guard = 0;
  while (panelCount(bodyAppended) === 0 && guard < 20) {
    pump(1);
    guard += 1;
  }
  const root = bodyAppended.find(isPanel);
  assert.ok(root, "crossing outward opened the exit view (the tick-pose detector executed — flip the door bit without this system and the walk-out matrix row is red)");
  assert.ok(exitPointerLockCalls > locks0, "pointer lock released silently — the exitPointerLock call is the whole announce (UX-DR18 posture)");
  pump(2);
  for (const c of debug.scheduler.state().cabinets) {
    assert.notEqual(c.occupancy, "visitor-seated", "no chair holds a visitor while the visitor is outside (the presence predicate reads tick pose)");
    assert.equal(c.queue.length, 0, "no claim survives the absence — the void/re-arm laws ARE the queue-position cost (no scheduler API was added)");
  }
  assert.equal(debug.seat.state().seated, false, "the chair law: empty while the visitor stands outside");
  // The panel is real DOM (settings-ui over the fake doc): fire its events.
  const nodes = [root!, ...collectTree(root!)];
  const master = nodes.find((el) => el.attrs.get("id") === "master");
  assert.ok(master, "the master slider exists in the mounted panel");
  master!.value = "40";
  master!.fire("input");
  assert.equal(debug.audio.state().masterGain, 0.4, "slider commit -> graph master gain settles v/100 LIVE (the applyRows seam, no reload)");
  assert.equal(JSON.parse(storeMap.get(SETTINGS_KEY)!).masterVolume, 40, "and it persisted to arcade.settings.v1 at once (matrix Slider-commit row)");
  const fovEl = nodes.find((el) => el.attrs.get("id") === "fov");
  fovEl!.value = "90";
  fovEl!.fire("input");
  assert.equal(shim.camerasBuilt[0]!.fov, 90, "FOV commit lands on the LIVE camera instance (the construction-time 60 moved without any rebuild)");
  const vign = nodes.find((el) => el.attrs.get("id") === "vignette");
  vign!.fire("click");
  assert.equal(debug.settings.rows().vignette, true, "the switch commit flipped the row");
  const overlay = bodyAppended.find((n) => n.attrs?.get("data-overlay") === "vignette");
  assert.equal(overlay!.style.display, "block", "the overlay toggles DISPLAY ONLY (it carried zero text/children/listeners at boot)");
  // Review law (the page owns the keyboard while it is up): with the panel
  // mounted the LOOK channel is gated — arrows-mode arrows produce nothing,
  // a stray drag is consumed but never emitted — while MOVEMENT stays live
  // (crossing back is still the walk-in law, AC7). lookSource is already
  // "arrows" (committed by the live-getters leg), so the producer is armed.
  const zGate = debug.player.state.z;
  const yawGate = debug.player.state.yaw;
  fireWindow("keydown", { code: "ArrowLeft", repeat: false });
  fireWindow("mousedown", { button: 0 });
  fireWindow("mousemove", { movementX: 30, movementY: 0 });
  fireWindow("mouseup", { button: 0 });
  pump(2);
  fireWindow("keyup", { code: "ArrowLeft" });
  assert.equal(debug.player.state.yaw, yawGate, "arrows navigate the page, never the camera, while the panel is up (mutation: drop the lookEnabled wiring in main.ts -> yaw moves, red here)");
  fireWindow("keydown", { code: "KeyQ", repeat: false }); // the standing rebound from the live-getters leg
  pump(1);
  fireWindow("keyup", { code: "KeyQ" });
  assert.ok(debug.player.state.z < zGate, "MOVEMENT stays live under the look gate — the walk-back close law is executable from the page");
});

test("Story 2.4 boot tier (AC7): crossing back closes the panel; re-crossing re-mounts it lazily; Back-to-the-arcade returns the visitor to ENTRY_SPAWN in the SAME document — identity intact, no navigation, the loop never stopped", () => {
  debug.player.teleport({ x: 0, z: 5.9, yaw: 0, pitch: 0 }); // at the door's inner face (the dead-band's close side)
  pump(2);
  assert.equal(panelCount(bodyRemoved), 1, "crossing inward closed it — no panel overlays in-room control (AC7)");
  const vidBefore = debug.storage.visitorId();
  debug.player.teleport({ x: 0, z: 7, yaw: 0, pitch: 0 });
  let guard = 0;
  while (panelCount(bodyAppended) < 2 && guard < 20) {
    pump(1);
    guard += 1;
  }
  assert.equal(panelCount(bodyAppended), 2, "the second crossing re-mounted a FRESH panel (lazy mount, old one unmounted)");
  const root2 = bodyAppended.filter(isPanel)[1]!;
  const back = collectTree(root2).find((el) => el.textContent === "Back to the arcade");
  assert.ok(back, "the Back control carries the mockup's words (copy law, executed)");
  // Review law (the pending capture is page-scoped): a rebind capture left
  // pending is CANCELLED at close — its keydown listener must never
  // outlive the page that armed it, and a cancelled capture commits
  // nothing.
  const rebindBtn = collectTree(root2).find((el) => el.attrs.has("data-rebind"));
  assert.ok(rebindBtn, "the Rebind control exists in the mounted panel (the glue's capture seam)");
  rebindBtn.fire("click");
  const binding0 = JSON.stringify(debug.settings.rows().binding);
  back!.fire("click"); // close while the capture is STILL pending
  assert.equal(JSON.stringify(debug.settings.rows().binding), binding0, "closing with a capture pending commits nothing (mutation: drop the pendingCapture() call in closeExitView -> KeyZ below binds forward, red)");
  fireWindow("keydown", { code: "KeyZ", repeat: false });
  fireWindow("keyup", { code: "KeyZ" });
  pump(1);
  assert.equal(JSON.stringify(debug.settings.rows().binding), binding0, "and no stale capture listener survives the unmount to answer a later key");
  assert.deepEqual(
    { x: debug.player.state.x, z: debug.player.state.z },
    { x: ENTRY_SPAWN.x, z: ENTRY_SPAWN.z },
    "Back re-enters at the authored spawn (the teleport seam — no claim restored: the absence laws already ran)",
  );
  assert.equal(panelCount(bodyRemoved), 2, "panel gone — same document throughout (a reload would have reset the identity service; it did not)");
  assert.equal(debug.storage.visitorId(), vidBefore, "the session identity is UNCHANGED across the whole exit/re-enter arc — nothing reloaded");
  pump(2);
  assert.equal(debug.entry.phase(), "control", "the entry beat stayed control (it kept ticking behind the panel, never re-run)");
  assert.ok(debug.loop.tickCount > 0, "the room never stopped ticking");
});

let boot2AtPump = 0;

test("Story 2.4 boot tier (AC4/AC7): #settings at load boots STRAIGHT into the exit view over the still-ticking entry beat, and the return visit rides the stored rows verbatim — the seed port is NEVER consulted again, the stored FOV feeds camera CONSTRUCTION, and the stored vignette boots ON", async () => {
  const rows1 = debug.settings.rows(); // settings X: everything committed during the tier above
  const removed0 = panelCount(bodyRemoved);
  const locks0 = exitPointerLockCalls;
  (globalThis as Record<string, unknown>).location = { hash: "#settings" };
  await import("./main.ts?settings-boot");
  const d2 = (globalThis as Record<string, any>).window.arcadeDebug;
  boot2AtPump = pumpsRun;
  assert.ok(d2, "the deep-link boot reached arcadeDebug (a throw would land the workbench and leave it undefined)");
  assert.equal(panelCount(bodyAppended), 3, "the panel is UP AT BOOT — no walk needed (the hash hook, executed over the street/entry context)");
  assert.deepEqual(d2.settings.rows(), rows1, "return visit: the stored payload rides verbatim (the matrix Return-visit row, executed across a real module re-import)");
  assert.equal(matchMediaQueries.length, 1, "...and the seed port was NEVER consulted again (AC4's never-re-seed law, executed)");
  assert.equal(shim.camerasBuilt.length, 2, "the second boot constructed its own camera");
  assert.equal(shim.camerasBuilt[1]!.ctorFov, rows1.fov, "the RETURN-VISIT FOV feeds camera CONSTRUCTION — the recorded CONSTRUCTOR argument, not the post-apply live scalar (mutation: build the camera at hardcoded 60 in main.ts -> red here; applyRows alone never satisfies this)");
  assert.equal(shim.camerasBuilt[1]!.fov, rows1.fov, "and the live camera carries it after boot too (the boot applyRows leg)");
  const overlays = bodyAppended.filter((n) => n.attrs?.get("data-overlay") === "vignette");
  assert.equal(overlays.length, 2, "one overlay per boot (mount-once, never per panel)");
  assert.equal(overlays[1]!.style.display, "block", "the stored vignette=true rides applyRows AT boot onto the new overlay (the row was flipped true during the walk-out leg)");
  pump(6);
  assert.ok(d2.loop.tickCount > 0, "the loop ticks BEHIND the panel from load (matrix #settings row — the room never waits for the page)");
  assert.notEqual(d2.entry.phase(), "control", "the entry beat is still mid-run behind the panel (6 pumps = ~100 ms of fake clock)");
  assert.equal(panelCount(bodyRemoved), removed0, "the panel stays up while the visitor (at spawn) has not crossed");
  assert.ok(exitPointerLockCalls > locks0, "the deep-link open released the lock too (same code path as the walk-out)");
  // Review law (BH-1/EH-2): the spawn pose (5.6) sits inside the door's
  // close side — the CLOSE arm must be gated on an ACTUAL outward crossing,
  // or the detector tick-closes the panel the visitor opened by DEEP LINK.
  let entryGuard = 0;
  while (d2.entry.phase() !== "control" && entryGuard < 500) {
    pump(1);
    entryGuard += 1;
  }
  assert.equal(d2.entry.phase(), "control", "the entry beat still completes behind the deep-linked panel");
  assert.equal(panelCount(bodyRemoved), removed0, "the deep-linked panel SURVIVES the control handover (mutation: drop the openedByCrossing arm in the close condition -> the spawn pose tick-closes it, red here; the entry dolly is view-side, so the phase gate above is defensive — the text tier pins that guard)");
});

test("Story 2.4 boot tier (AC5): accommodations never fork a run — the boot-2 instance under settings X and a FRESH boot-3 instance under settings Y (same authored seed, age-aligned window) produce byte-identical stateHash sequences", async () => {
  const d2 = (globalThis as Record<string, any>).window.arcadeDebug as Record<string, any>; // still boot 2
  const instX = d2.instances.get("moon-patrol");
  assert.ok(instX, "boot 2 attached the registry game instance (the instances leg reads the LIVE guarded map)");
  const K = 120;
  const seqX: Array<{ age: number; h: string }> = [];
  for (let i = 0; i < K; i += 1) {
    pump(1);
    seqX.push({ age: pumpsRun - boot2AtPump, h: instX.stateHash() });
  }
  (globalThis as Record<string, unknown>).location = { hash: "" };
  await import("./main.ts?identity-boot");
  const d3 = (globalThis as Record<string, any>).window.arcadeDebug as Record<string, any>; // boot 3
  assert.ok(d3.settings, "boot 3 reached the debug handle (a boot throw would land the workbench instead)");
  d3.settings.commit({
    preset: "off",
    sensitivity: 25,
    fov: 110,
    masterVolume: 7,
    calmCabinets: false,
    vignette: false,
    binding: { forward: "KeyM", back: "KeyN", left: "KeyH", right: "KeyJ" },
  });
  assert.notEqual(d3.settings.rows().sensitivity, d2.settings.rows().sensitivity, "the windows really run under different rows (X: sens 100 / Y: sens 25 — the falsifier: a settings change that mutates game state is red below)");
  const instY = d3.instances.get("moon-patrol");
  assert.ok(instY, "boot 3 attached the same-seed instance (the SAME generated registry module — the authored seed is shared)");
  // Age alignment: loop N steps floor(1.02 * age) ticks at age a — boot 3
  // warms to ONE pump below boot 2's first-sample age, so its first sample
  // lands at exactly that age (the every-50th double then lands on the same
  // sample in both loops).
  pump(seqX[0]!.age - 1);
  const seqY: string[] = [];
  for (let i = 0; i < K; i += 1) {
    pump(1);
    seqY.push(instY.stateHash());
  }
  assert.notEqual(seqX[0]!.h, seqX[K - 1]!.h, "the sim ADVANCED during the window (a frozen comparison would pass vacuously)");
  for (let i = 0; i < K; i += 1) {
    assert.equal(seqY[i], seqX[i]!.h, `sample ${i} (age ${seqX[i]!.age}): settings Y forked the seeded run (AC5 — accommodations are device-layer, never replay currency; AD-26)`);
  }
});
