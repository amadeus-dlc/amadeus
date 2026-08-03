// Harness-neutral first-party Quality Repair contribution and convergence model (#2096).

import { createHash } from "node:crypto";

import {
  compileLoopMonitorManifest,
  type CompiledLoopMonitorGraph,
  type LoopMonitorContributions,
} from "./amadeus-loop-monitor.ts";
import type { VerifiedHumanTurn } from "./amadeus-loop-monitor-runtime.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytewise(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort(bytewise).map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function stableId(namespace: string, value: unknown): string {
  return `${namespace}-${digest(value).slice("sha256:".length, "sha256:".length + 32)}`;
}

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type QualityAutonomyMode = "none" | "semi" | "full";

export interface QualityPluginProjection {
  readonly intentUuid: string;
  readonly noneModeOptedIn: boolean;
  readonly provenanceTurnId: string | null;
  readonly projectionRevision: number;
}

export function emptyQualityPluginProjection(intentUuid: string): QualityPluginProjection {
  return {
    intentUuid,
    noneModeOptedIn: false,
    provenanceTurnId: null,
    projectionRevision: 0,
  };
}

export type QualitySettingPlan =
  | {
      readonly ok: true;
      readonly projection: QualityPluginProjection;
      readonly event: {
        readonly type: "QUALITY_REPAIR_OPTED_IN" | "QUALITY_REPAIR_OPTED_OUT";
        readonly intentUuid: string;
        readonly humanTurnId: string;
      };
    }
  | {
      readonly ok: false;
      readonly error: { readonly code: "PROVENANCE_REQUIRED" | "INTENT_MISMATCH"; readonly message: string };
    };

export function planNoneModeQualitySetting(
  projection: QualityPluginProjection,
  enabled: boolean,
  human: VerifiedHumanTurn | null,
): QualitySettingPlan {
  if (!SAFE_ID.test(projection.intentUuid)) {
    return { ok: false, error: { code: "INTENT_MISMATCH", message: "quality plugin intent is invalid" } };
  }
  if (human === null || !human.verified || human.eventType !== "HUMAN_TURN" || !SAFE_ID.test(human.turnId)) {
    return {
      ok: false,
      error: { code: "PROVENANCE_REQUIRED", message: "none-mode quality setting requires a verified human turn" },
    };
  }
  return {
    ok: true,
    projection: {
      ...projection,
      noneModeOptedIn: enabled,
      provenanceTurnId: enabled ? human.turnId : null,
      projectionRevision: projection.projectionRevision + 1,
    },
    event: {
      type: enabled ? "QUALITY_REPAIR_OPTED_IN" : "QUALITY_REPAIR_OPTED_OUT",
      intentUuid: projection.intentUuid,
      humanTurnId: human.turnId,
    },
  };
}

export interface QualityEvidenceProviderDescriptor {
  readonly id: string;
  readonly schemaVersion: 1;
  readonly outputSchemaDigest: string;
  readonly redactionPolicyId: string;
}

export interface QualityJudgeInstructionDescriptor {
  readonly id: string;
  readonly contentDigest: string;
  readonly evidenceSchemaDigest: string;
}

export interface QualityRouteRuleDescriptor {
  readonly id: string;
  readonly monitorId: string;
  readonly routeId: "repair" | "replan" | "repair-stalled";
  readonly instructionId: string;
  readonly disposition: "continue" | "latch";
}

export interface QualityRequiredOutputDescriptor {
  readonly outputId: string;
  readonly stageSelector: string;
  readonly verifierId: string;
  readonly verificationConditionId: string;
}

export interface NormalizedQualityContribution {
  readonly pluginId: string;
  readonly schemaVersion: 1;
  readonly trusted: true;
  readonly contentDigest: string;
  readonly monitorManifest: unknown;
  readonly loopContributions: LoopMonitorContributions;
  readonly evidenceProviders: readonly QualityEvidenceProviderDescriptor[];
  readonly judgeInstructions: readonly QualityJudgeInstructionDescriptor[];
  readonly routeRules: readonly QualityRouteRuleDescriptor[];
  readonly requiredOutputs: readonly QualityRequiredOutputDescriptor[];
}

