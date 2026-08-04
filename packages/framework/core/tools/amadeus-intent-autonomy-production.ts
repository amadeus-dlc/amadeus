// Production adapter for Intent-scoped autonomy (#2067).
//
// The domain modules deliberately own no filesystem or workflow-engine policy.
// This adapter is the single bridge used by the orchestrator, the approval
// transaction, and the human mode command. Harnesses consume the same projected
// Core file; no harness-specific autonomy branch is permitted here.

import {
  autonomyDigest,
  authorizeInteraction,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  createInteractionOccurrence,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  type AutonomyMode,
  type AutonomyProjection,
  type DecisionPolicyInput,
  type DecisionFact,
  type GrantScopeDescriptor,
  type HumanAutonomyCommand,
  type InteractionKind,
  type WorkflowResult,
} from "./amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  resolveIntentQualityActivation,
  type AutonomyDecisionResult,
  type IntentAutonomyCoordinator,
} from "./amadeus-intent-autonomy-runtime.ts";
import { createAuditIntentAutonomyRepository } from "./amadeus-intent-autonomy-replay.ts";
import {
  createFirstPartyQualityContribution,
  emptyQualityPluginProjection,
  qualityDigest,
  qualityStableId,
  type QualityEvidenceBatchInput,
} from "./amadeus-quality-repair.ts";
import {
  createQualityRepairCoordinator,
  type QualityRepairRepository,
  type QualityReplanPort,
} from "./amadeus-quality-repair-runtime.ts";
import { createAuditQualityRepairRepository } from "./amadeus-quality-repair-replay.ts";
import type { JudgePort } from "./amadeus-loop-monitor-runtime.ts";
import {
  activeIntent,
  activeIntentUuid,
  activeSpace,
  auditBlockField,
  findAllEvents,
  getField,
  humanActedSinceGate,
  listIntents,
  readAllAuditShards,
} from "./amadeus-lib.ts";

const ALL_INTERACTIONS: readonly InteractionKind[] = [
  "stage-gate",
  "phase-gate",
  "walking-skeleton",
  "question",
];

const PROHIBITED_EFFECTS = [
  "new-permission",
  "irreversible",
  "scope-out",
  "norm-waiver",
  "quality-waiver",
] as const;

export interface ProductionAutonomyContext {
  readonly mode: AutonomyMode;
  readonly autoApprove: boolean;
  readonly grantId: string | null;
  readonly authorizationReason: string;
  readonly qualityRepair: "active" | "disabled" | "error";
}

type ResolvedIntent = {
  readonly space: string;
  readonly intentDir: string;
  readonly intentUuid: string;
};

function resolveIntent(projectDir: string, intent?: string, requestedSpace?: string): ResolvedIntent | null {
  const space = requestedSpace ?? activeSpace(projectDir);
  const intentDir = activeIntent(projectDir, space, intent);
  const intentUuid = intent === undefined
    ? activeIntentUuid(projectDir, space)
    : listIntents(projectDir, space).find((candidate) => candidate.dirName === intentDir)?.uuid ?? null;
  return intentDir === null || intentUuid === null ? null : { space, intentDir, intentUuid };
}

function coordinatorFor(projectDir: string, resolved: ResolvedIntent): IntentAutonomyCoordinator {
  const audit = readAllAuditShards(projectDir, resolved.intentDir, resolved.space);
  const legacyModeHistory = findAllEvents(audit, "AUTONOMY_MODE_SET").length > 0;
  const legacyStandingGrants = findAllEvents(audit, "GRANT_ISSUED").flatMap((row) => {
    const grantId = auditBlockField(row.block, "Grant Id");
    if (grantId === null) return [];
    return [{
      eventIdentity: autonomyDigest({ event: "GRANT_ISSUED", grantId, timestamp: row.timestamp }),
      grantId,
      observedState: legacyModeHistory ? "legacy-standing-grant-with-mode-history" : "legacy-standing-grant",
    }];
  });
  const repository = createAuditIntentAutonomyRepository({
    projectDir,
    intent: resolved.intentDir,
    space: resolved.space,
  });
  return createIntentAutonomyCoordinator({
    initialProjection: createAutonomyProjection({
      intentUuid: resolved.intentUuid,
      legacyStandingGrants,
    }),
    repository,
  });
}

