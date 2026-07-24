// amadeus-mirror-state-reducer.ts — S2 Pure Reducer (C3 internal).
//
// A pure, exhaustive receipt/warning/provenance/challenge transition function.
// It never touches revision (the Atomic File Store owns the +1 on a changed
// result), never performs I/O, and imports C0 types + the C2 event-key helper +
// the S7 repair helpers only. Idempotent re-entry returns `unchanged` with no
// write; undefined edges return `invalid`; terminal receipts reject ordinary
// transitions. Business-rules.md Receipt Transition Rules is the source table.

import type {
  MirrorCreateIdentity,
  MirrorEventIdentity,
  MirrorExpectedPrompt,
  MirrorFailureClass,
  MirrorMutationEffect,
  MirrorOperationReceipt,
  MirrorProvenance,
  MirrorRepairChallenge,
  MirrorStateSnapshot,
  MirrorWarning,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";
import { mirrorEventKey } from "./amadeus-mirror-policy.ts";
import {
  type ChallengeConsumeInput,
  consumeRepairChallenge,
  issueRepairChallenge,
} from "./amadeus-mirror-repair.ts";

export const MAX_RECEIPTS = 1000;
export const MAX_NORMAL_WARNINGS = 999;
export const CAPACITY_WARNING_MARKER = "state-capacity";

export type MirrorTransition =
  | {
      kind: "prepare";
      event: MirrorEventIdentity;
      operationId: string;
      preparedAt: string;
      create?: { intentDir: string; repository: RepositoryIdentity };
    }
  | { kind: "mark-attempted"; event: MirrorEventIdentity; attemptedAt: string }
  | { kind: "claim-create-attempt"; event: MirrorEventIdentity; attemptedAt: string }
  | { kind: "retry-after-no-effect"; event: MirrorEventIdentity; attemptedAt: string }
  | { kind: "claim-observed-retry"; event: MirrorEventIdentity; attemptedAt: string }
  | {
      kind: "complete";
      event: MirrorEventIdentity;
      issueNumber: number;
      completedAt: string;
      createdAt?: string; // required for a create completion's provenance
    }
  | {
      kind: "skip-for-event";
      event: MirrorEventIdentity;
      operationId: string;
      preparedAt: string;
      completedAt: string;
    }
  | { kind: "set-warning"; event: MirrorEventIdentity; warning: MirrorWarning }
  | { kind: "set-global-warning"; warning: MirrorWarning }
  | { kind: "clear-global-warning" }
  | {
      kind: "mark-pending";
      event: MirrorEventIdentity;
      effect: Exclude<MirrorMutationEffect, "not-started">;
      warning: MirrorWarning;
    }
  | { kind: "mark-safety-blocked"; event: MirrorEventIdentity; warning: MirrorWarning }
  | {
      kind: "abandon-attempt";
      event: MirrorEventIdentity;
      completedAt: string;
      consume: ChallengeConsumeInput;
    }
  | {
      kind: "set-expected-prompt";
      prompt: MirrorExpectedPrompt;
    }
  | { kind: "consume-expected-prompt"; event: MirrorEventIdentity; operation: string }
  | {
      kind: "repair-link";
      issueNumber: number;
      provenance: MirrorProvenance;
      consume: ChallengeConsumeInput;
    }
  | { kind: "issue-repair-challenge"; challenge: MirrorRepairChallenge; now: string };

export type ReducerResult =
  | {
      kind: "changed";
      snapshot: MirrorStateSnapshot;
      // Extra facts the store folds into the ARTIFACT_UPDATED audit projection
      // (coalesced-away warnings, consumed/pruned repair proofs).
      auditFacts?: Readonly<Record<string, string>>;
    }
  | { kind: "unchanged" }
  | { kind: "invalid"; issues: readonly string[] };

const TERMINAL_STATUSES: ReadonlySet<MirrorOperationReceipt["status"]> = new Set([
  "succeeded",
  "skipped-for-event",
  "safety-blocked",
  "abandoned",
]);

function changed(
  snapshot: MirrorStateSnapshot,
  auditFacts?: Record<string, string>,
): ReducerResult {
  // Every change starts a fresh transaction: any pre-existing outbox must have
  // been drained by the store before reduce, so a changed snapshot carries none.
  const next: MirrorStateSnapshot = { ...snapshot, auditOutbox: null };
  return auditFacts ? { kind: "changed", snapshot: next, auditFacts } : { kind: "changed", snapshot: next };
}

function invalid(...issues: string[]): ReducerResult {
  return { kind: "invalid", issues };
}

function withReceipt(
  snapshot: MirrorStateSnapshot,
  key: string,
  receipt: MirrorOperationReceipt,
): MirrorStateSnapshot {
  return { ...snapshot, receipts: { ...snapshot.receipts, [key]: receipt } };
}

function eventEquals(a: MirrorEventIdentity, b: MirrorEventIdentity): boolean {
  return (
    a.intentUuid === b.intentUuid &&
    a.operation === b.operation &&
    a.boundary.kind === b.boundary.kind &&
    a.boundary.instance === b.boundary.instance
  );
}

function isCapacityWarning(w: MirrorWarning): boolean {
  return w.operationId === null && w.summary.startsWith(CAPACITY_WARNING_MARKER);
}

function warningsEqual(a: MirrorWarning, b: MirrorWarning): boolean {
  return (
    a.operationId === b.operationId &&
    a.operation === b.operation &&
    a.classification === b.classification &&
    a.summary === b.summary &&
    a.occurredAt === b.occurredAt &&
    a.retryable === b.retryable &&
    a.effect === b.effect &&
    a.source === b.source
  );
}

// Coalesce by (operationId, classification, effect): the latest replaces the
// prior, whose value is surfaced for the transaction audit. Enforces the
// 999 normal + 1 reserved capacity slot bound.
function upsertWarning(
  warnings: readonly MirrorWarning[],
  warning: MirrorWarning,
): { warnings: MirrorWarning[]; coalesced: MirrorWarning | null; unchanged: boolean } {
  const existingIdx = warnings.findIndex((w) => warningsEqual(w, warning));
  if (existingIdx !== -1) {
    return { warnings: [...warnings], coalesced: null, unchanged: true };
  }
  const coalesceIdx = warnings.findIndex(
    (w) =>
      !isCapacityWarning(w) &&
      w.operationId === warning.operationId &&
      w.classification === warning.classification &&
      w.effect === warning.effect,
  );
  if (coalesceIdx !== -1) {
    const coalesced = warnings[coalesceIdx];
    const next = [...warnings];
    next[coalesceIdx] = warning;
    return { warnings: next, coalesced, unchanged: false };
  }
  const normalCount = warnings.filter((w) => !isCapacityWarning(w)).length;
  if (!isCapacityWarning(warning) && normalCount >= MAX_NORMAL_WARNINGS) {
    // Normal slots exhausted: write/replace the single reserved capacity slot.
    const capacity: MirrorWarning = {
      operationId: null,
      operation: null,
      classification: warning.classification,
      summary: `${CAPACITY_WARNING_MARKER}: normal warning slots exhausted`,
      occurredAt: warning.occurredAt,
      retryable: false,
      effect: "not-started",
      source: "persisted-warning",
    };
    const withoutCapacity = warnings.filter((w) => !isCapacityWarning(w));
    return { warnings: [...withoutCapacity, capacity], coalesced: warning, unchanged: false };
  }
  return { warnings: [...warnings, warning], coalesced: null, unchanged: false };
}

function coalesceFacts(coalesced: MirrorWarning | null): Record<string, string> | undefined {
  if (!coalesced) return undefined;
  return {
    coalescedWarning: `${coalesced.operationId ?? "null"}:${coalesced.classification}:${coalesced.effect}:${coalesced.occurredAt}`,
  };
}

function makeCreateIdentity(
  event: MirrorEventIdentity,
  operationId: string,
  preparedAt: string,
  create: { intentDir: string; repository: RepositoryIdentity },
): MirrorCreateIdentity {
  return {
    schema: 1,
    intentUuid: event.intentUuid,
    intentDir: create.intentDir,
    repository: create.repository,
    operationId,
    preparedAt,
  };
}

function reducePrepare(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "prepare" }>,
): ReducerResult {
  const key = mirrorEventKey(t.event);
  const existing = snapshot.receipts[key];
  if (existing) {
    // Same event key: candidate values are discarded. Verify identity match.
    if (
      !eventEquals(existing.event, t.event) ||
      existing.operationId !== t.operationId
    ) {
      return invalid(
        "prepare: existing receipt has a different operation/event identity for this key",
      );
    }
    return { kind: "unchanged" };
  }
  const base: {
    key: string;
    event: MirrorEventIdentity;
    operationId: string;
    status: "prepared";
    preparedAt: string;
    createIdentity?: MirrorCreateIdentity;
  } = {
    key,
    event: t.event,
    operationId: t.operationId,
    status: "prepared",
    preparedAt: t.preparedAt,
  };
  if (t.event.operation === "create") {
    if (!t.create)
      return invalid("prepare: create receipt requires intentDir + repository");
    base.createIdentity = makeCreateIdentity(t.event, t.operationId, t.preparedAt, t.create);
  }
  return changed(withReceipt(snapshot, key, base));
}

