// Story 1.3 (AC4/AC7): DESIGN.md color tokens as authored numbers — the
// single home every room module (scene builder, painters, zone hues) reads.
// Hex values are verbatim from the UX DESIGN.md frontmatter; the css strings
// are the same tokens in paint form (Rule 14: derived, never re-typed).
// DOM-free, pure data.

// Room envelope — the dim warm shell; light comes FROM the machines.
/** Room Black: ceiling, unlit upper wall (DESIGN.md `room-black`). */
export const ROOM_BLACK = 0x15110e;
/** Wall Warm: the lit upper wall (DESIGN.md `wall-warm`). */
export const WALL_WARM = 0x2e241d;
/** Wall Panel: wood wainscot (DESIGN.md `wall-panel`). */
export const WALL_PANEL = 0x4a3628;
/** Carpet Base: near-black plum (DESIGN.md `carpet-base`). */
export const CARPET_BASE = 0x221b27;
/** Carpet Pattern: low-contrast octagon/weave (DESIGN.md `carpet-pattern`). */
export const CARPET_PATTERN = 0x3e3046;

// Glow anchors — hues of zone lighting and machine glow, never painted on
// walls (DESIGN.md: "Zone hues as lighting/material identity per zone").
export const GLOW_MARQUEE = 0xffc46b; // amber: the roadmap stretches' hue
export const GLOW_PINK = 0xff4fa3;
export const GLOW_CYAN = 0x5bc8ff;
export const GLOW_GREEN = 0x57e6a3; // Casual Alley
export const GLOW_VIOLET = 0xb07cff; // Pinball Corner
export const GLOW_ORANGE = 0xff9a5c; // Snack Bar
export const GLOW_RED = 0xff6b5e; // the front door
export const GLOW_STEEL = 0x7fb0c9; // Workshop

// In-world print surfaces.
/** Paper Card: aged paper cream — the Welcome Flyer stock (DESIGN.md). */
export const PAPER_CARD = 0xf2e8d4;
/** Card Ink: warm-black print (DESIGN.md `card-ink`). */
export const CARD_INK = 0x2a241c;

// Street side (beyond the front wall) — beyond-fiction-adjacent geometry;
// muted concrete gray is (inference), outside the DESIGN.md token set.
export const STREET_GRAY = 0x57534c;

/** CSS paint form of a token (for canvas painters, Rule 14: derived). */
export function toCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}
