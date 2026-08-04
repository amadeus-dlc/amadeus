// Durable coordinator and audit projection for Intent-scoped autonomy (#2067).

import type { LoopMonitorCoordinator } from "./amadeus-loop-monitor-runtime.ts";
import type { LoopMonitorPartition } from "./amadeus-loop-monitor.ts";
import {
  assertLegalAutonomyProjection,
  authorizeDecisionEffect,
  authorizeInteraction,
  autonomyDigest,
  autonomyStableId,
  createGateAutoDecision,
  createGrantExerciseReservation,
  parseWorkflowResult,
  planHumanAutonomyCommand,
  projectGrantReference,
  resolveAutoDecision,
  revalidateGrantExerciseReservation,
  validateResumeCondition,
  type AutoDecisionRecord,
  type AutonomyProjection,
  type DecisionCapabilityPort,
  type DecisionFact,
  type DecisionOptionEffect,
  type DecisionOptionEffectRegistry,
  type GrantExerciseReservation,
  type HumanAutonomyCommand,
  type HumanCommandContext,
  type IntentGrant,
  type InteractionOccurrence,
  type InvocationFailureRecord,
  type ParkEnvelope,
  type ResumeCondition,
  type StopReason,
  type WorkflowResult,
} from "./amadeus-intent-autonomy.ts";
import {
  resolveQualityPluginActivation,
  type NormalizedQualityContribution,
  type QualityPluginActivation,
  type QualityPluginProjection,
} from "./amadeus-quality-repair.ts";

export type AutonomyRuntimeEvent =
  | {
      readonly type: "AUTONOMY_MODE_CHANGED";
      readonly beforeMode: AutonomyProjection["mode"];
      readonly afterMode: AutonomyProjection["mode"];
      readonly principalId: string;
      readonly humanTurnId: string;
    }
  | { readonly type: "INTENT_GRANT_ISSUED"; readonly grant: IntentGrant }
  | { readonly type: "INTENT_GRANT_REVOKED"; readonly grant: IntentGrant }
  | { readonly type: "INTENT_GRANT_COMPLETED"; readonly grant: IntentGrant }
  | { readonly type: "WORKFLOW_EXECUTION_COMPLETED" }
  | { readonly type: "INTENT_GRANT_EXERCISE_RESERVED"; readonly reservation: GrantExerciseReservation }
  | {
      readonly type: "INTENT_GRANT_EXERCISED";
      readonly reservationId: string;
      readonly grantId: string;
      readonly candidateId: string;
    }
  | {
      readonly type: "INTENT_GRANT_EXERCISE_ABORTED";
      readonly reservationId: string;
      readonly reason: string;
    }
  | { readonly type: "AUTO_DECIDED"; readonly decision: AutoDecisionRecord }
  | {
      readonly type: "WORKFLOW_EFFECT_APPLIED";
      readonly effectId: string;
      readonly optionId: string;
      readonly payloadFingerprint: string;
    }
  | { readonly type: "WORKFLOW_PARKED"; readonly envelope: ParkEnvelope }
  | {
      readonly type: "WORKFLOW_UNPARKED";
      readonly parkTransactionId: string;
      readonly satisfiedConditionIdentity: string;
      readonly basis: "evidence-change" | "human-retry" | "norm-change" | "capability";
    }
  | { readonly type: "INVOCATION_FAILED"; readonly failure: InvocationFailureRecord };

export interface IntentAutonomyTransaction {
  readonly schemaVersion: 1;
  readonly transactionId: string;
  readonly intentUuid: string;
  readonly expectedRevision: number;
  readonly beforeProjection: AutonomyProjection | null;
  readonly beforeProjectionDigest: string;
  readonly afterProjectionDigest: string;
  readonly events: readonly AutonomyRuntimeEvent[];
  readonly projection: AutonomyProjection;
}

export interface IntentAutonomyCommitReceipt {
  readonly transactionId: string;
  readonly transactionDigest: string;
  readonly intentUuid: string;
  readonly projectionRevision: number;
}

export interface IntentAutonomyRepository {
  commit(transaction: IntentAutonomyTransaction): IntentAutonomyCommitReceipt;
  readProjection(intentUuid: string): AutonomyProjection | null;
  readTransactions(intentUuid?: string): readonly IntentAutonomyTransaction[];
}

