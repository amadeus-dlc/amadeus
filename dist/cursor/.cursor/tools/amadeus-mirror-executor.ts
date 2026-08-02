// amadeus-mirror-executor.ts — C6 guarded Mirror operation executor.
//
// This module owns guarded Issue mutations and operation receipts. Project
// mutations are delegated to the Project executor after an Issue has landed.

import { createMirrorMutationPermit } from "./amadeus-mirror-capability.ts";
import { mirrorEventKey } from "./amadeus-mirror-policy.ts";
import { syncProjects as reconcileProjects } from "./amadeus-mirror-project-executor.ts";
import {
  finalSyncEvidenceReady,
  latestProjectReconciliationReceiptKey,
} from "./amadeus-mirror-project-verification.ts";
import {
  classifyCandidates,
  createIdentityMatchesContext,
  renderMirrorMarker,
  verifyOwnership,
} from "./amadeus-mirror-provenance.ts";
import type { MirrorTransition } from "./amadeus-mirror-state-reducer.ts";
import {
  createMirrorProjectReconciliationLock,
  type MirrorProjectReconciliationLock,
  type MirrorStateStorePorts,
  mutateMirrorStateAtomic,
  readMirrorState,
} from "./amadeus-mirror-state-store.ts";
import type {
  GatewayOutcome,
  MirrorAuditContext,
  MirrorExecutionContext,
  MirrorExecutionAuthorization,
  MirrorFailureClass,
  MirrorMutationEffect,
  MirrorOperationOutcome,
  MirrorOperationReceipt,
  MirrorProjectSyncHold,
  MirrorStateSnapshot,
  MirrorWarning,
  RemoteMirrorIssue,
} from "./amadeus-mirror-types.ts";

export type { ProjectReconcileResult } from "./amadeus-mirror-project-executor.ts";

export type ProjectReconciliationLock = MirrorProjectReconciliationLock;

export type ExecuteMirrorOperationInput = Readonly<{
  context: MirrorExecutionContext;
  ports: MirrorStateStorePorts;
  localState: MirrorStateSnapshot;
  projectReconciliationLock?: ProjectReconciliationLock;
}>;

type StateResult =
  | {
      kind: "ok";
      snapshot: MirrorStateSnapshot;
      commit: "clean" | "outbox-pending";
    }
  | {
      kind: "failed";
      phase: "pre-commit" | "durability-unknown";
      summary: string;
    };

type OperationPreparationResult =
  | { kind: "ready" }
  | { kind: "maintenance-completed" }
  | { kind: "maintenance-blocked"; summary: string };

// A receipt ready to act on, or the outcome to return when it cannot be made ready.
type ReadyReceipt =
  | { kind: "ready"; snapshot: MirrorStateSnapshot; receipt: MirrorOperationReceipt }
  | { kind: "outcome"; outcome: MirrorOperationOutcome };

function auditContext(
  context: MirrorExecutionContext,
  operationId: string | undefined,
  reconciliation: boolean,
  classification?: MirrorFailureClass,
): MirrorAuditContext {
  return {
    triggerEvent: context.triggerEvent,
    operationEvent: context.event,
    operationId,
    reconciliation,
    ...(classification === undefined ? {} : { classification }),
  };
}

function applyTransition(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  transition: MirrorTransition,
  operationId: string | undefined,
  reconciliation = false,
  classification?: MirrorFailureClass,
  exclusive = false,
): StateResult {
  const invoke = (expectedRevision: number) =>
    mutateMirrorStateAtomic(ports, {
      transition,
      expectedRevision,
      auditContext: auditContext(
        context,
        operationId,
        reconciliation,
        classification,
      ),
      now: context.now(),
      intentUuid: context.intentUuid,
    });
  let result = invoke(snapshot.revision);
  if (result.kind === "conflict") {
    if (exclusive) {
      return {
        kind: "failed",
        phase: "pre-commit",
        summary: "state compare-and-set conflict",
      };
    }
    const latest = readMirrorState(ports);
    if (latest.kind !== "ok") {
      return {
        kind: "failed",
        phase: "pre-commit",
        summary:
          latest.kind === "invalid"
            ? `state invalid after conflict: ${latest.issues.join("; ")}`
            : latest.summary,
      };
    }
    result = invoke(latest.snapshot.revision);
  }
  if (result.kind === "unchanged" && exclusive) {
    return {
      kind: "failed",
      phase: "pre-commit",
      summary: "exclusive state claim was not written",
    };
  }
  if (result.kind === "written" || result.kind === "unchanged") {
    return {
      kind: "ok",
      snapshot: result.value,
      commit: result.value.auditOutbox ? "outbox-pending" : "clean",
    };
  }
  if (result.kind === "invalid") {
    return {
      kind: "failed",
      phase: "pre-commit",
      summary: result.issues.join("; "),
    };
  }
  if (result.kind === "conflict") {
    return {
      kind: "failed",
      phase: "pre-commit",
      summary: "state compare-and-set conflict",
    };
  }
  return {
    kind: "failed",
    phase: result.phase ?? "pre-commit",
    summary: result.summary,
  };
}

function prepareOperation(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  transition: MirrorTransition,
  operationId: string,
  reconciliation: boolean,
  classification?: MirrorFailureClass,
): OperationPreparationResult {
  if (!snapshot.auditOutbox) return { kind: "ready" };
  const result = mutateMirrorStateAtomic(ports, {
    transition,
    expectedRevision: snapshot.revision,
    auditContext: auditContext(
      context,
      operationId,
      reconciliation,
      classification,
    ),
    now: context.now(),
    intentUuid: context.intentUuid,
  });
  if (result.kind === "conflict") return { kind: "maintenance-completed" };
  const summary =
    result.kind === "invalid"
      ? `state invalid: ${result.issues.join("; ")}`
      : result.kind === "io-failure"
        ? result.summary
        : "pending audit outbox remains";
  return { kind: "maintenance-blocked", summary };
}

