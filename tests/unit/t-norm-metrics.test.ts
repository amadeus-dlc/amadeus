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
  CHURN_THRESHOLD,
  classifySection,
  collectMetrics,
  DEFAULT_DISTILL_K,
  distillCandidates,
  ECODE_RE,
  extractGoaRecords,
  main,
  normaliseCid,
  parseArgs,
  parseCidRecords,
  parseGoaLine,
  parsePmCidLine,
  renderDistillJson,
  renderDistillTable,
  renderJson,
  renderTable,
  scanGoaHeads,
  type RuleLine,
  scanCitations,
  ZERO_CITE_THRESHOLD_DAYS,
} from "../../packages/framework/core/tools/amadeus-norm-metrics.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const REAL_MEMORY = join(REPO_ROOT, "amadeus", "spaces", "default", "memory");
// A path guaranteed not to resolve to a rules dir — loadRules() returns [] for
// a non-existent AMADEUS_RULES_DIR, which is the fail-closed (exit 1) trigger.
const NO_MEMORY = join(REPO_ROOT, "no-such-memory-dir-xyz");
// A corpus root whose amadeus/spaces/*/intents subtree exists — drives the
// IoCollector (corpusFileBodies -> collectMarkdownFiles) in-process so those
// fs-walk lines are lcov-measured, not left to the spawn-only blind spot.
const CORPUS_FIXTURE = join(REPO_ROOT, "tests", "fixtures", "norm-corpus");

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
    expect(parseArgs(["rank"])).toEqual({ kind: "ok", verb: "rank", json: false, top: null, k: null });
    expect(parseArgs(["rank", "--json"])).toEqual({ kind: "ok", verb: "rank", json: true, top: null, k: null });
    expect(parseArgs(["rank", "--top", "5"])).toEqual({ kind: "ok", verb: "rank", json: false, top: 5, k: null });
  });

  test("distill-candidates with --k", () => {
    expect(parseArgs(["distill-candidates"])).toEqual({
      kind: "ok",
      verb: "distill-candidates",
      json: false,
      top: null,
      k: null,
    });
    expect(parseArgs(["distill-candidates", "--k", "3", "--json"])).toEqual({
      kind: "ok",
      verb: "distill-candidates",
      json: true,
      top: null,
      k: 3,
    });
  });

  test("missing verb / bad --top / bad --k are exit-2 errors", () => {
    expect(parseArgs([])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "--top", "0"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "--top", "x"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "--top"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["rank", "extra"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["distill-candidates", "--k", "0"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["distill-candidates", "--k", "x"])).toMatchObject({ kind: "error", code: 2 });
    expect(parseArgs(["distill-candidates", "--k"])).toMatchObject({ kind: "error", code: 2 });
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
    expect(silence(() => main(["bogus-verb"]))).toBe(2);
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
      expect(silence(() => main(["distill-candidates"]))).toBe(0);
      expect(silence(() => main(["distill-candidates", "--json", "--k", "3"]))).toBe(0);
    } finally {
      restore();
    }
  });

  test("distill-candidates with memory absent -> exit 1 (fail-closed)", () => {
    process.env.AMADEUS_RULES_DIR = NO_MEMORY;
    try {
      expect(silence(() => main(["distill-candidates"]))).toBe(1);
    } finally {
      restore();
    }
  });

  test("main drives the corpus IoCollector in-process (fixture root)", () => {
    const origCorpus = process.env.AMADEUS_CORPUS_ROOT;
    process.env.AMADEUS_RULES_DIR = REAL_MEMORY;
    process.env.AMADEUS_CORPUS_ROOT = CORPUS_FIXTURE;
    try {
      // Both verbs walk corpusFileBodies -> collectMarkdownFiles over the
      // fixture's amadeus/spaces/*/intents subtree (record file + audit shard).
      expect(silence(() => main(["rank", "--json"]))).toBe(0);
      expect(silence(() => main(["distill-candidates", "--json"]))).toBe(0);
    } finally {
      restore();
      if (origCorpus === undefined) delete process.env.AMADEUS_CORPUS_ROOT;
      else process.env.AMADEUS_CORPUS_ROOT = origCorpus;
    }
  });
});

