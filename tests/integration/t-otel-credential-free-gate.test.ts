// covers: otel:redaction otel:audit-log-exporter otel:local-span-exporter otel:local-log-exporter otel:local-metric-exporter
// size: medium
//
// U4 (local-exporters) — VER-2: the credential-free gate. A full emit sweep
// across every Signal Store (audit JSONL, Completed Span Store, diagnostic
// Log Store, Metric Store) must scan credential-free with the SAME pattern
// vocabulary as the redaction policy (BR-15/BR-16). The negative control
// proves the gate fails when a credential does reach an artifact.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalMetricExporter } from "../../dist/claude/.claude/otel/local-metric-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { emitDiagnostic, emitEvent, registerLoggerProvider, resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusMeter, registerMeterProvider, resetMeterProviderForTests } from "../../dist/claude/.claude/otel/meter-provider.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { scanForCredentials } from "../../dist/claude/.claude/otel/redaction.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const GH_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz012345";
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
const SK_TOKEN = "sk-abcdefghijklmnopqrstuvwxyz012345";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetMeterProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-u4-gate", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetMeterProviderForTests();
});

// Every telemetry artifact this unit's exporters can produce (BR-15).
function readAllArtifacts(): string {
  const bodies: string[] = [];
  for (const dir of [join(docsRoot(proj), "audit"), join(docsRoot(proj), ".amadeus-otel")]) {
    let names: string[] = [];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names.sort()) {
      if (name.endsWith(".jsonl") || name.endsWith(".log")) {
        bodies.push(readFileSync(join(dir, name), "utf-8"));
      }
    }
  }
  return bodies.join("\n");
}

describe("credential-free gate (VER-2)", () => {
  test("a full emit sweep across all four stores scans credential-free", async () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
    registerMeterProvider({ projectDir: proj, metricExporter: createLocalMetricExporter({ projectDir: proj }) });

    // Canonical path: denied key, opt-in Command with an embedded token, and
    // a safe free-text key carrying an AWS key — every smuggling route.
    emitEvent("amadeus.operation.failed", {
      Tool: "git",
      Command: `git clone https://x:${GH_TOKEN}@github.com/repo`,
      Error: "auth failed",
      Prompt: "secret prompt text",
      Details: `aws key ${AWS_KEY}`,
    });
    // Diagnostic path.
    emitDiagnostic("diag", { Note: `uses ${SK_TOKEN}`, Prompt: "secret prompt text" });
    // Span path.
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("sweep", async (span) => {
      span.setAttribute("Details", `token ${GH_TOKEN}`);
      span.setAttribute("Prompt", "secret prompt text");
      span.end();
    });
    // Metric path.
    const counter = getAmadeusMeter().createCounter("amadeus.events.total");
    counter.add(1, { Event: `fired ${AWS_KEY}`, Prompt: "secret prompt text" });

    const artifacts = readAllArtifacts();
    expect(artifacts.length).toBeGreaterThan(0);
    expect(scanForCredentials(artifacts)).toEqual([]);
    expect(artifacts).not.toContain(GH_TOKEN);
    expect(artifacts).not.toContain(AWS_KEY);
    expect(artifacts).not.toContain(SK_TOKEN);
    expect(artifacts).not.toContain("secret prompt text");
  });

  test("negative control: the gate FAILS when a credential reaches an artifact (not vacuous)", () => {
    const poisoned = `{"eventName":"x","attributes":{"Details":"leaked ${GH_TOKEN}"}}\n`;
    expect(scanForCredentials(poisoned)).toContain("github-token");
  });
});
