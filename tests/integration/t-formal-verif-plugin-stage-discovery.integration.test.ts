// covers: function:discoverPluginStageFiles, function:compileStageGraph
//
// U2 plugin-skeleton (intent 260722-tla-plugin): the compile joins composed
// plugin stages at <hostRoot>/plugins/<name>/stages/<slug>.md into the graph.
// Real FS (temp host trees + real stage tree), so this lives in the integration
// layer (cid:fs-tests-integration-first). Two-sided proof of the 0-plugin
// byte-identical baseline (BR-U2-3): an empty plugins host compiles identically
// to the committed graph, and injecting a dummy plugin makes the output differ
// (the falling proof that discovery is live, not a no-op).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compileStageGraph,
  discoverPluginStageFiles,
  PluginStageError,
  __resetGraphCache,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";

// The canonical core tree ships no compiled stage-graph.json (dev source carries
// no compiled data); the shipped surface does, so the compile tests import the
// dist copy and compare against its committed graph — mirrors t89/t110 and the
// golden-regen-from-shipped-surface discipline.
const DIST_TOOLS = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools");
const COMMITTED_GRAPH = join(DIST_TOOLS, "data", "stage-graph.json");

// A valid stage frontmatter body (all REQUIRED_FIELDS). Optional overrides let a
// case set sensors / scopes / phase / slug without re-authoring the block.
function stageMd(
  slug: string,
  opts: { phase?: string; sensors?: string[]; scopes?: string[]; leadAgent?: string } = {},
): string {
  const phase = opts.phase ?? "construction";
  // The stage frontmatter parser takes block-style YAML lists, not inline [...].
  const sensors = opts.sensors ? `sensors:\n${opts.sensors.map((s) => `  - ${s}`).join("\n")}\n` : "";
  const scopes = (opts.scopes ?? []).length
    ? `scopes:\n${(opts.scopes ?? []).map((s) => `  - ${s}`).join("\n")}\n`
    : `scopes: []\n`;
  const lead = opts.leadAgent ?? "amadeus-developer-agent";
  return (
    `---\n` +
    `slug: ${slug}\n` +
    `phase: ${phase}\n` +
    `execution: CONDITIONAL\n` +
    `condition: Opt-in via --single.\n` +
    `lead_agent: ${lead}\n` +
    `support_agents: []\n` +
    `mode: inline\n` +
    `produces: []\n` +
    `consumes: []\n` +
    `requires_stage: []\n` +
    `inputs: none\n` +
    `outputs: none\n` +
    sensors +
    scopes +
    `---\n\nPlugin stage body for ${slug}.\n`
  );
}

// Write a plugin stage file at <host>/plugins/<name>/stages/<file>.
function writePluginStage(host: string, plugin: string, file: string, content: string): string {
  const dir = join(host, "plugins", plugin, "stages");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, file);
  writeFileSync(path, content);
  return path;
}

const tempDirs: string[] = [];
function freshHost(): string {
  const dir = mkdtempSync(join(tmpdir(), "plugin-stage-host-"));
  tempDirs.push(dir);
  return dir;
}

const savedEnv: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

