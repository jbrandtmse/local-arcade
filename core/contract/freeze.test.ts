// AC4 pinning: write-gated state (AD-15) — mutations allowed only while the
// tick window is open; out-of-window writes throw TypeError.
import test from "node:test";
import assert from "node:assert/strict";
import { createGate, gateDeep, toPlain } from "./freeze.ts";

test("mutations inside the window pass through (nested too)", () => {
  const gate = createGate();
  const state = gateDeep({ x: 0, items: [1, 2], inner: { y: 0 } }, gate);
  gate.open();
  state.x = 5;
  state.inner.y = 3;
  state.items.push(3);
  state.items[0] = 9;
  state.items.length = 2; // length write goes through the set trap
  gate.close();
  assert.equal(state.x, 5);
  assert.equal(state.inner.y, 3);
  assert.deepEqual(state.items, [9, 2]);
});

test("out-of-window writes throw TypeError: set, nested, push, delete, define", () => {
  const gate = createGate();
  const state = gateDeep({ x: 0, items: [1], inner: { y: 0 } }, gate);
  gate.open();
  gate.close();
  assert.throws(() => {
    state.x = 1;
  }, TypeError);
  assert.throws(() => {
    state.inner.y = 1;
  }, TypeError); // nested views are gated as well
  assert.throws(() => state.items.push(2), TypeError);
  assert.throws(() => {
    delete state.items[0];
  }, TypeError);
  assert.throws(() => Object.defineProperty(state, "z", { value: 1 }), TypeError);
  assert.throws(
    () => {
      state.x = 1;
    },
    /outside the tick window/,
  );
});

test("reads stay legal while the gate is closed", () => {
  const gate = createGate();
  const state = gateDeep({ x: 7, inner: { y: 8 } }, gate);
  gate.close();
  assert.equal(state.x, 7);
  assert.equal(state.inner.y, 8);
  assert.deepEqual(Object.keys(state), ["x", "inner"]);
});

test("a reopened window permits mutation again (plain Object.freeze cannot)", () => {
  const gate = createGate();
  const state = gateDeep({ x: 0 }, gate);
  gate.open();
  state.x = 1;
  gate.close();
  gate.open();
  state.x = 2;
  gate.close();
  assert.equal(state.x, 2);
});

test("toPlain rejects the non-plain snapshot types", () => {
  assert.equal(toPlain({ a: [1, "x", true, null] }).a[0], 1);
  assert.throws(() => toPlain(new Map()), TypeError);
  assert.throws(() => toPlain(new Set()), TypeError);
  assert.throws(() => toPlain(new Date()), TypeError);
  assert.throws(() => toPlain(() => 1), TypeError);
  assert.throws(() => toPlain(Number.NaN), TypeError);
  assert.throws(() => toPlain(Infinity), TypeError);
});

test("toPlain rejects cycles but still clones diamonds", () => {
  const cyclic: Record<string, unknown> = { n: 1 };
  cyclic.self = cyclic;
  assert.throws(() => toPlain(cyclic), /cyclic/);
  const arr: unknown[] = [1];
  arr.push(arr);
  assert.throws(() => toPlain(arr), /cyclic/);
  const shared = { v: 1 };
  const cloned = toPlain({ a: shared, b: shared }); // diamond, not a cycle
  assert.deepEqual(cloned, { a: { v: 1 }, b: { v: 1 } });
  assert.notEqual(cloned.a, shared);
});
