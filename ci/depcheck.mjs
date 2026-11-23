#!/usr/bin/env node
// AD-1 dependency-direction gate: Core source imports no games/** at
// authoring time — the only game-facing surface at runtime is the
// build-generated registry. Story 1.5 adds the AD-2 purity leg: a game's
// SIM SOURCE (non-test files under a `sim` directory) imports nothing but
// its own sim tree — the kernel reaches it only through injected ctx
// (rng/math/gated), so no core, node, or engine import may hide in a sim.
// Sim TESTS are exempt: the I/O matrix demands they drive the sim through
// the REAL wrapper, which lives in core (test-only, never in the bundle).
// This deterministic script (AD-18, zero LLM) fails any planted violation,
// citing file:line.
// Tokenizes with the pinned TypeScript compiler API (typescript/unstable/ast
// scanner; TS7's native port has no legacy JS compiler API) - no new deps.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createScanner, SyntaxKind, computeLineStarts } from "typescript/unstable/ast";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = path.resolve(rootIdx >= 0 ? args[rootIdx + 1] : process.cwd());
const coreDir = path.join(root, "core");
const gamesDir = path.join(root, "games");

// A specifier touches the games tree when it has a `games` path segment
// ("games/x/sim", "../games/x/sim", "./games/...", "...\\games\\...").
const GAMES_SPEC = /(?:^|[\\/])games(?:[\\/]|$)/;

// Test files are never shipped in the sealed bundle; the matrix demands sim
// tests wire the REAL core wrapper, so the AD-2 purity leg skips them.
const TEST_FILE = /\.test\.(?:ts|mts|cts|js|mjs|cjs)$/;

function listSourceFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...listSourceFiles(full));
    else if (/\.(?:ts|mts|cts|js|mjs|cjs)$/.test(name)) found.push(full);
  }
  return found;
}

// One file's import specifiers + line/col, shared by both gates.
function specHits(file) {
  const text = readFileSync(file, "utf8");
  const lineStarts = computeLineStarts(text);
  return moduleSpecifiers(text).map(({ spec, pos }) => ({ spec, ...lineAndCol(lineStarts, pos) }));
}

function lineAndCol(lineStarts, pos) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, col: pos - lineStarts[lo] + 1 };
}

// Specifier positions from the token stream: `from "..."`, bare
// `import "..."`, `import("...")`, `require("...")`, and the no-substitution
// template-literal forms of the dynamic calls. `x.from(...)` and
// `{ from: "..." }` never match (prev token is OpenParen/Colon there).
function moduleSpecifiers(text) {
  const scanner = createScanner();
  scanner.setText(text);
  const specs = [];
  let prev = SyntaxKind.Unknown;
  let prevPrev = SyntaxKind.Unknown;
  let guard = 0;
  const isTrivia = (t) => t >= SyntaxKind.FirstTriviaToken && t <= SyntaxKind.LastTriviaToken;
  while (guard++ < text.length + 16) {
    const token = scanner.scan();
    if (token === SyntaxKind.EndOfFile) break;
    if (isTrivia(token)) continue; // whitespace/comments must not break adjacency
    if (token === SyntaxKind.StringLiteral || token === SyntaxKind.NoSubstitutionTemplateLiteral) {
      const dynamic =
        (prev === SyntaxKind.OpenParenToken && prevPrev === SyntaxKind.ImportKeyword) ||
        (prev === SyntaxKind.OpenParenToken && prevPrev === SyntaxKind.RequireKeyword);
      const staticFrom = prev === SyntaxKind.FromKeyword && prevPrev !== SyntaxKind.DotToken;
      const sideEffect = prev === SyntaxKind.ImportKeyword;
      if (dynamic || staticFrom || sideEffect) {
        specs.push({ spec: scanner.getTokenValue(), pos: scanner.getTokenStart() });
      }
    }
    prevPrev = prev;
    prev = token;
  }
  return specs;
}

const violations = [];
for (const file of existsSync(coreDir) ? listSourceFiles(coreDir) : []) {
  for (const { spec, line, col } of specHits(file)) {
    if (GAMES_SPEC.test(spec)) {
      violations.push(`${path.relative(root, file)}:${line}:${col}: Core imports games/**: "${spec}"`);
    }
  }
}

// AD-2 leg: a sim source file lives under a `sim` directory component; its
// import graph must close inside that sim root (relative specifiers that
// resolve there). Bare, absolute, and escaping specifiers are all violations.
function simSourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return listSourceFiles(dir).filter(
    (f) => !TEST_FILE.test(f) && path.relative(dir, f).split(path.sep).includes("sim"),
  );
}

function simRootOf(file) {
  const parts = file.split(path.sep);
  return parts.slice(0, parts.indexOf("sim") + 1).join(path.sep);
}

for (const file of simSourceFiles(gamesDir)) {
  const simRoot = simRootOf(file);
  for (const { spec, line, col } of specHits(file)) {
    const escaped =
      !spec.startsWith(".") ||
      path.isAbsolute(spec) ||
      !(path.resolve(path.dirname(file), spec) === simRoot ||
        path.resolve(path.dirname(file), spec).startsWith(simRoot + path.sep));
    if (escaped) {
      violations.push(`${path.relative(root, file)}:${line}:${col}: sim imports outside its own sim tree (AD-2): "${spec}"`);
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) console.error(`depcheck: ${v}`);
  console.error(`depcheck: ${violations.length} import-direction violation(s) found (AD-1: the registry is Core's only game surface; AD-2: a sim imports only its own sim tree)`);
  process.exit(1);
}
