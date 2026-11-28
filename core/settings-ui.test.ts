// Story 2.4 (AC1/AC3, UX-DR14/UX-DR23): the fake-doc tier for the Settings
// panel. A recorder doc builds the whole tree, and the pins read the BUILT
// tree: the exact M1 row census {sensitivity, look-source, remap, master,
// focus-mix, preset, FOV, vignette, calm, reset} plus a NEGATIVE leg (no
// banter/subtitle/quiet-room nodes — those arrive with Epic 3); the copy is
// the mockup's strings verbatim; state is cued by role + aria-checked +
// POSITION + SHAPE + WORD, never colour alone; every control carries the
// 24px target literal and the focus ring is 2px UI_FOCUS. Colours: zero hex
// literals in the module, only toCss(UI_*) (plus ROOM_BLACK channels for the
// vignette gradient by Design Note 7). The token/scan legs live in
// core/no-ui-dom.test.ts (the narrow allowlist); this file owns behaviour.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  GROUP_COMFORT,
  GROUP_LOOK,
  GROUP_SOUND,
  HINT_CALM,
  HINT_FOCUS_MIX,
  HINT_LOOK_SOURCE,
  HINT_MASTER,
  HINT_PRESET,
  HINT_REMAP,
  HINT_SENSITIVITY,
  HINT_VIGNETTE,
  INTERACT_HINT,
  L_CALM,
  L_FOV,
  L_FOCUS_MIX,
  L_LOOK_SOURCE,
  L_MASTER,
  L_PRESET,
  L_REMAP,
  L_SENSITIVITY,
  L_VIGNETTE,
  RESET_WORD,
  SETTINGS_BACK,
  SETTINGS_FOOTNOTE,
  SETTINGS_HIT_TARGET,
  SETTINGS_ROW_IDS,
  SETTINGS_SUB,
  SETTINGS_TITLE,
  SHAPE_MARKER,
  SWITCH_OFF_WORD,
  SWITCH_ON_WORD,
  VIGNETTE_EDGE_ALPHA,
  keycapLabel,
  mountSettingsPanel,
  mountVignetteOverlay,
  setVignetteVisible,
  vignetteGradient,
} from "./settings-ui.ts";
import { createSettingsService } from "./settings.ts";
import { ROOM_BLACK, UI_ACCENT, UI_BORDER, UI_FOCUS, UI_MUTED, UI_SURFACE, toCss } from "./room/tokens.ts";

// --- the recorder doc --------------------------------------------------------
type Listener = (event?: unknown) => void;
interface FakeEl {
  tag: string;
  attrs: Map<string, string>;
  children: FakeEl[];
  listeners: Map<string, Listener[]>;
  style: Record<string, string>;
  textContent: string | null;
  value: string;
  checked: boolean;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  appendChild(node: FakeEl): void;
  removeChild(node: FakeEl): void;
  addEventListener(type: string, handler: Listener): void;
  fire(type: string, event?: unknown): void;
}

function fakeEl(tag: string): FakeEl {
  return {
    tag,
    attrs: new Map(),
    children: [],
    listeners: new Map(),
    style: {},
    textContent: null,
    value: "",
    checked: false,
    setAttribute(name, value) {
      this.attrs.set(name, value);
    },
    getAttribute(name) {
      const v = this.attrs.get(name);
      return v === undefined ? null : v;
    },
    appendChild(node) {
      this.children.push(node);
    },
    removeChild(node) {
      const i = this.children.indexOf(node);
      if (i >= 0) this.children.splice(i, 1);
    },
    addEventListener(type, handler) {
      const arr = this.listeners.get(type) ?? [];
      arr.push(handler);
      this.listeners.set(type, arr);
    },
    fire(type, event) {
      for (const h of this.listeners.get(type) ?? []) h(event);
    },
  };
}

