// Durable Quality Repair orchestration over the generic Loop Monitor (#2096).

import {
  createJudgeRouteConstraint,
  createLoopDelivery,
  type LoopMonitorPartition,
  type LoopTraceContext,
} from "./amadeus-loop-monitor.ts";
import {
  createLoopMonitorCoordinator,
  loopMonitorPartitionKey,
  type CommittedJudgeDispatchPermit,
  type JudgePort,
  type LiveAuthorizationPort,
  type LoopMonitorCommitReceipt,
  type LoopMonitorEventSet,
  type LoopMonitorRepository,
  type VerifiedHumanTurn,
} from "./amadeus-loop-monitor-runtime.ts";
import {
  createQualityEpochProjection,
  normalizeQualityEvidence,
  planQualityDelivery,
  qualityDigest,
  qualityStableId,
  recordQualityReplan,
  type QualityDeliveryPlan,
  type QualityEvidenceBatchInput,
  type QualityEvidenceSnapshot,
  type QualityEpochProjection,
  type QualityNonProgressPattern,
  type QualityPluginActivation,
  type QualityProgress,
  type QualityReplanReceipt,
} from "./amadeus-quality-repair.ts";

type ActiveQualityActivation = Extract<QualityPluginActivation, { readonly kind: "active" }>;

export interface RepairStalledResumeAlternative {
  readonly kind: "evidence-change" | "human-retry";
  readonly identity: string;
}

export interface RepairStalledResumeCondition {
  readonly kind: "any-of";
  readonly alternatives: readonly [RepairStalledResumeAlternative, RepairStalledResumeAlternative];
}

export interface RepairStalledLatch {
  readonly qualityEpochId: string;
  readonly evidenceFingerprint: string;
  readonly unresolvedObligationIds: readonly string[];
  readonly verifierSuccessReceipts: QualityEvidenceSnapshot["verifierSuccessReceipts"];
  readonly pattern: QualityNonProgressPattern;
  readonly judgeInvocationId: string;
  readonly replanBasis: string | null;
  readonly resumeCondition: RepairStalledResumeCondition;
}

export interface QualityRuntimeProjection {
  readonly qualityScopeId: string;
  readonly partition: LoopMonitorPartition;
  readonly epoch: QualityEpochProjection;
  readonly latestSnapshot: QualityEvidenceSnapshot | null;
  readonly lastProgress: QualityProgress | null;
  readonly observationSequence: number;
  readonly stalledLatch: RepairStalledLatch | null;
  readonly workflowExecutionState: "running" | "suspended";
  readonly lastReplanReceipt: QualityReplanReceipt | null;
  readonly pendingReplan: QualityReplanRequest | null;
}

export type QualityRuntimeEvent =
  | {
      readonly type: "QUALITY_SNAPSHOT_OBSERVED";
      readonly snapshotFingerprint: string;
      readonly progress: QualityProgress;
      readonly projection: QualityRuntimeProjection;
    }
  | {
      readonly type: "QUALITY_REPLAN_RESERVED";
      readonly replanId: string;
      readonly judgeInvocationId: string;
      readonly attemptNo: 0 | 1;
      readonly projection: QualityRuntimeProjection;
    }
  | {
      readonly type: "QUALITY_REPLAN_RECORDED";
      readonly replanId: string;
      readonly receipt: QualityReplanReceipt;
      readonly projection: QualityRuntimeProjection;
    }
  | {
      readonly type: "REPAIR_STALLED";
      readonly latch: RepairStalledLatch;
      readonly projection: QualityRuntimeProjection;
    }
  | {
      readonly type: "QUALITY_EPOCH_STARTED";
      readonly priorQualityEpochId: string;
      readonly satisfiedAlternativeIdentity: string;
      readonly resumeEvidenceReceipt: string;
      readonly projection: QualityRuntimeProjection;
    };

export interface QualityRepairTransaction {
  readonly schemaVersion: 1;
  readonly transactionId: string;
  readonly qualityScopeId: string;
  readonly qualityEvents: readonly QualityRuntimeEvent[];
  readonly loopEventSets: readonly LoopMonitorEventSet[];
}

export interface QualityRepairRepository {
  readonly loopRepository: LoopMonitorRepository;
  transaction<T>(
    qualityScopeId: string,
    body: (appendQuality: (event: QualityRuntimeEvent) => void) => T,
  ): T;
  readProjection(qualityScopeId: string): QualityRuntimeProjection | null;
  readTransactions(): readonly QualityRepairTransaction[];
}

