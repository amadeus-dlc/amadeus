// covers: file:scripts/conformance-report.ts
// size: small
//
// U7 conformance-suite — the ConformanceReportSection pure module (FR-10 /
// BR-U7-5 / REL-U7-2 / SEC-U7-2). The report's conformance verdict must be
// DERIVED from the suite exit code and a machine recount of the trace table,
// never hardcoded (verification-theatre Forbidden).
//
// FALLING PROOF (both-side). suiteResultFromExitCode / buildConformanceReportSection
// are exercised on a RED exit code (non-0) and a GREEN one: a red exit code must
// render "red". The exit code is the runtime-consumed input, so the non-0 case
// drives the red branch (inject-runtime-consumed-lines) — there is no path that
// yields green without a real 0.

import { describe, expect, test } from "bun:test";

import {
  buildConformanceReportSection,
  parseTraceCoverage,
  parseTraceTable,
  parseUpstreamPin,
  renderConformanceReportSection,
  suiteResultFromExitCode,
  targetTestPaths,
  traceCoverageOf,
} from "../../scripts/conformance-report.ts";

// A minimal in-memory trace fixture — 1 of each disposition. Kept string-only so
// this stays a pure unit (no fs). The real 32-row table is machine-checked in
// tests/integration/t335.
const FIXTURE = [
  "# t188 conformance trace",
  "upstream-pin: deadbeef",
  "",
  "| # | upstream case (verbatim) | disposition | target | rationale |",
  "|---|---|---|---|---|",
  '| 1 | case one | adopted | `tests/integration/tX.test.ts` :: "t" | |',
  '| 2 | case two | covered-existing | `tests/unit/tY.test.ts` :: "t" <br> `tests/unit/tZ.test.ts` :: "t" | |',
  "| 3 | case three | n-a | — | no corresponding surface in Amadeus |",
].join("\n");

describe("t336 suiteResultFromExitCode — fail-closed exit-code mapping", () => {
  test("0 → green", () => {
    expect(suiteResultFromExitCode(0)).toBe("green");
  });

  test("a non-0 code → red (falling proof: red is derived, not hardcoded)", () => {
    expect(suiteResultFromExitCode(1)).toBe("red");
    expect(suiteResultFromExitCode(137)).toBe("red");
  });

  test("a non-integer / non-finite code is a report error, never a silent pass", () => {
    expect(() => suiteResultFromExitCode(Number.NaN)).toThrow();
    expect(() => suiteResultFromExitCode(1.5)).toThrow();
    expect(() => suiteResultFromExitCode(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("t336 trace parser", () => {
  test("parses the three dispositions", () => {
    const rows = parseTraceTable(FIXTURE);
    expect(rows.map((r) => r.disposition)).toEqual(["adopted", "covered-existing", "n-a"]);
  });

  test("targetTestPaths extracts each test path; n-a yields none", () => {
    const rows = parseTraceTable(FIXTURE);
    expect(targetTestPaths(rows[0])).toEqual(["tests/integration/tX.test.ts"]);
    expect(targetTestPaths(rows[1])).toEqual(["tests/unit/tY.test.ts", "tests/unit/tZ.test.ts"]);
    expect(targetTestPaths(rows[2])).toEqual([]);
  });

  test("an unknown disposition throws (not silently dropped)", () => {
    const bad = FIXTURE.replace("| adopted |", "| maybe |");
    expect(() => parseTraceTable(bad)).toThrow(/maybe/);
  });

  test("traceCoverage is a machine recount", () => {
    expect(traceCoverageOf(parseTraceTable(FIXTURE))).toEqual({ adopted: 1, coveredExisting: 1, nA: 1 });
    expect(parseTraceCoverage(FIXTURE)).toEqual({ adopted: 1, coveredExisting: 1, nA: 1 });
  });

  test("parseUpstreamPin reads the header; a missing pin throws", () => {
    expect(parseUpstreamPin(FIXTURE)).toBe("deadbeef");
    expect(() => parseUpstreamPin("no header here")).toThrow(/upstream-pin/);
  });
});

describe("t336 buildConformanceReportSection + render", () => {
  test("a green suite renders a green section with the recounted coverage", () => {
    const section = buildConformanceReportSection({
      suiteExitCode: 0,
      traceTableText: FIXTURE,
      measuredAt: "2026-07-27T00:00:00Z @ abc1234",
    });
    expect(section.suiteResult).toBe("green");
    expect(section.traceCoverage).toEqual({ adopted: 1, coveredExisting: 1, nA: 1 });
    expect(section.upstreamPin).toBe("deadbeef");
    const md = renderConformanceReportSection(section);
    expect(md).toContain("## Conformance");
    expect(md).toContain("suite result: **green**");
    expect(md).toContain("3 cases = 1 adopted / 1 covered-existing / 1 n-a");
    expect(md).toContain("2026-07-27T00:00:00Z @ abc1234");
  });

  test("a red suite renders a red section (falling proof end-to-end)", () => {
    const section = buildConformanceReportSection({
      suiteExitCode: 1,
      traceTableText: FIXTURE,
      measuredAt: "2026-07-27T00:00:00Z @ abc1234",
    });
    expect(section.suiteResult).toBe("red");
    const md = renderConformanceReportSection(section);
    expect(md).toContain("suite result: **red**");
    expect(md).not.toContain("suite result: **green**");
  });
});
