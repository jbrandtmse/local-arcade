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
    // the presentation half IS scanned (Story 2.1) — but only for the
    // WebAudio graph rule; the wall-clock rules stay sim-path, so a
    // presentation Math.random stays green here
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

// Story 2.1 (AC: the L0 WebAudio ban covers BOTH plugin halves): any
// AudioContext-family reference in sim OR presentation goes red naming
// no-webaudio-graph; the sanctioned adapter form (a 2d canvas context) and
// property keys named AudioContext stay green.
test("AudioContext-family forms go red in BOTH halves: new, bare, global-receiver dotted and bracket, in sim and presentation", () => {
  const dir = fixtureGames({
    "games/wasim/sim/a.js": "const ac = new AudioContext(); export { ac };\n",
    "games/wasim2/sim/b.js": 'const AC = window.AudioContext; const B = globalThis["OfflineAudioContext"]; const W = webkitAudioContext; export { AC, B, W };\n',
    "games/wapres/presentation/c.js": "const ctx = new AudioContext(); const g = ctx.createGain(); g.connect(ctx.destination); export { g };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-webaudio-graph"), "no-webaudio-graph rule");
  assert.match(result.stderr, /games[/\\]wasim[/\\]sim[/\\]a\.js:1:/); // planted new AudioContext in a SIM half is red (the falsification)
  assert.match(result.stderr, /games[/\\]wasim2[/\\]sim[/\\]b\.js:1:/);
  assert.match(result.stderr, /games[/\\]wapres[/\\]presentation[/\\]c\.js:1:/); // the adapter half is covered too
  const summaries = [...result.stderr.matchAll(/lint-bans: (\d+) banned-API use\(s\)/g)];
  assert.equal(summaries.length, 1);
  assert.equal(
    Number(summaries[0]![1]),
    5,
    "five references (new + window dotted + globalThis bracket + bare webkit + new), five single hits \u2014 ctx.createGain()/ctx.destination are not the graph family",
  );
});

// The graph ban's receiver set is WIDER than the wall-clock value
// receivers: self/top/parent/global/frames/opener are global and
// window-property aliases, and the rule's whole guarantee is that no
// spelling of the global reaches a game half.
test("AudioContext reached through the other global aliases (self./top./parent./global./frames./opener.) goes red in both halves", () => {
  const dir = fixtureGames({
    "games/waself/sim/s.js": "const ac = new self.AudioContext(); export { ac };\n",
    "games/watop/presentation/t.js": 'const AC = top["OfflineAudioContext"]; const A2 = parent.AudioContext; const G = global.AudioContext; export { AC, A2, G };\n',
    "games/wafr/sim/f.js": "const F = frames.OfflineAudioContext; const O = opener.AudioContext; export { F, O };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-webaudio-graph"), "self./top./parent./global./frames./opener. receivers are banned too (mutation: drop one from WEBAUDIO_RECEIVERS and its fixture leg goes green \u2014 red here)");
  assert.match(result.stderr, /games[/\\]waself[/\\]sim[/\\]s\.js:1:/);
  assert.match(result.stderr, /games[/\\]watop[/\\]presentation[/\\]t\.js:1:/);
  assert.match(result.stderr, /games[/\\]wafr[/\\]sim[/\\]f\.js:1:/, "frames. and opener. are window-property aliases like the rest");
  const summaries = [...result.stderr.matchAll(/lint-bans: (\d+) banned-API use\(s\)/g)];
  assert.equal(summaries.length, 1);
  assert.equal(Number(summaries[0]![1]), 6, "six aliased references, six single hits");
});

