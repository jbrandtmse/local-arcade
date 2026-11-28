// Story 2.4 (AC4/AC5): the device-layer settings tier. ONE module owns the
// row schema, the defaults, the `arcade.settings.v1` codec, the first-visit
// seed law, and the pure resolution law that turns stored rows into the
// scalars the consumers read (player bob, input multiplier/table, audio
// master gain + focus strength, camera FOV, cabinet tempo). Settings are
// device-layer ONLY (NFR-9/AD-16): nothing here reaches sim state, a slot
// input, or a stateHash — the scalars are presentation/aim-side, consumed
// inside Core.
//
// Persistence extends storage.ts rather than copying it (Rule 2): rows
// travel through storage.ts's exported StoragePort (the browser-edge port
// is handed in by the glue via browserStoragePort() — this module NEVER
// names the device store; the no-ui-dom single-owner scan binds that), and
// the service mirrors storage.ts's degrade idiom verbatim: read/write in
// try/catch, a session memory overlay that serves its own writes when the
// port throws, a labelled `degraded` flag — a device condition, never a
// room fault (AD-15: zero supervisor faults from any store trouble).
//
// Clock-free (AD-3): no Date, no performance, no wall-clock read anywhere
// in this file.
//
// The comfort numbers are LABELLED PLACEHOLDER constants (spec frontmatter
// deferred item 2 — "law shapes are pinned; the finals wait" for the L3
// vestibular test): every tunable has a named home here, and pins read the
// NAME, never a re-typed literal.

import type { StoragePort } from "./storage.ts";
import { BOB_AMPLITUDE } from "./player.ts";

// --- the key (AD-16: anonymous identity lives under arcade.*) --------------
export const SETTINGS_KEY = "arcade.settings.v1";

// --- row vocabulary ---------------------------------------------------------

export type ComfortPreset = "off" | "low" | "full";
export type LookSource = "mouse" | "arrows" | "drag";

/** The remap row: four movement verbs -> KeyboardEvent.code. Interact (E)
 * stays authored inside the input service this release (Design Notes item
 * 5: the mockup's disabled Rebind row + "Interact stays E this release."). */
export interface BindingRows {
  forward: string;
  back: string;
  left: string;
  right: string;
}

export interface SettingsRows {
  /** Look slider 0..100; the multiplier law is value/REFERENCE (1.0 at the
   * default — UX-DR18's shipped 1.2 sensitivity). */
  sensitivity: number;
  lookSource: LookSource;
  binding: BindingRows;
  /** Master volume percent 0..100; 100 = gain 1.0 = shipped (2.1 law). */
  masterVolume: number;
  /** Focus-mix strength 0..100; 100 = exact FOCUS_DUCK (2.2 law). */
  focusStrength: number;
  preset: ComfortPreset;
  /** Vertical field of view, degrees; 60 = today's PerspectiveCamera. */
  fov: number;
  vignette: boolean;
  calmCabinets: boolean;
}

// --- labelled tunables (deferred item 2 homes) ------------------------------

export const SENSITIVITY_DEFAULT = 50;
export const SENSITIVITY_MIN = 0;
export const SENSITIVITY_MAX = 100;
/** The aim-multiplier reference: value/REFERENCE = 1.0 at the default, so
 * the shipped MOUSE_SENSITIVITY law is byte-identical at defaults (matrix
 * "defaults equal shipped behaviour"). */
export const AIM_MULTIPLIER_REFERENCE = 50;

export const MASTER_VOLUME_DEFAULT = 100;
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 100;
/** Percent -> gain scale (100 -> 1.0 exactly). */
export const VOLUME_PERCENT_SCALE = 100;

export const FOCUS_STRENGTH_DEFAULT = 100;
export const STRENGTH_MIN = 0;
export const STRENGTH_MAX = 100;
export const STRENGTH_SCALE = 100;

export const FOV_DEFAULT = 60;
// The mockup's slider span, authored as the clamp envelope (demo value 75
// is NOT the product default — Design Notes item 6).
export const FOV_MIN = 60;
export const FOV_MAX = 110;

/** The preset ladder (UX-DR20, [ASSUMPTION] final): off keeps 1.2's
 * authored BOB_AMPLITUDE, low halves it, full zeroes the head-bob. Walk
 * speed is NOT on this ladder (Design Notes item 4). */
export const BOB_PRESET_LOW_DIVISOR = 2;

/** First-visit seed law (UX-DR20, matrix "First visit" rows): the OS
 * reduce port says true -> "full"; otherwise -> "low" (the mockup's
 * checked state). The preset is never first-visit-off. */
export const PRESET_SEED_REDUCED: ComfortPreset = "full";
export const PRESET_SEED_DEFAULT: ComfortPreset = "low";

export const LOOK_SOURCE_DEFAULT: LookSource = "mouse";
export const DEFAULT_BINDING: Readonly<BindingRows> = {
  forward: "KeyW",
  back: "KeyS",
  left: "KeyA",
  right: "KeyD",
};

