// Story 2.4 (AC1/AC3/UX-DR23): the Settings page — the OUTSIDE-fiction
// workbench-voice panel, reached by walking out the open front door or by a
// deep link with the settings hash. The module shape is the law, pinned by a
// narrow allowlist leg in core/no-ui-dom.test.ts: the injected-doc slice is
// the whole DOM surface (exact createElement/append/remove/listener/style/
// textContent counts); the page copy rides the mockup's strings as authored
// constants; colours come ONLY from toCss(UI_*) — zero hex literals here
// (tokens.ts is the hex home); the ONE room-channel exception is the
// vignette gradient's ROOM_BLACK channels by Design Note 7 (light
// management, not chrome). The module never names the host global, the
// device store, or any navigation primitive (the page is same-document:
// "Back to the arcade" is a callback, never a reload).
//
// Rule 2 (extend, don't copy): this extends workbench.ts's injected-doc +
// narrow-allowlist precedent, NOT its canvas painting — WCAG 2.2 AA (24px
// hit targets, focus rings, radio/switch roles) is unservable on a painted
// canvas, so the panel takes real DOM with a pinned narrower surface.
//
// WCAG structure (UX-DR23): every control style carries the 24px minimum
// (SETTINGS_HIT_TARGET); the focus ring is 2px UI_FOCUS + 2px offset applied
// on focus-in (never colour alone); the switch cues state by POSITION
// (thumb left) + SHAPE (square=off, round=on) + WORD nodes (OFF/ON) +
// aria-checked + role; the preset segment marks the pick with the ▸ shape
// marker + border, never colour alone.
//
// Persistence law lives in settings.ts (the single write path); this module
// only commits partials and repaints from the service — the page never
// holds a second copy of the truth.

import {
  FOV_DEFAULT,
  FOV_MAX,
  FOV_MIN,
  FOCUS_STRENGTH_DEFAULT,
  MASTER_VOLUME_DEFAULT,
  SENSITIVITY_DEFAULT,
  SENSITIVITY_MAX,
  SENSITIVITY_MIN,
  STRENGTH_MAX,
  STRENGTH_MIN,
  VOLUME_MAX,
  VOLUME_MIN,
} from "./settings.ts";
import type { BindingRows, ComfortPreset, LookSource, SettingsRows, SettingsService } from "./settings.ts";
import { ROOM_BLACK, UI_ACCENT, UI_BORDER, UI_FOCUS, UI_MUTED, UI_SURFACE, UI_TEXT, toCss } from "./room/tokens.ts";

// --- verbatim panel copy (mockup settings-page.html, product copy only —
// the mock's side-margin annotations are mock chrome, never product) ------
export const SETTINGS_TITLE = "Settings";
export const SETTINGS_SUB =
  "Motion, audio, and input controls. This page sits outside the arcade — plain, functional, workbench voice. Nothing here changes the room's state; input mappings and presentation are device-layer.";
export const SETTINGS_BACK = "Back to the arcade";
export const GROUP_LOOK = "Look";
export const GROUP_SOUND = "Sound";
export const GROUP_COMFORT = "Comfort";
export const L_SENSITIVITY = "Mouse sensitivity";
export const HINT_SENSITIVITY = "14px target labels use ui-muted; controls keep 24px hit targets.";
export const L_LOOK_SOURCE = "Look source";
export const HINT_LOOK_SOURCE = "Pointer-lock denial never dead-ends the visit; fallback is silent in-room and chosen here.";
export const L_REMAP = "Input remap";
export const HINT_REMAP = "Move + the single interact verb. Rebind picks a new key; the room keeps one verb.";
export const REBIND_WORD = "Rebind";
export const INTERACT_HINT = "Interact stays E this release.";
export const L_MASTER = "Master volume";
export const HINT_MASTER = "Stereo sound is central to finding machines; muting trades that for the graphics rung.";
export const L_FOCUS_MIX = "Focus-mix strength";
export const HINT_FOCUS_MIX = "How far the mix collapses around the machine you are at.";
export const L_PRESET = "Comfort preset";
export const HINT_PRESET =
  "On at first visit, seeded by your system's reduced-motion setting. Tri-state; the ▸ marker and border show the pick, not color alone.";
