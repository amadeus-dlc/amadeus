// covers: file:packages/framework/core/tools/amadeus-loop-monitor.ts, audit:LOOP_MONITOR_TRANSACTION_COMMITTED
// size: medium

import { describe, expect, test } from "bun:test";

import {
  applyLoopDelivery,
  compileLoopMonitorManifest,
  createJudgeRouteConstraint,
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

  test("rejects malformed manifest and contribution boundaries", () => {
    const manifestCases: readonly [string, unknown, string, string][] = [
      ["non-object manifest", null, "$", "manifest must be an object"],
      ["empty monitor list", { ...manifest(), loopMonitors: [] }, "loopMonitors", "must be a non-empty array"],
      ["invalid runtime limits", { ...manifest(), runtimeLimits: null }, "runtimeLimits", "must be an object"],
      ["non-object monitor", { ...manifest(), loopMonitors: [null] }, "loopMonitors[0]", "must be an object"],
      ["empty monitor id", { ...manifest(), loopMonitors: [{ ...monitorSpec(), id: "" }] }, "loopMonitors[0].id", "must be a non-empty string"],
      ["invalid cycle item", { ...manifest(), loopMonitors: [{ ...monitorSpec(), cycle: [""] }] }, "loopMonitors[0].cycle", "must be an array of non-empty strings"],
      ["empty transition table", { ...manifest(), loopMonitors: [{ ...monitorSpec(), transitionTable: {} }] }, "loopMonitors[0].transitionTable", "must be a non-empty transition object"],
      [
        "empty transition id",
        {
          ...manifest(),
          loopMonitors: [{
            ...monitorSpec(),
            transitionTable: { "": [], "quality-check": ["repair"], repair: ["quality-check"] },
          }],
        },
        "loopMonitors[0].transitionTable",
        "transition event id must not be empty",
      ],
      [
        "missing cycle transition row",
        {
          ...manifest(),
          loopMonitors: [{ ...monitorSpec(), transitionTable: { "quality-check": ["repair"] } }],
        },
        "loopMonitors[0].transitionTable",
        'cycle event "repair" has no transition row',
      ],
      [
        "unknown next transition",
        {
          ...manifest(),
          loopMonitors: [{
            ...monitorSpec(),
            transitionTable: { "quality-check": ["missing"], repair: ["quality-check"] },
          }],
        },
        "loopMonitors[0].transitionTable.quality-check",
        'unknown transition event "missing"',
      ],
      [
        "duplicate monitor id",
        { ...manifest(), loopMonitors: [monitorSpec(), monitorSpec()] },
        "loopMonitors",
        "monitor ids must be unique",
      ],
    ];
    for (const [label, value, path, message] of manifestCases) {
      const result = compileLoopMonitorManifest(value, contributions);
      expect(result.ok, label).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((item) => item.path === path && item.message.includes(message)), label).toBe(true);
      }
    }

    const contributionCases: readonly [string, LoopMonitorContributions, string, string][] = [
      [
        "invalid descriptor id",
        { ...contributions, evidenceProviders: [{ id: "" }] },
        "contributions.evidenceProviders[0]",
        "descriptor id must be a non-empty string",
      ],
      [
        "duplicate descriptor id",
        { ...contributions, evidenceProviders: [{ id: "quality-summary" }, { id: "quality-summary" }] },
        "contributions.evidenceProviders[1].id",
        'duplicate descriptor "quality-summary"',
      ],
      [
        "invalid route kind",
        {
          ...contributions,
          routes: [{ id: "repair", kind: "invalid" } as never, ...contributions.routes.slice(1)],
        },
        "contributions.routes[0].kind",
        "route kind must be transition or park",
      ],
      [
        "missing Judge instruction",
        { ...contributions, judgeInstructions: [] },
        "loopMonitors[0].judgeInstructionId",
        'unknown Judge instruction "quality-judge"',
      ],
      [
        "missing route",
        { ...contributions, routes: contributions.routes.filter((route) => route.id !== "replan") },
        "loopMonitors[0].routes[1]",
        'unknown route "replan"',
      ],
      [
        "route target without transition row",
        {
          ...contributions,
          routes: contributions.routes.map((route) => route.id === "replan"
            ? { ...route, targetEvent: "missing-transition" }
            : route),
        },
        "loopMonitors[0].routes[1]",
        'route target "missing-transition" has no transition row',
      ],
    ];
    for (const [label, candidate, path, message] of contributionCases) {
      const result = compileLoopMonitorManifest(manifest(), candidate);
      expect(result.ok, label).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((item) => item.path === path && item.message.includes(message)), label).toBe(true);
      }
    }
  });

  test("treats constructor as a transition event only when it is an own row", () => {
    const constructorContributions: LoopMonitorContributions = {
      evidenceProviders: contributions.evidenceProviders,
      judgeInstructions: contributions.judgeInstructions,
      routes: [{ id: "constructor-route", kind: "transition", targetEvent: "constructor" }],
    };
    const missingRow = compileLoopMonitorManifest({
      ...manifest(),
      loopMonitors: [{
        ...monitorSpec(),
        cycle: ["constructor"],
        ignoreEvents: [],
        routes: ["constructor-route"],
        transitionTable: { repair: [] },
      }],
    }, constructorContributions);
    expect(missingRow.ok).toBe(false);
    if (!missingRow.ok) {
      expect(missingRow.errors.map((item) => item.message)).toContain(
        'cycle event "constructor" has no transition row',
      );
      expect(missingRow.errors.map((item) => item.message)).toContain(
        'route target "constructor" has no transition row',
      );
    }

    const declared = compileLoopMonitorManifest({
      ...manifest(),
      loopMonitors: [{
        ...monitorSpec(),
        cycle: ["constructor"],
        ignoreEvents: [],
        routes: ["constructor-route"],
        transitionTable: { constructor: ["constructor"] },
      }],
    }, constructorContributions);
    expect(declared.ok).toBe(true);
    if (declared.ok) {
      expect(Object.getPrototypeOf(declared.graph.loopMonitors[0]!.transitionTable)).toBeNull();
      expect(Object.hasOwn(declared.graph.loopMonitors[0]!.transitionTable, "constructor")).toBe(true);
    }

    const monitor = compiled();
    const constructorDelivery = delivery(monitor, "constructor", null, "constructor-event");
    expect(applyLoopDelivery(createLoopMonitorProjection(partition, monitor), monitor, constructorDelivery)).toEqual({
      ok: false,
      status: "CONFLICT",
      reason: "unknown-event",
    });
  });
});

