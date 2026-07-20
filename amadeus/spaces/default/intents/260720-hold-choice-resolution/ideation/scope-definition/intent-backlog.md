# Intent Backlog — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## バックログ(risk-first — scope-definition:c3)

| # | アイテム | Must | 依存 |
| --- | --- | --- | --- |
| B-1 | RA での契約変更該当性判定(該当ならエスカレーション先行)+CLI 構文・二値共存形の設計選挙 | M-3/M-4 | なし(最優先 — 契約疑義を実装前に解消) |
| B-2 | choice 指定 resolution の受理+永続化+描画(裁定どおり) | M-1/M-2 | B-1 裁定 |
| B-3 | 閉包テスト+検証統合 | M-2/M-5 | B-2 |

## 除外バックログ

e4 バッチ面(W-1)は相互通知合意で監視のみ。新規発見は Issue-first。
