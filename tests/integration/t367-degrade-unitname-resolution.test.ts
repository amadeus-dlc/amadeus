// covers: subcommand:amadeus-orchestrate:next
//
// Issue #1711. A scope that SKIPs units-generation (`fix` here) reaches
// Construction with no compiled Bolt DAG, so the engine's per-unit routing
// takes its DEGRADE branch. That branch used to emit the literal `{unit-name}`
// placeholder in every resolved produces/consumes path. Nothing downstream can
// consume such a path: the artifacts are written under the REAL unit directory,
// so `amadeus-reviewer-runtime.ts scope` looks for the placeholder path, finds
// nothing, and dies with "required review artifact is missing" — the §12a
// reviewer gate is unreachable for the whole degrade family of scopes.
//
// CONTRACT (intent 260730-skill-reviewer-fixes Q1=A): on that branch the engine
// resolves the unit from the only ledger it has — the unit directory under
// <record>/construction/ — and emits real paths. When it cannot name exactly
// one unit it refuses with an `error` directive rather than emitting a
// placeholder that is guaranteed to fail downstream (fail-closed).
//
// MECHANISM = cli + cross-tool integration. Both sides are pinned end to end:
//   (i)  ONE unit dir  -> run-stage with resolved paths, and the emitted
//        directive drives `amadeus-reviewer-runtime.ts scope` to exit 0 once the
//        artifacts exist at those paths. This is the closure of the reported
//        symptom, not just a string assertion on the directive.
//   (ii) ZERO or MANY unit dirs -> `error`, naming the unmet condition (and the
//        candidates when the listing is ambiguous), with no placeholder leaking
//        into the message.
//
// The cross-tool half SPAWNS the shipped copies (dist/claude/.claude/tools/),
// the surface the engine and the reviewer runtime actually run from. Spawned
// work is invisible to the parent LCOV, so the routing decision itself is ALSO
// driven in-process through the exported `handleNext` (the seam t198/t211/t213
// already use) — same branch, real line attribution.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  resetAidlcEnv,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { writeDegradeUnitDeclaration } from "../../packages/framework/core/tools/amadeus-lib.ts";

// The core source has no co-located compiled graph — point the in-process
// engine at the packaged dist copy (regenerated from the same core here).
process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";
resetAidlcEnv();

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const ORCH = join(TOOLS, "amadeus-orchestrate.ts");
const REVIEWER = join(TOOLS, "amadeus-reviewer-runtime.ts");

const RP = `amadeus/spaces/${DEFAULT_SPACE}/intents/${DEFAULT_RECORD_DIR}`;

interface Directive {
  unit?: string;
  review_only?: true;
  gate?: unknown;
  kind: string;
  stage?: string;
  message?: string;
  consumes?: string[];
  consumes_absent?: { path: string; expected: boolean }[];
  produces?: string[];
  optional_produces?: string[];
  stage_file?: string;
}

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length) cleanupTestProject(tempDirs.pop());
});

// A `fix`-scope Construction state pivoted to code-generation. `fix` SKIPs
// units-generation (verified in scope-grid.json), which is precisely how a
// workflow arrives at Construction with no Bolt DAG to iterate.
//
// `Skeleton Stance` is recorded because code-generation is ALSO the first
// Construction stage for `fix`, i.e. its walking-skeleton gate stage. With no
// stance the engine returns on the classify round-trip before any per-unit
// routing; a live workflow records the stance and re-enters, which is the
// moment under test here.
function fixScopeState(): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: degrade unit resolution test
- **Project Type**: Brownfield
- **Scope**: fix
- **State Version**: 7
- **Skeleton Stance**: off

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Standard

## Execution Plan Summary
- **Total Stages**: 2
- **Completed**: 0
- **In Progress**: code-generation

## Stage Progress

### CONSTRUCTION PHASE
- [-] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: code-generation
- **Status**: Running
- **Construction Autonomy Mode**: gated
- **Last Updated**: 2026-07-30T00:00:00Z