function transactionReceipt(transaction: IntentAutonomyTransaction): IntentAutonomyCommitReceipt {
  return {
    transactionId: transaction.transactionId,
    transactionDigest: autonomyDigest(transaction),
    intentUuid: transaction.intentUuid,
    projectionRevision: transaction.projection.projectionRevision,
  };
}

function sameTransaction(
  left: IntentAutonomyTransaction,
  right: IntentAutonomyTransaction,
): boolean {
  return autonomyDigest(left) === autonomyDigest(right);
}

function validateAutonomyTransaction(transaction: IntentAutonomyTransaction): void {
  assertLegalAutonomyProjection(transaction.projection);
  if (transaction.schemaVersion !== 1 || transaction.intentUuid !== transaction.projection.intentUuid) {
    throw new Error("invalid-intent-autonomy-transaction");
  }
  if (transaction.events.length === 0 || transaction.afterProjectionDigest !== autonomyDigest(transaction.projection)) {
    throw new Error("invalid-intent-autonomy-transaction");
  }
  if (transaction.projection.projectionRevision <= transaction.expectedRevision) {
    throw new Error("intent-autonomy-non-advancing-transaction");
  }
}

function validateAutonomyTransactionPrecondition(
  transaction: IntentAutonomyTransaction,
  current: AutonomyProjection | undefined,
): void {
  if (current !== undefined) {
    const beforeMatches = transaction.beforeProjection !== null &&
      autonomyDigest(transaction.beforeProjection) === autonomyDigest(current);
    if (current.projectionRevision !== transaction.expectedRevision ||
      transaction.beforeProjectionDigest !== autonomyDigest(current) || !beforeMatches) {
      throw new Error("intent-autonomy-revision-conflict");
    }
    return;
  }
  const deterministicBefore = transaction.beforeProjection;
  if (deterministicBefore === null || deterministicBefore.intentUuid !== transaction.intentUuid ||
    deterministicBefore.projectionRevision !== 0) {
    throw new Error("intent-autonomy-revision-conflict");
  }
  assertLegalAutonomyProjection(deterministicBefore);
  if (transaction.expectedRevision !== 0 || transaction.beforeProjectionDigest !== autonomyDigest(deterministicBefore)) {
    throw new Error("intent-autonomy-revision-conflict");
  }
}

export function createMemoryIntentAutonomyRepository(options: {
  readonly initialTransactions?: readonly IntentAutonomyTransaction[];
  readonly onCommit?: (transaction: IntentAutonomyTransaction) => void;
  readonly transactionLock?: <T>(body: () => T) => T;
} = {}): IntentAutonomyRepository {
  const transactions = [...(options.initialTransactions ?? [])];
  const byId = new Map<string, IntentAutonomyTransaction>();
  const byIntent = new Map<string, AutonomyProjection>();
  const lock = options.transactionLock ?? (<T>(body: () => T): T => body());

  function apply(transaction: IntentAutonomyTransaction, initial: boolean): IntentAutonomyCommitReceipt {
    const existing = byId.get(transaction.transactionId);
    if (existing !== undefined) {
      if (!sameTransaction(existing, transaction)) throw new Error("intent-autonomy-transaction-conflict");
      return transactionReceipt(existing);
    }
    validateAutonomyTransaction(transaction);
    validateAutonomyTransactionPrecondition(transaction, byIntent.get(transaction.intentUuid));
    byId.set(transaction.transactionId, transaction);
    byIntent.set(transaction.intentUuid, transaction.projection);
    if (!initial) {
      options.onCommit?.(transaction);
      transactions.push(transaction);
    }
    return transactionReceipt(transaction);
  }

  const seeded = [...transactions];
  transactions.length = 0;
  for (const transaction of seeded) {
    apply(transaction, true);
    transactions.push(transaction);
  }
  return {
    commit(transaction) {
      return lock(() => apply(transaction, false));
    },
    readProjection(intentUuid) {
      return byIntent.get(intentUuid) ?? null;
    },
    readTransactions(intentUuid) {
      return transactions.filter((transaction) => intentUuid === undefined || transaction.intentUuid === intentUuid);
    },
  };
}