beforeEach(() => {
  __resetGraphCache();
});
afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const k of Object.keys(savedEnv)) delete savedEnv[k];
  __resetGraphCache();
  for (const d of tempDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

// Compile the real graph with plugin discovery pointed at `host` (its plugins/
// subtree). Real stages + real sensors + the committed seed graph otherwise.
function compileWithPluginHost(host: string): ReturnType<typeof compileStageGraph> {
  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  __resetGraphCache();
  return compileStageGraph();
}

describe("discoverPluginStageFiles (U2 plugin discovery)", () => {
  test("absent plugins dir contributes nothing (0-plugin baseline)", () => {
    const host = freshHost();
    expect(discoverPluginStageFiles(host)).toEqual([]);
  });

  test("one plugin, one stage returns {path, slug} with the host-relative POSIX path", () => {
    const host = freshHost();
    writePluginStage(host, "formal-model-check", "formal-model-check.md", stageMd("formal-model-check"));
    expect(discoverPluginStageFiles(host)).toEqual([
      { path: "plugins/formal-model-check/stages/formal-model-check.md", slug: "formal-model-check" },
    ]);
  });

  test("multiple plugins and stages are sorted by path (deterministic merge order)", () => {
    const host = freshHost();
    writePluginStage(host, "zeta", "z-stage.md", stageMd("z-stage"));
    writePluginStage(host, "alpha", "b-stage.md", stageMd("b-stage"));
    writePluginStage(host, "alpha", "a-stage.md", stageMd("a-stage"));
    expect(discoverPluginStageFiles(host).map((f) => f.path)).toEqual([
      "plugins/alpha/stages/a-stage.md",
      "plugins/alpha/stages/b-stage.md",
      "plugins/zeta/stages/z-stage.md",
    ]);
  });

  test("a symlinked stage file is rejected as READ_FAILED (security-design)", () => {
    const host = freshHost();
    const real = join(host, "outside.md");
    writeFileSync(real, stageMd("sneaky"));
    const dir = join(host, "plugins", "evil", "stages");
    mkdirSync(dir, { recursive: true });
    symlinkSync(real, join(dir, "sneaky.md"));
    try {
      discoverPluginStageFiles(host);
      throw new Error("expected PluginStageError");
    } catch (err) {
      expect(err).toBeInstanceOf(PluginStageError);
      expect((err as PluginStageError).payload.code).toBe("READ_FAILED");
      expect((err as PluginStageError).payload.pluginPath).toBe("plugins/evil/stages/sneaky.md");
    }
  });

  test("schema-invalid frontmatter is rejected as SCHEMA_INVALID", () => {
    const host = freshHost();
    // Missing required fields (only slug present).
    writePluginStage(host, "bad", "bad.md", `---\nslug: bad\n---\nbody\n`);
    try {
      discoverPluginStageFiles(host);
      throw new Error("expected PluginStageError");
    } catch (err) {
      expect(err).toBeInstanceOf(PluginStageError);
      expect((err as PluginStageError).payload.code).toBe("SCHEMA_INVALID");
      expect((err as PluginStageError).payload.pluginPath).toBe("plugins/bad/stages/bad.md");
    }
  });
});

describe("compileStageGraph plugin merge (U2)", () => {
  test("0-plugin host compiles byte-identical to the committed graph (BR-U2-3)", () => {
    const host = freshHost(); // no plugins/ subtree
    const { json } = compileWithPluginHost(host);
    expect(json).toBe(readFileSync(COMMITTED_GRAPH, "utf-8"));
  });

  test("injecting a dummy plugin makes the output differ (falling proof of live discovery)", () => {
    const empty = freshHost();
    const withPlugin = freshHost();
    writePluginStage(withPlugin, "dummy", "zz-dummy-plugin-stage.md", stageMd("zz-dummy-plugin-stage"));

    const baseline = compileWithPluginHost(empty).json;
    const injected = compileWithPluginHost(withPlugin);

    // RED: the dummy plugin stage changes the compiled graph.
    expect(injected.json).not.toBe(baseline);
    expect(injected.stages.some((s) => s.slug === "zz-dummy-plugin-stage")).toBe(true);
    // GREEN restored: the empty host equals the committed baseline.
    expect(baseline).toBe(readFileSync(COMMITTED_GRAPH, "utf-8"));
  });

  test("a plugin slug colliding with a core stage is a loud SLUG_COLLISION", () => {
    const host = freshHost();
    writePluginStage(host, "clash", "code-generation.md", stageMd("code-generation"));
    try {
      compileWithPluginHost(host);
      throw new Error("expected PluginStageError");
    } catch (err) {
      expect(err).toBeInstanceOf(PluginStageError);
      const p = (err as PluginStageError).payload;
      expect(p.code).toBe("SLUG_COLLISION");
      expect(p.slug).toBe("code-generation");
      expect(p.pluginPath).toBe("plugins/clash/stages/code-generation.md");
      expect(p.existingPath).toContain("code-generation.md");
    }
  });

  test("a plugin stage referencing an unknown sensor is a loud UNKNOWN_SENSOR", () => {
    const host = freshHost();
    writePluginStage(
      host,
      "sensorless",
      "needs-sensor.md",
      stageMd("needs-sensor", { sensors: ["no-such-sensor-xyz"] }),
    );
    try {
      compileWithPluginHost(host);
      throw new Error("expected PluginStageError");
    } catch (err) {
      expect(err).toBeInstanceOf(PluginStageError);
      const p = (err as PluginStageError).payload;
      expect(p.code).toBe("UNKNOWN_SENSOR");
      expect(p.sensorId).toBe("no-such-sensor-xyz");
      expect(p.pluginPath).toBe("plugins/sensorless/stages/needs-sensor.md");
    }
  });
});

describe("PluginStageError schema (reliability-design)", () => {
  test("jsonLine is a single line of amadeus.plugin-stage-error.v1 with the common + code fields", () => {
    const err = new PluginStageError({
      code: "SLUG_COLLISION",
      plugin: "clash",
      slug: "code-generation",
      existingPath: "amadeus-common/stages/construction/code-generation.md",
      pluginPath: "plugins/clash/stages/code-generation.md",
    });
    const line = err.jsonLine();
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed.schema).toBe("amadeus.plugin-stage-error.v1");
    expect(parsed.code).toBe("SLUG_COLLISION");
    expect(parsed.plugin).toBe("clash");
    expect(parsed.slug).toBe("code-generation");
    expect(parsed.existingPath).toBe("amadeus-common/stages/construction/code-generation.md");
    expect(parsed.pluginPath).toBe("plugins/clash/stages/code-generation.md");
  });
});

// Reservation 2 (ruling E-TLAU2 option A): the 0-plugin stage-graph baseline is
// protected STRUCTURALLY, not by luck. The `compileStageGraph plugin merge`
// suite above is the falling proof that discovery is LIVE — a plugin stage under
// a compile-visible plugins/ WOULD rejoin the graph and change the output. This
// suite is the other half: the formal-model-check plugin ships ONLY as a neutral
// bundle, and NO shipped harness tree carries it under its compile-visible
// plugins/ dir, so recompiling any shipped tree stays 0-plugin (t110/t88 / FR-2.3).
describe("formal-model-check shipping guard (FR-2.3 / reservation 2)", () => {
  const REPO_ROOT = join(import.meta.dir, "..", "..");
  // Every shipped harness tree keyed by its compile-visible harness dir.
  const HARNESS_TREES: ReadonlyArray<readonly [string, string]> = [
    ["claude", ".claude"],
    ["codex", ".codex"],
    ["cursor", ".cursor"],
    ["kiro", ".kiro"],
    ["kiro-ide", ".kiro"],
    ["opencode", ".opencode"],
  ];

  test("the plugin ships as a neutral bundle (opt-in supply, FR-2.1)", () => {
    expect(existsSync(join(REPO_ROOT, "dist", "plugins", "formal-model-check", "plugin.json"))).toBe(true);
  });

  test("no shipped harness tree carries the plugin under a compile-visible plugins/ dir", () => {
    for (const [tree, harnessDir] of HARNESS_TREES) {
      const shippedPluginDir = join(REPO_ROOT, "dist", tree, harnessDir, "plugins", "formal-model-check");
      expect(existsSync(shippedPluginDir), `${tree} must not ship formal-model-check in ${harnessDir}/plugins/`).toBe(false);
    }
  });
});
