// covers: package:@amadeus-dlc/setup, bin:amadeus-setup, cli:amadeus-setup:install, cli:amadeus-setup:upgrade

import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseCommand } from "../../packages/setup/src/cli/command-parser.ts";
import { renderHelp } from "../../packages/setup/src/cli/reporter.ts";
import { runSetup } from "../../packages/setup/src/bin/run-setup.ts";
import { checkSetupPackageMetadata } from "../../packages/setup/src/maintainer/package-check.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const WRAPPER = join(REPO_ROOT, "packages", "setup", "bin", "amadeus-setup.js");
const BUN_ENTRYPOINT = join(REPO_ROOT, "packages", "setup", "src", "bin", "amadeus-setup.ts");

function nodeExecutable(): string {
  const result = spawnSync("bash", ["-lc", "command -v node"], { encoding: "utf-8" });
  return result.status === 0 && result.stdout.trim().length > 0 ? result.stdout.trim() : "node";
}

describe("U1 setup package shell", () => {
  test("help lists install and upgrade but not init", () => {
    const help = renderHelp();
    expect(help).toContain("amadeus-setup install");
    expect(help).toContain("amadeus-setup upgrade");
    expect(help).toContain("Bun is required");
    expect(help).toContain("bunx @amadeus-dlc/setup --help");
    expect(help).toContain("npx @amadeus-dlc/setup");
    expect(help).not.toContain(" init ");
  });

  test("init is rejected before service delegation", async () => {
    let delegated = false;
    const result = await runSetup(["init"], {}, {
      executeCommand: async () => {
        delegated = true;
        return { code: 0, stdout: "", stderr: "" };
      },
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Code: unsupported-command");
    expect(result.stderr).toContain("No files were modified.");
    expect(delegated).toBe(false);
  });

  test("unknown commands and duplicate harness values are classified", () => {
    const unknown = parseCommand(["remove"]);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.error.code).toBe("unknown-command");
    }

    const duplicateHarness = parseCommand(["install", "--harness", "codex", "--harness", "claude"]);
    expect(duplicateHarness.ok).toBe(false);
    if (!duplicateHarness.ok) {
      expect(duplicateHarness.error.code).toBe("duplicate-harness");
    }
  });

  test("unsupported harness is rejected and supported flags are preserved", () => {
    const unsupported = parseCommand(["install", "--harness", "vim"]);
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) {
      expect(unsupported.error.code).toBe("unsupported-harness");
    }

    const parsed = parseCommand([
      "install",
      "--harness",
      "codex",
      "--target",
      "/tmp/project",
      "--version",
      "1.2.3",
      "--yes",
      "--force",
    ]);
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.kind === "command") {
      expect(parsed.command).toEqual({
        command: "install",
        harness: "codex",
        target: "/tmp/project",
        version: "1.2.3",
        yes: true,
        force: true,
      });
    }
  });

  test("valid install and upgrade stop with no-write when harness cannot be inferred", async () => {
    for (const command of ["install", "upgrade"] as const) {
      const result = await runSetup([command, "--target", "/tmp/project"], {});
      expect(result.code).toBe(2);
      expect(result.stderr).toContain("Code: target-detection-failed");
      expect(result.stderr).toContain("could not infer a usable harness");
      expect(result.stderr).toContain("No files were modified.");
    }
  });

  test("help and parser errors do not call the application boundary", async () => {
    let delegated = false;
    const deps = {
      executeCommand: async () => {
        delegated = true;
        return { code: 0, stdout: "", stderr: "" };
      },
    };
    const help = await runSetup(["--help"], {}, deps);
    const invalid = await runSetup(["install", "--harness", "codex", "--harness", "claude"], {}, deps);

    expect(help.code).toBe(0);
    expect(help.stdout).toContain("Commands:");
    expect(invalid.code).toBe(2);
    expect(invalid.stderr).toContain("duplicate-harness");
    expect(delegated).toBe(false);
  });

  test("package metadata check passes and protects root dev-only boundary", () => {
    const result = checkSetupPackageMetadata(REPO_ROOT);
    expect(result.ok).toBe(true);
    expect(result.checks.filter((item) => item.status === "failed")).toEqual([]);
  });

  test("Bun entrypoint emits stable help output", () => {
    const result = spawnSync(process.execPath, [BUN_ENTRYPOINT, "--help"], { encoding: "utf-8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("amadeus-setup install");
    expect(result.stderr).toBe("");
  });

  test("Node/npm wrapper emits bun-required when Bun is hidden from PATH", () => {
    const emptyPath = mkdtempSync(join(tmpdir(), "amadeus-setup-empty-path-"));
    const result = spawnSync(nodeExecutable(), [WRAPPER, "--help"], {
      encoding: "utf-8",
      env: { PATH: emptyPath },
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Bun is required");
    expect(result.stderr).toContain("No files were modified.");
  });
});
