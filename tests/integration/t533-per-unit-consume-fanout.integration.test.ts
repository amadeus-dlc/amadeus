// covers: subcommand:amadeus-orchestrate:next, audit:UNIT_OUTCOME_SETTLED
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
  parseAuditRecords,
  seededAuditShard,
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

// Seed a runtime population (two Units in batch 1) with every per-unit producer
// artifact on disk and NO Unit-pool coordinator behind it — the per-unit
// `run-stage` path of a units-generation EXECUTE scope (#3099). The pool-seeded
// fixture below builds on top of this.
function seedPerUnitProject(
  missing?: { unit: string; artifact: string },
  stage: keyof typeof consumerEdges | "code-generation" = "build-and-test",
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

// The pool-seeded fixture: the same population, settled through the C2
// single-writer Unit pool (the swarm path).
function projectWithOutcomes(
  missing?: { unit: string; artifact: string },
  stage: keyof typeof consumerEdges = "build-and-test",
  outcomeOverrides: Readonly<Record<string, "succeeded" | "failed" | "cancelled">> = {},
): string {
  const project = seedPerUnitProject(missing, stage);
  settleThroughPool(project, outcomeOverrides);
  return project;
}

function settleThroughPool(
  project: string,
  outcomeOverrides: Readonly<Record<string, "succeeded" | "failed" | "cancelled">> = {},
): void {
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
}

// Move the cursor onto a consumer stage the way the code-generation approval
// would, so the next `next` reads the per-unit consume population.
function moveCursorTo(
  project: string,
  stage: keyof typeof consumerEdges | "code-generation",
): void {
  const state = seededStateFile(project);
  sedReplaceInFile(state, /^- \*\*Current Stage\*\*:.*$/m, `- **Current Stage**: ${stage}`);
  sedReplaceInFile(
    state,
    new RegExp(`^- \\[.\\] ${stage} — .*$`, "m"),
    `- [-] ${stage} — EXECUTE`,
  );
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

// Seed the solo (per-unit) failure lifecycle the engine itself correlates: a
// BOLT_STARTED/BOLT_FAILED pair under a `solo:<batch>:<unit>` batch identity.
// The Unit pool is never touched — that is what makes this the per-unit path.
function seedSoloFailure(project: string, unit: string, stage = "code-generation"): string {
  const attempt = `attempt-${unit}`;
  emitAuditEventGuarded("BOLT_STARTED", {
    "Bolt names": unit,
    "Bolt slug": unit,
    "Batch number": "1",
    "Batch Id": `solo:1:${unit}`,
    "Attempt Id": attempt,
    Stage: stage,
    "Walking skeleton": "no",
  }, project);
  emitAuditEventGuarded("BOLT_FAILED", {
    "Failed Bolt": unit,
    "Bolt slug": unit,
    "Error summary": "seeded per-unit failure",
    "Batch number": "1",
    "Batch Id": `solo:1:${unit}`,
    "Attempt Id": attempt,
    Stage: stage,
    Reason: "failed",
  }, project);
  return attempt;
}

// Cancel a Unit the only way the per-unit path can: the engine's own failure
// ruling. The solo arm writes BOLT_COMPLETED(Outcome: cancelled) and no Unit
// pool event at all, so the canonical projection carries the terminal while the
// pool stream stays empty.
function cancelSoloUnitThroughRuling(project: string, unit: string): void {
  seedSoloFailure(project, unit);
  const ruled = spawnSync(process.execPath, [
    join(project, ".claude/tools/amadeus-orchestrate.ts"),
    "resolve-failure",
    "--user-input",
    "Skip",
    "--project-dir",
    project,
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
      AMADEUS_STAGE_GRAPH: join(project, ".claude/tools/data/stage-graph.json"),
    },
  });
  expect(ruled.status, ruled.stderr).toBe(0);
  expect(JSON.parse(ruled.stdout).kind, ruled.stdout).toBe("committed");
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

  // #3099 — the per-unit `run-stage` path never went through the Unit pool, so
  // a Construction that completed unit by unit left the outcome ledger empty and
  // every per-unit consumer refused with producer-outcome-pending. The engine
  // now settles each Unit's outcome at its coverage boundary, on the same
  // `next` path that iterates the units.
  test("settles per-unit Construction outcomes so a pool-free population fans out", () => {
    const project = seedPerUnitProject(undefined, "code-generation");

    const construction = next(project);
    expect(construction.status, construction.stderr).toBe(0);

    moveCursorTo(project, "build-and-test");
    const result = next(project);

    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.kind, JSON.stringify(directive)).toBe("run-stage");
    expect(directive.stage).toBe("build-and-test");
    expect(directive.consumes).toEqual(["unit-z", "unit-a"].flatMap((unit) =>
      ["code-generation-plan", "code-summary"].map((artifact) =>
        `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/${unit}/code-generation/${artifact}.md`
      )
    ));
  });

  // A Unit that travelled BOTH routes — settled by the engine's per-unit path
  // and again by the Unit pool — must still produce exactly one outcome row.
  // Two rows for one Unit is producer-outcome-ambiguous, and the pool's verdict
  // is the one that stands.
  test("keeps the pool's verdict when a Unit carries both a pool terminal and an engine outcome", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    const construction = next(project);
    expect(construction.status, construction.stderr).toBe(0);
    settleThroughPool(project, { "unit-z": "cancelled" });

    moveCursorTo(project, "build-and-test");
    const result = next(project);

    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.kind, JSON.stringify(directive)).toBe("run-stage");
    // unit-z was settled "succeeded" by the engine and "cancelled" by the pool:
    // the pool wins, so unit-z contributes no consume paths at all.
    expect(directive.consumes).toEqual([
      "code-generation-plan",
      "code-summary",
    ].map((artifact) =>
      `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/unit-a/code-generation/${artifact}.md`
    ));
  });

  test("ignores an engine-settled outcome from a batch outside the current runtime population", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    // Both declared Units, settled under a batch identity the current runtime
    // population does not carry — a previous run's rows. The current batch has
    // settled nothing, so the population is empty and the consumer waits.
    // Counted anyway, these rows would satisfy the consumer with an outcome the
    // current batch never produced.
    for (const unit of ["unit-z", "unit-a"]) {
      emitAuditEventGuarded("UNIT_OUTCOME_SETTLED", {
        Stage: "code-generation",
        Unit: unit,
        Batch: "99",
        Outcome: "succeeded",
        "Idempotency Key": `code-generation ${unit} 99`,
      }, project);
    }

    moveCursorTo(project, "build-and-test");
    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("producer-outcome-pending");
  });

  test("settles each Unit once across re-entry and across per-unit stages", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    expect(next(project).status).toBe(0);
    // Re-entry: the coverage boundary is observed again, the rows are already
    // there, and nothing is appended.
    expect(next(project).status).toBe(0);
    const settled = parseAuditRecords(readFileSync(seededAuditShard(project), "utf8"))
      .filter((record) => record.event === "UNIT_OUTCOME_SETTLED");
    expect(settled.map((record) => record.fields.Unit).sort()).toEqual(["unit-a", "unit-z"]);
    expect(settled.map((record) => record.fields["Idempotency Key"]).sort()).toEqual([
      "code-generation unit-a 1",
      "code-generation unit-z 1",
    ]);

    // A second per-unit Construction stage settles the same Unit under its own
    // key. The population carries a Unit's outcome, not a Unit-and-stage's, so
    // the extra row must not become a second outcome for unit-z.
    emitAuditEventGuarded("UNIT_OUTCOME_SETTLED", {
      Stage: "functional-design",
      Unit: "unit-z",
      Batch: "1",
      Outcome: "succeeded",
      "Idempotency Key": "functional-design unit-z 1",
    }, project);

    const outcomes = [...(readPerUnitConsumePopulation(project)?.outcomes ?? [])]
      .sort((a, b) => a.unit.localeCompare(b.unit));
    expect(outcomes).toEqual([
      { unit: "unit-a", outcome: "succeeded" },
      { unit: "unit-z", outcome: "succeeded" },
    ]);
  });

  // The recovery path for an intent whose Construction ran unit by unit under an
  // engine that recorded no outcome: its cursor already sits on the consumer
  // stage, so nothing settles until the per-unit stage is re-entered. Documented
  // in docs/guide/15-troubleshooting.md.
  test("recovers a cursor parked on producer-outcome-pending by re-entering the per-unit stage", () => {
    const project = seedPerUnitProject(undefined, "build-and-test");

    const parked = next(project);
    expect(parked.status).toBe(1);
    expect(parked.stderr).toContain("producer-outcome-pending");

    // A single-stage run is isolated by contract: it emits one directive for the
    // stage and never enters the engine's per-unit loop, so it settles nothing.
    const single = spawnSync(process.execPath, [
      join(project, ".claude/tools/amadeus-orchestrate.ts"),
      "next",
      "--stage",
      "code-generation",
      "--single",
      "--project-dir",
      project,
    ], {
      encoding: "utf8",
      env: {
        ...process.env,
        AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
        AMADEUS_STAGE_GRAPH: join(project, ".claude/tools/data/stage-graph.json"),
      },
    });
    expect(single.status, single.stderr).toBe(0);
    expect(
      parseAuditRecords(readFileSync(seededAuditShard(project), "utf8"))
        .filter((record) => record.event === "UNIT_OUTCOME_SETTLED"),
    ).toEqual([]);

    // Pivoting the cursor back onto the per-unit stage is what `amadeus-jump.ts
    // execute` does to state; from there the engine's own `next` observes the
    // coverage already on disk and settles each Unit forward.
    moveCursorTo(project, "code-generation");
    expect(next(project).status).toBe(0);

    moveCursorTo(project, "build-and-test");
    const recovered = next(project);
    expect(recovered.status, recovered.stderr).toBe(0);
    expect(JSON.parse(recovered.stdout).consumes).toEqual(["unit-z", "unit-a"].flatMap((unit) =>
      ["code-generation-plan", "code-summary"].map((artifact) =>
        `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/${unit}/code-generation/${artifact}.md`
      )
    ));
  });

  test("refuses a settled-outcome row whose join keys were stripped", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    expect(next(project).status).toBe(0);
    // A row that lost its Batch cannot be joined to a runtime population, and a
    // reader that skipped it would quietly count one Unit fewer than the ledger
    // claims. The engine writes every key (emitEvent refuses a missing required
    // attribute), so a row without one has been tampered with: fail loudly.
    const shard = seededAuditShard(project);
    writeFileSync(shard, readFileSync(shard, "utf8")
      .split("\n")
      .map((line) => {
        if (!line.includes("UNIT_OUTCOME_SETTLED")) return line;
        const record = JSON.parse(line);
        delete record.attributes.Batch;
        delete record.fields?.Batch;
        return JSON.stringify(record);
      })
      .join("\n"));
    moveCursorTo(project, "build-and-test");
    const statePath = seededStateFile(project);
    const before = readFileSync(statePath, "utf8");

    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("invalid-unit-outcome-audit-row");
    expect(readFileSync(statePath, "utf8")).toBe(before);
  });

  test("refuses a settled-outcome row whose Stage was stripped", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    expect(next(project).status).toBe(0);
    // Stage is not a join key — outcomes collapse across the per-unit stages a
    // Unit clears — but the emitter writes it on every row, so a row without it
    // is not a row the engine produced. Accepting one because Unit and Batch
    // still match would let an edited ledger past the shape contract.
    const shard = seededAuditShard(project);
    writeFileSync(shard, readFileSync(shard, "utf8")
      .split("\n")
      .map((line) => {
        if (!line.includes("UNIT_OUTCOME_SETTLED")) return line;
        const record = JSON.parse(line);
        delete record.attributes?.Stage;
        delete record.fields?.Stage;
        return JSON.stringify(record);
      })
      .join("\n"));
    moveCursorTo(project, "build-and-test");
    const statePath = seededStateFile(project);
    const before = readFileSync(statePath, "utf8");

    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("invalid-unit-outcome-audit-row");
    expect(readFileSync(statePath, "utf8")).toBe(before);
  });

  // #3106 — the vocabulary is a closed set of exactly three, so a `failed` row
  // is a row the reader UNDERSTANDS even though no emitter arm writes one. What
  // it can do is bounded: an outcome outside `succeeded` only ever stops a
  // consumer, so an edited ledger still cannot decide that one runs.
  test("reads the third settled outcome as the failure the fan-out already knows", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    expect(next(project).status).toBe(0);
    const shard = seededAuditShard(project);
    writeFileSync(shard, readFileSync(shard, "utf8")
      .split("\n")
      .map((line) => {
        if (!line.includes("UNIT_OUTCOME_SETTLED") || !line.includes("unit-z")) return line;
        const record = JSON.parse(line);
        if (record.attributes !== undefined) record.attributes.Outcome = "failed";
        if (record.fields !== undefined) record.fields.Outcome = "failed";
        return JSON.stringify(record);
      })
      .join("\n"));
    moveCursorTo(project, "build-and-test");

    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("producer-outcome-failed: unit-z");
  });

  test("refuses a settled-outcome row carrying an outcome the engine never writes", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    expect(next(project).status).toBe(0);
    // The engine settles one outcome and one only. A row claiming anything else
    // did not come from the emitter, and reading it as a verdict would let an
    // edited ledger decide whether a consumer runs.
    const shard = seededAuditShard(project);
    writeFileSync(shard, readFileSync(shard, "utf8")
      .split("\n")
      .map((line) => {
        if (!line.includes("UNIT_OUTCOME_SETTLED")) return line;
        const record = JSON.parse(line);
        if (record.attributes !== undefined) record.attributes.Outcome = "bogus";
        if (record.fields !== undefined) record.fields.Outcome = "bogus";
        return JSON.stringify(record);
      })
      .join("\n"));
    moveCursorTo(project, "build-and-test");
    const statePath = seededStateFile(project);
    const before = readFileSync(statePath, "utf8");

    const result = next(project);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("invalid-unit-outcome-audit-row");
    expect(readFileSync(statePath, "utf8")).toBe(before);
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

  // #3106 — the per-unit twin of the pool case right above. A Unit cancelled on
  // the engine's own dispatch path carries a canonical terminal and no pool
  // event, so before the settle emitter learned the `cancelled` vocabulary the
  // consumer stopped with producer-outcome-pending instead of simply dropping
  // that Unit's paths.
  test("does not emit paths for a Unit cancelled on the per-unit path, and keeps the consumer running", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    cancelSoloUnitThroughRuling(project, "unit-z");

    const construction = next(project);
    expect(construction.status, construction.stderr).toBe(0);

    moveCursorTo(project, "build-and-test");
    const result = next(project);

    expect(result.status, result.stderr).toBe(0);
    const directive = JSON.parse(result.stdout);
    expect(directive.kind, JSON.stringify(directive)).toBe("run-stage");
    expect(directive.consumes).toEqual([
      "code-generation-plan",
      "code-summary",
    ].map((artifact) =>
      `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/unit-a/code-generation/${artifact}.md`
    ));
  });

  // #3106 supersession — the ledger has to follow the Unit, not freeze at its
  // first verdict. A cancelled Unit put back in flight (`amadeus-bolt start`
  // clears its terminal) and carried to coverage must end up succeeded for the
  // consumer, with the cancelled row still on the ledger as the observation it
  // superseded — and with exactly ONE outcome in the population.
  test("supersedes a cancelled Unit's row when a restart carries it back to coverage", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    cancelSoloUnitThroughRuling(project, "unit-z");
    expect(next(project).status).toBe(0);

    const settledKeys = () =>
      parseAuditRecords(readFileSync(seededAuditShard(project), "utf8"))
        .filter((record) => record.event === "UNIT_OUTCOME_SETTLED")
        .map((record) => [record.fields["Idempotency Key"], record.fields.Outcome]);
    expect(settledKeys()).toEqual([
      ["code-generation unit-a 1", "succeeded"],
      ["code-generation unit-z 1", "cancelled"],
    ]);

    // Re-entry: a fresh solo attempt deletes the cancelled terminal, so the
    // engine observes a Unit in flight again rather than a cancelled one.
    const restarted = spawnSync(process.execPath, [
      join(project, ".claude/tools/amadeus-bolt.ts"),
      "start", "--name", "unit-z", "--batch", "1", "--project-dir", project,
    ], { encoding: "utf8", env: { ...process.env, AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" } });
    expect(restarted.status, restarted.stderr).toBe(0);

    expect(next(project).status).toBe(0);
    expect(settledKeys()).toEqual([
      ["code-generation unit-a 1", "succeeded"],
      ["code-generation unit-z 1", "cancelled"],
      ["code-generation unit-z 1 #2", "succeeded"],
    ]);
    // A settled observation that has not changed appends nothing, revision or no
    // revision.
    expect(next(project).status).toBe(0);
    expect(settledKeys().length).toBe(3);

    // One row per Unit in the population — three ledger rows collapse to two
    // outcomes, and unit-z's is the one that superseded.
    expect([...(readPerUnitConsumePopulation(project)?.outcomes ?? [])]
      .sort((a, b) => a.unit.localeCompare(b.unit))).toEqual([
        { unit: "unit-a", outcome: "succeeded" },
        { unit: "unit-z", outcome: "succeeded" },
      ]);

    moveCursorTo(project, "build-and-test");
    const result = next(project);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).consumes).toEqual(["unit-z", "unit-a"].flatMap((unit) =>
      ["code-generation-plan", "code-summary"].map((artifact) =>
        `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/construction/${unit}/code-generation/${artifact}.md`
      )
    ));
  });

  // #3106 — the ground for the settle emitter having no `failed` arm: this path
  // cannot reach one. A solo BOLT_FAILED is recorded together with its batch
  // closure, so it is always an UNRESOLVED failure, and the producing stage
  // answers with the ruling prompt before the per-unit loop settles anything.
  // The only ways out of that prompt are retry, cancel, or park.
  test("stops at the failure ruling instead of settling a failed Unit on the per-unit path", () => {
    const project = seedPerUnitProject(undefined, "code-generation");
    seedSoloFailure(project, "unit-z");

    const producer = next(project);

    expect(producer.status, producer.stderr).toBe(0);
    const directive = JSON.parse(producer.stdout);
    expect(directive.kind, producer.stdout).toBe("ask");
    expect(directive.question).toContain('Unit "unit-z" failed during code-generation');
    expect(
      parseAuditRecords(readFileSync(seededAuditShard(project), "utf8"))
        .filter((record) => record.event === "UNIT_OUTCOME_SETTLED"),
    ).toEqual([]);
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
