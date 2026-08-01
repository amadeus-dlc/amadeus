// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// u4-tools-distribution (FR-A3 / FR-B1) — the real-filesystem proof that a
// composed plugin carries its executables into the harness tree it lands in,
// that a drop takes them away again, and that `compose --all-harnesses` fans the
// same single-tree compose across every detected harness tree with a fail-closed
// aggregate. Touches a real temp filesystem and spawns bun, hence the
// integration tier (fs-tests-integration-first).
//
// The self-sufficiency case is the acceptance criterion itself: after compose,
// `bun <tree>/plugins/<name>/tools/run.ts` runs from the composed copy alone.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  inspectPlugin,
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
  PLUGIN_SOURCE_DIR_NAME,
  resolveHarnessToolsDir,
  stagingEntryState,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const PLUGIN = "tooled";
const STAGE_REL = `plugins/${PLUGIN}/stages/${PLUGIN}.md`;
const RUN_REL = `plugins/${PLUGIN}/tools/run.ts`;
const HELPER_REL = `plugins/${PLUGIN}/tools/helper.ts`;

const STAGE_BODY = [
  "---",
  `slug: ${PLUGIN}`,
  "phase: construction",
  "execution: CONDITIONAL",
  "condition: Opt-in test stage.",
  "lead_agent: amadeus-developer-agent",
  "support_agents: []",
  "mode: inline",
  "produces: []",
  "consumes: []",
  "requires_stage: []",
  "inputs: none",
  "outputs: none",
  "scopes: []",
  "---",
  "",
  "# Tooled Stage",
  "",
].join("\n");

const RUN_BODY = 'import { label } from "./helper.ts";\nconsole.log(`tooled:${label}`);\n';
const HELPER_BODY = 'export const label = "ok";\n';

let project = "";
const out: string[] = [];
const err: string[] = [];

// Write the authoring source a user would point `install` at.
function writeAuthoringSource(root: string): string {
  const src = join(root, "plugins", PLUGIN);
  mkdirSync(join(src, "stages"), { recursive: true });
  mkdirSync(join(src, "tools"), { recursive: true });
  writeFileSync(
    join(src, "plugin.json"),
    `${JSON.stringify(
      {
        name: PLUGIN,
        stages: [{ slug: PLUGIN, path: `stages/${PLUGIN}.md` }],
        seams: [],
        fragments: [],
        tools: ["tools/run.ts", "tools/helper.ts"],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(src, "stages", `${PLUGIN}.md`), STAGE_BODY);
  writeFileSync(join(src, "tools", "run.ts"), RUN_BODY);
  writeFileSync(join(src, "tools", "helper.ts"), HELPER_BODY);
  return src;
}

// The real engine with the two spawned steps stubbed: compile and runner
// generation are separately proven (t352) and would need a whole harness tree.
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
      newTxnId: () => `t379-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst, () => {}),
    listHarnessTrees,
    listPluginSourceDirs,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "amadeus-t379-project-"));
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

describe("t379 tools reach the composed host", () => {
  test("compose copies every declared tool beside the stage, and drop removes them", () => {
    const src = writeAuthoringSource(project);
    const host = join(project, ".claude");
    mkdirSync(host, { recursive: true });

    expect(handlePluginCli(["install", src, "--project-root", host], deps())).toBe(0);
    for (const rel of [STAGE_REL, RUN_REL, HELPER_REL]) {
      expect(existsSync(join(host, rel))).toBe(true);
    }
    expect(readFileSync(join(host, RUN_REL), "utf-8")).toBe(RUN_BODY);

    const record = createNodeBackend(host).readComposition().plugins.get(PLUGIN);
    expect(record?.ownedPaths).toEqual([STAGE_REL, HELPER_REL, RUN_REL].sort());

    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(0);
    for (const rel of [STAGE_REL, RUN_REL, HELPER_REL]) {
      expect(existsSync(join(host, rel))).toBe(false);
    }
  });

  test("a hand-edited composed tool blocks the drop", () => {
    const src = writeAuthoringSource(project);
    const host = join(project, ".claude");
    mkdirSync(host, { recursive: true });
    expect(handlePluginCli(["install", src, "--project-root", host], deps())).toBe(0);

    writeFileSync(join(host, RUN_REL), "// edited by hand\n");
    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(1);
    expect(err.join("\n")).toContain(RUN_REL);
    expect(existsSync(join(host, RUN_REL))).toBe(true);
  });

  // FR-A3 acceptance: the composed copy is self-sufficient — bun runs it in
  // place, resolving its sibling import from the same composed tools/ dir.
  test("the composed tool runs from the host tree it landed in", () => {
    const src = writeAuthoringSource(project);
    const host = join(project, ".claude");
    mkdirSync(host, { recursive: true });
    expect(handlePluginCli(["install", src, "--project-root", host], deps())).toBe(0);

    const res = spawnSync("bun", [join(host, RUN_REL)], { encoding: "utf-8", env: process.env });
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe("tooled:ok");
  });
});

