// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts, file:packages/framework/core/tools/amadeus-directive.ts
//
// U03 (swarm-and-next-stage) of the upstream-sync-230 intent. Two FR-0
// verification-first items of the approved v2.2.0->v2.3.0 sync plan:
//
//   FR-1 item 3 (swarm-batch-advance)   -> FR-0 verdict EQUIVALENT (no prod change)
//   FR-2 item 10 (gate-next-stage-naming) -> FR-0 verdict PARTIAL -> ADAPT
//
// MECHANISM = in-process (NOT spawn). handleNext is exported and emit() only
// console.log's the directive on the happy path, so we drive the engine
// in-process and capture the directive via a console.log spy. This is the same
// discipline as t211: Bun coverage does not instrument spawned CLI processes, so
// the NEW next_stage-projection lines in buildRunStageDirective are only kept
// honest under the codecov patch gate when driven in-process.
//
// --- item 3 (swarm-batch-advance) EQUIVALENT verdict ---
// The three upstream guards are already present in Amadeus and regression-tested:
//   1. multi-batch DAG-order climb: tryEmitSwarm walks all batches, offers the
//      first with uncovered units (this file, describe #2 + existing t211).
//   2. converged scoped to CURRENT run: the coverage ledger is the CURRENT
//      record's produces on disk (unitCovered) — a unit only advances once ITS
//      artifacts land in THIS record (this file, describe #2).
//   3. merge failure not recorded converged: amadeus-swarm.ts finalize downgrades
//      a merge-back failure to `failed` so SWARM_UNIT_CONVERGED is never emitted
//      (issue #674) — reproduced by tests/e2e/t134-swarm-referee.test.ts case 14.
// EQUIVALENT => no production change; these tests + the cited ones are the U03
// deliverable and verdict evidence.
//
// --- item 10 (gate-next-stage-naming) PARTIAL -> ADAPT ---
// The resolver nextInScopeStage already excludes SKIP stages and returns null at
// the terminal, and the engine advances via it. The gap was that the gate
// directive did NOT project it, so the human-facing gate ("Continue to
// [next stage]") had no authoritative engine source. The ADAPT projects
// next_stage onto gate-carrying main-workflow run-stage directives using that
// SAME resolver, so the gate name never diverges from the post-approval routing.

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
import { nextInScopeStage } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { validateDirective } from "../../packages/framework/core/tools/amadeus-directive.ts";

// The core source has no co-located compiled graph — point the engine at the
// packaged dist copy (regenerated from the same core in this commit).
process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
resetAidlcEnv();

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

interface Directive {
  kind?: string;
  stage?: string;
  gate?: unknown;
  units?: unknown;
  next_stage?: unknown;
  [k: string]: unknown;
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

// ---------------------------------------------------------------------------
// item 10 — gate-next-stage-naming (PARTIAL -> ADAPT)
// ---------------------------------------------------------------------------

// A minimal inception-phase state parked at `current` (in-flight [-]), with the
// Stage Progress rows carrying explicit `— EXECUTE`/`— SKIP` suffixes that drive
// the same override-aware walk nextInScopeStage uses (parseStateStageSuffixes).
// Every relevant successor gets an explicit suffix so the fixture is independent
// of the scope's default mapping. `rows` is [slug, checkbox, action] triples.
function inceptionState(
  current: string,
  rows: Array<[slug: string, box: string, action: "EXECUTE" | "SKIP"]>,
): string {
  const progress = rows
    .map(([slug, box, action]) => `- [${box}] ${slug} — ${action}`)
    .join("\n");
  return `# AI-DLC State Tracking

## Project Information
- **Project**: next-stage naming test
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Standard

## Stage Progress

### INCEPTION PHASE
${progress}

## Current Status
- **Lifecycle Phase**: INCEPTION
- **Current Stage**: ${current}
- **Status**: Running
`;
}

function seedInception(
  current: string,
  rows: Array<[string, string, "EXECUTE" | "SKIP"]>,
): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), inceptionState(current, rows));
  return proj;
}

