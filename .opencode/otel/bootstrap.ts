// bootstrap.ts — the one-per-process OTel bootstrap seam (FR-EXP-1).
//
// Every short-lived Amadeus process that emits a canonical Event has to stand
// the Logger Provider up before the first emit (emitEvent throws when nothing
// is registered), and registration is a once-per-process invariant (NFR-3:
// registerLoggerProvider / registerTracerProvider throw on the second call).
// A per-entry-point copy of that sequence would therefore be both duplicated
// and fragile: two modules in one process each calling register would crash a
// tool that merely imported both.
//
// This seam is the single place that sequence lives. It is idempotent by
// construction — it asks the API singletons whether a provider is already
// there rather than keeping a shadow flag — so an entry point calls it
// blindly, and a process where some other module registered first (a test
// fixture, a hook that stood the tracer up for its own span) is reused rather
// than re-registered.
//
// The logs arm carries the whole sequence amadeus-log.ts owned before the
// extraction: context manager, Logger Provider over the synchronous
// AuditLogExporter, intent-anchor restore (FR-TRC-4) and the non-destructive
// journal health probe whose failure latches the process so no later canonical
// mutation proceeds (FR-EVT-5).

import { existsSync } from "node:fs";
import { activeIntent, auditFilePath, docsRoot } from "../tools/amadeus-lib.ts";
import { createAuditLogExporter } from "./audit-log-exporter.ts";
import { attachIntentContext, ensureContextManager, restoreIntentContext } from "./context.ts";
import { setFatal, verifyJournalHealth } from "./fatal-latch.ts";
import { createLocalLogExporter } from "./local-log-exporter.ts";
import { createLocalSpanExporter } from "./local-span-exporter.ts";
import { isLoggerProviderRegistered, registerLoggerProvider } from "./logger-provider.ts";
import { isTracerProviderRegistered, registerTracerProvider } from "./tracer-provider.ts";

// The project dir each arm was bootstrapped for. A process serves exactly one
// workspace: a second bootstrap naming a different dir would leave the
// providers pointed at the first one while the caller believes otherwise, so
// it is refused loudly rather than silently ignored.
let logsProjectDir: string | null = null;
let tracesProjectDir: string | null = null;

function assertSameProject(bootstrapped: string, requested: string, arm: string): void {
  if (bootstrapped !== requested) {
    throw new Error(
      `OTel ${arm} already bootstrapped for project dir ${bootstrapped}, refusing to re-bootstrap for ${requested} — invariant violation (one workspace per process)`
    );
  }
}

// Restore and attach the persisted intent anchor so this short-lived process
// joins the intent trace. BR-6: restore mints and persists a fresh anchor when
// the record has none, so the attach is unconditional.
function attachAnchor(projectDir: string): void {
  const intent = activeIntent(projectDir);
  const root = docsRoot(projectDir);
  if (intent === null || root === null) return;
  attachIntentContext(restoreIntentContext(root, intent));
}

// Non-destructive read consistency probe over this clone's shard. An
// inconsistent journal latches the process (FR-EVT-5) — the latch is what
// stops a later canonical mutation from appending onto a broken ledger.
function probeJournal(projectDir: string): void {
  const shard = auditFilePath(projectDir);
  if (!existsSync(shard)) return;
  const health = verifyJournalHealth({ shardPath: shard, projectDir });
  if (!health.ok) setFatal(`journal health probe failed: ${health.detail}`);
}

// Stand up the canonical emit path for this process. Safe to call from every
// entry point, in any order, however many times.
export function ensureOtelBootstrap(projectDir: string): void {
  if (logsProjectDir !== null) {
    assertSameProject(logsProjectDir, projectDir, "logs");
    return;
  }
  ensureContextManager();
  if (!isLoggerProviderRegistered()) {
    registerLoggerProvider({
      projectDir,
      auditExporter: createAuditLogExporter({ projectDir }),
      logExporter: createLocalLogExporter({ projectDir }),
    });
  }
  logsProjectDir = projectDir;
  attachAnchor(projectDir);
  probeJournal(projectDir);
}

// Stand up the Trace API for this process. Separate from the logs arm because
// spans are telemetry: a process that only writes audit rows never needs a
// Tracer, and a span wrapper must not drag the journal probe in behind it.
export function ensureTracerBootstrap(projectDir: string): void {
  if (tracesProjectDir !== null) {
    assertSameProject(tracesProjectDir, projectDir, "traces");
    return;
  }
  ensureContextManager();
  if (!isTracerProviderRegistered()) {
    registerTracerProvider({ spanExporter: createLocalSpanExporter({ projectDir }) });
  }
  tracesProjectDir = projectDir;
}

// Test seam: the memo is per-process by design, so fixtures drop it the same
// way they drop the provider registrations.
export function resetOtelBootstrapForTests(): void {
  logsProjectDir = null;
  tracesProjectDir = null;
}
