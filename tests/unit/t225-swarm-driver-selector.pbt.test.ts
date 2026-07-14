// covers: function:parseDriverRequest, function:classifyTopology, function:selectAutoDriver, function:SelectionOutcomeProjection
// size: small
//
// Deterministic PBT conventions:
// - PR/unit runs use fast-check's default 100 runs with a fixed seed.
// - AMADEUS_PBT_DEEP=1 (or true) raises the budget to 10,000 runs.
// - A reported shrunk counterexample must be pinned as an example-based test.

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  NATIVE_DRIVER_VALUES,
  ProbeResult,
  SelectionOutcomeProjection,
  TOPOLOGY_SIGNAL_KIND_VALUES,
  type CapabilityDiagnosticCode,
  type CapabilityRow,
  type FallbackReason,
  type Harness,
  type ProbeResult as ProbeResultValue,
  type SelectionOutcome,
  type TopologySignal,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-contract.ts";
import {
  candidateChain,
  classifyTopology,
  parseDriverRequest,
  selectAutoDriver,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-selector.ts";

const PBT_SEED = 0x68_801;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 10_000 } : { seed: PBT_SEED };
const MANIFEST = Object.freeze(["alpha", "beta", "gamma"] as const);

const harnessArb = fc.constantFrom<Harness>("claude", "codex", "kiro", "kiro-ide");
const signalArb = fc.record({
  unit: fc.constantFrom(...MANIFEST),
  kind: fc.constantFrom(...TOPOLOGY_SIGNAL_KIND_VALUES),
});
const signalsArb = fc.array(signalArb, { maxLength: 12 });
const unavailableReasonArb = fc.constantFrom<Exclude<FallbackReason, "none">>(
  "cli-unavailable",
  "authentication-unavailable",
  "native-surface-unavailable",
  "native-evidence-unavailable",
  "trust-unavailable",
  "capability-probe-failed",
);

const REASON_CODE: Readonly<Record<Exclude<FallbackReason, "none">, CapabilityDiagnosticCode>> = {
  "cli-unavailable": "CLI_UNAVAILABLE",
  "authentication-unavailable": "AUTHENTICATION_UNAVAILABLE",
  "native-surface-unavailable": "NATIVE_SURFACE_UNAVAILABLE",
  "native-evidence-unavailable": "NATIVE_EVIDENCE_UNAVAILABLE",
  "trust-unavailable": "TRUST_UNAVAILABLE",
  "capability-probe-failed": "CAPABILITY_PROBE_FAILED",
};

function okValue<T>(result: { type: "ok"; value: T } | { type: "err"; error: unknown }): T {
  if (result.type === "err") throw new Error(JSON.stringify(result.error));
  return result.value;
}

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

function transformedSignals(
  signals: readonly TopologySignal[],
  offset: number,
  duplicateEvery: number,
): TopologySignal[] {
  if (signals.length === 0) return [];
  const rotation = offset % signals.length;
  const rotated = [...signals.slice(rotation), ...signals.slice(0, rotation)];
  return rotated
    .flatMap((signal, index) => (index % duplicateEvery === 0 ? [signal, { ...signal }] : [signal]))
    .reverse();
}

function autoOutcome(
  harness: Harness,
  signals: readonly TopologySignal[],
  nativeAvailable: boolean,
  reason: Exclude<FallbackReason, "none">,
): SelectionOutcome {
  const topology = okValue(classifyTopology(MANIFEST, signals));
  const nativeCandidates = candidateChain(harness, topology).filter((driver) =>
    (NATIVE_DRIVER_VALUES as readonly string[]).includes(driver),
  );
  const capabilities: CapabilityRow[] = nativeCandidates.map((driver) => ({
    driver: driver as CapabilityRow["driver"],
    result: nativeAvailable ? available() : unavailable(reason),
  }));
  return okValue(selectAutoDriver("default", harness, topology, capabilities));
}

function projection(outcome: SelectionOutcome): Readonly<{ canonical: string; digest: string }> {
  const value = SelectionOutcomeProjection.fromOutcome(outcome);
  return { canonical: value.canonicalJSON(), digest: value.digest() };
}

