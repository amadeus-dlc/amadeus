// covers: otel:tracer-provider otel:event-registry
//
// U3 (exception) — the exception span event carries the OTel semantic-
// convention trio (FR-EXC): `exception.message` (unchanged), plus
// `exception.type` and a redacted `exception.stacktrace` when the thrown value
// is an Error that captured one. Non-Errors and stackless Errors omit the two
// new attributes rather than inventing them (fail-open).
//
// The attribute bag is redacted at write time HERE and only here (ADR-4):
// addEvent in general stays untouched. A defect inside that redaction must
// degrade to the message-only event, never take the caller's process down
// (NFR-1) — telemetry is not allowed to be the thing that crashes the run.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { CompletedSpanRecord } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { getEventDef } from "../../dist/claude/.claude/otel/event-registry.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
let spans: CompletedSpanRecord[];

beforeEach(() => {
  proj = createTestProject();
  spans = [];
  resetTracerProviderForTests();
  registerTracerProvider({ projectDir: proj, spanExporter: { exportSpan: (r) => void spans.push(r) } });
});
afterEach(() => {
  cleanupTestProject(proj);
  resetTracerProviderForTests();
});

// Record one exception on a span and hand back the resulting event attributes.
function recordOn(value: unknown): Record<string, unknown> {
  const span = getAmadeusTracer().startSpan("operation");
  try {
    span.recordException(value as Error);
  } finally {
    span.end();
  }
  expect(spans.length).toBe(1);
  expect(spans[0].events.length).toBe(1);
  return (spans[0].events[0].attributes ?? {}) as Record<string, unknown>;
}

describe("exception attribute trio (FR-EXC)", () => {
  test("an Error records message, type, and a stacktrace", () => {
    const attrs = recordOn(new TypeError("boom"));
    expect(attrs["exception.message"]).toBe("boom");
    expect(attrs["exception.type"]).toBe("TypeError");
    expect(typeof attrs["exception.stacktrace"]).toBe("string");
    expect(attrs["exception.stacktrace"] as string).toContain("TypeError: boom");
  });

  test("a custom error name is carried verbatim", () => {
    const err = new Error("boom");
    err.name = "AmadeusRelayError";
    expect(recordOn(err)["exception.type"]).toBe("AmadeusRelayError");
  });

  test("a non-Error value records only the stringified message", () => {
    const attrs = recordOn("plain string failure");
    expect(attrs["exception.message"]).toBe("plain string failure");
    expect("exception.type" in attrs).toBe(false);
    expect("exception.stacktrace" in attrs).toBe(false);
  });

  test("an Error without a stack omits exception.stacktrace but keeps the type", () => {
    const err = new Error("boom");
    err.stack = undefined as unknown as string;
    const attrs = recordOn(err);
    expect(attrs["exception.message"]).toBe("boom");
    expect(attrs["exception.type"]).toBe("Error");
    expect("exception.stacktrace" in attrs).toBe(false);
  });
});

describe("write-time redaction of the exception bag (ADR-4)", () => {
  test("the recorded stacktrace carries no absolute home path and no credentials", () => {
    const home = process.env.HOME ?? "";
    const err = new Error("failed with ghp_abcdefghijklmnopqrstuvwxyz012345");
    err.stack = [
      "Error: failed with ghp_abcdefghijklmnopqrstuvwxyz012345",
      `    at load (${home}/.bun/cache/pkg/index.js:7:1)`,
      `    at run (${proj}/tools/x.ts:1:1)`,
    ].join("\n");
    const stacktrace = recordOn(err)["exception.stacktrace"] as string;
    expect(stacktrace).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz012345");
    expect(stacktrace).toContain("<home>/.bun/cache/pkg/index.js:7:1");
    expect(stacktrace).toContain("tools/x.ts:1:1");
    expect(stacktrace).not.toContain(proj);
  });

  test("addEvent outside recordException is NOT redacted — the seam is recordException-only", () => {
    const span = getAmadeusTracer().startSpan("operation");
    try {
      span.addEvent("amadeus.diagnostic.note", { Prompt: "not a safe key" });
    } finally {
      span.end();
    }
    expect(spans[0].events[0].attributes?.Prompt).toBe("not a safe key");
  });
});

describe("a redaction defect degrades instead of propagating (NFR-1)", () => {
  test("a throwing stack accessor still emits the message-only event", () => {
    const err = new Error("boom");
    Object.defineProperty(err, "stack", {
      get() {
        throw new Error("injected redaction-path failure");
      },
    });
    const attrs = recordOn(err);
    expect(attrs["exception.message"]).toBe("boom");
    expect("exception.stacktrace" in attrs).toBe(false);
  });
});

describe("registry contract for the new attributes", () => {
  test("the exception def keeps message required and lists the new keys as optional", () => {
    const def = getEventDef("exception");
    expect(def.durability).toBe("telemetry");
    expect([...def.requiredAttributes]).toEqual(["exception.message"]);
    expect([...def.optionalAttributes].sort()).toEqual(["exception.stacktrace", "exception.type"]);
  });
});
