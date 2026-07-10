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
  claimedUnitsFailureEnvelope,
  claimedUnitsOutsideBatch,
  fileTamperResultForStatuses,
  handleFinalize,
  verdictFor,
} from "../../packages/framework/core/tools/amadeus-swarm.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
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
  test("classifies HEAD-untracked and unexpected git statuses as loud errors", () => {
    expect(fileTamperResultForStatuses(128, 0, "spec/untracked.test")).toEqual({
      status: "error",
      detail: "protected test file is not tracked at HEAD: spec/untracked.test",
    });
    expect(fileTamperResultForStatuses(0, 128, "spec/protected.test")).toEqual({
      status: "error",
      detail:
        "could not compare protected test file against HEAD (git diff exit 128): spec/protected.test",
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

  test("verdictFor rejects a HEAD-untracked protected file through the shared error path", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();
    writeFileSync(join(worktreeDir, "spec", "untracked.test"), "UNTRACKED\n");

    const verdict = verdictFor(
      "alpha",
      projectDir,
      passingCheckCommand,
      "spec/untracked.test",
    );

    expect(verdict).toEqual({
      exists: true,
      converged: true,
      tampered: false,
      confineError: "protected test file is not tracked at HEAD: spec/untracked.test",
    });
  });

  test("verdictFor preserves tracked clean and tracked tampered behavior", () => {
    const { projectDir, worktreeDir } = makeVerdictFixture();

    const clean = verdictFor(
      "alpha",
      projectDir,
      passingCheckCommand,
      "spec/protected.test",
    );
    expect(clean).toEqual({
      exists: true,
      converged: true,
      tampered: false,
      confineError: undefined,
    });

    writeFileSync(join(worktreeDir, "spec", "protected.test"), "TAMPERED\n");
    const tampered = verdictFor(
      "alpha",
      projectDir,
      passingCheckCommand,
      "spec/protected.test",
    );
    expect(tampered).toEqual({
      exists: true,
      converged: true,
      tampered: true,
      confineError: undefined,
    });
  });
});