describe("t250 item 10 gate-next-stage-naming: directive projects next_stage", () => {
  test("a: gate directive names the actual next in-scope stage (== resolver)", () => {
    const proj = seedInception("requirements-analysis", [
      ["reverse-engineering", "x", "EXECUTE"],
      ["requirements-analysis", "-", "EXECUTE"],
      ["user-stories", " ", "EXECUTE"],
      ["application-design", " ", "EXECUTE"],
    ]);
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe("requirements-analysis");
    expect(directive.gate).toBe(true);
    // The projection MUST equal the same resolver the engine advances with, so the
    // gate display and the post-approval directive can never diverge.
    const resolver = nextInScopeStage(
      "requirements-analysis",
      "feature",
      inceptionState("requirements-analysis", [
        ["reverse-engineering", "x", "EXECUTE"],
        ["requirements-analysis", "-", "EXECUTE"],
        ["user-stories", " ", "EXECUTE"],
        ["application-design", " ", "EXECUTE"],
      ]),
    );
    expect(directive.next_stage).toBe(resolver?.slug ?? null);
    expect(directive.next_stage).toBe("user-stories");
  });

  test("b: SKIP successors are excluded from next_stage", () => {
    // The two stages immediately after the current one are SKIP; next_stage must
    // jump past them to the first in-scope EXECUTE successor.
    const proj = seedInception("requirements-analysis", [
      ["requirements-analysis", "-", "EXECUTE"],
      ["user-stories", " ", "SKIP"],
      ["refined-mockups", " ", "SKIP"],
      ["application-design", " ", "EXECUTE"],
    ]);
    const directive = runNext(proj);
    expect(directive.next_stage).toBe("application-design");
  });

  test("c: terminal stage -> next_stage is explicit null", () => {
    // The last stage in the compiled graph (feedback-optimization) is in-flight:
    // no stage follows it, so there is no in-scope successor regardless of scope
    // mapping -> null (NOT a SKIP slug, NOT a fabricated placeholder).
    const proj = seedInception("feedback-optimization", [
      ["performance-validation", "x", "EXECUTE"],
      ["feedback-optimization", "-", "EXECUTE"],
    ]);
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe("feedback-optimization");
    // Present-and-null: the terminal is explicitly signalled, not omitted.
    expect(Object.hasOwn(directive, "next_stage")).toBe(true);
    expect(directive.next_stage).toBeNull();
  });

  test("d: a gate:false per-unit iteration step carries NO next_stage", () => {
    // A non-autonomous Construction stage parked at code-generation with a unit
    // DAG drives the per-unit for_each loop: the first uncovered unit is emitted
    // with the gate SUPPRESSED (gate:false). That is an iteration step, not an
    // approval gate, so next_stage must be absent.
    const proj = createTestProject();
    tempDirs.push(proj);
    writeFileSync(seededStateFile(proj), perUnitCodegenState());
    seedMultiBatchDag(proj, [["alpha", "beta"]]);
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe("code-generation");
    expect(directive.gate).toBe(false);
    expect(Object.hasOwn(directive, "next_stage")).toBe(false);
  });

  test("e: a --single stage-runner directive carries NO next_stage", () => {
    // --single runs ONE stage in isolation and never advances the main pointer,
    // so it reads no main state (stateContent null) and names no next stage.
    const proj = createTestProject();
    tempDirs.push(proj);
    let raw = "";
    const log = spyOn(console, "log").mockImplementation((v) => {
      raw = String(v);
    });
    try {
      handleNext(["--stage", "requirements-analysis", "--single", "--scope", "feature"], proj);
    } finally {
      log.mockRestore();
    }
    const directive = JSON.parse(raw) as Directive;
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe("requirements-analysis");
    expect(directive.gate).toBe(true);
    expect(Object.hasOwn(directive, "next_stage")).toBe(false);
  });
});

// The directive validator (core copy) accepts next_stage as string | null and
// rejects any other type — the schema half of the FR-2 item 10 contract. t113
// pins the same on the shipped dist copy; this drives the core source in-process
// so the validator's next_stage branch is covered where the diff lands.
const NEXT_STAGE_RUN_STAGE = {
  kind: "run-stage" as const,
  stage: "application-design",
  phase: "inception",
  lead_agent: "amadeus-architect-agent",
  support_agents: [],
  mode: "inline" as const,
  gate: true,
  memory_path: "amadeus-docs/inception/application-design/memory.md",
  consumes: [],
  produces: ["amadeus-docs/inception/application-design/decisions.md"],
  rules_in_context: [],
  sensors_applicable: [],
  stage_file: ".claude/amadeus-common/stages/inception/application-design.md",
};

