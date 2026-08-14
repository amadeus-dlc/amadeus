// covers: file:plugins/github-pr-convergence/tools/pr-convergence-predicate.ts
// size: small
//
// Bolt landed-report (#2401): the pull-request lifecycle vocabulary and the
// landed-verdict constructors. Pure functions only — no filesystem, no process.

import { describe, expect, test } from "bun:test";
import type { RawPrState } from "../../plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts";
import {
  type ConvergenceVerdict,
  labeledVerdict,
  LandedFacts,
  landedVerdict,
  PrLifecycleState,
} from "../../plugins/github-pr-convergence/tools/pr-convergence-predicate.ts";

const MERGED_RAW: RawPrState = {
  mergeable: "UNKNOWN",
  mergeStateStatus: "UNKNOWN",
  title: "",
  body: "",
  state: "MERGED",
  mergedAt: "2026-08-07T01:00:00Z",
  mergeCommitOid: "0123456789abcdef0123456789abcdef01234567",
  checkRollupState: "SUCCESS",
};

describe("PrLifecycleState.parse — closed three-value vocabulary (AC-1b)", () => {
  test("accepts the three GitHub pull-request states", () => {
    expect(PrLifecycleState.parse("OPEN")).toBe("OPEN");
    expect(PrLifecycleState.parse("CLOSED")).toBe("CLOSED");
    expect(PrLifecycleState.parse("MERGED")).toBe("MERGED");
  });

  test("an unknown value throws loudly instead of mapping to a default", () => {
    expect(() => PrLifecycleState.parse("REOPENED")).toThrow(/unknown/);
    expect(() => PrLifecycleState.parse("")).toThrow(/unknown/);
    expect(() => PrLifecycleState.parse("merged")).toThrow(/unknown/);
  });
});

describe("LandedFacts.parse — the facts a landed report records", () => {
  test("parses the merged fields off a MERGED raw state", () => {
    expect(LandedFacts.parse(MERGED_RAW)).toEqual({
      mergedAt: "2026-08-07T01:00:00Z",
      mergeCommitOid: "0123456789abcdef0123456789abcdef01234567",
      checkRollupState: "SUCCESS",
    });
  });

  test("a null check rollup stays null — a merged PR may have had no checks", () => {
    expect(LandedFacts.parse({ ...MERGED_RAW, checkRollupState: null }).checkRollupState).toBeNull();
  });

  test("a missing mergedAt throws — MERGED without a merge instant is malformed", () => {
    expect(() => LandedFacts.parse({ ...MERGED_RAW, mergedAt: null })).toThrow(/mergedAt/);
  });

  test("a missing merge commit oid throws", () => {
    expect(() => LandedFacts.parse({ ...MERGED_RAW, mergeCommitOid: null })).toThrow(
      /mergeCommit/,
    );
  });

  test("a non-MERGED state violates the precondition and throws", () => {
    expect(() => LandedFacts.parse({ ...MERGED_RAW, state: "OPEN" })).toThrow(/MERGED/);
  });
});

describe("labeledVerdict — the verdict label is derived, never chosen", () => {
  const base: ConvergenceVerdict = {
    converged: true,
    violating: { repliedUnresolved: 0, ignored: 0 },
    mergeState: "CLEAN",
    mergeableResolution: "resolved",
  };

  test("a converged verdict is labelled converged, fields preserved", () => {
    expect(labeledVerdict(base)).toEqual({ ...base, verdict: "converged" });
  });

  test("a non-converged verdict is labelled not-converged", () => {
    const notConverged: ConvergenceVerdict = {
      converged: false,
      violating: { repliedUnresolved: 2, ignored: 1 },
      mergeState: "BLOCKED",
      mergeableResolution: "unknown-exhausted",
    };
    expect(labeledVerdict(notConverged)).toEqual({ ...notConverged, verdict: "not-converged" });
  });
});

describe("landedVerdict — the factual record of a merged pull request", () => {
  test("is never converged, carries MERGED, and violates nothing", () => {
    expect(landedVerdict(LandedFacts.parse(MERGED_RAW))).toEqual({
      converged: false,
      verdict: "landed",
      violating: { repliedUnresolved: 0, ignored: 0 },
      mergeState: "MERGED",
      mergeableResolution: "not-applicable",
    });
  });
});
