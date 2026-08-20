#!/usr/bin/env bun
// callsite-guard.ts — the call-site guard for the OTel migration (VER-4).
//
// WHAT THIS IS. A deterministic shrink-only ratchet over the legacy audit and
// telemetry call sites, shaped after tests/complexity-gate.ts (the canonical
// gate template) and tests/coverage-project-gate.ts. It scans the product
// source for direct legacy writer calls, `serializeJournalEntry` v1 writer
// calls, and legacy `observe()` / `observeSubprocess()` usage, compares the
// census against a committed allowlist, and fails CI when a call site is ADDED.
// The allowlist only ratchets down (--update prunes what was migrated); it
// never admits a new site silently.
//
// THE RULES (business-rules.md BR-7/BR-8/BR-9/BR-12):
//   - a site in a file absent from the allowlist            -> VIOLATION
//   - MORE sites for a (file, symbol) than the allowlist has -> VIOLATION
//   - fewer sites, or a file that lost all of them           -> OK (migration)
//   - missing/malformed allowlist                            -> fail-closed
//   - the residual site list is printed on every run so the walk to zero (the
//     FR-MIG-4(c) deletion-gate condition, owned by U8) is always visible;
//     intentional v1 codec/conversion/recovery exceptions remain explicit
//     registered entries until their owning migrations land
//
// WHY COUNTS AND NOT LINE PINS. An allowlist of file:line identifiers goes
// stale the moment an unrelated edit shifts a file, and every later PR then
// fails on a pin that moved rather than on a real regression
// (cid:code-generation:allowlist-line-pin-stale). Per-(file, symbol) counts
// keep the monotone-decrease property BR-12 needs without that failure mode.
//
// SCAN SCOPE. The migration target is the product source of truth:
// packages/framework/core/ plus scripts/. Generated trees (dist/, the
// self-install harness copies) are excluded because they are projections of
// core — migrating core migrates them by construction. tests/ is excluded
// because the legacy writer's own tests are deleted WITH the writer in U8.
//
// Run:
//   bun tests/callsite-guard.ts --check           # CI gate (exit 1 on a new site)
//   bun tests/callsite-guard.ts --update          # rewrite the allowlist from a fresh scan
//   bun tests/callsite-guard.ts --report <path>   # also write the residual report as JSON

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Constants: the guarded vocabulary and the scan scope. Single source for the
// scanner, the allowlist self-description and the rendered messages.
// ---------------------------------------------------------------------------

// The legacy symbols a migrated call site must no longer use. `appendAuditEntry*`
// is the v1 audit writer (FR-MIG-1); `serializeJournalEntry` is the v1 journal
// serializer and is guarded because a production disk-writing call site must
// not become invisible to the deletion gate; `observe*` is the pre-OTel timing
// wrapper that FR-TRC-1 replaces with Trace API spans.
export const GUARDED_SYMBOLS = [
  "appendAuditEntry",
  "appendAuditEntryUnlocked",
  "serializeJournalEntry",
  "observe",
  "observeSubprocess",
] as const;

export type GuardedSymbol = (typeof GUARDED_SYMBOLS)[number];

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;

const ALLOWLIST_BASENAME = ".callsite-allowlist.json";

// Explicit v1 compatibility registrations. These are not live canonical
// writers: the converter must emit backward-compatible v1 JSONL, the state
// tool's recovery path atomically commits a dense five-row batch and is owned
// by a separate migration, and the journal module's branch is codec dispatch.
// Keeping the paths documented beside the guard makes an allowlisted residual
// auditable instead of turning the shrink-only file into an unexplained count.
export const JUSTIFIED_V1_SERIALIZER_PATHS = {
  "packages/framework/core/tools/amadeus-journal-convert.ts": "backward conversion output",
  "packages/framework/core/tools/amadeus-state.ts": "atomic approval recovery batch; separate owner",
  "packages/framework/core/tools/amadeus-journal.ts": "serializer dispatch codec, not a disk writer",
} as const;

export function allowlistPath(): string {
  return join(REPO_ROOT, "tests", ALLOWLIST_BASENAME);
}

