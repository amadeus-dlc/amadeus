// covers: function:resyncStateToStageGraph, subcommand:amadeus-utility:recompose
//
// t394 — composing a plugin re-syncs a RUNNING intent's Stage Progress with the
// host graph (#1849).
//
// Mechanism: mixed. The re-sync itself is driven in-process (the exported
// seam), the engine's reaction to a row-less stage is driven by SPAWNING the
// real `report` handler against a throwaway born project.
//
// The defect: `compose` grows the host stage graph but never touches any
// existing intent's state file. `next --stage <composed>` happily emits a
// run-stage (it reads the GRAPH), while `report` refuses the transition with
// «is not present in the state file» (it reads the STATE) — an engine loop with
// no in-band exit. The recorded workaround (hand-inserting the row) produced a
// Total 18 / Completed 19 skew because no derived field was recomputed.
//
// Both directions are pinned here:
//   forward  (graph has it, state lacks it)      -> re-sync inserts the row
//   backward (state has it, graph lacks it)      -> FAIL-CLOSED: the state is
//                                                   left untouched and report's
//                                                   own «not in the compiled
//                                                   graph» refusal stands
// The backward direction is what makes the re-sync safe across hosts: an intent
// born on a host WITHOUT the plugin carries rows the current host's graph may
// not have, and a rebuild must never delete them.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadStageGraph,
  parseCheckboxes,
  resyncStateToStageGraph,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  defaultPluginCliDeps,
  handlePluginCli,
} from "../../dist/claude/.claude/tools/amadeus-plugin.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";

const BUN = process.execPath;
const toolIn = (proj: string, name: string): string => join(proj, ".claude", "tools", name);

