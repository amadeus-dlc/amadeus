// covers: file:packages/framework/core/tools/amadeus-sensor-depth-budget.ts,
//         file:packages/framework/core/sensors/amadeus-depth-budget.md,
//         file:packages/framework/core/tools/amadeus-sensor.ts
// size: medium
//
// #2425 the depth-budget sensor — the third leg of depth delivery. The engine
// now delivers `directive.depth` and the stage contracts state a per-depth
// volume, but nothing MEASURES the result: `brief` had no numeric meaning, so
// the same kind of intent produced requirements.md files spanning 5,382 B to
// 61,333 B (11x) with Minimal's median ABOVE Standard's.
//
// This sensor gives `brief` a number. It is advisory by construction (the
// shipped schema admits no other severity), so a finding is data at the gate,
// never a block. Halves:
//
//   1. The manifest is well-formed by the SHIPPED schema, advisory-only, and
//      its `matches` glob addresses the requirements.md the stage produces —
//      under BOTH glob engines that see it (the dispatcher's own matcher and
//      Bun.Glob in the PostToolUse hook), which disagree on some patterns.
//   2. The predicate measures bytes per numbered FR and flags a depth's
//      ceiling being exceeded. Thresholds are deliberately BELOW today's
//      measured medians (Minimal 2,459 B/FR, Standard 2,067 B/FR) so the gate
//      is not a rubber stamp on the status quo.
//
// Fail-open everywhere absence is legitimate: no file, no depth, and
// Comprehensive (which declares no ceiling) all pass. The one exception is a
// requirements.md with NO numbered FRs at all — that is the stage contract's
// `FR-n` requirement going unmet, and it is reported.
//
// Touches a real filesystem (fixtures on disk + the real manifest), hence the
// integration tier (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseSensorManifest,
  validateSensorManifest,
} from "../../packages/framework/core/tools/amadeus-sensor-schema.ts";
import {
  DEPTH_BUDGETS,
  evaluateDepthBudget,
  main as sensorMain,
  readRecordDepth,
} from "../../packages/framework/core/tools/amadeus-sensor-depth-budget.ts";
import {
  depthBudgetArgs,
  matchesGlob,
} from "../../packages/framework/core/tools/amadeus-sensor.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = join(REPO_ROOT, "packages/framework/core/sensors/amadeus-depth-budget.md");
const STAGE_FILE = join(
  REPO_ROOT,
  "packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md",
);

let tmp = "";
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "amadeus-t488-"));
});
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

/** A requirements.md body of EXACTLY `count * bytesPerFr` bytes carrying
 *  `count` numbered FRs, so a fixture sized at a ceiling measures at that
 *  ceiling rather than one byte over it. */
function requirements(count: number, bytesPerFr: number, heading = "### FR-"): string {
  const parts: string[] = [];
  for (let n = 1; n <= count; n += 1) {
    const head = `${heading}${n}: requirement ${n}\n`;
    // Each block ends with a newline so the NEXT heading starts a line — the
    // FR patterns anchor at line start, and running them together would leave
    // every requirement after the first uncounted.
    parts.push(`${head}${"x".repeat(Math.max(0, bytesPerFr - head.length - 1))}\n`);
  }
  return parts.join("");
}

function writeRequirements(body: string): string {
  const p = join(tmp, "requirements.md");
  writeFileSync(p, body);
  return p;
}

// ===========================================================================
// 1. The manifest
// ===========================================================================

