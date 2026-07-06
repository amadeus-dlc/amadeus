# Domain Entities — u001-presence-evidence（260705-presence-evidence）

上流入力: [business-logic-model.md](business-logic-model.md)

## エンティティ

| エンティティ | 説明 |
|---|---|
| 設計境界節 | audit-format.md の独立 H2。検証範囲 / 意図的対象外 / 防衛線 3 点 / 不採用 2 案の理由 / mint 規律不変 + 出典 |
| parity reason 追補 | 既存 4 対象共有エントリへの独立一文。#506 の変更を理由付き乖離として追跡可能にする |

## 関係

設計境界節と reason 追補は同じ根拠（人間の採否 decision）を参照し、PR で同時に入る（片方だけの merge は理由なき乖離を生むため不可分）。
