// covers: execution-observability:ExecutionLifecycleCoordinator execution-observability:StartPermit
// size: small

import { describe, expect, test } from "bun:test";
import {
  createExecutionContract,
  type AttemptStart,
  type Clock,
  type ExecutionContract,
} from "../../packages/framework/core/tools/amadeus-execution-contract.ts";
import { createBudgetPolicy } from "../../packages/framework/core/tools/amadeus-convergence-policy.ts";
import {
  createExecutionLifecycleCoordinator,
  createMemoryExecutionRepository,
  type ExecutionEventSet,
  type ExecutionLifecycleCoordinator,
  type ExecutionProjectionSink,
  type ExecutionRepository,
} from "../../packages/framework/core/tools/amadeus-execution-lifecycle.ts";

function fixedClock(): Clock {
  return {
    wallNow: () => "2026-08-02T00:00:00.000Z",
    monotonicNowMs: () => 100,
  };
}

const origin = {
  stage: "code-generation",
  agent: "amadeus-developer-agent",
  tool: "amadeus-orchestrate",
} as const;

const unitAttemptPolicyResult = createBudgetPolicy({
  kind: "unit-attempt",
  effectiveCap: 20,
  hardCap: 20,
  configVersion: "test-v1",
});
if (!unitAttemptPolicyResult.ok) throw new Error("test budget policy is invalid");
const unitAttemptBudget = {
  policy: unitAttemptPolicyResult.value,
  lastDurableProgress: "operation-started",
} as const;

function rootRequest() {
  return {
    idempotencyKey: "root-key",
    input: {
      intentUuid: "intent-1",
      stageSlug: "code-generation",
      stageInstanceId: "unit-a",
      revision: 1,
      kind: "stage",
      origin,
    },
  };
}

function passingProjection(): ExecutionProjectionSink {
  return {
    projectRequired(eventSet) {
      return {
        digest: eventSet.digest,
        stateProjectionReceiptId: `state-${eventSet.digest}`,
        runtimeProjectionReceiptId: `runtime-${eventSet.digest}`,
      };
    },
    rebuildRequired() {
      throw new Error("not used");
    },
    projectTelemetry() {
      return { projected: true };
    },
  };
}

function repositoryFrom(
  initial: readonly ExecutionEventSet[],
  failAppend = false,
): ExecutionRepository {
  const sets = [...initial];
  return {
    transaction(body) {
      return body(sets, (set) => {
        if (failAppend) throw new Error("injected canonical append failure");
        sets.push(set);
      });
    },
    readEventSets() {
      return [...sets];
    },
  };
}

function coordinatorFor(
  repository: ExecutionRepository,
  options: {
    projectionSink?: ExecutionProjectionSink;
    contract?: ExecutionContract;
  } = {},
): ExecutionLifecycleCoordinator {
  return createExecutionLifecycleCoordinator({
    clock: fixedClock(),
    repository,
    projectionSink: options.projectionSink ?? passingProjection(),
    contract: options.contract,
  });
}

function requireRoot(
  coordinator: ExecutionLifecycleCoordinator,
  idempotencyKey = "root-key",
) {
  const started = coordinator.startOperation({ ...rootRequest(), idempotencyKey });
  if (!started.ok) throw new Error("root start failed");
  return started;
}

function requireReservation(
  coordinator: ExecutionLifecycleCoordinator,
  operationId: string,
  ordinal = 1,
) {
  const reserved = coordinator.reserveExecution({
    operationId,
    idempotencyKey: `reserve-${ordinal}`,
    budgetKind: "unit-attempt",
    subjectId: "unit-a",
    semanticAttemptOrdinal: ordinal,
    ...unitAttemptBudget,
  });
  if (!reserved.ok) throw new Error("reservation failed");
  return reserved.value;
}

function requireClaim(
  coordinator: ExecutionLifecycleCoordinator,
  reservationId: string,
  idempotencyKey = "claim-key",
) {
  const claimed = coordinator.claimDispatch(reservationId, idempotencyKey);
  if (claimed.kind !== "claimed") throw new Error("claim failed");
  return claimed;
}