export function readProductionAutonomyProjection(
  projectDir: string,
  intent?: string,
  space?: string,
): AutonomyProjection | null {
  const resolved = resolveIntent(projectDir, intent, space);
  return resolved === null ? null : coordinatorFor(projectDir, resolved).readProjection();
}

export function commitProductionIntentCompletion(input: {
  readonly projectDir: string;
  readonly intent?: string;
  readonly space?: string;
}): { readonly ok: true; readonly result: Exclude<ReturnType<IntentAutonomyCoordinator["complete"]>, { readonly error: string }> } |
  { readonly ok: false; readonly error: string } {
  const resolved = resolveIntent(input.projectDir, input.intent, input.space);
  if (resolved === null) return { ok: false, error: "active-intent-required" };
  const result = coordinatorFor(input.projectDir, resolved).complete();
  return "error" in result ? { ok: false, error: result.error } : { ok: true, result };
}

function interactionKind(input: { readonly walkingSkeleton: boolean; readonly phaseBoundary?: boolean }): InteractionKind {
  if (input.walkingSkeleton) return "walking-skeleton";
  return input.phaseBoundary ? "phase-gate" : "stage-gate";
}

function occurrence(input: {
  readonly projection: AutonomyProjection;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
}) {
  const kind = interactionKind(input);
  return createInteractionOccurrence({
    intentUuid: input.projection.intentUuid,
    kind,
    stage: kind === "phase-gate" ? null : input.stage,
    phase: input.phase,
    bolt: null,
    interactionId: `${kind}-${input.stage}`,
    selector: `${kind}-${input.stage}`,
    question: `Approve ${kind} ${input.stage}`,
    optionIds: ["approve", "request-changes"],
    graphRevision: input.graphRevision,
  });
}

function qualityState(projection: AutonomyProjection): ProductionAutonomyContext["qualityRepair"] {
  const activation = resolveIntentQualityActivation({
    autonomy: projection,
    qualityProjection: emptyQualityPluginProjection(projection.intentUuid),
    contribution: createFirstPartyQualityContribution(3),
  });
  return activation.kind;
}

export function productionStageAutonomy(input: {
  readonly projectDir: string;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
}): ProductionAutonomyContext {
  const projection = readProductionAutonomyProjection(input.projectDir);
  if (projection === null) {
    return {
      mode: "none",
      autoApprove: false,
      grantId: null,
      authorizationReason: "intent-autonomy-unavailable",
      qualityRepair: "disabled",
    };
  }
  const authorization = authorizeProductionOccurrence(projection, occurrence({ ...input, projection }));
  const qualityRepair = qualityState(projection);
  return {
    mode: projection.mode,
    autoApprove: authorization.authorized && qualityRepair !== "error",
    grantId: projection.currentGrant?.grantId ?? null,
    authorizationReason: authorization.reason,
    qualityRepair,
  };
}

function authorizeProductionOccurrence(
  projection: AutonomyProjection,
  target: ReturnType<typeof occurrence>,
): { readonly authorized: boolean; readonly reason: string } {
  const authorization = authorizeInteraction(projection, target);
  return authorization.kind === "human-required"
    ? { authorized: false, reason: authorization.reason }
    : { authorized: true, reason: authorization.kind };
}

function latestHumanTurnId(projectDir: string, resolved: ResolvedIntent): string | null {
  if (!humanActedSinceGate(projectDir)) return null;
  const turns = findAllEvents(
    readAllAuditShards(projectDir, resolved.intentDir, resolved.space),
    "HUMAN_TURN",
  );
  return turns.at(-1)?.timestamp ?? null;
}

function grantScope(input: {
  readonly projection: AutonomyProjection;
  readonly stateContent: string;
}): GrantScopeDescriptor {
  const scopeId = getField(input.stateContent, "Scope") ?? "intent";
  const scopeFingerprint = autonomyDigest({ intentUuid: input.projection.intentUuid, scopeId });
  return {
    intentUuid: input.projection.intentUuid,
    scopeId,
    scopeFingerprint,
    normFingerprint: autonomyDigest({ scopeId, rules: "resolved-rules-in-context-v1" }),
    allowedInteractionKinds: ALL_INTERACTIONS,
    permissionBoundaryFingerprint: autonomyDigest("native-host-permission-boundary-v1"),
    prohibitedEffects: PROHIBITED_EFFECTS,
  };
}