function attempt(
  snapshot: MirrorStateSnapshot,
  event: MirrorEventIdentity,
  attemptedAt: string,
  guard: (r: MirrorOperationReceipt) => string | null,
  clearEffectAndWarnings: boolean,
): ReducerResult {
  const key = mirrorEventKey(event);
  const r = snapshot.receipts[key];
  if (!r) return invalid("attempt: no receipt for event");
  const err = guard(r);
  if (err) return invalid(err);
  if (r.status === "attempted") {
    if (r.attemptedAt === attemptedAt) return { kind: "unchanged" };
    return invalid("attempt: receipt already attempted with a different timestamp");
  }
  const next: MirrorOperationReceipt = {
    ...r,
    status: "attempted",
    attemptedAt,
  };
  if (clearEffectAndWarnings) {
    // pending -> attempted retry: drop lastEffect + same-operation warnings.
    const cleaned: MirrorOperationReceipt = { ...next };
    delete (cleaned as { lastEffect?: MirrorMutationEffect }).lastEffect;
    delete (cleaned as { failureClass?: MirrorFailureClass }).failureClass;
    const warnings = snapshot.warnings.filter((w) => w.operationId !== r.operationId);
    return changed(withReceipt({ ...snapshot, warnings }, key, cleaned));
  }
  return changed(withReceipt(snapshot, key, next));
}

