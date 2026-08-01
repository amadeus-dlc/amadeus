// covers: function:resyncStateToStageGraph, subcommand:amadeus-plugin:compose
//
// t406 — the post-compose state re-sync validates the host stage-graph.json at
// the read boundary (#1962).
//
// The defect: `hostStageGraph` read the host's compiled graph with a bare
// `JSON.parse(...) as StageEntry[]` — no try/catch, no Array.isArray. Three
// failure modes, none of them acceptable AFTER the plugin apply + recompile +
// runner generation already committed:
//   (a) malformed JSON  -> raw uncaught crash out of `compose` (no structured
//                          failure, no safe skip);
//   (b) `{}` non-array  -> `graph.map is not a function` deep inside the
//                          re-sync;
//   (c) `null`          -> flows through `opts?.graph ?? loadStageGraph()`'s
//                          nullish fallback and SILENTLY re-syncs against the
//                          cached graph — the exact wrong-graph read the
//                          function's own comment says it exists to avoid.
//
// Pinned here: on ANY invalid content the re-sync is skipped (no crash), the
// state file is left byte-identical (no cached-graph substitution), and a
// visible stderr warning names the file. An ABSENT file keeps its documented
// fallback to the cached loader; a valid array keeps the happy path.
//
// Mechanism: in-process (the exported default deps seam + handlePluginCli),
// like t394, so lcov sees the guard branches.

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
const writeState = (proj: string, s: string): void => writeFileSync(statePathOf(proj), s, "utf-8");
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

/** Delete one stage row — the shape of an intent born before the stage existed. */
function dropRow(proj: string, slug: string): void {
  const before = readState(proj);
  const after = before.replace(new RegExp(`^- \\[[ xSR?-]\\] ${slug} —.*\\n`, "m"), "");
  expect(after).not.toBe(before);
  writeState(proj, after);
}

// One shared fixture: a born project whose RUNNING intent lacks the
// user-stories row. If ANY invalid payload fell through to the cached graph,
// the re-sync would insert that row — so byte-identical state IS the proof
// that no cached-graph substitution happened.
const proj = bornProject();
dropRow(proj, "user-stories");
const validGraphBytes = readFileSync(hostGraphPathOf(proj), "utf-8");
const host = join(proj, ".claude");

const INVALID_PAYLOADS: readonly [label: string, payload: string][] = [
  ["malformed JSON", "{{{ not json"],
  ["valid-but-non-array JSON ({})", "{}"],
  ["null", "null"],
  ["array of non-stage entries", '[{"nope":1}]'],
];

describe("t406 read boundary: invalid host stage-graph.json", () => {
  for (const [label, payload] of INVALID_PAYLOADS) {
    test(`${label}: re-sync skips without crash, without cached-graph substitution, with a warning`, () => {
      writeFileSync(hostGraphPathOf(proj), payload, "utf-8");
      const before = readState(proj);
      const errSpy = spyOn(console, "error").mockImplementation(() => {});
      try {
        let outcomes: unknown;
        expect(() => {
          outcomes = defaultPluginCliDeps().resyncIntentStates?.(host);
        }).not.toThrow();
        expect(outcomes).toEqual([]);
        const warnings = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
        expect(warnings).toContain("stage-graph.json");
        expect(warnings).toContain("re-sync skipped");
      } finally {
        errSpy.mockRestore();
      }
      // No row inserted = the cached graph was NOT silently substituted.
      expect(readState(proj)).toBe(before);
    });
  }

  test("compose survives a corrupt host graph: exit 0, warning, state untouched", () => {
    writeFileSync(hostGraphPathOf(proj), "null", "utf-8");
    const before = readState(proj);
    const lines: string[] = [];
    const errSpy = spyOn(console, "error").mockImplementation(() => {});
    try {
      // recompile/generateRunners are stubbed (t394 idiom) so the real spawn
      // does not rewrite the corrupt fixture; the re-sync dep is the REAL one.
      const code = handlePluginCli(["compose", "--project-root", host], {
        ...defaultPluginCliDeps(),
        discoverPlugins: () => [],
        recompile: () => true,
        generateRunners: () => true,
        out: (l) => lines.push(l),
        err: (l) => lines.push(l),
      });
      expect(code).toBe(0);
      const warnings = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(warnings).toContain("stage-graph.json");
      expect(warnings).toContain("re-sync skipped");
    } finally {
      errSpy.mockRestore();
    }
    expect(lines.join("\n")).toContain("composed 0 plugin(s), recompiled");
    expect(readState(proj)).toBe(before);
  });
});

describe("t406 happy path: a valid host graph re-syncs exactly as before", () => {
  test("the restored valid graph inserts the dropped row", () => {
    writeFileSync(hostGraphPathOf(proj), validGraphBytes, "utf-8");
    const outcomes = defaultPluginCliDeps().resyncIntentStates?.(host) ?? [];
    expect(outcomes.filter((o) => o.status === "resynced").map((o) => o.inserted)).toEqual([
      ["user-stories"],
    ]);
    expect(readState(proj)).toMatch(/^- \[ \] user-stories — EXECUTE$/m);
  });
});
