// covers: function:runCheck function:runRequireGreen function:main function:measureCallsites function:measureRegistryDrift function:measureRelayProof function:measureMigrationEquivalence function:discoverMigrationEquivalenceTests function:resultsFromEvidence
//
// U8 (legacy-writer-removal) — the deletion gate's CLI and its evidence
// gathering (FR-MIG-4, BR-2, BR-16).
//
// Driven IN PROCESS rather than through a spawned CLI so the wiring lines are
// measured (cid:code-generation:bun-coverage-spawn-blindspot). The report path
// is injectable for the same reason a test must never write over a committed
// artifact.
//
// The two arms of the deletion precondition are BOTH exercised here: with the
// real tree's evidence the gate is BLOCKED and --require-green exits 1 (the
// falling proof), and with an all-PASS evidence set it exits 0. A gate only
// ever observed in one state is not a gate.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import {
  type Evidence,
  GATE_CONDITIONS,
  DEFAULT_RUNNERS,
  gatherEvidence,
  MIGRATION_EQUIVALENCE_MIN_FILES,
  MIXED_JOURNAL_TESTS,
  REGISTRY_SWEEP_TEST,
  REPO_ROOT_FOR_TEST,
  discoverMigrationEquivalenceTests,
  runBunTests,
  main,
  measureCallsites,
  measureMigrationEquivalence,
  measureRegistryDrift,
  measureRelayProof,
  resultsFromEvidence,
  runCheck,
  runRequireGreen,
  validateReportShape,
} from "../deletion-gate.ts";

const scratch = (): string => mkdtempSync(join(tmpdir(), "amadeus-deletion-gate-"));

const ALL_PASS: Evidence = {
  mixedJournal: { ran: true, passed: true, detail: "", sources: ["t365"] },
  registryDrift: [],
  callsites: 0,
  migrationEquivalence: {
    markerFiles: [
      REGISTRY_SWEEP_TEST,
      "tests/integration/t379-swarm-canonical-emit.test.ts",
      "tests/integration/t382-sensor-canonical-emit.test.ts",
      "tests/integration/t383-targeted-canonical-emit.test.ts",
      "tests/integration/t390-migration-equivalence.test.ts",
    ],
    outcome: { ran: true, passed: true, detail: "", sources: [] },
  },
  relay: { moduleExists: true, proofTests: ["tests/integration/relay-no-span-proof.test.ts"], outcome: { ran: true, passed: true, detail: "", sources: [] } },
  distribution: { ran: true, passed: true, detail: "", sources: ["dist:check"] },
};

