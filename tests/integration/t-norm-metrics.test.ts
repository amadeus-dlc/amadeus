// covers: subcommand:amadeus-norm-metrics:rank, subcommand:amadeus-norm-metrics:distill-candidates
//
// The MEDIUM (cli spawn) layer for the norm-metrics tool. It really spawns the
// shipped tool (dist/claude/.claude/tools/amadeus-norm-metrics.ts) under bun,
// so the coverage registry's `subcommand:amadeus-norm-metrics:{rank,
// distill-candidates}` units are verified at their `cli` minMechanism — the argv
// dispatch surface only routes correctly when the literal shipped binary runs.
// That spawn makes this a none->cli file, pinned in
// gen-coverage-registry.test.ts's EXPECTED_NONE_TO_CLI.
//
// The pure/in-process branch coverage lives in the SMALL sibling
// tests/unit/t-norm-metrics.test.ts (bun --coverage does not measure this
// spawned subprocess, so this file is deliberately behavioural, not a coverage
// carrier).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { AMADEUS_SRC, REPO_ROOT } from "../harness/fixtures.ts";

const BUN = process.execPath;
const TOOL = join(AMADEUS_SRC, "tools", "amadeus-norm-metrics.ts");
const REAL_MEMORY = join(REPO_ROOT, "amadeus", "spaces", "default", "memory");
// A corpus fixture that cites requirements-analysis:escalation-canonical 3 times
// (2 in a record file + 1 tail form in an audit shard) so a rank run under this
// root counts exactly 3 more citations for that norm than a corpus-less run.
const CORPUS_FIXTURE_ROOT = join(REPO_ROOT, "tests", "fixtures", "norm-corpus");
// A root with no amadeus/spaces subtree -> the corpus is empty (memory-only).
const EMPTY_CORPUS_ROOT = join(REPO_ROOT, "tests", "fixtures");
const ESCALATION_CID = "requirements-analysis:escalation-canonical";

function citesFor(stdout: string, cid: string): number {
  const parsed = JSON.parse(stdout.trim());
  for (const row of parsed.rows) if (row.cid === cid) return row.cites;
  return -1;
}

describe("amadeus-norm-metrics rank (cli spawn boundary)", () => {
  test("rank --json against the shipped memory layer exits 0 with valid JSON", () => {
    const r = spawnSync(BUN, [TOOL, "rank", "--json", "--top", "5"], {
      encoding: "utf-8",
      env: { ...process.env, AMADEUS_RULES_DIR: REAL_MEMORY },
    });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout.trim());
    expect(Array.isArray(parsed.rows)).toBe(true);
    expect(parsed.rows.length).toBeLessThanOrEqual(5);
    expect(typeof parsed.uncounted.org).toBe("number");
  });

  test("rank (table form) exits 0 and prints the loud NOT-COLLECTED lines", () => {
    const r = spawnSync(BUN, [TOOL, "rank", "--top", "3"], {
      encoding: "utf-8",
      env: { ...process.env, AMADEUS_RULES_DIR: REAL_MEMORY },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("GoA-variance, violation-recurrence: NOT COLLECTED");
    expect(r.stdout).toContain("E-code citations: NOT AGGREGATED");
  });

  test("unknown verb spawn exits 2", () => {
    const r = spawnSync(BUN, [TOOL, "bogus"], { encoding: "utf-8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("Unknown verb");
  });

  test("citation corpus (record + audit) is scanned end-to-end (AC-1b)", () => {
    const base = spawnSync(BUN, [TOOL, "rank", "--json"], {
      encoding: "utf-8",
      env: { ...process.env, AMADEUS_RULES_DIR: REAL_MEMORY, AMADEUS_CORPUS_ROOT: EMPTY_CORPUS_ROOT },
    });
    const withCorpus = spawnSync(BUN, [TOOL, "rank", "--json"], {
      encoding: "utf-8",
      env: { ...process.env, AMADEUS_RULES_DIR: REAL_MEMORY, AMADEUS_CORPUS_ROOT: CORPUS_FIXTURE_ROOT },
    });
    expect(base.status).toBe(0);
    expect(withCorpus.status).toBe(0);
    const before = citesFor(base.stdout, ESCALATION_CID);
    const after = citesFor(withCorpus.stdout, ESCALATION_CID);
    expect(before).toBeGreaterThanOrEqual(1);
    // 2 record-file citations + 1 audit-shard tail citation = +3.
    expect(after - before).toBe(3);
  });
});

describe("amadeus-norm-metrics distill-candidates (cli spawn boundary)", () => {
  test("distill-candidates --json exits 0 with the expected report shape", () => {
    const r = spawnSync(BUN, [TOOL, "distill-candidates", "--json", "--k", "3"], {
      encoding: "utf-8",
      env: { ...process.env, AMADEUS_RULES_DIR: REAL_MEMORY, AMADEUS_CORPUS_ROOT: EMPTY_CORPUS_ROOT },
    });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout.trim());
    expect(Array.isArray(parsed.zeroCite)).toBe(true);
    expect(Array.isArray(parsed.highChurn)).toBe(true);
    expect(typeof parsed.exempt.count).toBe("number");
    // Fire-extinguisher exemption is non-empty against the real memory layer
    // (org/team/project carry Forbidden + Mandated sections).
    expect(parsed.exempt.count).toBeGreaterThan(0);
  });

  test("distill-candidates (table form) lists the exempt section loudly (AC-2b)", () => {
    const r = spawnSync(BUN, [TOOL, "distill-candidates"], {
      encoding: "utf-8",
      env: { ...process.env, AMADEUS_RULES_DIR: REAL_MEMORY, AMADEUS_CORPUS_ROOT: EMPTY_CORPUS_ROOT },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("zero-cite candidates (ZERO_CITE_THRESHOLD_DAYS=14)");
    expect(r.stdout).toContain("high-churn candidates (CHURN_THRESHOLD=2)");
    expect(r.stdout).toContain("forbidden/mandated exempt (never candidates)");
  });
});
