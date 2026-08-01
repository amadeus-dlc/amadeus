// local-metric-exporter.ts — Counter/Histogram subset → Metric Store,
// synchronous and fail-open (FR-EXP-5, FR-EVT-6).
//
// U4 hardening: the export-boundary redaction layer (FR-DST-3 layer 2)
// filters attributes immediately before the append, so a producer that
// skipped the write-time layer cannot reach the store unfiltered.

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { activeIntent, activeSpace, auditCloneId } from "../tools/amadeus-lib.ts";
import { telemetryDir } from "../tools/amadeus-observability.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes } from "./redaction.ts";
import type { RedactionPolicy } from "./redaction.ts";
import { currentResource, redactResource } from "./resource.ts";
import type { ResourceGetter } from "./resource.ts";

export type MetricRecord = {
  readonly name: string;
  readonly kind: "counter" | "histogram";
  readonly value: number;
  readonly timestamp: string;
  readonly attributes: Record<string, unknown>;
  readonly traceId: string | null;
  readonly spanId: string | null;
};

// The persisted line: the measured record plus the intent identity, resolved
// here rather than by the producer — the same "identity fields are resolved at
// the write boundary" policy the canonical journal follows (audit-log-exporter).
export type PersistedMetricRecord = MetricRecord & {
  readonly intentId: string;
  readonly resource: Record<string, string>;
};

export type LocalMetricExporter = {
  exportMetric(record: MetricRecord): void;
};

export type StoreWrite = (path: string, line: string) => void;

export type LocalMetricExporterOptions = {
  readonly projectDir: string;
  readonly storeDir?: string;
  readonly write?: StoreWrite;
  readonly redaction?: RedactionPolicy;
  readonly resource?: ResourceGetter;
};

function defaultWrite(path: string, line: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  appendFileSync(path, line, "utf-8");
}

export function createLocalMetricExporter(options: LocalMetricExporterOptions): LocalMetricExporter {
  const write = options.write ?? defaultWrite;
  const policy = options.redaction ?? DEFAULT_REDACTION_POLICY;
  const resource = options.resource ?? (() => currentResource(options.projectDir));
  // Resolved once per exporter: measurement is a hot path (no per-record
  // cursor read), and a short-lived CLI process keeps one identity for its
  // whole life (BR-3).
  let identity: string | null = null;
  const intentId = (): string => {
    identity ??= activeIntent(options.projectDir, activeSpace(options.projectDir)) ?? "workspace";
    return identity;
  };
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
        const persisted: PersistedMetricRecord = {
          ...record,
          attributes: redactAttributes(record.attributes, policy),
          intentId: intentId(),
          resource: redactResource(resource()),
        };
        write(path, `${JSON.stringify(persisted)}\n`);
      } catch {
        // fail-open (FR-EVT-6)
      }
    },
  };
}
