// covers: file:packages/framework/core/tools/amadeus-quality-repair.ts
// size: medium

import { describe, expect, test } from "bun:test";

import {
  collectQualityObservations,
  createFirstPartyQualityContribution,
  createQualityEpochProjection,
  emptyQualityPluginProjection,
  normalizeQualityEvidence,
  planNoneModeQualitySetting,
  planQualityDelivery,
  recordQualityReplan,
  resolveQualityPluginActivation,
  type QualityEvidenceBatchInput,
  type QualityEvidenceSnapshot,
  type QualityObservation,
} from "../../packages/framework/core/tools/amadeus-quality-repair.ts";

const scope = {
  intentUuid: "intent-1",
  monitorId: "quality-repair",
  stageInstanceId: "code-generation-1",
  boltId: "bolt-2",
  graphRevision: "sha256:graph-1",
};

function reviewer(blockerIds: readonly string[]): QualityObservation {
  return {
    kind: "reviewer",
    invocationId: "review-1",
    verifierId: "architecture-reviewer",
    validationReceipt: `sha256:${"a".repeat(64)}`,
    verdict: blockerIds.length === 0 ? "READY" : "NOT READY",
    blockers: blockerIds.map((id) => ({
      findingId: id,
      artifactId: "code-summary",
      failureFingerprint: `sha256:${id.charCodeAt(0).toString(16).padStart(2, "0").repeat(32)}`,
    })),
  };
}

function batch(
  observations: readonly QualityObservation[],
  previousSnapshot: QualityEvidenceSnapshot | null = null,
): QualityEvidenceBatchInput {
  return {
    ...scope,
    providerId: "quality-evidence-v1",
    previousSnapshot,
    observations,
  };
}

function snapshot(
  blockerIds: readonly string[],
  previousSnapshot: QualityEvidenceSnapshot | null = null,
): QualityEvidenceSnapshot {
  const result = normalizeQualityEvidence(batch([reviewer(blockerIds)], previousSnapshot));
  if (!result.ok) throw new Error(result.error.message);
  return result.snapshot;
}

describe("first-party Quality Repair contribution", () => {
  test("fails closed by mode and only accepts a real none-mode human opt-in", () => {
    const contribution = createFirstPartyQualityContribution(2);
    const initial = emptyQualityPluginProjection("intent-1");
    expect(resolveQualityPluginActivation({ mode: "none", projection: initial, contribution })).toEqual({
      kind: "disabled",
      reason: "none-default-off",
    });
    expect(resolveQualityPluginActivation({ mode: "semi", projection: initial, contribution: null })).toMatchObject({
      kind: "error",
      error: { code: "ACTIVATION_FAILED" },
    });
    expect(planNoneModeQualitySetting(initial, true, null)).toMatchObject({
      ok: false,
      error: { code: "PROVENANCE_REQUIRED" },
    });

    const optedIn = planNoneModeQualitySetting(initial, true, {
      verified: true,
      eventType: "HUMAN_TURN",
      turnId: "turn-1",
    });
    expect(optedIn.ok).toBe(true);
    if (!optedIn.ok) return;
    const active = resolveQualityPluginActivation({ mode: "none", projection: optedIn.projection, contribution });
    expect(active.kind).toBe("active");
    if (active.kind !== "active") return;
    expect(active.graph.loopMonitors[0]?.threshold).toBe(2);
    expect(active.contribution.requiredOutputs).toEqual([]);
    expect(active.graph.loopMonitors[0]?.routes.map((route) => route.id)).toEqual([
      "repair",
      "replan",
      "repair-stalled",
    ]);
  });
});

