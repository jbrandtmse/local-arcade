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
// figure re-pose legs in frame() (banned wall-clock still banned). Story
// 1.7 moved the boot body to core/containment.ts (the seat/scheduler
// creation pins drop to block tier to see the faultedFor injection, the
// createPresentation pin travels to the containment-wiring test), widens
// the face gate to containment.faultedFor + drawFaulted, and pins the
// supervisor-wrapped draw legs (the wall-clock ban stands byte-unchanged —
// frame() stamps draw-fault records from the drawTick tick-state variable).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const MAIN = readFileSync(path.join(REPO, "core", "main.ts"), "utf8");
const CONTAINMENT = readFileSync(path.join(REPO, "core", "containment.ts"), "utf8");

function frameBody(src: string): string {
  const m = src.match(/function frame\(\): void \{([\s\S]*?)\n\}/);
  assert.ok(m, "core/main.ts has a frame() render function");
  return m[1]!;
}

// 1.7 block tier: the seat/scheduler creations became multi-line (the
// faultedFor injection), so substring pins read the whole creation block —
// the substring must sit INSIDE the named service's block, not just
// somewhere in the file.
function creationBlock(src: string, decl: string): string {
  const m = src.match(new RegExp(`const ${decl} = create\\w+\\(\\{[\\s\\S]*?\\n\\}\\);`));
  assert.ok(m, `core/main.ts creates "${decl}" in a multi-line creation block`);
  return m[0];
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
  // 1.8 pin move: the fallback repaint no longer consumes the raw placement
  // zones — it consumes the COMPOSED records (authored zones spread + the
  // table's rows). The placement record itself is never edited (read-only
  // room data).
  assert.ok(
    body.includes("{ ...placement.screenZones, score: storage.rowsFor(placement.gameId) }"),
    "the composed zones spread the authored record and replace ONLY the score leg with the table's rows (mutation: paint the raw zones and the score zone stays empty forever — red here)",
  );
  assert.match(body, /repaintScreen\(\s*s\.canvas,\s*zones,/, "the repaint consumes the composed zone records");
  assert.ok(body.includes("paintStep,"), "the repaint receives the tick-derived paint step (liveness source)");
  assert.ok(body.includes("three.markTextureUpdated(s.texture)"), "a repaint marks the SAME texture dirty (no second canvas)");
  assert.ok(
    MAIN.includes("window.arcadeDebug = { player, loop, cabinets, seat, scheduler, presenter, containment, storage };"),
    "the console smoke can read the cabinet runtime, the seat cycle (1.5), the Patron scheduler + figure presenter (1.6), the containment handle with injectFault (1.7 — the smoke drives a REAL fault chain), and the storage/identity service (1.8 — the smoke reads visitorId + rowsFor, console-only) — console-only, zero UI (AD-24)",
  );
  for (const banned of ["performance.now", "Date.now", "Math.random", "tickCount"]) {
    assert.ok(!body.includes(banned), `the 1.4 frame legs must not read ${banned} either (liveness derives from tick state)`);
  }
});

