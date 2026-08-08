// covers: function:compileStageGraph, subcommand:amadeus-orchestrate:next,
//         function:unitCovered, function:producesArtifactsExist

import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
  requiredArtifactsForUnit,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  _resetStageGraphForTests,
  parseStageFrontmatter,
  type UnitKind,
  UNIT_KINDS,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
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
  // `dependencyDoc: false` omits the committed canonical unit-of-work-dependency.md
  // so a case can drive the state where NEITHER kind source resolves (#2567).
  opts: { dependencyDoc?: boolean } = {},
): string {
  const project = createTestProject();
  projects.push(project);
  if (opts.dependencyDoc !== false) {
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
  }
  writeFileSync(
    seededStateFile(project),
    `# AI-DLC State Tracking

## Project Information
- **Project**: stage contract routing
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on
- **Construction Autonomy Mode**: autonomous

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
  // A unit whose artifacts reached the gate carries its reviewer verdict
  // (#2359). These cases are about kind-aware applicability, so the review is
  // seeded rather than left as a second reason for the guard to refuse.
  const review = "\n## Review — Iteration 1\n\n- **Verdict:** READY\n" +
    "- **Reviewer:** amadeus-architecture-reviewer-agent\n- **Date:** 2026-08-08T00:00:00Z\n" +
    "- **Iteration:** 1\n- **Scope decision:** none\n";
  for (const artifact of artifacts) {
    writeFileSync(join(dir, `${artifact}.md`), `# ${artifact}\n${review}`, "utf-8");
  }
}

function activateStage(project: string, slug: "nfr-requirements" | "nfr-design"): void {
  const statePath = seededStateFile(project);
  let state = readFileSync(statePath, "utf-8").replace(
    "- [-] functional-design — EXECUTE",
    "- [x] functional-design — EXECUTE",
  );
  if (slug === "nfr-design") {
    state = state
      .replace("- [ ] nfr-requirements — EXECUTE", "- [x] nfr-requirements — EXECUTE")
      .replace("- [ ] nfr-design — EXECUTE", "- [-] nfr-design — EXECUTE");
  } else {
    state = state.replace(
      "- [ ] nfr-requirements — EXECUTE",
      "- [-] nfr-requirements — EXECUTE",
    );
  }
  writeFileSync(
    statePath,
    state.replace("- **Current Stage**: functional-design", `- **Current Stage**: ${slug}`),
    "utf-8",
  );
}

function writeStageArtifacts(
  project: string,
  unit: string,
  stage: string,
  artifacts: string[],
): void {
  const dir = join(seededRecordDir(project), "construction", unit, stage);
  mkdirSync(dir, { recursive: true });
  for (const artifact of artifacts) {
    writeFileSync(join(dir, `${artifact}.md`), `# ${artifact}\n`, "utf-8");
  }
}

const ALL_NFR_REQUIREMENTS = [
  "performance-requirements",
  "security-requirements",
  "scalability-requirements",
  "reliability-requirements",
  "tech-stack-decisions",
];

const ALL_NFR_DESIGNS = [
  "performance-design",
  "security-design",
  "scalability-design",
  "reliability-design",
  "logical-components",
];

describe("t248 canonical NFR artifact matrices", () => {
  const stagesDir = join(
    REPO_ROOT,
    "packages/framework/core/amadeus-common/stages",
  );
  const requirements = parseStageFrontmatter(
    readFileSync(join(stagesDir, "construction/nfr-requirements.md"), "utf-8"),
  ) as { produces: string[]; produces_kinds?: Record<string, UnitKind[]> };
  const design = parseStageFrontmatter(
    readFileSync(join(stagesDir, "construction/nfr-design.md"), "utf-8"),
  ) as { produces: string[]; produces_kinds?: Record<string, UnitKind[]> };
  const expected = {
    service: {
      requirements: ALL_NFR_REQUIREMENTS,
      design: ALL_NFR_DESIGNS,
    },
    ui: {
      requirements: [
        "performance-requirements",
        "security-requirements",
        "tech-stack-decisions",
      ],
      design: ["performance-design", "security-design", "logical-components"],
    },
    library: {
      requirements: ["security-requirements", "tech-stack-decisions"],
      design: ["security-design", "logical-components"],
    },
    spec: {
      requirements: ["security-requirements", "tech-stack-decisions"],
      design: ["security-design"],
    },
    packaging: {
      requirements: ["security-requirements", "tech-stack-decisions"],
      design: ["security-design"],
    },
  } as const;

  test.each([...UNIT_KINDS])("routes the canonical NFR output matrix for %s", (kind) => {
    expect(requiredArtifactsForUnit(requirements, kind)).toEqual(expected[kind].requirements);
    expect(requiredArtifactsForUnit(design, kind)).toEqual(expected[kind].design);
  });
});

