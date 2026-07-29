// local-span-exporter.ts — completed Span → machine-local JSONL, synchronous
// and fail-open (FR-EXP-3, FR-EVT-6).
//
// A span-store write failure NEVER throws into the caller, never sets the
// fatal latch, and never stops the workflow: spans are telemetry, the journal
// owns the durability contract. Failures are noted best-effort in a
// machine-local diagnostics file (the existing telemetry practice).

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auditCloneId } from "../tools/amadeus-lib.ts";
import { telemetryDir } from "../tools/amadeus-observability.ts";

// The completed-span record (FR-EXP-3 field inventory).
export type CompletedSpanRecord = {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
  readonly name: string;
  readonly kind: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly status: { code: string; message?: string };
  readonly attributes: Record<string, unknown>;
  readonly events: readonly { name: string; timeMs: number; attributes?: Record<string, unknown> }[];
  readonly resource: Record<string, unknown>;
  readonly instrumentationScope: { name: string; version?: string };
};

export type LocalSpanExporter = {
  // Fail-open: returns normally even when the store write fails.
  exportSpan(record: CompletedSpanRecord): void;
};

export type StoreWrite = (path: string, line: string) => void;

export type LocalSpanExporterOptions = {
  readonly projectDir: string;
  // Explicit store root override (tests); defaults to the intent record's
  // .amadeus-otel telemetry dir.
  readonly storeDir?: string;
  readonly write?: StoreWrite;
};

function defaultWrite(path: string, line: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  appendFileSync(path, line, "utf-8");
}


// Fail-open all the way down (FR-EVT-6): best-effort diagnostics only.
function noteStoreFailure(options: LocalSpanExporterOptions, cause: unknown): void {
  try {
    const dir = options.storeDir ?? telemetryDir(options.projectDir);
    if (dir === null || dir === undefined) return;
    mkdirSync(dir, { recursive: true });
    appendFileSync(
      join(dir, "diagnostics.log"),
      `${new Date().toISOString()} span-store write failed: ${cause instanceof Error ? cause.message : String(cause)}\n`,
      "utf-8"
    );
  } catch {
    // silent
  }
}

export function createLocalSpanExporter(options: LocalSpanExporterOptions): LocalSpanExporter {
  const write = options.write ?? defaultWrite;
  const storePath = (): string | null => {
    const dir = options.storeDir ?? telemetryDir(options.projectDir);
    if (dir === null || dir === undefined) return null;
    return join(dir, `spans-${auditCloneId(options.projectDir)}.jsonl`);
  };
  return {
    exportSpan(record: CompletedSpanRecord): void {
      try {
        const path = storePath();
        if (path === null) return; // no resolvable record -> drop, stay silent
        write(path, `${JSON.stringify(record)}\n`);
      } catch (cause) {
        noteStoreFailure(options, cause);
      }
    },
  };
}