// ---------------------------------------------------------------------------
// FR-1: citation corpus (record tree + audit shards) folds into the counts.
// collectMetrics takes an iterable of corpus file bodies; here we drive it with
// string fixtures (the production caller passes a streaming generator).
// ---------------------------------------------------------------------------

function corpusRules(): RuleFile[] {
  const team = new Map<string, string>([
    ["Corrections", "- alpha rule (2026-07-05) <!-- cid:s:alpha -->"],
  ]);
  return [ruleFile("team", team)];
}

describe("citation corpus (record + audit surface — AC-1b)", () => {
  test("corpus bodies add citations and advance lastCited / latestDataDate", () => {
    const memoryOnly = collectMetrics(corpusRules(), "sha");
    const withCorpus = collectMetrics(corpusRules(), "sha", [
      "record file cites cid:s:alpha again (2026-07-20)",
      "audit shard cites cid:alpha tail form (2026-07-25)",
    ]);
    const before = memoryOnly.rows.find((r) => r.cid === "s:alpha");
    const after = withCorpus.rows.find((r) => r.cid === "s:alpha");
    // memory-only: 1 self-definition cite; corpus adds 2 more.
    expect(before?.cites).toBe(1);
    expect(after?.cites).toBe(3);
    expect(memoryOnly.latestDataDate).toBe("2026-07-05");
    expect(withCorpus.latestDataDate).toBe("2026-07-25");
    expect(after?.lastCited).toBe("2026-07-25");
  });

  test("corpus E-code occurrences fold into the observed count", () => {
    const memoryOnly = collectMetrics(corpusRules(), "sha");
    const withCorpus = collectMetrics(corpusRules(), "sha", ["ruling E-CV3 and E-PM1 mentioned here"]);
    expect(memoryOnly.ecodeOccurrences).toBe(0);
    expect(withCorpus.ecodeOccurrences).toBe(2);
  });

  test("determinism holds with a corpus (AC-1d) — byte-identical across runs", () => {
    const corpus = ["cid:s:alpha ref (2026-07-19)", "another cid:alpha ref (2026-07-21)"];
    const a = renderJson(collectMetrics(corpusRules(), "sha", corpus), null);
    const b = renderJson(collectMetrics(corpusRules(), "sha", corpus), null);
    expect(a).toBe(b);
  });

  test("empty corpus is equivalent to memory-only (additive)", () => {
    const memoryOnly = renderJson(collectMetrics(corpusRules(), "sha"), null);
    const emptyCorpus = renderJson(collectMetrics(corpusRules(), "sha", []), null);
    expect(emptyCorpus).toBe(memoryOnly);
  });
});

// ---------------------------------------------------------------------------
// FR-2: distill-candidates — zero-cite / high-churn selection, structural
// Forbidden/Mandated exemption, threshold boundaries, k cap.
// ---------------------------------------------------------------------------

function distillRules(): RuleFile[] {
  const team = new Map<string, string>([
    [
      "Corrections",
      // stale: only its self-definition cite, adopted long before the anchor.
      "- stale general norm (2026-06-01) <!-- cid:s:stale -->\n" +
        // fresh: adopted right at the anchor -> too new to flag zero-cite.
        "- fresh general norm (2026-07-16) <!-- cid:s:fresh -->\n" +
        // churny: two amendment markers -> high-churn; cited once externally so
        // it is NOT also a zero-cite candidate.
        "- churny norm (2026-06-10) (amended 2026-06-20) (精密化 2026-06-25) <!-- cid:s:churny -->\n" +
        "- one-amend norm (2026-06-01) (amended 2026-06-02) <!-- cid:s:one -->\n" +
        // external refs keep churny and one off the zero-cite list, isolating the
        // high-churn / churn-boundary signals.
        "- external ref to cid:s:churny keeps it off the zero-cite list (2026-07-01)\n" +
        "- external ref to cid:s:one keeps it off the zero-cite list (2026-07-02)\n" +
        "- anchor line fixes the latest data date (2026-07-17)",
    ],
    ["Forbidden", "- never do X (2026-06-01) (amended 2026-06-05) <!-- cid:requirements-analysis:never-x -->"],
    ["Mandated", "- always do Y (2026-06-01) <!-- cid:requirements-analysis:always-y -->"],
  ]);
  return [ruleFile("team", team)];
}

