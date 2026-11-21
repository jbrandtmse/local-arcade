# Adversarial Divergence Review — ARCHITECTURE-SPINE.md (2026-11-19)

Reviewer posture: construct, not critique. Each finding below is a *pair of buildable units* (Game epics, Core stories, Factory skills, Zone stories, gate scripts) such that **each unit in the pair obeys every AD in the spine to the letter**, yet the two artifacts are mutually incompatible when integrated — clashing shared-data shapes, two owners of one entity, conflicting mutation paths, or an AD whose Rule admits two readings that yield different artifacts.

## Verdict

**REVISE (seam-level, not structural).** The paradigm, ownership spine, gate ladder, and deployment envelope are coherent and defensible. The exposure is concentrated in one layer: **the contract seam is named but not specified.** Hook names are verbatim (`attract()/autoplay(seed)/events()/stateHash()`) but their call protocol, cadence, event vocabulary, and payload schemas are not; ledger↔manifest field ownership has two authorities for `seed`; and the import diagram as drawn forbids the very kernel→sim runtime path that AD-3/AD-5/AD-15 assume. Six divergence pairs follow (D1–D6), each fixable by a small additive clause. None require re-choosing the paradigm.

---

## D1 — The end/break event has no name: every game may emit one, the scheduler cannot find one

**Units:** Game epic "moon-patrol (M0 wrapper)" · Core story "Patron queue/takeover (AD-23)" · Factory skill "contract-test (L1 harness)".

**Clauses obeyed (both/all):**
- AD-8 L1: "seeded autoplay runs **to a real end state** (the game emits **its end/break event** …)". Addendum G: "reaches a real end state **and emits events**." Neither names a canonical event type.
- Conventions: "sim/kernel events = plain-data `{type, payload}`, camelCase" — shape only, no reserved vocabulary.
- AD-23: "the visitor may wait, take over **at the end/break event** (guaranteed by L1 end-state, AD-8)" — the kernel scheduler must recognize that event; *how it recognizes it is nowhere specified*. Input arbitration "belongs to the kernel"; AD-1 keeps per-game knowledge out of Core code; the per-game data asset available is the impulse mapping, which AD-23 scopes to reactions (flinch/slam/jump), not arbitration.

**Construction:** moon-patrol's sim emits its native vocabulary — `playerDied`, `levelCleared` — both camelCase `{type,payload}` events. L1 passes under the contract-test skill's per-game reading of "its end event" (the skill, generating the suite "from the contract," must itself choose a detector: either a canonical name it stamps — the spine has none — or a heuristic: event stream quiets / stateHash plateaus). The M2 scheduler story, written after the Factory run, consumes a canonical name it invented (`gameEnded`/`roundBreak`) because it may only key on kernel-facing data.

**Incompatibility:** at the one machine the queue ritual was demoed on since M0, the scheduler never observes an end/break → takeover at break (FR-4) is impossible exactly where busy-presence is guaranteed; "busy is never permanent" breaks in production while every per-unit gate stays green. Scheduled full-room regression also flips color depending on which L1 detector reading the skill used, for the identical game.

**Tightening:** AD-8/AD-23 + Conventions: reserve kernel-consumed event types — at minimum `gameEnded` and `roundBreak` — as the single end/break vocabulary every game's sim must emit (per-game flavor events allowed alongside). L1 asserts the canonical type appears before autoplay terminates; AD-23's takeover trigger keys only on these types. Games without a natural end (endless modes) must synthesize a `roundBreak`; L1's end-state proof then means one unambiguous thing.

---

## D2 — Name-only hooks + a missing diagram edge: the calling sequence (who drives the sim, when, and how events leave it) admits two compliant architectures

**Units:** Core story "master loop / supervisor (M0–M1, 'kernel drives tick')" · Game epic "any sim" · Factory skill "contract-test (headless harness)" · plus the import diagram preamble.

**Clauses obeyed:**
- Diagram preamble: "Dependency direction is a rule; the diagram shows allowed imports only — **anything not drawn is forbidden**." The diagram draws `KERNEL→REG`, `REG→PRES` ("imports presentation modules"), `PRES→SIM`, `GATE→SIM`. **No `REG→SIM` and no `KERNEL→SIM` edge exists.** Yet AD-3 ("Core master loop drives one global 60Hz tick"), AD-5 (Core hashes game state), AD-15 ("supervisor catches sim errors"), AD-8 (`autoplay(seed)`, `stateHash()` are Core-called) all require the kernel to hold and drive sims.
- AD-6: "sims **emit** plain-data event lists **each tick**" — push, per-tick, from the sim.
- AD-8: hook `events()` verbatim — a pull-style retrieval by name.

