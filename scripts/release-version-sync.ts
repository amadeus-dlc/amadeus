// Aligns every framework version surface with the single release version
// (the repo has ONE version axis: packages/setup/package.json drives the
// v* release tags — see tests/unit/t68-version-changelog-sync.test.ts).
//
// Called by release-it's after:bump hook (packages/setup/.release-it.json)
// with the freshly bumped version, so the release commit carries:
//   - packages/setup/package.json          (bumped by release-it itself)
//   - packages/framework/core/tools/amadeus-version.ts
//   - README.md version badge
//   - dist/<harness>/ + self-install trees  (regenerated via the scripts —
//     never hand-edited)
//
// Idempotent: re-running with the current version produces no changes.
//
// Usage: bun scripts/release-version-sync.ts <version>

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { planVersionSync, VERSION_SURFACES } from "./release-version-sync-plan.ts";

const version = process.argv[2];
if (!version || !/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`usage: bun scripts/release-version-sync.ts <semver> (got: ${version ?? "nothing"})`);
  process.exit(1);
}

const rootProbe = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" });
if (rootProbe.status !== 0) {
  console.error("not inside a git worktree — cannot locate the repo root");
  process.exit(1);
}
const root = rootProbe.stdout.trim();

// Two-phase, all-or-nothing (FR-702-2): read every surface, then validate ALL
// patterns; only if every one matched do we write. A pattern miss aborts before
// any write, so a half-applied state (version.ts advanced, badge stale) cannot
// occur and re-runs stay idempotent.
const contentsByPath: Record<string, string> = {};
for (const surface of VERSION_SURFACES) {
  contentsByPath[surface.relPath] = readFileSync(join(root, surface.relPath), "utf-8");
}

const plan = planVersionSync(version, contentsByPath);
if (!plan.ok) {
  console.error(`${plan.relPath}: expected pattern ${plan.pattern} not found`);
  process.exit(1);
}

let anyChanged = false;
for (const entry of plan.entries) {
  if (!entry.changed) continue;
  writeFileSync(join(root, entry.relPath), entry.next);
  anyChanged = true;
}

if (anyChanged) {
  // dist/ and the self-install trees are generated artifacts — regenerate,
  // never hand-edit (drift guards enforce byte-identity in CI).
  for (const cmd of [
    ["bun", "scripts/package.ts"],
    ["bun", "run", "promote:self"],
  ]) {
    const res = spawnSync(cmd[0], cmd.slice(1), { cwd: root, stdio: "inherit" });
    if (res.status !== 0) {
      console.error(`${cmd.join(" ")} failed (exit ${res.status})`);
      process.exit(1);
    }
  }
  console.log(`version surfaces synced to ${version} (dist + self-install regenerated)`);
} else {
  console.log(`version surfaces already at ${version} — nothing to do`);
}
