// Story 1.2 (AC2/AC4/AC6/AC7): first-person controller — a kernel system,
// registered on the loop with addSystem so it runs inside the global tick,
// supervisor-wrapped (AD-15). All motion derives from tick state: step() is
// pure against (state, dt, deviceView); the render side only READS state.
// Numbers are spec-pinned: eye height 1.60m, walk 1.4 m/s, head bob ±0.04m;
// sensitivity/clamp/reach are the (inference) defaults from Design Notes.
// Math goes through core/contract/math (Design Notes item 8) so a scripted
// headless transcript replays bit-for-bit on any conforming engine (AD-4).

import { math } from "./contract/index.ts";
import { MS_PER_TICK } from "./loop.ts";
import type { DeviceView } from "./input/index.ts";
import type { CollisionVolume } from "./room/collision-volumes.ts";

// --- Spec-pinned numbers ---------------------------------------------------
/** Eye height, metres (UX-DR3). */
export const EYE_HEIGHT = 1.6;
/** Walk speed, m/s (spec "Always"). */
export const WALK_SPEED = 1.4;
/** Head-bob amplitude, metres (spec "Always"). */
export const BOB_AMPLITUDE = 0.04;
// --- (inference) defaults from Design Notes item 5 -------------------------
/** Mouse sensitivity, rad/px. */
export const MOUSE_SENSITIVITY = 0.0025;
/** Pitch clamp, ±85° in rad. */
export const PITCH_LIMIT = math.PI * (85 / 180);
/** Player collision circle radius, m (collision-volumes r). */
export const PLAYER_RADIUS = 0.25;
/** Center-of-view targeting reach, m. */
export const TARGET_REACH = 2.0;
/** Head-bob wavelength, m (~2Hz at walk speed). */
export const BOB_WAVELENGTH = 0.7;
/** Head-bob amplitude ease-out when stopped, seconds. */
export const BOB_SETTLE_SECONDS = 0.25;
/** Seconds per tick: step's dt unit is ticks (step(dt=1) = one tick).
 * Derived from the loop's canonical tick rate (core/loop.ts MS_PER_TICK)
 * so walk speed and bob never desync from the kernel clock. */
const SECONDS_PER_TICK = MS_PER_TICK / 1000;

export interface PlayerState {
  /** XZ plane position (collision is 2D; Y is the fixed eye line + bob). */
  x: number;
  z: number;
  /** Yaw, rad; positive turns left (three.js +Y), mouse-right decreases it. */
  yaw: number;
  /** Pitch, rad, clamped ±PITCH_LIMIT; positive looks up. */
  pitch: number;
  /** Bob phase, rad; advances with distance travelled. */
  bobPhase: number;
  /** Current bob amplitude, m; 0.04 while walking, eases to 0 when stopped. */
  bobAmp: number;
  /** Center-of-view target volume id, or null (AC4). */
  targetId: string | null;
}

export type InteractableHandler = (volumeId: string) => void;

export interface PlayerController {
  /** Live state — read-only by convention; mutate only inside step() (AD-15). */
  readonly state: PlayerState;
  /** One plain-data copy for transcripts/replay comparison. */
  snapshot(): PlayerState;
  /**
   * Advance one span of dt TICKS (dt=1 is one global tick). Called from the
   * loop's addSystem hook, supervisor-wrapped — never from render.
   * Story 2.4: the optional `bobAmplitude` is the EFFECTIVE bob amplitude
   * from the comfort settings (core/settings.ts resolver — 0 for "off"
   * preset… see the spine: preset "full" comfort means bob 0). The glue
   * passes the resolved value every tick; the default keeps 1.2's shipped
   * law byte-identical for every non-glue consumer. Settings never reach
   * sim input or stateHash (AD-16) — this is presentation of the visitor's
   * own camera, same class as FOV.
   */
  step(dt: number, view: DeviceView, bobAmplitude?: number): void;
  /** Kernel-internal interact registry (Design Notes item 7). Empty this
   * story: an E press with a target and no handler is a silent no-op. */
  registerInteractable(volumeId: string, handler: InteractableHandler): void;
  /** Set the four pose fields exactly (seat service, Story 1.5 — sit and
   * stand move the visitor between the standing pose and the cabinet play
   * pose). Bob state and target are left to step(): the seat holds a zeroed
   * view while the visitor sits, so bobPhase is frozen and bobAmp has
   * settled long before the restore (Design Notes: settle wait). */
  teleport(pose: { x: number; z: number; yaw: number; pitch: number }): void;
}