function transactionFor(input: {
  readonly transactionId: string;
  readonly before: AutonomyProjection | null;
  readonly after: AutonomyProjection;
  readonly events: readonly AutonomyRuntimeEvent[];
}): IntentAutonomyTransaction {
  return {
    schemaVersion: 1,
    transactionId: input.transactionId,
    intentUuid: input.after.intentUuid,
    expectedRevision: input.before?.projectionRevision ?? 0,
    beforeProjection: input.before,
    beforeProjectionDigest: autonomyDigest(input.before),
    afterProjectionDigest: autonomyDigest(input.after),
    events: input.events,
    projection: input.after,
  };
}

export interface AutonomyDecisionInput {
  readonly occurrence: InteractionOccurrence;
  readonly actorId: string;
  readonly registry: DecisionOptionEffectRegistry;
  readonly currentNormFingerprint: string;
  readonly scopeLineageFingerprint: string;
  readonly applicableNormFacts: readonly DecisionFact[];
  readonly pastHumanRulings: readonly DecisionFact[];
  readonly capability: DecisionCapabilityPort;
  readonly gateApprovalOptionId?: string;
  readonly injectCrashAfterReservation?: boolean;
}

export type AutonomyDecisionResult =
  | { readonly kind: "human-required"; readonly reason: string; readonly result: WorkflowResult | null }
  | { readonly kind: "parked"; readonly result: WorkflowResult }
  | { readonly kind: "reserved"; readonly reservationId: string; readonly receipt: IntentAutonomyCommitReceipt }
  | {
      readonly kind: "decided";
      readonly decision: AutoDecisionRecord;
      readonly effect: DecisionOptionEffect;
      readonly receipt: IntentAutonomyCommitReceipt;
    }
  | { readonly kind: "aborted"; readonly reason: string; readonly receipt: IntentAutonomyCommitReceipt }
  | { readonly kind: "conflict"; readonly reason: string };

export interface ResumeInput {
  readonly triggerOccurrenceId: string;
  readonly condition: ResumeCondition;
  readonly basis: "evidence-change" | "human-retry" | "norm-change" | "capability";
  readonly loopMonitor?: {
    readonly coordinator: LoopMonitorCoordinator;
    readonly partition: LoopMonitorPartition;
    readonly evidenceFingerprint?: string;
    readonly humanRetry?: Parameters<LoopMonitorCoordinator["clearLatch"]>[0]["humanRetry"];
  } | {
    readonly clearedLatchReceipt: {
      readonly identity: string;
      readonly verified: true;
    };
  };
}

export interface IntentAutonomyCoordinator {
  applyHumanCommand(command: HumanAutonomyCommand, context: HumanCommandContext): IntentAutonomyCommitReceipt | { readonly error: string };
  decide(input: AutonomyDecisionInput): AutonomyDecisionResult;
  resumeReservation(input: Omit<AutonomyDecisionInput, "injectCrashAfterReservation">): AutonomyDecisionResult;
  park(input: {
    readonly triggerOccurrenceId: string;
    readonly reason: StopReason;
    readonly resumeCondition: ResumeCondition;
    readonly monitorLatchIdentity?: string;
  }): { readonly result: WorkflowResult; readonly receipt: IntentAutonomyCommitReceipt } | { readonly error: string };
  resume(input: ResumeInput): IntentAutonomyCommitReceipt | { readonly error: string };
  recordInvocationFailure(input: {
    readonly invocationId: string;
    readonly failureClass: string;
    readonly sanitizedEvidenceFingerprint: string;
  }): { readonly result: WorkflowResult; readonly receipt: IntentAutonomyCommitReceipt } | { readonly error: string };
  complete(): { readonly result: WorkflowResult & { readonly outcome: "completed" }; readonly receipt: IntentAutonomyCommitReceipt } |
    { readonly error: string };
  readProjection(): AutonomyProjection;
}

function parkedResult(projection: AutonomyProjection): WorkflowResult {
  const envelope = projection.parkEnvelope;
  if (envelope === null) throw new Error("park-envelope-missing");
  return parseWorkflowResult({
    outcome: "parked",
    reasonCode: envelope.reason,
    retryable: true,
    intentUuid: projection.intentUuid,
    autonomyMode: projection.mode,
    grant: projectGrantReference(projection),
    evidenceFingerprint: envelope.resumeCondition.evidenceFingerprint,
    resumeCondition: envelope.resumeCondition,
    failureRef: null,
  });
}

