#!/usr/bin/env bun
// unchecked-cast-guard.ts — the unchecked-cast ratchet (#1980, FR-3a/3b/3c).
//
// WHAT THIS IS. A deterministic shrink-only ratchet over the reads that claim a
// domain type for a value taken off disk without proving it. It scans the
// product source for `JSON.parse(...) as T`, compares the census against a
// committed allowlist, and fails CI when a site is ADDED. Shaped after
// tests/callsite-guard.ts, the canonical ratchet template in this repository.
//
// THE RULES (business-rules.md BR-CG-1..31):
//   - a site in a file absent from the allowlist              -> VIOLATION
//   - MORE sites for a (file, kind) than the allowlist has    -> VIOLATION
//   - fewer sites, or a file that lost all of them            -> OK (shrinkage)
//   - missing/malformed allowlist                             -> fail-closed
//   - the residual site list is printed on every run, so the walk to zero is
//     visible in the job log whatever the verdict is
//
// WHY `as unknown` IS NOT A VIOLATION. Casting a parsed value to `unknown`
// claims no proof at all — it is precisely the shape parse-don't-validate
// wants, because the type still has to be earned downstream. Counting it as
// debt would put pressure on the safe form (decisions.md ADR-2 Context).
//
// WHY AN AST AND NOT A LINE REGEX. The patched class is routinely spread over
// several lines and holds nested parens (`JSON.parse(readFileSync(p, "utf-8"))
// as T`), which a single-line regex recalls at 27%. A guard that misses three
// of four instances is not a ratchet. One syntactic pass per file, no type
// resolution: cross-file type checking costs orders of magnitude more and buys
// nothing here (ADR-2, rejected alternative B).
//
// WHY COUNTS AND NOT LINE PINS. An allowlist of file:line identifiers goes
// stale the moment an unrelated edit shifts a file, and every later PR then
// fails on a pin that moved rather than on a real regression
// (cid:code-generation:allowlist-line-pin-stale). Per-(file, kind) counts keep
// the monotone-decrease property without that failure mode.
//
// SCAN SCOPE. The product source of truth: packages/framework/core/ plus
// scripts/. Generated trees (dist/, the self-install harness copies) are
// projections of core and are excluded; tests/ is outside the scanned roots.
//
// Run:
//   bun tests/unchecked-cast-guard.ts --check           # CI gate (exit 1 on a new cast)
//   bun tests/unchecked-cast-guard.ts --update          # rewrite the allowlist from a fresh scan
//   bun tests/unchecked-cast-guard.ts --check --report <path>   # also write the residual report as JSON

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { unwrapExpression, visitNodes } from "./lib/typescript-source.ts";

// ---------------------------------------------------------------------------
// Constants: the scan scope and the ledger's location. Single source for the
// scanner, the allowlist self-description and the rendered messages.
// ---------------------------------------------------------------------------

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The same roots the call-site guard walks: the product source of truth.
export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;

export const ALLOWLIST_PATH = join(REPO_ROOT, "tests", ".unchecked-cast-allowlist.json");

// ---------------------------------------------------------------------------
// Detection. One syntactic pass per file (no TypeChecker), so the cost is
// additive over the scanned roots.
// ---------------------------------------------------------------------------

// One vocabulary for now. The allowlist shape is per-(file, kind) so a second
// unchecked-read shape can join later without rewriting the ledger.
export type CastKind = "json-parse-as";

export type UncheckedCastMatch = {
  readonly file: string;
  readonly line: number;
  readonly kind: CastKind;
};

// `JSON.parse(...)`: a call whose callee is the `parse` property of the
// `JSON` identifier. Matching the callee by shape rather than by source text
// keeps whitespace and line breaks between the parts irrelevant.
function isJsonParseCall(expression: ts.Expression): boolean {
  if (!ts.isCallExpression(expression)) return false;
  const callee = expression.expression;
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "JSON" &&
    callee.name.text === "parse"
  );
}

// The outermost link of a chain is the whole claim: in `p as A as B` the value
// ends up typed `B`, and the intermediate `A` is a step of that one assertion,
// not a second unproven read (#2112).
function isOutermostAssertion(node: ts.AsExpression): boolean {
  let parent: ts.Node | undefined = node.parent;
  // `(p as A) as B` spells the same chain with parens in between, and `!` can
  // sit between two links too — neither ends the chain.
  while (parent !== undefined && (ts.isParenthesizedExpression(parent) || ts.isNonNullExpression(parent))) {
    parent = parent.parent;
  }
  return parent === undefined || !ts.isAsExpression(parent);
}

