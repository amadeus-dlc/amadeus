// Pure, versioned domain contract for swarm driver selection.
//
// This module deliberately owns no process, filesystem, network, audit, clock,
// random, or provider-adapter behavior. Stateful lifecycle and production
// registry assembly belong to later Units.

import { createHash } from "node:crypto";
import {
  CAPABILITY_DIAGNOSTIC_CODE_VALUES,
  FALLBACK_REASON_VALUES,
  FLOOR_DRIVER_VALUES,
  HARNESS_VALUES,
  NATIVE_DRIVER_VALUES,
  REQUESTED_DRIVER_VALUES,
  Result,
  SelectorError,
  TOPOLOGY_SIGNAL_KIND_VALUES,
  TOPOLOGY_VALUES,
  nativeDriverProvider,
  nativeDriverSupportsHarness,
  type CapabilityDiagnosticCode,
  type DriverProvider,
  type FallbackReason,
  type FloorDriver,
  type Harness,
  type LegacyExecution,
  type NativeDriver,
  type AvailableProbeResult as AvailableProbeResultShape,
  type ProbeCheck as ProbeCheckShape,
  type ProbeResult as ProbeResultShape,
  type ProbeStatus,
  type RequestedDriver,
  type Topology,
  type TopologyReason,
  type TopologySignalKind,
  type UnavailableReason,
} from "./amadeus-swarm-driver-foundation.ts";

export * from "./amadeus-swarm-driver-foundation.ts";

export type NativeDriverValue = Readonly<{
  id: NativeDriver;
  provider: DriverProvider;
  supports(harness: Harness): boolean;
  toJSON(): NativeDriver;
}>;

function createNativeDriverValue(id: NativeDriver): NativeDriverValue {
  const provider = nativeDriverProvider(id);
  return Object.freeze({
    id,
    provider,
    supports(harness: Harness): boolean {
      return nativeDriverSupportsHarness(id, harness);
    },
    toJSON(): NativeDriver {
      return id;
    },
  });
}

const NATIVE_DRIVER_VALUE_BY_ID: Readonly<Record<NativeDriver, NativeDriverValue>> = Object.freeze({
  "claude-agent-teams": createNativeDriverValue("claude-agent-teams"),
  "claude-ultracode": createNativeDriverValue("claude-ultracode"),
  "codex-ultra": createNativeDriverValue("codex-ultra"),
  "kiro-subagent": createNativeDriverValue("kiro-subagent"),
});

export const NativeDriverValue = Object.freeze({
  parse(raw: unknown): Result<NativeDriverValue, SelectorError> {
    if (typeof raw !== "string" || !(NATIVE_DRIVER_VALUES as readonly string[]).includes(raw)) {
      return Result.err(SelectorError.invalidDriver());
    }
    return Result.ok(NATIVE_DRIVER_VALUE_BY_ID[raw as NativeDriver]);
  },
  from(id: NativeDriver): NativeDriverValue {
    return NATIVE_DRIVER_VALUE_BY_ID[id];
  },
  values(): readonly NativeDriverValue[] {
    return Object.freeze(NATIVE_DRIVER_VALUES.map((id) => NATIVE_DRIVER_VALUE_BY_ID[id]));
  },
});

export type SwarmEnvironment = Readonly<Record<string, string | undefined>>;
export type LegacyValueClass = "enabled" | "other";

export type RedactedDriverRequest =
  | Readonly<{ source: "default"; requested: "auto" }>
  | Readonly<{ source: "new-env"; requested: RequestedDriver }>
  | Readonly<{ source: "legacy-env"; rawValueClass: LegacyValueClass }>;

type DriverRequestBehavior = Readonly<{
  isLegacy(): boolean;
  toRedactedJSON(): RedactedDriverRequest;
}>;

export type DriverRequest =
  | (DriverRequestBehavior & Readonly<{ source: "default"; requested: "auto" }>)
  | (DriverRequestBehavior & Readonly<{ source: "new-env"; requested: RequestedDriver }>)
  | (DriverRequestBehavior & Readonly<{ source: "legacy-env"; rawValueClass: LegacyValueClass }>);

function createDriverRequest(value: RedactedDriverRequest): DriverRequest {
  const frozenValue = Object.freeze({ ...value }) as RedactedDriverRequest;
  return Object.freeze({
    ...frozenValue,
    isLegacy(): boolean {
      return frozenValue.source === "legacy-env";
    },
    toRedactedJSON(): RedactedDriverRequest {
      return frozenValue;
    },
  }) as DriverRequest;
}

export const DriverRequest = Object.freeze({
  default(): DriverRequest {
    return createDriverRequest({ source: "default", requested: "auto" });
  },
  fromNewEnvironment(requested: RequestedDriver): DriverRequest {
    return createDriverRequest({ source: "new-env", requested });
  },
  fromLegacyEnvironment(rawValueClass: LegacyValueClass): DriverRequest {
    return createDriverRequest({ source: "legacy-env", rawValueClass });
  },
});

export type TopologySignal = Readonly<{ unit: string; kind: TopologySignalKind }>;

export type TopologySignalCollection = Readonly<{
  values(): readonly TopologySignal[];
  units(): readonly string[];
}>;

const TOPOLOGY_KIND_RANK = new Map<TopologySignalKind, number>(
  TOPOLOGY_SIGNAL_KIND_VALUES.map((kind, index) => [kind, index]),
);

function compareTopologySignals(a: TopologySignal, b: TopologySignal): number {
  if (a.unit < b.unit) return -1;
  if (a.unit > b.unit) return 1;
  return (TOPOLOGY_KIND_RANK.get(a.kind) ?? 0) - (TOPOLOGY_KIND_RANK.get(b.kind) ?? 0);
}

function parseTopologySignal(raw: unknown, manifest: ReadonlySet<string>): Result<TopologySignal, SelectorError> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return Result.err(SelectorError.invalidTopology("UNKNOWN_TOPOLOGY_SIGNAL"));
  }
  const value = raw as Record<string, unknown>;
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== "kind" || keys[1] !== "unit") {
    return Result.err(SelectorError.invalidTopology("UNKNOWN_TOPOLOGY_SIGNAL"));
  }
  if (typeof value.unit !== "string" || value.unit.length === 0) {
    return Result.err(SelectorError.invalidTopology("EMPTY_UNIT_SLUG"));
  }
  if (!manifest.has(value.unit)) {
    return Result.err(SelectorError.invalidTopology("UNIT_NOT_IN_MANIFEST"));
  }
  if (
    typeof value.kind !== "string" ||
    !(TOPOLOGY_SIGNAL_KIND_VALUES as readonly string[]).includes(value.kind)
  ) {
    return Result.err(SelectorError.invalidTopology("UNKNOWN_TOPOLOGY_SIGNAL"));
  }
  return Result.ok(Object.freeze({ unit: value.unit, kind: value.kind as TopologySignalKind }));
}

export const TopologySignalCollection = Object.freeze({
  build(manifestUnits: readonly string[], rawSignals: readonly unknown[]): Result<TopologySignalCollection, SelectorError> {
    if (manifestUnits.length < 2) {
      return Result.err(SelectorError.invalidTopology("MULTI_UNIT_REQUIRED"));
    }
    const manifest = new Set<string>();
    for (const unit of manifestUnits) {
      if (unit.length === 0) return Result.err(SelectorError.invalidTopology("EMPTY_UNIT_SLUG"));
      if (manifest.has(unit)) return Result.err(SelectorError.invalidTopology("DUPLICATE_MANIFEST_UNIT"));
      manifest.add(unit);
    }

    const parsed: TopologySignal[] = [];
    for (const raw of rawSignals) {
      const signal = parseTopologySignal(raw, manifest);
      if (signal.type === "err") return signal;
      parsed.push(signal.value);
    }
    parsed.sort(compareTopologySignals);
    const deduped = parsed.filter(
      (signal, index) => index === 0 || compareTopologySignals(signal, parsed[index - 1]) !== 0,
    );
    const values = Object.freeze(deduped);
    const units = Object.freeze([...manifestUnits]);
    return Result.ok(
      Object.freeze({
        values(): readonly TopologySignal[] {
          return values;
        },
        units(): readonly string[] {
          return units;
        },
      }),
    );
  },
});

