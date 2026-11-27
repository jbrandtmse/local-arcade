# Game Authoring Guidelines

*Binding reference for anyone (human or local LLM) implementing a game for Local Arcade. These rules restate the Architecture Spine's invariants in builder terms — when this doc and the spine disagree, the spine wins and this doc gets fixed. Cites: AD-2, AD-3, AD-4, AD-5, AD-6, AD-7, AD-8, AD-12, AD-15, AD-16, AD-26, AD-27.*

## 1. What a game is

A game is a two-part plugin — you never touch Core code:

```text
games/<game-id>/
  sim/            # pure deterministic rules. No three, no WebAudio, no DOM, no window.
  presentation/   # three.js adapter binding sim state to the cabinet's screen/marquee.
                  #   No WebAudio either (Story 2.1, AD-7): the one Core Audio
                  #   Manager owns the graph; you supply the attract recipe.
  manifest.json   # written by the Registration skill, never by hand.
  assets/         # art, attract-sound recipe (attract-sound.json, plain data
                  #   validated + inlined by the generator at build), impulse
                  #   mapping, dialogue trees.
```

The sim half must run headless in Node in seconds — that's what the CI gates consume. If your rules can't run without a browser, the split is wrong.

### The hooks (names verbatim)

```js
tick(dt, input)   // dt is ALWAYS 1/60 tick units; input = { controls } — nothing else
attract()         // one-shot switch into attract mode (called by kernel)
autoplay(seed)    // one-shot switch into auto-play (Patrons); may be absent only for presentationOnly
events()          // pull this tick's plain-data event list: [{type, payload}, ...]
snapshot()        // plain serializable game state (see §5)
```

`stateHash()` is computed for you by the Core contract wrapper over your `snapshot()` — a game that defines its own `stateHash` is lint-red (AD-5). The kernel calls `tick()` then `events()`, once per global 60Hz tick (AD-8).

### Canonical events (AD-6)

- Every game **must** emit `gameEnded` or `roundBreak` to end an autoplay run — this is what makes "busy is a texture, not a lock" true.
- Scores go out as `scoreSubmitted` with payload `{score: number, initials?: string}`. Never write scores yourself; the kernel owns tables.
- All other event type names are game-local. Patron reactions come from your authored impulse-mapping data asset, not from you animating anything: emit the event, the kernel reacts (AD-23). Your adapter touches only your own cabinet.

## 2. Pseudo-randomness: the injected rng

You never roll your own randomness, and you never seed yourself:

```js
// Provided by the contract wrapper at instantiation — never construct your own:
rng.uniform()            // [0, 1)
rng.range(min, max)      // float in [min, max)
rng.rangeInt(min, max)   // integer in [min, max]
rng.pick(array)
rng.weighted(items, weights)
```

Rules (AD-4):

- `Math.random()`, `Date.now()`, `performance.now()` are **lint-red** in the sim half. There is no legit exception.
- The seed is resolved by the kernel: attract/Patron instances get a *derived* seed (Manifest `seed` + instance role); a human player's session gets a *fresh random* seed — the player still gets surprise, and the run is still fully recorded. You never choose or see your seed directly.
- **Call rng only inside `tick()`.** An rng call in `attract()` setup outside a tick, or in a timer, breaks reproducibility.
- **The rng's cursor is part of your state.** Include it in `snapshot()`:

```js
function snapshot() {
  return {
    shipX: state.shipX,
    // ... all game state ...
    rng: rng.getState(),   // plain numbers, e.g. [s0, s1, s2, s3]
  };
}
```

If you roll a custom generator, make its state a plain array of numbers and restore it from that array — never reseed from time.

### Deterministic math (AD-4)

Engine-variable transcendentals — `Math.sin/cos/tan/asin/acos/atan2/pow/exp/log` — are **lint-red in the sim half** (browsers and Node are free to differ, and your run must replay bit-identically in CI). Use the Core deterministic math module instead — the wrapper injects it as `ctx.math` at instantiation, the same seam as the rng; your sim never imports from `core/contract/`. Basic `+ - * /` are fine. Physics-looking math belongs inside `tick()` with a **fixed substep count** you control.

## 3. Controls: declared schemes, never devices

Games don't bind key listeners and don't know about keyboards. You **declare a control scheme in the Manifest**, and the kernel maps physical devices onto it each tick:

```json
"controls": {
  "vocab": 1,
  "axes":   ["move"],
  "buttons": ["start", "jump", "fire"],
  "aim":    []
}
```

Slot kinds have a fixed value grammar — this is what keeps two games meaning the same button the same way:

| Kind | Value each tick | Notes |
| --- | --- | --- |
| `axis` | number in [-1, 1] | level signal; kernel combines key pairs (W/S → one axis) |
| `button` | `{down: boolean, pressed: boolean}` | `down` = held level, `pressed` = rising edge this tick (jump edges!) |
| `aim` | `{dx, dy}` | per-tick deltas (mouse-look style); empty in v1 unless declared |

Reading rules (AD-7):

