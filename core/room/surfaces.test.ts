// Story 1.3 (AC6/AC7): pins for the injected-canvas painters — every pixel
// goes onto a caller-provided surface (the injectable-source pattern of
// core/input/index.ts), so the whole paint layer is headless-testable and
// the entry's DOM append count stays one. The fake canvas records exactly
// what is painted: the Welcome Flyer must carry the verbatim control line
// and nothing else, in exactly two token colours (Paper Card + Card Ink);
// the carpet must use exactly the two carpet tokens (no third colour, no
// painted glow). Rework pass 1 (smoke: the split lines clipped at the sheet
// edges): paintFlyer word-wraps, the fake context gains measureText (a
// deterministic generous per-character estimate), the verbatim pins check
// character order + substring membership (wrap points are metric-
// dependent), and a containment pin guards the new fit contract.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FLYER_LEADING_MIN_RATIO,
  FLYER_MARGIN_PX,
  FLYER_PX_PER_M,
  paintCarpet,
  paintFlyer,
  type PaintContext,
  type PaintSurface,
} from "./surfaces.ts";
import { WELCOME_FLYER } from "./signage.ts";
import { CARPET_BASE, CARPET_PATTERN, CARD_INK, PAPER_CARD, toCss } from "./tokens.ts";

// Middle dot built by code point so every string literal stays ASCII (Rule 14;
// comments carry the project's conventional em dashes).
const DOT = String.fromCharCode(0xb7);
const SEP = ` ${DOT} `;
// Painted-line width estimate: the fake context models text as 0.92em per
// character (deterministic; generous - well above any narrow era-print or
// plain-sans face - yet fine-grained enough that a candidate line can land
// inside the wrap budget's margin window, so the margin term itself is
// observable, not just the canvas-fit term). A font string without a px
// size fails the fake loudly instead of collapsing every width to zero
// (review pass 3).
function fakeTextWidth(text: string, font: string): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  if (!m) throw new Error("fake measureText: font string carries no px size");
  return text.length * 0.92 * Number(m[1]);
}

interface RecordedRect {
  x: number;
  y: number;
  w: number;
  h: number;
  style: string;
}

interface RecordedText {
  text: string;
  x: number;
  y: number;
  w: number;
  style: string;
}

interface Recording {
  rects: RecordedRect[];
  texts: RecordedText[];
  font: string | null;
  textAlign: string | null;
}

function fakeCanvas(width: number, height: number, rec: Recording): PaintSurface {
  const ctx: PaintContext = {
    fillStyle: "#000000",
    font: "",
    textAlign: "",
    fillRect(x, y, w, h) {
      rec.rects.push({ x, y, w, h, style: ctx.fillStyle as string });
    },
    fillText(text, x, y) {
      rec.texts.push({ text, x, y, w: ctx.measureText(text).width, style: ctx.fillStyle as string });
      rec.font = ctx.font;
      rec.textAlign = ctx.textAlign;
    },
    measureText(text) {
      return { width: fakeTextWidth(text, ctx.font) };
    },
  };
  return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
}

function makeRecorder(): { factory: (w: number, h: number) => PaintSurface; sizes: [number, number][]; rec: Recording } {
  const rec: Recording = { rects: [], texts: [], font: null, textAlign: null };
  const sizes: [number, number][] = [];
  const factory = (w: number, h: number): PaintSurface => {
    sizes.push([w, h]);
    return fakeCanvas(w, h, rec);
  };
  return { factory, sizes, rec };
}

