// Story 1.3 (AC6/AC7): injected-canvas painters for the room's paper and
// carpet surfaces. DOM-free like core/input/index.ts's injectable-source
// pattern (Rule 2: extends that sibling's pattern, no copy of the input
// service): every pixel goes onto a canvas the CALLER provides, so the whole
// layer is headless-testable and the entry's DOM append count stays one.

/** The drawing surface a painter may use - the subset of the 2D canvas API
 * these painters touch. OffscreenCanvas satisfies it in the browser; the
 * fillStyle type matches the real API's setter-union (painters only ever
 * assign plain CSS colour strings). measureText is the flyer painter's
 * fit-law leg (rework pass 1): the painter only lays out what it measures. */
export interface PaintContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
}

export interface PaintSurface {
  width: number;
  height: number;
  getContext(kind: "2d"): PaintContext | null;
}

/** The injected factory - the real one hands out OffscreenCanvases; tests
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

/** Flyer texture density (px per metre of sheet): cap 0.06m -> 60px, and
 * the canvas side in px is the sheet metre side times this (inference).
 * Exported so the pins derive from the same constant the painter uses. */
export const FLYER_PX_PER_M = 1000;

/** Painted-sheet gutter (px): every painted flyer line must measure at most
 * the sheet width minus two of these (inference - rework pass 1). */
export const FLYER_MARGIN_PX = 12;

/** Minimum baseline leading as a multiple of the cap height (inference -
 * the legibility leading floor, rework pass 1). */
export const FLYER_LEADING_MIN_RATIO = 1.35;

/**
 * Paint the Welcome Flyer: a Paper Card sheet carrying the verbatim control
 * line, split on the escaped middot separator as before. Rework pass 1: the
 * A5 sheet clipped the longest split line at both edges in the browser
 * smoke, so each split line is now WORD-WRAPPED at spaces and every painted
 * line must MEASURE (via the context's measureText) at most the sheet width
 * minus 2 x FLYER_MARGIN_PX. The sheet metres come from the signage record;
 * PX_PER_M is unchanged. Fit law: a single word too wide for the sheet, or
 * a wrapped line count that no longer fits the sheet height at
 * FLYER_LEADING_MIN_RATIO cap leading, throws loudly (sibling of the need2d
 * law - smoke fails visibly instead of clipping silently). `inkCss`/
 * `paperCss` are the Card Ink / Paper Card tokens. The text stays verbatim;
 * wrap points are metric-dependent, so the pins check character order and
 * substring membership, not the exact wrap points.
 */
export function paintFlyer(
  makeCanvas: CanvasFactory,
  text: string,
  paperCss: string,
  inkCss: string,
  capMeters: number,
  sheetWidthM: number,
  sheetHeightM: number,
): PaintSurface {
  const canvas = makeCanvas(
    Math.round(sheetWidthM * FLYER_PX_PER_M),
    Math.round(sheetHeightM * FLYER_PX_PER_M),
  ); // the mesh follows these sheet metres (no texture stretch)
  const ctx = need2d(canvas);
  ctx.fillStyle = paperCss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = inkCss;
  // Condensed era-print stack (inference; DESIGN.md names no canvas font).
  const capPx = capMeters * FLYER_PX_PER_M;
  ctx.font = `600 ${Math.round(capPx)}px "Archivo Narrow", "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  const maxLineWidth = canvas.width - 2 * FLYER_MARGIN_PX;
  const lines: string[] = [];
  for (const segment of text.split(" \u00b7 ")) {
    let current = "";
    for (const word of segment.split(" ")) {
      if (word === "") continue;
      if (ctx.measureText(word).width > maxLineWidth) {
        throw new Error(`paintFlyer: word "${word}" does not fit the flyer sheet (${maxLineWidth}px usable)`);
      }
      if (current !== "" && ctx.measureText(`${current} ${word}`).width <= maxLineWidth) {
        current += ` ${word}`;
      } else {
        if (current !== "") lines.push(current);
        current = word;
      }
    }
    if (current !== "") lines.push(current);
  }
  const leading = canvas.height / (lines.length + 1);
  if (leading < FLYER_LEADING_MIN_RATIO * capPx) {
    throw new Error(
      `paintFlyer: ${lines.length} wrapped lines do not fit the flyer sheet height at the ${FLYER_LEADING_MIN_RATIO}x leading floor`,
    );
  }
  lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, leading * (i + 1)));
  return canvas;
}

/**
 * Paint the carpet: Carpet Base ground plus the low-contrast octagon/weave
 * motif in Carpet Pattern (DESIGN.md ASSUMPTION: motif is a low-contrast
 * octagon/weave - rendered here as alternating offset octagon rosettes).
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
    // The union of two offset rectangles is a corner-cut octagon - drawn
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
