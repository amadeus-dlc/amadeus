// covers: function:detectUncheckedCasts function:buildCensus function:diffAgainstAllowlist
// size: small
//
// U4 (cast-guard) — the unchecked-cast guard's pure core (#1980, FR-3a/3b).
//
// The guard detects `JSON.parse(...) as T` — a value read off disk claiming a
// domain type without a proof — and admits SHRINKAGE ONLY against a committed
// allowlist. `as unknown` is NOT in the population: it asserts no proof and is
// the shape parse-don't-validate wants (decisions.md ADR-2).
//
// Detection is AST-based rather than line-regex because the patched class is
// routinely multi-line and holds nested parens; a single-line regex recalls
// 27% of it (ADR-2 Context). The allowlist is keyed by (file, kind) COUNT and
// never by line, so an unrelated edit that shifts a file cannot turn a later
// PR red on a pin that moved (cid:code-generation:allowlist-line-pin-stale).

import { describe, expect, test } from "bun:test";
import {
  buildCensus,
  buildResidualReport,
  detectUncheckedCasts,
  diffAgainstAllowlist,
  parseAllowlist,
  renderAllowlist,
  totalSites,
} from "../unchecked-cast-guard.ts";

describe("detectUncheckedCasts — what counts as an unchecked cast", () => {
  test("finds a JSON.parse result cast to a domain type, with its file and line", () => {
    const source = [
      'import { loadText } from "./io.ts";',
      "function load() {",
      '  const doc = JSON.parse(loadText(p, "utf-8")) as StateDoc;',
      "  return doc;",
      "}",
    ].join("\n");

    const found = detectUncheckedCasts("core/x.ts", source);

    expect(found).toEqual([{ file: "core/x.ts", line: 3, kind: "json-parse-as" }]);
  });

  test("`as unknown` and a bare parse are not debt — the safe forms stay out", () => {
    const source = [
      "const a = JSON.parse(text) as unknown;",
      "const b = JSON.parse(text);",
      "const c = raw as StateDoc;", // a cast, but not off a parse
    ].join("\n");

    expect(detectUncheckedCasts("core/x.ts", source)).toEqual([]);
  });

  test("multi-line and nested-paren forms are found — the shapes a line regex misses", () => {
    // These mirror the STRUCTURE of the patched class ADR-2 cites (a call spread
    // over lines, a nested call inside the parse, a chained assertion) — a
    // single-line regex recalls 27% of it, which is why detection is syntactic.
    // The inner callee is spelled `loadText` rather than the real `readFileSync`
    // on purpose: the size classifier scans string literals as well as code, and
    // an fs token in a fixture would push this pure file to medium. The verbatim
    // real shapes are exercised against the live corpus in the CLI test.
    const source = [
      "const spread = JSON.parse(",
      '  loadText(path, "utf-8"),',
      ") as RuntimeGraph;",
      'const nested = (JSON.parse(loadText(p, "utf-8"))) as Manifest;',
      "const chained = JSON.parse(text) as unknown as Receipts;",
    ].join("\n");

    expect(detectUncheckedCasts("core/x.ts", source)).toEqual([
      { file: "core/x.ts", line: 1, kind: "json-parse-as" },
      { file: "core/x.ts", line: 4, kind: "json-parse-as" },
      { file: "core/x.ts", line: 5, kind: "json-parse-as" },
    ]);
  });

  test("a multi-stage `as` chain is ONE claim, not one per link (#2112)", () => {
    // `JSON.parse(x) as A as B` asserts a single thing: that the parsed value is
    // a `B`. Counting each link would let one site inflate the ledger and make
    // the residual total disagree with the number of unproven reads.
    const source = ["const doc = JSON.parse(text) as Draft as StateDoc;"].join("\n");

    expect(detectUncheckedCasts("core/x.ts", source)).toEqual([
      { file: "core/x.ts", line: 1, kind: "json-parse-as" },
    ]);
  });

  test("passing through `unknown` mid-chain does not split or excuse the claim", () => {
    // BR-CG-2 exempts the form that ENDS at `unknown`: the type is still owed
    // downstream. A chain that passes through `unknown` and lands on a domain
    // type has claimed that type, so it is one site — not two, and not zero.
    const source = [
      "const a = JSON.parse(text) as Draft as unknown as StateDoc;",
      "const b = JSON.parse(text) as Draft as unknown;",
    ].join("\n");

    expect(detectUncheckedCasts("core/x.ts", source)).toEqual([
      { file: "core/x.ts", line: 1, kind: "json-parse-as" },
    ]);
  });

  test("inserting lines moves `line` but never changes what is counted", () => {
    // The property the ledger rests on: it keys by (file, kind) COUNT, so an
    // unrelated edit above a site cannot make a later run disagree.
    const body = 'const doc = JSON.parse(loadText(p, "utf-8")) as StateDoc;';
    const shifted = ["// a new comment", "", body].join("\n");

    const before = detectUncheckedCasts("core/x.ts", body);
    const after = detectUncheckedCasts("core/x.ts", shifted);

    expect(before[0]?.line).toBe(1);
    expect(after[0]?.line).toBe(3);
    expect(buildCensus(before)).toEqual(buildCensus(after));
  });
});

