#!/usr/bin/env bun
//
// core-plugin-import-boundary.ts — the framework→plugins import boundary (#3416).
//
// WHAT THIS IS. The shipped framework tree (`packages/framework/**`) must not
// depend on any plugin. Plugins are opt-in, composed at build time from their
// own manifests, and absent from a workspace that never activates them; a
// framework module that imports one becomes a missing module in every tree the
// plugin was not projected into. TypeScript cannot express that closure, so the
// boundary is held by this predicate gate instead, wired into CI's blocking set
// (the `drift-check` job, which `ci-success` needs).
//
// THE RATCHET IS AT ZERO. Baseline at origin/main 8198e9763: the boundary was
// already held. Re-derive with the enumerating predicate this file implements:
//   bun scripts/core-plugin-import-boundary.ts
// or with the coarse grep the issue recorded (control literal alongside it, so a
// zero cannot be confused with a broken search):
//   git grep -nE "from ['\"].*plugins/|import\(.*plugins/" -- packages/framework/
//     → 0 hits (exit 1 = no match)
//   git grep -c "from ['\"]" -- packages/framework/core/tools/amadeus-lib.ts
//     → 17 (control: the search itself works)
// This gate fixes that zero: any non-zero count is red.
//
// SCOPE — CORE **AND** HARNESS (#3416 completion condition 4). The corpus is the
// whole shipped framework tree, both `packages/framework/core/` (harness-neutral
// canon) and `packages/framework/harness/<name>/` (per-harness surface). Measured
// at the same baseline, harness→plugins imports were also 0, and the reason to
// forbid them is identical: harness surfaces are projected into every dist tree
// by the packager, so a plugin import there breaks exactly the way a core one
// does. Forbidding IMPORTS costs the harness manifests nothing — they reference
// plugin paths as projection DATA (`{ src: "plugins/amadeus-opencode-plugin.ts" }`
// in packages/framework/harness/opencode/manifest.ts), and this gate reads module
// SPECIFIERS rather than grepping lines, so data strings are untouched.
//
// OUT OF CORPUS, deliberately: `scripts/` (dev tooling — plugin-projection.ts
// exists to drive plugins), `tests/` (they read plugin sources as fixtures),
// `packages/setup/` (the installer, not the framework runtime), and `plugins/`
// itself (the far side of the boundary — plugins→core is the ALLOWED direction).
//
// REUSE. Specifier extraction is not re-implemented here: it comes from
// scripts/import-closure-guard.ts, whose `extractModuleSpecifiers` already covers
// every reference form the sources use (`from "x"`, `import "x"`, `import("x")`,
// `require("x")`) and is pinned by t440. One canonical predicate, two consumers.
//
// FAIL-CLOSED. There is no allowlist and no skip hatch. A corpus file that cannot
// be read is enumerated as a failure rather than dropped from the scan, and an
// EMPTY corpus is a failure too — a broken enumerator must not report the
// boundary as held while inspecting nothing.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { extractModuleSpecifiers } from "./import-closure-guard.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The shipped framework tree, as a repo-root-relative POSIX prefix.
const FRAMEWORK_PREFIX = "packages/framework/";

// Source extensions that can carry a module reference. Prose and JSON cannot.
const SOURCE_EXTENSIONS: readonly string[] = [".ts", ".tsx", ".mts", ".cts"];

// A candidate path that still resolves inside the framework tree is, by
// construction, not the AI-DLC plugin tree — it is framework-internal. This is
// what keeps OpenCode's own plugin-API folder
// (packages/framework/harness/opencode/plugins/) legal.
const FRAMEWORK_TREE_RE = /(?:^|\/)packages\/framework\//;

export type PluginImport = {
  // Repo-root-relative path of the importing framework file.
  readonly file: string;
  // 1-based line of the specifier's first occurrence — diagnostic only; the
  // verdict does not depend on it.
  readonly line: number;
  // The specifier verbatim, as written in the source.
  readonly specifier: string;
  // The resolved target: a repo-root-relative path for a relative specifier,
  // otherwise the specifier itself.
  readonly target: string;
};

export type BoundaryVerdict =
  | { readonly kind: "clean"; readonly scanned: number }
  | { readonly kind: "empty-corpus" }
  | {
      readonly kind: "violation";
      readonly scanned: number;
      readonly violations: readonly PluginImport[];
      readonly unreadable: readonly string[];
    };

// Read seam: repo-relative path in, file text out, null for anything unreadable.
export type ReadRepoFile = (path: string) => string | null;

