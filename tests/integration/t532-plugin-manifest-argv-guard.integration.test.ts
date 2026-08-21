// covers: file:plugins/github-pr-convergence/plugin.json
//
// t532 (integration) — plugin manifest argv drift guard (Issue #2823, FR-6).
//
// A manifest's argv paths are PLUGIN-ROOT-relative: the engine joins every
// relative path-like element to the located plugin root before running it
// (resolveEvaluatorArgv, amadeus-advisory-declaration.ts). A repo-root-relative
// element (`"plugins/<name>/tools/..."` — the pre-#2823 convention) resolves
// against the plugin root into a path that exists nowhere, and on the staging
// face (consumer layout) it was never runnable to begin with. This sweep fails
// the moment any shipped manifest re-introduces one.
//
// Determinism (same rationale as t531/t377): the corpus is the set of
// GIT-TRACKED plugin.json files under plugins/, so the verdict is identical on
// every machine and in CI.
//
// Mechanism: real FS reads plus a `git ls-files` process boundary —
// integration tier, never unit (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// Every string value in the manifest is walked (argv arrays, tool lists,
// stage paths): a `plugins/`-prefixed string is a repo-root-relative path,
// which the plugin-root-relative resolution convention forbids anywhere in
// the manifest.
function rootRelativeStringFindings(path: string, document: unknown): string[] {
  const findings: string[] = [];
  const pending: Array<readonly [unknown, string]> = [[document, "$"]];
  for (let entry = pending.pop(); entry !== undefined; entry = pending.pop()) {
    const [value, trail] = entry;
    if (typeof value === "string") {
      if (value.startsWith("plugins/")) findings.push(`${path}: ${trail} = ${JSON.stringify(value)}`);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        pending.push([item, `${trail}[${index}]`]);
      });
    } else if (typeof value === "object" && value !== null) {
      for (const [key, item] of Object.entries(value)) pending.push([item, `${trail}.${key}`]);
    }
  }
  return findings;
}

function trackedManifests(): string[] {
  const res = spawnSync("git", ["ls-files", "--", "plugins"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  expect(res.status).toBe(0);
  return (res.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith("/plugin.json"));
}

describe("t532 live sweep — no shipped plugin manifest carries a repo-root-relative string (Issue #2823)", () => {
  test("every tracked plugins/**/plugin.json is free of a `plugins/`-prefixed string", () => {
    const findings = trackedManifests().flatMap((path) =>
      rootRelativeStringFindings(path, JSON.parse(readFileSync(join(REPO_ROOT, path), "utf8")))
    );
    expect(findings).toEqual([]);
  });
});

describe("t532 falling-proof — an injected repo-root-relative argv is flagged", () => {
  test("a manifest whose evaluator argv starts with `plugins/` produces a finding", () => {
    const findings = rootRelativeStringFindings("plugins/demo/plugin.json", {
      name: "demo",
      advisories: [
        {
          code: "demo-hold",
          checkpoints: ["requirements-analysis"],
          evaluator: { argv: ["bun", "plugins/demo/tools/evaluate.ts", "hold"] },
        },
      ],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("plugins/demo/tools/evaluate.ts");
  });

  test("a plugin-root-relative argv produces no finding", () => {
    const findings = rootRelativeStringFindings("plugins/demo/plugin.json", {
      name: "demo",
      advisories: [
        {
          code: "demo-hold",
          checkpoints: ["requirements-analysis"],
          evaluator: { argv: ["bun", "tools/evaluate.ts", "hold"] },
        },
      ],
    });
    expect(findings).toEqual([]);
  });
});

describe("t532 vacuity guard — the sweep is not silently empty", () => {
  test("at least one tracked plugin manifest is scanned", () => {
    expect(trackedManifests().length).toBeGreaterThan(0);
  });
});
