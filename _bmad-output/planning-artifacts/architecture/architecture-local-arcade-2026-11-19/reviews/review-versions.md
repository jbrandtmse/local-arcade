# Version & Fit Review — Architecture Spine (Local Arcade)

Reviewer: gate-version-verifier · Date: 2026-11-19 · Spine: `ARCHITECTURE-SPINE.md` (status: draft)
Method: npm registry dist-tags, official nodejs.org dist index, nginx.org download page, GitHub Actions docs, three.js manual/MDN, and a local install of `three@0.187.0` whose shipped source was grepped directly. Nothing asserted from memory alone.

## Verdict

**APPROVE — every committed technology is real, current as of 2026-11-19, and fits.** One MEDIUM finding (stack table missing `@types/three`); everything else is LOW-severity operational notes. No stale, misdescribed, or fabricated pins found.

## Findings

### HIGH — none

### MEDIUM

**M1. Stack table omits `@types/three`, which the TypeScript plan depends on.**
Verified: `three@0.187.0` ships **no** bundled type definitions (no `.d.ts` anywhere in the package, no `types` field in its package.json — checked against the installed pinned version). The three.js manual itself points to community types (three-types/three-ts-types → `@types/three`). `@types/three@0.187.0` exists on DefinitelyTyped and exactly matches the pin. The spine says "all web/npm-verified" and pins everything else the build touches, but Core + contract seam are TypeScript (AD-14) — an unlisted dependency that `tsc` compilation depends on is a real gap in a pinned seed table. **Fix: add a row `@types/three | 0.187.0` (dev dependency).**

### LOW

**L1. nginx pin is correct but the droplet needs the upstream package, not the distro package.**
Verified: nginx.org lists **1.30.7 as current stable**, 1.31.9 as current mainline. The NGINX2Root set (five memory-corruption flaws incl. CVE-2026-123007 HTTP/2 RCE, plus four more in the same F5 release) was disclosed **2026-11-18** and fixed in **1.30.7 (stable) / 1.31.9 (mainline)** — the spine's "must be ≥1.30.7 (NGINX2Root fixes, 2026-11-18)" is accurate and impressively current (one day old). Two operational notes for the deployment story, not spine errors: (a) distros backport fixes under old version strings (e.g. Ubuntu 26.04 ships patched 1.28.3), so `nginx -v` may read < 1.30.7 on a patched distro package — the ≥1.30.7 floor is safest read as "install the nginx.org package"; (b) patching requires a full **restart**, not `nginx -s reload` (reload does not replace the running binary). Optional one-line addition to AD-20.

**L2. GitHub Actions scheduled-trigger caveats.**
Verified against docs: `on: push` (with native `paths:` globs, which is exactly how "per-push L0/L1 for the touched game" works via `games/<id>/**` filters) and `on: schedule` with POSIX cron are real, as described. Caveats the regression workflow must respect: scheduled workflows **only run on the default branch**, minimum 5-minute interval, runs can be delayed (or queued jobs dropped) at the top of the hour, and auto-disabled after 60 days of repo inactivity. The spine's "scheduled full-room regression" is viable as stated; story-writing should schedule off-peak and keep the workflow file on `main`.

**L3. TypeScript 7 — fits; adopt the `tsc --noEmit` + Vite-transpile split.**
Verified: `typescript` latest dist-tag is **7.0.2** (7.x is the Go-native "Corsa" compiler line). Native emit of JS and `.d.ts` is supported as of 7.0, but the standard 2026 pattern in Vite apps is `tsc 7 --noEmit` for type-checking in CI with Vite doing transpile/bundle — that maps perfectly onto the spine's L0 gate and sealed-build model. No spine change needed. (One ambient caution for tooling stories: TS7-era ESLint/plugin compatibility had rough edges in 2026 — an L0-lint implementation detail, not an architecture issue.)

**L4. Optionally name-and-reject react-three-fiber.**
On the scaffold question: the spine never assumes an unnamed starter. It names Vite + npm, which **is** the 2026 paved path for hand-coded three.js — the official three.js manual's installation page recommends npm + a build tool and uses Vite in its worked example, and `create-vite` vanilla/vanilla-ts is the standard scaffold (MDN's 3D-game guide updated 2026-08 agrees). The only material alternative, react-three-fiber, is the paved path *for React projects* and actively conflicts with this spine: AD-2's imperative adapter pattern and AD-18's sealed static bundle gain nothing from a React reconciler. Suggest a one-line explicit rejection in the Stack section ("presentation adapters are plain three.js; react-three-fiber rejected") so no story quietly pulls in React. Optional.

## Verification detail

### Stack table pins — all confirmed

