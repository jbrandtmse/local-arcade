// Story 1.8 QA (AC1-AC5): the storage/identity service — the I/O matrix as
// executed tests. Identity: one UUIDv4 under `arcade.visitor` at first boot,
// written ONCE, read back with no rewrite on a reload, self-heal on a corrupt
// stored value. Personal Bests at `arcade.pb.<visitorId>.<gameId>` as
// {initials, score} higher-wins, fed ONLY by real drained EventRecords: the
// visitor path runs a scripted sim through the REAL wrapper + the REAL seat
// (seat.test.ts direct-handle idiom), the Patron path runs a stub instance on
// the REAL scheduler rig (scheduler.test.ts idiom: fake clock, exactly one
// tick per step, real placements B0 busy with the authored seed) — occupancy
// classification, AD-4 seed currency (ingest rides BEFORE dispatch), the
// runtime-only Patron ring (never a key on the port), and the occupancy-
// before-seat precedence (take a chair mid-autoplay: the score is still the
// Patron's). Initials sanitize to exactly 3 chars A-Z (NFR-5 PII law);
// missing initials get the kernel pseudonyms. The content law (PB first,
// best Patron, cap 2) and the idle-records-neither law run at the unit tier.
// The private-mode port (throws on every access) degrades with ZERO
// supervisor faults — the ingest leg lives inside the supervisor-wrapped
// patrons system, so a service that let a port throw out would land a
// `core.system.patrons` fault this suite reads. The quarantined-Cabinet row
// (AC5) uses the REAL containment guard: no events past the quarantine, so
// rowsFor stays byte-stable while the room keeps ticking. All storage access
// is the injected Map-backed fake (Node has no localStorage; identity seeded
// per test through uuidFn — hermetic).
//
// QA-stage additions (the matrix halves left unexecuted by the implement
// pass): the executed integration chain (the real table's rowsFor output
// composed into the authored fallback zones exactly as main.ts composes them,
// painted by the real painter across a quarantined run), the shipped
// browser-edge DEFAULT port (a globalThis.localStorage planted and removed by
// the test alone — Node has no real store to touch — plus the default
// crypto.randomUUID), the two-boot Patron reload replay ("same seed -> same
// initials next reload" executed, not composed from the pure derivation),
// and the corrupt-PB-value self-heal.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  IDLE_RUN_RING_MAX,
  INITIALS_LENGTH,
  INITIALS_PAD_CHAR,
  PB_KEY_PREFIX,
  PATRON_RUN_RING_MAX,
  SCORE_ROW_CAP,
  UUID_V4_SHAPE,
  VISITOR_KEY,
  createStorageService,
  isUsableInitials,
  patronPseudonym,
  rowText,
  sanitizeInitials,
  visitorPseudonym,
  type PatronRunRow,
  type StoragePort,
  type StorageService,
} from "./storage.ts";
import { createKernelLoop, MS_PER_TICK, type EventRecord } from "./loop.ts";
import { ATTRACT_DWELL_TICKS, createPatronScheduler, derivedSeed, type PatronScheduler } from "./patrons/scheduler.ts";
import { createFigurePresenter } from "./patrons/presenter.ts";
import { createSeatService, type SeatKeyMap, type SeatService } from "./seat.ts";
import { createPlayerController } from "./player.ts";
import { ENTRY_SPAWN, collisionVolumes } from "./room/collision-volumes.ts";
import { SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL, cabinetPlacements, createCabinetRuntime } from "./room/cabinets.ts";
import { paintScreen, type PaintContext, type PaintSurface } from "./room/surfaces.ts";
import { guardInstance, type GameGuard } from "./containment.ts";
import {
  createGameInstance,
  type GameInstance,
  type InstanceMode,
  type SimEvent,
  type SimFactory,
  type TickInput,
} from "./contract/index.ts";
import { gameRegistry } from "../generated/game-registry.ts";

const ENTRY = gameRegistry.find((e) => e.id === "moon-patrol")!;

// Fake UUIDv4 literals (the shape law validates them — the pin below proves
// they are legal shapes, so no test depends on crypto.randomUUID()).
const UUID_A = "11111111-2222-4333-8444-555555555555";
const UUID_B = "aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee";

const MOON_KEYS: SeatKeyMap = {
  axes: { move: { minus: ["ArrowLeft", "KeyA"], plus: ["ArrowRight", "KeyD"] } },
  buttons: { start: ["Enter"], jump: ["KeyX", "KeyK"], fire: ["KeyZ", "KeyJ"] },
};

// --- the injected device slice (Map-backed fake; hermetic) -------------------

interface FakePort {
  port: StoragePort;
  map: Map<string, string>;
  writes: string[]; // setItem order (identity-write-once pins read this)
  setThrowing(on: boolean): void; // private mode / quota simulation
}

function fakePort(initial: Record<string, string> = {}): FakePort {
  const map = new Map(Object.entries(initial));
  const writes: string[] = [];
  let throwing = false;
  return {
    map,
    writes,
    port: {
      getItem: (k) => {
        if (throwing) throw new Error("storage read blocked (private mode)");
        return map.get(k) ?? null;
      },
      setItem: (k, v) => {
        if (throwing) throw new Error("quota exceeded (private mode)");
        writes.push(k);
        map.set(k, v);
      },
    },
    setThrowing: (on) => {
      throwing = on;
    },
  };
}

// --- scripted sims -----------------------------------------------------------

// A scripted sim through the REAL wrapper: the scoreSubmitted events are
// scripted by the test, the record channel is the loop's real drain (AD-6).
function scriptedSim() {
  let pending: SimEvent[] = [];
  let t = 0;
  const factory: SimFactory = () => ({
    tick(_dt: number, _input: TickInput) {
      t += 1;
    },
    events() {
      const out = pending;
      pending = [];
      return out;
    },
    snapshot: () => ({ t }),
  });
  const instance = createGameInstance(factory, 7);
  return {
    instance,
    fire: (ev: SimEvent) => {
      pending.push(ev);
    },
  };
}

