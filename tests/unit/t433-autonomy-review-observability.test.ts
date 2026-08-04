// covers: file:packages/framework/core/tools/amadeus-autonomy-review.ts
// covers: audit:AUTO_DECISION_REVIEWED

import { describe, expect, test } from "bun:test";

import {
  bindHumanReviewCommand,
  canonicalContractValueDigest,
  createMemoryAutonomyReviewService,
  evaluateReviewHarnessSuite,
  projectMachineReviewStatus,
  projectReviewTelemetry,
  REQUIRED_REVIEW_HARNESSES,
  type HumanReviewCommandBinding,
  type ReviewIntentSeed,
} from "../../packages/framework/core/tools/amadeus-autonomy-review.ts";
import {
  autonomyDigest,
  createAutonomyProjection,
  type AutoDecisionRecord,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const ACTIVE = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const COMPLETED = "019fc5ac-f0bb-7a5f-8a64-c944b6f76aee";

function decision(intentUuid: string, suffix: string, reviewable = true): AutoDecisionRecord {
  return {
    decisionId: `decision-${suffix}`,
    occurrenceId: `occurrence-${suffix}`,
    question: `Choose ${suffix}?`,
    optionIds: ["accept", "reject"],
    selectedOptionId: "accept",
    decider: reviewable ? "solo-election" : "deterministic-engine",
    basisKind: reviewable ? "solo-election" : "confirmed-policy",
    basisFingerprint: autonomyDigest([intentUuid, suffix]),
    principalId: "principal-1",
    actorId: "core-engine-1",
    grantId: reviewable ? "grant-1" : null,
    degradedCapability: null,
    reviewState: reviewable ? "unreviewed" : "not-applicable",
  };
}

function seed(
  intentUuid: string,
  lifecycle: "active" | "completed",
  decisions: readonly AutoDecisionRecord[],
  auditRevision = 4,
): ReviewIntentSeed {
  const autonomy = createAutonomyProjection({ intentUuid });
  return {
    intentUuid,
    lifecycle,
    autonomy: { ...autonomy, autoDecisions: decisions, projectionRevision: auditRevision },
    auditRevision,
    completionSealDigest: lifecycle === "completed" ? autonomyDigest([intentUuid, "seal"]) : null,
  };
}

function binding(choice: "accept" | "flag" = "accept", classification: HumanReviewCommandBinding["flagClassification"] = null) {
  return bindHumanReviewCommand({
    sourceIntentUuid: ACTIVE,
    targetIntentUuid: COMPLETED,
    decisionId: "decision-completed",
    choice,
    commandOccurrenceId: `review-${choice}`,
    flagClassification: classification,
    safeNoteDigest: choice === "flag" ? autonomyDigest("safe-note") : null,
    sourceHumanTurnId: `turn-${choice}`,
  });
}

describe("autonomy decision read model", () => {
  test("lists only eligible unreviewed decisions for active and completed intents", () => {
    const service = createMemoryAutonomyReviewService({
      intents: [
        seed(ACTIVE, "active", [decision(ACTIVE, "active"), decision(ACTIVE, "policy", false)]),
        seed(COMPLETED, "completed", [decision(COMPLETED, "completed")]),
      ],
    });

    const active = service.listAutoDecisions({ intentUuid: ACTIVE, lifecycle: "active", reviewState: "unreviewed", pageSize: 10 });
    const completed = service.listAutoDecisions({ intentUuid: COMPLETED, lifecycle: "completed", reviewState: "unreviewed", pageSize: 10 });
    expect(active.ok && active.value.items.map((item) => item.decisionId)).toEqual(["decision-active"]);
    expect(completed.ok && completed.value.items.map((item) => item.decisionId)).toEqual(["decision-completed"]);
  });

  test("binds cursors to one immutable snapshot and rejects drift", () => {
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [decision(ACTIVE, "a"), decision(ACTIVE, "b")])],
    });
    const first = service.listAutoDecisions({ intentUuid: ACTIVE, lifecycle: "active", reviewState: "unreviewed", pageSize: 1 });
    if (!first.ok) throw new Error(JSON.stringify(first.error));
    expect(first.value.nextCursor).not.toBeNull();
    if (first.value.nextCursor === null) throw new Error("expected a next cursor");
    service.replaceIntent(seed(ACTIVE, "active", [decision(ACTIVE, "a"), decision(ACTIVE, "b"), decision(ACTIVE, "c")]));
    const stale = service.listAutoDecisions({
      intentUuid: ACTIVE,
      lifecycle: "active",
      reviewState: "unreviewed",
      pageSize: 1,
      cursor: first.value.nextCursor,
    });
    expect(stale).toEqual({ ok: false, error: { code: "CONFLICT", locus: "cursorSnapshot", detail: "decision snapshot changed" } });
  });

  test("returns redacted detail without exposing a raw evidence payload", () => {
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [decision(ACTIVE, "active")])],
      redactor: {
        redact: (_kind, value) => ({ value: value.normalize("NFC"), status: "redacted" }),
      },
    });
    const detail = service.getAutoDecision(ACTIVE, "decision-active");
    expect(detail.ok && detail.value.safeQuestion).toBe("Choose active?");
    expect(detail.ok && detail.value.evidence[0]?.evidenceFingerprint).toBe(autonomyDigest([ACTIVE, "active"]));
    expect(detail.ok && JSON.stringify(detail.value)).not.toContain("rawPayload");
  });
});

