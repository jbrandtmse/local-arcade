// Story 1.5 QA (AC4 declared-slot law + UX-DR24 legend honesty): every key
// the attract screen teaches must actually drive the game, end to end
// through the REAL rig — kernel loop, input service, player controller,
// seat service, registry entry, wrapper. The seat's raw-code -> declared-
// slot mapping is driven here through its BUTTON half (KeyX/KeyK jump,
// KeyZ/KeyJ fire) and the speed legend's arrow half (ArrowLeft/ArrowRight)
// — the mapping paths the seat suite leaves at the move-letter level.
// Plus the consistency law at the established source-pin tier (DW-15): the
// adapter's on-screen legend, core/main.ts's authored SEAT_KEYS block, and
// the key set these tests execute are ONE set in both directions — the
// defect class that once advertised PAUSE/MUTE on a screen whose declared
// vocab could never honour them.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createKernelLoop, MS_PER_TICK } from "./loop.ts";
import { createInputService, type InputService } from "./input/index.ts";
import { createPlayerController, MOUSE_SENSITIVITY, type PlayerController } from "./player.ts";
import { createSeatService, type SeatKeyMap } from "./seat.ts";
import { createGameInstance, type GameInstance, type TickInput } from "./contract/index.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { createCabinetRuntime, placementGeometry, type CabinetRuntime } from "./room/cabinets.ts";
import { gameRegistry } from "../generated/game-registry.ts";

const REPO = path.resolve(import.meta.dirname, "..");

// The executed key set — identical to core/main.ts's authored SEAT_KEYS
// block (the legend-consistency test below pins that equality, both ways).
const MOON_KEYS: SeatKeyMap = {
  axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
  buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
};

interface Visit {
  loop: ReturnType<typeof createKernelLoop>;
  player: PlayerController;
  input: InputService;
  seat: ReturnType<typeof createSeatService>;
  instance: GameInstance;
  cabinets: CabinetRuntime;
  clock: { ms: number };
  tick(): void;
  key(code: string, down: boolean): void;
}

// One full rig, wired as core/main.ts wires it: the registry entry's sim
// half through the wrapper, a kernel-owned TickInput the seat writes, the
// player + seat systems on the loop, pointer-locked aim.
function rig(seedFn: () => number): Visit {
  const cabinets = createCabinetRuntime();
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const entry = gameRegistry.find((e) => e.id === "moon-patrol")!;
  const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
  const tickInput: TickInput = { controls: {} };
  loop.addInstance(entry.id, instance, tickInput);
  const input = createInputService({ requestPointerLock: () => {} });
  input.pointerLockChanged(true);
  const seat = createSeatService({ player, cabinets, loop, seedFn });
  seat.track({
    volumeId: "cabinet-B0",
    gameId: entry.id,
    instance,
    input: tickInput,
    controls: entry.controls!,
    keys: MOON_KEYS,
  });
  player.registerInteractable("cabinet-B0", (id) => seat.handleInteract(id));
  loop.addSystem("player", () => player.step(1, seat.playerView(input.takeView())));
  loop.addSystem("seat", () => seat.step(input.takeCodeView()));
  return {
    loop,
    player,
    input,
    seat,
    instance,
    cabinets,
    clock,
    tick() {
      // A hair above the tick length so the accumulator yields exactly one
      // global tick per scripted step across these run lengths.
      clock.ms += MS_PER_TICK * 1.0001;
      assert.equal(loop.step(), 1, "exactly one global tick per frame at the tick rate");
    },
    key(code, down) {
      input.key(code, down);
    },
  };
}

