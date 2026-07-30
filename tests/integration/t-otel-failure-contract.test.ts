// covers: otel:fatal-latch otel:audit-log-exporter otel:logger-provider
//
// U1 (otel-walking-skeleton) test-first order 1/4 — the failure contract
// (VER-3, FR-EVT-3/4/5/6): canonical write failure is ALWAYS a synchronous
// exception AND a fatal-latch set (never one without the other); a latch set
// in-process is never cleared, even across an intermediate layer that
// swallows the exception; the journal health probe never dirties the
// canonical journal; telemetry failures are fail-open.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  JOURNAL_SCHEMA_VERSION,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import {
  assertMutationAllowed,
  fatalReason,
  isFatalSet,
  resetFatalLatchForTests,
  setFatal,
  verifyJournalHealth,
} from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { getEventDef } from "../../dist/claude/.claude/otel/event-registry.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import {
  emitEvent,
  registerLoggerProvider,
  resetLoggerProviderForTests,
} from "../../dist/claude/.claude/otel/logger-provider.ts";
import {
  cleanupTestProject,
  createTestProject,
} from "../harness/fixtures.ts";

const IDENTITY = { schemaVersion: JOURNAL_SCHEMA_VERSION, cloneId: "abc123def456", intentId: "260729-demo-1234abcd" };
const line = (seq: number, event: string) =>
  serializeJournalEntry({ ...IDENTITY, seq, timestamp: "2026-07-29T10:00:00Z", heading: event, event, fields: {} });

function canonicalRecord() {
  const def = getEventDef("amadeus.decision.recorded");
  return {
    schemaVersion: 1,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventName: def.name,
    attributes: { Stage: "code-generation", Decision: "approve" },
    intentId: IDENTITY.intentId,
    space: "default",
    cloneId: IDENTITY.cloneId,
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: crypto.randomUUID(),
    durability: "canonical" as const,
  };
}

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
});

describe("canonical write failure — synchronous exception AND fatal latch (FR-EVT-3)", () => {
  test("a failing append throws synchronously and sets the latch — both, never one alone", () => {
    const exporter = createAuditLogExporter({
      projectDir: proj,
      append: () => {
        throw new Error("disk full");
      },
    });
    expect(() => exporter.exportCanonicalEvent(canonicalRecord())).toThrow("disk full");
    expect(isFatalSet()).toBe(true);
    expect(fatalReason()).toContain("disk full");
  });

  test("a successful append throws nothing and leaves the latch unset", () => {
    const exporter = createAuditLogExporter({ projectDir: proj, append: () => {} });
    exporter.exportCanonicalEvent(canonicalRecord());
    expect(isFatalSet()).toBe(false);
    expect(() => assertMutationAllowed()).not.toThrow();
  });

  test("an intermediate layer that swallows the emit exception cannot unblock later mutations (FR-EVT-4)", () => {
    const exporter = createAuditLogExporter({
      projectDir: proj,
      append: () => {
        throw new Error("io error");
      },
    });
    // The wrapper catches and swallows — the latch must still refuse mutations.
    try {
      exporter.exportCanonicalEvent(canonicalRecord());
    } catch {
      // swallowed by an intermediate layer
    }
    expect(() => assertMutationAllowed()).toThrow(/fatal/i);
    // And a later successful-looking operation does not clear it either.
    const healthy = createAuditLogExporter({ projectDir: proj, append: () => {} });
    healthy.exportCanonicalEvent(canonicalRecord());
    expect(() => assertMutationAllowed()).toThrow(/fatal/i);
  });

  test("the latch exposes no in-process clear: set twice, still refused, first reason retained", () => {
    setFatal("first failure");
    setFatal("second failure");
    expect(isFatalSet()).toBe(true);
    expect(fatalReason()).toContain("first failure");
    expect(() => assertMutationAllowed()).toThrow(/fatal/i);
  });
});

describe("journal health probe — non-destructive (FR-EVT-5)", () => {
  function shardPath(lines: string[]): string {
    const dir = join(proj, "probe");
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "shard.jsonl");
    writeFileSync(p, lines.join(""), "utf-8");
    return p;
  }

  test("a healthy shard verifies ok and gains NO record (canonical journal untouched)", () => {
    const p = shardPath([line(1, "STAGE_STARTED"), line(2, "STAGE_COMPLETED")]);
    const before = readFileSync(p, "utf-8");
    const result = verifyJournalHealth({ shardPath: p, projectDir: proj });
    expect(result.ok).toBe(true);
    expect(readFileSync(p, "utf-8")).toBe(before);
  });

  test("an empty shard is healthy (nothing written yet)", () => {
    const p = shardPath([]);
    expect(verifyJournalHealth({ shardPath: p, projectDir: proj }).ok).toBe(true);
  });

  test("an unparseable line fails the probe", () => {
    const p = shardPath([line(1, "STAGE_STARTED"), "not-json\n"]);
    const result = verifyJournalHealth({ shardPath: p, projectDir: proj });
    expect(result.ok).toBe(false);
  });

  test("a sequence regression fails the probe", () => {
    const p = shardPath([line(2, "STAGE_COMPLETED"), line(1, "STAGE_STARTED")]);
    const result = verifyJournalHealth({ shardPath: p, projectDir: proj });
    expect(result.ok).toBe(false);
  });

  test("a missing shard path fails closed with a detail", () => {
    const result = verifyJournalHealth({ shardPath: join(proj, "no-such-shard.jsonl"), projectDir: proj });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail.length).toBeGreaterThan(0);
  });
});

describe("telemetry failure is fail-open (FR-EVT-6)", () => {
  test("a diagnostic log write failure never throws and never sets the latch", () => {
    const exporter = createLocalLogExporter({
      projectDir: proj,
      write: () => {
        throw new Error("store unavailable");
      },
    });
    expect(() =>
      exporter.exportLog({ name: "diag", timestamp: new Date().toISOString(), attributes: {}, traceId: null, spanId: null })
    ).not.toThrow();
    expect(isFatalSet()).toBe(false);
    expect(() => assertMutationAllowed()).not.toThrow();
  });
});

describe("emitEvent failure contract through the logger provider", () => {
  test("canonical emit failure propagates synchronously and sets the latch", () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({
        projectDir: proj,
        append: () => {
          throw new Error("append failed");
        },
      }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    expect(() => emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "d" })).toThrow("append failed");
    expect(isFatalSet()).toBe(true);
  });

  test("an unregistered event name is an invariant exception and does NOT set the latch", () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj, append: () => {} }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    expect(() => emitEvent("amadeus.unregistered.event", { Stage: "s" })).toThrow(/unregistered|unknown/i);
    expect(isFatalSet()).toBe(false);
  });

  test("a missing required attribute is an invariant exception (BR-9) and does NOT set the latch", () => {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj, append: () => {} }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    expect(() => emitEvent("amadeus.decision.recorded", { Stage: "s" })).toThrow(/Decision/);
    expect(isFatalSet()).toBe(false);
  });

  test("a telemetry-classified event never reaches the audit exporter (FR-EXP-4 separation)", () => {
    let canonicalWrites = 0;
    const diagnostics: string[] = [];
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({
        projectDir: proj,
        append: () => {
          canonicalWrites++;
        },
      }),
      logExporter: createLocalLogExporter({
        projectDir: proj,
        storeDir: proj,
        write: (_path, lineOut) => {
          diagnostics.push(lineOut);
        },
      }),
    });
    emitEvent("amadeus.diagnostic.note", { Note: "n" });
    expect(canonicalWrites).toBe(0);
    expect(diagnostics.length).toBe(1);
  });

});