describe("t248 NFR stage source contracts", () => {
  const stagesDir = join(
    REPO_ROOT,
    "packages/framework/core/amadeus-common/stages",
  );

  test("units-generation requires a canonical kind in planning, prose, and YAML", () => {
    const body = readFileSync(join(stagesDir, "inception/units-generation.md"), "utf-8");
    expect(body).toContain("Every new unit MUST declare exactly one canonical `kind`");
    expect(body).toContain(
      "- name: <unit-name>\n    kind: service\n    depends_on: []",
    );
  });

  test.each(["nfr-requirements", "nfr-design"])(
    "%s generates only directive-listed outputs without placeholders",
    (slug) => {
      const body = readFileSync(join(stagesDir, `construction/${slug}.md`), "utf-8");
      expect(body).toContain("Generate only the applicable output paths listed in the engine directive");
      expect(body).toContain("Do not create N/A placeholders for pruned outputs");
      expect(body).toContain("reference an established decision as `file:line`");
    },
  );

  test("nfr-design reads only present directive consumes", () => {
    const body = readFileSync(join(stagesDir, "construction/nfr-design.md"), "utf-8");
    expect(body).toContain("Read only the present input paths listed in the engine directive's `consumes`");
  });
});

function writeAllNfrDesignInputs(project: string, unit: string): void {
  writeStageArtifacts(project, unit, "nfr-requirements", ALL_NFR_REQUIREMENTS);
  writeStageArtifacts(project, unit, "functional-design", ["business-logic-model"]);
}

function artifactNames(paths: unknown): string[] {
  if (!Array.isArray(paths)) throw new Error("directive paths are not an array");
  return paths.map((path) => String(path).split("/").at(-1)!.replace(/\.md$/, ""));
}

// Each case builds its own fixture project, and the canonical emit path
// registers a Logger Provider for one workspace per process — so the
// registration is dropped between cases, as the provider tests already do.
beforeEach(() => {
  resetOtelPerProject();
});

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