## Session Resume Point
- **Last Completed Stage**: requirements-analysis
`;
}

// An `infra`-scope Construction state pivoted to nfr-requirements. `infra` also
// SKIPs units-generation, and nfr-requirements is BOTH its first construction
// stage (hence the recorded stance, as above) and one of the four stages that
// declare produces_kinds — the only way to reach the kind-sensitive arm of the
// coverage predicate from this branch.
function infraScopeState(): string {
  return fixScopeState()
    .replace("**Scope**: fix", "**Scope**: infra")
    .replaceAll("code-generation", "nfr-requirements")
    .replace("build-and-test", "nfr-design");
}

function infraNfrDesignState(): string {
  return infraScopeState()
    .replace("**In Progress**: nfr-requirements", "**In Progress**: nfr-design")
    .replace("- [-] nfr-requirements — EXECUTE", "- [x] nfr-requirements — EXECUTE")
    .replace("- [ ] nfr-design — EXECUTE", "- [-] nfr-design — EXECUTE")
    .replace("**Current Stage**: nfr-requirements", "**Current Stage**: nfr-design")
    .replace("**Last Completed Stage**: requirements-analysis", "**Last Completed Stage**: nfr-requirements");
}

/** A fresh `fix`-scope project with NO compiled Bolt DAG. */
function seedFixProject(): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  writeFileSync(seededStateFile(proj), fixScopeState());
  return proj;
}

/** Create a bare Unit-of-Work directory — the degrade path's whole ledger. */
function seedUnitDir(proj: string, unit: string): void {
  mkdirSync(join(seededRecordDir(proj), "construction", unit), {
    recursive: true,
  });
}

/** Write `files` under <record>/construction/<unit>/<stage>/. */
function seedUnitArtifacts(
  proj: string,
  unit: string,
  stage: string,
  files: string[],
): void {
  const dir = join(seededRecordDir(proj), "construction", unit, stage);
  mkdirSync(dir, { recursive: true });
  for (const name of files) {
    writeFileSync(join(dir, name), `# ${unit} ${name}\n`);
  }
}

/**
 * Create a unit directory that already holds code-generation's REQUIRED
 * artifacts, i.e. a unit this stage has nothing left to do for. That is what
 * lets the engine subtract it when several directories exist (issue #1769).
 */
function seedCoveredUnitDir(proj: string, unit: string): void {
  seedUnitArtifacts(proj, unit, "code-generation", [
    "code-generation-plan.md",
    "code-summary.md",
  ]);
  writeFileSync(
    join(seededRecordDir(proj), "construction", unit, "code-generation", "code-generation-plan.md"),
    `# ${unit} code-generation-plan.md\n\n## Review — Iteration 1\n\n` +
      "- **Verdict:** READY\n" +
      "- **Reviewer:** amadeus-architecture-reviewer-agent\n" +
      "- **Date:** 2026-08-10T00:00:00Z\n" +
      "- **Iteration:** 1\n" +
      "- **Scope decision:** none\n",
  );
}

/**
 * Record the conductor's "no further units are coming" declaration (#2358)
 * through the SAME writer the `declare-units-done` verb uses, so the fixture
 * cannot drift from the shape the engine reads.
 */
function declareUnitsDone(proj: string, units: string[]): void {
  const path = seededStateFile(proj);
  writeFileSync(
    path,
    writeDegradeUnitDeclaration(readFileSync(path, "utf8"), units, "2026-08-07T00:00:00Z"),
  );
}

/**
 * A runtime snapshot carrying unit rows but no usable batches — the shape that
 * survives when the canonical unit-of-work-dependency doc is gone. `next` then
 * takes the degrade branch while readUnitKinds still resolves kinds.
 */
function seedRuntimeUnitKinds(
  proj: string,
  units: { name: string; kind?: string }[],
): void {
  writeFileSync(
    join(seededRecordDir(proj), "runtime-graph.json"),
    JSON.stringify({ bolt_dag: { units, batches: [] } }),
  );
}

function runNext(proj: string): Directive {
  const r = spawnSync(BUN, [ORCH, "next", "--project-dir", proj], {
    encoding: "utf-8",
    env: (() => {
      const e = { ...process.env };
      delete e.AMADEUS_DEFAULT_SCOPE;
      return e;
    })(),
  });
  try {
    return JSON.parse((r.stdout ?? "").trim());
  } catch {
    throw new Error(
      `next did not emit parseable JSON. status=${r.status}\n${r.stdout ?? ""}${r.stderr ?? ""}`,
    );
  }
}

/**
 * Materialise everything `scope` reads: the stage definition and every REQUIRED
 * produces file (optional_produces are legitimately absent).
 *
 * The artifact paths are rebuilt under the REAL unit directory rather than
 * copied from the directive — that is where a conductor actually writes them,
 * and it is what makes this a regression test. Seeding the directive's own
 * paths would create literal `{unit-name}` directories on the pre-fix engine
 * and let `scope` pass against the very bug under test.
 */
