// covers: file:packages/framework/core/tools/amadeus-sensor-nfr-budget.ts
//
// #2684 stage ② — the NFR measurement predicate.
//
// Stage ① (#2686) contracted WHERE an NFR id may be declared (the closed set of
// five positions #2673 fixed for FR ids) and WHAT one looks like (uppercase
// letter-led segments joined by `-`, ending on a segment that finishes in
// digits, with category-local prefixes explicitly kept valid). This file pins
// the machine reading of that contract: the denominator every NFR measurement
// divides by.
//
// Pure functions over literal fixtures — no fs, no spawn — so the judgement
// logic is measured in-process rather than only through a subprocess, which
// `bun --coverage` does not instrument. The fs and CLI boundaries live in
// tests/integration/t514-nfr-budget-sensor.integration.test.ts.

import { describe, expect, test } from "bun:test";
import {
  NFR_ARTIFACT_STAGES,
  NFR_DESIGN_ARTIFACTS,
  NFR_DESIGN_STANDARD_BUDGET,
  NFR_ID_CONTRACT_LANDED,
  NFR_REQUIREMENTS_ARTIFACTS,
  NFR_REQUIREMENTS_STANDARD_BUDGET,
  auditInstant,
  bornUnderIdContract,
  countNfrIds,
  flagsNfrBudget,
  nfrStandardBudget,
  parseBirthTimestamp,
  stageOfNfrArtifact,
} from "../../packages/framework/core/tools/amadeus-sensor-nfr-budget.ts";

describe("t513 countNfrIds accepts the five declaration positions", () => {
  test("a heading declares an id", () => {
    expect(countNfrIds("### SEC-1: transport security")).toBe(1);
  });

  test("a bold list entry declares an id", () => {
    expect(countNfrIds("- **REL-3**: retry budget")).toBe(1);
  });

  test("a bare bold line declares an id", () => {
    expect(countNfrIds("**P-12**: p95 under 200 ms")).toBe(1);
  });

  test("a plain list entry declares an id once it reaches a colon", () => {
    expect(countNfrIds("- SCL-CP-2: connection pool ceiling")).toBe(1);
    // The corpus titles some entries through a parenthesised gloss before the
    // colon; the colon is what marks the label.
    expect(countNfrIds("- SCL-CP-2（接続数）: connection pool ceiling")).toBe(1);
  });

  test("the first cell of a table row declares an id", () => {
    expect(countNfrIds("| NFR-PERF-1 | p95 | 200 ms |")).toBe(1);
  });

  test("a later cell of a table row does not", () => {
    // A dependency or notes column naming an id is the cross-reference it is.
    expect(countNfrIds("| criterion | satisfies SEC-1 | note |")).toBe(0);
  });
});

describe("t513 countNfrIds fixes the id shape from the stage ① contract", () => {
  test("keeps every corpus family the contract quotes as valid", () => {
    for (const id of ["SEC-1", "REL-3", "P-12", "NFR-PERF-1", "U2-SCALE-4", "SCL-CP-2", "U06-SEC-3", "NFR-001"]) {
      expect(countNfrIds(`### ${id}: title`)).toBe(1);
    }
  });

  test("rejects a prefix that never reaches digits", () => {
    // `SEC-AUTH` is a category name, not a requirement id (contract verbatim).
    expect(countNfrIds("### SEC-AUTH: authentication")).toBe(0);
  });

  test("rejects the prose false positives that share the token space", () => {
    for (const token of ["NFR-design", "NFR-only", "NFR-traceable"]) {
      expect(countNfrIds(`### ${token}: prose`)).toBe(0);
    }
  });

  test("rejects a date, which is not uppercase-letter-led", () => {
    expect(countNfrIds("### 2026-08-09: measured")).toBe(0);
  });

  test("rejects an id that does not END on its digits", () => {
    expect(countNfrIds("### SEC-1x: title")).toBe(0);
    expect(countNfrIds("### SEC-2b: title")).toBe(0);
  });

  test("rejects a segment that is not uppercase-letter-led", () => {
    // Every segment is letter-led per the contract. These three forms are what
    // a looser middle (`[A-Za-z0-9]+`) would admit; each would enter the
    // denominator and understate bytes-per-NFR.
    expect(countNfrIds("### SEC-lower-1: title")).toBe(0);
    expect(countNfrIds("### SEC-2-1: title")).toBe(0);
    expect(countNfrIds("### SEC-a1: title")).toBe(0);
    // Fused UPPERCASE letters ahead of the digits stay valid (the FR side
    // writes group ids that way).
    expect(countNfrIds("### SEC-A1: title")).toBe(1);
  });

  test("counts DISTINCT ids so a restated id does not inflate the denominator", () => {
    const body = ["### SEC-1: transport", "- **SEC-1**: restated", "| SEC-1 | again |"].join("\n");
    expect(countNfrIds(body)).toBe(1);
  });

  test("an artifact with no declarations has no denominator", () => {
    expect(countNfrIds("## Overview\n\nProse about SEC-1 and REL-2.\n")).toBe(0);
  });
});

