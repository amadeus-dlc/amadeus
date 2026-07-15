// No-side-effect foundation for the swarm-driver policy contracts.
// Keep closed vocabulary and provider ownership in this leaf so contract
// modules cannot drift or form runtime import cycles.

export const HARNESS_VALUES = ["claude", "codex", "kiro", "kiro-ide"] as const;
export type Harness = (typeof HARNESS_VALUES)[number];

export const REQUESTED_DRIVER_VALUES = [
  "auto",
  "claude-agent-teams",
  "claude-ultracode",
  "codex-ultra",
  "kiro-subagent",
] as const;
export type RequestedDriver = (typeof REQUESTED_DRIVER_VALUES)[number];

export const NATIVE_DRIVER_VALUES = [
  "claude-agent-teams",
  "claude-ultracode",
  "codex-ultra",
  "kiro-subagent",
] as const;
export type NativeDriver = (typeof NATIVE_DRIVER_VALUES)[number];

export const FLOOR_DRIVER_VALUES = [
  "claude-task-floor",
  "codex-exec-floor",
  "kiro-subagent-floor",
] as const;
export type FloorDriver = (typeof FLOOR_DRIVER_VALUES)[number];
export type SelectedDriver = NativeDriver | FloorDriver;

export const DRIVER_PROVIDER_VALUES = ["claude", "codex", "kiro"] as const;
export type DriverProvider = (typeof DRIVER_PROVIDER_VALUES)[number];
export type ExecutionMode = "native" | "floor" | "legacy";
export type LegacyExecution =
  | "claude-dynamic-workflow"
  | "claude-task-floor"
  | "codex-exec-floor"
  | "kiro-subagent-floor";

export const TOPOLOGY_VALUES = ["coordinated", "independent", "unknown"] as const;
export type Topology = (typeof TOPOLOGY_VALUES)[number];
export type TopologyReason =
  | "coordination-signal"
  | "independent-signal"
  | "coordination-precedence"
  | "no-signal";

export const TOPOLOGY_SIGNAL_KIND_VALUES = [
  "shared-task",
  "direct-message",
  "mutual-coordination",
  "independent-fanout",
  "iterative-convergence",
] as const;
export type TopologySignalKind = (typeof TOPOLOGY_SIGNAL_KIND_VALUES)[number];

export const FALLBACK_REASON_VALUES = [
  "none",
  "cli-unavailable",
  "authentication-unavailable",
  "native-surface-unavailable",
  "native-evidence-unavailable",
  "trust-unavailable",
  "capability-probe-failed",
] as const;
export type FallbackReason = (typeof FALLBACK_REASON_VALUES)[number];
export type UnavailableReason = Exclude<FallbackReason, "none">;
export type ProbeStatus = "available" | "unavailable" | "error";
export type ProbeCheckName = "cli" | "auth" | "mode" | "trust" | "handshake";

export const CAPABILITY_DIAGNOSTIC_CODE_VALUES = [
  "CLI_AVAILABLE",
  "CLI_UNAVAILABLE",
  "AUTHENTICATION_AVAILABLE",
  "AUTHENTICATION_UNAVAILABLE",
  "NATIVE_SURFACE_AVAILABLE",
  "NATIVE_SURFACE_UNAVAILABLE",
  "NATIVE_EVIDENCE_AVAILABLE",
  "NATIVE_EVIDENCE_UNAVAILABLE",
  "TRUST_AVAILABLE",
  "TRUST_UNAVAILABLE",
  "CAPABILITY_PROBE_SUCCEEDED",
  "CAPABILITY_PROBE_FAILED",
] as const;
export type CapabilityDiagnosticCode = (typeof CAPABILITY_DIAGNOSTIC_CODE_VALUES)[number];

export type ProbeCheck = Readonly<{
  name: ProbeCheckName;
  ok: boolean;
  diagnosticCode: CapabilityDiagnosticCode;
}>;

export type ProbeBindingReferenceV1 = Readonly<{
  schemaVersion: 1;
  driver: NativeDriver;
  modeIdentifier: string;
  resolvedModelId?: string;
  seedDigest: string;
  finalDigest: string;
}>;

export type ProbeResult = Readonly<{
  status: ProbeStatus;
  reason: FallbackReason;
  cliVersion?: string;
  modeIdentifier?: string;
  binding?: ProbeBindingReferenceV1;
  checks: readonly ProbeCheck[];
  isAvailable(): this is AvailableProbeResult;
  diagnosticCodes(): readonly CapabilityDiagnosticCode[];
}>;

export type AvailableProbeResult = ProbeResult &
  Readonly<{
    status: "available";
    reason: "none";
  }>;

export type ContractDiagnosticCode =
  | "EMPTY_UNIT_SLUG"
  | "MULTI_UNIT_REQUIRED"
  | "DUPLICATE_MANIFEST_UNIT"
  | "UNIT_NOT_IN_MANIFEST"
  | "UNKNOWN_TOPOLOGY_SIGNAL"
  | "CAPABILITY_DRIVER_MISSING"
  | "CAPABILITY_DRIVER_DUPLICATE"
  | "CAPABILITY_DRIVER_EXTRA"
  | "CAPABILITY_STATUS_REASON_MISMATCH"
  | "CAPABILITY_CHECK_INVALID"
  | "REGISTRATION_PROVIDER_DUPLICATE"
  | "REGISTRATION_PROVIDER_MISSING"
  | "REGISTRATION_PROVIDER_EXTRA"
  | "REGISTRATION_DRIVER_DUPLICATE"
  | "REGISTRATION_DRIVER_MISSING"
  | "REGISTRATION_DRIVER_OWNERSHIP_INVALID"
  | "REGISTRATION_HARNESS_MAPPING_INVALID"
  | "REGISTRATION_SLOT_INVALID"
  | "SCHEMA_INVALID"
  | "SCHEMA_UNKNOWN_FIELD"
  | "SCHEMA_SECRET_FIELD";

