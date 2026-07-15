// size: small

import { describe, expect, test } from "bun:test";
import {
  CAPABILITY_DIAGNOSTIC_CODE_VALUES,
  CapabilitySet,
  DriverAdapterSet,
  DriverRegistration,
  DriverRegistrationSet,
  DriverRequest,
  FALLBACK_REASON_PRIORITY,
  FALLBACK_REASON_VALUES,
  FallbackCauseCollection,
  FLOOR_DRIVER_VALUES,
  HARNESS_VALUES,
  NATIVE_DRIVER_VALUES,
  NativeDriverValue,
  ProbeResult,
  REQUESTED_DRIVER_VALUES,
  SELECTION_OUTCOME_SCHEMA_V1,
  SelectionOutcome,
  SelectionOutcomeProjection,
  TOPOLOGY_VALUES,
  TopologyDecision,
  TopologySignalCollection,
  type DriverRegistrationInput,
  type DriverRegistration as DriverRegistrationValue,
  type DriverAdapter,
  type DriverRequest as DriverRequestValue,
  type CapabilityDiagnosticCode,
  type FloorSelectionInput,
  type Harness,
  type LaunchSpec,
  type NativeSelectionInput,
  type NativeDriver,
  type NormalizedDriverEvent,
  type ProbeCheck,
  type RedactedCodexLegacySelection,
  type RedactedNativeSelection,
  type RegistrationSlotInput,
  type TopologySignal,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";

const unavailableSlot: RegistrationSlotInput = Object.freeze({
  kind: "unavailable",
  diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED",
});

function okValue<T>(result: { type: "ok"; value: T } | { type: "err"; error: unknown }): T {
  if (result.type === "err") throw new Error(JSON.stringify(result.error));
  return result.value;
}

function unknownTopology() {
  const signals = okValue(TopologySignalCollection.build(["alpha", "beta"], []));
  return TopologyDecision.classify(signals);
}

function classifiedTopology(signals: readonly TopologySignal[]) {
  return TopologyDecision.classify(okValue(TopologySignalCollection.build(["alpha", "beta"], signals)));
}

function availableProbe() {
  return okValue(
    ProbeResult.build({
      status: "available",
      reason: "none",
      cliVersion: "1.0.0",
      modeIdentifier: "codex-ultra-v1:model",
      checks: [{ name: "cli", ok: true, diagnosticCode: "CLI_AVAILABLE" }],
    }),
  );
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

function registration(input: DriverRegistrationInput) {
  return okValue(DriverRegistration.build(input));
}

function adapter(driver: NativeDriver, harnesses: readonly Harness[]): DriverAdapter {
  return Object.freeze({
    driver,
    provider: NativeDriverValue.from(driver).provider,
    supports(harness: Harness): boolean {
      return harnesses.includes(harness);
    },
    async probe() {
      return availableProbe();
    },
    prepareResources() {
      return Object.freeze({ resources: Object.freeze([]), preparationDigest: "empty-resources" });
    },
    buildExecution(input): Readonly<{
      launch: LaunchSpec;
      capture: Readonly<{ kind: "hook-only"; hookDir: string }>;
      captureIdentity: Readonly<{
        executionId: string;
        attemptId: string;
        attemptNonceHash: string;
        planDigest: string;
        waveIndex: number;
        waveDigest: string;
      }>;
      resources: readonly never[];
    }> {
      return Object.freeze({
        launch: Object.freeze({
          executable: "test-adapter",
          args: Object.freeze([]),
          cwd: "/project",
          env: Object.freeze({}),
          transport: Object.freeze({
            kind: "stdio-json" as const,
            stdin: "closed" as const,
            output: "stream-json" as const,
          }),
          timeoutMs: 1,
        }),
        capture: Object.freeze({ kind: "hook-only" as const, hookDir: "/evidence/hooks" }),
        captureIdentity: Object.freeze({
          executionId: input.plan.executionId,
          attemptId: input.plan.attemptId,
          attemptNonceHash: input.plan.attemptNonceHash,
          planDigest: input.plan.planDigest,
          waveIndex: input.wave.index,
          waveDigest: "wave-digest",
        }),
        resources: Object.freeze([]),
      });
    },
    resolveCaptureBinding: () => Object.freeze({ kind: "not-binding" as const }),
    openEvidenceSession: () => Object.freeze({
      liveInputs: Object.freeze({
        providerState: (async function* () {})(),
        nativeEvents: (async function* () {})(),
      }),
      ingest: () => {},
      seal: async function* () {},
      abort: async () => {},
    }),
    async *observeControl() {},
  });
}

type SelectionCorrelationRow = Readonly<{
  properties: Readonly<{
    source?: Readonly<{ const: string }>;
    requested?: Readonly<{ const: string }>;
    selected: Readonly<{ const: string }>;
    harness: Readonly<{ const: string }>;
    topology?: Readonly<{ properties: Readonly<{ topology: Readonly<{ enum: readonly string[] }> }> }>;
    fallbackReason?: Readonly<{ const?: string; enum?: readonly string[] }>;
  }>;
}>;

function selectionCorrelationSchemas(): readonly [
  Readonly<{ allOf: readonly [Readonly<{ oneOf: readonly SelectionCorrelationRow[] }>] }>,
  Readonly<{ allOf: readonly [Readonly<{ oneOf: readonly SelectionCorrelationRow[] }>] }>,
] {
  return SELECTION_OUTCOME_SCHEMA_V1.oneOf as unknown as ReturnType<typeof selectionCorrelationSchemas>;
}

describe("swarm driver closed vocabulary and immutable values", () => {
  test("publishes the exact closed vocabulary", () => {
    expect(HARNESS_VALUES).toEqual(["claude", "codex", "kiro", "kiro-ide"]);
    expect(REQUESTED_DRIVER_VALUES).toEqual([
      "auto",
      "claude-agent-teams",
      "claude-ultracode",
      "codex-ultra",
      "kiro-subagent",
    ]);
    expect(NATIVE_DRIVER_VALUES).toHaveLength(4);
    expect(FLOOR_DRIVER_VALUES).toEqual(["claude-task-floor", "codex-exec-floor", "kiro-subagent-floor"]);
    expect(TOPOLOGY_VALUES).toEqual(["coordinated", "independent", "unknown"]);
    expect(FALLBACK_REASON_VALUES).toHaveLength(7);
    expect(CAPABILITY_DIAGNOSTIC_CODE_VALUES).toContain("CAPABILITY_PROBE_FAILED");
  });

  test("NativeDriverValue owns provider support and is frozen", () => {
    const claude = NativeDriverValue.from("claude-agent-teams");
    const kiro = NativeDriverValue.from("kiro-subagent");
    expect(claude.supports("claude")).toBe(true);
    expect(claude.supports("codex")).toBe(false);
    expect(kiro.supports("kiro")).toBe(true);
    expect(kiro.supports("kiro-ide")).toBe(true);
    expect(claude.toJSON()).toBe("claude-agent-teams");
    expect(Object.isFrozen(claude)).toBe(true);
    expect(NativeDriverValue.parse("auto").type).toBe("err");
  });

  test("value and topology collections expose canonical behavior and reject malformed signals", () => {
    expect(NativeDriverValue.values().map((value) => value.id)).toEqual([...NATIVE_DRIVER_VALUES]);

    const malformedSignals = [
      null,
      { unit: "alpha", kind: "shared-task", extension: true },
      { unit: "", kind: "shared-task" },
    ];
    for (const signal of malformedSignals) {
      expect(TopologySignalCollection.build(["alpha", "beta"], [signal]).type).toBe("err");
    }

    const collection = okValue(
      TopologySignalCollection.build(["alpha", "beta"], [{ unit: "alpha", kind: "shared-task" }]),
    );
    const decision = TopologyDecision.classify(collection);
    expect(collection.units()).toEqual(["alpha", "beta"]);
    expect(decision.diagnosticCodes()).toEqual(["coordination-signal"]);
  });

  test("DriverRequest returns only redacted source-specific fields", () => {
    const defaultRequest = DriverRequest.default();
    const legacyRequest = DriverRequest.fromLegacyEnvironment("enabled");
    expect(defaultRequest.toRedactedJSON()).toEqual({ source: "default", requested: "auto" });
    expect(legacyRequest.toRedactedJSON()).toEqual({ source: "legacy-env", rawValueClass: "enabled" });
    expect(legacyRequest.isLegacy()).toBe(true);
    expect(Object.isFrozen(legacyRequest)).toBe(true);
    expect(JSON.stringify(legacyRequest)).not.toContain("AMADEUS_USE_SWARM");
  });
});

describe("probe, capability, and registration contracts", () => {
  test("available probe preserves an immutable binding reference", () => {
    const binding = {
      schemaVersion: 1,
      driver: "codex-ultra",
      modeIdentifier: "codex-ultra-v1:model",
      resolvedModelId: "model",
      seedDigest: "a".repeat(64),
      finalDigest: "b".repeat(64),
    } as const;
    const probe = okValue(
      ProbeResult.build({
        status: "available",
        reason: "none",
        modeIdentifier: binding.modeIdentifier,
        binding,
      }),
    );

    expect(probe.binding).toEqual(binding);
    expect(probe.binding).not.toBe(binding);
    expect(Object.isFrozen(probe.binding)).toBe(true);
  });

  test("rejects a probe binding whose mode does not match the probe", () => {
    expect(
      ProbeResult.build({
        status: "available",
        reason: "none",
        modeIdentifier: "codex-ultra-v1:model-a",
        binding: {
          schemaVersion: 1,
          driver: "codex-ultra",
          modeIdentifier: "codex-ultra-v1:model-b",
          resolvedModelId: "model-b",
          seedDigest: "a".repeat(64),
          finalDigest: "b".repeat(64),
        },
      }).type,
    ).toBe("err");
  });

  test("rejects a native selection whose driver does not match the probe binding", () => {
    const probe = okValue(
      ProbeResult.build({
        status: "available",
        reason: "none",
        modeIdentifier: "kiro-subagent",
        binding: {
          schemaVersion: 1,
          driver: "kiro-subagent",
          modeIdentifier: "kiro-subagent",
          seedDigest: "a".repeat(64),
          finalDigest: "b".repeat(64),
        },
      }),
    );

    expect(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "none",
        capabilityDetails: [],
        probe,
      }).type,
    ).toBe("err");
  });

  test("rejects a binding on an unavailable probe", () => {
    expect(
      ProbeResult.build({
        status: "unavailable",
        reason: "native-surface-unavailable",
        modeIdentifier: "kiro-subagent",
        binding: {
          schemaVersion: 1,
          driver: "kiro-subagent",
          modeIdentifier: "kiro-subagent",
          seedDigest: "a".repeat(64),
          finalDigest: "b".repeat(64),
        },
      }).type,
    ).toBe("err");
  });

  test("rejects probe bindings whose digests are not lowercase SHA-256 hex", () => {
    const binding = {
      schemaVersion: 1,
      driver: "kiro-subagent",
      modeIdentifier: "kiro-subagent",
      seedDigest: "a".repeat(64),
      finalDigest: "b".repeat(64),
    } as const;
    const invalid = [
      { ...binding, seedDigest: "a".repeat(63) },
      { ...binding, seedDigest: "A".repeat(64) },
      { ...binding, finalDigest: "g".repeat(64) },
    ];

    for (const candidate of invalid) {
      expect(
        ProbeResult.build({
          status: "available",
          reason: "none",
          modeIdentifier: candidate.modeIdentifier,
          binding: candidate,
        }).type,
      ).toBe("err");
    }
  });

  test("requires an exact versioned Codex binding mode and resolved model", () => {
    const common = {
      schemaVersion: 1,
      driver: "codex-ultra",
      seedDigest: "a".repeat(64),
      finalDigest: "b".repeat(64),
    } as const;
    const invalid = [
      { ...common, modeIdentifier: "", resolvedModelId: "model" },
      { ...common, modeIdentifier: "codex-ultra", resolvedModelId: "model" },
      { ...common, modeIdentifier: "codex-ultra-v1:model" },
      { ...common, modeIdentifier: "codex-ultra-v1:model", resolvedModelId: "other-model" },
      { ...common, modeIdentifier: "codex-ultra-v1:", resolvedModelId: "" },
    ];

    for (const binding of invalid) {
      expect(
        ProbeResult.build({
          status: "available",
          reason: "none",
          modeIdentifier: binding.modeIdentifier,
          binding,
        }).type,
      ).toBe("err");
    }
  });

  test("rejects an empty resolved model for every probe binding", () => {
    expect(
      ProbeResult.build({
        status: "available",
        reason: "none",
        modeIdentifier: "agent-teams",
        binding: {
          schemaVersion: 1,
          driver: "claude-agent-teams",
          modeIdentifier: "agent-teams",
          resolvedModelId: "",
          seedDigest: "a".repeat(64),
          finalDigest: "b".repeat(64),
        },
      }).type,
    ).toBe("err");
  });

  test("roundtrips a probe binding through the selection projection", () => {
    const probe = okValue(
      ProbeResult.build({
        status: "available",
        reason: "none",
        modeIdentifier: "codex-ultra-v1:model",
        binding: {
          schemaVersion: 1,
          driver: "codex-ultra",
          modeIdentifier: "codex-ultra-v1:model",
          resolvedModelId: "model",
          seedDigest: "a".repeat(64),
          finalDigest: "b".repeat(64),
        },
      }),
    );
    const outcome = okValue(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "none",
        capabilityDetails: [],
        probe,
      }),
    );
    const projection = SelectionOutcomeProjection.fromOutcome(outcome);
    const parsed = okValue(SelectionOutcomeProjection.parse(JSON.parse(projection.canonicalJSON())));

    expect((parsed.toJSON() as RedactedNativeSelection).probe.binding).toEqual(probe.binding);
    expect(Object.isFrozen((parsed.toJSON() as RedactedNativeSelection).probe.binding)).toBe(true);
    const redacted = outcome.toRedactedJSON() as RedactedNativeSelection;
    expect(SelectionOutcomeProjection.parse({
      ...redacted,
      probe: {
        ...redacted.probe,
        binding: {
          ...redacted.probe.binding,
          modeIdentifier: "codex-ultra-v1:other-model",
          resolvedModelId: "other-model",
        },
      },
    }).type).toBe("err");
  });

  test("rejects unknown and secret-like probe binding fields without echoing values", () => {
    const baseline = okValue(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "none",
        capabilityDetails: [],
        probe: okValue(
          ProbeResult.build({
            status: "available",
            reason: "none",
            modeIdentifier: "codex-ultra-v1:model",
            binding: {
              schemaVersion: 1,
              driver: "codex-ultra",
              modeIdentifier: "codex-ultra-v1:model",
              resolvedModelId: "model",
              seedDigest: "a".repeat(64),
              finalDigest: "b".repeat(64),
            },
          }),
        ),
      }),
    ).toRedactedJSON() as RedactedNativeSelection;
    const unknown = SelectionOutcomeProjection.parse({
      ...baseline,
      probe: { ...baseline.probe, binding: { ...baseline.probe.binding, extension: true } },
    });
    const secret = SelectionOutcomeProjection.parse({
      ...baseline,
      probe: { ...baseline.probe, binding: { ...baseline.probe.binding, providerToken: "do-not-echo" } },
    });

    expect(unknown).toEqual({
      type: "err",
      error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.probe.binding.extension" },
    });
    expect(secret).toEqual({
      type: "err",
      error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.probe.binding.providerToken" },
    });
    expect(JSON.stringify(secret)).not.toContain("do-not-echo");
  });

  test("rejects contradictory probe status/reason and failed available checks", () => {
    expect(ProbeResult.build({ status: "available", reason: "cli-unavailable" }).type).toBe("err");
    expect(ProbeResult.build({ status: "unavailable", reason: "none" }).type).toBe("err");
    expect(
      ProbeResult.build({
        status: "available",
        reason: "none",
        checks: [{ name: "cli", ok: false, diagnosticCode: "CLI_UNAVAILABLE" }],
      }).type,
    ).toBe("err");
  });

  test("CapabilitySet rejects missing, duplicate, and extra rows", () => {
    const probe = availableProbe();
    expect(CapabilitySet.build(["codex-ultra"], []).type).toBe("err");
    expect(
      CapabilitySet.build(
        ["codex-ultra"],
        [
          { driver: "codex-ultra", result: probe },
          { driver: "codex-ultra", result: probe },
        ],
      ).type,
    ).toBe("err");
    expect(CapabilitySet.build(["codex-ultra"], [{ driver: "kiro-subagent", result: probe }]).type).toBe("err");
    expect(CapabilitySet.build(["codex-ultra", "codex-ultra"], []).type).toBe("err");

    const canonical = okValue(CapabilitySet.build(["codex-ultra"], [{ driver: "codex-ultra", result: probe }]));
    expect(canonical.rows()).toEqual([{ driver: "codex-ultra", result: probe }]);
  });

  test("probe and fallback defensive branches reject invalid checks and expose canonical causes", () => {
    expect(
      ProbeResult.build({
        status: "unavailable",
        reason: "cli-unavailable",
        checks: [{ name: "unknown", ok: false, diagnosticCode: "CLI_UNAVAILABLE" } as unknown as ProbeCheck],
      }).type,
    ).toBe("err");

    const causes = FallbackCauseCollection.build([
      { driver: "codex-ultra", reason: "cli-unavailable", diagnosticCodes: ["CLI_UNAVAILABLE"] },
      { driver: "codex-ultra", reason: "cli-unavailable", diagnosticCodes: ["CAPABILITY_PROBE_FAILED"] },
    ]);
    expect(causes.values()).toHaveLength(2);
  });

  test("registration set fixes three providers and four native drivers", () => {
    const registrations = [
      registration({
        provider: "claude",
        drivers: ["claude-agent-teams", "claude-ultracode"],
        harnesses: ["claude"],
        slot: unavailableSlot,
      }),
      registration({ provider: "codex", drivers: ["codex-ultra"], harnesses: ["codex"], slot: unavailableSlot }),
      registration({
        provider: "kiro",
        drivers: ["kiro-subagent"],
        harnesses: ["kiro", "kiro-ide"],
        slot: unavailableSlot,
      }),
    ];
    const set = okValue(DriverRegistrationSet.build(registrations));
    expect(set.registrations().map((entry) => entry.provider)).toEqual(["claude", "codex", "kiro"]);
    expect(set.forDriver("claude-ultracode").provider).toBe("claude");
    expect(set.forDriver("kiro-subagent").supports("kiro-ide")).toBe(true);
  });

  test("registration rejects ownership, harness mapping, and incomplete sets", () => {
    expect(
      DriverRegistration.build({
        provider: "codex",
        drivers: ["kiro-subagent"],
        harnesses: ["codex"],
        slot: unavailableSlot,
      }).type,
    ).toBe("err");
    expect(
      DriverRegistration.build({
        provider: "kiro",
        drivers: ["kiro-subagent"],
        harnesses: ["kiro"],
        slot: unavailableSlot,
      }).type,
    ).toBe("err");
    expect(DriverRegistrationSet.build([]).type).toBe("err");
  });

  test("available registrations resolve one adapter per native driver", () => {
    const claude = registration({
      provider: "claude",
      drivers: ["claude-agent-teams", "claude-ultracode"],
      harnesses: ["claude"],
      slot: {
        kind: "available",
        adapters: [
          adapter("claude-agent-teams", ["claude"]),
          adapter("claude-ultracode", ["claude"]),
        ],
      },
    });
    const codex = registration({
      provider: "codex",
      drivers: ["codex-ultra"],
      harnesses: ["codex"],
      slot: { kind: "available", adapters: [adapter("codex-ultra", ["codex"])] },
    });
    const kiro = registration({
      provider: "kiro",
      drivers: ["kiro-subagent"],
      harnesses: ["kiro", "kiro-ide"],
      slot: { kind: "available", adapters: [adapter("kiro-subagent", ["kiro", "kiro-ide"])] },
    });
    const set = okValue(DriverRegistrationSet.build([claude, codex, kiro]));
    expect(claude.slot.kind).toBe("available");
    if (claude.slot.kind === "available") {
      expect(claude.slot.adapterSet.drivers()).toEqual(["claude-agent-teams", "claude-ultracode"]);
      expect(claude.slot.adapterSet.forDriver("claude-agent-teams")?.driver).toBe("claude-agent-teams");
      expect(claude.slot.adapterSet.forDriver("claude-ultracode")?.driver).toBe("claude-ultracode");
    }
    expect(set.forDriver("codex-ultra").provider).toBe("codex");
    expect(set.forDriver("kiro-subagent").provider).toBe("kiro");
  });

  test("available registration rejects missing, duplicate, foreign, and support-mismatched adapters", () => {
    const base = {
      provider: "claude" as const,
      drivers: ["claude-agent-teams", "claude-ultracode"] as const,
      harnesses: ["claude"] as const,
    };
    expect(
      DriverRegistration.build({
        ...base,
        slot: { kind: "available", adapters: [adapter("claude-agent-teams", ["claude"])] },
      }).type,
    ).toBe("err");
    expect(
      DriverRegistration.build({
        ...base,
        slot: {
          kind: "available",
          adapters: [
            adapter("claude-agent-teams", ["claude"]),
            adapter("claude-agent-teams", ["claude"]),
          ],
        },
      }).type,
    ).toBe("err");
    expect(
      DriverRegistration.build({
        ...base,
        slot: {
          kind: "available",
          adapters: [adapter("claude-agent-teams", ["claude"]), adapter("codex-ultra", ["codex"])],
        },
      }).type,
    ).toBe("err");
    expect(
      DriverRegistration.build({
        ...base,
        slot: {
          kind: "available",
          adapters: [
            adapter("claude-agent-teams", ["claude"]),
            adapter("claude-ultracode", ["claude", "codex"]),
          ],
        },
      }).type,
    ).toBe("err");
    expect(
      DriverRegistration.build({
        ...base,
        slot: {
          kind: "available",
          adapters: [
            { ...adapter("claude-agent-teams", ["claude"]), provider: "codex" },
            adapter("claude-ultracode", ["claude"]),
          ],
        },
      }).type,
    ).toBe("err");
  });

  test("adapter sets derive exact provider ownership instead of trusting caller coverage", () => {
    expect(DriverAdapterSet.build("claude", []).type).toBe("err");
    expect(
      DriverAdapterSet.build("claude", [adapter("claude-agent-teams", ["claude"])]).type,
    ).toBe("err");
    expect(
      DriverAdapterSet.build("claude", [adapter("codex-ultra", ["codex"])]).type,
    ).toBe("err");
  });

  test("registration rejects a bogus slot kind even with the unavailable diagnostic", () => {
    expect(
      DriverRegistration.build({
        provider: "codex",
        drivers: ["codex-ultra"],
        harnesses: ["codex"],
        slot: {
          kind: "bogus",
          diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED",
        },
      } as unknown as DriverRegistrationInput).type,
    ).toBe("err");
  });

  test("registration set rejects structural fakes and rebuilds behavior from validated tuples", () => {
    const codex = registration({
      provider: "codex",
      drivers: ["codex-ultra"],
      harnesses: ["codex"],
      slot: unavailableSlot,
    });
    const kiro = registration({
      provider: "kiro",
      drivers: ["kiro-subagent"],
      harnesses: ["kiro", "kiro-ide"],
      slot: unavailableSlot,
    });
    const fakeClaude = {
      schemaVersion: 1,
      provider: "claude",
      drivers: ["claude-agent-teams", "claude-ultracode"],
      harnesses: ["codex"],
      slot: unavailableSlot,
      owns: () => true,
      supports: () => true,
    } as unknown as DriverRegistrationValue;
    expect(DriverRegistrationSet.build([fakeClaude, codex, kiro]).type).toBe("err");

    const lyingClaude = {
      ...fakeClaude,
      harnesses: ["claude"],
      owns: () => false,
      supports: () => false,
    } as unknown as DriverRegistrationValue;
    const rebuilt = okValue(DriverRegistrationSet.build([lyingClaude, codex, kiro]));
    expect(rebuilt.forDriver("claude-agent-teams").owns("claude-agent-teams")).toBe(true);
    expect(rebuilt.forDriver("claude-agent-teams").supports("claude")).toBe(true);
  });

  test("registration set revalidates available adapter-set exact coverage", () => {
    const teams = adapter("claude-agent-teams", ["claude"]);
    const fakeClaude = {
      schemaVersion: 1,
      provider: "claude",
      drivers: ["claude-agent-teams", "claude-ultracode"],
      harnesses: ["claude"],
      slot: {
        kind: "available",
        adapterSet: {
          adapters: () => [teams],
          drivers: () => ["claude-agent-teams", "claude-ultracode"],
          forDriver: () => teams,
        },
      },
      owns: () => true,
      supports: () => true,
    } as unknown as DriverRegistrationValue;
    const codex = registration({
      provider: "codex",
      drivers: ["codex-ultra"],
      harnesses: ["codex"],
      slot: unavailableSlot,
    });
    const kiro = registration({
      provider: "kiro",
      drivers: ["kiro-subagent"],
      harnesses: ["kiro", "kiro-ide"],
      slot: unavailableSlot,
    });
    expect(DriverRegistrationSet.build([fakeClaude, codex, kiro]).type).toBe("err");
  });

  test("registration builders reject malformed public-boundary structures", () => {
    expect(
      DriverAdapterSet.build("codex", [null as unknown as DriverAdapter]).type,
    ).toBe("err");
    expect(
      DriverAdapterSet.build("plugin" as unknown as Parameters<typeof DriverAdapterSet.build>[0], []).type,
    ).toBe("err");

    const malformedInputs = [
      { provider: "codex", drivers: null, harnesses: ["codex"], slot: unavailableSlot },
      { provider: "codex", drivers: ["codex-ultra"], harnesses: null, slot: unavailableSlot },
      { provider: "codex", drivers: ["codex-ultra"], harnesses: ["codex"], slot: null },
      {
        provider: "codex",
        drivers: ["codex-ultra"],
        harnesses: ["codex"],
        slot: { kind: "available", adapters: null },
      },
    ];
    for (const input of malformedInputs) {
      expect(DriverRegistration.build(input as unknown as DriverRegistrationInput).type).toBe("err");
    }

    const codex = registration({
      provider: "codex",
      drivers: ["codex-ultra"],
      harnesses: ["codex"],
      slot: unavailableSlot,
    });
    const kiro = registration({
      provider: "kiro",
      drivers: ["kiro-subagent"],
      harnesses: ["kiro", "kiro-ide"],
      slot: unavailableSlot,
    });
    const claude = registration({
      provider: "claude",
      drivers: ["claude-agent-teams", "claude-ultracode"],
      harnesses: ["claude"],
      slot: unavailableSlot,
    });

    const malformedRegistrations = [
      {},
      { ...codex, schemaVersion: 2 },
      { ...codex, provider: "plugin" },
      { ...codex, drivers: ["plugin-driver"] },
      { ...codex, harnesses: ["plugin-harness"] },
      { ...codex, slot: { kind: "bogus" } },
      { ...codex, slot: { kind: "available", adapterSet: {} } },
      {
        ...codex,
        slot: {
          kind: "available",
          adapterSet: {
            adapters(): never {
              throw new Error("expected test failure");
            },
          },
        },
      },
    ];
    for (const malformed of malformedRegistrations) {
      expect(
        DriverRegistrationSet.build([malformed as unknown as DriverRegistrationValue, claude, kiro]).type,
      ).toBe("err");
    }
    expect(DriverRegistrationSet.build([claude, claude, kiro]).type).toBe("err");
  });
});

