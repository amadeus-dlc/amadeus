// covers: file:plugins/github-pr-convergence/plugin.json, file:plugins/github-pr-convergence/stages/pr-convergence.md,
//         file:packages/framework/core/tools/amadeus-plugin-compose.ts, subcommand:amadeus-orchestrate:next
// size: medium
//
// U3 packaging E2E (NFR-1). The REAL `pr-convergence` bundle — the shipped
// plugin.json, the shipped stage body, the shipped tools — composed into a
// temp host built from the real core, then driven through the engine:
//
//   install   -> the real `code-generation` frontmatter gains the
//                `pr-convergence-report` produces entry and the compiled graph
//                carries it (FR-2a/2b), and the plugin's own stage compiles
//                with its declared sensor resolved (FR-6b, ADR-5).
//   guard     -> a unit whose two stock artifacts exist but whose convergence
//                report does NOT is still uncovered: `next` re-offers the SAME
//                batch. Writing the report advances it. This is the falling
//                evidence for NFR-1 — the guard is untouched core, fed data.
//   uninstall -> `drop` restores the stage file byte-identically and the
//                compiled produces returns to the stock pair (FR-1b).
//   control   -> without compose, the same host's produces is unchanged
//                (FR-1a, the "not installed" half of the two-sided proof).
//
// Touches a real filesystem and the real compiler, hence the integration tier
// (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  inspectPlugin,
  parseStageFrontmatter,
  planPluginDrop,
  recordPluginDrops,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  handlePluginCli,
  listHarnessTrees,
  listPluginSourceDirs,
  type PluginCliDeps,
  stagingEntryState,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";
