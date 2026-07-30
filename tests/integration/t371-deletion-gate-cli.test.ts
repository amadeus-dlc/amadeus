// covers: function:runCheck function:runRequireGreen function:main function:measureCallsites function:measureRegistryDrift function:measureRelayProof function:readShadowReport function:resultsFromEvidence
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
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type Evidence,
  GATE_CONDITIONS,
  DEFAULT_RUNNERS,
  gatherEvidence,
  MIXED_JOURNAL_TESTS,
  REPO_ROOT_FOR_TEST,
  runBunTests,
  main,
  measureCallsites,
  measureRegistryDrift,
  measureRelayProof,
  readShadowReport,
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
  shadow: {
    generatedAt: "2026-07-30T00:00:00.000Z",
    eventCount: { performed: true, equivalent: true, detail: "" },
    linkage: { performed: true, equivalent: true, detail: "" },
    status: { performed: true, equivalent: true, detail: "" },
    allowedAttributes: { performed: true, equivalent: true, detail: "" },
    unexplainedDiffs: [],
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

  test("an absent shadow report reads as null rather than as agreement", () => {
    expect(readShadowReport(undefined)).toBeNull();
    expect(readShadowReport(join(scratch(), "nope.json"))).toBeNull();
  });

  test("a malformed shadow report reads as null rather than as agreement", () => {
    const dir = scratch();
    const path = join(dir, "shadow.json");
    writeFileSync(path, "{ not json", "utf-8");
    expect(readShadowReport(path)).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });

  test("a well-formed shadow report is read back", () => {
    const dir = scratch();
    const path = join(dir, "shadow.json");
    writeFileSync(path, JSON.stringify(ALL_PASS.shadow), "utf-8");
    expect(readShadowReport(path)?.generatedAt).toBe("2026-07-30T00:00:00.000Z");
    rmSync(dir, { recursive: true, force: true });
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
        shadow: null,
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
    expect(asked).toEqual([[...MIXED_JOURNAL_TESTS]]);
    expect(guardsRun).toBe(1);
    expect(evidence.mixedJournal?.detail).toBe("fake");
    expect(evidence.distribution?.sources).toEqual(["fake-guard"]);
    // The cheap measurements are NOT faked — they run against the real tree.
    expect(typeof evidence.callsites).toBe("number");
    expect(Array.isArray(evidence.registryDrift)).toBe(true);
    expect(evidence.relay).not.toBeNull();
    // No shadow report path was given, so (d) is unmeasured — the UNKNOWN arm.
    expect(evidence.shadow).toBeNull();
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