describe("t488 depth-budget manifest", () => {
  test("is a well-formed, advisory, document-shape sensor manifest", () => {
    const parsed = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    expect(() => validateSensorManifest(parsed, MANIFEST, "depth-budget")).not.toThrow();
    expect(parsed.id).toBe("depth-budget");
    expect(parsed.kind).toBe("deterministic");
    expect(parsed.default_severity).toBe("advisory");
    // document-shape restricts firing to the run-stage's declared produces, so
    // the sensor cannot fire on an unrelated requirements.md in the tree.
    expect(parsed.category).toBe("document-shape");
  });

  test("matches the requirements.md the stage produces, under BOTH glob engines", () => {
    const parsed = parseSensorManifest(readFileSync(MANIFEST, "utf-8"));
    const glob = parsed.matches ?? "";
    const real = "amadeus/spaces/default/intents/260808-x-ab12cd34/inception/requirements-analysis/requirements.md";
    // The dispatcher uses its own matcher; the PostToolUse hook uses Bun.Glob.
    // A pattern the two read differently fires in one place and not the other,
    // so both are asserted on the same path.
    expect({ engine: "dispatcher", hit: matchesGlob(glob, real) }).toEqual({ engine: "dispatcher", hit: true });
    expect({ engine: "bun", hit: new Bun.Glob(glob).match(real) }).toEqual({ engine: "bun", hit: true });
  });

  test("does not match a sibling artifact of the same stage", () => {
    const glob = parseSensorManifest(readFileSync(MANIFEST, "utf-8")).matches ?? "";
    const questions =
      "amadeus/spaces/default/intents/260808-x-ab12cd34/inception/requirements-analysis/requirements-analysis-questions.md";
    expect(matchesGlob(glob, questions)).toBe(false);
    expect(new Bun.Glob(glob).match(questions)).toBe(false);
  });

  test("the stage binds the sensor so compile resolves it", () => {
    // An id in a stage's `sensors:` list that has no manifest is a loud compile
    // reject, so this pins the pair rather than the manifest alone.
    expect(Bun.file(STAGE_FILE).text()).resolves.toContain("- depth-budget");
  });
});

// ===========================================================================
// 2. The predicate
// ===========================================================================

describe("t488 depth-budget thresholds", () => {
  // Measured on 31 self-* intents at #2425: Minimal 2,459 B/FR, Standard
  // 2,067 B/FR — Minimal spending MORE per requirement than Standard is the
  // inversion this sensor exists to surface. The chosen ceilings encode that
  // asymmetry: Minimal is pulled well under its own median, while Standard's
  // current level is judged reasonable and still admitted.
  test("the Minimal ceiling is well under today's Minimal median (not a rubber stamp)", () => {
    expect(DEPTH_BUDGETS.Minimal).toBeLessThan(2459);
  });

  test("the ceilings restore the ordering Minimal < Standard", () => {
    expect(DEPTH_BUDGETS.Minimal as number).toBeLessThan(DEPTH_BUDGETS.Standard as number);
  });

  test("today's Standard median still passes, and today's Minimal median does not", () => {
    // The concrete consequence of the two numbers, stated as behaviour rather
    // than as a comparison of constants.
    const standardToday = writeRequirements(requirements(4, 2067));
    expect(evaluateDepthBudget(standardToday, "Standard").pass).toBe(true);
    const minimalToday = writeRequirements(requirements(4, 2459));
    expect(evaluateDepthBudget(minimalToday, "Minimal").pass).toBe(false);
  });

  test("Comprehensive declares no ceiling", () => {
    expect(DEPTH_BUDGETS.Comprehensive).toBeUndefined();
  });

  test("Minimal within budget passes", () => {
    const p = writeRequirements(requirements(6, 400));
    const r = evaluateDepthBudget(p, "Minimal");
    expect(r.pass).toBe(true);
    expect(r.findings_count).toBe(0);
    expect(r.fr_count).toBe(6);
  });

  test("Minimal over budget fails and reports the measurement (falling evidence)", () => {
    const p = writeRequirements(requirements(1, 3000));
    const r = evaluateDepthBudget(p, "Minimal");
    expect(r.pass).toBe(false);
    expect(r.findings_count).toBe(1);
    // The finding must carry the numbers a human needs at the gate: what was
    // measured and what the ceiling was.
    expect(r.bytes_per_fr).toBeGreaterThan(DEPTH_BUDGETS.Minimal as number);
    expect(r.findings[0].reason).toContain(String(DEPTH_BUDGETS.Minimal));
  });

  test("Standard admits what Minimal rejects (the levels are distinguishable)", () => {
    const p = writeRequirements(requirements(4, 2000));
    expect(evaluateDepthBudget(p, "Minimal").pass).toBe(false);
    expect(evaluateDepthBudget(p, "Standard").pass).toBe(true);
  });

  test("the Standard ceiling is exclusive of overrun and inclusive at the boundary", () => {
    const at = writeRequirements(requirements(1, DEPTH_BUDGETS.Standard as number));
    expect(evaluateDepthBudget(at, "Standard").pass).toBe(true);
    const over = writeRequirements(requirements(1, (DEPTH_BUDGETS.Standard as number) + 200));
    expect(evaluateDepthBudget(over, "Standard").pass).toBe(false);
  });

  test("Comprehensive always passes — it declares no ceiling", () => {
    const p = writeRequirements(requirements(1, 60_000));
    const r = evaluateDepthBudget(p, "Comprehensive");
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("no-ceiling");
  });
});