describe("buildCensus — the ledger's unit of account", () => {
  test("counts per (file, kind) and loses no site in the aggregation", () => {
    const matches = [
      { file: "a.ts", line: 3, kind: "json-parse-as" as const },
      { file: "a.ts", line: 9, kind: "json-parse-as" as const },
      { file: "b.ts", line: 1, kind: "json-parse-as" as const },
    ];

    const census = buildCensus(matches);

    expect(census).toEqual({ "a.ts": { "json-parse-as": 2 }, "b.ts": { "json-parse-as": 1 } });
    expect(totalSites(census)).toBe(matches.length);
  });
});

describe("diffAgainstAllowlist — the shrink-only ratchet (BR-CG-13..17)", () => {
  const allowlist = {
    description: "test",
    direction: "shrink-only" as const,
    total: 3,
    sites: { "a.ts": { "json-parse-as": 2 }, "b.ts": { "json-parse-as": 1 } },
  };

  test("an unchanged census passes", () => {
    expect(diffAgainstAllowlist(allowlist.sites, allowlist)).toEqual({ kind: "ok", total: 3, removed: [] });
  });

  test("shrinkage passes and names what shrank, so the entry can be pruned", () => {
    const verdict = diffAgainstAllowlist({ "a.ts": { "json-parse-as": 1 } }, allowlist);

    expect(verdict.kind).toBe("ok");
    expect(verdict.kind === "ok" && verdict.total).toBe(1);
    expect(verdict.kind === "ok" && verdict.removed.join(" ")).toContain("a.ts");
    expect(verdict.kind === "ok" && verdict.removed.join(" ")).toContain("b.ts");
  });

  test("a brand-new file is a violation", () => {
    const verdict = diffAgainstAllowlist({ ...allowlist.sites, "c.ts": { "json-parse-as": 1 } }, allowlist);

    expect(verdict.kind).toBe("violations");
    expect(verdict.kind === "violations" && verdict.added.join(" ")).toContain("c.ts");
  });

  test("one MORE cast in an already-listed file is a violation", () => {
    const verdict = diffAgainstAllowlist(
      { "a.ts": { "json-parse-as": 3 }, "b.ts": { "json-parse-as": 1 } },
      allowlist,
    );

    expect(verdict.kind).toBe("violations");
    expect(verdict.kind === "violations" && verdict.added.join(" ")).toContain("a.ts");
    expect(verdict.kind === "violations" && verdict.added.join(" ")).toContain("allowlist 2, measured 3");
  });

  test("the reported total always comes from the census, never from the allowlist", () => {
    // Both arms carry the measured total: the caller can never print a count it
    // did not derive from the scan.
    const violating = diffAgainstAllowlist({ "c.ts": { "json-parse-as": 4 } }, allowlist);
    expect(violating.total).toBe(4);
    expect(violating.total).not.toBe(allowlist.total);
  });
});

