#!/usr/bin/env bun
// exempt-lines.ts — FR-2 acceptance (2). Emits the set of source lines the
// ledger currently exempts, one `file:line` per output line, sorted.
//
// Run it at two revisions and diff the two outputs: every added line must be a
// line of some re-pointed entry's new target, and every removed line a line of
// a re-pointed entry's old target or of a deleted entry. `attribute-diff.ts`
// does that attribution mechanically.
//
// The optional revision selects the LEDGER only; sources always come from the
// worktree. Both sides must read the same sources, or a line shift caused by an
// unrelated edit in this branch shows up as an exemption that moved — which is
// exactly the confusion the attribution is supposed to resolve.
//
// Run from the repository root:
//   bun .../evidence/exempt-lines.ts            # the ledger as it stands
//   bun .../evidence/exempt-lines.ts <rev>      # the ledger at <rev>

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllowlist, resolveSemanticSelector } from "../../../../../../../../../tests/coverage-patch-gate.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "..", "..", "..", "..");
const LEDGER = "tests/.coverage-patch-allowlist.json";
const rev = process.argv[2];

function readLedger(): string {
  if (rev === undefined) return readFileSync(join(REPO_ROOT, LEDGER), "utf8");
  const show = spawnSync("git", ["show", `${rev}:${LEDGER}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (show.status !== 0) throw new Error(`git show ${rev}:${LEDGER} failed: ${show.stderr}`);
  return show.stdout;
}

const entries = parseAllowlist(readLedger());
const sources = new Map<string, string>();
const lines = new Set<string>();
for (const entry of entries) {
  if (!sources.has(entry.file)) sources.set(entry.file, readFileSync(join(REPO_ROOT, entry.file), "utf8"));
  const range = resolveSemanticSelector(entry.file, sources.get(entry.file) as string, entry.selector);
  for (let line = range.start; line <= range.end; line += 1) lines.add(`${entry.file}:${line}`);
}
console.log([...lines].sort().join("\n"));
