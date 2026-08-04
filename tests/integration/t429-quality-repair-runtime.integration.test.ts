// covers: file:packages/framework/core/tools/amadeus-quality-repair-runtime.ts, audit:QUALITY_REPAIR_TRANSACTION_COMMITTED
// size: medium

import { describe, expect, test } from "bun:test";

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
  type QualityReplanPort,
} from "../../packages/framework/core/tools/amadeus-quality-repair-runtime.ts";
import {
  decodeQualityRepairTransaction,
  replayQualityRepairScope,
} from "../../packages/framework/core/tools/amadeus-quality-repair-replay.ts";
import type {
  JudgeDispatchRequest,
  JudgePort,
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
      humanRetry: { verified: true, eventType: "HUMAN_TURN", turnId: "turn-1" },
    })).toMatchObject({ kind: "CONFLICT" });
    const resumed = coordinator.resume({
      qualityScopeId: status.qualityScopeId,
      alternativeIdentity: humanAlternative.identity,
      humanRetry: { verified: true, eventType: "HUMAN_TURN", turnId: "turn-1" },
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
    const replayed = createQualityRepairCoordinator({ activation, repository });
    expect(replayed.status(status.qualityScopeId)?.qualityEpochId).toBe(resumed.projection.qualityEpochId);
  });

  test("reuses the generic committed live authorization seam", () => {
    const { activation, repository, coordinator } = runtime();
    const first = coordinator.recordEvidence(batch(activation.graph.graphRevision, null), trace);
    const denied = coordinator.authorizeLiveSmoke(first.snapshot.qualityScopeId, `sha256:${"e".repeat(64)}`, {
      authorize: () => ({ authorized: false, reason: "not-authorized" }),
    });
    expect(denied).toMatchObject({ kind: "CONFLICT" });
    const authorized = coordinator.authorizeLiveSmoke(first.snapshot.qualityScopeId, `sha256:${"e".repeat(64)}`, {
      authorize: () => ({ authorized: true, authorizationId: "authorization-1", actorId: "human-1" }),
    });
    expect(authorized.kind).toBe("authorized");
    expect(repository.readTransactions().at(-1)?.loopEventSets[0]?.events[0]?.type).toBe("LIVE_SMOKE_AUTHORIZED");
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
});
