// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts
// covers: file:packages/framework/core/tools/amadeus-intent-autonomy-replay.ts
// covers: audit:INTENT_AUTONOMY_TRANSACTION_COMMITTED
// size: medium

import { describe, expect, test } from "bun:test";

import {
  autonomyDigest,
  createAutonomyProjection,
  createDecisionOptionEffectRegistry,
  createInteractionOccurrence,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  type AutonomyProjection,
  type DecisionCapabilityPort,
  type DecisionOptionEffect,
  type GrantScopeDescriptor,
  type ResumeCondition,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  createMemoryIntentAutonomyRepository,
  projectIntentAutonomyStatus,
  resolveIntentQualityActivation,
  type IntentAutonomyCoordinator,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";
import {
  readIntentAutonomyTransactions,
  renderIntentAutonomyAuditBlock,
  replayIntentAutonomyAudit,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";
import {
  createFirstPartyQualityContribution,
  emptyQualityPluginProjection,
} from "../../packages/framework/core/tools/amadeus-quality-repair.ts";
import type { LoopMonitorCoordinator } from "../../packages/framework/core/tools/amadeus-loop-monitor-runtime.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const NORM = autonomyDigest("norm-v1");
const SCOPE_FP = autonomyDigest("scope-v1");
const GRAPH = autonomyDigest("graph-v1");
const REGISTRY_REVISION = autonomyDigest("registry-v1");

function scope(): GrantScopeDescriptor {
  return {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: SCOPE_FP,
    normFingerprint: NORM,
    allowedInteractionKinds: ["stage-gate", "phase-gate", "walking-skeleton", "question"],
    permissionBoundaryFingerprint: autonomyDigest("host-tools"),
    prohibitedEffects: ["new-permission", "irreversible", "scope-out", "norm-waiver", "quality-waiver"],
  };
}

function effect(optionId: string, classification: DecisionOptionEffect["classification"] = "workflow-reversible"): DecisionOptionEffect {
  const payload = { workflow: "continue", optionId };
  return {
    effectId: `workflow-${optionId}`,
    optionId,
    payload,
    payloadFingerprint: autonomyDigest(payload),
    classification,
    requiredScopeFingerprint: SCOPE_FP,
    applicableNormFingerprint: NORM,
  };
}

function registry(...effects: DecisionOptionEffect[]) {
  return createDecisionOptionEffectRegistry({ revision: REGISTRY_REVISION, effects });
}

function capability(available = true, counters?: { elect: number; recommend: number }): DecisionCapabilityPort {
  return {
    soloElectionAvailable: available,
    unavailableReason: available ? null : "subagent-capability-unavailable",
    elect() {
      if (counters) counters.elect++;
      return { optionId: "accept", evidenceFingerprint: autonomyDigest("election") };
    },
    recommend() {
      if (counters) counters.recommend++;
      return { optionId: "accept", evidenceFingerprint: autonomyDigest("recommendation") };
    },
  };
}

function question() {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind: "question",
    stage: "code-generation",
    phase: "construction",
    bolt: "intent-autonomy-runtime",
    interactionId: "question-1",
    selector: "selector-1",
    question: "Continue?",
    optionIds: ["accept", "reject"],
    graphRevision: GRAPH,
  });
}

function gate(kind: "stage-gate" | "walking-skeleton" = "stage-gate") {
  return createInteractionOccurrence({
    intentUuid: INTENT,
    kind,
    stage: "code-generation",
    phase: "construction",
    bolt: "intent-autonomy-runtime",
    interactionId: `${kind}-1`,
    selector: `${kind}-selector`,
    question: "Approve?",
    optionIds: ["approve"],
    graphRevision: GRAPH,
  });
}

