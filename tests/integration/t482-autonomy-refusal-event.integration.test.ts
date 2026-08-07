// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts(productionStageAutonomy), event:INTENT_AUTONOMY_HUMAN_REQUIRED
// size: medium
//
// FR-2a (u1-autonomy-core). authorizeInteraction has always answered WHY it
// refused — SCOPE_OUT or MODE_REQUIRES_HUMAN — but nothing consumed the answer,
// so a run that stopped for a human left no record of what stopped it. These
// tests read the emitted row straight out of the audit shard, and pin that the
// authorization result itself is unchanged by the observation.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  applyProductionAutonomyMode,
  productionStageAutonomy,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";

const BUN = process.execPath;
const GRAPH_REVISION = `sha256:${"0".repeat(64)}`;

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return join(intents, active);
}

function state(projectDir: string): string {
  return readFileSync(join(recordDir(projectDir), "amadeus-state.md"), "utf8");
}

function appendHumanTurn(projectDir: string): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "refusal-event-test.jsonl");
  const seq = existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1 : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "refusal-event-test",
    intentId: "refusal-event-test",
    timestamp: new Date().toISOString(),
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`);
}

function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const result = spawnSync(
    BUN,
    [
      join(projectDir, ".claude", "tools", "amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "feature",
      "--project-dir",
      projectDir,
    ],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  expect(result.status ?? -1).toBe(0);
  return projectDir;
}

// Every audit row across every shard, newest last.
function auditRows(projectDir: string): readonly Record<string, unknown>[] {
  const auditDir = join(recordDir(projectDir), "audit");
  if (!existsSync(auditDir)) return [];
  return readdirSync(auditDir)
    .filter((name) => name.endsWith(".jsonl"))
    .flatMap((name) => readFileSync(join(auditDir, name), "utf8").split("\n").filter(Boolean))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

// The canonical writer emits v2 rows: the event name lives in `attributes.Event`
// and the payload is `attributes` itself (v1 rows, which the fixtures append by
// hand, carry `event` / `fields` instead).
function refusalRows(projectDir: string): readonly Record<string, string>[] {
  return auditRows(projectDir)
    .map((row) => (row.attributes ?? row.fields) as Record<string, string> | undefined)
    .filter((fields): fields is Record<string, string> => fields?.Event === "INTENT_AUTONOMY_HUMAN_REQUIRED");
}

function stageAutonomy(projectDir: string, over: { stage?: string; phaseBoundary?: boolean } = {}) {
  return productionStageAutonomy({
    projectDir,
    stage: over.stage ?? "code-generation",
    phase: "construction",
    graphRevision: GRAPH_REVISION,
    walkingSkeleton: false,
    phaseBoundary: over.phaseBoundary,
  });
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

// Which reason each scenario produces is a property of authorizeInteraction,
// which this unit must not change (BR-U1-5). Measured against that function:
// a semi Intent refuses a phase gate at amadeus-intent-autonomy.ts:740-741,
// because phase-gate is outside SEMI_ROUTINE_INTERACTIONS — that is SCOPE_OUT.
// An Intent with no declared mode refuses at :734 — MODE_REQUIRES_HUMAN.
// (requirements.md FR-2a names these the other way round; the values below are
// the measured ones, and the discrepancy is reported rather than papered over.)
describe("a refusal to auto-approve is recorded with its reason (FR-2a)", () => {
  test("a semi Intent stopping at a phase gate records the out-of-scope reason", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });

    const context = stageAutonomy(projectDir, { phaseBoundary: true });
    expect(context.autoApprove).toBe(false);

    const rows = refusalRows(projectDir);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      "Interaction Kind": "phase-gate",
      Reason: "SCOPE_OUT",
      Mode: "semi",
    });
  });

  test("an Intent with no declared mode records the refusal too", () => {
    projectDir = bornProject();

    const context = stageAutonomy(projectDir);
    expect(context.autoApprove).toBe(false);

    const rows = refusalRows(projectDir);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      "Interaction Kind": "stage-gate",
      "Stage slug": "code-generation",
      Reason: "MODE_REQUIRES_HUMAN",
      Mode: "none",
    });
    // The vocabulary is exactly two values (finding 3: AUTHORITY_BOUNDARY does
    // not exist), so anything else here is a new reason nobody declared.
    expect(["SCOPE_OUT", "MODE_REQUIRES_HUMAN"]).toContain(rows[0]?.Reason);
  });

  test("a semi Intent auto-approving a routine stage gate records nothing", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });

    expect(stageAutonomy(projectDir).autoApprove).toBe(true);
    expect(refusalRows(projectDir)).toEqual([]);
  });
});

describe("the observation cannot change the authorization (FR-2a iii, BR-U1-5)", () => {
  test("the context is identical whether or not the row lands", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);
    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent: state(projectDir),
      mode: "semi",
    })).toMatchObject({ ok: true, projection: { mode: "semi" } });

    const withEmit = stageAutonomy(projectDir, { phaseBoundary: true });
    expect(refusalRows(projectDir).length).toBe(1);

    // Take the shards away from the writer (read-only on the files themselves —
    // a read-only DIRECTORY does not stop an append to a file already in it).
    // The emit fails; the authorization must not notice (fail-open — BR-U1-6).
    const auditDir = join(recordDir(projectDir), "audit");
    const shards = readdirSync(auditDir).filter((name) => name.endsWith(".jsonl"));
    expect(shards.length).toBeGreaterThan(0);
    for (const name of shards) chmodSync(join(auditDir, name), 0o444);
    chmodSync(auditDir, 0o500);
    let withoutEmit: ReturnType<typeof stageAutonomy>;
    try {
      withoutEmit = stageAutonomy(projectDir, { phaseBoundary: true });
    } finally {
      chmodSync(auditDir, 0o700);
      for (const name of shards) chmodSync(join(auditDir, name), 0o644);
    }

    expect(withoutEmit).toEqual(withEmit);
    // Still exactly the one row from before: the second attempt wrote nothing.
    expect(refusalRows(projectDir).length).toBe(1);
  });
});