function fakeDoc() {
  const census = new Map<string, number>();
  const appended: FakeEl[] = [];
  const removed: FakeEl[] = [];
  return {
    census,
    appended,
    removed,
    body: {
      appendChild(node: FakeEl) {
        appended.push(node);
      },
      removeChild(node: FakeEl) {
        removed.push(node);
      },
    },
    createElement(tag: string): FakeEl {
      census.set(tag, (census.get(tag) ?? 0) + 1);
      return fakeEl(tag);
    },
  };
}

type FakeDoc = ReturnType<typeof fakeDoc>;

function all(el: FakeEl): FakeEl[] {
  const out: FakeEl[] = [el];
  for (const c of el.children) out.push(...all(c));
  return out;
}

function byTag(root: FakeEl, tag: string): FakeEl[] {
  return all(root).filter((e) => e.tag === tag);
}

function byAttr(root: FakeEl, name: string, value?: string): FakeEl[] {
  return all(root).filter((e) => (value === undefined ? e.attrs.has(name) : e.attrs.get(name) === value));
}

function byId(root: FakeEl, id: string): FakeEl {
  const hits = byAttr(root, "id", id);
  assert.equal(hits.length, 1, `exactly one node with id "${id}"`);
  return hits[0]!;
}

function texts(root: FakeEl): string[] {
  return all(root)
    .map((e) => e.textContent)
    .filter((t): t is string => typeof t === "string");
}

function fakePort() {
  const store = new Map<string, string>();
  const sets: Array<[string, string]> = [];
  return {
    sets,
    port: {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
        sets.push([key, value]);
      },
    },
  };
}

function setup(opts: { reduced?: boolean; stored?: string } = {}) {
  const doc = fakeDoc();
  const { port, sets } = fakePort();
  if (opts.stored != null) port.setItem("arcade.settings.v1", opts.stored);
  let reducedCalls = 0;
  const settings = createSettingsService({
    storage: port,
    prefersReducedMotion: () => {
      reducedCalls += 1;
      return opts.reduced ?? false;
    },
  });
  const back: number[] = [];
  const rowsSeen: Array<Record<string, unknown>> = [];
  const captures: Array<(code: string | null) => void> = [];
  const panel = mountSettingsPanel({
    doc,
    settings,
    onBack: () => back.push(1),
    onRows: (r) => rowsSeen.push({ ...r }),
    captureKey: (reply) => captures.push(reply),
  });
  return { doc, settings, sets, back, rowsSeen, captures, panel, root: panel.root as FakeEl, reducedCalls: () => reducedCalls };
}

// --- the census law (AC: exactly this row set, nothing Epic-3) ---------------
test("row census: exactly the ten M1 rows, once each — and the NEGATIVE leg: no banter, subtitle, or quiet-room node anywhere", () => {
  const { root } = setup();
  const rows = byAttr(root, "data-row").map((e) => e.attrs.get("data-row")!);
  assert.deepEqual([...rows].sort(), [...SETTINGS_ROW_IDS].sort(), "exactly the census rows, once each");
  // the reset row id rides the button, per the census spec
  assert.ok(rows.includes("reset"), "the reset action is in the census");
  // groups: Look, Sound, Comfort only (the mockup's Room group is Epic 3).
  assert.deepEqual(
    byTag(root, "h2").map((e) => e.textContent),
    [GROUP_LOOK, GROUP_SOUND, GROUP_COMFORT],
    "the group headings are exactly Look, Sound, Comfort",
  );
  const bannedRows = ["banter", "banter-volume", "subtitle", "subtitles", "quiet", "quiet-room", "room"];
  for (const b of bannedRows) {
    assert.equal(byAttr(root, "data-row", b).length, 0, `no data-row="${b}"`);
    assert.equal(byAttr(root, "id", b).length, 0, `no id="${b}"`);
  }
  for (const word of ["Banter", "Subtitle", "Quiet", "subtitle", "quiet room"]) {
    assert.ok(!texts(root).some((t) => t.includes(word)), `no node names ${word} — Epic 3 rows are absent, not hidden`);
  }
});

