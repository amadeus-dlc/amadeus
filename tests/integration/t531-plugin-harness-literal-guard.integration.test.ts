// covers: none (guard predicate is defined in tests/lib/boundary-guard.ts)
//
// t531 (integration) — plugin harness-neutrality LIVE scan (Issue #2790).
//
// A shipped plugin's stage prose is a harness-neutral source that the
// projector (scripts/plugin-projection.ts -> scripts/harness-transform.ts)
// composes into every harness's own tree. The transform substitutes ONLY the
// `{{HARNESS_DIR}}` token (HARNESS_TOKEN, harness-transform.ts:11) — a
// hardcoded harness dotdir (`.claude/tools/...` etc.) passes through
// unchanged and resolves on the harness it was written for and nowhere else
// (t531's fixture and t377's sibling `scripts/` guard are the same shape:
// a repo/harness-local path baked into prose meant to travel everywhere).
//
// Reuse without coupling: the predicate, AllowRule smart constructor and
// Finding shape come from tests/lib/boundary-guard.ts unchanged (same file
// t377 uses); t377's own SCRIPTS_TOKEN_RE-based scan and allowlist are not
// read or modified here.
//
// Determinism (same rationale as t377/t258): the corpus is the set of
// GIT-TRACKED files under the plugin faces. Untracked / gitignored
// machine-local artefacts (a locally composed `.claude/plugins/` tree, for
// instance) are excluded so the verdict is identical on every machine and in
// CI.
//
// Mechanism: real FS reads plus a `git ls-files` / `git grep` process
// boundary — integration tier, never unit (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AllowRule, type Finding, type RawAllowRule, scanPluginProseForHarnessLiterals } from "../lib/boundary-guard.ts";
import { transform } from "../../scripts/harness-transform.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

// The source-only tracked plugin face. Per-harness projections, composed host
// copies, and installer staging trees are generated output.
const PLUGIN_SCAN_ROOTS: readonly string[] = Object.freeze(["plugins"] as const);

// Allowlist for legitimate harness-dir literals inside plugin faces. Empty by
// design: a shipped plugin's stage prose has no reason to name one harness's
// tool path, so every occurrence is a violation until someone records an id
// and a reason here (fail-closed, mirrors t377's empty allowlist).
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

// Tracked files under the plugin faces that contain a harness-dir literal
// token. Pre-filtering with `git grep -lE` is exact for the predicate: a file
// without any candidate token can never produce a finding.
function candidateFiles(): string[] {
  const res = git(["grep", "-lE", "\\.(claude|codex|cursor|kimi-code|kiro-ide|kiro|opencode|pi)/", "--", ...PLUGIN_SCAN_ROOTS]);
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

describe("t531 live sweep — plugin prose carries no hardcoded harness-dir literal (Issue #2790)", () => {
  test("every tracked plugin file is free of a harness-dir literal", () => {
    const files = candidateFiles().map((path) => ({ path, content: readFileSync(join(REPO_ROOT, path), "utf8") }));
    const findings = scanPluginProseForHarnessLiterals(files, buildAllowlist());
    expect(findings).toEqual([]);
  });
});

describe("t531 fixture falling-proof — an injected harness literal is flagged", () => {
  test("a plugin stage body carrying a `.claude/` literal produces findings", () => {
    const path = "tests/fixtures/plugin-boundary-guard/stage-with-harness-literal.md";
    const files = [{ path, content: readFileSync(join(REPO_ROOT, path), "utf8") }];
    const findings = scanPluginProseForHarnessLiterals(files, buildAllowlist());

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f: Finding) => f.file === path)).toBe(true);
  });

  test("a `{{HARNESS_DIR}}`-token line does not produce a finding", () => {
    const path = "tests/fixtures/plugin-boundary-guard/stage-with-harness-literal.md";
    const files = [
      {
        path,
        content: "bun {{HARNESS_DIR}}/tools/amadeus-sensor.ts fire pr-convergence-report-format",
      },
    ];
    const findings = scanPluginProseForHarnessLiterals(files, buildAllowlist());
    expect(findings).toEqual([]);
  });
});

describe("t531 positive projection proof — the real fix resolves on every non-Claude harness", () => {
  test("scripts/harness-transform.ts transform() resolves the fixed line's tool path per harnessDir", () => {
    const path = "plugins/pr-convergence/stages/pr-convergence.md";
    const content = readFileSync(join(REPO_ROOT, path), "utf8");
    const line180 = content.split("\n")[179];
    expect(line180).toContain("{{HARNESS_DIR}}/tools/amadeus-sensor.ts fire pr-convergence-report-format");

    for (const harnessDir of [".codex", ".cursor", ".kimi-code", ".kiro", ".opencode", ".pi"]) {
      const projected = transform(path, Buffer.from(content, "utf8"), harnessDir, null).toString("utf8");
      const projectedLine180 = projected.split("\n")[179];
      expect(projectedLine180).toBe(`bun ${harnessDir}/tools/amadeus-sensor.ts fire pr-convergence-report-format \\`);
      expect(projectedLine180).not.toContain(".claude/");
    }
  });
});

describe("t531 vacuity guard — the sweep is not silently empty", () => {
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