describe("distillCandidates (FR-2)", () => {
  test("zero-cite / high-churn selection with the anchor-fixed data date", () => {
    const metrics = collectMetrics(distillRules(), "sha");
    expect(metrics.latestDataDate).toBe("2026-07-17");
    const report = distillCandidates(metrics, DEFAULT_DISTILL_K);
    expect(report.zeroCite.map((c) => c.cid)).toEqual(["s:stale"]);
    expect(report.highChurn.map((c) => c.cid)).toEqual(["s:churny"]);
    // s:fresh (1 day old) is NOT flagged; s:one (1 amendment) is NOT high-churn.
    const all = [...report.zeroCite, ...report.highChurn].map((c) => c.cid);
    expect(all).not.toContain("s:fresh");
    expect(all).not.toContain("s:one");
  });

  test("Forbidden/Mandated are structurally exempt, never candidates (AC-2b)", () => {
    // Fault-injection target (falling proof i): removing the klass!=general guard
    // in distillCandidates would let never-x (forbidden, stale + amended) flow in
    // and redden this assertion.
    const report = distillCandidates(collectMetrics(distillRules(), "sha"), DEFAULT_DISTILL_K);
    const candidateCids = [...report.zeroCite, ...report.highChurn].map((c) => c.cid);
    expect(candidateCids).not.toContain("requirements-analysis:never-x");
    expect(candidateCids).not.toContain("requirements-analysis:always-y");
    expect(report.exempt.count).toBe(2);
    expect(report.exempt.cids).toEqual(["requirements-analysis:always-y", "requirements-analysis:never-x"]);
  });

  test("zero-cite threshold boundary (adopted >= ZERO_CITE_THRESHOLD_DAYS)", () => {
    expect(ZERO_CITE_THRESHOLD_DAYS).toBe(14);
    const team = new Map<string, string>([
      [
        "Corrections",
        "- exactly at threshold (2026-07-01) <!-- cid:s:at14 -->\n" +
          "- one day short (2026-07-02) <!-- cid:s:at13 -->\n" +
          "- anchor (2026-07-15)",
      ],
    ]);
    const report = distillCandidates(collectMetrics([ruleFile("team", team)], "sha"), DEFAULT_DISTILL_K);
    const cids = report.zeroCite.map((c) => c.cid);
    expect(cids).toContain("s:at14"); // 14 days -> flagged
    expect(cids).not.toContain("s:at13"); // 13 days -> not flagged
  });

  test("churn threshold boundary and k cap", () => {
    expect(CHURN_THRESHOLD).toBe(2);
    const metrics = collectMetrics(distillRules(), "sha");
    // k=0-safe: k>=1 by parse; here cap each list at 1 with a populated list.
    const capped = distillCandidates(metrics, 1);
    expect(capped.zeroCite.length).toBeLessThanOrEqual(1);
    expect(capped.highChurn.length).toBeLessThanOrEqual(1);
  });

  test("renderDistillTable / renderDistillJson consume every field (AC-1f)", () => {
    const report = distillCandidates(collectMetrics(distillRules(), "sha"), DEFAULT_DISTILL_K);
    const table = renderDistillTable(report);
    expect(table).toContain(`zero-cite candidates (ZERO_CITE_THRESHOLD_DAYS=${ZERO_CITE_THRESHOLD_DAYS}): 1`);
    expect(table).toContain(`high-churn candidates (CHURN_THRESHOLD=${CHURN_THRESHOLD}): 1`);
    expect(table).toContain("forbidden/mandated exempt (never candidates): 2 listed");
    expect(table).toContain("s:stale");
    expect(table).toContain("requirements-analysis:never-x");
    const json = JSON.parse(renderDistillJson(report));
    expect(Object.keys(json).sort()).toEqual(["exempt", "highChurn", "zeroCite"]);
    expect(Object.keys(json.exempt).sort()).toEqual(["cids", "count"]);
    expect(Object.keys(json.zeroCite[0]).sort()).toEqual(
      ["adoptedDate", "ageDays", "amendmentCount", "cid", "cites", "lastCited"].sort(),
    );
  });

  test("DEFAULT_DISTILL_K is the design-fixed default", () => {
    expect(DEFAULT_DISTILL_K).toBe(5);
  });

  test("candidate ordering: staleness/churn desc with cid tiebreak (multi-element)", () => {
    // Two zero-cite norms share an ageDays (tie -> cid asc); a third is younger.
    // Two high-churn norms share an amendmentCount (tie -> cid asc); a third has
    // more. This drives both comparators through their subtraction AND
    // localeCompare branches.
    const team = new Map<string, string>([
      [
        "Corrections",
        "- z (2026-06-01) <!-- cid:s:zeta -->\n" +
          "- a (2026-06-01) <!-- cid:s:alpha2 -->\n" +
          "- m (2026-06-15) <!-- cid:s:mid -->\n" +
          "- churn a (2026-06-01) (amended 2026-06-02) (精密化 2026-06-03) <!-- cid:s:churn-a -->\n" +
          "- churn b (2026-06-01) (amended 2026-06-02) (改定 2026-06-03) <!-- cid:s:churn-b -->\n" +
          "- churn c (2026-06-01) 追補 追補 追補 <!-- cid:s:churn-c -->\n" +
          "- ext cid:s:churn-a cid:s:churn-b cid:s:churn-c keeps them off zero-cite (2026-07-01)\n" +
          "- anchor (2026-07-17)",
      ],
    ]);
    const report = distillCandidates(collectMetrics([ruleFile("team", team)], "sha"), DEFAULT_DISTILL_K);
    expect(report.zeroCite.map((c) => c.cid)).toEqual(["s:alpha2", "s:zeta", "s:mid"]);
    expect(report.highChurn.map((c) => c.cid)).toEqual(["s:churn-c", "s:churn-a", "s:churn-b"]);
  });
});

