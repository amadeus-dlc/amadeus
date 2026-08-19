// covers: file:packages/framework/core/tools/amadeus-swarm.ts
//
// Regression coverage for #738 and #748. The exported seams are driven
// in-process because Bun coverage does not instrument spawned CLI processes.

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  birthIntent,
  readAllAuditShards,
  stateFilePath,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  claimedUnitsFailureEnvelope,
  claimedUnitsOutsideBatch,
  currentStageOrFail,
  fileTamperResultForStatuses,
  handleCheck,
  handleFinalize,
  parsePreparedForkBinding,
  verdictFor,
} from "../../packages/framework/core/tools/amadeus-swarm.ts";
import {
  createAuditUnitPoolRepository,
  createUnitPoolCoordinator,
} from "../../packages/framework/core/tools/amadeus-unit-pool-runtime.ts";
import { ensureOtelBootstrap, resetOtelBootstrapForTests } from "../../packages/framework/core/otel/bootstrap.ts";
import { resetFatalLatchForTests } from "../../packages/framework/core/otel/fatal-latch.ts";
import { appendAuditEntryViaEvents } from "../../packages/framework/core/otel/migration-adapter.ts";
import { resetLoggerProviderForTests } from "../../packages/framework/core/otel/logger-provider.ts";
import { resetTracerProviderForTests } from "../../packages/framework/core/otel/tracer-provider.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
});

function makeTemporaryDirectory(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(dir);
  return dir;
}

function runGit(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  expect(result.status).toBe(0);
}

function makeVerdictFixture(): { projectDir: string; worktreeDir: string } {
  const projectDir = makeTemporaryDirectory("amadeus-t207-verdict-");
  const worktreeDir = join(projectDir, ".amadeus", "worktrees", "bolt-alpha");
  mkdirSync(join(worktreeDir, "spec"), { recursive: true });
  runGit(worktreeDir, ["init", "-q"]);
  runGit(worktreeDir, ["config", "user.email", "t@t"]);
  runGit(worktreeDir, ["config", "user.name", "t"]);
  writeFileSync(join(worktreeDir, "spec", "protected.test"), "EXPECTED\n");
  runGit(worktreeDir, ["add", "spec/protected.test"]);
  runGit(worktreeDir, ["commit", "-q", "-m", "seed protected test"]);
  return { projectDir, worktreeDir };
}

const passingCheckCommand = process.platform === "win32" ? "exit /b 0" : "true";

