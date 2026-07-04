import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  errorMessage,
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
    const active = snapshot.workflowStatus === "Active" || snapshot.workflowStatus === "InProgress";
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

function listCodeGenerationArtifacts(projectDir: string): string[] {
  const dir = recordDir(projectDir);
  if (dir === null) return [];
  try {
    const construction = join(dir, "construction");
    return readdirSync(construction)
      .flatMap((unit) => {
        const codeSummary = join(construction, unit, "code-generation", "code-summary.md");
        return Bun.file(codeSummary).size > 0 ? [codeSummary] : [];
      })
      .map((path) => path.replace(`${projectDir}/`, ""));
  } catch {
    return [];
  }
}

export function buildWorkflowWarningSnapshot(projectDir: string): WorkflowEvidenceSnapshot | null {
  try {
    const state = readFileSync(stateFilePath(projectDir), "utf-8");
    const audit = readAllAuditShards(projectDir);
    const currentStage = getField(state, "Current Stage");
    const workflowStatus = getField(state, "Status");
    const auditEvents: string[] = [];
    if (currentStage !== null && audit.includes("**Event**: STAGE_COMPLETED") && audit.includes(`**Stage**: ${currentStage}`)) {
      auditEvents.push(`STAGE_COMPLETED:${currentStage}`);
    }
    return {
      currentStage,
      workflowStatus,
      artifactEvidence: listCodeGenerationArtifacts(projectDir),
      auditEvents,
      pendingHumanEvidence:
        audit.includes("ASK_USER_QUESTION") ||
        audit.includes("AWAITING_APPROVAL") ||
        audit.includes("HUMAN_APPROVED"),
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