describe("t250 item 10 validator: next_stage is string | null", () => {
  test("string slug validates", () => {
    expect(validateDirective({ ...NEXT_STAGE_RUN_STAGE, next_stage: "units-generation" }).valid).toBe(true);
  });
  test("null (terminal) validates", () => {
    expect(validateDirective({ ...NEXT_STAGE_RUN_STAGE, next_stage: null }).valid).toBe(true);
  });
  test("non-string non-null is rejected", () => {
    const r = validateDirective({ ...NEXT_STAGE_RUN_STAGE, next_stage: 7 });
    expect(r.valid).toBe(false);
    expect(r.valid ? [] : r.errors).toContain(
      "run-stage: next_stage must be string or null, got number",
    );
  });
});

// A NON-autonomous Construction state parked at code-generation (in-flight), so
// the engine drives the per-unit for_each loop rather than a swarm batch.
function perUnitCodegenState(): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: per-unit next-stage suppression
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on

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

// ---------------------------------------------------------------------------
// item 3 — swarm-batch-advance (EQUIVALENT): guards 1 & 2 pinned here
// ---------------------------------------------------------------------------

const CG_PRODUCES = ["code-generation-plan", "code-summary"];

function autonomousCodegenState(): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: swarm batch advance verdict
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

function seedMultiBatchDag(proj: string, batches: string[][]): void {
  const dependencyDir = join(seededRecordDir(proj), "inception", "units-generation");
  mkdirSync(dependencyDir, { recursive: true });
  const units = batches.flatMap((batch, index) =>
    batch.map((name) => ({ name, depends_on: index === 0 ? [] : batches[index - 1]! })),
  );
  writeFileSync(
    join(dependencyDir, "unit-of-work-dependency.md"),
    `# Unit dependencies\n\n\`\`\`yaml\nunits:\n${units
      .map((unit) => `  - name: ${unit.name}\n    depends_on: [${unit.depends_on.join(", ")}]`)
      .join("\n")}\n\`\`\`\n`,
  );
  writeFileSync(
    join(seededRecordDir(proj), "runtime-graph.json"),
    JSON.stringify(
      { bolt_dag: { units: batches.flat().map((name) => ({ name, depends_on: [] })), batches } },
      null,
      2,
    ),
  );
}

function coverUnit(proj: string, unit: string): void {
  const dir = join(seededRecordDir(proj), "construction", unit, "code-generation");
  mkdirSync(dir, { recursive: true });
  for (const name of CG_PRODUCES) writeFileSync(join(dir, `${name}.md`), `# ${name} for ${unit}\n`);
}

function seedSwarmProject(batches: string[][]): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), autonomousCodegenState());
  seedMultiBatchDag(proj, batches);
  return proj;
}

describe("t250 item 3 swarm-batch-advance EQUIVALENT: DAG-order climb + current-run scope", () => {
  test("guard 1: first uncovered batch in DAG order is offered (multi-batch climb)", () => {
    const proj = seedSwarmProject([["alpha"], ["beta"]]);
    // No unit covered yet -> the FIRST batch's uncovered units are offered.
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha"]);
  });

  test("guard 2: only a unit whose artifacts landed in THIS record advances (current-run converged)", () => {
    const proj = seedSwarmProject([["alpha"], ["beta"]]);
    // Covering batch-1's unit in the current record (its produces on disk) is the
    // ONLY convergence evidence the selector reads -> it advances to batch 2.
    coverUnit(proj, "alpha");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
  });

  test("guard 2b: an uncovered batch is never skipped (no forward pre-emption)", () => {
    const proj = seedSwarmProject([["alpha"], ["beta"]]);
    // beta (batch 2) covered but alpha (batch 1) NOT: the selector must still offer
    // batch 1 — a later-batch claim is not convergence for the earlier batch.
    coverUnit(proj, "beta");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha"]);
  });
});
