// Child process for the U5 context-propagation 3-level chain test: attach the
// W3C carrier from the environment as this process's remote parent (FR-TRC-5),
// emit one span, then spawn the next generation with the carrier re-injected.
// Every generation appends its completed-span record to the same store file,
// so the parent test can assert trace-id equality and parent-span linkage
// across real process boundaries (BR-3).
//
// usage: otel-trace-chain-child <storeFile> <name> [nextName...]
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachRemoteParentFromEnv,
  ensureContextManager,
  injectToSubprocess,
} from "../../dist/claude/.claude/otel/context.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
} from "../../dist/claude/.claude/otel/tracer-provider.ts";

const [storeFile, name, ...rest] = process.argv.slice(2);
if (!storeFile || !name) {
  throw new Error("usage: otel-trace-chain-child <storeFile> <name> [nextName...]");
}

ensureContextManager();
attachRemoteParentFromEnv(process.env);
registerTracerProvider({
  spanExporter: createLocalSpanExporter({
    projectDir: dirname(storeFile),
    storeDir: storeFile,
    write: (_path, line) => appendFileSync(storeFile, line, "utf-8"),
  }),
});

const tracer = getAmadeusTracer();
tracer.startActiveSpan(`chain-${name}`, (span) => {
  try {
    if (rest.length > 0) {
      const r = spawnSync(
        process.execPath,
        [fileURLToPath(import.meta.url), storeFile, ...rest],
        { env: injectToSubprocess({ ...process.env }), stdio: "ignore" }
      );
      if (r.status !== 0) throw new Error(`next generation exited ${r.status}`);
    }
  } finally {
    span.end(); // FR-TRC-2: the callback owns span.end()
  }
});
