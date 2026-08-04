// Production audit adapter for Intent autonomy review (#2067).
//
// The domain review service remains storage-neutral. This adapter projects its
// immutable snapshot from the target Intent audit and is the only writer of the
// protected AUTO_DECISION_REVIEWED append path.

import {
  autonomyReviewStableId,
  bindHumanReviewCommand,
  canonicalContractValueDigest,
  canonicalTupleDigest,
  createMemoryAutonomyReviewService,
  nextReviewExtensionHead,
  reviewAuditFields,
  type AutonomyReviewPersistenceSnapshot,
  type AutoDecisionReviewedEvent,
  type DecisionDetail,
  type DecisionPage,
  type DecisionReviewReceipt,
  type HumanReviewCommandBinding,
  type HumanReviewTurnSeed,
  type IntentLifecycle,
  type ReviewChoice,
  type ReviewIntentSeed,
} from "./amadeus-autonomy-review.ts";
import { autonomyDigest, autonomyIsRecord } from "./amadeus-intent-autonomy.ts";
import { readProductionAutonomyProjection } from "./amadeus-intent-autonomy-production.ts";
import {
  activeIntent,
  activeSpace,
  auditBlockField,
  findAllEvents,
  listIntents,
  readAllAuditShards,
  splitAuditRecords,
  withAuditLock,
} from "./amadeus-lib.ts";
import { emitAuditEventGuarded } from "../otel/audit-emit.ts";

type ReviewTarget = {
  readonly space: string;
  readonly dirName: string;
  readonly intentUuid: string;
  readonly lifecycle: IntentLifecycle;
};

function resolveReviewTarget(projectDir: string, selector?: string): ReviewTarget | null {
  const space = activeSpace(projectDir);
  const activeDir = activeIntent(projectDir, space);
  const candidates = listIntents(projectDir, space).filter((candidate) => candidate.dirName !== null);
  const selected = selector === undefined
    ? candidates.find((candidate) => candidate.dirName === activeDir)
    : candidates.find((candidate) =>
      candidate.uuid === selector || candidate.dirName === selector || candidate.slug === selector
    );
  if (selected?.dirName === null || selected?.dirName === undefined || selected.uuid === "") return null;
  return {
    space,
    dirName: selected.dirName,
    intentUuid: selected.uuid,
    lifecycle: selected.status === "complete" || selected.status === "archived" ? "completed" : "active",
  };
}

function completionSeal(projectDir: string, target: ReviewTarget): string | null {
  if (target.lifecycle === "active") return null;
  const rows = findAllEvents(
    readAllAuditShards(projectDir, target.dirName, target.space),
    "INTENT_COMPLETION_TRANSACTION_COMMITTED",
  );
  return rows.length === 0 ? null : auditBlockField(rows.at(-1)!.block, "Completion Seal Digest");
}

function currentSeed(projectDir: string, target: ReviewTarget): ReviewIntentSeed {
  const autonomy = readProductionAutonomyProjection(projectDir, target.dirName, target.space);
  if (autonomy === null) throw new Error("intent-autonomy-projection-not-found");
  const seal = completionSeal(projectDir, target);
  if (target.lifecycle === "completed" && seal === null) throw new Error("completed-intent-seal-not-found");
  return {
    intentUuid: target.intentUuid,
    lifecycle: target.lifecycle,
    autonomy,
    auditRevision: splitAuditRecords(readAllAuditShards(projectDir, target.dirName, target.space)).length,
    completionSealDigest: seal,
  };
}

type ReviewAuditPayload = Record<string, unknown> & {
  readonly targetIntentUuid: string;
  readonly decisionId: string;
  readonly reviewId: string;
  readonly choice: ReviewChoice;
  readonly auditTransactionId: string;
  readonly receiptProjectionRevision: number;
  readonly lifecycleAtReview: IntentLifecycle;
};

