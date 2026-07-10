// covers: subcommand:complexity-gate:check, subcommand:complexity-gate:update
//
// The CCN complexity gate (tests/complexity-gate.ts). Two layers, mirroring
// coverage-project-gate.test.ts:
//   - in-process: the pure verdict/parse seams (bun --coverage's spawn blind
//     spot makes this layer the lcov carrier for every decision branch)
//   - spawn: the CLI boundary, proving each verdict class renders its M-string
//     contract (refined-mockups M1..M7) with the right exit code against
//     injected fixtures — the gate's own falling demonstration.

import { describe, expect, test, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CCN_BLOCK_THRESHOLD,
  CCN_WARN_FLOOR,
  assignOrdinals,
  baselineMapOf,
  evaluateComplexity,
  functionKey,
  parseBaselineText,
  parseLizardCsv,
  renderBaseline,
  type KeyedFunctionRecord,
} from "../complexity-gate.ts";

const GATE = join(import.meta.dir, "..", "complexity-gate.ts");
const BUN = process.execPath;

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "complexity-gate-test-"));
  tempDirs.push(dir);
  return dir;
}

function rec(path: string, name: string, ccn: number, ordinal = 0): KeyedFunctionRecord {
  return { path, name, ccn, ordinal };
}

// --- in-process: C-3 verdict --------------------------------------------------

describe("evaluateComplexity (pure verdict)", () => {
  test("BR-C02: a new function over the threshold is a NEW_VIOLATION", () => {
    const verdict = evaluateComplexity([rec("a.ts", "f", CCN_BLOCK_THRESHOLD + 1)], new Map());
    expect(verdict.kind).toBe("fail");
    if (verdict.kind === "fail") {
      expect(verdict.newViolations).toHaveLength(1);
      expect(verdict.regressions).toHaveLength(0);
    }
  });

  test("BR-C02: a new function at exactly the threshold passes", () => {
    const verdict = evaluateComplexity([rec("a.ts", "f", CCN_BLOCK_THRESHOLD)], new Map());
    expect(verdict.kind).toBe("pass");
  });

  test("BR-C03: a baselined function above its recorded CCN is a RATCHET_REGRESSION", () => {
    const baseline = new Map([[functionKey(rec("a.ts", "f", 0)), 20]]);
    const verdict = evaluateComplexity([rec("a.ts", "f", 21)], baseline);
    expect(verdict.kind).toBe("fail");
    if (verdict.kind === "fail") {
      expect(verdict.regressions).toHaveLength(1);
      expect(verdict.regressions[0].baselineCcn).toBe(20);
      expect(verdict.newViolations).toHaveLength(0);
    }
  });

  test("BR-C03: a baselined function at or below its recorded CCN passes (ratchet holds)", () => {
    const baseline = new Map([[functionKey(rec("a.ts", "f", 0)), 20]]);
    expect(evaluateComplexity([rec("a.ts", "f", 20)], baseline).kind).toBe("pass");
    expect(evaluateComplexity([rec("a.ts", "f", 16)], baseline).kind).toBe("pass");
  });

  test("BR-C04: the warn band is collected but never fails the verdict", () => {
    const verdict = evaluateComplexity(
      [rec("a.ts", "f", CCN_WARN_FLOOR), rec("a.ts", "g", CCN_BLOCK_THRESHOLD)],
      new Map(),
    );
    expect(verdict.kind).toBe("pass");
    if (verdict.kind === "pass") expect(verdict.warnBand).toHaveLength(2);
  });

  test("BR-C09: a baselined function missing from the measurement is ignored", () => {
    const baseline = new Map([[functionKey(rec("gone.ts", "f", 0)), 40]]);
    expect(evaluateComplexity([], baseline).kind).toBe("pass");
  });

  test("same-name functions are distinguished by ordinal", () => {
    const measured = assignOrdinals([
      { path: "a.ts", name: "f", ccn: 3 },
      { path: "a.ts", name: "f", ccn: 30 },
    ]);
    const baseline = new Map([[functionKey({ path: "a.ts", name: "f", ordinal: 1 }), 30]]);
    expect(evaluateComplexity(measured, baseline).kind).toBe("pass");
    const regressed = measured.map((m) => (m.ordinal === 1 ? { ...m, ccn: 31 } : m));
    expect(evaluateComplexity(regressed, baseline).kind).toBe("fail");
  });
});

// --- in-process: C-2 baseline parse -------------------------------------------