function qualityContributionContent(threshold: number) {
  const monitorId = "quality-repair";
  const providerId = "quality-evidence-v1";
  const instructionId = "quality-judge-v1";
  const monitorManifest = {
    loopMonitors: [{
      id: monitorId,
      cycle: ["QUALITY_CHECK", "QUALITY_NON_PROGRESS"],
      ignoreEvents: [],
      threshold,
      evidenceProviderId: providerId,
      judgeInstructionId: instructionId,
      routes: ["repair", "replan", "repair-stalled"],
      transitionTable: {
        QUALITY_CHECK: ["QUALITY_NON_PROGRESS", "QUALITY_STRICT_PROGRESS", "QUALITY_REPLAN"],
        QUALITY_NON_PROGRESS: ["QUALITY_CHECK", "QUALITY_STRICT_PROGRESS"],
        QUALITY_STRICT_PROGRESS: ["QUALITY_CHECK"],
        QUALITY_REPLAN: ["QUALITY_CHECK"],
      },
    }],
    runtimeLimits: { maxPendingDeliveries: threshold + 1 },
  };
  const loopContributions: LoopMonitorContributions = {
    evidenceProviders: [{ id: providerId }],
    judgeInstructions: [{ id: instructionId }],
    routes: [
      { id: "repair", kind: "transition", targetEvent: "QUALITY_NON_PROGRESS" },
      { id: "replan", kind: "transition", targetEvent: "QUALITY_NON_PROGRESS" },
      {
        id: "repair-stalled",
        kind: "park",
        reasonCode: "REPAIR_STALLED",
        resumeCondition: "quality-any-of-evidence-change-human-retry",
      },
    ],
  };
  const evidenceProviders: readonly QualityEvidenceProviderDescriptor[] = [{
    id: providerId,
    schemaVersion: 1,
    outputSchemaDigest: digest("quality-evidence-batch-v1"),
    redactionPolicyId: "quality-safe-metadata-v1",
  }];
  const judgeInstructions: readonly QualityJudgeInstructionDescriptor[] = [{
    id: instructionId,
    contentDigest: digest("quality-replan-first-v1"),
    evidenceSchemaDigest: evidenceProviders[0]!.outputSchemaDigest,
  }];
  const routeRules: readonly QualityRouteRuleDescriptor[] = [
    { id: "quality-route-repair", monitorId, routeId: "repair", instructionId, disposition: "continue" },
    { id: "quality-route-replan", monitorId, routeId: "replan", instructionId, disposition: "continue" },
    {
      id: "quality-route-repair-stalled",
      monitorId,
      routeId: "repair-stalled",
      instructionId,
      disposition: "latch",
    },
  ];
  return {
    pluginId: "amadeus.quality-repair.first-party",
    schemaVersion: 1 as const,
    trusted: true as const,
    monitorManifest,
    loopContributions,
    evidenceProviders,
    judgeInstructions,
    routeRules,
    requiredOutputs: [] as readonly QualityRequiredOutputDescriptor[],
  };
}

export function createFirstPartyQualityContribution(threshold: number): NormalizedQualityContribution {
  if (!Number.isInteger(threshold) || threshold <= 0) {
    throw new Error("quality-repair-threshold-must-be-positive");
  }
  const content = qualityContributionContent(threshold);
  return { ...content, contentDigest: digest(content) };
}

export type QualityPluginActivation =
  | {
      readonly kind: "active";
      readonly reason: "none-human-opt-in" | "mode-required";
      readonly contribution: NormalizedQualityContribution;
      readonly graph: CompiledLoopMonitorGraph;
    }
  | { readonly kind: "disabled"; readonly reason: "none-default-off" }
  | {
      readonly kind: "error";
      readonly error: { readonly code: "ACTIVATION_FAILED"; readonly message: string };
    };