export type TopologyDecision = Readonly<{
  topology: Topology;
  reason: TopologyReason;
  signals: readonly TopologySignal[];
  isCoordinated(): boolean;
  diagnosticCodes(): readonly TopologyReason[];
  equals(other: TopologyDecision): boolean;
}>;

function createTopologyDecision(
  topology: Topology,
  reason: TopologyReason,
  signals: readonly TopologySignal[],
): TopologyDecision {
  const frozenSignals = Object.freeze([...signals]);
  return Object.freeze({
    topology,
    reason,
    signals: frozenSignals,
    isCoordinated(): boolean {
      return topology === "coordinated";
    },
    diagnosticCodes(): readonly TopologyReason[] {
      return Object.freeze([reason]);
    },
    equals(other: TopologyDecision): boolean {
      return (
        topology === other.topology &&
        reason === other.reason &&
        JSON.stringify(frozenSignals) === JSON.stringify(other.signals)
      );
    },
  });
}

const COORDINATION_SIGNAL_KIND_VALUES: readonly TopologySignalKind[] = Object.freeze([
  "shared-task",
  "direct-message",
  "mutual-coordination",
]);
const INDEPENDENT_SIGNAL_KIND_VALUES: readonly TopologySignalKind[] = Object.freeze([
  "independent-fanout",
  "iterative-convergence",
]);
const COORDINATION_SIGNAL_KINDS: ReadonlySet<TopologySignalKind> = new Set(COORDINATION_SIGNAL_KIND_VALUES);
const INDEPENDENT_SIGNAL_KINDS: ReadonlySet<TopologySignalKind> = new Set(INDEPENDENT_SIGNAL_KIND_VALUES);

type TopologyClassificationPolicy = Readonly<{
  hasCoordination: boolean;
  hasIndependent: boolean;
  topology: Topology;
  reason: TopologyReason;
}>;

const TOPOLOGY_CLASSIFICATION_POLICIES: readonly TopologyClassificationPolicy[] = Object.freeze([
  Object.freeze({ hasCoordination: false, hasIndependent: false, topology: "unknown", reason: "no-signal" }),
  Object.freeze({
    hasCoordination: true,
    hasIndependent: false,
    topology: "coordinated",
    reason: "coordination-signal",
  }),
  Object.freeze({
    hasCoordination: false,
    hasIndependent: true,
    topology: "independent",
    reason: "independent-signal",
  }),
  Object.freeze({
    hasCoordination: true,
    hasIndependent: true,
    topology: "coordinated",
    reason: "coordination-precedence",
  }),
]);

function classifyTopologySignals(signals: readonly TopologySignal[]): TopologyClassificationPolicy {
  const hasCoordination = signals.some((signal) => COORDINATION_SIGNAL_KINDS.has(signal.kind));
  const hasIndependent = signals.some((signal) => INDEPENDENT_SIGNAL_KINDS.has(signal.kind));
  return TOPOLOGY_CLASSIFICATION_POLICIES.find(
    (policy) => policy.hasCoordination === hasCoordination && policy.hasIndependent === hasIndependent,
  )!;
}

export const TopologyDecision = Object.freeze({
  classify(signals: TopologySignalCollection): TopologyDecision {
    const classification = classifyTopologySignals(signals.values());
    return createTopologyDecision(classification.topology, classification.reason, signals.values());
  },
});

export type ProbeCheck = ProbeCheckShape;
export type ProbeResult = ProbeResultShape;
export type AvailableProbeResult = AvailableProbeResultShape;

export type ProbeResultInput = Readonly<{
  status: ProbeStatus;
  reason: FallbackReason;
  cliVersion?: string;
  modeIdentifier?: string;
  checks?: readonly ProbeCheck[];
}>;

type AvailableProbeResultInput = ProbeResultInput & Readonly<{ status: "available"; reason: "none" }>;

function buildProbeResult(input: AvailableProbeResultInput): Result<AvailableProbeResult, SelectorError>;
function buildProbeResult(input: ProbeResultInput): Result<ProbeResult, SelectorError>;
function buildProbeResult(input: ProbeResultInput): Result<ProbeResult, SelectorError> {
  const correlationValid =
    (input.status === "available" && input.reason === "none") ||
    (input.status !== "available" && input.reason !== "none");
  if (!correlationValid) {
    return Result.err(SelectorError.invalidCapability(undefined, "CAPABILITY_STATUS_REASON_MISMATCH"));
  }
  const checks: ProbeCheck[] = [];
  for (const check of input.checks ?? []) {
    if (
      !(CAPABILITY_DIAGNOSTIC_CODE_VALUES as readonly string[]).includes(check.diagnosticCode) ||
      !(["cli", "auth", "mode", "trust", "handshake"] as readonly string[]).includes(check.name)
    ) {
      return Result.err(SelectorError.invalidCapability(undefined, "CAPABILITY_CHECK_INVALID"));
    }
    checks.push(Object.freeze({ ...check }));
  }
  if (input.status === "available" && checks.some((check) => !check.ok)) {
    return Result.err(SelectorError.invalidCapability(undefined, "CAPABILITY_CHECK_INVALID"));
  }
  const frozenChecks = Object.freeze(checks);
  return Result.ok(
    Object.freeze({
      status: input.status,
      reason: input.reason,
      ...(input.cliVersion === undefined ? {} : { cliVersion: input.cliVersion }),
      ...(input.modeIdentifier === undefined ? {} : { modeIdentifier: input.modeIdentifier }),
      checks: frozenChecks,
      isAvailable(): this is AvailableProbeResult {
        return input.status === "available";
      },
      diagnosticCodes(): readonly CapabilityDiagnosticCode[] {
        return Object.freeze(frozenChecks.filter((check) => !check.ok).map((check) => check.diagnosticCode));
      },
    }),
  );
}

export const ProbeResult = Object.freeze({ build: buildProbeResult });

export type CapabilityRow = Readonly<{ driver: NativeDriver; result: ProbeResult }>;

export type CapabilitySet = Readonly<{
  get(driver: NativeDriver): ProbeResult | undefined;
  rows(): readonly CapabilityRow[];
}>;

export const CapabilitySet = Object.freeze({
  build(expectedDrivers: readonly NativeDriver[], rows: readonly CapabilityRow[]): Result<CapabilitySet, SelectorError> {
    const expected = new Set(expectedDrivers);
    if (expected.size !== expectedDrivers.length) {
      return Result.err(SelectorError.invalidCapability(undefined, "CAPABILITY_DRIVER_DUPLICATE"));
    }
    const byDriver = new Map<NativeDriver, ProbeResult>();
    for (const row of rows) {
      if (!expected.has(row.driver)) {
        return Result.err(SelectorError.invalidCapability(row.driver, "CAPABILITY_DRIVER_EXTRA"));
      }
      if (byDriver.has(row.driver)) {
        return Result.err(SelectorError.invalidCapability(row.driver, "CAPABILITY_DRIVER_DUPLICATE"));
      }
      byDriver.set(row.driver, row.result);
    }
    for (const driver of expectedDrivers) {
      if (!byDriver.has(driver)) {
        return Result.err(SelectorError.invalidCapability(driver, "CAPABILITY_DRIVER_MISSING"));
      }
    }
    const canonicalRows = Object.freeze(
      expectedDrivers.map((driver) => Object.freeze({ driver, result: byDriver.get(driver)! })),
    );
    return Result.ok(
      Object.freeze({
        get(driver: NativeDriver): ProbeResult | undefined {
          return byDriver.get(driver);
        },
        rows(): readonly CapabilityRow[] {
          return canonicalRows;
        },
      }),
    );
  },
});