function grantDisplayDigest(input: {
  readonly intentUuid: string;
  readonly principalId: string;
  readonly scope: GrantScopeDescriptor;
  readonly policies: readonly DecisionPolicyInput[];
}): string {
  return autonomyDigest({
    intentUuid: input.intentUuid,
    principalId: input.principalId,
    scope: input.scope,
    policies: input.policies.map((policy) => ({
      sourceText: policy.sourceText.trim(),
      selector: policy.selector,
      optionId: policy.optionId,
    })),
  });
}

export function previewProductionAutonomyGrant(input: {
  readonly projectDir: string;
  readonly stateContent: string;
  readonly principalId?: string;
  readonly policies?: readonly DecisionPolicyInput[];
}): { readonly ok: true; readonly preview: {
  readonly intentUuid: string;
  readonly principalId: string;
  readonly scope: GrantScopeDescriptor;
  readonly policies: readonly DecisionPolicyInput[];
  readonly displayDigest: string;
} } | { readonly ok: false; readonly error: string } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { ok: false, error: "active-intent-required" };
  const projection = coordinatorFor(input.projectDir, resolved).readProjection();
  const principalId = input.principalId ?? "local-human";
  const policies = input.policies ?? [];
  const scope = grantScope({ projection, stateContent: input.stateContent });
  return {
    ok: true,
    preview: {
      intentUuid: projection.intentUuid,
      principalId,
      scope,
      policies,
      displayDigest: grantDisplayDigest({ intentUuid: projection.intentUuid, principalId, scope, policies }),
    },
  };
}

function prepareFullGrantCommand(input: {
  readonly before: AutonomyProjection;
  readonly stateContent: string;
  readonly principalId: string;
  readonly humanTurnId: string;
  readonly policies: readonly DecisionPolicyInput[];
  readonly confirmedDisplayDigest?: string;
}): { readonly ok: true; readonly command: HumanAutonomyCommand; readonly issuanceDigest: string } |
  { readonly ok: false; readonly error: string } {
  const scope = grantScope({ projection: input.before, stateContent: input.stateContent });
  const expectedDisplayDigest = grantDisplayDigest({
    intentUuid: input.before.intentUuid,
    principalId: input.principalId,
    scope,
    policies: input.policies,
  });
  if (input.confirmedDisplayDigest !== expectedDisplayDigest) {
    return { ok: false, error: "CONFIRMATION_REQUIRED" };
  }
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: `grant-preview-${input.before.intentUuid}`,
    scopeFingerprint: scope.scopeFingerprint,
    humanTurnId: input.humanTurnId,
    policies: input.policies,
  });
  return {
    ok: true,
    command: { kind: input.before.currentGrant === null ? "issue-full" : "replace-full", scope, policies },
    issuanceDigest: grantIssuanceDisplayDigest({
      intentUuid: input.before.intentUuid,
      principalId: input.principalId,
      scope,
      policies,
    }),
  };
}

function prepareNonFullCommand(
  before: AutonomyProjection,
  mode: Exclude<AutonomyMode, "full">,
): { readonly command: HumanAutonomyCommand; readonly displayDigest: string } {
  if (before.currentGrant !== null) {
    return {
      command: { kind: "revoke-full", targetMode: mode },
      displayDigest: autonomyDigest({ intentUuid: before.intentUuid, mode, revoke: before.currentGrant.grantId }),
    };
  }
  return {
    command: { kind: "set-mode", mode },
    displayDigest: autonomyDigest({ intentUuid: before.intentUuid, mode }),
  };
}

