// Composition root and stateful coordinator for the shared swarm-driver lifecycle.

import { randomUUID } from "node:crypto";
import {
  DriverRegistrationSet,
  type DriverAdapter,
  type DriverPlan,
  type DriverRegistrationSet as DriverRegistrationSetValue,
  type LaunchInput,
  type NormalizeContext,
  type PreparedUnit,
} from "./amadeus-swarm-driver-adapter-contract.ts";
import {
  NATIVE_DRIVER_VALUES,
  ProbeResult,
  HARNESS_VALUES,
  type CapabilityRow,
  type DriverRequest as DriverRequestValue,
  type FloorDriver,
  type Harness,
  type LegacyExecution,
  type NativeDriver,
  type ProbeResult as ProbeResultValue,
  type RedactedSelection,
  type SelectorError,
  type SwarmEnvironment,
  type TopologyDecision as TopologyDecisionValue,
} from "./amadeus-swarm-driver-contract.ts";
import {
  ATTEMPT_HEARTBEAT_MS,
  ATTEMPT_LEASE_MS,
  applyTransition,
  buildTransition,
  buildDispatchDigest,
  buildFinalizeRequestBinding,
  buildRunRequestBinding,
  canonicalPreparedUnits,
  createProbingCheckpoint,
  digestValue,
  validateRefereeEnvelope,
  verifyNativeEvidence,
  type AttemptCheckpoint,
  type AttemptFailureCode,
  type AttemptState,
  type AttemptTransition,
  type CheckpointWithoutDigest,
  type FinalizeRequestBinding,
  type RefereeFinalizeEnvelope,
  type RunGitBindingInput,
  type RunRequestBinding,
  type VerifiedExecutionResult,
} from "./amadeus-swarm-driver-lifecycle.ts";
import {
  AttemptStoreError,
  createFileDriverAttemptStore,
  type DriverAttemptStore,
} from "./amadeus-swarm-driver-store.ts";
import {
  candidateChain,
  classifyTopology,
  parseDriverRequest,
  selectDriver,
} from "./amadeus-swarm-driver-selector.ts";
import { claudeDriverRegistration } from "./amadeus-swarm-driver-adapters/claude.ts";
import { codexDriverRegistration } from "./amadeus-swarm-driver-adapters/codex.ts";
import { kiroDriverRegistration } from "./amadeus-swarm-driver-adapters/kiro.ts";
import {
  observeExactProcessLiveness,
  observeProcessIdentity,
  type ProcessIdentity,
  type ProcessLivenessObservation,
} from "./amadeus-armed-process.ts";
import type {
  LifecycleNativeExecution,
  NativeDispatchCheckpoint,
  NativeDispatchPreparation,
  NativeLifecycleExecutionInput,
} from "./amadeus-swarm-native-execution.ts";

export type RuntimeError = Readonly<{
  code:
    | "INPUT_INVALID"
    | "SELECTION_FAILED"
    | "EXPLICIT_DRIVER_UNAVAILABLE"
    | "CHECKPOINT_STATE_INVALID"
    | "REGISTRATION_UNAVAILABLE"
    | "PREPARED_MANIFEST_INVALID"
    | "EXECUTION_FAILED"
    | "EVIDENCE_INVALID"
    | "FINALIZE_BINDING_INVALID"
    | "ATTEMPT_LEASE_ACTIVE"
    | "ATTEMPT_LIVENESS_UNKNOWN";
  selectorError?: SelectorError;
}>;

export type RuntimeResult<T> =
  | Readonly<{ type: "ok"; value: T }>
  | Readonly<{ type: "err"; error: RuntimeError }>;

function ok<T>(value: T): RuntimeResult<T> {
  return Object.freeze({ type: "ok", value });
}

function err(code: RuntimeError["code"], selectorError?: SelectorError): RuntimeResult<never> {
  return Object.freeze({
    type: "err",
    error: Object.freeze({ code, ...(selectorError ? { selectorError } : {}) }),
  });
}

export type ResolveInput = Readonly<{
  harness: Harness;
  batch: number;
  units: readonly string[];
  topologySignals: readonly unknown[];
  selectionEnvironment: SwarmEnvironment;
  probeEnvironment?: Readonly<Record<string, string>>;
  projectDir: string;
  ownerId?: string;
}>;

export type ResolutionOutput = Readonly<{
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  state: "selected";
  selection: RedactedSelection;
  planDigest: string;
  probeDigest: string;
  expectedUnits: readonly string[];
}>;

export type NativeExecutionPort = LifecycleNativeExecution;

export type AttemptRecoveryPort = Readonly<{
  recover(input: Readonly<{
    checkpoint: AttemptCheckpoint;
    observedOwner: ProcessIdentity | null;
  }>): Promise<"recovered" | "active" | "unknown">;
}>;

export type AttemptOwnerLiveness = ProcessLivenessObservation;

export type ResumeRequest = Readonly<{
  batch: number;
  previousAttemptId: string;
  newAttemptId: string;
  nonceHash: string;
  leaseId: string;
  ownerId: string;
  mutationId: string;
  reusedConvergedUnits: readonly string[];
}>;

export type RuntimeAuditPort = Readonly<{
  evidence(input: Readonly<{
    executionId: string;
    attemptId: string;
    verdict: ReturnType<typeof verifyNativeEvidence>;
  }>): void;
}>;

export type AttemptHeartbeatTimer = Readonly<{
  start(callback: () => void, intervalMs: number): unknown;
  stop(handle: unknown): void;
}>;

export type SwarmDriverCoordinator = Readonly<{
  resolve(input: ResolveInput): Promise<RuntimeResult<ResolutionOutput>>;
  run(input: Readonly<{
    executionId: string;
    attemptId: string;
    batch: number;
    preparedUnits: readonly PreparedUnit[];
    convergenceCommand: string;
    protectedSpec?: string;
    evidenceDir: string;
    gitBinding: RunGitBindingInput;
  }>): Promise<RuntimeResult<VerifiedExecutionResult | FloorOrLegacyExecutionPlan>>;
  recordFloor(input: Readonly<{
    executionId: string;
    attemptId: string;
    batch: number;
    selected: FloorDriver;
    planDigest: string;
    completedUnits: readonly string[];
    resultDigest: string;
  }>): RuntimeResult<AttemptCheckpoint>;
  recordLegacy(input: Readonly<{
    executionId: string;
    attemptId: string;
    batch: number;
    execution: LegacyExecution;
    planDigest: string;
    completedUnits: readonly string[];
    resultDigest: string;
  }>): RuntimeResult<AttemptCheckpoint>;
  recordFinalizeRequest(binding: FinalizeRequestBinding): RuntimeResult<AttemptCheckpoint>;
  recordFinalizeResult(envelope: RefereeFinalizeEnvelope): RuntimeResult<AttemptCheckpoint>;
  resume(input: ResumeRequest): Promise<RuntimeResult<AttemptCheckpoint>>;
  status(batch: number): AttemptCheckpoint | null;
}>;

export type FloorOrLegacyExecutionPlan =
  | Readonly<{
      kind: "floor";
      executionId: string;
      attemptId: string;
      selected: FloorDriver;
      expectedUnits: readonly string[];
      planDigest: string;
    }>
  | Readonly<{
      kind: "legacy";
      executionId: string;
      attemptId: string;
      execution: LegacyExecution;
      expectedUnits: readonly string[];
      planDigest: string;
      warningCode: "AMADEUS_USE_SWARM_DEPRECATED";
    }>;

