// Story 1.2 QA additions: static pins on the browser glue (core/main.ts)
// that no executed test reaches until a browser harness exists —
// (1) the render side READS player tick state only: camera position is
// x/z plus eye height with the bob term, rotation is (pitch, yaw) in the
// YXZ order, and the frame computes no motion from wall-clock (AD-3,
// I/O matrix "Head bob" camera-Y half); (2) pointer-lock denial stays
// silent at the console and lock-loss/blur/visibility all drop the device
// buffer (AC3, UX-DR18); (3) every device listener forwards to the input
// service and the pointerlockchange glue compares the lock element to the
// canvas (AD-7: the glue keeps no device state of its own); (4) Story 1.3's
// room wiring: the authored room is built into the page scene exactly once
// through the real Three adapter with injected OffscreenCanvas painters, and
// the player starts on the authored volumes at ENTRY_SPAWN. Pins the source
// contract; the lead's Chrome+Edge smoke covers in-browser behaviour. Story
// 1.6 moved two 1.5 pins (the seat creation no longer takes the loop; the
// seat system takes forwarded records) and adds the patrons-wiring pins:
// one drain per tick in a cabinets->patrons->seat registered order, and the
// figure re-pose legs in frame() (banned wall-clock still banned).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const MAIN = readFileSync(path.join(REPO, "core", "main.ts"), "utf8");

function frameBody(src: string): string {
  const m = src.match(/function frame\(\): void \{([\s\S]*?)\n\}/);
  assert.ok(m, "core/main.ts has a frame() render function");
  return m[1]!;
}

