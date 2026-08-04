// Harness-neutral Intent-scoped autonomy domain (#2067).
//
// This module owns decisions, not transport. Harness adapters may supply
// capability facts and invoke election/recommendation ports, but they cannot
// change the mode table, grant scope, effect classification, or decision order.

import { createHash } from "node:crypto";

import type { VerifiedHumanTurn } from "./amadeus-loop-monitor-runtime.ts";

export type AutonomyMode = "none" | "semi" | "full";
export type WorkflowExecutionState = "running" | "suspended" | null;
export type IntentGrantState = "active" | "revoked" | "completed";
export type InteractionKind = "stage-gate" | "phase-gate" | "walking-skeleton" | "question";
export type StopReason = "AWAITING_HUMAN" | "REPAIR_STALLED" | "NORM_CONFLICT" | "USER_PARKED";

export function autonomyIsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytewise(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function autonomyCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(autonomyCanonicalJson).join(",")}]`;
  if (autonomyIsRecord(value)) {
    return `{${Object.keys(value).sort(bytewise).map((key) =>
      `${JSON.stringify(key)}:${autonomyCanonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function autonomyDigest(value: unknown): string {
  return `sha256:${createHash("sha256").update(autonomyCanonicalJson(value)).digest("hex")}`;
}

export function autonomyStableId(namespace: string, value: unknown): string {
  return `${namespace}-${autonomyDigest(value).slice("sha256:".length, "sha256:".length + 32)}`;
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;

function nonEmptyUnique(values: readonly string[]): boolean {
  return values.length > 0 && values.every((value) => SAFE_ID.test(value)) && new Set(values).size === values.length;
}

export type ModeProvenance =
  | {
      readonly kind: "human-command";
      readonly principalId: string;
      readonly humanTurnId: string;
      readonly targetIntentUuid: string;
      readonly commandOccurrenceId: string;
      readonly before: AutonomyMode;
      readonly after: AutonomyMode;
      readonly confirmedDisplayDigest: string;
    }
  | {
      readonly kind: "system-default";
      readonly targetIntentUuid: string;
      readonly sourceIdentity: "DEFAULT_MODE_V1";
      readonly after: "none";
    }
  | {
      readonly kind: "legacy-fail-closed";
      readonly targetIntentUuid: string;
      readonly legacyEventSetDigest: string;
      readonly after: "none";
    };

export interface GrantScopeDescriptor {
  readonly intentUuid: string;
  readonly scopeId: string;
  readonly scopeFingerprint: string;
  readonly normFingerprint: string;
  readonly allowedInteractionKinds: readonly InteractionKind[];
  readonly permissionBoundaryFingerprint: string;
  readonly prohibitedEffects: readonly ProhibitedEffectClassification[];
}

export interface DecisionPolicyInput {
  readonly sourceText: string;
  readonly selector: string;
  readonly optionId: string;
}

export interface DecisionPolicy {
  readonly policyId: string;
  readonly sourceTextDigest: string;
  readonly selector: string;
  readonly normalizedOptionRule: { readonly kind: "exact-option"; readonly optionId: string };
  readonly scopeFingerprint: string;
  readonly confirmedByHumanTurnId: string;
}

export function normalizeDecisionPolicies(input: {
  readonly grantIdentitySeed: string;
  readonly scopeFingerprint: string;
  readonly humanTurnId: string;
  readonly policies: readonly DecisionPolicyInput[];
}): readonly DecisionPolicy[] {
  if (!SAFE_ID.test(input.grantIdentitySeed) || !SHA256.test(input.scopeFingerprint) ||
    !SAFE_ID.test(input.humanTurnId)) throw new Error("invalid-policy-normalization-context");
  const normalized = input.policies.map((policy) => {
    const sourceText = policy.sourceText.trim();
    if (sourceText.length === 0 || !SAFE_ID.test(policy.selector) || !SAFE_ID.test(policy.optionId)) {
      throw new Error("invalid-decision-policy");
    }
    const content = {
      sourceTextDigest: autonomyDigest(sourceText),
      selector: policy.selector,
      normalizedOptionRule: { kind: "exact-option" as const, optionId: policy.optionId },
      scopeFingerprint: input.scopeFingerprint,
      confirmedByHumanTurnId: input.humanTurnId,
    };
    return {
      policyId: autonomyStableId("decision-policy", [input.grantIdentitySeed, content]),
      ...content,
    };
  });
  const ids = new Set(normalized.map((policy) => policy.policyId));
  if (ids.size !== normalized.length) throw new Error("duplicate-decision-policy");
  return normalized.sort((left, right) => bytewise(left.policyId, right.policyId));
}

export interface IntentGrant {
  readonly grantId: string;
  readonly state: IntentGrantState;
  readonly principalId: string;
  readonly humanTurnId: string;
  readonly scope: GrantScopeDescriptor;
  readonly policies: readonly DecisionPolicy[];
  readonly policySetDigest: string;
  readonly issuanceDigest: string;
}

export interface LegacyStandingGrantRecord {
  readonly eventIdentity: string;
  readonly grantId: string;
  readonly observedState: string;
}

export interface MigrationDiagnostic {
  readonly kind: "legacy-non-authoritative";
  readonly intentUuid: string;
  readonly legacyGrantId: string;
  readonly eventIdentity: string;
  readonly recommendedHumanAction: "select-intent-autonomy-mode";
}

export interface ParkEnvelope {
  readonly parkTransactionId: string;
  readonly triggerOccurrenceId: string;
  readonly reason: StopReason;
  readonly resumeCondition: ResumeCondition;
  readonly monitorLatchIdentity: string | null;
  readonly beforeProjectionDigest: string;
}

export interface AutonomyProjection {
  readonly intentUuid: string;
  readonly mode: AutonomyMode;
  readonly modeProvenance: ModeProvenance;
  readonly workflowExecutionState: WorkflowExecutionState;
  readonly currentGrant: IntentGrant | null;
  readonly terminalGrantHistory: readonly IntentGrant[];
  readonly legacyStandingGrantIds: readonly string[];
  readonly migrationDiagnostics: readonly MigrationDiagnostic[];
  readonly autoDecisions: readonly AutoDecisionRecord[];
  readonly pendingExercise: GrantExerciseReservation | null;
  readonly parkEnvelope: ParkEnvelope | null;
  readonly lastInvocationFailure: InvocationFailureRecord | null;
  readonly projectionRevision: number;
}

function validateScope(scope: GrantScopeDescriptor, intentUuid: string): void {
  if (scope.intentUuid !== intentUuid || !SAFE_ID.test(scope.scopeId) ||
    !SHA256.test(scope.scopeFingerprint) || !SHA256.test(scope.normFingerprint) ||
    !SHA256.test(scope.permissionBoundaryFingerprint) || !nonEmptyUnique(scope.allowedInteractionKinds) ||
    new Set(scope.prohibitedEffects).size !== scope.prohibitedEffects.length) {
    throw new Error("invalid-grant-scope");
  }
}

export function assertLegalAutonomyProjection(projection: AutonomyProjection): void {
  if (!SAFE_ID.test(projection.intentUuid) || !Number.isSafeInteger(projection.projectionRevision) ||
    projection.projectionRevision < 0) throw new Error("ILLEGAL_STATE:projection-identity");
  const current = projection.currentGrant;
  const isTerminal = projection.workflowExecutionState === null;
  if (isTerminal ? current !== null : (projection.mode === "full") !== (current?.state === "active")) {
    throw new Error("ILLEGAL_STATE:mode-grant-combination");
  }
  if (current !== null) {
    if (current.scope.intentUuid !== projection.intentUuid) throw new Error("ILLEGAL_STATE:grant-intent");
    validateScope(current.scope, projection.intentUuid);
  }
  if ((projection.workflowExecutionState === "suspended") !== (projection.parkEnvelope !== null) ||
    (isTerminal && projection.parkEnvelope !== null)) {
    throw new Error("ILLEGAL_STATE:park-envelope");
  }
  if (projection.parkEnvelope !== null) validateResumeCondition(projection.parkEnvelope.reason, projection.parkEnvelope.resumeCondition);
}

export function createAutonomyProjection(input: {
  readonly intentUuid: string;
  readonly legacyStandingGrants?: readonly LegacyStandingGrantRecord[];
}): AutonomyProjection {
  if (!SAFE_ID.test(input.intentUuid)) throw new Error("invalid-intent-uuid");
  const legacy = [...(input.legacyStandingGrants ?? [])].sort((left, right) => bytewise(left.eventIdentity, right.eventIdentity));
  const modeProvenance: ModeProvenance = legacy.length === 0
    ? { kind: "system-default", targetIntentUuid: input.intentUuid, sourceIdentity: "DEFAULT_MODE_V1", after: "none" }
    : {
        kind: "legacy-fail-closed",
        targetIntentUuid: input.intentUuid,
        legacyEventSetDigest: autonomyDigest(legacy.map((record) => record.eventIdentity)),
        after: "none",
      };
  const projection: AutonomyProjection = {
    intentUuid: input.intentUuid,
    mode: "none",
    modeProvenance,
    workflowExecutionState: "running",
    currentGrant: null,
    terminalGrantHistory: [],
    legacyStandingGrantIds: legacy.map((record) => record.grantId),
    migrationDiagnostics: legacy.map((record) => ({
      kind: "legacy-non-authoritative",
      intentUuid: input.intentUuid,
      legacyGrantId: record.grantId,
      eventIdentity: record.eventIdentity,
      recommendedHumanAction: "select-intent-autonomy-mode",
    })),
    autoDecisions: [],
    pendingExercise: null,
    parkEnvelope: null,
    lastInvocationFailure: null,
    projectionRevision: 0,
  };
  assertLegalAutonomyProjection(projection);
  return projection;
}

export type HumanAutonomyCommand =
  | { readonly kind: "set-mode"; readonly mode: "none" | "semi" }
  | {
      readonly kind: "issue-full" | "replace-full";
      readonly scope: GrantScopeDescriptor;
      readonly policies: readonly DecisionPolicy[];
    }
  | { readonly kind: "revoke-full"; readonly targetMode: "none" | "semi" };

export interface HumanCommandContext {
  readonly targetIntentUuid: string;
  readonly principalId: string;
  readonly humanTurn: VerifiedHumanTurn;
  readonly commandOccurrenceId: string;
  readonly expectedProjectionRevision: number;
  readonly confirmedDisplayDigest: string;
}

export type HumanCommandPlan =
  | {
      readonly ok: true;
      readonly before: AutonomyProjection;
      readonly after: AutonomyProjection;
      readonly revokedGrant: IntentGrant | null;
      readonly issuedGrant: IntentGrant | null;
      readonly transactionId: string;
    }
  | { readonly ok: false; readonly code: "PROVENANCE_REQUIRED" | "INTENT_MISMATCH" | "STALE_REVISION" | "INVALID_COMMAND" };

function validHumanContext(projection: AutonomyProjection, context: HumanCommandContext): HumanCommandPlan | null {
  if (context.humanTurn === null || !context.humanTurn.verified || context.humanTurn.eventType !== "HUMAN_TURN" ||
    !SAFE_ID.test(context.humanTurn.turnId) || !SAFE_ID.test(context.principalId) ||
    !SAFE_ID.test(context.commandOccurrenceId)) return { ok: false, code: "PROVENANCE_REQUIRED" };
  if (context.targetIntentUuid !== projection.intentUuid) return { ok: false, code: "INTENT_MISMATCH" };
  if (context.expectedProjectionRevision !== projection.projectionRevision) return { ok: false, code: "STALE_REVISION" };
  if (!SHA256.test(context.confirmedDisplayDigest)) return { ok: false, code: "INVALID_COMMAND" };
  return null;
}

function terminalize(grant: IntentGrant, state: "revoked" | "completed"): IntentGrant {
  return { ...grant, state };
}

function issueGrant(
  projection: AutonomyProjection,
  command: Extract<HumanAutonomyCommand, { readonly kind: "issue-full" | "replace-full" }>,
  context: HumanCommandContext,
): IntentGrant {
  validateScope(command.scope, projection.intentUuid);
  const policySetDigest = autonomyDigest(command.policies);
  const issuanceDisplay = {
    intentUuid: projection.intentUuid,
    principalId: context.principalId,
    scope: command.scope,
    policies: command.policies,
    policySetDigest,
  };
  if (autonomyDigest(issuanceDisplay) !== context.confirmedDisplayDigest) {
    throw new Error("confirmed-display-digest-mismatch");
  }
  const grantId = autonomyStableId("intent-grant", [
    projection.intentUuid,
    context.commandOccurrenceId,
    context.humanTurn.turnId,
    command.scope.scopeFingerprint,
    policySetDigest,
  ]);
  return {
    grantId,
    state: "active",
    principalId: context.principalId,
    humanTurnId: context.humanTurn.turnId,
    scope: command.scope,
    policies: [...command.policies],
    policySetDigest,
    issuanceDigest: context.confirmedDisplayDigest,
  };
}

export function grantIssuanceDisplayDigest(input: {
  readonly intentUuid: string;
  readonly principalId: string;
  readonly scope: GrantScopeDescriptor;
  readonly policies: readonly DecisionPolicy[];
}): string {
  return autonomyDigest({ ...input, policySetDigest: autonomyDigest(input.policies) });
}

export function planHumanAutonomyCommand(
  projection: AutonomyProjection,
  command: HumanAutonomyCommand,
  context: HumanCommandContext,
): HumanCommandPlan {
  assertLegalAutonomyProjection(projection);
  const invalid = validHumanContext(projection, context);
  if (invalid !== null) return invalid;
  const current = projection.currentGrant;
  if (command.kind === "issue-full" && current !== null) return { ok: false, code: "INVALID_COMMAND" };
  if ((command.kind === "replace-full" || command.kind === "revoke-full") && current === null) {
    return { ok: false, code: "INVALID_COMMAND" };
  }
  try {
    const afterMode: AutonomyMode = command.kind === "set-mode"
      ? command.mode
      : command.kind === "revoke-full"
      ? command.targetMode
      : "full";
    const provenance: ModeProvenance = {
      kind: "human-command",
      principalId: context.principalId,
      humanTurnId: context.humanTurn.turnId,
      targetIntentUuid: projection.intentUuid,
      commandOccurrenceId: context.commandOccurrenceId,
      before: projection.mode,
      after: afterMode,
      confirmedDisplayDigest: context.confirmedDisplayDigest,
    };
    const revokedGrant = current === null ? null : terminalize(current, "revoked");
    const issuedGrant = command.kind === "issue-full" || command.kind === "replace-full"
      ? issueGrant(projection, command, context)
      : null;
    const after: AutonomyProjection = {
      ...projection,
      mode: afterMode,
      modeProvenance: provenance,
      currentGrant: issuedGrant,
      terminalGrantHistory: revokedGrant === null
        ? projection.terminalGrantHistory
        : [...projection.terminalGrantHistory, revokedGrant],
      projectionRevision: projection.projectionRevision + 1,
    };
    assertLegalAutonomyProjection(after);
    return {
      ok: true,
      before: projection,
      after,
      revokedGrant,
      issuedGrant,
      transactionId: autonomyStableId("autonomy-command", [projection.intentUuid, context.commandOccurrenceId]),
    };
  } catch {
    return { ok: false, code: "INVALID_COMMAND" };
  }
}

export interface DecisionOptionEffect {
  readonly effectId: string;
  readonly optionId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly payloadFingerprint: string;
  readonly classification: EffectClassification;
  readonly requiredScopeFingerprint: string;
  readonly applicableNormFingerprint: string;
}

export type ProhibitedEffectClassification =
  | "new-permission"
  | "irreversible"
  | "scope-out"
  | "norm-waiver"
  | "quality-waiver";
export type EffectClassification = "workflow-reversible" | ProhibitedEffectClassification;

export interface DecisionOptionEffectRegistry {
  readonly revision: string;
  resolve(optionId: string): DecisionOptionEffect | null;
}

export function createDecisionOptionEffectRegistry(input: {
  readonly revision: string;
  readonly effects: readonly DecisionOptionEffect[];
}): DecisionOptionEffectRegistry {
  if (!SHA256.test(input.revision)) throw new Error("invalid-effect-registry-revision");
  const byOption = new Map<string, DecisionOptionEffect>();
  for (const effect of input.effects) {
    if (!SAFE_ID.test(effect.effectId) || !SAFE_ID.test(effect.optionId) ||
      effect.payloadFingerprint !== autonomyDigest(effect.payload) || byOption.has(effect.optionId)) {
      throw new Error("invalid-effect-registry");
    }
    byOption.set(effect.optionId, effect);
  }
  return { revision: input.revision, resolve: (optionId) => byOption.get(optionId) ?? null };
}

export interface InteractionOccurrence {
  readonly occurrenceId: string;
  readonly intentUuid: string;
  readonly kind: InteractionKind;
  readonly stage: string | null;
  readonly phase: string;
  readonly bolt: string | null;
  readonly interactionId: string;
  readonly selector: string;
  readonly question: string;
  readonly optionIds: readonly string[];
  readonly optionSetFingerprint: string;
  readonly graphRevision: string;
}

export function createInteractionOccurrence(input: Omit<InteractionOccurrence, "occurrenceId" | "optionSetFingerprint">): InteractionOccurrence {
  if (!SAFE_ID.test(input.intentUuid) || !SAFE_ID.test(input.interactionId) || !SAFE_ID.test(input.selector) ||
    !SAFE_ID.test(input.phase) || (input.stage !== null && !SAFE_ID.test(input.stage)) ||
    (input.bolt !== null && !SAFE_ID.test(input.bolt)) || !nonEmptyUnique(input.optionIds) ||
    !SHA256.test(input.graphRevision)) throw new Error("invalid-interaction-occurrence");
  const optionSetFingerprint = autonomyDigest(input.optionIds);
  return {
    ...input,
    optionIds: [...input.optionIds],
    optionSetFingerprint,
    occurrenceId: autonomyStableId("interaction", [
      input.intentUuid,
      input.kind,
      input.stage,
      input.phase,
      input.bolt,
      input.interactionId,
      input.optionIds,
      input.graphRevision,
    ]),
  };
}

export type DecisionAuthorization =
  | {
      readonly kind: "semi-mode-gate";
      readonly occurrence: InteractionOccurrence;
      readonly modeProvenance: Extract<ModeProvenance, { readonly kind: "human-command" }>;
      readonly projectionRevision: number;
    }
  | {
      readonly kind: "full-grant";
      readonly occurrence: InteractionOccurrence;
      readonly grantId: string;
      readonly scopeFingerprint: string;
      readonly projectionRevision: number;
    }
  | {
      readonly kind: "human-required";
      readonly occurrence: InteractionOccurrence;
      readonly reason: "MODE_REQUIRES_HUMAN" | "SCOPE_OUT" | "AUTHORITY_BOUNDARY";
    };

function scopeAllows(grant: IntentGrant, occurrence: InteractionOccurrence): boolean {
  return grant.scope.intentUuid === occurrence.intentUuid &&
    grant.scope.allowedInteractionKinds.includes(occurrence.kind);
}

export function authorizeInteraction(
  projection: AutonomyProjection,
  occurrence: InteractionOccurrence,
): DecisionAuthorization {
  assertLegalAutonomyProjection(projection);
  if (projection.intentUuid !== occurrence.intentUuid || projection.workflowExecutionState !== "running") {
    return { kind: "human-required", occurrence, reason: "SCOPE_OUT" };
  }
  if (projection.mode === "none") return { kind: "human-required", occurrence, reason: "MODE_REQUIRES_HUMAN" };
  if (projection.mode === "semi") {
    const internalGate = occurrence.kind === "stage-gate" && occurrence.phase !== "phase-boundary";
    if (!internalGate || projection.modeProvenance.kind !== "human-command") {
      return { kind: "human-required", occurrence, reason: "MODE_REQUIRES_HUMAN" };
    }
    return {
      kind: "semi-mode-gate",
      occurrence,
      modeProvenance: projection.modeProvenance,
      projectionRevision: projection.projectionRevision,
    };
  }
  const grant = projection.currentGrant;
  if (grant === null || !scopeAllows(grant, occurrence)) {
    return { kind: "human-required", occurrence, reason: "SCOPE_OUT" };
  }
  return {
    kind: "full-grant",
    occurrence,
    grantId: grant.grantId,
    scopeFingerprint: grant.scope.scopeFingerprint,
    projectionRevision: projection.projectionRevision,
  };
}

export type DecisionBasisKind =
  | "mode-semi"
  | "grant-gate"
  | "confirmed-policy"
  | "norm"
  | "history"
  | "solo-election"
  | "agent-recommendation";
export type DecisionDecider = "deterministic-engine" | "solo-election" | "agent-recommendation";
export type DecisionReviewState = "not-applicable" | "unreviewed";

export interface AutoDecisionRecord {
  readonly decisionId: string;
  readonly occurrenceId: string;
  readonly question: string;
  readonly optionIds: readonly string[];
  readonly selectedOptionId: string;
  readonly decider: DecisionDecider;
  readonly basisKind: DecisionBasisKind;
  readonly basisFingerprint: string;
  readonly principalId: string;
  readonly actorId: string;
  readonly grantId: string | null;
  readonly degradedCapability: { readonly capability: "solo-election"; readonly reason: string } | null;
  readonly reviewState: DecisionReviewState;
}

export interface DecisionFact {
  readonly optionId: string;
  readonly selector: string;
  readonly scopeLineageFingerprint: string;
  readonly normFingerprint: string;
  readonly evidenceFingerprint: string;
}

export interface DecisionCapabilityPort {
  readonly soloElectionAvailable: boolean;
  elect(occurrence: InteractionOccurrence): { readonly optionId: string; readonly evidenceFingerprint: string };
  recommend(occurrence: InteractionOccurrence): { readonly optionId: string; readonly evidenceFingerprint: string };
  readonly unavailableReason: string | null;
}

export type AutoDecisionResolution =
  | { readonly kind: "decided"; readonly record: AutoDecisionRecord }
  | { readonly kind: "park"; readonly reason: "NORM_CONFLICT" }
  | { readonly kind: "invalid"; readonly reason: string };

function uniqueOption(facts: readonly DecisionFact[]): DecisionFact | null | "conflict" {
  if (facts.length === 0) return null;
  const options = new Set(facts.map((fact) => fact.optionId));
  return options.size === 1 ? facts[0]! : "conflict";
}

function decisionRecord(input: {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly selectedOptionId: string;
  readonly decider: DecisionDecider;
  readonly basisKind: DecisionBasisKind;
  readonly basisFingerprint: string;
  readonly actorId: string;
  readonly degradedCapability?: AutoDecisionRecord["degradedCapability"];
}): AutoDecisionRecord {
  if (!input.occurrence.optionIds.includes(input.selectedOptionId) || !SAFE_ID.test(input.actorId) ||
    !SHA256.test(input.basisFingerprint)) throw new Error("invalid-auto-decision");
  const grant = input.projection.currentGrant;
  const principalId = grant?.principalId ??
    (input.projection.modeProvenance.kind === "human-command" ? input.projection.modeProvenance.principalId : "system-default");
  const reviewState: DecisionReviewState = input.basisKind === "solo-election" || input.basisKind === "agent-recommendation"
    ? "unreviewed"
    : "not-applicable";
  return {
    decisionId: autonomyStableId("auto-decision", [
      input.projection.intentUuid,
      input.occurrence.interactionId,
      input.occurrence.occurrenceId,
      input.occurrence.graphRevision,
    ]),
    occurrenceId: input.occurrence.occurrenceId,
    question: input.occurrence.question,
    optionIds: [...input.occurrence.optionIds],
    selectedOptionId: input.selectedOptionId,
    decider: input.decider,
    basisKind: input.basisKind,
    basisFingerprint: input.basisFingerprint,
    principalId,
    actorId: input.actorId,
    grantId: grant?.grantId ?? null,
    degradedCapability: input.degradedCapability ?? null,
    reviewState,
  };
}

function resolveConfirmedPolicy(input: {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly grant: IntentGrant;
  readonly actorId: string;
}): AutoDecisionResolution | null {
  const policies = input.grant.policies.filter((policy) =>
    policy.selector === input.occurrence.selector &&
    policy.scopeFingerprint === input.grant.scope.scopeFingerprint &&
    input.occurrence.optionIds.includes(policy.normalizedOptionRule.optionId)
  );
  const options = new Set(policies.map((policy) => policy.normalizedOptionRule.optionId));
  if (options.size > 1) return { kind: "invalid", reason: "confirmed-policy-conflict" };
  if (options.size === 0) return null;
  const selectedOptionId = [...options][0]!;
  return { kind: "decided", record: decisionRecord({
    projection: input.projection,
    occurrence: input.occurrence,
    selectedOptionId,
    decider: "deterministic-engine",
    basisKind: "confirmed-policy",
    basisFingerprint: autonomyDigest(policies.map((policy) => policy.policyId)),
    actorId: input.actorId,
  }) };
}

export function createGateAutoDecision(input: {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly actorId: string;
  readonly selectedOptionId: string;
  readonly basisKind: "mode-semi" | "grant-gate";
}): AutoDecisionRecord {
  if (input.occurrence.kind === "question") throw new Error("gate-decision-requires-gate-occurrence");
  if (input.basisKind === "mode-semi" && input.projection.mode !== "semi") {
    throw new Error("semi-gate-requires-semi-mode");
  }
  if (input.basisKind === "grant-gate" &&
    (input.projection.mode !== "full" || input.projection.currentGrant === null)) {
    throw new Error("grant-gate-requires-full-grant");
  }
  return decisionRecord({
    projection: input.projection,
    occurrence: input.occurrence,
    selectedOptionId: input.selectedOptionId,
    decider: "deterministic-engine",
    basisKind: input.basisKind,
    basisFingerprint: autonomyDigest(input.basisKind === "mode-semi"
      ? input.projection.modeProvenance
      : input.projection.currentGrant),
    actorId: input.actorId,
  });
}

export function resolveAutoDecision(input: {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly actorId: string;
  readonly scopeLineageFingerprint: string;
  readonly currentNormFingerprint: string;
  readonly applicableNormFacts: readonly DecisionFact[];
  readonly pastHumanRulings: readonly DecisionFact[];
  readonly capability: DecisionCapabilityPort;
}): AutoDecisionResolution {
  const { projection, occurrence } = input;
  const grant = projection.currentGrant;
  if (projection.mode !== "full" || grant === null) return { kind: "invalid", reason: "full-grant-required" };
  if (!SHA256.test(input.scopeLineageFingerprint) || !SHA256.test(input.currentNormFingerprint)) {
    return { kind: "invalid", reason: "invalid-decision-context" };
  }
  const policy = resolveConfirmedPolicy({ projection, occurrence, grant, actorId: input.actorId });
  if (policy !== null) return policy;
  const applicableNorms = input.applicableNormFacts.filter((fact) =>
    fact.selector === occurrence.selector && fact.normFingerprint === input.currentNormFingerprint &&
    occurrence.optionIds.includes(fact.optionId)
  );
  const norm = uniqueOption(applicableNorms);
  if (norm === "conflict") return { kind: "park", reason: "NORM_CONFLICT" };
  if (norm !== null) return { kind: "decided", record: decisionRecord({
    projection, occurrence, selectedOptionId: norm.optionId, decider: "deterministic-engine", basisKind: "norm",
    basisFingerprint: norm.evidenceFingerprint, actorId: input.actorId,
  }) };
  const history = uniqueOption(input.pastHumanRulings.filter((fact) =>
    fact.selector === occurrence.selector && fact.scopeLineageFingerprint === input.scopeLineageFingerprint &&
    fact.normFingerprint === input.currentNormFingerprint && occurrence.optionIds.includes(fact.optionId)
  ));
  if (history !== null && history !== "conflict") return { kind: "decided", record: decisionRecord({
    projection, occurrence, selectedOptionId: history.optionId, decider: "deterministic-engine", basisKind: "history",
    basisFingerprint: history.evidenceFingerprint, actorId: input.actorId,
  }) };
  if (input.capability.soloElectionAvailable) {
    const elected = input.capability.elect(occurrence);
    if (!occurrence.optionIds.includes(elected.optionId) || !SHA256.test(elected.evidenceFingerprint)) {
      return { kind: "invalid", reason: "invalid-election-result" };
    }
    return { kind: "decided", record: decisionRecord({
      projection, occurrence, selectedOptionId: elected.optionId, decider: "solo-election", basisKind: "solo-election",
      basisFingerprint: elected.evidenceFingerprint, actorId: input.actorId,
    }) };
  }
  const recommended = input.capability.recommend(occurrence);
  if (!occurrence.optionIds.includes(recommended.optionId) || !SHA256.test(recommended.evidenceFingerprint) ||
    !input.capability.unavailableReason) return { kind: "invalid", reason: "invalid-recommendation-result" };
  return { kind: "decided", record: decisionRecord({
    projection, occurrence, selectedOptionId: recommended.optionId, decider: "agent-recommendation",
    basisKind: "agent-recommendation", basisFingerprint: recommended.evidenceFingerprint, actorId: input.actorId,
    degradedCapability: { capability: "solo-election", reason: input.capability.unavailableReason },
  }) };
}

export type EffectAuthorization =
  | { readonly ok: true; readonly effect: DecisionOptionEffect }
  | { readonly ok: false; readonly reason: "UNKNOWN_EFFECT" | "PAYLOAD_MISMATCH" | "PROHIBITED_EFFECT" | "SCOPE_OUT" | "NORM_DRIFT" };

export function authorizeDecisionEffect(input: {
  readonly grant: IntentGrant;
  readonly selectedOptionId: string;
  readonly currentNormFingerprint: string;
  readonly registry: DecisionOptionEffectRegistry;
}): EffectAuthorization {
  const effect = input.registry.resolve(input.selectedOptionId);
  if (effect === null) return { ok: false, reason: "UNKNOWN_EFFECT" };
  if (effect.payloadFingerprint !== autonomyDigest(effect.payload)) return { ok: false, reason: "PAYLOAD_MISMATCH" };
  if (effect.classification !== "workflow-reversible") {
    return { ok: false, reason: "PROHIBITED_EFFECT" };
  }
  if (effect.requiredScopeFingerprint !== input.grant.scope.scopeFingerprint) return { ok: false, reason: "SCOPE_OUT" };
  if (effect.applicableNormFingerprint !== input.currentNormFingerprint) return { ok: false, reason: "NORM_DRIFT" };
  return { ok: true, effect };
}

export interface GrantExerciseReservation {
  readonly reservationId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly intentUuid: string;
  readonly grantId: string;
  readonly occurrence: InteractionOccurrence;
  readonly decision: AutoDecisionRecord;
  readonly effect: DecisionOptionEffect;
  readonly projectionRevision: number;
  readonly graphRevision: string;
  readonly effectRegistryRevision: string;
  readonly currentNormFingerprint: string;
}

export function createGrantExerciseReservation(input: {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly decision: AutoDecisionRecord;
  readonly effect: DecisionOptionEffect;
  readonly effectRegistryRevision: string;
  readonly currentNormFingerprint: string;
}): GrantExerciseReservation {
  const grant = input.projection.currentGrant;
  if (input.projection.mode !== "full" || grant === null || input.decision.grantId !== grant.grantId ||
    input.decision.selectedOptionId !== input.effect.optionId) throw new Error("grant-exercise-not-authorized");
  const candidate = {
    intentUuid: input.projection.intentUuid,
    grantId: grant.grantId,
    occurrenceId: input.occurrence.occurrenceId,
    decisionId: input.decision.decisionId,
    selectedOptionId: input.decision.selectedOptionId,
    effectId: input.effect.effectId,
    effectPayloadFingerprint: input.effect.payloadFingerprint,
    effectClassification: input.effect.classification,
    projectionRevision: input.projection.projectionRevision,
    graphRevision: input.occurrence.graphRevision,
    effectRegistryRevision: input.effectRegistryRevision,
    currentNormFingerprint: input.currentNormFingerprint,
  };
  const candidateDigest = autonomyDigest(candidate);
  return {
    reservationId: autonomyStableId("grant-exercise-reservation", candidate),
    candidateId: autonomyStableId("grant-exercise-candidate", candidate),
    candidateDigest,
    intentUuid: input.projection.intentUuid,
    grantId: grant.grantId,
    occurrence: input.occurrence,
    decision: input.decision,
    effect: input.effect,
    projectionRevision: input.projection.projectionRevision,
    graphRevision: input.occurrence.graphRevision,
    effectRegistryRevision: input.effectRegistryRevision,
    currentNormFingerprint: input.currentNormFingerprint,
  };
}

export function revalidateGrantExerciseReservation(input: {
  readonly projection: AutonomyProjection;
  readonly reservation: GrantExerciseReservation;
  readonly occurrence: InteractionOccurrence;
  readonly registry: DecisionOptionEffectRegistry;
  readonly currentNormFingerprint: string;
}): { readonly valid: true } | { readonly valid: false; readonly reason: string } {
  const { projection, reservation, occurrence } = input;
  const grant = projection.currentGrant;
  if (projection.mode !== "full" || grant === null || grant.grantId !== reservation.grantId) return { valid: false, reason: "grant-changed" };
  if (projection.projectionRevision !== reservation.projectionRevision + 1 || projection.pendingExercise?.reservationId !== reservation.reservationId) {
    return { valid: false, reason: "projection-changed" };
  }
  if (occurrence.occurrenceId !== reservation.occurrence.occurrenceId || occurrence.graphRevision !== reservation.graphRevision) {
    return { valid: false, reason: "occurrence-changed" };
  }
  if (input.registry.revision !== reservation.effectRegistryRevision) return { valid: false, reason: "registry-changed" };
  if (input.currentNormFingerprint !== reservation.currentNormFingerprint) return { valid: false, reason: "norm-changed" };
  const effect = input.registry.resolve(reservation.decision.selectedOptionId);
  if (effect === null || autonomyDigest(effect) !== autonomyDigest(reservation.effect)) return { valid: false, reason: "effect-changed" };
  const expected = createGrantExerciseReservation({
    projection: { ...projection, projectionRevision: reservation.projectionRevision, pendingExercise: null },
    occurrence,
    decision: reservation.decision,
    effect,
    effectRegistryRevision: input.registry.revision,
    currentNormFingerprint: input.currentNormFingerprint,
  });
  return expected.candidateDigest === reservation.candidateDigest ? { valid: true } : { valid: false, reason: "candidate-tampered" };
}

export type ResumeCondition =
  | { readonly kind: "human-or-capability"; readonly identity: string; readonly status: "pending" | "satisfied"; readonly evidenceFingerprint: string | null }
  | { readonly kind: "quality-evidence-or-human"; readonly identity: string; readonly status: "pending" | "satisfied"; readonly evidenceFingerprint: string }
  | { readonly kind: "norm-change"; readonly identity: string; readonly status: "pending" | "satisfied"; readonly evidenceFingerprint: string }
  | { readonly kind: "human-unpark"; readonly identity: string; readonly status: "pending" | "satisfied"; readonly evidenceFingerprint: null };

export function validateResumeCondition(reason: StopReason, condition: ResumeCondition): void {
  const expected: Record<StopReason, ResumeCondition["kind"]> = {
    AWAITING_HUMAN: "human-or-capability",
    REPAIR_STALLED: "quality-evidence-or-human",
    NORM_CONFLICT: "norm-change",
    USER_PARKED: "human-unpark",
  };
  if (condition.kind !== expected[reason] || !SAFE_ID.test(condition.identity) ||
    (condition.evidenceFingerprint !== null && !SHA256.test(condition.evidenceFingerprint))) {
    throw new Error("ILLEGAL_STATE:resume-condition");
  }
}

export interface InvocationFailureRecord {
  readonly transactionId: string;
  readonly invocationId: string;
  readonly failureClass: string;
  readonly sanitizedEvidenceFingerprint: string;
  readonly beforeProjectionDigest: string;
  readonly afterProjectionDigest: string;
  readonly retryable: false;
}

export type WorkflowResult =
  | {
      readonly outcome: "completed";
      readonly reasonCode: null;
      readonly retryable: false;
      readonly intentUuid: string;
      readonly autonomyMode: AutonomyMode;
      readonly grant: { readonly id: string; readonly state: IntentGrantState } | null;
      readonly evidenceFingerprint: null;
      readonly resumeCondition: null;
      readonly failureRef: null;
    }
  | {
      readonly outcome: "parked";
      readonly reasonCode: StopReason;
      readonly retryable: true;
      readonly intentUuid: string;
      readonly autonomyMode: AutonomyMode;
      readonly grant: { readonly id: string; readonly state: IntentGrantState } | null;
      readonly evidenceFingerprint: string | null;
      readonly resumeCondition: ResumeCondition;
      readonly failureRef: null;
    }
  | {
      readonly outcome: "failed";
      readonly reasonCode: null;
      readonly retryable: false;
      readonly intentUuid: string;
      readonly autonomyMode: AutonomyMode;
      readonly grant: { readonly id: string; readonly state: IntentGrantState } | null;
      readonly evidenceFingerprint: string;
      readonly resumeCondition: null;
      readonly failureRef: string;
    };

export function projectGrantReference(projection: AutonomyProjection): WorkflowResult["grant"] {
  const grant = projection.currentGrant;
  return grant === null ? null : { id: grant.grantId, state: grant.state };
}

function validateWorkflowOutcome(result: WorkflowResult): void {
  if (result.outcome === "completed") {
    if (result.reasonCode !== null || result.retryable || result.resumeCondition !== null || result.failureRef !== null) {
      throw new Error("invalid-workflow-result");
    }
    return;
  }
  if (result.outcome === "failed") {
    if (result.reasonCode !== null || result.retryable || !SAFE_ID.test(result.failureRef) || !SHA256.test(result.evidenceFingerprint)) {
      throw new Error("invalid-workflow-result");
    }
    return;
  }
  if (!result.retryable || result.failureRef !== null) throw new Error("invalid-workflow-result");
  validateResumeCondition(result.reasonCode, result.resumeCondition);
}

export function parseWorkflowResult(value: unknown): WorkflowResult {
  if (!autonomyIsRecord(value) || !["completed", "parked", "failed"].includes(String(value.outcome))) {
    throw new Error("invalid-workflow-result");
  }
  const result = value as unknown as WorkflowResult;
  if (!SAFE_ID.test(result.intentUuid) || !["none", "semi", "full"].includes(result.autonomyMode)) {
    throw new Error("invalid-workflow-result");
  }
  validateWorkflowOutcome(result);
  const expectedGrantState = result.outcome === "completed" ? "completed" : "active";
  if ((result.autonomyMode === "full") !== (result.grant?.state === expectedGrantState)) {
    throw new Error("invalid-workflow-result");
  }
  return result;
}
