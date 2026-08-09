// scope-sizing sensor — the L1 row of #2683 (#2692).
//
// #2683 placed three sizing signals on a ladder: depth-budget (L3) measures a
// written requirements.md, question-budget (L2) measures a written questions
// file, and L1 asks the question earlier — is the scope this intent just drew
// the size its depth was chosen for? The two lower rows can only speak after
// the volume exists. This one speaks at the scope-definition gate, where the
// capability enumeration is fresh and the depth is already fixed.
//
// MEASUREMENT ONLY, BY RULING. This sensor carries no ceiling and emits no
// finding: it always passes, and its whole output is the count. #2692's ruling
// is explicit that the depth × capability band cannot be set yet — over the
// committed corpus the Standard row has 56 records (3..16, median 6) while
// Minimal has one and Comprehensive none, so any depth-keyed threshold would
// sit outside the observed range for two of the three levels, which
// project.md's c1-threshold-inside-observed-range forbids. The band is a later
// ruling on top of the distribution this sensor accumulates.
//
// WHAT IS COUNTED, AND WHY IT IGNORES COLUMN NAMES. intent-backlog.md holds the
// prioritized proto-Unit list scope-definition Step 3 requires. Its rows are
// the capability enumeration; its HEADER is not a contract — over the 58
// committed backlogs carrying a table the header takes 55 distinct shapes
// (`| # | Proto-Unit | MoSCoW | 依存 | 概要 |`,
// `| Priority | ID | Capability | Value | Dependency | Confidence hypothesis |`,
// `| 順位 | ID | Proto-Unit | MoSCoW | BV | TC | RR | Size | WSJF | 依存 |`, …).
// A predicate naming a column — "count the Must rows" — fails on about half the
// corpus. So the measurement is the row count of the largest table, MoSCoW
// breakdown not attempted, and no header format is imposed on the stage: the
// ruling declines to write a backlog schema on the strength of a predicate that
// already covers 56 of 58.
//
// WHY A STRUCTURAL COUNT AND NOT A PROSE PROXY. Measured over the same corpus
// against the final FR count: byte and bullet proxies correlate r = 0.22..0.43,
// the backlog's largest-table row count correlates r = 0.636 (and r = 0.531
// against the eventual Unit count). The sibling depth-budget sensor's own
// comment records the other end of the same lesson — requirements.md bytes are
// uncorrelated (r = +0.084) with implementation size.
//
// Self-contained (no amadeus-lib import): a per-sensor script is spawned by the
// dispatcher and must not drag the library's module graph into that process.
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** The two scope-definition outputs this sensor reads. `intent-backlog.md` is
 *  the primary — the capability enumeration itself; `scope-document.md` is the
 *  fallback for the records whose backlog carries no table. Both are matched by
 *  the manifest glob so the measurement lands whichever of the two the stage
 *  writes last, and both resolve the count from the same directory, so the
 *  answer does not depend on which file triggered the fire. */
export const BACKLOG_BASENAME = "intent-backlog.md";
export const SCOPE_DOCUMENT_BASENAME = "scope-document.md";
export const SIZING_BASENAMES = [BACKLOG_BASENAME, SCOPE_DOCUMENT_BASENAME] as const;

/** The canonical depth levels, mirrored from amadeus-directive.ts. Duplicated
 *  rather than imported to keep this spawned script self-contained. */
const DEPTH_LEVELS = ["Minimal", "Standard", "Comprehensive"] as const;

/** A Markdown table's separator row — the line that makes the row above it a
 *  header rather than a body row. */
const TABLE_SEPARATOR = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** A TOP-LEVEL list item: `1. …`, `- …`, `* …`, written flush to the margin.
 *  Indented bullets are a capability's own detail, not another capability —
 *  admitting them would inflate the fallback count and corrupt the very
 *  distribution this sensor accumulates. Measured over the corpus: no committed
 *  record's count changes either way, so this is the safe reading of a case the
 *  corpus has not yet exercised. */
