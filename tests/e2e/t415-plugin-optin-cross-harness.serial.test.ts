// covers: hook:amadeus-plugin-compose, adapter:session-start, plugin:opencode
// size: large

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeBackend } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";
// The plugin-owned state file a run of the plugin's evaluator leaves behind.
// Its absence on disk is what "startup never ran the plugin" means.
const PLUGIN_VERDICT_STATE = ".amadeus-plugin-conformance-fixture-verdict.json";

type Face = { name: string; dist: string; host: string; adapter?: string; kind: "hook" | "adapter" | "opencode" };

const FACES: readonly Face[] = [
  { name: "claude", dist: "claude", host: ".claude", kind: "hook" },
  { name: "codex", dist: "codex", host: ".codex", adapter: "amadeus-codex-adapter.ts", kind: "adapter" },
  { name: "cursor", dist: "cursor", host: ".cursor", adapter: "amadeus-cursor-adapter.ts", kind: "adapter" },
  { name: "kimi", dist: "kimi", host: ".kimi-code", adapter: "amadeus-kimi-adapter.ts", kind: "adapter" },
  { name: "kiro", dist: "kiro", host: ".kiro", adapter: "amadeus-kiro-adapter.ts", kind: "adapter" },
  { name: "kiro-ide", dist: "kiro-ide", host: ".kiro", adapter: "amadeus-kiro-adapter.ts", kind: "adapter" },
  { name: "opencode", dist: "opencode", host: ".opencode", kind: "opencode" },
];

const HOSTS = [".claude", ".codex", ".cursor", ".kimi-code", ".kiro", ".opencode", ".pi"] as const;

// Hosts carried in every fixture that no FACES row drives. Pi is a promoted
// dogfood surface (#2363), but its session lifecycle lives in its extensions
// and drivers rather than a hook or adapter this test can fire — so it is not
// a face here, only a host the cross-contamination invariant must cover.
const HOST_ONLY_DIST: Readonly<Record<string, string>> = { ".pi": "pi" };
let projects: string[] = [];

function subprocessEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.AMADEUS_PLUGINS_HOST_ROOT;
  delete env.AMADEUS_STAGE_GRAPH;
  delete env.AMADEUS_STAGES_DIR;
  return { ...env, ...extraEnv };
}

afterEach(() => {
  for (const project of projects) rmSync(project, { recursive: true, force: true });
  projects = [];
});

function freshProject(face: Face, selected = true): string {
  const project = mkdtempSync(join(tmpdir(), `amadeus-t415-${face.name}-`));
  projects.push(project);
  for (const host of HOSTS) {
    let dist: string | undefined;
    if (host === ".kiro") {
      dist = face.dist.startsWith("kiro") ? face.dist : "kiro";
    } else {
      dist = FACES.find((candidate) => candidate.host === host)?.dist ?? HOST_ONLY_DIST[host];
    }
    if (dist === undefined) throw new Error(`no dist tree for ${host}`);
    cpSync(join(REPO_ROOT, "dist", dist, host), join(project, host), { recursive: true });
  }
  mkdirSync(join(project, "amadeus"), { recursive: true });
  writeFileSync(
    join(project, "amadeus", "config.json"),
    `${JSON.stringify({ plugin: { activation: { names: selected ? [PLUGIN] : [] } } }, null, 2)}\n`,
  );
  cpSync(FIXTURE, join(project, "plugins", PLUGIN), { recursive: true });
  return project;
}

async function fire(face: Face, project: string): Promise<{ stdout: string; stderr: string }> {
  const host = join(project, face.host);
  if (face.kind === "opencode") {
    const program = "const loaded = await import(process.argv[1]); const plugin = await loaded.default({worktree: process.argv[2]}); await plugin.event({event:{type:'session.created'}});";
    const result = spawnSync("bun", ["-e", program, join(host, "plugins", "amadeus-opencode-plugin.ts"), project], {
      cwd: project,
      encoding: "utf-8",
      timeout: scaleTestTime(120_000),
      env: subprocessEnv(),
    });
    expect(result.error, `${face.name} process error`).toBeUndefined();
    const output = { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
    expect(result.status, `${face.name} exited ${result.status}\nstdout:\n${output.stdout}\nstderr:\n${output.stderr}`).toBe(0);
    return output;
  }
  const target = face.kind === "hook"
    ? join(host, "hooks", "amadeus-plugin-compose.ts")
    : join(host, "hooks", face.adapter as string);
  const args = face.kind === "adapter" ? [amadeusToolTarget(target), "session-start"] : [amadeusToolTarget(target)];
  const result = spawnSync("bun", args, {
    cwd: project,
    input: "{}",
    encoding: "utf-8",
    timeout: scaleTestTime(120_000),
    env: subprocessEnv({ CLAUDE_PROJECT_DIR: project }),
  });
  expect(result.error, `${face.name} process error`).toBeUndefined();
  const output = { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  expect(result.status, `${face.name} exited ${result.status}\nstdout:\n${output.stdout}\nstderr:\n${output.stderr}`).toBe(0);
  return output;
}

function assertOnlyCurrentHostComposed(project: string, current: string): void {
  for (const host of HOSTS) {
    const root = join(project, host);
    const currentHost = host === current;
    expect(createNodeBackend(root).readComposition().plugins.has(PLUGIN), `${host} composition`).toBe(currentHost);
    expect(existsSync(join(root, ".amadeus-plugin-src", PLUGIN)), `${host} staging`).toBe(currentHost);
    expect(existsSync(join(root, PLUGIN_VERDICT_STATE)), `${host} must not auto-run the plugin evaluator`).toBe(false);
  }
}

describe("t415 fresh opt-in lifecycle across seven faces and seven hosts", () => {
  for (const face of FACES) {
    test(`${face.name}: its real startup lifecycle materializes only ${face.host}`, async () => {
      const project = freshProject(face);
      await fire(face, project);
      assertOnlyCurrentHostComposed(project, face.host);
    });
  }

  test("unselected startup across every face has zero plugin impact and never runs the plugin", async () => {
    for (const face of FACES) {
      const project = freshProject(face, false);
      const config = readFileSync(join(project, "amadeus", "config.json"), "utf-8");
      const graphs = new Map(HOSTS.map((host) => [host, readFileSync(join(project, host, "tools", "data", "stage-graph.json"), "utf-8")]));
      const output = await fire(face, project);
      expect(output.stderr).not.toContain(PLUGIN);
      expect(readFileSync(join(project, "amadeus", "config.json"), "utf-8")).toBe(config);
      for (const host of HOSTS) {
        const root = join(project, host);
        expect(createNodeBackend(root).readComposition().plugins.size, `${face.name}/${host} composition`).toBe(0);
        expect(existsSync(join(root, ".amadeus-plugin-src")), `${face.name}/${host} staging`).toBe(false);
        expect(existsSync(join(root, PLUGIN_VERDICT_STATE)), `${face.name}/${host} plugin state`).toBe(false);
        expect(readFileSync(join(root, "tools", "data", "stage-graph.json"), "utf-8")).toBe(graphs.get(host)!);
      }
    }
  });
});