describe("real-human review append", () => {
  test("accepts an active decision only from a real turn in the same Intent", () => {
    const activeBinding = bindHumanReviewCommand({
      sourceIntentUuid: ACTIVE,
      targetIntentUuid: ACTIVE,
      decisionId: "decision-active",
      choice: "accept",
      commandOccurrenceId: "review-active",
      flagClassification: null,
      safeNoteDigest: null,
      sourceHumanTurnId: "turn-active",
    });
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [decision(ACTIVE, "active")], 7)],
      humanTurns: [{
        sourceIntentUuid: ACTIVE,
        lifecycle: "active",
        sourceAuditRevision: 7,
        sourceHumanTurnId: "turn-active",
        sourceHumanTurnEventId: "human-event-active",
        principalId: "human-1",
        binding: activeBinding,
      }],
    });
    const authorization = service.authorizeHumanReview({
      command: activeBinding.command,
      sourceHumanTurnId: "turn-active",
      sourceHumanTurnEventId: "human-event-active",
    });
    if (!authorization.ok) throw new Error(authorization.error.code);
    const reviewed = service.appendDecisionReview({
      targetIntentUuid: ACTIVE,
      decisionId: "decision-active",
      choice: "accept",
      expectedTargetAuditRevision: 7,
      expectedCompletionSealDigest: null,
      humanAuthorization: authorization.value,
    });
    expect(reviewed).toMatchObject({ ok: true, value: { state: "accepted", remediation: null } });
    expect(service.readIntent(ACTIVE)).toMatchObject({ auditRevision: 8, reviewExtensionHead: null });
  });

  test("flags a completed decision while preserving its seal and only suggesting self-fix", () => {
    const reviewBinding = binding("flag", "contract-defect");
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [], 7), seed(COMPLETED, "completed", [decision(COMPLETED, "completed")])],
      humanTurns: [{
        sourceIntentUuid: ACTIVE,
        lifecycle: "active",
        sourceAuditRevision: 7,
        sourceHumanTurnId: "turn-flag",
        sourceHumanTurnEventId: "human-event-flag",
        principalId: "human-1",
        binding: reviewBinding,
      }],
    });
    const authorization = service.authorizeHumanReview({
      command: reviewBinding.command,
      sourceHumanTurnId: "turn-flag",
      sourceHumanTurnEventId: "human-event-flag",
    });
    expect(authorization.ok).toBe(true);
    if (!authorization.ok) return;
    const before = service.readIntent(COMPLETED);
    const reviewed = service.appendDecisionReview({
      targetIntentUuid: COMPLETED,
      decisionId: "decision-completed",
      choice: "flag",
      expectedTargetAuditRevision: 4,
      expectedCompletionSealDigest: before?.completionSealDigest ?? null,
      humanAuthorization: authorization.value,
    });
    const after = service.readIntent(COMPLETED);
    expect(reviewed.ok && reviewed.value.state).toBe("flagged");
    expect(reviewed.ok && reviewed.value.remediation).toBe("self-fix");
    expect(after?.completionSealDigest).toBe(before?.completionSealDigest);
    expect(after?.lifecycle).toBe("completed");
    expect(after?.reviewExtensionHead).not.toBeNull();
    expect(service.createdIntentCount).toBe(0);

    const snapshot = service.exportSnapshot();
    const reloaded = createMemoryAutonomyReviewService({ snapshot });
    expect(reloaded.getAutoDecision(COMPLETED, "decision-completed")).toMatchObject({
      ok: true,
      value: { reviewState: "flagged", reviewReceipt: reviewed.ok ? reviewed.value : null },
    });
    expect(reloaded.readIntent(COMPLETED)?.completionSealDigest).toBe(before?.completionSealDigest);

    const tamperedValue = {
      ...snapshot.value,
      intents: snapshot.value.intents.map((intent) => intent.intentUuid === COMPLETED
        ? { ...intent, reviews: intent.reviews.map((event) => ({ ...event, payloadV1: "{}" })) }
        : intent),
    };
    const tamperedDigest = canonicalContractValueDigest("autonomy-review-persistence", tamperedValue);
    if (!tamperedDigest.ok) throw new Error(tamperedDigest.error.code);
    expect(() => createMemoryAutonomyReviewService({
      snapshot: { value: tamperedValue, digest: tamperedDigest.value },
    })).toThrow("invalid-autonomy-review-persistence-payload");
  });

  test("rejects synthetic provenance and leaves the target unreviewed", () => {
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [], 7), seed(COMPLETED, "completed", [decision(COMPLETED, "completed")])],
    });
    const reviewBinding = binding();
    const result = service.authorizeHumanReview({
      command: reviewBinding.command,
      sourceHumanTurnId: "synthetic-turn",
      sourceHumanTurnEventId: "synthetic-event",
    });
    expect(result.ok).toBe(false);
    expect(service.getAutoDecision(COMPLETED, "decision-completed")).toMatchObject({
      ok: true,
      value: { reviewState: "unreviewed" },
    });
  });

  test("is idempotent for the same choice and rejects a conflicting terminal choice", () => {
    const acceptBinding = binding("accept");
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [], 7), seed(COMPLETED, "completed", [decision(COMPLETED, "completed")])],
      humanTurns: [{
        sourceIntentUuid: ACTIVE,
        lifecycle: "active",
        sourceAuditRevision: 7,
        sourceHumanTurnId: "turn-accept",
        sourceHumanTurnEventId: "human-event-accept",
        principalId: "human-1",
        binding: acceptBinding,
      }],
    });
    const authorization = service.authorizeHumanReview({
      command: acceptBinding.command,
      sourceHumanTurnId: "turn-accept",
      sourceHumanTurnEventId: "human-event-accept",
    });
    if (!authorization.ok) throw new Error(authorization.error.code);
    const command = {
      targetIntentUuid: COMPLETED,
      decisionId: "decision-completed",
      choice: "accept" as const,
      expectedTargetAuditRevision: 4,
      expectedCompletionSealDigest: service.readIntent(COMPLETED)?.completionSealDigest ?? null,
      humanAuthorization: authorization.value,
    };
    const first = service.appendDecisionReview(command);
    const again = service.appendDecisionReview(command);
    expect(first).toEqual(again);
    const conflict = service.appendDecisionReview({ ...command, choice: "flag" });
    expect(conflict).toMatchObject({ ok: false, error: { code: "CONFLICT", locus: "reviewState" } });
  });
});

