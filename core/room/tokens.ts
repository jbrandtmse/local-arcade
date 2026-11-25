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
/** Sign Chalk: the light-on-dark legend family (DESIGN.md `sign-chalk`).
 * 1.4 borrows it for the coin-slot detail (the mockup's bright slot mouth
 * on the dark door) so every material hue stays inside this token set. */
export const SIGN_CHALK = 0xe8e4dd;

// Street side (beyond the front wall) — beyond-fiction-adjacent geometry;
// muted concrete gray is (inference), outside the DESIGN.md token set.
export const STREET_GRAY = 0x57534c;

// 1.4 (inference, STREET_GRAY precedent): the neutral tint a self-lit game
// face (CRT screen, marquee sheet) carries so its painted token hues show
// undistorted — material color multiplies the map, so tinting the screen
// with one glow hue would recolour the OTHER family's lettering (the
// mockup paints attract cyan and NEXT amber on one face). The hue SET
// guard still pins this hex here as its only home.
export const FACE_TINT = 0xffffff;

// Story 1.9 (AC6, UX-DR26): the mockup's outside-fiction panel family —
// the street-door-loading mockup's ui-* tokens, hexes verbatim. The
// workbench panel (core/workbench.ts) is painted from these, and the hue-
// set guard pins each hex's single home at tokens.ts (scene.ts,
// workbench.ts and every other module reference the NAME, never a literal).
/** UI Surface: the workbench panel ground (mockup --ui-surface #191919). */
export const UI_SURFACE = 0x191919;
/** UI Text: the panel heading (mockup --ui-text #EDEDED, ui-heading role). */
export const UI_TEXT = 0xededed;
/** UI Border: the panel frame (mockup --ui-border #2E2E2E). */
export const UI_BORDER = 0x2e2e2e;
/** UI Focus: the Reload affordance (mockup --ui-focus #5BC8FF, ui-body link).
 * Same hex as GLOW_CYAN by mockup design — the guard binds the hex to this
 * file, not to one name. */
export const UI_FOCUS = 0x5bc8ff;
/** Glass Dark / Glass Dim: the door glazing's two-tone sheet (mockup .glass
 * gradient #3a2c20 -> #2a2018) — painted, never emissive (1.3's identity
 * law holds from the street side too). */
export const GLASS_DARK = 0x3a2c20;
export const GLASS_DIM = 0x2a2018;

/** CSS paint form of a token (for canvas painters, Rule 14: derived). */
export function toCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}
