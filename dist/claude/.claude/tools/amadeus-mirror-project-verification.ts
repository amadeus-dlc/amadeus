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
import type {
  MirrorBoundary,
  MirrorEventIdentity,
  MirrorOperation,
  MirrorOperationOutcome,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
  WriteOutcome,
} from "./amadeus-mirror-types.ts";

export type ProjectVerificationScope = Readonly<{
  intentUuid: string;
  boundary: MirrorBoundary;
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
  return Object.entries(state.receipts).find(
    ([, receipt]) =>
      receipt.event.intentUuid === event.intentUuid &&
      receipt.event.boundary.kind === "workflow-completed" &&
      receipt.event.operation === "sync" &&
      receipt.status === "succeeded",
  )?.[0];
}

export function heldCompletionSyncReconciliation(
  state: MirrorStateSnapshot,
  intentUuid: string,
  boundary: MirrorBoundary,
): ProjectSyncReconciliation | null {
  if (boundary.kind !== "workflow-completed") return null;
  const event = mirrorEventIdentity(intentUuid, boundary, "sync");
  const receipt = state.receipts[mirrorEventKey(event)];
  return receipt?.status === "pending" &&
    receipt.projectSyncHold !== undefined
    ? {
        receiptKey: receipt.key,
        originalEvent: event,
        operationId: receipt.operationId,
        expectedRevision: state.revision,
      }
    : null;
}

function projectVerificationReady(
  scope: ProjectVerificationScope,
  state: MirrorStateSnapshot,
): boolean {
  const event = mirrorEventIdentity(
    scope.intentUuid,
    scope.boundary,
    "sync",
  );
  const receipt = state.receipts[mirrorEventKey(event)];
  return (
    receipt?.status === "succeeded" &&
    receipt.projectSyncVerified === true &&
    completionProjectGate({
      state,
      snapshot: scope.snapshot,
      targets: scope.projects,
    }).ready
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
  if (boundary.kind !== "workflow-completed" || scope.projects.length === 0) {
    return { kind: "ready", state, verificationRequired: false };
  }
  if (projectVerificationReady(scope, state)) {
    return { kind: "ready", state, verificationRequired: false };
  }
  const event = mirrorEventIdentity(scope.intentUuid, boundary, "sync");
  const receipt = state.receipts[mirrorEventKey(event)];
  if (receipt?.status !== "succeeded") {
    return { kind: "ready", state, verificationRequired: true };
  }
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
      triggerEvent: mirrorEventIdentity(scope.intentUuid, boundary, "close"),
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