function parseReviewPayload(payloadV1: string, payloadDigest: string): ReviewAuditPayload {
  const parsed: unknown = JSON.parse(payloadV1);
  if (!autonomyIsRecord(parsed)) throw new Error("invalid-review-audit-payload");
  const payload = parsed;
  const observedDigest = canonicalContractValueDigest("auto-decision-reviewed-payload", payload);
  const valid = [
    observedDigest.ok && observedDigest.value === payloadDigest,
    typeof payload.targetIntentUuid === "string",
    typeof payload.decisionId === "string",
    typeof payload.reviewId === "string",
    payload.choice === "accept" || payload.choice === "flag",
    typeof payload.auditTransactionId === "string",
    typeof payload.receiptProjectionRevision === "number",
    payload.lifecycleAtReview === "active" || payload.lifecycleAtReview === "completed",
    typeof payload.reviewPrincipalRef === "string",
    typeof payload.reviewActorRef === "string",
    typeof payload.decisionPrincipalRef === "string",
    typeof payload.decisionActorRef === "string",
    typeof payload.decisionSource === "string",
    typeof payload.safeBasisDigest === "string",
    payload.grantId === null || typeof payload.grantId === "string",
    typeof payload.sourceIntentUuid === "string",
    typeof payload.sourceHumanTurnId === "string",
    typeof payload.sourceHumanTurnEventId === "string",
    typeof payload.commandOccurrenceId === "string",
    typeof payload.commandBindingDigest === "string",
    payload.remediation === null || typeof payload.remediation === "string",
    payload.flagClassification === null || typeof payload.flagClassification === "string",
    payload.safeNoteDigest === null || typeof payload.safeNoteDigest === "string",
    payload.redactionStatus === "redacted" || payload.redactionStatus === "withheld",
  ].every(Boolean);
  if (!valid) throw new Error("invalid-review-audit-payload");
  return payload as ReviewAuditPayload;
}

function parsedReviewEvent(block: string): AutoDecisionReviewedEvent {
  const payloadV1 = auditBlockField(block, "Payload V1");
  const payloadDigest = auditBlockField(block, "Payload Digest");
  if (payloadV1 === null || payloadDigest === null) throw new Error("invalid-review-audit-payload");
  const payload = parseReviewPayload(payloadV1, payloadDigest);
  const revision = payload.receiptProjectionRevision;
  const eventIdentity = autonomyReviewStableId("review-event", canonicalTupleDigest("amadeus.decision-review-event.v1", [
    { tag: "review", value: payload.reviewId },
    { tag: "command-occurrence", value: String(payload.commandOccurrenceId) },
    { tag: "target-audit-revision", value: String(revision - 1) },
    { tag: "review-payload-digest", value: payloadDigest },
  ]));
  const remediation = payload.remediation as AutoDecisionReviewedEvent["remediation"];
  return {
    eventType: "AUTO_DECISION_REVIEWED",
    eventIdentity,
    transactionId: payload.auditTransactionId,
    payloadDigest,
    payloadV1,
    targetIntentUuid: payload.targetIntentUuid,
    decisionId: payload.decisionId,
    choice: payload.choice,
    principalId: String(payload.reviewPrincipalRef),
    actorId: String(payload.reviewActorRef),
    decisionPrincipalId: String(payload.decisionPrincipalRef),
    decisionActorId: String(payload.decisionActorRef),
    decisionSource: payload.decisionSource as AutoDecisionReviewedEvent["decisionSource"],
    safeBasisDigest: String(payload.safeBasisDigest),
    grantId: payload.grantId === null ? null : String(payload.grantId),
    sourceIntentUuid: String(payload.sourceIntentUuid),
    sourceHumanTurnId: String(payload.sourceHumanTurnId),
    sourceHumanTurnEventId: String(payload.sourceHumanTurnEventId),
    commandOccurrenceId: String(payload.commandOccurrenceId),
    commandBindingDigest: String(payload.commandBindingDigest),
    lifecycleAtReview: payload.lifecycleAtReview,
    remediation,
    flagClassification: payload.flagClassification as AutoDecisionReviewedEvent["flagClassification"],
    safeNoteDigest: payload.safeNoteDigest === null ? null : String(payload.safeNoteDigest),
    redactionStatus: "redacted",
    projectionRevision: revision,
    receipt: {
      reviewId: payload.reviewId,
      reviewEventId: eventIdentity,
      auditTransactionId: payload.auditTransactionId,
      committedEventIdentities: [eventIdentity],
      stateProjectionRevision: revision,
      state: payload.choice === "accept" ? "accepted" : "flagged",
      remediation,
    },
  };
}

