// covers: subcommand:amadeus-orchestrate:next
// size: large

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  consumePresentOnDisk,
  loadRuntimeUnitBatches,
  readPerUnitConsumePopulation,
  resolveConsumes,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  __resetGraphCache,
  loadGraph,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  createAuditUnitPoolRepository,
  createUnitPoolCoordinator,
} from "../../packages/framework/core/tools/amadeus-unit-pool-runtime.ts";
import {
  extractPerUnitConsumerEdges,
  PerUnitConsumeFanoutError,
} from "../../packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts";
import { emitAuditEventGuarded } from "../../packages/framework/core/otel/audit-emit.ts";
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
  outcomeOverrides: Readonly<Record<string, "succeeded" | "failed" | "cancelled">> = {},
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
      batches: [["unit-a", "unit-z"]],
    },
  })}\n`);
  // readBoltDagBatches refuses the runtime-graph cache when the canonical
  // units-generation edge block is absent (recoverBoltDag returns "none"), so
  // the fixture must carry the source doc for the DAG to resolve at all.
  const unitsGeneration = join(record, "inception", "units-generation");
  mkdirSync(unitsGeneration, { recursive: true });
  writeFileSync(join(unitsGeneration, "unit-of-work-dependency.md"), [
    "# Unit of Work Dependency",
    "",
    "```yaml",
    "units:",
    "  - name: unit-z",
    "    depends_on: []",
    "  - name: unit-a",
    "    depends_on: []",
    "```",
    "",
  ].join("\n"));
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
    expect(pool.settleRelease({
      idempotencyKey: `settle-${attempt.unitId}`,
      batchId: "1",
      attemptId: attempt.attemptId,
      outcome,
    }).ok).toBe(true);
  }
  const artifacts = new Map(
    Object.values(consumerEdges).flat().map(([artifact, producer]) => [artifact, producer]),
  );
  for (const unit of ["unit-z", "unit-a"]) {
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
    env: {
      ...process.env,
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
      AMADEUS_STAGE_GRAPH: join(project, ".claude/tools/data/stage-graph.json"),
    },
  });
}

