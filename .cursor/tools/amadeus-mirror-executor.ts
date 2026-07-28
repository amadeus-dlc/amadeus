// amadeus-mirror-executor.ts — C6 guarded Mirror operation executor.
//
// This is the only module allowed to mint mutation permits. It composes the
// state store, provenance verifier, and GitHub Gateway without reimplementing
// their codecs or transports.

import {
  createMirrorMutationPermit,
  createMirrorProjectMutationPermit,
} from "./amadeus-mirror-capability.ts";
import {
  classifyProjectFailure,
  expectedProjectStatus,
  mirrorEventKey,
  selectProjectStatusOption,
} from "./amadeus-mirror-policy.ts";
import {
  classifyCandidates,
  createIdentityMatchesContext,
  renderMirrorMarker,
  verifyOwnership,
} from "./amadeus-mirror-provenance.ts";
import type { MirrorTransition } from "./amadeus-mirror-state-reducer.ts";
import {
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
  MirrorProjectDiagnostic,
  MirrorProjectItemsView,
  MirrorProjectStatusField,
  MirrorProjectSyncEntry,
  MirrorProjectSyncState,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
  MirrorWarning,
  RemoteMirrorIssue,
} from "./amadeus-mirror-types.ts";

export type ExecuteMirrorOperationInput = Readonly<{
  context: MirrorExecutionContext;
  ports: MirrorStateStorePorts;
  localState: MirrorStateSnapshot;
}>;

type StateResult =
  | { kind: "ok"; snapshot: MirrorStateSnapshot }
  | { kind: "failed"; summary: string };

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
      return { kind: "failed", summary: "state compare-and-set conflict" };
    }
    const latest = readMirrorState(ports);
    if (latest.kind !== "ok") {
      return {
        kind: "failed",
        summary:
          latest.kind === "invalid"
            ? `state invalid after conflict: ${latest.issues.join("; ")}`
            : latest.summary,
      };
    }
    result = invoke(latest.snapshot.revision);
  }
  if (result.kind === "unchanged" && exclusive) {
    return { kind: "failed", summary: "exclusive state claim was not written" };
  }
  if (result.kind === "written" || result.kind === "unchanged") {
    return { kind: "ok", snapshot: result.value };
  }
  if (result.kind === "invalid") {
    return { kind: "failed", summary: result.issues.join("; ") };
  }
  if (result.kind === "conflict") {
    return { kind: "failed", summary: "state compare-and-set conflict" };
  }
  return { kind: "failed", summary: result.summary };
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
): MirrorOperationOutcome {
  return {
    kind: "safety-blocked",
    operation: context.operation,
    warning: warning(
      context,
      operationId,
      "state-write",
      summary,
      false,
      "not-started",
    ),
  };
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
  applyTransition(
    ports,
    context,
    snapshot,
    { kind: "mark-safety-blocked", event: context.event, warning: blockedWarning },
    receipt.operationId,
    true,
    classification,
  );
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
  const receipt = snapshot.receipts[key];
  return (
    receipt?.event.intentUuid === context.intentUuid &&
    receipt.event.boundary.kind === "workflow-completed" &&
    receipt.event.operation === "sync" &&
    receipt.status === "succeeded"
  );
}

function hasLandingEvidence(
  authorization: MirrorExecutionAuthorization,
): boolean {
  return (
    authorization.landing?.registryStatus === "complete" &&
    authorization.landing.workflowStatus === "Completed"
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

function complete(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  issue: RemoteMirrorIssue,
  reconciliation: boolean,
): MirrorOperationOutcome {
  const result = applyTransition(
    ports,
    context,
    snapshot,
    {
      kind: "complete",
      event: context.event,
      issueNumber: issue.number,
      completedAt: context.now(),
      ...(context.operation === "create" ? { createdAt: context.now() } : {}),
    },
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
      applyTransition(
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
  const marker = renderMirrorMarker(receipt.createIdentity);
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
    return {
      kind: "outcome",
      outcome:
        persisted.kind === "failed"
          ? stateFailure(context, receipt.operationId, persisted.summary)
          : { kind: "pending", operation: "create", warning: searchWarning },
    };
  }
  const verified: RemoteMirrorIssue[] = [];
  let mismatches = 0;
  for (const candidate of found.value) {
    const ownership = verifyOwnership({
      remoteIssue: candidate,
      localProvenance: {
        schema: 1,
        createIdentity: receipt.createIdentity,
        issueNumber: candidate.number,
        createdAt: context.now(),
      },
    });
    if (ownership.kind === "verified") verified.push(candidate);
    else mismatches += 1;
  }
  const localState =
    receipt.status === "prepared"
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
      now: context.now(),
    }),
  };
}

