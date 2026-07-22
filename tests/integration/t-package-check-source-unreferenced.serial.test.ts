// t-package-check-source-unreferenced: regression guard for GitHub #735
// (layer 1 of the #719 two-layer masking).
//
// covers: file:scripts/package.ts (checkHarness source-unreferenced scan)
//
// WHAT. Before #735, `package.ts <name> --check` walked only the dist tree, so a
// stale file under packages/framework/harness/<name>/ that no manifest row, emit
// read, or module import references stayed invisible: the build copies only
// ENUMERATED source, so an unlisted file maps to nothing in dist and no dist-side
// scan (MISSING/DIFFERS/ORPHAN) ever sees it — exactly how #719's seven unshipped
// .kiro.hook files lingered in source. This test plants such a SOURCE orphan and
// asserts --check now flags it, in BOTH codex (an emit harness) and kiro (a
// non-emit harness), and stays green on a clean tree — the clean case also proves
// the build-mechanism files (manifest.ts / emit.ts / onboarding.fills.ts) are
// recognized WITHOUT a hardcoded exemption (else --check would red on a clean
// tree).
//
// WHY A SUBPROCESS. package.ts is a CLI that spawns in-tree generators per
// harness; running it as a child mirrors how a developer / CI invokes it (same
// idiom as t145 and the #701 root-orphan guard t-package-check-root-orphan).
//
// HERMETIC. Every planted file is removed in a try/finally AND an afterEach
// backstop, so the source tree is never left dirty even if an assertion throws —
// the test passes standalone via `bun test <file>`.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PACKAGE_TS = join(REPO_ROOT, "scripts", "package.ts");
const HARNESS_ROOT = join(REPO_ROOT, "packages", "framework", "harness");

// A --check build+diff is ~1.5s standalone but can be CPU-starved under the
// suite's parallelism, so give a generous budget (matches the root-orphan guard).
const CHECK_TIMEOUT_MS = 60_000;

// codex: a flat orphan directly under harness/codex/. kiro: an orphan nested in
// an undeclared subdirectory, to exercise the recursive source walk. Both are
// removed after each test (the codex subdir/kiro subdir roots too).
const CODEX_ORPHAN = join(HARNESS_ROOT, "codex", "STALE_UNREF_735.md");
const KIRO_SUBDIR = join(HARNESS_ROOT, "kiro", "skills", "amadeus", "stale735");
const KIRO_ORPHAN = join(KIRO_SUBDIR, "nested.md");

function runCheck(name: string): { status: number | null; output: string } {
  const res = spawnSync("bun", [PACKAGE_TS, name, "--check"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: { ...process.env },
    timeout: CHECK_TIMEOUT_MS - 5_000,
  });
  return { status: res.status, output: (res.stdout ?? "") + (res.stderr ?? "") };
}

function cleanup(): void {
  rmSync(CODEX_ORPHAN, { force: true });
  rmSync(KIRO_SUBDIR, { recursive: true, force: true });
}

describe("t-package-check-source-unreferenced — #735: --check catches unreferenced harness source", () => {
  afterEach(cleanup);

  test("(a) stale file under harness/codex/ (emit harness) → --check fails and names it", () => {
    writeFileSync(CODEX_ORPHAN, "stale\n");
    try {
      const { status, output } = runCheck("codex");
      if (status === 0) console.error("package codex --check output:\n" + output);
      expect(status).not.toBe(0);
      expect(output).toContain("UNREFERENCED in source: codex/STALE_UNREF_735.md");
    } finally {
      cleanup();
    }
  }, CHECK_TIMEOUT_MS);

  test("(b) stale file in a nested harness/kiro/ subdir (non-emit harness) → --check fails and names it", () => {
    mkdirSync(KIRO_SUBDIR, { recursive: true });
    writeFileSync(KIRO_ORPHAN, "stale\n");
    try {
      const { status, output } = runCheck("kiro");
      if (status === 0) console.error("package kiro --check output:\n" + output);
      expect(status).not.toBe(0);
      expect(output).toContain("UNREFERENCED in source: kiro/skills/amadeus/stale735/nested.md");
    } finally {
      cleanup();
    }
  }, CHECK_TIMEOUT_MS);

  test("(c) clean tree → --check exits 0 (build-mechanism files recognized, no false positives)", () => {
    // Guard against a dirty tree leaking in from a prior failed run.
    cleanup();
    expect(existsSync(CODEX_ORPHAN)).toBe(false);
    expect(existsSync(KIRO_SUBDIR)).toBe(false);
    for (const name of ["codex", "kiro"]) {
      const { status, output } = runCheck(name);
      if (status !== 0) console.error(`package ${name} --check output:\n` + output);
      expect(status).toBe(0);
      expect(output).toContain(`[${name}] --check: OK`);
    }
  }, CHECK_TIMEOUT_MS);
});
