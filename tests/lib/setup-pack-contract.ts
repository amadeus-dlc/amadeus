// Canonical single-source definition of the @amadeus-dlc/setup tarball
// contract (FR-018, BR-P01/BR-P02/BR-P03). Both
// tests/integration/setup-pack-contract.test.ts (satisfied/missing/unexpected
// verdicts) and tests/integration/setup-files-drift.test.ts (package.json
// `files` <-> declaredInFiles sync) import PackContract from here so the
// contract and its enforcement cannot silently diverge (BR-P02: package.json
// `files` is static JSON and cannot import this TS module, so a drift test
// closes the loop instead).
//
// This is test-side vocabulary only (domain-entities.md) — no production
// type is added to packages/setup/src/.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Result } from "../../packages/setup/src/shared/result.ts";

/**
 * package.json `files` entries that must be declared explicitly. Bun does not
 * auto-include non-standard LICENSE-* filenames, so these are only bundled
 * because the `files` field lists them.
 */
const DECLARED_IN_FILES: readonly string[] = Object.freeze(["dist/cli.js", "LICENSE-MIT", "LICENSE-APACHE"]);

/**
 * Files Bun always bundles regardless of the `files` field's contents (Bun's
 * own packing behavior — verified empirically against the real tool, not
 * assumed).
 */
const AUTO_INCLUDED: readonly string[] = Object.freeze(["package.json", "README.md"]);

export type ContractVerdict =
  | { readonly type: "satisfied" }
  | { readonly type: "missing"; readonly files: readonly string[] }
  | { readonly type: "unexpected"; readonly files: readonly string[] };

export type PackContract = {
  declaredInFiles(): readonly string[];
  autoIncluded(): readonly string[];
  requiredFiles(): readonly string[];
  isSatisfiedBy(report: PackReport): ContractVerdict;
};

export namespace PackContract {
  /** The single canonical contract instance (BR-P02). */
  export function current(): PackContract {
    const required = Object.freeze([...DECLARED_IN_FILES, ...AUTO_INCLUDED]);
    const requiredSet = new Set(required);
    return Object.freeze({
      declaredInFiles: () => DECLARED_IN_FILES,
      autoIncluded: () => AUTO_INCLUDED,
      requiredFiles: () => required,
      isSatisfiedBy: (report: PackReport): ContractVerdict => {
        const actual = new Set(report.files());
        const missing = required.filter((f) => !actual.has(f));
        if (missing.length > 0) {
          return Object.freeze({ type: "missing", files: Object.freeze(missing) });
        }
        const unexpected = report.files().filter((f) => !requiredSet.has(f));
        if (unexpected.length > 0) {
          return Object.freeze({ type: "unexpected", files: Object.freeze(unexpected) });
        }
        return Object.freeze({ type: "satisfied" });
      },
    });
  }
}

export type PackReport = {
  files(): readonly string[];
  packageVersion(): string;
};

export type PackReportError = { readonly type: "malformed-output"; readonly detail: string };

export namespace PackReport {
  /**
   * Parses the file rows produced by `bun pm pack --dry-run`.
   */
  export function parse(bunPackOutput: string, version: string): Result<PackReport, PackReportError> {
    const paths = bunPackOutput
      .split(/\r?\n/)
      .map((line) => /^packed\s+\S+\s+(.+)$/.exec(line)?.[1])
      .filter((path): path is string => path !== undefined);
    if (paths.length === 0) {
      return Result.err({
        type: "malformed-output",
        detail: "expected file rows from bun pm pack --dry-run",
      });
    }
    const frozenPaths = Object.freeze(paths);
    return Result.ok(
      Object.freeze({
        files: () => frozenPaths,
        packageVersion: () => version,
      }),
    );
  }
}

/**
 * Runs the real `bun pm pack --dry-run` (BR-P01: no simulation, no
 * hardcoded self-referential comparison) against `cwd` and parses its stdout
 * into a PackReport.
 */
export function runBunPackDryRun(cwd: string): Result<PackReport, PackReportError> {
  const result = Bun.spawnSync([process.execPath, "pm", "pack", "--dry-run"], { cwd });
  if (result.exitCode !== 0) {
    return Result.err({
      type: "malformed-output",
      detail: `bun pm pack --dry-run exited ${result.exitCode}: ${result.stderr.toString() || result.stdout.toString()}`,
    });
  }
  let version: unknown;
  try {
    version = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")).version;
  } catch (e) {
    return Result.err({
      type: "malformed-output",
      detail: `failed to read package version: ${(e as Error).message}`,
    });
  }
  if (typeof version !== "string") {
    return Result.err({ type: "malformed-output", detail: "expected a string version in package.json" });
  }
  return PackReport.parse(result.stdout.toString(), version);
}
