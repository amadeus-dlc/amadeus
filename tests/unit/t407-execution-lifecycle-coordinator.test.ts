// covers: execution-observability:ExecutionLifecycleCoordinator execution-observability:StartPermit
// size: small

import { describe, expect, test } from "bun:test";
import { type Clock } from "../../packages/framework/core/tools/amadeus-execution-contract.ts";
import {
  createExecutionLifecycleCoordinator,
  createMemoryExecutionRepository,
  type ExecutionProjectionSink,
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
      budgetKind: "unit-slot",
      subjectId: "unit-a",
      semanticAttemptOrdinal: 1,
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
      budgetKind: "unit-slot",
      subjectId: "unit-a",
      semanticAttemptOrdinal: 1,
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
        budgetKind: "unit-slot",
        subjectId: "unit-a",
        semanticAttemptOrdinal: ordinal,
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
      budgetKind: "unit-slot",
      subjectId: "unit-a",
      semanticAttemptOrdinal: 1,
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
