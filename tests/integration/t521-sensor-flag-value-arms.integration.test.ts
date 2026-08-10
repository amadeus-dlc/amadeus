// covers: file:packages/framework/core/tools/amadeus-sensor-depth-budget.ts, file:packages/framework/core/tools/amadeus-sensor-question-budget.ts, file:packages/framework/core/tools/amadeus-sensor-nfr-budget.ts, file:packages/framework/core/tools/amadeus-sensor-scope-sizing.ts, file:packages/framework/core/tools/amadeus-sensor-answer-evidence.ts, file:packages/framework/core/tools/amadeus-sensor-required-sections.ts, file:packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts
// size: medium
//
// t521 — #2741: every per-sensor CLI rejects a malformed flag VALUE loudly, on
// both arms, and names itself while doing it.
//
// Before the fix, `out.depth = argv[++i]` was fail-open twice over: a trailing
// `--depth` read as "no depth was requested" (byte-identical to omitting the
// flag), and `--output-path --depth Minimal` swallowed the next flag as the
// value (nfr-budget went as far as accepting `unit_kind:"--depth"`). Both arms
// are now exit 1 with the house wording.
//
// Driven IN-PROCESS (the t519 seam idiom): reached through `main` inside a
// spawned child, these arms are invisible to bun's coverage and would sit
// permanently unmeasured while their behaviour is genuinely tested.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  fail as answerEvidenceFail,
  main as answerEvidenceMain,
} from "../../packages/framework/core/tools/amadeus-sensor-answer-evidence.ts";
import {
  fail as depthBudgetFail,
  main as depthBudgetMain,
} from "../../packages/framework/core/tools/amadeus-sensor-depth-budget.ts";
import {
  fail as nfrBudgetFail,
  main as nfrBudgetMain,
} from "../../packages/framework/core/tools/amadeus-sensor-nfr-budget.ts";
import {
  fail as prConvergenceFail,
  main as prConvergenceMain,
} from "../../packages/framework/core/tools/amadeus-sensor-pr-convergence-report-format.ts";
import {
  fail as questionBudgetFail,
  main as questionBudgetMain,
} from "../../packages/framework/core/tools/amadeus-sensor-question-budget.ts";
import {
  fail as requiredSectionsFail,
  main as requiredSectionsMain,
} from "../../packages/framework/core/tools/amadeus-sensor-required-sections.ts";
import {
  fail as scopeSizingFail,
  main as scopeSizingMain,
} from "../../packages/framework/core/tools/amadeus-sensor-scope-sizing.ts";

type Main = (argv?: string[]) => void;
type Fail = (msg: string) => never;

// Drive a sensor entry in-process, capturing stderr + the exit code instead of
// letting either escape to the real process.
function run(entry: () => void): { code: number; stderr: string } {
  let stderr = "";
  let code = 0;
  const realErrWrite = process.stderr.write.bind(process.stderr);
  const realOutWrite = process.stdout.write.bind(process.stdout);
  const realExit = process.exit.bind(process);
  process.stderr.write = ((chunk: string) => {
    stderr += chunk;
    return true;
  }) as typeof process.stderr.write;
  process.stdout.write = (() => true) as typeof process.stdout.write;
  // biome-ignore lint/suspicious/noExplicitAny: process.exit's never-return type
  (process as any).exit = (c?: number) => {
    code = c ?? 0;
    throw new Error("__exit__");
  };
  try {
    entry();
  } catch (err) {
    if (!(err instanceof Error) || err.message !== "__exit__") throw err;
  } finally {
    process.stderr.write = realErrWrite;
    process.stdout.write = realOutWrite;
    // biome-ignore lint/suspicious/noExplicitAny: restore the real exit
    (process as any).exit = realExit;
  }
  return { code, stderr };
}

interface Arm {
  // What the operator typed.
  readonly argv: string[];
  // The flag whose value is missing / stolen.
  readonly flag: string;
  // The token wrongly swallowed, when this is the next-token-is-flag arm.
  readonly swallowed?: string;
  readonly label: string;
}

interface SensorCase {
  readonly id: string;
  readonly main: Main;
  readonly fail: Fail;
  readonly arms: readonly Arm[];
}

const OUT = "/nonexistent/amadeus-t521/artifact.md";