describe("selection schema v1 and redaction", () => {
  test("roundtrips canonical native selection bytes and digest", () => {
    const outcome = okValue(SelectionOutcome.native({
      source: "default",
      requested: "auto",
      selected: "codex-ultra",
      harness: "codex",
      topology: unknownTopology(),
      fallbackReason: "none",
      capabilityDetails: [],
      probe: availableProbe(),
    }));
    const projection = SelectionOutcomeProjection.fromOutcome(outcome);
    const parsed = okValue(SelectionOutcomeProjection.parse(JSON.parse(projection.canonicalJSON())));
    expect(parsed.canonicalJSON()).toBe(projection.canonicalJSON());
    expect(parsed.digest()).toBe(projection.digest());
    expect(parsed.toJSON()).toEqual(outcome.toRedactedJSON());
    expect(projection.digest()).toMatch(/^[0-9a-f]{64}$/);
  });

  test("projection parser rejects malformed nested and variant fields", () => {
    const native = okValue(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "none",
        capabilityDetails: [],
        probe: availableProbe(),
      }),
    ).toRedactedJSON() as RedactedNativeSelection;
    const floor = okValue(
      SelectionOutcome.floor({
        source: "default",
        selected: "codex-exec-floor",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "cli-unavailable",
        capabilityDetails: ["CLI_UNAVAILABLE"],
      }),
    ).toRedactedJSON();
    const malformed = [
      { ...native, probe: { ...native.probe, modeIdentifier: 1 } },
      {
        ...native,
        topology: { topology: "unknown", reason: "no-signal", signals: [{ unit: "alpha", kind: "bogus" }] },
      },
      { ...native, topology: { topology: "unknown", reason: "bogus", signals: [] } },
      {
        ...native,
        probe: {
          status: "available",
          reason: "none",
          checks: [{ name: "cli", ok: false, diagnosticCode: "CLI_UNAVAILABLE" }],
        },
      },
      { ...floor, fallbackReason: "none" },
      { ...SelectionOutcome.codexFloor(true).toRedactedJSON(), legacyEnabled: "yes" },
    ];
    for (const value of malformed) expect(SelectionOutcomeProjection.parse(value).type).toBe("err");
  });

  test("schema declares every variant closed", () => {
    expect(SELECTION_OUTCOME_SCHEMA_V1.oneOf).toHaveLength(11);
    for (const variant of SELECTION_OUTCOME_SCHEMA_V1.oneOf) {
      expect(variant.additionalProperties).toBe(false);
    }
  });

  test("canonicalizes top-level and nested key order for every selection variant", () => {
    const native = okValue(SelectionOutcome.native({
      source: "default",
      requested: "auto",
      selected: "codex-ultra",
      harness: "codex",
      topology: unknownTopology(),
      fallbackReason: "none",
      capabilityDetails: [],
      probe: availableProbe(),
    }));
    const floor = okValue(SelectionOutcome.floor({
      source: "default",
      selected: "codex-exec-floor",
      harness: "codex",
      topology: unknownTopology(),
      fallbackReason: "cli-unavailable",
      capabilityDetails: ["CLI_UNAVAILABLE"],
    }));
    const outcomes = [
      native,
      floor,
      SelectionOutcome.claudeDynamicWorkflow(),
      SelectionOutcome.claudeDegradedFloor(),
      SelectionOutcome.claudeDisabledFloor(),
      SelectionOutcome.codexFloor(true),
      SelectionOutcome.codexFloor(false),
      SelectionOutcome.kiroFloor("kiro", true),
      SelectionOutcome.kiroFloor("kiro", false),
      SelectionOutcome.kiroFloor("kiro-ide", true),
      SelectionOutcome.kiroFloor("kiro-ide", false),
    ];

    for (const outcome of outcomes) {
      const expected = SelectionOutcomeProjection.fromOutcome(outcome);
      const reordered = reverseObjectKeys(outcome.toRedactedJSON());
      const actual = okValue(SelectionOutcomeProjection.parse(reordered));
      expect(actual.canonicalJSON()).toBe(expected.canonicalJSON());
      expect(actual.digest()).toBe(expected.digest());
    }
  });

  test("canonicalizes unordered diagnostic, probe-check, and topology-signal collections", () => {
    const signals = okValue(
      TopologySignalCollection.build(
        ["alpha", "beta"],
        [
          { unit: "alpha", kind: "shared-task" },
          { unit: "beta", kind: "iterative-convergence" },
        ],
      ),
    );
    const probe = okValue(
      ProbeResult.build({
        status: "available",
        reason: "none",
        checks: [
          { name: "cli", ok: true, diagnosticCode: "CLI_AVAILABLE" },
          { name: "auth", ok: true, diagnosticCode: "AUTHENTICATION_AVAILABLE" },
        ],
      }),
    );
    const outcome = okValue(SelectionOutcome.native({
      source: "default",
      requested: "auto",
      selected: "codex-ultra",
      harness: "codex",
      topology: TopologyDecision.classify(signals),
      fallbackReason: "none",
      capabilityDetails: ["CLI_UNAVAILABLE", "TRUST_AVAILABLE"],
      probe,
    }));
    const expected = SelectionOutcomeProjection.fromOutcome(outcome);
    const equivalent = structuredClone(outcome.toRedactedJSON()) as unknown as {
      capabilityDetails: CapabilityDiagnosticCode[];
      probe: { checks: ProbeCheck[] };
      topology: { signals: TopologySignal[] };
    };
    equivalent.capabilityDetails = ["TRUST_AVAILABLE", "CLI_UNAVAILABLE", "CLI_UNAVAILABLE"];
    equivalent.probe.checks = [
      equivalent.probe.checks[1],
      equivalent.probe.checks[0],
      equivalent.probe.checks[0],
    ];
    equivalent.topology.signals = [
      equivalent.topology.signals[1],
      equivalent.topology.signals[0],
      equivalent.topology.signals[0],
    ];

    const actual = okValue(SelectionOutcomeProjection.parse(equivalent));
    expect(actual.canonicalJSON()).toBe(expected.canonicalJSON());
    expect(actual.digest()).toBe(expected.digest());
  });

  test("rejects unknown and secret-like fields by path without echoing values", () => {
    const valid = SelectionOutcome.claudeDynamicWorkflow().toRedactedJSON();
    const unknown = SelectionOutcomeProjection.parse({ ...valid, extension: "value" });
    const secret = SelectionOutcomeProjection.parse({ ...valid, providerToken: "do-not-echo" });
    expect(unknown).toEqual({ type: "err", error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.extension" } });
    expect(secret).toEqual({ type: "err", error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.providerToken" } });
    expect(JSON.stringify(secret)).not.toContain("do-not-echo");
  });

  test("reports unknown and secret-like paths deterministically", () => {
    const valid = SelectionOutcome.claudeDynamicWorkflow().toRedactedJSON();
    const unknownA = SelectionOutcomeProjection.parse({ zExtension: 1, ...valid, aExtension: 2 });
    const unknownB = SelectionOutcomeProjection.parse({ aExtension: 2, ...valid, zExtension: 1 });
    const secretA = SelectionOutcomeProjection.parse({ zToken: "z", ...valid, aSecret: "a" });
    const secretB = SelectionOutcomeProjection.parse({ aSecret: "a", ...valid, zToken: "z" });
    expect(unknownA).toEqual(unknownB);
    expect(unknownA).toEqual({
      type: "err",
      error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.aExtension" },
    });
    expect(secretA).toEqual(secretB);
    expect(secretA).toEqual({
      type: "err",
      error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.aSecret" },
    });
  });

  test("reports unordered topology-signal diagnostics independently of signal order", () => {
    const valid = okValue(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: classifiedTopology([{ unit: "alpha", kind: "shared-task" }]),
        fallbackReason: "none",
        capabilityDetails: [],
        probe: availableProbe(),
      }),
    ).toRedactedJSON();
    const unknownSignals = [
      { unit: "beta", kind: "shared-task", zExtension: 1 },
      { unit: "alpha", kind: "direct-message", aExtension: 2 },
    ];
    const secretSignals = [
      { unit: "beta", kind: "shared-task", zToken: "do-not-echo-z" },
      { unit: "alpha", kind: "direct-message", aSecret: "do-not-echo-a" },
    ];
    const parseSignals = (signals: readonly unknown[]) =>
      SelectionOutcomeProjection.parse({
        ...valid,
        topology: { topology: "coordinated", reason: "coordination-signal", signals },
      });

    const unknownA = parseSignals(unknownSignals);
    const unknownB = parseSignals([...unknownSignals].reverse());
    const secretA = parseSignals(secretSignals);
    const secretB = parseSignals([...secretSignals].reverse());
    expect(unknownA).toEqual(unknownB);
    expect(unknownA).toEqual({
      type: "err",
      error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.topology.signals[*].aExtension" },
    });
    expect(secretA).toEqual(secretB);
    expect(secretA).toEqual({
      type: "err",
      error: { code: "REDACTION_SCHEMA_REJECTED", fieldPath: "$.topology.signals[*].aSecret" },
    });
    expect(JSON.stringify([secretA, secretB])).not.toContain("do-not-echo");
  });

  test("public factories reject correlated invalid selection states", () => {
    const topology = unknownTopology();
    const probe = availableProbe();
    const invalidNativeInputs = [
      {
        source: "default",
        requested: "codex-ultra",
        selected: "codex-ultra",
        harness: "codex",
        topology,
        fallbackReason: "none",
        capabilityDetails: [],
        probe,
      },
      {
        source: "new-env",
        requested: "codex-ultra",
        selected: "kiro-subagent",
        harness: "kiro",
        topology,
        fallbackReason: "none",
        capabilityDetails: [],
        probe,
      },
      {
        source: "new-env",
        requested: "auto",
        selected: "kiro-subagent",
        harness: "codex",
        topology,
        fallbackReason: "none",
        capabilityDetails: [],
        probe,
      },
      {
        source: "new-env",
        requested: "codex-ultra",
        selected: "codex-ultra",
        harness: "codex",
        topology,
        fallbackReason: "cli-unavailable",
        capabilityDetails: ["CLI_UNAVAILABLE"],
        probe,
      },
      {
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology,
        fallbackReason: "none",
        capabilityDetails: [],
        probe: okValue(
          ProbeResult.build({
            status: "unavailable",
            reason: "cli-unavailable",
            checks: [{ name: "cli", ok: false, diagnosticCode: "CLI_UNAVAILABLE" }],
          }),
        ),
      },
      {
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology,
        fallbackReason: "none",
        capabilityDetails: [],
        probe: { ...probe, modeIdentifier: 1 },
      },
    ];
    for (const input of invalidNativeInputs) {
      expect(SelectionOutcome.native(input as unknown as NativeSelectionInput).type).toBe("err");
    }
    expect(
      SelectionOutcome.floor({
        source: "new-env",
        selected: "kiro-subagent-floor",
        harness: "codex",
        topology,
        fallbackReason: "cli-unavailable",
        capabilityDetails: ["CLI_UNAVAILABLE"],
      } as unknown as FloorSelectionInput).type,
    ).toBe("err");
  });

  test("auto native fallback follows harness, topology, and candidate position", () => {
    const probe = availableProbe();
    const coordinated = classifiedTopology([{ unit: "alpha", kind: "shared-task" }]);
    const independent = classifiedTopology([{ unit: "alpha", kind: "independent-fanout" }]);
    const unknown = unknownTopology();
    const valid = [
      { selected: "codex-ultra", harness: "codex", topology: unknown, fallbackReason: "none", details: [] },
      { selected: "kiro-subagent", harness: "kiro", topology: unknown, fallbackReason: "none", details: [] },
      { selected: "kiro-subagent", harness: "kiro-ide", topology: unknown, fallbackReason: "none", details: [] },
      { selected: "claude-ultracode", harness: "claude", topology: independent, fallbackReason: "none", details: [] },
      { selected: "claude-ultracode", harness: "claude", topology: unknown, fallbackReason: "none", details: [] },
      { selected: "claude-agent-teams", harness: "claude", topology: coordinated, fallbackReason: "none", details: [] },
      {
        selected: "claude-ultracode",
        harness: "claude",
        topology: coordinated,
        fallbackReason: "cli-unavailable",
        details: ["CLI_UNAVAILABLE"],
      },
    ];
    for (const row of valid) {
      expect(
        SelectionOutcome.native({
          source: "default",
          requested: "auto",
          selected: row.selected,
          harness: row.harness,
          topology: row.topology,
          fallbackReason: row.fallbackReason,
          capabilityDetails: row.details,
          probe,
        } as unknown as NativeSelectionInput).type,
      ).toBe("ok");
    }

    const invalid = [
      { selected: "codex-ultra", harness: "codex", topology: unknown, fallbackReason: "cli-unavailable" },
      { selected: "kiro-subagent", harness: "kiro", topology: unknown, fallbackReason: "trust-unavailable" },
      {
        selected: "claude-ultracode",
        harness: "claude",
        topology: independent,
        fallbackReason: "cli-unavailable",
      },
      {
        selected: "claude-ultracode",
        harness: "claude",
        topology: unknown,
        fallbackReason: "cli-unavailable",
      },
      {
        selected: "claude-agent-teams",
        harness: "claude",
        topology: coordinated,
        fallbackReason: "cli-unavailable",
      },
      { selected: "claude-ultracode", harness: "claude", topology: coordinated, fallbackReason: "none" },
    ];
    for (const row of invalid) {
      const raw = {
        source: "default",
        requested: "auto",
        selected: row.selected,
        harness: row.harness,
        topology: row.topology,
        fallbackReason: row.fallbackReason,
        capabilityDetails: row.fallbackReason === "none" ? [] : ["CLI_UNAVAILABLE"],
        probe,
      };
      expect(SelectionOutcome.native(raw as unknown as NativeSelectionInput).type).toBe("err");
      const baseline = okValue(
        SelectionOutcome.native({
          ...raw,
          selected: "codex-ultra",
          harness: "codex",
          topology: unknown,
          fallbackReason: "none",
          capabilityDetails: [],
        } as unknown as NativeSelectionInput),
      ).toRedactedJSON();
      expect(
        SelectionOutcomeProjection.parse({
          ...baseline,
          selected: row.selected,
          harness: row.harness,
          topology: row.topology,
          fallbackReason: row.fallbackReason,
          capabilityDetails: raw.capabilityDetails,
        }).type,
      ).toBe("err");
    }
  });

  test("topology projection and factory enforce the four signal-derived classifications", () => {
    const rows = [
      [[], "unknown", "no-signal"],
      [[{ unit: "alpha", kind: "shared-task" }], "coordinated", "coordination-signal"],
      [[{ unit: "alpha", kind: "independent-fanout" }], "independent", "independent-signal"],
      [
        [
          { unit: "alpha", kind: "shared-task" },
          { unit: "beta", kind: "independent-fanout" },
        ],
        "coordinated",
        "coordination-precedence",
      ],
    ] as const;
    for (const [signals, topology, reason] of rows) {
      const decision = classifiedTopology(signals);
      expect([decision.topology, decision.reason]).toEqual([topology, reason]);
      const outcome = okValue(
        SelectionOutcome.native({
          source: "default",
          requested: "auto",
          selected: "codex-ultra",
          harness: "codex",
          topology: decision,
          fallbackReason: "none",
          capabilityDetails: [],
          probe: availableProbe(),
        }),
      );
      expect(SelectionOutcomeProjection.parse(outcome.toRedactedJSON()).type).toBe("ok");
    }

    const forged = {
      ...unknownTopology(),
      topology: "unknown",
      reason: "coordination-signal",
    } as unknown as TopologyDecision;
    expect(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: forged,
        fallbackReason: "none",
        capabilityDetails: [],
        probe: availableProbe(),
      }).type,
    ).toBe("err");

    const valid = okValue(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "none",
        capabilityDetails: [],
        probe: availableProbe(),
      }),
    ).toRedactedJSON();
    expect(
      SelectionOutcomeProjection.parse({
        ...valid,
        topology: { topology: "unknown", reason: "coordination-signal", signals: [] },
      }).type,
    ).toBe("err");
    expect(
      SelectionOutcomeProjection.parse({
        ...valid,
        topology: {
          topology: "unknown",
          reason: "no-signal",
          signals: [{ unit: "alpha", kind: "shared-task" }],
        },
      }).type,
    ).toBe("err");

    const emptyUnitTopology = {
      ...classifiedTopology([{ unit: "alpha", kind: "shared-task" }]),
      signals: [{ unit: "", kind: "shared-task" }],
    } as unknown as TopologyDecision;
    expect(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: emptyUnitTopology,
        fallbackReason: "none",
        capabilityDetails: [],
        probe: availableProbe(),
      }).type,
    ).toBe("err");
    expect(
      SelectionOutcomeProjection.parse({
        ...valid,
        topology: {
          topology: "coordinated",
          reason: "coordination-signal",
          signals: [{ unit: "", kind: "shared-task" }],
        },
      }).type,
    ).toBe("err");

    const nativeSchema = SELECTION_OUTCOME_SCHEMA_V1.oneOf[0] as unknown as {
      properties: { topology: { properties: { signals: { items: { properties: { unit: unknown } } } } } };
    };
    expect(nativeSchema.properties.topology.properties.signals.items.properties.unit).toEqual({
      type: "string",
      minLength: 1,
    });
  });

  test("raw projections reject every correlated invalid selection state", () => {
    const native = okValue(
      SelectionOutcome.native({
        source: "default",
        requested: "auto",
        selected: "codex-ultra",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "none",
        capabilityDetails: [],
        probe: availableProbe(),
      }),
    ).toRedactedJSON();
    const floor = okValue(
      SelectionOutcome.floor({
        source: "default",
        selected: "codex-exec-floor",
        harness: "codex",
        topology: unknownTopology(),
        fallbackReason: "cli-unavailable",
        capabilityDetails: ["CLI_UNAVAILABLE"],
      }),
    ).toRedactedJSON();
    const invalid = [
      { ...native, requested: "codex-ultra" },
      { ...native, source: "new-env", requested: "codex-ultra", selected: "kiro-subagent", harness: "kiro" },
      { ...native, selected: "kiro-subagent" },
      { ...native, source: "new-env", requested: "codex-ultra", fallbackReason: "cli-unavailable" },
      {
        ...native,
        probe: {
          status: "unavailable",
          reason: "cli-unavailable",
          checks: [{ name: "cli", ok: false, diagnosticCode: "CLI_UNAVAILABLE" }],
        },
      },
      { ...floor, selected: "kiro-subagent-floor" },
    ];
    for (const raw of invalid) expect(SelectionOutcomeProjection.parse(raw).type).toBe("err");
  });

  test("schema correlations are derived for all native and floor target variants", () => {
    const schemas = selectionCorrelationSchemas();
    const nativeRows = schemas[0].allOf[0].oneOf;
    const floorRows = schemas[1].allOf[0].oneOf;
    const topologySchema = (SELECTION_OUTCOME_SCHEMA_V1.oneOf[0] as unknown as {
      properties: {
        topology: {
          oneOf: readonly Readonly<{
            properties: Readonly<{
              topology: Readonly<{ const: string }>;
              reason: Readonly<{ const: string }>;
              signals: Readonly<{ allOf: readonly unknown[] }>;
            }>;
          }>[];
        };
      };
    }).properties.topology;
    expect(nativeRows).toHaveLength(17);
    expect(floorRows).toHaveLength(4);
    expect(
      topologySchema.oneOf.map((row) => [row.properties.topology.const, row.properties.reason.const]),
    ).toEqual([
      ["unknown", "no-signal"],
      ["coordinated", "coordination-signal"],
      ["independent", "independent-signal"],
      ["coordinated", "coordination-precedence"],
    ]);
    for (const row of topologySchema.oneOf) expect(row.properties.signals.allOf).toHaveLength(2);
    for (const row of nativeRows) {
      if (row.properties.source?.const === "default") expect(row.properties.requested?.const).toBe("auto");
      expect(NativeDriverValue.from(row.properties.selected.const as NativeDriver).supports(
        row.properties.harness.const as Harness,
      )).toBe(true);
    }
  });

  test("native schema encodes candidate-position fallback policy", () => {
    const nativeRows = selectionCorrelationSchemas()[0].allOf[0].oneOf;
    for (const row of nativeRows) {
      const requested = row.properties.requested?.const;
      if (requested !== undefined && requested !== "auto") {
        expect(row.properties.source?.const).toBe("new-env");
        expect(row.properties.selected.const).toBe(requested);
        expect(row.properties.fallbackReason?.const).toBe("none");
        continue;
      }
      const coordinatedClaudeFallback =
        row.properties.selected.const === "claude-ultracode" &&
        row.properties.topology?.properties.topology.enum.length === 1 &&
        row.properties.topology.properties.topology.enum[0] === "coordinated";
      if (coordinatedClaudeFallback) {
        expect(row.properties.fallbackReason?.enum).toEqual(FALLBACK_REASON_PRIORITY);
      } else {
        expect(row.properties.fallbackReason?.const).toBe("none");
      }
    }
  });

  test("rejects legacy combinations outside the compatibility table", () => {
    const invalid = {
      ...SelectionOutcome.codexFloor(true).toRedactedJSON(),
      harness: "claude",
    };
    expect(SelectionOutcomeProjection.parse(invalid).type).toBe("err");
  });
});

