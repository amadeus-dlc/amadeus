// amadeus-mirror-coordinator.ts — C7 boundary coordinator.
//
// The coordinator is intentionally not an engine router. It resolves one
// boundary, composes C1/C2/C3/C6/C8, and always returns a non-blocking envelope.

import {
  type MirrorConfigOutcome,
  resolveMirrorConfig,
} from "./amadeus-mirror-config.ts";
import {
  executeMirrorOperation,
  type ExecuteMirrorOperationInput,
} from "./amadeus-mirror-executor.ts";
import {
  approveMirrorPrompt,
  completionProjectGate,
  decideMirrorAction,
  expectedProjectStatus,
  mirrorEventKey,
  mirrorEventIdentity,
  nextCompletionOperation,
} from "./amadeus-mirror-policy.ts";
import {
  renderMirrorIssueContent,
  renderMirrorPrompt,
} from "./amadeus-mirror-presentation.ts";
import { mirrorProjectKey } from "./amadeus-mirror-project-contract.ts";
import {
  consumeStaleCloseApproval,
  currentFinalSyncEvidenceKey,
  prepareCompletionProjectVerification,
  selectCompletionSyncReconciliation,
  type ProjectVerificationScope,
} from "./amadeus-mirror-project-verification.ts";
import { renderMirrorMarker } from "./amadeus-mirror-provenance.ts";
import type { MirrorTransition } from "./amadeus-mirror-state-reducer.ts";
import {
  type MirrorReadOutcome,
  type MirrorStateStorePorts,
  mutateMirrorStateAtomic,
  readMirrorState,
} from "./amadeus-mirror-state-store.ts";
import type {
  MirrorBoundary,
  MirrorDecision,
  MirrorEventIdentity,
  MirrorGitHubGateway,
  MirrorExecutionAuthorization,
  MirrorMode,
  MirrorOperation,
  MirrorOperationOutcome,
  MirrorProjectDiagnostic,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
  MirrorWarning,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";

export type MirrorBoundaryContext = Readonly<{
  projectDir: string;
  space?: string;
  statePath: string;
  intentUuid: string;
  intentDir: string;
  repository: RepositoryIdentity;
  boundary: MirrorBoundary;
  snapshot: MirrorSnapshot;
}>;

export type MirrorBoundaryOutcome =
  | {
      kind: "none";
      workflowMayAdvance: true;
    }
  | {
      kind: "ask";
      question: string;
      bindingId: string;
      event: MirrorEventIdentity;
      operation: MirrorOperation;
      workflowMayAdvance: true;
    }
  | {
      kind: "continued";
      outcomes: readonly MirrorOperationOutcome[];
      workflowMayAdvance: true;
    };

export type MirrorPromptAnswer = Readonly<{
  choice: "approve" | "skip";
  bindingId: string;
  answerId: string;
  event: MirrorEventIdentity;
  operation: MirrorOperation;
}>;

export type MirrorCoordinatorDependencies = Readonly<{
  resolveConfig?: (
    projectDir: string,
    intentDir: string,
    space?: string,
  ) => MirrorConfigOutcome;
  readState?: (ports: MirrorStateStorePorts) => MirrorReadOutcome;
  execute?: (
    input: ExecuteMirrorOperationInput,
  ) => Promise<MirrorOperationOutcome>;
}>;

export type DriveMirrorBoundaryInput = Readonly<{
  context: MirrorBoundaryContext;
  ports: MirrorStateStorePorts;
  gateway: MirrorGitHubGateway;
  now: () => string;
  newOperationId: () => string;
  manualOperation?: MirrorOperation;
  invocationId?: string;
  answer?: MirrorPromptAnswer;
  // Optional observation sink for Project skips. Absent means the diagnostics
  // are simply not surfaced; they never alter an outcome.
  projectDiagnostic?: (diagnostic: MirrorProjectDiagnostic) => void;
  dependencies?: MirrorCoordinatorDependencies;
}>;

export type ReconciliationSelection = Readonly<{
  receiptKey: string;
  originalEvent: MirrorEventIdentity;
  operationId: string;
  expectedRevision: number;
}>;

export function selectMirrorReconciliation(input: {
  snapshot: MirrorStateSnapshot;
  snapshotRevision: number;
}): ReconciliationSelection | null {
  const receipt = Object.values(input.snapshot.receipts)
    .filter(
      (candidate) =>
        candidate.status === "prepared" ||
        candidate.status === "attempted" ||
        candidate.status === "pending",
    )
    .sort(
      (left, right) =>
        left.preparedAt.localeCompare(right.preparedAt) ||
        left.key.localeCompare(right.key),
    )[0];
  return receipt
    ? {
        receiptKey: receipt.key,
        originalEvent: receipt.event,
        operationId: receipt.operationId,
        expectedRevision: input.snapshotRevision,
      }
    : null;
}

export function selectNextCompletion(input: {
  snapshot: MirrorStateSnapshot;
  snapshotRevision: number;
  intentUuid: string;
  completionBoundary: Extract<MirrorBoundary, { kind: "workflow-completed" }>;
}): { operation: MirrorOperation; expectedRevision: number } | null {
  const operation = nextCompletionOperation({
    intentUuid: input.intentUuid,
    boundary: input.completionBoundary,
    state: input.snapshot,
  });
  return operation === null
    ? null
    : { operation, expectedRevision: input.snapshotRevision };
}

function continued(
  outcomes: readonly MirrorOperationOutcome[],
): MirrorBoundaryOutcome {
  return { kind: "continued", outcomes, workflowMayAdvance: true };
}

function globalWarning(
  now: string,
  classification: "configuration" | "state-parse",
  summary: string,
): MirrorWarning {
  return {
    operationId: null,
    operation: null,
    classification,
    summary,
    occurredAt: now,
    retryable: classification === "configuration",
    effect: "not-started",
    source: "current-invocation",
  };
}

function persistAuxiliary(
  input: DriveMirrorBoundaryInput,
  snapshot: MirrorStateSnapshot,
  triggerEvent: MirrorEventIdentity,
  transition: MirrorTransition,
  classification?: "configuration" | "state-parse",
): MirrorStateSnapshot {
  const result = mutateMirrorStateAtomic(input.ports, {
    transition,
    expectedRevision: snapshot.revision,
    auditContext: {
      triggerEvent,
      reconciliation: false,
      ...(classification === undefined ? {} : { classification }),
    },
    now: input.now(),
    intentUuid: input.context.intentUuid,
  });
  return result.kind === "written" || result.kind === "unchanged"
    ? result.value
    : snapshot;
}

function configIssueSummary(outcome: Extract<MirrorConfigOutcome, { kind: "invalid" }>) {
  return outcome.issues
    .map((issue) =>
      issue.kind === "read-failure"
        ? `${issue.layer}: ${issue.summary}`
        : `${issue.layer}: expected ${issue.expected}, got ${issue.actualType}`,
    )
    .join("; ");
}

function operationForBoundary(
  context: MirrorBoundaryContext,
  state: MirrorStateSnapshot,
): MirrorOperation | null {
  if (context.boundary.kind === "manual") return null;
  if (context.boundary.kind === "intent-capture-approved") return "create";
  if (context.boundary.kind === "workflow-completed") {
    return nextCompletionOperation({
      intentUuid: context.intentUuid,
      boundary: context.boundary,
      state,
    });
  }
  return state.issueNumber === null ? "create" : "sync";
}

function markerFor(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  event: MirrorEventIdentity,
  operationId: string,
  preparedAt: string,
): string {
  const identity =
    state.provenance?.createIdentity ??
    state.receipts[mirrorEventKey(event)]?.createIdentity ?? {
      schema: 1 as const,
      intentUuid: input.context.intentUuid,
      intentDir: input.context.intentDir,
      repository: input.context.repository,
      operationId,
      preparedAt,
    };
  return renderMirrorMarker(identity);
}

function landingEvidence(context: MirrorBoundaryContext) {
  return context.snapshot.registryStatus === "complete" &&
    context.snapshot.status === "Completed"
    ? {
        registryStatus: "complete" as const,
        workflowStatus: "Completed" as const,
      }
    : undefined;
}

function executionAuthorization(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  event: MirrorEventIdentity,
  operation: MirrorOperation,
  projects: readonly MirrorProjectTarget[],
  promptAnswer?: MirrorPromptAnswer,
): MirrorExecutionAuthorization {
  const existing = state.receipts[mirrorEventKey(event)]?.authorization;
  if (existing) return existing;
  const finalSyncKey =
    operation === "close"
      ? currentFinalSyncEvidenceKey({
          state,
          event,
          snapshot: input.context.snapshot,
          projects,
        })
      : undefined;
  const base = {
    event,
    operation,
    boundaryInstance: event.boundary.instance,
    receiptRevision: state.revision + 1,
    ...(landingEvidence(input.context)
      ? { landing: landingEvidence(input.context) }
      : {}),
    ...(finalSyncKey ? { finalSyncReceiptKey: finalSyncKey } : {}),
  };
  if (promptAnswer) {
    const expected = state.expectedPrompt;
    if (!expected) {
      throw new Error("prompt approval has no durable expected binding");
    }
    return {
      ...base,
      kind: "prompt-approved",
      expectedBindingId: promptAnswer.bindingId,
      answerId: promptAnswer.answerId,
    };
  }
  if (event.boundary.kind === "manual") {
    if (!input.invocationId) {
      throw new Error("manual execution requires an invocationId");
    }
    return {
      ...base,
      kind: "manual",
      invocationId: input.invocationId,
    };
  }
  return { ...base, kind: "auto", resolvedMode: "auto" };
}

async function executeDecision(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  triggerEvent: MirrorEventIdentity,
  event: MirrorEventIdentity,
  operation: MirrorOperation,
  projects: readonly MirrorProjectTarget[],
  promptAnswer?: MirrorPromptAnswer,
): Promise<MirrorOperationOutcome> {
  const operationId =
    state.receipts[mirrorEventKey(event)]?.operationId ??
    input.newOperationId();
  const operationNow = input.now();
  const marker = markerFor(
    input,
    state,
    event,
    operationId,
    operationNow,
  );
  const issueContent = renderMirrorIssueContent({
    snapshot: input.context.snapshot,
    marker,
  });
  const execute = input.dependencies?.execute ?? executeMirrorOperation;
  const authorization = executionAuthorization(
    input,
    state,
    event,
    operation,
    projects,
    promptAnswer,
  );
  return execute({
    context: {
      statePath: input.context.statePath,
      intentUuid: input.context.intentUuid,
      intentDir: input.context.intentDir,
      repository: input.context.repository,
      triggerEvent,
      event,
      operation,
      issueContent,
      expectedMirrorRevision: state.revision,
      now: () => operationNow,
      newOperationId: () => operationId,
      gateway: input.gateway,
      authorization,
      // The coordinator owns both halves the Project step needs: the resolved
      // configuration and the workflow snapshot the Issue body was rendered from.
      projectSync: {
        targets: projects,
        snapshot: input.context.snapshot,
        ...(input.projectDiagnostic
          ? { diagnostic: input.projectDiagnostic }
          : {}),
      },
    },
    ports: input.ports,
    localState: state,
  });
}

function skippedOutcome(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  answer: MirrorPromptAnswer,
): MirrorOperationOutcome {
  // Reuse the reconciled receipt's operationId so skip-for-event's identity
  // check accepts the transition; a fresh (non-reconcile) skip has no receipt
  // and mints a new id.
  const operationId =
    state.receipts[mirrorEventKey(answer.event)]?.operationId ??
    input.newOperationId();
  const result = mutateMirrorStateAtomic(input.ports, {
    transition: {
      kind: "skip-for-event",
      event: answer.event,
      operationId,
      preparedAt: input.now(),
      completedAt: input.now(),
      consumeExpectedPrompt: true,
      expectedBindingId: answer.bindingId,
      answerId: answer.answerId,
    },
    expectedRevision: state.revision,
    auditContext: {
      triggerEvent: answer.event,
      operationEvent: answer.event,
      operationId,
      reconciliation: false,
    },
    now: input.now(),
    intentUuid: input.context.intentUuid,
  });
  if (result.kind === "written" || result.kind === "unchanged") {
    return { kind: "skipped", operation: answer.operation };
  }
  return {
    kind: "safety-blocked",
    operation: answer.operation,
    warning: {
      operationId,
      operation: answer.operation,
      classification: "state-write",
      summary:
        result.kind === "invalid"
          ? result.issues.join("; ")
          : result.kind === "io-failure"
            ? result.summary
            : "state compare-and-set conflict",
      occurredAt: input.now(),
      retryable: false,
      effect: "not-started",
      source: "current-invocation",
    },
  };
}

function initializeBoundary(
  input: DriveMirrorBoundaryInput,
):
  | { kind: "outcome"; outcome: MirrorBoundaryOutcome }
  | {
      kind: "ready";
      state: MirrorStateSnapshot;
      mode: MirrorMode;
      projects: readonly MirrorProjectTarget[];
      fallbackEvent: MirrorEventIdentity;
    } {
  const resolve = input.dependencies?.resolveConfig ?? resolveMirrorConfig;
  const read = input.dependencies?.readState ?? readMirrorState;
  const config = resolve(
    input.context.projectDir,
    input.context.intentDir,
    input.context.space,
  );
  const fallbackEvent = mirrorEventIdentity(
    input.context.intentUuid,
    input.context.boundary,
    "create",
  );
  if (config.kind === "invalid") {
    const state = read(input.ports);
    const configWarning = globalWarning(
      input.now(),
      "configuration",
      configIssueSummary(config),
    );
    if (state.kind === "ok") {
      persistAuxiliary(
        input,
        state.snapshot,
        fallbackEvent,
        { kind: "set-global-warning", warning: configWarning },
        "configuration",
      );
    }
    return {
      kind: "outcome",
      outcome: continued([
        {
          kind: "suppressed",
          operation: null,
          reason: "configuration",
          warning: configWarning,
        },
      ]),
    };
  }

  const stateResult = read(input.ports);
  if (stateResult.kind !== "ok") {
    const stateWarning = globalWarning(
      input.now(),
      "state-parse",
      stateResult.kind === "invalid"
        ? `Mirror state is invalid: ${stateResult.issues.join("; ")}`
        : stateResult.summary,
    );
    return {
      kind: "outcome",
      outcome: continued([
        {
          kind: "safety-blocked",
          operation: "create",
          warning: {
            ...stateWarning,
            operationId: input.newOperationId(),
            operation: "create",
          },
        },
      ]),
    };
  }
  const state = persistAuxiliary(
    input,
    stateResult.snapshot,
    fallbackEvent,
    { kind: "clear-global-warning" },
  );
  return {
    kind: "ready",
    state,
    mode: config.config.autoMirror,
    projects: config.config.projects,
    fallbackEvent,
  };
}

async function handlePromptAnswer(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  answer: MirrorPromptAnswer,
  projects: readonly MirrorProjectTarget[],
): Promise<MirrorBoundaryOutcome> {
  const expected = state.expectedPrompt;
  if (!expected) {
    return continued([
      {
        kind: "suppressed",
        operation: answer.operation,
        reason: "not-applicable",
      },
    ]);
  }
  const approved = approveMirrorPrompt({ expected, answer, state });
  if (approved.kind !== "execute") {
    return continued([
      {
        kind: "suppressed",
        operation: answer.operation,
        reason: "not-applicable",
      },
    ]);
  }
  if (answer.choice === "skip") {
    return continued([
      skippedOutcome(input, state, {
        ...answer,
        event: approved.event,
        operation: approved.operation,
      }),
    ]);
  }
  const triggerEvent = mirrorEventIdentity(
    input.context.intentUuid,
    input.context.boundary,
    approved.operation,
  );
  const outcome = await executeDecision(
    input,
    state,
    triggerEvent,
    approved.event,
    approved.operation,
    projects,
    answer,
  );
  consumeAnsweredPrompt(input, approved.event, approved.operation);
  return continued([outcome]);
}

// Consume the durable binding for an approved prompt when the execution path
// did not already do so. The prompt-approved prepare path consumes a fresh
// receipt's binding, but a reconciled receipt keeps its original authorization
// (e.g. manual) and never re-prepares, so the binding must be released here or
// it stays and blocks every later boundary. Reads the post-execution state and
// only consumes a still-matching binding, so the already-consumed fresh path is
// a no-op.
function consumeAnsweredPrompt(
  input: DriveMirrorBoundaryInput,
  event: MirrorEventIdentity,
  operation: MirrorOperation,
): void {
  const read = input.dependencies?.readState ?? readMirrorState;
  const latest = read(input.ports);
  if (latest.kind !== "ok") return;
  const expected = latest.snapshot.expectedPrompt;
  if (
    !expected ||
    mirrorEventKey(expected.event) !== mirrorEventKey(event) ||
    expected.operation !== operation
  ) {
    return;
  }
  mutateMirrorStateAtomic(input.ports, {
    transition: { kind: "consume-expected-prompt", event, operation },
    expectedRevision: latest.snapshot.revision,
    auditContext: { triggerEvent: event, reconciliation: false },
    now: input.now(),
    intentUuid: input.context.intentUuid,
  });
}

function selectBoundaryDecision(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  mode: MirrorMode,
): {
  operation: MirrorOperation | null;
  triggerEvent?: MirrorEventIdentity;
  decision?: ReturnType<typeof decideMirrorAction>;
} {
  const reconciliation = selectCompletionSyncReconciliation({
    state,
    intentUuid: input.context.intentUuid,
    boundary: input.context.boundary,
    operation: input.manualOperation,
    fallback: selectMirrorReconciliation({
      snapshot: state,
      snapshotRevision: state.revision,
    }),
  });
  const operation =
    reconciliation?.originalEvent.operation ??
    (input.context.boundary.kind === "manual"
      ? input.manualOperation ?? null
      : operationForBoundary(input.context, state));
  if (operation === null) return { operation };
  const triggerEvent = mirrorEventIdentity(
    input.context.intentUuid,
    input.context.boundary,
    operation,
  );
  const event = reconciliation?.originalEvent ?? triggerEvent;
  const decision =
    input.context.boundary.kind === "manual"
      ? decideMirrorAction({
          kind: "manual",
          event: event as MirrorEventIdentity & {
            boundary: Extract<MirrorBoundary, { kind: "manual" }>;
          },
          state,
        })
      : decideMirrorAction({ kind: "lifecycle", mode, event, state });
  return { operation, triggerEvent, decision };
}

// Withhold `close` until every Project row reached the `done` column. This is a
// hold, not a failure: no receipt is written, so the next completion boundary or
// manual sync re-runs the reconciliation and re-evaluates the gate. The warning
// carries the blocking rows so a completion that stops short says why.
function closeGateHold(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  projects: readonly MirrorProjectTarget[],
): MirrorOperationOutcome | null {
  const gate = completionProjectGate({
    state,
    snapshot: input.context.snapshot,
    targets: projects,
  });
  if (gate.ready) return null;
  return {
    kind: "pending",
    operation: "close",
    warning: {
      operationId: null,
      operation: "close",
      classification: "landing",
      summary: `the Issue stays open until every Project board reaches its done column: ${gate.blocking.join("; ")}`,
      occurredAt: input.now(),
      retryable: true,
      effect: "not-started",
      source: "current-invocation",
    },
  };
}

// The Project face of the operation the prompt is about, derived without a
// single board query: the configured targets unioned with the boards the ledger
// already knows the Issue belongs to, and the column those boards would receive.
function promptProjects(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  projects: readonly MirrorProjectTarget[],
  operation: MirrorOperation,
) {
  if (operation === "close" || projects.length === 0) return undefined;
  const known = new Set(projects.map(
    (target) => mirrorProjectKey(target.project),
  ));
  for (const entry of state.projectSync?.projects ?? []) {
    known.add(mirrorProjectKey(entry.project));
  }
  const names = new Set<string>();
  for (const target of projects) {
    const expected = expectedProjectStatus(
      input.context.snapshot,
      input.context.boundary.kind,
      target.statusNames,
    );
    if (expected.kind === "status") names.add(expected.name);
  }
  return { count: known.size, statusNames: [...names].sort() };
}

function expectedPromptWasPersisted(
  state: MirrorStateSnapshot,
  operation: MirrorOperation,
): boolean {
  return state.expectedPrompt?.operation === operation;
}

function projectVerificationScope(
  input: DriveMirrorBoundaryInput,
  projects: readonly MirrorProjectTarget[],
): ProjectVerificationScope {
  return {
    intentUuid: input.context.intentUuid,
    boundary: input.context.boundary,
    operation: input.manualOperation ?? input.answer?.operation,
    snapshot: input.context.snapshot,
    projects,
    ports: input.ports,
    now: input.now,
  };
}

// Persist the durable binding for one prompted operation and turn it into the
// question the human answers. A binding that cannot be persisted is reported as
// a blocked operation rather than an ask nobody could approve.
// Module-scope alias: the runtime-erased type lines would otherwise be stamped
// DA:0 by Bun inside the function body region.
type PendingPromptStep = Readonly<{
  decision: Extract<MirrorDecision, { kind: "prompt" }>;
  triggerEvent: MirrorEventIdentity;
  preceding: readonly MirrorOperationOutcome[];
}>;

function askOutcome(
  input: DriveMirrorBoundaryInput,
  snapshot: MirrorStateSnapshot,
  projects: readonly MirrorProjectTarget[],
  pending: PendingPromptStep,
): MirrorBoundaryOutcome {
  const { decision, triggerEvent, preceding } = pending;
  const prompt = {
    bindingId: input.newOperationId(),
    event: decision.event,
    operation: decision.operation,
    issuedAt: input.now(),
    ...(decision.retryOf === undefined ? {} : { retryOf: decision.retryOf }),
  };
  const state = persistAuxiliary(input, snapshot, triggerEvent, {
    kind: "set-expected-prompt",
    prompt,
  });
  if (!expectedPromptWasPersisted(state, decision.operation)) {
    return continued([
      ...preceding,
      {
        kind: "safety-blocked",
        operation: decision.operation,
        warning: {
          operationId: input.newOperationId(),
          operation: decision.operation,
          classification: "state-write",
          summary: "expected prompt could not be persisted",
          occurredAt: input.now(),
          retryable: false,
          effect: "not-started",
          source: "current-invocation",
        },
      },
    ]);
  }
  const askProjects = promptProjects(input, state, projects, decision.operation);
  return {
    kind: "ask",
    question: renderMirrorPrompt({
      operation: decision.operation,
      event: decision.event,
      intentDir: input.context.intentDir,
      repository: input.context.repository.canonical,
      issueNumber: state.issueNumber,
      ...(askProjects === undefined ? {} : { projects: askProjects }),
    }),
    bindingId: prompt.bindingId,
    event: decision.event,
    operation: decision.operation,
    workflowMayAdvance: true,
  };
}

// One turn of the boundary loop before anything is executed: what the policy
// selected, and every answer that is already final without touching GitHub —
// nothing left to do, a suppression, a withheld close, or a question to ask.
type BoundaryStep =
  | { kind: "settled"; outcome: MirrorBoundaryOutcome }
  | {
      kind: "execute";
      triggerEvent: MirrorEventIdentity;
      decision: Extract<MirrorDecision, { kind: "execute" }>;
    };

function resolveBoundaryStep(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  mode: MirrorMode,
  projects: readonly MirrorProjectTarget[],
  outcomes: readonly MirrorOperationOutcome[],
): BoundaryStep {
  const settled = (outcome: MirrorBoundaryOutcome): BoundaryStep => ({
    kind: "settled",
    outcome,
  });
  const selected = selectBoundaryDecision(input, state, mode);
  const { operation, triggerEvent, decision } = selected;
  if (operation === null || !triggerEvent || !decision) {
    return settled(
      outcomes.length === 0
        ? { kind: "none", workflowMayAdvance: true }
        : continued(outcomes),
    );
  }
  if (decision.kind === "suppress") {
    return settled(
      continued([
        ...outcomes,
        {
          kind: "suppressed",
          operation,
          reason: decision.reason === "off" ? "off" : "not-applicable",
        },
      ]),
    );
  }
  if (decision.operation === "close") {
    const held = closeGateHold(input, state, projects);
    if (held) return settled(continued([...outcomes, held]));
  }
  return decision.kind === "prompt"
    ? settled(
        askOutcome(input, state, projects, {
          decision,
          triggerEvent,
          preceding: outcomes,
        }),
      )
    : { kind: "execute", triggerEvent, decision };
}

// Drive the boundary until it settles. Only a workflow completion takes more
// than one turn: it advances create -> sync -> close one operation at a time,
// re-reading state between them.
async function driveBoundaryDecisions(
  input: DriveMirrorBoundaryInput,
  initialState: MirrorStateSnapshot,
  mode: MirrorMode,
  projects: readonly MirrorProjectTarget[],
): Promise<MirrorBoundaryOutcome> {
  let state = initialState;
  const read = input.dependencies?.readState ?? readMirrorState;
  const outcomes: MirrorOperationOutcome[] = [];
  const verificationScope = projectVerificationScope(input, projects);
  for (let count = 0; count < 3; count += 1) {
    const verification = prepareCompletionProjectVerification(
      verificationScope,
      state,
    );
    if (verification.kind === "blocked") {
      return continued([...outcomes, verification.outcome]);
    }
    state = verification.state;
    const step = resolveBoundaryStep(input, state, mode, projects, outcomes);
    if (step.kind === "settled") return step.outcome;
    const outcome = await executeDecision(
      input,
      state,
      step.triggerEvent,
      step.decision.event,
      step.decision.operation,
      projects,
    );
    outcomes.push(outcome);
    const continuesCompletionSequence =
      input.context.boundary.kind === "workflow-completed" ||
      (input.context.boundary.kind === "manual" &&
        input.manualOperation === "close" &&
        step.decision.operation !== "close");
    if (outcome.kind !== "completed" || !continuesCompletionSequence) {
      return continued(outcomes);
    }
    const latest = read(input.ports);
    if (latest.kind !== "ok") return continued(outcomes);
    state = latest.snapshot;
  }
  return continued(outcomes);
}

export async function driveMirrorBoundary(
  input: DriveMirrorBoundaryInput,
): Promise<MirrorBoundaryOutcome> {
  const initialized = initializeBoundary(input);
  if (initialized.kind === "outcome") return initialized.outcome;
  if (
    initialized.mode === "off" &&
    input.context.boundary.kind !== "manual"
  ) {
    return continued([
      { kind: "suppressed", operation: null, reason: "off" },
    ]);
  }
  if (input.answer) {
    const verificationScope = projectVerificationScope(
      input,
      initialized.projects,
    );
    const verification = prepareCompletionProjectVerification(
      verificationScope,
      initialized.state,
    );
    if (verification.kind === "blocked") {
      return continued([verification.outcome]);
    }
    const expected = verification.state.expectedPrompt;
    const approved =
      expected === undefined
        ? null
        : approveMirrorPrompt({
            expected,
            answer: input.answer,
            state: verification.state,
          });
    if (
      input.answer.choice === "approve" &&
      input.answer.operation === "close" &&
      approved?.kind === "execute" &&
      verification.verificationRequired
    ) {
      const consumed = consumeStaleCloseApproval(
        verificationScope,
        verification.state,
        input.answer,
      );
      if (consumed.kind === "blocked") {
        return continued([consumed.outcome]);
      }
      return driveBoundaryDecisions(
        input,
        consumed.state,
        initialized.mode,
        initialized.projects,
      );
    }
    return handlePromptAnswer(
      input,
      verification.state,
      input.answer,
      initialized.projects,
    );
  }
  return driveBoundaryDecisions(
    input,
    initialized.state,
    initialized.mode,
    initialized.projects,
  );
}
