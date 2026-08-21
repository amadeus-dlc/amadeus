// covers: file:plugins/github-pr-convergence/plugin.json
// covers: file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: medium
//
// t3078 (integration) — every tool module shipped inside a plugin bundle is
// declared in that bundle's `plugin.json`.
//
// `amadeus-plugin-compose.ts` builds a composed host's owned-paths set from
// `manifest.tools` only (see `resolveImportClosure` in
// `scripts/plugin-projection.ts`, seeded from `manifest.tools.map((t) =>
// t.path)`), so a `.ts` file that sits on disk without a declaration is never
// projected into <host>/tools/ and never reachable from a stage — a silent
// drop with no compile error, mirroring #3026's sensor-declaration gap for the
// `tools/` face. #3078 is exactly that: PR #2890 added
// a test-only helper to a plugin bundle without
// adding it to `plugin.json`'s `tools` array.
//
// DOMAIN OF THE PREDICATE: plugin tool modules, i.e. the git-tracked files
// matching `plugins/<name>/tools/*.ts`. Nothing else in a bundle is
// enumerated here — t3026 already covers the `sensors/` face; this file is
// its `tools/` counterpart.
//
// Real filesystem plus a `git ls-files` process boundary, hence the
// integration tier (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// The one pattern that defines the domain. Bundle faces other than `tools/`
// are deliberately absent.
const TOOL_ASSET_PATHSPEC = "plugins/*/tools/*.ts";

interface ToolAsset {
  /** Bundle directory, repo-relative: `plugins/<name>`. */
  readonly bundle: string;
  /** Module path as `plugin.json` must declare it: `tools/<file>.ts`. */
  readonly declaration: string;
  /** Repo-relative path of the module on disk. */
  readonly repoPath: string;
}

function trackedToolAssets(): ToolAsset[] {
  const res = spawnSync("git", ["ls-files", "--", TOOL_ASSET_PATHSPEC], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  expect(res.status).toBe(0);
  return (res.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((repoPath) => {
      const parts = repoPath.split("/");
      return {
        bundle: parts.slice(0, 2).join("/"),
        declaration: parts.slice(2).join("/"),
        repoPath,
      };
    });
}

function declaredTools(bundle: string): readonly string[] {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, bundle, "plugin.json"), "utf8")) as {
    tools?: unknown;
  };
  const raw = manifest.tools;
  return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
}

describe("plugin tool declaration", () => {
  test("git-tracked plugin tool modules exist", () => {
    // Guards the whole file against a silently empty corpus: an enumeration that
    // returns nothing would pass the assertion below vacuously.
    expect(trackedToolAssets().length).toBeGreaterThan(0);
  });

  test("every plugin tool module is declared in its plugin.json", () => {
    const undeclared = trackedToolAssets().filter(
      (asset) => !declaredTools(asset.bundle).includes(asset.declaration),
    );
    expect(undeclared.map((asset) => asset.repoPath)).toEqual([]);
  });
});