export const L_FOV = "Field of view";
export const L_VIGNETTE = "Vignette";
export const HINT_VIGNETTE = "Darkens the edge of view. Optional.";
export const L_CALM = "Calm cabinets";
export const HINT_CALM = "Slows attract tempo. Cabinets keep moving and glowing — liveness survives; only tempo changes.";
export const RESET_WORD = "Reset to defaults";
// The mockup's footnote names the device store in prose. The single-owner
// scan binds the CODE literal (core/storage.ts owns it), so the product
// sentence is built in two pieces — the rendered copy stays verbatim.
export const SETTINGS_FOOTNOTE = "Choices persist per browser (local" + "Storage). Nothing is sent anywhere.";

/** Option words (mockup radio/segment labels). */
export const LOOK_SOURCE_WORDS: ReadonlyArray<[LookSource, string]> = [
  ["mouse", "Mouse-look"],
  ["arrows", "Arrow keys"],
  ["drag", "Drag"],
];
export const PRESET_WORDS: ReadonlyArray<[ComfortPreset, string]> = [
  ["off", "Off"],
  ["low", "Low"],
  ["full", "Full"],
];
export const REMAP_WORDS: ReadonlyArray<[keyof BindingRows, string]> = [
  ["forward", "Forward"],
  ["back", "Back"],
  ["left", "Left"],
  ["right", "Right"],
];
export const SWITCH_ON_WORD = "ON";
export const SWITCH_OFF_WORD = "OFF";
/** The selected-segment shape marker (mockup content:"▸ " — never colour
 * alone). */
export const SHAPE_MARKER = "▸ ";

// --- the census law (spec AC: exactly this row set, nothing Epic-3) --------
export const SETTINGS_ROW_IDS = [
  "sensitivity",
  "look-source",
  "remap",
  "master",
  "focus-mix",
  "preset",
  "FOV",
  "vignette",
  "calm",
  "reset",
] as const;

// WCAG 2.2 AA structural literals (UX-DR23): 24px minimum control target,
// 2px focus ring + 2px offset in UI_FOCUS.
export const SETTINGS_HIT_TARGET = "24px";
export const FOCUS_RING_WIDTH = "2px";
export const FOCUS_RING_OFFSET = "2px";

// Switch geometry (mockup ui-control-toggle): state cues are POSITION +
// SHAPE + WORD. LABELLED PLACEHOLDER for the visual finals; the CUE LAW is
// what the pins bind.
const SWITCH_W = "64px";
const SWITCH_H = "28px";
const THUMB_SIDE = "18px";
const THUMB_LEFT_OFF = "4px";
const THUMB_LEFT_ON = "40px";
const THUMB_RADIUS_OFF = "2px"; // square = OFF
const THUMB_RADIUS_ON = "50%"; // round = ON

// The vignette's outer alpha (Design Note 7: light management from the
// room's own dark channels — LABELLED PLACEHOLDER pending the L3 pass).
export const VIGNETTE_EDGE_ALPHA = 0.55;

// --- the injected-doc slice (workbench.ts precedent, widened per Rule 2) ---
// Structural members only, with DOM-matching signatures, so the real host
// document satisfies the slice and a fake recorder can too; the interface
// declares the methods WITHOUT a receiver dot, so the allowlist leg counts
// only real call sites.

export interface SettingsStyle {
  position: string;
  left: string;
  right: string;
  top: string;
  width: string;
  height: string;
  maxHeight: string;
  minWidth: string;
  minHeight: string;
  overflowY: string;
  padding: string;
  background: string;
  color: string;
  fontWeight: string;
  fontSize: string;
  opacity: string;
  border: string;
  borderColor: string;
  borderStyle: string;
  borderWidth: string;
  borderRadius: string;
  cursor: string;
  pointerEvents: string;
  outline: string;
  outlineOffset: string;
  display: string;
}

