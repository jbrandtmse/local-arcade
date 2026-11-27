#!/usr/bin/env node
// Build-time game registry generator (AD-11; provisional list stands in for
// the ledger until Epic 3, AD-9). Deterministic: sorted entries, fixed
// template, no timestamps — re-emit must be byte-identical. The generated
// module re-exports only the sim halves to the kernel tick site (AD-1/AD-2).
// Zero LLM calls, pure deterministic script (AD-18).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const cwd = path.resolve(argValue("--cwd", process.cwd()));
const listPath = path.resolve(cwd, argValue("--list", path.join("tools", "registry-list.json")));
const outPath = path.resolve(cwd, argValue("--out", path.join("generated", "game-registry.ts")));

function fail(message) {
  console.error(`gen-registry: ${message}`);
  process.exit(1);
}

if (!existsSync(listPath)) fail(`provisional list not found: ${listPath}`);
let list;
try {
  list = JSON.parse(readFileSync(listPath, "utf8"));
} catch (err) {
  fail(`provisional list is not valid JSON: ${String(err)}`);
}
if (!Array.isArray(list)) fail("provisional list must be a JSON array");

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The kernel reaction library (Story 1.6, AD-23): authored impulse mappings
// may only name these reactions. Mirrors the REACTIONS table in
// core/patrons/presenter.ts — that suite source-pins the two lists together,
// so this script stays dependency-free (it must run under bare node).
const REACTIONS = ["flinch", "jump", "slam"];
const entries = [];
for (const [i, entry] of list.entries()) {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    fail(`entry ${i}: each entry must be an object`);
  }
  if (typeof entry.id !== "string" || !KEBAB.test(entry.id)) {
    fail(`entry ${i}: id must be kebab-case, got ${JSON.stringify(entry.id)}`);
  }
  if (typeof entry.simPath !== "string" || entry.simPath === "") {
    fail(`entry ${i} (${entry.id}): simPath must be a non-empty string relative to the repo root`);
  }
  if (!existsSync(path.resolve(cwd, entry.simPath))) {
    fail(`entry ${i} (${entry.id}): sim source not found: ${entry.simPath}`);
  }
  // Story 1.10 (DW-5; AD-1/AD-2/AD-13): the sim half of a plugin lives in
  // games/<id>/sim/ — the registry re-exports simPath to the kernel, so the
  // build step enforces the plugin direction. path.relative normalizes, so
  // a `..` relocation dies on the same law message; the law is lexical (a
  // symlinked home joins the Epic 3 L0 sweep). presPath is not bound here:
  // depcheck binds the import edges OF presentation files and the adapter
  // import bans guard what those edges reach — presPath's own home
  // directory is outside this story's charter (DW-5 names the sim half).
  const simHome = path.relative(path.resolve(cwd, "games", entry.id, "sim"), path.resolve(cwd, entry.simPath));
  if (simHome === "" || simHome === ".." || simHome.startsWith(`..${path.sep}`) || path.isAbsolute(simHome)) {
    fail(`entry ${i} (${entry.id}): simPath must resolve strictly under games/${entry.id}/sim/ (AD-1 plugin direction), got ${entry.simPath}`);
  }
  // Integer, not merely finite: the kernel scheduler validates integer
  // authored seeds at track() (32-bit derived-seed arithmetic), so the
  // build gate must not emit a seed the boot site would reject.
  if (entry.seed !== undefined && !Number.isInteger(entry.seed)) {
    fail(`entry ${i} (${entry.id}): seed must be an integer number when present`);
  }
  if (entry.presPath !== undefined) {
    if (typeof entry.presPath !== "string" || entry.presPath === "") {
      fail(`entry ${i} (${entry.id}): presPath must be a non-empty string relative to the repo root`);
    }
    if (!existsSync(path.resolve(cwd, entry.presPath))) {
      fail(`entry ${i} (${entry.id}): presentation source not found: ${entry.presPath}`);
    }
  }
  if (entry.controls !== undefined) {
    const c = entry.controls;
    if (typeof c !== "object" || c === null || Array.isArray(c)) {
      fail(`entry ${i} (${entry.id}): controls must be an object`);
    }
    // Strict at the controls level too: a typo like "butons" would emit the
    // entry with a silently missing slot leg (the emission below re-reads
    // fixed keys), so an unknown controls key must die like an unknown
    // entry key does.
    for (const key of Object.keys(c)) {
      if (key !== "vocab" && key !== "axes" && key !== "buttons" && key !== "aim") {
        fail(`entry ${i} (${entry.id}): unknown controls field ${JSON.stringify(key)} (known: vocab, axes, buttons, aim)`);
      }
    }
    if (!Number.isFinite(c.vocab)) {
      fail(`entry ${i} (${entry.id}): controls.vocab must be a finite number`);
    }
    for (const leg of ["axes", "buttons", "aim"]) {
      if (!Array.isArray(c[leg]) || !c[leg].every((s) => typeof s === "string")) {
        fail(`entry ${i} (${entry.id}): controls.${leg} must be an array of strings`);
      }
    }
  }
  // Story 1.6: the authored impulse mapping is validated HERE and embedded
  // into the generated module as parsed data (AD-11/AD-18: the sealed build
  // fetches nothing; a bad mapping fails the build, never runtime).
  let impulses;
  if (entry.impulsePath !== undefined) {
    if (typeof entry.impulsePath !== "string" || entry.impulsePath === "") {
      fail(`entry ${i} (${entry.id}): impulsePath must be a non-empty string relative to the repo root`);
    }
    const mapPath = path.resolve(cwd, entry.impulsePath);
    if (!existsSync(mapPath)) {
      fail(`entry ${i} (${entry.id}): impulse mapping source not found: ${entry.impulsePath}`);
    }
    let mapping;
    try {
      mapping = JSON.parse(readFileSync(mapPath, "utf8"));
    } catch (err) {
      fail(`entry ${i} (${entry.id}): impulse mapping is not valid JSON: ${String(err)}`);
    }
    if (typeof mapping !== "object" || mapping === null || Array.isArray(mapping)) {
      fail(`entry ${i} (${entry.id}): impulse mapping must be an object of event name -> reaction name`);
    }
    for (const [event, reaction] of Object.entries(mapping)) {
      if (typeof reaction !== "string" || !REACTIONS.includes(reaction)) {
        fail(`entry ${i} (${entry.id}): impulse mapping value ${JSON.stringify(reaction)} for event ${JSON.stringify(event)} is not a kernel reaction (known: ${REACTIONS.join(", ")})`);
      }
    }
    // Fixed key order (sorted): byte-identical re-emits must not depend on
    // the asset file's key order — the same rule as the controls vocab legs.
    impulses = Object.fromEntries(
      Object.entries(mapping).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  }
  // Story 2.1 (AD-7/AD-18): the attract-loop RECIPE is authored plain data;
  // it is shape-validated HERE and embedded into the generated module as
  // parsed data (the sealed build fetches nothing; a bad recipe fails the
  // build, never the browser). The sibling of the impulse mapping above.
  let attractSound;
  if (entry.attractSoundPath !== undefined) {
    if (typeof entry.attractSoundPath !== "string" || entry.attractSoundPath === "") {
      fail(`entry ${i} (${entry.id}): attractSoundPath must be a non-empty string relative to the repo root`);
    }
    const recipePath = path.resolve(cwd, entry.attractSoundPath);
    if (!existsSync(recipePath)) {
      fail(`entry ${i} (${entry.id}): attract sound recipe source not found: ${entry.attractSoundPath}`);
    }
    let recipe;
    try {
      recipe = JSON.parse(readFileSync(recipePath, "utf8"));
    } catch (err) {
      fail(`entry ${i} (${entry.id}): attract sound recipe is not valid JSON: ${String(err)}`);
    }
    if (typeof recipe !== "object" || recipe === null || Array.isArray(recipe)) {
      fail(`entry ${i} (${entry.id}): attract sound recipe must be an object (sampleRate, loopSeconds, wave, gain, notes)`);
    }
    for (const key of Object.keys(recipe)) {
      if (key !== "sampleRate" && key !== "loopSeconds" && key !== "wave" && key !== "gain" && key !== "notes") {
        fail(`entry ${i} (${entry.id}): unknown attract sound recipe field ${JSON.stringify(key)} (known: sampleRate, loopSeconds, wave, gain, notes)`);
      }
    }
    // Bounds, not just positivity: createBuffer REJECTS sampleRates
    // outside the browser range and length 0 at boot — a shape-valid but
    // unusable recipe must die at the build gate (the fail-fast law), not
    // turn into a workbench swap in the browser.
    if (!Number.isInteger(recipe.sampleRate) || recipe.sampleRate < 8000 || recipe.sampleRate > 192000) {
      fail(`entry ${i} (${entry.id}): attract sound recipe sampleRate must be an integer in [8000, 192000] (the AudioBuffer createBuffer range)`);
    }
    if (!Number.isFinite(recipe.loopSeconds) || recipe.loopSeconds <= 0) {
      fail(`entry ${i} (${entry.id}): attract sound recipe loopSeconds must be a positive finite number`);
    }
    if (Math.round(recipe.loopSeconds * recipe.sampleRate) < 1) {
      fail(`entry ${i} (${entry.id}): attract sound recipe renders an empty buffer (loopSeconds x sampleRate rounds to 0)`);
    }
    if (recipe.wave !== "square" && recipe.wave !== "triangle") {
      fail(`entry ${i} (${entry.id}): attract sound recipe wave must be "square" or "triangle" (known: square, triangle)`);
    }
    if (!Number.isFinite(recipe.gain) || recipe.gain < 0 || recipe.gain > 1) {
      fail(`entry ${i} (${entry.id}): attract sound recipe gain must be a finite number in [0, 1]`);
    }
    if (!Array.isArray(recipe.notes) || recipe.notes.length === 0) {
      fail(`entry ${i} (${entry.id}): attract sound recipe notes must be a non-empty array`);
    }
    const notes = [];
    for (const [n, note] of recipe.notes.entries()) {
      if (typeof note !== "object" || note === null || Array.isArray(note)) {
        fail(`entry ${i} (${entry.id}): attract sound note ${n} must be an object (start, end, freq, amp)`);
      }
      for (const key of Object.keys(note)) {
        if (key !== "start" && key !== "end" && key !== "freq" && key !== "amp") {
          fail(`entry ${i} (${entry.id}): attract sound note ${n}: unknown field ${JSON.stringify(key)} (known: start, end, freq, amp)`);
        }
      }
      for (const leg of ["start", "end", "freq", "amp"]) {
        if (!Number.isFinite(note[leg])) {
          fail(`entry ${i} (${entry.id}): attract sound note ${n}: ${leg} must be a finite number`);
        }
      }
      if (note.freq <= 0) {
        fail(`entry ${i} (${entry.id}): attract sound note ${n}: freq must be positive`);
      }
      if (note.start < 0 || note.end <= note.start) {
        fail(`entry ${i} (${entry.id}): attract sound note ${n}: must satisfy 0 <= start < end`);
      }
      if (note.end > recipe.loopSeconds) {
        fail(`entry ${i} (${entry.id}): attract sound note ${n}: end ${String(note.end)} exceeds loopSeconds ${String(recipe.loopSeconds)}`);
      }
      if (note.amp < 0 || note.amp > 1) {
        fail(`entry ${i} (${entry.id}): attract sound note ${n}: amp must be in [0, 1]`);
      }
      // Fixed key order: the asset's key order must not leak into emitted
      // bytes — the same rule as the controls vocab legs.
      notes.push({ start: note.start, end: note.end, freq: note.freq, amp: note.amp });
    }
    attractSound = {
      sampleRate: recipe.sampleRate,
      loopSeconds: recipe.loopSeconds,
      wave: recipe.wave,
      gain: recipe.gain,
      notes,
    };
  }
  // Strict schema: a typo like "seeds" would silently drop the seed and the
  // entry would still emit — fail loudly instead.
  for (const key of Object.keys(entry)) {
    if (
      key !== "id" &&
      key !== "simPath" &&
      key !== "seed" &&
      key !== "presPath" &&
      key !== "controls" &&
      key !== "impulsePath" &&
      key !== "attractSoundPath"
    ) {
      fail(`entry ${i} (${entry.id}): unknown field ${JSON.stringify(key)} (known: id, simPath, seed, presPath, controls, impulsePath, attractSoundPath)`);
    }
  }
  // Attach the validated, sorted mapping only after the schema loop, so the
  // generated data field never reads as an unknown list field.
  if (impulses !== undefined) entry.impulses = impulses;
  if (attractSound !== undefined) entry.attractSound = attractSound;
  entries.push(entry);
}
entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
for (let i = 1; i < entries.length; i++) {
  if (entries[i].id === entries[i - 1].id) fail(`duplicate game id in provisional list: ${entries[i].id}`);
}

