// covers: function:resyncStateToStageGraph
//
// t500 — plugin re-composition's `resyncOneIntent` (amadeus-lib.ts) must not
// bump `Last Updated` on an intent it is merely row-repairing (#2554).
//
// Mechanism: in-process (the exported seam), fixtures born by spawning the
// real intent-birth against a throwaway project — the same shape as t407.
//
// The defect: after inserting missing Stage Progress rows, `resyncOneIntent`
// unconditionally called `setField(next, "Last Updated", isoTimestamp())`
// before writing the file back. `Last Updated` is read as the intent's real
// last-worked-on time by three call sites (amadeus-orchestrate.ts:439,
// :5667, :5707) and by the mirror's `createIdentity` (amadeus-mirror-
// lifecycle.ts:413) — a background re-sync (e.g. `plugin compose`, which can
// run against every intent in every space) silently overwrote that signal for
// intents the operator never touched. `StageResyncOutcome.inserted` already
// records that rows were repaired; a second, unrelated field mutation is not
// "the work" and must not happen.
//
// Pinned here across three arms:
//   - resynced:     Running intent with a missing row -> rows repaired, but
//                    `Last Updated` is byte-identical to the pre-resync value.
//   - not-running:  Parked intent with a missing row -> outcome "not-running",
//                    state file untouched (byte-identical).
//   - current:      Running intent with no missing rows -> outcome "current",
//                    state file untouched (byte-identical).
//
// Fixture trap (cross-review r1 method memo): `resyncOneIntent` only
// recognizes rows inside the `## Stage Progress` section when the
// `<!-- Checkbox states: ... -->` header comment immediately follows the
// heading (STAGE_PROGRESS_SECTION_RE). A fixture that strips or never has
// that comment line makes every intent report `section-unrecognized`
// instead of the status this test is pinning — `bornProject` here relies on
// the real `intent-birth` template, which ships the header comment, so no
// manual re-injection is needed. Do not hand-edit the header comment away
// while extending this file.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getField, resyncStateToStageGraph, setField } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";

const BUN = process.execPath;

function run(proj: string, tool: string, args: string[]): number {
  const childEnv: Record<string, string | undefined> = { ...process.env };
  delete childEnv.AMADEUS_SCOPE_MAPPING;
  const res = spawnSync(
    BUN,
    [amadeusToolTarget(join(proj, ".claude", "tools", tool)), ...args, "--project-dir", proj],
    { encoding: "utf-8", env: childEnv as Record<string, string>, cwd: proj },
  );
  return res.status ?? -1;
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

function bornProject(): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  expect(run(proj, "amadeus-utility.ts", ["intent-birth", "--scope", "feature"])).toBe(0);
  return proj;
}

/** Delete one stage row — the shape of an intent born before the stage existed. */
function dropRow(proj: string, slug: string): void {
  const before = readState(proj);
  const after = before.replace(new RegExp(`^- \\[[ xSR?-]\\] ${slug} —.*\\n`, "m"), "");
  expect(after).not.toBe(before);
  writeState(proj, after);
}

describe("t500 resyncOneIntent must not touch Last Updated (#2554)", () => {
  test("resynced arm: rows repaired, but Last Updated is preserved byte-for-byte", () => {
    const proj = bornProject();
    try {
      dropRow(proj, "user-stories");
      // Backdate deterministically: `isoTimestamp()` truncates to whole
      // seconds, so a birth-then-resync round trip inside the same wall-clock
      // second would make a real bug (re-stamping "now") indistinguishable
      // from the fix by coincidence. A fixed sentinel far in the past makes
      // any bump to "now" unmistakable regardless of test execution speed.
      const SENTINEL_LAST_UPDATED = "2020-01-01T00:00:00Z";
      writeState(proj, setField(readState(proj), "Last Updated", SENTINEL_LAST_UPDATED));
      const before = readState(proj);
      expect(getField(before, "Last Updated")).toBe(SENTINEL_LAST_UPDATED);

      const outcomes = resyncStateToStageGraph(proj);
      expect(outcomes.map((o) => o.status)).toEqual(["resynced"]);
      expect(outcomes[0].inserted).toEqual(["user-stories"]);

      const after = readState(proj);
      // The row repair happened...
      expect(after).toMatch(/^- \[ \] user-stories — EXECUTE$/m);
      // ...but the real-work timestamp did not move.
      expect(getField(after, "Last Updated")).toBe(SENTINEL_LAST_UPDATED);
      // Full-field assertion, not just the getField projection: the
      // `- **Last Updated**: <value>` line itself must be byte-identical.
      const lastUpdatedLine = (content: string): string | undefined =>
        content.match(/^- \*\*Last Updated\*\*:.*$/m)?.[0];
      expect(lastUpdatedLine(after)).toBe(lastUpdatedLine(before));
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("not-running arm: a Parked intent with a missing row is untouched byte-for-byte", () => {
    const proj = bornProject();
    try {
      dropRow(proj, "user-stories");
      writeState(proj, setField(readState(proj), "Status", "Parked"));
      const before = readState(proj);

      const outcomes = resyncStateToStageGraph(proj);
      expect(outcomes.map((o) => o.status)).toEqual(["not-running"]);
      expect(outcomes[0].inserted).toEqual([]);

      expect(readState(proj)).toBe(before);
    } finally {
      cleanupTestProject(proj);
    }
  });

  test("current arm: no missing rows -> untouched byte-for-byte", () => {
    const proj = bornProject();
    try {
      const before = readState(proj);

      const outcomes = resyncStateToStageGraph(proj);
      expect(outcomes.map((o) => o.status)).toEqual(["current"]);
      expect(outcomes[0].inserted).toEqual([]);

      expect(readState(proj)).toBe(before);
    } finally {
      cleanupTestProject(proj);
    }
  });
});
