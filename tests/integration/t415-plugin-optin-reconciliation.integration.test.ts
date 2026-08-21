// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  planPluginDrop,
  recordPluginDrops,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  listHarnessTrees,
  listPluginSourceDirs,
  runPluginCli,
  renderPluginCliResult,
  stagingEntryState,
  type PluginCliDeps,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";
const PLUGIN_TOOL = "conformance-fixture-tool.ts";

let project = "";
let host = "";

function deps(options: {
  apply?: PluginCliDeps["applyPluginPlan"];
  resync?: PluginCliDeps["resyncIntentStates"];
  out?: (line: string) => void;
  err?: (line: string) => void;
} = {}): PluginCliDeps {
  return {
    discoverPlugins,
    inspectPlugin,
    applyPluginPlan: options.apply ?? applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: createNodeBackend,
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t415-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst, () => {}),
    listHarnessTrees,
    listPluginSourceDirs,
    resyncIntentStates: options.resync,
    out: options.out ?? (() => {}),
    err: options.err ?? (() => {}),
  };
}

function writeSelection(plugins: readonly string[]): void {
  mkdirSync(join(project, "amadeus"), { recursive: true });
  writeFileSync(
    join(project, "amadeus", "config.json"),
    `${JSON.stringify({ plugin: { activation: { names: plugins } } }, null, 2)}\n`,
  );
}

function writeFixturePlugin(name: string): void {
  const root = join(project, "plugins", name);
  mkdirSync(join(root, "stages"), { recursive: true });
  writeFileSync(
    join(root, "plugin.json"),
    `${JSON.stringify({ name, stages: [{ slug: name, path: `stages/${name}.md` }] }, null, 2)}\n`,
  );
  writeFileSync(
    join(root, "stages", `${name}.md`),
    `---\nslug: ${name}\nphase: construction\nexecution: CONDITIONAL\ncondition: explicit test invocation\nlead_agent: amadeus-quality-agent\nsupport_agents: []\nmode: inline\nproduces: []\nconsumes: []\nrequires_stage: []\ninputs: synthetic fixture\noutputs: synthetic fixture verdict\nsensors: []\nscopes: []\n---\n\n# ${name}\n`,
  );
}

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "amadeus-t415-project-"));
  host = join(project, ".codex");
  mkdirSync(host, { recursive: true });
  cpSync(FIXTURE, join(project, "plugins", PLUGIN), { recursive: true });
  writeSelection([PLUGIN]);
});

afterEach(() => rmSync(project, { recursive: true, force: true }));

