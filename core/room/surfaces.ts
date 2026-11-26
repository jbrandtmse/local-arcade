// Story 1.3 (AC6/AC7): injected-canvas painters for the room's paper and
// carpet surfaces; Story 1.4 adds the cabinet marquee + screen painters
// beside them. DOM-free like core/input/index.ts's injectable-source
// pattern (Rule 2: extends that sibling's pattern, no copy of the input
// service): every pixel goes onto a canvas the CALLER provides, so the whole
// layer is headless-testable and the entry's DOM append count stays one.

import { math } from "../contract/index.ts";
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
  /** Story 1.5 compositeScreen only: blit the game's presentation canvas
   * into the screen face. Optional so the cheap recorder fakes stay valid
   * for the fallback painters; compositeScreen throws loudly when missing. */
  drawImage?(source: unknown, dx: number, dy: number, dw: number, dh: number): void;
  /** Story 2.0 cabinet-art painters only (paintSideArt stripes,
   * paintControlOverlay rings, paintContactShadow gradient). Optional for
   * the same reason as drawImage — the painters that need a leg throw
   * loudly when a fake omits it. */
  save?(): void;
  restore?(): void;
  translate?(x: number, y: number): void;
  rotate?(angleRad: number): void;
  beginPath?(): void;
  arc?(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  stroke?(): void;
  strokeStyle?: string | CanvasGradient | CanvasPattern;
  lineWidth?: number;
  createRadialGradient?(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient;
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

/** Screen face top/bottom edge inset, fraction of the face height in px
 * (inference — the attract block's top margin and the NEXT row's bottom
 * band; pins derive from it, never retype). */
export const SCREEN_EDGE_RATIO = 0.02;

/** CRT scan band width, fraction of the face width in px (inference — the
 * mockup's band sits centered under half the face width; pins derive). */
export const SCREEN_BAND_WIDTH_RATIO = 0.4;

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
 * Paint a cabinet marquee face (Story 2.0 contract change 4): the
 * game-title record lettered on ONE line in the placement's marquee hue,
 * centred on the face at the 0.09m MARQUEE_CAP_M cap (UX-DR2/UX-DR6 — the
 * cap is never shrunk; the stacked-word form of the 1.4 law is gone). Fit
 * law (the throw law survives in its one-line form): the line must fit the
 * face width minus 2 x MARQUEE_MARGIN_PX once the letter-spacing floor is
 * spent, and the cap must fit the face height — either way the painter
 * throws instead of clipping. A title with no words throws too — an empty
 * marquee is a data bug.
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
  const line = title.toUpperCase().split(/\s+/).filter((w) => w !== "").join(" ");
  if (line === "") throw new Error("paintMarquee: title carries no words");
  const capPx = Math.round(capMeters * SURFACE_PX_PER_M);
  if (capPx > canvas.height) {
    throw new Error(
      `paintMarquee: cap ${capPx}px does not fit the ${canvas.height}px face (the cap floor is never shrunk)`,
    );
  }
  ctx.fillStyle = letteringCss;
  ctx.font = `600 ${capPx}px ${MARQUEE_FONT_STACK}`;
  ctx.textAlign = "center";
  const maxLineWidth = canvas.width - 2 * MARQUEE_MARGIN_PX;
  fitLine(ctx, line, capPx, maxLineWidth);
  const baseline = Math.round((canvas.height - capPx) / 2) + capPx;
  ctx.fillText(line, canvas.width / 2, baseline);
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
 *
 * AD-28 fit law (Story 1.8 unattended ruling, measured — executed probe of
 * this painter against authored B0 data, 2026-11-24): when the score zone
 * CARRIES rows, the attract title block YIELDS — it is not painted and the
 * scan band rises to the top margin, so rows paint below the live band
 * above the NEXT floor (the authored B0 face fits exactly 2 rows,
 * baselines 177/309; the Core table caps at 2, and the row/NEXT collision
 * throw stays the loud guard for cap bugs). With an empty zone every
 * branch below stays byte-identical to the 1.4 law (CAP-8 honesty — the
 * 1.4 pins are untouched).
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
  const edge = Math.round(h * SCREEN_EDGE_RATIO);
  const attractLines = titleLines(zones.attract);
  const attractCap = Math.round(attractCapM * pxPerM);
  const attractPitch = Math.round(attractCap * MARQUEE_LINE_PITCH_RATIO);
  const nextBaseline = h - edge;
  const nextTop = nextBaseline - Math.round(nextCapM * pxPerM);
  if (nextTop < 0) {
    throw new Error(`paintScreen: NEXT cap ${nextCapM}m does not fit the ${faceHeightM}m face`);
  }
  // AD-28: rows present -> the attract block yields (not painted, and the
  // scan band rises to the top margin). Empty zone -> every branch below
  // runs exactly as Story 1.4 authored it.
  const rowsPresent = zones.score.length > 0;
  const attractPainted = attractLines.length > 0 && !rowsPresent;
  if (attractPainted) {
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
  // when the attract zone is empty — and, AD-28, when rows made the block
  // yield: the band stays live at the top either way). The mockup's scan
  // lines are 2px at a 9px pitch — the SCREEN_SCAN_* constants mirror that
  // detail.
  const scanTop =
    attractPainted
      ? edge + (attractLines.length - 1) * attractPitch + attractCap + edge
      : edge;
  if (scanTop + SCREEN_SCAN_AREA_PX > nextTop) {
    throw new Error(`paintScreen: scan area collides with the NEXT row`);
  }
  const bandSpan = SCREEN_SCAN_AREA_PX - ((SCREEN_SCAN_ROWS - 1) * SCREEN_SCAN_PITCH_PX + SCREEN_SCAN_THICK_PX);
  const bandOffset = ((step * SCREEN_SCAN_DRIFT_PX) % bandSpan + bandSpan) % bandSpan;
  const bandWidth = Math.round(w * SCREEN_BAND_WIDTH_RATIO);
  ctx.fillStyle = attractCss;
  for (let k = 0; k < SCREEN_SCAN_ROWS; k++) {
    ctx.fillRect(
      Math.round((w - bandWidth) / 2),
      scanTop + bandOffset + k * SCREEN_SCAN_PITCH_PX,
      bandWidth,
      SCREEN_SCAN_THICK_PX,
    );
  }
  // Score rows: the zone renders nothing until scores exist (1.4's CAP-8
  // honesty; Story 1.8's table feeds it under the AD-28 cap-2 view). The
  // NEXT-collision throw below stays the loud guard for cap bugs.
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

/**
 * Story 1.5: composite the live game frame onto an EXISTING screen face —
 * the game's own presentation canvas (drawn each frame by the game's
 * presentation half) is letterboxed into the area between the top margin
 * and the NEXT row: uniform fit scale = min(areaW/gameW, areaH/gameH),
 * centered, background showing through the bars. The NEXT row paints here
 * exactly as drawScreen paints it (same edge inset, cap, fit law) — the
 * Core keeps lettering that zone while the game drives its own pixels. The
 * score zone renders nothing (honest until Story 1.8 fills it; CAP-8).
 * paintScreen stays the fallback path for cabinets with no presentation
 * half; the paint-step gate in main.ts picks one path per placement.
 */
export function compositeScreen(
  surface: PaintSurface,
  zones: ScreenZones,
  gameCanvas: { width: number; height: number },
  backgroundCss: string,
  nextCss: string,
  nextCapM: number,
  faceHeightM: number,
): void {
  const ctx = need2d(surface);
  if (typeof ctx.drawImage !== "function") {
    throw new Error("compositeScreen: paint context has no drawImage (the composite path needs it)");
  }
  const w = surface.width;
  const h = surface.height;
  const pxPerM = h / faceHeightM; // whole px at the authored face sizes
  ctx.fillStyle = backgroundCss;
  ctx.fillRect(0, 0, w, h);
  const edge = Math.round(h * SCREEN_EDGE_RATIO);
  const nextBaseline = h - edge;
  const nextTop = nextBaseline - Math.round(nextCapM * pxPerM);
  if (nextTop < 0) {
    throw new Error(`compositeScreen: NEXT cap ${nextCapM}m does not fit the ${faceHeightM}m face`);
  }
  const areaW = w - 2 * edge;
  const areaH = nextTop - edge;
  const gw = gameCanvas.width;
  const gh = gameCanvas.height;
  if (gw <= 0 || gh <= 0 || areaW <= 0 || areaH <= 0) {
    throw new Error(`compositeScreen: game frame ${gw}x${gh} or screen area ${areaW}x${areaH} is empty`);
  }
  const scale = Math.min(areaW / gw, areaH / gh);
  const dw = Math.round(gw * scale);
  const dh = Math.round(gh * scale);
  if (dw === 0 || dh === 0) {
    throw new Error(`compositeScreen: game frame ${gw}x${gh} scales to nothing inside ${areaW}x${areaH}`);
  }
  ctx.drawImage(
    gameCanvas,
    edge + Math.round((areaW - dw) / 2),
    edge + Math.round((areaH - dh) / 2),
    dw,
    dh,
  );
  ctx.textAlign = "center";
  const maxLineWidth = w - 2 * MARQUEE_MARGIN_PX;
  const nextCap = Math.round(nextCapM * pxPerM);
  ctx.fillStyle = nextCss;
  ctx.font = `600 ${nextCap}px ${MARQUEE_FONT_STACK}`;
  fitLine(ctx, zones.next.toUpperCase(), nextCap, maxLineWidth);
  ctx.fillText(zones.next.toUpperCase(), w / 2, nextBaseline);
}

// --- Story 2.0: cabinet-art painters (brief section 5) ---------------------
// Original abstract art only — no artwork copied from any real cabinet, no
// image files, no randomness: every shape is an arithmetic layout so equal
// inputs paint byte-identical canvases (determinism law). Colours arrive as
// token CSS from the caller, never hardcoded here.

function needLeg<T extends object, K extends keyof T>(ctx: T, leg: K, painter: string): NonNullable<T[K]> {
  if (typeof ctx[leg] !== "function") {
    throw new Error(`${painter}: paint context has no ${String(leg)} (this painter needs it)`);
  }
  return ctx[leg] as NonNullable<T[K]>;
}

/**
 * Paint one side-art decal (brief `paintSideArt`): a 0.50 x 0.70 m panel
 * ground in the darkened side colour carrying three diagonal stripes of
 * DIFFERENT widths plus one large simple tilted shape, in the placement's
 * hue and marqueeHue families. Bold original abstract geometry only — the
 * shapes are arithmetic (rotated rectangles), deterministic, and copy
 * nothing.
 */
export function paintSideArt(
  makeCanvas: CanvasFactory,
  groundCss: string,
  hueCss: string,
  marqueeHueCss: string,
  widthM: number,
  heightM: number,
): PaintSurface {
  const canvas = makeCanvas(
    Math.round(widthM * SURFACE_PX_PER_M),
    Math.round(heightM * SURFACE_PX_PER_M),
  );
  const ctx = need2d(canvas);
  const save = needLeg(ctx, "save", "paintSideArt");
  const restore = needLeg(ctx, "restore", "paintSideArt");
  const translate = needLeg(ctx, "translate", "paintSideArt");
  const rotate = needLeg(ctx, "rotate", "paintSideArt");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = groundCss;
  ctx.fillRect(0, 0, w, h);
  // Three diagonal stripes, different widths, one sweep across the panel.
  save.call(ctx);
  translate.call(ctx, w / 2, h / 2);
  rotate.call(ctx, 0.6); // (inference — a fixed diagonal, never animated)
  const long = 3 * w;
  ctx.fillStyle = marqueeHueCss;
  ctx.fillRect(-long / 2, -h * 0.34, long, h * 0.06);
  ctx.fillStyle = hueCss;
  ctx.fillRect(-long / 2, -h * 0.12, long, h * 0.13);
  ctx.fillStyle = marqueeHueCss;
  ctx.fillRect(-long / 2, h * 0.14, long, h * 0.05);
  restore.call(ctx);
  // One large simple shape: a tilted square low-centre, in the machine hue.
  const side = Math.round(h * 0.3);
  save.call(ctx);
  translate.call(ctx, w / 2, h * 0.74);
  rotate.call(ctx, -0.5);
  ctx.fillStyle = hueCss;
  ctx.fillRect(-side / 2, -side / 2, side, side);
  restore.call(ctx);
  return canvas;
}

/** A control ring centre on the overlay, in overlay-local metres
 * (x across, y along the slope) with a radius. */
export interface OverlayRing {
  x: number;
  y: number;
  r: number;
}

/**
 * Paint the control-panel overlay (brief `paintControlOverlay`): a 0.562 x
 * 0.19 m dark ground, a thin border line in the placement's marquee hue,
 * and a small stroked ring around each control position (positions come
 * from the scene's assembly data — one source for hardware placement).
 */
export function paintControlOverlay(
  makeCanvas: CanvasFactory,
  groundCss: string,
  borderCss: string,
  rings: readonly OverlayRing[],
  widthM: number,
  heightM: number,
): PaintSurface {
  const canvas = makeCanvas(
    Math.round(widthM * SURFACE_PX_PER_M),
    Math.round(heightM * SURFACE_PX_PER_M),
  );
  const ctx = need2d(canvas);
  const beginPath = needLeg(ctx, "beginPath", "paintControlOverlay");
  const arc = needLeg(ctx, "arc", "paintControlOverlay");
  const stroke = needLeg(ctx, "stroke", "paintControlOverlay");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = groundCss;
  ctx.fillRect(0, 0, w, h);
  // Thin border line: four edge rectangles (the rectangle idiom stays
  // stroke-free where it can).
  const t = 4;
  ctx.fillStyle = borderCss;
  ctx.fillRect(t, t, w - 2 * t, t);
  ctx.fillRect(t, h - 2 * t, w - 2 * t, t);
  ctx.fillRect(t, t, t, h - 2 * t);
  ctx.fillRect(w - 2 * t, t, t, h - 2 * t);
  // Rings around the controls (the one arc use in this family; the era
  // overlay prints round target rings).
  ctx.strokeStyle = borderCss;
  ctx.lineWidth = 3;
  const pxPerM = SURFACE_PX_PER_M;
  for (const ring of rings) {
    beginPath.call(ctx);
    arc.call(ctx, w / 2 + ring.x * pxPerM, h / 2 + ring.y * pxPerM, ring.r * pxPerM, 0, 2 * math.PI);
    stroke.call(ctx);
  }
  return canvas;
}

/**
 * Paint the contact-shadow texture (brief `paintContactShadow` / 4f): a
 * soft dark radial gradient centred on the sheet, fading to fully
 * transparent at the edge — the material carries transparent +
 * depthWrite:false; the canvas supplies only alpha falloff.
 */
export function paintContactShadow(
  makeCanvas: CanvasFactory,
  inkCss: string,
  sizeM: number,
): PaintSurface {
  const px = Math.round(sizeM * SURFACE_PX_PER_M);
  const canvas = makeCanvas(px, px);
  const ctx = need2d(canvas);
  const grad = needLeg(ctx, "createRadialGradient", "paintContactShadow").call(
    ctx,
    px / 2,
    px / 2,
    0,
    px / 2,
    px / 2,
    px / 2,
  );
  grad.addColorStop(0, inkCss);
  grad.addColorStop(0.55, inkCss);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, px, px);
  return canvas;
}
