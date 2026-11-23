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
// contract; the lead's Chrome+Edge smoke covers in-browser behaviour.
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
  assert.ok(body.includes("three.markTextureUpdated(s.texture)"), "a repaint marks the SAME texture dirty (no second canvas)");
  assert.ok(MAIN.includes("window.arcadeDebug = { player, loop, cabinets };"), "the console smoke can read the cabinet runtime");
  for (const banned of ["performance.now", "Date.now", "Math.random", "tickCount"]) {
    assert.ok(!body.includes(banned), `the 1.4 frame legs must not read ${banned} either (liveness derives from tick state)`);
  }
});