/** Calm-cabinets tempo (matrix "Calm ON"): advance one phase tick per N
 * loop ticks. Off = every tick (today's law, byte-identical). */
export const TEMPO_CALM_EVERY_N = 2;

export function defaults(preset: ComfortPreset = PRESET_SEED_DEFAULT): SettingsRows {
  return {
    sensitivity: SENSITIVITY_DEFAULT,
    lookSource: LOOK_SOURCE_DEFAULT,
    binding: { ...DEFAULT_BINDING },
    masterVolume: MASTER_VOLUME_DEFAULT,
    focusStrength: FOCUS_STRENGTH_DEFAULT,
    preset,
    fov: FOV_DEFAULT,
    vignette: false,
    calmCabinets: false,
  };
}

// --- pure resolvers (Code Map: "pure resolution law") ------------------------

export function bobAmplitude(s: SettingsRows): number {
  switch (s.preset) {
    case "off":
      return BOB_AMPLITUDE;
    case "low":
      return BOB_AMPLITUDE / BOB_PRESET_LOW_DIVISOR;
    case "full":
      return 0;
  }
}

export function aimMultiplier(s: SettingsRows): number {
  return s.sensitivity / AIM_MULTIPLIER_REFERENCE;
}

/** Strength as the 0..1 factor mix.ts consumes: 100 -> 1.0, and
 * mix.focusMultiplierFor reproduces FOCUS_DUCK exactly at strength 1. */
export function focusStrength(s: SettingsRows): number {
  return s.focusStrength / STRENGTH_SCALE;
}

export function masterGain(s: SettingsRows): number {
  return s.masterVolume / VOLUME_PERCENT_SCALE;
}

export function fov(s: SettingsRows): number {
  return s.fov;
}

export function tempoEveryN(s: SettingsRows): number {
  return s.calmCabinets ? TEMPO_CALM_EVERY_N : 1;
}

export function bindingTable(s: SettingsRows): BindingRows {
  return { ...s.binding };
}

// --- codec: validate per KEY (matrix "Corrupt store") ------------------------
// Rules: unknown key -> ignored (its row keeps its default); wrong type ->
// that key's default; finite out-of-range number -> CLAMPED, not defaulted;
// the whole payload unparseable -> the caller treats it as a first visit
// (self-heal, nothing written).

function clampNum(raw: unknown, lo: number, hi: number, dflt: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return dflt;
  if (raw < lo) return lo;
  if (raw > hi) return hi;
  return raw;
}

function oneOf<T extends string>(raw: unknown, allowed: readonly T[], dflt: T): T {
  return allowed.includes(raw as T) ? (raw as T) : dflt;
}

// KeyboardEvent.code shape: a leading letter then letters/digits (KeyQ,
// ArrowLeft, Space, Digit1...). Anything else falls back per-field.
const CODE_SHAPE = /^[A-Za-z][A-Za-z0-9]*$/;

function code(raw: unknown, dflt: string): string {
  return typeof raw === "string" && CODE_SHAPE.test(raw) ? raw : dflt;
}

export const COMFORT_PRESETS: readonly ComfortPreset[] = ["off", "low", "full"];
export const LOOK_SOURCES: readonly LookSource[] = ["mouse", "arrows", "drag"];

/** Decode a stored payload into validated rows (per-key merge). `raw` is a
 * non-empty string here — the caller handles absent/empty as first visit.
 * The preset row NEVER re-seeds here: a stored payload without a valid
 * preset falls to the base default (matrix "Return visit": the port is
 * never consulted again). */
export function decodeRows(raw: string): SettingsRows | null {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null; // unparseable: the caller self-heals to a first visit
  }
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return null;
  const v = obj as Record<string, unknown>;
  const base = defaults(); // preset slot below; base preset unused when stored valid
  const storedPreset = oneOf(v.preset, COMFORT_PRESETS, PRESET_SEED_DEFAULT);
  const bindingRaw = (typeof v.binding === "object" && v.binding != null ? v.binding : {}) as Record<string, unknown>;
  return {
    sensitivity: clampNum(v.sensitivity, SENSITIVITY_MIN, SENSITIVITY_MAX, base.sensitivity),
    lookSource: oneOf(v.lookSource, LOOK_SOURCES, LOOK_SOURCE_DEFAULT),
    binding: {
      forward: code(bindingRaw.forward, DEFAULT_BINDING.forward),
      back: code(bindingRaw.back, DEFAULT_BINDING.back),
      left: code(bindingRaw.left, DEFAULT_BINDING.left),
      right: code(bindingRaw.right, DEFAULT_BINDING.right),
    },
    masterVolume: clampNum(v.masterVolume, VOLUME_MIN, VOLUME_MAX, base.masterVolume),
    focusStrength: clampNum(v.focusStrength, STRENGTH_MIN, STRENGTH_MAX, base.focusStrength),
    preset: storedPreset,
    fov: clampNum(v.fov, FOV_MIN, FOV_MAX, base.fov),
    vignette: typeof v.vignette === "boolean" ? v.vignette : base.vignette,
    calmCabinets: typeof v.calmCabinets === "boolean" ? v.calmCabinets : base.calmCabinets,
  };
}