export function applyProductionAutonomyMode(input: {
  readonly projectDir: string;
  readonly stateContent: string;
  readonly mode: AutonomyMode;
  readonly principalId?: string;
  readonly policies?: readonly DecisionPolicyInput[];
  readonly confirmedDisplayDigest?: string;
}): { readonly ok: true; readonly projection: AutonomyProjection } | { readonly ok: false; readonly error: string } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { ok: false, error: "active-intent-required" };
  const humanTurnId = latestHumanTurnId(input.projectDir, resolved);
  if (humanTurnId === null) return { ok: false, error: "PROVENANCE_REQUIRED" };
  const coordinator = coordinatorFor(input.projectDir, resolved);
  const before = coordinator.readProjection();
  const principalId = input.principalId ?? "local-human";
  let command: HumanAutonomyCommand;
  let confirmedDisplayDigest: string;
  if (input.mode === "full") {
    const prepared = prepareFullGrantCommand({
      before,
      stateContent: input.stateContent,
      principalId,
      humanTurnId,
      policies: input.policies ?? [],
      confirmedDisplayDigest: input.confirmedDisplayDigest,
    });
    if (!prepared.ok) return prepared;
    command = prepared.command;
    confirmedDisplayDigest = prepared.issuanceDigest;
  } else {
    const prepared = prepareNonFullCommand(before, input.mode);
    command = prepared.command;
    confirmedDisplayDigest = prepared.displayDigest;
  }
  const result = coordinator.applyHumanCommand(command, {
    targetIntentUuid: before.intentUuid,
    principalId,
    humanTurn: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: humanTurnId },
    commandOccurrenceId: `autonomy-mode-${input.mode}-${humanTurnId}`,
    expectedProjectionRevision: before.projectionRevision,
    confirmedDisplayDigest,
  });
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, projection: coordinator.readProjection() };
}

export function commitProductionStageGateDecision(input: {
  readonly projectDir: string;
  readonly stateContent: string;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly walkingSkeleton: boolean;
  readonly phaseBoundary?: boolean;
}): { readonly kind: "not-authorized"; readonly reason: string } |
  { readonly kind: "already-decided"; readonly grantId: string | null } |
  { readonly kind: "decided"; readonly grantId: string | null; readonly result: AutonomyDecisionResult } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { kind: "not-authorized", reason: "active-intent-required" };
  const coordinator = coordinatorFor(input.projectDir, resolved);
  const projection = coordinator.readProjection();
  const target = occurrence({ ...input, projection });
  const authorization = authorizeProductionOccurrence(projection, target);
  if (!authorization.authorized) return { kind: "not-authorized", reason: authorization.reason };
  if (projection.autoDecisions.some((decision) => decision.occurrenceId === target.occurrenceId)) {
    return { kind: "already-decided", grantId: projection.currentGrant?.grantId ?? null };
  }
  const scopeFingerprint = projection.currentGrant?.scope.scopeFingerprint ??
    autonomyDigest({ intentUuid: projection.intentUuid, scope: getField(input.stateContent, "Scope") ?? "intent" });
  const normFingerprint = projection.currentGrant?.scope.normFingerprint ??
    autonomyDigest({ scopeFingerprint, rules: "resolved-rules-in-context-v1" });
  const payload = { action: "approve-stage", stage: input.stage };
  const effect = {
    effectId: `approve-stage-${input.stage}`,
    optionId: "approve",
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification: "workflow-reversible" as const,
    requiredScopeFingerprint: scopeFingerprint,
    applicableNormFingerprint: normFingerprint,
  };
  const registry = createDecisionOptionEffectRegistry({
    revision: autonomyDigest(effect),
    effects: [effect],
  });
  const result = coordinator.decide({
    occurrence: target,
    actorId: "amadeus-engine",
    registry,
    currentNormFingerprint: normFingerprint,
    scopeLineageFingerprint: scopeFingerprint,
    applicableNormFacts: [],
    pastHumanRulings: [],
    capability: {
      soloElectionAvailable: false,
      elect: () => ({ optionId: "approve", evidenceFingerprint: autonomyDigest("unreachable-election") }),
      recommend: () => ({ optionId: "approve", evidenceFingerprint: autonomyDigest("stage-gate-default") }),
      unavailableReason: "stage-gate-is-deterministic",
    },
    gateApprovalOptionId: "approve",
  });
  if (result.kind !== "decided") return { kind: "not-authorized", reason: result.kind };
  return { kind: "decided", grantId: projection.currentGrant?.grantId ?? null, result };
}

