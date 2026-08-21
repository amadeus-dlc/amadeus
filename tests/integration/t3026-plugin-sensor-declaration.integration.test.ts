// covers: file:plugins/github-pr-convergence/plugin.json
// covers: file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: medium
//
// t3026 (integration) — every sensor manifest shipped inside a plugin bundle is
// declared in that bundle's `plugin.json`.
//
// `parseSensors` (amadeus-plugin-compose.ts) treats a missing `sensors` key as
// an empty list, so a manifest that sits on disk without a declaration is never
// projected into <host>/sensors/ and never resolvable by a stage — a silent
// drop with no compile error. #3026 is exactly that: PR #2890 moved
// a plugin-owned sensor manifest from core into that plugin's bundle
// and declared only the tool.
//
// DOMAIN OF THE PREDICATE: sensor manifests, i.e. the git-tracked files matching
// `plugins/<name>/sensors/*.md`. Nothing else in a bundle is enumerated here —
// in particular `tools/` is structurally outside the domain, so an undeclared
// plugin tool (#3078, the orphaned advisory-model-check.ts) is not in scope for
// this check and its presence neither reddens nor greens this file.
//
// Real filesystem plus a `git ls-files` process boundary, hence the integration
// tier (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// The one pattern that defines the domain. Bundle faces other than `sensors/`
// are deliberately absent.
const SENSOR_ASSET_PATHSPEC = "plugins/*/sensors/*.md";

interface SensorAsset {
  /** Bundle directory, repo-relative: `plugins/<name>`. */
  readonly bundle: string;
  /** Manifest path as `plugin.json` must declare it: `sensors/<file>.md`. */
  readonly declaration: string;
  /** Repo-relative path of the manifest on disk. */
  readonly repoPath: string;
}

function trackedSensorAssets(): SensorAsset[] {
  const res = spawnSync("git", ["ls-files", "--", SENSOR_ASSET_PATHSPEC], {
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

function declaredSensors(bundle: string): readonly string[] {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, bundle, "plugin.json"), "utf8")) as {
    sensors?: unknown;
  };
  const raw = manifest.sensors;
  return Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
}

describe("plugin sensor declaration", () => {
  test("git-tracked plugin sensor manifests exist", () => {
    // Guards the whole file against a silently empty corpus: an enumeration that
    // returns nothing would pass the assertion below vacuously.
    expect(trackedSensorAssets().length).toBeGreaterThan(0);
  });

  test("every plugin sensor manifest is declared in its plugin.json", () => {
    const undeclared = trackedSensorAssets().filter(
      (asset) => !declaredSensors(asset.bundle).includes(asset.declaration),
    );
    expect(undeclared.map((asset) => asset.repoPath)).toEqual([]);
  });
});