export function encodeRows(s: SettingsRows): string {
  return JSON.stringify(s);
}

// --- the service --------------------------------------------------------------

export interface SettingsService {
  /** Live effective rows — already validated/clamped; the consumers' ONLY
   * read side (the resolvers take these). */
  rows(): SettingsRows;
  /** The one write path: validate the partial, merge, persist immediately
   * (matrix "Slider commit": values persist at once). A first-visit seed
   * becomes STORED here and only here. */
  commit(partial: Partial<SettingsRows>): void;
  /** Reset to defaults (matrix "Reset"): the stored key is cleared and the
   * effective rows are the first-visit seed again immediately — the seed
   * port is re-consulted (the visitor's OS signal still stands). */
  reset(): void;
  /** Debug view for the arcadeDebug.settings leg (field access, not a
   * whole-object deepEqual reader — the 2.2 posture). */
  state(): { rows: SettingsRows; stored: boolean; degraded: boolean };
}

export interface SettingsOptions {
  /** The device store, injected as storage.ts's port (the glue hands in
   * browserStoragePort(); tests hand in fakes; absent -> a throw-everything
   * port that degrades to the overlay, same construction as the no-
   * localStorage browser). */
  storage?: StoragePort;
  /** The OS reduced-motion port (Code Map). Consulted ONLY on a first
   * visit and on reset — never on a return visit. */
  prefersReducedMotion?: () => boolean;
}

export function createSettingsService(opts: SettingsOptions = {}): SettingsService {
  const port: StoragePort = opts.storage ?? {
    getItem: () => {
      throw new Error("settings: no storage port");
    },
    setItem: () => {
      throw new Error("settings: no storage port");
    },
  };
  const reduced = opts.prefersReducedMotion ?? (() => false);

  function seedPreset(): ComfortPreset {
    try {
      return reduced() ? PRESET_SEED_REDUCED : PRESET_SEED_DEFAULT;
    } catch {
      return PRESET_SEED_DEFAULT; // an unreadable OS signal is no OS signal
    }
  }

  // The degrade idiom, verbatim shape from storage.ts: overlay-first reads,
  // try/catch everywhere, labelled degraded flag.
  const memory = new Map<string, string>();
  let degraded = false;

  function read(): string | null {
    const mem = memory.get(SETTINGS_KEY);
    if (mem !== undefined) return mem;
    try {
      const v = port.getItem(SETTINGS_KEY);
      return v == null ? null : v;
    } catch {
      degraded = true; // device-layer condition, not a room fault (labelled)
      return null;
    }
  }

  function write(value: string): void {
    memory.set(SETTINGS_KEY, value);
    try {
      port.setItem(SETTINGS_KEY, value);
    } catch {
      degraded = true;
    }
  }

  // One port read at construction (matrix "Return visit": the seed port
  // and the store are each consulted once, not thrice). An empty stored
  // value is the cleared key (the port has no removeItem — commit() is the
  // only writer, and reset() writes this marker). A corrupt payload
  // self-heals to a first visit without writing anything.
  const initialRaw = read();
  const initialDecoded = initialRaw != null && initialRaw !== "" ? decodeRows(initialRaw) : null;
  let current: SettingsRows = initialDecoded ?? defaults(seedPreset());
  let stored = initialDecoded != null;

  return {
    rows: () => current,
    commit(partial: Partial<SettingsRows>): void {
      // Validate the PARTIAL through the same codec by merging it onto a
      // live copy — one validation path, no per-key second implementation.
      const merged = decodeRows(encodeRows({ ...current, ...partial }));
      // Review law (product default, recorded in the Auto Run Result): a
      // movement code belongs to at most ONE of the four verbs — a
      // conflicting commit is IGNORED (rows keep their current binding;
      // the panel repaints from rows(), so the cap shows the truth).
      // KeyE/Arrow codes as movement verbs are allowed: Interact stays
      // KeyE in the input service (the UI never tables it), and an arrow
      // bound to movement while lookSource is "arrows" is the visitor's
      // own double-duty choice. decodeRows stays per-key permissive — a
      // stored corrupt payload still merges to defaults.
      if (
        merged != null &&
        new Set([merged.binding.forward, merged.binding.back, merged.binding.left, merged.binding.right]).size !== 4
      ) {
        return;
      }
      current = merged ?? defaults(seedPreset()); // unmergeable cannot happen from live rows; belt: seed
      write(encodeRows(current));
      stored = true;
    },
    reset(): void {
      write("");
      current = defaults(seedPreset());
      stored = false;
    },
    state(): { rows: SettingsRows; stored: boolean; degraded: boolean } {
      return { rows: current, stored, degraded };
    },
  };
}