export const productionDriverRegistry: DriverRegistrationSetValue = (() => {
  const built = DriverRegistrationSet.build([
    claudeDriverRegistration,
    codexDriverRegistration,
    kiroDriverRegistration,
  ]);
  if (built.type === "err") throw new Error("Invalid production swarm-driver registry");
  for (const driver of NATIVE_DRIVER_VALUES) built.value.forDriver(driver);
  return built.value;
})();

function unavailableProbe(): ProbeResultValue {
  const result = ProbeResult.build({
    status: "unavailable",
    reason: "native-surface-unavailable",
    checks: [
      {
        name: "mode",
        ok: false,
        diagnosticCode: "NATIVE_SURFACE_UNAVAILABLE",
      },
    ],
  });
  if (result.type === "err") throw new Error("Invalid unavailable probe fixture");
  return result.value;
}

function withoutDigest<Checkpoint extends AttemptCheckpoint>(
  checkpoint: Checkpoint,
): Omit<Checkpoint, "stateDigest"> {
  const { stateDigest: _stateDigest, ...post } = checkpoint;
  return post;
}

function withoutDispatch(
  checkpoint: Extract<AttemptCheckpoint, Readonly<{ state: "dispatched" }>>,
): Omit<
  Extract<AttemptCheckpoint, Readonly<{ state: "dispatched" }>>,
  "stateDigest" | "dispatch" | "dispatchDigest" | "dispatchPreparation" | "preparedNativeRun"
> {
  const {
    dispatch: _dispatch,
    dispatchDigest: _dispatchDigest,
    dispatchPreparation: _dispatchPreparation,
    preparedNativeRun: _preparedNativeRun,
    ...post
  } = withoutDigest(checkpoint);
  return post;
}

function buildValidatedTransition<State extends AttemptState>(
  checkpoint: AttemptCheckpoint,
  transitionId: string,
  edge: Parameters<typeof buildTransition>[1]["edge"],
  post: Extract<CheckpointWithoutDigest, Readonly<{ state: State }>>,
): AttemptTransition {
  const transition = buildTransition(checkpoint, {
    transitionId,
    edge,
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    leaseId: checkpoint.lease.leaseId,
    fencingToken: checkpoint.lease.fencingToken,
    post,
  });
  if (transition.type === "err") throw new Error(`Invalid runtime transition: ${transition.error.code}`);
  const validated = applyTransition(checkpoint, transition.value);
  if (validated.type === "err") throw new Error(`Invalid runtime transition: ${validated.error.code}`);
  return transition.value;
}

function transitionTo<State extends AttemptState>(
  store: DriverAttemptStore,
  checkpoint: AttemptCheckpoint,
  transitionId: string,
  edge: Parameters<typeof buildTransition>[1]["edge"],
  post: Extract<CheckpointWithoutDigest, Readonly<{ state: State }>>,
): Extract<AttemptCheckpoint, Readonly<{ state: State }>> {
  const transition = buildValidatedTransition(checkpoint, transitionId, edge, post);
  return store.transition(transition) as Extract<AttemptCheckpoint, Readonly<{ state: State }>>;
}

function failureRecoveryDispatch(
  checkpoint: Extract<AttemptCheckpoint, Readonly<{ state: "prepared" | "dispatched" }>>,
  dispatchOverride: NativeDispatchCheckpoint | undefined,
): NativeDispatchCheckpoint | undefined {
  if (checkpoint.state === "dispatched") {
    return checkpoint.dispatch.kind === "native" ? checkpoint.dispatch : undefined;
  }
  return checkpoint.preparedNativeRun ? dispatchOverride : undefined;
}

function failureRecoveryContext(
  checkpoint: AttemptCheckpoint,
  dispatchPreparationOverride?: NativeDispatchPreparation,
  dispatchOverride?: NativeDispatchCheckpoint,
) {
  if (checkpoint.state !== "prepared" && checkpoint.state !== "dispatched") return undefined;
  const dispatchPreparation = checkpoint.dispatchPreparation ??
    (checkpoint.state === "prepared" ? dispatchPreparationOverride : undefined);
  if (!dispatchPreparation) return undefined;
  const dispatch = failureRecoveryDispatch(checkpoint, dispatchOverride);
  return Object.freeze({
    dispatchPreparation,
    ...(checkpoint.preparedNativeRun ? { preparedNativeRun: checkpoint.preparedNativeRun } : {}),
    ...(dispatch ? { dispatch } : {}),
  });
}

function failAttempt(
  store: DriverAttemptStore,
  checkpoint: AttemptCheckpoint,
  code: AttemptFailureCode,
  terminal: boolean,
  dispatchPreparationOverride?: NativeDispatchPreparation,
  dispatchOverride?: NativeDispatchCheckpoint,
): AttemptCheckpoint {
  if (["succeeded", "failed-resumable", "failed-terminal"].includes(checkpoint.state)) {
    throw new Error("Attempt is already terminal");
  }
  const failedFromState = checkpoint.state as Exclude<
    AttemptState,
    "succeeded" | "failed-resumable" | "failed-terminal"
  >;
  const recoveryContext = failureRecoveryContext(checkpoint, dispatchPreparationOverride, dispatchOverride);
  return transitionTo(store, checkpoint, randomUUID(), "attempt-failed", {
    schemaVersion: checkpoint.schemaVersion,
    state: terminal ? "failed-terminal" : "failed-resumable",
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    batch: checkpoint.batch,
    origin: checkpoint.origin,
    ...(checkpoint.origin === "resumed" ? { previousAttemptId: checkpoint.previousAttemptId } : {}),
    nonceHash: checkpoint.nonceHash,
    lease: checkpoint.lease,
    selectionInput: checkpoint.selectionInput,
    unitStates: checkpoint.unitStates,
    lastMutationId: checkpoint.lastMutationId,
    failure: {
      code,
      affectedUnits: checkpoint.selectionInput.expectedUnits,
      failedFromState,
      ...(recoveryContext ? { recoveryContext } : {}),
    },
  });
}

function failReconciledRunAttempt(input: Readonly<{
  store: DriverAttemptStore;
  batch: number;
  executionId: string;
  attemptId: string;
  leaseId: string;
  fencingToken: number;
  dispatchPreparation: NativeDispatchPreparation | undefined;
  dispatch: NativeDispatchCheckpoint | undefined;
}>): void {
  const checkpoint = input.store.readReconciled(input.batch);
  if (
    checkpoint?.executionId !== input.executionId ||
    checkpoint.attemptId !== input.attemptId ||
    checkpoint.lease.leaseId !== input.leaseId ||
    checkpoint.lease.fencingToken !== input.fencingToken
  ) {
    return;
  }
  failAttempt(
    input.store,
    checkpoint,
    "COORDINATOR_FAILED",
    false,
    input.dispatchPreparation,
    input.dispatch,
  );
}

function createDispatchPreparationCapture(): Readonly<{
  capture(preparation: NativeDispatchPreparation): void;
  read(): NativeDispatchPreparation | undefined;
}> {
  let captured: NativeDispatchPreparation | undefined;
  return Object.freeze({
    capture: (preparation) => {
      captured = Object.freeze({ ...preparation });
    },
    read: () => captured,
  });
}

function createNativeDispatchCapture(): Readonly<{
  capture(dispatch: NativeDispatchCheckpoint): void;
  read(): NativeDispatchCheckpoint | undefined;
}> {
  let captured: NativeDispatchCheckpoint | undefined;
  let capturedDigest: string | undefined;
  return Object.freeze({
    capture: (dispatch) => {
      const nextDigest = digestValue(dispatch);
      const next = Object.freeze({ ...dispatch });
      if (capturedDigest && capturedDigest !== nextDigest) {
        throw new Error("NATIVE_DISPATCH_CAPTURE_CONFLICT");
      }
      captured ??= next;
      capturedDigest ??= nextDigest;
    },
    read: () => captured,
  });
}

