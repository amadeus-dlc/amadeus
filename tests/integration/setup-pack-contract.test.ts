// covers: workflow:setup-pack-contract
//
// FR-018 / BR-P01-P03 / REL-P01-P02: real `npm pack --dry-run --json` runs
// against packages/setup (never simulated — team.md Forbidden bans
// self-referential validation theater). Three real invocations total
// (performance-design.md budget, ≤28s):
//   1. the real packages/setup directory -> must be "satisfied"
//   2. a mutated copy with LICENSE-MIT dropped from `files` -> must detect
//      "missing" with an exact file list
//   3. a mutated copy with an extra source file added to `files` -> must
//      detect "unexpected" with an exact file list
// Ordering matters (performance-design.md): ensureSetupCliBuilt() runs first
// so dist/cli.js exists in packages/setup BEFORE any copy is made — otherwise
// a missing dist/cli.js would falsely present as a "missing" contract
// violation instead of "build not yet run".

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";
import { PackContract, type PackReport, runNpmPackDryRun } from "../lib/setup-pack-contract.ts";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const SETUP_PACKAGE_DIR = join(REPO_ROOT, "packages", "setup");

const mutationCopyDirs: string[] = [];

/** Copies packages/setup into a disposable temp dir, applies `mutate` to its
 *  package.json, and returns the copy's path. Cleaned up in afterAll. */
function createMutatedCopy(mutatePackageJson: (pkg: { files: string[]; [key: string]: unknown }) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-setup-pack-mutation-"));
  cpSync(SETUP_PACKAGE_DIR, dir, { recursive: true });
  const pkgPath = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  mutatePackageJson(pkg);
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  mutationCopyDirs.push(dir);
  return dir;
}

let satisfiedReport: PackReport;

beforeAll(async () => {
  await ensureSetupCliBuilt();
  const result = runNpmPackDryRun(SETUP_PACKAGE_DIR);
  if (result.type === "err") {
    throw new Error(`npm pack --dry-run --json failed against packages/setup: ${result.error.detail}`);
  }
  satisfiedReport = result.value;
});

afterAll(() => {
  for (const dir of mutationCopyDirs) rmSync(dir, { recursive: true, force: true });
});

describe("pack contract — npm pack --dry-run --json (FR-018, BR-P01-P03)", () => {
  test("the real packages/setup tarball satisfies PackContract", () => {
    const verdict = PackContract.current().isSatisfiedBy(satisfiedReport);
    expect(verdict).toEqual({ type: "satisfied" });
  });

  test("edge case: a declared file dropped from `files` is detected as missing (REL-P02a)", () => {
    const dir = createMutatedCopy((pkg) => {
      pkg.files = pkg.files.filter((f) => f !== "LICENSE-MIT");
    });
    const result = runNpmPackDryRun(dir);
    if (result.type === "err") throw new Error(`npm pack --dry-run --json failed against mutated copy: ${result.error.detail}`);

    const verdict = PackContract.current().isSatisfiedBy(result.value);
    expect(verdict).toEqual({ type: "missing", files: ["LICENSE-MIT"] });
  });

  test("edge case: a stray source file added to `files` is detected as unexpected (REL-P02b)", () => {
    const dir = createMutatedCopy((pkg) => {
      pkg.files = [...pkg.files, "src/cli.ts"];
    });
    const result = runNpmPackDryRun(dir);
    if (result.type === "err") throw new Error(`npm pack --dry-run --json failed against mutated copy: ${result.error.detail}`);

    const verdict = PackContract.current().isSatisfiedBy(result.value);
    expect(verdict).toEqual({ type: "unexpected", files: ["src/cli.ts"] });
  });
});
