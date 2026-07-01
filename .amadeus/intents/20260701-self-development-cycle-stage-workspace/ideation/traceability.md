# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260701-self-development-cycle-stage-workspace | [20260701-self-development-cycle-stage-workspace.md](../../20260701-self-development-cycle-stage-workspace.md) | Inception の要求分析で参照する。 |
| Issue | #233 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/233) | 要求、受け入れ状態、ユースケース、Unit、Bolt の根拠にする。 |
| Discovery | 20260701-self-development-first-cycle | [Discovery Brief](../../../discoveries/20260701-self-development-first-cycle.md) | この Intent が最初の recommended 候補である根拠にする。 |
| 先行 Intent | 20260629-self-dev-steering-layer | [D002](../../20260629-self-dev-steering-layer/ideation/decisions/D002-issue-233-handoff-scope.md) | Issue #233 を後続 Intent として扱う根拠にする。 |
| 対象境界 | stage 判定と workspace 対応記録 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | feature、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 後続 Intent が参照できる粒度の Requirement と Traceability を作る入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | validator と標準検証を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で stage 判定と workspace 対応記録の確認例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260701-self-development-cycle-stage-workspace | 20260629-self-dev-steering-layer | 初回導入 Intent の D002 により、Issue #233 を後続 Intent として扱うため。 | [intents.md](../../../intents.md) |
| Issue | #233 | なし | GitHub Issue 起点で Intent を作成するため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/233) |
| 外部システム | EXT001 GitHub | なし | Issue、PR、CI、review comment を stage 判定の根拠に使うため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | stage0 採用判断を行うため。 | [actors.md](../../../steering/actors.md) |