function exactUnits(expected: readonly string[], actual: readonly string[]): boolean {
  return digestValue([...new Set(expected)].sort()) === digestValue([...new Set(actual)].sort()) && actual.length === expected.length;
}

function selectedDriver(selection: RedactedSelection): NativeDriver | null {
  return selection.kind === "native-selection" ? selection.selected : null;
}

const TERMINAL_FINALIZE_FAILURE: Readonly<Record<AttemptFailureCode, boolean>> = Object.freeze({
  INPUT_INVALID: true,
  EXPLICIT_DRIVER_UNAVAILABLE: true,
  PERSISTENCE_FAILED: false,
  COORDINATOR_FAILED: false,
  NATIVE_EVIDENCE_INVALID: false,
  NATIVE_CHILD_FAILED: false,
  ATTEMPT_LEASE_ACTIVE: false,
  ATTEMPT_LIVENESS_UNKNOWN: false,
  ORPHAN_PROCESS_GROUP_ACTIVE: false,
  REFEREE_CHECK_FAILED: false,
  REFEREE_FINALIZE_FAILED: false,
  REFEREE_CLAIM_ACTIVE: false,
  METADATA_MERGE_FAILED: false,
  CODE_MERGE_FAILED: false,
  PROTECTED_SPEC_BINDING_INVALID: true,
  LYING_CONDUCTOR: true,
  FINALIZE_BINDING_INVALID: true,
  SCHEMA_INVALID: true,
});

export function finalizeFailureIsTerminal(code: AttemptFailureCode): boolean {
  return TERMINAL_FINALIZE_FAILURE[code];
}

function resolveInputIsValid(input: ResolveInput): boolean {
  return (
    HARNESS_VALUES.includes(input.harness) &&
    Number.isInteger(input.batch) &&
    input.batch > 0 &&
    input.projectDir.length > 0
  );
}

type ResolvePolicy = Readonly<{ request: DriverRequestValue; topology: TopologyDecisionValue }>;

function resolvePolicy(input: ResolveInput): RuntimeResult<ResolvePolicy> {
  if (!resolveInputIsValid(input)) return err("INPUT_INVALID");
  const request = parseDriverRequest(input.selectionEnvironment);
  if (request.type === "err") return err("INPUT_INVALID", request.error);
  const topology = classifyTopology(input.units, input.topologySignals);
  if (topology.type === "err") return err("INPUT_INVALID", topology.error);
  const mismatch = explicitRequestMismatch(request.value, input.harness, topology.value);
  if (mismatch) return err("INPUT_INVALID", mismatch);
  return ok(Object.freeze({ request: request.value, topology: topology.value }));
}

function explicitRequestMismatch(
  request: DriverRequestValue,
  harness: Harness,
  topology: TopologyDecisionValue,
): SelectorError | null {
  if (request.source !== "new-env" || request.requested === "auto") return null;
  const preflight = selectDriver({ request, harness, topology, capabilities: [] });
  if (preflight.type === "err" && preflight.error.code === "HARNESS_DRIVER_MISMATCH") return preflight.error;
  return null;
}

async function probeDriver(
  registry: DriverRegistrationSetValue,
  driver: NativeDriver,
  resolveInput: ResolveInput,
): Promise<ProbeResultValue> {
  const registration = registry.forDriver(driver);
  if (registration.slot.kind === "unavailable") return unavailableProbe();
  const adapter = registration.slot.adapterSet.forDriver(driver);
  if (!adapter) return unavailableProbe();
  return adapter.probe({
    projectDir: resolveInput.projectDir,
    batch: resolveInput.batch,
    timeoutMs: 10_000,
    environment: resolveInput.probeEnvironment ?? {},
  });
}

async function probeCapabilities(
  registry: DriverRegistrationSetValue,
  request: DriverRequestValue,
  topology: TopologyDecisionValue,
  resolveInput: ResolveInput,
): Promise<CapabilityRow[]> {
  if (request.source === "legacy-env") return [];
  const candidates =
    request.requested === "auto"
      ? candidateChain(resolveInput.harness, topology).filter(
          (driver): driver is NativeDriver => NATIVE_DRIVER_VALUES.includes(driver as NativeDriver),
        )
      : [request.requested];
  const capabilities: CapabilityRow[] = [];
  for (const driver of candidates) {
    capabilities.push(Object.freeze({ driver, result: await probeDriver(registry, driver, resolveInput) }));
  }
  return capabilities;
}

function selectionFailureCode(code: SelectorError["code"]): RuntimeError["code"] {
  return code === "EXPLICIT_DRIVER_UNAVAILABLE" ? "EXPLICIT_DRIVER_UNAVAILABLE" : "SELECTION_FAILED";
}

type SelectedCheckpoint = Extract<AttemptCheckpoint, Readonly<{ state: "selected" }>>;
type PreparedCheckpoint = Extract<AttemptCheckpoint, Readonly<{ state: "prepared" }>>;
type DispatchedCheckpoint = Extract<AttemptCheckpoint, Readonly<{ state: "dispatched" }>>;
type FailedResumableCheckpoint = Extract<AttemptCheckpoint, Readonly<{ state: "failed-resumable" }>>;

function readSelectedCheckpoint(
  store: DriverAttemptStore,
  input: Readonly<{ batch: number; executionId: string; attemptId: string }>,
): SelectedCheckpoint | null {
  const checkpoint = store.readReconciled(input.batch);
  if (checkpoint?.state !== "selected") return null;
  if (checkpoint.executionId !== input.executionId || checkpoint.attemptId !== input.attemptId) return null;
  return checkpoint;
}

function nonNativeExecutionPlan(checkpoint: AttemptCheckpoint): FloorOrLegacyExecutionPlan | null {
  if (checkpoint.state !== "dispatched") return null;
  const selection = checkpoint.selectedContext.selection;
  if (selection.kind === "floor-selection") {
    return Object.freeze({
      kind: "floor",
      executionId: checkpoint.executionId,
      attemptId: checkpoint.attemptId,
      selected: selection.selected,
      expectedUnits: checkpoint.selectionInput.expectedUnits,
      planDigest: checkpoint.selectedContext.planDigest,
    });
  }
  if (selection.kind !== "legacy-selection") return null;
  return Object.freeze({
    kind: "legacy",
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    execution: selection.execution,
    expectedUnits: checkpoint.selectionInput.expectedUnits,
    planDigest: checkpoint.selectedContext.planDigest,
    warningCode: selection.warningCode,
  });
}

function dispatchExternalExecution(
  store: DriverAttemptStore,
  checkpoint: PreparedCheckpoint,
  mintId: () => string,
): Readonly<{
  checkpoint: DispatchedCheckpoint;
  plan: FloorOrLegacyExecutionPlan;
}> | null {
  const selection = checkpoint.selectedContext.selection;
  if (selection.kind === "native-selection") return null;
  const executionMode = selection.kind === "floor-selection" ? "floor" as const : "legacy" as const;
  const dispatch = Object.freeze({ kind: "external" as const, executionMode });
  const dispatchDigest = buildDispatchDigest({
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    manifestDigest: checkpoint.worktreeManifestDigest,
    selection,
    runBinding: checkpoint.runBinding,
    dispatch,
  });
  const dispatched = transitionTo(store, checkpoint, mintId(), "prepared-dispatched", {
    ...withoutDigest(checkpoint),
    state: "dispatched",
    preparedUnits: checkpoint.preparedUnits,
    worktreeManifestDigest: checkpoint.worktreeManifestDigest,
    dispatchDigest,
    dispatch,
    runBinding: checkpoint.runBinding,
  });
  const plan = nonNativeExecutionPlan(dispatched);
  if (!plan) throw new Error("Invalid external execution plan");
  return Object.freeze({ checkpoint: dispatched, plan });
}

