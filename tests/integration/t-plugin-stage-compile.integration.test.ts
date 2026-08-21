// covers: function:compileStageGraph, function:PluginStageError
// size: medium
//
// The compile joins composed plugin stages at
// `<hostRoot>/plugins/<name>/stages/<slug>.md` into the stage graph, and the
// composition record is what makes a stage on disk TRUSTED. This file drives
// that join and every way it refuses, through the compile's own public seam.
//
// Two-sided proof of the 0-plugin baseline: an empty plugins host compiles
// byte-identically to the committed graph, and injecting a plugin stage makes
// the output differ — the falling proof that discovery is live, not a no-op.
// Without the second half the first would pass against a discovery that never
// ran.
//
// Real filesystem (temp host trees + the real stage tree), so this lives in the
// integration layer (cid:fs-tests-integration-first). The compile tests import
// the SHIPPED dist copy and compare against its committed graph, because the
// canonical core tree ships no compiled stage-graph.json.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compileStageGraph,
  main,
  PluginStageError,
  __resetGraphCache,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { FIXTURE_PLUGIN, FIXTURE_SOURCE } from "../harness/conformance-fixture.ts";
import {
  mutateCompositionRecord,
  recordPathOf,
  stageMd,
  writePluginStage,
} from "../harness/plugin-composition-fixture.ts";

const DIST_TOOLS = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools");
const COMMITTED_GRAPH = join(DIST_TOOLS, "data", "stage-graph.json");

const tempDirs: string[] = [];
function freshHost(): string {
  const dir = mkdtempSync(join(tmpdir(), "plugin-stage-compile-"));
  tempDirs.push(dir);
  return dir;
}

