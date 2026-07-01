# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | stage0、stage1、stage2 の意味を後続 Intent が参照できる形で説明できる。 | 採用済み | なし | [R001-stage-meaning.md](requirements/R001-stage-meaning.md) |
| R002 | stage2 を次回 stage0 として採用する条件と人間判断を追跡できる。 | 採用済み | R001 | [R002-stage0-adoption-decision.md](requirements/R002-stage0-adoption-decision.md) |
| R003 | build workspace、host environment、target workspace、target artifacts の対応記録先が決まっている。 | 採用済み | R001 | [R003-workspace-correspondence-record.md](requirements/R003-workspace-correspondence-record.md) |
| R004 | `.amadeus/` 全体と対象 Intent の validator 結果、標準検証結果を追跡できる。 | 採用済み | R002, R003 | [R004-validation-evidence.md](requirements/R004-validation-evidence.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | stage 判定語彙は他の要求の前提であるため。 |
| R002 | R001 | stage0 採用判断は stage0、stage1、stage2 の意味を前提にするため。 |
| R003 | R001 | workspace 対応記録には、利用した stage の判定を含めるため。 |
| R004 | R002, R003 | 検証結果は、採用判断と workspace 対応記録の証拠として使うため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
