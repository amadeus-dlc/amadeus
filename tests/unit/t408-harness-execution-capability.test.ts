// covers: execution-observability:HarnessCapabilityPort execution-observability:EnvironmentSnapshot
// size: small

import { describe, expect, test } from "bun:test";
import {
  HARNESS_CAPABILITY_PORTS,
  captureDetectedExecutionEnvironment,
  captureExecutionEnvironment,
  executionHarnessFrom,
  renderFact,
} from "../../packages/framework/core/tools/amadeus-harness-capability.ts";
import {
  harnessPackageName,
  normalizeHarnessPackageName,
} from "../../packages/framework/core/tools/amadeus-harness.ts";

describe("shared harness capability adapters", () => {
  test("all eight packages use the same policy-free port", () => {
    expect(Object.keys(HARNESS_CAPABILITY_PORTS).sort()).toEqual([
      "claude",
      "codex",
      "cursor",
      "kimi",
      "kiro",
      "kiro-ide",
      "opencode",
      "pi",
    ]);
    for (const port of Object.values(HARNESS_CAPABILITY_PORTS)) {
      expect(port.capabilities().state).toBe("available");
    }
  });

  test("Kiro IDE reports no start seam because only completion is shipped", () => {
    expect(HARNESS_CAPABILITY_PORTS["kiro-ide"].capabilities()).toEqual({
      state: "available",
      value: {
        startSignal: false,
        completionSignal: true,
        nativeHandle: false,
        dispatchEffectQuery: false,
      },
    });
  });

  test("Codex facts are available only when its native surface supplied them", () => {
    expect(
      HARNESS_CAPABILITY_PORTS.codex.normalize({
        model: "gpt-5.6-sol",
        harnessVersion: "0.139.0",
        nativeHandle: "thread-1",
        monotonicClockAvailable: true,
      }),
    ).toMatchObject({
      model: { state: "available", value: "gpt-5.6-sol" },
      harnessVersion: { state: "available", value: "0.139.0" },
      nativeHandle: { state: "available", value: "thread-1" },
      clockAvailability: { state: "available", value: "monotonic+wall" },
    });
  });

  test("Claude missing fields remain unavailable and legacy rows remain legacy-unknown", () => {
    expect(
      HARNESS_CAPABILITY_PORTS.claude.normalize({
        model: { state: "legacy-unknown" },
      }),
    ).toMatchObject({
      model: { state: "legacy-unknown" },
      harnessVersion: {
        state: "unavailable",
        reason: "native-harness-version-not-exposed",
      },
      nativeHandle: {
        state: "unavailable",
        reason: "native-handle-not-exposed",
      },
      clockAvailability: {
        state: "incomplete",
        missingFields: ["monotonicClockAvailable"],
      },
    });
  });

  test("the environment snapshot contains facts rather than guessed strings", () => {
    const snapshot = captureExecutionEnvironment("codex", {
      model: undefined,
      harnessVersion: undefined,
      monotonicClockAvailable: false,
    });
    expect(snapshot.harness).toEqual({ state: "available", value: "codex" });
    expect(snapshot.model.state).toBe("unavailable");
    expect(snapshot.clockAvailability).toEqual({
      state: "available",
      value: "wall-only",
    });
    expect(renderFact(snapshot.model)).toBe(
      '{"state":"unavailable","reason":"native-model-not-exposed"}',
    );
  });

  test("native dispatch and effect queries remain policy-free delegates", () => {
    const port = HARNESS_CAPABILITY_PORTS.codex;
    expect(port.dispatch({ executeNative: () => "native-result" })).toBe(
      "native-result",
    );
    expect(
      port.queryDispatchEffect({ queryNative: () => "no-effect-confirmed" }),
    ).toBe("no-effect-confirmed");
    expect(port.queryDispatchEffect({})).toBe("unknown");
  });

  test("native harness names map without introducing a Codex-only policy", () => {
    expect(executionHarnessFrom("anything", "kiro-ide")).toBe("kiro-ide");
    expect(executionHarnessFrom("claude-code")).toBe("claude");
    for (const harness of [
      "codex",
      "cursor",
      "kiro",
      "opencode",
      "kimi",
      "pi",
    ] as const) {
      expect(executionHarnessFrom(harness)).toBe(harness);
    }
    expect(executionHarnessFrom("manual")).toBeNull();
  });

  test("detected and undetected environments preserve explicit availability", () => {
    expect(
      captureDetectedExecutionEnvironment("codex", null, {
        model: "gpt-5.6-sol",
        monotonicClockAvailable: true,
      }),
    ).toMatchObject({
      harness: { state: "available", value: "codex" },
      model: { state: "available", value: "gpt-5.6-sol" },
    });
    expect(
      captureDetectedExecutionEnvironment("manual", null, {
        monotonicClockAvailable: undefined,
      }),
    ).toEqual({
      harness: {
        state: "unavailable",
        reason: "execution-harness-not-detected",
      },
      model: { state: "unavailable", reason: "native-model-not-exposed" },
      harnessVersion: {
        state: "unavailable",
        reason: "native-harness-version-not-exposed",
      },
      capability: {
        state: "unavailable",
        reason: "execution-harness-not-detected",
      },
      clockAvailability: {
        state: "incomplete",
        missingFields: ["monotonicClockAvailable"],
      },
    });
  });

  test("package names accept only non-empty strings and missing source data is explicit", () => {
    expect(normalizeHarnessPackageName("codex")).toBe("codex");
    expect(normalizeHarnessPackageName(42)).toBeNull();
    expect(normalizeHarnessPackageName("")).toBeNull();
    expect(harnessPackageName()).toBeNull();
  });
});
