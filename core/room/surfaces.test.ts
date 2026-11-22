// Story 1.3 (AC6/AC7): pins for the injected-canvas painters — every pixel
// goes onto a caller-provided surface (the injectable-source pattern of
// core/input/index.ts), so the whole paint layer is headless-testable and
// the entry's DOM append count stays one. The fake canvas records exactly
// what is painted: the Welcome Flyer must carry the verbatim control line
// and nothing else, in exactly two token colours (Paper Card + Card Ink);
// the carpet must use exactly the two carpet tokens (no third colour, no
// painted glow).
import test from "node:test";
import assert from "node:assert/strict";
import { paintCarpet, paintFlyer, type PaintContext, type PaintSurface } from "./surfaces.ts";
import { WELCOME_FLYER } from "./signage.ts";
import { CARPET_BASE, CARPET_PATTERN, CARD_INK, PAPER_CARD, toCss } from "./tokens.ts";

// Middle dot built by code point so this file stays pure ASCII (Rule 14).
const DOT = String.fromCharCode(0xb7);
const SEP = ` ${DOT} `;

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
      rec.texts.push({ text, x, y, style: ctx.fillStyle as string });
      rec.font = ctx.font;
      rec.textAlign = ctx.textAlign;
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

test("paintFlyer puts the verbatim control line on the sheet \u2014 split on the middle-dot separator, nothing else printed, Paper Card + Card Ink only (AC6)", () => {
  const { factory, sizes, rec } = makeRecorder();
  const paper = toCss(PAPER_CARD);
  const ink = toCss(CARD_INK);
  paintFlyer(factory, WELCOME_FLYER.text, paper, ink, WELCOME_FLYER.capHeight);

  assert.equal(sizes.length, 1, "one canvas for the flyer");
  // The full line, verbatim: re-joining the painted lines must equal the
  // authored text byte-for-byte (this is the pin the "drop the middle dot"
  // mutation trips).
  assert.equal(rec.texts.map((t) => t.text).join(SEP), WELCOME_FLYER.text);
  assert.ok(rec.texts.length >= 2, "the A5 sheet breaks the line into >=2 painted lines");
  // Nothing but the control line is ever printed (no invented copy).
  for (const t of rec.texts) assert.ok(WELCOME_FLYER.text.split(SEP).includes(t.text), `painted line "${t.text}" is part of the verbatim text`);
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
  assert.ok(rec.font !== null && rec.font.includes(`${Math.round(WELCOME_FLYER.capHeight * 1000)}px`), "cap height 0.06m -> 60px text");
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
});
