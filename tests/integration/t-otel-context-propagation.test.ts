// covers: otel:context otel:tracer-provider
//
// U5 (context-propagation) — productionized W3C Trace Context propagation:
// 3-level parent→child→grandchild trace chain across real processes (BR-3),
// cross-process Intent Trace Context restore (FR-TRC-4) with BR-6 mixed-period
// minting, fail-open extraction with a diagnostic log (BR-5), carrier content
// restricted to correlation IDs (BR-4), and context isolation under Promise.all.

import { describe, expect, test } from "bun:test";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { context, trace } from "../../dist/claude/.claude/vendor/opentelemetry/api/index.js";
import type { Span } from "../../dist/claude/.claude/vendor/opentelemetry/api/index.js";
import {
  attachIntentContext,
  attachRemoteParentFromEnv,
  clearIntentContextForTests,
  currentIntentContext,
  ensureContextManager,
  extractTraceparent,
  injectToSubprocess,
  INTENT_CONTEXT_SCHEMA_VERSION,
  persistIntentContext,
  restoreIntentContext,
} from "../../dist/claude/.claude/otel/context.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
  resetTracerProviderForTests,
} from "../../dist/claude/.claude/otel/tracer-provider.ts";

const BUN = process.execPath;
const CHAIN_CHILD = join(__dirname, "..", "helpers", "otel-trace-chain-child.ts");
const RESTORE_CHILD = join(__dirname, "..", "helpers", "otel-restore-child.ts");

type SpanRecord = { name: string; traceId: string; spanId: string; parentSpanId: string | null };

function readSpanRecords(storeFile: string): SpanRecord[] {
  return readFileSync(storeFile, "utf-8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const r = JSON.parse(l);
      return { name: r.name, traceId: r.traceId, spanId: r.spanId, parentSpanId: r.parentSpanId };
    });
}

function bootInProcess(projectDir: string, storeFile: string) {
  resetTracerProviderForTests();
  clearIntentContextForTests();
  ensureContextManager();
  registerTracerProvider({
    projectDir,
    spanExporter: createLocalSpanExporter({
      projectDir,
      storeDir: storeFile,
      write: (_path, line) => appendFileSync(storeFile, line, "utf-8"),
    }),
  });
  return getAmadeusTracer();
}

