// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts
//
// The approve-side half of the plan-integrity guard (FR-2 / AC-2a, AC-2b, AC-2c).
// The judge itself is pure and pinned in tests/unit/t402-approve-reconciliation.test.ts;
// what this file pins is the wiring: which approves reach the reconciliation at
// all, what the audit reader makes of a real shard, and that a refusal commits
// nothing.
//
// MECHANISM = in-process (NOT spawn). handleReport is exported and emit() only
// console.log's a directive, so the guard's collection and wiring lines land in
// LCOV — the documented spawn blindspot would leave every new line here
// uncovered. Real filesystem, hence the integration layer
// (cid:code-generation:fs-tests-integration-first).

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seededAuditShard,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { handleReport } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  GUARD_EXIT_MARKER,
  GUARD_OBSERVED_MARKER,
  GUARD_WEIGHT_MARKER,
  PLAN_CORRECTION_EXIT,
  PLAN_DRIFT_WEIGHT,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
resetAidlcEnv();

const CG_PRODUCES = ["code-generation-plan", "code-summary"];
// nfr-design is the control: same for_each (unit-of-work), inline mode instead of
// subagent. Its produces are the stage graph's, verbatim — an incomplete list
// would trip the older coverage guard and prove nothing about this one.
const NFR_DESIGN_PRODUCES = [
  "performance-design",
  "security-design",
  "scalability-design",
  "reliability-design",
  "logical-components",
];

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

interface Directive {
  kind?: string;
  message?: unknown;
  [k: string]: unknown;
}

/** Construction-phase state parked at code-generation with autonomy granted. */
function codegenState(autonomy: string): string {
  const grant =
    autonomy === "" ? "" : `- **Construction Autonomy Mode**: ${autonomy}\n`;
  return `# AI-DLC State Tracking

## Project Information
- **Project**: approve reconciliation test
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on
${grant}
## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Standard

## Stage Progress

### CONSTRUCTION PHASE
- [x] functional-design — EXECUTE
- [x] nfr-requirements — EXECUTE
- [x] nfr-design — EXECUTE
- [x] infrastructure-design — EXECUTE
- [-] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: code-generation
- **Status**: Running
- **Last Updated**: 2026-08-01T00:00:00Z
- **Completed**: 4
- **Last Completed Stage**: infrastructure-design
`;
}

/** Write the compiled DAG plus its canonical artefact for `batches`. */
function seedDag(proj: string, batches: string[][]): void {
  const dependencyDir = join(seededRecordDir(proj), "inception", "units-generation");
  mkdirSync(dependencyDir, { recursive: true });
  const units = batches.flatMap((batch, index) =>
    batch.map((name) => ({ name, depends_on: index === 0 ? [] : batches[index - 1] })),
  );
  writeFileSync(
    join(dependencyDir, "unit-of-work-dependency.md"),
    `# Unit dependencies\n\n\`\`\`yaml\nunits:\n${units
      .map((unit) => `  - name: ${unit.name}\n    depends_on: [${unit.depends_on.join(", ")}]`)
      .join("\n")}\n\`\`\`\n`,
  );
  writeFileSync(
    join(seededRecordDir(proj), "runtime-graph.json"),
    JSON.stringify(
      { bolt_dag: { units: batches.flat().map((name) => ({ name, depends_on: [] })), batches } },
      null,
      2,
    ),
  );
}

/** Mark `unit` covered for code-generation by writing its produces on disk. */
function coverUnit(proj: string, unit: string): void {
  const dir = join(seededRecordDir(proj), "construction", unit, "code-generation");
  mkdirSync(dir, { recursive: true });
  for (const name of CG_PRODUCES) writeFileSync(join(dir, `${name}.md`), `# ${name}\n`);
}

/**
 * Append v1 SWARM rows to the fixture's deterministic per-clone shard — the
 * same file a spawned tool would resolve, so the reader under test sees the
 * shard through its normal glob rather than a bespoke path.
 */
function seedSwarmRows(
  proj: string,
  rows: { event: string; batch: string; units?: string[]; unit?: string }[],
): void {
  const shard = seededAuditShard(proj);
  mkdirSync(join(seededRecordDir(proj), "audit"), { recursive: true });
  const lines = rows.map((row, index) =>
    JSON.stringify({
      schemaVersion: 1,
      seq: index + 1,
      cloneId: "fixturecloneid01",
      intentId: "fixture-0f14ce29",
      timestamp: `2026-08-01T10:0${index}:00Z`,
      heading: "Swarm",
      event: row.event,
      fields: {
        "Batch number": row.batch,
        ...(row.units === undefined ? {} : { "Unit names": row.units.join(",") }),
        ...(row.unit === undefined ? {} : { "Unit name": row.unit }),
      },
    }),
  );
  writeFileSync(shard, `${lines.join("\n")}\n`);
}

