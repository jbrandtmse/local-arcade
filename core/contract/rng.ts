// Seeded RNG injected by the Core wrapper (AD-4). xorshift128+ over four
// 32-bit state words (stored signed in an Int32Array; the "+" output sums
// them unsigned): the state advance is the Marsaglia xorshift128 step and
// the output is the "+" sum (s2 + s3) mod 2^32. The cursor is exposed as a
// plain array of four numbers via getState() so it can live inside
// snapshot() and replay/stateHash cover rng advancement exactly (AD-4).
// All ops here are pure integer arithmetic — identical results on any engine.

export interface Rng {
  /** Float in [0, 1). */
  uniform(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max], inclusive on both ends. */
  rangeInt(min: number, max: number): number;
  /** Uniformly chosen element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Element chosen with probability proportional to weights. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Plain-number cursor: four signed 32-bit integers (Int32 range). Safe for snapshot(). */
  getState(): number[];
  /** Restore the cursor from a getState() array taken from the same generator kind. */
  restore(state: readonly number[]): void;
  /** Re-seed mid-life (used by the autoplay(seed) mode switch, AD-8). */
  reseed(seed: number): void;
}

// splitmix32 — fills the four state words from a single numeric seed.
function mixWord(z: number): number {
  z = (z + 0x9e3779b9) | 0;
  let x = z;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) | 0;
}

const TWO_POW_32 = 4294967296;

export function createRng(seed: number): Rng {
  const s = new Int32Array(4); // s[0..3]: four 32-bit state words
  reseed(seed);

  function reseed(seed: number): void {
    let z = Math.trunc(seed) | 0;
    for (let i = 0; i < 4; i++) {
      z = mixWord(z);
      s[i] = z;
    }
    // All-zero state is a xorshift fixed point; guard against it.
    if (((s[0] as number) | (s[1] as number) | (s[2] as number) | (s[3] as number)) === 0) s[0] = 1;
  }

  function nextWord(): number {
    const s0 = s[0] as number;
    const s1 = s[1] as number;
    const s2 = s[2] as number;
    const s3 = s[3] as number;
    let t = (s0 ^ ((s0 << 11) | 0)) | 0;
    s[0] = s1;
    s[1] = s2;
    s[2] = s3;
    t = (t ^ (t >>> 8)) | 0;
    s[3] = (s3 ^ ((s3 >>> 19) | 0) ^ t) | 0;
    return (((s[2] as number) >>> 0) + ((s[3] as number) >>> 0)) >>> 0; // "+" output
  }

  function uniform(): number {
    return nextWord() / TWO_POW_32;
  }

  return {
    uniform,
    range(min, max) {
      return min + uniform() * (max - min);
    },
    rangeInt(min, max) {
      return min + Math.floor(uniform() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RangeError("rng.pick: empty array");
      return items[Math.floor(uniform() * items.length)] as T;
    },
    weighted<T>(items: readonly T[], weights: readonly number[]): T {
      if (items.length === 0 || items.length !== weights.length) {
        throw new RangeError("rng.weighted: items/weights mismatch");
      }
      let total = 0;
      for (const w of weights) {
        if (!(w >= 0)) throw new RangeError("rng.weighted: negative or NaN weight");
        total += w;
      }
      if (total <= 0) throw new RangeError("rng.weighted: total weight must be positive");
      let roll = uniform() * total;
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i] as number;
        if (roll < 0) return items[i] as T;
      }
      return items[items.length - 1] as T; // float safety net
    },
    getState() {
      return [s[0] as number, s[1] as number, s[2] as number, s[3] as number];
    },
    restore(state) {
      // Hand-authored or replay-fed cursors must be exact signed-int32 words;
      // a fractional or out-of-range value would silently wrap through the
      // Int32Array and fork the stream (AD-4 determinism).
      if (
        state.length !== 4 ||
        state.some((w) => !Number.isInteger(w) || w < -2147483648 || w > 2147483647)
      ) {
        throw new RangeError("rng.restore: cursor must be four signed 32-bit integers");
      }
      s[0] = state[0] as number;
      s[1] = state[1] as number;
      s[2] = state[2] as number;
      s[3] = state[3] as number;
      // Same all-zero fixed-point guard as reseed(): getState() output can
      // never be all-zero (the step is a bijection), so this only trips on a
      // hand-authored or corrupt cursor — fix it deterministically.
      if (((s[0] as number) | (s[1] as number) | (s[2] as number) | (s[3] as number)) === 0) s[0] = 1;
    },
    reseed,
  };
}
