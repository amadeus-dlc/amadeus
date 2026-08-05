// Harness-neutral review and observability for immutable Intent autonomy decisions (#2067).
//
// Reviews are an append-only projection. They never replay a selected effect,
// mutate a grant, reopen an Intent, or create a remediation Intent.

import { createHash } from "node:crypto";

import {
  assertLegalAutonomyProjection,
  type AutoDecisionRecord,
  type AutonomyProjection,
  type IntentGrantState,
  type ResumeCondition,
  type WorkflowResult,
} from "./amadeus-intent-autonomy.ts";
import {
  SELF_INSTALL_HARNESS_IDS,
  type SelfInstallHarnessId,
} from "./amadeus-harness-registry.ts";

export const AUTO_DECISION_REVIEWED_EVENT = "AUTO_DECISION_REVIEWED";

export type ContractErrorCode = "MALFORMED" | "CONFLICT" | "PROVENANCE_REQUIRED" | "ILLEGAL_STATE";
export interface ContractError {
  readonly code: ContractErrorCode;
  readonly locus: string;
  readonly detail: string;
}
export type ContractResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ContractError };
export type IntentLifecycle = "active" | "completed";
export type DecisionReviewState = "not-applicable" | "unreviewed" | "accepted" | "flagged";
export type ReviewChoice = "accept" | "flag";
export type RedactionStatus = "redacted" | "withheld";
export type RemediationKind = "self-fix" | "self-feature" | "self-fix-with-feature-alternative";

function success<T>(value: T): ContractResult<T> {
  return { ok: true, value };
}

function failure(code: ContractErrorCode, locus: string, detail: string): ContractResult<never> {
  return { ok: false, error: { code, locus, detail } };
}

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(value: Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function u32(value: number): Buffer {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes;
}

function u64(value: number): Buffer {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(BigInt(value));
  return bytes;
}

export interface CanonicalTupleAtom {
  readonly tag: string;
  readonly value: string | null;
}

export function encodeCanonicalTuple(domain: string, atoms: readonly CanonicalTupleAtom[]): Uint8Array {
  const domainBytes = Buffer.from(domain, "utf8");
  const chunks: Buffer[] = [u32(domainBytes.length), domainBytes, u32(atoms.length)];
  for (const atom of atoms) {
    const tag = Buffer.from(atom.tag, "utf8");
    chunks.push(u32(tag.length), tag);
    if (atom.value === null) {
      chunks.push(Buffer.from([0]));
      continue;
    }
    const value = Buffer.from(atom.value, "utf8");
    chunks.push(Buffer.from([1]), u64(value.length), value);
  }
  return Buffer.concat(chunks);
}

export function canonicalTupleDigest(domain: string, atoms: readonly CanonicalTupleAtom[]): string {
  return sha256(encodeCanonicalTuple(domain, atoms));
}

export function autonomyReviewStableId(prefix: string, digest: string): string {
  return `${prefix}-${digest.slice("sha256:".length, "sha256:".length + 32)}`;
}

interface NextReviewExtensionHeadInput {
  readonly completionSealDigest: string | null;
  readonly previousExtensionHead: string | null;
  readonly eventIdentity: string;
  readonly payloadDigest: string;
  readonly transactionId: string;
  readonly revision: number;
}

export function nextReviewExtensionHead(input: NextReviewExtensionHeadInput): string {
  return autonomyReviewStableId("review-extension", canonicalTupleDigest("amadeus.review-extension.v1", [
    { tag: "completion-seal", value: input.completionSealDigest },
    { tag: "previous-extension", value: input.previousExtensionHead },
    { tag: "review-event", value: input.eventIdentity },
    { tag: "review-payload-digest", value: input.payloadDigest },
    { tag: "transaction", value: input.transactionId },
    { tag: "extension-revision", value: String(input.revision) },
  ]));
}

function encodeCanonicalValue(value: unknown): Buffer {
  if (value === null) return Buffer.from([0]);
  if (typeof value === "boolean") return Buffer.from([1, value ? 1 : 0]);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("canonical-value-integer-out-of-range");
    return Buffer.concat([Buffer.from([2]), u64(value)]);
  }
  if (typeof value === "string") {
    const bytes = Buffer.from(value.normalize("NFC"), "utf8");
    return Buffer.concat([Buffer.from([3]), u64(bytes.length), bytes]);
  }
  if (Array.isArray(value)) {
    return Buffer.concat([Buffer.from([4]), u32(value.length), ...value.map(encodeCanonicalValue)]);
  }
  if (!isRecord(value)) throw new Error("unsupported-canonical-value");
  const entries = Object.entries(value).sort(([left], [right]) => compareUtf8(left, right));
  const chunks: Buffer[] = [Buffer.from([5]), u32(entries.length)];
  for (const [field, fieldValue] of entries) {
    if (fieldValue === undefined) throw new Error("undefined-canonical-value-field");
    const tag = Buffer.from(field, "utf8");
    chunks.push(u32(tag.length), tag, encodeCanonicalValue(fieldValue));
  }
  return Buffer.concat(chunks);
}

export function canonicalContractValueDigest(schemaId: string, value: unknown): ContractResult<string> {
  try {
    const domain = Buffer.from(`amadeus.contract-value.${schemaId}.v1`, "utf8");
    const encoded = encodeCanonicalValue(value);
    return success(sha256(Buffer.concat([u32(domain.length), domain, u64(encoded.length), encoded])));
  } catch (error) {
    return failure("MALFORMED", "canonicalValue", error instanceof Error ? error.message : String(error));
  }
}

export interface SafeSubjectReference {
  readonly subjectRef: string | null;
  readonly redactionStatus: RedactionStatus;
}
export interface SafeDecisionOption {
  readonly optionId: string;
  readonly safeLabel: string | null;
  readonly labelDigest: string | null;
  readonly redactionStatus: RedactionStatus;
}
export interface SafeEvidenceReference {
  readonly evidenceFingerprint: string | null;
  readonly safeKind: string;
  readonly redactionStatus: RedactionStatus;
}
export interface DecisionReviewReceipt {
  readonly reviewId: string;
  readonly reviewEventId: string;
  readonly auditTransactionId: string;
  readonly committedEventIdentities: readonly [string];
  readonly stateProjectionRevision: number;
  readonly state: "accepted" | "flagged";
  readonly remediation: RemediationKind | null;
}
export interface DecisionSummary {
  readonly intentUuid: string;
  readonly decisionId: string;
  readonly questionId: string;
  readonly occurrenceId: string;
  readonly safeQuestion: string | null;
  readonly questionDigest: string | null;
  readonly selectedOptionId: string;
  readonly decisionSource: AutoDecisionRecord["decider"];
  readonly safeBasisDigest: string | null;
  readonly decisionPrincipal: SafeSubjectReference;
  readonly decisionActor: SafeSubjectReference;
  readonly grantId: string | null;
  readonly evidenceFingerprint: string | null;
  readonly degradedCapability: string | null;
  readonly reviewState: DecisionReviewState;
  readonly redactionStatus: RedactionStatus;
}
export interface DecisionDetail extends DecisionSummary {
  readonly options: readonly SafeDecisionOption[];
  readonly evidence: readonly SafeEvidenceReference[];
  readonly graphRevision: string;
  readonly auditEventId: string;
  readonly reviewReceipt: DecisionReviewReceipt | null;
}
export interface DecisionCursor {
  readonly intentUuid: string;
  readonly queryFingerprint: string;
  readonly targetAuditRevision: number;
  readonly reviewExtensionHead: string | null;
  readonly projectionEventSetDigest: string;
  readonly lastOccurrenceId: string;
  readonly lastDecisionId: string;
  readonly cursorDigest: string;
}
export interface DecisionQuery {
  readonly intentUuid: string;
  readonly lifecycle: IntentLifecycle | "either";
  readonly reviewState?: DecisionReviewState;
  readonly pageSize: number;
  readonly cursor?: DecisionCursor;
}
export interface DecisionPage {
  readonly items: readonly DecisionSummary[];
  readonly nextCursor: DecisionCursor | null;
  readonly queryFingerprint: string;
}

