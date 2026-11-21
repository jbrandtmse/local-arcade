// Core deterministic math module (AD-4): the only transcendental surface a
// sim may use, because engine-variable Math.sin/cos/... may differ between
// Node and browsers and every run must replay bit-identically (L1, replay).
// Every function here is built only from + - * /, comparisons, and the
// ECMAScript-exactly-specified helpers (Math.round, Math.floor, Math.abs,
// Math.sqrt, Number.isInteger, Number.isNaN) — IEEE-754 double operations
// with those primitives are identical on every conforming engine.
// The coefficient set below is FIXED; changing any coefficient changes every
// pinned output vector (see math.test.ts) — the outputs are deterministic
// approximations, not nearest-double library values.
// Known exactness boundaries (deterministic on every conforming engine, just
// not nearest-double): sin/cos/tan argument reduction loses accuracy beyond
// |x| ~ 1e15 — keep angles wrapped; atan2's signed-zero branches follow the
// code's branch table, not Math.atan2's (±0 parity is not promised).

export const PI = 3.141592653589793;
export const HALF_PI = 1.5707963267948966;
const LN2 = 0.6931471805599453;
const SQRT2 = 1.4142135623730951;
const INV_SQRT2 = 0.7071067811865476;

// --- sin / cos: quadrant reduction then fixed Taylor polynomials on |r| <= pi/4.
function sinTaylor(r: number): number {
  const r2 = r * r;
  return (
    r *
    (1 +
      r2 *
        (-0.16666666666666666 +
          r2 *
            (0.008333333333333333 +
              r2 *
                (-0.0001984126984126984 +
                  r2 *
                    (2.7557319223985893e-6 +
                      r2 * (-2.505210838544172e-8 + r2 * 1.6059043836821613e-10))))))
  );
}

function cosTaylor(r: number): number {
  const r2 = r * r;
  return (
    1 +
    r2 *
      (-0.5 +
        r2 *
          (0.041666666666666664 +
            r2 *
              (-0.001388888888888889 +
                r2 *
                  (2.48015873015873e-5 +
                    r2 * (-2.755731922398589e-7 + r2 * (2.08767569878681e-9 - r2 * 1.1470745597729725e-11))))))
  );
}

// k = round(x / (pi/2)) quadrant index; r = x - k*(pi/2)
function quadrant(x: number): { q: number; r: number } {
  const k = Math.round(x / HALF_PI);
  const q = ((k % 4) + 4) % 4;
  return { q, r: x - k * HALF_PI };
}

export function sin(x: number): number {
  const { q, r } = quadrant(x);
  const s = sinTaylor(r);
  const c = cosTaylor(r);
  if (q === 0) return s;
  if (q === 1) return c;
  if (q === 2) return -s;
  return -c;
}

export function cos(x: number): number {
  const { q, r } = quadrant(x);
  const s = sinTaylor(r);
  const c = cosTaylor(r);
  if (q === 0) return c;
  if (q === 1) return -s;
  if (q === 2) return -c;
  return s;
}

export function tan(x: number): number {
  return sin(x) / cos(x);
}

// --- atan / atan2: half-angle reduction to |t| <= tan(pi/16), then Taylor.
function atanReduced(t: number): number {
  // t >= 0, finite, <= 1. Two half-angle steps: atan(t) = 2*atan(t/(1+sqrt(1+t^2))),
  // so after two steps the Taylor value must be scaled back by 2^2 = 4.
  for (let i = 0; i < 2; i++) {
    t = t / (1 + Math.sqrt(1 + t * t));
  }
  const t2 = t * t;
  const series =
    t *
    (1 +
      t2 *
        (-1 / 3 + t2 * (1 / 5 + t2 * (-1 / 7 + t2 * (1 / 9 + t2 * (-1 / 11 + t2 * (1 / 13 + t2 * (-1 / 15))))))));
  return 4 * series;
}

function atanSigned(t: number): number {
  if (Number.isNaN(t)) return NaN;
  if (t === Infinity) return HALF_PI;
  if (t === -Infinity) return -HALF_PI;
  if (t >= 0) return t <= 1 ? atanReduced(t) : HALF_PI - atanReduced(1 / t);
  return t >= -1 ? -atanReduced(-t) : -HALF_PI + atanReduced(-1 / t);
}

export function atan2(y: number, x: number): number {
  if (Number.isNaN(y) || Number.isNaN(x)) return NaN;
  if (x === 0 && y === 0) return 0;
  if (x > 0) return atanSigned(y / x);
  if (x < 0) return y >= 0 ? PI + atanSigned(y / x) : -PI + atanSigned(y / x);
  return y > 0 ? HALF_PI : -HALF_PI; // x === 0, y !== 0
}

// --- asin / acos via atan2 + sqrt (sqrt is ECMAScript-exact).
export function asin(x: number): number {
  return atan2(x, Math.sqrt(1 - x * x));
}

export function acos(x: number): number {
  return atan2(Math.sqrt(1 - x * x), x);
}

// --- exp: 2^k * fixed Taylor polynomial on |r| <= ln2/2.
function pow2(k: number): number {
  // exact doubling by squaring; k >= 0
  let result = 1;
  let base = 2;
  let e = k;
  while (e > 0) {
    if (e % 2 === 1) result *= base;
    base *= base;
    e = Math.floor(e / 2);
  }
  return result;
}

export function exp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x === Infinity) return Infinity;
  if (x === -Infinity) return 0;
  const k = Math.round(x / LN2);
  const r = x - k * LN2;
  const p =
    1 +
    r *
      (1 +
        r *
          (0.5 +
            r *
              (0.16666666666666666 +
                r *
                  (0.041666666666666664 +
                    r *
                      (0.008333333333333333 +
                        r *
                          (0.001388888888888889 +
                            r * (0.0001984126984126984 + r * (2.48015873015873e-5 + r * 2.7557319223985893e-6))))))));
  return k >= 0 ? p * pow2(k) : p / pow2(-k);
}

// --- log: scale m into [1/sqrt2, sqrt2], then atanh series; e*ln2 added.
export function log(x: number): number {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  let e = 0;
  let m = x;
  while (m > SQRT2) {
    m /= 2;
    e++;
  }
  while (m < INV_SQRT2) {
    m *= 2;
    e--;
  }
  const u = (m - 1) / (m + 1);
  const u2 = u * u;
  const series =
    u * (1 + u2 * (1 / 3 + u2 * (1 / 5 + u2 * (1 / 7 + u2 * (1 / 9 + u2 * (1 / 11 + u2 * (1 / 13)))))));
  return 2 * series + e * LN2;
}

// --- pow: exact doubling path for small integer exponents, exp(b*log a) otherwise.
export function pow(a: number, b: number): number {
  if (b === 0) return 1;
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  if (Number.isInteger(b) && Math.abs(b) <= 0x7fffffff) {
    let base = a;
    let e = Math.abs(b);
    let result = 1;
    while (e > 0) {
      if (e % 2 === 1) result *= base;
      base *= base;
      e = Math.floor(e / 2);
    }
    return b > 0 ? result : 1 / result;
  }
  if (a === 0) return b > 0 ? 0 : Infinity;
  if (a < 0) return NaN;
  return exp(b * log(a));
}
