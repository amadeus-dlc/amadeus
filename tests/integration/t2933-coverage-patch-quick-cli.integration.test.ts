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
  runCommand,
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

  test("runGate spawns the real patch gate and always says something", () => {
    withTempDir((dir) => {
      const io = createNodeIo();
      const repoRoot = io.runGit(["rev-parse", "--show-toplevel"]).stdout.trim();
      const lcov = join(dir, "lcov.info");
      writeFileSync(lcov, "");
      const allowlist = join(dir, "derived-allowlist.json");
      io.writeText(allowlist, "[]\n");
      const result = io.runGate(join(repoRoot, "tests", "coverage-patch-gate.ts"), lcov, allowlist);
      // Either a verdict or a refusal (dirty tree) — never a crash without output.
      expect(result.stdout.length + result.stderr.length).toBeGreaterThan(0);
    });
  });

  test("writeText writes the file it is given", () => {
    withTempDir((dir) => {
      const io = createNodeIo();
      const path = join(dir, "derived.json");
      io.writeText(path, "[]\n");
      expect(io.readText(path)).toBe("[]\n");
    });
  });

  test("loadGateApi exposes the real gate's allowlist resolution functions", () => {
    const io = createNodeIo();
    const repoRoot = io.runGit(["rev-parse", "--show-toplevel"]).stdout.trim();
    const api = io.loadGateApi(join(repoRoot, "tests", "coverage-patch-gate.ts"));
    const lcov = api.parseLcovLineHits("SF:x.ts\nDA:1,1\nend_of_record\n");
    expect([...lcov.keys()]).toEqual(["x.ts"]);
    expect(api.findStaleAllowlistEntries([], lcov)).toEqual([]);
    expect(typeof api.parseAllowlist).toBe("function");
    expect(typeof api.resolveAllowlistEntries).toBe("function");
  });
});

describe("runCommand", () => {
  test("an unspawnable command is reported as code -1, never thrown", () => {
    const result = runCommand("definitely-not-a-binary-2933", ["--check"], process.env);
    expect(result.code).toBe(-1);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});

describe("runBunTest", () => {
  // The measured file must live inside the repository: bun emits no lcov at all
  // when nothing under the project root was instrumented (measured 2026-08-13 —
  // a temp-dir-only test file produces an empty coverage dir).
  test("runs the named test files and writes an lcov into the given coverage dir", () => {
    withTempDir((dir) => {
      const io = createNodeIo();
      const repoRoot = io.runGit(["rev-parse", "--show-toplevel"]).stdout.trim();
      const coverageDir = join(dir, "coverage");
      const result = io.runBunTest(
        [join(repoRoot, "tests", "unit", "t2933-coverage-patch-quick.test.ts")],
        coverageDir,
      );
      expect(result.code).toBe(0);
      expect(existsSync(join(coverageDir, "lcov.info"))).toBe(true);
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
      writeText: () => undefined,
      loadGateApi: () => {
        throw new Error("unused");
      },
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
