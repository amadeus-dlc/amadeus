// covers: function:checkQuestionsEvidence(pass4,fail2) subcommand:amadeus-state:gate-start
// size: medium
//
// E-OC1 evidence gate (#1101). Unit-style in-process coverage of the shipped
// predicate (all 6 discriminated reasons) plus the gate-start wiring contract:
// a filled [Answer] without ruling/approval evidence refuses the gate
// fail-closed (exit 1, no checkbox transition, no STAGE_AWAITING_APPROVAL),
// while every legitimate shape passes silently.
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkQuestionsEvidence } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { handleGateStart } from "../../dist/claude/.claude/tools/amadeus-state.ts";

const tempDirs: string[] = [];
afterEach(() => {
  for (const d of tempDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function questionsFile(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "eoc1-ev-"));
  tempDirs.push(dir);
  const p = join(dir, "requirements-analysis-questions.md");
  writeFileSync(p, body);
  return p;
}

const HEADER = "# RA — 明確化質問\n\n## 選挙不要判定(E-OC1 3段順序)\n\n";

describe("checkQuestionsEvidence (in-process, all 6 reasons)", () => {
  test("missing file passes (no-file)", () => {
    const r = checkQuestionsEvidence(join(tmpdir(), "eoc1-no-such-questions.md"));
    expect(r).toEqual({ kind: "pass", reason: "no-file" });
  });

  test("no [Answer] tag at all passes (no-answer-tag — the E-OC1 zero-question format)", () => {
    const r = checkQuestionsEvidence(questionsFile(`${HEADER}明確化質問 0 問。\n\n## 質問\n\n(なし)\n`));
    expect(r).toEqual({ kind: "pass", reason: "no-answer-tag" });
  });

  test("waiting placeholder (single parenthesized group) passes (answer-blank)", () => {
    const body = `${HEADER}## Q1\n\n- [Answer]: (TF-Q0 選挙の裁定受領後に記入 — cid:election-answer-after-ruling)\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "pass", reason: "answer-blank" });
  });

  test("edge case: N/A and empty answers pass (answer-blank)", () => {
    const body = `${HEADER}[Answer]: N/A\n[Answer]:\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "pass", reason: "answer-blank" });
  });

  test("filled answer with an E-code ruling reference on the answer line passes (evidence-present)", () => {
    const body = `${HEADER}## Q1\n\n[Answer]: A(E-1048-RA-Q1 裁定 3/4)\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "pass", reason: "evidence-present" });
  });

  test("filled answer with a leader-approval ISO timestamp line passes (evidence-present)", () => {
    const body = `${HEADER}leader 承認 2026-07-16T15:20:19Z(agmsg 出典)\n\n## Q1\n\n[Answer]: A — 採用\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "pass", reason: "evidence-present" });
  });

  test("edge case: the header's own 'E-OC1' token must NOT satisfy the evidence requirement (vacuity guard)", () => {
    const body = `${HEADER}## Q1\n\n[Answer]: A — 採用します\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "fail", reason: "no-evidence" });
  });

  test("#1127 trigger: a waiting-window file with a bare-[Answer] instruction line passes (answer-blank)", () => {
    // The authoritative waiting-window shape from Issue #1127: an E-OC1
    // evidence-header instruction line carrying a bare [Answer] token (no
    // colon, inside an HTML comment), an approval placeholder whose "承認"
    // line has no parseable ISO timestamp, and only blank real answers.
    // Pre-fix, ANSWER_TAG_RE's optional colon collected the instruction line
    // as the sole filled answer and the file fell to fail:unparseable-timestamp
    // (the advisory false-red this regression pins closed).
    const body =
      "# RA — 明確化質問\n\n<!-- E-OC1 判定証跡:\n判定: 全4問 選挙不要(既決導出)。\n" +
      "leader 承認: (受領後に追記)\n[Answer] 記入は leader 承認受領後にのみ行う。 -->\n\n" +
      "## Q1\n\n[Answer]:\n\n## Q2\n\n[Answer]:\n\n## Q3\n\n[Answer]:\n\n## Q4\n\n[Answer]:\n";
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "pass", reason: "answer-blank" });
  });

  test("#1127 guard: a colon-less bare [Answer] prose mention is never collected as an answer", () => {
    // A blockquote instruction outside any comment (the measured corpus
    // counter-example that ruled out comment-scoped exclusion): with only a
    // bare-token prose line and no [Answer]: tags at all, the file reads as
    // having no answer slots.
    const body = `${HEADER}> 既決照合: [Answer] は選挙裁定の受領後にのみ記入する。\n\n## 質問\n\n(なし)\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "pass", reason: "no-answer-tag" });
  });

  test("filled answer with an approval line whose timestamp does not parse fails (unparseable-timestamp)", () => {
    const body = `${HEADER}leader 承認 いつか\n\n[Answer]: A — 採用\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "fail", reason: "unparseable-timestamp" });
  });
});

function scaffoldShared(questionsBody: string | null, dirName = "260716-demo-1a2b3c4d"): string {
    const dir = mkdtempSync(join(tmpdir(), "eoc1-gate-"));
    tempDirs.push(dir);
    const intentDir = join(dir, "amadeus", "spaces", "default", "intents", dirName);
    mkdirSync(join(intentDir, "inception", "requirements-analysis"), { recursive: true });
    mkdirSync(join(intentDir, "audit"), { recursive: true });
    writeFileSync(join(dir, "amadeus", "spaces", "default", "intents", "intents.json"), JSON.stringify({ version: 1, intents: [{ id: "1a2b3c4d", slug: "demo", dirName, status: "active" }] }));
    mkdirSync(join(dir, "amadeus", "spaces", "default", "memory"), { recursive: true });
    writeFileSync(join(dir, "amadeus", "active-space"), "default");
    writeFileSync(join(dir, "amadeus", "spaces", "default", "intents", "active-intent"), dirName);
    const state = [
      "# Amadeus State",
      "",
      "**Current Stage**: requirements-analysis",
      "**Last Updated**: 2026-07-16T00:00:00Z",
      "",
      "## Stage Progress",
      "",
      "- [-] requirements-analysis — EXECUTE",
      "",
    ].join("\n");
    writeFileSync(join(intentDir, "amadeus-state.md"), state);
    if (questionsBody !== null) {
      writeFileSync(join(intentDir, "inception", "requirements-analysis", "requirements-analysis-questions.md"), questionsBody);
    }
    return dir;
}

describe("gate-start wiring (spawned, fail-closed contract)", () => {
  function runGateStart(projectDir: string) {
    return Bun.spawnSync({
      cmd: ["bun", join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-state.ts"), "gate-start", "requirements-analysis", "--project-dir", projectDir],
      env: { ...process.env },
    });
  }

  test("a filled [Answer] without evidence refuses the gate (exit 1, no transition, no emit)", () => {
    const dir = scaffoldShared(`${HEADER}[Answer]: A — 採用します\n`);
    const r = runGateStart(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("no ruling reference (E-code) or leader-approval timestamp line");
    const state = readFileSync(join(dir, "amadeus", "spaces", "default", "intents", "260716-demo-1a2b3c4d", "amadeus-state.md"), "utf-8");
    expect(state).toContain("- [-] requirements-analysis — EXECUTE");
    expect(state).not.toContain("- [?]");
  });

  test("an unparseable approval timestamp refuses the gate with the M-2 wording", () => {
    const dir = scaffoldShared(`${HEADER}leader 承認 あとで\n\n[Answer]: A — 採用\n`);
    const r = runGateStart(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("does not carry a parseable ISO timestamp");
  });

  test("the zero-question format passes the gate silently (exit 0, transition happens)", () => {
    const dir = scaffoldShared(`${HEADER}明確化質問 0 問(leader 承認 2026-07-16T15:20:19Z)。\n\n## 質問\n\n(なし)\n`);
    const r = runGateStart(dir);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const state = readFileSync(join(dir, "amadeus", "spaces", "default", "intents", "260716-demo-1a2b3c4d", "amadeus-state.md"), "utf-8");
    expect(state).toContain("- [?] requirements-analysis — EXECUTE");
  });

  test("a pre-guard intent (dir date before 260716) passes even with an unevidenced fill (enforcement cutoff)", () => {
    const dir = scaffoldShared(`${HEADER}[Answer]: A — 採用します\n`, "260712-legacy-9z8y7x6w");
    const r = runGateStart(dir);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
  });

  test("a missing questions file passes the gate (exit 0)", () => {
    const dir = scaffoldShared(null);
    const r = runGateStart(dir);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
  });
});

