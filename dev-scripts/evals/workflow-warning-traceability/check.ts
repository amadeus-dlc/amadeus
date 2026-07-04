#!/usr/bin/env bun

import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildPrReadinessChecklist,
  buildRequirementEvidenceMap,
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

const workspace = mkdtempSync(join(tmpdir(), "workflow-warning-traceability-"));
cleanups.push(workspace);

for (const dir of engineDirs) {
  const src = join(root, ".agents/aidlc", dir);
  const dest = join(workspace, ".agents/aidlc", dir);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const utility = join(workspace, ".agents/aidlc/tools/aidlc-utility.ts");
runExpectSuccess(
  ["bun", utility, "intent-birth", "--scope", "poc", "--arguments", "workflow warning", "--label", "workflow-warning"],
  workspace,
);
const doctor = run(["bun", utility, "doctor"], workspace);
check("doctor は Workflow warnings を表示する", doctor.stdout.includes("Workflow warnings:"), doctor.stdout);

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("workflow warning traceability eval: ok");
