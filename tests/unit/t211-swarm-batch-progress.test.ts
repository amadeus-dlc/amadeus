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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  handleFailureRuling,
  handleNext,
  handleReport,
  runEngineMain,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { emitAuditEventGuarded } from "../../packages/framework/core/otel/audit-emit.ts";
import { activeIntent, activeSpace, readAllAuditShards } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  normalizeConstructionOutcomeAudit,
  projectConstructionOutcomes,
} from "../../packages/framework/core/tools/amadeus-construction-outcome-projection.ts";
import {
  createAuditUnitPoolRepository,
  createUnitPoolCoordinator,
} from "../../packages/framework/core/tools/amadeus-unit-pool-runtime.ts";

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
const REVIEW_BLOCK =
  "\n## Review — Iteration 1\n\n- **Verdict:** READY\n" +
  "- **Reviewer:** amadeus-architecture-reviewer-agent\n- **Date:** 2026-08-10T00:00:00Z\n" +
  "- **Iteration:** 1\n- **Scope decision:** none\n";

const tempDirs: string[] = [];
afterEach(() => {
  resetOtelPerProject();
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

interface Directive {
  kind?: string;
  units?: unknown;
  repo?: unknown;
  question?: unknown;
  message?: unknown;
  [k: string]: unknown;
}

// A CLEAN Construction-phase state file parked at code-generation (in-flight),
// with every upstream Construction stage completed and autonomy granted, so the
// engine takes the swarm path. Skeleton Stance is recorded so the feature-scope
// skeleton-gate stage upstream resolves a boolean gate rather than the sentinel.
//
// `current` selects which handleNext branch runs (both call tryEmitSwarm):
//   - "code-generation": code-generation is in-flight ([-]) and IS the Current
//     Stage, so handleNext takes the RE-ENTRY branch (tryEmitSwarm(currentSlug)).
//   - "infrastructure-design": the prior stage is the Current Stage and COMPLETED
//     ([x]) while code-generation is still pending ([ ]), so handleNext takes the
//     ADVANCE branch — nextInScopeStage returns code-generation and
//     tryEmitSwarm(next.slug) fires. This is the forward-path call site (#841
//     codecov gap) the re-entry fixture never exercises.
function autonomousCodegenState(current: "code-generation" | "infrastructure-design"): string {
  const cgBox = current === "code-generation" ? "-" : " ";
  return `# AI-DLC State Tracking

## Project Information
- **Project**: swarm batch progress test
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on
- **Intent Autonomy Mode**: full
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
- [${cgBox}] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: ${current}
- **Status**: Running

## Runtime State
- **Mirror Initial Create Receipt**: completed
`;
}

/** Write a MULTI-batch bolt_dag (each inner array is one topological batch). */
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
    const review = name === CG_PRODUCES[0] ? REVIEW_BLOCK : "";
    writeFileSync(join(dir, `${name}.md`), `# ${name} for ${unit}\n${review}`);
  }
}

/**
 * Seed a fresh autonomous code-generation project with a multi-batch DAG.
 * `current` picks the handleNext branch: "code-generation" (re-entry, default) or
 * "infrastructure-design" (advance — the forward-path call site).
 */
function seedSwarmProject(
  batches: string[][],
  current: "code-generation" | "infrastructure-design" = "code-generation",
): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), autonomousCodegenState(current));
  seedMultiBatchDag(proj, batches);
  return proj;
}

