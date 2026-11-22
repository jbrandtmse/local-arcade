// Story 1.3 (AC4): the four fixed zones (AD-25: Zones are core/room-owned
// architecture, never placed by the Layout System) with their authored hue
// lighting. Rects are converted from the floor plan's rectangles to metres
// (plan x in [42,1118] -> 19m, z in [42,758] -> 12.5m) and rounded — (inference
// within the fixed corner contract, spec Design Notes item 4). Hues equal the
// DESIGN.md glow-anchor hexes exactly (tokens.ts): zone identity is LIGHT,
// never painted glow and never UI chrome.
//
// This story authors zone data + provisional lighting identity only: no zone
// fixtures/furniture (Epics 4-7) and no zone interactions (AD-25 owns those;
// Epic 2 rides these ids for zone audio).

import {
  GLOW_GREEN,
  GLOW_MARQUEE,
  GLOW_ORANGE,
  GLOW_STEEL,
  GLOW_VIOLET,
} from "./tokens.ts";

export interface ZoneRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ZoneLight {
  x: number;
  y: number;
  z: number;
  /** Token hex of the light's colour (a DESIGN.md glow anchor). */
  hue: number;
}

export interface Zone {
  id: string;
  rect: ZoneRect;
  /** Zone identity hue (token hex) — lighting/material identity per zone. */
  hue: number;
  /** Provisional identity light: one point light hung at ceiling height
   * over the rect centre (inference, spec Design Notes item 7). */
  light: ZoneLight;
}

/** Ceiling hang height for zone lighting (inference, Design Notes item 7). */
export const ZONE_LIGHT_Y = 2.8;
/** PointLight reach / intensity for zone identity lights (inference, tuned
 * by eye at the lead's smoke — "readable at 6m" is the smoke check). */
export const ZONE_LIGHT_DISTANCE = 8;
export const ZONE_LIGHT_INTENSITY = 3.0;

/** Pinball Corner — back-left, violet. */
export const PINBALL_CORNER: Zone = {
  id: "pinball-corner",
  rect: { minX: -9.5, maxX: -5.0, minZ: -6.25, maxZ: -3.9 },
  hue: GLOW_VIOLET,
  light: { x: -7.25, y: ZONE_LIGHT_Y, z: -5.075, hue: GLOW_VIOLET },
};

/** Workshop — back-right, steel. */
export const WORKSHOP: Zone = {
  id: "workshop",
  rect: { minX: 5.5, maxX: 9.5, minZ: -6.25, maxZ: -4.0 },
  hue: GLOW_STEEL,
  light: { x: 7.5, y: ZONE_LIGHT_Y, z: -5.125, hue: GLOW_STEEL },
};

/** Snack Bar — front-right, orange. */
export const SNACK_BAR: Zone = {
  id: "snack-bar",
  rect: { minX: 5.5, maxX: 9.5, minZ: 4.5, maxZ: 6.25 },
  hue: GLOW_ORANGE,
  light: { x: 7.5, y: ZONE_LIGHT_Y, z: 5.375, hue: GLOW_ORANGE },
};

/** Casual Alley — mid-right, green; kept clean in v1 (no slot, no blocking
 * volume inside — the matrix pins it). */
export const CASUAL_ALLEY: Zone = {
  id: "casual-alley",
  rect: { minX: 4.5, maxX: 8.0, minZ: 1.2, maxZ: 3.0 },
  hue: GLOW_GREEN,
  light: { x: 6.25, y: ZONE_LIGHT_Y, z: 2.1, hue: GLOW_GREEN },
};

export const zones: readonly Zone[] = [PINBALL_CORNER, WORKSHOP, SNACK_BAR, CASUAL_ALLEY];

/** Roadmap identity: amber glow-marquee over the unfilled front stretches,
 * deliberately outside the Snack Bar and Casual Alley rects so hues do not
 * cross zones (inference, spec Design Notes items 4-5). */
export interface RoadmapLighting {
  hue: number;
  lights: readonly ZoneLight[];
}

export const roadmap: RoadmapLighting = {
  hue: GLOW_MARQUEE,
  lights: [
    { x: -8.6, y: ZONE_LIGHT_Y, z: 3.5, hue: GLOW_MARQUEE },
    { x: 8.6, y: ZONE_LIGHT_Y, z: 2.8, hue: GLOW_MARQUEE },
  ],
};