function requireConfirmation(
  coordinator: ExecutionLifecycleCoordinator,
  reservationId: string,
  idempotencyKey = "confirm-key",
) {
  const confirmed = coordinator.confirmDispatch({
    reservationId,
    idempotencyKey,
    attemptOrdinal: 1,
    nativeHandle: { state: "available", value: "native-1" },
    dispatchEvidence: { state: "available", value: "accepted" },
  });
  if (!confirmed.ok) throw new Error("confirmation failed");
  return confirmed.value;
}

describe("audit-first lifecycle", () => {
  test("same key and semantic payload returns the canonical receipt without new events", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    const first = coordinator.startOperation(rootRequest());
    const replays = Array.from({ length: 10 }, () =>
      coordinator.startOperation(rootRequest()),
    );
    expect(first.ok).toBe(true);
    expect(replays.every((replay) => JSON.stringify(replay) === JSON.stringify(first))).toBe(
      true,
    );
    expect(repository.readEventSets()).toHaveLength(1);
  });

  test("process restart reuses the same nonterminal root despite a later observed wall time", () => {
    let wall = "2026-08-02T00:00:00.000Z";
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: {
        wallNow: () => wall,
        monotonicNowMs: () => 100,
      },
      repository,
      projectionSink: passingProjection(),
    });
    const first = coordinator.startOperation(rootRequest());
    wall = "2026-08-02T00:05:00.000Z";
    const resumed = coordinator.startOperation({
      ...rootRequest(),
      idempotencyKey: "root-key-after-restart",
    });
    expect(first.ok).toBe(true);
    expect(resumed.ok).toBe(true);
    if (!first.ok || !resumed.ok) throw new Error("root start failed");
    expect(resumed.value.operation.operationId).toBe(first.value.operation.operationId);
    expect(resumed.value.canonicalCommitReceiptId).toBe(
      first.value.canonicalCommitReceiptId,
    );
    expect(repository.readEventSets()).toHaveLength(1);
  });

  test("same key with a different semantic payload is a typed conflict", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    expect(coordinator.startOperation(rootRequest()).ok).toBe(true);
    const conflict = coordinator.startOperation({
      ...rootRequest(),
      input: { ...rootRequest().input, revision: 2 },
    });
    expect(conflict).toEqual({
      ok: false,
      error: { kind: "idempotency-conflict", persisted: false },
    });
    expect(repository.readEventSets()).toHaveLength(1);
  });

  test("canonical write failure is loud and is never written back into the same journal", () => {
    const repository = createMemoryExecutionRepository({ failAppend: true });
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    expect(coordinator.startOperation(rootRequest())).toEqual({
      ok: false,
      error: { kind: "canonical-write-failed", persisted: false },
    });
    expect(repository.readEventSets()).toEqual([]);
  });
});

