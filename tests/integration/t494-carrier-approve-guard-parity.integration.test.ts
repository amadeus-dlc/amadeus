// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts
//
// Issue #2375. The carrier approve path (`report` with a targeted-human
// authorization carrier) returns from handleReport BEFORE the two fail-closed
// approve guards the normal path runs: the per-unit coverage gate (#368) and the
// approve-time swarm reconciliation (FR-2 / #1892). On the Kimi harness EVERY
// gate approval travels the carrier, so both guards were permanently inert there.
//
// What this file pins is PARITY: the same fixture, reported once through each
// path, refuses identically — and the two documented exemptions (the
// walking-skeleton gate stage, and an already-[x] idempotent replay) still let
// the carrier through.
//
// MECHANISM = in-process (NOT spawn). handleReport is exported and the refusal
// lands before spawnState, so the guard's wiring lines reach LCOV
// (cid:requirements-analysis:bun-coverage-spawn-blindspot). Real filesystem,
// hence the integration layer (cid:code-generation:fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_INTENT_UUID,
  resetAidlcEnv,
  seededAuditShard,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { handleReport } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { armPresenceReservation } from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { boltDagGenerationOf } from "../../packages/framework/core/tools/amadeus-lib.ts";

process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
resetAidlcEnv();

const CG_PRODUCES = ["code-generation-plan", "code-summary"];
const SESSION_ID = "trusted-carrier-session";
const ROUTE_ID = "12345678-1234-4abc-8def-1234567890ab";

const tempDirs: string[] = [];
let savedMode: string | undefined;

beforeEach(() => {
  savedMode = process.env.AMADEUS_OPERATING_MODE;
  // classifyApprovalAuthority only mints a targeted-human carrier under solo.
  process.env.AMADEUS_OPERATING_MODE = "solo";
});