import {
  __resetGraphCache,
  compileStageGraph,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  deliveryEvidenceCoverageRefusal,
  handleNext,
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { projectDeliveryBoltPlan } from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";

function deliveryRefusal(
  project: string,
  node: Parameters<typeof deliveryEvidenceCoverageRefusal>[1],
): string | null {
  return deliveryEvidenceCoverageRefusal(
    project,
    node,
    readFileSync(seededStateFile(project), "utf-8"),
  );
}

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_ROOT = join(REPO_ROOT, "packages", "framework", "core");
const PLUGIN_SRC = join(REPO_ROOT, "plugins", "github-pr-convergence");
const PLUGIN = "github-pr-convergence";
const STAGE_SLUG = "pr-convergence";
const SEAM_ENTRY = "pr-convergence-report";
const STAGE_REL = "amadeus-common/stages/construction/code-generation.md";
const STOCK_PRODUCES = ["code-generation-plan", "code-summary"];

const GRAPH_ENV_KEYS = [
  "AMADEUS_STAGES_DIR",
  "AMADEUS_STAGE_GRAPH",
  "AMADEUS_SCOPE_GRID",
  "AMADEUS_RULES_DIR",
  "AMADEUS_SENSORS_DIR",
  "AMADEUS_PLUGINS_HOST_ROOT",
  "AMADEUS_SKIP_ARTIFACT_GUARD",
  "AMADEUS_SKIP_HUMAN_PRESENCE_GUARD",
  "AMADEUS_DEFAULT_SCOPE",
  "CLAUDE_PROJECT_DIR",
] as const;

let host = "";
let saved: Record<string, string | undefined> = {};
const projects: string[] = [];
const out: string[] = [];
const err: string[] = [];

function deps(): PluginCliDeps {
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (root) => createNodeBackend(root),
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t449-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    listHarnessTrees,
    listPluginSourceDirs,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

/** Point the compiler at the temp host, with the plugin host root and sensor
 *  registry both resolved inside it, and compile from a cold cache. */
function compileFromHost(): ReturnType<typeof compileStageGraph> {
  process.env.AMADEUS_STAGES_DIR = join(host, "amadeus-common", "stages");
  process.env.AMADEUS_SENSORS_DIR = join(host, "sensors");
  process.env.AMADEUS_PLUGINS_HOST_ROOT = host;
  process.env.AMADEUS_RULES_DIR = join(REPO_ROOT, "amadeus", "spaces", "default", "memory");
  delete process.env.AMADEUS_STAGE_GRAPH;
  _resetStageGraphForTests();
  __resetGraphCache();
  return compileStageGraph();
}

function producesOfCodeGeneration(): readonly string[] {
  const stage = compileFromHost().stages.find((s) => s.slug === "code-generation");
  expect(stage).toBeDefined();
  return stage?.produces ?? [];
}

/** Persist the compiled graph + grid so `handleNext` reads THIS host's contract. */
function pinCompiledGraph(): void {
  const compiled = compileFromHost();
  const graphPath = join(host, "stage-graph.json");
  const gridPath = join(host, "scope-grid.json");
  writeFileSync(graphPath, compiled.json);
  writeFileSync(gridPath, compiled.gridJson);
  // The engine reads the pinned JSON from here on; the source walk is done.
  delete process.env.AMADEUS_STAGES_DIR;
  delete process.env.AMADEUS_PLUGINS_HOST_ROOT;
  process.env.AMADEUS_STAGE_GRAPH = graphPath;
  process.env.AMADEUS_SCOPE_GRID = gridPath;
  process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
  delete process.env.AMADEUS_DEFAULT_SCOPE;
  _resetStageGraphForTests();
  __resetGraphCache();
}

function autonomousCodegenState(scope = "feature"): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: pr-convergence packaging e2e
- **Project Type**: Greenfield
- **Scope**: ${scope}
- **State Version**: 7
- **Skeleton Stance**: on
- **Intent Autonomy Mode**: full
- **Construction Autonomy Mode**: autonomous

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
`;
}

function seedProject(batches: string[][], scope = "feature"): string {
  const proj = createTestProject();
  projects.push(proj);
  writeFileSync(seededStateFile(proj), autonomousCodegenState(scope));
  const dependencyDir = join(seededRecordDir(proj), "inception", "units-generation");
  mkdirSync(dependencyDir, { recursive: true });
  const units = batches.flatMap((batch, i) =>
    batch.map((name) => ({ name, depends_on: i === 0 ? [] : batches[i - 1]! })),
  );
  writeFileSync(
    join(dependencyDir, "unit-of-work-dependency.md"),
    `# Unit dependencies\n\n\`\`\`yaml\nunits:\n${units
      .map((u) => `  - name: ${u.name}\n    depends_on: [${u.depends_on.join(", ")}]`)
      .join("\n")}\n\`\`\`\n`,
  );
  writeFileSync(
    join(seededRecordDir(proj), "runtime-graph.json"),
    JSON.stringify({ bolt_dag: { units: batches.flat().map((n) => ({ name: n, depends_on: [] })), batches } }, null, 2),
  );
  return proj;
}

function writeUnitArtifacts(proj: string, unit: string, names: readonly string[]): void {
  const dir = join(seededRecordDir(proj), "construction", unit, "code-generation");
  mkdirSync(dir, { recursive: true });
  for (const name of names) writeFileSync(join(dir, `${name}.md`), `# ${name} for ${unit}\n`);
}

