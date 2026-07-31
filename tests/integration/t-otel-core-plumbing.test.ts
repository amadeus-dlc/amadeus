// covers: otel:logger-provider otel:context otel:tracer-provider otel:event-registry otel:audit-log-exporter otel:shadow-compare tools:amadeus-journal
// size: medium
//
// The vendored-adjacent plumbing of the OTel path, driven in-process against
// the CANONICAL sources under packages/framework/core (the suites that assert
// behaviour import the shipped dist copies; these two module graphs carry
// separate singletons, so the canonical copy needs its own driver).
//
// Characterization, not new contract: every case pins behaviour the surrounding
// design already states — the api-logs bridge routes an unregistered eventName
// to a diagnostic and rethrows anything else (Phase 1 Logs API ADR), the
// context manager binds callables and can be torn down, a span reports whether
// it is still recording, and the registry's self-consistency rejections fire on
// a drifted set.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  type CanonicalEventRecord,
  createAuditLogExporter,
} from "../../packages/framework/core/otel/audit-log-exporter.ts";
import {
  clearIntentContextForTests,
  ensureContextManager,
  resetContextManagerForTests,
} from "../../packages/framework/core/otel/context.ts";
import {
  assertRegistryConsistent,
  type EventDef,
} from "../../packages/framework/core/otel/event-registry.ts";
import { resetFatalLatchForTests, verifyJournalHealth } from "../../packages/framework/core/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../packages/framework/core/otel/local-log-exporter.ts";
import { createLocalSpanExporter } from "../../packages/framework/core/otel/local-span-exporter.ts";
import {
  registerLoggerProvider,
  resetLoggerProviderForTests,
} from "../../packages/framework/core/otel/logger-provider.ts";
import { writeShadowComparisonReport } from "../../packages/framework/core/otel/shadow-compare.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
  resetTracerProviderForTests,
} from "../../packages/framework/core/otel/tracer-provider.ts";
import {
  JOURNAL_SCHEMA_VERSION_V2,
  type JournalEntryV2,
  serializeJournalEntryV2,
} from "../../packages/framework/core/tools/amadeus-journal.ts";
import { context, ROOT_CONTEXT } from "../../packages/framework/core/vendor/opentelemetry/api/index.js";
import { logs } from "../../packages/framework/core/vendor/opentelemetry/api-logs/index.js";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;

let proj: string;
let appended: CanonicalEventRecord[];
let diagnostics: string[];

function boot(): void {
  appended = [];
  diagnostics = [];
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({
      projectDir: proj,
      append: (record) => {
        appended.push(record as CanonicalEventRecord);
        return { appended: true, seq: appended.length };
      },
    }),
    logExporter: createLocalLogExporter({
      projectDir: proj,
      storeDir: join(proj, "logs"),
      write: (_path, line) => diagnostics.push(line),
    }),
  });
}

beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  clearIntentContextForTests();
  ensureContextManager();
  birthIntent(proj, "otel-core-plumbing", "default", "feature");
});

afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
});

describe("api-logs bridge — an OTel Logger lands on the same routing as emitEvent", () => {
  test("a registered eventName through the generic Logger surface reaches the audit exporter", () => {
    boot();
    const logger = logs.getLogger("test-scope");
    expect(logger.enabled()).toBe(true);
    logger.emit({ eventName: "amadeus.decision.recorded", attributes: { Stage: "code-generation", Decision: "approve" } });
    expect(appended).toHaveLength(1);
    expect(appended[0]?.eventName).toBe("amadeus.decision.recorded");
  });

  test("an unregistered eventName degrades to a diagnostic instead of throwing", () => {
    boot();
    logs.getLogger("test-scope").emit({ eventName: "not.a.registered.event", attributes: { a: 1 } });
    expect(appended).toHaveLength(0);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toContain("not.a.registered.event");
  });

  test("severityText names the event when eventName is absent", () => {
    boot();
    logs.getLogger("test-scope").emit({ severityText: "also.not.registered" });
    expect(diagnostics[0]).toContain("also.not.registered");
  });

  test("registering a second provider in one process is an invariant violation (NFR-3)", () => {
    boot();
    expect(() => boot()).toThrow(/registerLoggerProvider called twice/);
  });

  test("a non-registry failure (missing required attribute) is rethrown, not degraded", () => {
    boot();
    expect(() => logs.getLogger("test-scope").emit({ eventName: "amadeus.decision.recorded", attributes: {} })).toThrow(
      /missing required attribute/
    );
    expect(diagnostics).toHaveLength(0);
  });
});

describe("audit exporter accept-set (BR-13)", () => {
  test("a record stamped with a foreign schemaVersion is an invariant violation", () => {
    const exporter = createAuditLogExporter({ projectDir: proj, append: () => ({ appended: true, seq: 1 }) });
    expect(() =>
      exporter.exportCanonicalEvent({
        schemaVersion: JOURNAL_SCHEMA_VERSION_V2 + 1,
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventName: "amadeus.decision.recorded",
        attributes: { Stage: "code-generation", Decision: "approve" },
        intentId: "otel-core-plumbing",
        space: "default",
        cloneId: "abc123def456",
        traceId: null,
        spanId: null,
        traceFlags: 0,
        idempotencyKey: crypto.randomUUID(),
        durability: "canonical",
      })
    ).toThrow(/schemaVersion must be/);
  });
});