function prepareInvocation(
  input: ExecuteMirrorOperationInput,
): OperationPreparationResult & { operationId: string } {
  const { context, localState, ports } = input;
  const existing = requireReceipt(localState, context);
  const operationId = existing?.operationId ?? context.newOperationId();
  const transition: MirrorTransition = {
    kind: "prepare",
    event: context.event,
    operationId,
    preparedAt: existing?.preparedAt ?? context.now(),
    ...(context.operation === "create"
      ? {
          create: {
            intentDir: context.intentDir,
            repository: context.repository,
          },
        }
      : {}),
    authorization: context.authorization,
  };
  return {
    ...prepareOperation(
      ports,
      context,
      localState,
      transition,
      operationId,
      existing !== undefined,
    ),
    operationId,
  };
}

function warning(
  context: MirrorExecutionContext,
  operationId: string,
  classification: MirrorFailureClass,
  summary: string,
  retryable: boolean,
  effect: MirrorMutationEffect,
): MirrorWarning {
  return {
    operationId,
    operation: context.operation,
    classification,
    summary,
    occurredAt: context.now(),
    retryable,
    effect,
    source: "current-invocation",
  };
}

function stateFailure(
  context: MirrorExecutionContext,
  operationId: string,
  summary: string,
  effect: MirrorMutationEffect = "not-started",
  retryable = false,
): MirrorOperationOutcome {
  return {
    kind: "safety-blocked",
    operation: context.operation,
    warning: warning(
      context,
      operationId,
      "state-write",
      summary,
      retryable,
      effect,
    ),
  };
}

function maintenanceFailure(
  context: MirrorExecutionContext,
  operationId: string,
  preparation: Exclude<OperationPreparationResult, { kind: "ready" }>,
): MirrorOperationOutcome {
  const summary =
    preparation.kind === "maintenance-completed"
      ? "pending audit outbox maintenance completed; retry in a new invocation"
      : `pending audit outbox maintenance blocked: ${preparation.summary}`;
  return stateFailure(context, operationId, summary, "not-started", true);
}

function transitionFailure(
  context: MirrorExecutionContext,
  operationId: string,
  result: Extract<StateResult, { kind: "failed" }>,
): MirrorOperationOutcome {
  return stateFailure(
    context,
    operationId,
    result.summary,
    result.phase === "durability-unknown" ? "outcome-unknown" : "not-started",
  );
}

function persistBlocked(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  classification: MirrorFailureClass,
  summary: string,
  effect: MirrorMutationEffect = "not-started",
): MirrorOperationOutcome {
  const blockedWarning = warning(
    context,
    receipt.operationId,
    classification,
    summary,
    false,
    effect,
  );
  const transition: MirrorTransition = {
    kind: "mark-safety-blocked",
    event: context.event,
    warning: blockedWarning,
  };
  const preparation = prepareOperation(
    ports,
    context,
    snapshot,
    transition,
    receipt.operationId,
    true,
    classification,
  );
  if (preparation.kind !== "ready") {
    return maintenanceFailure(context, receipt.operationId, preparation);
  }
  const result = applyTransition(
    ports,
    context,
    snapshot,
    transition,
    receipt.operationId,
    true,
    classification,
  );
  if (result.kind === "failed") {
    return transitionFailure(context, receipt.operationId, result);
  }
  return {
    kind: "safety-blocked",
    operation: context.operation,
    warning: blockedWarning,
  };
}

function persistGatewayFailure(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  failure: Extract<GatewayOutcome<unknown>, { kind: "failure" }>,
): MirrorOperationOutcome {
  const gatewayWarning = warning(
    context,
    receipt.operationId,
    failure.classification,
    failure.summary,
    failure.retryable,
    failure.effect,
  );
  if (failure.effect === "not-started") {
    return persistBlocked(
      ports,
      context,
      snapshot,
      receipt,
      failure.classification,
      failure.summary,
      failure.effect,
    );
  }
  const result = applyTransition(
    ports,
    context,
    snapshot,
    {
      kind: "mark-pending",
      event: context.event,
      effect: failure.effect,
      warning: gatewayWarning,
    },
    receipt.operationId,
    false,
    failure.classification,
  );
  if (result.kind === "failed") {
    return stateFailure(context, receipt.operationId, result.summary);
  }
  return {
    kind: "pending",
    operation: context.operation,
    warning: gatewayWarning,
  };
}

function requireReceipt(
  snapshot: MirrorStateSnapshot,
  context: MirrorExecutionContext,
): MirrorOperationReceipt | null {
  return snapshot.receipts[mirrorEventKey(context.event)] ?? null;
}

function prepare(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
): StateResult & { operationId?: string } {
  const existing = requireReceipt(snapshot, context);
  const operationId = existing?.operationId ?? context.newOperationId();
  const transition: MirrorTransition = {
    kind: "prepare",
    event: context.event,
    operationId,
    preparedAt: existing?.preparedAt ?? context.now(),
    ...(context.operation === "create"
      ? {
          create: {
            intentDir: context.intentDir,
            repository: context.repository,
          },
        }
      : {}),
    authorization: context.authorization,
  };
  return {
    ...applyTransition(
      ports,
      context,
      snapshot,
      transition,
      operationId,
      existing !== undefined,
    ),
    operationId,
  };
}

function authorizationMatches(
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
): boolean {
  const expected = context.authorization;
  const persisted = receipt.authorization;
  if (!persisted) return false;
  if (!authorizationBaseMatches(context, snapshot, expected, persisted))
    return false;
  return authorizationKindMatches(expected, persisted);
}

