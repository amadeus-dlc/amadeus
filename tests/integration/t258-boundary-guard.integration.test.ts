// covers: none (self-contained guard predicates defined in tests/lib/boundary-guard.ts)
//
// t258 (integration) — distribution-boundary guard LIVE scan (intent
// 260722-election-core-promotion, Unit boundary-guard, FR-5a/5b/5c).
//
// Mechanism: none for the guard logic (pure predicates), but this twin performs
// REAL FS collection + a `git ls-files`/`git grep` enumeration (process boundary
// to git) — hence it lives in the integration tier (fs-tests-integration-first /
// size purity), never the unit tier.
//
// Determinism (reliability-design core): the corpus is the set of GIT-TRACKED
// files under SCAN_ROOTS. Untracked / gitignored machine-local files (e.g.
// .claude/settings.local.json, which carries absolute-path session-hook
// commands referencing scripts/) are EXCLUDED — scanning them would make the
// live result non-deterministic across machines and diverge from CI (where they
// do not exist). `git grep -lE scripts/` pre-filters to files that actually
// contain the token; files without it produce no findings, so pre-filtering is
// exact for predicate 1.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AllowRule,
  type Finding,
  findDuplicatedAssets,
  SCAN_ROOTS,
  scanDistributionTreeForScriptsRefs,
} from "../lib/boundary-guard.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

function git(args: string[]): { status: number; stdout: string } {
  const r = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status ?? -1, stdout: r.stdout ?? "" };
}

// Tracked files under SCAN_ROOTS that contain the literal `scripts/`.
function candidateFiles(): string[] {
  const roots = SCAN_ROOTS.map((r) => r.dir);
  const res = git(["grep", "-lE", "scripts/", "--", ...roots]);
  // git grep: status 0 = matches, 1 = no matches (both fine), >1 = real error.
  expect(res.status === 0 || res.status === 1).toBe(true);
  return res.stdout.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
}

function trackedBasenamesDirectlyUnder(dir: string): string[] {
  const res = git(["ls-files", "--", dir]);
  return res.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((p) => p.slice(dir.length + 1)) // strip "dir/"
    .filter((rel) => !rel.includes("/")) // directly under dir only
    .filter((rel) => rel.length > 0);
}

function trackedBasenamesRecursive(dir: string): string[] {
  const res = git(["ls-files", "--", dir]);
  return res.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((p) => p.split("/").pop() as string);
}

// The corpus-sweep allowlist (FR-5c / BR-6): every LEGITIMATE `scripts/` token
// in the tracked distribution corpus, grouped by why it is legitimate, each with
// an audit-able id. After this allowlist, the ONLY residual `scripts/` reference
// is the repo-local election helper the promotion intent targets.
const RAW_ALLOWLIST = [
  {
    id: "framework-build-and-packaging-tooling",
    fileGlob: "**",
    pattern: "scripts/(package\\.ts|package-codex\\.ts|promote-self\\.ts|onboarding\\.ts|manifest-types\\.ts)",
  },
  { id: "team-session-launcher-script", fileGlob: "**", pattern: "scripts/team-up\\.sh" },
  { id: "forbid-lint-tool", fileGlob: "**", pattern: "scripts/forbid" },
  // bare `scripts/` (directory mentions in prose/comments/lint globs): `scripts/`
  // NOT immediately followed by a filename character.
  { id: "bare-scripts-directory-mention", fileGlob: "**", pattern: "scripts/(?![A-Za-z0-9])" },
];

function buildAllowlist(): AllowRule[] {
  return RAW_ALLOWLIST.map((raw) => {
    const r = AllowRule.parse(raw);
    if (r.type !== "ok") throw new Error(`corpus-sweep AllowRule '${raw.id}' failed to parse: ${r.error.kind}`);
    return r.value;
  });
}

// A finding is "known contrib" iff it sits in a shipped amadeus-election SKILL —
// the repo-local election reference U2 (same Bolt) rewrites once election is
// promoted into the framework core.
//
// EXPECTED-RED (temporary isolation set): predicate 1's live scan is RED at this
// Unit's point in time because the contrib election SKILLs still say
// `bun scripts/amadeus-election.ts`. We isolate those known findings and assert
// everything ELSE is 0 (corpus-sweep false-red = 0). The red count/locations are
// recorded below and in code-summary.md as the falling-proof measurement.
//
// TODO(U2, same Bolt): once U2 rewrites the election SKILL(s) to invoke the
// promoted core entrypoint (no `scripts/` reference), isKnownContribSkill will
// match nothing, the residual assertion still holds at 0, and the guard reaches
// full green with NO test change required here. The Bolt PR (U1+U2) lands only
// the green state on CI.
function isKnownContribSkill(file: string): boolean {
  return file.endsWith("skills/amadeus-election/SKILL.md");
}

describe("t258 live predicate 1 — corpus sweep over tracked distribution trees (FR-5a/5c, BR-6)", () => {
  test("only the known contrib election SKILLs remain; every other scripts/ reference is allowlisted (false-red = 0)", () => {
    const files = candidateFiles().map((path) => ({ path, content: readFileSync(join(REPO_ROOT, path), "utf8") }));
    const findings = scanDistributionTreeForScriptsRefs(files, buildAllowlist());

    const residual = findings.filter((f: Finding) => !isKnownContribSkill(f.file));
    const contrib = findings.filter((f: Finding) => isKnownContribSkill(f.file));

    // Falling-proof measurement (BR-4): record the live RED before U2 resolves it.
    // eslint-disable-next-line no-console
    console.log(
      `[t258 live-red] contrib election findings: ${contrib.length}\n` +
        contrib.map((f) => `  ${f.file}:${f.line}  ${f.excerpt}`).join("\n"),
    );

    // BR-6: everything outside the isolated contrib set must be clean.
    expect(residual).toEqual([]);
  });
});

describe("t258 fixture falling-proof (BR-4)", () => {
  test("predicate 1 flags the scripts/-bearing SKILL fixture (empty allowlist)", () => {
    const path = "tests/fixtures/boundary-guard/skill-with-scripts-ref.md";
    const files = [{ path, content: readFileSync(join(REPO_ROOT, path), "utf8") }];
    const findings = scanDistributionTreeForScriptsRefs(files, []);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f: Finding) => f.file === path)).toBe(true);
  });

  test("predicate 2 flags the both-present (copy-residue) directory fixture — red", () => {
    const base = join(REPO_ROOT, "tests/fixtures/boundary-guard/duplicate-scenario");
    const scriptsSide = readdirSync(join(base, "scripts"));
    const canonSide = readdirSync(join(base, "canonical"));
    expect(findDuplicatedAssets(scriptsSide, canonSide)).toEqual(["amadeus-shared-asset.ts"]);
  });
});

describe("t258 live predicate 2 — residual invariant over real trees (BR-3, three-state)", () => {
  test("scripts/ assets and the distribution canon share no basename (currently green — no copy residue)", () => {
    const scriptsAssets = trackedBasenamesDirectlyUnder("scripts");
    const canonical = [
      ...trackedBasenamesRecursive("packages/framework/core/tools"),
      ...trackedBasenamesRecursive("packages/framework/core/skills"),
    ];
    expect(scriptsAssets.length).toBeGreaterThan(0); // sanity: the scripts/ tree is non-empty
    expect(findDuplicatedAssets(scriptsAssets, canonical)).toEqual([]);
  });
});
