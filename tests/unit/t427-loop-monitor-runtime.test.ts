// covers: file:packages/framework/core/tools/amadeus-loop-monitor-runtime.ts
// size: medium

import { describe, expect, test } from "bun:test";

import {
  compileLoopMonitorManifest,
  createLoopDelivery,
  type CompiledLoopMonitorGraph,
  type LoopDelivery,
  type LoopMonitorPartition,
} from "../../packages/framework/core/tools/amadeus-loop-monitor.ts";
import {
  createLoopMonitorCoordinator,
  createMemoryLoopMonitorRepository,
  foldLoopMonitorEventSets,
  projectLoopMonitorStatus,
  replayLoopMonitorPartition,
  renderLoopMonitorStatus,
  type JudgePort,
  type JudgeResult,
  type LoopMonitorEventSet,
  verifyHumanRetry,
} from "../../packages/framework/core/tools/amadeus-loop-monitor-runtime.ts";

function graph(threshold = 1): CompiledLoopMonitorGraph {
  const result = compileLoopMonitorManifest({
    loopMonitors: [{
      id: "quality-repair",
      cycle: ["quality-check", "repair"],
      ignoreEvents: [],
      threshold,
      evidenceProviderId: "quality-summary",
      judgeInstructionId: "quality-judge",
      routes: ["repair", "repair-stalled"],
      transitionTable: {
        "quality-check": ["repair"],
        repair: ["quality-check"],
      },
    }],
    runtimeLimits: { maxPendingDeliveries: 2 },
  }, {
    evidenceProviders: [{ id: "quality-summary" }],
    judgeInstructions: [{ id: "quality-judge" }],
    routes: [
      { id: "repair", kind: "transition", targetEvent: "repair" },
      {
        id: "repair-stalled",
        kind: "park",
        reasonCode: "REPAIR_STALLED",
        resumeCondition: "evidence-change-or-human-retry",
      },
    ],
  });
  if (!result.ok) throw new Error(result.errors.map((item) => item.message).join("\n"));
  return result.graph;
}

const trace = { traceId: "0123456789abcdef0123456789abcdef", spanId: "0123456789abcdef" };
const evidenceA = `sha256:${"a".repeat(64)}`;
const evidenceB = `sha256:${"b".repeat(64)}`;

function delivery(
  compiled: CompiledLoopMonitorGraph,
  partition: LoopMonitorPartition,
  eventId: string,
  predecessorDeliveryId: string | null,
  upstreamEventIdentity: string,
  evidenceFingerprint = evidenceA,
): LoopDelivery {
  const monitor = compiled.loopMonitors[0]!;
  return createLoopDelivery({
    partition,
    eventId,
    predecessorDeliveryId,
    upstreamEventIdentity,
    payloadFingerprint: `sha256:${"c".repeat(64)}`,
    payload: { stageId: "code-generation", references: [] },
    evidence: { fingerprint: evidenceFingerprint, obligationIds: ["obligation-1"] },
    routeConstraint: monitor.routeConstraint,
    trace,
  });
}

function reserveJudge(routeGraph = graph()) {
  const repository = createMemoryLoopMonitorRepository();
  const coordinator = createLoopMonitorCoordinator({ graph: routeGraph, repository });
  const partition: LoopMonitorPartition = {
    intentUuid: "intent-1",
    monitorId: "quality-repair",
    stageInstanceId: "stage-1",
    graphRevision: routeGraph.graphRevision,
  };
  const q1 = delivery(routeGraph, partition, "quality-check", null, "q1");
  expect(coordinator.observeDelivery(q1).kind).toBe("observed");
  const r1 = delivery(routeGraph, partition, "repair", q1.deliveryId, "r1");
  expect(coordinator.observeDelivery(r1).kind).toBe("observed");
  const q2 = delivery(routeGraph, partition, "quality-check", r1.deliveryId, "q2");
  const reserved = coordinator.observeDelivery(q2);
  if (reserved.kind !== "judge-reserved") throw new Error(`expected Judge reservation, got ${reserved.kind}`);
  return { repository, coordinator, partition, reserved, routeGraph, q2 };
}

function resultFor(
  invocationId: string,
  routeGraph: CompiledLoopMonitorGraph,
  routeId = "repair",
): JudgeResult {
  return {
    invocationId,
    routeId,
    evidenceFingerprint: evidenceA,
    constraintFingerprint: routeGraph.loopMonitors[0]!.routeConstraint.fingerprint,
    trace,
  };
}