function compileQualityContribution(
  contribution: NormalizedQualityContribution | null,
): { readonly contribution: NormalizedQualityContribution; readonly graph: CompiledLoopMonitorGraph } | null {
  if (contribution === null || contribution.trusted !== true || contribution.schemaVersion !== 1) return null;
  const { contentDigest, ...content } = contribution;
  if (contentDigest !== digest(content)) return null;
  if (contribution.requiredOutputs.length !== 0) return null;
  const providerIds = new Set(contribution.evidenceProviders.map((item) => item.id));
  const instructionIds = new Set(contribution.judgeInstructions.map((item) => item.id));
  if (providerIds.size !== contribution.evidenceProviders.length ||
    instructionIds.size !== contribution.judgeInstructions.length) return null;
  for (const rule of contribution.routeRules) {
    if (!instructionIds.has(rule.instructionId) || rule.monitorId !== "quality-repair") return null;
    if ((rule.routeId === "repair-stalled") !== (rule.disposition === "latch")) return null;
  }
  const compiled = compileLoopMonitorManifest(contribution.monitorManifest, contribution.loopContributions);
  return compiled.ok ? { contribution, graph: compiled.graph } : null;
}

export function resolveQualityPluginActivation(input: {
  readonly mode: QualityAutonomyMode;
  readonly projection: QualityPluginProjection;
  readonly contribution: NormalizedQualityContribution | null;
}): QualityPluginActivation {
  if (input.mode === "none" && !input.projection.noneModeOptedIn) {
    return { kind: "disabled", reason: "none-default-off" };
  }
  const compiled = compileQualityContribution(input.contribution);
  if (compiled === null) {
    return {
      kind: "error",
      error: { code: "ACTIVATION_FAILED", message: "trusted first-party Quality Repair contribution is unavailable" },
    };
  }
  return {
    kind: "active",
    reason: input.mode === "none" ? "none-human-opt-in" : "mode-required",
    ...compiled,
  };
}

export type ReviewerVerdict = "READY" | "NOT-READY" | "NOT READY";

export type QualityObservation =
  | {
      readonly kind: "reviewer";
      readonly invocationId: string;
      readonly verifierId: string;
      readonly validationReceipt: string | null;
      readonly verdict: ReviewerVerdict;
      readonly blockers: readonly {
        readonly findingId: string;
        readonly artifactId: string | null;
        readonly failureFingerprint: string;
      }[];
    }
  | {
      readonly kind: "sensor";
      readonly sensorId: string;
      readonly blocking: boolean;
      readonly status: "passed" | "failed" | "incomplete";
      readonly outputId: string;
      readonly terminalReceipt: string | null;
    }
  | {
      readonly kind: "produce";
      readonly outputId: string;
      readonly required: boolean;
      readonly status: "present" | "missing" | "invalid";
      readonly verifierId: string;
      readonly receipt: string | null;
    }
  | {
      readonly kind: "condition";
      readonly conditionKind: "verification" | "completion";
      readonly conditionId: string;
      readonly status: "satisfied" | "unsatisfied" | "incomplete";
      readonly verifierId: string;
      readonly receipt: string | null;
    };

export type QualityEvidenceSourceEvent = QualityObservation | {
  readonly kind: "human-request-changes";
  readonly turnId: string;
};

export function collectQualityObservations(
  events: readonly QualityEvidenceSourceEvent[],
): readonly QualityObservation[] {
  return events.filter((event): event is QualityObservation => event.kind !== "human-request-changes");
}

export type QualitySourceCategory = "reviewer" | "sensor" | "produce" | "verification" | "completion";
export type QualityFailureKind =
  | "blocker"
  | "failed"
  | "incomplete"
  | "missing"
  | "invalid"
  | "unmet"
  | "evidence-incomplete";

export interface QualityObligation {
  readonly obligationId: string;
  readonly sourceCategory: QualitySourceCategory;
  readonly failureKind: QualityFailureKind;
  readonly stageInstanceId: string;
  readonly boltId: string;
  readonly artifactId: string | null;
  readonly verifierId: string;
  readonly failureFingerprint: string;
  readonly status: "unresolved";
}

export interface QualityVerifierSuccessReceipt {
  readonly obligationId: string;
  readonly verifierId: string;
  readonly receiptDigest: string;
}

export interface QualityEvidenceSnapshot {
  readonly intentUuid: string;
  readonly monitorId: string;
  readonly stageInstanceId: string;
  readonly boltId: string;
  readonly graphRevision: string;
  readonly qualityScopeId: string;
  readonly epochStartEventIdentity: string;
  readonly qualityEpochId: string;
  readonly unresolved: readonly QualityObligation[];
  readonly resolvedIds: readonly string[];
  readonly addedIds: readonly string[];
  readonly retainedIds: readonly string[];
  readonly snapshotFingerprint: string;
  readonly verifierSuccessReceipts: readonly QualityVerifierSuccessReceipt[];
}

