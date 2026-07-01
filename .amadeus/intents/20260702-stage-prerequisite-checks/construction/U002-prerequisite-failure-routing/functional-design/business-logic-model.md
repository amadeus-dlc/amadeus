# Business Logic Model

## 目的

stage 前提が成立しない場合の分類と、repo 内代表例と配布対象 skill の説明境界を扱えるようにする。

## 対象 Unit

U002 prerequisite failure routing。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | stage 前提不成立の原因が成果物構造だけか判定する。 | Stage Prerequisite Evidence、validator 結果 | Repair Route Evaluation | R004, UC002 |
| BL002 | 前段 phase または前段 stage の不足が現在 Intent の成功条件を妨げるか判定する。 | Stage Prerequisite Evidence、要求、Bolt | Upstream Feedback Evaluation | R004, UC002 |
| BL003 | 現在 Intent の成功条件外の小さな課題か判定する。 | scope、requirements、Bolt、stage 前提確認結果 | Follow-up Candidate Evaluation | R004, UC002 |
| BL004 | repo 内代表例を成果物に残し、配布対象 skill では一般化説明へ置き換える。 | repo 内 Issue 関係、配布対象 skill 文書 | Distribution-safe Explanation | R005, UC003 |
| BL005 | eval または text contract で、必要な文言と混入させない説明境界を確認する。 | skill 文書、eval | Verification Evidence | R005, UC003 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| Stage Prerequisite Evidence | U001 が出力する stage 前提確認結果。 | R004 |
| 現在 Intent の成功条件 | 要求、ユースケース、Bolt、受け入れ条件。 | R004 |
| repo 内代表例 | Issue #277 と Issue #272 の関係。 | R005 |
| 配布対象 skill 文書 | `skills/amadeus-*` と `.agents/skills/amadeus-*` の skill 文書。 | R005 |
| eval | `dev-scripts/evals/amadeus-templates/check.ts`。 | R005 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Failure Route | `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` の分類。 | decision review、phase skill |
| Distribution-safe Explanation | repo 内 Issue 番号を前提にしない一般説明。 | 配布対象 skill |
| Verification Evidence | eval と検証結果。 | test-results、traceability |

## 未確認事項

なし。
