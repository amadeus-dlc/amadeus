// covers: file:packages/framework/core/tools/amadeus-loop-monitor.ts
// size: medium

import { describe, expect, test } from "bun:test";

import {
  applyLoopDelivery,
  compileLoopMonitorManifest,
  createLoopDelivery,
  createLoopMonitorProjection,
  type CompiledLoopMonitor,
  type LoopMonitorContributions,
  type LoopMonitorPartition,
  type LoopMonitorProjection,
} from "../../packages/framework/core/tools/amadeus-loop-monitor.ts";

const contributions: LoopMonitorContributions = {
  evidenceProviders: [{ id: "quality-summary" }],
  judgeInstructions: [{ id: "quality-judge" }],
  routes: [
    { id: "repair", kind: "transition", targetEvent: "repair" },
    { id: "replan", kind: "transition", targetEvent: "quality-check" },
    {
      id: "repair-stalled",
      kind: "park",
      reasonCode: "REPAIR_STALLED",
      resumeCondition: "evidence-change-or-human-retry",
    },
  ],
};

function monitorSpec(threshold = 2): Record<string, unknown> {
  return {
    id: "quality-repair",
    cycle: ["quality-check", "repair"],
    ignoreEvents: ["verification-observation"],
    threshold,
    evidenceProviderId: "quality-summary",
    judgeInstructionId: "quality-judge",
    routes: ["repair", "replan", "repair-stalled"],
    transitionTable: {
      "quality-check": ["repair", "workflow-exit"],
      repair: ["quality-check", "workflow-exit"],
      "workflow-exit": [],
    },
  };
}

function manifest(threshold = 2, maxPendingDeliveries = 2): Record<string, unknown> {
  return {
    loopMonitors: [monitorSpec(threshold)],
    runtimeLimits: { maxPendingDeliveries },
  };
}

function compiled(threshold = 2, maxPendingDeliveries = 2): CompiledLoopMonitor {
  const result = compileLoopMonitorManifest(manifest(threshold, maxPendingDeliveries), contributions);
  if (!result.ok) throw new Error(result.errors.map((error) => error.message).join("\n"));
  return result.graph.loopMonitors[0]!;
}

const partition: LoopMonitorPartition = {
  intentUuid: "intent-019fc5ac",
  monitorId: "quality-repair",
  stageInstanceId: "stage-code-generation-bolt-1",
  graphRevision: "sha256:graph",
};

const trace = { traceId: "0123456789abcdef0123456789abcdef", spanId: "0123456789abcdef" };
const evidence = {
  fingerprint: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  obligationIds: ["obligation-1"],
};

function delivery(
  monitor: CompiledLoopMonitor,
  eventId: string,
  predecessorDeliveryId: string | null,
  upstreamEventIdentity: string,
  payloadFingerprint = `sha256:${"b".repeat(64)}`,
) {
  return createLoopDelivery({
    partition,
    eventId,
    predecessorDeliveryId,
    upstreamEventIdentity,
    payloadFingerprint,
    payload: {
      stageId: "code-generation",
      references: [{ kind: "artifact", id: "code-summary", digest: `sha256:${"c".repeat(64)}` }],
    },
    evidence,
    routeConstraint: monitor.routeConstraint,
    trace,
  });
}

function accepted(result: ReturnType<typeof applyLoopDelivery>): LoopMonitorProjection {
  if (!result.ok) throw new Error(`${result.status}: ${result.reason}`);
  return result.projection;
}

