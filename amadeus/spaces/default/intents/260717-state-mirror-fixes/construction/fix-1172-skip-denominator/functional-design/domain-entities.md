# Domain Entities — fix-1172-skip-denominator(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## エンティティ(既存のまま — 新規型ゼロ)

| 型/値 | 定義位置 | 役割 |
|---|---|---|
| `{approved: number, total: number}` | scripts/amadeus-mirror.ts:87-105 countStageProgress 戻り値(既存) | 状態行の分子/分母 — シグネチャ不変 |
| Stage Progress 行(string) | amadeus-state.md の実様式(RE format-currency-grep 実測) | 判定対象 — 行様式マトリクス(business-logic-model)が語彙正本 |

countStageProgress は scripts 自己完結の純関数のまま(core 非依存 — component-dependency.md の境界維持)。新規型・ラッパーは導入しない。

## 不変条件

- countStageProgress の戻り値契約 `{approved <= total}` は全入力で維持(既存性質 — 除外条件の追加は total を減らす方向のみで不変条件を壊さない)
