// covers: harness-instrument:coverage-project-gate
//
// coverage-project-gate.test.ts — calibrates the self-hosted PROJECT coverage
// gate (tests/coverage-project-gate.ts). Mechanism: none (pure in-process +
// deterministic spawns of the tool against a temp tree; zero LLM, zero tokens).
// Technique: known-answer boundary + fault-injection + guard-rejection.
//
// WHAT THIS PINS. The gate decides whether coverage regressed. If its exact
// boundary rounds, or it fails open on a missing/malformed file, the whole
// anti-regression guarantee is worthless. These tests pin:
//
//   1. evaluateGate's absolute and relative conditions are both required, with
//      exact boundaries (BigInt, no float rounding).
//   2. Parse-don't-validate: wrong schemaVersion / negative / non-integer /
//      hits>lines all fail MALFORMED; lines==0 fails EMPTY_POPULATION.
//   3. Missing current / missing baseline fail with distinct reason codes.
//   4. The PROCESS boundary: `--check` exits 1 on an injected drop / missing
//      files (the mandatory falsifiable demonstrations) and exits 0 within
//      threshold, driven through the AMADEUS_COVERAGE_* env seams.
//   5. `--update` refuses when the emit is absent and transcribes correctly
//      when present.
//   6. The RETAINED baseline population: a deletion leaves the comparison, a
//      regression in retained code does not, and with every file retained the
//      retained basis and the whole-project basis agree exactly.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateGate,
  type LcovPopulations,
  type LoadedPolicy,
  type LoadedTotals,
  main,
  resolveRetainedPopulation,
  runCheck,
  runUpdate,
} from "../coverage-project-gate.ts";

const __FILE_DIR = dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = join(__FILE_DIR, "..");
const TOOL = join(TESTS_DIR, "coverage-project-gate.ts");

/** Wrap a JSON-serialisable value as the present emit/baseline text. */
function present(value: unknown): LoadedTotals {
  return { present: true, text: JSON.stringify(value) };
}

function totals(hits: number, lines: number): Record<string, unknown> {
  return { schemaVersion: 1, hits, lines };
}

function policy(minimum = 0, relativeTolerance = 2): LoadedPolicy {
  return present({
    schemaVersion: 1,
    minimumProjectLineCoverageBasisPoints: minimum,
    maximumRelativeDropBasisPoints: relativeTolerance,
  });
}

// ---------------------------------------------------------------------------
// 1. evaluateGate — the exact -0.02pp boundary.
// ---------------------------------------------------------------------------
describe("evaluateGate: exact -0.02pp boundary (BigInt, no rounding)", () => {
  test("exactly -0.02pp below baseline PASSES", () => {
    // baseline 100.00% (10000/10000); current 99.98% (9998/10000) => delta -0.02pp.
    const r = evaluateGate(present(totals(9998, 10000)), present(totals(10000, 10000)), policy());
    expect(r.kind).toBe("pass");
    if (r.kind === "pass") {
      expect(r.currentPct).toBeCloseTo(99.98, 6);
      expect(r.basePct).toBeCloseTo(100, 6);
      expect(r.deltaPp).toBeCloseTo(-0.02, 6);
    }
  });

  test("a single hit beyond the -0.02pp boundary FAILS RELATIVE_DROP_EXCEEDED", () => {
    // baseline 100% (1_000_000/1_000_000); boundary current% is 99.98% =
    // 999_800/1_000_000. One hit below that (999_799) is the minimal strict drop.
    const r = evaluateGate(
      present(totals(999_799, 1_000_000)),
      present(totals(1_000_000, 1_000_000)),
      policy(),
    );
    expect(r.kind).toBe("fail");
    if (r.kind === "fail") expect(r.reason).toBe("RELATIVE_DROP_EXCEEDED");
  });

  test("a plain improvement PASSES", () => {
    const r = evaluateGate(present(totals(950, 1000)), present(totals(900, 1000)), policy());
    expect(r.kind).toBe("pass");
    if (r.kind === "pass") expect(r.deltaPp).toBeCloseTo(5, 6);
  });

  test("equal coverage PASSES", () => {
    const r = evaluateGate(present(totals(873, 1000)), present(totals(873, 1000)), policy());
    expect(r.kind).toBe("pass");
  });
});