export interface QualityEvidenceBatchInput {
  readonly providerId: string;
  readonly intentUuid: string;
  readonly monitorId: string;
  readonly stageInstanceId: string;
  readonly boltId: string;
  readonly graphRevision: string;
  readonly epochStartEventIdentity?: string;
  readonly previousSnapshot: QualityEvidenceSnapshot | null;
  readonly observations: readonly QualityObservation[];
}

export type QualityEvidenceResult =
  | { readonly ok: true; readonly snapshot: QualityEvidenceSnapshot }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: "INCOMPLETE" | "SCOPE_MISMATCH";
        readonly message: string;
      };
    };

function validId(value: string): boolean {
  return SAFE_ID.test(value);
}

function validDigest(value: string | null): value is string {
  return value !== null && SHA256.test(value);
}

function obligation(
  input: QualityEvidenceBatchInput,
  sourceCategory: QualitySourceCategory,
  failureKind: QualityFailureKind,
  identity: unknown,
  artifactId: string | null,
  verifierId: string,
  failureFingerprint: string,
): QualityObligation {
  return {
    obligationId: stableId("quality-obligation", [sourceCategory, input.stageInstanceId, identity]),
    sourceCategory,
    failureKind,
    stageInstanceId: input.stageInstanceId,
    boltId: input.boltId,
    artifactId,
    verifierId,
    failureFingerprint,
    status: "unresolved",
  };
}

function normalizeObservation(
  input: QualityEvidenceBatchInput,
  observation: QualityObservation,
): { readonly obligations: readonly QualityObligation[]; readonly successes: readonly QualityVerifierSuccessReceipt[] } {
  if (observation.kind === "reviewer") {
    if (!validId(observation.invocationId) || !validId(observation.verifierId)) {
      throw new Error("reviewer-identity-incomplete");
    }
    if (observation.verdict === "READY") return { obligations: [], successes: [] };
    if (!validDigest(observation.validationReceipt) || observation.blockers.length === 0) {
      return {
        obligations: [obligation(
          input,
          "reviewer",
          "evidence-incomplete",
          observation.invocationId,
          null,
          observation.verifierId,
          digest([observation.invocationId, "evidence-incomplete"]),
        )],
        successes: [],
      };
    }
    return {
      obligations: observation.blockers.map((blocker) => obligation(
        input,
        "reviewer",
        "blocker",
        [observation.invocationId, blocker.findingId],
        blocker.artifactId,
        observation.verifierId,
        SHA256.test(blocker.failureFingerprint)
          ? blocker.failureFingerprint
          : digest([observation.invocationId, blocker.findingId, "evidence-incomplete"]),
      )),
      successes: [],
    };
  }
  if (observation.kind === "sensor") {
    if (!validId(observation.sensorId) || !validId(observation.outputId)) {
      throw new Error("sensor-identity-incomplete");
    }
    const obligationId = stableId("quality-obligation", ["sensor", input.stageInstanceId, [observation.sensorId, observation.outputId]]);
    if (!observation.blocking) return { obligations: [], successes: [] };
    if (observation.status === "passed") {
      return {
        obligations: [],
        successes: validDigest(observation.terminalReceipt)
          ? [{ obligationId, verifierId: observation.sensorId, receiptDigest: observation.terminalReceipt }]
          : [],
      };
    }
    const incomplete = observation.status === "incomplete" || !validDigest(observation.terminalReceipt);
    return {
      obligations: [obligation(
        input,
        "sensor",
        incomplete ? "evidence-incomplete" : "failed",
        [observation.sensorId, observation.outputId],
        observation.outputId,
        observation.sensorId,
        digest([observation.sensorId, observation.outputId, observation.status, observation.terminalReceipt]),
      )],
      successes: [],
    };
  }
  if (observation.kind === "produce") {
    if (!validId(observation.outputId) || !validId(observation.verifierId)) {
      throw new Error("produce-identity-incomplete");
    }
    const obligationId = stableId("quality-obligation", ["produce", input.stageInstanceId, observation.outputId]);
    if (!observation.required) return { obligations: [], successes: [] };
    if (observation.status === "present") {
      return {
        obligations: [],
        successes: validDigest(observation.receipt)
          ? [{ obligationId, verifierId: observation.verifierId, receiptDigest: observation.receipt }]
          : [],
      };
    }
    return {
      obligations: [obligation(
        input,
        "produce",
        observation.status,
        observation.outputId,
        observation.outputId,
        observation.verifierId,
        digest([observation.outputId, observation.status, observation.receipt]),
      )],
      successes: [],
    };
  }
  if (!validId(observation.conditionId) || !validId(observation.verifierId)) {
    throw new Error("condition-identity-incomplete");
  }
  const category = observation.conditionKind;
  const obligationId = stableId("quality-obligation", [category, input.stageInstanceId, observation.conditionId]);
  if (observation.status === "satisfied") {
    return {
      obligations: [],
      successes: validDigest(observation.receipt)
        ? [{ obligationId, verifierId: observation.verifierId, receiptDigest: observation.receipt }]
        : [],
    };
  }
  return {
    obligations: [obligation(
      input,
      category,
      observation.status === "incomplete" || !validDigest(observation.receipt)
        ? "evidence-incomplete"
        : "unmet",
      observation.conditionId,
      null,
      observation.verifierId,
      digest([category, observation.conditionId, observation.status, observation.receipt]),
    )],
    successes: [],
  };
}