// A stub instance for the scheduler rig: the scheduler owns its mode + seeds,
// the test scripts its events (the containment-fault-sites stub idiom).
function stubInstance() {
  let mode: InstanceMode = "attract";
  let pending: SimEvent[] = [];
  const seeds: number[] = [];
  const instance: GameInstance = {
    tick() {},
    events() {
      const out = pending;
      pending = [];
      return out;
    },
    snapshot: () => ({ mode }),
    stateHash: () => `stub:${mode}:${seeds.length}`,
    attract() {
      mode = "attract";
    },
    autoplay(seed: number) {
      mode = "autoplay";
      seeds.push(seed);
    },
    play() {
      mode = "play";
    },
    mode: () => mode,
  };
  return {
    instance,
    fire: (ev: SimEvent) => {
      pending.push(ev);
    },
    autoplaySeeds: () => seeds.slice(),
  };
}

// --- rigs (main.ts wiring, minus the browser halves) --------------------------

function tickOnce(clock: { ms: number }, loop: ReturnType<typeof createKernelLoop>): void {
  clock.ms += MS_PER_TICK + 0.0002; // scheduler.test.ts additive-epsilon idiom
  assert.equal(loop.step(), 1, "exactly one global tick per frame at the tick rate");
}

// The visitor half of the matrix: REAL wrapper instance, REAL seat service
// (1.5 direct sit — no busy gate in this rig), the ingest leg with the seat
// half of main.ts's classifier. The occupancy half and its precedence are
// pinned on the scheduler rig below.
interface VisitorRig {
  loop: ReturnType<typeof createKernelLoop>;
  storage: StorageService;
  sim: ReturnType<typeof scriptedSim>;
  seat: SeatService;
  seen: EventRecord[];
  tick(): void;
  sit(): void;
}

function visitorRig(fake: FakePort, uuid: string): VisitorRig {
  const storage = createStorageService({ storage: fake.port, uuidFn: () => uuid });
  storage.visitorId(); // eager at boot, exactly as main.ts wires it
  const cabinets = createCabinetRuntime();
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const sim = scriptedSim();
  const tickInput: TickInput = { controls: {} };
  loop.addInstance(ENTRY.id, sim.instance, tickInput);
  const seat = createSeatService({ player, cabinets, seedFn: () => 4242 });
  seat.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance: sim.instance,
    input: tickInput,
    controls: ENTRY.controls!,
    keys: MOON_KEYS,
  });
  const seen: EventRecord[] = [];
  loop.addSystem("patrons", () => {
    const recs = loop.drainEvents(); // the ONE drain (AD-23)
    seen.push(...recs);
    storage.ingest(recs, {
      kindOf: (gameId) => {
        const chair = seat.state();
        return chair.seated && chair.gameId === gameId ? "visitor" : "idle";
      },
      seedOf: () => 0,
      tick: loop.tickCount,
    });
  });
  return {
    loop,
    storage,
    sim,
    seat,
    seen,
    tick: () => tickOnce(clock, loop),
    sit() {
      seat.handleInteract("cabinet-B0"); // coin door
      seat.handleInteract("cabinet-B0"); // sit (1.5 law: this rig has no busy gate)
    },
  };
}

// The Patron half: the REAL scheduler over the REAL placements (B0 busy,
// authored seed), a stub instance reached through the REAL containment guard,
// and the patrons body main.ts registers (drain -> ingest -> figure step ->
// dispatch). Player at ENTRY_SPAWN: presence never honoured, so breaks
// relaunch autoplay — the Patron stays on the machine.
interface SchedulerRig {
  loop: ReturnType<typeof createKernelLoop>;
  storage: StorageService;
  stub: ReturnType<typeof stubInstance>;
  guard: GameGuard;
  sched: PatronScheduler;
  seat: SeatService;
  seen: EventRecord[];
  tick(): void;
  b0(): ReturnType<PatronScheduler["state"]>["cabinets"][number];
}

function schedulerRig(fake: FakePort, uuid: string): SchedulerRig {
  const storage = createStorageService({ storage: fake.port, uuidFn: () => uuid });
  storage.visitorId();
  const cabinets = createCabinetRuntime();
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const clock = { ms: 0 };
  const loop = createKernelLoop({ now: () => clock.ms });
  const stub = stubInstance();
  const guard = guardInstance(stub.instance, loop.supervisor, ENTRY.id, { tickCount: () => loop.tickCount });
  const tickInput: TickInput = { controls: {} };
  loop.addInstance(ENTRY.id, guard.instance, tickInput);
  const presenter = createFigurePresenter();
  const seat = createSeatService({ player, cabinets, seedFn: () => 4242 });
  seat.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance: guard.instance,
    input: tickInput,
    controls: ENTRY.controls!,
    keys: MOON_KEYS,
  });
  const scheduler = createPatronScheduler({
    seat,
    player,
    presenter,
    faultedFor: (gameId) => gameId === ENTRY.id && guard.faulted(),
  });
  scheduler.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance: guard.instance,
    seed: ENTRY.seed!,
    impulses: ENTRY.impulses!,
  });
  const seen: EventRecord[] = [];
  loop.addSystem("patrons", () => {
    const recs = loop.drainEvents();
    seen.push(...recs);
    const drawTick = loop.tickCount;
    storage.ingest(recs, {
      kindOf: (gameId) => {
        const occ = scheduler.state().cabinets.find((c) => c.gameId === gameId)?.occupancy;
        if (occ === "patron-autoplay") return "patron";
        const chair = seat.state();
        return chair.seated && chair.gameId === gameId ? "visitor" : "idle";
      },
      seedOf: (gameId) => scheduler.state().cabinets.find((c) => c.gameId === gameId)?.lastSeed ?? 0,
      tick: drawTick,
    });
    presenter.step(loop.tickCount);
    scheduler.dispatch(recs, loop.tickCount);
  });
  return {
    loop,
    storage,
    stub,
    guard,
    sched: scheduler,
    seat,
    seen,
    tick: () => tickOnce(clock, loop),
    b0: () => scheduler.state().cabinets.find((c) => c.volumeId === "cabinet-B0")!,
  };
}

// --- AC1: identity ------------------------------------------------------------

