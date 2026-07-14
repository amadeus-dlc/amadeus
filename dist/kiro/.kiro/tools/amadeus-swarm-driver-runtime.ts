// Composition root and stateful coordinator for the shared swarm-driver lifecycle.

import { randomUUID } from "node:crypto";
import {
  DriverRegistrationSet,
  type DriverPlan,
  type DriverRegistrationSet as DriverRegistrationSetValue,
  type LaunchInput,
  type NormalizeContext,
  type NormalizedDriverEvent,
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
  type CheckpointWithoutDigest,
  type FinalizeRequestBinding,
  type RefereeFinalizeEnvelope,
  type RunGitBindingInput,
  type VerifiedExecutionResult,
} from "./amadeus-swarm-driver-lifecycle.ts";
import {
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
  observeProcessIdentity,
  sameProcess,
  type ProcessIdentity,
} from "./amadeus-armed-process.ts";
import type {
  LifecycleNativeExecution,
  NativeDispatchCheckpoint,
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
    checkpoint: Extract<AttemptCheckpoint, Readonly<{ state: "failed-resumable" }>>;
    observedOwner: ProcessIdentity | null;
  }>): Promise<"recovered" | "active" | "unknown">;
}>;

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

function transitionTo<State extends AttemptState>(
  store: DriverAttemptStore,
  checkpoint: AttemptCheckpoint,
  transitionId: string,
  edge: Parameters<typeof buildTransition>[1]["edge"],
  post: Extract<CheckpointWithoutDigest, Readonly<{ state: State }>>,
): Extract<AttemptCheckpoint, Readonly<{ state: State }>> {
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
  return store.transition(transition.value) as Extract<AttemptCheckpoint, Readonly<{ state: State }>>;
}