// Walk the visitor into center-of-view of B0 (real resolver, real
// targeting), settle 30 idle ticks (bob eased out), return the rig.
function walkToB0(seedFn: () => number = () => 4242): Visit {
  const v = rig(seedFn);
  const g = placementGeometry("B0");
  const want = Math.atan2(-(g.center.x - ENTRY_SPAWN.x), -(g.center.z - ENTRY_SPAWN.z));
  v.input.mouseMove((ENTRY_SPAWN.yaw - want) / MOUSE_SENSITIVITY, 0);
  v.tick();
  v.key("KeyW", true);
  let guard = 0;
  while (v.player.state.targetId === null && guard < 6000) {
    v.tick();
    guard += 1;
  }
  v.key("KeyW", false);
  assert.ok(v.player.state.targetId === "cabinet-B0", `walk reached B0 (target=${v.player.state.targetId})`);
  for (let i = 0; i < 30; i++) v.tick();
  return v;
}

// E-cycle to the chair: first press opens the coin door, second sits.
function openAndSit(v: Visit): void {
  v.key("KeyE", true);
  v.tick();
  v.key("KeyE", false);
  v.key("KeyE", true);
  v.tick();
  v.key("KeyE", false);
  assert.equal(v.instance.mode(), "play", "seated: the run is in play mode");
}

interface BuggyView {
  x: number;
  y: number;
  speed: number;
  onGround: boolean;
  fwd: unknown;
  up: unknown;
}
const buggyOf = (v: Visit): BuggyView =>
  (v.instance.snapshot() as { world: { buggy: BuggyView } }).world.buggy;

const drainedTypes = (v: Visit): string[] => v.seat.state().events.map((r) => r.event.type);

test("KeyX through the seat jumps the buggy: 'jump' fx drains and the buggy leaves the ground, while the no-key twin never leaves it (AC4 executed button-mapping law)", () => {
  const run = (code: string | null) => {
    const v = walkToB0();
    openAndSit(v);
    const y0 = buggyOf(v).y;
    if (code != null) v.key(code, true);
    let airborne = false;
    for (let i = 0; i < 60; i++) {
      v.tick();
      if (code != null && i === 2) v.key(code, false); // one press window
      if (buggyOf(v).y < y0 - 1) airborne = true;
    }
    return { airborne, jumps: drainedTypes(v).filter((t) => t === "jump").length };
  };
  const withKey = run("KeyX");
  assert.ok(withKey.airborne, "KeyX reaches the declared jump slot: the buggy rises");
  assert.ok(withKey.jumps >= 1, "the vendored 'jump' fx rides out as a game-local event");
  const twin = run(null);
  assert.ok(!twin.airborne, "the twin that never touched the key stays grounded (the rise came from the key, not the world)");
  assert.equal(twin.jumps, 0, "and it emits no jump fx");
});

test("the alternate jump key K jumps too (the legend advertises 'X or K' and both must work)", () => {
  const v = walkToB0();
  openAndSit(v);
  const y0 = buggyOf(v).y;
  v.key("KeyK", true);
  let airborne = false;
  for (let i = 0; i < 60; i++) {
    v.tick();
    if (i === 2) v.key("KeyK", false);
    if (buggyOf(v).y < y0 - 1) airborne = true;
  }
  assert.ok(airborne, "KeyK reaches the declared jump slot");
  assert.ok(drainedTypes(v).includes("jump"), "and the jump fx drains");
});

test("KeyZ through the seat fires the buggy's forward + up missiles: fwd/up bullets appear and 'fire' fx drains; the no-key twin never shoots (AC4, airtight buggy-exclusive marker)", () => {
  const run = (code: string | null) => {
    const v = walkToB0();
    openAndSit(v);
    if (code != null) v.key(code, true);
    for (let i = 0; i < 6; i++) v.tick(); // fwd ttl 0.6 s, up flight ~0.37 s (config bullets): both live at tick 6
    const b = buggyOf(v);
    return { fired: b.fwd != null && b.up != null, fireEvents: drainedTypes(v).filter((t) => t === "fire").length };
  };
  const withKey = run("KeyZ");
  assert.ok(withKey.fired, "KeyZ reaches the declared fire slot: the fwd+up volley exists");
  assert.ok(withKey.fireEvents >= 1, "the 'fire' fx drains as a game-local event");
  const twin = run(null);
  assert.ok(!twin.fired, "the twin never spawned a buggy volley (fwd/up bullets exist only on a fire input)");
});