describe("t207 claimed/units guard (#738)", () => {
  test("failure correlation rejects missing workflow state before audit emission", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-missing-state-");
    const originalExit = process.exit;
    const error = spyOn(console, "error").mockImplementation(() => {});
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    try {
      expect(() => currentStageOrFail(projectDir)).toThrow("exit 1");
      expect(error).toHaveBeenCalledWith(expect.stringContaining("Current Stage"));
    } finally {
      process.exit = originalExit;
      error.mockRestore();
    }
  });

  test("failure correlation resolves a non-empty Current Stage", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-current-stage-");
    birthIntent(projectDir, "failure-correlation", "default", "feature");
    writeFileSync(
      stateFilePath(projectDir),
      "# AI-DLC State Tracking\n\n- **Current Stage**: code-generation\n",
    );

    expect(currentStageOrFail(projectDir)).toBe("code-generation");
  });

  test("finalize carries the resolved stage into failed Bolt emission", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-failed-bolt-");
    birthIntent(projectDir, "failed-bolt", "default", "feature");
    writeFileSync(
      stateFilePath(projectDir),
      "# AI-DLC State Tracking\n\n- **Current Stage**: code-generation\n",
    );
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
    pool.initialEnqueue({
      idempotencyKey: "init",
      batchId: "1",
      cap: 1,
      units: [{ unitId: "alpha", dependsOn: [] }],
    });
    pool.acquire({ idempotencyKey: "acquire", batchId: "1" });
    const attempt = pool.readProjection("1").active[0];
    pool.confirmDispatch({
      idempotencyKey: "confirm",
      batchId: "1",
      attemptId: attempt.attemptId,
      nativeHandle: "native-alpha",
    });
    pool.settleRelease({
      idempotencyKey: "settle",
      batchId: "1",
      attemptId: attempt.attemptId,
      outcome: "failed",
    });
    const originalExit = process.exit;
    const log = spyOn(console, "log").mockImplementation(() => {});
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    try {
      expect(() => handleFinalize([
        "--project-dir",
        projectDir,
        "--batch",
        "1",
        "--units",
        "alpha",
        "--claimed",
        "alpha",
        "--check-cmd",
        passingCheckCommand,
      ])).toThrow("exit 2");
      const audit = readAllAuditShards(projectDir);
      expect(audit).toContain('"Stage":"code-generation"');
      expect(audit).toContain(`"Attempt Id":"${attempt.attemptId}"`);
      expect(audit).toContain('"Batch Id":"1"');
    } finally {
      process.exit = originalExit;
      log.mockRestore();
    }
  });

  test("finalize rejects a failed Unit without a terminal attempt before audit emission", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-missing-attempt-");
    birthIntent(projectDir, "missing-attempt", "default", "feature");
    writeFileSync(
      stateFilePath(projectDir),
      "# AI-DLC State Tracking\n\n- **Current Stage**: code-generation\n",
    );
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
    pool.initialEnqueue({
      idempotencyKey: "init",
      batchId: "2",
      cap: 1,
      units: [{ unitId: "alpha", dependsOn: [] }],
    });
    pool.acquire({ idempotencyKey: "acquire", batchId: "2" });
    const attempt = pool.readProjection("2").active[0];
    pool.confirmDispatch({
      idempotencyKey: "confirm",
      batchId: "2",
      attemptId: attempt.attemptId,
      nativeHandle: "native-alpha",
    });
    pool.settleRelease({
      idempotencyKey: "settle",
      batchId: "2",
      attemptId: attempt.attemptId,
      outcome: "failed",
    });
    let exitCode = -1;
    const originalExit = process.exit;
    const log = spyOn(console, "log").mockImplementation(() => {});
    process.exit = ((code?: number) => {
      exitCode = code ?? 0;
      return undefined as never;
    }) as typeof process.exit;
    try {
      handleFinalize([
        "--project-dir",
        projectDir,
        "--batch",
        "2",
        "--units",
        "alpha,beta",
        "--check-cmd",
        passingCheckCommand,
      ], (code) => {
        exitCode = code;
      });
      expect(exitCode).toBe(2);
      const audit = readAllAuditShards(projectDir);
      expect(audit).not.toContain("amadeus.swarm.unit.failed");
      expect(audit).not.toContain("amadeus.bolt.failed");
      expect(audit).not.toContain("amadeus.swarm.baton.returned");
      expect(audit).not.toContain("amadeus.swarm.completed");
    } finally {
      process.exit = originalExit;
      log.mockRestore();
    }
  });

  test("finalize stops after amadeus-bolt fail cannot emit", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-bolt-fail-");
    birthIntent(projectDir, "bolt-fail", "default", "feature");
    writeFileSync(
      stateFilePath(projectDir),
      "# AI-DLC State Tracking\n\n- **Current Stage**: code-generation\n",
    );
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
    pool.initialEnqueue({
      idempotencyKey: "init",
      batchId: "3",
      cap: 1,
      units: [{ unitId: "alpha", dependsOn: [] }],
    });
    pool.acquire({ idempotencyKey: "acquire", batchId: "3" });
    const attempt = pool.readProjection("3").active[0];
    pool.confirmDispatch({
      idempotencyKey: "confirm",
      batchId: "3",
      attemptId: attempt.attemptId,
      nativeHandle: "native-alpha",
    });
    pool.settleRelease({
      idempotencyKey: "settle",
      batchId: "3",
      attemptId: attempt.attemptId,
      outcome: "failed",
    });
    const originalExit = process.exit;
    const log = spyOn(console, "log").mockImplementation(() => {});
    const error = spyOn(console, "error").mockImplementation(() => {});
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    try {
      expect(() => handleFinalize([
        "--project-dir",
        projectDir,
        "--batch",
        "3",
        "--units",
        "alpha",
        "--check-cmd",
        passingCheckCommand,
      ], process.exit, () => ({
        ok: false,
        stdout: "",
        stderr: "synthetic bolt failure",
      }))).toThrow("exit 1");
      const audit = readAllAuditShards(projectDir);
      expect(audit).toContain("amadeus.swarm.unit.failed");
      expect(audit).not.toContain("amadeus.swarm.baton.returned");
      expect(audit).not.toContain("amadeus.swarm.completed");
    } finally {
      process.exit = originalExit;
      log.mockRestore();
      error.mockRestore();
    }
  });

  test("finalize stops source integration after the first source merge failure", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-source-merge-");
    birthIntent(projectDir, "source-merge", "default", "feature");
    writeFileSync(
      stateFilePath(projectDir),
      "# AI-DLC State Tracking\n\n- **Current Stage**: code-generation\n",
    );
    for (const unit of ["alpha", "beta"]) {
      mkdirSync(join(projectDir, ".amadeus", "worktrees", `bolt-${unit}`), {
        recursive: true,
      });
    }
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
    pool.initialEnqueue({
      idempotencyKey: "init",
      batchId: "4",
      cap: 1,
      units: [
        { unitId: "alpha", dependsOn: [] },
        { unitId: "beta", dependsOn: [] },
      ],
    });
    for (const unit of ["alpha", "beta"]) {
      pool.acquire({ idempotencyKey: `acquire-${unit}`, batchId: "4" });
      const attempt = pool.readProjection("4").active[0];
      pool.confirmDispatch({
        idempotencyKey: `confirm-${unit}`,
        batchId: "4",
        attemptId: attempt.attemptId,
        nativeHandle: `native-${unit}`,
      });
      pool.settleRelease({
        idempotencyKey: `settle-${unit}`,
        batchId: "4",
        attemptId: attempt.attemptId,
        outcome: "succeeded",
      });
    }

    const toolCalls: { tool: string; args: string[] }[] = [];
    let output = "";
    let exitCode = -1;
    let thrown: unknown;
    const originalExit = process.exit;
    const log = spyOn(console, "log").mockImplementation((value) => {
      output = String(value);
    });
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    try {
      handleFinalize(
        [
          "--project-dir",
          projectDir,
          "--batch",
          "4",
          "--units",
          "beta,alpha",
          "--claimed",
          "beta,alpha",
          "--check-cmd",
          passingCheckCommand,
        ],
        (code) => {
          exitCode = code;
        },
        () => ({ ok: true, stdout: "", stderr: "" }),
        (tool, args) => {
          toolCalls.push({ tool, args });
          const slugIndex = args.indexOf("--slug");
          const slug = slugIndex >= 0 ? args[slugIndex + 1] : "";
          if (tool === "amadeus-worktree.ts" && slug === "alpha") {
            return {
              ok: false,
              stdout: '{"status":"conflict","slug":"alpha"}',
              stderr: "",
            };
          }
          return { ok: true, stdout: "", stderr: "" };
        },
      );
    } catch (error) {
      thrown = error;
    } finally {
      process.exit = originalExit;
      log.mockRestore();
    }

    expect(thrown).toBeUndefined();
    expect(exitCode).toBe(2);
    expect(toolCalls.slice(0, 3)).toEqual([
      {
        tool: "amadeus-bolt.ts",
        args: ["release-merge", "--slug", "alpha"],
      },
      {
        tool: "amadeus-bolt.ts",
        args: ["complete", "--merge", "--slug", "alpha", "--batch", "4", "--name", "alpha"],
      },
      {
        tool: "amadeus-worktree.ts",
        args: ["merge", "--slug", "alpha", "--target", "main", "--strategy", "squash"],
      },
    ]);
    expect(
      toolCalls.filter(({ tool }) => tool === "amadeus-worktree.ts"),
    ).toHaveLength(1);
    const envelope = JSON.parse(output);
    expect(envelope.merge_failures.map((entry: { unit: string }) => entry.unit)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(envelope.units).toEqual([
      expect.objectContaining({ unit: "beta", status: "failed", reason: "error" }),
      expect.objectContaining({ unit: "alpha", status: "failed", reason: "error" }),
    ]);
  });

  test("reports every claimed unit outside the batch and accepts a valid subset", () => {
    expect(claimedUnitsOutsideBatch(["alpha", "beta"], ["alpha", "gamma", "gamma"]))
      .toEqual(["gamma"]);
    expect(claimedUnitsOutsideBatch(["alpha", "beta"], ["alpha"])).toEqual([]);
    expect(claimedUnitsFailureEnvelope("1", ["alpha", "beta"], ["alpha"])).toBeNull();
  });

  test("finalize returns an exit-2 failure envelope before running any unit check", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-finalize-");
    const alphaWorktree = join(projectDir, ".amadeus", "worktrees", "bolt-alpha");
    mkdirSync(alphaWorktree, { recursive: true });
    const marker = join(projectDir, "check-ran");
    const escapedMarker = marker.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    const checkCommand =
      `"${process.execPath}" -e "require('node:fs').writeFileSync('${escapedMarker}', 'ran')"`;
    let output = "";
    let exitCode = -1;
    const log = spyOn(console, "log").mockImplementation((value) => {
      output = String(value);
    });

    try {
      handleFinalize(
        [
          "--project-dir",
          projectDir,
          "--batch",
          "1",
          "--units",
          "alpha,beta",
          "--claimed",
          "alpha,gamma",
          "--check-cmd",
          checkCommand,
        ],
        (code) => {
          exitCode = code;
        },
      );
    } finally {
      log.mockRestore();
    }

    expect(exitCode).toBe(2);
    expect(existsSync(marker)).toBe(false);
    expect(JSON.parse(output)).toEqual({
      batch: "1",
      units: [
        {
          unit: "gamma",
          status: "failed",
          reason: "error",
          detail: "claimed unit is not listed in --units",
        },
      ],
      converged: 0,
      failed: 1,
      merge_failures: [],
    });
  });
});