function recordIntentRepos(proj: string, repos: string[]): void {
  const path = join(proj, "amadeus", "spaces", "default", "intents", "intents.json");
  const rows = JSON.parse(readFileSync(path, "utf-8")) as Array<Record<string, unknown>>;
  rows[0].repos = repos;
  writeFileSync(path, `${JSON.stringify(rows, null, 2)}\n`);
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

/** Drive `report` in-process and return the emitted directive (#1612 FR-6). */
function runReport(proj: string, args: string[]): Directive {
  let raw = "";
  const log = spyOn(console, "log").mockImplementation((value) => {
    raw = String(value);
  });
  try {
    handleReport(args, proj);
  } finally {
    log.mockRestore();
  }
  return JSON.parse(raw) as Directive;
}

function runFailureRuling(proj: string, answer: string): Directive {
  let raw = "";
  const log = spyOn(console, "log").mockImplementation((value) => {
    raw = String(value);
  });
  try {
    handleFailureRuling(["--stage", "code-generation", "--user-input", answer], proj);
  } finally {
    log.mockRestore();
  }
  return JSON.parse(raw) as Directive;
}

function seedFailedSwarmUnit(withClosure = true): { proj: string; attempt: string } {
  const proj = seedSwarmProject([["alpha"]]);
  const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj));
  expect(pool.initialEnqueue({
    idempotencyKey: "failure:init",
    batchId: "1",
    cap: 1,
    units: [{ unitId: "alpha", dependsOn: [] }],
  }).ok).toBe(true);
  expect(pool.acquire({ idempotencyKey: "failure:acquire", batchId: "1" }).ok).toBe(true);
  const attempt = pool.readProjection("1").active[0].attemptId;
  expect(pool.confirmDispatch({
    idempotencyKey: "failure:confirm",
    batchId: "1",
    attemptId: attempt,
    nativeHandle: "native-alpha",
  }).ok).toBe(true);
  expect(pool.settleRelease({
    idempotencyKey: "failure:settle",
    batchId: "1",
    attemptId: attempt,
    outcome: "failed",
  }).ok).toBe(true);
  if (withClosure) {
    emitAuditEventGuarded("BOLT_FAILED", {
      "Failed Bolt": "alpha",
      "Bolt slug": "alpha",
      "Error summary": "red",
      Stage: "code-generation",
      "Attempt Id": attempt,
      "Batch Id": "1",
    }, proj);
    emitAuditEventGuarded("SWARM_BATON_RETURNED", {
      "Batch number": "1",
      "Unit name": "alpha",
      Reason: "error",
      Stage: "code-generation",
      "Attempt Id": attempt,
    }, proj);
  }
  return { proj, attempt };
}

/**
 * A batch whose Unit Pool identity is already SPENT (#2837). The compiled batch
 * declares two units; the pool was only ever prepared for `alpha`, which failed,
 * was ruled Skip, and left the pool terminal. `beta` is still uncovered and
 * carries no pool terminal, so the batch is offered again — with a batch
 * identity whose durable pool (`unit-pool:1:initial-enqueue`) cannot be
 * initialised a second time.
 */
function seedSpentPoolBatch(): string {
  const proj = seedSwarmProject([["alpha", "beta"]]);
  const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj));
  expect(pool.initialEnqueue({
    idempotencyKey: "unit-pool:1:initial-enqueue",
    batchId: "1",
    cap: 1,
    units: [{ unitId: "alpha", dependsOn: [] }],
  }).ok).toBe(true);
  expect(pool.acquire({ idempotencyKey: "spent:acquire", batchId: "1" }).ok).toBe(true);
  const attempt = pool.readProjection("1").active[0].attemptId;
  expect(pool.confirmDispatch({
    idempotencyKey: "spent:confirm",
    batchId: "1",
    attemptId: attempt,
    nativeHandle: "native-alpha",
  }).ok).toBe(true);
  expect(pool.settleRelease({
    idempotencyKey: "spent:settle",
    batchId: "1",
    attemptId: attempt,
    outcome: "failed",
  }).ok).toBe(true);
  emitAuditEventGuarded("BOLT_FAILED", {
    "Failed Bolt": "alpha",
    "Bolt slug": "alpha",
    "Error summary": "red",
    Stage: "code-generation",
    "Attempt Id": attempt,
    "Batch Id": "1",
  }, proj);
  emitAuditEventGuarded("SWARM_BATON_RETURNED", {
    "Batch number": "1",
    "Unit name": "alpha",
    Reason: "error",
    Stage: "code-generation",
    "Attempt Id": attempt,
  }, proj);
  // The failure is RULED (Skip), so nothing is owed the human any more — the
  // engine walks on to the batch selection with the pool already terminal.
  expect(runFailureRuling(proj, "Skip")).toMatchObject({ kind: "committed" });
  expect(pool.readProjection("1").phase).toBe("terminal");
  return proj;
}

