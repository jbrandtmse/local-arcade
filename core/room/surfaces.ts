// Story 1.3 (AC6/AC7): injected-canvas painters for the room's paper and
// carpet surfaces; Story 1.4 adds the cabinet marquee + screen painters
// beside them. DOM-free like core/input/index.ts's injectable-source
// pattern (Rule 2: extends that sibling's pattern, no copy of the input
// service): every pixel goes onto a canvas the CALLER provides, so the whole
// layer is headless-testable and the entry's DOM append count stays one.

import { MARQUEE_LETTER_SPACING_EM_FLOOR, type ScreenZones } from "./cabinets.ts";

/** The drawing surface a painter may use - the subset of the 2D canvas API
 * these painters touch. OffscreenCanvas satisfies it in the browser; the
 * fillStyle type matches the real API's setter-union (painters only ever
 * assign plain CSS colour strings). measureText is the flyer painter's
 * fit-law leg (rework pass 1): the painter only lays out what it measures.
 * letterSpacing is the 1.4 marquee/screen fit-law leg (the real Canvas2D
 * property; optional here so DOM-free fakes stay cheap to build). */
export interface PaintContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: string;
  letterSpacing?: string;
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

// --- Story 1.4: cabinet marquee + screen painters (fit-law siblings of
// paintFlyer) -------------------------------------------------------------
// The marquee bar and screen face carry their geometry metres into the same
// 1000 px/m texture density as the flyer, so canvas aspect == mesh aspect
// (no texture stretch) and cap metres round to whole px at the authored
// sizes. Lettering colours and ground colours arrive as token CSS from the
// caller (never hardcoded here). The era display stack is DESIGN.md's
// provisional marquee family with its fallbacks.

/** Marquee/screen texture density (px per metre) — same scale as the flyer
 * (inference); pins derive from it. */
export const SURFACE_PX_PER_M = 1000;

/** Painted-line gutter (px) for the marquee/screen bars (sibling of
 * FLYER_MARGIN_PX; inference). */
export const MARQUEE_MARGIN_PX = 12;

/** Stacked-line baseline pitch as a multiple of the cap height for the
 * marquee attract block (inference — airier than the flyer's 1.35 floor;
 * big caps need the extra leading to read as separate rows). */
export const MARQUEE_LINE_PITCH_RATIO = 1.65;

/** DESIGN.md's provisional marquee/display stack (never loaded as a
 * webfont — the fallback chain is what a sealed offline bundle draws). */
const MARQUEE_FONT_STACK = `"Chakra Petch", "Saira Condensed", "Arial Narrow", sans-serif`;

/** CRT scan band geometry (px, screen canvas space; inference — the
 * mockup's "scan lines" detail). The band is `SCREEN_SCAN_ROWS` lines of
 * `SCREEN_SCAN_THICK_PX` at `SCREEN_SCAN_PITCH_PX` pitch, drifting
 * `SCREEN_SCAN_DRIFT_PX` px per paint step inside its `SCREEN_SCAN_AREA_PX`
 * tall area; the offset is pure arithmetic on the step, so equal steps
 * always paint identically (determinism law). Drift law: the band travel
 * span (AREA minus the rows' extent, 48px) divides evenly into
 * drift x steps-per-cycle (2 x 24 = 48), so the sawtooth drift never snaps
 * backward mid-cycle and the cycle wrap is continuous. */
export const SCREEN_SCAN_ROWS = 4;
export const SCREEN_SCAN_PITCH_PX = 9;
export const SCREEN_SCAN_THICK_PX = 2;
export const SCREEN_SCAN_AREA_PX = 77;
export const SCREEN_SCAN_DRIFT_PX = 2;

/** Title lettering for the marquee / attract zone: uppercased, split into
 * one line per word (the mockup stacks "MOON" over "PATROL"). */
function titleLines(title: string): string[] {
  return title.toUpperCase().split(/\s+/).filter((w) => w !== "");
}

/**
 * The 1.4 fit law (paintFlyer's throw-loudly sibling, width leg): measure
 * the line at zero letter-spacing; if it overruns the usable width, solve
 * for the NEGATIVE letter-spacing (in ems of the cap height) that closes
 * exactly the gap, and throw if that needs more than
 * MARQUEE_LETTER_SPACING_EM_FLOOR — the cap height is never shrunk to make
 * a title fit (DESIGN's 0.18m marquee floor; the spec's residual-risk note
 * pre-authorises the spacing lever, not the cap). Sets ctx.letterSpacing
 * for the line about to be painted.
 */