test("paintFlyer puts the verbatim control line on the sheet: word-wrapped inside the signage sheet metres, nothing else printed, Paper Card + Card Ink only (AC6)", () => {
  const { factory, sizes, rec } = makeRecorder();
  const paper = toCss(PAPER_CARD);
  const ink = toCss(CARD_INK);
  paintFlyer(factory, WELCOME_FLYER.text, paper, ink, WELCOME_FLYER.capHeight, WELCOME_FLYER.width, WELCOME_FLYER.height);

  assert.equal(sizes.length, 1, "one canvas for the flyer");
  // The canvas follows the signage record's sheet metres at the unchanged
  // PX_PER_M — the mesh and the texture share one aspect (no stretch).
  assert.deepEqual(
    sizes[0],
    [Math.round(WELCOME_FLYER.width * FLYER_PX_PER_M), Math.round(WELCOME_FLYER.height * FLYER_PX_PER_M)],
    "canvas size derives from the sheet metres (rework pass 1 widening)",
  );
  // The verbatim line, character order + substring membership: every
  // painted line sits inside the authored string, and the painted
  // characters, in painted order, rebuild it minus the middot separators
  // and the spaces a wrap dropped (wrap points are font-dependent, so the
  // exact split points are not pinned here — the record's verbatim string
  // is pinned byte-for-byte in room.test.ts, AC6).
  const segments = WELCOME_FLYER.text.split(SEP);
  for (const t of rec.texts) {
    assert.ok(WELCOME_FLYER.text.includes(t.text), `painted line "${t.text}" is a substring of the verbatim text`);
  }
  // Word-boundary wrap: every token of every painted line is a whole word
  // of the verbatim string - the wrap law breaks lines at spaces, never
  // mid-word (review pass 3: substring + char order alone tolerate it).
  const words = WELCOME_FLYER.text.split(new RegExp("[\\s" + DOT + "]+", "u"));
  for (const t of rec.texts) {
    for (const w of t.text.split(" ")) {
      assert.ok(words.includes(w), `painted line "${t.text}" breaks no word of the verbatim text`);
    }
  }
  assert.equal(
    rec.texts.map((t) => t.text).join("").replace(/\s+/g, ""),
    segments.join("").replace(/\s+/g, ""),
    "painted characters are the verbatim control line in order",
  );
  assert.ok(
    rec.texts.length > segments.length,
    "the widest split lines were word-wrapped, not painted whole (rework pass 1)",
  );
  // Nothing but the control line is ever printed (no invented copy).
  for (const t of rec.texts) assert.ok(t.text !== "", "no empty painted line");
  // Exactly the two stock colours; the sheet ground is Paper Card, the
  // print is Card Ink.
  const styles = new Set([...rec.rects.map((r) => r.style), ...rec.texts.map((t) => t.style)]);
  assert.deepEqual([...styles].sort(), [ink, paper].sort());
  assert.equal(rec.rects.length, 1);
  assert.equal(rec.rects[0]!.style, paper);
  assert.deepEqual(
    [rec.rects[0]!.x, rec.rects[0]!.y, rec.rects[0]!.w, rec.rects[0]!.h],
    [0, 0, sizes[0]![0], sizes[0]![1]],
    "the paper fills the sheet",
  );
  assert.equal(rec.textAlign, "center");
  assert.ok(rec.font !== null && rec.font.includes(`${Math.round(WELCOME_FLYER.capHeight * FLYER_PX_PER_M)}px`), "cap height 0.06m -> 60px text");
});

test("rework pass 1 containment pin: every painted flyer line MEASURES inside the canvas with the margin, and the baselines stay in canvas with non-overlapping leading (AC6 legibility, Rule 19)", () => {
  const { factory, sizes, rec } = makeRecorder();
  paintFlyer(
    factory,
    WELCOME_FLYER.text,
    toCss(PAPER_CARD),
    toCss(CARD_INK),
    WELCOME_FLYER.capHeight,
    WELCOME_FLYER.width,
    WELCOME_FLYER.height,
  );
  assert.ok(rec.texts.length >= 2, "the sheet carries wrapped lines, not one clipped row");
  const [sheetW, sheetH] = sizes[0]!;
  const leadingFloor = FLYER_LEADING_MIN_RATIO * WELCOME_FLYER.capHeight * FLYER_PX_PER_M;
  let prevBaseline = 0;
  for (const t of rec.texts) {
    // The smoke bug, pinned at the source: a painted line whose measured
    // width exceeds the canvas width (minus margins) turns this red.
    assert.ok(
      t.w <= sheetW - 2 * FLYER_MARGIN_PX,
      `painted line "${t.text}" measures ${t.w}px - must fit ${sheetW}px minus 2x${FLYER_MARGIN_PX}px margin`,
    );
    // Centred on the sheet: the measured extent stays inside with margin.
    assert.ok(
      t.x - t.w / 2 >= FLYER_MARGIN_PX && t.x + t.w / 2 <= sheetW - FLYER_MARGIN_PX,
      `painted line "${t.text}" stays inside the canvas with margin`,
    );
    // Baselines: inside the canvas, top-to-bottom, never closer than the
    // legibility leading floor (the wrap-height law from the painter side).
    assert.ok(t.y > 0 && t.y < sheetH, `baseline for "${t.text}" stays inside the canvas`);
    assert.ok(
      t.y - prevBaseline >= leadingFloor,
      `leading before "${t.text}" stays at or above the ${FLYER_LEADING_MIN_RATIO}x cap floor`,
    );
    prevBaseline = t.y;
  }
});