// Compile-time invalid-state fixtures. The function is never called; `tsc`
// verifies that every @ts-expect-error still guards a real type error.
function assertCompileTimeInvalidStates(): void {
  const topology = unknownTopology();
  const probe = availableProbe();
  const nativeInput: NativeSelectionInput = {
    source: "default",
    requested: "auto",
    selected: "codex-ultra",
    harness: "codex",
    topology,
    fallbackReason: "none",
    capabilityDetails: [],
    probe,
  };
  // @ts-expect-error selected=auto is impossible for a native outcome.
  SelectionOutcome.native({ ...nativeInput, selected: "auto" });
  // @ts-expect-error Codex is the first auto candidate and cannot carry a fallback.
  SelectionOutcome.native({ ...nativeInput, fallbackReason: "cli-unavailable" });

  const floorInput: FloorSelectionInput = {
    source: "default",
    selected: "codex-exec-floor",
    harness: "codex",
    topology,
    fallbackReason: "cli-unavailable",
    capabilityDetails: ["CLI_UNAVAILABLE"],
  };
  // @ts-expect-error a floor outcome cannot carry fallbackReason=none.
  SelectionOutcome.floor({ ...floorInput, fallbackReason: "none" });

  const invalidRequest: DriverRequestValue = {
    ...DriverRequest.default(),
    // @ts-expect-error a default request cannot carry a legacy value class.
    rawValueClass: "enabled",
  };
  void invalidRequest;

  const invalidLegacy: RedactedCodexLegacySelection = {
    ...SelectionOutcome.codexFloor(true).toRedactedJSON(),
    // @ts-expect-error Codex legacy execution cannot claim the Claude harness.
    harness: "claude",
  };
  void invalidLegacy;

  const invalidRegistration: DriverRegistrationInput = {
    // @ts-expect-error unknown providers cannot enter the static registration contract.
    provider: "plugin",
    drivers: ["codex-ultra"],
    harnesses: ["codex"],
    slot: unavailableSlot,
  };
  void invalidRegistration;

  // @ts-expect-error every adapter must provide resource, execution, capture, control, and normalize ports.
  const incompleteAdapter: DriverAdapter = {
    driver: "codex-ultra",
    provider: "codex",
    supports: (harness) => harness === "codex",
    probe: async () => availableProbe(),
  };
  void incompleteAdapter;

  // @ts-expect-error raw provider payloads are outside the closed normalized-event union.
  const invalidEvent: NormalizedDriverEvent = { kind: "raw-output", raw: "secret" };
  void invalidEvent;

  const invalidLaunch: LaunchSpec = {
    executable: "codex",
    args: [],
    cwd: "/project",
    env: {},
    // @ts-expect-error transport is a closed stdio-json or pty-interactive variant.
    transport: { kind: "stdio-json", stdin: "inherit", output: "stream-json" },
    timeoutMs: 1,
  };
  void invalidLaunch;
}

void assertCompileTimeInvalidStates;
