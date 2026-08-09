// t516 — the question-budget predicate (#2693, the L2 row of #2683).
//
// Pure string work only: every case here is a body the corpus actually writes,
// or a line that LOOKS like one and must not be counted. The filesystem side
// (depth resolution, the record-date cutoff, the CLI) lives in the integration
// sibling t517, per the unit/integration split the size ratchet enforces.
//
// The forms are not invented. They were enumerated over the committed corpus
// with these predicates, re-runnable as written:
//
//   cd amadeus
//   grep -rlE '^#{2,3} Q[0-9]+'            . --include='*-questions.md'  # 450
//   grep -rlE '^#{2,4} [A-Z]{1,4}Q-[0-9]+' . --include='*-questions.md'  #   3
//   grep -rlE '^\s*(- )?\*\*Q[0-9]+'       . --include='*-questions.md'  #   5
//
// (table form has no single-line predicate — see the block scan in t517's
// corpus sweep, which finds 5 files.)
import { describe, expect, test } from "bun:test";
import {
  QUESTION_BUDGETS,
  collectQuestionIds,
  countQuestions,
} from "../../packages/framework/core/tools/amadeus-sensor-question-budget.ts";

describe("t516 heading form", () => {
  // Verbatim from
  // 260803-intent-autonomy/inception/requirements-analysis/requirements-analysis-questions.md
  const INTENT_AUTONOMY = [
    "### Q1. grantの認可状態・実行状態・mode移行をどのcontractに統一しますか？",
    "### Q1a. 既存の常任委任グラントを新しい自律レベルへどう移行しますか？",
    "### Q2. 停止理由と`retryable`をどう閉じますか？",
    "### Q3. 品質obligationとPlugin必須出力の境界をどう定義しますか？",
    "### Q4. 既存の固定上限と無上限の品質修復をどう接続しますか？",
    "### Q5. 過去裁定・自動裁定ID・完了後review auditをどう束縛しますか？",
    "### Q6. `graph revision`の正本を何にしますか？",
    "### Q7. `none`でのopt-in、5harness完了境界、将来adapter境界をどう固定しますか？",
  ].join("\n");

  test("primary and follow-up questions share one total (stage-protocol :311)", () => {
    // 7 primaries + Q1a. The contract says verbatim "Primary and follow-up
    // questions share this single total budget", so 8 — exactly Standard's
    // ceiling, which is what this record was run at.
    expect(countQuestions(INTENT_AUTONOMY)).toBe(8);
    expect([...collectQuestionIds(INTENT_AUTONOMY)]).toContain("Q1A");
  });

  test("H2 and H4 headings count like H3 — the corpus writes all of them", () => {
    expect(countQuestions("## Q1. a\n#### Q2. b\n### Q3. c")).toBe(3);
  });

  test("an id restated in a later heading is one question, not two", () => {
    expect(countQuestions("### Q1. first ask\n### Q1. restated at the ruling")).toBe(1);
  });
});

describe("t516 prefixed heading codes", () => {
  // Verbatim from the three corpus files carrying this form, all under
  // 260716-opencode-plugins-hooks/construction/opencode-plugin-adapter/.
  test("FDQ- (functional-design-questions.md, 5 asks)", () => {
    const body = [
      "### FDQ-1: reconstruct の戻り値様式(Result 表現)",
      "### FDQ-2: 配線イベント集合と CoreCall 構造の確定時期",
      "### FDQ-3: machine 注入マーカー判定の所在",
      "### FDQ-4: 生成物の配置",
      "### FDQ-5: 失敗時の縮退",
    ].join("\n");
    expect(countQuestions(body)).toBe(5);
  });

  test("NQ- (nfr-requirements-questions.md, 5 asks)", () => {
    const body = [
      "### NQ-1: 性能目標(応答時間・スループット)の設定",
      "### NQ-2: セキュリティ要件の範囲",
      "### NQ-3: スケーラビリティ要件",
      "### NQ-4: 信頼性要件",
      "### NQ-5: 技術スタックの確定",
    ].join("\n");
    expect(countQuestions(body)).toBe(5);
  });

  test("DQ- (nfr-design-questions.md, 4 asks)", () => {
    const body = [
      "### DQ-1: 性能設計(キャッシュ・async・リソースプーリング)の要否",
      "### DQ-2: セキュリティ設計の配置",
      "### DQ-3: 信頼性設計(リトライ・circuit breaker・ヘルスチェック)の要否",
      "### DQ-4: 論理コンポーネントの粒度",
    ].join("\n");
    expect(countQuestions(body)).toBe(4);
  });

  test("a prefix that is not a question code is not a question", () => {
    // A questions file cites requirement and decision ids constantly. Only a
    // prefix ENDING IN Q is a question code, which is what separates
    // `### FDQ-1:` from `### FR-1:` without a per-prefix allowlist.
    expect(countQuestions("### FR-1: 機能要件\n### ADR-2: 決定\n### NFR-3: 非機能")).toBe(0);
  });
});

