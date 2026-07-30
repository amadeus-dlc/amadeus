// covers: otel:event-registry otel:tracer-provider otel:logger-provider
//
// U2 (event-registry) — FR-EVT-7 functional contract over the full 78-event
// registry: recordException()'s exception span event is telemetry (it rides
// the span record, never the audit journal — BR-3), and emitEvent routes the
// full canonical vocabulary through the registry with required-attribute
// validation (BR-4).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import type { CompletedSpanRecord } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { emitEvent, registerLoggerProvider, resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
});

function bootLogger(appended: string[]) {
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({
      projectDir: proj,
      append: (def) => {
        appended.push(def.auditEvent as string);
      },
    }),
    logExporter: createLocalLogExporter({ projectDir: proj }),
  });
}

describe("recordException's exception span event is telemetry (FR-EVT-7)", () => {
  test("the exception rides the span record and never reaches the audit journal", async () => {
    const appended: string[] = [];
    bootLogger(appended);
    const spans: CompletedSpanRecord[] = [];
    registerTracerProvider({ spanExporter: { exportSpan: (r) => void spans.push(r) } });

    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("operation", async (span) => {
      try {
        span.recordException(new Error("boom"));
      } finally {
        span.end();
      }
    });

    expect(spans.length).toBe(1);
    const events = spans[0].events;
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("exception");
    expect(events[0].attributes?.["exception.message"]).toBe("boom");
    // BR-3: no canonical write — a canonical failure is a separate
    // amadeus.operation.failed emit, never the span event.
    expect(appended).toEqual([]);
  });

  test("the canonical failure path emits amadeus.operation.failed (ERROR_LOGGED) separately", () => {
    const appended: string[] = [];
    bootLogger(appended);
    emitEvent("amadeus.operation.failed", { Tool: "amadeus-state.ts", Command: "advance", Error: "boom" });
    expect(appended).toEqual(["ERROR_LOGGED"]);
  });
});

describe("emitEvent over the full registry (FR-EVT-1, BR-4)", () => {
  test("a stage-lifecycle event routes to the audit exporter as its v1 type", () => {
    const appended: string[] = [];
    bootLogger(appended);
    emitEvent("amadeus.stage.started", { Stage: "code-generation", Agent: "orchestrator" });
    expect(appended).toEqual(["STAGE_STARTED"]);
  });

  test("session.ended requires Reason (registry-required attribute)", () => {
    const appended: string[] = [];
    bootLogger(appended);
    expect(() => emitEvent("amadeus.session.ended", {})).toThrow(/Reason/);
    expect(appended).toEqual([]);
    emitEvent("amadeus.session.ended", { Reason: "clear" });
    expect(appended).toEqual(["SESSION_ENDED"]);
  });

  test("a telemetry-classified event never reaches the audit exporter", () => {
    const appended: string[] = [];
    bootLogger(appended);
    emitEvent("amadeus.diagnostic.note", { Note: "n" });
    expect(appended).toEqual([]);
  });
});
