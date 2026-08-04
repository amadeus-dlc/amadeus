// covers: subcommand:amadeus-goal:legacy-propose, subcommand:amadeus-goal:approve-legacy-migration, audit:LEGACY_GOAL_MIGRATED
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { emitAuditEvent } from "../../packages/framework/core/otel/audit-emit.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { goalLineagePath } from "../../packages/framework/core/tools/amadeus-goal-reconciliation.ts";
import {
  findAllEvents,
  readAllAuditShards,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const UTIL = join(ROOT, "packages", "framework", "core", "tools", "amadeus-utility.ts");
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

function legacyCompletedFixture(): {
  project: string;
  intent: string;
  intentId: string;
  recordDir: string;
} {
  const project = createTestProject();
  projects.push(project);
  const born = spawnSync(
    process.execPath,
    [
      UTIL,
      "intent-birth",
      "--scope",
      "fix",
      "--arguments",
      "Preserve and reconfirm the legacy outcome",
      "--project-dir",
      project,
    ],
    { encoding: "utf8", env: toolEnv },
  );
  expect(born.status, `${born.stdout}${born.stderr}`).toBe(0);
  const intentsDir = join(project, "amadeus", "spaces", "default", "intents");
  const intent = readFileSync(join(intentsDir, "active-intent"), "utf8").trim();
  const registryPath = join(intentsDir, "intents.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as Array<{
    uuid: string;
    dirName?: string;
    status: string;
  }>;
  const row = registry.find((entry) => entry.dirName === intent);
  if (!row) throw new Error("fixture Intent registry row is missing");
  row.status = "complete";
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const recordDir = join(intentsDir, intent);
  const statePath = join(recordDir, "amadeus-state.md");
  let state = readFileSync(statePath, "utf8");
  state = state
    .replace(/- \*\*Status\*\*: .*/u, "- **Status**: Completed")
    .replace(/- \*\*Current Stage\*\*: .*/u, "- **Current Stage**: build-and-test")
    .replace(/- \*\*Last Completed Stage\*\*: .*/u, "- **Last Completed Stage**: build-and-test")
    .replace(/- \*\*In Progress\*\*: .*/u, "- **In Progress**: none")
    .replace(/- \*\*Next Stage\*\*: .*/u, "- **Next Stage**: none")
    .replace(/^- \[.\] build-and-test.*$/mu, "- [x] build-and-test — EXECUTE");
  writeFileSync(statePath, state);
  rmSync(goalLineagePath(recordDir));
  return { project, intent, intentId: row.uuid, recordDir };
}

function runGoal(project: string, intent: string, args: string[]) {
  return spawnSync(
    process.execPath,
    [GOAL, ...args, "--intent", intent, "--space", "default", "--project-dir", project],
    { encoding: "utf8", env: toolEnv },
  );
}

describe("legacy Goal migration", () => {
  test("preserves legacy Completed reads, refuses reconfirmation, then accepts only a human-ruled migration receipt", () => {
    const { project, intent, intentId } = legacyCompletedFixture();
    const statePath = join(
      project,
      "amadeus",
      "spaces",
      "default",
      "intents",
      intent,
      "amadeus-state.md",
    );
    const legacyBytes = readFileSync(statePath);
    expect(legacyBytes.toString()).toContain("- **Status**: Completed");

    const refused = spawnSync(
      process.execPath,
      [ORCHESTRATE, "next", "--project-dir", project],
      { encoding: "utf8", env: toolEnv },
    );
    expect(refused.status).toBe(0);
    expect(JSON.parse(refused.stdout)).toMatchObject({ kind: "error" });
    expect(refused.stdout).toMatch(/Goal lineage is missing/i);
    expect(readFileSync(statePath)).toEqual(legacyBytes);

    const proposed = runGoal(project, intent, [
      "legacy-propose",
      "--success-metrics",
      '["The legacy outcome is explicitly confirmed"]',
      "--uncertainties",
      '["Original metric evidence was not recorded"]',
    ]);
    expect(proposed.status, `${proposed.stdout}${proposed.stderr}`).toBe(0);
    const proposalId = JSON.parse(proposed.stdout).proposal.proposalId as string;

    const noHuman = runGoal(project, intent, [
      "approve-legacy-migration",
      "--proposal",
      proposalId,
      "--items",
      "missing.json",
      "--user-input",
      "approve",
    ]);
    expect(noHuman.status).not.toBe(0);
    expect(`${noHuman.stdout}${noHuman.stderr}`).toMatch(/direct HUMAN_TURN/i);

    resetOtelPerProject();
    const human = emitAuditEvent("HUMAN_TURN", {}, project, intent, "default");
    expect(human.appended).toBe(true);
    const ruling = `audit:HUMAN_TURN:${human.timestamp}`;
    const itemsPath = join(project, "legacy-items.json");
    const evidenceDigest = createHash("sha256").update(ruling).digest("hex");
    writeFileSync(
      itemsPath,
      JSON.stringify([
        {
          id: "goal-statement",
          verdict: "ACHIEVED",
          evidence: [{ kind: "human-ruling", reference: ruling, digest: evidenceDigest }],
        },
        {
          id: "success-metric-1",
          verdict: "ACHIEVED",
          evidence: [{ kind: "human-ruling", reference: ruling, digest: evidenceDigest }],
        },
      ]),
    );
    const migrated = runGoal(project, intent, [
      "approve-legacy-migration",
      "--proposal",
      proposalId,
      "--items",
      itemsPath,
      "--user-input",
      "approve reconstructed Goal and every ruling",
    ]);
    expect(migrated.status, `${migrated.stdout}${migrated.stderr}`).toBe(0);
    const result = JSON.parse(migrated.stdout);
    expect(result.lineage.intentId).toBe(intentId);
    expect(result.lineage.revisions[0].source).toBe("legacy-migration");
    expect(result.receipt.overallVerdict).toBe("ACHIEVED");

    const retried = runGoal(project, intent, [
      "approve-legacy-migration",
      "--proposal",
      proposalId,
      "--items",
      itemsPath,
      "--user-input",
      "retry the same approved migration",
    ]);
    expect(retried.status, `${retried.stdout}${retried.stderr}`).toBe(0);
    expect(
      findAllEvents(
        readAllAuditShards(project, intent, "default"),
        "LEGACY_GOAL_MIGRATED",
      ),
    ).toHaveLength(1);

    const reconfirmed = spawnSync(
      process.execPath,
      [ORCHESTRATE, "next", "--project-dir", project],
      { encoding: "utf8", env: toolEnv },
    );
    expect(reconfirmed.status).toBe(0);
    expect(JSON.parse(reconfirmed.stdout)).toMatchObject({ kind: "done" });
  });
});