function reduceComplete(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "complete" }>,
): ReducerResult {
  const key = mirrorEventKey(t.event);
  const r = snapshot.receipts[key];
  if (!r) return invalid("complete: no receipt for event");
  if (r.status === "succeeded") {
    if (r.completedAt === t.completedAt && snapshot.issueNumber === t.issueNumber)
      return { kind: "unchanged" };
    return invalid("complete: receipt already succeeded");
  }
  if (r.status !== "attempted" && r.status !== "pending")
    return invalid(`complete: cannot complete from status '${r.status}'`);

  const succeeded: MirrorOperationReceipt = {
    ...r,
    status: "succeeded",
    completedAt: t.completedAt,
  };
  // Clear any warnings for this operation on successful completion.
  const warnings = snapshot.warnings.filter((w) => w.operationId !== r.operationId);

  if (t.event.operation === "create") {
    if (!r.createIdentity)
      return invalid("complete: create receipt has no create identity");
    if (t.createdAt === undefined)
      return invalid("complete: create completion requires provenance createdAt");
    const provenance: MirrorProvenance = {
      schema: 1,
      createIdentity: r.createIdentity,
      issueNumber: t.issueNumber,
      createdAt: t.createdAt,
    };
    return changed(
      withReceipt(
        { ...snapshot, warnings, provenance, issueNumber: t.issueNumber },
        key,
        succeeded,
      ),
    );
  }
  // sync / close completion: existing provenance unchanged, issue number must match.
  if (snapshot.issueNumber !== null && snapshot.issueNumber !== t.issueNumber)
    return invalid("complete: sync/close issue number does not match linked issue");
  return changed(withReceipt({ ...snapshot, warnings }, key, succeeded));
}