test("1.5 seat wiring (1.6/1.7-moved pins): the seat service owns the game-cabinet E-law, the seated view law, the raw-code slot mapping in-tick, and the event sink to the presentation half (AC4/AC5 wiring)", () => {
  const seatBlock = creationBlock(MAIN, "seat");
  assert.ok(seatBlock.includes("createSeatService({"), "the seat is created over the kernel's own player/cabinets (1.6 pin move: the loop leg left with the drain)");
  assert.ok(seatBlock.includes("busy: busyGate,"), "the seat sees the scheduler only through the injected busy gate (1.6)");
  assert.ok(
    seatBlock.includes("faultedFor: (gameId) => containment.faultedFor(gameId),"),
    "1.7: the containment predicate reaches the seat as a deferred closure — the faulted E-law and same-tick release run in the SHIPPED entry, not only in the unit rigs",
  );
  assert.ok(MAIN.includes("seat.track({"), "game-wired placements track with instance, kernel input object, controls, and the authored legend keys");
  assert.ok(MAIN.includes("seatTrackVolumeIds.has(p.volumeId)"), "the seat E-routing gate IS the track gate (an entry without controls or legend keys keeps the plain 1.4 law, never an untracked-seat fault)");
  assert.ok(MAIN.includes("player.registerInteractable(p.volumeId, (id) => seat.handleInteract(id));"), "a tracked game cabinet routes E through the seat (the plain 1.4 toggle stays for the rest)");
  assert.ok(MAIN.includes("player.step(1, seat.playerView(input.takeView()));"), "the player system consumes the seat's view (seated -> zeroed axes/aim, E kept)");
  assert.ok(MAIN.includes('loop.addSystem("seat", () => seat.step(input.takeCodeView(), patronsRecords));'), "the seat maps raw codes onto declared slots inside the tick, AFTER the patrons dispatch, on the records the patrons system drained (1.6 pin move: the seat no longer drains — AD-23)");
  assert.ok(MAIN.includes("seat.setEventSink((rec) => presentations.get(rec.gameId)?.onEvent?.(rec.event));"), "the seat's drained records ride to the presentation half (sole M0 consumer)");
  assert.match(
    MAIN,
    /attachGameEntries\(\s*gameRegistry,\s*loop,\s*supervisor,\s*makeCanvas,\s*\)/,
    "1.7 pin move: the instances + presentations now come from the containment seam — exactly ONE boot call site, every factory under the guard (DW-2)",
  );
  assert.ok(!MAIN.includes("createGameInstance("), "1.7: main.ts builds no instance directly — a second unguarded boot call is exactly the AC3 crash this pin catches");
  const body = frameBody(MAIN);
  assert.ok(body.includes("pres.drawFrame(instance.snapshot());"), "the game half paints from the instance snapshot every frame");
  assert.ok(body.includes("compositeScreen("), "the Core composites the game canvas under the Core-painted NEXT row");
  assert.match(body, /compositeScreen\(\s*s\.canvas,\s*placement\.screenZones,/, "1.8: the COMPOSITE path keeps the raw authored zones — the table feeds the fallback face only, the vendored presentation's session HI-SCORE is not the Core table (AD-16)");
  assert.ok(body.includes("!containment.faultedFor(placement.gameId) &&"), "1.7: a quarantined sim half takes the fallback painter (the face gate widens past 'has a presentation')");
  assert.ok(body.includes("if (faceComposites) continue;"), "a compositing face still skips the paint-step fallback (the 1.5 gate law survives under the wider gate)");
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
  const schedBlock = creationBlock(MAIN, "scheduler");
  assert.ok(schedBlock.includes("createPatronScheduler({"), "the scheduler gets the seat through the SeatHandover interface (one direction, scheduler -> seat)");
  assert.ok(
    schedBlock.includes("faultedFor: (gameId) => containment.faultedFor(gameId),"),
    "1.7: the same containment predicate reaches the scheduler (dwell re-arm + break relaunch gated in the SHIPPED entry)",
  );

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
  // 1.7 (DW-3 drain half): the drain is the body's FIRST statement — a
  // dispatch that throws must never cost this tick's queue (the queue is
  // already handed to the consumers before anything can fault).
  assert.ok(
    pBody.trimStart().startsWith("patronsRecords = loop.drainEvents();"),
    "the drain leads the patrons body (mutation: moving it below the dispatch silently loses records on a throwing tick — AC6's drain regression)",
  );
  // 1.7 draw-stamp leg: frame() stamps its draw-fault records from this
  // tick-state variable, which is why the frame's "tickCount" ban above
  // stays byte-unchanged (AD-3 — sim time comes from the tick, not a clock).
  assert.ok(pBody.includes("drawTick = loop.tickCount;"), "the patrons body stamps the draw-record tick (the frame reads drawTick, never the loop's clock)");
  assert.ok(
    drainAt >= 0 && drainAt < pBody.indexOf("drawTick = loop.tickCount;") && pBody.indexOf("drawTick = loop.tickCount;") < stepAt,
    "1.7: the stamp rides right behind the drain, ahead of the legs a fault can cost — a throwing presenter/dispatch never leaves it a tick stale (mutation: moving the stamp below the dispatch reds this pin)",
  );
  // 1.8 (AC2/AD-23/AD-4): the storage ingest leg rides the SAME drained
  // records (no second drainEvents — the count pin above stands), runs
  // after the tick stamp (its ctx.tick reads drawTick) and BEFORE
  // presenter.step + scheduler.dispatch: during a Patron run the scheduler
  // occupancy and lastSeed are the LIVE run (AD-4 currency). Mutation: move
  // the ingest leg below the dispatch and every pin below reds (the score
  // would credit the NEXT run's derived seed).
  const ingestAt = pBody.indexOf("storage.ingest(patronsRecords,");
  assert.ok(ingestAt >= 0, "the patrons body carries the storage ingest leg on the drained records (the single-drainer law: ingest consumes patronsRecords, never a fresh drain)");
  assert.ok(
    pBody.indexOf("drawTick = loop.tickCount;") < ingestAt && ingestAt < stepAt,
    "the ingest leg runs after the tick stamp and ahead of the presenter/dispatch legs (same-tick phase order in the shipped entry)",
  );
  assert.ok(pBody.includes("tick: drawTick,"), "the ingest ctx stamps sim time from the tick-state variable (AD-3: no wall clock in a storage path)");
  assert.ok(pBody.includes("?.lastSeed ?? 0"), "the seedOf leg reads the scheduler's RESOLVED run seed (AD-4 currency for Patron pseudonyms)");
  // Classification order (occupancy-first): the kindOf closure asks the
  // scheduler state() view BEFORE the seat state() view. Mutation: ask the
  // chair first and a Patron-run score classifies visitor-side — the
  // executed storage suite's precedence test and this pin both red.
  const kindBlock = pBody.match(/kindOf: \(gameId\) => \{([\s\S]*?)\n\s*\},/);
  assert.ok(kindBlock, "kindOf is a closure over the scheduler + seat plain-data state() views (neither interface widens — the 1.7 pins stay byte-unchanged)");
  const kindBody = kindBlock![1];
  assert.ok(
    kindBody.indexOf('occ === "patron-autoplay"') >= 0 && kindBody.indexOf("seat.state()") > kindBody.indexOf("scheduler.state()"),
    "occupancy is consulted before the chair (occupancy-before-seat classification)",
  );
  assert.ok(frameBody(MAIN).includes("tick: drawTick,"), "the draw legs' fault records stamp the tick-stamped variable");
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

// Story 1.7: the containment seam in the shipped entry. The boot body
// MOVED to core/containment.ts (one guarded call site remains), the frame
// decides every face through the widened gate, and each draw leg is
// supervisor-wrapped with a persistent per-face flip. The executed tiers
// cover the laws themselves (containment/seat/scheduler suites); these
// pins prove the SHIPPED entry routes through them.
test("1.7 containment wiring: the boot body lives behind attachGameEntries with every factory under hook \"boot\", the loop is handed the GUARDED instance, the face gate reads faultedFor + drawFaulted, draw legs are supervisor-wrapped with a forever-flip on fault, and main.ts keeps no unguarded factory call", () => {
  assert.ok(
    MAIN.includes('import { attachGameEntries, type Containment } from "./containment.ts";'),
    "the containment seam is a core module (AD-1: core owns it; the seam imports no games)",
  );
  assert.ok(!MAIN.includes("createGameInstance("), "main.ts creates no sim directly (mutation: a direct unguarded boot here is the AC3 crash — one throwing factory kills the page)");
  assert.ok(!MAIN.includes("createPresentation("), "nor a presentation directly — the moved boot body must not leave a second unguarded copy behind");

  // The seam itself (source tier): factories under the boot guard, the
  // guarded instance reaching the loop, and the 1.5 canvas-factory law at
  // its new home.
  assert.ok(CONTAINMENT.includes('hook: "boot",'), "every factory runs under the supervisor's boot hook (DW-2: a throwing factory is one fault record, not a dead page)");
  assert.ok(CONTAINMENT.includes("createGameInstance(entry.createSim, entry.seed ?? 0)"), "the sim half is built THROUGH the wrapper inside the guard (the AD-8 contract seeding law intact)");
  assert.ok(CONTAINMENT.includes("entry.createPresentation!({ makeCanvas })"), "the kernel hands the presentation its canvas through the injected factory (the 1.5 pin travels with the moved body)");
  assert.ok(CONTAINMENT.includes("loop.addInstance(entry.id, guard.instance, tickInput);"), "the loop is handed the GUARDED instance — the quarantine is on the shipped surface, not a test-only decorator");

  // AC3's consequence half: a boot-faulted entry leaves the instances/
  // instanceInputs maps without that entry, and the track gates' null
  // checks are the shipped bridge from that state to the plain 1.4 law
  // (fallback face, coin-door E) for its Cabinet.
  assert.ok(
    MAIN.includes("instance == null || tickInput == null"),
    "the seat-track gate drops a boot-faulted entry (no instance/TickInput) — never a track on missing parts (mutation: dropping the instance null-check reds this pin)",
  );
  assert.ok(
    MAIN.includes("entry == null || instance == null || entry.seed == null"),
    "the scheduler-track gate degrades the same way — a boot-faulted game gets no Patron run state (AC3, matrix row 1)",
  );

  // The frame's face gate and draw legs.
  const body = frameBody(MAIN);
  assert.ok(body.includes("const faceComposites ="), "the frame decides the face path through ONE gate variable");
  assert.ok(body.includes("presentations.has(placement.gameId) &&"), "a face with no live presentation falls back (boot-half fault or never-wired cabinet)");
  assert.ok(body.includes("!drawFaulted.has(placement.gameId);"), "a face whose draw leg faulted once falls back FOREVER (bounded logging — the Never against silent per-frame retry, DW-3)");
  assert.ok(body.includes("if (faceComposites) continue;"), "and the fallback body runs for exactly the gated faces");
  assert.ok(MAIN.includes("const drawFaulted = new Set<string>();"), "the draw-fault flip is persistent state, not a frame-local");
  assert.ok(body.includes('containment.faultedFor(placement.gameId) || drawFaulted.has(placement.gameId)) continue;'), "the draw loop skips faulted faces BEFORE invoking (one fault per face, forever — not one per frame)");
  assert.ok(body.includes("supervisor.invoke({"), "each draw+composite leg goes through the supervisor (AD-15), not a bare try/catch");
  assert.ok(body.includes('hook: "draw",'), "draw faults are attributed under hook \"draw\" with the gameId (AD-26 shape: <gameId>.draw#N)");
  assert.ok(body.includes("if (!draw.ok) drawFaulted.add(placement.gameId);"), "a draw fault flips ONLY that face — neighbours and the sim half keep performing (halves fault independently)");
});

// Story 1.8: the storage/identity service in the shipped entry. The executed
// laws live in core/storage.test.ts (identity, table, pseudonyms, content
// law, degradation); these pins prove the SHIPPED entry wires the service:
// eager identity at boot, browser-edge defaults at creation, the ingest leg
// on the patrons drain (order pins in the 1.6 test above), the composed
// zones on the fallback face (moved pin in the 1.4 test), and the debug
// handle exposure (console-only read-back, AC4's smoke half).
test("1.8 storage wiring (AD-16): the service is a core import created with browser-edge defaults, the identity is generated EAGERLY at boot before loop.start, and the debug type carries the service", () => {
  assert.ok(
    MAIN.includes('import { createStorageService, type StorageService } from "./storage.ts";'),
    "storage is a core module consumed by the glue (AD-1 import direction: core -> core, games import nothing)",
  );
  assert.ok(MAIN.includes("const storage = createStorageService();"), "the service is created with its browser-edge defaults (the localStorage port + crypto.randomUUID live behind the service's own try/catch — the glue reaches no device API directly)");
  // Same comment-stripped scan posture as the no-ui-dom single-owner scan:
  // the ban binds CODE, so a comment may document the law without tripping it.
  const MAIN_CODE = MAIN.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(!MAIN_CODE.includes("localStorage"), "main.ts itself never names the device store in code — single-owner law: core/storage.ts is the only core file that does (the no-ui-dom scan enforces the rest)");
  const bootAt = MAIN.indexOf("storage.visitorId();");
  const startAt = MAIN.indexOf("loop.start();");
  assert.ok(bootAt >= 0 && startAt >= 0 && bootAt < startAt, "the identity is generated EAGERLY at boot (\"first visit generates\"): the id exists before the loop runs — 1.9's boot beat rides this wiring");
  assert.ok(MAIN.includes("storage: StorageService;"), "the arcadeDebug type carries the storage service (the console smoke reads the table — zero UI, AD-24)");
});