export const FALLBACK_REASON_PRIORITY: readonly UnavailableReason[] = Object.freeze([
  "cli-unavailable",
  "authentication-unavailable",
  "native-surface-unavailable",
  "native-evidence-unavailable",
  "trust-unavailable",
  "capability-probe-failed",
]);

const REASON_DIAGNOSTIC_CODE: Readonly<Record<UnavailableReason, CapabilityDiagnosticCode>> = Object.freeze({
  "cli-unavailable": "CLI_UNAVAILABLE",
  "authentication-unavailable": "AUTHENTICATION_UNAVAILABLE",
  "native-surface-unavailable": "NATIVE_SURFACE_UNAVAILABLE",
  "native-evidence-unavailable": "NATIVE_EVIDENCE_UNAVAILABLE",
  "trust-unavailable": "TRUST_UNAVAILABLE",
  "capability-probe-failed": "CAPABILITY_PROBE_FAILED",
});

export type FallbackCause = Readonly<{
  driver: NativeDriver;
  reason: UnavailableReason;
  diagnosticCodes: readonly CapabilityDiagnosticCode[];
}>;

export type FallbackCauseCollection = Readonly<{
  primary(): FallbackReason;
  details(): readonly CapabilityDiagnosticCode[];
  values(): readonly FallbackCause[];
}>;

export const FallbackCauseCollection = Object.freeze({
  build(causes: readonly FallbackCause[]): FallbackCauseCollection {
    const rank = new Map(FALLBACK_REASON_PRIORITY.map((reason, index) => [reason, index]));
    const canonical = Object.freeze(
      causes
        .map((cause) =>
          Object.freeze({
            driver: cause.driver,
            reason: cause.reason,
            diagnosticCodes: Object.freeze([...cause.diagnosticCodes]),
          }),
        )
        .sort((a, b) => {
          const reasonDelta = (rank.get(a.reason) ?? 0) - (rank.get(b.reason) ?? 0);
          if (reasonDelta !== 0) return reasonDelta;
          if (a.driver < b.driver) return -1;
          if (a.driver > b.driver) return 1;
          return 0;
        }),
    );
    return Object.freeze({
      primary(): FallbackReason {
        return canonical[0]?.reason ?? "none";
      },
      details(): readonly CapabilityDiagnosticCode[] {
        const values = new Set<CapabilityDiagnosticCode>();
        for (const cause of canonical) {
          values.add(REASON_DIAGNOSTIC_CODE[cause.reason]);
          for (const code of cause.diagnosticCodes) values.add(code);
        }
        return Object.freeze([...values]);
      },
      values(): readonly FallbackCause[] {
        return canonical;
      },
    });
  },
});

export type RedactedTopologyDecision = Readonly<{
  topology: Topology;
  reason: TopologyReason;
  signals: readonly TopologySignal[];
}>;

export type RedactedProbeResult = Readonly<{
  status: ProbeStatus;
  reason: FallbackReason;
  cliVersion?: string;
  modeIdentifier?: string;
  checks: readonly ProbeCheck[];
}>;

export type RedactedNativeSelection = Readonly<{
  kind: "native-selection";
  schemaVersion: 1;
  source: "default" | "new-env";
  requested: RequestedDriver;
  selected: NativeDriver;
  executionMode: "native";
  harness: Harness;
  topology: RedactedTopologyDecision;
  fallbackReason: FallbackReason;
  capabilityDetails: readonly CapabilityDiagnosticCode[];
  probe: RedactedProbeResult;
}>;

export type RedactedFloorSelection = Readonly<{
  kind: "floor-selection";
  schemaVersion: 1;
  source: "default" | "new-env";
  requested: "auto";
  selected: FloorDriver;
  executionMode: "floor";
  harness: Harness;
  topology: RedactedTopologyDecision;
  fallbackReason: UnavailableReason;
  capabilityDetails: readonly CapabilityDiagnosticCode[];
}>;

type RedactedLegacySelectionCommon = Readonly<{
  kind: "legacy-selection";
  schemaVersion: 1;
  source: "legacy-env";
  executionMode: "legacy";
  warningCode: "AMADEUS_USE_SWARM_DEPRECATED";
}>;

export type RedactedClaudeLegacySelection =
  | (RedactedLegacySelectionCommon &
      Readonly<{
        harness: "claude";
        legacyEnabled: true;
        execution: "claude-dynamic-workflow";
      }>)
  | (RedactedLegacySelectionCommon &
      Readonly<{
        harness: "claude";
        legacyEnabled: true;
        execution: "claude-task-floor";
        selectedFloor: "claude-task-floor";
        degradedFrom: "claude-dynamic-workflow";
      }>)
  | (RedactedLegacySelectionCommon &
      Readonly<{
        harness: "claude";
        legacyEnabled: false;
        execution: "claude-task-floor";
        selectedFloor: "claude-task-floor";
      }>);

export type RedactedCodexLegacySelection =
  | (RedactedLegacySelectionCommon &
      Readonly<{
        harness: "codex";
        legacyEnabled: true;
        execution: "codex-exec-floor";
        selectedFloor: "codex-exec-floor";
        degradedFrom: "ultracode";
      }>)
  | (RedactedLegacySelectionCommon &
      Readonly<{
        harness: "codex";
        legacyEnabled: false;
        execution: "codex-exec-floor";
        selectedFloor: "codex-exec-floor";
      }>);

export type RedactedKiroLegacySelection =
  | (RedactedLegacySelectionCommon &
      Readonly<{
        harness: "kiro" | "kiro-ide";
        legacyEnabled: true;
        execution: "kiro-subagent-floor";
        selectedFloor: "kiro-subagent-floor";
        degradedFrom: "ultracode";
      }>)
  | (RedactedLegacySelectionCommon &
      Readonly<{
        harness: "kiro" | "kiro-ide";
        legacyEnabled: false;
        execution: "kiro-subagent-floor";
        selectedFloor: "kiro-subagent-floor";
      }>);

export type RedactedSelection =
  | RedactedNativeSelection
  | RedactedFloorSelection
  | RedactedClaudeLegacySelection
  | RedactedCodexLegacySelection
  | RedactedKiroLegacySelection;

type SelectionBehavior = Readonly<{
  toRedactedJSON(): RedactedSelection;
}>;

export type NativeSelection = SelectionBehavior & RedactedNativeSelection;
export type FloorSelection = SelectionBehavior & RedactedFloorSelection;
export type ClaudeLegacySelection = SelectionBehavior &
  RedactedClaudeLegacySelection &
  Readonly<{ isDegraded(): boolean }>;
export type CodexLegacySelection = SelectionBehavior &
  RedactedCodexLegacySelection &
  Readonly<{ isDegraded(): boolean }>;
export type KiroLegacySelection = SelectionBehavior &
  RedactedKiroLegacySelection &
  Readonly<{ isDegraded(): boolean }>;
export type LegacySelection = ClaudeLegacySelection | CodexLegacySelection | KiroLegacySelection;
export type SelectionOutcome = NativeSelection | FloorSelection | LegacySelection;

