// covers: file:packages/framework/core/tools/amadeus-sensor-scope-sizing.ts
//
// t518 — the scope-sizing predicate (#2692, the L1 row of #2683).
//
// Pure string work only: every case here is a shape the committed corpus
// actually writes, or one that looks like it and must not be counted. The
// filesystem side (sibling resolution, depth, the CLI, the corpus sweep) lives
// in the integration sibling t519, per the unit/integration split the size
// ratchet enforces.
//
// The predicate is COLUMN-NAME-INDEPENDENT by measurement, not by taste. Over
// the 58 committed intent-backlog.md files that carry a table, the header row
// takes 55 distinct shapes — `| # | Proto-Unit | MoSCoW | 依存 | 概要 |`,
// `| Priority | ID | Capability | Value | Dependency | Confidence hypothesis |`,
// `| 順位 | ID | Proto-Unit | MoSCoW | BV | TC | RR | Size | WSJF | 依存 |` and
// so on. Any predicate that names a column fails on about half the corpus, so
// what is counted is the row count of the largest table.
import { describe, expect, test } from "bun:test";
import {
  canonicalDepth,
  inScopeListItems,
  largestTableRows,
  measureCapabilities,
} from "../../packages/framework/core/tools/amadeus-sensor-scope-sizing.ts";

describe("t518 largest-table row count", () => {
  // Shape taken from 260716-eoc1-gate-check's backlog: a header, a separator
  // and three proto-Unit rows.
  const BACKLOG = [
    "# Intent Backlog",
    "",
    "| # | Proto-Unit | MoSCoW | 依存 | 概要 |",
    "|---|---|---|---|---|",
    "| 1 | evidence-guard | Must | — | 質問証跡の検査 |",
    "| 2 | gate-wiring | Must | 1 | ゲートへの接続 |",
    "| 3 | docs | Should | 2 | 文書同期 |",
  ].join("\n");

  test("counts the data rows of the table, not its header or separator", () => {
    expect(largestTableRows(BACKLOG).rows).toBe(3);
  });

  test("the header is reported so a reader can see what was counted", () => {
    expect(largestTableRows(BACKLOG).header).toBe("| # | Proto-Unit | MoSCoW | 依存 | 概要 |");
  });

  test("a differently-headed table counts identically — no column is named", () => {
    const other = [
      "| Priority | ID | Capability | Value | Dependency | Confidence hypothesis |",
      "|---|---|---|---|---|---|",
      "| P1 | C-1 | a | high | — | h1 |",
      "| P2 | C-2 | b | mid | C-1 | h2 |",
      "| P3 | C-3 | c | low | C-2 | h3 |",
    ].join("\n");
    expect(largestTableRows(other).rows).toBe(3);
    expect(largestTableRows(other).rows).toBe(largestTableRows(BACKLOG).rows);
  });

  test("the LARGEST table wins when a file carries several", () => {
    const twoTables = [
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "| x | y |",
      "|---|---|",
      "| 1 | 2 |",
      "| 3 | 4 |",
      "| 5 | 6 |",
    ].join("\n");
    expect(largestTableRows(twoTables).rows).toBe(3);
    expect(largestTableRows(twoTables).header).toBe("| x | y |");
  });

  test("a table written without a separator row still counts its body", () => {
    // Some records write the header and body with no `|---|` line. Treating
    // the whole block as body minus the header keeps them measurable rather
    // than reading them as zero.
    expect(largestTableRows("| a | b |\n| 1 | 2 |\n| 3 | 4 |").rows).toBe(2);
  });

  test("a body with no table at all is zero rows and no header", () => {
    const scan = largestTableRows("# Intent Backlog\n\n- capability one\n- capability two\n");
    expect(scan.rows).toBe(0);
    expect(scan.header).toBe("");
  });

  test("a header-and-separator table with no body rows is zero rows", () => {
    expect(largestTableRows("| a | b |\n|---|---|\n").rows).toBe(0);
  });

  test("an indented table still counts — the corpus indents inside list items", () => {
    expect(largestTableRows("  | a | b |\n  |---|---|\n  | 1 | 2 |").rows).toBe(1);
  });
});

describe("t518 in-scope list fallback", () => {
  const SCOPE_DOC = [
    "# Scope Document",
    "",
    "## In",
    "",
    "1. capability one",
    "2. capability two",
    "- capability three",
    "",
    "## Out",
    "",
    "- not this one",
    "- nor this",
  ].join("\n");

  test("counts list items under `## In` only", () => {
    expect(inScopeListItems(SCOPE_DOC)).toBe(3);
  });

  test("the next H2 ends the section — Out items never join the count", () => {
    expect(inScopeListItems(`${SCOPE_DOC}\n- trailing after Out`)).toBe(3);
  });

  test("no `## In` heading is zero, not a scan of the whole file", () => {
    expect(inScopeListItems("## Scope\n\n- a\n- b\n")).toBe(0);
  });

  test("nested bullets are a capability's detail, not another capability", () => {
    // An indented bullet elaborates the item above it. Counting it would
    // inflate the fallback reading and corrupt the distribution the sensor
    // exists to accumulate.
    const nested = ["## In", "", "- capability one", "  - detail a", "  - detail b", "- capability two"].join("\n");
    expect(inScopeListItems(nested)).toBe(2);
  });
});

describe("t518 capability measurement and its fallback chain", () => {
  const WITH_TABLE = "| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |";
  const SCOPE_WITH_TABLE = "| x |\n|---|\n| 1 |\n| 2 |\n| 3 |\n| 4 |\n| 5 |";
  const SCOPE_WITH_LIST = "## In\n\n- a\n- b\n";

  test("the backlog table is the primary measurement", () => {
    expect(measureCapabilities(WITH_TABLE, SCOPE_WITH_TABLE)).toEqual({
      capabilities: 2,
      source: "backlog-table",
    });
  });

  test("a backlog without a table falls back to the scope document's table", () => {
    expect(measureCapabilities("# Backlog\n\nprose only\n", SCOPE_WITH_TABLE)).toEqual({
      capabilities: 5,
      source: "scope-document-table",
    });
  });

  test("neither table present falls back to the in-scope list", () => {
    expect(measureCapabilities("# Backlog\n", SCOPE_WITH_LIST)).toEqual({
      capabilities: 2,
      source: "scope-document-list",
    });
  });

  test("an absent backlog file still measures from the scope document", () => {
    expect(measureCapabilities(undefined, SCOPE_WITH_TABLE)).toEqual({
      capabilities: 5,
      source: "scope-document-table",
    });
  });

  test("nothing measurable anywhere reports none — never a silent zero table", () => {
    expect(measureCapabilities(undefined, undefined)).toEqual({
      capabilities: 0,
      source: "none",
    });
    expect(measureCapabilities("# Backlog\n", "# Scope\n")).toEqual({
      capabilities: 0,
      source: "none",
    });
  });
});

describe("t518 depth normalization", () => {
  test("the three canonical levels round-trip case-insensitively", () => {
    expect(canonicalDepth("Minimal")).toBe("Minimal");
    expect(canonicalDepth("standard")).toBe("Standard");
    expect(canonicalDepth(" COMPREHENSIVE ")).toBe("Comprehensive");
  });

  test("an absent or unrecognizable level is undefined — never guessed", () => {
    expect(canonicalDepth(undefined)).toBeUndefined();
    expect(canonicalDepth("")).toBeUndefined();
    expect(canonicalDepth("Deep")).toBeUndefined();
  });
});
