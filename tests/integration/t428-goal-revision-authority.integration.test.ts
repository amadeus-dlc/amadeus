// covers: subcommand:amadeus-goal:propose, subcommand:amadeus-goal:approve-revision, audit:GOAL_CHANGE_PROPOSED, audit:GOAL_REVISION_APPROVED, audit:GOAL_RECONCILED
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { emitAuditEvent } from "../../packages/framework/core/otel/audit-emit.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  cleanupTestProject,
  createTestProject,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const UTIL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-utility.ts");
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

function birth(): { project: string; intent: string } {
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
      "Original human-owned goal",
      "--project-dir",
      project,
    ],
    { encoding: "utf8", env: toolEnv },
  );
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  const intents = join(project, "amadeus", "spaces", "default", "intents");
  return {
    project,
    intent: readFileSync(join(intents, "active-intent"), "utf8").trim(),
  };
}

function runGoal(
  project: string,
  args: string[],
  env: NodeJS.ProcessEnv = toolEnv,
) {
  return spawnSync(process.execPath, [GOAL, ...args, "--project-dir", project], {
    encoding: "utf8",
    env,
  });
}

describe("Goal revision authority", () => {
  test("only a direct HUMAN_TURN after the proposal can activate a revision", () => {
    const { project, intent } = birth();
    const proposed = runGoal(project, [
      "propose",
      "--statement",
      "Revised human-owned goal",
      "--success-metrics",
      '["metric one"]',
      "--reason",
      "The owner changed the intended outcome",
      "--unmet-current-items",
      '["goal-statement"]',
      "--impact",
      "Changes the terminal reconciliation target",
    ]);
    expect(proposed.status, `${proposed.stdout}${proposed.stderr}`).toBe(0);
    const proposalId = JSON.parse(proposed.stdout).proposal.proposalId as string;

    const withoutHuman = runGoal(
      project,
      ["approve-revision", "--proposal", proposalId, "--user-input", "approve"],
      { ...toolEnv, AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" },
    );
    expect(withoutHuman.status).not.toBe(0);
    expect(`${withoutHuman.stdout}${withoutHuman.stderr}`).toMatch(/direct HUMAN_TURN/i);

    resetOtelPerProject();
    emitAuditEvent("HUMAN_TURN", {}, project, intent, "default");
    const approved = runGoal(project, [
      "approve-revision",
      "--proposal",
      proposalId,
      "--user-input",
      "approve revision",
    ]);
    expect(approved.status, `${approved.stdout}${approved.stderr}`).toBe(0);
    const approval = JSON.parse(approved.stdout) as { revision: number; digest: string };
    expect(approval.revision).toBe(1);
    expect(approval.digest).toMatch(/^[0-9a-f]{64}$/);

    const repeated = runGoal(project, [
      "approve-revision",
      "--proposal",
      proposalId,
      "--user-input",
      "approve revision",
    ]);
    expect(repeated.status, `${repeated.stdout}${repeated.stderr}`).toBe(0);
    const state = readFileSync(
      join(
        project,
        "amadeus",
        "spaces",
        "default",
        "intents",
        intent,
        "amadeus-state.md",
      ),
      "utf8",
    );
    expect(state).toContain("- **Current Goal Revision**: 1");
    expect(state).toContain(`- **Current Goal Digest**: ${approval.digest}`);

    const proof = "approved revision verified\n";
    writeFileSync(join(project, "revision-proof.txt"), proof);
    writeFileSync(
      join(project, "revision-items.json"),
      JSON.stringify([
        {
          id: "goal-statement",
          verdict: "ACHIEVED",
          evidence: [
            {
              kind: "deterministic-check",
              reference: "revision-proof.txt",
              digest: createHash("sha256").update(proof).digest("hex"),
            },
          ],
        },
        {
          id: "success-metric-1",
          verdict: "ACHIEVED",
          evidence: [
            {
              kind: "deterministic-check",
              reference: "revision-proof.txt",
              digest: createHash("sha256").update(proof).digest("hex"),
            },
          ],
        },
      ]),
    );
    const reconciled = runGoal(project, [
      "reconcile",
      "--items",
      "revision-items.json",
      "--final-stage",
      "build-and-test",
      "--completion-instance",
      "terminal:build-and-test",
    ]);
    expect(reconciled.status, `${reconciled.stdout}${reconciled.stderr}`).toBe(0);
    expect(JSON.parse(reconciled.stdout).receipt).toMatchObject({
      goalRevision: 1,
      goalDigest: approval.digest,
      overallVerdict: "ACHIEVED",
    });
  });
});
