// Fail-closed orchestration for one exact native attempt recovery.

import { digestValue, hasExactKeys, nonEmptyString } from "./amadeus-swarm-canonical.ts";
import type { AttemptCheckpoint } from "./amadeus-swarm-driver-lifecycle.ts";
import type { AttemptRecoveryPort } from "./amadeus-swarm-driver-runtime.ts";
import type {
  NativeDispatchCheckpoint,
  NativeDispatchPreparation,
  PreparedNativeRun,
} from "./amadeus-swarm-native-execution.ts";
import type {
  ContextualNativeProcessPort,
  NativeProcessRecoveryReceipt,
  NativeProcessRecoveryTarget,
} from "./amadeus-swarm-native-process.ts";
import type {
  NativeResourceCleanupReceipt,
  NativeResourceRecoveryTarget,
  NativeResourceSupervisor,
} from "./amadeus-swarm-native-resources.ts";

export type NativeAttemptProcessRecoveryPort = Pick<
  ContextualNativeProcessPort,
  "recoverAttempt" | "disposeRecoveredAttempt"
>;

export type NativeAttemptResourceRecoveryPort = Pick<NativeResourceSupervisor, "recoverAttempt">;

export type NativeAttemptRecoveryPorts = Readonly<{
  process: NativeAttemptProcessRecoveryPort;
  resources: NativeAttemptResourceRecoveryPort;
}>;

type NativeRecoveryContext = Readonly<{
  dispatchPreparation: NativeDispatchPreparation;
  preparedNativeRun?: PreparedNativeRun;
  dispatch?: NativeDispatchCheckpoint;
}>;

type ExactRecoveryTarget = Readonly<{
  process: NativeProcessRecoveryTarget;
  resources: Omit<NativeResourceRecoveryTarget, "fencingToken" | "processIdentityDigest">;
  resourceFencingToken: number;
  resourcesMustExist: boolean;
  processMustBeStopped: boolean;
  expectedResourceReceiptDigest: string | null;
}>;

function checkpointRecoveryContext(checkpoint: AttemptCheckpoint): NativeRecoveryContext | null {
  if (checkpoint.state === "failed-resumable") {
    return checkpoint.failure.recoveryContext ?? null;
  }
  if (checkpoint.state !== "prepared" && checkpoint.state !== "dispatched") return null;
  if (!checkpoint.dispatchPreparation) return null;
  return Object.freeze({
    dispatchPreparation: checkpoint.dispatchPreparation,
    ...(checkpoint.preparedNativeRun ? { preparedNativeRun: checkpoint.preparedNativeRun } : {}),
    ...(checkpoint.state === "dispatched" && checkpoint.dispatch.kind === "native"
      ? { dispatch: checkpoint.dispatch }
      : {}),
  });
}

function preparationShapeMatches(preparation: NativeDispatchPreparation): boolean {
  return preparation.kind === "native" &&
    nonEmptyString(preparation.nativeRunId) &&
    nonEmptyString(preparation.planDigest) &&
    nonEmptyString(preparation.resourcePreparationDigest) &&
    nonEmptyString(preparation.armDigest) &&
    nonEmptyString(preparation.runEpochDigest);
}

function preparationCorrelationsMatch(
  checkpoint: AttemptCheckpoint,
  preparation: NativeDispatchPreparation,
): boolean {
  if (
    checkpoint.recoveryClaim === undefined ||
    checkpoint.recoveryClaim.recoveredTransitionId !== undefined ||
    preparation.fencingToken !== checkpoint.recoveryClaim.resourceFencingToken
  ) return false;
  const expectedWaveDigest = digestValue({
    index: preparation.waveIndex,
    units: checkpoint.selectionInput.expectedUnits,
  });
  const expectedCaptureIdentityDigest = digestValue({
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    attemptNonceHash: checkpoint.nonceHash,
    planDigest: preparation.planDigest,
    waveIndex: preparation.waveIndex,
    waveDigest: preparation.waveDigest,
  });
  return preparation.waveDigest === expectedWaveDigest &&
    preparation.captureIdentityDigest === expectedCaptureIdentityDigest;
}

function activeCheckpointPlanMatches(
  checkpoint: AttemptCheckpoint,
  preparation: NativeDispatchPreparation,
): boolean {
  return !(
    (checkpoint.state === "prepared" || checkpoint.state === "dispatched") &&
    (checkpoint.selectedContext.selection.kind !== "native-selection" ||
      checkpoint.selectedContext.planDigest !== preparation.planDigest)
  );
}

function failureStateMatches(checkpoint: AttemptCheckpoint, hasDispatch: boolean): boolean {
  if (checkpoint.state !== "failed-resumable") return true;
  return checkpoint.failure.failedFromState === "prepared" ||
    (hasDispatch && checkpoint.failure.failedFromState === "dispatched");
}

