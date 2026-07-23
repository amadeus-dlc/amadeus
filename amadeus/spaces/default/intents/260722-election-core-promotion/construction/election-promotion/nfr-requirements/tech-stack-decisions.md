# Tech Stack Decisions — election-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 技術スタック決定

- 新規依存ゼロ・言語不変(TypeScript/Bun — technology-stack の現行スタックのまま移動)。business-logic-model の import 収束(./amadeus-norm-metrics)により境界違反が消え、requirements FR-1b の同層相対化が完成する
- スキル配線は既習様式(claude manifest coreDirs+codex emit 明示リスト — AD ADR-3 の正本直読実測済み様式)へ相乗り(business-rules BR-4)

## 決定事項

- 追加のスタック決定なし(移動 Unit — 決定は AD ADR-1/ADR-3 で完結済み、business-rules BR-6 の正本参照方針どおり新規 ADR も作らない)
