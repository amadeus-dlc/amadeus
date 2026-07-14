// covers: function:parseDriverRequest, function:classifyTopology, function:candidateChain, function:floorForHarness, function:selectExplicitDriver, function:selectAutoDriver, function:resolveLegacyDriver, function:selectDriver
// size: small

import { describe, expect, test } from "bun:test";
import {
  DriverRequest,
  ProbeResult,
  type CapabilityDiagnosticCode,
  type CapabilityRow,
  type FallbackReason,
  type Harness,
  type NativeDriver,
  type ProbeResult as ProbeResultValue,
  type TopologyDecision,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
import {
  candidateChain,
  classifyTopology,
  floorForHarness,
  parseDriverRequest,
  resolveLegacyDriver,
  selectAutoDriver,
  selectDriver,
  selectExplicitDriver,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-selector.ts";

function okValue<T>(result: { type: "ok"; value: T } | { type: "err"; error: unknown }): T {
  if (result.type === "err") throw new Error(JSON.stringify(result.error));
  return result.value;
}

function topology(signals: readonly unknown[] = []): TopologyDecision {
  return okValue(classifyTopology(["alpha", "beta"], signals));
}

const REASON_CODE: Readonly<Record<Exclude<FallbackReason, "none">, CapabilityDiagnosticCode>> = {
  "cli-unavailable": "CLI_UNAVAILABLE",
  "authentication-unavailable": "AUTHENTICATION_UNAVAILABLE",
  "native-surface-unavailable": "NATIVE_SURFACE_UNAVAILABLE",
  "native-evidence-unavailable": "NATIVE_EVIDENCE_UNAVAILABLE",
  "trust-unavailable": "TRUST_UNAVAILABLE",
  "capability-probe-failed": "CAPABILITY_PROBE_FAILED",
};

function available(): ProbeResultValue {
  return okValue(ProbeResult.build({ status: "available", reason: "none" }));
}

function unavailable(reason: Exclude<FallbackReason, "none">): ProbeResultValue {
  return okValue(
    ProbeResult.build({
      status: "unavailable",
      reason,
      checks: [{ name: "mode", ok: false, diagnosticCode: REASON_CODE[reason] }],
    }),
  );
}

function rows(values: ReadonlyArray<readonly [NativeDriver, ProbeResultValue]>): CapabilityRow[] {
  return values.map(([driver, result]) => ({ driver, result }));
}

describe("environment request parsing", () => {
  test("unset resolves to the default auto request", () => {
    expect(okValue(parseDriverRequest({})).toRedactedJSON()).toEqual({ source: "default", requested: "auto" });
  });

  test.each([
    "auto",
    "claude-agent-teams",
    "claude-ultracode",
    "codex-ultra",
    "kiro-subagent",
  ] as const)("accepts the exact public value %s", (requested) => {
    expect(okValue(parseDriverRequest({ AMADEUS_SWARM_DRIVER: requested })).toRedactedJSON()).toEqual({
      source: "new-env",
      requested,
    });
  });

  test.each(["", "AUTO", "codex-exec-floor", " codex-ultra", "unknown"])(
    "rejects invalid new driver value %j without echoing it",
    (raw) => {
      const result = parseDriverRequest({ AMADEUS_SWARM_DRIVER: raw });
      expect(result.type).toBe("err");
      expect(JSON.stringify(result)).not.toContain(raw || "never-present-empty-value");
      if (result.type === "err") expect(result.error.code).toBe("INVALID_DRIVER");
    },
  );

  test.each([
    ["auto", "1"],
    ["codex-ultra", "0"],
    ["", ""],
    ["unknown", "secret"],
  ])("new=%j and legacy=%j always conflict by presence", (newValue, legacyValue) => {
    expect(
      parseDriverRequest({ AMADEUS_SWARM_DRIVER: newValue, AMADEUS_USE_SWARM: legacyValue }),
    ).toEqual({
      type: "err",
      error: {
        code: "CONFLICTING_ENV",
        variables: ["AMADEUS_SWARM_DRIVER", "AMADEUS_USE_SWARM"],
      },
    });
  });

  test.each([
    ["1", "enabled"],
    ["0", "other"],
    ["", "other"],
    ["do-not-retain", "other"],
  ] as const)("legacy %j is classified as %s and raw bytes are discarded", (raw, rawValueClass) => {
    const request = okValue(parseDriverRequest({ AMADEUS_USE_SWARM: raw }));
    expect(request.toRedactedJSON()).toEqual({ source: "legacy-env", rawValueClass });
    expect(JSON.stringify(request)).not.toContain(raw === "1" ? "AMADEUS_USE_SWARM" : raw || "never-present");
  });
});

describe("topology normalization and candidate policy", () => {
  test.each([
    [[], "unknown", "no-signal"],
    [[{ unit: "alpha", kind: "shared-task" }], "coordinated", "coordination-signal"],
    [[{ unit: "alpha", kind: "independent-fanout" }], "independent", "independent-signal"],
    [
      [
        { unit: "beta", kind: "independent-fanout" },
        { unit: "alpha", kind: "shared-task" },
      ],
      "coordinated",
      "coordination-precedence",
    ],
  ] as const)("classifies the four signal-presence rows", (signals, expectedTopology, reason) => {
    const decision = topology(signals);
    expect(decision.topology).toBe(expectedTopology);
    expect(decision.reason).toBe(reason);
  });

  test("canonicalizes unit/kind order and removes exact duplicates", () => {
    const decision = topology([
      { unit: "beta", kind: "iterative-convergence" },
      { unit: "alpha", kind: "direct-message" },
      { unit: "alpha", kind: "direct-message" },
      { unit: "alpha", kind: "shared-task" },
    ]);
    expect(decision.signals).toEqual([
      { unit: "alpha", kind: "shared-task" },
      { unit: "alpha", kind: "direct-message" },
      { unit: "beta", kind: "iterative-convergence" },
    ]);
  });

  test("rejects single-unit, manifest-external, and unknown-kind input", () => {
    expect(classifyTopology(["only"], []).type).toBe("err");
    expect(classifyTopology(["alpha", "beta"], [{ unit: "gamma", kind: "shared-task" }]).type).toBe("err");
    expect(classifyTopology(["alpha", "beta"], [{ unit: "alpha", kind: "guess" }]).type).toBe("err");
  });

  test("returns the exact harness/topology candidate chains", () => {
    expect(candidateChain("claude", topology([{ unit: "alpha", kind: "shared-task" }]))).toEqual([
      "claude-agent-teams",
      "claude-ultracode",
      "claude-task-floor",
    ]);
    expect(candidateChain("claude", topology())).toEqual(["claude-ultracode", "claude-task-floor"]);
    expect(candidateChain("codex", topology())).toEqual(["codex-ultra", "codex-exec-floor"]);
    expect(candidateChain("kiro", topology())).toEqual(["kiro-subagent", "kiro-subagent-floor"]);
    expect(candidateChain("kiro-ide", topology())).toEqual(["kiro-subagent", "kiro-subagent-floor"]);
  });

  test("maps every harness to its internal floor", () => {
    expect(["claude", "codex", "kiro", "kiro-ide"].map((harness) => floorForHarness(harness as Harness))).toEqual([
      "claude-task-floor",
      "codex-exec-floor",
      "kiro-subagent-floor",
      "kiro-subagent-floor",
    ]);
  });
});

describe("explicit and auto selection", () => {
  test("explicit driver succeeds only when its own capability is available", () => {
    const result = okValue(
      selectExplicitDriver(
        "codex-ultra",
        "codex",
        topology(),
        rows([["codex-ultra", available()]]),
      ),
    );
    expect(result.kind).toBe("native-selection");
    expect(result.selected).toBe("codex-ultra");
    expect(result.fallbackReason).toBe("none");
  });

  test("explicit mismatch and unavailable return hard errors without floors", () => {
    const mismatch = selectExplicitDriver(
      "claude-agent-teams",
      "codex",
      topology(),
      rows([["claude-agent-teams", available()]]),
    );
    const unavailableResult = selectExplicitDriver(
      "codex-ultra",
      "codex",
      topology(),
      rows([["codex-ultra", unavailable("native-surface-unavailable")]]),
    );
    expect(mismatch.type === "err" && mismatch.error.code).toBe("HARNESS_DRIVER_MISMATCH");
    expect(unavailableResult.type === "err" && unavailableResult.error.code).toBe("EXPLICIT_DRIVER_UNAVAILABLE");
    expect(JSON.stringify([mismatch, unavailableResult])).not.toContain("floor-selection");
  });

  test.each([
    ["claude coordinated first", "claude", [{ unit: "alpha", kind: "shared-task" }], [["claude-agent-teams", "yes"], ["claude-ultracode", "yes"]], "claude-agent-teams"],
    ["claude coordinated second", "claude", [{ unit: "alpha", kind: "shared-task" }], [["claude-agent-teams", "no"], ["claude-ultracode", "yes"]], "claude-ultracode"],
    ["claude unknown", "claude", [], [["claude-ultracode", "yes"]], "claude-ultracode"],
    ["codex", "codex", [], [["codex-ultra", "yes"]], "codex-ultra"],
    ["kiro", "kiro", [], [["kiro-subagent", "yes"]], "kiro-subagent"],
    ["kiro ide", "kiro-ide", [], [["kiro-subagent", "yes"]], "kiro-subagent"],
  ] as const)("auto selects %s", (_name, harness, signals, capabilityKinds, selected) => {
    const capabilityRows = capabilityKinds.map(([driver, state]) => ({
      driver,
      result: state === "yes" ? available() : unavailable("native-surface-unavailable"),
    }));
    const outcome = okValue(selectAutoDriver("default", harness, topology(signals), capabilityRows));
    expect(outcome.kind).toBe("native-selection");
    expect(outcome.selected).toBe(selected);
  });

  test.each([
    ["claude", [["claude-ultracode", "cli-unavailable"]], "claude-task-floor"],
    ["codex", [["codex-ultra", "cli-unavailable"]], "codex-exec-floor"],
    ["kiro", [["kiro-subagent", "trust-unavailable"]], "kiro-subagent-floor"],
    ["kiro-ide", [["kiro-subagent", "trust-unavailable"]], "kiro-subagent-floor"],
  ] as const)("auto may loudly fall back on %s", (harness, capabilityKinds, selected) => {
    const capabilityRows = capabilityKinds.map(([driver, reason]) => ({ driver, result: unavailable(reason) }));
    const outcome = okValue(selectAutoDriver("new-env", harness, topology(), capabilityRows));
    expect(outcome.kind).toBe("floor-selection");
    expect(outcome.selected).toBe(selected);
    expect(outcome.fallbackReason).not.toBe("none");
  });

  test("fallback primary reason uses fixed priority rather than candidate order", () => {
    const outcome = okValue(
      selectAutoDriver(
        "default",
        "claude",
        topology([{ unit: "alpha", kind: "shared-task" }]),
        rows([
          ["claude-agent-teams", unavailable("trust-unavailable")],
          ["claude-ultracode", unavailable("cli-unavailable")],
        ]),
      ),
    );
    expect(outcome.kind).toBe("floor-selection");
    expect(outcome.fallbackReason).toBe("cli-unavailable");
    expect(outcome.capabilityDetails).toEqual(["CLI_UNAVAILABLE", "TRUST_UNAVAILABLE"]);
  });

  test("missing, duplicate, and extra capability rows fail closed", () => {
    const decision = topology();
    expect(selectAutoDriver("default", "codex", decision, []).type).toBe("err");
    expect(
      selectAutoDriver("default", "codex", decision, rows([["codex-ultra", available()], ["codex-ultra", available()]])).type,
    ).toBe("err");
    expect(selectAutoDriver("default", "codex", decision, rows([["kiro-subagent", available()]])).type).toBe("err");
  });

  test("auto selection rejects a structurally corrupt unavailable probe with no fallback reason", () => {
    const corruptProbe = {
      status: "unavailable",
      reason: "none",
      checks: [],
      isAvailable: () => false,
      diagnosticCodes: () => [],
    } as unknown as ProbeResultValue;
    expect(
      selectAutoDriver("default", "codex", topology(), rows([["codex-ultra", corruptProbe]])).type,
    ).toBe("err");
  });
});

describe("independent 0.1.x legacy resolution", () => {
  test.each([
    ["claude", "enabled", "claude-dynamic-workflow", undefined, false],
    ["claude", "other", "claude-task-floor", "claude-task-floor", false],
    ["codex", "enabled", "codex-exec-floor", "codex-exec-floor", true],
    ["codex", "other", "codex-exec-floor", "codex-exec-floor", false],
    ["kiro", "enabled", "kiro-subagent-floor", "kiro-subagent-floor", true],
    ["kiro", "other", "kiro-subagent-floor", "kiro-subagent-floor", false],
    ["kiro-ide", "enabled", "kiro-subagent-floor", "kiro-subagent-floor", true],
    ["kiro-ide", "other", "kiro-subagent-floor", "kiro-subagent-floor", false],
  ] as const)("%s %s preserves its legacy execution", (harness, valueClass, execution, selectedFloor, degraded) => {
    const outcome = resolveLegacyDriver(valueClass, harness);
    expect(outcome.execution).toBe(execution);
    expect("selectedFloor" in outcome ? outcome.selectedFloor : undefined).toBe(selectedFloor);
    expect(outcome.isDegraded()).toBe(degraded);
    expect(outcome.warningCode).toBe("AMADEUS_USE_SWARM_DEPRECATED");
    expect(outcome.executionMode).toBe("legacy");
  });

  test("Claude enabled may degrade only when the pre-dispatch surface is unavailable", () => {
    const outcome = resolveLegacyDriver("enabled", "claude", false);
    expect(outcome.execution).toBe("claude-task-floor");
    expect(outcome.isDegraded()).toBe(true);
    expect("degradedFrom" in outcome && outcome.degradedFrom).toBe("claude-dynamic-workflow");
  });

  test("facade keeps legacy independent and routes new explicit requests", () => {
    const decision = topology();
    const legacy = okValue(
      selectDriver({
        request: DriverRequest.fromLegacyEnvironment("enabled"),
        harness: "codex",
        topology: decision,
        capabilities: [],
      }),
    );
    const explicit = okValue(
      selectDriver({
        request: DriverRequest.fromNewEnvironment("codex-ultra"),
        harness: "codex",
        topology: decision,
        capabilities: rows([["codex-ultra", available()]]),
      }),
    );
    const automatic = okValue(
      selectDriver({
        request: DriverRequest.default(),
        harness: "codex",
        topology: decision,
        capabilities: rows([["codex-ultra", available()]]),
      }),
    );
    expect(legacy.kind).toBe("legacy-selection");
    expect(legacy.executionMode).toBe("legacy");
    expect(explicit.kind).toBe("native-selection");
    expect(automatic.kind).toBe("native-selection");
  });
});
