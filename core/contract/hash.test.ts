// AC4 pinning: canonical serialization + FNV-1a 64-bit (AD-5 stateHash currency).
import test from "node:test";
import assert from "node:assert/strict";
import { canonicalSerialize, fnv1a64, stateHashOf } from "./hash.ts";

test("canonicalSerialize sorts keys at every depth, keeps array order", () => {
  assert.equal(canonicalSerialize({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(
    canonicalSerialize({ z: [3, { b: 2, a: 1 }], a: null }),
    '{"a":null,"z":[3,{"a":1,"b":2}]}',
  );
  assert.equal(canonicalSerialize(null), "null");
  assert.equal(canonicalSerialize(0.1), "0.1");
  assert.equal(canonicalSerialize(-0), "0");
  const ellipsisName = "a" + String.fromCharCode(0x2026) + "b"; // non-ASCII via codepoint, no literal bytes (Rule 14)
  assert.equal(canonicalSerialize(ellipsisName), JSON.stringify(ellipsisName));
});

test("FNV-1a 64 against the published reference vectors", () => {
  assert.equal(fnv1a64(""), "cbf29ce484222325");
  assert.equal(fnv1a64("a"), "af63dc4c8601ec8c");
  // "foobar" pinned to the reference FNV-1a 64 value (verified independently
  // against a second implementation; it is NOT the FNV-1 vector 340d8765...).
  assert.equal(fnv1a64("foobar"), "85944171f73967e8");
});

test("stateHash is key-order invariant and value sensitive", () => {
  const h1 = stateHashOf({ a: 1, b: { c: 2, d: 3 } });
  const h2 = stateHashOf({ b: { d: 3, c: 2 }, a: 1 });
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{16}$/);
  assert.notEqual(h1, stateHashOf({ a: 1, b: { c: 2, d: 4 } }));
  assert.notEqual(h1, stateHashOf({ a: 1, b: { c: 2, d: 3 }, e: 5 }));
});

test("non-plain state is rejected (snapshot contract)", () => {
  assert.throws(() => canonicalSerialize(Number.NaN), TypeError);
  assert.throws(() => canonicalSerialize(() => 1), TypeError);
  assert.throws(() => canonicalSerialize(new Date()), TypeError);
  assert.throws(() => canonicalSerialize({ a: 1, b: undefined }), TypeError); // not silently dropped
  assert.throws(() => canonicalSerialize([undefined]), TypeError);
});

test("cycles and sparse arrays throw instead of serializing to malformed JSON", () => {
  const cyclic: Record<string, unknown> = { n: 1 };
  cyclic.self = cyclic;
  assert.throws(() => canonicalSerialize(cyclic), /cyclic/);
  const arr: unknown[] = [1];
  arr.push(arr);
  assert.throws(() => canonicalSerialize(arr), /cyclic/);
  const shared = { v: 1 }; // diamond is not a cycle: clones fine
  assert.equal(canonicalSerialize({ a: shared, b: shared }), '{"a":{"v":1},"b":{"v":1}}');
  const holey: unknown[] = [1];
  holey.length = 3; // holes at 1 and 2 — map() would emit "null", corrupting the hash's input shape
  assert.throws(() => canonicalSerialize(holey), /sparse/);
});

test("symbol keys are rejected, not silently dropped from the hash", () => {
  assert.throws(() => canonicalSerialize({ [Symbol.iterator]: 1, a: 1 }), /symbol keys/);
});
