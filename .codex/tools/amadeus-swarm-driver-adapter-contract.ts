// Pure adapter-port and static registration contracts for native swarm drivers.
// Provider implementations and all process or I/O behavior belong to later Units.

import {
  DRIVER_PROVIDER_VALUES,
  HARNESS_VALUES,
  NATIVE_DRIVER_REGISTRATION_CONTRACT,
  NATIVE_DRIVER_VALUES,
  Result,
  SelectorError,
  nativeDriverSupportsHarness,
  type ContractDiagnosticCode,
  type DriverProvider,
  type FallbackReason,
  type Harness,
  type NativeDriver,
  type ProbeResult,
  type RequestedDriver,
  type SelectedDriver,
  type Topology,
  type TopologyReason,
} from "./amadeus-swarm-driver-foundation.ts";

export type ProbeInput = Readonly<{
  projectDir: string;
  batch: number;
  timeoutMs: number;
  environment: Readonly<Record<string, string>>;
}>;

export type UnitWave = Readonly<{
  index: number;
  units: readonly string[];
}>;

export type PreparedUnit = Readonly<{
  unit: string;
  worktreePath: string;
  branchName: string;
}>;

export type DriverPlan = Readonly<{
  kind: "driver-plan";
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  requested: RequestedDriver;
  selected: SelectedDriver;
  executionMode: "native" | "floor";
  harness: Harness;
  batch: number;
  topology: Topology;
  topologyReason: TopologyReason;
  fallbackReason: FallbackReason;
  probe: ProbeResult;
  waves: readonly UnitWave[];
  planDigest: string;
  attemptNonceHash: string;
}>;

export type LaunchInput = Readonly<{
  plan: DriverPlan;
  wave: UnitWave;
  preparedUnits: readonly PreparedUnit[];
  convergenceCommand: string;
  protectedSpec?: string;
  evidenceDir: string;
  nativeRunId: string;
}>;

export type AuxiliaryResourcePlan =
  | Readonly<{
      kind: "exclusive-reservation";
      resourceId: string;
      candidates: readonly Readonly<{
        reservationPath: string;
        guardedPaths: readonly string[];
      }>[];
    }>
  | Readonly<{
      kind: "attempt-owned-file";
      resourceId: string;
      path: string;
      bytes: Uint8Array;
      mode: "0600";
    }>
  | Readonly<{
      kind: "attempt-owned-directory";
      resourceId: string;
      path: string;
      mode: "0700";
    }>
  | Readonly<{
      kind: "pre-arm-baseline";
      resourceId: string;
      exactPaths: readonly string[];
      allowAbsent: boolean;
    }>;

export type AdapterResourcePreparation = Readonly<{
  resources: readonly AuxiliaryResourcePlan[];
  preparationDigest: string;
}>;

export type MaterializedAuxiliaryResource = Readonly<{
  resourceId: string;
  kind: AuxiliaryResourcePlan["kind"];
  selectedCandidateIndex?: number;
  resolvedPaths: readonly string[];
  ownerDigest: string;
  contentOrBaselineDigest: string;
}>;

export type MaterializedAuxiliaryResourceSet = Readonly<{
  preparationDigest: string;
  receiptDigest: string;
  resources: readonly MaterializedAuxiliaryResource[];
}>;

export type CoordinatorTransport =
  | Readonly<{
      kind: "stdio-json";
      stdin: "closed" | Uint8Array;
      output: "stream-json" | "jsonl";
    }>
  | Readonly<{
      kind: "pty-interactive";
      initialInput: Uint8Array;
      columns: 120;
      rows: 40;
      exitOnSignal: "ready-for-graceful-exit";
      gracefulExitInput: Uint8Array;
      controlTimeoutMs: number;
      gracefulExitTimeoutMs: number;
    }>;

export type FixedCaptureBinding = Readonly<{
  kind: "fixed-provider-path";
  nativeRunId: string;
  exactPaths: readonly string[];
  exactPathDigest: string;
  sourcePlanDigest: string;
}>;

export type EventBoundCaptureBinding = Readonly<{
  kind: "event-bound-provider-path";
  nativeRunId: string;
  exactPaths: readonly string[];
  exactPathDigest: string;
  sourceEventDigest: string;
}>;

export type CaptureBinding = FixedCaptureBinding | EventBoundCaptureBinding;