function fitLine(ctx: PaintContext, line: string, capPx: number, maxLineWidth: number): void {
  // Reset before measuring so a previous line's spacing never leaks into
  // this measurement.
  ctx.letterSpacing = "0em";
  const natural = ctx.measureText(line).width;
  let lsEm = 0;
  if (natural > maxLineWidth) {
    const gaps = Math.max(line.length - 1, 1);
    lsEm = (maxLineWidth - natural) / (gaps * capPx);
    if (lsEm < MARQUEE_LETTER_SPACING_EM_FLOOR) {
      throw new Error(
        `marquee/screen fit law: line "${line}" needs letter-spacing ${lsEm.toFixed(3)}em at cap ${capPx}px, past the ${MARQUEE_LETTER_SPACING_EM_FLOOR}em floor`,
      );
    }
  }
  ctx.letterSpacing = `${lsEm}em`;
}

/**
 * Paint a cabinet marquee bar: the game-title record lettered in the
 * placement's marquee hue on the room-black bar, stacked one word per line
 * at the MARQUEE_CAP_M cap (DESIGN contract floor — never shrunk). Fit
 * laws (paintFlyer siblings): every line must fit the bar width minus 2 x
 * MARQUEE_MARGIN_PX once the letter-spacing floor is spent, and the whole
 * stacked block must fit the bar height at MARQUEE_LINE_PITCH_RATIO
 * leading; either way the painter throws instead of clipping. A title with
 * no words throws too — an empty marquee is a data bug.
 */
export function paintMarquee(
  makeCanvas: CanvasFactory,
  title: string,
  backgroundCss: string,
  letteringCss: string,
  capMeters: number,
  barWidthM: number,
  barHeightM: number,
): PaintSurface {
  const canvas = makeCanvas(
    Math.round(barWidthM * SURFACE_PX_PER_M),
    Math.round(barHeightM * SURFACE_PX_PER_M),
  ); // the mesh follows these bar metres (no texture stretch)
  const ctx = need2d(canvas);
  ctx.fillStyle = backgroundCss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const lines = titleLines(title);
  if (lines.length === 0) throw new Error("paintMarquee: title carries no words");
  const capPx = Math.round(capMeters * SURFACE_PX_PER_M);
  const pitch = Math.round(capPx * MARQUEE_LINE_PITCH_RATIO);
  const blockHeight = (lines.length - 1) * pitch + capPx;
  if (blockHeight > canvas.height) {
    throw new Error(
      `paintMarquee: ${lines.length} lines at cap ${capPx}px do not fit the ${canvas.height}px bar at the ${MARQUEE_LINE_PITCH_RATIO}x pitch`,
    );
  }
  ctx.fillStyle = letteringCss;
  ctx.font = `600 ${capPx}px ${MARQUEE_FONT_STACK}`;
  ctx.textAlign = "center";
  const maxLineWidth = canvas.width - 2 * MARQUEE_MARGIN_PX;
  const firstBaseline = Math.round((canvas.height - blockHeight) / 2) + capPx;
  lines.forEach((line, i) => {
    fitLine(ctx, line, capPx, maxLineWidth);
    ctx.fillText(line, canvas.width / 2, firstBaseline + i * pitch);
  });
  return canvas;
}

/**
 * Draw the whole live screen onto an EXISTING surface — the body shared by
 * paintScreen (first build) and repaintScreen (a changed paint step
 * re-letters the same canvas; never a second canvas per cabinet). Layout:
 * attract block at the top (cap SCREEN_ATTRACT_CAP_M, its colour family
 * `attractCss` — the mockup paints attract + scan lines in the machine's
 * own glow hue), its scan band drifting `step` underneath, score rows
 * (drawn ONLY when the zone has rows — CAP-8 honesty), and the steady NEXT
 * row at the bottom at the 0.18m authored minimum in the marquee's amber
 * family (`nextCss` — the mockup's `.next` colour). Layout laws: the scan
 * area and any score rows must stay clear of the NEXT cap block, and every
 * line goes through the same width/spacing fit law as the marquee; px per
 * metre is derived from the surface height and the face metres (canvas
 * aspect == mesh aspect).
 */