describe("swarm selector properties", () => {
  test("topology is invariant under input order and exact duplicate insertion", () => {
    fc.assert(
      fc.property(signalsArb, fc.nat(), fc.integer({ min: 1, max: 5 }), (signals, offset, duplicateEvery) => {
        const manifestSnapshot = [...MANIFEST];
        const signalSnapshot = JSON.stringify(signals);
        const baseline = okValue(classifyTopology(MANIFEST, signals));
        const transformed = okValue(
          classifyTopology(MANIFEST, transformedSignals(signals, offset, duplicateEvery)),
        );

        expect(transformed.equals(baseline)).toBe(true);
        expect([...MANIFEST]).toEqual(manifestSnapshot);
        expect(JSON.stringify(signals)).toBe(signalSnapshot);
      }),
      OPTS,
    );
  });

  test("repeated selection of the same input is byte-for-byte deterministic", () => {
    fc.assert(
      fc.property(harnessArb, signalsArb, fc.boolean(), unavailableReasonArb, (harness, signals, isAvailable, reason) => {
        const first = projection(autoOutcome(harness, signals, isAvailable, reason));
        const second = projection(autoOutcome(harness, signals, isAvailable, reason));
        expect(second).toEqual(first);
      }),
      OPTS,
    );
  });

  test("canonical JSON and digest are invariant under equivalent topology transformations", () => {
    fc.assert(
      fc.property(
        harnessArb,
        signalsArb,
        fc.nat(),
        fc.integer({ min: 1, max: 5 }),
        unavailableReasonArb,
        (harness, signals, offset, duplicateEvery, reason) => {
          const baseline = projection(autoOutcome(harness, signals, false, reason));
          const equivalent = projection(
            autoOutcome(harness, transformedSignals(signals, offset, duplicateEvery), false, reason),
          );
          expect(equivalent).toEqual(baseline);
          expect(equivalent.digest).toMatch(/^[0-9a-f]{64}$/);

          const callerOwned = JSON.parse(baseline.canonical) as Record<string, unknown>;
          const parsed = okValue(SelectionOutcomeProjection.parse(callerOwned));
          expect(parsed.canonicalJSON()).toBe(baseline.canonical);
          expect(Object.isFrozen(callerOwned)).toBe(false);
        },
      ),
      OPTS,
    );
  });

  test("secret canaries and raw environment bytes are never retained", () => {
    const canaryArb = fc
      .string({ unit: fc.constantFrom("A", "B", "C", "7", "8", "9", "_"), minLength: 8, maxLength: 32 })
      .map((suffix) => `SECRET_CANARY_${suffix}`);
    fc.assert(
      fc.property(canaryArb, (canary) => {
        const legacyEnvironment = { AMADEUS_USE_SWARM: canary };
        const invalidEnvironment = { AMADEUS_SWARM_DRIVER: canary };
        const legacySnapshot = JSON.stringify(legacyEnvironment);
        const invalidSnapshot = JSON.stringify(invalidEnvironment);
        const legacy = parseDriverRequest(legacyEnvironment);
        const invalid = parseDriverRequest(invalidEnvironment);

        expect(JSON.stringify([legacy, invalid])).not.toContain(canary);
        expect(JSON.stringify(legacyEnvironment)).toBe(legacySnapshot);
        expect(JSON.stringify(invalidEnvironment)).toBe(invalidSnapshot);
      }),
      OPTS,
    );
  });

  test("parallel pure calls are independent and match sequential evaluation", async () => {
    const caseArb = fc.record({
      harness: harnessArb,
      signals: signalsArb,
      nativeAvailable: fc.boolean(),
      reason: unavailableReasonArb,
    });
    await fc.assert(
      fc.asyncProperty(fc.array(caseArb, { minLength: 1, maxLength: 20 }), async (cases) => {
        const sequential = cases.map(({ harness, signals, nativeAvailable, reason }) =>
          projection(autoOutcome(harness, signals, nativeAvailable, reason)),
        );
        const concurrent = await Promise.all(
          cases.map(({ harness, signals, nativeAvailable, reason }) =>
            Promise.resolve().then(() => projection(autoOutcome(harness, signals, nativeAvailable, reason))),
          ),
        );
        expect(concurrent).toEqual(sequential);
      }),
      OPTS,
    );
  });
});
