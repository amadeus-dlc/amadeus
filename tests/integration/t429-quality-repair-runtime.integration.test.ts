// covers: file:packages/framework/core/tools/amadeus-quality-repair-runtime.ts, audit:QUALITY_REPAIR_TRANSACTION_COMMITTED
// size: medium

import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  seededAuditShard,
} from "../harness/fixtures.ts";

import {
  createFirstPartyQualityContribution,
  emptyQualityPluginProjection,
  resolveQualityPluginActivation,
  type QualityEvidenceBatchInput,
  type QualityEvidenceSnapshot,
  type QualityObservation,
} from "../../packages/framework/core/tools/amadeus-quality-repair.ts";
import {
  createMemoryQualityRepairRepository,
  createQualityRepairCoordinator,
  renderQualityRepairStatus,
  type QualityRepairTransaction,
  type QualityReplanPort,
} from "../../packages/framework/core/tools/amadeus-quality-repair-runtime.ts";
import {
  decodeQualityRepairTransaction,
  readQualityRepairTransactionsFromAudit,
  replayQualityRepairScope,
} from "../../packages/framework/core/tools/amadeus-quality-repair-replay.ts";
import type {
  JudgeDispatchRequest,
  JudgePort,
  VerifiedHumanTurn,
} from "../../packages/framework/core/tools/amadeus-loop-monitor-runtime.ts";

const trace = { traceId: "0123456789abcdef0123456789abcdef", spanId: "0123456789abcdef" };

function reviewer(blockerIds: readonly string[]): QualityObservation {
  return {
    kind: "reviewer",
    invocationId: "review-1",
    verifierId: "architecture-reviewer",
    validationReceipt: `sha256:${"a".repeat(64)}`,
    verdict: blockerIds.length === 0 ? "READY" : "NOT-READY",
    blockers: blockerIds.map((findingId) => ({
      findingId,
      artifactId: "code-summary",
      failureFingerprint: `sha256:${"b".repeat(64)}`,
    })),
  };
}

function runtime() {
  const contribution = createFirstPartyQualityContribution(2);
  const activation = resolveQualityPluginActivation({
    mode: "semi",
    projection: emptyQualityPluginProjection("intent-1"),
    contribution,
  });
  if (activation.kind !== "active") throw new Error("expected active contribution");
  const repository = createMemoryQualityRepairRepository();
  return {
    activation,
    repository,
    coordinator: createQualityRepairCoordinator({ activation, repository }),
  };
}

function batch(
  graphRevision: string,
  previousSnapshot: QualityEvidenceSnapshot | null,
  blockerIds: readonly string[] = ["blocker-a"],
): QualityEvidenceBatchInput {
  return {
    providerId: "quality-evidence-v1",
    intentUuid: "intent-1",
    monitorId: "quality-repair",
    stageInstanceId: "code-generation-1",
    boltId: "bolt-2",
    graphRevision,
    previousSnapshot,
    observations: [reviewer(blockerIds)],
  };
}

function sensorBatch(
  graphRevision: string,
  previousSnapshot: QualityEvidenceSnapshot | null,
  status: "failed" | "passed",
): QualityEvidenceBatchInput {
  return {
    providerId: "quality-evidence-v1",
    intentUuid: "intent-1",
    monitorId: "quality-repair",
    stageInstanceId: "sensor-stage-1",
    boltId: "sensor-bolt-1",
    graphRevision,
    previousSnapshot,
    observations: [{
      kind: "sensor",
      sensorId: "type-check",
      blocking: true,
      status,
      outputId: "typecheck-output",
      terminalReceipt: `sha256:${"9".repeat(64)}`,
    }],
  };
}

function mixedSensorBatch(
  graphRevision: string,
  previousSnapshot: QualityEvidenceSnapshot | null,
  includeSecondFailure: boolean,
  successReceipt: string,
): QualityEvidenceBatchInput {
  const failed = (outputId: string): QualityObservation => ({
    kind: "sensor",
    sensorId: "type-check",
    blocking: true,
    status: "failed",
    outputId,
    terminalReceipt: `sha256:${"8".repeat(64)}`,
  });
  return {
    providerId: "quality-evidence-v1",
    intentUuid: "intent-1",
    monitorId: "quality-repair",
    stageInstanceId: "mixed-sensor-stage-1",
    boltId: "mixed-sensor-bolt-1",
    graphRevision,
    previousSnapshot,
    observations: [
      failed("typecheck-output"),
      ...(includeSecondFailure ? [failed("lint-output")] : []),
      {
        kind: "sensor",
        sensorId: "type-check",
        blocking: true,
        status: "passed",
        outputId: "typecheck-output",
        terminalReceipt: successReceipt,
      },
    ],
  };
}

