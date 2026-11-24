// Story 1.5 (AC2/AC4/AC5) extended by Story 1.6: the seat service — the
// kernel half of "walk up, sit down, play in place". It owns the E-law
// cycle for game-wired cabinets (standing + closed coin door -> open;
// standing + open -> sit down, which teleports the visitor to the
// cabinet's authored play pose and hands the instance a kernel seed
// through instance.play(seed); seated -> stand up, restoring the saved
// standing pose, closing the door, and returning the machine to attract
// with the visitor still seated). Raw device codes reach the game ONLY
// through this module's per-tick mapping onto the registry entry's
// declared control slots (AD-7/AD-16); the game never sees codes.
//
// Story 1.6 made the seat arbitration-aware (busy is the placement's flag,
// read through the injected busy gate — never a hand-typed id): at a BUSY
// cabinet the second E joins the scheduler's queue (pose untouched, the
// Patron keeps playing), a third E un-waits, and the scheduler hands the
// chair over at a canonical break through takeOver() (the sit law below,
// reused). The seat also stops being the loop's event drainer: the patrons
// system drains once per tick (AD-23 phase order) and forwards the records
// into step(codes, records); the sink and the rolling debug window still
// live here, and the gameEnded->attract flip stays seat-side for tracked
// NOT-busy cabinets only — busy cabinets' flip belongs to the scheduler
// (chair law). The Enter edge still restarts a seated visitor at attract
// with a fresh seed (no auto-eject; the chair is yours until you press E).
//
// Seated law (Design Notes): the visitor's own view is zeroed — look and
// walk are dead while seated, E still routes (targeting keeps resolving
// the cabinet from the play pose, which is what makes the stand press work).
// The play pose stands PLAY_STANDOFF_M in front of the body front plane,
// facing the room normal, pitched down at the screen centre — a room-data
// computation, coord-free like the rest of the cabinet layer.

import { math, type GameControls, type GameInstance, type TickInput } from "./contract/index.ts";
import type { CodeView, DeviceView } from "./input/index.ts";
import { EYE_HEIGHT, type PlayerController } from "./player.ts";
import {
  SHELL,
  coinDoorOpen,
  placementByVolumeId,
  placementGeometry,
  toggleCoinDoor,
  type CabinetRuntime,
} from "./room/cabinets.ts";
import type { EventRecord } from "./loop.ts";

/** How far in front of the body front plane the seated visitor stands,
 * metres (inference — Design Notes item 2: 0.80m puts the eyes on the
 * screen centre at the authored 0.52m face; smoke-tuned). */
export const PLAY_STANDOFF_M = 0.8;

/** Rolling event window the debug handle exposes (plain records; the seat
 * drains every tick, so this stays bounded — arcadeDebug.seat reads it). */
export const SEAT_EVENT_WINDOW = 32;

/** Authored legend mapping: physical KeyboardEvent.code -> declared slot.
 * Lives kernel-side (device routing is Core's, AD-7); the game declares
 * only its slot vocabulary. */
export interface SeatKeyMap {
  axes: Record<string, { minus?: readonly string[]; plus?: readonly string[] }>;
  buttons: Record<string, readonly string[]>;
}

export interface SeatTrackEntry {
  /** Cabinet the E-law binds to (collision-volume id + interact key). */
  volumeId: string;
  /** Registry game id wired to the placement (room-data link, Story 1.5). */
  gameId: string;
  instance: GameInstance;
  /** The very TickInput object the loop hands to instance.tick — the seat
   * writes the per-tick mapped controls into it (kernel-owned input). */
  input: TickInput;
  /** Declared slots from the registry entry; mapping writes exactly these. */
  controls: GameControls;
  keys: SeatKeyMap;
}

/** The scheduler legs the seat is allowed to see (Story 1.6): whether a
 * volume is a tracked busy cabinet, and the wait/un-wait toggle. main.ts
 * wires them as deferred closures over the scheduler. */
export interface BusyGate {
  busyFor(volumeId: string): boolean;
  toggleWait(volumeId: string): void;
}

/** Plain-data debug view (the arcadeDebug.seat record). */
export interface SeatState {
  seated: boolean;
  volumeId: string | null;
  gameId: string | null;
  /** The drained events the seat has forwarded recently (AD-6 record:
   * gameId, tick, plain event — the M0 channel made visible). */
  events: EventRecord[];
}