export function createPlayerController(
  volumes: readonly CollisionVolume[],
  spawn: { x: number; z: number; yaw?: number } = { x: 0, z: 3.5 },
): PlayerController {
  const state: PlayerState = {
    x: spawn.x,
    z: spawn.z,
    yaw: spawn.yaw ?? 0,
    pitch: 0,
    bobPhase: 0,
    bobAmp: 0,
    targetId: null,
  };
  const interactables = new Map<string, InteractableHandler>();

  // Horizontal facing basis for yaw (yaw=0 looks toward -Z, the three.js
  // camera default; positive yaw turns left).
  function basis(yaw: number): { fx: number; fz: number; rx: number; rz: number } {
    const s = math.sin(yaw);
    const c = math.cos(yaw);
    return { fx: -s, fz: -c, rx: c, rz: -s };
  }

  // Axis-separated circle-vs-AABB pushout, XZ plane (Design Notes item 4):
  // each blocking volume is inflated by the player radius; the center moves
  // along one axis then the other and gets clamped to the inflated face, so
  // blocked motion cancels on one axis only — strafing slides along walls.
  function resolveMove(dx: number, dz: number): void {
    const r = PLAYER_RADIUS;
    let nx = state.x + dx;
    for (const v of volumes) {
      if (!v.blocksMovement || dx === 0) continue;
      const lo = v.min.x - r;
      const hi = v.max.x + r;
      const loZ = v.min.z - r;
      const hiZ = v.max.z + r;
      if (nx > lo && nx < hi && state.z > loZ && state.z < hiZ) {
        nx = dx > 0 ? lo : hi;
      }
    }
    state.x = nx;
    let nz = state.z + dz;
    for (const v of volumes) {
      if (!v.blocksMovement || dz === 0) continue;
      const lo = v.min.z - r;
      const hi = v.max.z + r;
      const loX = v.min.x - r;
      const hiX = v.max.x + r;
      if (nz > lo && nz < hi && state.x > loX && state.x < hiX) {
        nz = dz > 0 ? lo : hi;
      }
    }
    state.z = nz;
  }

  // Center-of-view ray vs targetable AABBs (slab test, reach-limited);
  // nearest entry wins (AC4: center-of-view only, mouse click never targets).
  function updateTarget(): void {
    const { fx, fz } = basis(state.yaw);
    const cp = math.cos(state.pitch);
    const dirX = fx * cp;
    const dirY = math.sin(state.pitch);
    const dirZ = fz * cp;
    const ox = state.x;
    const oy = EYE_HEIGHT;
    const oz = state.z;
    let bestId: string | null = null;
    let bestT = Infinity;
    for (const v of volumes) {
      if (!v.targetable) continue;
      let tMin = 0;
      let tMax = TARGET_REACH;
      let hit = true;
      const slab = (o: number, d: number, lo: number, hi: number): void => {
        if (d === 0) {
          if (o < lo || o > hi) hit = false;
          return;
        }
        const inv = 1 / d;
        // Slab entry/exit must be ordered: with d < 0 the (lo-o)/inv side is
        // the far one. (Math.min/max are exact comparisons — deterministic.)
        const t1 = (lo - o) * inv;
        const t2 = (hi - o) * inv;
        const tNear = Math.min(t1, t2);
        const tFar = Math.max(t1, t2);
        if (tNear > tMin) tMin = tNear;
        if (tFar < tMax) tMax = tFar;
        if (tMax < tMin) hit = false;
      };
      slab(ox, dirX, v.min.x, v.max.x);
      slab(oy, dirY, v.min.y, v.max.y);
      slab(oz, dirZ, v.min.z, v.max.z);
      if (hit && tMin < bestT) {
        bestT = tMin;
        bestId = v.id;
      }
    }
    state.targetId = bestId;
  }

  return {
    state,
    snapshot() {
      return structuredClone(state);
    },
    step(dt, view, bobAmplitude = BOB_AMPLITUDE) {
      const dtSeconds = dt * SECONDS_PER_TICK;

      // Look first: raw px deltas -> yaw/pitch (pitch hard-clamped ±85°).
      // DW-24 (Story 2.0): wrap yaw into the canonical [-π, π) range at
      // every look step — plain arithmetic on multiples of math.PI * 2
      // (AD-4-safe: no new transcendentals), so |yaw| stays bounded and the
      // contract math "keep angles wrapped" law plus the renderer's Euler
      // can never meet a huge angle. The wrap never changes the view basis.
      state.yaw -= view.aim.dx * MOUSE_SENSITIVITY;
      const TWO_PI = math.PI * 2;
      state.yaw = state.yaw - TWO_PI * Math.floor((state.yaw + math.PI) / TWO_PI);
      state.pitch -= view.aim.dy * MOUSE_SENSITIVITY;
      if (state.pitch > PITCH_LIMIT) state.pitch = PITCH_LIMIT;
      if (state.pitch < -PITCH_LIMIT) state.pitch = -PITCH_LIMIT;

      // Move: normalize the input vector before scaling, so diagonals keep
      // the 1.4 m/s magnitude (I/O matrix "Diagonal walk").
      const b = basis(state.yaw);
      let mx = view.axes.forward * b.fx + view.axes.strafe * b.rx;
      let mz = view.axes.forward * b.fz + view.axes.strafe * b.rz;
      const len = Math.sqrt(mx * mx + mz * mz);
      let travelled = 0;
      if (len > 0) {
        mx /= len;
        mz /= len;
        const dist = WALK_SPEED * dtSeconds;
        const x0 = state.x;
        const z0 = state.z;
        resolveMove(mx * dist, mz * dist);
        // Bob rides distance ACTUALLY travelled: pinned against a blocking
        // face the distance is 0, so the bob settles instead of oscillating
        // in place (I/O matrix "Head bob": phase advances with distance).
        travelled = Math.sqrt((state.x - x0) * (state.x - x0) + (state.z - z0) * (state.z - z0));
      }

      // Head bob: phase rides distance travelled (camera Y = EYE_HEIGHT +
      // sin(phase)*amp at render); amplitude holds while walking and eases
      // to 0 within 0.25s once stopped — standing settles to 1.60m exactly.
      if (travelled > 0) {
        state.bobPhase += (travelled / BOB_WAVELENGTH) * (2 * math.PI);
        state.bobAmp = bobAmplitude;
      } else if (bobAmplitude <= 0) {
        // Review law (the comfort tier): a zero effective amplitude settles
        // INSTANTLY — the same law scaled to zero would decay by zero and
        // leave a bob-offset eye until the next walked step (mutation:
        // drop this leg, switch preset to full while standing -> red on
        // the effective-bob pin's stillness leg).
        state.bobAmp = 0;
      } else if (state.bobAmp > 0) {
        const decay = (dtSeconds / BOB_SETTLE_SECONDS) * bobAmplitude;
        state.bobAmp = state.bobAmp > decay ? state.bobAmp - decay : 0;
      }

      updateTarget();

      // E interact (AC4): edges once upstream (input layer); routed here
      // through the kernel-internal registry. No handler this story -> the
      // press changes nothing and emits no event (Design Notes item 7).
      if (view.interact.pressed && state.targetId !== null) {
        const handler = interactables.get(state.targetId);
        if (handler) handler(state.targetId);
      }
    },
    registerInteractable(volumeId, handler) {
      interactables.set(volumeId, handler);
    },
    teleport(pose) {
      state.x = pose.x;
      state.z = pose.z;
      state.yaw = pose.yaw;
      state.pitch = pose.pitch;
    },
  };
}