export type Result<T, E> =
  | Readonly<{ type: "ok"; value: T }>
  | Readonly<{ type: "err"; error: E }>;

export const Result = Object.freeze({
  ok<T>(value: T): Result<T, never> {
    return Object.freeze({ type: "ok", value });
  },
  err<E>(error: E): Result<never, E> {
    return Object.freeze({ type: "err", error });
  },
});

export type SelectorError =
  | Readonly<{ code: "INVALID_DRIVER"; accepted: typeof REQUESTED_DRIVER_VALUES }>
  | Readonly<{
      code: "CONFLICTING_ENV";
      variables: readonly ["AMADEUS_SWARM_DRIVER", "AMADEUS_USE_SWARM"];
    }>
  | Readonly<{ code: "HARNESS_DRIVER_MISMATCH"; harness: Harness; requested: NativeDriver }>
  | Readonly<{
      code: "EXPLICIT_DRIVER_UNAVAILABLE";
      requested: NativeDriver;
      reason: UnavailableReason;
    }>
  | Readonly<{ code: "INVALID_TOPOLOGY_INPUT"; diagnosticCode: ContractDiagnosticCode }>
  | Readonly<{
      code: "INVALID_CAPABILITY_INPUT";
      driver?: NativeDriver;
      diagnosticCode: ContractDiagnosticCode;
    }>
  | Readonly<{
      code: "INVALID_REGISTRATION";
      provider?: DriverProvider;
      driver?: NativeDriver;
      diagnosticCode: ContractDiagnosticCode;
    }>
  | Readonly<{ code: "INVALID_SELECTION_INPUT"; fieldPath: string }>
  | Readonly<{ code: "REDACTION_SCHEMA_REJECTED"; fieldPath: string }>;

export const SelectorError = Object.freeze({
  invalidDriver(): SelectorError {
    return Object.freeze({ code: "INVALID_DRIVER", accepted: REQUESTED_DRIVER_VALUES });
  },
  conflictingEnvironment(): SelectorError {
    return Object.freeze({
      code: "CONFLICTING_ENV",
      variables: ["AMADEUS_SWARM_DRIVER", "AMADEUS_USE_SWARM"] as const,
    });
  },
  harnessMismatch(harness: Harness, requested: NativeDriver): SelectorError {
    return Object.freeze({ code: "HARNESS_DRIVER_MISMATCH", harness, requested });
  },
  explicitUnavailable(requested: NativeDriver, reason: UnavailableReason): SelectorError {
    return Object.freeze({ code: "EXPLICIT_DRIVER_UNAVAILABLE", requested, reason });
  },
  invalidTopology(diagnosticCode: ContractDiagnosticCode): SelectorError {
    return Object.freeze({ code: "INVALID_TOPOLOGY_INPUT", diagnosticCode });
  },
  invalidCapability(driver: NativeDriver | undefined, diagnosticCode: ContractDiagnosticCode): SelectorError {
    return Object.freeze({ code: "INVALID_CAPABILITY_INPUT", driver, diagnosticCode });
  },
  invalidRegistration(
    diagnosticCode: ContractDiagnosticCode,
    provider?: DriverProvider,
    driver?: NativeDriver,
  ): SelectorError {
    return Object.freeze({ code: "INVALID_REGISTRATION", diagnosticCode, provider, driver });
  },
  invalidSelection(fieldPath: string): SelectorError {
    return Object.freeze({ code: "INVALID_SELECTION_INPUT", fieldPath });
  },
  schemaRejected(fieldPath: string): SelectorError {
    return Object.freeze({ code: "REDACTION_SCHEMA_REJECTED", fieldPath });
  },
});

export const NATIVE_DRIVER_REGISTRATION_CONTRACT: Readonly<
  Record<DriverProvider, Readonly<{ drivers: readonly NativeDriver[]; harnesses: readonly Harness[] }>>
> = Object.freeze({
  claude: Object.freeze({
    drivers: Object.freeze(["claude-agent-teams", "claude-ultracode"] as const),
    harnesses: Object.freeze(["claude"] as const),
  }),
  codex: Object.freeze({
    drivers: Object.freeze(["codex-ultra"] as const),
    harnesses: Object.freeze(["codex"] as const),
  }),
  kiro: Object.freeze({
    drivers: Object.freeze(["kiro-subagent"] as const),
    harnesses: Object.freeze(["kiro", "kiro-ide"] as const),
  }),
});

const NATIVE_DRIVER_PROVIDER: Readonly<Record<NativeDriver, DriverProvider>> = Object.freeze({
  "claude-agent-teams": "claude",
  "claude-ultracode": "claude",
  "codex-ultra": "codex",
  "kiro-subagent": "kiro",
});

export function nativeDriverProvider(driver: NativeDriver): DriverProvider {
  return NATIVE_DRIVER_PROVIDER[driver];
}

export function nativeDriverSupportsHarness(driver: NativeDriver, harness: Harness): boolean {
  return NATIVE_DRIVER_REGISTRATION_CONTRACT[nativeDriverProvider(driver)].harnesses.includes(harness);
}