function dispatchCoreBindingsMatch(
  preparation: NativeDispatchPreparation,
  prepared: PreparedNativeRun,
  dispatch: NativeDispatchCheckpoint,
): boolean {
  return dispatch.nativeRunId === preparation.nativeRunId &&
    dispatch.armDigest === preparation.armDigest &&
    dispatch.preparedNativeRunDigest === digestValue(prepared) &&
    dispatch.resourceReceiptDigest === prepared.resourceReceiptDigest;
}

function dispatchCaptureBindingsMatch(
  preparation: NativeDispatchPreparation,
  prepared: PreparedNativeRun,
  dispatch: NativeDispatchCheckpoint,
): boolean {
  return dispatch.capture.identityDigest === preparation.captureIdentityDigest &&
    dispatch.capture.capturePlanDigest === prepared.capturePlanDigest &&
    dispatch.capture.resourcesDigest === prepared.resourceReceiptDigest &&
    dispatch.capture.transport === prepared.transportKind &&
    dispatch.capture.kind === prepared.captureKind &&
    (dispatch.capture.kind !== "fixed-provider-path" ||
      dispatch.capture.binding.sourcePlanDigest === preparation.resourcePreparationDigest);
}

function contextBindingsMatch(
  checkpoint: AttemptCheckpoint,
  context: NativeRecoveryContext,
): boolean {
  const { dispatchPreparation: preparation, preparedNativeRun: prepared, dispatch } = context;
  if (!preparationShapeMatches(preparation)) return false;
  if (!preparationCorrelationsMatch(checkpoint, preparation)) return false;
  if (!activeCheckpointPlanMatches(checkpoint, preparation)) return false;
  if (!failureStateMatches(checkpoint, dispatch !== undefined)) return false;
  if (prepared && prepared.dispatchPreparationDigest !== digestValue(preparation)) return false;
  if (!dispatch) return true;
  return prepared !== undefined &&
    dispatchCoreBindingsMatch(preparation, prepared, dispatch) &&
    dispatchCaptureBindingsMatch(preparation, prepared, dispatch);
}

function exactRecoveryTarget(checkpoint: AttemptCheckpoint): ExactRecoveryTarget | null {
  const context = checkpointRecoveryContext(checkpoint);
  if (!context || !contextBindingsMatch(checkpoint, context)) return null;
  const { dispatchPreparation: preparation, preparedNativeRun: prepared, dispatch } = context;
  const process = Object.freeze({
    kind: "native-process-recovery" as const,
    schemaVersion: 1 as const,
    nativeRunId: preparation.nativeRunId,
    armDigest: preparation.armDigest,
    runEpochDigest: preparation.runEpochDigest,
    processIdentityDigest: dispatch?.processIdentityDigest ?? null,
  });
  const resources = Object.freeze({
    kind: "native-resource-recovery" as const,
    schemaVersion: 1 as const,
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    attemptNonceHash: checkpoint.nonceHash,
    planDigest: preparation.planDigest,
    waveIndex: preparation.waveIndex,
    waveDigest: preparation.waveDigest,
    nativeRunId: preparation.nativeRunId,
    preparationDigest: preparation.resourcePreparationDigest,
  });
  return Object.freeze({
    process,
    resources,
    resourceFencingToken: checkpoint.recoveryClaim!.resourceFencingToken,
    resourcesMustExist: prepared !== undefined,
    processMustBeStopped: dispatch !== undefined,
    expectedResourceReceiptDigest: prepared?.resourceReceiptDigest ?? dispatch?.resourceReceiptDigest ?? null,
  });
}

function digestFieldMatches(value: Readonly<Record<string, unknown>>, field: string): boolean {
  const digest = value[field];
  const semantic = { ...value };
  delete semantic[field];
  return typeof digest === "string" && digest === digestValue(semantic);
}

function processReceiptMatches(
  target: NativeProcessRecoveryTarget,
  status: "unarmed" | "stopped",
  receipt: NativeProcessRecoveryReceipt,
): boolean {
  if (!hasExactKeys(receipt, [
    "kind",
    "schemaVersion",
    "targetDigest",
    "nativeRunId",
    "armDigest",
    "runEpochDigest",
    "processIdentityDigest",
    "disposition",
    "receiptDigest",
  ])) return false;
  const identityMatches = status === "unarmed"
    ? target.processIdentityDigest === null && receipt.processIdentityDigest === null
    : nonEmptyString(receipt.processIdentityDigest) &&
      (target.processIdentityDigest === null || target.processIdentityDigest === receipt.processIdentityDigest);
  return receipt.kind === "native-process-recovery-receipt" &&
    receipt.schemaVersion === 1 &&
    receipt.disposition === status &&
    receipt.targetDigest === digestValue(target) &&
    receipt.nativeRunId === target.nativeRunId &&
    receipt.armDigest === target.armDigest &&
    receipt.runEpochDigest === target.runEpochDigest &&
    identityMatches &&
    digestFieldMatches(receipt, "receiptDigest");
}

