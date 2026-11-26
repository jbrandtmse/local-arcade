// AC7 pinning: sim-path lint bans fail each banned API fixture naming rule +
// location, pass clean sources, and stay scoped to games/*/sim/**.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.resolve(import.meta.dirname, "lint-bans.mjs");
const REPO = path.resolve(import.meta.dirname, "..");

function run(rootDir: string): { ok: boolean; stderr: string } {
  try {
    execFileSync(process.execPath, [SCRIPT, "--root", rootDir], { encoding: "utf8" });
    return { ok: true, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    return { ok: false, stderr: e.stderr ?? "" };
  }
}

function fixtureGames(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "lint-bans-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}

test("every banned API in a sim path goes red, naming rule and location", () => {
  const dir = fixtureGames({
    "games/rand/sim/r.js": "export function createSim() { return Math.random(); }\n",
    "games/time/sim/t.js": "const a = Date.now(); const b = performance.now(); export { a, b };\n",
    "games/trig/sim/m.js": "export const s = Math.sin(1);\nexport const p = Math.pow(2, 8);\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), "Math.random rule");
  assert.ok(result.stderr.includes("no-date-now"), "Date.now rule");
  assert.ok(result.stderr.includes("no-performance-now"), "performance.now rule");
  assert.ok(result.stderr.includes("no-engine-transcendental (Math.sin"), "Math.sin rule");
  assert.ok(result.stderr.includes("no-engine-transcendental (Math.pow"), "Math.pow rule");
  assert.match(result.stderr, /games[/\\]rand[/\\]sim[/\\]r\.js:1:/); // location cited
  assert.match(result.stderr, /games[/\\]time[/\\]sim[/\\]t\.js:1:/);
});

test("all nine engine transcendentals are banned", () => {
  const dir = fixtureGames({
    "games/trigs/sim/all.js":
      "const x = [Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan2, Math.pow, Math.exp, Math.log];\nexport default x;\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  for (const fn of ["sin", "cos", "tan", "asin", "acos", "atan2", "pow", "exp", "log"]) {
    assert.ok(result.stderr.includes(`no-engine-transcendental (Math.${fn}`), `missing ban: ${fn}`);
  }
});

test("clean sim sources pass, and the ban scope is sim-only", () => {
  const dir = fixtureGames({
    "games/clean/sim/ok.js":
      "export function createSim() { return { tick() { const v = 1 + 2 * 3 / 4 - 5; return v < Math.floor(1.5) ? 0 : 1; } }; }\n",
    // presentation half is NOT linted by this sim-path config (L0 full sweep is Epic 3)
    "games/pres/presentation/p.js": "export const r = Math.random();\n",
  });
  const result = run(dir);
  assert.equal(result.ok, true, result.stderr);
  assert.equal(result.stderr, "");
});

// Story 1.10 (DW-1, AC1): the gate binds forms, not spellings — bracket
// access and optional chains hit the same rules; destructuring renames but
// does not launder; bare wall-clock globals alias regardless of member.
test("bracket-access and optional-chain evasions go red naming the same rules", () => {
  const dir = fixtureGames({
    "games/bracket/sim/b.js":
      'const a = Math["random"]; const b = Math["sin"]; const c = Date["now"]; const t = Math[`random`]; export { a, b, c, t };\n',
    "games/optchain/sim/o.js": "const a = Math?.random; const b = Date?.now; export { a, b };\n",
    // the two named forms COMPOSED: optional chain into a subscript
    "games/optbracket/sim/ob.js": 'const a = Math?.["random"]; export { a };\n',
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), 'Math["random"] / Math?.random / Math[`random`] rule');
  assert.ok(result.stderr.includes("no-engine-transcendental (Math.sin"), 'Math["sin"] rule');
  assert.ok(result.stderr.includes("no-date-now"), "Date[\"now\"] / Date?.now rule");
  assert.match(result.stderr, /games[/\\]bracket[/\\]sim[/\\]b\.js:1:/); // location cited
  assert.match(result.stderr, /games[/\\]optchain[/\\]sim[/\\]o\.js:1:/);
  assert.match(result.stderr, /games[/\\]optbracket[/\\]sim[/\\]ob\.js:1:/);
});

test("destructured globals go red; renaming the binding does not launder the source name", () => {
  const dir = fixtureGames({
    "games/destructure/sim/d.js":
      "const { random } = Math;\nconst { random: r } = Math;\nconst { now: t } = Date;\nexport { random, r, t };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), "{ random } = Math and { random: r } = Math");
  assert.ok(result.stderr.includes("no-date-now"), "{ now: t } = Date");
  assert.match(result.stderr, /games[/\\]destructure[/\\]sim[/\\]d\.js:/);
});

test("wall-clock forms go red: new Date(), bare Date(), aliased Date, bare performance, division operands", () => {
  const dir = fixtureGames({
    "games/wallclock/sim/w.js":
      "const a = new Date(); const b = Date(); const d = Date; const p = performance; const scale = 60000 / Date; const inv = performance / 2; export { a, b, d, p, scale, inv };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-date-use"), "no-date-use rule");
  assert.ok(result.stderr.includes("no-performance-use"), "no-performance-use rule");
  assert.match(result.stderr, /games[/\\]wallclock[/\\]sim[/\\]w\.js:1:/);
});

// Story 1.10 (DW-1) review hardening: the value receivers (globalThis/
// window) must not launder wall-clock access — dotted, bracket, and
// destructure-member spellings of Date/performance all reach the gate.
test("wall-clock reached through globalThis/window members goes red (dotted, bracket, destructure)", () => {
  const dir = fixtureGames({
    "games/globalclock/sim/g.js":
      'const d = globalThis.Date; const p = window.performance; const e = globalThis["Date"]; const { random } = window.Math; const q = globalThis.Date.now(); const w = window.performance.now(); export { d, p, e, random, q, w };\n',
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-date-use"), 'globalThis.Date and globalThis["Date"]');
  assert.ok(result.stderr.includes("no-performance-use"), "window.performance");
  assert.ok(result.stderr.includes("no-math-random"), "{ random } = window.Math");
  assert.ok(result.stderr.includes("no-date-now"), "globalThis.Date.now()");
  assert.ok(result.stderr.includes("no-performance-now"), "window.performance.now()");
  assert.match(result.stderr, /games[/\\]globalclock[/\\]sim[/\\]g\.js:1:/);
  const summaries = [...result.stderr.matchAll(/lint-bans: (\d+) banned-API use\(s\)/g)];
  assert.equal(summaries.length, 1, "exactly one summary line");
  assert.equal(
    Number(summaries[0]![1]),
    6,
    "six uses, six hits — the value-receiver CHAIN forms (globalThis.Date.now(), window.performance.now()) are single-owner like L4: the wall-clock-use rule does not double-report them",
  );
});

// QA (Story 1.10, DW-1 gap): the patched legs — positional regex masking,
// the composed ?.["prop"] subscript tolerance, and the division-preserving
// slash — COMPOSE on one line. Masking must not swallow the rest of the
// line, the tolerance must not disturb the division that follows, and a
// slash after ")" must read as division, not a regex opener. The line holds
// exactly three real references (and the bracket Date["now"] hits exactly
// once, not bare+bracket double); the regex body and the divisions are inert.
test("compound one-liner: regex masking, the composed ?.['prop'] evasion, and division coexist — exactly the three real hits, each single", () => {
  const dir = fixtureGames({
    "games/compound/sim/c.js":
      'export const v = (6000 + 400) / 100; const r = Math?.["random"] / 8; const re = /Date.now/; const scale = 60000 / Date?.["now"]; const d = Date["now"]; export { v, r, re, scale, d };\n',
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), 'composed Math?.["random"] hit');
  assert.ok(result.stderr.includes("no-date-now"), 'composed Date?.["now"] and bracket Date["now"] hits');
  assert.match(result.stderr, /games[/\\]compound[/\\]sim[/\\]c\.js:1:/);
  const summaries = [...result.stderr.matchAll(/lint-bans: (\d+) banned-API use\(s\)/g)];
  assert.equal(summaries.length, 1, "exactly one summary line");
  assert.equal(
    Number(summaries[0]![1]),
    3,
    'exactly the three real references hit — Math?.["random"], Date?.["now"], and (single, not bare+bracket double) Date["now"]; the /Date.now/ body and the division slashes contribute nothing',
  );
});

// QA (Story 1.10, DW-1 gap): the destructure leg's receiver spellings
// compose — a renamed binding on a member source, the wall-clock globals
// pulled out of globalThis/window directly (the bare/chain legs are
// guarded at these positions, so ONLY the destructure leg flags them),
// and the bracket-member source spelling. One fixture per spelling: each
// file's location pin holds its own leg.
test("destructured wall-clock members: renamed binding, globalThis/window sources, and the bracket-member spelling each hit the destructure leg", () => {
  const dir = fixtureGames({
    "games/destrename/sim/a.js": "const { random: r } = window.Math; export { r };\n",
    "games/destmember/sim/b.js": "const { now: t } = globalThis.Date; export { t };\n",
    "games/destglobal/sim/c.js": "const { Date: D } = window; export { D };\n",
    "games/destglobalperf/sim/d.js": "const { performance: perf } = globalThis; export { perf };\n",
    "games/destbracket/sim/e.js": 'const { now: t } = window["performance"]; export { t };\n',
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), "{ random: r } = window.Math — renaming plus a value-receiver source does not launder");
  assert.ok(result.stderr.includes("no-date-now"), "{ now: t } = globalThis.Date — member source resolves through globalThis");
  assert.ok(result.stderr.includes("no-date-use"), "{ Date: D } = window — pulling the wall-clock global itself out");
  assert.ok(result.stderr.includes("no-performance-use"), "{ performance: perf } = globalThis");
  assert.ok(result.stderr.includes("no-performance-now"), '{ now: t } = window["performance"] — bracket-member source');
  assert.match(result.stderr, /games[/\\]destrename[/\\]sim[/\\]a\.js:/);
  assert.match(result.stderr, /games[/\\]destmember[/\\]sim[/\\]b\.js:/);
  assert.match(result.stderr, /games[/\\]destglobal[/\\]sim[/\\]c\.js:/); // destructure-leg-only witness
  assert.match(result.stderr, /games[/\\]destglobalperf[/\\]sim[/\\]d\.js:/); // destructure-leg-only witness
  assert.match(result.stderr, /games[/\\]destbracket[/\\]sim[/\\]e\.js:/);
});

// Review (Story 1.10): the three rule streams merge into ONE per-file
// stream sorted by source position (the merged-stream contract — "every
// file's stream stays sorted by source position, like the single-pass
// scanner it replaces"). A line where the bare rule fires EARLIER than a
// chain hit is the only shape that can see the sort: the plain
// accessHits-then-bareWallclockHits concatenation would report the chain
// hit first.
test("merged hits report in source order: the earlier bare hit is named before the later chain hit", () => {
  const dir = fixtureGames({
    "games/hitorder/sim/h.js": "const b = Date; const a = Date.now(); export { a, b };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  const cols = [...result.stderr.matchAll(/games[/\\]hitorder[/\\]sim[/\\]h\.js:1:(\d+): (no-[\w-]+)/g)]
    .map((m) => [Number(m[1]), m[2]] as const);
  assert.deepEqual(
    cols,
    [[11, "no-date-use"], [27, "no-date-now"]],
    "the bare Date (col 11) is reported before the later Date.now chain (col 27) — the position sort owns the order, not the rule-leg order",
  );
});

test("sanctioned forms stay green: Math-as-value, Math.floor, regex literals and comments", () => {
  const dir = fixtureGames({
    // mirrors games/moon-patrol/sim/helpers.js: the vendored world is handed
    // globalThis.Math as a VALUE (the sanctioned form); regex literals whose
    // text names banned APIs and comment prose must never match.
    "games/sanctioned/sim/s.js": [
      "// the vendored world requires opts.math; tests hand it the host Math as a value;",
      "// comments naming Math.random, Date.now and new Date() are trivia, never hits",
      "export function createWorld(opts = {}) { return { math: globalThis.Math, ...opts }; }",
      "export const f = Math.floor(1.5);",
      // mirrors games/moon-patrol/sim/autoplay.test.js:70 exactly — pattern
      // text naming banned APIs is regex text, never a reference
      'export const banned = [/Math\\s*\\.\\s*random/, /Date\\s*\\.\\s*now|new\\s+Date/];',
      // sanctioned Math-as-value also reached through the receivers, and unescaped
      // dotted regex bodies (masked by scanTokens, not by escape spacing)
      "const m = globalThis.Math; const fl = Math.floor(m.LN2); const { Math } = globalThis;",
      "export const re1 = /Date.now/; export const re2 = /Math.random/g;",
    ].join("\n") + "\n",
  });
  const result = run(dir);
  assert.equal(result.ok, true, result.stderr);
  assert.equal(result.stderr, "");
});

// QA (Story 1.10, DW-1 gap): the bare wall-clock rule's colon guard (M4) —
// a property key or label NAMED `Date`/`performance` is not a value
// reference at runtime. No fixture pinned this when the guard landed in the
// implement review pass; this is that pin.
test("sanctioned spelling: object-literal property keys named Date/performance stay green (bare-rule colon guard)", () => {
  const dir = fixtureGames({
    "games/propkeys/sim/p.js": 'export const cfg = { Date: "attract", performance: 1, random: 2 }; export default cfg;\n',
  });
  const result = run(dir);
  assert.equal(result.ok, true, result.stderr);
  assert.equal(result.stderr, "");
});

// Real-repo witness (matrix row 4, the vendored-sim false-red guard): the
// extended rules run over the shipped games/**/sim/** tree — helpers.js's
// sanctioned Math-as-value and autoplay.test.js's regex bodies included —
// and the gate still exits 0. A new rule that false-reds the vendored sim
// reddens HERE (execFileSync throws on nonzero exit).
test("the REAL repo tree stays green under the extended rules (vendored-sim false-red guard)", () => {
  execFileSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: "utf8" }); // exit 0
});
