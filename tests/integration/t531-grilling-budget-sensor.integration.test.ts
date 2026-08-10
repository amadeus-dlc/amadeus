// covers: file:packages/framework/core/tools/amadeus-sensor-question-budget.ts
// size: medium
//
// t531 — the question-budget verdict for a grilling session (#2827).
//
// The predicates are pure and live in the unit sibling t530. Everything here
// needs a real tree: the verdict itself reads the file, and the enforcement
// cutoff reads the record dir's name.
//
// Two properties carry most of the weight:
//
//   1. A warning does not fail the file. Grilling's new checks include two
//      fault-shaped states (a mistyped marker, a depth value the engine does
//      not define) that must be LOUD without being failures — this sensor is
//      advisory and its verdict is data at a gate.
//   2. Nothing routes around the cutoff. The findings are collected as
//      candidates and filtered at one gate, so a pre-cutoff record cannot be
//      changed by any of the new checks. t531's final block walks every input
//      combination that reaches a new check to prove there is no second path.
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkQuestionsEvidence } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  DEFERRED_MARKER,
  GRILLING_MODE_MARKER,
  QUESTION_BUDGET_CUTOFF_YYMMDD,
  evaluateQuestionBudget,
} from "../../packages/framework/core/tools/amadeus-sensor-question-budget.ts";

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const POST = `${QUESTION_BUDGET_CUTOFF_YYMMDD}-post-cutoff-record`;
const PRE = `${QUESTION_BUDGET_CUTOFF_YYMMDD - 1}-pre-cutoff-record`;

function seed(dirName: string, body: string): string {
  const projectDir = mkdtempSync(join(tmpdir(), "t531-"));
  scratch.push(projectDir);
  const root = join(projectDir, "amadeus", "spaces", "default", "intents", dirName);
  const stageDir = join(root, "inception", "requirements-analysis");
  mkdirSync(stageDir, { recursive: true });
  writeFileSync(join(root, "amadeus-state.md"), "# state\n");
  const path = join(stageDir, "requirements-analysis-questions.md");
  writeFileSync(path, body);
  return path;
}

const JUSTIFICATION =
  "<!-- amadeus-grilling:justification depth=Minimal questions=6 frontier-driven -->";

/** A grilling questions file: `n` asked questions, and whichever of the two
 *  recording obligations the case leaves in place. */
function grilling(
  n: number,
  opts: { marker?: string; justification?: boolean; deferred?: boolean } = {},
): string {
  const lines = [opts.marker ?? GRILLING_MODE_MARKER, "", "# 質問票", ""];
  for (let i = 1; i <= n; i += 1) lines.push(`### Q${i}. 論点 ${i} をどうしますか？`, "");
  if (opts.justification !== false) lines.push(JUSTIFICATION, "");
  if (opts.deferred !== false) {
    lines.push(DEFERRED_MARKER, "", "## 閾値未満として明示的に先送りした点", "", "- なし", "");
  }
  return lines.join("\n");
}