test("AC1 identity: first boot generates exactly one UUIDv4 under arcade.visitor and writes it once; a returning visit reads it back with NO rewrite; a corrupt stored value self-heals (regenerate + rewrite)", () => {
  // The fake literals are legal v4 shapes, and the shape law rejects the
  // near-misses (version nibble, variant nibble, grouping) — the read
  // validation this whole story keys on.
  assert.ok(UUID_V4_SHAPE.test(UUID_A) && UUID_V4_SHAPE.test(UUID_B), "the test ids ARE v4-shaped");
  for (const bad of [
    "corrupt!!",
    "11111111-2222-0333-8444-555555555555", // version nibble != 4
    "11111111-2222-4333-0444-555555555555", // variant nibble outside 8-9-a-b
    "111111112-2222-4333-8444-555555555555", // grouping
  ]) {
    assert.ok(!UUID_V4_SHAPE.test(bad), `"${bad}" is not v4-shaped`);
  }

  const f = fakePort();
  const svc = createStorageService({ storage: f.port, uuidFn: () => UUID_A });
  assert.equal(svc.visitorId(), UUID_A);
  assert.deepEqual([...f.map.keys()], [VISITOR_KEY], "exactly ONE key at first boot — the visitor is the id and nothing else (AD-16)");
  assert.deepEqual(f.writes, [VISITOR_KEY], "written exactly once");
  svc.visitorId();
  svc.visitorId();
  assert.deepEqual(f.writes, [VISITOR_KEY], "later reads never rewrite (first visit generates, later visits read)");

  // Returning visit (reload): a NEW service over the same port must not mint
  // a new identity even though its uuidFn would return a different id.
  const svc2 = createStorageService({ storage: f.port, uuidFn: () => UUID_B });
  assert.equal(svc2.visitorId(), UUID_A, "the reload reads the stored id — the visitor is the same room-regular, not a stranger");
  assert.deepEqual(f.writes, [VISITOR_KEY], "the returning visit adds no write");

  // Corrupt stored value: self-heal (regenerate + rewrite).
  const g = fakePort({ [VISITOR_KEY]: "corrupt!!" });
  const svc3 = createStorageService({ storage: g.port, uuidFn: () => UUID_B });
  assert.equal(svc3.visitorId(), UUID_B, "a corrupt value regenerates rather than poisoning every PB key");
  assert.equal(g.map.get(VISITOR_KEY), UUID_B, "self-heal rewrites the key");

  // A uuidFn that returns a non-v4 value is an authoring/wiring fault — loud.
  assert.throws(
    () => createStorageService({ storage: fakePort().port, uuidFn: () => "not-a-uuid" }).visitorId(),
    /not a UUIDv4/,
    "the identity law is enforced on the generated value too (never store garbage)",
  );
});

test("the pin constants ARE the law values (drift pins): keys, cap 2 (the 2026-11-24 AD-28 ruling 4->2), rings, initials law", () => {
  assert.equal(VISITOR_KEY, "arcade.visitor", "the identity key IS the arcade.* namespace key");
  assert.equal(PB_KEY_PREFIX, "arcade.pb.", "PB keys share the namespace prefix");
  assert.equal(SCORE_ROW_CAP, 2, "AD-28 view cap: PB + best Patron; the 3rd row would collide with the NEXT floor (measured baselines 177/309)");
  assert.equal(PATRON_RUN_RING_MAX, 32, "Patron ring bound (LABELLED PLACEHOLDER — the SEAT_EVENT_WINDOW idiom); pinned against silent drift");
  assert.equal(IDLE_RUN_RING_MAX, 16, "idle ring bound (LABELLED PLACEHOLDER)");
  assert.equal(INITIALS_LENGTH, 3);
  assert.equal(INITIALS_PAD_CHAR, "X");
});

// --- initials + pseudonyms -----------------------------------------------------

test("NFR-5 initials law: sanitize (uppercase, strip, slice, pad) never rejects and never lets PII past 3 A-Z chars; unusable initials take the pseudonym", () => {
  assert.equal(sanitizeInitials("j.d!"), "JDX", "the matrix row verbatim: \"j.d!\" -> JDX");
  assert.equal(sanitizeInitials("ab"), "ABX", "pad to 3");
  assert.equal(sanitizeInitials("Dr. Evil!"), "DRE", "strip FIRST (\"DR. Evil!\" -> DREVIL), then slice — the order the law pins");
  assert.equal(sanitizeInitials("ABCDEFGHIJK"), "ABC", "sliced to 3");
  for (const raw of ["", "!!!", "\u{1F3AE}\u{1F3AE}\u{1F3AE}", "<script>", "Jo", "x y z"]) {
    assert.match(sanitizeInitials(raw), /^[A-Z]{3}$/, `"${raw}" sanitizes to exactly 3 A-Z chars`);
  }
  assert.equal(isUsableInitials("j.d"), true);
  for (const junk of ["", "!!!", 42, null, undefined]) {
    assert.equal(isUsableInitials(junk), false, `${JSON.stringify(junk)} is not initials — the pseudonym covers it`);
  }
});

test("pseudonym derivations are pure and stable: same inputs -> same 3 letters across calls and reloads; different run seeds / different ids differ ([A-Z]{3} law, no clock, no Math.random)", () => {
  const seed0 = derivedSeed(ENTRY.seed!, 0);
  const seed1 = derivedSeed(ENTRY.seed!, 1);
  assert.match(patronPseudonym(seed0), /^[A-Z]{3}$/);
  assert.equal(patronPseudonym(seed0), patronPseudonym(seed0), "the same derived seed spells the same Patron name (a derived-seed replay returns the same regular)");
  assert.notEqual(patronPseudonym(seed0), patronPseudonym(seed1), "different run seeds differ (a Patron row keys on the RESOLVED seed, not the game)");
  assert.match(visitorPseudonym(UUID_A, ENTRY.id, 37), /^[A-Z]{3}$/);
  assert.equal(visitorPseudonym(UUID_A, ENTRY.id, 37), visitorPseudonym(UUID_A, ENTRY.id, 37));
  assert.notEqual(visitorPseudonym(UUID_A, ENTRY.id, 37), visitorPseudonym(UUID_B, ENTRY.id, 37), "two visitors on one device differ");
  assert.notEqual(visitorPseudonym(UUID_A, ENTRY.id, 37), visitorPseudonym(UUID_A, ENTRY.id, 38), "different run ticks differ");
});

// --- AC2/AC4: the visitor path on real drained records -------------------------

