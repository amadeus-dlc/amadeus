// covers: script:scripts/plugin-projection.ts, tool:amadeus-plugin, harness:codex
// size: large

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSelfInstallProjection,
  SELF_INSTALL_HARNESSES,
  type SelfInstallHarness,
} from "../../scripts/plugin-projection.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLUGIN = "github-pr-convergence";
// A plugin's stage slug is its own; it need not repeat the plugin directory name.
const PLUGIN_STAGE = "pr-convergence";
const HOST: Record<SelfInstallHarness, string> = {
  claude: ".claude",
  codex: ".codex",
  cursor: ".cursor",
  opencode: ".opencode",
  kimi: ".kimi-code",
  pi: ".pi",
};

let project = "";

afterEach(() => {
  if (project !== "") rmSync(project, { recursive: true, force: true });
  project = "";
});

function run(projectRoot: string, command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf-8",
    timeout: scaleTestTime(120_000),
    env: { ...process.env },
  });
  expect(result.error, `${command} process error`).toBeUndefined();
  expect(result.status, `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}\n${result.stderr ?? ""}`).toBe(0);
  return result.stdout ?? "";
}

function writeProjection(root: string, harness: SelfInstallHarness): void {
  const projection = buildSelfInstallProjection(harness, REPO_ROOT);
  for (const [relativePath, bytes] of projection.artifacts ?? []) {
    const destination = join(root, ...relativePath.split("/"));
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
  }
}

function freshProjectedCheckout(selected = true): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t416-fresh-git-"));
  for (const harness of SELF_INSTALL_HARNESSES) {
    const host = HOST[harness];
    cpSync(join(REPO_ROOT, "dist", harness, host), join(root, host), { recursive: true });
  }
  cpSync(join(REPO_ROOT, "dist", "codex", ".agents"), join(root, ".agents"), { recursive: true });
  mkdirSync(join(root, "amadeus"), { recursive: true });
  if (selected) cpSync(join(REPO_ROOT, "amadeus", "config.json"), join(root, "amadeus", "config.json"));
  else {
    writeFileSync(
      join(root, "amadeus", "config.json"),
      `${JSON.stringify({ plugin: { activation: { names: [] } } }, null, 2)}\n`,
    );
  }
  cpSync(join(REPO_ROOT, "amadeus", "spaces", "default", "memory"), join(root, "amadeus", "spaces", "default", "memory"), {
    recursive: true,
  });
  cpSync(join(REPO_ROOT, "plugins"), join(root, "plugins"), { recursive: true });
  cpSync(join(REPO_ROOT, ".gitignore"), join(root, ".gitignore"));
  if (selected) for (const harness of SELF_INSTALL_HARNESSES) writeProjection(root, harness);
  run(root, "git", ["init", "-q"]);
  run(root, "git", ["config", "user.email", "amadeus-test@example.invalid"]);
  run(root, "git", ["config", "user.name", "Amadeus Test"]);
  run(root, "git", ["add", "-A"]);
  run(root, "git", ["commit", "-qm", "fixture"]);
  return root;
}

function compose(root: string, harness: SelfInstallHarness): string {
  const host = HOST[harness];
  return run(root, "bun", [
    join(root, host, "tools", "amadeus-plugin.ts"),
    "compose",
    "--if-stale",
    "--project-root",
    join(root, host),
  ]);
}

function assertPluginStage(root: string, harness: SelfInstallHarness): void {
  const graph = JSON.parse(readFileSync(join(root, HOST[harness], "tools", "data", "stage-graph.json"), "utf-8")) as Array<{ slug?: string }>;
  expect(graph.some((stage) => stage.slug === PLUGIN_STAGE), `${harness} graph`).toBe(true);
}

describe("t416 committed self projection in a fresh Git checkout", () => {
  test("is usable before startup, stays clean on no-op, and repairs only the current host", () => {
    project = freshProjectedCheckout();
    for (const harness of SELF_INSTALL_HARNESSES) assertPluginStage(project, harness);

    expect(existsSync(join(project, ".claude", "skills", `amadeus-${PLUGIN_STAGE}`, "SKILL.md"))).toBe(true);
    expect(existsSync(join(project, ".agents", "skills", `amadeus-${PLUGIN_STAGE}`, "SKILL.md"))).toBe(true);
    expect(existsSync(join(project, ".kimi-code", "skills", `amadeus-${PLUGIN_STAGE}`, "SKILL.md"))).toBe(true);
    expect(existsSync(join(project, ".cursor", "commands", "amadeus.md"))).toBe(true);
    expect(existsSync(join(project, ".opencode", "commands", "amadeus.md"))).toBe(true);
    expect(existsSync(join(project, ".codex", "skills", `amadeus-${PLUGIN_STAGE}`))).toBe(false);
    expect(existsSync(join(project, ".kiro"))).toBe(false);

    for (const harness of SELF_INSTALL_HARNESSES) {
      expect(compose(project, harness)).toContain("record already current (no-op)");
      expect(compose(project, harness)).toContain("record already current (no-op)");
      expect(run(project, "git", ["status", "--porcelain"]), `${harness} no-op dirtied Git`).toBe("");
    }

    const codexStage = join(project, ".codex", "plugins", PLUGIN, "stages", `${PLUGIN_STAGE}.md`);
    const expectedStage = readFileSync(codexStage);
    rmSync(codexStage);
    expect(compose(project, "codex")).toContain("composed 1 plugin(s)");
    expect(readFileSync(codexStage)).toEqual(expectedStage);
    expect(run(project, "git", ["status", "--porcelain"]), "Codex repair changed committed bytes or a sibling face").toBe("");

    writeFileSync(codexStage, "corrupted projection\n");
    expect(compose(project, "codex")).toContain("composed 1 plugin(s)");
    expect(readFileSync(codexStage)).toEqual(expectedStage);
    expect(run(project, "git", ["status", "--porcelain"]), "Codex drift repair changed committed bytes or a sibling face").toBe("");
  }, scaleTestTime(120_000));

  test("an unselected checkout remains neutral and Kiro stays package-only", () => {
    project = freshProjectedCheckout(false);
    for (const harness of SELF_INSTALL_HARNESSES) {
      const graph = JSON.parse(readFileSync(join(project, HOST[harness], "tools", "data", "stage-graph.json"), "utf-8")) as Array<{ slug?: string }>;
      expect(graph.some((stage) => stage.slug === PLUGIN_STAGE), `${harness} neutral graph`).toBe(false);
      expect(compose(project, harness)).toContain("record already current (no-op)");
      expect(compose(project, harness)).toContain("record already current (no-op)");
      expect(run(project, "git", ["status", "--porcelain"]), `${harness} neutral startup dirtied Git`).toBe("");
    }
    expect(existsSync(join(project, ".agents", "skills", `amadeus-${PLUGIN_STAGE}`))).toBe(false);
    expect(existsSync(join(project, ".claude", "skills", `amadeus-${PLUGIN_STAGE}`))).toBe(false);
    expect(existsSync(join(project, ".kimi-code", "skills", `amadeus-${PLUGIN_STAGE}`))).toBe(false);
    expect(existsSync(join(project, ".kiro"))).toBe(false);
    expect(existsSync(join(REPO_ROOT, "dist", "plugins", PLUGIN, "kiro", "plugins", PLUGIN, "plugin.json"))).toBe(true);
    expect(existsSync(join(REPO_ROOT, "dist", "plugins", PLUGIN, "kiro-ide", "plugins", PLUGIN, "plugin.json"))).toBe(true);
  }, scaleTestTime(120_000));
});
