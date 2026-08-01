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
  rows: { event: string; batch: string }[],
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
      fields: { "Batch number": row.batch },
    }),
  );
  writeFileSync(shard, `${lines.join("\n")}\n`);
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

  test("b: SWARM_STARTED + SWARM_COMPLETED lets the approve through (AC-2b)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, [
      { event: "SWARM_STARTED", batch: "1" },
      { event: "SWARM_COMPLETED", batch: "1" },
    ]);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  // A degraded driver still fanned the batch out — SWARM_DEGRADED carries no
  // unit names at all, so a reconciliation that matched on units instead of
  // batch numbers would refuse every degraded run.
  test("c: SWARM_DEGRADED counts as having started (AC-2b)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, [
      { event: "SWARM_DEGRADED", batch: "1" },
      { event: "SWARM_COMPLETED", batch: "1" },
    ]);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
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

  test("j: a non-numeric Batch number is not evidence (BR-U3-5)", () => {
    const proj = seedCoveredRun([["alpha", "beta"]]);
    seedSwarmRows(proj, [
      { event: "SWARM_STARTED", batch: "one" },
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
      fields: { "Batch number": "1" },
    });
    const v2 = JSON.stringify({
      schemaVersion: 2,
      eventId: "00000000-0000-4000-8000-000000000001",
      seq: 2,
      timestamp: "2026-08-01T10:01:00Z",
      eventName: "amadeus.swarm.completed",
      attributes: { Event: "SWARM_COMPLETED", "Batch number": "1" },
      intentId: "fixture-0f14ce29",
      space: "default",
      cloneId: "fixturecloneid01",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: "00000000-0000-4000-8000-000000000002",
      canonical: true,
    });
    writeFileSync(shard, `${v1}\n${v2}\n`);
    expect(runReport(proj, APPROVE).kind).not.toBe("error");
  });

  test("l: evidence for one batch does not vouch for another (BR-U3-4)", () => {
    const proj = seedCoveredRun([["alpha", "beta"], ["gamma", "delta"]]);
    seedSwarmRows(proj, [
      { event: "SWARM_STARTED", batch: "2" },
      { event: "SWARM_COMPLETED", batch: "2" },
    ]);
    const directive = runReport(proj, APPROVE);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("batch 1 (2 units: alpha, beta)");
    expect(String(directive.message)).not.toContain("batch 2 (");
  });
});
