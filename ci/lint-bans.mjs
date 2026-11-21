#!/usr/bin/env node
// L0 sim-path lint bans (AD-4/AD-8 subset; the full L0 gate is Epic 3).
// Scans games/<game-id>/sim/** for nondeterminism sources: Math.random,
// Date.now, performance.now, and engine-variable Math transcendentals
// (sin/cos/tan/asin/acos/atan2/pow/exp/log — replace with the core/contract
// math module). Deterministic script via the pinned TypeScript scanner
// (typescript/unstable/ast; comments are trivia and never match), zero LLM.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createScanner, SyntaxKind, computeLineStarts } from "typescript/unstable/ast";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = path.resolve(rootIdx >= 0 ? args[rootIdx + 1] : process.cwd());
const gamesDir = path.join(root, "games");

// Banned-API config: receiver object + property name.
const TRANSCENDENTALS = ["sin", "cos", "tan", "asin", "acos", "atan2", "pow", "exp", "log"];
const BANS = [
  { receiver: "Math", prop: "random", rule: "no-math-random (rng is injected by the kernel; AD-4)" },
  { receiver: "Date", prop: "now", rule: "no-date-now (sim time = tick count; AD-3)" },
  { receiver: "performance", prop: "now", rule: "no-performance-now (sim time = tick count; AD-3)" },
  ...TRANSCENDENTALS.map((prop) => ({
    receiver: "Math",
    prop,
    rule: `no-engine-transcendental (Math.${prop} is engine-variable; use the core/contract math module; AD-4)`,
  })),
];
const BAN_LOOKUP = new Map(BANS.map((b) => [`${b.receiver}.${b.prop}`, b.rule]));

function statSyncSafe(p) {
  try {
    return statSync(p);
  } catch {
    return { isDirectory: () => false };
  }
}

function listSourceFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...listSourceFiles(full));
    else if (/\.(?:ts|mts|cts|js|mjs|cjs)$/.test(name)) found.push(full);
  }
  return found;
}

function simFiles() {
  if (!statSyncSafe(gamesDir).isDirectory()) return [];
  const files = [];
  for (const gameId of readdirSync(gamesDir)) {
    const simDir = path.join(gamesDir, gameId, "sim");
    if (statSyncSafe(simDir).isDirectory()) files.push(...listSourceFiles(simDir));
  }
  return files;
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

// Member chains `receiver.prop` from the token stream: Identifier, Dot,
// Identifier. Comment text never tokenizes, so prose mentioning Math.random
// cannot trip the ban.
function bannedChains(text) {
  const scanner = createScanner();
  scanner.setText(text);
  const hits = [];
  let receiver = "";
  let receiverPos = -1;
  let sawDot = false;
  let guard = 0;
  const isTrivia = (t) => t >= SyntaxKind.FirstTriviaToken && t <= SyntaxKind.LastTriviaToken;
  while (guard++ < text.length + 16) {
    const token = scanner.scan();
    if (token === SyntaxKind.EndOfFile) break;
    if (isTrivia(token)) continue; // whitespace/comments must not break the chain
    if (token === SyntaxKind.DotToken) {
      sawDot = true;
      continue;
    }
    if (token === SyntaxKind.Identifier) {
      const value = scanner.getTokenValue();
      const pos = scanner.getTokenStart();
      if (sawDot && receiver) {
        const rule = BAN_LOOKUP.get(`${receiver}.${value}`);
        if (rule) hits.push({ rule, pos: receiverPos });
      }
      receiver = value;
      receiverPos = pos;
      sawDot = false;
      continue;
    }
    sawDot = false;
  }
  return hits;
}

const violations = [];
for (const file of simFiles()) {
  const text = readFileSync(file, "utf8");
  const lineStarts = computeLineStarts(text);
  for (const { rule, pos } of bannedChains(text)) {
    const { line, col } = lineAndCol(lineStarts, pos);
    violations.push(`${path.relative(root, file)}:${line}:${col}: ${rule}`);
  }
}

if (violations.length > 0) {
  for (const v of violations) console.error(`lint-bans: ${v}`);
  console.error(`lint-bans: ${violations.length} banned-API use(s) in sim paths`);
  process.exit(1);
}
