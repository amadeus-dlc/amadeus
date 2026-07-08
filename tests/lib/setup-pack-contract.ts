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

import { spawnSync } from "node:child_process";
import { Result } from "../../packages/setup/src/shared/result.ts";

/**
 * package.json `files` entries that must be declared explicitly. npm does not
 * auto-include non-standard LICENSE-* filenames, so these are only bundled
 * because the `files` field lists them.
 */
const DECLARED_IN_FILES: readonly string[] = Object.freeze(["dist/cli.js", "LICENSE-MIT", "LICENSE-APACHE"]);

/**
 * Files npm always bundles regardless of the `files` field's contents (npm's
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
   * Parses the JSON value produced by `npm pack --dry-run --json`: an array
   * with one entry per packed workspace member. @amadeus-dlc/setup is packed
   * alone, so exactly one entry is expected.
   */
  export function parse(npmPackJson: unknown): Result<PackReport, PackReportError> {
    if (!Array.isArray(npmPackJson) || npmPackJson.length === 0) {
      return Result.err({
        type: "malformed-output",
        detail: "expected a non-empty array from npm pack --dry-run --json",
      });
    }
    const [entry] = npmPackJson;
    if (typeof entry !== "object" || entry === null) {
      return Result.err({ type: "malformed-output", detail: "expected an object as the first array entry" });
    }
    const { files, version } = entry as Record<string, unknown>;
    if (!Array.isArray(files)) {
      return Result.err({ type: "malformed-output", detail: "expected a files array in npm pack output" });
    }
    const paths: string[] = [];
    for (const f of files) {
      if (typeof f !== "object" || f === null || typeof (f as Record<string, unknown>).path !== "string") {
        return Result.err({
          type: "malformed-output",
          detail: "expected {path: string} entries in the files array",
        });
      }
      paths.push((f as Record<string, unknown>).path as string);
    }
    if (typeof version !== "string") {
      return Result.err({ type: "malformed-output", detail: "expected a string version in npm pack output" });
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
 * Runs the real `npm pack --dry-run --json` (BR-P01: no simulation, no
 * hardcoded self-referential comparison) against `cwd` and parses its stdout
 * into a PackReport.
 */
export function runNpmPackDryRun(cwd: string): Result<PackReport, PackReportError> {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    return Result.err({
      type: "malformed-output",
      detail: `npm pack --dry-run --json exited ${result.status}: ${result.stderr || result.stdout}`,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    return Result.err({
      type: "malformed-output",
      detail: `failed to JSON.parse npm pack output: ${(e as Error).message}`,
    });
  }
  return PackReport.parse(parsed);
}
