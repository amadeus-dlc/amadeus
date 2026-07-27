// covers: file:scripts/conformance-report.ts, file:tests/conformance/t188-trace.md
// size: medium
//
// U7 conformance-suite — the trace-table machine check (BR-U7-1 / REL-U7-1/4).
// Reads the REAL tests/conformance/t188-trace.md and asserts the invariants that
// keep "被覆しているつもりの未被覆" from passing silently:
//   (a) exactly 32 rows, numbered 1..32 with no gap/dup (upstream t188 case count)
//   (b) every disposition is one of the 3 literals (parser throws otherwise)
//   (c) n-a rows carry a rationale and reference NO test (target is the em dash)
//   (d) adopted / covered-existing rows reference >= 1 test file, each existing
//   (e) the upstream pin is recorded (BR-U7-8)
//   (f) the coverage recount is machine-derived, not read from the header prose
// The covered-existing *meaning* (does the cited test really check that case) is
// deliberately left to review (BR-U7-3/7) — a machine check cannot judge it.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseTraceTable, parseUpstreamPin, targetTestPaths, traceCoverageOf } from "../../scripts/conformance-report.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRACE = join(REPO_ROOT, "tests", "conformance", "t188-trace.md");

describe("t335 t188 conformance trace — machine check", () => {
  const text = readFileSync(TRACE, "utf-8");
  const rows = parseTraceTable(text);

  test("has exactly 32 rows numbered 1..32 with no gap or duplicate (BR-U7-1)", () => {
    expect(rows.length).toBe(32);
    const nums = rows.map((r) => r.num).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  test("every n-a row carries a rationale and references no test (暗黙成功禁止)", () => {
    for (const r of rows.filter((row) => row.disposition === "n-a")) {
      expect(r.rationale.length).toBeGreaterThan(0);
      expect(targetTestPaths(r)).toHaveLength(0);
    }
  });

  test("every adopted / covered-existing row references >= 1 existing test file (BR-U7-7)", () => {
    for (const r of rows.filter((row) => row.disposition !== "n-a")) {
      const paths = targetTestPaths(r);
      expect(paths.length).toBeGreaterThanOrEqual(1);
      for (const p of paths) {
        expect(existsSync(join(REPO_ROOT, p))).toBe(true);
      }
    }
  });

  test("records the upstream pin (BR-U7-8)", () => {
    expect(parseUpstreamPin(text)).toBe("29a31f78");
  });

  test("coverage is a machine recount of the rows, summing to 32", () => {
    const cov = traceCoverageOf(rows);
    expect(cov.adopted + cov.coveredExisting + cov.nA).toBe(32);
    // The pins below are the recount, not a copy of the header prose — a drifted
    // table changes these and fails loudly.
    expect(cov).toEqual({ adopted: 2, coveredExisting: 22, nA: 8 });
  });
});