// ---------------------------------------------------------------------------
// FR-3: Phase B input schemas — parse-only, no estimation (malformed -> failure).
// ---------------------------------------------------------------------------

describe("PhaseBSchemas (parseGoaLine / parsePmCidLine)", () => {
  test("parseGoaLine parses the 8-bin distribution (ADR-4)", () => {
    const r = parseGoaLine("GoA[E-PM1]: 1x4 2x0 3x1 4x0 5x0 6x2 7x0 8x0");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ecode).toBe("E-PM1");
      expect(r.votes).toEqual([4, 0, 1, 0, 0, 2, 0, 0]);
    }
  });

  test("parseGoaLine fails (never estimates) on malformed input", () => {
    expect(parseGoaLine("not a goa line").ok).toBe(false);
    expect(parseGoaLine("GoA[E-PM1]: 1x4 2x0 3x1").ok).toBe(false); // too few bins
    expect(parseGoaLine("GoA[E-PM1]: 2x4 1x0 3x1 4x0 5x0 6x0 7x0 8x0").ok).toBe(false); // bins out of order
    expect(parseGoaLine("GoA[E-PM1]: 1xz 2x0 3x1 4x0 5x0 6x0 7x0 8x0").ok).toBe(false); // non-numeric count
  });

  test("parseGoaLine accepts sparse labelled segments and aggregates missing bins as zero", () => {
    const r = parseGoaLine("GoA[E-SPARSE-1]: c1 2x2 7x1 / C2 1x3");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.votes).toEqual([3, 2, 0, 0, 0, 0, 1, 0]);
      expect(r.segments).toEqual([
        { label: "c1", votes: [0, 2, 0, 0, 0, 0, 1, 0] },
        { label: "C2", votes: [3, 0, 0, 0, 0, 0, 0, 0] },
      ]);
    }
  });

  test("canonical GoA remains segment-free and sparse labels preserve case", () => {
    const canonical = parseGoaLine("GoA[E-PM1]: 1x4 2x0 3x1 4x0 5x0 6x2 7x0 8x0");
    expect(canonical.ok).toBe(true);
    if (canonical.ok) expect(canonical.segments).toBeUndefined();
    const upper = parseGoaLine("GoA[E-SPARSE-2]: C1 1x1");
    expect(upper.ok).toBe(true);
    if (upper.ok) expect(upper.segments?.[0].label).toBe("C1");
  });

  test("sparse parsing rejects all four failure classes atomically", () => {
    const cases = [
      ["GoA[E-X]: c1 1x1 / C1 2x1", "sparse/duplicate-label:"],
      ["GoA[E-X]: c1 2x1 1x1", "sparse/bin-sequence:"],
      ["GoA[E-X]: c1 1x1 / nope 2x1", "sparse/malformed-token:"],
      ["GoA[E-X]: c1 1x1 /", "sparse/empty-segment:"],
    ] as const;
    for (const [line, prefix] of cases) {
      const r = parseGoaLine(line);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.startsWith(prefix)).toBe(true);
    }
  });

  test("sparse bins are 1..8, strictly ascending, unique, and tokens are never skipped", () => {
    for (const line of [
      "GoA[E-X]: c1 9x1",
      "GoA[E-X]: c1 1x1 1x2",
      "GoA[E-X]: c1 1xz",
      "GoA[E-X]: c1 1x1 garbage",
      "GoA[E-X]: / c1 1x1",
      "GoA[E-X]: c1 1x1 / / c2 2x1",
    ]) expect(parseGoaLine(line).ok).toBe(false);
  });

  test("parsePmCidLine parses the PM round record (ADR-4)", () => {
    const r = parsePmCidLine(
      "PM-cid: requirements-analysis:merge-approval-latency incident=誤マージ誘発の懸念 round=E-PM3",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cid).toBe("requirements-analysis:merge-approval-latency");
      expect(r.incident).toBe("誤マージ誘発の懸念");
      expect(r.round).toBe("E-PM3");
    }
  });

  test("parsePmCidLine normalises a double-namespace cid and fails on malformed", () => {
    const r = parsePmCidLine("PM-cid: code-generation:code-generation:c2 incident=x round=E-PM1");
    expect(r.ok && r.cid).toBe("code-generation:c2");
    expect(parsePmCidLine("PM-cid: no round token here").ok).toBe(false);
    expect(parsePmCidLine("totally unrelated line").ok).toBe(false);
  });
});