type NativeAutoSelectionCoordinates =
  | Readonly<{
      source: "default" | "new-env";
      requested: "auto";
      selected: "claude-agent-teams";
      harness: "claude";
      fallbackReason: "none";
    }>
  | Readonly<{
      source: "default" | "new-env";
      requested: "auto";
      selected: "claude-ultracode";
      harness: "claude";
      fallbackReason: FallbackReason;
    }>
  | Readonly<{
      source: "default" | "new-env";
      requested: "auto";
      selected: "codex-ultra";
      harness: "codex";
      fallbackReason: "none";
    }>
  | Readonly<{
      source: "default" | "new-env";
      requested: "auto";
      selected: "kiro-subagent";
      harness: "kiro" | "kiro-ide";
      fallbackReason: "none";
    }>;

type NativeExplicitSelectionCoordinates =
  | Readonly<{
      source: "new-env";
      requested: "claude-agent-teams";
      selected: "claude-agent-teams";
      harness: "claude";
      fallbackReason: "none";
    }>
  | Readonly<{
      source: "new-env";
      requested: "claude-ultracode";
      selected: "claude-ultracode";
      harness: "claude";
      fallbackReason: "none";
    }>
  | Readonly<{
      source: "new-env";
      requested: "codex-ultra";
      selected: "codex-ultra";
      harness: "codex";
      fallbackReason: "none";
    }>
  | Readonly<{
      source: "new-env";
      requested: "kiro-subagent";
      selected: "kiro-subagent";
      harness: "kiro" | "kiro-ide";
      fallbackReason: "none";
    }>;

export type NativeSelectionInput = Readonly<
  (NativeAutoSelectionCoordinates | NativeExplicitSelectionCoordinates) & {
  topology: TopologyDecision;
  capabilityDetails: readonly CapabilityDiagnosticCode[];
    probe: AvailableProbeResult;
  }
>;

type FloorSelectionTarget =
  | Readonly<{ selected: "claude-task-floor"; harness: "claude" }>
  | Readonly<{ selected: "codex-exec-floor"; harness: "codex" }>
  | Readonly<{ selected: "kiro-subagent-floor"; harness: "kiro" | "kiro-ide" }>;

export type FloorSelectionInput = Readonly<
  FloorSelectionTarget & {
  source: "default" | "new-env";
  topology: TopologyDecision;
  fallbackReason: UnavailableReason;
  capabilityDetails: readonly CapabilityDiagnosticCode[];
  }
>;

type NativeSelectionVariant = Readonly<{
  source: "default" | "new-env";
  requested: RequestedDriver;
  selected: NativeDriver;
  harness: Harness;
  topologies: readonly Topology[];
  fallbackPolicy: "none" | "non-none";
}>;

type NativeSelectionPolicy = Readonly<{
  selected: NativeDriver;
  harness: Harness;
  topologies: readonly Topology[];
  fallbackPolicy: "none" | "non-none";
}>;

const ALL_TOPOLOGIES: readonly Topology[] = Object.freeze([...TOPOLOGY_VALUES]);

const NATIVE_AUTO_SELECTION_POLICIES: readonly NativeSelectionPolicy[] = Object.freeze([
  Object.freeze({
    selected: "claude-agent-teams",
    harness: "claude",
    topologies: Object.freeze(["coordinated"] as const),
    fallbackPolicy: "none",
  }),
  Object.freeze({
    selected: "claude-ultracode",
    harness: "claude",
    topologies: Object.freeze(["independent", "unknown"] as const),
    fallbackPolicy: "none",
  }),
  Object.freeze({
    selected: "claude-ultracode",
    harness: "claude",
    topologies: Object.freeze(["coordinated"] as const),
    fallbackPolicy: "non-none",
  }),
  Object.freeze({
    selected: "codex-ultra",
    harness: "codex",
    topologies: ALL_TOPOLOGIES,
    fallbackPolicy: "none",
  }),
  Object.freeze({
    selected: "kiro-subagent",
    harness: "kiro",
    topologies: ALL_TOPOLOGIES,
    fallbackPolicy: "none",
  }),
  Object.freeze({
    selected: "kiro-subagent",
    harness: "kiro-ide",
    topologies: ALL_TOPOLOGIES,
    fallbackPolicy: "none",
  }),
]);

const NATIVE_EXPLICIT_SELECTION_POLICIES: readonly NativeSelectionPolicy[] = Object.freeze([
  Object.freeze({
    selected: "claude-agent-teams",
    harness: "claude",
    topologies: ALL_TOPOLOGIES,
    fallbackPolicy: "none",
  }),
  Object.freeze({
    selected: "claude-ultracode",
    harness: "claude",
    topologies: ALL_TOPOLOGIES,
    fallbackPolicy: "none",
  }),
  Object.freeze({ selected: "codex-ultra", harness: "codex", topologies: ALL_TOPOLOGIES, fallbackPolicy: "none" }),
  Object.freeze({
    selected: "kiro-subagent",
    harness: "kiro",
    topologies: ALL_TOPOLOGIES,
    fallbackPolicy: "none",
  }),
  Object.freeze({
    selected: "kiro-subagent",
    harness: "kiro-ide",
    topologies: ALL_TOPOLOGIES,
    fallbackPolicy: "none",
  }),
]);

const NATIVE_SELECTION_VARIANTS: readonly NativeSelectionVariant[] = Object.freeze(
  ["default", "new-env"].flatMap((source) =>
    NATIVE_AUTO_SELECTION_POLICIES.map((policy) =>
      Object.freeze({ source, requested: "auto", ...policy } as NativeSelectionVariant),
    ),
  ).concat(
    NATIVE_EXPLICIT_SELECTION_POLICIES.map((policy) =>
      Object.freeze({ source: "new-env", requested: policy.selected, ...policy }),
    ),
  ),
);

const FLOOR_SELECTION_TARGETS = Object.freeze([
  Object.freeze({ selected: "claude-task-floor" as const, harness: "claude" as const }),
  Object.freeze({ selected: "codex-exec-floor" as const, harness: "codex" as const }),
  Object.freeze({ selected: "kiro-subagent-floor" as const, harness: "kiro" as const }),
  Object.freeze({ selected: "kiro-subagent-floor" as const, harness: "kiro-ide" as const }),
]);

function isAvailableProbeCheck(check: unknown): boolean {
  return (
    isPlainObject(check) &&
    isOneOf(check.name, ["cli", "auth", "mode", "trust", "handshake"] as const) &&
    check.ok === true &&
    isOneOf(check.diagnosticCode, CAPABILITY_DIAGNOSTIC_CODE_VALUES)
  );
}

function availableProbeInvariantError(probe: unknown): string | null {
  if (!isPlainObject(probe)) return "$.probe";
  if (probe.status !== "available") return "$.probe.status";
  if (probe.reason !== "none") return "$.probe.reason";
  if (probe.cliVersion !== undefined && typeof probe.cliVersion !== "string") return "$.probe.cliVersion";
  if (probe.modeIdentifier !== undefined && typeof probe.modeIdentifier !== "string") {
    return "$.probe.modeIdentifier";
  }
  if (!Array.isArray(probe.checks)) return "$.probe.checks";
  return probe.checks.every(isAvailableProbeCheck) ? null : "$.probe.checks";
}

