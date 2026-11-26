// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5; owner's own single-author original work).
// Seam edit (the only change): mulberry32 and makeRng gain getState/setState
// (plain uint32 state) so the world rng cursor lives inside snapshot() — AD-4
// requires every rng cursor to be plain and cursor-carrying.

export function mulberry32(seed) {
  let a = seed >>> 0;
  const next = function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.getState = () => a;
  next.setState = (s) => { a = s >>> 0; };
  return next;
}

export function makeRng(seed) {
  const r = mulberry32(seed);
  return {
    next: r,
    range: (min, max) => min + r() * (max - min),
    int: (min, max) => Math.floor(min + r() * (max - min + 1)),
    chance: (p) => r() < p,
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    getState: () => r.getState(),
    setState: (s) => r.setState(s),
  };
}