describe("t513 the NFR artifact set is the closed set the two stages produce", () => {
  test("each stage declares five artifacts", () => {
    expect(NFR_REQUIREMENTS_ARTIFACTS).toEqual([
      "performance-requirements",
      "security-requirements",
      "scalability-requirements",
      "reliability-requirements",
      "tech-stack-decisions",
    ]);
    expect(NFR_DESIGN_ARTIFACTS).toEqual([
      "performance-design",
      "security-design",
      "scalability-design",
      "reliability-design",
      "logical-components",
    ]);
  });

  test("stageOfNfrArtifact maps a basename to its stage and nothing else", () => {
    expect(stageOfNfrArtifact("security-requirements.md")).toBe("nfr-requirements");
    expect(stageOfNfrArtifact("logical-components.md")).toBe("nfr-design");
    // The stage diary and the questions file share the directory and are not
    // measured artifacts.
    expect(stageOfNfrArtifact("memory.md")).toBeUndefined();
    expect(stageOfNfrArtifact("requirements.md")).toBeUndefined();
  });

  test("the map covers exactly the ten artifacts", () => {
    expect(NFR_ARTIFACT_STAGES.size).toBe(10);
  });
});

describe("t513 the id contract applies going forward only", () => {
  test("the cutoff is the instant stage ① landed on main", () => {
    // PR #2686 squash-merged at this instant; a record born before it was
    // written under no id contract at all, so flagging it would be a
    // retroactive block on artifacts nobody could have written differently.
    expect(NFR_ID_CONTRACT_LANDED).toBe("2026-08-09T03:47:46Z");
  });

  test("a record born at or after the cutoff is under the contract", () => {
    expect(bornUnderIdContract("2026-08-09T03:47:46Z")).toBe(true);
    expect(bornUnderIdContract("2026-08-10T00:00:00Z")).toBe(true);
  });

  test("a record born before it is not", () => {
    expect(bornUnderIdContract("2026-08-09T03:47:45Z")).toBe(false);
    expect(bornUnderIdContract("2026-07-01T00:00:00Z")).toBe(false);
  });

  test("an unreadable birth is not evidence for either side", () => {
    // Fail-open: the sensor never guesses a record into the enforced cohort.
    expect(bornUnderIdContract(undefined)).toBe(false);
    expect(bornUnderIdContract("z")).toBe(false);
    // Date.parse REJECTS an impossible month…
    expect(bornUnderIdContract("2026-13-01T00:00:00Z")).toBe(false);
    // …but ROLLS an out-of-range day over into the next month, so the calendar
    // fields are round-tripped rather than trusted.
    expect(bornUnderIdContract("2026-02-30T00:00:00Z")).toBe(false);
  });

  test("a birth is compared as an INSTANT, not as a string", () => {
    // `.` sorts below `Z`, so "…:46.001Z" < "…:46Z" lexicographically — a
    // record born a millisecond AFTER the cutoff would read as pre-contract.
    expect("2026-08-09T03:47:46.001Z" < NFR_ID_CONTRACT_LANDED).toBe(true);
    expect(bornUnderIdContract("2026-08-09T03:47:46.001Z")).toBe(true);
    expect(bornUnderIdContract("2026-08-09T03:47:45.999Z")).toBe(false);
  });

  test("auditInstant exposes the parse the comparisons share", () => {
    expect(auditInstant("2026-08-09T03:47:46Z")).toBe(Date.parse("2026-08-09T03:47:46Z"));
    expect(auditInstant("2026-08-09T03:47:46.001Z")).toBe(Date.parse("2026-08-09T03:47:46Z") + 1);
    for (const bogus of ["z", "2026-13-01T00:00:00Z", "2026-02-30T00:00:00Z", "2026-08-09T03:47:60Z"]) {
      expect(auditInstant(bogus)).toBeUndefined();
    }
  });
});

