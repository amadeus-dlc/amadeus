// local-span-exporter.ts — completed Span → machine-local JSONL, synchronous
// and fail-open (FR-EXP-3, FR-EVT-6).
//
// A span-store write failure NEVER throws into the caller, never sets the
// fatal latch, and never stops the workflow: spans are telemetry, the journal
// owns the durability contract. Failures are noted best-effort in a
// machine-local diagnostics file (the existing telemetry practice).
//
// U4 hardening: the persisted record carries the FULL FR-EXP-3 field set
// (ids, name/kind, timestamps, status, attributes, events, links, resource,
// instrumentation scope — BR-7), and the export-boundary redaction layer
// (FR-DST-3 layer 2) filters attributes, event attributes, and link
// attributes immediately before the append.

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auditCloneId } from "../tools/amadeus-lib.ts";
import { telemetryDir } from "../tools/amadeus-observability.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes } from "./redaction.ts";
import type { RedactionPolicy } from "./redaction.ts";
import { redactResource } from "./resource.ts";

// A recorded span link (FR-EXP-3): the linked span's context plus optional
// attributes, redacted at the export boundary like any other attribute bag.
export type CompletedSpanLink = {
  readonly traceId: string;
  readonly spanId: string;
  readonly attributes?: Record<string, unknown>;
};

// The completed-span record (FR-EXP-3 field inventory, BR-7).
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
  readonly links: readonly CompletedSpanLink[];
  readonly resource: Record<string, string>;
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
  readonly redaction?: RedactionPolicy;
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

// Export-boundary redaction (FR-DST-3 layer 2): attributes, per-event
// attributes, per-link attributes, and the resource bag are filtered
// immediately before append, so a producer that skipped the write-time layer
// cannot reach the store. The resource carries its own allow-list policy
// (redactResource) because its keys are disjoint from the event vocabulary the
// attribute policy admits.
function redactRecord(record: CompletedSpanRecord, policy: RedactionPolicy): CompletedSpanRecord {
  return {
    ...record,
    attributes: redactAttributes(record.attributes, policy),
    resource: redactResource(record.resource),
    events: record.events.map((event) =>
      event.attributes === undefined ? event : { ...event, attributes: redactAttributes(event.attributes, policy) }
    ),
    links: record.links.map((link) =>
      link.attributes === undefined ? link : { ...link, attributes: redactAttributes(link.attributes, policy) }
    ),
  };
}

export function createLocalSpanExporter(options: LocalSpanExporterOptions): LocalSpanExporter {
  const write = options.write ?? defaultWrite;
  const policy = options.redaction ?? DEFAULT_REDACTION_POLICY;
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
        write(path, `${JSON.stringify(redactRecord(record, policy))}\n`);
      } catch (cause) {
        noteStoreFailure(options, cause);
      }
    },
  };
}
