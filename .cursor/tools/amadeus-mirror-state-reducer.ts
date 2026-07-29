// amadeus-mirror-state-reducer.ts — S2 Pure Reducer (C3 internal).
//
// A pure, exhaustive receipt/warning/provenance/challenge transition function.
// It never touches revision (the Atomic File Store owns the +1 on a changed
// result), never performs I/O, and composes only pure event-key, Project-sync,
// warning, and S7 repair reducers. Idempotent re-entry returns `unchanged` with
// no write; undefined edges return `invalid`; terminal receipts reject ordinary
// transitions. Business-rules.md Receipt Transition Rules is the source table.

import type {
  MirrorCreateIdentity,
  MirrorEventIdentity,
  MirrorExpectedPrompt,
  MirrorExecutionAuthorization,
  MirrorFailureClass,
  MirrorMutationEffect,
  MirrorOperationReceipt,
  MirrorProjectSyncHold,
  MirrorProvenance,
  MirrorRepairChallenge,
  MirrorStateSnapshot,
  MirrorWarning,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";
import { mirrorEventKey } from "./amadeus-mirror-policy.ts";
import {
  type ProjectSyncTransition,
  reduceProjectSyncTransition,
} from "./amadeus-mirror-project-reconciliation-reducer.ts";
import {
  type ChallengeConsumeInput,
  consumeRepairChallenge,
  issueRepairChallenge,
  provenanceDigestV2,
  repairPlanDigest,
} from "./amadeus-mirror-repair.ts";
import {
  upsertMirrorWarning,
  warningCoalesceFacts,
} from "./amadeus-mirror-warning-reducer.ts";

export const MAX_RECEIPTS = 1000;
export {
  CAPACITY_WARNING_MARKER,
  MAX_NORMAL_WARNINGS,
} from "./amadeus-mirror-warning-reducer.ts";

type CompletionTransitionFields = {
  event: MirrorEventIdentity;
  issueNumber: number;
  completedAt: string;
  createdAt?: string; // required for a create completion's provenance
};

export type MirrorTransition =
  | {
      kind: "prepare";
      event: MirrorEventIdentity;
      operationId: string;
      preparedAt: string;
      create?: { intentDir: string; repository: RepositoryIdentity };
      authorization?: MirrorExecutionAuthorization;
    }
  | { kind: "mark-attempted"; event: MirrorEventIdentity; attemptedAt: string }
  | { kind: "claim-create-attempt"; event: MirrorEventIdentity; attemptedAt: string }
  | { kind: "retry-after-no-effect"; event: MirrorEventIdentity; attemptedAt: string }
  | { kind: "claim-observed-retry"; event: MirrorEventIdentity; attemptedAt: string }
  | ({
      kind: "complete";
      projectSyncVerified?: true;
    } & CompletionTransitionFields)
  | ({
      kind: "complete-with-project-sync-hold";
      heldAt: string;
    } & CompletionTransitionFields)
  | {
      kind: "skip-for-event";
      event: MirrorEventIdentity;
      operationId: string;
      preparedAt: string;
      completedAt: string;
      consumeExpectedPrompt?: boolean;
      expectedBindingId?: string;
      answerId?: string;
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
  | { kind: "issue-repair-challenge"; challenge: MirrorRepairChallenge; now: string }
  | ProjectSyncTransition;

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

function promptApprovalMatches(
  snapshot: MirrorStateSnapshot,
  event: MirrorEventIdentity,
  authorization: MirrorExecutionAuthorization | undefined,
): boolean {
  if (authorization?.kind !== "prompt-approved") return true;
  const expected = snapshot.expectedPrompt;
  return Boolean(
    expected &&
      eventEquals(expected.event, event) &&
      expected.operation === event.operation &&
      expected.bindingId === authorization.expectedBindingId &&
      authorization.answerId.length > 0,
  );
}

function consumeExpectedPrompt(
  snapshot: MirrorStateSnapshot,
): MirrorStateSnapshot {
  const consumed = { ...snapshot };
  delete (consumed as { expectedPrompt?: MirrorExpectedPrompt }).expectedPrompt;
  return consumed;
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
    if (t.authorization?.kind !== "prompt-approved") return { kind: "unchanged" };
    if (!promptApprovalMatches(snapshot, t.event, t.authorization)) {
      return invalid("prepare: expected prompt does not match approval");
    }
    return changed(consumeExpectedPrompt(snapshot));
  }
  if (
    t.authorization &&
    t.authorization.receiptRevision !== snapshot.revision + 1
  ) {
    return invalid(
      "prepare: authorization receiptRevision must equal the next state revision",
    );
  }
  const create = t.create;
  const createIdentity =
    t.event.operation !== "create"
      ? undefined
      : create === undefined
        ? null
        : makeCreateIdentity(t.event, t.operationId, t.preparedAt, create);
  if (createIdentity === null)
    return invalid("prepare: create receipt requires intentDir + repository");
  const base: MirrorOperationReceipt = {
    key,
    event: t.event,
    operationId: t.operationId,
    createdRevision: snapshot.revision + 1,
    status: "prepared",
    preparedAt: t.preparedAt,
    ...(createIdentity === undefined ? {} : { createIdentity }),
    ...(t.authorization === undefined
      ? {}
      : { authorization: t.authorization }),
  };
  let target = snapshot;
  if (t.authorization?.kind === "prompt-approved") {
    if (!promptApprovalMatches(snapshot, t.event, t.authorization)) {
      return invalid("prepare: expected prompt does not match approval");
    }
    target = consumeExpectedPrompt(snapshot);
  }
  return changed(withReceipt(target, key, base));
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
  // A Project-sync hold never reaches here: both pending guards below require a
  // `lastEffect`, which a hold deliberately does not set. Such a receipt
  // converges through `complete`, not through a retry.
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

type CompletionTransition =
  | Extract<MirrorTransition, { kind: "complete" }>
  | Extract<MirrorTransition, { kind: "complete-with-project-sync-hold" }>;

function completedReceipt(
  receipt: MirrorOperationReceipt,
  transition: CompletionTransition,
  nextRevision: number,
): MirrorOperationReceipt {
  if (transition.kind === "complete") {
    const succeeded: MirrorOperationReceipt = {
      ...receipt,
      status: "succeeded",
      completedAt: transition.completedAt,
      ...(transition.projectSyncVerified === true
        ? { projectSyncVerified: true as const }
        : {}),
    };
    delete (succeeded as { projectSyncHold?: MirrorProjectSyncHold }).projectSyncHold;
    if (transition.projectSyncVerified !== true) {
      delete (succeeded as { projectSyncVerified?: true }).projectSyncVerified;
    }
    return succeeded;
  }
  const held: MirrorOperationReceipt = {
    ...receipt,
    status: "pending",
    completedAt: transition.completedAt,
    projectSyncHold: {
      reason: "project-sync-unsettled",
      heldAt: transition.heldAt,
    },
    projectSyncRevision: nextRevision,
  };
  delete (held as { failureClass?: MirrorFailureClass }).failureClass;
  delete (held as { lastEffect?: MirrorMutationEffect }).lastEffect;
  delete (held as { projectSyncVerified?: true }).projectSyncVerified;
  return held;
}

function writeCompletedIssue(
  snapshot: MirrorStateSnapshot,
  transition: CompletionTransition,
  receipt: MirrorOperationReceipt,
  completed: MirrorOperationReceipt,
): ReducerResult {
  // Clear any warnings for this operation on successful completion.
  const warnings = snapshot.warnings.filter(
    (warning) => warning.operationId !== receipt.operationId,
  );
  const key = mirrorEventKey(transition.event);

  if (transition.event.operation === "create") {
    if (!receipt.createIdentity)
      return invalid("complete: create receipt has no create identity");
    if (transition.createdAt === undefined)
      return invalid("complete: create completion requires provenance createdAt");
    const provenance: MirrorProvenance = {
      schema: 1,
      createIdentity: receipt.createIdentity,
      issueNumber: transition.issueNumber,
      createdAt: transition.createdAt,
    };
    return changed(
      withReceipt(
        {
          ...snapshot,
          warnings,
          provenance,
          issueNumber: transition.issueNumber,
        },
        key,
        completed,
      ),
    );
  }
  // sync / close completion: existing provenance unchanged, issue number must match.
  if (
    snapshot.issueNumber !== null &&
    snapshot.issueNumber !== transition.issueNumber
  )
    return invalid("complete: sync/close issue number does not match linked issue");
  return changed(withReceipt({ ...snapshot, warnings }, key, completed));
}

function replayedCompletion(
  snapshot: MirrorStateSnapshot,
  transition: CompletionTransition,
  receipt: MirrorOperationReceipt,
): ReducerResult | null {
  if (transition.kind === "complete") {
    if (receipt.status !== "succeeded") return null;
    return receipt.completedAt === transition.completedAt &&
      receipt.projectSyncVerified === transition.projectSyncVerified &&
      snapshot.issueNumber === transition.issueNumber
      ? { kind: "unchanged" }
      : invalid("complete: receipt already succeeded");
  }
  if (receipt.projectSyncHold === undefined) return null;
  return receipt.status === "pending" &&
    receipt.completedAt === transition.completedAt &&
    receipt.projectSyncHold.heldAt === transition.heldAt &&
    snapshot.issueNumber === transition.issueNumber
    ? { kind: "unchanged" }
    : invalid("complete-with-project-sync-hold: receipt already held");
}

function reduceComplete(
  snapshot: MirrorStateSnapshot,
  transition: CompletionTransition,
): ReducerResult {
  const key = mirrorEventKey(transition.event);
  const receipt = snapshot.receipts[key];
  if (!receipt) return invalid("complete: no receipt for event");
  if (
    transition.kind === "complete-with-project-sync-hold" &&
    transition.event.operation === "close"
  ) {
    return invalid(
      "complete-with-project-sync-hold: close never synchronizes Projects",
    );
  }
  const replayed = replayedCompletion(snapshot, transition, receipt);
  if (replayed) return replayed;
  if (
    transition.kind === "complete" &&
    transition.projectSyncVerified === true &&
    (transition.event.operation === "close" ||
      receipt.projectSyncHold === undefined)
  ) {
    return invalid(
      "complete: Project verification requires a held create or sync receipt",
    );
  }
  if (
    transition.kind === "complete" &&
    receipt.projectSyncHold !== undefined &&
    transition.projectSyncVerified !== true
  ) {
    return invalid(
      "complete: releasing a Project sync hold requires verification",
    );
  }
  if (receipt.status !== "attempted" && receipt.status !== "pending") {
    return invalid(`complete: cannot complete from status '${receipt.status}'`);
  }
  return writeCompletedIssue(
    snapshot,
    transition,
    receipt,
    completedReceipt(receipt, transition, snapshot.revision + 1),
  );
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
    ...(existing?.createdRevision === undefined
      ? existing
        ? {}
        : { createdRevision: snapshot.revision + 1 }
      : { createdRevision: existing.createdRevision }),
    status: "skipped-for-event",
    preparedAt: t.preparedAt,
    completedAt: t.completedAt,
  };
  let target = snapshot;
  if (t.consumeExpectedPrompt) {
    const expected = snapshot.expectedPrompt;
    if (
      !expected ||
      !eventEquals(expected.event, t.event) ||
      expected.operation !== t.event.operation ||
      expected.bindingId !== t.expectedBindingId ||
      !t.answerId
    ) {
      return invalid("skip: expected prompt does not match answer");
    }
    target = { ...snapshot };
    delete (target as { expectedPrompt?: MirrorExpectedPrompt }).expectedPrompt;
  }
  return changed(withReceipt(target, key, receipt));
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
  const up = upsertMirrorWarning(snapshot.warnings, t.warning);
  if (up.unchanged) return { kind: "unchanged" };
  return changed(
    { ...snapshot, warnings: up.warnings },
    warningCoalesceFacts(up.coalesced),
  );
}

function reduceGlobalWarning(
  snapshot: MirrorStateSnapshot,
  t: Extract<MirrorTransition, { kind: "set-global-warning" }>,
): ReducerResult {
  if (t.warning.operationId !== null || t.warning.operation !== null)
    return invalid("set-global-warning: operation and operationId must be null");
  if (t.warning.effect !== "not-started")
    return invalid("set-global-warning: effect must be not-started");
  const up = upsertMirrorWarning(snapshot.warnings, t.warning);
  if (up.unchanged) return { kind: "unchanged" };
  return changed(
    { ...snapshot, warnings: up.warnings },
    warningCoalesceFacts(up.coalesced),
  );
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
  const up = upsertMirrorWarning(snapshot.warnings, t.warning);
  return changed(
    withReceipt({ ...snapshot, warnings: up.warnings }, key, pending),
    warningCoalesceFacts(up.coalesced),
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
  const up = upsertMirrorWarning(snapshot.warnings, t.warning);
  return changed(
    withReceipt({ ...snapshot, warnings: up.warnings }, key, blocked),
    warningCoalesceFacts(up.coalesced),
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
  if (t.provenance.schema !== 2)
    return invalid("repair-link: new relink requires provenance schema 2");
  if (t.issueNumber !== t.provenance.issueNumber)
    return invalid("repair-link: issue number does not match provenance");
  const expectedPlan = repairPlanDigest({
    kind: "relink",
    intentUuid: t.provenance.createIdentity.intentUuid,
    repository: t.provenance.createIdentity.repository.canonical,
    operationId: t.provenance.createIdentity.operationId,
    issueNumber: t.provenance.issueNumber,
    provenanceDigest: provenanceDigestV2(t.provenance),
  });
  if (expectedPlan.kind === "invalid")
    return { kind: "invalid", issues: expectedPlan.issues };
  if (expectedPlan.digest !== t.consume.planDigest)
    return invalid("repair-link: applied provenance does not match repair plan");
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
  if (r.operationId !== transition.consume.operationId)
    return invalid("abandon-attempt: operation ID does not match receipt");
  const expectedPlan = repairPlanDigest({
    kind: "abandon",
    intentUuid: transition.event.intentUuid,
    repository: transition.consume.repository.canonical,
    operationId: r.operationId,
  });
  if (expectedPlan.kind === "invalid")
    return { kind: "invalid", issues: expectedPlan.issues };
  if (expectedPlan.digest !== transition.consume.planDigest)
    return invalid("abandon-attempt: receipt does not match repair plan");
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
    case "complete-with-project-sync-hold":
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
    case "commit-project-reconciliation":
    case "hold-for-project-sync":
    case "retire-project-sync-hold": {
      const reconciled = reduceProjectSyncTransition(snapshot, transition);
      return reconciled.kind === "changed"
        ? changed(reconciled.snapshot, reconciled.auditFacts)
        : reconciled;
    }
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
