# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | 人間承認済み（`passed`）の場合だけ実装実行へ進める契約が、実装実行と Bolt 準備の両方から読める。 | 採用済み | なし | [R001-human-approval-implementation-gate.md](requirements/R001-human-approval-implementation-gate.md) |
| R002 | 前段成果物の未確定事項の文言規約により、grilling 起動が決定論的に判定される。 | 採用済み | なし | [R002-deterministic-grilling-trigger.md](requirements/R002-deterministic-grilling-trigger.md) |
| R003 | scaffold-only は、確定判断の記録への参照が入力に存在する場合だけ許可される。 | 採用済み | なし | [R003-scaffold-only-recorded-decisions.md](requirements/R003-scaffold-only-recorded-decisions.md) |
| R004 | `taskGeneration.status` が `passed` の場合に approval evidence の実在が validator で検査される。 | 採用済み | R001 | [R004-approval-evidence-validation.md](requirements/R004-approval-evidence-validation.md) |
| R005 | skill と validator の変更が promote 手順で同期され、PR がレビュー支援契約に従う。 | 採用済み | R001, R002, R003, R004 | [R005-promotion-and-review-contract.md](requirements/R005-promotion-and-review-contract.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 実装ゲートの契約は他の要求に依存せず定義できるため。 |
| R002 | なし | grilling 起動の判定規則は他の要求に依存せず定義できるため。 |
| R003 | なし | scaffold-only の許可条件は他の要求に依存せず定義できるため。 |
| R004 | R001 | 検査対象の approval evidence は、R001 のゲート契約で人間承認時に追加される形式を前提にするため。 |
| R005 | R001, R002, R003, R004 | 昇格同期とレビュー支援契約は、R001 から R004 までの skill と validator の変更を対象にするため。 |

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
| Ideation scope との対応 | passed | SC-IN-001 と SC-IN-002 を R001、SC-IN-003 を R002、SC-IN-004 を R003、SC-IN-005 と SC-IN-006 を R004、SC-IN-007 を R005 に対応付けた。 |
| 対象外の維持 | passed | 承認内容の妥当性判断、evidence が指す成果物の内容検査、新しい人間ゲートの追加、完了済み Intent の遡及修正を要求に含めていない。 |
| 依存関係 | passed | ゲート契約、トリガー、許可条件は独立に定義し、検査と昇格同期がそれらに依存する順に整理した。 |
| 検証可能性 | passed | 各要求は skill 本文の差分、validator の eval、既存実データの pass 維持、promote 同期の一致から検証できる。 |

## 未確認事項

- なし。
