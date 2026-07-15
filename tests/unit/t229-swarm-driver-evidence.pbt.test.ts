// covers: function:verifyNativeEvidence, requirement:FR-15, requirement:FR-19
// size: medium

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type { NormalizedDriverEvent } from "../../packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
import { verifyNativeEvidence } from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";

function events(units: readonly string[]): NormalizedDriverEvent[] {
  const base = {
    v: 1 as const,
    driver: "codex-ultra" as const,
    executionId: "exec",
    attemptId: "attempt",
    attemptNonceHash: "nonce",
    planDigest: "plan",
    waveIndex: 0,
    waveDigest: "wave",
    nativeRunId: "run",
  };
  const bindings = units.map((unit, index) => ({ unit, childId: `child-${index}` }));
  return [
    {
      ...base,
      kind: "mode-confirmed",
      source: "model-handshake",
      modeIdentifier: "codex-ultra-v1:gpt-5.6-sol-ultra",
      resolvedModelId: "gpt-5.6-sol-ultra",
    },
    { ...base, kind: "coordinator-started", source: "stream", coordinatorId: "coordinator" },
    { ...base, kind: "native-state-observed", source: "hook", snapshotDigest: "snapshot", bindings },
    ...bindings.map(
      ({ unit, childId }) =>
        ({ ...base, kind: "native-child-started", source: "hook", childId, unit }) as const,
    ),
    ...bindings.map(
      ({ unit, childId }) =>
        ({ ...base, kind: "native-child-stopped", source: "hook", childId, unit, outcome: "completed" }) as const,
    ),
    { ...base, kind: "native-coordination", source: "stream", marker: "codex-subagent-hook" },
    { ...base, kind: "coordinator-stopped", source: "stream", coordinatorId: "coordinator", exitCode: 0 },
  ];
}

const evidenceBinding = {
  driver: "codex-ultra" as const,
  executionId: "exec",
  attemptId: "attempt",
  nonceHash: "nonce",
  planDigest: "plan",
  waveIndex: 0,
  waveDigest: "wave",
  nativeRunId: "run",
  expectedUnits: ["alpha", "beta"] as const,
  expectedProbeBinding: Object.freeze({
    schemaVersion: 1 as const,
    driver: "codex-ultra" as const,
    modeIdentifier: "codex-ultra-v1:gpt-5.6-sol-ultra",
    resolvedModelId: "gpt-5.6-sol-ultra",
    seedDigest: "a".repeat(64),
    finalDigest: "b".repeat(64),
  }),
};

function verify(inputEvents: readonly NormalizedDriverEvent[]) {
  return verifyNativeEvidence({ ...evidenceBinding, events: inputEvents });
}