// ---------------------------------------------------------------------------
// Detection. A single linear pass per file, no syntax tree and no type
// resolution (performance-design.md: lint-budget, O(files)). Detection leans
// to OVER-detection: a false positive is fixed by migrating or by an explicit
// allowlist entry, a false negative would let a new legacy call site through
// (reliability-design.md).
// ---------------------------------------------------------------------------

export type CallsiteMatch = {
  readonly file: string;
  readonly line: number;
  readonly symbol: GuardedSymbol;
};

// A call: the symbol, optionally reached through a receiver (`audit.append…`),
// immediately followed by `(`. `\b` on the left would match the tail of a
// longer identifier, so the boundary is spelled out as "not an identifier
// character, and not a dot-free longer name".
//
// The `g` flag is load-bearing: a line can hold MORE than one legacy call, and
// counting only the first would let a legacy call appended to an
// already-allowlisted line slip past the shrink-only ratchet (PR #1733 Bugbot,
// Medium). matchAll is used rather than `test`, which reports presence only.
const CALL_RES: readonly { symbol: GuardedSymbol; re: RegExp }[] = GUARDED_SYMBOLS.map((symbol) => ({
  symbol,
  re: new RegExp(`(?<![A-Za-z0-9_$])${symbol}\\s*\\(`, "g"),
}));

// Lines that mention a guarded symbol without being a call site: the import
// that brings it in, a comment about it, and the writer's own declaration.
const NOT_A_CALLSITE = [
  /^\s*(?:import|export)\s/,
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*(?:export\s+)?function\s/,
] as const;

function isCallsiteLine(line: string): boolean {
  return !NOT_A_CALLSITE.some((re) => re.test(line));
}

// The longest guarded symbol wins on a given line: `appendAuditEntryUnlocked(`
// also contains no `appendAuditEntry(` (the `(` differs), but keeping the
// scan order longest-first documents the intent and survives future additions.
const CALL_RES_LONGEST_FIRST = [...CALL_RES].sort((a, b) => b.symbol.length - a.symbol.length);

export function detectCallsites(file: string, source: string): CallsiteMatch[] {
  const found: CallsiteMatch[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (!isCallsiteLine(line)) continue;
    for (const { symbol, re } of CALL_RES_LONGEST_FIRST) {
      // matchAll over a fresh iterator each line; one entry per OCCURRENCE.
      for (const _match of line.matchAll(re)) found.push({ file, line: i + 1, symbol });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Census and the allowlist document.
// ---------------------------------------------------------------------------

export type Census = Record<string, Record<string, number>>;

export type AllowlistDoc = {
  readonly description: string;
  readonly direction: "shrink-only";
  readonly total: number;
  readonly sites: Census;
};

export function buildCensus(matches: readonly CallsiteMatch[]): Census {
  const census: Census = {};
  for (const match of matches) {
    const perFile = census[match.file] ?? {};
    perFile[match.symbol] = (perFile[match.symbol] ?? 0) + 1;
    census[match.file] = perFile;
  }
  return census;
}

export function totalSites(census: Census): number {
  let total = 0;
  for (const perFile of Object.values(census)) {
    for (const count of Object.values(perFile)) total += count;
  }
  return total;
}

// ---------------------------------------------------------------------------
// The ratchet verdict. Both arms carry the measured total, so the caller never
// reports a count it did not derive from the scan.
// ---------------------------------------------------------------------------

export type GuardVerdict =
  | { readonly kind: "ok"; readonly total: number; readonly removed: readonly string[] }
  | { readonly kind: "violations"; readonly total: number; readonly added: readonly string[] };

function allowedCount(allowlist: AllowlistDoc, file: string, symbol: string): number {
  return allowlist.sites[file]?.[symbol] ?? 0;
}

function collectAdded(census: Census, allowlist: AllowlistDoc): string[] {
  const added: string[] = [];
  for (const file of Object.keys(census).sort()) {
    for (const symbol of Object.keys(census[file] as Record<string, number>).sort()) {
      const measured = (census[file] as Record<string, number>)[symbol] as number;
      const allowed = allowedCount(allowlist, file, symbol);
      if (measured > allowed) {
        added.push(`${file}: ${symbol} — allowlist ${allowed}, measured ${measured}`);
      }
    }
  }
  return added;
}

function collectRemoved(census: Census, allowlist: AllowlistDoc): string[] {
  const removed: string[] = [];
  for (const file of Object.keys(allowlist.sites).sort()) {
    for (const symbol of Object.keys(allowlist.sites[file] as Record<string, number>).sort()) {
      const allowed = allowedCount(allowlist, file, symbol);
      const measured = census[file]?.[symbol] ?? 0;
      if (measured < allowed) {
        removed.push(`${file}: ${symbol} — allowlist ${allowed}, measured ${measured}`);
      }
    }
  }
  return removed;
}

export function diffAgainstAllowlist(census: Census, allowlist: AllowlistDoc): GuardVerdict {
  const total = totalSites(census);
  const added = collectAdded(census, allowlist);
  if (added.length > 0) return { kind: "violations", total, added };
  return { kind: "ok", total, removed: collectRemoved(census, allowlist) };
}

// ---------------------------------------------------------------------------
// Filesystem walk + CLI. Kept out of the pure core above so the rules are
// tested in-process without touching a real tree.
// ---------------------------------------------------------------------------

const SOURCE_EXT_RE = /\.ts$/;

export function listSourceFiles(root: string): string[] {
  const abs = join(REPO_ROOT, root);
  if (!existsSync(abs)) return [];
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        // vendor/ is third-party code, not an Amadeus call site.
        if (entry.name === "vendor" || entry.name === "node_modules") continue;
        walk(path);
        continue;
      }
      if (SOURCE_EXT_RE.test(entry.name)) files.push(path);
    }
  };
  walk(abs);
  return files.sort();
}