function failedResult(projection: AutonomyProjection, failure: InvocationFailureRecord): WorkflowResult {
  return parseWorkflowResult({
    outcome: "failed",
    reasonCode: null,
    retryable: false,
    intentUuid: projection.intentUuid,
    autonomyMode: projection.mode,
    grant: projectGrantReference(projection),
    evidenceFingerprint: failure.sanitizedEvidenceFingerprint,
    resumeCondition: null,
    failureRef: failure.transactionId,
  });
}

function completedResult(
  projection: AutonomyProjection,
  completedGrant: IntentGrant | null,
): WorkflowResult & { readonly outcome: "completed" } {
  return parseWorkflowResult({
    outcome: "completed",
    reasonCode: null,
    retryable: false,
    intentUuid: projection.intentUuid,
    autonomyMode: projection.mode,
    grant: completedGrant === null ? null : { id: completedGrant.grantId, state: "completed" },
    evidenceFingerprint: null,
    resumeCondition: null,
    failureRef: null,
  }) as WorkflowResult & { readonly outcome: "completed" };
}

function parkProjection(input: {
  readonly projection: AutonomyProjection;
  readonly triggerOccurrenceId: string;
  readonly reason: StopReason;
  readonly resumeCondition: ResumeCondition;
  readonly monitorLatchIdentity: string | null;
}): { readonly after: AutonomyProjection; readonly envelope: ParkEnvelope } {
  validateResumeCondition(input.reason, input.resumeCondition);
  if ((input.reason === "REPAIR_STALLED") !== (input.monitorLatchIdentity !== null)) {
    throw new Error("illegal-monitor-latch-combination");
  }
  const envelope: ParkEnvelope = {
    parkTransactionId: autonomyStableId("autonomy-park", [
      input.projection.intentUuid,
      input.triggerOccurrenceId,
      input.reason,
      input.resumeCondition,
      input.monitorLatchIdentity,
      input.projection.projectionRevision,
    ]),
    triggerOccurrenceId: input.triggerOccurrenceId,
    reason: input.reason,
    resumeCondition: input.resumeCondition,
    monitorLatchIdentity: input.monitorLatchIdentity,
    beforeProjectionDigest: autonomyDigest(input.projection),
  };
  const after: AutonomyProjection = {
    ...input.projection,
    workflowExecutionState: "suspended",
    parkEnvelope: envelope,
    projectionRevision: input.projection.projectionRevision + 1,
  };
  assertLegalAutonomyProjection(after);
  return { after, envelope };
}

