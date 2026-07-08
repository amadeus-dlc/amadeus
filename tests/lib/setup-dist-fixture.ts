// U2's install E2E test (code-generation-plan.md Step 12) exercises the real
// pipeline against the repository's *actual, already-built* dist/<harness>
// tree rather than a synthetic handful of files, so the test proves the CLI
// can install the genuine distribution shape. Still wrapped as a codeload
// archive (buildCodeloadFixture) — no live network involved.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCodeloadFixture } from "./setup-codeload-fixture.ts";
import type { TarFixtureEntry } from "./setup-tar-fixture.ts";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const DIST_DIR = join(REPO_ROOT, "dist");

/**
 * Builds a codeload-shaped tar.gz containing dist/<harness>/... for each
 * requested harness, sourced from the repo's real dist/ tree.
 */
export function buildDistArchiveFixture(harnesses: readonly string[], versionWithoutV: string): Buffer {
  const entries: TarFixtureEntry[] = [];
  for (const harness of harnesses) {
    const harnessDir = join(DIST_DIR, harness);
    for (const relPath of collectFiles(harnessDir, harnessDir)) {
      entries.push({
        type: "file",
        name: `dist/${harness}/${relPath}`,
        content: readFileSync(join(harnessDir, relPath)),
      });
    }
  }
  return buildCodeloadFixture(`amadeus-${versionWithoutV}`, entries);
}

function collectFiles(root: string, dir: string): string[] {
  const results: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(root, full));
    } else {
      results.push(relative(root, full).split(sep).join("/"));
    }
  }
  return results;
}
