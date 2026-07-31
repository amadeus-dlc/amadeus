// subprocess-span.ts — the subprocess-boundary Span (FR-TRC-1/2, 裁定 Q18 tier 2).
//
// The Trace API home for a spawnSync-style call: the duration lands as a
// completed Span in the span store instead of a pre-OTel telemetry buffer row.
// The call shape is deliberately the one the legacy wrapper had — (projectDir,
// command, fn) returning fn's result — so a migrating call site changes its
// import and nothing else.
//
// WHAT RIDES THE SPAN. The command NAME only (a safe token the caller chooses),
// never the argv: paths and prompts stay out of telemetry by default (Q5). The
// exit code keeps the legacy semantics — ok means 0, and a spawn that never
// produced a result is "spawn-failed".
//
// ALWAYS ENDED. startActiveSpan does NOT auto-end the span (FR-TRC-2), so the
// end lives in a `finally` that also runs when the child spawn throws. The span
// is active for the callback's whole duration, which is what lets a caller
// inject the W3C carrier into the child environment and have it name THIS span
// (FR-TRC-5).

import { SpanStatusCode } from "../vendor/opentelemetry/api/index.js";
import { observabilityEnabled } from "../tools/amadeus-observability.ts";
import { ensureTracerBootstrap } from "./bootstrap.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes, scrubCredentials } from "./redaction.ts";
import { getAmadeusTracer } from "./tracer-provider.ts";

// Both spawn shapes in the codebase: node:child_process results carry `status`,
// Bun.spawnSync results carry `exitCode`.
export type SpawnLikeResult = { status?: number | null; exitCode?: number | null };

// The attribute value for a spawn that never produced a result (the callback
// threw). A distinct token rather than a number, because "no exit code" is not
// an exit code.
export const SPAWN_FAILED = "spawn-failed";

export function spawnExitCode(result: SpawnLikeResult | null): number | null {
  if (result === null) return null;
  if (typeof result.status === "number") return result.status;
  if (typeof result.exitCode === "number") return result.exitCode;
  return null;
}

// The span NAME is the one field no redaction layer covers: both layers filter
// attribute bags, and the exporter writes `name` through untouched. A command
// token carrying a credential would therefore reach the store raw through the
// name even though the same string is masked in the Command attribute, so the
// scrub is applied here with the shared pattern vocabulary.
export function subprocessSpanName(command: string): string {
  return `subprocess:${scrubCredentials(command) as string}`;
}

// redactAttributes is bag-shaped (`unknown` values, because it serves every
// signal); this pair is strings by construction, and the Trace API's Attributes
// type wants that stated rather than asserted.
function stringAttributes(attrs: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) out[key] = String(value);
  return out;
}

export function observeSubprocessSpan<T extends SpawnLikeResult>(
  projectDir: string,
  command: string,
  fn: () => T
): T {
  if (!observabilityEnabled(projectDir)) return fn();
  ensureTracerBootstrap(projectDir);
  return getAmadeusTracer().startActiveSpan(subprocessSpanName(command), (span) => {
    let result: T | null = null;
    try {
      result = fn();
      return result;
    } catch (cause) {
      span.recordException(cause instanceof Error ? cause : new Error(String(cause)));
      throw cause;
    } finally {
      const exitCode = spawnExitCode(result);
      // Write-time redaction (FR-DST-3 layer 1). The exporter redacts again at
      // the store boundary; the pass is idempotent, and doing it here means a
      // credential-shaped command token is already masked on the live span.
      span.setAttributes(
        stringAttributes(
          redactAttributes(
            { Command: command, ExitCode: exitCode === null ? SPAWN_FAILED : String(exitCode) },
            DEFAULT_REDACTION_POLICY
          )
        )
      );
      span.setStatus(exitCode === 0 ? { code: SpanStatusCode.OK } : { code: SpanStatusCode.ERROR });
      span.end();
    }
  });
}
