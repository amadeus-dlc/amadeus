// t517 — the question-budget sensor's filesystem, cutoff and CLI edges (#2693).
//
// The predicate itself is pure and lives in the unit sibling t516. Everything
// here needs a real tree: the record-date walk, the enforcement cutoff, the
// dispatcher's depth flag, the CLI boundary, and the two-sided falling proof
// over the committed corpus.
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readRecordDepth } from "../../packages/framework/core/tools/amadeus-sensor-depth-budget.ts";
import {
  QUESTION_BUDGET_CUTOFF_YYMMDD,
  countQuestions,
  evaluateQuestionBudget,
  main as sensorMain,
  recordDateOf,
  resolveRecordRoot,
  underQuestionBudgetEnforcement,
} from "../../packages/framework/core/tools/amadeus-sensor-question-budget.ts";
import { depthBudgetArgs } from "../../packages/framework/core/tools/amadeus-sensor.ts";

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A record dir named the way the workspace names them, with a state file
 *  carrying the given depth (or none) and one stage question file. */
function seedRecord(opts: { dirName: string; depth: string | null; body: string }): {
  root: string;
  questionsPath: string;
  projectDir: string;
} {
  const projectDir = mkdtempSync(join(tmpdir(), "t517-"));
  scratch.push(projectDir);
  const root = join(projectDir, "amadeus", "spaces", "default", "intents", opts.dirName);
  const stageDir = join(root, "inception", "requirements-analysis");
  mkdirSync(stageDir, { recursive: true });
  const state = opts.depth === null ? "# state\n\n- **Scope**: self-fix\n" : `# state\n\n- **Depth**: ${opts.depth}\n`;
  writeFileSync(join(root, "amadeus-state.md"), state);
  const questionsPath = join(stageDir, "requirements-analysis-questions.md");
  writeFileSync(questionsPath, opts.body);
  return { root, questionsPath, projectDir };
}

/** n headed questions, the corpus's majority form. */
function questions(n: number): string {
  const lines = ["# Requirements Analysis 質問票", ""];
  for (let i = 1; i <= n; i += 1) lines.push(`### Q${i}. 論点 ${i} をどうしますか？`, "");
  return lines.join("\n");
}

const POST = `${QUESTION_BUDGET_CUTOFF_YYMMDD}-post-cutoff-record`;
const PRE = `${QUESTION_BUDGET_CUTOFF_YYMMDD - 1}-pre-cutoff-record`;

// ---------------------------------------------------------------------------
// The reported case, and the two ways it is withheld
// ---------------------------------------------------------------------------

describe("t517 ceiling comparison", () => {
  test("a post-cutoff Minimal stage asking 5 is reported", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Minimal", body: questions(5) });
    const result = evaluateQuestionBudget(questionsPath, "Minimal");
    expect(result).toMatchObject({
      pass: false,
      findings_count: 1,
      reason: "over-budget",
      questions: 5,
      depth: "Minimal",
      ceiling: 4,
      enforced: true,
    });
    expect(result.findings[0]?.reason).toContain("exceed the Minimal ceiling of 4");
  });

  test("the same file at Standard is inside its row", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Standard", body: questions(5) });
    expect(evaluateQuestionBudget(questionsPath, "Standard")).toMatchObject({
      pass: true,
      reason: "within-budget",
      questions: 5,
      ceiling: 8,
    });
  });

  test("Comprehensive carries a ceiling of its own — §8 states one for questions", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Comprehensive", body: questions(13) });
    expect(evaluateQuestionBudget(questionsPath, "Comprehensive")).toMatchObject({
      pass: false,
      reason: "over-budget",
      questions: 13,
      ceiling: 12,
    });
  });

  test("exactly at the ceiling is inside it", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Minimal", body: questions(4) });
    expect(evaluateQuestionBudget(questionsPath, "Minimal")).toMatchObject({
      pass: true,
      reason: "within-budget",
      questions: 4,
    });
  });

  test("a pre-cutoff record over its row is MEASURED but not reported", () => {
    const { questionsPath } = seedRecord({ dirName: PRE, depth: "Minimal", body: questions(9) });
    expect(evaluateQuestionBudget(questionsPath, "Minimal")).toMatchObject({
      pass: true,
      findings_count: 0,
      reason: "pre-cutoff",
      questions: 9,
      ceiling: 4,
      enforced: false,
    });
  });

  test("no depth means no row to hold to — the count is still reported", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: null, body: questions(9) });
    expect(evaluateQuestionBudget(questionsPath, undefined)).toMatchObject({
      pass: true,
      reason: "no-depth",
      questions: 9,
      depth: null,
      ceiling: null,
    });
  });

  test("an unrecognizable depth is not guessed into Minimal", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Brief", body: questions(9) });
    expect(evaluateQuestionBudget(questionsPath, "Brief")).toMatchObject({ reason: "no-depth", ceiling: null });
  });

  test("depth matching is case-insensitive, as the state file is hand-written", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "minimal", body: questions(5) });
    expect(evaluateQuestionBudget(questionsPath, "minimal")).toMatchObject({ depth: "Minimal", ceiling: 4 });
  });
});