describe("t207 protected-file anti-tamper guard (#748)", () => {
  test("detects a protected-file change committed after the prepared fork", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();
    const forkSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).stdout.trim();
    writeFileSync(join(worktreeDir, "spec", "protected.test"), "TAMPERED\n");
    runGit(worktreeDir, ["add", "spec/protected.test"]);
    runGit(worktreeDir, ["commit", "-q", "-m", "commit protected test tamper"]);
    const verifiedHead = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).stdout.trim();

    expect(
      verdictFor("alpha", projectDir, passingCheckCommand, {
        testFile: "spec/protected.test",
        forkSha,
        expectedHead: verifiedHead,
      }),
    ).toEqual({
      exists: true,
      converged: true,
      tampered: true,
    });
  });

  test("classifies fork-untracked and unexpected git statuses as loud errors", () => {
    expect(fileTamperResultForStatuses(128, 0, "spec/untracked.test")).toEqual({
      status: "error",
      detail: "protected test file is not tracked at the prepared fork: spec/untracked.test",
    });
    expect(fileTamperResultForStatuses(0, 128, "spec/protected.test")).toEqual({
      status: "error",
      detail:
        "could not compare protected test file against the prepared fork (git diff exit 128): spec/protected.test",
    });
  });

  test("keeps tracked clean and tracked tampered classifications", () => {
    expect(fileTamperResultForStatuses(0, 0, "spec/protected.test")).toEqual({
      status: "clean",
    });
    expect(fileTamperResultForStatuses(0, 1, "spec/protected.test")).toEqual({
      status: "tampered",
    });
  });

  test("verdictFor rejects a fork-untracked protected file through the shared error path", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();
    const forkSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).stdout.trim();
    writeFileSync(join(worktreeDir, "spec", "untracked.test"), "UNTRACKED\n");

    const verdict = verdictFor(
      "alpha",
      projectDir,
      passingCheckCommand,
      { testFile: "spec/untracked.test", forkSha },
    );

    expect(verdict).toEqual({
      exists: true,
      converged: true,
      tampered: false,
      confineError: "protected test file is not tracked at the prepared fork: spec/untracked.test",
    });
  });

  test("verdictFor preserves tracked clean and tracked tampered behavior", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();
    const forkSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).stdout.trim();

    const clean = verdictFor(
      "alpha",
      projectDir,
      passingCheckCommand,
      { testFile: "spec/protected.test", forkSha },
    );
    expect(clean).toEqual({
      exists: true,
      converged: true,
      tampered: false,
    });

    writeFileSync(join(worktreeDir, "spec", "protected.test"), "TAMPERED\n");
    const tampered = verdictFor(
      "alpha",
      projectDir,
      passingCheckCommand,
      { testFile: "spec/protected.test", forkSha },
    );
    expect(tampered).toEqual({
      exists: true,
      converged: true,
      tampered: true,
    });
  });
});

