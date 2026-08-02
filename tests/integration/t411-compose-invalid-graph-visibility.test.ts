// covers: function:resyncStateToStageGraph, subcommand:amadeus-plugin:compose
//
// t411 — an invalid host stage-graph.json is VISIBLE in the compose result
// (#1993), not buried in a success report.
//
// The defect: the invalid-graph path in `resyncIntentStates` returned `[]`,
// indistinguishable from "nothing to resync", so:
//   (a) single `compose` printed `composed N plugin(s)` and exited 0 with a
//       corrupt graph on disk — the #1849 next/report deadlock re-introduced
//       with a green exit code;
//   (b) `compose --all-harnesses` counted the corrupt tree as succeeded and
//       reported all-up-to-date, exit 0;
//   (c) the warning was a raw `console.error`, bypassing the injected `err`
//       seam (`deps.err`), so embedder log capture never saw it.
//
// Pinned here, aligned with #1970's `resyncFailed` face: the resync dep
// returns a discriminated outcome whose invalid-graph case flows into the
// composed result (`resyncSkipped`), rendered on stderr THROUGH `deps.err`,
// exit 1; `--all-harnesses` counts the tree in `failures`, not `succeeded`.
//
// Mechanism: in-process (the exported default deps seam + handlePluginCli),
// like t406/t410/t394, so lcov sees the new branches.

import { afterAll, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  defaultPluginCliDeps,
  handlePluginCli,
} from "../../dist/claude/.claude/tools/amadeus-plugin.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";

const BUN = process.execPath;

function run(proj: string, tool: string, args: string[]): { status: number; out: string } {
  const childEnv: Record<string, string | undefined> = { ...process.env };
  delete childEnv.AMADEUS_SCOPE_MAPPING;
  const res = spawnSync(
    BUN,
    [amadeusToolTarget(join(proj, ".claude", "tools", tool)), ...args, "--project-dir", proj],
    { encoding: "utf-8", env: childEnv as Record<string, string>, cwd: proj },
  );
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function recordDirOf(proj: string): string {
  const space = readFileSync(join(proj, "amadeus", "active-space"), "utf-8").trim() || "default";
  const intentsDir = join(proj, "amadeus", "spaces", space, "intents");
  const rec = readFileSync(join(intentsDir, "active-intent"), "utf-8").trim();
  return join(intentsDir, rec);
}
const statePathOf = (proj: string): string => join(recordDirOf(proj), "amadeus-state.md");
const readState = (proj: string): string => readFileSync(statePathOf(proj), "utf-8");
const hostGraphPathOf = (proj: string): string =>
  join(proj, ".claude", "tools", "data", "stage-graph.json");

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function bornProject(): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  tempDirs.push(proj);
  expect(run(proj, "amadeus-utility.ts", ["intent-birth", "--scope", "feature"]).status).toBe(0);
  return proj;
}

// One shared fixture (t406 idiom): a born project whose host graph gets
// corrupted per test. recompile/generateRunners are stubbed so the real spawn
// does not rewrite the corrupt fixture; the re-sync dep is the REAL one.
const proj = bornProject();
const validGraphBytes = readFileSync(hostGraphPathOf(proj), "utf-8");
const host = join(proj, ".claude");

function stubbedDeps(lines: { out: string[]; err: string[] }) {
  return {
    ...defaultPluginCliDeps(),
    discoverPlugins: () => [],
    recompile: () => true,
    generateRunners: () => true,
    out: (l: string) => lines.out.push(l),
    err: (l: string) => lines.err.push(l),
  };
}

describe("t411 invalid host graph is visible in the compose result (#1993)", () => {
  test("single compose: corrupt graph exits 1 with a FAILED/skipped line on the err seam", () => {
    writeFileSync(hostGraphPathOf(proj), "null", "utf-8");
    const before = readState(proj);
    const lines = { out: [] as string[], err: [] as string[] };
    const code = handlePluginCli(["compose", "--project-root", host], stubbedDeps(lines));
    // Pre-fix: exit 0 + `composed 0 plugin(s)` success with zero failure surface.
    expect(code).toBe(1);
    const errText = lines.err.join("\n");
    expect(errText).toContain("stage-graph.json");
    expect(errText).toContain("re-sync skipped");
    // The apply already committed — state stays untouched (t406 invariant).
    expect(readState(proj)).toBe(before);
  });

  test("--all-harnesses: the corrupt tree is counted in failures, not succeeded", () => {
    writeFileSync(hostGraphPathOf(proj), "{}", "utf-8");
    const lines = { out: [] as string[], err: [] as string[] };
    const code = handlePluginCli(
      ["compose", "--all-harnesses", "--project-root", host],
      stubbedDeps(lines),
    );
    // Pre-fix: `1/1 harness tree(s) up to date`, exit 0.
    expect(code).toBe(1);
    expect(lines.out.join("\n")).toContain("0/1 harness tree(s) up to date");
    const errText = lines.err.join("\n");
    expect(errText).toContain("stage-graph.json");
    expect(errText).toContain("invalid");
  });

  test("the warning flows through the injected err seam, never raw console.error", () => {
    writeFileSync(hostGraphPathOf(proj), "{{{ not json", "utf-8");
    const lines = { out: [] as string[], err: [] as string[] };
    const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
    try {
      handlePluginCli(["compose", "--project-root", host], stubbedDeps(lines));
      // Pre-fix: the dep printed via console.error and lines.err stayed empty.
      const consoleText = consoleSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(consoleText).not.toContain("re-sync skipped");
      expect(lines.err.join("\n")).toContain("re-sync skipped");
    } finally {
      consoleSpy.mockRestore();
    }
  });

  test("green paths unchanged: a valid graph still composes with exit 0", () => {
    writeFileSync(hostGraphPathOf(proj), validGraphBytes, "utf-8");
    const lines = { out: [] as string[], err: [] as string[] };
    const code = handlePluginCli(["compose", "--project-root", host], stubbedDeps(lines));
    expect(code).toBe(0);
    expect(lines.out.join("\n")).toContain("composed 0 plugin(s), recompiled");
    expect(lines.err.join("\n")).not.toContain("re-sync skipped");
  });
});
