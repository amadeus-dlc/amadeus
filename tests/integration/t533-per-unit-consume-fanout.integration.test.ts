// covers: subcommand:amadeus-orchestrate:next
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createAuditUnitPoolRepository,
  createUnitPoolCoordinator,
} from "../../packages/framework/core/tools/amadeus-unit-pool-runtime.ts";
import { resetOtelBootstrapForTests } from "../../packages/framework/core/otel/bootstrap.ts";
import { ensureContextManager } from "../../packages/framework/core/otel/context.ts";
import { resetFatalLatchForTests } from "../../packages/framework/core/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../packages/framework/core/otel/logger-provider.ts";
import { resetTracerProviderForTests } from "../../packages/framework/core/otel/tracer-provider.ts";
import {
  cleanupTestProject,
  DEFAULT_RECORD_DIR,
  seededRecordDir,
  seededStateFile,
  sedReplaceInFile,
  setupIntegrationProject,
} from "../harness/fixtures.ts";
const projects: string[] = [];
const consumerEdges = {
  "build-and-test": [
    ["code-generation-plan", "code-generation"],
    ["code-summary", "code-generation"],
  ],
  "ci-pipeline": [["code-summary", "code-generation"]],
  "performance-validation": [
    ["performance-requirements", "nfr-requirements"],
    ["scalability-requirements", "nfr-requirements"],
    ["performance-design", "nfr-design"],
    ["scalability-design", "nfr-design"],
  ],
  "observability-setup": [
    ["performance-design", "nfr-design"],
    ["security-design", "nfr-design"],
    ["reliability-design", "nfr-design"],
    ["monitoring-design", "infrastructure-design"],
    ["infrastructure-services", "infrastructure-design"],
  ],
  "incident-response": [
    ["reliability-design", "nfr-design"],
    ["security-design", "nfr-design"],
    ["deployment-architecture", "infrastructure-design"],
  ],
  "deployment-pipeline": [
    ["deployment-architecture", "infrastructure-design"],
    ["cicd-pipeline", "infrastructure-design"],
  ],
  "environment-provisioning": [
    ["deployment-architecture", "infrastructure-design"],
    ["infrastructure-services", "infrastructure-design"],
  ],
} as const;

function resetTelemetry(): void {
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  ensureContextManager();
}

beforeEach(() => {
  resetTelemetry();
});

afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
});

function projectWithOutcomes(
  missing?: { unit: string; artifact: string },
  stage: keyof typeof consumerEdges = "build-and-test",
  outcomeOverrides: Readonly<Record<string, "succeeded" | "failed" | "cancelled" | "pending">> = {},
): string {
  const project = setupIntegrationProject({ withState: "state-brownfield-feature.md" });
  projects.push(project);
  const state = seededStateFile(project);
  sedReplaceInFile(
    state,
    /^- \*\*Current Stage\*\*:.*$/m,
    `- **Current Stage**: ${stage}`,
  );
  sedReplaceInFile(
    state,
    new RegExp(`^- \\[.\\] ${stage} — .*$`, "m"),
    `- [-] ${stage} — EXECUTE`,
  );
  sedReplaceInFile(
    state,
    /^- \*\*Status\*\*: .*$/m,
    "- **Status**: Running\n- **Construction Autonomy Mode**: gated\n- **Skeleton Stance**: on",
  );
  sedReplaceInFile(
    state,
    /^## Runtime State$/m,
    '## Runtime State\n- **Mirror Boundary Receipts**: {"ideation":"completed","inception":"completed","construction":"completed"}',
  );
  const record = seededRecordDir(project);
  writeFileSync(join(record, "runtime-graph.json"), `${JSON.stringify({
    bolt_dag: {
      units: [
        { name: "unit-z", depends_on: [], kind: "library" },
        { name: "unit-a", depends_on: [], kind: "library" },
      ],
      batches: [["unit-z", "unit-a"]],
    },
  })}\n`);
  const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(project));
  expect(pool.initialEnqueue({
    idempotencyKey: "init",
    batchId: "1",
    cap: 2,
    units: [
      { unitId: "unit-z", dependsOn: [] },
      { unitId: "unit-a", dependsOn: [] },
    ],
  }).ok).toBe(true);
  for (const unit of ["unit-z", "unit-a"]) {
    expect(pool.acquire({ idempotencyKey: `acquire-${unit}`, batchId: "1" }).ok).toBe(true);
  }
  for (const attempt of pool.readProjection("1").active) {
    expect(pool.confirmDispatch({
      idempotencyKey: `confirm-${attempt.unitId}`,
      batchId: "1",
      attemptId: attempt.attemptId,
      nativeHandle: `native-${attempt.unitId}`,
    }).ok).toBe(true);
    const outcome = outcomeOverrides[attempt.unitId] ?? "succeeded";
    if (outcome === "pending") continue;
    expect(pool.settleRelease({
      idempotencyKey: `settle-${attempt.unitId}`,
      batchId: "1",
      attemptId: attempt.attemptId,
      outcome,
    }).ok).toBe(true);
  }
  for (const unit of ["unit-z", "unit-a"]) {
    const artifacts = new Map(
      Object.values(consumerEdges).flat().map(([artifact, producer]) => [artifact, producer]),
    );
    for (const [artifact, producer] of artifacts) {
      if (missing?.unit === unit && missing.artifact === artifact) continue;
      const directory = join(record, "construction", unit, producer);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, `${artifact}.md`), `${unit}:${artifact}\n`);
    }
  }
  return project;
}