function failAttempt(
  store: DriverAttemptStore,
  checkpoint: AttemptCheckpoint,
  code: AttemptFailureCode,
  terminal: boolean,
): AttemptCheckpoint {
  if (["succeeded", "failed-resumable", "failed-terminal"].includes(checkpoint.state)) {
    throw new Error("Attempt is already terminal");
  }
  const failedFromState = checkpoint.state as Exclude<
    AttemptState,
    "succeeded" | "failed-resumable" | "failed-terminal"
  >;
  const recoveryContext =
    (checkpoint.state === "prepared" || checkpoint.state === "dispatched") &&
    checkpoint.dispatchPreparation
      ? Object.freeze({
          dispatchPreparation: checkpoint.dispatchPreparation,
          ...(checkpoint.preparedNativeRun ? { preparedNativeRun: checkpoint.preparedNativeRun } : {}),
          ...(checkpoint.state === "dispatched" && checkpoint.dispatch.kind === "native"
            ? { dispatch: checkpoint.dispatch }
            : {}),
        })
      : undefined;
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

function readSelectedCheckpoint(
  store: DriverAttemptStore,
  input: Readonly<{ batch: number; executionId: string; attemptId: string }>,
): SelectedCheckpoint | null {
  const checkpoint = store.read(input.batch);
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

export function createCoordinator(input: Readonly<{
  registry: DriverRegistrationSetValue;
  store: DriverAttemptStore;
  nativeExecution: NativeExecutionPort;
  audit?: RuntimeAuditPort;
  recovery?: AttemptRecoveryPort;
  observeOwner?: (expected: ProcessIdentity) => ProcessIdentity | null;
  now?: () => Date;
  mintId?: () => string;
}>): SwarmDriverCoordinator {
  const now = input.now ?? (() => new Date());
  const mintId = input.mintId ?? randomUUID;

  const defaultRecovery: AttemptRecoveryPort = Object.freeze({
    async recover({ checkpoint, observedOwner }) {
      if (observedOwner) return "active";
      return ["probing", "selected", "prepared"].includes(checkpoint.failure.failedFromState)
        ? "recovered"
        : "unknown";
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
          expiresAt: new Date(startedAt.getTime() + 30_000).toISOString(),
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
      const prepared = canonicalPreparedUnits(runInput.preparedUnits);
      const runBinding = buildRunRequestBinding({
        preparedUnits: runInput.preparedUnits,
        gitBinding: runInput.gitBinding,
        convergenceCommand: runInput.convergenceCommand,
        ...(runInput.protectedSpec ? { protectedSpecPath: runInput.protectedSpec } : {}),
        evidenceDir: runInput.evidenceDir,
      });
      if (
        prepared.type === "err" ||
        runBinding.type === "err" ||
        !exactUnits(checkpoint.selectionInput.expectedUnits, runInput.preparedUnits.map((unit) => unit.unit))
      ) {
        failAttempt(input.store, checkpoint, "INPUT_INVALID", true);
        return err("PREPARED_MANIFEST_INVALID");
      }
      const manifestDigest = digestValue(prepared.value);
      checkpoint = transitionTo(input.store, checkpoint, mintId(), "selected-prepared", {
        ...withoutDigest(checkpoint),
        state: "prepared",
        preparedUnits: prepared.value,
        worktreeManifestDigest: manifestDigest,
        runBinding: runBinding.value,
      });
      const selection = checkpoint.selectedContext.selection;
      const external = dispatchExternalExecution(input.store, checkpoint, mintId);
      if (external) return ok(external.plan);
      assertNativeSelection(selection);

      const driver = selectedDriver(selection);
      if (!driver) return err("CHECKPOINT_STATE_INVALID");
      const registration = input.registry.forDriver(driver);
      if (registration.slot.kind !== "available") {
        failAttempt(input.store, checkpoint, "COORDINATOR_FAILED", false);
        return err("REGISTRATION_UNAVAILABLE");
      }
      const adapter = registration.slot.adapterSet.forDriver(driver);
      if (!adapter) return err("REGISTRATION_UNAVAILABLE");
      const probeResult = ProbeResult.build(selection.probe);
      if (probeResult.type === "err" || !probeResult.value.isAvailable()) {
        failAttempt(input.store, checkpoint, "SCHEMA_INVALID", true);
        return err("CHECKPOINT_STATE_INVALID");
      }
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
        probe: probeResult.value,
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
        preparedUnits: prepared.value,
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
          runBinding: runBinding.value,
          dispatch,
        });
      let events: readonly NormalizedDriverEvent[];
      try {
        events = await input.nativeExecution.execute({
          adapter,
          launchInput,
          context,
          onDispatchPrepared: async (dispatchPreparation) => {
            if (checkpoint.state !== "prepared" || checkpoint.dispatchPreparation !== undefined) {
              throw new Error("NATIVE_DISPATCH_PREPARATION_INVALID");
            }
            checkpoint = transitionTo(input.store, checkpoint, mintId(), "native-dispatch-prepared", {
              ...withoutDigest(checkpoint),
              state: "prepared",
              dispatchPreparation,
            });
          },
          onResourcesPrepared: async (preparedNativeRun) => {
            if (
              checkpoint.state !== "prepared" ||
              checkpoint.dispatchPreparation === undefined ||
              checkpoint.preparedNativeRun !== undefined
            ) {
              throw new Error("NATIVE_RESOURCE_PREPARATION_INVALID");
            }
            checkpoint = transitionTo(input.store, checkpoint, mintId(), "native-resources-prepared", {
              ...withoutDigest(checkpoint),
              state: "prepared",
              preparedNativeRun,
            });
          },
          onReadyToArm: async (dispatch) => {
            if (
              checkpoint.state !== "prepared" ||
              checkpoint.dispatchPreparation === undefined ||
              checkpoint.preparedNativeRun === undefined ||
              dispatch.nativeRunId !== nativeRunId ||
              dispatch.preparedNativeRunDigest !== digestValue(checkpoint.preparedNativeRun)
            ) {
              throw new Error("NATIVE_DISPATCH_INVALID");
            }
            checkpoint = transitionTo(input.store, checkpoint, mintId(), "prepared-dispatched", {
              ...withoutDigest(checkpoint),
              state: "dispatched",
              preparedUnits: prepared.value,
              worktreeManifestDigest: manifestDigest,
              dispatchDigest: nativeDispatchDigest(dispatch),
              dispatch,
              runBinding: runBinding.value,
            });
          },
          onCaptureBound: async (binding) => {
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
            checkpoint = transitionTo(input.store, checkpoint, mintId(), "capture-bound", {
              ...withoutDigest(checkpoint),
              state: "dispatched",
              dispatchDigest: nativeDispatchDigest(dispatch),
              dispatch,
            });
          },
        });
      } catch {
        failAttempt(input.store, checkpoint, "COORDINATOR_FAILED", false);
        return err("EXECUTION_FAILED");
      }
      const materializedDispatch = input.store.read(runInput.batch);
      if (materializedDispatch?.state !== "dispatched" || materializedDispatch.dispatch.kind !== "native") {
        failAttempt(input.store, checkpoint, "COORDINATOR_FAILED", false);
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
      input.store.recordNativeEvidence({
        batch: checkpoint.batch,
        executionId: checkpoint.executionId,
        attemptId: checkpoint.attemptId,
        driver,
        verdict,
      });
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
        preparedUnits: prepared.value,
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
        if (
          checkpoint?.state !== "failed-resumable" ||
          checkpoint.attemptId !== resumeInput.previousAttemptId
        ) {
          return err("CHECKPOINT_STATE_INVALID");
        }
        const resumedAt = now();
        if (resumedAt.getTime() <= Date.parse(checkpoint.lease.expiresAt)) {
          return err("ATTEMPT_LEASE_ACTIVE");
        }
        let observedOwner: ProcessIdentity | null = null;
        if (checkpoint.lease.ownerProcess) {
          if (input.observeOwner) {
            observedOwner = input.observeOwner(checkpoint.lease.ownerProcess);
          } else {
            const observed = observeProcessIdentity(
              checkpoint.lease.ownerProcess.pid,
              checkpoint.lease.ownerProcess.platform,
            );
            if (observed.type === "ok" && sameProcess(checkpoint.lease.ownerProcess, observed.value)) {
              observedOwner = observed.value;
            }
          }
        }
        if (observedOwner) return err("ATTEMPT_LEASE_ACTIVE");
        const recovery = await (input.recovery ?? defaultRecovery).recover({ checkpoint, observedOwner });
        if (recovery === "active") return err("ATTEMPT_LEASE_ACTIVE");
        if (recovery !== "recovered") return err("ATTEMPT_LIVENESS_UNKNOWN");
        const ownerProcess = observeProcessIdentity(process.pid);
        return ok(
          input.store.beginResume({
            ...resumeInput,
            now: resumedAt.toISOString(),
            expiresAt: new Date(resumedAt.getTime() + 30_000).toISOString(),
            recoveryVerified: true,
            ...(ownerProcess.type === "ok" ? { ownerProcess: ownerProcess.value } : {}),
          }),
        );
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