function seedFailedSoloUnit(): { proj: string; attempt: string; batch: string } {
  const proj = seedSwarmProject([["alpha"]]);
  writeFileSync(
    seededStateFile(proj),
    readFileSync(seededStateFile(proj), "utf-8").replace("- **Scope**: feature", "- **Scope**: fix"),
  );
  const attempt = "solo-attempt-alpha";
  const batch = "solo:1:alpha";
  emitAuditEventGuarded("BOLT_STARTED", {
    "Bolt names": "alpha",
    "Bolt slug": "alpha",
    "Batch number": "1",
    "Walking skeleton": "false",
    Stage: "code-generation",
    "Attempt Id": attempt,
    "Batch Id": batch,
  }, proj);
  emitAuditEventGuarded("BOLT_FAILED", {
    "Failed Bolt": "alpha",
    "Bolt slug": "alpha",
    "Error summary": "red",
    Stage: "code-generation",
    "Attempt Id": attempt,
    "Batch Id": batch,
  }, proj);
  return { proj, attempt, batch };
}

function projectedUnits(proj: string) {
  const normalized = normalizeConstructionOutcomeAudit(readAllAuditShards(proj));
  expect(normalized.ok).toBe(true);
  if (!normalized.ok) throw new TypeError("expected normalized Construction audit");
  const intent = activeIntent(proj, activeSpace(proj));
  expect(intent).not.toBeNull();
  const projected = projectConstructionOutcomes(normalized.records, {
    intent: intent!,
    stage: "code-generation",
  });
  expect(projected.ok).toBe(true);
  if (!projected.ok) throw new TypeError("expected projected Construction outcomes");
  return projected.projection;
}

function auditAttributes(proj: string): Array<Record<string, unknown>> {
  return readAllAuditShards(proj)
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as { attributes?: Record<string, unknown> })
    .flatMap((row) => row.attributes === undefined ? [] : [row.attributes]);
}

