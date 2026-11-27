// Story 2.1 (AD-7/AD-18): the attract-loop synth — an authored plain-data
// RECIPE (embedded by the generator, never fetched) rendered into one
// Float32 loop of PCM. Pure and deterministic: contract math only (AD-4
// discipline kept here even though core may use Math — the suite pins the
// sample buffer's length and hash, so the render must be bit-stable),
// no clock, no DOM, no WebAudio. The manager writes the result into one
// AudioBuffer per Cabinet chain.

import * as math from "../contract/math.ts";
import type { AttractSound } from "../contract/wrapper.ts";

/** Linear ramp length at every note edge and at the loop wrap, seconds —
 * keeps square-wave note starts and the loop seam click-free. */
export const EDGE_FADE_SECONDS = 0.005;

/** Render the recipe to `round(loopSeconds * sampleRate)` mono samples,
 * already scaled by the recipe's master gain and clamped to [-1, 1]. */
export function renderAttractLoop(recipe: AttractSound): Float32Array {
  const len = Math.round(recipe.loopSeconds * recipe.sampleRate);
  const out = new Float32Array(len);
  // Note edges and the wrap get a short linear ramp; the wrap ramp keeps
  // sample 0 and the final sample near zero, so a looping source never
  // clicks at the seam regardless of where a note's phase lands.
  const fade = Math.max(1, Math.min(Math.round(EDGE_FADE_SECONDS * recipe.sampleRate), Math.floor(len / 4)));
  for (const note of recipe.notes) {
    const a = Math.max(0, Math.round(note.start * recipe.sampleRate));
    const b = Math.min(len, Math.round(note.end * recipe.sampleRate));
    if (b <= a) continue;
    for (let i = a; i < b; i++) {
      const t = (i - a) / recipe.sampleRate;
      const phase = 2 * math.PI * note.freq * t;
      const shape =
        recipe.wave === "square"
          ? math.sin(phase) >= 0
            ? 1
            : -1
          : math.asin(math.sin(phase)) * (2 / math.PI);
      const inRamp = i - a < fade ? (i - a + 1) / (fade + 1) : 1;
      const outRamp = b - i <= fade ? (b - i) / (fade + 1) : 1;
      out[i] = (out[i] ?? 0) + shape * note.amp * inRamp * outRamp;
    }
  }
  for (let i = 0; i < fade; i++) {
    const ramp = (i + 1) / (fade + 1);
    out[i] = (out[i] ?? 0) * ramp;
    out[len - 1 - i] = (out[len - 1 - i] ?? 0) * ramp;
  }
  for (let i = 0; i < len; i++) {
    out[i] = Math.max(-1, Math.min(1, (out[i] ?? 0) * recipe.gain));
  }
  return out;
}
