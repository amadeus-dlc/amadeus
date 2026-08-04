// covers: file:packages/framework/core/tools/amadeus-autonomy-review.ts, file:packages/framework/core/tools/amadeus-autonomy-review-production.ts
// covers: audit:AUTO_DECISION_REVIEWED

import { describe, expect, test } from "bun:test";

import {
  bindHumanReviewCommand,
  canonicalContractValueDigest,
  createMemoryAutonomyReviewService,
  evaluateReviewHarnessSuite,
  projectHumanReviewStatus,
  projectMachineReviewStatus,
  projectReviewTelemetry,
  REQUIRED_REVIEW_HARNESSES,
  reviewAuditFields,
  type HumanReviewCommandBinding,
  type ReviewIntentSeed,
  type ReviewStatusInput,
} from "../../packages/framework/core/tools/amadeus-autonomy-review.ts";
import {
  autonomyDigest,
  createAutonomyProjection,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  planHumanAutonomyCommand,
  type AutoDecisionRecord,
  type GrantScopeDescriptor,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  commitProductionQuestionDecision,
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  commitProductionDecisionReview,
  getProductionAutoDecision,
  listProductionAutoDecisions,
} from "../../packages/framework/core/tools/amadeus-autonomy-review-production.ts";
import {
  transitionIntentStatusLocked,
  withLockedIntentRegistry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { emitAuditEventGuarded } from "../../packages/framework/core/otel/audit-emit.ts";
import {
  resetObservabilityConfigCache,
  resolveObservabilityConfig,
} from "../../packages/framework/core/tools/amadeus-observability.ts";
import {
  cleanupTestProject,
  DEFAULT_INTENT_UUID,
  DEFAULT_RECORD_DIR,
  setupIntegrationProject,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const ACTIVE = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const COMPLETED = "019fc5ac-f0bb-7a5f-8a64-c944b6f76aee";
const OTHER_ACTIVE = "019fc5ac-f0bb-7a5f-8a64-c944b6f76aef";

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

function activeStatusInput(overrides: Partial<ReviewStatusInput> = {}): ReviewStatusInput {
  return {
    intentUuid: ACTIVE,
    lifecycle: "active",
    autonomy: createAutonomyProjection({ intentUuid: ACTIVE }),
    workflowResult: null,
    currentGrantScope: null,
    decisionPolicyCount: 0,
    decisionCounts: { total: 3, unreviewed: 1, accepted: 1, flagged: 1 },
    reviewExtensionHead: null,
    legacyDiagnostic: null,
    ...overrides,
  };
}

function fullStatusInput(): ReviewStatusInput {
  const initial = createAutonomyProjection({ intentUuid: ACTIVE });
  const scope: GrantScopeDescriptor = {
    intentUuid: ACTIVE,
    scopeId: "self-feature",
    scopeFingerprint: autonomyDigest("self-feature"),
    normFingerprint: autonomyDigest("norm-v1"),
    allowedInteractionKinds: ["stage-gate", "phase-gate", "walking-skeleton", "question"],
    permissionBoundaryFingerprint: autonomyDigest("host-policy"),
    prohibitedEffects: ["new-permission", "irreversible", "scope-out", "norm-waiver", "quality-waiver"],
  };
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: scope.scopeFingerprint,
    humanTurnId: "human-turn-1",
    policies: [{ sourceText: "Prefer the accepted option", selector: "selector-1", optionId: "accept" }],
  });
  const confirmedDisplayDigest = grantIssuanceDisplayDigest({
    intentUuid: ACTIVE,
    principalId: "principal-1",
    scope,
    policies,
  });
  const plan = planHumanAutonomyCommand(initial, { kind: "issue-full", scope, policies }, {
    targetIntentUuid: ACTIVE,
    principalId: "principal-1",
    humanTurn: { verified: true, eventType: "HUMAN_TURN", turnId: "human-turn-1" },
    commandOccurrenceId: "command-1",
    expectedProjectionRevision: initial.projectionRevision,
    confirmedDisplayDigest,
  });
  if (!plan.ok) throw new Error(plan.code);
  return activeStatusInput({
    autonomy: plan.after,
    currentGrantScope: {
      scopeFingerprint: scope.scopeFingerprint,
      selfScopeId: scope.scopeId,
      allowedInteractionKinds: scope.allowedInteractionKinds,
    },
    decisionPolicyCount: policies.length,
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
    const second = service.listAutoDecisions({
      intentUuid: ACTIVE,
      lifecycle: "active",
      reviewState: "unreviewed",
      pageSize: 1,
      cursor: first.value.nextCursor,
    });
    expect(second.ok && second.value.items.map((item) => item.decisionId)).toEqual(["decision-b"]);
    expect(service.listAutoDecisions({
      intentUuid: ACTIVE,
      lifecycle: "active",
      reviewState: "unreviewed",
      pageSize: 1,
      cursor: { ...first.value.nextCursor, cursorDigest: "tampered" },
    })).toMatchObject({ ok: false, error: { code: "MALFORMED", locus: "cursor" } });
    expect(service.listAutoDecisions({ intentUuid: ACTIVE, lifecycle: "active", pageSize: 0 })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED", locus: "pageSize" },
    });
    expect(service.listAutoDecisions({ intentUuid: ACTIVE, lifecycle: "completed", pageSize: 10 })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "lifecycle" },
    });
    expect(service.getAutoDecision(ACTIVE, "decision-missing")).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "decisionId" },
    });
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
    expect(service.appendDecisionReview({
      targetIntentUuid: ACTIVE,
      decisionId: "decision-active",
      choice: "accept",
      expectedTargetAuditRevision: 7,
      expectedCompletionSealDigest: autonomyDigest("unexpected-active-seal"),
      humanAuthorization: authorization.value,
    })).toMatchObject({ ok: false, error: { code: "MALFORMED", locus: "completionSealDigest" } });
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

    const events = service.readReviewEvents(COMPLETED);
    expect(events).toHaveLength(1);
    expect(reviewAuditFields(events[0]!)).toMatchObject({
      "Intent Uuid": COMPLETED,
      "Decision Id": "decision-completed",
      Choice: "flag",
      Lifecycle: "completed",
      "Review Principal": "human-1",
      "Review Actor": "human-1",
      "Source Human Turn": "turn-flag",
      "Decision Principal": "principal-1",
      "Decision Actor": "core-engine-1",
      "Decision Source": "solo-election",
      "Grant Id": "grant-1",
      Remediation: "self-fix",
      "Note Digest": autonomyDigest("safe-note"),
    });

    const tamperedValue = {
      ...snapshot.value,
      intents: snapshot.value.intents.map((intent) => intent.intentUuid === COMPLETED
        ? { ...intent, reviews: intent.reviews.map((event) => ({ ...event, payloadV1: "{}" })) }
        : intent),
    };
    const signedSnapshot = (value: typeof snapshot.value) => {
      const digest = canonicalContractValueDigest("autonomy-review-persistence", value);
      if (!digest.ok) throw new Error(digest.error.code);
      return { value, digest: digest.value };
    };
    expect(() => createMemoryAutonomyReviewService({ snapshot: signedSnapshot(tamperedValue) }))
      .toThrow("invalid-autonomy-review-persistence-payload");

    const invalidJsonValue = {
      ...snapshot.value,
      intents: snapshot.value.intents.map((intent) => intent.intentUuid === COMPLETED
        ? { ...intent, reviews: intent.reviews.map((event) => ({ ...event, payloadV1: "{" })) }
        : intent),
    };
    expect(() => createMemoryAutonomyReviewService({ snapshot: signedSnapshot(invalidJsonValue) }))
      .toThrow("invalid-autonomy-review-persistence-payload");

    const invalidIdentityValue = {
      ...snapshot.value,
      intents: snapshot.value.intents.map((intent) => intent.intentUuid === COMPLETED
        ? { ...intent, reviews: intent.reviews.map((event) => ({ ...event, eventIdentity: "review-event-tampered" })) }
        : intent),
    };
    expect(() => createMemoryAutonomyReviewService({ snapshot: signedSnapshot(invalidIdentityValue) }))
      .toThrow("invalid-autonomy-review-persistence-identity");

    const duplicateEventValue = {
      ...snapshot.value,
      intents: snapshot.value.intents.map((intent) => intent.intentUuid === COMPLETED
        ? { ...intent, reviews: [...intent.reviews, ...intent.reviews] }
        : intent),
    };
    expect(() => createMemoryAutonomyReviewService({ snapshot: signedSnapshot(duplicateEventValue) }))
      .toThrow("invalid-autonomy-review-persistence-events");

    const activeExtensionValue = {
      ...snapshot.value,
      intents: snapshot.value.intents.map((intent) => intent.intentUuid === COMPLETED
        ? { ...intent, lifecycle: "active" as const, completionSealDigest: null }
        : intent),
    };
    expect(() => createMemoryAutonomyReviewService({ snapshot: signedSnapshot(activeExtensionValue) }))
      .toThrow("invalid-autonomy-review-extension-snapshot");

    const completedExtensionValue = {
      ...snapshot.value,
      intents: snapshot.value.intents.map((intent) => intent.intentUuid === COMPLETED
        ? { ...intent, reviewExtensionHead: autonomyDigest("wrong-extension-head") }
        : intent),
    };
    expect(() => createMemoryAutonomyReviewService({ snapshot: signedSnapshot(completedExtensionValue) }))
      .toThrow("invalid-autonomy-review-extension-snapshot");
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

  test("rejects a human turn from another active Intent for an active target", () => {
    const crossIntentBinding = bindHumanReviewCommand({
      sourceIntentUuid: OTHER_ACTIVE,
      targetIntentUuid: ACTIVE,
      decisionId: "decision-active",
      choice: "accept",
      commandOccurrenceId: "review-cross-intent",
      flagClassification: null,
      safeNoteDigest: null,
      sourceHumanTurnId: "turn-cross-intent",
    });
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [decision(ACTIVE, "active")], 7), seed(OTHER_ACTIVE, "active", [], 7)],
      humanTurns: [{
        sourceIntentUuid: OTHER_ACTIVE,
        lifecycle: "active",
        sourceAuditRevision: 7,
        sourceHumanTurnId: "turn-cross-intent",
        sourceHumanTurnEventId: "human-event-cross-intent",
        principalId: "human-1",
        binding: crossIntentBinding,
      }],
    });
    const authorization = service.authorizeHumanReview({
      command: crossIntentBinding.command,
      sourceHumanTurnId: "turn-cross-intent",
      sourceHumanTurnEventId: "human-event-cross-intent",
    });
    if (!authorization.ok) throw new Error(authorization.error.code);
    expect(service.appendDecisionReview({
      targetIntentUuid: ACTIVE,
      decisionId: "decision-active",
      choice: "accept",
      expectedTargetAuditRevision: 7,
      expectedCompletionSealDigest: null,
      humanAuthorization: authorization.value,
    })).toMatchObject({ ok: false, error: { code: "PROVENANCE_REQUIRED", locus: "sourceIntentUuid" } });
  });

  test("is idempotent for the same choice and rejects a conflicting terminal choice", () => {
    const acceptBinding = binding("accept");
    const service = createMemoryAutonomyReviewService({
      intents: [
        seed(ACTIVE, "active", [], 7),
        seed(COMPLETED, "completed", [decision(COMPLETED, "completed"), decision(COMPLETED, "policy", false)]),
      ],
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
    expect(service.authorizeHumanReview({
      command: { ...acceptBinding.command, choice: "flag" },
      sourceHumanTurnId: "turn-accept",
      sourceHumanTurnEventId: "human-event-accept",
    })).toMatchObject({ ok: false, error: { code: "PROVENANCE_REQUIRED", locus: "commandBindingDigest" } });
    expect(service.appendDecisionReview({ ...command, decisionId: "decision-missing" })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "decisionId" },
    });
    expect(service.appendDecisionReview({ ...command, decisionId: "decision-policy" })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "reviewState" },
    });
    expect(service.appendDecisionReview({ ...command, choice: "flag" })).toMatchObject({
      ok: false,
      error: { code: "PROVENANCE_REQUIRED", locus: "humanAuthorization" },
    });
    expect(service.appendDecisionReview({ ...command, expectedTargetAuditRevision: 3 })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "targetAuditRevision" },
    });
    expect(service.appendDecisionReview({
      ...command,
      expectedCompletionSealDigest: autonomyDigest("wrong-completion-seal"),
    })).toMatchObject({ ok: false, error: { code: "CONFLICT", locus: "completionSealDigest" } });
    expect(service.appendDecisionReview({
      ...command,
      humanAuthorization: { ...authorization.value, sourceAuditRevision: 8 },
    })).toMatchObject({ ok: false, error: { code: "PROVENANCE_REQUIRED", locus: "sourceIntentUuid" } });
    const first = service.appendDecisionReview(command);
    const again = service.appendDecisionReview(command);
    expect(first).toEqual(again);
    const conflict = service.appendDecisionReview({ ...command, choice: "flag" });
    expect(conflict).toMatchObject({ ok: false, error: { code: "CONFLICT", locus: "reviewState" } });
  });

  test("maps an unspecified flag to an explicit repair-or-feature decision", () => {
    const reviewBinding = binding("flag", "unspecified");
    const service = createMemoryAutonomyReviewService({
      intents: [seed(ACTIVE, "active", [], 7), seed(COMPLETED, "completed", [decision(COMPLETED, "completed")])],
      humanTurns: [{
        sourceIntentUuid: ACTIVE,
        lifecycle: "active",
        sourceAuditRevision: 7,
        sourceHumanTurnId: "turn-flag",
        sourceHumanTurnEventId: "human-event-unspecified",
        principalId: "human-1",
        binding: reviewBinding,
      }],
    });
    const authorization = service.authorizeHumanReview({
      command: reviewBinding.command,
      sourceHumanTurnId: "turn-flag",
      sourceHumanTurnEventId: "human-event-unspecified",
    });
    if (!authorization.ok) throw new Error(authorization.error.code);
    expect(service.appendDecisionReview({
      targetIntentUuid: COMPLETED,
      decisionId: "decision-completed",
      choice: "flag",
      expectedTargetAuditRevision: 4,
      expectedCompletionSealDigest: service.readIntent(COMPLETED)?.completionSealDigest ?? null,
      humanAuthorization: authorization.value,
    })).toMatchObject({
      ok: true,
      value: { state: "flagged", remediation: "self-fix-with-feature-alternative" },
    });
  });

  test("rejects noncanonical values and accept commands carrying flag metadata", () => {
    expect(canonicalContractValueDigest("unsupported", Symbol("not-canonical"))).toMatchObject({
      ok: false,
      error: { code: "MALFORMED", locus: "canonicalValue" },
    });
    expect(() => bindHumanReviewCommand({
      sourceIntentUuid: ACTIVE,
      targetIntentUuid: COMPLETED,
      decisionId: "decision-completed",
      choice: "accept",
      commandOccurrenceId: "review-invalid-accept",
      flagClassification: "contract-defect",
      safeNoteDigest: null,
      sourceHumanTurnId: "turn-invalid-accept",
    })).toThrow("accept-review-cannot-carry-flag-metadata");
  });

  test("rejects malformed persistence boundaries and exports human turns deterministically", () => {
    expect(() => createMemoryAutonomyReviewService({
      intents: [{ ...seed(ACTIVE, "active", []), intentUuid: COMPLETED }],
    })).toThrow("invalid-review-intent-seed");

    const emptySnapshot = createMemoryAutonomyReviewService().exportSnapshot();
    expect(() => createMemoryAutonomyReviewService({
      snapshot: { ...emptySnapshot, digest: "tampered" },
    })).toThrow("invalid-autonomy-review-persistence-snapshot");

    const bindingA = bindHumanReviewCommand({
      sourceIntentUuid: ACTIVE,
      targetIntentUuid: COMPLETED,
      decisionId: "decision-completed",
      choice: "accept",
      commandOccurrenceId: "review-a",
      flagClassification: null,
      safeNoteDigest: null,
      sourceHumanTurnId: "turn-a",
    });
    const bindingB = bindHumanReviewCommand({
      sourceIntentUuid: ACTIVE,
      targetIntentUuid: COMPLETED,
      decisionId: "decision-completed",
      choice: "accept",
      commandOccurrenceId: "review-b",
      flagClassification: null,
      safeNoteDigest: null,
      sourceHumanTurnId: "turn-b",
    });
    const snapshot = createMemoryAutonomyReviewService({
      humanTurns: [
        {
          sourceIntentUuid: ACTIVE,
          lifecycle: "active",
          sourceAuditRevision: 1,
          sourceHumanTurnId: "turn-b",
          sourceHumanTurnEventId: "event-b",
          principalId: "human-1",
          binding: bindingB,
        },
        {
          sourceIntentUuid: ACTIVE,
          lifecycle: "active",
          sourceAuditRevision: 1,
          sourceHumanTurnId: "turn-a",
          sourceHumanTurnEventId: "event-a",
          principalId: "human-1",
          binding: bindingA,
        },
      ],
    }).exportSnapshot();
    expect(snapshot.value.humanTurns.map((turn) => turn.sourceHumanTurnEventId)).toEqual(["event-a", "event-b"]);
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

  test("rejects malformed status counts, lifecycle, grant scope, and autonomy state", () => {
    const malformed = [
      activeStatusInput({ intentUuid: COMPLETED }),
      activeStatusInput({ decisionPolicyCount: -1 }),
      activeStatusInput({ decisionCounts: { total: 1, unreviewed: 1, accepted: 1, flagged: 0 } }),
    ];
    for (const input of malformed) {
      expect(projectMachineReviewStatus(input)).toMatchObject({
        ok: false,
        error: { code: "MALFORMED", locus: "statusInput" },
      });
    }

    expect(projectMachineReviewStatus(activeStatusInput({
      autonomy: { ...createAutonomyProjection({ intentUuid: ACTIVE }), mode: "full" },
    }))).toMatchObject({ ok: false, error: { code: "ILLEGAL_STATE", locus: "autonomy" } });
    expect(projectMachineReviewStatus(activeStatusInput({ lifecycle: "completed" }))).toMatchObject({
      ok: false,
      error: { code: "ILLEGAL_STATE", locus: "lifecycle" },
    });

    const full = fullStatusInput();
    expect(projectMachineReviewStatus({ ...full, currentGrantScope: null })).toMatchObject({
      ok: false,
      error: { code: "ILLEGAL_STATE", locus: "grantScope" },
    });
    expect(projectMachineReviewStatus(activeStatusInput({ currentGrantScope: full.currentGrantScope }))).toMatchObject({
      ok: false,
      error: { code: "ILLEGAL_STATE", locus: "grantScope" },
    });
  });

  test("renders the human status from a valid full grant without leaking unsafe detail", () => {
    const input = fullStatusInput();
    const machine = projectMachineReviewStatus(input);
    expect(machine).toMatchObject({
      ok: true,
      value: {
        intentUuid: ACTIVE,
        lifecycle: "active",
        autonomyMode: "full",
        grant: { state: "active", scope: { selfScopeId: "self-feature" } },
        decisionPolicyCount: 1,
        decisionCount: 3,
        unreviewedDecisionCount: 1,
        acceptedDecisionCount: 1,
        flaggedDecisionCount: 1,
      },
    });

    const human = projectHumanReviewStatus(input);
    expect(human).toMatchObject({ ok: true });
    if (!human.ok) return;
    expect(human.value).toContain(`Intent: ${ACTIVE} (active)`);
    expect(human.value).toContain("自律レベル: full");
    expect(human.value).toContain("ワークフロー: running");
    expect(human.value).toContain("grant scope: self-feature");
    expect(human.value).toContain("事前裁定方針: 1");
    expect(human.value).toContain("自動裁定: 3 (未確認 1, accept 1, flag 1)");
    expect(human.value).toContain("停止理由: なし");
    expect(human.value).not.toContain("Prefer the accepted option");

    expect(projectHumanReviewStatus({ ...input, decisionPolicyCount: -1 })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED", locus: "statusInput" },
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
    expect(evaluateReviewHarnessSuite("fixture-2", autonomyDigest("contract-v1"), receipts)).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "contractRevision" },
    });
  });
});