function readStoredReviews(projectDir: string, target: ReviewTarget): readonly AutoDecisionReviewedEvent[] {
  const rows = findAllEvents(
    readAllAuditShards(projectDir, target.dirName, target.space),
    "AUTO_DECISION_REVIEWED",
  );
  return rows.map((row) => parsedReviewEvent(row.block));
}

function reviewExtension(
  target: ReviewTarget,
  seal: string | null,
  reviews: readonly AutoDecisionReviewedEvent[],
): { readonly head: string | null; readonly revision: number } {
  if (target.lifecycle === "active") return { head: null, revision: 0 };
  let head: string | null = null;
  let revision = 0;
  for (const event of reviews) {
    revision += 1;
    head = nextReviewExtensionHead({
      completionSealDigest: seal,
      previousExtensionHead: head,
      eventIdentity: event.eventIdentity,
      payloadDigest: event.payloadDigest,
      transactionId: event.transactionId,
      revision,
    });
  }
  return { head, revision };
}

function refreshedSnapshot(
  projectDir: string,
  target: ReviewTarget,
  source?: ReviewTarget,
  turn?: HumanReviewTurnSeed,
): AutonomyReviewPersistenceSnapshot {
  const targetSeed = currentSeed(projectDir, target);
  const reviews = readStoredReviews(projectDir, target);
  const extension = reviewExtension(target, targetSeed.completionSealDigest, reviews);
  const targetState = {
    ...targetSeed,
    reviews,
    reviewExtensionHead: extension.head,
    reviewExtensionRevision: extension.revision,
  };
  const sourceStates = source === undefined || source.intentUuid === target.intentUuid
    ? []
    : [{ ...currentSeed(projectDir, source), reviews: [], reviewExtensionHead: null, reviewExtensionRevision: 0 }];
  const nextValue = {
    schemaVersion: 1 as const,
    intents: [targetState, ...sourceStates],
    humanTurns: turn === undefined ? [] : [turn],
  };
  const digest = canonicalContractValueDigest("autonomy-review-persistence", nextValue);
  if (!digest.ok) throw new Error(digest.error.detail);
  return { value: nextValue, digest: digest.value };
}

function reviewService(projectDir: string, target: ReviewTarget) {
  return createMemoryAutonomyReviewService({
    snapshot: refreshedSnapshot(projectDir, target),
    redactor: { redact: (_kind, value) => ({ value: value.normalize("NFC"), status: "redacted" }) },
  });
}

export function listProductionAutoDecisions(input: {
  readonly projectDir: string;
  readonly intent?: string;
  readonly reviewState?: "not-applicable" | "unreviewed" | "accepted" | "flagged";
  readonly pageSize?: number;
}): { readonly ok: true; readonly page: DecisionPage } | { readonly ok: false; readonly error: string } {
  try {
    const target = resolveReviewTarget(input.projectDir, input.intent);
    if (target === null) return { ok: false, error: "review-target-not-found" };
    const result = reviewService(input.projectDir, target).listAutoDecisions({
      intentUuid: target.intentUuid,
      lifecycle: target.lifecycle,
      reviewState: input.reviewState,
      pageSize: input.pageSize ?? 100,
    });
    return result.ok ? { ok: true, page: result.value } : { ok: false, error: `${result.error.code}:${result.error.locus}` };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
  }
}

export function getProductionAutoDecision(input: {
  readonly projectDir: string;
  readonly intent?: string;
  readonly decisionId: string;
}): { readonly ok: true; readonly detail: DecisionDetail } | { readonly ok: false; readonly error: string } {
  try {
    const target = resolveReviewTarget(input.projectDir, input.intent);
    if (target === null) return { ok: false, error: "review-target-not-found" };
    const result = reviewService(input.projectDir, target).getAutoDecision(target.intentUuid, input.decisionId);
    return result.ok ? { ok: true, detail: result.value } : { ok: false, error: `${result.error.code}:${result.error.locus}` };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
  }
}

type ProductionDecisionReviewInput = {
  readonly projectDir: string;
  readonly intent?: string;
  readonly decisionId: string;
  readonly choice: ReviewChoice;
  readonly flagClassification?: HumanReviewCommandBinding["flagClassification"];
  readonly note?: string;
};

