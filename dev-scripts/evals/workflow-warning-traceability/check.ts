#!/usr/bin/env bun

import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildPrReadinessChecklist,
  buildRequirementEvidenceMap,
  buildWorkflowWarningSnapshot,
  detectWorkflowWarnings,
} from "../../../.agents/aidlc/tools/aidlc-workflow-traceability.ts";

const root = resolve(import.meta.dir, "../../..");
const engineDirs = ["tools", "aidlc-common", "sensors", "scopes", "agents", "knowledge"];
const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function check(name: string, condition: boolean, evidence: string): void {
  if (!condition) fail(`fail: ${name} — ${evidence}`);
  console.log(`ok: ${name}`);
}

function run(command: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode,
  };
}

function runExpectSuccess(command: string[], cwd: string): string {
  const result = run(command, cwd);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", result.stdout, "stderr:", result.stderr].join("\n"));
  }
  return result.stdout;
}

const warnings = detectWorkflowWarnings({
  currentStage: "code-generation",
  workflowStatus: "Active",
  artifactEvidence: ["construction/U001/code-generation/code-summary.md"],
  auditEvents: [],
  pendingHumanEvidence: false,
  stateStageOutcome: "Active",
  auditStageOutcome: "Completed",
});
check("report mismatch warning が出る", warnings.some((warning) => warning.kind === "report-mismatch"), JSON.stringify(warnings));
check("abandoned stage warning が出る", warnings.some((warning) => warning.kind === "abandoned-stage"), JSON.stringify(warnings));
check("contradiction warning が出る", warnings.some((warning) => warning.kind === "state-audit-contradiction"), JSON.stringify(warnings));

const runningWarnings = detectWorkflowWarnings({
  currentStage: "ci-pipeline",
  workflowStatus: "Running",
  artifactEvidence: [],
  auditEvents: [],
  pendingHumanEvidence: false,
});
check("Running status は active workflow として abandonment を検出する", runningWarnings.some((warning) => warning.kind === "abandoned-stage"), JSON.stringify(runningWarnings));

const suppressed = detectWorkflowWarnings({
  currentStage: "requirements-analysis",
  workflowStatus: "Active",
  artifactEvidence: [],
  auditEvents: [],
  pendingHumanEvidence: true,
});
check("pending human evidence がある場合 abandonment を抑制する", suppressed.length === 0, JSON.stringify(suppressed));

const requirementMap = buildRequirementEvidenceMap([
  { requirement: "R001", state: "present", evidence: "ERROR_LOGGED eval" },
  { requirement: "R004", state: "present", evidence: "SUBAGENT_COMPLETED eval" },
]);
check("Requirement evidence map は R001-R009 を持つ", requirementMap.length === 9, JSON.stringify(requirementMap));
check("missing evidence は missing のまま残る", requirementMap.some((item) => item.requirement === "R009" && item.state === "missing"), JSON.stringify(requirementMap));

const checklist = buildPrReadinessChecklist([
  { label: "Issue linkage", state: "present", evidence: "#431 #432 #433 #435" },
  { label: "Parity state", state: "failed", evidence: "parity:check hash mismatch" },
]);
check("PR readiness は required item を持つ", checklist.length === 7, JSON.stringify(checklist));
check("parity failure は failed として残る", checklist.some((item) => item.label === "Parity state" && item.state === "failed"), JSON.stringify(checklist));
check("未記録 item は missing になる", checklist.some((item) => item.label === "Validator" && item.state === "missing"), JSON.stringify(checklist));

