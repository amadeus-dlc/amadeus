// t269-harness-provenance: pure canonical harness mapping contract.
// covers: constant:HARNESS_DIR_TO_TYPE

import { expect, test } from "bun:test";
import { HARNESS_DIR_TO_TYPE } from "../../packages/framework/core/tools/amadeus-lib.ts";

test("canonical mapping contains exactly the five approved dot directories", () => {
  expect(HARNESS_DIR_TO_TYPE).toEqual({
    ".claude": "claude-code",
    ".codex": "codex",
    ".cursor": "cursor",
    ".opencode": "opencode",
    ".kiro": "kiro",
  });
});