test("AC2/AC4 visitor: a seated score through the REAL wrapper + REAL seat lands the PB at arcade.pb.<visitorId>.<gameId> as {initials, score} with the run-tick pseudonym; lower scores never displace it; higher scores do; the reload reads the row back", () => {
  const fake = fakePort();
  const r = visitorRig(fake, UUID_A);
  r.sit();
  assert.equal(r.seat.state().seated, true, "the chair is the matrix row's given");

  r.sim.fire({ type: "scoreSubmitted", payload: { score: 15230 } });
  r.tick();
  const scoreRec = r.seen.find((x) => x.event.type === "scoreSubmitted")!;
  const pbKey = `${PB_KEY_PREFIX}${UUID_A}.${ENTRY.id}`;
  assert.deepEqual(
    [...fake.map.keys()].sort(),
    [VISITOR_KEY, pbKey].sort(),
    "the ONLY keys the room ever writes: the identity and this visitor's PB for this gameId (stable gameId key, AD-9)",
  );
  const stored = JSON.parse(fake.map.get(pbKey)!) as { initials: string; score: number };
  assert.deepEqual(stored, { initials: visitorPseudonym(UUID_A, ENTRY.id, scoreRec.tick), score: 15230 }, "missing initials derive from (visitorId, gameId, the scoreSubmitted RECORD tick) — sim time, never a clock (AD-3)");
  assert.deepEqual(r.storage.rowsFor(ENTRY.id), [rowText(stored)], "the content view shows the PB row");

  // Higher-wins at M0: lower AND equal are ignored, the PB (with its
  // original initials) stays.
  r.sim.fire({ type: "scoreSubmitted", payload: { score: 999 } });
  r.tick();
  assert.equal(fake.map.get(pbKey), JSON.stringify(stored), "a lower score never rewrites the PB");
  r.sim.fire({ type: "scoreSubmitted", payload: { score: 15230 } });
  r.tick();
  assert.equal(fake.map.get(pbKey), JSON.stringify(stored), "an equal score does not rewrite either");

  // Higher: replaced, initials re-derived from the NEW run's tick.
  r.sim.fire({ type: "scoreSubmitted", payload: { score: 20000 } });
  r.tick();
  const bestRec = [...r.seen].reverse().find((x) => x.event.type === "scoreSubmitted")!;
  const stored2 = JSON.parse(fake.map.get(pbKey)!) as { initials: string; score: number };
  assert.equal(stored2.score, 20000);
  assert.equal(stored2.initials, visitorPseudonym(UUID_A, ENTRY.id, bestRec.tick), "the new best carries the new run's pseudonym");
  assert.notEqual(stored2.initials, stored.initials, "the run tick is part of the derivation");

  // AD-16's sim-ignorance half lives at its enforceable tiers: the wrapper
  // gate rejects any tick input shape but {controls} (core/contract/wrapper.ts,
  // its throw pinned in core/seat.test.ts), and the games-source ban scan in
  // core/no-ui-dom.test.ts proves no games source names the table at all.

  // AC4's read-back half: a new service over the same port sees the row.
  const r2 = createStorageService({ storage: fake.port, uuidFn: () => UUID_B });
  assert.deepEqual(r2.rowsFor(ENTRY.id), [rowText(stored2)], "reload: the PB row reads back off the port (read-through cache starts empty)");
});

test("game-supplied initials sanitize into the table: \"j.d!\" -> \"JDX\", a letterless payload falls back to the pseudonym; stored values never carry anything outside [A-Z]{3}", () => {
  const fake = fakePort();
  const r = visitorRig(fake, UUID_A);
  r.sit();
  r.sim.fire({ type: "scoreSubmitted", payload: { score: 5000, initials: "j.d!" } });
  r.tick();
  assert.deepEqual(r.storage.rowsFor(ENTRY.id), ["JDX 5000"], "the matrix row: supplied initials sanitize, never reject-crash (NFR-5)");
  const pbKey = `${PB_KEY_PREFIX}${UUID_A}.${ENTRY.id}`;
  const initials = (JSON.parse(fake.map.get(pbKey)!) as { initials: string }).initials;
  assert.match(initials, /^[A-Z]{3}$/, "what lands on the device is 3 A-Z chars — no PII shape survives (mutation: passthrough initials land this red)");

  const g = fakePort();
  const r2 = visitorRig(g, UUID_A);
  r2.sit();
  r2.sim.fire({ type: "scoreSubmitted", payload: { score: 40, initials: "!!!" } });
  r2.tick();
  const row = r2.storage.rowsFor(ENTRY.id)[0]!;
  const rec = r2.seen.find((x) => x.event.type === "scoreSubmitted")!;
  assert.equal(row, `${visitorPseudonym(UUID_A, ENTRY.id, rec.tick)} 40`, "letterless 'initials' count as missing — the pseudonym law, not an arbitrary pad");
});

// --- the Patron path on the real scheduler rig ----------------------------------

test("AC2 Patron autoplay run: the row's initials derive from the run's RESOLVED seed (AD-4 currency — ingest rides BEFORE dispatch), the table is RUNTIME-ONLY (no key ever written), and idle-classified scores record neither PB nor Patron row", () => {
  const fake = fakePort();
  const r = schedulerRig(fake, UUID_A);

  // Idle half: before the dwell the occupancy is attract and the chair is
  // empty -> an authoring oddity's scoreSubmitted fabricates no history
  // (CAP-8 honesty): debug view only.
  r.stub.fire({ type: "scoreSubmitted", payload: { score: 777 } });
  r.tick();
  const idleRec = r.seen.find((x) => x.event.type === "scoreSubmitted")!;
  const stIdle = r.storage.state();
  assert.deepEqual(stIdle.patronRuns, [], "idle credits nobody's Patron row");
  assert.deepEqual(stIdle.personalBests, {}, "idle credits nobody's PB");
  assert.deepEqual(stIdle.idleRuns, [{ gameId: ENTRY.id, score: 777, tick: idleRec.tick }], "the idle ring is the only trace");
  assert.deepEqual(r.storage.rowsFor(ENTRY.id), [], "and the score zone stays honestly empty (the 1.4 CAP-8 law)");
  assert.deepEqual([...fake.map.keys()], [VISITOR_KEY], "idle wrote nothing but the identity");

  // Past the authored dwell the Patron takes the machine (run 0, derived seed).
  for (let i = 0; i < ATTRACT_DWELL_TICKS; i++) r.tick();
  assert.equal(r.b0().occupancy, "patron-autoplay");
  assert.equal(r.b0().lastSeed, derivedSeed(ENTRY.seed!, 0));

  // The AD-4 currency guard: scoreSubmitted AND gameEnded drained the SAME
  // tick — ingest runs before scheduler.dispatch, so the score credits run
  // 0's resolved seed; dispatch then relaunches run 1 on the next derived
  // seed. A post-dispatch ingest would spell the row from run 1's seed
  // (mutation: move the ingest leg after dispatch and both seed pins red).
  r.stub.fire({ type: "scoreSubmitted", payload: { score: 12000 } });
  r.stub.fire({ type: "gameEnded", payload: {} });
  r.tick();
  assert.equal(r.b0().runCount, 2, "busy never withholds: the break relaunched autoplay (the scheduler ran after ingest)");
  assert.equal(r.b0().lastSeed, derivedSeed(ENTRY.seed!, 1));
  assert.deepEqual(r.stub.autoplaySeeds(), [derivedSeed(ENTRY.seed!, 0), derivedSeed(ENTRY.seed!, 1)], "the instance-side view of the two resolved seeds");
  const rows = r.storage.state().patronRuns;
  assert.equal(rows.length, 1, "exactly one Patron row from one run");
  assert.equal(rows[0]!.initials, patronPseudonym(derivedSeed(ENTRY.seed!, 0)), "the row derives from the run's RESOLVED seed at ingest time — the same seed replays the same Patron name next reload");
  assert.notEqual(rows[0]!.initials, patronPseudonym(derivedSeed(ENTRY.seed!, 1)), "NOT the next run's seed (the off-by-one this leg exists to prevent)");
  assert.deepEqual(
    [...fake.map.keys()],
    [VISITOR_KEY],
    "RUNTIME-ONLY law: Patron runs never touch the device — no PB key, no Patron key (derived seeds replay them anyway; persistence would store recomputable state)",
  );
  assert.deepEqual(r.storage.state().personalBests, {}, "a Patron score never becomes a Personal Best");
});

