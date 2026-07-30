// covers: otel:shadow-compare-prototype
//
// U1 (otel-walking-skeleton) test-first order 4/4 — the shadow-comparison
// harness PROTOTYPE (VER-3 order 4, feeding VER-5): run the representative
// operations through both the old telemetry path (buffer events) and the new
// OTel path (spans + canonical events), then emit a machine-readable JSON
// report correlating the two. Phase 4's deletion gate (FR-MIG-4(d)) will
// grow from this prototype.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { appendTelemetryEvent } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { registerLoggerProvider } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { buildShadowReport, writeShadowReport } from "../../dist/claude/.claude/otel/shadow-compare.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-shadow", "default", "feature");
  writeFileSync(join(proj, "amadeus", "config.json"), JSON.stringify({ observability: { enabled: true } }), "utf-8");
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({ projectDir: proj }),
    logExporter: createLocalLogExporter({ projectDir: proj }),
  });
  registerTracerProvider({ spanExporter: createLocalSpanExporter({ projectDir: proj }) });
});
afterEach(() => {
  cleanupTestProject(proj);
});

describe("shadow comparison prototype (VER-3 order 4)", () => {
  test("correlates old buffer events with new OTel spans and emits a machine-readable report", async () => {
    // Old path: one buffer operation event per representative operation.
    const t0 = Date.now();
    appendTelemetryEvent(proj, { kind: "operation", name: "decision", startMs: t0, endMs: t0 + 3, ok: true });
    appendTelemetryEvent(proj, { kind: "subprocess", name: "projector", startMs: t0, endMs: t0 + 9, ok: true });

    // New path: the same operations as OTel spans.
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("decision", async (s) => s.end());
    await tracer.startActiveSpan("projector", async (s) => s.end());

    const report = buildShadowReport(proj);
    expect(report.oldEvents).toBe(2);
    expect(report.newSpans).toBe(2);
    expect(report.matched.sort()).toEqual(["decision", "projector"]);
    expect(report.missingInNew).toEqual([]);
    expect(report.missingInOld).toEqual([]);

    const out = writeShadowReport(proj, report);
    const parsed = JSON.parse(readFileSync(out, "utf-8"));
    expect(parsed.matched.length).toBe(2);
    expect(typeof parsed.generatedAt).toBe("string");
  });

  test("divergence is visible in the report (a missing new span is named, not silent)", () => {
    appendTelemetryEvent(proj, { kind: "operation", name: "orphan-op", startMs: 1, endMs: 2, ok: true });
    const report = buildShadowReport(proj);
    expect(report.missingInNew).toEqual(["orphan-op"]);
  });
});
