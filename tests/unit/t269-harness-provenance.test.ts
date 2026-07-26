// t269-harness-provenance: pure canonical harness mapping contract.
// covers: constant:HARNESS_DIR_TO_TYPE, function:detectHarnessType

import { expect, test } from "bun:test";
import {
  detectHarnessType,
  HARNESS_DIR_TO_TYPE,
  type HarnessType,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

test("canonical mapping contains exactly the six approved dot directories", () => {
  expect(HARNESS_DIR_TO_TYPE).toEqual({
    ".claude": "claude-code",
    ".codex": "codex",
    ".cursor": "cursor",
    ".opencode": "opencode",
    ".kiro": "kiro",
    ".kimi-code": "kimi",
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