function commandFull(coordinator: IntentAutonomyCoordinator, initial: AutonomyProjection, policyOption = "accept") {
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: SCOPE_FP,
    humanTurnId: "human-turn-1",
    policies: policyOption === "none" ? [] : [{ sourceText: "Use the accepted option", selector: "selector-1", optionId: policyOption }],
  });
  const display = grantIssuanceDisplayDigest({ intentUuid: INTENT, principalId: "principal-1", scope: scope(), policies });
  const result = coordinator.applyHumanCommand(
    { kind: "issue-full", scope: scope(), policies },
    {
      targetIntentUuid: INTENT,
      principalId: "principal-1",
      humanTurn: { verified: true, eventType: "HUMAN_TURN", turnId: "human-turn-1" },
      commandOccurrenceId: "command-1",
      expectedProjectionRevision: initial.projectionRevision,
      confirmedDisplayDigest: display,
    },
  );
  if ("error" in result) throw new Error(result.error);
}

function fullRuntime(policyOption = "accept") {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const repository = createMemoryIntentAutonomyRepository();
  const coordinator = createIntentAutonomyCoordinator({ initialProjection: initial, repository });
  commandFull(coordinator, initial, policyOption);
  return { initial, repository, coordinator };
}

function decisionInput(overrides: Partial<Parameters<IntentAutonomyCoordinator["decide"]>[0]> = {}) {
  return {
    occurrence: question(),
    actorId: "codex",
    registry: registry(effect("accept"), effect("reject")),
    currentNormFingerprint: NORM,
    scopeLineageFingerprint: SCOPE_FP,
    applicableNormFacts: [],
    pastHumanRulings: [],
    capability: capability(),
    ...overrides,
  };
}

