// amadeus-mirror-executor.ts — C6 guarded Mirror operation executor.
//
// This is the only module allowed to mint mutation permits. It composes the
// state store, provenance verifier, and GitHub Gateway without reimplementing
// their codecs or transports.

import { createMirrorMutationPermit } from "./amadeus-mirror-capability.ts";
import { mirrorEventKey } from "./amadeus-mirror-policy.ts";
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
  let receipt = requireReceipt(snapshot, context);
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

async function viewLinkedIssue(
  ports: MirrorStateStorePorts,
  context: MirrorExecutionContext,
  snapshot: MirrorStateSnapshot,
  receipt: MirrorOperationReceipt | null,
  issueNumber: number,
): Promise<
  | {
      kind: "viewed";
      issue: RemoteMirrorIssue;
      snapshot: MirrorStateSnapshot;
      receipt: MirrorOperationReceipt | null;
    }
  | { kind: "outcome"; outcome: MirrorOperationOutcome }
> {
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
  return {
    kind: "outcome",
    outcome:
      persisted.kind === "failed"
        ? stateFailure(
            context,
            ensured.receipt.operationId,
            persisted.summary,
          )
        : { kind: "pending", operation: context.operation, warning: viewWarning },
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
  return input.context.operation === "create"
    ? executeCreate(input)
    : executeLinked(input);
}
