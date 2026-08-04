// covers: subcommand:amadeus-state:complete-workflow, function:authorizeGoalCompletion
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { emitAuditEvent } from "../../packages/framework/core/otel/audit-emit.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  cleanupTestProject,
  createTestProject,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const UTIL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-utility.ts");
const STATE = join(ROOT, "packages", "framework", "core", "tools", "amadeus-state.ts");
const GOAL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-goal.ts");
const ORCHESTRATE = join(
  ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-orchestrate.ts",
);
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

function birth(): { project: string; record: string } {
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
      "Ship a verified goal guard",
      "--project-dir",
      project,
    ],
    { encoding: "utf8", env: toolEnv },
  );
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  const intents = join(project, "amadeus", "spaces", "default", "intents");
  const record = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return { project, record };
}

function auditEvents(project: string, record: string): string[] {
  const auditDir = join(
    project,
    "amadeus",
    "spaces",
    "default",
    "intents",
    record,
    "audit",
  );
  if (!existsSync(auditDir)) return [];
  return readdirSync(auditDir)
    .filter((name) => name.endsWith(".jsonl"))
    .flatMap((name) =>
      readFileSync(join(auditDir, name), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { event?: string; attributes?: { Event?: string } })
        .map((row) => row.event ?? row.attributes?.Event ?? ""),
    );
}

function reconcileAchieved(
  project: string,
  finalStage = "build-and-test",
  completionInstance = `terminal:${finalStage}`,
  includeCompletionInstance = true,
): { receipt: { completionInstance: string } } {
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
  const reconcileArgs = [
    GOAL,
    "reconcile",
    "--items",
    itemsPath,
    "--final-stage",
    finalStage,
  ];
  if (includeCompletionInstance) {
    reconcileArgs.push("--completion-instance", completionInstance);
  }
  reconcileArgs.push("--project-dir", project);
  const reconcile = spawnSync(
    process.execPath,
    reconcileArgs,
    { encoding: "utf8", env: toolEnv },
  );
  expect(reconcile.status, `${reconcile.stdout}${reconcile.stderr}`).toBe(0);
  return JSON.parse(reconcile.stdout) as { receipt: { completionInstance: string } };
}

function runComplete(
  project: string,
  record: string,
  crashAt?: string,
) {
  return spawnSync(
    process.execPath,
    [
      STATE,
      "complete-workflow",
      "build-and-test",
      "--intent",
      record,
      "--space",
      "default",
      "--project-dir",
      project,
    ],
    {
      encoding: "utf8",
      env: {
        ...toolEnv,
        AMADEUS_SKIP_ARTIFACT_GUARD: "1",
        AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        ...(crashAt
          ? { AMADEUS_TEST_COMPLETE_WORKFLOW_CRASH_AT: crashAt }
          : {}),
      },
    },
  );
}

function runGoal(project: string, args: string[]) {
  return spawnSync(process.execPath, [GOAL, ...args, "--project-dir", project], {
    encoding: "utf8",
    env: toolEnv,
  });
}

function setFinalStageState(
  project: string,
  record: string,
  completionInstance?: string,
): void {
  const path = join(
    project,
    "amadeus",
    "spaces",
    "default",
    "intents",
    record,
    "amadeus-state.md",
  );
  let state = readFileSync(path, "utf8")
    .replace(/- \*\*Current Stage\*\*: .*/u, "- **Current Stage**: build-and-test")
    .replace(/^- \[.\] build-and-test.*$/mu, "- [x] build-and-test — EXECUTE");
  if (completionInstance) {
    state = state.replace(
      "## Runtime State",
      "## Runtime State\n" +
        `- **Workflow Completion Instance**: ${completionInstance}\n` +
        "- **Workflow Completion Stage**: build-and-test\n" +
        "- **Workflow Completion Status**: pending",
    );
  }
  writeFileSync(path, state);
}