describe("3-level parent→child→grandchild trace chain (BR-3, FR-TRC-5)", () => {
  test("trace id matches and parent span ids chain across real processes", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-chain-"));
    const storeFile = join(dir, "spans.jsonl");
    try {
      const tracer = bootInProcess(dir, storeFile);
      tracer.startActiveSpan("chain-root", (root: Span) => {
        try {
          const r = Bun.spawnSync({
            cmd: [BUN, CHAIN_CHILD, storeFile, "child", "grandchild"],
            env: injectToSubprocess({ ...process.env }),
            stdout: "ignore",
            stderr: "ignore",
          });
          expect(r.exitCode).toBe(0);
        } finally {
          root.end();
        }
      });
      const records = readSpanRecords(storeFile);
      expect(records.length).toBe(3);
      const root = records.find((r) => r.name === "chain-root")!;
      const child = records.find((r) => r.name === "chain-child")!;
      const grandchild = records.find((r) => r.name === "chain-grandchild")!;
      expect(child.traceId).toBe(root.traceId);
      expect(grandchild.traceId).toBe(root.traceId);
      expect(root.parentSpanId).toBeNull();
      expect(child.parentSpanId).toBe(root.spanId);
      expect(grandchild.parentSpanId).toBe(child.spanId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a malformed carrier fails open: new root trace plus a diagnostic note (BR-5)", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-chain-bad-"));
    const storeFile = join(dir, "spans.jsonl");
    try {
      const r = Bun.spawnSync({
        cmd: [BUN, CHAIN_CHILD, storeFile, "orphan"],
        env: { ...process.env, TRACEPARENT: "not-a-w3c-traceparent" },
        stdout: "ignore",
        stderr: "ignore",
      });
      expect(r.exitCode).toBe(0);
      const records = readSpanRecords(storeFile);
      expect(records.length).toBe(1);
      // Rejected carrier -> the child opened its own root trace (fail-open).
      expect(records[0]!.parentSpanId).toBeNull();
      expect(records[0]!.traceId).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cross-process Intent Trace Context restore (FR-TRC-4, BR-6)", () => {
  test("a context persisted here restores verbatim in a separate process", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-restore-"));
    try {
      persistIntentContext(dir, {
        traceId: "0123456789abcdef0123456789abcdef",
        anchorSpanId: "0123456789abcdef",
        intentId: "260729-xproc",
        schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
      });
      const r = Bun.spawnSync({
        cmd: [BUN, RESTORE_CHILD, dir, "260729-xproc"],
        env: { ...process.env },
        stdout: "pipe",
        stderr: "ignore",
      });
      expect(r.exitCode).toBe(0);
      expect(JSON.parse(r.stdout.toString())).toEqual({
        traceId: "0123456789abcdef0123456789abcdef",
        anchorSpanId: "0123456789abcdef",
        intentId: "260729-xproc",
        schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a missing record mints and persists a fresh anchor with a diagnostic note (BR-6)", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-mint-"));
    try {
      const r = Bun.spawnSync({
        cmd: [BUN, RESTORE_CHILD, dir, "260729-legacy"],
        env: { ...process.env },
        stdout: "pipe",
        stderr: "ignore",
      });
      expect(r.exitCode).toBe(0);
      const minted = JSON.parse(r.stdout.toString());
      expect(minted.intentId).toBe("260729-legacy");
      expect(minted.traceId).toMatch(/^[0-9a-f]{32}$/);
      expect(minted.anchorSpanId).toMatch(/^[0-9a-f]{16}$/);
      expect(minted.schemaVersion).toBe(INTENT_CONTEXT_SCHEMA_VERSION);
      // Persisted: a later in-process restore reads the same anchor back.
      expect(restoreIntentContext(dir, "260729-legacy")).toEqual(minted);
      // Not silent: the mint is noted in the diagnostic log (BR-5/BR-6).
      const diag = readFileSync(join(dir, ".amadeus-otel", "diagnostics.log"), "utf-8");
      expect(diag).toContain("minted a new anchor");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a U1-era legacy JSONL record (no schemaVersion) still restores (mixed period)", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-legacy-"));
    try {
      const store = join(dir, ".amadeus-otel");
      mkdirSync(store, { recursive: true });
      appendFileSync(
        join(store, "intent-context.json"),
        `${JSON.stringify({ traceId: "aaaa567890abcdef0123456789abcdef", anchorSpanId: "bbbb567890abcdef", intentId: "260729-old" })}\n`,
        "utf-8"
      );
      const restored = restoreIntentContext(dir, "260729-old");
      expect(restored).toEqual({
        traceId: "aaaa567890abcdef0123456789abcdef",
        anchorSpanId: "bbbb567890abcdef",
        intentId: "260729-old",
        schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("persist keeps one record per intent — no append-log proliferation", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-onerec-"));
    try {
      const base = { anchorSpanId: "0123456789abcdef", intentId: "260729-one", schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION };
      persistIntentContext(dir, { ...base, traceId: "11111111111111111111111111111111" });
      persistIntentContext(dir, { ...base, traceId: "22222222222222222222222222222222" });
      const files = readdirSync(join(dir, ".amadeus-otel")).filter((f) => f.startsWith("intent-context-"));
      expect(files).toEqual(["intent-context-260729-one.json"]);
      expect(restoreIntentContext(dir, "260729-one").traceId).toBe("22222222222222222222222222222222");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("env carrier attach and content rules (BR-4, BR-5)", () => {
  test("attachRemoteParentFromEnv rejects a malformed carrier with a diagnostic note", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-diag-"));
    try {
      clearIntentContextForTests();
      const ok = attachRemoteParentFromEnv({ TRACEPARENT: "garbage" }, { diagDir: dir });
      expect(ok).toBe(false);
      expect(currentIntentContext()).toBeNull();
      const diag = readFileSync(join(dir, ".amadeus-otel", "diagnostics.log"), "utf-8");
      expect(diag).toContain("traceparent extraction failed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an absent carrier is the normal case: no attach, no diagnostic", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-nodiag-"));
    try {
      clearIntentContextForTests();
      expect(attachRemoteParentFromEnv({}, { diagDir: dir })).toBe(false);
      expect(existsSync(join(dir, ".amadeus-otel", "diagnostics.log"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the carrier adds only the TRACEPARENT key — correlation IDs, nothing else (BR-4)", () => {
    clearIntentContextForTests();
    attachIntentContext({
      traceId: "0123456789abcdef0123456789abcdef",
      anchorSpanId: "0123456789abcdef",
      intentId: "i",
      schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
    });
    const env = injectToSubprocess({ FOO: "bar" });
    expect(Object.keys(env).sort()).toEqual(["FOO", "TRACEPARENT"]);
    expect(env.TRACEPARENT).toBe("00-0123456789abcdef0123456789abcdef-0123456789abcdef-01");
    expect(env.TRACEPARENT!.length).toBe(55); // fixed W3C traceparent size
  });
});

describe("context isolation under Promise.all (FR-TRC-3)", () => {
  test("concurrent siblings inject their own span id on the shared trace id", async () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-par-"));
    const storeFile = join(dir, "spans.jsonl");
    try {
      const tracer = bootInProcess(dir, storeFile);
      const injected: Record<string, string | undefined> = {};
      await tracer.startActiveSpan("parent", async (parent: Span) => {
        try {
          await Promise.all([
            tracer.startActiveSpan("sib-a", async (s: Span) => {
              try {
                await new Promise((r) => setTimeout(r, 5));
                injected.a = injectToSubprocess({}).TRACEPARENT;
              } finally {
                s.end();
              }
            }),
            tracer.startActiveSpan("sib-b", async (s: Span) => {
              try {
                await new Promise((r) => setTimeout(r, 1));
                injected.b = injectToSubprocess({}).TRACEPARENT;
              } finally {
                s.end();
              }
            }),
          ]);
        } finally {
          parent.end();
        }
      });
      const records = readSpanRecords(storeFile);
      const a = records.find((r) => r.name === "sib-a")!;
      const b = records.find((r) => r.name === "sib-b")!;
      const parent = records.find((r) => r.name === "parent")!;
      // Same trace, distinct spans, each carrier pointing at its own span.
      expect(a.traceId).toBe(parent.traceId);
      expect(b.traceId).toBe(parent.traceId);
      expect(injected.a).toBe(`00-${a.traceId}-${a.spanId}-01`);
      expect(injected.b).toBe(`00-${b.traceId}-${b.spanId}-01`);
      expect(a.spanId).not.toBe(b.spanId);
      // Sibling isolation: each span's parent is the shared parent, never the sibling.
      expect(a.parentSpanId).toBe(parent.spanId);
      expect(b.parentSpanId).toBe(parent.spanId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("parallel persist/restore of two intents in one record dir stay isolated", async () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-twointent-"));
    try {
      await Promise.all([
        Promise.resolve().then(() =>
          persistIntentContext(dir, {
            traceId: "11111111111111111111111111111111",
            anchorSpanId: "1111111111111111",
            intentId: "intent-a",
            schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
          })
        ),
        Promise.resolve().then(() =>
          persistIntentContext(dir, {
            traceId: "22222222222222222222222222222222",
            anchorSpanId: "2222222222222222",
            intentId: "intent-b",
            schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
          })
        ),
      ]);
      expect(restoreIntentContext(dir, "intent-a").traceId).toBe("11111111111111111111111111111111");
      expect(restoreIntentContext(dir, "intent-b").traceId).toBe("22222222222222222222222222222222");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("remote parent joins new spans to the intent trace (BR-3)", () => {
  test("a span started after env attach is a child of the remote parent", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-remote-"));
    const storeFile = join(dir, "spans.jsonl");
    try {
      const tracer = bootInProcess(dir, storeFile);
      attachRemoteParentFromEnv({
        TRACEPARENT: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
      });
      const span = tracer.startSpan("hook-root");
      span.end();
      const records = readSpanRecords(storeFile);
      expect(records.length).toBe(1);
      expect(records[0]!.traceId).toBe("0123456789abcdef0123456789abcdef");
      expect(records[0]!.parentSpanId).toBe("0123456789abcdef");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an active span still wins over the process remote parent on inject", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-active-"));
    const storeFile = join(dir, "spans.jsonl");
    try {
      const tracer = bootInProcess(dir, storeFile);
      attachRemoteParentFromEnv({
        TRACEPARENT: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
      });
      tracer.startActiveSpan("op", (span: Span) => {
        try {
          const extracted = extractTraceparent(injectToSubprocess({}));
          expect(extracted!.traceId).toBe(span.spanContext().traceId);
          expect(extracted!.spanId).toBe(span.spanContext().spanId);
        } finally {
          span.end();
        }
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("no context anywhere: a new span opens a fresh root and inject stays silent", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-fresh-"));
    const storeFile = join(dir, "spans.jsonl");
    try {
      const tracer = bootInProcess(dir, storeFile);
      expect(trace.getSpan(context.active())).toBeUndefined();
      const span = tracer.startSpan("fresh-root");
      span.end();
      const records = readSpanRecords(storeFile);
      expect(records[0]!.parentSpanId).toBeNull();
      clearIntentContextForTests();
      expect(injectToSubprocess({}).TRACEPARENT).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
