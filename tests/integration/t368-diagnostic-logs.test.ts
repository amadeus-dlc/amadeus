// covers: otel:logger-provider otel:local-log-exporter
//
// U10 (diagnostic-logs) — the fail-open diagnostic Log path (FR-MLM-2,
// FR-EXP-4, FR-EVT-6). Test-first order from business-logic-model.md:
//   1. routing — a diagnostic reaches the diagnostic Log Store and NOTHING
//      reaches the audit journal (BR-1)
//   2. correlation — a diagnostic emitted inside a span carries its
//      traceId/spanId, and a Context-less emit still stores the record (BR-3,
//      BR-9)
//   3. fail-open — a store failure never throws, never latches, notes the drop
//      on the warn sink with redacted values only, and never re-emits
//      (BR-2, BR-4, BR-10)
//   4. cross-process correlation — a child process that attached the W3C
//      carrier (U5) emits diagnostics on the parent's trace
// plus BR-8 (synchronously observable) and the performance-design invariant
// that emit performs exactly one store append and no timer.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager, injectToSubprocess } from "../../dist/claude/.claude/otel/context.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import {
  emitDiagnostic,
  registerLoggerProvider,
  resetLoggerProviderForTests,
} from "../../dist/claude/.claude/otel/logger-provider.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
  resetTracerProviderForTests,
} from "../../dist/claude/.claude/otel/tracer-provider.ts";
import {
  assertMutationAllowed,
  isFatalSet,
  resetFatalLatchForTests,
} from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { scanForCredentials } from "../../dist/claude/.claude/otel/redaction.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const BUN = process.execPath;
const CHILD = join(__dirname, "..", "helpers", "otel-diagnostic-child.ts");
const GH_TOKEN = `ghp_${"A1b2C3d4E5f6G7h8I9j0"}KLMNOP`;

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-diagnostic", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
});

function readShards(dir: string): string {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return "";
  }
  return names
    .filter((n) => n.endsWith(".jsonl"))
    .sort()
    .map((n) => readFileSync(join(dir, n), "utf-8"))
    .join("\n");
}

function storeDir(): string {
  return join(docsRoot(proj), ".amadeus-otel");
}

// Boot with the real store so BR-8 (readable the moment emit returns) is
// observed against the filesystem, not a spy.
function bootReal(): void {
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({ projectDir: proj }),
    logExporter: createLocalLogExporter({ projectDir: proj }),
  });
  registerTracerProvider({ spanExporter: createLocalSpanExporter({ projectDir: proj }) });
}

describe("routing: diagnostics reach the log store only (FR-EXP-4, BR-1)", () => {
  test("emitDiagnostic appends to the diagnostic Log Store and leaves the audit journal empty", () => {
    bootReal();
    emitDiagnostic("subprocess retry", { Note: "attempt 2" });
    const logs = readShards(storeDir());
    expect(logs).toContain("subprocess retry");
    expect(logs).toContain("attempt 2");
    expect(readShards(join(docsRoot(proj), "audit"))).not.toContain("subprocess retry");
  });

  test("the audit exporter is never invoked on the diagnostic path", () => {
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
        write: (_path, line) => {
          diagnostics.push(line);
        },
      }),
    });
    emitDiagnostic("free form note", { Note: "n" });
    expect(canonicalWrites).toBe(0);
    expect(diagnostics.length).toBe(1);
  });

  test("emit performs exactly one store append and installs no timer (performance-design)", () => {
    const writes: string[] = [];
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj, append: () => {} }),
      logExporter: createLocalLogExporter({
        projectDir: proj,
        storeDir: proj,
        write: (_path, line) => {
          writes.push(line);
        },
      }),
    });
    emitDiagnostic("one-append", { Note: "n" });
    expect(writes.length).toBe(1);
    const providerSrc = readFileSync(
      join(__dirname, "..", "..", "packages", "framework", "core", "otel", "logger-provider.ts"),
      "utf-8"
    );
    const exporterSrc = readFileSync(
      join(__dirname, "..", "..", "packages", "framework", "core", "otel", "local-log-exporter.ts"),
      "utf-8"
    );
    for (const src of [providerSrc, exporterSrc]) {
      expect(src).not.toMatch(/set(?:Timeout|Interval)\(/);
    }
  });
});