function assertNativeSelection(
  selection: RedactedSelection,
): asserts selection is Extract<RedactedSelection, Readonly<{ kind: "native-selection" }>> {
  if (selection.kind !== "native-selection") throw new Error("Invalid native selection");
}

function prepareRunInput(
  checkpoint: SelectedCheckpoint,
  input: Parameters<SwarmDriverCoordinator["run"]>[0],
): RuntimeResult<Readonly<{ preparedUnits: readonly PreparedUnit[]; runBinding: RunRequestBinding }>> {
  const prepared = canonicalPreparedUnits(input.preparedUnits);
  const runBinding = buildRunRequestBinding({
    preparedUnits: input.preparedUnits,
    gitBinding: input.gitBinding,
    convergenceCommand: input.convergenceCommand,
    ...(input.protectedSpec ? { protectedSpecPath: input.protectedSpec } : {}),
    evidenceDir: input.evidenceDir,
  });
  if (
    prepared.type === "err" ||
    runBinding.type === "err" ||
    !exactUnits(checkpoint.selectionInput.expectedUnits, input.preparedUnits.map((unit) => unit.unit))
  ) {
    return err("PREPARED_MANIFEST_INVALID");
  }
  return ok(Object.freeze({ preparedUnits: prepared.value, runBinding: runBinding.value }));
}

function recordNativeEvidenceForRun(
  store: DriverAttemptStore,
  evidence: Parameters<DriverAttemptStore["recordNativeEvidence"]>[0],
): boolean {
  try {
    store.recordNativeEvidence(evidence);
    return true;
  } catch (error) {
    if (error instanceof AttemptStoreError && error.code === "STALE_WRITER") return false;
    throw error;
  }
}

function nativeRunDependencies(
  registry: DriverRegistrationSetValue,
  selection: Extract<RedactedSelection, Readonly<{ kind: "native-selection" }>>,
): RuntimeResult<Readonly<{ driver: NativeDriver; adapter: DriverAdapter; probe: ProbeResultValue }>> {
  const driver = selectedDriver(selection);
  if (!driver) return err("CHECKPOINT_STATE_INVALID");
  const registration = registry.forDriver(driver);
  if (registration.slot.kind !== "available") return err("REGISTRATION_UNAVAILABLE");
  const adapter = registration.slot.adapterSet.forDriver(driver);
  if (!adapter) return err("REGISTRATION_UNAVAILABLE");
  const probe = ProbeResult.build(selection.probe);
  if (probe.type === "err" || !probe.value.isAvailable()) return err("CHECKPOINT_STATE_INVALID");
  return ok(Object.freeze({ driver, adapter, probe: probe.value }));
}

function claimRunLease(input: Readonly<{
  store: DriverAttemptStore;
  checkpoint: SelectedCheckpoint;
  preparedUnits: readonly PreparedUnit[];
  manifestDigest: string;
  runBinding: RunRequestBinding;
  startedAt: Date;
  mintId(): string;
}>): PreparedCheckpoint | null {
  const ownerProcess = observeProcessIdentity(process.pid);
  try {
    return transitionTo(input.store, input.checkpoint, input.mintId(), "selected-prepared", {
      ...withoutDigest(input.checkpoint),
      state: "prepared",
      lease: {
        leaseId: input.mintId(),
        fencingToken: input.checkpoint.lease.fencingToken + 1,
        ownerId: digestValue({ pid: process.pid, ppid: process.ppid }),
        heartbeatAt: input.startedAt.toISOString(),
        expiresAt: new Date(input.startedAt.getTime() + ATTEMPT_LEASE_MS).toISOString(),
        ...(ownerProcess.type === "ok" ? { ownerProcess: ownerProcess.value } : {}),
      },
      preparedUnits: input.preparedUnits,
      worktreeManifestDigest: input.manifestDigest,
      runBinding: input.runBinding,
    });
  } catch {
    return null;
  }
}

type HeartbeatExecutionResult<T> =
  | Readonly<{ type: "ok"; value: T }>
  | Readonly<{ type: "err" }>;

async function executeWithHeartbeat<T>(input: Readonly<{
  store: DriverAttemptStore;
  batch: number;
  leaseId: string;
  fencingToken: number;
  now(): Date;
  timer: AttemptHeartbeatTimer;
  onHeartbeat(checkpoint: AttemptCheckpoint): void;
  execute(): Promise<T>;
}>): Promise<HeartbeatExecutionResult<T>> {
  let heartbeatFailed = false;
  let handle: unknown;
  try {
    handle = input.timer.start(() => {
      if (heartbeatFailed) return;
      try {
        const heartbeatAt = input.now();
        input.onHeartbeat(input.store.heartbeat({
          batch: input.batch,
          leaseId: input.leaseId,
          fencingToken: input.fencingToken,
          heartbeatAt: heartbeatAt.toISOString(),
          expiresAt: new Date(heartbeatAt.getTime() + ATTEMPT_LEASE_MS).toISOString(),
        }));
      } catch {
        heartbeatFailed = true;
      }
    }, ATTEMPT_HEARTBEAT_MS);
  } catch {
    return Object.freeze({ type: "err" });
  }
  let value: T | undefined;
  let executionFailed = false;
  try {
    value = await input.execute();
  } catch {
    executionFailed = true;
  }
  try {
    input.timer.stop(handle);
  } catch {
    executionFailed = true;
  }
  return executionFailed || heartbeatFailed
    ? Object.freeze({ type: "err" })
    : Object.freeze({ type: "ok", value: value as T });
}

function observeAttemptOwner(
  checkpoint: AttemptCheckpoint,
  injected?: (expected: ProcessIdentity) => AttemptOwnerLiveness,
): AttemptOwnerLiveness {
  const expected = checkpoint.lease.ownerProcess;
  if (!expected) return Object.freeze({ status: "unknown" });
  if (injected) return injected(expected);
  return observeExactProcessLiveness(expected);
}

function claimActiveRecoveryForRuntime(input: Readonly<{
  store: DriverAttemptStore;
  checkpoint: AttemptCheckpoint;
  claimedAt: Date;
  observeRecoveryOwner?: () => ProcessIdentity | null;
  mintId(): string;
}>): RuntimeResult<Readonly<{ checkpoint: AttemptCheckpoint; claimId: string }>> {
  const claimId = input.mintId();
  const observedOwner = input.observeRecoveryOwner
    ? input.observeRecoveryOwner()
    : (() => {
        const observed = observeProcessIdentity(process.pid);
        return observed.type === "ok" ? observed.value : null;
      })();
  if (!observedOwner) return err("ATTEMPT_LIVENESS_UNKNOWN");
  try {
    return ok(Object.freeze({
      checkpoint: input.store.claimActiveRecovery({
        batch: input.checkpoint.batch,
        executionId: input.checkpoint.executionId,
        attemptId: input.checkpoint.attemptId,
        expectedLeaseId: input.checkpoint.lease.leaseId,
        expectedFencingToken: input.checkpoint.lease.fencingToken,
        claimId,
        recoveryLeaseId: input.mintId(),
        recoveryOwnerId: digestValue({ pid: process.pid, ppid: process.ppid }),
        recoveryOwnerProcess: observedOwner,
        now: input.claimedAt.toISOString(),
        expiresAt: new Date(input.claimedAt.getTime() + ATTEMPT_LEASE_MS).toISOString(),
        mutationId: input.mintId(),
        ownerLivenessVerified: true,
      }),
      claimId,
    }));
  } catch (error) {
    if (error instanceof AttemptStoreError && ["RECOVERY_CLAIM_ACTIVE", "STALE_WRITER"].includes(error.code)) {
      return err("ATTEMPT_LEASE_ACTIVE");
    }
    throw error;
  }
}