describe("t211 tryEmitSwarm excludes completed batches (#841)", () => {
  test("next asks for a ruling when the failed Unit has canonical closure evidence", () => {
    const { proj } = seedFailedSwarmUnit();
    // This test's subject is #841 closure-evidence gating, not solo-election
    // (t211 "#2976" describe block above). The fixture declares Intent
    // Autonomy Mode "full" by default, which would now also derive an
    // automatic election (RFC-0001 ADR-8) — override to "none" to keep this
    // scenario isolated to the ask path it was written to pin.
    writeDeclaredIntentAutonomyMode(proj, "none");

    expect(runNext(proj)).toMatchObject({
      kind: "ask",
      question: expect.stringContaining("Retry, Skip, or Abort"),
    });
  });

  test("next fails closed while a terminal failure is missing lifecycle closure evidence", () => {
    const { proj } = seedFailedSwarmUnit(false);

    expect(runNext(proj)).toMatchObject({
      kind: "error",
      message: expect.stringContaining("join is incomplete"),
    });
  });

  test("next fails closed on malformed pool audit evidence", () => {
    const proj = seedSwarmProject([["alpha"]]);
    emitAuditEventGuarded("UNIT_POOL_EVENT_SET_COMMITTED", {
      Stage: "code-generation",
      "Batch Id": "1",
      "Event Set Id": "malformed-event-set",
      "Event Set": "{",
    }, proj);

    expect(runNext(proj)).toMatchObject({
      kind: "error",
      message: expect.stringContaining("audit is incomplete"),
    });
  });

  test("next and failure ruling fail closed on a terminal missing its attempt identity", () => {
    const proj = seedSwarmProject([["alpha"]]);
    emitAuditEventGuarded("UNIT_POOL_EVENT_SET_COMMITTED", {
      Stage: "code-generation",
      "Batch Id": "1",
      "Event Set Id": "missing-attempt-event-set",
      "Event Set": JSON.stringify({
        batchId: "1",
        events: [{
          type: "unit-settled",
          terminal: { unitId: "alpha", attemptId: null, outcome: "failed" },
        }],
      }),
    }, proj);

    expect(runNext(proj)).toMatchObject({
      kind: "error",
      message: expect.stringContaining("join failed closed"),
    });
    expect(runFailureRuling(proj, "Retry")).toMatchObject({
      kind: "error",
      message: expect.stringContaining("join failed closed"),
    });
  });

  test("failure ruling rejects an absent failure", () => {
    expect(runFailureRuling(seedSwarmProject([["alpha"]]), "Retry")).toMatchObject({
      kind: "error",
      message: expect.stringContaining("No unresolved Construction Unit failure"),
    });
  });

  test("failure ruling rejects an invalid answer", () => {
    const { proj } = seedFailedSwarmUnit();
    expect(runFailureRuling(proj, "Later")).toMatchObject({
      kind: "error",
      message: expect.stringContaining("Retry, Skip, or Abort"),
    });
  });

  test("the CLI dispatcher routes resolve-failure to the canonical handler", () => {
    const proj = seedSwarmProject([["alpha"]]);
    const originalArgv = process.argv;
    let raw = "";
    const log = spyOn(console, "log").mockImplementation((value) => {
      raw = String(value);
    });
    process.argv = [originalArgv[0]!, originalArgv[1]!, "resolve-failure", "--project-dir", proj, "--stage", "code-generation", "--user-input", "Retry"];
    try {
      runEngineMain();
    } finally {
      process.argv = originalArgv;
      log.mockRestore();
    }

    expect(JSON.parse(raw)).toMatchObject({
      kind: "error",
      message: expect.stringContaining("No unresolved Construction Unit failure"),
    });
  });

  test("ordinary ask reporting commits a pending failure ruling", () => {
    const { proj } = seedFailedSwarmUnit();

    expect(runReport(proj, ["--user-input", "Retry"])).toMatchObject({
      kind: "invoke-swarm",
      units: ["alpha"],
      prepared_batch: "1",
      retry_unit: "alpha",
    });
  });

  test("the CLI dispatcher lists resolve-failure when rejecting an unknown subcommand", () => {
    const proj = seedSwarmProject([["alpha"]]);
    const originalArgv = process.argv;
    const originalExit = process.exit;
    const error = spyOn(console, "error").mockImplementation(() => {});
    process.argv = [originalArgv[0]!, originalArgv[1]!, "unknown", "--project-dir", proj];
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    try {
      expect(() => runEngineMain()).toThrow("exit 1");
      expect(error).toHaveBeenCalledWith(expect.stringContaining("resolve-failure"));
    } finally {
      process.argv = originalArgv;
      process.exit = originalExit;
      error.mockRestore();
    }
  });

  test("Retry requeues without acquiring and returns a prepared retry directive", () => {
    const { proj, attempt } = seedFailedSwarmUnit();

    expect(runFailureRuling(proj, "Retry")).toMatchObject({
      kind: "invoke-swarm",
      units: ["alpha"],
      cap: 1,
      prepared_batch: "1",
      retry_unit: "alpha",
    });
    const projection = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj)).readProjection("1");
    expect(projection.active).toEqual([]);
    expect(projection.queue).toEqual([expect.objectContaining({ unitId: "alpha" })]);
    expect(projection.terminal).toEqual([]);
    expect(readAllAuditShards(proj)).toContain(attempt);
  });

  test("Skip commits the failed Unit as cancelled and next does not redispatch it", () => {
    const { proj, attempt } = seedFailedSwarmUnit();

    expect(runFailureRuling(proj, "Skip")).toMatchObject({ kind: "committed" });
    expect(createUnitPoolCoordinator(createAuditUnitPoolRepository(proj)).readProjection("1").terminal).toContainEqual({
      unitId: "alpha",
      attemptId: attempt,
      outcome: "cancelled",
      reason: "skipped",
    });
    expect(runNext(proj).kind).not.toBe("invoke-swarm");
  });

  test("Abort parks Construction and next never redispatches the failed Unit", () => {
    const { proj } = seedFailedSwarmUnit();

    expect(runFailureRuling(proj, "Abort")).toMatchObject({ kind: "parked", stage: "code-generation" });
    expect(runNext(proj)).toMatchObject({ kind: "parked", stage: "code-generation" });
    expect(runFailureRuling(proj, "Retry")).toMatchObject({
      kind: "error",
      message: expect.stringContaining("suspended"),
    });
  });

  test("solo Retry starts a fresh immutable attempt and returns to the per-Unit selector", () => {
    const { proj, attempt } = seedFailedSoloUnit();

    expect(runFailureRuling(proj, "Retry")).toMatchObject({ kind: "committed" });
    expect(projectedUnits(proj).unresolvedFailures).toEqual([]);
    const audit = readAllAuditShards(proj);
    expect(audit.match(/"Event":"BOLT_STARTED"/g)?.length).toBe(2);
    expect(audit).toContain(attempt);
    expect(runNext(proj)).toMatchObject({ kind: "run-stage", unit: "alpha", gate: false });
  });

  test("solo Skip closes the failed attempt as cancelled and preserves per-Unit review recovery", () => {
    const { proj, attempt, batch } = seedFailedSoloUnit();

    expect(runFailureRuling(proj, "Skip")).toMatchObject({ kind: "committed" });
    expect(projectedUnits(proj).units).toContainEqual(expect.objectContaining({
      unit: "alpha",
      attempt,
      batch,
      outcome: "cancelled",
      reason: "skipped",
    }));
    expect(runNext(proj)).toMatchObject({
      kind: "run-stage",
      unit: "alpha",
      gate: false,
      review_only: true,
    });
  });

  test("solo Abort suspends Construction without changing the failed attempt", () => {
    const { proj, attempt } = seedFailedSoloUnit();

    expect(runFailureRuling(proj, "Abort")).toMatchObject({ kind: "parked", stage: "code-generation" });
    expect(projectedUnits(proj)).toMatchObject({
      constructionSuspended: true,
      units: [expect.objectContaining({ attempt, outcome: "failed" })],
    });
    expect(runNext(proj)).toMatchObject({ kind: "parked", stage: "code-generation" });
  });

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

  // #2837 FR-2837-1 / FR-2837-4(a). The engine holds the 1-origin batch number
  // (firstUncoveredBatch) and the conductor needs it verbatim for
  // `prepare --batch`; before this contract the emit dropped it and the
  // conductor had to re-derive engine-owned routing. Batch 1 is covered here, so
  // a hardcoded "1" cannot satisfy the assertion — the identity is DERIVED.
  test("a1: the offered batch carries its 1-origin identity for `prepare --batch`", () => {
    const proj = seedSwarmProject([["alpha"], ["beta"]]);
    coverUnit(proj, "alpha");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
    expect(directive.batch).toBe("2");
  });

  // #2837 FR-2837-4(b). The batch identity is also the DURABLE pool identity
  // (`unit-pool:<batch>:initial-enqueue`), so re-offering a batch whose pool is
  // already terminal hands the conductor an identity a fresh `prepare` cannot
  // take: the second initial-enqueue replays the spent pool or conflicts. The
  // engine owns the identity now, so it refuses instead of emitting one that
  // collides.
  test("a1b: a batch whose Unit Pool is already terminal is never offered for a fresh prepare", () => {
    const directive = runNext(seedSpentPoolBatch());
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("batch 1");
    expect(String(directive.message)).toContain("Unit Pool");
  });

  test("a2: a lone recorded repo is propagated with the selected batch", () => {
    const proj = seedSwarmProject([["alpha"]]);
    recordIntentRepos(proj, ["service"]);
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha"]);
    expect(directive.repo).toBe("service");
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

  test("c: advance path (next moves onto code-generation) also excludes completed batches", () => {
    // The prior stage (infrastructure-design) is the COMPLETED Current Stage, so
    // handleNext walks forward and tryEmitSwarm fires from the ADVANCE call site
    // (next.slug), not the re-entry one. Same #841 contract: batch 1 covered must
    // advance to batch 2. This pins the forward path the re-entry cases (a/b)
    // never exercise (the codecov gap on the second tryEmitSwarm call site).
    const proj = seedSwarmProject([["alpha"], ["beta"]], "infrastructure-design");
    coverUnit(proj, "alpha");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
  });
});

