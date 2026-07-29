// meter-provider.ts — Amadeus Meter Provider, Counter/Histogram subset only
// (FR-EXP-1, FR-EXP-5).
//
// Observable callbacks, up-down counters, gauges, and arbitrary aggregation
// are OUTSIDE the initial subset (FR-EXP-5): asking for one is an invariant
// exception, not a silent no-op. Instruments write synchronously to the
// fail-open LocalMetricExporter on every add/record, trace-correlated
// (FR-MLM-1).

import { context, metrics, trace } from "../vendor/opentelemetry/api/index.js";
import type {
  Attributes,
  Counter,
  Histogram,
  Meter,
  MeterProvider,
  ObservableCounter,
  ObservableGauge,
  ObservableUpDownCounter,
  UpDownCounter,
  Gauge,
  BatchObservableCallback,
} from "../vendor/opentelemetry/api/index.js";
import type { LocalMetricExporter } from "./local-metric-exporter.ts";

function outOfSubset(what: string): never {
  throw new Error(`${what} is outside the initial metrics subset (FR-EXP-5) — invariant violation`);
}

class AmadeusMeter implements Meter {
  constructor(private readonly exporter: LocalMetricExporter) {}
  private correlation(): { traceId: string | null; spanId: string | null } {
    const spanCtx = trace.getSpan(context.active())?.spanContext();
    return { traceId: spanCtx?.traceId ?? null, spanId: spanCtx?.spanId ?? null };
  }
  createCounter(name: string, _options?: unknown): Counter {
    return {
      add: (value: number, attributes?: Attributes) => {
        this.exporter.exportMetric({
          name,
          kind: "counter",
          value,
          timestamp: new Date().toISOString(),
          attributes: (attributes ?? {}) as Record<string, unknown>,
          ...this.correlation(),
        });
      },
    };
  }
  createHistogram(name: string, _options?: unknown): Histogram {
    return {
      record: (value: number, attributes?: Attributes) => {
        this.exporter.exportMetric({
          name,
          kind: "histogram",
          value,
          timestamp: new Date().toISOString(),
          attributes: (attributes ?? {}) as Record<string, unknown>,
          ...this.correlation(),
        });
      },
    };
  }
  createUpDownCounter(_name: string, _options?: unknown): UpDownCounter {
    return outOfSubset("UpDownCounter");
  }
  createGauge(_name: string, _options?: unknown): Gauge {
    return outOfSubset("Gauge");
  }
  createObservableCounter(_name: string, _options?: unknown): ObservableCounter<Attributes> {
    return outOfSubset("ObservableCounter");
  }
  createObservableGauge(_name: string, _options?: unknown): ObservableGauge<Attributes> {
    return outOfSubset("ObservableGauge");
  }
  createObservableUpDownCounter(_name: string, _options?: unknown): ObservableUpDownCounter<Attributes> {
    return outOfSubset("ObservableUpDownCounter");
  }
  addBatchObservableCallback(_callback: BatchObservableCallback, _observables: unknown[]): void {
    outOfSubset("batch observable callbacks");
  }
  removeBatchObservableCallback(_callback: BatchObservableCallback): void {
    outOfSubset("batch observable callbacks");
  }
}

class AmadeusMeterProvider implements MeterProvider {
  getMeter(_name: string, _version?: string, _options?: unknown): Meter {
    return new AmadeusMeter(exporterRef);
  }
}

let exporterRef: LocalMetricExporter;
let registered = false;

export function registerMeterProvider(options: { metricExporter: LocalMetricExporter }): void {
  if (registered) {
    throw new Error("registerMeterProvider called twice — invariant violation (NFR-3)");
  }
  exporterRef = options.metricExporter;
  metrics.setGlobalMeterProvider(new AmadeusMeterProvider());
  registered = true;
}

export function getAmadeusMeter(name = "amadeus"): Meter {
  if (!registered) {
    throw new Error("getAmadeusMeter before registerMeterProvider — invariant violation");
  }
  return metrics.getMeter(name);
}

// Test seam: drop the registration between fixtures.
export function resetMeterProviderForTests(): void {
  metrics.disable();
  registered = false;
}

