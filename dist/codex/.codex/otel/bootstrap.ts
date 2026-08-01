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
import { createLocalMetricExporter } from "./local-metric-exporter.ts";
import { createLocalSpanExporter } from "./local-span-exporter.ts";
import { registerLoggerProvider, registeredLoggerProjectDir } from "./logger-provider.ts";
import { registerMeterProvider, registeredMeterProjectDir, resetMeterProviderForTests } from "./meter-provider.ts";
import { recordTokenUsage } from "./metrics-instruments.ts";
import { setTokenUsageSink } from "./resource-suppliers.ts";
import { registerTracerProvider, registeredTracerProjectDir } from "./tracer-provider.ts";

// Whether THIS module already ran the logs arm's side effects (anchor restore
// and the health probe) and for which workspace. It is deliberately NOT the
// idempotency source for registration — that lives in the API singletons and
// is queried on every call, so a process whose provider was dropped gets a
// fresh registration instead of a memo saying it is still standing.
let logsSideEffectsFor: string | null = null;

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
  // Same unresolved-intent guard attachAnchor carries. auditFilePath THROWS
  // rather than name a shard in the bare intents root, so asking it for a path
  // before the first intent exists turns "nothing to probe" into a bootstrap
  // failure — and the migrated hooks bootstrap on every tool call, including in
  // a workspace whose only fault is being new. An unresolvable shard is the
  // absent-shard case, which returns without latching.
  if (activeIntent(projectDir) === null) return;
  const shard = auditFilePath(projectDir);
  if (!existsSync(shard)) return;
  const health = verifyJournalHealth({ shardPath: shard, projectDir });
  if (!health.ok) setFatal(`journal health probe failed: ${health.detail}`);
}

// Stand up the canonical emit path for this process. Safe to call from every
// entry point, in any order, however many times.
//
// Both the registered provider's workspace and this module's own record are
// checked BEFORE anything is registered: a mismatch on either is refused with
// nothing mutated. The two are separate questions — "is a provider standing,
// and for whom" and "did the side effects already run here" — and collapsing
// them is what let a dropped provider read as bootstrapped.
export function ensureOtelBootstrap(projectDir: string): void {
  const registeredFor = registeredLoggerProjectDir();
  if (registeredFor !== null) assertSameProject(registeredFor, projectDir, "logs");
  if (logsSideEffectsFor !== null) assertSameProject(logsSideEffectsFor, projectDir, "logs");

  ensureContextManager();
  // The metrics arm rides the logs arm rather than standing alone: four of the
  // five instruments are derived from canonical events, so every process that
  // can emit one is a process that can measure. Registered BEFORE the Logger
  // Provider so the first emit already has a Meter to record against.
  ensureMeterBootstrap(projectDir);
  if (registeredFor === null) {
    registerLoggerProvider({
      projectDir,
      auditExporter: createAuditLogExporter({ projectDir }),
      logExporter: createLocalLogExporter({ projectDir }),
    });
  }
  if (logsSideEffectsFor !== null) return;
  logsSideEffectsFor = projectDir;
  attachAnchor(projectDir);
  probeJournal(projectDir);
}

// Stand up the Metrics API for this process. Like the traces arm this has no
// side effects beyond the registration, so the singleton's recorded workspace
// is the whole state it needs. Installing the token-usage sink is part of the
// registration rather than a separate step: the sink IS the metrics arm's
// harness-facing half, and a process with a Meter but no sink would drop the
// one instrument no canonical event can derive.
export function ensureMeterBootstrap(projectDir: string): void {
  const registeredFor = registeredMeterProjectDir();
  if (registeredFor !== null) {
    assertSameProject(registeredFor, projectDir, "metrics");
    return;
  }
  registerMeterProvider({ projectDir, metricExporter: createLocalMetricExporter({ projectDir }) });
  setTokenUsageSink(recordTokenUsage);
}

// Stand up the Trace API for this process. Separate from the logs arm because
// spans are telemetry: a process that only writes audit rows never needs a
// Tracer, and a span wrapper must not drag the journal probe in behind it.
// This arm has no side effects beyond the registration, so the singleton's
// recorded workspace is the whole state it needs.
export function ensureTracerBootstrap(projectDir: string): void {
  const registeredFor = registeredTracerProjectDir();
  if (registeredFor !== null) {
    assertSameProject(registeredFor, projectDir, "traces");
    return;
  }
  ensureContextManager();
  registerTracerProvider({ projectDir, spanExporter: createLocalSpanExporter({ projectDir }) });
}

// Test seam: the record is per-process by design, so fixtures drop it the same
// way they drop the provider registrations.
//
// The metrics arm goes with it. The Logger and Tracer arms are registered BY
// the caller in most fixtures, so their resets are the caller's to run; the
// Meter is registered by this seam and by nothing else, so a fixture that drops
// the bootstrap without dropping the Meter would carry the previous fixture's
// workspace into the next one and be refused by assertSameProject.
export function resetOtelBootstrapForTests(): void {
  logsSideEffectsFor = null;
  resetMeterProviderForTests();
}
