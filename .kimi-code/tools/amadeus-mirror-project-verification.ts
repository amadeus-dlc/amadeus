// amadeus-mirror-project-verification.ts — durable completion verification.
//
// Owns the migration barrier between a succeeded final Issue sync and close.
// A configured Project must be re-read when the exact completion receipt lacks
// durable verification or its ledger no longer satisfies the current config.

import {
  completionProjectGate,
  mirrorEventIdentity,
  mirrorEventKey,
} from "./amadeus-mirror-policy.ts";
import {
  type MirrorStateStorePorts,
  mutateMirrorStateAtomic,
} from "./amadeus-mirror-state-store.ts";
import { mirrorTimestampEpoch } from "./amadeus-mirror-timestamp.ts";
import type {
  MirrorBoundary,
  MirrorEventIdentity,
  MirrorOperation,
  MirrorOperationOutcome,
  MirrorOperationReceipt,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
  WriteOutcome,
} from "./amadeus-mirror-types.ts";

export type ProjectVerificationScope = Readonly<{
  intentUuid: string;
  boundary: MirrorBoundary;
  operation?: MirrorOperation;
  snapshot: MirrorSnapshot;
  projects: readonly MirrorProjectTarget[];
  ports: MirrorStateStorePorts;
  now: () => string;
}>;

export type ProjectVerificationPreparation =
  | {
      kind: "ready";
      state: MirrorStateSnapshot;
      verificationRequired: boolean;
    }
  | { kind: "blocked"; outcome: MirrorOperationOutcome };

export type ProjectSyncReconciliation = Readonly<{
  receiptKey: string;
  originalEvent: MirrorEventIdentity;
  operationId: string;
  expectedRevision: number;
}>;

type CompletionReconciliationInput = Readonly<{
  state: MirrorStateSnapshot;
  intentUuid: string;
  boundary: MirrorBoundary;
  operation?: MirrorOperation;
  fallback: ProjectSyncReconciliation | null;
}>;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareNumbersNewestFirst(left: number, right: number): number {
  return left < right ? 1 : left > right ? -1 : 0;
}

type OrderedReceiptSelection =
  | { kind: "none" }
  | { kind: "invalid" }
  | {
      kind: "receipt";
      key: string;
      receipt: MirrorOperationReceipt;
      orderRevision: number | undefined;
      effectiveAt: number;
      preparedAt: number;
    };

type SelectedOrderedReceipt = Extract<
  OrderedReceiptSelection,
  { kind: "receipt" }
>;

function compareReceiptTimes(
  left: SelectedOrderedReceipt,
  right: SelectedOrderedReceipt,
): number {
  return (
    compareNumbersNewestFirst(left.effectiveAt, right.effectiveAt) ||
    compareNumbersNewestFirst(left.preparedAt, right.preparedAt) ||
    Number(right.receipt.projectSyncVerified === true) -
      Number(left.receipt.projectSyncVerified === true) ||
    compareCodeUnits(left.key, right.key)
  );
}

function compareOrderedReceipts(
  left: SelectedOrderedReceipt,
  right: SelectedOrderedReceipt,
  legacyRevisionOrdered: boolean,
): number {
  const leftCurrentRevision = left.orderRevision;
  const rightCurrentRevision = right.orderRevision;
  if (leftCurrentRevision !== undefined || rightCurrentRevision !== undefined) {
    if (leftCurrentRevision === undefined) return 1;
    if (rightCurrentRevision === undefined) return -1;
    const byRevision = compareNumbersNewestFirst(
      leftCurrentRevision,
      rightCurrentRevision,
    );
    return byRevision || compareReceiptTimes(left, right);
  }
  if (legacyRevisionOrdered) {
    const leftLegacyRevision = left.receipt.authorization?.receiptRevision;
    const rightLegacyRevision = right.receipt.authorization?.receiptRevision;
    if (
      leftLegacyRevision !== undefined &&
      rightLegacyRevision !== undefined
    ) {
      const byRevision = compareNumbersNewestFirst(
        leftLegacyRevision,
        rightLegacyRevision,
      );
      if (byRevision !== 0) return byRevision;
    }
  }
  return compareReceiptTimes(left, right);
}

function latestOrderedReceipt(
  candidates: readonly (readonly [string, MirrorOperationReceipt])[],
  orderRevision: (receipt: MirrorOperationReceipt) => number | undefined,
): OrderedReceiptSelection {
  if (candidates.length === 0) return { kind: "none" };
  const ordered: SelectedOrderedReceipt[] = [];
  for (const [key, receipt] of candidates) {
    const effectiveAt = mirrorTimestampEpoch(
      receipt.completedAt ?? receipt.preparedAt,
    );
    const preparedAt = mirrorTimestampEpoch(receipt.preparedAt);
    if (effectiveAt === null || preparedAt === null) {
      return { kind: "invalid" };
    }
    ordered.push({
      kind: "receipt",
      key,
      receipt,
      orderRevision: orderRevision(receipt),
      effectiveAt,
      preparedAt,
    });
  }
  const legacyRevisionOrdered = ordered
    .filter(({ orderRevision }) => orderRevision === undefined)
    .every(
      ({ receipt }) => receipt.authorization?.receiptRevision !== undefined,
  );
  ordered.sort((left, right) =>
    compareOrderedReceipts(left, right, legacyRevisionOrdered)
  );
  return ordered[0];
}

