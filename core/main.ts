// Browser entry: the render side only (AD-3 — render is decoupled from the
// fixed-tick kernel). Story 1.2 makes it a first-person visit: the Core
// input service (AD-7) captures devices, the player controller runs as a
// kernel system inside the global tick (AD-15), and the camera merely READS
// player tick state at render — no motion is computed in render. Nothing
// here creates any DOM besides the canvas the renderer owns: no lock prompt,
// no HUD, no overlay of any kind (UX-DR18, AD-24, NFR-8). Pointer-lock
// denial falls back silently to drag-look inside the input service.
//
// Story 1.9 extends that posture two ways, both at the device edge:
//   - the whole boot body moved into ONE bootArcade() function behind a
//     try/catch: the catch IS the boot gate — renderer construction is
//     the usual thrower (no WebGL2), but any boot-phase throw lands on
//     the workbench panel (core/workbench.ts, AD-24's sanctioned outside-
//     fiction state), and the append receipt (bootCanvas) keeps the
//     remove-first law true even for faults AFTER the canvas is in.
//     Every boot law substring (boot-eager
//     identity, the single DOM append, the two rAF sites, system order)
//     survives the wrap byte-unchanged.
//   - the entry sequence (core/entry.ts) owns the camera and the input
//     gate until its phase is "control": the street-door beat is tick-
//     driven inside the loop (a supervisor-wrapped system before "player"),
//     and the canvas mount/remove still happens nowhere in this file.
//
// Story 2.4 extends the entry with the exit view, all at the device edge:
// the settings service boots EAGERLY and its rows ride the consumers as
// live getters (camera FOV, player bob, input tuning, audio master gain +
// focus strength, cabinet tempo); walking out the now-open front door
// crosses a tick-detected plane that mounts the same-document Settings
// panel and releases pointer lock (a deep link with the settings hash
// boots the same view). The panel and the vignette overlay are BUILT in
// core/settings-ui.ts — this file still grows no markup (the no-ui-dom
// leg counts their DOM over there), and the room never stops ticking
// while the panel is up (AD-23: the absence laws pay the queue cost).

