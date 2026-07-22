// covers: function:compileStageGraph, subcommand:amadeus-orchestrate:next,
//         function:unitCovered, function:producesArtifactsExist

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  __resetGraphCache,
  compileStageGraph,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  handleNext,
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { handleAdvance } from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const ORCHESTRATOR = join(
  REPO_ROOT,
  "packages/framework/core/tools/amadeus-orchestrate.ts",
);
const STATE = join(REPO_ROOT, "packages/framework/core/tools/amadeus-state.ts");
const SCOPE_GRID = join(
  REPO_ROOT,
  "dist/claude/.claude/tools/data/scope-grid.json",
);

const projects: string[] = [];
const scratch: string[] = [];

afterEach(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  while (scratch.length > 0) rmSync(scratch.pop()!, { recursive: true, force: true });
  _resetStageGraphForTests();
  __resetGraphCache();
});

function sourceGraph(): string {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-t248-graph-"));
  scratch.push(dir);
  const graph = JSON.parse(
    readFileSync(
      join(REPO_ROOT, "dist/claude/.claude/tools/data/stage-graph.json"),
      "utf-8",
    ),
  ) as Array<Record<string, unknown>>;
  const functional = graph.find((stage) => stage.slug === "functional-design");
  if (!functional) throw new Error("functional-design graph fixture missing");
  functional.produces_kinds = {
    "business-logic-model": ["service", "ui", "library"],
    "business-rules": ["service", "spec", "library"],
    "domain-entities": ["service", "spec", "library"],
    "frontend-components": ["ui"],
  };
  const path = join(dir, "stage-graph.json");
  writeFileSync(path, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");
  return path;
}

function env(graphPath: string, guard = false): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {
    ...process.env,
    AMADEUS_STAGE_GRAPH: graphPath,
    AMADEUS_SCOPE_GRID: SCOPE_GRID,
    AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
  };
  delete result.AMADEUS_DEFAULT_SCOPE;
  if (guard) delete result.AMADEUS_SKIP_ARTIFACT_GUARD;
  else result.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  return result;
}

function seedProject(
  units: Array<{ name: string; kind?: string }>,
): string {
  const project = createTestProject();
  projects.push(project);
  const dependencyDir = join(
    seededRecordDir(project),
    "inception",
    "units-generation",
  );
  mkdirSync(dependencyDir, { recursive: true });
  const rows = units.flatMap((unit) => [
    `  - name: ${unit.name}`,
    ...(unit.kind === undefined ? [] : [`    kind: ${unit.kind}`]),
    "    depends_on: []",
  ]);
  writeFileSync(
    join(dependencyDir, "unit-of-work-dependency.md"),
    `# Unit dependencies\n\n\`\`\`yaml\nunits:\n${rows.join("\n")}\n\`\`\`\n`,
    "utf-8",
  );
  writeFileSync(
    seededStateFile(project),
    `# AI-DLC State Tracking

## Project Information
- **Project**: stage contract routing
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Comprehensive

## Stage Progress

### CONSTRUCTION PHASE
- [-] functional-design — EXECUTE
- [ ] nfr-requirements — EXECUTE
- [ ] nfr-design — EXECUTE
- [ ] infrastructure-design — EXECUTE
- [ ] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

### INCEPTION PHASE
- [x] application-design — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: functional-design
- **Status**: Running
`,
    "utf-8",
  );
  writeFileSync(
    join(seededRecordDir(project), "runtime-graph.json"),
    `${JSON.stringify(
      {
        bolt_dag: {
          units: units.map((unit) => ({
            name: unit.name,
            ...(unit.kind === undefined ? {} : { kind: unit.kind }),
            depends_on: [],
          })),
          batches: [units.map((unit) => unit.name).sort()],
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  return project;
}

function next(project: string, graphPath: string): Record<string, unknown> {
  const result = spawnSync(
    process.execPath,
    [ORCHESTRATOR, "next", "--project-dir", project],
    { encoding: "utf-8", env: env(graphPath) },
  );
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout.trim()) as Record<string, unknown>;
}

function writeFunctionalArtifacts(
  project: string,
  unit: string,
  artifacts: string[],
): void {
  const dir = join(
    seededRecordDir(project),
    "construction",
    unit,
    "functional-design",
  );
  mkdirSync(dir, { recursive: true });
  for (const artifact of artifacts) {
    writeFileSync(join(dir, `${artifact}.md`), `# ${artifact}\n`, "utf-8");
  }
}