export interface ProductionQuestionDecisionInput {
  readonly projectDir: string;
  readonly stage: string;
  readonly phase: string;
  readonly graphRevision: string;
  readonly questionId: string;
  readonly selector: string;
  readonly question: string;
  readonly optionIds: readonly string[];
  readonly recommendedOptionId: string;
  readonly applicableNormFacts?: readonly DecisionFact[];
  readonly pastHumanRulings?: readonly DecisionFact[];
  readonly election?: { readonly optionId: string; readonly evidenceFingerprint: string };
}

export function commitProductionQuestionDecision(input: ProductionQuestionDecisionInput): AutonomyDecisionResult {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { kind: "human-required", reason: "active-intent-required", result: null };
  const coordinator = coordinatorFor(input.projectDir, resolved);
  const projection = coordinator.readProjection();
  const target = createInteractionOccurrence({
    intentUuid: projection.intentUuid,
    kind: "question",
    stage: input.stage,
    phase: input.phase,
    bolt: null,
    interactionId: input.questionId,
    selector: input.selector,
    question: input.question,
    optionIds: input.optionIds,
    graphRevision: input.graphRevision,
  });
  const scopeFingerprint = projection.currentGrant?.scope.scopeFingerprint ?? autonomyDigest("no-grant");
  const normFingerprint = projection.currentGrant?.scope.normFingerprint ?? autonomyDigest("no-grant-norm");
  const effects = input.optionIds.map((optionId) => {
    const payload = { action: "answer-question", questionId: input.questionId, optionId };
    return {
      effectId: `answer-${input.questionId}-${optionId}`,
      optionId,
      payload,
      payloadFingerprint: autonomyDigest(payload),
      classification: "workflow-reversible" as const,
      requiredScopeFingerprint: scopeFingerprint,
      applicableNormFingerprint: normFingerprint,
    };
  });
  const registry = createDecisionOptionEffectRegistry({ revision: autonomyDigest(effects), effects });
  return coordinator.decide({
    occurrence: target,
    actorId: "amadeus-conductor",
    registry,
    currentNormFingerprint: normFingerprint,
    scopeLineageFingerprint: scopeFingerprint,
    applicableNormFacts: input.applicableNormFacts ?? [],
    pastHumanRulings: input.pastHumanRulings ?? [],
    capability: {
      soloElectionAvailable: input.election !== undefined,
      elect: () => input.election ?? {
        optionId: input.recommendedOptionId,
        evidenceFingerprint: autonomyDigest("unavailable-election"),
      },
      recommend: () => ({
        optionId: input.recommendedOptionId,
        evidenceFingerprint: autonomyDigest({ questionId: input.questionId, optionId: input.recommendedOptionId }),
      }),
      unavailableReason: input.election === undefined ? "native-solo-election-result-unavailable" : null,
    },
  });
}

export interface ProductionQualityObservationInput {
  readonly projectDir: string;
  readonly evidence: Omit<QualityEvidenceBatchInput, "intentUuid" | "graphRevision" | "previousSnapshot">;
  readonly replanContext: string;
}

export type ProductionQualityObservationResult =
  | { readonly kind: "READY" | "repair" | "replanned"; readonly evidenceFingerprint: string }
  | { readonly kind: "parked"; readonly qualityScopeId: string; readonly workflowResult: WorkflowResult }
  | { readonly kind: "error"; readonly reason: string };

export interface ProductionQualityResumeInput {
  readonly projectDir: string;
  readonly qualityScopeId: string;
  readonly basis: "evidence-change" | "human-retry";
  readonly evidence?: Omit<QualityEvidenceBatchInput, "intentUuid" | "graphRevision" | "previousSnapshot">;
}

export type ProductionQualityResumeResult =
  | { readonly kind: "resumed"; readonly qualityScopeId: string; readonly workflowResult: "running" }
  | { readonly kind: "error"; readonly reason: string };

function deterministicQualityJudge(): JudgePort {
  return {
    dispatch(request) {
      return {
        kind: "completed",
        result: {
          invocationId: request.invocationId,
          routeId: request.allowedRouteIds[0]!,
          evidenceFingerprint: request.evidenceFingerprint,
          constraintFingerprint: request.routeConstraintFingerprint,
          trace: request.trace,
        },
      };
    },
    reconcile: () => ({ kind: "unknown", reason: "no-pending-quality-judge" }),
  };
}

