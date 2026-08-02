// covers: execution-observability:ExecutionContract execution-observability:Fact execution-observability:DurationMeasurement
// size: small

import { describe, expect, test } from "bun:test";
import {
  createExecutionContract,
  type Clock,
  type ExecutionIdentity,
} from "../../packages/framework/core/tools/amadeus-execution-contract.ts";

function clock(wall: string, monotonic: number | null): Clock {
  return { wallNow: () => wall, monotonicNowMs: () => monotonic };
}

const origin = {
  stage: "code-generation",
  agent: "amadeus-developer-agent",
  tool: "amadeus-orchestrate",
} as const;

describe("stable execution identity", () => {
  test("the root and child tuples are deterministic without caller-concatenated ids", () => {
    const contract = createExecutionContract();
    const input = {
      intentUuid: "intent-uuid",
      stageSlug: "code-generation",
      stageInstanceId: "unit-a",
      revision: 1,
      kind: "stage" as const,
      origin,
    };
    const first = contract.beginRootProposal(input, clock("2026-08-02T00:00:00.000Z", 10));
    const replay = contract.beginRootProposal(input, clock("2026-08-02T00:00:00.000Z", 10));
    expect(replay.operation.operationId).toBe(first.operation.operationId);
    expect(first.operation.rootOperationId).toBe(first.operation.operationId);

    const child = contract.beginChildProposal(
      first.operation as ExecutionIdentity,
      { childKind: "tool", semanticSubjectId: "sensor-validation", childOrdinal: 1, origin },
      clock("2026-08-02T00:00:01.000Z", 20),
    );
    expect(child.operation.rootOperationId).toBe(first.operation.operationId);
    expect(child.operation.parentOperationId).toBe(first.operation.operationId);
    expect(child.operation.operationId).not.toBe(first.operation.operationId);
  });

  test("Redo is a new root linked by supersedes while resume keeps the nonterminal tuple", () => {
    const contract = createExecutionContract();
    const root = contract.beginRootProposal(
      { intentUuid: "i", stageSlug: "functional-design", stageInstanceId: "u", revision: 1, kind: "stage", origin },
      clock("2026-08-02T00:00:00.000Z", 1),
    );
    const resumed = contract.beginRootProposal(
      { intentUuid: "i", stageSlug: "functional-design", stageInstanceId: "u", revision: 1, kind: "stage", origin },
      clock("2026-08-02T00:00:00.000Z", 1),
    );
    const redone = contract.beginRootProposal(
      {
        intentUuid: "i",
        stageSlug: "functional-design",
        stageInstanceId: "u",
        revision: 2,
        kind: "stage",
        origin,
        supersedesOperationId: root.operation.operationId,
      },
      clock("2026-08-02T00:01:00.000Z", 100),
    );
    expect(resumed.operation.operationId).toBe(root.operation.operationId);
    expect(redone.operation.operationId).not.toBe(root.operation.operationId);
    expect(redone.operation.supersedesOperationId).toBe(root.operation.operationId);
  });

  test("four independent batches of one hundred roots have no identity collisions", () => {
    const contract = createExecutionContract();
    const ids = new Set<string>();
    for (let process = 0; process < 4; process += 1) {
      for (let ordinal = 0; ordinal < 100; ordinal += 1) {
        const proposal = contract.beginRootProposal(
          {
            intentUuid: "intent-uuid",
            stageSlug: "code-generation",
            stageInstanceId: `process-${process}-unit-${ordinal}`,
            revision: 1,
            kind: "stage",
            origin,
          },
          clock("2026-08-02T00:00:00.000Z", 10),
        );
        ids.add(proposal.operation.operationId);
      }
    }
    expect(ids).toHaveLength(400);
  });
});

describe("attempt duration facts", () => {
  test("monotonic time wins over wall time and produces a terminal attempt", () => {
    const contract = createExecutionContract();
    const start = contract.attemptFromConfirmation(
      {
        reservationId: "res-1",
        operationId: "op-1",
        rootOperationId: "op-1",
        attemptOrdinal: 1,
        nativeHandle: { state: "available", value: "native-1" },
        dispatchEvidence: { state: "available", value: "accepted" },
      },
      clock("2026-08-02T00:00:05.000Z", 100),
    );
    const finished = contract.finishAttempt(
      start,
      { outcome: "succeeded", terminationReason: "completed" },
      clock("2026-08-02T00:00:04.000Z", 145),
    );
    expect(finished.attempt.measurement).toEqual({
      clockSource: "monotonic",
      measurementQuality: "monotonic",
      durationMs: 45,
    });
    expect(finished.attempt.finishedAtFact.state).toBe("available");
  });

  test("a backwards wall clock is invalid and never rounded to zero", () => {
    const contract = createExecutionContract();
    const start = contract.attemptFromConfirmation(
      {
        reservationId: "res-2",
        operationId: "op-2",
        rootOperationId: "op-2",
        attemptOrdinal: 1,
        nativeHandle: { state: "legacy-unknown" },
        dispatchEvidence: { state: "incomplete", missingFields: ["nativeAcceptedAt"] },
      },
      clock("2026-08-02T00:00:05.000Z", null),
    );
    const finished = contract.finishAttempt(
      start,
      { outcome: "dispatch-effect-unknown", terminationReason: "effect-query-unavailable" },
      clock("2026-08-02T00:00:04.000Z", null),
    );
    expect(finished.attempt.measurement.measurementQuality).toBe("invalid");
    expect(finished.attempt.measurement.durationMs).toBeUndefined();
    expect(finished.attempt.measurement.error).toBe("wall-clock-regressed");
  });

  test("native missing and legacy values stay explicit facts", () => {
    const contract = createExecutionContract();
    expect(
      contract.normalizeNativeFacts({
        nativeHandle: undefined,
        model: { state: "legacy-unknown" },
        harnessVersion: { state: "unavailable", reason: "hook-does-not-expose-version" },
        clockAvailability: { state: "incomplete", missingFields: ["monotonic"] },
      }),
    ).toEqual({
      nativeHandle: { state: "unavailable", reason: "native-handle-not-exposed" },
      model: { state: "legacy-unknown" },
      harnessVersion: { state: "unavailable", reason: "hook-does-not-expose-version" },
      clockAvailability: { state: "incomplete", missingFields: ["monotonic"] },
    });
  });
});