describe("t513 parseBirthTimestamp reads both audit schema idioms", () => {
  // The corpus carries two audit generations: schemaVersion 1 names the event
  // at the top level, schemaVersion 2 nests it under attributes.
  const V1 =
    '{"schemaVersion":1,"seq":1,"timestamp":"2026-07-09T08:53:13Z","event":"WORKFLOW_STARTED","fields":{"Request":"x"}}';
  const V2 =
    '{"schemaVersion":2,"seq":1,"timestamp":"2026-08-07T10:10:15Z","eventName":"amadeus.workflow.started","attributes":{"Event":"WORKFLOW_STARTED","Request":"x"}}';

  test("finds the top-level form", () => {
    expect(parseBirthTimestamp(V1)).toBe("2026-07-09T08:53:13Z");
  });

  test("finds the nested form", () => {
    expect(parseBirthTimestamp(V2)).toBe("2026-08-07T10:10:15Z");
  });

  test("returns the EARLIEST start when a shard holds several", () => {
    expect(parseBirthTimestamp([V2, V1].join("\n"))).toBe("2026-07-09T08:53:13Z");
  });

  test("survives a malformed line rather than aborting the shard", () => {
    expect(parseBirthTimestamp(["{not json", V1].join("\n"))).toBe("2026-07-09T08:53:13Z");
  });

  test("skips a timestamp that is not the audit schema's UTC instant", () => {
    // The cutoff comparison is lexicographic, so `"z"` would sort above every
    // real timestamp and pull the record into the reported cohort. Shape is
    // checked, not just type.
    const bogus =
      '{"schemaVersion":1,"seq":1,"timestamp":"z","event":"WORKFLOW_STARTED","fields":{}}';
    expect(parseBirthTimestamp(bogus)).toBeUndefined();
    expect(parseBirthTimestamp([bogus, V1].join("\n"))).toBe("2026-07-09T08:53:13Z");
  });

  test("accepts fractional seconds, which the schema also writes", () => {
    const fractional =
      '{"schemaVersion":1,"seq":1,"timestamp":"2026-07-09T08:53:13.482Z","event":"WORKFLOW_STARTED","fields":{}}';
    expect(parseBirthTimestamp(fractional)).toBe("2026-07-09T08:53:13.482Z");
  });

  test("picks the earliest by INSTANT across mixed precisions", () => {
    // Lexicographically "…:13.482Z" sorts BELOW "…:13Z", so a string-ordered
    // pick would call the later line the earliest.
    const withFraction =
      '{"schemaVersion":1,"seq":2,"timestamp":"2026-07-09T08:53:13.482Z","event":"WORKFLOW_STARTED","fields":{}}';
    const whole =
      '{"schemaVersion":1,"seq":1,"timestamp":"2026-07-09T08:53:13Z","event":"WORKFLOW_STARTED","fields":{}}';
    expect(parseBirthTimestamp([withFraction, whole].join("\n"))).toBe("2026-07-09T08:53:13Z");
    expect(parseBirthTimestamp([whole, withFraction].join("\n"))).toBe("2026-07-09T08:53:13Z");
  });

  test("skips a timestamp whose calendar fields do not round-trip", () => {
    const rollover =
      '{"schemaVersion":1,"seq":1,"timestamp":"2026-02-30T00:00:00Z","event":"WORKFLOW_STARTED","fields":{}}';
    expect(parseBirthTimestamp(rollover)).toBeUndefined();
  });
});

// #2684 stage ③ (ruling comment 5230416035) — the Standard-depth ceiling.
//
// OBSERVED figures below are the corpus sweep the ruling cites, applying this
// sensor's own predicate to every Standard-depth unit with at least one
// declared id (reproduced by tests/integration/t514, which sweeps the live
// corpus rather than pinning literal figures). Two per-stage records, not
// one: cid:code-generation:c1-threshold-inside-observed-range requires each
// level's ceiling to sit inside ITS OWN observed range, and the two stages'
// ranges differ.
const OBSERVED = {
  "nfr-requirements": { n: 78, min: 299, median: 657, max: 2290 },
  "nfr-design": { n: 78, min: 130, median: 769, max: 2553 },
} as const;

describe("t513 the Standard ceiling sits inside each stage's own observed range", () => {
  test("both ceilings are 1,200 B per declared id today", () => {
    expect(NFR_REQUIREMENTS_STANDARD_BUDGET).toBe(1200);
    expect(NFR_DESIGN_STANDARD_BUDGET).toBe(1200);
  });

  test("nfr-requirements: observed min < ceiling < observed max (both sides)", () => {
    const { min, max } = OBSERVED["nfr-requirements"];
    expect(min).toBeLessThan(NFR_REQUIREMENTS_STANDARD_BUDGET);
    expect(NFR_REQUIREMENTS_STANDARD_BUDGET).toBeLessThan(max);
  });

  test("nfr-design: observed min < ceiling < observed max (both sides)", () => {
    const { min, max } = OBSERVED["nfr-design"];
    expect(min).toBeLessThan(NFR_DESIGN_STANDARD_BUDGET);
    expect(NFR_DESIGN_STANDARD_BUDGET).toBeLessThan(max);
  });

  test("nfr-requirements: the ceiling sits ABOVE the median (catches the tail)", () => {
    expect(NFR_REQUIREMENTS_STANDARD_BUDGET).toBeGreaterThan(OBSERVED["nfr-requirements"].median);
  });

  test("nfr-design: the ceiling sits ABOVE the median (catches the tail)", () => {
    expect(NFR_DESIGN_STANDARD_BUDGET).toBeGreaterThan(OBSERVED["nfr-design"].median);
  });
});