export interface HumanReviewCommandBinding {
  readonly sourceIntentUuid: string;
  readonly targetIntentUuid: string;
  readonly decisionId: string;
  readonly choice: ReviewChoice;
  readonly commandOccurrenceId: string;
  readonly flagClassification: "contract-defect" | "specification-change" | "unspecified" | null;
  readonly safeNoteDigest: string | null;
}
export interface BoundHumanReviewCommand {
  readonly schemaVersion: "1";
  readonly sourceHumanTurnId: string;
  readonly command: HumanReviewCommandBinding;
  readonly commandBindingDigest: string;
}

// The pre-turn confirmation digest (OBS-R09/OBS-R12): binds WHAT is being
// confirmed — target, decision, choice, and the flag metadata with explicit
// nulls — before any turn exists. The commit recomputes this digest and
// refuses a mismatch; combined with the fresh-turn requirement this gives the
// set-autonomy confirmed-display-digest trust geometry, not a cryptographic
// attestation that a human saw a rendered display. Occurrence and turn ids
// are deliberately excluded: they are minted at commit time and would make
// the digest unobtainable at preview time.
interface ReviewCommandContentDigestInput {
  readonly targetIntentUuid: string;
  readonly decisionId: string;
  readonly choice: ReviewChoice;
  readonly flagClassification: HumanReviewCommandBinding["flagClassification"];
  readonly safeNoteDigest: string | null;
}

// The ONE normalization of flag metadata (explicit nulls for accept, the
// "unspecified" default for an unclassified flag, the note collapsed to its
// digest). Preview, expected-value recomputation, and command binding all call
// this, so the displayed digest and the verified digest cannot drift.
interface ReviewFlagMetadataInput {
  readonly choice: ReviewChoice;
  readonly flagClassification?: HumanReviewCommandBinding["flagClassification"] | undefined;
  readonly noteDigest?: string | null;
}

interface NormalizedReviewFlagMetadata {
  readonly flagClassification: HumanReviewCommandBinding["flagClassification"];
  readonly safeNoteDigest: string | null;
}

export function normalizeReviewFlagMetadata(input: ReviewFlagMetadataInput): NormalizedReviewFlagMetadata {
  if (input.choice !== "flag") return { flagClassification: null, safeNoteDigest: null };
  return {
    flagClassification: input.flagClassification ?? "unspecified",
    safeNoteDigest: input.noteDigest ?? null,
  };
}

export function reviewCommandContentDigest(input: ReviewCommandContentDigestInput): string {
  return canonicalTupleDigest("amadeus.review-command-content.v1", [
    { tag: "target-intent", value: input.targetIntentUuid },
    { tag: "decision", value: input.decisionId },
    { tag: "choice", value: input.choice },
    { tag: "flag-classification", value: input.flagClassification },
    { tag: "safe-note-digest", value: input.safeNoteDigest },
  ]);
}

export function bindHumanReviewCommand(input: HumanReviewCommandBinding & { readonly sourceHumanTurnId: string }): BoundHumanReviewCommand {
  const command: HumanReviewCommandBinding = {
    sourceIntentUuid: input.sourceIntentUuid,
    targetIntentUuid: input.targetIntentUuid,
    decisionId: input.decisionId,
    choice: input.choice,
    commandOccurrenceId: input.commandOccurrenceId,
    flagClassification: input.flagClassification,
    safeNoteDigest: input.safeNoteDigest,
  };
  if (command.choice === "accept" && (command.flagClassification !== null || command.safeNoteDigest !== null)) {
    throw new Error("accept-review-cannot-carry-flag-metadata");
  }
  const commandBindingDigest = canonicalTupleDigest("amadeus.review-command-binding.v1", [
    { tag: "source-intent", value: command.sourceIntentUuid },
    { tag: "target-intent", value: command.targetIntentUuid },
    { tag: "decision", value: command.decisionId },
    { tag: "choice", value: command.choice },
    { tag: "command-occurrence", value: command.commandOccurrenceId },
    { tag: "flag-classification", value: command.flagClassification },
    { tag: "safe-note-digest", value: command.safeNoteDigest },
    { tag: "human-turn", value: input.sourceHumanTurnId },
  ]);
  return { schemaVersion: "1", sourceHumanTurnId: input.sourceHumanTurnId, command, commandBindingDigest };
}

export interface HumanReviewAuthorizationInput {
  readonly command: HumanReviewCommandBinding;
  readonly sourceHumanTurnId: string;
  readonly sourceHumanTurnEventId: string;
}
export interface HumanReviewAuthorizationReceipt extends HumanReviewCommandBinding {
  readonly sourceHumanTurnId: string;
  readonly sourceHumanTurnEventId: string;
  readonly sourceAuditRevision: number;
  readonly principalId: string;
  readonly reviewActorId: string;
  readonly commandBindingDigest: string;
}
export interface DecisionReviewCommand {
  readonly targetIntentUuid: string;
  readonly decisionId: string;
  readonly choice: ReviewChoice;
  readonly expectedTargetAuditRevision: number;
  readonly expectedCompletionSealDigest: string | null;
  readonly humanAuthorization: HumanReviewAuthorizationReceipt;
}

export interface ReviewIntentSeed {
  readonly intentUuid: string;
  readonly lifecycle: IntentLifecycle;
  readonly autonomy: AutonomyProjection;
  readonly auditRevision: number;
  readonly completionSealDigest: string | null;
}
export interface HumanReviewTurnSeed {
  readonly sourceIntentUuid: string;
  readonly lifecycle: "active";
  readonly sourceAuditRevision: number;
  readonly sourceHumanTurnId: string;
  readonly sourceHumanTurnEventId: string;
  readonly principalId: string;
  readonly binding: BoundHumanReviewCommand;
}
export interface SafeDecisionRedactor {
  redact(kind: "question", value: string): { readonly value: string; readonly status: "redacted" } | { readonly value: null; readonly status: "withheld" };
}

export interface AutoDecisionReviewedEvent {
  readonly eventType: typeof AUTO_DECISION_REVIEWED_EVENT;
  readonly eventIdentity: string;
  readonly transactionId: string;
  readonly payloadDigest: string;
  readonly payloadV1: string;
  readonly targetIntentUuid: string;
  readonly decisionId: string;
  readonly choice: ReviewChoice;
  readonly principalId: string;
  readonly actorId: string;
  readonly decisionPrincipalId: string;
  readonly decisionActorId: string;
  readonly decisionSource: AutoDecisionRecord["decider"];
  readonly safeBasisDigest: string;
  readonly grantId: string | null;
  readonly sourceIntentUuid: string;
  readonly sourceHumanTurnId: string;
  readonly sourceHumanTurnEventId: string;
  readonly commandOccurrenceId: string;
  readonly commandBindingDigest: string;
  readonly lifecycleAtReview: IntentLifecycle;
  readonly remediation: RemediationKind | null;
  readonly flagClassification: HumanReviewCommandBinding["flagClassification"];
  readonly safeNoteDigest: string | null;
  readonly redactionStatus: RedactionStatus;
  readonly projectionRevision: number;
  readonly receipt: DecisionReviewReceipt;
}

