// covers: file:packages/framework/core/tools/amadeus-unit-pool.ts
// covers: file:packages/framework/core/tools/amadeus-unit-pool-runtime.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  foldUnitPoolEventSets,
  proposeUnitPoolCommand,
  validateAndOrderUnits,
} from "../../packages/framework/core/tools/amadeus-unit-pool.ts";
import {
  createMemoryUnitPoolRepository,
  createUnitPoolCoordinator,
  decodeUnitPoolEventSet,
  fingerprintUnitPoolRequest,
} from "../../packages/framework/core/tools/amadeus-unit-pool-runtime.ts";

const units = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ unitId: `u${index}`, dependsOn: [] }));

describe("t425 unit plan validation", () => {
  test("Kahn layers use unsigned UTF-8 bytewise order", () => {
    const result = validateAndOrderUnits([
      { unitId: "z", dependsOn: [] },
      { unitId: "a", dependsOn: [] },
      { unitId: "child", dependsOn: ["z", "a"] },
    ]);
    expect(result).toEqual({ ok: true, orderedUnitIds: ["a", "z", "child"] });
  });

  test.each([
    [[{ unitId: "a", dependsOn: [] }, { unitId: "a", dependsOn: [] }], "duplicate-unit"],
    [[{ unitId: "a", dependsOn: ["missing"] }], "missing-dependency"],
    [[{ unitId: "a", dependsOn: ["a"] }], "self-edge"],
    [[{ unitId: "a", dependsOn: ["b"] }, { unitId: "b", dependsOn: ["a"] }], "cycle"],
  ] as const)("rejects an invalid plan before mutation: %s", (plan, reason) => {
    expect(validateAndOrderUnits(plan)).toEqual({ ok: false, reason: "invalid-unit-plan", detail: reason });
  });
});

