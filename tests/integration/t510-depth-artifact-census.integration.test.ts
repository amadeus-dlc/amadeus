// covers: harness-instrument:depth-artifact-census
//
// t510 (fs / CLI boundary) — drives the depth-artifact census over temp fixture
// workspaces through the AMADEUS_CENSUS_ROOT env seam. Real filesystem, hence
// integration / medium; size purity keeps the pure half in
// tests/unit/t510-depth-artifact-census.test.ts.
//
// main() is driven IN-PROCESS rather than spawned: bun --coverage does not
// instrument subprocesses, so a spawn-only test would leave every wiring line
// here unmeasured.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { collectCensus, listIntentRecords, main, readBirth } from "../../scripts/depth-artifact-census";

const INTENTS = "amadeus/spaces/default/intents";

let root: string | null = null;

afterEach(() => {
  if (root !== null) rmSync(root, { recursive: true, force: true });
  delete process.env.AMADEUS_CENSUS_ROOT;
  root = null;
});

/** Write a fixture workspace. Keys are paths relative to the workspace root. */
function workspace(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "t510-"));
  for (const [rel, body] of Object.entries(files)) {
    const target = join(dir, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
  process.env.AMADEUS_CENSUS_ROOT = dir;
  root = dir;
  return dir;
}

function state(depth: string): string {
  return `# State\n\n- **Depth**: ${depth}\n`;
}

/** A requirements.md carrying `frCount` numbered FRs, padded to `bytes` bytes. */
function requirements(frCount: number, bytes: number): string {
  const head = Array.from({ length: frCount }, (_, i) => `### FR-${i + 1}: requirement ${i + 1}`).join("\n");
  const body = `${head}\n`;
  return body.length >= bytes ? body : body + "x".repeat(bytes - body.length);
}

function startedV1(timestamp: string): string {
  return JSON.stringify({ schemaVersion: 1, seq: 1, timestamp, event: "WORKFLOW_STARTED", fields: {} });
}

function startedV2(timestamp: string): string {
  return JSON.stringify({
    schemaVersion: 2,
    seq: 1,
    timestamp,
    eventName: "amadeus.workflow.started",
    attributes: { Event: "WORKFLOW_STARTED" },
  });
}

describe("t510 the census is read-only by construction", () => {
  // The module's header claims it never writes. An unenforced claim is worth
  // less than no claim, so the import list is checked rather than trusted: a
  // measurement harness that could edit the corpus it measures is not a
  // measurement.
  const WRITE_APIS = [
    "writeFileSync",
    "appendFileSync",
    "mkdirSync",
    "rmSync",
    "unlinkSync",
    "renameSync",
    "copyFileSync",
    "createWriteStream",
    "writeFile",
    "truncateSync",
  ];

  test("imports no fs write API", () => {
    const source = readFileSync(join(import.meta.dir, "../../scripts/depth-artifact-census.ts"), "utf-8");
    // Only the import statements are inspected: prose in the header comment
    // names these APIs on purpose and must not trip the guard.
    const imports = source
      .split("\n")
      .filter((line) => line.startsWith("import ") || /^\s+(?:[A-Za-z]+,?)$/.test(line))
      .join("\n");
    const found = WRITE_APIS.filter((api) => imports.includes(api));
    expect(found).toEqual([]);
  });
});

describe("t510 listIntentRecords excludes non-intent directories", () => {
  test("keeps date-prefixed record dirs and drops the stray audit dir", () => {
    // `amadeus/spaces/default/intents/audit/` really exists in the live
    // workspace and holds shards directly — it is not an intent, and counting
    // it would add a phantom record to every population.
    const dir = workspace({
      [`${INTENTS}/260807-alpha/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260808-beta/amadeus-state.md`]: state("Standard"),
      [`${INTENTS}/audit/some-clone.jsonl`]: startedV1("2026-08-01T00:00:00Z"),
      [`${INTENTS}/intents.json`]: "[]",
    });
    expect(listIntentRecords(join(dir, INTENTS))).toEqual(["260807-alpha", "260808-beta"]);
  });

  test("a missing intents directory yields no records rather than throwing", () => {
    const dir = workspace({ "README.md": "x" });
    expect(listIntentRecords(join(dir, INTENTS))).toEqual([]);
  });

  test("censusing a workspace with no intents directory is empty, not fatal", () => {
    // The exclusion list is read from the same directory as the records, so an
    // absent intents dir must not throw on the way to reporting zero records.
    const dir = workspace({ "README.md": "x" });
    const census = collectCensus(dir, undefined);
    expect(census.recordCount).toBe(0);
    expect(census.predicate.excludedEntries).toEqual([]);
  });
});

describe("t510 readBirth spans audit shards", () => {
  test("takes the earliest WORKFLOW_STARTED across every shard, both schemas", () => {
    const dir = workspace({
      [`${INTENTS}/260807-alpha/audit/clone-a.jsonl`]: startedV2("2026-08-07T10:00:00Z"),
      [`${INTENTS}/260807-alpha/audit/clone-b.jsonl`]: startedV1("2026-08-06T09:00:00Z"),
    });
    expect(readBirth(join(dir, INTENTS, "260807-alpha"))).toBe("2026-08-06T09:00:00Z");
  });

  test("a record with no audit directory has an unresolvable birth", () => {
    // Measured: two live records carry no audit/ at all. They must surface as
    // birth-unknown, not be silently assigned to a cohort.
    const dir = workspace({ [`${INTENTS}/260710-noaudit/amadeus-state.md`]: state("Minimal") });
    expect(readBirth(join(dir, INTENTS, "260710-noaudit"))).toBeUndefined();
  });

  test("an audit directory with no WORKFLOW_STARTED is also unresolvable", () => {
    const dir = workspace({
      [`${INTENTS}/260710-nostart/audit/clone.jsonl`]: JSON.stringify({
        schemaVersion: 1,
        timestamp: "2026-07-09T08:00:00Z",
        event: "DELEGATED_APPROVAL",
        fields: {},
      }),
    });
    expect(readBirth(join(dir, INTENTS, "260710-nostart"))).toBeUndefined();
  });
});

describe("t510 collectCensus measures both artifacts per depth group", () => {
  const REQ = "inception/requirements-analysis/requirements.md";

  test("requirements are grouped by the record's Depth", () => {
    const dir = workspace({
      [`${INTENTS}/260807-a/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260807-a/${REQ}`]: requirements(2, 4000),
      [`${INTENTS}/260807-b/amadeus-state.md`]: state("Standard"),
      [`${INTENTS}/260807-b/${REQ}`]: requirements(2, 2000),
    });
    const census = collectCensus(dir, undefined);
    const cohort = census.cohorts[0];
    expect(cohort?.cohort).toBe("all");
    expect(cohort?.requirements.groups.Minimal?.bytesPerFr?.n).toBe(1);
    expect(cohort?.requirements.groups.Minimal?.bytesPerFr?.median).toBe(2000);
    expect(cohort?.requirements.groups.Standard?.bytesPerFr?.median).toBe(1000);
  });

  test("a record with no resolvable Depth lands in the explicit unknown group", () => {
    const dir = workspace({ [`${INTENTS}/260807-c/${REQ}`]: requirements(2, 2000) });
    const cohort = collectCensus(dir, undefined).cohorts[0];
    expect(cohort?.requirements.groups.unknown?.bytesPerFr?.n).toBe(1);
    expect(cohort?.requirements.groups.Minimal?.bytesPerFr).toBeUndefined();
  });

  test("a requirements.md with no numbered FRs is counted apart, not divided by zero", () => {
    const dir = workspace({
      [`${INTENTS}/260807-d/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260807-d/${REQ}`]: "prose with no numbered requirements at all\n",
    });
    const cohort = collectCensus(dir, undefined).cohorts[0];
    expect(cohort?.requirements.groups.Minimal?.noNumberedFrs).toBe(1);
    expect(cohort?.requirements.groups.Minimal?.bytesPerFr).toBeUndefined();
  });

  test("flag counts come from the sensor's own ceilings", () => {
    const dir = workspace({
      [`${INTENTS}/260807-e/amadeus-state.md`]: state("Minimal"),
      // 1 FR at 5000 B is 5000 B/FR, well over Minimal's 1800 ceiling.
      [`${INTENTS}/260807-e/${REQ}`]: requirements(1, 5000),
      [`${INTENTS}/260807-f/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260807-f/${REQ}`]: requirements(1, 1000),
    });
    const group = collectCensus(dir, undefined).cohorts[0]?.requirements.groups.Minimal;
    expect(group?.flagged).toBe(1);
    expect(group?.flagRate).toBeCloseTo(0.5, 10);
  });

  test("plans report per-file and per-intent totals separately", () => {
    // Per-intent totals are not derivable from the per-file distribution once a
    // record carries several units, so both are measured.
    const dir = workspace({
      [`${INTENTS}/260807-g/amadeus-state.md`]: state("Standard"),
      [`${INTENTS}/260807-g/construction/u1/code-generation/code-generation-plan.md`]: "a".repeat(1000),
      [`${INTENTS}/260807-g/construction/u2/code-generation/code-generation-plan.md`]: "b".repeat(3000),
    });
    const plans = collectCensus(dir, undefined).cohorts[0]?.plans;
    expect(plans?.perFile.Standard?.n).toBe(2);
    expect(plans?.perFile.Standard?.max).toBe(3000);
    expect(plans?.perIntent.Standard?.n).toBe(1);
    expect(plans?.perIntent.Standard?.max).toBe(4000);
  });
});

describe("t510 --since splits the corpus into three disjoint cohorts", () => {
  const REQ = "inception/requirements-analysis/requirements.md";
  const CUTOFF = "2026-08-08T05:53:42Z";

  function threeRecords(): string {
    return workspace({
      [`${INTENTS}/260809-post/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260809-post/${REQ}`]: requirements(1, 1000),
      [`${INTENTS}/260809-post/audit/c.jsonl`]: startedV2("2026-08-09T00:00:00Z"),
      [`${INTENTS}/260801-pre/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260801-pre/${REQ}`]: requirements(1, 2000),
      [`${INTENTS}/260801-pre/audit/c.jsonl`]: startedV1("2026-08-01T00:00:00Z"),
      [`${INTENTS}/260710-nobirth/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260710-nobirth/${REQ}`]: requirements(1, 3000),
    });
  }

  test("post / pre / unknown each hold their own records and nothing else", () => {
    const census = collectCensus(threeRecords(), CUTOFF);
    const byName = Object.fromEntries(census.cohorts.map((c) => [c.cohort, c]));
    expect(census.cohorts.map((c) => c.cohort)).toEqual(["post", "pre", "unknown"]);
    expect(byName.post?.recordCount).toBe(1);
    expect(byName.pre?.recordCount).toBe(1);
    expect(byName.unknown?.recordCount).toBe(1);
    expect(byName.post?.requirements.groups.Minimal?.bytesPerFr?.median).toBe(1000);
    expect(byName.pre?.requirements.groups.Minimal?.bytesPerFr?.median).toBe(2000);
  });

  test("the cohorts re-add to the whole corpus — no record is dropped", () => {
    const dir = threeRecords();
    const split = collectCensus(dir, CUTOFF);
    const whole = collectCensus(dir, undefined);
    const summed = split.cohorts.reduce((total, c) => total + c.recordCount, 0);
    expect(summed).toBe(whole.cohorts[0]?.recordCount);
  });
});

describe("t510 main() renders deterministically and fails closed", () => {
  const REQ = "inception/requirements-analysis/requirements.md";

  function captureStdout(run: () => number): { code: number; out: string } {
    const chunks: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      return { code: run(), out: chunks.join("") };
    } finally {
      process.stdout.write = original;
    }
  }

  function fixture(): string {
    return workspace({
      [`${INTENTS}/260807-a/amadeus-state.md`]: state("Minimal"),
      [`${INTENTS}/260807-a/${REQ}`]: requirements(2, 4000),
      [`${INTENTS}/260807-a/construction/u1/code-generation/code-generation-plan.md`]: "p".repeat(1500),
    });
  }

  test("the table run exits 0 and names both artifacts", () => {
    fixture();
    const { code, out } = captureStdout(() => main([]));
    expect(code).toBe(0);
    expect(out).toContain("requirements.md");
    expect(out).toContain("code-generation-plan.md");
    expect(out).toContain("Minimal");
  });

  test("two runs over the same corpus produce byte-identical output", () => {
    // Determinism is the point of version-controlling the harness: a census
    // whose output moved between runs could not be diffed across landings.
    fixture();
    const first = captureStdout(() => main([]));
    const second = captureStdout(() => main([]));
    expect(second.out).toBe(first.out);
  });

  test("--json emits the exclusion predicate alongside the numbers", () => {
    fixture();
    const { code, out } = captureStdout(() => main(["--json"]));
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed.predicate.recordDirPattern).toBe("^[0-9]{6}-");
    expect(parsed.predicate.requirementsGlob).toContain("requirements.md");
    expect(parsed.cohorts[0].cohort).toBe("all");
  });

  test("a malformed --since exits non-zero instead of censusing the wrong corpus", () => {
    fixture();
    expect(main(["--since", "not-a-date"])).toBe(1);
  });

  test("an unknown flag exits non-zero", () => {
    fixture();
    expect(main(["--wat"])).toBe(1);
  });
});