// ---------------------------------------------------------------------------
// Issue #1612 — `gated` fans the batch out and stops at a BATCH-END gate.
// ---------------------------------------------------------------------------
// The pre-fix engine read `gated` as a swarm VETO, so every parallel Unit ran
// serially through the inline per-unit loop. stage-protocol.md § "Subsequent
// Bolt gate" says the opposite: gated selects the approval FREQUENCY ("for
// parallel batches the gate
// covers every Bolt in the batch"), so the batches still fan out — the engine
// just refuses the NEXT batch until the finished one is approved.
//
// Same in-process mechanism as the #841 cases above: these new tryEmitSwarm /
// emitPerUnitRunStage branches are only reachable through handleNext, and the
// report-side symmetry through handleReport, so both are driven in-process to
// keep the patch-coverage gate honest.

/**
 * The #841 state with the autonomy grant swapped for an arbitrary value, plus
 * the bookkeeping fields `report --result approved` rewrites (Last Updated /
 * Completed / Last Completed Stage). The #841 cases (a/b/c) never reach the
 * approve path, so their fixture is left byte-identical.
 */
function codegenStateWithAutonomy(autonomy: string): string {
  const base = autonomousCodegenState("code-generation").replace(
    "- **Status**: Running",
    [
      "- **Status**: Running",
      "- **Last Updated**: 2026-07-28T00:00:00Z",
      "- **Completed**: 4",
      "- **Last Completed Stage**: infrastructure-design",
    ].join("\n"),
  );
  if (autonomy === "") {
    return base
      .replace("- **Intent Autonomy Mode**: full", "- **Intent Autonomy Mode**: none")
      .replace(
        "- **Construction Autonomy Mode**: autonomous",
        "- **Construction Autonomy Mode**: unset",
      );
  }
  // RFC-0001 FR-6: `gated` is the projection of Intent mode `none`. Before the
  // RFC it was also semi's projection; semi now projects to `autonomous` and
  // runs its Bolts, which cases d1/e1 below pin.
  if (autonomy === "gated") {
    return base
      .replace("- **Intent Autonomy Mode**: full", "- **Intent Autonomy Mode**: none")
      .replace(
        "- **Construction Autonomy Mode**: autonomous",
        "- **Construction Autonomy Mode**: gated",
      );
  }
  if (autonomy === "semi") {
    return base.replace("- **Intent Autonomy Mode**: full", "- **Intent Autonomy Mode**: semi");
  }
  if (autonomy === "autonomous") return base;
  return base
    .replace("- **Intent Autonomy Mode**: full\n", "")
    .replace(
      "- **Construction Autonomy Mode**: autonomous",
      `- **Construction Autonomy Mode**: ${autonomy}`,
    );
}