describe("status, telemetry and harness projection", () => {
  test("keeps completed workflow terminal while reporting an unreviewed queue", () => {
    const autonomy = createAutonomyProjection({ intentUuid: COMPLETED });
    const result = projectMachineReviewStatus({
      intentUuid: COMPLETED,
      lifecycle: "completed",
      autonomy,
      workflowResult: {
        outcome: "completed",
        reasonCode: null,
        retryable: false,
        intentUuid: COMPLETED,
        autonomyMode: "none",
        grant: null,
        evidenceFingerprint: null,
        resumeCondition: null,
        failureRef: null,
      },
      currentGrantScope: null,
      decisionPolicyCount: 0,
      decisionCounts: { total: 1, unreviewed: 1, accepted: 0, flagged: 0 },
      reviewExtensionHead: null,
      legacyDiagnostic: null,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { lifecycle: "completed", workflowExecutionState: "running", grant: null, unreviewedDecisionCount: 1 },
    });
  });

  test("projects only safe registry/OTel provenance", () => {
    const attributes = projectReviewTelemetry({
      intentUuid: COMPLETED,
      decisionId: "decision-completed",
      reviewId: "review-1",
      choice: "flag",
      lifecycleAtReview: "completed",
      reviewPrincipalRef: "human-1",
      reviewActorRef: "human-1",
      sourceHumanTurnId: "turn-1",
      decisionPrincipalRef: "principal-1",
      decisionActorRef: "core-engine-1",
      decisionSource: "solo-election",
      safeBasisDigest: autonomyDigest("basis"),
      grantId: "grant-1",
      safeNoteDigest: autonomyDigest("note"),
      redactionStatus: "redacted",
      auditTransactionId: "transaction-1",
      traceId: "trace-1",
      spanId: "span-1",
    });
    expect(attributes["amadeus.review.choice"]).toBe("flag");
    expect(JSON.stringify(attributes)).not.toContain("question");
    expect(JSON.stringify(attributes)).not.toContain("credential");
  });

  test("requires each current harness exactly once without harness-specific algorithms", () => {
    const receipts = REQUIRED_REVIEW_HARNESSES.map((harnessId) => ({
      harnessId,
      fixtureId: "fixture-1",
      contractRevision: autonomyDigest("contract-v1"),
      passed: true,
      caseResults: [],
    }));
    expect(evaluateReviewHarnessSuite("fixture-1", autonomyDigest("contract-v1"), receipts)).toMatchObject({
      ok: true,
      value: { passed: true, requiredHarnesses: REQUIRED_REVIEW_HARNESSES },
    });
    expect(evaluateReviewHarnessSuite("fixture-1", autonomyDigest("contract-v1"), receipts.slice(1))).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "requiredHarnesses" },
    });
  });
});
