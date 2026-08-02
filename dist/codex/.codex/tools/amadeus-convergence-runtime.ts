// Durable adapter from hook/CLI surfaces to the audit-first budget coordinator.

import type {
  BudgetKind,
  BudgetPolicyV1,
  TerminationReasonV1,
} from "./amadeus-convergence-policy.ts";
import {
  createAuditExecutionRepository,
  createExecutionLifecycleCoordinator,
  type ExecutionProjectionSink,
} from "./amadeus-execution-lifecycle.ts";

export interface StageBudgetReserveRequest {
  readonly projectDir: string;
  readonly intentUuid: string;
  readonly stageSlug: string;
  readonly stageInstanceId: string;
  readonly revision: number;
  readonly agent: string;
  readonly budgetKind: BudgetKind;
  readonly subjectId: string;
  readonly policy: BudgetPolicyV1;
  readonly lastDurableProgress: string;
  readonly deliveryIdentity?: string;
  readonly deduplicateDelivery?: boolean;
}

export type StageBudgetReserveResult =
  | {
      readonly kind: "reserved";
      readonly rootOperationId: string;
      readonly consumed: number;
      readonly cap: number;
      readonly remaining: number;
    }
  | {
      readonly kind: "exhausted";
      readonly termination: TerminationReasonV1;
    }
  | {
      readonly kind: "refused";
      readonly reason: string;
    };

const unusedProjectionSink: ExecutionProjectionSink = {
  projectRequired() {
    throw new Error("budget reservation does not issue native start permits");
  },
  rebuildRequired() {
    throw new Error("budget reservation does not rebuild projections");
  },
  projectTelemetry() {
    return { projected: false };
  },
};

function monotonicNowMs(): number | null {
  return typeof performance === "undefined" ? null : performance.now();
}

export function reserveStageBudget(
  request: StageBudgetReserveRequest,
): StageBudgetReserveResult {
  const repository = createAuditExecutionRepository(request.projectDir);
  const coordinator = createExecutionLifecycleCoordinator({
    repository,
    projectionSink: unusedProjectionSink,
    clock: {
      wallNow: () => new Date().toISOString(),
      monotonicNowMs,
    },
  });
  const started = coordinator.startOperation({
    idempotencyKey: `stage-root:${request.intentUuid}:${request.stageInstanceId}:${request.revision}`,
    input: {
      intentUuid: request.intentUuid,
      stageSlug: request.stageSlug,
      stageInstanceId: request.stageInstanceId,
      revision: request.revision,
      kind: "stage",
      origin: {
        stage: request.stageSlug,
        agent: request.agent,
        tool: "amadeus-orchestrate",
      },
    },
  });
  if (!started.ok) return { kind: "refused", reason: started.error.kind };

  const projection = coordinator.readProjection({
    rootOperationId: started.value.operation.rootOperationId,
  });
  const consumed = projection.reservations.filter(
    (reservation) =>
      reservation.budget?.subject.rootOperationId === started.value.operation.rootOperationId &&
      reservation.budget.subject.kind === request.budgetKind &&
      reservation.budget.subject.subjectId === request.subjectId,
  ).length;
  const ordinal = consumed + 1;
  const deliveryIdentity = request.deliveryIdentity ?? "delivery";
  const idempotencyParts = [
    "budget",
    request.budgetKind,
    request.subjectId,
    deliveryIdentity,
  ];
  if (!request.deduplicateDelivery) idempotencyParts.push(String(ordinal));
  const reserved = coordinator.reserveExecution({
    operationId: started.value.operation.operationId,
    idempotencyKey: idempotencyParts.join(":"),
    budgetKind: request.budgetKind,
    subjectId: request.subjectId,
    semanticAttemptOrdinal: request.deduplicateDelivery ? 0 : ordinal,
    policy: request.policy,
    lastDurableProgress: request.lastDurableProgress,
  });
  if (!reserved.ok) {
    return reserved.error.kind === "budget-exhausted"
      ? { kind: "exhausted", termination: reserved.error.termination }
      : { kind: "refused", reason: reserved.error.kind };
  }
  const value = reserved.value.budget?.value;
  if (value === undefined) return { kind: "refused", reason: "state-inconsistent" };
  return {
    kind: "reserved",
    rootOperationId: started.value.operation.rootOperationId,
    consumed: value,
    cap: request.policy.effectiveCap,
    remaining: request.policy.effectiveCap - value,
  };
}