describe("t516 bold inline form", () => {
  test("plain bold ask (260718-election-ts-foundation units-generation)", () => {
    expect(countQuestions("**Q1: ユニット分割の粒度は?**")).toBe(1);
  });

  test("bold ask carrying a parenthesised unit tag (260719-mirror-productization)", () => {
    expect(countQuestions("**Q1(U-01): intent/Bolt の分割は?**")).toBe(1);
  });

  test("bold ask as a list entry", () => {
    expect(countQuestions("- **Q1: a**\n- **Q2: b**")).toBe(2);
  });
});

describe("t516 table form", () => {
  // Verbatim from
  // 260712-metrics-observation/construction/ci-pipeline/ci-pipeline-questions.md
  const CI_PIPELINE = [
    "## 質問と確定回答",
    "",
    "| 質問 | 回答 | 根拠 |",
    "|---|---|---|",
    "| CI toolは何か | GitHub Actions | `.github/workflows/ci.yml` |",
    "| branch strategyは何か | short-lived branchからPR | 既存workflow trigger |",
    "| merge前quality gateは何か | `ci-success`が集約する | `.github/workflows/ci.yml` |",
    "| artifact repositoryは何か | 永続registry追加なし | `ci-snapshot-job/code-summary.md` |",
  ].join("\n");

  test("each body row of a 質問-headed table is one question", () => {
    expect(countQuestions(CI_PIPELINE)).toBe(4);
  });

  test("a row whose first cell is itself an id joins that id rather than doubling it", () => {
    // 260803-state-integrity restates Q1-Q5 in a 裁定の記録 table below the
    // headings that asked them. Five questions, asked once and recorded once.
    const body = [
      "### Q1. `Completed` カウンタの正準定義",
      "### Q2. over-age reap の可否",
      "",
      "## 裁定の記録",
      "",
      "| 質問 | 裁定 | 種別 | 根拠 |",
      "| --- | --- | --- | --- |",
      "| Q1 | A(定義 E へ統一) | 執行 | Issue #1875 |",
      "| Q2 | A(over-age reap 撤廃) | ユーザー裁定 | 正準リスト(4) |",
    ].join("\n");
    expect(countQuestions(body)).toBe(2);
  });

  test("English and 問い headers are the same form", () => {
    const en = "| Question | Answer |\n|---|---|\n| what runs CI | Actions |";
    expect(countQuestions(en)).toBe(1);
    const toi = "| 問い | 回答 |\n|---|---|\n| どれを採るか | A |";
    expect(countQuestions(toi)).toBe(1);
  });
});

describe("t516 negatives — lines that resemble the forms", () => {
  test("the section heading itself is not a question", () => {
    expect(countQuestions("## 質問と回答\n\n## 質問と確定回答\n\n## 未決事項")).toBe(0);
  });

  test("a 質問数 metadata row is not a question table", () => {
    // 260717-codekb-diff3-cleanup writes its zero-question ruling this way. The
    // header cell must BE the word, not merely start with it.
    const body = [
      "| 項目 | 値 | 根拠 |",
      "| --- | --- | --- |",
      "| 質問数 | 0 | leader承認 2026-07-17T20:23:01Z |",
    ].join("\n");
    expect(countQuestions(body)).toBe(0);
  });

  test("a table with no question column is not a question table", () => {
    expect(countQuestions("| 論点 | 回答 |\n|---|---|\n| 境界 | A |")).toBe(0);
  });

  test("prose naming a question is a reference, not an ask", () => {
    const body = [
      "> E-OC1 証跡: 質問 1 問(ユニット粒度)— ユーザー直接裁定。",
      "Q1 は既決なので選挙にかけない。",
      "- [Answer]: A — Q2 の裁定に従う。",
      "詳細は **Q3** を参照。",
    ].join("\n");
    expect(countQuestions(body)).toBe(0);
  });

  test("a question code needs digits", () => {
    expect(countQuestions("### Q. なにか\n### Q&A\n**Qa: x**")).toBe(0);
  });

  test("a hyphenated variant is not a bare code", () => {
    // A single trailing letter is the follow-up round the contract budgets, so
    // `Q1b` counts alongside `Q1`. `Q1-2` is neither: the bare form has no
    // hyphen, and treating it as one would make every cross-reference range a
    // question.
    expect(countQuestions("### Q1. base\n### Q1-2. not a form")).toBe(1);
    expect(countQuestions("### Q1. base\n### Q1b. follow-up round")).toBe(2);
  });

  test("an empty body has no questions", () => {
    expect(countQuestions("")).toBe(0);
    expect(countQuestions("\n\n   \n")).toBe(0);
  });
});

describe("t516 ceilings mirror the §8 Depth-Level Contract", () => {
  test("4 / 8 / 12", () => {
    expect(QUESTION_BUDGETS).toEqual({ Minimal: 4, Standard: 8, Comprehensive: 12 });
  });
});