type AttemptRecoveryMode = "local" | "external" | "unsupported";

function failedAttemptRecoveryMode(checkpoint: FailedResumableCheckpoint): AttemptRecoveryMode {
  if (checkpoint.failure.recoveryContext) return "external";
  return ["probing", "selected", "prepared"].includes(checkpoint.failure.failedFromState)
    ? "local"
    : "unsupported";
}

function attemptRecoveryMode(checkpoint: AttemptCheckpoint): AttemptRecoveryMode {
  if (checkpoint.state === "failed-resumable") return failedAttemptRecoveryMode(checkpoint);
  if (checkpoint.state === "probing" || checkpoint.state === "selected") return "local";
  if (checkpoint.state === "prepared") {
    if (checkpoint.dispatchPreparation === undefined) return "local";
    return checkpoint.selectedContext.selection.kind === "native-selection" ? "external" : "unsupported";
  }
  if (checkpoint.state === "dispatched") {
    return checkpoint.selectedContext.selection.kind === "native-selection" &&
      checkpoint.dispatch.kind === "native" &&
      checkpoint.dispatchPreparation !== undefined
      ? "external"
      : "unsupported";
  }
  return "unsupported";
}

async function recoverExpiredCheckpoint(input: Readonly<{
  store: DriverAttemptStore;
  checkpoint: AttemptCheckpoint;
  resumedAt: Date;
  recovery: AttemptRecoveryPort;
  observeOwner?: (expected: ProcessIdentity) => AttemptOwnerLiveness;
  observeRecoveryOwner?: () => ProcessIdentity | null;
  mintId(): string;
}>): Promise<RuntimeResult<FailedResumableCheckpoint>> {
  if (input.resumedAt.getTime() <= Date.parse(input.checkpoint.lease.expiresAt)) {
    return err("ATTEMPT_LEASE_ACTIVE");
  }
  const ownerLiveness = observeAttemptOwner(input.checkpoint, input.observeOwner);
  if (ownerLiveness.status === "live") return err("ATTEMPT_LEASE_ACTIVE");
  if (ownerLiveness.status === "unknown") return err("ATTEMPT_LIVENESS_UNKNOWN");
  const recoveryMode = attemptRecoveryMode(input.checkpoint);
  if (recoveryMode === "unsupported") return err("ATTEMPT_LIVENESS_UNKNOWN");
  let checkpoint = input.checkpoint;
  let claimId: string | undefined;
  if (checkpoint.state !== "failed-resumable" || recoveryMode === "external") {
    const claimed = claimActiveRecoveryForRuntime({
      store: input.store,
      checkpoint,
      claimedAt: input.resumedAt,
      observeRecoveryOwner: input.observeRecoveryOwner,
      mintId: input.mintId,
    });
    if (claimed.type === "err") return claimed;
    checkpoint = claimed.value.checkpoint;
    claimId = claimed.value.claimId;
  }
  if (recoveryMode === "external") {
    const recovery = await input.recovery.recover({ checkpoint, observedOwner: null });
    if (recovery === "active") return err("ATTEMPT_LEASE_ACTIVE");
    if (recovery !== "recovered") return err("ATTEMPT_LIVENESS_UNKNOWN");
  }
  if (claimId) {
    checkpoint = input.store.completeActiveRecovery({
      batch: checkpoint.batch,
      executionId: checkpoint.executionId,
      attemptId: checkpoint.attemptId,
      claimId,
      leaseId: checkpoint.lease.leaseId,
      fencingToken: checkpoint.lease.fencingToken,
      mutationId: input.mintId(),
      recoveryVerified: true,
    });
  }
  return checkpoint.state === "failed-resumable" ? ok(checkpoint) : err("CHECKPOINT_STATE_INVALID");
}

function beginResumedAttempt(
  store: DriverAttemptStore,
  checkpoint: FailedResumableCheckpoint,
  request: ResumeRequest,
  resumedAt: Date,
): AttemptCheckpoint {
  const ownerProcess = observeProcessIdentity(process.pid);
  return store.beginResume({
    ...request,
    now: resumedAt.toISOString(),
    expiresAt: new Date(resumedAt.getTime() + ATTEMPT_LEASE_MS).toISOString(),
    recoveryVerified: true,
    ...(checkpoint.recoveryClaim ? { recoveryClaimId: checkpoint.recoveryClaim.claimId } : {}),
    ...(checkpoint.recoveryClaim ? { recoveredTransitionId: checkpoint.lastMutationId } : {}),
    ...(ownerProcess.type === "ok" ? { ownerProcess: ownerProcess.value } : {}),
  });
}

type NativeLifecycleCallbackInput = Readonly<{
  store: DriverAttemptStore;
  checkpoint(): AttemptCheckpoint;
  update(checkpoint: AttemptCheckpoint): void;
  mintId(): string;
  nativeRunId: string;
  preparedUnits: readonly PreparedUnit[];
  manifestDigest: string;
  runBinding: RunRequestBinding;
  dispatchDigest(dispatch: NativeDispatchCheckpoint): string;
  waveIndex: number;
  waveDigest: string;
  captureDispatchPreparation(preparation: NativeDispatchPreparation): void;
  captureReadyToArm(dispatch: NativeDispatchCheckpoint): void;
}>;

type NativeLifecycleCallbacks = Pick<
  NativeLifecycleExecutionInput,
  "onDispatchPrepared" | "onResourcesPrepared" | "onProcessObserved" | "onReadyToArm" | "onCaptureBound"
>;

function buildNativeDispatchTransition(
  input: NativeLifecycleCallbackInput,
  checkpoint: Extract<AttemptCheckpoint, Readonly<{ state: "prepared" }>>,
  dispatch: NativeDispatchCheckpoint,
  transitionId: string,
): AttemptTransition {
  if (
    checkpoint.dispatchPreparation === undefined ||
    checkpoint.preparedNativeRun === undefined ||
    dispatch.nativeRunId !== input.nativeRunId ||
    dispatch.preparedNativeRunDigest !== digestValue(checkpoint.preparedNativeRun)
  ) {
    throw new Error("NATIVE_DISPATCH_INVALID");
  }
  return buildValidatedTransition(checkpoint, transitionId, "prepared-dispatched", {
    ...withoutDigest(checkpoint),
    state: "dispatched",
    preparedUnits: input.preparedUnits,
    worktreeManifestDigest: input.manifestDigest,
    dispatchDigest: input.dispatchDigest(dispatch),
    dispatch,
    runBinding: input.runBinding,
  });
}