interface IntentState extends ReviewIntentSeed {
  readonly reviews: readonly AutoDecisionReviewedEvent[];
  readonly reviewExtensionHead: string | null;
  readonly reviewExtensionRevision: number;
}

export interface ReadIntentObservation extends ReviewIntentSeed {
  readonly reviewExtensionHead: string | null;
  readonly reviewExtensionRevision: number;
}

export interface AutonomyReviewPersistenceState extends ReviewIntentSeed {
  readonly reviews: readonly AutoDecisionReviewedEvent[];
  readonly reviewExtensionHead: string | null;
  readonly reviewExtensionRevision: number;
}
export interface AutonomyReviewPersistenceValue {
  readonly schemaVersion: 1;
  readonly intents: readonly AutonomyReviewPersistenceState[];
  readonly humanTurns: readonly HumanReviewTurnSeed[];
}
export interface AutonomyReviewPersistenceSnapshot {
  readonly value: AutonomyReviewPersistenceValue;
  readonly digest: string;
}

function validatePersistedReviewEvent(
  persisted: AutonomyReviewPersistenceState,
  event: AutoDecisionReviewedEvent,
  expectedProjectionRevision: number,
): void {
  let payload: unknown;
  try {
    payload = JSON.parse(event.payloadV1);
  } catch {
    throw new Error("invalid-autonomy-review-persistence-payload");
  }
  const payloadDigest = canonicalContractValueDigest("auto-decision-reviewed-payload", payload);
  if (!payloadDigest.ok || payloadDigest.value !== event.payloadDigest || !isRecord(payload)) {
    throw new Error("invalid-autonomy-review-persistence-payload");
  }
  const fieldsMatch = [
    payload.targetIntentUuid === persisted.intentUuid,
    payload.decisionId === event.decisionId,
    payload.choice === event.choice,
    payload.auditTransactionId === event.transactionId,
    payload.receiptProjectionRevision === expectedProjectionRevision,
    event.projectionRevision === expectedProjectionRevision,
    payload.remediation === event.remediation,
    payload.flagClassification === event.flagClassification,
    payload.grantId === event.grantId,
    payload.lifecycleAtReview === event.lifecycleAtReview,
    payload.reviewPrincipalRef === event.principalId,
    payload.reviewActorRef === event.actorId,
    payload.safeNoteDigest === event.safeNoteDigest,
    payload.commandBindingDigest === event.commandBindingDigest,
  ].every(Boolean);
  if (!fieldsMatch) {
    throw new Error("invalid-autonomy-review-persistence-payload");
  }
  const expectedIdentity = autonomyReviewStableId("review-event", canonicalTupleDigest("amadeus.decision-review-event.v1", [
    { tag: "review", value: event.receipt.reviewId },
    { tag: "command-occurrence", value: event.commandOccurrenceId },
    { tag: "target-audit-revision", value: String(expectedProjectionRevision - 1) },
    { tag: "review-payload-digest", value: event.payloadDigest },
  ]));
  if (event.eventIdentity !== expectedIdentity || event.receipt.reviewEventId !== expectedIdentity ||
    event.receipt.auditTransactionId !== event.transactionId ||
    event.receipt.stateProjectionRevision !== expectedProjectionRevision) {
    throw new Error("invalid-autonomy-review-persistence-identity");
  }
}

// A sealed (#1248) completed target cannot grow its own journal, so post-seal
// reviews land on a SOURCE journal and legitimately carry a projection revision
// past the target's audit revision — that overflow is exactly what the review
// extension chain fingerprints. Active targets keep the strict in-journal bound.
function withinPersistedRevisionBound(persisted: AutonomyReviewPersistenceState, revision: number): boolean {
  if (persisted.lifecycle === "completed" && persisted.completionSealDigest !== null) return true;
  return revision <= persisted.auditRevision;
}

function validatePersistedReviewState(persisted: AutonomyReviewPersistenceState): void {
  const decisionIds = new Set(persisted.autonomy.autoDecisions.map((decision) => decision.decisionId));
  const reviewed = new Set<string>();
  let priorReviewRevision = 0;
  let extensionHead: string | null = null;
  let extensionRevision = 0;
  for (const event of persisted.reviews) {
    if (event.eventType !== AUTO_DECISION_REVIEWED_EVENT || event.targetIntentUuid !== persisted.intentUuid ||
      !decisionIds.has(event.decisionId) || reviewed.has(event.decisionId) ||
      event.projectionRevision <= priorReviewRevision || !withinPersistedRevisionBound(persisted, event.projectionRevision)) {
      throw new Error("invalid-autonomy-review-persistence-events");
    }
    reviewed.add(event.decisionId);
    priorReviewRevision = event.projectionRevision;
    validatePersistedReviewEvent(persisted, event, event.projectionRevision);
    if (persisted.lifecycle !== "completed") continue;
    extensionRevision += 1;
    extensionHead = nextReviewExtensionHead({
      completionSealDigest: persisted.completionSealDigest,
      previousExtensionHead: extensionHead,
      eventIdentity: event.eventIdentity,
      payloadDigest: event.payloadDigest,
      transactionId: event.transactionId,
      revision: extensionRevision,
    });
  }
  if (persisted.lifecycle === "active") {
    if (persisted.reviewExtensionHead !== null || persisted.reviewExtensionRevision !== 0) {
      throw new Error("invalid-autonomy-review-extension-snapshot");
    }
    return;
  }
  if (persisted.reviewExtensionHead !== extensionHead || persisted.reviewExtensionRevision !== extensionRevision) {
    throw new Error("invalid-autonomy-review-extension-snapshot");
  }
}

function reviewEligible(decision: AutoDecisionRecord): boolean {
  return decision.reviewState === "unreviewed" &&
    (decision.decider === "solo-election" || decision.decider === "agent-recommendation");
}

function reviewState(state: IntentState, decision: AutoDecisionRecord): DecisionReviewState {
  const terminal = state.reviews.find((event) => event.decisionId === decision.decisionId);
  if (terminal !== undefined) return terminal.choice === "accept" ? "accepted" : "flagged";
  return reviewEligible(decision) ? "unreviewed" : "not-applicable";
}

function queryFingerprint(query: DecisionQuery): string {
  return canonicalTupleDigest("amadeus.decision-query.v1", [
    { tag: "target-intent", value: query.intentUuid },
    { tag: "lifecycle", value: query.lifecycle },
    { tag: "review-state", value: query.reviewState ?? null },
    { tag: "page-size", value: String(query.pageSize) },
  ]);
}

