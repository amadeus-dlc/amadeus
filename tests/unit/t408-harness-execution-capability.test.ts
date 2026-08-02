// covers: execution-observability:HarnessCapabilityPort execution-observability:EnvironmentSnapshot
// size: small

import { describe, expect, test } from "bun:test";
import {
  HARNESS_CAPABILITY_PORTS,
  captureExecutionEnvironment,
  renderFact,
} from "../../packages/framework/core/tools/amadeus-harness-capability.ts";

describe("shared harness capability adapters", () => {
  test("all seven packages use the same policy-free port", () => {
    expect(Object.keys(HARNESS_CAPABILITY_PORTS).sort()).toEqual([
      "claude",
      "codex",
      "cursor",
      "kimi",
      "kiro",
      "kiro-ide",
      "opencode",
    ]);
    for (const port of Object.values(HARNESS_CAPABILITY_PORTS)) {
      expect(port.capabilities().state).toBe("available");
    }
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
});
