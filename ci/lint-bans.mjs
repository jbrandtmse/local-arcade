#!/usr/bin/env node
// L0 sim-path lint bans (AD-4/AD-8 subset; the full L0 gate is Epic 3).
// Scans games/<game-id>/sim/** for nondeterminism sources: Math.random,
// Date.now, performance.now, and engine-variable Math transcendentals
// (sin/cos/tan/asin/acos/atan2/pow/exp/log — replace with the core/contract
// math module). The rules bind FORMS, not spellings: member chains (dot and
// optional-chain), bracket-string access, destructured-global binding sources
// (renaming the binding does not launder the source name), and bare
// Date/performance identifiers (no-date-use / no-performance-use — wall-clock
// aliasing). Math-as-value (globalThis.Math passed as a value) is sanctioned;
// Math is never flagged bare. Deeper evasions (alias chains, computed
// receivers, dynamic member names) are the full L0 data-flow pass, Epic 3.
// Deterministic script via the pinned TypeScript scanner
// (typescript/unstable/ast; comments are trivia and never match), zero LLM.
// The unstable scanner lexes `/` as a plain slash and tokenizes a regex
// body as code, so the scan recognizes regex literals positionally and
// re-anchors after them: pattern text naming a banned API never matches,
// while division operands stay in the stream and stay banned.

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

// Wall-clock aliasing rules (new rules over already-banned APIs; the
// transcendental ban SET itself is fixed). A bare Date/performance
// identifier is a wall-clock value regardless of which member is used.
const NO_DATE_USE = "no-date-use (wall-clock values are banned; sim time = tick count; AD-3)";
const NO_PERFORMANCE_USE = "no-performance-use (wall-clock values are banned; sim time = tick count; AD-3)";
const WALLCLOCK_SOURCES = new Set(["globalThis", "window"]);
// Wall-clock globals reached through the sanctioned Math-as-value
// receivers: globalThis.Date / window.performance are references to the
// banned substance itself — only Math keeps its sanctioned value form.
const GLOBAL_CLOCK = new Map([
  ["globalThis.Date", NO_DATE_USE],
  ["window.Date", NO_DATE_USE],
  ["globalThis.performance", NO_PERFORMANCE_USE],
  ["window.performance", NO_PERFORMANCE_USE],
]);

// Materialize the non-trivia token stream once: comment text never
// tokenizes, so prose or strings mentioning Math.random or "new Date"
// cannot trip a ban, and the lookbacks below read cleanly. The unstable
// scanner lexes `/` as a plain slash and tokenizes a regex body as code,
// so a slash in regex position is matched to its literal end character-
// wise and the scanner re-anchors after it — the body becomes one opaque
// token. A slash after a value-ish token is division: it stays in the
// stream, and division operands of banned globals stay banned uses.
const DIVISION_PRECEDING = new Set([
  SyntaxKind.Identifier, SyntaxKind.NumericLiteral, SyntaxKind.BigIntLiteral,
  SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.RegularExpressionLiteral, SyntaxKind.CloseParenToken,
  SyntaxKind.CloseBracketToken, SyntaxKind.CloseBraceToken,
  SyntaxKind.PlusPlusToken, SyntaxKind.MinusMinusToken,
]);

// Exclusive end (past trailing flags) of the regex literal opening at
// `open`, or -1 when no closing slash sits on the line — a stray slash
// then reads as division, the conservative side for the bans.
function regexEnd(text, open) {
  let inClass = false;
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") i++;
    else if (c === "\n") return -1;
    else if (inClass && c === "]") inClass = false;
    else if (!inClass && c === "[") inClass = true;
    else if (!inClass && c === "/") {
      i++;
      while (i < text.length && /[a-z]/.test(text[i])) i++;
      return i;
    }
  }
  return -1;
}