test("occupancy beats the chair: a Visitor takes the seat while the scheduler still holds patron-autoplay — the next score is still the Patron's (never a PB)", () => {
  const fake = fakePort();
  const r = schedulerRig(fake, UUID_A);
  for (let i = 0; i < ATTRACT_DWELL_TICKS; i++) r.tick();
  assert.equal(r.b0().occupancy, "patron-autoplay", "the Patron holds run 0");
  assert.equal(r.seat.takeOver("cabinet-B0"), true, "the given: the chair is occupied while occupancy still reads patron-autoplay (scheduler-side flips happen at breaks only)");
  assert.equal(r.b0().occupancy, "patron-autoplay");

  r.stub.fire({ type: "scoreSubmitted", payload: { score: 111 } });
  r.tick();
  const rows = r.storage.state().patronRuns;
  assert.equal(rows.length, 1, "the score went to the Patron row (occupancy-first classification)");
  assert.equal(rows[0]!.initials, patronPseudonym(derivedSeed(ENTRY.seed!, 0)));
  assert.deepEqual(r.storage.state().personalBests, {}, "mutation: asking the CHAIR first classifies this visitor-side and a PB appears here — red");
  assert.deepEqual([...fake.map.keys()], [VISITOR_KEY], "and still no PB key ever reached the device");
});

// --- content law (unit tier) ----------------------------------------------------

test("the content law: empty -> []; Patron-only -> best 1; PB -> PB first then best Patron; cap 2 even past it; higher-wins flips with the option; equal never replaces; rings cap with the shift law", () => {
  const svc = createStorageService({ storage: fakePort().port, uuidFn: () => UUID_A });
  assert.deepEqual(svc.rowsFor("moon-patrol"), [], "no table -> honest empty zone (never invented history)");

  svc.recordScoreSubmitted({ gameId: "a", score: 500 }, "patron", 10, 1);
  svc.recordScoreSubmitted({ gameId: "a", score: 1200 }, "patron", 20, 2);
  svc.recordScoreSubmitted({ gameId: "a", score: 900 }, "patron", 30, 3);
  assert.deepEqual(svc.rowsFor("a"), [`${patronPseudonym(20)} 1200`], "Patron-only view: the BEST Patron alone (best 1 of the AD-28 fit law)");

  svc.recordScoreSubmitted({ gameId: "a", score: 7000, initials: "abc" }, "visitor", null, 4);
  assert.deepEqual(svc.rowsFor("a"), ["ABC 7000", `${patronPseudonym(20)} 1200`], "PB row FIRST, then the best Patron row — the content law");

  for (let i = 0; i < 8; i++) svc.recordScoreSubmitted({ gameId: "a", score: 200 + i, initials: `p${i}`.slice(0, 3).padEnd(3, "x") }, "patron", 100 + i, 10 + i);
  assert.equal(svc.rowsFor("a").length, SCORE_ROW_CAP, "the cap is the view law even past it (the painter's collision throw stays the loud guard behind it)");

  // Higher-wins is the M0 law; the option is where AD-12's field will wire.
  const low = createStorageService({ storage: fakePort().port, uuidFn: () => UUID_A, higherIsBetter: false });
  low.recordScoreSubmitted({ gameId: "g", score: 500, initials: "aaa" }, "visitor", null, 1);
  low.recordScoreSubmitted({ gameId: "g", score: 500, initials: "bbb" }, "visitor", null, 2);
  assert.equal(Object.entries(low.state().personalBests)[0]?.[1].initials, "AAA", "equal never replaces (the first runner's initials are stable across reloads)");
  low.recordScoreSubmitted({ gameId: "g", score: 100, initials: "ccc" }, "visitor", null, 3);
  assert.equal(Object.entries(low.state().personalBests)[0]?.[1].score, 100, "with higherIsBetter:false the LOWER score wins");
  low.recordScoreSubmitted({ gameId: "g", score: 400, initials: "ddd" }, "visitor", null, 4);
  assert.equal(Object.entries(low.state().personalBests)[0]?.[1].score, 100, "and a higher one is then ignored");

  // Ring caps with the SEAT_EVENT_WINDOW push/shift law.
  const ring = createStorageService({ storage: fakePort().port, uuidFn: () => UUID_A });
  for (let i = 0; i < PATRON_RUN_RING_MAX + 8; i++) ring.recordScoreSubmitted({ gameId: "a", score: i }, "patron", i, i);
  const runs = ring.state().patronRuns;
  assert.equal(runs.length, PATRON_RUN_RING_MAX, "the Patron ring holds the newest PATRON_RUN_RING_MAX rows");
  assert.equal(runs[0]!.score, 8, "the OLDEST rows shift out (the ring's shift law)");
  const idleRing = createStorageService({ storage: fakePort().port, uuidFn: () => UUID_A });
  const junk: EventRecord[] = [];
  for (let i = 0; i < IDLE_RUN_RING_MAX + 5; i++) junk.push({ tick: i, gameId: "a", event: { type: "scoreSubmitted", payload: { score: i } } });
  idleRing.ingest(junk, { kindOf: () => "idle", seedOf: () => 0, tick: junk.length - 1 });
  assert.equal(idleRing.state().idleRuns.length, IDLE_RUN_RING_MAX, "the idle ring caps the same way");
  assert.equal(idleRing.state().idleRuns[0]!.score, 5, "and shifts the oldest");
});