function nativeSelectionInvariantError(input: Readonly<Record<string, unknown>>): string | null {
  const topologyError = validateTopologyDecisionInput(input.topology, "$.topology");
  if (topologyError) return topologyError;
  const topology = (input.topology as Readonly<{ topology: Topology }>).topology;
  const variant = NATIVE_SELECTION_VARIANTS.find(
    (candidate) =>
      candidate.source === input.source &&
      candidate.requested === input.requested &&
      candidate.selected === input.selected &&
      candidate.harness === input.harness &&
      candidate.topologies.includes(topology),
  );
  if (variant === undefined) return "$.requested";
  if (!isOneOf(input.fallbackReason, FALLBACK_REASON_VALUES)) return "$.fallbackReason";
  if (variant.fallbackPolicy === "none" && input.fallbackReason !== "none") return "$.fallbackReason";
  if (variant.fallbackPolicy === "non-none" && !isOneOf(input.fallbackReason, FALLBACK_REASON_PRIORITY)) {
    return "$.fallbackReason";
  }
  const capabilityError = validateCapabilityDetails(input.capabilityDetails, "$.capabilityDetails");
  return capabilityError ?? availableProbeInvariantError(input.probe);
}

function floorSelectionInvariantError(input: Readonly<Record<string, unknown>>): string | null {
  const topologyError = validateTopologyDecisionInput(input.topology, "$.topology");
  if (topologyError) return topologyError;
  if (!isOneOf(input.source, ["default", "new-env"] as const)) return "$.source";
  const target = FLOOR_SELECTION_TARGETS.find(
    (candidate) => candidate.selected === input.selected && candidate.harness === input.harness,
  );
  if (target === undefined) return "$.selected";
  if (!isOneOf(input.fallbackReason, FALLBACK_REASON_PRIORITY)) return "$.fallbackReason";
  return validateCapabilityDetails(input.capabilityDetails, "$.capabilityDetails");
}

function deepFreezeJson<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreezeJson(child);
  return Object.freeze(value);
}

function copyJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => copyJson(item)) as T;
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyJson(child)])) as T;
}

function redactTopology(topology: TopologyDecision): RedactedTopologyDecision {
  return deepFreezeJson({
    topology: topology.topology,
    reason: topology.reason,
    signals: topology.signals.map((signal) => ({ ...signal })),
  });
}

function redactProbe(probe: ProbeResult): RedactedProbeResult {
  return deepFreezeJson({
    status: probe.status,
    reason: probe.reason,
    ...(probe.cliVersion === undefined ? {} : { cliVersion: probe.cliVersion }),
    ...(probe.modeIdentifier === undefined ? {} : { modeIdentifier: probe.modeIdentifier }),
    checks: probe.checks.map((check) => ({ ...check })),
  });
}

function selectionWithBehavior<T extends RedactedSelection>(redacted: T): T & SelectionBehavior {
  const frozen = deepFreezeJson(redacted);
  return Object.freeze({
    ...frozen,
    toRedactedJSON(): RedactedSelection {
      return frozen;
    },
  }) as unknown as T & SelectionBehavior;
}

type RedactedLegacySelection =
  | RedactedClaudeLegacySelection
  | RedactedCodexLegacySelection
  | RedactedKiroLegacySelection;

type LegacySelectionBehavior = SelectionBehavior & Readonly<{ isDegraded(): boolean }>;

function legacyWithBehavior<T extends RedactedLegacySelection>(redacted: T): T & LegacySelectionBehavior {
  const frozen = deepFreezeJson(redacted);
  return Object.freeze({
    ...frozen,
    isDegraded(): boolean {
      return "degradedFrom" in frozen;
    },
    toRedactedJSON(): RedactedSelection {
      return frozen;
    },
  }) as unknown as T & SelectionBehavior & Readonly<{ isDegraded(): boolean }>;
}

const LEGACY_COMMON = Object.freeze({
  kind: "legacy-selection" as const,
  schemaVersion: 1 as const,
  source: "legacy-env" as const,
  executionMode: "legacy" as const,
  warningCode: "AMADEUS_USE_SWARM_DEPRECATED" as const,
});

export const SelectionOutcome = Object.freeze({
  native(input: NativeSelectionInput): Result<NativeSelection, SelectorError> {
    const invariantError = nativeSelectionInvariantError(input);
    if (invariantError) return Result.err(SelectorError.invalidSelection(invariantError));
    return Result.ok(selectionWithBehavior({
      kind: "native-selection",
      schemaVersion: 1,
      source: input.source,
      requested: input.requested,
      selected: input.selected,
      executionMode: "native",
      harness: input.harness,
      topology: redactTopology(input.topology),
      fallbackReason: input.fallbackReason,
      capabilityDetails: Object.freeze([...input.capabilityDetails]),
      probe: redactProbe(input.probe),
    }) as NativeSelection);
  },
  floor(input: FloorSelectionInput): Result<FloorSelection, SelectorError> {
    const invariantError = floorSelectionInvariantError(input);
    if (invariantError) return Result.err(SelectorError.invalidSelection(invariantError));
    return Result.ok(selectionWithBehavior({
      kind: "floor-selection",
      schemaVersion: 1,
      source: input.source,
      requested: "auto",
      selected: input.selected,
      executionMode: "floor",
      harness: input.harness,
      topology: redactTopology(input.topology),
      fallbackReason: input.fallbackReason,
      capabilityDetails: Object.freeze([...input.capabilityDetails]),
    }) as FloorSelection);
  },
  claudeDynamicWorkflow(): ClaudeLegacySelection {
    return legacyWithBehavior({
      ...LEGACY_COMMON,
      harness: "claude",
      legacyEnabled: true,
      execution: "claude-dynamic-workflow",
    }) as ClaudeLegacySelection;
  },
  claudeDegradedFloor(): ClaudeLegacySelection {
    return legacyWithBehavior({
      ...LEGACY_COMMON,
      harness: "claude",
      legacyEnabled: true,
      execution: "claude-task-floor",
      selectedFloor: "claude-task-floor",
      degradedFrom: "claude-dynamic-workflow",
    }) as ClaudeLegacySelection;
  },
  claudeDisabledFloor(): ClaudeLegacySelection {
    return legacyWithBehavior({
      ...LEGACY_COMMON,
      harness: "claude",
      legacyEnabled: false,
      execution: "claude-task-floor",
      selectedFloor: "claude-task-floor",
    }) as ClaudeLegacySelection;
  },
  codexFloor(enabled: boolean): CodexLegacySelection {
    return legacyWithBehavior({
      ...LEGACY_COMMON,
      harness: "codex",
      legacyEnabled: enabled,
      execution: "codex-exec-floor",
      selectedFloor: "codex-exec-floor",
      ...(enabled ? { degradedFrom: "ultracode" as const } : {}),
    } as RedactedCodexLegacySelection) as CodexLegacySelection;
  },
  kiroFloor(harness: "kiro" | "kiro-ide", enabled: boolean): KiroLegacySelection {
    return legacyWithBehavior({
      ...LEGACY_COMMON,
      harness,
      legacyEnabled: enabled,
      execution: "kiro-subagent-floor",
      selectedFloor: "kiro-subagent-floor",
      ...(enabled ? { degradedFrom: "ultracode" as const } : {}),
    } as RedactedKiroLegacySelection) as KiroLegacySelection;
  },
});

export type SelectionOutcomeProjection = Readonly<{
  schemaVersion: 1;
  value: RedactedSelection;
  toJSON(): RedactedSelection;
  canonicalJSON(): string;
  digest(): string;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SECRET_FIELD_PATTERN = /(?:credential|token|cookie|secret|prompt|raw(?:payload|response)?|command|argv|environment)/i;

function firstSecretField(value: unknown, path = "$"): string | null {
  if (Array.isArray(value)) {
    const found = value
      .map((child) => firstSecretField(child, `${path}[*]`))
      .filter((candidate): candidate is string => candidate !== null)
      .sort();
    return found[0] ?? null;
  }
  if (!isPlainObject(value)) return null;
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    const childPath = `${path}.${key}`;
    if (SECRET_FIELD_PATTERN.test(key)) return childPath;
    const found = firstSecretField(child, childPath);
    if (found) return found;
  }
  return null;
}

