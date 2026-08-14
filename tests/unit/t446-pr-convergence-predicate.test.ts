import { describe, expect, test } from "bun:test";
import type { PrRef } from "../../plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts";
import type { ThreadClass } from "../../plugins/github-pr-convergence/tools/pr-convergence-predicate.ts";
import {
  classifyThread,
  evaluateConvergence,
  MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS,
  MERGEABLE_UNKNOWN_RETRY_MAX,
  resolveMergeable,
  KNOWN_MERGE_STATE_STATUSES,
  Mergeable,
  MergeStateStatus,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-predicate.ts";

// U2 convergence-toolchain (C3 predicate). Pure layer only: no filesystem,
// no process spawn. business-logic-model.md § classifyThread decision table.

const bot = (login = "coderabbitai") => ({ authorTypename: "Bot", authorLogin: login });
const human = (login = "j5ik2o") => ({ authorTypename: "User", authorLogin: login });

const classified = (threadClass: ThreadClass) => ({ kind: "classified" as const, threadClass });

describe("classifyThread — BR-U2-2 decision table", () => {
  test("an unresolved bot thread with a later non-bot reply is replied-unresolved", () => {
    expect(
      classifyThread({ isResolved: false, isOutdated: false, comments: [bot(), human()] }),
    ).toEqual(classified("replied-unresolved"));
  });

  test("resolved wins over every other row", () => {
    expect(
      classifyThread({ isResolved: true, isOutdated: true, comments: [bot(), human()] }),
    ).toEqual(classified("resolved"));
  });

  test("outdated is its own class, never silently dropped", () => {
    expect(
      classifyThread({ isResolved: false, isOutdated: true, comments: [bot()] }),
    ).toEqual(classified("outdated"));
  });

  test("an unresolved bot thread with no non-bot reply is ignored", () => {
    expect(
      classifyThread({ isResolved: false, isOutdated: false, comments: [bot(), bot()] }),
    ).toEqual(classified("ignored"));
  });

  test("a thread with no bot comment at all is human-only, not a convergence subject", () => {
    expect(
      classifyThread({ isResolved: false, isOutdated: false, comments: [human(), human("other")] }),
    ).toEqual({ kind: "human-only" });
  });

  test("a leading non-bot comment does not count as a reply — the window starts at the first bot", () => {
    // Only the human BEFORE the bot exists, so there is no reply after the bot.
    expect(
      classifyThread({ isResolved: false, isOutdated: false, comments: [human(), bot()] }),
    ).toEqual(classified("ignored"));
  });

  test("a leading non-bot comment followed by bot then human is replied-unresolved", () => {
    expect(
      classifyThread({
        isResolved: false,
        isOutdated: false,
        comments: [human(), bot(), human()],
      }),
    ).toEqual(classified("replied-unresolved"));
  });

  test("an empty thread has no bot comment and is human-only", () => {
    expect(classifyThread({ isResolved: false, isOutdated: false, comments: [] })).toEqual({
      kind: "human-only",
    });
  });
});

describe("MergeStateStatus.parse — ADR-2 fail-closed vocabulary", () => {
  test("accepts every known GitHub mergeStateStatus value", () => {
    for (const known of KNOWN_MERGE_STATE_STATUSES) {
      expect(MergeStateStatus.parse(known)).toBe(known);
    }
    // The measured fixtures exercise a subset; the union itself is the contract.
    expect([...KNOWN_MERGE_STATE_STATUSES].sort()).toEqual([
      "BEHIND",
      "BLOCKED",
      "CLEAN",
      "DIRTY",
      "DRAFT",
      "HAS_HOOKS",
      "UNKNOWN",
      "UNSTABLE",
    ]);
  });

  test("throws on an unknown value rather than degrading it", () => {
    expect(() => MergeStateStatus.parse("MOSTLY_FINE")).toThrow(/unknown mergeStateStatus/);
  });

  test("throws on a lowercased known value — no normalisation guessing", () => {
    expect(() => MergeStateStatus.parse("clean")).toThrow(/unknown mergeStateStatus/);
  });
});

describe("Mergeable.parse", () => {
  test("accepts the three GitHub mergeable values", () => {
    expect(Mergeable.parse("MERGEABLE")).toBe("MERGEABLE");
    expect(Mergeable.parse("CONFLICTING")).toBe("CONFLICTING");
    expect(Mergeable.parse("UNKNOWN")).toBe("UNKNOWN");
  });

  test("throws on an unknown value", () => {
    expect(() => Mergeable.parse("MAYBE")).toThrow(/unknown mergeable/);
  });
});

describe("evaluateConvergence — BR-U2-1, the single definition of converged", () => {
  const clean = {
    repliedUnresolved: 0,
    ignored: 0,
    state: { mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" },
    resolution: "resolved",
  } as const;

  test("all four conjuncts satisfied yields converged", () => {
    const verdict = evaluateConvergence(clean);
    expect(verdict.converged).toBe(true);
    expect(verdict.violating).toEqual({ repliedUnresolved: 0, ignored: 0 });
    expect(verdict.mergeState).toBe("CLEAN");
    expect(verdict.mergeableResolution).toBe("resolved");
  });

  test("a single replied-unresolved thread breaks convergence", () => {
    expect(evaluateConvergence({ ...clean, repliedUnresolved: 1 }).converged).toBe(false);
  });

  test("a single ignored thread breaks convergence", () => {
    expect(evaluateConvergence({ ...clean, ignored: 1 }).converged).toBe(false);
  });

  test("a non-CLEAN merge state breaks convergence even with an empty ledger", () => {
    for (const status of KNOWN_MERGE_STATE_STATUSES.filter((s) => s !== "CLEAN")) {
      expect(
        evaluateConvergence({ ...clean, state: { ...clean.state, mergeStateStatus: status } })
          .converged,
      ).toBe(false);
    }
  });

  test("an exhausted UNKNOWN mergeable breaks convergence", () => {
    expect(evaluateConvergence({ ...clean, resolution: "unknown-exhausted" }).converged).toBe(
      false,
    );
  });

  test("outdated and resolved threads are not violations", () => {
    // The ledger counts them, but only replied-unresolved and ignored gate.
    expect(evaluateConvergence(clean).violating).toEqual({ repliedUnresolved: 0, ignored: 0 });
  });
});

describe("resolveMergeable — BR-U2-5 / ADR-4 retry, driven by an injected clock", () => {
  const ref = { repo: "amadeus-dlc/amadeus", number: 1 } as unknown as PrRef;
  const gh = (async () => ({ ok: true as const, value: "" })) as never;

  /** A fetcher returning the given raw states in order, recording each call. */
  function scriptedFetch(states: readonly { mergeable: string; mergeStateStatus: string }[]) {
    const calls: number[] = [];
    return {
      calls,
      fetch: async () => {
        const next = states[calls.length] ?? states[states.length - 1];
        calls.push(calls.length);
        return { ok: true as const, value: next as { mergeable: string; mergeStateStatus: string } };
      },
    };
  }

  function recordingSleep() {
    const slept: number[] = [];
    return { slept, sleep: async (ms: number) => void slept.push(ms) };
  }

  test("a first-shot MERGEABLE resolves with no sleeping at all", async () => {
    const f = scriptedFetch([{ mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" }]);
    const clock = recordingSleep();
    const out = await resolveMergeable(gh, ref, { fetchRawPrState: f.fetch, sleep: clock.sleep });
    expect(out.kind).toBe("resolved");
    expect(f.calls).toHaveLength(1);
    expect(clock.slept).toEqual([]);
  });

  test("CONFLICTING is a resolution too — retry is only for UNKNOWN", async () => {
    const f = scriptedFetch([{ mergeable: "CONFLICTING", mergeStateStatus: "DIRTY" }]);
    const clock = recordingSleep();
    const out = await resolveMergeable(gh, ref, { fetchRawPrState: f.fetch, sleep: clock.sleep });
    expect(out.kind).toBe("resolved");
    expect(clock.slept).toEqual([]);
  });

  test("an UNKNOWN that later settles resolves after the observed retries", async () => {
    const f = scriptedFetch([
      { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" },
      { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" },
      { mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" },
    ]);
    const clock = recordingSleep();
    const out = await resolveMergeable(gh, ref, { fetchRawPrState: f.fetch, sleep: clock.sleep });
    expect(out.kind).toBe("resolved");
    if (out.kind === "resolved") expect(out.state.mergeStateStatus).toBe("CLEAN");
    expect(f.calls).toHaveLength(3);
    expect(clock.slept).toEqual([
      MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS,
      MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS,
    ]);
  });

  test("a permanent UNKNOWN exhausts exactly MERGEABLE_UNKNOWN_RETRY_MAX retries", async () => {
    const f = scriptedFetch([{ mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" }]);
    const clock = recordingSleep();
    const out = await resolveMergeable(gh, ref, { fetchRawPrState: f.fetch, sleep: clock.sleep });
    expect(out.kind).toBe("unknown-exhausted");
    // One initial attempt plus MAX retries, each retry preceded by one interval.
    expect(f.calls).toHaveLength(MERGEABLE_UNKNOWN_RETRY_MAX + 1);
    expect(clock.slept).toHaveLength(MERGEABLE_UNKNOWN_RETRY_MAX);
    expect(clock.slept.reduce((a, b) => a + b, 0)).toBe(
      MERGEABLE_UNKNOWN_RETRY_MAX * MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS,
    );
  });

  test("the retry bound is the ADR-4 named constants, not a magic number", () => {
    expect(MERGEABLE_UNKNOWN_RETRY_MAX).toBe(5);
    expect(MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS).toBe(10_000);
  });

  test("a gh failure surfaces as a typed failure, never as a fabricated state", async () => {
    const clock = recordingSleep();
    const out = await resolveMergeable(gh, ref, {
      fetchRawPrState: async () => ({ ok: false as const, error: { kind: "not-authenticated" } }),
      sleep: clock.sleep,
    });
    expect(out.kind).toBe("gh-failure");
    if (out.kind === "gh-failure") expect(out.error).toEqual({ kind: "not-authenticated" });
    expect(clock.slept).toEqual([]);
  });

  test("an unknown mergeStateStatus throws out of the retry loop (fail-closed)", async () => {
    const f = scriptedFetch([{ mergeable: "MERGEABLE", mergeStateStatus: "SOMETHING_NEW" }]);
    const clock = recordingSleep();
    await expect(
      resolveMergeable(gh, ref, { fetchRawPrState: f.fetch, sleep: clock.sleep }),
    ).rejects.toThrow(/unknown mergeStateStatus/);
  });
});