function loopReceipt(set: LoopMonitorEventSet): LoopMonitorCommitReceipt {
  const eventSetDigest = qualityDigest(set);
  return {
    receiptId: qualityStableId("loop-receipt", [set.eventSetId, eventSetDigest]),
    eventSetId: set.eventSetId,
    eventSetDigest,
    partitionKey: set.partitionKey,
  };
}

function foldQualityProjection(
  transactions: readonly QualityRepairTransaction[],
  qualityScopeId: string,
): QualityRuntimeProjection | null {
  let projection: QualityRuntimeProjection | null = null;
  const eventDigests = new Map<string, string>();
  for (const transaction of transactions) {
    if (transaction.qualityScopeId !== qualityScopeId) continue;
    const transactionDigest = qualityDigest(transaction);
    const prior = eventDigests.get(transaction.transactionId);
    if (prior !== undefined) {
      if (prior !== transactionDigest) throw new Error("quality-repair-transaction-conflict");
      continue;
    }
    eventDigests.set(transaction.transactionId, transactionDigest);
    for (const event of transaction.qualityEvents) {
      if (event.projection.qualityScopeId !== qualityScopeId) {
        throw new Error("quality-repair-projection-scope-mismatch");
      }
      projection = event.projection;
    }
  }
  return projection;
}

export function createMemoryQualityRepairRepository(options: {
  readonly initialTransactions?: readonly QualityRepairTransaction[];
  readonly onCommit?: (transaction: QualityRepairTransaction) => void;
  readonly transactionLock?: <T>(body: () => T) => T;
} = {}): QualityRepairRepository {
  const transactions: QualityRepairTransaction[] = [...(options.initialTransactions ?? [])];
  const lock = options.transactionLock ?? (<T>(body: () => T): T => body());
  let active: {
    readonly qualityScopeId: string;
    readonly qualityEvents: QualityRuntimeEvent[];
    readonly loopEventSets: LoopMonitorEventSet[];
  } | null = null;

  function allLoopSets(partition: LoopMonitorPartition): LoopMonitorEventSet[] {
    const key = loopMonitorPartitionKey(partition);
    const committed = transactions.flatMap((transaction) => transaction.loopEventSets)
      .filter((set) => set.partitionKey === key);
    const staged = active?.loopEventSets.filter((set) => set.partitionKey === key) ?? [];
    return [...committed, ...staged];
  }

  const loopRepository: LoopMonitorRepository = {
    transaction(partition, body) {
      if (active !== null) {
        return body(allLoopSets(partition), (set) => {
          if (set.partitionKey !== loopMonitorPartitionKey(partition)) {
            throw new Error("quality-repair-loop-partition-mismatch");
          }
          const existing = allLoopSets(partition).find((candidate) => candidate.eventSetId === set.eventSetId);
          if (existing !== undefined) {
            if (qualityDigest(existing) !== qualityDigest(set)) {
              throw new Error("quality-repair-loop-event-set-conflict");
            }
            return loopReceipt(existing);
          }
          active!.loopEventSets.push(set);
          return loopReceipt(set);
        });
      }
      const qualityScopeId = qualityStableId("quality-loop-only", [loopMonitorPartitionKey(partition)]);
      let result: ReturnType<typeof body> | undefined;
      repository.transaction(qualityScopeId, () => {
        result = loopRepository.transaction(partition, body);
      });
      return result as ReturnType<typeof body>;
    },
    readEventSets(partition) {
      return allLoopSets(partition);
    },
    isCommitted(receipt) {
      const sets = transactions.flatMap((transaction) => transaction.loopEventSets);
      const staged = active?.loopEventSets ?? [];
      return [...sets, ...staged].some((set) => {
        const expected = loopReceipt(set);
        return expected.receiptId === receipt.receiptId && expected.eventSetId === receipt.eventSetId &&
          expected.eventSetDigest === receipt.eventSetDigest && expected.partitionKey === receipt.partitionKey;
      });
    },
  };

  const repository: QualityRepairRepository = {
    loopRepository,
    transaction(qualityScopeId, body) {
      if (active !== null) {
        if (active.qualityScopeId !== qualityScopeId) throw new Error("quality-repair-nested-scope-mismatch");
        return body((event) => active!.qualityEvents.push(event));
      }
      return lock(() => {
        const staged = { qualityScopeId, qualityEvents: [] as QualityRuntimeEvent[], loopEventSets: [] as LoopMonitorEventSet[] };
        active = staged;
        try {
          const result = body((event) => staged.qualityEvents.push(event));
          if (staged.qualityEvents.length > 0 || staged.loopEventSets.length > 0) {
            const transactionId = qualityStableId("quality-transaction", [
              qualityScopeId,
              transactions.length,
              staged.qualityEvents,
              staged.loopEventSets,
            ]);
            const transaction = { schemaVersion: 1 as const, transactionId, ...staged };
            options.onCommit?.(transaction);
            transactions.push(transaction);
          }
          return result;
        } finally {
          active = null;
        }
      });
    },
    readProjection(qualityScopeId) {
      return foldQualityProjection(transactions, qualityScopeId);
    },
    readTransactions() {
      return transactions.map((transaction) => ({
        ...transaction,
        qualityEvents: [...transaction.qualityEvents],
        loopEventSets: [...transaction.loopEventSets],
      }));
    },
  };
  return repository;
}