function unknownField(value: Record<string, unknown>, allowed: readonly string[], path = "$"): string | null {
  const allowedSet = new Set(allowed);
  const key = Object.keys(value)
    .sort()
    .find((candidate) => !allowedSet.has(candidate));
  return key === undefined ? null : `${path}.${key}`;
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function validateTopologySignals(value: unknown, path: string): string | null {
  if (!Array.isArray(value)) return path;
  const signalPath = `${path}[*]`;
  if (value.some((signal) => !isPlainObject(signal))) return signalPath;
  const signals = value as readonly Record<string, unknown>[];
  const unknown = signals
    .map((signal) => unknownField(signal, ["unit", "kind"], signalPath))
    .filter((candidate): candidate is string => candidate !== null)
    .sort()[0];
  if (unknown) return unknown;
  if (signals.some((signal) => typeof signal.unit !== "string" || signal.unit.length === 0)) {
    return `${signalPath}.unit`;
  }
  if (signals.some((signal) => !isOneOf(signal.kind, TOPOLOGY_SIGNAL_KIND_VALUES))) {
    return `${signalPath}.kind`;
  }
  return null;
}

function topologyCorrelationError(value: Readonly<Record<string, unknown>>, path: string): string | null {
  const expected = classifyTopologySignals(value.signals as readonly TopologySignal[]);
  if (value.topology !== expected.topology) return `${path}.topology`;
  return value.reason === expected.reason ? null : `${path}.reason`;
}

function validateTopologyDecisionInput(value: unknown, path: string): string | null {
  if (!isPlainObject(value)) return path;
  if (!isOneOf(value.topology, TOPOLOGY_VALUES)) return `${path}.topology`;
  if (
    !isOneOf(
      value.reason,
      ["coordination-signal", "independent-signal", "coordination-precedence", "no-signal"] as const,
    )
  ) {
    return `${path}.reason`;
  }
  const signalsError = validateTopologySignals(value.signals, `${path}.signals`);
  return signalsError ?? topologyCorrelationError(value, path);
}

function validateTopologyProjection(value: unknown, path: string): string | null {
  if (!isPlainObject(value)) return path;
  const unknown = unknownField(value, ["topology", "reason", "signals"], path);
  return unknown ?? validateTopologyDecisionInput(value, path);
}

function validateProbeCheckProjection(value: unknown, path: string): string | null {
  if (!isPlainObject(value)) return path;
  const unknown = unknownField(value, ["name", "ok", "diagnosticCode"], path);
  if (unknown) return unknown;
  if (!isOneOf(value.name, ["cli", "auth", "mode", "trust", "handshake"] as const)) return path;
  if (typeof value.ok !== "boolean") return path;
  return isOneOf(value.diagnosticCode, CAPABILITY_DIAGNOSTIC_CODE_VALUES) ? null : path;
}

function validateProbeChecks(value: unknown, path: string): string | null {
  if (!Array.isArray(value)) return path;
  for (let index = 0; index < value.length; index++) {
    const checkError = validateProbeCheckProjection(value[index], `${path}[${index}]`);
    if (checkError) return checkError;
  }
  return null;
}

function probeStatusReasonCorrelate(value: Record<string, unknown>): boolean {
  if (value.status === "available") return value.reason === "none";
  return value.reason !== "none";
}

function hasFailedProbeCheck(value: unknown): boolean {
  return Array.isArray(value) && value.some((check) => isPlainObject(check) && !check.ok);
}

function validateProbeProjection(value: unknown, path: string): string | null {
  if (!isPlainObject(value)) return path;
  const unknown = unknownField(value, ["status", "reason", "cliVersion", "modeIdentifier", "checks"], path);
  if (unknown) return unknown;
  if (!isOneOf(value.status, ["available", "unavailable", "error"] as const)) return `${path}.status`;
  if (!isOneOf(value.reason, FALLBACK_REASON_VALUES)) return `${path}.reason`;
  if (value.cliVersion !== undefined && typeof value.cliVersion !== "string") return `${path}.cliVersion`;
  if (value.modeIdentifier !== undefined && typeof value.modeIdentifier !== "string") return `${path}.modeIdentifier`;
  const checksError = validateProbeChecks(value.checks, `${path}.checks`);
  if (checksError) return checksError;
  if (!probeStatusReasonCorrelate(value)) return `${path}.reason`;
  if (value.status === "available" && hasFailedProbeCheck(value.checks)) {
    return `${path}.checks`;
  }
  return null;
}

function validateCapabilityDetails(value: unknown, path: string): string | null {
  if (!Array.isArray(value)) return path;
  return value.every((item) => isOneOf(item, CAPABILITY_DIAGNOSTIC_CODE_VALUES)) ? null : path;
}

function validateSelectionCommonProjection(value: Record<string, unknown>): string | null {
  if (value.schemaVersion !== 1) return "$.schemaVersion";
  if (!isOneOf(value.source, ["default", "new-env"] as const)) return "$.source";
  if (!isOneOf(value.requested, REQUESTED_DRIVER_VALUES)) return "$.requested";
  if (!isOneOf(value.harness, HARNESS_VALUES)) return "$.harness";
  if (!isOneOf(value.fallbackReason, FALLBACK_REASON_VALUES)) return "$.fallbackReason";
  const topologyError = validateTopologyProjection(value.topology, "$.topology");
  if (topologyError) return topologyError;
  return validateCapabilityDetails(value.capabilityDetails, "$.capabilityDetails");
}

function validateNativeSelectionProjection(value: Record<string, unknown>): string | null {
  if (value.executionMode !== "native" || !isOneOf(value.selected, NATIVE_DRIVER_VALUES)) return "$.selected";
  const probeError = validateProbeProjection(value.probe, "$.probe");
  if (probeError) return probeError;
  return nativeSelectionInvariantError(value);
}

function validateFloorSelectionProjection(value: Record<string, unknown>): string | null {
  if (
    value.kind !== "floor-selection" ||
    value.executionMode !== "floor" ||
    value.requested !== "auto" ||
    !isOneOf(value.selected, FLOOR_DRIVER_VALUES) ||
    value.fallbackReason === "none"
  ) {
    return "$.kind";
  }
  return floorSelectionInvariantError(value);
}

function validateNonLegacyProjection(value: Record<string, unknown>): string | null {
  const isNative = value.kind === "native-selection";
  const allowed = isNative
    ? [
        "kind",
        "schemaVersion",
        "source",
        "requested",
        "selected",
        "executionMode",
        "harness",
        "topology",
        "fallbackReason",
        "capabilityDetails",
        "probe",
      ]
    : [
        "kind",
        "schemaVersion",
        "source",
        "requested",
        "selected",
        "executionMode",
        "harness",
        "topology",
        "fallbackReason",
        "capabilityDetails",
      ];
  const unknown = unknownField(value, allowed);
  if (unknown) return unknown;
  const commonError = validateSelectionCommonProjection(value);
  if (commonError) return commonError;
  return isNative ? validateNativeSelectionProjection(value) : validateFloorSelectionProjection(value);
}

function validateLegacyFloorProjection(
  value: Record<string, unknown>,
  execution: LegacyExecution,
  selectedFloor: FloorDriver,
  degradedFrom: "claude-dynamic-workflow" | "ultracode",
): string | null {
  if (value.execution !== execution || value.selectedFloor !== selectedFloor) return "$.execution";
  if (value.legacyEnabled) return value.degradedFrom === degradedFrom ? null : "$.degradedFrom";
  return value.degradedFrom === undefined ? null : "$.degradedFrom";
}

function validateClaudeLegacyProjection(value: Record<string, unknown>): string | null {
  if (value.legacyEnabled && value.execution === "claude-dynamic-workflow") {
    return value.selectedFloor === undefined && value.degradedFrom === undefined ? null : "$.selectedFloor";
  }
  return validateLegacyFloorProjection(
    value,
    "claude-task-floor",
    "claude-task-floor",
    "claude-dynamic-workflow",
  );
}

function validateLegacyProjection(value: Record<string, unknown>): string | null {
  const allowed = [
    "kind",
    "schemaVersion",
    "source",
    "executionMode",
    "warningCode",
    "harness",
    "legacyEnabled",
    "execution",
    "selectedFloor",
    "degradedFrom",
  ];
  const unknown = unknownField(value, allowed);
  if (unknown) return unknown;
  if (
    value.kind !== "legacy-selection" ||
    value.schemaVersion !== 1 ||
    value.source !== "legacy-env" ||
    value.executionMode !== "legacy" ||
    value.warningCode !== "AMADEUS_USE_SWARM_DEPRECATED" ||
    typeof value.legacyEnabled !== "boolean"
  ) {
    return "$.kind";
  }
  if (value.harness === "claude") return validateClaudeLegacyProjection(value);
  if (value.harness === "codex") {
    return validateLegacyFloorProjection(value, "codex-exec-floor", "codex-exec-floor", "ultracode");
  }
  if (value.harness === "kiro" || value.harness === "kiro-ide") {
    return validateLegacyFloorProjection(value, "kiro-subagent-floor", "kiro-subagent-floor", "ultracode");
  }
  return "$.harness";
}

const PROBE_CHECK_NAME_VALUES = ["cli", "auth", "mode", "trust", "handshake"] as const;
const PROBE_CHECK_NAME_RANK = new Map(PROBE_CHECK_NAME_VALUES.map((name, index) => [name, index]));
const CAPABILITY_CODE_RANK = new Map(CAPABILITY_DIAGNOSTIC_CODE_VALUES.map((code, index) => [code, index]));

function canonicalCapabilityDetails(
  details: readonly CapabilityDiagnosticCode[],
): readonly CapabilityDiagnosticCode[] {
  return Object.freeze(
    [...new Set(details)].sort(
      (left, right) => (CAPABILITY_CODE_RANK.get(left) ?? 0) - (CAPABILITY_CODE_RANK.get(right) ?? 0),
    ),
  );
}

function canonicalTopologyProjection(value: RedactedTopologyDecision): RedactedTopologyDecision {
  const signals = value.signals.map((signal) => ({ unit: signal.unit, kind: signal.kind }));
  signals.sort(compareTopologySignals);
  const deduped = signals.filter(
    (signal, index) => index === 0 || compareTopologySignals(signal, signals[index - 1]) !== 0,
  );
  return {
    topology: value.topology,
    reason: value.reason,
    signals: deduped,
  };
}

function compareProbeChecks(left: ProbeCheck, right: ProbeCheck): number {
  const nameDelta = (PROBE_CHECK_NAME_RANK.get(left.name) ?? 0) - (PROBE_CHECK_NAME_RANK.get(right.name) ?? 0);
  if (nameDelta !== 0) return nameDelta;
  const codeDelta =
    (CAPABILITY_CODE_RANK.get(left.diagnosticCode) ?? 0) -
    (CAPABILITY_CODE_RANK.get(right.diagnosticCode) ?? 0);
  if (codeDelta !== 0) return codeDelta;
  return Number(left.ok) - Number(right.ok);
}

function canonicalProbeProjection(value: RedactedProbeResult): RedactedProbeResult {
  const checks = value.checks.map((check) => ({
    name: check.name,
    ok: check.ok,
    diagnosticCode: check.diagnosticCode,
  }));
  checks.sort(compareProbeChecks);
  const deduped = checks.filter(
    (check, index) => index === 0 || compareProbeChecks(check, checks[index - 1]) !== 0,
  );
  return {
    status: value.status,
    reason: value.reason,
    ...(value.cliVersion === undefined ? {} : { cliVersion: value.cliVersion }),
    ...(value.modeIdentifier === undefined ? {} : { modeIdentifier: value.modeIdentifier }),
    checks: deduped,
  };
}

function canonicalLegacyProjection(
  value: RedactedClaudeLegacySelection | RedactedCodexLegacySelection | RedactedKiroLegacySelection,
): RedactedClaudeLegacySelection | RedactedCodexLegacySelection | RedactedKiroLegacySelection {
  return {
    kind: "legacy-selection",
    schemaVersion: 1,
    source: "legacy-env",
    executionMode: "legacy",
    warningCode: "AMADEUS_USE_SWARM_DEPRECATED",
    harness: value.harness,
    legacyEnabled: value.legacyEnabled,
    execution: value.execution,
    ...("selectedFloor" in value ? { selectedFloor: value.selectedFloor } : {}),
    ...("degradedFrom" in value ? { degradedFrom: value.degradedFrom } : {}),
  } as RedactedClaudeLegacySelection | RedactedCodexLegacySelection | RedactedKiroLegacySelection;
}

function canonicalizeSelectionProjection(value: RedactedSelection): RedactedSelection {
  if (value.kind === "native-selection") {
    return {
      kind: "native-selection",
      schemaVersion: 1,
      source: value.source,
      requested: value.requested,
      selected: value.selected,
      executionMode: "native",
      harness: value.harness,
      topology: canonicalTopologyProjection(value.topology),
      fallbackReason: value.fallbackReason,
      capabilityDetails: canonicalCapabilityDetails(value.capabilityDetails),
      probe: canonicalProbeProjection(value.probe),
    };
  }
  if (value.kind === "floor-selection") {
    return {
      kind: "floor-selection",
      schemaVersion: 1,
      source: value.source,
      requested: "auto",
      selected: value.selected,
      executionMode: "floor",
      harness: value.harness,
      topology: canonicalTopologyProjection(value.topology),
      fallbackReason: value.fallbackReason,
      capabilityDetails: canonicalCapabilityDetails(value.capabilityDetails),
    };
  }
  return canonicalLegacyProjection(value);
}

function createProjection(value: RedactedSelection): SelectionOutcomeProjection {
  const frozen = deepFreezeJson(copyJson(canonicalizeSelectionProjection(value)));
  const canonical = JSON.stringify(frozen);
  const hash = createHash("sha256").update(canonical).digest("hex");
  return Object.freeze({
    schemaVersion: 1 as const,
    value: frozen,
    toJSON(): RedactedSelection {
      return frozen;
    },
    canonicalJSON(): string {
      return canonical;
    },
    digest(): string {
      return hash;
    },
  });
}

export const SelectionOutcomeProjection = Object.freeze({
  fromOutcome(outcome: SelectionOutcome): SelectionOutcomeProjection {
    return createProjection(outcome.toRedactedJSON());
  },
  parse(raw: unknown): Result<SelectionOutcomeProjection, SelectorError> {
    const secret = firstSecretField(raw);
    if (secret) return Result.err(SelectorError.schemaRejected(secret));
    if (!isPlainObject(raw)) return Result.err(SelectorError.schemaRejected("$"));
    const validationError =
      raw.kind === "native-selection" || raw.kind === "floor-selection"
        ? validateNonLegacyProjection(raw)
        : validateLegacyProjection(raw);
    if (validationError) return Result.err(SelectorError.schemaRejected(validationError));
    return Result.ok(createProjection(raw as RedactedSelection));
  },
});

function topologySignalPresenceSchema(
  kinds: readonly TopologySignalKind[],
  present: boolean,
): Record<string, unknown> {
  const contains = {
    contains: {
      type: "object",
      required: ["kind"],
      properties: { kind: { enum: kinds } },
    },
  };
  return present ? contains : { not: contains };
}

const TOPOLOGY_PROJECTION_SCHEMA_V1 = {
  type: "object",
  additionalProperties: false,
  oneOf: TOPOLOGY_CLASSIFICATION_POLICIES.map((policy) => ({
    required: ["topology", "reason", "signals"],
    properties: {
      topology: { const: policy.topology },
      reason: { const: policy.reason },
      signals: {
        allOf: [
          topologySignalPresenceSchema(COORDINATION_SIGNAL_KIND_VALUES, policy.hasCoordination),
          topologySignalPresenceSchema(INDEPENDENT_SIGNAL_KIND_VALUES, policy.hasIndependent),
        ],
      },
    },
  })),
  required: ["topology", "reason", "signals"],
  properties: {
    topology: { enum: TOPOLOGY_VALUES },
    reason: { enum: ["coordination-signal", "independent-signal", "coordination-precedence", "no-signal"] },
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["unit", "kind"],
        properties: {
          unit: { type: "string", minLength: 1 },
          kind: { enum: TOPOLOGY_SIGNAL_KIND_VALUES },
        },
      },
    },
  },
};

