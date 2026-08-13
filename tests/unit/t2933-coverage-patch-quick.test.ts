// covers: harness-instrument:coverage-patch-quick
//
// t2933 — the coverage-patch-quick advisory CLI (#2933).
//
// Drives the plugin's exported pure functions and its orchestration through a
// fully injected IO seam: no filesystem, no spawn, no git. The process
// boundary (node IO seam, spawn refusals) lives in
// tests/integration/t2933-coverage-patch-quick-cli.integration.test.ts.

import { describe, expect, test } from "bun:test";
import {
  type CommandResult,
  extractExportedSymbols,
  parseChangedPaths,
  parseRegistryUnits,
  type QuickIo,
  reverseMapTests,
  runQuickCheck,
} from "../../plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts";

const REGISTRY = JSON.stringify({
  units: [
    {
      unitClass: "subcommand",
      unitId: "amadeus-state set",
      coveredBy: [{ file: "tests/unit/t10-state.test.ts", mechanism: "cli" }],
    },
    {
      unitClass: "function",
      unitId: "function:renderBanner",
      coveredBy: [{ file: "tests/unit/t11-banner.test.ts", mechanism: "none" }],
    },
    {
      unitClass: "function",
      unitId: "function:unrelated",
      coveredBy: [{ file: "tests/unit/t12-other.test.ts", mechanism: "none" }],
    },
    { unitClass: "audit", unitId: "AUDIT_MERGED", coveredBy: [] },
  ],
});

describe("parseChangedPaths", () => {
  test("keeps TypeScript sources and drops everything else", () => {
    const stdout = [
      "plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts",
      "docs/reference/09-testing.md",
      "tests/unit/t2933-coverage-patch-quick.test.ts",
      "",
      "amadeus/config.json",
    ].join("\n");
    expect(parseChangedPaths(stdout)).toEqual([
      "plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts",
      "tests/unit/t2933-coverage-patch-quick.test.ts",
    ]);
  });

  test("empty diff output yields no paths", () => {
    expect(parseChangedPaths("\n")).toEqual([]);
  });
});

describe("extractExportedSymbols", () => {
  test("collects exported function, const, and class names", () => {
    const source = [
      "export function renderBanner(): string { return ''; }",
      "export async function loadThing() {}",
      "export const LIMIT = 3;",
      "export class Widget {}",
      "function notExported() {}",
    ].join("\n");
    expect([...extractExportedSymbols(source)].sort()).toEqual([
      "LIMIT",
      "Widget",
      "loadThing",
      "renderBanner",
    ]);
  });
});

describe("reverseMapTests", () => {
  const units = parseRegistryUnits(REGISTRY);

  test("maps a changed source to the tests claiming its units, by path token and by exported symbol", () => {
    const mapping = reverseMapTests(
      ["packages/framework/core/tools/amadeus-state.ts", "plugins/x/tools/banner.ts"],
      units,
      new Map([["plugins/x/tools/banner.ts", ["renderBanner"]]]),
    );
    expect(mapping.mappings).toEqual([
      {
        file: "packages/framework/core/tools/amadeus-state.ts",
        tests: ["tests/unit/t10-state.test.ts"],
      },
      { file: "plugins/x/tools/banner.ts", tests: ["tests/unit/t11-banner.test.ts"] },
    ]);
    expect(mapping.unmapped).toEqual([]);
    expect(mapping.testFiles).toEqual([
      "tests/unit/t10-state.test.ts",
      "tests/unit/t11-banner.test.ts",
    ]);
  });

  test("reports a changed source with no claiming test as unmapped", () => {
    const mapping = reverseMapTests(["packages/framework/core/tools/orphan.ts"], units, new Map());
    expect(mapping.mappings).toEqual([
      { file: "packages/framework/core/tools/orphan.ts", tests: [] },
    ]);
    expect(mapping.unmapped).toEqual(["packages/framework/core/tools/orphan.ts"]);
    expect(mapping.testFiles).toEqual([]);
  });

  test("a changed test file selects itself", () => {
    const mapping = reverseMapTests(["tests/unit/t99-new.test.ts"], units, new Map());
    expect(mapping.unmapped).toEqual([]);
    expect(mapping.testFiles).toEqual(["tests/unit/t99-new.test.ts"]);
  });

  test("a malformed registry is a loud parse failure", () => {
    expect(() => parseRegistryUnits("{}")).toThrow(/units/);
  });
});