import * as THREE from "three";
import { createKernelLoop, type EventRecord, type KernelLoop } from "./loop.ts";
import { math, type GameInstance } from "./contract/index.ts";
import { attachGameEntries, type Containment } from "./containment.ts";
import { createInputService } from "./input/index.ts";
import { createEntrySequence, type EntrySequence } from "./entry.ts";
import { mountWorkbench } from "./workbench.ts";
import {
  aimMultiplier,
  bindingTable,
  bobAmplitude,
  createSettingsService,
  fov,
  focusStrength,
  masterGain,
  tempoEveryN,
  type SettingsRows,
  type SettingsService,
} from "./settings.ts";
import {
  mountSettingsPanel,
  mountVignetteOverlay,
  setVignetteVisible,
  type SettingsEl,
  type SettingsPanel,
} from "./settings-ui.ts";
import { createPlayerController, EYE_HEIGHT, type PlayerController } from "./player.ts";
import { createSeatService, type BusyGate, type SeatKeyMap, type SeatService } from "./seat.ts";
import { createPatronScheduler, type PatronScheduler } from "./patrons/scheduler.ts";
import { createFigurePresenter, type FigurePresenter } from "./patrons/presenter.ts";
import { browserStoragePort, createStorageService, type StorageService } from "./storage.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { buildRoomScene, type CabinetLightHandle, type Three } from "./room/scene.ts";
import { frontDoorHandleYaw, frontDoorOpenPose, frontDoorRamp } from "./room/door.ts";
import {
  SPILL_INTENSITY,
  buildSpillNodes,
  glowPulse,
  hazeFactor,
  type AtmosphereDebug,
  type SpillNodeHandle,
} from "./room/atmosphere.ts";
import { ROOM_BLACK, WALL_WARM, toCss } from "./room/tokens.ts";
import { compositeScreen, repaintScreen, type CanvasFactory } from "./room/surfaces.ts";
import {
  CABINET_LIGHT_INTENSITY,
  SHELL,
  SCREEN_ATTRACT_CAP_M,
  SCREEN_NEXT_CAP_M,
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
import {
  createAudioManager,
  createSilentGraph,
  createWebAudioGraph,
  type AudioManager,
  type AudioGraph,
} from "./audio/manager.ts";

declare global {
  interface Window {
    /** Non-visual state handle for headless QA and the lead's console
     * smoke (Design Notes item 6) — nothing is rendered or announced.
     * 1.4 adds the cabinet runtime (phase + coin doors) for the console
     * liveness/targeting smoke; 1.6 adds the Patron scheduler (occupancy
     * per busy cabinet + queue) and the figure presenter (reaction); 1.7
     * adds the containment handle — faultedFor reads + injectFault, the
     * console-only smoke trigger that drives the real fault chain
     * (UX-DR18: zero UI announces a fault; the fallback IS the fiction);
     * 1.8 adds the storage/identity service (AD-16: visitorId + Personal
     * Bests + Patron-run table — the console smoke reads the table, zero
     * UI announces it); 1.9 adds the entry sequence (phase + the
     * timeToPlayableMs measurement + failNow(), the console-only trigger
     * that drives the workbench swap through the real law); 2.1 adds the
     * Core Audio Manager (graph state + per-chain occupancy/occlusion/mix
     * debug view — the console smoke reads the law's numbers; whether it
     * SOUNDS right is a by-ear check, never claimed from this surface);
     * 2.3 adds the atmosphere leg — per-cabinet distanceM / hazeFactor /
     * pulseApplied / glowIntensity rows the frame writes from tick state
     * every frame (the smoke walk reads the gradient's NUMBERS; the
     * by-sight visual read stays the deferred browser tier); 2.4 adds the
     * settings service (effective device rows + stored/degraded flags —
     * device-layer only, never sim state) and the guarded game-instance
     * map (the boot tier's stateHash-identity pin reads the LIVE instances
     * to prove a settings change leaves seeded runs byte-identical). */
    arcadeDebug: {
      player: PlayerController;
      loop: KernelLoop;
      cabinets: CabinetRuntime;
      seat: SeatService;
      scheduler: PatronScheduler;
      presenter: FigurePresenter;
      containment: Containment;
      storage: StorageService;
      entry: EntrySequence;
      audio: AudioManager;
      atmosphere: AtmosphereDebug[];
      settings: SettingsService;
      instances: Map<string, GameInstance>;
    };
  }
}

// Story 1.9 (AC4): the boot gate. Renderer construction is the usual
// thrower (a browser without WebGL2 — three 0.187's floor), but the catch
// spans the WHOLE bootArcade() body: any boot-phase throw (a failed
// scene build, a painter with no 2d context) lands on the workbench panel
// instead of a half-built page. bootCanvas is the append's receipt: a
// fault AFTER the canvas is in hands that canvas to the remove-first
// mount, so the body never holds two canvases on any path (AC4's every-
// path law). Every pre-existing boot law substring is byte-unchanged
// inside bootArcade() (the source pins survive the wrap), and a throwing
// mount is one logged line — the catch itself must never die uncaught.
let bootCanvas: HTMLCanvasElement | null = null;
try {
  bootArcade();
} catch (err) {
  console.error("[boot] the arcade could not open:", err);
  try {
    mountWorkbench({ reason: "unsupported", removeCanvas: bootCanvas, width: window.innerWidth, height: window.innerHeight });
  } catch (mountErr) {
    console.error("[workbench] the panel could not mount:", mountErr);
  }
}

function bootArcade(): void {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // Story 2.0 (brief section 5): the tone-curve substrate the DW-23
  // exposure law is re-pinned against — ACES filmic at exposure 1.0. The
  // scene.test.ts exposure pins derive their literals from measurements
  // against exactly this curve (three 0.187.0).
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(ROOM_BLACK, 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);
  bootCanvas = renderer.domElement; // AC4 receipt: the boot catch hands THIS canvas to the mount, never a stale second one

  // Story 2.4 (AC4/UX-DR20): settings boot EAGERLY — before any consumer
  // exists (the storage.visitorId pattern below): FOV feeds the camera
  // construction on the next line, and the player/input/audio/cabinets
  // wiring closes over the live rows. The device store is reached ONLY
  // through storage.ts's browser-port factory (the single-owner scan binds
  // that — this file never names it), and the reduced-motion seed port is
  // a local matchMedia read (AD-18: zero outbound calls). First visit
  // seeds the comfort preset ON; a stored payload rides verbatim.
  const settings = createSettingsService({
    storage: browserStoragePort(),
    prefersReducedMotion: () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov(settings.rows()), window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.rotation.order = "YXZ"; // yaw then pitch, matching the player controller's convention

  // Story 1.3: the authored room — volumes/zones/slots/signage/tokens extruded
  // to meshes and lights ONCE here (static authored scene, AD-3/AD-15). The
  // painters take injected OffscreenCanvas factories, so the page still grows
  // exactly one DOM node: the renderer canvas below (no-ui-dom pin).
  const makeCanvas: CanvasFactory = (width, height) => new OffscreenCanvas(width, height);
  const three: Three = {
    boxGeometry: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    extrudeGeometry: (points, depth) => {
      // Brief step 1: the authored profile as a Shape, extruded along +Z
      // with no bevel (hard plywood edges).
      const shape = new THREE.Shape();
      shape.moveTo(points[0]!.x, points[0]!.y);
      for (const pt of points.slice(1)) shape.lineTo(pt.x, pt.y);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    },
    cylinderGeometry: (radiusTop, radiusBottom, height, radialSegments) =>
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    sphereGeometry: (radius, widthSegments, heightSegments) =>
      new THREE.SphereGeometry(radius, widthSegments, heightSegments),
    standardMaterial: (params) => new THREE.MeshStandardMaterial(params as THREE.MeshStandardMaterialParameters),
    mesh: (geometry, material) =>
      new THREE.Mesh(geometry as THREE.BufferGeometry, material as THREE.Material | THREE.Material[]),
    group: () => new THREE.Group(),
    pointLight: (color, intensity, distance) => new THREE.PointLight(color, intensity, distance),
    ambientLight: (color, intensity) => new THREE.AmbientLight(color, intensity),
    canvasTexture: (source) => {
      const texture = new THREE.CanvasTexture(source as CanvasImageSource);
      // Brief section 5: painted sheets are sRGB and stay sharp at grazing
      // angles — every CanvasTexture the seam ever makes gets both.
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    },
    markTextureUpdated: (texture) => {
      (texture as THREE.Texture).needsUpdate = true; // repaint of a live screen
    },
  };
  const handles = buildRoomScene(three, scene, makeCanvas);

  // Story 2.3 (AC2): the pillar-bleed tier — authored spill point lights
  // around the occluder volumes' FAR edges, built ONCE from the SAME
  // collision-volume records the audio raycasts ride (AD-7) but read as
  // plain data, never through core/audio/: the visual law is authored
  // around the same blockers, asymmetrically by design (the
  // atmosphere.test.ts source scan pins the asymmetry). The tier names no
  // shell part or mesh — placements + volumes + authored constants only —
  // so any cabinet rebuild re-mounts it untouched (DW-29 separation).
  // BUILT DARK; the frame ramps them (the frontDoor street-pair posture).
  const spillNodes = buildSpillNodes(three, scene, collisionVolumes, cabinetPlacements);

  // Story 2.3 (AC1/AC3): per-cabinet glow rigs — each built halo/spill
  // pair, the authored body centre the haze measures camera distance from,
  // this cabinet's bleed nodes, and one console-smoke row. All precomputed
  // at boot; frame() only WRITES these rows from tick state (no new
  // per-frame allocation).
  interface CabinetGlowRig {
    pair: CabinetLightHandle;
    center: { x: number; z: number };
    bleed: SpillNodeHandle[];
    leg: AtmosphereDebug;
  }
  const glowRigs: CabinetGlowRig[] = [];
  const rigsByVolumeId = new Map<string, CabinetGlowRig>();
  for (const pair of handles.cabinetLights) {
    const rig: CabinetGlowRig = {
      pair,
      center: placementGeometry(placementByVolumeId(pair.volumeId).slotId).center,
      bleed: [],
      leg: { volumeId: pair.volumeId, distanceM: 0, hazeFactor: hazeFactor(0), pulseApplied: glowPulse(0), glowIntensity: CABINET_LIGHT_INTENSITY * glowPulse(0) * hazeFactor(0) },
    };
    glowRigs.push(rig);
    rigsByVolumeId.set(pair.volumeId, rig);
  }
  for (const node of spillNodes) {
    const rig = rigsByVolumeId.get(node.volumeId);
    if (rig == null) {
      throw new Error(`buildSpillNodes: node for volume "${node.volumeId}" has no cabinet light handle (placements and scene handles out of sync)`);
    }
    rig.bleed.push(node);
  }
  const atmosphereLegs = glowRigs.map((r) => r.leg);

  // The kernel loop drives instances from the build-generated registry plus
  // the player system; wall-clock only feeds the accumulator (AD-3).
  const loop = createKernelLoop({
    now: () => performance.now(),
    schedule: (cb) => requestAnimationFrame(cb),
    onFault: (entry) => console.error(`[supervisor fault] tick=${entry.tick} id=${entry.errorId}: ${entry.message}`),
  });

  // Story 1.5's boot body (kernel-owned TickInput per entry, presentation
  // canvases handed out through the injected makeCanvas) MOVED to the 1.7
  // containment seam: attachGameEntries runs every factory through the
  // supervisor under hook "boot" (DW-2 — a throwing factory logs one fault
  // and the entry stays unattached; the page still opens), registers each
  // surviving instance GUARDED (first sim fault quarantines it — AC1), and
  // hands back the same maps plus the containment handle. The loop's
  // supervisor is the one room record sink; its onFault prints the single
  // "[supervisor fault]" line the smoke watches.
  const supervisor = loop.supervisor;
  const { containment, instances, instanceInputs, presentations } = attachGameEntries(
    gameRegistry,
    loop,
    supervisor,
    makeCanvas,
  );

  // First-person shell: the authored Arcade Room AABB list (1.3) drives
  // blocking through the untouched 1.2 resolver, and the visitor spawns just
  // inside the street-side door facing the room (ENTRY_SPAWN, room data).
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const input = createInputService(
    {
      requestPointerLock: () => {
        // Denial (Esc cooldown, gesture policy) must stay silent at every layer,
        // console included (AC3): newer engines return a promise that rejects.
        void Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {});
      },
    },
    // Story 2.4 (AD-7): the settings rows ride the input service as LIVE
    // getters — a sensitivity/remap/look-source commit lands on the next
    // takeView with no rebuild, and the replay currency stays the shaped
    // DeviceView (AD-26: settings never fork a seeded run).
    {
      bindingTable: () => bindingTable(settings.rows()),
      lookSource: () => settings.rows().lookSource,
    // Review law: the page owns the keyboard/pointer while it is up —
    // radiogroup arrows and stray drags must not steer the room camera;
    // movement stays live so crossing back still closes the panel (AC7).
    lookEnabled: () => !exitViewOpen,
      aimMultiplier: () => aimMultiplier(settings.rows()),
    },
  );
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
  // 1.7: the containment predicate is injected deferred (BusyGate idiom) —
  // a faulted Cabinet falls back to the plain coin-door E law, and a seated
  // Visitor is released by the stand law the same tick the fault lands.
  const seat = createSeatService({
    player,
    cabinets,
    busy: busyGate,
    faultedFor: (gameId) => containment.faultedFor(gameId),
  });
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
  // 1.7: the same containment predicate reaches the scheduler — faulted +
  // patron-autoplay lifts the figure (occupancy -> attract, queue voided),
  // and no autoplay launch fires while faulted.
  const scheduler = createPatronScheduler({
    seat,
    player,
    presenter,
    faultedFor: (gameId) => containment.faultedFor(gameId),
  });
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

  // Story 1.8 (AD-16): the storage/identity service — the spine's SVC box,
  // created beside seat/scheduler with the same options-injection posture
  // (browser-edge defaults: the device-store port behind the service's own
  // try/catch, crypto.randomUUID for the id — the glue itself never names the
  // store, the no-ui-dom single-owner scan binds that). The identity is generated
  // EAGERLY at boot — "first visit generates" — the id exists before the
  // door opens (1.9's boot beat rides this wiring). The score table below
  // reaches ONLY the presentation half (AD-16/AD-28): the sim never sees it.
  const storage = createStorageService();
  storage.visitorId();

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

  // Story 1.9 (AC1-AC3): the entry sequence — the street-door beat. A
  // supervisor-wrapped kernel system (AD-15: a throwing entry is a fault
  // record, the room keeps ticking, and the stall law still lands the
  // workbench), registered BEFORE "player" so its input gate composes the
  // view the player consumes on the SAME tick — playerView wraps the
  // seat's view from outside, so both existing laws stay byte-unchanged.
  // Wall-clock reaches the sequence only through the injected source, at
  // its two labelled points (init check, control stamp — AD-3).
  const entry = createEntrySequence({
    now: () => performance.now(),
    spawn: ENTRY_SPAWN,
    eyeHeight: EYE_HEIGHT,
  });
  loop.addSystem("entry", () => entry.step());
  loop.addSystem("player", () => {
    // Seated -> zeroed axes/aim, E kept (the seat's view IS the DeviceView
    // contract; the player controller never learns why). 1.9: the entry
    // gate wraps OUTSIDE the seat law — until "control" the visitor owns
    // nothing, axes/aim/interact all quiet. 2.4 (UX-DR20): the third
    // argument is the EFFECTIVE bob amplitude from the comfort preset
    // (off = the authored token, low = half, full = zero); at the shipped
    // default rows the walk/bob law is byte-identical to 1.2.
    player.step(1, entry.playerView(seat.playerView(input.takeView())), bobAmplitude(settings.rows()));
  });

  // Story 2.4 (AC2): the walk-out exit detector. door-front's
  // blocksMovement flipped to false in the authored list (the volume stays
  // the kind:"door" occluder — the sound law is untouched), so the visitor
  // can cross the door plane; this system reads ONLY player tick state:
  // OPEN when the pose reaches the street edge inside the door gap, CLOSE
  // at the door's inner face (the gap between the two z values IS the
  // dead-band — no flapping on the boundary). Crossing outward mounts the
  // exit-view panel (core/settings-ui.ts — this file grows no markup) and
  // drops the pointer lock silently; crossing back closes it. The room
  // keeps ticking the whole time: the scheduler's presence predicate and
  // the off-chair void/re-arm laws ARE the queue-position cost (AD-23 —
  // no pause, no claim held, no navigation, no reload).
  const doorFront = collisionVolumes.find((v) => v.id === "door-front")!;
  const streetEdgeZ = collisionVolumes.find((v) => v.id === "street-floor")!.min.z;
  let exitViewOpen = false;
  // Review law (AC7): CLOSING is a CROSSING law, not a pose law — the
  // panel only tick-closes once the visitor has actually crossed outward
  // since this open. A #settings deep-link opens at ENTRY_SPAWN (inside
  // the close side); without this flag the entry→control handover would
  // silently tick-close the page ~210 ticks after load while the visitor
  // never crossed anything (mutation: drop the flag from the close branch
  // -> the boot tier's handover-survival leg reddens).
  let openedByCrossing = false;
  // One pending rebind capture at a time (review): a stale once-listener
  // surviving the panel would rebind a verb mid-run from the room.
  let pendingCapture: (() => void) | null = null;
  let panel: SettingsPanel | null = null;
  let vignetteOverlay: SettingsEl | null = null;
  function openExitView(): void {
    if (exitViewOpen) return;
    exitViewOpen = true;
    if (panel == null) {
      panel = mountSettingsPanel({
        doc: document,
        settings,
        onBack: () => {
          // Same-document re-entry: back at the authored spawn, facing in.
          // No claim is restored — the absence laws already ran while the
          // visitor was out (the cost stands, matrix "Re-enter" row).
          player.teleport({ ...ENTRY_SPAWN, pitch: 0 });
          closeExitView();
        },
        onRows: (rows) => applyRows(rows),
        captureKey: (reply) => {
          // The glue owns the ONE host keydown for rebind capture (the
          // module stays host-blind); Escape cancels. Review law: ONE
          // capture pending at a time — a second Rebind click cancels the
          // previous one, and closeExitView cancels whatever is pending
          // (an old once-listener surviving the panel would rebind a verb
          // mid-run from the room; the boot tier pins the cancel).
          if (pendingCapture != null) pendingCapture();
          const onKey = (e: KeyboardEvent): void => {
            window.removeEventListener("keydown", onKey);
            pendingCapture = null;
            reply(e.code === "Escape" ? null : e.code);
          };
          pendingCapture = (): void => {
            window.removeEventListener("keydown", onKey);
            pendingCapture = null;
            reply(null);
          };
          window.addEventListener("keydown", onKey);
        },
      });
    }
    // The outside view needs the cursor: release the lock SILENTLY (no
    // prompt, no message) and drop the device buffer like a tab hide, so
    // no held key walks through the panel (the visibilityChanged idiom).
    document.exitPointerLock();
    input.visibilityChanged();
  }
  function closeExitView(): void {
    if (!exitViewOpen) return;
    exitViewOpen = false;
    openedByCrossing = false;
    if (pendingCapture != null) pendingCapture(); // a pending capture dies with the panel
    panel?.unmount();
    panel = null;
    input.visibilityChanged();
  }
  loop.addSystem("exit", () => {
    // The exit law is CONTROL-phase law: during the entry beat the visitor
    // owns no movement, and the #settings deep-link opens the panel while
    // the (still entry-owned) pose sits inside the door — without this
    // gate the detector would close the panel on the first tick and the
    // matrix "#settings at load" row (panel over the street/entry context,
    // entry beat ticking behind it) could never hold.
    if (entry.phase() !== "control") return;
    const p = player.state;
    const outside = p.z >= streetEdgeZ && Math.abs(p.x) <= doorFront.max.x;
    if (outside) openedByCrossing = true;
    if (!exitViewOpen) {
      if (outside) openExitView();
    } else if (openedByCrossing && p.z <= doorFront.min.z) closeExitView();
  });

  // Story 1.4: the cabinet runtime mutates ONLY inside the tick — the phase
  // system advances it, and the coin door flips from the E handler the player
  // routes inside its own step (AD-15). Handlers register per placement
  // record, never per hand-typed id. 1.5: a gameId-wired placement routes
  // through the seat service; the rest keep the plain 1.4 toggle law.
  // Story 2.4 (AC5/AD-27): the calm-cabinets tempo wraps THIS call site —
  // the phase law, CABINET_PHASE_CYCLE_TICKS, and the containment sampling
  // stay byte-identical, and the wrap is tick-counted, never wall-clock
  // (AD-3). Calm advances one phase tick per two loop ticks: cabinets keep
  // moving and glowing, only the tempo changes (liveness invisible).
  let cabinetsTick = 0;
  loop.addSystem("cabinets", () => {
    cabinetsTick += 1;
    if (cabinetsTick % tempoEveryN(settings.rows()) === 0) stepCabinetPhase(cabinets, 1);
  });
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
  let drawTick = 0; // tick-stamped sim time for draw-fault records (set by the patrons system)
  let patronsRecords: EventRecord[] = [];
  loop.addSystem("patrons", () => {
    patronsRecords = loop.drainEvents();
    // 1.7 (AC6/DW-3 drain half + draw records): the drain is the FIRST
    // statement of the body, before anything that can throw — every tick's
    // queue reaches the consumers (pinned as a regression). The draw-stamp
    // rides right behind it, ahead of the legs a fault can cost, so the
    // stamp never goes stale past a dispatch throw: fault records stamp
    // this tick's loop.tickCount (AD-3), and frame() reads this tick-state
    // variable instead of touching the loop's clock (the 1.4 frame ban on
    // tickCount reads stays byte-unchanged).
    drawTick = loop.tickCount;
    // 1.8 (AC2/AD-6/AD-23): the storage ingest leg rides these SAME drained
    // records — the one new per-tick consumer, riding the existing drain (no
    // second drainEvents anywhere). It sits inside this supervisor-wrapped
    // system (AD-15: a throwing storage op degrades inside the service, the
    // room keeps ticking) and BEFORE scheduler.dispatch: during a Patron run
    // the scheduler's occupancy is the live run and lastSeed is the run's
    // RESOLVED seed (AD-4 currency) — a post-dispatch ingest would credit
    // the score to the NEXT run's seed. Classification reads the plain-data
    // state() views (zero scheduler/seat interface widening): occupancy
    // first, then the seat's chair, else idle.
    storage.ingest(patronsRecords, {
      kindOf: (gameId) => {
        const occ = scheduler.state().cabinets.find((c) => c.gameId === gameId)?.occupancy;
        if (occ === "patron-autoplay") return "patron";
        const chair = seat.state();
        return chair.seated && chair.gameId === gameId ? "visitor" : "idle";
      },
      seedOf: (gameId) => scheduler.state().cabinets.find((c) => c.gameId === gameId)?.lastSeed ?? 0,
      tick: drawTick,
    });
    presenter.step(loop.tickCount);
    scheduler.dispatch(patronsRecords, loop.tickCount);
  });
  // The seat system runs after the sim ticks and event dispatch (AD-23): it
  // maps the raw codes for the NEXT tick (Story 1.6: records arrive
  // forwarded; the seat no longer drains the queue itself).
  loop.addSystem("seat", () => seat.step(input.takeCodeView(), patronsRecords));

  // Story 2.1 (AD-7/AD-15): the Core Audio Manager — ONE supervisor-
  // wrapped system owning the one WebAudio graph, registered AFTER
  // patrons/seat so each tick mixes against this tick's settled occupancy
  // (AD-23 order). The single `new AudioContext` inside buildAudioGraph
  // below is the repo's ONLY construction site (the L0 lint keeps every
  // game half off the graph, AD-7); browsers hand it out autoplay-blocked,
  // and until a wired gesture lands requestResume() the room runs silent —
  // the law path actuates nothing on a suspended context. An insecure
  // origin (plain http) has NO AudioContext global and construction can
  // throw outright: both take the silent-graph path, so the room survives
  // with sound simply absent instead of falling to the workbench (AD-15
  // posture). The audio clock reaches the graph only inside the labelled
  // adapter (core/audio/manager.ts); wall time never enters audio at all
  // (AD-3).
  function buildAudioGraph(): AudioGraph {
    if (typeof AudioContext === "undefined") return createSilentGraph();
    try {
      return createWebAudioGraph(new AudioContext());
    } catch {
      return createSilentGraph();
    }
  }
  const audio = createAudioManager({
    graph: buildAudioGraph(),
    registry: gameRegistry,
    scheduler,
    player,
    entry,
    // Story 2.4 (AC5): the focus-mix strength rides the mix law as a live
    // getter (device row 100 = the exact 2.2 FOCUS_DUCK floor).
    focusStrength: () => focusStrength(settings.rows()),
  });
  // Story 2.4: the master gain boots at the stored/seeded row (100 -> 1.0,
  // byte-identical to the 2.1 graph), and every panel commit lands on the
  // SAME node through the setter — live apply, no rebuild, no reload.
  audio.setMasterGain(masterGain(settings.rows()));
  loop.addSystem("audio", () => audio.tick());

  // Story 2.4 (AC1/AC3): the vignette overlay + live-apply seam. The node
  // is created ONCE by core/settings-ui.ts (this file grows no markup —
  // the no-ui-dom counts bind over there), carries zero text and zero
  // interactive elements, and rides the ROOM_BLACK channels as light
  // management (Design Note 7). applyRows is what the panel's onRows seam
  // calls on every commit: FOV + projection, master gain, vignette — the
  // sensitivity/look-source/binding/preset/calm rows ride the getters the
  // systems already read (no push needed for those).
  vignetteOverlay = mountVignetteOverlay(document);
  function applyRows(rows: SettingsRows): void {
    camera.fov = fov(rows);
    camera.updateProjectionMatrix();
    audio.setMasterGain(masterGain(rows));
    if (vignetteOverlay != null) setVignetteVisible(vignetteOverlay, rows.vignette);
  }
  applyRows(settings.rows());
  // Story 2.4 deep link (and 2.5's skip-link hook): a fresh load carrying
  // the settings hash boots straight into the exit view over the street
  // context — the entry beat keeps ticking behind the panel (matrix
  // "#settings at load" row).
  if (location.hash === "#settings") openExitView();

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
  // Story 2.1 (autoplay law): every wired gesture also asks the blocked
  // audio context to resume — one attempt per gesture, rejections
  // swallowed inside the manager and retried by the next gesture (no
  // timer, no retry storm, no prompt). The three existing input pin
  // substrings above stay byte-unchanged.
  canvas.addEventListener("click", () => audio.requestResume());
  window.addEventListener("mousedown", () => audio.requestResume());
  window.addEventListener("keydown", () => audio.requestResume());
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
  // 1.7: faces whose draw leg faulted — persistent, logged ONCE (the Never
  // against silent per-frame try/catch: a draw fault flips that face to the
  // fallback painter forever, the sim half keeps ticking untouched).
  const drawFaulted = new Set<string>();
  // 1.9 (AC4): the workbench swap is one-shot — the guard is the "never a
  // per-frame try" posture again (1.7's drawFaulted precedent).
  let workbenchMounted = false;
  function frame(): void {
    // Re-arm FIRST, before any draw: drawFrame runs game adapter code and the
    // composites read it — a throwing draw frame must strand the chain never.
    // One bad frame costs at most itself; 1.7's containment tier now wraps
    // the draw legs below (supervisor + the persistent drawFaulted flip),
    // but this re-arm-first posture stands byte-unchanged (1.5's in-story
    // patch, now backed by its tier).
    requestAnimationFrame(frame);
    // 1.9 (AC1): until the beat hands over, the camera belongs to the entry
    // sequence — street view, then the tick-derived dolly that ENDS exactly
    // on the spawn pose, so the takeover below costs no pop.
    if (entry.phase() !== "control") {
      const ep = entry.pose();
      camera.position.set(ep.x, ep.y, ep.z);
      camera.rotation.set(ep.pitch, ep.yaw, 0);
    } else {
      const p = player.state;
      camera.position.set(p.x, EYE_HEIGHT + math.sin(p.bobPhase) * p.bobAmp, p.z);
      camera.rotation.set(p.pitch, p.yaw, 0);
    }
    // 1.9: the front-door assembly re-poses from entry state every frame —
    // the coin-door idiom once more (render READS the beat, never paces
    // it): the hinge swing carries the glass sheet and handle with the
    // panel, the handle adds its own ready-handle twist, and the two
    // street lights ramp off the entry's bleedFraction (built dark,
    // widening as the page settles).
    const fd = handles.frontDoor;
    const front = entry.state();
    const fdPose = frontDoorOpenPose(front.openFraction);
    fd.panel.position.set(fdPose.panel.x, fdPose.panel.y, fdPose.panel.z);
    fd.panel.rotation.set(0, fdPose.panel.yaw, 0);
    fd.glass.position.set(fdPose.glass.x, fdPose.glass.y, fdPose.glass.z);
    fd.glass.rotation.set(0, fdPose.glass.yaw, 0);
    fd.handle.position.set(fdPose.handle.x, fdPose.handle.y, fdPose.handle.z);
    fd.handle.rotation.set(0, fdPose.handle.yaw + frontDoorHandleYaw(front.handleFraction), 0);
    const ramp = frontDoorRamp(front.bleedFraction);
    fd.bleedLight.intensity = ramp.bleed.intensity;
    fd.bleedLight.distance = ramp.bleed.distance;
    fd.glassLight.intensity = ramp.glass.intensity;
    fd.glassLight.distance = ramp.glass.distance;
    // 1.9 (AC4): the workbench swap, exactly ONCE — the 3D canvas comes
    // OUT first (the body never holds two canvases, on any path), and a
    // throwing mount is one logged line, never a per-frame retry. The
    // workbench phase is TERMINAL: nothing self-heals back to the fiction,
    // the painted Reload line is the user's only way back. The loop's
    // tick posture (AD-15) keeps running separately — but this frame()
    // stops below, so the room's draw legs never run into the detached
    // canvas (review pass 1: they used to, every frame, for nothing).
    if (front.phase === "workbench" && !workbenchMounted) {
      workbenchMounted = true;
      try {
        mountWorkbench({
          reason: "asset-timeout",
          removeCanvas: canvas,
          width: window.innerWidth,
          height: window.innerHeight,
        });
      } catch (err) {
        console.error("[workbench] the panel could not mount:", err);
      }
    }
    if (workbenchMounted) return;
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
    // Story 2.3 (AC1/AC3): the glow ramp — the frontDoorRamp idiom on the
    // cabinet light tier. Every lit Cabinet's halo/spill pair and its
    // pillar-bleed nodes ride nominal x pulse x haze from tick state only
    // (AD-3/AD-15): the pulse is the attract phase's one gentle swell
    // (the law and the NFR-9 flash ceiling live in atmosphere.ts), and the
    // haze dims distant machines toward Room Black by the camera pose this
    // frame just wrote from player state — a never-zero floor, so far
    // machines dim but never read dead (UX-DR17), and every bleed node
    // rides its SOURCE cabinet's numbers, carrying the proximity gradient
    // into the pillar shadows where sound dies (AC2/AC3). The emissive
    // faces are never touched here: 2.0's exactly-two-emissive census and
    // the DW-23 exposure budget (screen stays the brightest face) stay
    // byte-preserved.
    const pulseApplied = glowPulse(cabinets.phase);
    for (const rig of glowRigs) {
      const dx = camera.position.x - rig.center.x;
      const dz = camera.position.z - rig.center.z;
      const distanceM = Math.sqrt(dx * dx + dz * dz);
      const haze = hazeFactor(distanceM);
      const glow = CABINET_LIGHT_INTENSITY * pulseApplied * haze;
      rig.pair.halo.intensity = glow;
      rig.pair.spill.intensity = glow;
      const spillGlow = SPILL_INTENSITY * pulseApplied * haze;
      for (const node of rig.bleed) node.light.intensity = spillGlow;
      rig.leg.distanceM = distanceM;
      rig.leg.hazeFactor = haze;
      rig.leg.pulseApplied = pulseApplied;
      rig.leg.glowIntensity = glow;
    }
    // 1.5 paint-step gate: the fallback painters cover every face NOT
    // actively compositing (a game-driven face repaints every frame below).
    // 1.7: "actively compositing" is now the full face gate — a face takes
    // the fallback (phase-driven repaint keeps the screen moving, the marquee
    // stays lit — AD-15's fallback performance, no new animator) when its
    // sim half is quarantined or its boot half failed (no live presentation
    // anyway) or its draw leg faulted once. No fault UI: the fallback IS the
    // fiction (AD-24).
    const paintStep = screenPaintStep(cabinets);
    if (paintStep !== lastScreenPaintStep) {
      lastScreenPaintStep = paintStep;
      for (const s of handles.screens) {
        const placement = placementByVolumeId(s.id);
        const faceComposites =
          placement.gameId != null &&
          presentations.has(placement.gameId) &&
          !containment.faultedFor(placement.gameId) &&
          !drawFaulted.has(placement.gameId);
        if (faceComposites) continue;
        // 1.8 (AC3/AD-28): the table feeds the EXISTING score-zone painter
        // path through a re-composed ScreenZones at paint time — the authored
        // placement data (cabinets.ts) stays readonly, the rows come from the
        // service. Empty table -> rows [] -> the zone renders nothing (the
        // 1.4 CAP-8 law intact); rows present -> the face yields the attract
        // block and paints under the live scan band (AD-28). Composite faces
        // keep the 1.5 pixel law: the raw authored zones stay there (the
        // vendored adapter's session HI-SCORE is NOT the table).
        const zones =
          placement.gameId != null
            ? { ...placement.screenZones, score: storage.rowsFor(placement.gameId) }
            : placement.screenZones;
        repaintScreen(
          s.canvas,
          zones,
          paintStep,
          toCss(ROOM_BLACK),
          toCss(placement.hue),
          toCss(placement.marqueeHue),
          SCREEN_ATTRACT_CAP_M,
          SCREEN_NEXT_CAP_M,
          SHELL.screen.height,
        );
        three.markTextureUpdated(s.texture);
      }
    }
    // Story 1.5: the game half drives its own pixels per frame — drawFrame
    // gets the instance snapshot, and the Core composites the canvas into the
    // face under the still-Core-painted NEXT row (letterboxed, centered).
    // 1.7: each face's draw+composite legs go through supervisor.invoke under
    // hook "draw" — a fault is one record attributed to the gameId, flips
    // that face into the fallback painter permanently (bounded logging: the
    // face gate above skips it afterwards), and leaves the other faces and
    // the sim half untouched (halves fault independently).
    for (const s of handles.screens) {
      const placement = placementByVolumeId(s.id);
      if (placement.gameId == null) continue;
      if (containment.faultedFor(placement.gameId) || drawFaulted.has(placement.gameId)) continue;
      const pres = presentations.get(placement.gameId);
      const instance = instances.get(placement.gameId);
      if (pres == null || instance == null) continue;
      const draw = supervisor.invoke({
        tick: drawTick,
        gameId: placement.gameId,
        hook: "draw",
        call: () => {
          pres.drawFrame(instance.snapshot());
          compositeScreen(
            s.canvas,
            placement.screenZones,
            pres.canvas,
            toCss(ROOM_BLACK),
            toCss(placement.marqueeHue),
            SCREEN_NEXT_CAP_M,
            SHELL.screen.height,
          );
          three.markTextureUpdated(s.texture);
        },
      });
      if (!draw.ok) drawFaulted.add(placement.gameId);
    }
    renderer.render(scene, camera);
    // 1.9 (AC2): a frame only counts as rendered once the render call
    // actually returned — the ready gate's evidence, stamped from the frame
    // side (the entry itself never renders). A throwing render never marks;
    // the stall law then drives the workbench.
    entry.markFrameRendered();
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
  // presenter (reaction state) for the busy-machine console smoke; 1.7 adds
  // the containment handle (faultedFor + injectFault) so the lead's smoke
  // drives the real fault chain from the console — the fault law path, not
  // a scripted one, and still zero UI (UX-DR18/AD-24); 1.8 adds the storage
  // service (visitorId + Personal Bests + Patron-run table — the lead's
  // smoke reads the table's initials + score keyed by gameId, never any PII
  // beyond the UUID, and the score zone renders these rows read-only);
  // 1.9 adds the entry sequence (phase + timeToPlayableMs + failNow, the
  // console trigger for the workbench swap — the real law path again);
  // 2.1 adds the audio manager (graph state + per-chain mix law numbers);
  // 2.3 adds the atmosphere leg (the per-cabinet haze/pulse/glow rows the
  // frame writes — the smoke walk reads the gradient's numbers); 2.4 adds
  // the settings service (the effective device rows + stored/degraded —
  // never sim state) and the guarded instances map (the boot tier reads
  // live stateHash sequences to prove settings never fork a seeded run).
  window.arcadeDebug = { player, loop, cabinets, seat, scheduler, presenter, containment, storage, entry, audio, atmosphere: atmosphereLegs, settings, instances };
}
