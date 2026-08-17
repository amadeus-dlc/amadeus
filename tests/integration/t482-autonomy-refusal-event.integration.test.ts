// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts(recordAutonomyRefusalAtGateOpen), event:INTENT_AUTONOMY_HUMAN_REQUIRED
// size: medium
//
// FR-2a (u1-autonomy-core) and FR-2 (#3152). authorizeInteraction has always
// answered WHY it refused — SCOPE_OUT or MODE_REQUIRES_HUMAN — but nothing
// consumed the answer, so a run that stopped for a human left no record of what
// stopped it. These tests read the emitted row straight out of the audit shard.
//
// Where the row is written from is the #3152 half: the declaration belongs to
// the moment the gate is PRESENTED, not to every read of the projection. So the
// suite pins three things at once — the row still carries its reason, reading
// the projection writes nothing at all, and one presentation produces exactly
// one row however many times it is read or re-opened.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  applyProductionAutonomyMode,
  productionStageAutonomy,
  recordAutonomyRefusalAtGateOpen,
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

// One CLI invocation against the project's own shipped tool tree.
function tool(projectDir: string, name: string, args: readonly string[]) {
  return spawnSync(BUN, [join(projectDir, ".claude", "tools", name), ...args], {
    cwd: projectDir,
    encoding: "utf8",
    env: { ...process.env },
  });
}

function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const result = tool(projectDir, "amadeus-utility.ts", [
    "intent-birth",
    "--scope",
    "feature",
    "--project-dir",
    projectDir,
  ]);
  expect(result.status ?? -1).toBe(0);
  return projectDir;
}

// A born Intent whose mode is semi — the mode that decides routine stage gates
// on its own and still stops at the milestones.
function semiProject(): string {
  const projectDir = bornProject();
  appendHumanTurn(projectDir);
  expect(applyProductionAutonomyMode({
    projectDir,
    stateContent: state(projectDir),
    mode: "semi",
  })).toMatchObject({ ok: true, projection: { mode: "semi" } });
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
function fieldRows(projectDir: string, event: string): readonly Record<string, string>[] {
  return auditRows(projectDir)
    .map((row) => (row.attributes ?? row.fields) as Record<string, string> | undefined)
    .filter((fields): fields is Record<string, string> => fields?.Event === event);
}

function refusalRows(projectDir: string): readonly Record<string, string>[] {
  return fieldRows(projectDir, "INTENT_AUTONOMY_HUMAN_REQUIRED");
}

function stageAutonomy(projectDir: string, over: { stage?: string; phaseBoundary?: boolean } = {}) {
  return productionStageAutonomy({
    projectDir,
    stage: over.stage ?? "intent-capture",
    phase: "ideation",
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
describe("opening a gate the mode cannot decide records the reason (FR-2a)", () => {
  test("an Intent with no declared mode records the refusal at gate open", () => {
    projectDir = bornProject();

    expect(tool(projectDir, "amadeus-state.ts", ["gate-start", "intent-capture"]).status).toBe(0);

    const rows = refusalRows(projectDir);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      "Interaction Kind": "stage-gate",
      "Stage slug": "intent-capture",
      Reason: "MODE_REQUIRES_HUMAN",
      Mode: "none",
    });
    expect(rows[0]?.["Idempotency Key"]).toMatch(/^autonomy-refusal-[0-9a-f]{32}$/);
    // The vocabulary is exactly two values (finding 3: AUTHORITY_BOUNDARY does
    // not exist), so anything else here is a new reason nobody declared.
    expect(["SCOPE_OUT", "MODE_REQUIRES_HUMAN"]).toContain(rows[0]?.Reason);
  });

  test("a semi Intent stopping at a phase gate records the out-of-scope reason", () => {
    projectDir = semiProject();

    // approval-handoff is the last ideation stage in a feature scope, so its
    // gate is the phase boundary semi leaves to the human.
    expect(tool(projectDir, "amadeus-state.ts", [
      "checkbox",
      "intent-capture=completed",
      "approval-handoff=in-progress",
    ]).status).toBe(0);
    expect(tool(projectDir, "amadeus-state.ts", ["gate-start", "approval-handoff"]).status).toBe(0);

    const rows = refusalRows(projectDir);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      "Interaction Kind": "phase-gate",
      Reason: "SCOPE_OUT",
      Mode: "semi",
    });
  });

  test("a semi Intent opening a routine stage gate records nothing", () => {
    projectDir = semiProject();

    expect(tool(projectDir, "amadeus-state.ts", ["gate-start", "intent-capture"]).status).toBe(0);

    expect(refusalRows(projectDir)).toEqual([]);
  });
});