function judgePort(): { readonly port: JudgePort; readonly requests: JudgeDispatchRequest[] } {
  const requests: JudgeDispatchRequest[] = [];
  return {
    requests,
    port: {
      dispatch(request) {
        requests.push(request);
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
      reconcile() {
        return { kind: "unknown", reason: "not-used" };
      },
    },
  };
}

const replanPort: QualityReplanPort = {
  dispatch(request) {
    return {
      kind: "completed",
      receipt: {
        judgeInvocationId: request.judgeInvocationId,
        planDigest: `sha256:${"d".repeat(64)}`,
        agentId: "repair-agent",
        contextId: "fresh-context-1",
      },
    };
  },
  reconcile() {
    return { kind: "unknown", reason: "not-used" };
  },
};

function reachFirstThreshold() {
  const instance = runtime();
  let previous: QualityEvidenceSnapshot | null = null;
  let result: ReturnType<typeof instance.coordinator.recordEvidence> | null = null;
  for (let index = 0; index < 3; index += 1) {
    result = instance.coordinator.recordEvidence(batch(instance.activation.graph.graphRevision, previous), trace);
    previous = result.snapshot;
  }
  if (result?.kind !== "judge-reserved") throw new Error("missing first threshold");
  return { ...instance, previous, threshold: result };
}

function reachStalledRuntime() {
  const instance = reachFirstThreshold();
  instance.coordinator.dispatchJudge(instance.threshold.permit, judgePort().port, replanPort);
  let previous = instance.previous;
  let result: ReturnType<typeof instance.coordinator.recordEvidence> | null = null;
  for (let index = 0; index < 2; index += 1) {
    result = instance.coordinator.recordEvidence(batch(instance.activation.graph.graphRevision, previous), trace);
    previous = result.snapshot;
  }
  if (result?.kind !== "judge-reserved") throw new Error("missing stalled threshold");
  const stalled = instance.coordinator.dispatchJudge(result.permit, judgePort().port, replanPort);
  if (stalled.kind !== "REPAIR_STALLED") throw new Error("missing stalled latch");
  const status = instance.coordinator.status(result.snapshot.qualityScopeId);
  if (status === null) throw new Error("missing stalled status");
  return { ...instance, previous, status };
}

describe("Quality Repair production coordinator", () => {
  test("does not Judge at T-1, replans at first T, and latches at post-replan T", () => {
    const { activation, repository, coordinator } = runtime();
    let previous: QualityEvidenceSnapshot | null = null;

    const first = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
    expect(first.kind).toBe("repair");
    previous = first.snapshot;
    const second = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
    expect(second.kind).toBe("repair");
    previous = second.snapshot;
    const third = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
    expect(third.kind).toBe("judge-reserved");
    previous = third.snapshot;

    const firstJudge = judgePort();
    if (third.kind !== "judge-reserved") return;
    const replanned = coordinator.dispatchJudge(third.permit, firstJudge.port, replanPort);
    expect(replanned.kind).toBe("replanned");
    expect(firstJudge.requests).toHaveLength(1);
    expect(firstJudge.requests[0]?.allowedRouteIds).toEqual(["replan"]);

    const fourth = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
    expect(fourth.kind).toBe("repair");
    previous = fourth.snapshot;
    const fifth = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
    expect(fifth.kind).toBe("judge-reserved");
    previous = fifth.snapshot;
    if (fifth.kind !== "judge-reserved") return;
    const secondJudge = judgePort();
    const stalled = coordinator.dispatchJudge(fifth.permit, secondJudge.port, replanPort);
    expect(stalled.kind).toBe("REPAIR_STALLED");
    expect(secondJudge.requests[0]?.allowedRouteIds).toEqual(["repair-stalled"]);

    const status = coordinator.status(fifth.snapshot.qualityScopeId);
    expect(status).toMatchObject({
      outcome: "parked",
      stopReason: "REPAIR_STALLED",
      workflowExecutionState: "suspended",
      threshold: 2,
      replanSinceLastProgress: true,
    });
    expect(status?.resumeCondition.alternatives.map((item) => item.kind)).toEqual([
      "evidence-change",
      "human-retry",
    ]);
    expect(renderQualityRepairStatus(status!)).toContain("REPAIR_STALLED");

    const decodedEventTypes = repository.readTransactions().flatMap((transaction) =>
      decodeQualityRepairTransaction(JSON.stringify(transaction)).qualityEvents.map((event) => event.type)
    );
    expect(decodedEventTypes).toContain("QUALITY_REPLAN_RESERVED");
    expect(decodedEventTypes).toContain("QUALITY_REPLAN_RECORDED");
    expect(decodedEventTypes).toContain("REPAIR_STALLED");

    const before = repository.readTransactions().length;
    expect(coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace).kind).toBe("REPAIR_STALLED");
    expect(repository.readTransactions()).toHaveLength(before);
  });

  test("atomically resumes a new epoch with the exact human alternative and replays across coordinators", () => {
    const { activation, repository, coordinator } = runtime();
    let previous: QualityEvidenceSnapshot | null = null;
    const snapshots: ReturnType<typeof coordinator.recordEvidence>[] = [];
    for (let index = 0; index < 3; index += 1) {
      const result = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
      previous = result.snapshot;
      snapshots.push(result);
    }
    const firstJudge = judgePort();
    const firstThreshold = snapshots[2]!;
    if (firstThreshold.kind !== "judge-reserved") throw new Error("missing first threshold");
    coordinator.dispatchJudge(firstThreshold.permit, firstJudge.port, replanPort);
    for (let index = 0; index < 2; index += 1) {
      const result = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
      previous = result.snapshot;
      snapshots.push(result);
    }
    const stalledThreshold = snapshots.at(-1)!;
    if (stalledThreshold.kind !== "judge-reserved") throw new Error("missing stalled threshold");
    coordinator.dispatchJudge(stalledThreshold.permit, judgePort().port, replanPort);
    const status = coordinator.status(stalledThreshold.snapshot.qualityScopeId)!;
    const humanAlternative = status.resumeCondition.alternatives.find((item) => item.kind === "human-retry")!;

    expect(coordinator.resume({
      qualityScopeId: status.qualityScopeId,
      alternativeIdentity: "wrong-alternative",
      humanRetry: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "turn-1" },
    })).toMatchObject({ kind: "CONFLICT" });
    const resumed = coordinator.resume({
      qualityScopeId: status.qualityScopeId,
      alternativeIdentity: humanAlternative.identity,
      humanRetry: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "turn-1" },
    });
    expect(resumed.kind).toBe("resumed");
    if (resumed.kind !== "resumed") return;
    expect(resumed.projection.qualityEpochId).not.toBe(status.qualityEpochId);
    expect(resumed.projection.window).toEqual([]);

    const transaction = repository.readTransactions().at(-1)!;
    expect(transaction.qualityEvents.map((event) => event.type)).toContain("QUALITY_EPOCH_STARTED");
    expect(transaction.loopEventSets.flatMap((set) => set.events.map((event) => event.type))).toEqual([
      "LOOP_LATCH_CLEARED",
      "WORKFLOW_UNPARKED",
    ]);
    const decodedEpochStart = decodeQualityRepairTransaction(JSON.stringify(transaction));
    expect(decodedEpochStart.qualityEvents).toMatchObject([{
      type: "QUALITY_EPOCH_STARTED",
      priorQualityEpochId: status.qualityEpochId,
      satisfiedAlternativeIdentity: humanAlternative.identity,
    }]);
    const replayed = createQualityRepairCoordinator({ activation, repository });
    expect(replayed.status(status.qualityScopeId)?.qualityEpochId).toBe(resumed.projection.qualityEpochId);
  });

  test("reconciles before one attested no-effect successor and never admits attempt 2", () => {
    const { activation, repository, coordinator } = runtime();
    let previous: QualityEvidenceSnapshot | null = null;
    let thresholdResult: ReturnType<typeof coordinator.recordEvidence> | null = null;
    for (let index = 0; index < 3; index += 1) {
      thresholdResult = coordinator.recordEvidence(batch(activation.graph.graphRevision, previous), trace);
      previous = thresholdResult.snapshot;
    }
    if (thresholdResult?.kind !== "judge-reserved") throw new Error("missing threshold");
    const dispatchAttempts: number[] = [];
    const reconcileAttempts: number[] = [];
    const recoveryPort: QualityReplanPort = {
      dispatch(request) {
        dispatchAttempts.push(request.attemptNo);
        if (request.attemptNo === 0) return { kind: "accepted", operationRef: "operation-0" };
        return {
          kind: "completed",
          receipt: {
            judgeInvocationId: request.judgeInvocationId,
            planDigest: `sha256:${"f".repeat(64)}`,
            agentId: "repair-agent",
            contextId: "fresh-context-2",
          },
        };
      },
      reconcile(request) {
        reconcileAttempts.push(request.attemptNo);
        return { kind: "no-effect-confirmed", attestationId: "no-effect-0" };
      },
    };
    expect(coordinator.dispatchJudge(thresholdResult.permit, judgePort().port, recoveryPort).kind).toBe(
      "replan-pending",
    );
    expect(coordinator.resumeReplan(thresholdResult.snapshot.qualityScopeId, recoveryPort).kind).toBe("replanned");
    expect(dispatchAttempts).toEqual([0, 1]);
    expect(reconcileAttempts).toEqual([0]);
    expect(repository.readTransactions().flatMap((transaction) => transaction.qualityEvents)
      .filter((event) => event.type === "QUALITY_REPLAN_RESERVED")
      .map((event) => event.type === "QUALITY_REPLAN_RESERVED" ? event.attemptNo : -1)).toEqual([0, 1]);
  });

  test("round-trips canonical transactions into a fresh replay projection", () => {
    const { activation, repository, coordinator } = runtime();
    const observed = coordinator.recordEvidence(batch(activation.graph.graphRevision, null), trace);
    const encoded = JSON.stringify(repository.readTransactions()[0]);
    const decoded = decodeQualityRepairTransaction(encoded);
    const restored = createMemoryQualityRepairRepository({ initialTransactions: [decoded] });
    const replay = replayQualityRepairScope(restored, observed.snapshot.qualityScopeId);
    expect(replay.projection.latestSnapshot?.snapshotFingerprint).toBe(observed.snapshot.snapshotFingerprint);
    expect(replay.status.outcome).toBe("active");
    expect(replay.transactionCount).toBe(1);
    expect(() => decodeQualityRepairTransaction('{"schemaVersion":1}')).toThrow(
      "invalid-quality-repair-transaction",
    );
    const malformed = JSON.parse(encoded) as Record<string, unknown>;
    malformed.qualityEvents = [{ type: "QUALITY_SNAPSHOT_OBSERVED", projection: {} }];
    expect(() => decodeQualityRepairTransaction(JSON.stringify(malformed))).toThrow(
      "invalid-quality-repair-transaction",
    );
  });

  test("does not advance quality projection when the loop delivery is incomplete", () => {
    const contribution = createFirstPartyQualityContribution(2);
    const activation = resolveQualityPluginActivation({
      mode: "semi",
      projection: emptyQualityPluginProjection("intent-1"),
      contribution,
    });
    if (activation.kind !== "active") throw new Error("expected active contribution");
    const base = createMemoryQualityRepairRepository();
    const repository = {
      ...base,
      loopRepository: {
        ...base.loopRepository,
        transaction(): never {
          throw new Error("injected-loop-write-failure");
        },
      },
    };
    const coordinator = createQualityRepairCoordinator({ activation, repository });
    const result = coordinator.recordEvidence(batch(activation.graph.graphRevision, null), trace);
    expect(result).toMatchObject({ kind: "INCOMPLETE" });
    expect(repository.readTransactions()).toEqual([]);
  });

  test("fails closed when threshold reservation or its deterministic action is incomplete", () => {
    const thresholdActivation = resolveQualityPluginActivation({
      mode: "semi",
      projection: emptyQualityPluginProjection("intent-1"),
      contribution: createFirstPartyQualityContribution(2),
    });
    if (thresholdActivation.kind !== "active") throw new Error("expected active contribution");
    const thresholdBase = createMemoryQualityRepairRepository();
    let rejectThreshold = false;
    const thresholdRepository = {
      ...thresholdBase,
      loopRepository: {
        ...thresholdBase.loopRepository,
        transaction: ((partition, body) => {
          if (rejectThreshold) throw new Error("injected-threshold-write-failure");
          return thresholdBase.loopRepository.transaction(partition, body);
        }) as typeof thresholdBase.loopRepository.transaction,
      },
    };
    const thresholdCoordinator = createQualityRepairCoordinator({
      activation: thresholdActivation,
      repository: thresholdRepository,
    });
    const first = thresholdCoordinator.recordEvidence(batch(thresholdActivation.graph.graphRevision, null), trace);
    const second = thresholdCoordinator.recordEvidence(
      batch(thresholdActivation.graph.graphRevision, first.snapshot),
      trace,
    );
    rejectThreshold = true;
    expect(thresholdCoordinator.recordEvidence(
      batch(thresholdActivation.graph.graphRevision, second.snapshot),
      trace,
    )).toMatchObject({
      kind: "INCOMPLETE",
      reason: "quality-threshold-did-not-reserve-judge",
    });

    const actionBase = createMemoryQualityRepairRepository();
    let transactionCount = 0;
    const actionRepository = {
      ...actionBase,
      loopRepository: {
        ...actionBase.loopRepository,
        transaction: ((partition, body) => {
          transactionCount += 1;
          if (transactionCount === 2) throw new Error("injected-action-write-failure");
          return actionBase.loopRepository.transaction(partition, body);
        }) as typeof actionBase.loopRepository.transaction,
      },
    };
    const actionCoordinator = createQualityRepairCoordinator({
      activation: thresholdActivation,
      repository: actionRepository,
    });
    expect(actionCoordinator.recordEvidence(batch(thresholdActivation.graph.graphRevision, null), trace)).toMatchObject({
      kind: "INCOMPLETE",
      reason: "canonical-write-failed:injected-action-write-failure",
    });
    expect(actionRepository.readTransactions()).toHaveLength(1);
    expect(actionRepository.readTransactions()[0]?.qualityEvents).toEqual([]);
  });

  test("rejects conflicting repository history and preserves transaction boundaries", () => {
    const { activation, repository, coordinator } = runtime();
    const observed = coordinator.recordEvidence(batch(activation.graph.graphRevision, null), trace);
    const canonical = repository.readTransactions()[0]!;

    const duplicateHistory = createMemoryQualityRepairRepository({ initialTransactions: [canonical, canonical] });
    expect(duplicateHistory.readProjection(observed.snapshot.qualityScopeId)?.latestSnapshot?.snapshotFingerprint).toBe(
      observed.snapshot.snapshotFingerprint,
    );

    const conflictingTransaction: QualityRepairTransaction = { ...canonical, qualityEvents: [] };
    const conflictingHistory = createMemoryQualityRepairRepository({
      initialTransactions: [canonical, conflictingTransaction],
    });
    expect(() => conflictingHistory.readProjection(observed.snapshot.qualityScopeId)).toThrow(
      "quality-repair-transaction-conflict",
    );

    const wrongScopeTransaction: QualityRepairTransaction = { ...canonical, qualityScopeId: "wrong-scope" };
    const wrongScopeHistory = createMemoryQualityRepairRepository({ initialTransactions: [wrongScopeTransaction] });
    expect(() => wrongScopeHistory.readProjection("wrong-scope")).toThrow(
      "quality-repair-projection-scope-mismatch",
    );

    expect(repository.transaction("outer-scope", () =>
      repository.transaction("outer-scope", () => "same-scope"))).toBe("same-scope");
    expect(() => repository.transaction("outer-scope", () =>
      repository.transaction("inner-scope", () => "unreachable"))).toThrow(
      "quality-repair-nested-scope-mismatch",
    );

    const projection = repository.readProjection(observed.snapshot.qualityScopeId)!;
    const committedSet = canonical.loopEventSets[0]!;
    const before = repository.readTransactions().length;
    expect(repository.loopRepository.transaction(projection.partition, () => "empty")).toBe("empty");
    expect(repository.readTransactions()).toHaveLength(before);
    expect(repository.loopRepository.transaction(projection.partition, (_sets, append) => append(committedSet))).toMatchObject({
      eventSetId: committedSet.eventSetId,
    });
    expect(() => repository.loopRepository.transaction(projection.partition, (_sets, append) =>
      append({ ...committedSet, payloadFingerprint: `sha256:${"c".repeat(64)}` }))).toThrow(
      "quality-repair-loop-event-set-conflict",
    );
    expect(() => repository.loopRepository.transaction(projection.partition, (_sets, append) =>
      append({ ...committedSet, partitionKey: "wrong-partition" }))).toThrow(
      "quality-repair-loop-partition-mismatch",
    );

    const committedByHook: QualityRepairTransaction[] = [];
    let lockEntered = false;
    const hookedRepository = createMemoryQualityRepairRepository({
      initialTransactions: [],
      onCommit: (transaction) => committedByHook.push(transaction),
      transactionLock: (body) => {
        lockEntered = true;
        return body();
      },
    });
    hookedRepository.transaction(canonical.qualityScopeId, (append) => {
      for (const event of canonical.qualityEvents) append(event);
    });
    expect(lockEntered).toBe(true);
    expect(committedByHook).toHaveLength(1);
    expect(hookedRepository.readProjection(canonical.qualityScopeId)?.latestSnapshot).toEqual(observed.snapshot);
  });

  test("fails closed for stale and incomplete evidence without advancing durable state", () => {
    const { activation, repository, coordinator } = runtime();
    const first = coordinator.recordEvidence(batch(activation.graph.graphRevision, null), trace);
    const before = repository.readTransactions().length;
    const stale = {
      ...first.snapshot,
      snapshotFingerprint: `sha256:${"0".repeat(64)}`,
    };

    expect(coordinator.recordEvidence(batch(activation.graph.graphRevision, stale), trace)).toMatchObject({
      kind: "CONFLICT",
      reason: "quality-previous-snapshot-not-current",
      snapshot: first.snapshot,
    });
    expect(() => coordinator.recordEvidence({
      ...batch(activation.graph.graphRevision, null),
      observations: [],
    }, trace)).toThrow("quality-evidence-INCOMPLETE");
    expect(repository.readTransactions()).toHaveLength(before);
  });

  test("surfaces non-started Judge and bounded replan outcomes", () => {
    const pendingJudge = reachFirstThreshold();
    const notStartedPort: JudgePort = {
      dispatch: () => ({ kind: "not-started", reason: "judge-unavailable" }),
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    };
    expect(pendingJudge.coordinator.dispatchJudge(
      pendingJudge.threshold.permit,
      notStartedPort,
      replanPort,
    )).toEqual({ kind: "CONFLICT", reason: "quality-judge-route-not-replan" });

    const uncertainReplan = reachFirstThreshold();
    const effectPossiblePort: QualityReplanPort = {
      dispatch: () => ({ kind: "effect-possible", reason: "remote-state-uncertain" }),
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    };
    expect(uncertainReplan.coordinator.dispatchJudge(
      uncertainReplan.threshold.permit,
      judgePort().port,
      effectPossiblePort,
    )).toEqual({ kind: "AWAITING_HUMAN", reason: "quality-replan-effect-possible" });

    const boundedReplan = reachFirstThreshold();
    const noEffectPort: QualityReplanPort = {
      dispatch: (request) => ({ kind: "no-effect-confirmed", attestationId: `no-effect-${request.attemptNo}` }),
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    };
    expect(boundedReplan.coordinator.dispatchJudge(
      boundedReplan.threshold.permit,
      judgePort().port,
      noEffectPort,
    )).toEqual({ kind: "AWAITING_HUMAN", reason: "quality-replan-attempts-exhausted" });
  });

  test("rejects late replan outcomes after a concurrent reconciliation wins", () => {
    const lateCompletion = reachFirstThreshold();
    let reconciledKind = "not-run";
    const completionAfterReconcile: QualityReplanPort = {
      dispatch(request) {
        const reconciled = lateCompletion.coordinator.resumeReplan(request.qualityScopeId, {
          dispatch: () => ({ kind: "unknown", reason: "not-used" }),
          reconcile: (pending) => ({
            kind: "completed",
            receipt: {
              judgeInvocationId: pending.judgeInvocationId,
              planDigest: `sha256:${"1".repeat(64)}`,
              agentId: "reconcile-agent",
              contextId: "reconcile-context",
            },
          }),
        });
        reconciledKind = reconciled.kind;
        return {
          kind: "completed",
          receipt: {
            judgeInvocationId: request.judgeInvocationId,
            planDigest: `sha256:${"2".repeat(64)}`,
            agentId: "late-agent",
            contextId: "late-context",
          },
        };
      },
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    };
    expect(lateCompletion.coordinator.dispatchJudge(
      lateCompletion.threshold.permit,
      judgePort().port,
      completionAfterReconcile,
    )).toEqual({ kind: "CONFLICT", reason: "quality-replan-attempt-not-pending" });
    expect(reconciledKind).toBe("replanned");

    const lateNoEffect = reachFirstThreshold();
    const noEffectAfterReconcile: QualityReplanPort = {
      dispatch(request) {
        lateNoEffect.coordinator.resumeReplan(request.qualityScopeId, {
          dispatch: () => ({ kind: "unknown", reason: "not-used" }),
          reconcile: (pending) => ({
            kind: "completed",
            receipt: {
              judgeInvocationId: pending.judgeInvocationId,
              planDigest: `sha256:${"3".repeat(64)}`,
              agentId: "reconcile-agent",
              contextId: "reconcile-context",
            },
          }),
        });
        return { kind: "no-effect-confirmed", attestationId: "late-no-effect" };
      },
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    };
    expect(lateNoEffect.coordinator.dispatchJudge(
      lateNoEffect.threshold.permit,
      judgePort().port,
      noEffectAfterReconcile,
    )).toEqual({ kind: "CONFLICT", reason: "quality-replan-attempt-not-pending" });
  });

  test("fails closed when the Quality projection and Loop latch disagree", () => {
    const outOfOrder = reachFirstThreshold();
    outOfOrder.coordinator.dispatchJudge(outOfOrder.threshold.permit, judgePort().port, replanPort);
    let previous = outOfOrder.previous;
    let threshold: ReturnType<typeof outOfOrder.coordinator.recordEvidence> | null = null;
    for (let index = 0; index < 2; index += 1) {
      threshold = outOfOrder.coordinator.recordEvidence(
        batch(outOfOrder.activation.graph.graphRevision, previous),
        trace,
      );
      previous = threshold.snapshot;
    }
    if (threshold?.kind !== "judge-reserved") throw new Error("missing stalled threshold");
    const current = outOfOrder.repository.readProjection(threshold.snapshot.qualityScopeId)!;
    const alteredProjection = {
      ...current,
      lastProgress: { kind: "initial" as const, threshold: 2 },
    };
    outOfOrder.repository.transaction(current.qualityScopeId, (append) => append({
      type: "QUALITY_SNAPSHOT_OBSERVED",
      snapshotFingerprint: current.latestSnapshot!.snapshotFingerprint,
      progress: alteredProjection.lastProgress,
      projection: alteredProjection,
    }));
    expect(outOfOrder.coordinator.dispatchJudge(threshold.permit, judgePort().port, replanPort)).toEqual({
      kind: "CONFLICT",
      reason: "quality-stall-route-out-of-order",
    });

    const stalled = reachStalledRuntime();
    const qualityOnlyRepository = createMemoryQualityRepairRepository({
      initialTransactions: stalled.repository.readTransactions().map((transaction) => ({
        ...transaction,
        loopEventSets: [],
      })),
    });
    const qualityOnlyCoordinator = createQualityRepairCoordinator({
      activation: stalled.activation,
      repository: qualityOnlyRepository,
    });
    const humanAlternative = stalled.status.resumeCondition.alternatives.find((item) => item.kind === "human-retry")!;
    expect(qualityOnlyCoordinator.resume({
      qualityScopeId: stalled.status.qualityScopeId,
      alternativeIdentity: humanAlternative.identity,
      humanRetry: { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "recovery-turn" },
    })).toEqual({ kind: "CONFLICT", reason: "quality-loop-latch-clear-failed" });
  });

  test("rejects conflicting canonical Quality Repair transactions in the audit ledger", () => {
    const projectDir = createTestProject();
    try {
      const source = runtime();
      source.coordinator.recordEvidence(batch(source.activation.graph.graphRevision, null), trace);
      const canonical = source.repository.readTransactions()[0]!;
      const conflicting: QualityRepairTransaction = { ...canonical, qualityEvents: [] };
      const shard = seededAuditShard(projectDir);
      mkdirSync(dirname(shard), { recursive: true });
      const row = (transaction: QualityRepairTransaction, seq: number) => JSON.stringify({
        schemaVersion: 1,
        seq,
        cloneId: "quality-repair-test",
        intentId: "quality-repair-test",
        timestamp: `2026-08-04T00:00:0${seq}.000Z`,
        heading: "Quality Repair Transaction Committed",
        event: "QUALITY_REPAIR_TRANSACTION_COMMITTED",
        fields: { Transaction: JSON.stringify(transaction) },
      });
      writeFileSync(shard, `${row(canonical, 1)}\n${row(conflicting, 2)}\n`);

      expect(() => readQualityRepairTransactionsFromAudit(projectDir, DEFAULT_RECORD_DIR, "default")).toThrow(
        "invalid-quality-repair-audit-row:transaction-conflict",
      );
    } finally {
      cleanupTestProject(projectDir);
    }
  });

  test("validates every stalled-resume prerequisite before accepting improved evidence", () => {
    const empty = runtime();
    expect(empty.coordinator.status("missing-scope")).toBeNull();
    expect(empty.coordinator.resumeReplan("missing-scope", replanPort)).toEqual({
      kind: "CONFLICT",
      reason: "quality-replan-attempt-not-pending",
    });
    expect(empty.coordinator.resume({
      qualityScopeId: "missing-scope",
      alternativeIdentity: "missing-alternative",
    })).toEqual({ kind: "CONFLICT", reason: "quality-stalled-latch-not-found" });

    const stalled = reachStalledRuntime();
    const evidenceAlternative = stalled.status.resumeCondition.alternatives.find((item) =>
      item.kind === "evidence-change"
    )!;
    const humanAlternative = stalled.status.resumeCondition.alternatives.find((item) => item.kind === "human-retry")!;

    expect(stalled.coordinator.resume({
      qualityScopeId: stalled.status.qualityScopeId,
      alternativeIdentity: humanAlternative.identity,
      humanRetry: {
        verified: false,
        eventType: "HUMAN_TURN",
        actor: "human",
        turnId: "unverified-turn",
      } as unknown as VerifiedHumanTurn,
    })).toEqual({ kind: "CONFLICT", reason: "quality-human-retry-not-verified" });
    expect(stalled.coordinator.resume({
      qualityScopeId: stalled.status.qualityScopeId,
      alternativeIdentity: evidenceAlternative.identity,
    })).toEqual({ kind: "CONFLICT", reason: "quality-resume-evidence-missing" });
    expect(stalled.coordinator.resume({
      qualityScopeId: stalled.status.qualityScopeId,
      alternativeIdentity: evidenceAlternative.identity,
      evidence: { ...batch(stalled.activation.graph.graphRevision, stalled.previous), observations: [] },
    })).toMatchObject({ kind: "INCOMPLETE" });
    expect(stalled.coordinator.resume({
      qualityScopeId: stalled.status.qualityScopeId,
      alternativeIdentity: evidenceAlternative.identity,
      evidence: batch(stalled.activation.graph.graphRevision, stalled.previous),
    })).toEqual({ kind: "CONFLICT", reason: "quality-evidence-did-not-improve" });

    expect(stalled.coordinator.resume({
      qualityScopeId: stalled.status.qualityScopeId,
      alternativeIdentity: evidenceAlternative.identity,
      evidence: batch(stalled.activation.graph.graphRevision, stalled.previous, []),
    })).toEqual({ kind: "CONFLICT", reason: "quality-resume-trace-missing" });

    const resumed = stalled.coordinator.resume({
      qualityScopeId: stalled.status.qualityScopeId,
      alternativeIdentity: evidenceAlternative.identity,
      evidence: batch(stalled.activation.graph.graphRevision, stalled.previous, []),
      trace,
    });
    expect(resumed.kind).toBe("resumed");
    if (resumed.kind !== "resumed") throw new Error("expected evidence resume");
    expect(stalled.coordinator.status(stalled.status.qualityScopeId)).toMatchObject({
      outcome: "active",
      workflowExecutionState: "running",
    });
    const resumeTransaction = stalled.repository.readTransactions().at(-1)!;
    expect(resumeTransaction.loopEventSets.flatMap((set) => set.events.map((event) => event.type))).toEqual([
      "LOOP_LATCH_CLEARED",
      "WORKFLOW_UNPARKED",
      "LOOP_DELIVERY_OBSERVED",
    ]);
    expect(stalled.coordinator.recordEvidence({
      ...batch(stalled.activation.graph.graphRevision, null, []),
      epochStartEventIdentity: resumed.projection.epochStartEventIdentity,
    }, trace)).toMatchObject({ kind: "repair" });
  });

  test("resumes a stalled sensor obligation from a newly verified success receipt", () => {
    const instance = runtime();
    let previous: QualityEvidenceSnapshot | null = null;
    let threshold: ReturnType<typeof instance.coordinator.recordEvidence> | null = null;
    for (let index = 0; index < 3; index += 1) {
      threshold = instance.coordinator.recordEvidence(
        sensorBatch(instance.activation.graph.graphRevision, previous, "failed"),
        trace,
      );
      previous = threshold.snapshot;
    }
    if (threshold?.kind !== "judge-reserved") throw new Error("missing sensor replan threshold");
    instance.coordinator.dispatchJudge(threshold.permit, judgePort().port, replanPort);
    for (let index = 0; index < 2; index += 1) {
      threshold = instance.coordinator.recordEvidence(
        sensorBatch(instance.activation.graph.graphRevision, previous, "failed"),
        trace,
      );
      previous = threshold.snapshot;
    }
    if (threshold?.kind !== "judge-reserved") throw new Error("missing sensor stalled threshold");
    expect(instance.coordinator.dispatchJudge(threshold.permit, judgePort().port, replanPort).kind).toBe(
      "REPAIR_STALLED",
    );
    const status = instance.coordinator.status(threshold.snapshot.qualityScopeId);
    if (status === null) throw new Error("missing sensor stalled status");
    const evidenceAlternative = status.resumeCondition.alternatives.find((item) => item.kind === "evidence-change");
    if (evidenceAlternative === undefined) throw new Error("missing sensor evidence alternative");

    expect(instance.coordinator.resume({
      qualityScopeId: status.qualityScopeId,
      alternativeIdentity: evidenceAlternative.identity,
      evidence: sensorBatch(instance.activation.graph.graphRevision, previous, "passed"),
      trace,
    })).toMatchObject({ kind: "resumed" });
  });

  test("accepts a replacement verifier receipt while the unresolved set shrinks", () => {
    const instance = runtime();
    let previous: QualityEvidenceSnapshot | null = null;
    let threshold: ReturnType<typeof instance.coordinator.recordEvidence> | null = null;
    for (let index = 0; index < 3; index += 1) {
      threshold = instance.coordinator.recordEvidence(
        mixedSensorBatch(instance.activation.graph.graphRevision, previous, true, `sha256:${"4".repeat(64)}`),
        trace,
      );
      previous = threshold.snapshot;
    }
    if (threshold?.kind !== "judge-reserved") throw new Error("missing mixed sensor replan threshold");
    instance.coordinator.dispatchJudge(threshold.permit, judgePort().port, replanPort);
    for (let index = 0; index < 2; index += 1) {
      threshold = instance.coordinator.recordEvidence(
        mixedSensorBatch(instance.activation.graph.graphRevision, previous, true, `sha256:${"4".repeat(64)}`),
        trace,
      );
      previous = threshold.snapshot;
    }
    if (threshold?.kind !== "judge-reserved") throw new Error("missing mixed sensor stalled threshold");
    expect(instance.coordinator.dispatchJudge(threshold.permit, judgePort().port, replanPort).kind).toBe(
      "REPAIR_STALLED",
    );
    const status = instance.coordinator.status(threshold.snapshot.qualityScopeId);
    if (status === null) throw new Error("missing mixed sensor stalled status");
    const evidenceAlternative = status.resumeCondition.alternatives.find((item) => item.kind === "evidence-change");
    if (evidenceAlternative === undefined) throw new Error("missing mixed sensor evidence alternative");

    expect(instance.coordinator.resume({
      qualityScopeId: status.qualityScopeId,
      alternativeIdentity: evidenceAlternative.identity,
      evidence: mixedSensorBatch(
        instance.activation.graph.graphRevision,
        previous,
        false,
        `sha256:${"5".repeat(64)}`,
      ),
      trace,
    })).toMatchObject({ kind: "resumed" });
  });
});