// --- #3197 in-process coverage: fork binding, check binding gate, and the ---
// --- finalize per-Unit transaction failure arms -----------------------------

/** Emit a real audit row through the canonical event seam. */
function emitAuditRow(
  projectDir: string,
  event: string,
  fields: Record<string, string>,
): void {
  ensureOtelBootstrap(projectDir);
  appendAuditEntryViaEvents(event, fields, projectDir);
}

/** A batch with a terminal, all-succeeded fixed Unit pool. */
function buildSucceededPool(projectDir: string, batch: string, units: string[]): void {
  const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir));
  pool.initialEnqueue({
    idempotencyKey: "init",
    batchId: batch,
    cap: 1,
    units: units.map((unitId) => ({ unitId, dependsOn: [] })),
  });
  for (const unit of units) {
    pool.acquire({ idempotencyKey: `acquire-${unit}`, batchId: batch });
    const attempt = pool.readProjection(batch).active[0];
    pool.confirmDispatch({
      idempotencyKey: `confirm-${unit}`,
      batchId: batch,
      attemptId: attempt.attemptId,
      nativeHandle: `native-${unit}`,
    });
    pool.settleRelease({
      idempotencyKey: `settle-${unit}`,
      batchId: batch,
      attemptId: attempt.attemptId,
      outcome: "succeeded",
    });
  }
}

