# Glossary — Local Arcade

Load-bearing vocabulary, used verbatim across SPEC.md, the planning artifacts, and the architecture. Distilled from the PRD glossary plus the architecture's terms. Ladder names are fixed here: the discovery route is the **pull ladder**; the audio-mix mechanism is the **proximity ladder**. **v1 and MVP are the same thing** (see the last entry).

**Index:** Room & placement · Games & production · Runtime behavior · Identity, data & artifacts.

## Room & placement

- **Arcade Core** (shorthand: **Core**) — the application shell: 3D room, first-person controls, machine loading, room services, registration handling. Adding a Game never requires editing it.
- **Arcade Room** — the walk-in 3D space: front door, Wall Slot walls, aisles, occluder pillars, fixed Zones.
- **Cabinet** — the in-room embodiment of a registered Game. Two standard shells for Wall Slot machines: stand-up (default) and sit-down (driving/cockpit games); `cabinetType ∈ stand-up | sit-down | pinball`, and the pinball shell is fixed Pinball Corner Zone architecture, not Wall Slot furniture. The Manifest declares which. Carries marquee, attract mode, coin door, Instruction Card.
- **Layout System** — the deterministic build-time function assigning a registered Cabinet its place: Wall Slots for standard machines (pre-declared, evenly spaced; fill rule home: `room-layout.md §Growth grammar`; the Wall Slot config carries a revision id pinned by SM-2), Pinball Corner Zone slots for `presentationOnly` pinball tables. Never rearranges.
- **Wall Slot** — a place on a wall for a Cabinet; the pool of empty slots is how visible growth reads. A slot returned by `removed` is indistinguishable from an unfilled slot to the fill function.
- **Zone** — a fixed functional area (Workshop, Snack Bar, Pinball Corner; Casual Alley deferred). Architecture, never placed by the Layout System.

## Games & production

- **Acceptance laws** — the SPEC's Capabilities and Constraints as enforced by the Verification gate and the L3 human walk; the laws every placed Cabinet must satisfy.
- **Game** — a complete playable game built by local LLMs at build time and registered into the Core. A native in-scene module in one runtime — never an iframe. One Game = one BMad epic in production, except `presentationOnly` wrapper machines, which are batched as one epic (see `game-factory.md §The pipeline`).
- **Game Factory** — the production pipeline per Game (specify → research → design → implement → register) driven by five purpose-built skills; the growth mechanism. See `game-factory.md`.
- **Game-build contract** — the standard interface every Game satisfies: hooks `attract()` / `autoplay(seed)` / `events()`, with `stateHash()` supplied by the Core wrapper over the Game's `snapshot()` (a Game-defined `stateHash` is lint-red), plus a schema-valid Manifest and the two-part plugin (pure deterministic sim half + presentation adapter). `presentationOnly` Manifests may omit `autoplay()`, but their sim half must still be the real per-tick model of what the presentation shows (AD-8). Restatement home: `game-factory.md §The contract, in one box`; binding builder rules: `docs/game-authoring.md`.
- **Instruction Card** — the paper behind a coin door carrying rules + model attribution, generated at build from the Manifest; paired with its Workshop plan drawer.
- **Ledger (`arcade-ledger.json`)** — the strictly append-only registration history: rows `{gameId, seq, revision, manifestRef, op}` with `op ∈ registered | refurbished | removed`; the highest revision wins.
- **Manifest** — the declarative JSON entry a Game ships: stable kebab-case id, title, originalYear, attribution, cabinetType (`stand-up` | `sit-down` | `pinball`), seed, busy, controls, scoreHigherIsBetter, rulesText, buildRef; optional `presentationOnly`. Written by the Registration skill, never by hand — including removals.
- **Registration** — adding a finished Game by committing a Manifest via the Registration skill, on a green verification gate. No other manual step. Removal is the same skill's operation (Manifest removal → ledger `op=removed`), effective at a run boundary.
- **Verification gate** — three token-free CI layers (L0–L2) plus the L3 human walk; Registration refuses a red gate. Design home: `game-factory.md §The verification gate`.
- **Workshop** — the open diegetic rendering of the real repo: commits on the monitor, BMad plans as paper, bench staged to the real build lifecycle. Its public snapshot is allowlist-scoped (CAP-14).