function latestCompletionSyncReceipt(
  state: MirrorStateSnapshot,
  intentUuid: string,
): OrderedReceiptSelection {
  return latestOrderedReceipt(
    Object.entries(state.receipts).filter(
      ([, receipt]) =>
        receipt.event.intentUuid === intentUuid &&
        receipt.event.boundary.kind === "workflow-completed" &&
        receipt.event.operation === "sync",
    ),
    (receipt) => receipt.createdRevision,
  );
}

// Project create/sync receipts are causally ordered by the state revision that
// most recently assigned reconciliation responsibility. A re-held receipt may
// therefore outrank events created after it; legacy receipts retain the same
// creation/timestamp fallback used by completion verification.
export function latestProjectReconciliationReceiptKey(
  state: MirrorStateSnapshot,
  intentUuid: string,
): string | undefined {
  const latest = latestOrderedReceipt(
    Object.entries(state.receipts).filter(
      ([, receipt]) =>
        receipt.event.intentUuid === intentUuid &&
        (receipt.event.operation === "create" ||
          receipt.event.operation === "sync"),
    ),
    (receipt) => receipt.projectSyncRevision ?? receipt.createdRevision,
  );
  return latest.kind === "receipt" ? latest.key : undefined;
}

function closeVerificationRequested(
  boundary: MirrorBoundary,
  operation?: MirrorOperation,
): boolean {
  return boundary.kind === "workflow-completed" ||
    (boundary.kind === "manual" && operation === "close");
}

function reconciliationForReceipt(
  receipt: MirrorOperationReceipt,
  expectedRevision: number,
): ProjectSyncReconciliation {
  return {
    receiptKey: receipt.key,
    originalEvent: receipt.event,
    operationId: receipt.operationId,
    expectedRevision,
  };
}

function receiptIsInProgress(receipt: MirrorOperationReceipt): boolean {
  return receipt.status === "prepared" ||
    receipt.status === "attempted" ||
    receipt.status === "pending";
}

function isCompletionSyncForIntent(
  selection: ProjectSyncReconciliation,
  intentUuid: string,
): boolean {
  return selection.originalEvent.intentUuid === intentUuid &&
    selection.originalEvent.boundary.kind === "workflow-completed" &&
    selection.originalEvent.operation === "sync";
}

export function finalSyncReceiptKey(
  state: MirrorStateSnapshot,
  event: MirrorEventIdentity,
): string | undefined {
  if (event.boundary.kind === "workflow-completed") {
    const key = mirrorEventKey(
      mirrorEventIdentity(event.intentUuid, event.boundary, "sync"),
    );
    return state.receipts[key]?.status === "succeeded" ? key : undefined;
  }
  if (event.boundary.kind !== "manual") return undefined;
  const latest = latestCompletionSyncReceipt(state, event.intentUuid);
  return latest.kind === "receipt" &&
      latest.receipt.status === "succeeded"
    ? latest.key
    : undefined;
}

type FinalSyncEvidenceInput = Readonly<{
  state: MirrorStateSnapshot;
  event: MirrorEventIdentity;
  snapshot?: MirrorSnapshot;
  projects: readonly MirrorProjectTarget[];
  receiptKey: string;
}>;

// Validate one bound close authorization against the same policy used before
// preparing it. A workflow-completion close remains tied to its exact instance;
// an explicit close remains tied to the newest completion sync for this Intent.
export function finalSyncEvidenceReady(
  input: FinalSyncEvidenceInput,
): boolean {
  const receipt = input.state.receipts[input.receiptKey];
  const currentReceiptKey = finalSyncReceiptKey(input.state, input.event);
  if (
    input.event.operation !== "close" ||
    currentReceiptKey !== input.receiptKey ||
    receipt?.event.intentUuid !== input.event.intentUuid ||
    receipt.event.boundary.kind !== "workflow-completed" ||
    receipt.event.operation !== "sync" ||
    receipt.status !== "succeeded"
  ) {
    return false;
  }
  if (input.projects.length === 0) return true;
  return (
    receipt.projectSyncVerified === true &&
    input.snapshot !== undefined &&
    completionProjectGate({
      state: input.state,
      snapshot: input.snapshot,
      targets: input.projects,
    }).ready
  );
}

export function currentFinalSyncEvidenceKey(
  input: Omit<FinalSyncEvidenceInput, "receiptKey">,
): string | undefined {
  const receiptKey = finalSyncReceiptKey(input.state, input.event);
  return receiptKey !== undefined &&
      finalSyncEvidenceReady({ ...input, receiptKey })
    ? receiptKey
    : undefined;
}

