// covers: harness-instrument:depth-artifact-census
//
// t510 — depth artifact census (Issue #2661 T1, closing #2425 AC-4).
//
// Drives the exported pure functions in-process (no spawn, no fs) so the
// judgement logic is measured by coverage rather than only exercised through a
// CLI subprocess. The fs / CLI boundary lives in
// tests/integration/t510-depth-artifact-census.integration.test.ts — size
// purity keeps this file to pure functions over literal fixtures.

import { describe, expect, test } from "bun:test";
import {
  classifyBirth,
  depthGroupOf,
  flagsRequirement,
  parseArgs,
  parseBirthTimestamp,
  summarize,
} from "../../scripts/depth-artifact-census";

// Both audit schema generations are present in the live corpus: schemaVersion 1
// writes the event name at the TOP LEVEL (`"event":"WORKFLOW_STARTED"`) while
// schemaVersion 2 nests it (`"attributes":{"Event":"WORKFLOW_STARTED"}`). A
// predicate that knows only one idiom silently reports the other generation as
// birth-unknown.
const V1_STARTED =
  '{"schemaVersion":1,"seq":1,"timestamp":"2026-07-09T08:53:13Z","event":"WORKFLOW_STARTED","fields":{"Request":"x"}}';
const V2_STARTED =
  '{"schemaVersion":2,"seq":1,"timestamp":"2026-08-07T10:10:15Z","eventName":"amadeus.workflow.started","attributes":{"Event":"WORKFLOW_STARTED","Request":"x"}}';
const V1_OTHER =
  '{"schemaVersion":1,"seq":2,"timestamp":"2026-07-09T08:00:00Z","event":"DELEGATED_APPROVAL","fields":{}}';

describe("t510 parseBirthTimestamp reads both audit schema idioms", () => {
  test("finds the schemaVersion 1 top-level event form", () => {
    expect(parseBirthTimestamp(V1_STARTED)).toBe("2026-07-09T08:53:13Z");
  });

  test("finds the schemaVersion 2 nested attributes form", () => {
    expect(parseBirthTimestamp(V2_STARTED)).toBe("2026-08-07T10:10:15Z");
  });

  test("ignores events that are not WORKFLOW_STARTED", () => {
    expect(parseBirthTimestamp(V1_OTHER)).toBeUndefined();
  });

  test("returns the EARLIEST start when a shard holds several", () => {
    expect(parseBirthTimestamp([V2_STARTED, V1_STARTED, V1_OTHER].join("\n"))).toBe("2026-07-09T08:53:13Z");
  });

  test("survives a malformed line rather than aborting the shard", () => {
    expect(parseBirthTimestamp(["{not json", V1_STARTED].join("\n"))).toBe("2026-07-09T08:53:13Z");
  });
});