export interface QualityReplanRequest {
  readonly replanId: string;
  readonly qualityScopeId: string;
  readonly qualityEpochId: string;
  readonly triggerSnapshotFingerprint: string;
  readonly judgeInvocationId: string;
  readonly attemptNo: 0 | 1;
  readonly attemptIdentity: string;
  readonly priorNoEffectReceiptDigest: string | null;
}

export type QualityReplanDispatchResult =
  | { readonly kind: "completed"; readonly receipt: QualityReplanReceipt }
  | { readonly kind: "accepted"; readonly operationRef: string }
  | { readonly kind: "no-effect-confirmed"; readonly attestationId: string }
  | { readonly kind: "effect-possible" | "unknown"; readonly reason: string };

export interface QualityReplanPort {
  dispatch(request: QualityReplanRequest): QualityReplanDispatchResult;
  reconcile(request: QualityReplanRequest): QualityReplanDispatchResult;
}

export type QualityObserveResult =
  | {
      readonly kind: "repair";
      readonly snapshot: QualityEvidenceSnapshot;
      readonly progress: QualityProgress;
      readonly projection: QualityEpochProjection;
    }
  | {
      readonly kind: "judge-reserved";
      readonly snapshot: QualityEvidenceSnapshot;
      readonly progress: QualityProgress;
      readonly permit: CommittedJudgeDispatchPermit;
      readonly projection: QualityEpochProjection;
    }
  | {
      readonly kind: "REPAIR_STALLED";
      readonly snapshot: QualityEvidenceSnapshot;
      readonly progress: QualityProgress;
      readonly projection: QualityEpochProjection;
    }
  | {
      readonly kind: "CONFLICT" | "INCOMPLETE";
      readonly reason: string;
      readonly snapshot: QualityEvidenceSnapshot;
      readonly progress: QualityProgress;
      readonly projection: QualityEpochProjection;
    };

export type QualityJudgeResult =
  | { readonly kind: "replanned"; readonly projection: QualityEpochProjection }
  | { readonly kind: "replan-pending"; readonly request: QualityReplanRequest }
  | { readonly kind: "REPAIR_STALLED"; readonly projection: QualityEpochProjection }
  | { readonly kind: "AWAITING_HUMAN" | "CONFLICT" | "INCOMPLETE"; readonly reason: string };

export interface QualityRepairStatusEnvelope {
  readonly outcome: "active" | "parked";
  readonly qualityScopeId: string;
  readonly qualityEpochId: string;
  readonly pattern: QualityNonProgressPattern | null;
  readonly threshold: number;
  readonly consecutiveNonProgress: number;
  readonly replanSinceLastProgress: boolean;
  readonly unresolvedObligationIds: readonly string[];
  readonly evidenceFingerprint: string | null;
  readonly replanBasis: string | null;
  readonly stopReason: "REPAIR_STALLED" | null;
  readonly workflowExecutionState: "running" | "suspended";
  readonly grantExplanation: "quality-repair-does-not-modify-grants";
  readonly resumeCondition: RepairStalledResumeCondition;
}

