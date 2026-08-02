// covers: function:resyncStateToStageGraph, subcommand:amadeus-plugin:compose
//
// t410 — `hostStageGraph` validates the fields the re-sync path actually
// CONSUMES, not just `slug` (#1992).
//
// The defect: the #1962 guard checked only `typeof e.slug === "string"` per
// entry, then blessed the array with `parsed as StageEntry[]`. But the re-sync
// path consumes three fields per entry:
//   - `slug`   (row identity, foreign-row detection, plan lookup);
//   - `phase`  (renderStageProgressSection buckets rows by `stage.phase` —
//               an entry with no phase lands in an undefined bucket and is
//               silently dropped from the rendered section);
//   - `number` (rebuildDerivedPlanFields writes `s.number` into the
//               Stages to Execute / Stages to Skip fields — an entry with no
//               number writes the literal string "undefined" into the state).
// A graph whose entries carry slugs but lack `phase`/`number` therefore passed
// as `kind:"graph"` and drove a DESTRUCTIVE rewrite of the state file. An
// empty array `[]` also vacuously passed `every(...)` — but a successfully
// recompiled host graph is never legitimately empty; treating it as valid
// silently classifies every intent as foreign-rows.
//
// Pinned here: a graph missing any consumed field, and the empty array, are
// `kind:"invalid"` — re-sync skipped with the #1964 stderr warning, state file
// byte-identical. The happy path (all consumed fields present) stays with
// t406, which must remain green against this change.
//
// Mechanism: in-process (the exported default deps seam), like t406/t394, so
// lcov sees the guard branches.

import { afterAll, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultPluginCliDeps } from "../../dist/claude/.claude/tools/amadeus-plugin.ts";
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
// user-stories row, so the re-sync has an insertion to attempt — the
// precondition under which the pre-fix code reached the destructive write.
const proj = bornProject();
dropRow(proj, "user-stories");
const validGraph = JSON.parse(readFileSync(hostGraphPathOf(proj), "utf-8")) as Record<
  string,
  unknown
>[];
const host = join(proj, ".claude");

// Derive degraded payloads from the REAL compiled graph, so the only defect
// under test is the missing consumed field — slugs, ordering and every other
// field stay authentic.
function strip(fields: string[]): string {
  return JSON.stringify(
    validGraph.map((e) => {
      const copy = { ...e };
      for (const f of fields) delete copy[f];
      return copy;
    }),
  );
}

const DEGRADED_PAYLOADS: readonly [label: string, payload: string][] = [
  ["entries missing phase and number (slug-only)", strip(["phase", "number"])],
  ["entries missing phase", strip(["phase"])],
  ["entries missing number", strip(["number"])],
  ["empty array []", "[]"],
];

describe("t410 read boundary: host graph missing consumed fields is invalid", () => {
  for (const [label, payload] of DEGRADED_PAYLOADS) {
    test(`${label}: re-sync skips with a warning, state byte-identical`, () => {
      writeFileSync(hostGraphPathOf(proj), payload, "utf-8");
      const before = readState(proj);
      const errSpy = spyOn(console, "error").mockImplementation(() => {});
      try {
        let outcomes: unknown;
        expect(() => {
          outcomes = defaultPluginCliDeps().resyncIntentStates?.(host);
        }).not.toThrow();
        // Invalid graph => the re-sync examines NO intent at all.
        expect(outcomes).toEqual([]);
        const warnings = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
        expect(warnings).toContain("stage-graph.json");
        expect(warnings).toContain("re-sync skipped");
      } finally {
        errSpy.mockRestore();
      }
      // The destructive face (#1992): pre-fix, a slug-only graph rewrote the
      // Stage Progress section with ZERO checkbox rows, and a number-less
      // graph wrote the literal "undefined" into Stages to Execute. Post-fix
      // nothing may be written at all.
      expect(readState(proj)).toBe(before);
      expect(readState(proj)).not.toContain("undefined");
    });
  }

  test("empty array [] is named as such in the warning", () => {
    writeFileSync(hostGraphPathOf(proj), "[]", "utf-8");
    const errSpy = spyOn(console, "error").mockImplementation(() => {});
    try {
      defaultPluginCliDeps().resyncIntentStates?.(host);
      const warnings = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(warnings).toContain("empty");
    } finally {
      errSpy.mockRestore();
    }
  });
});