function deterministicReplanPort(context: string): QualityReplanPort {
  return {
    dispatch(request) {
      return {
        kind: "completed",
        receipt: {
          judgeInvocationId: request.judgeInvocationId,
          planDigest: qualityDigest(context),
          agentId: "amadeus-quality-agent",
          contextId: qualityStableId("quality-replan-context", context),
        },
      };
    },
    reconcile: () => ({ kind: "unknown", reason: "no-pending-quality-replan" }),
  };
}

export function commitProductionQualityObservation(
  input: ProductionQualityObservationInput,
): ProductionQualityObservationResult {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { kind: "error", reason: "active-intent-required" };
  const autonomyCoordinator = coordinatorFor(input.projectDir, resolved);
  const autonomy = autonomyCoordinator.readProjection();
  const activation = resolveIntentQualityActivation({
    autonomy,
    qualityProjection: emptyQualityPluginProjection(autonomy.intentUuid),
    contribution: createFirstPartyQualityContribution(3),
  });
  if (activation.kind !== "active") {
    return { kind: "error", reason: activation.kind === "error" ? activation.error.message : activation.reason };
  }
  const repository = createAuditQualityRepairRepository({
    projectDir: input.projectDir,
    intent: resolved.intentDir,
    space: resolved.space,
  });
  const quality = createQualityRepairCoordinator({ activation, repository });
  const qualityScopeId = qualityStableId("quality-scope", [
    autonomy.intentUuid,
    input.evidence.monitorId,
    input.evidence.stageInstanceId,
    input.evidence.boltId,
    activation.graph.graphRevision,
  ]);
  const prior = repository.readProjection(qualityScopeId);
  const observed = quality.recordEvidence({
    ...input.evidence,
    intentUuid: autonomy.intentUuid,
    graphRevision: activation.graph.graphRevision,
    previousSnapshot: prior?.latestSnapshot ?? null,
  }, {
    traceId: qualityDigest([autonomy.intentUuid, input.evidence.stageInstanceId]).slice("sha256:".length, 39),
    spanId: qualityDigest(input.evidence.stageInstanceId).slice("sha256:".length, 23),
  });
  if (observed.kind === "CONFLICT" || observed.kind === "INCOMPLETE") {
    return { kind: "error", reason: observed.reason };
  }
  if (observed.snapshot.unresolved.length === 0) {
    return { kind: "READY", evidenceFingerprint: observed.snapshot.snapshotFingerprint };
  }
  if (observed.kind !== "judge-reserved") {
    return observed.kind === "REPAIR_STALLED"
      ? parkProductionQuality(autonomyCoordinator, observed.snapshot.stageInstanceId, quality.status(observed.snapshot.qualityScopeId))
      : { kind: "repair", evidenceFingerprint: observed.snapshot.snapshotFingerprint };
  }
  const judged = quality.dispatchJudge(
    observed.permit,
    deterministicQualityJudge(),
    deterministicReplanPort(input.replanContext),
  );
  if (judged.kind === "replanned") {
    return { kind: "replanned", evidenceFingerprint: observed.snapshot.snapshotFingerprint };
  }
  if (judged.kind === "REPAIR_STALLED") {
    return parkProductionQuality(autonomyCoordinator, observed.snapshot.stageInstanceId, quality.status(observed.snapshot.qualityScopeId));
  }
  return { kind: "error", reason: "reason" in judged ? judged.reason : judged.kind };
}

