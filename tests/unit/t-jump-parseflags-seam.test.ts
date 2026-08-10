// covers: function:extractProjectDirArg, function:parseFlags (amadeus-jump.ts)
//
// In-process coverage seam for Issue #2763's amadeus-jump.ts guards. t19
// (tests/unit/t19.test.ts) drives the same contract through the real shipped
// CLI via spawnSync (a deliberate CLI-contract port, per its own header
// comment) — bun's coverage instrumentation cannot see inside a spawned
// subprocess (the spawn blindspot), so the two new guard lines register as
// UNCOVERED in the patch coverage gate despite being exercised functionally.
// This file drives the same branches in-process:
//   - extractProjectDirArg: the --project-dir value-arm guard inside main(),
//     extracted to a pure, exported seam specifically so it is reachable
//     without spawning (main() itself only runs under `import.meta.main`).
//   - parseFlags's value-arm guard, reached via the exported handleResolve.

import { describe, expect, test } from "bun:test";
import {
  extractProjectDirArg,
  handleResolve,
} from "../../dist/claude/.claude/tools/amadeus-jump.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}
function captureExit(fn: () => void): { threw: boolean; stderr: string } {
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.error = (...a: unknown[]) => {
    stderr += a.map(String).join(" ");
  };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) threw = true;
    else throw e;
  } finally {
    process.exit = origExit;
    console.error = origErr;
  }
  return { threw, stderr };
}

describe("t-jump-parseflags-seam: extractProjectDirArg (Issue #2763)", () => {
  test("--project-dir <value> is extracted and removed from filteredArgs", () => {
    const r = extractProjectDirArg(["resolve", "--project-dir", "/tmp/x", "--stage", "code-generation"]);
    expect(r.projectDir).toBe("/tmp/x");
    expect(r.filteredArgs).toEqual(["resolve", "--stage", "code-generation"]);
  });

  test("--project-dir immediately followed by another flag is left in filteredArgs, not mis-consumed", () => {
    const r = extractProjectDirArg(["resolve", "--project-dir", "--stage", "code-generation"]);
    expect(r.projectDir).toBeUndefined();
    expect(r.filteredArgs).toEqual(["resolve", "--project-dir", "--stage", "code-generation"]);
  });

  test("a trailing --project-dir with no following token is left in filteredArgs", () => {
    const r = extractProjectDirArg(["resolve", "--project-dir"]);
    expect(r.projectDir).toBeUndefined();
    expect(r.filteredArgs).toEqual(["resolve", "--project-dir"]);
  });

  test("control: no --project-dir at all is a no-op", () => {
    const r = extractProjectDirArg(["resolve", "--stage", "code-generation"]);
    expect(r.projectDir).toBeUndefined();
    expect(r.filteredArgs).toEqual(["resolve", "--stage", "code-generation"]);
  });
});

describe("t-jump-parseflags-seam: parseFlags value-arm via handleResolve (Issue #2763)", () => {
  let proj: string;
  let prevPd: string | undefined;

  test("--stage immediately followed by --scope is refused before any state read", () => {
    proj = createTestProject();
    prevPd = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
    try {
      const r = captureExit(() => handleResolve(["--stage", "--scope", "feature"]));
      expect(r.threw).toBe(true);
      expect(r.stderr).toContain('--stage expects a value, got another flag: \\"--scope\\"');
    } finally {
      if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = prevPd;
      cleanupTestProject(proj);
    }
  });
});