// The #3152 defect: the declaration was written from the projection READ, so
// every `next` — a read that presents nothing to anyone — appended another row.
describe("reading the projection writes nothing (FR-2b, #3152)", () => {
  test("five `next` runs with no gate open leave the ledger untouched", () => {
    projectDir = bornProject();

    for (let run = 0; run < 5; run += 1) {
      expect(tool(projectDir, "amadeus-orchestrate.ts", ["next"]).status).toBe(0);
    }

    expect(refusalRows(projectDir)).toEqual([]);
    // The gate really was never opened — otherwise the count above would be
    // measuring the wrong absence.
    expect(fieldRows(projectDir, "STAGE_AWAITING_APPROVAL")).toEqual([]);
  });

  test("the in-process read seam is pure and answers the same every time", () => {
    projectDir = bornProject();

    const first = stageAutonomy(projectDir);
    for (let read = 0; read < 4; read += 1) {
      expect(stageAutonomy(projectDir)).toEqual(first);
    }

    expect(first.autoApprove).toBe(false);
    expect(first.authorizationReason).toBe("MODE_REQUIRES_HUMAN");
    expect(refusalRows(projectDir)).toEqual([]);
  });
});

// The occurrence boundary (ADR-2 contract 5). A presentation ends when the gate
// is RESOLVED, so re-opening an unresolved gate — a retried gate-start, a
// backfilled gate row — is the same stop and collapses to one row, while a
// re-presentation after a rejection is a second stop and earns its own.
describe("one presentation is one row (FR-2b, #3152)", () => {
  test("re-opening and re-reading inside one presentation collapse to a single row", () => {
    projectDir = bornProject();

    expect(tool(projectDir, "amadeus-state.ts", ["gate-start", "intent-capture"]).status).toBe(0);
    stageAutonomy(projectDir);
    stageAutonomy(projectDir);
    // The gate open is retried — the shape a gate-start whose state write never
    // landed leaves behind.
    expect(tool(projectDir, "amadeus-state.ts", ["checkbox", "intent-capture=in-progress"]).status).toBe(0);
    expect(tool(projectDir, "amadeus-state.ts", ["gate-start", "intent-capture"]).status).toBe(0);
    stageAutonomy(projectDir);

    expect(refusalRows(projectDir).length).toBe(1);
  });

  test("a gate backfilled by a rejection counts as the presentation it records", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    // Rejecting a stage nobody opened backfills the gate row gate-start would
    // have written — the human being asked is the one rejecting it.
    expect(tool(projectDir, "amadeus-state.ts", ["reject", "intent-capture", "--feedback", "redo"]).status).toBe(0);
    expect(tool(projectDir, "amadeus-state.ts", ["revise", "intent-capture"]).status).toBe(0);

    expect(fieldRows(projectDir, "STAGE_AWAITING_APPROVAL").length).toBe(2);
    expect(refusalRows(projectDir).length).toBe(2);
  });

  test("a re-presentation after a rejection is a new occurrence with its own row", () => {
    projectDir = bornProject();
    appendHumanTurn(projectDir);

    expect(tool(projectDir, "amadeus-state.ts", ["gate-start", "intent-capture"]).status).toBe(0);
    expect(tool(projectDir, "amadeus-state.ts", ["reject", "intent-capture", "--feedback", "redo"]).status).toBe(0);
    expect(tool(projectDir, "amadeus-state.ts", ["revise", "intent-capture"]).status).toBe(0);

    const rows = refusalRows(projectDir);
    // Two presentations, two rows: the count is what "how often was a human
    // stopped here" reads off the ledger.
    expect(rows.length).toBe(2);
    expect(fieldRows(projectDir, "STAGE_AWAITING_APPROVAL").length).toBe(2);
    expect(new Set(rows.map((row) => row["Idempotency Key"])).size).toBe(2);
  });
});

// Fail-open (BR-U1-6): the refusal is the safe answer and the caller is already
// on its way to the human gate, so nothing about recording it may raise.
describe("recording the refusal can never break the gate open (BR-U1-6)", () => {
  test("a project with no active Intent records nothing and does not throw", () => {
    projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });

    expect(() => recordAutonomyRefusalAtGateOpen({
      projectDir,
      stage: "intent-capture",
      phase: "ideation",
      graphRevision: GRAPH_REVISION,
      walkingSkeleton: false,
      stateContent: "",
    })).not.toThrow();
  });

  test("an occurrence that cannot even be built records nothing and does not throw", () => {
    projectDir = bornProject();

    // A graph revision that is not a sha256 makes createInteractionOccurrence
    // throw — the deepest failure this path can hit before any emit.
    expect(() => recordAutonomyRefusalAtGateOpen({
      projectDir,
      stage: "intent-capture",
      phase: "ideation",
      graphRevision: "not-a-digest",
      walkingSkeleton: false,
      stateContent: state(projectDir),
    })).not.toThrow();
    expect(refusalRows(projectDir)).toEqual([]);
  });
});
