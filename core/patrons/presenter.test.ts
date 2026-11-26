// Story 1.6 QA (AC1/AC2): the figure presenter — the kernel reaction
// library and the figure state machine. Pins, at the pure-module tier (the
// real-loop causality rows live in scheduler.test.ts): the authored library
// values, the react/step lifecycle with retirement at the authored duration
// (reactions never loop on their own), the replace-not-stack semantics, the
// offset curve shape (rises then rests, exact zero at rest, no transcendental
// needed — the parabola law), the one reaction per mapped event, and the
// two purity scans AC1/AC2 name: NO figure/Patron/busy carrier anywhere in
// the game's presentation half (the adapter never poses a figure — mutation
// "pose the figure from adapter.js" dies here), no "busy" in the presenter
// (busy IS autoplay, no busy-animation path), and zero wall-clock in the
// core/patrons code (AD-3).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { REACTIONS, createFigurePresenter, type FigureOffset } from "./presenter.ts";
import { playPoseFor } from "../seat.ts";

const REPO = path.resolve(import.meta.dirname, "..", "..");

const REST: FigureOffset = { legsY: 0, torsoY: 0, torsoLean: 0, headY: 0 };

test("the authored reaction library is exactly the Design-Notes-8 authored data, and the gen-registry reaction list is the SAME list (the mapping validator and the library never drift)", () => {
  assert.deepEqual(REACTIONS, {
    flinch: { durationTicks: 12, crouch: 0.08, lean: 0.05, hop: 0 },
    jump: { durationTicks: 30, crouch: 0, lean: 0, hop: 0.35 },
    slam: { durationTicks: 18, crouch: 0.22, lean: 0.1, hop: 0 },
  });
  const gen = readFileSync(path.join(REPO, "tools", "gen-registry.mjs"), "utf8");
  const m = /const REACTIONS = \[([^\]]*)\]/.exec(gen);
  assert.ok(m, "tools/gen-registry.mjs declares its own REACTIONS validation list");
  const names = [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]).sort();
  assert.deepEqual(names, Object.keys(REACTIONS).sort(), "validator list and library keys are one set — an impulse mapping can only name a real reaction");
});

test("react/step lifecycle: state at react time, live while under duration, retired EXACTLY at the authored duration, and never self-restarts", () => {
  const p = createFigurePresenter();
  assert.deepEqual(p.state(), { reaction: null, startTick: -1, elapsedTicks: 0 }, "boots idle");
  assert.deepEqual(p.figureOffset(), REST, "at rest the figure stands unoffset");
  p.react("jump", 100);
  assert.deepEqual(p.state(), { reaction: "jump", startTick: 100, elapsedTicks: 0 });
  for (let e = 1; e < 30; e++) {
    p.step(100 + e);
    assert.deepEqual(p.state(), { reaction: "jump", startTick: 100, elapsedTicks: e }, `tick ${100 + e}: live at elapsed ${e}`);
  }
  p.step(130); // elapsed 30 === durationTicks
  assert.deepEqual(p.state(), { reaction: null, startTick: -1, elapsedTicks: 0 }, "retired at the authored duration — no canned loop");
  assert.deepEqual(p.figureOffset(), REST, "offset zero again the moment the reaction retires");
  for (const t of [131, 200, 1000]) {
    p.step(t);
    assert.equal(p.state().reaction, null, "step never restarts a retired reaction");
  }
});

test("a fresh mapped event REPLACES the live one (one reaction per event, no stacking, no queue)", () => {
  const p = createFigurePresenter();
  p.react("flinch", 10);
  p.step(14);
  assert.equal(p.state().elapsedTicks, 4, "flinch live at elapsed 4");
  p.react("jump", 15);
  assert.deepEqual(p.state(), { reaction: "jump", startTick: 15, elapsedTicks: 0 }, "replaced: the fresh event owns the state, elapsed resets");
  p.step(20);
  assert.deepEqual(p.state(), { reaction: "jump", startTick: 15, elapsedTicks: 5 }, "the replacement, not the replaced, advances");
});