/** Seed a multi-batch code-generation project under an arbitrary autonomy value. */
function seedAutonomyProject(batches: string[][], autonomy: string): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), codegenStateWithAutonomy(autonomy));
  seedMultiBatchDag(proj, batches);
  return proj;
}

/** Record batch approvals the way `amadeus-bolt approve-batch` does. */
function recordBatchApprovals(proj: string, batches: number[]): void {
  const path = seededStateFile(proj);
  writeFileSync(
    path,
    readFileSync(path, "utf-8").replace(
      "- **Status**: Running",
      `- **Status**: Running\n- **Swarm Gated Batch Approvals**: ${batches.join(", ")}`,
    ),
  );
}

describe("t211 Intent-scoped autonomy preserves batch fanout", () => {
  test("d: none + gated Construction scheduling fans the first batch out", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "gated");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha"]);
  });

  test("e: gated scheduling requires approval after the completed batch", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "gated");
    coverUnit(proj, "alpha");
    const directive = runNext(proj);
    expect(directive.kind).toBe("ask");
    expect(directive.question).toContain("Approve batch 1");
  });

  test("f: a recorded batch approval lets gated scheduling continue fanout", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "gated");
    coverUnit(proj, "alpha");
    recordBatchApprovals(proj, [1]);
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
  });

  test("g: malformed approvals fail closed and keep the batch gate", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "gated");
    coverUnit(proj, "alpha");
    const path = seededStateFile(proj);
    writeFileSync(
      path,
      readFileSync(path, "utf-8").replace(
        "- **Status**: Running",
        "- **Status**: Running\n- **Swarm Gated Batch Approvals**: one, 0, -1",
      ),
    );
    const directive = runNext(proj);
    expect(directive.kind).toBe("ask");
    expect(directive.question).toContain("Approve batch 1");
  });

  test("h: gated + every batch covered -> the stage's own gate", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "gated");
    coverUnit(proj, "alpha");
    coverUnit(proj, "beta");
    recordBatchApprovals(proj, [1]);
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(directive.kind).not.toBe("ask");
  });

  // RFC-0001 FR-5/FR-6: semi keeps its two human milestones, and its Bolt swarm
  // runs — so the batch-end gate that used to hold semi is gone.
  test("d1: semi projects to autonomous and fans the first batch out", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "semi");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha"]);
  });

  test("e1: semi continues to the next batch without a batch approval", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "semi");
    coverUnit(proj, "alpha");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
  });

  test("i: full ignores the legacy approvals ledger entirely", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "autonomous");
    coverUnit(proj, "alpha");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
  });

  test("j: explicit none preserves DAG fanout for independent units", () => {
    const proj = seedAutonomyProject([["alpha", "beta"]], "");
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha", "beta"]);
  });

  test("k: an unrecognised autonomy value reads as unset (never fans out)", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "Autonomous");
    const directive = runNext(proj);
    expect(directive.kind).not.toBe("invoke-swarm");
  });

  test("l: gated batch coverage is NOT refused by the all-units coverage guard", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "gated");
    coverUnit(proj, "alpha");
    const directive = runReport(proj, ["--stage", "code-generation", "--result", "approved"]);
    expect(directive.kind).not.toBe("error");
  });

  test("m: explicit none is not subject to the legacy serial all-units coverage guard", () => {
    const proj = seedAutonomyProject([["alpha"], ["beta"]], "");
    coverUnit(proj, "alpha");
    const directive = runReport(proj, ["--stage", "code-generation", "--result", "approved"]);
    expect(directive.kind).not.toBe("error");
  });
});

