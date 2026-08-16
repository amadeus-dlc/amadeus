// covers: file:packages/framework/core/tools/amadeus-directive.ts
// size: small
//
// R-14 — waiting presents itself as its own directive kind.
//
// `parked` carries two fields, `reason` and `stage`, so anything that needs to
// know WHICH terminal it is looking at has to read English out of `reason`.
// Two terminals already share that shape; a third would make the conductor's
// only distinguishing signal a substring match. The waiting directive names its
// ruling point, its basis and the transaction holding the cause as fields, so
// the resume path can find the record without parsing prose.
//
// R-15 — REPAIR_STALLED keeps presenting as `parked`. Reshaping that surface is
// outside this unit (ADR-4 separates state, audit and resume, not presentation),
// so its directive shape is asserted here as an explicit no-regression.

import { describe, expect, test } from "bun:test";
import {
  validateDirective,
  VALID_KINDS,
  type WaitingDirective,
} from "../../packages/framework/core/tools/amadeus-directive.ts";

const WAITING: WaitingDirective = {
  kind: "waiting",
  reason: "The ruling at this gate is contested and nobody is at the keyboard.",
  stage: "code-generation",
  occurrence_id: "occurrence-1",
  basis_fingerprint: `sha256:${"a".repeat(64)}`,
  transaction_id: "autonomy-park-0123456789abcdef0123456789abcdef",
};

describe("t1241 the waiting directive is its own kind (R-14)", () => {
  test("waiting is an allowlisted kind, distinct from parked", () => {
    expect(VALID_KINDS).toContain("waiting");
    expect(VALID_KINDS).toContain("parked");
    expect(new Set(VALID_KINDS).size).toBe(VALID_KINDS.length);
  });

  test("a complete waiting directive validates", () => {
    const result = validateDirective(WAITING);
    expect(result.valid).toBe(true);
  });

  // The identifiers are what make the record findable on resume, so the
  // validator has to require them rather than accept a waiting directive that
  // points at nothing.
  for (const field of ["reason", "stage", "occurrence_id", "basis_fingerprint", "transaction_id"]) {
    test(`a waiting directive missing ${field} is rejected`, () => {
      const incomplete: Record<string, unknown> = { ...WAITING };
      delete incomplete[field];
      const result = validateDirective(incomplete);
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.errors.join("\n")).toContain(field);
    });
  }

  test("the basis fingerprint must be a sha256 digest", () => {
    const result = validateDirective({ ...WAITING, basis_fingerprint: "deadbeef" });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.join("\n")).toContain("basis_fingerprint");
  });

  test("a waiting directive cannot smuggle in unknown keys", () => {
    const result = validateDirective({ ...WAITING, outcome: { kind: "contested" } });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.join("\n")).toContain("unknown key: outcome");
  });
});

describe("t1241 the parked directive is unchanged (R-15)", () => {
  test("parked still takes exactly reason and stage", () => {
    expect(validateDirective({ kind: "parked", reason: "stalled", stage: "build-and-test" }).valid).toBe(true);
    expect(validateDirective({ kind: "parked", reason: "stalled" }).valid).toBe(false);
    // No waiting field leaked into park's allowed set.
    const leaked = validateDirective({
      kind: "parked",
      reason: "stalled",
      stage: "build-and-test",
      transaction_id: "x",
    });
    expect(leaked.valid).toBe(false);
  });
});