// The set contract sorts entries by the CLOSED event-type order (AUTO_DECIDED,
// then AUTO_DECISION_REVIEWED), then canonical event id — never by entry-digest
// bytes — dedupes identical (id, digest) pairs, and closes a same-id
// different-digest pair as a CONFLICT rather than encoding both.
function eventSetDigest(state: IntentState): ContractResult<string> {
  const decisions: Array<{ typeOrder: number; eventId: string; digest: string }> = [];
  for (const decision of state.autonomy.autoDecisions) {
    const payloadDigest = canonicalContractValueDigest("auto-decision", decision);
    if (!payloadDigest.ok) {
      return failure("MALFORMED", "projectionEventSet", `decision ${decision.decisionId} payload digest failed: ${payloadDigest.error.detail}`);
    }
    decisions.push({ typeOrder: 0, eventId: decision.decisionId, digest: canonicalTupleDigest("amadeus.decision-projection-event.v1", [
      { tag: "event-type", value: "AUTO_DECIDED" },
      { tag: "event-id", value: decision.decisionId },
      { tag: "decision-payload-digest", value: payloadDigest.value },
      { tag: "subject-payload-digest", value: canonicalTupleDigest("amadeus.decision-subject.v1", [
        { tag: "principal", value: decision.principalId },
        { tag: "actor", value: decision.actorId },
      ]) },
      { tag: "review-payload-digest", value: null },
    ]) });
  }
  const reviews = state.reviews.map((review) => ({ typeOrder: 1, eventId: review.eventIdentity, digest: canonicalTupleDigest("amadeus.decision-projection-event.v1", [
    { tag: "event-type", value: AUTO_DECISION_REVIEWED_EVENT },
    { tag: "event-id", value: review.eventIdentity },
    { tag: "decision-payload-digest", value: null },
    { tag: "subject-payload-digest", value: null },
    { tag: "review-payload-digest", value: review.payloadDigest },
  ]) }));
  const ordered = [...decisions, ...reviews].sort(
    (left, right) => (left.typeOrder - right.typeOrder) || compareUtf8(left.eventId, right.eventId),
  );
  const deduped: typeof ordered = [];
  for (const entry of ordered) {
    const previous = deduped.at(-1);
    if (previous !== undefined && previous.typeOrder === entry.typeOrder && previous.eventId === entry.eventId) {
      if (previous.digest !== entry.digest) {
        return failure("CONFLICT", "projectionEventSet", `duplicate event id ${entry.eventId} with diverging entry digests`);
      }
      continue;
    }
    deduped.push(entry);
  }
  return success(canonicalTupleDigest("amadeus.decision-projection-event-set.v1", [
    { tag: "target-intent", value: state.intentUuid },
    { tag: "event-count", value: String(deduped.length) },
    ...deduped.map((entry) => ({ tag: "event", value: entry.digest })),
  ]));
}

function cursorDigest(cursor: Omit<DecisionCursor, "cursorDigest">): string {
  return canonicalTupleDigest("amadeus.decision-cursor.v1", [
    { tag: "query-fingerprint", value: cursor.queryFingerprint },
    { tag: "target-audit-revision", value: String(cursor.targetAuditRevision) },
    { tag: "review-extension-head", value: cursor.reviewExtensionHead },
    { tag: "projection-event-set-digest", value: cursor.projectionEventSetDigest },
    { tag: "last-occurrence", value: cursor.lastOccurrenceId },
    { tag: "last-decision", value: cursor.lastDecisionId },
  ]);
}

function validateCursorSnapshot(
  query: DecisionQuery,
  state: IntentState,
  fingerprint: string,
  projectionDigest: string,
): ContractResult<null> {
  if (query.cursor === undefined) return success(null);
  const { cursorDigest: suppliedDigest, ...unsigned } = query.cursor;
  if (query.cursor.intentUuid !== query.intentUuid || query.cursor.queryFingerprint !== fingerprint ||
    cursorDigest(unsigned) !== suppliedDigest) {
    return failure("MALFORMED", "cursor", "cursor does not match query");
  }
  if (query.cursor.targetAuditRevision !== state.auditRevision ||
    query.cursor.reviewExtensionHead !== state.reviewExtensionHead ||
    query.cursor.projectionEventSetDigest !== projectionDigest) {
    return failure("CONFLICT", "cursorSnapshot", "decision snapshot changed");
  }
  return success(null);
}

function pageStart(query: DecisionQuery, summaries: readonly DecisionSummary[]): ContractResult<number> {
  if (query.cursor === undefined) return success(0);
  const index = summaries.findIndex((item) =>
    item.occurrenceId === query.cursor?.lastOccurrenceId && item.decisionId === query.cursor.lastDecisionId
  );
  return index < 0
    ? failure("CONFLICT", "cursorSnapshot", "cursor item is absent from snapshot")
    : success(index + 1);
}

function remediationFor(receipt: HumanReviewAuthorizationReceipt): RemediationKind | null {
  if (receipt.choice === "accept") return null;
  if (receipt.flagClassification === "specification-change") return "self-feature";
  if (receipt.flagClassification === "contract-defect") return "self-fix";
  return "self-fix-with-feature-alternative";
}

interface PlannedDecisionReview {
  readonly event: AutoDecisionReviewedEvent;
  readonly receipt: DecisionReviewReceipt;
  readonly reviewExtensionHead: string | null;
  readonly reviewExtensionRevision: number;
}

type ResolvedReviewTarget =
  | { readonly kind: "ready"; readonly decision: AutoDecisionRecord }
  | { readonly kind: "terminal"; readonly result: ContractResult<DecisionReviewReceipt> };

function resolveReviewTarget(state: IntentState, input: DecisionReviewCommand): ResolvedReviewTarget {
  const decision = state.autonomy.autoDecisions.find((candidate) => candidate.decisionId === input.decisionId);
  if (decision === undefined) {
    return { kind: "terminal", result: failure("CONFLICT", "decisionId", "decision not found in target intent") };
  }
  const terminal = state.reviews.find((review) => review.decisionId === input.decisionId);
  if (terminal !== undefined) {
    const result = terminal.choice === input.choice
      ? success(terminal.receipt)
      : failure("CONFLICT", "reviewState", "decision already has a different terminal review");
    return { kind: "terminal", result };
  }
  if (!reviewEligible(decision)) {
    return { kind: "terminal", result: failure("CONFLICT", "reviewState", "decision is not review eligible") };
  }
  return { kind: "ready", decision };
}