**Construction, unit A (push, kernel-direct):** Core loop story obtains sim handles from the registry ("the only game-facing surface at runtime," AD-1, satisfied via REG), calls `tick(dt, input)` at 60Hz, harvests the event list from tick's return value, wraps the call in the supervisor (AD-15), passes state snapshots to Core's hash (AD-5).

**Construction, unit B (pull, adapter-host):** an equally letter-clean story: the diagram forbids kernel→sim, and the only module allowed to reach sim is the presentation adapter (`PRES→SIM`), so the adapter hosts the sim: the kernel calls the registry entry's update, the adapter calls `sim.tick(...)`, obtains input from the input service (`PRES→SVC`), and hands events up through a Core service; a game written to this reading *buffers* events for `events()` and returns nothing from tick. The L1 harness — which imports "the sim half only" (AD-8) — polls `events()` (the only hook whose name references events) and sees a full, correct event stream; the contract-test skill passes.

**Incompatibility:** unit B's games produce zero events in unit A's room (kernel reads tick return; game buffers for `events()`): Patron reactions, banter triggers, scoreSubmitted, and the end-state trigger all go silent in production while L0 (names exist), L1 (harness polls), and the game's own story acceptance are green — and the L2 causality probe only fires because it injects synthetic events at the wrong boundary. Symmetrically, `attract()` admits "one-shot mode entry, then tick advances" vs "the per-tick attract driver," changing which function L1 must call to make stateHash advance; and `tick(dt, input)` with measured wall dt contradicts AD-3's "sim time = tick count" and re-opens the frame-timing-dependent stateHash that AD-3 exists to prevent. The diagram-vs-AD-3/5/15 gap means the spine currently *forces* the adapter-host reading by letter while its ADs *assume* the kernel-direct reading — the two cannot both ship.

**Tightening:** (1) draw `REG -->|also re-exports sim halves| SIM` (the memlog already says "the room mounts both"). (2) Add a one-paragraph calling protocol to AD-8: kernel calls `tick(dt, input)` each 60Hz tick with constant dt = 1/60 tick units; the **return value** of tick carries the event list (`events()` is a stateless re-read of the current unflushed buffer, or is deleted); `attract()` and `autoplay(seed)` are one-shot kernel-initiated mode switches after which only `tick()` advances state; rng injection is an instantiation argument at registry-construction time (AD-4). (3) State that supervisor wrapping happens at the kernel's tick call site.

---

## D3 — Scores, initials, and the Cabinet score table: three names, no owner, no schema

**Units:** Game epic "Galaga-class game with in-game initials entry" · Core story "storage/identity + Personal Best (FR-7/AD-16)".

**Clauses obeyed (both):**
- AD-16: "games report scores **only** as sim events (`scoreSubmitted`)"; "Personal Best is keyed (stable gameId, visitorId) with **initials + score**." The event *name* is canonical; the **payload shape is nowhere defined**, and **who produces the initials is nowhere specified**.
- Diagram: SIM has no outgoing import edge — the sim imports *nothing* (not even Core services), so score data must enter the sim via the tick `input` object ("Core … routes the input data object into the game tick," AD-7) — whose shape is defined nowhere.
- PRD grounding (the spine inherits it via FR-7 but never carries it): the Cabinet's "in-game score table … which Auto-play sessions also play against"; "score screens show the visitor's initials and the Patrons' auto-play runs." The spine's AD set never mentions this per-Cabinet table — a PRD-named entity with no owner.