export function scanRepository(): CallsiteMatch[] {
  const matches: CallsiteMatch[] = [];
  for (const root of SCAN_ROOTS) {
    for (const path of listSourceFiles(root)) {
      const rel = relative(REPO_ROOT, path);
      matches.push(...detectCallsites(rel, readFileSync(path, "utf-8")));
    }
  }
  return matches;
}

export type LoadedAllowlist = { kind: "loaded"; doc: AllowlistDoc } | { kind: "failed"; detail: string };

export function parseAllowlist(body: string): LoadedAllowlist {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    return { kind: "failed", detail: `allowlist is not valid JSON: ${(err as Error).message}` };
  }
  if (parsed === null || typeof parsed !== "object") {
    return { kind: "failed", detail: "allowlist must be a JSON object" };
  }
  const doc = parsed as Partial<AllowlistDoc>;
  if (doc.direction !== "shrink-only") {
    return { kind: "failed", detail: `allowlist direction must be "shrink-only", got ${String(doc.direction)}` };
  }
  if (doc.sites === null || typeof doc.sites !== "object") {
    return { kind: "failed", detail: "allowlist.sites must be a JSON object" };
  }
  return { kind: "loaded", doc: { description: String(doc.description ?? ""), direction: "shrink-only", total: Number(doc.total ?? 0), sites: doc.sites as Census } };
}

// Module scope, not inline: a `+`-concatenated value inside a multi-line call
// argument leaves its continuation lines at DA:0 in bun's lcov, which reads as
// uncovered patch lines (cid:code-generation:bun-multiline-arg-da0).
const ALLOWLIST_DESCRIPTION =
  "Legacy audit/telemetry and v1 journal serializer call sites. The explicit residual entries are intentional converter/recovery/codec compatibility paths; shrink-only: adding a site fails CI. Regenerate with: bun tests/callsite-guard.ts --update";

