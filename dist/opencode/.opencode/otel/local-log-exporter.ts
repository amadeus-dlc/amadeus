// local-log-exporter.ts — diagnostic Log → diagnostic Log Store, synchronous
// and fail-open (FR-EXP-4, FR-EVT-6).
//
// Diagnostic logs NEVER mix into the audit journal: this exporter writes only
// to the machine-local log store, and a store failure never throws, never
// latches, never stops the workflow.
//
// U4 hardening: the export-boundary redaction layer (FR-DST-3 layer 2)
// filters attributes immediately before the append, so a producer that
// skipped the write-time layer cannot reach the store unfiltered.

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auditCloneId } from "../tools/amadeus-lib.ts";
import { telemetryDir } from "../tools/amadeus-observability.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes, scrubCredentials } from "./redaction.ts";
import type { RedactionPolicy } from "./redaction.ts";

export type DiagnosticLogRecord = {
  readonly name: string;
  // Optional free-text body (domain-entities.md §DiagnosticLogRecord);
  // emitDiagnostic callers carry their message in `name` and leave this null.
  readonly body?: string | null;
  readonly timestamp: string;
  readonly attributes: Record<string, unknown>;
  readonly traceId: string | null;
  readonly spanId: string | null;
};

export type LocalLogExporter = {
  exportLog(record: DiagnosticLogRecord): void;
};

export type StoreWrite = (path: string, line: string) => void;

// Best-effort sink for the one-line note a dropped record leaves behind
// (U10 BR-2). A port, not a test mode: production passes nothing and lands on
// stderr, tests inject a collector.
export type DropNote = (message: string) => void;

export type LocalLogExporterOptions = {
  readonly projectDir: string;
  readonly storeDir?: string;
  readonly write?: StoreWrite;
  readonly redaction?: RedactionPolicy;
  readonly warn?: DropNote;
};

function defaultWrite(path: string, line: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  appendFileSync(path, line, "utf-8");
}

function defaultWarn(message: string): void {
  try {
    process.stderr.write(`${message}\n`);
  } catch {
    // fail-open all the way down: a closed stderr must not surface either
  }
}

// The drop note carries scrubbed text only (security-design): the failure path
// is not an exception to the two redaction layers, so the record's free-form
// name and the failure reason go through the credential scrubber and the
// attributes are withheld entirely.
function describeDrop(name: string, cause: unknown, patterns: RedactionPolicy["scrubPatterns"]): string {
  const reason = cause instanceof Error ? cause.message : String(cause);
  const safeName = String(scrubCredentials(name, patterns));
  const safeReason = String(scrubCredentials(reason, patterns));
  return `[amadeus] diagnostic log dropped (fail-open): ${safeName} — ${safeReason}`;
}

export function createLocalLogExporter(options: LocalLogExporterOptions): LocalLogExporter {
  const write = options.write ?? defaultWrite;
  const policy = options.redaction ?? DEFAULT_REDACTION_POLICY;
  const warn = options.warn ?? defaultWarn;
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
        const redacted = { ...record, attributes: redactAttributes(record.attributes, policy) };
        write(path, `${JSON.stringify(redacted)}\n`);
      } catch (cause) {
        // fail-open (FR-EVT-6): diagnostic loss never blocks the workflow. The
        // drop leaves one note behind and is NOT re-emitted — a second emit
        // would recurse straight back into the failing store (BR-10).
        warn(describeDrop(record.name, cause, policy.scrubPatterns));
      }
    },
  };
}
