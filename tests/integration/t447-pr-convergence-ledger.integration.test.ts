import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GhRunner } from "../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts";
import { parsePrRef } from "../../plugins/pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  extractTerminalRefs,
  fetchAllReviewThreads,
  isBotAuthor,
  ReviewThread,
  Severity,
  ThreadLedger,
} from "../../plugins/pr-convergence/tools/pr-convergence-ledger.ts";
import { classifyThread } from "../../plugins/pr-convergence/tools/pr-convergence-predicate.ts";

// U2 convergence-toolchain (C4 ledger). Integration layer: reads the measured
// GraphQL fixtures from the real filesystem. Fixture provenance and the
// severity vocabulary table live in tests/fixtures/pr-convergence/README.md.

const FIXTURES = join(import.meta.dir, "..", "fixtures", "pr-convergence");

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, `${name}.graphql.json`), "utf-8");
}

function threadsOf(name: string): readonly unknown[] {
  const parsed = JSON.parse(fixture(name)) as {
    data: { repository: { pullRequest: { reviewThreads: { nodes: unknown[] } } } };
  };
  return parsed.data.repository.pullRequest.reviewThreads.nodes;
}

/** A runner that replays the named fixture pages, one per call. */
function pagingRunner(names: readonly string[]) {
  const argvs: (readonly string[])[] = [];
  const gh: GhRunner = async (argv) => {
    argvs.push(argv);
    const name = names[Math.min(argvs.length - 1, names.length - 1)] as string;
    return { ok: true, value: fixture(name) };
  };
  return { argvs, gh };
}

const REF = parsePrRef("amadeus-dlc/amadeus", "2268");
if (REF === null) throw new Error("fixture ref must parse");

function buildFrom(name: string) {
  const threads = threadsOf(name).map((node) => {
    const parsed = ReviewThread.parse(node);
    if (!parsed.ok) throw new Error(`fixture thread failed to parse: ${parsed.error.reason}`);
    return parsed.value;
  });
  return ThreadLedger.build(REF as NonNullable<typeof REF>, threads, classifyThread);
}