describe("Loop Monitor Judge runtime", () => {
  test("repository transactions reject re-entry and external reads", () => {
    const repository = createMemoryLoopMonitorRepository();
    const routeGraph = graph();
    const partition: LoopMonitorPartition = {
      intentUuid: "intent-transaction-contract",
      monitorId: "quality-repair",
      stageInstanceId: "stage-transaction-contract",
      graphRevision: routeGraph.graphRevision,
    };

    expect(() => repository.transaction(partition, () => repository.readEventSets(partition)))
      .toThrow("loop-monitor-transaction-external-read");
    expect(() => repository.transaction(partition, () => repository.transaction(partition, () => undefined)))
      .toThrow("loop-monitor-transaction-reentrant");
  });

  test("detects old duplicates, identity conflicts, and causal forks from the durable event-set index", () => {
    const compiled = graph(100);
    const repository = createMemoryLoopMonitorRepository();
    const coordinator = createLoopMonitorCoordinator({ graph: compiled, repository });
    const partition: LoopMonitorPartition = {
      intentUuid: "intent-old-delivery",
      monitorId: "quality-repair",
      stageInstanceId: "stage-old-delivery",
      graphRevision: compiled.graphRevision,
    };
    const first = delivery(compiled, partition, "quality-check", null, "old-upstream");
    expect(coordinator.observeDelivery(first).kind).toBe("observed");
    const firstSuccessor = delivery(compiled, partition, "repair", first.deliveryId, "first-successor");
    expect(coordinator.observeDelivery(firstSuccessor).kind).toBe("observed");

    let head = firstSuccessor;
    for (let index = 0; index < 105; index += 1) {
      const next = delivery(
        compiled,
        partition,
        index % 2 === 0 ? "quality-check" : "repair",
        head.deliveryId,
        `evict-${index}`,
      );
      expect(coordinator.observeDelivery(next).kind).toBe("observed");
      head = next;
    }

    expect(coordinator.observeDelivery(first).kind).toBe("duplicate");
    expect(coordinator.observeDelivery({
      ...first,
      deliveryId: `delivery-${"f".repeat(32)}`,
      payloadFingerprint: `sha256:${"f".repeat(64)}`,
    })).toMatchObject({ kind: "CONFLICT", reason: "upstream-identity-payload-conflict" });
    expect(coordinator.observeDelivery({
      ...first,
      routeConstraint: {
        routeIds: [first.routeConstraint.routeIds[0]!],
        fingerprint: `sha256:${"f".repeat(64)}`,
      },
    })).toMatchObject({ kind: "CONFLICT", reason: "upstream-identity-payload-conflict" });
    expect(coordinator.observeDelivery(
      delivery(compiled, partition, "repair", first.deliveryId, "forked-successor"),
    )).toMatchObject({ kind: "CONFLICT", reason: "causal-fork" });
    expect(coordinator.observeDelivery(
      delivery(compiled, partition, "quality-check", null, "second-root"),
    )).toMatchObject({ kind: "CONFLICT", reason: "causal-fork" });
  });

  test("rejects contradictory canonical Judge histories while folding exact retries", () => {
    const { repository, partition, routeGraph } = reserveJudge();
    const monitor = routeGraph.loopMonitors[0]!;
    const sets = repository.readEventSets(partition);
    const reservationSet = sets.at(-1)!;
    expect(foldLoopMonitorEventSets([...sets, reservationSet], partition, monitor)).toEqual(
      foldLoopMonitorEventSets(sets, partition, monitor),
    );
    expect(() => foldLoopMonitorEventSets([
      ...sets,
      { ...reservationSet, payloadFingerprint: `sha256:${"d".repeat(64)}` },
    ], partition, monitor)).toThrow("invalid-loop-monitor-audit:event-set-id-conflict");

    const reservationMismatch: LoopMonitorEventSet = {
      ...reservationSet,
      events: reservationSet.events.map((event) => event.type === "LOOP_MONITOR_TRIGGERED"
        ? { ...event, reservation: { ...event.reservation, invocationId: "judge-mismatched" } }
        : event),
    };
    expect(() => foldLoopMonitorEventSets(
      [...sets.slice(0, -1), reservationMismatch],
      partition,
      monitor,
    )).toThrow("invalid-loop-monitor-audit:judge-reservation-mismatch");

    const attemptMismatch: LoopMonitorEventSet = {
      ...reservationSet,
      eventSetId: "attempt-mismatch",
      idempotencyKey: "attempt-mismatch",
      events: [{
        type: "LOOP_JUDGE_ATTEMPT_STARTED",
        invocationId: "judge-mismatched",
        attempt: 1,
        attestationId: "attestation-mismatched",
        trace,
      }],
    };
    expect(() => foldLoopMonitorEventSets([...sets, attemptMismatch], partition, monitor))
      .toThrow("invalid-loop-monitor-audit:judge-attempt-mismatch");
  });

  test("dispatches only with a committed permit and records observed -> completed -> route in order", () => {
    const { repository, coordinator, partition, reserved, routeGraph } = reserveJudge();
    let dispatches = 0;
    const port: JudgePort = {
      dispatch(request) {
        dispatches += 1;
        return { kind: "completed", result: resultFor(request.invocationId, routeGraph) };
      },
      reconcile() {
        return { kind: "unknown", reason: "not-used" };
      },
    };
    const completed = coordinator.dispatchJudge(reserved.permit, port);
    expect(completed).toMatchObject({ kind: "route-applied", routeId: "repair" });
    expect(dispatches).toBe(1);
    expect(coordinator.readProjection(partition).pendingJudge).toBeNull();
    const last = repository.readEventSets(partition).at(-1)!;
    expect(last.events.map((event) => event.type)).toEqual([
      "LOOP_JUDGE_RESULT_OBSERVED",
      "LOOP_JUDGE_COMPLETED",
      "LOOP_ROUTE_APPLIED",
    ]);

    const forged = { ...reserved.permit, receiptId: "receipt-forged" };
    expect(coordinator.dispatchJudge(forged, port)).toMatchObject({
      kind: "CONFLICT",
      reason: "dispatch-permit-not-committed",
    });
    expect(coordinator.dispatchJudge({ ...reserved.permit, invocationId: "judge-mismatched" }, port)).toEqual({
      kind: "CONFLICT",
      reason: "dispatch-permit-invocation-mismatch",
    });
    expect(dispatches).toBe(1);
  });

  test("resume reconciles first and performs at most one attested no-effect redispatch", () => {
    const { coordinator, partition, reserved } = reserveJudge();
    let dispatches = 0;
    let reconciles = 0;
    const port: JudgePort = {
      dispatch(request) {
        dispatches += 1;
        return { kind: "accepted", nativeHandle: `native-${request.invocationId}` };
      },
      reconcile() {
        reconciles += 1;
        return { kind: "no-effect-attested", attestationId: `attestation-${reconciles}` };
      },
    };
    expect(coordinator.dispatchJudge(reserved.permit, port).kind).toBe("pending");
    expect(coordinator.resumeJudge(partition, port).kind).toBe("pending");
    expect(dispatches).toBe(2);
    expect(coordinator.readProjection(partition).judgeRedispatchAttempts).toBe(1);
    expect(coordinator.resumeJudge(partition, port)).toMatchObject({
      kind: "AWAITING_HUMAN",
      reason: "judge-redispatch-exhausted",
    });
    expect(dispatches).toBe(2);
    expect(reconciles).toBe(2);
  });

  test("preserves not-started reasons instead of reporting an in-flight Judge", () => {
    const { coordinator, reserved } = reserveJudge();
    const result = coordinator.dispatchJudge(reserved.permit, {
      dispatch: () => ({ kind: "not-started", reason: "provider-unavailable" }),
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    });

    expect(result).toMatchObject({
      kind: "not-started",
      reason: "provider-unavailable",
    });
  });

  test("resets the redispatch attempt budget for the next Judge invocation", () => {
    const { coordinator, partition, reserved, routeGraph, q2 } = reserveJudge();
    const retryPort: JudgePort = {
      dispatch: () => ({ kind: "accepted", nativeHandle: "redispatched" }),
      reconcile: () => ({ kind: "no-effect-attested", attestationId: "no-effect-1" }),
    };
    expect(coordinator.resumeJudge(partition, retryPort).kind).toBe("pending");
    expect(coordinator.readProjection(partition).judgeRedispatchAttempts).toBe(1);

    expect(coordinator.dispatchJudge(reserved.permit, {
      dispatch: (request) => ({ kind: "completed", result: resultFor(request.invocationId, routeGraph) }),
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    }).kind).toBe("route-applied");
    expect(coordinator.readProjection(partition)).toMatchObject({
      judgeRedispatchAttempts: 0,
      lastSemanticEventId: "repair",
      matchedPrefix: 2,
    });

    const quality = delivery(routeGraph, partition, "quality-check", q2.deliveryId, "second-quality");
    const second = coordinator.observeDelivery(quality);
    expect(second.kind).toBe("judge-reserved");
    if (second.kind !== "judge-reserved") throw new Error(`expected second Judge reservation, got ${second.kind}`);
    expect(second.invocationId).not.toBe(reserved.invocationId);
    expect(second.projection.judgeRedispatchAttempts).toBe(0);
    expect(coordinator.resumeJudge(partition, retryPort).kind).toBe("pending");
  });

  test("effect-possible reconciliation fails closed without another dispatch", () => {
    const { repository, coordinator, partition, reserved, routeGraph } = reserveJudge();
    let dispatches = 0;
    const port: JudgePort = {
      dispatch() {
        dispatches += 1;
        return { kind: "accepted", nativeHandle: "native" };
      },
      reconcile() {
        return { kind: "effect-possible", reason: "provider-timeout-after-send" };
      },
    };
    coordinator.dispatchJudge(reserved.permit, port);
    expect(coordinator.resumeJudge(partition, port)).toMatchObject({
      kind: "AWAITING_HUMAN",
      reason: "judge-effect-possible",
    });
    expect(replayLoopMonitorPartition(repository, routeGraph, partition).status.outcome).toBe("awaiting-human");
    expect(coordinator.resumeJudge(partition, port)).toMatchObject({
      kind: "AWAITING_HUMAN",
      reason: "judge-effect-possible",
    });
    expect(dispatches).toBe(1);
  });

  test("preserves the first awaiting-human reason during reentrant reconciliation", () => {
    const { coordinator, partition, reserved } = reserveJudge();
    const innerPort: JudgePort = {
      dispatch: () => ({ kind: "accepted", nativeHandle: "inner-native" }),
      reconcile: () => ({ kind: "unknown", reason: "inner-unknown" }),
    };
    const outerPort: JudgePort = {
      dispatch: () => ({ kind: "accepted", nativeHandle: "outer-native" }),
      reconcile() {
        expect(coordinator.resumeJudge(partition, innerPort)).toMatchObject({
          kind: "AWAITING_HUMAN",
          reason: "judge-effect-unknown",
        });
        return { kind: "effect-possible", reason: "outer-effect-possible" };
      },
    };
    expect(coordinator.dispatchJudge(reserved.permit, outerPort).kind).toBe("pending");
    expect(coordinator.resumeJudge(partition, outerPort)).toMatchObject({
      kind: "AWAITING_HUMAN",
      reason: "judge-effect-unknown",
    });
  });

  test("reuses completed Judge outcomes and rejects a late conflicting result", () => {
    const reconciled = reserveJudge();
    const reconcilePort: JudgePort = {
      dispatch: () => ({ kind: "accepted", nativeHandle: "reconcile-native" }),
      reconcile: (request) => ({
        kind: "completed",
        result: resultFor(request.invocationId, reconciled.routeGraph),
      }),
    };
    expect(reconciled.coordinator.dispatchJudge(reconciled.reserved.permit, reconcilePort).kind).toBe("pending");
    expect(reconciled.coordinator.resumeJudge(reconciled.partition, reconcilePort)).toMatchObject({
      kind: "route-applied",
      routeId: "repair",
    });

    const completeReentrantly = (conflictingOuterResult: boolean) => {
      const instance = reserveJudge();
      let nested = false;
      const innerPort: JudgePort = {
        dispatch: (request) => ({
          kind: "completed",
          result: resultFor(request.invocationId, instance.routeGraph),
        }),
        reconcile: () => ({ kind: "unknown", reason: "not-used" }),
      };
      const outerPort: JudgePort = {
        dispatch(request) {
          if (!nested) {
            nested = true;
            expect(instance.coordinator.dispatchJudge(instance.reserved.permit, innerPort)).toMatchObject({
              kind: "route-applied",
              routeId: "repair",
            });
          }
          return {
            kind: "completed",
            result: resultFor(
              conflictingOuterResult ? "judge-late-conflict" : request.invocationId,
              instance.routeGraph,
            ),
          };
        },
        reconcile: () => ({ kind: "unknown", reason: "not-used" }),
      };
      return instance.coordinator.dispatchJudge(instance.reserved.permit, outerPort);
    };
    expect(completeReentrantly(false)).toMatchObject({ kind: "route-applied", routeId: "repair" });
    expect(completeReentrantly(true)).toEqual({ kind: "CONFLICT", reason: "judge-invocation-not-pending" });
  });

  test("stops an outer redispatch when reentrant reconciliation consumes the retry", () => {
    const { coordinator, partition, reserved } = reserveJudge();
    const innerPort: JudgePort = {
      dispatch: () => ({ kind: "accepted", nativeHandle: "inner-redispatch" }),
      reconcile: () => ({ kind: "no-effect-attested", attestationId: "inner-attestation" }),
    };
    const outerPort: JudgePort = {
      dispatch: () => ({ kind: "accepted", nativeHandle: "outer-redispatch" }),
      reconcile() {
        expect(coordinator.resumeJudge(partition, innerPort).kind).toBe("pending");
        return { kind: "no-effect-attested", attestationId: "outer-attestation" };
      },
    };
    expect(coordinator.dispatchJudge(reserved.permit, outerPort).kind).toBe("pending");
    expect(coordinator.resumeJudge(partition, outerPort)).toMatchObject({
      kind: "AWAITING_HUMAN",
      reason: "judge-redispatch-exhausted",
    });
  });

  test("persists the safe result observation but rejects provider identity, route, or trace mismatch", () => {
    const { repository, coordinator, partition, reserved, routeGraph } = reserveJudge();
    const port: JudgePort = {
      dispatch(request) {
        return {
          kind: "completed",
          result: { ...resultFor(request.invocationId, routeGraph), routeId: "undeclared" },
        };
      },
      reconcile() {
        return { kind: "unknown", reason: "not-used" };
      },
    };
    expect(coordinator.dispatchJudge(reserved.permit, port)).toMatchObject({
      kind: "CONFLICT",
      reason: "judge-result-mismatch",
    });
    expect(repository.readEventSets(partition).at(-1)?.events.map((event) => event.type)).toEqual([
      "LOOP_JUDGE_RESULT_OBSERVED",
    ]);
    expect(coordinator.readProjection(partition).pendingJudge?.invocationId).toBe(reserved.invocationId);
  });
});

