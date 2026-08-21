// covers: none (guard predicates are defined in tests/lib/boundary-guard.ts)
//
// t377 (integration) — plugin distribution-boundary guard LIVE scan (intent
// 260731-plugin-value-chain, Unit u3-boundary-guard, FR-A6 / NFR-5).
//
// The canonical plugin source is NOT part of t258's SCAN_ROOTS
// (tests/lib/boundary-guard.ts enumerates packages/framework). t377 therefore
// stands alone and asserts that no tracked plugin source carries a repo-only
// `scripts/` path reference. Generated plugin projections are rebuilt and are
// intentionally outside the tracked corpus.
//
// Reuse without coupling (BR-U3-2): the predicate, AllowRule smart constructor and
// Finding shape come from tests/lib/boundary-guard.ts unchanged; t258's SCAN_ROOTS
// and its corpus allowlist are not read or modified here.
//
// Determinism (same rationale as t258): the corpus is the set of GIT-TRACKED files
// under the plugin faces. Untracked / gitignored machine-local artefacts (a locally
// composed .claude/plugins/ tree, for instance) are excluded so the verdict is
// identical on every machine and in CI.
//
// Mechanism: real FS reads plus a `git ls-files` / `git grep` process boundary —
// integration tier, never unit (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AllowRule, type Finding, type RawAllowRule, scanDistributionTreeForScriptsRefs } from "../lib/boundary-guard.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// The source-only tracked plugin face. Per-harness projections, composed host
// copies, and installer staging trees are generated output.
const PLUGIN_SCAN_ROOTS: readonly string[] = Object.freeze([
  "plugins",
] as const);

// Allowlist for legitimate `scripts/` tokens inside plugin faces. Empty by design:
// a shipped plugin has no reason to reference a repo-only path, so every occurrence
// is a violation until someone records an id and a reason here (fail-closed, BR-U3-3).
const RAW_PLUGIN_ALLOWLIST: readonly RawAllowRule[] = Object.freeze([] as const);

function git(args: string[]): { status: number; stdout: string } {
  const r = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status ?? -1, stdout: r.stdout ?? "" };
}

function gitLines(args: string[]): string[] {
  return git(args)
    .stdout.split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Tracked files under the plugin faces that contain the literal `scripts/`.
// Pre-filtering with `git grep -l` is exact for the predicate: a file without the
// token can never produce a finding.
function candidateFiles(): string[] {
  const res = git(["grep", "-lE", "scripts/", "--", ...PLUGIN_SCAN_ROOTS]);
  // git grep: 0 = matches, 1 = no matches (both fine), >1 = real error.
  expect(res.status === 0 || res.status === 1).toBe(true);
  return res.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function buildAllowlist(): AllowRule[] {
  return RAW_PLUGIN_ALLOWLIST.map((raw) => {
    const r = AllowRule.parse(raw);
    if (r.type !== "ok") throw new Error(`plugin AllowRule '${raw.id}' failed to parse: ${r.error.kind}`);
    return r.value;
  });
}

describe("t377 live sweep — plugin faces carry no repo-only scripts/ reference (FR-A6)", () => {
  test("every tracked plugin file is free of scripts/ references (live findings = 0)", () => {
    const files = candidateFiles().map((path) => ({ path, content: readFileSync(join(REPO_ROOT, path), "utf8") }));
    const findings = scanDistributionTreeForScriptsRefs(files, buildAllowlist());

    expect(findings).toEqual([]);
  });
});

describe("t377 fixture falling-proof — an injected reference is flagged (NFR-5)", () => {
  test("a plugin stage body carrying scripts/ produces findings", () => {
    const path = "tests/fixtures/plugin-boundary-guard/stage-with-scripts-ref.md";
    const files = [{ path, content: readFileSync(join(REPO_ROOT, path), "utf8") }];
    const findings = scanDistributionTreeForScriptsRefs(files, buildAllowlist());

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f: Finding) => f.file === path)).toBe(true);
    // Prose and comments are violations too (BR-U3-3): the fixture's narrative
    // mention is flagged alongside the runnable command.
    expect(findings.length).toBeGreaterThan(1);
  });
});

describe("t377 vacuity guard — the sweep is not silently empty", () => {
  test("the allowlist stays empty, so no occurrence can be exempted", () => {
    expect(RAW_PLUGIN_ALLOWLIST).toEqual([]);
    expect(buildAllowlist()).toEqual([]);
  });

  test("each plugin face resolves to at least one tracked file", () => {
    for (const root of PLUGIN_SCAN_ROOTS) {
      expect(gitLines(["ls-files", "--", root]).length).toBeGreaterThan(0);
    }
  });
});
