// In-process coverage seam for artifact-guard harness dir derivation (P1).
//
// Imports from dist/claude (the shipped tree), matching the t-batch3 seam
// precedent — a stale dist reds here rather than passing against un-regenerated
// bytes.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KNOWN_HARNESS_DIRS } from "../../dist/claude/.claude/tools/amadeus-harness.ts";
import {
  isNonDocPath,
  workspaceHasSourceFile,
} from "../../dist/claude/.claude/tools/amadeus-state.ts";

const tempDirs: string[] = [];

function makeWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "artifact-guard-harness-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("t-artifact-guard-harness-dirs: workspaceHasSourceFile", () => {
  for (const harnessDir of KNOWN_HARNESS_DIRS) {
    test(`${harnessDir} alone does not count as source work`, () => {
      const pd = makeWorkspace();
      mkdirSync(join(pd, harnessDir), { recursive: true });
      writeFileSync(join(pd, harnessDir, "file.ts"), "export {};\n");
      expect(workspaceHasSourceFile(pd)).toBe(false);
    });
  }

  test("amadeus/ alone does not count as source work", () => {
    const pd = makeWorkspace();
    mkdirSync(join(pd, "amadeus", "spaces", "default"), { recursive: true });
    writeFileSync(join(pd, "amadeus", "spaces", "default", "note.md"), "# note\n");
    expect(workspaceHasSourceFile(pd)).toBe(false);
  });

  test("src/ file counts as source work", () => {
    const pd = makeWorkspace();
    mkdirSync(join(pd, "src"), { recursive: true });
    writeFileSync(join(pd, "src", "file.ts"), "export {};\n");
    expect(workspaceHasSourceFile(pd)).toBe(true);
  });
});

describe("t-artifact-guard-harness-dirs: isNonDocPath", () => {
  test("harness and amadeus paths are doc/framework paths", () => {
    expect(isNonDocPath(".cursor/foo.ts")).toBe(false);
    expect(isNonDocPath(".opencode/foo.ts")).toBe(false);
    expect(isNonDocPath("amadeus/x.md")).toBe(false);
  });

  test("application paths count as source work", () => {
    expect(isNonDocPath("src/foo.ts")).toBe(true);
    expect(isNonDocPath("package.json")).toBe(true);
  });
});