describe("parseBaselineText (parse, don't validate)", () => {
  const valid = { schemaVersion: 1, threshold: 15, entries: [{ path: "a.ts", name: "f", ordinal: 0, ccn: 20 }] };

  test("accepts a well-formed baseline", () => {
    const parsed = parseBaselineText(JSON.stringify(valid));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(baselineMapOf(parsed.doc).get("a.ts::f::0")).toBe(20);
  });

  test.each([
    ["invalid JSON", "{not json"],
    ["wrong schemaVersion", JSON.stringify({ ...valid, schemaVersion: 2 })],
    ["non-integer threshold", JSON.stringify({ ...valid, threshold: "15" })],
    ["non-array entries", JSON.stringify({ ...valid, entries: {} })],
    ["entry missing name", JSON.stringify({ ...valid, entries: [{ path: "a.ts", ordinal: 0, ccn: 20 }] })],
    ["entry with ccn 0", JSON.stringify({ ...valid, entries: [{ path: "a.ts", name: "f", ordinal: 0, ccn: 0 }] })],
    [
      "duplicate keys",
      JSON.stringify({ ...valid, entries: [valid.entries[0], { ...valid.entries[0] }] }),
    ],
  ])("rejects %s with a detail", (_label, text) => {
    const parsed = parseBaselineText(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.detail.length).toBeGreaterThan(0);
  });
});

// --- in-process: C-1 csv parse + C-2 render ------------------------------------

describe("parseLizardCsv / renderBaseline", () => {
  test("parses rows, strips the repo root, survives commas in long_name", () => {
    const csv = [
      '23,7,199,2,38,"f@46-83@/repo/scripts/a.ts","/repo/scripts/a.ts","f","f ( a , b )",46,83',
      "garbage line",
      '10,21,96,3,11,"g@5-9@/repo/core/b.ts","/repo/core/b.ts","g","g ( )",5,9',
    ].join("\n");
    const records = parseLizardCsv(csv, "/repo");
    expect(records).toEqual([
      { path: "scripts/a.ts", name: "f", ccn: 7 },
      { path: "core/b.ts", name: "g", ccn: 21 },
    ]);
  });

  test("renderBaseline keeps only over-threshold entries, sorted and deterministic", () => {
    const records = assignOrdinals([
      { path: "b.ts", name: "z", ccn: 30 },
      { path: "a.ts", name: "f", ccn: 3 },
      { path: "a.ts", name: "g", ccn: 16 },
    ]);
    const body = renderBaseline(records);
    const doc = JSON.parse(body);
    expect(doc.entries).toEqual([
      { path: "a.ts", name: "g", ordinal: 0, ccn: 16 },
      { path: "b.ts", name: "z", ordinal: 0, ccn: 30 },
    ]);
    expect(renderBaseline(records)).toBe(body);
  });
});

// --- spawn boundary: verdict classes render their M-contracts ------------------
//
// A tiny fixture tree + env seams make every verdict class reachable and
// deterministic. The simple/tangled sources are the falling-demonstration
// inputs: `tangled` measures well over the threshold.

const SIMPLE_FN = "export function simple(a: number): number {\n  return a + 1;\n}\n";
// Deeply branched on purpose: measures CCN > 15 under lizard.
const TANGLED_FN = `export function tangled(a: number): number {
  let r = 0;
  for (let i = 0; i < a; i++) {
    if (i % 2) {
      for (let j = 0; j < i; j++) {
        if (j % 3) {
          while (r < 100) {
            if (r % 5) { r += j; } else if (r % 7) { r += i; } else if (r % 11) { r -= 1; } else { r = 0; }
          }
        } else if (j % 4) { r += 2; } else if (j % 5) { r += 3; }
      }
    } else if (i % 5) {
      switch (r % 4) {
        case 0: r += 1; break;
        case 1: r += 2; break;
        case 2: r += 3; break;
        default: r -= 1;
      }
    } else if (i % 7) { r += 5; }
  }
  return r;
}
`;

interface GateRun {
  status: number;
  stdout: string;
  stderr: string;
}

