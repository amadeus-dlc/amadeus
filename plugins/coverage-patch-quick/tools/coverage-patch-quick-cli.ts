#!/usr/bin/env bun
// coverage-patch-quick-cli.ts — the advisory, pre-push approximation of the CI
// Patch Coverage Gate (#2933).
//
// See ../README.md for scope, constraints, and usage.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A changed path counts as a TypeScript source for this approximation. */
function isTypeScriptPath(path: string): boolean {
  return path.endsWith(".ts");
}

/**
 * Changed paths from `git diff --name-only`, narrowed to TypeScript sources —
 * the only files the patch gate can measure through an LCOV report.
 */
export function parseChangedPaths(stdout: string): readonly string[] {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && isTypeScriptPath(line));
}

/** A test file is its own driver: a changed test always runs itself. */
export function isTestFile(path: string): boolean {
  return path.startsWith("tests/") && /\.test\.ts$/.test(path);
}

// ---------------------------------------------------------------------------
// Reverse mapping: changed source -> the test files that claim to cover it.
//
// The registry's join key is the UNIT, not the file, so the mapping is
// heuristic by construction: a unit id is matched against the changed file's
// path token (its basename without extension, which is how subcommand, hook and
// tool unit ids are named) and against the symbols the file exports (which is
// how `function:<name>` unit ids are named). Over-selection costs runtime;
// under-selection is reported as UNMAPPED rather than hidden.
// ---------------------------------------------------------------------------

export interface RegistryUnit {
  readonly unitId: string;
  readonly coveredBy: readonly string[];
}

export function parseRegistryUnits(json: string): readonly RegistryUnit[] {
  const parsed: unknown = JSON.parse(json);
  const units = (parsed as { units?: unknown }).units;
  if (!Array.isArray(units)) {
    throw new Error("coverage-patch-quick: registry has no `units` array");
  }
  return units.map((raw) => {
    const unit = raw as { unitId?: unknown; coveredBy?: unknown };
    if (typeof unit.unitId !== "string") {
      throw new Error("coverage-patch-quick: registry unit without a string `unitId`");
    }
    const coveredBy = Array.isArray(unit.coveredBy) ? unit.coveredBy : [];
    return {
      unitId: unit.unitId,
      coveredBy: coveredBy
        .map((entry) => (entry as { file?: unknown }).file)
        .filter((file): file is string => typeof file === "string"),
    };
  });
}

/** The basename without its extension — the token unit ids are built from. */
export function pathToken(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? base : base.slice(0, dot);
}

const EXPORT_PATTERN =
  /^export\s+(?:async\s+)?(?:function|const|let|class|interface|type)\s+([A-Za-z_$][\w$]*)/gm;

export function extractExportedSymbols(source: string): readonly string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(EXPORT_PATTERN)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  return [...names];
}

