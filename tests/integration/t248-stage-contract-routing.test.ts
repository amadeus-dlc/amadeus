// covers: function:compileStageGraph, subcommand:amadeus-orchestrate:next,
//         function:unitCovered, function:producesArtifactsExist

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
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
