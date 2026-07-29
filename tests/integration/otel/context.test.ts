// covers: otel:context otel:tracer-provider
//
// U1 (otel-walking-skeleton) test-first order 2/4 — Context maintained and
// isolated across async/Promise concurrency (FR-TRC-3, BR-8b), the
// startActiveSpan no-auto-end contract (FR-TRC-2, BR-7), Intent Trace Context
// persist/restore (FR-TRC-4), and W3C Trace Context subprocess injection
// (FR-TRC-5 minimal).

import { describe, expect, test } from "bun:test";
import { context, trace } from "../../../dist/claude/.claude/vendor/opentelemetry/api/index.js";
import type { Span } from "../../../dist/claude/.claude/vendor/opentelemetry/api/index.js";
import {
  attachIntentContext,
  clearIntentContextForTests,
  currentIntentContext,
  ensureContextManager,
  extractTraceparent,
  injectToSubprocess,
  persistIntentContext,
  restoreIntentContext,
} from "../../../dist/claude/.claude/otel/context.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
  resetTracerProviderForTests,
} from "../../../dist/claude/.claude/otel/tracer-provider.ts";
import { createLocalSpanExporter } from "../../../dist/claude/.claude/otel/local-span-exporter.ts";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

function boot() {
  resetTracerProviderForTests();
  clearIntentContextForTests();
  ensureContextManager();
  const spans: { name: string; traceId: string; spanId: string; parentSpanId: string | null }[] = [];
  const storeDir = mkdtempSync(join(tmpdir(), "otel-span-store-"));
  registerTracerProvider({
    spanExporter: createLocalSpanExporter({
      projectDir: storeDir,
      storeDir,
      write: (_path, line) => {
        const r = JSON.parse(line);
        spans.push({ name: r.name, traceId: r.traceId, spanId: r.spanId, parentSpanId: r.parentSpanId });
      },
    }),
  });
  return spans;
}

describe("Context maintained and isolated across async boundaries (FR-TRC-3)", () => {
  test("await boundary: child sees the parent span context", async () => {
    boot();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("parent", async (parent: Span) => {
      try {
        await new Promise((r) => setTimeout(r, 1));
        const active = trace.getSpan(context.active());
        expect(active?.spanContext().spanId).toBe(parent.spanContext().spanId);
      } finally {
        parent.end();
      }
    });
  });

  test("Promise.all: siblings share the parent but do not pollute each other", async () => {
    boot();
    const tracer = getAmadeusTracer();
    const seen: Record<string, { self: string; parent: string }> = {};
    await tracer.startActiveSpan("parent", async (parent: Span) => {
      try {
        await Promise.all([
          tracer.startActiveSpan("sib-a", async (s: Span) => {
            try {
              await new Promise((r) => setTimeout(r, 5));
              seen.a = { self: s.spanContext().spanId, parent: trace.getSpan(context.active())!.spanContext().spanId };
            } finally {
              s.end();
            }
          }),
          tracer.startActiveSpan("sib-b", async (s: Span) => {
            try {
              await new Promise((r) => setTimeout(r, 1));
              seen.b = { self: s.spanContext().spanId, parent: trace.getSpan(context.active())!.spanContext().spanId };
            } finally {
              s.end();
            }
          }),
        ]);
      } finally {
        parent.end();
      }
    });
    expect(seen.a!.self).toBe(seen.a!.parent); // still inside own span after await
    expect(seen.b!.self).toBe(seen.b!.parent);
    expect(seen.a!.self).not.toBe(seen.b!.self); // siblings isolated
  });

  test("timer callback boundary: context survives setTimeout", async () => {
    boot();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("parent", async (parent: Span) => {
      try {
        await new Promise<void>((resolve) =>
          setTimeout(() => {
            expect(trace.getSpan(context.active())?.spanContext().spanId).toBe(parent.spanContext().spanId);
            resolve();
          }, 1)
        );
      } finally {
        parent.end();
      }
    });
  });

  test("exception boundary: throwing inside a child scope restores the outer context", async () => {
    boot();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("outer", async (outer: Span) => {
      try {
        await expect(
          tracer.startActiveSpan("inner", async (inner: Span) => {
            try {
              throw new Error("boom");
            } finally {
              inner.end();
            }
          })
        ).rejects.toThrow("boom");
        expect(trace.getSpan(context.active())?.spanContext().spanId).toBe(outer.spanContext().spanId);
      } finally {
        outer.end();
      }
    });
  });

  test("plain callback boundary: context propagates into a deferring callback", async () => {
    boot();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("parent", async (parent: Span) => {
      try {
        const spanId = await new Promise<string | undefined>((resolve) => {
          const cb = () => resolve(trace.getSpan(context.active())?.spanContext().spanId);
          queueMicrotask(cb);
        });
        expect(spanId).toBe(parent.spanContext().spanId);
      } finally {
        parent.end();
      }
    });
  });
});