export type EvidenceCapturePlan =
  | Readonly<{
      kind: "fixed-provider-path";
      initialBinding: FixedCaptureBinding;
      hookDir: string;
    }>
  | Readonly<{
      kind: "event-bound-provider-path";
      hookDir: string;
    }>
  | Readonly<{
      kind: "hook-only";
      hookDir: string;
    }>;

export type CaptureIdentity = Readonly<{
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
}>;

export type LaunchSpec = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  transport: CoordinatorTransport;
  timeoutMs: number;
}>;

export type AdapterExecutionPlan = Readonly<{
  launch: LaunchSpec;
  capture: EvidenceCapturePlan;
  captureIdentity: CaptureIdentity;
  resources: readonly AuxiliaryResourcePlan[];
}>;

export type RawNativeEvent = Readonly<{
  source: "stream" | "hook";
  bytes: Uint8Array;
}>;

export type CaptureBindingInput = Readonly<{
  plan: Extract<EvidenceCapturePlan, Readonly<{ kind: "event-bound-provider-path" }>>;
  identity: CaptureIdentity;
  event: RawNativeEvent;
}>;

export type CaptureBindingResolution =
  | Readonly<{ kind: "not-binding" }>
  | Readonly<{ kind: "bound"; binding: EventBoundCaptureBinding }>
  | Readonly<{ kind: "invalid"; diagnosticCode: string }>;

export type LiveEvidenceInputs = Readonly<{
  providerState: AsyncIterable<Uint8Array>;
  nativeEvents: AsyncIterable<RawNativeEvent>;
}>;

export type ProcessTerminal = Readonly<{
  transport: CoordinatorTransport["kind"];
  exitCode: number;
  processGroupId: number;
  nativeRunId: string;
  processIdentityDigest: string;
  controlSignalDigest?: string;
}>;

export type EvidenceInputs = LiveEvidenceInputs & Readonly<{
  processTerminal: ProcessTerminal;
}>;

export type NormalizeContext = Readonly<{
  driver: NativeDriver;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  expectedUnits: readonly string[];
}>;

export type DriverControlSignal = Readonly<{
  kind: "ready-for-graceful-exit";
  driver: NativeDriver;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  coveredUnits: readonly string[];
  liveEvidenceDigest: string;
}>;

export type EvidenceSource =
  | "model-handshake"
  | "provider-state"
  | "session-metadata"
  | "process-lifecycle"
  | "stream"
  | "hook";

type EvidenceEventBase = Readonly<{
  v: 1;
  driver: NativeDriver;
  source: EvidenceSource;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  nativeRunId: string;
}>;

export type UnitChildBinding = Readonly<{ unit: string; childId: string }>;

export type NativeMarker =
  | "claude-team-membership"
  | "claude-shared-task"
  | "claude-workflow"
  | "codex-subagent-hook"
  | "kiro-parent-child-session";

export type NormalizedDriverEvent =
  | (EvidenceEventBase &
      Readonly<{
        kind: "mode-confirmed";
        source: "model-handshake" | "provider-state" | "session-metadata" | "stream";
        modeIdentifier: string;
        resolvedModelId?: string;
      }>)
  | (EvidenceEventBase &
      Readonly<{ kind: "coordinator-started"; source: "stream"; coordinatorId: string }>)
  | (EvidenceEventBase &
      Readonly<{
        kind: "native-state-observed";
        source: "provider-state" | "session-metadata" | "hook";
        snapshotDigest: string;
        bindings: readonly UnitChildBinding[];
      }>)
  | (EvidenceEventBase &
      Readonly<{
        kind: "native-child-started";
        source: "stream" | "hook" | "provider-state" | "session-metadata";
        childId: string;
        unit: string;
      }>)
  | (EvidenceEventBase &
      Readonly<{
        kind: "native-child-stopped";
        source: "stream" | "hook" | "provider-state" | "session-metadata";
        childId: string;
        unit: string;
        outcome: "completed" | "failed";
      }>)
  | (EvidenceEventBase &
      Readonly<{
        kind: "native-coordination";
        source: "stream" | "hook";
        marker: NativeMarker;
      }>)
  | (EvidenceEventBase &
      Readonly<{
        kind: "coordinator-stopped";
        source: "stream";
        coordinatorId: string;
        exitCode: number;
      }>);