function run(proj: string, tool: string, args: string[]): { status: number; out: string } {
  const childEnv: Record<string, string | undefined> = { ...process.env };
  delete childEnv.AMADEUS_SCOPE_MAPPING;
  const res = spawnSync(BUN, [amadeusToolTarget(toolIn(proj, tool)), ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env: childEnv as Record<string, string>,
    cwd: proj,
  });
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

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function bornProject(scope = "feature"): string {
  const proj = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  tempDirs.push(proj);
  expect(run(proj, "amadeus-utility.ts", ["intent-birth", "--scope", scope]).status).toBe(0);
  return proj;
}

/** Delete one stage row — the shape of an intent born before the stage existed. */
function dropRow(proj: string, slug: string): void {
  const before = readState(proj);
  const after = before.replace(new RegExp(`^- \\[[ xSR?-]\\] ${slug} —.*\\n`, "m"), "");
  expect(after).not.toBe(before);
  writeState(proj, after);
}

const fieldOf = (state: string, name: string): string =>
  new RegExp(`^- \\*\\*${name}\\*\\*: (.*)$`, "m").exec(state)?.[1]?.trim() ?? "";

const MISSING_ROW_REFUSAL = "is not present in the state file";
const NOT_IN_GRAPH_REFUSAL = "is not in the compiled graph";

describe("t394 forward direction: a graph stage with no state row", () => {
  test("re-sync inserts the row and report stops refusing the transition", () => {
    const proj = bornProject();
    dropRow(proj, "user-stories");

    const before = run(proj, "amadeus-orchestrate.ts", [
      "report",
      "--stage",
      "user-stories",
      "--result",
      "completed",
    ]);
    expect(before.out).toContain(MISSING_ROW_REFUSAL);

    const outcomes = resyncStateToStageGraph(proj);
    const resynced = outcomes.filter((o) => o.status === "resynced");
    expect(resynced).toHaveLength(1);
    expect(resynced[0].inserted).toEqual(["user-stories"]);
    expect(readState(proj)).toMatch(/^- \[ \] user-stories — EXECUTE$/m);

    const after = run(proj, "amadeus-orchestrate.ts", [
      "report",
      "--stage",
      "user-stories",
      "--result",
      "completed",
    ]);
    expect(after.out).not.toContain(MISSING_ROW_REFUSAL);
  });

  test("derived fields are recomputed, so no Completed > Total skew survives", () => {
    const proj = bornProject();
    dropRow(proj, "user-stories");
    // The recorded workaround's shape: a hand-inserted row left the counters
    // alone. Here the row is re-inserted by the re-sync, which must recount.
    resyncStateToStageGraph(proj);

    const state = readState(proj);
    const rows = parseCheckboxes(state);
    const executeRows = rows.filter((r) => r.suffix.startsWith("EXECUTE"));
    const completedExecute = executeRows.filter((r) => r.state === "completed");

    expect(fieldOf(state, "Total Stages")).toBe(String(executeRows.length));
    expect(fieldOf(state, "Completed")).toBe(String(completedExecute.length));
    expect(Number(fieldOf(state, "Completed"))).toBeLessThanOrEqual(
      Number(fieldOf(state, "Total Stages")),
    );
    expect(fieldOf(state, "Stages to Execute").split(", ")).toHaveLength(executeRows.length);
  });

  test("a second re-sync is inert (idempotent, byte-identical)", () => {
    const proj = bornProject();
    dropRow(proj, "user-stories");
    resyncStateToStageGraph(proj);
    const settled = readState(proj);
    const again = resyncStateToStageGraph(proj);
    expect(again.map((o) => o.status)).toEqual(["current"]);
    expect(readState(proj)).toBe(settled);
  });
});

describe("t394 backward direction and terminal records: fail-closed", () => {
  test("a row whose slug is absent from the graph is never deleted (cross-host)", () => {
    const proj = bornProject();
    const foreign = "plugin-stage-from-another-host";
    expect(loadStageGraph().some((s) => s.slug === foreign)).toBe(false);
    writeState(proj, readState(proj).replace(/^(## Current Status)/m, `- [ ] ${foreign} — SKIP\n\n$1`));
    const before = readState(proj);

    expect(resyncStateToStageGraph(proj).map((o) => o.status)).toEqual(["foreign-rows"]);
    expect(readState(proj)).toBe(before);

    // The engine's own refusal for that direction is unchanged.
    const r = run(proj, "amadeus-orchestrate.ts", ["report", "--stage", foreign, "--result", "completed"]);
    expect(r.out).toContain(NOT_IN_GRAPH_REFUSAL);
  });

  test("a finished record is excluded (a terminal state is a record, not a plan)", () => {
    const proj = bornProject();
    dropRow(proj, "user-stories");
    writeState(proj, readState(proj).replace(/^- \*\*Status\*\*: Running$/m, "- **Status**: Completed"));
    const before = readState(proj);

    expect(resyncStateToStageGraph(proj).map((o) => o.status)).toEqual(["not-running"]);
    expect(readState(proj)).toBe(before);
  });
});

describe("t394 compose wiring: the re-sync runs after the graph is recompiled", () => {
  test("compose calls the re-sync last, and reports the intents it changed", () => {
    const host = mkdtempSync(join(tmpdir(), "amadeus-t394-"));
    const trace: string[] = [];
    const lines: string[] = [];
    const code = handlePluginCli(["compose", "--project-root", host], {
      ...defaultPluginCliDeps(),
      discoverPlugins: () => [],
      recompile: () => {
        trace.push("recompile");
        return true;
      },
      generateRunners: () => {
        trace.push("generateRunners");
        return true;
      },
      resyncIntentStates: (root) => {
        trace.push("resyncIntentStates");
        expect(root).toBe(host);
        return [{ space: "default", intent: "demo-0badcafe", status: "resynced", inserted: ["x"] }];
      },
      out: (l) => lines.push(l),
      err: (l) => lines.push(l),
    });
    expect(code).toBe(0);
    // Order matters: the re-sync compares state files against the COMPOSED
    // graph, so it must not run before the recompile that writes it.
    expect(trace).toEqual(["recompile", "generateRunners", "resyncIntentStates"]);
    expect(lines.join("\n")).toContain("re-synced demo-0badcafe");
    rmSync(host, { recursive: true, force: true });
  });

  test("the real dependency bag wires the re-sync (production composes are not inert)", () => {
    expect(typeof defaultPluginCliDeps().resyncIntentStates).toBe("function");
  });
});

describe("t394 recompose --add: a row-less stage rejects instead of silently no-op", () => {
  test("recompose --add on a stage with no state row exits 1 and writes nothing", () => {
    const proj = bornProject("fix");
    dropRow(proj, "user-stories");
    const before = readState(proj);

    const r = run(proj, "amadeus-utility.ts", ["recompose", "--add", "user-stories"]);
    expect(r.status).toBe(1);
    expect(r.out).toContain("no row in the state file");
    expect(readState(proj)).toBe(before);
  });
});
