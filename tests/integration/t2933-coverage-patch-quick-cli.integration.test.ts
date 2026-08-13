// covers: file:plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts
// size: medium
//
// t2933 — the coverage-patch-quick CLI's real process boundary (#2933).
//
// The pure logic and the injected orchestration live in
// tests/unit/t2933-coverage-patch-quick.test.ts. This file drives the node IO
// seam itself (real git, real temp scratch dir, real spawn of the shipped
// patch gate) and the argv dispatch, in-process — bun --coverage does not
// instrument spawned children.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createNodeIo,
  main,
  type QuickIo,
} from "../../plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts";

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "cpq-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("createNodeIo", () => {
  test("runGit resolves the repository root of the process cwd", () => {
    const io = createNodeIo();
    const result = io.runGit(["rev-parse", "--show-toplevel"]);
    expect(result.code).toBe(0);
    expect(existsSync(join(result.stdout.trim(), "tests", "coverage-patch-gate.ts"))).toBe(true);
  });

  test("runGit reports a failing git invocation instead of throwing", () => {
    const io = createNodeIo();
    const result = io.runGit(["rev-parse", "--verify", "refs/heads/definitely-not-a-branch-2933"]);
    expect(result.code).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  test("makeScratchDir creates a fresh directory outside the repository", () => {
    const io = createNodeIo();
    const scratch = io.makeScratchDir();
    try {
      expect(existsSync(scratch)).toBe(true);
      expect(scratch.startsWith(io.runGit(["rev-parse", "--show-toplevel"]).stdout.trim())).toBe(
        false,
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("exists and readText read the real filesystem", () => {
    withTempDir((dir) => {
      const file = join(dir, "probe.txt");
      writeFileSync(file, "hello");
      const io = createNodeIo();
      expect(io.exists(file)).toBe(true);
      expect(io.exists(join(dir, "absent.txt"))).toBe(false);
      expect(io.readText(file)).toBe("hello");
    });
  });

  test("runGate spawns the real patch gate and its refusals carry no verdict", () => {
    withTempDir((dir) => {
      const io = createNodeIo();
      const repoRoot = io.runGit(["rev-parse", "--show-toplevel"]).stdout.trim();
      const lcov = join(dir, "lcov.info");
      writeFileSync(lcov, "");
      const result = io.runGate(join(repoRoot, "tests", "coverage-patch-gate.ts"), lcov);
      // Either a verdict or a refusal (dirty tree) — never a crash without output.
      expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
    });
  });
});

describe("main", () => {
  function recordingIo(): { io: QuickIo; out: string[]; err: string[] } {
    const out: string[] = [];
    const err: string[] = [];
    const io: QuickIo = {
      env: {},
      runGit: () => ({ code: 128, stdout: "", stderr: "fatal: not a git repository" }),
      runBunTest: () => ({ code: 0, stdout: "", stderr: "" }),
      runGate: () => ({ code: 0, stdout: "", stderr: "" }),
      exists: () => false,
      readText: () => "",
      makeScratchDir: () => "/unused",
      out: (line) => out.push(line),
      err: (line) => err.push(line),
    };
    return { io, out, err };
  }

  test("no argv and --check both run the approximation", () => {
    const bare = recordingIo();
    expect(main([], bare.io)).not.toBe(0);
    const checked = recordingIo();
    expect(main(["--check"], checked.io)).not.toBe(0);
    expect(checked.err.join("\n")).toContain("not a git repository");
  });

  test("an unknown argument is a usage error", () => {
    const rec = recordingIo();
    expect(main(["--wat"], rec.io)).toBe(2);
    expect(rec.err.join("\n")).toContain("Usage:");
  });
});
