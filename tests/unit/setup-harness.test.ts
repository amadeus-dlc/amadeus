// covers: domain:setup-harness
// size: small
//
// HarnessName.all — the canonical 4-value list U1 owns standalone (U2 owns
// string-input validation separately).

import { describe, expect, test } from "bun:test";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";

describe("HarnessName.all", () => {
  test("contains exactly the four known harnesses", () => {
    const names: string[] = HarnessName.all.map((h) => h);
    expect(names.sort()).toEqual(["claude", "codex", "kiro", "kiro-ide"].sort());
  });

  test("edge case: is frozen (cannot be mutated at runtime)", () => {
    expect(Object.isFrozen(HarnessName.all)).toBe(true);
  });

  test("edge case: has no duplicate entries", () => {
    expect(new Set(HarnessName.all).size).toBe(HarnessName.all.length);
  });
});
