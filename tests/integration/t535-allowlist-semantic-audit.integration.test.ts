// covers: file:tests/allowlist-semantic-audit.ts
//
// t535 — the semantic audit run over the real ledger (#1622).
//
// The unit sibling t534 pins the two pure halves against hand-written sources.
// This file does the thing the audit exists for: it reads
// tests/.coverage-patch-allowlist.json and every source it points at, resolves
// all selectors through the AST, and grades each reason against the code it
// actually lands on.
//
// The load-bearing assertion is the population identity. Every entry must land
// in exactly one of the three buckets, and the buckets must sum to the ledger's
// own length — otherwise the sweep is silently dropping entries and any count
// derived from it is a claim rather than a measurement.
import { describe, expect, test } from "bun:test";
import { auditAllowlist, loadAllowlistAudit } from "../allowlist-semantic-audit.ts";
import { parseAllowlist } from "../coverage-patch-gate.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = join(REPO_ROOT, "tests", ".coverage-patch-allowlist.json");

describe("t535 ledger sweep", () => {
  const entries = parseAllowlist(readFileSync(LEDGER, "utf8"));
  const audits = loadAllowlistAudit(REPO_ROOT, LEDGER);

  test("every ledger entry is audited exactly once", () => {
    expect(audits.length).toBe(entries.length);
  });

  test("the three verdicts partition the ledger", () => {
    const agree = audits.filter((a) => a.verdict === "一致").length;
    const drifted = audits.filter((a) => a.verdict === "転位").length;
    const undecidable = audits.filter((a) => a.verdict === "判定不能").length;
    expect(agree + drifted + undecidable).toBe(entries.length);
  });

  test("every selector resolves — an unresolvable ledger is a hard failure, not an undecidable one", () => {
    // auditAllowlist throws on an unresolvable selector; reaching here proves
    // every entry resolved. The range itself must be a real, ordered line span.
    for (const audit of audits) {
      expect(audit.resolved.start).toBeGreaterThan(0);
      expect(audit.resolved.end).toBeGreaterThanOrEqual(audit.resolved.start);
    }
  });

  test("auditAllowlist and loadAllowlistAudit agree", () => {
    const sources = new Map<string, string>();
    for (const entry of entries) {
      if (!sources.has(entry.file)) sources.set(entry.file, readFileSync(join(REPO_ROOT, entry.file), "utf8"));
    }
    expect(auditAllowlist(entries, sources).map((a) => a.verdict)).toEqual(audits.map((a) => a.verdict));
  });
});
