# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260701-stage-workspace-records | [20260701-stage-workspace-records.md](../../20260701-stage-workspace-records.md) | Inception の要求分析で参照する。 |
| Issue | #233 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/233) | 背景、課題、対象、対象外、受け入れ条件の根拠にする。 |
| Discovery | 20260701-self-development-first-cycle | [Discovery Brief](../../../discoveries/20260701-self-development-first-cycle.md) | recommended 候補から Intent 化した根拠にする。 |
| 対象境界 | stage 判定と workspace 対応記録 | [scope.md](scope.md) | Inception の Requirement、Acceptance、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | feature、stage 省略なし | [scope.md](scope.md) | Inception 以降の stage を省略せず、記録契約を要求へ落とす入力にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | stage 判定と workspace 対応記録の判断理由を後続成果物へ残す粒度にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | validator と標準検証を PR 準備の最低条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で記録入力と確認項目を説明する入力にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Ideation gate passed 後に Inception へ進める。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260701-stage-workspace-records | 20260629-self-dev-steering-layer | 自己開発用 steering layer が現在の契約で validator pass していることを前提にするため。 | [intents.md](../../../intents.md) |
| Discovery | 20260701-stage-workspace-records | 20260701-self-development-first-cycle | recommended 候補として選ばれたため。 | [Discovery Brief](../../../discoveries/20260701-self-development-first-cycle.md) |
| 外部システム | GitHub | Issue #233 | 自己開発作業は GitHub Issue 起点で進めるため。 | [external-systems.md](../../../steering/external-systems.md) |
