// covers: function:resyncStateToStageGraph
//
// t407 — the post-compose state re-sync detects a silent no-op of
// `replaceStageProgressSection` instead of reporting a green `resynced` (#1963).
//
// Mechanism: in-process (the exported seam), fixtures born by spawning the real
// intent-birth against a throwaway project — the same shape as t394.
//
// The defect: `replaceStageProgressSection` is a bare String.replace — when the
// section regex does not match (the `<!-- ... -->` comment line after
// `## Stage Progress` missing after a hand edit, or Stage Progress being the
// LAST `##` section so the lookahead fails), the input comes back unchanged
// with no signal. resyncOneIntent then still rebuilt the derived counters,
// bumped Last Updated, wrote the file, and returned `resynced` — no checkbox
// row inserted, counters skewed, and the engine loop this re-sync exists to
// close (#1849) stays open under a green compose report.
//
// Pinned here: a non-matching section must yield the loud
// `section-unrecognized` status and must NOT write the state file at all.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resyncStateToStageGraph } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  defaultPluginCliDeps,
  handlePluginCli,
} from "../../dist/claude/.claude/tools/amadeus-plugin.ts";
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

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function bornProject(): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  tempDirs.push(proj);
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

/** Remove the `<!-- Checkbox states: ... -->` line — the hand-edit drift shape. */
function dropHeaderComment(proj: string): void {
  const before = readState(proj);
  const after = before.replace(/^## Stage Progress\n<!-- [^\n]* -->\n/m, "## Stage Progress\n");
  expect(after).not.toBe(before);
  writeState(proj, after);
}

/** Move the whole Stage Progress section to the END of the file — the section
 * lookahead `(?=\n## ...)` requires a FOLLOWING heading, so a trailing section
 * never matches. */
function moveStageProgressLast(proj: string): void {
  const before = readState(proj);
  const m = /## Stage Progress\n[\s\S]*?(?=\n## )/.exec(before);
  expect(m).not.toBeNull();
  const section = (m as RegExpExecArray)[0];
  const after = `${before.replace(section, "").replace(/\n{3,}/g, "\n\n").trimEnd()}\n\n${section.trimEnd()}\n`;
  writeState(proj, after);
}

describe("t407 silent no-op detection: a non-matching Stage Progress section", () => {
  test("missing header comment line -> section-unrecognized, state file untouched", () => {
    const proj = bornProject();
    dropRow(proj, "user-stories");
    dropHeaderComment(proj);
    const before = readState(proj);

    const outcomes = resyncStateToStageGraph(proj);
    expect(outcomes.map((o) => o.status)).toEqual(["section-unrecognized"]);
    // Loud, not green: nothing was inserted, so nothing may claim to be.
    expect(outcomes[0].inserted).toEqual([]);
    // No write at all: counters and Last Updated must not move without rows.
    expect(readState(proj)).toBe(before);
    expect(readState(proj)).not.toMatch(/^- \[ \] user-stories — EXECUTE$/m);
  });

  test("Stage Progress as the last section -> section-unrecognized, state file untouched", () => {
    const proj = bornProject();
    dropRow(proj, "user-stories");
    moveStageProgressLast(proj);
    const before = readState(proj);

    const outcomes = resyncStateToStageGraph(proj);
    expect(outcomes.map((o) => o.status)).toEqual(["section-unrecognized"]);
    expect(readState(proj)).toBe(before);
  });

  test("happy path is unchanged: a well-formed section still resyncs with real rows", () => {
    const proj = bornProject();
    dropRow(proj, "user-stories");

    const outcomes = resyncStateToStageGraph(proj);
    const resynced = outcomes.filter((o) => o.status === "resynced");
    expect(resynced).toHaveLength(1);
    expect(resynced[0].inserted).toEqual(["user-stories"]);
    // The verification is grounded in the rewritten content: the row exists.
    expect(readState(proj)).toMatch(/^- \[ \] user-stories — EXECUTE$/m);
  });
});

describe("t407 compose rendering: a failed re-sync is loud, not swallowed", () => {
  const FAILED_OUTCOME = {
    space: "default",
    intent: "demo-0badcafe",
    status: "section-unrecognized" as const,
    inserted: [],
  };

  test("compose renders the failure on stderr and exits 1", () => {
    const host = mkdtempSync(join(tmpdir(), "amadeus-t407-"));
    const errs: string[] = [];
    const code = handlePluginCli(["compose", "--project-root", host], {
      ...defaultPluginCliDeps(),
      discoverPlugins: () => [],
      recompile: () => true,
      generateRunners: () => true,
      resyncIntentStates: () => [FAILED_OUTCOME],
      out: () => {},
      err: (l) => errs.push(l),
    });
    expect(code).toBe(1);
    expect(errs.join("\n")).toContain("state re-sync FAILED for default/demo-0badcafe");
    rmSync(host, { recursive: true, force: true });
  });

  test("compose --all-harnesses reports the tree as a failure and exits 1", () => {
    const host = mkdtempSync(join(tmpdir(), "amadeus-t407-all-"));
    const errs: string[] = [];
    const code = handlePluginCli(["compose", "--all-harnesses", "--project-root", host], {
      ...defaultPluginCliDeps(),
      listHarnessTrees: () => [host],
      listPluginSourceDirs: () => [],
      discoverPlugins: () => [],
      recompile: () => true,
      generateRunners: () => true,
      resyncIntentStates: () => [FAILED_OUTCOME],
      out: () => {},
      err: (l) => errs.push(l),
    });
    expect(code).toBe(1);
    expect(errs.join("\n")).toContain("state re-sync failed for default/demo-0badcafe");
    rmSync(host, { recursive: true, force: true });
  });
});