describe("t488 depth-budget FR counting", () => {
  test("counts heading, bold-list and bold-line FR forms", () => {
    const body = [
      "### FR-1: heading form",
      "y".repeat(50),
      "- **FR-2**: bold list form",
      "y".repeat(50),
      "**FR-3**: bold line form",
      "y".repeat(50),
    ].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(3);
  });

  test("a repeated id counts once (a cross-reference is not a new requirement)", () => {
    const body = ["### FR-1: the requirement", "z".repeat(50), "### FR-1: restated later", "z".repeat(50)].join("\n");
    expect(evaluateDepthBudget(writeRequirements(body), "Minimal").fr_count).toBe(1);
  });
});

describe("t488 depth-budget fail-open", () => {
  test("a missing file passes (absence is the artifact guard's business)", () => {
    const r = evaluateDepthBudget(join(tmp, "absent", "requirements.md"), "Minimal");
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("no-file");
  });

  test("a non-requirements output is skipped outright", () => {
    expect(evaluateDepthBudget(join(tmp, "code-summary.md"), "Minimal").reason).toBe("not-requirements");
  });

  test("an unknown or absent depth passes (the sensor never guesses a level)", () => {
    const p = writeRequirements(requirements(1, 9000));
    expect(evaluateDepthBudget(p, undefined).pass).toBe(true);
    expect(evaluateDepthBudget(p, undefined).reason).toBe("no-depth");
    expect(evaluateDepthBudget(p, "banana").pass).toBe(true);
  });

  test("no numbered FRs is a finding — the stage contract requires FR-n ids", () => {
    const p = writeRequirements("## Requirements\n\nSome prose with no numbered requirements at all.\n");
    const r = evaluateDepthBudget(p, "Minimal");
    expect(r.pass).toBe(false);
    expect(r.findings_count).toBe(1);
    expect(r.reason).toBe("no-numbered-frs");
  });

  test("an empty file is not reported as missing FRs (nothing was written yet)", () => {
    const r = evaluateDepthBudget(writeRequirements(""), "Minimal");
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("empty");
  });
});

// ===========================================================================
// 3. readRecordDepth — how the dispatcher learns the depth to pass in
// ===========================================================================