// ---------------------------------------------------------------------------
// Orchestration. Every effect is injected; the double records what the CLI
// asked for so the test can assert on the request, not just the verdict.
// ---------------------------------------------------------------------------

const ok = (stdout: string): CommandResult => ({ code: 0, stdout, stderr: "" });

interface Recorder {
  readonly io: QuickIo;
  readonly out: string[];
  readonly err: string[];
  readonly bunTestCalls: { files: readonly string[]; coverageDir: string }[];
  readonly gateCalls: { gatePath: string; lcovPath: string }[];
}

function makeIo(overrides: Partial<QuickIo> = {}, files: Record<string, string> = {}): Recorder {
  const out: string[] = [];
  const err: string[] = [];
  const bunTestCalls: { files: readonly string[]; coverageDir: string }[] = [];
  const gateCalls: { gatePath: string; lcovPath: string }[] = [];
  const present: Record<string, string> = {
    "/repo/tests/coverage-patch-gate.ts": "// gate",
    "/repo/tests/.coverage-registry.json": REGISTRY,
    "/scratch/lcov.info": "SF:x\nend_of_record\n",
    ...files,
  };
  const base: QuickIo = {
    env: {},
    runGit: (args) => {
      if (args[0] === "rev-parse") return ok("/repo\n");
      return ok("packages/framework/core/tools/amadeus-state.ts\n");
    },
    runBunTest: (testFiles, coverageDir) => {
      bunTestCalls.push({ files: testFiles, coverageDir });
      return ok("1 pass");
    },
    runGate: (gatePath, lcovPath) => {
      gateCalls.push({ gatePath, lcovPath });
      return {
        code: 0,
        stdout: "Patch coverage gate: PASS\nmeasured added lines: 4, covered: 4, allowlisted: 0, uncovered: 0",
        stderr: "",
      };
    },
    exists: (path) => path in present,
    readText: (path) => present[path] ?? "",
    makeScratchDir: () => "/scratch",
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  return { io: { ...base, ...overrides }, out, err, bunTestCalls, gateCalls };
}

describe("runQuickCheck", () => {
  test("a missing patch gate is a loud non-zero failure", () => {
    const rec = makeIo({ exists: (path) => path !== "/repo/tests/coverage-patch-gate.ts" });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("tests/coverage-patch-gate.ts");
  });

  test("outside a git repository the run refuses loudly", () => {
    const rec = makeIo({
      runGit: () => ({ code: 128, stdout: "", stderr: "fatal: not a git repository" }),
    });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("not a git repository");
  });

  test("a failing git diff refuses loudly", () => {
    const rec = makeIo({
      runGit: (args) =>
        args[0] === "rev-parse"
          ? ok("/repo\n")
          : { code: 128, stdout: "", stderr: "fatal: bad revision 'origin/main'" },
    });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("git diff --name-only origin/main...HEAD failed");
  });

  test("no changed TypeScript files is a clean advisory no-op", () => {
    const rec = makeIo({
      runGit: (args) => (args[0] === "rev-parse" ? ok("/repo\n") : ok("docs/guide/x.md\n")),
    });
    expect(runQuickCheck(rec.io)).toBe(0);
    expect(rec.out.join("\n")).toContain("nothing to approximate");
    expect(rec.out.join("\n")).toContain("ADVISORY APPROXIMATION");
    expect(rec.bunTestCalls).toEqual([]);
  });

  test("AMADEUS_PATCH_BASE_REF overrides the diff base", () => {
    const seen: string[][] = [];
    const rec = makeIo({
      env: { AMADEUS_PATCH_BASE_REF: "origin/release" },
      runGit: (args) => {
        seen.push([...args]);
        return args[0] === "rev-parse" ? ok("/repo\n") : ok("");
      },
    });
    expect(runQuickCheck(rec.io)).toBe(0);
    expect(seen).toContainEqual(["diff", "--name-only", "origin/release...HEAD"]);
  });

  test("a missing coverage registry refuses loudly", () => {
    const rec = makeIo({ exists: (path) => path !== "/repo/tests/.coverage-registry.json" });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("tests/.coverage-registry.json");
  });

  test("an unreadable coverage registry refuses loudly", () => {
    const rec = makeIo({ readText: () => "{}" });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("unreadable coverage registry");
  });

  test("a changed file with no mapped test is reported as UNMAPPED", () => {
    const rec = makeIo({
      runGit: (args) =>
        args[0] === "rev-parse" ? ok("/repo\n") : ok("packages/framework/core/tools/orphan.ts\n"),
    });
    expect(runQuickCheck(rec.io)).toBe(0);
    const printed = rec.out.join("\n");
    expect(printed).toContain("UNMAPPED packages/framework/core/tools/orphan.ts");
    expect(printed).toContain("will read uncovered in this approximation");
    expect(rec.bunTestCalls).toEqual([]);
  });

  test("mapped tests are handed to bun test in an isolated scratch coverage dir", () => {
    const rec = makeIo();
    expect(runQuickCheck(rec.io)).toBe(0);
    expect(rec.bunTestCalls).toEqual([
      { files: ["tests/unit/t10-state.test.ts"], coverageDir: "/scratch" },
    ]);
    expect(rec.gateCalls).toEqual([
      { gatePath: "/repo/tests/coverage-patch-gate.ts", lcovPath: "/scratch/lcov.info" },
    ]);
    expect(rec.out.join("\n")).toContain("Patch coverage gate: PASS");
    expect(rec.out.join("\n")).toContain("ADVISORY APPROXIMATION");
  });

  test("a bun test spawn failure refuses loudly", () => {
    const rec = makeIo({
      runBunTest: () => ({ code: -1, stdout: "", stderr: "spawn bun ENOENT" }),
    });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("could not run bun test");
    expect(rec.gateCalls).toEqual([]);
  });

  test("a run that produced no lcov refuses loudly", () => {
    const rec = makeIo({ exists: (path) => path !== "/scratch/lcov.info" });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("produced no lcov");
    expect(rec.gateCalls).toEqual([]);
  });

  test("failing selected tests are announced but do not stop the approximation", () => {
    const rec = makeIo({
      runBunTest: () => ({ code: 1, stdout: "1 fail", stderr: "" }),
    });
    expect(runQuickCheck(rec.io)).toBe(0);
    expect(rec.out.join("\n")).toContain("did not all pass");
    expect(rec.gateCalls.length).toBe(1);
  });

  test("a red gate verdict is shown verbatim and still exits advisory zero", () => {
    const rec = makeIo({
      runGate: () => ({
        code: 1,
        stdout:
          "Patch coverage gate: FAIL\nmeasured added lines: 10, covered: 8, allowlisted: 0, uncovered: 2\n  UNCOVERED plugins/x/tools/banner.ts:42",
        stderr: "",
      }),
    });
    expect(runQuickCheck(rec.io)).toBe(0);
    const printed = rec.out.join("\n");
    expect(printed).toContain("Patch coverage gate: FAIL");
    expect(printed).toContain("UNCOVERED plugins/x/tools/banner.ts:42");
    expect(printed).toContain("is canonical");
  });

  test("the gate's dirty-tree refusal is surfaced as a non-zero, committed-slices-only failure", () => {
    const rec = makeIo({
      runGate: () => ({
        code: 1,
        stdout: "",
        stderr:
          "coverage-patch-gate: working tree is dirty; cannot verify that the committed diff and LCOV describe the same source snapshot.",
      }),
    });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    const printed = [...rec.out, ...rec.err].join("\n");
    expect(printed).toContain("working tree is dirty");
    expect(printed).toContain("committed slices only");
  });

  test("a gate that returns no verdict at all refuses loudly", () => {
    const rec = makeIo({
      runGate: () => ({ code: 2, stdout: "", stderr: "Usage: bun tests/coverage-patch-gate.ts" }),
    });
    expect(runQuickCheck(rec.io)).not.toBe(0);
    expect(rec.err.join("\n")).toContain("returned no verdict");
    expect(rec.err.join("\n")).not.toContain("committed slices only");
  });
});
