// Story 1.9 (AC4): the workbench — the sanctioned OUTSIDE-fiction state
// (AD-24). When the arcade cannot open (no WebGL2 at boot, a slow-load tab
// at init, a failed entry, a 5400-tick stall with nothing rendered), the
// page becomes this panel INSTEAD of the room — never a half-loaded room,
// never DOM markup.
//
// The module's shape IS the law (no-ui-dom.test pins it narrowly):
//   - exactly ONE createElement, and only ever a "canvas";
//   - exactly ONE body.appendChild and ONE body.removeChild, remove-first
//     so the page can never hold two canvases at once — the body's canvas
//     count stays <= 1 on every path (AC4);
//   - exactly ONE addEventListener: the matrix law is "pointerdown/click
//     on the workbench canvas" reloads — the panel IS the page, so the
//     listener sits on the canvas, not as a hit-test on the painted
//     "Reload." line; the reload source is injected (device wiring),
//     defaulting to the real one so tests can pin the wiring headlessly.
// Everything else is painter's arithmetic: the panel is painted onto that
// canvas in the surfaces.ts idiom, colours only from the ui-* tokens
// (AC6: single home at tokens.ts, css derived via toCss).

import type { PaintContext, PaintSurface } from "./room/surfaces.ts";
import { ROOM_BLACK, UI_BORDER, UI_FOCUS, UI_SURFACE, UI_TEXT, toCss } from "./room/tokens.ts";

/** Verbatim panel copy (mockup street-door-loading: h2 + reload link). */
export const WORKBENCH_HEADING = "The arcade didn't open.";
export const WORKBENCH_ACTION = "Reload.";

// Panel composition (mockup: 300px wide, bottom-right, 26px from the
// viewport edges). Inference on the vertical size: heading + action line
// at the mockup's ui-heading/ui-body type roles with the mockup's padding.
export const WORKBENCH_PANEL_W = 300;
export const WORKBENCH_PANEL_H = 92;
export const WORKBENCH_PANEL_EDGE = 26;
export const WORKBENCH_PANEL_PAD = 14;
// Fallback viewport when the caller names none (inference; the browser
// entry passes the real viewport).
export const WORKBENCH_FALLBACK_W = 960;
export const WORKBENCH_FALLBACK_H = 540;

// Era-neutral fallback stacks only (NFR-4: zero webfonts, zero downloads).
const HEADING_FONT = '600 16px system-ui, "Segoe UI", sans-serif';
const ACTION_FONT = '400 14px system-ui, "Segoe UI", sans-serif';

/** The canvas the mount attaches — a PaintSurface plus the single reload
 * listener seam. */
export interface WorkbenchCanvas extends PaintSurface {
  addEventListener(type: string, handler: () => void): void;
}

/** The slice of the host document this module touches — injected so the
 * call law (create/append/remove once each, remove-first) is testable
 * headlessly with a recorder. */
export interface WorkbenchDoc {
  body: {
    // Widened to the host Node union so the real Document satisfies this
    // structurally (its appendChild/removeChild are Node-bounded); the
    // module itself only ever hands these a WorkbenchCanvas.
    appendChild(node: WorkbenchCanvas | Node): unknown;
    removeChild(node: WorkbenchCanvas | Node): unknown;
  };
  createElement(tag: "canvas"): WorkbenchCanvas;
}

export interface WorkbenchMountOptions {
  doc?: WorkbenchDoc;
  /** Why the page left the fiction — rides the returned mount record for
   * the caller (the console line); never painted onto the panel. */
  reason: string;
  /** The 3D canvas to remove first, when one exists (the timeout/fail
   * path passes the live renderer canvas; the boot-throw path has none). */
  removeCanvas: WorkbenchCanvas | null;
  /** Viewport size for the full-bleed canvas (device glue passes the real
   * one; the paint composition is bottom-right inside it). */
  width?: number;
  height?: number;
  /** Reload source (device wiring, injected for tests). */
  reload?: () => void;
}

function need2d(surface: PaintSurface): PaintContext {
  // The surfaces.ts sibling's loud guard, re-declared because surfaces.ts
  // keeps it private: a non-surface dies here, not two calls later.
  const ctx =
    surface != null && typeof surface.getContext === "function" ? surface.getContext("2d") : null;
  if (ctx == null) throw new Error("paint surface has no 2d context");
  return ctx;
}

/**
 * Pure painter (surfaces.ts idiom): paint the workbench panel at the
 * bottom-right of `surface` — room-black ground (the street's own dark,
 * never flat screen-black), a UI Border-framed UI Surface panel, the
 * heading in UI Text, and the reload affordance in UI Focus. No DOM
 * markup, no webfonts, ui-* tokens only.
 */
export function paintWorkbench(
  surface: PaintSurface,
  copy: { heading: string; action: string },
): void {
  const ctx = need2d(surface);
  ctx.fillStyle = toCss(ROOM_BLACK);
  ctx.fillRect(0, 0, surface.width, surface.height);
  // Bottom-right per the mockup; clamped to the edge inset so a viewport
  // smaller than the panel never paints the copy at negative coords.
  const px = Math.max(WORKBENCH_PANEL_EDGE, surface.width - WORKBENCH_PANEL_W - WORKBENCH_PANEL_EDGE);
  const py = Math.max(WORKBENCH_PANEL_EDGE, surface.height - WORKBENCH_PANEL_H - WORKBENCH_PANEL_EDGE);
  // 1px frame: border fill, then the surface inset by 1 (canvas rects
  // only — no strokes, hard edges only).
  ctx.fillStyle = toCss(UI_BORDER);
  ctx.fillRect(px, py, WORKBENCH_PANEL_W, WORKBENCH_PANEL_H);
  ctx.fillStyle = toCss(UI_SURFACE);
  ctx.fillRect(px + 1, py + 1, WORKBENCH_PANEL_W - 2, WORKBENCH_PANEL_H - 2);
  ctx.textAlign = "left";
  ctx.font = HEADING_FONT;
  ctx.fillStyle = toCss(UI_TEXT);
  ctx.fillText(copy.heading, px + WORKBENCH_PANEL_PAD, py + WORKBENCH_PANEL_PAD + 16);
  ctx.font = ACTION_FONT;
  ctx.fillStyle = toCss(UI_FOCUS);
  ctx.fillText(copy.action, px + WORKBENCH_PANEL_PAD, py + WORKBENCH_PANEL_H - WORKBENCH_PANEL_PAD);
}

/**
 * Mount the workbench: remove-first, then exactly one canvas in, painted,
 * with the single Reload listener wired to `reload` (default: the real
 * one — lazily referenced so nothing host-facing runs unless a click
 * actually happens). Returns the plain mount record.
 */
export function mountWorkbench(opts: WorkbenchMountOptions): { reason: string; canvas: WorkbenchCanvas } {
  const doc: WorkbenchDoc = opts.doc ?? document;
  if (opts.removeCanvas != null) doc.body.removeChild(opts.removeCanvas);
  const canvas = doc.createElement("canvas");
  canvas.width = opts.width ?? WORKBENCH_FALLBACK_W;
  canvas.height = opts.height ?? WORKBENCH_FALLBACK_H;
  doc.body.appendChild(canvas);
  paintWorkbench(canvas, { heading: WORKBENCH_HEADING, action: WORKBENCH_ACTION });
  const reload = opts.reload ?? (() => location.reload());
  canvas.addEventListener("click", () => reload());
  return { reason: opts.reason, canvas };
}
