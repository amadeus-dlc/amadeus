// Provider-neutral native execution lifecycle for swarm drivers.
// Provider adapters describe resources, transport, capture, and normalization;
// this module owns their ordering and fail-closed binding checks.

import type {
  AdapterExecutionPlan,
  AdapterResourcePreparation,
  AuxiliaryResourcePlan,
  CaptureIdentity,
  CoordinatorTransport,
  DriverAdapter,
  DriverControlSignal,
  EventBoundCaptureBinding,
  EvidenceCapturePlan,
  EvidenceInputs,
  LaunchInput,
  LiveEvidenceInputs,
  MaterializedAuxiliaryResourceSet,
  MaterializedAuxiliaryResource,
  NormalizedDriverEvent,
  NormalizeContext,
  ProcessTerminal,
  RawNativeEvent,
} from "./amadeus-swarm-driver-adapter-contract.ts";
import { digestValue, hasExactKeys, isRecord } from "./amadeus-swarm-canonical.ts";

export type CaptureCheckpoint =
  | Readonly<{
      kind: "fixed-provider-path";
      identityDigest: string;
      capturePlanDigest: string;
      resourcesDigest: string;
      transport: CoordinatorTransport["kind"];
      binding: FixedCaptureBindingReceipt;
    }>
  | Readonly<{
      kind: "event-bound-provider-path";
      identityDigest: string;
      capturePlanDigest: string;
      resourcesDigest: string;
      transport: CoordinatorTransport["kind"];
      binding?: EventBoundCaptureBindingReceipt;
    }>
  | Readonly<{
      kind: "hook-only";
      identityDigest: string;
      capturePlanDigest: string;
      resourcesDigest: string;
      transport: CoordinatorTransport["kind"];
    }>;

export type FixedCaptureBindingReceipt = Readonly<{
  kind: "fixed-provider-path";
  nativeRunId: string;
  sourceResourceIds: readonly string[];
  exactPathDigest: string;
  sourcePlanDigest: string;
}>;

export type EventBoundCaptureBindingReceipt = Readonly<{
  kind: "event-bound-provider-path";
  nativeRunId: string;
  exactPathDigest: string;
  sourceEventDigest: string;
}>;

export type NativeDispatchPreparation = Readonly<{
  kind: "native";
  nativeRunId: string;
  waveIndex: number;
  waveDigest: string;
  resourcePreparationDigest: string;
  captureIdentityDigest: string;
  identityRelativePath: string;
  armRelativePath: string;
  armDigest: string;
}>;

export type PreparedNativeRun = Readonly<{
  kind: "native";
  dispatchPreparationDigest: string;
  resourceReceiptDigest: string;
  executionPlanDigest: string;
  capturePlanDigest: string;
  transportKind: CoordinatorTransport["kind"];
  captureKind: EvidenceCapturePlan["kind"];
}>;

export type NativeDispatchCheckpoint = Readonly<{
  kind: "native";
  nativeRunId: string;
  preparedNativeRunDigest: string;
  resourceReceiptDigest: string;
  processIdentityDigest: string;
  armDigest: string;
  capture: CaptureCheckpoint;
}>;

export type ResourceSupervisorPort = Readonly<{
  materialize(
    preparation: AdapterResourcePreparation,
    input: LaunchInput,
  ): Promise<MaterializedAuxiliaryResourceSet>;
  cleanup(resources: MaterializedAuxiliaryResourceSet): Promise<void>;
}>;

export type EvidenceCaptureSession = Readonly<{
  liveInputs: LiveEvidenceInputs;
  bindingEvents: AsyncIterable<RawNativeEvent>;
  applyBinding(binding: EventBoundCaptureBinding): Promise<void>;
  stopAndWait(terminal: ProcessTerminal): Promise<EvidenceInputs>;
  abortAndWait(reason: string): Promise<void>;
}>;

export type EvidenceCapturePort = Readonly<{
  start(input: Readonly<{
    plan: EvidenceCapturePlan;
    identity: AdapterExecutionPlan["captureIdentity"];
    resources: MaterializedAuxiliaryResourceSet;
  }>): Promise<EvidenceCaptureSession>;
}>;

