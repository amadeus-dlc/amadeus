// This is the SMALL (pure in-process) layer for the norm-metrics tool
// (packages/framework/core/tools/amadeus-norm-metrics.ts): the parse / scan /
// aggregate / render seams plus main()'s dispatch, driven with string fixtures
// and env-var seams only (no fs or spawn calls, so this file stays `small` on
// the test-size axis — unit scope's cap). bun --coverage's spawn blind spot
// makes this in-process layer the lcov carrier for every decision branch.
//
// The `cli` mechanism for the `subcommand:amadeus-norm-metrics:rank` coverage
// unit is provided by the MEDIUM sibling that really spawns the tool:
// tests/integration/t-norm-metrics.test.ts (which carries the `// covers:`
// header and is pinned in gen-coverage-registry.test.ts's EXPECTED_NONE_TO_CLI).
//
// Technique: known-answer + boundary + determinism + fail-closed +
// fault-injection (the boundary weakening is proven to redden case (b)).

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { RuleFile } from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  amendmentCountOf,
  buildRows,
  classifySection,
  collectMetrics,
  main,
  normaliseCid,
  parseArgs,
  parseCidRecords,
  renderJson,
  renderTable,
  type RuleLine,
  scanCitations,
} from "../../packages/framework/core/tools/amadeus-norm-metrics.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const REAL_MEMORY = join(REPO_ROOT, "amadeus", "spaces", "default", "memory");
// A path guaranteed not to resolve to a rules dir — loadRules() returns [] for
// a non-existent AMADEUS_RULES_DIR, which is the fail-closed (exit 1) trigger.
const NO_MEMORY = join(REPO_ROOT, "no-such-memory-dir-xyz");

function line(scope: RuleLine["scope"], section: string, text: string): RuleLine {
  return { scope, section, text };
}

function ruleFile(scope: RuleFile["scope"], headings: Map<string, string>): RuleFile {
  return { path: `${scope}.md`, scope, frontmatter: {}, headings };
}

// ---------------------------------------------------------------------------
// (a) cid parse — klass / adoptedDate / amendment / dedup / normalisation.
// ---------------------------------------------------------------------------

describe("parseCidRecords (cid ledger)", () => {
  test("klass from section, earliest date, full/tail slug", () => {
    const lines: RuleLine[] = [
      line("team", "Forbidden", "- no foo <!-- cid:requirements-analysis:no-foo -->"),
      line("team", "Mandated", "- always bar (2026-07-10) (amended 2026-07-12) <!-- cid:code-generation:always-bar -->"),
      line("team", "Corrections", "- fix baz <!-- cid:reverse-engineering:fix-baz -->"),
    ];
    const recs = parseCidRecords(lines);
    expect(recs.map((r) => r.fullCid)).toEqual([
      "requirements-analysis:no-foo",
      "code-generation:always-bar",
      "reverse-engineering:fix-baz",
    ]);
    expect(recs[0].klass).toBe("forbidden");
    expect(recs[1].klass).toBe("mandated");
    expect(recs[2].klass).toBe("general");
    expect(recs[0].slug).toBe("no-foo");
    // earliest date on the line is chosen as adoptedDate.
    expect(recs[1].adoptedDate).toBe("2026-07-10");
    expect(recs[0].adoptedDate).toBeNull();
    // one amendment token -> count 1.
    expect(recs[1].amendmentCount).toBe(1);
  });

  test("double-namespace marker normalises; duplicates deduped by fullCid", () => {
    const lines: RuleLine[] = [
      line("project", "Corrections", "- a <!-- cid:code-generation:code-generation:c2 -->"),
      line("project", "Corrections", "- dup <!-- cid:code-generation:c2 -->"),
    ];
    const recs = parseCidRecords(lines);
    expect(recs).toHaveLength(1);
    expect(recs[0].fullCid).toBe("code-generation:c2");
    expect(recs[0].slug).toBe("c2");
  });

  test("amendmentCountOf: tokens plus a churn signal (two adoption votes)", () => {
    expect(amendmentCountOf("plain line <!-- cid:x:y -->")).toBe(0);
    expect(amendmentCountOf("追補 精密化 line")).toBe(2);
    // two "採用 n/n" on one line = one churn increment.
    expect(amendmentCountOf("採用 4/4 ... 採用 6/6")).toBe(1);
    expect(amendmentCountOf("採用 4/4")).toBe(0);
  });

  test("oldSlugs parsed from a (旧 cid: <slug>) legacy-alias marker", () => {
    const recs = parseCidRecords([
      line(
        "team",
        "Corrections",
        "- renamed rule (旧 cid: requirements-analysis:old-name) <!-- cid:requirements-analysis:new-name -->",
      ),
    ]);
    expect(recs[0].oldSlugs).toEqual(["old-name"]);
  });

  test("normaliseCid / classifySection primitives", () => {
    expect(normaliseCid("a:a:slug")).toBe("a:slug");
    expect(normaliseCid("a:slug")).toBe("a:slug");
    expect(normaliseCid("slug")).toBe("slug");
    expect(classifySection("Forbidden")).toBe("forbidden");
    expect(classifySection("Mandated")).toBe("mandated");
    expect(classifySection("Way of Working")).toBe("general");
  });
});

