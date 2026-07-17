// covers: harness-instrument:coverage-patch-gate
//
// t229 (process boundary) — drives coverage-patch-gate's --check through the
// AMADEUS_PATCH_* env seams against temp fixtures (fs, hence integration /
// medium — size purity keeps the pure-function half in tests/unit). Mirrors
// coverage-project-gate.test.ts. Falling proofs: missing lcov, uncovered
// diff, stale allowlist, unknown base ref all exit non-zero.

import { afterEach, describe, expect, test } from "bun:test";
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

  test("missing lcov fails closed (exit 1, never a silent pass)", () => {
    const d = fixtureDir();
    process.env.AMADEUS_PATCH_LCOV = join(d, "does-not-exist.lcov");
    expect(runCheck()).toBe(1);
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
    expect(runCheck()).toBe(1);

    writeFileSync(diffPath, ["+++ b/packages/framework/core/tools/example.ts", "@@ -9,0 +10,1 @@", "+const a = 1;"].join("\n"));
    expect(runCheck()).toBe(0);
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
    expect(runCheck()).toBe(1);
  });

  test("missing diff file fails closed", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    process.env.AMADEUS_PATCH_DIFF = join(d, "missing.diff");
    expect(runCheck()).toBe(1);
  });

  test("git branch: HEAD...HEAD yields an empty diff and passes (covers the spawn wiring)", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    delete process.env.AMADEUS_PATCH_DIFF;
    process.env.AMADEUS_PATCH_BASE_REF = "HEAD";
    process.env.AMADEUS_PATCH_ALLOWLIST = join(d, "no-allowlist.json");
    expect(runCheck()).toBe(0);
  });

  test("git branch: unknown base ref fails closed", () => {
    const d = fixtureDir();
    const lcovPath = join(d, "lcov.info");
    writeFileSync(lcovPath, LCOV);
    process.env.AMADEUS_PATCH_LCOV = lcovPath;
    delete process.env.AMADEUS_PATCH_DIFF;
    process.env.AMADEUS_PATCH_BASE_REF = "refs/no-such-ref-for-t229";
    expect(runCheck()).toBe(1);
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
    expect(main(["--check"])).toBe(0);
  });

  test("allowlist that is not an array throws", () => {
    expect(() => parseAllowlist(JSON.stringify({ file: "x" }))).toThrow(/must be a JSON array/);
  });
});