function authorizationBaseMatches(
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  expected: MirrorExecutionAuthorization,
  persisted: MirrorExecutionAuthorization,
): boolean {
  const eventKey = mirrorEventKey(context.event);
  return (
    mirrorEventKey(expected.event) === eventKey &&
    mirrorEventKey(persisted.event) === eventKey &&
    expected.operation === context.operation &&
    persisted.operation === context.operation &&
    expected.boundaryInstance === context.event.boundary.instance &&
    persisted.boundaryInstance === context.event.boundary.instance &&
    expected.receiptRevision === persisted.receiptRevision &&
    persisted.receiptRevision <= snapshot.revision &&
    expected.kind === persisted.kind
  );
}

function authorizationKindMatches(
  expected: MirrorExecutionAuthorization,
  persisted: MirrorExecutionAuthorization,
): boolean {
  if (expected.kind === "auto" && persisted.kind === "auto") {
    return expected.resolvedMode === "auto" && persisted.resolvedMode === "auto";
  }
  if (
    expected.kind === "prompt-approved" &&
    persisted.kind === "prompt-approved"
  ) {
    return (
      expected.expectedBindingId === persisted.expectedBindingId &&
      expected.answerId === persisted.answerId &&
      expected.answerId.length > 0
    );
  }
  return (
    expected.kind === "manual" &&
    persisted.kind === "manual" &&
    expected.invocationId === persisted.invocationId &&
    expected.invocationId.length > 0
  );
}

function requireAuthorization(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
): MirrorOperationOutcome | null {
  if (authorizationMatches(context, snapshot, receipt)) return null;
  return persistBlocked(
    ports,
    context,
    snapshot,
    receipt,
    "provenance",
    "durable execution authorization does not match the receipt",
  );
}

function hasFinalSyncEvidence(
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
): boolean {
  const key = context.authorization.finalSyncReceiptKey;
  if (!key) return false;
  return finalSyncEvidenceReady({
    state: snapshot,
    event: context.event,
    snapshot: context.projectSync?.snapshot,
    projects: context.projectSync?.targets ?? [],
    receiptKey: key,
  });
}

function hasLandingEvidence(
  authorization: MirrorExecutionAuthorization,
): boolean {
  if (
    authorization.landing?.registryStatus === "complete" &&
    authorization.landing.workflowStatus === "Completed"
  ) {
    return true;
  }
  return (
    authorization.event.boundary.kind === "workflow-completed" &&
    authorization.landing?.registryStatus === "in-flight" &&
    authorization.landing.workflowStatus === "Running" &&
    authorization.landing.completionInstance ===
      authorization.event.boundary.instance
  );
}

function markAttempted(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  kind:
    | "mark-attempted"
    | "claim-create-attempt"
    | "retry-after-no-effect"
    | "claim-observed-retry",
): StateResult {
  return applyTransition(
    ports,
    context,
    snapshot,
    { kind, event: context.event, attemptedAt: context.now() },
    receipt.operationId,
    kind !== "mark-attempted",
    undefined,
    true,
  );
}

function hasConfiguredProjectTargets(context: MirrorExecutionContext): boolean {
  return (context.projectSync?.targets.length ?? 0) > 0;
}

function projectSyncExplicitlyDisabled(
  context: MirrorExecutionContext,
): boolean {
  return context.projectSync !== undefined &&
    context.projectSync.targets.length === 0;
}

function requiresProjectSync(context: MirrorExecutionContext): boolean {
  return context.operation !== "close" && hasConfiguredProjectTargets(context);
}

function completionTransition(
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  issue: RemoteMirrorIssue,
): MirrorTransition {
  const completedAt = receipt.completedAt ?? context.now();
  const completion = {
    event: context.event,
    issueNumber: issue.number,
    completedAt,
    ...(context.operation === "create"
      ? { createdAt: snapshot.provenance?.createdAt ?? completedAt }
      : {}),
  };
  if (
    receipt.projectSyncHold !== undefined &&
    projectSyncExplicitlyDisabled(context)
  ) {
    return {
      kind: "retire-project-sync-hold",
      event: context.event,
      operationId: receipt.operationId,
    };
  }
  if (
    receipt.status === "succeeded" &&
    receipt.projectSyncVerified === true &&
    requiresProjectSync(context)
  ) {
    return {
      kind: "complete",
      ...completion,
      projectSyncVerified: true,
    };
  }
  if (receipt.status === "succeeded" && requiresProjectSync(context)) {
    return {
      kind: "hold-for-project-sync",
      event: context.event,
      operationId: receipt.operationId,
      heldAt: completedAt,
    };
  }
  return requiresProjectSync(context)
    ? {
        kind: "complete-with-project-sync-hold",
        ...completion,
        heldAt: receipt.projectSyncHold?.heldAt ?? completedAt,
      }
    : { kind: "complete", ...completion };
}

