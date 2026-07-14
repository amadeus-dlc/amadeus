// In-process integration coverage for migration command tokenization, secure
// approval latches, public orchestration, and the utility adapter. Spawned CLI
// tests retain the external contract; these cases keep Bun coverage in-process.

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  armMigrationStopLatch,
  consumeMigrationStopLatch,
  isMigrationExecutionCommand,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { runUtilityMain } from "../../packages/framework/core/tools/amadeus-utility.ts";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

function migrationLatchPath(projectDir: string, sessionId: string): string {
  const key = createHash("sha256")
    .update(resolve(projectDir))
    .update("\0")
    .update(sessionId)
    .digest("hex")
    .slice(0, 24);
  return join(tmpdir(), `amadeus-migration-stop-${key}.json`);
}

function nextInProcess(args: string[]): Record<string, unknown> {
  const originalLog = console.log;
  let stdout = "";
  console.log = (...values: unknown[]) => {
    stdout += `${values.map(String).join(" ")}\n`;
  };
  try {
    handleNext(args, REPO_ROOT);
  } finally {
    console.log = originalLog;
  }
  return JSON.parse(stdout.trim()) as Record<string, unknown>;
}

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

interface UtilityRun {
  command?: string[];
  cwd?: string;
  exitCode?: number;
  stdout: string;
  stderr: string;
}

function runUtilityInProcess(args: string[], fakeSpawn = false): UtilityRun {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  const originalConsoleError = console.error;
  const originalSpawnSync = Bun.spawnSync;
  let command: string[] | undefined;
  let cwd: string | undefined;
  let exitCode: number | undefined;
  let stdout = "";
  let stderr = "";

  process.argv = [process.execPath, "amadeus-utility.ts", ...args];
  process.exit = ((code?: number): never => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += typeof chunk === "string"
      ? chunk
      : Buffer.from(chunk).toString("utf-8");
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += typeof chunk === "string"
      ? chunk
      : Buffer.from(chunk).toString("utf-8");
    return true;
  }) as typeof process.stderr.write;
  console.error = (...values: unknown[]) => {
    stderr += `${values.map(String).join(" ")}\n`;
  };
  if (fakeSpawn) {
    Bun.spawnSync = ((options: { cmd: string[]; cwd?: string }) => {
      command = options.cmd;
      cwd = options.cwd;
      return {
        exitCode: 0,
        stdout: Buffer.from("migrator stdout"),
        stderr: Buffer.from("migrator stderr"),
      } as never;
    }) as unknown as typeof Bun.spawnSync;
  }

  try {
    runUtilityMain();
  } catch (error) {
    if (error instanceof ExitSignal) exitCode = error.code;
    else throw error;
  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    console.error = originalConsoleError;
    Bun.spawnSync = originalSpawnSync;
  }
  return { command, cwd, exitCode, stdout, stderr };
}