describe("evaluateGate: absolute minimum AND relative tolerance", () => {
  test("rejects when only the absolute minimum fails", () => {
    const r = evaluateGate(present(totals(8999, 10000)), present(totals(8000, 10000)), policy(9000, 2));
    expect(r.kind === "fail" && r.reason).toBe("ABSOLUTE_MINIMUM_NOT_MET");
    expect(r.kind === "fail" && r.detail).toContain("failed: absolute minimum");
  });

  test("rejects when only the relative tolerance fails", () => {
    const r = evaluateGate(present(totals(9000, 10000)), present(totals(9100, 10000)), policy(9000, 2));
    expect(r.kind === "fail" && r.reason).toBe("RELATIVE_DROP_EXCEEDED");
    expect(r.kind === "fail" && r.detail).toContain("failed: relative tolerance");
  });

  test("rejects and reports both failed conditions", () => {
    const r = evaluateGate(present(totals(8999, 10000)), present(totals(9100, 10000)), policy(9000, 2));
    expect(r.kind === "fail" && r.reason).toBe("MULTIPLE_REQUIREMENTS_NOT_MET");
    expect(r.kind === "fail" && r.detail).toContain("failed: absolute minimum, relative tolerance");
  });

  test("passes exact equality at both boundaries", () => {
    const r = evaluateGate(
      present(totals(9000, 10000)),
      present(totals(9002, 10000)),
      policy(9000, 2),
    );
    expect(r.kind).toBe("pass");
  });

  test("passes when both conditions are exceeded", () => {
    const r = evaluateGate(present(totals(9200, 10000)), present(totals(9100, 10000)), policy(9000, 2));
    expect(r.kind).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// 2. evaluateGate — parse-don't-validate rejections.
// ---------------------------------------------------------------------------
describe("evaluateGate: malformed / empty inputs", () => {
  test("missing policy => MISSING_POLICY", () => {
    const r = evaluateGate(present(totals(1, 2)), present(totals(1, 2)), { present: false });
    expect(r.kind === "fail" && r.reason).toBe("MISSING_POLICY");
  });

  test("invalid policy JSON => MALFORMED_POLICY", () => {
    const r = evaluateGate(
      present(totals(1, 2)),
      present(totals(1, 2)),
      { present: true, text: "{not json" },
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED_POLICY");
  });

  test.each([null, "not an object"])("non-object policy JSON => MALFORMED_POLICY (%p)", (value) => {
    const r = evaluateGate(
      present(totals(1, 2)),
      present(totals(1, 2)),
      present(value),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED_POLICY");
  });

  test("wrong policy schemaVersion => MALFORMED_POLICY", () => {
    const r = evaluateGate(
      present(totals(1, 2)),
      present(totals(1, 2)),
      present({
        schemaVersion: 2,
        minimumProjectLineCoverageBasisPoints: 9000,
        maximumRelativeDropBasisPoints: 2,
      }),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED_POLICY");
  });

  test.each([
    [{ schemaVersion: 1, maximumRelativeDropBasisPoints: 2 }, "minimumProjectLineCoverageBasisPoints"],
    [{ schemaVersion: 1, minimumProjectLineCoverageBasisPoints: 9000 }, "maximumRelativeDropBasisPoints"],
    [
      {
        schemaVersion: 1,
        minimumProjectLineCoverageBasisPoints: 10001,
        maximumRelativeDropBasisPoints: 2,
      },
      "minimumProjectLineCoverageBasisPoints",
    ],
    [
      {
        schemaVersion: 1,
        minimumProjectLineCoverageBasisPoints: 9000,
        maximumRelativeDropBasisPoints: -1,
      },
      "maximumRelativeDropBasisPoints",
    ],
  ])("invalid or missing policy field => MALFORMED_POLICY (%s)", (value, field) => {
    const r = evaluateGate(present(totals(1, 2)), present(totals(1, 2)), present(value));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED_POLICY");
    expect(r.kind === "fail" && r.detail).toContain(field);
  });

  test("wrong schemaVersion => MALFORMED", () => {
    const r = evaluateGate(
      present({ schemaVersion: 2, hits: 1, lines: 2 }),
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("negative hits => MALFORMED", () => {
    const r = evaluateGate(
      present({ schemaVersion: 1, hits: -1, lines: 2 }),
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("non-integer lines => MALFORMED", () => {
    const r = evaluateGate(
      present({ schemaVersion: 1, hits: 1, lines: 2.5 }),
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("unsafe integer hits alone (beyond 2^53 - 1) => MALFORMED", () => {
    const r = evaluateGate(
      { present: true, text: '{"schemaVersion":1,"hits":9007199254740993,"lines":1}' },
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("unsafe integer lines alone (beyond 2^53 - 1) => MALFORMED", () => {
    const r = evaluateGate(
      { present: true, text: '{"schemaVersion":1,"hits":1,"lines":9007199254740993}' },
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("nested integer hits does not mask a fractional top-level token => MALFORMED", () => {
    const r = evaluateGate(
      {
        present: true,
        text: '{"schemaVersion":1,"hits":9007199254740991.1,"lines":9007199254740991,"meta":{"hits":1}}',
      },
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("fractional token that rounds to a safe integer => MALFORMED", () => {
    const r = evaluateGate(
      { present: true, text: '{"schemaVersion":1,"hits":9007199254740991.1,"lines":9007199254740991.1}' },
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("hits > lines => MALFORMED", () => {
    const r = evaluateGate(
      present({ schemaVersion: 1, hits: 3, lines: 2 }),
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("invalid JSON text => MALFORMED", () => {
    const r = evaluateGate(
      { present: true, text: "{not json" },
      present(totals(1, 2)),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("valid JSON that is not an object => MALFORMED", () => {
    const r = evaluateGate({ present: true, text: "42" }, present(totals(1, 2)), policy());
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
    expect(r.kind === "fail" && r.detail).toContain("expected a JSON object");
  });

  test("malformed BASELINE (current fine) => MALFORMED naming the baseline side", () => {
    const r = evaluateGate(
      present(totals(1, 2)),
      present({ schemaVersion: 9, hits: 1, lines: 2 }),
      policy(),
    );
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
    expect(r.kind === "fail" && r.detail).toContain("baseline:");
  });

  test("current lines == 0 => EMPTY_POPULATION", () => {
    const r = evaluateGate(present(totals(0, 0)), present(totals(1, 2)), policy());
    expect(r.kind === "fail" && r.reason).toBe("EMPTY_POPULATION");
  });

  test("baseline lines == 0 => EMPTY_POPULATION", () => {
    const r = evaluateGate(present(totals(1, 2)), present(totals(0, 0)), policy());
    expect(r.kind === "fail" && r.reason).toBe("EMPTY_POPULATION");
  });

  test("missing current => MISSING_CURRENT", () => {
    const r = evaluateGate({ present: false }, present(totals(1, 2)), policy());
    expect(r.kind === "fail" && r.reason).toBe("MISSING_CURRENT");
  });

  test("missing baseline => MISSING_BASELINE", () => {
    const r = evaluateGate(present(totals(1, 2)), { present: false }, policy());
    expect(r.kind === "fail" && r.reason).toBe("MISSING_BASELINE");
  });
});

// ---------------------------------------------------------------------------
// 3. Process boundary — `--check` through the env seams (falsifiable demos).
// ---------------------------------------------------------------------------
function runGate(args: string[], env: Record<string, string>): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [TOOL, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
  });
}

describe("process boundary: --check via AMADEUS_COVERAGE_* seams", () => {
  test("missing policy => exit 1 MISSING_POLICY", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-nopolicy-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      writeFileSync(totalsPath, JSON.stringify(totals(1000, 1000)));
      writeFileSync(baselinePath, JSON.stringify(totals(1000, 1000)));
      const res = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
        AMADEUS_COVERAGE_PROJECT_POLICY: join(tmp, "does-not-exist.json"),
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("MISSING_POLICY");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("injected drop => exit 1 mentioning RELATIVE_DROP_EXCEEDED", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-drop-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      writeFileSync(totalsPath, JSON.stringify(totals(900, 1000)));
      writeFileSync(baselinePath, JSON.stringify(totals(1000, 1000)));
      const res = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("RELATIVE_DROP_EXCEEDED");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("missing totals => exit 1 MISSING_CURRENT", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-nocur-"));
    try {
      const baselinePath = join(tmp, "baseline.json");
      writeFileSync(baselinePath, JSON.stringify(totals(1000, 1000)));
      const res = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: join(tmp, "does-not-exist.json"),
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("MISSING_CURRENT");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("missing baseline => exit 1 MISSING_BASELINE", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-nobase-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      writeFileSync(totalsPath, JSON.stringify(totals(1000, 1000)));
      const res = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: join(tmp, "does-not-exist.json"),
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("MISSING_BASELINE");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("within threshold => exit 0", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-ok-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      // Exactly at the -0.02pp boundary: passes.
      writeFileSync(totalsPath, JSON.stringify(totals(9998, 10000)));
      writeFileSync(baselinePath, JSON.stringify(totals(10000, 10000)));
      const res = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain("OK");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("no args => non-zero exit with usage", () => {
    const res = runGate([], {});
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("usage:");
  });
});

// ---------------------------------------------------------------------------
// 4. `--update`.
// ---------------------------------------------------------------------------
describe("process boundary: --update", () => {
  test("refuses (exit 1) when the emit is absent", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-upd-absent-"));
    try {
      const baselinePath = join(tmp, "baseline.json");
      const res = runGate(["--update"], {
        AMADEUS_COVERAGE_TOTALS: join(tmp, "does-not-exist.json"),
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toContain("coverage:ci");
      expect(existsSync(baselinePath)).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("transcribes hits/lines from the emit when present", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-upd-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      const policyPath = join(tmp, "policy.json");
      const originalPolicy = JSON.stringify({
        schemaVersion: 1,
        minimumProjectLineCoverageBasisPoints: 9000,
        maximumRelativeDropBasisPoints: 2,
      });
      writeFileSync(totalsPath, JSON.stringify(totals(1234, 2000)));
      writeFileSync(policyPath, originalPolicy);
      const res = runGate(["--update"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
        AMADEUS_COVERAGE_PROJECT_POLICY: policyPath,
      });
      expect(res.status).toBe(0);
      const written = JSON.parse(readFileSync(baselinePath, "utf8"));
      expect(written).toEqual({ schemaVersion: 1, hits: 1234, lines: 2000 });
      expect(readFileSync(policyPath, "utf8")).toBe(originalPolicy);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 5. In-process CLI plumbing — runCheck / runUpdate / main through the same
// env seams, WITHOUT a spawn. bun --coverage does not instrument spawned
// subprocesses, so these calls are what make the CLI wrapper lines count as
// covered; the spawnSync suite above stays as the process-boundary proof.
// ---------------------------------------------------------------------------
function withEnvSeams<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

describe("in-process CLI plumbing: runCheck / runUpdate / main", () => {
  test("main(['--check']) returns 0 within threshold and 1 on a drop", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-ip-check-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      writeFileSync(baselinePath, JSON.stringify(totals(1000, 1000)));
      const seams = {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
      };
      writeFileSync(totalsPath, JSON.stringify(totals(1000, 1000)));
      expect(withEnvSeams(seams, () => main(["--check"]))).toBe(0);
      writeFileSync(totalsPath, JSON.stringify(totals(900, 1000)));
      expect(withEnvSeams(seams, () => main(["--check"]))).toBe(1);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("runCheck returns 1 for missing emit and missing baseline", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-ip-miss-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      // Missing emit.
      expect(
        withEnvSeams(
          { AMADEUS_COVERAGE_TOTALS: totalsPath, AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath },
          () => runCheck(),
        ),
      ).toBe(1);
      // Emit present, baseline missing.
      writeFileSync(totalsPath, JSON.stringify(totals(1, 1)));
      expect(
        withEnvSeams(
          { AMADEUS_COVERAGE_TOTALS: totalsPath, AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath },
          () => runCheck(),
        ),
      ).toBe(1);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("runUpdate refuses on absent/malformed emit and transcribes on success", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-ip-upd-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      const seams = {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
      };
      expect(withEnvSeams(seams, () => runUpdate())).toBe(1); // absent
      writeFileSync(totalsPath, JSON.stringify({ schemaVersion: 2, hits: 1, lines: 1 }));
      expect(withEnvSeams(seams, () => runUpdate())).toBe(1); // malformed
      writeFileSync(totalsPath, JSON.stringify(totals(42, 100)));
      expect(withEnvSeams(seams, () => runUpdate())).toBe(0);
      expect(JSON.parse(readFileSync(baselinePath, "utf8"))).toEqual({
        schemaVersion: 1,
        hits: 42,
        lines: 100,
      });
      expect(withEnvSeams(seams, () => main(["--update"]))).toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("main rejects no args / unknown args with usage (exit 2)", () => {
    expect(main([])).toBe(2);
    expect(main(["--frobnicate"])).toBe(2);
    expect(main(["--check", "--update"])).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 6. The retained baseline population.
//
// One LCOV record per file, in the shape the runner's combined report emits:
// repo-relative SF, one LF/LH pair. The totals emit beside it must agree, which
// is what makes a stale artifact a loud failure rather than a silent reweighting.
// ---------------------------------------------------------------------------
function lcov(files: ReadonlyArray<[source: string, hits: number, lines: number]>): LoadedTotals {
  const records = files.map(
    ([source, hits, lines]) => `TN:\nSF:${source}\nLF:${lines}\nLH:${hits}\nend_of_record`,
  );
  return { present: true, text: `${records.join("\n")}\n` };
}

function sum(files: ReadonlyArray<[source: string, hits: number, lines: number]>): {
  hits: number;
  lines: number;
} {
  return {
    hits: files.reduce((acc, [, hits]) => acc + hits, 0),
    lines: files.reduce((acc, [, , lines]) => acc + lines, 0),
  };
}

function populations(
  currentFiles: ReadonlyArray<[string, number, number]>,
  baseFiles: ReadonlyArray<[string, number, number]>,
): LcovPopulations {
  return { current: lcov(currentFiles), base: lcov(baseFiles) };
}

describe("retained baseline population", () => {
  // The mix effect this basis exists to remove: a well-covered file is deleted
  // and NOTHING that remains changed by one line. Whole-project ratios call that
  // a 25pp regression; the retained comparison calls it what it is — no change.
  test("deleting a well-covered file is not a regression", () => {
    const kept: [string, number, number][] = [["src/kept.ts", 50, 100]];
    const baseFiles: [string, number, number][] = [...kept, ["src/gone.ts", 100, 100]];
    const cur = sum(kept);
    const base = sum(baseFiles);
    expect(base.hits / base.lines).toBeGreaterThan(cur.hits / cur.lines); // the mix effect, measured

    const aggregate = evaluateGate(present(totals(cur.hits, cur.lines)), present(totals(base.hits, base.lines)), policy());
    expect(aggregate.kind === "fail" && aggregate.reason).toBe("RELATIVE_DROP_EXCEEDED");

    const retained = evaluateGate(
      present(totals(cur.hits, cur.lines)),
      present(totals(base.hits, base.lines)),
      policy(),
      populations(kept, baseFiles),
    );
    expect(retained.kind).toBe("pass");
    if (retained.kind === "pass") {
      expect(retained.basis).toBe("retained");
      expect(retained.deltaPp).toBe(0);
      expect(retained.retained).toEqual({
        base: { hits: 50, lines: 100 },
        removedFiles: 1,
        removedLines: 100,
      });
    }
  });

  // The other half, and the one that keeps the gate a gate: the same deletion
  // PLUS a real loss in retained code must still fail.
  test("a retained file that loses hits still fails, deletion or not", () => {
    const baseFiles: [string, number, number][] = [
      ["src/kept.ts", 50, 100],
      ["src/gone.ts", 100, 100],
    ];
    const currentFiles: [string, number, number][] = [["src/kept.ts", 49, 100]];
    const cur = sum(currentFiles);
    const base = sum(baseFiles);
    const result = evaluateGate(
      present(totals(cur.hits, cur.lines)),
      present(totals(base.hits, base.lines)),
      policy(),
      populations(currentFiles, baseFiles),
    );
    expect(result.kind === "fail" && result.reason).toBe("RELATIVE_DROP_EXCEEDED");
    expect(result.kind === "fail" && result.detail).toContain("retained basis");
  });

  // A new file was never in the baseline, so it cannot be excluded from it:
  // arriving with no coverage still moves the current ratio and still fails.
  test("a new uncovered file still drops the delta", () => {
    const baseFiles: [string, number, number][] = [["src/kept.ts", 100, 100]];
    const currentFiles: [string, number, number][] = [...baseFiles, ["src/new.ts", 0, 100]];
    const cur = sum(currentFiles);
    const base = sum(baseFiles);
    const result = evaluateGate(
      present(totals(cur.hits, cur.lines)),
      present(totals(base.hits, base.lines)),
      policy(),
      populations(currentFiles, baseFiles),
    );
    expect(result.kind === "fail" && result.reason).toBe("RELATIVE_DROP_EXCEEDED");
  });

  // The boundary that proves this is a refinement and not a different gate.
  test("with every file retained the two bases give the identical verdict", () => {
    const files: [string, number, number][] = [
      ["src/a.ts", 90, 100],
      ["src/b.ts", 30, 50],
    ];
    const currentFiles: [string, number, number][] = [
      ["src/a.ts", 89, 100],
      ["src/b.ts", 30, 50],
    ];
    const cur = sum(currentFiles);
    const base = sum(files);
    const aggregate = evaluateGate(present(totals(cur.hits, cur.lines)), present(totals(base.hits, base.lines)), policy());
    const retained = evaluateGate(
      present(totals(cur.hits, cur.lines)),
      present(totals(base.hits, base.lines)),
      policy(),
      populations(currentFiles, files),
    );
    expect(retained.kind).toBe(aggregate.kind);
    if (retained.kind === "pass" && aggregate.kind === "pass") {
      expect(retained.basePct).toBe(aggregate.basePct);
      expect(retained.deltaPp).toBe(aggregate.deltaPp);
      expect(retained.retained).toEqual({ base: base, removedFiles: 0, removedLines: 0 });
    }
  });

  test("one side without a per-file reading falls back to the whole-project basis", () => {
    const files: [string, number, number][] = [["src/kept.ts", 50, 100]];
    for (const input of [
      { current: lcov(files) },
      { base: lcov(files) },
      {},
      { current: { present: false } as LoadedTotals, base: lcov(files) },
    ]) {
      const result = evaluateGate(present(totals(50, 100)), present(totals(50, 100)), policy(), input);
      expect(result.kind).toBe("pass");
      if (result.kind === "pass") {
        expect(result.basis).toBe("aggregate");
        expect(result.retained).toBeNull();
      }
    }
  });

  // A report that does not sum to the emit beside it is two different runs.
  // Reweighting from mismatched artifacts is worse than not reweighting at all.
  test("an lcov that disagrees with its emit fails closed", () => {
    const files: [string, number, number][] = [["src/kept.ts", 50, 100]];
    const wrongCurrent = evaluateGate(
      present(totals(60, 100)),
      present(totals(50, 100)),
      policy(),
      populations(files, files),
    );
    expect(wrongCurrent.kind === "fail" && wrongCurrent.reason).toBe("LCOV_TOTALS_MISMATCH");
    expect(wrongCurrent.kind === "fail" && wrongCurrent.detail).toContain("current lcov sums to 50/100");

    const wrongBase = evaluateGate(
      present(totals(50, 100)),
      present(totals(60, 100)),
      policy(),
      populations(files, files),
    );
    expect(wrongBase.kind === "fail" && wrongBase.reason).toBe("LCOV_TOTALS_MISMATCH");
    expect(wrongBase.kind === "fail" && wrongBase.detail).toContain("baseline lcov sums to 50/100");
  });

  test("a baseline whose every file is gone keeps the whole-project basis", () => {
    const baseFiles: [string, number, number][] = [["src/gone.ts", 100, 100]];
    const currentFiles: [string, number, number][] = [["src/new.ts", 100, 100]];
    const outcome = resolveRetainedPopulation(
      { hits: 100, lines: 100 },
      { hits: 100, lines: 100 },
      populations(currentFiles, baseFiles),
    );
    expect(outcome.ok && outcome.retained).toBeNull();
  });

  test("the absolute minimum is unaffected by the retained basis", () => {
    const baseFiles: [string, number, number][] = [
      ["src/kept.ts", 50, 100],
      ["src/gone.ts", 100, 100],
    ];
    const currentFiles: [string, number, number][] = [["src/kept.ts", 50, 100]];
    const result = evaluateGate(
      present(totals(50, 100)),
      present(totals(150, 200)),
      policy(9000, 2),
      populations(currentFiles, baseFiles),
    );
    // Relative is satisfied by the retained basis; the absolute floor is not,
    // and it still reads the whole current population.
    expect(result.kind === "fail" && result.reason).toBe("ABSOLUTE_MINIMUM_NOT_MET");
  });
});

describe("process boundary: the retained basis through its env seams", () => {
  test("--check reports which basis it used, and the deletion passes only with the base lcov", () => {
    const tmp = mkdtempSync(join(tmpdir(), "cov-gate-retained-"));
    try {
      const totalsPath = join(tmp, "coverage-totals.json");
      const baselinePath = join(tmp, "baseline.json");
      const currentLcovPath = join(tmp, "head-lcov.info");
      const baseLcovPath = join(tmp, "base-lcov.info");
      // A floor of 0 so this case reads the relative condition alone; the
      // absolute floor has its own cases above.
      const policyPath = join(tmp, "policy.json");
      writeFileSync(
        policyPath,
        JSON.stringify({
          schemaVersion: 1,
          minimumProjectLineCoverageBasisPoints: 0,
          maximumRelativeDropBasisPoints: 2,
        }),
      );
      writeFileSync(totalsPath, JSON.stringify(totals(50, 100)));
      writeFileSync(baselinePath, JSON.stringify(totals(150, 200)));
      writeFileSync(currentLcovPath, "TN:\nSF:src/kept.ts\nLF:100\nLH:50\nend_of_record\n");
      writeFileSync(
        baseLcovPath,
        "TN:\nSF:src/kept.ts\nLF:100\nLH:50\nend_of_record\nTN:\nSF:src/gone.ts\nLF:100\nLH:100\nend_of_record\n",
      );

      // Without the baseline lcov the whole-project basis still sees the mix
      // effect and fails — the same inputs, the older question.
      const aggregate = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
        AMADEUS_COVERAGE_LCOV: currentLcovPath,
        AMADEUS_COVERAGE_PROJECT_POLICY: policyPath,
      });
      expect(aggregate.status).toBe(1);
      expect(aggregate.stderr).toContain("RELATIVE_DROP_EXCEEDED");

      const retained = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
        AMADEUS_COVERAGE_LCOV: currentLcovPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE_LCOV: baseLcovPath,
        AMADEUS_COVERAGE_PROJECT_POLICY: policyPath,
      });
      expect(retained.status).toBe(0);
      expect(retained.stdout).toContain("retained baseline: 1 removed file(s), 100 removed line(s)");

      // And the regression the retained basis must still catch.
      writeFileSync(totalsPath, JSON.stringify(totals(49, 100)));
      writeFileSync(currentLcovPath, "TN:\nSF:src/kept.ts\nLF:100\nLH:49\nend_of_record\n");
      const regressed = runGate(["--check"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
        AMADEUS_COVERAGE_LCOV: currentLcovPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE_LCOV: baseLcovPath,
        AMADEUS_COVERAGE_PROJECT_POLICY: policyPath,
      });
      expect(regressed.status).toBe(1);
      expect(regressed.stderr).toContain("RELATIVE_DROP_EXCEEDED");
      expect(regressed.stderr).toContain("retained basis");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