function complete(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  issue: RemoteMirrorIssue,
  reconciliation: boolean,
): MirrorOperationOutcome {
  const transition = completionTransition(context, snapshot, receipt, issue);
  const preparation = prepareOperation(
    ports,
    context,
    snapshot,
    transition,
    receipt.operationId,
    reconciliation,
  );
  if (preparation.kind !== "ready") {
    return maintenanceFailure(context, receipt.operationId, preparation);
  }
  const result = applyTransition(
    ports,
    context,
    snapshot,
    transition,
    receipt.operationId,
    reconciliation,
  );
  if (result.kind === "ok") {
    return {
      kind: "completed",
      operation: context.operation,
      issueNumber: issue.number,
    };
  }

  const latest = readMirrorState(ports);
  if (latest.kind === "ok") {
    const latestReceipt = requireReceipt(latest.snapshot, context);
    if (latestReceipt && latestReceipt.status !== "succeeded") {
      const postRemoteWarning = warning(
        context,
        latestReceipt.operationId,
        "state-write",
        `remote operation succeeded but local completion failed: ${result.summary}`,
        true,
        "outcome-unknown",
      );
      const recorded = applyTransition(
        ports,
        context,
        latest.snapshot,
        {
          kind: "mark-pending",
          event: context.event,
          effect: "outcome-unknown",
          warning: postRemoteWarning,
        },
        latestReceipt.operationId,
        true,
        "state-write",
      );
      // A warning that was never persisted must not be reported as recorded.
      if (recorded.kind === "failed") {
        return stateFailure(
          context,
          latestReceipt.operationId,
          `${postRemoteWarning.summary}; the outcome could not be recorded: ${recorded.summary}`,
        );
      }
      return {
        kind: "safety-blocked",
        operation: context.operation,
        warning: postRemoteWarning,
      };
    }
  }
  return stateFailure(context, receipt.operationId, result.summary);
}

async function readiness(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
): Promise<
  | { kind: "ready"; snapshot: MirrorStateSnapshot }
  | { kind: "outcome"; outcome: MirrorOperationOutcome }
> {
  const result = await context.gateway.readiness(context.repository);
  if (result.kind === "ok") return { kind: "ready", snapshot };
  const readinessWarning = warning(
    context,
    receipt.operationId,
    result.classification,
    result.summary,
    result.retryable,
    "not-started",
  );
  const persisted = applyTransition(
    ports,
    context,
    snapshot,
    { kind: "set-warning", event: context.event, warning: readinessWarning },
    receipt.operationId,
    false,
    result.classification,
  );
  if (persisted.kind === "failed") {
    return {
      kind: "outcome",
      outcome: stateFailure(context, receipt.operationId, persisted.summary),
    };
  }
  return {
    kind: "outcome",
    outcome: {
      kind: "pending",
      operation: context.operation,
      warning: readinessWarning,
    },
  };
}

async function classifyCreateState(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt & { createIdentity: NonNullable<MirrorOperationReceipt["createIdentity"]> },
): Promise<
  | { kind: "outcome"; outcome: MirrorOperationOutcome }
  | {
      kind: "candidate";
      candidate: ReturnType<typeof classifyCandidates>;
    }
> {
  // A linked mirror is searched and verified on its recorded provenance: the
  // remote marker carries the create identity of the first create, so keying
  // the search on this receipt's fresh identity would find nothing and let a
  // second Issue be created.
  const linkedProvenance =
    snapshot.issueNumber !== null && snapshot.provenance
      ? snapshot.provenance
      : null;
  const searchIdentity = linkedProvenance?.createIdentity ?? receipt.createIdentity;
  const marker = renderMirrorMarker(searchIdentity);
  const found = await context.gateway.findIssuesByMarker(
    context.repository,
    marker,
  );
  if (found.kind === "failure") {
    const searchWarning = warning(
      context,
      receipt.operationId,
      found.classification,
      found.summary,
      found.retryable,
      "not-started",
    );
    const persisted = applyTransition(
      ports,
      context,
      snapshot,
      { kind: "set-warning", event: context.event, warning: searchWarning },
      receipt.operationId,
      true,
      found.classification,
    );
    if (persisted.kind === "failed") {
      return {
        kind: "outcome",
        outcome: stateFailure(context, receipt.operationId, persisted.summary),
      };
    }
    return {
      kind: "outcome",
      outcome: { kind: "pending", operation: "create", warning: searchWarning },
    };
  }
  const verified: RemoteMirrorIssue[] = [];
  let mismatches = 0;
  for (const candidate of found.value) {
    const ownership = verifyOwnership({
      remoteIssue: candidate,
      localProvenance: linkedProvenance ?? {
        schema: 1,
        createIdentity: receipt.createIdentity,
        issueNumber: candidate.number,
        createdAt: context.now(),
      },
    });
    if (ownership.kind === "verified") verified.push(candidate);
    else mismatches += 1;
  }
  const localState = linkedProvenance
    ? "provenance-present"
    : receipt.status === "prepared"
      ? "fresh-prepared"
      : receipt.status === "pending" &&
          receipt.lastEffect === "no-effect-confirmed"
        ? "pending-no-effect"
        : "attempted-or-unknown";
  return {
    kind: "candidate",
    candidate: classifyCandidates({
      localState,
      verifiedCandidates: verified,
      mismatchCandidateCount: mismatches,
      localCreateIdentity: receipt.createIdentity,
      ...(linkedProvenance ? { provenance: linkedProvenance } : {}),
      now: context.now(),
    }),
  };
}

// Completion is only reachable from an attempted receipt. Both settlement
// paths that meet an already-converged remote (an adopted create candidate, an
// already CLOSED Issue) claim the attempt through here, so neither can drift
// into completing straight from `prepared`.
function claimPreparedAttempt(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
): ReadyReceipt {
  if (receipt.status !== "prepared") return { kind: "ready", snapshot, receipt };
  const attempted = markAttempted(
    ports,
    context,
    snapshot,
    receipt,
    "mark-attempted",
  );
  if (attempted.kind === "failed") {
    return {
      kind: "outcome",
      outcome: stateFailure(context, receipt.operationId, attempted.summary),
    };
  }
  return {
    kind: "ready",
    snapshot: attempted.snapshot,
    receipt: requireReceipt(attempted.snapshot, context) as MirrorOperationReceipt,
  };
}