function nativeLifecycleCallbacks(input: NativeLifecycleCallbackInput): NativeLifecycleCallbacks {
  return Object.freeze({
    onDispatchPrepared: async (dispatchPreparation) => {
      const checkpoint = input.checkpoint();
      if (
        checkpoint.state !== "prepared" ||
        checkpoint.dispatchPreparation !== undefined ||
        dispatchPreparation.nativeRunId !== input.nativeRunId ||
        dispatchPreparation.planDigest !== checkpoint.selectedContext.planDigest ||
        dispatchPreparation.fencingToken !== checkpoint.lease.fencingToken ||
        dispatchPreparation.waveIndex !== input.waveIndex ||
        dispatchPreparation.waveDigest !== input.waveDigest ||
        dispatchPreparation.captureIdentityDigest !== digestValue({
          executionId: checkpoint.executionId,
          attemptId: checkpoint.attemptId,
          attemptNonceHash: checkpoint.nonceHash,
          planDigest: checkpoint.selectedContext.planDigest,
          waveIndex: input.waveIndex,
          waveDigest: input.waveDigest,
        })
      ) {
        throw new Error("NATIVE_DISPATCH_PREPARATION_INVALID");
      }
      const transition = buildValidatedTransition(checkpoint, input.mintId(), "native-dispatch-prepared", {
        ...withoutDigest(checkpoint),
        state: "prepared",
        dispatchPreparation,
      });
      input.captureDispatchPreparation(dispatchPreparation);
      input.update(input.store.transition(transition));
    },
    onResourcesPrepared: async (preparedNativeRun) => {
      const checkpoint = input.checkpoint();
      if (
        checkpoint.state !== "prepared" ||
        checkpoint.dispatchPreparation === undefined ||
        checkpoint.preparedNativeRun !== undefined
      ) {
        throw new Error("NATIVE_RESOURCE_PREPARATION_INVALID");
      }
      input.update(transitionTo(input.store, checkpoint, input.mintId(), "native-resources-prepared", {
        ...withoutDigest(checkpoint),
        state: "prepared",
        preparedNativeRun,
      }));
    },
    onProcessObserved: (dispatch) => {
      const checkpoint = input.checkpoint();
      if (checkpoint.state !== "prepared") throw new Error("NATIVE_DISPATCH_INVALID");
      buildNativeDispatchTransition(
        input,
        checkpoint,
        dispatch,
        `process-observed-${digestValue(dispatch)}`,
      );
      input.captureReadyToArm(dispatch);
    },
    onReadyToArm: async (dispatch) => {
      const checkpoint = input.checkpoint();
      if (checkpoint.state !== "prepared") throw new Error("NATIVE_DISPATCH_INVALID");
      const transition = buildNativeDispatchTransition(input, checkpoint, dispatch, input.mintId());
      input.captureReadyToArm(dispatch);
      input.update(input.store.transition(transition));
    },
    onCaptureBound: async (binding) => {
      const checkpoint = input.checkpoint();
      if (
        checkpoint.state !== "dispatched" ||
        checkpoint.dispatch.kind !== "native" ||
        checkpoint.dispatch.capture.kind !== "event-bound-provider-path" ||
        checkpoint.dispatch.capture.binding !== undefined
      ) {
        throw new Error("CAPTURE_BINDING_INVALID");
      }
      const dispatch: NativeDispatchCheckpoint = Object.freeze({
        ...checkpoint.dispatch,
        capture: Object.freeze({ ...checkpoint.dispatch.capture, binding }),
      });
      input.update(transitionTo(input.store, checkpoint, input.mintId(), "capture-bound", {
        ...withoutDigest(checkpoint),
        state: "dispatched",
        dispatchDigest: input.dispatchDigest(dispatch),
        dispatch,
      }));
    },
  });
}

