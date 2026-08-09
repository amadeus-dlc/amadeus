// covers: harness-instrument:depth-artifact-census
//
// t515 — the NFR half of the depth artifact census (#2684 stage ②).
//
// The sensor measures ONE artifact at a gate. Stage ③ needs the shape of the
// whole corpus per depth level, which is what this census produces — and stage
// ③ may not place a ceiling anywhere outside that observed range
// (cid:code-generation:c1-threshold-inside-observed-range).
//
// Pure aggregation over literal fixtures, no fs: the fs walk and the CLI live
// in the census script's integration coverage. The census imports its
// predicates from the sensor rather than re-deriving them, so a census figure
// and a gate finding can never disagree about what an id is.

import { describe, expect, test } from "bun:test";
import {
  aggregateNfr,
  type DepthGroup,
  type NfrStage,
  type NfrUnitMeasurement,
} from "../../scripts/depth-artifact-census";

// The parameter types are the exported ones the measurement itself uses, so a
// change to either union is caught here rather than drifting past a locally
// re-spelled copy.
function unit(
  depth: DepthGroup,
  stage: NfrStage,
  bytes: number,
  idCount: number,
  artifacts: number,
): NfrUnitMeasurement {
  return {
    record: "260809-x",
    unit: `u${bytes}`,
    stage,
    depth,
    files: artifacts,
    bytes,
    idCount,
    artifactBytes: Array.from({ length: artifacts }, () => Math.round(bytes / artifacts)),
  };
}

describe("t515 aggregateNfr summarizes bytes per declared id, per stage and depth", () => {
  test("reports the unit distribution (D2) for each depth group", () => {
    const census = aggregateNfr([
      unit("Minimal", "nfr-requirements", 1000, 10, 2), // 100 B/id
      unit("Minimal", "nfr-requirements", 3000, 10, 2), // 300 B/id
      unit("Standard", "nfr-requirements", 4000, 10, 2), // 400 B/id
    ]);
    const minimal = census["nfr-requirements"]?.groups.Minimal;
    expect(minimal?.units).toBe(2);
    expect(minimal?.bytesPerNfr?.min).toBe(100);
    expect(minimal?.bytesPerNfr?.max).toBe(300);
    expect(census["nfr-requirements"]?.groups.Standard?.bytesPerNfr?.n).toBe(1);
  });

  test("keeps the two stages apart", () => {
    const census = aggregateNfr([
      unit("Standard", "nfr-requirements", 1000, 5, 5),
      unit("Standard", "nfr-design", 9000, 5, 5),
    ]);
    expect(census["nfr-requirements"]?.groups.Standard?.bytesPerNfr?.median).toBe(200);
    expect(census["nfr-design"]?.groups.Standard?.bytesPerNfr?.median).toBe(1800);
  });

  test("reports the per-artifact distribution (D1) as a diagnostic", () => {
    // Four artifacts of 500 B each against 5 ids — 100 B/id apiece.
    const census = aggregateNfr([unit("Standard", "nfr-design", 2000, 5, 4)]);
    const group = census["nfr-design"]?.groups.Standard;
    expect(group?.artifactBytesPerNfr?.n).toBe(4);
    expect(group?.artifactBytesPerNfr?.median).toBe(100);
  });

  test("a unit with no declared ids has no ratio and is tallied apart", () => {
    // Folding it in as 0 B/id would drag every median toward nothing, and the
    // ratio does not exist: there is no denominator.
    const census = aggregateNfr([
      unit("Minimal", "nfr-requirements", 5000, 0, 3),
      unit("Minimal", "nfr-requirements", 2000, 10, 2),
    ]);
    const group = census["nfr-requirements"]?.groups.Minimal;
    expect(group?.units).toBe(2);
    expect(group?.unitsWithoutIds).toBe(1);
    expect(group?.bytesPerNfr?.n).toBe(1);
    expect(group?.bytesPerNfr?.median).toBe(200);
  });

  test("a group where NO unit declares an id reports no distribution at all", () => {
    // Not zeroes: an absent sample and a sample of zeroes read differently, and
    // the renderer shows the absent one as `-` rather than as a measured 0.
    const census = aggregateNfr([
      unit("Minimal", "nfr-design", 4000, 0, 2),
      unit("Minimal", "nfr-design", 6000, 0, 3),
    ]);
    const group = census["nfr-design"]?.groups.Minimal;
    expect(group?.units).toBe(2);
    expect(group?.unitsWithoutIds).toBe(2);
    expect(group?.bytesPerNfr).toBeUndefined();
    expect(group?.artifactBytesPerNfr).toBeUndefined();
  });

  test("counts files and units so the population is auditable", () => {
    const census = aggregateNfr([
      unit("Standard", "nfr-requirements", 1000, 4, 5),
      unit("unknown", "nfr-requirements", 1000, 4, 3),
    ]);
    expect(census["nfr-requirements"]?.unitCount).toBe(2);
    expect(census["nfr-requirements"]?.fileCount).toBe(8);
    // A record whose depth cannot be resolved is reported as its own group
    // rather than dropped, so the groups always re-add to the population.
    expect(census["nfr-requirements"]?.groups.unknown?.units).toBe(1);
  });

  test("an empty corpus yields empty stages rather than NaN distributions", () => {
    const census = aggregateNfr([]);
    expect(census["nfr-requirements"]?.unitCount).toBe(0);
    expect(census["nfr-requirements"]?.groups.Minimal).toBeUndefined();
  });
});
