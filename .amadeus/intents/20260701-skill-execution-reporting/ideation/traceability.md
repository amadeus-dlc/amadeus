# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260701-skill-execution-reporting | [20260701-skill-execution-reporting.md](../../20260701-skill-execution-reporting.md) | Inception の要求分析で参照する。 |
| Issue | #248 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/248) | Requirement、Acceptance、Use Case、Unit、Bolt の根拠にする。 |
| 先行 Intent | 20260701-construction-finalization-traceability-skill | [state.json](../../20260701-construction-finalization-traceability-skill/state.json) | skill 実行上の問題を後続 Issue として扱う必要が見つかった背景にする。 |
| 対象境界 | amadeus-* skill 実行上の問題報告標準化 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 報告先、最低項目、後続 Issue 化判断を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | validator、関連 eval、typecheck、diff check を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で報告判断フローの確認例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260701-skill-execution-reporting | 20260701-construction-finalization-traceability-skill | Issue #248 は、Issue #245 の自己開発作業中に見つかった skill 実行上の問題報告の扱いを標準化するため。 | [intents.md](../../../intents.md) |
| Issue | #248 | #245 | Issue #248 は、amadeus-* skill 実行中に見つかった問題や懸念を会話内に残さず扱う必要から起票されたため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/248) |
| 外部システム | EXT001 GitHub | なし | Issue、PR、review comment、後続 Issue 候補を追跡の根拠に使うため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | 報告対象と後続 Issue 化の判断を行うため。 | [actors.md](../../../steering/actors.md) |
