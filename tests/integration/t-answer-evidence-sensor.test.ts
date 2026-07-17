// covers: function:QUESTIONS_EVIDENCE_CUTOFF_YYMMDD
// size: medium
//
// answer-evidence sensor (Issue #922). In-process coverage of the advisory
// sensor's pure core (evaluateAnswerEvidence) and CLI/test seam (main): the
// three-stage pipeline (target selection -> enforcement cutoff -> predicate
// mapping), the 1:1 mapping of the shipped checkQuestionsEvidence discriminated
// union, the advisory exit contract (check outcome never exits non-zero; only a
// missing flag does), and the single-definition pin for the cutoff constant
// shared with the gate-start guard.
//
// Fixtures are real *-questions.md files under a temp `intents/<dir>/` path, so
// the falling-proof injection lands on runtime-consumed data (the md the
// predicate reads), never on a type annotation.
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QUESTIONS_EVIDENCE_CUTOFF_YYMMDD } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  evaluateAnswerEvidence,
  main,
} from "../../dist/claude/.claude/tools/amadeus-sensor-answer-evidence.ts";

const tempDirs: string[] = [];
afterEach(() => {
  for (const d of tempDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const HEADER = "# RA — 明確化質問\n\n## 選挙不要判定(E-OC1 3段順序)\n\n";

// Write a *-questions.md under `<tmp>/intents/<dir>/<phase>/<stage>/` so the
// sensor's outputPath carries the `intents/<dir>/` segment its cutoff parser
// reads. `dir` dates the intent (YYMMDD-...). Returns the file's absolute path.
function questionsFile(body: string, dir = "260716-demo-1a2b3c4d"): string {
  const base = mkdtempSync(join(tmpdir(), "ae-sensor-"));
  tempDirs.push(base);
  const d = join(base, "intents", dir, "inception", "requirements-analysis");
  mkdirSync(d, { recursive: true });
  const p = join(d, "requirements-analysis-questions.md");
  writeFileSync(p, body);
  return p;
}

// A path shaped like a real questions file but never written to disk — used to
// prove no-file flows to a pass (no existsSync gate in the sensor).
function unwrittenQuestionsPath(dir = "260716-demo-1a2b3c4d"): string {
  return join(tmpdir(), "intents", dir, "inception", "x", "x-questions.md");
}

describe("evaluateAnswerEvidence — R1 failing checks (fail reasons -> findings)", () => {
  test("filled [Answer] with no ruling reference maps to a failing check (no-evidence)", () => {
    const r = evaluateAnswerEvidence(questionsFile(`${HEADER}[Answer]: A — 採用します\n`));
    expect(r).toEqual({ pass: false, findings_count: 1, reason: "no-evidence", skipped: null });
  });

  test("approval line with an unparseable timestamp maps to a failing check (unparseable-timestamp)", () => {
    const body = `${HEADER}leader 承認 いつか\n\n[Answer]: A — 採用\n`;
    const r = evaluateAnswerEvidence(questionsFile(body));
    expect(r).toEqual({ pass: false, findings_count: 1, reason: "unparseable-timestamp", skipped: null });
  });
});

describe("evaluateAnswerEvidence — R2 passing checks (pass reasons -> zero findings)", () => {
  test("#1127 trigger: waiting-window bare-[Answer] instruction header passes (zero findings)", () => {
    // The Issue #1127 waiting-window shape (bare-token instruction line in the
    // evidence header + unparseable approval placeholder + blank real answers)
    // must read as a passing check now that ANSWER_TAG_RE requires the colon —
    // pre-fix it surfaced as a fail:unparseable-timestamp advisory false-red.
    const body =
      "# RA — 明確化質問\n\n<!-- E-OC1 判定証跡:\nleader 承認: (受領後に追記)\n" +
      "[Answer] 記入は leader 承認受領後にのみ行う。 -->\n\n## Q1\n\n[Answer]:\n";
    const r = evaluateAnswerEvidence(questionsFile(body));
    expect(r.pass).toBe(true);
  });

  test("empty / N/A answers pass (answer-blank)", () => {
    const r = evaluateAnswerEvidence(questionsFile(`${HEADER}[Answer]: N/A\n[Answer]:\n`));
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "answer-blank", skipped: null });
  });

  test("single parenthesized waiting placeholder passes (answer-blank)", () => {
    const body = `${HEADER}## Q1\n\n- [Answer]: (TF-Q0 裁定受領後に記入)\n`;
    const r = evaluateAnswerEvidence(questionsFile(body));
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "answer-blank", skipped: null });
  });

  test("the zero-question format (no [Answer] tag) passes (no-answer-tag)", () => {
    const body = `${HEADER}明確化質問 0 問。\n\n## 質問\n\n(なし)\n`;
    const r = evaluateAnswerEvidence(questionsFile(body));
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "no-answer-tag", skipped: null });
  });

  test("a filled [Answer] with an E-code ruling reference passes (evidence-present)", () => {
    const body = `${HEADER}[Answer]: A(E-1048-RA-Q1 裁定 3/4)\n`;
    const r = evaluateAnswerEvidence(questionsFile(body));
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "evidence-present", skipped: null });
  });

  test("a missing questions file passes without an existsSync gate (no-file)", () => {
    const r = evaluateAnswerEvidence(unwrittenQuestionsPath());
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "no-file", skipped: null });
  });
});

