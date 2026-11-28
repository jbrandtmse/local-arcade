// Core device-capture service (AD-7): the kernel owns ALL physical-device
// capture — keyboard, pointer-lock look, mouse-drag fallback — and maps it
// onto the AD-7 slot grammar per tick: axis level ∈ [-1,1], button
// {down, pressed}, aim {dx, dy} raw-px deltas. The per-tick device view is
// the replay currency (AD-26): deltas are consumed exactly once per tick,
// and the drag-look fallback writes the SAME {dx, dy} channel, so the
// recorded view is shape-identical whether or not pointer lock was granted.
// Pointer-lock denial falls back silently — no UI, no style change, nothing
// text-bearing anywhere (UX-DR18, AD-24, NFR-8).
//
// Browser glue stays thin and lives in core/main.ts: this module touches no
// DOM APIs at all — no document/window access, only the injected
// PointerLockHost seam the glue drives. That keeps the whole device layer
// headless-testable and the replay transcript device-agnostic (AD-26).
//
// Story 2.4 (device-layer settings): the service takes an optional tuning
// slice — a binding table (four movement verbs, Interact stays KeyE), a
// look-source mode ("mouse" = lock + silent drag fallback per UX-DR18,
// "drag" = drag-look without a lock request, "arrows" = arrow keys write
// the SAME aim channel with no pointer-lock request), and an aim
// multiplier (the sensitivity slider's value/50, applied ONCE per tick in
// takeView). The defaults — default table, "mouse", 1.0 — keep every 1.2
// pin byte-identical; the getters make panel commits land on the NEXT
// takeView without rebuilding the service (listeners are bound once in
// the glue). AD-7/AD-16: this stays device-side — the tuned view is still
// the replay currency, and settings never fork a seeded run.

export interface DeviceAxes {
  /** W/S level ∈ {-1,0,1} (⊂ AD-7 axis [-1,1]). */
  forward: number;
  /** D/A level ∈ {-1,0,1}. */
  strafe: number;
}

export interface DeviceAim {
  /** Raw pixel deltas accumulated since the previous tick view. */
  dx: number;
  dy: number;
}

export interface DeviceButton {
  /** Current level. */
  down: boolean;
  /** Rising edge: true on exactly one tick view per physical press. */
  pressed: boolean;
}

/** The per-tick device view the kernel systems consume (AD-7/AD-26). */
export interface DeviceView {
  axes: DeviceAxes;
  aim: DeviceAim;
  interact: DeviceButton;
}

/** The one thing the service needs from the browser glue: (re)arm pointer
 * lock on a canvas click. Nothing else — capture flows the other way. */
export interface PointerLockHost {
  requestPointerLock(): void;
}

export interface InputService {
  /** Physical key event by KeyboardEvent.code; `down` = keydown/keyup. */
  key(code: string, down: boolean): void;
  /** Raw mouse-move deltas (movementX/movementY); feeds aim only when
   * pointer lock is held or the primary button is dragging. */
  mouseMove(dx: number, dy: number): void;
  mouseDown(button: number): void;
  mouseUp(button: number): void;
  /** Canvas click: its ONLY effect is (re)requesting pointer lock. A click
   * never targets or interacts (UX-DR18, AC4). */
  canvasClick(): void;
  /** pointerlockchange: locked = the canvas holds the lock (glue compares
   * the lock element against the canvas — the service stays DOM-free). */
  pointerLockChanged(locked: boolean): void;
  /** visibilitychange: clears the device buffer so a backgrounded-tab
   * resume never bursts look or walking into the next ticks. */
  visibilityChanged(): void;
  /** Pull this tick's device view; aim deltas land once, then reset. */
  takeView(): DeviceView;
  /** Story 1.5 (seat service): per-code raw levels + press edges for ALL
   * codes — the seat system maps these onto the game's declared slots each
   * tick. Consumed exactly once per tick, same replay law as takeView. */
  takeCodeView(): CodeView;
  readonly pointerLocked: boolean;
}

/** Raw-key view for the seat's per-tick slot mapping (AD-7: device capture
 * stays Core-side; the game never sees codes). levels lists held codes only;
 * edges mark fresh keydowns since the last take. */
export interface CodeView {
  levels: Record<string, boolean>;
  edges: Record<string, boolean>;
}

import { DEFAULT_BINDING, type BindingRows, type LookSource } from "../settings.ts";

/** Story 2.4: the former hardcoded movement codes, now the DEFAULT table's
 * entries (Code Map: "hardcoded codes become the default table entries").
 * Review law (single source of truth): the value home is core/settings.ts's
 * DEFAULT_BINDING — this export DERIVES from it (a copy could drift, and a
 * consumer mutating this table would silently retune every untuned
 * service). The spread hands out a fresh per-reference copy. */
export const DEFAULT_BINDING_TABLE: BindingRows = { ...DEFAULT_BINDING };

/** Interact is NOT on the table this release (Design Notes item 5: the
 * mockup's disabled Rebind row + "Interact stays E this release."). */
const INTERACT_KEY = "KeyE";
const PRIMARY_BUTTON = 0;

/** Arrow-key look producer (matrix "Look-source arrows"): a HELD arrow
 * writes this many equivalent pixels into the SAME {dx,dy} aim channel
 * per takeView — one channel, three producers (Code Map). LABELLED
 * PLACEHOLDER ([ASSUMPTION] arrow-look rate, spec frontmatter deferred
 * item 2): the law shape is pinned, the rate waits for the L3 pass.
 * Signs follow the mouse convention: yaw decreases with +dx (ArrowRight
 * turns right), pitch decreases with +dy (ArrowUp looks up). */
