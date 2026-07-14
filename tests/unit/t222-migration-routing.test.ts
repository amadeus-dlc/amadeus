// covers: function:classifyMigrationRequest
// covers: function:isMigrationPublicRoute
// covers: function:isRejectedMigrationDispatch
// covers: subcommand:amadeus-orchestrate:next
// covers: subcommand:amadeus-utility:migrate
//
// Migration is a workspace utility, not workflow work. These tests exercise the
// public `/amadeus` argument surface through the shared classifier and the
// read-only orchestration engine, including precedence over an existing Intent.
// No migration route creates or mutates Intent state.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  armMigrationPendingDecision,
  armMigrationStopLatch,
  classifyMigrationRequest,
  consumeMigrationPendingDecision,
  consumeMigrationStopLatch,
  isMigrationApplyCommand,
  isMigrationDispatchCommand,
  isMigrationExecutionCommand,
  isMigrationPublicRoute,
  isRejectedMigrationDispatch,
  peekMigrationPendingDecision,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { renderHelpText } from "../../packages/framework/core/tools/amadeus-utility.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seededStateFile,
  seededAuditDir,
  seedStateFile,
} from "../harness/fixtures.ts";
import {
  createUpstreamV2Fixture,
  projectSnapshot,
  type UpstreamV2Fixture,
} from "../helpers/upstream-v2-fixture.ts";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ORCHESTRATE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-orchestrate.ts",
);

function migrationLatchPath(projectDir: string, sessionId: string): string {
  const key = createHash("sha256")
    .update(resolve(projectDir))
    .update("\0")
    .update(sessionId)
    .digest("hex")
    .slice(0, 24);
  return join(tmpdir(), `amadeus-migration-stop-${key}.json`);
}

function migrationDecisionPath(projectDir: string, sessionId: string): string {
  const key = createHash("sha256")
    .update(resolve(projectDir))
    .update("\0")
    .update(sessionId)
    .digest("hex")
    .slice(0, 24);
  return join(tmpdir(), `amadeus-migration-decision-${key}.json`);
}

function next(args: string[]): Record<string, unknown> {
  return nextInProject(args, REPO_ROOT);
}

function nextInProject(
  args: string[],
  projectDir: string,
): Record<string, unknown> {
  const run = spawnSync(process.execPath, [ORCHESTRATE, "next", ...args, "--project-dir", projectDir], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout.trim()) as Record<string, unknown>;
}

