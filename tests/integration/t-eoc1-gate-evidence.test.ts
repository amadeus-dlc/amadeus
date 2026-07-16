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

  test("filled answer with an approval line whose timestamp does not parse fails (unparseable-timestamp)", () => {
    const body = `${HEADER}leader 承認 いつか\n\n[Answer]: A — 採用\n`;
    expect(checkQuestionsEvidence(questionsFile(body))).toEqual({ kind: "fail", reason: "unparseable-timestamp" });
  });
});

describe("gate-start wiring (spawned, fail-closed contract)", () => {
  function scaffold(questionsBody: string | null): string {
    const dir = mkdtempSync(join(tmpdir(), "eoc1-gate-"));
    tempDirs.push(dir);
    const intentDir = join(dir, "amadeus", "spaces", "default", "intents", "demo-1a2b3c4d");
    mkdirSync(join(intentDir, "inception", "requirements-analysis"), { recursive: true });
    mkdirSync(join(intentDir, "audit"), { recursive: true });
    writeFileSync(join(dir, "amadeus", "spaces", "default", "intents", "intents.json"), JSON.stringify({ version: 1, intents: [{ id: "1a2b3c4d", slug: "demo", dirName: "demo-1a2b3c4d", status: "active" }] }));
    mkdirSync(join(dir, "amadeus", "spaces", "default", "memory"), { recursive: true });
    writeFileSync(join(dir, "amadeus", "active-space"), "default");
    writeFileSync(join(dir, "amadeus", "spaces", "default", "intents", "active-intent"), "demo-1a2b3c4d");
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

  function runGateStart(projectDir: string) {
    return Bun.spawnSync({
      cmd: ["bun", join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-state.ts"), "gate-start", "requirements-analysis", "--project-dir", projectDir],
      env: { ...process.env },
    });
  }

  test("a filled [Answer] without evidence refuses the gate (exit 1, no transition, no emit)", () => {
    const dir = scaffold(`${HEADER}[Answer]: A — 採用します\n`);
    const r = runGateStart(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("no ruling reference (E-code) or leader-approval timestamp line");
    const state = readFileSync(join(dir, "amadeus", "spaces", "default", "intents", "demo-1a2b3c4d", "amadeus-state.md"), "utf-8");
    expect(state).toContain("- [-] requirements-analysis — EXECUTE");
    expect(state).not.toContain("- [?]");
  });

  test("an unparseable approval timestamp refuses the gate with the M-2 wording", () => {
    const dir = scaffold(`${HEADER}leader 承認 あとで\n\n[Answer]: A — 採用\n`);
    const r = runGateStart(dir);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("does not carry a parseable ISO timestamp");
  });

  test("the zero-question format passes the gate silently (exit 0, transition happens)", () => {
    const dir = scaffold(`${HEADER}明確化質問 0 問(leader 承認 2026-07-16T15:20:19Z)。\n\n## 質問\n\n(なし)\n`);
    const r = runGateStart(dir);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const state = readFileSync(join(dir, "amadeus", "spaces", "default", "intents", "demo-1a2b3c4d", "amadeus-state.md"), "utf-8");
    expect(state).toContain("- [?] requirements-analysis — EXECUTE");
  });

  test("a missing questions file passes the gate (exit 0)", () => {
    const dir = scaffold(null);
    const r = runGateStart(dir);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
  });
});
