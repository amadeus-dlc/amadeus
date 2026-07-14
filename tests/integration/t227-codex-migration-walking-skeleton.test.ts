// Codex reference-harness walking skeleton for upstream-v2 migration. This
// test follows commands emitted by the installed public engine and observes
// only process output, Git, hooks, and workspace state.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, isAbsolute, join, relative } from "node:path";
import { consumeMigrationStopLatch } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  createUpstreamV2Fixture,
  projectSnapshot,
  type UpstreamV2Fixture,
} from "../helpers/upstream-v2-fixture.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const TEST_BIN_DIR = ".test-bin";

interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

function codexEnv(project: UpstreamV2Fixture): NodeJS.ProcessEnv {
  return {
    ...process.env,
    AMADEUS_HARNESS_DIR: ".codex",
    CLAUDE_PROJECT_DIR: project.projectDir,
    PATH: `${join(project.projectDir, TEST_BIN_DIR)}${delimiter}${process.env.PATH ?? ""}`,
  };
}

function installCodexHarness(project: UpstreamV2Fixture): void {
  for (const entry of [".codex", ".agents"] as const) {
    cpSync(
      join(REPO_ROOT, "dist", "codex", entry),
      join(project.projectDir, entry),
      { recursive: true },
    );
  }
  for (const name of ["config.toml", "hooks.json"] as const) {
    cpSync(
      join(project.projectDir, ".codex", `${name}.example`),
      join(project.projectDir, ".codex", name),
    );
  }
  const testBin = join(project.projectDir, TEST_BIN_DIR);
  mkdirSync(testBin, { recursive: true });
  if (process.platform === "win32") {
    writeFileSync(
      join(testBin, "codex.cmd"),
      "@echo off\r\necho codex-cli 0.139.0\r\n",
      "utf-8",
    );
  } else {
    writeFileSync(
      join(testBin, "codex"),
      "#!/bin/sh\nprintf 'codex-cli 0.139.0\\n'\n",
      { encoding: "utf-8", mode: 0o755 },
    );
  }
  project.commitAll("test: install Codex migration harness");
}

function runBun(
  project: UpstreamV2Fixture,
  args: readonly string[],
  input?: string,
): CommandResult {
  const run = spawnSync(process.execPath, args, {
    cwd: project.projectDir,
    encoding: "utf-8",
    env: codexEnv(project),
    input,
  });
  return {
    status: run.status ?? -1,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
  };
}

function runPublicMigrationRoute(project: UpstreamV2Fixture): Record<string, unknown> {
  const run = runBun(project, [
    join(project.projectDir, ".codex", "tools", "amadeus-orchestrate.ts"),
    "next",
    "--migrate",
    "--project-dir",
    project.projectDir,
  ]);
  expect(run.status).toBe(0);
  expect(run.stderr).toBe("");
  return JSON.parse(run.stdout) as Record<string, unknown>;
}

function migrationCommands(message: string): {
  dryRun: string;
  apply: string;
} {
  const commands = [...message.matchAll(/`(bun [^`\r\n]*amadeus-utility\.ts migrate[^`\r\n]*)`/g)]
    .map((match) => match[1]);
  expect(commands).toHaveLength(2);
  return { dryRun: commands[0], apply: commands[1] };
}

function runDirectiveCommand(
  project: UpstreamV2Fixture,
  command: string,
): CommandResult {
  const words = command.split(" ");
  expect(words[0]).toBe("bun");
  return runBun(project, words.slice(1));
}

function runCodexAdapter(
  project: UpstreamV2Fixture,
  target: "runtime-compile" | "stop",
  payload: Record<string, unknown>,
): CommandResult {
  return runBun(
    project,
    [
      join(project.projectDir, ".codex", "hooks", "amadeus-codex-adapter.ts"),
      target,
    ],
    JSON.stringify({ ...payload, cwd: project.projectDir }),
  );
}

function finishMigrationToolTurn(
  project: UpstreamV2Fixture,
  sessionId: string,
  turn: string,
  command: string,
  toolOutput: string,
): void {
  const postTool = runCodexAdapter(project, "runtime-compile", {
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    turn_id: `${turn}-post-tool`,
    tool_use_id: `${turn}-migration-call`,
    tool_name: "Bash",
    tool_input: { command },
    tool_response: toolOutput,
  });
  expect(postTool.status).toBe(0);
  expect(postTool.stdout).toBe("");
  expect(postTool.stderr).toBe("");

  const stop = runCodexAdapter(project, "stop", {
    hook_event_name: "Stop",
    session_id: sessionId,
    turn_id: `${turn}-stop`,
    stop_hook_active: false,
    last_assistant_message: toolOutput,
  });
  expect(stop.status).toBe(0);
  expect(stop.stdout).toBe("");
  expect(stop.stderr).toBe("");
}