export type NativeProcessIdentity = Readonly<{
  processIdentityDigest: string;
  armDigest: string;
}>;

export type PlannedProcessRun = Readonly<{
  nativeRunId: string;
  identityRelativePath: string;
  armRelativePath: string;
  armDigest: string;
}>;

export type NativeProcessSession = Readonly<{
  observeIdentity(): Promise<NativeProcessIdentity>;
  arm(): Promise<void>;
  waitForTerminal(input: Readonly<{
    transport: CoordinatorTransport;
    controlSignals?: AsyncIterable<DriverControlSignal>;
  }>): Promise<ProcessTerminal>;
  terminateAndWait(reason: string): Promise<ProcessTerminal>;
}>;

export type NativeProcessPort = Readonly<{
  plan(input: Readonly<{
    nativeRunId: string;
    evidenceDir: string;
  }>): PlannedProcessRun;
  spawn(input: Readonly<{
    plan: PlannedProcessRun;
    launch: AdapterExecutionPlan["launch"];
  }>): Promise<NativeProcessSession>;
}>;

export type NativeLifecycleExecutionInput = Readonly<{
  adapter: DriverAdapter;
  launchInput: LaunchInput;
  context: NormalizeContext;
  onDispatchPrepared(preparation: NativeDispatchPreparation): Promise<void>;
  onResourcesPrepared(prepared: PreparedNativeRun): Promise<void>;
  onReadyToArm(checkpoint: NativeDispatchCheckpoint): Promise<void>;
  onCaptureBound(binding: EventBoundCaptureBindingReceipt): Promise<void>;
}>;

export type LifecycleNativeExecution = Readonly<{
  execute(input: NativeLifecycleExecutionInput): Promise<readonly NormalizedDriverEvent[]>;
}>;