test("destructured AudioContext sources go red in both halves; property keys and member access named AudioContext stay green", () => {
  const dir = fixtureGames({
    "games/wadest/sim/d.js": "const { AudioContext: AC } = globalThis; export { AC };\n",
    "games/wadest2/presentation/e.js": "const { OfflineAudioContext } = window; export { OfflineAudioContext };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-webaudio-graph"), "pulling the graph family out of globalThis/window is aliasing it");
  assert.match(result.stderr, /games[/\\]wadest[/\\]sim[/\\]d\.js:/);
  assert.match(result.stderr, /games[/\\]wadest2[/\\]presentation[/\\]e\.js:/);
  // Dedupe contract: the destructure leg AND the bare leg both OWN the
  // shorthand `{ OfflineAudioContext }` binding position, but the report
  // counts ONE violation per position+rule. The shorthand re-export is a
  // separate bare-leg position and stays a second, distinct hit.
  const summaries = [...result.stderr.matchAll(/lint-bans: (\d+) banned-API use\(s\)/g)];
  assert.equal(summaries.length, 1);
  assert.equal(
    Number(summaries[0]![1]),
    3,
    "renamed binding (destructure leg only) + shorthand binding (merged to one) + shorthand export (own position) = 3 single hits (mutation: drop the dedupe and the shorthand binding double-reports at one position \u2014 red here)",
  );

  const green = fixtureGames({
    "games/wagreen/presentation/g.js": [
      "// comments naming AudioContext and window.AudioContext are trivia, never hits",
      "export const cfg = { AudioContext: null, webkitAudioContext: 0 };", // property keys name nothing
      "export const c2d = canvas.getContext(\"2d\"); // a canvas context is not a WebAudio graph",
    ].join("\n") + "\n",
    "games/wagreensim/sim/s.js": "export const cfg = { OfflineAudioContext: 1 }; export const off = obj.AudioContext;\n",
  });
  const okResult = run(green);
  assert.equal(okResult.ok, true, okResult.stderr);
  assert.equal(okResult.stderr, "");
});

// Scanner contract: a substituted template literal never hides code.
// Substitution contents scan as code, and normal tokenizing resumes after
// the closing backtick — every rule stays visible on both sides of the
// template, in either half.
test("code after a substituted template stays visible to the bans; so do substitution contents", () => {
  const dir = fixtureGames({
    "games/tmplpres/presentation/p.js":
      "const s = `rgba(1,2,3,${0.5 * 2})`;\nconst ac = new AudioContext(); export { s, ac };\n",
    "games/tmplsim/sim/s.js":
      "export const s = `x${Math.sin(1)}y`;\nconst r = Math.random(); export { r };\n",
    // NESTED substitution (a template inside a ${}): the scanner must push
    // a frame per TemplateHead, or the inner literal's parts blind the
    // scanner the way the single-depth bug did (Spec Change Log witness).
    // The leg pins both sides: contents inside the nested ${} scan, and
    // normal tokenizing resumes after the whole nested literal.
    "games/tmplnest/sim/n.js":
      "export const s = `a${`b${Math.sin(1)}`}c`;\nconst ac = new AudioContext(); export { s, ac };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-webaudio-graph"), "AudioContext after a substituted template is red");
  assert.match(result.stderr, /games[/\\]tmplpres[/\\]presentation[/\\]p\.js:2:/);
  assert.ok(result.stderr.includes("no-engine-transcendental (Math.sin"), "the substitution leg is code: Math.sin inside ${} is red");
  assert.ok(result.stderr.includes("no-math-random"), "Math.random after the template leg is red too");
  assert.match(result.stderr, /games[/\\]tmplsim[/\\]sim[/\\]s\.js:2:/);
  // (mutation: stop pushing an open-substitution frame at a nested
  // TemplateHead — the inner parts lex as opaque text, both nested legs go
  // green, and the planted AudioContext walks the ban red here)
  assert.match(result.stderr, /games[/\\]tmplnest[/\\]sim[/\\]n\.js:1:/, "the NESTED leg: Math.sin inside a template inside a ${} is still code");
  assert.match(result.stderr, /games[/\\]tmplnest[/\\]sim[/\\]n\.js:2:/, "the NESTED leg: planted AudioContext after the whole nested literal is still red");
});

// Real-repo witness (matrix row 4, the vendored-sim false-red guard): the
// extended rules run over the shipped games/**/{sim,presentation}/** tree —
// helpers.js's sanctioned Math-as-value, autoplay.test.js's regex bodies,
// and the presentation adapter's 2d-canvas work included — and the gate
// still exits 0. A new rule that false-reds the vendored sim or the real
// adapter reddens HERE (execFileSync throws on nonzero exit).
test("the REAL repo tree stays green under the extended rules (vendored-sim false-red guard)", () => {
  execFileSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: "utf8" }); // exit 0
});
