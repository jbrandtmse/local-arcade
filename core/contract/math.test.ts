// AC4 pinning: deterministic math module (AD-4) — pinned output vectors for
// the fixed coefficient set, plus engine-independent invariants. The goldens
// below are this module's own outputs: any coefficient change turns them red.
import test from "node:test";
import assert from "node:assert/strict";
import * as m from "./math.ts";

const GOLDEN: Array<[string, () => number, number]> = [
  ["sin(0.5)", () => m.sin(0.5), 0.479425538604203],
  ["sin(2)", () => m.sin(2), 0.9092974268256817],
  ["cos(0.5)", () => m.cos(0.5), 0.8775825618903728],
  ["sin(pi/2)", () => m.sin(m.PI / 2), 1],
  ["cos(pi)", () => m.cos(m.PI), -1],
  ["sin(-2)", () => m.sin(-2), -0.9092974268256817],
  ["tan(0.5)", () => m.tan(0.5), 0.5463024898437905],
  ["atan2(1,1)", () => m.atan2(1, 1), 0.7853981633971769],
  ["atan2(1,-1)", () => m.atan2(1, -1), 2.356194490192616],
  ["atan2(-1,-1)", () => m.atan2(-1, -1), -2.356194490192616],
  ["atan2(2,3)", () => m.atan2(2, 3), 0.5880026035475657],
  ["atan2(-0.5,4)", () => m.atan2(-0.5, 4), -0.12435499454676142],
  ["asin(0.5)", () => m.asin(0.5), 0.5235987755982987],
  ["acos(0.5)", () => m.acos(0.5), 1.0471975511965979],
  ["asin(-0.9)", () => m.asin(-0.9), -1.1197695149986342],
  ["exp(1)", () => m.exp(1), 2.7182818284548493],
  ["exp(-1)", () => m.exp(-1), 0.36787944117045024],
  ["exp(10)", () => m.exp(10), 22026.465794782824],
  ["exp(-0.5)", () => m.exp(-0.5), 0.6065306597126232],
  ["log(1)", () => m.log(1), 0],
  ["log(2)", () => m.log(2), 0.6931471805599453],
  ["log(0.1)", () => m.log(0.1), -2.302585092994045],
  ["log(123.456)", () => m.log(123.456), 4.815884817283264],
  ["pow(2,10)", () => m.pow(2, 10), 1024],
  ["pow(2,-1)", () => m.pow(2, -1), 0.5],
  ["pow(9,0.5)", () => m.pow(9, 0.5), 2.999999999995829],
  ["pow(2.5,3.5)", () => m.pow(2.5, 3.5), 24.705294220053837],
  ["pow(-8,3)", () => m.pow(-8, 3), -512],
];

test("pinned output vectors (fixed coefficients)", () => {
  for (const [name, fn, expected] of GOLDEN) assert.equal(fn(), expected, name);
});

test("approximations agree with the real functions to 1e-9 (sanity only)", () => {
  for (let x = -6; x <= 6; x += 0.5) {
    assert.ok(Math.abs(m.sin(x) - Math.sin(x)) < 1e-9, `sin(${x})`);
    assert.ok(Math.abs(m.cos(x) - Math.cos(x)) < 1e-9, `cos(${x})`);
    assert.ok(Math.abs(m.sin(x) ** 2 + m.cos(x) ** 2 - 1) < 1e-9, `identity at ${x}`); // two-sided
    assert.ok(Math.abs(m.sin(x) - m.sin(x + 2 * m.PI)) < 1e-9, `period at ${x}`);
  }
  assert.ok(Math.abs(m.atan2(1, 1) - Math.PI / 4) < 1e-9);
  assert.ok(Math.abs(m.asin(0.5) - Math.PI / 6) < 1e-9);
  assert.ok(Math.abs(m.log(m.exp(2)) - 2) < 1e-8);
  assert.ok(Math.abs(m.exp(m.log(5)) - 5) < 1e-7);
});

test("domain and edge behavior is deterministic", () => {
  assert.ok(Number.isNaN(m.asin(2)));
  assert.ok(Number.isNaN(m.acos(-2)));
  assert.ok(Number.isNaN(m.log(-1)));
  assert.equal(m.log(0), -Infinity);
  assert.equal(m.pow(2, 0), 1);
  assert.ok(Number.isNaN(m.pow(-8, 0.5))); // non-integer exponent on a negative base
  assert.equal(m.pow(0, 3), 0);
  assert.equal(m.atan2(0, -1), m.PI);
  assert.equal(m.atan2(0, 1), 0);
});
