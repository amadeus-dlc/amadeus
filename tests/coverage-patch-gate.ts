#!/usr/bin/env bun
// coverage-patch-gate.ts — the self-hosted PATCH coverage gate.
//
// WHAT THIS IS. A deterministic replacement for Codecov's patch status. It
// intersects the added lines of a PR diff with the head LCOV report and fails
// CI when any added line that LCOV can measure has zero hits. This is the CI
// enforcement of the team's local-lcov-pre-push practice: "diff added lines
// with zero-hit coverage must be 0 before push".
//
// WHY SELF-HOSTED. Codecov's patch check-run stopped being delivered under
// team-scale parallel load (notify-stage starvation measured 2026-07-16,
// intent 260716-codecov-fallback) and its waiver economy required bypass
// permissions the repository owner does not hold. A self-computed gate is
// reproducible, offline, and reviewable in-repo.
//
// POPULATION (E-CV1 Q2 = lcov-resident lines only). A diff line counts toward
// the gate only when its file:line appears as a DA record in the head LCOV.
// Lines and files absent from LCOV are structurally unmeasurable here (spawn-
// only modules, docs, config); their review discipline stays with the existing
// norms (lcov-wiring-line-checklist, spawn-blindspot-two-step) rather than
// this gate.
//
// ALLOWLIST (E-CV1 Q1 = in-repo, reason-required, adopted 4/4). tests/
// .coverage-patch-allowlist.json may exempt specific source fingerprints inside
// a named function (or <module> for top-level code). The selector resolves to
// current lines through the TypeScript AST, so unrelated line shifts do not
// move or invalidate the exemption. Every entry must carry a non-empty reason
// (and an expiry condition where one can be stated, enabling E-EXP1-style
// expiry inventories) and lands only through PR review. The gate hard-fails on
// malformed, reason-less, ambiguous, or stale entries.
//
// ORDERING (E-CV1 e3 reservation): seam refactor comes FIRST; the allowlist is
// the SECOND resort for lines where a refactor is unnatural (message-string
// rows, dispatch cases — see spawn-blindspot-two-step). STALE entries — ranges
// that no longer match any measurable line in the head LCOV — fail the gate
// loudly so the ledger cannot rot.
//
// Run:
//   bun tests/coverage-patch-gate.ts --check   # CI gate (exit 1 on violation)
//   bun tests/coverage-patch-gate.ts --create-selector <file> <lines>
// Env seams (tests point these at temp fixtures to PROVE the gate):
//   AMADEUS_PATCH_LCOV       — lcov.info path (default coverage/lcov.info)
//   AMADEUS_PATCH_DIFF       — unified diff file to evaluate (default: git diff)
//   AMADEUS_PATCH_BASE_REF   — base ref for the git diff (default: origin/main)
//   AMADEUS_PATCH_ALLOWLIST  — allowlist path (default tests/.coverage-patch-allowlist.json)

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TESTS_DIR, "..");

function lcovPath(): string {
  return process.env.AMADEUS_PATCH_LCOV ?? join(REPO_ROOT, "coverage", "lcov.info");
}
function allowlistPath(): string {
  return process.env.AMADEUS_PATCH_ALLOWLIST ?? join(TESTS_DIR, ".coverage-patch-allowlist.json");
}

// ---------------------------------------------------------------------------
// LCOV parsing. DA:<line>,<hits> records grouped by SF: file path. Paths in
// lcov.info are repo-relative (the runner emits them that way); keep verbatim.
// ---------------------------------------------------------------------------
export function parseLcovLineHits(lcov: string): Map<string, Map<number, number>> {
  const byFile = new Map<string, Map<number, number>>();
  let current: Map<number, number> | null = null;
  for (const raw of lcov.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      const file = line.slice(3);
      current = byFile.get(file) ?? new Map();
      byFile.set(file, current);
    } else if (line.startsWith("DA:") && current) {
      const [lineNo, hits] = line.slice(3).split(",");
      const n = Number.parseInt(lineNo, 10);
      const h = Number.parseInt(hits, 10);
      if (!Number.isFinite(n) || !Number.isFinite(h)) {
        throw new Error(`coverage-patch-gate: malformed DA record: "${line}"`);
      }
      // Merged chunks may repeat a line; keep the max observed hit count,
      // matching lcov's own merge semantics.
      current.set(n, Math.max(current.get(n) ?? 0, h));
    } else if (line === "end_of_record") {
      current = null;
    }
  }
  return byFile;
}

