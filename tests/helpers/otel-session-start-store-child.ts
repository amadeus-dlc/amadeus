// Child process for the SessionStart resource walking skeleton (#1868 §1).
//
// The conversation id only core cannot derive reaches the resource bag through
// ONE line in the real hook (supplyResourceAttribute("session.id", …)), and
// that line is only observable from inside the hook's own process: the supply
// registry is per-process, and the canonical journal row the hook writes
// carries no resource. A test that supplies the id itself therefore stays green
// with the hook's line deleted.
//
// So this child RUNS THE REAL HOOK — importing its module executes it top to
// bottom, exactly as the harness spawn does — and only then writes a Signal
// Store record. The resource on that record was assembled by the same process
// the hook ran in, so the id is there if and only if the hook supplied it.
//
// Everything is imported from the SHIPPED copy so the hook and this file share
// ONE module graph, and therefore one supplier registry — and so the surface
// under test is the one a harness actually spawns.
import { ensureOtelBootstrap } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { createLocalMetricExporter } from "../../dist/claude/.claude/otel/local-metric-exporter.ts";

const projectDir = process.argv[2];
if (!projectDir) throw new Error("usage: otel-session-start-store-child <projectDir>");

await import("../../dist/claude/.claude/hooks/amadeus-session-start.ts");

ensureOtelBootstrap(projectDir);
createLocalMetricExporter({ projectDir }).exportMetric({
  name: "amadeus.gate.iterations",
  kind: "counter",
  value: 1,
  timestamp: new Date().toISOString(),
  attributes: { "amadeus.stage": "code-generation" },
  traceId: null,
  spanId: null,
});
process.exit(0);