function next(project: string) {
  return spawnSync(process.execPath, [join(project, ".claude/tools/amadeus-orchestrate.ts"), "next", "--project-dir", project], {
    encoding: "utf8",
    env: { ...process.env, AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" },
  });
}

describe("t533 orchestrator per-unit consume fan-out", () => {
  test("build-and-test lists every existing concrete plan and summary in stable order", () => {
    const project = projectWithOutcomes();
    const result = next(project);
    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.kind, JSON.stringify(directive)).toBe("run-stage");
    expect(directive.stage).toBe("build-and-test");
    expect(directive.consumes).toEqual([
      "unit-z/code-generation/code-generation-plan.md",
      "unit-z/code-generation/code-summary.md",
      "unit-a/code-generation/code-generation-plan.md",
      "unit-a/code-generation/code-summary.md",
    ].map((tail) =>
      `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/${tail}`
    ));
    expect(directive.consumes_absent).toBeUndefined();
  });

  test("classifies a succeeded Unit required gap as unexpected without a partial path", () => {
    const project = projectWithOutcomes({ unit: "unit-a", artifact: "code-summary" });
    const result = next(project);
    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    const missing =
      `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/unit-a/code-generation/code-summary.md`;
    expect(directive.consumes).not.toContain(missing);
    expect(directive.consumes_absent).toEqual([{ path: missing, expected: false }]);
  });

  test("fans out all 7 consumers and 19 graph edges through the orchestrator seam", () => {
    for (const [stage, edges] of Object.entries(consumerEdges)) {
      resetTelemetry();
      const project = projectWithOutcomes(undefined, stage as keyof typeof consumerEdges);
      const result = next(project);
      expect(result.status, `${stage}: ${result.stderr}`).toBe(0);
      const directive = JSON.parse(result.stdout);
      expect(directive.stage).toBe(stage);
      const prefix =
        `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/`;
      const perUnit = directive.consumes.filter((path: string) => path.startsWith(prefix));
      expect(perUnit, stage).toEqual(
        ["unit-z", "unit-a"].flatMap((unit) =>
          edges.map(([artifact, producer]) => `${prefix}${unit}/${producer}/${artifact}.md`)
        ),
      );
    }
  });

  test("keeps the cursor and stdout unchanged when a declared producer failed", () => {
    const project = projectWithOutcomes(
      undefined,
      "build-and-test",
      { "unit-a": "failed" },
    );
    const statePath = seededStateFile(project);
    const before = readFileSync(statePath, "utf8");

    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("producer-outcome-failed: unit-a");
    expect(readFileSync(statePath, "utf8")).toBe(before);
  });

  test("does not emit paths for a cancelled producer Unit even when files remain", () => {
    const project = projectWithOutcomes(
      undefined,
      "build-and-test",
      { "unit-z": "cancelled" },
    );
    const result = next(project);
    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.consumes).toEqual([
      "code-generation-plan",
      "code-summary",
    ].map((artifact) =>
      `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/unit-a/code-generation/${artifact}.md`
    ));
  });

  test("emits no partial directive and keeps the cursor when consumer inventory drifts", () => {
    const project = projectWithOutcomes();
    const graphPath = join(project, ".claude/tools/data/stage-graph.json");
    const graph = JSON.parse(readFileSync(graphPath, "utf8"));
    const build = graph.find((stage: { slug: string }) => stage.slug === "build-and-test");
    build.consumes = build.consumes.filter(
      (consume: { artifact: string }) => consume.artifact !== "code-summary",
    );
    writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
    const statePath = seededStateFile(project);
    const before = readFileSync(statePath, "utf8");

    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("consumer-edge-inventory-mismatch");
    expect(result.stderr).toContain('"expectedConsumers"');
    expect(result.stderr).toContain('"actualEdges"');
    expect(readFileSync(statePath, "utf8")).toBe(before);
  });

  test("emits no partial directive when concrete presence cannot be read", () => {
    const project = projectWithOutcomes({ unit: "unit-a", artifact: "code-summary" });
    const unreadable = join(
      seededRecordDir(project),
      "construction/unit-a/code-generation/code-summary.md",
    );
    symlinkSync("code-summary.md", unreadable);
    const statePath = seededStateFile(project);
    const before = readFileSync(statePath, "utf8");

    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("consume-presence-read-failed");
    expect(readFileSync(statePath, "utf8")).toBe(before);
  });
});