function adoptCreateCandidate(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt,
  issue: RemoteMirrorIssue,
): MirrorOperationOutcome {
  if (receipt.status !== "prepared") {
    return complete(ports, context, snapshot, receipt, issue, true);
  }
  const attempted = markAttempted(
    ports,
    context,
    snapshot,
    receipt,
    "mark-attempted",
  );
  if (attempted.kind === "failed") {
    return stateFailure(context, receipt.operationId, attempted.summary);
  }
  const attemptedReceipt = requireReceipt(
    attempted.snapshot,
    context,
  ) as MirrorOperationReceipt;
  return complete(
    ports,
    context,
    attempted.snapshot,
    attemptedReceipt,
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
    return complete(
      ports,
      context,
      ensured.snapshot,
      ensured.receipt,
      viewed.issue,
      ensured.receipt.status !== "prepared",
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

// --- Project status reconciliation (internal step) ---------------------------
//
// Runs after the Issue body mutation has already succeeded, inside the same
// chain. The Issue outcome is never rolled back: the remote Issue landed, and
// `issueNumber` / `provenance` are recorded before this step runs, so a Project
// failure can never strand a created Issue unlinked. The operation *receipt*,
// however, is parked at `pending` while the board has not converged — a hold
// with its own reason field, not a claim that the Issue mutation failed
// (E-U2CG). That keeps the operation IN_PROGRESS so the next boundary retries
// it, and deliberately never writes `safety-blocked` onto the receipt, since
// that status is terminal in the completion policy and would stop the mirror
// permanently over a board this tool cannot reach.
//
// The loop reconciles the union of the Projects the Issue already belongs to
// and the Projects configuration targets. Membership is synced everywhere we
// have access; only configured targets may have the Issue *added* to them.
// Each Project is independent: one Project's failure classifies that row and
// the loop moves on. Classification is unconditional — the next ledger state is
// a function of this round's result alone, never of the row's current state.

function projectDiagnostic(
  context: MirrorExecutionContext,
  diagnostic: MirrorProjectDiagnostic,
): void {
  context.projectSync?.diagnostic?.(diagnostic);
}

function canonicalProject(target: MirrorProjectTarget): string {
  return `${target.project.owner}/${target.project.number}`;
}

// A single unsynchronized warning, not attached to any operation receipt: the
// Issue operation itself succeeded, so its receipt must stay `succeeded`.
function persistUnsyncedWarning(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  classification: MirrorFailureClass,
  summary: string,
): void {
  const latest = readMirrorState(ports);
  if (latest.kind !== "ok") return;
  applyTransition(
    ports,
    context,
    latest.snapshot,
    {
      kind: "set-global-warning",
      warning: {
        operationId: null,
        operation: null,
        classification,
        summary,
        occurredAt: context.now(),
        retryable: false,
        effect: "not-started",
        source: "current-invocation",
      },
    },
    undefined,
    false,
    classification,
  );
}

function upsertProjectEntry(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  entry: MirrorProjectSyncEntry,
): void {
  applyProjectTransition(ports, context, {
    kind: "upsert-project-entry",
    entry,
  });
}

// Every ledger write re-reads the state first: the reconcile loop writes one row
// per Project, so each write must build on the revision the previous one left.
function applyProjectTransition(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  transition: MirrorTransition,
): void {
  const latest = readMirrorState(ports);
  if (latest.kind !== "ok") return;
  applyTransition(ports, context, latest.snapshot, transition, undefined);
}

// Record the verdict for one Project that did not converge this round.
function markProjectFailure(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  project: string,
  identity: Readonly<{ projectId: string | null; itemId: string | null }>,
  classification: MirrorFailureClass,
): ProjectVerdict {
  const state = classifyProjectFailure(classification);
  applyProjectTransition(ports, context, {
    kind:
      state === "pending" ? "mark-project-pending" : "mark-project-safety-blocked",
    project,
    projectId: identity.projectId,
    itemId: identity.itemId,
    updatedAt: context.now(),
  });
  return { state, classification };
}

// What one Project's reconciliation settled on. A non-synced verdict keeps the
// classification that produced it so the caller can report the real failure.
type ProjectVerdict =
  | { state: Extract<MirrorProjectSyncState, "synced">; classification?: undefined }
  | {
      state: Extract<MirrorProjectSyncState, "pending" | "safety-blocked">;
      classification: MirrorFailureClass;
    };

function findProjectItem(
  view: MirrorProjectItemsView,
  target: MirrorProjectTarget,
) {
  return view.items.find(
    (item) =>
      item.projectNumber === target.project.number &&
      item.projectOwner === target.project.owner,
  );
}

type MembershipResolution =
  | {
      kind: "member";
      itemId: string;
      currentStatus: string | null;
      workflowStatus: string | null;
    }
  | { kind: "failed"; classification: MirrorFailureClass };

// Resolve the Issue's item on this Project, adding it when absent. Only a
// configured target may be joined: a Project the Issue merely already belongs to
// is synced where it sits and never recruited. A freshly added item has no
// Status yet, so its current value is null rather than assumed.
// Exported as an in-process seam: the unconfigured non-member branch below is
// unreachable through syncProjects (reconcileTargets only admits unconfigured
// targets that appear in the items view), so tests drive it directly.
export async function resolveMembership(
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  view: MirrorProjectItemsView,
  field: MirrorProjectStatusField,
  configured: boolean,
): Promise<MembershipResolution> {
  const existing = findProjectItem(view, target);
  if (existing) {
    return {
      kind: "member",
      itemId: existing.itemId,
      currentStatus: existing.currentStatus,
      workflowStatus: existing.workflowStatus ?? null,
    };
  }
  if (!configured) {
    // Unreachable in practice — a Project only enters the loop unconfigured
    // because the Issue is already an item of it — but classified rather than
    // assumed away.
    projectDiagnostic(context, {
      project: canonicalProject(target),
      reason: "add-failed",
      expectedStatus: null,
      availableOptions: [],
      summary:
        "the Issue is not an item of this Project and the Project is not configured, so it is not joined",
    });
    return { kind: "failed", classification: "configuration" };
  }
  const permit = createMirrorProjectMutationPermit({
    event: context.event,
    repository: context.repository,
    mutation: "add-project-item",
    project: target.project,
  });
  const added = await context.gateway.addProjectItem(
    permit,
    field.projectId,
    view.issueNodeId,
  );
  if (added.kind === "failure") {
    projectDiagnostic(context, {
      project: canonicalProject(target),
      reason: "add-failed",
      expectedStatus: null,
      availableOptions: [],
      summary: `could not add the Issue to the Project: ${added.summary}`,
    });
    return { kind: "failed", classification: added.classification };
  }
  return {
    kind: "member",
    itemId: added.value.itemId,
    currentStatus: null,
    workflowStatus: null,
  };
}

function expectedWorkflowStatus(
  snapshot: MirrorSnapshot,
  boundaryKind: MirrorExecutionContext["event"]["boundary"]["kind"],
): string | null {
  if (boundaryKind === "parked" || snapshot.registryStatus === "parked") {
    return null;
  }
  return snapshot.registryStatus === "complete" && snapshot.status === "Completed"
    ? "Done"
    : "In progress";
}

async function syncAuxiliaryWorkflowStatus(
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  field: MirrorProjectStatusField,
  membership: Extract<MembershipResolution, { kind: "member" }>,
  snapshot: MirrorSnapshot,
): Promise<void> {
  const expected = expectedWorkflowStatus(
    snapshot,
    context.event.boundary.kind,
  );
  const workflowField = field.workflowStatusField;
  if (
    expected === null ||
    workflowField === null ||
    workflowField === undefined ||
    membership.workflowStatus === expected
  ) {
    return;
  }
  const option = workflowField.options.find((each) => each.name === expected);
  if (option === undefined) return;
  const permit = createMirrorProjectMutationPermit({
    event: context.event,
    repository: context.repository,
    mutation: "update-project-item-status",
    project: target.project,
  });
  await context.gateway.updateProjectItemStatus(
    permit,
    field.projectId,
    membership.itemId,
    workflowField.fieldId,
    option.id,
  );
}

async function syncOneProject(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  target: MirrorProjectTarget,
  view: MirrorProjectItemsView,
  snapshot: MirrorSnapshot,
  configured: boolean,
): Promise<ProjectVerdict> {
  const project = canonicalProject(target);
  const known = findProjectItem(view, target);
  const identity = {
    projectId: known?.projectId ?? null,
    itemId: known?.itemId ?? null,
  };
  const fail = (classification: MirrorFailureClass): ProjectVerdict =>
    markProjectFailure(ports, context, project, identity, classification);

  const resolved = await context.gateway.resolveProjectStatusField(target.project);
  if (resolved.kind === "failure") {
    projectDiagnostic(context, {
      project,
      reason: "project-unresolved",
      expectedStatus: null,
      availableOptions: [],
      summary: `the Project or its Intent Phase field could not be resolved: ${resolved.summary}`,
    });
    return fail(resolved.classification);
  }
  const field = resolved.value;
  identity.projectId = field.projectId;
  const membership = await resolveMembership(
    context,
    target,
    view,
    field,
    configured,
  );
  if (membership.kind === "failed") return fail(membership.classification);
  identity.itemId = membership.itemId;

  const expected = expectedProjectStatus(
    snapshot,
    context.event.boundary.kind,
    target.statusNames,
  );
  if (expected.kind === "keep") {
    upsertProjectEntry(ports, context, {
      project,
      projectId: field.projectId,
      itemId: membership.itemId,
      lastAppliedStatus: membership.currentStatus,
      state: "synced",
      updatedAt: context.now(),
    });
    return { state: "synced" };
  }

  const option = selectProjectStatusOption(field, expected.name);
  if (option === null) {
    projectDiagnostic(context, {
      project,
      reason: "option-missing",
      expectedStatus: expected.name,
      availableOptions: field.options.map((each) => each.name),
      summary: `the Project has no Intent Phase option named exactly "${expected.name}"`,
    });
    // The board's own vocabulary does not contain the column: retrying the same
    // call cannot change that, so this needs a human, not another attempt.
    return fail("configuration");
  }

  if (membership.currentStatus !== expected.name) {
    const permit = createMirrorProjectMutationPermit({
      event: context.event,
      repository: context.repository,
      mutation: "update-project-item-status",
      project: target.project,
    });
    const updated = await context.gateway.updateProjectItemStatus(
      permit,
      field.projectId,
      membership.itemId,
      field.fieldId,
      option.id,
    );
    if (updated.kind === "failure") {
      projectDiagnostic(context, {
        project,
        reason: "update-failed",
        expectedStatus: expected.name,
        availableOptions: [],
        summary: `could not set the Project Intent Phase: ${updated.summary}`,
      });
      return fail(updated.classification);
    }
  }

  await syncAuxiliaryWorkflowStatus(
    context,
    target,
    field,
    membership,
    snapshot,
  );

  upsertProjectEntry(ports, context, {
    project,
    projectId: field.projectId,
    itemId: membership.itemId,
    lastAppliedStatus: expected.name,
    state: "synced",
    updatedAt: context.now(),
  });
  return { state: "synced" };
}

// The Projects to reconcile this round: everything the Issue already belongs to,
// plus every configured target. A configured target supplies its own status
// vocabulary; a Project known only from membership takes the defaults.
function reconcileTargets(
  configured: readonly MirrorProjectTarget[],
  view: MirrorProjectItemsView,
): Array<Readonly<{ target: MirrorProjectTarget; configured: boolean }>> {
  const out = configured.map((target) => ({ target, configured: true }));
  const seen = new Set(configured.map(canonicalProject));
  for (const item of view.items) {
    const target: MirrorProjectTarget = {
      project: { owner: item.projectOwner, number: item.projectNumber },
      statusNames: {},
    };
    const key = canonicalProject(target);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ target, configured: false });
  }
  return out;
}

// The board-wide verdict. `unsettled` carries the classification of the first
// Project that did not converge, so the operation warning reports a failure that
// actually happened rather than a synthesized one.
export type ProjectReconcileResult =
  | { kind: "converged" }
  | { kind: "unsettled"; classification: MirrorFailureClass; unsettled: number };

// Reconcile every in-scope Project and report whether the board as a whole
// converged. `unsettled` means at least one row is pending or safety-blocked,
// which is what parks the operation receipt.
export async function syncProjects(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  issueNumber: number,
): Promise<ProjectReconcileResult> {
  const config = context.projectSync;
  if (config === undefined || config.targets.length === 0)
    return { kind: "converged" };
  const targets = config.targets;
  const view = await context.gateway.listProjectItems({
    repository: context.repository,
    number: issueNumber,
  });
  if (view.kind === "failure") {
    projectDiagnostic(context, {
      project: targets.map(canonicalProject).join(", "),
      reason: "membership-query-failed",
      expectedStatus: null,
      availableOptions: [],
      summary: `Project membership could not be read: ${view.summary}`,
    });
    persistUnsyncedWarning(
      ports,
      context,
      view.classification,
      `Project status is unsynchronized: ${view.summary}`,
    );
    // Membership is the one read the whole loop depends on, so its failure
    // classifies every configured Project at once.
    for (const target of targets) {
      markProjectFailure(
        ports,
        context,
        canonicalProject(target),
        { projectId: null, itemId: null },
        view.classification,
      );
    }
    return {
      kind: "unsettled",
      classification: view.classification,
      unsettled: targets.length,
    };
  }
  let first: MirrorFailureClass | null = null;
  let unsettled = 0;
  for (const each of reconcileTargets(targets, view.value)) {
    const verdict = await syncOneProject(
      ports,
      context,
      each.target,
      view.value,
      config.snapshot,
      each.configured,
    );
    if (verdict.state === "synced") continue;
    unsettled += 1;
    first = first ?? verdict.classification;
  }
  if (first === null) return { kind: "converged" };
  return { kind: "unsettled", classification: first, unsettled };
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
  const outcome =
    input.context.operation === "create"
      ? await executeCreate(input)
      : await executeLinked(input);
  // Single hook point for every completion path (fresh create, adopted create,
  // edit, and the already-converged reconciliations): the Project step runs only
  // after the Issue body itself landed, and never for `close`.
  if (outcome.kind === "completed" && input.context.operation !== "close") {
    const projects = await syncProjects(
      input.ports,
      input.context,
      outcome.issueNumber,
    );
    if (projects.kind === "unsettled") {
      return holdForProjectSync(input, outcome, projects);
    }
  }
  return outcome;
}

// Park the completed operation at `pending` so the next boundary retries it.
// The completion itself already landed in state, so the Issue link is safe; if
// the hold cannot be written the operation simply stays `completed` and the next
// boundary's fresh receipts reconcile the board anyway.
function holdForProjectSync(
  input: ExecuteMirrorOperationInput,
  outcome: Extract<MirrorOperationOutcome, { kind: "completed" }>,
  projects: Extract<ProjectReconcileResult, { kind: "unsettled" }>,
): MirrorOperationOutcome {
  const { context, ports } = input;
  const latest = readMirrorState(ports);
  if (latest.kind !== "ok") return outcome;
  const receipt = requireReceipt(latest.snapshot, context);
  if (receipt === null || receipt.status !== "succeeded") return outcome;
  const heldAt = context.now();
  const result = applyTransition(
    ports,
    context,
    latest.snapshot,
    {
      kind: "hold-for-project-sync",
      event: context.event,
      operationId: receipt.operationId,
      heldAt,
    },
    receipt.operationId,
  );
  if (result.kind !== "ok") return outcome;
  return {
    kind: "pending",
    operation: context.operation,
    warning: warning(
      context,
      receipt.operationId,
      projects.classification,
      `the Issue is up to date but ${projects.unsettled} Project board(s) are unsynchronized; the next boundary reconciles them`,
      true,
      "outcome-unknown",
    ),
  };
}