// RFC-0001 ADR-8: the solo auto-election trigger is DERIVED from the declared
// Intent Autonomy Mode (deriveSoloElectionTrigger: "semi"/"full" -> "auto"),
// not read from config any more — there is no config leaf to write. The base
// fixture (autonomousCodegenState via seedSwarmProject/seedFailedSoloUnit)
// already declares "full", so tests only need this helper when they want a
// DIFFERENT mode than that default.
function writeDeclaredIntentAutonomyMode(proj: string, mode: "none" | "semi" | "full"): void {
  const path = seededStateFile(proj);
  writeFileSync(
    path,
    readFileSync(path, "utf-8").replace(/- \*\*Intent Autonomy Mode\*\*: \w+/, `- **Intent Autonomy Mode**: ${mode}`),
  );
}

describe("t211 #2976 solo auto-election on Unit failure", () => {
  test("Intent Autonomy Mode full (the fixture default) emits execute-failure-election instead of ask", () => {
    const { proj, attempt, batch } = seedFailedSoloUnit();
    const directive = runNext(proj);
    expect(directive.kind).not.toBe("ask");
    expect(directive).toMatchObject({
      kind: "execute-failure-election",
      stage: "code-generation",
      unit: "alpha",
      attempt,
      batch,
      choices: ["Retry", "Skip", "Abort"],
    });
  });

  test("Intent Autonomy Mode semi also emits execute-failure-election", () => {
    const { proj } = seedFailedSoloUnit();
    writeDeclaredIntentAutonomyMode(proj, "semi");
    expect(runNext(proj).kind).toBe("execute-failure-election");
  });

  test("Intent Autonomy Mode none keeps the ordinary ask", () => {
    const { proj } = seedFailedSoloUnit();
    writeDeclaredIntentAutonomyMode(proj, "none");
    expect(runNext(proj)).toMatchObject({
      kind: "ask",
      question: expect.stringContaining("Retry, Skip, or Abort"),
    });
  });

  // The pre-RFC "intent config overrides project layer" and "invalid
  // auto-election config" scenarios no longer have a structural analogue:
  // ADR-8 collapsed the two independent axes (declared Intent Autonomy Mode,
  // layered solo-election config) into ONE (declared mode only) — there is no
  // second layer left to override, and no config leaf left to be invalid.

  test.each([
    ["Retry", "committed"],
    ["Skip", "committed"],
    ["Abort", "parked"],
  ] as const)("auto-election %s ruling commits through the existing report path", (ruling, kind) => {
    const { proj, attempt } = seedFailedSoloUnit();
    expect(runNext(proj).kind).toBe("execute-failure-election");
    expect(runFailureRuling(proj, ruling)).toMatchObject({ kind });
    const audit = auditAttributes(proj);
    expect(audit).toContainEqual(expect.objectContaining({
      Event: "BOLT_FAILED",
      "Attempt Id": attempt,
    }));
    if (ruling === "Retry") {
      expect(audit.filter((row) => row.Event === "BOLT_STARTED")).toHaveLength(2);
    } else if (ruling === "Skip") {
      expect(audit).toContainEqual(expect.objectContaining({
        Event: "BOLT_COMPLETED",
        "Attempt Id": attempt,
        Outcome: "cancelled",
        Reason: "skipped",
      }));
    } else {
      expect(audit).toContainEqual(expect.objectContaining({
        Event: "BOLT_FAILED",
        "Attempt Id": attempt,
        Reason: "aborted",
      }));
    }
  });
});
