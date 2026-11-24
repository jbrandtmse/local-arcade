// Story 1.8 (AD-16): the storage/identity service — the spine's SVC
// "storage/identity" box, realized as ONE core module (Design Notes 1: the
// box names one service; splitting identity from scores would scatter the
// `arcade.*` law). Three parts:
//
// 1. Identity — `visitorId()`: read `arcade.visitor`, UUIDv4-shape-validate,
//    else generate via the injected `uuidFn` (default crypto.randomUUID(),
//    verified present in Node 26 and evergreen Chrome/Edge) and write ONCE.
//    A corrupt stored value regenerates + rewrites (self-heal — inference).
//    Nothing else about the visitor exists anywhere (no other key, no PII).
// 2. Table state — Personal Bests persisted under
//    `arcade.pb.<visitorId>.<gameId>` as `{initials, score}` (higher-wins at
//    M0 — label; the AD-12 `scoreHigherIsBetter` field arrives with the
//    Epic-3 ledger machinery, the flag is an option defaulting true so
//    activation is one wiring line later), plus a Patron-run ring that is
//    RUNTIME-ONLY: derived seeds replay the same Patron runs every boot
//    (1.6 `derivedSeed`), so persisting them would store recomputable,
//    potentially-stale state (inference). Missing initials get a
//    kernel-derived anonymous pseudonym [A-Z]{3} (inference, labelled: the
//    derivation shape itself): Patron — deterministic
//    from the run's RESOLVED seed (AD-4 currency); visitor — from
//    (visitorId, gameId, run tick). The derivation is pure integer mixing
//    over the seed/identity triple (extends the `derivedSeed` idiom at
//    scheduler.ts:48-53 — a new tiny hash because the sibling returns
//    32-bit seeds, not letters); no `Math.random`, no wall clock anywhere.
//    Game-supplied initials sanitize to exactly 3 chars from A-Z (NFR-5:
//    PII never enters the table; sanitize, never reject-crash).
// 3. Reads — `rowsFor(gameId)`: the content law (no PB → best Patron row
//    alone; PB → PB row first, then the best Patron row; both empty → [] so
//    the CAP-8 score zone stays honestly empty) under the AD-28 cap-2 view
//    (the measured B0-face fit law: baselines 177/309, a 3rd collides with
//    the NEXT floor — the collision law in the painter stays the loud
//    guard). `state()` is the plain-data debug view for arcadeDebug.storage.
//
// Ingest — `ingest(records, ctx)` is a pure loop over the ALREADY-drained
// records (AD-23 single-drainer: the ingest leg rides the patrons system's
// existing drain, this module never calls drainEvents); classification and
// seed come from the caller's ctx closures over scheduler + seat (the 1.6
// BusyGate / 1.7 faultedFor deferred-closure injection idiom). Idle-classified
// scoreSubmitted records NEITHER PB nor Patron row — an authoring oddity
// must not fabricate history (CAP-8 honesty; recorded in the debug view only).
//
// Storage port — `getItem`/`setItem` injected; the default port reaches
// `globalThis.localStorage` (a missing global is a thrown access), and the
// SERVICE wraps EVERY port call in try/catch: quota / private-mode degrades
// to an in-memory session (writes mirror into the
// memory overlay first, reads fall back to it) with zero supervisor faults
// — a private-mode browser is a device-layer condition, not a room fault
// (the room-never-crashes law binds; inference, labelled). Node has no
// `localStorage` global — tests inject a Map-backed fake (hermetic; identity
// seeded per test).
//
// The sim never sees any of this (AD-16): the table never enters tick input,
// snapshot, or stateHash; this module imports core only (loop event records)
// and games/** imports nothing. No DOM beyond the injected port.

import type { EventRecord } from "./loop.ts";

// --- keys, shape laws, and the exported pin constants -------------------------

/** The visitor-identity key (AD-16: the `arcade.*` namespace). */
export const VISITOR_KEY = "arcade.visitor";

/** Personal-Best key prefix: `arcade.pb.<visitorId>.<gameId>` — the key
 * carries both legs of the (stable gameId, visitorId) pair (FR-7; AD-9's
 * stable-across-refurbish leg is the gameId one). */
export const PB_KEY_PREFIX = "arcade.pb.";

/** UUIDv4 shape, validated on READ (a stored value that fails regenerates +
 * rewrites — self-heal) and on WRITE of a generated value. */
export const UUID_V4_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Initials law (NFR-5): exactly 3 chars A–Z — uppercase, strip, slice,
 * pad; the pad char is (inference, labelled: era scoreboard convention). */
export const INITIALS_LENGTH = 3;
export const INITIALS_PAD_CHAR = "X";

