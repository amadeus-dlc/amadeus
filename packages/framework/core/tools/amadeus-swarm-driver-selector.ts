// Deterministic, side-effect-free swarm driver selection policy.

import {
  CapabilitySet,
  DriverRequest,
  FallbackCauseCollection,
  NativeDriverValue,
  REQUESTED_DRIVER_VALUES,
  Result,
  SelectionOutcome,
  SelectorError,
  TopologyDecision,
  TopologySignalCollection,
  type Result as PolicyResult,
  type SelectorError as SelectorErrorValue,
  type SwarmEnvironment,
  type DriverRequest as DriverRequestValue,
  type CapabilityRow,
  type FloorDriver,
  type FloorSelection,
  type Harness,
  type LegacySelection,
  type LegacyValueClass,
  type NativeDriver,
  type NativeSelection,
  type SelectedDriver,
  type SelectionOutcome as SelectionOutcomeValue,
  type TopologyDecision as TopologyDecisionValue,
} from "./amadeus-swarm-driver-contract.ts";

const NEW_DRIVER_ENV = "AMADEUS_SWARM_DRIVER";
const LEGACY_SWARM_ENV = "AMADEUS_USE_SWARM";

function hasOwn(environment: SwarmEnvironment, key: string): boolean {
  return Object.hasOwn(environment, key);
}

export function parseDriverRequest(
  environment: SwarmEnvironment,
): PolicyResult<DriverRequestValue, SelectorErrorValue> {
  const hasNew = hasOwn(environment, NEW_DRIVER_ENV);
  const hasLegacy = hasOwn(environment, LEGACY_SWARM_ENV);
  if (hasNew && hasLegacy) return Result.err(SelectorError.conflictingEnvironment());
  if (hasNew) {
    const raw = environment[NEW_DRIVER_ENV];
    if (typeof raw !== "string" || !(REQUESTED_DRIVER_VALUES as readonly string[]).includes(raw)) {
      return Result.err(SelectorError.invalidDriver());
    }
    return Result.ok(DriverRequest.fromNewEnvironment(raw as (typeof REQUESTED_DRIVER_VALUES)[number]));
  }
  if (hasLegacy) {
    return Result.ok(DriverRequest.fromLegacyEnvironment(environment[LEGACY_SWARM_ENV] === "1" ? "enabled" : "other"));
  }
  return Result.ok(DriverRequest.default());
}

export function classifyTopology(
  manifestUnits: readonly string[],
  signals: readonly unknown[],
): PolicyResult<TopologyDecisionValue, SelectorErrorValue> {
  const normalized = TopologySignalCollection.build(manifestUnits, signals);
  if (normalized.type === "err") return normalized;
  return Result.ok(TopologyDecision.classify(normalized.value));
}

const CLAUDE_COORDINATED_CHAIN = Object.freeze([
  "claude-agent-teams",
  "claude-ultracode",
  "claude-task-floor",
] as const);
const CLAUDE_INDEPENDENT_CHAIN = Object.freeze(["claude-ultracode", "claude-task-floor"] as const);
const CODEX_CHAIN = Object.freeze(["codex-ultra", "codex-exec-floor"] as const);
const KIRO_CHAIN = Object.freeze(["kiro-subagent", "kiro-subagent-floor"] as const);

export function candidateChain(harness: Harness, topology: TopologyDecisionValue): readonly SelectedDriver[] {
  if (harness === "claude") {
    return topology.isCoordinated() ? CLAUDE_COORDINATED_CHAIN : CLAUDE_INDEPENDENT_CHAIN;
  }
  if (harness === "codex") return CODEX_CHAIN;
  return KIRO_CHAIN;
}

export function floorForHarness(harness: Harness): FloorDriver {
  if (harness === "claude") return "claude-task-floor";
  if (harness === "codex") return "codex-exec-floor";
  return "kiro-subagent-floor";
}

