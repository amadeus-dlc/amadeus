// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts
//
// Regression coverage for Issue #841 (re-grounding the contract from #486, whose
// original test — dev-scripts/evals/swarm-batch-progress/check.ts — was lost in
// the repo restructure). tryEmitSwarm must EXCLUDE completed batches when it
// selects the batch to fan out: bolt_dag.batches is the STATIC topology, so
// unconditionally offering batches[0] re-presents batch 1 on every `next` and
// the swarm never advances. The fix walks the batches, using the same coverage
// ledger as the per-unit loop (unitCovered: the stage's produces on disk), and
// offers the first batch that still has uncovered units (only those units); when
// every unit of every batch is covered it returns false so the caller presents
// the stage's real gate.
//
// MECHANISM = in-process (NOT spawn). handleNext is exported and emit() only
// console.log's a valid directive (no process.exit on the happy path), so we
// drive the engine in-process and capture the directive via a console.log spy.
// This is deliberate: Bun coverage does not instrument spawned CLI processes
// (the documented spawn blindspot), and the NEW batch-selection lines in
// tryEmitSwarm live behind handleNext — driving them in-process is what keeps
// the codecov patch gate honest for this diff. The compiled stage graph is
// pointed at via the AMADEUS_STAGE_GRAPH seam (the core source ships no
// data/stage-graph.json; only the packaged dist copy carries it).
//
// The two cases are the #841 acceptance criteria and BOTH go RED on the pre-fix
// batches[0] code: (a) with a 2-batch DAG and batch 1 covered, the pre-fix
// engine re-emits batch 1 (units ["alpha"]) instead of advancing to ["beta"];
// (b) with every batch covered, the pre-fix engine still emits invoke-swarm for
// batch 1 instead of falling through to the final gate. t186's test 13 already
// seeds this exact shape but only asserts kind === "invoke-swarm" (green under
// both bug and fix) — these tests pin the units/advance the older test left open.

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";

// The core source has no co-located compiled graph — point the engine at the
// packaged dist copy (regenerated from the same core in this commit).
process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
// Standalone hermeticity (mirrors t186): the suite runner injects these guard
// bypasses; default them here so a bare `bun test <file>` behaves the same.
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
resetAidlcEnv();

// code-generation's produces[] (verified frontmatter) — a unit is COVERED for
// the stage once both land under construction/<unit>/code-generation/ in the record.
const CG_PRODUCES = ["code-generation-plan", "code-summary"];

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

interface Directive {
  kind?: string;
  units?: unknown;
  [k: string]: unknown;
}

// A CLEAN Construction-phase state file parked at code-generation (in-flight),
// with every upstream Construction stage completed and autonomy granted, so the
// engine takes the swarm path. Skeleton Stance is recorded so the feature-scope
// skeleton-gate stage upstream resolves a boolean gate rather than the sentinel.
function autonomousCodegenState(): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: swarm batch progress test
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on
- **Construction Autonomy Mode**: autonomous

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Standard

## Stage Progress

### CONSTRUCTION PHASE
- [x] functional-design — EXECUTE
- [x] nfr-requirements — EXECUTE
- [x] nfr-design — EXECUTE
- [x] infrastructure-design — EXECUTE
- [-] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: code-generation
- **Status**: Running
`;
}

/** Write a MULTI-batch bolt_dag (each inner array is one topological batch). */
function seedMultiBatchDag(proj: string, batches: string[][]): void {
  writeFileSync(
    join(seededRecordDir(proj), "runtime-graph.json"),
    JSON.stringify(
      {
        bolt_dag: {
          units: batches.flat().map((name) => ({ name, depends_on: [] })),
          batches,
        },
      },
      null,
      2,
    ),
  );
}

/** Mark `unit` COVERED for code-generation by writing its produces on disk. */
function coverUnit(proj: string, unit: string): void {
  const dir = join(seededRecordDir(proj), "construction", unit, "code-generation");
  mkdirSync(dir, { recursive: true });
  for (const name of CG_PRODUCES) {
    writeFileSync(join(dir, `${name}.md`), `# ${name} for ${unit}\n`);
  }
}

/** Seed a fresh autonomous code-generation project with a multi-batch DAG. */
function seedSwarmProject(batches: string[][]): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), autonomousCodegenState());
  seedMultiBatchDag(proj, batches);
  return proj;
}

/** Drive `next` in-process and return the emitted directive. */
function runNext(proj: string): Directive {
  let raw = "";
  const log = spyOn(console, "log").mockImplementation((value) => {
    raw = String(value);
  });
  try {
    handleNext([], proj);
  } finally {
    log.mockRestore();
  }
  return JSON.parse(raw) as Directive;
}

describe("t211 tryEmitSwarm excludes completed batches (#841)", () => {
  test("a: batch 1 covered -> engine advances and fans out batch 2's units", () => {
    const proj = seedSwarmProject([["alpha"], ["beta"]]);
    // Batch 1 (alpha) merged its artifacts; batch 2 (beta) has not.
    coverUnit(proj, "alpha");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    // The crux of #841: the offered batch is the FIRST with uncovered units, not
    // the static batches[0]. Pre-fix this was ["alpha"] (batch 1 re-offered).
    expect(directive.units).toEqual(["beta"]);
  });

  test("b: every batch covered -> no swarm is offered (falls through to the gate)", () => {
    const proj = seedSwarmProject([["alpha"], ["beta"]]);
    coverUnit(proj, "alpha");
    coverUnit(proj, "beta");
    const directive = runNext(proj);
    // firstBatch === null -> tryEmitSwarm returns false -> the caller presents
    // the per-unit all-covered re-entry (a run-stage with the real gate), never
    // another invoke-swarm. Pre-fix this still emitted invoke-swarm for batch 1.
    expect(directive.kind).not.toBe("invoke-swarm");
    expect(directive.kind).toBe("run-stage");
  });
});