function reduceSkip(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "skip-for-event" }>,
): ReducerResult {
  const key = mirrorEventKey(t.event);
  const existing = snapshot.receipts[key];
  if (existing) {
    if (existing.status === "skipped-for-event") {
      if (existing.completedAt === t.completedAt) return { kind: "unchanged" };
      return invalid("skip: receipt already skipped");
    }
    if (
      !eventEquals(existing.event, t.event) ||
      existing.operationId !== t.operationId
    )
      return invalid("skip: existing receipt operation/event mismatch");
    if (TERMINAL_STATUSES.has(existing.status))
      return invalid(`skip: cannot skip a terminal '${existing.status}' receipt`);
  }
  const receipt: MirrorOperationReceipt = {
    key,
    event: t.event,
    operationId: t.operationId,
    status: "skipped-for-event",
    preparedAt: t.preparedAt,
    completedAt: t.completedAt,
  };
  return changed(withReceipt(snapshot, key, receipt));
}

function reduceSetWarning(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "set-warning" }>,
): ReducerResult {
  const key = mirrorEventKey(t.event);
  const r = snapshot.receipts[key];
  if (!r) return invalid("set-warning: no receipt for event");
  if (r.status !== "prepared")
    return invalid("set-warning: only allowed while receipt is 'prepared'");
  if (t.warning.effect !== "not-started")
    return invalid("set-warning: prepared receipt warning must have effect=not-started");
  if (t.warning.operationId !== r.operationId)
    return invalid("set-warning: warning operationId must match receipt");
  const up = upsertWarning(snapshot.warnings, t.warning);
  if (up.unchanged) return { kind: "unchanged" };
  return changed({ ...snapshot, warnings: up.warnings }, coalesceFacts(up.coalesced));
}

function reduceGlobalWarning(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "set-global-warning" }>,
): ReducerResult {
  if (t.warning.operationId !== null || t.warning.operation !== null)
    return invalid("set-global-warning: operation and operationId must be null");
  if (t.warning.effect !== "not-started")
    return invalid("set-global-warning: effect must be not-started");
  const up = upsertWarning(snapshot.warnings, t.warning);
  if (up.unchanged) return { kind: "unchanged" };
  return changed({ ...snapshot, warnings: up.warnings }, coalesceFacts(up.coalesced));
}

function reduceClearGlobalWarning(snapshot: MirrorStateSnapshot): ReducerResult {
  const remaining = snapshot.warnings.filter(
    (w) => !(w.operationId === null && w.operation === null && w.classification === "configuration"),
  );
  if (remaining.length === snapshot.warnings.length) return { kind: "unchanged" };
  return changed({ ...snapshot, warnings: remaining });
}

function reduceMarkPending(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "mark-pending" }>,
): ReducerResult {
  const key = mirrorEventKey(t.event);
  const r = snapshot.receipts[key];
  if (!r) return invalid("mark-pending: no receipt for event");
  if (r.status !== "attempted")
    return invalid("mark-pending: only allowed from 'attempted'");
  if (r.attemptedAt === undefined)
    return invalid("mark-pending: attempted receipt missing attemptedAt");
  if (t.warning.operationId !== r.operationId)
    return invalid("mark-pending: warning operationId must match receipt");
  const pending: MirrorOperationReceipt = {
    ...r,
    status: "pending",
    lastEffect: t.effect,
    failureClass: t.warning.classification,
  };
  const up = upsertWarning(snapshot.warnings, t.warning);
  return changed(
    withReceipt({ ...snapshot, warnings: up.warnings }, key, pending),
    coalesceFacts(up.coalesced),
  );
}