const PROBE_PROJECTION_SCHEMA_V1 = {
  type: "object",
  additionalProperties: false,
  required: ["status", "reason", "checks"],
  properties: {
    status: { const: "available" },
    reason: { const: "none" },
    cliVersion: { type: "string" },
    modeIdentifier: { type: "string" },
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "ok", "diagnosticCode"],
        properties: {
          name: { enum: ["cli", "auth", "mode", "trust", "handshake"] },
          ok: { const: true },
          diagnosticCode: { enum: CAPABILITY_DIAGNOSTIC_CODE_VALUES },
        },
      },
    },
  },
};

const NATIVE_SELECTION_CORRELATION_SCHEMA_V1 = {
  oneOf: NATIVE_SELECTION_VARIANTS.map((variant) => ({
    required: ["source", "requested", "selected", "harness", "topology", "fallbackReason"],
    properties: {
      source: { const: variant.source },
      requested: { const: variant.requested },
      selected: { const: variant.selected },
      harness: { const: variant.harness },
      topology: {
        required: ["topology"],
        properties: { topology: { enum: variant.topologies } },
      },
      fallbackReason:
        variant.fallbackPolicy === "none" ? { const: "none" } : { enum: FALLBACK_REASON_PRIORITY },
    },
  })),
};

const FLOOR_SELECTION_CORRELATION_SCHEMA_V1 = {
  oneOf: FLOOR_SELECTION_TARGETS.map((target) => ({
    required: ["selected", "harness"],
    properties: {
      selected: { const: target.selected },
      harness: { const: target.harness },
    },
  })),
};

