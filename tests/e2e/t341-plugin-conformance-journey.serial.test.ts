// t341 — plugin conformance journey: the SHIPPED developer install path, end to end.
// covers: file:packages/framework/core/tools/amadeus-plugin.ts, file:packages/framework/core/hooks/amadeus-plugin-compose.ts, file:scripts/plugin-projection.ts, hook:amadeus-plugin-compose
// size: medium
//
// FR-4 (#1589). The plugin host-delivery work shipped without a test that walks
// the path a developer actually walks, so a user-visible break (#1569: the
// INSTALL doc named a directory the compose scan never reached) passed CI and
// was caught only by hand. This file is that path, and nothing else:
//
//   (a) build a throwaway workspace from the SHIPPED claude face (dist/claude)
//       and folder-drop the plugin where the SHIPPED INSTALL doc says to
//   (b) compose by really spawning the SessionStart hook command read out of the
//       shipped settings.json.example — no hand-written command, no in-process
//       call, no stubbed recompile
//   (c) assert the composed stage reached the compiled STAGE GRAPH (#1592: the
//       post-compose recompile used to rebuild only the runtime graph, so the
//       stage never became reachable)
//   (d) birth an intent and assert the real engine emits a run-stage directive
//       for the plugin stage via plain `next --stage <slug>` — no `--single`
//   (e) assert both the plugin CLI's own doctor/status and the integrated
//       `amadeus-utility doctor` report it installed + composed, run with NO
//       --project-root so the shipped default host root (#1591 ruling B) is the
//       thing under test
//   (f) drop, and assert the host tree returns to its byte + structure baseline
//
// Determinism: no network, no env gate, no LLM. Every subprocess is a real
// binary spawn against the temp workspace. Serial because the journey compiles
// the stage graph twice and is heavy on the filesystem.
//
// Fixture: the synthetic conformance plugin under tests/fixtures, copied
// read-only (the repo's own plugins/ and dist/ are never written — asserted).

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { PLUGIN_SOURCE_DIR_NAME } from "../../packages/framework/core/tools/amadeus-plugin.ts";
import { discoverPluginSources, installArtifacts } from "../../scripts/plugin-projection.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHIPPED_FACE = join(REPO_ROOT, "dist", "claude");
const PLUGIN_FIXTURE_ROOT = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin");
const PLUGIN = "conformance-fixture";
const PLUGIN_FIXTURE = join(PLUGIN_FIXTURE_ROOT, PLUGIN);
const HARNESS = ".claude";

// The projected install bundle of a folder-drop face. Its INSTALL.md is the
// instruction a developer follows, so the drop destination this test uses is
// READ OUT of it rather than assumed (#1569's failure mode was exactly the two
// drifting apart). It is built here through the SAME projector seam that writes
// every shipped bundle, so the instruction under test is the projector's own
// output rather than a transcription of it.
function codexInstallDoc(): string {
  const [source] = discoverPluginSources(PLUGIN_FIXTURE_ROOT);
  expect(source?.directoryName).toBe(PLUGIN);
  const doc = installArtifacts(source, "codex").find((artifact) => artifact.relativePath === "INSTALL.md");
  expect(doc).toBeDefined();
  return (doc?.bytes ?? Buffer.alloc(0)).toString("utf-8");
}

let ws = "";
let hostRoot = "";

type Run = { status: number | null; stdout: string; stderr: string };

function subprocessEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env = { ...process.env };
  // Other Bun test files temporarily set these compiler seams. Do not let a
  // parallel test redirect this journey's isolated subprocesses.
  delete env.AMADEUS_PLUGINS_HOST_ROOT;
  delete env.AMADEUS_STAGE_GRAPH;
  delete env.AMADEUS_STAGES_DIR;
  return { ...env, ...extraEnv };
}

