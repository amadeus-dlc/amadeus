#!/usr/bin/env bun
// coverage-patch-quick-cli.ts — the advisory, pre-push approximation of the CI
// Patch Coverage Gate (#2933).
//
// See ../README.md for scope, constraints, and usage.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
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

/** The tests that claim a unit this changed file's token or exports name. */
function testsClaiming(
  file: string,
  units: readonly RegistryUnit[],
  symbols: readonly string[],
): readonly string[] {
  const token = pathToken(file);
  const tests = new Set<string>();
  for (const unit of units) {
    if (!unitMentionsToken(unit.unitId, token) && !unitMentionsSymbol(unit.unitId, symbols)) {
      continue;
    }
    for (const test of unit.coveredBy) tests.add(test);
  }
  return [...tests].sort();
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
    const sorted = testsClaiming(file, units, symbolsByFile.get(file) ?? []);
    mappings.push({ file, tests: sorted });
    if (sorted.length === 0) unmapped.push(file);
    for (const test of sorted) selected.add(test);
  }
  return { mappings, unmapped, testFiles: [...selected].sort() };
}

// ---------------------------------------------------------------------------
// Derived allowlist.
//
// The gate's STALE check assumes a FULL lcov: an exemption whose file (or whose
// resolved range) has no measurable line is a rotted ledger entry, and the gate
// hard-fails before evaluating anything. Against a targeted lcov that check is
// structurally false — nearly every exemption names a file this run never
// loaded — so the canonical allowlist would make a verdict unreachable
// (measured: 432 entries, 373 stale, gate exit 1 with no verdict).
//
// So the run evaluates against a DERIVED copy, written to the scratch dir and
// never to the repository: the canonical ledger is read-only here. The
// derivation keeps an entry only when its file is lcov-resident and the gate's
// OWN staleness verdict (its exported resolver, reused at runtime — this logic
// is not reimplemented) does not call it stale. Dropping entries can only make
// the approximation stricter, never laxer: an exemption that is dropped can
// only turn a would-be allowlisted line into a reported uncovered line.
// ---------------------------------------------------------------------------

export function deriveAllowlist<T extends { readonly file: string }>(
  entries: readonly T[],
  residentFiles: ReadonlySet<string>,
  staleIndices: ReadonlySet<number>,
): readonly T[] {
  return entries.filter(
    (entry, index) => residentFiles.has(entry.file) && !staleIndices.has(index),
  );
}

interface DerivationPaths {
  readonly repoRoot: string;
  readonly gatePath: string;
  readonly lcovPath: string;
  readonly allowlistPath: string;
}

/** Writes the derived allowlist beside the targeted lcov. Throws to the caller. */
function writeDerivedAllowlist(io: QuickIo, paths: DerivationPaths): void {
  const canonical = join(paths.repoRoot, ALLOWLIST_RELATIVE_PATH);
  const api = io.loadGateApi(paths.gatePath);
  const lcov = api.parseLcovLineHits(io.readText(paths.lcovPath));
  const entries = io.exists(canonical) ? api.parseAllowlist(io.readText(canonical)) : [];
  const sources = new Map<string, string>();
  for (const entry of entries) {
    if (sources.has(entry.file)) continue;
    const sourcePath = join(paths.repoRoot, entry.file);
    if (io.exists(sourcePath)) sources.set(entry.file, io.readText(sourcePath));
  }
  const resolved = api.resolveAllowlistEntries(entries, sources);
  const stale = new Set(api.findStaleAllowlistEntries(resolved, lcov));
  const staleIndices = new Set<number>();
  resolved.forEach((entry, index) => {
    if (stale.has(entry)) staleIndices.add(index);
  });
  const derived = deriveAllowlist(entries, new Set(lcov.keys()), staleIndices);
  io.writeText(paths.allowlistPath, `${JSON.stringify(derived, null, 2)}\n`);
  io.out(
    `coverage-patch-quick: derived allowlist at ${paths.allowlistPath} — ${derived.length} of ${entries.length} exemptions are measurable in this targeted lcov; ${canonical} is untouched.`,
  );
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

/**
 * The slice of the repository's own patch gate this plugin reuses at runtime to
 * decide which exemptions survive into the derived allowlist. Loaded from the
 * gate file itself — never reimplemented here.
 */
export interface GateApi {
  readonly parseLcovLineHits: (lcov: string) => Map<string, Map<number, number>>;
  readonly parseAllowlist: (json: string) => readonly { readonly file: string }[];
  readonly resolveAllowlistEntries: (
    entries: readonly unknown[],
    sources: ReadonlyMap<string, string>,
  ) => readonly unknown[];
  readonly findStaleAllowlistEntries: (
    resolved: readonly unknown[],
    lcov: Map<string, Map<number, number>>,
  ) => readonly unknown[];
}

export interface QuickIo {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly runGit: (args: readonly string[]) => CommandResult;
  readonly runBunTest: (testFiles: readonly string[], coverageDir: string) => CommandResult;
  readonly runGate: (gatePath: string, lcovPath: string, allowlistPath: string) => CommandResult;
  readonly exists: (path: string) => boolean;
  readonly readText: (path: string) => string;
  readonly writeText: (path: string, content: string) => void;
  readonly loadGateApi: (gatePath: string) => GateApi;
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
const ALLOWLIST_RELATIVE_PATH = "tests/.coverage-patch-allowlist.json";
const DERIVED_ALLOWLIST_NAME = "derived-allowlist.json";
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
    "  * The run evaluates against a derived allowlist, filtered to the",
    "    exemptions the targeted lcov can still measure, because the gate's",
    "    STALE check assumes a full lcov. CI remains canonical and keeps using",
    "    the default allowlist, which this run never modifies.",
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

  const allowlistPath = join(coverageDir, DERIVED_ALLOWLIST_NAME);
  try {
    writeDerivedAllowlist(io, { repoRoot, gatePath, lcovPath, allowlistPath });
  } catch (error) {
    io.err(
      `coverage-patch-quick: could not load the patch coverage gate to derive an allowlist for the targeted lcov: ${(error as Error).message}`,
    );
    return EXIT_INFRASTRUCTURE_FAILURE;
  }

  return reportGateOutcome(io, io.runGate(gatePath, lcovPath, allowlistPath));
}

/**
 * Prints whatever the gate said, verbatim, and turns it into this tool's exit
 * code: a verdict — PASS or FAIL — is advisory zero, anything else is an
 * infrastructure failure that must not read as a pass.
 */
function reportGateOutcome(io: QuickIo, gate: CommandResult): number {
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

export function runCommand(
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
    runGate: (gatePath, lcovPath, allowlistPath) =>
      runCommand(process.execPath, [gatePath, "--check"], {
        ...process.env,
        AMADEUS_PATCH_LCOV: lcovPath,
        AMADEUS_PATCH_ALLOWLIST: allowlistPath,
      }),
    exists: (path) => existsSync(path),
    readText: (path) => readFileSync(path, "utf-8"),
    writeText: (path, content) => writeFileSync(path, content),
    // Bun resolves a TypeScript module synchronously through require, so the
    // gate's own exports are reusable without duplicating its logic and without
    // a static import across the plugin/tests boundary.
    loadGateApi: (gatePath) => createRequire(import.meta.url)(gatePath) as GateApi,
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