/**
 * The row set a real `prepare`/`finalize` pair leaves for one fanned-out batch:
 * unit names on the start row, one convergence row per unit, then the batch
 * completion (amadeus-swarm.ts emitSwarmStarted / emitUnitConverged /
 * emitSwarmCompleted).
 */
function swarmRunRows(batch: string, units: string[]): { event: string; batch: string; units?: string[]; unit?: string }[] {
  return [
    { event: "SWARM_STARTED", batch, units },
    ...units.map((unit) => ({ event: "SWARM_UNIT_CONVERGED", batch, unit })),
    { event: "SWARM_COMPLETED", batch },
  ];
}

/** Seed a fully covered code-generation run over `batches`. */
function seedCoveredRun(batches: string[][], autonomy = "autonomous"): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), codegenState(autonomy));
  seedDag(proj, batches);
  for (const unit of batches.flat()) coverUnit(proj, unit);
  return proj;
}

/** Drive `report` in-process and return the emitted directive. */
function runReport(proj: string, args: string[]): Directive {
  let raw = "";
  const log = spyOn(console, "log").mockImplementation((value) => {
    raw = String(value);
  });
  try {
    handleReport(args, proj);
  } finally {
    log.mockRestore();
  }
  return JSON.parse(raw) as Directive;
}

const APPROVE = ["--stage", "code-generation", "--result", "approved"];