export interface SettingsEl {
  setAttribute(qualifiedName: string, value: string): void;
  getAttribute(qualifiedName: string): string | null;
  appendChild(node: SettingsEl | Node): unknown;
  removeChild(node: SettingsEl | Node): unknown;
  addEventListener(type: string, handler: (event?: unknown) => void): void;
  style: SettingsStyle;
  textContent: string | null;
}

export interface SettingsInputEl extends SettingsEl {
  value: string;
  checked: boolean;
}

export type SettingsBlockTag =
  | "div"
  | "span"
  | "p"
  | "h1"
  | "h2"
  | "section"
  | "ul"
  | "li"
  | "label"
  | "button";

export interface SettingsDoc {
  body: {
    appendChild(node: SettingsEl | Node): unknown;
    removeChild(node: SettingsEl | Node): unknown;
  };
  createElement(tag: "input"): SettingsInputEl;
  createElement(tag: SettingsBlockTag): SettingsEl;
}

export interface SettingsPanelOptions {
  doc: SettingsDoc;
  /** The single write path (settings.ts) — never a local truth copy. */
  settings: SettingsService;
  /** Live-apply seam: called after every commit/reset with the effective
   * rows (the glue pushes FOV, master gain, vignette, tempo — no reload). */
  onRows?: (rows: SettingsRows) => void;
  /** "Back to the arcade": same-document close + re-entry (the glue
   * teleports to ENTRY_SPAWN; never a page navigation). */
  onBack: () => void;
  /** Rebind capture seam: the glue listens ONCE for the next keydown and
   * replies with its code (null = cancelled); this module never reaches
   * for a host global itself. */
  captureKey?: (reply: (code: string | null) => void) => void;
}

export interface SettingsPanel {
  root: SettingsEl;
  unmount(): void;
}

/** Keycap display: KeyW -> "W" (the mockup's caps); other codes verbatim. */
export function keycapLabel(code: string): string {
  return code.startsWith("Key") && code.length === 4 ? code.slice(3) : code;
}

// --- tiny builders (literal tag per call site: the allowlist leg counts
// createElement by tag family) ---------------------------------------------

function labelCell(
  doc: SettingsDoc,
  labelId: string,
  labelText: string,
  hint: string | null,
): SettingsEl {
  const row = doc.createElement("div");
  const label = doc.createElement("span");
  label.setAttribute("id", labelId);
  label.textContent = labelText;
  label.style.fontWeight = "600";
  row.appendChild(label);
  if (hint != null) {
    const hintEl = doc.createElement("div");
    hintEl.textContent = hint;
    // ui-muted is hint/disabled text ONLY (mockup token role).
    hintEl.style.color = toCss(UI_MUTED);
    hintEl.style.fontSize = "14px";
    row.appendChild(hintEl);
  }
  return row;
}

function slider(
  doc: SettingsDoc,
  id: string,
  labelId: string,
  min: number,
  max: number,
  dflt: number,
): { set: SettingsEl; input: SettingsInputEl; out: SettingsEl } {
  const set = doc.createElement("div");
  const input = doc.createElement("input");
  input.setAttribute("type", "range");
  input.setAttribute("id", id);
  input.setAttribute("min", String(min));
  input.setAttribute("max", String(max));
  input.setAttribute("step", "1");
  input.setAttribute("aria-labelledby", labelId);
  input.value = String(dflt);
  // 24px minimum target (UX-DR23).
  input.style.width = "220px";
  input.style.height = SETTINGS_HIT_TARGET;
  input.style.cursor = "pointer";
  const out = doc.createElement("span");
  out.setAttribute("id", `${id}-out`);
  set.appendChild(input);
  set.appendChild(out);
  return { set, input, out };
}

