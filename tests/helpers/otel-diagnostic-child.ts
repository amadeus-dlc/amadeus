// Child process for the U10 cross-process diagnostic correlation check: adopt
// the W3C carrier from the environment as this process's remote parent (U5,
// FR-TRC-5), start one span, and emit a diagnostic inside it. The record must
// land in the shared diagnostic Log Store carrying the PARENT's traceId.
//
// usage: otel-diagnostic-child <projectDir>
import { attachRemoteParentFromEnv, ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { emitDiagnostic, registerLoggerProvider } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { getAmadeusTracer, registerTracerProvider } from "../../dist/claude/.claude/otel/tracer-provider.ts";

const projectDir = process.argv[2];
if (!projectDir) throw new Error("usage: otel-diagnostic-child <projectDir>");

ensureContextManager();
attachRemoteParentFromEnv(process.env);
registerLoggerProvider({
  projectDir,
  auditExporter: createAuditLogExporter({ projectDir }),
  logExporter: createLocalLogExporter({ projectDir }),
});
registerTracerProvider({ projectDir, spanExporter: createLocalSpanExporter({ projectDir }) });

const tracer = getAmadeusTracer();
tracer.startActiveSpan("child-operation", (span) => {
  try {
    emitDiagnostic("child-diagnostic", { Note: "from the child process" });
  } finally {
    span.end();
  }
});
process.exit(0);