export function selectExplicitDriver(
  requested: NativeDriver,
  harness: Harness,
  topology: TopologyDecisionValue,
  capabilities: readonly CapabilityRow[],
): PolicyResult<NativeSelection, SelectorErrorValue> {
  if (!NativeDriverValue.from(requested).supports(harness)) {
    return Result.err(SelectorError.harnessMismatch(harness, requested));
  }
  const capabilitySet = CapabilitySet.build([requested], capabilities);
  if (capabilitySet.type === "err") return capabilitySet;
  const probe = capabilitySet.value.get(requested)!;
  if (!probe.isAvailable()) {
    return Result.err(SelectorError.explicitUnavailable(requested, probe.reason as Exclude<typeof probe.reason, "none">));
  }
  return SelectionOutcome.native({
    source: "new-env",
    requested,
    selected: requested,
    harness,
    topology,
    fallbackReason: "none",
    capabilityDetails: probe.diagnosticCodes(),
    probe,
  } as Parameters<typeof SelectionOutcome.native>[0]);
}

export function selectAutoDriver(
  source: "default" | "new-env",
  harness: Harness,
  topology: TopologyDecisionValue,
  capabilities: readonly CapabilityRow[],
): PolicyResult<NativeSelection | FloorSelection, SelectorErrorValue> {
  const chain = candidateChain(harness, topology);
  const nativeCandidates = chain.filter((candidate): candidate is NativeDriver =>
    NativeDriverValue.parse(candidate).type === "ok",
  );
  const capabilitySet = CapabilitySet.build(nativeCandidates, capabilities);
  if (capabilitySet.type === "err") return capabilitySet;

  const failures = [];
  for (const driver of nativeCandidates) {
    const probe = capabilitySet.value.get(driver)!;
    if (probe.isAvailable()) {
      const fallback = FallbackCauseCollection.build(failures);
      return SelectionOutcome.native({
        source,
        requested: "auto",
        selected: driver,
        harness,
        topology,
        fallbackReason: fallback.primary(),
        capabilityDetails: fallback.details(),
        probe,
      } as Parameters<typeof SelectionOutcome.native>[0]);
    }
    failures.push({
      driver,
      reason: probe.reason as Exclude<typeof probe.reason, "none">,
      diagnosticCodes: probe.diagnosticCodes(),
    });
  }

  const fallback = FallbackCauseCollection.build(failures);
  const primary = fallback.primary();
  if (primary === "none") {
    return Result.err(SelectorError.invalidCapability(undefined, "CAPABILITY_STATUS_REASON_MISMATCH"));
  }
  const floorInput = {
    source,
    selected: floorForHarness(harness),
    harness,
    topology,
    fallbackReason: primary,
    capabilityDetails: fallback.details(),
  };
  return SelectionOutcome.floor(floorInput as Parameters<typeof SelectionOutcome.floor>[0]);
}

export function resolveLegacyDriver(
  rawValueClass: LegacyValueClass,
  harness: Harness,
  claudeDynamicWorkflowAvailable = true,
): LegacySelection {
  const enabled = rawValueClass === "enabled";
  if (harness === "claude") {
    if (!enabled) return SelectionOutcome.claudeDisabledFloor();
    return claudeDynamicWorkflowAvailable
      ? SelectionOutcome.claudeDynamicWorkflow()
      : SelectionOutcome.claudeDegradedFloor();
  }
  if (harness === "codex") return SelectionOutcome.codexFloor(enabled);
  return SelectionOutcome.kiroFloor(harness, enabled);
}

export type SelectionPolicyInput = Readonly<{
  request: DriverRequestValue;
  harness: Harness;
  topology: TopologyDecisionValue;
  capabilities: readonly CapabilityRow[];
  claudeDynamicWorkflowAvailable?: boolean;
}>;

export function selectDriver(
  input: SelectionPolicyInput,
): PolicyResult<SelectionOutcomeValue, SelectorErrorValue> {
  if (input.request.source === "legacy-env") {
    return Result.ok(
      resolveLegacyDriver(
        input.request.rawValueClass,
        input.harness,
        input.claudeDynamicWorkflowAvailable ?? true,
      ),
    );
  }
  if (input.request.requested === "auto") {
    return selectAutoDriver(input.request.source, input.harness, input.topology, input.capabilities);
  }
  return selectExplicitDriver(input.request.requested, input.harness, input.topology, input.capabilities);
}