describe("t510 summarize reports a nearest-rank distribution", () => {
  test("n / min / max come straight off the sample", () => {
    const d = summarize([5, 1, 9, 3]);
    expect(d).not.toBeUndefined();
    expect(d?.n).toBe(4);
    expect(d?.min).toBe(1);
    expect(d?.max).toBe(9);
  });

  test("p25 and median use nearest rank, no interpolation", () => {
    // 1..8 sorted. median = sorted[ceil(0.5*8)-1] = sorted[3] = 4.
    // p25    = sorted[ceil(0.25*8)-1] = sorted[1] = 2.
    const d = summarize([8, 7, 6, 5, 4, 3, 2, 1]);
    expect(d?.median).toBe(4);
    expect(d?.p25).toBe(2);
  });

  test("a single sample is its own every quantile", () => {
    expect(summarize([42])).toEqual({ n: 1, min: 42, p25: 42, median: 42, max: 42 });
  });

  test("an empty sample yields no distribution rather than NaN", () => {
    expect(summarize([])).toBeUndefined();
  });

  test("sorts numerically, not lexicographically", () => {
    // The default Array#sort is lexicographic, which would rank 100 below 9.
    expect(summarize([9, 100, 20])?.max).toBe(100);
  });

  test("does not mutate the caller's array", () => {
    const input = [3, 1, 2];
    summarize(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

// The depth-budget sensor landed in PR #2503 (commit fa5635f4f6e3a8, authored
// 2026-08-08T05:53:42Z). Intents born at or after that instant are the
// re-measurement population for #2425 AC-4.
const LANDING = "2026-08-08T05:53:42Z";

describe("t510 classifyBirth separates the post-landing population", () => {
  test("without --since every record counts, including birth-unknown ones", () => {
    expect(classifyBirth("2026-07-01T00:00:00Z", undefined)).toBe("all");
    expect(classifyBirth(undefined, undefined)).toBe("all");
  });

  test("a birth after the cutoff is post-landing", () => {
    expect(classifyBirth("2026-08-09T00:00:00Z", LANDING)).toBe("post");
  });

  test("the cutoff instant itself is post-landing (inclusive lower bound)", () => {
    expect(classifyBirth(LANDING, LANDING)).toBe("post");
  });

  test("a birth before the cutoff is pre-landing", () => {
    expect(classifyBirth("2026-08-08T05:53:41Z", LANDING)).toBe("pre");
  });

  test("an unresolvable birth is its own class, never folded into pre or post", () => {
    // A record whose birth cannot be read is not evidence for either side. Folding
    // it into `pre` would understate the new population; folding it into `post`
    // would fabricate re-measurement samples.
    expect(classifyBirth(undefined, LANDING)).toBe("unknown");
  });
});

describe("t510 depthGroupOf never guesses a level", () => {
  test("canonical levels pass through", () => {
    expect(depthGroupOf("Minimal")).toBe("Minimal");
    expect(depthGroupOf("standard")).toBe("Standard");
    expect(depthGroupOf("COMPREHENSIVE")).toBe("Comprehensive");
  });

  test("absent or unrecognizable depth becomes the explicit unknown group", () => {
    expect(depthGroupOf(undefined)).toBe("unknown");
    expect(depthGroupOf("")).toBe("unknown");
    expect(depthGroupOf("Deep")).toBe("unknown");
  });
});

describe("t510 flagsRequirement compares against the sensor's own ceilings", () => {
  test("Minimal flags above its 1800 B/FR ceiling", () => {
    expect(flagsRequirement("Minimal", 18010, 10)).toBe(true);
    expect(flagsRequirement("Minimal", 18000, 10)).toBe(false);
  });

  test("Standard flags above its 2400 B/FR ceiling", () => {
    expect(flagsRequirement("Standard", 24010, 10)).toBe(true);
    expect(flagsRequirement("Standard", 24000, 10)).toBe(false);
  });

  test("groups with no declared ceiling are never flagged", () => {
    expect(flagsRequirement("Comprehensive", 10_000_000, 1)).toBe(false);
    expect(flagsRequirement("unknown", 10_000_000, 1)).toBe(false);
  });

  test("compares exactly, not on the rounded per-FR figure", () => {
    // 18001 B over 10 FRs is 1800.1 B/FR — rounding first would report 1800 and
    // slip under the ceiling, the same trap the sensor documents.
    expect(flagsRequirement("Minimal", 18001, 10)).toBe(true);
  });
});

describe("t510 parseArgs is fail-closed on malformed input", () => {
  test("defaults to the whole corpus in table form", () => {
    expect(parseArgs([])).toEqual({ kind: "ok", since: undefined, json: false });
  });

  test("accepts --since and --json", () => {
    expect(parseArgs(["--since", LANDING, "--json"])).toEqual({ kind: "ok", since: LANDING, json: true });
  });

  test("rejects --since without a value", () => {
    expect(parseArgs(["--since"]).kind).toBe("error");
  });

  test("rejects a --since that is not a parsable instant", () => {
    // A silently-unparsed cutoff would compare lexicographically against real
    // timestamps and split the corpus at an arbitrary point.
    expect(parseArgs(["--since", "last tuesday"]).kind).toBe("error");
  });

  test("rejects an unknown flag rather than ignoring it", () => {
    expect(parseArgs(["--verbose"]).kind).toBe("error");
  });
});