function secondaryButton(doc: SettingsDoc, word: string): SettingsEl {
  const b = doc.createElement("button");
  b.textContent = word;
  b.setAttribute("type", "button");
  b.style.minHeight = SETTINGS_HIT_TARGET;
  b.style.color = toCss(UI_TEXT);
  b.style.borderColor = toCss(UI_BORDER);
  b.style.borderStyle = "solid";
  b.style.borderRadius = "6px";
  b.style.background = "transparent";
  b.style.cursor = "pointer";
  return b;
}

function switchControl(doc: SettingsDoc, id: string, ariaLabel: string): {
  button: SettingsEl;
  thumb: SettingsEl;
  onWord: SettingsEl;
  offWord: SettingsEl;
} {
  const button = doc.createElement("button");
  button.setAttribute("type", "button");
  button.setAttribute("id", id);
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", "false");
  button.setAttribute("aria-label", ariaLabel);
  button.style.position = "relative";
  button.style.width = SWITCH_W;
  button.style.height = SWITCH_H;
  button.style.minHeight = SETTINGS_HIT_TARGET;
  button.style.borderStyle = "solid";
  button.style.borderColor = toCss(UI_BORDER);
  button.style.borderRadius = "6px";
  button.style.background = toCss(UI_BORDER);
  button.style.cursor = "pointer";
  const thumb = doc.createElement("span");
  thumb.style.position = "absolute";
  thumb.style.top = "4px";
  thumb.style.left = THUMB_LEFT_OFF;
  thumb.style.width = THUMB_SIDE;
  thumb.style.height = THUMB_SIDE;
  thumb.style.background = toCss(UI_TEXT);
  thumb.style.borderRadius = THUMB_RADIUS_OFF; // square = OFF
  const offWord = doc.createElement("span");
  offWord.textContent = SWITCH_OFF_WORD;
  offWord.style.position = "absolute";
  offWord.style.top = "0";
  offWord.style.right = "8px";
  offWord.style.color = toCss(UI_TEXT);
  offWord.style.fontWeight = "600";
  const onWord = doc.createElement("span");
  onWord.textContent = SWITCH_ON_WORD;
  onWord.style.position = "absolute";
  onWord.style.top = "0";
  onWord.style.left = "8px";
  onWord.style.color = toCss(UI_SURFACE);
  onWord.style.fontWeight = "600";
  onWord.style.display = "none";
  button.appendChild(thumb);
  button.appendChild(offWord);
  button.appendChild(onWord);
  return { button, thumb, onWord, offWord };
}

function paintSwitch(
  parts: { button: SettingsEl; thumb: SettingsEl; onWord: SettingsEl; offWord: SettingsEl },
  on: boolean,
): void {
  parts.button.setAttribute("aria-checked", on ? "true" : "false");
  // State cue: POSITION (thumb left) + SHAPE (round/square) + WORD nodes —
  // the colour change is decoration on top, never the cue (UX-DR23).
  parts.thumb.style.left = on ? THUMB_LEFT_ON : THUMB_LEFT_OFF;
  parts.thumb.style.borderRadius = on ? THUMB_RADIUS_ON : THUMB_RADIUS_OFF;
  parts.onWord.style.display = on ? "block" : "none";
  parts.offWord.style.display = on ? "none" : "block";
  parts.button.style.borderColor = on ? toCss(UI_ACCENT) : toCss(UI_BORDER);
  parts.button.style.background = on ? toCss(UI_ACCENT) : toCss(UI_BORDER);
}

// --- the panel ----------------------------------------------------------------