type ProductionDecisionReviewResult = { readonly ok: true; readonly receipt: DecisionReviewReceipt } |
  { readonly ok: false; readonly error: string };

function commitDecisionReviewLocked(
  input: ProductionDecisionReviewInput,
  target: ReviewTarget,
  source: ReviewTarget,
): ProductionDecisionReviewResult {
  const sourceAudit = readAllAuditShards(input.projectDir, source.dirName, source.space);
  const turns = findAllEvents(sourceAudit, "HUMAN_TURN");
  const latestPriorReview = readStoredReviews(input.projectDir, target)
    .filter((event) => event.sourceIntentUuid === source.intentUuid)
    .at(-1);
  const consumedTurnIndex = latestPriorReview === undefined
    ? -1
    : turns.findLastIndex((turn) => turn.timestamp === latestPriorReview.sourceHumanTurnEventId);
  if (latestPriorReview !== undefined && consumedTurnIndex < 0) {
    return { ok: false, error: "PROVENANCE_REQUIRED" };
  }
  const latestTurn = turns.slice(consumedTurnIndex + 1).at(-1);
  if (latestTurn === undefined) return { ok: false, error: "PROVENANCE_REQUIRED" };
  const binding = bindHumanReviewCommand({
    sourceIntentUuid: source.intentUuid,
    targetIntentUuid: target.intentUuid,
    decisionId: input.decisionId,
    choice: input.choice,
    commandOccurrenceId: `review-${input.choice}-${input.decisionId}-${latestTurn.timestamp}`,
    flagClassification: input.choice === "flag" ? input.flagClassification ?? "unspecified" : null,
    safeNoteDigest: input.choice === "flag" && input.note !== undefined ? autonomyDigest(input.note) : null,
    sourceHumanTurnId: latestTurn.timestamp,
  });
  const turn: HumanReviewTurnSeed = {
    sourceIntentUuid: source.intentUuid,
    lifecycle: "active",
    sourceAuditRevision: splitAuditRecords(sourceAudit).length,
    sourceHumanTurnId: latestTurn.timestamp,
    sourceHumanTurnEventId: latestTurn.timestamp,
    principalId: "local-human",
    binding,
  };
  const service = createMemoryAutonomyReviewService({ snapshot: refreshedSnapshot(input.projectDir, target, source, turn) });
  const targetState = service.readIntent(target.intentUuid);
  if (targetState === null) return { ok: false, error: "review-target-not-found" };
  const authorization = service.authorizeHumanReview({
    command: binding.command,
    sourceHumanTurnId: turn.sourceHumanTurnId,
    sourceHumanTurnEventId: turn.sourceHumanTurnEventId,
  });
  if (!authorization.ok) return { ok: false, error: `${authorization.error.code}:${authorization.error.locus}` };
  const reviewed = service.appendDecisionReview({
    targetIntentUuid: target.intentUuid,
    decisionId: input.decisionId,
    choice: input.choice,
    expectedTargetAuditRevision: targetState.auditRevision,
    expectedCompletionSealDigest: targetState.completionSealDigest,
    humanAuthorization: authorization.value,
  });
  if (!reviewed.ok) return { ok: false, error: `${reviewed.error.code}:${reviewed.error.locus}` };
  const event = service.readReviewEvents(target.intentUuid).at(-1);
  if (event === undefined) return { ok: false, error: "review-event-not-produced" };
  emitAuditEventGuarded(
    "AUTO_DECISION_REVIEWED",
    { ...reviewAuditFields(event) },
    input.projectDir,
    target.dirName,
    target.space,
  );
  return { ok: true, receipt: reviewed.value };
}

export function commitProductionDecisionReview(
  input: ProductionDecisionReviewInput,
): ProductionDecisionReviewResult {
  const target = resolveReviewTarget(input.projectDir, input.intent);
  const source = resolveReviewTarget(input.projectDir);
  if (target === null || source === null || source.lifecycle !== "active") {
    return { ok: false, error: "active-source-and-review-target-required" };
  }
  try {
    return withAuditLock(
      input.projectDir,
      () => commitDecisionReviewLocked(input, target, source),
      target.dirName,
      target.space,
    );
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
  }
}