describe("context manager — bind and teardown", () => {
  test("bind wraps a callable so it runs under the bound context", () => {
    let seen: unknown = null;
    const bound = context.bind(ROOT_CONTEXT, function (this: { tag: string }, value: number) {
      seen = { tag: this.tag, value, active: context.active() === ROOT_CONTEXT };
      return value * 2;
    });
    expect(bound.call({ tag: "receiver" }, 21)).toBe(42);
    expect(seen).toEqual({ tag: "receiver", value: 21, active: true });
  });

  test("bind returns a non-callable target unchanged", () => {
    const target = { not: "callable" };
    expect(context.bind(ROOT_CONTEXT, target)).toBe(target);
  });

  test("disable tears the manager down; a fresh one can be stood back up", () => {
    context.disable();
    expect(context.active()).toBe(ROOT_CONTEXT);
    resetContextManagerForTests();
    ensureContextManager();
    expect(context.active()).toBe(ROOT_CONTEXT);
  });
});

describe("span surface", () => {
  test("addLinks records every link and isRecording flips at end", () => {
    const spans: { name: string; links: number }[] = [];
    const storeDir = mkdtempSync(join(tmpdir(), "otel-core-spans-"));
    try {
      registerTracerProvider({
        projectDir: storeDir,
        spanExporter: createLocalSpanExporter({
          projectDir: storeDir,
          storeDir,
          write: (_path, line) => {
            const record = JSON.parse(line);
            spans.push({ name: record.name, links: record.links.length });
          },
        }),
      });
      const span = getAmadeusTracer().startSpan("linked");
      span.addLinks([
        { context: { traceId: "a".repeat(32), spanId: "b".repeat(16), traceFlags: 1 } },
        { context: { traceId: "c".repeat(32), spanId: "d".repeat(16), traceFlags: 1 }, attributes: { why: "fan-in" } },
      ]);
      expect(span.isRecording()).toBe(true);
      span.end();
      expect(span.isRecording()).toBe(false);
      expect(spans).toEqual([{ name: "linked", links: 2 }]);
    } finally {
      rmSync(storeDir, { recursive: true, force: true });
    }
  });
});

describe("registry self-consistency rejections (VER-1)", () => {
  const canonical = (name: string, auditEvent: string): EventDef => ({
    name,
    auditEvent,
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: [],
    optionalAttributes: [],
    schemaVersion: 2,
  });
  const telemetry = (name: string): EventDef => ({
    name,
    auditEvent: null,
    durability: "telemetry",
    category: "telemetry",
    requiredAttributes: [],
    optionalAttributes: [],
    schemaVersion: 1,
  });

  test("the shipped registry passes", () => {
    expect(() => assertRegistryConsistent()).not.toThrow();
  });

  test("a duplicate event name is rejected", () => {
    const dup = canonical("x.dup", "X_DUP");
    expect(() => assertRegistryConsistent([dup, dup], 1)).toThrow(/duplicate event name/);
  });

  test("a telemetry def mapped to the audit journal is rejected", () => {
    const bad = { ...telemetry("x.tel"), auditEvent: "X_TEL" } as EventDef;
    expect(() => assertRegistryConsistent([bad], 0)).toThrow(/telemetry event mapped to the audit journal/);
  });

  test("a canonical def without an audit mapping is rejected", () => {
    const bad = { ...canonical("x.unmapped", "X"), auditEvent: null } as EventDef;
    expect(() => assertRegistryConsistent([bad], 0)).toThrow(/canonical event without an audit mapping/);
  });

  test("a duplicate audit mapping is rejected", () => {
    expect(() => assertRegistryConsistent([canonical("x.a", "SAME"), canonical("x.b", "SAME")], 1)).toThrow(
      /duplicate audit event mapping/
    );
  });

  test("a canonical def in the telemetry category is rejected", () => {
    const bad = { ...canonical("x.mis", "X_MIS"), category: "telemetry" } as EventDef;
    expect(() => assertRegistryConsistent([bad], 1)).toThrow(/misclassified as telemetry category/);
  });

  test("canonical cardinality drift is rejected", () => {
    expect(() => assertRegistryConsistent([canonical("x.only", "X_ONLY")], 2)).toThrow(/cardinality drift/);
  });
});

describe("shadow report persistence", () => {
  test("a project with no resolvable intent record refuses to write a report", () => {
    const bare = mkdtempSync(join(tmpdir(), "otel-core-bare-"));
    try {
      expect(() =>
        writeShadowComparisonReport(bare, { unexplainedDiffs: [] } as unknown as Parameters<
          typeof writeShadowComparisonReport
        >[1])
      ).toThrow(/no resolvable intent record/);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe("journal attribute validation", () => {
  test("an attribute value outside the JSON value set is refused", () => {
    const entry: JournalEntryV2 = {
      schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
      eventId: "evt-1",
      seq: 1,
      timestamp: "2026-07-31T00:00:00Z",
      eventName: "SENSOR_FIRED",
      attributes: { Stage: undefined },
      intentId: "otel-core-plumbing",
      space: "default",
      cloneId: "abc123def456",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: "otel-core-plumbing:abc123def456:1",
      canonical: true,
    };
    expect(() => serializeJournalEntryV2(entry)).toThrow(/attributes must be a plain object of JSON values/);
  });
});

describe("journal health probe", () => {
  test.skipIf(isRoot)("an unreadable shard reports a probe read failure rather than throwing", () => {
    const shardPath = join(proj, "unreadable.jsonl");
    writeFileSync(shardPath, "{}\n", "utf-8");
    chmodSync(shardPath, 0o000);
    try {
      const result = verifyJournalHealth({ shardPath, projectDir: proj });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.detail).toContain("probe read failed");
    } finally {
      chmodSync(shardPath, 0o644);
    }
  });
});
