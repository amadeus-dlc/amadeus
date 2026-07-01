# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260701-feedback-learning-loop | [20260701-feedback-learning-loop.md](../../20260701-feedback-learning-loop.md) | Inception の要求分析で参照する。 |
| Issue | #259 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/259) | Requirement、Acceptance、Use Case、Unit、Bolt の根拠にする。 |
| 先行 Intent | 20260701-skill-execution-reporting | [state.json](../../20260701-skill-execution-reporting/state.json) | 実行時問題報告を学習ループの入力にする背景にする。 |
| 対象境界 | 後段 feedback と Intent 横断の学習ループ | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | feedback 条件、学習先分類、成果物責務を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | validator、diff check、必要な typecheck を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で feedback 先と学習先の確認例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260701-feedback-learning-loop | 20260701-skill-execution-reporting | Issue #259 は、Issue #248 の実行時問題報告を入力にして、後段 feedback と Intent 横断学習の扱いを標準化するため。 | [intents.md](../../../intents.md) |
| Issue | #259 | #248 | Issue #259 は、実行時問題報告を現在 Intent 修正、後続 Issue、横断 knowledge へ分類する必要から起票されたため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/259) |
| Issue | #259 | #257 | Issue #259 は decision review と接続するが、decision tree 再評価そのものは Issue #257 の責務であるため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/257) |
| 外部システム | EXT001 GitHub | なし | Issue、PR、review comment、後続 Issue 候補を追跡の根拠に使うため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | 学習先への昇格と後続 Issue 化の判断を行うため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| 後段 phase が前段成果物へ feedback すべき条件 | scope の SC-IN-001 に記録した。 | 条件を要求と acceptance に落とす。 |
| 前段成果物へ戻す場合の skill 選択 | scope の Inception 引き渡しに記録した。 | phase skill と内部 stage skill の対応表を作る。 |
| Intent 横断の学習先分類 | scope の SC-IN-003 と mock に記録した。 | ユースケースまたは分類ルールへ具体化する。 |
| 成果物責務の分離 | scope の SC-IN-004 に記録した。 | acceptance と decisions に責務差を明記する。 |
| validator または evaluator の結果分類 | scope の SC-IN-005 と ideation の体制に記録した。 | 構造検出、品質評価、学習候補の判定条件を作る。 |
| Issue #257 との接続 | scope の SC-IN-006 と decisions に記録した。 | decision review との起動順序を整理する。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で Ideation の scope、成果物深度、検証方針が不足すると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
