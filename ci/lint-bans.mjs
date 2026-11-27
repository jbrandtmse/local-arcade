#!/usr/bin/env node
// L0 lint bans over BOTH plugin halves (AD-4/AD-8/AD-7 subset; the full L0
// gate is Epic 3).
// games/<game-id>/sim/** gets the nondeterminism bans: Math.random,
// Date.now, performance.now, and engine-variable Math transcendentals
// (sin/cos/tan/asin/acos/atan2/pow/exp/log — replace with the core/contract
// math module).
// games/<game-id>/presentation/** is scanned for ONE rule only:
// no-webaudio-graph (Story 2.1, AD-7) — any AudioContext/webkitAudioContext/
// OfflineAudioContext reference (bare, new, dotted or bracket on a global
// receiver (globalThis/window/self/top/parent/global), or destructured out
// of one) is red in BOTH halves: the Core Audio Manager owns the one
// graph; games supply assets and requests, never nodes. The wall-clock rules stay sim-only (presentation
// halves may use Math.random — the render half is outside the replay law).
// The rules bind FORMS, not spellings: member chains (dot and
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
// re-anchors after them: text inside a literal recognized in regex
// position becomes one opaque token and never matches. A slash after a
// value-ish token reads as division — it stays in the stream, and
// division operands of banned globals stay banned uses.

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

