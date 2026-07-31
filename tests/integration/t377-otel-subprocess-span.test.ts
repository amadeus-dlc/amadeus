// covers: otel:subprocess-span otel:tracer-provider otel:local-span-exporter
// size: medium
//
// The canonical subprocess-boundary span (FR-TRC-1/2). It is the Trace API
// replacement for the pre-OTel timing wrapper: same call shape, but the
// duration lands as a completed Span in the span store instead of a telemetry
// buffer row. The contract the migrating call sites depend on:
//   - observability off -> a pure no-op that still returns the spawn result
//   - the span is ALWAYS ended, including when the spawn itself throws
//     (startActiveSpan does not auto-end — FR-TRC-2)
//   - the exit code and the command token ride the span as attributes, with
//     the same semantics the legacy wrapper recorded (ok == exit 0,
//     "spawn-failed" when there is no result)
//   - the span is ACTIVE for the callback, so the W3C carrier injected into
//     the child env names this span (FR-TRC-5)
//   - attributes pass the write-time redaction layer, so a credential-shaped
//     command token never reaches the store raw (FR-DST-3/5)

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { resetObservabilityConfigCache } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import {
  clearIntentContextForTests,
  ensureContextManager,
  injectToSubprocess,
} from "../../dist/claude/.claude/otel/context.ts";
import { isFatalSet, resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { scanForCredentials } from "../../dist/claude/.claude/otel/redaction.ts";
import { observeSubprocessSpan } from "../../dist/claude/.claude/otel/subprocess-span.ts";
import { resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const GH_TOKEN = `ghp_${"A1b2C3d4E5f6G7h8I9j0"}KLMNOP`;

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  resetObservabilityConfigCache();
  clearIntentContextForTests();
  ensureContextManager();
  birthIntent(proj, "otel-subprocess-span", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  resetObservabilityConfigCache();
  clearIntentContextForTests();
});

function enableObservability(): void {
  writeFileSync(
    join(proj, "amadeus", "config.json"),
    JSON.stringify({ observability: { enabled: true } }),
    "utf-8"
  );
  resetObservabilityConfigCache();
}

type SpanRecord = {
  name: string;
  startMs: number;
  endMs: number;
  status: { code: string };
  attributes: Record<string, unknown>;
  events: { name: string }[];
};

function spanRecords(): SpanRecord[] {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const records: SpanRecord[] = [];
  for (const name of names.sort()) {
    if (!name.startsWith("spans-") || !name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, name), "utf-8").split("\n")) {
      if (line !== "") records.push(JSON.parse(line) as SpanRecord);
    }
  }
  return records;
}

describe("opt-in: disabled observability is a pure no-op", () => {
  test("the spawn result is returned and no span is stored", () => {
    const result = observeSubprocessSpan(proj, "git", () => ({ status: 0 }));
    expect(result).toEqual({ status: 0 });
    expect(spanRecords()).toEqual([]);
  });
});

describe("enabled: the subprocess boundary becomes a completed span", () => {
  test("a successful spawn stores one ended span carrying the command and exit code", () => {
    enableObservability();
    const result = observeSubprocessSpan(proj, "git", () => ({ status: 0 }));
    expect(result).toEqual({ status: 0 });
    const spans = spanRecords();
    expect(spans).toHaveLength(1);
    const span = spans[0] as SpanRecord;
    expect(span.name).toContain("git");
    expect(span.endMs).toBeGreaterThanOrEqual(span.startMs);
    expect(span.attributes.Command).toBe("git");
    expect(span.attributes.ExitCode).toBe("0");
  });

  test("Bun.spawnSync-shaped results are read through exitCode, not status", () => {
    enableObservability();
    observeSubprocessSpan(proj, "bun", () => ({ exitCode: 0 }));
    expect((spanRecords()[0] as SpanRecord).attributes.ExitCode).toBe("0");
  });

  test("a non-zero exit marks the span ERROR while the result still returns", () => {
    enableObservability();
    const result = observeSubprocessSpan(proj, "git", () => ({ status: 3 }));
    expect(result).toEqual({ status: 3 });
    const span = spanRecords()[0] as SpanRecord;
    expect(span.attributes.ExitCode).toBe("3");
    expect(span.status.code).toBe("2");
  });

  test("a spawn that throws still ends the span, records the exception and rethrows", () => {
    enableObservability();
    expect(() =>
      observeSubprocessSpan(proj, "git", () => {
        throw new Error("spawn ENOENT");
      })
    ).toThrow("spawn ENOENT");
    const span = spanRecords()[0] as SpanRecord;
    expect(span.endMs).toBeGreaterThanOrEqual(span.startMs);
    expect(span.attributes.ExitCode).toBe("spawn-failed");
    expect(span.status.code).toBe("2");
    expect(span.events.map((e) => e.name)).toContain("exception");
    // Spans are telemetry: a failed child never latches the journal (BR-5).
    expect(isFatalSet()).toBe(false);
  });
});

describe("the span is active for the callback (FR-TRC-5)", () => {
  test("the W3C carrier injected inside the callback names this span", () => {
    enableObservability();
    let traceparent: string | undefined;
    observeSubprocessSpan(proj, "relay", () => {
      traceparent = injectToSubprocess({ ...process.env }).TRACEPARENT;
      return { exitCode: 0 };
    });
    const span = spanRecords()[0] as SpanRecord & { traceId: string; spanId: string };
    expect(traceparent).toBe(`00-${span.traceId}-${span.spanId}-01`);
  });
});

describe("write-time redaction (FR-DST-3/5)", () => {
  test("a credential-shaped command token is scrubbed and unknown keys never land", () => {
    enableObservability();
    observeSubprocessSpan(proj, `gh auth ${GH_TOKEN}`, () => ({ status: 0 }));
    const span = spanRecords()[0] as SpanRecord;
    expect(scanForCredentials(JSON.stringify(span))).toEqual([]);
    expect(String(span.attributes.Command)).toContain("[REDACTED]");
    expect(span.attributes.Argv).toBeUndefined();
  });
});