// Identifier per game: prefix + PascalCase(id) — 'g' for the sim half, 'p'
// for the presentation half; always valid, stable, and parallel names.
// "a1" and "a-1" would collide on gA1; fail loudly rather than emit a module
// with a duplicate import binding.
function localName(id, prefix) {
  return prefix + id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}
const byName = new Map();
for (const entry of entries) {
  const name = localName(entry.id, "g");
  if (byName.has(name)) {
    fail(`identifier collision: "${byName.get(name)}" and "${entry.id}" both map to ${name}`);
  }
  byName.set(name, entry.id);
}

// Import specifiers are relative to the generated file, forward-slash style.
function relSpec(target) {
  let rel = path.relative(path.dirname(outPath), target).replaceAll("\\", "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

const lines = [
  "// GENERATED by tools/gen-registry.mjs - do not edit.",
  "// Re-exports the sim halves to the kernel tick site and presentation",
  "// halves to the render site (AD-1/AD-2/AD-11).",
  `import type { GameRegistryEntry } from "${relSpec(path.join(cwd, "core", "contract", "index.ts"))}";`,
  "",
];
for (const entry of entries) {
  lines.push(`import { createSim as ${localName(entry.id, "g")} } from "${relSpec(path.resolve(cwd, entry.simPath))}";`);
  if (entry.presPath !== undefined) {
    lines.push(`import { createPresentation as ${localName(entry.id, "p")} } from "${relSpec(path.resolve(cwd, entry.presPath))}";`);
  }
}
if (entries.length > 0) lines.push("");
lines.push("export const gameRegistry: GameRegistryEntry[] = [");
for (const entry of entries) {
  const fields = [`id: ${JSON.stringify(entry.id)}`];
  if (entry.seed !== undefined) fields.push(`seed: ${JSON.stringify(entry.seed)}`);
  fields.push(`createSim: ${localName(entry.id, "g")}`);
  if (entry.presPath !== undefined) fields.push(`createPresentation: ${localName(entry.id, "p")}`);
  if (entry.controls !== undefined) {
    // Fixed key order (vocab, axes, buttons, aim): byte-identical re-emits
    // must not depend on the list file's key order.
    fields.push(
      `controls: ${JSON.stringify({
        vocab: entry.controls.vocab,
        axes: entry.controls.axes,
        buttons: entry.controls.buttons,
        aim: entry.controls.aim,
      })}`,
    );
  }
  if (entry.impulses !== undefined) {
    // Parsed mapping data embedded in the module (already sorted at
    // validation time — the asset's key order cannot leak into bytes).
    fields.push(`impulses: ${JSON.stringify(entry.impulses)}`);
  }
  if (entry.attractSound !== undefined) {
    // Parsed attract-loop recipe data embedded in the module (fixed key
    // order established at validation time).
    fields.push(`attractSound: ${JSON.stringify(entry.attractSound)}`);
  }
  lines.push(`  { ${fields.join(", ")} },`);
}
lines.push("];", "");

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join("\n"));
console.log(`gen-registry: ${entries.length} entr${entries.length === 1 ? "y" : "ies"} -> ${outPath}`);
