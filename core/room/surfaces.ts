// Story 1.3 (AC6/AC7): injected-canvas painters for the room's paper and
// carpet surfaces. DOM-free like core/input/index.ts's injectable-source
// pattern (Rule 2: extends that sibling's pattern, no copy of the input
// service): every pixel goes onto a canvas the CALLER provides, so the whole
// layer is headless-testable and the entry's DOM append count stays one.

/** The drawing surface a painter may use — the subset of the 2D canvas API
 * these painters touch. OffscreenCanvas satisfies it in the browser; the
 * fillStyle type matches the real API's setter-union (painters only ever
 * assign plain CSS colour strings). */
export interface PaintContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
}

export interface PaintSurface {
  width: number;
  height: number;
  getContext(kind: "2d"): PaintContext | null;
}

/** The injected factory — the real one hands out OffscreenCanvases; tests
 * hand in a recorder. Painters never reach for a canvas any other way. */
export type CanvasFactory = (width: number, height: number) => PaintSurface;

function need2d(surface: PaintSurface): PaintContext {
  // An injected factory that hands back a non-surface dies here, with the
  // loud guard, not with a raw TypeError two calls later.
  const ctx =
    surface != null && typeof surface.getContext === "function" ? surface.getContext("2d") : null;
  if (ctx == null) throw new Error("paint surface has no 2d context");
  return ctx;
}

/**
 * Paint the Welcome Flyer: a Paper Card sheet carrying the verbatim control
 * line, split on " · " into lines (A5 width cannot hold it on one line at
 * cap 0.06m). `inkCss`/`paperCss` are the Card Ink / Paper Card tokens.
 * The text is drawn verbatim — the fake-canvas pin compares what lands.
 */
export function paintFlyer(
  makeCanvas: CanvasFactory,
  text: string,
  paperCss: string,
  inkCss: string,
  capMeters: number,
): PaintSurface {
  const PX_PER_M = 1000; // texture density: cap 0.06m -> 60px cap (inference)
  const canvas = makeCanvas(210, 300); // A5-proportion sheet (Design Notes 8)
  const ctx = need2d(canvas);
  ctx.fillStyle = paperCss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = inkCss;
  // Condensed era-print stack (inference; DESIGN.md names no canvas font).
  ctx.font = `600 ${Math.round(capMeters * PX_PER_M)}px "Archivo Narrow", "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  const lines = text.split(" \u00b7 ");
  const step = canvas.height / (lines.length + 1);
  lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, step * (i + 1)));
  return canvas;
}

/**
 * Paint the carpet: Carpet Base ground plus the low-contrast octagon/weave
 * motif in Carpet Pattern (DESIGN.md ASSUMPTION: motif is a low-contrast
 * octagon/weave — rendered here as alternating offset octagon rosettes).
 * Only the two token colours are ever used.
 */
export function paintCarpet(
  makeCanvas: CanvasFactory,
  baseCss: string,
  patternCss: string,
): PaintSurface {
  const canvas = makeCanvas(760, 500); // 40px/m over the 19m x 12.5m interior
  const ctx = need2d(canvas);
  ctx.fillStyle = baseCss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = patternCss;
  const cell = 80; // octagon rosette spacing (inference, low contrast)
  const oct = (cx: number, cy: number, r: number): void => {
    // The union of two offset rectangles is a corner-cut octagon — drawn
    // with rectangles only, no arcs (hard-corners-only carries into the
    // paint as it does into the geometry).
    const s = r; // half side
    const c = Math.round(r * 0.414); // corner cut (sqrt2-1)*s
    ctx.fillRect(cx - s, cy - s + c, s * 2, s * 2 - c * 2);
    ctx.fillRect(cx - s + c, cy - s, s * 2 - c * 2, s * 2);
  };
  for (let gy = cell / 2; gy < canvas.height; gy += cell) {
    for (let gx = cell / 2; gx < canvas.width; gx += cell) {
      const offset = (Math.round(gy / cell) % 2) * (cell / 2);
      oct(gx + offset, gy, 26);
    }
  }
  return canvas;
}