function scanTokens(text) {
  const scanner = createScanner();
  scanner.setText(text);
  const isTrivia = (t) => t >= SyntaxKind.FirstTriviaToken && t <= SyntaxKind.LastTriviaToken;
  const toks = [];
  let guard = 0;
  let prevCode = SyntaxKind.Unknown;
  while (guard++ < text.length + 16) {
    const kind = scanner.scan();
    if (kind === SyntaxKind.EndOfFile) break;
    if (isTrivia(kind)) continue; // whitespace/comments must not break the chain
    const pos = scanner.getTokenStart();
    if (kind === SyntaxKind.SlashToken && !DIVISION_PRECEDING.has(prevCode)) {
      const end = regexEnd(text, pos);
      if (end > pos) {
        // One opaque token stands for the whole literal: its body can
        // never form a member chain or a bare-identifier reference.
        toks.push({ kind: SyntaxKind.RegularExpressionLiteral, value: text.slice(pos, end), pos });
        prevCode = SyntaxKind.RegularExpressionLiteral;
        scanner.setText(text, end);
        continue;
      }
    }
    toks.push({ kind, value: scanner.getTokenValue(), pos });
    prevCode = kind;
  }
  return toks;
}

const isMemberLink = (t) => t !== undefined && (t.kind === SyntaxKind.DotToken || t.kind === SyntaxKind.QuestionDotToken);

// Banned-member access on a receiver: `receiver.prop` (dot or optional
// chain), `receiver["prop"]` (string or plain-template subscript), and
// their optional-chained subscript form `receiver?.["prop"]`. Receivers
// on the sanctioned value globals (globalThis./window. + Date/performance)
// hit the wall-clock-use rules; globalThis./window. + Math stays green —
// the Math-as-value form is sanctioned. Renaming or re-spelling the
// access does not launder the banned member.
function accessHits(toks) {
  const hits = [];
  let receiver = "";
  let receiverPos = -1;
  let sawMemberLink = false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (isMemberLink(t)) {
      sawMemberLink = true;
      continue;
    }
    if (t.kind === SyntaxKind.Identifier) {
      if (sawMemberLink && receiver) {
        const key = `${receiver}.${t.value}`;
        const rule = BAN_LOOKUP.get(key) ?? GLOBAL_CLOCK.get(key);
        if (rule) hits.push({ rule, pos: receiverPos });
      }
      const off = isMemberLink(toks[i + 1]) ? 1 : 0; // `?.[` subscript
      const open = toks[i + 1 + off];
      const str = toks[i + 2 + off];
      const close = toks[i + 3 + off];
      if (
        open?.kind === SyntaxKind.OpenBracketToken &&
        (str?.kind === SyntaxKind.StringLiteral || str?.kind === SyntaxKind.NoSubstitutionTemplateLiteral) &&
        close?.kind === SyntaxKind.CloseBracketToken
      ) {
        // getTokenValue() on a string/plain-template token is the string
        // CONTENT (delimiters already stripped), so it concatenates directly.
        const key = `${t.value}.${str.value}`;
        const rule = BAN_LOOKUP.get(key) ?? GLOBAL_CLOCK.get(key);
        if (rule) hits.push({ rule, pos: t.pos });
      }
      receiver = t.value;
      receiverPos = t.pos;
      sawMemberLink = false;
      continue;
    }
    sawMemberLink = false;
  }
  return hits;
}