function runGate(args: string[], env: Record<string, string>): GateRun {
  const result = spawnSync(BUN, [GATE, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
  });
  return { status: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function fixtureProject(sources: Record<string, string>): { root: string; baseline: string } {
  const root = tempDir();
  const src = join(root, "src");
  mkdirSync(src, { recursive: true });
  for (const [name, body] of Object.entries(sources)) {
    writeFileSync(join(src, name), body, "utf8");
  }
  return { root: src, baseline: join(root, "baseline.json") };
}

describe("complexity-gate CLI (spawn boundary, M-contracts)", () => {
  test("M6/M1: --update then --check is green on a clean fixture (US-1.1 shape)", () => {
    const fx = fixtureProject({ "simple.ts": SIMPLE_FN });
    const env = { AMADEUS_COMPLEXITY_ROOTS: fx.root, AMADEUS_COMPLEXITY_BASELINE: fx.baseline };
    const update = runGate(["--update"], env);
    expect(update.status).toBe(0);
    expect(update.stdout).toContain("Wrote ");
    expect(update.stdout).toContain("0 entries");
    const check = runGate(["--check"], env);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("complexity gate: OK — 0 new violations, 0 regressions");
  }, 30000);

  test("M2: an injected over-threshold function fails as NEW_VIOLATION (falling demonstration)", () => {
    const fx = fixtureProject({ "simple.ts": SIMPLE_FN });
    const env = { AMADEUS_COMPLEXITY_ROOTS: fx.root, AMADEUS_COMPLEXITY_BASELINE: fx.baseline };
    expect(runGate(["--update"], env).status).toBe(0);
    writeFileSync(join(fx.root, "tangled.ts"), TANGLED_FN, "utf8");
    const check = runGate(["--check"], env);
    expect(check.status).toBe(1);
    expect(check.stderr).toContain("COMPLEXITY GATE FAILED [NEW_VIOLATION]");
    expect(check.stderr).toContain("tangled");
    expect(check.stderr).toContain("bun tests/complexity-gate.ts --update");
  }, 30000);

  test("M3: a baselined function that got worse fails as RATCHET_REGRESSION", () => {
    const fx = fixtureProject({ "simple.ts": SIMPLE_FN, "tangled.ts": TANGLED_FN });
    const env = { AMADEUS_COMPLEXITY_ROOTS: fx.root, AMADEUS_COMPLEXITY_BASELINE: fx.baseline };
    expect(runGate(["--update"], env).status).toBe(0);
    // Lower the recorded CCN one below the real measurement: the (unchanged)
    // source now reads as "got more complex than the baseline remembers".
    const parsed = JSON.parse(readFileSync(fx.baseline, "utf8"));
    parsed.entries[0].ccn -= 1;
    writeFileSync(fx.baseline, JSON.stringify(parsed, null, 2), "utf8");
    const check = runGate(["--check"], env);
    expect(check.status).toBe(1);
    expect(check.stderr).toContain("COMPLEXITY GATE FAILED [RATCHET_REGRESSION]");
    expect(check.stderr).toContain("-> ");
    expect(check.stderr).toContain("The baseline only ratchets down.");
  }, 30000);

  test("M4: a missing baseline fails closed as MISSING_BASELINE", () => {
    const fx = fixtureProject({ "simple.ts": SIMPLE_FN });
    const check = runGate(["--check"], {
      AMADEUS_COMPLEXITY_ROOTS: fx.root,
      AMADEUS_COMPLEXITY_BASELINE: fx.baseline,
    });
    expect(check.status).toBe(1);
    expect(check.stderr).toContain("COMPLEXITY GATE FAILED [MISSING_BASELINE]");
    expect(check.stderr).toContain("--update");
  }, 30000);

  test("M4: a malformed baseline fails closed as MALFORMED with a formatted diagnosis", () => {
    const fx = fixtureProject({ "simple.ts": SIMPLE_FN });
    writeFileSync(fx.baseline, "<<<<<<< conflict garbage", "utf8");
    const check = runGate(["--check"], {
      AMADEUS_COMPLEXITY_ROOTS: fx.root,
      AMADEUS_COMPLEXITY_BASELINE: fx.baseline,
    });
    expect(check.status).toBe(1);
    expect(check.stderr).toContain("COMPLEXITY GATE FAILED [MALFORMED]");
    expect(check.stderr).not.toContain("    at "); // formatted, not a stack trace
  }, 30000);

  test("M4: a broken lizard launcher fails closed as MEASUREMENT_FAILED", () => {
    const fx = fixtureProject({ "simple.ts": SIMPLE_FN });
    const check = runGate(["--check"], {
      AMADEUS_COMPLEXITY_ROOTS: fx.root,
      AMADEUS_COMPLEXITY_BASELINE: fx.baseline,
      AMADEUS_COMPLEXITY_LIZARD_CMD: "false",
    });
    expect(check.status).toBe(1);
    expect(check.stderr).toContain("COMPLEXITY GATE FAILED [MEASUREMENT_FAILED]");
    expect(check.stderr).toContain("pip install lizard==1.23.0");
  }, 30000);

  test("M5: warn-band functions are listed without failing", () => {
    const moderate = `export function moderate(a: number): number {
  let r = 0;
  for (let i = 0; i < a; i++) {
    if (i % 2) { r += 1; } else if (i % 3) { r += 2; } else if (i % 5) { r += 3; }
    if (r % 7) { r -= 1; } else if (r % 11) { r -= 2; } else if (r % 13) { r -= 3; }
    if (a % 2) { r *= 2; } else if (a % 3) { r *= 3; } else if (a % 5) { r *= 4; } else if (a % 7) { r *= 5; }
  }
  return r;
}
`;
    const fx = fixtureProject({ "moderate.ts": moderate });
    const env = { AMADEUS_COMPLEXITY_ROOTS: fx.root, AMADEUS_COMPLEXITY_BASELINE: fx.baseline };
    expect(runGate(["--update"], env).status).toBe(0);
    const check = runGate(["--check"], env);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("warn band (informational, not blocking)");
    expect(check.stdout).toContain("moderate");
  }, 30000);

  test("M7: unknown arguments exit 2 with usage", () => {
    const run = runGate([], {});
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("usage: bun tests/complexity-gate.ts <--check | --update>");
  }, 30000);
});
