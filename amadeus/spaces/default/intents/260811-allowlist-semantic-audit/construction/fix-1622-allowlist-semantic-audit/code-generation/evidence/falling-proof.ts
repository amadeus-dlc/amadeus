#!/usr/bin/env bun
// falling-proof.ts — FR-4 / FR-6, against the real ledger.
//
// A new guard is only finished once both sides are measured: that a wrong
// declaration turns it red, and that the repository's own data stays green
// (cid:code-generation:corpus-sweep-for-new-guards). This runs both without
// writing to the ledger — the mutations are in memory and the last line proves
// the file on disk is untouched.
//
// Run from the repository root:
//   bun .../evidence/falling-proof.ts

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type AllowlistEntry,
  findSyntaxClassMismatches,
  parseAllowlist,
  renderSyntaxClassMismatches,
} from "../../../../../../../../../tests/coverage-patch-gate.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "..", "..", "..", "..");
const LEDGER = join(REPO_ROOT, "tests", ".coverage-patch-allowlist.json");
const raw = readFileSync(LEDGER, "utf8");

const sources = new Map<string, string>();
function load(entries: AllowlistEntry[]): AllowlistEntry[] {
  for (const entry of entries) {
    if (!sources.has(entry.file)) sources.set(entry.file, readFileSync(join(REPO_ROOT, entry.file), "utf8"));
  }
  return entries;
}

console.log("--- (a) current ledger, untouched ---");
const clean = load(parseAllowlist(raw));
console.log(`declared entries: ${clean.filter((e) => e.selector.class !== undefined).length}`);
console.log(`mismatches: ${findSyntaxClassMismatches(clean, sources).length}`);

console.log("\n--- (b) one declaration flipped to a class the code is not ---");
const flipped = load(parseAllowlist(raw));
const target = flipped.find((e) => e.selector.class === "type-only") as AllowlistEntry;
console.log(`flipping ${target.file}#${target.selector.function}: type-only -> catch-arm`);
target.selector.class = "catch-arm";
const found = findSyntaxClassMismatches(flipped, sources);
console.log(`mismatches: ${found.length}`);
console.log(renderSyntaxClassMismatches(found));

console.log("\n--- (c) one declaration set to a value outside the vocabulary ---");
const bogus = JSON.parse(raw);
const index = bogus.findIndex((e: AllowlistEntry) => e.selector.class !== undefined);
bogus[index].selector.class = "spawn-only";
const scratch = join(mkdtempSync(join(tmpdir(), "falling-proof-")), "allowlist.json");
writeFileSync(scratch, JSON.stringify(bogus, null, 2));
try {
  parseAllowlist(readFileSync(scratch, "utf8"));
  console.log("NO THROW — the vocabulary is not fail-closed");
} catch (error) {
  console.log(`threw: ${(error as Error).message.slice(0, 160)}…`);
}

console.log("\n--- ledger file unchanged by this experiment ---");
console.log(`byte-identical: ${readFileSync(LEDGER, "utf8") === raw}`);