describe("Loop Monitor latch", () => {
  test("short-circuits the same evidence and clears atomically on evidence change", () => {
    const { coordinator, partition, reserved, routeGraph, q2 } = reserveJudge();
    const port: JudgePort = {
      dispatch(request) {
        return { kind: "completed", result: resultFor(request.invocationId, routeGraph, "repair-stalled") };
      },
      reconcile() {
        return { kind: "unknown", reason: "not-used" };
      },
    };
    expect(coordinator.dispatchJudge(reserved.permit, port).kind).toBe("latched");
    const same = delivery(routeGraph, partition, "repair", q2.deliveryId, "same-evidence", evidenceA);
    expect(coordinator.observeDelivery(same)).toMatchObject({
      kind: "latched",
      reasonCode: "REPAIR_STALLED",
    });

    const selfReported = coordinator.clearLatch({
      partition,
      evidenceFingerprint: evidenceB,
    } as unknown as Parameters<typeof coordinator.clearLatch>[0]);
    expect(selfReported).toEqual({ kind: "CONFLICT", reason: "latch-clear-not-authorized" });
    expect(coordinator.readProjection(partition).latch).not.toBeNull();

    const implicit = reserveJudge();
    expect(implicit.coordinator.dispatchJudge(implicit.reserved.permit, {
      dispatch: (request) => ({
        kind: "completed",
        result: resultFor(request.invocationId, implicit.routeGraph, "repair-stalled"),
      }),
      reconcile: () => ({ kind: "unknown", reason: "not-used" }),
    }).kind).toBe("latched");
    const changedDelivery = delivery(
      implicit.routeGraph,
      implicit.partition,
      "repair",
      implicit.q2.deliveryId,
      "implicit-evidence-change",
      evidenceB,
    );
    expect(implicit.coordinator.observeDelivery(changedDelivery).kind).toBe("observed");
    expect(implicit.repository.readEventSets(implicit.partition).at(-1)?.events.map((event) => event.type)).toEqual([
      "LOOP_LATCH_CLEARED",
      "WORKFLOW_UNPARKED",
      "LOOP_DELIVERY_OBSERVED",
    ]);
    expect(implicit.coordinator.readProjection(implicit.partition).latch).toBeNull();
  });

  test("a real verified HUMAN_TURN clears the latch and status/replay expose the stop contract", () => {
    const { repository, coordinator, partition, reserved, routeGraph } = reserveJudge();
    const port: JudgePort = {
      dispatch(request) {
        return { kind: "completed", result: resultFor(request.invocationId, routeGraph, "repair-stalled") };
      },
      reconcile() {
        return { kind: "unknown", reason: "not-used" };
      },
    };
    coordinator.dispatchJudge(reserved.permit, port);
    const replay = replayLoopMonitorPartition(
      repository,
      graph(),
      partition,
    );
    expect(replay.status.outcome).toBe("parked");
    expect(() => replayLoopMonitorPartition(repository, routeGraph, {
      ...partition,
      graphRevision: `sha256:${"f".repeat(64)}`,
    })).toThrow("loop-monitor-replay-graph-revision-mismatch");

    const latchedStatus = coordinator.readProjection(partition);
    const humanRetry = verifyHumanRetry({ eventType: "HUMAN_TURN", actor: "human", turnId: "turn-1" });
    expect(humanRetry).not.toBeNull();
    expect(renderLoopMonitorStatus(projectLoopMonitorStatus(latchedStatus, routeGraph.loopMonitors[0]!)))
      .toContain("Resume condition: evidence-change-or-human-retry");
    expect(coordinator.clearLatch({ partition, humanRetry: humanRetry! }).kind).toBe("cleared");
    expect(verifyHumanRetry({ eventType: "HUMAN_TURN", actor: "agent", turnId: "turn-2" })).toBeNull();
  });

  test("rejects a forged verified retry that is not attributed to a human actor", () => {
    const { coordinator, partition, reserved, routeGraph } = reserveJudge();
    const port: JudgePort = {
      dispatch(request) {
        return { kind: "completed", result: resultFor(request.invocationId, routeGraph, "repair-stalled") };
      },
      reconcile() {
        return { kind: "unknown", reason: "not-used" };
      },
    };
    expect(coordinator.dispatchJudge(reserved.permit, port).kind).toBe("latched");

    const forgedRetry = {
      verified: true,
      eventType: "HUMAN_TURN",
      actor: "agent",
      turnId: "forged-turn",
    } as unknown as NonNullable<Parameters<typeof coordinator.clearLatch>[0]["humanRetry"]>;
    expect(coordinator.clearLatch({ partition, humanRetry: forgedRetry })).toEqual({
      kind: "CONFLICT",
      reason: "latch-clear-not-authorized",
    });
    expect(coordinator.readProjection(partition).latch).not.toBeNull();
  });
});