function materialiseReviewSurface(proj: string, d: Directive, unit: string): void {
  const optional = new Set(d.optional_produces ?? []);
  const artifacts = (d.produces ?? [])
    .filter((p) => !optional.has(p))
    .map((p) => `${RP}/construction/${unit}/code-generation/${p.split("/").pop()}`);
  for (const rel of [d.stage_file, ...artifacts]) {
    if (!rel) continue;
    const abs = join(proj, ...rel.split("/"));
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, `# ${rel}\n`);
  }
}

function materialiseUnexpectedConsumes(proj: string, d: Directive): void {
  for (const consume of d.consumes_absent ?? []) {
    if (consume.expected) continue;
    const abs = join(proj, ...consume.path.split("/"));
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, `# ${consume.path}\n`);
  }
}

/** Drive `next` IN-PROCESS and return the emitted directive. */
function runNextInProcess(proj: string): Directive {
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

function runReviewerScope(
  proj: string,
  d: Directive,
): { status: number | null; stderr: string } {
  const r = spawnSync(BUN, [REVIEWER, "scope"], {
    encoding: "utf-8",
    cwd: proj,
    input: JSON.stringify(d),
  });
  return { status: r.status, stderr: r.stderr ?? "" };
}

describe("t367 degrade-scope {unit-name} resolution (issue #1711)", () => {
  test("1: one unit directory resolves into the emitted produces paths", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "fix-1711-unitname");
    const d = runNext(proj);
    expect(d.kind).toBe("run-stage");
    expect(d.stage).toBe("code-generation");
    expect(
      (d.produces ?? []).some((p) =>
        p.startsWith(`${RP}/construction/fix-1711-unitname/code-generation/`),
      ),
    ).toBe(true);
    expect((d.produces ?? []).filter((p) => p.includes("{unit-name}"))).toEqual([]);
    // The resolved unit rides the directive itself so downstream consumers
    // (reviewer-runtime unit-belonging checks) see the same resolution.
    expect(d.unit).toBe("fix-1711-unitname");
  }, scaleTestTime(30000));

  test("2: consumes are resolved with the same unit (produces/consumes symmetry)", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "fix-1711-unitname");
    const d = runNext(proj);
    const everywhere = [...(d.consumes ?? []), ...(d.produces ?? [])];
    expect(everywhere.filter((p) => p.includes("{unit-name}"))).toEqual([]);
    // Any per-unit consume that survives the presence split carries the SAME
    // resolved unit segment as produces — one unit per directive, both sides.
    for (const p of d.consumes ?? []) {
      if (!p.includes("/construction/")) continue;
      expect(p).toContain("/construction/fix-1711-unitname/");
    }
  }, scaleTestTime(30000));

  test("3: the emitted directive drives reviewer-runtime scope to exit 0", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "fix-1711-unitname");
    const initial = runNext(proj);
    materialiseUnexpectedConsumes(proj, initial);
    const d = runNext(proj);
    materialiseReviewSurface(proj, d, "fix-1711-unitname");
    const r = runReviewerScope(proj, d);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  }, scaleTestTime(30000));

  test("4: no unit directory is refused with an actionable error", () => {
    const proj = seedFixProject();
    const d = runNext(proj);
    expect(d.kind).toBe("error");
    expect(d.message).toContain("code-generation");
    expect(d.message).toContain("no unit directory exists");
    expect(d.message).toContain(`${RP}/construction/`);
    expect(d.message).not.toContain("{unit-name}");
  }, scaleTestTime(30000));

  test("5: several unit directories are refused, naming the candidates", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "unit-alpha");
    seedUnitDir(proj, "unit-beta");
    const d = runNext(proj);
    expect(d.kind).toBe("error");
    expect(d.message).toContain("unit-alpha");
    expect(d.message).toContain("unit-beta");
    expect(d.message).not.toContain("{unit-name}");
  }, scaleTestTime(30000));

  // 7-9 drive the SAME branch in-process. Spawned runs prove the shipped
  // surface; these prove the decision with the lines actually attributed.
  test("7: in-process, one unit directory resolves into the produces paths", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "fix-1711-unitname");
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("run-stage");
    expect((d.produces ?? []).filter((p) => p.includes("{unit-name}"))).toEqual([]);
    expect(
      (d.produces ?? []).some((p) =>
        p.includes("/construction/fix-1711-unitname/code-generation/"),
      ),
    ).toBe(true);
  }, scaleTestTime(30000));

  test("8: in-process, no unit directory is refused", () => {
    const proj = seedFixProject();
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("error");
    expect(d.message).toContain("no unit directory exists");
  }, scaleTestTime(30000));

  test("9: in-process, several unit directories are refused with the candidates", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "unit-alpha");
    seedUnitDir(proj, "unit-beta");
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("error");
    expect(d.message).toContain("unit-alpha");
    expect(d.message).toContain("unit-beta");
  }, scaleTestTime(30000));

  // 10-13 pin the #1769 refinement: several unit directories no longer refuse
  // outright. A record that accumulated a finished unit from an earlier Bolt
  // leaves exactly one unit with work outstanding, and that one is the answer.
  test("10: a finished unit is subtracted, resolving the one still outstanding", () => {
    const proj = seedFixProject();
    seedCoveredUnitDir(proj, "fix-1711-unitname");
    seedUnitDir(proj, "fix-1769-degrade-multiunit");
    const d = runNext(proj);
    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("fix-1769-degrade-multiunit");
    expect((d.produces ?? []).filter((p) => p.includes("{unit-name}"))).toEqual([]);
    expect(
      (d.produces ?? []).some((p) =>
        p.startsWith(`${RP}/construction/fix-1769-degrade-multiunit/code-generation/`),
      ),
    ).toBe(true);
  }, scaleTestTime(30000));

  test("11: in-process, the outstanding unit is resolved the same way", () => {
    const proj = seedFixProject();
    seedCoveredUnitDir(proj, "unit-alpha");
    seedUnitDir(proj, "unit-beta");
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("unit-beta");
  }, scaleTestTime(30000));

  test("12: two outstanding units are refused, naming the outstanding ones", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "unit-alpha");
    seedUnitDir(proj, "unit-beta");
    seedCoveredUnitDir(proj, "unit-done");
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("error");
    expect(d.message).toContain("2 of them are still missing this stage's required artifacts: unit-alpha, unit-beta");
    // The finished unit is named among the candidates but not among the
    // outstanding ones — the message must not send the conductor after it.
    expect(d.message).toContain("unit-done");
    expect(d.message).toContain("Narrow this stage to one unit");
    expect(d.message).not.toContain("{unit-name}");
  }, scaleTestTime(30000));

  // 13 was a single pin: several finished units ALWAYS refused, and the only
  // move offered was "create another unit directory" — which left a conductor
  // who had finished adding units with no way forward at all (issue #2358).
  // EXPLICIT REVISION under ruling #2385 Q4-B and this intent's requirements
  // FR-3.4: the refusal survives as the UNDECLARED arm, and a recorded
  // unit-list declaration now turns the same listing into the stage gate.
  test("13a: several finished units with no declaration are still refused", () => {
    const proj = seedFixProject();
    seedCoveredUnitDir(proj, "unit-alpha");
    seedCoveredUnitDir(proj, "unit-beta");
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("error");
    expect(d.message).toContain("Every one of them already holds this stage's required artifacts");
    expect(d.message).toContain("declare-units-done");
    expect(d.message).not.toContain("{unit-name}");
  }, scaleTestTime(30000));

  test("13b: a declaration matching the finished units presents the stage gate", () => {
    const proj = seedFixProject();
    seedCoveredUnitDir(proj, "unit-alpha");
    seedCoveredUnitDir(proj, "unit-beta");
    declareUnitsDone(proj, ["unit-alpha", "unit-beta"]);
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("unit-beta");
    expect(d.gate).toBeDefined();
    expect((d.produces ?? []).filter((p) => p.includes("{unit-name}"))).toEqual([]);
  }, scaleTestTime(30000));

  test("13c: a declared finished unit with an unreadable Review projection is recovered", () => {
    const proj = seedFixProject();
    seedUnitArtifacts(proj, "unit-alpha", "code-generation", [
      "code-generation-plan.md",
      "code-summary.md",
    ]);
    const alphaPrimary = join(
      seededRecordDir(proj),
      "construction",
      "unit-alpha",
      "code-generation",
      "code-generation-plan.md",
    );
    rmSync(alphaPrimary);
    mkdirSync(alphaPrimary);
    seedCoveredUnitDir(proj, "unit-beta");
    declareUnitsDone(proj, ["unit-alpha", "unit-beta"]);
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("unit-alpha");
    expect(d.gate).toBe(false);
    expect(d.review_only).toBe(true);
  }, scaleTestTime(30000));

  // 14 pins the asymmetry E-OBB2-CG1 ruled INTENTIONAL: a LONE unit resolves
  // whether or not its artifacts already exist, because the resulting directive
  // is how the conductor reaches the stage gate — the same move the compiled-DAG
  // path makes on its all-covered re-entry. Several finished units (test 13) are
  // refused for ambiguity, not because finished work is off limits.
  test("14: a lone finished unit still resolves, carrying the stage gate", () => {
    const proj = seedFixProject();
    seedCoveredUnitDir(proj, "fix-1711-unitname");
    const d = runNext(proj);
    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("fix-1711-unitname");
    expect(d.gate).toBeDefined();
    expect((d.produces ?? []).filter((p) => p.includes("{unit-name}"))).toEqual([]);
  }, scaleTestTime(30000));

  // 15 pins the unit-KIND arm of the coverage predicate on this branch. A stage
  // with produces_kinds requires only the artifacts its unit's kind declares, so
  // a kindless lookup would hold a finished unit to the full matrix, report it
  // uncovered, and refuse a listing the engine can in fact resolve.
  //
  // The fixture is the state that makes kinds reachable here: the canonical
  // unit-of-work-dependency doc is absent (so recoverBoltDag returns "none" and
  // there is no DAG to iterate) while a runtime snapshot from an earlier compile
  // still carries the unit rows readUnitKinds reads.
  test("15: unit kinds decide coverage on the degrade path too", () => {
    const proj = createTestProject();
    tempDirs.push(proj);
    writeFileSync(seededStateFile(proj), infraScopeState());
    seedRuntimeUnitKinds(proj, [
      { name: "unit-lib", kind: "library" },
      { name: "unit-svc" },
    ]);
    // `library` prunes performance/scalability/reliability from nfr-requirements,
    // so these two files are the whole required set for unit-lib — and only a
    // fraction of the kindless matrix unit-svc is still held to.
    seedUnitArtifacts(proj, "unit-lib", "nfr-requirements", [
      "security-requirements.md",
      "tech-stack-decisions.md",
    ]);
    seedUnitDir(proj, "unit-svc");
    const d = runNextInProcess(proj);
    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("unit-svc");
  }, scaleTestTime(30000));

  test("16: degrade directives apply the resolved unit kind to outputs and inputs", () => {
    const proj = createTestProject();
    tempDirs.push(proj);
    writeFileSync(seededStateFile(proj), infraNfrDesignState());
    seedRuntimeUnitKinds(proj, [{ name: "unit-lib", kind: "library" }]);
    seedUnitArtifacts(proj, "unit-lib", "nfr-requirements", [
      "security-requirements.md",
      "tech-stack-decisions.md",
    ]);

    const d = runNextInProcess(proj);

    expect(d.kind).toBe("run-stage");
    expect(d.unit).toBe("unit-lib");
    expect((d.produces ?? []).map((path) => path.split("/").at(-1))).toEqual([
      "security-design.md",
      "logical-components.md",
    ]);
    expect((d.consumes ?? []).map((path) => path.split("/").at(-1))).toEqual([
      "security-requirements.md",
      "tech-stack-decisions.md",
    ]);
    expect(
      (d.consumes_absent ?? []).map((consume) => consume.path.split("/").at(-1)),
    ).toEqual(["business-logic-model.md"]);
  }, scaleTestTime(30000));

  test("6: a construction stage's own diary dir is not mistaken for a unit", () => {
    const proj = seedFixProject();
    seedUnitDir(proj, "fix-1711-unitname");
    // Every construction stage writes <record>/construction/<slug>/memory.md.
    // Those dirs sit beside the unit dirs and must not count as units, or the
    // listing would be ambiguous on every real workflow.
    seedUnitDir(proj, "code-generation");
    seedUnitDir(proj, "build-and-test");
    const d = runNext(proj);
    expect(d.kind).toBe("run-stage");
    expect(
      (d.produces ?? []).some((p) =>
        p.includes("/construction/fix-1711-unitname/"),
      ),
    ).toBe(true);
  }, scaleTestTime(30000));
});
