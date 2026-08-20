// t269-harness-provenance: pure canonical harness mapping contract.
// covers: constant:HARNESS_DIR_TO_TYPE, function:detectHarnessType,
//         function:detectHarnessTypeForAuthorization

import { expect, test } from "bun:test";
import {
  detectHarnessType,
  HARNESS_DIR_TO_TYPE,
  type HarnessType,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { detectHarnessTypeForAuthorization } from "../../packages/framework/core/tools/amadeus-harness.ts";

test("canonical mapping contains exactly the seven approved dot directories", () => {
  expect(HARNESS_DIR_TO_TYPE).toEqual({
    ".claude": "claude-code",
    ".codex": "codex",
    ".cursor": "cursor",
    ".opencode": "opencode",
    ".kiro": "kiro",
    ".kimi-code": "kimi",
    ".pi": "pi",
  });
});

test("explicit harness values are normalized in-process", () => {
  const previous = process.env.AMADEUS_HARNESS_TYPE;
  try {
    const valid: HarnessType[] = [
      "claude-code",
      "codex",
      "cursor",
      "opencode",
      "kiro",
      "kimi",
      "pi",
      "unknown",
      "manual",
    ];
    for (const value of valid) {
      process.env.AMADEUS_HARNESS_TYPE = value;
      expect(detectHarnessType()).toBe(value);
    }
    process.env.AMADEUS_HARNESS_TYPE = "invalid";
    expect(detectHarnessType()).toBe("unknown");
  } finally {
    if (previous === undefined) {
      delete process.env.AMADEUS_HARNESS_TYPE;
    } else {
      process.env.AMADEUS_HARNESS_TYPE = previous;
    }
  }
});

// #2326 — the two detectors answer two different questions and must not be
// interchangeable. The provenance one above is env-first BY DESIGN (it labels
// an intent birth); the authorization one is the input to the Kimi
// main-conductor guard, so an env value it honoured would be an authorization
// bypass anyone could arm with `export`. Pinned as a pure invariant: whatever
// the override says, the authorization answer does not move.
//
// This stays in the unit tier despite the detector probing for harness dirs:
// the assertion is a self-comparison against the env-free baseline, so it
// builds no fixture tree and asserts nothing about what the ambient checkout
// contains (fs-tests-integration-first). The workspace-shaped evidence — a
// real `.kimi-code/` root judged under a hostile override — is t460's.
const VALID_HARNESS_VALUES: ReadonlySet<string> = new Set([
  ...Object.values(HARNESS_DIR_TO_TYPE),
  "unknown",
  "manual",
]);

function isValidHarnessValue(value: string): value is HarnessType {
  return VALID_HARNESS_VALUES.has(value);
}

test("the authorization detector ignores the provenance override", () => {
  const previous = process.env.AMADEUS_HARNESS_TYPE;
  try {
    delete process.env.AMADEUS_HARNESS_TYPE;
    const actual = detectHarnessTypeForAuthorization();

    const overrides: string[] = [
      "claude-code",
      "codex",
      "cursor",
      "opencode",
      "kiro",
      "kimi",
      "pi",
      "unknown",
      "manual",
      "not-a-harness",
      "",
    ];
    for (const override of overrides) {
      process.env.AMADEUS_HARNESS_TYPE = override;
      expect(detectHarnessTypeForAuthorization()).toBe(actual);
      // The provenance detector still moves with it — the override keeps the
      // only job it is documented to have.
      expect(detectHarnessType()).toBe(
        isValidHarnessValue(override) ? override : "unknown",
      );
    }
  } finally {
    if (previous === undefined) {
      delete process.env.AMADEUS_HARNESS_TYPE;
    } else {
      process.env.AMADEUS_HARNESS_TYPE = previous;
    }
  }
});
