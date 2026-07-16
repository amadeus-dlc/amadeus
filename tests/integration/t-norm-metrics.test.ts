// covers: subcommand:amadeus-norm-metrics:rank
//
// The MEDIUM (cli spawn) layer for the norm-metrics tool. It really spawns the
// shipped tool (dist/claude/.claude/tools/amadeus-norm-metrics.ts) under bun,
// so the coverage registry's `subcommand:amadeus-norm-metrics:rank` unit is
// verified at its `cli` minMechanism — the argv dispatch surface only routes
// correctly when the literal shipped binary runs. That spawn makes this a
// none->cli file, pinned in gen-coverage-registry.test.ts's EXPECTED_NONE_TO_CLI.
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
});
