#!/usr/bin/env bun
// attribute-diff.ts — FR-2 acceptance (2), mechanically.
//
// `bun tests/coverage-patch-gate.ts --check` returning 0 does not show the
// remediation was sound: the exit code stays 0 while exemptions widen. What has
// to hold is attribution — every line the ledger newly exempts must be a line of
// some re-pointed entry's declared new target, and every line it stops exempting
// must be a line of a re-pointed entry's old target or of a deleted entry.
// An added line belonging to no entry means the remediation quietly widened a
// waiver, and that is the failure this script exists to catch.
//
// Run from the repository root:
//   bun .../evidence/exempt-lines.ts <base-rev> > /tmp/before.txt
//   bun .../evidence/exempt-lines.ts            > /tmp/after.txt
//   bun .../evidence/attribute-diff.ts /tmp/before.txt /tmp/after.txt
// Exits non-zero if any line on either side is unattributed.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Range {
  start: number;
  end: number;
}

interface RemediationRow {
  id: string;
  file: string;
  action: "repoint" | "delete";
  oldRange: Range;
  newRange?: Range;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error("Usage: attribute-diff.ts <before-lines> <after-lines>");
  process.exit(2);
}

const rows: RemediationRow[] = JSON.parse(readFileSync(join(HERE, "remediation.json"), "utf8"));
const readSet = (path: string): Set<string> =>
  new Set(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => line.length > 0),
  );

const before = readSet(beforePath);
const after = readSet(afterPath);
const added = [...after].filter((line) => !before.has(line)).sort();
const removed = [...before].filter((line) => !after.has(line)).sort();

const expand = (file: string, range: Range): string[] => {
  const out: string[] = [];
  for (let line = range.start; line <= range.end; line += 1) out.push(`${file}:${line}`);
  return out;
};

const claims = (which: "added" | "removed"): Map<string, string> => {
  const owner = new Map<string, string>();
  for (const row of rows) {
    const range = which === "added" ? row.newRange : row.oldRange;
    if (range === undefined) continue;
    for (const line of expand(row.file, range)) owner.set(line, row.id);
  }
  return owner;
};

const addedOwners = claims("added");
const removedOwners = claims("removed");
const unattributedAdded = added.filter((line) => !addedOwners.has(line));
const unattributedRemoved = removed.filter((line) => !removedOwners.has(line));

console.log(`exempt lines before: ${before.size}`);
console.log(`exempt lines after:  ${after.size}`);
console.log(`added:   ${added.length}`);
for (const line of added) console.log(`  + ${line} <- ${addedOwners.get(line) ?? "UNATTRIBUTED"}`);
console.log(`removed: ${removed.length}`);
for (const line of removed) console.log(`  - ${line} <- ${removedOwners.get(line) ?? "UNATTRIBUTED"}`);
console.log(`unattributed added:   ${unattributedAdded.length}`);
console.log(`unattributed removed: ${unattributedRemoved.length}`);

if (unattributedAdded.length > 0 || unattributedRemoved.length > 0) {
  console.error("FR-2 acceptance (2) FAILED: the line diff is not fully attributable to the remediation ledger");
  process.exit(1);
}
console.log("FR-2 acceptance (2) OK: every changed line belongs to a recorded remediation");
