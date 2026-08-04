// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts
//
// The issuance-side plan-integrity guard driven end to end through `next`
// (U2 of 260801-cg-plan-guard, FR-1 / FR-4).
//
// A compiled Bolt DAG can declare a batch two or more units wide and the engine
// can still fall through to the serial per-unit loop — that is the plan drift
// issue #1892 measured in 4 of 18 audited intents. The guard sits at the single
// issuance chokepoint: when the DAG declares parallelism and the run is about
// to go serial for a reason that is NOT a legitimate one, `next` stops with a
// three-part message instead of quietly serialising.
//
// MECHANISM = in-process (NOT spawn), the same discipline as t211/t251:
// handleNext is exported and emit() console.log's the directive, so the guard's
// new branches stay honest under the coverage gate. A spawned CLI would run the
// same code uninstrumented.

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  GUARD_EXIT_MARKER,
  GUARD_OBSERVED_MARKER,
  GUARD_WEIGHT_MARKER,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
resetAidlcEnv();

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

interface Directive {
  kind?: string;
  stage?: string;
  gate?: unknown;
  units?: unknown;
  question?: unknown;
  message?: unknown;
  [k: string]: unknown;
}

function runNext(proj: string): Directive {
  let raw = "";
  const log = spyOn(console, "log").mockImplementation((value) => {
    raw = String(value);
  });
  try {
    handleNext([], proj);
  } finally {
    log.mockRestore();
  }
  return JSON.parse(raw) as Directive;
}

/** The text a directive carries for a human, whichever field it landed in. */
function humanText(directive: Directive): string {
  return String(directive.question ?? directive.message ?? "");
}

/** Assert the three-part contract on a guard-carrying directive (AC-4a). */
function expectThreePart(text: string): void {
  expect(text).toContain(GUARD_OBSERVED_MARKER);
  expect(text).toContain(GUARD_WEIGHT_MARKER);
  expect(text).toContain(GUARD_EXIT_MARKER);
}

const CG_PRODUCES = ["code-generation-plan", "code-summary"];

/**
 * A Construction state parked at code-generation (in-flight). `skeleton` marks
 * the feature-scope walking-skeleton gate stage (functional-design) complete or
 * still in flight — the two sides of the unset-autonomy split. `autonomy` is
 * omitted entirely when empty.
 */
function codegenState(opts: {
  skeleton: "complete" | "in-flight";
  autonomy?: string;
  scope?: string;
}): string {
  const autonomyLine =
    opts.autonomy === "autonomous"
      ? "\n- **Intent Autonomy Mode**: full\n- **Construction Autonomy Mode**: autonomous"
      : opts.autonomy === "gated"
        ? "\n- **Intent Autonomy Mode**: semi\n- **Construction Autonomy Mode**: autonomous"
        : opts.autonomy === "none"
          ? "\n- **Intent Autonomy Mode**: none\n- **Construction Autonomy Mode**: unset"
        : opts.autonomy
          ? `\n- **Intent Autonomy Mode**: ${opts.autonomy}\n- **Construction Autonomy Mode**: unset`
          : "";
  const skeletonBox = opts.skeleton === "complete" ? "x" : "-";
  return `# AI-DLC State Tracking

## Project Information
- **Project**: issuance guard
- **Project Type**: Greenfield
- **Scope**: ${opts.scope ?? "feature"}
- **State Version**: 7
- **Skeleton Stance**: on${autonomyLine}

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Standard

## Stage Progress

### CONSTRUCTION PHASE
- [${skeletonBox}] functional-design — EXECUTE
- [x] nfr-requirements — EXECUTE
- [x] nfr-design — EXECUTE
- [x] infrastructure-design — EXECUTE
- [-] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: code-generation
- **Status**: Running
`;
}

function seedMultiBatchDag(proj: string, batches: string[][]): void {
  const dependencyDir = join(seededRecordDir(proj), "inception", "units-generation");
  mkdirSync(dependencyDir, { recursive: true });
  const units = batches.flatMap((batch, index) =>
    batch.map((name) => ({ name, depends_on: index === 0 ? [] : batches[index - 1]! })),
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

function coverUnit(proj: string, unit: string): void {
  const dir = join(seededRecordDir(proj), "construction", unit, "code-generation");
  mkdirSync(dir, { recursive: true });
  for (const name of CG_PRODUCES) writeFileSync(join(dir, `${name}.md`), `# ${name} for ${unit}\n`);
}

function seedProject(
  batches: string[][] | null,
  opts: { skeleton: "complete" | "in-flight"; autonomy?: string; scope?: string },
): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), codegenState(opts));
  if (batches !== null) seedMultiBatchDag(proj, batches);
  return proj;
}