describe("t402 approve-time reconciliation (FR-2)", () => {
  test("a: a parallel batch with no SWARM evidence is refused (AC-2a)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    const directive = runReport(proj, APPROVE);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("batch 1");
  });

  test("b: a fanned-out, converged, completed batch lets the approve through (AC-2b)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, swarmRunRows("1", ["alpha", "beta"]));
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  // A degraded driver still fanned the batch out. SWARM_DEGRADED carries no unit
  // names, and it does not have to: `prepare` emits it IN ADDITION to the
  // batch-start row, never instead of it (amadeus-swarm.ts —
  // emitDegradeIfRequested is immediately followed by emitSwarmStarted), so the
  // unit names still arrive and a unit-keyed reconciliation passes.
  test("c: a degraded batch still reconciles on its start row's units (AC-2b)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, [
      { event: "SWARM_DEGRADED", batch: "1" },
      ...swarmRunRows("1", ["alpha", "beta"]),
    ]);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  // #2354. The measured shape: the batch fanned out under one number and, after a
  // re-dispatch advanced the conductor's counter, finalised under the next. The
  // units are the same units; only the bookkeeping moved.
  test("c2: evidence recorded under shifted batch numbers still passes (#2354)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, [
      { event: "SWARM_STARTED", batch: "1", units: ["alpha", "beta"] },
      { event: "SWARM_UNIT_CONVERGED", batch: "2", unit: "alpha" },
      { event: "SWARM_UNIT_CONVERGED", batch: "2", unit: "beta" },
      { event: "SWARM_COMPLETED", batch: "2" },
    ]);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  // The drift #1892 counted, in the shape it actually leaves: each unit dispatched
  // as its own one-unit fan-out. Every row is well-formed and every unit
  // converged — what is missing is any row naming the declared batch's units
  // together, which is the only evidence of the parallelism the plan declared.
  test("c3: one unit per fan-out row is still refused (#1892)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, [
      ...swarmRunRows("1", ["alpha"]),
      ...swarmRunRows("2", ["beta"]),
    ]);
    const directive = runReport(proj, APPROVE);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("batch 1 (2 units: alpha, beta)");
  });

  test("d: an all-serial plan is never reconciled (AC-2c)", () => {
    const proj = seedCoveredRun([["alpha"], ["beta"]]);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  // A degrade scope (fix/chore) skips units-generation, so no DAG is compiled and
  // there is no declared width to have broken.
  test("e: no compiled DAG means no reconciliation (AC-3b)", () => {
    const proj = createTestProject();
    tempDirs.push(proj);
    writeFileSync(seededStateFile(proj), codegenState("autonomous"));
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  test("f: an inline per-unit design stage is not reconciled", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    const state = readFileSync(seededStateFile(proj), "utf-8")
      .replace("- [x] nfr-design — EXECUTE", "- [-] nfr-design — EXECUTE")
      .replace("- [-] code-generation — EXECUTE", "- [ ] code-generation — EXECUTE")
      .replace("**Current Stage**: code-generation", "**Current Stage**: nfr-design");
    writeFileSync(seededStateFile(proj), state);
    for (const unit of ["alpha", "beta"]) {
      const dir = join(seededRecordDir(proj), "construction", unit, "nfr-design");
      mkdirSync(dir, { recursive: true });
      for (const name of NFR_DESIGN_PRODUCES) {
        writeFileSync(join(dir, `${name}.md`), `# ${name}\n`);
      }
    }
    const directive = runReport(proj, ["--stage", "nfr-design", "--result", "approved"]);
    expect(directive.kind).not.toBe("error");
  });

  // An already-[x] stage is a recovery replay. Refusing it would turn a harmless
  // re-report into an error the conductor cannot clear.
  test("g: a re-report of a completed stage is not reconciled", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    const state = readFileSync(seededStateFile(proj), "utf-8").replace(
      "- [-] code-generation — EXECUTE",
      "- [x] code-generation — EXECUTE",
    );
    writeFileSync(seededStateFile(proj), state);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  test("h: a refusal commits nothing — the state file is byte-identical after", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    const before = readFileSync(seededStateFile(proj), "utf-8");
    expect(runReport(proj, APPROVE).kind).toBe("error");
    expect(readFileSync(seededStateFile(proj), "utf-8")).toBe(before);
  });

  // AC-4a, approve side: the refusal carries all three parts, and its observed
  // part carries the numbers — batch, width, unit names — not just a verdict.
  test("i: the refusal is a three-part guard message with the observed numbers", () => {
    const proj = seedCoveredRun([["alpha", "beta"], ["gamma"], ["delta", "epsilon"]]);
    const message = String(runReport(proj, APPROVE).message);
    expect(message).toContain(GUARD_OBSERVED_MARKER);
    expect(message).toContain(GUARD_WEIGHT_MARKER);
    expect(message).toContain(GUARD_EXIT_MARKER);
    expect(message).toContain(PLAN_DRIFT_WEIGHT);
    expect(message).toContain(PLAN_CORRECTION_EXIT);
    expect(message).toContain("batch 1 (2 units: alpha, beta)");
    expect(message).toContain("batch 3 (2 units: delta, epsilon)");
    // The width-1 batch is serial by plan and must not be named as owed.
    expect(message).not.toContain("batch 2 (");
  });

  // A convergence row whose batch number cannot be read cannot be tied to a
  // completion row, so the units it names never count as settled — the fan-out
  // row alone is an intent to fan out, not proof the referee finished.
  test("j: a non-numeric Batch number is not evidence (BR-U3-5)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, [
      { event: "SWARM_STARTED", batch: "one", units: ["alpha", "beta"] },
      { event: "SWARM_UNIT_CONVERGED", batch: "one", unit: "alpha" },
      { event: "SWARM_UNIT_CONVERGED", batch: "one", unit: "beta" },
      { event: "SWARM_COMPLETED", batch: "" },
    ]);
    expect(runReport(proj, APPROVE).kind).toBe("error");
  });

  // Two audit generations live in the same shard. Splitting or parsing the JSONL
  // by hand would drop the v2 rows silently, so the reader goes through the
  // shared accessor that reads both.
  test("k: v2-schema SWARM rows are read alongside v1 rows", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    const shard = seededAuditShard(proj);
    mkdirSync(join(seededRecordDir(proj), "audit"), { recursive: true });
    const v1 = JSON.stringify({
      schemaVersion: 1,
      seq: 1,
      cloneId: "fixturecloneid01",
      intentId: "fixture-0f14ce29",
      timestamp: "2026-08-01T10:00:00Z",
      heading: "Swarm",
      event: "SWARM_STARTED",
      fields: { "Batch number": "1", "Unit names": "alpha,beta" },
    });
    const v2Row = (seq: number, name: string, attributes: Record<string, string>) =>
      JSON.stringify({
        schemaVersion: 2,
        eventId: `00000000-0000-4000-8000-00000000000${seq}`,
        seq,
        timestamp: `2026-08-01T10:0${seq}:00Z`,
        eventName: name,
        attributes,
        intentId: "fixture-0f14ce29",
        space: "default",
        cloneId: "fixturecloneid01",
        traceId: null,
        spanId: null,
        traceFlags: 0,
        idempotencyKey: `00000000-0000-4000-8000-10000000000${seq}`,
        canonical: true,
      });
    const v2 = [
      v2Row(2, "amadeus.swarm.unit.converged", {
        Event: "SWARM_UNIT_CONVERGED",
        "Batch number": "1",
        "Unit name": "alpha",
      }),
      v2Row(3, "amadeus.swarm.unit.converged", {
        Event: "SWARM_UNIT_CONVERGED",
        "Batch number": "1",
        "Unit name": "beta",
      }),
      v2Row(4, "amadeus.swarm.completed", { Event: "SWARM_COMPLETED", "Batch number": "1" }),
    ];
    writeFileSync(shard, `${[v1, ...v2].join("\n")}\n`);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  test("l: evidence for one batch does not vouch for another (BR-U3-4)", () => {
    const proj = seedCoveredRun([["alpha", "beta"], ["gamma", "delta"]]);
    seedSwarmRows(proj, swarmRunRows("2", ["gamma", "delta"]));
    const directive = runReport(proj, APPROVE);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("batch 1 (2 units: alpha, beta)");
    expect(String(directive.message)).not.toContain("batch 2 (");
  });
});
