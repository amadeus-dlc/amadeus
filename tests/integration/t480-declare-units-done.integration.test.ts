// covers: function:handleDeclareUnitsDone subcommand:amadeus-state:declare-units-done subcommand:amadeus-orchestrate:next
// size: medium
//
// t480 — the write half of the degrade-path unit-list declaration (#2358,
// ruling #2385 Q4-B) joined to the read half in the engine.
//
// The CLI verb `amadeus-state declare-units-done` is the ONE path that records
// "no further Unit of Work is coming" for a workflow with no compiled unit DAG.
// The engine's degrade arm then turns a listing where every unit directory is
// already covered — previously an unconditional refusal (issue #1769) — into
// this stage's gate on the last unit.
//
// The half this file pins that t480's unit twin cannot: the covered-unit set
// the engine hands to decideDegradeUnitCompletion is the set it READ OFF DISK,
// not a placeholder. A dummy argument would make every declaration match, so
// the three-directory fixtures below are differential on purpose — the same
// declaration gates one listing and is refused by the other, and the ONLY thing
// that differs is what is on disk.
//
// Handlers are driven in-process (spawn is an lcov blindspot), through the
// CLAUDE_PROJECT_DIR resolution the CLI itself uses.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  resetAidlcEnv,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { handleDeclareUnitsDone } from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  DEGRADE_UNIT_DECLARATION_HEADING,
  DEGRADE_UNITS_DECLARED_AT_FIELD,
  DEGRADE_UNITS_DECLARED_FIELD,
  getField,
  parseCheckboxes,
  parseDegradeUnitDeclaration,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
resetAidlcEnv();

const RP = `amadeus/spaces/${DEFAULT_SPACE}/intents/${DEFAULT_RECORD_DIR}`;
const BUN = process.execPath;
// The shipped copy — the surface the conductor's CLI invocation actually runs.
const STATE_CLI = join(
  import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-state.ts",
);

interface Directive {
  kind: string;
  unit?: string;
  gate?: unknown;
  message?: string;
  produces?: string[];
}

const tempDirs: string[] = [];
let previousProjectDir: string | undefined;

beforeEach(() => {
  previousProjectDir = process.env.CLAUDE_PROJECT_DIR;
});

afterEach(() => {
  if (previousProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = previousProjectDir;
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

// A `fix`-scope Construction state pivoted to code-generation: `fix` SKIPs
// units-generation, which is how a workflow reaches Construction with no Bolt
// DAG. `Skeleton Stance` is recorded because code-generation is also this
// scope's walking-skeleton gate stage.
function fixScopeState(): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: declare-units-done test
- **Project Type**: Brownfield
- **Scope**: fix
- **State Version**: 7
- **Skeleton Stance**: off

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Standard

## Execution Plan Summary
- **Total Stages**: 2
- **Completed**: 0
- **In Progress**: code-generation

## Runtime State
- **Revision Count**: 0

## Stage Progress

### CONSTRUCTION PHASE
- [-] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: code-generation
- **Status**: Running
- **Construction Autonomy Mode**: gated
- **Last Updated**: 2026-08-07T00:00:00Z

## Session Resume Point
- **Last Completed Stage**: requirements-analysis
`;
}

function seedProject(): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), fixScopeState());
  process.env.CLAUDE_PROJECT_DIR = proj;
  return proj;
}

/** A unit directory already holding code-generation's REQUIRED artifacts. */
function seedCoveredUnit(proj: string, unit: string): void {
  const dir = join(seededRecordDir(proj), "construction", unit, "code-generation");
  mkdirSync(dir, { recursive: true });
  for (const name of ["code-generation-plan.md", "code-summary.md"]) {
    writeFileSync(join(dir, name), `# ${unit} ${name}\n`);
  }
}

function stateOf(proj: string): string {
  return readFileSync(seededStateFile(proj), "utf8");
}

function runNext(proj: string): Directive {
  let captured = "";
  const original = console.log;
  console.log = (...parts: unknown[]) => {
    captured += parts.join(" ");
  };
  try {
    handleNext([], proj);
  } finally {
    console.log = original;
  }
  return JSON.parse(captured) as Directive;
}

// `declareDone`, not `declare`: a top-level `function declare(...)` is read by
// the TypeScript transpiler as an ambient declaration and its body is erased,
// so the call silently does nothing.
function declareDone(proj: string, units: string[]): void {
  process.env.CLAUDE_PROJECT_DIR = proj;
  const original = console.log;
  console.log = () => {};
  try {
    handleDeclareUnitsDone(["--units", units.join(",")]);
  } finally {
    console.log = original;
  }
}

describe("t480 declare-units-done writes the declaration", () => {
  test("records the units and a timestamp under its own H2 section", () => {
    const proj = seedProject();
    const before = stateOf(proj);

    declareDone(proj, ["unit-alpha", "unit-beta"]);

    const after = stateOf(proj);
    expect(after.startsWith(before)).toBe(true);
    expect(after).toContain(DEGRADE_UNIT_DECLARATION_HEADING);
    expect(getField(after, DEGRADE_UNITS_DECLARED_FIELD)).toBe("unit-alpha, unit-beta");
    expect((getField(after, DEGRADE_UNITS_DECLARED_AT_FIELD) ?? "").length).toBeGreaterThan(0);
    expect(parseDegradeUnitDeclaration(after)?.units).toEqual(["unit-alpha", "unit-beta"]);
  });

  test("existing readers see the same Stage Progress rows after the section lands", () => {
    const proj = seedProject();
    const before = parseCheckboxes(stateOf(proj));

    declareDone(proj, ["unit-alpha", "unit-beta"]);

    expect(parseCheckboxes(stateOf(proj))).toEqual(before);
    expect(getField(stateOf(proj), "Current Stage")).toBe("code-generation");
    expect(getField(stateOf(proj), "Construction Autonomy Mode")).toBe("gated");
  });

  test("re-declaring updates the same section rather than appending a second one", () => {
    const proj = seedProject();

    declareDone(proj, ["unit-alpha"]);
    declareDone(proj, ["unit-alpha", "unit-beta"]);

    const after = stateOf(proj);
    expect(after.split(DEGRADE_UNIT_DECLARATION_HEADING).length - 1).toBe(1);
    expect(parseDegradeUnitDeclaration(after)?.units).toEqual(["unit-alpha", "unit-beta"]);
  });

  // Spawned, not in-process: these arms end in error(), which exits the process.
  // The CLI is also the surface the conductor actually runs, so this doubles as
  // the verb's end-to-end contract (dispatch reachable, refusal on stderr,
  // non-zero exit, state byte-identical).
  test("the CLI refuses a malformed or missing unit list without writing", () => {
    const proj = seedProject();
    const before = stateOf(proj);

    for (const args of [[], ["--units", ""], ["--units", "unit-alpha,../escape"]]) {
      const run = spawnSync(BUN, [STATE_CLI, "declare-units-done", ...args, "--project-dir", proj], {
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
      });
      expect(run.status).not.toBe(0);
      expect(stateOf(proj)).toBe(before);
    }
  });

  test("the CLI records a well-formed declaration end to end", () => {
    const proj = seedProject();

    const run = spawnSync(
      BUN,
      [STATE_CLI, "declare-units-done", "--units", "unit-alpha,unit-beta", "--project-dir", proj],
      { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: proj } },
    );

    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout).declared).toBe(true);
    expect(parseDegradeUnitDeclaration(stateOf(proj))?.units).toEqual(["unit-alpha", "unit-beta"]);
  });
});

