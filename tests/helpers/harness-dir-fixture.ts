// Harness-dir facts read from the authored manifests, never hardcoded in a test.
//
// `packages/framework/harness/<name>/manifest.ts` is the single source for a
// harness's on-disk directory name. Tests that assert "this face resolved to ITS
// OWN harness dir and to no other" need both the own dir and the set of foreign
// dirs; deriving both here keeps a new harness row from silently narrowing those
// assertions (#2790).

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { HarnessManifest } from "../../scripts/manifest-types.ts";

const HARNESS_ROOT = join(import.meta.dir, "..", "..", "packages", "framework", "harness");

export type HarnessProjectionFacts = Readonly<
  Pick<HarnessManifest, "name" | "harnessDir" | "rulesRename">
>;

function harnessManifestOf(name: string): HarnessManifest {
  const mod = require(join(HARNESS_ROOT, name, "manifest.ts")) as { default: HarnessManifest };
  return mod.default;
}

export function harnessNames(): readonly string[] {
  return readdirSync(HARNESS_ROOT)
    .sort()
    .filter((name) => statSync(join(HARNESS_ROOT, name)).isDirectory());
}

export function harnessDirOf(name: string): string {
  return harnessManifestOf(name).harnessDir;
}

export function harnessProjectionFacts(): readonly HarnessProjectionFacts[] {
  return harnessNames().map((name) => {
    const manifest = harnessManifestOf(name);
    return {
      name: manifest.name,
      harnessDir: manifest.harnessDir,
      rulesRename: manifest.rulesRename,
    };
  });
}

// Every DISTINCT harness dir across all packaged harnesses. Fewer entries than
// harnessNames(): kiro and kiro-ide share `.kiro`.
export function allHarnessDirs(): readonly string[] {
  return [...new Set(harnessNames().map(harnessDirOf))].sort();
}

// The harness dirs that are NOT this harness's — the literals whose presence in
// a projected face proves a cross-harness leak.
export function foreignHarnessDirs(name: string): readonly string[] {
  const own = harnessDirOf(name);
  return allHarnessDirs().filter((dir) => dir !== own);
}
