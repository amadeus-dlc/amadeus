// covers: file:packages/framework/core/tools/amadeus-intent-completion.ts file:packages/framework/harness/registry.ts audit:INTENT_COMPLETION_TRANSACTION_COMMITTED
// size: medium

import { describe, expect, test } from "bun:test";

import {
  acceptTerminalCommit,
  awaitingLiveCapability,
  completedReviewSeed,
  createIntentCompletionEvaluator,
  createIntentLiveAuthorizationService,
  createIntentLiveReceiptValidator,
  createIntentLiveRunCoordinator,
  createMemoryIntentCompletionLedger,
  parseCompletionEvidencePayload,
  planTerminalCommit,
  terminalTransactionAuditFields,
  resolveRequiredCompletionCohort,
  validateHarnessRegistry,
  type AuditCommitReceipt,
  type CanonicalAuditEvent,
  type CommittedIntentLiveExecutionAuthorization,
  type CommittedValidatedIntentLiveReceipt,
  type CanonicalLiveRunSnapshot,
  type LiveScenarioRevision,
  type RawIntentLiveReceipt,
  type IntentCompletionEvaluation,
} from "../../packages/framework/core/tools/amadeus-intent-completion.ts";
import {
  autonomyDigest,
  createAutonomyProjection,
  grantIssuanceDisplayDigest,
  normalizeDecisionPolicies,
  planHumanAutonomyCommand,
  type AutonomyProjection,
  type GrantScopeDescriptor,
  type HumanCommandContext,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  canonicalContractValueDigest,
  createMemoryAutonomyReviewService,
} from "../../packages/framework/core/tools/amadeus-autonomy-review.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const IMPLEMENTATION = "revision-a1b2c3";
const PACKAGE = autonomyDigest("package");
const SCENARIO = autonomyDigest("scenario");
const HUMAN = { verified: true, eventType: "HUMAN_TURN", actor: "human", turnId: "human-turn-1" } as const;

function isCompleteEvaluation(
  value: IntentCompletionEvaluation,
): value is Extract<IntentCompletionEvaluation, { check: { kind: "complete" } }> {
  return value.check.kind === "complete";
}

function commitReceipt(
  transactionId: string,
  eventIdentity: string,
  auditRevision: number,
  stateProjectionRevision = auditRevision,
): AuditCommitReceipt {
  return { transactionId, committedEventIdentities: [eventIdentity], auditRevision, stateProjectionRevision };
}

function fullProjection(): AutonomyProjection {
  const initial = createAutonomyProjection({ intentUuid: INTENT });
  const scope: GrantScopeDescriptor = {
    intentUuid: INTENT,
    scopeId: "self-feature",
    scopeFingerprint: autonomyDigest("self-feature"),
    normFingerprint: autonomyDigest("norm"),
    allowedInteractionKinds: ["stage-gate", "phase-gate", "walking-skeleton", "question"],
    permissionBoundaryFingerprint: autonomyDigest("permission-boundary"),
    prohibitedEffects: ["new-permission", "irreversible", "scope-out", "norm-waiver", "quality-waiver"],
  };
  const policies = normalizeDecisionPolicies({
    grantIdentitySeed: "grant-seed",
    scopeFingerprint: scope.scopeFingerprint,
    humanTurnId: HUMAN.turnId,
    policies: [{ sourceText: "Choose the approved safe option", selector: "selector-1", optionId: "accept" }],
  });
  const display = grantIssuanceDisplayDigest({ intentUuid: INTENT, principalId: "principal-1", scope, policies });
  const context: HumanCommandContext = {
    targetIntentUuid: INTENT,
    principalId: "principal-1",
    humanTurn: HUMAN,
    commandOccurrenceId: "command-1",
    expectedProjectionRevision: initial.projectionRevision,
    confirmedDisplayDigest: display,
  };
  const plan = planHumanAutonomyCommand(initial, { kind: "issue-full", scope, policies }, context);
  if (!plan.ok) throw new Error(plan.code);
  return plan.after;
}

