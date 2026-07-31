// SessionEnd hook: Emit SESSION_ENDED when a Claude Code conversation ends.
// The workflow lifecycle is independent of session lifecycle — ending a
// session does NOT complete the workflow. This event is observability only.
//
// No-op if amadeus-state.md is absent in cwd (the canonical "active workflow"
// signal — matches session-start.ts and the plan definition).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { appendAuditEntryViaEvents } from "../otel/migration-adapter.ts";
import { initProcessObservability, observabilityEnabled } from "../tools/amadeus-observability.ts";
import { ensureContextManager, INTENT_CONTEXT_SCHEMA_VERSION, injectToSubprocess, persistIntentContext } from "../otel/context.ts";
import { createLocalSpanExporter } from "../otel/local-span-exporter.ts";
import { getAmadeusTracer, registerTracerProvider } from "../otel/tracer-provider.ts";
import {
  activeIntent,
  docsRoot,
  errorMessage,
  hooksHealthDir,
  isClaudeCodeHookInput,
  isoTimestamp,
  readHookStdin,
  recordHookDrop,
  resolveProjectDirFromHook,
  stateFilePath,
} from "../tools/amadeus-lib.ts";

// Drain stdin first: the payload's `cwd` is the top rung of project-dir
// resolution (#1482), and the stream can only be read once.
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);

// No workflow active — do nothing (consistent with session-start.ts)
if (!existsSync(stateFilePath(projectDir))) process.exit(0);

// Telemetry process span (opt-in; no-op unless observability.enabled)
initProcessObservability("hook:session-end", projectDir);

// Health heartbeat
const healthDir = hooksHealthDir(projectDir);
mkdirSync(healthDir, { recursive: true });
writeFileSync(join(healthDir, "session-end.last"), isoTimestamp(), "utf-8");

// Reason field from the already-read payload (Claude Code may pass
// reason=logout|clear|prompt_input_exit etc.). Empty on a TTY, where
// readHookStdin never blocks on a terminal read.
let reason = "unknown";
try {
  if (hookStdin.text) {
    const raw: unknown = JSON.parse(hookStdin.text);
    if (isClaudeCodeHookInput(raw) && raw.reason) {
      reason = String(raw.reason);
    }
  }
} catch {
  // Treat malformed/missing stdin as unknown
}

try {
  // Stand up the canonical emit path before the first emit (emitEvent
  // throws with no Logger Provider registered). Inside the try so a
  // bootstrap failure lands on the SAME fail-open drop as an append failure.
  ensureOtelBootstrap(projectDir);
  appendAuditEntryViaEvents("SESSION_ENDED", { Reason: reason }, projectDir);
} catch (e) {
  recordHookDrop(projectDir, "session-end", errorMessage(e));
  process.exit(0);
}

// Relay piggyback (設計裁定 Q19: on-demand, no daemon): fire-and-forget a
// telemetry flush at session end. Detached, output ignored, failures never
// reach the hook — the Relay owns its own lock, cursor, and fail-open
// diagnostics. Guarded by the same opt-in every other telemetry surface uses.
if (observabilityEnabled(projectDir)) {
  try {
    // U1 representative subprocess wiring: the session-end -> relay spawn
    // is wrapped in a span (FR-TRC-1) with W3C context injected into the
    // child environment (FR-TRC-5 minimal). The callback does NOT auto-end
    // the span — finally { span.end(); } (FR-TRC-2).
    ensureContextManager();
    registerTracerProvider({ projectDir, spanExporter: createLocalSpanExporter({ projectDir }) });
    const tracer = getAmadeusTracer();
    const recordRoot = docsRoot(projectDir);
    const intent = activeIntent(projectDir);
    tracer.startActiveSpan("session-end->relay", (span) => {
      try {
        if (recordRoot !== null && intent !== null) {
          // Persist the intent anchor so a later short-lived process can
          // rejoin this trace as a remote parent (FR-TRC-4).
          persistIntentContext(recordRoot, {
            traceId: span.spanContext().traceId,
            anchorSpanId: span.spanContext().spanId,
            intentId: intent,
            schemaVersion: INTENT_CONTEXT_SCHEMA_VERSION,
          });
        }
        const relay = new URL("../otel/relay.ts", import.meta.url).pathname;
        Bun.spawn({
          cmd: ["bun", "run", relay, "flush", "--project-dir", projectDir],
          stdout: "ignore",
          stderr: "ignore",
          stdin: "ignore",
          env: injectToSubprocess({ ...process.env }),
        }).unref();
      } finally {
        span.end();
      }
    });
  } catch {
    // fail-open: a missing runtime or spawn failure never blocks session end
  }
}
