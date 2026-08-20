// covers: function:detectCallsites function:buildCensus function:diffAgainstAllowlist
//
// U7 (callsite-migration) — the call-site guard's pure core (VER-4, BR-7/8/12).
//
// The guard detects direct legacy writer calls, v1 `serializeJournalEntry`
// calls, and legacy `observe()` / `observeSubprocess()` usage, compares the
// census against a committed allowlist, and admits SHRINKAGE ONLY: a new site,
// or one more site in a file already listed, is a CI rejection.
//
// The allowlist is keyed by file + symbol COUNT, deliberately not by line
// number: line pins go stale the moment an unrelated edit shifts a file, and
// the project has already paid for that failure mode twice
// (cid:code-generation:allowlist-line-pin-stale). Counts still give the
// monotone-decrease property BR-12 requires.

import { describe, expect, test } from "bun:test";
import {
  buildCensus,
  detectCallsites,
  diffAgainstAllowlist,
  runCheck,
  totalSites,
} from "../callsite-guard.ts";

describe("detectCallsites — what counts as a call site", () => {
  test("finds each guarded symbol's call, with its file and line", () => {
    const source = [
      'import { appendAuditEntry } from "./amadeus-audit.ts";', // import: not a call site
      "function run() {",
      '  appendAuditEntry("STAGE_STARTED", fields, pd);',
      "  observe(pd, () => work());",
      "}",
    ].join("\n");

    const found = detectCallsites("core/x.ts", source);

    expect(found).toEqual([
      { file: "core/x.ts", line: 3, symbol: "appendAuditEntry" },
      { file: "core/x.ts", line: 4, symbol: "observe" },
    ]);
  });

  test("imports, comments and the writer's own declaration are not call sites", () => {
    const source = [
      'import { appendAuditEntryUnlocked } from "./amadeus-audit.ts";',
      "// appendAuditEntry(...) is the legacy writer — see FR-MIG-1",
      " * observeSubprocess() moved onto the Trace API",
      "export function appendAuditEntry(",
      "export function appendAuditEntryUnlocked(",
    ].join("\n");

    expect(detectCallsites("core/amadeus-audit.ts", source)).toEqual([]);
  });

  test("a call reached through a namespace still counts (over-detection is the safe side)", () => {
    const source = 'audit.appendAuditEntryUnlocked("ERROR_LOGGED", fields, pd);';

    expect(detectCallsites("core/amadeus-lib.ts", source)).toEqual([
      { file: "core/amadeus-lib.ts", line: 1, symbol: "appendAuditEntryUnlocked" },
    ]);
  });

  test("a bare identifier without a call is not a call site", () => {
    expect(detectCallsites("core/x.ts", "const fn = appendAuditEntry;")).toEqual([]);
  });

  test("detects v1 serializer calls so production writers cannot hide from the gate", () => {
    expect(detectCallsites("core/x.ts", "serializeJournalEntry(entry);")).toEqual([
      { file: "core/x.ts", line: 1, symbol: "serializeJournalEntry" },
    ]);
  });

  // Regression (PR #1733 Bugbot, Medium): one `RegExp.test` per line counted a
  // line with two legacy calls as ONE site, so a legacy call appended to an
  // already-allowlisted line was invisible to the shrink-only ratchet.
  test("every call on a line is counted, not just the first", () => {
    const source = 'appendAuditEntry("A", f, pd); appendAuditEntry("B", f, pd);';

    expect(detectCallsites("core/x.ts", source)).toEqual([
      { file: "core/x.ts", line: 1, symbol: "appendAuditEntry" },
      { file: "core/x.ts", line: 1, symbol: "appendAuditEntry" },
    ]);
    expect(buildCensus(detectCallsites("core/x.ts", source))).toEqual({
      "core/x.ts": { appendAuditEntry: 2 },
    });
  });

  test("counts each distinct symbol's repeats on a shared line independently", () => {
    const source = "observeSubprocess(a); observeSubprocess(b); appendAuditEntryUnlocked(c);";

    expect(buildCensus(detectCallsites("core/x.ts", source))).toEqual({
      "core/x.ts": { observeSubprocess: 2, appendAuditEntryUnlocked: 1 },
    });
  });
});

describe("buildCensus / totalSites", () => {
  test("groups matches by file and symbol with counts", () => {
    const census = buildCensus([
      { file: "a.ts", line: 1, symbol: "appendAuditEntry" },
      { file: "a.ts", line: 9, symbol: "appendAuditEntry" },
      { file: "a.ts", line: 3, symbol: "observe" },
      { file: "b.ts", line: 2, symbol: "observe" },
    ]);

    expect(census).toEqual({
      "a.ts": { appendAuditEntry: 2, observe: 1 },
      "b.ts": { observe: 1 },
    });
    expect(totalSites(census)).toBe(4);
  });
});

describe("diffAgainstAllowlist — the shrink-only ratchet (BR-8, BR-12)", () => {
  const allowlist = {
    description: "test",
    direction: "shrink-only" as const,
    total: 3,
    sites: { "a.ts": { appendAuditEntry: 2 }, "b.ts": { observe: 1 } },
  };

  test("an unchanged census passes", () => {
    const verdict = diffAgainstAllowlist(allowlist.sites, allowlist);
    expect(verdict).toEqual({ kind: "ok", total: 3, removed: [] });
  });

  test("shrinkage passes and names what shrank", () => {
    const verdict = diffAgainstAllowlist({ "a.ts": { appendAuditEntry: 1 } }, allowlist);

    expect(verdict.kind).toBe("ok");
    expect(verdict.kind === "ok" && verdict.total).toBe(1);
    expect(verdict.kind === "ok" && verdict.removed.join(" ")).toContain("a.ts");
    expect(verdict.kind === "ok" && verdict.removed.join(" ")).toContain("b.ts");
  });

  test("a brand-new file is a violation", () => {
    const verdict = diffAgainstAllowlist({ ...allowlist.sites, "c.ts": { appendAuditEntry: 1 } }, allowlist);

    expect(verdict.kind).toBe("violations");
    expect(verdict.kind === "violations" && verdict.added.join(" ")).toContain("c.ts");
  });

  test("one MORE call in an already-listed file is a violation", () => {
    const verdict = diffAgainstAllowlist({ "a.ts": { appendAuditEntry: 3 }, "b.ts": { observe: 1 } }, allowlist);

    expect(verdict.kind).toBe("violations");
    expect(verdict.kind === "violations" && verdict.added.join(" ")).toContain("a.ts");
    expect(verdict.kind === "violations" && verdict.added.join(" ")).toContain("appendAuditEntry");
  });

  test("a new symbol in an already-listed file is a violation", () => {
    const verdict = diffAgainstAllowlist({ "a.ts": { appendAuditEntry: 2, observe: 1 }, "b.ts": { observe: 1 } }, allowlist);

    expect(verdict.kind).toBe("violations");
    expect(verdict.kind === "violations" && verdict.added.join(" ")).toContain("observe");
  });

  test("the executable gate rejects a deliberately planted serializer call site", () => {
    expect(runCheck({
      census: { "core/planted.ts": { serializeJournalEntry: 1 } },
    })).toBe(1);
  });
});