function planDecisionReview(
  state: IntentState,
  decision: AutoDecisionRecord,
  input: DecisionReviewCommand,
): ContractResult<PlannedDecisionReview> {
  const authorization = input.humanAuthorization;
  const reviewId = autonomyReviewStableId("review", canonicalTupleDigest("amadeus.decision-review.v1", [
    { tag: "target-intent", value: state.intentUuid },
    { tag: "decision", value: decision.decisionId },
    { tag: "source-human-turn-event", value: authorization.sourceHumanTurnEventId },
    { tag: "choice", value: input.choice },
  ]));
  const transactionId = autonomyReviewStableId("review-transaction", canonicalTupleDigest("amadeus.decision-review-transaction.v1", [
    { tag: "target-intent", value: state.intentUuid },
    { tag: "review", value: reviewId },
    { tag: "target-audit-revision", value: String(state.auditRevision) },
    { tag: "completion-seal", value: state.completionSealDigest },
  ]));
  const remediation = remediationFor(authorization);
  const projectionRevision = state.auditRevision + 1;
  const payload = {
    schemaVersion: "1",
    targetIntentUuid: state.intentUuid,
    decisionId: decision.decisionId,
    reviewId,
    choice: input.choice,
    reviewPrincipalRef: authorization.principalId,
    reviewActorRef: authorization.reviewActorId,
    decisionPrincipalRef: decision.principalId,
    decisionActorRef: decision.actorId,
    decisionSource: decision.decider,
    safeBasisDigest: decision.basisFingerprint,
    grantId: decision.grantId,
    sourceIntentUuid: authorization.sourceIntentUuid,
    sourceHumanTurnId: authorization.sourceHumanTurnId,
    sourceHumanTurnEventId: authorization.sourceHumanTurnEventId,
    commandOccurrenceId: authorization.commandOccurrenceId,
    commandBindingDigest: authorization.commandBindingDigest,
    auditTransactionId: transactionId,
    receiptProjectionRevision: projectionRevision,
    lifecycleAtReview: state.lifecycle,
    remediation,
    flagClassification: authorization.flagClassification,
    safeNoteDigest: authorization.safeNoteDigest,
    redactionStatus: "redacted" as const,
  };
  const payloadDigest = canonicalContractValueDigest("auto-decision-reviewed-payload", payload);
  if (!payloadDigest.ok) return payloadDigest;
  const eventIdentity = autonomyReviewStableId("review-event", canonicalTupleDigest("amadeus.decision-review-event.v1", [
    { tag: "review", value: reviewId },
    { tag: "command-occurrence", value: authorization.commandOccurrenceId },
    { tag: "target-audit-revision", value: String(state.auditRevision) },
    { tag: "review-payload-digest", value: payloadDigest.value },
  ]));
  const receipt: DecisionReviewReceipt = {
    reviewId,
    reviewEventId: eventIdentity,
    auditTransactionId: transactionId,
    committedEventIdentities: [eventIdentity],
    stateProjectionRevision: projectionRevision,
    state: input.choice === "accept" ? "accepted" : "flagged",
    remediation,
  };
  const event: AutoDecisionReviewedEvent = {
    eventType: "AUTO_DECISION_REVIEWED",
    eventIdentity,
    transactionId,
    payloadDigest: payloadDigest.value,
    payloadV1: JSON.stringify(payload),
    targetIntentUuid: state.intentUuid,
    decisionId: decision.decisionId,
    choice: input.choice,
    principalId: authorization.principalId,
    actorId: authorization.reviewActorId,
    decisionPrincipalId: decision.principalId,
    decisionActorId: decision.actorId,
    decisionSource: decision.decider,
    safeBasisDigest: decision.basisFingerprint,
    grantId: decision.grantId,
    sourceIntentUuid: authorization.sourceIntentUuid,
    sourceHumanTurnId: authorization.sourceHumanTurnId,
    sourceHumanTurnEventId: authorization.sourceHumanTurnEventId,
    commandOccurrenceId: authorization.commandOccurrenceId,
    commandBindingDigest: authorization.commandBindingDigest,
    lifecycleAtReview: state.lifecycle,
    remediation,
    flagClassification: authorization.flagClassification,
    safeNoteDigest: authorization.safeNoteDigest,
    redactionStatus: "redacted",
    projectionRevision,
    receipt,
  };
  if (state.lifecycle === "active") {
    return success({ event, receipt, reviewExtensionHead: null, reviewExtensionRevision: 0 });
  }
  const reviewExtensionRevision = state.reviewExtensionRevision + 1;
  const reviewExtensionHead = nextReviewExtensionHead({
    completionSealDigest: state.completionSealDigest,
    previousExtensionHead: state.reviewExtensionHead,
    eventIdentity,
    payloadDigest: payloadDigest.value,
    transactionId,
    revision: reviewExtensionRevision,
  });
  return success({ event, receipt, reviewExtensionHead, reviewExtensionRevision });
}

function sameCommand(left: HumanReviewCommandBinding, right: HumanReviewCommandBinding): boolean {
  const leftDigest = canonicalContractValueDigest("review-command", left);
  const rightDigest = canonicalContractValueDigest("review-command", right);
  return leftDigest.ok && rightDigest.ok && leftDigest.value === rightDigest.value;
}

export interface AutonomyReviewService {
  readonly createdIntentCount: 0;
  listAutoDecisions(query: DecisionQuery): ContractResult<DecisionPage>;
  getAutoDecision(intentUuid: string, decisionId: string): ContractResult<DecisionDetail>;
  authorizeHumanReview(input: HumanReviewAuthorizationInput): ContractResult<HumanReviewAuthorizationReceipt>;
  appendDecisionReview(input: DecisionReviewCommand): ContractResult<DecisionReviewReceipt>;
  readIntent(intentUuid: string): ReadIntentObservation | null;
  readReviewEvents(intentUuid: string): readonly AutoDecisionReviewedEvent[];
  exportSnapshot(): AutonomyReviewPersistenceSnapshot;
  replaceIntent(seed: ReviewIntentSeed): void;
}

interface MemoryAutonomyReviewServiceOptions {
  readonly intents?: readonly ReviewIntentSeed[];
  readonly humanTurns?: readonly HumanReviewTurnSeed[];
  readonly redactor?: SafeDecisionRedactor;
  readonly snapshot?: AutonomyReviewPersistenceSnapshot;
}