describe("t415 project opt-in reconciliation", () => {
  test("doctor reports invalid project configuration", () => {
    writeFileSync(
      join(project, "amadeus", "config.json"),
      JSON.stringify({ plugin: { activation: { names: PLUGIN } } }),
    );
    const result = runPluginCli(["doctor", "--project-root", host], deps());
    expect(result.kind).toBe("doctor");
    if (result.kind !== "doctor") return;
    expect(result.degraded).toBe(true);
    expect(result.section.lines).toContainEqual({
      plugin: ".codex",
      state: "unknown",
      detail: expect.stringContaining("configuration invalid:"),
    });
  });

  test("install rolls back persistent surfaces when state re-sync fails", () => {
    writeSelection([]);
    const configPath = join(project, "amadeus", "config.json");
    const configBefore = readFileSync(configPath);
    const source = join(project, "plugins", PLUGIN);
    const result = runPluginCli(["install", source, "--project-root", host], deps({
      resync: () => ({
        kind: "ran",
        outcomes: [{
          space: "default",
          intent: "demo-0badcafe",
          status: "section-unrecognized",
          inserted: [],
        }],
      }),
    }));
    expect(result).toMatchObject({
      kind: "composed",
      resyncFailed: ["default/demo-0badcafe"],
    });
    expect(existsSync(join(host, ".amadeus-plugin-src", PLUGIN))).toBe(false);
    expect(createNodeBackend(host).readComposition().plugins.has(PLUGIN)).toBe(false);
    expect(existsSync(source)).toBe(true);
    expect(readFileSync(configPath)).toEqual(configBefore);
  });

  test("fresh 0/0 is materialized for the current host and the next run is a no-op", () => {
    const configBefore = readFileSync(join(project, "amadeus", "config.json"));
    const first = runPluginCli(["compose", "--if-stale", "--project-root", host], deps());
    expect(first.kind).toBe("composed");
    expect(existsSync(join(host, ".amadeus-plugin-src", PLUGIN, "plugin.json"))).toBe(true);
    expect(createNodeBackend(host).readComposition().plugins.has(PLUGIN)).toBe(true);
    const second = runPluginCli(["compose", "--if-stale", "--project-root", host], deps());
    expect(second).toEqual({ kind: "noop", reason: "record-current" });
    expect(readFileSync(join(project, "amadeus", "config.json"))).toEqual(configBefore);
  });

  test("explicit selection ignores valid residual staging that was not opted in", () => {
    const residual = "residual-plugin";
    writeFixturePlugin(residual);
    copyPluginSource(
      join(project, "plugins", residual),
      join(host, ".amadeus-plugin-src", residual),
      () => {},
    );

    const first = runPluginCli(["compose", "--if-stale", "--project-root", host], deps());
    expect(first.kind).toBe("composed");
    const composition = createNodeBackend(host).readComposition();
    expect(composition.plugins.has(PLUGIN)).toBe(true);
    expect(composition.plugins.has(residual)).toBe(false);
    expect(existsSync(join(host, ".amadeus-plugin-src", residual, "plugin.json"))).toBe(true);
    expect(runPluginCli(["compose", "--if-stale", "--project-root", host], deps())).toEqual({
      kind: "noop",
      reason: "record-current",
    });
  });

  test("a changed project source is restaged and recomposed", () => {
    expect(runPluginCli(["compose", "--if-stale", "--project-root", host], deps()).kind).toBe("composed");
    const sourceTool = join(project, "plugins", PLUGIN, "tools", PLUGIN_TOOL);
    writeFileSync(sourceTool, `${readFileSync(sourceTool, "utf-8")}\n// t415 source change\n`);
    const result = runPluginCli(["compose", "--if-stale", "--project-root", host], deps());
    expect(result.kind).toBe("composed");
    expect(readFileSync(join(host, ".amadeus-plugin-src", PLUGIN, "tools", PLUGIN_TOOL), "utf-8")).toContain("t415 source change");
  });

  test("a missing or modified composed file is repaired from the selected source", () => {
    const injected = deps();
    expect(runPluginCli(["compose", "--if-stale", "--project-root", host], injected).kind).toBe("composed");
    const stage = join(host, "plugins", PLUGIN, "stages", `${PLUGIN}.md`);
    const expected = readFileSync(stage);
    const composition = join(host, ".amadeus-plugin-composition.json");
    const expectedComposition = readFileSync(composition);
    rmSync(stage);
    expect(runPluginCli(["compose", "--if-stale", "--project-root", host], injected)).toMatchObject({ kind: "composed" });
    expect(readFileSync(stage)).toEqual(expected);
    expect(readFileSync(composition)).toEqual(expectedComposition);
    writeFileSync(stage, "corrupted projection\n");
    expect(runPluginCli(["compose", "--if-stale", "--project-root", host], injected).kind).toBe("composed");
    expect(readFileSync(stage)).toEqual(expected);
    expect(readFileSync(composition)).toEqual(expectedComposition);
  });

  test("doctor distinguishes staged drift, composition drift, and an invalid staged manifest", () => {
    expect(runPluginCli(["compose", "--if-stale", "--project-root", host], deps()).kind).toBe("composed");
    const source = join(project, "plugins", PLUGIN);
    const staging = join(host, ".amadeus-plugin-src", PLUGIN);
    const stagedTool = join(staging, "tools", PLUGIN_TOOL);
    writeFileSync(stagedTool, `${readFileSync(stagedTool, "utf-8")}\n// staged drift\n`);
    let doctor = runPluginCli(["doctor", "--project-root", host], deps());
    expect(doctor.kind === "doctor" && doctor.section.lines.some((line) => line.plugin === PLUGIN && line.state === "drift")).toBe(true);

    const sourceTool = join(source, "tools", PLUGIN_TOOL);
    writeFileSync(sourceTool, `${readFileSync(sourceTool, "utf-8")}\n// composition drift\n`);
    copyPluginSource(source, staging, () => {});
    doctor = runPluginCli(["doctor", "--project-root", host], deps());
    expect(doctor.kind === "doctor" && doctor.section.lines.some((line) => line.plugin === PLUGIN && line.state === "drift")).toBe(true);

    writeFileSync(join(source, "plugin.json"), "{not-json");
    copyPluginSource(source, staging, () => {});
    doctor = runPluginCli(["doctor", "--project-root", host], deps());
    expect(doctor.kind === "doctor" && doctor.section.lines.some((line) => line.plugin === PLUGIN && line.state === "degraded")).toBe(true);
  });

  test("removing selection safely drops composition and managed staging but preserves supply", () => {
    expect(runPluginCli(["compose", "--if-stale", "--project-root", host], deps()).kind).toBe("composed");
    writeSelection([]);
    const result = runPluginCli(["compose", "--if-stale", "--project-root", host], deps());
    expect(result.kind).toBe("composed");
    expect(createNodeBackend(host).readComposition().plugins.has(PLUGIN)).toBe(false);
    expect(existsSync(join(host, ".amadeus-plugin-src", PLUGIN))).toBe(false);
    expect(existsSync(join(project, "plugins", PLUGIN, "plugin.json"))).toBe(true);
  });

  test("a missing selected source fails before changing the current host and doctor identifies it", () => {
    rmSync(join(project, "plugins", PLUGIN), { recursive: true, force: true });
    const compose = runPluginCli(["compose", "--if-stale", "--project-root", host], deps());
    expect(compose).toEqual({
      kind: "failure",
      stage: "discover",
      message: `host .codex plugin "${PLUGIN}": source missing at plugins/${PLUGIN}`,
    });
    expect(existsSync(join(host, ".amadeus-plugin-src"))).toBe(false);
    const doctor = runPluginCli(["doctor", "--project-root", host], deps());
    expect(doctor.kind).toBe("doctor");
    if (doctor.kind !== "doctor") return;
    expect(doctor.degraded).toBe(true);
    expect(doctor.section.lines).toContainEqual({
      plugin: PLUGIN,
      state: "degraded",
      detail: `.codex source-missing: plugins/${PLUGIN}`,
    });
  });

  test("multi-plugin partial success is durable and retry applies only the failed plugin", () => {
    rmSync(join(project, "plugins", PLUGIN), { recursive: true, force: true });
    writeFixturePlugin("alpha-plugin");
    writeFixturePlugin("beta-plugin");
    writeSelection(["alpha-plugin", "beta-plugin"]);
    const applies = new Map<string, number>();
    let failBeta = true;
    const errors: string[] = [];
    const injected = deps({
      apply: (plan, tx) => {
        applies.set(plan.plugin, (applies.get(plan.plugin) ?? 0) + 1);
        if (plan.plugin === "beta-plugin" && failBeta) {
          return { kind: "stopped", reason: "synthetic beta interruption" };
        }
        return applyPluginPlan(plan, tx);
      },
      err: (line) => errors.push(line),
    });

    const first = runPluginCli(["compose", "--if-stale", "--project-root", host], injected);
    expect(first).toMatchObject({ kind: "failure", stage: "apply" });
    expect(renderPluginCliResult(first, injected)).toBe(1);
    expect(errors.at(-1)).toContain('plugin "beta-plugin" apply stopped');
    expect(createNodeBackend(host).readComposition().plugins.has("alpha-plugin")).toBe(true);
    expect(createNodeBackend(host).readComposition().plugins.has("beta-plugin")).toBe(false);

    failBeta = false;
    const retry = runPluginCli(["compose", "--if-stale", "--project-root", host], injected);
    expect(retry.kind).toBe("composed");
    expect(createNodeBackend(host).readComposition().plugins.has("alpha-plugin")).toBe(true);
    expect(createNodeBackend(host).readComposition().plugins.has("beta-plugin")).toBe(true);
    expect(applies).toEqual(new Map([["alpha-plugin", 1], ["beta-plugin", 2]]));
    expect(
      JSON.parse(
        readFileSync(join(project, "amadeus", "config.json"), "utf-8"),
      ).plugin.activation.names,
    ).toEqual(["alpha-plugin", "beta-plugin"]);
  });
});