**Construction, Game-epic unit:** its sim owns the Cabinet score table in sim state; it renders an initials-capture screen (keys arrive via the routed input object; note AD-17's "mouse-look + WASD only" invites the reading that any key beyond WASD is off-limits); it emits `scoreSubmitted {points: 12300, initials: "JBR"}` and expects the kernel to feed prior table entries (its chosen field, e.g. `input.scoreTable: Entry[]`) into each new instance.

**Construction, Core-story unit:** Personal Best storage is kernel-owned (AD-16); initials are derived deterministically from the visitor UUID (no new input surface — maximal AD-17/AD-24 compliance); storage writes `{initials, score}` from fields of *its* chosen payload (`{value, entry}`); it injects nothing into the tick input object because AD-16 only promises persistence, not a per-Cabinet table.

**Incompatibility:** one datum (initials) has two producers — the payload initials vs kernel-generated pseudonym — so Personal Best display and the in-game score screen disagree per game; the `scoreSubmitted` schema forks across epics and the storage service needs per-game readers (per-game knowledge creeping into Core — the AD-1 *intent* dies through a letter-clean door). The Cabinet score table — the PRD's autoplay-plays-against artifact — exists in one unit's sim state and nowhere in the other's system, so after refurbish (FR-16: "refurbished Game keeps score continuity") the table continuity silently depends on a kernel-injection path that the Core story never built. Comparison semantics also fork: points-games vs any lower-is-better future game with no declared ordering.

**Tightening:** in Conventions + AD-16: fix the payload schema `scoreSubmitted: {score: number, initials?: string}`; fix the comparison direction via a new Manifest field `scoreHigherIsBetter: boolean` (default true); name the initials owner (kernel-derived pseudonym unless payload supplies initials); name the Cabinet score table's owner (kernel per-Cabinet service fed into sim instantiation / the input object — define that field once, `input = {buttons, axes, look?, scoreTable}`).

---

## D4 — Two authorities for `seed`, and "append-only" vs "updates the existing entry": the ledger and Manifest disagree after the first refurbish

**Units:** Factory skill "registration + tools/ ledger validator" · Core story "rng injection + Patron scheduler determinism (AD-4/AD-23)" · tools/ "registry generator + Layout System (AD-10/AD-11)".

**Clauses obeyed:**
- Conventions: "ledger entry `{gameId, seq, manifestRef, seed}`" — the ledger carries a **seed**.
- AD-12: Manifest required field `seed`; `buildRef` "stamped by the skill: the commit." AD-11: "Manifest build-reference field = **the commit that introduced it**."
- AD-4: "Core injects the rng … (**Manifest seed** + instance role)" — the Manifest as injection authority.
- AD-9 (rule's own words, in tension): "**append-only** ledger" + "registration … **appends** a ledger entry; **refurbish updates the existing entry** keeping Game id and slot."

**Construction, unit A (ledger-as-record):** the ledger is the arcade's history of record (AD-9's stated purpose: git order is untrustworthy, the ledger records the arcade); the registry generator reads seed from the ledger entry; the validator enforces strict append-only (the rule's literal phrase) — a refurbish therefore appends a revision row. Unit A's validator *rejects* in-place edits.

**Construction, unit B (manifest-as-record + in-place refurbish):** rng injection follows AD-4's letter ("Manifest seed"); refurbish follows AD-9's other letter ("updates the existing entry"), rewriting `manifestRef` and (on a metadata-skill re-run with a new seed — entirely legal) `seed` in place. AD-11's buildRef reading differs too: "the commit that introduced it" says the buildRef must *not* move on refurbish; FR-16's "refurbishments commit new builds under the same id (versioned)" says the stamped commit should.

**Incompatibility:** the first refurbish that changes the seed (the documented normal lifecycle) produces a repo where `ledger.seed ≠ manifest.seed`. The same main-commit now yields two different seeded autoplay streams depending on which story's rule the registry follows — the scheduled full-room regression replays one history while the running room replays the other; L2's causality probe ("inject a known auto-play event") desynchronizes from the scheduler because L1 reran with a different seed. And the two validators are mutually exclusive code in `tools/`: unit A's append-only checker fails unit B's legitimate refurbish entry; unit B's in-place rewrite erases the registration-order history that AD-9 exists to preserve. Nothing in the spine adjudicates `seed` ownership or what "append-only + updates the existing entry" means at the row level.

**Tightening:** AD-9 + Conventions: ledger rows are **strictly append-only** including refurbish — entry shape `{gameId, seq, revision, manifestRef}`, highest revision wins; **remove `seed` from the ledger** (single source: the Manifest pointed to by `manifestRef`, which should be a content hash, making "same history → same room → same streams" mechanically checkable); AD-11: `buildRef` = introducing commit, add derived `latestCommit` from git snapshot for Workshop truth (AD-21). AD-4's parenthetical then reads unambiguously.

---

## D5 — `presentationOnly` admits a stub-sim wrapper whose visible life lives in the adapter: M3 Hall tables and the M6 playable table are two incompatible readings of the same plugin

**Units:** Game epic "hall-of-models wrapper (M3)" · Game epic "pinball engine + first playable table (M6, refurbishing one of the same ids)" · Factory skill "contract-test (L1/L2 for wrappers)."

**Clauses obeyed by the M3 wrapper:**
- AD-2: "The contract must be **wrappable around heterogeneous existing assets** (Hall of Models tables)" — and the assets are heterogeneous fused render+logic builds (`C:/git/pinball`: per-model `game.js` running its own loop; "most tables work today").
- AD-8: "presentationOnly machines: `autoplay()` **may be absent**; L1 enforces **attract liveness + determinism only**; no Patrons seat at them." L1 attract liveness = stateHash advances; determinism = same seed → same stateHash.
- AD-3: bans `rAF/setInterval/Date.now/performance.now` in **the sim half**; AD-7's adapter ban list is **WebAudio, `localStorage`, window input listeners** — rAF/Date.now in the *adapter* is letter-legal.
- AD-5: Core hashes the "plain serializable state snapshot" — a counter snapshot is plain and serializable.

**Construction, M3 unit:** per-table wrapper: `sim/` is a deterministic stub (a per-tick counter/phase field); `presentation/` re-homes the existing three.js table, driving it from the adapter's own per-frame state (its existing loop, allowed to run on the kernel's render callbacks). Gates: L1 attract liveness ✓ (stateHash advances), determinism ✓ (counter hashes), L2 screenshot proxy ✓ (frames differ — the table *moves*), framerate floor ✓ (the adapter's own budget), no Patron causality probe (no seating). Cheapest possible wrap of 15 heterogeneous assets — exactly what AD-2 promises M3.

**Construction, M6 unit:** OQ-4 picks one of these same 15 tables as the playable one; FR-15 demands human *and auto-play* play — so physics must live in the sim half (`autoplay(seed)`, `stateHash`, end-event, impulse mapping, Patron seating all bind sim state); the refurbish (AD-9/FR-16, same id, same slot) replaces the stub with the real per-tick sim and moves all motion into sim state.

**Incompatibility:** the wrapper's sim half is **not a model of the visible table at all** — presentation binds to adapter-internal state, inverting the paradigm's own definition of the two halves ("adapter binding sim state to visuals"). Under the same `presentationOnly` flag the same plugin slot now holds two different architectures: wrapper lineage tables keep adapter-side, frame-rate-coupled motion (visible life outside the deterministic system the room audits), while engine-lineage tables are tick-deterministic — and FR-15's acceptance moment is *two tables demonstrable side by side*, one from each lineage, under one screenshot/framerate regression. The refurbish is AD-9-legal, so nothing forces reconciliation first: the stateHash continuity baseline, the Workshop staging story, and the scheduled L2 suite all silently switch the machine's causal architecture mid-id.

**Tightening:** AD-8/AD-12: define presentationOnly precisely — the sim half must still be the **real per-tick model of everything the presentation shows** (a no-human-controls table sim, not a stub); `autoplay()` may be absent because there is no end state, not because there is no sim. AD-3: extend the ban set to **both halves** ("adapters derive all motion from sim state read at kernel tick time; no self-driven loops, no wall-clock reads anywhere in a Game plugin"). Note in AD-2's wrapper clause that wrapping heterogeneous assets means *splitting* them into the halves, not parking the old loop in the adapter.

---

## D6 — "adapter animation" and the deterministic attendant: two owners of one Patron/figure skeleton, and of staged donation state

**Units:** Game epic "any busy machine's presentation adapter (M0/M2)" · Core story "Patron system figure rendering + queue (AD-23)" · Zone story "Snack Bar attendant (M5, AD-25/AD-22)."

**Clauses obeyed:**
- AD-23's reaction path, verbatim: "sim event → authored per-game impulse mapping (data asset) → kernel reaction library (flinch/slam/jump, `core/patrons/` data) → **adapter animation**." A Game epic reads its own half as the final stage: its presentation module drives the flinch on the seated figure.
- AD-23 + AD-7: Patron figures, occupancy and queue are kernel-owned room state; Patrons walk and sit *independently of any game* (handoff "scheduler-driven"), so the Core Patron story renders and poses the figure every tick.
- AD-25: fixtures (counter, desk) are `core/room` interaction objects behaving by authored data-driven rules; "attendant lines from authored data." AD-22: "the room stages donation state honestly." Conventions put *banter* dialogue trees in **game** data assets; core/patrons holds Patron data — the attendant is a dialogue-bearing figure who is neither a Patron at a machine nor a game.

**Incompatibility:** per tick, the kernel writes the figure's base pose (walk/sit/lift-off) and the game's adapter writes the reaction pose — two mutation paths on one skeleton, each built against its own AD clause; neither is wrong to the letter. In M5, the attendant exists twice: as a fixture state machine in `core/room` (AD-25's literal home for its lines and its honest donation staging) and as a Patron-class figure reusing `core/patrons` rendering/dialogue infrastructure (the only figure layer the room has). The staged donation state (AD-22's honesty requirement, checked by L2) lands in whichever system each story built, so a health-check audit written against one finds nothing in the other.

**Tightening:** AD-23: rename the chain end — "→ **kernel Patron presenter** animates the figure, selecting from the reaction library per the impulse mapping; the game's adapter animates only its own cabinet (screen/marquee/audio requests)." AD-25: state that fixtures own their interaction *state* (including honest donation staging) in `core/room`, and any *rendered figure* — attendant included — is drawn by the Patron system's presenter via a kernel figure-request service, with fixture dialogue as authored `core/room` data consumed by the same dialogue stage that serves banter.

---

## D7 — (supporting) Takeover at the break: precedence and in-tick phase order are unarbitrated

**Units:** Core story "queue/NEXT ritual (FR-4: at a break the *waiting Patron* takes the seat)" · Core story "seat transition / play-in-place (AD-23: the visitor may 'take over at the end/break event')."

Both are kernel-owned and letter-compliant, but at the tick where the end/break event fires, with a visitor standing at the cabinet *and* a Patron waiting, each story's scheduler gives the seat to a different occupant; and the spine never fixes the in-tick phase order (sim tick → event dispatch → scheduler decision → input routing for the *next* tick), which D1's takeover trigger and AD-23's "tick-deterministic" queue both silently assume. **Tightening:** AD-23: fix precedence (a physically-present visitor claims the seat ahead of the queue at the break; otherwise the head of the queue takes it) and fix the one phase order per tick that D1's canonical events then deterministically drive.

---

## Watch-list (not full divergences, but adjacent letter-looseness to close in the same pass)

1. **`busy` field shape** (AD-12): "desired busy-presence" — boolean? 0..1? frequency? metadata skill writes it, scheduler reads it; pin the type.
2. **`manifestRef` semantics** (Conventions): path vs content hash — D4's tightening should make it a hash so "same history → same streams" is checkable.
3. **stateHash over opaque engine memory** (M6, if the engine story packages the sim as WASM per the Deferred note): "plain serializable" needs a named snapshot convention (exported snapshot bytes count, but say it — AD-5's "canonical serialization" presumes field-walkable state).
4. **AD-21 staging map has no refurbish row** — a refurbished machine renders identical to an installed one; fine, but say it is deliberate (else Workshop stories invent a staging state).
5. **L2 causality probe injection point** (addendum G: "inject a known auto-play event"): into the sim instance or onto the event bus? Determines whether the probe tests the mapping stage or the kernel reaction stage.
6. **dt argument** (AD-3 vs seed comment `tick(dt, input)`): constant tick units or measured; D2's tightening covers this — do not let it ride on the parameter's existence.
7. **`seq`** (Conventions): global registration number (Layout's fill order depends on it surviving refurbish revision rows from D4).

## Suggested additive-clause summary (for the spine owner, not applied here)

| Locus | Clause to add |
| --- | --- |
| AD-8/AD-23 + Conventions | Canonical `gameEnded` / `roundBreak` event types; L1 asserts them |
| AD-8 + diagram | Calling protocol paragraph (kernel calls `tick(dt,input)` at fixed dt; events = tick return; `attract()`/`autoplay(seed)` one-shot switches) + `REG→SIM` edge |
| AD-16 + Conventions | `scoreSubmitted` payload schema; initials owner; Cabinet score-table owner + input-object shape; `scoreHigherIsBetter` in Manifest |
| AD-9 + Conventions + AD-11 | Append-only ledger with `revision` rows; seed only in Manifest; `manifestRef` = content hash; `buildRef` = introducing commit |
| AD-8/AD-12/AD-3 | presentationOnly = real per-tick model sim, not a stub; motion bans apply to both halves |
| AD-23/AD-25 | "kernel Patron presenter" replaces "adapter animation"; attendant = fixture state + kernel presenter; donation staging owned by fixture |
| AD-23 | Seat-takeover precedence + per-tick phase order |

*Not edited: the spine itself. This file is the review deliverable.*