describe("t533 orchestrator per-unit consume fan-out", () => {
  test("reads the current runtime population in-process and rejects malformed batches", () => {
    const project = projectWithOutcomes();
    const runtimeGraph = join(seededRecordDir(project), "runtime-graph.json");

    const population = readPerUnitConsumePopulation(project);
    expect(population?.declaredUnits).toEqual(["unit-z", "unit-a"]);
    expect([...(population?.outcomes ?? [])].sort((a, b) => a.unit.localeCompare(b.unit)))
      .toEqual([
        { unit: "unit-a", outcome: "succeeded" },
        { unit: "unit-z", outcome: "succeeded" },
      ]);

    writeFileSync(runtimeGraph, JSON.stringify({
      bolt_dag: {
        units: [{ name: "unit-z" }],
        batches: [["unit-z", ""]],
      },
    }));
    expect(loadRuntimeUnitBatches(project)).toBeNull();

    writeFileSync(runtimeGraph, "{");
    expect(loadRuntimeUnitBatches(project)).toBeNull();
  });

  test("expands required per-unit consumes in-process at the first candidate", () => {
    const previousGraph = process.env.AMADEUS_STAGE_GRAPH;
    process.env.AMADEUS_STAGE_GRAPH = join(
      import.meta.dir,
      "../../dist/claude/.claude/tools/data/stage-graph.json",
    );
    __resetGraphCache();
    try {
      const node = loadGraph().find((stage) => stage.slug === "build-and-test");
      if (node === undefined) throw new Error("build-and-test fixture missing");

      const resolved = resolveConsumes(
        node.consumes,
        node,
        "brownfield",
        "{unit-name}",
        "amadeus/spaces/default/intents/test-record",
        undefined,
        undefined,
        {
          declaredUnits: ["unit-z", "unit-a"],
          outcomes: [
            { unit: "unit-z", outcome: "succeeded" },
            { unit: "unit-a", outcome: "succeeded" },
          ],
        },
      );

      expect(
        resolved.filter((consume) => consume.perUnitSucceeded).map((consume) => consume.path),
      ).toEqual(["unit-z", "unit-a"].flatMap((unit) =>
        ["code-generation-plan", "code-summary"].map((artifact) =>
          `amadeus/spaces/default/intents/test-record/construction/${unit}/code-generation/${artifact}.md`
        )
      ));
    } finally {
      if (previousGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
      else process.env.AMADEUS_STAGE_GRAPH = previousGraph;
      __resetGraphCache();
    }
  });

  test("checks succeeded consume presence in-process and fails closed on stat errors", () => {
    const project = projectWithOutcomes();
    const existing = join(
      seededRecordDir(project),
      "construction/unit-a/code-generation/code-summary.md",
    );
    const consume = {
      artifact: "code-summary",
      required: true,
      path: "construction/unit-a/code-generation/code-summary.md",
      perUnitSucceeded: true as const,
    };

    expect(consumePresentOnDisk(consume, existing)).toBe(true);
    expect(consumePresentOnDisk(consume, join(project, "missing.md"))).toBe(false);

    const loop = join(project, "stat-loop");
    symlinkSync("stat-loop", loop);
    expect(() => consumePresentOnDisk(consume, loop)).toThrow(
      new PerUnitConsumeFanoutError("consume-presence-read-failed", [consume.path]),
    );
  });

  test("compiled graph retains the pinned 7-consumer 19-edge inventory", () => {
    const graph = JSON.parse(readFileSync(
      join(import.meta.dir, "../../dist/claude/.claude/tools/data/stage-graph.json"),
      "utf8",
    ));
    const expected = Object.entries(consumerEdges).flatMap(([consumer, edges]) =>
      edges.map(([artifact, producer]) => `${consumer}:${artifact}:${producer}`)
    ).sort();

    expect(extractPerUnitConsumerEdges(graph).map((edge) => edge.join(":")).sort())
      .toEqual(expected);
  });

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

  test("ignores terminal outcomes from a batch outside the current runtime population", () => {
    const project = projectWithOutcomes();
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(project));
    expect(pool.initialEnqueue({
      idempotencyKey: "historical-init",
      batchId: "99",
      cap: 1,
      units: [{ unitId: "unit-z", dependsOn: [] }],
    }).ok).toBe(true);
    const acquired = pool.acquire({ idempotencyKey: "historical-acquire", batchId: "99" });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) throw new Error(acquired.reason);
    const attempt = acquired.projection.active[0];
    expect(pool.confirmDispatch({
      idempotencyKey: "historical-confirm",
      batchId: "99",
      attemptId: attempt.attemptId,
      nativeHandle: "historical-native",
    }).ok).toBe(true);
    expect(pool.settleRelease({
      idempotencyKey: "historical-settle",
      batchId: "99",
      attemptId: attempt.attemptId,
      outcome: "failed",
    }).ok).toBe(true);

    const result = next(project);

    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.consumes).toEqual(["unit-z", "unit-a"].flatMap((unit) =>
      ["code-generation-plan", "code-summary"].map((artifact) =>
        `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/${unit}/code-generation/${artifact}.md`
      )
    ));
  });

  test("ignores a closed terminal failure from a batch outside the current runtime population", () => {
    const project = projectWithOutcomes();
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(project));
    expect(pool.initialEnqueue({
      idempotencyKey: "historical-init",
      batchId: "99",
      cap: 1,
      units: [{ unitId: "unit-z", dependsOn: [] }],
    }).ok).toBe(true);
    const acquired = pool.acquire({ idempotencyKey: "historical-acquire", batchId: "99" });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) throw new Error(acquired.reason);
    const attempt = acquired.projection.active[0];
    expect(pool.confirmDispatch({
      idempotencyKey: "historical-confirm",
      batchId: "99",
      attemptId: attempt.attemptId,
      nativeHandle: "historical-native",
    }).ok).toBe(true);
    expect(pool.settleRelease({
      idempotencyKey: "historical-settle",
      batchId: "99",
      attemptId: attempt.attemptId,
      outcome: "failed",
    }).ok).toBe(true);
    // The closed join (SWARM_BATON_RETURNED) lands the failure in
    // unresolvedFailures; the runtime-population scope must keep the
    // await-unit-ruling prompt from stopping next for a foreign batch.
    emitAuditEventGuarded("SWARM_BATON_RETURNED", {
      "Batch number": "99",
      "Unit name": "unit-z",
      Reason: "historical",
      Stage: "build-and-test",
      "Attempt Id": attempt.attemptId,
    }, project);

    const result = next(project);

    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.kind, JSON.stringify(directive)).toBe("run-stage");
    expect(directive.consumes).toEqual(["unit-z", "unit-a"].flatMap((unit) =>
      ["code-generation-plan", "code-summary"].map((artifact) =>
        `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/${unit}/code-generation/${artifact}.md`
      )
    ));
  });

  test("keeps the ruling prompt fail-closed for a malformed numeric batch identity", () => {
    const project = projectWithOutcomes();
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(project));
    expect(pool.initialEnqueue({
      idempotencyKey: "malformed-init",
      batchId: "99x",
      cap: 1,
      units: [{ unitId: "unit-z", dependsOn: [] }],
    }).ok).toBe(true);
    const acquired = pool.acquire({ idempotencyKey: "malformed-acquire", batchId: "99x" });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) throw new Error(acquired.reason);
    const attempt = acquired.projection.active[0];
    expect(pool.confirmDispatch({
      idempotencyKey: "malformed-confirm",
      batchId: "99x",
      attemptId: attempt.attemptId,
      nativeHandle: "malformed-native",
    }).ok).toBe(true);
    expect(pool.settleRelease({
      idempotencyKey: "malformed-settle",
      batchId: "99x",
      attemptId: attempt.attemptId,
      outcome: "failed",
    }).ok).toBe(true);
    // "99x" partial-parses to 99 via Number.parseInt, but a malformed numeric
    // identity cannot be proven historical: the ruling prompt must stay
    // fail-closed instead of silently treating the failure as out of scope.
    emitAuditEventGuarded("SWARM_BATON_RETURNED", {
      "Batch number": "99x",
      "Unit name": "unit-z",
      Reason: "malformed",
      Stage: "build-and-test",
      "Attempt Id": attempt.attemptId,
    }, project);

    const result = next(project);

    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.kind, JSON.stringify(directive)).toBe("ask");
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
