// covers: otel:span-context
// size: small
//
// U2 (span-attrs) — the env half of the span context resolver plus the
// redaction admission the six keys depend on. The workspace half (intent,
// space, stage, phase) reads the real filesystem, so it lives in the
// integration layer; what is testable in memory is the agent pair (env) and
// the fact that the six keys survive the default policy at all.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  SPAN_CONTEXT_ATTRIBUTE_KEYS,
  buildSpanContext,
  resetSpanContextForTests,
  spanContextAttributes,
} from "../../dist/claude/.claude/otel/span-context.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes } from "../../dist/claude/.claude/otel/redaction.ts";

const ENV_KEYS = ["AMADEUS_AGENT_TYPE", "AMADEUS_AGENT_ID"];
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  resetSpanContextForTests();
});
afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetSpanContextForTests();
});

describe("closed key set (FR-SPAN-1)", () => {
  test("the vocabulary is exactly the six workflow-context keys", () => {
    expect([...SPAN_CONTEXT_ATTRIBUTE_KEYS].sort()).toEqual([
      "amadeus.agent.id",
      "amadeus.agent.type",
      "amadeus.intent.id",
      "amadeus.phase",
      "amadeus.space",
      "amadeus.stage",
    ]);
  });
});

describe("the agent pair (env supplied, fail-open)", () => {
  test("both agent keys are absent when the env supplies neither", () => {
    const attrs = spanContextAttributes("/nonexistent-workspace-for-span-context");
    expect("amadeus.agent.type" in attrs).toBe(false);
    expect("amadeus.agent.id" in attrs).toBe(false);
  });

  test("a supplied agent type and id are carried through", () => {
    process.env.AMADEUS_AGENT_TYPE = "builder";
    process.env.AMADEUS_AGENT_ID = "b2-spanattrs";
    const attrs = spanContextAttributes("/nonexistent-workspace-for-span-context");
    expect(attrs["amadeus.agent.type"]).toBe("builder");
    expect(attrs["amadeus.agent.id"]).toBe("b2-spanattrs");
  });

  test("each agent key resolves independently — one supplied, one absent", () => {
    process.env.AMADEUS_AGENT_TYPE = "reviewer";
    const attrs = spanContextAttributes("/nonexistent-workspace-for-span-context");
    expect(attrs["amadeus.agent.type"]).toBe("reviewer");
    expect("amadeus.agent.id" in attrs).toBe(false);
  });

  test("a blank env value is treated as unresolved, not as an empty attribute", () => {
    process.env.AMADEUS_AGENT_TYPE = "   ";
    const attrs = spanContextAttributes("/nonexistent-workspace-for-span-context");
    expect("amadeus.agent.type" in attrs).toBe(false);
  });
});

describe("the whole-bag guard (NFR-1) — a resolver that throws yields no context", () => {
  test("an unanticipated resolution failure degrades to an empty bag, not a partial one", () => {
    // A non-string project dir makes the workspace resolvers throw a TypeError
    // from their path join, which happens BEFORE their own fail-open guards.
    // That is the unanticipated class the whole-bag guard exists for.
    process.env.AMADEUS_AGENT_TYPE = "builder";
    expect(buildSpanContext(undefined as never)).toEqual({});
  });

  test("the same failure does not throw into the caller — span creation continues", () => {
    expect(() => buildSpanContext(undefined as never)).not.toThrow();
  });
});

describe("process memo (short-lived process model)", () => {
  test("a second read returns the identical object rather than re-resolving", () => {
    const first = spanContextAttributes("/nonexistent-workspace-for-span-context");
    expect(spanContextAttributes("/nonexistent-workspace-for-span-context")).toBe(first);
  });

  test("an env change after the first read does NOT reach the memo until it is reset", () => {
    const before = spanContextAttributes("/nonexistent-workspace-for-span-context");
    expect("amadeus.agent.type" in before).toBe(false);
    process.env.AMADEUS_AGENT_TYPE = "builder";
    expect("amadeus.agent.type" in spanContextAttributes("/nonexistent-workspace-for-span-context")).toBe(false);
    resetSpanContextForTests();
    expect(spanContextAttributes("/nonexistent-workspace-for-span-context")["amadeus.agent.type"]).toBe("builder");
  });

  test("a different workspace rebuilds rather than answering from the memo", () => {
    const first = spanContextAttributes("/nonexistent-workspace-for-span-context");
    expect(spanContextAttributes("/another-nonexistent-workspace")).not.toBe(first);
  });
});

describe("redaction admission (E-OMSB2A-DEV case A)", () => {
  test("all six keys survive the default policy — the store boundary applies it", () => {
    const admitted = redactAttributes(
      {
        "amadeus.intent.id": "260729-otel-upstream",
        "amadeus.space": "default",
        "amadeus.stage": "code-generation",
        "amadeus.phase": "CONSTRUCTION",
        "amadeus.agent.type": "builder",
        "amadeus.agent.id": "b2",
      },
      DEFAULT_REDACTION_POLICY
    );
    expect(Object.keys(admitted).sort()).toEqual([...SPAN_CONTEXT_ATTRIBUTE_KEYS].sort());
  });

  test("admission is not raw pass-through — a credential-shaped agent id is scrubbed", () => {
    const admitted = redactAttributes(
      { "amadeus.agent.id": "ghp_0123456789abcdefghijklmnopqrstuvwxyz" },
      DEFAULT_REDACTION_POLICY
    );
    expect(admitted["amadeus.agent.id"]).toBe("[REDACTED]");
  });

  test("a key outside the six is still refused — the policy stays default-deny", () => {
    const admitted = redactAttributes({ "amadeus.secret": "leak" }, DEFAULT_REDACTION_POLICY);
    expect(admitted).toEqual({});
  });
});
