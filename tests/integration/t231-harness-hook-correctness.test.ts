import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { spawnHookWithRuntime as spawnCodexHook } from "../../packages/framework/harness/codex/hooks/amadeus-codex-hook-runtime.ts";
import { renderClaudeHookCommand } from "../../packages/framework/harness/claude/manifest.ts";
import { spawnHookWithRuntime as spawnCursorHook } from "../../packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts";
import { spawnHookWithRuntime as spawnKiroHook } from "../../packages/framework/harness/kiro/hooks/amadeus-kiro-hook-runtime.ts";
import { spawnHookWithRuntime as spawnKiroIdeHook } from "../../packages/framework/harness/kiro-ide/hooks/amadeus-kiro-hook-runtime.ts";
import {
  AMADEUS_SRC,
  createTestProject,
  REPO_ROOT,
  seedAuditFile,
  seedStateFile,
  seededAuditShard,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const KIRO_IDE_SRC = join(REPO_ROOT, "dist", "kiro-ide", ".kiro");
const CLAUDE_SRC = join(REPO_ROOT, "dist", "claude", ".claude");
const temporaryProjects: string[] = [];
const NON_TRUE_TOOL_SUCCESS = [
  { label: "missing", present: false, value: undefined },
  { label: "null", present: true, value: null },
  { label: "string", present: true, value: "true" },
  { label: "number", present: true, value: 1 },
  { label: "false", present: true, value: false },
] as const;

afterEach(() => {
  for (const project of temporaryProjects.splice(0)) {
    rmSync(project, { recursive: true, force: true });
  }
});

function scratchProject(): string {
  const project = createTestProject();
  temporaryProjects.push(project);
  cpSync(KIRO_IDE_SRC, join(project, ".kiro"), { recursive: true });
  cpSync(join(AMADEUS_SRC, "tools", "data"), join(project, ".kiro", "tools", "data"), {
    recursive: true,
  });
  seedStateFile(project, "state-brownfield-feature.md");
  seedAuditFile(project);
  return project;
}

function installCoreProbe(project: string, hookFile: string, label: string): void {
  writeFileSync(
    join(project, ".kiro", "hooks", hookFile),
    [
      'import { appendFileSync } from "node:fs";',
      "const input = await Bun.stdin.text();",
      `appendFileSync(process.env.T231_TRACE!, JSON.stringify({ label: ${JSON.stringify(label)}, input: JSON.parse(input), runtime: process.execPath, cwd: process.cwd() }) + "\\n");`,
    ].join("\n"),
  );
}

function runAdapter(
  project: string,
  target: string,
  context: unknown,
  extraEnv: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const trace = join(project, "trace.jsonl");
  const result = spawnSync(
    process.execPath,
    [join(project, ".kiro", "hooks", "amadeus-kiro-adapter.ts"), target],
    {
      cwd: project,
      input: "stdin-must-not-be-read",
      encoding: "utf8",
      timeout: 30_000,
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: project,
        USER_PROMPT: typeof context === "string" ? context : JSON.stringify(context),
        T231_TRACE: trace,
        ...extraEnv,
      },
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function runAdapterWithOpenStdin(
  project: string,
  target: string,
  context: unknown,
): Promise<{ status: number; stdout: string; stderr: string }> {
  const child = Bun.spawn({
    cmd: [process.execPath, join(project, ".kiro", "hooks", "amadeus-kiro-adapter.ts"), target],
    cwd: project,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: project,
      USER_PROMPT: JSON.stringify(context),
      T231_TRACE: join(project, "trace.jsonl"),
    },
  });
  const status = await child.exited;
  return {
    status,
    stdout: await new Response(child.stdout).text(),
    stderr: await new Response(child.stderr).text(),
  };
}

function readTrace(project: string): Array<Record<string, unknown>> {
  const trace = join(project, "trace.jsonl");
  if (!existsSync(trace)) return [];
  return readFileSync(trace, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("FR-4.13 spawnHookWithRuntime", () => {
  const harnesses = [
    ["codex", spawnCodexHook],
    ["cursor", spawnCursorHook],
    ["kiro", spawnKiroHook],
    ["kiro-ide", spawnKiroIdeHook],
  ] as const;

  for (const [harness, spawnHookWithRuntime] of harnesses) {
    test(`${harness}: uses the current Bun runtime and preserves the child contract`, () => {
      const root = mkdtempSync(join(tmpdir(), `amadeus-t231-${harness}-`));
      temporaryProjects.push(root);
      const workingDirectory = join(root, "workspace with spaces");
      mkdirSync(workingDirectory);
      const probe = join(root, "runtime-probe.ts");
      writeFileSync(
        probe,
        [
          "const stdin = await Bun.stdin.text();",
          "process.stdout.write(JSON.stringify({ runtime: process.execPath, argv: process.argv.slice(2), cwd: process.cwd(), stdin }));",
          "process.stderr.write('probe-stderr');",
          "process.exit(23);",
        ].join("\n"),
      );

      const result = spawnHookWithRuntime([probe, "first", "second"], {
        cwd: realpathSync(workingDirectory),
        stdin: Buffer.from("probe-stdin", "utf8"),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PATH: "/usr/bin:/bin" },
      });

      expect(result.exitCode).toBe(23);
      expect(result.signalCode).toBeUndefined();
      expect(result.stderr.toString()).toBe("probe-stderr");
      expect(JSON.parse(result.stdout.toString())).toEqual({
        runtime: process.execPath,
        argv: ["first", "second"],
        cwd: realpathSync(workingDirectory),
        stdin: "probe-stdin",
      });
    });
  }
});

describe("FR-4.14 Kiro IDE USER_PROMPT forwarding", () => {
  test("source contains no stdin read or timeout race", () => {
    const source = readFileSync(
      join(REPO_ROOT, "packages", "framework", "harness", "kiro-ide", "hooks", "amadeus-kiro-adapter.ts"),
      "utf8",
    );
    expect(source).not.toContain("Bun.stdin.text");
    expect(source).not.toContain("Promise.race");
    expect(source).not.toMatch(/setTimeout\([^\n]*2000/);
  });

  test("a successful relative fs_write exits with stdin left open and forwards one absolute Write payload in audit-first order", async () => {
    const project = scratchProject();
    installCoreProbe(project, "amadeus-audit-logger.ts", "audit");
    installCoreProbe(project, "amadeus-sensor-fire.ts", "sensor");

    const result = await runAdapterWithOpenStdin(project, "audit-and-sensors", {
      toolName: "fs_write",
      toolArgs: {},
      toolResult: "Created the src/example.ts file.",
      toolSuccess: true,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(readTrace(project)).toEqual([
      {
        label: "audit",
        input: {
          hook_event_name: "PostToolUse",
          tool_name: "Write",
          tool_input: { file_path: join(project, "src", "example.ts") },
        },
        runtime: process.execPath,
        cwd: project,
      },
      {
        label: "sensor",
        input: {
          hook_event_name: "PostToolUse",
          tool_name: "Write",
          tool_input: { file_path: join(project, "src", "example.ts") },
        },
        runtime: process.execPath,
        cwd: project,
      },
    ]);
  });

  for (const fixture of [
    {
      name: "append",
      toolName: "fs_append",
      result: "Appended the text to the src/append.ts file.",
      path: join("src", "append.ts"),
    },
    {
      name: "replace with occurrence suffix",
      toolName: "str_replace",
      result: "Replaced text in src/replace.ts (2 occurrences)",
      path: join("src", "replace.ts"),
    },
  ]) {
    test(`successful ${fixture.name} forwards one absolute Edit payload in audit-first order`, () => {
      const project = scratchProject();
      installCoreProbe(project, "amadeus-audit-logger.ts", "audit");
      installCoreProbe(project, "amadeus-sensor-fire.ts", "sensor");

      expect(
        runAdapter(project, "audit-and-sensors", {
          toolName: fixture.toolName,
          toolResult: fixture.result,
          toolSuccess: true,
        }).status,
      ).toBe(0);
      expect(readTrace(project).map((entry) => [entry.label, entry.input])).toEqual([
        [
          "audit",
          {
            hook_event_name: "PostToolUse",
            tool_name: "Edit",
            tool_input: { file_path: join(project, fixture.path) },
          },
        ],
        [
          "sensor",
          {
            hook_event_name: "PostToolUse",
            tool_name: "Edit",
            tool_input: { file_path: join(project, fixture.path) },
          },
        ],
      ]);
    });
  }

  test("failed, malformed, and non-write contexts never become artifact events", () => {
    const fixtures: unknown[] = [
      {
        toolName: "fs_write",
        toolResult: "Created the src/failed.ts file.",
        toolSuccess: false,
      },
      { toolName: "execute_bash", toolResult: "Created the src/guess.ts file.", toolSuccess: true },
      "malformed-json",
      null,
    ];
    for (const context of fixtures) {
      const project = scratchProject();
      installCoreProbe(project, "amadeus-audit-logger.ts", "audit");
      installCoreProbe(project, "amadeus-sensor-fire.ts", "sensor");
      expect(runAdapter(project, "audit-and-sensors", context).status).toBe(0);
      expect(readTrace(project)).toEqual([]);
    }
  });

  for (const fixture of NON_TRUE_TOOL_SUCCESS) {
    test(`audit-and-sensors rejects toolSuccess ${fixture.label}`, () => {
      const project = scratchProject();
      installCoreProbe(project, "amadeus-audit-logger.ts", "audit");
      installCoreProbe(project, "amadeus-sensor-fire.ts", "sensor");
      const context: Record<string, unknown> = {
        toolName: "fs_write",
        toolResult: "Created the src/non-true.ts file.",
      };
      if (fixture.present) context.toolSuccess = fixture.value;

      expect(runAdapter(project, "audit-and-sensors", context).status).toBe(0);
      expect(readTrace(project)).toEqual([]);
    });
  }

  test("a successful write with unknown result wording is visibly dropped", () => {
    const project = scratchProject();
    installCoreProbe(project, "amadeus-audit-logger.ts", "audit");
    installCoreProbe(project, "amadeus-sensor-fire.ts", "sensor");
    expect(
      runAdapter(project, "audit-and-sensors", {
        toolName: "fs_write",
        toolResult: "Updated something somewhere",
        toolSuccess: true,
      }).status,
    ).toBe(0);
    expect(readTrace(project)).toEqual([]);
    expect(
      readFileSync(
        join(seededRecordDir(project), ".amadeus-hooks-health", "kiro-ide-adapter.drops"),
        "utf8",
      ),
    ).toContain("did not match a known path form");
  });

  test("M1: a failed delegated tool does not forward SubagentStop", () => {
    const project = scratchProject();
    installCoreProbe(project, "amadeus-log-subagent.ts", "subagent");

    expect(
      runAdapter(project, "log-subagent", {
        toolName: "invoke_sub_agent",
        toolResult: "Reviewer: amadeus-architecture-reviewer-agent",
        toolSuccess: false,
      }).status,
    ).toBe(0);
    expect(readTrace(project)).toEqual([]);
  });

  for (const fixture of NON_TRUE_TOOL_SUCCESS) {
    test(`log-subagent rejects toolSuccess ${fixture.label}`, () => {
      const project = scratchProject();
      installCoreProbe(project, "amadeus-log-subagent.ts", "subagent");
      const context: Record<string, unknown> = {
        toolName: "invoke_sub_agent",
        toolResult: "Reviewer: amadeus-architecture-reviewer-agent",
      };
      if (fixture.present) context.toolSuccess = fixture.value;

      expect(runAdapter(project, "log-subagent", context).status).toBe(0);
      expect(readTrace(project)).toEqual([]);
    });
  }

  test("M2: a parked runtime never forwards audit-tail state sync", () => {
    const project = scratchProject();
    installCoreProbe(project, "amadeus-sync-statusline.ts", "state-sync");
    writeFileSync(
      seededStateFile(project),
      `${readFileSync(seededStateFile(project), "utf8")}\n- **Runtime State**: Parked\n- **Parked At Stage**: requirements-analysis\n`,
    );
    appendFileSync(
      seededAuditShard(project),
      "\n## Stage Start\n**Timestamp**: 2099-01-01T00:00:00Z\n**Event**: STAGE_STARTED\n**Stage**: requirements-analysis\n\n---\n",
    );

    expect(runAdapter(project, "state-sync", {}).status).toBe(0);
    expect(readTrace(project)).toEqual([]);
  });

  test("M3: a successful write path that escapes the project is visibly dropped", () => {
    const project = scratchProject();
    installCoreProbe(project, "amadeus-audit-logger.ts", "audit");
    installCoreProbe(project, "amadeus-sensor-fire.ts", "sensor");

    expect(
      runAdapter(project, "audit-and-sensors", {
        toolName: "fs_write",
        toolResult: "Created the ../outside.ts file.",
        toolSuccess: true,
      }).status,
    ).toBe(0);
    expect(readTrace(project)).toEqual([]);
    expect(
      readFileSync(
        join(seededRecordDir(project), ".amadeus-hooks-health", "kiro-ide-adapter.drops"),
        "utf8",
      ),
    ).toContain("outside");
  });

  test("M7: a contained absolute symlink path is forwarded without rewriting its spelling", () => {
    const project = scratchProject();
    installCoreProbe(project, "amadeus-audit-logger.ts", "audit");
    installCoreProbe(project, "amadeus-sensor-fire.ts", "sensor");
    const target = join(project, "real.ts");
    const link = join(project, "linked.ts");
    writeFileSync(target, "");
    symlinkSync(target, link);

    expect(
      runAdapter(project, "audit-and-sensors", {
        toolName: "fs_write",
        toolResult: `Created the ${link} file.`,
        toolSuccess: true,
      }).status,
    ).toBe(0);
    expect(readTrace(project).map((entry) => entry.input)).toEqual([
      {
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: link },
      },
      {
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: link },
      },
    ]);
  });

  test("M8: a non-subagent tool never forwards SubagentStop", () => {
    const project = scratchProject();
    installCoreProbe(project, "amadeus-log-subagent.ts", "subagent");

    expect(
      runAdapter(project, "log-subagent", {
        toolName: "fs_write",
        toolResult: "Agent: amadeus-developer-agent",
        toolSuccess: true,
      }).status,
    ).toBe(0);
    expect(readTrace(project)).toEqual([]);
  });

  test("delegated identity uses only Reviewer or Agent markers in the first eight result lines", () => {
    const line8Project = scratchProject();
    installCoreProbe(line8Project, "amadeus-log-subagent.ts", "subagent");
    const line8 = [
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "**Reviewer:** amadeus-architecture-reviewer-agent",
      "done",
    ].join("\n");
    expect(
      runAdapter(line8Project, "log-subagent", {
        toolName: "invoke_sub_agent",
        toolResult: line8,
        toolSuccess: true,
      }).status,
    ).toBe(0);
    expect(readTrace(line8Project)[0]?.input).toMatchObject({
      agent_type: "amadeus-architecture-reviewer-agent",
    });

    const line9Project = scratchProject();
    installCoreProbe(line9Project, "amadeus-log-subagent.ts", "subagent");
    const line9 = ["one", "two", "three", "four", "five", "six", "seven", "eight", "Agent: spoofed"].join("\n");
    expect(
      runAdapter(line9Project, "log-subagent", {
        toolName: "subagent",
        toolResult: line9,
        toolSuccess: true,
      }).status,
    ).toBe(0);
    expect(readTrace(line9Project)[0]?.input).toMatchObject({ agent_type: "unknown" });
  });

  for (const checkbox of ["x", "S"]) {
    test(`state sync never reopens a ${checkbox === "x" ? "completed" : "skipped"} audit-tail stage`, () => {
      const project = scratchProject();
      installCoreProbe(project, "amadeus-sync-statusline.ts", "state-sync");
      writeFileSync(
        seededStateFile(project),
        readFileSync(seededStateFile(project), "utf8").replace(
          "- [ ] user-stories — EXECUTE",
          `- [${checkbox}] user-stories — EXECUTE`,
        ),
      );
      appendFileSync(
        seededAuditShard(project),
        "\n## Stage Start\n**Timestamp**: 2099-01-01T00:00:00Z\n**Event**: STAGE_STARTED\n**Stage**: user-stories\n\n---\n",
      );
      expect(runAdapter(project, "state-sync", {}).status).toBe(0);
      expect(readTrace(project)).toEqual([]);
    });
  }

  test("M9: the shipped shell registration dispatches payload-free audit-tail state sync", () => {
    const registration = JSON.parse(
      readFileSync(
        join(
          REPO_ROOT,
          "packages",
          "framework",
          "harness",
          "kiro-ide",
          "hooks",
          "amadeus-sync-statusline.kiro.hook",
        ),
        "utf8",
      ),
    ) as {
      when: { type: string; toolTypes: string[] };
      then: { type: string; command: string };
    };
    expect(registration.when).toEqual({ type: "postToolUse", toolTypes: ["shell"] });
    expect(registration.then).toEqual({
      type: "runCommand",
      command: "bun .kiro/hooks/amadeus-kiro-adapter.ts state-sync",
    });

    const project = scratchProject();
    installCoreProbe(project, "amadeus-sync-statusline.ts", "state-sync");
    appendFileSync(
      seededAuditShard(project),
      "\n## Stage Start\n**Timestamp**: 2099-01-01T00:00:00Z\n**Event**: STAGE_STARTED\n**Stage**: user-stories\n\n---\n",
    );
    const target = registration.then.command.split(" ").at(-1);
    expect(target).toBe("state-sync");
    expect(runAdapter(project, target!, {}).status).toBe(0);
    expect(readTrace(project).map((entry) => entry.input)).toEqual([
      {
        hook_event_name: "PostToolUse",
        tool_name: "TaskUpdate",
        tool_input: { status: "in_progress", activeForm: "Running stage [user-stories]" },
      },
    ]);
  });

  test("M10: the IDE audit marker is canonical and repeated shell hooks compile one audit revision once", () => {
    const markerProject = scratchProject();
    installCoreProbe(markerProject, "amadeus-runtime-compile.ts", "runtime");
    expect(runAdapter(markerProject, "runtime-compile", {}).status).toBe(0);
    expect(readTrace(markerProject).map((entry) => entry.input)).toEqual([
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { source: "ide-audit-sync" },
      },
    ]);

    const project = scratchProject();
    const compileCount = join(project, "compile-count.txt");
    const graph = join(seededRecordDir(project), "runtime-graph.json");
    writeFileSync(
      join(project, ".kiro", "tools", "amadeus-runtime.ts"),
      [
        'import { appendFileSync, writeFileSync } from "node:fs";',
        `appendFileSync(${JSON.stringify(compileCount)}, "compile\\n");`,
        `writeFileSync(${JSON.stringify(graph)}, "{}\\n");`,
      ].join("\n"),
    );
    appendFileSync(
      seededAuditShard(project),
      "\n## Stage Start\n**Timestamp**: 2099-01-01T00:00:00Z\n**Event**: STAGE_STARTED\n**Stage**: requirements-analysis\n\n---\n",
    );

    expect(runAdapter(project, "runtime-compile", {}).status).toBe(0);
    expect(runAdapter(project, "runtime-compile", {}).status).toBe(0);
    expect(readFileSync(compileCount, "utf8")).toBe("compile\n");
  });

  test("M11: hook debug is off by default and opt-in through env or the workspace marker", () => {
    const offProject = scratchProject();
    expect(runAdapter(offProject, "unknown-target", {}).stdout).toBe("");
    expect(
      existsSync(join(seededRecordDir(offProject), ".amadeus-hooks-health", "hook-debug.log")),
    ).toBe(false);

    const envProject = scratchProject();
    const envResult = runAdapter(envProject, "unknown-target", {}, {
      AMADEUS_KIRO_IDE_HOOK_DEBUG: "1",
    });
    expect(envResult.status).toBe(0);
    expect(envResult.stdout).toBe("");
    expect(
      readFileSync(
        join(seededRecordDir(envProject), ".amadeus-hooks-health", "hook-debug.log"),
        "utf8",
      ),
    ).toContain("target=unknown-target context=ok");

    const markerProject = scratchProject();
    writeFileSync(join(markerProject, "amadeus", ".amadeus-hook-debug"), "");
    const markerResult = runAdapter(markerProject, "unknown-target", {});
    expect(markerResult.status).toBe(0);
    expect(markerResult.stdout).toBe("");
    expect(
      readFileSync(
        join(seededRecordDir(markerProject), ".amadeus-hooks-health", "hook-debug.log"),
        "utf8",
      ),
    ).toContain("target=unknown-target context=ok");
  });

  test("M11: an unreadable marker and a debug-log write failure remain fail-open", () => {
    const markerFailureProject = scratchProject();
    const marker = join(markerFailureProject, "amadeus", ".amadeus-hook-debug");
    symlinkSync(marker, marker);
    const markerResult = runAdapter(markerFailureProject, "unknown-target", {});
    expect(markerResult).toEqual({ status: 0, stdout: "", stderr: "" });

    const writeFailureProject = scratchProject();
    const health = join(seededRecordDir(writeFailureProject), ".amadeus-hooks-health");
    writeFileSync(health, "not-a-directory");
    const writeResult = runAdapter(writeFailureProject, "unknown-target", {}, {
      AMADEUS_KIRO_IDE_HOOK_DEBUG: "1",
    });
    expect(writeResult).toEqual({ status: 0, stdout: "", stderr: "" });
    expect(readFileSync(health, "utf8")).toBe("not-a-directory");
  });

  test("M11: the Kiro IDE debug opt-in does not enter the other adapters", () => {
    for (const relativeSource of [
      join("packages", "framework", "harness", "codex", "hooks", "amadeus-codex-adapter.ts"),
      join("packages", "framework", "harness", "kiro", "hooks", "amadeus-kiro-adapter.ts"),
    ]) {
      const source = readFileSync(join(REPO_ROOT, relativeSource), "utf8");
      expect(source).not.toContain(".amadeus-hook-debug");
      expect(source).not.toContain('join(healthDir, "hook-debug.log")');
    }
  });
});

describe("FR-4.15 Claude hook command quoting", () => {
  test("all and only the 11 authored hook commands match the production renderer", () => {
    const settings = JSON.parse(
      readFileSync(
        join(
          REPO_ROOT,
          "packages",
          "framework",
          "harness",
          "claude",
          "settings.json.example",
        ),
        "utf8",
      ),
    ) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
      statusLine: { type: string; command: string };
      permissions: { allow: string[] };
    };
    const commands = Object.values(settings.hooks).flatMap((groups) =>
      groups.flatMap((group) => group.hooks.map((hook) => hook.command)),
    );
    expect(commands).toHaveLength(11);
    for (const command of commands) {
      const hookPath = command.match(/\$CLAUDE_PROJECT_DIR\/(\.claude\/hooks\/[a-z0-9-]+\.ts)/)?.[1];
      expect(hookPath).toBeDefined();
      expect(command).toBe(
        renderClaudeHookCommand("$CLAUDE_PROJECT_DIR", { path: hookPath! }),
      );
    }
    expect(settings.statusLine).toEqual({
      type: "command",
      command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-statusline.ts",
    });
    expect(settings.permissions.allow).toContain(
      "Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)",
    );
  });

  test("the canonical renderer is the manifest's only named public function", () => {
    const manifestSource = readFileSync(
      join(REPO_ROOT, "packages", "framework", "harness", "claude", "manifest.ts"),
      "utf8",
    );
    expect(manifestSource.match(/^export function [A-Za-z0-9_]+/gm)).toEqual([
      "export function renderClaudeHookCommand",
    ]);
    expect(manifestSource).not.toContain("export interface HookSpec");
  });

  test("all 11 shipped hook commands resolve and start from a project path with spaces", () => {
    const root = createTestProject();
    temporaryProjects.push(root);
    const project = join(root, "project with spaces");
    cpSync(CLAUDE_SRC, join(project, ".claude"), { recursive: true });
    const settings = JSON.parse(
      readFileSync(join(project, ".claude", "settings.json.example"), "utf8"),
    ) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
      statusLine: { command: string };
      permissions: { allow: string[] };
    };
    const commands = Object.values(settings.hooks).flatMap((groups) =>
      groups.flatMap((group) => group.hooks.map((hook) => hook.command)),
    );
    const trace = join(project, "claude-hook-trace.txt");
    const expectedBasenames: string[] = [];
    expect(commands).toHaveLength(11);
    for (const command of commands) {
      const relativeHook = command.match(/\$CLAUDE_PROJECT_DIR\/(\.claude\/hooks\/[a-z0-9-]+\.ts)/)?.[1];
      expect(relativeHook).toBeDefined();
      expect(existsSync(join(project, relativeHook!))).toBe(true);
      const hookBasename = basename(relativeHook!);
      expectedBasenames.push(hookBasename);
      expect(
        existsSync(join(REPO_ROOT, "packages", "framework", "core", "hooks", hookBasename)),
      ).toBe(true);
      writeFileSync(
        join(project, relativeHook!),
        `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(trace)}, ${JSON.stringify(`${hookBasename}\n`)});\n`,
      );
      const result = spawnSync(command, {
        cwd: project,
        shell: true,
        input: "{}",
        encoding: "utf8",
        timeout: 30_000,
        env: { ...process.env, CLAUDE_PROJECT_DIR: project },
      });
      expect(result.status, `${command}: ${result.stderr}`).toBe(0);
    }
    expect(readFileSync(trace, "utf8").trim().split("\n")).toEqual(expectedBasenames);
    expect(settings.statusLine.command).toBe(
      "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-statusline.ts",
    );
    expect(settings.permissions.allow).toContain(
      "Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)",
    );
  });
});
