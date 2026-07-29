// covers: harness-instrument:coverage-patch-gate
//
// t229 (process boundary) — drives coverage-patch-gate's --check through the
// AMADEUS_PATCH_* env seams against temp fixtures (fs, hence integration /
// medium — size purity keeps the pure-function half in tests/unit). Mirrors
// coverage-project-gate.test.ts. Falling proofs: missing lcov, uncovered
// diff, stale allowlist, unknown base ref all exit non-zero.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, parseAllowlist, runCheck } from "../coverage-patch-gate";

const LCOV = [
  "SF:packages/framework/core/tools/example.ts",
  "DA:10,3",
  "DA:11,0",
  "DA:12,1",
  "end_of_record",
  "SF:packages/framework/core/tools/other.ts",
  "DA:5,0",
  "end_of_record",
].join("\n");

const DIFF = [
  "diff --git a/packages/framework/core/tools/example.ts b/packages/framework/core/tools/example.ts",
  "--- a/packages/framework/core/tools/example.ts",
  "+++ b/packages/framework/core/tools/example.ts",
  "@@ -9,0 +10,3 @@",
  "+const a = 1;",
  "+const b = 2;",
  "+const c = 3;",
].join("\n");

describe("t229 process boundary: --check via AMADEUS_PATCH_* seams", () => {
  const SEAMS = ["AMADEUS_PATCH_LCOV", "AMADEUS_PATCH_DIFF", "AMADEUS_PATCH_BASE_REF", "AMADEUS_PATCH_ALLOWLIST"];
  const saved = new Map(SEAMS.map((k) => [k, process.env[k]]));
  const tmps: string[] = [];
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = gitFixture();
  });

  afterEach(() => {
    for (const k of SEAMS) {
      const v = saved.get(k);
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    for (const d of tmps.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  function fixtureDir(): string {
    const d = mkdtempSync(join(tmpdir(), "patch-gate-"));
    tmps.push(d);
    return d;
  }

  function gitFixture(): string {
    const d = fixtureDir();
    for (const args of [
      ["init"],
      ["config", "user.email", "t229@example.invalid"],
      ["config", "user.name", "t229"],
    ]) {
      const result = spawnSync("git", args, { cwd: d, encoding: "utf8" });
      expect(result.status).toBe(0);
    }
    writeFileSync(join(d, "tracked.ts"), "export const tracked = 1;\n");
    const commit = spawnSync(
      "git",
      ["add", "tracked.ts"],
      { cwd: d, encoding: "utf8" },
    );
    expect(commit.status).toBe(0);
    const committed = spawnSync(
      "git",
      ["commit", "-m", "test: seed fixture"],
      { cwd: d, encoding: "utf8" },
    );
    expect(committed.status).toBe(0);
    return d;
  }

  function setCleanGateInputs(d: string): void {
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    const diffPath = join(d, "pr.diff");
    writeFileSync(diffPath, "");
    process.env.AMADEUS_PATCH_DIFF = diffPath;
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
  }

  function captureCheck(d: string): { result: number; stderr: string; stdout: string } {
    const stderr: string[] = [];
    const stdout: string[] = [];
    const originalError = console.error;
    const originalLog = console.log;
    console.error = (...args: unknown[]) => stderr.push(args.map(String).join(" "));
    console.log = (...args: unknown[]) => stdout.push(args.map(String).join(" "));
    try {
      return { result: runCheck(d), stderr: stderr.join("\n"), stdout: stdout.join("\n") };
    } finally {
      console.error = originalError;
      console.log = originalLog;
    }
  }

  test("missing lcov fails closed (exit 1, never a silent pass)", () => {
    const d = fixtureDir();
    process.env.AMADEUS_PATCH_LCOV = join(d, "does-not-exist.lcov");
    expect(runCheck(repoRoot)).toBe(1);
  });

  test("an unstaged tracked change is rejected before LCOV evaluation", () => {
    const d = gitFixture();
    setCleanGateInputs(fixtureDir());
    writeFileSync(join(d, "tracked.ts"), "export const tracked = 2;\n");

    const result = captureCheck(d);
    expect(result.result).toBe(1);
    expect(result.stderr).toContain("committed diff and LCOV");
    expect(result.stderr).toContain("Commit or stash");
    expect(result.stdout).not.toContain("Patch coverage gate:");
  });

  test("staged and untracked non-ignored changes are rejected", () => {
    const staged = gitFixture();
    setCleanGateInputs(fixtureDir());
    writeFileSync(join(staged, "tracked.ts"), "export const tracked = 2;\n");
    expect(spawnSync("git", ["add", "tracked.ts"], { cwd: staged }).status).toBe(0);
    expect(captureCheck(staged).result).toBe(1);

    const untracked = gitFixture();
    setCleanGateInputs(fixtureDir());
    writeFileSync(join(untracked, "untracked.ts"), "export const untracked = true;\n");
    expect(captureCheck(untracked).result).toBe(1);
  });

  test("ignored-only files do not make an otherwise clean repository dirty", () => {
    const d = gitFixture();
    setCleanGateInputs(fixtureDir());
    writeFileSync(join(d, ".gitignore"), "ignored.log\n");
    expect(spawnSync("git", ["add", ".gitignore"], { cwd: d }).status).toBe(0);
    expect(
      spawnSync("git", ["commit", "-m", "test: ignore fixture output"], { cwd: d }).status,
    ).toBe(0);
    writeFileSync(join(d, "ignored.log"), "generated\n");

    expect(captureCheck(d).result).toBe(0);
  });

  test("a repository-status failure is rejected before LCOV evaluation", () => {
    const d = fixtureDir();
    setCleanGateInputs(fixtureDir());

    const result = captureCheck(d);
    expect(result.result).toBe(1);
    expect(result.stderr).toContain("git status failed");
    expect(result.stdout).not.toContain("Patch coverage gate:");
  });

  test("uncovered added line exits 1; covered diff exits 0 (falling proof at the boundary)", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    const diffPath = join(d, "pr.diff");
    writeFileSync(diffPath, DIFF); // contains DA:11,0 violation
    process.env.AMADEUS_PATCH_DIFF = diffPath;
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
    expect(runCheck(repoRoot)).toBe(1);

    writeFileSync(diffPath, ["+++ b/packages/framework/core/tools/example.ts", "@@ -9,0 +10,1 @@", "+const a = 1;"].join("\n"));
    expect(runCheck(repoRoot)).toBe(0);
  });

  test("stale allowlist entry fails the run loudly", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    const diffPath = join(d, "pr.diff");
    writeFileSync(diffPath, "");
    const alPath = join(d, "allowlist.json");
    writeFileSync(alPath, JSON.stringify([{ file: "gone.ts", lines: "1", reason: "stale" }]));
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    process.env.AMADEUS_PATCH_DIFF = diffPath;
    process.env.AMADEUS_PATCH_ALLOWLIST = alPath;
    expect(runCheck(repoRoot)).toBe(1);
  });

  test("missing diff file fails closed", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    process.env.AMADEUS_PATCH_DIFF = join(d, "missing.diff");
    expect(runCheck(repoRoot)).toBe(1);
  });

  test("git branch: HEAD...HEAD yields an empty diff and passes (covers the spawn wiring)", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    delete process.env.AMADEUS_PATCH_DIFF;
    process.env.AMADEUS_PATCH_BASE_REF = "HEAD";
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
    expect(runCheck(repoRoot)).toBe(0);
  });

  test("git branch: unknown base ref fails closed", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    delete process.env.AMADEUS_PATCH_DIFF;
    process.env.AMADEUS_PATCH_BASE_REF = "refs/no-such-ref-for-t229";
    expect(runCheck(repoRoot)).toBe(1);
  });

  test("main: usage error exits 2, --check delegates to runCheck", () => {
    expect(main([])).toBe(2);
    expect(main(["--bogus"])).toBe(2);
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    const diffPath = join(d, "empty.diff");
    writeFileSync(diffPath, "");
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    process.env.AMADEUS_PATCH_DIFF = diffPath;
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
    expect(main(["--check"], repoRoot)).toBe(0);
  });

  test("allowlist that is not an array throws", () => {
    expect(() => parseAllowlist(JSON.stringify({ file: "x" }))).toThrow(/must be a JSON array/);
  });
});
