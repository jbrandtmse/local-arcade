// Story 1.3 (AC6): the one authored text surface — the Welcome Flyer, a
// stapled era flyer on the front wall right of the door gap (DESIGN.md
// Components: "the single sanctioned 'announcing' artifact, whitelisted as a
// room-sign surface for character lint"). AD-24: every text surface declares
// a kind; this module is the whitelist home the Epic-3 character lint reads.
// The card is drawn onto an injected canvas (surfaces.ts) and texture-mapped
// — never a DOM node.

import { PAPER_CARD } from "./tokens.ts";

/** AD-24 text-surface kinds (whitelist; later stories extend the members). */
export type SignKind = "room-sign";

/** In-world print stock (DESIGN.md token families). */
export type SignStock = "paper-card";

export interface SignSurface {
  id: string;
  kind: SignKind;
  stock: SignStock;
  /** Token hex of the stock (the painter fills the sheet with this). */
  stockHex: number;
  /** World centre of the sheet (y is the sheet centre height). */
  position: { x: number; y: number; z: number };
  /** Which way the readable face points (XZ normal). */
  facing: { x: number; z: number };
  /** Sheet size in metres (0.40 x 0.60, inference - rework pass 1: sized
   * from worst-case fallback-font word widths + margin, height for the
   * 6-line narrow-font wrap at the leading floor; supersedes the A5 sheet
   * of Design Notes item 8, whose canvas clipped the longest split line). */
  width: number;
  height: number;
  /** Minimum legible cap height in metres (room-sign floor >= 60mm). */
  capHeight: number;
  /** Verbatim printed text. The middle dots are U+00B7 (Rule 14: written
   * as escapes, never raw bytes in source). */
  text: string;
}

export const WELCOME_FLYER: SignSurface = {
  id: "welcome-flyer",
  kind: "room-sign",
  stock: "paper-card",
  stockHex: PAPER_CARD,
  // Front wall, right of the door gap (|x| > door half-width 0.5): sheet
  // centre (1.15, 1.45, 6.24), facing into the room (-Z).
  position: { x: 1.15, y: 1.45, z: 6.24 },
  facing: { x: 0, z: -1 },
  width: 0.4,
  height: 0.6,
  capHeight: 0.06, // room-sign floor: cap >= 60mm (DESIGN.md typography)
  text: "MOVE: W A S D \u00b7 LOOK: MOUSE \u00b7 DO: E",
};

/** The one text surface this story authors — a later story that adds one
 * extends this list, and the character-lint count moves with it. */
export const signSurfaces: readonly SignSurface[] = [WELCOME_FLYER];
