// covers: otel:audit-log-exporter otel:logger-provider otel:redaction
// size: medium
//
// U4 (local-exporters) — the hardened AuditLogExporter: journal schema v2
// codec persistence (BR-13), the registry-validated accept set (BR-10),
// emit-complete observability for a same-process reader (FR-JRN-3), the
// unified canonical failure contract across ALL failure paths (BR-4/BR-14),
// and the export-boundary redaction layer (FR-DST-3 layer 2).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { auditBlockField, findAllEvents, readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  isJournalEntryV2,
  type JournalEntryV2,
  JOURNAL_SCHEMA_VERSION_V2,
  readJournalRecords,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import {
  type AuditLogExporter,
  type CanonicalEventRecord,
  createAuditLogExporter,
} from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import type { RegisteredEventName } from "../../dist/claude/.claude/otel/event-registry.ts";
import { isFatalSet, resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { emitEvent, registerLoggerProvider, resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusTracer, registerTracerProvider, resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-u4", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
});

function auditRecords(): JournalEntryV2[] {
  const dir = join(docsRoot(proj), "audit");
  const records: JournalEntryV2[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    for (const record of readJournalRecords(readFileSync(join(dir, name), "utf-8"))) {
      if (isJournalEntryV2(record)) records.push(record);
    }
  }
  return records;
}

function v2Record(overrides: Partial<CanonicalEventRecord> = {}): CanonicalEventRecord {
  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventName: "amadeus.decision.recorded",
    attributes: { Stage: "code-generation", Decision: "approve" },
    intentId: "otel-u4",
    space: "default",
    cloneId: "abc123def456",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: crypto.randomUUID(),
    durability: "canonical",
    ...overrides,
  };
}

describe("schema v2 codec persistence (BR-13) and emit-complete observability (FR-JRN-3)", () => {
  test("an emitted canonical event lands as a v2 journal record, readable by a same-process reader the moment emit returns", () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    emitEvent("amadeus.decision.recorded", { Stage: "code-generation", Decision: "approve" });
    // No flush, no batch timer, no span end: the record is observable NOW.
    const records = auditRecords();
    expect(records.length).toBe(1);
    const record = records[0]!;
    expect(record.schemaVersion).toBe(JOURNAL_SCHEMA_VERSION_V2);
    expect(record.eventName).toBe("amadeus.decision.recorded");
    expect(record.attributes).toEqual({
      Stage: "code-generation",
      Decision: "approve",
      // The v1 audit event type rides as an attribute for mixed-shard interop.
      Event: "DECISION_RECORDED",
    });
    expect(record.eventId).toBeTruthy();
    expect(record.idempotencyKey).toBeTruthy();
    expect(record.canonical).toBe(true);
    expect(record.seq).toBe(1);
  });

  test("trace correlation rides the v2 record natively when emitted inside a span (FR-TRC-6)", async () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    registerTracerProvider({ spanExporter: createLocalSpanExporter({ projectDir: proj }) });
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("gate-wait", async (span) => {
      try {
        emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "d" });
        const record = auditRecords()[0]!;
        expect(record.traceId).toBe(span.spanContext().traceId);
        expect(record.spanId).toBe(span.spanContext().spanId);
      } finally {
        span.end();
      }
    });
  });
});