describe("t480 the engine consumes the declaration", () => {
  // AC-3b, falling proof: without the declaration the all-covered listing is
  // refused exactly as before, and the refusal names the verb that ends it.
  test("no declaration keeps the fail-closed refusal", () => {
    const proj = seedProject();
    seedCoveredUnit(proj, "unit-alpha");
    seedCoveredUnit(proj, "unit-beta");

    const d = runNext(proj);

    expect(d.kind).toBe("error");
    expect(d.message).toContain("declare-units-done");
  });

  // AC-3a: declaration present and current -> the stage gate, on the last unit,
  // with real per-unit paths.
  test("a current declaration yields the stage gate on the last covered unit", () => {
    const proj = seedProject();
    seedCoveredUnit(proj, "unit-alpha");
    seedCoveredUnit(proj, "unit-beta");
    declareDone(proj, ["unit-alpha", "unit-beta"]);

    const d = runNext(proj);

    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("unit-beta");
    expect(d.gate).toBeDefined();
    expect((d.produces ?? []).filter((p) => p.includes("{unit-name}"))).toEqual([]);
    expect(
      (d.produces ?? []).some((p) => p.startsWith(`${RP}/construction/unit-beta/code-generation/`)),
    ).toBe(true);
  });

  // FR-3.3 (ii): the covered-unit set reaching the decision boundary is the one
  // read off disk. These two cases share a declaration and differ ONLY in what
  // the listing holds, so a boundary fed a placeholder set could not tell them
  // apart — one gates, the other refuses and names the undeclared directory.
  test("the decision sees the real listing: an extra directory makes the same declaration stale", () => {
    const gated = seedProject();
    seedCoveredUnit(gated, "unit-alpha");
    seedCoveredUnit(gated, "unit-beta");
    declareDone(gated, ["unit-alpha", "unit-beta"]);

    const stale = seedProject();
    seedCoveredUnit(stale, "unit-alpha");
    seedCoveredUnit(stale, "unit-beta");
    seedCoveredUnit(stale, "unit-gamma");
    declareDone(stale, ["unit-alpha", "unit-beta"]);

    const gatedDirective = runNext(gated);
    const staleDirective = runNext(stale);

    expect(gatedDirective.kind).toBe("run-stage");
    expect(staleDirective.kind).toBe("error");
    expect(staleDirective.message).toContain("Not declared: unit-gamma");
  });

  test("a declaration naming a directory that is not on disk is refused", () => {
    const proj = seedProject();
    seedCoveredUnit(proj, "unit-alpha");
    seedCoveredUnit(proj, "unit-beta");
    declareDone(proj, ["unit-alpha", "unit-beta", "unit-ghost"]);

    const d = runNext(proj);

    expect(d.kind).toBe("error");
    expect(d.message).toContain("Declared but absent: unit-ghost");
  });

  // The declaration settles ambiguity, it does not skip work: a unit whose
  // artifacts are still missing keeps its own directive.
  test("a declaration does not short-circuit a unit that still has work", () => {
    const proj = seedProject();
    seedCoveredUnit(proj, "unit-alpha");
    mkdirSync(join(seededRecordDir(proj), "construction", "unit-beta"), { recursive: true });
    declareDone(proj, ["unit-alpha", "unit-beta"]);

    const d = runNext(proj);

    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("unit-beta");
  });
});