const LIST_ITEM = /^(\d+\.|[-*])\s+/;

/** The `## In` heading that opens a scope document's in-scope section. */
const IN_SECTION_HEADING = /^##\s+In\b/i;
const H2_HEADING = /^##\s+/;

export interface TableScan {
  /** Body rows of the largest table — header and separator excluded. */
  rows: number;
  /** That table's first line, so a reader can see which table was counted. */
  header: string;
}

/** The largest Markdown table in a body, measured by its body-row count.
 *
 *  A table is a run of consecutive lines opening with `|`. The run's first line
 *  is its header; when the second line is a separator it is excluded too. A run
 *  written WITHOUT a separator still counts its remaining lines rather than
 *  reading as zero — some records write header-and-body directly, and a
 *  separator-required predicate would report those intents as capability-less.
 */
export function largestTableRows(body: string): TableScan {
  const lines = body.split("\n").map((line) => line.trim());
  let best: TableScan = { rows: 0, header: "" };
  let i = 0;
  while (i < lines.length) {
    if (!(lines[i] as string).startsWith("|")) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < lines.length && (lines[i] as string).startsWith("|")) i += 1;
    const block = lines.slice(start, i);
    const separated = block.length > 1 && TABLE_SEPARATOR.test(block[1] as string);
    const rows = separated ? block.length - 2 : block.length - 1;
    if (rows > best.rows) best = { rows, header: block[0] as string };
  }
  return best;
}

/** Top-level list items under a scope document's `## In` heading. The last
 *  fallback: a record that enumerated its scope as prose bullets rather than a
 *  table is still counted rather than reported as zero. */
export function inScopeListItems(body: string): number {
  let inSection = false;
  let count = 0;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (IN_SECTION_HEADING.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (H2_HEADING.test(line)) break;
    if (LIST_ITEM.test(raw)) count += 1;
  }
  return count;
}

/** Where a capability count came from. Reported alongside the number so a
 *  later threshold ruling can tell a backlog-table count from a fallback one
 *  instead of averaging two different measurements together. */
export type CapabilitySource =
  | "backlog-table"
  | "scope-document-table"
  | "scope-document-list"
  | "none";

export interface CapabilityMeasurement {
  capabilities: number;
  source: CapabilitySource;
}

/** The fallback chain, in the order #2692's ruling fixed it: the backlog's
 *  largest table, then the scope document's largest table, then the scope
 *  document's in-scope list. Over the committed corpus the first arm answers
 *  56 of 58 records; the chain exists for the remaining two. */
export function measureCapabilities(
  backlog: string | undefined,
  scopeDocument: string | undefined,
): CapabilityMeasurement {
  const fromBacklog = backlog === undefined ? 0 : largestTableRows(backlog).rows;
  if (fromBacklog > 0) return { capabilities: fromBacklog, source: "backlog-table" };
  if (scopeDocument === undefined) return { capabilities: 0, source: "none" };
  const fromScopeTable = largestTableRows(scopeDocument).rows;
  if (fromScopeTable > 0) {
    return { capabilities: fromScopeTable, source: "scope-document-table" };
  }
  const fromList = inScopeListItems(scopeDocument);
  if (fromList > 0) return { capabilities: fromList, source: "scope-document-list" };
  return { capabilities: 0, source: "none" };
}

/** Normalize a raw depth string to a canonical level, or undefined when it is
 *  absent or unrecognizable. The sensor never guesses a level — an unreadable
 *  value is reported as `null` next to the count, which is exactly what a later
 *  band ruling needs to know about that record. */
export function canonicalDepth(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const needle = raw.trim().toLowerCase();
  return DEPTH_LEVELS.find((level) => level.toLowerCase() === needle);
}