test("rework pass 1 fit law: a word wider than the usable sheet and an over-tall wrapped layout each die loudly - smoke fails visibly, never clips silently", () => {
  const { factory } = makeRecorder();
  // Word-too-wide: a 280px sheet leaves 256px usable; "MOVE:" measures
  // 5 x 0.92 x 60 = 276px under the fake metric, so the first word trips.
  // (1.0m height keeps the leading law out of reach so this pin observes
  // ONLY the word law: without the word throw the layout would still fit.)
  assert.throws(
    () => paintFlyer(factory, WELCOME_FLYER.text, toCss(PAPER_CARD), toCss(CARD_INK), WELCOME_FLYER.capHeight, 0.28, 1.0),
    /does not fit the flyer sheet \(/,
  );
  // Leading floor: the wrapped layout needs 7 * 1.35 * capPx = 567px of
  // height; a 0.50m sheet is 500px, so the layout trips the height law.
  assert.throws(
    () => paintFlyer(factory, WELCOME_FLYER.text, toCss(PAPER_CARD), toCss(CARD_INK), WELCOME_FLYER.capHeight, WELCOME_FLYER.width, 0.5),
    /do not fit the flyer sheet height/,
  );
});

test("paintCarpet uses exactly the two carpet tokens \u2014 base ground plus pattern motif rects, never a third colour (AC4/AC7)", () => {
  const { factory, sizes, rec } = makeRecorder();
  const base = toCss(CARPET_BASE);
  const pattern = toCss(CARPET_PATTERN);
  paintCarpet(factory, base, pattern);

  assert.equal(sizes.length, 1, "one canvas for the carpet");
  assert.equal(rec.texts.length, 0, "no text on the carpet");
  const styles = new Set(rec.rects.map((r) => r.style));
  assert.deepEqual([...styles].sort(), [base, pattern].sort()); // exactly two, never a third
  assert.equal(rec.rects[0]!.style, base);
  assert.deepEqual(
    [rec.rects[0]!.x, rec.rects[0]!.y, rec.rects[0]!.w, rec.rects[0]!.h],
    [0, 0, sizes[0]![0], sizes[0]![1]],
    "the base fill covers the whole canvas",
  );
  assert.ok(rec.rects.length > 1, "the motif is actually painted (pattern rects follow the ground)");
  const patternRects = rec.rects.filter((r) => r.style === pattern);
  assert.ok(patternRects.length >= 2, "the octagon rosette motif repeats across the carpet");
});

test("painters take the canvas ONLY from the injected factory (injectable-source pattern; DOM stays at one node)", () => {
  // A factory that returns nothing usable trips the loud guard instead of
  // falling back to any global canvas.
  assert.throws(() => paintCarpet(() => ({ width: 4, height: 4, getContext: () => null }), "#111111", "#222222"), /no 2d context/);
  // A factory handing back a non-surface (no getContext at all) also dies
  // with the loud guard — never with a raw TypeError two calls later.
  assert.throws(
    () => paintFlyer(
      () => ({ width: 4, height: 4 }) as unknown as PaintSurface,
      WELCOME_FLYER.text,
      "#ffffff",
      "#000000",
      WELCOME_FLYER.capHeight,
      WELCOME_FLYER.width,
      WELCOME_FLYER.height,
    ),
    /no 2d context/,
  );
});
