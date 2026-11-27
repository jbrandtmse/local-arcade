// Story 2.1 (AC: the recipe renders deterministically): the suite pins the
// authored moon-patrol recipe's buffer LENGTH and the hash-of-samples, so
// any drift in the asset or the renderer goes red. Pure render — contract
// math only, no clock, no WebAudio.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { canonicalSerialize, fnv1a64 } from "../contract/hash.ts";
import type { AttractSound } from "../contract/wrapper.ts";
import { EDGE_FADE_SECONDS, renderAttractLoop } from "./synth.ts";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const recipe: AttractSound = JSON.parse(
  readFileSync(path.join(REPO, "games", "moon-patrol", "assets", "attract-sound.json"), "utf8"),
);

test("authored recipe: pinned loop length and pinned hash of the samples", () => {
  const samples = renderAttractLoop(recipe);
  assert.equal(samples.length, 35280, "round(1.6s * 22050Hz) \u2014 the pinned buffer length");
  assert.equal(fnv1a64(canonicalSerialize(Array.from(samples))), "37285f1eb785d119", "recipe + renderer drift turns this red");
});

test("rendering is deterministic: two renders are bit-identical", () => {
  const a = renderAttractLoop(recipe);
  const b = renderAttractLoop(recipe);
  assert.deepEqual(Buffer.from(a.buffer), Buffer.from(b.buffer));
});

test("the loop seam is silent at both ends and the level stays bounded", () => {
  const samples = renderAttractLoop(recipe);
  // The wrap ramp drives both ends to ~zero (double-ramped note edges
  // land ~1e-5, not bit-exact zero — "silent at the seam", click-free).
  assert.ok(Math.abs(samples[0] ?? 0) < 1e-4, "wrap ramp: the first sample is silent");
  assert.ok(Math.abs(samples[samples.length - 1] ?? 0) < 1e-4, "wrap ramp: the last sample is silent");
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s ?? 0));
  assert.ok(peak > 0.1, "the loop actually sounds");
  assert.ok(peak <= 1, "clamped");
  // Master gain is applied: no sample exceeds sum-of-amps * gain.
  assert.ok(peak <= recipe.gain, "recipe gain bounds the peak");
});

test("the output clamp is EXERCISED: overlapping full-amp notes saturate to exactly ±1", () => {
  // The authored recipe's amps never sum past 1, so the authored render
  // alone leaves the clamp leg dead code. Two identical full-amp triangle
  // notes sum to ~±2 mid-loop: the clamp at the write is what bounds it.
  // Mutation: delete the Math.max/Math.min wrap and these exact pins sail
  // red (the buffer holds out-of-range samples the AudioBuffer accepts).
  const double: AttractSound = {
    sampleRate: 8000,
    loopSeconds: 0.02,
    wave: "triangle",
    gain: 1,
    notes: [
      { start: 0, end: 0.02, freq: 100, amp: 1 },
      { start: 0, end: 0.02, freq: 100, amp: 1 },
    ],
  };
  const s = renderAttractLoop(double);
  let peak = 0;
  for (const x of s) peak = Math.max(peak, Math.abs(x ?? 0));
  assert.equal(peak, 1, "saturated: the peak is pinned at exactly 1");
  assert.ok((s[100] ?? 0) === 1, "the crest sample reads clamped +1 (no clamp: ~2)");
  assert.ok((s[60] ?? 0) === -1, "the trough sample reads clamped -1 (no clamp: ~-2)");
});

test("wave shapes: square flips sign; triangle passes through the asin law", () => {
  // One full-amplitude note spanning the loop: 100 Hz at 8000 Hz
  // sampling. samples[60] sits at phase 3pi/2 (trough), samples[100] at
  // phase 5pi/2 (crest) — both clear of the note ramps (fade is 40, the
  // ramp-free window is samples 40..119).
  const triangle: AttractSound = {
    sampleRate: 8000,
    loopSeconds: 0.02,
    wave: "triangle",
    gain: 1,
    notes: [{ start: 0, end: 0.02, freq: 100, amp: 1 }],
  };
  const tri = renderAttractLoop(triangle);
  assert.ok((tri[60] ?? 0) < -0.999, "triangle trough");
  assert.ok((tri[100] ?? 0) > 0.999, "triangle crest");

  const square: AttractSound = { ...triangle, wave: "square" };
  const sq = renderAttractLoop(square);
  // Square: hard sign of the sine — exactly +/-1 mid-loop.
  assert.ok((sq[60] ?? 0) < -0.999);
  assert.ok((sq[100] ?? 0) > 0.999);
});

test("the wrap ramp length is the authored edge fade (5 ms placeholder)", () => {
  assert.equal(EDGE_FADE_SECONDS, 0.005);
});
