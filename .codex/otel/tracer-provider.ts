// tracer-provider.ts — Amadeus Tracer Provider (FR-EXP-1, FR-TRC-1/2).
//
// Only duration operations become spans (FR-TRC-1). Implemented directly
// against the vendored OTel Trace API — no NodeSDK, no BatchSpanProcessor
// (FR-EXP-6). A completed span is synchronously handed to the
// LocalSpanExporter at span.end().
//
// startActiveSpan CONTRACT (FR-TRC-2, #1678): the callback does NOT auto-end
// the span. The caller MUST end it — `finally { span.end(); }`. The
// context.test.ts suite pins this contract.

import { context, trace } from "../vendor/opentelemetry/api/index.js";
import type {
  Attributes,
  Context,
  Exception,
  Link,
  Span,
  SpanContext,
  SpanOptions,
  SpanStatus,
  TimeInput,
  Tracer,
  TracerProvider,
} from "../vendor/opentelemetry/api/index.js";
import { processParentSpanContext } from "./context.ts";
import type { CompletedSpanRecord, LocalSpanExporter } from "./local-span-exporter.ts";
import { EXCEPTION_SPAN_EVENT_NAME, getEventDef } from "./event-registry.ts";

function hexId(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toMs(input?: TimeInput): number {
  if (input === undefined) return Date.now();
  if (typeof input === "number") return input;
  if (input instanceof Date) return input.getTime();
  // HRTime [seconds, nanoseconds]
  return input[0] * 1000 + Math.floor(input[1] / 1_000_000);
}

class AmadeusSpan implements Span {
  private readonly ctx: SpanContext;
  private readonly parentSpanId: string | null;
  private readonly kind: string;
  private readonly startMs: number;
  private attributes: Attributes = {};
  private events: { name: string; timeMs: number; attributes?: Record<string, unknown> }[] = [];
  private links: { traceId: string; spanId: string; attributes?: Record<string, unknown> }[] = [];
  private status: SpanStatus = { code: 0 };
  private ended = false;

  constructor(
    name: string,
    options: SpanOptions | undefined,
    parentContext: Context,
    private readonly exporter: LocalSpanExporter,
    private readonly scopeName: string
  ) {
    this.kind = options?.kind !== undefined ? String(options.kind) : "internal";
    this.startMs = options?.startTime !== undefined ? toMs(options.startTime) : Date.now();
    const parent =
      trace.getSpan(parentContext)?.spanContext() ??
      // No span in scope: fall back to the process remote parent (the env
      // carrier or the restored intent anchor) so this short-lived process
      // joins the intent trace instead of opening an orphan trace (BR-3).
      processParentSpanContext() ??
      undefined;
    if (parent !== undefined) {
      this.ctx = { traceId: parent.traceId, spanId: hexId(8), traceFlags: parent.traceFlags };
      this.parentSpanId = parent.spanId;
    } else {
      this.ctx = { traceId: hexId(16), spanId: hexId(8), traceFlags: 1 };
      this.parentSpanId = null;
    }
    this.updateName(name);
    if (options?.attributes !== undefined) this.setAttributes(options.attributes);
  }

  private currentName = "";
  updateName(name: string): this {
    this.currentName = name;
    return this;
  }
  spanContext(): SpanContext {
    return this.ctx;
  }
  setAttribute(key: string, value: unknown): this {
    this.attributes[key] = value as never;
    return this;
  }
  setAttributes(attributes: Attributes): this {
    this.attributes = { ...this.attributes, ...attributes };
    return this;
  }
  addEvent(name: string, attributesOrStartTime?: unknown, startTime?: TimeInput): this {
    const attrs = typeof attributesOrStartTime === "object" && !(attributesOrStartTime instanceof Date) && !Array.isArray(attributesOrStartTime)
      ? (attributesOrStartTime as Record<string, unknown>)
      : undefined;
    const time = typeof attributesOrStartTime === "object" || attributesOrStartTime === undefined ? startTime : (attributesOrStartTime as TimeInput);
    this.events.push({ name, timeMs: toMs(time), attributes: attrs });
    return this;
  }
  addLink(link: Link): this {
    this.links.push({
      traceId: link.context.traceId,
      spanId: link.context.spanId,
      ...(link.attributes !== undefined ? { attributes: link.attributes as Record<string, unknown> } : {}),
    });
    return this;
  }
  addLinks(links: Link[]): this {
    for (const link of links) this.addLink(link);
    return this;
  }
  setStatus(status: SpanStatus): this {
    this.status = status;
    return this;
  }
  end(endTime?: TimeInput): void {
    if (this.ended) return; // double-end never double-exports
    this.ended = true;
    const record: CompletedSpanRecord = {
      traceId: this.ctx.traceId,
      spanId: this.ctx.spanId,
      parentSpanId: this.parentSpanId,
      name: this.currentName,
      kind: this.kind,
      startMs: this.startMs,
      endMs: toMs(endTime),
      status: { code: String(this.status.code), ...(this.status.message !== undefined ? { message: this.status.message } : {}) },
      attributes: { ...this.attributes },
      events: this.events,
      links: this.links,
      resource: { "service.name": "amadeus", "telemetry.sdk.language": "typescript" },
      instrumentationScope: { name: this.scopeName },
    };
    this.exporter.exportSpan(record); // fail-open inside the exporter
  }
  isRecording(): boolean {
    return !this.ended;
  }
  recordException(exception: Exception, time?: TimeInput): void {
    // Exception span events are TELEMETRY (FR-EVT-7): they ride the span
    // record, never the audit journal. The registry def pins the
    // classification — reclassifying it canonical trips the invariant here
    // AND the drift guard (BR-3). Canonical failures are emitted separately
    // as amadeus.operation.failed.
    const def = getEventDef(EXCEPTION_SPAN_EVENT_NAME);
    if (def.durability !== "telemetry") {
      throw new Error(`exception span event misclassified as ${def.durability} — drift guard violation (FR-EVT-7)`);
    }
    const message = exception instanceof Error ? exception.message : String(exception);
    this.addEvent(EXCEPTION_SPAN_EVENT_NAME, { "exception.message": message }, time);
  }
}

class AmadeusTracer implements Tracer {
  constructor(
    private readonly exporter: LocalSpanExporter,
    private readonly scopeName: string
  ) {}
  startSpan(name: string, options?: SpanOptions, ctx?: Context): Span {
    return new AmadeusSpan(name, options, ctx ?? context.active(), this.exporter, this.scopeName);
  }
  startActiveSpan<F extends (span: Span) => unknown>(name: string, ...args: unknown[]): ReturnType<F> {
    let options: SpanOptions | undefined;
    let ctx: Context | undefined;
    let fn: F;
    if (args.length === 1) {
      fn = args[0] as F;
    } else if (args.length === 2) {
      options = args[0] as SpanOptions;
      fn = args[1] as F;
    } else {
      options = args[0] as SpanOptions;
      ctx = args[1] as Context;
      fn = args[2] as F;
    }
    const span = this.startSpan(name, options, ctx);
    // Activate the span for the callback's duration — but NEVER end it here
    // (FR-TRC-2): the caller owns span.end().
    return context.with(trace.setSpan(ctx ?? context.active(), span), () => fn(span)) as ReturnType<F>;
  }
}

class AmadeusTracerProvider implements TracerProvider {
  constructor(private readonly exporter: LocalSpanExporter) {}
  getTracer(name: string, _version?: string, _options?: unknown): Tracer {
    return new AmadeusTracer(this.exporter, name);
  }
}

let registered = false;

// Global registration. Double registration is an invariant violation
// (NFR-3: the API singleton must hold exactly one Amadeus provider).
export function registerTracerProvider(options: { spanExporter: LocalSpanExporter }): void {
  if (registered) {
    throw new Error("registerTracerProvider called twice — invariant violation (NFR-3)");
  }
  trace.setGlobalTracerProvider(new AmadeusTracerProvider(options.spanExporter));
  registered = true;
}

// Whether this process already holds a provider. Registration is a once-only
// invariant, so a bootstrap seam asks before registering rather than guessing.
export function isTracerProviderRegistered(): boolean {
  return registered;
}

export function getAmadeusTracer(name = "amadeus"): Tracer {
  if (!registered) {
    throw new Error("getAmadeusTracer before registerTracerProvider — invariant violation");
  }
  return trace.getTracer(name);
}

// Test seam: drop the global registration between fixtures.
export function resetTracerProviderForTests(): void {
  trace.disable();
  registered = false;
}
