# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | skill 実行中に見つかった問題や懸念を、現在の Intent 対象、後続 Issue 候補、報告不要に分類できる。 | 採用済み | なし | [R001-report-destination-classification.md](requirements/R001-report-destination-classification.md) |
| R002 | 実行上の問題報告に必要な最低項目を skill から判断できる。 | 採用済み | R001 | [R002-minimum-report-fields.md](requirements/R002-minimum-report-fields.md) |
| R003 | GitHub Issue 作成は人間承認を前提にし、agent は Issue 候補として提示できる。 | 採用済み | R001, R002 | [R003-human-gated-issue-creation.md](requirements/R003-human-gated-issue-creation.md) |
| R004 | source skill、昇格先 skill、関連 eval が同じ実行時問題報告契約を説明している。 | 採用済み | R001, R002, R003 | [R004-skill-and-eval-alignment.md](requirements/R004-skill-and-eval-alignment.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 報告先分類が最低項目と Issue 候補化の前提であるため。 |
| R002 | R001 | 最低項目には分類結果と報告先を含めるため。 |
| R003 | R001, R002 | Issue 候補化は分類結果と最低項目を前提にするため。 |
| R004 | R001, R002, R003 | skill と eval の整合は、採用する報告契約を前提にするため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