async function buildFiveHarnessEvidence() {
  const registry = validateHarnessRegistry();
  if (!registry.ok) throw new Error(registry.error.detail);
  const cohort = resolveRequiredCompletionCohort(registry.value);
  if (!cohort.ok) throw new Error(cohort.error.detail);
  const revision: LiveScenarioRevision = {
    implementationRevision: IMPLEMENTATION,
    packageDigest: PACKAGE,
    registryDigest: registry.value.registryDigest,
    scenarioDigest: SCENARIO,
  };
  const authorizations: CommittedIntentLiveExecutionAuthorization[] = [];
  const rawReceipts: RawIntentLiveReceipt[] = [];
  const validations: CommittedValidatedIntentLiveReceipt[] = [];
  for (const [index, harnessId] of cohort.value.harnessIds.entries()) {
    const authorizationService = createIntentLiveAuthorizationService({
      port: {
        authorize: () => ({
          authorized: true,
          authorizationId: `provider-auth-${harnessId}`,
          actorId: `actor-${harnessId}`,
          environmentId: `environment-${harnessId}`,
          issuerPrincipalId: `issuer-${harnessId}`,
          traceId: `trace-${harnessId}`,
          spanId: `span-${harnessId}`,
          attestationDigest: autonomyDigest(`attestation-${harnessId}`),
        }),
      },
    });
    const plannedAuthorization = await authorizationService.authorize({
      intentUuid: INTENT,
      harnessId,
      revision,
      cohort: cohort.value,
      registry: registry.value,
    });
    if (!plannedAuthorization.ok) throw new Error(plannedAuthorization.error.detail);
    const authorizationCommit = commitReceipt(
      `authorization-transaction-${harnessId}`,
      plannedAuthorization.value.audit[0].eventIdentity,
      index * 2 + 1,
    );
    const authorization = authorizationService.bindCommit({
      ...plannedAuthorization.value,
      receipt: authorizationCommit,
    });
    if (!authorization.ok) throw new Error(authorization.error.detail);
    authorizations.push(authorization.value);

    const observation = {
      judgeInvocationId: `judge-${harnessId}`,
      judgeObserved: true as const,
      electionDecisionId: `decision-${harnessId}`,
      electionOutcome: "elected" as const,
      degradationReason: null,
    };
    const audit = [
      ["LOOP_JUDGE_STARTED", observation.judgeInvocationId],
      ["LOOP_JUDGE_RESULT_OBSERVED", observation.judgeInvocationId],
      ["AUTO_DECIDED", observation.electionDecisionId],
    ].map(([eventType, eventIdentity], offset): CanonicalAuditEvent => ({
      eventType,
      eventIdentity,
      intentUuid: INTENT,
      fields: { trace_id: authorization.value.traceId },
      payloadDigest: autonomyDigest([eventType, eventIdentity]),
      transactionId: `observation-transaction-${harnessId}-${offset}`,
      auditRevision: index * 2 + 2,
    }));
    const rawReceipt: RawIntentLiveReceipt = {
      schemaVersion: "1",
      receiptId: `receipt-${harnessId}`,
      intentUuid: INTENT,
      harnessId,
      authorizationId: authorization.value.authorizationId,
      authorizationEventIdentity: authorization.value.authorizationEventIdentity,
      authorizationCommitTransactionId: authorization.value.commitReceipt.transactionId,
      revision,
      environmentId: authorization.value.environmentId,
      traceId: authorization.value.traceId,
      spanId: authorization.value.spanId,
      attestationDigest: authorization.value.attestationDigest,
      outcome: "passed",
      observation,
    };
    rawReceipts.push(rawReceipt);
    const validator = createIntentLiveReceiptValidator({
      evidenceReader: {
        readAuthorizationSnapshot: () => ({ ok: true, value: {
          intentUuid: INTENT,
          audit,
          auditRevision: index * 2 + 2,
          stateProjectionRevision: index,
          authorization: authorization.value,
        } }),
      },
    });
    const plannedValidation = validator.validate(rawReceipt);
    if (!plannedValidation.ok) throw new Error(plannedValidation.error.detail);
    const validation = validator.bindCommit({
      planned: plannedValidation.value,
      receipt: commitReceipt(
        `validation-transaction-${harnessId}`,
        plannedValidation.value.audit[0].eventIdentity,
        index * 2 + 2,
      ),
    });
    if (!validation.ok) throw new Error(validation.error.detail);
    validations.push(validation.value);
  }
  const evaluator = createIntentCompletionEvaluator({
    receiptReader: {
      readValidationSet: () => ({ ok: true, value: {
        intentUuid: INTENT,
        auditRevision: 10,
        stateProjectionRevision: 7,
        receipts: validations,
      } }),
    },
  });
  return { registry: registry.value, cohort: cohort.value, revision, authorizations, rawReceipts, validations, evaluator };
}

