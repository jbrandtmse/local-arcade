// Story 1.9 (AC4): the workbench mount law, executed headlessly against a
// fake doc recorder. The module's whole justification is that its DOM
// surface is exactly { one createElement("canvas"), one appendChild, one
// removeChild, one addEventListener } — no-ui-dom.test.ts scans the source
// for that; THIS suite pins the behaviour: remove-first so the page never
// holds two canvases at once, exactly one of each call, the verbatim mockup
// copy painted in ui-* token colours, and the Reload line wired to an
// injected reload source (device wiring — the default reaches location
// only when a click actually happens).

import test from "node:test";
import assert from "node:assert/strict";
import {
  WORKBENCH_ACTION,
  WORKBENCH_HEADING,
  WORKBENCH_PANEL_EDGE,
  WORKBENCH_PANEL_H,
  WORKBENCH_PANEL_W,
  mountWorkbench,
  paintWorkbench,
  type WorkbenchCanvas,
  type WorkbenchDoc,
} from "./workbench.ts";
import { ROOM_BLACK, UI_BORDER, UI_FOCUS, UI_SURFACE, UI_TEXT, toCss } from "./room/tokens.ts";
import type { PaintContext } from "./room/surfaces.ts";

interface FakeCanvas extends WorkbenchCanvas {
  label: string;
  listeners: { type: string; handler: () => void }[];
  texts: string[];
  textStyles: string[];
  rects: { style: string; x: number; y: number; w: number; h: number }[];
}

function fakeWorld() {
  const calls: string[] = [];
  const created: FakeCanvas[] = [];
  let n = 0;
  const doc: WorkbenchDoc = {
    body: {
      appendChild(node) {
        const c = node as FakeCanvas;
        calls.push(`append:${c.label}`);
      },
      removeChild(node) {
        const c = node as FakeCanvas;
        calls.push(`remove:${c.label}`);
      },
    },
    createElement(tag) {
      calls.push(`create:${tag}`);
      n += 1;
      const label = `canvas${n}`;
      const ctx: PaintContext = {
        fillStyle: "",
        font: "",
        textAlign: "",
        fillRect(x, y, w, h) {
          canvas.rects.push({ style: String(ctx.fillStyle), x, y, w, h });
        },
        fillText(text) {
          canvas.texts.push(text);
          canvas.textStyles.push(String(ctx.fillStyle));
        },
        measureText(text) {
          return { width: text.length * 8 };
        },
      };
      const canvas: FakeCanvas = {
        label,
        width: 0,
        height: 0,
        listeners: [],
        texts: [],
        textStyles: [],
        rects: [],
        getContext: (kind) => (kind === "2d" ? ctx : null),
        addEventListener(type, handler) {
          canvas.listeners.push({ type, handler });
        },
      };
      created.push(canvas);
      return canvas;
    },
  };
  return { doc, calls, created };
}

test("timeout-path mount: remove the 3D canvas FIRST, then exactly one canvas in — the body never holds two (AC4, matrix 'workbench mounted and 3D canvas removed')", () => {
  const w = fakeWorld();
  const live = w.doc.createElement("canvas") as FakeCanvas; // pretend it was appended earlier (the boot append)
  w.doc.body.appendChild(live);
  w.calls.length = 0;
  let reloads = 0;
  const mount = mountWorkbench({ doc: w.doc, reason: "asset-timeout", removeCanvas: live, width: 1280, height: 720, reload: () => (reloads += 1) });
  assert.deepEqual(
    w.calls,
    ["remove:canvas1", "create:canvas", "append:canvas2"],
    "remove -> create -> append, one of each: remove-first is what keeps the <=1-canvas law true at every instant",
  );
  const canvas = w.created[1]!;
  assert.equal(mount.canvas, canvas, "the mount record hands back the canvas it attached");
  assert.equal(mount.reason, "asset-timeout", "the reason rides the returned mount record for the caller (never painted as UI beyond the copy)");
  assert.deepEqual([canvas.width, canvas.height], [1280, 720], "the workbench canvas covers the viewport it replaces");
  assert.deepEqual(canvas.listeners.map((l) => l.type), ["click"], "exactly one listener — the matrix law: a click anywhere on the workbench canvas reloads (the panel IS the page); it is not a hit-test on the painted line");
  canvas.listeners[0]!.handler();
  canvas.listeners[0]!.handler();
  assert.equal(reloads, 2, "the wired reload is the injected source, fired per click (device wiring recorded, headless-pinnable)");
});

test("boot-throw path: no canvas to remove — create + append only, never a removeChild of nothing (AC4 'renderer construction throws')", () => {
  const w = fakeWorld();
  const mount = mountWorkbench({ doc: w.doc, reason: "unsupported", removeCanvas: null });
  assert.deepEqual(w.calls, ["create:canvas", "append:canvas1"], "no removeChild when there was no canvas");
  assert.equal(mount.reason, "unsupported", "the boot gate names the reason");
  assert.equal(w.created.length, 1, "exactly one createElement for the whole path");
});