describe("buildResidualReport — the shape printed on every run", () => {
  test("per-file totals sum to the overall total and stay stable at zero sites", () => {
    expect(
      buildResidualReport({ "a.ts": { "json-parse-as": 2 }, "b.ts": { "json-parse-as": 1 } }, "2026-08-03T00:00:00Z"),
    ).toEqual({
      generatedAt: "2026-08-03T00:00:00Z",
      total: 3,
      byFile: { "a.ts": 2, "b.ts": 1 },
    });

    // The shape a zero-site run reports: an absent measurement and a terminal
    // zero must not look alike.
    expect(buildResidualReport({}, "2026-08-03T00:00:00Z")).toEqual({
      generatedAt: "2026-08-03T00:00:00Z",
      total: 0,
      byFile: {},
    });
  });
});

describe("parseAllowlist — the ledger is fail-closed at its only read (BR-CG-18)", () => {
  test("rejects non-object, wrong direction and non-object sites", () => {
    expect(parseAllowlist("{ not json").kind).toBe("failed");
    expect(parseAllowlist("[]").kind).toBe("failed");
    expect(parseAllowlist("null").kind).toBe("failed");
    expect(parseAllowlist('{"direction":"grow-ok","sites":{}}').kind).toBe("failed");
    expect(parseAllowlist('{"direction":"shrink-only"}').kind).toBe("failed");
    expect(parseAllowlist('{"direction":"shrink-only","sites":{}}').kind).toBe("loaded");
  });

  test("a `sites` array is unreadable, not an empty ledger", () => {
    // `typeof [] === "object"`, so an array would slip through an object check
    // and parse as a ledger holding nothing. That is the worst possible reading:
    // every existing site then looks newly added, and the guard reports a source
    // regression that did not happen instead of the ledger fault that did.
    expect(parseAllowlist('{"direction":"shrink-only","sites":[]}').kind).toBe("failed");
    expect(parseAllowlist('{"direction":"shrink-only","sites":{"a.ts":[]}}').kind).toBe("failed");
    expect(parseAllowlist('{"direction":"shrink-only","sites":{"a.ts":3}}').kind).toBe("failed");
  });

  test("counts must be non-negative integers — the ratchet compares them", () => {
    // A count that is fractional, negative or not a number has no comparison
    // against a measured count that keeps the shrink-only property meaningful.
    const of = (count: string): string => `{"direction":"shrink-only","sites":{"a.ts":{"json-parse-as":${count}}}}`;

    expect(parseAllowlist(of("1.5")).kind).toBe("failed");
    expect(parseAllowlist(of("-1")).kind).toBe("failed");
    expect(parseAllowlist(of('"2"')).kind).toBe("failed");
    expect(parseAllowlist(of("null")).kind).toBe("failed");
    expect(parseAllowlist(of("0")).kind).toBe("loaded");
    expect(parseAllowlist(of("2")).kind).toBe("loaded");
  });

  test("a rendered allowlist round-trips back through the parser", () => {
    const census = { "a.ts": { "json-parse-as": 2 } };
    const loaded = parseAllowlist(renderAllowlist(census));

    expect(loaded.kind).toBe("loaded");
    expect(loaded.kind === "loaded" && loaded.doc.sites).toEqual(census);
    expect(loaded.kind === "loaded" && loaded.doc.total).toBe(2);
    // The regeneration command travels with the ledger, so whoever reads it
    // knows how to update it.
    expect(loaded.kind === "loaded" && loaded.doc.description).toContain("--update");
  });
});