describe("loop monitor manifest compiler", () => {
  test("compiles exact contribution references and binds transitions and runtime limits into graphRevision", () => {
    const first = compileLoopMonitorManifest(manifest(), contributions);
    const second = compileLoopMonitorManifest(manifest(), contributions);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) return;
    expect(first.graph.graphRevision).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(first.graph.runtimeLimits).toEqual({ maxPendingDeliveries: 2 });
    expect(first.graph.loopMonitors[0]?.transitionTable.repair).toEqual([
      "quality-check",
      "workflow-exit",
    ]);
    expect(first.graph.loopMonitors[0]?.routes.map((route) => route.id)).toEqual([
      "repair",
      "replan",
      "repair-stalled",
    ]);
  });

  test("fails the whole compile on unknown fields and invalid schema invariants", () => {
    const cases: [string, unknown][] = [
      ["manifest unknown field", { ...(manifest() as object), unknown: true }],
      ["monitor unknown field", { ...manifest(), loopMonitors: [{ ...monitorSpec(), extra: true }] }],
      ["empty cycle", { ...manifest(), loopMonitors: [{ ...monitorSpec(), cycle: [] }] }],
      ["duplicate cycle event", { ...manifest(), loopMonitors: [{ ...monitorSpec(), cycle: ["repair", "repair"] }] }],
      ["ignored cycle event", { ...manifest(), loopMonitors: [{ ...monitorSpec(), ignoreEvents: ["repair"] }] }],
      ["zero threshold", { ...manifest(), loopMonitors: [{ ...monitorSpec(), threshold: 0 }] }],
      ["empty routes", { ...manifest(), loopMonitors: [{ ...monitorSpec(), routes: [] }] }],
      ["duplicate route", { ...manifest(), loopMonitors: [{ ...monitorSpec(), routes: ["repair", "repair"] }] }],
      ["missing provider", { ...manifest(), loopMonitors: [{ ...monitorSpec(), evidenceProviderId: "missing" }] }],
      ["infinite pending limit", { ...(manifest() as object), runtimeLimits: { maxPendingDeliveries: Number.POSITIVE_INFINITY } }],
    ];
    for (const [label, value] of cases) {
      const result = compileLoopMonitorManifest(value, contributions);
      expect(result.ok, label).toBe(false);
      if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("loop monitor delivery reducer", () => {
  test("delivery construction admits identifiers and digests only, never raw evidence", () => {
    const monitor = compiled();
    expect(() => createLoopDelivery({
      partition,
      eventId: "quality-check",
      predecessorDeliveryId: null,
      upstreamEventIdentity: "upstream-safe",
      payloadFingerprint: "raw-review-text",
      payload: { stageId: "code-generation", references: [] },
      evidence,
      routeConstraint: monitor.routeConstraint,
      trace,
    })).toThrow("unsafe-loop-delivery:payloadFingerprint");
  });

  test("reserves no Judge at T-1 and exactly one at T, while ignore events only advance the chain", () => {
    const monitor = compiled(2);
    let projection = createLoopMonitorProjection(partition, monitor);
    const q1 = delivery(monitor, "quality-check", null, "upstream-q1");
    projection = accepted(applyLoopDelivery(projection, monitor, q1));
    const r1 = delivery(monitor, "repair", q1.deliveryId, "upstream-r1");
    projection = accepted(applyLoopDelivery(projection, monitor, r1));
    const noise = delivery(monitor, "verification-observation", r1.deliveryId, "upstream-noise");
    projection = accepted(applyLoopDelivery(projection, monitor, noise));
    expect(projection.matchedPrefix).toBe(2);
    const q2 = delivery(monitor, "quality-check", noise.deliveryId, "upstream-q2");
    const atOne = applyLoopDelivery(projection, monitor, q2);
    expect(atOne.ok && atOne.judgeReservation).toBeNull();
    projection = accepted(atOne);
    const r2 = delivery(monitor, "repair", q2.deliveryId, "upstream-r2");
    projection = accepted(applyLoopDelivery(projection, monitor, r2));
    const q3 = delivery(monitor, "quality-check", r2.deliveryId, "upstream-q3");
    const atThreshold = applyLoopDelivery(projection, monitor, q3);
    expect(atThreshold.ok && atThreshold.judgeReservation?.triggerDeliveryId).toBe(q3.deliveryId);
    expect(atThreshold.ok && atThreshold.projection.cycleCount).toBe(2);
  });

  test("a legal natural exit resets the epoch without starting a Judge", () => {
    const monitor = compiled(1);
    let projection = createLoopMonitorProjection(partition, monitor);
    const q = delivery(monitor, "quality-check", null, "q");
    projection = accepted(applyLoopDelivery(projection, monitor, q));
    const exit = delivery(monitor, "workflow-exit", q.deliveryId, "exit");
    const result = applyLoopDelivery(projection, monitor, exit);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.judgeReservation).toBeNull();
    expect(result.projection).toMatchObject({ epoch: 1, cycleCount: 0, matchedPrefix: 0 });
  });

  test("deduplicates an identical delivery and conflicts on identity reuse with another payload", () => {
    const monitor = compiled();
    const start = createLoopMonitorProjection(partition, monitor);
    const q = delivery(monitor, "quality-check", null, "same-identity");
    const first = applyLoopDelivery(start, monitor, q);
    const projection = accepted(first);
    const duplicate = applyLoopDelivery(projection, monitor, q);
    expect(duplicate.ok && duplicate.duplicate).toBe(true);
    const conflicting = delivery(
      monitor,
      "quality-check",
      null,
      "same-identity",
      `sha256:${"d".repeat(64)}`,
    );
    expect(applyLoopDelivery(projection, monitor, conflicting)).toMatchObject({
      ok: false,
      status: "CONFLICT",
      reason: "delivery-identity-payload-conflict",
    });
  });

  test("buffers a successor until its predecessor arrives, then drains causally", () => {
    const monitor = compiled();
    const parent = delivery(monitor, "quality-check", null, "parent");
    const child = delivery(monitor, "repair", parent.deliveryId, "child");
    const pending = applyLoopDelivery(createLoopMonitorProjection(partition, monitor), monitor, child);
    expect(pending.ok && pending.pending).toBe(true);
    const drained = applyLoopDelivery(accepted(pending), monitor, parent);
    expect(drained.ok && drained.projection.chainHead).toBe(child.deliveryId);
    expect(drained.ok && drained.projection.pending).toEqual([]);
    expect(drained.ok && drained.projection.matchedPrefix).toBe(2);
  });

  test("fails closed on a causal fork, pending overflow, and an unknown transition", () => {
    const monitor = compiled(2, 1);
    const start = createLoopMonitorProjection(partition, monitor);
    const parent = delivery(monitor, "quality-check", null, "parent");
    const afterParent = accepted(applyLoopDelivery(start, monitor, parent));
    const first = delivery(monitor, "repair", parent.deliveryId, "first");
    const afterFirst = accepted(applyLoopDelivery(afterParent, monitor, first));
    const fork = delivery(monitor, "workflow-exit", parent.deliveryId, "fork");
    expect(applyLoopDelivery(afterFirst, monitor, fork)).toMatchObject({
      ok: false,
      status: "CONFLICT",
      reason: "causal-fork",
    });

    const missing1 = delivery(monitor, "repair", "delivery-missing-1", "missing-1");
    const onePending = accepted(applyLoopDelivery(start, monitor, missing1));
    const missing2 = delivery(monitor, "repair", "delivery-missing-2", "missing-2");
    expect(applyLoopDelivery(onePending, monitor, missing2)).toMatchObject({
      ok: false,
      status: "INCOMPLETE",
      reason: "pending-overflow",
    });

    const unknown = delivery(monitor, "not-declared", null, "unknown");
    expect(applyLoopDelivery(start, monitor, unknown)).toMatchObject({
      ok: false,
      status: "CONFLICT",
      reason: "unknown-event",
    });
  });
});