test("painter copy law: the verbatim mockup strings, heading in UI Text and Reload in UI Focus, panel framed in UI Border on a room-black ground at the viewport's bottom-right (AC4/AC6)", () => {
  const w = fakeWorld();
  mountWorkbench({ doc: w.doc, reason: "r", removeCanvas: null, width: 1280, height: 720 });
  const canvas = w.created[0]!;
  assert.deepEqual(canvas.texts, [WORKBENCH_HEADING, WORKBENCH_ACTION], "the copy is exactly the mockup's, verbatim");
  assert.equal(WORKBENCH_HEADING, "The arcade didn't open.", "the heading string IS the mockup's h2 (drift pin)");
  assert.equal(WORKBENCH_ACTION, "Reload.", "the action string IS the mockup's link text (drift pin)");
  assert.deepEqual(canvas.textStyles, [toCss(UI_TEXT), toCss(UI_FOCUS)], "heading in UI Text, Reload in UI Focus — ui-* tokens, css derived");
  // Panel composition (mockup: bottom-right, 26px from the edges):
  const [ground, border, fill] = canvas.rects;
  assert.deepEqual([ground!.x, ground!.y, ground!.w, ground!.h], [0, 0, 1280, 720], "room-black ground fills the viewport");
  assert.equal(ground!.style, toCss(ROOM_BLACK), "the street's own dark, never flat screen-black");
  const px = 1280 - WORKBENCH_PANEL_W - WORKBENCH_PANEL_EDGE;
  const py = 720 - WORKBENCH_PANEL_H - WORKBENCH_PANEL_EDGE;
  assert.deepEqual([border!.x, border!.y, border!.w, border!.h], [px, py, WORKBENCH_PANEL_W, WORKBENCH_PANEL_H], "the 300px panel sits bottom-right, 26px in");
  assert.equal(border!.style, toCss(UI_BORDER), "a one-pixel UI Border frame via inset fill (canvas rects only)");
  assert.equal(fill!.style, toCss(UI_SURFACE), "panel ground is UI Surface");
  assert.deepEqual([fill!.x, fill!.y], [px + 1, py + 1], "the frame is drawn by insetting the surface by 1");
});

test("tiny viewport: the panel clamps to the edge inset — never negative panel coordinates painted offscreen (review pass 1: a viewport smaller than the panel redrew the panel partly off-canvas)", () => {
  const w = fakeWorld();
  mountWorkbench({ doc: w.doc, reason: "r", removeCanvas: null, width: 240, height: 120 });
  const canvas = w.created[0]!;
  const [ground, border, fill] = canvas.rects;
  assert.deepEqual([ground!.x, ground!.y, ground!.w, ground!.h], [0, 0, 240, 120], "the ground still fills the (small) viewport");
  assert.deepEqual([border!.x, border!.y], [WORKBENCH_PANEL_EDGE, WORKBENCH_PANEL_EDGE], "both axes clamp to the edge inset instead of going negative");
  assert.ok(border!.x >= 0 && border!.y >= 0, "no negative panel coords: the copy stays on the visible canvas");
  assert.ok(fill!.x >= 0 && fill!.y >= 0, "the inset fill rides the clamped frame");
});

test("paintWorkbench is a pure painter: same copy onto any PaintSurface, no DOM calls, fallback font stacks only (NFR-4)", () => {
  const rects: { style: string }[] = [];
  const texts: { text: string; style: string; font: string }[] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textAlign: "",
    fillRect() {
      rects.push({ style: String(ctx.fillStyle) });
    },
    fillText(text: string) {
      texts.push({ text, style: String(ctx.fillStyle), font: ctx.font });
    },
    measureText(t: string) {
      return { width: t.length * 8 };
    },
  } as unknown as PaintContext;
  const surface = { width: 960, height: 540, getContext: (kind: "2d") => (kind === "2d" ? ctx : null) };
  paintWorkbench(surface, { heading: "H", action: "A" });
  assert.deepEqual(texts.map((t) => t.text), ["H", "A"], "the painter draws exactly the copy it is handed");
  for (const t of texts) assert.ok(/sans-serif/.test(t.font) && !/@font-face|woff/i.test(t.font), "fallback stacks only — zero webfonts, zero downloads");
  const styles = rects.map((r) => r.style);
  for (const s of styles) assert.ok([toCss(ROOM_BLACK), toCss(UI_BORDER), toCss(UI_SURFACE), toCss(UI_TEXT), toCss(UI_FOCUS)].includes(s), `paint colour ${s} is a token css`);
});
