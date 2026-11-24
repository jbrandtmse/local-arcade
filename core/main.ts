// Browser entry: the render side only (AD-3 — render is decoupled from the
// fixed-tick kernel). Story 1.2 makes it a first-person visit: the Core
// input service (AD-7) captures devices, the player controller runs as a
// kernel system inside the global tick (AD-15), and the camera merely READS
// player tick state at render — no motion is computed in render. Nothing
// here creates any DOM besides the canvas the renderer owns: no lock prompt,
// no HUD, no overlay of any kind (UX-DR18, AD-24, NFR-8). Pointer-lock
// denial falls back silently to drag-look inside the input service.

import * as THREE from "three";
import { createKernelLoop, type EventRecord, type KernelLoop } from "./loop.ts";
import {
  createGameInstance,
  math,
  type GameInstance,
  type PresentationHooks,
  type TickInput,
} from "./contract/index.ts";
import { createInputService } from "./input/index.ts";
import { createPlayerController, EYE_HEIGHT, type PlayerController } from "./player.ts";
import { createSeatService, type BusyGate, type SeatKeyMap, type SeatService } from "./seat.ts";
import { createPatronScheduler, type PatronScheduler } from "./patrons/scheduler.ts";
import { createFigurePresenter, type FigurePresenter } from "./patrons/presenter.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { buildRoomScene, type Three } from "./room/scene.ts";
import { ROOM_BLACK, WALL_WARM, toCss } from "./room/tokens.ts";
import { compositeScreen, repaintScreen, type CanvasFactory } from "./room/surfaces.ts";
import {
  MARQUEE_CAP_M,
  SHELL,
  SCREEN_ATTRACT_CAP_M,
  cabinets,
  coinDoorOpen,
  coinDoorPose,
  cabinetPlacements,
  placementByVolumeId,
  placementGeometry,
  screenPaintStep,
  stepCabinetPhase,
  toggleCoinDoor,
  type CabinetRuntime,
} from "./room/cabinets.ts";
import { gameRegistry } from "../generated/game-registry.ts";