describe("migration shell and latch seams run in process", () => {
  test("the strict tokenizer handles double-quoted and escaped arguments", () => {
    const utility = ".claude/tools/amadeus-utility.ts";
    expect(isMigrationExecutionCommand(`bun "${utility}" migrate "source tree"`, REPO_ROOT)).toBe(true);
    expect(
      isMigrationExecutionCommand(
        String.raw`bun ".claude/tools/amadeus-utility.ts" migrate "source\"tree"`,
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationExecutionCommand(
        String.raw`bun ".claude/tools/amadeus-utility.ts" migrate "source\q"`,
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationExecutionCommand(
        `bun ".claude/tools/amadeus-utility.ts" migrate "source$HOME"`,
        REPO_ROOT,
      ),
    ).toBe(false);
    expect(
      isMigrationExecutionCommand(
        `bun "${utility}" migrate "source${String.fromCharCode(92)}`,
        REPO_ROOT,
      ),
    ).toBe(false);
    expect(
      isMigrationExecutionCommand(
        String.raw`bun .claude/tools/amadeus-utility.ts migrate source\ tree`,
        REPO_ROOT,
      ),
    ).toBe(true);
    expect(
      isMigrationExecutionCommand(
        `bun ${utility} migrate source${String.fromCharCode(92)}`,
        REPO_ROOT,
      ),
    ).toBe(false);
  });

  test("owner mismatch and malformed latch content fail closed", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-latch-seam-"));
    const ownerSession = `owner-${process.pid}`;
    const modeSession = `mode-${process.pid}`;
    const malformedSession = `malformed-${process.pid}`;
    const originalGetuid = process.getuid;
    try {
      if (originalGetuid !== undefined) {
        armMigrationStopLatch(project, modeSession, 1_000);
        chmodSync(migrationLatchPath(project, modeSession), 0o644);
        expect(consumeMigrationStopLatch(project, modeSession, 1_001)).toBe(false);

        armMigrationStopLatch(project, ownerSession, 1_000);
        process.getuid = (() => originalGetuid() + 1) as typeof process.getuid;
        expect(consumeMigrationStopLatch(project, ownerSession, 1_001)).toBe(false);
        process.getuid = originalGetuid;
      }

      armMigrationStopLatch(project, malformedSession, 1_000);
      writeFileSync(migrationLatchPath(project, malformedSession), "not-json\n", "utf-8");
      expect(consumeMigrationStopLatch(project, malformedSession, 1_001)).toBe(false);
    } finally {
      process.getuid = originalGetuid;
      for (const session of [ownerSession, modeSession, malformedSession]) {
        try {
          unlinkSync(migrationLatchPath(project, session));
        } catch {
          // The failed claim normally removes the latch.
        }
      }
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("non-POSIX runtimes rely on the user temp ACL for regular latches", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-latch-windows-"));
    const session = `windows-${process.pid}`;
    const originalGetuid = process.getuid;
    try {
      armMigrationStopLatch(project, session, 1_000);
      chmodSync(migrationLatchPath(project, session), 0o666);
      process.getuid = undefined as unknown as typeof process.getuid;
      expect(consumeMigrationStopLatch(project, session, 1_001)).toBe(true);
    } finally {
      process.getuid = originalGetuid;
      try {
        unlinkSync(migrationLatchPath(project, session));
      } catch {
        // A successful claim consumes the latch.
      }
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("migration orchestration routes run in process", () => {
  test.each([
    [["--migrate", "imports/a b's"], "print"],
    [["--migrate", "imports/evil`path"], "error"],
    [["--migrate", "imports/source", "--stage"], "error"],
    [["--migrate", "--migrate"], "error"],
    [["--migrate", "imports/source", "unexpected"], "error"],
    [["--apply"], "error"],
  ] as const)("handleNext(%j) emits %s", (args, kind) => {
    expect(nextInProcess([...args]).kind).toBe(kind);
  });
});

describe("migration utility dispatch runs in process", () => {
  test("forwards the complete migration argv and both output streams", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-utility-seam-"));
    try {
      const run = runUtilityInProcess(
        ["migrate", "imports/source", "--apply", "--json", "--project-dir", project],
        true,
      );
      expect(run.command).toEqual([
        "bun",
        join(REPO_ROOT, "packages/framework/core/tools/amadeus-migrate.ts"),
        "--from",
        "imports/source",
        "--project-dir",
        project,
        "--apply",
        "--json",
      ]);
      expect(run.stdout).toBe("migrator stdout");
      expect(run.stderr).toBe("migrator stderr");
      expect(run.exitCode).toBeUndefined();
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("resolves a relative project dir once before spawning the migrator", () => {
    const project = "relative-migration-project";
    const run = runUtilityInProcess(["migrate", "--project-dir", project], true);
    const absoluteProject = resolve(project);
    expect(run.cwd).toBe(absoluteProject);
    expect(run.command).toContain(absoluteProject);
    expect(run.command).not.toContain(project);
  });

  test.each([
    [["migrate", "--stage", "code-generation"], "Unsupported migrate option"],
    [["migrate", "--apply", "imports/source"], "--apply does not accept a value"],
    [["migrate", "one", "two"], "Usage: amadeus-utility migrate"],
    [["unknown"], "Usage: amadeus-utility <help|version|status|doctor|migrate"],
  ] as const)("rejects invalid utility argv %j", (args, message) => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-migration-utility-error-"));
    try {
      const run = runUtilityInProcess([...args, "--project-dir", project]);
      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain(message);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