// Destructured-global binding source: `const { prop: x } = Math|Date|
// performance|globalThis|window` — when `=` is preceded by a closing brace,
// walk back to the matching `{` and flag every banned source name inside it
// (the SOURCE-side key/shorthand names are checked, so renaming the binding
// to `r` or `t` does not launder it). The walk-back is deliberately coarse
// at direct-member level; deeper laundering is the Epic 3 data-flow pass.
function destructureHits(toks) {
  const hits = [];
  const sourceRule = (source, name) => {
    if (source === "Math" || source === "Date" || source === "performance") {
      return BAN_LOOKUP.get(`${source}.${name}`) ?? null;
    }
    if (WALLCLOCK_SOURCES.has(source)) {
      // Math-as-value stays sanctioned even through globalThis/window;
      // pulling the wall-clock globals out is aliasing itself.
      if (name === "Date") return NO_DATE_USE;
      if (name === "performance") return NO_PERFORMANCE_USE;
    }
    return null;
  };
  for (let j = 1; j < toks.length - 1; j++) {
    if (toks[j].kind !== SyntaxKind.EqualsToken) continue;
    const src = toks[j + 1];
    if (src.kind !== SyntaxKind.Identifier) continue;
    // Effective source: a bare global, or the member spelling on the
    // value receivers (`= window.Math`, `= globalThis.Date`) — the
    // prefix must not launder the source family any more than a rename.
    let source = src.value;
    if (WALLCLOCK_SOURCES.has(src.value)) {
      const nx2 = toks[j + 2];
      const nx3 = toks[j + 3];
      const member =
        isMemberLink(nx2) && nx3?.kind === SyntaxKind.Identifier ? nx3.value
        : nx2?.kind === SyntaxKind.OpenBracketToken && nx3?.kind === SyntaxKind.StringLiteral &&
          toks[j + 4]?.kind === SyntaxKind.CloseBracketToken ? nx3.value
        : "";
      if (member) {
        if (member !== "Math" && member !== "Date" && member !== "performance") continue;
        source = member;
      }
    }
    if (!(source === "Math" || source === "Date" || source === "performance" || WALLCLOCK_SOURCES.has(source))) continue;
    if (toks[j - 1].kind !== SyntaxKind.CloseBraceToken) continue;
    let depth = 0;
    let k = j - 1;
    for (; k >= 0; k--) {
      if (toks[k].kind === SyntaxKind.CloseBraceToken) depth++;
      else if (toks[k].kind === SyntaxKind.OpenBraceToken && --depth === 0) break;
    }
    if (depth !== 0) continue; // unbalanced: not a binding pattern we trust
    for (let m = k + 1; m <= j - 2; m++) {
      const t = toks[m];
      if (t.kind !== SyntaxKind.Identifier) continue;
      if (toks[m - 1]?.kind === SyntaxKind.ColonToken) continue; // renamed binding name, not a source name
      const rule = sourceRule(source, t.value);
      if (rule) hits.push({ rule, pos: t.pos });
    }
  }
  return hits;
}

// Bare wall-clock identifiers: `Date`/`performance` with a non-member-link
// token on BOTH sides — `new Date()`, bare `Date()`, aliases (`const d =
// Date`), division operands (`60000 / Date`), bare `performance`
// references. Member access stays on the chain/bracket rules
// (no-date-now / no-performance-now, single hit each); property keys and
// labels (`{ performance: 1 }`) name nothing at runtime. Pattern text
// never reaches here: scanTokens masks every regex literal body into one
// opaque token.
function bareWallclockHits(toks) {
  const hits = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.kind !== SyntaxKind.Identifier || (t.value !== "Date" && t.value !== "performance")) continue;
    if (isMemberLink(toks[i - 1]) || isMemberLink(toks[i + 1])) continue;
    const nx = toks[i + 1];
    if (nx?.kind === SyntaxKind.ColonToken) continue; // property key or label, not a value reference
    if (nx?.kind === SyntaxKind.OpenBracketToken) continue; // subscript access: chain/bracket rules own it
    hits.push({ rule: t.value === "Date" ? NO_DATE_USE : NO_PERFORMANCE_USE, pos: t.pos });
  }
  return hits;
}

// Hits are merged positionally: every file's stream stays sorted by
// source position, like the single-pass scanner it replaces.
function bannedChains(text) {
  const toks = scanTokens(text);
  return [...accessHits(toks), ...destructureHits(toks), ...bareWallclockHits(toks)].sort((a, b) => a.pos - b.pos);
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
