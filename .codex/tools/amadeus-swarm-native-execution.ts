// Provider-neutral native execution lifecycle for swarm drivers.
// Provider adapters describe resources, transport, capture, and normalization;
// this module owns their ordering and fail-closed binding checks.

import type {
  AdapterExecutionPlan,
  AdapterResourcePreparation,
  AttemptEvidenceSession,
  AuxiliaryResourcePlan,
  CaptureIdentity,
  CoordinatorTransport,
  DriverAdapter,
  DriverControlSignal,
  EventBoundCaptureBinding,
  EvidenceCapturePlan,
  LaunchInput,
  MaterializedAuxiliaryResourceSet,
  MaterializedAuxiliaryResource,
  NormalizedDriverEvent,
  NormalizeContext,
  ProcessTerminal,
  RawEvidenceFrame,
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
  planDigest: string;
  fencingToken: number;
  waveIndex: number;
  waveDigest: string;
  resourcePreparationDigest: string;
  captureIdentityDigest: string;
  identityRelativePath: string;
  armRelativePath: string;
  armDigest: string;
  runEpochDigest: string;
  recoveryJournalRelativePath: string;
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
  armDeadline: string;
  capture: CaptureCheckpoint;
}>;

export type NativeResourceRecoveryOwner = Readonly<{
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  nativeRunId: string;
  fencingToken: number;
  processIdentityDigest: string;
}>;

export type NativeResourceRecoveryObservation = Readonly<{
  ownerState: "live" | "dead" | "unknown";
  processIdentityDigest: string;
  processGroupState: "live" | "stopped" | "unknown";
}>;

export type NativeResourceRecoveryObserverPort = Readonly<{
  observe(owner: NativeResourceRecoveryOwner): Promise<NativeResourceRecoveryObservation>;
}>;

export type ResourceSupervisorPort = Readonly<{
  materialize(
    preparation: AdapterResourcePreparation,
    input: LaunchInput,
  ): Promise<MaterializedAuxiliaryResourceSet>;
  bindRecoveryOwner(
    resources: MaterializedAuxiliaryResourceSet,
    owner: NativeResourceRecoveryOwner,
  ): Promise<void>;
  verifyForArm(
    preparation: AdapterResourcePreparation,
    resources: MaterializedAuxiliaryResourceSet,
  ): Promise<void>;
  cleanup(resources: MaterializedAuxiliaryResourceSet): Promise<void>;
}>;

export type EvidenceCaptureSession = Readonly<{
  applyBinding(binding: EventBoundCaptureBinding): Promise<void>;
  stopAndWait(terminal: ProcessTerminal): Promise<void>;
  abortAndWait(reason: string): Promise<void>;
}>;

export type RawEvidenceSink = Readonly<{
  ingest(frame: RawEvidenceFrame): void;
  close(): void;
  fail(error: unknown): void;
}>;

export type NativeProcessOutputFrame =
  | Readonly<{
      kind: "evidence";
      transport: "stdio-json";
      channel: "stdout";
      bytes: Uint8Array;
    }>
  | Readonly<{
      kind: "diagnostic";
      transport: "stdio-json";
      channel: "stderr";
      bytes: Uint8Array;
    }>
  | Readonly<{
      kind: "diagnostic";
      transport: "pty-interactive";
      channel: "pty";
      bytes: Uint8Array;
    }>;

export type EvidenceCapturePort = Readonly<{
  start(input: Readonly<{
    nativeRunId: string;
    plan: EvidenceCapturePlan;
    identity: AdapterExecutionPlan["captureIdentity"];
    resources: MaterializedAuxiliaryResourceSet;
    evidence: RawEvidenceSink;
  }>): Promise<EvidenceCaptureSession>;
}>;

export type NativeProcessIdentity = Readonly<{
  processIdentityDigest: string;
  armDigest: string;
  armDeadline: string;
}>;

export type PlannedProcessRun = Readonly<{
  nativeRunId: string;
  identityRelativePath: string;
  armRelativePath: string;
  armDigest: string;
  runEpochDigest: string;
  recoveryJournalRelativePath: string;
}>;