interface FinalizeDrive {
  readonly envelope: {
    converged: number;
    failed: number;
    merge_failures: { unit: string; detail: string }[];
    units: { unit: string; status: string; detail?: string }[];
  };
  readonly exitCode: number;
  readonly toolCalls: { tool: string; args: string[] }[];
}

/** Drive handleFinalize in-process with a stubbed sibling-tool runner. */
function driveFinalize(
  projectDir: string,
  extraArgs: string[],
  toolResultFor: (tool: string, args: string[]) => { ok: boolean; stdout: string; stderr: string },
): FinalizeDrive {
  const toolCalls: { tool: string; args: string[] }[] = [];
  let output = "";
  let exitCode = -1;
  const log = spyOn(console, "log").mockImplementation((value) => {
    output = String(value);
  });
  try {
    handleFinalize(
      ["--project-dir", projectDir, ...extraArgs],
      (code) => {
        exitCode = code;
      },
      () => ({ ok: true, stdout: "", stderr: "" }),
      (tool, args) => {
        toolCalls.push({ tool, args });
        return toolResultFor(tool, args);
      },
    );
  } finally {
    log.mockRestore();
  }
  return { envelope: JSON.parse(output), exitCode, toolCalls };
}

const okTool = (): { ok: boolean; stdout: string; stderr: string } => ({
  ok: true,
  stdout: "",
  stderr: "",
});

