# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | phase skill 起動時に、source skill、昇格先成果物、host environment での利用可否を入力証拠として区別できる。 | 採用済み | なし | [R001-skill-supply-evidence.md](requirements/R001-skill-supply-evidence.md) |
| R002 | phase skill 起動時に、stage0、stage1、stage2、stage0 採用判断の前提を確認できる。 | 採用済み | R001 | [R002-stage-prerequisite-check.md](requirements/R002-stage-prerequisite-check.md) |
| R003 | stage 前提確認を `amadeus-decision-review` の判断ノードまたは Skill Contract の入力証拠へ接続できる。 | 採用済み | R001, R002 | [R003-decision-review-and-contract-placement.md](requirements/R003-decision-review-and-contract-placement.md) |
| R004 | stage 前提が成立しない場合に、`repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` へ分類できる。 | 採用済み | R002, R003 | [R004-prerequisite-failure-classification.md](requirements/R004-prerequisite-failure-classification.md) |
| R005 | repo 内代表例と配布対象 skill の一般説明を分け、ユーザー環境で参照できない Issue 番号前提を混入させない。 | 採用済み | R003, R004 | [R005-representative-example-boundary.md](requirements/R005-representative-example-boundary.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | skill 供給元と実行環境の状態を区別できなければ、stage 前提を判断できないため。 |
| R002 | R001 | stage 前提確認は、どの skill と実行環境を確認しているかを前提にするため。 |
| R003 | R001, R002 | decision review と Skill Contract の配置は、入力証拠と stage 前提確認の内容を前提にするため。 |
| R004 | R002, R003 | 前提不成立の分類は、stage 前提確認と配置先の判断結果を入力にするため。 |
| R005 | R003, R004 | repo 内代表例の扱いは、配置先と分類先を決めた後で一般説明へ分離するため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |

## Requirements Review Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| Ideation scope との対応 | passed | SC-IN-001 から SC-IN-007 までを R001 から R005 に対応付けた。 |
| 対象外の維持 | passed | phase skill の全面再設計、自動検出、全 skill 一括移行、GitHub Issue 自動作成、完了済み Intent 一括移行を要求に含めていない。 |
| 依存関係 | passed | skill 供給元証拠、stage 前提、配置先、分類先、代表例境界の順に依存を整理した。 |
| 検証可能性 | passed | 各要求は Construction で文書差分、Skill Contract、eval、validator 結果から確認できる。 |

## 未確認事項

- なし。
