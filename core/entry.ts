// Story 1.9 (AC1-AC3): the entry sequence law — the street-door beat that
// opens the fiction. This module owns the PHASE LAW only: which phase the
// page is in, how far each beat leg has progressed in TICKS, where the
// camera belongs, and when the visitor gets their view. It renders nothing
// and touches no host interface: the caller (core/main.ts) feeds it ticks
// from the fixed-step loop (AD-3 — every beat leg is tick-counted, never
// wall-clock-paced) and paints whatever pose()/state() says; the
// workbench swap (core/workbench.ts) is the caller's act on phase() ===
// "workbench", not this module's.
//
// Wall-clock enters at exactly two labelled points, through the injected
// `now` source (device-layer only, AD-3):
//   1. the slow-load init check — a tab that was already sitting past
//      ENTRY_TIMEOUT_MS before the script ran never starts the beat;
//   2. the control stamp — timeToPlayableMs is recorded once, at the tick
//      the visitor gains control (AC3's measurement; this story only
//      MEASURES, closing FR-1's deferred budget row is the lead's call).
//
// The phase law:
//   boot-check    init only: the slow-load check ran and passed.
//   door          the street view holds while the page compiles/paints;
//                 the door bleed + glass ramp widens as it settles.
//   ready-handle  ENTRY_READY_FRAMES frames have actually rendered, so
//                 the handle turns.
//   open          the door swings and the camera dollies from the street
//                 to the spawn pose in fiction time (ticks).
//   control       the dolly ended EXACTLY on the spawn pose (no pop on
//                 takeover) and playerView is passed through untouched.
//   workbench     unsupported, slow-init, a throw, or ENTRY_TIMEOUT_TICKS
//                 with zero rendered frames — the outside-fiction panel.
//
// Timeout law (AD-15's self-heal): the entry system is supervisor-wrapped,
// so a throw inside it is a fault record, not a dead page — and even a
// silently wedged boot tick-counts its way to "workbench" at
// ENTRY_TIMEOUT_TICKS with no rendered frame.

import type { DeviceView } from "./input/index.ts";

export type EntryPhase =
  | "boot-check"
  | "door"
  | "ready-handle"
  | "open"
  | "control"
  | "workbench";

// Authored constants (inferred unless cited by the spec):
/** Slow-load ceiling (device-layer ms): a tab older than this at init
 * never starts the beat — straight to the workbench. */
export const ENTRY_TIMEOUT_MS = 90_000;
/** In-run stall ceiling in TICKS (5400 x 16.67ms ~ 90s, AD-3 law: the
 * timeout is counted, never timed). Checked after the tick is taken, so
 * the 5400th beat tick is the one that lands the workbench. */
export const ENTRY_TIMEOUT_TICKS = 5400;
/** Frames that must have actually rendered before the handle turns —
 * the ready gate: the room is visibly up before fiction resumes. */
export const ENTRY_READY_FRAMES = 2;
/** Ticks the handle takes to turn once ready (tuned by eye, smoke). */
export const ENTRY_HANDLE_TICKS = 60;
/** Ticks the door takes to swing + the camera to dolly (tuned by eye). */
export const ENTRY_OPEN_TICKS = 150;
/** Ticks the door bleed / glass ramp takes to reach full width as the
 * page settles (tuned by eye). The ramp rides the global beat tick
 * through the ready wait AND the open leg, so a healthy beat ends with
 * bleed+glass at full (the smoke law) — on a fast load the ramp finishes
 * mid-walk-in rather than freezing half-wide forever. */
export const ENTRY_RAMP_TICKS = 120;
/** The street-side view the beat opens on: authored against the
 * street-floor strip in collision-volumes (z 6.5..8.25), facing the front
 * door straight down -Z (yaw 0). */
export const ENTRY_STREET_VIEW = { x: 0, z: 7.35 } as const;

export interface EntryPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** Plain data (Rule: debug surfaces hand out snapshots, not internals). */
export interface EntryState {
  phase: EntryPhase;
  tick: number;
  framesRendered: number;
  bleedFraction: number;
  handleFraction: number;
  openFraction: number;
  open: boolean;
  timeToPlayableMs: number | null;
}

export interface EntrySequence {
  step(): void;
  markFrameRendered(): void;
  playerView(view: DeviceView): DeviceView;
  pose(): EntryPose;
  phase(): EntryPhase;
  state(): EntryState;
  failNow(): void;
}

export interface EntryOptions {
  /** Device-layer wall clock (AD-3): used ONLY for the init check and the
   * control stamp, both labelled below. */
  now: () => number;
  /** Where control hands over — ENTRY_SPAWN from collision-volumes. */
  spawn: { x: number; z: number };
  /** Camera eye height through the whole beat (EYE_HEIGHT from player). */
  eyeHeight: number;
}