describe("t207 prepared fork binding (#3197)", () => {
  test("parsePreparedForkBinding fails closed without audit and keeps the base of a Base-SHA-less row", () => {
    const empty = makeTemporaryDirectory("amadeus-t207-binding-empty-");
    birthIntent(empty, "binding-empty", "default", "feature");
    expect(parsePreparedForkBinding(empty, "alpha")).toBeNull();

    const legacy = makeTemporaryDirectory("amadeus-t207-binding-legacy-");
    birthIntent(legacy, "binding-legacy", "default", "feature");
    emitAuditRow(legacy, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": "/tmp/wt",
      "Branch name": "bolt-alpha",
      "Base branch": "delivery",
    });
    // A legacy row without Base SHA keeps its recorded delivery target; only
    // the anti-tamper baseline is absent (forkSha: null fails closed where a
    // baseline is required).
    expect(parsePreparedForkBinding(legacy, "alpha")).toEqual({
      base: "delivery",
      forkSha: null,
    });
  });

  test("parsePreparedForkBinding parses the WORKTREE_CREATED fork contract", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-binding-");
    birthIntent(projectDir, "binding", "default", "feature");
    emitAuditRow(projectDir, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": "/tmp/wt",
      "Branch name": "bolt-alpha",
      "Base branch": "delivery",
      "Base SHA": "a".repeat(40),
    });
    expect(parsePreparedForkBinding(projectDir, "alpha")).toEqual({
      base: "delivery",
      forkSha: "a".repeat(40),
    });
  });

  test("check with --test-file fails closed without a binding and on a Base-SHA-less binding", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-check-binding-");
    birthIntent(projectDir, "check-binding", "default", "feature");
    const runCheck = (): { output: string; exitCode: number } => {
      let output = "";
      let exitCode = -1;
      const log = spyOn(console, "log").mockImplementation((value) => {
        output = String(value);
      });
      try {
        handleCheck(
          [
            "--project-dir",
            projectDir,
            "alpha",
            "--check-cmd",
            passingCheckCommand,
            "--test-file",
            "spec/protected.test",
          ],
          (code) => {
            exitCode = code;
          },
        );
      } finally {
        log.mockRestore();
      }
      return { output, exitCode };
    };

    const noBinding = runCheck();
    expect(noBinding.exitCode).toBe(1);
    expect(JSON.parse(noBinding.output).detail).toContain("no prepared fork binding");

    // A legacy row keeps its base but has no baseline: --test-file still fails.
    emitAuditRow(projectDir, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": "/tmp/wt",
      "Branch name": "bolt-alpha",
      "Base branch": "main",
    });
    const legacyBinding = runCheck();
    expect(legacyBinding.exitCode).toBe(1);
    expect(JSON.parse(legacyBinding.output).detail).toContain("no prepared fork binding");
  });

  test("check resolves the anti-tamper baseline from the prepared fork binding", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();
    birthIntent(projectDir, "check-baseline", "default", "feature");
    const forkSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).stdout.trim();
    emitAuditRow(projectDir, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": worktreeDir,
      "Branch name": "bolt-alpha",
      "Base branch": "main",
      "Base SHA": forkSha,
    });
    writeFileSync(join(worktreeDir, "spec", "protected.test"), "TAMPERED\n");
    let output = "";
    let exitCode = -1;
    const log = spyOn(console, "log").mockImplementation((value) => {
      output = String(value);
    });
    try {
      handleCheck(
        [
          "--project-dir",
          projectDir,
          "alpha",
          "--check-cmd",
          passingCheckCommand,
          "--test-file",
          "spec/protected.test",
        ],
        (code) => {
          exitCode = code;
        },
      );
    } finally {
      log.mockRestore();
    }
    expect(exitCode).toBe(1);
    expect(JSON.parse(output).tampered).toBe(true);
  });
});

describe("t207 verdict HEAD-binding guards (#3197)", () => {
  test("expectedHead mismatch is a confine error", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();
    const head = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).stdout.trim();
    const verdict = verdictFor("alpha", projectDir, passingCheckCommand, {
      expectedHead: "0".repeat(40),
    });
    expect(verdict.confineError).toBe(
      `worker HEAD does not match the verified source binding: expected ${"0".repeat(40)}, got ${head}`,
    );
  });

  test("a check command that moves the worker HEAD is a confine error", () => {
    const { projectDir } = makeVerdictFixture();
    const verdict = verdictFor(
      "alpha",
      projectDir,
      "git commit --allow-empty -q -m bump",
      { expectedHead: "0".repeat(40) },
    );
    expect(verdict.confineError).toContain("worker HEAD changed during the convergence check");
  });

  test("an unresolvable worker HEAD is a confine error", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-nogit-");
    mkdirSync(join(projectDir, ".amadeus", "worktrees", "bolt-alpha"), { recursive: true });
    const verdict = verdictFor("alpha", projectDir, passingCheckCommand, {
      expectedHead: "0".repeat(40),
    });
    expect(verdict.confineError).toBe(
      "could not resolve the worker HEAD before and after the convergence check",
    );
  });

  test("a --test-file escaping the worktree stays a confine error via the binding", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();
    const forkSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: worktreeDir,
      encoding: "utf-8",
    }).stdout.trim();
    const verdict = verdictFor("alpha", projectDir, passingCheckCommand, {
      testFile: "../outside.test",
      forkSha,
    });
    expect(verdict.confineError).toBe(
      "--test-file resolves outside the unit worktree: ../outside.test",
    );
  });
});