const CASES: readonly SensorCase[] = [
  {
    id: "amadeus-sensor-depth-budget",
    main: depthBudgetMain,
    fail: depthBudgetFail,
    arms: [
      { label: "trailing --depth", argv: ["--stage", "requirements-analysis", "--output-path", OUT, "--depth"], flag: "--depth" },
      { label: "--output-path swallows --depth", argv: ["--stage", "requirements-analysis", "--output-path", "--depth", "Minimal"], flag: "--output-path", swallowed: "--depth" },
    ],
  },
  {
    id: "amadeus-sensor-question-budget",
    main: questionBudgetMain,
    fail: questionBudgetFail,
    arms: [
      { label: "trailing --depth", argv: ["--stage", "requirements-analysis", "--output-path", OUT, "--depth"], flag: "--depth" },
      { label: "--output-path swallows --depth", argv: ["--stage", "requirements-analysis", "--output-path", "--depth", "Minimal"], flag: "--output-path", swallowed: "--depth" },
    ],
  },
  {
    id: "amadeus-sensor-nfr-budget",
    main: nfrBudgetMain,
    fail: nfrBudgetFail,
    arms: [
      { label: "trailing --depth", argv: ["--stage", "nfr-requirements", "--output-path", OUT, "--depth"], flag: "--depth" },
      { label: "trailing --kind", argv: ["--stage", "nfr-requirements", "--output-path", OUT, "--kind"], flag: "--kind" },
      { label: "--kind swallows --depth", argv: ["--stage", "nfr-requirements", "--output-path", OUT, "--kind", "--depth", "Standard"], flag: "--kind", swallowed: "--depth" },
      { label: "--output-path swallows --depth", argv: ["--stage", "nfr-requirements", "--output-path", "--depth", "Standard"], flag: "--output-path", swallowed: "--depth" },
    ],
  },
  {
    id: "amadeus-sensor-scope-sizing",
    main: scopeSizingMain,
    fail: scopeSizingFail,
    arms: [
      { label: "trailing --depth", argv: ["--stage", "scope-definition", "--output-path", OUT, "--depth"], flag: "--depth" },
      { label: "--output-path swallows --depth", argv: ["--stage", "scope-definition", "--output-path", "--depth", "Minimal"], flag: "--output-path", swallowed: "--depth" },
    ],
  },
  {
    id: "amadeus-sensor-answer-evidence",
    main: answerEvidenceMain,
    fail: answerEvidenceFail,
    arms: [
      { label: "trailing --output-path", argv: ["--stage", "requirements-analysis", "--output-path"], flag: "--output-path" },
      { label: "--stage swallows --output-path", argv: ["--stage", "--output-path", OUT], flag: "--stage", swallowed: "--output-path" },
    ],
  },
  {
    id: "amadeus-sensor-required-sections",
    main: requiredSectionsMain,
    fail: requiredSectionsFail,
    arms: [
      { label: "trailing --templates-dir", argv: ["--output-path", OUT, "--templates-dir"], flag: "--templates-dir" },
      // RS-C: the template-override branch was silently disarmed — the eligible
      // set became empty and every template was ignored, so the sensor passed on
      // the generic floor while claiming to have checked the template.
      { label: "--templates-dir swallows --template-eligible", argv: ["--output-path", OUT, "--templates-dir", "--template-eligible", "requirements"], flag: "--templates-dir", swallowed: "--template-eligible" },
      // This sensor declares the most flags, so each remaining branch gets its
      // own arm — a per-flag read is only as strict as the branch that calls it,
      // and an unexercised branch is exactly where the old naive read survived.
      { label: "trailing --stage", argv: ["--stage"], flag: "--stage" },
      { label: "trailing --framework-templates-dir", argv: ["--output-path", OUT, "--framework-templates-dir"], flag: "--framework-templates-dir" },
      { label: "trailing --template-eligible", argv: ["--output-path", OUT, "--template-eligible"], flag: "--template-eligible" },
      { label: "--framework-templates-dir swallows --output-path", argv: ["--framework-templates-dir", "--output-path", OUT], flag: "--framework-templates-dir", swallowed: "--output-path" },
    ],
  },
  {
    id: "amadeus-sensor-pr-convergence-report-format",
    main: prConvergenceMain,
    fail: prConvergenceFail,
    arms: [
      { label: "trailing --output-path", argv: ["--stage", "code-generation", "--output-path"], flag: "--output-path" },
      { label: "--stage swallows --output-path", argv: ["--stage", "--output-path", OUT], flag: "--stage", swallowed: "--output-path" },
    ],
  },
];