/** Terminal phases stop the beat clock: nothing advances after them. */
function terminal(phase: EntryPhase): boolean {
  return phase === "control" || phase === "workbench";
}

export function createEntrySequence(opts: EntryOptions): EntrySequence {
  // (1) The slow-load init check — wall-clock, device-layer, BEFORE the
  // beat: a tab already past the ceiling never opens the door.
  let phase: EntryPhase = opts.now() >= ENTRY_TIMEOUT_MS ? "workbench" : "boot-check";
  let tick = 0;
  let phaseStartTick = 0;
  let framesRendered = 0;
  let bleedFraction = 0;
  let handleFraction = 0;
  let openFraction = 0;
  let timeToPlayableMs: number | null = null;

  function step(): void {
    if (terminal(phase)) return;
    // The tick is taken FIRST, then the stall law is checked — the
    // 5400th beat tick without a single rendered frame lands the
    // workbench (the mutation "compare before increment" must go red).
    tick += 1;
    if (framesRendered === 0 && tick >= ENTRY_TIMEOUT_TICKS) {
      phase = "workbench";
      return;
    }
    if (phase === "boot-check") phase = "door";
    if (phase === "door" || phase === "ready-handle" || phase === "open") {
      // The bleed/glass ramp widens while the page settles — global tick
      // based so it keeps widening through the ready wait AND through the
      // open leg (clamped at 1: on a fast load it reaches full mid-
      // walk-in), and holds (never recomputed) once control takes over.
      bleedFraction = Math.min(1, tick / ENTRY_RAMP_TICKS);
    }
    if (phase === "door" || phase === "ready-handle") {
      if (phase === "door") {
        if (framesRendered >= ENTRY_READY_FRAMES) {
          phase = "ready-handle";
          phaseStartTick = tick;
        }
      } else {
        handleFraction = Math.min(1, (tick - phaseStartTick) / ENTRY_HANDLE_TICKS);
        if (handleFraction >= 1) {
          phase = "open";
          phaseStartTick = tick;
          openFraction = 0;
        }
      }
    } else if (phase === "open") {
      openFraction = Math.min(1, (tick - phaseStartTick) / ENTRY_OPEN_TICKS);
      if (openFraction >= 1) {
        phase = "control";
        // (2) The control stamp — wall-clock, device-layer, labelled:
        // AC3's time-to-playable measurement, recorded once.
        timeToPlayableMs = opts.now();
      }
    }
  }

  function markFrameRendered(): void {
    framesRendered += 1;
  }

  function playerView(view: DeviceView): DeviceView {
    // The input gate: until "control" the visitor sees the beat but owns
    // nothing — axes, aim AND interact all quiet (this composes OUTSIDE
    // seat.playerView, so the seat's own law stays untouched).
    if (phase === "control") return view;
    return {
      axes: { forward: 0, strafe: 0 },
      aim: { dx: 0, dy: 0 },
      interact: { down: false, pressed: false },
    };
  }

  function pose(): EntryPose {
    if (phase === "control") {
      return { x: opts.spawn.x, y: opts.eyeHeight, z: opts.spawn.z, yaw: 0, pitch: 0 };
    }
    if (phase === "open") {
      // Pure arithmetic dolly (no transcendental anywhere in the beat):
      // street view -> spawn. The f >= 1 branch returns the spawn pose
      // EXACTLY — a lerp at f = 1 is not guaranteed to land on b in
      // floating point, and the takeover must be pop-free (AC1).
      const x = openFraction >= 1 ? opts.spawn.x : ENTRY_STREET_VIEW.x + (opts.spawn.x - ENTRY_STREET_VIEW.x) * openFraction;
      const z = openFraction >= 1 ? opts.spawn.z : ENTRY_STREET_VIEW.z + (opts.spawn.z - ENTRY_STREET_VIEW.z) * openFraction;
      return { x, y: opts.eyeHeight, z, yaw: 0, pitch: 0 };
    }
    // boot-check / door / ready-handle hold the street view; workbench
    // keeps the last street pose (the canvas is gone; pose is moot).
    return { x: ENTRY_STREET_VIEW.x, y: opts.eyeHeight, z: ENTRY_STREET_VIEW.z, yaw: 0, pitch: 0 };
  }

  return {
    step,
    markFrameRendered,
    playerView,
    pose,
    phase: () => phase,
    state: (): EntryState => ({
      phase,
      tick,
      framesRendered,
      bleedFraction,
      handleFraction,
      openFraction,
      open: openFraction >= 1,
      timeToPlayableMs,
    }),
    failNow: () => {
      phase = "workbench";
    },
  };
}
