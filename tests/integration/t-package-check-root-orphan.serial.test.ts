// t-package-check-root-orphan: regression guard for GitHub #701.
//
// covers: file:scripts/package.ts (checkHarness orphan scan)
//
// WHAT. `package.ts <name> --check` claims byte-for-byte freshness vs the
// committed dist/ tree, but before the #701 fix its orphan (committed→built)
// scan only covered the harness-dir subtree and a hardcoded [".agents","amadeus"]
// list. A stale committed file sitting DIRECTLY under dist/<name>/ — or in any
// undeclared subdirectory — belonged to no scan path and slipped past --check
// (exit 0), the classic "removed/renamed projectRoot output still committed"
// leak. This test plants such orphans and asserts --check now catches them.
//
// WHY A SUBPROCESS. package.ts is a CLI that spawns in-tree generators per
// harness; running it as a child mirrors how a developer / CI invokes it (same
// idiom as t145). We target the `kiro` harness because its committed root face
// includes both .gitignore and a projectRoot AGENTS.md, exercising the
// expected-set logic that must NOT false-positive on legitimate root files.
//
// HERMETIC. Uses env: { ...process.env } and cleans up every planted file in a
// try/finally AND an afterEach backstop, so the tree is never left dirty even if
// an assertion throws — the test passes standalone via `bun test <file>`.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKAGE_TS = join(REPO_ROOT, "scripts", "package.ts");
const DIST_KIRO = join(REPO_ROOT, "dist", "kiro");

// Same rationale as t145: a --check build+diff is ~1.5s standalone but can be
// CPU-starved under the suite's parallelism, so give a generous budget.
const CHECK_TIMEOUT_MS = 60_000;

// A flat orphan directly under dist/kiro/, and an orphan nested in an undeclared
// subdirectory. Both are removed after each test (the subdir root too).
const ROOT_ORPHAN = join(DIST_KIRO, "STALE_ROOT_FILE.md");
const SUBDIR_ROOT = join(DIST_KIRO, "stale-subdir");
const SUBDIR_ORPHAN = join(SUBDIR_ROOT, "nested.md");

function runCheck(): { status: number | null; output: string } {
  const res = spawnSync("bun", [PACKAGE_TS, "kiro", "--check"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: { ...process.env },
    timeout: CHECK_TIMEOUT_MS - 5_000,
  });
  return { status: res.status, output: (res.stdout ?? "") + (res.stderr ?? "") };
}

function cleanup(): void {
  rmSync(ROOT_ORPHAN, { force: true });
  rmSync(SUBDIR_ROOT, { recursive: true, force: true });
}

describe("t-package-check-root-orphan — #701: --check catches stale dist root orphans", () => {
  afterEach(cleanup);

  test("(a) stale file directly under dist/kiro/ → --check fails and names it", () => {
    writeFileSync(ROOT_ORPHAN, "stale\n");
    try {
      const { status, output } = runCheck();
      if (status === 0) console.error("package kiro --check output:\n" + output);
      expect(status).not.toBe(0);
      expect(output).toContain("ORPHAN in dist: kiro/STALE_ROOT_FILE.md");
    } finally {
      cleanup();
    }
  }, CHECK_TIMEOUT_MS);

  test("(b) stale file in an undeclared subdirectory → --check fails and names it", () => {
    mkdirSync(SUBDIR_ROOT, { recursive: true });
    writeFileSync(SUBDIR_ORPHAN, "stale\n");
    try {
      const { status, output } = runCheck();
      if (status === 0) console.error("package kiro --check output:\n" + output);
      expect(status).not.toBe(0);
      expect(output).toContain("ORPHAN in dist: kiro/stale-subdir/nested.md");
    } finally {
      cleanup();
    }
  }, CHECK_TIMEOUT_MS);

  test("(c) clean tree → --check exits 0 (no false positives on legit root files)", () => {
    // Guard against a dirty tree leaking in from a prior failed run.
    cleanup();
    expect(existsSync(ROOT_ORPHAN)).toBe(false);
    expect(existsSync(SUBDIR_ROOT)).toBe(false);
    const { status, output } = runCheck();
    if (status !== 0) console.error("package kiro --check output:\n" + output);
    expect(status).toBe(0);
    expect(output).toContain("[kiro] --check: OK");
  }, CHECK_TIMEOUT_MS);
});
