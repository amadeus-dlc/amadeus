import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  metrics,
  SpanStatusCode,
  trace,
  type Attributes,
  type Counter,
  type Histogram,
} from "@opentelemetry/api";

export type AidlcTelemetryValue = string | number | boolean | undefined;
export type AidlcTelemetryAttributes = Record<string, AidlcTelemetryValue>;

export interface AidlcTelemetrySpanSnapshot {
  readonly name: string;
  readonly attributes: AidlcTelemetryAttributes;
}

export interface AidlcTelemetrySink {
  spanStarted?(span: AidlcTelemetrySpanSnapshot): void;
  spanEnded?(span: AidlcTelemetrySpanSnapshot, status: AidlcTelemetryStatus): void;
  eventRecorded?(span: AidlcTelemetrySpanSnapshot | null, name: string, attributes: AidlcTelemetryAttributes): void;
  errorRecorded?(span: AidlcTelemetrySpanSnapshot | null, error: string, attributes: AidlcTelemetryAttributes): void;
  metricRecorded?(name: string, value: number, attributes: AidlcTelemetryAttributes): void;
}

export type AidlcTelemetryStatus =
  | { code: "ok" }
  | { code: "error"; message?: string };

export interface AidlcCommandTelemetryScope {
  recordEvent(name: string, attributes?: AidlcTelemetryAttributes): void;
  recordMetric(name: string, value: number, attributes?: AidlcTelemetryAttributes): void;
  recordError(error: unknown, attributes?: AidlcTelemetryAttributes): void;
  end(status?: AidlcTelemetryStatus): void;
}

export interface AidlcTelemetryFacade {
  startCommandScope(
    tool: string,
    command: string,
    attributes?: AidlcTelemetryAttributes,
  ): AidlcCommandTelemetryScope;
  recordMetric(name: string, value: number, attributes?: AidlcTelemetryAttributes): void;
  recordEvent(name: string, attributes?: AidlcTelemetryAttributes): void;
  recordError(error: unknown, attributes?: AidlcTelemetryAttributes): void;
  status(): AidlcTelemetryRuntimeStatus;
}

export interface AidlcTelemetryRuntimeStatus {
  readonly core: "enabled";
  readonly exporter: "unconfigured" | "configured";
  readonly testSink: "disabled" | "enabled";
}

interface AidlcTelemetryOptions {
  readonly sink?: AidlcTelemetrySink;
}

function normalizeAttributes(attributes: AidlcTelemetryAttributes = {}): Attributes {
  const normalized: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) normalized[key] = value;
  }
  return normalized;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function exporterConfigured(): boolean {
  return [
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
  ].some((name) => (process.env[name] ?? "").trim().length > 0);
}

class AidlcTelemetry implements AidlcTelemetryFacade {
  private readonly counters = new Map<string, Counter>();
  private readonly histograms = new Map<string, Histogram>();
  private readonly sink?: AidlcTelemetrySink;

  constructor(options: AidlcTelemetryOptions = {}) {
    this.sink = options.sink;
  }

