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
  decideMirrorAction,
  mirrorEventKey,
  mirrorEventIdentity,
  nextCompletionOperation,
} from "./amadeus-mirror-policy.ts";
import {
  renderMirrorIssueContent,
  renderMirrorPrompt,
} from "./amadeus-mirror-presentation.ts";
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
  MirrorEventIdentity,
  MirrorGitHubGateway,
  MirrorExecutionAuthorization,
  MirrorMode,
  MirrorOperation,
  MirrorOperationOutcome,
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

function finalSyncReceiptKey(
  state: MirrorStateSnapshot,
): string | undefined {
  return Object.entries(state.receipts).find(
    ([, receipt]) =>
      receipt.event.boundary.kind === "workflow-completed" &&
      receipt.event.operation === "sync" &&
      receipt.status === "succeeded",
  )?.[0];
}

function executionAuthorization(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  event: MirrorEventIdentity,
  operation: MirrorOperation,
  promptAnswer?: MirrorPromptAnswer,
): MirrorExecutionAuthorization {
  const existing = state.receipts[mirrorEventKey(event)]?.authorization;
  if (existing) return existing;
  const base = {
    event,
    operation,
    boundaryInstance: event.boundary.instance,
    receiptRevision: state.revision + 1,
    ...(landingEvidence(input.context)
      ? { landing: landingEvidence(input.context) }
      : {}),
    ...(operation === "close" && finalSyncReceiptKey(state)
      ? { finalSyncReceiptKey: finalSyncReceiptKey(state) }
      : {}),
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
  const operationId = input.newOperationId();
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
    fallbackEvent,
  };
}

async function handlePromptAnswer(
  input: DriveMirrorBoundaryInput,
  state: MirrorStateSnapshot,
  answer: MirrorPromptAnswer,
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
  return continued([
    await executeDecision(
      input,
      state,
      triggerEvent,
      approved.event,
      approved.operation,
      answer,
    ),
  ]);
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
  const reconciliation = selectMirrorReconciliation({
    snapshot: state,
    snapshotRevision: state.revision,
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

function expectedPromptWasPersisted(
  state: MirrorStateSnapshot,
  operation: MirrorOperation,
): boolean {
  return state.expectedPrompt?.operation === operation;
}

async function driveBoundaryDecisions(
  input: DriveMirrorBoundaryInput,
  initialState: MirrorStateSnapshot,
  mode: MirrorMode,
): Promise<MirrorBoundaryOutcome> {
  let state = initialState;
  const read = input.dependencies?.readState ?? readMirrorState;
  const outcomes: MirrorOperationOutcome[] = [];
  for (let count = 0; count < 3; count += 1) {
    const selected = selectBoundaryDecision(input, state, mode);
    if (
      selected.operation === null ||
      !selected.triggerEvent ||
      !selected.decision
    ) {
      return outcomes.length === 0
        ? { kind: "none", workflowMayAdvance: true }
        : continued(outcomes);
    }
    const { operation, triggerEvent, decision } = selected;
    if (decision.kind === "suppress") {
      outcomes.push({
        kind: "suppressed",
        operation,
        reason: decision.reason === "off" ? "off" : "not-applicable",
      });
      return continued(outcomes);
    }
    if (decision.kind === "prompt") {
      const prompt = {
        bindingId: input.newOperationId(),
        event: decision.event,
        operation: decision.operation,
        issuedAt: input.now(),
        ...(decision.retryOf === undefined ? {} : { retryOf: decision.retryOf }),
      };
      state = persistAuxiliary(input, state, triggerEvent, {
        kind: "set-expected-prompt",
        prompt,
      });
      if (!expectedPromptWasPersisted(state, decision.operation)) {
        return continued([
          ...outcomes,
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
      return {
        kind: "ask",
        question: renderMirrorPrompt({
          operation: decision.operation,
          event: decision.event,
          intentDir: input.context.intentDir,
          repository: input.context.repository.canonical,
          issueNumber: state.issueNumber,
        }),
        bindingId: prompt.bindingId,
        event: decision.event,
        operation: decision.operation,
        workflowMayAdvance: true,
      };
    }
    const outcome = await executeDecision(
      input,
      state,
      triggerEvent,
      decision.event,
      decision.operation,
    );
    outcomes.push(outcome);
    if (
      outcome.kind !== "completed" ||
      input.context.boundary.kind !== "workflow-completed"
    ) {
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
    return handlePromptAnswer(input, initialized.state, input.answer);
  }
  return driveBoundaryDecisions(input, initialized.state, initialized.mode);
}