function sameSnapshotScope(input: QualityEvidenceBatchInput, previous: QualityEvidenceSnapshot): boolean {
  return input.intentUuid === previous.intentUuid && input.monitorId === previous.monitorId &&
    input.stageInstanceId === previous.stageInstanceId && input.boltId === previous.boltId &&
    input.graphRevision === previous.graphRevision;
}

export function normalizeQualityEvidence(input: QualityEvidenceBatchInput): QualityEvidenceResult {
  if (![input.providerId, input.intentUuid, input.monitorId, input.stageInstanceId, input.boltId].every(validId) ||
    input.observations.length === 0) {
    return { ok: false, error: { code: "INCOMPLETE", message: "quality evidence batch identity or observations are incomplete" } };
  }
  if (input.previousSnapshot !== null && !sameSnapshotScope(input, input.previousSnapshot)) {
    return { ok: false, error: { code: "SCOPE_MISMATCH", message: "previous quality snapshot belongs to another scope" } };
  }
  const qualityScopeId = stableId("quality-scope", [
    input.intentUuid,
    input.monitorId,
    input.stageInstanceId,
    input.boltId,
    input.graphRevision,
  ]);
  const epochStartEventIdentity = input.epochStartEventIdentity ??
    input.previousSnapshot?.epochStartEventIdentity ?? stableId("quality-epoch-start", [qualityScopeId, "genesis"]);
  const qualityEpochId = stableId("quality-epoch", [qualityScopeId, epochStartEventIdentity]);
  if (input.previousSnapshot !== null && input.previousSnapshot.qualityEpochId !== qualityEpochId) {
    return { ok: false, error: { code: "SCOPE_MISMATCH", message: "previous quality snapshot belongs to another epoch" } };
  }
  try {
    const parsed = input.observations.map((item) => normalizeObservation(input, item));
    const byId = new Map<string, QualityObligation>();
    for (const item of parsed.flatMap((entry) => entry.obligations)) {
      const prior = byId.get(item.obligationId);
      if (prior !== undefined && canonicalJson(prior) !== canonicalJson(item)) {
        return { ok: false, error: { code: "INCOMPLETE", message: "conflicting duplicate quality obligation" } };
      }
      byId.set(item.obligationId, item);
    }
    const unresolved = [...byId.values()].sort((a, b) => bytewise(a.obligationId, b.obligationId));
    const currentIds = new Set(unresolved.map((item) => item.obligationId));
    const previousIds = new Set(input.previousSnapshot?.unresolved.map((item) => item.obligationId) ?? []);
    const resolvedIds = [...previousIds].filter((id) => !currentIds.has(id)).sort(bytewise);
    const addedIds = [...currentIds].filter((id) => !previousIds.has(id)).sort(bytewise);
    const retainedIds = [...currentIds].filter((id) => previousIds.has(id)).sort(bytewise);
    const verifierSuccessReceipts = parsed.flatMap((entry) => entry.successes)
      .sort((a, b) => bytewise(`${a.obligationId}:${a.receiptDigest}`, `${b.obligationId}:${b.receiptDigest}`));
    return {
      ok: true,
      snapshot: {
        intentUuid: input.intentUuid,
        monitorId: input.monitorId,
        stageInstanceId: input.stageInstanceId,
        boltId: input.boltId,
        graphRevision: input.graphRevision,
        qualityScopeId,
        epochStartEventIdentity,
        qualityEpochId,
        unresolved,
        resolvedIds,
        addedIds,
        retainedIds,
        snapshotFingerprint: digest([
          qualityScopeId,
          qualityEpochId,
          unresolved.map((item) => [item.obligationId, item.sourceCategory, item.failureKind, item.failureFingerprint]),
        ]),
        verifierSuccessReceipts,
      },
    };
  } catch (cause) {
    return {
      ok: false,
      error: { code: "INCOMPLETE", message: cause instanceof Error ? cause.message : String(cause) },
    };
  }
}

