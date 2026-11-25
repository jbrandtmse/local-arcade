// Story 1.9 QA (AC4 terminal-phase order, DW-12 source-pin tier): the
// existing frame-body pins prove the workbench swap, its remove-first
// hand-off, and the `if (workbenchMounted) return;` guard EXIST in
// core/main.ts — none pinned their ORDER. Moving the swap + guard below the
// room's draw legs keeps every substring pin green while a terminal-phase
// frame still draws into (and renders past) a page whose 3D canvas is gone
// — "never partial fiction" is an ordering law, so it is pinned as one.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const MAIN = readFileSync(path.join(REPO, "core", "main.ts"), "utf8");

function frameBody(src: string): string {
  // Same fixed two-space anchor as core/main-glue.test.ts: frame() lives
  // inside bootArcade(), so its own closing brace sits at exactly two
  // spaces — the anchor keeps the body ending at frame()'s brace.
  const m = src.match(/function frame\(\): void \{([\s\S]*?)\n {2}\}/);
  assert.ok(m, "core/main.ts has a frame() render function");
  return m[1]!;
}

test("frame order: the one-shot workbench swap and the terminal guard run BEFORE every room draw leg and renderer.render — a terminal-phase frame draws nothing, and the ready stamp still rides a successful render (AC4 'never partial fiction')", () => {
  const body = frameBody(MAIN);
  const swapAt = body.indexOf('if (front.phase === "workbench" && !workbenchMounted)');
  const guardAt = body.indexOf("if (workbenchMounted) return;");
  const coinDoorsAt = body.indexOf("for (const d of handles.doors)");
  const figuresAt = body.indexOf("for (const f of figures)");
  const drawLegsAt = body.indexOf("supervisor.invoke({");
  const renderAt = body.indexOf("renderer.render(scene, camera);");
  const stampAt = body.indexOf("entry.markFrameRendered();");
  assert.ok(swapAt >= 0 && guardAt > swapAt, "the one-shot swap precedes its terminal guard (the swap returns nothing; the guard does the stopping)");
  assert.ok(
    guardAt < coinDoorsAt && coinDoorsAt < figuresAt && figuresAt < drawLegsAt && drawLegsAt < renderAt,
    "coin-door re-pose, Patron figures, and the draw+composite legs all sit AFTER the guard, in order — the room pipeline never runs into a detached canvas (the review-pass guard is where it is for a reason: this pin reddens if it moves)",
  );
  assert.ok(stampAt > renderAt, "the ready-gate stamp still rides AFTER the render call returned — a reorder that rendered past the guard would count frames the page never showed");
});