describe("t379 compose --all-harnesses", () => {
  test("seeds staging into every detected tree and composes each", () => {
    writeAuthoringSource(project);
    for (const name of [".claude", ".codex", ".cursor"]) mkdirSync(join(project, name), { recursive: true });

    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", project], deps())).toBe(0);

    for (const name of [".claude", ".codex", ".cursor"]) {
      const host = join(project, name);
      expect(existsSync(join(host, PLUGIN_SOURCE_DIR_NAME, PLUGIN, "plugin.json"))).toBe(true);
      expect(readFileSync(join(host, RUN_REL), "utf-8")).toBe(RUN_BODY);
      expect(createNodeBackend(host).readComposition().plugins.has(PLUGIN)).toBe(true);
    }
    expect(out.join("\n")).toContain("3/3");
  });

  test("re-running is a no-op and never double-composes", () => {
    writeAuthoringSource(project);
    mkdirSync(join(project, ".claude"), { recursive: true });
    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", project], deps())).toBe(0);
    const first = readFileSync(join(project, ".claude", ".amadeus-plugin-composition.json"), "utf-8");

    out.length = 0;
    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", project], deps())).toBe(0);
    expect(readFileSync(join(project, ".claude", ".amadeus-plugin-composition.json"), "utf-8")).toBe(first);
  });

  test("one failing tree is loud and non-zero while the others still compose", () => {
    writeAuthoringSource(project);
    for (const name of [".claude", ".codex"]) mkdirSync(join(project, name), { recursive: true });
    // Pre-place a user file exactly where .codex's tool would land: inspect must
    // refuse to clobber it, so that tree fails while .claude still composes.
    mkdirSync(join(project, ".codex", "plugins", PLUGIN, "tools"), { recursive: true });
    writeFileSync(join(project, ".codex", RUN_REL), "// mine\n");

    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", project], deps())).toBe(1);
    expect(err.join("\n")).toContain(".codex");
    expect(readFileSync(join(project, ".codex", RUN_REL), "utf-8")).toBe("// mine\n");
    expect(readFileSync(join(project, ".claude", RUN_REL), "utf-8")).toBe(RUN_BODY);
  });

  test("a tree whose staging cannot be seeded is reported, not composed", () => {
    writeAuthoringSource(project);
    for (const name of [".claude", ".codex"]) mkdirSync(join(project, name), { recursive: true });
    const failing = join(project, ".codex");
    const seedBlocked: PluginCliDeps = {
      ...deps(),
      copyPluginSource: (src, dst) => {
        if (dst.startsWith(failing)) throw new Error("EACCES: staging is read-only");
        copyPluginSource(src, dst, () => {});
      },
    };

    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", project], seedBlocked)).toBe(1);
    expect(err.join("\n")).toContain("staging seed failed");
    expect(existsSync(join(failing, RUN_REL))).toBe(false);
    // The healthy tree is unaffected — a seed failure never aborts the fan-out.
    expect(readFileSync(join(project, ".claude", RUN_REL), "utf-8")).toBe(RUN_BODY);
  });

  test("a project with no harness tree fails closed", () => {
    writeAuthoringSource(project);
    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", project], deps())).toBe(1);
    expect(err.join("\n")).toContain("no harness tree");
  });

  test("staging that already exists is left alone (only absent staging is seeded)", () => {
    const src = writeAuthoringSource(project);
    const host = join(project, ".claude");
    const staged = join(host, PLUGIN_SOURCE_DIR_NAME, PLUGIN);
    // A staged bundle that DIFFERS from the authoring source. Bulk compose must
    // neither overwrite it nor read past it — replacing a differing staged
    // bundle is `install --force`'s decision, not this verb's.
    copyPluginSource(src, staged, () => {});
    writeFileSync(join(staged, "tools", "helper.ts"), 'export const label = "staged";\n');

    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", project], deps())).toBe(0);
    expect(readFileSync(join(staged, "tools", "helper.ts"), "utf-8")).toBe('export const label = "staged";\n');
    // The composed host carries the STAGED bytes, proving staging was the input.
    expect(readFileSync(join(host, HELPER_REL), "utf-8")).toBe('export const label = "staged";\n');
  });

  // The fan-out recompiles a tree OTHER than the one whose CLI is running, so
  // the post-apply compile must be resolved from the target tree's own tools/.
  // Bound to the invoking script's dir instead, every tree in the fan-out would
  // recompile the caller's graph and the composed stage would never become
  // reachable anywhere but there.
  test("the post-apply compile is resolved from the target tree, not the caller", () => {
    const target = join(project, ".codex");
    mkdirSync(join(target, "tools"), { recursive: true });
    writeFileSync(join(target, "tools", "amadeus-graph.ts"), "// stub\n");
    const callerDir = join(project, ".claude", "tools");
    mkdirSync(callerDir, { recursive: true });

    expect(resolveHarnessToolsDir(target, callerDir)).toBe(join(target, "tools"));
    // A host root with no tools of its own falls back to the caller's dir.
    expect(resolveHarnessToolsDir(join(project, ".cursor"), callerDir)).toBe(callerDir);
  });

  test("--project-root pointing at a harness tree still fans out over its siblings", () => {
    writeAuthoringSource(project);
    for (const name of [".claude", ".codex"]) mkdirSync(join(project, name), { recursive: true });

    expect(handlePluginCli(["compose", "--all-harnesses", "--project-root", join(project, ".claude")], deps())).toBe(0);
    expect(existsSync(join(project, ".codex", RUN_REL))).toBe(true);
  });
});