function emptyResumeCondition(qualityScopeId: string): RepairStalledResumeCondition {
  return {
    kind: "any-of",
    alternatives: [
      { kind: "evidence-change", identity: qualityStableId("quality-resume-evidence", qualityScopeId) },
      { kind: "human-retry", identity: qualityStableId("quality-resume-human", qualityScopeId) },
    ],
  };
}

function runtimeProjection(
  partition: LoopMonitorPartition,
  epoch: QualityEpochProjection,
  snapshot: QualityEvidenceSnapshot,
  progress: QualityProgress,
  previous: QualityRuntimeProjection | null,
): QualityRuntimeProjection {
  return {
    qualityScopeId: snapshot.qualityScopeId,
    partition,
    epoch,
    latestSnapshot: snapshot,
    lastProgress: progress,
    observationSequence: (previous?.observationSequence ?? 0) + 1,
    stalledLatch: null,
    workflowExecutionState: "running",
    lastReplanReceipt: previous?.lastReplanReceipt ?? null,
    pendingReplan: previous?.pendingReplan ?? null,
  };
}

function progressPattern(progress: QualityProgress | null): QualityNonProgressPattern | null {
  return progress?.kind === "threshold" ? progress.pattern : null;
}

export function renderQualityRepairStatus(status: QualityRepairStatusEnvelope): string {
  return [
    `Quality Repair: ${status.qualityScopeId}`,
    `Outcome: ${status.outcome}`,
    `Epoch: ${status.qualityEpochId}`,
    `Progress: ${status.consecutiveNonProgress}/${status.threshold}`,
    `Pattern: ${status.pattern ?? "none"}`,
    `Workflow: ${status.workflowExecutionState}`,
    `Stop reason: ${status.stopReason ?? "none"}`,
    `Resume: any-of[${status.resumeCondition.alternatives.map((item) => item.kind).join(",")}]`,
  ].join("\n");
}

export function projectQualityRepairStatus(
  projection: QualityRuntimeProjection,
): QualityRepairStatusEnvelope {
  const latch = projection.stalledLatch;
  return {
    outcome: latch === null ? "active" : "parked",
    qualityScopeId: projection.qualityScopeId,
    qualityEpochId: projection.epoch.qualityEpochId,
    pattern: latch?.pattern ?? progressPattern(projection.lastProgress),
    threshold: projection.epoch.threshold,
    consecutiveNonProgress: projection.epoch.consecutiveNonProgress,
    replanSinceLastProgress: projection.epoch.replanSinceLastProgress,
    unresolvedObligationIds: projection.latestSnapshot?.unresolved.map((item) => item.obligationId) ?? [],
    evidenceFingerprint: projection.latestSnapshot?.snapshotFingerprint ?? null,
    replanBasis: latch?.replanBasis ?? projection.lastReplanReceipt?.planDigest ?? null,
    stopReason: latch === null ? null : "REPAIR_STALLED",
    workflowExecutionState: projection.workflowExecutionState,
    grantExplanation: "quality-repair-does-not-modify-grants",
    resumeCondition: latch?.resumeCondition ?? emptyResumeCondition(projection.qualityScopeId),
  };
}

function createPartition(snapshot: QualityEvidenceSnapshot): LoopMonitorPartition {
  return {
    intentUuid: snapshot.intentUuid,
    monitorId: snapshot.monitorId,
    stageInstanceId: snapshot.stageInstanceId,
    graphRevision: snapshot.graphRevision,
  };
}

function qualityDelivery(
  activation: ActiveQualityActivation,
  runtime: QualityRuntimeProjection,
  plan: QualityDeliveryPlan,
  eventId: "QUALITY_CHECK" | "QUALITY_NON_PROGRESS" | "QUALITY_STRICT_PROGRESS",
  predecessorDeliveryId: string | null,
  trace: LoopTraceContext,
) {
  const monitor = activation.graph.loopMonitors[0]!;
  const routeConstraint = plan.routeIds.length === 0
    ? monitor.routeConstraint
    : createJudgeRouteConstraint(monitor, plan.routeIds);
  const snapshot = runtime.latestSnapshot!;
  return createLoopDelivery({
    partition: runtime.partition,
    eventId,
    predecessorDeliveryId,
    upstreamEventIdentity: qualityStableId("quality-observation", [
      runtime.epoch.qualityEpochId,
      runtime.observationSequence,
      eventId,
    ]),
    payloadFingerprint: qualityDigest([
      snapshot.snapshotFingerprint,
      plan.progress,
      eventId,
    ]),
    payload: {
      stageId: snapshot.stageInstanceId,
      references: [{
        kind: "quality-snapshot",
        id: qualityStableId("snapshot", snapshot.snapshotFingerprint),
        digest: snapshot.snapshotFingerprint,
      }],
    },
    evidence: {
      fingerprint: snapshot.snapshotFingerprint,
      obligationIds: snapshot.unresolved.map((item) => item.obligationId),
    },
    routeConstraint,
    trace,
  });
}