describe("Intent autonomy durable coordinator", () => {
  test("human command commits mode and grant in one transaction", () => {
    const { repository, coordinator } = fullRuntime();
    const projection = coordinator.readProjection();
    expect(projection.mode).toBe("full");
    expect(projection.currentGrant?.state).toBe("active");
    expect(repository.readTransactions(INTENT)[0]?.events.map((event) => event.type)).toEqual([
      "AUTONOMY_MODE_CHANGED",
      "INTENT_GRANT_ISSUED",
    ]);
  });

  test("full question persists reservation before exercise, decision and effect", () => {
    const { repository, coordinator } = fullRuntime();
    const result = coordinator.decide(decisionInput());
    expect(result.kind).toBe("decided");
    expect(repository.readTransactions(INTENT).map((transaction) => transaction.events.map((event) => event.type))).toEqual([
      ["AUTONOMY_MODE_CHANGED", "INTENT_GRANT_ISSUED"],
      ["INTENT_GRANT_EXERCISE_RESERVED"],
      ["INTENT_GRANT_EXERCISED", "AUTO_DECIDED", "WORKFLOW_EFFECT_APPLIED"],
    ]);
  });

  test("crash after reservation resumes from canonical candidate", () => {
    const { repository, coordinator } = fullRuntime();
    const input = decisionInput({ injectCrashAfterReservation: true });
    const reserved = coordinator.decide(input);
    expect(reserved.kind).toBe("reserved");
    const resumed = coordinator.resumeReservation(decisionInput());
    expect(resumed.kind).toBe("decided");
    expect(repository.readTransactions(INTENT).at(-1)?.events[0]?.type).toBe("INTENT_GRANT_EXERCISED");
  });

  test("registry drift after reservation aborts without workflow effect", () => {
    const { repository, coordinator } = fullRuntime();
    const input = decisionInput({ injectCrashAfterReservation: true });
    expect(coordinator.decide(input).kind).toBe("reserved");
    const changedRegistry = createDecisionOptionEffectRegistry({ revision: autonomyDigest("registry-v2"), effects: [effect("accept"), effect("reject")] });
    const resumed = coordinator.resumeReservation(decisionInput({ registry: changedRegistry }));
    expect(resumed.kind).toBe("aborted");
    expect(repository.readTransactions(INTENT).at(-1)?.events).toEqual([
      expect.objectContaining({ type: "INTENT_GRANT_EXERCISE_ABORTED" }),
    ]);
  });

  test("prohibited effect parks with grant active", () => {
    const { coordinator } = fullRuntime();
    const result = coordinator.decide(decisionInput({
      registry: registry(effect("accept", "new-permission"), effect("reject")),
    }));
    expect(result.kind).toBe("parked");
    expect(coordinator.readProjection().currentGrant?.state).toBe("active");
    expect(coordinator.readProjection().parkEnvelope?.reason).toBe("AWAITING_HUMAN");
  });

  test("norm conflict parks before election and same fingerprint short-circuits", () => {
    const counters = { elect: 0, recommend: 0 };
    const { coordinator } = fullRuntime("none");
    const facts = [
      { optionId: "accept", selector: "selector-1", scopeLineageFingerprint: SCOPE_FP, normFingerprint: NORM, evidenceFingerprint: autonomyDigest("a") },
      { optionId: "reject", selector: "selector-1", scopeLineageFingerprint: SCOPE_FP, normFingerprint: NORM, evidenceFingerprint: autonomyDigest("b") },
    ];
    const input = decisionInput({ applicableNormFacts: facts, capability: capability(true, counters) });
    expect(coordinator.decide(input).kind).toBe("parked");
    expect(coordinator.decide(input).kind).toBe("parked");
    expect(counters).toEqual({ elect: 0, recommend: 0 });
  });

  test("semi phase-internal gate emits AUTO_DECIDED without grant exercise", () => {
    const initial = createAutonomyProjection({ intentUuid: INTENT });
    const repository = createMemoryIntentAutonomyRepository();
    const coordinator = createIntentAutonomyCoordinator({ initialProjection: initial, repository });
    const result = coordinator.applyHumanCommand({ kind: "set-mode", mode: "semi" }, {
      targetIntentUuid: INTENT,
      principalId: "principal-1",
      humanTurn: { verified: true, eventType: "HUMAN_TURN", turnId: "human-turn-1" },
      commandOccurrenceId: "command-1",
      expectedProjectionRevision: 0,
      confirmedDisplayDigest: autonomyDigest("semi-display"),
    });
    if ("error" in result) throw new Error(result.error);
    const decided = coordinator.decide(decisionInput({
      occurrence: gate(),
      registry: registry(effect("approve")),
      gateApprovalOptionId: "approve",
    }));
    expect(decided.kind).toBe("decided");
    expect(repository.readTransactions(INTENT).at(-1)?.events.map((event) => event.type)).toEqual([
      "AUTO_DECIDED",
      "WORKFLOW_EFFECT_APPLIED",
    ]);
  });

  test("walking skeleton is human in semi and grant-backed in full", () => {
    const { coordinator } = fullRuntime();
    const result = coordinator.decide(decisionInput({
      occurrence: gate("walking-skeleton"),
      registry: registry(effect("approve")),
      gateApprovalOptionId: "approve",
    }));
    expect(result.kind).toBe("decided");
  });

  test("Request Changes and quality activation do not revoke the full grant", () => {
    const { coordinator } = fullRuntime();
    const beforeGrant = coordinator.readProjection().currentGrant?.grantId;
    const activation = resolveIntentQualityActivation({
      autonomy: coordinator.readProjection(),
      qualityProjection: emptyQualityPluginProjection(INTENT),
      contribution: createFirstPartyQualityContribution(2),
    });
    expect(activation.kind).toBe("active");
    expect(coordinator.readProjection().currentGrant?.grantId).toBe(beforeGrant);
  });

  test("REPAIR_STALLED requires the U1 latch seam and clears it before unpark", () => {
    const { coordinator } = fullRuntime();
    const pending: ResumeCondition = {
      kind: "quality-evidence-or-human",
      identity: "quality-resume-1",
      status: "pending",
      evidenceFingerprint: autonomyDigest("quality-before"),
    };
    const parked = coordinator.park({
      triggerOccurrenceId: "quality-trigger-1",
      reason: "REPAIR_STALLED",
      resumeCondition: pending,
      monitorLatchIdentity: "loop-latch-1",
    });
    expect("result" in parked && parked.result.outcome).toBe("parked");
    expect(coordinator.resume({
      triggerOccurrenceId: "quality-trigger-1",
      condition: { ...pending, status: "satisfied", evidenceFingerprint: autonomyDigest("quality-after") },
      basis: "evidence-change",
    })).toEqual({ error: "monitor-latch-clear-required" });
    let clearCalls = 0;
    const loopMonitor = {
      clearLatch() {
        clearCalls++;
        return { kind: "cleared", projection: {} };
      },
    } as unknown as LoopMonitorCoordinator;
    const resumed = coordinator.resume({
      triggerOccurrenceId: "quality-trigger-1",
      condition: { ...pending, status: "satisfied", evidenceFingerprint: autonomyDigest("quality-after") },
      basis: "evidence-change",
      loopMonitor: {
        coordinator: loopMonitor,
        partition: { intentUuid: INTENT, monitorId: "quality-repair", stageInstanceId: "stage-1", graphRevision: GRAPH },
        evidenceFingerprint: autonomyDigest("quality-after"),
      },
    });
    expect("error" in resumed).toBe(false);
    expect(clearCalls).toBe(1);
    expect(coordinator.readProjection().workflowExecutionState).toBe("running");
    expect(coordinator.readProjection().currentGrant?.state).toBe("active");
  });

  test("terminal invocation failure records immutable authorization state and no retry", () => {
    const { coordinator } = fullRuntime();
    const before = coordinator.readProjection();
    const failed = coordinator.recordInvocationFailure({
      invocationId: "invocation-1",
      failureClass: "provider-terminal",
      sanitizedEvidenceFingerprint: autonomyDigest("safe-evidence"),
    });
    expect("result" in failed && failed.result.outcome).toBe("failed");
    expect("result" in failed && failed.result.retryable).toBe(false);
    const after = coordinator.readProjection();
    expect(after.mode).toBe(before.mode);
    expect(after.currentGrant?.grantId).toBe(before.currentGrant?.grantId);
    expect(after.workflowExecutionState).toBe("running");
  });

  test("terminal invocation failure cannot discard a durable exercise reservation", () => {
    const { coordinator } = fullRuntime();
    expect(coordinator.decide(decisionInput({ injectCrashAfterReservation: true })).kind).toBe("reserved");
    const before = coordinator.readProjection();
    const failed = coordinator.recordInvocationFailure({
      invocationId: "invocation-with-pending-exercise",
      failureClass: "provider-terminal",
      sanitizedEvidenceFingerprint: autonomyDigest("safe-evidence"),
    });
    expect(failed).toEqual({ error: "pending-exercise-must-resolve" });
    expect(coordinator.readProjection()).toEqual(before);
  });

  test("status exposes contract facts and keeps terminal live capability false", () => {
    const { coordinator } = fullRuntime();
    expect(projectIntentAutonomyStatus(coordinator.readProjection())).toMatchObject({
      autonomyMode: "full",
      workflowExecutionState: "running",
      terminalLiveCompletionCapable: false,
      legacyStandingGrantCount: 0,
    });
  });
});