describe("isBotAuthor — BR-U2-3", () => {
  test("only __typename Bot counts, never a login", () => {
    expect(isBotAuthor({ __typename: "Bot", login: "coderabbitai" })).toBe(true);
    expect(isBotAuthor({ __typename: "User", login: "coderabbitai" })).toBe(false);
    expect(isBotAuthor({ __typename: "Organization", login: "cursor" })).toBe(false);
  });

  test("the ledger source contains no static bot-login allow-list", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "..", "plugins", "pr-convergence", "tools", "pr-convergence-ledger.ts"),
      "utf-8",
    );
    // Bot names may appear in prose, but never inside a string literal that
    // code could compare a login against.
    expect(source).not.toMatch(/["'`]coderabbitai["'`]/);
    expect(source).not.toMatch(/["'`]cursor["'`]/);
  });
});

describe("Severity.parse — BR-U2-10, measured vocabulary only", () => {
  test("maps every measured CodeRabbit label", () => {
    expect(Severity.parse("_🎯 Functional Correctness_ | _🔴 Critical_ | _⚡ Quick win_")).toBe(
      "critical",
    );
    expect(Severity.parse("_🎯 Functional Correctness_ | _🟠 Major_ | _⚡ Quick win_")).toBe("major");
    expect(Severity.parse("_📐 Maintainability_ | _🟡 Minor_ | _⚡ Quick win_")).toBe("minor");
    expect(Severity.parse("_🚀 Performance_ | _🔵 Trivial_ | _💤 Low value_")).toBe("info");
  });

  test("maps every measured Cursor label", () => {
    expect(Severity.parse("### Ballot accepted\n\n**Medium Severity**\n")).toBe("minor");
    expect(Severity.parse("### Placeholder ballot\n\n**Low Severity**\n")).toBe("info");
  });

  test("returns null for prose with no structured severity — never a guess", () => {
    expect(Severity.parse("これは重大な問題だと思います。")).toBeNull();
    expect(Severity.parse("")).toBeNull();
  });

  test("returns null for an unmeasured label rather than extrapolating a scale", () => {
    expect(Severity.parse("**Blocker Severity**")).toBeNull();
    expect(Severity.parse("_🟣 Cosmetic_")).toBeNull();
  });
});

describe("extractTerminalRefs — BR-U2-9 / FR-4c", () => {
  test("extracts issue-or-pr references and commit-shaped hex, in reply order", () => {
    expect(extractTerminalRefs("734850b02 で是正しました。#1971 の互換も維持。")).toEqual([
      "734850b02",
      "#1971",
    ]);
  });

  test("ignores hex runs that are too short or too long to be a commit", () => {
    expect(extractTerminalRefs(`abcdef と ${"a".repeat(41)}`)).toEqual([]);
  });

  test("returns an empty list for a reply that terminates nothing", () => {
    expect(extractTerminalRefs("了解です。対応不要と判断しました。")).toEqual([]);
  });

  test("deduplicates repeated references", () => {
    expect(extractTerminalRefs("#12 と #12 と 734850b02 と 734850b02")).toEqual(["#12", "734850b02"]);
  });

  test("stays linear on a 100 KB adversarial body (regex-linearity-untrusted-input)", () => {
    const adversarial = `${"#".repeat(50_000)}${"a".repeat(50_000)}`;
    expect(adversarial.length).toBeGreaterThanOrEqual(100_000);
    const started = performance.now();
    extractTerminalRefs(adversarial);
    const first = performance.now() - started;
    const doubled = adversarial + adversarial;
    const startedTwice = performance.now();
    extractTerminalRefs(doubled);
    const second = performance.now() - startedTwice;
    // Linear scan: doubling the input must not blow up super-linearly, and the
    // absolute time must stay far below any plausible timeout.
    expect(first).toBeLessThan(250);
    expect(second).toBeLessThan(500);
  });

  test("Severity.parse stays linear on a 100 KB adversarial body", () => {
    const adversarial = `${"_".repeat(60_000)}${"*".repeat(60_000)}`;
    const started = performance.now();
    expect(Severity.parse(adversarial)).toBeNull();
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe("ReviewThread.parse — parse-don't-validate, no body retained", () => {
  test("digests comment bodies instead of keeping them", () => {
    const node = threadsOf("measured-pr-2268")[0];
    const parsed = ReviewThread.parse(node);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const raw = JSON.stringify(node);
    const kept = JSON.stringify(parsed.value);
    expect(raw).toContain("プロトタイプ継承");
    expect(kept).not.toContain("プロトタイプ継承");
    for (const comment of parsed.value.comments) {
      expect(comment.bodyDigest).toMatch(/^sha256:[0-9a-f]{16}$/);
    }
  });

  test("keeps severity and terminal refs, which are extracted before digesting", () => {
    const parsed = ReviewThread.parse(threadsOf("measured-pr-2268")[0]);
    if (!parsed.ok) throw new Error("must parse");
    expect(parsed.value.comments[0]?.severity).toBe("major");
    expect(parsed.value.comments[1]?.terminalRefs).toContain("734850b02");
  });

  test("rejects a malformed node with a typed error", () => {
    expect(ReviewThread.parse({ id: 7 }).ok).toBe(false);
    expect(ReviewThread.parse(null).ok).toBe(false);
    expect(ReviewThread.parse({ id: "x", isResolved: "yes", isOutdated: false, comments: { nodes: [] } }).ok).toBe(
      false,
    );
  });
});

describe("fetchAllReviewThreads — BR-U2-4 paging", () => {
  test("follows hasNextPage until the last page and returns every thread", async () => {
    const runner = pagingRunner(["synthetic-paged-page1", "synthetic-paged-page2"]);
    const out = await fetchAllReviewThreads(runner.gh, REF as NonNullable<typeof REF>);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value).toHaveLength(4);
    expect(runner.argvs).toHaveLength(2);
    // The second request carries the cursor the first page reported.
    expect(runner.argvs[0]?.some((t) => t.startsWith("after="))).toBe(false);
    expect(runner.argvs[1]).toContain("after=SYNTHETIC_CURSOR_PAGE_2");
  });

  test("a single-page response makes exactly one request", async () => {
    const runner = pagingRunner(["measured-pr-2268"]);
    const out = await fetchAllReviewThreads(runner.gh, REF as NonNullable<typeof REF>);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value).toHaveLength(7);
    expect(runner.argvs).toHaveLength(1);
  });

  test("a gh failure aborts with a typed error — never a partial or empty ledger", async () => {
    const gh: GhRunner = async () => ({
      ok: false,
      error: { kind: "command-failed", exitCode: 1, stderrDigest: "sha256:0000000000000000" },
    });
    const out = await fetchAllReviewThreads(gh, REF as NonNullable<typeof REF>);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.kind).toBe("gh");
  });

  test("a mid-paging failure aborts rather than returning the first page", async () => {
    let call = 0;
    const gh: GhRunner = async () => {
      call += 1;
      if (call === 1) return { ok: true, value: fixture("synthetic-paged-page1") };
      return { ok: false, error: { kind: "not-authenticated" } };
    };
    const out = await fetchAllReviewThreads(gh, REF as NonNullable<typeof REF>);
    expect(out.ok).toBe(false);
  });
});

describe("ThreadLedger — classification, human-only separation and terminalisation", () => {
  test("the measured all-resolved PR yields seven resolved threads and no violation", () => {
    const ledger = buildFrom("measured-pr-2268");
    expect(ledger.count("resolved")).toBe(7);
    expect(ledger.count("replied-unresolved")).toBe(0);
    expect(ledger.count("ignored")).toBe(0);
    expect(ledger.violating()).toEqual([]);
    expect(ledger.humanOnly).toEqual([]);
  });

  test("the measured replied-unresolved PR is the BR-U2-1 red case", () => {
    const ledger = buildFrom("measured-pr-1945");
    expect(ledger.count("replied-unresolved")).toBe(2);
    expect(ledger.violating()).toHaveLength(2);
  });

  test("the measured bot-only unresolved PR yields ignored threads", () => {
    const ledger = buildFrom("measured-pr-2269");
    expect(ledger.count("ignored")).toBe(9);
    expect(ledger.violating()).toHaveLength(9);
  });

  test("human-only threads are recorded separately, not counted as violations", () => {
    const ledger = buildFrom("synthetic-paged-page1");
    expect(ledger.humanOnly.map(String)).toEqual(["PRRT_synthetic_humanOnly"]);
    expect(ledger.count("replied-unresolved")).toBe(1);
    expect(ledger.violating()).toHaveLength(1);
  });

  test("terminalised threads are resolved AND carry a reference in the last human reply", () => {
    const ledger = buildFrom("synthetic-paged-page2");
    const terminal = ledger.terminalized().map((t) => String(t.id));
    expect(terminal).toEqual(["PRRT_synthetic_terminalized"]);
  });

  test("the measured all-resolved PR terminalises every thread whose reply cites a commit", () => {
    const ledger = buildFrom("measured-pr-2268");
    expect(ledger.terminalized().length).toBe(7);
  });

  test("every classified thread carries exactly one class — nothing is unclassified", () => {
    const ledger = buildFrom("measured-pr-2268");
    const total =
      ledger.count("resolved") +
      ledger.count("outdated") +
      ledger.count("replied-unresolved") +
      ledger.count("ignored");
    expect(total).toBe(ledger.threads.length);
    expect(ledger.threads.length + ledger.humanOnly.length).toBe(7);
  });

  test("summary exposes the counts the report renders from", () => {
    const summary = buildFrom("measured-pr-2269").summary();
    expect(summary).toEqual({
      resolved: 0,
      outdated: 0,
      repliedUnresolved: 0,
      ignored: 9,
      humanOnly: 0,
      terminalized: 0,
    });
  });
});