export type QualityNonProgressPattern = "fixed-point" | "churn" | "regression" | "undetermined";

export type QualityProgress =
  | { readonly kind: "initial"; readonly threshold: number }
  | { readonly kind: "collecting"; readonly consecutiveNonProgress: number; readonly threshold: number }
  | { readonly kind: "strict-progress"; readonly resolvedIds: readonly string[]; readonly addedIds: readonly string[] }
  | {
      readonly kind: "threshold";
      readonly consecutiveNonProgress: number;
      readonly threshold: number;
      readonly pattern: QualityNonProgressPattern;
      readonly requiredRoute: "replan" | "repair-stalled";
    };

export interface QualityReviewCycle {
  readonly reviewCycleId: string;
  readonly previousReviewCycleId: string | null;
  readonly iteration: 1;
  readonly cycleIndex: number;
  readonly replanFingerprint: string;
}

export interface QualityEpochProjection {
  readonly qualityScopeId: string;
  readonly qualityEpochId: string;
  readonly epochStartEventIdentity: string;
  readonly threshold: number;
  readonly window: readonly QualityEvidenceSnapshot[];
  readonly consecutiveNonProgress: number;
  readonly replanSinceLastProgress: boolean;
  readonly currentReviewCycle: QualityReviewCycle | null;
}

export function createQualityEpochProjection(
  snapshot: QualityEvidenceSnapshot,
  threshold: number,
): QualityEpochProjection {
  if (!Number.isInteger(threshold) || threshold <= 0) throw new Error("quality-epoch-invalid-threshold");
  return {
    qualityScopeId: snapshot.qualityScopeId,
    qualityEpochId: snapshot.qualityEpochId,
    epochStartEventIdentity: snapshot.epochStartEventIdentity,
    threshold,
    window: [],
    consecutiveNonProgress: 0,
    replanSinceLastProgress: false,
    currentReviewCycle: null,
  };
}

function obligationIds(snapshot: QualityEvidenceSnapshot): Set<string> {
  return new Set(snapshot.unresolved.map((item) => item.obligationId));
}

function isStrictSubset(current: Set<string>, previous: Set<string>): boolean {
  return current.size < previous.size && [...current].every((id) => previous.has(id));
}

function classifyPattern(
  window: readonly QualityEvidenceSnapshot[],
  threshold: number,
): QualityNonProgressPattern {
  const latest = window.at(-1);
  if (latest === undefined) return "undetermined";
  const earlierIndex = window.slice(0, -1).findLastIndex(
    (item) => item.snapshotFingerprint === latest.snapshotFingerprint,
  );
  if (earlierIndex >= 0 && window.slice(earlierIndex + 1, -1).some(
    (item) => item.snapshotFingerprint !== latest.snapshotFingerprint,
  )) return "regression";
  const recent = window.slice(-threshold);
  if (recent.length === threshold && recent.every(
    (item) => item.snapshotFingerprint === latest.snapshotFingerprint,
  )) return "fixed-point";
  if (recent.length === threshold && new Set(recent.map((item) => item.snapshotFingerprint)).size > 1) {
    let monotonicallyShrank = true;
    for (let index = 1; index < recent.length; index += 1) {
      if (!isStrictSubset(obligationIds(recent[index]!), obligationIds(recent[index - 1]!))) {
        monotonicallyShrank = false;
        break;
      }
    }
    if (!monotonicallyShrank) return "churn";
  }
  return "undetermined";
}