describe("t513 nfrStandardBudget resolves a ceiling only for Standard depth", () => {
  test("Standard depth returns each stage's own constant", () => {
    expect(nfrStandardBudget("nfr-requirements", "Standard")).toBe(NFR_REQUIREMENTS_STANDARD_BUDGET);
    expect(nfrStandardBudget("nfr-design", "Standard")).toBe(NFR_DESIGN_STANDARD_BUDGET);
  });

  test("Minimal declares no ceiling — the sample (n=3) is too thin to rule on", () => {
    expect(nfrStandardBudget("nfr-requirements", "Minimal")).toBeUndefined();
    expect(nfrStandardBudget("nfr-design", "Minimal")).toBeUndefined();
  });

  test("Comprehensive declares no ceiling, matching depth-budget's own convention", () => {
    expect(nfrStandardBudget("nfr-requirements", "Comprehensive")).toBeUndefined();
    expect(nfrStandardBudget("nfr-design", "Comprehensive")).toBeUndefined();
  });

  test("an unresolved depth (undefined) declares no ceiling — never guesses a level", () => {
    expect(nfrStandardBudget("nfr-requirements", undefined)).toBeUndefined();
    expect(nfrStandardBudget("nfr-design", undefined)).toBeUndefined();
  });

  test("a stage outside the closed pair has no ceiling even at Standard", () => {
    expect(nfrStandardBudget("build-and-test", "Standard")).toBeUndefined();
  });
});

describe("t513 flagsNfrBudget compares the EXACT total, not the rounded ratio", () => {
  test("exactly at the ceiling does not flag (strict inequality)", () => {
    const count = 5;
    const atCeiling = NFR_REQUIREMENTS_STANDARD_BUDGET * count;
    expect(flagsNfrBudget("nfr-requirements", "Standard", atCeiling, count)).toBe(false);
  });

  test("one byte over the exact total flags", () => {
    const count = 5;
    const overCeiling = NFR_REQUIREMENTS_STANDARD_BUDGET * count + 1;
    expect(flagsNfrBudget("nfr-requirements", "Standard", overCeiling, count)).toBe(true);
  });

  test("a sub-integer overrun the rounded ratio would hide still flags", () => {
    // 4 ids at 1200 B/id ceiling = 4800 B exact. 4801 B is +0.25 B/id over —
    // Math.round(4801 / 4) still reports 1200, the same as the ceiling, so a
    // comparison on the rounded ratio would miss this. The exact-total
    // comparison here does not.
    const count = 4;
    const ceiling = NFR_REQUIREMENTS_STANDARD_BUDGET;
    expect(Math.round((ceiling * count + 1) / count)).toBe(ceiling);
    expect(flagsNfrBudget("nfr-requirements", "Standard", ceiling * count + 1, count)).toBe(true);
  });

  test("a zero id count never flags — no denominator to compare against", () => {
    // Whether pre-contract (fail-open) or post-contract (already reported as
    // missing-nfr-ids by the caller), a zero-denominator comparison would
    // flag on the artifact's first byte.
    expect(flagsNfrBudget("nfr-requirements", "Standard", 999_999, 0)).toBe(false);
  });

  test("Minimal and Comprehensive never flag regardless of bytes", () => {
    expect(flagsNfrBudget("nfr-requirements", "Minimal", 999_999, 1)).toBe(false);
    expect(flagsNfrBudget("nfr-design", "Comprehensive", 999_999, 1)).toBe(false);
  });

  test("an unresolved depth never flags", () => {
    expect(flagsNfrBudget("nfr-requirements", undefined, 999_999, 1)).toBe(false);
  });

  test("the two stages' ceilings are checked independently — one over, one under", () => {
    // A unit whose nfr-requirements bytes exceed ITS ceiling says nothing
    // about whether the sibling nfr-design unit exceeds its own.
    const count = 3;
    const overRequirements = NFR_REQUIREMENTS_STANDARD_BUDGET * count + 1;
    const underDesign = NFR_DESIGN_STANDARD_BUDGET * count - 1;
    expect(flagsNfrBudget("nfr-requirements", "Standard", overRequirements, count)).toBe(true);
    expect(flagsNfrBudget("nfr-design", "Standard", underDesign, count)).toBe(false);
  });
});
