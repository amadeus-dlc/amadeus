// local-metric-exporter.ts — Counter/Histogram subset → Metric Store,
// synchronous and fail-open (FR-EXP-5, FR-EVT-6).

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auditCloneId } from "../tools/amadeus-lib.ts";
import { telemetryDir } from "../tools/amadeus-observability.ts";

export type MetricRecord = {
  readonly name: string;
  readonly kind: "counter" | "histogram";
  readonly value: number;
  readonly timestamp: string;
  readonly attributes: Record<string, unknown>;
  readonly traceId: string | null;
  readonly spanId: string | null;
};

export type LocalMetricExporter = {
  exportMetric(record: MetricRecord): void;
};

export type StoreWrite = (path: string, line: string) => void;

export type LocalMetricExporterOptions = {
  readonly projectDir: string;
  readonly storeDir?: string;
  readonly write?: StoreWrite;
};

function defaultWrite(path: string, line: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  appendFileSync(path, line, "utf-8");
}

export function createLocalMetricExporter(options: LocalMetricExporterOptions): LocalMetricExporter {
  const write = options.write ?? defaultWrite;
  const storePath = (): string | null => {
    const dir = options.storeDir ?? telemetryDir(options.projectDir);
    if (dir === null || dir === undefined) return null;
    return join(dir, `metrics-${auditCloneId(options.projectDir)}.jsonl`);
  };
  return {
    exportMetric(record: MetricRecord): void {
      try {
        const path = storePath();
        if (path === null) return;
        write(path, `${JSON.stringify(record)}\n`);
      } catch {
        // fail-open (FR-EVT-6)
      }
    },
  };
}