describe("t248 kind-aware consume projection", () => {
  test.each([
    ["service", [...ALL_NFR_REQUIREMENTS, "business-logic-model"]],
    ["ui", ["performance-requirements", "security-requirements", "tech-stack-decisions", "business-logic-model"]],
    ["library", ["security-requirements", "tech-stack-decisions", "business-logic-model"]],
    ["spec", ["security-requirements", "tech-stack-decisions"]],
    ["packaging", ["security-requirements", "tech-stack-decisions"]],
  ] as const)("projects producer applicability into %s NFR Design inputs", (kind, expected) => {
    const project = seedProject([{ name: "unit", kind }]);
    activateStage(project, "nfr-design");
    writeAllNfrDesignInputs(project, "unit");

    const directive = next(project, sourceGraph());

    expect(directive.kind).toBe("run-stage");
    expect(artifactNames(directive.consumes)).toEqual([...expected]);
    expect("consumes_absent" in directive).toBe(false);
  }, 30_000);

  test("covers a library NFR Design with only its two applicable outputs", () => {
    const project = seedProject([{ name: "library", kind: "library" }]);
    activateStage(project, "nfr-design");
    writeAllNfrDesignInputs(project, "library");
    writeStageArtifacts(project, "library", "nfr-design", [
      "security-design",
      "logical-components",
    ]);

    const directive = next(project, sourceGraph());

    expect(directive.unit).toBe("library");
    expect(directive.gate).toBe(true);
  }, 30_000);

  test("falls back only the kindless unit in a valid mixed runtime graph", () => {
    const project = seedProject([
      { name: "library", kind: "library" },
      { name: "z-legacy" },
    ]);
    activateStage(project, "nfr-design");
    writeAllNfrDesignInputs(project, "library");
    writeAllNfrDesignInputs(project, "z-legacy");

    const library = next(project, sourceGraph());
    expect(library.unit).toBe("library");
    expect(artifactNames(library.produces)).toEqual(["security-design", "logical-components"]);
    expect(artifactNames(library.consumes)).toEqual([
      "security-requirements",
      "tech-stack-decisions",
      "business-logic-model",
    ]);
    writeStageArtifacts(project, "library", "nfr-design", [
      "security-design",
      "logical-components",
    ]);

    const legacy = next(project, sourceGraph());
    expect(legacy.unit).toBe("z-legacy");
    expect(artifactNames(legacy.produces)).toEqual(ALL_NFR_DESIGNS);
    expect(artifactNames(legacy.consumes)).toEqual([
      ...ALL_NFR_REQUIREMENTS,
      "business-logic-model",
    ]);
  }, 30_000);

  test("discards every unit kind when one runtime row has an invalid kind", () => {
    const project = seedProject([
      { name: "library", kind: "library" },
      { name: "service", kind: "service" },
    ]);
    activateStage(project, "nfr-design");
    writeAllNfrDesignInputs(project, "library");
    const runtimePath = join(seededRecordDir(project), "runtime-graph.json");
    const graph = JSON.parse(readFileSync(runtimePath, "utf-8"));
    graph.bolt_dag.units[1].kind = "worker";
    writeFileSync(runtimePath, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");

    const directive = next(project, sourceGraph());

    expect(directive.unit).toBe("library");
    expect(artifactNames(directive.produces)).toEqual(ALL_NFR_DESIGNS);
    expect(artifactNames(directive.consumes)).toEqual([
      ...ALL_NFR_REQUIREMENTS,
      "business-logic-model",
    ]);
  }, 30_000);

  test("falls back every NFR Design input when runtime-graph is missing", () => {
    const project = seedProject([{ name: "library", kind: "library" }]);
    activateStage(project, "nfr-design");
    writeAllNfrDesignInputs(project, "library");
    rmSync(join(seededRecordDir(project), "runtime-graph.json"), { force: true });

    const directive = next(project, sourceGraph());

    expect(artifactNames(directive.produces)).toEqual(ALL_NFR_DESIGNS);
    expect(artifactNames(directive.consumes)).toEqual([
      ...ALL_NFR_REQUIREMENTS,
      "business-logic-model",
    ]);
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

  // An absent primary artifact reads the same as an unreviewed one, and it
  // reaches the check through a different door: artifactCarriesReview cannot
  // open the file at all.
  //
  // The proposition this pins is narrower than it first looked (#2567): it holds
  // only when the unit's kind is unresolved at BOTH points — emit and gate. Then
  // the directive `scope` required was the unpruned matrix, so the reviewer's
  // primary and this guard's primary are the same file, and its absence really
  // does mean the unit was never reviewed. Both sources are removed here to hold
  // that state: no runtime-graph.json AND no canonical unit-of-work-dependency.md.
  // With either source present the kinds agree at both points and the pruned
  // arms below apply instead.
  test("completion guard refuses when the primary artifact is absent entirely", () => {
    const project = seedProject([{ name: "schema", kind: "spec" }], {
      dependencyDoc: false,
    });
    // Secondary artifacts only, each carrying a review the reviewer never wrote
    // there — the primary (business-logic-model, applicable because the kindless
    // fallback widens the set) is the one that is missing.
    writeFunctionalArtifacts(project, "schema", ["business-rules", "domain-entities"]);
    rmSync(join(seededRecordDir(project), "runtime-graph.json"), { force: true });

    const originalExit = process.exit;
    const originalError = console.error;
    let stderr = "";
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    console.error = (...args: unknown[]) => {
      stderr += args.map(String).join(" ");
    };
    try {
      expect(() => advanceInProcess(project, sourceGraph())).toThrow(/exit 1/);
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
    expect(stderr).toContain("no reviewer verdict recorded");
  }, 30_000);

  test("completion guard falls back to on-disk artifacts when runtime-graph is missing", () => {
    // Missing runtime-graph.json drives the kind-aware reader's missing-file
    // catch (readRuntimeUnitKinds -> null), so the guard falls back to the
    // per-unit construction directories, where the artifacts exist.
    const project = seedProject([{ name: "schema", kind: "spec" }]);
    // All three: without the runtime graph the unit's kind is unknown, so every
    // declared artifact is applicable — including the primary one the reviewer
    // writes its verdict to (#2359).
    writeFunctionalArtifacts(project, "schema", [
      "business-logic-model",
      "business-rules",
      "domain-entities",
    ]);
    rmSync(join(seededRecordDir(project), "runtime-graph.json"), { force: true });
    expect(() => advanceInProcess(project, sourceGraph())).not.toThrow();
  }, 30_000);

  // The refusal itself, driven in-process. The spawned arms above cross a
  // process boundary bun's coverage cannot see, so the branch that names the
  // unreviewed units would otherwise never register as executed (#2359).
  // `error()` ends the CLI through process.exit, so that is stubbed into a
  // throw for the duration of the call.
  test("completion guard refuses a unit whose artifacts carry no review in-process", () => {
    const project = seedProject([{ name: "schema", kind: "spec" }]);
    const dir = join(seededRecordDir(project), "construction", "schema", "functional-design");
    mkdirSync(dir, { recursive: true });
    for (const artifact of ["business-rules", "domain-entities"]) {
      writeFileSync(join(dir, `${artifact}.md`), `# ${artifact}\n`, "utf-8");
    }

    const originalExit = process.exit;
    const originalError = console.error;
    let stderr = "";
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    console.error = (...args: unknown[]) => {
      stderr += args.map(String).join(" ");
    };
    try {
      expect(() => advanceInProcess(project, sourceGraph())).toThrow(/exit 1/);
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
    expect(stderr).toContain("no reviewer verdict recorded");
    expect(stderr).toContain("schema");
  }, 30_000);

  // --- Canonical kind fallback for the review gate (#2567) ------------------
  //
  // The reviewer writes its verdict to the primary of the KIND-PRUNED produces
  // it was handed at emit time; this guard used to pick the primary of the
  // UNPRUNED produces whenever the runtime graph could not name the kind, so it
  // read a different file and refused a unit that was reviewed. These arms hold
  // the three ways the runtime graph fails to name a kind while the committed
  // unit-of-work-dependency.md still does. Each was red before the fallback
  // landed ("no reviewer verdict recorded" naming `schema`) and is green after.
  // `error()` ends the CLI through process.exit; stubbing it into a throw keeps a
  // refusal inside the test instead of killing the runner, so an arm that is
  // expected to pass reports its refusal message as a failed assertion.
  function advanceCapturingExit(
    project: string,
    graphPath: string,
  ): { refused: boolean; stderr: string } {
    const originalExit = process.exit;
    const originalError = console.error;
    let stderr = "";
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    console.error = (...args: unknown[]) => {
      stderr += args.map(String).join(" ");
    };
    try {
      advanceInProcess(project, graphPath);
      return { refused: false, stderr };
    } catch (e) {
      if (!/exit 1/.test(String(e))) throw e;
      return { refused: true, stderr };
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
  }

  function expectAdvanceAccepted(project: string, graphPath: string): void {
    // One workspace per process is an OTel bootstrap invariant; an arm that
    // drives two temp projects resets the per-project state between them.
    resetOtelPerProject();
    const outcome = advanceCapturingExit(project, graphPath);
    expect(outcome.stderr).toBe("");
    expect(outcome.refused).toBe(false);
  }

  function expectAdvanceRefusal(project: string, graphPath: string): string {
    resetOtelPerProject();
    const outcome = advanceCapturingExit(project, graphPath);
    expect(outcome.refused).toBe(true);
    return outcome.stderr;
  }

  function seedReviewedSpecUnit(mutate: (runtimePath: string) => void): string {
    const project = seedProject([{ name: "schema", kind: "spec" }]);
    // Exactly the spec-applicable set. business-logic-model is NOT applicable to
    // a spec unit, so the reviewer never saw it and it is absent on disk.
    writeFunctionalArtifacts(project, "schema", ["business-rules", "domain-entities"]);
    mutate(join(seededRecordDir(project), "runtime-graph.json"));
    return project;
  }

  test("completion guard resolves the unit kind from the dependency doc when runtime-graph is missing", () => {
    const project = seedReviewedSpecUnit((path) => rmSync(path, { force: true }));
    expectAdvanceAccepted(project, sourceGraph());
  }, 30_000);

  test("completion guard resolves the unit kind from the dependency doc when the runtime row omits kind", () => {
    const project = seedReviewedSpecUnit((path) => {
      const graph = JSON.parse(readFileSync(path, "utf-8"));
      delete graph.bolt_dag.units[0].kind;
      writeFileSync(path, `${JSON.stringify(graph, null, 2)}\n`, "utf-8");
    });
    expectAdvanceAccepted(project, sourceGraph());
  }, 30_000);

  test("completion guard resolves the unit kind from the dependency doc when the runtime graph has no bolt_dag", () => {
    const project = seedReviewedSpecUnit((path) => {
      writeFileSync(
        path,
        `${JSON.stringify({ bolt_dag_absence: { reason: "units-pending" } }, null, 2)}\n`,
        "utf-8",
      );
    });
    expectAdvanceAccepted(project, sourceGraph());
  }, 30_000);

  test("completion guard accepts a service unit whose declared-first primary carries the review", () => {
    // Non-regression control: for a service unit the pruned and unpruned primary
    // are the same file (business-logic-model), so the fallback changes nothing —
    // green with the runtime graph and green without it.
    const withGraph = seedProject([{ name: "schema", kind: "service" }]);
    writeFunctionalArtifacts(withGraph, "schema", [
      "business-logic-model",
      "business-rules",
      "domain-entities",
    ]);
    expectAdvanceAccepted(withGraph, sourceGraph());

    const withoutGraph = seedProject([{ name: "schema", kind: "service" }]);
    writeFunctionalArtifacts(withoutGraph, "schema", [
      "business-logic-model",
      "business-rules",
      "domain-entities",
    ]);
    rmSync(join(seededRecordDir(withoutGraph), "runtime-graph.json"), { force: true });
    expectAdvanceAccepted(withoutGraph, sourceGraph());
  }, 30_000);

  test("completion guard still refuses when only a secondary artifact carries a review", () => {
    // The primary-only invariant is untouched by the fallback: a heading on a
    // secondary file was not written by `complete-review`, whichever source named
    // the kind. Held on both surfaces — runtime graph present, and absent so the
    // canonical doc supplies the same kind.
    const seed = (dropGraph: boolean): string => {
      const project = seedProject([{ name: "schema", kind: "spec" }]);
      // Primary (business-rules) exists WITHOUT a review; the review sits on the
      // secondary (domain-entities) where a hand could have placed it.
      writeStageArtifacts(project, "schema", "functional-design", ["business-rules"]);
      writeFunctionalArtifacts(project, "schema", ["domain-entities"]);
      if (dropGraph) {
        rmSync(join(seededRecordDir(project), "runtime-graph.json"), { force: true });
      }
      return project;
    };
    expect(expectAdvanceRefusal(seed(false), sourceGraph())).toContain(
      "no reviewer verdict recorded",
    );
    expect(expectAdvanceRefusal(seed(true), sourceGraph())).toContain(
      "no reviewer verdict recorded",
    );
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
      withStageEnv(
        sourceGraph(),
        { CLAUDE_PROJECT_DIR: project, AMADEUS_SKIP_ARTIFACT_GUARD: "1" },
        () => {
          handleReport(["--result", "approved"], project);
        },
      );
    } finally {
      console.log = originalLog;
    }
    const directive = JSON.parse(stdout.trim()) as Record<string, unknown>;
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("not yet complete");
  }, 30_000);

  // Issue #2586. The approve-time coverage guard used to run ONLY when a
  // compiled Bolt DAG existed, so every scope that SKIPs units-generation
  // (fix / refactor / security-patch / infra / poc) could complete a per-unit
  // stage with a unit directory still empty. These cases drive the same disk
  // listing the degrade path of `next` already iterates, so the two agree on
  // what "every unit is done" means.
  function reportApproved(
    project: string,
    graphPath: string,
  ): Record<string, unknown> {
    const originalLog = console.log;
    let stdout = "";
    console.log = (...values: unknown[]) => {
      stdout += `${values.map(String).join(" ")}\n`;
    };
    try {
      withStageEnv(
        graphPath,
        { CLAUDE_PROJECT_DIR: project, AMADEUS_SKIP_ARTIFACT_GUARD: "1" },
        () => {
          // --stage is explicit so the seeded in-progress checkbox is a
          // recoverable gate rather than the "report the acted directive
          // explicitly" refusal: without it every case below would stop on that
          // earlier error and prove nothing about the coverage guard.
          handleReport(
            ["--result", "approved", "--stage", "functional-design"],
            project,
          );
        },
      );
    } finally {
      console.log = originalLog;
    }
    return JSON.parse(stdout.trim().split("\n")[0]) as Record<string, unknown>;
  }

  // A record with NO compiled unit DAG: neither the runtime snapshot's bolt_dag
  // nor the canonical unit-of-work-dependency.md is present, so orderedUnits()
  // returns [] and the construction/ listing is the only unit ledger there is.
  function seedDegradeProject(): string {
    const project = seedProject([], { dependencyDoc: false });
    rmSync(join(seededRecordDir(project), "runtime-graph.json"), { force: true });
    return project;
  }

  const DEGRADE_REQUIRED = [
    "business-logic-model",
    "business-rules",
    "domain-entities",
  ];

  test("report refuses a degrade per-unit stage while a unit directory is uncovered", () => {
    const project = seedDegradeProject();
    writeFunctionalArtifacts(project, "unit-a", DEGRADE_REQUIRED);
    mkdirSync(
      join(seededRecordDir(project), "construction", "unit-b", "functional-design"),
      { recursive: true },
    );
    const directive = reportApproved(project, sourceGraph());
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("not yet complete");
    expect(String(directive.message)).toContain("unit-b");
  }, 30_000);

  test("report accepts a degrade per-unit stage once every unit directory is covered", () => {
    const project = seedDegradeProject();
    writeFunctionalArtifacts(project, "unit-a", DEGRADE_REQUIRED);
    writeFunctionalArtifacts(project, "unit-b", DEGRADE_REQUIRED);
    const directive = reportApproved(project, sourceGraph());
    // Passing the guard is proven positively: the report reached the state
    // commit (whose own fixture-level validation is not what these cases are
    // about) instead of stopping at the coverage refusal.
    expect(String(directive.message ?? "")).not.toContain("not yet complete");
    expect(String(directive.message ?? "")).toContain("amadeus-state.ts approve");
  }, 30_000);

  test("report accepts a single covered degrade unit (the common fix-scope shape)", () => {
    const project = seedDegradeProject();
    writeFunctionalArtifacts(project, "only-unit", DEGRADE_REQUIRED);
    const directive = reportApproved(project, sourceGraph());
    // Passing the guard is proven positively: the report reached the state
    // commit (whose own fixture-level validation is not what these cases are
    // about) instead of stopping at the coverage refusal.
    expect(String(directive.message ?? "")).not.toContain("not yet complete");
    expect(String(directive.message ?? "")).toContain("amadeus-state.ts approve");
  }, 30_000);

  test("report leaves a degrade record with no unit directory unguarded", () => {
    // Nothing on disk to judge: the listing is the ledger, and an empty ledger
    // proves nothing, so this stays exactly as unguarded as it was before #2586
    // rather than becoming an unopenable refusal.
    const project = seedDegradeProject();
    const directive = reportApproved(project, sourceGraph());
    // Passing the guard is proven positively: the report reached the state
    // commit (whose own fixture-level validation is not what these cases are
    // about) instead of stopping at the coverage refusal.
    expect(String(directive.message ?? "")).not.toContain("not yet complete");
    expect(String(directive.message ?? "")).toContain("amadeus-state.ts approve");
  }, 30_000);
});