export interface ScopeSizingResult {
  /** Always true. This sensor measures; it does not judge — see the header. */
  pass: boolean;
  findings_count: number;
  reason: string;
  findings: never[];
  capabilities: number;
  source: CapabilitySource;
  depth: string | null;
}

function readOrUndefined(path: string): string | undefined {
  try {
    const body = readFileSync(path, "utf-8");
    return body.trim() === "" ? undefined : body;
  } catch {
    return undefined;
  }
}

function measured(
  reason: string,
  measurement: CapabilityMeasurement,
  depth: string | undefined,
): ScopeSizingResult {
  return {
    pass: true,
    findings_count: 0,
    reason,
    findings: [],
    capabilities: measurement.capabilities,
    source: measurement.source,
    depth: depth ?? null,
  };
}

/** Pure evaluation core (in-process test seam). Reads the sibling artifacts
 *  itself so the CLI entry stays a thin argv shim.
 *
 *  Both sizing artifacts resolve the count from their shared directory, so
 *  whichever of the two fires, the reported number is the same. A fire on any
 *  other scope-definition output — the questions file the glob also matches —
 *  measures nothing and says so. */
export function evaluateScopeSizing(
  outputPath: string,
  depth: string | undefined,
): ScopeSizingResult {
  const level = canonicalDepth(depth);
  const name = basename(outputPath);
  if (!SIZING_BASENAMES.some((candidate) => candidate === name)) {
    return measured("not-sizing-artifact", { capabilities: 0, source: "none" }, level);
  }
  const dir = dirname(outputPath);
  const measurement = measureCapabilities(
    readOrUndefined(join(dir, BACKLOG_BASENAME)),
    readOrUndefined(join(dir, SCOPE_DOCUMENT_BASENAME)),
  );
  return measured(measurement.source === "none" ? "no-capabilities" : "measured", measurement, level);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Flags {
  stage?: string;
  outputPath?: string;
  depth?: string;
}

/** The token after a flag, or undefined when the flag was written without a
 *  value. A following `--flag` is the NEXT flag, not this one's value: reading
 *  it as a value turns `--output-path --depth Standard` into a measurement of a
 *  path named "--depth", which the sensor would then report as a real (empty)
 *  reading instead of refusing. For a sensor whose only product is a number,
 *  silently measuring the wrong thing is worse than exiting. */
function valueAt(argv: string[], index: number): string | undefined {
  const value = argv[index];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

function parseFlags(argv: string[]): Flags {
  const out: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--stage") out.stage = valueAt(argv, ++i);
    else if (argv[i] === "--output-path") out.outputPath = valueAt(argv, ++i);
    else if (argv[i] === "--depth") out.depth = valueAt(argv, ++i);
  }
  return out;
}

/** The only non-zero exit: a missing required flag. Exported as an in-process
 *  seam — reached from `main` it runs inside a spawned child, which bun's
 *  coverage does not measure, so the arm would sit permanently uncovered while
 *  its behaviour is genuinely tested. */
export function fail(msg: string): never {
  process.stderr.write(`amadeus-sensor-scope-sizing: ${msg}\n`);
  process.exit(1);
}

/** CLI entry / in-process test seam. Exits 1 ONLY on a missing required flag;
 *  every measurement is stdout JSON with exit 0. The JSON IS the sensor's
 *  product — a pass carries no audit payload beyond SENSOR_PASSED, so the
 *  measurement lives in this line and in whatever collects it. */
export function main(argv: string[] = process.argv.slice(2)): void {
  const flags = parseFlags(argv);
  if (!flags.stage) fail("--stage is required");
  if (!flags.outputPath) fail("--output-path is required");
  process.stdout.write(
    `${JSON.stringify(evaluateScopeSizing(flags.outputPath, flags.depth))}\n`,
  );
  process.exit(0);
}

// Guard the CLI entry so the module can be imported (the exported seams are
// driven in-process by tests) without executing main() at load time.
if (import.meta.main) main();