declare global {
  interface Window {
    /** Non-visual state handle for headless QA and the lead's console
     * smoke (Design Notes item 6) — nothing is rendered or announced.
     * 1.4 adds the cabinet runtime (phase + coin doors) for the console
     * liveness/targeting smoke; 1.6 adds the Patron scheduler (occupancy
     * per busy cabinet + queue) and the figure presenter (reaction). */
    arcadeDebug: {
      player: PlayerController;
      loop: KernelLoop;
      cabinets: CabinetRuntime;
      seat: SeatService;
      scheduler: PatronScheduler;
      presenter: FigurePresenter;
    };
  }
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(ROOM_BLACK, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = "YXZ"; // yaw then pitch, matching the player controller's convention

// Story 1.3: the authored room — volumes/zones/slots/signage/tokens extruded
// to meshes and lights ONCE here (static authored scene, AD-3/AD-15). The
// painters take injected OffscreenCanvas factories, so the page still grows
// exactly one DOM node: the renderer canvas below (no-ui-dom pin).
const makeCanvas: CanvasFactory = (width, height) => new OffscreenCanvas(width, height);
const three: Three = {
  boxGeometry: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  standardMaterial: (params) => new THREE.MeshStandardMaterial(params as THREE.MeshStandardMaterialParameters),
  mesh: (geometry, material) => new THREE.Mesh(geometry as THREE.BufferGeometry, material as THREE.Material),
  pointLight: (color, intensity, distance) => new THREE.PointLight(color, intensity, distance),
  ambientLight: (color, intensity) => new THREE.AmbientLight(color, intensity),
  canvasTexture: (source) => new THREE.CanvasTexture(source as CanvasImageSource),
  markTextureUpdated: (texture) => {
    (texture as THREE.Texture).needsUpdate = true; // repaint of a live screen
  },
};
const handles = buildRoomScene(three, scene, makeCanvas);

// The kernel loop drives instances from the build-generated registry plus
// the player system; wall-clock only feeds the accumulator (AD-3).
const loop = createKernelLoop({
  now: () => performance.now(),
  schedule: (cb) => requestAnimationFrame(cb),
  onFault: (entry) => console.error(`[supervisor fault] tick=${entry.tick} id=${entry.errorId}: ${entry.message}`),
});

// Story 1.5: each entry gets its own kernel-owned TickInput object (the seat
// service writes the per-tick mapped controls into it) and — when the entry
// ships a presentation half — its own presentation canvas the kernel hands
// out through the injected makeCanvas (the adapter never reaches for DOM).
const instances = new Map<string, GameInstance>();
const instanceInputs = new Map<string, TickInput>();
const presentations = new Map<string, PresentationHooks>();
for (const entry of gameRegistry) {
  const instance = createGameInstance(entry.createSim, entry.seed ?? 0);
  const tickInput: TickInput = { controls: {} };
  instances.set(entry.id, instance);
  instanceInputs.set(entry.id, tickInput);
  loop.addInstance(entry.id, instance, tickInput);
  if (entry.createPresentation != null) {
    presentations.set(
      entry.id,
      entry.createPresentation({ makeCanvas: (width, height) => new OffscreenCanvas(width, height) }),
    );
  }
}

// First-person shell: the authored Arcade Room AABB list (1.3) drives
// blocking through the untouched 1.2 resolver, and the visitor spawns just
// inside the street-side door facing the room (ENTRY_SPAWN, room data).
const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
const input = createInputService({
  requestPointerLock: () => {
    // Denial (Esc cooldown, gesture policy) must stay silent at every layer,
    // console included (AC3): newer engines return a promise that rejects.
    void Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {});
  },
});
// Story 1.5 (AC4): the seat service owns the E-law for game-wired cabinets.
// The raw-code legend mapping stays kernel-side (AD-7); the authored keys
// mirror the vendored control legend ("ARROWS or A D ... FIRE Z/J ...
// JUMP X/K ... PRESS ENTER").
const SEAT_KEYS: Record<string, SeatKeyMap> = {
  "moon-patrol": {
    axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
    buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
  },
};
// Story 1.6: the figure presenter holds the reaction library + figure
// state; the Patron scheduler owns occupancy per busy placement. The seat
// and the scheduler see ONLY their injected slices of each other (BusyGate
// below, SeatHandover inside the scheduler) — the mutual reference is
// resolved by call-time deferral, never by mutating a finished object.
const presenter = createFigurePresenter();
const busyGate: BusyGate = {
  busyFor: (volumeId) => scheduler.busyFor(volumeId),
  toggleWait: (volumeId) => scheduler.toggleWait(volumeId),
};
const seat = createSeatService({ player, cabinets, busy: busyGate });
// One gate decides tracked-ness: a gameId-wired placement routes E through
// the seat ONLY when it actually tracks (entry + declared controls + legend
// keys present). An authoring gap (entry without controls, placement without
// a legend map) keeps the plain 1.4 coin-door law for that cabinet instead
// of throwing an untracked-seat fault on every E press.
const seatTrackVolumeIds = new Set<string>();
for (const p of cabinetPlacements) {
  if (p.gameId == null) continue;
  const entry = gameRegistry.find((e) => e.id === p.gameId);
  const instance = instances.get(p.gameId);
  const tickInput = instanceInputs.get(p.gameId);
  const keys = SEAT_KEYS[p.gameId];
  if (entry == null || entry.controls == null || instance == null || tickInput == null || keys == null) continue;
  seat.track({
    volumeId: p.volumeId,
    gameId: p.gameId,
    instance,
    input: tickInput,
    controls: entry.controls,
    keys,
  });
  seatTrackVolumeIds.add(p.volumeId);
}
// Records reach the presentation sink through the seat's forwarded drain
// (AD-6 -> AD-11 seam); Story 1.6 moved the DRAIN itself to the patrons
// system below, the sink stays here.
seat.setEventSink((rec) => presentations.get(rec.gameId)?.onEvent?.(rec.event));

// Story 1.6 (AD-23): one run state per busy, gameId-wired placement — busy
// is room data read off the placement record, never a hand-typed id list.
// Each is fed the registry entry's AUTHORED seed (derived autoplay runs
// come off it, never a fresh roll) and its embedded impulse mapping. An
// authoring gap keeps the cabinet attract-idle instead of faulting every
// tick (1.5 precedent: authoring gaps degrade, they do not crash).
const scheduler = createPatronScheduler({ seat, player, presenter });
for (const p of cabinetPlacements) {
  if (p.busy !== true || p.gameId == null) continue;
  const entry = gameRegistry.find((e) => e.id === p.gameId);
  const instance = instances.get(p.gameId);
  if (entry == null || instance == null || entry.seed == null) continue;
  scheduler.track({
    volumeId: p.volumeId,
    gameId: p.gameId,
    instance,
    seed: entry.seed,
    impulses: entry.impulses ?? {},
  });
}

// Story 1.6 (AC2): the Patron figure — three hard-cornered boxes (legs,
// torso, head) in the Wall Warm token, built ONCE like every other scene
// part and standing at the cabinet's authored play pose (the seat law,
// reused through presenter.figurePose). The frame only RE-POSES them from
// kernel state (the coin-door-pose idiom); no Patron shows while the
// chair is attract-idle or Visitor-seated.
const FIGURE_PARTS = {
  legs: { w: 0.3, h: 0.6, d: 0.26, centerY: 0.3 },
  torso: { w: 0.44, h: 0.56, d: 0.3, centerY: 0.88 },
  head: { w: 0.24, h: 0.24, d: 0.24, centerY: 1.28 },
} as const;
interface PatronFigure {
  volumeId: string;
  base: { x: number; z: number };
  toward: { x: number; z: number };
  legs: THREE.Mesh;
  torso: THREE.Mesh;
  head: THREE.Mesh;
}
const figures: PatronFigure[] = [];
for (const p of cabinetPlacements) {
  if (p.busy !== true) continue;
  const pose = presenter.figurePose(p.volumeId);
  const geom = placementGeometry(p.slotId);
  const material = three.standardMaterial({ color: WALL_WARM });
  const build = (spec: { w: number; h: number; d: number; centerY: number }): THREE.Mesh => {
    const partMesh = three.mesh(three.boxGeometry(spec.w, spec.h, spec.d), material) as THREE.Mesh;
    partMesh.position.set(pose.x, spec.centerY, pose.z);
    partMesh.visible = false; // attract at boot: no Patron stands yet
    scene.add(partMesh);
    return partMesh;
  };
  figures.push({
    volumeId: p.volumeId,
    base: { x: pose.x, z: pose.z },
    // The figure faces the cabinet like the seated visitor: from the play
    // pose back toward the body front plane = -slot facing.
    toward: { x: -geom.facing.x, z: -geom.facing.z },
    legs: build(FIGURE_PARTS.legs),
    torso: build(FIGURE_PARTS.torso),
    head: build(FIGURE_PARTS.head),
  });
}

loop.addSystem("player", () => {
  // Seated -> zeroed axes/aim, E kept (the seat's view IS the DeviceView
  // contract; the player controller never learns why).
  player.step(1, seat.playerView(input.takeView()));
});

// Story 1.4: the cabinet runtime mutates ONLY inside the tick — the phase
// system advances it, and the coin door flips from the E handler the player
// routes inside its own step (AD-15). Handlers register per placement
// record, never per hand-typed id. 1.5: a gameId-wired placement routes
// through the seat service; the rest keep the plain 1.4 toggle law.
loop.addSystem("cabinets", () => stepCabinetPhase(cabinets, 1));
for (const p of cabinetPlacements) {
  if (seatTrackVolumeIds.has(p.volumeId)) {
    player.registerInteractable(p.volumeId, (id) => seat.handleInteract(id));
  } else {
    player.registerInteractable(p.volumeId, (id) => toggleCoinDoor(cabinets, id));
  }
}
// Story 1.6 (AD-23 phase order realized as registration order): the
// patrons system sits BETWEEN "cabinets" and "seat". It drains this tick's
// events ONCE (the seat's exclusive drain from 1.5 moves — the one
// sanctioned wiring change), advances the figure state, and runs the
// scheduler's impulse stage + break arbitration. The seat system below
// receives the same records forwarded — no second drain.
let patronsRecords: EventRecord[] = [];
loop.addSystem("patrons", () => {
  patronsRecords = loop.drainEvents();
  presenter.step(loop.tickCount);
  scheduler.dispatch(patronsRecords, loop.tickCount);
});
// The seat system runs after the sim ticks and event dispatch (AD-23): it
// maps the raw codes for the NEXT tick (Story 1.6: records arrive
// forwarded; the seat no longer drains the queue itself).
loop.addSystem("seat", () => seat.step(input.takeCodeView(), patronsRecords));

// Thin browser glue -> device service (AD-7: Core owns capture; the glue
// only forwards events and (re)arms pointer lock). Silent by construction:
// no prompt, no style change, no message anywhere on lock denial/loss.
const canvas = renderer.domElement;
canvas.addEventListener("click", () => input.canvasClick());
document.addEventListener("pointerlockchange", () =>
  input.pointerLockChanged(document.pointerLockElement === canvas),
);
window.addEventListener("mousemove", (e) => input.mouseMove(e.movementX, e.movementY));
window.addEventListener("mousedown", (e) => input.mouseDown(e.button));
window.addEventListener("mouseup", (e) => input.mouseUp(e.button));
// mouseup fired outside the window never reaches us: leaving the document
// ends the drag, so re-entering never injects a stale-drag look jump.
document.documentElement.addEventListener("mouseleave", () => input.mouseUp(0));
window.addEventListener("keydown", (e) => {
  if (!e.repeat) input.key(e.code, true);
});
window.addEventListener("keyup", (e) => input.key(e.code, false));
document.addEventListener("visibilitychange", () => input.visibilityChanged());
// Window blur (focus to another window, tab still visible) drops pending
// keyup/mouseup: clear the buffer like a hidden tab, so no walk/drag sticks.
window.addEventListener("blur", () => input.visibilityChanged());

loop.start();

// Render reads tick state; all motion already happened inside step().
// 1.4: the coin doors are re-POSED from coinDoorOpen state every frame
// (render never decides open/closed, it only reads it), and each screen
// repaints into its existing canvas + texture only when the cabinet
// runtime's paint STEP changed — equal ticks paint equal pixels, and a
// still step costs no repaint at all.
let lastScreenPaintStep = -1;
function frame(): void {
  // Re-arm FIRST, before any draw: drawFrame runs game adapter code and the
  // composites read it — a throwing draw frame must strand the chain never.
  // One bad frame costs at most itself; full fault containment is Story
  // 1.7's tier (DW-2/DW-6).
  requestAnimationFrame(frame);
  const p = player.state;
  camera.position.set(p.x, EYE_HEIGHT + math.sin(p.bobPhase) * p.bobAmp, p.z);
  camera.rotation.set(p.pitch, p.yaw, 0);
  for (const d of handles.doors) {
    const pose = coinDoorPose(d.id, coinDoorOpen(cabinets, d.id));
    d.mesh.position.set(pose.panel.x, pose.panel.y, pose.panel.z);
    d.mesh.rotation.set(0, pose.panel.yaw, 0);
    d.slot.position.set(pose.slot.x, pose.slot.y, pose.slot.z);
    d.slot.rotation.set(0, pose.slot.yaw, 0);
  }
  // 1.6: Patron figures re-pose from kernel state every frame — the exact
  // coin-door idiom (render READS figureActive + figureOffset; the pose
  // law lives in the tick, and the adapter never touches these meshes).
  for (const f of figures) {
    const active = scheduler.figureActive(f.volumeId);
    f.legs.visible = active;
    f.torso.visible = active;
    f.head.visible = active;
    if (!active) continue;
    const off = presenter.figureOffset();
    const leanX = f.toward.x * off.torsoLean;
    const leanZ = f.toward.z * off.torsoLean;
    f.legs.position.set(f.base.x, FIGURE_PARTS.legs.centerY + off.legsY, f.base.z);
    f.torso.position.set(f.base.x + leanX, FIGURE_PARTS.torso.centerY + off.torsoY, f.base.z + leanZ);
    f.head.position.set(f.base.x + leanX, FIGURE_PARTS.head.centerY + off.headY, f.base.z + leanZ);
  }
  // 1.5 paint-step gate: the fallback painters cover only faces WITHOUT a
  // presentation half (a game-driven face repaints every frame below).
  const paintStep = screenPaintStep(cabinets);
  if (paintStep !== lastScreenPaintStep) {
    lastScreenPaintStep = paintStep;
    for (const s of handles.screens) {
      const placement = placementByVolumeId(s.id);
      if (placement.gameId != null && presentations.has(placement.gameId)) continue;
      repaintScreen(
        s.canvas,
        placement.screenZones,
        paintStep,
        toCss(ROOM_BLACK),
        toCss(placement.hue),
        toCss(placement.marqueeHue),
        SCREEN_ATTRACT_CAP_M,
        MARQUEE_CAP_M,
        SHELL.screen.height,
      );
      three.markTextureUpdated(s.texture);
    }
  }
  // Story 1.5: the game half drives its own pixels per frame — drawFrame
  // gets the instance snapshot, and the Core composites the canvas into the
  // face under the still-Core-painted NEXT row (letterboxed, centered).
  for (const s of handles.screens) {
    const placement = placementByVolumeId(s.id);
    if (placement.gameId == null) continue;
    const pres = presentations.get(placement.gameId);
    const instance = instances.get(placement.gameId);
    if (pres == null || instance == null) continue;
    pres.drawFrame(instance.snapshot());
    compositeScreen(
      s.canvas,
      placement.screenZones,
      pres.canvas,
      toCss(ROOM_BLACK),
      toCss(placement.marqueeHue),
      MARQUEE_CAP_M,
      SHELL.screen.height,
    );
    three.markTextureUpdated(s.texture);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Non-visual debug handle for QA/browser smoke — state only, zero UI.
// 1.5 adds the seat service (E-law cycle + the forwarded-event record);
// 1.6 adds the scheduler (occupancy/queue/derived seeds) and the figure
// presenter (reaction state) for the busy-machine console smoke.
window.arcadeDebug = { player, loop, cabinets, seat, scheduler, presenter };