function seedDeliveryCarrier(
  proj: string,
  units: readonly string[],
  mode: "valid" | "empty" | "nonobject" | "stale" | "mismatch" = "valid",
): void {
  const record = seededRecordDir(proj);
  const planDir = join(record, "inception", "delivery-planning");
  mkdirSync(planDir, { recursive: true });
  const plan = `## Bolt delivery\n\n- **Units:** ${units.map((unit) => `\`${unit}\``).join(", ")}\n`;
  writeFileSync(join(planDir, "bolt-plan.md"), plan);
  const projected = projectDeliveryBoltPlan(plan);
  if (!projected.ok) throw new Error(projected.message);
  const graphPath = join(record, "runtime-graph.json");
  const graph = JSON.parse(readFileSync(graphPath, "utf-8")) as Record<string, unknown>;
  graph.delivery_bolts = mode === "nonobject"
    ? null
    : mode === "empty"
    ? { ...projected.projection, bolts: [] }
    : mode === "mismatch"
      ? { ...projected.projection, bolts: [{ bolt: "delivery", units: [...units, "foreign"] }] }
      : projected.projection;
  writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
  if (mode === "stale") writeFileSync(join(planDir, "bolt-plan.md"), `${plan}\n<!-- changed -->\n`);
}

function runNext(proj: string): Record<string, unknown> {
  let raw = "";
  const log = spyOn(console, "log").mockImplementation((v) => {
    raw = String(v);
  });
  try {
    handleNext([], proj);
  } finally {
    log.mockRestore();
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

function runReport(proj: string): Record<string, unknown> {
  let raw = "";
  const log = spyOn(console, "log").mockImplementation((value) => {
    raw = String(value);
  });
  try {
    handleReport(["--stage", "code-generation", "--result", "completed"], proj);
  } finally {
    log.mockRestore();
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

beforeEach(() => {
  // Each case builds its own fixture project, and the canonical emit path
  // registers a Logger Provider for one workspace per process — so the
  // registration is dropped between cases, as the sibling engine suites do.
  resetOtelPerProject();
  saved = Object.fromEntries(GRAPH_ENV_KEYS.map((k) => [k, process.env[k]]));
  host = mkdtempSync(join(tmpdir(), "amadeus-t449-"));
  for (const name of readdirSync(CORE_ROOT)) cpSync(join(CORE_ROOT, name), join(host, name), { recursive: true });
  // The REAL bundle, staged where the CLI discovers plugin sources.
  cpSync(PLUGIN_SRC, join(host, ".amadeus-plugin-src", PLUGIN), { recursive: true });
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  for (const k of GRAPH_ENV_KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetStageGraphForTests();
  __resetGraphCache();
  while (projects.length > 0) cleanupTestProject(projects.pop());
  rmSync(host, { recursive: true, force: true });
});

describe("t449 the real bundle is installable (FR-1a, NFR-4 precondition)", () => {
  test("the shipped manifest inspects ready against the real host", () => {
    const discovered = discoverPlugins(join(host, ".amadeus-plugin-src"));
    expect(discovered.map((p) => p.name)).toEqual([PLUGIN]);
    const result = inspectPlugin(discovered[0], buildHostSnapshot(host, createNodeBackend(host)));
    expect(result.kind === "ready" ? "ready" : JSON.stringify(result)).toBe("ready");
  });

  test("the plugin stage leaves scope assignment to the host", () => {
    const parsed = parseStageFrontmatter(readFileSync(join(PLUGIN_SRC, "stages", "pr-convergence.md")));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.slug).toBe(STAGE_SLUG);
    expect(parsed.value.seams.sensors).toEqual(["pr-convergence-report-format"]);
    expect(existsSync(join(PLUGIN_SRC, "tools", "amadeus-sensor-pr-convergence-report-format.ts"))).toBe(true);
  });

  test("the shipped host binds PR convergence to every self scope", () => {
    const config = JSON.parse(readFileSync(join(REPO_ROOT, "amadeus", "config.json"), "utf8")) as {
      plugin?: { "scope-bindings"?: Record<string, Record<string, string[]>> };
    };
    const bindings = config.plugin?.["scope-bindings"];
    const selfScopes = ["self-document", "self-feature", "self-fix", "self-refactor"];

    expect(bindings?.[PLUGIN]?.[STAGE_SLUG]).toEqual(selfScopes);
  });
});

describe("t449 install overlays the guard's produces (FR-2a/2b, ADR-5)", () => {
  test("un-installed: the stock produces pair is all there is (FR-1a control)", () => {
    expect(producesOfCodeGeneration()).toEqual(STOCK_PRODUCES);
  });

  test("installed: the compiled code-generation produces carries the report", () => {
    const before = readFileSync(join(host, STAGE_REL));
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(producesOfCodeGeneration()).toEqual([...STOCK_PRODUCES, SEAM_ENTRY]);
    // The only changed bytes are the plugin-owned produces and sensor lines.
    const after = readFileSync(join(host, STAGE_REL)).toString("utf-8");
    expect(after).toBe(
      before.toString("utf-8")
        .replace("  - code-summary\n", `  - code-summary\n  - ${SEAM_ENTRY}\n`)
        .replace("  - self-scope-consistency\n", "  - self-scope-consistency\n  - pr-convergence-report-format\n"),
    );
  });

  test("installed: the plugin sensor is owned and bound to both delivery stages", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const stage = compileFromHost().stages.find((s) => s.slug === STAGE_SLUG);
    expect(stage).toBeDefined();
    expect(stage?.scopes ?? []).toEqual([]);
    expect(stage?.sensors_applicable?.map((s) => [s.id, s.severity])).toContainEqual([
      "pr-convergence-report-format", "blocking",
    ]);
    expect(existsSync(join(host, "sensors", "amadeus-pr-convergence-report-format.md"))).toBe(true);
    const codeGeneration = compileFromHost().stages.find((s) => s.slug === "code-generation");
    expect(codeGeneration?.sensors_applicable?.map((s) => [s.id, s.severity])).toContainEqual([
      "pr-convergence-report-format", "blocking",
    ]);
  });

  test("the plugin-owned sensor tool remains available after compose", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(existsSync(join(host, "plugins", PLUGIN, "tools", "amadeus-sensor-pr-convergence-report-format.ts"))).toBe(
      true,
    );
    expect(() => compileFromHost()).not.toThrow();
  });
});

describe("t449 the guard consumes the overlay (NFR-1 falling evidence)", () => {
  test("a unit with the stock artifacts but NO report stays uncovered", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    pinCompiledGraph();
    const proj = seedProject([["alpha"], ["beta"]]);
    writeUnitArtifacts(proj, "alpha", STOCK_PRODUCES);
    // Under the stock contract alpha would be covered and batch 2 offered. With
    // the overlay it is not: the SAME batch comes back.
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["alpha"]);
  });

  test("writing the convergence report advances the batch", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    pinCompiledGraph();
    const proj = seedProject([["alpha"], ["beta"]]);
    writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
  });

  test("without the overlay the same fixture advances on the stock pair alone", () => {
    // The control for the case above: identical project, un-composed contract.
    pinCompiledGraph();
    const proj = seedProject([["alpha"], ["beta"]]);
    writeUnitArtifacts(proj, "alpha", STOCK_PRODUCES);
    const directive = runNext(proj);
    expect(directive.kind).toBe("invoke-swarm");
    expect(directive.units).toEqual(["beta"]);
  });

  test("the report path the guard resolves is the per-unit code-generation path", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    pinCompiledGraph();
    const proj = seedProject([["alpha"], ["beta"]]);
    writeUnitArtifacts(proj, "alpha", STOCK_PRODUCES);
    // Placing the report anywhere else does NOT satisfy the guard.
    mkdirSync(join(seededRecordDir(proj), "construction", "alpha"), { recursive: true });
    writeFileSync(join(seededRecordDir(proj), "construction", "alpha", `${SEAM_ENTRY}.md`), "# misplaced\n");
    expect(runNext(proj).units).toEqual(["alpha"]);
    writeUnitArtifacts(proj, "alpha", [SEAM_ENTRY]);
    expect(runNext(proj).units).toEqual(["beta"]);
  });

  test("code-generation completion rejects one missing owner projection", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    pinCompiledGraph();
    const proj = seedProject([["alpha", "beta"]], "self-fix");
    seedDeliveryCarrier(proj, ["alpha", "beta"]);
    writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
    writeUnitArtifacts(proj, "beta", STOCK_PRODUCES);

    const directive = runReport(proj);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("DELIVERY_EVIDENCE_INCOMPLETE");
    expect(String(directive.message)).toContain("beta");
  });

  test("code-generation completion passes the owner-evidence guard when every Unit is covered", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const codeGeneration = compileFromHost().stages.find((stage) => stage.slug === "code-generation");
    expect(codeGeneration).toBeDefined();
    pinCompiledGraph();
    const proj = seedProject([["alpha", "beta"]], "self-fix");
    seedDeliveryCarrier(proj, ["alpha", "beta"]);
    writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
    writeUnitArtifacts(proj, "beta", [...STOCK_PRODUCES, SEAM_ENTRY]);

    expect(deliveryRefusal(proj, codeGeneration!)).toBeNull();
    const directive = runReport(proj);
    expect(String(directive.message ?? "")).not.toContain("DELIVERY_EVIDENCE_INCOMPLETE");
  });

  test("code-generation completion rejects a missing multi-Unit Delivery Bolt carrier", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const codeGeneration = compileFromHost().stages.find((stage) => stage.slug === "code-generation");
    expect(codeGeneration).toBeDefined();
    pinCompiledGraph();
    const proj = seedProject([["alpha", "beta"]], "self-fix");
    writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
    writeUnitArtifacts(proj, "beta", [...STOCK_PRODUCES, SEAM_ENTRY]);

    expect(deliveryRefusal(proj, codeGeneration!))
      .toContain("DELIVERY_EVIDENCE_CARRIER_MISSING");
  });

  const carrierCases = [
    ["empty", "INVALID"],
    ["nonobject", "INVALID"],
    ["stale", "STALE"],
    ["mismatch", "MISMATCH"],
  ] as const;
  for (const [mode, expectedCode] of carrierCases) {
    test(`code-generation completion rejects a ${mode} Delivery Bolt carrier`, () => {
      expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
      const codeGeneration = compileFromHost().stages.find((stage) => stage.slug === "code-generation");
      expect(codeGeneration).toBeDefined();
      pinCompiledGraph();
      const proj = seedProject([["alpha", "beta"]], "self-fix");
      seedDeliveryCarrier(proj, ["alpha", "beta"], mode);
      writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
      writeUnitArtifacts(proj, "beta", [...STOCK_PRODUCES, SEAM_ENTRY]);

      expect(deliveryRefusal(proj, codeGeneration!))
        .toStartWith(`DELIVERY_EVIDENCE_CARRIER_${expectedCode}:`);
    });
  }

  test("singleton completion rejects absent Delivery Bolt authority", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const codeGeneration = compileFromHost().stages.find((stage) => stage.slug === "code-generation");
    expect(codeGeneration).toBeDefined();
    pinCompiledGraph();
    const proj = seedProject([["alpha"]], "self-fix");
    writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
    expect(deliveryRefusal(proj, codeGeneration!))
      .toContain("DELIVERY_EVIDENCE_CARRIER_MISSING");
  });

  test("singleton completion accepts an approved Delivery Bolt carrier", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const codeGeneration = compileFromHost().stages.find((stage) => stage.slug === "code-generation");
    expect(codeGeneration).toBeDefined();
    pinCompiledGraph();
    const proj = seedProject([["alpha"]], "self-fix");
    seedDeliveryCarrier(proj, ["alpha"]);
    writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
    expect(deliveryRefusal(proj, codeGeneration!)).toBeNull();
  });

  test("full autonomy resumes a covered 2U/1B delivery without a human PR choice", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    pinCompiledGraph();
    const proj = seedProject([["alpha", "beta"]], "self-fix");
    seedDeliveryCarrier(proj, ["alpha", "beta"]);
    writeUnitArtifacts(proj, "alpha", [...STOCK_PRODUCES, SEAM_ENTRY]);
    writeUnitArtifacts(proj, "beta", [...STOCK_PRODUCES, SEAM_ENTRY]);

    const directive = runNext(proj);
    expect(directive.kind).toBe("run-stage");
    expect(directive.review_only).toBe(true);
    expect(JSON.stringify(directive).toLowerCase()).not.toContain("pull request");
  });
});

describe("t449 uninstall is byte-identical and total (FR-1b)", () => {
  test("drop restores the stage file and the compiled produces", () => {
    const before = readFileSync(join(host, STAGE_REL));
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(readFileSync(join(host, STAGE_REL)).equals(before)).toBe(false);

    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(0);
    expect(readFileSync(join(host, STAGE_REL)).equals(before)).toBe(true);
    expect(producesOfCodeGeneration()).toEqual(STOCK_PRODUCES);
    expect(existsSync(join(host, "sensors", "amadeus-pr-convergence-report-format.md"))).toBe(false);
    expect(compileFromHost().stages.some((s) => s.slug === STAGE_SLUG)).toBe(false);
  });

  test("after a drop the guard is back to the stock pair", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(0);
    pinCompiledGraph();
    const proj = seedProject([["alpha"], ["beta"]]);
    writeUnitArtifacts(proj, "alpha", STOCK_PRODUCES);
    expect(runNext(proj).units).toEqual(["beta"]);
  });
});