describe("five-harness completion cohort", () => {
  test("rejects duplicate harness ids and an empty completion cohort", () => {
    const registry = validateHarnessRegistry();
    if (!registry.ok) throw new Error(registry.error.detail);
    const first = registry.value.descriptors[0]!;
    expect(validateHarnessRegistry([first, first])).toMatchObject({
      ok: false,
      error: { code: "MALFORMED", locus: "registry" },
    });
    const noLive = registry.value.descriptors.map((descriptor) => ({ ...descriptor, autonomyLive: false }));
    const noLiveRegistry = validateHarnessRegistry(noLive);
    if (!noLiveRegistry.ok) throw new Error(noLiveRegistry.error.detail);
    expect(resolveRequiredCompletionCohort(noLiveRegistry.value)).toMatchObject({
      ok: false,
      error: { code: "MALFORMED", locus: "cohort" },
    });
  });

  test("registry resolves the exact current five while retaining Kiro rows", () => {
    const registry = validateHarnessRegistry();
    expect(registry.ok).toBe(true);
    if (!registry.ok) throw new Error(registry.error.detail);
    expect(registry.value.descriptors.map((descriptor) => descriptor.id)).toContain("kiro");
    expect(registry.value.descriptors.map((descriptor) => descriptor.id)).toContain("kiro-ide");
    const cohort = resolveRequiredCompletionCohort(registry.value);
    expect(cohort.ok).toBe(true);
    if (!cohort.ok) throw new Error(cohort.error.detail);
    expect(cohort.value.harnessIds).toEqual(["claude", "codex", "cursor", "kimi", "opencode"]);
  });

  test("credential absence is not pass and produces the designed non-terminal route", async () => {
    const registry = validateHarnessRegistry();
    if (!registry.ok) throw new Error(registry.error.detail);
    const cohort = resolveRequiredCompletionCohort(registry.value);
    if (!cohort.ok) throw new Error(cohort.error.detail);
    const service = createIntentLiveAuthorizationService({
      port: { authorize: () => ({ authorized: false, reason: "credential-unavailable" }) },
    });
    const result = await service.authorize({
      intentUuid: INTENT,
      harnessId: "claude",
      cohort: cohort.value,
      registry: registry.value,
      revision: {
        implementationRevision: IMPLEMENTATION,
        packageDigest: PACKAGE,
        registryDigest: registry.value.registryDigest,
        scenarioDigest: SCENARIO,
      },
    });
    expect(result).toMatchObject({ ok: false, error: { code: "PROVENANCE_REQUIRED", locus: "credential" } });
    const awaiting = awaitingLiveCapability(INTENT, cohort.value, ["claude"]);
    expect(awaiting).toMatchObject({ ok: true, value: { outcome: "AWAITING_HUMAN", missingHarnessIds: ["claude"] } });
  });
});