describe("trace correlation (FR-MLM-2, BR-3/BR-9)", () => {
  test("a diagnostic emitted inside an active span carries that span's traceId and spanId", async () => {
    bootReal();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("gate-wait", async (span) => {
      try {
        emitDiagnostic("inside span", { Note: "n" });
        const record = JSON.parse(
          readShards(storeDir())
            .trim()
            .split("\n")
            .filter((l) => l.includes("inside span"))[0]!
        );
        expect(record.traceId).toBe(span.spanContext().traceId);
        expect(record.spanId).toBe(span.spanContext().spanId);
      } finally {
        span.end();
      }
    });
  });

  test("with no active Context the ids are absent but the record is still stored (BR-9)", () => {
    bootReal();
    emitDiagnostic("no context", { Note: "n" });
    const record = JSON.parse(
      readShards(storeDir())
        .trim()
        .split("\n")
        .filter((l) => l.includes("no context"))[0]!
    );
    expect(record.traceId).toBeNull();
    expect(record.spanId).toBeNull();
    expect(record.name).toBe("no context");
  });

  test("the record is readable the moment emitDiagnostic returns — no batch, no flush (BR-8)", () => {
    bootReal();
    emitDiagnostic("immediately readable", { Note: "n" });
    expect(readShards(storeDir())).toContain("immediately readable");
  });
});

describe("fail-open on store failure (FR-EVT-6, BR-2/BR-4/BR-10)", () => {
  function bootFailing(warn: (message: string) => void, writes: string[]) {
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj, append: () => {} }),
      logExporter: createLocalLogExporter({
        projectDir: proj,
        storeDir: proj,
        warn,
        write: (_path, line) => {
          writes.push(line);
          throw new Error("store unavailable");
        },
      }),
    });
  }

  test("the failure never reaches the caller and never latches (workflow keeps running)", () => {
    const writes: string[] = [];
    bootFailing(() => {}, writes);
    expect(() => emitDiagnostic("dropped", { Note: "n" })).not.toThrow();
    expect(isFatalSet()).toBe(false);
    expect(() => assertMutationAllowed()).not.toThrow();
  });

  test("the drop is noted once on the warn sink and never re-emitted (BR-10)", () => {
    const notes: string[] = [];
    const writes: string[] = [];
    bootFailing((message) => notes.push(message), writes);
    emitDiagnostic("dropped", { Note: "n" });
    // Exactly one append attempt and exactly one note: no retry, no queue, and
    // no secondary emit that would recurse back into the failing store.
    expect(writes.length).toBe(1);
    expect(notes.length).toBe(1);
    expect(notes[0]).toContain("dropped");
    expect(notes[0]).toContain("store unavailable");
  });

  test("the note carries redacted values only — no raw attributes, no credentials", () => {
    const notes: string[] = [];
    const writes: string[] = [];
    bootFailing((message) => notes.push(message), writes);
    emitDiagnostic(`token ${GH_TOKEN}`, { Prompt: "secret prompt text", Note: `key ${GH_TOKEN}` });
    expect(notes.length).toBe(1);
    const note = notes[0]!;
    expect(note).not.toContain(GH_TOKEN);
    expect(note).not.toContain("secret prompt text");
    expect(scanForCredentials(note)).toEqual([]);
  });
});

describe("cross-process correlation through the W3C carrier (U5)", () => {
  test("a child process that attaches the carrier emits diagnostics on the parent's trace", async () => {
    bootReal();
    const tracer = getAmadeusTracer();
    let parentTraceId = "";
    await tracer.startActiveSpan("parent-operation", async (span) => {
      try {
        parentTraceId = span.spanContext().traceId;
        const r = Bun.spawnSync({
          cmd: [BUN, CHILD, proj],
          stdout: "ignore",
          stderr: "ignore",
          env: injectToSubprocess({ ...process.env }),
        });
        expect(r.exitCode).toBe(0);
      } finally {
        span.end();
      }
    });
    const child = readShards(storeDir())
      .trim()
      .split("\n")
      .filter((l) => l.includes("child-diagnostic"))
      .map((l) => JSON.parse(l));
    expect(child.length).toBe(1);
    expect(child[0].traceId).toBe(parentTraceId);
  });
});