export function renderAllowlist(census: Census): string {
  const doc = { description: ALLOWLIST_DESCRIPTION, direction: "shrink-only", total: totalSites(census), sites: census };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

// The residual report BR-9 keeps visible on every run: the same shape all the
// way down to zero sites, so the U8 deletion gate reads one format.
export type ResidualReport = {
  readonly generatedAt: string;
  readonly total: number;
  readonly byFile: Record<string, number>;
};

export function buildResidualReport(census: Census, now: string): ResidualReport {
  const byFile: Record<string, number> = {};
  for (const file of Object.keys(census).sort()) {
    byFile[file] = totalSites({ [file]: census[file] as Record<string, number> });
  }
  return { generatedAt: now, total: totalSites(census), byFile };
}

function fail(code: string, lines: readonly string[]): number {
  console.error(`CALLSITE GUARD FAILED [${code}]:`);
  for (const line of lines) console.error(`  ${line}`);
  return 1;
}

function renderResidual(report: ResidualReport): void {
  console.log(`callsite guard: ${report.total} legacy call site(s) remaining across ${Object.keys(report.byFile).length} file(s)`);
  for (const [file, count] of Object.entries(report.byFile)) {
    console.log(`  ${count}\t${file}`);
  }
}

function loadAllowlistOrFail(path: string): LoadedAllowlist {
  if (!existsSync(path)) {
    return { kind: "failed", detail: `allowlist not found at ${path}` };
  }
  return parseAllowlist(readFileSync(path, "utf-8"));
}

// The allowlist and report paths are injectable so the gate can be driven
// in-process by tests (a spawned CLI is invisible to bun --coverage) without a
// test ever rewriting the committed allowlist.
export type CheckOptions = {
  readonly allowlistPath?: string;
  readonly reportPath?: string;
  // The census to judge, for tests. It defaults to a live scan, and argv has no
  // way to set it — `main` only ever measures. The seam exists because the
  // migration finished: with zero legacy call sites left in the tree, the live
  // corpus can no longer produce a NEW_CALLSITE, and the arm that rejects one
  // would be unreachable from a test. A ratchet observed only in its passing
  // state is not a ratchet. (Same shape as the deletion gate's `evidence` seam.)
  readonly census?: Census;
};

export function runCheck(options: CheckOptions = {}): number {
  const reportPath = options.reportPath;
  const loaded = loadAllowlistOrFail(options.allowlistPath ?? allowlistPath());
  if (loaded.kind === "failed") {
    return fail("ALLOWLIST_UNREADABLE", [loaded.detail, "Regenerate with: bun tests/callsite-guard.ts --update"]);
  }
  const census = options.census ?? buildCensus(scanRepository());
  const report = buildResidualReport(census, new Date().toISOString());
  if (reportPath !== undefined) writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  const verdict = diffAgainstAllowlist(census, loaded.doc);
  if (verdict.kind === "violations") {
    renderResidual(report);
    return fail("NEW_CALLSITE", [
      ...verdict.added,
      "",
      "The legacy audit writer, v1 journal serializer, and pre-OTel observe() wrapper are being retired (FR-MIG-1/FR-TRC-1).",
      "Emit through otel/logger-provider.ts emitEvent, or open a span through otel/tracer-provider.ts; register intentional v1 compatibility paths in the allowlist with an English justification.",
      "The allowlist only ratchets down — it cannot be grown to admit a new site.",
    ]);
  }
  renderResidual(report);
  if (verdict.removed.length > 0) {
    console.log(`callsite guard: ${verdict.removed.length} allowlist entr(ies) now over-count — prune with --update:`);
    for (const line of verdict.removed) console.log(`  ${line}`);
  }
  console.log(`callsite guard: OK — 0 new call sites, ${verdict.total} remaining (shrink-only)`);
  return 0;
}

export function runUpdate(path: string = allowlistPath()): number {
  const census = buildCensus(scanRepository());
  writeFileSync(path, renderAllowlist(census), "utf-8");
  console.log(`Wrote ${path}: ${totalSites(census)} site(s) across ${Object.keys(census).length} file(s)`);
  return 0;
}

const USAGE =
  "usage: bun tests/callsite-guard.ts <--check [--report <path>] | --update>\n" +
  "  --check   compare the scanned call sites against the committed allowlist (CI gate)\n" +
  "  --update  rewrite tests/.callsite-allowlist.json from the current scan";

export function main(args: string[]): number {
  try {
    if (args[0] === "--check" && args.length === 1) return runCheck();
    if (args[0] === "--check" && args.length === 3 && args[1] === "--report") {
      return runCheck({ reportPath: args[2] as string });
    }
    if (args.length === 1 && args[0] === "--update") return runUpdate();
    console.error(USAGE);
    return 2;
  } catch (err) {
    console.error(`CALLSITE GUARD FAILED [UNEXPECTED]: ${(err as Error).message}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