// ---------------------------------------------------------------------------
// Fail-open edges
// ---------------------------------------------------------------------------

describe("t517 fail-open", () => {
  test("a path that is not a question file is not this sensor's business", () => {
    const { root } = seedRecord({ dirName: POST, depth: "Minimal", body: questions(9) });
    const other = join(root, "inception", "requirements-analysis", "requirements.md");
    writeFileSync(other, questions(9));
    expect(evaluateQuestionBudget(other, "Minimal")).toMatchObject({ pass: true, reason: "not-questions-file" });
  });

  test("an absent file is the artifact guard's business, not this one", () => {
    expect(evaluateQuestionBudget("/nowhere/x-questions.md", "Minimal")).toMatchObject({
      pass: true,
      reason: "no-file",
    });
  });

  test("a file holding only whitespace is a stage mid-write", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Minimal", body: "\n  \n" });
    expect(evaluateQuestionBudget(questionsPath, "Minimal")).toMatchObject({ pass: true, reason: "empty" });
  });

  test("a zero-question ruling passes at every depth", () => {
    const body = "# 質問票\n\n## 未決事項\n\n人間判断を要する未決事項はない(質問 0 問)。\n";
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Minimal", body });
    expect(evaluateQuestionBudget(questionsPath, "Minimal")).toMatchObject({
      pass: true,
      reason: "within-budget",
      questions: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// The record-date walk
// ---------------------------------------------------------------------------

describe("t517 record date", () => {
  test("an audit shard alone marks a record root — some records carry no state file", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "t517-audit-"));
    scratch.push(projectDir);
    const root = join(projectDir, `${POST}`);
    const stageDir = join(root, "ideation", "intent-capture");
    mkdirSync(join(root, "audit"), { recursive: true });
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(root, "audit", "clone-a.jsonl"), "");
    const path = join(stageDir, "intent-capture-questions.md");
    writeFileSync(path, questions(5));
    expect(resolveRecordRoot(path)).toBe(root);
    expect(evaluateQuestionBudget(path, "Minimal")).toMatchObject({ reason: "over-budget", enforced: true });
  });

  test("a directory named audit with no shard is not a record root", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "t517-bare-"));
    scratch.push(projectDir);
    const stageDir = join(projectDir, `${POST}`, "stage");
    mkdirSync(join(projectDir, `${POST}`, "audit"), { recursive: true });
    mkdirSync(stageDir, { recursive: true });
    const path = join(stageDir, "x-questions.md");
    writeFileSync(path, questions(5));
    // The walk climbs past it and out of the temp tree, finding no record.
    expect(resolveRecordRoot(path)).toBeUndefined();
    expect(evaluateQuestionBudget(path, "Minimal")).toMatchObject({
      reason: "pre-cutoff",
      record_date: null,
      enforced: false,
    });
  });

  test("a record dir without a YYMMDD prefix is never reported", () => {
    const { questionsPath } = seedRecord({ dirName: "no-date-prefix", depth: "Minimal", body: questions(9) });
    expect(recordDateOf(resolveRecordRoot(questionsPath))).toBeUndefined();
    expect(evaluateQuestionBudget(questionsPath, "Minimal")).toMatchObject({ enforced: false, reason: "pre-cutoff" });
  });

  test("the cutoff is inclusive on its own day", () => {
    expect(underQuestionBudgetEnforcement(QUESTION_BUDGET_CUTOFF_YYMMDD)).toBe(true);
    expect(underQuestionBudgetEnforcement(QUESTION_BUDGET_CUTOFF_YYMMDD - 1)).toBe(false);
    expect(underQuestionBudgetEnforcement(undefined)).toBe(false);
    expect(recordDateOf(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Dispatcher wiring — the depth flag reaches this sensor too
// ---------------------------------------------------------------------------

describe("t517 dispatcher depth flag", () => {
  test("question-budget receives --depth, like its depth-budget sibling", () => {
    const { questionsPath, projectDir } = seedRecord({ dirName: POST, depth: "Standard", body: questions(3) });
    expect(depthBudgetArgs("question-budget", questionsPath, projectDir)).toEqual(["--depth", "Standard"]);
    expect(depthBudgetArgs("depth-budget", questionsPath, projectDir)).toEqual(["--depth", "Standard"]);
  });

  test("a sensor that does not read depth receives no flag", () => {
    const { questionsPath, projectDir } = seedRecord({ dirName: POST, depth: "Standard", body: questions(3) });
    expect(depthBudgetArgs("answer-evidence", questionsPath, projectDir)).toEqual([]);
  });

  test("a record with no Depth yields no flag, and the sensor then passes", () => {
    const { questionsPath, projectDir } = seedRecord({ dirName: POST, depth: null, body: questions(9) });
    expect(depthBudgetArgs("question-budget", questionsPath, projectDir)).toEqual([]);
    expect(evaluateQuestionBudget(questionsPath, undefined)).toMatchObject({ pass: true, reason: "no-depth" });
  });
});

// ---------------------------------------------------------------------------
// The CLI contract — advisory means exit 0 on BOTH verdicts
// ---------------------------------------------------------------------------

describe("t517 CLI contract", () => {
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

  test("a measured file exits 0 with a JSON verdict", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Standard", body: questions(3) });
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", questionsPath, "--depth", "Standard"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: true, questions: 3, ceiling: 8 });
  });

  test("a reported file ALSO exits 0 — the verdict is data, not enforcement", () => {
    const { questionsPath } = seedRecord({ dirName: POST, depth: "Minimal", body: questions(6) });
    const { code, stdout } = run(["--stage", "requirements-analysis", "--output-path", questionsPath, "--depth", "Minimal"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ pass: false, reason: "over-budget", questions: 6 });
  });

  test("a missing flag is the ONLY exit-1 path", () => {
    const missingStage = run(["--output-path", "/nowhere/x-questions.md"]);
    expect(missingStage.code).toBe(1);
    expect(missingStage.stderr).toContain("--stage is required");

    const missingPath = run(["--stage", "requirements-analysis"]);
    expect(missingPath.code).toBe(1);
    expect(missingPath.stderr).toContain("--output-path is required");
  });
});

// ---------------------------------------------------------------------------
// Corpus sweep — the green half of the falling proof
//
// The reported case above proves the sensor goes red. This proves it does NOT
// go red on the corpus it inherits: a guard that flags legitimate existing data
// is noise, and the cutoff exists precisely to keep that from happening.
// ---------------------------------------------------------------------------

const REPO_ROOT = join(import.meta.dir, "..", "..");
const INTENTS = join(REPO_ROOT, "amadeus", "spaces", "default", "intents");

function everyQuestionFile(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(path);
    } catch {
      continue;
    }
    if (stats.isDirectory()) everyQuestionFile(path, out);
    else if (name.endsWith("-questions.md")) out.push(path);
  }
}

describe("t517 corpus sweep", () => {
  const files: string[] = [];
  everyQuestionFile(INTENTS, files);
  files.sort();

  test("the corpus is present, so a sweep of zero files cannot pass vacuously", () => {
    expect(files.length).toBeGreaterThan(700);
  });

  test("no committed question file produces a finding", () => {
    const reported: string[] = [];
    for (const path of files) {
      const depth = readRecordDepth(path, REPO_ROOT);
      const result = evaluateQuestionBudget(path, depth);
      if (!result.pass) reported.push(`${path} — ${result.questions} > ${result.ceiling} (${result.depth})`);
    }
    expect(reported).toEqual([]);
  });

  test("the sweep measured real questions, not zeros everywhere", () => {
    // A predicate that returned 0 for everything would also produce no
    // findings, so the green half above needs this beside it.
    const counted = files.filter((path) => countQuestions(readFileSync(path, "utf-8")) > 0);
    expect(counted.length).toBeGreaterThan(400);
  });

  test("the cutoff is what keeps the sweep green, not an absence of overruns", () => {
    // Without the cutoff this sensor would report dozens of records written
    // years before it existed, which is the retroactive-noise failure the
    // cutoff is for. Asserting that the withheld set is NON-EMPTY is what
    // makes the green sweep above evidence rather than a vacuous pass.
    const withheld = files.filter((path) => {
      const result = evaluateQuestionBudget(path, readRecordDepth(path, REPO_ROOT));
      return result.ceiling !== null && result.questions > result.ceiling;
    });
    expect(withheld.length).toBeGreaterThan(0);
    for (const path of withheld) {
      expect(evaluateQuestionBudget(path, readRecordDepth(path, REPO_ROOT)).reason).toBe("pre-cutoff");
    }
  });

  test("each extra form is counted in the corpus files that use it", () => {
    // The three forms a heading-only predicate reads as silence, with the
    // counts this predicate gives them. Paths are relative to INTENTS.
    const cases: Array<[string, number]> = [
      // prefixed question codes
      ["260716-opencode-plugins-hooks/construction/opencode-plugin-adapter/functional-design/functional-design-questions.md", 5],
      ["260716-opencode-plugins-hooks/construction/opencode-plugin-adapter/nfr-requirements/nfr-requirements-questions.md", 5],
      ["260716-opencode-plugins-hooks/construction/opencode-plugin-adapter/nfr-design/nfr-design-questions.md", 4],
      // 質問-headed tables
      ["260712-metrics-observation/construction/ci-pipeline/ci-pipeline-questions.md", 4],
      ["260712-metrics-observation/operation/deployment-execution/deployment-execution-questions.md", 4],
      ["260712-metrics-observation/operation/deployment-pipeline/deployment-pipeline-questions.md", 5],
      ["260712-metrics-observation/operation/environment-provisioning/environment-provisioning-questions.md", 4],
      // a ruling table restating the headings above it — 5 asks, not 10
      ["260803-state-integrity/inception/requirements-analysis/requirements-analysis-questions.md", 5],
      // bold inline asks
      ["260718-election-ts-foundation/inception/delivery-planning/delivery-planning-questions.md", 1],
      ["260718-election-ts-foundation/inception/units-generation/units-generation-questions.md", 1],
      ["260719-mirror-productization/ideation/scope-definition/scope-definition-questions.md", 1],
    ];
    const measured = cases.map(([rel]) => [rel, countQuestions(readFileSync(join(INTENTS, rel), "utf-8"))]);
    expect(measured).toEqual(cases);
  });

  test("a heading-only predicate would read those files as silent", () => {
    // The reason the closed set has four forms rather than one: every file
    // above is invisible to `^#{2,3} Q[0-9]+` except the ruling-table case,
    // whose headings that predicate does see.
    const naive = /^#{2,3} Q[0-9]+/m;
    const invisible = [
      "260716-opencode-plugins-hooks/construction/opencode-plugin-adapter/functional-design/functional-design-questions.md",
      "260712-metrics-observation/construction/ci-pipeline/ci-pipeline-questions.md",
      "260719-mirror-productization/ideation/scope-definition/scope-definition-questions.md",
    ];
    for (const rel of invisible) {
      const body = readFileSync(join(INTENTS, rel), "utf-8");
      expect(naive.test(body)).toBe(false);
      expect(countQuestions(body)).toBeGreaterThan(0);
    }
  });
});

// A sanity check that the fixture helper writes where the walk looks — a seed
// that landed outside a record would make every cutoff assertion above vacuous.
describe("t517 fixture integrity", () => {
  test("the seeded question file resolves to the seeded record", () => {
    const { root, questionsPath } = seedRecord({ dirName: POST, depth: "Minimal", body: questions(1) });
    expect(resolveRecordRoot(questionsPath)).toBe(root);
    expect(dirname(dirname(dirname(questionsPath)))).toBe(root);
    expect(recordDateOf(root)).toBe(QUESTION_BUDGET_CUTOFF_YYMMDD);
  });
});