describe("t248 kind-aware routing and coverage", () => {
  test("skips a vacuous packaging unit and routes only spec artifacts", () => {
    const project = seedProject([
      { name: "package", kind: "packaging" },
      { name: "schema", kind: "spec" },
    ]);
    const directive = next(project, sourceGraph());
    expect(directive.unit).toBe("schema");
    expect(directive.produces).toEqual([
      `amadeus/spaces/${DEFAULT_SPACE}/intents/${DEFAULT_RECORD_DIR}/construction/schema/functional-design/business-rules.md`,
      `amadeus/spaces/${DEFAULT_SPACE}/intents/${DEFAULT_RECORD_DIR}/construction/schema/functional-design/domain-entities.md`,
    ]);
    expect("optional_produces" in directive).toBe(false);
  }, 30_000);

  test("treats a filtered required empty set as covered after the spec files land", () => {
    const project = seedProject([
      { name: "package", kind: "packaging" },
      { name: "schema", kind: "spec" },
    ]);
    writeFunctionalArtifacts(project, "schema", ["business-rules", "domain-entities"]);
    const directive = next(project, sourceGraph());
    expect(directive.unit).toBe("schema");
    expect(directive.gate).toBe(true);
  }, 30_000);

  test("keeps the full matrix for an untagged unit", () => {
    const project = seedProject([{ name: "legacy" }]);
    const directive = next(project, sourceGraph());
    expect(directive.unit).toBe("legacy");
    expect(directive.produces).toHaveLength(4);
    expect(directive.optional_produces).toHaveLength(1);
  }, 30_000);

  test("keeps the full matrix when the runtime kind is malformed", () => {
    const project = seedProject([{ name: "legacy" }]);
    const runtimePath = join(seededRecordDir(project), "runtime-graph.json");
    const graph = JSON.parse(readFileSync(runtimePath, "utf-8"));
    graph.bolt_dag.units[0].kind = "worker";
    writeFileSync(runtimePath, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");
    const directive = next(project, sourceGraph());
    expect(directive.produces).toHaveLength(4);
  }, 30_000);
});

describe("t248 applicability projection and completion guard", () => {
  test("compiles the four canonical stage mappings", () => {
    const previousGraph = process.env.AMADEUS_STAGE_GRAPH;
    process.env.AMADEUS_STAGE_GRAPH = join(
      REPO_ROOT,
      "dist/claude/.claude/tools/data/stage-graph.json",
    );
    _resetStageGraphForTests();
    __resetGraphCache();
    try {
      const stages = compileStageGraph().stages;
      expect(
        stages.find((stage) => stage.slug === "functional-design")
          ?.produces_kinds,
      ).toEqual({
        "business-logic-model": ["service", "ui", "library"],
        "business-rules": ["service", "spec", "library"],
        "domain-entities": ["service", "spec", "library"],
        "frontend-components": ["ui"],
      });
      expect(
        stages.filter((stage) => stage.produces_kinds !== undefined).map((stage) => stage.slug),
      ).toEqual([
        "functional-design",
        "nfr-requirements",
        "nfr-design",
        "infrastructure-design",
      ]);
    } finally {
      if (previousGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
      else process.env.AMADEUS_STAGE_GRAPH = previousGraph;
    }
  });

  test("completion guard accepts an all-vacuous packaging stage", () => {
    const graphPath = sourceGraph();
    const project = seedProject([{ name: "package", kind: "packaging" }]);
    const result = spawnSync(
      process.execPath,
      [STATE, "advance", "functional-design", "--project-dir", project],
      { encoding: "utf-8", env: env(graphPath, true) },
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  }, 30_000);

  test("completion guard still rejects a non-vacuous spec stage without artifacts", () => {
    const graphPath = sourceGraph();
    const project = seedProject([{ name: "schema", kind: "spec" }]);
    const result = spawnSync(
      process.execPath,
      [STATE, "advance", "functional-design", "--project-dir", project],
      { encoding: "utf-8", env: env(graphPath, true) },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("Refusing to complete");
  }, 30_000);
});

// buildGraphStage carries the plugin-scope optional frontmatter fields
// (bundle / when / required_sections) through to the compiled GraphStage. No
// default stage declares them, so this compiles a copy of the real stages dir
// with the three fields injected into one stage and asserts they survive.
describe("t248 buildGraphStage optional field carry-through", () => {
  const scratch: string[] = [];
  const envKeys = [
    "AMADEUS_STAGES_DIR",
    "AMADEUS_STAGE_GRAPH",
    "AMADEUS_SCOPE_GRID",
    "AMADEUS_RULES_DIR",
    "AMADEUS_SENSORS_DIR",
  ] as const;
  let savedGraphEnv: Record<string, string | undefined>;

  afterEach(() => {
    for (const k of envKeys) {
      const v = savedGraphEnv?.[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    _resetStageGraphForTests();
    __resetGraphCache();
    while (scratch.length > 0) rmSync(scratch.pop()!, { recursive: true, force: true });
  });

  test("bundle, when and required_sections survive compilation", () => {
    savedGraphEnv = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));
    const dir = mkdtempSync(join(tmpdir(), "amadeus-t248-buildstage-"));
    scratch.push(dir);
    const stagesDir = join(dir, "stages");
    cpSync(
      join(REPO_ROOT, "packages/framework/core/amadeus-common/stages"),
      stagesDir,
      { recursive: true },
    );
    const target = join(stagesDir, "construction", "functional-design.md");
    const body = readFileSync(target, "utf-8").replace(
      /\nmode: .*\n/,
      (m) =>
        `${m}bundle: book\nwhen:\n  producer-in-plan: business-rules\nrequired_sections:\n  - Overview\n  - Details\n`,
    );
    writeFileSync(target, body, "utf-8");

    process.env.AMADEUS_STAGES_DIR = stagesDir;
    process.env.AMADEUS_STAGE_GRAPH = join(
      REPO_ROOT,
      "dist/claude/.claude/tools/data/stage-graph.json",
    );
    process.env.AMADEUS_SCOPE_GRID = SCOPE_GRID;
    process.env.AMADEUS_RULES_DIR = join(REPO_ROOT, "amadeus/spaces/default/memory");
    process.env.AMADEUS_SENSORS_DIR = join(REPO_ROOT, "packages/framework/core/sensors");
    _resetStageGraphForTests();
    __resetGraphCache();

    const functional = compileStageGraph().stages.find(
      (stage) => stage.slug === "functional-design",
    );
    expect(functional?.bundle).toBe("book");
    expect(functional?.when).toEqual({ "producer-in-plan": "business-rules" });
    expect(functional?.required_sections).toEqual(["Overview", "Details"]);
  }, 30_000);
});

// In-process twins of the spawn cases above. The subprocess cases pin the
// external CLI contract but the spawn boundary is a Bun-coverage blind spot, so
// these drive the SAME production entries in-process (handleNext / handleAdvance)
// against temp projects to measure the runtime unit-kind readers and the
// kind-aware completion guard. Env is applied to process.env for the call and
// restored, and the stage-graph caches are reset so each case reads its fixture.
describe("t248 kind-aware coverage in-process (spawn-blindspot twins)", () => {
  function withStageEnv<T>(graphPath: string, extra: Record<string, string | undefined>, fn: () => T): T {
    const keys = [
      "AMADEUS_STAGE_GRAPH",
      "AMADEUS_SCOPE_GRID",
      "AMADEUS_SKIP_HUMAN_PRESENCE_GUARD",
      "AMADEUS_SKIP_ARTIFACT_GUARD",
      "AMADEUS_DEFAULT_SCOPE",
      "CLAUDE_PROJECT_DIR",
    ];
    const saved = new Map(keys.map((k) => [k, process.env[k]]));
    process.env.AMADEUS_STAGE_GRAPH = graphPath;
    process.env.AMADEUS_SCOPE_GRID = SCOPE_GRID;
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    delete process.env.AMADEUS_DEFAULT_SCOPE;
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    _resetStageGraphForTests();
    __resetGraphCache();
    try {
      return fn();
    } finally {
      for (const [k, v] of saved) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      _resetStageGraphForTests();
      __resetGraphCache();
    }
  }

  function nextInProcess(project: string, graphPath: string): Record<string, unknown> {
    const originalLog = console.log;
    let stdout = "";
    console.log = (...values: unknown[]) => {
      stdout += `${values.map(String).join(" ")}\n`;
    };
    try {
      withStageEnv(graphPath, { AMADEUS_SKIP_ARTIFACT_GUARD: "1" }, () => {
        handleNext([], project);
      });
    } finally {
      console.log = originalLog;
    }
    return JSON.parse(stdout.trim()) as Record<string, unknown>;
  }

  function advanceInProcess(project: string, graphPath: string): void {
    const originalLog = console.log;
    console.log = () => {};
    try {
      withStageEnv(
        graphPath,
        { CLAUDE_PROJECT_DIR: project, AMADEUS_SKIP_ARTIFACT_GUARD: undefined },
        () => {
          handleAdvance(["functional-design"]);
        },
      );
    } finally {
      console.log = originalLog;
    }
  }

  test("next routes only spec artifacts for a tagged unit in-process", () => {
    const project = seedProject([
      { name: "package", kind: "packaging" },
      { name: "schema", kind: "spec" },
    ]);
    const directive = nextInProcess(project, sourceGraph());
    expect(directive.unit).toBe("schema");
    expect(directive.produces).toHaveLength(2);
  }, 30_000);

  test("next keeps the full matrix for an untagged unit in-process", () => {
    const project = seedProject([{ name: "legacy" }]);
    const directive = nextInProcess(project, sourceGraph());
    expect(directive.produces).toHaveLength(4);
  }, 30_000);

  test("next keeps the full matrix when the runtime kind is malformed in-process", () => {
    const project = seedProject([{ name: "legacy" }]);
    const runtimePath = join(seededRecordDir(project), "runtime-graph.json");
    const graph = JSON.parse(readFileSync(runtimePath, "utf-8"));
    graph.bolt_dag.units[0].kind = "worker";
    writeFileSync(runtimePath, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");
    const directive = nextInProcess(project, sourceGraph());
    expect(directive.produces).toHaveLength(4);
  }, 30_000);

  test("completion guard accepts an all-vacuous packaging stage in-process", () => {
    const project = seedProject([{ name: "package", kind: "packaging" }]);
    expect(() => advanceInProcess(project, sourceGraph())).not.toThrow();
  }, 30_000);

  test("completion guard treats spec artifacts on disk as covered in-process", () => {
    const project = seedProject([
      { name: "package", kind: "packaging" },
      { name: "schema", kind: "spec" },
    ]);
    writeFunctionalArtifacts(project, "schema", ["business-rules", "domain-entities"]);
    expect(() => advanceInProcess(project, sourceGraph())).not.toThrow();
  }, 30_000);

  test("next heals the unit topology from the dependency doc when runtime-graph is missing", () => {
    // Deleting runtime-graph.json forces orderedUnits to heal from the canonical
    // unit-of-work-dependency.md while readUnitKinds's own reader hits its
    // missing-file catch — the runtime kind lookup degrades to kindless.
    const project = seedProject([{ name: "legacy" }]);
    rmSync(join(seededRecordDir(project), "runtime-graph.json"), { force: true });
    const directive = nextInProcess(project, sourceGraph());
    expect(directive.produces).toHaveLength(4);
  }, 30_000);

  test("completion guard falls back to on-disk artifacts when runtime-graph is missing", () => {
    // Missing runtime-graph.json drives the kind-aware reader's missing-file
    // catch (readRuntimeUnitKinds -> null), so the guard falls back to the
    // per-unit construction directories, where the artifacts exist.
    const project = seedProject([{ name: "schema", kind: "spec" }]);
    writeFunctionalArtifacts(project, "schema", ["business-rules", "domain-entities"]);
    rmSync(join(seededRecordDir(project), "runtime-graph.json"), { force: true });
    expect(() => advanceInProcess(project, sourceGraph())).not.toThrow();
  }, 30_000);

  test("completion guard scans past a spec unit with no artifacts to one that has them", () => {
    // Two spec units: the first has NO artifacts on disk (artifactsExistInDir
    // returns false and the scan continues), the second has them (returns true),
    // so the guard is satisfied without erroring.
    const project = seedProject([
      { name: "schema-a", kind: "spec" },
      { name: "schema-b", kind: "spec" },
    ]);
    writeFunctionalArtifacts(project, "schema-b", ["business-rules", "domain-entities"]);
    expect(() => advanceInProcess(project, sourceGraph())).not.toThrow();
  }, 30_000);

  test("report on a per-unit stage with uncovered units emits the coverage-gate error", () => {
    // Drives handleReport's per-unit coverage gate (nextUncoveredUnit): a
    // forward report on functional-design while its spec unit has no artifacts
    // must refuse with the "units not yet complete" error.
    const project = seedProject([{ name: "schema", kind: "spec" }]);
    const originalLog = console.log;
    let stdout = "";
    console.log = (...values: unknown[]) => {
      stdout += `${values.map(String).join(" ")}\n`;
    };
    try {
      withStageEnv(sourceGraph(), { AMADEUS_SKIP_ARTIFACT_GUARD: "1" }, () => {
        handleReport(["--result", "approved"], project);
      });
    } finally {
      console.log = originalLog;
    }
    const directive = JSON.parse(stdout.trim()) as Record<string, unknown>;
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("not yet complete");
  }, 30_000);
});