function adoptCreateCandidate(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  issue: RemoteMirrorIssue,
): MirrorOperationOutcome {
  const claimed = claimPreparedAttempt(ports, context, snapshot, receipt);
  if (claimed.kind === "outcome") return claimed.outcome;
  return complete(
    ports,
    context,
    claimed.snapshot,
    claimed.receipt,
    issue,
    true,
  );
}

async function createRemoteIssue(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
): Promise<MirrorOperationOutcome> {
  const claimKind =
    receipt.status === "pending"
      ? "retry-after-no-effect"
      : "claim-create-attempt";
  const claimed = markAttempted(ports, context, snapshot, receipt, claimKind);
  if (claimed.kind === "failed") {
    return stateFailure(context, receipt.operationId, claimed.summary);
  }
  const claimedReceipt = requireReceipt(
    claimed.snapshot,
    context,
  ) as MirrorOperationReceipt;
  const claimedIdentity = claimedReceipt.createIdentity;
  if (!claimedIdentity) {
    return stateFailure(
      context,
      claimedReceipt.operationId,
      "claimed create receipt identity is absent",
    );
  }
  const authorizationFailure = requireAuthorization(
    ports,
    context,
    claimed.snapshot,
    claimedReceipt,
  );
  if (authorizationFailure) return authorizationFailure;
  const permit = createMirrorMutationPermit({
    event: context.event,
    repository: context.repository,
    operation: "create",
    issueNumber: null,
  });
  const created = await context.gateway.createIssue(permit, context.issueContent);
  if (created.kind === "failure") {
    return persistGatewayFailure(
      ports,
      context,
      claimed.snapshot,
      claimedReceipt,
      created,
    );
  }
  const verified = verifyOwnership({
    remoteIssue: created.value,
    localProvenance: {
      schema: 1,
      createIdentity: claimedIdentity,
      issueNumber: created.value.number,
      createdAt: context.now(),
    },
  });
  if (verified.kind !== "verified") {
    return persistBlocked(
      ports,
      context,
      claimed.snapshot,
      claimedReceipt,
      "provenance",
      `create response failed ownership verification: ${verified.summary}`,
      "outcome-unknown",
    );
  }
  return complete(
    ports,
    context,
    claimed.snapshot,
    claimedReceipt,
    created.value,
    false,
  );
}

async function executeCreate(
  input: ExecuteMirrorOperationInput,
): Promise<MirrorOperationOutcome> {
  const { context, ports } = input;
  const prepared = prepare(ports, context, input.localState);
  const operationId = prepared.operationId ?? context.newOperationId();
  if (prepared.kind === "failed") {
    return stateFailure(context, operationId, prepared.summary);
  }
  let snapshot = prepared.snapshot;
  const receipt = requireReceipt(snapshot, context);
  if (!receipt?.createIdentity) {
    return stateFailure(context, operationId, "create receipt identity is absent");
  }
  if (
    !createIdentityMatchesContext(receipt.createIdentity, {
      intentUuid: context.intentUuid,
      intentDir: context.intentDir,
      repository: context.repository,
    })
  ) {
    return persistBlocked(
      ports,
      context,
      snapshot,
      receipt,
      "provenance",
      "persisted create identity does not match the current execution context",
    );
  }
  const authorizationFailure = requireAuthorization(
    ports,
    context,
    snapshot,
    receipt,
  );
  if (authorizationFailure) return authorizationFailure;

  const ready = await readiness(ports, context, snapshot, receipt);
  if (ready.kind === "outcome") return ready.outcome;
  snapshot = ready.snapshot;

  const classified = await classifyCreateState(
    ports,
    context,
    snapshot,
    receipt as MirrorOperationReceipt & {
      createIdentity: NonNullable<MirrorOperationReceipt["createIdentity"]>;
    },
  );
  if (classified.kind === "outcome") return classified.outcome;
  const candidate = classified.candidate;
  if (candidate.kind === "safety-blocked") {
    return persistBlocked(
      ports,
      context,
      snapshot,
      receipt,
      candidate.reason === "ambiguous" ? "ambiguous-create" : "provenance",
      `create reconciliation blocked: ${candidate.reason}`,
      receipt.lastEffect ?? "not-started",
    );
  }

  if (candidate.kind === "adopt") {
    return adoptCreateCandidate(
      ports,
      context,
      snapshot,
      receipt,
      candidate.issue,
    );
  }
  return createRemoteIssue(ports, context, snapshot, receipt);
}

function ownershipFailure(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt | null,
  summary: string,
): MirrorOperationOutcome {
  if (receipt) {
    return persistBlocked(
      ports,
      context,
      snapshot,
      receipt,
      "provenance",
      summary,
    );
  }
  return {
    kind: "safety-blocked",
    operation: context.operation,
    warning: warning(
      context,
      context.newOperationId(),
      "provenance",
      summary,
      false,
      "not-started",
    ),
  };
}

function linkedIdentityIssue(
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
): string | null {
  const provenance = snapshot.provenance;
  const issueNumber = snapshot.issueNumber;
  if (!provenance || issueNumber === null) {
    return "linked provenance and Issue number are required";
  }
  const identity = provenance.createIdentity;
  return identity.intentUuid !== context.intentUuid ||
    identity.intentDir !== context.intentDir ||
    identity.repository.canonical !== context.repository.canonical ||
    provenance.issueNumber !== issueNumber
    ? "local provenance does not match the execution context"
    : null;
}

function completionGuardIssue(
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
): string | null {
  if (
    context.event.boundary.kind === "workflow-completed" &&
    !hasLandingEvidence(context.authorization)
  ) {
    return "workflow completion landing is not verified";
  }
  return context.operation === "close" &&
    !hasFinalSyncEvidence(context, snapshot)
    ? "close requires final sync success for the same completion instance"
    : null;
}

