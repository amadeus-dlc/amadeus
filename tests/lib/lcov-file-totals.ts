// lcov-file-totals.ts — the ONE reading of per-source line totals out of an
// LCOV report (SF / LF / LH).
//
// Two consumers read the same combined report and must never disagree about
// what it says: the runner, which sums it into coverage/coverage-totals.json
// and the HTML table, and the project coverage gate, which needs the per-file
// split to tell a deletion apart from a regression. A second hand-rolled
// parser is exactly the drift this module exists to make impossible — the gate
// cross-checks its own sum against the runner's emit, and two parsers that
// disagreed would turn that check into a false alarm.
//
// Input contract: the COMBINED, normalized report (tests/lib/coverage-normalize.ts),
// where each source appears once with repo-relative SF and a single LF/LH pair.

export interface LcovFileTotals {
  readonly hits: number;
  readonly lines: number;
}

/**
 * Per-source totals keyed by the record's SF path, in first-seen order.
 * Repeated SF records for one source accumulate rather than overwrite, so a
 * report that was concatenated but not normalized still sums to its own total.
 */
export function parseLcovFileTotals(lcov: string): Map<string, LcovFileTotals> {
  const files = new Map<string, LcovFileTotals>();
  let source: string | null = null;
  let lines = 0;
  let hits = 0;
  const flush = (): void => {
    if (source === null) return;
    const prior = files.get(source);
    files.set(source, {
      hits: (prior?.hits ?? 0) + hits,
      lines: (prior?.lines ?? 0) + lines,
    });
    source = null;
    lines = 0;
    hits = 0;
  };
  for (const line of lcov.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      flush();
      source = line.slice(3);
      continue;
    }
    if (source === null) continue;
    if (line.startsWith("LF:")) {
      lines = Number(line.slice(3)) || 0;
      continue;
    }
    if (line.startsWith("LH:")) {
      hits = Number(line.slice(3)) || 0;
      continue;
    }
    if (line.startsWith("end_of_record")) flush();
  }
  flush();
  return files;
}

/** Sum a per-source map into one hits/lines pair. */
export function sumLcovFileTotals(files: Iterable<LcovFileTotals>): LcovFileTotals {
  let hits = 0;
  let lines = 0;
  for (const file of files) {
    hits += file.hits;
    lines += file.lines;
  }
  return { hits, lines };
}