describe("t488 readRecordDepth", () => {
  // A distinct record per call: reusing one directory would leave an earlier
  // case's amadeus-state.md in place, so a "no state" case could read the
  // previous case's Depth and pass for the wrong reason.
  let recordSeq = 0;
  function seedRecord(depthLine: string | null): string {
    recordSeq += 1;
    const record = join(tmp, "amadeus", "spaces", "default", "intents", `260808-x-${recordSeq}`);
    const stageDir = join(record, "inception", "requirements-analysis");
    mkdirSync(stageDir, { recursive: true });
    if (depthLine !== null) {
      writeFileSync(join(record, "amadeus-state.md"), `# State\n\n## Scope Configuration\n\n${depthLine}\n`);
    }
    const out = join(stageDir, "requirements.md");
    writeFileSync(out, requirements(1, 100));
    return out;
  }

  test("walks up from the output path to the record state", () => {
    expect(readRecordDepth(seedRecord("- **Depth**: Standard"), tmp)).toBe("Standard");
  });

  test("normalizes a hand-edited lowercase value", () => {
    expect(readRecordDepth(seedRecord("- **Depth**: comprehensive"), tmp)).toBe("Comprehensive");
  });

  test("no state, no Depth field, and an unrecognizable value each yield undefined", () => {
    expect(readRecordDepth(seedRecord(null), tmp)).toBeUndefined();
    expect(readRecordDepth(seedRecord("- **Scope**: fix"), tmp)).toBeUndefined();
    expect(readRecordDepth(seedRecord("- **Depth**: banana"), tmp)).toBeUndefined();
  });

  test("stops at the project root rather than escaping to an ancestor state", () => {
    // A state file ABOVE the project root must not be consulted: the walk is
    // bounded, or a developer's own workspace state could leak into a test run.
    const out = seedRecord(null);
    writeFileSync(join(tmp, "..", `t488-escape-${process.pid}.md`), "- **Depth**: Comprehensive\n");
    expect(readRecordDepth(out, tmp)).toBeUndefined();
    rmSync(join(tmp, "..", `t488-escape-${process.pid}.md`), { force: true });
  });

  test("the dispatcher arm turns a resolved depth into the --depth flag", () => {
    const out = seedRecord("- **Depth**: Standard");
    expect(depthBudgetArgs("depth-budget", out, tmp)).toEqual(["--depth", "Standard"]);
  });

  test("the dispatcher arm is silent for other sensors and for an unresolved depth", () => {
    const withDepth = seedRecord("- **Depth**: Standard");
    // Another sensor's fire must not pick up the flag...
    expect(depthBudgetArgs("required-sections", withDepth, tmp)).toEqual([]);
    // ...and an unresolvable depth omits it, leaving the sensor fail-open.
    expect(depthBudgetArgs("depth-budget", seedRecord(null), tmp)).toEqual([]);
  });

  test("an unreadable state file yields undefined rather than throwing", () => {
    // A record whose state cannot be read must not take the sensor down: the
    // walk swallows the read error and the sensor then passes fail-open. A
    // directory at the state path produces the error portably (EISDIR on macOS,
    // an empty read on Linux — either way, no usable Depth).
    const record = join(tmp, "amadeus", "spaces", "default", "intents", "260808-unreadable-ab12cd34");
    const stageDir = join(record, "inception", "requirements-analysis");
    mkdirSync(join(record, "amadeus-state.md"), { recursive: true });
    mkdirSync(stageDir, { recursive: true });
    const out = join(stageDir, "requirements.md");
    writeFileSync(out, requirements(1, 100));
    expect(readRecordDepth(out, tmp)).toBeUndefined();
  });
});

// ===========================================================================
// 4. The CLI contract — advisory means exit 0 on BOTH verdicts
// ===========================================================================

describe("t488 CLI contract", () => {
  function run(argv: string[]): { code: number; stdout: string; stderr: string } {
    let stdout = "";
    let stderr = "";
    let code = -1;
    const outWrite = process.stdout.write.bind(process.stdout);
    const errWrite = process.stderr.write.bind(process.stderr);
    const exit = process.exit.bind(process);
    // biome-ignore lint/suspicious/noExplicitAny: process.exit's never-return type
    (process as any).exit = (c: number) => {
      code = c;
      throw new Error("__exit__");
    };
    process.stdout.write = ((chunk: string) => {
      stdout += chunk;
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string) => {
      stderr += chunk;
      return true;
    }) as typeof process.stderr.write;
    try {
      sensorMain(argv);
    } catch (err) {
      if (!(err instanceof Error) || err.message !== "__exit__") throw err;
    } finally {
      process.stdout.write = outWrite;
      process.stderr.write = errWrite;
      // biome-ignore lint/suspicious/noExplicitAny: restore the real exit
      (process as any).exit = exit;
    }
    return { code, stdout, stderr };
  }

  test("a within-budget artifact exits 0 with a JSON verdict", () => {
    const p = writeRequirements(requirements(6, 400));
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", p, "--depth", "Minimal"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, findings_count: 0 });
  });

  test("an over-budget artifact ALSO exits 0 — the verdict is data, not enforcement", () => {
    const p = writeRequirements(requirements(1, 3000));
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", p, "--depth", "Minimal"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: false, findings_count: 1 });
  });

  test("--depth is optional; without it the sensor passes fail-open", () => {
    const p = writeRequirements(requirements(1, 9000));
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", p]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, reason: "no-depth" });
  });

  test("a missing flag is the only exit-1 path, and it names the flag", () => {
    const missingOutput = run(["--stage", "requirements-analysis"]);
    expect(missingOutput.code).toBe(1);
    expect(missingOutput.stderr).toContain("--output-path is required");

    const missingStage = run(["--output-path", writeRequirements(requirements(1, 100))]);
    expect(missingStage.code).toBe(1);
    expect(missingStage.stderr).toContain("--stage is required");
  });
});