// Manual close treats the newest completion sync as authoritative. Its
// in-progress receipt wins over generic reconciliation; once it is terminal,
// obsolete completion-sync receipts cannot pull the close backwards.
export function selectCompletionSyncReconciliation(
  input: CompletionReconciliationInput,
): ProjectSyncReconciliation | null {
  if (!closeVerificationRequested(input.boundary, input.operation)) {
    return input.fallback;
  }
  if (input.boundary.kind === "workflow-completed") {
    const receipt = input.state.receipts[
      mirrorEventKey(
        mirrorEventIdentity(input.intentUuid, input.boundary, "sync"),
      )
    ];
    return receipt?.status === "pending" &&
        receipt.projectSyncHold !== undefined
      ? reconciliationForReceipt(receipt, input.state.revision)
      : input.fallback;
  }
  const latest = latestCompletionSyncReceipt(
    input.state,
    input.intentUuid,
  );
  if (latest.kind === "none") return input.fallback;
  if (latest.kind === "invalid") return null;
  if (receiptIsInProgress(latest.receipt)) {
    return reconciliationForReceipt(latest.receipt, input.state.revision);
  }
  return input.fallback !== null &&
      isCompletionSyncForIntent(input.fallback, input.intentUuid)
    ? null
    : input.fallback;
}

function projectVerificationReady(
  scope: ProjectVerificationScope,
  state: MirrorStateSnapshot,
): boolean {
  const event = mirrorEventIdentity(scope.intentUuid, scope.boundary, "close");
  return (
    currentFinalSyncEvidenceKey({
      state,
      event,
      snapshot: scope.snapshot,
      projects: scope.projects,
    }) !== undefined
  );
}

function writeFailureSummary(
  result: Exclude<WriteOutcome, { kind: "written" | "unchanged" }>,
): string {
  switch (result.kind) {
    case "conflict":
      return `state revision changed to ${result.actualRevision}`;
    case "invalid":
      return `state became invalid: ${result.issues.join("; ")}`;
    case "io-failure":
      return result.summary;
  }
}

function blockedWrite(
  summary: string,
  occurredAt: string,
  operation: Extract<MirrorOperation, "sync" | "close">,
  operationId: string | null,
): ProjectVerificationPreparation {
  return {
    kind: "blocked",
    outcome: {
      kind: "pending",
      operation,
      warning: {
        operationId,
        operation,
        classification: "state-write",
        summary,
        occurredAt,
        retryable: true,
        effect: "not-started",
        source: "current-invocation",
      },
    },
  };
}

// A pre-marker succeeded sync is not enough to authorize close: it may carry
// stale ledger evidence from an older binary. Requeue the exact current
// completion receipt so normal reconciliation performs a fresh Project query.
export function prepareCompletionProjectVerification(
  scope: ProjectVerificationScope,
  state: MirrorStateSnapshot,
): ProjectVerificationPreparation {
  const boundary = scope.boundary;
  if (
    !closeVerificationRequested(boundary, scope.operation) ||
    scope.projects.length === 0
  ) {
    return { kind: "ready", state, verificationRequired: false };
  }
  if (projectVerificationReady(scope, state)) {
    return { kind: "ready", state, verificationRequired: false };
  }
  const closeEvent = mirrorEventIdentity(scope.intentUuid, boundary, "close");
  const receiptKey = finalSyncReceiptKey(state, closeEvent);
  const receipt =
    receiptKey === undefined ? undefined : state.receipts[receiptKey];
  if (receipt?.status !== "succeeded") {
    return { kind: "ready", state, verificationRequired: true };
  }
  const event = receipt.event;
  const heldAt = scope.now();
  const result = mutateMirrorStateAtomic(scope.ports, {
    transition: {
      kind: "hold-for-project-sync",
      event,
      operationId: receipt.operationId,
      heldAt,
    },
    expectedRevision: state.revision,
    auditContext: {
      triggerEvent: closeEvent,
      operationEvent: event,
      operationId: receipt.operationId,
      reconciliation: true,
    },
    now: heldAt,
    intentUuid: scope.intentUuid,
  });
  if (result.kind === "written" || result.kind === "unchanged") {
    return {
      kind: "ready",
      state: result.value,
      verificationRequired: true,
    };
  }
  return blockedWrite(
    `the Issue stays open because final Project sync could not be requeued: ${writeFailureSummary(result)}`,
    heldAt,
    "sync",
    receipt.operationId,
  );
}

export function consumeStaleCloseApproval(
  scope: ProjectVerificationScope,
  state: MirrorStateSnapshot,
  answer: Readonly<{ event: MirrorEventIdentity; operation: MirrorOperation }>,
): ProjectVerificationPreparation {
  const occurredAt = scope.now();
  const result = mutateMirrorStateAtomic(scope.ports, {
    transition: {
      kind: "consume-expected-prompt",
      event: answer.event,
      operation: answer.operation,
    },
    expectedRevision: state.revision,
    auditContext: {
      triggerEvent: answer.event,
      operationEvent: answer.event,
      reconciliation: true,
    },
    now: occurredAt,
    intentUuid: scope.intentUuid,
  });
  if (result.kind === "written" || result.kind === "unchanged") {
    return {
      kind: "ready",
      state: result.value,
      verificationRequired: true,
    };
  }
  return blockedWrite(
    `the stale close approval could not be retired safely: ${writeFailureSummary(result)}`,
    occurredAt,
    "close",
    null,
  );
}