describe("evaluateAnswerEvidence — R3 enforcement cutoff", () => {
  test("a pre-cutoff intent dir short-circuits to a skip even with an unevidenced fill", () => {
    const body = `${HEADER}[Answer]: A — 採用します\n`;
    const r = evaluateAnswerEvidence(questionsFile(body, "260101-legacy-9z8y7x6w"));
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "skipped", skipped: "pre-cutoff" });
  });

  test("an undatable path (no intents/<dir> segment) is treated as pre-cutoff", () => {
    const base = mkdtempSync(join(tmpdir(), "ae-nodir-"));
    tempDirs.push(base);
    const p = join(base, "stray-questions.md");
    writeFileSync(p, `${HEADER}[Answer]: A — 採用します\n`);
    const r = evaluateAnswerEvidence(p);
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "skipped", skipped: "pre-cutoff" });
  });

  test("the cutoff boundary is the canonical constant (on-day is enforced)", () => {
    const onDay = String(QUESTIONS_EVIDENCE_CUTOFF_YYMMDD);
    const body = `${HEADER}[Answer]: A — 採用します\n`;
    const r = evaluateAnswerEvidence(questionsFile(body, `${onDay}-demo-1a2b3c4d`));
    expect(r.skipped).toBeNull();
    expect(r.pass).toBe(false);
  });
});

describe("evaluateAnswerEvidence — R4 target selection", () => {
  test("a non-questions file is skipped (not-questions)", () => {
    const base = mkdtempSync(join(tmpdir(), "ae-nonq-"));
    tempDirs.push(base);
    const d = join(base, "intents", "260716-demo-1a2b3c4d");
    mkdirSync(d, { recursive: true });
    const p = join(d, "requirements.md");
    writeFileSync(p, "# not a questions file\n");
    const r = evaluateAnswerEvidence(p);
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "skipped", skipped: "not-questions" });
  });
});

// In-process exit / stdout capture for the CLI seam (main). bun --coverage
// cannot see subprocesses, so the seam is driven in-process.
class ExitSignal extends Error {
  constructor(public code: number) {
    super(`exit ${code}`);
  }
}