describe("t425 fixed pool", () => {
  test("a released slot promotes the next ready Unit in FIFO order", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 2, units: units(4) });
    coordinator.acquire({ idempotencyKey: "a0", batchId: "b" });
    coordinator.acquire({ idempotencyKey: "a1", batchId: "b" });
    expect(coordinator.readProjection("b").active.map((attempt) => attempt.unitId)).toEqual(["u0", "u1"]);
    const first = coordinator.readProjection("b").active[0];
    coordinator.confirmDispatch({ idempotencyKey: "confirm-u0", batchId: "b", attemptId: first.attemptId, nativeHandle: "u0" });
    coordinator.settleRelease({ idempotencyKey: "settle-u0", batchId: "b", attemptId: first.attemptId, outcome: "succeeded" });
    expect(coordinator.readProjection("b").active.map((attempt) => attempt.unitId)).toEqual(["u1", "u2"]);
    expect(coordinator.readProjection("b").queue.map((entry) => entry.unitId)).toEqual(["u3"]);
  });

  test.each([
    [1, 0], [1, 1], [1, 4], [1, 8],
    [2, 0], [2, 1], [2, 4], [2, 8],
    [4, 0], [4, 1], [4, 4], [4, 8],
  ])("cap=%i, units=%i never exceeds cap and every unit becomes terminal", (cap, count) => {
    const repository = createMemoryUnitPoolRepository();
    const coordinator = createUnitPoolCoordinator(repository);
    expect(coordinator.initialEnqueue({
      idempotencyKey: "init",
      batchId: "b",
      cap,
      units: units(count),
    }).ok).toBe(true);

    let maxActive = 0;
    let ordinal = 0;
    while (true) {
      const before = coordinator.readProjection("b");
      maxActive = Math.max(maxActive, before.active.length);
      const acquired = coordinator.acquire({ idempotencyKey: `acquire-${ordinal}`, batchId: "b" });
      if (acquired.ok) {
        ordinal += 1;
        maxActive = Math.max(maxActive, coordinator.readProjection("b").active.length);
        continue;
      }
      const active = coordinator.readProjection("b").active[0];
      if (active) {
        if (!active.dispatchConfirmed) {
          coordinator.confirmDispatch({ idempotencyKey: `confirm-${active.attemptId}`, batchId: "b", attemptId: active.attemptId, nativeHandle: active.attemptId });
        }
        expect(coordinator.settleRelease({
          idempotencyKey: `settle-${active.attemptId}`,
          batchId: "b",
          attemptId: active.attemptId,
          outcome: "succeeded",
        }).ok).toBe(true);
        continue;
      }
      break;
    }
    const projection = coordinator.readProjection("b");
    expect(maxActive).toBeLessThanOrEqual(cap);
    expect(projection.terminal).toHaveLength(count);
    expect(projection.result).toBe("completed");
  });

  test("failure releases a slot, cancels only transitive dependents, and lets independent work continue", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({
      idempotencyKey: "init",
      batchId: "b",
      cap: 2,
      units: [
        { unitId: "root", dependsOn: [] },
        { unitId: "dependent", dependsOn: ["root"] },
        { unitId: "independent", dependsOn: [] },
      ],
    });
    const first = coordinator.acquire({ idempotencyKey: "a1", batchId: "b" });
    const second = coordinator.acquire({ idempotencyKey: "a2", batchId: "b" });
    expect(first.ok && second.ok).toBe(true);
    const root = coordinator.readProjection("b").active.find((entry) => entry.unitId === "root");
    expect(root).toBeDefined();
    coordinator.confirmDispatch({ idempotencyKey: "confirm-root", batchId: "b", attemptId: root!.attemptId, nativeHandle: "root" });
    const settled = coordinator.settleReleaseCancelDependents({
      idempotencyKey: "fail-root",
      batchId: "b",
      attemptId: root!.attemptId,
      outcome: "failed",
    });
    expect(settled.ok).toBe(true);
    const projection = coordinator.readProjection("b");
    expect(projection.terminal).toContainEqual(expect.objectContaining({ unitId: "dependent", outcome: "dependency-unsatisfied" }));
    expect(projection.active.some((entry) => entry.unitId === "independent")).toBe(true);
  });

  test("settle-release automatically cancels transitive dependents on non-success", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({
      idempotencyKey: "init", batchId: "b", cap: 1,
      units: [{ unitId: "root", dependsOn: [] }, { unitId: "child", dependsOn: ["root"] }],
    });
    coordinator.acquire({ idempotencyKey: "acquire", batchId: "b" });
    const attempt = coordinator.readProjection("b").active[0];
    coordinator.confirmDispatch({ idempotencyKey: "confirm", batchId: "b", attemptId: attempt.attemptId, nativeHandle: "root" });
    coordinator.settleRelease({ idempotencyKey: "settle", batchId: "b", attemptId: attempt.attemptId, outcome: "failed" });
    expect(coordinator.readProjection("b").terminal).toEqual(expect.arrayContaining([
      expect.objectContaining({ unitId: "root", outcome: "failed" }),
      expect.objectContaining({ unitId: "child", outcome: "dependency-unsatisfied" }),
    ]));
  });

  test("a duplicate settle is idempotent and does not release twice", () => {
    const repository = createMemoryUnitPoolRepository();
    const coordinator = createUnitPoolCoordinator(repository);
    coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(1) });
    coordinator.acquire({ idempotencyKey: "a", batchId: "b" });
    const attemptId = coordinator.readProjection("b").active[0].attemptId;
    const request = { idempotencyKey: "settle", batchId: "b", attemptId, outcome: "succeeded" as const };
    coordinator.confirmDispatch({ idempotencyKey: "confirm", batchId: "b", attemptId, nativeHandle: "native" });
    expect(coordinator.settleRelease(request)).toEqual(coordinator.settleRelease(request));
    expect(repository.readEventSets()).toHaveLength(4);
    expect(foldUnitPoolEventSets(repository.readEventSets(), "b").terminal).toHaveLength(1);
  });

  test("dispatch no-effect requeues at FIFO tail under one unit-attempt budget subject", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(2) });
    coordinator.acquire({ idempotencyKey: "a1", batchId: "b" });
    const attempt = coordinator.readProjection("b").active[0];
    expect(coordinator.settleReleaseRequeue({
      idempotencyKey: "requeue",
      batchId: "b",
      attemptId: attempt.attemptId,
      outcome: "dispatch-not-started",
    }).ok).toBe(true);
    const projection = coordinator.readProjection("b");
    expect(projection.active.map((entry) => entry.unitId)).toEqual(["u1"]);
    expect(projection.queue.map((entry) => entry.unitId)).toEqual(["u0"]);
  });

  test("late results are observable but do not mutate terminal state", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(1) });
    coordinator.acquire({ idempotencyKey: "a", batchId: "b" });
    const attemptId = coordinator.readProjection("b").active[0].attemptId;
    coordinator.confirmDispatch({ idempotencyKey: "confirm", batchId: "b", attemptId, nativeHandle: "native" });
    coordinator.settleRelease({ idempotencyKey: "s", batchId: "b", attemptId, outcome: "failed" });
    const before = coordinator.readProjection("b").terminal;
    expect(coordinator.lateResultObserved({ idempotencyKey: "late", batchId: "b", attemptId, outcome: "succeeded" }).ok).toBe(true);
    expect(coordinator.readProjection("b").terminal).toEqual(before);
  });

  test("dispatch confirmation is the only start fact; a claim alone remains unconfirmed", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(1) });
    coordinator.acquire({ idempotencyKey: "a", batchId: "b" });
    const claimed = coordinator.readProjection("b").active[0];
    expect(claimed.dispatchConfirmed).toBe(false);
    coordinator.confirmDispatch({ idempotencyKey: "confirm", batchId: "b", attemptId: claimed.attemptId, nativeHandle: "native-1" });
    expect(coordinator.readProjection("b").active[0]).toMatchObject({ dispatchConfirmed: true, nativeHandle: "native-1" });
  });

  test("reconciliation no-effect atomically releases and requeues; unknown drains without retry", () => {
    const noEffect = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    noEffect.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(1) });
    noEffect.acquire({ idempotencyKey: "a", batchId: "b" });
    const firstAttempt = noEffect.readProjection("b").active[0].attemptId;
    noEffect.recordReconciliation({ idempotencyKey: "r", batchId: "b", attemptId: firstAttempt, reconciliationKind: "worker-start", effect: "no-effect-confirmed" });
    const retried = noEffect.readProjection("b");
    expect(retried.active).toHaveLength(1);
    expect(retried.active[0].attemptOrdinal).toBe(2);

    const unknown = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    unknown.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(2) });
    unknown.acquire({ idempotencyKey: "a", batchId: "b" });
    const unknownAttempt = unknown.readProjection("b").active[0].attemptId;
    unknown.recordReconciliation({ idempotencyKey: "r", batchId: "b", attemptId: unknownAttempt, reconciliationKind: "worker-start", effect: "unknown" });
    const drained = unknown.readProjection("b");
    expect(drained.phase).toBe("terminal");
    expect(drained.result).toBe("terminated");
    expect(drained.terminal.map((entry) => entry.outcome).sort()).toEqual(["batch-unsafe", "dispatch-effect-unknown"]);
  });

  test("systemic drain stops new acquisition but lets already-active Units settle", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 2, units: units(3) });
    coordinator.acquire({ idempotencyKey: "a1", batchId: "b" });
    coordinator.acquire({ idempotencyKey: "a2", batchId: "b" });
    const [uncertain, sibling] = coordinator.readProjection("b").active;
    coordinator.confirmDispatch({ idempotencyKey: "confirm-sibling", batchId: "b", attemptId: sibling.attemptId, nativeHandle: "sibling" });
    coordinator.recordReconciliation({ idempotencyKey: "reconcile", batchId: "b", attemptId: uncertain.attemptId, reconciliationKind: "worker-start", effect: "unknown" });

    expect(coordinator.readProjection("b")).toMatchObject({ phase: "draining", active: [expect.objectContaining({ attemptId: sibling.attemptId })] });
    expect(coordinator.acquire({ idempotencyKey: "a3", batchId: "b" })).toEqual({ ok: false, reason: "pool-not-open" });
    expect(coordinator.settleRelease({ idempotencyKey: "settle-sibling", batchId: "b", attemptId: sibling.attemptId, outcome: "succeeded" }).ok).toBe(true);
    expect(coordinator.readProjection("b")).toMatchObject({ phase: "terminal", result: "terminated", active: [] });
  });

  test("a failed canonical append leaves no partial pool mutation", () => {
    const repository = createMemoryUnitPoolRepository({ failAppend: true });
    const coordinator = createUnitPoolCoordinator(repository);
    expect(coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(1) })).toEqual({
      ok: false,
      reason: "canonical-write-failed: injected-unit-pool-append-failure",
    });
    expect(repository.readEventSets()).toEqual([]);
    expect(coordinator.readProjection("b")).toMatchObject({ batchId: null, queue: [], active: [], terminal: [] });
  });

  test("initial-enqueue rejects a queue that does not exactly match canonical order", () => {
    const projection = foldUnitPoolEventSets([], "b");
    expect(proposeUnitPoolCommand(projection, {
      kind: "initial-enqueue",
      batchId: "b",
      cap: 1,
      units: [{ unitId: "a", dependsOn: [] }, { unitId: "b", dependsOn: [] }],
      queue: [
        { queueEntryId: "duplicate", unitId: "b", ordinal: 0 },
        { queueEntryId: "duplicate", unitId: "a", ordinal: 1 },
      ],
    })).toEqual({ ok: false, reason: "invalid-initial-queue" });
  });

  test("request fingerprints are invariant to object key insertion order", () => {
    expect(fingerprintUnitPoolRequest({ batchId: "b", nested: { z: 1, a: 2 } })).toBe(
      fingerprintUnitPoolRequest({ nested: { a: 2, z: 1 }, batchId: "b" }),
    );
  });

  test("the same idempotency key cannot replay across batches", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    expect(coordinator.initialEnqueue({ idempotencyKey: "shared", batchId: "one", cap: 1, units: units(1) }).ok).toBe(true);
    expect(coordinator.initialEnqueue({ idempotencyKey: "shared", batchId: "two", cap: 1, units: units(1) })).toEqual({
      ok: false,
      reason: "idempotency-conflict",
    });
  });

  test("malformed audit event-set JSON fails closed", () => {
    expect(() => decodeUnitPoolEventSet("not-json")).toThrow();
    expect(() => decodeUnitPoolEventSet(JSON.stringify({
      eventSetId: "set", batchId: "b", idempotencyKey: "key", payloadFingerprint: "hash",
      events: [{ type: "not-a-unit-pool-event" }],
    }))).toThrow("invalid-unit-pool-audit-row");
  });

  test("reconciliation exhaustion settles the Unit as worker-unresponsive and drains the batch", () => {
    const projection = foldUnitPoolEventSets([{
      eventSetId: "set",
      batchId: "b",
      idempotencyKey: "init",
      payloadFingerprint: "fingerprint",
      events: [
        { type: "batch-initialized", batchId: "b", cap: 1, units: units(2), queue: [
          { queueEntryId: "q0", unitId: "u0", ordinal: 0 },
          { queueEntryId: "q1", unitId: "u1", ordinal: 1 },
        ] },
        { type: "unit-acquired", queueEntryId: "q0", attempt: { attemptId: "a0", slotId: "s0", unitId: "u0", attemptOrdinal: 1, dispatchConfirmed: false } },
        { type: "reconciliation-recorded", record: { attemptId: "a0", kind: "worker-start", ordinal: 1, effect: "unknown" } },
        { type: "reconciliation-recorded", record: { attemptId: "a0", kind: "worker-start", ordinal: 2, effect: "unknown" } },
      ],
    }], "b");
    const proposal = proposeUnitPoolCommand(projection, {
      kind: "record-reconciliation",
      batchId: "b",
      attemptId: "a0",
      reconciliationKind: "worker-start",
      effect: "unknown",
      queueEntryId: "retry",
    });
    expect(proposal).toEqual({ ok: true, events: [
      { type: "unit-settled", terminal: { unitId: "u0", attemptId: "a0", outcome: "worker-unresponsive" } },
      { type: "batch-draining", queuedOutcome: "batch-unsafe" },
    ] });
  });

  test.each([
    [["succeeded", "succeeded"], "completed"],
    [["succeeded", "failed"], "partial-failure"],
    [["failed", "cancelled"], "cancelled"],
    [["cancelled", "batch-unsafe"], "terminated"],
  ] as const)("final result priority for %j is %s", (outcomes, expected) => {
    const projection = foldUnitPoolEventSets([{
      eventSetId: "set",
      batchId: "b",
      idempotencyKey: "init",
      payloadFingerprint: "fingerprint",
      events: [
        { type: "batch-initialized", batchId: "b", cap: 2, units: units(2), queue: [] },
        { type: "units-cancelled", units: outcomes.map((outcome, index) => ({ unitId: `u${index}`, attemptId: null, outcome })) },
      ],
    }], "b");
    expect(projection.result).toBe(expected);
  });

  test("unit-attempt exhaustion fails locally, frees the slot, and continues independent work", () => {
    const coordinator = createUnitPoolCoordinator(createMemoryUnitPoolRepository());
    coordinator.initialEnqueue({ idempotencyKey: "init", batchId: "b", cap: 1, units: units(2) });
    coordinator.acquire({ idempotencyKey: "a", batchId: "b" });
    let attempt = coordinator.readProjection("b").active[0];
    coordinator.recordReconciliation({ idempotencyKey: "r1", batchId: "b", attemptId: attempt.attemptId, reconciliationKind: "worker-start", effect: "no-effect-confirmed" });
    attempt = coordinator.readProjection("b").active[0];
    expect(attempt.unitId).toBe("u1");
    coordinator.confirmDispatch({ idempotencyKey: "confirm-u1", batchId: "b", attemptId: attempt.attemptId, nativeHandle: "u1" });
    coordinator.settleRelease({ idempotencyKey: "settle-u1", batchId: "b", attemptId: attempt.attemptId, outcome: "succeeded" });
    attempt = coordinator.readProjection("b").active[0];
    expect(attempt.unitId).toBe("u0");
    expect(attempt.attemptOrdinal).toBe(2);
    coordinator.recordReconciliation({ idempotencyKey: "r2", batchId: "b", attemptId: attempt.attemptId, reconciliationKind: "worker-start", effect: "no-effect-confirmed" });
    const projection = coordinator.readProjection("b");
    expect(projection.terminal).toContainEqual(expect.objectContaining({ unitId: "u0", outcome: "failed" }));
    expect(projection.terminal).toContainEqual(expect.objectContaining({ unitId: "u1", outcome: "succeeded" }));
  });
});