function ensureReceipt(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt | null,
):
  | {
      kind: "ready";
      snapshot: MirrorStateSnapshot;
      receipt: MirrorOperationReceipt;
    }
  | { kind: "outcome"; outcome: MirrorOperationOutcome } {
  if (receipt) return { kind: "ready", snapshot, receipt };
  const prepared = prepare(ports, context, snapshot);
  if (prepared.kind === "failed") {
    return {
      kind: "outcome",
      outcome: stateFailure(
        context,
        prepared.operationId ?? context.newOperationId(),
        prepared.summary,
      ),
    };
  }
  const preparedReceipt = requireReceipt(prepared.snapshot, context);
  return preparedReceipt
    ? { kind: "ready", snapshot: prepared.snapshot, receipt: preparedReceipt }
    : {
        kind: "outcome",
        outcome: stateFailure(
          context,
          context.newOperationId(),
          "receipt is absent",
        ),
      };
}

// Named alias keeps the signature single-token for the complexity gate's
// naive TS parser — a multiline object union inside Promise<> breaks its
// function segmentation and aggregates every following function into one span.
type LinkedIssueViewResult =
  | {
      kind: "viewed";
      issue: RemoteMirrorIssue;
      snapshot: MirrorStateSnapshot;
      receipt: MirrorOperationReceipt | null;
    }
  | { kind: "outcome"; outcome: MirrorOperationOutcome };

async function viewLinkedIssue(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt | null,
  issueNumber: number,
): Promise<LinkedIssueViewResult> {
  const viewed = await context.gateway.viewIssue(context.repository, issueNumber);
  if (viewed.kind === "ok") {
    return { kind: "viewed", issue: viewed.value, snapshot, receipt };
  }
  const ensured = ensureReceipt(ports, context, snapshot, receipt);
  if (ensured.kind === "outcome") return ensured;
  const viewWarning = warning(
    context,
    ensured.receipt.operationId,
    viewed.classification,
    viewed.summary,
    viewed.retryable,
    "not-started",
  );
  const persisted = applyTransition(
    ports,
    context,
    ensured.snapshot,
    { kind: "set-warning", event: context.event, warning: viewWarning },
    ensured.receipt.operationId,
    true,
    viewed.classification,
  );
  if (persisted.kind === "failed") {
    return {
      kind: "outcome",
      outcome: stateFailure(context, ensured.receipt.operationId, persisted.summary),
    };
  }
  return {
    kind: "outcome",
    outcome: { kind: "pending", operation: context.operation, warning: viewWarning },
  };
}

function reconcileLinkedReceipt(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt | null,
  issue: RemoteMirrorIssue,
):
  | {
      kind: "continue";
      snapshot: MirrorStateSnapshot;
      receipt: MirrorOperationReceipt | null;
    }
  | { kind: "outcome"; outcome: MirrorOperationOutcome } {
  if (
    !receipt ||
    (receipt.status !== "attempted" && receipt.status !== "pending")
  ) {
    return { kind: "continue", snapshot, receipt };
  }
  const converged =
    context.operation === "sync"
      ? issue.body === context.issueContent.body
      : issue.state === "CLOSED";
  if (converged) {
    return {
      kind: "outcome",
      outcome: complete(ports, context, snapshot, receipt, issue, true),
    };
  }
  if (
    receipt.status !== "pending" ||
    receipt.lastEffect !== "outcome-unknown"
  ) {
    return { kind: "continue", snapshot, receipt };
  }
  const claimed = markAttempted(
    ports,
    context,
    snapshot,
    receipt,
    "claim-observed-retry",
  );
  return claimed.kind === "failed"
    ? {
        kind: "outcome",
        outcome: stateFailure(context, receipt.operationId, claimed.summary),
      }
    : {
        kind: "continue",
        snapshot: claimed.snapshot,
        receipt: requireReceipt(claimed.snapshot, context),
      };
}

async function prepareLinkedMutation(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt | null,
): Promise<
  | {
      kind: "ready";
      snapshot: MirrorStateSnapshot;
      receipt: MirrorOperationReceipt;
    }
  | { kind: "outcome"; outcome: MirrorOperationOutcome }
> {
  const ensured = ensureReceipt(ports, context, snapshot, receipt);
  if (ensured.kind === "outcome") return ensured;
  let current = ensured;
  const authorizationFailure = requireAuthorization(
    ports,
    context,
    current.snapshot,
    current.receipt,
  );
  if (authorizationFailure)
    return { kind: "outcome", outcome: authorizationFailure };
  const ready = await readiness(
    ports,
    context,
    current.snapshot,
    current.receipt,
  );
  if (ready.kind === "outcome") return ready;
  current = {
    kind: "ready",
    snapshot: ready.snapshot,
    receipt: requireReceipt(ready.snapshot, context) as MirrorOperationReceipt,
  };
  if (current.receipt.status !== "prepared") return current;
  const attempted = markAttempted(
    ports,
    context,
    current.snapshot,
    current.receipt,
    "mark-attempted",
  );
  return attempted.kind === "failed"
    ? {
        kind: "outcome",
        outcome: stateFailure(
          context,
          current.receipt.operationId,
          attempted.summary,
        ),
      }
    : {
        kind: "ready",
        snapshot: attempted.snapshot,
        receipt: requireReceipt(
          attempted.snapshot,
          context,
        ) as MirrorOperationReceipt,
      };
}

