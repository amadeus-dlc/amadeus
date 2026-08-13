#!/usr/bin/env bun
// classify-ledger.ts — FR-1 / FR-7. Re-runnable predicate behind every count in
// fr1-classification.md.
//
// Resolves every entry of tests/.coverage-patch-allowlist.json through the AST,
// grades it with the audit module's three-valued verdict, and reports the AST
// class each range actually is. It also re-measures the zero-token defect the
// fix in tests/allowlist-semantic-audit.ts closed, by walking each resolved
// range a second time the way the pre-fix code did (`ts.forEachChild`, which
// never reaches keywords or punctuation).
//
// Run from the repository root:
//   bun amadeus/spaces/default/intents/260811-allowlist-semantic-audit/construction/fix-1622-allowlist-semantic-audit/code-generation/evidence/classify-ledger.ts
//   ... --json   # machine-readable, for diffing two revisions

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { auditEntry } from "../../../../../../../../../tests/allowlist-semantic-audit.ts";
import {
  classifyRange,
  parseAllowlist,
  resolveSemanticSelector,
} from "../../../../../../../../../tests/coverage-patch-gate.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "..", "..", "..", "..");
const LEDGER = join(REPO_ROOT, "tests", ".coverage-patch-allowlist.json");

/** The pre-fix walk, kept here only to keep the 39-range measurement re-runnable. */
function preFixTokenCount(file: string, source: string, range: { start: number; end: number }): number {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let count = 0;
  const visit = (node: ts.Node): void => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    if (end < range.start || start > range.end) return;
    if (node.getChildCount(sourceFile) === 0) {
      if (start >= range.start && start <= range.end) count += 1;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return count;
}

const entries = parseAllowlist(readFileSync(LEDGER, "utf8"));
const sources = new Map<string, string>();
for (const entry of entries) {
  if (!sources.has(entry.file)) sources.set(entry.file, readFileSync(join(REPO_ROOT, entry.file), "utf8"));
}

const rows = entries.map((entry) => {
  const source = sources.get(entry.file) as string;
  const resolved = resolveSemanticSelector(entry.file, source, entry.selector);
  return {
    file: entry.file,
    function: entry.selector.function,
    declaredClass: entry.selector.class ?? null,
    start: resolved.start,
    end: resolved.end,
    actualClass: classifyRange(entry.file, source, resolved),
    verdict: auditEntry(entry, source).verdict,
    preFixTokens: preFixTokenCount(entry.file, source, resolved),
  };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const tally = (key: "verdict" | "actualClass"): string =>
    [...rows.reduce((m, r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1), new Map<string, number>())]
      .sort()
      .map(([k, v]) => `  ${k} ${v}`)
      .join("\n");
  const zeroToken = rows.filter((r) => r.preFixTokens === 0);
  const declared = rows.filter((r) => r.declaredClass !== null);
  console.log(`entries: ${rows.length}`);
  console.log(`verdicts (FR-1):\n${tally("verdict")}`);
  console.log(`AST classes:\n${tally("actualClass")}`);
  console.log(`ranges with zero tokens under the pre-fix walk: ${zeroToken.length}`);
  console.log(`  of those, now classified: ${zeroToken.filter((r) => r.actualClass !== "unmeasurable-other").length}`);
  console.log(`entries declaring selector.class: ${declared.length}`);
  console.log(`  declaration matches the AST: ${declared.filter((r) => r.declaredClass === r.actualClass).length}`);
}