export function createMemoryAutonomyReviewService(options: MemoryAutonomyReviewServiceOptions = {}): AutonomyReviewService {
  const intents = new Map<string, IntentState>();
  const humanTurns = new Map<string, HumanReviewTurnSeed>();
  const redactor = options.redactor ?? { redact: (): { value: null; status: "withheld" } => ({ value: null, status: "withheld" }) };

  function put(seed: ReviewIntentSeed): void {
    assertLegalAutonomyProjection(seed.autonomy);
    if (seed.intentUuid !== seed.autonomy.intentUuid || !Number.isSafeInteger(seed.auditRevision) || seed.auditRevision < 0 ||
      (seed.lifecycle === "completed") !== (seed.completionSealDigest !== null)) {
      throw new Error("invalid-review-intent-seed");
    }
    const current = intents.get(seed.intentUuid);
    // Retained reviews must still name decisions the REPLACEMENT projection
    // carries — otherwise the runtime state would report a terminal review for
    // a decision the snapshot validator (validatePersistedReviewState) rejects.
    const decisionIds = new Set(seed.autonomy.autoDecisions.map((decision) => decision.decisionId));
    for (const review of current?.reviews ?? []) {
      if (!decisionIds.has(review.decisionId)) throw new Error("invalid-review-intent-seed");
    }
    intents.set(seed.intentUuid, {
      ...seed,
      reviews: current?.reviews ?? [],
      reviewExtensionHead: current?.reviewExtensionHead ?? null,
      reviewExtensionRevision: current?.reviewExtensionRevision ?? 0,
    });
  }

  if (options.snapshot !== undefined) {
    const observedDigest = canonicalContractValueDigest("autonomy-review-persistence", options.snapshot.value);
    if (!observedDigest.ok || observedDigest.value !== options.snapshot.digest || options.snapshot.value.schemaVersion !== 1) {
      throw new Error("invalid-autonomy-review-persistence-snapshot");
    }
    for (const persisted of options.snapshot.value.intents) {
      put(persisted);
      validatePersistedReviewState(persisted);
      intents.set(persisted.intentUuid, { ...persisted });
    }
    for (const turn of options.snapshot.value.humanTurns) {
      humanTurns.set(`${turn.sourceIntentUuid}\0${turn.sourceHumanTurnId}\0${turn.sourceHumanTurnEventId}`, turn);
    }
  }
  for (const seed of options.intents ?? []) put(seed);
  for (const turn of options.humanTurns ?? []) humanTurns.set(`${turn.sourceIntentUuid}\0${turn.sourceHumanTurnId}\0${turn.sourceHumanTurnEventId}`, turn);

  function summarize(state: IntentState, decision: AutoDecisionRecord): DecisionSummary {
    const redactedQuestion = redactor.redact("question", decision.question);
    const questionDigest = redactedQuestion.value === null ? null : canonicalTupleDigest("amadeus.redacted-value.v1", [
      { tag: "value-kind", value: "question" },
      { tag: "value", value: redactedQuestion.value },
    ]);
    return {
      intentUuid: state.intentUuid,
      decisionId: decision.decisionId,
      questionId: decision.occurrenceId,
      occurrenceId: decision.occurrenceId,
      safeQuestion: redactedQuestion.value,
      questionDigest,
      selectedOptionId: decision.selectedOptionId,
      decisionSource: decision.decider,
      safeBasisDigest: decision.basisFingerprint,
      decisionPrincipal: { subjectRef: decision.principalId, redactionStatus: "redacted" },
      decisionActor: { subjectRef: decision.actorId, redactionStatus: "redacted" },
      grantId: decision.grantId,
      evidenceFingerprint: decision.basisFingerprint,
      degradedCapability: decision.degradedCapability?.capability ?? null,
      reviewState: reviewState(state, decision),
      redactionStatus: redactedQuestion.status,
    };
  }

  function listAutoDecisions(query: DecisionQuery): ContractResult<DecisionPage> {
    if (!Number.isSafeInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) {
      return failure("MALFORMED", "pageSize", "page size must be between 1 and 100");
    }
    const state = intents.get(query.intentUuid);
    if (state === undefined) return failure("CONFLICT", "intentUuid", "target intent not found");
    if (query.lifecycle !== "either" && query.lifecycle !== state.lifecycle) {
      return failure("CONFLICT", "lifecycle", "target lifecycle does not match query");
    }
    const fingerprint = queryFingerprint(query);
    const projectionSet = eventSetDigest(state);
    if (!projectionSet.ok) return projectionSet;
    const projectionDigest = projectionSet.value;
    const validCursor = validateCursorSnapshot(query, state, fingerprint, projectionDigest);
    if (!validCursor.ok) return validCursor;
    const summaries = state.autonomy.autoDecisions.map((decision) => summarize(state, decision))
      .filter((item) => query.reviewState === undefined || item.reviewState === query.reviewState)
      .sort((left, right) => compareUtf8(left.occurrenceId, right.occurrenceId) || compareUtf8(left.decisionId, right.decisionId));
    const resolvedStart = pageStart(query, summaries);
    if (!resolvedStart.ok) return resolvedStart;
    const start = resolvedStart.value;
    const items = summaries.slice(start, start + query.pageSize);
    const last = items.at(-1);
    let nextCursor: DecisionCursor | null = null;
    if (last !== undefined && start + items.length < summaries.length) {
      const unsigned = {
        intentUuid: query.intentUuid,
        queryFingerprint: fingerprint,
        targetAuditRevision: state.auditRevision,
        reviewExtensionHead: state.reviewExtensionHead,
        projectionEventSetDigest: projectionDigest,
        lastOccurrenceId: last.occurrenceId,
        lastDecisionId: last.decisionId,
      };
      nextCursor = { ...unsigned, cursorDigest: cursorDigest(unsigned) };
    }
    return success({ items, nextCursor, queryFingerprint: fingerprint });
  }

  function getAutoDecision(intentUuid: string, decisionId: string): ContractResult<DecisionDetail> {
    const state = intents.get(intentUuid);
    const decision = state?.autonomy.autoDecisions.find((candidate) => candidate.decisionId === decisionId);
    if (state === undefined || decision === undefined) {
      return failure("CONFLICT", "decisionId", "decision not found in target intent");
    }
    const summary = summarize(state, decision);
    const terminal = state.reviews.find((review) => review.decisionId === decisionId);
    return success({
      ...summary,
      options: decision.optionIds.map((optionId) => ({ optionId, safeLabel: null, labelDigest: null, redactionStatus: "withheld" })),
      evidence: [{ evidenceFingerprint: decision.basisFingerprint, safeKind: decision.basisKind, redactionStatus: "redacted" }],
      graphRevision: state.autonomy.modeProvenance.kind === "human-command"
        ? state.autonomy.modeProvenance.confirmedDisplayDigest
        : canonicalTupleDigest("amadeus.legacy-graph-revision.v1", [{ tag: "decision", value: decision.decisionId }]),
      auditEventId: decision.decisionId,
      reviewReceipt: terminal?.receipt ?? null,
    });
  }

  function authorizeHumanReview(input: HumanReviewAuthorizationInput): ContractResult<HumanReviewAuthorizationReceipt> {
    const key = `${input.command.sourceIntentUuid}\0${input.sourceHumanTurnId}\0${input.sourceHumanTurnEventId}`;
    const turn = humanTurns.get(key);
    const sourceIntent = turn === undefined ? undefined : intents.get(turn.sourceIntentUuid);
    if (turn === undefined || turn.lifecycle !== "active" || sourceIntent?.lifecycle !== "active" ||
      sourceIntent.auditRevision !== turn.sourceAuditRevision) {
      return failure("PROVENANCE_REQUIRED", "sourceHumanTurnId", "real active human turn not found");
    }
    const rebound = bindHumanReviewCommand({ ...input.command, sourceHumanTurnId: input.sourceHumanTurnId });
    if (!sameCommand(turn.binding.command, input.command) || turn.binding.commandBindingDigest !== rebound.commandBindingDigest ||
      turn.binding.sourceHumanTurnId !== input.sourceHumanTurnId) {
      return failure("PROVENANCE_REQUIRED", "commandBindingDigest", "human turn command binding mismatch");
    }
    return success({
      ...input.command,
      sourceHumanTurnId: input.sourceHumanTurnId,
      sourceHumanTurnEventId: input.sourceHumanTurnEventId,
      sourceAuditRevision: turn.sourceAuditRevision,
      principalId: turn.principalId,
      reviewActorId: turn.principalId,
      commandBindingDigest: turn.binding.commandBindingDigest,
    });
  }

  function validateCanonicalReviewAuthorization(
    state: IntentState,
    input: DecisionReviewCommand,
  ): ContractResult<null> {
    const authorization = input.humanAuthorization;
    if (authorization.targetIntentUuid !== input.targetIntentUuid || authorization.decisionId !== input.decisionId ||
      authorization.choice !== input.choice) {
      return failure("PROVENANCE_REQUIRED", "humanAuthorization", "authorization does not bind this review command");
    }
    const sourceKey = `${authorization.sourceIntentUuid}\0${authorization.sourceHumanTurnId}\0${authorization.sourceHumanTurnEventId}`;
    const source = humanTurns.get(sourceKey);
    const sourceIntent = source === undefined ? undefined : intents.get(source.sourceIntentUuid);
    if (source === undefined || source.lifecycle !== "active" || sourceIntent?.lifecycle !== "active" ||
      sourceIntent.auditRevision !== source.sourceAuditRevision || source.sourceAuditRevision !== authorization.sourceAuditRevision ||
      source.binding.commandBindingDigest !== authorization.commandBindingDigest || source.principalId !== authorization.principalId) {
      return failure("PROVENANCE_REQUIRED", "sourceIntentUuid", "human authorization is no longer canonical");
    }
    if (state.lifecycle === "active" && authorization.sourceIntentUuid !== state.intentUuid) {
      return failure("PROVENANCE_REQUIRED", "sourceIntentUuid", "active target must use its own human turn");
    }
    return success(null);
  }

  function validateReviewExpectation(state: IntentState, input: DecisionReviewCommand): ContractResult<null> {
    if (input.expectedTargetAuditRevision !== state.auditRevision) {
      return failure("CONFLICT", "targetAuditRevision", "target audit revision changed");
    }
    if (state.lifecycle === "completed" && input.expectedCompletionSealDigest !== state.completionSealDigest) {
      return failure("CONFLICT", "completionSealDigest", "completion seal changed");
    }
    if (state.lifecycle === "active" && input.expectedCompletionSealDigest !== null) {
      return failure("MALFORMED", "completionSealDigest", "active review cannot carry a completion seal");
    }
    return success(null);
  }

  function appendDecisionReview(input: DecisionReviewCommand): ContractResult<DecisionReviewReceipt> {
    const state = intents.get(input.targetIntentUuid);
    if (state === undefined) return failure("CONFLICT", "targetIntentUuid", "target intent not found");
    const target = resolveReviewTarget(state, input);
    if (target.kind === "terminal") return target.result;
    const canonicalAuthorization = validateCanonicalReviewAuthorization(state, input);
    if (!canonicalAuthorization.ok) return canonicalAuthorization;
    const expectation = validateReviewExpectation(state, input);
    if (!expectation.ok) return expectation;
    const plan = planDecisionReview(state, target.decision, input);
    if (!plan.ok) return plan;
    intents.set(state.intentUuid, {
      ...state,
      auditRevision: plan.value.receipt.stateProjectionRevision,
      reviews: [...state.reviews, plan.value.event],
      reviewExtensionHead: plan.value.reviewExtensionHead,
      reviewExtensionRevision: plan.value.reviewExtensionRevision,
    });
    return success(plan.value.receipt);
  }

  return {
    createdIntentCount: 0,
    listAutoDecisions,
    getAutoDecision,
    authorizeHumanReview,
    appendDecisionReview,
    readIntent(intentUuid) {
      const state = intents.get(intentUuid);
      if (state === undefined) return null;
      return {
        intentUuid: state.intentUuid,
        lifecycle: state.lifecycle,
        autonomy: state.autonomy,
        auditRevision: state.auditRevision,
        completionSealDigest: state.completionSealDigest,
        reviewExtensionHead: state.reviewExtensionHead,
        reviewExtensionRevision: state.reviewExtensionRevision,
      };
    },
    readReviewEvents(intentUuid) {
      return [...(intents.get(intentUuid)?.reviews ?? [])];
    },
    exportSnapshot() {
      const value: AutonomyReviewPersistenceValue = {
        schemaVersion: 1,
        intents: [...intents.values()].sort((left, right) => compareUtf8(left.intentUuid, right.intentUuid)),
        humanTurns: [...humanTurns.values()].sort((left, right) =>
          compareUtf8(left.sourceIntentUuid, right.sourceIntentUuid) ||
          compareUtf8(left.sourceHumanTurnEventId, right.sourceHumanTurnEventId)
        ),
      };
      const digest = canonicalContractValueDigest("autonomy-review-persistence", value);
      if (!digest.ok) throw new Error(digest.error.detail);
      return { value, digest: digest.value };
    },
    replaceIntent: put,
  };
}

