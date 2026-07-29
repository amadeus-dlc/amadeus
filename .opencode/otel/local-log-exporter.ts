// local-log-exporter.ts — diagnostic Log → diagnostic Log Store, synchronous
// and fail-open (FR-EXP-4, FR-EVT-6).
//
// Diagnostic logs NEVER mix into the audit journal: this exporter writes only
// to the machine-local log store, and a store failure never throws, never
// latches, never stops the workflow.

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auditCloneId } from "../tools/amadeus-lib.ts";
import { telemetryDir } from "../tools/amadeus-observability.ts";

export type DiagnosticLogRecord = {
  readonly name: string;
  readonly timestamp: string;
  readonly attributes: Record<string, unknown>;
  readonly traceId: string | null;
  readonly spanId: string | null;
};

export type LocalLogExporter = {
  exportLog(record: DiagnosticLogRecord): void;
};

export type StoreWrite = (path: string, line: string) => void;

export type LocalLogExporterOptions = {
  readonly projectDir: string;
  readonly storeDir?: string;
  readonly write?: StoreWrite;
};

function defaultWrite(path: string, line: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  appendFileSync(path, line, "utf-8");
}

export function createLocalLogExporter(options: LocalLogExporterOptions): LocalLogExporter {
  const write = options.write ?? defaultWrite;
  const storePath = (): string | null => {
    const dir = options.storeDir ?? telemetryDir(options.projectDir);
    if (dir === null || dir === undefined) return null;
    return join(dir, `logs-${auditCloneId(options.projectDir)}.jsonl`);
  };
  return {
    exportLog(record: DiagnosticLogRecord): void {
      try {
        const path = storePath();
        if (path === null) return;
        write(path, `${JSON.stringify(record)}\n`);
      } catch {
        // fail-open (FR-EVT-6): diagnostic loss never blocks the workflow
      }
    },
  };
}