test("offset curves: rise then rest inside the span, exact amplitudes at the peak, sign law per reaction, and a pure read (offset() mutates nothing)", () => {
  const sample = (kind: keyof typeof REACTIONS): { off: FigureOffset[]; def: (typeof REACTIONS)[keyof typeof REACTIONS] } => {
    const p = createFigurePresenter();
    p.react(kind, 0);
    const def = REACTIONS[kind];
    const off: FigureOffset[] = [];
    for (let e = 0; e < def.durationTicks; e++) {
      p.step(e);
      const a = p.figureOffset();
      const b = p.figureOffset();
      assert.deepEqual(a, b, `${kind} elapsed ${e}: figureOffset is a pure read`);
      assert.ok(a.headY === a.torsoY, `${kind} elapsed ${e}: head rides the torso exactly`);
      off.push(a);
    }
    return { off, def };
  };
  const shape = (vals: number[]): void => {
    let peak = 0;
    for (let i = 1; i < vals.length; i++) if (Math.abs(vals[i]!) > Math.abs(vals[peak]!)) peak = i;
    assert.ok(peak > 0 && peak < vals.length - 1, "the curve peaks inside the span (starts small, ends small)");
    for (let i = 1; i < vals.length; i++) {
      const rising = Math.abs(vals[i]!) >= Math.abs(vals[i - 1]!);
      const falling = Math.abs(vals[i]!) <= Math.abs(vals[i - 1]!);
      if (i <= peak) assert.ok(rising, `|curve| rises to the peak (step ${i})`);
      else assert.ok(falling, `|curve| settles after the peak (step ${i})`);
    }
  };

  // flinch: upper-body crouch + lean, feet planted, peak amplitude within 1%
  // of the authored 0.08m / 0.05m.
  const fl = sample("flinch");
  shape(fl.off.map((o) => o.torsoLean));
  for (const o of fl.off) {
    assert.equal(o.legsY, 0, "flinch never lifts the figure");
    assert.ok(o.torsoY < 0 && o.headY < 0, "the upper body rides DOWN");
    assert.ok(o.torsoLean > 0, "lean along the facing");
    assert.ok(o.torsoY >= -REACTIONS.flinch.crouch, "never deeper than the authored crouch");
    assert.ok(o.torsoLean <= REACTIONS.flinch.lean, "never past the authored lean");
  }
  assert.ok(Math.max(...fl.off.map((o) => -o.torsoY)) > 0.99 * REACTIONS.flinch.crouch, "the flinch reaches its authored amplitude (a curve that never peaks is dead animation)");

  // jump: whole-body hop, feet AND body rise together, peak ~0.35m.
  const j = sample("jump");
  shape(j.off.map((o) => o.legsY));
  for (const o of j.off) {
    assert.ok(o.legsY > 0 && o.torsoY > 0, "hop lifts the whole figure");
    assert.equal(o.torsoLean, 0, "jump carries no lean");
    assert.ok(o.torsoY <= REACTIONS.jump.hop, "never above the authored hop amplitude");
  }
  assert.ok(Math.max(...j.off.map((o) => o.legsY)) > 0.99 * REACTIONS.jump.hop, "the hop reaches 0.35 m at its peak");

  // slam: deeper upper-body down arc with a forward lean (game over settle).
  const s = sample("slam");
  shape(s.off.map((o) => o.torsoLean));
  for (const o of s.off) {
    assert.equal(o.legsY, 0, "slam stays planted");
    assert.ok(o.torsoY < 0, "upper body down");
    assert.ok(o.torsoY >= -REACTIONS.slam.crouch, "never deeper than the authored down amplitude");
    assert.ok(o.torsoLean > 0 && o.torsoLean <= REACTIONS.slam.lean, "with the authored lean");
  }
  assert.ok(Math.max(...s.off.map((o) => -o.torsoY)) > 0.99 * REACTIONS.slam.crouch, "the slam reaches its 0.22 m settle depth");
});

test("an unknown reaction name dies loudly at the library — the only names the mapping may target are the three authored ones", () => {
  const p = createFigurePresenter();
  const loose = p as unknown as { react(kind: string, tick: number): void };
  for (const bad of ["shrug", "", "Flinch", "flinch "]) {
    assert.throws(() => loose.react(bad, 5), /not a kernel reaction/, `"${bad}" is not a kernel reaction`);
  }
  p.react("jump", 5);
  assert.throws(() => loose.react("shrug", 6), /not a kernel reaction/);
  assert.deepEqual(p.state(), { reaction: "jump", startTick: 5, elapsedTicks: 0 }, "a rejected name leaves the live reaction untouched");
});

test("the figure stands at the seat's authored play pose — playPoseFor reused, not copied (Design Notes 9)", () => {
  const p = createFigurePresenter();
  assert.deepEqual(p.figurePose("cabinet-B0"), playPoseFor("cabinet-B0"));
});

test("purity scans (AC1/AC2): no figure/Patron/busy carrier in the game's presentation half, no busy string in the presenter, zero wall-clock in core/patrons (the adapter never poses a figure; busy IS autoplay; AD-3)", () => {
  const presDir = path.join(REPO, "games", "moon-patrol", "presentation");
  const sources = readdirSync(presDir).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"));
  assert.ok(sources.length >= 1, "the presentation half has sources to scan");
  for (const file of sources) {
    const src = readFileSync(path.join(presDir, file), "utf8");
    for (const banned of [/figure/i, /patron/i, /busy/i]) {
      assert.ok(!banned.test(src), `games/moon-patrol/presentation/${file} must not carry ${banned} — the adapter never poses a figure and no busy-animation path exists (AD-23)`);
    }
  }
  for (const mod of ["presenter.ts", "scheduler.ts"]) {
    const src = readFileSync(path.join(REPO, "core", "patrons", mod), "utf8");
    for (const banned of ["performance.now", "Date.now", "Math.random"]) {
      assert.ok(!src.includes(banned), `core/patrons/${mod} must not read ${banned} (figure/scheduler state is kernel tick state, AD-3)`);
    }
  }
  const presenterSrc = readFileSync(path.join(REPO, "core", "patrons", "presenter.ts"), "utf8");
  assert.ok(!/busy/i.test(presenterSrc), "the presenter animation carrier carries no busy string beyond reaction data (AC1: no separate busy animation exists)");
});