export function reviewAuditFields(event: AutoDecisionReviewedEvent): Readonly<Record<string, string>> {
  const fields: Record<string, string> = {
    "Intent Uuid": event.targetIntentUuid,
    "Decision Id": event.decisionId,
    "Review Id": event.receipt.reviewId,
    Choice: event.choice,
    Lifecycle: event.lifecycleAtReview,
    "Review Principal": event.principalId,
    "Review Actor": event.actorId,
    "Source Human Turn": event.sourceHumanTurnId,
    "Audit Transaction Id": event.transactionId,
    "Event Identity": event.eventIdentity,
    "Projection Revision": String(event.projectionRevision),
    "Payload Digest": event.payloadDigest,
    "Payload V1": event.payloadV1,
  };
  fields["Decision Principal"] = event.decisionPrincipalId;
  fields["Decision Actor"] = event.decisionActorId;
  fields["Decision Source"] = event.decisionSource;
  fields["Basis Digest"] = event.safeBasisDigest;
  fields["Redaction Status"] = event.redactionStatus;
  if (event.grantId !== null) fields["Grant Id"] = event.grantId;
  if (event.remediation !== null) fields.Remediation = event.remediation;
  if (event.safeNoteDigest !== null) fields["Note Digest"] = event.safeNoteDigest;
  return fields;
}

export interface DecisionReviewCounts {
  readonly total: number;
  readonly unreviewed: number;
  readonly accepted: number;
  readonly flagged: number;
}
export interface SafeGrantScopeSummary {
  readonly scopeFingerprint: string;
  readonly selfScopeId: string;
  readonly allowedInteractionKinds: readonly ("stage-gate" | "phase-gate" | "walking-skeleton" | "question")[];
}
export interface SafeMigrationDiagnostic {
  readonly status: "legacy-non-authoritative";
  readonly legacyGrantIds: readonly string[];
  readonly recommendedHumanAction: "select-none" | "select-semi" | "issue-full";
}
export interface ReviewStatusInput {
  readonly intentUuid: string;
  readonly lifecycle: IntentLifecycle;
  readonly autonomy: AutonomyProjection;
  readonly workflowResult: WorkflowResult | null;
  readonly currentGrantScope: SafeGrantScopeSummary | null;
  readonly decisionPolicyCount: number;
  readonly decisionCounts: DecisionReviewCounts;
  readonly reviewExtensionHead: string | null;
  readonly legacyDiagnostic: SafeMigrationDiagnostic | null;
}
export interface GrantStatusView {
  readonly grantId: string;
  readonly state: IntentGrantState;
  readonly scope: SafeGrantScopeSummary;
}
export interface MachineReviewStatus {
  readonly intentUuid: string;
  readonly lifecycle: IntentLifecycle;
  readonly autonomyMode: AutonomyProjection["mode"];
  readonly workflowExecutionState: AutonomyProjection["workflowExecutionState"];
  readonly grant: GrantStatusView | null;
  readonly decisionPolicyCount: number;
  readonly decisionCount: number;
  readonly unreviewedDecisionCount: number;
  readonly acceptedDecisionCount: number;
  readonly flaggedDecisionCount: number;
  readonly suspendedReason: WorkflowResult["reasonCode"];
  readonly stopReason: WorkflowResult["reasonCode"];
  readonly resumeCondition: ResumeCondition | null;
  readonly legacyDiagnostic: SafeMigrationDiagnostic | null;
}

function validateStatusCounts(input: ReviewStatusInput): ContractResult<null> {
  const counts = input.decisionCounts;
  const values = [input.decisionPolicyCount, counts.total, counts.unreviewed, counts.accepted, counts.flagged];
  if (input.intentUuid !== input.autonomy.intentUuid || values.some((value) => !Number.isSafeInteger(value) || value < 0) ||
    counts.unreviewed + counts.accepted + counts.flagged > counts.total) {
    return failure("MALFORMED", "statusInput", "status counts or intent identity are invalid");
  }
  return success(null);
}