describe("reservation, dispatch and permit barrier", () => {
  test("reservation and claim retries replay their original snapshots and claim receipt", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    const started = coordinator.startOperation(rootRequest());
    if (!started.ok) throw new Error("start failed");
    const reserveRequest = {
      operationId: started.value.operation.operationId,
      idempotencyKey: "reserve-replay",
      budgetKind: "unit-attempt" as const,
      subjectId: "unit-a",
      semanticAttemptOrdinal: 1,
      ...unitAttemptBudget,
    };
    const reserved = coordinator.reserveExecution(reserveRequest);
    if (!reserved.ok) throw new Error("reserve failed");
    const claimed = coordinator.claimDispatch(reserved.value.reservationId, "claim-replay");
    if (claimed.kind !== "claimed") throw new Error("claim failed");

    const confirmed = coordinator.confirmDispatch({
      reservationId: reserved.value.reservationId,
      idempotencyKey: "confirm-replay",
      attemptOrdinal: 1,
      nativeHandle: { state: "available", value: "native-1" },
      dispatchEvidence: { state: "available", value: "accepted" },
    });
    expect(confirmed.ok).toBe(true);

    expect(coordinator.reserveExecution(reserveRequest)).toEqual(reserved);
    expect(
      coordinator.claimDispatch(reserved.value.reservationId, "claim-replay"),
    ).toEqual({
      kind: "idempotent",
      reservation: claimed.reservation,
      canonicalCommitReceiptId: claimed.canonicalCommitReceiptId,
      eventSetDigest: claimed.eventSetDigest,
    });
  });

  test("native dispatch cannot receive a permit until canonical/state/runtime receipts share one digest", () => {
    const repository = createMemoryExecutionRepository();
    const projectionSink: ExecutionProjectionSink = {
      ...passingProjection(),
      projectRequired() {
        throw new Error("runtime projection unavailable");
      },
    };
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink,
    });
    const started = coordinator.startOperation(rootRequest());
    if (!started.ok) throw new Error("start failed");
    const reserved = coordinator.reserveExecution({
      operationId: started.value.operation.operationId,
      idempotencyKey: "reserve-key",
      budgetKind: "unit-attempt",
      subjectId: "unit-a",
      semanticAttemptOrdinal: 1,
      ...unitAttemptBudget,
    });
    if (!reserved.ok) throw new Error("reserve failed");
    const claimed = coordinator.claimDispatch(reserved.value.reservationId, "claim-key");
    if (claimed.kind !== "claimed") throw new Error("claim failed");
    const permit = coordinator.issueStartPermit({
      reservationId: reserved.value.reservationId,
      canonicalCommitReceiptId: claimed.canonicalCommitReceiptId,
    });
    expect(permit).toEqual({
      ok: false,
      error: { kind: "projection-pending-rebuild", persisted: true },
    });
    expect(repository.readEventSets().length).toBeGreaterThan(0);
  });

  test("a complete barrier issues all four receipts for the same event-set digest", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    const started = coordinator.startOperation(rootRequest());
    if (!started.ok) throw new Error("start failed");
    const reserved = coordinator.reserveExecution({
      operationId: started.value.operation.operationId,
      idempotencyKey: "reserve-key",
      budgetKind: "unit-attempt",
      subjectId: "unit-a",
      semanticAttemptOrdinal: 1,
      ...unitAttemptBudget,
    });
    if (!reserved.ok) throw new Error("reserve failed");
    const claimed = coordinator.claimDispatch(reserved.value.reservationId, "claim-key");
    if (claimed.kind !== "claimed") throw new Error("claim failed");
    const permit = coordinator.issueStartPermit({
      reservationId: reserved.value.reservationId,
      canonicalCommitReceiptId: claimed.canonicalCommitReceiptId,
    });
    expect(permit.ok).toBe(true);
    if (!permit.ok) throw new Error("permit failed");
    expect(permit.value).toMatchObject({
      reservationId: reserved.value.reservationId,
      canonicalCommitReceiptId: claimed.canonicalCommitReceiptId,
    });
    expect(permit.value.stateProjectionReceiptId).toContain(claimed.eventSetDigest);
    expect(permit.value.runtimeProjectionReceiptId).toContain(claimed.eventSetDigest);
  });
});

