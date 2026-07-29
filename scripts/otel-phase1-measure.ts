// otel-phase1-measure.ts — Phase 1 (#1678) measurement harness.
//
// Produces the ADR inputs the walking skeleton owes:
//   1. canonical sync append cost, cold + warm, for the NEW path
//      (emitEvent -> AuditLogExporter) vs the CURRENT appendAuditEntry —
//      NFR-1's numeric budget is fixed from these numbers (Phase 1 ADR).
//   2. bundle size of the vendored OTel API + otel/ layer (FR-DST-1).
//   3. API singleton check: exactly one vendored api copy in the bundle.
//
// Usage: bun scripts/otel-phase1-measure.ts [--iterations <n>]

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendAuditEntry } from "../packages/framework/core/tools/amadeus-audit.ts";
import { birthIntent, docsRoot } from "../packages/framework/core/tools/amadeus-lib.ts";
import { createAuditLogExporter } from "../packages/framework/core/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../packages/framework/core/otel/context.ts";
import { createLocalLogExporter } from "../packages/framework/core/otel/local-log-exporter.ts";
import { emitEvent, registerLoggerProvider } from "../packages/framework/core/otel/logger-provider.ts";

const iterations = (() => {
  const i = process.argv.indexOf("--iterations");
  return i >= 0 ? Number(process.argv[i + 1]) : 200;
})();

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

function timeSync(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

function seedProject(): string {
  const proj = mkdtempSync(join(tmpdir(), "otel-measure-"));
  mkdirSync(join(proj, "amadeus", "spaces", "default", "intents"), { recursive: true });
  writeFileSync(join(proj, "amadeus", "active-space"), "default\n", "utf-8");
  birthIntent(proj, "otel-measure", "default", "feature");
  return proj;
}

function dirBytes(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    try {
      if (statSync(p).isDirectory()) total += dirBytes(p);
      else total += statSync(p).size;
    } catch {
      // skip unreadable entries
    }
  }
  return total;
}

const proj = seedProject();
try {
  // Cold: first-ever append on each path (fresh shard already created by seed).
  const coldCurrent = timeSync(() => appendAuditEntry("HEALTH_CHECKED", { Probe: "cold" }, proj));

  ensureContextManager();
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({ projectDir: proj }),
    logExporter: createLocalLogExporter({ projectDir: proj }),
  });
  const coldNew = timeSync(() => emitEvent("amadeus.decision.recorded", { Stage: "measure", Decision: "cold" }));

  // Warm: steady-state appends.
  const warmCurrent: number[] = [];
  const warmNew: number[] = [];
  for (let i = 0; i < iterations; i++) {
    warmCurrent.push(timeSync(() => appendAuditEntry("HEALTH_CHECKED", { Probe: `warm-${i}` }, proj)));
    warmNew.push(timeSync(() => emitEvent("amadeus.decision.recorded", { Stage: "measure", Decision: `warm-${i}` })));
  }
  warmCurrent.sort((a, b) => a - b);
  warmNew.sort((a, b) => a - b);

  const coreDir = join(__dirname, "..", "packages", "framework", "core");
  const bundleBytes = dirBytes(join(coreDir, "vendor")) + dirBytes(join(coreDir, "otel"));

  const report = {
    generatedAt: new Date().toISOString(),
    iterations,
    appendMs: {
      cold: { current: coldCurrent, new: coldNew },
      warmP50: { current: percentile(warmCurrent, 50), new: percentile(warmNew, 50) },
      warmP95: { current: percentile(warmCurrent, 95), new: percentile(warmNew, 95) },
    },
    bundle: { vendorPlusOtelBytes: bundleBytes },
    record: readFileSync(join(docsRoot(proj)!, "audit", readdirSync(join(docsRoot(proj)!, "audit"))[0]!), "utf-8").split("\n").filter((l) => l.trim() !== "").length,
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(proj, { recursive: true, force: true });
}