describe("loop monitor delivery reducer", () => {
  test("admits a content-bound non-empty route subset without quality-specific branching", () => {
    const monitor = compiled();
    const replanOnly = createJudgeRouteConstraint(monitor, ["replan"]);
    expect(replanOnly.routeIds).toEqual(["replan"]);
    expect(replanOnly.fingerprint).not.toBe(monitor.routeConstraint.fingerprint);

    const constrained = createLoopDelivery({
      ...delivery(monitor, "quality-check", null, "subset-route"),
      routeConstraint: replanOnly,
    });
    expect(applyLoopDelivery(createLoopMonitorProjection(partition, monitor), monitor, constrained).ok).toBe(true);
    expect(() => createJudgeRouteConstraint(monitor, [])).toThrow("loop-monitor-route-constraint-empty");
    expect(() => createJudgeRouteConstraint(monitor, ["unknown"])).toThrow(
      "loop-monitor-route-constraint-unknown-route",
    );
  });

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

  test("reserves another Judge after the threshold while no reservation is pending", () => {
    const monitor = compiled(1);
    let projection = createLoopMonitorProjection(partition, monitor);
    const q1 = delivery(monitor, "quality-check", null, "retry-q1");
    projection = accepted(applyLoopDelivery(projection, monitor, q1));
    const r1 = delivery(monitor, "repair", q1.deliveryId, "retry-r1");
    projection = accepted(applyLoopDelivery(projection, monitor, r1));
    const q2 = delivery(monitor, "quality-check", r1.deliveryId, "retry-q2");
    const firstReservation = applyLoopDelivery(projection, monitor, q2);
    expect(firstReservation.ok && firstReservation.judgeReservation).not.toBeNull();
    if (!firstReservation.ok) return;

    projection = { ...firstReservation.projection, pendingJudge: null };
    const r2 = delivery(monitor, "repair", q2.deliveryId, "retry-r2");
    projection = accepted(applyLoopDelivery(projection, monitor, r2));
    const q3 = delivery(monitor, "quality-check", r2.deliveryId, "retry-q3");
    const secondReservation = applyLoopDelivery(projection, monitor, q3);
    expect(secondReservation.ok && secondReservation.judgeReservation).not.toBeNull();
    expect(secondReservation.ok && secondReservation.projection.cycleCount).toBe(2);
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

  test("fails closed on unsafe trace, partition, route constraint, and transition boundaries", () => {
    const monitor = compiled();
    expect(() => createLoopDelivery({
      partition,
      eventId: "quality-check",
      predecessorDeliveryId: null,
      upstreamEventIdentity: "unsafe-trace",
      payloadFingerprint: `sha256:${"b".repeat(64)}`,
      payload: { stageId: "code-generation", references: [] },
      evidence,
      routeConstraint: monitor.routeConstraint,
      trace: { ...trace, traceId: "invalid" },
    })).toThrow("unsafe-loop-delivery:trace");

    const start = createLoopMonitorProjection(partition, monitor);
    const first = delivery(monitor, "quality-check", null, "boundary-first");
    expect(applyLoopDelivery(start, monitor, {
      ...first,
      partition: { ...partition, intentUuid: "another-intent" },
    })).toMatchObject({ ok: false, status: "CONFLICT", reason: "partition-mismatch" });
    expect(applyLoopDelivery(start, monitor, {
      ...first,
      routeConstraint: { ...first.routeConstraint, fingerprint: `sha256:${"f".repeat(64)}` },
    })).toMatchObject({ ok: false, status: "CONFLICT", reason: "route-constraint-mismatch" });

    const afterFirst = accepted(applyLoopDelivery(start, monitor, first));
    const invalidTransition = delivery(
      monitor,
      "quality-check",
      first.deliveryId,
      "invalid-transition",
    );
    expect(applyLoopDelivery(afterFirst, monitor, invalidTransition)).toMatchObject({
      ok: false,
      status: "CONFLICT",
      reason: "invalid-transition",
    });
  });
});