test("render reads tick state only: camera position/rotation come from player state incl. the bob term (AC2, AD-3)", () => {
  assert.match(MAIN, /camera\.rotation\.order = "YXZ"/, "yaw-then-pitch order matches the controller convention");
  const body = frameBody(MAIN);
  assert.ok(body.includes("player.state"), "frame reads player state");
  assert.ok(body.includes("camera.position.set(p.x,"), "camera x is the player's tick x");
  assert.ok(
    body.includes("EYE_HEIGHT + math.sin(p.bobPhase) * p.bobAmp"),
    "camera y is eye height plus the distance-driven bob",
  );
  assert.ok(body.includes(", p.z)"), "camera z is the player's tick z");
  assert.ok(body.includes("camera.rotation.set(p.pitch, p.yaw, 0)"), "rotation is pitch/yaw from state");
  assert.equal((body.match(/renderer\.render\(/g) ?? []).length, 1, "exactly one render call per frame");
  for (const banned of ["performance.now", "Date.now", "Math.random", "tickCount"]) {
    assert.ok(!body.includes(banned), `frame() must not read ${banned} (motion derives from tick state, not wall-clock)`);
  }
});

test("pointer-lock denial is silent and lock-loss/blur/visibility drop the device buffer (AC3, UX-DR18)", () => {
  assert.ok(
    MAIN.includes("Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {})"),
    "a rejected lock request must be swallowed silently (Esc cooldown, gesture policy)",
  );
  assert.ok(
    MAIN.includes('document.addEventListener("visibilitychange", () => input.visibilityChanged());'),
    "hidden-tab transitions clear the device buffer",
  );
  assert.ok(
    MAIN.includes('window.addEventListener("blur", () => input.visibilityChanged());'),
    "window blur clears the buffer too, so no walk/drag sticks",
  );
});

test("device glue is thin and forwards to the input service; the lock check compares the element to the canvas (AC4, AD-7)", () => {
  assert.ok(MAIN.includes('canvas.addEventListener("click", () => input.canvasClick());'), "click only (re)arms lock via the service");
  assert.ok(
    MAIN.includes("input.pointerLockChanged(document.pointerLockElement === canvas)"),
    "pointerlockchange reflects whether THIS canvas holds the lock",
  );
  assert.ok(MAIN.includes("input.mouseMove(e.movementX, e.movementY)"), "mousemove forwards raw movement deltas");
  assert.ok(MAIN.includes("input.mouseDown(e.button)"), "mousedown forwards for the drag-look fallback");
  assert.ok(MAIN.includes("input.mouseUp(e.button)"), "mouseup ends a drag");
  assert.ok(
    MAIN.includes('document.documentElement.addEventListener("mouseleave", () => input.mouseUp(0));'),
    "leaving the document ends a drag (a mouseup outside the window never arrives)",
  );
  assert.ok(MAIN.includes("if (!e.repeat) input.key(e.code, true);"), "keydown keeps one fresh press edge per physical press");
  assert.ok(MAIN.includes("input.key(e.code, false)"), "keyup releases the level");
  assert.ok(!MAIN.includes("addEventListener(\"wheel\""), "no undocumented device channel");
});

test("the authored room reaches the page once: buildRoomScene through the real Three adapter + injected OffscreenCanvas factory, spawn on the authored volumes at ENTRY_SPAWN, clear colour from the token (1.3 AC1/AC2/AC7 wiring)", () => {
  assert.equal((MAIN.match(/buildRoomScene\(/g) ?? []).length, 1, "the room is built exactly once into the page scene");
  assert.ok(MAIN.includes("buildRoomScene(three, scene, makeCanvas);"), "built through the injected seam, not a second inline copy");
  // Every seam method the room consumes must be mapped through to its real
  // THREE constructor with the seam's own parameter order — the source-pin
  // tier's coverage of the adapter legs the scene suite cannot see (the
  // executed tier lands with the Epic-3 browser harness, DW-15).
  for (const fwd of [
    "new THREE.BoxGeometry(w, h, d)",
    "new THREE.MeshStandardMaterial(params",
    "new THREE.Mesh(geometry",
    "new THREE.PointLight(color, intensity, distance)",
    "new THREE.AmbientLight(color, intensity)",
    "new THREE.CanvasTexture(source",
  ]) {
    assert.ok(MAIN.includes(fwd), `Three seam maps through: ${fwd}`);
  }
  assert.ok(MAIN.includes("new OffscreenCanvas(width, height)"), "painters get OffscreenCanvas factories (the page still grows one DOM node)");
  assert.ok(MAIN.includes("createPlayerController(collisionVolumes, ENTRY_SPAWN)"), "the visitor spawns at the authored door spawn on the authored volume list");
  assert.ok(MAIN.includes("renderer.setClearColor(ROOM_BLACK, 1)"), "clear colour comes from tokens.ts, never a retyped hex");
});

test("1.4 cabinet wiring: the phase advances as a kernel system, coin doors toggle ONLY through the player-routed E handler, the frame poses doors and repaints screens from state (never wall-clock), the texture-update leg maps through, and arcadeDebug carries the runtime (1.4 AC3/AC4/AC5)", () => {
  assert.ok(MAIN.includes('loop.addSystem("cabinets", () => stepCabinetPhase(cabinets, 1));'), "attract phase mutates inside the tick only (AD-15)");
  assert.ok(MAIN.includes("for (const p of cabinetPlacements)"), "interactables register per placement record, never hand-typed ids");
  assert.ok(
    MAIN.includes("player.registerInteractable(p.volumeId, (id) => toggleCoinDoor(cabinets, id));"),
    "the E handler flips coin-door state, routed inside player.step (inside the tick)",
  );
  assert.ok(MAIN.includes("(texture as THREE.Texture).needsUpdate = true"), "the Three seam's markTextureUpdated maps to the real needsUpdate flag");
  const body = frameBody(MAIN);
  assert.ok(body.includes("coinDoorPose(d.id, coinDoorOpen(cabinets, d.id))"), "door pose each frame comes from the pose law reading state — the frame never decides open/closed");
  assert.ok(body.includes("d.mesh.position.set(pose.panel.x, pose.panel.y, pose.panel.z)"), "the frame APPLIES the pose to the door mesh (the law alone would leave the door frozen)");
  assert.ok(body.includes("d.mesh.rotation.set(0, pose.panel.yaw, 0)"), "and the door's swing");
  assert.ok(body.includes("d.slot.position.set(pose.slot.x, pose.slot.y, pose.slot.z)"), "the coin slot rides the same pose");
  assert.ok(body.includes("d.slot.rotation.set(0, pose.slot.yaw, 0)"), "and its rotation");
  assert.ok(body.includes("screenPaintStep(cabinets)"), "the repaint cadence is tick-derived state, not wall-clock");
  assert.ok(body.includes("paintStep !== lastScreenPaintStep"), "screens repaint only when the paint step changed");
  assert.ok(body.includes("lastScreenPaintStep = paintStep;"), "the gate records the step it just painted (else every frame would repaint)");
  assert.ok(body.includes("repaintScreen("), "the gate's body actually repaints (a gate with no paint call leaves every screen frozen)");
  assert.ok(body.includes("s.canvas,"), "the repaint rewrites the handle's own canvas (repaint-into-the-same-canvas leg)");
  assert.ok(body.includes("placement.screenZones,"), "the repaint re-reads the placement's authored zone records");
  assert.ok(body.includes("paintStep,"), "the repaint receives the tick-derived paint step (liveness source)");
  assert.ok(body.includes("three.markTextureUpdated(s.texture)"), "a repaint marks the SAME texture dirty (no second canvas)");
  assert.ok(
    MAIN.includes("window.arcadeDebug = { player, loop, cabinets, seat, scheduler, presenter };"),
    "the console smoke can read the cabinet runtime, the seat cycle (1.5), and the Patron scheduler + figure presenter (1.6) — console-only, zero UI (AD-24)",
  );
  for (const banned of ["performance.now", "Date.now", "Math.random", "tickCount"]) {
    assert.ok(!body.includes(banned), `the 1.4 frame legs must not read ${banned} either (liveness derives from tick state)`);
  }
});

test("1.5 seat wiring (1.6-moved pins): the seat service owns the game-cabinet E-law, the seated view law, the raw-code slot mapping in-tick, and the event sink to the presentation half (AC4/AC5 wiring)", () => {
  assert.ok(MAIN.includes("const seat = createSeatService({ player, cabinets, busy: busyGate });"), "the seat is created over the kernel's own player/cabinets plus the scheduler's busy gate (1.6 pin move: the loop leg left with the drain)");
  assert.ok(MAIN.includes("seat.track({"), "game-wired placements track with instance, kernel input object, controls, and the authored legend keys");
  assert.ok(MAIN.includes("seatTrackVolumeIds.has(p.volumeId)"), "the seat E-routing gate IS the track gate (an entry without controls or legend keys keeps the plain 1.4 law, never an untracked-seat fault)");
  assert.ok(MAIN.includes("player.registerInteractable(p.volumeId, (id) => seat.handleInteract(id));"), "a tracked game cabinet routes E through the seat (the plain 1.4 toggle stays for the rest)");
  assert.ok(MAIN.includes("player.step(1, seat.playerView(input.takeView()));"), "the player system consumes the seat's view (seated -> zeroed axes/aim, E kept)");
  assert.ok(MAIN.includes('loop.addSystem("seat", () => seat.step(input.takeCodeView(), patronsRecords));'), "the seat maps raw codes onto declared slots inside the tick, AFTER the patrons dispatch, on the records the patrons system drained (1.6 pin move: the seat no longer drains — AD-23)");
  assert.ok(MAIN.includes("seat.setEventSink((rec) => presentations.get(rec.gameId)?.onEvent?.(rec.event));"), "the seat's drained records ride to the presentation half (sole M0 consumer)");
  assert.ok(MAIN.includes("entry.createPresentation({ makeCanvas:"), "the kernel hands the presentation its canvas through the injected factory (the adapter never touches DOM)");
  const body = frameBody(MAIN);
  assert.ok(body.includes("pres.drawFrame(instance.snapshot());"), "the game half paints from the instance snapshot every frame");
  assert.ok(body.includes("compositeScreen("), "the Core composites the game canvas under the Core-painted NEXT row");
  assert.ok(body.includes("presentations.has(placement.gameId)) continue;"), "a game-driven face skips the paint-step fallback (the gate governs the fallback path only)");
});

test("1.5 render-chain re-arm: frame() arms requestAnimationFrame BEFORE its draw legs (a throwing game draw must not strand the chain; AD-15 posture, DW-2/DW-6 fault family)", () => {
  assert.equal((MAIN.match(/requestAnimationFrame\(frame\)/g) ?? []).length, 2, "exactly two rAF(frame) sites: the bootstrap kick and the in-frame re-arm");
  const body = frameBody(MAIN);
  const rearm = body.indexOf("requestAnimationFrame(frame);");
  assert.ok(rearm >= 0, "the frame body re-arms its own chain");
  assert.ok(rearm < body.indexOf("pres.drawFrame(instance.snapshot());"), "the re-arm precedes the game half's drawFrame (game adapter code may throw)");
  assert.ok(rearm < body.indexOf("compositeScreen("), "and the Core composite");
  assert.ok(rearm < body.indexOf("renderer.render("), "and the room render");
});

test("1.6 patrons wiring: one drain per tick in a patrons system registered BETWEEN cabinets and seat, the seat<->scheduler mutual reference deferred through injected closures, run states tracked off the placement busy flag, and the figure re-posed from kernel state only (AD-23/AD-3 wiring)", () => {
  // Seat and scheduler see only their injected slices of each other; the
  // mutual reference resolves at CALL time (deferred closures), never by
  // mutating a finished object.
  assert.ok(MAIN.includes("const presenter = createFigurePresenter();"), "the kernel owns the reaction library + figure state");
  assert.ok(MAIN.includes("busyFor: (volumeId) => scheduler.busyFor(volumeId),"), "the seat's busy leg defers to the scheduler");
  assert.ok(MAIN.includes("toggleWait: (volumeId) => scheduler.toggleWait(volumeId),"), "and the wait toggle");
  assert.ok(MAIN.includes("const scheduler = createPatronScheduler({ seat, player, presenter });"), "the scheduler gets the seat through the SeatHandover interface (one direction, scheduler -> seat)");

  // Busy is room data: run states are tracked per busy placement record —
  // no hand-typed id list anywhere in the glue.
  assert.ok(MAIN.includes("if (p.busy !== true || p.gameId == null) continue;"), "the track gate reads the placement's busy flag (AD-12 provisional carrier)");
  assert.ok(MAIN.includes("impulses: entry.impulses ?? {},"), "the mapping reaches the scheduler only through the generated registry (AD-1)");

  // Exactly ONE consumer of the event queue per tick — the patrons system
  // — with the seat on forwarded records (the "no second drain" Never).
  assert.equal((MAIN.match(/drainEvents\(/g) ?? []).length, 1, "the entry drains the event queue exactly once per tick");
  assert.ok(MAIN.includes('loop.addSystem("patrons", () => {'), "the patrons system is a registered kernel system (supervisor-wrapped, AD-15)");
  assert.ok(MAIN.includes("patronsRecords = loop.drainEvents();"), "it drains once per tick");
  assert.ok(MAIN.includes("presenter.step(loop.tickCount);"), "it advances the figure reaction in-tick (AD-3)");
  assert.ok(MAIN.includes("scheduler.dispatch(patronsRecords, loop.tickCount);"), "it runs the impulse stage + break arbitration in-tick");
  // Order INSIDE the patrons body: dispatch must run on THIS tick's drained
  // records (a reorder keeps every substring above and still feeds the
  // scheduler the previous tick's records — AC2's same-tick reaction law and
  // break-tick arbitration would ship broken through the shipped entry).
  const pm = MAIN.match(/loop\.addSystem\("patrons", \(\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(pm, "the patrons system is one registered block");
  const pBody = pm![1];
  const drainAt = pBody.indexOf("patronsRecords = loop.drainEvents();");
  const stepAt = pBody.indexOf("presenter.step(loop.tickCount);");
  const dispatchAt = pBody.indexOf("scheduler.dispatch(patronsRecords, loop.tickCount);");
  assert.ok(
    drainAt >= 0 && stepAt > drainAt && dispatchAt > stepAt,
    "inside the patrons body the order is drain -> figure step -> dispatch on this tick's records (AD-23 same-tick phase order in the shipped entry)",
  );
  // AD-23's fixed phase order realized as registration order: cabinets,
  // then patrons, then seat (seat's controls apply to the NEXT tick).
  const cabinetsAt = MAIN.indexOf('loop.addSystem("cabinets"');
  const patronsAt = MAIN.indexOf('loop.addSystem("patrons"');
  const seatAt = MAIN.indexOf('loop.addSystem("seat"');
  assert.ok(cabinetsAt >= 0 && patronsAt > cabinetsAt && seatAt > patronsAt, "registration order IS cabinets -> patrons -> seat");

  // The figure: three boxes at the Wall Warm token, built once per BUSY
  // placement at the seat's play pose, invisible at boot — and the frame
  // RE-POSES from kernel state (the coin-door idiom; render never decides).
  assert.ok(MAIN.includes("if (p.busy !== true) continue;"), "figures are built per busy placement record, never per hand-typed id");
  assert.ok(MAIN.includes("const pose = presenter.figurePose(p.volumeId);"), "the figure stands at the seat's authored play pose (reused law)");
  assert.ok(MAIN.includes("three.standardMaterial({ color: WALL_WARM })"), "hard-cornered box stack in the Wall Warm token (inference-authored look)");
  assert.ok(MAIN.includes("partMesh.visible = false;"), "no Patron stands at boot attract");
  const body = frameBody(MAIN);
  assert.ok(body.includes("const active = scheduler.figureActive(f.volumeId);"), "the frame READS whether the Patron drives — the figure appears/disappears with occupancy");
  assert.ok(body.includes("f.legs.visible = active;") && body.includes("f.torso.visible = active;") && body.includes("f.head.visible = active;"), "all three parts follow the occupancy read");
  assert.ok(body.includes("const off = presenter.figureOffset();"), "the pose delta is a pure read of presenter tick state (no wall-clock, no recomputation in render)");
  assert.ok(body.includes("f.torso.position.set(f.base.x + leanX, FIGURE_PARTS.torso.centerY + off.torsoY, f.base.z + leanZ)"), "the torso re-poses from the reaction offset + the lean along the placement facing");
  assert.ok(body.includes("f.head.position.set(f.base.x + leanX, FIGURE_PARTS.head.centerY + off.headY, f.base.z + leanZ)"), "and the head rides the torso");
});
