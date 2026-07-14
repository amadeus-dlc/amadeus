// In-process coverage for the no-follow filesystem branches used by the v2
// migration safety checks. The CLI migration tests keep the process-level
// contract; these cases exercise the shared helpers in Bun's coverage process.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { loadRules } from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  _resetCloneIdForTests,
  auditFilePath,
  CLONE_ID_FILE,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const tempDirs: string[] = [];
let savedRulesDir: string | undefined;

function tempDir(tag: string): string {
  const path = mkdtempSync(join(tmpdir(), `amadeus-nofollow-${tag}-`));
  tempDirs.push(path);
  return path;
}

beforeEach(() => {
  savedRulesDir = process.env.AMADEUS_RULES_DIR;
});

afterEach(() => {
  _resetCloneIdForTests();
  if (savedRulesDir === undefined) delete process.env.AMADEUS_RULES_DIR;
  else process.env.AMADEUS_RULES_DIR = savedRulesDir;
  for (const path of tempDirs.splice(0)) {
    try {
      chmodSync(path, 0o700);
    } catch {
      // Best effort: only the permission-denial case changes this mode.
    }
    rmSync(path, { recursive: true, force: true });
  }
});

describe("upstream-v2 no-follow seams", () => {
  test("clone-id symlinks derive a stable shard token without reading the target", () => {
    const projectDir = tempDir("linked-clone");
    const workspace = join(projectDir, "amadeus");
    const target = join(projectDir, "outside-clone-id");
    const cloneId = join(workspace, CLONE_ID_FILE);
    mkdirSync(workspace, { recursive: true });
    writeFileSync(target, "do-not-read\n", "utf-8");
    symlinkSync(target, cloneId);

    _resetCloneIdForTests();
    const expected = createHash("sha256")
      .update(realpathSync(projectDir), "utf-8")
      .update("\0", "utf-8")
      .update(Buffer.from(target))
      .digest("hex")
      .slice(0, 12);

    expect(basename(auditFilePath(projectDir))).toEndWith(`-${expected}.md`);
    expect(readFileSync(target, "utf-8")).toBe("do-not-read\n");
  });

  test("an unwritable clone-id entry falls back to the in-memory token", () => {
    const projectDir = tempDir("blocked-clone");
    const cloneId = join(projectDir, "amadeus", CLONE_ID_FILE);
    mkdirSync(cloneId, { recursive: true });

    _resetCloneIdForTests();
    expect(basename(auditFilePath(projectDir))).toMatch(/-[a-f0-9]{12}\.md$/);
    expect(lstatSync(cloneId).isDirectory()).toBe(true);
  });

  test("a missing rules root fails closed", () => {
    process.env.AMADEUS_RULES_DIR = join(tempDir("missing-rules"), "missing");
    expect(loadRules()).toEqual([]);
  });

  const chmodIsEnforced = process.platform !== "win32" &&
    !(typeof process.getuid === "function" && process.getuid() === 0);
  const runIfChmod = chmodIsEnforced ? test : test.skip;

  runIfChmod("an unreadable rules entry fails closed", () => {
    const rules = tempDir("unreadable-rules");
    writeFileSync(join(rules, "org.md"), "# Org\n", "utf-8");
    process.env.AMADEUS_RULES_DIR = rules;
    chmodSync(rules, 0o444);
    try {
      expect(loadRules()).toEqual([]);
    } finally {
      chmodSync(rules, 0o700);
    }
  });
});