async function mutateLinkedIssue(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  issueNumber: number,
): Promise<MirrorOperationOutcome> {
  const authorizationFailure = requireAuthorization(
    ports,
    context,
    snapshot,
    receipt,
  );
  if (authorizationFailure) return authorizationFailure;
  const permit = createMirrorMutationPermit({
    event: context.event,
    repository: context.repository,
    operation: context.operation,
    issueNumber,
  });
  const mutated =
    context.operation === "sync"
      ? await context.gateway.editIssue(permit, context.issueContent.body)
      : await context.gateway.closeIssue(permit);
  if (mutated.kind === "failure") {
    return persistGatewayFailure(ports, context, snapshot, receipt, mutated);
  }
  const verified = verifyOwnership({
    remoteIssue: mutated.value,
    localProvenance: snapshot.provenance as NonNullable<
      MirrorStateSnapshot["provenance"]
    >,
  });
  if (verified.kind !== "verified") {
    return persistBlocked(
      ports,
      context,
      snapshot,
      receipt,
      "provenance",
      `remote mutation response failed ownership verification: ${verified.summary}`,
      "outcome-unknown",
    );
  }
  return complete(ports, context, snapshot, receipt, mutated.value, false);
}

async function executeLinked(
  input: ExecuteMirrorOperationInput,
): Promise<MirrorOperationOutcome> {
  const { context, ports } = input;
  const initialReceipt = requireReceipt(input.localState, context);
  const identityIssue = linkedIdentityIssue(context, input.localState);
  if (identityIssue) {
    return ownershipFailure(
      ports,
      context,
      input.localState,
      initialReceipt,
      identityIssue,
    );
  }
  if (initialReceipt) {
    const authorizationFailure = requireAuthorization(
      ports,
      context,
      input.localState,
      initialReceipt,
    );
    if (authorizationFailure) return authorizationFailure;
  }
  const issueNumber = input.localState.issueNumber as number;
  const viewed = await viewLinkedIssue(
    ports,
    context,
    input.localState,
    initialReceipt,
    issueNumber,
  );
  if (viewed.kind === "outcome") return viewed.outcome;
  const owned = verifyOwnership({
    remoteIssue: viewed.issue,
    localProvenance: viewed.snapshot.provenance as NonNullable<
      MirrorStateSnapshot["provenance"]
    >,
  });
  if (owned.kind !== "verified") {
    return ownershipFailure(
      ports,
      context,
      viewed.snapshot,
      viewed.receipt,
      owned.summary,
    );
  }
  const guardIssue = completionGuardIssue(context, viewed.snapshot);
  if (guardIssue) {
    return ownershipFailure(
      ports,
      context,
      viewed.snapshot,
      viewed.receipt,
      guardIssue,
    );
  }
  if (
    context.operation === "close" &&
    viewed.issue.state === "CLOSED"
  ) {
    const ensured = ensureReceipt(
      ports,
      context,
      viewed.snapshot,
      viewed.receipt,
    );
    if (ensured.kind === "outcome") return ensured.outcome;
    const authorizationFailure = requireAuthorization(
      ports,
      context,
      ensured.snapshot,
      ensured.receipt,
    );
    if (authorizationFailure) return authorizationFailure;
    const claimed = claimPreparedAttempt(
      ports,
      context,
      ensured.snapshot,
      ensured.receipt,
    );
    if (claimed.kind === "outcome") return claimed.outcome;
    return complete(
      ports,
      context,
      claimed.snapshot,
      claimed.receipt,
      viewed.issue,
      true,
    );
  }
  const reconciled = reconcileLinkedReceipt(
    ports,
    context,
    viewed.snapshot,
    viewed.receipt,
    viewed.issue,
  );
  if (reconciled.kind === "outcome") return reconciled.outcome;
  const prepared = await prepareLinkedMutation(
    ports,
    context,
    reconciled.snapshot,
    reconciled.receipt,
  );
  if (prepared.kind === "outcome") return prepared.outcome;
  return mutateLinkedIssue(
    ports,
    context,
    prepared.snapshot,
    prepared.receipt,
    issueNumber,
  );
}

export async function executeMirrorOperation(
  input: ExecuteMirrorOperationInput,
): Promise<MirrorOperationOutcome> {
  if (input.context.operation !== input.context.event.operation) {
    return {
      kind: "safety-blocked",
      operation: input.context.operation,
      warning: warning(
        input.context,
        input.context.newOperationId(),
        "provenance",
        "execution operation does not match event operation",
        false,
        "not-started",
      ),
    };
  }
  const preparation = prepareInvocation(input);
  if (preparation.kind !== "ready") {
    return maintenanceFailure(
      input.context,
      preparation.operationId,
      preparation,
    );
  }
  const outcome =
    input.context.operation === "create"
      ? await executeCreate(input)
      : await executeLinked(input);
  // Every configured create/sync completion is already durably held at this
  // point. The receipt becomes succeeded only after all Project ledger evidence
  // has landed, so the completion loop cannot advance to close through a failed
  // bookkeeping write.
  if (outcome.kind === "completed" && requiresProjectSync(input.context)) {
    return reconcileHeldProjects(input, outcome);
  }
  return outcome;
}

function projectSyncOperationId(
  input: ExecuteMirrorOperationInput,
  snapshot = input.localState,
): string {
  return (
    requireReceipt(snapshot, input.context)?.operationId ??
    input.context.newOperationId()
  );
}

function pendingProjectSync(
  input: ExecuteMirrorOperationInput,
  classification: MirrorFailureClass,
  summary: string,
  snapshot?: MirrorStateSnapshot,
): MirrorOperationOutcome {
  const operationId = projectSyncOperationId(input, snapshot);
  return {
    kind: "pending",
    operation: input.context.operation,
    warning: warning(
      input.context,
      operationId,
      classification,
      summary,
      true,
      "outcome-unknown",
    ),
  };
}

type HeldProjectSyncReceipt = MirrorOperationReceipt &
  Readonly<{
    status: "pending";
    projectSyncHold: MirrorProjectSyncHold;
  }>;