const savedEnv: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined): void {
  if (!(key in savedEnv)) savedEnv[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

beforeEach(() => {
  __resetGraphCache();
});
afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const key of Object.keys(savedEnv)) delete savedEnv[key];
  __resetGraphCache();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Compile the real graph with plugin discovery pointed at `host`. Real stages +
// real sensors + the committed seed graph otherwise.
function compileWithPluginHost(host: string): ReturnType<typeof compileStageGraph> {
  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  __resetGraphCache();
  return compileStageGraph();
}

function caughtPluginStageError(host: string): PluginStageError {
  try {
    compileWithPluginHost(host);
  } catch (err) {
    expect(err).toBeInstanceOf(PluginStageError);
    return err as PluginStageError;
  }
  throw new Error("expected the compile to throw a PluginStageError");
}

describe("compileStageGraph plugin merge", () => {
  test("0-plugin host compiles byte-identical to the committed graph", () => {
    const host = freshHost(); // no plugins/ subtree
    const { json } = compileWithPluginHost(host);
    expect(json).toBe(readFileSync(COMMITTED_GRAPH, "utf-8"));
  });

  test("a native host plugin file does not require an Amadeus composition record", () => {
    const host = freshHost();
    mkdirSync(join(host, "plugins"), { recursive: true });
    writeFileSync(join(host, "plugins", "amadeus-opencode-plugin.ts"), "export default () => ({});\n");
    const { json } = compileWithPluginHost(host);
    expect(json).toBe(readFileSync(COMMITTED_GRAPH, "utf-8"));
    expect(existsSync(join(host, ".amadeus-plugin-composition.json"))).toBe(false);
  });

  test("injecting a plugin stage makes the output differ (falling proof of live discovery)", () => {
    const empty = freshHost();
    const withPlugin = freshHost();
    writePluginStage(withPlugin, "dummy", "zz-dummy-plugin-stage.md", stageMd("zz-dummy-plugin-stage"));

    const baseline = compileWithPluginHost(empty).json;
    const injected = compileWithPluginHost(withPlugin);

    // RED: the injected plugin stage changes the compiled graph.
    expect(injected.json).not.toBe(baseline);
    expect(injected.stages.some((s) => s.slug === "zz-dummy-plugin-stage")).toBe(true);
    // GREEN restored: the empty host equals the committed baseline.
    expect(baseline).toBe(readFileSync(COMMITTED_GRAPH, "utf-8"));
  });

  // The real composed shape, not a hand-written stub: the conformance fixture's
  // own manifest stage, dropped where compose leaves it.
  test("the conformance fixture's stage joins the graph as its manifest declares", () => {
    const host = freshHost();
    const stageFile = `${FIXTURE_PLUGIN}.md`;
    writePluginStage(
      host,
      FIXTURE_PLUGIN,
      stageFile,
      readFileSync(join(FIXTURE_SOURCE, "stages", stageFile), "utf8"),
    );
    // Its stage declares a plugin-owned sensor; compose delivers that manifest
    // into the host sensors/ dir, so the fixture mirrors that delivery for the
    // compile's host-sensor resolution.
    mkdirSync(join(host, "sensors"), { recursive: true });
    cpSync(
      join(FIXTURE_SOURCE, "sensors", `amadeus-${FIXTURE_PLUGIN}.md`),
      join(host, "sensors", `amadeus-${FIXTURE_PLUGIN}.md`),
    );

    const compiled = compileWithPluginHost(host);
    const joined = compiled.stages.find((stage) => stage.slug === FIXTURE_PLUGIN);
    expect(joined).toBeDefined();
    expect(joined?.phase).toBe("construction");
    // An empty `scopes:` keeps scope ownership in the host: the plugin stage
    // joins the graph without claiming a cell in any scope's grid.
    const grid = JSON.parse(compiled.gridJson) as Record<string, { stages: Record<string, string> }>;
    for (const scope of Object.keys(grid)) {
      expect(grid[scope]?.stages[FIXTURE_PLUGIN], `${scope} must not gain the fixture stage`).toBeUndefined();
    }
  });

  // #1598: the join stamps a provenance discriminant on the plugin-joined node —
  // the one compile-owned way to tell a composed stage from a core one. It is
  // ABSENT (never `false`) on core nodes, which is what keeps the 0-plugin
  // compile byte-identical to the committed baseline.
  test("a plugin-joined node carries plugin_source; core nodes do not", () => {
    const host = freshHost();
    writePluginStage(host, "dummy", "zz-dummy-plugin-stage.md", stageMd("zz-dummy-plugin-stage"));
    const { stages, json } = compileWithPluginHost(host);

    const plugin = stages.find((s) => s.slug === "zz-dummy-plugin-stage");
    expect(plugin?.plugin_source).toBe(true);
    const core = stages.filter((s) => s.slug !== "zz-dummy-plugin-stage");
    expect(core.length).toBeGreaterThan(0);
    expect(core.some((s) => Object.hasOwn(s, "plugin_source"))).toBe(false);
    // It survives the canonical emitter, so the on-disk graph a host recompiles
    // into carries the stamp for downstream readers.
    expect(json).toContain(`"plugin_source": true`);
    expect(json.match(/"plugin_source"/g)?.length).toBe(1);
  });

  test("a plugin slug colliding with a core stage is a loud SLUG_COLLISION", () => {
    const host = freshHost();
    writePluginStage(host, "clash", "code-generation.md", stageMd("code-generation"));
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("SLUG_COLLISION");
    expect(payload.slug).toBe("code-generation");
    expect(payload.pluginPath).toBe("plugins/clash/stages/code-generation.md");
    expect(payload.existingPath).toContain("code-generation.md");
  });

  test("a plugin stage referencing an unknown sensor is a loud UNKNOWN_SENSOR", () => {
    const host = freshHost();
    writePluginStage(
      host,
      "sensorless",
      "needs-sensor.md",
      stageMd("needs-sensor", { sensors: ["no-such-sensor-xyz"] }),
    );
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("UNKNOWN_SENSOR");
    expect(payload.sensorId).toBe("no-such-sensor-xyz");
    expect(payload.pluginPath).toBe("plugins/sensorless/stages/needs-sensor.md");
  });
});

// The composition record is the trust boundary. Every one of these is a stage
// that EXISTS on disk and is refused because the record does not vouch for it
// exactly — a stage the compile would otherwise have joined.
describe("compileStageGraph refuses an untrusted plugin stage index", () => {
  test("a stage with no composition record at all is refused", () => {
    const host = freshHost();
    const dir = join(host, "plugins", "untrusted", "stages");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "untrusted.md"), stageMd("untrusted"));
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("no composition record");
  });

  test("a symlinked composition record is refused rather than followed", () => {
    const host = freshHost();
    writePluginStage(host, "trusted", "trusted.md", stageMd("trusted"));
    const recordPath = recordPathOf(host);
    const real = join(host, "record-elsewhere.json");
    cpSync(recordPath, real);
    rmSync(recordPath);
    symlinkSync(real, recordPath);
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("symlink");
  });

  test("tampering with an indexed slug invalidates the aggregate digest", () => {
    const host = freshHost();
    writePluginStage(host, "trusted", "trusted.md", stageMd("trusted"));
    expect(compileWithPluginHost(host).stages.some((stage) => stage.slug === "trusted")).toBe(true);
    // Rewrite the index WITHOUT refreshing the aggregate digest: exactly what a
    // hand edit of the record looks like.
    mutateCompositionRecord(host, (record) => {
      (record.stageIndex as Array<{ slug: string }>)[0].slug = "tampered";
    }, { refreshAggregate: false });
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("aggregate plugin stage index digest is invalid");
  });

  test("a trust grant that does not name its own plugin is refused", () => {
    const host = freshHost();
    writePluginStage(host, "trusted", "trusted.md", stageMd("trusted"));
    mutateCompositionRecord(host, (record) => {
      (record.trustGrant as { plugin: string }).plugin = "someone-else";
    });
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("trust grant");
  });

  test("a malformed grant timestamp is refused", () => {
    const host = freshHost();
    writePluginStage(host, "trusted", "trusted.md", stageMd("trusted"));
    mutateCompositionRecord(host, (record) => {
      (record.trustGrant as { grantTimestamp: string }).grantTimestamp = "not-a-date";
    });
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("trust grant");
  });

  test("an indexed path outside the plugin's own stages dir is refused", () => {
    const host = freshHost();
    writePluginStage(host, "trusted", "trusted.md", stageMd("trusted"));
    mutateCompositionRecord(host, (record) => {
      (record.stageIndex as Array<{ path: string }>)[0].path = "plugins/other/stages/trusted.md";
    });
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("index entry is invalid");
  });

  test("an index entry whose frontmatter slug disagrees with the entry is refused", () => {
    const host = freshHost();
    writePluginStage(host, "trusted", "trusted.md", stageMd("trusted"));
    mutateCompositionRecord(host, (record) => {
      const index = record.stageIndex as Array<{ frontmatter: { slug: string } }>;
      index[0].frontmatter.slug = "disagrees";
    });
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("does not match frontmatter");
  });

  test("duplicate index slugs are refused even with a valid aggregate digest", () => {
    const host = freshHost();
    writePluginStage(host, "alpha", "duplicate.md", stageMd("duplicate"));
    writePluginStage(host, "beta", "duplicate.md", stageMd("duplicate"));
    const payload = caughtPluginStageError(host).payload;
    expect(payload.code).toBe("READ_FAILED");
    expect(payload.reason).toContain("index entry is invalid");
  });

  // The index is cached by record identity, so a second compile of the SAME
  // untouched host must read it back rather than re-deriving it.
  test("a repeated compile of one host reuses the cached index", () => {
    const host = freshHost();
    writePluginStage(host, "trusted", "trusted.md", stageMd("trusted"));
    const first = compileWithPluginHost(host);
    const second = compileWithPluginHost(host);
    expect(second.json).toBe(first.json);
    expect(second.stages.some((stage) => stage.slug === "trusted")).toBe(true);
  });

  // The cache is bounded: compiling more distinct hosts than it holds evicts the
  // oldest entry, and every host still compiles correctly.
  test("the index cache stays bounded across many hosts", () => {
    const hosts: string[] = [];
    for (let i = 0; i < 18; i++) {
      const host = freshHost();
      writePluginStage(host, `p${i}`, `zz-cache-${i}.md`, stageMd(`zz-cache-${i}`));
      hosts.push(host);
      expect(compileWithPluginHost(host).stages.some((s) => s.slug === `zz-cache-${i}`)).toBe(true);
    }
    // The first host, long since evicted, still compiles from disk.
    expect(compileWithPluginHost(hosts[0]).stages.some((s) => s.slug === "zz-cache-0")).toBe(true);
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

// The CLI's catch emits a PluginStageError as the single line of
// amadeus.plugin-stage-error.v1 JSON, and any other error with the generic
// `amadeus-graph <cmd>: ...` prefix, both exit 1. bun --coverage does NOT
// instrument spawned children, so drive the exported main() IN-PROCESS with
// console.error + process.exit captured — cover own code, never waiver it.
describe("amadeus-graph main() error emission (in-process, exit captured)", () => {
  async function runMain(argv: string[]): Promise<{ outs: string[]; errs: string[]; exits: number[] }> {
    const outs: string[] = [];
    const errs: string[] = [];
    const exits: number[] = [];
    const origLog = console.log;
    const origErr = console.error;
    const origExit = process.exit;
    console.log = (...a: unknown[]) => void outs.push(a.map(String).join(" "));
    console.error = (...a: unknown[]) => void errs.push(a.map(String).join(" "));
    // biome-ignore lint/suspicious/noExplicitAny: test stub for process.exit
    (process as any).exit = (code?: number) => void exits.push(code ?? 0);
    try {
      await main(argv);
    } finally {
      console.log = origLog;
      console.error = origErr;
      process.exit = origExit;
    }
    return { outs, errs, exits };
  }

  test("a plugin slug colliding with a core stage emits the plugin-stage-error JSON, exit 1", async () => {
    const host = freshHost();
    writePluginStage(host, "clash", "code-generation.md", stageMd("code-generation"));
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    const { errs, exits } = await runMain(["compile"]);
    expect(exits).toContain(1);
    const parsed = JSON.parse(errs.at(-1) ?? "null");
    expect(parsed.schema).toBe("amadeus.plugin-stage-error.v1");
    expect(parsed.code).toBe("SLUG_COLLISION");
    expect(parsed.slug).toBe("code-generation");
  });

  test("a non-plugin compile error emits the generic prefixed message, exit 1", async () => {
    // A malformed stage in the walked tree makes compileStageGraph throw a plain
    // Error (schema validation), reported through the generic arm. Uses
    // AMADEUS_STAGES_DIR so the throw happens in the walk, independent of the
    // seed cache warmed by earlier tests.
    const stagesDir = freshHost();
    mkdirSync(join(stagesDir, "construction"), { recursive: true });
    writeFileSync(join(stagesDir, "construction", "badstage.md"), "---\nslug: badstage\n---\nbody\n");
    setEnv("AMADEUS_STAGES_DIR", stagesDir);
    __resetGraphCache();
    const { errs, exits } = await runMain(["compile"]);
    expect(exits).toContain(1);
    expect(errs.some((e) => e.includes("amadeus-graph compile:"))).toBe(true);
  });

  test("two stage files claiming one slug name both files and exit 1", async () => {
    const stagesDir = freshHost();
    mkdirSync(join(stagesDir, "construction"), { recursive: true });
    writeFileSync(join(stagesDir, "construction", "first.md"), stageMd("zz-twin"));
    writeFileSync(join(stagesDir, "construction", "second.md"), stageMd("zz-twin"));
    setEnv("AMADEUS_STAGES_DIR", stagesDir);
    __resetGraphCache();
    const { errs, exits } = await runMain(["compile"]);
    expect(exits).toContain(1);
    expect(errs.some((e) => e.includes("Duplicate stage slug"))).toBe(true);
  });

  test("unparseable frontmatter is reported with its file path, exit 1", async () => {
    const stagesDir = freshHost();
    mkdirSync(join(stagesDir, "construction"), { recursive: true });
    // No frontmatter fence at all: the parse throws before schema validation.
    writeFileSync(join(stagesDir, "construction", "unfenced.md"), "no frontmatter here\n");
    setEnv("AMADEUS_STAGES_DIR", stagesDir);
    __resetGraphCache();
    const { errs, exits } = await runMain(["compile"]);
    expect(exits).toContain(1);
    expect(errs.some((e) => e.includes("unfenced.md"))).toBe(true);
  });

  test("no subcommand prints help, and an unknown one names the available set, exit 1", async () => {
    const bare = await runMain([]);
    expect(bare.exits).toContain(1);
    const unknown = await runMain(["no-such-subcommand"]);
    expect(unknown.exits).toContain(1);
    expect(unknown.errs.some((e) => e.includes("Unknown subcommand"))).toBe(true);
    expect(unknown.errs.some((e) => e.includes("compile"))).toBe(true);
  });
});
