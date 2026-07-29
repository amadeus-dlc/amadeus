// Child process for the immediate-exit persistence check (NFR-2): emit one
// canonical event and one completed span through the Amadeus Providers, then
// exit at once — no flush, no shutdown hook. All stores must already hold the
// records because every exporter write is synchronous.
import {
  createAuditLogExporter,
} from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import {
  emitEvent,
  registerLoggerProvider,
} from "../../dist/claude/.claude/otel/logger-provider.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
} from "../../dist/claude/.claude/otel/tracer-provider.ts";

const projectDir = process.argv[2];
if (!projectDir) throw new Error("usage: otel-emit-child <projectDir>");

ensureContextManager();
registerLoggerProvider({
  projectDir,
  auditExporter: createAuditLogExporter({ projectDir }),
  logExporter: createLocalLogExporter({ projectDir }),
});
registerTracerProvider({ spanExporter: createLocalSpanExporter({ projectDir }) });

const tracer = getAmadeusTracer();
const span = tracer.startSpan("child-operation");
emitEvent("amadeus.decision.recorded", { Stage: "code-generation", Decision: "approve" });
span.end();
// Deliberate immediate exit: no flush, no await, no shutdown handler.
process.exit(0);