type HeldProjectSyncBarrier =
  | {
      kind: "ready";
      snapshot: MirrorStateSnapshot;
      receipt: HeldProjectSyncReceipt;
    }
  | { kind: "outcome"; outcome: MirrorOperationOutcome };

function loadHeldProjectSyncBarrier(
  input: ExecuteMirrorOperationInput,
  completed: Extract<MirrorOperationOutcome, { kind: "completed" }>,
): HeldProjectSyncBarrier {
  const latest = readMirrorState(input.ports);
  if (latest.kind !== "ok") {
    const summary =
      latest.kind === "invalid"
        ? `Project sync receipt state is invalid: ${latest.issues.join("; ")}`
        : latest.summary;
    return {
      kind: "outcome",
      outcome: pendingProjectSync(input, "state-write", summary),
    };
  }
  const receipt = requireReceipt(latest.snapshot, input.context);
  if (receipt?.status === "succeeded") {
    return {
      kind: "outcome",
      outcome:
        receipt.projectSyncVerified === true
          ? completed
          : pendingProjectSync(
              input,
              "state-write",
              "Project sync converged but its durable verification marker is absent",
              latest.snapshot,
            ),
    };
  }
  if (
    receipt?.status !== "pending" ||
    receipt.projectSyncHold === undefined
  ) {
    return {
      kind: "outcome",
      outcome: pendingProjectSync(
        input,
        "state-write",
        "Project sync converged but its durable receipt hold is absent",
        latest.snapshot,
      ),
    };
  }
  return {
    kind: "ready",
    snapshot: latest.snapshot,
    receipt: receipt as HeldProjectSyncReceipt,
  };
}

// Build every remote verdict first, then commit the authoritative scope, all
// rows, any board-wide warning, and the receipt decision as one state
// transition. A failed commit leaves the durable hold untouched; the next
// boundary re-queries GitHub and rebuilds the whole plan.
async function reconcileHeldProjectsUnderLock(
  input: ExecuteMirrorOperationInput,
  outcome: Extract<MirrorOperationOutcome, { kind: "completed" }>,
): Promise<MirrorOperationOutcome> {
  const { context, ports } = input;
  const barrier = loadHeldProjectSyncBarrier(input, outcome);
  if (barrier.kind === "outcome") return barrier.outcome;
  const { snapshot, receipt } = barrier;

  const latestReceiptKey = latestProjectReconciliationReceiptKey(
    snapshot,
    input.context.intentUuid,
  );
  if (latestReceiptKey === undefined) {
    return pendingProjectSync(
      input,
      "state-write",
      "Project reconciliation receipt order could not be established",
      snapshot,
    );
  }
  if (latestReceiptKey !== receipt.key) {
    const retired = applyTransition(
      ports,
      context,
      snapshot,
      {
        kind: "retire-project-sync-hold",
        event: context.event,
        operationId: receipt.operationId,
      },
      receipt.operationId,
      true,
      undefined,
      true,
    );
    return retired.kind === "ok"
      ? outcome
      : pendingProjectSync(
          input,
          "state-write",
          `Superseded Project reconciliation could not be retired atomically: ${retired.summary}`,
          snapshot,
        );
  }

  const projects = await reconcileProjects(context, outcome.issueNumber);
  if (projects.kind === "not-required") {
    return pendingProjectSync(
      input,
      "state-write",
      "Project sync is durably held but no reconciliation target is available",
      snapshot,
    );
  }
  const projectWarning =
    projects.kind === "unsettled" &&
      projects.globalWarning !== undefined
      ? {
          ...projects.globalWarning,
          operationId: receipt.operationId,
          operation: context.operation,
        }
      : undefined;
  const result = applyTransition(
    ports,
    context,
    snapshot,
    {
      kind: "commit-project-reconciliation",
      event: context.event,
      operationId: receipt.operationId,
      heldAt: receipt.projectSyncHold.heldAt,
      ledgerPlan: projects.ledgerPlan,
      ...(projectWarning === undefined
        ? {}
        : { globalWarning: projectWarning }),
    },
    receipt.operationId,
    true,
    projects.kind === "unsettled"
      ? projects.classification
      : undefined,
    true,
  );
  if (result.kind === "failed") {
    return pendingProjectSync(
      input,
      "state-write",
      `Project reconciliation could not be committed atomically: ${result.summary}`,
      snapshot,
    );
  }

  const committedReceipt = requireReceipt(result.snapshot, context);
  if (
    committedReceipt?.status === "succeeded" &&
    committedReceipt.projectSyncVerified === true
  ) {
    return outcome;
  }
  if (projects.kind === "unsettled") {
    return pendingProjectSync(
      input,
      projects.classification,
      `the Issue is up to date but ${projects.unsettled} Project board(s) are unsynchronized; the next boundary reconciles them`,
      result.snapshot,
    );
  }
  return pendingProjectSync(
    input,
    "state-write",
    "Project reconciliation committed without durable receipt verification",
    result.snapshot,
  );
}

async function reconcileHeldProjects(
  input: ExecuteMirrorOperationInput,
  outcome: Extract<MirrorOperationOutcome, { kind: "completed" }>,
): Promise<MirrorOperationOutcome> {
  const initialBarrier = loadHeldProjectSyncBarrier(input, outcome);
  if (initialBarrier.kind === "outcome") return initialBarrier.outcome;

  const lock = input.projectReconciliationLock ??
    createMirrorProjectReconciliationLock(input.context.statePath);
  if (!lock.acquire()) {
    return pendingProjectSync(
      input,
      "state-write",
      "Project reconciliation lock is unavailable",
      initialBarrier.snapshot,
    );
  }
  try {
    return await reconcileHeldProjectsUnderLock(input, outcome);
  } finally {
    lock.release();
  }
}