// ---------------------------------------------------------------------------
// Unified diff parsing. Collects added (right-side) line numbers per file from
// `git diff --unified=0` output. Renames use the +++ path (b/ side).
//
// HEADER vs CONTENT (#2574). "+++ " is ambiguous by shape alone: an added line
// whose CONTENT starts with "++ " renders as "+" + "++ …" = "+++ …". Treating
// that as a file header retargets currentFile at a bogus path and silently
// drops the real file's added lines from the gate population (false PASS).
// The disambiguator is structural, not lexical: file headers only ever appear
// OUTSIDE a hunk. So this is a two-state machine — outside a hunk, "+++ " is a
// header; inside one, every line is content. Hunk extent comes from the hunk
// header's own counts (omitted count means 1, per the unified diff format):
// removals consume the old budget, additions the new budget, context both. The
// hunk ends when both budgets reach zero, which returns us to header state.
// ---------------------------------------------------------------------------
export function parseDiffAddedLines(diff: string): Map<string, Set<number>> {
  const byFile = new Map<string, Set<number>>();
  let currentFile: string | null = null;
  let rightLine = 0;
  // Remaining declared lines of the hunk being consumed; both zero = outside.
  let oldBudget = 0;
  let newBudget = 0;
  for (const raw of diff.split("\n")) {
    const inHunk = oldBudget > 0 || newBudget > 0;
    if (!inHunk) {
      if (raw.startsWith("+++ ")) {
        const p = raw.slice(4).trim();
        currentFile = p === "/dev/null" ? null : p.replace(/^b\//, "");
        continue;
      }
      const hunk = raw.match(/^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunk) {
        rightLine = Number.parseInt(hunk[2], 10);
        oldBudget = hunk[1] === undefined ? 1 : Number.parseInt(hunk[1], 10);
        newBudget = hunk[3] === undefined ? 1 : Number.parseInt(hunk[3], 10);
        continue;
      }
      continue;
    }
    if (raw.startsWith("\\")) continue; // "\ No newline at end of file" — no budget
    if (raw.startsWith("+")) {
      // Budgets are spent even for /dev/null targets, so the hunk still ends.
      if (currentFile) {
        const set = byFile.get(currentFile) ?? new Set();
        set.add(rightLine);
        byFile.set(currentFile, set);
      }
      rightLine += 1;
      newBudget -= 1;
    } else if (raw.startsWith("-")) {
      oldBudget -= 1;
    } else {
      // context line (only appears when unified>0); advances the right side
      rightLine += 1;
      oldBudget -= 1;
      newBudget -= 1;
    }
  }
  return byFile;
}

export interface SemanticSelector {
  function: string;
  fingerprint: string;
  anchorLines: number;
  targetLines: string;
}

export interface ResolvedLineRange {
  start: number;
  end: number;
}

interface FunctionScope extends ResolvedLineRange {
  name: string;
}

const functionScopeCache = new Map<string, FunctionScope[]>();

function parseLineRange(lines: string): ResolvedLineRange {
  if (!/^\d+(-\d+)?$/.test(lines)) throw new Error(`coverage-patch-gate: invalid line range: ${lines}`);
  const [start, explicitEnd] = lines.split("-").map((part) => Number.parseInt(part, 10));
  const end = explicitEnd ?? start;
  if (start < 1 || end < start) throw new Error(`coverage-patch-gate: invalid line range: ${lines}`);
  return { start, end };
}

function sourceFingerprint(lines: readonly string[]): string {
  return `sha256:${createHash("sha256").update(lines.join("\n")).digest("hex")}`;
}

function functionScopes(file: string, source: string): FunctionScope[] {
  const cacheKey = `${file}\0${source}`;
  const cached = functionScopeCache.get(cacheKey);
  if (cached) return cached;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const scopes: FunctionScope[] = [{ name: "<module>", start: 1, end: source.split(/\r?\n/).length }];
  const lineRange = (node: ts.Node): ResolvedLineRange => ({
    start: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
    end: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
  });
  const propertyName = (name: ts.PropertyName | undefined): string | null => {
    if (!name) return null;
    if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
      return name.text;
    }
    return null;
  };
  const classPrefix = (node: ts.Node): string | null => {
    const parent = node.parent;
    if ((ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) && parent.name) return parent.name.text;
    return null;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      scopes.push({ name: node.name.text, ...lineRange(node) });
    } else if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
      const name = propertyName(node.name);
      if (name) {
        const prefix = classPrefix(node);
        scopes.push({ name: prefix ? `${prefix}.${name}` : name, ...lineRange(node) });
      }
    } else if (ts.isConstructorDeclaration(node)) {
      const prefix = classPrefix(node);
      scopes.push({ name: prefix ? `${prefix}.constructor` : "constructor", ...lineRange(node) });
    } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        scopes.push({ name: parent.name.text, ...lineRange(parent) });
      } else if (ts.isPropertyAssignment(parent)) {
        const name = propertyName(parent.name);
        if (name) scopes.push({ name, ...lineRange(parent) });
      } else if (ts.isFunctionExpression(node) && node.name) {
        scopes.push({ name: node.name.text, ...lineRange(node) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  functionScopeCache.set(cacheKey, scopes);
  return scopes;
}

export function createSemanticSelector(file: string, source: string, lines: string): SemanticSelector {
  const target = parseLineRange(lines);
  const sourceLines = source.split(/\r?\n/);
  if (target.end > sourceLines.length) {
    throw new Error(`coverage-patch-gate: line range ${lines} exceeds ${file}`);
  }
  const scopes = functionScopes(file, source);
  const containing = scopes
    .filter((scope) => scope.start <= target.start && scope.end >= target.end)
    .sort((a, b) => {
      const widthDifference = a.end - a.start - (b.end - b.start);
      if (widthDifference !== 0) return widthDifference;
      if (a.name === "<module>") return 1;
      if (b.name === "<module>") return -1;
      return a.name.localeCompare(b.name);
    });
  let scope = containing[0];
  if (!scope) throw new Error(`coverage-patch-gate: ${file}:${lines} is outside the source file`);
  if (scopes.filter((candidate) => candidate.name === scope.name).length !== 1) {
    scope = containing.find((candidate) => candidate.name === "<module>") as FunctionScope;
  }
  let anchorStart = target.start;
  let anchorEnd = target.end;
  let anchor: string[] = [];
  let fingerprint = "";
  for (;;) {
    anchor = sourceLines.slice(anchorStart - 1, anchorEnd);
    fingerprint = sourceFingerprint(anchor);
    let matches = 0;
    for (let start = scope.start; start + anchor.length - 1 <= scope.end; start += 1) {
      if (sourceFingerprint(sourceLines.slice(start - 1, start - 1 + anchor.length)) === fingerprint) matches += 1;
    }
    if (matches === 1) break;
    const canExpandBefore = anchorStart > scope.start;
    const canExpandAfter = anchorEnd < scope.end;
    if (!canExpandBefore && !canExpandAfter) {
      throw new Error(`coverage-patch-gate: ${file}:${lines} source fingerprint is not unique in ${scope.name}`);
    }
    if (canExpandBefore) anchorStart -= 1;
    if (canExpandAfter) anchorEnd += 1;
  }
  const relativeStart = target.start - anchorStart + 1;
  const relativeEnd = target.end - anchorStart + 1;
  return {
    function: scope.name,
    fingerprint,
    anchorLines: anchor.length,
    targetLines: relativeStart === relativeEnd ? String(relativeStart) : `${relativeStart}-${relativeEnd}`,
  };
}

export function resolveSemanticSelector(
  file: string,
  source: string,
  selector: SemanticSelector,
): ResolvedLineRange {
  const scopes = functionScopes(file, source).filter((scope) => scope.name === selector.function);
  if (scopes.length !== 1) {
    throw new Error(
      `coverage-patch-gate: function ${selector.function} in ${file} resolved ${scopes.length} times (expected exactly one)`,
    );
  }
  const [scope] = scopes;
  const sourceLines = source.split(/\r?\n/);
  const matches: number[] = [];
  for (let start = scope.start; start + selector.anchorLines - 1 <= scope.end; start += 1) {
    const candidate = sourceLines.slice(start - 1, start - 1 + selector.anchorLines);
    if (sourceFingerprint(candidate) === selector.fingerprint) matches.push(start);
  }
  if (matches.length !== 1) {
    throw new Error(
      `coverage-patch-gate: source fingerprint for ${file}#${selector.function} resolved ${matches.length} times (expected exactly one)`,
    );
  }
  const relative = parseLineRange(selector.targetLines);
  return { start: matches[0] + relative.start - 1, end: matches[0] + relative.end - 1 };
}

// ---------------------------------------------------------------------------
// Allowlist. Reason-required, range-scoped exemptions, reviewed in-repo.
// ---------------------------------------------------------------------------
export interface AllowlistEntry {
  file: string;
  selector: SemanticSelector;
  reason: string;
  expiry?: string; // condition under which the entry should be removed (state it where possible)
}

export interface ResolvedAllowlistEntry {
  file: string;
  start: number;
  end: number;
  reason: string;
  expiry?: string;
}

function formatLineRange(range: ResolvedLineRange): string {
  return range.start === range.end ? String(range.start) : `${range.start}-${range.end}`;
}

function validSemanticSelector(value: unknown): value is SemanticSelector {
  if (value === null || typeof value !== "object") return false;
  const selector = value as Partial<SemanticSelector>;
  if (
    typeof selector.function !== "string" ||
    selector.function.length === 0 ||
    typeof selector.fingerprint !== "string" ||
    !/^sha256:[0-9a-f]{64}$/.test(selector.fingerprint) ||
    typeof selector.anchorLines !== "number" ||
    !Number.isInteger(selector.anchorLines) ||
    selector.anchorLines < 1 ||
    typeof selector.targetLines !== "string"
  ) {
    return false;
  }
  try {
    const target = parseLineRange(selector.targetLines);
    return target.end <= selector.anchorLines;
  } catch {
    return false;
  }
}

export function parseAllowlist(json: string): AllowlistEntry[] {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) {
    throw new Error("coverage-patch-gate: allowlist must be a JSON array");
  }
  for (const e of data) {
    if (typeof e?.lines === "string") {
      throw new Error(`coverage-patch-gate: semantic selector required; absolute line pins are not allowed: ${JSON.stringify(e)}`);
    }
    if (
      typeof e?.file !== "string" ||
      !validSemanticSelector(e?.selector) ||
      typeof e?.reason !== "string" ||
      e.reason.trim().length === 0 ||
      (e.expiry !== undefined && typeof e.expiry !== "string")
    ) {
      throw new Error(
        `coverage-patch-gate: malformed allowlist entry (file/selector/reason required, reason non-empty, expiry string when present): ${JSON.stringify(e)}`,
      );
    }
  }
  return data as AllowlistEntry[];
}

export function resolveAllowlistEntries(
  entries: readonly AllowlistEntry[],
  sources: ReadonlyMap<string, string>,
): ResolvedAllowlistEntry[] {
  return entries.map((entry) => {
    const source = sources.get(entry.file);
    if (source === undefined) {
      throw new Error(`coverage-patch-gate: source not found for semantic allowlist entry: ${entry.file}`);
    }
    const range = resolveSemanticSelector(entry.file, source, entry.selector);
    return {
      file: entry.file,
      start: range.start,
      end: range.end,
      reason: entry.reason,
      ...(entry.expiry === undefined ? {} : { expiry: entry.expiry }),
    };
  });
}

// Stale detection (E-CV1 e3 reservation): every allowlist range must still
// match at least one measurable (DA-recorded) line in the head LCOV. A range
// that matches nothing is ledger rot and fails the gate loudly.
export function findStaleAllowlistEntries(
  entries: ResolvedAllowlistEntry[],
  lcov: Map<string, Map<number, number>>,
): ResolvedAllowlistEntry[] {
  return entries.filter((e) => {
    const hits = lcov.get(e.file);
    if (!hits) return true;
    for (let line = e.start; line <= e.end; line += 1) {
      if (hits.has(line)) return false;
    }
    return true;
  });
}

function allowlisted(entries: ResolvedAllowlistEntry[], file: string, line: number): boolean {
  return entries.some((e) => {
    if (e.file !== file) return false;
    return line >= e.start && line <= e.end;
  });
}

// ---------------------------------------------------------------------------
// The verdict.
// ---------------------------------------------------------------------------
export interface PatchGateResult {
  measuredAdded: number; // added lines present in lcov
  covered: number;
  allowlistedCount: number;
  violations: Array<{ file: string; line: number }>;
}

export function evaluatePatch(
  added: Map<string, Set<number>>,
  lcov: Map<string, Map<number, number>>,
  allowlist: ResolvedAllowlistEntry[] = [],
): PatchGateResult {
  const result: PatchGateResult = { measuredAdded: 0, covered: 0, allowlistedCount: 0, violations: [] };
  for (const [file, lines] of added) {
    const hits = lcov.get(file);
    if (!hits) continue; // file absent from lcov → structurally unmeasurable here (Q2=A)
    for (const line of lines) {
      const h = hits.get(line);
      if (h === undefined) continue; // line not coverable (comment, type-only, blank)
      result.measuredAdded += 1;
      if (h > 0) {
        result.covered += 1;
      } else if (allowlisted(allowlist, file, line)) {
        result.allowlistedCount += 1;
      } else {
        result.violations.push({ file, line });
      }
    }
  }
  return result;
}

export function renderSummary(result: PatchGateResult): string {
  const lines: string[] = [];
  const verdict = result.violations.length === 0 ? "PASS" : "FAIL";
  lines.push(`Patch coverage gate: ${verdict}`);
  lines.push(
    `measured added lines: ${result.measuredAdded}, covered: ${result.covered}, allowlisted: ${result.allowlistedCount}, uncovered: ${result.violations.length}`,
  );
  for (const v of result.violations) {
    lines.push(`  UNCOVERED ${v.file}:${v.line}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI. --check reads the head lcov and the PR diff, prints the verdict, and
// exits non-zero on violations. Fail-closed: a missing lcov is an error, not a
// pass — a gate that silently passes when its input vanished is theater.
// ---------------------------------------------------------------------------
export function runCheck(repoRoot: string = REPO_ROOT): number {
  const status = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    },
  );
  if (status.status !== 0) {
    console.error(
      `coverage-patch-gate: git status failed; cannot verify that the committed diff and LCOV describe the same snapshot: ${status.stderr}`,
    );
    return 1;
  }
  if (status.stdout.trim().length > 0) {
    console.error(
      "coverage-patch-gate: working tree is dirty; cannot verify that the committed diff and LCOV describe the same source snapshot. Commit or stash the changes, or rerun from a clean worktree.",
    );
    return 1;
  }

  const lcovFile = lcovPath();
  if (!existsSync(lcovFile)) {
    console.error(`coverage-patch-gate: lcov not found at ${lcovFile} (run \`bun run coverage:ci\` first)`);
    return 1;
  }
  const lcov = parseLcovLineHits(readFileSync(lcovFile, "utf8"));

  let diffText: string;
  const diffFile = process.env.AMADEUS_PATCH_DIFF;
  if (diffFile) {
    if (!existsSync(diffFile)) {
      console.error(`coverage-patch-gate: diff file not found at ${diffFile}`);
      return 1;
    }
    diffText = readFileSync(diffFile, "utf8");
  } else {
    const baseRef = process.env.AMADEUS_PATCH_BASE_REF ?? "origin/main";
    // three-dot: diff against the merge-base of baseRef and HEAD in one call
    const diff = spawnSync(
      "git",
      ["diff", "--unified=0", "--diff-filter=ACMR", `${baseRef}...HEAD`],
      {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 64 * 1024 * 1024,
      },
    );
    if (diff.status !== 0) {
      console.error(`coverage-patch-gate: git diff ${baseRef}...HEAD failed: ${diff.stderr}`);
      return 1;
    }
    diffText = diff.stdout;
  }

  let allowlist: ResolvedAllowlistEntry[] = [];
  const alPath = allowlistPath();
  if (existsSync(alPath)) {
    const entries = parseAllowlist(readFileSync(alPath, "utf8"));
    const sources = new Map<string, string>();
    for (const entry of entries) {
      if (sources.has(entry.file)) continue;
      const sourcePath = join(repoRoot, entry.file);
      if (existsSync(sourcePath)) sources.set(entry.file, readFileSync(sourcePath, "utf8"));
    }
    try {
      allowlist = resolveAllowlistEntries(entries, sources);
    } catch (error) {
      console.error(`coverage-patch-gate: STALE semantic allowlist entry: ${(error as Error).message}`);
      return 1;
    }
    const stale = findStaleAllowlistEntries(allowlist, lcov);
    if (stale.length > 0) {
      console.error(
        `coverage-patch-gate: STALE allowlist entries (range matches no measurable line — remove or update):\n${stale
          .map((e) => `  ${e.file}:${formatLineRange(e)} (${e.reason})`)
          .join("\n")}`,
      );
      return 1;
    }
  }

  const result = evaluatePatch(parseDiffAddedLines(diffText), lcov, allowlist);
  console.log(renderSummary(result));
  return result.violations.length === 0 ? 0 : 1;
}

export function main(argv: string[], repoRoot: string = REPO_ROOT): number {
  if (argv[0] === "--check" && argv.length === 1) return runCheck(repoRoot);
  if (argv[0] === "--create-selector" && argv.length === 3) {
    const [, file, lines] = argv;
    const sourcePath = join(repoRoot, file);
    if (!existsSync(sourcePath)) {
      console.error(`coverage-patch-gate: source not found at ${sourcePath}`);
      return 1;
    }
    try {
      console.log(JSON.stringify(createSemanticSelector(file, readFileSync(sourcePath, "utf8"), lines), null, 2));
      return 0;
    } catch (error) {
      console.error((error as Error).message);
      return 1;
    }
  }
  console.error(
    "Usage: bun tests/coverage-patch-gate.ts --check | --create-selector <file> <lines>",
  );
  return 2;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