function resourceReceiptMatches(
  target: NativeResourceRecoveryTarget,
  expectedResourceReceiptDigest: string | null,
  receipt: NativeResourceCleanupReceipt,
): boolean {
  if (!hasExactKeys(receipt, [
    "kind",
    "schemaVersion",
    "targetDigest",
    "nativeRunId",
    "resourceReceiptDigest",
    "cleanupScopeDigest",
    "disposition",
    "receiptDigest",
  ])) return false;
  return receipt.kind === "native-resource-cleanup-receipt" &&
    receipt.schemaVersion === 1 &&
    receipt.targetDigest === digestValue(target) &&
    receipt.nativeRunId === target.nativeRunId &&
    (expectedResourceReceiptDigest === null ||
      receipt.resourceReceiptDigest === expectedResourceReceiptDigest) &&
    receipt.disposition === "cleaned" &&
    nonEmptyString(receipt.cleanupScopeDigest) &&
    digestFieldMatches(receipt, "receiptDigest");
}

function disposalReceiptMatches(
  target: NativeProcessRecoveryTarget,
  recoveryReceipt: NativeProcessRecoveryReceipt,
  result: Awaited<ReturnType<NativeAttemptProcessRecoveryPort["disposeRecoveredAttempt"]>>,
): boolean {
  if (result.status !== "disposed") return false;
  const { receipt } = result;
  if (!hasExactKeys(receipt, [
    "kind",
    "schemaVersion",
    "disposalId",
    "targetDigest",
    "recoveryReceiptDigest",
    "nativeRunId",
    "runEpochDigest",
    "disposition",
    "receiptDigest",
  ])) return false;
  return receipt.kind === "native-process-disposal-receipt" &&
    receipt.schemaVersion === 1 &&
    nonEmptyString(receipt.disposalId) &&
    receipt.targetDigest === digestValue(target) &&
    receipt.recoveryReceiptDigest === recoveryReceipt.receiptDigest &&
    receipt.nativeRunId === target.nativeRunId &&
    receipt.runEpochDigest === target.runEpochDigest &&
    receipt.disposition === "disposed" &&
    digestValue(result.recoveryReceipt) === digestValue(recoveryReceipt) &&
    digestFieldMatches(receipt, "receiptDigest");
}

type ProcessRecoveryResult = Awaited<ReturnType<NativeAttemptProcessRecoveryPort["recoverAttempt"]>>;
type RecoveredProcess = Exclude<ProcessRecoveryResult, Readonly<{ status: "unknown" }>>;
type ResourceRecoveryResult = Awaited<ReturnType<NativeAttemptResourceRecoveryPort["recoverAttempt"]>>;

function processResultMatches(
  target: ExactRecoveryTarget,
  result: ProcessRecoveryResult,
): result is RecoveredProcess {
  if (result.status === "unknown") return false;
  if (target.processMustBeStopped && result.status !== "stopped") return false;
  if (!target.resourcesMustExist && result.status !== "unarmed") return false;
  return processReceiptMatches(target.process, result.status, result.receipt);
}

function resourceTargetFor(
  target: ExactRecoveryTarget,
  process: RecoveredProcess,
): NativeResourceRecoveryTarget {
  return Object.freeze({
    ...target.resources,
    fencingToken: process.status === "stopped" ? target.resourceFencingToken : null,
    processIdentityDigest: process.receipt.processIdentityDigest,
  });
}

function resourceResultMatches(
  target: ExactRecoveryTarget,
  processStatus: RecoveredProcess["status"],
  resourceTarget: NativeResourceRecoveryTarget,
  result: ResourceRecoveryResult,
): boolean {
  if (result.status === "unknown") return false;
  if (result.status === "absent") {
    return !target.resourcesMustExist && processStatus === "unarmed";
  }
  return resourceReceiptMatches(
    resourceTarget,
    target.expectedResourceReceiptDigest,
    result.receipt,
  );
}

async function recoverExactAttempt(
  ports: NativeAttemptRecoveryPorts,
  target: ExactRecoveryTarget,
): Promise<"recovered" | "unknown"> {
  try {
    const process = await ports.process.recoverAttempt(target.process);
    if (!processResultMatches(target, process)) return "unknown";
    const resourceTarget = resourceTargetFor(target, process);
    const resources = await ports.resources.recoverAttempt(resourceTarget);
    if (!resourceResultMatches(target, process.status, resourceTarget, resources)) return "unknown";
    const disposal = await ports.process.disposeRecoveredAttempt({
      target: target.process,
      recoveryReceipt: process.receipt,
    });
    return disposalReceiptMatches(target.process, process.receipt, disposal)
      ? "recovered"
      : "unknown";
  } catch {
    return "unknown";
  }
}

export function createNativeAttemptRecovery(ports: NativeAttemptRecoveryPorts): AttemptRecoveryPort {
  return Object.freeze({
    async recover({ checkpoint, observedOwner }) {
      if (observedOwner !== null) return "active";
      const target = exactRecoveryTarget(checkpoint);
      return target ? await recoverExactAttempt(ports, target) : "unknown";
    },
  });
}