test("ingest is the pure loop over ALREADY-drained records: non-scoreSubmitted, payload-less, non-finite, and string-score records are skipped before classification; idle never reaches the table tiers", () => {
  const fake = fakePort();
  const svc = createStorageService({ storage: fake.port, uuidFn: () => UUID_A });
  svc.ingest(
    [
      { tick: 1, gameId: "a", event: { type: "gameEnded", payload: {} } },
      { tick: 2, gameId: "a", event: { type: "scoreSubmitted", payload: null } },
      { tick: 3, gameId: "a", event: { type: "scoreSubmitted", payload: { score: Number.NaN } } },
      { tick: 4, gameId: "a", event: { type: "scoreSubmitted", payload: { score: "12" } } },
      { tick: 5, gameId: "a", event: { type: "scoreSubmitted", payload: { score: Infinity } } },
    ],
    { kindOf: () => "visitor", seedOf: () => 0, tick: 5 },
  );
  assert.deepEqual(svc.rowsFor("a"), [], "no junk payload ever enters the table (payload honesty: a hostile sim event cannot crash the room)");
  assert.deepEqual(svc.state().idleRuns, [], "skips happen BEFORE classification (an invalid score is not even an idle row)");
  assert.deepEqual(svc.state().personalBests, {});
  assert.deepEqual([...fake.map.keys()], [VISITOR_KEY], "the only write is the identity the table access resolved — every junk payload wrote nothing (rowsFor triggers the first read; in main.ts the id is eager at boot)");
  assert.equal(svc.state().lastIngestTick, 5, "the debug view stamps the ingest's sim time (AD-3: the caller's tick stamp, never a clock read)");
});

// --- AC4: one device, two visitors ---------------------------------------------

test("AC4 no cross-bleed: the PB key carries the visitorId leg — a NEW identity on the SAME port (regenerated after the id leg was corrupted) starts at the honest empty table (mutation: pbKey without the visitorId leg reads A's row for B and reds this)", () => {
  const fake = fakePort();
  const svcA = createStorageService({ storage: fake.port, uuidFn: () => UUID_A });
  svcA.recordScoreSubmitted({ gameId: ENTRY.id, score: 500, initials: "aaa" }, "visitor", null, 1);
  const keyA = `${PB_KEY_PREFIX}${UUID_A}.${ENTRY.id}`;
  assert.ok(fake.map.has(keyA), "A's PB sits under A's id");
  // One browser shares one port — "a second visitor" on the same port is a
  // REGENERATED identity (the stored id leg corrupted/wiped and re-minted;
  // the self-heal path from the AC1 test). That is the state a key without
  // the visitorId leg would poison.
  fake.map.set(VISITOR_KEY, "corrupt!!");
  const svcB = createStorageService({ storage: fake.port, uuidFn: () => UUID_B });
  assert.equal(svcB.visitorId(), UUID_B, "B gets a fresh identity (rewrite) — and A's PB key stays untouched on the port");
  assert.ok(fake.map.has(keyA), "B's boot never disturbs A's row");
  assert.deepEqual(svcB.rowsFor(ENTRY.id), [], "B shares the device, never the table");
  assert.deepEqual(svcA.rowsFor(ENTRY.id), ["AAA 500"], "A keeps their row");
  const svcA2 = createStorageService({ storage: fake.port, uuidFn: () => UUID_A });
  assert.equal(svcA2.visitorId(), UUID_B, "A's reload now reads the CURRENT id (B's) — the id is device-wide by law, and with it A's own rows read back under B's id only if A IS B; the mutation-target leg below keeps the per-game keys per-id");
  const keyB = `${PB_KEY_PREFIX}${UUID_B}.${ENTRY.id}`;
  assert.ok(!fake.map.has(keyB), "B's empty table never wrote a key");
});

// --- degradation (private mode / quota) ------------------------------------------

test("a throwing storage port degrades INSIDE the service: zero supervisor faults across a real patrons-system tick, the session serves its own writes from the memory overlay, and the port stayed empty", () => {
  const fake = fakePort();
  fake.setThrowing(true); // every getItem/setItem throws (private mode)
  const r = visitorRig(fake, UUID_A);
  assert.equal(r.storage.state().degraded, true, "the boot identity write already hit the wall — the condition is flagged (labelled), not faulted");
  assert.equal(r.storage.visitorId(), UUID_A, "the id still resolves for the session (overlay write)");
  r.sit();
  r.sim.fire({ type: "scoreSubmitted", payload: { score: 4242 } });
  for (let i = 0; i < 30; i++) r.tick();
  assert.equal(r.loop.tickCount, 30, "the room kept ticking — a private-mode browser is a device-layer condition, never a room fault");
  assert.deepEqual(r.loop.supervisor.faults, [], "ZERO fault records: the ingest leg lives inside the supervisor-wrapped patrons system, and the service caught the port's throws before they got there (mutation: drop the write try/catch and a core.system.patrons fault lands here)");
  assert.deepEqual([...fake.map.keys()], [], "the port is empty — nothing persisted");
  const scoreRec = r.seen.find((x) => x.event.type === "scoreSubmitted")!;
  assert.deepEqual(
    r.storage.rowsFor(ENTRY.id),
    [`${visitorPseudonym(UUID_A, ENTRY.id, scoreRec.tick)} 4242`],
    "reads serve the session from the overlay: the degraded table still paints (rowsFor works without the port)",
  );
});

// --- AC5: the quarantine law reaches the table ------------------------------------