  startCommandScope(
    tool: string,
    command: string,
    attributes: AidlcTelemetryAttributes = {},
  ): AidlcCommandTelemetryScope {
    const tracer = trace.getTracer("amadeus.aidlc.tools");
    const spanName = `aidlc.${tool}.${command}`;
    const spanAttributes: AidlcTelemetryAttributes = {
      "aidlc.tool": tool,
      "aidlc.command": command,
      ...attributes,
    };
    const span = tracer.startSpan(spanName, { attributes: normalizeAttributes(spanAttributes) });
    const snapshot: AidlcTelemetrySpanSnapshot = { name: spanName, attributes: spanAttributes };
    const startedAt = performance.now();
    let ended = false;
    this.sink?.spanStarted?.(snapshot);

    return {
      recordEvent: (name, eventAttributes = {}) => {
        span.addEvent(name, normalizeAttributes(eventAttributes));
        this.sink?.eventRecorded?.(snapshot, name, eventAttributes);
      },
      recordMetric: (name, value, metricAttributes = {}) => {
        this.recordMetric(name, value, { ...spanAttributes, ...metricAttributes });
      },
      recordError: (error, errorAttributes = {}) => {
        span.recordException(error instanceof Error ? error : errorText(error));
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorText(error) });
        this.sink?.errorRecorded?.(snapshot, errorText(error), errorAttributes);
      },
      end: (status = { code: "ok" }) => {
        if (ended) return;
        ended = true;
        if (status.code === "error") {
          span.setStatus({ code: SpanStatusCode.ERROR, message: status.message });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        const durationMs = performance.now() - startedAt;
        this.recordMetric("aidlc.tool.duration_ms", durationMs, {
          ...spanAttributes,
          "aidlc.status": status.code,
        });
        this.recordMetric("aidlc.tool.invocations", 1, {
          ...spanAttributes,
          "aidlc.status": status.code,
        });
        this.sink?.spanEnded?.(snapshot, status);
        span.end();
      },
    };
  }

  recordMetric(name: string, value: number, attributes: AidlcTelemetryAttributes = {}): void {
    if (name.endsWith("_ms")) {
      this.histogram(name).record(value, normalizeAttributes(attributes));
    } else {
      this.counter(name).add(value, normalizeAttributes(attributes));
    }
    this.sink?.metricRecorded?.(name, value, attributes);
  }

  recordEvent(name: string, attributes: AidlcTelemetryAttributes = {}): void {
    this.sink?.eventRecorded?.(null, name, attributes);
  }

  recordError(error: unknown, attributes: AidlcTelemetryAttributes = {}): void {
    this.sink?.errorRecorded?.(null, errorText(error), attributes);
  }

  status(): AidlcTelemetryRuntimeStatus {
    return {
      core: "enabled",
      exporter: exporterConfigured() ? "configured" : "unconfigured",
      testSink: this.sink === undefined ? "disabled" : "enabled",
    };
  }

  private counter(name: string): Counter {
    const existing = this.counters.get(name);
    if (existing) return existing;
    const counter = metrics.getMeter("amadeus.aidlc.tools").createCounter(name);
    this.counters.set(name, counter);
    return counter;
  }

  private histogram(name: string): Histogram {
    const existing = this.histograms.get(name);
    if (existing) return existing;
    const histogram = metrics.getMeter("amadeus.aidlc.tools").createHistogram(name);
    this.histograms.set(name, histogram);
    return histogram;
  }
}

export function createAidlcTelemetry(options: AidlcTelemetryOptions = {}): AidlcTelemetryFacade {
  return new AidlcTelemetry(options);
}

function writeJsonLine(path: string, value: unknown): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(value)}\n`, "utf-8");
  } catch {
    // Telemetry must never change tool behavior.
  }
}

function createJsonlSink(path: string): AidlcTelemetrySink {
  return {
    spanStarted: (span) => writeJsonLine(path, { kind: "span.started", span }),
    spanEnded: (span, status) => writeJsonLine(path, { kind: "span.ended", span, status }),
    eventRecorded: (span, name, attributes) =>
      writeJsonLine(path, { kind: "event", span, name, attributes }),
    errorRecorded: (span, error, attributes) =>
      writeJsonLine(path, { kind: "error", span, error, attributes }),
    metricRecorded: (name, value, attributes) =>
      writeJsonLine(path, { kind: "metric", name, value, attributes }),
  };
}

let defaultTelemetry: AidlcTelemetryFacade | null = null;

export function getAidlcTelemetry(): AidlcTelemetryFacade {
  if (defaultTelemetry !== null) return defaultTelemetry;
  const testFile = (process.env.AIDLC_TELEMETRY_TEST_FILE ?? "").trim();
  defaultTelemetry = createAidlcTelemetry({
    sink: testFile.length > 0 ? createJsonlSink(testFile) : undefined,
  });
  return defaultTelemetry;
}
