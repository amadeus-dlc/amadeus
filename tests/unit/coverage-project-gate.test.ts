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
//   1. evaluateGate's EXACT -0.02pp boundary: equality passes, one hit below
//      fails DROP_EXCEEDED (BigInt, no float rounding).
//   2. Parse-don't-validate: wrong schemaVersion / negative / non-integer /
//      hits>lines all fail MALFORMED; lines==0 fails EMPTY_POPULATION.
//   3. Missing current / missing baseline fail with distinct reason codes.
//   4. The PROCESS boundary: `--check` exits 1 on an injected drop / missing
//      files (the mandatory falsifiable demonstrations) and exits 0 within
//      threshold, driven through the AMADEUS_COVERAGE_* env seams.
//   5. `--update` refuses when the emit is absent and transcribes correctly
//      when present.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateGate, type LoadedTotals, main, runCheck, runUpdate } from "../coverage-project-gate.ts";

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

// ---------------------------------------------------------------------------
// 1. evaluateGate — the exact -0.02pp boundary.
// ---------------------------------------------------------------------------
describe("evaluateGate: exact -0.02pp boundary (BigInt, no rounding)", () => {
  test("exactly -0.02pp below baseline PASSES", () => {
    // baseline 100.00% (10000/10000); current 99.98% (9998/10000) => delta -0.02pp.
    const r = evaluateGate(present(totals(9998, 10000)), present(totals(10000, 10000)));
    expect(r.kind).toBe("pass");
    if (r.kind === "pass") {
      expect(r.currentPct).toBeCloseTo(99.98, 6);
      expect(r.basePct).toBeCloseTo(100, 6);
      expect(r.deltaPp).toBeCloseTo(-0.02, 6);
    }
  });

  test("a single hit beyond the -0.02pp boundary FAILS DROP_EXCEEDED", () => {
    // baseline 100% (1_000_000/1_000_000); boundary current% is 99.98% =
    // 999_800/1_000_000. One hit below that (999_799) is the minimal strict drop.
    const r = evaluateGate(present(totals(999_799, 1_000_000)), present(totals(1_000_000, 1_000_000)));
    expect(r.kind).toBe("fail");
    if (r.kind === "fail") expect(r.reason).toBe("DROP_EXCEEDED");
  });

  test("a plain improvement PASSES", () => {
    const r = evaluateGate(present(totals(950, 1000)), present(totals(900, 1000)));
    expect(r.kind).toBe("pass");
    if (r.kind === "pass") expect(r.deltaPp).toBeCloseTo(5, 6);
  });

  test("equal coverage PASSES", () => {
    const r = evaluateGate(present(totals(873, 1000)), present(totals(873, 1000)));
    expect(r.kind).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// 2. evaluateGate — parse-don't-validate rejections.
// ---------------------------------------------------------------------------
describe("evaluateGate: malformed / empty inputs", () => {
  test("wrong schemaVersion => MALFORMED", () => {
    const r = evaluateGate(present({ schemaVersion: 2, hits: 1, lines: 2 }), present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("negative hits => MALFORMED", () => {
    const r = evaluateGate(present({ schemaVersion: 1, hits: -1, lines: 2 }), present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("non-integer lines => MALFORMED", () => {
    const r = evaluateGate(present({ schemaVersion: 1, hits: 1, lines: 2.5 }), present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("hits > lines => MALFORMED", () => {
    const r = evaluateGate(present({ schemaVersion: 1, hits: 3, lines: 2 }), present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("invalid JSON text => MALFORMED", () => {
    const r = evaluateGate({ present: true, text: "{not json" }, present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
  });

  test("valid JSON that is not an object => MALFORMED", () => {
    const r = evaluateGate({ present: true, text: "42" }, present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
    expect(r.kind === "fail" && r.detail).toContain("expected a JSON object");
  });

  test("malformed BASELINE (current fine) => MALFORMED naming the baseline side", () => {
    const r = evaluateGate(present(totals(1, 2)), present({ schemaVersion: 9, hits: 1, lines: 2 }));
    expect(r.kind === "fail" && r.reason).toBe("MALFORMED");
    expect(r.kind === "fail" && r.detail).toContain("baseline:");
  });

  test("current lines == 0 => EMPTY_POPULATION", () => {
    const r = evaluateGate(present(totals(0, 0)), present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("EMPTY_POPULATION");
  });

  test("baseline lines == 0 => EMPTY_POPULATION", () => {
    const r = evaluateGate(present(totals(1, 2)), present(totals(0, 0)));
    expect(r.kind === "fail" && r.reason).toBe("EMPTY_POPULATION");
  });

  test("missing current => MISSING_CURRENT", () => {
    const r = evaluateGate({ present: false }, present(totals(1, 2)));
    expect(r.kind === "fail" && r.reason).toBe("MISSING_CURRENT");
  });

  test("missing baseline => MISSING_BASELINE", () => {
    const r = evaluateGate(present(totals(1, 2)), { present: false });
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
  test("injected drop => exit 1 mentioning DROP_EXCEEDED", () => {
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
      expect(res.stderr).toContain("DROP_EXCEEDED");
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
      writeFileSync(totalsPath, JSON.stringify(totals(1234, 2000)));
      const res = runGate(["--update"], {
        AMADEUS_COVERAGE_TOTALS: totalsPath,
        AMADEUS_COVERAGE_PROJECT_BASELINE: baselinePath,
      });
      expect(res.status).toBe(0);
      const written = JSON.parse(readFileSync(baselinePath, "utf8"));
      expect(written).toEqual({ schemaVersion: 1, hits: 1234, lines: 2000 });
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