function parkProductionQuality(
  autonomy: IntentAutonomyCoordinator,
  triggerOccurrenceId: string,
  status: ReturnType<ReturnType<typeof createQualityRepairCoordinator>["status"]>,
): ProductionQualityObservationResult {
  if (status === null || status.evidenceFingerprint === null) {
    return { kind: "error", reason: "quality-stall-status-missing" };
  }
  const parked = autonomy.park({
    triggerOccurrenceId,
    reason: "REPAIR_STALLED",
    resumeCondition: {
      kind: "quality-evidence-or-human",
      identity: qualityStableId("quality-resume-condition", status.resumeCondition),
      status: "pending",
      evidenceFingerprint: status.evidenceFingerprint,
    },
    monitorLatchIdentity: qualityStableId("quality-monitor-latch", [status.qualityScopeId, status.evidenceFingerprint]),
  });
  return "error" in parked
    ? { kind: "error", reason: parked.error }
    : { kind: "parked", qualityScopeId: status.qualityScopeId, workflowResult: parked.result };
}

function freshHumanRetryTurn(
  projectDir: string,
  resolved: ResolvedIntent,
): { readonly verified: true; readonly eventType: "HUMAN_TURN"; readonly actor: "human"; readonly turnId: string } | null {
  const audit = readAllAuditShards(projectDir, resolved.intentDir, resolved.space);
  const stalledAt = findAllEvents(audit, "QUALITY_REPAIR_TRANSACTION_COMMITTED")
    .filter((row) => auditBlockField(row.block, "Transaction")?.includes('"type":"REPAIR_STALLED"'))
    .at(-1)?.timestamp;
  if (stalledAt === undefined) return null;
  const stalledAtMs = Date.parse(stalledAt);
  if (Number.isNaN(stalledAtMs)) return null;
  const turn = findAllEvents(audit, "HUMAN_TURN")
    .filter((row) => {
      const turnAtMs = Date.parse(row.timestamp);
      return !Number.isNaN(turnAtMs) && turnAtMs > stalledAtMs;
    })
    .at(-1);
  return turn === undefined ? null : { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: turn.timestamp };
}

function qualityResumeAlreadyCommitted(input: {
  readonly repository: QualityRepairRepository;
  readonly qualityScopeId: string;
  readonly alternativeIdentity: string;
  readonly monitorLatchIdentity: string;
}): boolean {
  let stalledEvidenceFingerprint: string | null = null;
  let resumedAlternativeIdentity: string | null = null;
  for (const transaction of input.repository.readTransactions()) {
    if (transaction.qualityScopeId !== input.qualityScopeId) continue;
    for (const event of transaction.qualityEvents) {
      if (event.type === "REPAIR_STALLED") {
        stalledEvidenceFingerprint = event.latch.evidenceFingerprint;
        resumedAlternativeIdentity = null;
      } else if (event.type === "QUALITY_EPOCH_STARTED") {
        resumedAlternativeIdentity = event.satisfiedAlternativeIdentity;
      }
    }
  }
  return stalledEvidenceFingerprint !== null &&
    resumedAlternativeIdentity === input.alternativeIdentity &&
    qualityStableId("quality-monitor-latch", [input.qualityScopeId, stalledEvidenceFingerprint]) ===
      input.monitorLatchIdentity;
}

type ProductionQualityResumeContext = {
  readonly resolved: ResolvedIntent;
  readonly autonomy: IntentAutonomyCoordinator;
  readonly autonomyProjection: AutonomyProjection;
  readonly envelope: NonNullable<AutonomyProjection["parkEnvelope"]> & { readonly monitorLatchIdentity: string };
  readonly activation: Extract<ReturnType<typeof resolveIntentQualityActivation>, { readonly kind: "active" }>;
  readonly repository: QualityRepairRepository;
  readonly quality: ReturnType<typeof createQualityRepairCoordinator>;
  readonly status: NonNullable<ReturnType<ReturnType<typeof createQualityRepairCoordinator>["status"]>>;
  readonly alternativeIdentity: string;
};