export type NativeProcessSession = Readonly<{
  observeIdentity(): Promise<NativeProcessIdentity>;
  arm(): Promise<void>;
  waitForTerminal(input: Readonly<{
    transport: CoordinatorTransport;
    controlSignals?: AsyncIterable<DriverControlSignal>;
  }>): Promise<ProcessTerminal>;
  terminateAndWait(reason: string): Promise<ProcessTerminal>;
  dispose(): Promise<void>;
}>;

export type NativeProcessPort = Readonly<{
  plan(input: Readonly<{
    nativeRunId: string;
    evidenceDir: string;
    context: NormalizeContext;
    fencingToken: number;
  }>): PlannedProcessRun;
  spawn(input: Readonly<{
    plan: PlannedProcessRun;
    launch: AdapterExecutionPlan["launch"];
  }>): Promise<NativeProcessSession>;
  releasePlan?(plan: PlannedProcessRun): Promise<void>;
}>;

export type NativeLifecycleExecutionInput = Readonly<{
  adapter: DriverAdapter;
  launchInput: LaunchInput;
  context: NormalizeContext;
  fencingToken: number;
  onDispatchPrepared(preparation: NativeDispatchPreparation): Promise<void>;
  onResourcesPrepared(prepared: PreparedNativeRun): Promise<void>;
  onProcessObserved?(checkpoint: NativeDispatchCheckpoint): void;
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
  event: RawEvidenceFrame,
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

type ResolvedEventBinding = Readonly<{
  binding: EventBoundCaptureBinding;
  receipt: EventBoundCaptureBindingReceipt;
}>;

function evidenceBridge(
  input: NativeLifecycleExecutionInput,
  execution: AdapterExecutionPlan,
  attempt: AttemptEvidenceSession,
): EvidenceBridge {
  let resolveBinding: ((binding: ResolvedEventBinding) => void) | undefined;
  let rejectBinding: ((error: unknown) => void) | undefined;
  let bindingSettled = false;
  const binding = execution.capture.kind === "event-bound-provider-path"
    ? new Promise<ResolvedEventBinding>((resolveValue, reject) => {
        resolveBinding = resolveValue;
        rejectBinding = reject;
      })
    : undefined;
  void binding?.catch(() => {});
  const failBinding = (error: unknown): void => {
    if (!binding || bindingSettled) return;
    bindingSettled = true;
    rejectBinding?.(error);
  };
  return Object.freeze({
    sink: Object.freeze({
      ingest(frame: RawEvidenceFrame): void {
        attempt.ingest(frame);
        if (execution.capture.kind !== "event-bound-provider-path" || bindingSettled) return;
        const resolution = input.adapter.resolveCaptureBinding({
          plan: execution.capture,
          identity: execution.captureIdentity,
          event: frame,
        });
        if (resolution.kind === "invalid") {
          const error = new Error("CAPTURE_BINDING_INVALID");
          failBinding(error);
          throw error;
        }
        if (resolution.kind !== "bound") return;
        const receipt = eventBindingReceipt(
          resolution.binding,
          input.launchInput.nativeRunId,
          frame,
        );
        bindingSettled = true;
        resolveBinding?.(Object.freeze({ binding: resolution.binding, receipt }));
      },
      close(): void {
        failBinding(new Error("CAPTURE_BINDING_MISSING"));
      },
      fail(error: unknown): void {
        failBinding(error);
      },
    }),
    async bind(session: EvidenceCaptureSession): Promise<void> {
      if (!binding) return;
      const resolved = await binding;
      await input.onCaptureBound(resolved.receipt);
      await session.applyBinding(resolved.binding);
    },
  });
}

type EvidenceBridge = Readonly<{
  sink: RawEvidenceSink;
  bind(session: EvidenceCaptureSession): Promise<void>;
}>;

function openEvidenceSession(
  adapter: DriverAdapter,
  context: NormalizeContext,
): AttemptEvidenceSession {
  const session = adapter.openEvidenceSession(context);
  const liveInputs = session?.liveInputs;
  requireCondition(
      session !== undefined &&
      liveInputs !== undefined &&
      liveInputs !== null &&
      typeof liveInputs.providerState?.[Symbol.asyncIterator] === "function" &&
      typeof liveInputs.nativeEvents?.[Symbol.asyncIterator] === "function" &&
      typeof session.ingest === "function" &&
      typeof session.seal === "function" &&
      typeof session.abort === "function",
    "EVIDENCE_SESSION_UNAVAILABLE",
  );
  return session;
}

async function abortEvidenceSession(
  session: AttemptEvidenceSession,
  reason: string,
): Promise<void> {
  try {
    await session.abort(reason);
  } catch (error) {
    throw new Error("EVIDENCE_SESSION_ABORT_FAILED", { cause: error });
  }
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

function validateProcessPlan(
  plan: PlannedProcessRun,
  nativeRunId: string,
): asserts plan is PlannedProcessRun & Readonly<{ runEpochDigest: string }> {
  requireCondition(
    hasExactKeys(plan, [
      "nativeRunId",
      "identityRelativePath",
      "armRelativePath",
      "armDigest",
      "runEpochDigest",
      "recoveryJournalRelativePath",
    ]) &&
      plan.nativeRunId === nativeRunId &&
      relativePathIsValid(plan.identityRelativePath) &&
      relativePathIsValid(plan.armRelativePath) &&
      plan.identityRelativePath !== plan.armRelativePath &&
      nonEmpty(plan.armDigest) &&
      nonEmpty(plan.runEpochDigest) &&
      relativePathIsValid(plan.recoveryJournalRelativePath),
    "PROCESS_PLAN_INVALID",
  );
}

type FailedExecutionRecoveryInput = Readonly<{
  error: unknown;
  resources: MaterializedAuxiliaryResourceSet;
  resourcePort: ResourceSupervisorPort;
  capture?: EvidenceCaptureSession;
  evidenceSession?: AttemptEvidenceSession;
  process?: NativeProcessSession;
  terminal?: ProcessTerminal;
  captureJoined: boolean;
  evidenceSealed: boolean;
  processDisposed: boolean;
  transport: CoordinatorTransport["kind"];
  nativeRunId: string;
  processIdentityDigest?: string;
}>;

async function recoverProcessTerminal(
  input: FailedExecutionRecoveryInput,
  errors: unknown[],
): Promise<ProcessTerminal | undefined> {
  if (!input.process || input.terminal) return input.terminal;
  try {
    const terminal = await input.process.terminateAndWait("native-execution-failed");
    requireCondition(terminalMatches(terminal, input), "PROCESS_TERMINAL_INVALID");
    return terminal;
  } catch (error) {
    errors.push(error);
    return undefined;
  }
}

async function recoverCapture(
  input: FailedExecutionRecoveryInput,
  terminal: ProcessTerminal | undefined,
  errors: unknown[],
): Promise<boolean> {
  if (!input.capture || input.captureJoined) return true;
  try {
    if (terminal) await input.capture.stopAndWait(terminal);
    else await input.capture.abortAndWait("native-execution-failed");
    return true;
  } catch (error) {
    errors.push(error);
    return false;
  }
}

async function recoverEvidence(
  input: FailedExecutionRecoveryInput,
  errors: unknown[],
): Promise<boolean> {
  if (!input.evidenceSession || input.evidenceSealed) return true;
  try {
    await abortEvidenceSession(input.evidenceSession, "native-execution-failed");
    return true;
  } catch (error) {
    errors.push(error);
    return false;
  }
}

async function recoverProcessDisposal(
  input: FailedExecutionRecoveryInput,
  processTerminal: boolean,
  errors: unknown[],
): Promise<boolean> {
  if (!input.process || input.processDisposed) return true;
  if (!processTerminal) return false;
  try {
    await input.process.dispose();
    return true;
  } catch (error) {
    errors.push(error);
    return false;
  }
}

async function recoverResources(
  input: FailedExecutionRecoveryInput,
  prerequisitesMet: boolean,
  errors: unknown[],
): Promise<boolean> {
  if (!prerequisitesMet) return false;
  try {
    await input.resourcePort.cleanup(input.resources);
    return true;
  } catch (error) {
    errors.push(error);
    return false;
  }
}

async function recoverFailedExecution(input: FailedExecutionRecoveryInput): Promise<never> {
  const recoveryErrors: unknown[] = [];
  const terminal = await recoverProcessTerminal(input, recoveryErrors);
  const processTerminal = input.process === undefined || terminal !== undefined;
  const captureJoined = await recoverCapture(input, terminal, recoveryErrors);
  const evidenceClosed = await recoverEvidence(input, recoveryErrors);
  const resourcesCleaned = await recoverResources(
    input,
    processTerminal && captureJoined && evidenceClosed,
    recoveryErrors,
  );
  await recoverProcessDisposal(
    input,
    processTerminal && captureJoined && evidenceClosed && resourcesCleaned,
    recoveryErrors,
  );
  if (recoveryErrors.length > 0) {
    throw new AggregateError([input.error, ...recoveryErrors], "NATIVE_EXECUTION_RECOVERY_FAILED");
  }
  throw input.error;
}

type NativeExecutionPorts = Readonly<{
  resources: ResourceSupervisorPort;
  capture: EvidenceCapturePort;
  process: NativeProcessPort;
}>;

type NativeExecutionProgress = {
  capture?: EvidenceCaptureSession;
  evidenceSession?: AttemptEvidenceSession;
  process?: NativeProcessSession;
  terminal?: ProcessTerminal;
  captureJoined: boolean;
  evidenceSealed: boolean;
  processDisposed: boolean;
  execution?: AdapterExecutionPlan;
  processIdentityDigest?: string;
};

type ActiveNativeRun = Readonly<{
  execution: AdapterExecutionPlan;
  evidenceSession: AttemptEvidenceSession;
  evidence: EvidenceBridge;
  capture: EvidenceCaptureSession;
  process: NativeProcessSession;
  identity: NativeProcessIdentity;
}>;

function nativeDispatchCheckpoint(input: Readonly<{
  lifecycle: NativeLifecycleExecutionInput;
  preparation: AdapterResourcePreparation;
  resources: MaterializedAuxiliaryResourceSet;
  preparedNativeRun: PreparedNativeRun;
  execution: AdapterExecutionPlan;
  identity: NativeProcessIdentity;
}>): NativeDispatchCheckpoint {
  return Object.freeze({
    kind: "native",
    nativeRunId: input.lifecycle.launchInput.nativeRunId,
    preparedNativeRunDigest: digestValue(input.preparedNativeRun),
    resourceReceiptDigest: input.resources.receiptDigest,
    processIdentityDigest: input.identity.processIdentityDigest,
    armDigest: input.identity.armDigest,
    armDeadline: input.identity.armDeadline,
    capture: captureCheckpoint(input.execution, input.preparation, input.resources),
  });
}

async function startNativeRun(input: Readonly<{
  ports: NativeExecutionPorts;
  lifecycle: NativeLifecycleExecutionInput;
  preparation: AdapterResourcePreparation;
  resources: MaterializedAuxiliaryResourceSet;
  dispatchPreparation: NativeDispatchPreparation;
  processPlan: PlannedProcessRun;
  progress: NativeExecutionProgress;
}>): Promise<ActiveNativeRun> {
  const { lifecycle, preparation, resources, dispatchPreparation, processPlan, progress } = input;
  validateMaterializedResources(preparation, resources);
  const execution = lifecycle.adapter.buildExecution(lifecycle.launchInput, resources);
  progress.execution = execution;
  validateExecutionPlan(execution, preparation, resources, lifecycle);
  const evidenceSession = openEvidenceSession(lifecycle.adapter, lifecycle.context);
  progress.evidenceSession = evidenceSession;
  const evidence = evidenceBridge(lifecycle, execution, evidenceSession);
  const preparedNativeRun: PreparedNativeRun = Object.freeze({
    kind: "native",
    dispatchPreparationDigest: digestValue(dispatchPreparation),
    resourceReceiptDigest: resources.receiptDigest,
    executionPlanDigest: digestValue(execution),
    capturePlanDigest: digestValue(execution.capture),
    transportKind: execution.launch.transport.kind,
    captureKind: execution.capture.kind,
  });
  await lifecycle.onResourcesPrepared(preparedNativeRun);
  const capture = await input.ports.capture.start({
    nativeRunId: lifecycle.launchInput.nativeRunId,
    plan: execution.capture,
    identity: execution.captureIdentity,
    resources,
    evidence: evidence.sink,
  });
  progress.capture = capture;
  const process = await input.ports.process.spawn({
    plan: processPlan,
    launch: execution.launch,
  });
  progress.process = process;
  const identity = await process.observeIdentity();
  requireCondition(
    nonEmpty(identity.processIdentityDigest) &&
      identity.armDigest === processPlan.armDigest &&
      !Number.isNaN(Date.parse(identity.armDeadline)),
    "PROCESS_IDENTITY_INVALID",
  );
  progress.processIdentityDigest = identity.processIdentityDigest;
  await input.ports.resources.bindRecoveryOwner(
    resources,
    Object.freeze({
      executionId: lifecycle.context.executionId,
      attemptId: lifecycle.context.attemptId,
      attemptNonceHash: lifecycle.context.attemptNonceHash,
      planDigest: lifecycle.context.planDigest,
      waveIndex: lifecycle.context.waveIndex,
      waveDigest: lifecycle.context.waveDigest,
      nativeRunId: lifecycle.launchInput.nativeRunId,
      fencingToken: lifecycle.fencingToken,
      processIdentityDigest: identity.processIdentityDigest,
    }),
  );
  const dispatch = nativeDispatchCheckpoint({
    lifecycle,
    preparation,
    resources,
    preparedNativeRun,
    execution,
    identity,
  });
  lifecycle.onProcessObserved?.(dispatch);
  await input.ports.resources.verifyForArm(preparation, resources);
  await lifecycle.onReadyToArm(dispatch);
  return Object.freeze({ execution, evidenceSession, evidence, capture, process, identity });
}

async function controlSignalFor(
  lifecycle: NativeLifecycleExecutionInput,
  active: ActiveNativeRun,
): Promise<DriverControlSignal | undefined> {
  if (active.execution.launch.transport.kind !== "pty-interactive") return undefined;
  return await exactlyOneControlSignal(
    lifecycle.adapter.observeControl(active.evidenceSession.liveInputs, lifecycle.context),
    lifecycle.context,
    active.execution.launch.transport.controlTimeoutMs,
  );
}

function oneControlSignal(signal: DriverControlSignal): AsyncIterable<DriverControlSignal> {
  return (async function* () {
    yield signal;
  })();
}

function terminalWaitInput(
  transport: CoordinatorTransport,
  controlSignal: DriverControlSignal | undefined,
): Readonly<{
  transport: CoordinatorTransport;
  controlSignals?: AsyncIterable<DriverControlSignal>;
}> {
  return controlSignal
    ? Object.freeze({ transport, controlSignals: oneControlSignal(controlSignal) })
    : Object.freeze({ transport });
}

async function waitForNativeTerminal(
  lifecycle: NativeLifecycleExecutionInput,
  active: ActiveNativeRun,
): Promise<ProcessTerminal> {
  const controlSignal = await controlSignalFor(lifecycle, active);
  const terminal = await active.process.waitForTerminal(
    terminalWaitInput(active.execution.launch.transport, controlSignal),
  );
  requireCondition(
    terminalMatches(terminal, {
      transport: active.execution.launch.transport.kind,
      nativeRunId: lifecycle.launchInput.nativeRunId,
      processIdentityDigest: active.identity.processIdentityDigest,
      ...(controlSignal ? { controlSignalDigest: digestValue(controlSignal) } : {}),
    }),
    "PROCESS_TERMINAL_INVALID",
  );
  return terminal;
}

async function completeNativeRun(input: Readonly<{
  ports: NativeExecutionPorts;
  lifecycle: NativeLifecycleExecutionInput;
  resources: MaterializedAuxiliaryResourceSet;
  active: ActiveNativeRun;
  progress: NativeExecutionProgress;
}>): Promise<readonly NormalizedDriverEvent[]> {
  const { active, progress } = input;
  await active.process.arm();
  await active.evidence.bind(active.capture);
  const terminal = await waitForNativeTerminal(input.lifecycle, active);
  progress.terminal = terminal;
  await active.capture.stopAndWait(terminal);
  progress.captureJoined = true;
  const events = await collectEvents(active.evidenceSession.seal(terminal));
  progress.evidenceSealed = true;
  await input.ports.resources.cleanup(input.resources);
  await active.process.dispose();
  progress.processDisposed = true;
  return events;
}

function failedExecutionRecovery(input: Readonly<{
  error: unknown;
  resourcePort: ResourceSupervisorPort;
  resources: MaterializedAuxiliaryResourceSet;
  lifecycle: NativeLifecycleExecutionInput;
  progress: NativeExecutionProgress;
}>): FailedExecutionRecoveryInput {
  const { progress } = input;
  return Object.freeze({
    error: input.error,
    resources: input.resources,
    resourcePort: input.resourcePort,
    ...(progress.capture ? { capture: progress.capture } : {}),
    ...(progress.evidenceSession ? { evidenceSession: progress.evidenceSession } : {}),
    ...(progress.process ? { process: progress.process } : {}),
    ...(progress.terminal ? { terminal: progress.terminal } : {}),
    captureJoined: progress.captureJoined,
    evidenceSealed: progress.evidenceSealed,
    processDisposed: progress.processDisposed,
    transport: progress.execution?.launch.transport.kind ?? "stdio-json",
    nativeRunId: input.lifecycle.launchInput.nativeRunId,
    ...(progress.processIdentityDigest
      ? { processIdentityDigest: progress.processIdentityDigest }
      : {}),
  });
}

async function releaseUnspawnedProcessPlan(
  processPort: NativeProcessPort,
  processPlan: PlannedProcessRun,
  failure: unknown,
): Promise<never> {
  if (!processPort.releasePlan) throw failure;
  try {
    await processPort.releasePlan(processPlan);
  } catch (releaseError) {
    throw new AggregateError([failure, releaseError], "NATIVE_EXECUTION_RECOVERY_FAILED");
  }
  throw failure;
}

export function createLifecycleNativeExecution(ports: NativeExecutionPorts): LifecycleNativeExecution {
  return Object.freeze({
    async execute(input): Promise<readonly NormalizedDriverEvent[]> {
      const preparation = input.adapter.prepareResources(input.launchInput);
      validatePreparation(preparation);
      const processPlan = ports.process.plan({
        nativeRunId: input.launchInput.nativeRunId,
        evidenceDir: input.launchInput.evidenceDir,
        context: input.context,
        fencingToken: input.fencingToken,
      });
      const progress: NativeExecutionProgress = {
        captureJoined: false,
        evidenceSealed: false,
        processDisposed: false,
      };
      let resources: MaterializedAuxiliaryResourceSet | undefined;
      let publicationMayHaveStarted = false;
      try {
        validateProcessPlan(processPlan, input.launchInput.nativeRunId);
        const dispatchPreparation: NativeDispatchPreparation = Object.freeze({
          kind: "native",
          nativeRunId: input.launchInput.nativeRunId,
          planDigest: input.context.planDigest,
          fencingToken: input.fencingToken,
          waveIndex: input.context.waveIndex,
          waveDigest: input.context.waveDigest,
          resourcePreparationDigest: preparation.preparationDigest,
          captureIdentityDigest: digestValue(captureIdentityFromContext(input.context)),
          identityRelativePath: processPlan.identityRelativePath,
          armRelativePath: processPlan.armRelativePath,
          armDigest: processPlan.armDigest,
          runEpochDigest: processPlan.runEpochDigest,
          recoveryJournalRelativePath: processPlan.recoveryJournalRelativePath,
        });
        publicationMayHaveStarted = true;
        await input.onDispatchPrepared(dispatchPreparation);
        resources = await ports.resources.materialize(preparation, input.launchInput);
        const active = await startNativeRun({
          ports,
          lifecycle: input,
          preparation,
          resources,
          dispatchPreparation,
          processPlan,
          progress,
        });
        return await completeNativeRun({
          ports,
          lifecycle: input,
          resources,
          active,
          progress,
        });
      } catch (error) {
        if (!publicationMayHaveStarted) {
          return await releaseUnspawnedProcessPlan(ports.process, processPlan, error);
        }
        if (!resources) throw error;
        return await recoverFailedExecution(failedExecutionRecovery({
          error,
          resourcePort: ports.resources,
          resources,
          lifecycle: input,
          progress,
        }));
      }
    },
  });
}