// Is `path` a framework source file this boundary covers?
export function isFrameworkSourceFile(path: string): boolean {
  if (!path.startsWith(FRAMEWORK_PREFIX)) return false;
  return SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

// Does `specifier`, read from `importer`, reference the AI-DLC plugin tree?
//
// Both plugin trees count: the authored `plugins/<slug>/…` sources and the
// projected `<harness-dir>/plugins/<slug>/…` runtime copy. A relative specifier
// is resolved against the importing file first, so `../../../../plugins/p/x.ts`
// and the bare repo-root-relative `plugins/p/x.ts` land on the same judgement.
export function resolvesIntoPluginTree(importer: string, specifier: string): boolean {
  const candidate = isRelativeSpecifier(specifier)
    ? posix.normalize(posix.join(posix.dirname(importer), specifier))
    : posix.normalize(specifier);
  if (FRAMEWORK_TREE_RE.test(candidate)) return false;
  return candidate.split("/").includes("plugins");
}

// 1-based line of the specifier's first occurrence, or 0 when it cannot be
// located (the specifier is still reported verbatim).
function lineOf(lines: readonly string[], specifier: string): number {
  const index = lines.findIndex((line) => line.includes(specifier));
  return index === -1 ? 0 : index + 1;
}

function violationsIn(file: string, source: string): readonly PluginImport[] {
  const lines = source.split("\n");
  const found: PluginImport[] = [];
  for (const specifier of extractModuleSpecifiers(source)) {
    if (!resolvesIntoPluginTree(file, specifier)) continue;
    const target = isRelativeSpecifier(specifier)
      ? posix.normalize(posix.join(posix.dirname(file), specifier))
      : specifier;
    found.push({ file, line: lineOf(lines, specifier), specifier, target });
  }
  return found;
}

// Scan `paths` (any repo file list — the corpus filter is applied here) for
// framework→plugins module references. Every offender is enumerated; the list is
// never truncated to the first hit, so one red run names the whole repair set.
export function scanFrameworkPluginImports(
  paths: readonly string[],
  readFile: ReadRepoFile,
): BoundaryVerdict {
  if (paths.length === 0) return { kind: "empty-corpus" };
  const corpus = paths.filter(isFrameworkSourceFile).sort();
  const violations: PluginImport[] = [];
  const unreadable: string[] = [];
  for (const file of corpus) {
    const source = readFile(file);
    if (source === null) {
      unreadable.push(file);
      continue;
    }
    violations.push(...violationsIn(file, source));
  }
  if (violations.length === 0 && unreadable.length === 0) {
    return { kind: "clean", scanned: corpus.length };
  }
  return { kind: "violation", scanned: corpus.length, violations, unreadable };
}

// Tracked files only: an untracked scratch file under packages/framework/ is not
// part of the shipped tree and cannot reach a consumer.
export function trackedGitFiles(projectDir: string): readonly string[] {
  const result = spawnSync("git", ["ls-files", "-z", "--", FRAMEWORK_PREFIX], {
    cwd: projectDir,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const detail = [
      result.error?.message,
      result.signal ? `signal ${result.signal}` : undefined,
      result.status !== null ? `exit ${result.status}` : undefined,
      result.stderr.toString("utf-8").trim() || undefined,
    ]
      .filter(Boolean)
      .join("; ");
    throw new Error(`git ls-files failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout.toString("utf-8").split("\0").filter(Boolean);
}

function reportViolation(
  verdict: Extract<BoundaryVerdict, { kind: "violation" }>,
): number {
  console.error(
    `framework→plugins import boundary violated — ${verdict.violations.length} import(s), ` +
      `${verdict.unreadable.length} unreadable file(s) across ${verdict.scanned} scanned source(s):`,
  );
  for (const v of verdict.violations) {
    console.error(`  ${v.file}:${v.line}: imports ${v.specifier} → ${v.target}`);
  }
  for (const path of verdict.unreadable) console.error(`  UNREADABLE ${path}`);
  return 1;
}

export function corePluginImportBoundaryMain(projectDir: string = REPO_ROOT): number {
  let verdict: BoundaryVerdict;
  try {
    const paths = trackedGitFiles(projectDir);
    verdict = scanFrameworkPluginImports(paths, (path) => {
      try {
        return readFileSync(join(projectDir, path), "utf-8");
      } catch {
        return null;
      }
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  if (verdict.kind === "empty-corpus") {
    console.error(
      `framework→plugins import boundary: no tracked source under ${FRAMEWORK_PREFIX} — ` +
        "the enumerator is broken; refusing to report a vacuous pass",
    );
    return 1;
  }
  if (verdict.kind === "clean") {
    console.log(
      `framework→plugins import boundary: clean (${verdict.scanned} core/harness sources scanned, 0 plugin imports)`,
    );
    return 0;
  }
  return reportViolation(verdict);
}

if (import.meta.main) process.exit(corePluginImportBoundaryMain());