describe("GoA corpus scanner/extractor", () => {
  test.each([1, 2, 4])("scanGoaHeads uses one production forward loop (N=%i)", (n) => {
    const block = "GoA[E-SCALE]: c1 1x1\n";
    const text = block.repeat(n);
    const scan = scanGoaHeads(text);
    expect(scan.offsets).toHaveLength(n);
    expect(extractGoaRecords(text)).toHaveLength(n);
    expect(scan.execCalls).toBe(scan.offsets.length + 1);
    for (let i = 1; i < scan.offsets.length; i++) expect(scan.offsets[i]).toBeGreaterThan(scan.offsets[i - 1]);
  });

  test("extractGoaRecords separates same-line heads and preserves invalid trailing separators", () => {
    const text =
      "prefix GoA[E-A]: c1 1x1 / GoA[E-B-C]: C2 2x2) provenance\n" +
      "GoA[E-D]: c3 3x3 /\n";
    expect(extractGoaRecords(text)).toEqual([
      "GoA[E-A]: c1 1x1",
      "GoA[E-B-C]: C2 2x2",
      "GoA[E-D]: c3 3x3 /",
    ]);
    expect(parseGoaLine(extractGoaRecords(text)[2]).ok).toBe(false);
  });

  test("provenance before a later same-line head preserves an invalid trailing separator", () => {
    for (const provenance of [") prose ", "<!-- cid:x --> prose "]) {
      const records = extractGoaRecords(`GoA[E-A]: c1 1x1 /${provenance}GoA[E-B]: c2 2x1`);
      expect(records).toEqual(["GoA[E-A]: c1 1x1 /", "GoA[E-B]: c2 2x1"]);
      const first = parseGoaLine(records[0]);
      expect(first.ok).toBe(false);
      if (!first.ok) expect(first.error.startsWith("sparse/empty-segment:")).toBe(true);
    }
  });
});

