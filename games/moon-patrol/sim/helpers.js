// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5 port; provenance line in the world.js header). SEAM EDITS ONLY: import paths
// point at this sim folder, and createWorld is wrapped to inject the math
// harness (the vendored world requires opts.math; tests hand it the host
// Math as a value — the value form is what ci/lint-bans.mjs allows in sim
// code, and these tests pin the VENDORED physics, at the vendored 1/120
// step, not the kernel harness).

import { createWorld as baseCreateWorld, step } from './world.js';
import { CFG } from './config.js';

export const DT = 1 / 120;

export function createWorld(opts = {}) {
  return baseCreateWorld({ math: globalThis.Math, ...opts });
}

export function drive(w, seconds, input = { right: true }) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    step(w, DT, input);
    if (w.mode === 'gameover') break;
  }
  return w;
}

// step until the world leaves 'running' (death/land/gameover), or timeout
export function driveUntilNotRunning(w, seconds, input = { right: true }) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n && w.mode === 'running'; i++) step(w, DT, input);
  return w;
}

// world with no generated content — tests place their own hazards
export function sandboxWorld(opts = {}) {
  const w = createWorld({ seed: 101, ...opts });
  w.ground = [];
  w.craters = [];
  w.course.events = [];
  w.nextEvent = 0;
  w.course.gates = [];
  w.nextGate = 0;
  w.buggy.invuln = 0;
  return w;
}

export { step, CFG };