/** AD-28 fit law (measured, lead probe 2026-11-24 against the real painter
 * + authored B0 data): the view caps at 2 rows — PB + best Patron; the
 * Patron-only view keeps best 1. A 3rd row would collide with the 0.18m
 * NEXT floor (baselines 177/309 fit, the 3rd throws) — the painter's
 * collision law stays the guard, this cap keeps it unreachable by law. */
export const SCORE_ROW_CAP = 2;

/** Patron-run ring bound — runtime-only, LABELLED PLACEHOLDER (the spine
 * defers numeric thresholds; the SEAT_EVENT_WINDOW push/shift + supervisor
 * ring idiom, Rule 2). 32 rows covers every run a browser session replays. */
export const PATRON_RUN_RING_MAX = 32;

/** Idle-classified scoreSubmitted ring — debug view only (never a PB, never
 * a Patron row: CAP-8 honesty). LABELLED PLACEHOLDER, same idiom. */
export const IDLE_RUN_RING_MAX = 16;

// --- types -------------------------------------------------------------------

/** The injected device slice (Map-backed fakes in tests; the browser
 * default wraps localStorage behind this module's try/catch). */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PersonalBest {
  initials: string;
  score: number;
}

export interface PatronRunRow {
  gameId: string;
  initials: string;
  score: number;
  /** Sim time of the scoreSubmitted record (AD-3: stamped by tick). */
  tick: number;
}

export interface IdleRunRow {
  gameId: string;
  score: number;
  tick: number;
}

export type RunKind = "visitor" | "patron" | "idle";

export interface IngestContext {
  /** Occupancy classification, main.ts closures over scheduler + seat:
   * scheduler occupancy BEFORE seat state (occupancy-first), else idle. */
  kindOf: (gameId: string) => RunKind;
  /** The run's RESOLVED seed (the scheduler's `lastSeed` — AD-4 currency). */
  seedOf: (gameId: string) => number;
  /** The patrons body's tick stamp (drawTick) — sim time, never a clock. */
  tick: number;
}

export interface StorageState {
  visitorId: string;
  /** Personal Bests this service has touched, keyed by gameId. */
  personalBests: Record<string, PersonalBest>;
  patronRuns: readonly PatronRunRow[];
  idleRuns: readonly IdleRunRow[];
  /** True once a port read/write threw (quota / private mode — labelled,
   * zero faults; the session keeps its in-memory overlay). */
  degraded: boolean;
  lastIngestTick: number;
}

export interface ScoreSubmittedInput {
  gameId: string;
  score: number;
  initials?: string;
}

export interface StorageService {
  /** Read-or-generate the visitor id (eagerly at boot — "first visit
   * generates"). Written once; read back without rewrite on a reload. */
  visitorId(): string;
  /** One classified score: visitor → Personal Best (iff better); patron →
   * Patron-run ring row. `seed` is the run's resolved seed (patron) or
   * null. Idle classification never calls this (ingest records it in the
   * debug view only). */
  recordScoreSubmitted(entry: ScoreSubmittedInput, kind: "visitor" | "patron", seed: number | null, tick: number): void;
  /** Pure loop over ALREADY-drained records (AD-23: no drain here) — the
   * patrons body's one ingest leg. */
  ingest(records: readonly EventRecord[], ctx: IngestContext): void;
  /** The content-law view for the score zone: [] while the table is empty
   * (the 1.4 CAP-8 zone stays empty byte-unchanged). */
  rowsFor(gameId: string): readonly string[];
  /** Plain-data debug view (the arcadeDebug.storage record). */
  state(): StorageState;
}

export interface StorageServiceOptions {
  storage?: StoragePort;
  uuidFn?: () => string;
  /** Higher-wins Personal Best law at M0 (label): the provisional registry
   * list carries no `scoreHigherIsBetter` (AD-12 field arrives with the
   * Epic-3 ledger machinery); this option is where it will wire. */
  higherIsBetter?: boolean;
}

// --- initials sanitize + pseudonym derivation ---------------------------------

/** Uppercase, strip everything outside A-Z, slice to 3, pad to 3 (the
 * matrix order: uppercase, strip, slice, pad). Never rejects — game-supplied
 * text that cannot be initials still yields 3 harmless letters (NFR-5). */
export function sanitizeInitials(raw: string): string {
  const kept = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, INITIALS_LENGTH);
  return kept.padEnd(INITIALS_LENGTH, INITIALS_PAD_CHAR);
}

/** Present initials count as supplied only when they carry at least one
 * letter — anything else is treated as missing and gets the pseudonym. */
export function isUsableInitials(raw: unknown): raw is string {
  return typeof raw === "string" && /[A-Za-z]/.test(raw);
}

