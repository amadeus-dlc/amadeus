// covers: otel:resource-suppliers
// size: small
//
// U1 (resource-core) — the harness-dependent attribute supply seam (FR-RES-3,
// ADR-2). Values core cannot resolve (session id, model, agent role, harness
// version) arrive through a closed-key setter: set once, never overwritten,
// arbitrary keys refused. In-memory only — no fs, no spawn.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  SUPPLIED_RESOURCE_KEYS,
  resetSuppliersForTests,
  suppliedResourceAttributes,
  supplyGeneration,
  supplyResourceAttribute,
  supplyTokenUsage,
} from "../../dist/claude/.claude/otel/resource-suppliers.ts";

beforeEach(() => {
  resetSuppliersForTests();
});
afterEach(() => {
  resetSuppliersForTests();
});

describe("closed key set (FR-RES-3, ADR-2)", () => {
  test("the four supplied keys are exactly the #1868 §1 harness-dependent set", () => {
    expect([...SUPPLIED_RESOURCE_KEYS].sort()).toEqual([
      "amadeus.agent.role",
      "amadeus.harness.version",
      "gen_ai.request.model",
      "session.id",
    ]);
  });

  test("a supplied value is readable back and unsupplied keys are absent", () => {
    supplyResourceAttribute("session.id", "sess-1");
    const supplied = suppliedResourceAttributes();
    expect(supplied["session.id"]).toBe("sess-1");
    expect("gen_ai.request.model" in supplied).toBe(false);
  });

  test("a key outside the closed set is refused at runtime, not silently stored", () => {
    expect(() => supplyResourceAttribute("service.name" as never, "spoofed")).toThrow(/not a supplied resource key/);
    expect(suppliedResourceAttributes()).toEqual({});
  });

  test("a second supply of the same key throws and leaves the first value intact", () => {
    supplyResourceAttribute("gen_ai.request.model", "first");
    expect(() => supplyResourceAttribute("gen_ai.request.model", "second")).toThrow(/already supplied/);
    expect(suppliedResourceAttributes()["gen_ai.request.model"]).toBe("first");
  });

  test("an empty value is refused — an absent attribute is the fail-open shape, not an empty one", () => {
    expect(() => supplyResourceAttribute("session.id", "  ")).toThrow(/empty/);
    expect(suppliedResourceAttributes()).toEqual({});
  });

  test("the returned bag is a copy — mutating it cannot reach the registry", () => {
    supplyResourceAttribute("amadeus.agent.role", "builder");
    const first = suppliedResourceAttributes() as Record<string, string>;
    first["amadeus.agent.role"] = "tampered";
    expect(suppliedResourceAttributes()["amadeus.agent.role"]).toBe("builder");
  });
});

describe("supply generation (ADR-1 memo invalidation)", () => {
  test("the generation advances on every accepted supply and stays put on a refused one", () => {
    const start = supplyGeneration();
    supplyResourceAttribute("session.id", "sess-1");
    const afterAccepted = supplyGeneration();
    expect(afterAccepted).toBeGreaterThan(start);
    expect(() => supplyResourceAttribute("session.id", "sess-2")).toThrow();
    expect(supplyGeneration()).toBe(afterAccepted);
  });

  test("the reset seam clears both the values and the generation", () => {
    supplyResourceAttribute("session.id", "sess-1");
    resetSuppliersForTests();
    expect(suppliedResourceAttributes()).toEqual({});
    expect(supplyGeneration()).toBe(0);
  });
});

describe("token usage seam (FR-MET-3 — no-op until U5 wires the meter)", () => {
  test("supplying token usage with no meter registered never throws", () => {
    expect(() => supplyTokenUsage({ inputTokens: 10, outputTokens: 20, model: "m" })).not.toThrow();
  });
});
