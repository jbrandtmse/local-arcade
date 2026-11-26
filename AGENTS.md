<!-- bmad:context -->
<!-- Verified 2026-11-20 against 9fcf4b0. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## local-arcade

First-person walk-in 3D arcade for the browser: visitors enter a room, find cabinets by ear, and play real classic-style games. Games are authored by local LLMs at build time and frozen into one sealed, deterministic static bundle. Pre-code as of this verification — only planning artifacts exist. Stack: hand-written three.js on Vite, TypeScript Core plus plain-JS game plugins, Node LTS toolchain, deployed as one static site on a DigitalOcean droplet.

## Policy

- Never push to `main`; PRs only. CI does not enforce this yet — the rule binds commits today.
- Never hand-edit planning artifacts under `_bmad-output/` — change them through the owning BMad skill (e.g. `bmad-correct-course`, `bmad-architecture`) so validation and provenance survive.

## Where things are

- Canonical contract for what to build: `_bmad-output/specs/spec-local-arcade/SPEC.md` — plus its companions in the same folder (`game-factory.md`, `room-layout.md`, `glossary.md`, `cabinet-inventory.md`, `brownfield.md`).
- Binding architecture, citable by AD-id: `_bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md`.
- Writing a game? `docs/game-authoring.md` is the binding builder rules — read it first; where it and the spine disagrees, the spine wins and the doc gets fixed.

## Running and verifying

- Code exists as of Story 1.1. Loop commands: `npm install` (fresh clone; `engines` pins Node 26), `npm run typecheck`, `npm test` (`node --test` over co-located `*.test.ts`), `node ci/depcheck.mjs` (AD-1 import direction), `node ci/lint-bans.mjs` (sim-path banned APIs), `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (registry drift). Once per story: `npm run build`. Dev serve: `npm run dev`. Still no CI workflow (lands Epic 3, stories 3.2/3.15) — the local suite plus smoke is the gate.
- Take stack versions from the spine's §Stack table, never from the current environment — `@types/three` must match `three` exactly, since three ships no bundled types.

## Conventions that differ from defaults

- Never use react-three-fiber or any game framework — hand-coded three.js; a React reconciliation layer fights the global fixed 60Hz tick.
- A Game is a two-part plugin in `games/<game-id>/` (headless `sim/` + three.js adapter `presentation/`) that registers by `manifest.json` alone — never edit `core/` or hand-edit the append-only `arcade-ledger.json` (both created per the spine's Structural Seed).
- Zero LLM/model calls at runtime and in CI — the shipped bundle is sealed: its only outbound call is the same-origin `/api/report` POST.

<!-- /bmad:context -->