describe("t207 finalize source-transaction arms (#3197)", () => {
  function finalizeFixture(prefix: string, withWorktree = true): string {
    const projectDir = makeTemporaryDirectory(prefix);
    birthIntent(projectDir, "finalize-arms", "default", "feature");
    writeFileSync(
      stateFilePath(projectDir),
      "# AI-DLC State Tracking\n\n- **Current Stage**: code-generation\n",
    );
    if (withWorktree) {
      mkdirSync(join(projectDir, ".amadeus", "worktrees", "bolt-alpha"), { recursive: true });
    }
    buildSucceededPool(projectDir, "7", ["alpha"]);
    return projectDir;
  }

  const finalizeArgs = [
    "--batch",
    "7",
    "--units",
    "alpha",
    "--claimed",
    "alpha",
    "--check-cmd",
    passingCheckCommand,
  ];

  test("a release-merge failure is a merge failure and never reaches the source merge", () => {
    const projectDir = finalizeFixture("amadeus-t207-release-fail-");
    const drive = driveFinalize(projectDir, finalizeArgs, (tool, args) =>
      tool === "amadeus-bolt.ts" && args[0] === "release-merge"
        ? { ok: false, stdout: "", stderr: "hold lock stuck" }
        : okTool(),
    );
    expect(drive.exitCode).toBe(2);
    expect(drive.envelope.converged).toBe(0);
    expect(drive.envelope.merge_failures).toEqual([
      { unit: "alpha", detail: "release-merge failed: hold lock stuck" },
    ]);
    expect(drive.envelope.units[0].status).toBe("failed");
    expect(drive.toolCalls.some((c) => c.tool === "amadeus-worktree.ts")).toBe(false);
  });

  test("a metadata merge failure skips the source merge for that Unit", () => {
    const projectDir = finalizeFixture("amadeus-t207-metadata-fail-");
    const drive = driveFinalize(projectDir, finalizeArgs, (tool, args) =>
      tool === "amadeus-bolt.ts" && args[0] === "complete"
        ? { ok: false, stdout: "", stderr: "state conflict" }
        : okTool(),
    );
    expect(drive.exitCode).toBe(2);
    expect(drive.envelope.merge_failures).toEqual([
      { unit: "alpha", detail: "metadata merge failed: state conflict" },
    ]);
    expect(drive.toolCalls.map((c) => c.args[0])).toEqual(["release-merge", "complete"]);
  });

  test("an invalid --strategy fails closed before any unit work", () => {
    const projectDir = finalizeFixture("amadeus-t207-strategy-");
    const originalExit = process.exit;
    const error = spyOn(console, "error").mockImplementation(() => {});
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    try {
      expect(() =>
        handleFinalize(["--project-dir", projectDir, ...finalizeArgs, "--strategy", "bogus"]),
      ).toThrow("exit 1");
      expect(error).toHaveBeenCalledWith(expect.stringContaining("--strategy"));
    } finally {
      process.exit = originalExit;
      error.mockRestore();
    }
  });

  test("a claimed unit without a prepared fork binding fails when --test-file is given", () => {
    const projectDir = finalizeFixture("amadeus-t207-no-binding-");
    const drive = driveFinalize(
      projectDir,
      [...finalizeArgs, "--test-file", "spec/protected.test"],
      () => okTool(),
    );
    expect(drive.exitCode).toBe(2);
    expect(drive.envelope.converged).toBe(0);
    expect(drive.envelope.units[0].status).toBe("failed");
    expect(drive.envelope.units[0].detail).toContain("no prepared fork binding");
  });

  test("an already-delivered unit counts as converged on a current WORKTREE_MERGED receipt", () => {
    const projectDir = finalizeFixture("amadeus-t207-delivered-", false);
    emitAuditRow(projectDir, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": join(projectDir, ".amadeus", "worktrees", "bolt-alpha"),
      "Branch name": "bolt-alpha",
      "Base branch": "main",
      "Base SHA": "a".repeat(40),
    });
    emitAuditRow(projectDir, "WORKTREE_MERGED", {
      "Bolt slug": "alpha",
      "Worktree path": join(projectDir, ".amadeus", "worktrees", "bolt-alpha"),
      "Target branch": "main",
      Strategy: "squash",
    });
    const drive = driveFinalize(projectDir, finalizeArgs, () => okTool());
    expect(drive.exitCode).toBe(0);
    expect(drive.envelope.converged).toBe(1);
    expect(drive.envelope.units[0].status).toBe("converged");
    expect(drive.toolCalls).toEqual([]);
  });

  test("a WORKTREE_MERGED receipt older than the newest fork is not this batch's delivery", () => {
    const projectDir = finalizeFixture("amadeus-t207-stale-receipt-", false);
    emitAuditRow(projectDir, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": join(projectDir, ".amadeus", "worktrees", "bolt-alpha"),
      "Branch name": "bolt-alpha",
      "Base branch": "main",
      "Base SHA": "a".repeat(40),
    });
    emitAuditRow(projectDir, "WORKTREE_MERGED", {
      "Bolt slug": "alpha",
      "Worktree path": join(projectDir, ".amadeus", "worktrees", "bolt-alpha"),
      "Target branch": "main",
      Strategy: "squash",
    });
    // A later prepare re-forks the same slug; the old receipt must not satisfy
    // the new batch. Audit timestamps are second-precision, so append order is
    // the discriminator within the same second.
    emitAuditRow(projectDir, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": join(projectDir, ".amadeus", "worktrees", "bolt-alpha"),
      "Branch name": "bolt-alpha",
      "Base branch": "main",
      "Base SHA": "b".repeat(40),
    });
    const drive = driveFinalize(projectDir, finalizeArgs, () => okTool());
    expect(drive.exitCode).toBe(2);
    expect(drive.envelope.converged).toBe(0);
    expect(drive.envelope.units[0].status).toBe("failed");
    expect(drive.envelope.units[0].detail).toContain("no worktree on re-verify");
  });

  test("a legacy Base-SHA-less fork still delivers to its recorded base branch", () => {
    const projectDir = finalizeFixture("amadeus-t207-legacy-base-");
    emitAuditRow(projectDir, "WORKTREE_CREATED", {
      "Bolt slug": "alpha",
      "Worktree path": join(projectDir, ".amadeus", "worktrees", "bolt-alpha"),
      "Branch name": "bolt-alpha",
      "Base branch": "delivery",
    });
    const drive = driveFinalize(projectDir, finalizeArgs, () => okTool());
    expect(drive.exitCode).toBe(0);
    expect(drive.envelope.converged).toBe(1);
    const merge = drive.toolCalls.find((c) => c.tool === "amadeus-worktree.ts");
    expect(merge).toBeDefined();
    const targetIndex = merge!.args.indexOf("--target");
    expect(merge!.args[targetIndex + 1]).toBe("delivery");
  });

  test("a multi-repo intent without --repo fails closed at the repo boundary", () => {
    const projectDir = makeTemporaryDirectory("amadeus-t207-multirepo-");
    birthIntent(projectDir, "multi-repo", "default", "feature", ["repo-a", "repo-b"]);
    const originalExit = process.exit;
    const error = spyOn(console, "error").mockImplementation(() => {});
    process.exit = ((code?: number) => {
      throw new Error(`exit ${code ?? 0}`);
    }) as typeof process.exit;
    try {
      expect(() =>
        handleFinalize(["--project-dir", projectDir, ...finalizeArgs]),
      ).toThrow("exit 1");
      expect(error).toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
      error.mockRestore();
    }
  });
});