test("copy law: the mockup's strings verbatim as built text (title, sub, back, labels, hints, footnote, switch words)", () => {
  const { root } = setup();
  const t = texts(root);
  assert.equal(byTag(root, "h1")[0]!.textContent, SETTINGS_TITLE);
  assert.equal(SETTINGS_TITLE, "Settings");
  assert.ok(t.includes(SETTINGS_SUB));
  assert.ok(SETTINGS_SUB.includes("Nothing here changes the room's state"));
  assert.ok(t.includes(SETTINGS_BACK));
  assert.equal(SETTINGS_BACK, "Back to the arcade");
  assert.ok(t.includes(SETTINGS_FOOTNOTE));
  assert.equal(SETTINGS_FOOTNOTE, "Choices persist per browser (localStorage). Nothing is sent anywhere.");
  assert.equal(SETTINGS_ROW_IDS.length, 10, "the census constant names exactly ten rows");
  for (const [label, hint] of [
    [L_SENSITIVITY, HINT_SENSITIVITY],
    [L_LOOK_SOURCE, HINT_LOOK_SOURCE],
    [L_REMAP, HINT_REMAP],
    [L_MASTER, HINT_MASTER],
    [L_FOCUS_MIX, HINT_FOCUS_MIX],
    [L_PRESET, HINT_PRESET],
    [L_FOV, ""],
    [L_VIGNETTE, HINT_VIGNETTE],
    [L_CALM, HINT_CALM],
  ] as const) {
    assert.ok(t.includes(label), `row label "${label}" is built`);
    if (hint !== "") assert.ok(t.includes(hint), `hint for "${label}" is built`);
  }
  assert.ok(t.includes(INTERACT_HINT));
  assert.ok(t.includes(RESET_WORD));
  assert.equal(RESET_WORD, "Reset to defaults");
  assert.ok(t.includes(SWITCH_ON_WORD) && t.includes(SWITCH_OFF_WORD), "ON/OFF word nodes exist for the switches");
});