describe("Goal receipt is a terminal completion precondition", () => {
  test("derives the prepared completion instance and rejects an explicit conflict", () => {
    const { project, record } = birth();
    setFinalStageState(project, record, "prepared-completion-1");
    const reconciled = reconcileAchieved(
      project,
      "build-and-test",
      "unused",
      false,
    );
    expect(reconciled.receipt.completionInstance).toBe("prepared-completion-1");

    const conflict = runGoal(project, [
      "reconcile",
      "--items",
      "goal-items.json",
      "--final-stage",
      "build-and-test",
      "--completion-instance",
      "different-completion",
    ]);
    expect(conflict.status).not.toBe(0);
    expect(`${conflict.stdout}${conflict.stderr}`).toMatch(/conflicts with prepared/i);
  });

  test("accepts an evidence-bound direct human ruling for the current Goal", () => {
    const { project, record } = birth();
    resetOtelPerProject();
    const human = emitAuditEvent("HUMAN_TURN", {}, project, record, "default");
    expect(human.appended).toBe(true);
    const reference = `audit:HUMAN_TURN:${human.timestamp}`;
    const items = join(project, "human-goal-items.json");
    writeFileSync(
      items,
      JSON.stringify([
        {
          id: "goal-statement",
          verdict: "ACHIEVED",
          evidence: [
            {
              kind: "human-ruling",
              reference,
              digest: createHash("sha256").update(reference).digest("hex"),
            },
          ],
        },
      ]),
    );
    const reconciled = spawnSync(
      process.execPath,
      [
        GOAL,
        "reconcile",
        "--items",
        items,
        "--final-stage",
        "build-and-test",
        "--completion-instance",
        "terminal:build-and-test",
        "--project-dir",
        project,
      ],
      { encoding: "utf8", env: toolEnv },
    );
    expect(reconciled.status, `${reconciled.stdout}${reconciled.stderr}`).toBe(0);
    expect(JSON.parse(reconciled.stdout).receipt).toMatchObject({
      overallVerdict: "ACHIEVED",
      humanRulingReference: reference,
    });
  });

  test("refuses a completion mirror directive before any external lifecycle command", () => {
    const { project, record } = birth();
    setFinalStageState(project, record, "completion-mirror-guard");
    const result = spawnSync(
      process.execPath,
      [ORCHESTRATE, "next", "--project-dir", project],
      { encoding: "utf8", env: toolEnv },
    );
    expect(result.status).toBe(0);
    const directive = JSON.parse(result.stdout) as { kind: string; message?: string };
    expect(directive.kind).toBe("error");
    expect(directive.message).toMatch(/Goal reconciliation refused completion mirror/i);
    expect(result.stdout).not.toContain("amadeus-mirror-lifecycle");
  });

  test("terminal report funnels through the same receipt authority", () => {
    const { project, record } = birth();
    setFinalStageState(project, record);
    const result = spawnSync(
      process.execPath,
      [
        ORCHESTRATE,
        "report",
        "--stage",
        "build-and-test",
        "--result",
        "completed",
        "--project-dir",
        project,
      ],
      {
        encoding: "utf8",
        env: {
          ...toolEnv,
          AMADEUS_SKIP_ARTIFACT_GUARD: "1",
          AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        },
      },
    );
    expect(result.status).toBe(0);
    const directive = JSON.parse(result.stdout) as { kind: string; message?: string };
    expect(directive.kind).toBe("error");
    expect(directive.message).toMatch(/Goal reconciliation receipt is missing/i);
  });

  test("terminal finalize uses the same receipt precondition", () => {
    const { project, record } = birth();
    const before = readFileSync(
      join(project, "amadeus", "spaces", "default", "intents", record, "amadeus-state.md"),
      "utf8",
    );
    const result = spawnSync(
      process.execPath,
      [STATE, "finalize", "build-and-test", "--project-dir", project],
      {
        encoding: "utf8",
        env: {
          ...toolEnv,
          AMADEUS_SKIP_ARTIFACT_GUARD: "1",
          AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        },
      },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/Goal reconciliation receipt is missing/i);
    expect(
      readFileSync(
        join(project, "amadeus", "spaces", "default", "intents", record, "amadeus-state.md"),
        "utf8",
      ),
    ).toBe(before);
  });

  test("direct complete-workflow fails closed without a receipt and changes no completion surface", () => {
    const { project, record } = birth();
    const intents = join(project, "amadeus", "spaces", "default", "intents");
    const result = spawnSync(
      process.execPath,
      [
        STATE,
        "complete-workflow",
        "build-and-test",
        "--project-dir",
        project,
      ],
      {
        encoding: "utf8",
        env: {
          ...toolEnv,
          AMADEUS_SKIP_ARTIFACT_GUARD: "1",
          AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        },
      },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/Goal reconciliation receipt is missing/i);
    const state = readFileSync(join(intents, record, "amadeus-state.md"), "utf8");
    expect(state).toContain("- **Status**: Running");
    expect(auditEvents(project, record)).not.toContain("WORKFLOW_COMPLETED");
    const registry = JSON.parse(
      readFileSync(join(intents, "intents.json"), "utf8"),
    ) as Array<{ dirName?: string; status: string }>;
    expect(registry.find((entry) => entry.dirName === record)?.status).toBe("in-flight");
    expect(readFileSync(join(intents, "active-intent"), "utf8").trim()).toBe(record);
  });

  test("a current ACHIEVED receipt permits the atomic completion surfaces", () => {
    const { project, record } = birth();
    reconcileAchieved(project);

    const complete = spawnSync(
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
    expect(complete.status, `${complete.stdout}${complete.stderr}`).toBe(0);
    const intents = join(project, "amadeus", "spaces", "default", "intents");
    const state = readFileSync(join(intents, record, "amadeus-state.md"), "utf8");
    expect(state).toContain("- **Status**: Completed");
    expect(auditEvents(project, record)).toContain("GOAL_RECONCILED");
    expect(auditEvents(project, record)).toContain("WORKFLOW_COMPLETED");
    const registry = JSON.parse(readFileSync(join(intents, "intents.json"), "utf8")) as Array<{
      dirName?: string;
      status: string;
    }>;
    expect(registry.find((entry) => entry.dirName === record)?.status).toBe("complete");
    expect(existsSync(join(intents, "active-intent"))).toBe(false);
  });

  test("rejects an ACHIEVED receipt from an older approved Goal revision", () => {
    const { project, record } = birth();
    reconcileAchieved(project);

    const proposed = runGoal(project, [
      "propose",
      "--statement",
      "Revised goal after the old receipt",
      "--reason",
      "The human owner changed the approved target",
      "--impact",
      "Invalidates the revision-zero receipt",
    ]);
    expect(proposed.status, `${proposed.stdout}${proposed.stderr}`).toBe(0);
    const proposalId = JSON.parse(proposed.stdout).proposal.proposalId as string;
    resetOtelPerProject();
    emitAuditEvent("HUMAN_TURN", {}, project, record, "default");
    const approved = runGoal(project, [
      "approve-revision",
      "--proposal",
      proposalId,
      "--user-input",
      "approve revision one",
    ]);
    expect(approved.status, `${approved.stdout}${approved.stderr}`).toBe(0);

    const intents = join(project, "amadeus", "spaces", "default", "intents");
    const statePath = join(intents, record, "amadeus-state.md");
    const registryPath = join(intents, "intents.json");
    const stateBefore = readFileSync(statePath, "utf8");
    const registryBefore = readFileSync(registryPath, "utf8");
    const complete = runComplete(project, record);

    expect(complete.status).not.toBe(0);
    expect(`${complete.stdout}${complete.stderr}`).toMatch(/revision is stale/i);
    expect(readFileSync(statePath, "utf8")).toBe(stateBefore);
    expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
    expect(auditEvents(project, record)).not.toContain("WORKFLOW_COMPLETED");
  });

  test.each([
    "after-stage-completed-audit",
    "after-phase-completed-audit",
    "after-phase-verified-audit",
    "after-workflow-completed-audit",
    "after-state-completed",
    "after-registry-complete",
    "after-cursor-clear",
  ])("reuses the same receipt after crash boundary %s", (crashAt) => {
    const { project, record } = birth();
    reconcileAchieved(project);

    const crashed = runComplete(project, record, crashAt);
    expect(crashed.status).toBe(86);
    const recovered = runComplete(project, record);
    expect(recovered.status, `${recovered.stdout}${recovered.stderr}`).toBe(0);

    const events = auditEvents(project, record);
    expect(events.filter((event) => event === "GOAL_RECONCILED")).toHaveLength(1);
    expect(events.filter((event) => event === "WORKFLOW_COMPLETED")).toHaveLength(1);
    const state = readFileSync(
      join(project, "amadeus", "spaces", "default", "intents", record, "amadeus-state.md"),
      "utf8",
    );
    expect(state).toContain("- **Status**: Completed");
  });
});