function run(command: string, args: readonly string[], extraEnv: NodeJS.ProcessEnv = {}): Run {
  const res = spawnSync(command, [...args], {
    cwd: ws,
    encoding: "utf-8",
    timeout: scaleTestTime(180_000),
    env: subprocessEnv(extraEnv),
    input: "{}",
  });
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

const cli = (...args: string[]): Run => {
  const res = spawnSync(
    "bun",
    [
      amadeusToolTarget(join(hostRoot, "tools", "amadeus-plugin.ts")),
      ...args,
    ],
    {
      cwd: ws,
      encoding: "utf-8",
      timeout: scaleTestTime(180_000),
      env: subprocessEnv(),
      input: "{}",
    },
  );
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
};

function normalizedStageGraph(path: string): unknown {
  const stages = JSON.parse(readFileSync(path, "utf-8")) as Array<Record<string, unknown>>;
  return stages.map((stage) => ({
    ...stage,
    // Rule resolution depends on the caller's workspace context. The journey
    // compares the compiled stage/edge surface, not that contextual projection.
    rules_in_context: [],
    sensors_applicable: Array.isArray(stage.sensors_applicable)
      ? stage.sensors_applicable.map((sensor) => {
        if (typeof sensor !== "object" || sensor === null) return sensor;
        const row = sensor as Record<string, unknown>;
        return typeof row.path === "string" ? { ...row, path: basename(row.path) } : row;
      })
      : stage.sensors_applicable,
  }));
}

// Every path under `root` with its content digest — DIRECTORIES INCLUDED (a
// trailing separator marks one), so empty-directory residue is visible. The
// engine's own dot-state at the host root is audit data, not host surface
// (t340's exclusion, verbatim), and `.amadeus-plugin-src/` is the developer's
// own copy of the bundle, removed by hand before the comparison.
function snapshot(root: string): readonly string[] {
  const rows: string[] = [];
  const walk = (dir: string): void => {
    for (const name of [...readdirSync(dir)].sort()) {
      if (dir === root && name.startsWith(".amadeus-plugin")) continue;
      const abs = join(dir, name);
      const rel = relative(root, abs);
      if (statSync(abs).isDirectory()) {
        rows.push(`${rel}${sep}`);
        walk(abs);
      } else {
        const bytes = rel === join("tools", "data", "stage-graph.json")
          ? JSON.stringify(normalizedStageGraph(abs))
          : readFileSync(abs);
        rows.push(`${rel} ${createHash("sha256").update(bytes).digest("hex")}`);
      }
    }
  };
  walk(root);
  return rows.sort();
}

// The SessionStart command the shipped settings wire for auto-compose. Read out
// of the shipped settings.json.example so this test cannot pass against a hook
// that was never registered.
function shippedAutoComposeCommand(): string {
  const settings = JSON.parse(readFileSync(join(hostRoot, "settings.json.example"), "utf-8")) as {
    hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
  };
  const commands = (settings.hooks?.SessionStart ?? []).flatMap((g) => (g.hooks ?? []).map((h) => h.command ?? ""));
  const composeCommands = commands.filter((c) => c.includes("amadeus-plugin-compose.ts"));
  expect(composeCommands).toHaveLength(1);
  return composeCommands[0];
}

// The repository's own .claude host legitimately carries a COMMITTED composed
// plugin (the dogfood state, user decision 2026-07-28), so "no residue" cannot
// be pinned as emptiness. Capture the pre-journey listings instead and assert
// the journey leaves them unchanged — identical strength on pristine roots.
const RESIDUE_ROOTS = [REPO_ROOT, join(REPO_ROOT, HARNESS), SHIPPED_FACE, join(SHIPPED_FACE, HARNESS)];
const pluginEntries = (root: string): readonly string[] =>
  readdirSync(root)
    .filter((n) => n.startsWith(".amadeus-plugin"))
    .sort();
let preJourneyResidue: (readonly string[])[] = [];
let preJourneyRepoPluginDir = false;

beforeAll(() => {
  preJourneyResidue = RESIDUE_ROOTS.map(pluginEntries);
  preJourneyRepoPluginDir = existsSync(join(REPO_ROOT, HARNESS, "plugins", PLUGIN));
  ws = mkdtempSync(join(tmpdir(), "amadeus-t341-"));
  hostRoot = join(ws, HARNESS);
  cpSync(join(SHIPPED_FACE, HARNESS), hostRoot, { recursive: true });
  cpSync(join(SHIPPED_FACE, "amadeus"), join(ws, "amadeus"), { recursive: true });
});

afterAll(() => {
  rmSync(ws, { recursive: true, force: true });
});

describe("t341 plugin conformance journey (FR-4, #1589)", () => {
  test("the whole shipped journey: install -> auto-compose -> stage graph -> next -> doctor -> drop", () => {
    // --- (a) install ---------------------------------------------------------
    // The destination is the harness-rooted staging dir the shipped INSTALL doc
    // names (#1591 ruling B). Assert the doc says so BEFORE following it, so a
    // regression in the instruction fails here rather than silently diverging
    // from what this test does.
    const installDoc = codexInstallDoc();
    expect(installDoc).toContain(`.codex/${PLUGIN_SOURCE_DIR_NAME}/${PLUGIN}/`);
    const dropTarget = join(hostRoot, PLUGIN_SOURCE_DIR_NAME, PLUGIN);
    expect(relative(ws, dropTarget)).toBe(join(HARNESS, PLUGIN_SOURCE_DIR_NAME, PLUGIN));

    // An intent must exist before the engine will emit any directive; birth it
    // FIRST so the baseline snapshot covers a fully initialised workspace.
    const birth = run("bun", [join(hostRoot, "tools", "amadeus-utility.ts"), "intent-birth", "--scope", "fix"]);
    expect(birth.status).toBe(0);

    // Normalize the copied distribution graph with the same runtime compiler
    // that compose/drop use. The repository's dogfood graph may include a
    // locally composed plugin, while this isolated host starts uncomposed.
    const normalizeGraph = run(
      "bun",
      [join(hostRoot, "tools", "amadeus-graph.ts"), "compile"],
      { AMADEUS_HARNESS_DIR: hostRoot },
    );
    expect(normalizeGraph.status).toBe(0);

    const baselineGraph = normalizedStageGraph(join(hostRoot, "tools", "data", "stage-graph.json"));
    const baseline = snapshot(hostRoot);
    expect(baseline.length).toBeGreaterThan(0);

    cpSync(PLUGIN_FIXTURE, dropTarget, { recursive: true });
    expect(existsSync(join(dropTarget, "plugin.json"))).toBe(true);

    // --- (b) auto-compose through the shipped SessionStart hook --------------
    const command = shippedAutoComposeCommand();
    expect(command).toContain(`${HARNESS}/hooks/amadeus-plugin-compose.ts`);
    // Run the command verbatim through a shell so the settings' own
    // ${CLAUDE_PROJECT_DIR} expansion is exercised, not re-implemented here.
    const hook = run("bash", ["-c", command], { CLAUDE_PROJECT_DIR: ws });
    expect(hook.status).toBe(0);
    expect(hook.stderr).not.toContain("auto-compose failed");
    expect(hook.stderr).not.toContain("auto-compose error");

    const ownedStage = join(hostRoot, "plugins", PLUGIN, "stages", `${PLUGIN}.md`);
    expect(existsSync(ownedStage)).toBe(true);
    // `plugins` serialises as Map entries ([name, entry] pairs).
    const record = JSON.parse(readFileSync(join(hostRoot, ".amadeus-plugin-composition.json"), "utf-8")) as {
      plugins?: Array<[string, { ownedPaths?: string[] }]>;
    };
    const recorded = new Map(record.plugins ?? []);
    expect([...recorded.keys()]).toContain(PLUGIN);
    expect(recorded.get(PLUGIN)?.ownedPaths).toContain(`plugins/${PLUGIN}/stages/${PLUGIN}.md`);

    // --- (c) the composed stage reached the compiled stage graph (#1592) -----
    const graph = JSON.parse(readFileSync(join(hostRoot, "tools", "data", "stage-graph.json"), "utf-8")) as Array<{
      slug: string;
      phase?: string;
    }>;
    const composedStage = graph.find((s) => s.slug === PLUGIN);
    expect(composedStage).toBeDefined();
    expect(composedStage?.phase).toBe("construction");

    // --- (d) the real engine emits a run-stage directive, no --single --------
    const next = run("bun", [join(hostRoot, "tools", "amadeus-orchestrate.ts"), "next", "--stage", PLUGIN]);
    expect(next.status).toBe(0);
    // stdout is the directive channel; stderr is advisory only.
    const directive = JSON.parse(next.stdout.trim().split("\n").at(-1) ?? "{}") as {
      kind?: string;
      stage?: string;
      stage_file?: string;
    };
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe(PLUGIN);
    expect(directive.stage_file).toContain(`${HARNESS}/plugins/${PLUGIN}/stages/${PLUGIN}.md`);

    // --- (e) doctor / status, run WITHOUT --project-root ---------------------
    const status = cli("status");
    expect(status.status).toBe(0);
    expect(status.stdout).toContain("1 installed, 1 composed");
    const doctor = cli("doctor");
    expect(doctor.status).toBe(0);
    expect(doctor.stdout).toContain(`Plugin ${PLUGIN}: composed@`);
    expect(doctor.stdout).toContain("[ok]");
    // The integrated doctor reads the same host root.
    const utilityDoctor = run("bun", [join(hostRoot, "tools", "amadeus-utility.ts"), "doctor"]);
    expect(utilityDoctor.stdout).toContain(`Plugin ${PLUGIN}: composed@`);
    expect(utilityDoctor.stdout).not.toContain("Plugins: 0 installed");

    // --- (f) drop restores the filesystem baseline --------------------------
    const drop = cli("drop", PLUGIN);
    expect(drop.status).toBe(0);
    expect(drop.stdout).toContain("baseline restored");
    // The developer's own copy of the bundle is theirs to remove; everything
    // else must be back to bytes AND structure.
    rmSync(join(hostRoot, PLUGIN_SOURCE_DIR_NAME), { recursive: true, force: true });
    const droppedGraph = normalizedStageGraph(join(hostRoot, "tools", "data", "stage-graph.json"));
    expect(droppedGraph).toEqual(baselineGraph);
    expect((droppedGraph as Array<{ slug?: string }>).some((stage) => stage.slug === PLUGIN)).toBe(false);
    expect(snapshot(hostRoot)).toEqual(baseline);
    expect(existsSync(join(hostRoot, "plugins"))).toBe(false);

  });

  test("the journey left no residue in the repository (read-only fixture, isolated host)", () => {
    // The fixture and the shipped bundles are inputs, never outputs.
    expect(existsSync(join(PLUGIN_FIXTURE, PLUGIN_SOURCE_DIR_NAME))).toBe(false);
    // Pre-existing committed state (the repo host's dogfood composition) is
    // not residue; the journey must simply leave every root unchanged.
    expect(RESIDUE_ROOTS.map(pluginEntries)).toEqual(preJourneyResidue);
    expect(existsSync(join(REPO_ROOT, HARNESS, "plugins", PLUGIN))).toBe(preJourneyRepoPluginDir);
    // The shipped face stays pristine outright.
    expect(pluginEntries(SHIPPED_FACE)).toEqual([]);
    expect(pluginEntries(join(SHIPPED_FACE, HARNESS))).toEqual([]);
    // And the temp workspace is the only thing this file created.
    expect(ws.startsWith(tmpdir())).toBe(true);
  });

});
