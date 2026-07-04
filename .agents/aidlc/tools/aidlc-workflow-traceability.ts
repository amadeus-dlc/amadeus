import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  errorMessage,
  escapeRegex,
  findAllEvents,
  getField,
  readAllAuditShards,
  recordDir,
  stateFilePath,
} from "./aidlc-lib.ts";

export type WorkflowWarningKind = "report-mismatch" | "abandoned-stage" | "state-audit-contradiction";
export type EvidenceState = "present" | "missing" | "failed" | "not-applicable";

export interface WorkflowEvidenceSnapshot {
  readonly currentStage: string | null;
  readonly workflowStatus: string | null;
  readonly artifactEvidence: string[];
  readonly auditEvents: string[];
  readonly pendingHumanEvidence: boolean;
  readonly stateStageOutcome?: string;
  readonly auditStageOutcome?: string;
}

export interface WorkflowWarningFinding {
  readonly kind: WorkflowWarningKind;
  readonly label: string;
  readonly evidence: string[];
  readonly nextAction: string;
}

export interface RequirementEvidenceItem {
  readonly requirement: string;
  readonly state: EvidenceState;
  readonly evidence: string;
}

export interface PrReadinessItem {
  readonly label: string;
  readonly state: EvidenceState;
  readonly evidence: string;
}

export function detectWorkflowWarnings(snapshot: WorkflowEvidenceSnapshot): WorkflowWarningFinding[] {
  const findings: WorkflowWarningFinding[] = [];
  const currentStage = snapshot.currentStage;
  if (currentStage !== null) {
    const stageCompleted = snapshot.auditEvents.includes(`STAGE_COMPLETED:${currentStage}`);
    if (snapshot.artifactEvidence.length > 0 && !stageCompleted) {
      findings.push({
        kind: "report-mismatch",
        label: `Artifacts exist for ${currentStage}, but no completed transition was found`,
        evidence: snapshot.artifactEvidence,
        nextAction: "run the matching report command or inspect the stage audit trail",
      });
    }
    const active = snapshot.workflowStatus === "Active" || snapshot.workflowStatus === "InProgress" || snapshot.workflowStatus === "Running";
    if (active && !snapshot.pendingHumanEvidence && !stageCompleted) {
      findings.push({
        kind: "abandoned-stage",
        label: `${currentStage} is active without pending human evidence`,
        evidence: [`status=${snapshot.workflowStatus}`],
        nextAction: "continue the current stage or park the workflow explicitly",
      });
    }
  }
  if (
    snapshot.stateStageOutcome !== undefined &&
    snapshot.auditStageOutcome !== undefined &&
    snapshot.stateStageOutcome !== snapshot.auditStageOutcome
  ) {
    findings.push({
      kind: "state-audit-contradiction",
      label: `State outcome ${snapshot.stateStageOutcome} conflicts with audit outcome ${snapshot.auditStageOutcome}`,
      evidence: [`state=${snapshot.stateStageOutcome}`, `audit=${snapshot.auditStageOutcome}`],
      nextAction: "inspect state and audit before using the workflow as readiness evidence",
    });
  }
  return findings;
}

export function buildRequirementEvidenceMap(items: RequirementEvidenceItem[]): RequirementEvidenceItem[] {
  const byRequirement = new Map(items.map((item) => [item.requirement, item]));
  const requirements = ["R001", "R002", "R003", "R004", "R005", "R006", "R007", "R008", "R009"];
  return requirements.map((requirement) =>
    byRequirement.get(requirement) ?? {
      requirement,
      state: "missing",
      evidence: "no evidence item recorded",
    }
  );
}

export function buildPrReadinessChecklist(items: PrReadinessItem[]): PrReadinessItem[] {
  const required = [
    "Issue linkage",
    "Intent artifacts",
    "Requirement evidence",
    "Verification commands",
    "Validator",
    "Parity state",
    "Scope boundary",
  ];
  const byLabel = new Map(items.map((item) => [item.label, item]));
  return required.map((label) =>
    byLabel.get(label) ?? {
      label,
      state: "missing",
      evidence: "not recorded",
    }
  );
}

function listStageArtifactDirs(root: string, stage: string): string[] {
  if (!existsSync(root)) return [];
  const dirs: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name === stage) {
      dirs.push(path);
      continue;
    }
    dirs.push(...listStageArtifactDirs(path, stage));
  }
  return dirs;
}