describe("blocking evidence normalization", () => {
  test("normalizes only declared blocking sources and computes canonical deltas", () => {
    const observations = collectQualityObservations([
      reviewer(["blocker-a"]),
      {
        kind: "sensor",
        sensorId: "advisory-lint",
        blocking: false,
        status: "failed",
        outputId: "lint-output",
        terminalReceipt: `sha256:${"b".repeat(64)}`,
      },
      {
        kind: "sensor",
        sensorId: "type-check",
        blocking: true,
        status: "incomplete",
        outputId: "typecheck-output",
        terminalReceipt: null,
      },
      {
        kind: "produce",
        outputId: "code-summary",
        required: true,
        status: "missing",
        verifierId: "artifact-verifier",
        receipt: null,
      },
      {
        kind: "condition",
        conditionKind: "completion",
        conditionId: "tests-green",
        status: "unsatisfied",
        verifierId: "test-runner",
        receipt: `sha256:${"c".repeat(64)}`,
      },
      { kind: "human-request-changes", turnId: "turn-2" },
    ]);
    expect(observations).toHaveLength(5);
    const first = normalizeQualityEvidence(batch(observations));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.snapshot.unresolved.map(
      (item) => `${item.sourceCategory}:${item.failureKind}`,
    ).sort()).toEqual([
      "completion:unmet",
      "produce:missing",
      "reviewer:blocker",
      "sensor:evidence-incomplete",
    ]);
    expect(first.snapshot.addedIds).toEqual(first.snapshot.unresolved.map((item) => item.obligationId));

    const second = normalizeQualityEvidence(batch([reviewer([])], first.snapshot));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.snapshot.unresolved).toEqual([]);
    expect(second.snapshot.resolvedIds).toEqual(first.snapshot.unresolved.map((item) => item.obligationId));
  });

  test("rejects cross-scope previous evidence instead of inventing obligations", () => {
    const previous = snapshot(["blocker-a"]);
    const result = normalizeQualityEvidence({
      ...batch([reviewer(["blocker-a"])], previous),
      graphRevision: "sha256:other",
    });
    expect(result).toMatchObject({ ok: false, error: { code: "SCOPE_MISMATCH" } });
  });
});

describe("bounded convergence", () => {
  test("uses T+1 snapshots, replans first, and stalls only after the post-replan threshold", () => {
    const first = snapshot(["blocker-a"]);
    const second = snapshot(["blocker-a"], first);
    const third = snapshot(["blocker-a"], second);
    let epoch = createQualityEpochProjection(first, 2);

    const initial = planQualityDelivery(epoch, first);
    expect(initial.progress.kind).toBe("initial");
    epoch = initial.nextProjection;
    const collecting = planQualityDelivery(epoch, second);
    expect(collecting.progress).toMatchObject({ kind: "collecting", consecutiveNonProgress: 1 });
    epoch = collecting.nextProjection;
    const threshold = planQualityDelivery(epoch, third);
    expect(threshold.progress).toMatchObject({
      kind: "threshold",
      pattern: "fixed-point",
      requiredRoute: "replan",
    });
    expect(threshold.routeIds).toEqual(["replan"]);

    epoch = recordQualityReplan(threshold.nextProjection, {
      judgeInvocationId: "judge-1",
      planDigest: `sha256:${"d".repeat(64)}`,
      agentId: "repair-agent",
      contextId: "fresh-context-1",
    }).nextProjection;
    expect(epoch).toMatchObject({ consecutiveNonProgress: 0, replanSinceLastProgress: true });

    const fourth = snapshot(["blocker-a"], third);
    const fifth = snapshot(["blocker-a"], fourth);
    epoch = planQualityDelivery(epoch, fourth).nextProjection;
    const stalled = planQualityDelivery(epoch, fifth);
    expect(stalled.progress).toMatchObject({
      kind: "threshold",
      pattern: "fixed-point",
      requiredRoute: "repair-stalled",
    });
    expect(stalled.routeIds).toEqual(["repair-stalled"]);
    expect(stalled.nextProjection.window).toHaveLength(3);
  });

  test("strict subset progress resets the counter and replan flag", () => {
    const first = snapshot(["blocker-a", "blocker-b"]);
    const same = snapshot(["blocker-a", "blocker-b"], first);
    const reduced = snapshot(["blocker-a"], same);
    let epoch = createQualityEpochProjection(first, 2);
    epoch = planQualityDelivery(epoch, first).nextProjection;
    epoch = planQualityDelivery(epoch, same).nextProjection;
    epoch = { ...epoch, replanSinceLastProgress: true };
    const progress = planQualityDelivery(epoch, reduced);
    expect(progress.progress.kind).toBe("strict-progress");
    expect(progress.nextProjection).toMatchObject({
      consecutiveNonProgress: 0,
      replanSinceLastProgress: false,
    });
  });
});