function captureMain(argv: string[]): { exitCode: number | null; stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  const origExit = process.exit.bind(process);
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  process.stdout.write = ((s: string | Uint8Array) => {
    stdout += typeof s === "string" ? s : Buffer.from(s).toString();
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((s: string | Uint8Array) => {
    stderr += typeof s === "string" ? s : Buffer.from(s).toString();
    return true;
  }) as typeof process.stderr.write;
  try {
    main(argv);
  } catch (e) {
    if (e instanceof ExitSignal) exitCode = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return { exitCode, stdout, stderr };
}

describe("main — R5 advisory exit contract", () => {
  test("a failing check exits 0 and emits the result as stdout JSON (advisory)", () => {
    const p = questionsFile(`${HEADER}[Answer]: A — 採用します\n`);
    const r = captureMain(["--stage", "requirements-analysis", "--output-path", p]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({
      pass: false,
      findings_count: 1,
      reason: "no-evidence",
      skipped: null,
    });
  });

  test("a passing check also exits 0 with JSON", () => {
    const p = questionsFile(`${HEADER}[Answer]: A(E-1048-RA-Q1 裁定)\n`);
    const r = captureMain(["--stage", "requirements-analysis", "--output-path", p]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout).pass).toBe(true);
  });

  test("a missing --output-path exits 1", () => {
    const r = captureMain(["--stage", "requirements-analysis"]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--output-path is required");
  });

  test("a missing --stage exits 1", () => {
    const r = captureMain(["--output-path", "/tmp/x-questions.md"]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--stage is required");
  });
});

describe("R6 known limitation — ECODE_RE matches any E-code on the answer line", () => {
  // The shipped predicate treats an E-code anywhere on the [Answer] line as an
  // evidence reference (ECODE_RE, amadeus-lib.ts). A line whose E-code is only
  // prose ("[Answer]: A — E-OC1 とは関係ない") therefore reads as evidence-present.
  // This is a documented limitation of the underlying predicate, pinned here so
  // any future behaviour change is a deliberate edit, NOT altered by this sensor.
  test("an in-prose E-code on the answer line reads as evidence-present (documented limitation)", () => {
    const body = `${HEADER}[Answer]: A — E-OC1 とは関係ない\n`;
    const r = evaluateAnswerEvidence(questionsFile(body));
    expect(r).toEqual({ pass: true, findings_count: 0, reason: "evidence-present", skipped: null });
  });
});

describe("vacuity guard — a bare E-OC1 header does not satisfy the evidence requirement", () => {
  test("the header's own 'E-OC1' token (not on an answer line) still fails an unevidenced fill", () => {
    const body = `${HEADER}## Q1\n\n[Answer]: A — 採用します\n`;
    const r = evaluateAnswerEvidence(questionsFile(body));
    expect(r).toEqual({ pass: false, findings_count: 1, reason: "no-evidence", skipped: null });
  });
});

describe("determinism", () => {
  test("the same input yields identical results across runs", () => {
    const p = questionsFile(`${HEADER}[Answer]: A — 採用します\n`);
    const a = evaluateAnswerEvidence(p);
    const b = evaluateAnswerEvidence(p);
    expect(a).toEqual(b);
  });
});

describe("cutoff constant — single definition pinned in the lib, imported by the gate", () => {
  const libSrc = readFileSync(
    join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-lib.ts"),
    "utf-8",
  );
  const stateSrc = readFileSync(
    join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-state.ts"),
    "utf-8",
  );

  test("the constant is defined exactly once, in amadeus-lib.ts", () => {
    const defs = libSrc.match(/export const QUESTIONS_EVIDENCE_CUTOFF_YYMMDD\s*=/g) ?? [];
    expect(defs).toHaveLength(1);
    expect(QUESTIONS_EVIDENCE_CUTOFF_YYMMDD).toBe(260716);
  });

  test("amadeus-state.ts imports the constant and defines no local cutoff literal", () => {
    expect(stateSrc).toContain("QUESTIONS_EVIDENCE_CUTOFF_YYMMDD");
    expect(stateSrc).not.toContain("GUARD_CUTOFF_YYMMDD");
    // No stray copy of the literal boundary lingering in the gate file.
    expect(stateSrc.includes("260716")).toBe(false);
  });
});