| Pin | Status | Evidence (retrieved 2026-11-19) |
| --- | --- | --- |
| three 0.187.0 | ✅ current | npm `dist-tags.latest` = 0.187.0; third-party note: published 2026-10-30. Installed locally for source checks. |
| TypeScript 7.0.2 | ✅ current | npm `dist-tags.latest` = 7.0.2 (7.0.x GA line). |
| Vite 8.3.8 | ✅ current | npm `dist-tags.latest` = 8.3.8 (8.4.0-beta.1 prerelease exists; 8.3.8 is latest stable). |
| Node 26 Active LTS, 26.13.x | ✅ accurate | nodejs.org dist index: newest **v26.13.1**, dated 2026-11-10, LTS codename "Lithium"; v26 is the newest LTS line (v24 "Krypton" and v22 are the maintenance lines). Vite 8 requires Node ≥20.19/22.12 — compatible. |
| nginx 1.30.7 stable, ≥1.30.7 required | ✅ accurate + current | nginx.org: current stable = 1.30.7, mainline = 1.31.9. NGINX2Root disclosed 2026-11-18, all five CVEs fixed in 1.30.7/1.31.9 (corroborated by Cloudflare, Censys, Tenable, Qualys, CrowdStrike advisories). |
| GitHub Actions, unpinned | ✅ | Capabilities assumed are real (see L2). Unpinned is appropriate for hosted runners. |
| DigitalOcean droplet, unpinned | ✅ | Infrastructure row; no version to verify. |

### Fit claims — all confirmed

- **PositionalAudio/PannerNode (AD-7)**: ✅ Real in the pinned version and works exactly as the spine describes. `src/audio/PositionalAudio.js` in 0.187.0: `this.panner = this.context.createPanner()` (native WebAudio PannerNode, `panningModel = 'HRTF'`), ref-distance attenuation via PannerNode distance model. The spine's occlusion plan (gain + lowpass) has first-class insertion points: `Audio.setFilter()/setFilters()` accept `BiquadFilterNode` chains feeding the gain node.
- **No built-in geometry occlusion → raycast system is necessary, not reinvention**: ✅ Confirmed by grepping the whole pinned package: the only "occlu" hits in `src/` are ambient-occlusion *textures* (material AO maps) and shadow-map docs; in `examples/jsm/` only exporters, MaterialX, and VXGI (light transport). No audio-sightline occlusion exists anywhere in three.js or WebAudio. The dedicated occluder collider set + raycast gain/lowpass in `core/room` is the standard hand-rolled approach.
- **CanvasTexture for 2D game screens in a 3D scene**: ✅ `src/textures/CanvasTexture.js` ships in 0.187.0; this remains the standard pattern for arcade-cabinet CRT/2D-screen content.
- **Pointer-lock first-person in plain three.js (AD-17)**: ✅ `examples/jsm/controls/PointerLockControls.js` ships in 0.187.0 (extends the `Controls` base class from core — current architecture, importable via `three/addons/`). Mouse-look + WASD with Core-owned capture and routed input is viable with zero extra libraries.

### Scaffold assumption — none found

The spine names every tool it depends on (Vite, npm, Node). No behavior is silently borrowed from an unnamed scaffold. The chosen path matches the 2026 official recommendation (three.js manual: npm + build tool, Vite in the worked example; `npm create vite -- --template vanilla-ts` + `npm install three @types/three`). See L4 for the optional explicit R3F rejection and M1 for the missing `@types/three` pin.

### One method note

An initial fetch for Node release data landed on an untrusted proxy URL rather than nodejs.org; that result was discarded and all Node claims above were re-verified against the official `nodejs.org/dist/index.json`.

## Sources

- npm registry: https://registry.npmjs.org/three · https://registry.npmjs.org/typescript · https://registry.npmjs.org/vite · `npm view @types/three version` → 0.187.0
- Node: https://nodejs.org/dist/index.json · https://nodejs.org/en/about/previous-releases
- nginx: https://nginx.org/en/download.html
- NGINX2Root: https://blog.cloudflare.com/nginx2root/ · https://censys.com/advisory/cve-2026-123007-cve-2026-123633-cve-2026-123634-cve-2026-121810-cve-2026-113425/ · https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx · https://blog.qualys.com/product-tech/patch-management/2026-11-18/nginx2root-five-nginx-flaws-led-by-cve-2026-123007-how-to-find-mitigate-and-patch-now · https://www.crowdstrike.com/en-us/blog/crowdstrike-helps-protect-against-nginx2root-cve-2026-123007/
- three.js install/types: https://threejs.org/manual/pages/installation.html · https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js
- GitHub Actions: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- TypeScript 7: https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/ · https://howtodoinjava.com/typescript/typescript-7-native-compiler/
