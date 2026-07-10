// t-package-write-sweep: regression guard for GitHub #771.
//
// covers: file:scripts/package.ts (writeHarness project-root post-sweep)
// in-process by design: writeHarness/checkHarness are driven via direct import,
// not a package.ts subprocess, because bun --coverage does not instrument spawned
// children — a CLI-spawn test would leave the new sweep lines uncovered.
//
// WHAT. `package.ts <name>` (write mode) clean-swept only <harnessDir>/ and
// amadeus/, never the project-root output layer directly under dist/<name>/. So
// a stale/renamed projectRoot output (or a file in an undeclared subdir) that
// pre-existed a regenerate SURVIVED the write, and the very next `--check`
// flagged it as an ORPHAN (exit 1) — the regenerate command could not satisfy
// its own drift guard. checkHarness's whole-tree orphan scan (#701) already
// caught such files on the READ side; write was the asymmetric half. The fix
// gives write a post-sweep that deletes exactly the files checkHarness would
// flag, via the shared expectedOutsideHarness helper.
//
// WHY IN-PROCESS. bun --coverage does not instrument spawned subprocesses, so a
// CLI-spawn test would leave writeHarness's new sweep lines uncovered and trip
// the codecov/patch gate. Driving writeHarness + checkHarness in-process (same
// idiom as t-package-unreferenced-source.test.ts) executes and covers them.
//
// TARGET HARNESS. `kiro` — its committed root face carries a projectRoot
// AGENTS.md and .gitignore, so the sweep's expected-set logic is exercised
// against real legitimate root files it must NOT delete.
//
// HERMETIC. writeHarness regenerates dist/kiro deterministically from source
// (committed == generated, enforced by dist:check in CI), so a clean run leaves
// the tree byte-identical to committed. Every planted file is removed in a
// try/finally AND an afterEach backstop.

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkHarness, writeHarness } from "../../scripts/package.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST_KIRO = join(REPO_ROOT, "dist", "kiro");

// A stale file directly under dist/kiro/, plus one nested in an undeclared
// subdirectory — the two leak shapes checkHarness (#701) catches and write must
// now sweep. Both are purged after each test (the subdir root too).
const ROOT_STALE = join(DIST_KIRO, "STALE_WRITE_SWEEP.md");
const SUBDIR_ROOT = join(DIST_KIRO, "stale-write-subdir");
const SUBDIR_STALE = join(SUBDIR_ROOT, "nested.md");

// A real regenerate spawns in-tree generators (graph compile + runner-gen), so
// writeHarness + checkHarness together are ~4-8s; give a generous budget.
const WRITE_TIMEOUT_MS = 120_000;

function cleanup(): void {
  rmSync(ROOT_STALE, { force: true });
  rmSync(SUBDIR_ROOT, { recursive: true, force: true });
}

describe("t-package-write-sweep — #771: write mode sweeps stale project-root outputs", () => {
  afterEach(cleanup);

  test("(a) preconditions: committed dist/kiro is clean", () => {
    cleanup();
    const problems = checkHarness("kiro");
    if (problems.length > 0) console.error("dirty dist/kiro:\n" + problems.join("\n"));
    expect(problems).toEqual([]);
  }, WRITE_TIMEOUT_MS);

  test("(b) planted stale outputs are swept by write, and --check passes after", () => {
    cleanup();
    writeFileSync(ROOT_STALE, "stale\n");
    mkdirSync(SUBDIR_ROOT, { recursive: true });
    writeFileSync(SUBDIR_STALE, "stale\n");
    try {
      // Before the #771 fix, write left both files in place and checkHarness
      // returned ORPHAN problems for them (the red path this guards).
      writeHarness("kiro");
      expect(existsSync(ROOT_STALE)).toBe(false);
      expect(existsSync(SUBDIR_STALE)).toBe(false);
      const problems = checkHarness("kiro");
      if (problems.length > 0) console.error("post-write --check problems:\n" + problems.join("\n"));
      expect(problems).toEqual([]);
    } finally {
      cleanup();
    }
  }, WRITE_TIMEOUT_MS);

  test("(c) write does NOT delete legitimate project-root outputs", () => {
    cleanup();
    // AGENTS.md is a declared projectRoot output for kiro; a regenerate must
    // reproduce it, not sweep it. Its survival proves the expected-set guard.
    writeHarness("kiro");
    expect(existsSync(join(DIST_KIRO, "AGENTS.md"))).toBe(true);
    expect(checkHarness("kiro")).toEqual([]);
  }, WRITE_TIMEOUT_MS);
});