describe("t229 native evidence properties", () => {
  test("accepts an exact source and Unit-child bijection", () => {
    const verdict = verify(events(["alpha", "beta"]));
    expect(verdict.ok).toBeTrue();
    expect(verdict.completedUnits).toEqual(["alpha", "beta"]);
  });

  test("is order-invariant for expected Units and events", () => {
    const fixture = events(["alpha", "beta"]);
    fc.assert(
      fc.property(fc.shuffledSubarray(fixture, { minLength: fixture.length, maxLength: fixture.length }), (shuffled) => {
        const verdict = verifyNativeEvidence({ ...evidenceBinding, expectedUnits: ["beta", "alpha"], events: shuffled });
        expect(verdict.ok).toBeTrue();
      }),
      { seed: 22_902, numRuns: 50 },
    );
  });

  test("fails closed on a correlation mismatch", () => {
    const value = events(["alpha", "beta"]);
    value[0] = { ...value[0], attemptId: "other" } as NormalizedDriverEvent;
    const verdict = verify(value);
    expect(verdict).toMatchObject({ ok: false, code: "CORRELATION_MISMATCH" });
  });

  test("fails closed on missing source, child, duplicate child, or failure", () => {
    const all = events(["alpha", "beta"]);
    const noHandshake = all.filter((event) => event.source !== "model-handshake");
    const missingChild = all.filter(
      (event) => !(event.kind === "native-child-stopped" && event.unit === "beta"),
    );
    const failed = all.map((event) =>
      event.kind === "native-child-stopped" && event.unit === "beta"
        ? ({ ...event, outcome: "failed" } as const)
        : event,
    );
    expect(verify(noHandshake).code).toBe("SOURCE_MISSING");
    expect(verify(missingChild).code).toBe("UNIT_BIJECTION_INVALID");
    expect(verify(failed).code).toBe("CHILD_FAILED");
  });

  test("fails closed when any event escapes the bound wave or native run", () => {
    const fixture = events(["alpha", "beta"]);
    const mutations = [
      (event: NormalizedDriverEvent) => ({ ...event, waveIndex: 1 }),
      (event: NormalizedDriverEvent) => ({ ...event, waveDigest: "other-wave" }),
      (event: NormalizedDriverEvent) => ({ ...event, nativeRunId: "other-run" }),
    ];
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: fixture.length - 1 }),
        fc.integer({ min: 0, max: mutations.length - 1 }),
        (eventIndex, mutationIndex) => {
          const changed = [...fixture];
          changed[eventIndex] = mutations[mutationIndex](changed[eventIndex]) as NormalizedDriverEvent;
          expect(verify(changed)).toMatchObject({ ok: false, code: "CORRELATION_MISMATCH" });
        },
      ),
      { seed: 22_903, numRuns: 50 },
    );
  });

  test("requires the closed Codex mode, marker, lifecycle cardinality, coordinator identity, and exit zero", () => {
    const fixture = events(["alpha", "beta"]);
    const invalidModes = [
      { modeIdentifier: "codex-ultra", resolvedModelId: undefined },
      { modeIdentifier: "codex-ultra-v1:gpt-5.6-sol-ultra", resolvedModelId: undefined },
      { modeIdentifier: "codex-ultra-v1:gpt-5.6-sol-ultra", resolvedModelId: "other-model" },
      { modeIdentifier: "codex-ultra-v1:", resolvedModelId: "" },
    ];
    const invalid = [
      fixture.filter((event) => event.kind !== "mode-confirmed"),
      ...invalidModes.map((mode) =>
        fixture.map((event) => (event.kind === "mode-confirmed" ? { ...event, ...mode } : event)),
      ),
      fixture.filter((event) => event.kind !== "native-coordination"),
      fixture.map((event) =>
        event.kind === "native-coordination" ? { ...event, marker: "claude-workflow" as const } : event,
      ),
      fixture.filter((event) => event.kind !== "coordinator-started"),
      fixture.filter((event) => event.kind !== "coordinator-stopped"),
      fixture.map((event) =>
        event.kind === "coordinator-stopped" ? { ...event, coordinatorId: "other" } : event,
      ),
      fixture.map((event) =>
        event.kind === "coordinator-stopped" ? { ...event, exitCode: 99 } : event,
      ),
      [...fixture, fixture.find((event) => event.kind === "mode-confirmed")!],
    ];
    for (const candidate of invalid) {
      expect(verify(candidate as readonly NormalizedDriverEvent[]).ok).toBeFalse();
    }
  });

  test("requires Codex evidence to match the selected ProbeBinding exactly", () => {
    const fixture = events(["alpha", "beta"]);
    const { expectedProbeBinding: _expectedProbeBinding, ...withoutBinding } = evidenceBinding;
    expect(verifyNativeEvidence({ ...withoutBinding, events: fixture })).toMatchObject({
      ok: false,
      code: "EVIDENCE_POLICY_INVALID",
    });

    const mismatches = [
      { ...evidenceBinding.expectedProbeBinding, modeIdentifier: "codex-ultra-v1:other-model" },
      { ...evidenceBinding.expectedProbeBinding, resolvedModelId: "other-model" },
    ];
    for (const expectedProbeBinding of mismatches) {
      expect(verifyNativeEvidence({ ...evidenceBinding, expectedProbeBinding, events: fixture })).toMatchObject({
        ok: false,
        code: "EVIDENCE_POLICY_INVALID",
      });
    }
  });
});
