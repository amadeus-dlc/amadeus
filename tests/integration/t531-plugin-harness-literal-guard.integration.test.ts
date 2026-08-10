// covers: function:scanPluginProseForHarnessLiterals
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
import {
  buildPluginProjection,
  discoverPluginSources,
  harnessProjectionSpec,
  PACKAGE_HARNESSES,
  type PackageHarness,
  type PluginSource,
  SELF_INSTALL_HARNESSES,
} from "../../scripts/plugin-projection.ts";

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

// The pr-convergence.md's own tool-path line, as the real projector emits it
// for one harness. `undefined` when the artifact or the line is missing —
// callers assert both are present rather than crashing on a bad index.
function projectedSensorFireLine(plugin: PluginSource, harness: PackageHarness): string | undefined {
  const artifacts = buildPluginProjection(plugin, harness).artifacts;
  const artifact = artifacts.find((a) => a.relativePath === "plugins/pr-convergence/stages/pr-convergence.md");
  return artifact?.bytes
    .toString("utf8")
    .split("\n")
    .find((l) => l.includes("amadeus-sensor.ts fire"));
}

describe("t531 positive projection proof — the real fix resolves on every package and self-install face", () => {
  // Package harnesses are discovered from packages/framework/harness/*/manifest.ts
  // (scripts/plugin-projection.ts's own canonical set — not re-typed here), so a
  // ninth harness lands in this sweep the moment it ships a manifest. Self-install
  // is not a separate transform (buildPluginProjection is harness-keyed, and
  // promote-self.ts copies a package projection's bytes verbatim into the project
  // root); it is asserted here only as a closed-subset fact of PACKAGE_HARNESSES,
  // not re-derived from a second source.
  test("PACKAGE_HARNESSES enumerates every self-install face", () => {
    expect(SELF_INSTALL_HARNESSES.length).toBeGreaterThan(0);
    for (const harness of SELF_INSTALL_HARNESSES) {
      expect(PACKAGE_HARNESSES).toContain(harness);
    }
  });

  test("every package face resolves the sensor-fire line to its own tool path, never Claude's", () => {
    const plugin = discoverPluginSources(join(REPO_ROOT, "plugins")).find((p) => p.directoryName === "pr-convergence");
    if (!plugin) throw new Error("pr-convergence plugin source not found under plugins/");

    expect(PACKAGE_HARNESSES.length).toBeGreaterThan(0);
    for (const harness of PACKAGE_HARNESSES) {
      const { harnessDir } = harnessProjectionSpec(harness);
      const line = projectedSensorFireLine(plugin, harness);
      expect(line).toBe(`bun ${harnessDir}/tools/amadeus-sensor.ts fire pr-convergence-report-format \\`);
      // Claude's own harnessDir legitimately IS `.claude` (harness === "claude"
      // resolves to itself); every OTHER harness must carry no Claude literal.
      if (harness !== "claude") expect(line).not.toContain(".claude/");
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