export function createCoordinator(input: Readonly<{
  registry: DriverRegistrationSetValue;
  store: DriverAttemptStore;
  nativeExecution: NativeExecutionPort;
  audit?: RuntimeAuditPort;
  recovery?: AttemptRecoveryPort;
  observeOwner?: (expected: ProcessIdentity) => AttemptOwnerLiveness;
  observeRecoveryOwner?: () => ProcessIdentity | null;
  heartbeatTimer?: AttemptHeartbeatTimer;
  now?: () => Date;
  mintId?: () => string;
}>): SwarmDriverCoordinator {
  const now = input.now ?? (() => new Date());
  const mintId = input.mintId ?? randomUUID;
  const heartbeatTimer = input.heartbeatTimer ?? Object.freeze({
    start: (callback: () => void, intervalMs: number): ReturnType<typeof setInterval> =>
      setInterval(callback, intervalMs),
    stop: (handle: unknown): void => clearInterval(handle as ReturnType<typeof setInterval>),
  });

  const defaultRecovery: AttemptRecoveryPort = Object.freeze({
    async recover({ checkpoint, observedOwner }) {
      if (observedOwner) return "active";
      if (checkpoint.state === "failed-resumable") {
        return ["probing", "selected", "prepared"].includes(checkpoint.failure.failedFromState)
          ? "recovered"
          : "unknown";
      }
      return "unknown";
    },
  });

  return Object.freeze({
    async resolve(resolveInput): Promise<RuntimeResult<ResolutionOutput>> {
      try {
        input.store.readReconciled(resolveInput.batch);
      } catch {
        return err("CHECKPOINT_STATE_INVALID");
      }
      const policy = resolvePolicy(resolveInput);
      if (policy.type === "err") return policy;
      const { request, topology } = policy.value;

      const executionId = mintId();
      const attemptId = mintId();
      const leaseId = mintId();
      const beginId = mintId();
      const nonceHash = digestValue(mintId());
      const startedAt = now();
      const ownerProcess = observeProcessIdentity(process.pid);
      const checkpointResult = createProbingCheckpoint({
        executionId,
        attemptId,
        batch: resolveInput.batch,
        origin: "initial",
        nonceHash,
        mutationId: beginId,
        lease: {
          leaseId,
          fencingToken: 1,
          ownerId: resolveInput.ownerId ?? digestValue({ pid: process.pid, ppid: process.ppid }),
          heartbeatAt: startedAt.toISOString(),
          expiresAt: new Date(startedAt.getTime() + ATTEMPT_LEASE_MS).toISOString(),
          ...(ownerProcess.type === "ok" ? { ownerProcess: ownerProcess.value } : {}),
        },
        selectionInput: {
          requested: request.toRedactedJSON(),
          harness: resolveInput.harness,
          batch: resolveInput.batch,
          expectedUnits: resolveInput.units,
          topologySignals: resolveInput.topologySignals,
        },
      });
      if (checkpointResult.type === "err") return err("INPUT_INVALID");
      let checkpoint = input.store.begin(checkpointResult.value);

      const capabilities = await probeCapabilities(input.registry, request, topology, resolveInput);

      const selection = selectDriver({
        request,
        harness: resolveInput.harness,
        topology,
        capabilities,
      });
      if (selection.type === "err") {
        const failureCode = selectionFailureCode(selection.error.code);
        failAttempt(
          input.store,
          checkpoint,
          failureCode === "EXPLICIT_DRIVER_UNAVAILABLE" ? "EXPLICIT_DRIVER_UNAVAILABLE" : "INPUT_INVALID",
          true,
        );
        return err(failureCode, selection.error);
      }

      const redacted = selection.value.toRedactedJSON();
      const probeDigest = digestValue(capabilities.map(({ driver, result }) => ({ driver, result })));
      const planDigest = digestValue({
        selection: redacted,
        expectedUnits: checkpoint.selectionInput.expectedUnits,
        executionId,
        attemptId,
      });
      checkpoint = transitionTo(input.store, checkpoint, mintId(), "probe-selected", {
        ...withoutDigest(checkpoint),
        state: "selected",
        selectedContext: { selection: redacted, probeDigest, planDigest },
      });
      return ok(
        Object.freeze({
          schemaVersion: 1,
          executionId,
          attemptId,
          state: "selected",
          selection: redacted,
          planDigest,
          probeDigest,
          expectedUnits: checkpoint.selectionInput.expectedUnits,
        }),
      );
    },

    async run(runInput): Promise<RuntimeResult<VerifiedExecutionResult | FloorOrLegacyExecutionPlan>> {
      const selectedCheckpoint = readSelectedCheckpoint(input.store, runInput);
      if (!selectedCheckpoint) return err("CHECKPOINT_STATE_INVALID");
      let checkpoint: AttemptCheckpoint = selectedCheckpoint;
      const prepared = prepareRunInput(selectedCheckpoint, runInput);
      if (prepared.type === "err") {
        failAttempt(input.store, checkpoint, "INPUT_INVALID", true);
        return prepared;
      }
      const { preparedUnits, runBinding } = prepared.value;
      const manifestDigest = digestValue(preparedUnits);
      const preparedCheckpoint = claimRunLease({
        store: input.store,
        checkpoint: selectedCheckpoint,
        preparedUnits,
        manifestDigest,
        runBinding,
        startedAt: now(),
        mintId,
      });
      if (!preparedCheckpoint) return err("CHECKPOINT_STATE_INVALID");
      checkpoint = preparedCheckpoint;
      const selection = checkpoint.selectedContext.selection;
      const external = dispatchExternalExecution(input.store, checkpoint, mintId);
      if (external) return ok(external.plan);
      assertNativeSelection(selection);

      const dependencies = nativeRunDependencies(input.registry, selection);
      if (dependencies.type === "err") {
        const registrationUnavailable = dependencies.error.code === "REGISTRATION_UNAVAILABLE";
        failAttempt(
          input.store,
          checkpoint,
          registrationUnavailable ? "COORDINATOR_FAILED" : "SCHEMA_INVALID",
          !registrationUnavailable,
        );
        return dependencies;
      }
      const { driver, adapter, probe: probeResult } = dependencies.value;
      const plan: DriverPlan = Object.freeze({
        kind: "driver-plan",
        schemaVersion: 1,
        executionId: checkpoint.executionId,
        attemptId: checkpoint.attemptId,
        requested: selection.requested,
        selected: driver,
        executionMode: "native",
        harness: selection.harness,
        batch: checkpoint.batch,
        topology: selection.topology.topology,
        topologyReason: selection.topology.reason,
        fallbackReason: selection.fallbackReason,
        probe: probeResult,
        waves: Object.freeze([{ index: 0, units: checkpoint.selectionInput.expectedUnits }]),
        planDigest: checkpoint.selectedContext.planDigest,
        attemptNonceHash: checkpoint.nonceHash,
      });
      const nativeRunId = mintId();
      const waveIndex = 0;
      const waveDigest = digestValue(plan.waves[waveIndex]);
      const launchInput: LaunchInput = Object.freeze({
        plan,
        wave: plan.waves[waveIndex],
        preparedUnits,
        convergenceCommand: runInput.convergenceCommand,
        ...(runInput.protectedSpec ? { protectedSpec: runInput.protectedSpec } : {}),
        evidenceDir: runInput.evidenceDir,
        nativeRunId,
      });
      const context: NormalizeContext = Object.freeze({
        driver,
        executionId: plan.executionId,
        attemptId: plan.attemptId,
        attemptNonceHash: plan.attemptNonceHash,
        planDigest: plan.planDigest,
        waveIndex,
        waveDigest,
        expectedUnits: checkpoint.selectionInput.expectedUnits,
      });
      const nativeDispatchDigest = (dispatch: NativeDispatchCheckpoint): string =>
        buildDispatchDigest({
          executionId: checkpoint.executionId,
          attemptId: checkpoint.attemptId,
          manifestDigest: manifestDigest,
          selection,
          runBinding,
          dispatch,
        });
      const runLeaseId = checkpoint.lease.leaseId;
      const runFencingToken = checkpoint.lease.fencingToken;
      const dispatchPreparationCapture = createDispatchPreparationCapture();
      const readyToArmCapture = createNativeDispatchCapture();
      const callbacks = nativeLifecycleCallbacks({
        store: input.store,
        checkpoint: () => checkpoint,
        update: (next) => {
          checkpoint = next;
        },
        mintId,
        nativeRunId,
        preparedUnits,
        manifestDigest,
        runBinding,
        dispatchDigest: nativeDispatchDigest,
        waveIndex,
        waveDigest,
        captureDispatchPreparation: dispatchPreparationCapture.capture,
        captureReadyToArm: readyToArmCapture.capture,
      });
      const execution = await executeWithHeartbeat({
        store: input.store,
        batch: checkpoint.batch,
        leaseId: runLeaseId,
        fencingToken: runFencingToken,
        now,
        timer: heartbeatTimer,
        onHeartbeat: (next) => {
          checkpoint = next;
        },
        execute: () => input.nativeExecution.execute({
          adapter,
          launchInput,
          context,
          fencingToken: checkpoint.lease.fencingToken,
          ...callbacks,
        }),
      });
      if (execution.type === "err") {
        try {
          failReconciledRunAttempt({
            store: input.store,
            batch: runInput.batch,
            executionId: plan.executionId,
            attemptId: plan.attemptId,
            leaseId: runLeaseId,
            fencingToken: runFencingToken,
            dispatchPreparation: dispatchPreparationCapture.read(),
            dispatch: readyToArmCapture.read(),
          });
        } catch {
          // A stale run owner must not overwrite the recovery winner.
        }
        return err("EXECUTION_FAILED");
      }
      const events = execution.value;
      const materializedDispatch = input.store.read(runInput.batch);
      if (materializedDispatch?.state !== "dispatched" || materializedDispatch.dispatch.kind !== "native") {
        failAttempt(
          input.store,
          checkpoint,
          "COORDINATOR_FAILED",
          false,
          dispatchPreparationCapture.read(),
          readyToArmCapture.read(),
        );
        return err("EXECUTION_FAILED");
      }
      checkpoint = materializedDispatch;
      const verdict = verifyNativeEvidence({
        driver,
        executionId: checkpoint.executionId,
        attemptId: checkpoint.attemptId,
        nonceHash: checkpoint.nonceHash,
        planDigest: checkpoint.selectedContext.planDigest,
        waveIndex,
        waveDigest,
        nativeRunId,
        expectedUnits: checkpoint.selectionInput.expectedUnits,
        events,
      });
      if (!recordNativeEvidenceForRun(input.store, {
          batch: checkpoint.batch,
          executionId: checkpoint.executionId,
          attemptId: checkpoint.attemptId,
          expectedLeaseId: runLeaseId,
          expectedFencingToken: runFencingToken,
          driver,
          verdict,
        })) return err("EXECUTION_FAILED");
      input.audit?.evidence({ executionId: checkpoint.executionId, attemptId: checkpoint.attemptId, verdict });
      if (!verdict.ok) {
        failAttempt(input.store, checkpoint, "NATIVE_EVIDENCE_INVALID", false);
        return err("EVIDENCE_INVALID");
      }
      const result: VerifiedExecutionResult = Object.freeze({
        kind: "native",
        driver,
        evidenceDigest: verdict.evidenceDigest,
        completedUnits: verdict.completedUnits,
      });
      transitionTo(input.store, checkpoint, mintId(), "dispatch-evidence-verified", {
        ...withoutDispatch(checkpoint),
        state: "evidence-verified",
        preparedUnits,
        worktreeManifestDigest: manifestDigest,
        executionResult: result,
        runBinding: checkpoint.runBinding,
      });
      return ok(result);
    },

    recordFloor(recordInput): RuntimeResult<AttemptCheckpoint> {
      const checkpoint = input.store.read(recordInput.batch);
      if (
        checkpoint?.state !== "dispatched" ||
        !("selectedContext" in checkpoint) ||
        checkpoint.selectedContext.selection.kind !== "floor-selection" ||
        checkpoint.executionId !== recordInput.executionId ||
        checkpoint.attemptId !== recordInput.attemptId ||
        checkpoint.selectedContext.selection.selected !== recordInput.selected ||
        checkpoint.selectedContext.planDigest !== recordInput.planDigest ||
        typeof recordInput.resultDigest !== "string" ||
        recordInput.resultDigest.length === 0 ||
        !exactUnits(checkpoint.selectionInput.expectedUnits, recordInput.completedUnits)
      ) {
        return err("CHECKPOINT_STATE_INVALID");
      }
      const result: VerifiedExecutionResult = Object.freeze({
        kind: "floor",
        driver: checkpoint.selectedContext.selection.selected,
        resultDigest: recordInput.resultDigest,
        completedUnits: Object.freeze([...recordInput.completedUnits].sort()),
      });
      return ok(
        transitionTo(input.store, checkpoint, mintId(), "dispatch-evidence-verified", {
          ...withoutDispatch(checkpoint),
          state: "evidence-verified",
          preparedUnits: checkpoint.preparedUnits,
          worktreeManifestDigest: checkpoint.worktreeManifestDigest,
          executionResult: result,
          runBinding: checkpoint.runBinding,
        }),
      );
    },

    recordLegacy(recordInput): RuntimeResult<AttemptCheckpoint> {
      const checkpoint = input.store.read(recordInput.batch);
      if (
        checkpoint?.state !== "dispatched" ||
        !("selectedContext" in checkpoint) ||
        checkpoint.selectedContext.selection.kind !== "legacy-selection" ||
        checkpoint.executionId !== recordInput.executionId ||
        checkpoint.attemptId !== recordInput.attemptId ||
        checkpoint.selectedContext.planDigest !== recordInput.planDigest ||
        checkpoint.selectedContext.selection.execution !== recordInput.execution ||
        typeof recordInput.resultDigest !== "string" ||
        recordInput.resultDigest.length === 0 ||
        !exactUnits(checkpoint.selectionInput.expectedUnits, recordInput.completedUnits)
      ) {
        return err("CHECKPOINT_STATE_INVALID");
      }
      const result: VerifiedExecutionResult = Object.freeze({
        kind: "legacy",
        execution: checkpoint.selectedContext.selection.execution,
        resultDigest: recordInput.resultDigest,
        completedUnits: Object.freeze([...recordInput.completedUnits].sort()),
      });
      return ok(
        transitionTo(input.store, checkpoint, mintId(), "dispatch-evidence-verified", {
          ...withoutDispatch(checkpoint),
          state: "evidence-verified",
          preparedUnits: checkpoint.preparedUnits,
          worktreeManifestDigest: checkpoint.worktreeManifestDigest,
          executionResult: result,
          runBinding: checkpoint.runBinding,
        }),
      );
    },

    recordFinalizeRequest(binding): RuntimeResult<AttemptCheckpoint> {
      const { schemaVersion: _schemaVersion, finalizeRequestDigest, ...semantic } = binding;
      const rebuilt = buildFinalizeRequestBinding(semantic);
      if (
        rebuilt.type === "err" ||
        rebuilt.value.finalizeRequestDigest !== finalizeRequestDigest
      ) {
        return err("FINALIZE_BINDING_INVALID");
      }
      const checkpoint = input.store.read(binding.batch);
      if (
        checkpoint?.state !== "evidence-verified" ||
        checkpoint.executionId !== binding.executionId ||
        checkpoint.attemptId !== binding.attemptId ||
        checkpoint.selectedContext.planDigest !== binding.planDigest ||
        checkpoint.worktreeManifestDigest !== binding.worktreeManifestDigest ||
        digestValue(checkpoint.runBinding.expectedUnits) !== digestValue(binding.expectedUnits) ||
        checkpoint.runBinding.checkCommandDigest !== binding.checkCommandDigest ||
        digestValue(checkpoint.runBinding.protectedSpec) !== digestValue(binding.protectedSpec) ||
        checkpoint.runBinding.repoIdentityDigest !== binding.repoIdentityDigest ||
        checkpoint.runBinding.mergeTargetBranch !== binding.mergeTargetBranch ||
        checkpoint.runBinding.targetBeforeCommit !== binding.targetBeforeCommit
      ) {
        return err("FINALIZE_BINDING_INVALID");
      }
      return ok(
        transitionTo(input.store, checkpoint, mintId(), "evidence-referee-running", {
          ...withoutDigest(checkpoint),
          state: "referee-running",
          finalizeBinding: binding,
          runBinding: checkpoint.runBinding,
        }),
      );
    },

    recordFinalizeResult(envelope): RuntimeResult<AttemptCheckpoint> {
      const checkpoint = input.store.read(envelope.batch);
      if (checkpoint?.state !== "referee-running") return err("CHECKPOINT_STATE_INVALID");
      const validated = validateRefereeEnvelope(checkpoint.finalizeBinding, envelope);
      if (validated.type === "err") {
        failAttempt(input.store, checkpoint, "FINALIZE_BINDING_INVALID", true);
        return err("FINALIZE_BINDING_INVALID");
      }
      if (!envelope.mergeCompleted || envelope.failures.length > 0) {
        const terminal = envelope.failures.find(({ code }) => finalizeFailureIsTerminal(code));
        const operational = envelope.failures[0];
        return ok(
          failAttempt(
            input.store,
            checkpoint,
            terminal?.code ?? operational?.code ?? "REFEREE_FINALIZE_FAILED",
            Boolean(terminal),
          ),
        );
      }
      return ok(
        transitionTo(input.store, checkpoint, mintId(), "referee-succeeded", {
          ...withoutDigest(checkpoint),
          state: "succeeded",
          refereeResultDigest: envelope.resultDigest,
        }),
      );
    },

    async resume(resumeInput): Promise<RuntimeResult<AttemptCheckpoint>> {
      try {
        const checkpoint = input.store.readReconciled(resumeInput.batch);
        if (!checkpoint || checkpoint.attemptId !== resumeInput.previousAttemptId) {
          return err("CHECKPOINT_STATE_INVALID");
        }
        const resumedAt = now();
        if (
          checkpoint.state === "failed-resumable" &&
          checkpoint.recoveryClaim?.recoveredTransitionId === checkpoint.lastMutationId
        ) {
          return ok(beginResumedAttempt(input.store, checkpoint, resumeInput, resumedAt));
        }
        if (checkpoint.state === "succeeded" || checkpoint.state === "failed-terminal") {
          return err("CHECKPOINT_STATE_INVALID");
        }
        const recovered = await recoverExpiredCheckpoint({
          store: input.store,
          checkpoint,
          resumedAt,
          recovery: input.recovery ?? defaultRecovery,
          observeOwner: input.observeOwner,
          observeRecoveryOwner: input.observeRecoveryOwner,
          mintId,
        });
        if (recovered.type === "err") return recovered;
        return ok(beginResumedAttempt(input.store, recovered.value, resumeInput, resumedAt));
      } catch {
        return err("CHECKPOINT_STATE_INVALID");
      }
    },

    status(batch: number): AttemptCheckpoint | null {
      return input.store.readReconciled(batch);
    },
  });
}

export function createProductionCoordinator(input: Readonly<{
  projectDir: string;
  intent?: string;
  space?: string;
  nativeExecution: NativeExecutionPort;
  audit?: RuntimeAuditPort;
  recovery?: AttemptRecoveryPort;
}>): SwarmDriverCoordinator {
  return createCoordinator({
    registry: productionDriverRegistry,
    store: createFileDriverAttemptStore({
      projectDir: input.projectDir,
      intent: input.intent,
      space: input.space,
    }),
    nativeExecution: input.nativeExecution,
    audit: input.audit,
    recovery: input.recovery,
  });
}