export function detectUncheckedCasts(file: string, source: string): UncheckedCastMatch[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: UncheckedCastMatch[] = [];
  visitNodes(sourceFile, (node) => {
    if (!ts.isAsExpression(node)) return;
    // `as unknown` asserts nothing and is the safe form — not debt.
    if (node.type.kind === ts.SyntaxKind.UnknownKeyword) return;
    // One chain, one site: only its outermost link is counted.
    if (!isOutermostAssertion(node)) return;
    // Peel `(…)`, `!`, chained `as` and `satisfies` off the asserted operand so
    // `(JSON.parse(t)) as T` and `JSON.parse(t) as unknown as T` both land.
    if (!isJsonParseCall(unwrapExpression(node.expression))) return;
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    found.push({ file, line, kind: "json-parse-as" });
  });
  // visitNodes walks with a stack, so discovery order is not source order. The
  // census does not care, but a stable order keeps the messages deterministic.
  return found.sort((a, b) => a.line - b.line);
}

// ---------------------------------------------------------------------------
// Census and the allowlist document. `line` is dropped here on purpose: the
// ledger keys by (file, kind) count so an unrelated edit cannot move a pin.
// ---------------------------------------------------------------------------

export type Census = Record<string, Record<string, number>>;

export type AllowlistDoc = {
  readonly description: string;
  readonly direction: "shrink-only";
  readonly total: number;
  readonly sites: Census;
};

export function buildCensus(matches: readonly UncheckedCastMatch[]): Census {
  const census: Census = {};
  for (const match of matches) {
    const perFile = census[match.file] ?? {};
    perFile[match.kind] = (perFile[match.kind] ?? 0) + 1;
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

// An absent entry allows nothing. A file that never held an unchecked cast and
// a file pruned down to zero are the same state, and both reject a new one.
function allowedCount(allowlist: AllowlistDoc, file: string, kind: string): number {
  return allowlist.sites[file]?.[kind] ?? 0;
}

function collectAdded(census: Census, allowlist: AllowlistDoc): string[] {
  const added: string[] = [];
  for (const file of Object.keys(census).sort()) {
    for (const kind of Object.keys(census[file] as Record<string, number>).sort()) {
      const measured = (census[file] as Record<string, number>)[kind] as number;
      const allowed = allowedCount(allowlist, file, kind);
      if (measured > allowed) added.push(`${file}: ${kind} — allowlist ${allowed}, measured ${measured}`);
    }
  }
  return added;
}

function collectRemoved(census: Census, allowlist: AllowlistDoc): string[] {
  const removed: string[] = [];
  for (const file of Object.keys(allowlist.sites).sort()) {
    for (const kind of Object.keys(allowlist.sites[file] as Record<string, number>).sort()) {
      const allowed = allowedCount(allowlist, file, kind);
      const measured = census[file]?.[kind] ?? 0;
      if (measured < allowed) removed.push(`${file}: ${kind} — allowlist ${allowed}, measured ${measured}`);
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
// The committed ledger. Its only read validates it, so a ledger that cannot be
// trusted cannot be silently treated as an empty one.
// ---------------------------------------------------------------------------

export type LoadedAllowlist = { kind: "loaded"; doc: AllowlistDoc } | { kind: "failed"; detail: string };

// The counts ARE the ratchet's arithmetic, so a ledger that cannot supply them
// is unreadable rather than lenient. A fractional, negative or non-numeric entry
// has no comparison against a measured count that preserves the shrink-only
// property, and a `sites` array is rejected explicitly because
// `typeof [] === "object"` would otherwise admit it as an EMPTY ledger — which
// parses, then reports every existing site as newly added. That inverts
// fail-closed into a false regression: the guard would blame the source tree
// for a fault in its own ledger.
function invalidSitesDetail(sites: Record<string, unknown>): string | null {
  for (const [file, perFile] of Object.entries(sites)) {
    if (perFile === null || typeof perFile !== "object" || Array.isArray(perFile)) {
      return `allowlist.sites["${file}"] must be a JSON object of kind -> count`;
    }
    for (const [kind, count] of Object.entries(perFile as Record<string, unknown>)) {
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
        return `allowlist.sites["${file}"]["${kind}"] must be a non-negative integer, got ${String(count)}`;
      }
    }
  }
  return null;
}

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
  if (doc.sites === null || typeof doc.sites !== "object" || Array.isArray(doc.sites)) {
    return { kind: "failed", detail: "allowlist.sites must be a JSON object" };
  }
  const invalidSites = invalidSitesDetail(doc.sites as Record<string, unknown>);
  if (invalidSites !== null) {
    return { kind: "failed", detail: invalidSites };
  }
  return {
    kind: "loaded",
    doc: {
      description: String(doc.description ?? ""),
      direction: "shrink-only",
      total: Number(doc.total ?? 0),
      sites: doc.sites as Census,
    },
  };
}

// Module scope, not inline: a `+`-concatenated value inside a multi-line call
// argument leaves its continuation lines at DA:0 in bun's lcov, which reads as
// uncovered patch lines (cid:code-generation:bun-multiline-arg-da0).
const ALLOWLIST_DESCRIPTION =
  "Reads that claim a domain type for a JSON value taken off disk without proving it (#1980 FR-3a). Shrink-only: adding a cast fails CI. Regenerate with: bun tests/unchecked-cast-guard.ts --update";

export function renderAllowlist(census: Census): string {
  const doc = { description: ALLOWLIST_DESCRIPTION, direction: "shrink-only", total: totalSites(census), sites: census };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

// The residual report printed on every run: the same shape all the way down to
// zero sites, so the walk out of this debt reads as one format.
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
        // vendor/ is third-party code, not an Amadeus read path.
        if (entry.name === "vendor" || entry.name === "node_modules") continue;
        walk(path);
        continue;
      }
      if (SOURCE_EXT_RE.test(entry.name)) files.push(path);
    }
  };
  walk(abs);
  // readdir order is filesystem-dependent; sorting keeps the verdict and its
  // messages identical across machines.
  return files.sort();
}