function reduceSafetyBlocked(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "mark-safety-blocked" }>,
): ReducerResult {
  const key = mirrorEventKey(t.event);
  const r = snapshot.receipts[key];
  if (!r) return invalid("mark-safety-blocked: no receipt for event");
  if (TERMINAL_STATUSES.has(r.status))
    return invalid(`mark-safety-blocked: receipt already terminal '${r.status}'`);
  if (t.warning.operationId !== r.operationId)
    return invalid("mark-safety-blocked: warning operationId must match receipt");
  const blocked: MirrorOperationReceipt = {
    ...r,
    status: "safety-blocked",
    failureClass: t.warning.classification,
  };
  const up = upsertWarning(snapshot.warnings, t.warning);
  return changed(
    withReceipt({ ...snapshot, warnings: up.warnings }, key, blocked),
    coalesceFacts(up.coalesced),
  );
}

function abandonWithConsume(
  key: string,
  r: MirrorOperationReceipt,
  t: Extract<MirrorTransition, { kind: "abandon-attempt" }>,
  consumed: ReturnType<typeof consumeRepairChallenge>,
): ReducerResult {
  if (consumed.kind === "invalid") return { kind: "invalid", issues: consumed.issues };
  const abandoned: MirrorOperationReceipt = {
    ...r,
    status: "abandoned",
    completedAt: t.completedAt,
  };
  return changed(withReceipt(consumed.snapshot, key, abandoned), {
    repairProof: `${consumed.proof.challengeId}:${consumed.proof.planDigest}:${consumed.proof.checkedAt}`,
  });
}

function reduceSetExpectedPrompt(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "set-expected-prompt" }>,
): ReducerResult {
  const existing = snapshot.expectedPrompt;
  if (existing) {
    if (
      eventEquals(existing.event, t.prompt.event) &&
      existing.operation === t.prompt.operation &&
      existing.issuedAt === t.prompt.issuedAt
    )
      return { kind: "unchanged" };
    return invalid("set-expected-prompt: a different unconsumed prompt is pending");
  }
  return changed({ ...snapshot, expectedPrompt: t.prompt });
}

function reduceConsumeExpectedPrompt(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "consume-expected-prompt" }>,
): ReducerResult {
  const existing = snapshot.expectedPrompt;
  if (!existing) return invalid("consume-expected-prompt: no expected prompt");
  if (!eventEquals(existing.event, t.event) || existing.operation !== t.operation)
    return invalid("consume-expected-prompt: event/operation does not match binding");
  const next = { ...snapshot };
  delete (next as { expectedPrompt?: MirrorExpectedPrompt }).expectedPrompt;
  return changed(next);
}

function reduceRepairLink(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "repair-link" }>,
  now: string,
): ReducerResult {
  const consumed = consumeRepairChallenge(snapshot, t.consume, now);
  if (consumed.kind === "invalid") return { kind: "invalid", issues: consumed.issues };
  return changed(
    {
      ...consumed.snapshot,
      provenance: t.provenance,
      issueNumber: t.issueNumber,
    },
    { repairProof: `${consumed.proof.challengeId}:${consumed.proof.planDigest}:${consumed.proof.checkedAt}` },
  );
}

function reduceIssueChallenge(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "issue-repair-challenge" }>,
): ReducerResult {
  const result = issueRepairChallenge(snapshot, t.challenge, t.now);
  if (result.kind === "invalid") return { kind: "invalid", issues: result.issues };
  const facts =
    result.prunedProofs.length > 0
      ? { prunedChallenges: result.prunedProofs.map((p) => p.challengeId).join(",") }
      : undefined;
  return changed(result.snapshot, facts);
}

function guardMarkAttempted(r: MirrorOperationReceipt): string | null {
  return r.status === "prepared" || r.status === "attempted"
    ? null
    : `mark-attempted: cannot attempt from '${r.status}'`;
}