const LEGACY_SCHEMA_PROPERTIES = {
  kind: { const: "legacy-selection" },
  schemaVersion: { const: 1 },
  source: { const: "legacy-env" },
  executionMode: { const: "legacy" },
  warningCode: { const: "AMADEUS_USE_SWARM_DEPRECATED" },
};

const LEGACY_SCHEMA_REQUIRED = [
  "kind",
  "schemaVersion",
  "source",
  "executionMode",
  "warningCode",
  "harness",
  "legacyEnabled",
  "execution",
];

function legacySchemaVariant(
  harness: "claude" | "codex" | "kiro" | "kiro-ide",
  enabled: boolean,
  execution: LegacyExecution,
  selectedFloor?: FloorDriver,
  degradedFrom?: "claude-dynamic-workflow" | "ultracode",
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      ...LEGACY_SCHEMA_REQUIRED,
      ...(selectedFloor === undefined ? [] : ["selectedFloor"]),
      ...(degradedFrom === undefined ? [] : ["degradedFrom"]),
    ],
    properties: {
      ...LEGACY_SCHEMA_PROPERTIES,
      harness: { const: harness },
      legacyEnabled: { const: enabled },
      execution: { const: execution },
      ...(selectedFloor === undefined ? {} : { selectedFloor: { const: selectedFloor } }),
      ...(degradedFrom === undefined ? {} : { degradedFrom: { const: degradedFrom } }),
    },
  };
}

export const SELECTION_OUTCOME_SCHEMA_V1 = deepFreezeJson({
  $id: "https://amadeus-dlc.dev/schema/swarm-driver-selection/v1",
  $schema: "https://json-schema.org/draft/2020-12/schema",
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      allOf: [NATIVE_SELECTION_CORRELATION_SCHEMA_V1],
      required: [
        "kind",
        "schemaVersion",
        "source",
        "requested",
        "selected",
        "executionMode",
        "harness",
        "topology",
        "fallbackReason",
        "capabilityDetails",
        "probe",
      ],
      properties: {
        kind: { const: "native-selection" },
        schemaVersion: { const: 1 },
        source: { enum: ["default", "new-env"] },
        requested: { enum: REQUESTED_DRIVER_VALUES },
        selected: { enum: NATIVE_DRIVER_VALUES },
        executionMode: { const: "native" },
        harness: { enum: HARNESS_VALUES },
        topology: TOPOLOGY_PROJECTION_SCHEMA_V1,
        fallbackReason: { enum: FALLBACK_REASON_VALUES },
        capabilityDetails: { type: "array", items: { enum: CAPABILITY_DIAGNOSTIC_CODE_VALUES } },
        probe: PROBE_PROJECTION_SCHEMA_V1,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      allOf: [FLOOR_SELECTION_CORRELATION_SCHEMA_V1],
      required: [
        "kind",
        "schemaVersion",
        "source",
        "requested",
        "selected",
        "executionMode",
        "harness",
        "topology",
        "fallbackReason",
        "capabilityDetails",
      ],
      properties: {
        kind: { const: "floor-selection" },
        schemaVersion: { const: 1 },
        source: { enum: ["default", "new-env"] },
        requested: { const: "auto" },
        selected: { enum: FLOOR_DRIVER_VALUES },
        executionMode: { const: "floor" },
        harness: { enum: HARNESS_VALUES },
        topology: TOPOLOGY_PROJECTION_SCHEMA_V1,
        fallbackReason: { enum: FALLBACK_REASON_PRIORITY },
        capabilityDetails: { type: "array", items: { enum: CAPABILITY_DIAGNOSTIC_CODE_VALUES } },
      },
    },
    legacySchemaVariant("claude", true, "claude-dynamic-workflow"),
    legacySchemaVariant("claude", true, "claude-task-floor", "claude-task-floor", "claude-dynamic-workflow"),
    legacySchemaVariant("claude", false, "claude-task-floor", "claude-task-floor"),
    legacySchemaVariant("codex", true, "codex-exec-floor", "codex-exec-floor", "ultracode"),
    legacySchemaVariant("codex", false, "codex-exec-floor", "codex-exec-floor"),
    legacySchemaVariant("kiro", true, "kiro-subagent-floor", "kiro-subagent-floor", "ultracode"),
    legacySchemaVariant("kiro", false, "kiro-subagent-floor", "kiro-subagent-floor"),
    legacySchemaVariant("kiro-ide", true, "kiro-subagent-floor", "kiro-subagent-floor", "ultracode"),
    legacySchemaVariant("kiro-ide", false, "kiro-subagent-floor", "kiro-subagent-floor"),
  ],
});

export * from "./amadeus-swarm-driver-adapter-contract.ts";