export interface QualityRepairCoordinator {
  recordEvidence(input: QualityEvidenceBatchInput, trace: LoopTraceContext): QualityObserveResult;
  dispatchJudge(
    permit: CommittedJudgeDispatchPermit,
    judgePort: JudgePort,
    replanPort: QualityReplanPort,
  ): QualityJudgeResult;
  resumeReplan(qualityScopeId: string, replanPort: QualityReplanPort): QualityJudgeResult;
  resume(request: {
    readonly qualityScopeId: string;
    readonly alternativeIdentity: string;
    readonly humanRetry?: VerifiedHumanTurn;
    readonly evidence?: QualityEvidenceBatchInput;
  }):
    | { readonly kind: "resumed"; readonly projection: QualityEpochProjection }
    | { readonly kind: "CONFLICT" | "INCOMPLETE"; readonly reason: string };
  authorizeLiveSmoke(
    qualityScopeId: string,
    scopeDigest: string,
    port: LiveAuthorizationPort,
  ): ReturnType<ReturnType<typeof createLoopMonitorCoordinator>["authorizeLiveSmoke"]>;
  status(qualityScopeId: string): QualityRepairStatusEnvelope | null;
}

export function createQualityRepairCoordinator(options: {
  readonly activation: ActiveQualityActivation;
  readonly repository: QualityRepairRepository;
}): QualityRepairCoordinator {
  const { activation, repository } = options;
  const loop = createLoopMonitorCoordinator({ graph: activation.graph, repository: repository.loopRepository });
  const threshold = activation.graph.loopMonitors[0]!.threshold;

  function readByPartition(partition: LoopMonitorPartition): QualityRuntimeProjection | null {
    for (const transaction of repository.readTransactions()) {
      const candidate = foldQualityProjection(repository.readTransactions(), transaction.qualityScopeId);
      if (candidate !== null && loopMonitorPartitionKey(candidate.partition) === loopMonitorPartitionKey(partition)) {
        return candidate;
      }
    }
    return null;
  }

  function status(qualityScopeId: string): QualityRepairStatusEnvelope | null {
    const projection = repository.readProjection(qualityScopeId);
    return projection === null ? null : projectQualityRepairStatus(projection);
  }

  function completeReplan(
    qualityScopeId: string,
    request: QualityReplanRequest,
    receipt: QualityReplanReceipt,
  ): QualityJudgeResult {
    const current = repository.readProjection(qualityScopeId);
    if (current === null || current.pendingReplan?.attemptIdentity !== request.attemptIdentity) {
      return { kind: "CONFLICT", reason: "quality-replan-attempt-not-pending" };
    }
    const recorded = recordQualityReplan(current.epoch, receipt);
    const projection: QualityRuntimeProjection = {
      ...current,
      epoch: recorded.nextProjection,
      lastReplanReceipt: receipt,
      pendingReplan: null,
    };
    repository.transaction(qualityScopeId, (appendQuality) => {
      appendQuality({
        type: "QUALITY_REPLAN_RECORDED",
        replanId: recorded.replanId,
        receipt,
        projection,
      });
    });
    return { kind: "replanned", projection: recorded.nextProjection };
  }

  function processReplanOutcome(
    request: QualityReplanRequest,
    outcome: QualityReplanDispatchResult,
    replanPort: QualityReplanPort,
  ): QualityJudgeResult {
    if (outcome.kind === "completed") {
      return completeReplan(request.qualityScopeId, request, outcome.receipt);
    }
    if (outcome.kind === "accepted") return { kind: "replan-pending", request };
    if (outcome.kind !== "no-effect-confirmed") {
      return { kind: "AWAITING_HUMAN", reason: `quality-replan-${outcome.kind}` };
    }
    if (request.attemptNo === 1) {
      return { kind: "AWAITING_HUMAN", reason: "quality-replan-attempts-exhausted" };
    }
    const current = repository.readProjection(request.qualityScopeId);
    if (current === null || current.pendingReplan?.attemptIdentity !== request.attemptIdentity) {
      return { kind: "CONFLICT", reason: "quality-replan-attempt-not-pending" };
    }
    const priorNoEffectReceiptDigest = qualityDigest([
      request.attemptIdentity,
      outcome.attestationId,
      request.qualityScopeId,
    ]);
    const successor: QualityReplanRequest = {
      ...request,
      attemptNo: 1,
      priorNoEffectReceiptDigest,
      attemptIdentity: qualityStableId("quality-replan-attempt", [
        request.replanId,
        1,
        priorNoEffectReceiptDigest,
      ]),
    };
    const projection: QualityRuntimeProjection = { ...current, pendingReplan: successor };
    repository.transaction(request.qualityScopeId, (appendQuality) => {
      appendQuality({
        type: "QUALITY_REPLAN_RESERVED",
        replanId: successor.replanId,
        judgeInvocationId: successor.judgeInvocationId,
        attemptNo: 1,
        projection,
      });
    });
    return processReplanOutcome(successor, replanPort.dispatch(successor), replanPort);
  }

  return {
    recordEvidence(input, trace) {
      const priorByInput = input.previousSnapshot === null
        ? null
        : repository.readProjection(input.previousSnapshot.qualityScopeId);
      if (priorByInput !== null && priorByInput.latestSnapshot !== null &&
        priorByInput.latestSnapshot.snapshotFingerprint !== input.previousSnapshot?.snapshotFingerprint) {
        const snapshot = priorByInput.latestSnapshot;
        return {
          kind: "CONFLICT",
          reason: "quality-previous-snapshot-not-current",
          snapshot,
          progress: priorByInput.lastProgress!,
          projection: priorByInput.epoch,
        };
      }
      const normalized = normalizeQualityEvidence(input);
      if (!normalized.ok) {
        throw new Error(`quality-evidence-${normalized.error.code}:${normalized.error.message}`);
      }
      const snapshot = normalized.snapshot;
      const prior = repository.readProjection(snapshot.qualityScopeId);
      if (prior?.stalledLatch !== null && prior !== null &&
        prior.stalledLatch.evidenceFingerprint === snapshot.snapshotFingerprint) {
        return {
          kind: "REPAIR_STALLED",
          snapshot: prior.latestSnapshot!,
          progress: prior.lastProgress!,
          projection: prior.epoch,
        };
      }
      const epoch = prior?.epoch ?? createQualityEpochProjection(snapshot, threshold);
      const plan = planQualityDelivery(epoch, snapshot);
      const partition = prior?.partition ?? createPartition(snapshot);
      const nextRuntime = runtimeProjection(partition, plan.nextProjection, snapshot, plan.progress, prior);
      return repository.transaction(snapshot.qualityScopeId, (appendQuality) => {
        appendQuality({
          type: "QUALITY_SNAPSHOT_OBSERVED",
          snapshotFingerprint: snapshot.snapshotFingerprint,
          progress: plan.progress,
          projection: nextRuntime,
        });
        const currentLoop = loop.readProjection(partition);
        const delivery = qualityDelivery(
          activation,
          nextRuntime,
          plan,
          plan.monitorEvent,
          currentLoop.chainHead,
          trace,
        );
        const observed = loop.observeDelivery(delivery);
        if (plan.progress.kind === "threshold") {
          if (observed.kind !== "judge-reserved") {
            return {
              kind: observed.kind === "INCOMPLETE" ? "INCOMPLETE" : "CONFLICT",
              reason: "quality-threshold-did-not-reserve-judge",
              snapshot,
              progress: plan.progress,
              projection: plan.nextProjection,
            };
          }
          return {
            kind: "judge-reserved",
            snapshot,
            progress: plan.progress,
            permit: observed.permit,
            projection: plan.nextProjection,
          };
        }
        if (observed.kind === "CONFLICT" || observed.kind === "INCOMPLETE") {
          return { kind: observed.kind, reason: observed.reason, snapshot, progress: plan.progress, projection: plan.nextProjection };
        }
        if (plan.progress.kind !== "strict-progress") {
          const action = qualityDelivery(
            activation,
            nextRuntime,
            plan,
            "QUALITY_NON_PROGRESS",
            delivery.deliveryId,
            trace,
          );
          const actionResult = loop.observeDelivery(action);
          if (actionResult.kind === "CONFLICT" || actionResult.kind === "INCOMPLETE") {
            return {
              kind: actionResult.kind,
              reason: actionResult.reason,
              snapshot,
              progress: plan.progress,
              projection: plan.nextProjection,
            };
          }
        }
        return { kind: "repair", snapshot, progress: plan.progress, projection: plan.nextProjection };
      });
    },

    dispatchJudge(permit, judgePort, replanPort) {
      const prior = readByPartition(permit.partition);
      if (prior === null || prior.latestSnapshot === null) return { kind: "CONFLICT", reason: "quality-projection-not-found" };
      const judgeResult = repository.transaction(prior.qualityScopeId, (appendQuality) => {
        const result = loop.dispatchJudge(permit, judgePort);
        if (result.kind === "latched") {
          const progress = prior.lastProgress;
          if (progress?.kind !== "threshold" || progress.requiredRoute !== "repair-stalled") {
            return { result: { kind: "CONFLICT", reason: "quality-stall-route-out-of-order" } as QualityJudgeResult, request: null };
          }
          const latch: RepairStalledLatch = {
            qualityEpochId: prior.epoch.qualityEpochId,
            evidenceFingerprint: prior.latestSnapshot!.snapshotFingerprint,
            unresolvedObligationIds: prior.latestSnapshot!.unresolved.map((item) => item.obligationId),
            verifierSuccessReceipts: prior.latestSnapshot!.verifierSuccessReceipts,
            pattern: progress.pattern,
            judgeInvocationId: permit.invocationId,
            replanBasis: prior.lastReplanReceipt?.planDigest ?? null,
            resumeCondition: emptyResumeCondition(prior.qualityScopeId),
          };
          const projection: QualityRuntimeProjection = {
            ...prior,
            stalledLatch: latch,
            workflowExecutionState: "suspended",
          };
          appendQuality({ type: "REPAIR_STALLED", latch, projection });
          return { result: { kind: "REPAIR_STALLED", projection: projection.epoch } as QualityJudgeResult, request: null };
        }
        if (result.kind !== "route-applied" || result.routeId !== "replan") {
          const reason = result.kind === "CONFLICT" || result.kind === "INCOMPLETE" || result.kind === "AWAITING_HUMAN"
            ? result.reason
            : "quality-judge-route-not-replan";
          const kind = result.kind === "AWAITING_HUMAN" ? "AWAITING_HUMAN" : "CONFLICT";
          return { result: { kind, reason } as QualityJudgeResult, request: null };
        }
        const replanId = qualityStableId("quality-replan", [
          prior.epoch.qualityEpochId,
          prior.latestSnapshot!.snapshotFingerprint,
          permit.invocationId,
        ]);
        const request: QualityReplanRequest = {
          replanId,
          qualityScopeId: prior.qualityScopeId,
          qualityEpochId: prior.epoch.qualityEpochId,
          triggerSnapshotFingerprint: prior.latestSnapshot!.snapshotFingerprint,
          judgeInvocationId: permit.invocationId,
          attemptNo: 0,
          attemptIdentity: qualityStableId("quality-replan-attempt", [replanId, 0, null]),
          priorNoEffectReceiptDigest: null,
        };
        const projection: QualityRuntimeProjection = { ...prior, pendingReplan: request };
        appendQuality({
          type: "QUALITY_REPLAN_RESERVED",
          replanId,
          judgeInvocationId: permit.invocationId,
          attemptNo: 0,
          projection,
        });
        return { result: null, request };
      });
      if (judgeResult.result !== null) return judgeResult.result;
      const request = judgeResult.request!;
      return processReplanOutcome(request, replanPort.dispatch(request), replanPort);
    },

    resumeReplan(qualityScopeId, replanPort) {
      const projection = repository.readProjection(qualityScopeId);
      const request = projection?.pendingReplan;
      if (request === null || request === undefined) {
        return { kind: "CONFLICT", reason: "quality-replan-attempt-not-pending" };
      }
      return processReplanOutcome(request, replanPort.reconcile(request), replanPort);
    },

    resume(request) {
      const prior = repository.readProjection(request.qualityScopeId);
      if (prior === null || prior.stalledLatch === null || prior.latestSnapshot === null) {
        return { kind: "CONFLICT", reason: "quality-stalled-latch-not-found" };
      }
      const latch = prior.stalledLatch;
      const alternative = latch.resumeCondition.alternatives.find((item) => item.identity === request.alternativeIdentity);
      if (alternative === undefined) return { kind: "CONFLICT", reason: "quality-resume-alternative-mismatch" };
      let basis: "evidence-change" | "human-retry";
      let resumeEvidenceReceipt: string;
      let evidenceFingerprint: string | undefined;
      if (alternative.kind === "human-retry") {
        if (request.humanRetry?.verified !== true || request.humanRetry.eventType !== "HUMAN_TURN") {
          return { kind: "CONFLICT", reason: "quality-human-retry-not-verified" };
        }
        basis = "human-retry";
        resumeEvidenceReceipt = qualityDigest([request.humanRetry.turnId, alternative.identity]);
      } else {
        if (request.evidence === undefined) return { kind: "CONFLICT", reason: "quality-resume-evidence-missing" };
        const normalized = normalizeQualityEvidence(request.evidence);
        if (!normalized.ok) {
          return {
            kind: normalized.error.code === "INCOMPLETE" ? "INCOMPLETE" : "CONFLICT",
            reason: normalized.error.message,
          };
        }
        const candidateIds = new Set(normalized.snapshot.unresolved.map((item) => item.obligationId));
        const latchedIds = new Set(latch.unresolvedObligationIds);
        const strictSubset = candidateIds.size < latchedIds.size && [...candidateIds].every((id) => latchedIds.has(id));
        const newSuccess = normalized.snapshot.verifierSuccessReceipts.some((receipt) =>
          latchedIds.has(receipt.obligationId) && !latch.verifierSuccessReceipts.some(
            (priorReceipt) => priorReceipt.obligationId === receipt.obligationId &&
              priorReceipt.receiptDigest === receipt.receiptDigest,
          )
        );
        if (!strictSubset && !newSuccess) return { kind: "CONFLICT", reason: "quality-evidence-did-not-improve" };
        basis = "evidence-change";
        resumeEvidenceReceipt = qualityDigest(normalized.snapshot.verifierSuccessReceipts);
        evidenceFingerprint = normalized.snapshot.snapshotFingerprint;
      }
      const epochStartEventIdentity = qualityStableId("quality-epoch-start", [
        prior.epoch.qualityEpochId,
        alternative.identity,
        resumeEvidenceReceipt,
      ]);
      const template: QualityEvidenceSnapshot = {
        ...prior.latestSnapshot,
        epochStartEventIdentity,
        qualityEpochId: qualityStableId("quality-epoch", [prior.qualityScopeId, epochStartEventIdentity]),
      };
      const nextEpoch = createQualityEpochProjection(template, prior.epoch.threshold);
      const projection: QualityRuntimeProjection = {
        ...prior,
        epoch: nextEpoch,
        latestSnapshot: null,
        lastProgress: null,
        observationSequence: 0,
        stalledLatch: null,
        workflowExecutionState: "running",
        lastReplanReceipt: null,
        pendingReplan: null,
      };
      return repository.transaction(prior.qualityScopeId, (appendQuality) => {
        const cleared = loop.clearLatch({
          partition: prior.partition,
          evidenceFingerprint,
          humanRetry: basis === "human-retry" ? request.humanRetry : undefined,
        });
        if (cleared.kind !== "cleared") {
          return { kind: "CONFLICT", reason: "quality-loop-latch-clear-failed" } as const;
        }
        appendQuality({
          type: "QUALITY_EPOCH_STARTED",
          priorQualityEpochId: prior.epoch.qualityEpochId,
          satisfiedAlternativeIdentity: alternative.identity,
          resumeEvidenceReceipt,
          projection,
        });
        return { kind: "resumed", projection: nextEpoch } as const;
      });
    },

    authorizeLiveSmoke(qualityScopeId, scopeDigest, port) {
      const projection = repository.readProjection(qualityScopeId);
      if (projection === null) return { kind: "CONFLICT", reason: "quality-projection-not-found" };
      return repository.transaction(qualityScopeId, () =>
        loop.authorizeLiveSmoke(projection.partition, scopeDigest, port)
      );
    },

    status,
  };
}
