// AC4 pinning: seeded rng determinism, cursor round-trip, distribution rules.
import test from "node:test";
import assert from "node:assert/strict";
import { createRng } from "./rng.ts";

test("same seed replays the identical uniform stream", () => {
  const a = createRng(12345);
  const b = createRng(12345);
  for (let i = 0; i < 100; i++) assert.equal(a.uniform(), b.uniform());
});

test("golden uniform vector (seed 42)", () => {
  const r = createRng(42);
  const got = Array.from({ length: 8 }, () => r.uniform());
  assert.deepEqual(got, [
    0.04360594414174557, 0.5493816318921745, 0.27647697157226503, 0.9605064326897264, 0.763036270160228,
    0.9555219784379005, 0.41126475343480706, 0.44269083510152996,
  ]);
});

test("golden rangeInt vector (seed 1234)", () => {
  const r = createRng(1234);
  assert.deepEqual(
    Array.from({ length: 6 }, () => r.rangeInt(1, 6)),
    [2, 6, 1, 3, 2, 6],
  );
});

test("golden initial cursor (seed 7)", () => {
  assert.deepEqual(createRng(7).getState(), [-456573687, 236867408, -883549188, 1676023122]);
});

test("uniform stays in [0,1) and range/rangeInt honor bounds", () => {
  const r = createRng(99);
  for (let i = 0; i < 500; i++) {
    const u = r.uniform();
    assert.ok(u >= 0 && u < 1);
    const f = r.range(-2.5, 7.5);
    assert.ok(f >= -2.5 && f < 7.5);
    const n = r.rangeInt(3, 7);
    assert.ok(Number.isInteger(n) && n >= 3 && n <= 7);
  }
});

test("pick and weighted draw from the injected stream", () => {
  const r = createRng(5);
  assert.throws(() => r.pick([]), RangeError);
  for (let i = 0; i < 50; i++) assert.ok(["a", "b", "c"].includes(r.pick(["a", "b", "c"])));
  for (let i = 0; i < 50; i++) assert.equal(r.weighted(["only", "never"], [1, 0]), "only");
  let counts = { a: 0, b: 0 };
  const w = createRng(11);
  for (let i = 0; i < 400; i++) counts[w.weighted(["a", "b"], [3, 1]) as "a" | "b"] += 1;
  assert.ok(counts.a > counts.b * 1.5); // 3:1 weight shows up
  assert.throws(() => w.weighted(["a"], [-1]), RangeError);
});

test("cursor round-trip: getState -> restore reproduces the stream exactly", () => {
  const r = createRng(2024);
  for (let i = 0; i < 10; i++) r.uniform();
  const cursor = r.getState();
  assert.deepEqual(cursor.map((w) => typeof w), ["number", "number", "number", "number"]); // plain numbers
  const future = Array.from({ length: 12 }, () => r.uniform());
  r.restore(cursor);
  const replayed = Array.from({ length: 12 }, () => r.uniform());
  assert.deepEqual(replayed, future);
  assert.throws(() => r.restore([1, 2, 3]), RangeError);
});

test("restore rejects malformed cursors and never re-admits the all-zero fixed point", () => {
  const r = createRng(3);
  assert.throws(() => r.restore([1, 2, 3, Infinity]), RangeError);
  r.restore([0, 0, 0, 0]); // guard: state must not stick at the xorshift fixed point
  assert.notDeepEqual(r.getState(), [0, 0, 0, 0]);
  const other = createRng(4);
  other.restore([0, 0, 0, 0]);
  for (let i = 0; i < 10; i++) assert.equal(r.uniform(), other.uniform()); // deterministic, same both
});

test("restore enforces exact signed-int32 words (fractional/out-of-range cursors would fork the stream)", () => {
  const r = createRng(8);
  assert.throws(() => r.restore([0.5, 1, 2, 3]), RangeError);
  assert.throws(() => r.restore([2147483648, 0, 0, 0]), RangeError);
  assert.throws(() => r.restore([-2147483649, 0, 0, 0]), RangeError);
  assert.throws(() => r.restore([NaN, 0, 0, 0]), RangeError);
  const cur = createRng(17).getState();
  assert.ok(cur.some((w) => w < 0)); // getState words are signed int32 (documented contract)
  r.restore(cur);
  assert.deepEqual(r.getState(), cur); // and the boundary-exact round-trip works
});

test("reseed reproduces a fresh stream from the same seed", () => {
  const r = createRng(1);
  for (let i = 0; i < 7; i++) r.uniform();
  r.reseed(9);
  const fresh = createRng(9);
  for (let i = 0; i < 20; i++) assert.equal(r.uniform(), fresh.uniform());
});
