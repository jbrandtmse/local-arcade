#!/usr/bin/env node
// AD-1 dependency-direction gate: Core source imports no games/** at
// authoring time — the only game-facing surface at runtime is the
// build-generated registry. This deterministic script (AD-18, zero LLM)
// fails any planted Core->games import, citing file:line.
// Tokenizes with the pinned TypeScript compiler API (typescript/unstable/ast
// scanner; TS7's native port has no legacy JS compiler API) - no new deps.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createScanner, SyntaxKind, computeLineStarts } from "typescript/unstable/ast";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = path.resolve(rootIdx >= 0 ? args[rootIdx + 1] : process.cwd());
const coreDir = path.join(root, "core");

// A specifier touches the games tree when it has a `games` path segment
// ("games/x/sim", "../games/x/sim", "./games/...", "...\\games\\...").
const GAMES_SPEC = /(?:^|[\\/])games(?:[\\/]|$)/;

function listSourceFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...listSourceFiles(full));
    else if (/\.(?:ts|mts|cts|js|mjs|cjs)$/.test(name)) found.push(full);
  }
  return found;
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
for (const file of listSourceFiles(coreDir)) {
  const text = readFileSync(file, "utf8");
  const lineStarts = computeLineStarts(text);
  for (const { spec, pos } of moduleSpecifiers(text)) {
    if (GAMES_SPEC.test(spec)) {
      const { line, col } = lineAndCol(lineStarts, pos);
      violations.push(`${path.relative(root, file)}:${line}:${col}: Core imports games/**: "${spec}"`);
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) console.error(`depcheck: ${v}`);
  console.error(`depcheck: ${violations.length} Core->games import(s) found (AD-1: the registry is the only game surface)`);
  process.exit(1);
}
