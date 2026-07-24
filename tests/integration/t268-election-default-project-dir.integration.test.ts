// t268 — regression for Issue #1450: amadeus-election.ts main()'s --project-less
// default used to resolve to this script's OWN directory (join(import.meta.dir,
// "..")), ignoring cwd entirely. A bare invocation (no --project flag, no second
// JS arg) must instead resolve the project root the same way every other
// amadeus CLI tool does, via resolveProjectDir (cwd-based fallback when no
// harness-dir marker is found via script-path derivation).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../packages/framework/core/tools/amadeus-election";

const DEF = {
  electionId: "E-DEFROOT1",
  kind: "zero-confirm",
  question: "default project dir regression",
  choices: [{ internalNo: 1, label: "0件で可" }],
  voters: ["alice"],
};

let tmp = "";
let prevCwd = "";
let prevClaudeProjectDir: string | undefined;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "election-default-root-"));
  // Harness-dir marker so resolveProjectDir's cwd fallback (rung 4) accepts
  // this tmp dir as a project root, mirroring a real workspace checkout.
  mkdirSync(join(tmp, ".claude", "tools"), { recursive: true });
  mkdirSync(join(tmp, "amadeus", "spaces", "default", "elections"), { recursive: true });
  prevCwd = process.cwd();
  prevClaudeProjectDir = process.env.CLAUDE_PROJECT_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;
  process.chdir(tmp);
});

afterEach(() => {
  process.chdir(prevCwd);
  if (prevClaudeProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = prevClaudeProjectDir;
  rmSync(tmp, { recursive: true, force: true });
});

describe("amadeus-election main() — default project dir (Issue #1450)", () => {
  test("a bare invocation (no --project, no explicit projectDir) writes under cwd's amadeus/ tree, not a harness-relative one", () => {
    const defFile = join(tmp, "def.json");
    writeFileSync(defFile, JSON.stringify(DEF));
    // No --project flag AND no second `main()` argument: exactly the invocation
    // shape from Issue #1450 (`bun .claude/tools/amadeus-election.ts open ...`
    // with --project omitted).
    const exitCode = main(["open", "--file", defFile]);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tmp, "amadeus", "spaces", "default", "elections", "elections.json"))).toBe(
      true,
    );
    // The bug's failure mode: state leaking into a `.claude/amadeus/...` (or
    // any harness-relative) tree instead of cwd's `amadeus/`.
    expect(existsSync(join(tmp, ".claude", "amadeus"))).toBe(false);
  });
});