function drawScreen(
  surface: PaintSurface,
  zones: ScreenZones,
  step: number,
  backgroundCss: string,
  attractCss: string,
  nextCss: string,
  attractCapM: number,
  nextCapM: number,
  faceHeightM: number,
): void {
  const ctx = need2d(surface);
  const w = surface.width;
  const h = surface.height;
  const pxPerM = h / faceHeightM; // whole px at the authored face sizes
  ctx.fillStyle = backgroundCss;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  const maxLineWidth = w - 2 * MARQUEE_MARGIN_PX;
  const edge = Math.round(h * 0.02);
  const attractLines = titleLines(zones.attract);
  const attractCap = Math.round(attractCapM * pxPerM);
  const attractPitch = Math.round(attractCap * MARQUEE_LINE_PITCH_RATIO);
  const nextBaseline = h - edge;
  const nextTop = nextBaseline - Math.round(nextCapM * pxPerM);
  if (nextTop < 0) {
    throw new Error(`paintScreen: NEXT cap ${nextCapM}m does not fit the ${faceHeightM}m face`);
  }
  if (attractLines.length > 0) {
    const blockHeight = (attractLines.length - 1) * attractPitch + attractCap;
    if (edge + blockHeight > nextTop) {
      throw new Error(`paintScreen: attract block does not fit above the NEXT row`);
    }
    ctx.fillStyle = attractCss;
    ctx.font = `600 ${attractCap}px ${MARQUEE_FONT_STACK}`;
    attractLines.forEach((line, i) => {
      fitLine(ctx, line, attractCap, maxLineWidth);
      ctx.fillText(line, w / 2, edge + attractCap + i * attractPitch);
    });
  }
  // Scan band area starts under the attract block (or at the top margin
  // when the attract zone is empty). The mockup's scan lines are 2px at a
  // 9px pitch — the SCREEN_SCAN_* constants mirror that detail.
  const scanTop =
    attractLines.length > 0
      ? edge + (attractLines.length - 1) * attractPitch + attractCap + edge
      : edge;
  if (scanTop + SCREEN_SCAN_AREA_PX > nextTop) {
    throw new Error(`paintScreen: scan area collides with the NEXT row`);
  }
  const bandSpan = SCREEN_SCAN_AREA_PX - ((SCREEN_SCAN_ROWS - 1) * SCREEN_SCAN_PITCH_PX + SCREEN_SCAN_THICK_PX);
  const bandOffset = ((step * SCREEN_SCAN_DRIFT_PX) % bandSpan + bandSpan) % bandSpan;
  const bandWidth = Math.round(w * 0.4);
  ctx.fillStyle = attractCss;
  for (let k = 0; k < SCREEN_SCAN_ROWS; k++) {
    ctx.fillRect(
      Math.round((w - bandWidth) / 2),
      scanTop + bandOffset + k * SCREEN_SCAN_PITCH_PX,
      bandWidth,
      SCREEN_SCAN_THICK_PX,
    );
  }
  // Score rows: the zone renders nothing until scores exist (Story 1.8).
  if (zones.score.length > 0) {
    ctx.fillStyle = attractCss;
    ctx.font = `600 ${attractCap}px ${MARQUEE_FONT_STACK}`;
    zones.score.forEach((row, i) => {
      const baseline = scanTop + SCREEN_SCAN_AREA_PX + edge + i * attractPitch + attractCap;
      if (baseline > nextTop) {
        throw new Error(`paintScreen: score row ${i} collides with the NEXT row`);
      }
      fitLine(ctx, row, attractCap, maxLineWidth);
      ctx.fillText(row, w / 2, baseline);
    });
  }
  const nextCap = Math.round(nextCapM * pxPerM);
  ctx.fillStyle = nextCss;
  ctx.font = `600 ${nextCap}px ${MARQUEE_FONT_STACK}`;
  fitLine(ctx, zones.next.toUpperCase(), nextCap, maxLineWidth);
  ctx.fillText(zones.next.toUpperCase(), w / 2, nextBaseline);
}

/** Build a cabinet screen canvas at the face metres (mesh aspect == canvas
 * aspect), painted at the given paint step. */
export function paintScreen(
  makeCanvas: CanvasFactory,
  zones: ScreenZones,
  step: number,
  backgroundCss: string,
  attractCss: string,
  nextCss: string,
  attractCapM: number,
  nextCapM: number,
  faceWidthM: number,
  faceHeightM: number,
): PaintSurface {
  const canvas = makeCanvas(
    Math.round(faceWidthM * SURFACE_PX_PER_M),
    Math.round(faceHeightM * SURFACE_PX_PER_M),
  );
  drawScreen(canvas, zones, step, backgroundCss, attractCss, nextCss, attractCapM, nextCapM, faceHeightM);
  return canvas;
}

/** Repaint an EXISTING screen surface at a new paint step — same canvas,
 * new pixels (the texture-update marker rides this in main.ts; a dead
 * screen would never repaint). */
export function repaintScreen(
  surface: PaintSurface,
  zones: ScreenZones,
  step: number,
  backgroundCss: string,
  attractCss: string,
  nextCss: string,
  attractCapM: number,
  nextCapM: number,
  faceHeightM: number,
): void {
  drawScreen(surface, zones, step, backgroundCss, attractCss, nextCss, attractCapM, nextCapM, faceHeightM);
}