describe("Intent autonomy audit replay", () => {
  test("cross-session replay preserves grant and decision identities", () => {
    const { repository, coordinator } = fullRuntime();
    coordinator.decide(decisionInput());
    const audit = repository.readTransactions(INTENT).map(renderIntentAutonomyAuditBlock).join("\n");
    const replayed = replayIntentAutonomyAudit(audit);
    const projection = replayed.readProjection(INTENT);
    expect(projection?.currentGrant?.grantId).toBe(coordinator.readProjection().currentGrant?.grantId);
    expect(projection?.autoDecisions[0]?.decisionId).toBe(coordinator.readProjection().autoDecisions[0]?.decisionId);
  });

  test("duplicate identical transaction is idempotent", () => {
    const { repository } = fullRuntime();
    const row = renderIntentAutonomyAuditBlock(repository.readTransactions(INTENT)[0]!);
    expect(readIntentAutonomyTransactions(`${row}\n${row}`)).toHaveLength(1);
  });

  test("audit field tamper is rejected", () => {
    const { repository } = fullRuntime();
    const row = renderIntentAutonomyAuditBlock(repository.readTransactions(INTENT)[0]!).replace(
      /Transaction Digest: sha256:[0-9a-f]{64}/,
      `Transaction Digest: ${autonomyDigest("tampered")}`,
    );
    expect(() => readIntentAutonomyTransactions(row)).toThrow("identity-mismatch");
  });
});