/** FNV-1a-style 32-bit string mix + xorshift-multiply steps — the
 * `derivedSeed` integer-mix family (Math.imul keeps products exact), here
 * shaping LETTERS instead of seeds. No Math.random, no wall clock: the same
 * inputs always spell the same three letters, across reloads and browsers. */
function mixAscii(h: number, s: string): number {
  let x = h >>> 0;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return x;
}

function mixStep(h: number): number {
  let x = h >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  return (x + 0x9e3779b1) >>> 0;
}

function lettersFrom(seed32: number): string {
  let x = seed32 >>> 0;
  let out = "";
  for (let i = 0; i < INITIALS_LENGTH; i++) {
    x = mixStep(x);
    out += String.fromCharCode(65 + (x % 26));
  }
  return out;
}

/** Patron pseudonym: letters from the run's RESOLVED seed — the same
 * derived seed replays the same run next boot, so the same Patron returns
 * with the same scoreboard name (AD-4 currency). */
export function patronPseudonym(seed: number): string {
  return lettersFrom(mixAscii(0x811c9dc5, `patron:${seed >>> 0}`));
}

/** Visitor missing-initials pseudonym: letters from
 * (visitorId, gameId, run tick). Stable for that triple; reload stability
 * for a Personal Best comes from the persisted PB record, not re-derivation. */
export function visitorPseudonym(id: string, gameId: string, tick: number): string {
  return lettersFrom(mixAscii(0x811c9dc5, `visitor:${id}|${gameId}|${tick >>> 0}`));
}

/** Row rendering: `INITIALS SCORE` — initials first (they never exceed the
 * 3-letter law), plain score. Exported so pins never retype the format. */
export function rowText(r: { initials: string; score: number }): string {
  return `${r.initials} ${r.score}`;
}

// --- the service ---------------------------------------------------------------

/** The browser-edge default port: `globalThis.localStorage`. A missing
 * global is a thrown access — the service's `read()`/`write()` try/catch
 * turns that (and quota / private mode) into a labelled degrade; the
 * session keeps its memory overlay. */
function localStoragePort(): StoragePort {
  return {
    getItem: (key) => {
      const ls = (globalThis as { localStorage?: { getItem(k: string): unknown } }).localStorage;
      if (ls == null) throw new Error("storage: globalThis.localStorage is unavailable");
      const v = ls.getItem(key);
      return typeof v === "string" ? v : null;
    },
    setItem: (key, value) => {
      const ls = (globalThis as { localStorage?: { setItem(k: string, v: string): void } }).localStorage;
      if (ls == null) throw new Error("storage: globalThis.localStorage is unavailable");
      ls.setItem(key, value);
    },
  };
}