export type DriverAdapter = Readonly<{
  driver: NativeDriver;
  provider: DriverProvider;
  supports(harness: Harness): boolean;
  probe(input: ProbeInput): Promise<ProbeResult>;
  prepareResources(input: LaunchInput): AdapterResourcePreparation;
  buildExecution(
    input: LaunchInput,
    resources: MaterializedAuxiliaryResourceSet,
  ): AdapterExecutionPlan;
  resolveCaptureBinding(input: CaptureBindingInput): CaptureBindingResolution;
  observeControl(
    inputs: LiveEvidenceInputs,
    context: NormalizeContext,
  ): AsyncIterable<DriverControlSignal>;
  normalize(
    inputs: EvidenceInputs,
    context: NormalizeContext,
  ): AsyncIterable<NormalizedDriverEvent>;
}>;

export type DriverAdapterSet = Readonly<{
  adapters(): readonly DriverAdapter[];
  drivers(): readonly NativeDriver[];
  forDriver(driver: NativeDriver): DriverAdapter | undefined;
}>;

function registrationFailure(
  diagnosticCode: ContractDiagnosticCode,
  provider?: DriverProvider,
  driver?: NativeDriver,
): Result<never, SelectorError> {
  return Result.err(SelectorError.invalidRegistration(diagnosticCode, provider, driver));
}

function hasAdapterPort(adapter: unknown): adapter is DriverAdapter {
  return (
    isRecord(adapter) &&
    typeof adapter.supports === "function" &&
    typeof adapter.probe === "function" &&
    typeof adapter.prepareResources === "function" &&
    typeof adapter.buildExecution === "function" &&
    typeof adapter.resolveCaptureBinding === "function" &&
    typeof adapter.observeControl === "function" &&
    typeof adapter.normalize === "function"
  );
}

function supportsExpectedHarnesses(adapter: DriverAdapter): boolean {
  return HARNESS_VALUES.every(
    (harness) => adapter.supports(harness) === nativeDriverSupportsHarness(adapter.driver, harness),
  );
}

function indexAdapter(
  provider: DriverProvider,
  expected: ReadonlySet<NativeDriver>,
  byDriver: Map<NativeDriver, DriverAdapter>,
  adapter: unknown,
): Result<undefined, SelectorError> {
  if (!hasAdapterPort(adapter)) {
    return registrationFailure("REGISTRATION_SLOT_INVALID", provider);
  }
  if (!NATIVE_DRIVER_VALUES.includes(adapter.driver) || !expected.has(adapter.driver)) {
    return registrationFailure("REGISTRATION_DRIVER_OWNERSHIP_INVALID", provider, adapter.driver);
  }
  if (adapter.provider !== provider) {
    return registrationFailure("REGISTRATION_DRIVER_OWNERSHIP_INVALID", provider, adapter.driver);
  }
  if (byDriver.has(adapter.driver)) {
    return registrationFailure("REGISTRATION_DRIVER_DUPLICATE", provider, adapter.driver);
  }
  if (!supportsExpectedHarnesses(adapter)) {
    return registrationFailure("REGISTRATION_HARNESS_MAPPING_INVALID", provider, adapter.driver);
  }
  byDriver.set(adapter.driver, Object.freeze({ ...adapter }));
  return Result.ok(undefined);
}

export const DriverAdapterSet = Object.freeze({
  build(
    provider: DriverProvider,
    adapters: readonly DriverAdapter[],
  ): Result<DriverAdapterSet, SelectorError> {
    const expectedDrivers = NATIVE_DRIVER_REGISTRATION_CONTRACT[provider]?.drivers;
    if (expectedDrivers === undefined || !Array.isArray(adapters)) {
      return registrationFailure("REGISTRATION_SLOT_INVALID", provider);
    }
    const expected = new Set(expectedDrivers);
    const byDriver = new Map<NativeDriver, DriverAdapter>();
    for (const adapter of adapters) {
      const indexed = indexAdapter(provider, expected, byDriver, adapter);
      if (indexed.type === "err") return indexed;
    }
    for (const driver of expectedDrivers) {
      if (!byDriver.has(driver)) return registrationFailure("REGISTRATION_DRIVER_MISSING", provider, driver);
    }
    const canonicalAdapters = Object.freeze(expectedDrivers.map((driver) => byDriver.get(driver)!));
    const canonicalDrivers = Object.freeze([...expectedDrivers]);
    return Result.ok(
      Object.freeze({
        adapters(): readonly DriverAdapter[] {
          return canonicalAdapters;
        },
        drivers(): readonly NativeDriver[] {
          return canonicalDrivers;
        },
        forDriver(driver: NativeDriver): DriverAdapter | undefined {
          return byDriver.get(driver);
        },
      }),
    );
  },
});