function gitIndexBytes(project: UpstreamV2Fixture): Buffer {
  const raw = project.git(["rev-parse", "--git-path", "index"]).trim();
  return readFileSync(isAbsolute(raw) ? raw : join(project.projectDir, raw));
}

function workflowPosition(state: string): string[] {
  return state
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- [") || line.startsWith("- **Current Stage**:"));
}

test("installed Codex migration route reaches apply without birthing or advancing an Intent", () => {
  const project = createUpstreamV2Fixture();
  const sessionId = `codex-walking-skeleton-${process.pid}-${Date.now()}`;
  try {
    installCodexHarness(project);
    const snapshotBefore = projectSnapshot(project.projectDir);
    const indexBefore = gitIndexBytes(project);
    const workflowBefore = workflowPosition(readFileSync(project.statePath, "utf-8"));

    const directive = runPublicMigrationRoute(project);
    expect(directive.kind).toBe("print");
    const message = String(directive.message);
    expect(message).toContain("1. Yes");
    expect(message).toContain("2. No");
    expect(message).toContain("do NOT birth or advance an Intent");
    const commands = migrationCommands(message);

    const dryRun = runDirectiveCommand(project, commands.dryRun);
    expect(dryRun.status).toBe(0);
    expect(dryRun.stderr).toBe("");
    expect(dryRun.stdout).toContain("Mode: dry-run");
    expect(dryRun.stdout).toContain("Status: ready");
    expect(dryRun.stdout).toContain("No files were changed.");
    finishMigrationToolTurn(
      project,
      sessionId,
      "dry-run",
      commands.dryRun,
      dryRun.stdout,
    );

    // This is the deterministic No boundary named by the directive: when no
    // apply command runs, the filesystem and Git index remain byte-identical.
    expect(projectSnapshot(project.projectDir)).toBe(snapshotBefore);
    expect(gitIndexBytes(project)).toEqual(indexBefore);
    expect(existsSync(project.destinationRoot)).toBe(false);

    const apply = runDirectiveCommand(project, commands.apply);
    if (apply.status !== 0) {
      throw new Error(
        `Codex-directed migration apply failed (exit ${apply.status})\nstdout:\n${apply.stdout}\nstderr:\n${apply.stderr}`,
      );
    }
    expect(apply.stderr).toBe("");
    expect(apply.stdout).toContain("Mode: apply");
    expect(apply.stdout).toContain("Status: applied");

    // Prove the following silent Stop is the migration carve-out, not a
    // fail-open hook: without a migration latch, the migrated active workflow
    // still blocks a different session from stopping.
    const controlStop = runCodexAdapter(project, "stop", {
      hook_event_name: "Stop",
      session_id: `${sessionId}-control`,
      turn_id: "control-stop",
      stop_hook_active: false,
      last_assistant_message: apply.stdout,
    });
    expect(controlStop.status).toBe(0);
    expect(controlStop.stderr).toBe("");
    const controlDecision = JSON.parse(controlStop.stdout) as {
      decision?: string;
    };
    expect(controlDecision.decision).toBe("block");
    finishMigrationToolTurn(
      project,
      sessionId,
      "apply",
      commands.apply,
      apply.stdout,
    );

    expect(existsSync(project.sourceRoot)).toBe(false);
    expect(existsSync(project.destinationRoot)).toBe(true);
    const relativeState = relative(project.sourceRoot, project.statePath);
    const migratedState = join(
      project.destinationRoot,
      dirname(relativeState),
      "amadeus-state.md",
    );
    expect(workflowPosition(readFileSync(migratedState, "utf-8"))).toEqual(
      workflowBefore,
    );

    const intentsRoot = join(
      project.destinationRoot,
      "spaces",
      "default",
      "intents",
    );
    const recordDirs = readdirSync(intentsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
    expect(recordDirs).toEqual(project.records.map((record) => record.recordDir).sort());
    const registry = JSON.parse(
      readFileSync(join(intentsRoot, "intents.json"), "utf-8"),
    ) as Array<{ dirName?: string }>;
    expect(registry.map((row) => row.dirName).sort()).toEqual(recordDirs);

    expect(project.git(["diff", "--name-only"])).toBe("");
    expect(project.git(["diff", "--cached", "--name-only"]).trim()).not.toBe("");
  } finally {
    consumeMigrationStopLatch(project.projectDir, sessionId);
    project.cleanup();
  }
});