export function createStorageService(opts: StorageServiceOptions = {}): StorageService {
  const port = opts.storage ?? localStoragePort();
  const uuidFn = opts.uuidFn ?? ((): string => (globalThis as { crypto: Crypto }).crypto.randomUUID());
  const higherIsBetter = opts.higherIsBetter ?? true;

  // The session overlay: every write lands here FIRST (so a throwing port
  // still reads back through this service), reads consult it before the
  // port. A reload is a NEW service over the port — that is the persistence
  // path; the overlay only makes a degraded session serve its own writes.
  const memory = new Map<string, string>();
  let degraded = false;

  function read(key: string): string | null {
    const mem = memory.get(key);
    if (mem !== undefined) return mem;
    try {
      const v = port.getItem(key);
      return v == null ? null : v;
    } catch {
      degraded = true; // device-layer condition, not a room fault (labelled)
      return null;
    }
  }

  function write(key: string, value: string): void {
    memory.set(key, value);
    try {
      port.setItem(key, value);
    } catch {
      degraded = true;
    }
  }

  // --- identity ---------------------------------------------------------------
  let id: string | null = null;

  function visitorId(): string {
    if (id != null) return id;
    const stored = read(VISITOR_KEY);
    if (stored != null && UUID_V4_SHAPE.test(stored)) {
      id = stored;
      return stored; // returning visit: read back, NO rewrite
    }
    // First visit — or a corrupt stored value self-heals (regenerate +
    // rewrite, inference).
    const fresh = uuidFn();
    if (!UUID_V4_SHAPE.test(fresh)) {
      throw new Error(`storage: the uuidFn returned "${fresh}" — not a UUIDv4 (identity law, AD-16)`);
    }
    write(VISITOR_KEY, fresh);
    id = fresh;
    return fresh;
  }

  // --- Personal Bests -----------------------------------------------------------
  const pbCache = new Map<string, PersonalBest>(); // games this service touched (debug view)

  function pbKey(gameId: string): string {
    return `${PB_KEY_PREFIX}${visitorId()}.${gameId}`; // key = (stable gameId, visitorId)
  }

  function parsePb(raw: string): PersonalBest | null {
    try {
      const v = JSON.parse(raw) as { initials?: unknown; score?: unknown } | null;
      if (v == null || typeof v.initials !== "string" || typeof v.score !== "number" || !Number.isFinite(v.score)) {
        return null; // corrupt PB value self-heals on the next accepted score
      }
      return { initials: sanitizeInitials(v.initials), score: v.score };
    } catch {
      return null;
    }
  }

  function readPb(gameId: string): PersonalBest | null {
    const cached = pbCache.get(gameId);
    if (cached !== undefined) return cached;
    const raw = read(pbKey(gameId));
    if (raw == null) return null;
    const pb = parsePb(raw);
    if (pb != null) pbCache.set(gameId, pb);
    return pb;
  }

  // --- the Patron-run ring -------------------------------------------------------
  const patronRuns: PatronRunRow[] = [];
  const idleRuns: IdleRunRow[] = [];
  let lastIngestTick = -1;

  function better(score: number, best: number): boolean {
    return higherIsBetter ? score > best : score < best;
  }

  function recordScoreSubmitted(entry: ScoreSubmittedInput, kind: "visitor" | "patron", seed: number | null, tick: number): void {
    const { gameId } = entry;
    const score = entry.score;
    if (typeof score !== "number" || !Number.isFinite(score)) return; // payload honesty: never crash the room
    const initials = isUsableInitials(entry.initials)
      ? sanitizeInitials(entry.initials)
      : kind === "patron"
        ? patronPseudonym(seed ?? 0)
        : visitorPseudonym(visitorId(), gameId, tick);
    if (kind === "visitor") {
      const existing = readPb(gameId);
      if (existing == null || better(score, existing.score)) {
        const pb: PersonalBest = { initials, score };
        pbCache.set(gameId, pb);
        write(pbKey(gameId), JSON.stringify(pb));
      }
      // Lower (or equal) score than the PB: ignored, the PB is kept.
    } else {
      patronRuns.push({ gameId, initials, score, tick });
      while (patronRuns.length > PATRON_RUN_RING_MAX) patronRuns.shift(); // SEAT_EVENT_WINDOW ring idiom
    }
  }

  // --- reads ---------------------------------------------------------------------
  function rowsFor(gameId: string): readonly string[] {
    const pb = readPb(gameId);
    let best: PatronRunRow | null = null;
    for (const r of patronRuns) {
      if (r.gameId !== gameId) continue;
      if (best == null || better(r.score, best.score)) best = r; // ties keep the first (stable, deterministic)
    }
    const rows: string[] = [];
    if (pb != null) rows.push(rowText(pb)); // content law: PB row first
    if (best != null && rows.length < SCORE_ROW_CAP) rows.push(rowText(best)); // PB + best Patron; Patron-only view: best 1
    return rows; // [] while the table is empty -> the CAP-8 zone renders nothing
  }

  // --- ingest ---------------------------------------------------------------------
  function ingest(records: readonly EventRecord[], ctx: IngestContext): void {
    lastIngestTick = ctx.tick;
    for (const rec of records) {
      if (rec.event.type !== "scoreSubmitted") continue; // AD-6: the canonical channel is the ONLY source
      const payload = rec.event.payload as { score?: unknown; initials?: unknown } | null;
      if (payload == null || typeof payload.score !== "number" || !Number.isFinite(payload.score)) continue;
      const kind = ctx.kindOf(rec.gameId);
      if (kind === "idle") {
        // Neither PB nor Patron run — an authoring oddity fabricates no
        // history (CAP-8); recorded in the debug view only.
        idleRuns.push({ gameId: rec.gameId, score: payload.score, tick: rec.tick });
        while (idleRuns.length > IDLE_RUN_RING_MAX) idleRuns.shift();
        continue;
      }
      const seed = kind === "patron" ? ctx.seedOf(rec.gameId) : null;
      recordScoreSubmitted(
        { gameId: rec.gameId, score: payload.score, initials: typeof payload.initials === "string" ? payload.initials : undefined },
        kind,
        seed,
        rec.tick,
      );
    }
  }

  function state(): StorageState {
    return {
      visitorId: visitorId(),
      personalBests: Object.fromEntries(pbCache),
      patronRuns: patronRuns.slice(),
      idleRuns: idleRuns.slice(),
      degraded,
      lastIngestTick,
    };
  }

  return { visitorId, recordScoreSubmitted, ingest, rowsFor, state };
}