export function createIntentAutonomyCoordinator(options: {
  readonly initialProjection: AutonomyProjection;
  readonly repository: IntentAutonomyRepository;
}): IntentAutonomyCoordinator {
  const { repository } = options;
  const intentUuid = options.initialProjection.intentUuid;
  assertLegalAutonomyProjection(options.initialProjection);

  function current(): AutonomyProjection {
    return repository.readProjection(intentUuid) ?? options.initialProjection;
  }

  function commit(
    before: AutonomyProjection,
    after: AutonomyProjection,
    transactionId: string,
    events: readonly AutonomyRuntimeEvent[],
  ): IntentAutonomyCommitReceipt {
    return repository.commit(transactionFor({ transactionId, before, after, events }));
  }

  function committedReceipt(transactionId: string): IntentAutonomyCommitReceipt {
    const transaction = repository.readTransactions(intentUuid)
      .find((candidate) => candidate.transactionId === transactionId);
    if (transaction === undefined) throw new Error("intent-autonomy-transaction-missing");
    return transactionReceipt(transaction);
  }

  function commitPark(
    projection: AutonomyProjection,
    triggerOccurrenceId: string,
    reason: StopReason,
    resumeCondition: ResumeCondition,
    monitorLatchIdentity: string | null,
  ): { readonly result: WorkflowResult; readonly receipt: IntentAutonomyCommitReceipt } {
    if (projection.workflowExecutionState === "suspended") {
      const existing = projection.parkEnvelope;
      if (existing !== null && existing.reason === reason &&
        autonomyDigest(existing.resumeCondition) === autonomyDigest(resumeCondition)) {
        return {
          result: parkedResult(projection),
          receipt: committedReceipt(existing.parkTransactionId),
        };
      }
      throw new Error("workflow-already-suspended");
    }
    const planned = parkProjection({ projection, triggerOccurrenceId, reason, resumeCondition, monitorLatchIdentity });
    const receipt = commit(projection, planned.after, planned.envelope.parkTransactionId, [{
      type: "WORKFLOW_PARKED",
      envelope: planned.envelope,
    }]);
    return { result: parkedResult(planned.after), receipt };
  }

  function abortReservation(projection: AutonomyProjection, reservation: GrantExerciseReservation, reason: string): AutonomyDecisionResult {
    const after: AutonomyProjection = {
      ...projection,
      pendingExercise: null,
      projectionRevision: projection.projectionRevision + 1,
    };
    const receipt = commit(projection, after, autonomyStableId("grant-exercise-abort", [reservation.reservationId, reason]), [{
      type: "INTENT_GRANT_EXERCISE_ABORTED",
      reservationId: reservation.reservationId,
      reason,
    }]);
    return { kind: "aborted", reason, receipt };
  }

  function finishReservation(input: Omit<AutonomyDecisionInput, "injectCrashAfterReservation">): AutonomyDecisionResult {
    const projection = current();
    const reservation = projection.pendingExercise;
    if (reservation === null) return { kind: "conflict", reason: "reservation-not-found" };
    const validation = revalidateGrantExerciseReservation({
      projection,
      reservation,
      occurrence: input.occurrence,
      registry: input.registry,
      currentNormFingerprint: input.currentNormFingerprint,
    });
    if (!validation.valid) return abortReservation(projection, reservation, validation.reason);
    const after: AutonomyProjection = {
      ...projection,
      autoDecisions: [...projection.autoDecisions, reservation.decision],
      pendingExercise: null,
      projectionRevision: projection.projectionRevision + 1,
    };
    const receipt = commit(projection, after, autonomyStableId("grant-exercise-commit", reservation.reservationId), [
      {
        type: "INTENT_GRANT_EXERCISED",
        reservationId: reservation.reservationId,
        grantId: reservation.grantId,
        candidateId: reservation.candidateId,
      },
      { type: "AUTO_DECIDED", decision: reservation.decision },
      {
        type: "WORKFLOW_EFFECT_APPLIED",
        effectId: reservation.effect.effectId,
        optionId: reservation.effect.optionId,
        payloadFingerprint: reservation.effect.payloadFingerprint,
      },
    ]);
    return { kind: "decided", decision: reservation.decision, effect: reservation.effect, receipt };
  }

  function parkForHuman(
    projection: AutonomyProjection,
    input: AutonomyDecisionInput,
    reason: string,
  ): AutonomyDecisionResult {
    const condition: ResumeCondition = {
      kind: "human-or-capability",
      identity: autonomyStableId("resume-condition", [input.occurrence.occurrenceId, reason]),
      status: "pending",
      evidenceFingerprint: autonomyDigest(reason),
    };
    const parked = commitPark(projection, input.occurrence.occurrenceId, "AWAITING_HUMAN", condition, null);
    return { kind: "parked", result: parked.result };
  }

  function createSelectedGateDecision(
    projection: AutonomyProjection,
    input: AutonomyDecisionInput,
    basisKind: "mode-semi" | "grant-gate",
  ): { readonly kind: "selected"; readonly decision: AutoDecisionRecord } | AutonomyDecisionResult {
    try {
      return {
        kind: "selected",
        decision: createGateAutoDecision({
          projection,
          occurrence: input.occurrence,
          actorId: input.actorId,
          selectedOptionId: input.gateApprovalOptionId ?? "approve",
          basisKind,
        }),
      };
    } catch (cause) {
      return { kind: "conflict", reason: cause instanceof Error ? cause.message : String(cause) };
    }
  }

  function selectDecision(
    projection: AutonomyProjection,
    input: AutonomyDecisionInput,
    authorization: ReturnType<typeof authorizeInteraction>,
  ): { readonly kind: "selected"; readonly decision: AutoDecisionRecord } | AutonomyDecisionResult {
    if (authorization.kind === "semi-mode-gate") return createSelectedGateDecision(projection, input, "mode-semi");
    if (input.occurrence.kind !== "question") return createSelectedGateDecision(projection, input, "grant-gate");
    const resolved = resolveAutoDecision({
      projection,
      occurrence: input.occurrence,
      actorId: input.actorId,
      scopeLineageFingerprint: input.scopeLineageFingerprint,
      currentNormFingerprint: input.currentNormFingerprint,
      applicableNormFacts: input.applicableNormFacts,
      pastHumanRulings: input.pastHumanRulings,
      capability: input.capability,
    });
    if (resolved.kind === "invalid") return { kind: "conflict", reason: resolved.reason };
    if (resolved.kind === "decided") return { kind: "selected", decision: resolved.record };
    const condition: ResumeCondition = {
      kind: "norm-change",
      identity: autonomyStableId("resume-condition", [input.occurrence.occurrenceId, "NORM_CONFLICT"]),
      status: "pending",
      evidenceFingerprint: input.currentNormFingerprint,
    };
    const parked = commitPark(projection, input.occurrence.occurrenceId, "NORM_CONFLICT", condition, null);
    return { kind: "parked", result: parked.result };
  }

  function applySemiDecision(
    projection: AutonomyProjection,
    input: AutonomyDecisionInput,
    decision: AutoDecisionRecord,
  ): AutonomyDecisionResult {
    const effect = input.registry.resolve(decision.selectedOptionId);
    if (effect === null || effect.classification !== "workflow-reversible" ||
      effect.applicableNormFingerprint !== input.currentNormFingerprint) {
      return { kind: "human-required", reason: "semi-gate-effect-not-authorized", result: null };
    }
    const after: AutonomyProjection = {
      ...projection,
      autoDecisions: [...projection.autoDecisions, decision],
      projectionRevision: projection.projectionRevision + 1,
    };
    const receipt = commit(projection, after, autonomyStableId("semi-gate", decision.decisionId), [
      { type: "AUTO_DECIDED", decision },
      { type: "WORKFLOW_EFFECT_APPLIED", effectId: effect.effectId, optionId: effect.optionId, payloadFingerprint: effect.payloadFingerprint },
    ]);
    return { kind: "decided", decision, effect, receipt };
  }

  function reserveFullDecision(
    projection: AutonomyProjection,
    input: AutonomyDecisionInput,
    decision: AutoDecisionRecord,
  ): AutonomyDecisionResult {
    const grant = projection.currentGrant;
    if (grant === null) return { kind: "conflict", reason: "full-grant-missing" };
    const effectAuthorization = authorizeDecisionEffect({
      grant,
      selectedOptionId: decision.selectedOptionId,
      currentNormFingerprint: input.currentNormFingerprint,
      registry: input.registry,
    });
    if (!effectAuthorization.ok) return parkForHuman(projection, input, effectAuthorization.reason);
    const reservation = createGrantExerciseReservation({
      projection,
      occurrence: input.occurrence,
      decision,
      effect: effectAuthorization.effect,
      effectRegistryRevision: input.registry.revision,
      currentNormFingerprint: input.currentNormFingerprint,
    });
    const reservedProjection: AutonomyProjection = {
      ...projection,
      pendingExercise: reservation,
      projectionRevision: projection.projectionRevision + 1,
    };
    const receipt = commit(projection, reservedProjection, reservation.reservationId, [{
      type: "INTENT_GRANT_EXERCISE_RESERVED",
      reservation,
    }]);
    if (input.injectCrashAfterReservation) return { kind: "reserved", reservationId: reservation.reservationId, receipt };
    return finishReservation(input);
  }

  function decide(input: AutonomyDecisionInput): AutonomyDecisionResult {
    const projection = current();
    if (projection.workflowExecutionState === "suspended") return { kind: "parked", result: parkedResult(projection) };
    const authorization = authorizeInteraction(projection, input.occurrence);
    if (authorization.kind === "human-required") {
      if (projection.mode !== "full") return { kind: "human-required", reason: authorization.reason, result: null };
      return parkForHuman(projection, input, authorization.reason);
    }
    const selected = selectDecision(projection, input, authorization);
    if (selected.kind !== "selected") return selected;
    if (authorization.kind === "semi-mode-gate") return applySemiDecision(projection, input, selected.decision);
    return reserveFullDecision(projection, input, selected.decision);
  }

  function clearRepairStalledLatch(envelope: ParkEnvelope, input: ResumeInput): string | null {
    if (envelope.reason !== "REPAIR_STALLED") {
      return input.loopMonitor === undefined ? null : "monitor-latch-not-applicable";
    }
    if (input.loopMonitor === undefined || envelope.monitorLatchIdentity === null) return "monitor-latch-clear-required";
    if ("clearedLatchReceipt" in input.loopMonitor) {
      return input.loopMonitor.clearedLatchReceipt.verified === true &&
          input.loopMonitor.clearedLatchReceipt.identity === envelope.monitorLatchIdentity
        ? null
        : "monitor-latch-clear-receipt-mismatch";
    }
    // The Loop Monitor clears latches for a verified human retry only; an
    // evidence-change resume flows through the Quality Repair coordinator's
    // own resume path and presents its cleared-latch receipt instead.
    const cleared = input.loopMonitor.coordinator.clearLatch({
      partition: input.loopMonitor.partition,
      humanRetry: input.loopMonitor.humanRetry,
    });
    return cleared.kind === "cleared" ? null : `monitor-latch-clear-failed:${cleared.kind}`;
  }

  return {
    applyHumanCommand(command, context) {
      const before = current();
      const plan = planHumanAutonomyCommand(before, command, context);
      if (!plan.ok) return { error: plan.code };
      const events: AutonomyRuntimeEvent[] = [{
        type: "AUTONOMY_MODE_CHANGED",
        beforeMode: before.mode,
        afterMode: plan.after.mode,
        principalId: context.principalId,
        humanTurnId: context.humanTurn.turnId,
      }];
      if (plan.revokedGrant !== null) events.push({ type: "INTENT_GRANT_REVOKED", grant: plan.revokedGrant });
      if (plan.issuedGrant !== null) events.push({ type: "INTENT_GRANT_ISSUED", grant: plan.issuedGrant });
      return commit(before, plan.after, plan.transactionId, events);
    },
    decide,
    resumeReservation: finishReservation,
    park(input) {
      try {
        return commitPark(current(), input.triggerOccurrenceId, input.reason, input.resumeCondition, input.monitorLatchIdentity ?? null);
      } catch (cause) {
        return { error: cause instanceof Error ? cause.message : String(cause) };
      }
    },
    resume(input) {
      try {
        const before = current();
        const envelope = before.parkEnvelope;
        if (before.workflowExecutionState !== "suspended" || envelope === null) return { error: "workflow-not-suspended" };
        validateResumeCondition(envelope.reason, input.condition);
        if (input.triggerOccurrenceId !== envelope.triggerOccurrenceId) return { error: "resume-trigger-mismatch" };
        if (input.condition.identity !== envelope.resumeCondition.identity || input.condition.status !== "satisfied") {
          return { error: "resume-condition-not-satisfied" };
        }
        const latchError = clearRepairStalledLatch(envelope, input);
        if (latchError !== null) return { error: latchError };
        const after: AutonomyProjection = {
          ...before,
          workflowExecutionState: "running",
          parkEnvelope: null,
          projectionRevision: before.projectionRevision + 1,
        };
        return commit(before, after, autonomyStableId("autonomy-unpark", [envelope.parkTransactionId, input.condition]), [{
          type: "WORKFLOW_UNPARKED",
          parkTransactionId: envelope.parkTransactionId,
          satisfiedConditionIdentity: input.condition.identity,
          basis: input.basis,
        }]);
      } catch (cause) {
        return { error: cause instanceof Error ? cause.message : String(cause) };
      }
    },
    recordInvocationFailure(input) {
      const before = current();
      if (before.workflowExecutionState !== "running") return { error: "failed-invocation-requires-running-workflow" };
      if (before.pendingExercise !== null) return { error: "pending-exercise-must-resolve" };
      const beforeDigest = autonomyDigest(before);
      const transactionId = autonomyStableId("invocation-failure", [intentUuid, input.invocationId, input.sanitizedEvidenceFingerprint]);
      const failure: InvocationFailureRecord = {
        transactionId,
        invocationId: input.invocationId,
        failureClass: input.failureClass,
        sanitizedEvidenceFingerprint: input.sanitizedEvidenceFingerprint,
        beforeProjectionDigest: beforeDigest,
        afterProjectionDigest: beforeDigest,
        retryable: false,
      };
      const after: AutonomyProjection = {
        ...before,
        lastInvocationFailure: failure,
        projectionRevision: before.projectionRevision + 1,
      };
      const receipt = commit(before, after, transactionId, [{ type: "INVOCATION_FAILED", failure }]);
      return { result: failedResult(after, failure), receipt };
    },
    complete() {
      const before = current();
      if (before.workflowExecutionState === null) {
        const completedGrant = before.terminalGrantHistory.findLast((grant) => grant.state === "completed") ?? null;
        const completion = repository.readTransactions(intentUuid).findLast((transaction) =>
          transaction.events.some((event) => event.type === "WORKFLOW_EXECUTION_COMPLETED")
        );
        if (completion === undefined) return { error: "intent-autonomy-completion-transaction-missing" };
        return { result: completedResult(before, completedGrant), receipt: transactionReceipt(completion) };
      }
      if (before.workflowExecutionState !== "running" || before.pendingExercise !== null || before.parkEnvelope !== null) {
        return { error: "workflow-not-completable" };
      }
      const grant = before.currentGrant === null ? null : { ...before.currentGrant, state: "completed" as const };
      const after: AutonomyProjection = {
        ...before,
        workflowExecutionState: null,
        currentGrant: null,
        terminalGrantHistory: grant === null ? before.terminalGrantHistory : [...before.terminalGrantHistory, grant],
        projectionRevision: before.projectionRevision + 1,
      };
      assertLegalAutonomyProjection(after);
      const receipt = commit(
        before,
        after,
        autonomyStableId("autonomy-complete", [before.intentUuid, before.projectionRevision]),
        [
          ...(grant === null ? [] : [{ type: "INTENT_GRANT_COMPLETED" as const, grant }]),
          { type: "WORKFLOW_EXECUTION_COMPLETED" },
        ],
      );
      return { result: completedResult(after, grant), receipt };
    },
    readProjection: current,
  };
}

