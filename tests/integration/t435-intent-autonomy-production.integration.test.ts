// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-production.ts, file:packages/framework/core/tools/amadeus-autonomy-review-production.ts, subcommand:amadeus-bolt:set-autonomy, subcommand:amadeus-orchestrate:next, subcommand:amadeus-orchestrate:report
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  applyProductionAutonomyMode,
  commitProductionIntentCompletion,
  commitProductionQualityObservation,
  commitProductionQuestionDecision,
  commitProductionStageGateDecision,
  previewProductionAutonomyGrant,
  productionStageAutonomy,
  readProductionAutonomyProjection,
  resumeProductionQuality,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { main as boltMain } from "../../packages/framework/core/tools/amadeus-bolt.ts";
import { listProductionAutoDecisions } from "../../packages/framework/core/tools/amadeus-autonomy-review-production.ts";
import { reviewCommandContentDigest } from "../../packages/framework/core/tools/amadeus-autonomy-review.ts";
import { runUtilityMain } from "../../packages/framework/core/tools/amadeus-utility.ts";

const BUN = process.execPath;

function run(
  projectDir: string,
  tool: string,
  args: string[],
  guard = false,
): { readonly status: number; readonly output: string } {
  const env = { ...process.env };
  env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = guard ? "0" : "1";
  const result = spawnSync(BUN, [join(projectDir, ".claude", "tools", tool), ...args, "--project-dir", projectDir], {
    cwd: projectDir,
    encoding: "utf8",
    env,
  });
  return { status: result.status ?? -1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function recordDir(projectDir: string): string {
  const intents = join(projectDir, "amadeus", "spaces", "default", "intents");
  const active = readFileSync(join(intents, "active-intent"), "utf8").trim();
  return join(intents, active);
}

function state(projectDir: string): string {
  return readFileSync(join(recordDir(projectDir), "amadeus-state.md"), "utf8");
}

function appendLedgerEvent(
  projectDir: string,
  event: "HUMAN_TURN" | "QUESTION_ANSWERED" | "GRANT_ISSUED",
  fields: Record<string, string> = {},
): void {
  const auditDir = join(recordDir(projectDir), "audit");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "production-autonomy-test.jsonl");
  const seq = existsSync(path)
    ? readFileSync(path, "utf8").split("\n").filter(Boolean).length + 1
    : 1;
  appendFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "production-autonomy-test",
    intentId: "production-autonomy-test",
    timestamp: new Date().toISOString(),
    heading: event === "HUMAN_TURN" ? "Human Turn" : "Question Answered",
    event,
    fields,
  })}\n`);
}

function auditEvents(projectDir: string): string[] {
  const auditDir = join(recordDir(projectDir), "audit");
  return readdirSync(auditDir)
    .flatMap((name) => readFileSync(join(auditDir, name), "utf8").split("\n"))
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .map((row) => String(row.event ?? (row.attributes as Record<string, unknown> | undefined)?.Event ?? ""));
}

function selectFullAutonomy(projectDir: string): { readonly status: number; readonly output: string } {
  const preview = run(projectDir, "amadeus-bolt.ts", ["preview-autonomy"]);
  expect(preview.status).toBe(0);
  const digest = (JSON.parse(preview.output.trim()) as { displayDigest: string }).displayDigest;
  appendLedgerEvent(projectDir, "HUMAN_TURN");
  return run(
    projectDir,
    "amadeus-bolt.ts",
    ["set-autonomy", "--mode", "full", "--confirmed-display-digest", digest],
    true,
  );
}

function bornProject(): string {
  const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
  const result = spawnSync(
    BUN,
    [join(projectDir, ".claude", "tools", "amadeus-utility.ts"), "intent-birth", "--scope", "feature", "--project-dir", projectDir],
    { cwd: projectDir, encoding: "utf8", env: { ...process.env } },
  );
  const birth = { status: result.status ?? -1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
  expect(birth.status).toBe(0);
  return projectDir;
}

function applyFullAutonomyInProcess(projectDir: string): void {
  appendLedgerEvent(projectDir, "HUMAN_TURN");
  const stateContent = state(projectDir);
  const preview = previewProductionAutonomyGrant({ projectDir, stateContent });
  expect(preview.ok).toBe(true);
  if (!preview.ok) return;
  expect(applyProductionAutonomyMode({
    projectDir,
    stateContent,
    mode: "full",
    confirmedDisplayDigest: preview.preview.displayDigest,
  })).toMatchObject({ ok: true, projection: { mode: "full" } });
}

let projectDir = "";
afterEach(() => {
  resetOtelPerProject();
  if (projectDir) cleanupTestProject(projectDir);
  projectDir = "";
});

describe("Intent-scoped autonomy production path", () => {
  test("production adapters fail closed when no active Intent exists", () => {
    projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    expect(readProductionAutonomyProjection(projectDir)).toBeNull();
    expect(commitProductionIntentCompletion({ projectDir })).toEqual({ ok: false, error: "active-intent-required" });
    expect(previewProductionAutonomyGrant({ projectDir, stateContent: "" })).toEqual({
      ok: false,
      error: "active-intent-required",
    });
    expect(applyProductionAutonomyMode({ projectDir, stateContent: "", mode: "semi" })).toEqual({
      ok: false,
      error: "active-intent-required",
    });
    expect(productionStageAutonomy({
      projectDir,
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"0".repeat(64)}`,
      walkingSkeleton: false,
    })).toMatchObject({
      mode: "none",
      autoApprove: false,
      authorizationReason: "intent-autonomy-unavailable",
      qualityRepair: "disabled",
    });
    expect(commitProductionStageGateDecision({
      projectDir,
      stateContent: "",
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"0".repeat(64)}`,
      walkingSkeleton: false,
    })).toEqual({ kind: "not-authorized", reason: "active-intent-required" });
    expect(commitProductionQuestionDecision({
      projectDir,
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"0".repeat(64)}`,
      questionId: "missing-intent-question",
      selector: "repair-strategy",
      question: "Which repair strategy?",
      optionIds: ["minimal-fix"],
      recommendedOptionId: "minimal-fix",
    })).toEqual({ kind: "human-required", reason: "active-intent-required", result: null });
    expect(commitProductionQualityObservation({
      projectDir,
      evidence: {
        providerId: "quality-evidence-v1",
        monitorId: "quality-repair",
        stageInstanceId: "missing-intent-stage",
        boltId: "missing-intent-bolt",
        observations: [],
      },
      replanContext: "none",
    })).toEqual({ kind: "error", reason: "active-intent-required" });
    expect(resumeProductionQuality({
      projectDir,
      qualityScopeId: "missing-quality-scope",
      basis: "human-retry",
    })).toEqual({ kind: "error", reason: "active-intent-required" });
  });

  test("drives the production adapters in-process across the full autonomous lifecycle", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");

    const stateContent = state(projectDir);
    const preview = previewProductionAutonomyGrant({ projectDir, stateContent });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const applied = applyProductionAutonomyMode({
      projectDir,
      stateContent,
      mode: "full",
      confirmedDisplayDigest: preview.preview.displayDigest,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    expect(commitProductionQualityObservation({
      projectDir,
      evidence: {
        providerId: "quality-evidence-v1",
        monitorId: "quality-repair",
        stageInstanceId: "direct-ready-stage",
        boltId: "direct-ready-bolt",
        observations: [{
          kind: "reviewer",
          invocationId: "direct-ready-review",
          verifierId: "quality-reviewer",
          validationReceipt: `sha256:${"9".repeat(64)}`,
          verdict: "READY",
          blockers: [],
        }],
      },
      replanContext: "No replan is required for READY evidence.",
    })).toMatchObject({ kind: "READY" });

    const gateInput = {
      projectDir,
      stateContent,
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"a".repeat(64)}`,
      walkingSkeleton: false,
    } as const;
    expect(commitProductionStageGateDecision(gateInput).kind).toBe("decided");
    expect(commitProductionStageGateDecision(gateInput).kind).toBe("already-decided");

    const question = commitProductionQuestionDecision({
      projectDir,
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"b".repeat(64)}`,
      questionId: "direct-production-question",
      selector: "repair-strategy",
      question: "Which repair strategy should be used?",
      optionIds: ["minimal-fix", "broad-refactor"],
      recommendedOptionId: "minimal-fix",
    });
    expect(question.kind).toBe("decided");

    const evidence = {
      providerId: "quality-evidence-v1",
      monitorId: "quality-repair",
      stageInstanceId: "direct-build-and-test-1",
      boltId: "direct-bolt-1",
      observations: [{
        kind: "reviewer" as const,
        invocationId: "direct-review-1",
        verifierId: "quality-reviewer",
        validationReceipt: `sha256:${"c".repeat(64)}`,
        verdict: "NOT-READY" as const,
        blockers: [{
          findingId: "direct-blocker-a",
          artifactId: "build-test-results",
          failureFingerprint: `sha256:${"d".repeat(64)}`,
        }],
      }],
    };
    const qualityOutcomes = Array.from({ length: 7 }, () => commitProductionQualityObservation({
      projectDir,
      evidence,
      replanContext: "Use a fresh repair context after the first non-progress threshold.",
    }));
    expect(qualityOutcomes.map((result) => result.kind)).toEqual([
      "repair", "repair", "repair", "replanned", "repair", "repair", "parked",
    ]);
    const parked = qualityOutcomes.at(-1);
    if (parked?.kind !== "parked") throw new Error("expected quality repair to park");
    // A `human-retry` resume needs a HUMAN_TURN newer than the stall. Audit
    // timestamps are second-truncated, so the grounding turn appended before
    // the park only outranks the stall when no second boundary was crossed.
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    expect(resumeProductionQuality({
      projectDir,
      qualityScopeId: parked.qualityScopeId,
      basis: "human-retry",
    })).toMatchObject({ kind: "resumed", workflowResult: "running" });
    expect(commitProductionIntentCompletion({ projectDir })).toMatchObject({
      ok: true,
      result: { result: { outcome: "completed" } },
    });
  });

  test("legacy standing grants remain diagnostic and cannot authorize production gates", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "GRANT_ISSUED", { "Grant Id": "legacy-standing-grant-1" });

    const projection = readProductionAutonomyProjection(projectDir);
    expect(projection).toMatchObject({
      mode: "none",
      currentGrant: null,
      legacyStandingGrantIds: ["legacy-standing-grant-1"],
      modeProvenance: { kind: "legacy-fail-closed" },
      migrationDiagnostics: [{
        kind: "legacy-non-authoritative",
        legacyGrantId: "legacy-standing-grant-1",
        recommendedHumanAction: "select-intent-autonomy-mode",
      }],
    });
    expect(productionStageAutonomy({
      projectDir,
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"1".repeat(64)}`,
      walkingSkeleton: false,
    })).toMatchObject({
      mode: "none",
      autoApprove: false,
      grantId: null,
      qualityRepair: "disabled",
    });
  });

  test("full grant confirmation binds policies and human downgrade revokes without reusing the grant", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    const stateContent = state(projectDir);
    const policies = [{
      sourceText: "  Prefer the minimal repair  ",
      selector: "repair-strategy",
      optionId: "minimal-fix",
    }] as const;
    const preview = previewProductionAutonomyGrant({
      projectDir,
      stateContent,
      principalId: "human-owner",
      policies,
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    expect(applyProductionAutonomyMode({
      projectDir,
      stateContent,
      mode: "full",
      principalId: "human-owner",
      policies,
      confirmedDisplayDigest: `sha256:${"0".repeat(64)}`,
    })).toEqual({ ok: false, error: "CONFIRMATION_REQUIRED" });
    expect(readProductionAutonomyProjection(projectDir)?.mode).toBe("none");

    const full = applyProductionAutonomyMode({
      projectDir,
      stateContent,
      mode: "full",
      principalId: "human-owner",
      policies,
      confirmedDisplayDigest: preview.preview.displayDigest,
    });
    expect(full).toMatchObject({
      ok: true,
      projection: {
        mode: "full",
        currentGrant: { principalId: "human-owner" },
      },
    });
    if (!full.ok) return;
    expect(full.projection.currentGrant?.policies).toHaveLength(1);
    expect(full.projection.currentGrant?.policies[0]).toMatchObject({
      selector: "repair-strategy",
      normalizedOptionRule: { kind: "exact-option", optionId: "minimal-fix" },
    });
    expect(full.projection.currentGrant?.policies[0]?.sourceTextDigest).toStartWith("sha256:");

    const auditBeforeConflict = auditEvents(projectDir);
    expect(() => commitProductionQualityObservation({
      projectDir,
      evidence: {
        providerId: "quality-evidence-v1",
        monitorId: "quality-repair",
        stageInstanceId: "conflicting-review-stage",
        boltId: "conflicting-review-bolt",
        observations: [{
          kind: "reviewer",
          invocationId: "conflicting-review",
          verifierId: "quality-reviewer",
          validationReceipt: `sha256:${"2".repeat(64)}`,
          verdict: "NOT-READY",
          blockers: [{
            findingId: "duplicate-finding",
            artifactId: "first-artifact",
            failureFingerprint: `sha256:${"3".repeat(64)}`,
          }, {
            findingId: "duplicate-finding",
            artifactId: "second-artifact",
            failureFingerprint: `sha256:${"4".repeat(64)}`,
          }],
        }],
      },
      replanContext: "Conflicting evidence must fail closed.",
    })).toThrow("quality-evidence-INCOMPLETE:conflicting duplicate quality obligation");
    expect(auditEvents(projectDir)).toEqual(auditBeforeConflict);

    appendLedgerEvent(projectDir, "HUMAN_TURN");
    const semi = applyProductionAutonomyMode({ projectDir, stateContent, mode: "semi" });
    expect(semi).toMatchObject({
      ok: true,
      projection: {
        mode: "semi",
        currentGrant: null,
        terminalGrantHistory: [{ state: "revoked" }],
      },
    });

    appendLedgerEvent(projectDir, "HUMAN_TURN");
    expect(applyProductionAutonomyMode({ projectDir, stateContent, mode: "none" })).toMatchObject({
      ok: true,
      projection: { mode: "none", currentGrant: null },
    });
    expect(commitProductionQualityObservation({
      projectDir,
      evidence: {
        providerId: "quality-evidence-v1",
        monitorId: "quality-repair",
        stageInstanceId: "none-mode-stage",
        boltId: "none-mode-bolt",
        observations: [],
      },
      replanContext: "none mode keeps the existing human path",
    })).toEqual({ kind: "error", reason: "none-default-off" });
    expect(resumeProductionQuality({
      projectDir,
      qualityScopeId: "not-stalled",
      basis: "human-retry",
    })).toEqual({ kind: "error", reason: "quality-repair-stall-not-active" });
  });

  test("full uses an available solo election without recommendation degradation", () => {
    projectDir = bornProject();
    applyFullAutonomyInProcess(projectDir);

    const decision = commitProductionQuestionDecision({
      projectDir,
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"5".repeat(64)}`,
      questionId: "production-solo-election",
      selector: "repair-strategy",
      question: "Which repair strategy should be used?",
      optionIds: ["minimal-fix", "broad-refactor"],
      recommendedOptionId: "minimal-fix",
      election: {
        optionId: "broad-refactor",
        evidenceFingerprint: `sha256:${"6".repeat(64)}`,
      },
    });
    expect(decision).toMatchObject({
      kind: "decided",
      decision: {
        selectedOptionId: "broad-refactor",
        decider: "solo-election",
        degradedCapability: null,
      },
    });
  });

  test("REPAIR_STALLED resumes from strict evidence improvement without a human retry", () => {
    projectDir = bornProject();
    applyFullAutonomyInProcess(projectDir);
    const stalledEvidence = {
      providerId: "quality-evidence-v1",
      monitorId: "quality-repair",
      stageInstanceId: "evidence-resume-stage",
      boltId: "evidence-resume-bolt",
      observations: [{
        kind: "reviewer" as const,
        invocationId: "evidence-resume-review",
        verifierId: "quality-reviewer",
        validationReceipt: `sha256:${"7".repeat(64)}`,
        verdict: "NOT-READY" as const,
        blockers: [{
          findingId: "evidence-resume-blocker",
          artifactId: "build-test-results",
          failureFingerprint: `sha256:${"8".repeat(64)}`,
        }],
      }],
    };
    const outcomes = Array.from({ length: 7 }, () => commitProductionQualityObservation({
      projectDir,
      evidence: stalledEvidence,
      replanContext: "Replan once, then stop the fixed-point repair loop.",
    }));
    expect(outcomes.map((result) => result.kind)).toEqual([
      "repair", "repair", "repair", "replanned", "repair", "repair", "parked",
    ]);
    const parked = outcomes.at(-1);
    if (parked?.kind !== "parked") throw new Error("expected production quality to park");

    expect(resumeProductionQuality({
      projectDir,
      qualityScopeId: parked.qualityScopeId,
      basis: "evidence-change",
      evidence: {
        ...stalledEvidence,
        observations: [{
          kind: "reviewer",
          invocationId: "evidence-resume-review",
          verifierId: "quality-reviewer",
          validationReceipt: `sha256:${"9".repeat(64)}`,
          verdict: "READY",
          blockers: [],
        }],
      },
    })).toEqual({
      kind: "resumed",
      qualityScopeId: parked.qualityScopeId,
      workflowResult: "running",
    });
    expect(readProductionAutonomyProjection(projectDir)).toMatchObject({
      workflowExecutionState: "running",
      currentGrant: { state: "active" },
      parkEnvelope: null,
    });
  });

  test("semi is human-grounded, activates quality repair, and auto-approves an internal stage without a fresh HUMAN_TURN", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    const selected = run(projectDir, "amadeus-bolt.ts", ["set-autonomy", "--mode", "semi"], true);
    expect(selected.status).toBe(0);
    expect(state(projectDir)).toContain("- **Intent Autonomy Mode**: semi");
    expect(state(projectDir)).toContain("- **Intent Grant**: none");
    expect(state(projectDir)).toContain("- **Construction Autonomy Mode**: gated");

    const directive = run(projectDir, "amadeus-orchestrate.ts", ["next"]);
    if (directive.status !== 0) throw new Error(directive.output);
    const parsed = JSON.parse(directive.output.trim()) as Record<string, unknown>;
    expect(parsed.intent_autonomy_mode).toBe("semi");
    expect(parsed.autonomy_auto_approve).toBe(true);
    expect(parsed.quality_repair).toBe("active");
    expect(productionStageAutonomy({
      projectDir,
      stage: "approval-handoff",
      phase: "ideation",
      graphRevision: `sha256:${"a".repeat(64)}`,
      walkingSkeleton: false,
      phaseBoundary: true,
    }).autoApprove).toBe(false);

    const stage = String(parsed.stage);
    expect(run(projectDir, "amadeus-state.ts", ["gate-start", stage]).status).toBe(0);
    appendLedgerEvent(projectDir, "QUESTION_ANSWERED");
    const reported = run(
      projectDir,
      "amadeus-orchestrate.ts",
      ["report", "--stage", stage, "--result", "approved"],
      true,
    );
    expect(reported.status).toBe(0);
    expect(reported.output).toContain('"kind":"done"');
    expect(auditEvents(projectDir).filter((event) => event === "INTENT_AUTONOMY_TRANSACTION_COMMITTED").length)
      .toBeGreaterThanOrEqual(2);
  });

  test("full emits an active Intent grant and authorizes the walking-skeleton gate", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    const selected = selectFullAutonomy(projectDir);
    expect(selected.status).toBe(0);
    const grantId = (JSON.parse(selected.output.trim()) as { grant_id: string }).grant_id;
    expect(grantId).toStartWith("intent-grant-");
    expect(state(projectDir)).toContain("- **Intent Autonomy Mode**: full");
    expect(state(projectDir)).toContain(`- **Intent Grant**: ${grantId}`);

    const directive = run(projectDir, "amadeus-orchestrate.ts", ["next"]);
    if (directive.status !== 0) throw new Error(directive.output);
    const parsed = JSON.parse(directive.output.trim()) as Record<string, unknown>;
    expect(parsed.intent_autonomy_mode).toBe("full");
    expect(parsed.autonomy_auto_approve).toBe(true);
    expect(parsed.intent_grant_id).toBe(grantId);
    expect(parsed.quality_repair).toBe("active");
    expect(productionStageAutonomy({
      projectDir,
      stage: "approval-handoff",
      phase: "ideation",
      graphRevision: `sha256:${"a".repeat(64)}`,
      walkingSkeleton: false,
      phaseBoundary: true,
    }).autoApprove).toBe(true);
  });

  test("mode selection refuses when no real HUMAN_TURN grounds it", () => {
    projectDir = bornProject();
    const selected = run(projectDir, "amadeus-bolt.ts", ["set-autonomy", "--mode", "full"], true);
    expect(selected.status).not.toBe(0);
    expect(selected.output).toContain("PROVENANCE_REQUIRED");
    expect(auditEvents(projectDir)).not.toContain("INTENT_AUTONOMY_TRANSACTION_COMMITTED");
  });

  test("full resolves a production question and records loud recommendation degradation", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    expect(selectFullAutonomy(projectDir).status).toBe(0);
    const inputPath = join(projectDir, "question-decision.json");
    writeFileSync(inputPath, JSON.stringify({
      stage: "code-generation",
      phase: "construction",
      questionId: "choose-repair",
      selector: "repair-strategy",
      question: "Which repair strategy should be used?",
      optionIds: ["minimal-fix", "broad-refactor"],
      recommendedOptionId: "minimal-fix",
    }));
    const decision = run(projectDir, "amadeus-bolt.ts", ["decide-question", "--input", inputPath]);
    expect(decision.status).toBe(0);
    const parsed = JSON.parse(decision.output.trim()) as {
      kind: string;
      decision: { selectedOptionId: string; decider: string; degradedCapability: { reason: string } | null };
    };
    expect(parsed.kind).toBe("decided");
    expect(parsed.decision.selectedOptionId).toBe("minimal-fix");
    expect(parsed.decision.decider).toBe("agent-recommendation");
    expect(parsed.decision.degradedCapability?.reason).toBe("native-solo-election-result-unavailable");

    const machineStatus = run(projectDir, "amadeus-utility.ts", ["status", "--json"]);
    expect(machineStatus.status).toBe(0);
    expect(JSON.parse(machineStatus.output.trim())).toMatchObject({
      autonomy: {
        autonomyMode: "full",
        workflowExecutionState: "running",
        unreviewedAutoDecisionCount: 1,
      },
    });
    const humanStatus = run(projectDir, "amadeus-utility.ts", ["status"]);
    expect(humanStatus.output).toContain("Autonomy:       full");
    expect(humanStatus.output).toContain("Grant Scope:");
    expect(humanStatus.output).toContain("Unreviewed:     1");
    expect(humanStatus.output).toContain("Resume:         none");
  });

  test("Core Intent completion terminalizes a full grant without any live receipt", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    expect(selectFullAutonomy(projectDir).status).toBe(0);
    expect(process.env.AMADEUS_INTENT_COMPLETION_LIVE).not.toBe("1");
    const completed = commitProductionIntentCompletion({ projectDir });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.result.result.outcome).toBe("completed");
    expect(completed.result.result.grant?.state).toBe("completed");
    const projection = readProductionAutonomyProjection(projectDir);
    expect(projection?.workflowExecutionState).toBeNull();
    expect(projection?.currentGrant).toBeNull();
  });

  test("full repairs repeated quality failures, replans once, and durably parks a stalled loop", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    expect(selectFullAutonomy(projectDir).status).toBe(0);
    const inputPath = join(projectDir, "quality-observation.json");
    writeFileSync(inputPath, JSON.stringify({
      evidence: {
        providerId: "quality-evidence-v1",
        monitorId: "quality-repair",
        stageInstanceId: "build-and-test-1",
        boltId: "bolt-1",
        observations: [{
          kind: "reviewer",
          invocationId: "review-1",
          verifierId: "quality-reviewer",
          validationReceipt: `sha256:${"a".repeat(64)}`,
          verdict: "NOT-READY",
          blockers: [{
            findingId: "blocker-a",
            artifactId: "build-test-results",
            failureFingerprint: `sha256:${"b".repeat(64)}`,
          }],
        }],
      },
      replanContext: "Use a fresh repair context after the first non-progress threshold.",
    }));
    const outcomes = Array.from({ length: 7 }, () => {
      const result = run(projectDir, "amadeus-bolt.ts", ["observe-quality", "--input", inputPath]);
      if (result.status !== 0) throw new Error(result.output);
      return JSON.parse(result.output.trim()) as {
        kind: string;
        qualityScopeId?: string;
        workflowResult?: { reasonCode: string; grant: { state: string } };
      };
    });
    expect(outcomes.map((result) => result.kind)).toEqual([
      "repair", "repair", "repair", "replanned", "repair", "repair", "parked",
    ]);
    expect(outcomes.at(-1)?.workflowResult).toMatchObject({
      reasonCode: "REPAIR_STALLED",
      grant: { state: "active" },
    });
    const projection = readProductionAutonomyProjection(projectDir);
    expect(projection?.workflowExecutionState).toBe("suspended");
    expect(projection?.currentGrant?.state).toBe("active");

    const replayed = run(projectDir, "amadeus-bolt.ts", ["observe-quality", "--input", inputPath]);
    expect(replayed.status).toBe(0);
    expect(JSON.parse(replayed.output.trim())).toMatchObject({ kind: "parked" });

    const resumePath = join(projectDir, "quality-resume.json");
    writeFileSync(resumePath, JSON.stringify({
      qualityScopeId: outcomes.at(-1)!.qualityScopeId,
      basis: "human-retry",
    }));
    const prematureResume = run(projectDir, "amadeus-bolt.ts", ["resume-quality", "--input", resumePath]);
    expect(prematureResume.status).not.toBe(0);
    expect(prematureResume.output).toContain("fresh-human-retry-required");

    appendLedgerEvent(projectDir, "HUMAN_TURN");
    const resumed = run(projectDir, "amadeus-bolt.ts", ["resume-quality", "--input", resumePath]);
    if (resumed.status !== 0) throw new Error(resumed.output);
    expect(resumed.status).toBe(0);
    expect(JSON.parse(resumed.output.trim())).toMatchObject({
      kind: "resumed",
      qualityScopeId: outcomes.at(-1)!.qualityScopeId,
      workflowResult: "running",
    });
    const resumedProjection = readProductionAutonomyProjection(projectDir);
    expect(resumedProjection?.workflowExecutionState).toBe("running");
    expect(resumedProjection?.currentGrant?.state).toBe("active");
  }, 120_000);

  test("bolt autonomy verbs drive the shipped handlers in-process", () => {
    projectDir = bornProject();
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    const policiesPath = join(projectDir, "policies.json");
    writeFileSync(policiesPath, JSON.stringify([{
      sourceText: "Prefer the minimal fix for repair-strategy questions.",
      selector: "repair-strategy",
      optionId: "minimal-fix",
    }]));
    boltMain(["--project-dir", projectDir, "preview-autonomy", "--policies-file", policiesPath]);
    const preview = previewProductionAutonomyGrant({
      projectDir,
      stateContent: state(projectDir),
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    boltMain([
      "--project-dir", projectDir,
      "set-autonomy", "--mode", "full",
      "--confirmed-display-digest", preview.preview.displayDigest,
    ]);
    expect(state(projectDir)).toContain("- **Intent Autonomy Mode**: full");
    expect(readProductionAutonomyProjection(projectDir)?.mode).toBe("full");

    const questionPath = join(projectDir, "question-decision-inprocess.json");
    writeFileSync(questionPath, JSON.stringify({
      stage: "code-generation",
      phase: "construction",
      graphRevision: `sha256:${"e".repeat(64)}`,
      questionId: "choose-repair-inprocess",
      selector: "repair-strategy",
      question: "Which repair strategy should be used?",
      optionIds: ["minimal-fix", "broad-refactor"],
      recommendedOptionId: "minimal-fix",
    }));
    boltMain(["--project-dir", projectDir, "decide-question", "--input", questionPath]);

    const observationPath = join(projectDir, "quality-observation-inprocess.json");
    writeFileSync(observationPath, JSON.stringify({
      evidence: {
        providerId: "quality-evidence-v1",
        monitorId: "quality-repair",
        stageInstanceId: "build-and-test-inprocess",
        boltId: "bolt-inprocess",
        observations: [{
          kind: "reviewer",
          invocationId: "review-inprocess-1",
          verifierId: "quality-reviewer",
          validationReceipt: `sha256:${"c".repeat(64)}`,
          verdict: "NOT-READY",
          blockers: [{
            findingId: "blocker-inprocess",
            artifactId: "build-test-results",
            failureFingerprint: `sha256:${"d".repeat(64)}`,
          }],
        }],
      },
      replanContext: "Use a fresh repair context after the first non-progress threshold.",
    }));
    boltMain(["--project-dir", projectDir, "observe-quality", "--input", observationPath]);
    expect(readProductionAutonomyProjection(projectDir)?.workflowExecutionState).toBe("running");

    boltMain(["--project-dir", projectDir, "list-auto-decisions", "--state", "unreviewed"]);
    const unreviewed = listProductionAutoDecisions({ projectDir, reviewState: "unreviewed" });
    if (!unreviewed.ok) throw new Error(unreviewed.error);
    const decisionId = unreviewed.page.items[0]?.decisionId;
    if (decisionId === undefined) throw new Error("expected an unreviewed production decision");
    boltMain(["--project-dir", projectDir, "get-auto-decision", "--decision", decisionId]);
    boltMain(["--project-dir", projectDir, "get-auto-decision", "--decision", decisionId, "--choice", "accept"]);
    appendLedgerEvent(projectDir, "HUMAN_TURN");
    const confirmed = reviewCommandContentDigest({
      targetIntentUuid: readProductionAutonomyProjection(projectDir)!.intentUuid,
      decisionId,
      choice: "accept",
      flagClassification: null,
      safeNoteDigest: null,
    });
    boltMain([
      "--project-dir", projectDir,
      "review-auto-decision", "--decision", decisionId,
      "--choice", "accept", "--confirmed-review-digest", confirmed,
    ]);
    const accepted = listProductionAutoDecisions({ projectDir, reviewState: "accepted" });
    if (!accepted.ok) throw new Error(accepted.error);
    expect(accepted.page.items.map((item) => item.decisionId)).toContain(decisionId);
  }, 60_000);

  test("utility status renders the autonomy projection in-process", () => {
    projectDir = bornProject();
    applyFullAutonomyInProcess(projectDir);
    const savedArgv = process.argv;
    const savedGraph = process.env.AMADEUS_STAGE_GRAPH;
    process.env.AMADEUS_STAGE_GRAPH = join(projectDir, ".claude", "tools", "data", "stage-graph.json");
    try {
      process.argv = [savedArgv[0], "amadeus-utility.ts", "status", "--project-dir", projectDir];
      runUtilityMain();
      process.argv = [savedArgv[0], "amadeus-utility.ts", "status", "--json", "--project-dir", projectDir];
      runUtilityMain();
    } finally {
      process.argv = savedArgv;
      if (savedGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
      else process.env.AMADEUS_STAGE_GRAPH = savedGraph;
    }
    expect(readProductionAutonomyProjection(projectDir)?.mode).toBe("full");
  }, 60_000);
});
