// Moon Patrol sim half — Story 1.5 (PROVISIONAL play surface): contract
// hooks over the vendored world (see world.js header for provenance). The
// kernel drives tick/events/snapshot/attract; play(seed) (AD-23, opened this
// story) rebuilds the play world from the kernel's seed, and autoplay(seed)
// (Story 1.6) opens the same world to the authored AI in autoplay.js. The
// vendored world
// physics steps at dt/2 twice per kernel tick — the vendored tests tune and
// pin the physics at 1/120, and 1/60 halved is exactly representable, so the
// kernel's fixed step lands on the tuned substep without a rate change.

import { createWorld, step as worldStep, drainFx } from './world.js';
import { autoplayInput } from './autoplay.js';

export function createSim(ctx) {
  const math = ctx.math;
  let mode = 'attract';
  let attractT = 0;
  let world = createWorld({ seed: 1, math });
  let queued = [];
  let runSeed = 1; // the seed play() handed in; a continuation rebuild reuses it

  // fx -> events. The vendored fx list mixes plain names (sound cues the
  // kernel has no use for yet — forwarded as zero-payload events, honest and
  // cheap) with the seam-edit burst requests (particles live in the
  // presentation). 'gameover' becomes the AD-23 pair: scoreSubmitted FIRST,
  // then gameEnded, same tick — the seat's drain order is the report order.
  function drainedEvents() {
    const out = [];
    for (const f of drainFx(world)) {
      if (typeof f === 'object' && f !== null && f.burst === true) {
        out.push({ type: 'burst', payload: { x: f.x, y: f.y, n: f.n, color: f.color } });
        continue;
      }
      if (f === 'gameover') {
        // Story 1.6: the raw 'gameover' cue rides the drain too — the
        // authored impulse mapping binds the slam reaction to it (Design
        // Notes 7). The AD-23 pair keeps its order: scoreSubmitted FIRST,
        // then gameEnded.
        out.push({ type: 'gameover', payload: {} });
        out.push({ type: 'scoreSubmitted', payload: { score: world.score } });
        out.push({ type: 'gameEnded', payload: { score: world.score } });
        continue;
      }
      if (f === 'clear') {
        out.push({ type: 'roundBreak', payload: {} });
        continue;
      }
      out.push({ type: String(f), payload: {} });
    }
    return out;
  }

  return {
    tick(dt, input) {
      if (mode === 'attract') {
        // Attract liveness (the I/O matrix's 3x720-tick row): the attract
        // clock is kernel-tick state; the presentation reads it from the
        // snapshot — no wall clock anywhere in the game.
        attractT += dt;
        return;
      }
      if (mode === 'autoplay') {
        // Story 1.6 (AD-23): a busy cabinet has no seated player — the
        // kernel input object is ignored, and the authored AI synthesizes
        // step()'s boolean inputs from the live world, once per substep.
        worldStep(world, dt / 2, autoplayInput(world));
        worldStep(world, dt / 2, autoplayInput(world));
      } else {
        const c = input.controls;
        const move = typeof c.axes.move === 'number' ? c.axes.move : 0;
        const inp = {
          left: move < 0,
          right: move > 0,
          jump: !!c.buttons.jump?.down,
          fire: !!c.buttons.fire?.down,
        };
        worldStep(world, dt / 2, inp);
        worldStep(world, dt / 2, inp);
      }
      queued.push(...drainedEvents());
      if (world.done) {
        // Champion law (vendored src/main.js:67-76 — that glue layer is not
        // vendored, so the law lives here; the world.js clear/done mechanic
        // is untouched): Beginner -> Champion, then Champion loops, carrying
        // score, lives, and extra-life progress into a fresh course built on
        // the same run seed. courseIndex is 1 for every continuation.
        world = createWorld({
          seed: runSeed,
          math,
          courseIndex: 1,
          score: world.score,
          lives: world.lives,
          extraLifeIdx: world.extraLifeIdx,
        });
      }
    },

    events() {
      const out = queued;
      queued = [];
      return out;
    },

    snapshot() {
      // Plain and cursor-carrying (AD-4): the world's rng cursor joins the
      // snapshot; the injected math harness and the function-valued rng
      // object stay out (they are the harness, not state).
      const { rng, math: _math, ...rest } = world;
      const plain = structuredClone(rest);
      plain.rngCursor = rng.getState();
      return { mode, attractT, kernelRng: ctx.rng.getState(), world: plain };
    },

    attract() {
      mode = 'attract';
    },

    play(seed) {
      runSeed = seed;
      world = createWorld({ seed, math });
      queued = [];
      // Mode switch restarts the attract clock: a stale attract phase is
      // state debt, not history — the next attract cycle starts fresh.
      attractT = 0;
      mode = 'play';
    },

    // Story 1.6 (AD-23, hook shape fixed by the contract): identical world
    // rebuild to play(), but the sim drives itself through autoplayInput.
    // The wrapper re-seeds the kernel rng before calling this (AD-4).
    autoplay(seed) {
      runSeed = seed;
      world = createWorld({ seed, math });
      queued = [];
      attractT = 0;
      mode = 'autoplay';
    },
  };
}