test("AC5: a quarantined Cabinet emits NOTHING past the fault — rowsFor stays byte-stable through the whole fallback run while the room keeps ticking; one fault record, zero table churn", () => {
  const fake = fakePort();
  const r = schedulerRig(fake, UUID_A);
  for (let i = 0; i < ATTRACT_DWELL_TICKS; i++) r.tick();
  r.stub.fire({ type: "scoreSubmitted", payload: { score: 12000 } });
  r.tick();
  const rowsBefore = r.storage.rowsFor(ENTRY.id);
  assert.equal(rowsBefore.length, 1, "the Patron row exists before the fault (the byte-stability has a baseline to hold)");
  assert.deepEqual(r.loop.supervisor.faults, [], "the guarded stub run was clean up to here");

  r.guard.injectFault("smoke: dead machine"); // the 1.7 law path, not a scripted one
  assert.equal(r.loop.supervisor.faults.length, 1, "exactly one containment record — the table adds none");
  r.stub.fire({ type: "scoreSubmitted", payload: { score: 999999 } }); // the quarantined guard will never deliver it
  r.tick();
  assert.equal(r.b0().occupancy, "attract", "the fault lifted the Patron (1.7 faultedFor law) — the launch gate keeps it there while the fault stands");
  for (let i = 0; i < 720; i++) r.tick();
  assert.deepEqual(r.storage.rowsFor(ENTRY.id), rowsBefore, "the guard's quarantine means NO events ever drain: the score zone keeps painting the rows it had (AC5's byte-stability)");
  assert.equal(r.storage.state().patronRuns.length, 1);
  assert.equal(r.storage.state().idleRuns.length, 0, "and the suppressed events did not even land in the idle ring");
  assert.deepEqual([...fake.map.keys()], [VISITOR_KEY], "the fallback run wrote nothing");
  assert.equal(r.loop.supervisor.faults.length, 1, "one fault record across 720 fallback ticks (DW-3)");
  assert.ok(r.loop.tickCount >= ATTRACT_DWELL_TICKS + 722, "the room never crashed around the silent table (600 dwell + score tick + fault tick + 720 fallback ticks)");
});

// --- source-level laws -------------------------------------------------------------

test("storage law at the source: the module reads no wall clock and no Math.random (AD-3 — pseudonym stability across reloads depends on it)", () => {
  const REPO = path.resolve(import.meta.dirname, "..");
  // Comments are exempt (the module's own law text names the bans it
  // enforces) — the scan reads the CODE.
  const src = readFileSync(path.join(REPO, "core", "storage.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  for (const banned of ["Date.now", "performance.now", "Math.random", "new Date"]) {
    assert.ok(!src.includes(banned), `core/storage.ts must not read ${banned}`);
  }
});

// --- QA stage: the halves the implement pass left unexecuted -------------------

// A recording fake canvas for the chain test (the cabinets.test.ts
// fake-painter idiom, narrowed to what the chain law reads: lettered texts
// and their baselines). The 0.92em condensed advance is the deterministic
// fake metric the surfaces pins share.
function fakeCanvas() {
  const texts: { text: string; y: number }[] = [];
  const factory = (width: number, height: number): PaintSurface => {
    const ctx: PaintContext = {
      fillStyle: "",
      font: "",
      textAlign: "",
      letterSpacing: "",
      fillRect() {},
      drawImage() {},
      fillText(text, _x, y) {
        texts.push({ text, y });
      },
      measureText(text) {
        const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
        if (!m) throw new Error("fake measureText: font string carries no px size");
        return { width: text.length * 0.92 * Number(m[1]) };
      },
    };
    return { width, height, getContext: (kind) => (kind === "2d" ? ctx : null) };
  };
  return { factory, texts };
}

// Rule 1's integration row EXECUTED across tiers + AC5's paint half: the
// shipped entry's composition (authored zones spread, score leg replaced by
// the service's rows) feeding the REAL fallback painter, across the REAL
// quarantine. The glue pins prove the shipped frame() composes; the storage
// suite proves the table never churns; the surfaces tier proves the layout —
// nothing yet ran the service's actual rowsFor output THROUGH the painter
// step after step. mutation: the drawScreen rows-branch keeps painting the
// attract block (drop the AD-28 yield) -> the first row baseline collides
// with NEXT and the throw escapes this test -> red; revert.
test("QA chain (Rule 1 executed + AC5 paint half): the quarantined table's rowsFor output composed as main.ts composes it paints on the REAL fallback face through the 720-tick fallback run — the row keeps lettering at the AD-28 baseline, the attract block stays yielded, nothing throws, no new row", () => {
  const fake = fakePort();
  const r = schedulerRig(fake, UUID_A);
  for (let i = 0; i < ATTRACT_DWELL_TICKS; i++) r.tick();
  r.stub.fire({ type: "scoreSubmitted", payload: { score: 12000 } });
  r.tick();
  const p = cabinetPlacements[0]!;
  assert.equal(p.gameId, ENTRY.id, "the authored B0 placement is wired to the gameId the rig runs (the composition gate main.ts applies)");
  const rows = r.storage.rowsFor(ENTRY.id);
  assert.equal(rows.length, 1, "the Patron row exists before the fault — the table has a CURRENT state the face must keep painting");
  const expected = [...rows, p.screenZones.next.toUpperCase()];

  r.guard.injectFault("smoke: dead machine");
  for (let i = 0; i < 720; i++) {
    r.tick();
    if (i % 120 !== 0) continue;
    // The exact shipped composition from main.ts frame(): spread the
    // authored record, replace ONLY the score leg with the table's rows.
    const zones = p.gameId != null ? { ...p.screenZones, score: r.storage.rowsFor(p.gameId) } : p.screenZones;
    const f = fakeCanvas();
    paintScreen(f.factory, zones, r.loop.tickCount, "#15110e", "#5bc8ff", "#ffc46b", SCREEN_ATTRACT_CAP_M, SCREEN_NEXT_CAP_M, SHELL.screen.width, SHELL.screen.height);
    assert.deepEqual(
      f.texts.map((t) => t.text),
      expected,
      `tick ${r.loop.tickCount}: the face still letters the CURRENT table row and NEXT only — no dead table, no attract revival, no invented row`,
    );
    assert.equal(f.texts[0]!.y, 177, "the Patron row holds the measured AD-28 baseline (177) all the way through the fallback run");
  }
  assert.equal(r.storage.state().patronRuns.length, 1, "the painter saw no churn: the guard emitted nothing across the whole run");
  assert.deepEqual(r.storage.rowsFor(ENTRY.id), rows, "rowsFor byte-stable end to end (the matrix's quarantine row, chain tier)");
});

// AC6's degradation law at the tier the whole suite otherwise cannot reach:
// the SHIPPED browser-edge wiring (no injected port, no injected uuidFn).
// The global store is a planted fake this test creates and removes (Node has
// no localStorage global; there is no real store here to touch — hermetic).
// mutation: the service's write() drops its try/catch -> the missing-global
// and quota sections throw past visitorId() -> red; revert.
test("QA default port (AC6 browser-edge tier): the shipped service writes through a planted globalThis.localStorage and the default crypto.randomUUID mints a real v4; a missing global or a throwing store degrades INSIDE the service at boot (the fake global is created and removed by this test alone)", () => {
  const G = globalThis as { localStorage?: { getItem(k: string): unknown; setItem(k: string, v: string): void } };
  const prev = G.localStorage; // verified absent on this Node — the idiom's premise
  const restore = (): void => {
    if (prev === undefined) delete G.localStorage;
    else G.localStorage = prev;
  };
  try {
    const store = new Map<string, string>();
    G.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
    };
    const svc = createStorageService(); // no options: the exact shipped boot wiring
    const id = svc.visitorId();
    assert.match(id, UUID_V4_SHAPE, "the default uuidFn (crypto.randomUUID) mints a legal v4 — executed at the browser edge, not inferred");
    assert.equal(store.get(VISITOR_KEY), id, "the default port wrote the id THROUGH to the device store");
    assert.equal(svc.state().degraded, false, "a working store never flags degraded");
    svc.recordScoreSubmitted({ gameId: "g", score: 10, initials: "abc" }, "visitor", null, 1);
    assert.equal(store.get(`${PB_KEY_PREFIX}${id}.g`), JSON.stringify({ initials: "ABC", score: 10 }), "the PB persists through the DEFAULT port — the shipped reload path");
    const svc2 = createStorageService(); // reload at the default wiring
    assert.equal(svc2.visitorId(), id, "and the reload reads the same id back");
  } finally {
    restore();
  }
  try {
    delete G.localStorage; // the Node condition the injected-fake idiom hides
    const svc = createStorageService();
    assert.match(svc.visitorId(), UUID_V4_SHAPE, "boot survives a missing store — the id resolves from the session overlay");
    assert.equal(svc.state().degraded, true, "and the condition is flagged (labelled), never faulted");
    assert.deepEqual(svc.rowsFor("g"), [], "the overlay's empty table paints the honest empty zone");
  } finally {
    restore();
  }
  try {
    G.localStorage = {
      getItem: () => {
        throw new Error("quota exceeded (private mode)");
      },
      setItem: () => {
        throw new Error("quota exceeded (private mode)");
      },
    };
    const svc = createStorageService();
    assert.match(svc.visitorId(), UUID_V4_SHAPE, "a quota-throwing store degrades the session, never the room");
    assert.equal(svc.state().degraded, true, "flagged through the default port too");
  } finally {
    restore();
  }
});

