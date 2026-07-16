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
// .coverage-patch-allowlist.json may exempt specific file:line ranges; every
// entry must carry a non-empty reason (and an expiry condition where one can
// be stated, enabling E-EXP1-style expiry inventories) and lands only through
// PR review. The gate hard-fails on malformed or reason-less entries — an
// allowlist that can be edited silently would be worse than none.
//
// ORDERING (E-CV1 e3 reservation): seam refactor comes FIRST; the allowlist is
// the SECOND resort for lines where a refactor is unnatural (message-string
// rows, dispatch cases — see spawn-blindspot-two-step). STALE entries — ranges
// that no longer match any measurable line in the head LCOV — fail the gate
// loudly so the ledger cannot rot.
//
// Run:
//   bun tests/coverage-patch-gate.ts --check   # CI gate (exit 1 on violation)
// Env seams (tests point these at temp fixtures to PROVE the gate):
//   AMADEUS_PATCH_LCOV       — lcov.info path (default coverage/lcov.info)
//   AMADEUS_PATCH_DIFF       — unified diff file to evaluate (default: git diff)
//   AMADEUS_PATCH_BASE_REF   — base ref for the git diff (default: origin/main)
//   AMADEUS_PATCH_ALLOWLIST  — allowlist path (default tests/.coverage-patch-allowlist.json)

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
// ---------------------------------------------------------------------------
export function parseDiffAddedLines(diff: string): Map<string, Set<number>> {
  const byFile = new Map<string, Set<number>>();
  let currentFile: string | null = null;
  let rightLine = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).trim();
      currentFile = p === "/dev/null" ? null : p.replace(/^b\//, "");
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) {
      rightLine = Number.parseInt(hunk[1], 10);
      continue;
    }
    if (!currentFile) continue;
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      const set = byFile.get(currentFile) ?? new Set();
      set.add(rightLine);
      byFile.set(currentFile, set);
      rightLine += 1;
    } else if (!raw.startsWith("-") && !raw.startsWith("\\")) {
      // context line (only appears when unified>0); advances the right side
      rightLine += 1;
    }
  }
  return byFile;
}

// ---------------------------------------------------------------------------
// Allowlist. Reason-required, range-scoped exemptions, reviewed in-repo.
// ---------------------------------------------------------------------------
export interface AllowlistEntry {
  file: string;
  lines: string; // "12" or "12-20"
  reason: string;
  expiry?: string; // condition under which the entry should be removed (state it where possible)
}

export function parseAllowlist(json: string): AllowlistEntry[] {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) {
    throw new Error("coverage-patch-gate: allowlist must be a JSON array");
  }
  for (const e of data) {
    if (
      typeof e?.file !== "string" ||
      typeof e?.lines !== "string" ||
      !/^\d+(-\d+)?$/.test(e.lines) ||
      typeof e?.reason !== "string" ||
      e.reason.trim().length === 0 ||
      (e.expiry !== undefined && typeof e.expiry !== "string")
    ) {
      throw new Error(
        `coverage-patch-gate: malformed allowlist entry (file/lines/reason required, reason non-empty, expiry string when present): ${JSON.stringify(e)}`,
      );
    }
  }
  return data as AllowlistEntry[];
}

// Stale detection (E-CV1 e3 reservation): every allowlist range must still
// match at least one measurable (DA-recorded) line in the head LCOV. A range
// that matches nothing is ledger rot and fails the gate loudly.
export function findStaleAllowlistEntries(
  entries: AllowlistEntry[],
  lcov: Map<string, Map<number, number>>,
): AllowlistEntry[] {
  return entries.filter((e) => {
    const hits = lcov.get(e.file);
    if (!hits) return true;
    const [lo, hi] = e.lines.split("-").map((s) => Number.parseInt(s, 10));
    const upper = hi ?? lo;
    for (let line = lo; line <= upper; line += 1) {
      if (hits.has(line)) return false;
    }
    return true;
  });
}

function allowlisted(entries: AllowlistEntry[], file: string, line: number): boolean {
  return entries.some((e) => {
    if (e.file !== file) return false;
    const [lo, hi] = e.lines.split("-").map((s) => Number.parseInt(s, 10));
    return line >= lo && line <= (hi ?? lo);
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
  allowlist: AllowlistEntry[] = [],
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
export function runCheck(): number {
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
    const diff = spawnSync("git", ["diff", "--unified=0", `${baseRef}...HEAD`], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (diff.status !== 0) {
      console.error(`coverage-patch-gate: git diff ${baseRef}...HEAD failed: ${diff.stderr}`);
      return 1;
    }
    diffText = diff.stdout;
  }

  let allowlist: AllowlistEntry[] = [];
  const alPath = allowlistPath();
  if (existsSync(alPath)) {
    allowlist = parseAllowlist(readFileSync(alPath, "utf8"));
    const stale = findStaleAllowlistEntries(allowlist, lcov);
    if (stale.length > 0) {
      console.error(
        `coverage-patch-gate: STALE allowlist entries (range matches no measurable line — remove or update):\n${stale
          .map((e) => `  ${e.file}:${e.lines} (${e.reason})`)
          .join("\n")}`,
      );
      return 1;
    }
  }

  const result = evaluatePatch(parseDiffAddedLines(diffText), lcov, allowlist);
  console.log(renderSummary(result));
  return result.violations.length === 0 ? 0 : 1;
}

export function main(argv: string[]): number {
  if (argv[0] !== "--check") {
    console.error("Usage: bun tests/coverage-patch-gate.ts --check");
    return 2;
  }
  return runCheck();
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