function prepareProductionQualityResume(
  input: ProductionQualityResumeInput,
): { readonly ok: true; readonly context: ProductionQualityResumeContext } | { readonly ok: false; readonly reason: string } {
  const resolved = resolveIntent(input.projectDir);
  if (resolved === null) return { ok: false, reason: "active-intent-required" };
  const autonomy = coordinatorFor(input.projectDir, resolved);
  const autonomyProjection = autonomy.readProjection();
  const envelope = autonomyProjection.parkEnvelope;
  if (autonomyProjection.workflowExecutionState !== "suspended" || envelope?.reason !== "REPAIR_STALLED" ||
    envelope.monitorLatchIdentity === null) {
    return { ok: false, reason: "quality-repair-stall-not-active" };
  }
  const activation = resolveIntentQualityActivation({
    autonomy: autonomyProjection,
    qualityProjection: emptyQualityPluginProjection(autonomyProjection.intentUuid),
    contribution: createFirstPartyQualityContribution(3),
  });
  if (activation.kind !== "active") {
    return { ok: false, reason: activation.kind === "error" ? activation.error.message : activation.reason };
  }
  const repository = createAuditQualityRepairRepository({
    projectDir: input.projectDir,
    intent: resolved.intentDir,
    space: resolved.space,
  });
  const quality = createQualityRepairCoordinator({ activation, repository });
  const status = quality.status(input.qualityScopeId);
  if (status === null) return { ok: false, reason: "quality-repair-scope-not-found" };
  const alternative = status.resumeCondition.alternatives.find((candidate) => candidate.kind === input.basis);
  if (alternative === undefined) return { ok: false, reason: "quality-resume-alternative-not-found" };
  return {
    ok: true,
    context: {
      resolved,
      autonomy,
      autonomyProjection,
      envelope: { ...envelope, monitorLatchIdentity: envelope.monitorLatchIdentity },
      activation,
      repository,
      quality,
      status,
      alternativeIdentity: alternative.identity,
    },
  };
}

function productionQualityResumeEvidence(
  input: ProductionQualityResumeInput,
  context: ProductionQualityResumeContext,
): QualityEvidenceBatchInput | undefined {
  if (input.evidence === undefined) return undefined;
  return {
    ...input.evidence,
    intentUuid: context.autonomyProjection.intentUuid,
    graphRevision: context.activation.graph.graphRevision,
    previousSnapshot: context.repository.readProjection(input.qualityScopeId)?.latestSnapshot ?? null,
  };
}

function commitQualityResumeIfRequired(
  input: ProductionQualityResumeInput,
  context: ProductionQualityResumeContext,
): string | null {
  const alreadyResumed = context.status.workflowExecutionState === "running" && qualityResumeAlreadyCommitted({
    repository: context.repository,
    qualityScopeId: input.qualityScopeId,
    alternativeIdentity: context.alternativeIdentity,
    monitorLatchIdentity: context.envelope.monitorLatchIdentity!,
  });
  if (alreadyResumed) return null;
  const { status, envelope } = context;
  if (status.workflowExecutionState !== "suspended" || status.evidenceFingerprint === null ||
    qualityStableId("quality-monitor-latch", [input.qualityScopeId, status.evidenceFingerprint]) !==
      envelope.monitorLatchIdentity) return "quality-resume-latch-mismatch";
  const humanRetry = input.basis === "human-retry"
    ? freshHumanRetryTurn(input.projectDir, context.resolved)
    : undefined;
  if (input.basis === "human-retry" && humanRetry === null) return "fresh-human-retry-required";
  const resumed = context.quality.resume({
    qualityScopeId: input.qualityScopeId,
    alternativeIdentity: context.alternativeIdentity,
    humanRetry: humanRetry ?? undefined,
    evidence: productionQualityResumeEvidence(input, context),
  });
  return resumed.kind === "resumed" ? null : resumed.reason;
}

export function resumeProductionQuality(input: ProductionQualityResumeInput): ProductionQualityResumeResult {
  const prepared = prepareProductionQualityResume(input);
  if (!prepared.ok) return { kind: "error", reason: prepared.reason };
  const resumeError = commitQualityResumeIfRequired(input, prepared.context);
  if (resumeError !== null) return { kind: "error", reason: resumeError };
  const { autonomy, envelope } = prepared.context;

  const unparked = autonomy.resume({
    triggerOccurrenceId: envelope.triggerOccurrenceId,
    condition: { ...envelope.resumeCondition, status: "satisfied" },
    basis: input.basis,
    loopMonitor: {
      clearedLatchReceipt: { identity: envelope.monitorLatchIdentity, verified: true },
    },
  });
  if ("error" in unparked) return { kind: "error", reason: unparked.error };
  return { kind: "resumed", qualityScopeId: input.qualityScopeId, workflowResult: "running" };
}