export const ARROW_LOOK_PX_PER_TICK = 6;
const ARROW_DX: readonly [code: string, dir: number][] = [
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
];
const ARROW_DY: readonly [code: string, dir: number][] = [
  ["ArrowUp", -1],
  ["ArrowDown", 1],
];

/** Story 2.4 tuning slice: live getters (the glue closes over
 * core/settings.ts), so a slider/radio/commit lands on the next takeView
 * with no rebuild. Absent getters = the shipped defaults. */
export interface InputTuning {
  bindingTable?: () => BindingRows;
  lookSource?: () => LookSource;
  aimMultiplier?: () => number;
  /** Review law (the settings page owns the keyboard while it is up):
   * when this getter is false the LOOK channel is gated — held arrows stop
   * producing and accumulated aim is consumed but not emitted. MOVEMENT
   * stays live (crossing back is also the walk-in law, AC7). Absent =
   * always enabled. */
  lookEnabled?: () => boolean;
}

export function createInputService(host: PointerLockHost, tuning: InputTuning = {}): InputService {
  const table = tuning.bindingTable ?? (() => DEFAULT_BINDING_TABLE);
  const lookSource = tuning.lookSource ?? (() => "mouse" as LookSource);
  const aimMultiplier = tuning.aimMultiplier ?? (() => 1);
  const lookEnabled = tuning.lookEnabled ?? (() => true);
  const keys = new Set<string>();
  let locked = false;
  let dragging = false;
  let aimDx = 0;
  let aimDy = 0;
  let interactDown = false;
  // Press edge latches on keydown so a press that starts and ends between
  // two takeView() calls still edges exactly once (replay-safe).
  let interactEdge = false;
  // Raw-code press edges for the seat's per-tick slot mapping — same latch
  // law as interactEdge: a fresh keydown edges once even between takes.
  const codeEdges = new Map<string, boolean>();

  return {
    key(code, down) {
      if (down) {
        // An auto-repeat keydown of an already-held code changes nothing:
        // the level is set and the press edge belongs to the fresh keydown
        // only (AC4 once-per-press).
        if (keys.has(code)) return;
        keys.add(code);
        codeEdges.set(code, true);
      } else keys.delete(code);
      if (code === INTERACT_KEY) {
        interactDown = down;
        if (down) interactEdge = true;
      }
    },
    mouseMove(dx, dy) {
      if (locked || dragging) {
        aimDx += dx;
        aimDy += dy;
      }
    },
    mouseDown(button) {
      if (button === PRIMARY_BUTTON) dragging = true;
    },
    mouseUp(button) {
      if (button === PRIMARY_BUTTON) dragging = false;
    },
    canvasClick() {
      // Silent lock (re)arm — no prompt, no message, no style change.
      // Story 2.4: only the "mouse" source asks for the lock; "drag" and
      // "arrows" never request it (matrix "Look-source arrows": no
      // pointer-lock request — the gate below still serves drag-look).
      if (lookSource() === "mouse") host.requestPointerLock();
    },
    pointerLockChanged(next) {
      locked = next;
      // Losing lock (Esc, tab policy) ends any drag state; the next click
      // re-arms lock silently.
      if (!next) dragging = false;
    },
    visibilityChanged() {
      // Hidden->visible or visible->hidden: drop the whole device buffer.
      // Keys would otherwise stick (no keyup arrives while hidden) and the
      // aim delta would teleport the look on resume (I/O matrix row 3).
      keys.clear();
      dragging = false;
      aimDx = 0;
      aimDy = 0;
      interactDown = false;
      interactEdge = false;
      codeEdges.clear();
    },
    takeView() {
      // Review law: while the settings page is up (lookEnabled false) the
      // LOOK channel is gated — arrow production stops and accumulated
      // aim is consumed but NOT emitted, so radiogroup arrow navigation and
      // stray drags never turn the camera behind the page. The deltas are
      // still cleared below (nothing carries into the next view), and
      // movement axes are untouched — crossing back closes the panel.
      const lookOn = lookEnabled();
      // Story 2.4 arrow producer: held arrows write the SAME channel the
      // mouse and drag producers accumulate into — the per-tick view
      // stays shape-identical (replay currency, AD-26).
      if (lookOn && lookSource() === "arrows") {
        for (const [code, dir] of ARROW_DX) if (keys.has(code)) aimDx += dir * ARROW_LOOK_PX_PER_TICK;
        for (const [code, dir] of ARROW_DY) if (keys.has(code)) aimDy += dir * ARROW_LOOK_PX_PER_TICK;
      }
      // Story 2.4: the sensitivity multiplier lands ONCE per tick view, on
      // the consumed channel (1.0 at the default row keeps every 1.2 pin
      // byte-identical).
      const m = aimMultiplier();
      const t = table();
      const view: DeviceView = {
        axes: {
          forward: (keys.has(t.forward) ? 1 : 0) - (keys.has(t.back) ? 1 : 0),
          strafe: (keys.has(t.right) ? 1 : 0) - (keys.has(t.left) ? 1 : 0),
        },
        aim: { dx: lookOn ? aimDx * m : 0, dy: lookOn ? aimDy * m : 0 },
        interact: { down: interactDown, pressed: interactEdge },
      };
      aimDx = 0;
      aimDy = 0;
      interactEdge = false;
      return view;
    },
    takeCodeView() {
      const levels: Record<string, boolean> = {};
      for (const code of keys) levels[code] = true;
      const edges: Record<string, boolean> = {};
      for (const code of codeEdges.keys()) {
        edges[code] = true;
        codeEdges.delete(code);
      }
      return { levels, edges };
    },
    get pointerLocked() {
      return locked;
    },
  };
}