afterEach(() => {
  if (savedMode === undefined) delete process.env.AMADEUS_OPERATING_MODE;
  else process.env.AMADEUS_OPERATING_MODE = savedMode;
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

interface Directive {
  kind?: string;
  message?: unknown;
  [k: string]: unknown;
}

/** Construction-phase state parked at `stage`, with autonomy granted. */
function constructionState(stage: string, checkboxes: Record<string, string>): string {
  const line = (slug: string) => `- [${checkboxes[slug] ?? " "}] ${slug} — EXECUTE`;
  return `# AI-DLC State Tracking

## Project Information
- **Project**: carrier approve guard parity
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on
- **Construction Autonomy Mode**: autonomous

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Standard

## Stage Progress

### CONSTRUCTION PHASE
${["functional-design", "nfr-requirements", "nfr-design", "infrastructure-design", "code-generation", "build-and-test"]
  .map(line)
  .join("\n")}

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: ${stage}
- **Status**: Running
- **Last Updated**: 2026-08-08T00:00:00Z
- **Completed**: 4
- **Last Completed Stage**: infrastructure-design
`;
}

const COMPLETED_UPSTREAM: Record<string, string> = {
  "functional-design": "x",
  "nfr-requirements": "x",
  "nfr-design": "x",
  "infrastructure-design": "x",
  "code-generation": "-",
};

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

/** Mark `unit` covered for `stage` by writing its produces on disk. */
function coverUnit(proj: string, unit: string, produces = CG_PRODUCES, stage = "code-generation"): void {
  const dir = join(seededRecordDir(proj), "construction", unit, stage);
  mkdirSync(dir, { recursive: true });
  for (const name of produces) writeFileSync(join(dir, `${name}.md`), `# ${name}\n`);
}

/** The batches the fixture seeded, read back from the compiled DAG it wrote. */
function seededBatches(proj: string): string[][] {
  const graph = JSON.parse(
    readFileSync(join(seededRecordDir(proj), "runtime-graph.json"), "utf-8"),
  ) as { bolt_dag?: { batches?: string[][] } };
  return graph.bolt_dag?.batches ?? [];
}

/** The row set a real prepare/finalize pair leaves for one fanned-out batch. */
function seedSwarmRun(proj: string, batch: string, units: string[]): void {
  const generation = boltDagGenerationOf(seededBatches(proj));
  const rows = [
    { event: "SWARM_STARTED", fields: { "Unit names": units.join(",") } },
    ...units.map((unit) => ({ event: "SWARM_UNIT_CONVERGED", fields: { "Unit name": unit } })),
    { event: "SWARM_COMPLETED", fields: {} },
  ];
  mkdirSync(join(seededRecordDir(proj), "audit"), { recursive: true });
  writeFileSync(
    seededAuditShard(proj),
    `${rows
      .map((row, index) =>
        JSON.stringify({
          schemaVersion: 1,
          seq: index + 1,
          cloneId: "fixturecloneid01",
          intentId: "fixture-0f14ce29",
          timestamp: `2026-08-08T10:0${index}:00Z`,
          heading: "Swarm",
          event: row.event,
          fields: { "Batch number": batch, ...row.fields, "Plan generation": generation },
        }),
      )
      .join("\n")}\n`,
  );
}

/**
 * Give the seeded registry row the `dirName` the reservation resolver requires:
 * armPresenceReservation refuses a target that does not name exactly one
 * in-flight row with a safe dir name.
 */
function seedRegistryDirName(proj: string): void {
  const registryPath = join(seededRecordDir(proj), "..", "intents.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as Record<string, unknown>[];
  registry[0].dirName = seededRecordDir(proj).split("/").at(-1);
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

/** Arm the targeted-human reservation the carrier report must present. */
function armCarrier(proj: string, stage: string): { targetIntentId: string; reservationId: string } {
  seedRegistryDirName(proj);
  const marker = armPresenceReservation({
    projectDir: proj,
    sessionId: SESSION_ID,
    space: "default",
    targetIntentId: DEFAULT_INTENT_UUID,
    stage,
    routeId: ROUTE_ID,
  });
  return { targetIntentId: marker.targetIntentId, reservationId: marker.reservationId };
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

/** The same approve, carried by a targeted-human authorization. */
function runCarrierReport(proj: string, stage: string): Directive {
  const ids = armCarrier(proj, stage);
  return runReport(proj, [
    "--stage",
    stage,
    "--result",
    "approved",
    "--user-input",
    "1",
    "--target-intent-id",
    ids.targetIntentId,
    "--presence-reservation-id",
    ids.reservationId,
  ]);
}

function seedProject(stage: string, checkboxes = COMPLETED_UPSTREAM): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), constructionState(stage, checkboxes));
  return proj;
}

describe("t494 carrier approve guard parity (#2375)", () => {
  // RED 1 (swarm reconciliation). A plan that declares alpha/beta parallel with
  // zero fan-out on record is refused on the normal path; before the fix the
  // carrier reached spawnState with the same fixture.
  test("a: the carrier refuses a parallel batch with no SWARM evidence", () => {
    const proj = seedProject("code-generation");
    seedDag(proj, [["alpha", "beta"]]);
    for (const unit of ["alpha", "beta"]) coverUnit(proj, unit);

    const directive = runCarrierReport(proj, "code-generation");

    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("batch 1 (2 units: alpha, beta)");
  });

  // The refusal must be the SAME refusal, not a carrier dialect of it.
  test("b: the carrier refusal is verbatim the normal-path refusal", () => {
    const carrierProj = seedProject("code-generation");
    seedDag(carrierProj, [["alpha", "beta"]]);
    for (const unit of ["alpha", "beta"]) coverUnit(carrierProj, unit);
    const carrier = runCarrierReport(carrierProj, "code-generation");

    const normalProj = seedProject("code-generation");
    seedDag(normalProj, [["alpha", "beta"]]);
    for (const unit of ["alpha", "beta"]) coverUnit(normalProj, unit);
    delete process.env.AMADEUS_OPERATING_MODE;
    const normal = runReport(normalProj, ["--stage", "code-generation", "--result", "approved"]);

    expect(normal.kind).toBe("error");
    expect(carrier.message).toBe(normal.message);
  });

  // RED 2 (per-unit coverage). nfr-design is per-unit and inline (mode is not
  // subagent), so the coverage gate governs it: one of two units uncovered.
  test("c: the carrier refuses a per-unit stage with an uncovered unit", () => {
    const proj = seedProject("nfr-design", {
      "functional-design": "x",
      "nfr-requirements": "x",
      "nfr-design": "-",
    });
    seedDag(proj, [["alpha", "beta"]]);
    coverUnit(proj, "alpha", [
      "performance-design",
      "security-design",
      "scalability-design",
      "reliability-design",
      "logical-components",
    ], "nfr-design");

    const directive = runCarrierReport(proj, "nfr-design");

    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("units are not yet complete (beta)");
  });

  // Non-regression: recorded fan-out still lets the carrier through to the
  // approve it was carrying (the refusal is the guard, not the carrier).
  test("d: recorded fan-out lets the carrier past the reconciliation", () => {
    const proj = seedProject("code-generation");
    seedDag(proj, [["alpha", "beta"]]);
    for (const unit of ["alpha", "beta"]) coverUnit(proj, unit);
    seedSwarmRun(proj, "1", ["alpha", "beta"]);

    const directive = runCarrierReport(proj, "code-generation");

    expect(String(directive.message ?? "")).not.toContain("batch 1 (2 units");
  });

  // Exemption 1: the walking-skeleton gate stage is the one place the engine
  // itself declines to fan out, so zero SWARM rows there is compliance.
  // functional-design is the first construction EXECUTE stage of `feature`.
  test("e: the skeleton-gate stage keeps its exemption on the carrier", () => {
    const proj = seedProject("functional-design", {
      "functional-design": "-",
    });
    seedDag(proj, [["alpha", "beta"]]);
    for (const unit of ["alpha", "beta"]) {
      coverUnit(proj, unit, [
        "domain-entities",
        "business-logic-model",
        "component-methods",
        "unit-test-strategy",
      ], "functional-design");
    }

    const directive = runCarrierReport(proj, "functional-design");

    expect(String(directive.message ?? "")).not.toContain("batch 1 (2 units");
  });

  // Exemption 2: an already-[x] stage is an idempotent recovery replay, which
  // neither guard may turn into an error.
  test("f: an idempotent replay of a completed stage is not guarded", () => {
    const proj = seedProject("code-generation", { ...COMPLETED_UPSTREAM, "code-generation": "x" });
    seedDag(proj, [["alpha", "beta"]]);

    const directive = runCarrierReport(proj, "code-generation");

    expect(String(directive.message ?? "")).not.toContain("batch 1 (2 units");
    expect(String(directive.message ?? "")).not.toContain("units are not yet complete");
  });

  // A refusal commits nothing.
  test("g: a carrier refusal leaves the state file byte-identical", () => {
    const proj = seedProject("code-generation");
    seedDag(proj, [["alpha", "beta"]]);
    for (const unit of ["alpha", "beta"]) coverUnit(proj, unit);
    const before = readFileSync(seededStateFile(proj), "utf-8");

    expect(runCarrierReport(proj, "code-generation").kind).toBe("error");

    expect(readFileSync(seededStateFile(proj), "utf-8")).toBe(before);
  });
});