describe("recovery and terminal boundaries", () => {
  test("a root cannot finish over a live child and terminal rerun requires a superseding root", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    const root = coordinator.startOperation(rootRequest());
    if (!root.ok) throw new Error("root failed");
    const child = coordinator.startOperation({
      idempotencyKey: "child-key",
      parent: root.value.operation,
      childInput: {
        childKind: "tool",
        semanticSubjectId: "sensor-validation",
        childOrdinal: 1,
        origin,
      },
    });
    if (!child.ok) throw new Error("child failed");

    expect(
      coordinator.finishOperation({
        idempotencyKey: "root-finish-too-early",
        start: root.value.start,
        outcome: { outcome: "succeeded", terminationReason: "completed" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
    expect(
      coordinator.finishOperation({
        idempotencyKey: "child-finish",
        start: child.value.start,
        outcome: { outcome: "succeeded", terminationReason: "completed" },
      }).ok,
    ).toBe(true);
    expect(
      coordinator.finishOperation({
        idempotencyKey: "root-finish",
        start: root.value.start,
        outcome: { outcome: "succeeded", terminationReason: "completed" },
      }).ok,
    ).toBe(true);

    expect(
      coordinator.startOperation({ ...rootRequest(), idempotencyKey: "terminal-rerun" }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
    expect(
      coordinator.startOperation({
        idempotencyKey: "redo-root",
        input: {
          ...rootRequest().input,
          revision: 2,
          supersedesOperationId: root.value.operation.operationId,
        },
      }).ok,
    ).toBe(true);
  });

  test("claimed recovery distinguishes confirmed no-effect from unsafe unknown effect", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    const root = coordinator.startOperation(rootRequest());
    if (!root.ok) throw new Error("root failed");
    const reserve = (ordinal: number) =>
      coordinator.reserveExecution({
        operationId: root.value.operation.operationId,
        idempotencyKey: `reserve-${ordinal}`,
        budgetKind: "unit-attempt",
        subjectId: "unit-a",
        semanticAttemptOrdinal: ordinal,
        ...unitAttemptBudget,
      });

    const safe = reserve(1);
    if (!safe.ok) throw new Error("reserve failed");
    expect(coordinator.claimDispatch(safe.value.reservationId, "claim-1").kind).toBe(
      "claimed",
    );
    const notStarted = coordinator.reconcileDispatch({
      reservationId: safe.value.reservationId,
      idempotencyKey: "reconcile-1",
      attemptOrdinal: 1,
      effect: "no-effect-confirmed",
    });
    expect(notStarted.ok && notStarted.value.attempt.outcome).toBe(
      "dispatch-not-started",
    );
    const count = repository.readEventSets().length;
    expect(
      coordinator.reconcileDispatch({
        reservationId: safe.value.reservationId,
        idempotencyKey: "reconcile-1",
        attemptOrdinal: 1,
        effect: "no-effect-confirmed",
      }),
    ).toEqual(notStarted);
    expect(repository.readEventSets()).toHaveLength(count);

    const unsafe = reserve(2);
    if (!unsafe.ok) throw new Error("reserve failed");
    expect(coordinator.claimDispatch(unsafe.value.reservationId, "claim-2").kind).toBe(
      "claimed",
    );
    const unknown = coordinator.reconcileDispatch({
      reservationId: unsafe.value.reservationId,
      idempotencyKey: "reconcile-2",
      attemptOrdinal: 2,
      effect: "unknown",
    });
    expect(unknown.ok && unknown.value.attempt.outcome).toBe(
      "dispatch-effect-unknown",
    );
  });

  test("dispatch confirmation and attempt completion are replay-safe but reject changed handles and terminal rewrites", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = createExecutionLifecycleCoordinator({
      clock: fixedClock(),
      repository,
      projectionSink: passingProjection(),
    });
    const root = coordinator.startOperation(rootRequest());
    if (!root.ok) throw new Error("root failed");
    const reserved = coordinator.reserveExecution({
      operationId: root.value.operation.operationId,
      idempotencyKey: "reserve-confirm",
      budgetKind: "unit-attempt",
      subjectId: "unit-a",
      semanticAttemptOrdinal: 1,
      ...unitAttemptBudget,
    });
    if (!reserved.ok) throw new Error("reserve failed");
    expect(coordinator.claimDispatch(reserved.value.reservationId, "claim-confirm").kind).toBe(
      "claimed",
    );
    const confirmation = {
      reservationId: reserved.value.reservationId,
      idempotencyKey: "confirm",
      attemptOrdinal: 1,
      nativeHandle: { state: "available", value: "native-1" } as const,
      dispatchEvidence: { state: "available", value: "accepted" } as const,
    };
    const confirmed = coordinator.confirmDispatch(confirmation);
    expect(confirmed.ok).toBe(true);
    expect(coordinator.confirmDispatch(confirmation)).toEqual(confirmed);
    expect(
      coordinator.confirmDispatch({
        ...confirmation,
        nativeHandle: { state: "available", value: "native-2" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "idempotency-conflict", persisted: false },
    });
    if (!confirmed.ok) throw new Error("confirmation failed");

    const finish = {
      idempotencyKey: "finish-attempt",
      start: confirmed.value.attemptStart,
      outcome: { outcome: "succeeded", terminationReason: "completed" } as const,
    };
    const finished = coordinator.finishAttempt(finish);
    expect(finished.ok).toBe(true);
    expect(coordinator.finishAttempt(finish)).toEqual(finished);
    expect(
      coordinator.finishAttempt({ ...finish, idempotencyKey: "rewrite-terminal-attempt" }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
  });
});

describe("defensive lifecycle branches", () => {
  test("baseline facts are attached and malformed child or duplicate proposals are refused", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    const baseline = {
      baselineRunId: "baseline-1",
      workloadId: "workload-1",
      workloadVersion: "v1",
      inputDigest: "input-1",
      observedGitSha: { state: "available", value: "abc123" } as const,
      startCriteria: { state: "available", value: "stage-started" } as const,
      expectedEndCriteria: { state: "available", value: "stage-completed" } as const,
      actualEndCriteria: { state: "incomplete", missingFields: ["actualEnd"] } as const,
      status: "running" as const,
    };
    const root = coordinator.startOperation({ ...rootRequest(), baseline });
    if (!root.ok) throw new Error("root failed");
    expect(repository.readEventSets()[0].events[0]).toMatchObject({
      type: "operation-started",
      baseline: {
        ...baseline,
        rootOperationId: root.value.operation.operationId,
      },
    });

    expect(
      coordinator.startOperation({
        idempotencyKey: "child-wrong-root",
        parent: {
          operationId: root.value.operation.operationId,
          rootOperationId: "wrong-root",
        },
        childInput: {
          childKind: "tool",
          semanticSubjectId: "sensor-validation",
          childOrdinal: 1,
          origin,
        },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });

    const baseContract = createExecutionContract();
    const duplicateContract: ExecutionContract = {
      ...baseContract,
      beginRootProposal() {
        return {
          operation: { ...root.value.operation, status: "proposed" },
          observedStart: {
            wall: "2026-08-02T00:00:00.000Z",
            monotonicMs: 100,
          },
        };
      },
    };
    expect(
      coordinatorFor(repository, { contract: duplicateContract }).startOperation({
        idempotencyKey: "duplicate-proposal",
        input: { ...rootRequest().input, stageInstanceId: "unit-b" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
  });

  test("reservation rejects conflicts, corrupted replays, missing or terminal operations, and append failure", () => {
    expect(
      coordinatorFor(createMemoryExecutionRepository()).reserveExecution({
        operationId: "missing-operation",
        idempotencyKey: "missing-reservation",
        budgetKind: "unit-attempt",
        subjectId: "unit-a",
        semanticAttemptOrdinal: 1,
        ...unitAttemptBudget,
      }),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });

    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    const root = requireRoot(coordinator);
    const reserved = requireReservation(coordinator, root.value.operation.operationId);
    expect(
      coordinator.reserveExecution({
        operationId: root.value.operation.operationId,
        idempotencyKey: "reserve-1",
        budgetKind: "unit-attempt",
        subjectId: "unit-b",
        semanticAttemptOrdinal: 1,
        ...unitAttemptBudget,
      }),
    ).toEqual({
      ok: false,
      error: { kind: "idempotency-conflict", persisted: false },
    });

    const sets = repository.readEventSets();
    const reserveSet = sets.at(-1)!;
    expect(
      coordinatorFor(repositoryFrom([
        ...sets.slice(0, -1),
        { ...reserveSet, events: [] },
      ])).reserveExecution({
        operationId: root.value.operation.operationId,
        idempotencyKey: "reserve-1",
        budgetKind: "unit-attempt",
        subjectId: "unit-a",
        semanticAttemptOrdinal: 1,
        ...unitAttemptBudget,
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });

    expect(
      coordinator.finishOperation({
        idempotencyKey: "finish-before-reserve",
        start: root.value.start,
        outcome: { outcome: "succeeded", terminationReason: "completed" },
      }).ok,
    ).toBe(true);
    expect(
      coordinator.reserveExecution({
        operationId: root.value.operation.operationId,
        idempotencyKey: "reserve-terminal",
        budgetKind: "unit-attempt",
        subjectId: "unit-a",
        semanticAttemptOrdinal: 2,
        ...unitAttemptBudget,
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });

    const liveSets = sets.slice(0, 1);
    expect(
      coordinatorFor(repositoryFrom(liveSets, true)).reserveExecution({
        operationId: root.value.operation.operationId,
        idempotencyKey: "reserve-append-failure",
        budgetKind: "unit-attempt",
        subjectId: "unit-a",
        semanticAttemptOrdinal: 3,
        ...unitAttemptBudget,
      }),
    ).toEqual({
      ok: false,
      error: { kind: "canonical-write-failed", persisted: false },
    });
    expect(reserved.dispatchState).toBe("reserved");
  });

  test("claim rejects conflicting replays, malformed events, repeated transitions, and append failure", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    const root = requireRoot(coordinator);
    const first = requireReservation(coordinator, root.value.operation.operationId, 1);
    const second = requireReservation(coordinator, root.value.operation.operationId, 2);
    requireClaim(coordinator, first.reservationId, "claim-shared");

    expect(coordinator.claimDispatch(second.reservationId, "claim-shared")).toEqual({
      kind: "conflict",
    });
    expect(coordinator.claimDispatch(first.reservationId, "claim-again")).toEqual({
      kind: "invalid-transition",
    });

    const claimedSets = repository.readEventSets();
    const claimSet = claimedSets.find((set) => set.idempotencyKey === "claim-shared")!;
    expect(
      coordinatorFor(repositoryFrom(
        claimedSets.map((set) =>
          set === claimSet ? { ...set, events: [] } : set,
        ),
      )).claimDispatch(first.reservationId, "claim-shared"),
    ).toEqual({ kind: "invalid-transition" });

    const beforeClaim = claimedSets.filter((set) => set.idempotencyKey !== "claim-shared");
    expect(
      coordinatorFor(repositoryFrom(beforeClaim, true)).claimDispatch(
        first.reservationId,
        "claim-append-failure",
      ),
    ).toEqual({ kind: "canonical-write-failed" });
  });

  test("confirmation rejects absent, unclaimed, malformed and orphaned reservations plus append failure", () => {
    const request = {
      reservationId: "missing-reservation",
      idempotencyKey: "confirm-missing",
      attemptOrdinal: 1,
      nativeHandle: { state: "available", value: "native-1" } as const,
      dispatchEvidence: { state: "available", value: "accepted" } as const,
    };
    expect(
      coordinatorFor(createMemoryExecutionRepository()).confirmDispatch(request),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });

    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    const root = requireRoot(coordinator);
    const reserved = requireReservation(coordinator, root.value.operation.operationId);
    expect(
      coordinator.confirmDispatch({
        ...request,
        reservationId: reserved.reservationId,
        idempotencyKey: "confirm-unclaimed",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
    requireClaim(coordinator, reserved.reservationId);
    requireConfirmation(coordinator, reserved.reservationId);

    const confirmedSets = repository.readEventSets();
    const confirmationSet = confirmedSets.at(-1)!;
    expect(
      coordinatorFor(repositoryFrom([
        ...confirmedSets.slice(0, -1),
        {
          ...confirmationSet,
          events: confirmationSet.events.filter(
            (event) => event.type === "reservation-updated",
          ),
        },
      ])).confirmDispatch({
        ...request,
        reservationId: reserved.reservationId,
        idempotencyKey: "confirm-key",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });

    const claimedSets = confirmedSets.slice(0, -1);
    const orphanedSets = claimedSets.map((set) => ({
      ...set,
      events: set.events.filter((event) => event.type !== "operation-started"),
    }));
    expect(
      coordinatorFor(repositoryFrom(orphanedSets)).confirmDispatch({
        ...request,
        reservationId: reserved.reservationId,
        idempotencyKey: "confirm-orphaned",
      }),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });
    expect(
      coordinatorFor(repositoryFrom(claimedSets, true)).confirmDispatch({
        ...request,
        reservationId: reserved.reservationId,
        idempotencyKey: "confirm-append-failure",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "canonical-write-failed", persisted: false },
    });
  });

  test("reconciliation rejects conflicts, malformed replay, invalid state, orphan state, and append failure", () => {
    const missingRequest = {
      reservationId: "missing-reservation",
      idempotencyKey: "reconcile-missing",
      attemptOrdinal: 1,
      effect: "unknown" as const,
    };
    expect(
      coordinatorFor(createMemoryExecutionRepository()).reconcileDispatch(
        missingRequest,
      ),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });

    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    const root = requireRoot(coordinator);
    const reserved = requireReservation(coordinator, root.value.operation.operationId);
    expect(
      coordinator.reconcileDispatch({
        ...missingRequest,
        reservationId: reserved.reservationId,
        idempotencyKey: "reconcile-reserved",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
    requireClaim(coordinator, reserved.reservationId);
    const reconciled = coordinator.reconcileDispatch({
      reservationId: reserved.reservationId,
      idempotencyKey: "reconcile-valid",
      attemptOrdinal: 1,
      effect: "unknown",
    });
    expect(reconciled.ok).toBe(true);
    expect(
      coordinator.reconcileDispatch({
        reservationId: reserved.reservationId,
        idempotencyKey: "reconcile-valid",
        attemptOrdinal: 1,
        effect: "no-effect-confirmed",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "idempotency-conflict", persisted: false },
    });

    const reconciledSets = repository.readEventSets();
    const reconciliationSet = reconciledSets.at(-1)!;
    expect(
      coordinatorFor(repositoryFrom([
        ...reconciledSets.slice(0, -1),
        {
          ...reconciliationSet,
          events: reconciliationSet.events.filter(
            (event) => event.type !== "attempt-finished",
          ),
        },
      ])).reconcileDispatch({
        reservationId: reserved.reservationId,
        idempotencyKey: "reconcile-valid",
        attemptOrdinal: 1,
        effect: "unknown",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });

    const claimedSets = reconciledSets.slice(0, -1);
    const orphanedSets = claimedSets.map((set) => ({
      ...set,
      events: set.events.filter((event) => event.type !== "operation-started"),
    }));
    expect(
      coordinatorFor(repositoryFrom(orphanedSets)).reconcileDispatch({
        reservationId: reserved.reservationId,
        idempotencyKey: "reconcile-orphaned",
        attemptOrdinal: 1,
        effect: "unknown",
      }),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });
    expect(
      coordinatorFor(repositoryFrom(claimedSets, true)).reconcileDispatch({
        reservationId: reserved.reservationId,
        idempotencyKey: "reconcile-append-failure",
        attemptOrdinal: 1,
        effect: "unknown",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "canonical-write-failed", persisted: false },
    });
  });

  test("start permits reject missing receipts, wrong reservation state, and digest mismatch", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    expect(
      coordinator.issueStartPermit({
        reservationId: "missing-reservation",
        canonicalCommitReceiptId: "missing-receipt",
      }),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });

    const root = requireRoot(coordinator);
    const reserved = requireReservation(coordinator, root.value.operation.operationId);
    expect(
      coordinator.issueStartPermit({
        reservationId: reserved.reservationId,
        canonicalCommitReceiptId: root.value.canonicalCommitReceiptId,
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
    const claimed = requireClaim(coordinator, reserved.reservationId);
    const mismatch = coordinatorFor(repository, {
      projectionSink: {
        ...passingProjection(),
        projectRequired() {
          return {
            digest: "wrong-digest",
            stateProjectionReceiptId: "state-wrong",
            runtimeProjectionReceiptId: "runtime-wrong",
          };
        },
      },
    }).issueStartPermit({
      reservationId: reserved.reservationId,
      canonicalCommitReceiptId: claimed.canonicalCommitReceiptId,
    });
    expect(mismatch).toEqual({
      ok: false,
      error: { kind: "digest-mismatch", persisted: true },
    });
  });

  test("attempt finish rejects missing, conflicting and malformed state plus append failure", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    const root = requireRoot(coordinator);
    const reserved = requireReservation(coordinator, root.value.operation.operationId);
    requireClaim(coordinator, reserved.reservationId);
    const confirmation = requireConfirmation(coordinator, reserved.reservationId);
    const finishRequest = {
      idempotencyKey: "finish-attempt-defensive",
      start: confirmation.attemptStart,
      outcome: { outcome: "succeeded", terminationReason: "completed" } as const,
    };
    expect(
      coordinatorFor(createMemoryExecutionRepository()).finishAttempt(finishRequest),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });
    expect(coordinator.finishAttempt(finishRequest).ok).toBe(true);
    expect(
      coordinator.finishAttempt({
        ...finishRequest,
        outcome: { outcome: "failed", terminationReason: "changed" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "idempotency-conflict", persisted: false },
    });

    const finishedSets = repository.readEventSets();
    const finishSet = finishedSets.at(-1)!;
    expect(
      coordinatorFor(repositoryFrom([
        ...finishedSets.slice(0, -1),
        {
          ...finishSet,
          events: finishSet.events.filter(
            (event) => event.type !== "attempt-finished",
          ),
        },
      ])).finishAttempt(finishRequest),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });
    expect(
      coordinatorFor(repositoryFrom(finishedSets.slice(0, -1), true)).finishAttempt({
        ...finishRequest,
        idempotencyKey: "finish-attempt-append-failure",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "canonical-write-failed", persisted: false },
    });
  });

  test("operation finish rejects missing, open-attempt, conflicting and malformed state plus append failure", () => {
    const repository = createMemoryExecutionRepository();
    const coordinator = coordinatorFor(repository);
    const root = requireRoot(coordinator);
    const missingStart = {
      operation: { ...root.value.start.operation, operationId: "missing-operation" },
      observedStart: root.value.start.observedStart,
    };
    expect(
      coordinator.finishOperation({
        idempotencyKey: "finish-missing-operation",
        start: missingStart,
        outcome: { outcome: "failed", terminationReason: "missing" },
      }),
    ).toEqual({ ok: false, error: { kind: "not-found", persisted: false } });

    const reserved = requireReservation(coordinator, root.value.operation.operationId);
    requireClaim(coordinator, reserved.reservationId);
    requireConfirmation(coordinator, reserved.reservationId);
    expect(
      coordinator.finishOperation({
        idempotencyKey: "finish-with-open-attempt",
        start: root.value.start,
        outcome: { outcome: "succeeded", terminationReason: "too-early" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });

    const projection = coordinator.readProjection({
      operationId: root.value.operation.operationId,
    });
    expect(projection.operations).toHaveLength(1);
    const openAttempt = projection.attempts[0];
    const attemptStart: AttemptStart = {
      attempt: openAttempt,
      rootOperationId: root.value.operation.rootOperationId,
      reservationId: reserved.reservationId,
      observedStart: {
        wall: "2026-08-02T00:00:00.000Z",
        monotonicMs: 100,
      },
    };
    expect(
      coordinator.finishAttempt({
        idempotencyKey: "finish-open-attempt",
        start: attemptStart,
        outcome: { outcome: "succeeded", terminationReason: "completed" },
      }).ok,
    ).toBe(true);
    const finishRequest = {
      idempotencyKey: "finish-operation-defensive",
      start: root.value.start,
      outcome: { outcome: "succeeded", terminationReason: "completed" } as const,
    };
    const finished = coordinator.finishOperation(finishRequest);
    expect(finished.ok).toBe(true);
    expect(coordinator.finishOperation(finishRequest)).toEqual(finished);
    expect(
      coordinator.finishOperation({
        ...finishRequest,
        outcome: { outcome: "failed", terminationReason: "changed" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "idempotency-conflict", persisted: false },
    });

    const finishedSets = repository.readEventSets();
    const finishSet = finishedSets.at(-1)!;
    expect(
      coordinatorFor(repositoryFrom([
        ...finishedSets.slice(0, -1),
        { ...finishSet, events: [] },
      ])).finishOperation(finishRequest),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-transition", persisted: false },
    });

    const rootOnlySets = finishedSets.slice(0, 1);
    expect(
      coordinatorFor(repositoryFrom(rootOnlySets, true)).finishOperation({
        ...finishRequest,
        idempotencyKey: "finish-operation-append-failure",
      }),
    ).toEqual({
      ok: false,
      error: { kind: "canonical-write-failed", persisted: false },
    });
  });
});