const snapshotWorkspace = mkdtempSync(join(tmpdir(), "workflow-warning-snapshot-"));
cleanups.push(snapshotWorkspace);
{
  const recordDir = join(snapshotWorkspace, "aidlc", "spaces", "default", "intents", "260704-snapshot");
  mkdirSync(join(recordDir, "construction", "U001", "code-generation"), { recursive: true });
  mkdirSync(join(recordDir, "construction", "ci-pipeline"), { recursive: true });
  mkdirSync(join(recordDir, "audit"), { recursive: true });
  writeFileSync(join(snapshotWorkspace, "aidlc", "spaces", "default", "intents", "active-intent"), "260704-snapshot\n", "utf8");
  writeFileSync(
    join(recordDir, "aidlc-state.md"),
    [
      "# AI-DLC State Tracking",
      "",
      "- [-] ci-pipeline",
      "",
      "## Current Status",
      "- **Current Stage**: ci-pipeline",
      "- **Status**: Running",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(join(recordDir, "construction", "U001", "code-generation", "code-summary.md"), "# stale\n", "utf8");
  writeFileSync(join(recordDir, "construction", "ci-pipeline", "ci-config.md"), "# current\n", "utf8");
  writeFileSync(
    join(recordDir, "audit", "snapshot.md"),
    [
      "# AI-DLC Audit Log",
      "",
      "## Stage Awaiting Approval",
      "**Timestamp**: 2026-07-04T00:00:00Z",
      "**Event**: STAGE_AWAITING_APPROVAL",
      "**Stage**: code-generation",
      "",
      "---",
      "",
      "## Stage Completion",
      "**Timestamp**: 2026-07-04T00:01:00Z",
      "**Event**: STAGE_COMPLETED",
      "**Stage**: code-generation",
      "",
      "---",
      "",
      "## Stage Completion",
      "**Timestamp**: 2026-07-04T00:02:00Z",
      "**Event**: STAGE_COMPLETED",
      "**Stage**: ci-pipeline",
      "",
    ].join("\n"),
    "utf8",
  );
  const snapshot = buildWorkflowWarningSnapshot(snapshotWorkspace);
  check("snapshot は現在ステージの成果物だけを拾う", snapshot?.artifactEvidence.length === 1 && snapshot.artifactEvidence[0].includes("ci-pipeline/ci-config.md"), JSON.stringify(snapshot));
  check("snapshot は過去ステージの承認待ちを pending と扱わない", snapshot?.pendingHumanEvidence === false, JSON.stringify(snapshot));
  check("snapshot は state と audit の stage outcome を埋める", snapshot?.stateStageOutcome === "Active" && snapshot.auditStageOutcome === "Completed", JSON.stringify(snapshot));
}

const workspace = mkdtempSync(join(tmpdir(), "workflow-warning-traceability-"));
cleanups.push(workspace);

for (const dir of engineDirs) {
  const src = join(root, ".agents/aidlc", dir);
  const dest = join(workspace, ".agents/aidlc", dir);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const utility = join(workspace, ".agents/aidlc/tools/aidlc-utility.ts");
{
  const recordDir = join(workspace, "aidlc", "spaces", "default", "intents", "260704-doctor-order");
  mkdirSync(join(recordDir, "audit"), { recursive: true });
  writeFileSync(join(workspace, "aidlc", "spaces", "default", "intents", "active-intent"), "260704-doctor-order\n", "utf8");
  writeFileSync(
    join(recordDir, "aidlc-state.md"),
    [
      "# AI-DLC State Tracking",
      "",
      "- [x] ci-pipeline",
      "",
      "## Current Status",
      "- **Current Stage**: ci-pipeline",
      "- **Status**: Running",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(recordDir, "audit", "a.md"),
    [
      "# AI-DLC Audit Log",
      "",
      "## Workflow Completion",
      "**Timestamp**: 2026-07-04T10:00:00Z",
      "**Event**: WORKFLOW_COMPLETED",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(recordDir, "audit", "z.md"),
    [
      "# AI-DLC Audit Log",
      "",
      "## Workflow Parked",
      "**Timestamp**: 2026-07-04T09:00:00Z",
      "**Event**: WORKFLOW_PARKED",
      "**Stage**: ci-pipeline",
      "",
    ].join("\n"),
    "utf8",
  );
  const doctorOrder = run(["bun", utility, "doctor"], workspace);
  check("doctor は audit shard のファイル順ではなく時刻順で drift を判定する", doctorOrder.exitCode !== 0 && doctorOrder.stdout.includes("State/audit drift"), doctorOrder.stdout);
}

runExpectSuccess(
  ["bun", utility, "intent-birth", "--scope", "poc", "--arguments", "workflow warning", "--label", "workflow-warning"],
  workspace,
);
const doctor = run(["bun", utility, "doctor"], workspace);
check("doctor は Workflow warnings を表示する", doctor.stdout.includes("Workflow warnings:"), doctor.stdout);

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("workflow warning traceability eval: ok");