function requireCondition(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function stringArray(value: unknown, allowEmpty = false): value is readonly string[] {
  return Array.isArray(value) && (allowEmpty || value.length > 0) && value.every(nonEmpty);
}

function exclusivePlanIsValid(resource: Record<string, unknown>): boolean {
  return (
    hasExactKeys(resource, ["kind", "resourceId", "candidates"]) &&
    Array.isArray(resource.candidates) &&
    resource.candidates.length > 0 &&
    resource.candidates.every(
      (candidate) =>
        hasExactKeys(candidate, ["reservationPath", "guardedPaths"]) &&
        nonEmpty(candidate.reservationPath) &&
        stringArray(candidate.guardedPaths),
    )
  );
}

function ownedFilePlanIsValid(resource: Record<string, unknown>): boolean {
  return (
    hasExactKeys(resource, ["kind", "resourceId", "path", "bytes", "mode"]) &&
    nonEmpty(resource.path) &&
    resource.bytes instanceof Uint8Array &&
    resource.mode === "0600"
  );
}

function ownedDirectoryPlanIsValid(resource: Record<string, unknown>): boolean {
  return (
    hasExactKeys(resource, ["kind", "resourceId", "path", "mode"]) &&
    nonEmpty(resource.path) &&
    resource.mode === "0700"
  );
}

function baselinePlanIsValid(resource: Record<string, unknown>): boolean {
  return (
    hasExactKeys(resource, ["kind", "resourceId", "exactPaths", "allowAbsent"]) &&
    stringArray(resource.exactPaths) &&
    typeof resource.allowAbsent === "boolean"
  );
}

function resourcePlanIsValid(resource: unknown): resource is AuxiliaryResourcePlan {
  if (!isRecord(resource) || !nonEmpty(resource.resourceId)) return false;
  if (resource.kind === "exclusive-reservation") return exclusivePlanIsValid(resource);
  if (resource.kind === "attempt-owned-file") return ownedFilePlanIsValid(resource);
  if (resource.kind === "attempt-owned-directory") return ownedDirectoryPlanIsValid(resource);
  return resource.kind === "pre-arm-baseline" && baselinePlanIsValid(resource);
}

function validatePreparation(preparation: AdapterResourcePreparation): void {
  requireCondition(
    hasExactKeys(preparation, ["resources", "preparationDigest"]) &&
      Array.isArray(preparation.resources) &&
      preparation.resources.every(resourcePlanIsValid) &&
      preparation.preparationDigest === digestValue(preparation.resources),
    "RESOURCE_PREPARATION_INVALID",
  );
  const ids = preparation.resources.map((resource) => resource.resourceId);
  requireCondition(new Set(ids).size === ids.length, "RESOURCE_PREPARATION_INVALID");
}

function samePaths(left: readonly string[], right: readonly string[]): boolean {
  return digestValue([...new Set(left)].sort()) === digestValue([...new Set(right)].sort());
}

function materializedResourceIsValid(
  resource: MaterializedAuxiliaryResource,
  plan: AuxiliaryResourcePlan,
): boolean {
  const selected = resource.selectedCandidateIndex;
  const commonValid =
    hasExactKeys(resource, [
      "resourceId",
      "kind",
      ...(selected === undefined ? [] : ["selectedCandidateIndex"]),
      "resolvedPaths",
      "ownerDigest",
      "contentOrBaselineDigest",
    ]) &&
    resource.resourceId === plan.resourceId &&
    resource.kind === plan.kind &&
    stringArray(resource.resolvedPaths, plan.kind === "pre-arm-baseline" && plan.allowAbsent) &&
    nonEmpty(resource.ownerDigest) &&
    nonEmpty(resource.contentOrBaselineDigest);
  if (!commonValid) return false;
  if (plan.kind === "exclusive-reservation") return materializedReservationIsValid(resource, plan);
  if (selected !== undefined) return false;
  if (plan.kind === "attempt-owned-file" || plan.kind === "attempt-owned-directory") {
    return samePaths(resource.resolvedPaths, [plan.path]);
  }
  return samePaths(resource.resolvedPaths, plan.exactPaths) || (plan.allowAbsent && resource.resolvedPaths.length === 0);
}

function materializedReservationIsValid(
  resource: MaterializedAuxiliaryResource,
  plan: Extract<AuxiliaryResourcePlan, Readonly<{ kind: "exclusive-reservation" }>>,
): boolean {
  const selected = resource.selectedCandidateIndex;
  return (
    Number.isInteger(selected) &&
    Number(selected) >= 0 &&
    Number(selected) < plan.candidates.length &&
    samePaths(resource.resolvedPaths, plan.candidates[Number(selected)].guardedPaths)
  );
}

function validateMaterializedResources(
  preparation: AdapterResourcePreparation,
  resources: MaterializedAuxiliaryResourceSet,
): void {
  requireCondition(
    hasExactKeys(resources, ["preparationDigest", "receiptDigest", "resources"]) &&
      resources.preparationDigest === preparation.preparationDigest &&
      Array.isArray(resources.resources) &&
      resources.receiptDigest === digestValue(resources.resources),
    "RESOURCE_PREPARATION_MISMATCH",
  );
  const expected = new Map(preparation.resources.map((resource) => [resource.resourceId, resource] as const));
  const actualIds = resources.resources.map((resource) => resource.resourceId);
  requireCondition(
    resources.resources.length === expected.size && new Set(actualIds).size === actualIds.length,
    "RESOURCE_RECEIPT_INVALID",
  );
  for (const resource of resources.resources) {
    const plan = expected.get(resource.resourceId);
    requireCondition(Boolean(plan) && materializedResourceIsValid(resource, plan!), "RESOURCE_RECEIPT_INVALID");
  }
}

function transportIsValid(transport: CoordinatorTransport): boolean {
  return transport.kind === "stdio-json"
    ? stdioTransportIsValid(transport)
    : ptyTransportIsValid(transport);
}

function stdioTransportIsValid(
  transport: Extract<CoordinatorTransport, Readonly<{ kind: "stdio-json" }>>,
): boolean {
  return (
    hasExactKeys(transport, ["kind", "stdin", "output"]) &&
    (transport.stdin === "closed" || transport.stdin instanceof Uint8Array) &&
    (transport.output === "stream-json" || transport.output === "jsonl")
  );
}

function ptyTransportIsValid(
  transport: Extract<CoordinatorTransport, Readonly<{ kind: "pty-interactive" }>>,
): boolean {
  return (
    hasExactKeys(transport, [
      "kind",
      "initialInput",
      "columns",
      "rows",
      "exitOnSignal",
      "gracefulExitInput",
      "controlTimeoutMs",
      "gracefulExitTimeoutMs",
    ]) &&
    transport.initialInput instanceof Uint8Array &&
    transport.columns === 120 &&
    transport.rows === 40 &&
    transport.exitOnSignal === "ready-for-graceful-exit" &&
    transport.gracefulExitInput instanceof Uint8Array &&
    Number.isFinite(transport.controlTimeoutMs) &&
    transport.controlTimeoutMs > 0 &&
    Number.isFinite(transport.gracefulExitTimeoutMs) &&
    transport.gracefulExitTimeoutMs > 0
  );
}

function captureIdentityMatches(
  identity: AdapterExecutionPlan["captureIdentity"],
  context: NormalizeContext,
): boolean {
  return (
    hasExactKeys(identity, [
      "executionId",
      "attemptId",
      "attemptNonceHash",
      "planDigest",
      "waveIndex",
      "waveDigest",
    ]) &&
    identity.executionId === context.executionId &&
    identity.attemptId === context.attemptId &&
    identity.attemptNonceHash === context.attemptNonceHash &&
    identity.planDigest === context.planDigest &&
    identity.waveIndex === context.waveIndex &&
    identity.waveDigest === context.waveDigest
  );
}

function fixedBindingReceipt(
  plan: Extract<EvidenceCapturePlan, Readonly<{ kind: "fixed-provider-path" }>>,
  nativeRunId: string,
  preparation: AdapterResourcePreparation,
  resources: MaterializedAuxiliaryResourceSet,
): FixedCaptureBindingReceipt | null {
  const binding = plan.initialBinding;
  const canonicalPaths = [...new Set(binding.exactPaths)].sort();
  if (!(
    binding.kind === plan.kind &&
    binding.nativeRunId === nativeRunId &&
    binding.exactPaths.length > 0 &&
    binding.exactPaths.every(nonEmpty) &&
    binding.exactPathDigest === digestValue(canonicalPaths) &&
    binding.sourcePlanDigest === preparation.preparationDigest
  )) return null;
  const exactPaths = canonicalPaths;
  const sources = resources.resources
    .filter((resource) => resource.resolvedPaths.some((path) => exactPaths.includes(path)))
    .sort((left, right) => left.resourceId.localeCompare(right.resourceId));
  const materializedPaths = [...new Set(sources.flatMap((resource) => resource.resolvedPaths))].sort();
  if (sources.length === 0 || !samePaths(exactPaths, materializedPaths)) return null;
  return Object.freeze({
    kind: binding.kind,
    nativeRunId,
    sourceResourceIds: Object.freeze(sources.map((resource) => resource.resourceId)),
    exactPathDigest: binding.exactPathDigest,
    sourcePlanDigest: binding.sourcePlanDigest,
  });
}

function capturePlanHasExactShape(capture: EvidenceCapturePlan): boolean {
  if (capture.kind === "fixed-provider-path") {
    return (
      hasExactKeys(capture, ["kind", "initialBinding", "hookDir"]) &&
      hasExactKeys(capture.initialBinding, [
        "kind",
        "nativeRunId",
        "exactPaths",
        "exactPathDigest",
        "sourcePlanDigest",
      ])
    );
  }
  return (
    (capture.kind === "event-bound-provider-path" || capture.kind === "hook-only") &&
    hasExactKeys(capture, ["kind", "hookDir"])
  );
}

function validateExecutionPlan(
  execution: AdapterExecutionPlan,
  preparation: AdapterResourcePreparation,
  resources: MaterializedAuxiliaryResourceSet,
  input: NativeLifecycleExecutionInput,
): void {
  requireCondition(
    hasExactKeys(execution, ["launch", "capture", "captureIdentity", "resources"]) &&
      hasExactKeys(execution.launch, ["executable", "args", "cwd", "env", "transport", "timeoutMs"]) &&
      nonEmpty(execution.launch.executable) &&
      Array.isArray(execution.launch.args) &&
      execution.launch.args.every((argument) => typeof argument === "string") &&
      nonEmpty(execution.launch.cwd) &&
      isRecord(execution.launch.env) &&
      Object.values(execution.launch.env).every((value) => typeof value === "string") &&
      Number.isFinite(execution.launch.timeoutMs) &&
      execution.launch.timeoutMs > 0 &&
      transportIsValid(execution.launch.transport),
    "EXECUTION_PLAN_INVALID",
  );
  requireCondition(
    digestValue(execution.resources) === preparation.preparationDigest,
    "RESOURCE_PLAN_MISMATCH",
  );
  requireCondition(
    captureIdentityMatches(execution.captureIdentity, input.context),
    "CAPTURE_IDENTITY_MISMATCH",
  );
  requireCondition(
    capturePlanHasExactShape(execution.capture) &&
      nonEmpty(execution.capture.hookDir) &&
      resources.resources.some((resource) => resource.resolvedPaths.includes(execution.capture.hookDir)),
    "CAPTURE_PLAN_INVALID",
  );
  if (execution.capture.kind === "fixed-provider-path") {
    requireCondition(
      fixedBindingReceipt(execution.capture, input.launchInput.nativeRunId, preparation, resources),
      "CAPTURE_BINDING_INVALID",
    );
  }
}

function captureCheckpoint(
  execution: AdapterExecutionPlan,
  preparation: AdapterResourcePreparation,
  resources: MaterializedAuxiliaryResourceSet,
): CaptureCheckpoint {
  const common = Object.freeze({
    identityDigest: digestValue(execution.captureIdentity),
    capturePlanDigest: digestValue(execution.capture),
    resourcesDigest: resources.receiptDigest,
    transport: execution.launch.transport.kind,
  });
  if (execution.capture.kind === "fixed-provider-path") {
    const binding = fixedBindingReceipt(
      execution.capture,
      execution.capture.initialBinding.nativeRunId,
      preparation,
      resources,
    );
    if (!binding) throw new Error("CAPTURE_BINDING_INVALID");
    return Object.freeze({
      kind: execution.capture.kind,
      ...common,
      binding,
    });
  }
  return Object.freeze({ kind: execution.capture.kind, ...common });
}

function eventBindingReceipt(
  binding: EventBoundCaptureBinding,
  nativeRunId: string,
  event: RawNativeEvent,
): EventBoundCaptureBindingReceipt {
  const canonicalPaths = [...new Set(binding.exactPaths)].sort();
  requireCondition(
    hasExactKeys(binding, [
      "kind",
      "nativeRunId",
      "exactPaths",
      "exactPathDigest",
      "sourceEventDigest",
    ]) &&
      binding.kind === "event-bound-provider-path" &&
      binding.nativeRunId === nativeRunId &&
      binding.exactPaths.length > 0 &&
      binding.exactPaths.every(nonEmpty) &&
      binding.exactPathDigest === digestValue(canonicalPaths) &&
      binding.sourceEventDigest === digestValue(event),
    "CAPTURE_BINDING_INVALID",
  );
  return Object.freeze({
    kind: binding.kind,
    nativeRunId,
    exactPathDigest: binding.exactPathDigest,
    sourceEventDigest: binding.sourceEventDigest,
  });
}

async function bindEventCapture(
  input: NativeLifecycleExecutionInput,
  execution: AdapterExecutionPlan,
  session: EvidenceCaptureSession,
): Promise<void> {
  if (execution.capture.kind !== "event-bound-provider-path") return;
  for await (const event of session.bindingEvents) {
    const resolution = input.adapter.resolveCaptureBinding({
      plan: execution.capture,
      identity: execution.captureIdentity,
      event,
    });
    if (resolution.kind === "invalid") throw new Error("CAPTURE_BINDING_INVALID");
    if (resolution.kind !== "bound") continue;
    const receipt = eventBindingReceipt(resolution.binding, input.launchInput.nativeRunId, event);
    await input.onCaptureBound(receipt);
    await session.applyBinding(resolution.binding);
    return;
  }
  throw new Error("CAPTURE_BINDING_MISSING");
}

function controlSignalMatches(signal: DriverControlSignal, context: NormalizeContext): boolean {
  return (
    hasExactKeys(signal, [
      "kind",
      "driver",
      "executionId",
      "attemptId",
      "attemptNonceHash",
      "planDigest",
      "waveIndex",
      "waveDigest",
      "coveredUnits",
      "liveEvidenceDigest",
    ]) &&
    signal.kind === "ready-for-graceful-exit" &&
    signal.driver === context.driver &&
    signal.executionId === context.executionId &&
    signal.attemptId === context.attemptId &&
    signal.attemptNonceHash === context.attemptNonceHash &&
    signal.planDigest === context.planDigest &&
    signal.waveIndex === context.waveIndex &&
    signal.waveDigest === context.waveDigest &&
    samePaths(signal.coveredUnits, context.expectedUnits) &&
    signal.coveredUnits.length === context.expectedUnits.length &&
    nonEmpty(signal.liveEvidenceDigest)
  );
}

function timeout<T>(promise: Promise<T>, timeoutMs: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(code)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function exactlyOneControlSignal(
  signals: AsyncIterable<DriverControlSignal>,
  context: NormalizeContext,
  timeoutMs: number,
): Promise<DriverControlSignal> {
  const iterator = signals[Symbol.asyncIterator]();
  const first = await timeout(iterator.next(), timeoutMs, "CONTROL_SIGNAL_TIMEOUT");
  requireCondition(!first.done && controlSignalMatches(first.value, context), "CONTROL_SIGNAL_INVALID");
  const second = await timeout(iterator.next(), timeoutMs, "CONTROL_SIGNAL_TIMEOUT");
  requireCondition(second.done, "CONTROL_SIGNAL_INVALID");
  return first.value;
}

function terminalMatches(
  terminal: ProcessTerminal,
  expected: TerminalMatchExpectation,
): boolean {
  const hasControl = terminal.controlSignalDigest !== undefined;
  return (
    hasExactKeys(terminal, [
      "transport",
      "exitCode",
      "processGroupId",
      "nativeRunId",
      "processIdentityDigest",
      ...(hasControl ? ["controlSignalDigest"] : []),
    ]) &&
    terminal.transport === expected.transport &&
    terminal.nativeRunId === expected.nativeRunId &&
    (!expected.processIdentityDigest || terminal.processIdentityDigest === expected.processIdentityDigest) &&
    (expected.controlSignalDigest === undefined
      ? !hasControl || nonEmpty(terminal.controlSignalDigest)
      : terminal.controlSignalDigest === expected.controlSignalDigest) &&
    Number.isInteger(terminal.exitCode) &&
    Number.isInteger(terminal.processGroupId) &&
    terminal.processGroupId > 0 &&
    nonEmpty(terminal.processIdentityDigest)
  );
}

type TerminalMatchExpectation = Readonly<{
  transport: CoordinatorTransport["kind"];
  nativeRunId: string;
  processIdentityDigest?: string;
  controlSignalDigest?: string;
}>;

async function collectEvents(
  events: AsyncIterable<NormalizedDriverEvent>,
): Promise<readonly NormalizedDriverEvent[]> {
  const collected: NormalizedDriverEvent[] = [];
  for await (const event of events) collected.push(event);
  return Object.freeze(collected);
}

function captureIdentityFromContext(context: NormalizeContext): CaptureIdentity {
  return Object.freeze({
    executionId: context.executionId,
    attemptId: context.attemptId,
    attemptNonceHash: context.attemptNonceHash,
    planDigest: context.planDigest,
    waveIndex: context.waveIndex,
    waveDigest: context.waveDigest,
  });
}

function relativePathIsValid(path: string): boolean {
  return (
    nonEmpty(path) &&
    !path.startsWith("/") &&
    !/^[A-Za-z]:[\\/]/.test(path) &&
    !path.split(/[\\/]/).includes("..")
  );
}

function validateProcessPlan(plan: PlannedProcessRun, nativeRunId: string): void {
  requireCondition(
    hasExactKeys(plan, ["nativeRunId", "identityRelativePath", "armRelativePath", "armDigest"]) &&
      plan.nativeRunId === nativeRunId &&
      relativePathIsValid(plan.identityRelativePath) &&
      relativePathIsValid(plan.armRelativePath) &&
      plan.identityRelativePath !== plan.armRelativePath &&
      nonEmpty(plan.armDigest),
    "PROCESS_PLAN_INVALID",
  );
}

type FailedExecutionRecoveryInput = Readonly<{
  error: unknown;
  resources: MaterializedAuxiliaryResourceSet;
  resourcePort: ResourceSupervisorPort;
  capture?: EvidenceCaptureSession;
  process?: NativeProcessSession;
  terminal?: ProcessTerminal;
  captureJoined: boolean;
  transport: CoordinatorTransport["kind"];
  nativeRunId: string;
  processIdentityDigest?: string;
}>;

async function recoverFailedExecution(input: FailedExecutionRecoveryInput): Promise<never> {
  const recoveryErrors: unknown[] = [];
  let terminal = input.terminal;
  let processTerminal = input.process === undefined || terminal !== undefined;
  let captureJoined = input.capture === undefined || input.captureJoined;
  if (input.process && !terminal) {
    try {
      terminal = await input.process.terminateAndWait("native-execution-failed");
      requireCondition(terminalMatches(terminal, input), "PROCESS_TERMINAL_INVALID");
      processTerminal = true;
    } catch (error) {
      recoveryErrors.push(error);
    }
  }
  if (input.capture && !captureJoined) {
    try {
      if (terminal) {
        const evidence = await input.capture.stopAndWait(terminal);
        requireCondition(
          digestValue(evidence.processTerminal) === digestValue(terminal),
          "CAPTURE_TERMINAL_MISMATCH",
        );
      } else await input.capture.abortAndWait("native-execution-failed");
      captureJoined = true;
    } catch (error) {
      recoveryErrors.push(error);
    }
  }
  if (processTerminal && captureJoined) {
    try {
      await input.resourcePort.cleanup(input.resources);
    } catch (error) {
      recoveryErrors.push(error);
    }
  }
  if (recoveryErrors.length > 0) {
    throw new AggregateError([input.error, ...recoveryErrors], "NATIVE_EXECUTION_RECOVERY_FAILED");
  }
  throw input.error;
}

export function createLifecycleNativeExecution(ports: Readonly<{
  resources: ResourceSupervisorPort;
  capture: EvidenceCapturePort;
  process: NativeProcessPort;
}>): LifecycleNativeExecution {
  return Object.freeze({
    async execute(input): Promise<readonly NormalizedDriverEvent[]> {
      const preparation = input.adapter.prepareResources(input.launchInput);
      validatePreparation(preparation);
      const processPlan = ports.process.plan({
        nativeRunId: input.launchInput.nativeRunId,
        evidenceDir: input.launchInput.evidenceDir,
      });
      validateProcessPlan(processPlan, input.launchInput.nativeRunId);
      const dispatchPreparation: NativeDispatchPreparation = Object.freeze({
        kind: "native",
        nativeRunId: input.launchInput.nativeRunId,
        waveIndex: input.context.waveIndex,
        waveDigest: input.context.waveDigest,
        resourcePreparationDigest: preparation.preparationDigest,
        captureIdentityDigest: digestValue(captureIdentityFromContext(input.context)),
        identityRelativePath: processPlan.identityRelativePath,
        armRelativePath: processPlan.armRelativePath,
        armDigest: processPlan.armDigest,
      });
      await input.onDispatchPrepared(dispatchPreparation);
      const resources = await ports.resources.materialize(preparation, input.launchInput);
      let capture: EvidenceCaptureSession | undefined;
      let process: NativeProcessSession | undefined;
      let terminal: ProcessTerminal | undefined;
      let captureJoined = false;
      let execution: AdapterExecutionPlan | undefined;
      let processIdentityDigest: string | undefined;
      try {
        validateMaterializedResources(preparation, resources);
        execution = input.adapter.buildExecution(input.launchInput, resources);
        validateExecutionPlan(execution, preparation, resources, input);
        const preparedNativeRun: PreparedNativeRun = Object.freeze({
          kind: "native",
          dispatchPreparationDigest: digestValue(dispatchPreparation),
          resourceReceiptDigest: resources.receiptDigest,
          executionPlanDigest: digestValue(execution),
          capturePlanDigest: digestValue(execution.capture),
          transportKind: execution.launch.transport.kind,
          captureKind: execution.capture.kind,
        });
        await input.onResourcesPrepared(preparedNativeRun);
        capture = await ports.capture.start({
          plan: execution.capture,
          identity: execution.captureIdentity,
          resources,
        });
        process = await ports.process.spawn({
          plan: processPlan,
          launch: execution.launch,
        });
        const identity = await process.observeIdentity();
        requireCondition(
          nonEmpty(identity.processIdentityDigest) && identity.armDigest === processPlan.armDigest,
          "PROCESS_IDENTITY_INVALID",
        );
        processIdentityDigest = identity.processIdentityDigest;
        await input.onReadyToArm(
          Object.freeze({
            kind: "native",
            nativeRunId: input.launchInput.nativeRunId,
            preparedNativeRunDigest: digestValue(preparedNativeRun),
            resourceReceiptDigest: resources.receiptDigest,
            processIdentityDigest: identity.processIdentityDigest,
            armDigest: identity.armDigest,
            capture: captureCheckpoint(execution, preparation, resources),
          }),
        );
        await process.arm();
        await bindEventCapture(input, execution, capture);
        const controlSignal = execution.launch.transport.kind === "pty-interactive"
          ? await exactlyOneControlSignal(
              input.adapter.observeControl(capture.liveInputs, input.context),
              input.context,
              execution.launch.transport.controlTimeoutMs,
            )
          : undefined;
        const controlSignalDigest = controlSignal ? digestValue(controlSignal) : undefined;
        terminal = await process.waitForTerminal({
          transport: execution.launch.transport,
          ...(controlSignal
            ? { controlSignals: (async function* () { yield controlSignal; })() }
            : {}),
        });
        requireCondition(
          terminalMatches(terminal, {
            transport: execution.launch.transport.kind,
            nativeRunId: input.launchInput.nativeRunId,
            processIdentityDigest: identity.processIdentityDigest,
            ...(controlSignalDigest ? { controlSignalDigest } : {}),
          }),
          "PROCESS_TERMINAL_INVALID",
        );
        const evidence = await capture.stopAndWait(terminal);
        requireCondition(
          digestValue(evidence.processTerminal) === digestValue(terminal),
          "CAPTURE_TERMINAL_MISMATCH",
        );
        captureJoined = true;
        const events = await collectEvents(input.adapter.normalize(evidence, input.context));
        await ports.resources.cleanup(resources);
        return events;
      } catch (error) {
        return await recoverFailedExecution({
          error,
          resources,
          resourcePort: ports.resources,
          ...(capture ? { capture } : {}),
          ...(process ? { process } : {}),
          ...(terminal ? { terminal } : {}),
          captureJoined,
          transport: execution?.launch.transport.kind ?? "stdio-json",
          nativeRunId: input.launchInput.nativeRunId,
          ...(processIdentityDigest ? { processIdentityDigest } : {}),
        });
      }
    },
  });
}
