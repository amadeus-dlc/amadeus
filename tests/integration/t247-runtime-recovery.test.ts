// covers: runtime-recovery:production-paths
// @test-size medium

import { normalizeAuditRecord } from "../harness/audit-records.ts";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import * as nodeFs from "node:fs";
import {
  appendFileSync,
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleApprove } from "../../packages/framework/core/tools/amadeus-state.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
  seededAuditShard,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const ORCHESTRATE = join(ROOT, "packages/framework/core/tools/amadeus-orchestrate.ts");
const STATE = join(ROOT, "packages/framework/core/tools/amadeus-state.ts");
const STAGE_GRAPH = join(ROOT, "dist/claude/.claude/tools/data/stage-graph.json");
const SCOPE_GRID = join(ROOT, "dist/claude/.claude/tools/data/scope-grid.json");
const projects: string[] = [];
const tempDirs: string[] = [];

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureRun(fn: () => void): { code: number | null; stdout: string; stderr: string } {
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;
  let code: number | null = null;
  let stdout = "";
  let stderr = "";
  process.exit = ((value?: number) => {
    throw new ExitSignal(value ?? 0);
  }) as typeof process.exit;
  console.log = (...args: unknown[]) => {
    stdout += `${args.map(String).join(" ")}\n`;
  };
  console.error = (...args: unknown[]) => {
    stderr += `${args.map(String).join(" ")}\n`;
  };
  try {
    fn();
  } catch (error) {
    if (error instanceof ExitSignal) code = error.code;
    else throw error;
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  }
  return { code, stdout, stderr };
}