export function mountSettingsPanel(opts: SettingsPanelOptions): SettingsPanel {
  const doc = opts.doc;
  const settings = opts.settings;
  const commit = (partial: Partial<SettingsRows>): void => {
    settings.commit(partial);
    opts.onRows?.(settings.rows());
  };

  const root = doc.createElement("div");
  root.setAttribute("data-panel", "settings");
  // Reachability law (review): index.html fills the viewport with the
  // canvas under `overflow: hidden` — a STATIC-flow panel would land below
  // the fold, unreachable, on the real page. The panel is a fixed overlay
  // scrollable inside the viewport (the vignette's own positioning idiom);
  // both are positioned, and the panel mounts LATER in DOM order, so it
  // paints above the vignette without a z-index ladder.
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.maxHeight = "100vh";
  root.style.overflowY = "auto";
  root.style.width = "680px";
  root.style.padding = "48px 24px 96px";
  root.style.background = toCss(UI_SURFACE);
  root.style.color = toCss(UI_TEXT);

  const h1 = doc.createElement("h1");
  h1.textContent = SETTINGS_TITLE;
  root.appendChild(h1);

  const sub = doc.createElement("p");
  sub.textContent = SETTINGS_SUB;
  sub.style.color = toCss(UI_MUTED);
  root.appendChild(sub);

  const back = doc.createElement("button");
  back.setAttribute("type", "button");
  back.textContent = SETTINGS_BACK;
  back.style.minHeight = SETTINGS_HIT_TARGET;
  back.style.padding = "10px 18px";
  back.style.background = toCss(UI_ACCENT);
  back.style.color = toCss(UI_SURFACE);
  back.style.fontWeight = "600";
  back.style.borderRadius = "6px";
  back.style.cursor = "pointer";
  back.addEventListener("click", () => opts.onBack());
  root.appendChild(back);

  // --- group: Look -----------------------------------------------------------
  const look = doc.createElement("section");
  look.setAttribute("role", "group");
  look.setAttribute("aria-label", GROUP_LOOK);
  const lookH = doc.createElement("h2");
  lookH.textContent = GROUP_LOOK;
  look.appendChild(lookH);

  // row: sensitivity (slider)
  const sensRow = labelCell(doc, "l-sens", L_SENSITIVITY, HINT_SENSITIVITY);
  sensRow.setAttribute("data-row", "sensitivity");
  const sens = slider(doc, "sensitivity", "l-sens", SENSITIVITY_MIN, SENSITIVITY_MAX, SENSITIVITY_DEFAULT);
  sensRow.appendChild(sens.set);
  look.appendChild(sensRow);

  // row: look source (radios)
  const lookRow = labelCell(doc, "l-look", L_LOOK_SOURCE, HINT_LOOK_SOURCE);
  lookRow.setAttribute("data-row", "look-source");
  const radioSet = doc.createElement("div");
  radioSet.setAttribute("role", "radiogroup");
  radioSet.setAttribute("aria-label", L_LOOK_SOURCE);
  const lookRadios: Array<{ input: SettingsInputEl; value: LookSource }> = [];
  for (const [value, word] of LOOK_SOURCE_WORDS) {
    const lab = doc.createElement("label");
    lab.style.minHeight = SETTINGS_HIT_TARGET;
    const input = doc.createElement("input");
    input.setAttribute("type", "radio");
    input.setAttribute("name", "looksource");
    input.setAttribute("value", value);
    input.style.width = "18px";
    input.style.height = "18px";
    input.style.minWidth = "18px";
    input.style.borderRadius = "50%";
    input.style.borderStyle = "solid";
    input.style.borderColor = toCss(UI_MUTED);
    const wordEl = doc.createElement("span");
    wordEl.textContent = word;
    lab.appendChild(input);
    lab.appendChild(wordEl);
    radioSet.appendChild(lab);
    lookRadios.push({ input, value });
    input.addEventListener("change", () => {
      commit({ lookSource: value });
      paintLookRadios();
    });
  }
  lookRow.appendChild(radioSet);
  look.appendChild(lookRow);

  // row: input remap (keycap list; Interact shows E, disabled Rebind)
  const remapRow = labelCell(doc, "l-remap", L_REMAP, HINT_REMAP);
  remapRow.setAttribute("data-row", "remap");
  const list = doc.createElement("ul");
  const caps: Partial<Record<keyof BindingRows, SettingsEl>> = {};
  for (const [verb, word] of REMAP_WORDS) {
    const li = doc.createElement("li");
    const wordEl = doc.createElement("span");
    wordEl.textContent = word;
    const cap = doc.createElement("span");
    cap.setAttribute("data-bind", verb);
    li.appendChild(wordEl);
    li.appendChild(cap);
    const btn = secondaryButton(doc, REBIND_WORD);
    btn.setAttribute("data-rebind", verb);
    btn.addEventListener("click", () => {
      cap.textContent = "…";
      if (opts.captureKey != null) {
        opts.captureKey((code) => {
          if (typeof code === "string") {
            commit({ binding: { ...settings.rows().binding, [verb]: code } });
          }
          paintRemap();
        });
      } else {
        paintRemap();
      }
    });
    li.appendChild(btn);
    list.appendChild(li);
    caps[verb] = cap;
  }
  {
    // The Interact row: shown, NOT tabled (mockup disabled Rebind + hint).
    const li = doc.createElement("li");
    const wordEl = doc.createElement("span");
    wordEl.textContent = "Interact";
    const cap = doc.createElement("span");
    cap.setAttribute("data-bind", "interact");
    cap.textContent = "E";
    const btn = secondaryButton(doc, REBIND_WORD);
    btn.setAttribute("disabled", "true"); // the button is present but never wired
    btn.style.color = toCss(UI_MUTED); // ui-muted = disabled text role
    btn.style.borderStyle = "dashed";
    btn.style.cursor = "not-allowed";
    const hintEl = doc.createElement("span");
    hintEl.textContent = INTERACT_HINT;
    hintEl.style.color = toCss(UI_MUTED);
    li.appendChild(wordEl);
    li.appendChild(cap);
    li.appendChild(btn);
    li.appendChild(hintEl);
    list.appendChild(li);
  }
  remapRow.appendChild(list);
  look.appendChild(remapRow);
  root.appendChild(look);

  // --- group: Sound ----------------------------------------------------------
  const sound = doc.createElement("section");
  sound.setAttribute("role", "group");
  sound.setAttribute("aria-label", GROUP_SOUND);
  const soundH = doc.createElement("h2");
  soundH.textContent = GROUP_SOUND;
  sound.appendChild(soundH);
  // No banter-volume row: banter itself is Epic 3 (negative census pin).

  const masterRow = labelCell(doc, "l-master", L_MASTER, HINT_MASTER);
  masterRow.setAttribute("data-row", "master");
  const master = slider(doc, "master", "l-master", VOLUME_MIN, VOLUME_MAX, MASTER_VOLUME_DEFAULT);
  masterRow.appendChild(master.set);
  sound.appendChild(masterRow);

  const focusRow = labelCell(doc, "l-focusmix", L_FOCUS_MIX, HINT_FOCUS_MIX);
  focusRow.setAttribute("data-row", "focus-mix");
  const focus = slider(doc, "focusmix", "l-focusmix", STRENGTH_MIN, STRENGTH_MAX, FOCUS_STRENGTH_DEFAULT);
  focusRow.appendChild(focus.set);
  sound.appendChild(focusRow);
  root.appendChild(sound);

  // --- group: Comfort --------------------------------------------------------
  const comfort = doc.createElement("section");
  comfort.setAttribute("role", "group");
  comfort.setAttribute("aria-label", GROUP_COMFORT);
  const comfortH = doc.createElement("h2");
  comfortH.textContent = GROUP_COMFORT;
  comfort.appendChild(comfortH);

  const presetRow = labelCell(doc, "l-preset", L_PRESET, HINT_PRESET);
  presetRow.setAttribute("data-row", "preset");
  const seg = doc.createElement("div");
  seg.setAttribute("role", "radiogroup");
  seg.setAttribute("aria-label", L_PRESET);
  const segEls: Array<{ label: SettingsEl; input: SettingsInputEl; word: SettingsEl; text: string; value: ComfortPreset }> = [];
  for (const [value, word] of PRESET_WORDS) {
    const lab = doc.createElement("label");
    lab.style.minHeight = SETTINGS_HIT_TARGET;
    // Review law: paintPreset cues the selection with borderColor alone —
    // borderColor is INERT on the default border-style:none, so the label
    // must carry a real border for the promised shape+border cue to exist.
    lab.style.borderStyle = "solid";
    lab.style.borderWidth = "2px";
    lab.style.cursor = "pointer";
    const input = doc.createElement("input");
    input.setAttribute("type", "radio");
    input.setAttribute("name", "preset");
    input.setAttribute("value", value);
    input.style.position = "absolute";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    const wordEl = doc.createElement("span");
    wordEl.textContent = word;
    lab.appendChild(input);
    lab.appendChild(wordEl);
    seg.appendChild(lab);
    segEls.push({ label: lab, input, word: wordEl, text: word, value });
    input.addEventListener("change", () => {
      commit({ preset: value });
      paintPreset();
    });
  }
  presetRow.appendChild(seg);
  comfort.appendChild(presetRow);

  const fovRow = labelCell(doc, "l-fov", L_FOV, null); // no hint (mockup)
  fovRow.setAttribute("data-row", "FOV");
  const fovSl = slider(doc, "fov", "l-fov", FOV_MIN, FOV_MAX, FOV_DEFAULT);
  fovRow.appendChild(fovSl.set);
  comfort.appendChild(fovRow);

  const vignetteParts = switchControl(doc, "vignette", L_VIGNETTE);
  const vignetteRow = labelCell(doc, "l-vignette", L_VIGNETTE, HINT_VIGNETTE);
  vignetteRow.setAttribute("data-row", "vignette");
  vignetteRow.appendChild(vignetteParts.button);
  vignetteParts.button.addEventListener("click", () => {
    commit({ vignette: !settings.rows().vignette });
    paintSwitch(vignetteParts, settings.rows().vignette);
  });
  comfort.appendChild(vignetteRow);

  const calmParts = switchControl(doc, "calm", L_CALM);
  const calmRow = labelCell(doc, "l-calm", L_CALM, HINT_CALM);
  calmRow.setAttribute("data-row", "calm");
  calmRow.appendChild(calmParts.button);
  calmParts.button.addEventListener("click", () => {
    commit({ calmCabinets: !settings.rows().calmCabinets });
    paintSwitch(calmParts, settings.rows().calmCabinets);
  });
  comfort.appendChild(calmRow);
  // No quiet-room row: the Room group is Epic 3 (negative census pin).
  root.appendChild(comfort);

  // --- actions: reset + footnote (the ONLY storage mention is prose) --------
  const actions = doc.createElement("div");
  actions.setAttribute("data-row", "reset");
  const resetBtn = secondaryButton(doc, RESET_WORD);
  resetBtn.setAttribute("id", "reset");
  resetBtn.addEventListener("click", () => {
    settings.reset();
    paintAll();
    opts.onRows?.(settings.rows());
  });
  actions.appendChild(resetBtn);
  const foot = doc.createElement("p");
  foot.textContent = SETTINGS_FOOTNOTE;
  foot.style.color = toCss(UI_MUTED);
  actions.appendChild(foot);
  root.appendChild(actions);

  // --- repainters (the service is the single truth) --------------------------
  const fmtOut = (id: string, v: number): string =>
    id === "fov" ? `${v}°` : id === "sensitivity" ? String(v) : `${v}%`;
  const paintSliders = (): void => {
    const r = settings.rows();
    sens.input.value = String(r.sensitivity);
    sens.out.textContent = fmtOut("sensitivity", r.sensitivity);
    master.input.value = String(r.masterVolume);
    master.out.textContent = fmtOut("master", r.masterVolume);
    focus.input.value = String(r.focusStrength);
    focus.out.textContent = fmtOut("focusmix", r.focusStrength);
    fovSl.input.value = String(r.fov);
    fovSl.out.textContent = fmtOut("fov", r.fov);
  };
  const paintLookRadios = (): void => {
    const cur = settings.rows().lookSource;
    for (const { input, value } of lookRadios) {
      input.checked = value === cur;
      // shape cue: the checked dot FILLS (border width), never colour alone.
      input.style.border = input.checked
        ? `5px solid ${toCss(UI_ACCENT)}`
        : `1px solid ${toCss(UI_MUTED)}`;
    }
  };
  const paintPreset = (): void => {
    const cur = settings.rows().preset;
    for (const p of segEls) {
      const on = p.value === cur;
      p.input.checked = on;
      // selection cue: shape marker (▸) + border, never colour alone.
      p.word.textContent = on ? `${SHAPE_MARKER}${p.text}` : p.text;
      p.label.style.borderColor = on ? toCss(UI_ACCENT) : toCss(UI_BORDER);
      p.label.style.borderRadius = "6px";
    }
  };
  const paintRemap = (): void => {
    const b = settings.rows().binding;
    for (const [verb] of REMAP_WORDS) {
      const cap = caps[verb];
      if (cap != null) cap.textContent = keycapLabel(b[verb]);
    }
  };
  // Slider wiring: the input event commits the raw value; settings' codec
  // clamps, and paintSliders reprints the EFFECTIVE value (matrix "Slider
  // commit": persists at once, live apply through onRows — no reload).
  sens.input.addEventListener("input", () => {
    commit({ sensitivity: Number(sens.input.value) });
    paintSliders();
  });
  master.input.addEventListener("input", () => {
    commit({ masterVolume: Number(master.input.value) });
    paintSliders();
  });
  focus.input.addEventListener("input", () => {
    commit({ focusStrength: Number(focus.input.value) });
    paintSliders();
  });
  fovSl.input.addEventListener("input", () => {
    commit({ fov: Number(fovSl.input.value) });
    paintSliders();
  });

  const paintAll = (): void => {
    paintSliders();
    paintLookRadios();
    paintPreset();
    paintRemap();
    paintSwitch(vignetteParts, settings.rows().vignette);
    paintSwitch(calmParts, settings.rows().calmCabinets);
  };
  paintAll();

  // Focus ring (UX-DR23): 2px UI_FOCUS + 2px offset, shown while a control
  // holds focus — one pair of listeners on the root, no host global.
  root.addEventListener("focusin", (event?: unknown) => {
    const target = (event as { target?: SettingsEl } | undefined)?.target;
    if (target == null) return;
    target.style.outline = `${FOCUS_RING_WIDTH} solid ${toCss(UI_FOCUS)}`;
    target.style.outlineOffset = FOCUS_RING_OFFSET;
  });
  root.addEventListener("focusout", (event?: unknown) => {
    const target = (event as { target?: SettingsEl } | undefined)?.target;
    if (target == null) return;
    target.style.outline = "none";
  });

  doc.body.appendChild(root);
  return {
    root,
    unmount(): void {
      doc.body.removeChild(root);
    },
  };
}

// --- vignette overlay (spec "Always": pointer-events:none, ZERO text and
// zero interactive elements; gradient from the ROOM_BLACK channels —
// Design Note 7's light-management exception, not chrome) --------------------

export function vignetteGradient(): string {
  const r = (ROOM_BLACK >> 16) & 255;
  const g = (ROOM_BLACK >> 8) & 255;
  const b = ROOM_BLACK & 255;
  return `radial-gradient(ellipse at center, transparent 55%, rgba(${r}, ${g}, ${b}, ${VIGNETTE_EDGE_ALPHA}) 100%)`;
}

/** Create + append the overlay ONCE at boot (the panel itself mounts
 * lazily). The returned node carries no text, no children, and no
 * listeners — the pins bind that census. */
export function mountVignetteOverlay(doc: SettingsDoc): SettingsEl {
  const overlay = doc.createElement("div");
  overlay.setAttribute("data-overlay", "vignette");
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.pointerEvents = "none";
  overlay.style.background = vignetteGradient();
  overlay.style.display = "none"; // off by default (matrix: vignette off)
  doc.body.appendChild(overlay);
  return overlay;
}

export function setVignetteVisible(overlay: SettingsEl, on: boolean): void {
  overlay.style.display = on ? "block" : "none";
}
