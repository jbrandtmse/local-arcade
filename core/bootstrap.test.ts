// AC1/AC2 pinning: exact stack pins from the spine Stack table (three and
// @types/three identical, TS/Vite/Node pinned, no extra third-party deps)
// and the Structural Seed directory set.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines: Record<string, string>;
  scripts: Record<string, string>;
};

test("stack pins are exact (no ranges) and three/@types/three match", () => {
  assert.equal(pkg.dependencies["three"], "0.187.0");
  assert.equal(pkg.devDependencies["@types/three"], "0.187.0");
  assert.equal(pkg.devDependencies["@types/three"], pkg.dependencies["three"]);
  assert.equal(pkg.devDependencies["typescript"], "7.0.2");
  assert.equal(pkg.devDependencies["vite"], "8.3.8");
  assert.equal(pkg.engines["node"], ">=26");
  for (const range of [...Object.values(pkg.dependencies), ...Object.values(pkg.devDependencies)]) {
    assert.match(range, /^\d+\.\d+\.\d+$/, `pin must be exact, got ${range}`);
  }
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["three"]);
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ["@types/three", "typescript", "vite"]);
});

test("package.json scripts cover dev/build/typecheck/test/registry/depcheck/lint", () => {
  for (const script of ["dev", "build", "typecheck", "test", "registry", "depcheck", "lint"]) {
    assert.ok(pkg.scripts[script], `missing script: ${script}`);
  }
  assert.equal(pkg.scripts["typecheck"], "tsc --noEmit");
  assert.ok(pkg.scripts["test"].includes("--test"));
});

test("lockfile is committed for a reproducible fresh install", () => {
  assert.ok(existsSync(path.join(root, "package-lock.json")));
});

test("Structural Seed directories exist", () => {
  const seedDirs = ["core", "core/room", "core/contract", "games", "ci", "tools", "services", "services/report-ingest", ".claude/skills"];
  for (const dir of seedDirs) {
    assert.ok(statSync(path.join(root, dir)).isDirectory(), `missing seed dir: ${dir}`);
  }
});
