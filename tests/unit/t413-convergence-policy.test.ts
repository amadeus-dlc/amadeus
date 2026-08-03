// covers: convergence-budgets:ConvergencePolicy
// size: small

import { describe, expect, test } from "bun:test";
import {
  BUDGET_KINDS,
  classifyRetry,
  createBudgetPolicy,
  defaultBudgetPolicy,
  evaluateBudget,
  retryBackoffMs,
} from "../../packages/framework/core/tools/amadeus-convergence-policy.ts";
import {
  createExecutionLifecycleCoordinator,
  createMemoryExecutionRepository,
} from "../../packages/framework/core/tools/amadeus-execution-lifecycle.ts";

const clock = {
  wallNow: () => "2026-08-02T00:00:00.000Z",
  monotonicNowMs: () => 100,
};

const projectionSink = {
  projectRequired: (eventSet: { digest: string }) => ({
    digest: eventSet.digest,
    stateProjectionReceiptId: `state-${eventSet.digest}`,
    runtimeProjectionReceiptId: `runtime-${eventSet.digest}`,
  }),
  rebuildRequired: () => {
    throw new Error("not used");
  },
  projectTelemetry: () => ({ projected: true }),
};

describe("convergence budget boundary", () => {
  test.each([...BUDGET_KINDS])("%s permits the cap-th delivery and rejects cap+1", (kind) => {
    const policy = createBudgetPolicy({
      kind,
      effectiveCap: 3,
      hardCap: kind === "stop-continuation" ? 10 : 3,
      configVersion: "test-v1",
    });
    if (!policy.ok) throw new Error("valid policy was rejected");

    expect(
      evaluateBudget(2, {
        rootOperationId: "root-1",
        subjectId: "stage-1",
        policy: policy.value,
        lastDurableProgress: "stage-started",
      }),
    ).toEqual({ kind: "reserved", nextValue: 3, remaining: 0 });

    const exhausted = evaluateBudget(3, {
      rootOperationId: "root-1",
      subjectId: "stage-1",
      policy: policy.value,
      lastDurableProgress: "stage-started",
    });
    expect(exhausted.kind).toBe("exhausted");
    if (exhausted.kind !== "exhausted") throw new Error("budget must be exhausted");
    expect(exhausted.value).toBe(3);
    expect(exhausted.termination).toMatchObject({
      schemaVersion: 1,
      reasonCode: "budget-exhausted",
      budget: { state: "available", value: { consumed: 3, cap: 3 } },
      rootOperationId: "root-1",
    });
  });

  test("shared defaults preserve mode-specific stop caps and the bounded retry cap", () => {
    expect(defaultBudgetPolicy("stop-continuation", "interactive")).toMatchObject({
      ok: true,
      value: { effectiveCap: 2, hardCap: 10 },
    });
    expect(defaultBudgetPolicy("stop-continuation", "autonomous")).toMatchObject({
      ok: true,
      value: { effectiveCap: 8, hardCap: 10 },
    });
    expect(defaultBudgetPolicy("stop-continuation", "gated")).toMatchObject({
      ok: true,
      value: { effectiveCap: 8, hardCap: 10 },
    });
    expect(defaultBudgetPolicy("recoverable-retry")).toMatchObject({
      ok: true,
      value: { effectiveCap: 2, hardCap: 3 },
    });
  });

  test("policy creation rejects invalid and non-canonical caps", () => {
    expect(
      createBudgetPolicy({
        kind: "question",
        effectiveCap: 0,
        hardCap: 3,
        configVersion: "test-v1",
      }),
    ).toEqual({ ok: false, error: "cap-not-positive-integer" });
    expect(
      createBudgetPolicy({
        kind: "question",
        effectiveCap: 1,
        hardCap: 0,
        configVersion: "test-v1",
      }),
    ).toEqual({ ok: false, error: "cap-not-positive-integer" });
    expect(
      createBudgetPolicy({
        kind: "question",
        effectiveCap: 4,
        hardCap: 3,
        configVersion: "test-v1",
      }),
    ).toEqual({ ok: false, error: "hard-cap-exceeded" });
    expect(
      createBudgetPolicy({
        kind: "stop-continuation",
        effectiveCap: 2,
        hardCap: 9,
        configVersion: "test-v1",
      }),
    ).toEqual({ ok: false, error: "hard-cap-mismatch" });
  });

  test("retry classification allows only the four exact v1 tuples", () => {
    const allowed = [
      ["worker-spawn-unavailable", "swarm-dispatch", "RR-V1-WSU-DISPATCH"],
      ["worker-spawn-unavailable", "swarm-worker-start", "RR-V1-WSU-WORKER-START"],
      ["read-only-probe-timeout", "stop-continuation", "RR-V1-ROPT-STOP"],
      ["read-only-probe-timeout", "swarm-result-collection", "RR-V1-ROPT-RESULT"],
    ] as const;
    for (const [causeCode, sourceSurface, ruleId] of allowed) {
      expect(
        classifyRetry(
          {
            retryClass: "recoverable-transient",
            effectStatus: "no-effect-confirmed",
            causeCode,
            sourceSurface,
          },
          1,
        ),
      ).toEqual({ kind: "retryable", ruleId, version: 1 });
    }
    expect(
      classifyRetry(
        {
          retryClass: "recoverable-transient",
          effectStatus: "no-effect-confirmed",
          causeCode: "worker-spawn-unavailable",
          sourceSurface: "swarm-result-collection",
        },
        1,
      ),
    ).toEqual({ kind: "non-retryable", reasonCode: "retry-not-allowlisted" });
    expect(
      classifyRetry(
        {
          retryClass: "recoverable-transient",
          effectStatus: "unknown",
          causeCode: "read-only-probe-timeout",
          sourceSurface: "stop-continuation",
        },
        1,
      ),
    ).toEqual({ kind: "unsafe-unknown", reasonCode: "retry-effect-unknown" });
    expect(
      classifyRetry(
        {
          retryClass: "recoverable-transient",
          effectStatus: "no-effect-confirmed",
          causeCode: "read-only-probe-timeout",
          sourceSurface: "stop-continuation",
        },
        2,
      ),
    ).toEqual({
      kind: "unsafe-unknown",
      reasonCode: "retry-policy-version-unknown",
    });
  });

  test("retry backoff is deterministic and bounded by the hard-cap ordinal", () => {
    expect([0, 1, 2, 3, 4].map(retryBackoffMs)).toEqual([0, 50, 100, 150, 150]);
  });

  test("atomic reserve survives replay and coordinator restart without exceeding the cap", () => {
    const repository = createMemoryExecutionRepository();
    const firstCoordinator = createExecutionLifecycleCoordinator({
      clock,
      repository,
      projectionSink,
    });
    const root = firstCoordinator.startOperation({
      idempotencyKey: "root",
      input: {
        intentUuid: "intent-1",
        stageSlug: "code-generation",
        stageInstanceId: "stage-1",
        revision: 1,
        kind: "stage",
        origin: { stage: "code-generation", agent: "developer", tool: "stop-hook" },
      },
    });
    if (!root.ok) throw new Error("root start failed");
    const policy = createBudgetPolicy({
      kind: "stop-continuation",
      effectiveCap: 2,
      hardCap: 10,
      configVersion: "stop-v1",
    });
    if (!policy.ok) throw new Error("policy creation failed");
    const reserve = (ordinal: number, idempotencyKey: string) => ({
      operationId: root.value.operation.operationId,
      idempotencyKey,
      budgetKind: "stop-continuation" as const,
      subjectId: "stage-1",
      semanticAttemptOrdinal: ordinal,
      policy: policy.value,
      lastDurableProgress: "stage-started",
    });

    const first = firstCoordinator.reserveExecution(reserve(1, "reserve-1"));
    expect(first.ok).toBe(true);
    expect(firstCoordinator.reserveExecution(reserve(1, "reserve-1"))).toEqual(first);

    const resumedCoordinator = createExecutionLifecycleCoordinator({
      clock,
      repository,
      projectionSink,
    });
    expect(resumedCoordinator.reserveExecution(reserve(2, "reserve-2")).ok).toBe(true);
    const mismatchedPolicy = createBudgetPolicy({
      kind: "stop-continuation",
      effectiveCap: 1,
      hardCap: 10,
      configVersion: "stop-v2",
    });
    if (!mismatchedPolicy.ok) throw new Error("mismatch policy creation failed");
    expect(
      resumedCoordinator.reserveExecution({
        ...reserve(3, "reserve-policy-mismatch"),
        policy: mismatchedPolicy.value,
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "budget-policy-mismatch", persisted: false },
    });
    const exhausted = resumedCoordinator.reserveExecution(reserve(3, "reserve-3"));
    expect(exhausted).toMatchObject({
      ok: false,
      error: {
        kind: "budget-exhausted",
        persisted: true,
        termination: { reasonCode: "budget-exhausted" },
      },
    });
    expect(resumedCoordinator.reserveExecution(reserve(3, "reserve-3"))).toEqual(exhausted);
    const eventCount = repository.readEventSets().length;
    expect(resumedCoordinator.reserveExecution(reserve(4, "reserve-4"))).toEqual(exhausted);
    expect(repository.readEventSets()).toHaveLength(eventCount);
    expect(
      resumedCoordinator.readProjection({ rootOperationId: root.value.operation.rootOperationId }),
    ).toMatchObject({
      reservations: [
        { budget: { value: 1 } },
        { budget: { value: 2 } },
      ],
      budgetTerminations: [{ reasonCode: "budget-exhausted" }],
    });
  });
});