describe("live smoke authorization seam", () => {
  test("records a credential-attested authorization as a partition event", () => {
    const routeGraph = graph();
    const repository = createMemoryLoopMonitorRepository();
    const coordinator = createLoopMonitorCoordinator({ graph: routeGraph, repository });
    const partition: LoopMonitorPartition = {
      intentUuid: "intent-1",
      monitorId: "quality-repair",
      stageInstanceId: "stage-1",
      graphRevision: routeGraph.graphRevision,
    };
    const port = {
      authorize: (request: { readonly intentUuid: string; readonly monitorId: string; readonly scopeDigest: string }) => ({
        authorized: true as const,
        authorizationId: `live-auth-${request.monitorId}`,
        actorId: "credential-attested-human",
      }),
    };
    const authorized = coordinator.authorizeLiveSmoke(partition, "sha256:scope", port);
    expect(authorized.kind).toBe("authorized");
    if (authorized.kind !== "authorized") return;
    expect(authorized.receipt.eventSetId.length).toBeGreaterThan(0);
    // Denied port fails closed without an event.
    expect(coordinator.authorizeLiveSmoke(partition, "sha256:scope", {
      authorize: () => ({ authorized: false as const, reason: "credential-missing" }),
    })).toEqual({ kind: "CONFLICT", reason: "credential-missing" });
    // Unknown partition never reaches the port.
    let unknownPartitionCalls = 0;
    const countingPort = {
      authorize: () => {
        unknownPartitionCalls++;
        return { authorized: true as const, authorizationId: "never", actorId: "never" };
      },
    };
    expect(coordinator.authorizeLiveSmoke({ ...partition, monitorId: "unknown-monitor" }, "sha256:scope", countingPort))
      .toEqual({ kind: "CONFLICT", reason: "partition-not-in-compiled-graph" });
    expect(unknownPartitionCalls).toBe(0);
  });
});
