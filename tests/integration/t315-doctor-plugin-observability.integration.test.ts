// covers: file:packages/framework/core/tools/amadeus-utility.ts
// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// U5 doctor-observability — the REAL read path. readDoctorPluginObservation reads
// the composition / journal / drops dot-files from disk (existsSync-guarded,
// read-only) and handleDoctor projects them into the --doctor report, folding the
// plugin section's failing rows into the doctor exit aggregate. Touches the real
// filesystem (a scaffolded project + engine dot-files), so it is the integration
// tier (fs-tests-integration-first) and drives everything in-process for lcov.
//
// Two-sided proof (corpus-sweep / falling-proof): a degraded drop and a
// recovery-pending journal flip a healthy exit-0 doctor to exit 1 with a loud
// line; a healthy composed plugin and an advisory drop stay green. Read-only is
// proven by byte-identical dot-files across a doctor run (BR-U5-3).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createNodeBackend,
  emptyComposition,
  type Journal,
  type PluginRecord,
  writeDropsRecord,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildDoctorPluginSection,
  doctorPluginRows,
  readDoctorPluginObservation,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";
import {
  handleDoctor,
  resolveDoctorContext,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import { cleanupTestProject, setupIntegrationProject } from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STAGE_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const RULES_DIR = join(REPO_ROOT, "packages", "framework", "core", "memory");
const projects: string[] = [];
const savedEnv = {
  harness: process.env.AMADEUS_HARNESS_DIR,
  stageGraph: process.env.AMADEUS_STAGE_GRAPH,
  rules: process.env.AMADEUS_RULES_DIR,
  scope: process.env.AMADEUS_DEFAULT_SCOPE,
};

function healthyProject(): string {
  const projectDir = setupIntegrationProject({ withState: "state-mid-ideation.md" });
  projects.push(projectDir);
  return projectDir;
}

function doctor(projectDir: string): { exitCode: number; output: string } {
  return handleDoctor(resolveDoctorContext(projectDir));
}

function minimalRecord(plugin: string): PluginRecord {
  return {
    plugin,
    ownedPaths: [],
    ownedContentDigests: new Map(),
    stageIndex: [],
    stageIndexDigest: "",
    trustGrant: null,
    sharedFiles: [],
  };
}

function seedComposedPlugin(projectDir: string, plugin: string): void {
  const backend = createNodeBackend(projectDir);
  backend.writeComposition({ ledger: new Map(), plugins: new Map([[plugin, minimalRecord(plugin)]]) });
}

function seedPendingJournal(projectDir: string): void {
  const journal: Journal = {
    txnId: "t315",
    phase: "PREPARED",
    kind: "compose",
    trustGrant: null,
    writeSet: { hostWrites: new Map(), hostRemovals: [], composition: emptyComposition(), audit: { event: "COMMIT_PREPARED", plugin: "pro", detail: "" } },
    preimages: { host: new Map(), composition: emptyComposition(), auditCount: 0 },
  };
  createNodeBackend(projectDir).writeJournal(journal);
}

beforeEach(() => {
  process.env.AMADEUS_HARNESS_DIR = ".claude";
  process.env.AMADEUS_STAGE_GRAPH = STAGE_GRAPH;
  process.env.AMADEUS_RULES_DIR = RULES_DIR;
  delete process.env.AMADEUS_DEFAULT_SCOPE;
});

afterEach(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  for (const [name, value] of [
    ["AMADEUS_HARNESS_DIR", savedEnv.harness],
    ["AMADEUS_STAGE_GRAPH", savedEnv.stageGraph],
    ["AMADEUS_RULES_DIR", savedEnv.rules],
    ["AMADEUS_DEFAULT_SCOPE", savedEnv.scope],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("t315 doctor plugin observability — real read path", () => {
  test("0-plugin host degrades to one passing line and does not flip a healthy exit (BR-U5-4)", () => {
    const projectDir = healthyProject();
    const result = doctor(projectDir);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Plugins: 0 installed");
  });

  test("a degraded drop is visible and fails the doctor (silent drop forbidden — FR-5)", () => {
    const projectDir = healthyProject();
    // Baseline is exit 0 (t257), so the flip is attributable to the degraded row.
    expect(doctor(projectDir).exitCode).toBe(0);
    writeDropsRecord(projectDir, {
      plugins: new Map([["pro", [{ surface: "hooks", severity: "degraded", reason: "no host hook adapter" }]]]),
    });
    const result = doctor(projectDir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("[degraded: hooks]");
  });

  test("an advisory drop is visible but stays green (PASS(advisory))", () => {
    const projectDir = healthyProject();
    writeDropsRecord(projectDir, {
      plugins: new Map([["pro", [{ surface: "marketplace", severity: "advisory", reason: "metadata only" }]]]),
    });
    const result = doctor(projectDir);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("[advisory: marketplace]");
  });

  test("both severities coexist for one plugin — degraded fails, advisory stays visible", () => {
    const projectDir = healthyProject();
    writeDropsRecord(projectDir, {
      plugins: new Map([
        [
          "pro",
          [
            { surface: "hooks", severity: "degraded", reason: "d" },
            { surface: "marketplace", severity: "advisory", reason: "a" },
          ],
        ],
      ]),
    });
    const result = doctor(projectDir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("[degraded: hooks]");
    expect(result.output).toContain("[advisory: marketplace]");
  });

  test("a composed plugin without a journal reports [ok] and stays green", () => {
    const projectDir = healthyProject();
    seedComposedPlugin(projectDir, "pro");
    const result = doctor(projectDir);
    expect(result.exitCode).toBe(0);
    expect(result.output).toMatch(/Plugin pro: composed@\d+ \[ok\]/);
  });

  test("a pending recovery journal surfaces [recovery-pending] and fails (FR-6/NFR-1)", () => {
    const projectDir = healthyProject();
    seedComposedPlugin(projectDir, "pro");
    seedPendingJournal(projectDir);
    const result = doctor(projectDir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("[recovery-pending: run compose to recover]");
  });

  test("fail-closed: a drop severity outside the union (on-disk JSON) surfaces [unknown] and fails", () => {
    const projectDir = healthyProject();
    // Write the drops JSON directly with an out-of-union severity — exactly what
    // dropsFromJson casts without validating. The projection must not trust it.
    writeFileSync(
      join(projectDir, ".amadeus-plugin-drops.json"),
      JSON.stringify({ plugins: { pro: [{ surface: "hooks", severity: "critical", reason: "x" }] } }, null, 2),
    );
    const result = doctor(projectDir);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("[unknown: severity critical: hooks]");
  });

  test("doctor is read-only: the plugin dot-files are byte-identical across a run (BR-U5-3)", () => {
    const projectDir = healthyProject();
    const dropsPath = join(projectDir, ".amadeus-plugin-drops.json");
    writeDropsRecord(projectDir, {
      plugins: new Map([["pro", [{ surface: "hooks", severity: "degraded", reason: "d" }]]]),
    });
    const before = readFileSync(dropsPath);
    doctor(projectDir);
    expect(readFileSync(dropsPath).equals(before)).toBe(true);
  });

  test("readDoctorPluginObservation skips the host walk for a 0-plugin host (projection returns empty)", () => {
    const projectDir = healthyProject();
    const obs = readDoctorPluginObservation(projectDir);
    expect(obs.diagnostics).toEqual([]);
    expect(obs.activation).toBeNull();
    const section = buildDoctorPluginSection(obs);
    expect(doctorPluginRows(section)).toEqual([{ pass: true, label: "Plugins: 0 installed" }]);
  });
});