export function scanRepository(): UncheckedCastMatch[] {
  const matches: UncheckedCastMatch[] = [];
  for (const root of SCAN_ROOTS) {
    for (const path of listSourceFiles(root)) {
      const rel = relative(REPO_ROOT, path);
      matches.push(...detectUncheckedCasts(rel, readFileSync(path, "utf-8")));
    }
  }
  return matches;
}

function fail(code: string, lines: readonly string[]): number {
  console.error(`UNCHECKED CAST GUARD FAILED [${code}]:`);
  for (const line of lines) console.error(`  ${line}`);
  return 1;
}

function renderResidual(report: ResidualReport): void {
  console.log(
    `unchecked-cast guard: ${report.total} unchecked cast(s) remaining across ${Object.keys(report.byFile).length} file(s)`,
  );
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
  // way to set it — `main` only ever measures. The seam exists because the only
  // other way to observe the rejecting arm is to write a violation into product
  // source, which would put a revert obligation on every test run.
  readonly census?: Census;
};

export function runCheck(options: CheckOptions = {}): number {
  const reportPath = options.reportPath;
  // Order is the fail-closed contract: the ledger is read BEFORE the corpus is
  // measured, so no path exists where an unreadable ledger still returns 0.
  const loaded = loadAllowlistOrFail(options.allowlistPath ?? ALLOWLIST_PATH);
  if (loaded.kind === "failed") {
    return fail("ALLOWLIST_UNREADABLE", [
      loaded.detail,
      "Regenerate with: bun tests/unchecked-cast-guard.ts --update",
    ]);
  }
  const census = options.census ?? buildCensus(scanRepository());
  const report = buildResidualReport(census, new Date().toISOString());
  if (reportPath !== undefined) writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  const verdict = diffAgainstAllowlist(census, loaded.doc);
  renderResidual(report);
  if (verdict.kind === "violations") {
    return fail("NEW_CAST", [
      ...verdict.added,
      "",
      "A value read off disk was given a domain type without a proof (#1980 FR-3a).",
      "Parse it through the shared validator, or cast to `unknown` and earn the type downstream.",
      "The allowlist only ratchets down — it cannot be grown to admit a new cast.",
    ]);
  }
  if (verdict.removed.length > 0) {
    console.log(
      `unchecked-cast guard: ${verdict.removed.length} allowlist entr(ies) now over-count — prune with --update:`,
    );
    for (const line of verdict.removed) console.log(`  ${line}`);
  }
  console.log(`unchecked-cast guard: OK — 0 new casts, ${verdict.total} remaining (shrink-only)`);
  return 0;
}

export function runUpdate(path: string = ALLOWLIST_PATH): number {
  const census = buildCensus(scanRepository());
  writeFileSync(path, renderAllowlist(census), "utf-8");
  console.log(`Wrote ${path}: ${totalSites(census)} site(s) across ${Object.keys(census).length} file(s)`);
  return 0;
}

const USAGE =
  "usage: bun tests/unchecked-cast-guard.ts <--check [--report <path>] | --update>\n" +
  "  --check   compare the scanned casts against the committed allowlist (CI gate)\n" +
  "  --update  rewrite tests/.unchecked-cast-allowlist.json from the current scan";

export function main(args: string[]): number {
  try {
    if (args.length === 1 && args[0] === "--check") return runCheck();
    if (args.length === 3 && args[0] === "--check" && args[1] === "--report") {
      return runCheck({ reportPath: args[2] as string });
    }
    if (args.length === 1 && args[0] === "--update") return runUpdate();
    console.error(USAGE);
    return 2;
  } catch (err) {
    console.error(`UNCHECKED CAST GUARD FAILED [UNEXPECTED]: ${(err as Error).message}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
