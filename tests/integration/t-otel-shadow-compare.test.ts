// covers: otel:shadow-compare
//
// U1 (otel-walking-skeleton) test-first order 4/4, carried onto U7's
// productionised harness — the shadow comparison over the LIVE paths (VER-3
// order 4, feeding VER-5): run the representative operations through both the
// old telemetry path (buffer events) and the new OTel path (spans + canonical
// events), then emit a machine-readable JSON report correlating the two.
// Phase 4's deletion-gate input FR-MIG-4(d) reads that report.
//
// This file drives the harness end to end through the real writers; the
// per-dimension contracts (BR-10) and the harness-failure verdicts are pinned
// on fixture stores in t367-shadow-comparison-production.test.ts.

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
import { buildShadowComparisonReport, writeShadowComparisonReport } from "../../dist/claude/.claude/otel/shadow-compare.ts";
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

describe("shadow comparison over the live paths (VER-3 order 4)", () => {
  test("correlates old buffer events with new OTel spans and emits a machine-readable report", async () => {
    // Old path: one buffer operation event per representative operation.
    const t0 = Date.now();
    appendTelemetryEvent(proj, { kind: "operation", name: "decision", startMs: t0, endMs: t0 + 3, ok: true });
    appendTelemetryEvent(proj, { kind: "subprocess", name: "projector", startMs: t0, endMs: t0 + 9, ok: true });

    // New path: the same operations as OTel spans.
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("decision", async (s) => s.end());
    await tracer.startActiveSpan("projector", async (s) => s.end());

    const report = buildShadowComparisonReport(proj);
    expect(report.oldPath.records).toBe(2);
    expect(report.newPath.records).toBe(2);
    expect(report.eventCount).toEqual({
      performed: true,
      equivalent: true,
      detail: "old 2 / new 2 across 2 operation(s)",
    });
    // The live tracer stamps real ids, so linkage holds on every new record —
    // the property the old path structurally cannot have.
    expect(report.linkage.performed && report.linkage.equivalent).toBe(true);
    expect(report.unexplainedDiffs).toEqual([]);

    const out = writeShadowComparisonReport(proj, report);
    const parsed = JSON.parse(readFileSync(out, "utf-8"));
    expect(parsed.eventCount.equivalent).toBe(true);
    expect(typeof parsed.generatedAt).toBe("string");
  });

  test("divergence is visible in the report (a missing new span is named, not silent)", async () => {
    appendTelemetryEvent(proj, { kind: "operation", name: "orphan-op", startMs: 1, endMs: 2, ok: true });
    // The new path must exist for the comparison to run at all — an absent
    // store is COMPARISON NOT PERFORMED, a different verdict from divergence.
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("decision", async (s) => s.end());

    const report = buildShadowComparisonReport(proj);
    expect(report.eventCount.performed && !report.eventCount.equivalent).toBe(true);
    expect(report.unexplainedDiffs.join(" ")).toContain("orphan-op");
  });
});
