// Lazy build helper for @amadeus-dlc/setup (cicd-pipeline.md — U1 first
// implementer, U4's pack-contract tests reuse this same helper). Naming
// mirrors the existing tests/lib/setup-pack-contract.ts convention.
//
// No independent CI build step exists for packages/setup/dist/cli.js: the only
// tests that need the built artifact build it once, lazily, on first use.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const SETUP_PACKAGE_DIR = join(REPO_ROOT, "packages", "setup");
const CLI_ENTRY = join(SETUP_PACKAGE_DIR, "src", "cli.ts");
const CLI_OUTPUT = join(SETUP_PACKAGE_DIR, "dist", "cli.js");

/**
 * Returns the absolute path to packages/setup/dist/cli.js, building it first
 * (via the same command as ADR-002) if it is not already present. Idempotent:
 * repeated calls do not rebuild once the artifact exists.
 */
export async function ensureSetupCliBuilt(): Promise<string> {
  if (existsSync(CLI_OUTPUT)) return CLI_OUTPUT;

  const result = spawnSync(
    process.execPath,
    ["build", CLI_ENTRY, "--target=node", "--format=esm", `--outfile=${CLI_OUTPUT}`],
    { cwd: SETUP_PACKAGE_DIR, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `bun build failed for @amadeus-dlc/setup (exit ${result.status}):\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
  if (!existsSync(CLI_OUTPUT)) {
    throw new Error(`bun build reported success but ${CLI_OUTPUT} is missing`);
  }
  return CLI_OUTPUT;
}
