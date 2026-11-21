// Browser entry: the render side only (AD-3 — render is decoupled from the
// fixed-tick kernel). Scene is the empty Room Black envelope; geometry and
// the first-person shell arrive in Story 1.3/1.2. The kernel loop is
// instantiated here and drives instances from the build-generated registry.

import * as THREE from "three";
import { createKernelLoop } from "./loop.ts";
import { createGameInstance } from "./contract/index.ts";
import { gameRegistry } from "../generated/game-registry.ts";

// Design token: Room Black (UX DESIGN.md) — the dark the glow sits against.
const ROOM_BLACK = 0x15110e;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(ROOM_BLACK, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 0); // seated-eye placeholder; shell arrives in 1.2

const loop = createKernelLoop({
  now: () => performance.now(),
  schedule: (cb) => requestAnimationFrame(cb),
  onFault: (entry) => console.error(`[supervisor fault] tick=${entry.tick} id=${entry.errorId}: ${entry.message}`),
});

for (const entry of gameRegistry) {
  loop.addInstance(entry.id, createGameInstance(entry.createSim, entry.seed ?? 0));
}
loop.start();

function frame(): void {
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