export interface SeatService {
  /** One tracked game cabinet (this epic: B0/moon-patrol only). */
  track(entry: SeatTrackEntry): void;
  /** The E press routed by the player controller for a tracked volume. */
  handleInteract(volumeId: string): void;
  /** What the player system sees: seated -> zeroed axes/aim, interact kept
   * (E must still route, and targeting still resolves from the play pose). */
  playerView(view: DeviceView): DeviceView;
  /** The seat kernel system: consume the records the patrons system drained
   * this tick (window + sink + the not-busy gameEnded flip), then map this
   * tick's raw codes onto the seated game's declared slots. */
  step(codes: CodeView, records: readonly EventRecord[]): void;
  /** Scheduler handover (Story 1.6): sit the standing Visitor down at this
   * cabinet at a canonical break — the sit law (save pose, play-pose
   * teleport, kernel-fresh play). False when a chair is already taken. */
  takeOver(volumeId: string): boolean;
  /** Scheduler observation: is the chair at this volume occupied? */
  seatedAt(volumeId: string): boolean;
  state(): SeatState;
  /** Presentation sink the browser glue installs (Story 1.5 main.ts). */
  setEventSink(sink: (rec: EventRecord) => void): void;
}

/** Kernel-fresh play seed (Design Notes: the KERNEL picks the seed, the
 * sim never does; Math.random here is legal — lint-bans binds sim paths,
 * and this is device-side freshness, not sim determinism). Tests inject. */
export function kernelSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

/** The authored play pose for one tracked volume, from room data alone:
 * PLAY_STANDOFF_M in front of the front plane along the facing, yaw to
 * look back at the cabinet (player basis fx=-sin(yaw), fz=-cos(yaw) with
 * the desired direction -facing -> yaw = atan2(facing.x, facing.z)), and
 * pitch down from the eye line to the screen-face centre. */
export function playPoseFor(volumeId: string): { x: number; z: number; yaw: number; pitch: number } {
  const placement = placementByVolumeId(volumeId);
  const g = placementGeometry(placement.slotId);
  return {
    x: g.front.x + g.facing.x * PLAY_STANDOFF_M,
    z: g.front.z + g.facing.z * PLAY_STANDOFF_M,
    yaw: math.atan2(g.facing.x, g.facing.z),
    pitch: math.atan2(SHELL.screen.centerY - EYE_HEIGHT, PLAY_STANDOFF_M),
  };
}

