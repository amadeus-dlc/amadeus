// covers: runtime-recovery:production-paths
// @test-size medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { handleApprove } from "../../packages/framework/core/tools/amadeus-state.ts";
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

function run(tool: string, project: string, args: string[]) {
  return spawnSync(process.execPath, [tool, ...args, "--project-dir", project], {
    cwd: project,
    encoding: "utf-8",
    env: {
      ...process.env,
      AMADEUS_STAGE_GRAPH: STAGE_GRAPH,
      AMADEUS_SCOPE_GRID: SCOPE_GRID,
      AMADEUS_SCOPE_MAPPING: SCOPE_GRID,
      AMADEUS_SKIP_ARTIFACT_GUARD: "1",
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
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

function seedRevisionProject(): string {
  const project = createTestProject();
  projects.push(project);
  seedStateFile(project, join(FIXTURES_DIR, "state-mid-ideation.md"));
  expect(run(STATE, project, ["gate-start", "feasibility"]).status).toBe(0);
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  appendFileSync(
    seededAuditShard(project),
    `
## Human Turn
**Timestamp**: ${timestamp}
**Event**: HUMAN_TURN

---

## Artifact Updated
**Timestamp**: ${timestamp}
**Event**: ARTIFACT_UPDATED
**File**: amadeus/spaces/default/intents/fixture-8000000000000001/ideation/feasibility/feasibility-assessment.md

---
`,
  );
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
    const result = run(ORCHESTRATE, project, ["next"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ kind: "run-stage", unit: "alpha" });
    expect(result.stderr).toContain("BOLT_DAG_RECOVERED reason=mismatch batches=1");
    expect(result.stderr).toContain('repair="bun .codex/tools/amadeus-runtime.ts compile"');
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

    const audit = readFileSync(seededAuditShard(project), "utf-8");
    const transactionBlocks = audit
      .split("\n---\n")
      .filter((block) => block.includes("**Transaction Id**:"));
    expect(transactionBlocks.map((block) => /\*\*Event\*\*: (\S+)/.exec(block)?.[1])).toEqual([
      "GATE_REJECTED",
      "STAGE_REVISING",
      "STAGE_AWAITING_APPROVAL",
      "GATE_APPROVED",
      "STAGE_COMPLETED",
    ]);
    expect(transactionBlocks.slice(0, 3).every((block) => block.includes("**Recovered**: true"))).toBe(true);
    expect(new Set(transactionBlocks.map((block) => /\*\*Transaction Id\*\*: (\S+)/.exec(block)?.[1])).size).toBe(1);
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
    const auditAfterFailure = readFileSync(auditPath, "utf-8");
    expect(auditAfterFailure.match(/\*\*Transaction Id\*\*:/g)?.length).toBe(5);

    const retried = run(STATE, project, ["approve", "feasibility"]);
    expect(retried.status).toBe(0);
    expect(readFileSync(auditPath, "utf-8").match(/\*\*Transaction Id\*\*:/g)?.length).toBe(5);
    expect(readFileSync(statePath, "utf-8")).toContain("- **Revision Count**: 1");
    expect(readFileSync(statePath, "utf-8")).toContain("- [x] feasibility — EXECUTE");
  });
});

describe("t247 recovery in-process coverage seams", () => {
  test("authored orchestrator heals once and fails loud on an unreadable canonical source", () => {
    const project = seedDagProject(
      "# Units\n\n```yaml\nunits:\n  - name: alpha\n    depends_on: []\n  - name: beta\n    depends_on: []\n```\n",
    );
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
    expect(readFileSync(auditPath, "utf-8").match(/\*\*Transaction Id\*\*:/g)?.length).toBe(5);

    writeFileSync(statePath, stateBefore);
    const replayed = inProject(project, () => handleApprove(["feasibility"]));
    expect(replayed.code).toBeNull();
    expect(readFileSync(auditPath, "utf-8").match(/\*\*Transaction Id\*\*:/g)?.length).toBe(5);
    expect(readFileSync(statePath, "utf-8")).toContain("- **Revision Count**: 1");
  });

  test("a completed recovery batch cannot authorize a newer organic gate", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    expect(inProject(project, () => handleApprove(["feasibility"])).code).toBeNull();

    writeFileSync(statePath, stateBefore);
    const completedAudit = readFileSync(auditPath, "utf-8");
    const terminalBlock = completedAudit
      .split("\n---\n")
      .filter((block) => block.includes("**Transaction Id**:"))
      .at(-1)!;
    const terminalTimestamp = /\*\*Timestamp\*\*: (\S+)/.exec(terminalBlock)![1]!;
    appendFileSync(
      auditPath,
      `
## Stage Awaiting Approval
**Timestamp**: ${terminalTimestamp}
**Event**: STAGE_AWAITING_APPROVAL
**Stage**: feasibility

---
`,
    );
    const auditBefore = readFileSync(auditPath, "utf-8");
    const refused = inProject(project, () => handleApprove(["feasibility"]), {
      skipHumanGuard: false,
    });
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain("a real human has not acted at this gate");
    const refusalAudit = readFileSync(auditPath, "utf-8");
    expect(refusalAudit.startsWith(auditBefore)).toBe(true);
    expect(refusalAudit.slice(auditBefore.length)).toContain("**Event**: ERROR_LOGGED");
    expect(refusalAudit.slice(auditBefore.length)).not.toContain("**Event**: GATE_APPROVED");
    expect(refusalAudit.slice(auditBefore.length)).not.toContain("**Transaction Id**:");
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
  });

  test("a completed batch with a different transaction identity cannot authorize a retry", () => {
    const project = seedRevisionProject();
    const statePath = seededStateFile(project);
    const auditPath = seededAuditShard(project);
    const stateBefore = readFileSync(statePath, "utf-8");
    expect(inProject(project, () => handleApprove(["feasibility"])).code).toBeNull();
    writeFileSync(statePath, stateBefore);
    const tampered = readFileSync(auditPath, "utf-8").replace(
      /\*\*Transaction Id\*\*: [a-f0-9]+/g,
      "**Transaction Id**: 000000000000000000000000",
    );
    writeFileSync(auditPath, tampered);
    const refused = inProject(project, () => handleApprove(["feasibility"]), { skipHumanGuard: false });
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain("a real human has not acted at this gate");
    expect(readFileSync(statePath, "utf-8")).toBe(stateBefore);
    expect(readFileSync(auditPath, "utf-8").match(/\*\*Transaction Id\*\*:/g)?.length).toBe(5);
  });

  test("a sibling Unit artifact write cannot recover the current per-Unit gate", () => {
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
    appendFileSync(
      seededAuditShard(project),
      `
## Human Turn
**Timestamp**: 2999-01-01T00:00:00Z
**Event**: HUMAN_TURN

---

## Artifact Updated
**Timestamp**: 2999-01-01T00:00:01Z
**Event**: ARTIFACT_UPDATED
**File**: /workspace/amadeus/spaces/default/intents/example/construction/unit-a/code-generation/code-summary.md

---
`,
    );
    const approved = inProject(project, () => handleApprove(["code-generation"]));
    expect(approved.code).toBeNull();
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Revision Count**: 0");
    expect(readFileSync(seededAuditShard(project), "utf-8")).not.toContain("**Transaction Id**:");
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
    writeFileSync(join(auditDir, humanFile), `# Audit\n\n## Human Turn\n**Timestamp**: ${timestamp}\n**Event**: HUMAN_TURN\n\n---\n`);
    writeFileSync(
      join(auditDir, writeFile),
      `# Audit\n\n## Artifact Updated\n**Timestamp**: ${timestamp}\n**Event**: ARTIFACT_UPDATED\n**File**: amadeus/spaces/default/intents/fixture-8000000000000001/ideation/feasibility/feasibility-assessment.md\n\n---\n`,
    );
    const approved = inProject(project, () => handleApprove(["feasibility"]));
    expect(approved.code).toBeNull();
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain("- **Revision Count**: 0");
    const auditText = [seededAuditShard(project), join(auditDir, humanFile), join(auditDir, writeFile)]
      .map((path) => readFileSync(path, "utf-8"))
      .join("\n");
    expect(auditText).not.toContain("**Transaction Id**:");
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

  test("authored approve reports an atomic audit write failure", () => {
    const project = seedRevisionProject();
    const auditDir = join(seededRecordDir(project), "audit");
    chmodSync(auditDir, 0o555);
    try {
      const failed = inProject(project, () => handleApprove(["feasibility"]));
      expect(failed.code).toBe(1);
      expect(failed.stderr).toContain("Audit emission failed");
    } finally {
      chmodSync(auditDir, 0o755);
    }
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