describe("migration request classification", () => {
  test("help advertises the dry-run-first migration surface", () => {
    const graph = process.env.AMADEUS_STAGE_GRAPH;
    const grid = process.env.AMADEUS_SCOPE_GRID;
    try {
      process.env.AMADEUS_STAGE_GRAPH = join(
        REPO_ROOT,
        "dist",
        "claude",
        ".claude",
        "tools",
        "data",
        "stage-graph.json",
      );
      process.env.AMADEUS_SCOPE_GRID = join(
        REPO_ROOT,
        "dist",
        "claude",
        ".claude",
        "tools",
        "data",
        "scope-grid.json",
      );
      const help = renderHelpText();
      expect(help).toContain("--migrate [path]");
      expect(help.toLowerCase()).toContain("dry-run");
    } finally {
      if (graph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
      else process.env.AMADEUS_STAGE_GRAPH = graph;
      if (grid === undefined) delete process.env.AMADEUS_SCOPE_GRID;
      else process.env.AMADEUS_SCOPE_GRID = grid;
    }
  });

  test("--migrate accepts an optional source path", () => {
    expect(classifyMigrationRequest(["--migrate"])).toEqual({
      source: "explicit-flag",
    });
    expect(classifyMigrationRequest(["--migrate", "imports/upstream-workspace"])).toEqual({
      source: "explicit-flag",
      from: "imports/upstream-workspace",
    });
  });

  test("natural language requires both an upstream source and a migration action", () => {
    expect(classifyMigrationRequest(["aidlc/ワークスペースを移行して"])).toEqual({
      source: "natural-language",
    });
    expect(classifyMigrationRequest(["Convert", "the", "AI-DLC", "workspace"])).toEqual({
      source: "natural-language",
    });
    expect(classifyMigrationRequest(["describe", "the", "AI-DLC", "workspace"])).toBeNull();
    expect(classifyMigrationRequest(["migrate", "the", "workspace"])).toBeNull();
  });

  test("migration shell classifiers accept only complete bun invocations", () => {
    expect(isMigrationPublicRoute(["--apply"])).toBe(true);
    expect(isMigrationPublicRoute(["describe", "the", "AI-DLC", "workspace"])).toBe(false);
    expect(
      isMigrationExecutionCommand(
        "bun .claude/tools/amadeus-utility.ts migrate 'imports/source tree' --apply",
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationApplyCommand(
        "bun .claude/tools/amadeus-utility.ts migrate 'imports/source tree' --apply",
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationApplyCommand(
        "bun .claude/tools/amadeus-utility.ts migrate 'imports/source tree'",
        REPO_ROOT,
      ),
    ).toBe(false);
    expect(
      isMigrationExecutionCommand(
        "bun .claude/tools/amadeus-migrate.ts --from 'aidlc source' --apply",
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationExecutionCommand(
        `bun run ${join(REPO_ROOT, "packages/framework/core/tools/amadeus-utility.ts")} migrate`,
        REPO_ROOT,
      ),
    ).toBe(true);
    for (const command of [
      "echo bun .claude/tools/amadeus-utility.ts migrate",
      "true || bun .claude/tools/amadeus-utility.ts migrate",
      "false && bun .claude/tools/amadeus-utility.ts migrate",
      "bun .claude/tools/amadeus-orchestrate.ts next --migrate",
      "bun .claude/tools/amadeus-utility.ts migrate && echo done",
    ]) {
      expect(`${command}:${isMigrationExecutionCommand(command, REPO_ROOT)}`).toBe(
        `${command}:false`,
      );
    }
    expect(
      isMigrationExecutionCommand(
        "bun /tmp/amadeus-utility.ts migrate --apply",
        REPO_ROOT,
      ),
    ).toBe(false);
    expect(
      isMigrationExecutionCommand(
        "bun .other/tools/amadeus-migrate.ts --from aidlc",
        REPO_ROOT,
      ),
    ).toBe(false);

    expect(
      isMigrationDispatchCommand(
        "bun .kiro/tools/amadeus-orchestrate.ts next --migrate 'imports/source tree'",
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationDispatchCommand(
        "bun .claude/tools/amadeus-orchestrate.ts next --apply",
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationDispatchCommand(
        "bun .codex/tools/amadeus-orchestrate.ts next --migrate --phase inception",
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationDispatchCommand(
        `bun ${join(REPO_ROOT, ".kiro/tools/amadeus-orchestrate.ts")} next --migrate`,
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationDispatchCommand(
        "echo bun .kiro/tools/amadeus-orchestrate.ts next --migrate",
        REPO_ROOT,
      ),
    ).toBe(false);
    expect(
      isMigrationDispatchCommand(
        "bun /tmp/amadeus-orchestrate.ts next --migrate",
        REPO_ROOT,
      ),
    ).toBe(false);

    const rejectedCommand = "bun .claude/tools/amadeus-orchestrate.ts next --apply";
    expect(
      isRejectedMigrationDispatch(
        rejectedCommand,
        {
          stdout: JSON.stringify({
            kind: "error",
            message: "--apply is internal to the migration approval flow.",
          }),
        },
        REPO_ROOT,
      ),
    ).toBe(true);
    for (const response of [
      { stdout: JSON.stringify({ kind: "print", message: "run the dry-run" }) },
      { stdout: JSON.stringify({ kind: "error" }) },
      { items: [{ Text: "command failed\nkind: error" }] },
    ]) {
      expect(isRejectedMigrationDispatch(rejectedCommand, response, REPO_ROOT)).toBe(false);
    }
  });

  test("migration Stop latches are one-shot, session-scoped, stale-safe, and fail closed", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-latch-"));
    try {
      armMigrationStopLatch(project, "session-a", 1_000);
      expect(consumeMigrationStopLatch(project, "session-b", 1_001)).toBe(false);
      expect(consumeMigrationStopLatch(project, "session-a", 1_001)).toBe(true);
      expect(consumeMigrationStopLatch(project, "session-a", 1_001)).toBe(false);

      armMigrationStopLatch(project, "session-a", 1_000);
      expect(consumeMigrationStopLatch(project, "session-a", 1_000_000)).toBe(false);
      expect(consumeMigrationStopLatch(project, "session-a", 1_001)).toBe(false);

      armMigrationStopLatch(project, undefined, 1_000);
      armMigrationStopLatch(project, "", 1_000);
      expect(consumeMigrationStopLatch(project, undefined, 1_001)).toBe(false);
      expect(consumeMigrationStopLatch(project, "", 1_001)).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("migration Stop latches replace planted symlinks and never read them as claims", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-latch-link-"));
    const sentinelDir = mkdtempSync(join(tmpdir(), "amadeus-migration-sentinel-"));
    const sessionId = `session-link-${process.pid}-${Date.now()}`;
    const path = migrationLatchPath(project, sessionId);
    const sentinel = join(sentinelDir, "external-sentinel.json");
    const sentinelBytes = '{"timestamp":1000,"secret":"unchanged"}\n';
    writeFileSync(sentinel, sentinelBytes, "utf-8");
    try {
      symlinkSync(sentinel, path);
      armMigrationStopLatch(project, sessionId, 1_000);
      expect(readFileSync(sentinel, "utf-8")).toBe(sentinelBytes);
      expect(consumeMigrationStopLatch(project, sessionId, 1_001)).toBe(true);
      expect(consumeMigrationStopLatch(project, sessionId, 1_001)).toBe(false);

      symlinkSync(sentinel, path);
      expect(consumeMigrationStopLatch(project, sessionId, 1_001)).toBe(false);
      expect(readFileSync(sentinel, "utf-8")).toBe(sentinelBytes);

      writeFileSync(path, '{"timestamp":1000}\n', { mode: 0o600 });
      chmodSync(path, 0o644);
      expect(consumeMigrationStopLatch(project, sessionId, 1_001)).toBe(false);
    } finally {
      try {
        unlinkSync(path);
      } catch {
        // The latch is normally consumed by the test.
      }
      rmSync(project, { recursive: true, force: true });
      rmSync(sentinelDir, { recursive: true, force: true });
    }
  });

  test("pending migration decisions are secure, session-scoped, short-lived, and source-free", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-decision-"));
    const sentinelDir = mkdtempSync(join(tmpdir(), "amadeus-decision-sentinel-"));
    const sessionId = `decision-a-${process.pid}-${Date.now()}`;
    const path = migrationDecisionPath(project, sessionId);
    const sentinel = join(sentinelDir, "external-sentinel.json");
    const sentinelBytes = '{"timestamp":1000,"secret":"unchanged"}\n';
    writeFileSync(sentinel, sentinelBytes, "utf-8");
    try {
      symlinkSync(sentinel, path);
      armMigrationPendingDecision(project, sessionId, 1_000);
      expect(readFileSync(path, "utf-8")).toBe('{"timestamp":1000}\n');
      expect(readFileSync(sentinel, "utf-8")).toBe(sentinelBytes);
      expect(peekMigrationPendingDecision(project, "decision-b", 1_001)).toBe(false);
      expect(peekMigrationPendingDecision(project, sessionId, 1_001)).toBe(true);
      expect(peekMigrationPendingDecision(project, sessionId, 1_001)).toBe(true);
      expect(consumeMigrationPendingDecision(project, "decision-b", 1_001)).toBe(false);
      expect(consumeMigrationPendingDecision(project, sessionId, 1_001)).toBe(true);
      expect(peekMigrationPendingDecision(project, sessionId, 1_001)).toBe(false);

      armMigrationPendingDecision(project, sessionId, 1_000);
      expect(peekMigrationPendingDecision(project, sessionId, 1_000_000)).toBe(false);
      expect(consumeMigrationPendingDecision(project, sessionId, 1_001)).toBe(false);

      symlinkSync(sentinel, path);
      expect(peekMigrationPendingDecision(project, sessionId, 1_001)).toBe(false);
      expect(readFileSync(sentinel, "utf-8")).toBe(sentinelBytes);

      writeFileSync(path, '{"timestamp":1000}\n', { mode: 0o600 });
      chmodSync(path, 0o644);
      expect(consumeMigrationPendingDecision(project, sessionId, 1_001)).toBe(false);

      armMigrationPendingDecision(project, undefined, 1_000);
      armMigrationPendingDecision(project, "", 1_000);
      expect(peekMigrationPendingDecision(project, undefined, 1_001)).toBe(false);
      expect(peekMigrationPendingDecision(project, "", 1_001)).toBe(false);
    } finally {
      try {
        unlinkSync(path);
      } catch {
        // The pending marker is normally consumed by the test.
      }
      rmSync(project, { recursive: true, force: true });
      rmSync(sentinelDir, { recursive: true, force: true });
    }
  });
});

describe("migration routing", () => {
  test("explicit migration emits a dry-run and numbered approval instruction before any workflow route", () => {
    const directive = next(["--migrate", "imports/upstream-workspace"]);
    expect(directive.kind).toBe("print");
    const message = String(directive.message);
    expect(message).toContain("amadeus-utility.ts migrate imports/upstream-workspace");
    expect(message).toContain("1. Yes");
    expect(message).toContain("2. No");
    expect(message).toContain("--apply");
    expect(message).toContain("do NOT run `next`");
  });

  test("custom source paths are shell-quoted in the conductor instruction", () => {
    const directive = next(["--migrate", "imports/a b's"]);
    expect(String(directive.message)).toContain(
      `amadeus-utility.ts migrate 'imports/a b'"'"'s'`,
    );
  });

  test.each(["imports/evil`path", "imports/evil\npath", "imports/evil\tpath"])(
    "custom source rejects Markdown/control injection: %j",
    (source) => {
      const directive = next(["--migrate", source]);
      expect(directive.kind).toBe("error");
      expect(String(directive.message)).toContain(
        "cannot contain backticks or control characters",
      );
      expect(String(directive.message)).not.toContain(source);
    },
  );

  test("natural-language migration always uses the default source and never births an Intent", () => {
    const directive = next(["migrate", "the", "AI-DLC", "workspace", "/tmp/not-a-source"]);
    expect(directive.kind).toBe("print");
    const message = String(directive.message);
    expect(message).toContain("amadeus-utility.ts migrate`");
    expect(message).not.toContain("/tmp/not-a-source");
    expect(message).not.toContain("intent-birth");
    expect(message).toContain("do NOT birth or advance an Intent");
  });

  test.each([
    ["explicit", ["--migrate"]],
    ["English natural language", ["migrate", "the", "AI-DLC", "workspace"]],
    ["Japanese natural language", ["aidlc", "ワークスペースを移行して"]],
  ] as const)("%s route does not create a workspace or Intent", (_label, args) => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-no-intent-"));
    try {
      const directive = nextInProject([...args], project);
      expect(directive.kind).toBe("print");
      expect(existsSync(join(project, "amadeus"))).toBe(false);
      expect(existsSync(join(project, "aidlc"))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test.each([
    ["explicit", ["--migrate"]],
    ["English natural language", ["migrate", "the", "AI-DLC", "workspace"]],
    ["Japanese natural language", ["aidlc", "ワークスペースを移行して"]],
  ] as const)("%s route takes precedence over an active Intent", (_label, args) => {
    const project = createTestProject();
    try {
      seedStateFile(project, join(FIXTURES_DIR, "state-mid-ideation.md"));
      const statePath = seededStateFile(project);
      const before = readFileSync(statePath, "utf-8");

      const directive = nextInProject([...args], project);

      expect(directive.kind).toBe("print");
      expect(String(directive.message)).toContain("approval gate");
      expect(String(directive.message)).not.toContain("intent-birth");
      expect(readFileSync(statePath, "utf-8")).toBe(before);
    } finally {
      cleanupTestProject(project);
    }
  });

  test("public apply and workflow-option combinations are rejected", () => {
    const bareApply = next(["--apply"]);
    expect(bareApply.kind).toBe("error");
    expect(String(bareApply.message)).toContain("--apply is internal");

    const apply = next(["--migrate", "--apply"]);
    expect(apply.kind).toBe("error");
    expect(String(apply.message)).toContain("--apply is internal");

    const jump = next(["--migrate", "--stage", "code-generation"]);
    expect(jump.kind).toBe("error");
    expect(String(jump.message)).toContain("Cannot combine workspace migration with --stage");

    const composeSource = next(["--migrate", "compose"]);
    expect(composeSource.kind).toBe("print");
    expect(String(composeSource.message)).toContain("amadeus-utility.ts migrate compose");

    const composeConflict = next(["compose", "--migrate"]);
    expect(composeConflict.kind).toBe("error");
    expect(String(composeConflict.message)).toContain(
      "Cannot combine workspace migration with compose",
    );

    const extra = next(["--migrate", "imports/source", "unexpected"]);
    expect(extra.kind).toBe("error");
    expect(String(extra.message)).toContain("one optional source path");

    for (const conflict of [
      "--phase",
      "--scope",
      "--depth",
      "--test-strategy",
      "--single",
    ]) {
      const directive = next(["--migrate", conflict]);
      expect(directive.kind).toBe("error");
      expect(String(directive.message)).toContain(
        `Cannot combine workspace migration with ${conflict}`,
      );
    }
  });

  test("read-only utilities retain precedence over migration", () => {
    const directive = next(["--migrate", "--status"]);
    expect(directive.kind).toBe("print");
    expect(String(directive.message)).toContain("amadeus-utility.ts status");
    expect(String(directive.message)).not.toContain("approval gate");
  });
});

describe("migration utility adapter", () => {
  test("forwards the source, project root, mode, and JSON flag as argv", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-utility-"));
    const tools = join(project, ".claude", "tools");
    try {
      mkdirSync(join(project, ".claude"), { recursive: true });
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      writeFileSync(
        join(tools, "amadeus-migrate.ts"),
        "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n",
        "utf-8",
      );

      const run = spawnSync(
        process.execPath,
        [
          join(tools, "amadeus-utility.ts"),
          "migrate",
          "imports/source tree",
          "--apply",
          "--json",
          "--project-dir",
          project,
        ],
        { cwd: project, encoding: "utf-8" },
      );

      expect(run.status).toBe(0);
      expect(JSON.parse(run.stdout)).toEqual([
        "--from",
        "imports/source tree",
        "--project-dir",
        project,
        "--apply",
        "--json",
      ]);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("forwards the default upstream source when no path is supplied", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-utility-default-"));
    const tools = join(project, ".claude", "tools");
    try {
      mkdirSync(join(project, ".claude"), { recursive: true });
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      writeFileSync(
        join(tools, "amadeus-migrate.ts"),
        "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n",
        "utf-8",
      );

      const run = spawnSync(
        process.execPath,
        [
          join(tools, "amadeus-utility.ts"),
          "migrate",
          "--json",
          "--project-dir",
          project,
        ],
        { cwd: project, encoding: "utf-8" },
      );

      expect(run.status).toBe(0);
      expect(JSON.parse(run.stdout)).toEqual([
        "--from",
        "aidlc",
        "--project-dir",
        project,
        "--json",
      ]);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("rejects flags outside the internal migration interface", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-utility-flags-"));
    const tools = join(project, ".claude", "tools");
    try {
      mkdirSync(join(project, ".claude"), { recursive: true });
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      writeFileSync(
        join(tools, "amadeus-migrate.ts"),
        "process.stdout.write('migrator invoked');\n",
        "utf-8",
      );

      const run = spawnSync(
        process.execPath,
        [
          join(tools, "amadeus-utility.ts"),
          "migrate",
          "--stage",
          "code-generation",
          "--project-dir",
          project,
        ],
        { cwd: project, encoding: "utf-8" },
      );

      expect(run.status).not.toBe(0);
      expect(run.stdout).not.toContain("migrator invoked");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("rejects a source consumed as a boolean option value instead of applying the default", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-utility-order-"));
    const tools = join(project, ".claude", "tools");
    try {
      mkdirSync(join(project, ".claude"), { recursive: true });
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      writeFileSync(
        join(tools, "amadeus-migrate.ts"),
        "process.stdout.write('migrator invoked');\n",
        "utf-8",
      );

      for (const option of ["--apply", "--json"]) {
        const run = spawnSync(
          process.execPath,
          [
            join(tools, "amadeus-utility.ts"),
            "migrate",
            option,
            "imports/source",
            "--project-dir",
            project,
          ],
          { cwd: project, encoding: "utf-8" },
        );
        expect(run.status).not.toBe(0);
        expect(run.stdout).not.toContain("migrator invoked");
        expect(run.stderr).toContain(`${option} does not accept a value`);
      }
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("the core CLI requires an explicit --from value", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-core-from-"));
    try {
      const run = spawnSync(
        process.execPath,
        [
          join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-migrate.ts"),
          "--project-dir",
          project,
          "--json",
        ],
        { cwd: project, encoding: "utf-8" },
      );
      expect(run.status).not.toBe(0);
      expect(JSON.parse(run.stdout).warnings).toContain("--from requires a value.");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("migration terminal hook seam", () => {
  const runtimeHook = join(
    REPO_ROOT,
    "packages",
    "framework",
    "core",
    "hooks",
    "amadeus-runtime-compile.ts",
  );
  const stopHook = join(
    REPO_ROOT,
    "packages",
    "framework",
    "core",
    "hooks",
    "amadeus-stop.ts",
  );

  test.each(["absent", "seed"])(
    "PostToolUse → Stop leaves the %s destination project snapshot unchanged",
    (target) => {
      const project = mkdtempSync(join(tmpdir(), "amadeus-migration-hooks-"));
      try {
        if (target === "seed") {
          mkdirSync(join(project, "amadeus", ".installer"), { recursive: true });
          writeFileSync(
            join(project, "amadeus", ".installer", "amadeus-setup-manifest.json"),
            '{"schemaVersion":1}\n',
            "utf-8",
          );
        }
        const before = projectSnapshot(project);
        const sessionId = `source-hook-${target}`;
        const env = { ...process.env, CLAUDE_PROJECT_DIR: project };
        const postTool = spawnSync(process.execPath, [runtimeHook], {
          cwd: project,
          input: JSON.stringify({
            hook_event_name: "PostToolUse",
            session_id: sessionId,
            tool_name: "Bash",
            tool_input: {
              command: "bun .claude/tools/amadeus-utility.ts migrate --apply",
            },
          }),
          encoding: "utf-8",
          env,
        });
        expect(postTool.status).toBe(0);
        const stop = spawnSync(process.execPath, [stopHook], {
          cwd: project,
          input: JSON.stringify({
            hook_event_name: "Stop",
            session_id: sessionId,
            stop_hook_active: false,
          }),
          encoding: "utf-8",
          env,
        });
        expect(stop.status).toBe(0);
        expect(stop.stdout).toBe("");
        expect(projectSnapshot(project)).toBe(before);
      } finally {
        rmSync(project, { recursive: true, force: true });
      }
    },
  );

  test.each([
    ["bare public apply", ["--apply"]],
    ["public migration apply", ["--migrate", "--apply"]],
    ["migration/workflow conflict", ["--migrate", "--phase", "inception"]],
  ] as const)("rejected %s is terminal and never resumes an active Intent", (_label, args) => {
    const project = createTestProject();
    const sessionId = `source-rejected-${args.join("-")}-${process.pid}-${Date.now()}`;
    try {
      seedStateFile(project, join(FIXTURES_DIR, "state-mid-ideation.md"));
      const tools = join(project, ".claude", "tools");
      mkdirSync(tools, { recursive: true });
      writeFileSync(
        join(tools, "amadeus-orchestrate.ts"),
        'console.log(JSON.stringify({ kind: "run-stage", stage: "feasibility" }));\n',
        "utf-8",
      );
      const before = projectSnapshot(project);
      const directive = nextInProject([...args], project);
      expect(directive.kind).toBe("error");

      const env = {
        ...process.env,
        AMADEUS_HARNESS_DIR: ".claude",
        CLAUDE_PROJECT_DIR: project,
      };
      const command = `bun .claude/tools/amadeus-orchestrate.ts next ${args.join(" ")}`;
      const postTool = spawnSync(process.execPath, [runtimeHook], {
        cwd: project,
        input: JSON.stringify({
          hook_event_name: "PostToolUse",
          session_id: sessionId,
          tool_name: "Bash",
          tool_input: { command },
          tool_response: { stdout: JSON.stringify(directive) },
        }),
        encoding: "utf-8",
        env,
      });
      expect(postTool.status).toBe(0);
      const stop = spawnSync(process.execPath, [stopHook], {
        cwd: project,
        input: JSON.stringify({
          hook_event_name: "Stop",
          session_id: sessionId,
          stop_hook_active: false,
        }),
        encoding: "utf-8",
        env,
      });
      expect(stop.status).toBe(0);
      expect(stop.stdout).toBe("");
      expect(projectSnapshot(project)).toBe(before);
    } finally {
      consumeMigrationStopLatch(project, sessionId);
      cleanupTestProject(project);
    }
  });
});

describe("Kiro advancing guard parity", () => {
  function installKiroMigrationHarness(project: UpstreamV2Fixture): void {
    cpSync(
      join(REPO_ROOT, "dist", "kiro", ".kiro"),
      join(project.projectDir, ".kiro"),
      { recursive: true },
    );
    cpSync(
      join(REPO_ROOT, "packages", "framework", "core", "tools"),
      join(project.projectDir, ".kiro", "tools"),
      { recursive: true },
    );
    cpSync(
      join(REPO_ROOT, "packages", "framework", "core", "hooks"),
      join(project.projectDir, ".kiro", "hooks"),
      { recursive: true },
    );
    cpSync(
      join(
        REPO_ROOT,
        "packages",
        "framework",
        "harness",
        "kiro",
        "hooks",
        "amadeus-kiro-adapter.ts",
      ),
      join(project.projectDir, ".kiro", "hooks", "amadeus-kiro-adapter.ts"),
    );
    project.commitAll("test: install Kiro migration harness");
  }

  function runKiroAdapter(
    project: UpstreamV2Fixture,
    target: string,
    payload: Record<string, unknown>,
  ) {
    return spawnSync(
      process.execPath,
      [
        join(project.projectDir, ".kiro", "hooks", "amadeus-kiro-adapter.ts"),
        target,
      ],
      {
        cwd: project.projectDir,
        input: JSON.stringify({ ...payload, cwd: project.projectDir }),
        encoding: "utf-8",
        env: {
          ...process.env,
          AMADEUS_HARNESS_DIR: ".kiro",
          CLAUDE_PROJECT_DIR: project.projectDir,
        },
      },
    );
  }

  function runKiroMigration(
    project: UpstreamV2Fixture,
    apply: boolean,
  ) {
    const args = [
      join(project.projectDir, ".kiro", "tools", "amadeus-utility.ts"),
      "migrate",
      "--json",
    ];
    if (apply) args.push("--apply");
    return spawnSync(process.execPath, args, {
      cwd: project.projectDir,
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_HARNESS_DIR: ".kiro",
        CLAUDE_PROJECT_DIR: project.projectDir,
      },
    });
  }

  function gitIndexBytes(project: UpstreamV2Fixture): Buffer {
    const raw = project.git(["rev-parse", "--git-path", "index"]).trim();
    return readFileSync(raw.startsWith("/") ? raw : join(project.projectDir, raw));
  }

  function expectNoKiroGatePollution(
    project: UpstreamV2Fixture,
    target: "absent" | "seed",
  ): void {
    expect(existsSync(join(project.destinationRoot, ".amadeus-turn-counter"))).toBe(false);
    expect(existsSync(join(project.destinationRoot, ".amadeus-readonly-latch"))).toBe(false);
    if (target === "absent") {
      expect(existsSync(project.destinationRoot)).toBe(false);
    } else {
      expect(existsSync(join(project.destinationRoot, "spaces", "default", "intents"))).toBe(
        false,
      );
    }
  }

  function runKiroDryRunTurn(
    project: UpstreamV2Fixture,
    sessionId: string,
  ): string {
    const initial = runKiroAdapter(project, "verb-intercept", {
      session_id: sessionId,
      prompt: "Run `bun .kiro/tools/amadeus-orchestrate.ts next --migrate` and relay it.",
    });
    expect(initial.status).toBe(0);
    expect(initial.stdout).toBe("");
    expect(peekMigrationPendingDecision(project.projectDir, sessionId)).toBe(false);

    const command = "bun .kiro/tools/amadeus-utility.ts migrate --json";
    const dryRun = runKiroMigration(project, false);
    expect(dryRun.status).toBe(0);
    const report = JSON.parse(dryRun.stdout) as { status?: string };
    expect(report.status).toBe("ready");
    const postTool = runKiroAdapter(project, "runtime-compile", {
      session_id: sessionId,
      tool_name: "shell",
      tool_input: { command },
      tool_response: { items: [{ Text: dryRun.stdout }] },
    });
    expect(postTool.status).toBe(0);
    const stop = runKiroAdapter(project, "stop", {
      session_id: sessionId,
      hook_event_name: "agentStop",
    });
    expect(stop.status).toBe(0);
    expect(stop.stdout).toBe("");
    expect(peekMigrationPendingDecision(project.projectDir, sessionId)).toBe(true);
    return command;
  }

  test.each(["absent", "seed"] as const)(
    "Kiro CLI dry-run → Yes → apply succeeds without gate pollution for a %s target",
    (target) => {
      const project = createUpstreamV2Fixture({
        withInstallerSeed: target === "seed",
      });
      const sessionId = `kiro-yes-${target}-${process.pid}-${Date.now()}`;
      try {
        installKiroMigrationHarness(project);
        const beforeApply = projectSnapshot(project.projectDir);
        const indexBeforeApply = gitIndexBytes(project);
        runKiroDryRunTurn(project, sessionId);
        const yes = runKiroAdapter(project, "verb-intercept", {
          session_id: sessionId,
          prompt: "Yes",
        });
        expect(yes.status).toBe(0);
        expect(yes.stdout).toBe("");
        expect(projectSnapshot(project.projectDir)).toBe(beforeApply);
        expect(gitIndexBytes(project)).toEqual(indexBeforeApply);
        expect(peekMigrationPendingDecision(project.projectDir, sessionId)).toBe(true);
        expectNoKiroGatePollution(project, target);

        const applyCommand = "bun .kiro/tools/amadeus-utility.ts migrate --json --apply";
        const apply = runKiroMigration(project, true);
        expect(apply.status).toBe(0);
        const report = JSON.parse(apply.stdout) as { status?: string };
        expect(report.status).toBe("applied");
        const postTool = runKiroAdapter(project, "runtime-compile", {
          session_id: sessionId,
          tool_name: "shell",
          tool_input: { command: applyCommand },
        });
        expect(postTool.status).toBe(0);
        const stop = runKiroAdapter(project, "stop", {
          session_id: sessionId,
          hook_event_name: "agentStop",
        });
        expect(stop.status).toBe(0);
        expect(stop.stdout).toBe("");
        expect(peekMigrationPendingDecision(project.projectDir, sessionId)).toBe(false);
        expect(existsSync(join(project.destinationRoot, ".amadeus-turn-counter"))).toBe(false);
        expect(existsSync(join(project.destinationRoot, ".amadeus-readonly-latch"))).toBe(false);
      } finally {
        consumeMigrationPendingDecision(project.projectDir, sessionId);
        project.cleanup();
      }
    },
  );

  test.each(["absent", "seed"] as const)(
    "Kiro CLI dry-run → No preserves filesystem and Git index for a %s target",
    (target) => {
      const project = createUpstreamV2Fixture({
        withInstallerSeed: target === "seed",
      });
      const sessionId = `kiro-no-${target}-${process.pid}-${Date.now()}`;
      try {
        installKiroMigrationHarness(project);
        const before = projectSnapshot(project.projectDir);
        const indexBefore = gitIndexBytes(project);
        runKiroDryRunTurn(project, sessionId);
        const no = runKiroAdapter(project, "verb-intercept", {
          session_id: sessionId,
          prompt: "2",
        });
        expect(no.status).toBe(0);
        expect(no.stdout).toBe("");
        expect(peekMigrationPendingDecision(project.projectDir, sessionId)).toBe(false);
        expect(projectSnapshot(project.projectDir)).toBe(before);
        expect(gitIndexBytes(project)).toEqual(indexBefore);
        expectNoKiroGatePollution(project, target);
      } finally {
        consumeMigrationPendingDecision(project.projectDir, sessionId);
        project.cleanup();
      }
    },
  );

  test("verb interception leaves an absent migration target untouched", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-kiro-intercept-"));
    const tools = join(project, ".kiro", "tools");
    const hooks = join(project, ".kiro", "hooks");
    try {
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      cpSync(join(REPO_ROOT, "packages", "framework", "harness", "kiro", "hooks"), hooks, {
        recursive: true,
      });
      const run = spawnSync(
        process.execPath,
        [join(hooks, "amadeus-kiro-adapter.ts"), "verb-intercept"],
        {
          cwd: project,
          input: JSON.stringify({
            cwd: project,
            prompt:
              "Run `bun .kiro/tools/amadeus-orchestrate.ts next --migrate` and relay it.",
          }),
          encoding: "utf-8",
        },
      );
      expect(run.status).toBe(0);
      expect(run.stdout).toBe("");
      expect(existsSync(join(project, "amadeus"))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("quoted migration source does not become a read-only Kiro CLI dispatch", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-kiro-quoted-"));
    const tools = join(project, ".kiro", "tools");
    const hooks = join(project, ".kiro", "hooks");
    try {
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      cpSync(join(REPO_ROOT, "packages", "framework", "harness", "kiro", "hooks"), hooks, {
        recursive: true,
      });
      const run = spawnSync(
        process.execPath,
        [join(hooks, "amadeus-kiro-adapter.ts"), "verb-intercept"],
        {
          cwd: project,
          input: JSON.stringify({
            cwd: project,
            prompt:
              'Run `bun .kiro/tools/amadeus-orchestrate.ts next --migrate "imports/foo --status bar"` and relay it.',
          }),
          encoding: "utf-8",
        },
      );
      expect(run.status).toBe(0);
      expect(run.stdout).toBe("");
      expect(existsSync(join(project, "amadeus"))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("Kiro CLI arms only from an unambiguous ready dry-run response", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-kiro-ready-proof-"));
    const tools = join(project, ".kiro", "tools");
    const hooks = join(project, ".kiro", "hooks");
    const sessionId = `source-ready-proof-${process.pid}-${Date.now()}`;
    try {
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "hooks"), hooks, {
        recursive: true,
      });
      cpSync(
        join(
          REPO_ROOT,
          "packages",
          "framework",
          "harness",
          "kiro",
          "hooks",
          "amadeus-kiro-adapter.ts",
        ),
        join(hooks, "amadeus-kiro-adapter.ts"),
      );
      const runAdapter = (target: string, payload: Record<string, unknown>) =>
        spawnSync(process.execPath, [join(hooks, "amadeus-kiro-adapter.ts"), target], {
          cwd: project,
          input: JSON.stringify({ ...payload, cwd: project, session_id: sessionId }),
          encoding: "utf-8",
        });
      const before = projectSnapshot(project);

      for (const args of ["--migrate --apply", "--migrate --phase inception"]) {
        armMigrationPendingDecision(project, sessionId);
        const invalid = runAdapter("verb-intercept", {
          prompt: `Run \`bun .kiro/tools/amadeus-orchestrate.ts next ${args}\` and relay it.`,
        });
        expect(invalid.status).toBe(0);
        expect(peekMigrationPendingDecision(project, sessionId)).toBe(false);
        expect(projectSnapshot(project)).toBe(before);
      }

      const command = "bun .kiro/tools/amadeus-utility.ts migrate --json";
      const postTool = (Text?: string) =>
        runAdapter("runtime-compile", {
          tool_name: "shell",
          tool_input: { command },
          ...(Text === undefined ? {} : { tool_response: { items: [{ Text }] } }),
        });
      for (const output of [
        undefined,
        '{"status":"ready"}',
        '{"schemaVersion":1,"mode":"dry-run","status":"failed"}',
        "command failed\nStatus: ready",
      ]) {
        armMigrationPendingDecision(project, sessionId);
        expect(postTool(output).status).toBe(0);
        expect(peekMigrationPendingDecision(project, sessionId)).toBe(false);
      }

      const humanReady = [
        "AI-DLC v2 -> Amadeus workspace migration",
        "Mode: dry-run",
        "Status: ready",
        "Source: aidlc",
        "Destination: amadeus",
        "Source version: unknown",
        "Target: absent",
        "",
        "Checks:",
        "[pass] source: valid",
        "",
        "Operations:",
        "",
        "No files were changed. Re-run with --apply only after explicit approval.",
      ].join("\n");
      expect(postTool(humanReady).status).toBe(0);
      expect(peekMigrationPendingDecision(project, sessionId)).toBe(true);
      expect(projectSnapshot(project)).toBe(before);
    } finally {
      consumeMigrationPendingDecision(project, sessionId);
      consumeMigrationStopLatch(project, sessionId);
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("Kiro CLI pretool guard exempts migration after proving the guard is active", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-kiro-pretool-"));
    const tools = join(project, ".kiro", "tools");
    const hooks = join(project, ".kiro", "hooks");
    try {
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      cpSync(join(REPO_ROOT, "packages", "framework", "harness", "kiro", "hooks"), hooks, {
        recursive: true,
      });
      mkdirSync(join(project, "amadeus"), { recursive: true });
      writeFileSync(join(project, "amadeus", ".amadeus-turn-counter"), "4\n", "utf-8");
      writeFileSync(
        join(project, "amadeus", ".amadeus-readonly-latch"),
        `${JSON.stringify({ turn: 4, flag: "status", source: "read-only-flag", ts: 1 })}\n`,
        "utf-8",
      );
      const runPretool = (command: string) =>
        spawnSync(process.execPath, [join(hooks, "amadeus-kiro-adapter.ts"), "pretool-block"], {
          cwd: project,
          input: JSON.stringify({ cwd: project, tool_input: { command } }),
          encoding: "utf-8",
        });

      const bare = runPretool("bun .kiro/tools/amadeus-orchestrate.ts next");
      expect(bare.status).toBe(2);
      expect(bare.stderr).toContain("already handled this turn");

      const migration = runPretool(
        "bun .kiro/tools/amadeus-orchestrate.ts next --migrate",
      );
      expect(migration.status).toBe(0);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("Kiro CLI gate floor allows only the exact migration dispatch without minting Intent presence", () => {
    const project = createTestProject();
    const tools = join(project, ".kiro", "tools");
    const hooks = join(project, ".kiro", "hooks");
    try {
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      cpSync(join(REPO_ROOT, "packages", "framework", "harness", "kiro", "hooks"), hooks, {
        recursive: true,
      });
      seedStateFile(project, join(FIXTURES_DIR, "state-brownfield-feature.md"));
      const statePath = seededStateFile(project);
      writeFileSync(
        statePath,
        readFileSync(statePath, "utf-8").replace(
          "- [-] requirements-analysis — EXECUTE",
          "- [?] requirements-analysis — EXECUTE",
        ),
        "utf-8",
      );
      mkdirSync(seededAuditDir(project), { recursive: true });
      writeFileSync(
        join(seededAuditDir(project), "presence-floor.md"),
        "# AI-DLC Audit Log\n",
        "utf-8",
      );
      const env = { ...process.env };
      delete env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
      const runPretool = (command: string) =>
        spawnSync(process.execPath, [join(hooks, "amadeus-kiro-adapter.ts"), "pretool-block"], {
          cwd: project,
          input: JSON.stringify({ cwd: project, tool_input: { command } }),
          encoding: "utf-8",
          env,
        });

      const unrelated = runPretool("git status");
      expect(unrelated.status).toBe(2);
      expect(unrelated.stderr).toContain("approval gate is open");

      const migration = runPretool(
        "bun .kiro/tools/amadeus-orchestrate.ts next --migrate",
      );
      expect(migration.status).toBe(0);
      expect(readFileSync(join(seededAuditDir(project), "presence-floor.md"), "utf-8")).toBe(
        "# AI-DLC Audit Log\n",
      );
    } finally {
      cleanupTestProject(project);
    }
  });

  test("Kiro IDE uses the shared engine migration route instead of a CLI-only pretool seam", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migrate-kiro-ide-engine-"));
    const tools = join(project, ".kiro", "tools");
    try {
      cpSync(join(REPO_ROOT, "packages", "framework", "core", "tools"), tools, {
        recursive: true,
      });
      const run = spawnSync(
        process.execPath,
        [join(tools, "amadeus-orchestrate.ts"), "next", "--migrate", "--project-dir", project],
        {
          cwd: project,
          encoding: "utf-8",
          env: { ...process.env, AMADEUS_HARNESS_DIR: ".kiro" },
        },
      );
      expect(run.status).toBe(0);
      const directive = JSON.parse(run.stdout) as Record<string, unknown>;
      expect(directive.kind).toBe("print");
      expect(String(directive.message)).toContain(".kiro/tools/amadeus-utility.ts migrate");
      expect(existsSync(join(project, "amadeus"))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("shipped conductor parity", () => {
  test("every harness documents migration as a gated print that never advances an Intent", () => {
    for (const harness of ["claude", "codex", "kiro", "kiro-ide"]) {
      const skill = readFileSync(
        join(
          REPO_ROOT,
          "packages",
          "framework",
          "harness",
          harness,
          "skills",
          "amadeus",
          "SKILL.md",
        ),
        "utf-8",
      );
      expect(skill).toContain("--migrate [path]");
      expect(skill).toContain("**gated terminal**");
      expect(skill).toContain("never births or advances an Intent");
      expect(skill).toContain("**Migration takes precedence over active-Intent routing.**");
    }
  });
});

describe("migration user guide", () => {
  test("English and Japanese guides pin the verified upstream revision and dry-run workflow", () => {
    for (const suffix of ["", ".ja"]) {
      const path = join(
        REPO_ROOT,
        "docs",
        "guide",
        `18-migrating-upstream-v2${suffix}.md`,
      );
      expect(existsSync(path)).toBe(true);
      const guide = readFileSync(path, "utf-8");
      expect(guide).toContain("242953ec76f307c8caf565805f9955a7ef458a92");
      expect(guide).toContain("--migrate [path]");
      expect(guide.toLowerCase()).toContain("dry-run");
      expect(guide).toContain("State Version 7");
      expect(guide).toContain("amadeus-utility.ts migrate [path] [--apply] [--json]");
      expect(guide).toContain("amadeus-migrate.ts --from <path>");
      for (const field of ["schemaVersion", "sourceVersion", "operations", "evidence"]) {
        expect(guide).toContain(field);
      }
    }
  });
});
