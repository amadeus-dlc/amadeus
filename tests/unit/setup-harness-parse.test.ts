// covers: domain:setup-harness-parse
// size: small
//
// HarnessName.parse — U2's smart constructor for the raw `--harness` CLI
// value, added onto U1's HarnessName type (FR-003; U1's own
// tests/unit/setup-harness.test.ts still covers HarnessName.all alone).
// Returns its own minimal InvalidHarnessName error (not UsageError) so
// harness.ts has no dependency on command.ts (review correction 1); the
// UsageError conversion is command.ts's own responsibility, covered by
// tests/unit/setup-command.test.ts.

import { describe, expect, test } from "bun:test";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";

describe("HarnessName.parse", () => {
  test("accepts each of the six known harness names", () => {
    for (const name of ["claude", "codex", "kiro", "kiro-ide", "opencode", "cursor"]) {
      const result = HarnessName.parse(name);
      expect(result.type).toBe("ok");
      if (result.type === "ok") expect(result.value as string).toBe(name);
    }
  });

  test("edge case: rejects an unknown harness name, carrying the raw input", () => {
    const result = HarnessName.parse("bogus");
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.raw).toBe("bogus");
  });

  test("edge case: rejects the empty string", () => {
    const result = HarnessName.parse("");
    expect(result.type).toBe("err");
  });
});