describe("receipt validation and terminal transaction", () => {
  test("dispatch claim is canonical, single-use, and native retries attach to one operation", async () => {
    const fixture = await buildFiveHarnessEvidence();
    const authorization = fixture.authorizations[0];
    let snapshot: CanonicalLiveRunSnapshot | null = null;
    let nativeStarts = 0;
    let dispatchCalls = 0;
    const coordinator = createIntentLiveRunCoordinator({
      runReader: {
        readRunSnapshot: ({ intentUuid, runId }) => snapshot !== null &&
          snapshot.intentUuid === intentUuid && snapshot.run.runId === runId
          ? { ok: true, value: snapshot }
          : { ok: false, error: { code: "CONFLICT", locus: "run", detail: "run head not found" } },
      },
      proofVerifier: {
        verify: ({ reconciliation }) => ({ ok: true, value: { proofDigest: reconciliation.proofDigest } }),
      },
      nativePort: {
        reconcile: async () => ({ ok: true, value: {
          kind: "attested-no-effect",
          proofDigest: autonomyDigest("no-effect-proof"),
        } }),
        dispatch: async (claimed) => {
          dispatchCalls += 1;
          if (dispatchCalls === 1) nativeStarts += 1;
          const key = canonicalContractValueDigest("intent-live-native-dispatch", {
            operationReference: claimed.operationReference,
            attempt: claimed.attempt,
          });
          if (!key.ok) return key;
          return { ok: true, value: {
            schemaVersion: "1",
            dispatchKeyDigest: key.value,
            nativeOperationId: "native-operation-1",
            outcome: dispatchCalls === 1 ? "started" : "attached",
            proofDigest: autonomyDigest("native-operation-proof"),
          } };
        },
      },
    });
    const reserved = coordinator.reserve({ authorization });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) throw new Error(reserved.error.detail);
    const committedReservation = coordinator.bindStateCommit({
      planned: reserved.value.reservation,
      audit: reserved.value.audit,
      receipt: commitReceipt("run-reservation-transaction", reserved.value.audit[0].eventIdentity, 11, 8),
    });
    if (!committedReservation.ok) throw new Error(committedReservation.error.detail);
    snapshot = {
      intentUuid: INTENT,
      auditRevision: 11,
      stateProjectionRevision: 8,
      authorization,
      run: committedReservation.value,
    };
    const started = await coordinator.planNext({ intentUuid: INTENT, runId: committedReservation.value.runId });
    if (!started.ok) throw new Error(started.error.detail);
    const committedStarted = coordinator.bindTransitionCommit({
      prior: started.value.prior,
      next: started.value.next,
      audit: started.value.audit,
      receipt: commitReceipt("run-started-transaction", started.value.audit[0].eventIdentity, 12, 9),
    });
    expect(committedStarted.ok).toBe(true);
    if (!committedStarted.ok) throw new Error(committedStarted.error.detail);
    if (committedStarted.value.dispatchPermit === null) throw new Error("run start did not produce a dispatch permit");
    snapshot = { ...snapshot, auditRevision: 12, stateProjectionRevision: 9, run: committedStarted.value.state };
    const claim = coordinator.claimDispatch(committedStarted.value.dispatchPermit);
    expect(claim.ok).toBe(true);
    if (!claim.ok) throw new Error(claim.error.detail);
    const committedClaim = coordinator.bindDispatchClaimCommit({
      permit: committedStarted.value.dispatchPermit,
      prior: claim.value.prior,
      claimed: claim.value.claimed,
      audit: claim.value.audit,
      receipt: commitReceipt("run-claim-transaction", claim.value.audit[0].eventIdentity, 13, 10),
    });
    if (!committedClaim.ok) throw new Error(committedClaim.error.detail);
    const claimedRun = {
      ...claim.value.claimed,
      stateEventIdentity: committedClaim.value.claimEventIdentity,
      stateCommitReceipt: commitReceipt("run-claim-transaction", committedClaim.value.claimEventIdentity, 13, 10),
      sourceAuditRevision: 13,
      sourceStateProjectionRevision: 10,
    };
    snapshot = { ...snapshot, auditRevision: 13, stateProjectionRevision: 10, run: claimedRun };
    expect(coordinator.claimDispatch(committedStarted.value.dispatchPermit)).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", locus: "dispatchClaim" },
    });
    expect((await coordinator.dispatch(committedClaim.value))).toMatchObject({ ok: true, value: { outcome: "started" } });
    expect((await coordinator.dispatch(committedClaim.value))).toMatchObject({ ok: true, value: { outcome: "attached" } });
    expect(nativeStarts).toBe(1);
  });

  test("all five exact receipts atomically complete full grant and clear workflow", async () => {
    const fixture = await buildFiveHarnessEvidence();
    const evaluation = fixture.evaluator.evaluate({
      intentUuid: INTENT,
      cohort: fixture.cohort,
      revision: fixture.revision,
      validationEventIdentities: fixture.validations.map((receipt) => receipt.validationEventIdentity).reverse(),
    });
    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) throw new Error(evaluation.error.detail);
    if (!isCompleteEvaluation(evaluation.value)) throw new Error("expected complete five-harness evaluation");
    expect(evaluation.value.check.evidence.receiptIds).toEqual(fixture.cohort.harnessIds.map((id) => `receipt-${id}`));
    expect(parseCompletionEvidencePayload(evaluation.value.audit[0]).ok).toBe(true);
    expect(parseCompletionEvidencePayload({
      ...evaluation.value.audit[0],
      payloadDigest: `sha256:${"f".repeat(64)}`,
    })).toMatchObject({ ok: false, error: { code: "CONFLICT", locus: "completionEvidencePayload" } });

    const plan = planTerminalCommit({ current: fullProjection(), evaluation: evaluation.value });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error(plan.error.detail);
    expect(plan.value.orderedEvents.map((event) => event.eventType)).toEqual([
      "LIVE_COMPLETION_EVIDENCE_VALIDATED",
      "INTENT_GRANT_COMPLETED",
      "WORKFLOW_STATE_CLEARED",
      "WORKFLOW_COMPLETED",
    ]);
    const auditFields = terminalTransactionAuditFields(plan.value);
    expect(auditFields["Intent Uuid"]).toBe(INTENT);
    expect(auditFields["Transaction Id"]).toBe(plan.value.transaction.transactionId);
    expect(auditFields["Completion Seal Digest"]).toBe(plan.value.completionSealDigest);
    expect(JSON.parse(auditFields.Transaction!)).toMatchObject({
      eventType: "INTENT_COMPLETION_TRANSACTION_COMMITTED",
    });
    expect(plan.value.terminalProjection.workflowExecutionState).toBeNull();
    expect(plan.value.terminalProjection.currentGrant).toBeNull();
    expect(plan.value.terminalProjection.terminalGrantHistory.at(-1)?.state).toBe("completed");
    expect(plan.value.result.grant?.state).toBe("completed");

    const ledger = createMemoryIntentCompletionLedger({ auditRevision: 10, stateProjectionRevision: 7 });
    const committed = ledger.commit(plan.value);
    expect(committed).toMatchObject({ ok: true, value: { result: { outcome: "completed" }, stateProjectionRevision: 8 } });
    const replay = ledger.commit(plan.value);
    expect(replay).toEqual(committed);

    const restored = createMemoryIntentCompletionLedger({ auditRevision: 0, stateProjectionRevision: 0, snapshot: ledger.exportSnapshot() });
    expect(restored.commit(plan.value)).toEqual(committed);
    expect(() => createMemoryAutonomyReviewService({
      intents: [completedReviewSeed(plan.value, 14)],
    })).not.toThrow();
  });

  test("missing, duplicate, skip, forged, and revision mismatch never create completion evidence", async () => {
    const fixture = await buildFiveHarnessEvidence();
    const missingReader = createIntentCompletionEvaluator({
      receiptReader: { readValidationSet: () => ({ ok: true, value: {
        intentUuid: INTENT,
        auditRevision: 10,
        stateProjectionRevision: 7,
        receipts: fixture.validations.slice(0, 4),
      } }) },
    });
    const missing = missingReader.evaluate({
      intentUuid: INTENT,
      cohort: fixture.cohort,
      revision: fixture.revision,
      validationEventIdentities: fixture.validations.slice(0, 4).map((receipt) => receipt.validationEventIdentity),
    });
    expect(missing).toMatchObject({ ok: true, value: { check: { kind: "incomplete" }, audit: [] } });

    const duplicateEvaluator = createIntentCompletionEvaluator({
      receiptReader: { readValidationSet: () => ({ ok: true, value: {
        intentUuid: INTENT,
        auditRevision: 10,
        stateProjectionRevision: 7,
        receipts: [...fixture.validations, fixture.validations[0]],
      } }) },
    });
    const duplicate = duplicateEvaluator.evaluate({
      intentUuid: INTENT,
      cohort: fixture.cohort,
      revision: fixture.revision,
      validationEventIdentities: fixture.validations.map((receipt) => receipt.validationEventIdentity),
    });
    expect(duplicate).toMatchObject({
      ok: true,
      value: {
        check: {
          kind: "incomplete",
          missingHarnessIds: [],
          rejectedReceiptIds: ["receipt-claude"],
        },
        audit: [],
      },
    });

    const authorization = fixture.authorizations[0];
    const rawReceipt = fixture.rawReceipts[0]!;
    const skipped: RawIntentLiveReceipt = {
      schemaVersion: rawReceipt.schemaVersion,
      receiptId: rawReceipt.receiptId,
      intentUuid: rawReceipt.intentUuid,
      harnessId: rawReceipt.harnessId,
      authorizationId: rawReceipt.authorizationId,
      authorizationEventIdentity: rawReceipt.authorizationEventIdentity,
      authorizationCommitTransactionId: rawReceipt.authorizationCommitTransactionId,
      revision: rawReceipt.revision,
      environmentId: rawReceipt.environmentId,
      traceId: rawReceipt.traceId,
      spanId: rawReceipt.spanId,
      attestationDigest: rawReceipt.attestationDigest,
      outcome: "skipped",
      observation: null,
    };
    const validator = createIntentLiveReceiptValidator({
      evidenceReader: { readAuthorizationSnapshot: () => ({ ok: true, value: {
        intentUuid: INTENT,
        audit: [],
        auditRevision: 10,
        stateProjectionRevision: 7,
        authorization,
      } }) },
    });
    expect(validator.validate(skipped)).toMatchObject({ ok: false, error: { code: "PROVENANCE_REQUIRED" } });
    expect(validator.validate({ ...skipped, outcome: "passed", observation: fixture.validations[0].observation,
      attestationDigest: autonomyDigest("forged") })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    const mismatchedRevision = { ...fixture.revision, scenarioDigest: autonomyDigest("other-scenario") };
    const mismatch = fixture.evaluator.evaluate({
      intentUuid: INTENT,
      cohort: fixture.cohort,
      revision: mismatchedRevision,
      validationEventIdentities: fixture.validations.map((receipt) => receipt.validationEventIdentity),
    });
    expect(mismatch).toMatchObject({ ok: true, value: { check: { kind: "incomplete" }, audit: [] } });
  });

  test("partial or forged terminal commit receipt is rejected", async () => {
    const fixture = await buildFiveHarnessEvidence();
    const evaluation = fixture.evaluator.evaluate({
      intentUuid: INTENT,
      cohort: fixture.cohort,
      revision: fixture.revision,
      validationEventIdentities: fixture.validations.map((receipt) => receipt.validationEventIdentity),
    });
    if (!evaluation.ok) throw new Error(evaluation.error.detail);
    if (!isCompleteEvaluation(evaluation.value)) throw new Error("expected complete five-harness evaluation");
    const plan = planTerminalCommit({ current: createAutonomyProjection({ intentUuid: INTENT }), evaluation: evaluation.value });
    if (!plan.ok) throw new Error(plan.error.detail);
    const rejected = acceptTerminalCommit({
      plan: plan.value,
      receipt: {
        transactionId: plan.value.transaction.transactionId,
        committedEventIdentities: plan.value.expectedEventIdentities.slice(0, -1),
        auditRevision: 13,
        stateProjectionRevision: plan.value.expectedStateProjectionRevision,
      },
    });
    expect(rejected).toMatchObject({ ok: false, error: { code: "CONFLICT", locus: "terminalCommitReceipt" } });
  });
});