function halfFiles(half) {
  if (!statSyncSafe(gamesDir).isDirectory()) return [];
  const files = [];
  for (const gameId of readdirSync(gamesDir)) {
    const dir = path.join(gamesDir, gameId, half);
    if (statSyncSafe(dir).isDirectory()) files.push(...listSourceFiles(dir));
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

// The unstable scanner lexes each backtick independently and never knows
// a `${...}` substitution CLOSED: at the template's closing backtick it
// starts a fresh literal and swallows the rest of the file (or the next
// backtick) into one token. So after each substitution-closing `}`, the
// tail text is consumed character-wise to the next `${` (re-arm the
// scanner inside the substitution) or to the closing backtick (template
// over, normal scanning resumes). Literal parts stay one opaque token;
// substitution contents are scanned as code, so bans see identifiers
// inside them (a planted `new AudioContext()` inside a template leg is
// as red as one in a statement).
function templateTailEnd(text, closeBrace) {
  for (let i = closeBrace + 1; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") i++;
    else if (c === "`") return { end: i + 1, closed: true };
    else if (c === "$" && text[i + 1] === "{") return { end: i + 2, closed: false };
  }
  return { end: text.length, closed: true }; // unterminated: consume to EOF
}

function scanTokens(text) {
  const scanner = createScanner();
  scanner.setText(text);
  const isTrivia = (t) => t >= SyntaxKind.FirstTriviaToken && t <= SyntaxKind.LastTriviaToken;
  const toks = [];
  const openSubsts = []; // one frame per open template: brace depth inside the substitution
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
    if (kind === SyntaxKind.TemplateHead) {
      openSubsts.push({ brace: 0 });
      toks.push({ kind, value: scanner.getTokenValue(), pos });
      prevCode = kind;
      continue;
    }
    if (openSubsts.length > 0) {
      const frame = openSubsts[openSubsts.length - 1];
      if (kind === SyntaxKind.OpenBraceToken) frame.brace++;
      else if (kind === SyntaxKind.CloseBraceToken && frame.brace === 0) {
        // This `}` closes the substitution (not a nested block): consume
        // the template tail up to the next `${` or the closing backtick.
        const tail = templateTailEnd(text, pos);
        toks.push({
          kind: tail.closed ? SyntaxKind.TemplateTail : SyntaxKind.TemplateMiddle,
          value: text.slice(pos, tail.end),
          pos,
        });
        prevCode = tail.closed ? SyntaxKind.NoSubstitutionTemplateLiteral : SyntaxKind.TemplateHead;
        if (tail.closed) openSubsts.pop();
        scanner.setText(text, tail.end);
        continue;
      } else if (kind === SyntaxKind.CloseBraceToken) frame.brace--;
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
// Does the identifier at `i` head a banned-member access (chain or
// bracket), i.e. is the chain/bracket rule its sole owner?
function headsBannedAccess(toks, i) {
  const t = toks[i];
  const off = isMemberLink(toks[i + 1]) ? 1 : 0; // `?.[` subscript
  const open = toks[i + 1 + off];
  const str = toks[i + 2 + off];
  const close = toks[i + 3 + off];
  if (
    open?.kind === SyntaxKind.OpenBracketToken &&
    (str?.kind === SyntaxKind.StringLiteral || str?.kind === SyntaxKind.NoSubstitutionTemplateLiteral) &&
    close?.kind === SyntaxKind.CloseBracketToken
  ) {
    return BAN_LOOKUP.has(`${t.value}.${str.value}`);
  }
  const nx = toks[i + 1];
  const prop = toks[i + 2];
  if (isMemberLink(nx) && prop?.kind === SyntaxKind.Identifier) {
    return BAN_LOOKUP.has(`${t.value}.${prop.value}`);
  }
  return false;
}

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
        // L4 sole-owner posture, mirrored on the value receivers:
        // `globalThis.Date.now()` is ONE no-date-now hit (the chain leg);
        // `globalThis.Date` on its own is the wall-clock-use hit.
        if (rule && !(GLOBAL_CLOCK.has(key) && headsBannedAccess(toks, i))) hits.push({ rule, pos: receiverPos });
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

// Story 2.1 (AC: the L0 ban covers BOTH halves): no-webaudio-graph. Any
// reference to the WebAudio context family is the graph-building substance
// itself — the Core Audio Manager owns the one graph (AD-7); a game half
// that names AudioContext is building nodes, not supplying assets. Forms:
// bare identifier (`new AudioContext`, aliases, extends), dotted/bracket on
// the globalThis/window receivers, and destructure sources. Property keys
// named AudioContext name nothing at runtime (colon guard, like the
// bare-wall-clock rule's); member access ON an object (`ctx.AudioContext`)
// stays green — same sanctioned posture as obj.Date in the wall-clock leg.
const NO_WEBAUDIO = "no-webaudio-graph (the Core Audio Manager owns the WebAudio graph; games supply assets and requests, never nodes; AD-7)";
const WEBAUDIO_NAMES = new Set(["AudioContext", "webkitAudioContext", "OfflineAudioContext"]);
// The global receivers the graph family can hang off. Wider than the
// wall-clock value receivers: the ban's whole point is that NO spelling
// of the global reaches a game half, so self./top./parent./global. are
// banned receivers here even where they stay sanctioned Math-as-value
// paths for the wall-clock rules.
const WEBAUDIO_RECEIVERS = new Set(["globalThis", "window", "self", "top", "parent", "global", "frames", "opener"]);

function webaudioHits(toks) {
  const hits = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    // "global" lexes as a keyword token (declare global), not an
    // Identifier — the receiver leg must see it too.
    if (t.kind !== SyntaxKind.Identifier && t.kind !== SyntaxKind.GlobalKeyword) continue;
    if (WEBAUDIO_RECEIVERS.has(t.value)) {
      // globalThis.AudioContext / window["OfflineAudioContext"]: the
      // receiver leg owns these (sole-owner posture); the bare leg skips
      // them via the member-link guard below.
      if (isMemberLink(toks[i + 1])) {
        // dotted / optional-chain: window.AudioContext, globalThis?.AudioContext
        const member = toks[i + 2];
        if (member?.kind === SyntaxKind.Identifier && WEBAUDIO_NAMES.has(member.value)) {
          hits.push({ rule: NO_WEBAUDIO, pos: t.pos });
          continue;
        }
      }
      const off = isMemberLink(toks[i + 1]) ? 1 : 0;
      const open = toks[i + 1 + off];
      const str = toks[i + 2 + off];
      const close = toks[i + 3 + off];
      if (
        open?.kind === SyntaxKind.OpenBracketToken &&
        (str?.kind === SyntaxKind.StringLiteral || str?.kind === SyntaxKind.NoSubstitutionTemplateLiteral) &&
        close?.kind === SyntaxKind.CloseBracketToken &&
        WEBAUDIO_NAMES.has(str.value)
      ) {
        hits.push({ rule: NO_WEBAUDIO, pos: t.pos });
        continue;
      }
    }
    if (!WEBAUDIO_NAMES.has(t.value)) continue;
    if (isMemberLink(toks[i - 1])) continue; // property access on some object
    if (toks[i + 1]?.kind === SyntaxKind.ColonToken) continue; // property key or label
    hits.push({ rule: NO_WEBAUDIO, pos: t.pos });
  }
  return hits;
}

// Destructured source leg for the WebAudio family (both halves): pulling
// `{ AudioContext }` out of globalThis/window is aliasing the graph itself.
// Mirrors the wall-clock destructure walk-back at the value receivers.
function webaudioDestructureHits(toks) {
  const hits = [];
  for (let j = 1; j < toks.length - 1; j++) {
    if (toks[j].kind !== SyntaxKind.EqualsToken) continue;
    const src = toks[j + 1];
    if (src.kind !== SyntaxKind.Identifier || !WEBAUDIO_RECEIVERS.has(src.value)) continue;
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
      if (WEBAUDIO_NAMES.has(t.value)) hits.push({ rule: NO_WEBAUDIO, pos: t.pos });
    }
  }
  return hits;
}

// Hits are merged positionally: every file's stream stays sorted by
// source position, like the single-pass scanner it replaces. Two legs
// can OWN the same token positionally (a destructured `{ AudioContext }`
// or `{ Date }` is hit by the destructure leg AND the bare leg, and a
// shorthand re-export adds a third) — the per-file report dedupes an
// identical file:line:col:rule to a single violation, so counts stay
// honest while the position sort still owns the order.
function bannedChains(toks) {
  return [...accessHits(toks), ...destructureHits(toks), ...bareWallclockHits(toks)];
}

const violations = [];
const halves = [
  ...halfFiles("sim").map((file) => ({ file, sim: true })),
  ...halfFiles("presentation").map((file) => ({ file, sim: false })),
];
const seenViolations = new Set();
for (const { file, sim } of halves) {
  const text = readFileSync(file, "utf8");
  const lineStarts = computeLineStarts(text);
  const toks = scanTokens(text);
  // The wall-clock/transcendental rules bind the sim half only; the
  // WebAudio graph ban binds BOTH halves.
  const legs = sim ? [...bannedChains(toks), ...webaudioHits(toks), ...webaudioDestructureHits(toks)] : [...webaudioHits(toks), ...webaudioDestructureHits(toks)];
  for (const { rule, pos } of legs.sort((a, b) => a.pos - b.pos)) {
    const { line, col } = lineAndCol(lineStarts, pos);
    const message = `${path.relative(root, file)}:${line}:${col}: ${rule}`;
    if (seenViolations.has(message)) continue;
    seenViolations.add(message);
    violations.push(message);
  }
}

if (violations.length > 0) {
  for (const v of violations) console.error(`lint-bans: ${v}`);
  console.error(`lint-bans: ${violations.length} banned-API use(s) in plugin halves`);
  process.exit(1);
}