// ---------------------------------------------------------------------------
// uncounted-rules layering (org rule lines + affirmed tag).
// ---------------------------------------------------------------------------

describe("uncounted rules (no cid)", () => {
  test("org lines and affirmed tags counted via collectMetrics", () => {
    const org = new Map<string, string>([["Way of Working", "policy one\npolicy two"]]);
    const team = new Map<string, string>([
      ["Corrections", "- fixed thing (affirmed 2026-07-07) <!-- cid:code-generation:fixed -->"],
    ]);
    const metrics = collectMetrics([ruleFile("org", org), ruleFile("team", team)], null);
    expect(metrics.uncounted.org).toBe(2);
    expect(metrics.uncounted.affirmed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// (b) citation boundary matching — full/tail/double forms sum to one slug;
//     fragments (token-adjacent) are excluded.
// ---------------------------------------------------------------------------

describe("scanCitations (boundary matching)", () => {
  const defLine = line(
    "team",
    "Corrections",
    "- rule text (2026-07-09) <!-- cid:requirements-analysis:escalation-canonical -->",
  );

  test("full + tail + double forms all resolve to the same record", () => {
    const recs = parseCidRecords([defLine]);
    const cites = [
      line("team", "Way of Working", "see cid:requirements-analysis:escalation-canonical for full form"),
      line("team", "Way of Working", "see cid:escalation-canonical for tail form"),
      line("team", "Way of Working", "see cid:requirements-analysis:requirements-analysis:escalation-canonical dbl"),
    ];
    const tallies = scanCitations(recs, [defLine, ...cites]);
    // 1 self-definition marker + 3 citation forms = 4.
    expect(tallies.get("requirements-analysis:escalation-canonical")?.cites).toBe(4);
  });

  test("token-adjacent fragments do not count", () => {
    const recs = parseCidRecords([defLine]);
    const noise = [
      // preceded by a letter -> boundary fails.
      line("team", "Way of Working", "xcid:escalation-canonical must not match"),
      // trailing extra segment chars -> different tail, no match.
      line("team", "Way of Working", "cid:escalation-canonical-extra must not match"),
    ];
    const tallies = scanCitations(recs, [defLine, ...noise]);
    // only the self-definition marker counts.
    expect(tallies.get("requirements-analysis:escalation-canonical")?.cites).toBe(1);
  });

  test("lastCited is the max date across citing lines", () => {
    const recs = parseCidRecords([defLine]);
    const cites = [line("team", "Way of Working", "later ref (2026-07-15) cid:escalation-canonical")];
    const tallies = scanCitations(recs, [defLine, ...cites]);
    expect(tallies.get("requirements-analysis:escalation-canonical")?.lastCited).toBe("2026-07-15");
  });
});

// ---------------------------------------------------------------------------
// Aggregator — sort order and ageNorm normalisation.
// ---------------------------------------------------------------------------

describe("buildRows (aggregate)", () => {
  test("sorts by cites desc then cid asc; ageNorm is min-max normalised", () => {
    const recs = parseCidRecords([
      line("team", "Corrections", "- a (2026-07-01) <!-- cid:s:aaa -->"),
      line("team", "Corrections", "- b (2026-07-01) <!-- cid:s:bbb -->"),
      line("team", "Corrections", "- c (2026-07-01) <!-- cid:s:ccc -->"),
    ]);
    // include the definition lines themselves so self-cites register.
    const withDefs = [
      line("team", "Corrections", "- a (2026-07-01) <!-- cid:s:aaa -->"),
      line("team", "Corrections", "- b (2026-07-01) <!-- cid:s:bbb -->"),
      line("team", "Corrections", "- c (2026-07-01) <!-- cid:s:ccc -->"),
      line("team", "x", "cid:s:aaa cid:s:aaa cid:s:aaa"), // aaa: 3 refs + self = 4
      line("team", "x", "cid:s:bbb"), // bbb: 1 ref + self = 2
      line("team", "x", "cid:s:ccc"), // ccc: 1 ref + self = 2
    ];
    const tallies = scanCitations(recs, withDefs);
    const rows = buildRows(recs, tallies, "2026-07-11");
    expect(rows.map((r) => r.cid)).toEqual(["s:aaa", "s:bbb", "s:ccc"]);
    expect(rows[0].cites).toBe(4);
    expect(rows[1].cites).toBe(2);
    // most-cited has ageNorm 1, the tied pair share the min -> 0.
    expect(rows[0].ageNorm).toBe(1);
    expect(rows[1].ageNorm).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// (c) determinism + (e) JSON schema (AC-1f: every key asserted).
// ---------------------------------------------------------------------------

function fixtureRules(): RuleFile[] {
  const org = new Map<string, string>([["Way of Working", "org policy line"]]);
  const team = new Map<string, string>([
    [
      "Corrections",
      "- alpha (2026-07-05) (amended 2026-07-08) 採用 4/4 <!-- cid:code-generation:alpha -->\n" +
        "- beta references cid:code-generation:alpha (2026-07-09) <!-- cid:requirements-analysis:beta -->\n" +
        "- gamma mentions E-PM1 and E-L59 <!-- cid:reverse-engineering:gamma -->",
    ],
  ]);
  return [ruleFile("org", org), ruleFile("team", team)];
}

describe("determinism + JSON schema", () => {
  test("collectMetrics + renderJson is byte-identical across two runs", () => {
    const a = renderJson(collectMetrics(fixtureRules(), "deadbeef"), null);
    const b = renderJson(collectMetrics(fixtureRules(), "deadbeef"), null);
    expect(a).toBe(b);
    expect(a.split("\n")).toHaveLength(1); // single-line JSON
  });

  test("JSON schema carries every declared key and nothing else (AC-1f)", () => {
    const metrics = collectMetrics(fixtureRules(), "deadbeef");
    const parsed = JSON.parse(renderJson(metrics, null));
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "adoptionVotes",
        "ecodeOccurrences",
        "latestDataDate",
        "rows",
        "sourceSha",
        "unlinkedLegacy",
        "uncounted",
      ].sort(),
    );
    expect(Object.keys(parsed.uncounted).sort()).toEqual(["affirmed", "org"]);
    expect(Object.keys(parsed.adoptionVotes).sort()).toEqual(["have", "total"]);
    expect(Object.keys(parsed.rows[0]).sort()).toEqual(
      ["adoptedDate", "ageNorm", "amendmentCount", "cid", "cites", "klass", "lastCited"].sort(),
    );
    // corpus-level derivations are real (not hardcoded theatre).
    expect(parsed.sourceSha).toBe("deadbeef");
    expect(parsed.latestDataDate).toBe("2026-07-09");
    expect(parsed.ecodeOccurrences).toBe(2); // E-PM1, E-L59
    expect(parsed.adoptionVotes).toEqual({ have: 1, total: 3 }); // alpha has 採用 4/4
    expect(parsed.uncounted).toEqual({ org: 1, affirmed: 0 });
    expect(parsed.unlinkedLegacy).toBe(0); // no (旧 cid:) markers in fixture
  });

  test("renderTable emits the loud NOT-COLLECTED / NOT-AGGREGATED lines", () => {
    const table = renderTable(collectMetrics(fixtureRules(), "deadbeef"), 5);
    expect(table).toContain("uncounted rules (no cid): 0 affirmed + 1 org-rules");
    expect(table).toContain("E-code citations: NOT AGGREGATED (observed: 2 occurrences)");
    expect(table).toContain("GoA-variance, violation-recurrence: NOT COLLECTED");
    expect(table).toContain("adoption-votes partial: 1/3");
    expect(table).toContain("unlinked legacy citations: 0");
  });

  test("--top limits rows in both renderers", () => {
    const metrics = collectMetrics(fixtureRules(), "deadbeef");
    expect(JSON.parse(renderJson(metrics, 1)).rows).toHaveLength(1);
    expect(JSON.parse(renderJson(metrics, null)).rows).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// (d) argv parsing + fail-closed dispatch (main driven in-process).
// ---------------------------------------------------------------------------

describe("parseArgs", () => {
  test("rank with flags", () => {
    expect(parseArgs(["rank"])).toEqual({ kind: "ok", verb: "rank", json: false, top: null });
    expect(parseArgs(["rank", "--json"])).toEqual({ kind: "ok", verb: "rank", json: true, top: null });
    expect(parseArgs(["rank", "--top", "5"])).toEqual({ kind: "ok", verb: "rank", json: false, top: 5 });
  });

  test("missing verb / bad --top are exit-2 errors", () => {
    expect(parseArgs([])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "--top", "0"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "--top", "x"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "--top"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "extra"])).toMatchObject({ kind: "error", code: 2 });
  });
});

describe("main dispatch (fail-closed)", () => {
  const origRulesDir = process.env.AMADEUS_RULES_DIR;
  function restore() {
    if (origRulesDir === undefined) delete process.env.AMADEUS_RULES_DIR;
    else process.env.AMADEUS_RULES_DIR = origRulesDir;
  }
  function silence<T>(fn: () => T): T {
    const log = console.log;
    const err = console.error;
    console.log = () => {};
    console.error = () => {};
    try {
      return fn();
    } finally {
      console.log = log;
      console.error = err;
    }
  }

  test("unknown verb -> exit 2 (switch default)", () => {
    expect(silence(() => main(["distill-candidates"]))).toBe(2);
  });

  test("argv parse error -> exit 2 (main error branch)", () => {
    expect(silence(() => main([]))).toBe(2);
    expect(silence(() => main(["rank", "--top", "0"]))).toBe(2);
  });

  test("memory layer absent -> exit 1", () => {
    process.env.AMADEUS_RULES_DIR = NO_MEMORY;
    try {
      expect(silence(() => main(["rank", "--json"]))).toBe(1);
    } finally {
      restore();
    }
  });

  test("memory layer present -> exit 0 (in-process success branch)", () => {
    process.env.AMADEUS_RULES_DIR = REAL_MEMORY;
    try {
      expect(silence(() => main(["rank", "--json", "--top", "3"]))).toBe(0);
      expect(silence(() => main(["rank"]))).toBe(0);
    } finally {
      restore();
    }
  });
});