function unitMentionsToken(unitId: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9_-])${escaped}([^A-Za-z0-9_-]|$)`).test(unitId);
}

function unitMentionsSymbol(unitId: string, symbols: readonly string[]): boolean {
  return symbols.some((symbol) => unitId === `function:${symbol}`);
}

export interface ChangedFileMapping {
  readonly file: string;
  readonly tests: readonly string[];
}

export interface ReverseMapping {
  readonly mappings: readonly ChangedFileMapping[];
  readonly unmapped: readonly string[];
  readonly testFiles: readonly string[];
}

export function reverseMapTests(
  changed: readonly string[],
  units: readonly RegistryUnit[],
  symbolsByFile: ReadonlyMap<string, readonly string[]>,
): ReverseMapping {
  const mappings: ChangedFileMapping[] = [];
  const unmapped: string[] = [];
  const selected = new Set<string>();
  for (const file of changed) {
    if (isTestFile(file)) {
      selected.add(file);
      continue;
    }
    const token = pathToken(file);
    const symbols = symbolsByFile.get(file) ?? [];
    const tests = new Set<string>();
    for (const unit of units) {
      if (!unitMentionsToken(unit.unitId, token) && !unitMentionsSymbol(unit.unitId, symbols)) {
        continue;
      }
      for (const test of unit.coveredBy) tests.add(test);
    }
    const sorted = [...tests].sort();
    mappings.push({ file, tests: sorted });
    if (sorted.length === 0) unmapped.push(file);
    for (const test of sorted) selected.add(test);
  }
  return { mappings, unmapped, testFiles: [...selected].sort() };
}

// ---------------------------------------------------------------------------
// Orchestration. Every effect crosses the QuickIo seam so the whole flow —
// including its refusals — is drivable in-process.
// ---------------------------------------------------------------------------

export interface CommandResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface QuickIo {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly runGit: (args: readonly string[]) => CommandResult;
  readonly runBunTest: (testFiles: readonly string[], coverageDir: string) => CommandResult;
  readonly runGate: (gatePath: string, lcovPath: string) => CommandResult;
  readonly exists: (path: string) => boolean;
  readonly readText: (path: string) => string;
  readonly makeScratchDir: () => string;
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

/** Exit code for an approximation that could not be carried out at all. */
export const EXIT_INFRASTRUCTURE_FAILURE = 1;
/** Exit code for a completed approximation, whatever the gate's verdict. */
export const EXIT_ADVISORY = 0;

const GATE_RELATIVE_PATH = "tests/coverage-patch-gate.ts";
const REGISTRY_RELATIVE_PATH = "tests/.coverage-registry.json";
/** The gate's own default, restated so both sides read the same base ref. */
const DEFAULT_BASE_REF = "origin/main";
/** The gate prints this only once it has actually evaluated a diff. */
const VERDICT_MARKER = "Patch coverage gate:";

export function renderAdvisoryBanner(): string {
  return [
    "",
    "--- coverage-patch-quick: ADVISORY APPROXIMATION -------------------------",
    "This is NOT the gate. The CI Patch Coverage Gate (Coverage Report (head))",
    "is canonical; only its verdict decides a PR.",
    "Known asymmetries of this approximation:",
    "  * The targeted lcov is not the merged CI lcov. Multi-line type",
    "    annotation continuation lines are invisible here and can still be",
    "    reported uncovered by CI.",
    "  * Coverage contributed by tests outside the selected set is invisible,",
    "    so this run can report false reds.",
    "  * Green here does not guarantee green in CI.",
    "  * Committed slices only: the gate refuses a dirty working tree.",
    "-------------------------------------------------------------------------",
  ].join("\n");
}

export function renderSelectionReport(mapping: ReverseMapping): string {
  const lines: string[] = ["coverage-patch-quick: changed TypeScript files and their mapped tests"];
  for (const entry of mapping.mappings) {
    lines.push(
      entry.tests.length === 0
        ? `  UNMAPPED ${entry.file} — no test claims it; its added lines will read uncovered in this approximation`
        : `  ${entry.file} -> ${entry.tests.join(", ")}`,
    );
  }
  lines.push(`selected test files: ${mapping.testFiles.length}`);
  for (const file of mapping.testFiles) lines.push(`  ${file}`);
  return lines.join("\n");
}

export function runQuickCheck(io: QuickIo): number {
  const root = io.runGit(["rev-parse", "--show-toplevel"]);
  if (root.code !== 0) {
    io.err(
      `coverage-patch-quick: not a git repository (git rev-parse --show-toplevel failed): ${root.stderr.trim()}`,
    );
    return EXIT_INFRASTRUCTURE_FAILURE;
  }
  const repoRoot = root.stdout.trim();
  const gatePath = join(repoRoot, GATE_RELATIVE_PATH);
  if (!io.exists(gatePath)) {
    io.err(
      `coverage-patch-quick: the patch coverage gate is absent at ${gatePath}. This plugin reuses the repository own gate at runtime and is only meaningful inside the Amadeus development repository.`,
    );
    return EXIT_INFRASTRUCTURE_FAILURE;
  }

  const registryPath = join(repoRoot, REGISTRY_RELATIVE_PATH);
  if (!io.exists(registryPath)) {
    io.err(
      `coverage-patch-quick: the coverage registry is absent at ${registryPath}; the changed-file to test mapping has no input.`,
    );
    return EXIT_INFRASTRUCTURE_FAILURE;
  }

  const baseRef = io.env.AMADEUS_PATCH_BASE_REF ?? DEFAULT_BASE_REF;
  const diff = io.runGit(["diff", "--name-only", `${baseRef}...HEAD`]);
  if (diff.code !== 0) {
    io.err(
      `coverage-patch-quick: git diff --name-only ${baseRef}...HEAD failed: ${diff.stderr.trim()}`,
    );
    return EXIT_INFRASTRUCTURE_FAILURE;
  }

  const changed = parseChangedPaths(diff.stdout);
  if (changed.length === 0) {
    io.out(
      `coverage-patch-quick: no changed TypeScript files against ${baseRef}; there is nothing to approximate.`,
    );
    io.out(renderAdvisoryBanner());
    return EXIT_ADVISORY;
  }

  let units: readonly RegistryUnit[];
  try {
    units = parseRegistryUnits(io.readText(registryPath));
  } catch (error) {
    io.err(`coverage-patch-quick: unreadable coverage registry: ${(error as Error).message}`);
    return EXIT_INFRASTRUCTURE_FAILURE;
  }

  const symbolsByFile = new Map<string, readonly string[]>();
  for (const file of changed) {
    const absolute = join(repoRoot, file);
    if (io.exists(absolute)) symbolsByFile.set(file, extractExportedSymbols(io.readText(absolute)));
  }

  const mapping = reverseMapTests(changed, units, symbolsByFile);
  io.out(renderSelectionReport(mapping));
  if (mapping.testFiles.length === 0) {
    io.out(
      "coverage-patch-quick: no test file could be selected, so no coverage could be measured for this slice.",
    );
    io.out(renderAdvisoryBanner());
    return EXIT_ADVISORY;
  }

  const coverageDir = io.makeScratchDir();
  const testRun = io.runBunTest(mapping.testFiles, coverageDir);
  if (testRun.code < 0) {
    io.err(`coverage-patch-quick: could not run bun test: ${testRun.stderr.trim()}`);
    return EXIT_INFRASTRUCTURE_FAILURE;
  }
  if (testRun.code !== 0) {
    io.out(
      "coverage-patch-quick: the selected tests did not all pass; the coverage measured below is incomplete.",
    );
  }

  const lcovPath = join(coverageDir, "lcov.info");
  if (!io.exists(lcovPath)) {
    io.err(
      `coverage-patch-quick: bun test produced no lcov at ${lcovPath}; the approximation has no input. ${testRun.stderr.trim()}`,
    );
    return EXIT_INFRASTRUCTURE_FAILURE;
  }

  const gate = io.runGate(gatePath, lcovPath);
  if (gate.stdout.trim().length > 0) io.out(gate.stdout.trimEnd());
  if (gate.stderr.trim().length > 0) io.err(gate.stderr.trimEnd());
  if (!gate.stdout.includes(VERDICT_MARKER)) {
    const dirty = /working tree is dirty/.test(gate.stderr)
      ? " This tool evaluates committed slices only: commit or stash the working tree and rerun."
      : "";
    io.err(
      `coverage-patch-quick: the patch coverage gate returned no verdict (exit ${gate.code}); nothing was approximated.${dirty}`,
    );
    return EXIT_INFRASTRUCTURE_FAILURE;
  }
  io.out(renderAdvisoryBanner());
  return EXIT_ADVISORY;
}

// ---------------------------------------------------------------------------
// The node implementation of the seam. Nothing here decides anything: every
// branch that matters lives above, behind QuickIo.
// ---------------------------------------------------------------------------

const SPAWN_TIMEOUT_MS = 10 * 60 * 1000;

function runCommand(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): CommandResult {
  const result = spawnSync(command, [...args], {
    encoding: "utf-8",
    env,
    timeout: SPAWN_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    return { code: -1, stdout: "", stderr: String(result.error) };
  }
  return { code: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export function createNodeIo(): QuickIo {
  return {
    env: process.env,
    runGit: (args) => runCommand("git", args, process.env),
    runBunTest: (testFiles, coverageDir) =>
      runCommand(
        process.execPath,
        [
          "test",
          ...testFiles,
          "--coverage",
          "--coverage-reporter=lcov",
          `--coverage-dir=${coverageDir}`,
        ],
        process.env,
      ),
    runGate: (gatePath, lcovPath) =>
      runCommand(process.execPath, [gatePath, "--check"], {
        ...process.env,
        AMADEUS_PATCH_LCOV: lcovPath,
      }),
    exists: (path) => existsSync(path),
    readText: (path) => readFileSync(path, "utf-8"),
    // Never the repository's own coverage/ dir: tests/run-tests.ts deletes that
    // root on start, and coverage measurement here must own nothing shared.
    makeScratchDir: () => mkdtempSync(join(tmpdir(), "coverage-patch-quick-")),
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  };
}

const USAGE =
  "Usage: bun plugins/coverage-patch-quick/tools/coverage-patch-quick-cli.ts [--check]";

export function main(argv: readonly string[], io: QuickIo): number {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--check")) return runQuickCheck(io);
  io.err(USAGE);
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2), createNodeIo()));