describe("startActiveSpan contract (FR-TRC-2) and completed-span export", () => {
  test("the callback does NOT auto-end: the record appears only after span.end()", async () => {
    const spans = boot();
    const tracer = getAmadeusTracer();
    let duringCallback = 0;
    await tracer.startActiveSpan("op", async (span: Span) => {
      await new Promise((r) => setTimeout(r, 1));
      duringCallback = spans.length; // callback finished but span not yet ended
      span.end();
    });
    expect(duringCallback).toBe(0);
    expect(spans.length).toBe(1);
    expect(spans[0]!.name).toBe("op");
  });

  test("child span records carry the parent span id (causality at runtime, FR-TRC-6)", async () => {
    const spans = boot();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("parent", async (parent: Span) => {
      await tracer.startActiveSpan("child", async (child: Span) => {
        child.end();
      });
      parent.end();
    });
    const childRec = spans.find((s) => s.name === "child")!;
    const parentRec = spans.find((s) => s.name === "parent")!;
    expect(childRec.parentSpanId).toBe(parentRec.spanId);
    expect(childRec.traceId).toBe(parentRec.traceId);
    expect(parentRec.parentSpanId).toBeNull();
  });
});

describe("Intent Trace Context persist/restore (FR-TRC-4)", () => {
  test("attach + current round-trip in-process", () => {
    clearIntentContextForTests();
    attachIntentContext({ traceId: "t-1", anchorSpanId: "s-1", intentId: "260729-demo", schemaVersion: 1 });
    expect(currentIntentContext()).toEqual({ traceId: "t-1", anchorSpanId: "s-1", intentId: "260729-demo", schemaVersion: 1 });
  });

  test("persist then restore connects a later short-lived process to the remote parent", () => {
    const dir = mkdtempSync(join(tmpdir(), "otel-ctx-"));
    try {
      persistIntentContext(dir, { traceId: "t-9", anchorSpanId: "s-9", intentId: "260729-demo", schemaVersion: 1 });
      const restored = restoreIntentContext(dir, "260729-demo");
      expect(restored).toEqual({ traceId: "t-9", anchorSpanId: "s-9", intentId: "260729-demo", schemaVersion: 1 });
      // BR-6: an unknown intent has no record, so restore mints and persists a
      // fresh anchor for it rather than returning null.
      const minted = restoreIntentContext(dir, "other-intent");
      expect(minted.intentId).toBe("other-intent");
      expect(minted.traceId).not.toBe("t-9");
      expect(restoreIntentContext(dir, "other-intent")).toEqual(minted);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("W3C Trace Context subprocess injection (FR-TRC-5 minimal)", () => {
  test("inject writes a parseable traceparent from the active span; extract round-trips it", async () => {
    boot();
    const tracer = getAmadeusTracer();
    await tracer.startActiveSpan("session-end→projector", async (span: Span) => {
      try {
        const env = injectToSubprocess({ ...process.env });
        const extracted = extractTraceparent(env);
        expect(extracted).not.toBeNull();
        expect(extracted!.traceId).toBe(span.spanContext().traceId);
        expect(extracted!.spanId).toBe(span.spanContext().spanId);
      } finally {
        span.end();
      }
    });
  });

  test("with no active span, the attached intent anchor is used (FR-TRC-4 linkage)", () => {
    boot();
    attachIntentContext({ traceId: "0123456789abcdef0123456789abcdef", anchorSpanId: "0123456789abcdef", intentId: "i", schemaVersion: 1 });
    const env = injectToSubprocess({});
    const extracted = extractTraceparent(env);
    expect(extracted!.traceId).toBe("0123456789abcdef0123456789abcdef");
    expect(extracted!.spanId).toBe("0123456789abcdef");
  });

  test("with neither span nor anchor the env is left untouched", () => {
    boot();
    const env = injectToSubprocess({ FOO: "bar" });
    expect(env.TRACEPARENT).toBeUndefined();
    expect(env.FOO).toBe("bar");
  });
});