function inProject(
  project: string,
  fn: () => void,
  options: { readonly skipHumanGuard?: boolean } = { skipHumanGuard: true },
) {
  const keys = [
    "CLAUDE_PROJECT_DIR",
    "AMADEUS_STAGE_GRAPH",
    "AMADEUS_SCOPE_GRID",
    "AMADEUS_SCOPE_MAPPING",
    "AMADEUS_SKIP_ARTIFACT_GUARD",
    "AMADEUS_SKIP_HUMAN_PRESENCE_GUARD",
  ] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.CLAUDE_PROJECT_DIR = project;
  process.env.AMADEUS_STAGE_GRAPH = STAGE_GRAPH;
  process.env.AMADEUS_SCOPE_GRID = SCOPE_GRID;
  process.env.AMADEUS_SCOPE_MAPPING = SCOPE_GRID;
  process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  if (options.skipHumanGuard === false) delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  else process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
  try {
    return captureRun(fn);
  } finally {
    for (const key of keys) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

afterEach(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

function run(
  tool: string,
  project: string,
  args: string[],
  envOverrides: Record<string, string> = {},
) {
  return spawnSync(process.execPath, [amadeusToolTarget(tool), ...args, "--project-dir", project], {
    cwd: project,
    encoding: "utf-8",
    env: {
      ...process.env,
      AMADEUS_STAGE_GRAPH: STAGE_GRAPH,
      AMADEUS_SCOPE_GRID: SCOPE_GRID,
      AMADEUS_SCOPE_MAPPING: SCOPE_GRID,
      AMADEUS_SKIP_ARTIFACT_GUARD: "1",
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
      ...envOverrides,
    },
  });
}

function seedDagProject(canonical: string): string {
  const project = createTestProject();
  projects.push(project);
  writeFileSync(
    seededStateFile(project),
    `# AI-DLC State Tracking

## Project Information
- **Project**: runtime recovery
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
- [-] functional-design — EXECUTE
- [ ] nfr-requirements — EXECUTE
- [ ] nfr-design — EXECUTE
- [ ] infrastructure-design — EXECUTE
- [ ] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: functional-design
- **Status**: Running
`,
  );
  writeFileSync(
    join(seededRecordDir(project), "runtime-graph.json"),
    `${JSON.stringify({ bolt_dag: { batches: [["beta"], ["alpha"]] } }, null, 2)}\n`,
  );
  const dependencyDir = join(seededRecordDir(project), "inception", "units-generation");
  mkdirSync(dependencyDir, { recursive: true });
  writeFileSync(join(dependencyDir, "unit-of-work-dependency.md"), canonical);
  return project;
}

interface AuditRecord {
  schemaVersion: number;
  seq: number;
  cloneId: string;
  intentId: string;
  timestamp: string;
  heading: string;
  event: string | null;
  fields?: Record<string, string>;
}

/** Parse a JSONL shard buffer into records (blank lines skipped). */
function parseRecords(body: string): AuditRecord[] {
  return body
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => normalizeAuditRecord(JSON.parse(line)) as unknown as AuditRecord);
}

function readRecords(shardPath: string): AuditRecord[] {
  return parseRecords(readFileSync(shardPath, "utf-8"));
}

/** Records carrying a Transaction Id — the recovery batch's rows. */
function transactionRecords(shardPath: string): AuditRecord[] {
  return readRecords(shardPath).filter(
    (r) => r.fields?.["Transaction Id"] !== undefined,
  );
}

/**
 * Append records to an existing shard, continuing its clone/intent identity and
 * its dense 1-based seq — the ledger invariants a hand-seeded row must keep.
 */
function appendRecords(
  shardPath: string,
  rows: ReadonlyArray<{
    heading: string;
    timestamp: string;
    event: string;
    fields?: Record<string, string>;
  }>,
): void {
  const existing = readRecords(shardPath);
  const last = existing.at(-1);
  const cloneId = last?.cloneId ?? "fixturecloneid01";
  const intentId = last?.intentId ?? "fixture-8000000000000001";
  appendFileSync(
    shardPath,
    rows
      .map((row, index) =>
        `${JSON.stringify({
          schemaVersion: 1,
          seq: existing.length + index + 1,
          cloneId,
          intentId,
          timestamp: row.timestamp,
          heading: row.heading,
          event: row.event,
          fields: row.fields ?? {},
        })}\n`,
      )
      .join(""),
  );
}

/**
 * Rewrite the recovered-feedback field on every record that carries it. The
 * batch's identity hash covers the field values, so this is the minimal
 * length-independent tamper the recovery guard must reject.
 */
function tamperRecoveredFeedback(shardBody: string): string {
  return parseRecords(shardBody)
    .map((r) =>
      r.fields?.Feedback ===
      "Recovered from durable artifact evidence; original feedback was not recorded"
        ? `${JSON.stringify({ ...r, fields: { ...r.fields, Feedback: "tampered" } })}\n`
        : `${JSON.stringify(r)}\n`,
    )
    .join("");
}

function seedRevisionProject(): string {
  const project = createTestProject();
  projects.push(project);
  seedStateFile(project, join(FIXTURES_DIR, "state-mid-ideation.md"));
  expect(run(STATE, project, ["gate-start", "feasibility"]).status).toBe(0);
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  appendRecords(seededAuditShard(project), [
    { heading: "Human Turn", timestamp, event: "HUMAN_TURN" },
    {
      heading: "Artifact Updated",
      timestamp,
      event: "ARTIFACT_UPDATED",
      fields: {
        File: "amadeus/spaces/default/intents/fixture-8000000000000001/ideation/feasibility/feasibility-assessment.md",
      },
    },
  ]);
  return project;
}

function seedPerUnitRevisionProject(updatedUnit: string): string {
  const project = createTestProject();
  projects.push(project);
  seedStateFile(project, join(FIXTURES_DIR, "state-jumped.md"));
  const dependencyDir = join(seededRecordDir(project), "inception", "units-generation");
  mkdirSync(dependencyDir, { recursive: true });
  writeFileSync(
    join(dependencyDir, "unit-of-work-dependency.md"),
    "# Units\n\n```yaml\nunits:\n  - name: unit-a\n    depends_on: []\n  - name: unit-b\n    depends_on: [unit-a]\n```\n",
  );
  expect(run(STATE, project, ["gate-start", "code-generation"]).status).toBe(0);
  appendRecords(seededAuditShard(project), [
    {
      heading: "Human Turn",
      timestamp: "2999-01-01T00:00:00Z",
      event: "HUMAN_TURN",
    },
    {
      heading: "Artifact Updated",
      timestamp: "2999-01-01T00:00:01Z",
      event: "ARTIFACT_UPDATED",
      fields: {
        File: `amadeus/spaces/default/intents/fixture-8000000000000001/construction/${updatedUnit}/code-generation/code-summary.md`,
      },
    },
  ]);
  return project;
}

function seedPhaseCheck(project: string, phase: string): void {
  const verification = join(seededRecordDir(project), "verification");
  mkdirSync(verification, { recursive: true });
  writeFileSync(join(verification, `phase-check-${phase}.md`), `# ${phase} verification\n`);
}

describe("t247 Bolt DAG recovery production path", () => {
  test("stale runtime cache heals read-side and routes the canonical first unit", () => {
    const project = seedDagProject(
      "# Units\n\n```yaml\nunits:\n  - name: alpha\n    depends_on: []\n  - name: beta\n    depends_on: []\n```\n",
    );
    const result = run(ORCHESTRATE, project, ["next"], { AMADEUS_HARNESS_DIR: ".kiro" });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ kind: "run-stage", unit: "alpha" });
    expect(result.stderr).toContain("BOLT_DAG_RECOVERED reason=mismatch batches=1");
    expect(result.stderr).toContain('repair="bun .kiro/tools/amadeus-runtime.ts compile"');
    expect(JSON.parse(readFileSync(join(seededRecordDir(project), "runtime-graph.json"), "utf-8"))).toEqual({
      bolt_dag: { batches: [["beta"], ["alpha"]] },
    });
  });

  test("an existing malformed canonical artifact fails loud", () => {
    const project = seedDagProject("broken\n");
    const result = run(ORCHESTRATE, project, ["next"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Bolt DAG recovery failed (missing-block)");
  });
});

describe("t247 gate revision recovery production path", () => {
  test("approve atomically records recovered revision rows and the normal approval pair", () => {
    const project = seedRevisionProject();

    const result = run(STATE, project, ["approve", "feasibility"]);
    expect(result.status).toBe(0);
    const state = readFileSync(seededStateFile(project), "utf-8");
    expect(state).toContain("- **Revision Count**: 1");
    expect(state).toContain("- [x] feasibility — EXECUTE");

    const transactionRows = transactionRecords(seededAuditShard(project));
    expect(transactionRows.map((r) => r.event)).toEqual([
      "GATE_REJECTED",
      "STAGE_REVISING",
      "STAGE_AWAITING_APPROVAL",
      "GATE_APPROVED",
      "STAGE_COMPLETED",
    ]);
    expect(transactionRows.slice(0, 3).every((r) => r.fields?.Recovered === "true")).toBe(true);
    expect(
      transactionRows
        .slice(0, 2)
        .every(
          (r) =>
            r.fields?.Feedback ===
            "Recovered from durable artifact evidence; original feedback was not recorded",
        ),
    ).toBe(true);
    expect(new Set(transactionRows.map((r) => r.fields?.["Transaction Id"])).size).toBe(1);
  });

  test("a state-write failure retries the complete audit transaction without duplicate rows", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    chmodSync(statePath, 0o444);
    const failed = run(STATE, project, ["approve", "feasibility"]);
    chmodSync(statePath, 0o644);
    expect(failed.status).toBe(1);
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    expect(transactionRecords(auditPath).length).toBe(5);

    const retried = run(STATE, project, ["approve", "feasibility"]);
    expect(retried.status).toBe(0);
    expect(transactionRecords(auditPath).length).toBe(5);
    expect(readFileSync(statePath, "utf-8")).toContain("- **Revision Count**: 1");
    expect(readFileSync(statePath, "utf-8")).toContain("- [x] feasibility — EXECUTE");
  });
});

describe("t247 recovery in-process coverage seams", () => {
  test("authored orchestrator heals once and fails loud on an inaccessible or unreadable canonical source", () => {
    const canonical = "# Units\n\n```yaml\nunits:\n  - name: alpha\n    depends_on: []\n  - name: beta\n    depends_on: []\n```\n";
    const project = seedDagProject(canonical);
    const healed = inProject(project, () => handleNext([], project));
    expect(healed.code).toBeNull();
    expect(JSON.parse(healed.stdout)).toMatchObject({ kind: "run-stage", unit: "alpha" });
    expect(healed.stderr).toContain("BOLT_DAG_RECOVERED");

    const canonicalPath = join(
      seededRecordDir(project),
      "inception",
      "units-generation",
      "unit-of-work-dependency.md",
    );
    rmSync(canonicalPath);
    const absent = inProject(project, () => handleNext([], project));
    expect(absent.code).toBeNull();
    expect(JSON.parse(absent.stdout)).toMatchObject({ kind: "run-stage", stage: "functional-design" });
    writeFileSync(canonicalPath, canonical);

    const originalExistsSync = nodeFs.existsSync;
    const originalReadFileSync = nodeFs.readFileSync;
    const existsSpy = spyOn(nodeFs, "existsSync").mockImplementation(
      ((path) => String(path) === canonicalPath ? false : originalExistsSync(path)) as typeof nodeFs.existsSync,
    );
    const readSpy = spyOn(nodeFs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (String(path) === canonicalPath) {
          throw Object.assign(new Error("injected canonical access failure"), { code: "EACCES" });
        }
        return originalReadFileSync(path, options);
      }) as typeof nodeFs.readFileSync,
    );
    try {
      expect(() => inProject(project, () => handleNext([], project))).toThrow(
        "Bolt DAG recovery failed (unreadable): injected canonical access failure",
      );
    } finally {
      readSpy.mockRestore();
      existsSpy.mockRestore();
    }

    rmSync(canonicalPath);
    mkdirSync(canonicalPath);
    expect(() => inProject(project, () => handleNext([], project))).toThrow(
      "Bolt DAG recovery failed (unreadable)",
    );
  });

  test("authored approve recovers and replays the committed transaction without duplicate rows", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");

    const approved = inProject(project, () => handleApprove(["feasibility"]));
    expect(approved.code).toBeNull();
    const approvedAudit = readFileSync(auditPath, "utf-8");
    expect(transactionRecords(auditPath).length).toBe(5);

    writeFileSync(statePath, stateBefore);
    const persistedTamper = tamperRecoveredFeedback(approvedAudit);
    expect(persistedTamper).not.toBe(approvedAudit);
    writeFileSync(auditPath, persistedTamper);
    const refused = run(STATE, project, ["approve", "feasibility"], {
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "0",
    });
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("a real human has not acted at this gate");
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    expect(readFileSync(auditPath, "utf-8").startsWith(persistedTamper)).toBe(true);

    writeFileSync(auditPath, approvedAudit);
    const replayed = inProject(project, () => handleApprove(["feasibility"]));
    expect(replayed.code).toBeNull();
    expect(transactionRecords(auditPath).length).toBe(5);
    expect(readFileSync(statePath, "utf-8")).toContain("- **Revision Count**: 1");
  });

  test("a valid batch rebuilt after a malformed batch survives a state-write retry", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    expect(inProject(project, () => handleApprove(["feasibility"])).code).toBeNull();

    writeFileSync(statePath, stateBefore);
    writeFileSync(auditPath, tamperRecoveredFeedback(readFileSync(auditPath, "utf-8")));

    chmodSync(statePath, 0o444);
    const rebuildWithFailedStateWrite = run(STATE, project, ["approve", "feasibility"]);
    chmodSync(statePath, 0o644);
    expect(rebuildWithFailedStateWrite.status).toBe(1);
    expect(transactionRecords(auditPath).length).toBe(10);
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);

    const replayedInProcess = inProject(project, () => handleApprove(["feasibility"]));
    expect(replayedInProcess.code).toBeNull();
    expect(transactionRecords(auditPath).length).toBe(10);
    expect(readFileSync(statePath, "utf-8")).toContain("- **Revision Count**: 1");

    writeFileSync(statePath, stateBefore);
    const retried = run(STATE, project, ["approve", "feasibility"], {
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "0",
    });
    expect(retried.status).toBe(0);
    expect(transactionRecords(auditPath).length).toBe(10);
    expect(readFileSync(statePath, "utf-8")).toContain("- **Revision Count**: 1");
  });

  test("multiple valid windows with the same transaction identity fail closed", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    expect(inProject(project, () => handleApprove(["feasibility"])).code).toBeNull();

    // Replay the committed batch verbatim, renumbered so the duplicated rows
    // continue the shard's dense sequence (the ledger's own invariant).
    const committed = readRecords(auditPath);
    const batch = committed.filter((r) => r.fields?.["Transaction Id"] !== undefined);
    expect(batch.length).toBeGreaterThan(0);
    appendFileSync(
      auditPath,
      batch
        .map((r, index) => `${JSON.stringify({ ...r, seq: committed.length + index + 1 })}\n`)
        .join(""),
    );
    writeFileSync(statePath, stateBefore);

    const refused = run(STATE, project, ["approve", "feasibility"], {
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "0",
    });
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("a real human has not acted at this gate");
    expect(transactionRecords(auditPath).length).toBe(10);
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
  });

  test("a completed recovery batch cannot authorize a newer organic gate", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    expect(inProject(project, () => handleApprove(["feasibility"])).code).toBeNull();

    writeFileSync(statePath, stateBefore);
    const terminalRecord = transactionRecords(auditPath).at(-1)!;
    appendRecords(auditPath, [
      {
        heading: "Stage Awaiting Approval",
        timestamp: terminalRecord.timestamp,
        event: "STAGE_AWAITING_APPROVAL",
        fields: { Stage: "feasibility" },
      },
    ]);
    const auditBefore = readFileSync(auditPath, "utf-8");
    const refused = inProject(project, () => handleApprove(["feasibility"]), {
      skipHumanGuard: false,
    });
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain("a real human has not acted at this gate");
    const refusalAudit = readFileSync(auditPath, "utf-8");
    expect(refusalAudit.startsWith(auditBefore)).toBe(true);
    const appended = parseRecords(refusalAudit.slice(auditBefore.length));
    expect(appended.map((r) => r.event)).toContain("ERROR_LOGGED");
    expect(appended.map((r) => r.event)).not.toContain("GATE_APPROVED");
    expect(appended.every((r) => r.fields?.["Transaction Id"] === undefined)).toBe(true);
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
  });

  test("a completed batch with a different transaction identity cannot authorize a retry", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    expect(inProject(project, () => handleApprove(["feasibility"])).code).toBeNull();
    writeFileSync(statePath, stateBefore);
    writeFileSync(
      auditPath,
      readRecords(auditPath)
        .map((r) =>
          r.fields?.["Transaction Id"] === undefined
            ? `${JSON.stringify(r)}\n`
            : `${JSON.stringify({
                ...r,
                fields: { ...r.fields, "Transaction Id": "000000000000000000000000" },
              })}\n`,
        )
        .join(""),
    );
    const refused = inProject(project, () => handleApprove(["feasibility"]), { skipHumanGuard: false });
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain("a real human has not acted at this gate");
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    expect(transactionRecords(auditPath).length).toBe(5);
  });

  test("an unreadable audit shard disables revision recovery without blocking organic approval", () => {
    const project = seedRevisionProject();
    const auditDir = join(seededRecordDir(project), "audit");
    symlinkSync(join(auditDir, "missing-target"), join(auditDir, "unreadable.jsonl"));

    const approved = inProject(project, () => handleApprove(["feasibility"]));
    expect(approved.code).toBeNull();
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Revision Count**: 0");
    expect(transactionRecords(seededAuditShard(project)).length).toBe(0);
  });

  test("a canonical sibling Unit artifact write recovers the stage-wide per-Unit gate", () => {
    const project = seedPerUnitRevisionProject("unit-a");
    const approved = inProject(project, () => handleApprove(["code-generation"]));
    expect(approved.code).toBeNull();
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Revision Count**: 1");
    expect(transactionRecords(seededAuditShard(project)).length).toBe(5);
  });

  test("a non-canonical Unit artifact write cannot recover the stage-wide per-Unit gate", () => {
    const project = seedPerUnitRevisionProject("unit-c");
    const approved = inProject(project, () => handleApprove(["code-generation"]));
    expect(approved.code).toBeNull();
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Revision Count**: 0");
    expect(transactionRecords(seededAuditShard(project)).length).toBe(0);
  });

  test("an unreadable Unit dependency artifact disables per-Unit recovery", () => {
    const project = createTestProject();
    projects.push(project);
    seedStateFile(project, join(FIXTURES_DIR, "state-jumped.md"));
    const dependencyDir = join(seededRecordDir(project), "inception", "units-generation");
    mkdirSync(dependencyDir, { recursive: true });
    const dependencyPath = join(dependencyDir, "unit-of-work-dependency.md");
    writeFileSync(
      dependencyPath,
      "# Units\n\n```yaml\nunits:\n  - name: unit-a\n    depends_on: []\n  - name: unit-b\n    depends_on: [unit-a]\n```\n",
    );
    expect(run(STATE, project, ["gate-start", "code-generation"]).status).toBe(0);
    appendRecords(seededAuditShard(project), [
        {
          heading: "Human Turn",
          timestamp: "2999-01-01T00:00:00Z",
          event: "HUMAN_TURN",
        },
        {
          heading: "Artifact Updated",
          timestamp: "2999-01-01T00:00:01Z",
          event: "ARTIFACT_UPDATED",
          fields: {
            File: "amadeus/spaces/default/intents/fixture-8000000000000001/construction/unit-b/code-generation/code-summary.md",
          },
        },
      ]);

    const originalReadFileSync = nodeFs.readFileSync;
    const readSpy = spyOn(nodeFs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (String(path) === dependencyPath) {
          throw Object.assign(new Error("injected dependency read failure"), { code: "EIO" });
        }
        return originalReadFileSync(path, options);
      }) as typeof nodeFs.readFileSync,
    );
    try {
      const approved = inProject(project, () => handleApprove(["code-generation"]));
      expect(approved.code).toBeNull();
      expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Revision Count**: 0");
      expect(transactionRecords(seededAuditShard(project)).length).toBe(0);
    } finally {
      readSpy.mockRestore();
    }
  });

  test.each([
    ["human-first", "a-human.md", "z-write.md"],
    ["write-first", "z-human.md", "a-write.md"],
  ])("same-second cross-shard evidence is fail-closed regardless of filename order (%s)", (_name, humanFile, writeFile) => {
    const project = createTestProject();
    projects.push(project);
    seedStateFile(project, join(FIXTURES_DIR, "state-mid-ideation.md"));
    expect(run(STATE, project, ["gate-start", "feasibility"]).status).toBe(0);
    const auditDir = join(seededRecordDir(project), "audit");
    const timestamp = "2999-01-01T00:00:00Z";
    const crossShardRecord = (
      heading: string,
      event: string,
      fields: Record<string, string>,
    ): string =>
      `${JSON.stringify({
        schemaVersion: 1,
        seq: 1,
        cloneId: "crossshard001",
        intentId: "fixture-8000000000000001",
        timestamp,
        heading,
        event,
        fields,
      })}\n`;
    writeFileSync(join(auditDir, humanFile), crossShardRecord("Human Turn", "HUMAN_TURN", {}));
    writeFileSync(
      join(auditDir, writeFile),
      crossShardRecord("Artifact Updated", "ARTIFACT_UPDATED", {
        File: "amadeus/spaces/default/intents/fixture-8000000000000001/ideation/feasibility/feasibility-assessment.md",
      }),
    );
    const approved = inProject(project, () => handleApprove(["feasibility"]));
    expect(approved.code).toBeNull();
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Revision Count**: 0");
    const auditRows = [seededAuditShard(project), join(auditDir, humanFile), join(auditDir, writeFile)]
      .flatMap((path) => readRecords(path));
    expect(auditRows.every((r) => r.fields?.["Transaction Id"] === undefined)).toBe(true);
  });

  test.each([
    [
      "event order",
      (source: string) => {
        const anchor = source.includes("\n\n  validateRecoveredApprovalBatch(blocks, input);")
          ? "\n\n  validateRecoveredApprovalBatch(blocks, input);"
          : "\n\n  const path = auditFilePath(pd);";
        return source.replace(anchor, `\n  blocks.reverse();${anchor}`);
      },
    ],
    [
      "event kind",
      (source: string) => source.replace('event: "GATE_REJECTED",', 'event: "BROKEN_EVENT",'),
    ],
    [
      "stage field",
      (source: string) =>
        source.replace(
          "const common = { Stage: input.slug, \"Transaction Id\": input.transactionId };",
          'const common = { "Transaction Id": input.transactionId };',
        ),
    ],
    [
      "transaction identity",
      (source: string) =>
        source.replace(
          'fields: { ...common, Recovered: "true" },',
          'fields: { ...common, "Transaction Id": "tampered", Recovered: "true" },',
        ),
    ],
    [
      "feedback field",
      (source: string) =>
        source.replace(
          "Feedback: RECOVERED_REVISION_FEEDBACK,",
          'Feedback: "tampered",',
        ),
    ],
  ])("a malformed recovery batch (%s) is rejected before audit or state commit", (_name, mutate) => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    const auditBefore = readFileSync(auditPath, "utf-8");
    const sandbox = mkdtempSync(join(tmpdir(), "amadeus-recovery-validator-"));
    tempDirs.push(sandbox);
    const toolsDir = join(sandbox, "tools");
    cpSync(join(ROOT, "packages/framework/core/tools"), toolsDir, { recursive: true });
    // The tools reach the canonical emit path, whose module graph lives in
    // otel/ over the vendored OTel API. Both are siblings of tools/ in the real
    // tree, so the sandbox mirrors that layout rather than a tools-only slice.
    cpSync(join(ROOT, "packages/framework/core/otel"), join(sandbox, "otel"), { recursive: true });
    cpSync(join(ROOT, "packages/framework/core/vendor"), join(sandbox, "vendor"), { recursive: true });
    const stateTool = join(toolsDir, "amadeus-state.ts");
    const source = readFileSync(stateTool, "utf-8");
    const mutated = mutate(source);
    expect(mutated).not.toBe(source);
    writeFileSync(stateTool, mutated);

    const result = run(stateTool, project, ["approve", "feasibility"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Recovery batch validation failed");
    expect(readFileSync(auditPath, "utf-8")).toBe(auditBefore);
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
  });

  test("a recovery batch derived from malformed stage metadata is rejected in-process", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    const auditBefore = readFileSync(auditPath, "utf-8");
    const sandbox = mkdtempSync(join(tmpdir(), "amadeus-recovery-stage-graph-"));
    tempDirs.push(sandbox);
    const graphPath = join(sandbox, "stage-graph.json");
    const graph = JSON.parse(readFileSync(STAGE_GRAPH, "utf-8")) as Array<Record<string, unknown>>;
    const feasibility = graph.find((stage) => stage.slug === "feasibility");
    expect(feasibility).toBeDefined();
    feasibility!.name = "Feasibility & Constraints\nmalformed";
    writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);

    const result = inProject(project, () => {
      process.env.AMADEUS_STAGE_GRAPH = graphPath;
      _resetStageGraphForTests();
      try {
        handleApprove(["feasibility"]);
      } finally {
        _resetStageGraphForTests();
      }
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Recovery batch validation failed: completion details");
    expect(readFileSync(auditPath, "utf-8")).toBe(auditBefore);
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
  });

  test("authored approve reports an atomic audit write failure", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    const auditBefore = readFileSync(auditPath, "utf-8");
    rmSync(auditPath);
    mkdirSync(auditPath);

    const failed = run(STATE, project, ["approve", "feasibility"]);
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain("Audit emission failed");
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    rmSync(auditPath, { recursive: true });
    writeFileSync(auditPath, auditBefore);
  });

  test.each([
    ["missing", (text: string) => text.replace("- **Scope**: feature\n", ""), "no Scope field"],
    [
      "invalid",
      (text: string) => text.replace("- **Scope**: feature", "- **Scope**: not-a-scope"),
      "invalid Scope",
    ],
  ])("authored approve rejects a %s scope before the atomic commit", (_name, mutate, message) => {
    const project = seedRevisionProject();
    seedPhaseCheck(project, "ideation");
    const statePath = seededStateFile(project);
    writeFileSync(statePath, mutate(readFileSync(statePath, "utf-8")));
    const stateBefore = readFileSync(statePath, "utf-8");
    const auditPath = seededAuditShard(project);
    const auditBefore = readFileSync(auditPath, "utf-8");
    const result = inProject(project, () => handleApprove(["feasibility"]));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(message);
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    expect(readFileSync(auditPath, "utf-8")).toBe(auditBefore);
  });

  test("a malformed next-state projection is rejected before audit or state commit", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    const auditBefore = readFileSync(auditPath, "utf-8");
    const sandbox = mkdtempSync(join(tmpdir(), "amadeus-recovery-next-state-"));
    tempDirs.push(sandbox);
    const toolsDir = join(sandbox, "tools");
    cpSync(join(ROOT, "packages/framework/core/tools"), toolsDir, { recursive: true });
    // The tools reach the canonical emit path, whose module graph lives in
    // otel/ over the vendored OTel API. Both are siblings of tools/ in the real
    // tree, so the sandbox mirrors that layout rather than a tools-only slice.
    cpSync(join(ROOT, "packages/framework/core/otel"), join(sandbox, "otel"), { recursive: true });
    cpSync(join(ROOT, "packages/framework/core/vendor"), join(sandbox, "vendor"), { recursive: true });
    const stateTool = join(toolsDir, "amadeus-state.ts");
    const source = readFileSync(stateTool, "utf-8");
    const mutated = source.replace(
      'content = setField(content, "Last Completed Stage", slug);',
      'content = setField(content, "Last Completed Stage", "wrong-stage");',
    );
    expect(mutated).not.toBe(source);
    writeFileSync(stateTool, mutated);
    const result = run(stateTool, project, ["approve", "feasibility"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Approval commit validation failed: last completed stage");
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    expect(readFileSync(auditPath, "utf-8")).toBe(auditBefore);
  });

  test("authored approve completes the workflow when no next stage exists", () => {
    const project = createTestProject();
    projects.push(project);
    seedStateFile(project, join(FIXTURES_DIR, "state-final-stage.md"));
    expect(run(STATE, project, ["gate-start", "feedback-optimization"]).status).toBe(0);
    seedPhaseCheck(project, "operation");
    const completed = inProject(project, () => handleApprove(["feedback-optimization"]));
    expect(completed.code).toBeNull();
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Status**: Completed");
  });
});