describe("production review projection", () => {
  test("rejects a stored review whose consumed HUMAN_TURN is missing", () => {
    const projectDir = setupIntegrationProject({ withState: "state-construction.md", stripEnvScope: true });
    try {
      const payload = {
        targetIntentUuid: DEFAULT_INTENT_UUID,
        decisionId: "decision-prior",
        reviewId: "review-prior",
        choice: "accept",
        auditTransactionId: "review-transaction-prior",
        receiptProjectionRevision: 1,
        lifecycleAtReview: "active",
        reviewPrincipalRef: "human-1",
        reviewActorRef: "human-1",
        decisionPrincipalRef: "principal-1",
        decisionActorRef: "core-engine-1",
        decisionSource: "solo-election",
        safeBasisDigest: autonomyDigest("prior-review-basis"),
        grantId: null,
        sourceIntentUuid: DEFAULT_INTENT_UUID,
        sourceHumanTurnId: "missing-human-turn",
        sourceHumanTurnEventId: "missing-human-event",
        commandOccurrenceId: "review-accept-prior",
        commandBindingDigest: autonomyDigest("prior-review-binding"),
        remediation: null,
        flagClassification: null,
        safeNoteDigest: null,
        redactionStatus: "redacted",
      };
      const payloadDigest = canonicalContractValueDigest("auto-decision-reviewed-payload", payload);
      if (!payloadDigest.ok) throw new Error(payloadDigest.error.code);
      emitAuditEventGuarded("AUTO_DECISION_REVIEWED", {
        "Intent Uuid": DEFAULT_INTENT_UUID,
        "Decision Id": payload.decisionId,
        "Review Id": payload.reviewId,
        Choice: payload.choice,
        Lifecycle: payload.lifecycleAtReview,
        "Review Principal": payload.reviewPrincipalRef,
        "Review Actor": payload.reviewActorRef,
        "Source Human Turn": payload.sourceHumanTurnId,
        "Audit Transaction Id": payload.auditTransactionId,
        "Payload Digest": payloadDigest.value,
        "Payload V1": JSON.stringify(payload),
      }, projectDir, DEFAULT_RECORD_DIR, "default");

      expect(commitProductionDecisionReview({
        projectDir,
        decisionId: "decision-next",
        choice: "accept",
      })).toEqual({ ok: false, error: "PROVENANCE_REQUIRED" });
    } finally {
      resetOtelPerProject();
      cleanupTestProject(projectDir);
    }
  });

  test("replays a completed review by stable selectors and fails closed on malformed audit payloads", () => {
    const projectDir = setupIntegrationProject({ withState: "state-construction.md", stripEnvScope: true });
    try {
      emitAuditEventGuarded("HUMAN_TURN", {}, projectDir, DEFAULT_RECORD_DIR, "default");
      const preview = previewProductionAutonomyGrant({ projectDir, stateContent: "" });
      if (!preview.ok) throw new Error(preview.error);
      expect(applyProductionAutonomyMode({
        projectDir,
        stateContent: "",
        mode: "full",
        confirmedDisplayDigest: preview.preview.displayDigest,
      })).toMatchObject({ ok: true, projection: { mode: "full" } });

      const decided = commitProductionQuestionDecision({
        projectDir,
        stage: "code-generation",
        phase: "construction",
        graphRevision: `sha256:${"a".repeat(64)}`,
        questionId: "review-question",
        selector: "review-selector",
        question: "Which reviewed option should be selected?",
        optionIds: ["accept", "reject"],
        recommendedOptionId: "accept",
        election: { optionId: "accept", evidenceFingerprint: `sha256:${"b".repeat(64)}` },
      });
      expect(decided.kind).toBe("decided");

      const unreviewed = listProductionAutoDecisions({ projectDir, reviewState: "unreviewed" });
      if (!unreviewed.ok) throw new Error(unreviewed.error);
      const decisionId = unreviewed.page.items[0]?.decisionId;
      if (decisionId === undefined) throw new Error("expected a production decision");
      expect(commitProductionDecisionReview({ projectDir, decisionId, choice: "accept" })).toMatchObject({
        ok: true,
        receipt: { state: "accepted", remediation: null },
      });

      const completionSealDigest = `sha256:${"c".repeat(64)}`;
      emitAuditEventGuarded("INTENT_COMPLETION_TRANSACTION_COMMITTED", {
        "Intent Uuid": DEFAULT_INTENT_UUID,
        "Transaction Id": "review-completion-transaction",
        "Evidence Id": "review-completion-evidence",
        "Evidence Digest": completionSealDigest,
        "Completion Seal Digest": completionSealDigest,
        Transaction: "{}",
      }, projectDir, DEFAULT_RECORD_DIR, "default");
      expect(withLockedIntentRegistry(
        projectDir,
        (context) => transitionIntentStatusLocked(context, DEFAULT_RECORD_DIR, "complete"),
        "default",
      )).toBe(true);

      expect(listProductionAutoDecisions({
        projectDir,
        intent: DEFAULT_INTENT_UUID,
        reviewState: "accepted",
      })).toMatchObject({
        ok: true,
        page: { items: [{ decisionId, reviewState: "accepted" }] },
      });
      expect(getProductionAutoDecision({ projectDir, intent: DEFAULT_RECORD_DIR, decisionId })).toMatchObject({
        ok: true,
        detail: { decisionId, reviewState: "accepted", reviewReceipt: { state: "accepted" } },
      });
      expect(listProductionAutoDecisions({ projectDir, intent: "fixture", reviewState: "accepted" }))
        .toMatchObject({ ok: true, page: { items: [{ decisionId }] } });

      expect(withLockedIntentRegistry(
        projectDir,
        (context) => transitionIntentStatusLocked(context, DEFAULT_RECORD_DIR, "archive"),
        "default",
      )).toBe(true);
      expect(withLockedIntentRegistry(
        projectDir,
        (context) => transitionIntentStatusLocked(context, DEFAULT_RECORD_DIR, "unarchive"),
        "default",
      )).toBe(true);
      emitAuditEventGuarded("AUTO_DECISION_REVIEWED", {
        "Intent Uuid": DEFAULT_INTENT_UUID,
        "Decision Id": decisionId,
        "Review Id": "review-malformed",
        Choice: "accept",
        Lifecycle: "active",
        "Review Principal": "human-1",
        "Review Actor": "human-1",
        "Source Human Turn": "turn-malformed",
        "Audit Transaction Id": "review-transaction-malformed",
        "Payload Digest": autonomyDigest("malformed-review-payload"),
        "Payload V1": "{",
      }, projectDir, DEFAULT_RECORD_DIR, "default");
      expect(listProductionAutoDecisions({ projectDir, intent: DEFAULT_INTENT_UUID })).toMatchObject({ ok: false });
      expect(getProductionAutoDecision({ projectDir, intent: DEFAULT_INTENT_UUID, decisionId })).toMatchObject({ ok: false });
      expect(commitProductionDecisionReview({ projectDir, decisionId, choice: "accept" })).toMatchObject({ ok: false });
    } finally {
      resetOtelPerProject();
      cleanupTestProject(projectDir);
    }
  });
});

describe("observability configuration boundary", () => {
  test("fails closed when an untyped caller supplies an unreadable project root", () => {
    resetObservabilityConfigCache();
    expect(resolveObservabilityConfig(null as unknown as string)).toEqual({
      enabled: false,
      localExport: false,
      redactionOptIn: [],
    });
    resetObservabilityConfigCache();
  });
});