function guardClaimCreate(r: MirrorOperationReceipt): string | null {
  return (r.status === "prepared" || r.status === "attempted") && r.createIdentity
    ? null
    : "claim-create-attempt: requires a fresh prepared create receipt";
}

function guardRetryNoEffect(r: MirrorOperationReceipt): string | null {
  return r.status === "pending" && r.lastEffect === "no-effect-confirmed"
    ? null
    : "retry-after-no-effect: requires pending + no-effect-confirmed";
}

function guardObservedRetry(r: MirrorOperationReceipt): string | null {
  return r.status === "pending" && r.lastEffect === "outcome-unknown"
    ? null
    : "claim-observed-retry: requires pending + outcome-unknown";
}

function reduceAbandon(
  snapshot: MirrorStateSnapshot,
  transition: Extract<MirrorTransition, { kind: "abandon-attempt" }>,
  now: string,
): ReducerResult {
  const key = mirrorEventKey(transition.event);
  const r = snapshot.receipts[key];
  if (!r) return invalid("abandon-attempt: no receipt for event");
  if (r.status === "succeeded")
    return invalid("abandon-attempt: cannot abandon a succeeded receipt");
  if (TERMINAL_STATUSES.has(r.status))
    return invalid(`abandon-attempt: receipt already terminal '${r.status}'`);
  const consumed = consumeRepairChallenge(snapshot, transition.consume, now);
  return abandonWithConsume(key, r, transition, consumed);
}

// Receipt-lifecycle transitions; returns undefined when this transition is not
// one of them so the caller falls through to the auxiliary dispatcher.
function reduceReceiptTransition(
  snapshot: MirrorStateSnapshot,
  transition: MirrorTransition,
  now: string,
): ReducerResult | undefined {
  switch (transition.kind) {
    case "prepare":
      return reducePrepare(snapshot, transition);
    case "mark-attempted":
      return attempt(snapshot, transition.event, transition.attemptedAt, guardMarkAttempted, false);
    case "claim-create-attempt":
      return attempt(snapshot, transition.event, transition.attemptedAt, guardClaimCreate, false);
    case "retry-after-no-effect":
      return attempt(snapshot, transition.event, transition.attemptedAt, guardRetryNoEffect, true);
    case "claim-observed-retry":
      return attempt(snapshot, transition.event, transition.attemptedAt, guardObservedRetry, true);
    case "complete":
      return reduceComplete(snapshot, transition);
    case "skip-for-event":
      return reduceSkip(snapshot, transition);
    case "mark-pending":
      return reduceMarkPending(snapshot, transition);
    case "mark-safety-blocked":
      return reduceSafetyBlocked(snapshot, transition);
    case "abandon-attempt":
      return reduceAbandon(snapshot, transition, now);
    default:
      return undefined;
  }
}

// Warning / prompt / repair transitions.
function reduceAuxTransition(
  snapshot: MirrorStateSnapshot,
  transition: MirrorTransition,
  now: string,
): ReducerResult {
  switch (transition.kind) {
    case "set-warning":
      return reduceSetWarning(snapshot, transition);
    case "set-global-warning":
      return reduceGlobalWarning(snapshot, transition);
    case "clear-global-warning":
      return reduceClearGlobalWarning(snapshot);
    case "set-expected-prompt":
      return reduceSetExpectedPrompt(snapshot, transition);
    case "consume-expected-prompt":
      return reduceConsumeExpectedPrompt(snapshot, transition);
    case "repair-link":
      return reduceRepairLink(snapshot, transition, now);
    case "issue-repair-challenge":
      return reduceIssueChallenge(snapshot, transition);
    default:
      return invalid(`unknown transition ${(transition as { kind: string }).kind}`);
  }
}

// The single pure reduce entry. `now` is the injected clock (for TTL-bearing
// transitions); pure and I/O-free.
export function reduceMirrorState(
  snapshot: MirrorStateSnapshot,
  transition: MirrorTransition,
  now: string,
): ReducerResult {
  return (
    reduceReceiptTransition(snapshot, transition, now) ??
    reduceAuxTransition(snapshot, transition, now)
  );
}