export function createSeatService(opts: {
  player: PlayerController;
  cabinets: CabinetRuntime;
  /** Story 1.6: the scheduler's busy gate (absent = a 1.5 rig: every
   * tracked cabinet is seat-side, every law unchanged). */
  busy?: BusyGate;
  /** Story 1.7 (AC5): the containment predicate — the gameId's sim is
   * quarantined. Absent keeps every 1.5/1.6 law byte-unchanged (the
   * BusyGate deferred-closure injection idiom). Laws it changes: E at a
   * faulted cabinet falls back to the plain coin-door toggle (never sits,
   * never waits), and a seated Visitor is released by the stand law the
   * same tick the fault lands — the fault is that machine's last break. */
  faultedFor?: (gameId: string) => boolean;
  seedFn?: () => number;
}): SeatService {
  const seedFn = opts.seedFn ?? kernelSeed;
  const tracked: SeatTrackEntry[] = [];
  let seatedVolumeId: string | null = null;
  let savedPose: { x: number; z: number; yaw: number; pitch: number } | null = null;
  let sink: ((rec: EventRecord) => void) | null = null;
  const recent: EventRecord[] = [];

  function entryFor(volumeId: string): SeatTrackEntry {
    const e = tracked.find((t) => t.volumeId === volumeId);
    if (e == null) throw new Error(`seat: cabinet "${volumeId}" is not tracked (register game cabinets through track)`);
    return e;
  }

  function standUp(entry: SeatTrackEntry): void {
    // Design Notes settle wait: a scripted sit follows the walk with idle
    // ticks, so bobAmp has eased to 0 before the sit; the restore is exact
    // on the four pose fields the teleport owns.
    if (savedPose != null) opts.player.teleport(savedPose);
    savedPose = null;
    seatedVolumeId = null;
    if (coinDoorOpen(opts.cabinets, entry.volumeId)) toggleCoinDoor(opts.cabinets, entry.volumeId);
    entry.instance.attract();
    // The kernel-owned TickInput object the loop hands the sim EVERY tick
    // must not keep the last seated mapping once the chair is empty: the
    // contract delivers input to every tick, and an authored attract branch
    // that reads controls would inherit phantom input from the stand frame.
    // Neutralize the declared slots — the E-law restores state, not just
    // the pose (AC4).
    const axes: Record<string, number> = {};
    for (const slot of entry.controls.axes) axes[slot] = 0;
    const buttons: Record<string, { down: boolean; pressed: boolean }> = {};
    for (const slot of entry.controls.buttons) buttons[slot] = { down: false, pressed: false };
    entry.input.controls = { axes, buttons };
  }

  // The sit law (Story 1.5), shared by the direct E-sit of a not-busy
  // cabinet and the scheduler's break-time handover (Story 1.6): save the
  // standing pose, move to the play pose, hand the seed over through the
  // wrapper (AD-23: the kernel resolves the seed).
  function sitDown(entry: SeatTrackEntry): void {
    const p = opts.player.state;
    savedPose = { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch };
    opts.player.teleport(playPoseFor(entry.volumeId));
    seatedVolumeId = entry.volumeId;
    entry.instance.play(seedFn());
  }

  return {
    track(entry) {
      if (tracked.some((t) => t.volumeId === entry.volumeId || t.gameId === entry.gameId)) {
        throw new Error(`seat: cabinet "${entry.volumeId}" / game "${entry.gameId}" already tracked`);
      }
      tracked.push(entry);
    },
    handleInteract(volumeId) {
      const entry = entryFor(volumeId);
      if (seatedVolumeId === volumeId) {
        standUp(entry);
        return;
      }
      if (seatedVolumeId !== null) return; // one visitor: a second cabinet's E is silent while seated
      if (opts.faultedFor?.(entry.gameId) === true) {
        // Story 1.7 (AC5): a faulted Cabinet performs by its fallback face,
        // and E falls back to the plain 1.4 coin-door law — never a sit,
        // never a wait (the scheduler's queue law below would be moot: the
        // faulted game emits no breaks to hand over on).
        toggleCoinDoor(opts.cabinets, volumeId);
        return;
      }
      if (!coinDoorOpen(opts.cabinets, volumeId)) {
        toggleCoinDoor(opts.cabinets, volumeId); // 1.4 law intact: the first press opens
        return;
      }
      if (opts.busy?.busyFor(volumeId) === true) {
        // Story 1.6: at a busy cabinet the second E WAITS (joins the
        // scheduler's queue — pose untouched, the Patron keeps playing),
        // and a third E un-waits. Sitting happens only through the
        // scheduler's break-time handover.
        opts.busy.toggleWait(volumeId);
        return;
      }
      sitDown(entry);
    },
    playerView(view) {
      if (seatedVolumeId === null) return view;
      return {
        axes: { forward: 0, strafe: 0 },
        aim: { dx: 0, dy: 0 },
        interact: view.interact, // E still routes from the chair (AC4)
      };
    },
    takeOver(volumeId) {
      const entry = entryFor(volumeId);
      if (seatedVolumeId !== null) return false; // one visitor; the chair is taken
      sitDown(entry);
      return true;
    },
    seatedAt(volumeId) {
      return seatedVolumeId === volumeId;
    },
    step(codes, records) {
      for (const rec of records) {
        recent.push(rec);
        if (recent.length > SEAT_EVENT_WINDOW) recent.shift();
        if (sink != null) sink(rec);
        const entry = tracked.find((t) => t.gameId === rec.gameId);
        // Canonical game over on a tracked NOT-busy cabinet (1.5 law): the
        // machine returns to attract in place — the visitor stays seated,
        // and Enter (below) restarts. A busy cabinet's flip is owned by
        // the scheduler (Story 1.6); this leg must not double-flip.
        if (entry != null && rec.event.type === "gameEnded" && opts.busy?.busyFor(entry.volumeId) !== true) {
          entry.instance.attract();
        }
      }
      // Story 1.7 (AC5, Design Notes 3): a faulted sim emits no canonical
      // break, so the fault IS that machine's last break — the release
      // lands in this same tick's routing phase (systems run after the
      // instance phase, fixed order). The stand law already skips nothing:
      // saved pose, door close, input neutralization; the guarded faulted
      // instance's attract() is a safe no-op.
      if (seatedVolumeId !== null) {
        const entry = entryFor(seatedVolumeId);
        if (opts.faultedFor?.(entry.gameId) === true) {
          standUp(entry);
          return;
        }
      }
      if (seatedVolumeId === null) return;
      const entry = entryFor(seatedVolumeId);
      // Enter at attract restarts a seated visitor on a fresh kernel seed.
      const startCodes = entry.keys.buttons["start"] ?? [];
      if (entry.instance.mode() === "attract" && startCodes.some((c) => codes.edges[c] === true)) {
        entry.instance.play(seedFn());
      }
      const axes: Record<string, number> = {};
      for (const slot of entry.controls.axes) {
        const spec = entry.keys.axes[slot] ?? {};
        const plus = (spec.plus ?? []).some((c) => codes.levels[c] === true);
        const minus = (spec.minus ?? []).some((c) => codes.levels[c] === true);
        axes[slot] = (plus ? 1 : 0) - (minus ? 1 : 0);
      }
      const buttons: Record<string, { down: boolean; pressed: boolean }> = {};
      for (const slot of entry.controls.buttons) {
        const list = entry.keys.buttons[slot] ?? [];
        buttons[slot] = {
          down: list.some((c) => codes.levels[c] === true),
          pressed: list.some((c) => codes.edges[c] === true),
        };
      }
      entry.input.controls = { axes, buttons };
    },
    state() {
      const entry = seatedVolumeId != null ? tracked.find((t) => t.volumeId === seatedVolumeId) : undefined;
      return {
        seated: seatedVolumeId !== null,
        volumeId: seatedVolumeId,
        gameId: entry != null ? entry.gameId : null,
        events: recent.slice(),
      };
    },
    setEventSink(fn) {
      sink = fn;
    },
  };
}