describe("t403 the guard redirects an unanswered ladder that owes a parallel batch (AC-1b)", () => {
  test("a: a width-2 batch with the ladder unanswered asks, with all three parts", () => {
    const proj = seedProject([["alpha", "beta"]], { skeleton: "complete" });
    const directive = runNext(proj);
    expect(directive.kind).toBe("ask");
    const text = humanText(directive);
    expectThreePart(text);
    // The observation carries the numbers: the batch, its declared width, and
    // every unit the plan named for it. Asserted as the whole phrase — a bare
    // "2" would also match the issue number in the weight sentence.
    expect(text).toContain("batch 1 2 units wide");
    expect(text).toContain("alpha");
    expect(text).toContain("beta");
    // The exit reuses the existing ladder command rather than inventing one.
    expect(text).toContain("set-autonomy");
  });

  test("b: the redirect never fans the batch out on its own", () => {
    const proj = seedProject([["alpha", "beta"]], { skeleton: "complete" });
    const directive = runNext(proj);
    expect(directive.kind).not.toBe("invoke-swarm");
    expect(directive.kind).not.toBe("run-stage");
  });

  test("c: an unrecognised autonomy value reads as unset and still redirects", () => {
    const proj = seedProject([["alpha", "beta"]], { skeleton: "complete", autonomy: "Autonomous" });
    const directive = runNext(proj);
    expect(directive.kind).toBe("ask");
    expectThreePart(humanText(directive));
  });
});

describe("t403 the guard stays silent on every legitimate serial path (AC-1c / NFR-1)", () => {
  test("d: an unset grant BEFORE the skeleton ships keeps the per-unit loop", () => {
    // The ladder has not fired yet — an unset grant here is the legitimate
    // initial state, not an unanswered question (amadeus-orchestrate.ts's
    // "Only AFTER the skeleton" comment; pinned by t251 test d).
    const proj = seedProject([["alpha", "beta"]], { skeleton: "in-flight" });
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(directive.gate).toBe(false);
  });

  test("e: explicit none preserves the declared DAG fan-out", () => {
    const proj = seedProject([["alpha", "beta"]], { skeleton: "complete", autonomy: "none" });
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha", "beta"]);
  });

  test("f: no compiled DAG at all keeps today's degrade behaviour", () => {
    const proj = seedProject(null, { skeleton: "complete" });
    const directive = runNext(proj);
    expect(humanText(directive)).not.toContain(GUARD_OBSERVED_MARKER);
  });

  test("g: the skeleton-gate stage is never guarded, even owing a parallel batch", () => {
    // fix scope: code-generation IS the walking-skeleton gate stage, which is
    // always human-gated and must never be diverted by this guard.
    const proj = seedProject([["alpha", "beta"]], { skeleton: "complete", scope: "fix" });
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(humanText(directive)).not.toContain(GUARD_OBSERVED_MARKER);
  });

  test("h: every unit covered re-enters the stage's own gate, not the guard", () => {
    // The grant is recorded so the ladder does not intercept first — this
    // isolates the all-covered decline, which is the stage's normal gate
    // re-entry and never a plan violation.
    const proj = seedProject([["alpha", "beta"]], { skeleton: "complete", autonomy: "gated" });
    coverUnit(proj, "alpha");
    coverUnit(proj, "beta");
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(humanText(directive)).not.toContain(GUARD_OBSERVED_MARKER);
  });

  test("i: a granted autonomy fans the declared batch out unchanged", () => {
    const proj = seedProject([["alpha", "beta"]], { skeleton: "complete", autonomy: "autonomous" });
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha", "beta"]);
  });

  test("j: an inline per-unit design stage is untouched by the guard", () => {
    // functional-design runs once per unit but inline, not as a subagent swarm,
    // so it is outside the guard's stage set however wide the DAG declares.
    const proj = seedProject([["alpha", "beta"]], { skeleton: "in-flight" });
    const statePath = seededStateFile(proj);
    writeFileSync(
      statePath,
      readFileSync(statePath, "utf-8").replace(
        "- **Current Stage**: code-generation",
        "- **Current Stage**: functional-design",
      ),
    );
    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe("functional-design");
    expect(humanText(directive)).not.toContain(GUARD_OBSERVED_MARKER);
  });
});