// AC2's reload half of "same seed -> same initials next reload", EXECUTED as
// two boots rather than composed from the pure derivation + the scheduler's
// replay pins: a fresh service + fresh scheduler over the authored B0 data
// replays run 0 with the same resolved seed and spells the same Patron
// regular. mutation: the patron seed leg becomes the record tick (patron
// initials keyed on sim time, not the resolved seed) -> the seed-keying pin
// reds while the boot-to-boot equality alone would survive; revert.
test("QA reload replay (AC2/AD-4): a FRESH room (new service + new scheduler over the authored B0 data) replays the Patron run with the SAME resolved seed and the SAME initials; the name keys on the run's RESOLVED seed, not on time", () => {
  const boot = (): { row: PatronRunRow; rows: readonly string[] } => {
    const r = schedulerRig(fakePort(), UUID_A);
    for (let i = 0; i < ATTRACT_DWELL_TICKS; i++) r.tick();
    assert.equal(r.b0().occupancy, "patron-autoplay");
    assert.equal(r.b0().lastSeed, derivedSeed(ENTRY.seed!, 0), "boot N resolves run 0 on the authored seed's first derived value");
    r.stub.fire({ type: "scoreSubmitted", payload: { score: 12000 } });
    r.tick();
    return { row: r.storage.state().patronRuns[0]!, rows: r.storage.rowsFor(ENTRY.id) };
  };
  const a = boot();
  const b = boot();
  assert.deepEqual(b.row, a.row, "boot two replays boot one row-for-row: the same Patron regular returns with the same scoreboard name");
  assert.deepEqual(b.rows, a.rows, "and the score zone shows the same best-1 Patron row");
  assert.equal(a.row.initials, patronPseudonym(derivedSeed(ENTRY.seed!, 0)), "the name keys on the run's RESOLVED seed (AD-4 currency) — not on any time or boot counter");
});

// The corrupt-PB self-heal the module header claims but no pin ran: a value
// that parses but carries the wrong shape never reaches the score zone, and
// the next accepted score rewrites the key. mutation: parsePb relaxes the
// score-shape check (Number.isFinite -> != null) -> an "ABX 12" row appears
// from the corrupt value -> red; revert.
test("QA self-heal (AC4 honesty half): a corrupt PB value on the port renders NO row (a garbage value never enters the score zone); the next accepted score rewrites the key", () => {
  const key = `${PB_KEY_PREFIX}${UUID_A}.g`;
  const fake = fakePort({
    [key]: '{"initials":"AB","score":"12"}', // parses fine, wrong score shape
    [`${PB_KEY_PREFIX}${UUID_A}.h`]: "{not json", // does not parse at all
  });
  const svc = createStorageService({ storage: fake.port, uuidFn: () => UUID_A });
  assert.deepEqual(svc.rowsFor("g"), [], "a wrong-shape PB value is no PB at all — rowsFor stays honest (CAP-8)");
  assert.deepEqual(svc.rowsFor("h"), [], "an unparseable value likewise renders nothing and never throws");
  svc.recordScoreSubmitted({ gameId: "g", score: 5, initials: "aaa" }, "visitor", null, 1);
  assert.deepEqual(svc.rowsFor("g"), ["AAA 5"], "the next accepted score heals the key");
  assert.equal(JSON.parse(fake.map.get(key)!).score, 5, "and the write lands — the corrupt value never wedges the read path");
});
