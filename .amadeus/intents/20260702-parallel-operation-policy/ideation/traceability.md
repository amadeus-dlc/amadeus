# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-parallel-operation-policy | [20260702-parallel-operation-policy.md](../../20260702-parallel-operation-policy.md) | Inception の要求分析で参照する。 |
| Issue | #351 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/351) | 並行運用の判断基準の Requirement、Acceptance、Use Case の根拠にする。 |
| Discovery | 20260702-parallel-execution | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) | 候補「並行運用ポリシー」の課題と成功状態、待機条件が Issue #334 の cycle 完了で解消した経緯の根拠にする。 |
| Grilling | Intent Record の単位 | [G001-new-intent-vs-existing-intent-update.md](grillings/G001-new-intent-vs-existing-intent-update.md) | 新規 Intent として進める判断と、policy の配置先を Inception で決める前提として参照する。 |
| 対象境界 | 並行運用の判断基準の steering policy への記録、Issue #334 の cycle の実例の根拠化、既存 Git Branching Policy との責務分担 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | infra、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 並行運用の判断基準を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | validator、必要な eval、diff check による steering policy と参照契約の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で並行運用の判断フロー（並行の判断、共有成果物の統合、ゲート承認のバッチ処理）を具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-parallel-operation-policy | 20260702-shared-index-generation | 待機条件「共有インデックスの生成物化の後に扱う」が、この Intent（Issue #334）の cycle 完了で解消したため。 | [intents.md](../../../intents.md) |
| インテント | 20260702-parallel-operation-policy | 20260701-git-branching-policy | 並行運用の判断基準が前提にする branch lifecycle と worktree 衝突回避の規則の定義元であるため。 | [intents.md](../../../intents.md) |
| Issue | #351 | なし | Discovery 20260702-parallel-execution の候補「並行運用ポリシー」として起票されたため。 | [Discovery Brief](../../../discoveries/20260702-parallel-execution.md) |
| アクター | ACT001 Maintainer | なし | policy の配置先、判断基準の採用、ゲート承認の運用を判断するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| 並行運用の判断基準が steering policy から読める。 | scope の SC-IN-001 と初期モックに記録した。 | 並行させる単位、共有成果物の統合手順、ゲート承認の運用を要求化する。 |
| 複数 worktree での並行作業を、policy を根拠に進められる。 | scope の SC-IN-002 と初期モックに記録した。 | Agent が参照する policy の配置先と参照契約を要求化する。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で policy の配置先や判断基準の粒度がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。
