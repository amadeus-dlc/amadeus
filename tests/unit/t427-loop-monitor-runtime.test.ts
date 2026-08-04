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
  replayLoopMonitorPartition,
  renderLoopMonitorStatus,
  type JudgePort,
  type JudgeResult,
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
    expect(coordinator.observeDelivery(
      delivery(compiled, partition, "repair", first.deliveryId, "forked-successor"),
    )).toMatchObject({ kind: "CONFLICT", reason: "causal-fork" });
    expect(coordinator.observeDelivery(
      delivery(compiled, partition, "quality-check", null, "second-root"),
    )).toMatchObject({ kind: "CONFLICT", reason: "causal-fork" });
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

  test("effect-possible reconciliation fails closed without another dispatch", () => {
    const { coordinator, partition, reserved } = reserveJudge();
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
    expect(dispatches).toBe(1);
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
    const { repository, coordinator, partition, reserved, routeGraph, q2 } = reserveJudge();
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

    const changed = coordinator.clearLatch({ partition, evidenceFingerprint: evidenceB });
    expect(changed.kind).toBe("cleared");
    expect(repository.readEventSets(partition).at(-1)?.events.map((event) => event.type)).toEqual([
      "LOOP_LATCH_CLEARED",
      "WORKFLOW_UNPARKED",
    ]);
    expect(coordinator.readProjection(partition).latch).toBeNull();
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

    const latchedStatus = coordinator.readProjection(partition);
    const humanRetry = verifyHumanRetry({ eventType: "HUMAN_TURN", actor: "human", turnId: "turn-1" });
    expect(humanRetry).not.toBeNull();
    expect(renderLoopMonitorStatus({
      outcome: "parked",
      partition,
      epoch: latchedStatus.epoch,
      matchedPrefix: latchedStatus.matchedPrefix,
      cycleCount: latchedStatus.cycleCount,
      threshold: 1,
      pendingDeliveries: 0,
      pendingJudgeInvocationId: null,
      stopReason: latchedStatus.latch?.reasonCode ?? null,
      evidenceFingerprint: latchedStatus.latch?.evidenceFingerprint ?? null,
      resumeCondition: latchedStatus.latch?.resumeCondition ?? null,
    })).toContain("Resume condition: evidence-change-or-human-retry");
    expect(coordinator.clearLatch({ partition, humanRetry: humanRetry! }).kind).toBe("cleared");
    expect(verifyHumanRetry({ eventType: "HUMAN_TURN", actor: "agent", turnId: "turn-2" })).toBeNull();
  });

  test("live smoke requires safe external authorization before the canonical event is committed", () => {
    const { repository, coordinator, partition } = reserveJudge();
    const denied = coordinator.authorizeLiveSmoke(partition, `sha256:${"d".repeat(64)}`, {
      authorize: () => ({ authorized: false, reason: "no-human-authorization" }),
    });
    expect(denied).toEqual({ kind: "CONFLICT", reason: "no-human-authorization" });
    const authorized = coordinator.authorizeLiveSmoke(partition, `sha256:${"d".repeat(64)}`, {
      authorize: () => ({ authorized: true, authorizationId: "live-auth-1", actorId: "human-1" }),
    });
    expect(authorized.kind).toBe("authorized");
    expect(repository.readEventSets(partition).at(-1)?.events[0]?.type).toBe("LIVE_SMOKE_AUTHORIZED");
  });
});
