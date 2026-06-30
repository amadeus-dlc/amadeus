# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260629-minimum-purchase-flow | [20260629-minimum-purchase-flow.md](../../20260629-minimum-purchase-flow.md) | Inception の要求分析で参照する。 |
| 対象境界 | SC-IN-001, SC-IN-002, SC-IN-003, SC-IN-004, SC-IN-005, SC-OUT-001, SC-OUT-002, SC-OUT-003, SC-OUT-004, SC-OUT-005, SC-OUT-006, SC-OUT-007, SC-OUT-008, SC-OUT-009, SC-OUT-010 | [scope.md](scope.md) | Inception の Requirement、Story、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | mvp | [scope.md](scope.md) | 後続 stage の実行範囲を決める入力にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 後続成果物の粒度と説明量を決める入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | 後続の検証量と検証方法を決める入力にする。 |
| 初期モック | 注文内容確認画面 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception の要求候補と相互作用整理で具体例として参照する。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提として参照する。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260629-minimum-purchase-flow | なし | 商品選択から注文作成までの最小購入フローとして単独で成立するため。 | [intents.md](../../../intents.md) |
| 外部システム | 決済代行 | なし | 決済詳細は対象外であり、外部システム連携は未確認として扱うため。 | [external-systems.md](../../../steering/external-systems.md) |
| 外部システム | 配送事業者 | なし | 出荷は対象外であり、外部システム連携は未確認として扱うため。 | [external-systems.md](../../../steering/external-systems.md) |