export function resolveIntentQualityActivation(input: {
  readonly autonomy: AutonomyProjection;
  readonly qualityProjection: QualityPluginProjection;
  readonly contribution: NormalizedQualityContribution | null;
}): QualityPluginActivation {
  assertLegalAutonomyProjection(input.autonomy);
  return resolveQualityPluginActivation({
    mode: input.autonomy.mode,
    projection: input.qualityProjection,
    contribution: input.contribution,
  });
}

export interface IntentAutonomyStatusEnvelope {
  readonly autonomyMode: AutonomyProjection["mode"];
  readonly workflowExecutionState: AutonomyProjection["workflowExecutionState"];
  readonly grant: {
    readonly id: string;
    readonly state: IntentGrant["state"];
    readonly scopeFingerprint: string;
    readonly policyCount: number;
  } | null;
  readonly suspendedReason: StopReason | null;
  readonly resumeCondition: ResumeCondition | null;
  readonly legacyStandingGrantCount: number;
  readonly unreviewedAutoDecisionCount: number;
  readonly terminalLiveCompletionCapable: false;
}

export function projectIntentAutonomyStatus(projection: AutonomyProjection): IntentAutonomyStatusEnvelope {
  assertLegalAutonomyProjection(projection);
  const grant = projection.currentGrant;
  return {
    autonomyMode: projection.mode,
    workflowExecutionState: projection.workflowExecutionState,
    grant: grant === null ? null : {
      id: grant.grantId,
      state: grant.state,
      scopeFingerprint: grant.scope.scopeFingerprint,
      policyCount: grant.policies.length,
    },
    suspendedReason: projection.parkEnvelope?.reason ?? null,
    resumeCondition: projection.parkEnvelope?.resumeCondition ?? null,
    legacyStandingGrantCount: projection.legacyStandingGrantIds.length,
    unreviewedAutoDecisionCount: projection.autoDecisions.filter((decision) => decision.reviewState === "unreviewed").length,
    terminalLiveCompletionCapable: false,
  };
}
