// covers: subcommand:amadeus-state:complete-workflow, function:buildAutoDecisionSummary
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createAuditIntentAutonomyRepository,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";
import {
  autonomyDigest,
  createAutonomyProjection,
  type AutoDecisionRecord,
  type AutonomyProjection,
  type DecisionBasisKind,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  cleanupTestProject,
  createTestProject,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const UTIL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-utility.ts");
const STATE = join(ROOT, "packages", "framework", "core", "tools", "amadeus-state.ts");
const GOAL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-goal.ts");
const STAGE_GRAPH = join(ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const SCOPE_GRID = join(ROOT, "dist", "claude", ".claude", "tools", "data", "scope-grid.json");
const projects: string[] = [];

const toolEnv = {
  ...process.env,
  AMADEUS_STAGE_GRAPH: STAGE_GRAPH,
  AMADEUS_SCOPE_GRID: SCOPE_GRID,
};

afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

function birth(): { project: string; record: string; intentUuid: string } {
  const project = createTestProject();
  projects.push(project);
  const result = spawnSync(
    process.execPath,
    [
      UTIL,
      "intent-birth",
      "--scope",
      "fix",
      "--arguments",
      "Ship a verified completion-report summary",
      "--project-dir",
      project,
    ],
    { encoding: "utf8", env: toolEnv },
  );
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  const intents = join(project, "amadeus", "spaces", "default", "intents");
  const record = readFileSync(join(intents, "active-intent"), "utf8").trim();
  const registry = JSON.parse(readFileSync(join(intents, "intents.json"), "utf8")) as Array<{
    dirName?: string;
    uuid: string;
  }>;
  const intentUuid = registry.find((entry) => entry.dirName === record)?.uuid;
  if (!intentUuid) throw new Error("intent uuid not found in registry");
  return { project, record, intentUuid };
}

// Directly commits AUTO_DECIDED transactions into the record's real audit
// shard via the same repository the production ladder uses — no engine
// machinery is exercised, only the audit-row shape buildAutoDecisionSummary
// reads back. assertLegalAutonomyProjection does not constrain autoDecisions
// contents, so plain-literal AutoDecisionRecord fixtures are legitimate here.
function seedAutoDecisions(
  project: string,
  record: string,
  intentUuid: string,
  specs: readonly { readonly decisionId: string; readonly basisKind: DecisionBasisKind }[],
): void {
  // Each test births a fresh project dir; the emitAuditEventGuarded call
  // inside createAuditIntentAutonomyRepository's onCommit bootstraps OTel for
  // whichever project dir it sees first in this process, and the one-
  // workspace-per-process invariant then refuses every later project.
  resetOtelPerProject();
  const repo = createAuditIntentAutonomyRepository({ projectDir: project, intent: record, space: "default" });
  let before: AutonomyProjection = createAutonomyProjection({ intentUuid });
  for (const spec of specs) {
    const decision: AutoDecisionRecord = {
      decisionId: spec.decisionId,
      occurrenceId: `occ-${spec.decisionId}`,
      question: "fixture question",
      optionIds: ["accept", "reject"],
      selectedOptionId: "accept",
      decider: "deterministic-engine",
      basisKind: spec.basisKind,
      basisFingerprint: autonomyDigest(spec.decisionId),
      principalId: "system-default",
      actorId: "codex",
      grantId: null,
      degradedCapability: null,
      reviewState: "not-applicable",
    };
    const after: AutonomyProjection = {
      ...before,
      autoDecisions: [...before.autoDecisions, decision],
      projectionRevision: before.projectionRevision + 1,
    };
    repo.commit({
      schemaVersion: 1,
      transactionId: `fixture-${spec.decisionId}`,
      intentUuid,
      expectedRevision: before.projectionRevision,
      beforeProjection: before,
      beforeProjectionDigest: autonomyDigest(before),
      afterProjectionDigest: autonomyDigest(after),
      events: [{ type: "AUTO_DECIDED", decision }],
      projection: after,
    });
    before = after;
  }
}

function reconcileAchieved(project: string, finalStage = "build-and-test"): void {
  const evidencePath = join(project, "goal-proof.txt");
  const evidence = "goal guard verified\n";
  writeFileSync(evidencePath, evidence);
  const itemsPath = join(project, "goal-items.json");
  writeFileSync(
    itemsPath,
    JSON.stringify([
      {
        id: "goal-statement",
        verdict: "ACHIEVED",
        evidence: [
          {
            kind: "deterministic-check",
            reference: "goal-proof.txt",
            digest: createHash("sha256").update(evidence).digest("hex"),
          },
        ],
      },
    ]),
  );
  const reconcile = spawnSync(
    process.execPath,
    [GOAL, "reconcile", "--items", itemsPath, "--final-stage", finalStage, "--project-dir", project],
    { encoding: "utf8", env: toolEnv },
  );
  expect(reconcile.status, `${reconcile.stdout}${reconcile.stderr}`).toBe(0);
}

function runComplete(project: string): { status: number | null; json: Record<string, unknown> } {
  const result = spawnSync(
    process.execPath,
    [STATE, "complete-workflow", "build-and-test", "--project-dir", project],
    {
      encoding: "utf8",
      env: {
        ...toolEnv,
        AMADEUS_SKIP_ARTIFACT_GUARD: "1",
        AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
      },
    },
  );
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  return { status: result.status, json: JSON.parse(result.stdout) };
}

describe("completion-report: auto-decision summary at workflow completion (C9/ADR-3)", () => {
  test("complete-workflow reports the exact AUTO_DECIDED count and basisKind breakdown from the audit trail", () => {
    const { project, record, intentUuid } = birth();
    seedAutoDecisions(project, record, intentUuid, [
      { decisionId: "d1", basisKind: "grant-gate" },
      { decisionId: "d2", basisKind: "grant-gate" },
      { decisionId: "d3", basisKind: "grant-gate" },
      { decisionId: "d4", basisKind: "confirmed-policy" },
      { decisionId: "d5", basisKind: "confirmed-policy" },
    ]);
    reconcileAchieved(project);
    const { json } = runComplete(project);

    expect(json.auto_decision_summary_warning).toBeNull();
    expect(typeof json.auto_decision_summary).toBe("string");
    const summaryPath = join(
      project,
      "amadeus",
      "spaces",
      "default",
      "intents",
      record,
      json.auto_decision_summary as string,
    );
    const summaryMd = readFileSync(summaryPath, "utf8");
    expect(summaryMd).toContain("Total AUTO_DECIDED: 5");
    expect(summaryMd).toMatch(/\| grant-gate \| 3 \|/);
    expect(summaryMd).toMatch(/\| confirmed-policy \| 2 \|/);
    // The review-state aggregation is transcribed, never collapsed: the review
    // lifecycle resolves every listed item to not-applicable here, so a lost
    // byReviewState accumulation would surface as a zero row.
    expect(summaryMd).toMatch(/\| not-applicable \| 5 \|/);
    expect(summaryMd).toMatch(/\| unreviewed \| 0 \|/);
  });

  test("complete-workflow completes with no AUTO_DECIDED audit rows present (current behaviour, pre-summary Red baseline)", () => {
    const { project, record } = birth();
    reconcileAchieved(project);
    const { json } = runComplete(project);
    expect(json.status).toBe("Completed");
    // The zero-decision summary is still generated, not skipped with a warning.
    expect(json.auto_decision_summary_warning).toBeNull();
    expect(typeof json.auto_decision_summary).toBe("string");
    const summaryMd = readFileSync(
      join(project, "amadeus", "spaces", "default", "intents", record, json.auto_decision_summary as string),
      "utf8",
    );
    expect(summaryMd).toContain("Total AUTO_DECIDED: 0");
  });

  test("non-blocking: a write failure at the summary path does not fail complete-workflow", () => {
    const { project, record, intentUuid } = birth();
    seedAutoDecisions(project, record, intentUuid, [{ decisionId: "d1", basisKind: "grant-gate" }]);
    // Occupy <recordDir>/completion with a plain FILE before completion runs,
    // so writeAutoDecisionSummaryMarkdown's mkdirSync(..., {recursive:true})
    // hits ENOTDIR — a disk-level write failure (R-3's own example), isolated
    // to the completion-report write step alone (nothing else in
    // complete-workflow reads or writes under <recordDir>/completion).
    const recordDir = join(project, "amadeus", "spaces", "default", "intents", record);
    writeFileSync(join(recordDir, "completion"), "occupied by a file, not a directory\n");
    reconcileAchieved(project);
    const { json } = runComplete(project);

    expect(json.status).toBe("Completed");
    expect(json.auto_decision_summary).toBeNull();
    expect(typeof json.auto_decision_summary_warning).toBe("string");
    expect(json.auto_decision_summary_warning as string).toContain("write-failed");
  });
});

// In-process arm coverage (spawned CLI runs do not register bun coverage):
// the shard-reader tolerances, the pagination cursor, the write-failure arm
// and the completion helper's warning arms are exercised directly here.
import { mkdirSync, rmSync } from "node:fs";
import {
  buildAutoDecisionSummary,
  writeAutoDecisionSummaryMarkdown,
} from "../../packages/framework/core/tools/amadeus-completion-report.ts";
import { generateAutoDecisionSummaryOutcome } from "../../packages/framework/core/tools/amadeus-state.ts";

describe("completion-report: direct arm coverage", () => {
  test("a record dir without an audit dir summarises to zero decisions", () => {
    const { project, record } = birth();
    const recordDir = join(project, "amadeus", "spaces", "default", "intents", record);
    // remove the audit/ dir so the readdir catch returns [].
    rmSync(join(recordDir, "audit"), { recursive: true, force: true });
    const built = buildAutoDecisionSummary(project, recordDir);
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.summary.totalAutoDecided).toBe(0);
  });

  test("a shard entry that is a directory is skipped, not fatal", () => {
    const { project, record, intentUuid } = birth();
    seedAutoDecisions(project, record, intentUuid, [{ decisionId: "d-dir", basisKind: "grant-gate" }]);
    const recordDir = join(project, "amadeus", "spaces", "default", "intents", record);
    mkdirSync(join(recordDir, "audit", "ghost.jsonl"), { recursive: true });
    const built = buildAutoDecisionSummary(project, recordDir);
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.summary.totalAutoDecided).toBe(1);
  });

  test("the pagination cursor advances across a second page", () => {
    const { project, record, intentUuid } = birth();
    const specs = Array.from({ length: 101 }, (_, i) => ({
      decisionId: `d-${String(i).padStart(3, "0")}`,
      basisKind: "grant-gate" as DecisionBasisKind,
    }));
    seedAutoDecisions(project, record, intentUuid, specs);
    const built = buildAutoDecisionSummary(
      project,
      join(project, "amadeus", "spaces", "default", "intents", record),
    );
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.summary.totalAutoDecided).toBe(101);
      // The listing walked past the first page: a truncated list would leave a
      // count mismatch and a short review-state tally.
      expect(built.summary.countMismatch).toBeNull();
      expect(built.summary.byReviewState["not-applicable"]).toBe(101);
    }
  });

  test("a completion path squatted by a file yields write-failed", () => {
    const { project, record, intentUuid } = birth();
    seedAutoDecisions(project, record, intentUuid, [{ decisionId: "d-wf", basisKind: "grant-gate" }]);
    const recordDir = join(project, "amadeus", "spaces", "default", "intents", record);
    writeFileSync(join(recordDir, "completion"), "a file, not a directory");
    const built = buildAutoDecisionSummary(project, recordDir);
    expect(built.ok).toBe(true);
    if (built.ok) {
      const written = writeAutoDecisionSummaryMarkdown(recordDir, built.summary);
      expect(written.ok).toBe(false);
    }
  });

  test("the completion helper resolves every branch to a warning, never a throw", () => {
    const { project, record, intentUuid } = birth();
    // null record dir -> record-dir-unresolved
    const unresolved = generateAutoDecisionSummaryOutcome(project, null);
    expect(unresolved.path).toBeNull();
    expect(unresolved.warning).toContain("record-dir-unresolved");
    // squatted completion path -> write-failed warning through the helper
    seedAutoDecisions(project, record, intentUuid, [{ decisionId: "d-h", basisKind: "grant-gate" }]);
    const recordDir = join(project, "amadeus", "spaces", "default", "intents", record);
    writeFileSync(join(recordDir, "completion"), "a file, not a directory");
    const failed = generateAutoDecisionSummaryOutcome(project, recordDir);
    expect(failed.path).toBeNull();
    expect(failed.warning).toContain("write-failed");
  });
});