export type RegistrationSlot =
  | Readonly<{ kind: "available"; adapterSet: DriverAdapterSet }>
  | Readonly<{ kind: "unavailable"; diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" }>;

export type RegistrationSlotInput =
  | Readonly<{ kind: "available"; adapters: readonly DriverAdapter[] }>
  | Readonly<{ kind: "unavailable"; diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" }>;

export type DriverRegistration = Readonly<{
  schemaVersion: 1;
  provider: DriverProvider;
  drivers: readonly NativeDriver[];
  harnesses: readonly Harness[];
  slot: RegistrationSlot;
  owns(driver: NativeDriver): boolean;
  supports(harness: Harness): boolean;
}>;

export type DriverRegistrationInput = Readonly<{
  provider: DriverProvider;
  drivers: readonly NativeDriver[];
  harnesses: readonly Harness[];
  slot: RegistrationSlotInput;
}>;

function sameOrderedValues<T extends string>(actual: readonly T[], expected: readonly T[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export const DriverRegistration = Object.freeze({
  build(input: DriverRegistrationInput): Result<DriverRegistration, SelectorError> {
    const expected = NATIVE_DRIVER_REGISTRATION_CONTRACT[input.provider];
    if (expected === undefined) return registrationFailure("REGISTRATION_PROVIDER_EXTRA");
    if (!Array.isArray(input.drivers)) {
      return registrationFailure("REGISTRATION_DRIVER_OWNERSHIP_INVALID", input.provider);
    }
    if (!sameOrderedValues(input.drivers, expected.drivers)) {
      const invalidDriver = input.drivers.find((driver) => !expected.drivers.includes(driver));
      return registrationFailure("REGISTRATION_DRIVER_OWNERSHIP_INVALID", input.provider, invalidDriver);
    }
    if (!Array.isArray(input.harnesses)) {
      return registrationFailure("REGISTRATION_HARNESS_MAPPING_INVALID", input.provider);
    }
    if (!sameOrderedValues(input.harnesses, expected.harnesses)) {
      return registrationFailure("REGISTRATION_HARNESS_MAPPING_INVALID", input.provider);
    }

    let slot: RegistrationSlot;
    if (typeof input.slot !== "object" || input.slot === null) {
      return registrationFailure("REGISTRATION_SLOT_INVALID", input.provider);
    }
    if (input.slot.kind === "available") {
      if (!Array.isArray(input.slot.adapters)) {
        return registrationFailure("REGISTRATION_SLOT_INVALID", input.provider);
      }
      const adapterSet = DriverAdapterSet.build(input.provider, input.slot.adapters);
      if (adapterSet.type === "err") return adapterSet;
      slot = Object.freeze({ kind: "available", adapterSet: adapterSet.value });
    } else if (
      input.slot.kind === "unavailable" &&
      input.slot.diagnosticCode === "REGISTRATION_SLOT_UNIMPLEMENTED"
    ) {
      slot = Object.freeze({ ...input.slot });
    } else {
      return registrationFailure("REGISTRATION_SLOT_INVALID", input.provider);
    }

    const drivers = Object.freeze([...input.drivers]);
    const harnesses = Object.freeze([...input.harnesses]);
    return Result.ok(
      Object.freeze({
        schemaVersion: 1 as const,
        provider: input.provider,
        drivers,
        harnesses,
        slot,
        owns(driver: NativeDriver): boolean {
          return drivers.includes(driver);
        },
        supports(harness: Harness): boolean {
          return harnesses.includes(harness);
        },
      }),
    );
  },
});

export type DriverRegistrationSet = Readonly<{
  registrations(): readonly DriverRegistration[];
  forDriver(driver: NativeDriver): DriverRegistration;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function availableRegistrationSlot(
  provider: DriverProvider,
  adapterSet: unknown,
): Result<RegistrationSlotInput, SelectorError> {
  if (!isRecord(adapterSet) || typeof adapterSet.adapters !== "function") {
    return registrationFailure("REGISTRATION_SLOT_INVALID", provider);
  }
  let adapters: unknown;
  try {
    adapters = adapterSet.adapters();
  } catch {
    return registrationFailure("REGISTRATION_SLOT_INVALID", provider);
  }
  if (!Array.isArray(adapters)) return registrationFailure("REGISTRATION_SLOT_INVALID", provider);
  return Result.ok({ kind: "available", adapters: adapters as readonly DriverAdapter[] });
}

function registrationSlotInput(
  provider: DriverProvider,
  value: unknown,
): Result<RegistrationSlotInput, SelectorError> {
  if (!isRecord(value)) return registrationFailure("REGISTRATION_SLOT_INVALID", provider);
  if (value.kind === "available") return availableRegistrationSlot(provider, value.adapterSet);
  if (value.kind !== "unavailable" || value.diagnosticCode !== "REGISTRATION_SLOT_UNIMPLEMENTED") {
    return registrationFailure("REGISTRATION_SLOT_INVALID", provider);
  }
  return Result.ok({ kind: "unavailable", diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" });
}

function rebuildRegistration(value: unknown): Result<DriverRegistration, SelectorError> {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return registrationFailure("SCHEMA_INVALID");
  }
  if (!DRIVER_PROVIDER_VALUES.includes(value.provider as DriverProvider)) {
    return registrationFailure("REGISTRATION_PROVIDER_EXTRA");
  }
  const provider = value.provider as DriverProvider;
  if (
    !Array.isArray(value.drivers) ||
    !value.drivers.every((driver) => NATIVE_DRIVER_VALUES.includes(driver as NativeDriver))
  ) {
    return registrationFailure("REGISTRATION_DRIVER_OWNERSHIP_INVALID", provider);
  }
  if (!Array.isArray(value.harnesses) || !value.harnesses.every((harness) => HARNESS_VALUES.includes(harness as Harness))) {
    return registrationFailure("REGISTRATION_HARNESS_MAPPING_INVALID", provider);
  }
  const slot = registrationSlotInput(provider, value.slot);
  if (slot.type === "err") return slot;

  return DriverRegistration.build({
    provider,
    drivers: value.drivers as readonly NativeDriver[],
    harnesses: value.harnesses as readonly Harness[],
    slot: slot.value,
  });
}

function indexRegistration(
  registration: DriverRegistration,
  byProvider: Map<DriverProvider, DriverRegistration>,
  byDriver: Map<NativeDriver, DriverRegistration>,
): Result<undefined, SelectorError> {
  if (byProvider.has(registration.provider)) {
    return registrationFailure("REGISTRATION_PROVIDER_DUPLICATE", registration.provider);
  }
  byProvider.set(registration.provider, registration);
  for (const driver of registration.drivers) {
    byDriver.set(driver, registration);
  }
  return Result.ok(undefined);
}

export const DriverRegistrationSet = Object.freeze({
  build(registrations: readonly DriverRegistration[]): Result<DriverRegistrationSet, SelectorError> {
    if (registrations.length !== 3) return registrationFailure("REGISTRATION_PROVIDER_EXTRA");
    const byProvider = new Map<DriverProvider, DriverRegistration>();
    const byDriver = new Map<NativeDriver, DriverRegistration>();
    for (const registration of registrations) {
      const rebuilt = rebuildRegistration(registration);
      if (rebuilt.type === "err") return rebuilt;
      const indexed = indexRegistration(rebuilt.value, byProvider, byDriver);
      if (indexed.type === "err") return indexed;
    }
    for (const provider of ["claude", "codex", "kiro"] as const) {
      if (!byProvider.has(provider)) return registrationFailure("REGISTRATION_PROVIDER_MISSING", provider);
    }
    for (const driver of NATIVE_DRIVER_VALUES) {
      if (!byDriver.has(driver)) return registrationFailure("REGISTRATION_DRIVER_MISSING", undefined, driver);
    }
    const canonical = Object.freeze(
      (["claude", "codex", "kiro"] as const).map((provider) => byProvider.get(provider)!),
    );
    return Result.ok(
      Object.freeze({
        registrations(): readonly DriverRegistration[] {
          return canonical;
        },
        forDriver(driver: NativeDriver): DriverRegistration {
          return byDriver.get(driver)!;
        },
      }),
    );
  },
});
