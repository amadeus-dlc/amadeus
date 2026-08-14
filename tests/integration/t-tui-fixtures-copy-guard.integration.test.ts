// covers: file:tests/harness/tui-fixtures.ts
// size: medium
//
// #3014: setupTuiProject seeds a TUI fixture project by copying whole
// distributable trees. copyTreeWithRetry (#2397/#3003) is the guard that makes
// such a copy diagnosable: it retries a transient ENOENT/EAGAIN/EMFILE/ENOMEM,
// clears dest first (the dest-fresh contract) and verifies the copy by a file
// count post-condition instead of trusting cpSync's silent return. Only the
// claude engine-tree copy went through it; the kiro / kiro-ide engine trees and
// all three amadeus/ memory trees still used a bare cpSync, so a partial copy on
// those five sites lands a silently incomplete fixture.
//
// This drives setupTuiProject with the fixtures module's copyTreeWithRetry
// replaced by a recording wrapper (mock.module — the consumer's live ESM binding
// resolves to the wrapper), so the assertion is about the call, not about a
// production code path bent for testability: tui-fixtures.ts takes no test-only
// parameter or branch.

import { describe, expect, mock, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";

import * as fixtures from "../harness/fixtures.ts";

const realCopyTreeWithRetry = fixtures.copyTreeWithRetry;

interface CopyCall {
  src: string;
  dest: string;
}
const calls: CopyCall[] = [];
/** When set, stands in for the real copy — used to drive the error path. */
let onCopy: ((src: string, dest: string) => void) | null = null;

mock.module("../harness/fixtures.ts", () => ({
  ...fixtures,
  copyTreeWithRetry: (src: string, dest: string, ops?: fixtures.CopyTreeOps) => {
    calls.push({ src, dest });
    if (onCopy) {
      onCopy(src, dest);
      return;
    }
    if (ops) realCopyTreeWithRetry(src, dest, ops);
    else realCopyTreeWithRetry(src, dest);
  },
}));

const { setupTuiProject, cleanupTuiProject, AMADEUS_SRC, KIRO_SRC, KIRO_IDE_SRC } = await import(
  "../harness/tui-fixtures.ts"
);

// tests/integration/ -> repo root. The memory trees are not exported by
// tui-fixtures (module-private consts), so they are recomputed here from the
// same dist layout the fixture reads.
const REPO_ROOT = join(import.meta.dir, "..", "..");
const CLAUDE_MEMORY_SRC = join(REPO_ROOT, "dist", "claude", "amadeus");
const KIRO_MEMORY_SRC = join(REPO_ROOT, "dist", "kiro", "amadeus");
const KIRO_IDE_MEMORY_SRC = join(REPO_ROOT, "dist", "kiro-ide", "amadeus");

function drive(opts: Parameters<typeof setupTuiProject>[0]): CopyCall[] {
  calls.length = 0;
  const proj = setupTuiProject(opts);
  try {
    return [...calls];
  } finally {
    cleanupTuiProject(proj);
  }
}

describe("setupTuiProject copies through copyTreeWithRetry (#3014)", () => {
  test("the claude harness routes both its engine tree and its memory tree through the guard", () => {
    const observed = drive({});
    const sources = observed.map((call) => call.src);
    expect(sources).toContain(AMADEUS_SRC);
    expect(sources).toContain(CLAUDE_MEMORY_SRC);
  });

  test("the kiro harness routes both its engine tree and its memory tree through the guard", () => {
    const observed = drive({ harness: "kiro" });
    const sources = observed.map((call) => call.src);
    expect(sources).toContain(KIRO_SRC);
    expect(sources).toContain(KIRO_MEMORY_SRC);
    // AGENTS.md is a single FILE, not a tree: countFilesRecursive readdirs its
    // argument, so routing it through the guard would fail closed with a
    // non-retryable ENOTDIR. It stays a bare cpSync by attribution.
    expect(sources).not.toContain(join(KIRO_SRC, "..", "AGENTS.md"));
  });

  test("the kiro-ide harness routes both its engine tree and its memory tree through the guard", () => {
    const observed = drive({ harness: "kiro-ide" });
    const sources = observed.map((call) => call.src);
    expect(sources).toContain(KIRO_IDE_SRC);
    expect(sources).toContain(KIRO_IDE_MEMORY_SRC);
    expect(sources).not.toContain(join(KIRO_IDE_SRC, "..", "AGENTS.md"));
  });

  test("a guard failure on the memory copy propagates out of setupTuiProject", () => {
    // The whole point of routing these sites through the guard is that an
    // unrecoverable copy fails LOUDLY at the seeding call site instead of
    // leaving a silently partial fixture for the test body to misread.
    const seen: string[] = [];
    calls.length = 0;
    onCopy = (src, dest) => {
      seen.push(dest);
      if (src === KIRO_MEMORY_SRC) {
        throw new Error("copyTreeWithRetry: cpSync returned but the file count does not match");
      }
    };
    try {
      expect(() => setupTuiProject({ harness: "kiro" })).toThrow(
        "copyTreeWithRetry: cpSync returned but the file count does not match",
      );
    } finally {
      onCopy = null;
      // The temp project never reaches the caller when seeding throws; its
      // path is recovered from the dest of the first observed copy.
      const first = seen[0];
      if (first) rmSync(join(first, ".."), { recursive: true, force: true });
    }
  });
});