// In-process wiring drive (lcov carrier for the gate-start guard lines — the
// spawned cases above exercise the same paths but bun --coverage cannot see
// subprocesses; same seam idiom as t224-state-set-failclosed).
class ExitSignal extends Error {
  constructor(public code: number) {
    super(`exit ${code}`);
  }
}

function captureExit(fn: () => void): { exitCode: number | null; stderr: string } {
  let stderr = "";
  let exitCode: number | null = null;
  const origExit = process.exit.bind(process);
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.error = (...a: unknown[]) => {
    stderr += a.map(String).join(" ");
  };
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) exitCode = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    console.error = origErr;
  }
  return { exitCode, stderr };
}

describe("gate-start wiring (in-process lcov carrier)", () => {
  test("refuses in-process with the M-1 wording and exit signal 1", () => {
    const dir = scaffoldShared(`${HEADER}[Answer]: A — 採用します\n`);
    const saved = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = dir;
    const r = captureExit(() => handleGateStart(["requirements-analysis"]));
    if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = saved;
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("no ruling reference (E-code) or leader-approval timestamp line");
  });

  test("refuses in-process with the M-2 wording on an unparseable approval timestamp", () => {
    const dir = scaffoldShared(`${HEADER}leader 承認 あとで\n\n[Answer]: A — 採用\n`);
    const saved = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = dir;
    const r = captureExit(() => handleGateStart(["requirements-analysis"]));
    if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = saved;
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("does not carry a parseable ISO timestamp");
  });

  test("passes in-process on the zero-question format (guard lines run, no refusal)", () => {
    const dir = scaffoldShared(`${HEADER}0 問(leader 承認 2026-07-16T15:20:19Z)。\n\n## 質問\n\n(なし)\n`);
    const saved = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = dir;
    const r = captureExit(() => handleGateStart(["requirements-analysis"]));
    if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = saved;
    expect(r.exitCode).toBeNull();
    const state = readFileSync(join(dir, "amadeus", "spaces", "default", "intents", "260716-demo-1a2b3c4d", "amadeus-state.md"), "utf-8");
    expect(state).toContain("- [?] requirements-analysis — EXECUTE");
  });
});
