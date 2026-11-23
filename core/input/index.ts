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

const FORWARD_PLUS = "KeyW";
const FORWARD_MINUS = "KeyS";
const STRAFE_PLUS = "KeyD";
const STRAFE_MINUS = "KeyA";
const INTERACT_KEY = "KeyE";
const PRIMARY_BUTTON = 0;

export function createInputService(host: PointerLockHost): InputService {
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
      host.requestPointerLock();
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
      const view: DeviceView = {
        axes: {
          forward: (keys.has(FORWARD_PLUS) ? 1 : 0) - (keys.has(FORWARD_MINUS) ? 1 : 0),
          strafe: (keys.has(STRAFE_PLUS) ? 1 : 0) - (keys.has(STRAFE_MINUS) ? 1 : 0),
        },
        aim: { dx: aimDx, dy: aimDy },
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
