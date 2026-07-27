// scripts/conformance-report.ts — FR-10: the ConformanceReportSection of the
// upstream-sync report (U7 conformance-suite).
//
// WHAT. The upstream-sync report (docs/research/upstream-sync/reports/*.md,
// authored per the amadeus-upstream-sync skill's artifact-contracts) judges
// follow-state from a file diff. FR-10 adds a SECOND ground: the result of the
// t188 conformance suite plus the trace-table coverage. This module is that
// second ground, as pure functions.
//
// WHY PURE / FAIL-CLOSED. The section's verdict MUST be DERIVED from the suite's
// real exit code and a machine recount of the trace table — never a hardcoded
// status (verification-theatre Forbidden / BR-U7-5 / REL-U7-2 / SEC-U7-2). So:
//   - suiteResultFromExitCode has NO default-pass branch: an exit code that is
//     not a finite integer is a report-generation ERROR (thrown), not a silent
//     pass. 0 → green, any other finite code → red.
//   - traceCoverage is recomputed from the parsed rows, not read from the
//     header's stated counts (ledger-count-mechanical-recalc).
// The falling proof (a red exit code renders "red") lives in the unit test: the
// exit code is the runtime-consumed input, so feeding a non-0 code exercises the
// red branch (inject-runtime-consumed-lines).
//
// The trace-table parser is shared with the machine-check integration test
// (tests/integration/t335-*) so there is ONE row parser, not two.

// ---------------------------------------------------------------------------
// Trace-table model + parser (the single canonical parser)
// ---------------------------------------------------------------------------

export type Disposition = "adopted" | "covered-existing" | "n-a";
export const DISPOSITIONS: readonly Disposition[] = ["adopted", "covered-existing", "n-a"];

export function isDisposition(value: string): value is Disposition {
  return (DISPOSITIONS as readonly string[]).includes(value);
}

export interface TraceRow {
  readonly num: number;
  readonly upstreamCase: string;
  readonly disposition: Disposition;
  readonly target: string;
  readonly rationale: string;
}

// A data row is a table row whose first cell is a bare integer (the `| N |`
// prefix). The header row (`| # | upstream case | ... |`) and any prose lines
// are skipped by that test. Cells are split on the unescaped pipe and trimmed.
export function parseTraceTable(text: string): readonly TraceRow[] {
  const rows: TraceRow[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = splitRow(trimmed);
    if (cells.length < 5) continue;
    const num = Number(cells[0]);
    if (!Number.isInteger(num) || String(num) !== cells[0]) continue; // header / prose
    const disposition = cells[2];
    if (!isDisposition(disposition)) {
      throw new Error(`trace row ${cells[0]}: disposition "${disposition}" is not one of ${DISPOSITIONS.join(" | ")}`);
    }
    rows.push({ num, upstreamCase: cells[1], disposition, target: cells[3], rationale: cells[4] });
  }
  return rows;
}

// Split a `| a | b | c |` row into [a, b, c] — drop the empty leading/trailing
// fields produced by the border pipes, trim each cell.
function splitRow(rowLine: string): readonly string[] {
  const parts = rowLine.split("|").map((c) => c.trim());
  // The leading and trailing pipe make parts[0] and parts[last] empty.
  return parts.slice(1, parts.length - 1);
}

// The test-file paths a target cell references (there may be several, joined by
// `<br>`). n-a rows have the em dash placeholder and yield none.
export function targetTestPaths(row: TraceRow): readonly string[] {
  return Array.from(row.target.matchAll(/tests\/[A-Za-z0-9/_.-]+\.test\.ts/g)).map((m) => m[0]);
}

// ---------------------------------------------------------------------------
// Coverage recount (machine, not the header's stated numbers)
// ---------------------------------------------------------------------------

export interface TraceCoverage {
  readonly adopted: number;
  readonly coveredExisting: number;
  readonly nA: number;
}

export function traceCoverageOf(rows: readonly TraceRow[]): TraceCoverage {
  let adopted = 0;
  let coveredExisting = 0;
  let nA = 0;
  for (const r of rows) {
    if (r.disposition === "adopted") adopted += 1;
    else if (r.disposition === "covered-existing") coveredExisting += 1;
    else nA += 1;
  }
  return { adopted, coveredExisting, nA };
}

export function parseTraceCoverage(traceTableText: string): TraceCoverage {
  return traceCoverageOf(parseTraceTable(traceTableText));
}

// The `upstream-pin:` header line value (BR-U7-8 — the section records which
// upstream commit the suite is pinned to).
export function parseUpstreamPin(traceTableText: string): string {
  const m = traceTableText.match(/^upstream-pin:\s*(\S+)/m);
  if (m === null) throw new Error("trace table is missing its `upstream-pin:` header");
  return m[1];
}

// ---------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------

export type SuiteResult = "green" | "red";

export interface ConformanceReportSection {
  readonly suiteResult: SuiteResult;
  readonly traceCoverage: TraceCoverage;
  readonly measuredAt: string;
  readonly upstreamPin: string;
}

// Fail-closed: 0 → green, any other finite integer → red. A non-integer /
// non-finite code is a report-generation error, NOT a silent pass. There is no
// path that yields green without a real exit code of 0.
export function suiteResultFromExitCode(exitCode: number): SuiteResult {
  if (!Number.isFinite(exitCode) || !Number.isInteger(exitCode)) {
    throw new Error(`conformance suite exit code must be a finite integer, got ${String(exitCode)}`);
  }
  return exitCode === 0 ? "green" : "red";
}

export interface BuildInput {
  readonly suiteExitCode: number;
  readonly traceTableText: string;
  // ISO 8601 timestamp + the Amadeus commit SHA the suite ran against
  // (measurement-ref-in-artifacts).
  readonly measuredAt: string;
}

export function buildConformanceReportSection(input: BuildInput): ConformanceReportSection {
  return {
    suiteResult: suiteResultFromExitCode(input.suiteExitCode),
    traceCoverage: parseTraceCoverage(input.traceTableText),
    measuredAt: input.measuredAt,
    upstreamPin: parseUpstreamPin(input.traceTableText),
  };
}

// Render the `## Conformance` section body for the upstream-sync report. The
// verdict word is the derived suiteResult — a red suite renders "red".
export function renderConformanceReportSection(section: ConformanceReportSection): string {
  const { suiteResult, traceCoverage: tc, measuredAt, upstreamPin } = section;
  const total = tc.adopted + tc.coveredExisting + tc.nA;
  return [
    "## Conformance",
    "",
    `- suite result: **${suiteResult}** (derived from the t188 conformance suite exit code)`,
    `- upstream pin: \`${upstreamPin}\``,
    `- trace coverage: ${total} cases = ${tc.adopted} adopted / ${tc.coveredExisting} covered-existing / ${tc.nA} n-a`,
    `- measured at: ${measuredAt}`,
    "",
    "Follow-state is judged from BOTH the file diff and this conformance result;",
    "a **red** suite result blocks an `APPLIED` follow-state regardless of the diff.",
    "",
  ].join("\n");
}
