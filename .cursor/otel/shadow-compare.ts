// shadow-compare.ts — the shadow-comparison harness PROTOTYPE (VER-3 order 4).
//
// Correlates the old telemetry path (buffer events written by
// appendTelemetryEvent) with the new OTel path (completed-span records) by
// operation name and emits a machine-readable JSON report. Phase 4's
// deletion gate (FR-MIG-4(d), VER-5) grows from this prototype; U1 proves
// the report shape and the correlation mechanics on the representative
// operations only.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { telemetryDir } from "../tools/amadeus-observability.ts";

export type ShadowReport = {
  readonly generatedAt: string;
  readonly oldEvents: number;
  readonly newSpans: number;
  readonly matched: string[];
  readonly missingInNew: string[];
  readonly missingInOld: string[];
};

function nameFromLine(line: string): string | null {
  if (line.trim() === "") return null;
  try {
    const record: unknown = JSON.parse(line);
    if (record !== null && typeof record === "object" && typeof (record as { name?: unknown }).name === "string") {
      return (record as { name: string }).name;
    }
  } catch {
    // a torn line is skipped, never fatal to the comparison
  }
  return null;
}

function readJsonlNames(dir: string, prefix: string): string[] {
  if (!existsSync(dir)) return [];
  const names: string[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.startsWith(prefix) || !file.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, file), "utf-8").split("\n")) {
      const name = nameFromLine(line);
      if (name !== null) names.push(name);
    }
  }
  return names;
}

export function buildShadowReport(projectDir: string): ShadowReport {
  const dir = telemetryDir(projectDir);
  const oldNames = dir === null ? [] : readJsonlNames(dir, "buffer-");
  const newNames = dir === null ? [] : readJsonlNames(dir, "spans-");
  const oldSet = new Set(oldNames);
  const newSet = new Set(newNames);
  const matched = [...oldSet].filter((n) => newSet.has(n)).sort();
  const missingInNew = [...oldSet].filter((n) => !newSet.has(n)).sort();
  const missingInOld = [...newSet].filter((n) => !oldSet.has(n)).sort();
  return {
    generatedAt: new Date().toISOString(),
    oldEvents: oldNames.length,
    newSpans: newNames.length,
    matched,
    missingInNew,
    missingInOld,
  };
}

// Persist the report next to the stores it compares; returns the path.
export function writeShadowReport(projectDir: string, report: ShadowReport): string {
  const dir = telemetryDir(projectDir);
  if (dir === null) {
    throw new Error("no resolvable intent record for the shadow report");
  }
  const path = join(dir, "shadow-report.json");
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  return path;
}