test("the alternate fire key J shoots too (the legend advertises 'Z or J')", () => {
  const v = walkToB0();
  openAndSit(v);
  v.key("KeyJ", true);
  for (let i = 0; i < 6; i++) v.tick();
  const b = buggyOf(v);
  assert.ok(b.fwd != null && b.up != null, "KeyJ reaches the declared fire slot");
  assert.ok(drainedTypes(v).includes("fire"), "and the fire fx drains");
});

test("the arrows half of the speed legend maps onto the declared move axis: ArrowRight reaches the fast cap 190, ArrowLeft returns to the slow floor 100 (AC4; vendored 'NEVER STOPS' law)", () => {
  const v = walkToB0();
  openAndSit(v);
  v.key("ArrowRight", true);
  for (let i = 0; i < 60; i++) v.tick();
  const fast = buggyOf(v);
  assert.ok(Math.abs(fast.speed - 190) < 1e-6, "ArrowRight reaches the fast cap (move +1 in the declared slot)");
  const xAtSwitch = fast.x;
  v.key("ArrowRight", false);
  v.key("ArrowLeft", true);
  for (let i = 0; i < 30; i++) v.tick();
  const slow = buggyOf(v);
  assert.ok(Math.abs(slow.speed - 100) < 1e-6, "ArrowLeft returns to the slow floor (move -1, the buggy never reverses)");
  // The free-run twin covers (190+100)/2 * 0.5 s = 72.5 px in the window;
  // the ArrowLeft run decelerates immediately, so it lands short of that.
  assert.ok(slow.x < xAtSwitch + 72.5, "the ArrowLeft window left the buggy behind the no-arrow free run");
  v.key("ArrowLeft", false);
});

function codesOf(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/"(Key[A-Za-z]+|ArrowLeft|ArrowRight|Enter)"/g)) out.add(m[1]!);
  return [...out].sort();
}

test("the on-screen legend, the authored kernel key map, and the keys these tests execute are ONE set in both directions (UX-DR24 legend law; source-pin tier per DW-15 precedent)", () => {
  const adapter = readFileSync(path.join(REPO, "games", "moon-patrol", "presentation", "adapter.js"), "utf8");
  const main = readFileSync(path.join(REPO, "core", "main.ts"), "utf8");

  // The four attract-legend lines exactly as the screen draws them.
  const speedLine = /'([^']*CONTROL SPEED[^']*)'/.exec(adapter)?.[1];
  const fireLine = /'([^']*FIRE[^']*)'/.exec(adapter)?.[1];
  const jumpLine = /'([^']*JUMP[^']*)'/.exec(adapter)?.[1];
  const startLine = /'([^']*START[^']*)'/.exec(adapter)?.[1];
  assert.ok(speedLine != null && fireLine != null && jumpLine != null && startLine != null, "the attract legend advertises the four actions");
  assert.ok(speedLine.includes("\\u2190 \\u2192") && speedLine.includes("A D"), "speed is advertised as the arrows or A D");
  assert.ok(fireLine.includes("Z or J"), "fire is advertised as Z or J");
  assert.ok(jumpLine.includes("X or K"), "jump is advertised as X or K");
  assert.ok(startLine.includes("ENTER"), "start is advertised as ENTER");

  // The kernel's authored map (core/main.ts SEAT_KEYS block) and the set
  // the executed tests above drive — each must equal the screen's set.
  const block = /const SEAT_KEYS[\s\S]*?\n\};/.exec(main)?.[0];
  assert.ok(block != null, "core/main.ts authors a SEAT_KEYS legend map");
  const advertised = ["ArrowLeft", "ArrowRight", "Enter", "KeyA", "KeyD", "KeyJ", "KeyK", "KeyX", "KeyZ"];
  assert.deepEqual(codesOf(block), advertised, "SEAT_KEYS advertises exactly the nine keys the screen teaches (no dead key advertised, no working key hidden)");
  assert.deepEqual(codesOf(JSON.stringify(MOON_KEYS)), advertised, "and the key set the executed pins above drive is the same nine (authored and executed never drift apart)");
});