function validateStatusGrant(input: ReviewStatusInput): ContractResult<null> {
  const grant = input.autonomy.currentGrant;
  if (input.lifecycle === "completed") {
    return grant === null && input.currentGrantScope === null && input.workflowResult?.outcome === "completed"
      ? success(null)
      : failure("ILLEGAL_STATE", "lifecycle", "completed status must keep workflow and grant terminal");
  }
  if (input.autonomy.mode === "full") {
    return grant !== null && input.currentGrantScope !== null &&
      grant.scope.scopeFingerprint === input.currentGrantScope.scopeFingerprint
      ? success(null)
      : failure("ILLEGAL_STATE", "grantScope", "full mode requires the canonical current grant scope");
  }
  return grant === null && input.currentGrantScope === null
    ? success(null)
    : failure("ILLEGAL_STATE", "grantScope", "none and semi modes cannot project a current grant");
}

export function projectMachineReviewStatus(input: ReviewStatusInput): ContractResult<MachineReviewStatus> {
  try {
    assertLegalAutonomyProjection(input.autonomy);
  } catch (error) {
    return failure("ILLEGAL_STATE", "autonomy", error instanceof Error ? error.message : String(error));
  }
  const validCounts = validateStatusCounts(input);
  if (!validCounts.ok) return validCounts;
  const validGrant = validateStatusGrant(input);
  if (!validGrant.ok) return validGrant;
  const counts = input.decisionCounts;
  const grant = input.autonomy.currentGrant;
  const grantView = grant === null || input.currentGrantScope === null ? null : {
    grantId: grant.grantId,
    state: grant.state,
    scope: input.currentGrantScope,
  };
  return success({
    intentUuid: input.intentUuid,
    lifecycle: input.lifecycle,
    autonomyMode: input.autonomy.mode,
    workflowExecutionState: input.autonomy.workflowExecutionState,
    grant: grantView,
    decisionPolicyCount: input.decisionPolicyCount,
    decisionCount: counts.total,
    unreviewedDecisionCount: counts.unreviewed,
    acceptedDecisionCount: counts.accepted,
    flaggedDecisionCount: counts.flagged,
    suspendedReason: input.autonomy.parkEnvelope?.reason ?? null,
    stopReason: input.workflowResult?.reasonCode ?? null,
    resumeCondition: input.workflowResult?.resumeCondition ?? null,
    legacyDiagnostic: input.legacyDiagnostic,
  });
}

export function projectHumanReviewStatus(input: ReviewStatusInput): ContractResult<string> {
  const machine = projectMachineReviewStatus(input);
  if (!machine.ok) return machine;
  const status = machine.value;
  return success([
    `Intent: ${status.intentUuid} (${status.lifecycle})`,
    `自律レベル: ${status.autonomyMode}`,
    `ワークフロー: ${status.workflowExecutionState}`,
    `grant: ${status.grant?.grantId ?? "なし"}`,
    `grant scope: ${status.grant?.scope.selfScopeId ?? "なし"}`,
    `事前裁定方針: ${status.decisionPolicyCount}`,
    `自動裁定: ${status.decisionCount} (未確認 ${status.unreviewedDecisionCount}, accept ${status.acceptedDecisionCount}, flag ${status.flaggedDecisionCount})`,
    `停止理由: ${status.stopReason ?? status.suspendedReason ?? "なし"}`,
    "",
  ].join("\n"));
}

export interface ReviewTelemetryInput {
  readonly intentUuid: string;
  readonly decisionId: string;
  readonly reviewId: string;
  readonly choice: ReviewChoice;
  readonly lifecycleAtReview: IntentLifecycle;
  readonly reviewPrincipalRef: string;
  readonly reviewActorRef: string;
  readonly sourceHumanTurnId: string;
  readonly decisionPrincipalRef: string | null;
  readonly decisionActorRef: string | null;
  readonly decisionSource: AutoDecisionRecord["decider"];
  readonly safeBasisDigest: string | null;
  readonly grantId: string | null;
  readonly safeNoteDigest: string | null;
  readonly redactionStatus: RedactionStatus;
  readonly auditTransactionId: string;
  readonly traceId: string;
  readonly spanId: string;
}

export function projectReviewTelemetry(input: ReviewTelemetryInput): Readonly<Record<string, string>> {
  const attributes: Record<string, string> = {
    "amadeus.intent.id": input.intentUuid,
    "amadeus.decision.id": input.decisionId,
    "amadeus.review.id": input.reviewId,
    "amadeus.review.choice": input.choice,
    "amadeus.review.lifecycle": input.lifecycleAtReview,
    "amadeus.review.principal_ref": input.reviewPrincipalRef,
    "amadeus.review.actor_ref": input.reviewActorRef,
    "amadeus.review.source_turn_ref": input.sourceHumanTurnId,
    "amadeus.decision.source": input.decisionSource,
    "amadeus.redaction.status": input.redactionStatus,
    "amadeus.audit.transaction_id": input.auditTransactionId,
    "amadeus.trace.id": input.traceId,
    "amadeus.span.id": input.spanId,
  };
  if (input.redactionStatus === "redacted") {
    if (input.decisionPrincipalRef !== null) attributes["amadeus.decision.principal_ref"] = input.decisionPrincipalRef;
    if (input.decisionActorRef !== null) attributes["amadeus.decision.actor_ref"] = input.decisionActorRef;
    if (input.safeBasisDigest !== null) attributes["amadeus.decision.basis_digest"] = input.safeBasisDigest;
    if (input.safeNoteDigest !== null) attributes["amadeus.review.note_digest"] = input.safeNoteDigest;
    if (input.grantId !== null) attributes["amadeus.grant.id"] = input.grantId;
  }
  return attributes;
}

export type ReviewHarnessId = SelfInstallHarnessId;
export const REQUIRED_REVIEW_HARNESSES = SELF_INSTALL_HARNESS_IDS;
export interface ReviewHarnessContractResult {
  readonly harnessId: ReviewHarnessId;
  readonly fixtureId: string;
  readonly contractRevision: string;
  readonly passed: boolean;
}
export interface ReviewHarnessSuiteResult {
  readonly fixtureId: string;
  readonly contractRevision: string;
  readonly requiredHarnesses: typeof REQUIRED_REVIEW_HARNESSES;
  readonly receipts: readonly ReviewHarnessContractResult[];
  readonly passed: boolean;
}

export function evaluateReviewHarnessSuite(
  fixtureId: string,
  contractRevision: string,
  receipts: readonly ReviewHarnessContractResult[],
): ContractResult<ReviewHarnessSuiteResult> {
  const observed = receipts.map((receipt) => receipt.harnessId).sort(compareUtf8);
  const required = [...REQUIRED_REVIEW_HARNESSES].sort(compareUtf8);
  if (observed.length !== required.length || observed.some((harness, index) => harness !== required[index])) {
    return failure("CONFLICT", "requiredHarnesses", "each required review harness must report exactly once");
  }
  if (receipts.some((receipt) => receipt.fixtureId !== fixtureId || receipt.contractRevision !== contractRevision)) {
    return failure("CONFLICT", "contractRevision", "harness receipt does not match the fixture");
  }
  return success({
    fixtureId,
    contractRevision,
    requiredHarnesses: REQUIRED_REVIEW_HARNESSES,
    receipts,
    passed: receipts.every((receipt) => receipt.passed),
  });
}