// --- colour law (AC1/UX-DR14) ------------------------------------------------
test("colour home: settings-ui.ts carries ZERO hex literals; room tokens are ROOM_BLACK only; page chrome uses toCss(UI_*)", () => {
  const src = readFileSync(path.join(import.meta.dirname, "settings-ui.ts"), "utf8");
  assert.ok(!/0x[0-9a-fA-F]{2,}/.test(src), "no 0x hex literal in settings-ui.ts — tokens.ts is the hex home");
  assert.ok(!/["'`]#[0-9a-fA-F]{3,8}/.test(src), "no css hex string literal either");
  const roomTokens = [...src.matchAll(/ROOM_[A-Z_]+/g)].map((m) => m[0]);
  assert.ok(roomTokens.length > 0 && roomTokens.every((t) => t === "ROOM_BLACK"), "ROOM_BLACK is the ONLY room token named (Design Note 7: the vignette gradient is light management)");
  assert.ok(!/GLOW_[A-Z_]+/.test(src), "no glow token (ui-accent, not the room's own light, is the accent)");
  const { root } = setup();
  // chrome colours come from the trio: hints/sub/footnote ui-muted, back ui-accent,
  // panel surface ui-surface text ui-text.
  const hintNodes = all(root).filter((e) => e.textContent === HINT_SENSITIVITY);
  assert.equal(hintNodes[0]!.style.color, toCss(UI_MUTED), "hint text is ui-muted (role: hint only)");
  const backNode = byTag(root, "button").find((e) => e.textContent === SETTINGS_BACK)!;
  assert.equal(backNode.style.background, toCss(UI_ACCENT), "the Back affordance is ui-accent (glow-cyan borrow by design)");
  assert.equal(byAttr(root, "data-panel", "settings")[0]!.style.background, toCss(UI_SURFACE));
});

// --- switch law: role + aria + POSITION + SHAPE + WORD, never colour alone ---
test("switch rows: role=switch starts aria-checked=false; one click moves aria-checked, thumb POSITION (left 4->40), SHAPE (square->round), and the ON/OFF word display; the service persists", () => {
  const { root, settings, sets } = setup();
  const vignette = byId(root, "vignette");
  assert.equal(vignette.getAttribute("role"), "switch");
  assert.equal(vignette.getAttribute("aria-checked"), "false", "vignette off by default (matrix defaults row)");
  assert.equal(vignette.getAttribute("aria-label"), L_VIGNETTE);
  const thumb = vignette.children.find((c) => c.style.borderRadius === "2px")!;
  assert.equal(thumb.style.left, "4px", "OFF: thumb sits left, square");
  const onWord = vignette.children.find((c) => c.textContent === SWITCH_ON_WORD)!;
  const offWord = vignette.children.find((c) => c.textContent === SWITCH_OFF_WORD)!;
  assert.equal(onWord.style.display, "none");
  vignette.fire("click");
  assert.equal(vignette.getAttribute("aria-checked"), "true");
  assert.equal(thumb.style.left, "40px", "ON: thumb MOVED — position cue");
  assert.equal(thumb.style.borderRadius, "50%", "ON: thumb ROUND — shape cue");
  assert.equal(onWord.style.display, "block");
  assert.equal(offWord.style.display, "none");
  assert.equal(settings.rows().vignette, true, "committed through settings.ts");
  assert.equal(sets.length, 1, "one write per commit");
  const calm = byId(root, "calm");
  assert.equal(calm.getAttribute("role"), "switch");
  assert.equal(calm.getAttribute("aria-checked"), "false");
  calm.fire("click");
  assert.equal(settings.rows().calmCabinets, true);
});

// --- comfort preset: seeded + shape marker moves -----------------------------
test("preset segment: first-visit seed (reduced port true -> full) renders checked + the shape marker; a radio commit moves marker + aria-checked state on the inputs", () => {
  const { root, settings } = setup({ reduced: true });
  const radios = byAttr(root, "name", "preset");
  assert.equal(radios.length, 3, "tri-state segment");
  // Review law: paintPreset cues the pick with borderColor — borderColor is
  // INERT on the default border-style:none, so the label must carry a real
  // border for the promised shape+border cue to exist at all.
  const segLabels = all(root).filter(
    (e) => e.tag === "label" && e.children.some((c) => c.attrs.get("name") === "preset"),
  );
  assert.equal(segLabels.length, 3, "each pick is a label wrapping its radio");
  for (const lab of segLabels) {
    assert.equal(lab.style.borderStyle, "solid", "the pick label carries a REAL border (mutation: drop borderStyle in the module -> the cue is invisible, red here)");
    assert.equal(lab.style.borderWidth, "2px");
  }
  assert.equal(settings.rows().preset, "full");
  const full = radios.find((r) => r.getAttribute("value") === "full")!;
  const low = radios.find((r) => r.getAttribute("value") === "low")!;
  assert.equal(full.checked, true, "the seeded pick renders checked");
  const fullWord = all(root).find((e) => e.textContent === `${SHAPE_MARKER}Full`)!;
  assert.ok(fullWord, "the picked word carries the shape marker");
  assert.ok(
    !all(root).some((e) => e.textContent === `${SHAPE_MARKER}Off` || e.textContent === `${SHAPE_MARKER}Low`),
    "the unpicked words carry NO marker — one marker, on the pick only",
  );
  low.fire("change");
  assert.equal(settings.rows().preset, "low");
  assert.equal(low.checked, true);
  assert.equal(full.checked, false);
  assert.ok(all(root).some((e) => e.textContent === `${SHAPE_MARKER}Low`), "the marker MOVED with the pick");
  assert.ok(!all(root).some((e) => e.textContent === `${SHAPE_MARKER}Full`), "and left the old one");
});

// --- sliders: commit + readout + live apply ----------------------------------
test("sliders: value+input commits immediately (persist + onRows live-apply), the readout reformats per row, and out-of-range clamps through the codec", () => {
  const { root, settings, sets, rowsSeen } = setup();
  const master = byId(root, "master");
  const masterOut = byId(root, "master-out");
  assert.equal(masterOut.textContent, "100%", "default readout is the shipped 100 (demo 80 is mockup state, not the product default)");
  master.value = "60";
  master.fire("input");
  assert.equal(settings.rows().masterVolume, 60);
  assert.equal(masterOut.textContent, "60%");
  assert.equal(JSON.parse(sets.at(-1)![1]).masterVolume, 60, "persisted immediately — no reload, no pending state");
  assert.equal(rowsSeen.at(-1)!.masterVolume, 60, "the live-apply seam saw the new rows");
  const fovOut = byId(root, "fov-out");
  assert.equal(fovOut.textContent, "60°", "FOV readout carries the degree sign");
  const sens = byId(root, "sensitivity");
  sens.value = "500";
  sens.fire("input");
  assert.equal(settings.rows().sensitivity, 100, "out-of-range CLAMPS through settings' codec");
  assert.equal(byId(root, "sensitivity-out").textContent, "100", "the slider row prints plain, not percent");
  const focusOut = byId(root, "focusmix-out");
  assert.equal(focusOut.textContent, "100%", "focus strength default = shipped (100 -> exact FOCUS_DUCK downstream)");
});

// --- look source radios -------------------------------------------------------
test("look-source radios: mouse checked at default; a change commit lands on the rows and the checked dot fills (shape cue) while the old one thins", () => {
  const { root, settings } = setup();
  const radios = byAttr(root, "name", "looksource");
  assert.equal(radios.length, 3);
  const mouse = radios.find((r) => r.getAttribute("value") === "mouse")!;
  const arrows = radios.find((r) => r.getAttribute("value") === "arrows")!;
  assert.equal(mouse.checked, true, "mouse default (lock + silent drag, UX-DR18)");
  arrows.fire("change");
  assert.equal(settings.rows().lookSource, "arrows");
  assert.equal(arrows.checked, true);
  assert.equal(mouse.checked, false);
  assert.ok(arrows.style.border!.startsWith("5px"), "checked dot FILLS — shape cue, not colour alone");
  assert.ok(mouse.style.border!.startsWith("1px"));
  assert.ok(texts(root).some((t) => t === "Mouse-look"), "the mockup's option word is built");
});

// --- remap ---------------------------------------------------------------------
test("remap: caps print W/S/A/D/E; Rebind routes through the injected capture seam and commits the code; Interact's Rebind is present, DISABLED, and unwired", () => {
  const { root, settings, captures } = setup();
  const caps = byAttr(root, "data-bind");
  assert.equal(caps.length, 5, "four verbs + the Interact cap (shown, not tabled)");
  assert.deepEqual(caps.map((c) => c.textContent), ["W", "S", "A", "D", "E"]);
  const rebindForward = byAttr(root, "data-rebind", "forward")[0]!;
  rebindForward.fire("click");
  assert.equal(byAttr(root, "data-bind", "forward")[0]!.textContent, "…", "the cap waits while capturing");
  assert.equal(captures.length, 1, "the capture seam is injected — the module never reaches for a host global");
  captures[0]!("KeyQ");
  assert.equal(settings.rows().binding.forward, "KeyQ", "rebound through settings.ts (clamped/validated there)");
  assert.equal(byAttr(root, "data-bind", "forward")[0]!.textContent, "Q");
  // cancel path: capture replies null -> no commit, cap restored
  rebindForward.fire("click");
  const before = JSON.stringify(settings.rows().binding);
  captures[1]!(null);
  assert.equal(JSON.stringify(settings.rows().binding), before, "a cancelled capture commits nothing");
  assert.equal(byAttr(root, "data-bind", "forward")[0]!.textContent, "Q", "and repaints the standing cap");
  const interactBtn = byTag(root, "button").find((b) => b.attrs.has("disabled"))!;
  assert.equal(interactBtn.textContent, "Rebind", "the row shows the Rebind control...");
  assert.ok(!interactBtn.attrs.has("data-rebind"), "...but it is NOT tabled (no verb to rebind, mockup shape)");
  assert.equal(interactBtn.attrs.get("disabled"), "true");
  assert.equal(interactBtn.listeners.size, 0, "...and it is NEVER wired");
  assert.ok(texts(root).some((t) => t === INTERACT_HINT));
  assert.equal(keycapLabel("KeyQ"), "Q");
  assert.equal(keycapLabel("ArrowLeft"), "ArrowLeft", "non-Key codes print verbatim");
});

// --- reset ----------------------------------------------------------------------
test("reset: the key clears to the empty marker, effective rows are the first-visit seed immediately, and every control repaints", () => {
  const { root, settings, sets, rowsSeen } = setup({ reduced: true });
  // drift a few rows first
  const master = byId(root, "master");
  master.value = "20";
  master.fire("input");
  byId(root, "calm").fire("click");
  const reset = byId(root, "reset");
  reset.fire("click");
  assert.equal(sets.at(-1)![1], "", "the stored key is cleared (the port has no remove — empty marker)");
  assert.equal(settings.rows().masterVolume, 100, "effective values are the seed immediately");
  assert.equal(settings.rows().calmCabinets, false);
  assert.equal(settings.rows().preset, "full", "reset re-consults the seed port (the OS signal still stands)");
  assert.equal(master.value, "100", "the slider repainted");
  assert.deepEqual(byAttr(root, "data-bind").map((c) => c.textContent), ["W", "S", "A", "D", "E"], "reset restores W (matrix remap row)");
  assert.equal(byId(root, "calm").getAttribute("aria-checked"), "false");
  assert.ok(rowsSeen.length > 0);
});

// --- back + unmount: same-document, no navigation ------------------------------
test("Back to the arcade is a callback: it unmounts the panel from the body — no navigation primitive anywhere in the module", () => {
  const { root, doc, back, panel } = setup();
  assert.equal(doc.appended.length, 1, "exactly one body append (the panel root)");
  panel.unmount();
  assert.equal(doc.removed.length, 1);
  assert.equal(doc.removed[0], root);
  const src = readFileSync(path.join(import.meta.dirname, "settings-ui.ts"), "utf8");
  assert.ok(!src.includes("location"), "the module never names the location primitive at all (no reload, no nav)");
});

test("back button click routes to the injected onBack seam", () => {
  const { root, back } = setup();
  const backBtn = byTag(root, "button").find((b) => b.textContent === SETTINGS_BACK)!;
  backBtn.fire("click");
  assert.deepEqual(back, [1]);
});

// --- WCAG structure: hit targets + focus ring -----------------------------------
test("WCAG structure: every control carries the 24px target literal, and focus-in paints the 2px UI_FOCUS ring with offset (focus-out clears it)", () => {
  const { root } = setup();
  for (const input of byTag(root, "input").filter((i) => i.getAttribute("type") === "range")) {
    assert.equal(input.style.height, SETTINGS_HIT_TARGET, "slider target is the 24px minimum");
  }
  for (const b of byTag(root, "button")) {
    assert.equal(b.style.minHeight, SETTINGS_HIT_TARGET, "every button meets the 24px minimum");
  }
  for (const lab of byTag(root, "label")) {
    assert.equal(lab.style.minHeight, SETTINGS_HIT_TARGET, "radio/segment labels meet the minimum");
  }
  // Review law (reachability): index.html puts the canvas over the viewport
  // under `overflow: hidden` — a static-flow panel would land below the
  // fold, UNREACHABLE, on the real page. The panel is a fixed, internally
  // scrollable overlay (the vignette's own positioning idiom).
  assert.equal(root.style.position, "fixed", "the panel root is a fixed overlay, not page flow");
  assert.equal(root.style.left, "0");
  assert.equal(root.style.top, "0");
  assert.equal(root.style.maxHeight, "100vh", "the panel never grows past the viewport");
  assert.equal(root.style.overflowY, "auto", "the panel scrolls ITSELF, so every control stays reachable");
  const sens = byId(root, "sensitivity");
  root.fire("focusin", { target: sens });
  assert.equal(sens.style.outline, `2px solid ${toCss(UI_FOCUS)}`, "focus ring is 2px UI_FOCUS (9.34:1 vs ui-surface)");
  assert.equal(sens.style.outlineOffset, "2px");
  root.fire("focusout", { target: sens });
  assert.equal(sens.style.outline, "none");
});

// --- vignette overlay -------------------------------------------------------------
test("vignette: created once onto the body, pointer-events none, ZERO text/children/listeners, gradient from the ROOM_BLACK channels; the setter toggles display only", () => {
  const doc = fakeDoc();
  const overlay = mountVignetteOverlay(doc) as FakeEl;
  assert.equal(doc.appended.length, 1);
  assert.equal(overlay.getAttribute("data-overlay"), "vignette");
  assert.equal(overlay.textContent, null, "zero text — the overlay carries no information");
  assert.equal(overlay.children.length, 0, "zero interactive children (pointer-events none overlay law)");
  assert.equal(overlay.listeners.size, 0);
  assert.equal(overlay.style.pointerEvents, "none");
  assert.equal(overlay.style.display, "none", "off by default (matrix defaults row)");
  const r = (ROOM_BLACK >> 16) & 0xff;
  const g = (ROOM_BLACK >> 8) & 0xff;
  const b = ROOM_BLACK & 0xff;
  assert.ok(overlay.style.background.includes(`rgba(${r}, ${g}, ${b}, ${VIGNETTE_EDGE_ALPHA})`), "gradient built from the room-black CHANNELS, not a hex literal");
  assert.ok(overlay.style.background.startsWith("radial-gradient("));
  setVignetteVisible(overlay, true);
  assert.equal(overlay.style.display, "block");
  setVignetteVisible(overlay, false);
  assert.equal(overlay.style.display, "none");
  assert.equal(overlay.style.background, vignetteGradient(), "the painted background IS the exported vignetteGradient() law (mutation: change the gradient stop -> red here; the old self-compare was vacuous)");
});

// --- return visit renders stored state (the service owns decode; the panel paints it)
test("return visit: stored rows render verbatim into the controls (slider values, radio checks, switch aria, caps)", () => {
  const stored = JSON.stringify({
    sensitivity: 30,
    lookSource: "drag",
    binding: { forward: "KeyQ", back: "KeyS", left: "KeyA", right: "KeyD" },
    masterVolume: 45,
    focusStrength: 80,
    preset: "off",
    fov: 90,
    vignette: true,
    calmCabinets: true,
  });
  const { root, settings, reducedCalls } = setup({ stored });
  assert.equal(reducedCalls(), 0, "a return visit never consults the seed port");
  assert.equal(settings.rows().fov, 90);
  assert.equal(byId(root, "sensitivity").value, "30");
  assert.equal(byId(root, "fov-out").textContent, "90°");
  assert.ok(byAttr(root, "name", "looksource").find((r) => r.getAttribute("value") === "drag")!.checked);
  const off = byAttr(root, "name", "preset").find((r) => r.getAttribute("value") === "off")!;
  assert.equal(off.checked, true);
  assert.ok(texts(root).some((t) => t === `${SHAPE_MARKER}Off`));
  assert.equal(byId(root, "vignette").getAttribute("aria-checked"), "true");
  assert.equal(byId(root, "vignette").children.find((c) => c.style.borderRadius === "50%") !== undefined, true, "stored ON paints round+right at mount");
  assert.equal(byAttr(root, "data-bind")[0]!.textContent, "Q");
  assert.equal(byId(root, "master-out").textContent, "45%");
});