## Runtime behavior

- **Attract Mode** — a machine's self-advertising loop (sound, screen, lights), occluded by geometry — the find-by-ear signal.
- **Auto-play session** — a game instance running with no human at the controls, driving a busy Cabinet and Patron reactions; must reach a real end state (`gameEnded` / `roundBreak`). Each session's seed derives deterministically from the ledger revision and the session index, so Patron runs are replay-reproducible.
- **Awake set / liveness tiers** — the scale law: occupied/near/visible sims tick at full rate; distant sims idle-pulse; wake is a pure tick-state function (replay-identical for continuously-awake runs; replay scope per CAP-18).
- **Dead Machine** — a Cabinet that reads inactive in a sampled frame. A defect by definition, never a legitimate state.
- **Faulted Machine** — a Cabinet whose Game has faulted (exception inside `tick()`, or a `stateHash()` stall across N cycles — N set at M2). The kernel fallback keeps marquee and screen motion performing; it always carries a fault marker, blocks Registration of the faulting build, and keeps the room live. Distinct from a Dead Machine, which reads inactive.
- **Find-by-ear** — the pull ladder: occluded spatial sound → attract graphics → Patron/player intensity. Zero UI hints.
- **Live Machine** — a Cabinet whose attract is running and, when busy, whose Patron is actually playing. Every placed Cabinet is one.
- **Patron** — an in-room figure playing a busy machine; their reactions are driven by that game's own Auto-play events via the authored impulse stage. The player-less instance is engineering's "headless" instance; in-world they are simply patrons.
- **Proximity ladder** — the audio-mix mechanism of CAP-3 (distinct from the discovery pull ladder): the room's attract mix is ordered by distance from the Visitor; occlusion and proximity transitions use hysteresis (dead-band plus dwell) so boundary standing never flips audio per tick.
- **Seated focus mix** — the CAP-3 collapse of the proximity mix around a seated player.

## Identity, data & artifacts

- **Claim-check fixture** — the diegetic fixture at a Cabinet offering its Run Recording for download or submission to `/api/report`; the ingest validates `bundleRef`/revision against known ledger revisions and tags unknown ones rather than silently accepting.
- **Hall of Models** — the Pinball Corner museum row of ~15 LLM-built pinball tables from one shared prompt, with explicit model nameplates (the single exception to found-never-announced). Roster home: `cabinet-inventory.md §Pinball`.
- **Local LLM** — a model used at build time only; runtime LLMs are out forever by thesis.
- **Personal Best** — a Visitor's best score per Game under an anonymous local identifier, distinct from a Cabinet's in-game score table (Personal Bests + Patron runs). Under a refurbishment that changes score scale or direction, pre-revision bests are marked legacy and ranking compares same-revision scores only.
- **Run Recording** — the kernel capture of one session: `{gameId, bundleRef, seed, tick-indexed inputChanges, periodic + final stateHash}`, optionally fault-sealed. Replayable headlessly and in-room; the artifact that makes runs reproducible and bug reports provable. It carries no camera/occupancy data — replay scope per CAP-18.
- **v1 / MVP** — the ship scope, identical to the cut list M0–M6 (SPEC §Milestones); the terms are interchangeable and both mean the same thing.
- **Visitor** — anyone in the public who walks in; identified only by an anonymous UUIDv4 for Personal Best continuity. No account exists.
- **Welcome Flyer** — the single sanctioned announcing artifact in the fiction-pure room (SPEC Constraints · Fiction-pure); its identity and copy live in DESIGN.md.