for (const sensor of CASES) {
  describe(`t521 ${sensor.id} rejects a malformed flag value`, () => {
    for (const arm of sensor.arms) {
      test(`${arm.label} exits 1 and names the flag`, () => {
        const { code, stderr } = run(() => sensor.main(arm.argv));
        expect(code).toBe(1);
        expect(stderr).toStartWith(`${sensor.id}: `);
        const expected =
          arm.swallowed === undefined
            ? `${arm.flag} expects a value, got end of arguments.`
            : `${arm.flag} expects a value, got another flag: "${arm.swallowed}".`;
        expect(stderr).toContain(expected);
      });
    }

    test("the fail seam names the sensor and exits 1 — driven in-process", () => {
      const { code, stderr } = run(() => sensor.fail("--output-path is required"));
      expect(code).toBe(1);
      expect(stderr).toBe(`${sensor.id}: --output-path is required\n`);
    });
  });
}

// ---------------------------------------------------------------------------
// The property the fix rests on: ONE definition of the strict read, and the
// out-of-scope sensors left untouched.
// ---------------------------------------------------------------------------

const TOOLS = join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools");

describe("t521 the strict read has a single definition", () => {
  // Which files legitimately carry the wording: the canonical helper, and the
  // dispatcher, whose own argv layer predates and is out of scope for #2741.
  const SENSOR_FAMILY_OWNERS = new Set(["amadeus-sensor-flags.ts", "amadeus-sensor.ts"]);

  test("no per-sensor script re-implements the end-of-arguments / next-flag wording", () => {
    const offenders = readdirSync(TOOLS)
      .filter((f) => f.startsWith("amadeus-sensor") && f.endsWith(".ts"))
      .filter((f) => !SENSOR_FAMILY_OWNERS.has(f))
      .filter((f) => /expects a value, got (?:end of arguments|another flag)/.test(readFileSync(join(TOOLS, f), "utf-8")));
    expect(offenders).toEqual([]);
  });

  test("every in-scope sensor routes its flag reads through the helper", () => {
    // The defect's exact shape: `= argv[++i]`. A single surviving occurrence in
    // an in-scope script is a fail-open arm the two-arm cases above cannot see,
    // because they only drive the flags each sensor actually declares.
    const offenders = CASES.map((c) => `${c.id}.ts`).filter((f) =>
      /=\s*argv\[\+\+i\]/.test(readFileSync(join(TOOLS, f), "utf-8")),
    );
    expect(offenders).toEqual([]);
  });

  test("the out-of-scope sensors are deliberately left on the naive read", () => {
    // #2741 is scoped to the seven scripts above. upstream-coverage treats
    // `--consumes` with no value as an EXPLICIT empty list (its own comment says
    // so — a deliberate, documented fail-open, not the accident this fix
    // removes); linter and type-check are the dispatcher-shaped pair. Pinning
    // them here makes a later sweep a conscious decision rather than drift, and
    // makes THIS intent's "diff 0 in those files" claim mechanical.
    const outOfScope = ["amadeus-sensor-upstream-coverage.ts", "amadeus-sensor-linter.ts", "amadeus-sensor-type-check.ts"];
    for (const f of outOfScope) {
      const src = readFileSync(join(TOOLS, f), "utf-8");
      expect({ file: f, naive: /=\s*argv\[\+\+i\]/.test(src) }).toEqual({ file: f, naive: true });
      expect(src).not.toContain("amadeus-sensor-flags.ts");
    }
  });

  test("upstream-coverage keeps the comment that documents its intent", () => {
    const src = readFileSync(join(TOOLS, "amadeus-sensor-upstream-coverage.ts"), "utf-8");
    expect(src).toContain("Handle `--consumes` as last flag (no value) and `--consumes \"\"`");
    expect(src).toContain("identically: treat both as empty list.");
  });
});
