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
  normalizeReviewFlagMetadata,
  reviewCommandContentDigest,
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

function completionSeal(audit: string, target: ReviewTarget): string | null {
  if (target.lifecycle === "active") return null;
  const rows = findAllEvents(audit, "INTENT_COMPLETION_TRANSACTION_COMMITTED");
  return rows.length === 0 ? null : auditBlockField(rows.at(-1)!.block, "Completion Seal Digest");
}

function currentSeed(projectDir: string, target: ReviewTarget): ReviewIntentSeed {
  const autonomy = readProductionAutonomyProjection(projectDir, target.dirName, target.space);
  if (autonomy === null) throw new Error("intent-autonomy-projection-not-found");
  const audit = readAllAuditShards(projectDir, target.dirName, target.space);
  const seal = completionSeal(audit, target);
  if (target.lifecycle === "completed" && seal === null) throw new Error("completed-intent-seal-not-found");
  return {
    intentUuid: target.intentUuid,
    lifecycle: target.lifecycle,
    autonomy,
    auditRevision: splitAuditRecords(audit).length,
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
    ["deterministic-engine", "confirmed-policy", "norm-derivation", "human-ruling-history", "solo-election", "agent-recommendation"].includes(String(payload.decisionSource)),
    payload.remediation === null || ["self-fix", "self-feature", "self-fix-with-feature-alternative"].includes(String(payload.remediation)),
    payload.flagClassification === null || ["contract-defect", "specification-change", "unspecified"].includes(String(payload.flagClassification)),
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
    principalId: payload.reviewPrincipalRef as string,
    actorId: payload.reviewActorRef as string,
    decisionPrincipalId: payload.decisionPrincipalRef as string,
    decisionActorId: payload.decisionActorRef as string,
    decisionSource: payload.decisionSource as AutoDecisionReviewedEvent["decisionSource"],
    safeBasisDigest: payload.safeBasisDigest as string,
    grantId: payload.grantId as string | null,
    sourceIntentUuid: payload.sourceIntentUuid as string,
    sourceHumanTurnId: payload.sourceHumanTurnId as string,
    sourceHumanTurnEventId: payload.sourceHumanTurnEventId as string,
    commandOccurrenceId: payload.commandOccurrenceId as string,
    commandBindingDigest: payload.commandBindingDigest as string,
    lifecycleAtReview: payload.lifecycleAtReview,
    remediation,
    flagClassification: payload.flagClassification as AutoDecisionReviewedEvent["flagClassification"],
    safeNoteDigest: payload.safeNoteDigest as string | null,
    redactionStatus: payload.redactionStatus as "redacted" | "withheld",
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
  // Identical event identities dedupe across ALL journals so a row replayed
  // into a second shard stays one event and cannot inflate the extension chain.
  const seen = new Set<string>();
  const own: AutoDecisionReviewedEvent[] = [];
  for (const row of rows) {
    const event = parsedReviewEvent(row.block);
    if (seen.has(event.eventIdentity)) continue;
    seen.add(event.eventIdentity);
    own.push(event);
  }
  if (target.lifecycle === "active") return own;
  // A completed target's journal is sealed, so post-seal review rows live on
  // whichever ACTIVE intent recorded them (OBS-R08). Union every sibling
  // intent's shards and re-attribute by the payload's target uuid. A sibling
  // row that fails to parse says nothing about THIS target unless it names the
  // target's uuid — only that case stays fail-closed; other siblings' garbage
  // must not take this target's review surface down.
  const extension: AutoDecisionReviewedEvent[] = [];
  for (const sibling of listIntents(projectDir, target.space)) {
    if (sibling.dirName === null || sibling.dirName === target.dirName) continue;
    for (const row of findAllEvents(
      readAllAuditShards(projectDir, sibling.dirName, target.space),
      "AUTO_DECISION_REVIEWED",
    )) {
      let event: AutoDecisionReviewedEvent;
      try {
        event = parsedReviewEvent(row.block);
      } catch (cause) {
        if (row.block.includes(target.intentUuid)) throw cause;
        continue;
      }
      if (event.targetIntentUuid !== target.intentUuid || seen.has(event.eventIdentity)) continue;
      seen.add(event.eventIdentity);
      extension.push(event);
    }
  }
  return [...own, ...extension];
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

// The ONE production redactor: read projections and the commit path must
// disclose identically, so both service constructions share this instance.
const productionRedactor = {
  redact: (_kind: string, value: string): { value: string; status: "redacted" } => ({ value: value.normalize("NFC"), status: "redacted" }),
};

function reviewService(projectDir: string, target: ReviewTarget) {
  return createMemoryAutonomyReviewService({
    snapshot: refreshedSnapshot(projectDir, target),
    redactor: productionRedactor,
  });
}

interface ListProductionAutoDecisionsInput {
  readonly projectDir: string;
  readonly intent?: string;
  readonly reviewState?: "not-applicable" | "unreviewed" | "accepted" | "flagged";
  readonly pageSize?: number;
}

export function listProductionAutoDecisions(input: ListProductionAutoDecisionsInput): { readonly ok: true; readonly page: DecisionPage } | { readonly ok: false; readonly error: string } {
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

interface GetProductionAutoDecisionInput {
  readonly projectDir: string;
  readonly intent?: string;
  readonly decisionId: string;
}

export function getProductionAutoDecision(input: GetProductionAutoDecisionInput): { readonly ok: true; readonly detail: DecisionDetail } | { readonly ok: false; readonly error: string } {
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
  readonly confirmedContentDigest: string;
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
  // Timestamps are second-precision, so a turn's identity is its timestamp
  // PLUS its ordinal among same-timestamp turns in the chronologically sorted
  // journal — appends only ever add later (or same-second, higher-position)
  // rows, so an already-recorded identity never re-points at a different turn.
  const turnKeys: string[] = [];
  const sameTimestampSeen = new Map<string, number>();
  for (const turn of turns) {
    const ordinal = sameTimestampSeen.get(turn.timestamp) ?? 0;
    sameTimestampSeen.set(turn.timestamp, ordinal + 1);
    turnKeys.push(`${turn.timestamp}#${ordinal}`);
  }
  const latestPriorReview = readStoredReviews(input.projectDir, target)
    .filter((event) => event.sourceIntentUuid === source.intentUuid)
    .at(-1);
  const consumedTurnIndex = latestPriorReview === undefined
    ? -1
    : turnKeys.lastIndexOf(latestPriorReview.sourceHumanTurnEventId);
  if (latestPriorReview !== undefined && consumedTurnIndex < 0) {
    return { ok: false, error: "PROVENANCE_REQUIRED" };
  }
  const latestTurnIndex = turns.length - 1;
  if (latestTurnIndex <= consumedTurnIndex) return { ok: false, error: "PROVENANCE_REQUIRED" };
  const latestTurnKey = turnKeys[latestTurnIndex];
  // OBS-R09/OBS-R12: the commit recomputes the digest the preview displayed
  // and refuses a mismatch, and the fresh human turn must postdate the last
  // consumed one. This is the same trust geometry as set-autonomy's
  // confirmed-display-digest: the turn precedes the commit and the presented
  // digest matches the previewed content. It does NOT cryptographically bind
  // the turn to a rendered display; that stronger attestation needs the turn
  // itself to carry the displayed digest (a HUMAN_TURN vocabulary change).
  const flagMetadata = normalizeReviewFlagMetadata({
    choice: input.choice,
    flagClassification: input.flagClassification,
    noteDigest: input.note !== undefined ? autonomyDigest(input.note) : null,
  });
  const expectedContentDigest = reviewCommandContentDigest({
    targetIntentUuid: target.intentUuid,
    decisionId: input.decisionId,
    choice: input.choice,
    flagClassification: flagMetadata.flagClassification,
    safeNoteDigest: flagMetadata.safeNoteDigest,
  });
  if (input.confirmedContentDigest !== expectedContentDigest) {
    return { ok: false, error: "PROVENANCE_REQUIRED:confirmed-content-digest-mismatch" };
  }
  const binding = bindHumanReviewCommand({
    sourceIntentUuid: source.intentUuid,
    targetIntentUuid: target.intentUuid,
    decisionId: input.decisionId,
    choice: input.choice,
    commandOccurrenceId: `review-${input.choice}-${input.decisionId}-${latestTurnKey}`,
    flagClassification: flagMetadata.flagClassification,
    safeNoteDigest: flagMetadata.safeNoteDigest,
    sourceHumanTurnId: latestTurnKey,
  });
  const turn: HumanReviewTurnSeed = {
    sourceIntentUuid: source.intentUuid,
    lifecycle: "active",
    sourceAuditRevision: splitAuditRecords(sourceAudit).length,
    sourceHumanTurnId: latestTurnKey,
    sourceHumanTurnEventId: latestTurnKey,
    principalId: "local-human",
    binding,
  };
  const service = createMemoryAutonomyReviewService({
    snapshot: refreshedSnapshot(input.projectDir, target, source, turn),
    redactor: productionRedactor,
  });
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
  // OBS-R08: a completed target's journal is sealed (#1248) — post-seal review
  // rows land on the ACTIVE SOURCE journal instead. The payload carries the
  // target intent uuid, so readStoredReviews re-attributes them on read.
  const ledger = target.lifecycle === "completed" ? source : target;
  emitAuditEventGuarded(
    "AUTO_DECISION_REVIEWED",
    { ...reviewAuditFields(event) },
    input.projectDir,
    ledger.dirName,
    ledger.space,
  );
  return { ok: true, receipt: reviewed.value };
}

export function commitProductionDecisionReview(
  input: ProductionDecisionReviewInput,
): ProductionDecisionReviewResult {
  try {
    const target = resolveReviewTarget(input.projectDir, input.intent);
    const source = resolveReviewTarget(input.projectDir);
    if (target === null || source === null || source.lifecycle !== "active") {
      return { ok: false, error: "active-source-and-review-target-required" };
    }
    // The commit reads the SOURCE journal (turn consumption) and writes to the
    // source (completed target) or the target (active target), so BOTH ledgers
    // are locked. dirName order is the deterministic acquisition order — two
    // concurrent commits over any pair of intents cannot deadlock, and two
    // completed-target reviews serialise on the shared source lock.
    const commit = (): ProductionDecisionReviewResult => commitDecisionReviewLocked(input, target, source);
    if (target.dirName === source.dirName) {
      return withAuditLock(input.projectDir, commit, target.dirName, target.space);
    }
    const [outer, inner] = [target, source].sort((left, right) => left.dirName.localeCompare(right.dirName));
    return withAuditLock(
      input.projectDir,
      () => withAuditLock(input.projectDir, commit, inner.dirName, inner.space),
      outer.dirName,
      outer.space,
    );
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
  }
}