export interface QualityDeliveryPlan {
  readonly progress: QualityProgress;
  readonly nextProjection: QualityEpochProjection;
  readonly monitorEvent: "QUALITY_CHECK" | "QUALITY_STRICT_PROGRESS";
  readonly routeIds: readonly ("replan" | "repair-stalled")[];
  readonly deterministicAction: "repair" | null;
}

export function planQualityDelivery(
  projection: QualityEpochProjection,
  snapshot: QualityEvidenceSnapshot,
): QualityDeliveryPlan {
  if (projection.qualityScopeId !== snapshot.qualityScopeId || projection.qualityEpochId !== snapshot.qualityEpochId) {
    throw new Error("quality-delivery-scope-mismatch");
  }
  const previous = projection.window.at(-1) ?? null;
  const strictProgress = previous !== null &&
    isStrictSubset(obligationIds(snapshot), obligationIds(previous)) && snapshot.addedIds.length === 0;
  const window = [...projection.window, snapshot].slice(-(projection.threshold + 1));
  let progress: QualityProgress;
  let consecutiveNonProgress = projection.consecutiveNonProgress;
  let replanSinceLastProgress = projection.replanSinceLastProgress;
  if (previous === null) {
    progress = { kind: "initial", threshold: projection.threshold };
  } else if (strictProgress) {
    progress = {
      kind: "strict-progress",
      resolvedIds: snapshot.resolvedIds,
      addedIds: snapshot.addedIds,
    };
    consecutiveNonProgress = 0;
    replanSinceLastProgress = false;
  } else {
    consecutiveNonProgress += 1;
    if (consecutiveNonProgress >= projection.threshold) {
      progress = {
        kind: "threshold",
        consecutiveNonProgress,
        threshold: projection.threshold,
        pattern: classifyPattern(window, projection.threshold),
        requiredRoute: replanSinceLastProgress ? "repair-stalled" : "replan",
      };
    } else {
      progress = { kind: "collecting", consecutiveNonProgress, threshold: projection.threshold };
    }
  }
  const nextProjection: QualityEpochProjection = {
    ...projection,
    window,
    consecutiveNonProgress,
    replanSinceLastProgress,
  };
  return {
    progress,
    nextProjection,
    monitorEvent: progress.kind === "strict-progress" ? "QUALITY_STRICT_PROGRESS" : "QUALITY_CHECK",
    routeIds: progress.kind === "threshold" ? [progress.requiredRoute] : [],
    deterministicAction: progress.kind === "threshold" ? null : "repair",
  };
}

export interface QualityReplanReceipt {
  readonly judgeInvocationId: string;
  readonly planDigest: string;
  readonly agentId: string;
  readonly contextId: string;
}

export function recordQualityReplan(
  projection: QualityEpochProjection,
  receipt: QualityReplanReceipt,
): { readonly replanId: string; readonly nextProjection: QualityEpochProjection } {
  if (![receipt.judgeInvocationId, receipt.agentId, receipt.contextId].every(validId) || !SHA256.test(receipt.planDigest)) {
    throw new Error("quality-replan-receipt-invalid");
  }
  const cycleIndex = (projection.currentReviewCycle?.cycleIndex ?? -1) + 1;
  const reviewCycleId = stableId("quality-review-cycle", [
    projection.qualityEpochId,
    receipt.judgeInvocationId,
    receipt.planDigest,
    cycleIndex,
  ]);
  return {
    replanId: stableId("quality-replan", [
      projection.qualityEpochId,
      projection.window.at(-1)?.snapshotFingerprint,
      receipt.judgeInvocationId,
    ]),
    nextProjection: {
      ...projection,
      consecutiveNonProgress: 0,
      replanSinceLastProgress: true,
      currentReviewCycle: {
        reviewCycleId,
        previousReviewCycleId: projection.currentReviewCycle?.reviewCycleId ?? null,
        iteration: 1,
        cycleIndex,
        replanFingerprint: receipt.planDigest,
      },
    },
  };
}

export function qualityDigest(value: unknown): string {
  return digest(value);
}

export function qualityStableId(namespace: string, value: unknown): string {
  return stableId(namespace, value);
}
