import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { InstallerChangeSet } from "./change-detector.ts";
import { buildInstallerGatePlan, type GateCheck, type GateName } from "./gate-registry.ts";

export type GateRunResult = {
  name: GateName;
  status: "passed" | "failed" | "skipped";
  command: string;
  reason?: string;
};

export type GatePlanRunReport = {
  status: "required" | "skipped";
  skipReason?: string;
  gates: GateRunResult[];
  ok: boolean;
};

function parseArgs(argv: string[]): { changeSetPath: string; summaryPath: string } {
  let changeSetPath = ".amadeus-ci/setup/change-set.json";
  let summaryPath = ".amadeus-ci/setup/gate-summary.json";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--change-set") {
      changeSetPath = argv[index + 1] ?? changeSetPath;
      index += 1;
    } else if (arg === "--summary") {
      summaryPath = argv[index + 1] ?? summaryPath;
      index += 1;
    }
  }
  return { changeSetPath, summaryPath };
}

function topologicalSort(gates: GateCheck[]): GateCheck[] {
  const byName = new Map(gates.map((gate) => [gate.name, gate]));
  const sorted: GateCheck[] = [];
  const visited = new Set<GateName>();
  const visiting = new Set<GateName>();

  function visit(gate: GateCheck): void {
    if (visited.has(gate.name)) {
      return;
    }
    if (visiting.has(gate.name)) {
      throw new Error(`gate dependency cycle detected at ${gate.name}`);
    }
    visiting.add(gate.name);
    for (const dependency of gate.dependsOn) {
      const dependencyGate = byName.get(dependency);
      if (dependencyGate !== undefined) {
        visit(dependencyGate);
      }
    }
    visiting.delete(gate.name);
    visited.add(gate.name);
    sorted.push(gate);
  }

  for (const gate of gates) {
    visit(gate);
  }
  return sorted;
}

function runCommand(command: string): void {
  execSync(command, { stdio: "inherit", cwd: process.cwd() });
}

export function runInstallerGatePlan(changeSet: InstallerChangeSet): GatePlanRunReport {
  const plan = buildInstallerGatePlan(changeSet);
  if (plan.status === "skipped") {
    return {
      status: "skipped",
      skipReason: plan.skipReason,
      gates: [],
      ok: true,
    };
  }

  const ordered = topologicalSort(plan.gates);
  const results: GateRunResult[] = [];

  for (const gate of ordered) {
    try {
      runCommand(gate.command);
      results.push({ name: gate.name, status: "passed", command: gate.command });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      results.push({ name: gate.name, status: "failed", command: gate.command, reason });
      return {
        status: "required",
        gates: results,
        ok: false,
      };
    }
  }

  return {
    status: "required",
    gates: results,
    ok: true,
  };
}

function writeSummary(report: GatePlanRunReport, summaryPath: string): void {
  mkdirSync(dirname(resolve(summaryPath)), { recursive: true });
  writeFileSync(resolve(summaryPath), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const changeSet = JSON.parse(readFileSync(resolve(args.changeSetPath), "utf-8")) as InstallerChangeSet;
  const report = runInstallerGatePlan(changeSet);
  writeSummary(report, args.summaryPath);
  if (report.status === "skipped") {
    process.stdout.write(`${report.skipReason ?? "installer gates skipped"}\n`);
  }
  process.exitCode = report.ok ? 0 : 1;
}