/** The same body without any grilling token — an ordinary questions file. */
function plain(n: number): string {
  const lines = ["# 質問票", ""];
  for (let i = 1; i <= n; i += 1) lines.push(`### Q${i}. 論点 ${i} をどうしますか？`, "");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// The five states of a grilling file
// ---------------------------------------------------------------------------

describe("t531 grilling verdicts", () => {
  test("a recorded overrun with its pruning disclosed passes", () => {
    // 6 questions at Minimal is over the row of 4, and under grilling that is
    // the expected shape rather than the defect: the total is emergent. What
    // the sensor asks instead is whether the crossing was recorded and the
    // pruning disclosed — both are, so the file passes.
    const result = evaluateQuestionBudget(seed(POST, grilling(6)), "Minimal");
    expect(result).toMatchObject({
      pass: true,
      findings_count: 0,
      reason: "justified-overrun",
      questions: 6,
      ceiling: 4,
      enforced: true,
    });
  });

  test("an overrun with no recorded crossing fails", () => {
    const result = evaluateQuestionBudget(
      seed(POST, grilling(6, { justification: false })),
      "Minimal",
    );
    expect(result).toMatchObject({
      pass: false,
      reason: "over-budget-unjustified",
      questions: 6,
    });
    expect(result.findings).toEqual([
      { field: "questions", reason: expect.stringContaining("missing-justification"), severity: "error" },
    ]);
  });

  test("an overrun with no disclosed pruning fails", () => {
    const result = evaluateQuestionBudget(seed(POST, grilling(6, { deferred: false })), "Minimal");
    expect(result).toMatchObject({ pass: false, reason: "over-budget-unjustified" });
    expect(result.findings).toEqual([
      { field: "deferred", reason: expect.stringContaining("missing-deferred-list"), severity: "error" },
    ]);
  });

  test("both obligations missing raises both findings, not the first one", () => {
    const result = evaluateQuestionBudget(
      seed(POST, grilling(6, { justification: false, deferred: false })),
      "Minimal",
    );
    expect(result.findings.map((f) => f.reason.split(" ")[0])).toEqual([
      "missing-justification",
      "missing-deferred-list",
    ]);
    expect(result.pass).toBe(false);
  });

  test("a grilling file inside its row needs no recording at all", () => {
    // The obligations attach to the CROSSING (§2.5). A short session never
    // crossed, so demanding the justification line would invent an obligation
    // the protocol does not place.
    expect(
      evaluateQuestionBudget(
        seed(POST, grilling(3, { justification: false, deferred: false })),
        "Minimal",
      ),
    ).toMatchObject({ pass: true, reason: "within-budget", findings_count: 0 });
  });

  test("a mistyped marker is loud but does not fail the file", () => {
    // Advisory: the verdict is data at a gate, and a marker typo is a fault in
    // the record's form, not a contract violation. It must still be visible —
    // silence here is the fail-open this check exists to close.
    const body = grilling(3, { marker: "<!-- amadeus-grilling:v2 mode=grilling -->" });
    const result = evaluateQuestionBudget(seed(POST, body), "Minimal");
    expect(result.pass).toBe(true);
    expect(result.findings).toEqual([
      { field: "marker", reason: expect.stringContaining("malformed-marker"), severity: "warning" },
    ]);
    expect(result.findings_count).toBe(1);
  });

  test("a depth the engine does not define is loud but does not fail the file", () => {
    // Previously this returned `no-depth, pass:true` with no finding, so a
    // typo'd or invented depth silently switched the ceiling comparison off.
    const result = evaluateQuestionBudget(seed(POST, plain(9)), "Brief");
    expect(result).toMatchObject({ pass: true, reason: "unknown-depth", ceiling: null, questions: 9 });
    expect(result.findings).toEqual([
      { field: "depth", reason: expect.stringContaining("unknown-depth"), severity: "warning" },
    ]);
  });

  test("an absent depth stays silent — there is no value to doubt", () => {
    expect(evaluateQuestionBudget(seed(POST, plain(9)), undefined)).toMatchObject({
      pass: true,
      reason: "no-depth",
      findings_count: 0,
    });
  });

  test("a mistyped marker warns without displacing the failure beside it", () => {
    const body = grilling(6, {
      marker: "<!-- amadeus-grilling:v2 mode=grilling -->",
      justification: false,
      deferred: false,
    });
    const result = evaluateQuestionBudget(seed(POST, body), "Minimal");
    // A malformed marker does not declare a grilling session, so the file is
    // measured as an ordinary one: over its row, and warned about separately.
    expect(result).toMatchObject({ pass: false, reason: "over-budget" });
    expect(result.findings.map((f) => f.severity)).toEqual(["warning", "error"]);
  });
});

// ---------------------------------------------------------------------------
// The ordinary path is untouched
// ---------------------------------------------------------------------------

describe("t531 files with no grilling marker are unchanged", () => {
  test("an overrun is still the plain over-budget finding", () => {
    const result = evaluateQuestionBudget(seed(POST, plain(6)), "Minimal");
    expect(result).toMatchObject({ pass: false, reason: "over-budget", findings_count: 1 });
    expect(result.findings[0]).toMatchObject({ field: "questions", severity: "error" });
    expect(result.findings[0]?.reason).toContain("exceed the Minimal ceiling of 4");
  });

  test("a file inside its row still passes", () => {
    expect(evaluateQuestionBudget(seed(POST, plain(3)), "Minimal")).toMatchObject({
      pass: true,
      reason: "within-budget",
    });
  });
});

// ---------------------------------------------------------------------------
// The cutoff has one gate, not one per branch
// ---------------------------------------------------------------------------

describe("t531 no new check routes around the enforcement cutoff", () => {
  // Every input combination that reaches a new check, run against a pre-cutoff
  // record. A single pre-cutoff case would show that one branch honours the
  // cutoff; the absence of a second path is what needs showing, so this walks
  // the whole space and asserts the verdict is indistinguishable from what the
  // sensor produced before any of these checks existed.
  const cases: Array<[string, string, string | undefined]> = [
    ["malformed marker", grilling(3, { marker: "<!-- amadeus-grilling:v2 mode=grilling -->" }), "Minimal"],
    ["unknown depth", plain(9), "Brief"],
    ["unknown depth under a grilling file", grilling(9), "Brief"],
    ["grilling overrun, nothing recorded", grilling(6, { justification: false, deferred: false }), "Minimal"],
    ["grilling overrun, no justification", grilling(6, { justification: false }), "Minimal"],
    ["grilling overrun, no deferred section", grilling(6, { deferred: false }), "Minimal"],
    ["grilling overrun fully recorded", grilling(6), "Minimal"],
    ["plain overrun", plain(6), "Minimal"],
    ["malformed marker over the row", grilling(6, { marker: "<!-- amadeus-grilling:v2 -->" }), "Minimal"],
  ];

  for (const [name, body, depth] of cases) {
    test(`pre-cutoff: ${name} yields no finding and the old vocabulary`, () => {
      const result = evaluateQuestionBudget(seed(PRE, body), depth);
      expect(result.findings).toEqual([]);
      expect(result.findings_count).toBe(0);
      expect(result.pass).toBe(true);
      expect(result.enforced).toBe(false);
      // The reason vocabulary a pre-cutoff record may carry is exactly the one
      // that existed before this change. A new word appearing here would mean
      // some branch reached the verdict without passing the gate.
      expect(["no-depth", "within-budget", "pre-cutoff"]).toContain(result.reason);
    });
  }
});

// ---------------------------------------------------------------------------
// The tokens do not disturb the other predicate reading these files
// ---------------------------------------------------------------------------

describe("t531 the grilling tokens are inert to answer-evidence", () => {
  // HTML comments were chosen partly so they cannot collide with the
  // predicates already reading questions files. `countQuestions` is covered in
  // t530; this is the answer-evidence half, which needs a real file.
  const ANSWERED = [
    "# 質問票",
    "",
    "### Q1. 論点 1 をどうしますか？",
    "",
    "[Answer]: A — ユーザー承認: 2026-08-10T00:00:00Z",
  ].join("\n");

  function evidenceOf(body: string): string {
    const projectDir = mkdtempSync(join(tmpdir(), "t531-ev-"));
    scratch.push(projectDir);
    const path = join(projectDir, "requirements-analysis-questions.md");
    writeFileSync(path, body);
    return `${checkQuestionsEvidence(path).kind}:${checkQuestionsEvidence(path).reason}`;
  }

  test("injecting all three tokens leaves the evidence verdict unchanged", () => {
    const before = evidenceOf(ANSWERED);
    expect(before).toBe("pass:evidence-present");
    const injected = [
      GRILLING_MODE_MARKER,
      ANSWERED,
      JUSTIFICATION,
      DEFERRED_MARKER,
      "## 閾値未満として明示的に先送りした点",
      "",
      "- なし",
    ].join("\n");
    expect(evidenceOf(injected)).toBe(before);
  });

  test("the tokens alone establish no answer and no approval", () => {
    // The inverse direction: a file carrying only the markers must not look
    // answered. If a token were read as an `[Answer]:` tag or an approval line,
    // this would come back as evidence.
    const markersOnly = [GRILLING_MODE_MARKER, JUSTIFICATION, DEFERRED_MARKER].join("\n");
    expect(evidenceOf(markersOnly)).toBe("pass:no-answer-tag");
  });
});