describe("E-code occurrence matcher", () => {
  test("multi-segment matching expands the token without changing occurrence count", () => {
    const corpus = "E-PM1 E-SDE-CG4 E-APG-CG13";
    const oldMatches = corpus.match(/\bE-[A-Z0-9]+/g) ?? [];
    const newMatches = corpus.match(ECODE_RE) ?? [];
    expect(newMatches).toHaveLength(oldMatches.length);
    expect(newMatches).toEqual(["E-PM1", "E-SDE-CG4", "E-APG-CG13"]);
  });
});

// ---------------------------------------------------------------------------
// Issue #1226: hyphenated multi-segment E-codes (e.g. E-TPR-RE, E-SDE-CG4)
// must parse — the ADR-4 schema regex previously stopped at the first hyphen
// and rejected every real team.md GoA/PM-cid line carrying a multi-segment
// code. The captured ecode is returned verbatim (no transform).
// ---------------------------------------------------------------------------

describe("PhaseBSchemas multi-segment E-codes (Issue #1226)", () => {
  test("parseGoaLine accepts a hyphenated multi-segment E-code, verbatim", () => {
    const r = parseGoaLine("GoA[E-TPR-RE]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ecode).toBe("E-TPR-RE");
      expect(r.votes).toEqual([3, 0, 0, 0, 0, 0, 0, 0]);
    }
  });

  test("parseGoaLine accepts other real team.md multi-segment forms", () => {
    const a = parseGoaLine("GoA[E-SDE-CG4]: 1x1 2x0 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.ecode).toBe("E-SDE-CG4");
    const b = parseGoaLine("GoA[E-APG-CG13]: 1x2 2x0 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(b.ok).toBe(true);
    if (b.ok) expect(b.ecode).toBe("E-APG-CG13");
  });

  test("parseGoaLine keeps single-segment backward compatibility", () => {
    const a = parseGoaLine("GoA[E-PM1]: 1x4 2x0 3x1 4x0 5x0 6x2 7x0 8x0");
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.ecode).toBe("E-PM1");
    const b = parseGoaLine("GoA[E-PM9]: 1x3 2x0 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(b.ok).toBe(true);
    if (b.ok) expect(b.ecode).toBe("E-PM9");
  });

  test("parsePmCidLine accepts a multi-segment round token", () => {
    const r = parsePmCidLine("PM-cid: reverse-engineering:rescan-base-ancestry incident=x round=E-TPR-RE");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.round).toBe("E-TPR-RE");
  });

  test("parsePmCidLine keeps single-segment round backward compatibility", () => {
    const r = parsePmCidLine("PM-cid: requirements-analysis:merge-approval-latency incident=x round=E-PM3");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.round).toBe("E-PM3");
  });

  test("parseGoaLine accepts the sparse per-subquestion form", () => {
    const r = parseGoaLine("GoA[E-SMF-BT]: c1 2x2 7x1 / c2 1x3");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.votes).toEqual([3, 2, 0, 0, 0, 0, 1, 0]);
  });
});
