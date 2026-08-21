// U2's install/upgrade E2E tests (code-generation-plan.md Step 12) exercise
// the real pipeline against the repository's *actual, already-built*
// dist/<harness> tree rather than a synthetic handful of files, so the tests
// prove the CLI can install the genuine distribution shape.
//
// Since ADR-003 (#2152) every version at or above ASSET_INTRO_VERSION is
// fetched as a verified release asset, so the fixture is shaped like the real
// asset scripts/release-dist.ts publishes: a single wrapper directory named
// amadeus-dist-v<version> holding <harness>/... at its root (no dist/ level).
// No live network is involved — the bytes are served by the offline fake
// GitHub server in setup-fake-github-server.ts.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTarGz, type TarFixtureEntry } from "./setup-tar-fixture.ts";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TESTS_DIR, "..", "..");
const DIST_DIR = join(REPO_ROOT, "dist");

/**
 * Builds a release-asset-shaped tar.gz containing <harness>/... for each
 * requested harness, sourced from the repo's real dist/ tree.
 */
export function buildDistAssetFixture(harnesses: readonly string[], versionWithoutV: string): Buffer {
  const entries: TarFixtureEntry[] = [];
  const wrapper = `amadeus-dist-v${versionWithoutV}`;
  for (const harness of harnesses) {
    const harnessDir = join(DIST_DIR, harness);
    for (const relPath of collectFiles(harnessDir, harnessDir)) {
      entries.push({
        type: "file",
        name: `${wrapper}/${harness}/${relPath}`,
        content: readFileSync(join(harnessDir, relPath)),
      });
    }
  }
  if (entries.length === 0) {
    throw new Error(
      `no files found under ${DIST_DIR} for [${harnesses.join(", ")}] — run \`bun run dist\` before the setup E2E tests`,
    );
  }
  return buildTarGz(entries);
}

function collectFiles(root: string, dir: string): string[] {
  const results: string[] = [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (cause) {
    throw new Error(
      `could not read ${dir} — run \`bun run dist\` to build the distribution before the setup E2E tests (${String(cause)})`,
    );
  }
  for (const name of names) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(root, full));
    } else {
      results.push(relative(root, full).split(sep).join("/"));
    }
  }
  return results;
}
