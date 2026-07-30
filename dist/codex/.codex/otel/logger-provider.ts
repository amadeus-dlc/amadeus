// logger-provider.ts — Amadeus Logger Provider (FR-EXP-1, FR-EVT-2).
//
// canonical Events are emitted through here and dispatched IMMEDIATELY to the
// synchronous AuditLogExporter — never batched, never waiting on span end
// (FR-EVT-2). Telemetry-classified events and free-form diagnostic logs go to
// the fail-open LocalLogExporter and never mix into the audit journal
// (FR-EXP-4).
//
// The provider also registers an api-logs bridge so code holding an OTel
// Logger (`logs.getLogger().emit({eventName, attributes, context})`) lands on
// the same path (the Logs API viability spike, Phase 1 ADR).

import { context, trace } from "../vendor/opentelemetry/api/index.js";
import { logs } from "../vendor/opentelemetry/api-logs/index.js";
import type { Logger, LoggerProvider, LogRecord } from "../vendor/opentelemetry/api-logs/index.js";
import { activeIntent, activeSpace, auditCloneId, isoTimestamp } from "../tools/amadeus-lib.ts";
import { JOURNAL_SCHEMA_VERSION_V2 } from "../tools/amadeus-journal.ts";
import type {
  AuditLogExporter,
  CanonicalEventRecord,
  CanonicalEventTarget,
} from "./audit-log-exporter.ts";
import { getEventDef } from "./event-registry.ts";
import type { RegisteredEventName } from "./event-registry.ts";
import type { LocalLogExporter } from "./local-log-exporter.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes } from "./redaction.ts";
import type { RedactionPolicy } from "./redaction.ts";

type Registered = {
  readonly projectDir: string;
  readonly auditExporter: AuditLogExporter;
  readonly logExporter: LocalLogExporter;
  readonly policy: RedactionPolicy;
};

let registered: Registered | null = null;

function requireRegistered(): Registered {
  if (registered === null) {
    throw new Error("emit before registerLoggerProvider — invariant violation");
  }
  return registered;
}

// What an emit did. `appended: false` is never a failure — a failure throws.
// It reports the two ways an emit legitimately does not reach the audit
// journal: the post-complete seal (#1248, E-U7CG-Q3B ruling A') and a
// telemetry-classified event, which never touches the journal by design
// (FR-EXP-4). The timestamp is the one the emit actually stamped, so a caller
// reporting on the emit quotes a real value rather than minting its own.
export type EmitOutcome =
  | { readonly appended: true; readonly timestamp: string }
  | { readonly appended: false; readonly reason: "intent-complete" | "telemetry"; readonly timestamp: string };

// canonical emit. Throws synchronously on write failure (the exporter has
// already set the fatal latch by then — FR-EVT-3). Registry and required-
// attribute violations throw WITHOUT latching: they are caller bugs, not
// journal write failures (BR-10).
//
// `target` names a ledger other than the active cursor's (E-U8PRE O-T1). It
// drives BOTH halves of the write: the shard the row lands in (passed to the
// exporter) and the row's own identity fields, resolved below from the same
// target with the explicit-wins precedence the v1 writer already uses
// (auditIntentId → activeIntent(pd, space, intent)). Honouring it for the shard
// alone would write a row into the target's ledger that claims the ISSUER's
// intent — the shape migration-adapter.ts refuses to produce.
export function emitEvent(
  name: RegisteredEventName,
  attrs: Record<string, unknown>,
  target?: CanonicalEventTarget
): EmitOutcome {
  const reg = requireRegistered();
  const def = getEventDef(name);
  const missing = def.requiredAttributes.filter((key) => !(key in attrs));
  if (missing.length > 0) {
    throw new Error(`missing required attribute(s) for ${name}: ${missing.join(", ")} — invariant violation (BR-9)`);
  }
  const clean = redactAttributes(attrs, reg.policy);
  if (def.durability === "telemetry") {
    // Telemetry never reaches the audit journal (FR-EXP-4). Fail-open path.
    const timestamp = new Date().toISOString();
    reg.logExporter.exportLog({ name, timestamp, attributes: clean, traceId: null, spanId: null });
    return { appended: false, reason: "telemetry", timestamp };
  }
  const spanCtx = trace.getSpan(context.active())?.spanContext();
  const space = target?.space ?? activeSpace(reg.projectDir);
  const record: CanonicalEventRecord = {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: crypto.randomUUID(),
    // Second-granular ISO — the SAME format the v1 writer stamps
    // (isoTimestamp). The presence ledger's ordering predicates compare
    // timestamp strings, so a millisecond-bearing v2 row would misorder
    // against same-second v1 rows and silently reopen the human-turn gate.
    timestamp: isoTimestamp(),
    eventName: name,
    attributes: clean,
    intentId: activeIntent(reg.projectDir, space, target?.intent) ?? "workspace",
    space,
    cloneId: auditCloneId(reg.projectDir),
    traceId: spanCtx?.traceId ?? null,
    spanId: spanCtx?.spanId ?? null,
    traceFlags: spanCtx?.traceFlags ?? 0,
    idempotencyKey: crypto.randomUUID(),
    durability: "canonical",
  };
  const outcome = reg.auditExporter.exportCanonicalEvent(record, target);
  return outcome.appended
    ? { appended: true, timestamp: record.timestamp }
    : { appended: false, reason: outcome.reason, timestamp: record.timestamp };
}

// Free-form diagnostic log. Always fail-open (FR-EVT-6).
export function emitDiagnostic(name: string, attrs: Record<string, unknown>): void {
  const reg = requireRegistered();
  const spanCtx = trace.getSpan(context.active())?.spanContext();
  reg.logExporter.exportLog({
    name,
    timestamp: new Date().toISOString(),
    attributes: redactAttributes(attrs, reg.policy),
    traceId: spanCtx?.traceId ?? null,
    spanId: spanCtx?.spanId ?? null,
  });
}

// api-logs bridge: OTel Logger.emit lands on the same routing as emitEvent.
class AmadeusLogsBridge implements LoggerProvider {
  getLogger(_name: string, _version?: string, _options?: unknown): Logger {
    return {
      enabled(): boolean {
        return true;
      },
      emit(record: LogRecord): void {
        const attrs = (record.attributes ?? {}) as Record<string, unknown>;
        const name = record.eventName ?? record.severityText ?? "log";
        try {
          // The generic Logger surface accepts arbitrary strings; the cast is
          // safe because getEventDef re-validates at runtime and the bridge
          // degrades unregistered names to diagnostics below.
          emitEvent(name as RegisteredEventName, attrs);
        } catch (cause) {
          // An unregistered eventName through the generic Logger surface is a
          // diagnostic, not an invariant breach of the typed emitEvent path.
          if (cause instanceof Error && cause.message.includes("unregistered")) {
            emitDiagnostic(name, attrs);
            return;
          }
          throw cause;
        }
      },
    };
  }
}

export function registerLoggerProvider(options: {
  projectDir: string;
  auditExporter: AuditLogExporter;
  logExporter: LocalLogExporter;
  redaction?: RedactionPolicy;
}): void {
  if (registered !== null) {
    throw new Error("registerLoggerProvider called twice — invariant violation (NFR-3)");
  }
  registered = {
    projectDir: options.projectDir,
    auditExporter: options.auditExporter,
    logExporter: options.logExporter,
    policy: options.redaction ?? DEFAULT_REDACTION_POLICY,
  };
  logs.setGlobalLoggerProvider(new AmadeusLogsBridge());
}

// Test seam: drop the registration between fixtures.
export function resetLoggerProviderForTests(): void {
  logs.disable();
  registered = null;
}
