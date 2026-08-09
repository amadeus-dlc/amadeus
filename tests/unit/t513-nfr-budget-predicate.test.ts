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
  NFR_ID_CONTRACT_LANDED,
  NFR_REQUIREMENTS_ARTIFACTS,
  bornUnderIdContract,
  countNfrIds,
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
});
