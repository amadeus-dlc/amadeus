// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts(resolveAutoDecision)
// size: small
//
// ADR-9: making non-uniqueness expressible must not turn ordinary progress into
// a stream of questions. The budget is fixed as a count, not a ratio — contested
// fires zero times on the mechanism-caused classes and on ordinary progress —
// and every count here is produced by running the real derivation.

import * as probes from "../helpers/recommendation-decision-points.ts";
import { describe, expect, test } from "bun:test";

import {
  censusByClass,
  mechanismDecisionPoints,
  ordinaryProgressDecisionPoints,
  type DecisionPointCase,
} from "../helpers/recommendation-decision-points.ts";

const corpus: readonly DecisionPointCase[] = [...mechanismDecisionPoints(), ...ordinaryProgressDecisionPoints()];

describe("R-16 contested does not fire on the classes RFC-0001 counted", () => {
  test("no case in the corpus ends contested, and none of them merely park either", () => {
    const observed = corpus.map((decisionPoint) => [decisionPoint.label, decisionPoint.observe()] as const);
    expect(observed.filter(([, terminal]) => terminal === "contested")).toEqual([]);
    expect(observed.filter(([, terminal]) => terminal !== "unique")).toEqual([]);
  });

  test("the corpus actually covers every class, so an empty run cannot pass as zero", () => {
    const census = censusByClass(corpus);
    expect([...census.keys()].sort()).toEqual(["ordinary-progress", "phase-gate", "s13-learnings", "walking-skeleton"]);
    expect(corpus.length).toBe(8);
  });
});

describe("R-17 the firing count is an observation derived per decision-point class", () => {
  test("the census reports each class's terminals from the runs themselves", () => {
    const census = censusByClass(corpus);
    expect(census.get("phase-gate")).toEqual({ unique: 3, contested: 0, none: 0, park: 0, invalid: 0 });
    expect(census.get("walking-skeleton")).toEqual({ unique: 2, contested: 0, none: 0, park: 0, invalid: 0 });
    expect(census.get("s13-learnings")).toEqual({ unique: 1, contested: 0, none: 0, park: 0, invalid: 0 });
    expect(census.get("ordinary-progress")).toEqual({ unique: 2, contested: 0, none: 0, park: 0, invalid: 0 });
  });

  test("the observer distinguishes every non-decided terminal, not only contested", () => {
    // Drives the ladderTerminal switch through its escalate/park/invalid arms
    // so the census can never silently misclassify a stopped ladder as unique.
    const { ladderProbeTerminals } = probes;
    expect(ladderProbeTerminals()).toEqual({ none: "none", park: "park", invalid: "invalid" });
  });

  test("a contested case is counted against its own class rather than lost", () => {
    const census = censusByClass([...corpus, {
      pointClass: "ordinary-progress",
      label: "probe:contested",
      observe: () => "contested",
    }]);
    expect(census.get("ordinary-progress")).toEqual({ unique: 2, contested: 1, none: 0, park: 0, invalid: 0 });
  });
});