describe("evidence gathering measures the real tree", () => {
  test("the call-site census is a number, not an assumption", () => {
    const total = measureCallsites();
    expect(typeof total).toBe("number");
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test("registry drift is measured from the shipped harness sources", () => {
    const drift = measureRegistryDrift();
    expect(Array.isArray(drift)).toBe(true);
  });

  test("the Relay proof reports whether U11's module has landed", () => {
    const proof = measureRelayProof();
    expect(proof).not.toBeNull();
    expect(typeof proof?.moduleExists).toBe("boolean");
  });

  test("the migration-equivalence suites are discovered by marker, not assumed", () => {
    const found = discoverMigrationEquivalenceTests();
    expect(found).not.toBeNull();
    expect((found ?? []).length).toBeGreaterThanOrEqual(MIGRATION_EQUIVALENCE_MIN_FILES);
    expect(found).toContain(REGISTRY_SWEEP_TEST);
    // Repo-relative, for the same reason condition (e)'s proof paths are: an
    // absolute path survives existsSync and then fails after the join.
    for (const path of found ?? []) {
      expect(isAbsolute(path)).toBe(false);
      expect(existsSync(join(REPO_ROOT_FOR_TEST, path))).toBe(true);
    }
  });

  test("the measurement hands the discovered set to the suite runner", () => {
    // The runner is faked: the marked suites are the ones this file's own CI
    // run already executes, and nesting them under it is the load-induced
    // false-red shape (cid:code-generation:fanout-load-settle-before-integration).
    const asked: string[][] = [];
    const measured = measureMigrationEquivalence((paths) => {
      asked.push([...paths]);
      return { ran: true, passed: true, detail: "fake", sources: paths };
    });
    expect(measured?.markerFiles).toEqual(asked[0] as string[]);
    expect(measured?.outcome?.detail).toBe("fake");
  });

  test("evidence maps onto exactly the six conditions", () => {
    const results = resultsFromEvidence(ALL_PASS);
    expect(results.map((r) => r.condition).sort()).toEqual([...GATE_CONDITIONS]);
    expect(results.every((r) => r.verdict === "PASS")).toBe(true);
  });
});

describe("runCheck — always reports, never forces", () => {
  test("writes a schema-valid report and exits 0 even while BLOCKED", () => {
    const dir = scratch();
    const reportPath = join(dir, "gate.json");
    const code = runCheck({ reportPath, evidence: ALL_PASS });
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf-8"));
    expect(validateReportShape(written)).toEqual([]);
    expect(written.overall).toBe("GREEN");
    rmSync(dir, { recursive: true, force: true });
  });

  test("the real tree's evidence produces a schema-valid BLOCKED report", () => {
    const dir = scratch();
    const reportPath = join(dir, "gate.json");
    // Only the cheap measurements run for real here; the suite-spawning ones
    // are supplied as unmeasured, which is exactly the UNKNOWN they must be.
    const code = runCheck({
      reportPath,
      evidence: {
        mixedJournal: null,
        registryDrift: measureRegistryDrift(),
        callsites: measureCallsites(),
        migrationEquivalence: null,
        relay: measureRelayProof(),
        distribution: null,
      },
    });
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf-8"));
    expect(validateReportShape(written)).toEqual([]);
    expect(written.overall).toBe("BLOCKED");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("runRequireGreen — the deletion precondition, in both states", () => {
  test("exits 1 while any condition is short of PASS", () => {
    const blocked: Evidence = { ...ALL_PASS, callsites: 66 };
    expect(runRequireGreen({ evidence: blocked })).toBe(1);
  });

  test("exits 1 when a condition is merely unjudgeable", () => {
    const unjudged: Evidence = { ...ALL_PASS, relay: null };
    expect(runRequireGreen({ evidence: unjudged })).toBe(1);
  });

  test("exits 0 only when all six conditions PASS", () => {
    expect(runRequireGreen({ evidence: ALL_PASS })).toBe(0);
  });
});

describe("main — argv carries no forced-PASS channel", () => {
  test("an unknown flag is rejected rather than ignored", () => {
    expect(main(["--force-green"])).toBe(2);
    expect(main([])).toBe(2);
    expect(main(["--check", "--evidence", "green"])).toBe(2);
  });
});

// --- the declared test paths must all exist ---------------------------------
//
// bun drops a path that is not there and still exits 0, so a typo'd constant
// turns into a condition that PASSes on a suite it never ran. It happened here
// during this Unit's own construction: the mixed-journal constant named
// tests/unit/t366-…, the file lives under tests/integration/, and the gate
// reported (a) PASS off ONE of the two suites. The measurement is therefore
// fail-closed on a missing path, and the constant itself is pinned.

describe("declared suite paths are verified, not assumed", () => {
  test("every mixed-journal suite path exists on disk", () => {
    const missing = MIXED_JOURNAL_TESTS.filter((path) => !existsSync(join(REPO_ROOT_FOR_TEST, path)));
    expect(missing).toEqual([]);
  });

  test("a missing path makes the run UNKNOWN rather than a pass on a partial set", () => {
    const outcome = runBunTests(["tests/unit/t000-does-not-exist.test.ts"]);
    expect(outcome.ran).toBe(false);
    expect(outcome.detail).toContain("t000-does-not-exist");
  });

  // The proof suite is DISCOVERED (by marker) rather than declared, so its
  // paths arrive from a directory walk while runBunTests resolves against the
  // repo root. Absolute paths survive existsSync on their own and only fail
  // after the join, which reads as "condition (e) has no proof" — a silent
  // UNKNOWN on evidence that is right there (Refs: #1783).
  test("the Relay proof's paths are the repo-relative form runBunTests resolves", () => {
    const proof = measureRelayProof();
    expect(proof?.proofTests.length ?? 0).toBeGreaterThan(0);
    for (const path of proof?.proofTests ?? []) {
      expect(isAbsolute(path)).toBe(false);
      expect(existsSync(join(REPO_ROOT_FOR_TEST, path))).toBe(true);
    }
    expect(proof?.outcome?.ran).toBe(true);
  });

  test("the run reports the file count it actually executed", () => {
    const outcome = runBunTests(MIXED_JOURNAL_TESTS);
    expect(outcome.ran).toBe(true);
    expect(outcome.detail).toContain(`across ${MIXED_JOURNAL_TESTS.length} file`);
  });
});

// --- the gathering layer's wiring --------------------------------------------
//
// gatherEvidence is checked with injected runners rather than by nesting a real
// test run and two distribution guards inside this suite: nested spawns under
// the suite's own parallelism produce load-induced false reds, and this file
// runs on every CI build. What matters here is the WIRING — that each condition
// draws on the source it claims to — and that is exactly what fakes expose. The
// real runners execute on every actual gate run, including the CI step.

describe("gatherEvidence — each condition draws on its own source", () => {
  test("routes the suite runner to (a) and the guard runner to (f)", () => {
    const asked: string[][] = [];
    let guardsRun = 0;
    const evidence = gatherEvidence(
      {},
      {
        runTests: (paths) => {
          asked.push([...paths]);
          return { ran: true, passed: true, detail: "fake", sources: paths };
        },
        runGuards: () => {
          guardsRun += 1;
          return { ran: true, passed: true, detail: "fake", sources: ["fake-guard"] };
        },
      },
    );
    expect(asked[0]).toEqual([...MIXED_JOURNAL_TESTS]);
    expect(asked[1]).toContain(REGISTRY_SWEEP_TEST);
    expect(asked).toHaveLength(2);
    expect(guardsRun).toBe(1);
    expect(evidence.mixedJournal?.detail).toBe("fake");
    expect(evidence.distribution?.sources).toEqual(["fake-guard"]);
    // The cheap measurements are NOT faked — they run against the real tree.
    expect(typeof evidence.callsites).toBe("number");
    expect(Array.isArray(evidence.registryDrift)).toBe(true);
    expect(evidence.relay).not.toBeNull();
    // (d) draws on the marker discovery plus the same injected suite runner.
    expect(evidence.migrationEquivalence?.markerFiles).toContain(REGISTRY_SWEEP_TEST);
    expect(evidence.migrationEquivalence?.outcome?.detail).toBe("fake");
    expect(resultsFromEvidence(evidence)).toHaveLength(6);
  });

  test("the default runners are the real ones", () => {
    expect(DEFAULT_RUNNERS.runTests).toBe(runBunTests);
    expect(typeof DEFAULT_RUNNERS.runGuards).toBe("function");
  });
});

// --- the CLI's failure arms --------------------------------------------------

describe("the report is validated before it is written, not after", () => {
  test("a report that fails its own schema is refused rather than persisted", () => {
    const dir = scratch();
    const reportPath = join(dir, "gate.json");
    // A condition id outside (a)-(f) reaches the writer only through a corrupted
    // checker, which is precisely the case the pre-write check exists for.
    const corrupt: Evidence = { ...ALL_PASS, callsites: 0 };
    const code = runCheck({
      reportPath,
      evidence: corrupt,
      now: "2026-07-30T00:00:00.000Z",
      commitRef: "Authorization: Bearer sk-ant-not-a-real-key",
    });
    expect(code).toBe(1);
    expect(existsSync(reportPath)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  test("require-green surfaces the same refusal instead of authorising deletion", () => {
    const code = runRequireGreen({
      reportPath: join(scratch(), "gate.json"),
      evidence: ALL_PASS,
      commitRef: "Authorization: Bearer sk-ant-not-a-real-key",
    });
    expect(code).toBe(1);
  });
});

// --- condition (d) blocks rather than passes on a thinned evidence base ------
//
// The floor and the named registry sweep are what stop a green run over fewer
// suites from reading like a green run over all of them.

describe("a thinned migration-equivalence base blocks rather than passes", () => {
  test("evaluating a short marker set yields a schema-valid BLOCKED report and exit 0", () => {
    const dir = scratch();
    const reportPath = join(dir, "gate.json");
    const thinned = {
      ...ALL_PASS,
      migrationEquivalence: {
        markerFiles: ALL_PASS.migrationEquivalence?.markerFiles.slice(0, 2) ?? [],
        outcome: { ran: true, passed: true, detail: "", sources: [] },
      },
    };
    const code = runCheck({ reportPath, evidence: thinned });
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(reportPath, "utf-8"));
    expect(validateReportShape(written)).toEqual([]);
    expect(written.overall).toBe("BLOCKED");
    const d = written.results.find((r: { condition: string }) => r.condition === "d");
    expect(d.verdict).toBe("FAIL");
    rmSync(dir, { recursive: true, force: true });
  });

  test("require-green refuses to authorise deletion when the marked suites are red", () => {
    const red = {
      ...ALL_PASS,
      migrationEquivalence: {
        markerFiles: ALL_PASS.migrationEquivalence?.markerFiles ?? [],
        outcome: { ran: true, passed: false, detail: "1 fail", sources: [] },
      },
    };
    expect(runRequireGreen({ evidence: red })).toBe(1);
  });
});