describe("registry-validated accept set (BR-10) — violations throw WITHOUT the latch", () => {
  test("an unregistered event name is refused before append", () => {
    const exporter: AuditLogExporter = createAuditLogExporter({ projectDir: proj, append: () => {} });
    expect(() => exporter.exportCanonicalEvent(v2Record({ eventName: "amadeus.not.registered" as RegisteredEventName }))).toThrow(
      /unregistered/i
    );
    expect(isFatalSet()).toBe(false);
  });

  test("a record missing a registry-required attribute is refused before append", () => {
    const exporter = createAuditLogExporter({ projectDir: proj, append: () => {} });
    expect(() => exporter.exportCanonicalEvent(v2Record({ attributes: { Stage: "s" } }))).toThrow(/Decision/);
    expect(isFatalSet()).toBe(false);
  });

  test("a telemetry-classified event is refused — the audit exporter accepts canonical defs only (FR-EXP-4)", () => {
    const exporter = createAuditLogExporter({ projectDir: proj, append: () => {} });
    expect(() => exporter.exportCanonicalEvent(v2Record({ eventName: "amadeus.diagnostic.note", attributes: {} }))).toThrow(
      /telemetry|canonical/i
    );
    expect(isFatalSet()).toBe(false);
  });

  test("a non-JSON attribute value is a codec invariant error, not a write failure (no latch)", () => {
    const exporter = createAuditLogExporter({ projectDir: proj, append: () => {} });
    const record = v2Record({ attributes: { Stage: "s", Decision: "d", Details: () => 1 } });
    expect(() => exporter.exportCanonicalEvent(record)).toThrow(/JSON|attributes/i);
    expect(isFatalSet()).toBe(false);
  });
});

describe("unified canonical failure contract (BR-4/BR-14)", () => {
  test("a disk failure through the REAL locked append throws synchronously AND sets the latch", () => {
    // Block the audit directory with a plain file so the default append's
    // mkdir/append fails fast — this exercises the real lock -> seq -> codec
    // -> append path, not an injected seam.
    writeFileSync(join(docsRoot(proj), "audit"), "blocked", "utf-8");
    const exporter = createAuditLogExporter({ projectDir: proj });
    expect(() => exporter.exportCanonicalEvent(v2Record())).toThrow();
    expect(isFatalSet()).toBe(true);
  });
});

describe("export-boundary redaction (FR-DST-3 layer 2)", () => {  test("denied keys are dropped and credential values scrubbed even when write-time filtering was bypassed", () => {
    const exporter = createAuditLogExporter({ projectDir: proj });
    exporter.exportCanonicalEvent(
      v2Record({
        attributes: {
          Stage: "s",
          Decision: "d",
          Prompt: "secret prompt text",
          Details: "aws key AKIAIOSFODNN7EXAMPLE leaked",
        },
      })
    );
    const record = auditRecords()[0]!;
    expect("Prompt" in record.attributes).toBe(false);
    expect(JSON.stringify(record.attributes)).not.toContain("secret prompt text");
    expect(JSON.stringify(record.attributes)).not.toContain("AKIAIOSFODNN7EXAMPLE");
  });

  test("an opted-in Command value is stored scrubbed, never as raw argv (FR-DST-4/5)", () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    const token = "ghp_abcdefghijklmnopqrstuvwxyz012345";
    emitEvent("amadeus.operation.failed", {
      Tool: "git",
      Command: `git clone https://x:${token}@github.com/repo`,
      Error: "auth failed",
    });
    const record = auditRecords()[0]!;
    expect(record.eventName).toBe("amadeus.operation.failed");
    expect(typeof record.attributes.Command).toBe("string");
    expect(JSON.stringify(record.attributes)).not.toContain(token);
  });
});

describe("mixed-shard interop: v2 rows stay visible to the legacy ledger readers", () => {
  // The v2 writer (U4) lands BEFORE the reader swap (U6): live audit shards
  // become mixed v1/v2 the moment amadeus-log emits. The presence ledger
  // (one-answer-per-turn) and findAllEvents must still see the events the
  // emit path writes, or the human-presence gate silently opens (t188).
  test("an emitted QUESTION_ANSWERED is visible through findAllEvents and auditBlockField", () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    emitEvent("amadeus.question.answered", { Stage: "feasibility", Details: "my answer" });
    const body = readAllAuditShards(proj);
    const hits = findAllEvents(body, "QUESTION_ANSWERED");
    expect(hits.length).toBe(1);
    expect(auditBlockField(hits[0]!.block, "Stage")).toBe("feasibility");
    expect(auditBlockField(hits[0]!.block, "Details")).toBe("my answer");
    expect(auditBlockField(hits[0]!.block, "Timestamp")).toBeTruthy();
  });
});