function listCurrentStageArtifacts(projectDir: string, currentStage: string | null): string[] {
  const dir = recordDir(projectDir);
  if (dir === null || currentStage === null || currentStage === "none") return [];
  try {
    return listStageArtifactDirs(dir, currentStage)
      .flatMap((stageDir) =>
        readdirSync(stageDir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
          .map((entry) => join(stageDir, entry.name))
      )
      .map((path) => path.replace(`${projectDir}/`, ""));
  } catch {
    return [];
  }
}

function blockHasStage(block: string, stage: string): boolean {
  return new RegExp(`^\\*\\*Stage\\*\\*:\\s*${escapeRegex(stage)}\\s*$`, "m").test(block);
}

function stageEvents(audit: string, event: string, stage: string): { event: string; timestamp: string; block: string }[] {
  return findAllEvents(audit, event)
    .filter((row) => blockHasStage(row.block, stage))
    .map((row) => ({ event, timestamp: row.timestamp, block: row.block }));
}

function latestStageEvent(audit: string, stage: string): string | null {
  const rows = [
    ...stageEvents(audit, "STAGE_STARTED", stage),
    ...stageEvents(audit, "STAGE_AWAITING_APPROVAL", stage),
    ...stageEvents(audit, "GATE_APPROVED", stage),
    ...stageEvents(audit, "HUMAN_APPROVED", stage),
    ...stageEvents(audit, "STAGE_COMPLETED", stage),
  ].sort((a, b) => (a.timestamp === b.timestamp ? 0 : a.timestamp < b.timestamp ? -1 : 1));
  return rows.at(-1)?.event ?? null;
}

function hasPendingHumanEvidence(audit: string, stage: string | null): boolean {
  if (stage === null || stage === "none") return false;
  return latestStageEvent(audit, stage) === "STAGE_AWAITING_APPROVAL";
}

function stageStateOutcome(state: string, stage: string | null): string | undefined {
  if (stage === null || stage === "none") return undefined;
  const match = state.match(new RegExp(`^- \\[([^\\]])\\] ${escapeRegex(stage)}(?:\\s|$)`, "m"));
  if (!match) return undefined;
  if (match[1] === "x") return "Completed";
  if (match[1] === "-") return "Active";
  if (match[1] === "?") return "AwaitingApproval";
  if (match[1] === "R") return "Revising";
  if (match[1] === "S") return "Skipped";
  return "Pending";
}

function auditStageOutcome(audit: string, stage: string | null): string | undefined {
  if (stage === null || stage === "none") return undefined;
  const latest = latestStageEvent(audit, stage);
  if (latest === "STAGE_COMPLETED") return "Completed";
  if (latest === "STAGE_AWAITING_APPROVAL") return "AwaitingApproval";
  if (latest === "STAGE_STARTED") return "Active";
  return undefined;
}

export function buildWorkflowWarningSnapshot(projectDir: string): WorkflowEvidenceSnapshot | null {
  try {
    const state = readFileSync(stateFilePath(projectDir), "utf-8");
    const audit = readAllAuditShards(projectDir);
    const currentStage = getField(state, "Current Stage");
    const workflowStatus = getField(state, "Status");
    const auditEvents: string[] = [];
    if (currentStage !== null && stageEvents(audit, "STAGE_COMPLETED", currentStage).length > 0) {
      auditEvents.push(`STAGE_COMPLETED:${currentStage}`);
    }
    return {
      currentStage,
      workflowStatus,
      artifactEvidence: listCurrentStageArtifacts(projectDir, currentStage),
      auditEvents,
      pendingHumanEvidence: hasPendingHumanEvidence(audit, currentStage),
      stateStageOutcome: stageStateOutcome(state, currentStage),
      auditStageOutcome: auditStageOutcome(audit, currentStage),
    };
  } catch {
    return null;
  }
}

export function formatWorkflowWarnings(projectDir: string): string {
  const snapshot = buildWorkflowWarningSnapshot(projectDir);
  if (snapshot === null) return "Workflow warnings: unavailable";
  const findings = detectWorkflowWarnings(snapshot);
  if (findings.length === 0) return "Workflow warnings: 0 observed";
  return `Workflow warnings: ${findings.length} observed (${findings.map((finding) => `${finding.kind}: ${finding.nextAction}`).join("; ")})`;
}

export function traceabilityErrorText(error: unknown): string {
  return errorMessage(error);
}