- Read input **only** via `input.controls.<slot>` inside `tick()`. Never inside `attract()`/`autoplay()` setup.
- Never add `window`/`addEventListener` input listeners — lint-red in both halves. When wrapping an existing game (e.g. Moon Patrol's `input.js`), adapt at the seam: throw its input layer away and feed the declared slots.
- Declare only what you use; unused declared slots are noise, invented one-off slot names are schema-red.

**The vocabulary is additive and versioned.** Pointer-lock look + WASD + mouse buttons are the v1 device side. Spinner, twin-stick, extra-button, and mouse-aim primitives will arrive later as new kinds under a bumped `vocab` — they extend the menu; they never retype what's already on it, and no future control addition can break your game. When your game genuinely needs a control the vocabulary lacks, that's an epic request, not a workaround.

### Score tables are presentation-side (AD-16)

Personal Bests and Patron scores render **from the adapter** via the Core storage service. The sim's tick input carries only `controls` — the sim never reads, branches on, or stores score-table content (L0-red). Your score screen: read the service in `presentation/`, draw it on the cabinet screen.

## 4. Timing and sleeping machines (AD-27)

Your sim may **not be ticked every real-world second**: distant machines sleep and idle-pulse until the player gets near or looks. This is normal and never happens to a machine a visitor is playing. So:

- Express everything in **ticks** (sim time = your own tick count), never wall-clock, never "frames since page load".
- Don't assume continuous pacing across modes: an attract cycle in wall-time may stretch while sleeping; that's fine as long as it *always advances* while awake — a stateHash must change every attract cycle or L2 flags a Dead Machine (AD-8).
- No timers, no promises that mutate state, no rAF. All mutation happens inside `tick()`; state is deep-frozen between ticks and an out-of-tick write throws (AD-15).

## 5. Snapshot and stateHash discipline (AD-5, AD-15)

`snapshot()` returns **plain serializable data**: numbers, strings, booleans, null, arrays, objects.

- No class instances, `Map`/`Set` (serialize to sorted arrays instead — rebuild order must be canonical), `Date`, functions, three.js objects, typed-array views of live buffers.
- Floats are fine (same engine replays deterministically thanks to §2's math rule); don't format them to strings.
- Keys don't need manual sorting (the wrapper canonicalizes), but your *game logic* must not depend on `Object.keys` order of rebuilt collections.
- Include the rng cursor (§2). If the run is deterministic, your snapshot + recorded inputs reproduce it — that's the whole contract.

## 6. Recording, replay, and reporting — all kernel-owned (AD-26)

**Never write your own logging, debug traces, or replay code** — the kernel records every instance it drives: `{gameId, bundleRef, seed, inputChanges (tick-indexed), periodic + final stateHash}`, with a fault marker `{tick, errorId, lastGoodHash}` if you throw.

- Reproducing a bug report: `tools/replay <recording.json>` re-drives your sim headless through the same contract harness; in-room playback shows the run on the cabinet's screen. If your sim misbehaves, periodic hashes will show exactly where divergence starts — usually an illegal nondeterminism source (see checklists below).
- Your sim throwing is survivable (the supervisor catches it and keeps the cabinet performing) but is always a **defect**: it surfaces as a Dead-Machine defect with your fault marker. Don't swallow errors internally to avoid it.
- Never `fetch()` anywhere; never touch `localStorage` — the room's one allowed network call is the kernel's report POST.

## 7. Manifest essentials (AD-12)

Written by the Registration skill against `ci/manifest-schema.json`; relevant to authoring:

- `id` = kebab-case = directory name, stable across refurbish.
- `seed` — the *sole* seed source for derived instances.
- `controls` — your declared scheme (§3).
- `busy` — desired busy-presence for the Patron scheduler.
- `presentationOnly: true` — museum class: still needs a real per-tick sim half (what it shows must be simulated), but no `autoplay()`.

## 8. L0 pre-flight checklist

Run before asking for review — every line is a lint rule:

- [ ] sim half imports nothing from `three`, WebAudio, DOM/window, or other games
- [ ] neither half names `AudioContext`/`webkitAudioContext`/`OfflineAudioContext` (bare, `new`, on any global receiver — `globalThis`/`window`/`self`/`top`/`parent`/`global` — or destructured) — the Core Audio Manager owns the one graph; your attract sound is an `assets/attract-sound.json` recipe, never a node (Story 2.1, AD-7; `node ci/lint-bans.mjs` checks both halves)
- [ ] no `Math.random`, `Date.now`, `performance.now` anywhere in the sim
- [ ] no `Math.sin/cos/tan/asin/acos/atan2/pow/exp/log` in the sim — Core math module only
- [ ] no timers/rAF/promises mutating state; all mutation inside `tick()`
- [ ] rng calls only inside `tick()`; `rng.getState()` inside `snapshot()`
- [ ] input read only via declared `controls` slots inside `tick()`; no listeners; no device knowledge
- [ ] no reading of score tables / storage services from the sim half
- [ ] `gameEnded` / `roundBreak` reachable from `autoplay(seed)` in bounded ticks; scores via `scoreSubmitted` only
- [ ] `snapshot()` is plain-serializable, no Map/Set/class/Date
- [ ] no `fetch`, no `localStorage`, no self-logging, no custom `stateHash`
- [ ] manifest: schema-valid, `controls` declared, attribution intact

When gates are green, the Registration skill appends the ledger line and the room places your cabinet. That's the install.
